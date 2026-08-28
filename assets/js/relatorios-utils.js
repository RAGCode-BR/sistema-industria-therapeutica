(function (raiz, fabrica) {
    const api = fabrica();
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    raiz.RelatoriosUtils = api;
}(typeof globalThis !== "undefined" ? globalThis : window, function () {
    function numero(valor) {
        const convertido = Number(valor);
        return Number.isFinite(convertido) && convertido > 0 ? convertido : 0;
    }

    function calcularResumoPedido(itens) {
        const resumo = (itens || []).reduce((acumulado, item) => {
            const solicitado = numero(item.solicitado);
            const enviado = numero(item.enviado);
            acumulado.solicitado += solicitado;
            acumulado.enviado += enviado;
            acumulado.pendente += Math.max(solicitado - enviado, 0);
            return acumulado;
        }, { solicitado: 0, enviado: 0, pendente: 0 });
        return { ...resumo, completo: resumo.solicitado > 0 && resumo.pendente === 0, taxaAtendimento: resumo.solicitado ? (resumo.enviado / resumo.solicitado) * 100 : null };
    }

    function calcularProducaoNecessaria(demandas) {
        return (demandas || []).reduce((total, demanda) => total + Math.max(numero(demanda.pendente) - numero(demanda.estoqueDisponivel), 0), 0);
    }

    return { calcularResumoPedido, calcularProducaoNecessaria };
}));
