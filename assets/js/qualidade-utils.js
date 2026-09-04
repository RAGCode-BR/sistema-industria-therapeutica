(function (global) {
    const origem = {
        production: "Fabricação no CD", expedition: "Expedição", transport: "Transporte",
        branch_receiving: "Recebimento na filial", stock: "Estoque", other: "Outros"
    };
    const situacao = {
        open: "Aberta", analysis: "Em análise", treatment: "Em tratativa",
        waiting_confirmation: "Aguardando confirmação", resolved: "Resolvida", cancelled: "Cancelada"
    };
    const prioridade = { low: "Baixa", medium: "Média", high: "Alta", critical: "Crítica" };

    function texto(mapa, valor) { return mapa[valor] || "Não informado"; }
    function duracao(inicio, fim) {
        if (!inicio) return "—";
        let minutos = Math.max(0, Math.floor((new Date(fim || Date.now()).getTime() - new Date(inicio).getTime()) / 60000));
        const dias = Math.floor(minutos / 1440); minutos -= dias * 1440;
        const horas = Math.floor(minutos / 60); minutos -= horas * 60;
        if (dias) return `${dias}d${horas ? ` ${horas}h` : ""}`;
        if (horas) return `${horas}h${minutos ? ` ${minutos}min` : ""}`;
        return `${minutos}min`;
    }
    const tiposImagem = ["image/jpeg", "image/png", "image/webp"];
    const tiposVideo = ["video/mp4", "video/webm", "video/quicktime"];
    function validarAnexo(arquivo) {
        if (!arquivo || arquivo.size <= 0) return false;
        if (tiposImagem.includes(arquivo.type)) return arquivo.size <= 10485760;
        return tiposVideo.includes(arquivo.type) && arquivo.size <= 52428800;
    }
    function validarImagem(arquivo) { return validarAnexo(arquivo); }
    function ehVideo(arquivo) { return Boolean(arquivo && tiposVideo.includes(arquivo.type)); }
    function textoTratamentoChamado(origemChamado, encaminhamento) {
        if (origemChamado === "production") return "Indústria/CD";
        return encaminhamento === "cd" ? "Enviado ao CD" : "Interno na filial";
    }
    function textoStatusChamado(origemChamado, encaminhamento, situacaoChamado) {
        if (situacaoChamado === "resolved") return "Resolvido";
        if (situacaoChamado === "waiting_branch") return "Aguardando filial";
        if (origemChamado === "branch_receiving" && encaminhamento === "cd") return "Aguardando o CD";
        return origemChamado === "production" ? "Aberto no CD" : "Aberto na filial";
    }

    global.QualidadeUtils = {
        textoOrigem: (valor) => texto(origem, valor),
        textoSituacao: (valor) => texto(situacao, valor),
        textoPrioridade: (valor) => texto(prioridade, valor),
        textoTratamentoChamado,
        textoStatusChamado,
        duracao,
        validarImagem,
        validarAnexo,
        ehVideo
    };
    if (typeof module !== "undefined") module.exports = global.QualidadeUtils;
})(typeof window !== "undefined" ? window : globalThis);
