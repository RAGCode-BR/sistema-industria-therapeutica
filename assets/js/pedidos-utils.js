(function (raiz, fabrica) {
    const api = fabrica();
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    raiz.PedidosUtils = api;
}(typeof globalThis !== "undefined" ? globalThis : window, function () {
    function quantidade(valor) {
        const numero = Number(valor);
        return Number.isFinite(numero) && numero > 0 ? Math.floor(numero) : 0;
    }

    function dataValida(valor) {
        const data = valor ? new Date(valor) : null;
        return data && !Number.isNaN(data.getTime()) ? data : null;
    }

    function calcularAtendimentoPedido(pedido, remessas) {
        const itensPedido = Array.isArray(pedido?.itens) ? pedido.itens : [];
        const remessasDoPedido = (remessas || []).filter((remessa) => remessa.pedidoId === pedido?.id && remessa.situacao !== "cancelada");
        const itens = itensPedido.map((item) => {
            const produtoId = item.produtoId;
            const itensRemessa = remessasDoPedido.flatMap((remessa) => (remessa.itens || [])
                .filter((registro) => registro.produtoId === produtoId)
                .map((registro) => ({ ...registro, remessa })));
            const solicitado = quantidade(item.quantidadeSolicitada);
            const encerrado = Math.min(quantidade(item.quantidadeEncerrada), solicitado);
            const solicitadoParaAtendimento = Math.max(solicitado - encerrado, 0);
            const enviado = itensRemessa.reduce((total, registro) => total + quantidade(registro.quantidade), 0);
            const recebido = itensRemessa.filter((registro) => registro.remessa.situacao === "recebida")
                .reduce((total, registro) => total + quantidade(registro.quantidade), 0);
            const emTransito = itensRemessa.filter((registro) => registro.remessa.situacao === "em_transito")
                .reduce((total, registro) => total + quantidade(registro.quantidade), 0);
            const pendente = Math.max(solicitadoParaAtendimento - enviado, 0);
            return {
                ...item, solicitado, encerrado, solicitadoParaAtendimento, enviado, recebido, emTransito, pendente,
                parcial: enviado > 0 && pendente > 0,
                totalmenteEnviado: solicitadoParaAtendimento > 0 && pendente === 0,
                totalmenteRecebido: solicitadoParaAtendimento > 0 && recebido >= solicitadoParaAtendimento
            };
        });
        const solicitado = itens.reduce((total, item) => total + item.solicitado, 0);
        const enviado = itens.reduce((total, item) => total + item.enviado, 0);
        const recebido = itens.reduce((total, item) => total + item.recebido, 0);
        const pendente = itens.reduce((total, item) => total + item.pendente, 0);
        const datasEnvio = remessasDoPedido.map((remessa) => dataValida(remessa.enviadaEm)).filter(Boolean).sort((a, b) => a - b);
        const datasRecebimento = remessasDoPedido.map((remessa) => dataValida(remessa.recebidaEm)).filter(Boolean).sort((a, b) => a - b);
        return {
            itens, remessas: remessasDoPedido, solicitado, enviado, recebido, pendente,
            taxaAtendimento: solicitado ? (enviado / solicitado) * 100 : null,
            parcial: enviado > 0 && pendente > 0,
            totalmenteEnviado: solicitado > 0 && pendente === 0,
            totalmenteRecebido: solicitado > 0 && recebido >= solicitado,
            primeiroEnvio: datasEnvio[0] || null,
            ultimoEnvio: datasEnvio.at(-1) || null,
            ultimoRecebimento: datasRecebimento.at(-1) || null
        };
    }

    function statusOperacionalPedido(pedido, remessas) {
        const resumo = calcularAtendimentoPedido(pedido, remessas);
        const situacoesItens = (Array.isArray(pedido?.itens) ? pedido.itens : []).map((item) => item.situacao || pedido?.situacao || "pendente");
        if (situacoesItens.length && situacoesItens.every((situacao) => situacao === "recusado")) return "recusado";
        if (situacoesItens.length && situacoesItens.every((situacao) => situacao === "recebido" || situacao === "recusado")) return "finalizado";
        if (resumo.totalmenteRecebido) return "finalizado";
        if (pedido?.situacao === "em_producao") return "em_producao";
        if (resumo.itens.some((item) => item.emTransito > 0)) return "em_transito";
        if (resumo.enviado > 0 || pedido?.situacao === "aprovado") return "aprovado";
        return pedido?.situacao || "pendente";
    }

    function quantidadeMaximaRemessa(pedido, remessas, produtoId, estoqueDisponivel) {
        const item = calcularAtendimentoPedido(pedido, remessas).itens.find((registro) => registro.produtoId === produtoId);
        return Math.min(item?.pendente || 0, quantidade(estoqueDisponivel));
    }

    return { calcularAtendimentoPedido, statusOperacionalPedido, quantidadeMaximaRemessa };
}));
