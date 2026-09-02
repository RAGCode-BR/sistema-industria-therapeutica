const STORAGE_KEY = "therapeutica-estoque-v4";
const LEGACY_PRODUCTS_KEY = "produtos-therapeutica";
const LEGACY_MOVEMENTS_KEY = "movimentacoes-therapeutica";
const LEGACY_STORAGE_KEYS = ["therapeutica-estoque-v3"];
const CENTRO_DISTRIBUICAO_ID = "cd";
const NAVEGACAO_STORAGE_KEY = "therapeutica-navegacao-atual";
const MENU_REDUZIDO_STORAGE_KEY = "therapeutica-menu-reduzido";
let clienteSupabase = null;
let usuarioAtual = null;
let perfilAtual = null;
let idsPedidosRemotos = new Set();
let usuarios = [];
let estadoSincronizado = null;
let categoriaEmEdicao = "";
let unidadeEmEdicao = "";
const filtrosRelatorioPadrao = { periodo: "30", dataInicial: "", dataFinal: "", filialId: "", status: "", produtoId: "", categoria: "", limiteProdutos: 5 };
let filtrosRelatorio = { ...filtrosRelatorioPadrao };

function conectarSupabase() {
    if (!window.supabase?.createClient) return false;

    clienteSupabase = obterClienteSupabase();
    return Boolean(clienteSupabase);
}
const FILIAIS_PADRAO = [
    { id: "blumenau", nome: "Blumenau", cidade: "Blumenau, SC" },
    { id: "lucas", nome: "Lucas", cidade: "Lucas do Rio Verde, MT" },
    { id: "sinop", nome: "Sinop", cidade: "Sinop, MT" },
    { id: "matriz", nome: "Sorriso", cidade: "Sorriso, MT" }
];
const CATEGORIAS_INICIAIS = [
    "Administrativo",
    "Dermocosméticos",
    "Embalagens",
    "Higiene",
    "Insumos",
    "Limpeza",
    "Medicamentos",
    "Outros"
];
const UNIDADES_INICIAIS = ["Unidade", "Caixa", "Pacote", "Litro", "Quilograma"];
let categoriasProdutos = [...CATEGORIAS_INICIAIS];
let unidadesMedida = [...UNIDADES_INICIAIS];
const titulosPaginas = {
    dashboard: "Dashboard",
    produtos: "Produtos",
    movimentacao: "Movimentação",
    "acerto-estoque": "Ajuste de estoque",
    "estoque-baixo": "Estoque baixo",
    pedidos: "Pedidos",
    "portal-filial": "Portal da filial",
    "novo-pedido-filial": "Novo pedido",
    "meus-pedidos": "Meus pedidos",
    filiais: "Filiais",
    historico: "Histórico",
    relatorios: "Relatórios",
    qualidade: "Qualidade",
    usuarios: "Usuários",
    "configuracoes-cadastros": "Cadastros do estoque",
    "configuracoes-backup": "Dados e backup"
};
const elementos = {
    menuLateral: document.querySelector(".menu-lateral"),
    navegacao: [...document.querySelectorAll(".item-menu")],
    botaoRecolherMenu: document.querySelector("#botao-recolher-menu"),
    botaoMenuMobile: document.querySelector("#botao-menu-mobile"),
    botaoSeletorMobile: document.querySelector("#botao-seletor-mobile"),
    painelSeletorMobile: document.querySelector("#painel-seletor-mobile"),
    seletorPortalMobile: document.querySelector("#seletor-portal-mobile"),
    botaoPerfilMobile: document.querySelector("#botao-perfil-mobile"),
    painelPerfilMobile: document.querySelector("#painel-perfil-mobile"),
    botaoAlterarSenhaMobile: document.querySelector("#botao-alterar-senha-mobile"),
    botaoSairMobile: document.querySelector("#botao-sair-mobile"),
    paginas: [...document.querySelectorAll(".pagina")],
    menuMatriz: document.querySelector("#menu-matriz"),
    menuFilial: document.querySelector("#menu-filial"),
    botaoConfiguracoes: document.querySelector("#botao-configuracoes"),
    submenuConfiguracoes: document.querySelector("#submenu-configuracoes"),
    seletorPortal: document.querySelector("#seletor-portal"),
    contextoPortal: document.querySelector("#contexto-portal"),
    tituloPagina: document.querySelector("#titulo-pagina"),
    botaoEmProducaoCabecalho: document.querySelector("#botao-em-producao-cabecalho"),
    quantidadeEmProducaoCabecalho: document.querySelector("#quantidade-em-producao-cabecalho"),
    toast: document.querySelector("#toast"),
    indicadorProdutos: document.querySelector("#indicador-produtos"),
    indicadorUnidades: document.querySelector("#indicador-unidades"),
    indicadorEstoqueBaixo: document.querySelector("#indicador-estoque-baixo"),
    indicadorPedidos: document.querySelector("#indicador-pedidos"),
    dashboardMovimentacoes: document.querySelector("#dashboard-movimentacoes"),
    dashboardAlertas: document.querySelector("#dashboard-alertas"),
    buscaProdutos: document.querySelector("#busca-produtos"),
    filtroCategoria: document.querySelector("#filtro-categoria"),
    filtroStatusProdutos: document.querySelector("#filtro-status-produtos"),
    botaoOrdenarQuantidade: document.querySelector("#ordenar-quantidade"),
    tabelaProdutos: document.querySelector("#tabela-produtos"),
    paginacaoProdutos: document.querySelector("#paginacao-produtos"),
    tabelaEstoqueBaixo: document.querySelector("#tabela-estoque-baixo"),
    tabelaPedidos: document.querySelector("#tabela-pedidos"),
    filtroStatusPedidos: document.querySelector("#filtro-status-pedidos"),
    filtroStatusItensPedidos: document.querySelector("#filtro-status-itens-pedidos"),
    notificacaoPedidos: document.querySelector("#notificacao-pedidos"),
    listaFiliais: document.querySelector("#lista-filiais"),
    buscaHistorico: document.querySelector("#busca-historico"),
    filtroHistorico: document.querySelector("#filtro-historico"),
    tabelaHistorico: document.querySelector("#tabela-historico"),
    relatorioUnidadesEnviadas: document.querySelector("#relatorio-unidades-enviadas"),
    relatorioTempoProducao: document.querySelector("#relatorio-tempo-producao"),
    relatorioTempoEnvio: document.querySelector("#relatorio-tempo-envio"),
    relatorioProdutosSolicitados: document.querySelector("#relatorio-produtos-solicitados"),
    relatorioEnviosFiliais: document.querySelector("#relatorio-envios-filiais"),
    relatorioCalendarioMes: document.querySelector("#relatorio-calendario-mes"),
    relatorioCalendarioSaidas: document.querySelector("#relatorio-calendario-saidas"),
    relatorioCalendarioTotal: document.querySelector("#relatorio-calendario-total"),
    modalSaidasCalendario: document.querySelector("#modal-saidas-calendario"),
    tituloModalSaidasCalendario: document.querySelector("#titulo-modal-saidas-calendario"),
    resumoModalSaidasCalendario: document.querySelector("#resumo-modal-saidas-calendario"),
    listaModalSaidasCalendario: document.querySelector("#lista-modal-saidas-calendario"),
    modalItensEmProducao: document.querySelector("#modal-itens-em-producao"),
    resumoModalItensEmProducao: document.querySelector("#resumo-modal-itens-em-producao"),
    tabelaModalItensEmProducao: document.querySelector("#tabela-modal-itens-em-producao"),
    relatorioPeriodo: document.querySelector("#relatorio-periodo"),
    relatorioDataInicial: document.querySelector("#relatorio-data-inicial"),
    relatorioDataFinal: document.querySelector("#relatorio-data-final"),
    relatorioFilial: document.querySelector("#relatorio-filial"),
    relatorioStatus: document.querySelector("#relatorio-status"),
    relatorioProduto: document.querySelector("#relatorio-produto"),
    relatorioCategoria: document.querySelector("#relatorio-categoria"),
    relatorioLimiteProdutos: document.querySelector("#relatorio-limite-produtos"),
    botaoLimparRelatorios: document.querySelector("#botao-limpar-relatorios"),
    botaoExportarRelatorios: document.querySelector("#botao-exportar-relatorios"),
    relatorioPedidosRealizados: document.querySelector("#relatorio-pedidos-realizados"),
    relatorioPedidosComparacao: document.querySelector("#relatorio-pedidos-comparacao"),
    relatorioUnidadesSolicitadas: document.querySelector("#relatorio-unidades-solicitadas"),
    relatorioUnidadesComparacao: document.querySelector("#relatorio-unidades-comparacao"),
    relatorioTaxaAtendimento: document.querySelector("#relatorio-taxa-atendimento"),
    relatorioAtendimentoDetalhe: document.querySelector("#relatorio-atendimento-detalhe"),
    relatorioEnviosParciais: document.querySelector("#relatorio-envios-parciais"),
    relatorioParciaisDetalhe: document.querySelector("#relatorio-parciais-detalhe"),
    relatorioOtif: document.querySelector("#relatorio-otif"),
    relatorioOtifDetalhe: document.querySelector("#relatorio-otif-detalhe"),
    relatorioProducaoNecessaria: document.querySelector("#relatorio-producao-necessaria"),
    relatorioProducaoDetalhe: document.querySelector("#relatorio-producao-detalhe"),
    relatorioPlanoProducao: document.querySelector("#relatorio-plano-producao"),
    relatorioLeadTime: document.querySelector("#relatorio-lead-time"),
    relatorioEntregasPrazo: document.querySelector("#relatorio-entregas-prazo"),
    relatorioEntregasPrazoDetalhe: document.querySelector("#relatorio-entregas-prazo-detalhe"),
    relatorioEvolucao: document.querySelector("#relatorio-evolucao"),
    relatorioStatusGrafico: document.querySelector("#relatorio-status-grafico"),
    relatorioProdutosPendentes: document.querySelector("#relatorio-produtos-pendentes"),
    relatorioDesempenhoFiliais: document.querySelector("#relatorio-desempenho-filiais"),
    relatorioPedidosParciais: document.querySelector("#relatorio-pedidos-parciais"),
    relatorioPedidosCriticos: document.querySelector("#relatorio-pedidos-criticos"),
    tabelaUsuarios: document.querySelector("#tabela-usuarios"),
    movimentoTitulo: document.querySelector("#movimentacao-titulo"),
    movimentoSubtitulo: document.querySelector("#movimentacao-subtitulo"),
    movimentoDescricao: document.querySelector("#movimentacao-descricao"),
    formularioMovimentacao: document.querySelector("#formulario-movimentacao"),
    campoMovimentoXml: document.querySelector("#campo-movimento-xml"),
    movimentoXml: document.querySelector("#movimento-xml"),
    botaoRemoverXml: document.querySelector("#botao-remover-xml"),
    campoItemXml: document.querySelector("#campo-item-xml"),
    movimentoItemXml: document.querySelector("#movimento-item-xml"),
    mensagemXml: document.querySelector("#mensagem-xml"),
    botaoCadastrarProdutoXml: document.querySelector("#botao-cadastrar-produto-xml"),
    movimentoProduto: document.querySelector("#movimento-produto"),
    buscaMovimentoProduto: document.querySelector("#busca-movimento-produto"),
    opcoesBuscaMovimentoProduto: document.querySelector("#opcoes-busca-movimento-produto"),
    movimentoQuantidade: document.querySelector("#movimento-quantidade"),
    campoMovimentoFilial: document.querySelector("#campo-movimento-filial"),
    movimentoFilial: document.querySelector("#movimento-filial"),
    movimentoObservacao: document.querySelector("#movimento-observacao"),
    infoProdutoMovimento: document.querySelector("#info-produto-movimento"),
    mensagemMovimentacao: document.querySelector("#mensagem-movimentacao"),
    botaoConfirmarMovimento: document.querySelector("#botao-confirmar-movimento"),
    formularioAcertoEstoque: document.querySelector("#formulario-acerto-estoque"),
    acertoProduto: document.querySelector("#acerto-produto"),
    buscaAcertoProduto: document.querySelector("#busca-acerto-produto"),
    opcoesBuscaAcertoProduto: document.querySelector("#opcoes-busca-acerto-produto"),
    acertoQuantidade: document.querySelector("#acerto-quantidade"),
    acertoObservacao: document.querySelector("#acerto-observacao"),
    infoProdutoAcerto: document.querySelector("#info-produto-acerto"),
    mensagemAcertoEstoque: document.querySelector("#mensagem-acerto-estoque"),
    botaoConfirmarAcerto: document.querySelector("#botao-confirmar-acerto"),
    modalProduto: document.querySelector("#modal-produto"),
    formularioProduto: document.querySelector("#formulario-produto"),
    tituloModalProduto: document.querySelector("#titulo-modal-produto"),
    mensagemProduto: document.querySelector("#mensagem-produto"),
    produtoId: document.querySelector("#produto-id"),
    produtoCodigo: document.querySelector("#produto-codigo"),
    produtoNome: document.querySelector("#produto-nome"),
    produtoCategoria: document.querySelector("#produto-categoria"),
    produtoQuantidade: document.querySelector("#produto-quantidade"),
    produtoMinimo: document.querySelector("#produto-minimo"),
    produtoUnidade: document.querySelector("#produto-unidade"),
    ajudaQuantidadeProduto: document.querySelector("#ajuda-quantidade-produto"),
    modalPedido: document.querySelector("#modal-pedido"),
    formularioPedido: document.querySelector("#formulario-pedido"),
    mensagemPedido: document.querySelector("#mensagem-pedido"),
    pedidoFilial: document.querySelector("#pedido-filial"),
    pedidoProduto: document.querySelector("#pedido-produto"),
    pedidoEstoqueAtual: document.querySelector("#pedido-estoque-atual"),
    pedidoQuantidade: document.querySelector("#pedido-quantidade"),
    pedidoObservacao: document.querySelector("#pedido-observacao"),
    modalEntrega: document.querySelector("#modal-entrega"),
    formularioEntrega: document.querySelector("#formulario-entrega"),
    tituloModalEntrega: document.querySelector("#titulo-modal-entrega"),
    entregaPedidoId: document.querySelector("#entrega-pedido-id"),
    entregaProdutoId: document.querySelector("#entrega-produto-id"),
    entregaModo: document.querySelector("#entrega-modo"),
    entregaResumo: document.querySelector("#entrega-resumo"),
    campoEntregaQuantidade: document.querySelector("#campo-entrega-quantidade"),
    entregaQuantidade: document.querySelector("#entrega-quantidade"),
    ajudaEntregaQuantidade: document.querySelector("#ajuda-entrega-quantidade"),
    campoEntregaData: document.querySelector("#campo-entrega-data"),
    entregaDia: document.querySelector("#entrega-dia"),
    entregaMes: document.querySelector("#entrega-mes"),
    entregaAno: document.querySelector("#entrega-ano"),
    mensagemEntrega: document.querySelector("#mensagem-entrega"),
    botaoConfirmarData: document.querySelector("#botao-confirmar-data"),
    botaoAprovarParaProducao: document.querySelector("#botao-aprovar-para-producao"),
    modalAnalisarPedido: document.querySelector("#modal-analisar-pedido"),
    tituloModalAnalisarPedido: document.querySelector("#titulo-modal-analisar-pedido"),
    listaAnalisarPedido: document.querySelector("#lista-analisar-pedido"),
    botaoEnviarPedidoAnalisado: document.querySelector("#botao-enviar-pedido-analisado"),
    modalRecusarItem: document.querySelector("#modal-recusar-item"),
    formularioRecusarItem: document.querySelector("#formulario-recusar-item"),
    tituloModalRecusarItem: document.querySelector("#titulo-modal-recusar-item"),
    resumoRecusarItem: document.querySelector("#resumo-recusar-item"),
    recusaPedidoId: document.querySelector("#recusa-pedido-id"),
    recusaProdutoId: document.querySelector("#recusa-produto-id"),
    motivoRecusarItem: document.querySelector("#motivo-recusar-item"),
    mensagemRecusarItem: document.querySelector("#mensagem-recusar-item"),
    modalEncerrarSaldoItem: document.querySelector("#modal-encerrar-saldo-item"),
    formularioEncerrarSaldoItem: document.querySelector("#formulario-encerrar-saldo-item"),
    encerrarSaldoPedidoId: document.querySelector("#encerrar-saldo-pedido-id"),
    encerrarSaldoProdutoId: document.querySelector("#encerrar-saldo-produto-id"),
    resumoEncerrarSaldoItem: document.querySelector("#resumo-encerrar-saldo-item"),
    motivoEncerrarSaldoItem: document.querySelector("#motivo-encerrar-saldo-item"),
    mensagemEncerrarSaldoItem: document.querySelector("#mensagem-encerrar-saldo-item"),
    modalCancelarRemessa: document.querySelector("#modal-cancelar-remessa"),
    formularioCancelarRemessa: document.querySelector("#formulario-cancelar-remessa"),
    cancelarRemessaId: document.querySelector("#cancelar-remessa-id"),
    cancelarRemessaPedidoId: document.querySelector("#cancelar-remessa-pedido-id"),
    cancelarRemessaPedidoCompleto: document.querySelector("#cancelar-remessa-pedido-completo"),
    resumoCancelarRemessa: document.querySelector("#resumo-cancelar-remessa"),
    motivoCancelarRemessa: document.querySelector("#motivo-cancelar-remessa"),
    mensagemCancelarRemessa: document.querySelector("#mensagem-cancelar-remessa"),
    modalRemessa: document.querySelector("#modal-remessa"),
    formularioRemessa: document.querySelector("#formulario-remessa"),
    tituloModalRemessa: document.querySelector("#titulo-modal-remessa"),
    remessaPedidoId: document.querySelector("#remessa-pedido-id"),
    remessaResumo: document.querySelector("#remessa-resumo"),
    listaItensRemessa: document.querySelector("#lista-itens-remessa"),
    remessaEntregaPrevista: document.querySelector("#remessa-entrega-prevista"),
    mensagemRemessa: document.querySelector("#mensagem-remessa"),
    menuPerfil: document.querySelector("#menu-perfil"),
    botaoPerfil: document.querySelector("#botao-perfil"),
    menuPerfilOpcoes: document.querySelector("#menu-perfil-opcoes"),
    usuarioLogado: document.querySelector("#usuario-logado"),
    nomeUsuarioLogado: document.querySelector("#nome-usuario-logado"),
    contextoUsuarioLogado: document.querySelector("#contexto-usuario-logado"),
    botaoAlterarSenha: document.querySelector("#botao-alterar-senha"),
    botaoSair: document.querySelector("#botao-sair"),
    modalAlterarSenha: document.querySelector("#modal-alterar-senha"),
    formularioAlterarSenha: document.querySelector("#formulario-alterar-senha"),
    novaSenhaUsuario: document.querySelector("#nova-senha-usuario"),
    confirmarNovaSenhaUsuario: document.querySelector("#confirmar-nova-senha-usuario"),
    mensagemAlterarSenha: document.querySelector("#mensagem-alterar-senha"),
    botaoSalvarNovaSenha: document.querySelector("#botao-salvar-nova-senha"),
    botaoExportar: document.querySelector("#botao-exportar"),
    arquivoImportar: document.querySelector("#arquivo-importar"),
    botaoDadosDemo: document.querySelector("#botao-dados-demo"),
    modalCategoria: document.querySelector("#modal-categoria"),
    tituloModalCategoria: document.querySelector("#titulo-modal-categoria"),
    formularioCategoria: document.querySelector("#formulario-categoria"),
    categoriaNome: document.querySelector("#categoria-nome"),
    mensagemCategoria: document.querySelector("#mensagem-categoria"),
    botaoSalvarCategoria: document.querySelector("#botao-salvar-categoria"),
    tabelaCategorias: document.querySelector("#tabela-categorias"),
    modalUnidade: document.querySelector("#modal-unidade"),
    tituloModalUnidade: document.querySelector("#titulo-modal-unidade"),
    formularioUnidade: document.querySelector("#formulario-unidade"),
    unidadeNome: document.querySelector("#unidade-nome"),
    mensagemUnidade: document.querySelector("#mensagem-unidade"),
    botaoSalvarUnidade: document.querySelector("#botao-salvar-unidade"),
    tabelaUnidades: document.querySelector("#tabela-unidades"),
    quantidadeAleatoriaMinima: document.querySelector("#quantidade-aleatoria-minima"),
    quantidadeAleatoriaMaxima: document.querySelector("#quantidade-aleatoria-maxima"),
    botaoGerarQuantidadesAleatorias: document.querySelector("#botao-gerar-quantidades-aleatorias"),
    mensagemGerarEstoque: document.querySelector("#mensagem-gerar-estoque"),
    tituloPortalFilial: document.querySelector("#titulo-portal-filial"),
    indicadorFilialPedidos: document.querySelector("#indicador-filial-pedidos"),
    formularioItemPedido: document.querySelector("#formulario-item-pedido"),
    buscaItemPedido: document.querySelector("#busca-item-pedido"),
    opcoesBuscaItemPedido: document.querySelector("#opcoes-busca-item-pedido"),
    itemPedidoProduto: document.querySelector("#item-pedido-produto"),
    itemPedidoEstoque: document.querySelector("#item-pedido-estoque"),
    itemPedidoQuantidade: document.querySelector("#item-pedido-quantidade"),
    disponibilidadeCdItemPedido: document.querySelector("#disponibilidade-cd-item-pedido"),
    mensagemItemPedido: document.querySelector("#mensagem-item-pedido"),
    itensCarrinhoPedido: document.querySelector("#itens-carrinho-pedido"),
    quantidadeItensCarrinho: document.querySelector("#quantidade-itens-carrinho"),
    observacaoPedidoCompleto: document.querySelector("#observacao-pedido-completo"),
    mensagemPedidoFilial: document.querySelector("#mensagem-pedido-filial"),
    botaoLimparCarrinho: document.querySelector("#botao-limpar-carrinho"),
    botaoEnviarPedidoLista: document.querySelector("#botao-enviar-pedido-lista"),
    listaMeusPedidos: document.querySelector("#lista-meus-pedidos"),
    filtroStatusMeusPedidos: document.querySelector("#filtro-status-meus-pedidos"),
    modalUsuario: document.querySelector("#modal-usuario"),
    formularioUsuario: document.querySelector("#formulario-usuario"),
    botaoNovoUsuario: document.querySelector("#botao-novo-usuario"),
    tituloModalUsuario: document.querySelector("#titulo-modal-usuario"),
    usuarioId: document.querySelector("#usuario-id"),
    usuarioEmail: document.querySelector("#usuario-email"),
    usuarioNome: document.querySelector("#usuario-nome"),
    campoSenhaInicial: document.querySelector("#campo-senha-inicial"),
    usuarioSenhaInicial: document.querySelector("#usuario-senha-inicial"),
    campoSenhaTemporaria: document.querySelector("#campo-senha-temporaria"),
    usuarioSenhaTemporaria: document.querySelector("#usuario-senha-temporaria"),
    usuarioPapel: document.querySelector("#usuario-papel"),
    usuarioFilial: document.querySelector("#usuario-filial"),
    botaoSalvarUsuario: document.querySelector("#botao-salvar-usuario"),
    mensagemUsuario: document.querySelector("#mensagem-usuario"),
    modalEstoqueFilial: document.querySelector("#modal-estoque-filial"),
    tituloModalEstoqueFilial: document.querySelector("#titulo-modal-estoque-filial"),
    tabelaModalEstoqueFilial: document.querySelector("#tabela-modal-estoque-filial"),
    modalDetalhesPedido: document.querySelector("#modal-detalhes-pedido"),
    tituloModalDetalhesPedido: document.querySelector("#titulo-modal-detalhes-pedido"),
    resumoDetalhesPedido: document.querySelector("#resumo-detalhes-pedido"),
    listaDetalhesPedido: document.querySelector("#lista-detalhes-pedido")
};

function atualizarMenuLateral(reduzido) {
    elementos.menuLateral?.classList.toggle("menu-reduzido", reduzido);
    elementos.botaoRecolherMenu?.setAttribute("aria-expanded", String(!reduzido));
    elementos.botaoRecolherMenu?.setAttribute("aria-label", reduzido ? "Expandir barra lateral" : "Recolher barra lateral");
    elementos.botaoRecolherMenu?.setAttribute("title", reduzido ? "Expandir barra lateral" : "Recolher barra lateral");
    const textoBotao = elementos.botaoRecolherMenu?.querySelector(".texto-botao-recolher");
    if (textoBotao) textoBotao.textContent = reduzido ? "Expandir menu" : "Recolher menu";
    elementos.navegacao.forEach((item) => {
        const texto = item.querySelector("span:not(.icone):not(.notificacao-pedidos)")?.textContent.trim();
        if (texto) item.title = reduzido ? texto : "";
    });
}

function fecharMenuMobile() {
    elementos.menuLateral?.classList.remove("menu-mobile-aberto");
    elementos.botaoMenuMobile?.setAttribute("aria-expanded", "false");
}

function fecharSeletorMobile() {
    if (!elementos.painelSeletorMobile) return;
    elementos.painelSeletorMobile.hidden = true;
    elementos.botaoSeletorMobile?.setAttribute("aria-expanded", "false");
}

function fecharPerfilMobile() {
    if (!elementos.painelPerfilMobile) return;
    elementos.painelPerfilMobile.hidden = true;
    elementos.botaoPerfilMobile?.setAttribute("aria-expanded", "false");
}

function sincronizarSeletorPortalMobile() {
    if (!elementos.seletorPortalMobile) return;
    elementos.seletorPortalMobile.value = elementos.seletorPortal.value;
    elementos.seletorPortalMobile.disabled = elementos.seletorPortal.disabled;
}

try {
    atualizarMenuLateral(localStorage.getItem(MENU_REDUZIDO_STORAGE_KEY) === "true");
} catch {
    atualizarMenuLateral(false);
}

let paginaAtual = "dashboard";
let tipoMovimentacaoAtual = "entrada";
const PRODUTOS_POR_PAGINA = 15;
let paginaProdutosAtual = 1;
let ordenacaoProdutos = "nome";
let ordenacaoQuantidade = "crescente";
let produtoSelecionadoMovimentacao = "";
let itensXmlMovimentacao = [];
let indiceItemXmlSelecionado = null;
let itensXmlRegistrados = new Set();
let itensSelecionadosPedido = [];
let pedidoEmAnaliseId = "";
let portalAtual = CENTRO_DISTRIBUICAO_ID;
let itensDoPedidoAtual = [];
let temporizadorToast;
let estado = carregarEstado();
let filaSincronizacao = Promise.resolve();

function usuarioEhCD() {
    return perfilAtual?.papel === "cd_admin";
}

function salvarNavegacaoAtual() {
    if (!perfilAtual) return;
    localStorage.setItem(NAVEGACAO_STORAGE_KEY, JSON.stringify({
        pagina: paginaAtual,
        portal: portalAtual,
        tipoMovimentacao: tipoMovimentacaoAtual
    }));
}

function recuperarNavegacaoAtual() {
    try {
        const navegacao = JSON.parse(localStorage.getItem(NAVEGACAO_STORAGE_KEY) || "null");
        return navegacao && typeof navegacao === "object" ? navegacao : null;
    } catch {
        return null;
    }
}

function aplicarPermissoesDoUsuario() {
    if (!perfilAtual) return;
    if (elementos.botaoNovoUsuario) elementos.botaoNovoUsuario.hidden = !usuarioEhCD();
    if (usuarioEhCD()) {
        portalAtual = CENTRO_DISTRIBUICAO_ID;
        elementos.seletorPortal.disabled = false;
        sincronizarSeletorPortalMobile();
        return;
    }
    portalAtual = perfilAtual.filial_id;
    elementos.seletorPortal.value = portalAtual;
    elementos.seletorPortal.disabled = true;
    sincronizarSeletorPortalMobile();
}

function gerarId(prefixo) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `${prefixo}-${crypto.randomUUID()}`;
    }

    return `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function numeroInteiroNaoNegativo(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? Math.max(0, Math.floor(numero)) : 0;
}

function lerJSON(chave, valorPadrao) {
    try {
        const valor = localStorage.getItem(chave);
        return valor ? JSON.parse(valor) : valorPadrao;
    } catch {
        return valorPadrao;
    }
}

function estadoPadrao() {
    return {
        versao: 4,
        produtos: [],
        movimentacoes: [],
        remessas: [],
        reservasProducao: [],
        eventosPedido: [],
        pedidos: [],
        filiais: FILIAIS_PADRAO.map((filial) => ({ ...filial })),
        estoqueFiliais: {},
        atualizadoEm: new Date().toISOString()
    };
}

function criarEstadoDemo() {
    const agora = new Date().toISOString();
    const produtos = [
        ["prod-001", "MED-001", "Dipirona 500mg", "Medicamentos", 186, 40, "Caixa"],
        ["prod-002", "MED-002", "Paracetamol 750mg", "Medicamentos", 142, 35, "Caixa"],
        ["prod-003", "MED-003", "Ibuprofeno 600mg", "Medicamentos", 78, 25, "Caixa"],
        ["prod-004", "MED-004", "Loratadina 10mg", "Medicamentos", 34, 30, "Caixa"],
        ["prod-005", "MED-005", "Omeprazol 20mg", "Medicamentos", 18, 28, "Caixa"],
        ["prod-006", "DER-001", "Protetor solar FPS 50", "Dermocosméticos", 64, 18, "Unidade"],
        ["prod-007", "DER-002", "Hidratante corporal 200ml", "Dermocosméticos", 51, 20, "Unidade"],
        ["prod-008", "DER-003", "Sabonete facial", "Dermocosméticos", 22, 16, "Unidade"],
        ["prod-009", "DER-004", "Shampoo terapêutico", "Dermocosméticos", 39, 14, "Unidade"],
        ["prod-010", "DER-005", "Pomada reparadora", "Dermocosméticos", 12, 18, "Unidade"],
        ["prod-011", "INS-001", "Álcool 70% 1L", "Insumos", 96, 30, "Frasco"],
        ["prod-012", "INS-002", "Luvas descartáveis P", "Insumos", 48, 20, "Caixa"],
        ["prod-013", "INS-003", "Luvas descartáveis M", "Insumos", 62, 20, "Caixa"],
        ["prod-014", "INS-004", "Máscara cirúrgica", "Insumos", 27, 25, "Caixa"],
        ["prod-015", "INS-005", "Seringa 5ml", "Insumos", 320, 80, "Unidade"],
        ["prod-016", "EMB-001", "Sacola P Therapeutica", "Embalagens", 740, 160, "Unidade"],
        ["prod-017", "EMB-002", "Sacola M Therapeutica", "Embalagens", 420, 120, "Unidade"],
        ["prod-018", "EMB-003", "Etiqueta térmica", "Embalagens", 980, 260, "Unidade"],
        ["prod-019", "EMB-004", "Envelope delivery", "Embalagens", 115, 100, "Unidade"],
        ["prod-020", "HIG-001", "Lenço umedecido", "Higiene", 44, 22, "Pacote"],
        ["prod-021", "HIG-002", "Algodão 100g", "Higiene", 59, 24, "Pacote"],
        ["prod-022", "HIG-003", "Hastes flexíveis", "Higiene", 31, 18, "Caixa"],
        ["prod-023", "SUP-001", "Papel A4", "Administrativo", 21, 12, "Resma"],
        ["prod-024", "SUP-002", "Bobina térmica", "Administrativo", 36, 18, "Unidade"],
        ["prod-025", "SUP-003", "Caneta azul", "Administrativo", 108, 30, "Unidade"],
        ["prod-026", "MED-006", "Soro fisiológico 500ml", "Medicamentos", 8, 20, "Frasco"],
        ["prod-027", "MED-007", "Vitamina C 1g", "Medicamentos", 54, 20, "Caixa"],
        ["prod-028", "DER-006", "Água micelar 200ml", "Dermocosméticos", 16, 16, "Unidade"],
        ["prod-029", "INS-006", "Gaze esterilizada", "Insumos", 19, 24, "Pacote"],
        ["prod-030", "EMB-005", "Caixa presente P", "Embalagens", 68, 32, "Unidade"]
    ].map(([id, codigo, nome, categoria, quantidade, estoqueMinimo, unidade]) => ({
        id,
        codigo,
        nome,
        categoria,
        quantidade,
        estoqueMinimo,
        unidade,
        ativo: true,
        criadoEm: "2026-07-01T09:00:00.000Z",
        atualizadoEm: agora,
        arquivadoEm: null
    }));

    const produtoPorId = new Map(produtos.map((produto) => [produto.id, produto]));
    const movimento = (id, produtoId, tipo, quantidade, saldoAntes, saldoDepois, observacao, criadoEm, filialId = "", pedidoId = "") => {
        const produto = produtoPorId.get(produtoId);
        return {
            id,
            produtoId,
            produtoNome: produto?.nome || "Produto não identificado",
            tipo,
            quantidade,
            unidade: produto?.unidade || "Unidade",
            saldoAntes,
            saldoDepois,
            observacao,
            filialId,
            pedidoId,
            criadoEm
        };
    };

    return {
        versao: 4,
        produtos,
        movimentacoes: [
            movimento("mov-001", "prod-001", "entrada", 120, 66, 186, "Lote produzido para recompor o CD.", "2026-07-21T10:10:00.000Z"),
            movimento("mov-002", "prod-011", "entrada", 48, 48, 96, "Lote finalizado e recebido no CD.", "2026-07-21T11:20:00.000Z"),
            movimento("mov-003", "prod-006", "saida", 12, 76, 64, "Separação para uso interno do CD.", "2026-07-21T14:35:00.000Z"),
            movimento("mov-004", "prod-026", "saida", 14, 22, 8, "Uso interno e perdas registradas.", "2026-07-20T16:00:00.000Z"),
            movimento("mov-005", "prod-016", "entrada", 500, 240, 740, "Reposição de sacolas personalizadas.", "2026-07-19T09:45:00.000Z"),
            movimento("mov-006", "prod-003", "transferencia", 18, 96, 78, "Pedido aprovado e transferência registrada.", "2026-07-18T15:30:00.000Z", "blumenau", "ped-003"),
            movimento("mov-007", "prod-018", "transferencia", 140, 1120, 980, "Pedido aprovado e transferência registrada.", "2026-07-18T15:31:00.000Z", "blumenau", "ped-003"),
            movimento("mov-008", "prod-017", "transferencia", 80, 500, 420, "Pedido aprovado e transferência registrada.", "2026-07-17T10:05:00.000Z", "sinop", "ped-004"),
            movimento("mov-009", "prod-024", "saida", 6, 42, 36, "Consumo administrativo do CD.", "2026-07-16T13:00:00.000Z"),
            movimento("mov-010", "prod-029", "saida", 9, 28, 19, "Baixa por uso em atendimento.", "2026-07-15T17:25:00.000Z")
        ],
        pedidos: [
            {
                id: "ped-001",
                filialId: "blumenau",
                itens: [
                    { produtoId: "prod-005", produtoNome: "Omeprazol 20mg", unidade: "Caixa", estoqueInformado: 4, quantidadeSolicitada: 24, observacao: "Alta saída nos últimos dias." },
                    { produtoId: "prod-010", produtoNome: "Pomada reparadora", unidade: "Unidade", estoqueInformado: 2, quantidadeSolicitada: 16, observacao: "Reposição de balcão." },
                    { produtoId: "prod-029", produtoNome: "Gaze esterilizada", unidade: "Pacote", estoqueInformado: 3, quantidadeSolicitada: 30, observacao: "Atendimento semanal." }
                ],
                observacao: "Pedido semanal da filial Blumenau.",
                observacaoMatriz: "",
                situacao: "pendente",
                criadoEm: "2026-07-22T08:40:00.000Z",
                analisadoEm: null
            },
            {
                id: "ped-002",
                filialId: "lucas",
                itens: [
                    { produtoId: "prod-026", produtoNome: "Soro fisiológico 500ml", unidade: "Frasco", estoqueInformado: 1, quantidadeSolicitada: 28, observacao: "CD está com pouco saldo." },
                    { produtoId: "prod-014", produtoNome: "Máscara cirúrgica", unidade: "Caixa", estoqueInformado: 5, quantidadeSolicitada: 20, observacao: "" }
                ],
                observacao: "Priorizar na próxima produção.",
                observacaoMatriz: "Pedido em produção. Conclusão prevista: 24/07/2026.",
                situacao: "em_producao",
                producaoPrevista: "2026-07-24",
                producaoIniciadaEm: "2026-07-21T17:05:00.000Z",
                criadoEm: "2026-07-21T15:10:00.000Z",
                analisadoEm: "2026-07-21T17:05:00.000Z"
            },
            {
                id: "ped-003",
                filialId: "blumenau",
                itens: [
                    { produtoId: "prod-003", produtoNome: "Ibuprofeno 600mg", unidade: "Caixa", estoqueInformado: 8, quantidadeSolicitada: 18, observacao: "" },
                    { produtoId: "prod-018", produtoNome: "Etiqueta térmica", unidade: "Unidade", estoqueInformado: 60, quantidadeSolicitada: 140, observacao: "Impressora nova da filial." }
                ],
                observacao: "Pedido emergencial aprovado.",
                observacaoMatriz: "Pedido aprovado. Entrega prevista: 23/07/2026.",
                situacao: "em_transito",
                entregaPrevista: "2026-07-23",
                recebidoEm: null,
                criadoEm: "2026-07-18T09:15:00.000Z",
                analisadoEm: "2026-07-18T15:30:00.000Z"
            },
            {
                id: "ped-004",
                filialId: "sinop",
                itens: [
                    { produtoId: "prod-017", produtoNome: "Sacola M Therapeutica", unidade: "Unidade", estoqueInformado: 25, quantidadeSolicitada: 80, observacao: "Reposição para campanha local." }
                ],
                observacao: "Pedido aprovado.",
                observacaoMatriz: "Pedido aprovado e recebido pela filial.",
                situacao: "recebido",
                entregaPrevista: "2026-07-19",
                recebidoEm: "2026-07-19T11:30:00.000Z",
                criadoEm: "2026-07-17T08:50:00.000Z",
                analisadoEm: "2026-07-17T10:05:00.000Z"
            },
            {
                id: "ped-005",
                filialId: "lucas",
                itens: [
                    { produtoId: "prod-023", produtoNome: "Papel A4", unidade: "Resma", estoqueInformado: 3, quantidadeSolicitada: 18, observacao: "Solicitação acima da média." }
                ],
                observacao: "Material administrativo fora do escopo de produção.",
                observacaoMatriz: "Recusado: item não é produzido pela indústria neste ciclo.",
                situacao: "recusado",
                criadoEm: "2026-07-15T10:25:00.000Z",
                analisadoEm: "2026-07-15T16:00:00.000Z"
            },
            {
                id: "ped-006",
                filialId: "sinop",
                itens: [
                    { produtoId: "prod-006", produtoNome: "Protetor solar FPS 50", unidade: "Unidade", estoqueInformado: 7, quantidadeSolicitada: 22, observacao: "Reposição para frente de loja." },
                    { produtoId: "prod-027", produtoNome: "Vitamina C 1g", unidade: "Caixa", estoqueInformado: 9, quantidadeSolicitada: 30, observacao: "" },
                    { produtoId: "prod-030", produtoNome: "Caixa presente P", unidade: "Unidade", estoqueInformado: 12, quantidadeSolicitada: 40, observacao: "Campanha de kits." }
                ],
                observacao: "Pedido de fim de semana.",
                observacaoMatriz: "",
                situacao: "pendente",
                criadoEm: "2026-07-22T11:05:00.000Z",
                analisadoEm: null
            }
        ],
        filiais: FILIAIS_PADRAO.map((filial) => ({ ...filial })),
        estoqueFiliais: {
            "blumenau:prod-001": { quantidade: 34, atualizadoEm: "2026-07-20T10:00:00.000Z" },
            "blumenau:prod-003": { quantidade: 8, atualizadoEm: "2026-07-18T09:15:00.000Z" },
            "blumenau:prod-005": { quantidade: 4, atualizadoEm: "2026-07-22T08:40:00.000Z" },
            "blumenau:prod-010": { quantidade: 2, atualizadoEm: "2026-07-22T08:40:00.000Z" },
            "blumenau:prod-018": { quantidade: 60, atualizadoEm: "2026-07-18T09:15:00.000Z" },
            "blumenau:prod-029": { quantidade: 3, atualizadoEm: "2026-07-22T08:40:00.000Z" },
            "lucas:prod-002": { quantidade: 28, atualizadoEm: "2026-07-19T09:30:00.000Z" },
            "lucas:prod-014": { quantidade: 5, atualizadoEm: "2026-07-21T15:10:00.000Z" },
            "lucas:prod-023": { quantidade: 3, atualizadoEm: "2026-07-15T10:25:00.000Z" },
            "lucas:prod-026": { quantidade: 1, atualizadoEm: "2026-07-21T15:10:00.000Z" },
            "lucas:prod-028": { quantidade: 11, atualizadoEm: "2026-07-18T13:40:00.000Z" },
            "sinop:prod-006": { quantidade: 7, atualizadoEm: "2026-07-22T11:05:00.000Z" },
            "sinop:prod-009": { quantidade: 13, atualizadoEm: "2026-07-17T14:20:00.000Z" },
            "sinop:prod-017": { quantidade: 105, atualizadoEm: "2026-07-17T10:05:00.000Z" },
            "sinop:prod-027": { quantidade: 9, atualizadoEm: "2026-07-22T11:05:00.000Z" },
            "sinop:prod-030": { quantidade: 12, atualizadoEm: "2026-07-22T11:05:00.000Z" }
        },
        atualizadoEm: agora
    };
}

function normalizarTipoMovimentacao(tipo) {
    const texto = String(tipo || "ajuste")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    if (texto.includes("entrada")) return "entrada";
    if (texto.includes("saida")) return "saida";
    if (texto.includes("transfer")) return "transferencia";
    return "ajuste";
}

function normalizarProduto(produto) {
    const nome = String(produto?.name ?? produto?.nome ?? "").trim();

    return {
        id: String(produto?.id || gerarId("prod")),
        codigo: String(produto?.codigo ?? produto?.code ?? "").trim(),
        nome,
        categoria: String(produto?.categoria ?? produto?.category ?? "Outros").trim() || "Outros",
        quantidade: numeroInteiroNaoNegativo(produto?.quantidade ?? produto?.quantity),
        estoqueMinimo: numeroInteiroNaoNegativo(produto?.estoqueMinimo ?? produto?.minStock),
        unidade: String(produto?.unidade ?? produto?.unit ?? "Unidade").trim() || "Unidade",
        ativo: produto?.ativo !== false && produto?.active !== false,
        criadoEm: produto?.criadoEm ?? produto?.createdAt ?? new Date().toISOString(),
        atualizadoEm: produto?.atualizadoEm ?? produto?.updatedAt ?? new Date().toISOString(),
        arquivadoEm: produto?.arquivadoEm ?? null
    };
}

function normalizarMovimentacao(movimentacao) {
    return {
        id: String(movimentacao?.id || gerarId("mov")),
        produtoId: String(movimentacao?.produtoId ?? movimentacao?.productId ?? ""),
        produtoNome: String(movimentacao?.produtoNome ?? movimentacao?.produto ?? movimentacao?.productName ?? "Produto não identificado"),
        tipo: normalizarTipoMovimentacao(movimentacao?.tipo ?? movimentacao?.type),
        quantidade: numeroInteiroNaoNegativo(movimentacao?.quantidade ?? movimentacao?.quantity),
        unidade: String(movimentacao?.unidade ?? movimentacao?.unit ?? "Unidade"),
        saldoAntes: movimentacao?.saldoAntes ?? movimentacao?.balanceBefore ?? null,
        saldoDepois: movimentacao?.saldoDepois ?? movimentacao?.balanceAfter ?? null,
        observacao: String(movimentacao?.observacao ?? movimentacao?.note ?? ""),
        filialId: String(movimentacao?.filialId ?? ""),
        pedidoId: String(movimentacao?.pedidoId ?? ""),
        criadoEm: movimentacao?.criadoEm ?? movimentacao?.data ?? movimentacao?.createdAt ?? new Date().toISOString()
    };
}

function normalizarPedido(pedido) {
    const situacoesValidasPedido = ["pendente", "aprovado", "em_producao", "agendado_envio", "em_transito", "recebido", "finalizado", "recusado"];
    const situacoesValidasItem = ["pendente", "aprovado", "em_producao", "agendado_envio", "em_transito", "recebido", "recusado"];
    const statusRecebido = pedido?.situacao ?? pedido?.status;
    const situacao = situacoesValidasPedido.includes(statusRecebido)
        ? statusRecebido
        : "pendente";
    const situacaoPadraoItem = situacao === "finalizado" ? "recebido" : situacao;

    const itensRecebidos = Array.isArray(pedido?.itens) ? pedido.itens : [pedido];
    const itens = itensRecebidos
        .map((item) => ({
            produtoId: String(item?.produtoId ?? item?.productId ?? pedido?.produtoId ?? ""),
            produtoNome: String(item?.produtoNome ?? item?.productName ?? pedido?.produtoNome ?? pedido?.productName ?? "Produto não identificado"),
            unidade: String(item?.unidade ?? item?.unit ?? pedido?.unidade ?? pedido?.unit ?? "Unidade"),
            estoqueInformado: numeroInteiroNaoNegativo(item?.estoqueInformado ?? item?.reportedStock ?? pedido?.estoqueInformado ?? pedido?.reportedStock),
            quantidadeSolicitada: numeroInteiroNaoNegativo(item?.quantidadeSolicitada ?? item?.requestedQuantity ?? pedido?.quantidadeSolicitada ?? pedido?.requestedQuantity),
            observacao: String(item?.observacao ?? item?.note ?? ""),
            situacao: situacoesValidasItem.includes(item?.situacao) ? item.situacao : situacaoPadraoItem,
            producaoPrevista: item?.producaoPrevista ?? item?.producao_prevista ?? "",
            observacaoMatriz: String(item?.observacaoMatriz ?? "")
        }))
        .filter((item) => item.produtoId || item.produtoNome !== "Produto não identificado");

    return {
        id: String(pedido?.id || gerarId("ped")),
        numeroPedido: pedido?.numeroPedido ?? pedido?.numero_pedido ?? null,
        filialId: String(pedido?.filialId ?? ""),
        itens,
        observacao: String(pedido?.observacao ?? pedido?.note ?? ""),
        observacaoMatriz: String(pedido?.observacaoMatriz ?? pedido?.managerNote ?? ""),
        situacao,
        entregaPrevista: pedido?.entregaPrevista ?? pedido?.deliveryDate ?? "",
        recebidoEm: pedido?.recebidoEm ?? pedido?.receivedAt ?? null,
        criadoEm: pedido?.criadoEm ?? pedido?.createdAt ?? new Date().toISOString(),
        analisadoEm: pedido?.analisadoEm ?? pedido?.handledAt ?? null
    };
}

function normalizarRemessa(remessa) {
    return {
        id: String(remessa?.id || ""),
        pedidoId: String(remessa?.pedidoId ?? remessa?.pedido_id ?? ""),
        situacao: String(remessa?.situacao || "em_transito"),
        envioPrevisto: remessa?.envioPrevisto ?? remessa?.envio_previsto ?? "",
        entregaPrevista: remessa?.entregaPrevista ?? remessa?.entrega_prevista ?? "",
        enviadaEm: remessa?.enviadaEm ?? remessa?.enviada_em ?? null,
        recebidaEm: remessa?.recebidaEm ?? remessa?.recebida_em ?? null,
        itens: (Array.isArray(remessa?.itens) ? remessa.itens : []).map((item) => ({
            produtoId: String(item?.produtoId ?? item?.produto_id ?? ""),
            quantidade: numeroInteiroNaoNegativo(item?.quantidade),
            recebidoEm: item?.recebidoEm ?? item?.recebido_em ?? null
        }))
    };
}

function normalizarReservaProducao(reserva) {
    return {
        pedidoId: String(reserva?.pedidoId ?? reserva?.pedido_id ?? ""),
        produtoId: String(reserva?.produtoId ?? reserva?.produto_id ?? ""),
        quantidade: numeroInteiroNaoNegativo(reserva?.quantidade),
        criadaEm: reserva?.criadaEm ?? reserva?.criada_em ?? null
    };
}

function exibirUsuarioLogado() {
    if (!perfilAtual) return;
    const nome = perfilAtual.nome?.trim() || "Usuário";
    const descricaoPapel = usuarioEhCD() ? "Administrador do CD" : "Usuário de filial";
    const filial = perfilAtual.filial_id ? buscarFilial(perfilAtual.filial_id) : null;

    elementos.usuarioLogado.textContent = `Olá, ${nome}`;
    elementos.nomeUsuarioLogado.textContent = nome;
    elementos.contextoUsuarioLogado.textContent = filial
        ? `${descricaoPapel} · ${filial.nome}`
        : descricaoPapel;
}

function normalizarFilial(filial) {
    const dados = filial && typeof filial === "object" ? filial : {};
    const filialNormalizada = { ...dados, id: String(dados.id ?? "").trim() };
    if (filialNormalizada.id === "matriz") {
        return { ...filialNormalizada, nome: "Sorriso", cidade: "Sorriso, MT" };
    }
    return filialNormalizada;
}

function ordenarFiliais(filiais) {
    const ordemPorId = new Map(FILIAIS_PADRAO.map((filial, indice) => [filial.id, indice]));
    return [...filiais].sort((a, b) => {
        const ordemA = ordemPorId.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const ordemB = ordemPorId.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return ordemA - ordemB || a.nome.localeCompare(b.nome, "pt-BR");
    });
}

function normalizarEstado(dados) {
    const base = estadoPadrao();
    const fonte = dados && typeof dados === "object" ? dados : {};
    const produtos = Array.isArray(fonte.produtos) ? fonte.produtos : [];
    const movimentacoes = Array.isArray(fonte.movimentacoes) ? fonte.movimentacoes : [];
    const remessas = Array.isArray(fonte.remessas) ? fonte.remessas : [];
    const reservasProducao = Array.isArray(fonte.reservasProducao) ? fonte.reservasProducao : [];
    const eventosPedido = Array.isArray(fonte.eventosPedido) ? fonte.eventosPedido : [];
    const pedidos = Array.isArray(fonte.pedidos) ? fonte.pedidos : [];
    const filiaisRecebidas = Array.isArray(fonte.filiais) ? fonte.filiais : [];
    const filiaisPorId = new Map(filiaisRecebidas.map((filial) => [String(filial.id), filial]));

    base.produtos = produtos.map(normalizarProduto).filter((produto) => produto.nome);
    base.movimentacoes = movimentacoes.map(normalizarMovimentacao);
    base.remessas = remessas.map(normalizarRemessa).filter((remessa) => remessa.id && remessa.pedidoId);
    base.reservasProducao = reservasProducao.map(normalizarReservaProducao).filter((reserva) => reserva.pedidoId && reserva.produtoId && reserva.quantidade > 0);
    base.eventosPedido = eventosPedido;
    base.pedidos = pedidos.map(normalizarPedido);
    base.filiais = FILIAIS_PADRAO.map((filial) => normalizarFilial({ ...filial, ...filiaisPorId.get(filial.id) }));
    base.estoqueFiliais = fonte.estoqueFiliais && typeof fonte.estoqueFiliais === "object"
        ? fonte.estoqueFiliais
        : {};
    base.demoDesativado = fonte.demoDesativado === true;
    base.atualizadoEm = fonte.atualizadoEm ?? new Date().toISOString();

    return base;
}

function carregarEstado() {
    const salvo = lerJSON(STORAGE_KEY, null);

    if (salvo) {
        const normalizado = normalizarEstado(salvo);
        return normalizado;
    }

    const estadoAnterior = LEGACY_STORAGE_KEYS.map((chave) => lerJSON(chave, null)).find(Boolean);
    if (estadoAnterior) {
        const migrado = normalizarEstado(estadoAnterior);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrado));
        return migrado;
    }

    const produtosAntigos = lerJSON(LEGACY_PRODUCTS_KEY, []);
    const movimentacoesAntigas = lerJSON(LEGACY_MOVEMENTS_KEY, []);
    const temDadosAntigos = (Array.isArray(produtosAntigos) && produtosAntigos.length > 0)
        || (Array.isArray(movimentacoesAntigas) && movimentacoesAntigas.length > 0);
    const migrado = temDadosAntigos ? normalizarEstado({
        produtos: Array.isArray(produtosAntigos) ? produtosAntigos : [],
        movimentacoes: Array.isArray(movimentacoesAntigas) ? movimentacoesAntigas : []
    }) : estadoPadrao();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrado));
    return migrado;
}

function salvarEstado() {
    estado.atualizadoEm = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
    if (!clienteSupabase) {
        notificar("Supabase indisponível. Os dados continuam salvos neste navegador.", "erro");
        return Promise.resolve();
    }
    filaSincronizacao = filaSincronizacao
        .catch(() => undefined)
        .then(sincronizarEstadoNoSupabase)
        .catch((error) => {
            console.error(error);
            notificar("Nao foi possivel salvar os dados no Supabase.", "erro");
        });
    return filaSincronizacao;
}

async function gravarTabela(tabela, registros) {
    if (!registros.length) return;
    const { error } = await clienteSupabase.from(tabela).upsert(registros);
    if (error) throw error;
}

function produtoParaBanco(p) {
    return { id: p.id, codigo: p.codigo, nome: p.nome, categoria: p.categoria, quantidade: p.quantidade, estoque_minimo: p.estoqueMinimo, unidade: p.unidade, ativo: p.ativo, criado_em: p.criadoEm, atualizado_em: p.atualizadoEm, arquivado_em: p.arquivadoEm || null };
}

async function sincronizarProdutos(produtos, produtosAnteriores) {
    const anteriores = new Map(produtosAnteriores.map((produto) => [produto.id, produto]));
    for (const produto of produtos) {
        const anterior = anteriores.get(produto.id);
        const registro = produtoParaBanco(produto);
        if (!anterior) {
            await gravarTabela("produtos", [registro]);
            continue;
        }
        const { data, error } = await clienteSupabase.from("produtos")
            .update(registro)
            .eq("id", produto.id)
            .eq("atualizado_em", anterior.atualizadoEm)
            .select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("Conflito de atualização: este produto foi alterado por outro usuário. Recarregue a página antes de tentar novamente.");
    }
}

async function sincronizarEstoqueFiliais(registros, estoqueAnterior) {
    for (const registro of registros) {
        const chave = chaveEstoqueFilial(registro.filial_id, registro.produto_id);
        const anterior = estoqueAnterior[chave];
        if (!anterior) {
            await gravarTabela("estoque_filiais", [registro]);
            continue;
        }
        const { data, error } = await clienteSupabase.from("estoque_filiais")
            .update(registro)
            .eq("filial_id", registro.filial_id)
            .eq("produto_id", registro.produto_id)
            .eq("atualizado_em", anterior.atualizadoEm)
            .select("produto_id");
        if (error) throw error;
        if (!data?.length) throw new Error("Conflito de atualização: o estoque da filial foi alterado por outro usuário. Recarregue a página antes de tentar novamente.");
    }
}

async function sincronizarPedidos(pedidos, pedidosAnteriores) {
    const anteriores = new Map(pedidosAnteriores.map((pedido) => [pedido.id, pedido]));
    for (const pedido of pedidos) {
        const anterior = anteriores.get(pedido.id);
        if (!anterior) {
            await gravarTabela("pedidos", [pedidoParaBanco(pedido)]);
            continue;
        }
        const { data, error } = await clienteSupabase.from("pedidos")
            .update(pedidoParaBanco(pedido))
            .eq("id", pedido.id)
            .eq("atualizado_em", anterior.atualizadoEm)
            .select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("Conflito de atualização: este pedido foi alterado por outro usuário. Recarregue a página antes de tentar novamente.");
    }
}

function pedidoParaBanco(pedido) {
    return { id: pedido.id, filial_id: pedido.filialId, observacao: pedido.observacao || "", observacao_matriz: pedido.observacaoMatriz || "", situacao: situacaoParaBanco(pedido.situacao), producao_prevista: pedido.producaoPrevista || null, producao_iniciada_em: pedido.producaoIniciadaEm || null, envio_previsto: pedido.envioPrevisto || null, enviado_em: pedido.enviadoEm || null, entrega_prevista: pedido.entregaPrevista || null, recebido_em: pedido.recebidoEm || null, criado_em: pedido.criadoEm, analisado_em: pedido.analisadoEm || null, atualizado_em: pedido.atualizadoEm };
}

function situacaoParaBanco(situacao) {
    return situacao;
}

function itensParaBanco(pedidos) {
    return pedidos.flatMap((pedido) => itensDoPedido(pedido).map((item) => ({ pedido_id: pedido.id, produto_id: item.produtoId, estoque_informado: item.estoqueInformado, quantidade_solicitada: item.quantidadeSolicitada, quantidade_enviada: item.quantidadeEnviada || null, observacao: item.observacao || "", situacao: situacaoParaBanco(item.situacao || pedido.situacao || "pendente"), observacao_matriz: item.observacaoMatriz || "", recebido_em: item.recebidoEm || null })));
}

async function sincronizarEstadoNoSupabase() {
    if (!perfilAtual) throw new Error("Sessão sem perfil de acesso.");
    if (!usuarioEhCD()) {
        const novos = estado.pedidos.filter((pedido) => pedido.filialId === perfilAtual.filial_id && !idsPedidosRemotos.has(pedido.id));
        await gravarTabela("pedidos", novos.map(pedidoParaBanco));
        await gravarTabela("pedido_itens", itensParaBanco(novos));
        novos.forEach((pedido) => idsPedidosRemotos.add(pedido.id));
        return;
    }
    const retrato = JSON.parse(JSON.stringify(estado));
    const anterior = estadoSincronizado || estadoPadrao();
    const alterados = (atuais, anteriores) => {
        const mapaAnterior = new Map(anteriores.map((item) => [item.id, item]));
        return atuais.filter((item) => JSON.stringify(item) !== JSON.stringify(mapaAnterior.get(item.id)));
    };
    const produtos = alterados(retrato.produtos, anterior.produtos);
    const pedidos = alterados(retrato.pedidos, anterior.pedidos);
    pedidos.forEach((pedido) => {
        pedido.atualizadoEm = new Date().toISOString();
        const local = estado.pedidos.find((item) => item.id === pedido.id);
        if (local) local.atualizadoEm = pedido.atualizadoEm;
    });
    const movimentacoes = alterados(retrato.movimentacoes, anterior.movimentacoes);
    const estoque = Object.entries(retrato.estoqueFiliais)
        .filter(([chave, valor]) => JSON.stringify(valor) !== JSON.stringify(anterior.estoqueFiliais[chave]))
        .map(([chave, valor]) => { const [filial_id, produto_id] = chave.split(":"); return { filial_id, produto_id, quantidade: valor.quantidade, atualizado_em: valor.atualizadoEm }; });
    await sincronizarProdutos(produtos, anterior.produtos);
    await sincronizarPedidos(pedidos, anterior.pedidos);
    await gravarTabela("pedido_itens", itensParaBanco(pedidos));
    await sincronizarEstoqueFiliais(estoque, anterior.estoqueFiliais);
    await gravarTabela("movimentacoes", movimentacoes.map((m) => ({ id: m.id, produto_id: m.produtoId, tipo: m.tipo, quantidade: m.quantidade, saldo_antes: m.saldoAntes, saldo_depois: m.saldoDepois, observacao: m.observacao || "", filial_id: m.filialId || null, pedido_id: m.pedidoId || null, criado_em: m.criadoEm })));
    estadoSincronizado = retrato;
}

async function carregarProdutosLegado() {
    const {data, error} = await clienteSupabase
        .from("produtos")
        .select("*")
        .eq("ativo", true)
        .order("nome");

    if (error) {
        console.error(error);
        notificar("Não foi possível carregar os produtos do Supabase.", "erro");
        return;
    }

    estado.produtos = data.map((produto) => ({
        ...produto,
        estoqueMinimo: produto.estoque_minimo,
        criadoEm: produto.criado_em,
        atualizadoEm: produto.atualizado_em
    }));

    renderizarTudo();
}

function produtoDoBanco(produto) {
    return {
        id: produto.id, codigo: produto.codigo, nome: produto.nome, categoria: produto.categoria,
        quantidade: produto.quantidade, estoqueMinimo: produto.estoque_minimo, unidade: produto.unidade,
        ativo: produto.ativo, criadoEm: produto.criado_em, atualizadoEm: produto.atualizado_em,
        arquivadoEm: produto.arquivado_em
    };
}

async function carregarDadosSupabase() {
    if (!clienteSupabase) {
        notificar("Não foi possível carregar o Supabase. Verifique sua conexão e atualize a página.", "erro");
        return;
    }
    const [produtos, filiais, pedidos, estoques, movimentacoes, remessas, eventosPedido, categorias, unidades, reservasProducao] = await Promise.all([
        clienteSupabase.from("produtos").select("*").order("nome"),
        clienteSupabase.from("filiais").select("*").order("nome"),
        clienteSupabase.from("pedidos").select("*, itens:pedido_itens(*)").order("criado_em", { ascending: false }),
        clienteSupabase.from("estoque_filiais").select("*"),
        clienteSupabase.from("movimentacoes").select("*").order("criado_em", { ascending: false }),
        clienteSupabase.from("remessas").select("*, itens:remessa_itens(*)").order("enviada_em", { ascending: false }),
        clienteSupabase.from("pedido_eventos").select("*").order("criado_em", { ascending: false }),
        clienteSupabase.from("categorias_produtos").select("nome").order("nome"),
        clienteSupabase.from("unidades_medida").select("nome").order("nome"),
        clienteSupabase.from("reservas_producao").select("*").order("criada_em")
    ]);
    const erro = [produtos, filiais, pedidos, estoques, movimentacoes, remessas, eventosPedido, categorias, unidades, reservasProducao].find((resultado) => resultado.error)?.error;
    if (erro) {
        console.error(erro);
        notificar("Erro ao carregar os dados do Supabase. Execute o arquivo supabase-schema.sql no SQL Editor.", "erro");
        return;
    }

    categoriasProdutos = categorias.data.map((categoria) => categoria.nome);
    unidadesMedida = unidades.data.map((unidade) => unidade.nome);

    // Defesa adicional no cliente: além das políticas RLS, uma conta de filial
    // só mantém em memória pedidos cujo vínculo é a sua própria filial.
    const filialVinculada = String(perfilAtual?.filial_id || "").trim();
    const pedidosVisiveis = usuarioEhCD()
        ? pedidos.data
        : pedidos.data.filter((pedido) => String(pedido.filial_id || "").trim() === filialVinculada);
    const idsPedidosVisiveis = new Set(pedidosVisiveis.map((pedido) => pedido.id));
    const remessasVisiveis = usuarioEhCD() ? remessas.data : remessas.data.filter((remessa) => idsPedidosVisiveis.has(remessa.pedido_id));
    const eventosVisiveis = usuarioEhCD() ? eventosPedido.data : eventosPedido.data.filter((evento) => idsPedidosVisiveis.has(evento.pedido_id));
    const reservasVisiveis = usuarioEhCD() ? reservasProducao.data : reservasProducao.data.filter((reserva) => idsPedidosVisiveis.has(reserva.pedido_id));

    // O Supabase é a fonte de dados do sistema autenticado. Um banco vazio é
    // um estado válido — por exemplo, após reiniciar o catálogo — e nunca deve
    // ser preenchido novamente com um cache antigo deste navegador.

    const produtosPorId = new Map(produtos.data.map((produto) => [produto.id, produtoDoBanco(produto)]));
    estado = {
        ...estadoPadrao(),
        produtos: [...produtosPorId.values()],
        filiais: ordenarFiliais(filiais.data.map((filial) => normalizarFilial({ id: filial.id, nome: filial.nome, cidade: filial.cidade }))),
        pedidos: pedidosVisiveis.map((pedido) => ({
            id: pedido.id, numeroPedido: pedido.numero_pedido, filialId: pedido.filial_id,
            itens: pedido.itens.map((item) => {
                const produto = produtosPorId.get(item.produto_id);
                return { produtoId: item.produto_id, produtoNome: produto?.nome || "Produto nao identificado", unidade: produto?.unidade || "Unidade", estoqueInformado: item.estoque_informado, quantidadeSolicitada: item.quantidade_solicitada, quantidadeEnviada: item.quantidade_enviada || null, quantidadeEncerrada: item.quantidade_encerrada || 0, motivoEncerramento: item.motivo_encerramento || "", observacao: item.observacao, situacao: item.situacao || pedido.situacao, producaoPrevista: item.producao_prevista || "", observacaoMatriz: item.observacao_matriz || "", recebidoEm: item.recebido_em || null };
            }),
            observacao: pedido.observacao, observacaoMatriz: pedido.observacao_matriz, situacao: pedido.situacao,
            producaoPrevista: pedido.producao_prevista || "", producaoIniciadaEm: pedido.producao_iniciada_em || null, envioPrevisto: pedido.envio_previsto || "", enviadoEm: pedido.enviado_em || null,
            entregaPrevista: pedido.entrega_prevista || "", recebidoEm: pedido.recebido_em,
            criadoEm: pedido.criado_em, analisadoEm: pedido.analisado_em, atualizadoEm: pedido.atualizado_em
        })),
        estoqueFiliais: Object.fromEntries(estoques.data.map((item) => [chaveEstoqueFilial(item.filial_id, item.produto_id), { quantidade: item.quantidade, atualizadoEm: item.atualizado_em }])),
        movimentacoes: movimentacoes.data.map((movimentacao) => {
            const produto = produtosPorId.get(movimentacao.produto_id);
            return { id: movimentacao.id, produtoId: movimentacao.produto_id, produtoNome: produto?.nome || "Produto nao identificado", tipo: movimentacao.tipo, quantidade: movimentacao.quantidade, unidade: produto?.unidade || "Unidade", saldoAntes: movimentacao.saldo_antes, saldoDepois: movimentacao.saldo_depois, observacao: movimentacao.observacao, filialId: movimentacao.filial_id || "", pedidoId: movimentacao.pedido_id || "", remessaId: movimentacao.remessa_id || "", criadoEm: movimentacao.criado_em };
        }),
        remessas: remessasVisiveis.map(normalizarRemessa),
        reservasProducao: reservasVisiveis.map(normalizarReservaProducao),
        eventosPedido: eventosVisiveis.map((evento) => ({ id: evento.id, pedidoId: evento.pedido_id, remessaId: evento.remessa_id, tipo: evento.tipo, dados: evento.dados || {}, criadoEm: evento.criado_em }))
    };
    idsPedidosRemotos = new Set(estado.pedidos.map((pedido) => pedido.id));
    estadoSincronizado = JSON.parse(JSON.stringify(estado));
    renderizarTudo();
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatarNumero(valor) {
    return new Intl.NumberFormat("pt-BR").format(numeroInteiroNaoNegativo(valor));
}

function numeroPedidoParaExibicao(pedido) {
    return pedido?.numeroPedido ? `#${formatarNumero(pedido.numeroPedido)}` : "—";
}

function formatarData(valor) {
    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return "Data não disponível";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(data);
}

function formatarDataSimples(valor) {
    if (!valor) return "";
    const data = new Date(`${valor}T12:00:00`);

    if (Number.isNaN(data.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(data);
}

function produtosAtivos() {
    return estado.produtos.filter((produto) => produto.ativo);
}

function produtosDoStatusSelecionado() {
    const status = elementos.filtroStatusProdutos.value;

    if (status === "arquivados") {
        return estado.produtos.filter((produto) => !produto.ativo);
    }

    if (status === "todos") {
        return estado.produtos;
    }

    return produtosAtivos();
}

function buscarProduto(id) {
    return estado.produtos.find((produto) => produto.id === id);
}

function buscarFilial(id) {
    const filialId = String(id ?? "").trim();
    return estado.filiais.find((filial) => String(filial.id ?? "").trim() === filialId);
}

function estaNoPortalFilial() {
    return portalAtual !== CENTRO_DISTRIBUICAO_ID;
}

function filialAtual() {
    return estaNoPortalFilial() ? buscarFilial(portalAtual) : null;
}

function usuarioEhFilialDestinataria(pedido) {
    // A confirmação pertence à filial realmente vinculada ao usuário. Normalizar
    // os identificadores evita ocultar o botão por diferenças de tipo no retorno do banco.
    const filialDoUsuario = perfilAtual?.filial_id || filialAtual()?.id;
    return !usuarioEhCD()
        && Boolean(filialDoUsuario)
        && String(filialDoUsuario).trim() === String(pedido?.filialId || "").trim();
}

function podeConfirmarRecebimento(pedido) {
    // A ação acompanha o portal da filial destinatária. Assim, uma conta da
    // filial confirma normalmente e o administrador pode testar/operar essa
    // mesma filial sem exibir o botão no portal do CD.
    const filial = filialAtual();
    return Boolean(filial)
        && String(filial.id).trim() === String(pedido?.filialId || "").trim();
}

function itensDoPedido(pedido) {
    return Array.isArray(pedido.itens) ? pedido.itens : [];
}

function itensAgrupadosPorCategoria(itens) {
    const grupos = new Map();
    itens.forEach((item, indice) => {
        const categoria = buscarProduto(item.produtoId)?.categoria || "Outros";
        if (!grupos.has(categoria)) grupos.set(categoria, []);
        grupos.get(categoria).push({ item, indice });
    });
    return [...grupos.entries()]
        .sort(([categoriaA], [categoriaB]) => categoriaA.localeCompare(categoriaB, "pt-BR"))
        .map(([categoria, itensDaCategoria]) => ({
            categoria,
            itens: itensDaCategoria.sort((a, b) => a.item.produtoNome.localeCompare(b.item.produtoNome, "pt-BR"))
        }));
}

function renderizarItensAgrupadosPorCategoria(itens, renderizarItem, classe = "") {
    return itensAgrupadosPorCategoria(itens).map(({ categoria, itens: itensDaCategoria }) => `
        <section class="grupo-itens-categoria ${classe}">
            <h4>${escaparHTML(categoria)} <span>${itensDaCategoria.length} ${itensDaCategoria.length === 1 ? "item" : "itens"}</span></h4>
            <div class="lista-itens-categoria">${itensDaCategoria.map(({ item, indice }) => renderizarItem(item, indice)).join("")}</div>
        </section>
    `).join("");
}

function itensEmAcao(pedido) {
    return itensSelecionadosPedido.length
        ? itensDoPedido(pedido).filter((item) => itensSelecionadosPedido.includes(item.produtoId))
        : itensDoPedido(pedido);
}

function situacaoDoItemPedido(item, pedido) {
    const situacao = item.situacao || pedido.situacao || "pendente";
    return situacao === "pendente" && Number.isInteger(item.quantidadeEnviada) && item.quantidadeEnviada > 0
        ? "aprovado"
        : situacao;
}

function situacaoDoPedido(pedido) {
    const situacoes = itensDoPedido(pedido).map((item) => situacaoDoItemPedido(item, pedido));
    if (situacoes.every((situacao) => situacao === "recusado")) return "recusado";
    if (situacoes.length && situacoes.every((situacao) => situacao === "recebido" || situacao === "recusado")) return "finalizado";
    if (window.PedidosUtils && Array.isArray(estado?.remessas)) {
        return window.PedidosUtils.statusOperacionalPedido(pedido, estado.remessas);
    }
    if (situacoes.includes("em_transito")) return "em_transito";
    if (situacoes.includes("agendado_envio")) return "agendado_envio";
    if (situacoes.includes("em_producao")) return "em_producao";
    if (situacoes.includes("aprovado")) return "aprovado";
    return "pendente";
}

function atualizarSituacaoDoPedido(pedido) {
    pedido.situacao = situacaoDoPedido(pedido);
    pedido.atualizadoEm = new Date().toISOString();
}

function itemTemEnvioParcial(pedido, item) {
    const atendimentoItem = window.PedidosUtils?.calcularAtendimentoPedido(pedido, estado.remessas).itens
        .find((registro) => registro.produtoId === item.produtoId);
    return situacaoDoItemPedido(item, pedido) !== "recusado"
        && (atendimentoItem?.enviado || 0) > 0
        && (atendimentoItem?.pendente || 0) > 0;
}

function pedidoCorrespondeStatus(pedido, status) {
    if (!status) return true;
    if (status === "com_item_pendente") {
        return itensDoPedido(pedido).some((item) => situacaoDoItemPedido(item, pedido) === "pendente");
    }
    if (status === "envio_parcial") {
        return itensDoPedido(pedido).some((item) => itemTemEnvioParcial(pedido, item));
    }
    return situacaoDoPedido(pedido) === status;
}

function itemCorrespondeStatus(pedido, item, status) {
    if (!status) return true;
    return status === "envio_parcial"
        ? itemTemEnvioParcial(pedido, item)
        : situacaoDoItemPedido(item, pedido) === status;
}

function pedidosAbertos() {
    return estado.pedidos.filter((pedido) => ["pendente", "aprovado", "em_producao", "agendado_envio", "em_transito"].includes(situacaoDoPedido(pedido)));
}

function produtosComEstoqueBaixo() {
    return produtosAtivos().filter((produto) => produto.quantidade <= produto.estoqueMinimo);
}

function chaveEstoqueFilial(filialId, produtoId) {
    return `${filialId}:${produtoId}`;
}

function quantidadeEstoqueFilial(filialId, produtoId) {
    if (!filialId || !produtoId) return 0;
    const registro = estado.estoqueFiliais[chaveEstoqueFilial(filialId, produtoId)];
    return numeroInteiroNaoNegativo(registro?.quantidade ?? registro);
}

function situacaoProduto(produto) {
    if (produto.quantidade === 0) {
        return { texto: "Sem estoque", classe: "status-sem-estoque" };
    }

    if (produto.quantidade <= produto.estoqueMinimo) {
        return { texto: "Estoque baixo", classe: "status-baixo" };
    }

    return { texto: "Normal", classe: "status-normal" };
}

function textoTipoMovimentacao(tipo) {
    return {
        entrada: "Entrada",
        saida: "Saída",
        transferencia: "Transferência",
        ajuste: "Ajuste"
    }[tipo] || "Ajuste";
}

function classeTipoMovimentacao(tipo) {
    return `tipo-${tipo || "ajuste"}`;
}

function textoSituacaoPedido(situacao) {
    return {
        pendente: "Pendente",
        com_item_pendente: "Aguardando análise",
        em_producao: "Em produção",
        agendado_envio: "Envio agendado",
        envio_parcial: "Envio parcial",
        em_transito: "A caminho",
        recebido: "Recebido",
        finalizado: "Finalizado",
        aprovado: "Aprovado",
        recusado: "Recusado"
    }[situacao] || "Pendente";
}

function classeSituacaoPedido(situacao) {
    return `tipo-${situacao || "pendente"}`;
}

function notificar(mensagem, tipo = "sucesso") {
    clearTimeout(temporizadorToast);
    elementos.toast.textContent = mensagem;
    elementos.toast.classList.toggle("toast-erro", tipo === "erro");
    elementos.toast.classList.add("toast-visivel");

    temporizadorToast = setTimeout(() => {
        elementos.toast.classList.remove("toast-visivel");
    }, 3600);
}

function abrirModal(modal) {
    const modaisAbertos = [...document.querySelectorAll(".modal.modal-aberto")]
        .filter((item) => item !== modal);
    modal.style.zIndex = String(100 + (modaisAbertos.length * 10));
    modal.classList.toggle("modal-sobreposta", modaisAbertos.length > 0);
    modal.classList.add("modal-aberto");
    modal.setAttribute("aria-hidden", "false");
}

function fecharModal(modal) {
    modal.classList.remove("modal-aberto");
    modal.classList.remove("modal-sobreposta");
    modal.style.removeProperty("z-index");
    modal.setAttribute("aria-hidden", "true");
}

function fecharMenuPerfil() {
    elementos.menuPerfilOpcoes.hidden = true;
    elementos.botaoPerfil.setAttribute("aria-expanded", "false");
}

function abrirModalAlterarSenha() {
    fecharMenuPerfil();
    elementos.formularioAlterarSenha.reset();
    elementos.mensagemAlterarSenha.textContent = "";
    abrirModal(elementos.modalAlterarSenha);
    elementos.novaSenhaUsuario.focus();
}

function atualizarPaginaMovimentacao() {
    const entrada = tipoMovimentacaoAtual === "entrada";

    elementos.movimentoSubtitulo.textContent = entrada ? "Recebimento de produtos" : "Consumo, perda ou transferência";
    elementos.movimentoTitulo.textContent = entrada ? "Registrar entrada" : "Registrar saída";
    elementos.movimentoDescricao.textContent = entrada
        ? "Registre produtos finalizados pela indústria e recebidos no Centro de Distribuição."
        : "Registre itens consumidos no Centro de Distribuição ou enviados para as filiais.";
    elementos.botaoConfirmarMovimento.textContent = entrada ? "Confirmar entrada" : "Confirmar saída";
}

function atualizarDestinoDaMovimentacao() {
    const entrada = tipoMovimentacaoAtual === "entrada";
    elementos.campoMovimentoFilial.hidden = entrada;
    elementos.movimentoFilial.disabled = entrada;
    elementos.campoMovimentoXml.hidden = !entrada;
    elementos.movimentoXml.disabled = !entrada;
    atualizarSelecaoProdutoXml();
}

function textoNormalizado(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function elementosXmlPorNome(documento, nome) {
    return [...documento.getElementsByTagName("*")].filter((elemento) => elemento.localName === nome);
}

function textoDoElementoXml(elemento, nome) {
    return elementosXmlPorNome(elemento, nome)[0]?.textContent?.trim() || "";
}

function encontrarProdutoDoXml(item) {
    const codigo = String(item.codigo || "").trim();
    const nome = textoNormalizado(item.nome);
    return (codigo && produtosAtivos().find((produto) => String(produto.codigo || "").trim() === codigo))
        || produtosAtivos().find((produto) => textoNormalizado(produto.nome) === nome);
}

function atualizarSelecaoProdutoXml() {
    const item = itensXmlMovimentacao[indiceItemXmlSelecionado];
    const produtoEncontrado = item && encontrarProdutoDoXml(item);
    const bloquear = tipoMovimentacaoAtual === "entrada" && Boolean(produtoEncontrado) && !itensXmlRegistrados.has(indiceItemXmlSelecionado);

    elementos.movimentoProduto.disabled = bloquear;
    elementos.movimentoProduto.title = bloquear
        ? "Produto identificado automaticamente pelo XML."
        : "";
    elementos.buscaMovimentoProduto.disabled = bloquear || produtosAtivos().length === 0;
    elementos.buscaMovimentoProduto.title = elementos.movimentoProduto.title;
}

function atualizarBotaoCadastrarProdutoXml() {
    const item = itensXmlMovimentacao[indiceItemXmlSelecionado];
    const produtoEncontrado = item && encontrarProdutoDoXml(item);
    elementos.botaoCadastrarProdutoXml.hidden = !item || itensXmlRegistrados.has(indiceItemXmlSelecionado) || Boolean(produtoEncontrado) || Boolean(elementos.movimentoProduto.value);
}

function renderizarItensXmlMovimentacao() {
    elementos.movimentoItemXml.innerHTML = itensXmlMovimentacao.map((item, indice) => {
        const registrado = itensXmlRegistrados.has(indice);
        const status = registrado ? " ✓ Registrado" : "";
        return `<option value="${indice}"${registrado ? " disabled" : ""}>${indice + 1}. ${escaparHTML(item.nome || item.codigo)} · ${formatarNumero(item.quantidade)} unidade(s)${status}</option>`;
    }).join("");
}

function preencherItemXmlMovimentacao(indice) {
    const item = itensXmlMovimentacao[Number(indice)];
    if (!item) return;

    indiceItemXmlSelecionado = Number(indice);
    const produto = encontrarProdutoDoXml(item);
    produtoSelecionadoMovimentacao = produto?.id || "";
    elementos.movimentoProduto.value = produtoSelecionadoMovimentacao;
    sincronizarBuscaMovimentoComProduto();
    atualizarSelecaoProdutoXml();
    elementos.movimentoQuantidade.value = Number.isInteger(item.quantidade) && item.quantidade > 0 ? String(item.quantidade) : "";
    elementos.movimentoObservacao.value = item.observacao;
    atualizarInformacaoProdutoMovimento();

    elementos.mensagemXml.textContent = produto
        ? `Item ${Number(indice) + 1} preenchido com o produto cadastrado “${produto.nome}”. A seleção foi bloqueada para evitar lançamentos no produto incorreto.`
        : `Item ${Number(indice) + 1} carregado. Selecione manualmente o produto correspondente, pois ele não foi encontrado no cadastro.`;
    atualizarBotaoCadastrarProdutoXml();
}

function limparImportacaoXml(limparCampos = true) {
    itensXmlMovimentacao = [];
    indiceItemXmlSelecionado = null;
    itensXmlRegistrados.clear();
    elementos.movimentoXml.value = "";
    elementos.movimentoItemXml.innerHTML = "";
    elementos.campoItemXml.hidden = true;
    elementos.mensagemXml.textContent = "";
    elementos.botaoRemoverXml.hidden = true;
    elementos.botaoCadastrarProdutoXml.hidden = true;
    atualizarSelecaoProdutoXml();

    if (limparCampos) {
        produtoSelecionadoMovimentacao = "";
        elementos.movimentoProduto.value = "";
        sincronizarBuscaMovimentoComProduto();
        elementos.movimentoQuantidade.value = "";
        elementos.movimentoObservacao.value = "";
        atualizarInformacaoProdutoMovimento();
    }
}

function unidadeDoXml(unidade) {
    const unidades = {
        un: "Unidade", und: "Unidade", unidade: "Unidade",
        cx: "Caixa", caixa: "Caixa",
        pct: "Pacote", pc: "Pacote", pacote: "Pacote",
        l: "Litro", lt: "Litro", litro: "Litro",
        kg: "Quilograma", quilograma: "Quilograma"
    };
    return unidades[textoNormalizado(unidade)] || "";
}

function abrirCadastroProdutoDoXml() {
    const item = itensXmlMovimentacao[indiceItemXmlSelecionado];
    if (!item) return;

    abrirModalProduto();
    elementos.produtoCodigo.value = item.codigo;
    elementos.produtoNome.value = item.nome;
    elementos.produtoCategoria.value = "Outros";
    elementos.produtoQuantidade.value = "0";
    elementos.produtoMinimo.value = "0";
    elementos.produtoUnidade.value = unidadeDoXml(item.unidade);
    elementos.mensagemProduto.textContent = "Confira a categoria e a unidade antes de salvar. A quantidade da nota continuará preenchida na entrada.";
}

function carregarItensDoXml(texto) {
    const documento = new DOMParser().parseFromString(texto, "application/xml");
    if (documento.querySelector("parsererror")) throw new Error("O arquivo não contém um XML válido.");

    const numeroNota = textoDoElementoXml(documento, "nNF");
    const emitente = textoDoElementoXml(elementosXmlPorNome(documento, "emit")[0] || documento, "xNome");
    const itens = elementosXmlPorNome(documento, "det").map((detalhe) => {
        const produto = elementosXmlPorNome(detalhe, "prod")[0] || detalhe;
        const quantidadeTexto = textoDoElementoXml(produto, "qCom").replace(",", ".");
        const quantidade = Number(quantidadeTexto);
        const nome = textoDoElementoXml(produto, "xProd");
        const codigo = textoDoElementoXml(produto, "cProd");
        const unidade = textoDoElementoXml(produto, "uCom");
        const descricaoNota = numeroNota ? `NF-e ${numeroNota}` : "NF-e importada por XML";
        return {
            codigo,
            nome,
            unidade,
            quantidade: Number.isInteger(quantidade) ? quantidade : 0,
            observacao: `${descricaoNota}${emitente ? ` · ${emitente}` : ""}${codigo ? ` · Cód. ${codigo}` : ""}${unidade ? ` · ${unidade}` : ""}`
        };
    }).filter((item) => item.nome || item.codigo);

    if (!itens.length) throw new Error("Nenhum item de produto foi encontrado no XML.");
    return itens;
}

async function importarXmlMovimentacao() {
    const arquivo = elementos.movimentoXml.files?.[0];
    limparImportacaoXml(false);
    if (!arquivo) return;

    if (!/\.xml$/i.test(arquivo.name) && !["text/xml", "application/xml"].includes(arquivo.type)) {
        elementos.mensagemXml.textContent = "Selecione um arquivo XML de nota fiscal.";
        elementos.movimentoXml.value = "";
        return;
    }

    try {
        itensXmlMovimentacao = carregarItensDoXml(await arquivo.text());
        renderizarItensXmlMovimentacao();
        elementos.campoItemXml.hidden = false;
        elementos.botaoRemoverXml.hidden = false;
        preencherItemXmlMovimentacao(0);
    } catch (erro) {
        console.error(erro);
        elementos.mensagemXml.textContent = erro.message || "Não foi possível ler o XML.";
    }
}

function avancarItemXmlAposEntrada() {
    if (tipoMovimentacaoAtual !== "entrada" || !Number.isInteger(indiceItemXmlSelecionado) || !itensXmlMovimentacao[indiceItemXmlSelecionado]) return false;

    itensXmlRegistrados.add(indiceItemXmlSelecionado);
    renderizarItensXmlMovimentacao();
    const proximoIndice = itensXmlMovimentacao.findIndex((_item, indice) => !itensXmlRegistrados.has(indice));

    if (proximoIndice >= 0) {
        elementos.movimentoItemXml.value = String(proximoIndice);
        preencherItemXmlMovimentacao(proximoIndice);
        elementos.mensagemXml.textContent = `Entrada registrada. Continue pelo item ${proximoIndice + 1} de ${itensXmlMovimentacao.length}. ${elementos.mensagemXml.textContent}`;
        return true;
    }

    produtoSelecionadoMovimentacao = "";
    elementos.movimentoProduto.value = "";
    sincronizarBuscaMovimentoComProduto();
    elementos.movimentoQuantidade.value = "";
    elementos.movimentoObservacao.value = "";
    atualizarInformacaoProdutoMovimento();
    atualizarBotaoCadastrarProdutoXml();
    elementos.mensagemXml.textContent = `Todos os ${itensXmlMovimentacao.length} itens do XML foram registrados.`;
    return true;
}

function navegar(pagina, opcoes = {}) {
    const paginasFilial = ["portal-filial", "novo-pedido-filial", "meus-pedidos"];
    const paginasPermitidasNaFilial = [...paginasFilial, "qualidade"];

    if (estaNoPortalFilial() && !paginasPermitidasNaFilial.includes(pagina)) {
        pagina = "portal-filial";
    }

    if (!estaNoPortalFilial() && paginasFilial.includes(pagina)) {
        pagina = "dashboard";
    }

    paginaAtual = pagina in titulosPaginas ? pagina : "dashboard";
    document.body.classList.toggle("portal-filial-ativo", estaNoPortalFilial());

    if (opcoes.tipoMovimentacao) {
        tipoMovimentacaoAtual = opcoes.tipoMovimentacao;
    }

    if (opcoes.produtoId !== undefined) {
        produtoSelecionadoMovimentacao = opcoes.produtoId;
    }

    elementos.paginas.forEach((item) => {
        item.classList.toggle("pagina-ativa", item.id === `pagina-${paginaAtual}`);
    });

    elementos.menuMatriz.hidden = estaNoPortalFilial();
    elementos.menuFilial.hidden = !estaNoPortalFilial();
    if (!paginaAtual.startsWith("configuracoes-")) {
        elementos.submenuConfiguracoes.hidden = true;
        elementos.botaoConfiguracoes.setAttribute("aria-expanded", "false");
    }
    const filial = filialAtual();
    elementos.contextoPortal.textContent = filial
        ? `Therapeutica Pharmacia · Filial ${filial.nome}`
        : "Therapeutica Pharmacia · Centro de Distribuição";

    elementos.navegacao.forEach((item) => {
        const correspondePagina = item.dataset.pagina === paginaAtual;
        const correspondeTipo = paginaAtual !== "movimentacao" || item.dataset.tipoMovimentacao === tipoMovimentacaoAtual;
        item.classList.toggle("menu-ativo", correspondePagina && correspondeTipo);
    });

    elementos.tituloPagina.textContent = paginaAtual === "movimentacao"
        ? (tipoMovimentacaoAtual === "entrada" ? "Entradas" : "Saídas")
        : titulosPaginas[paginaAtual];

    sincronizarSeletorPortalMobile();
    fecharMenuMobile();
    atualizarPaginaMovimentacao();
    atualizarDestinoDaMovimentacao();
    renderizarTudo();

    // A renderização atualiza elementos de todas as telas. Aplicamos a página
    // ativa novamente ao final para manter a troca de portal sempre explícita.
    elementos.paginas.forEach((item) => {
        item.classList.toggle("pagina-ativa", item.id === `pagina-${paginaAtual}`);
    });

    salvarNavegacaoAtual();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function registrarMovimentacao({ produto, tipo, quantidade, saldoAntes, saldoDepois, observacao = "", filialId = "", pedidoId = "" }) {
    estado.movimentacoes.unshift({
        id: gerarId("mov"),
        produtoId: produto.id,
        produtoNome: produto.nome,
        tipo,
        quantidade,
        unidade: produto.unidade,
        saldoAntes,
        saldoDepois,
        observacao,
        filialId,
        pedidoId,
        criadoEm: new Date().toISOString()
    });
}

function renderizarIndicadores() {
    const ativos = produtosAtivos();
    const totalUnidades = ativos.reduce((total, produto) => total + produto.quantidade, 0);

    elementos.indicadorProdutos.textContent = formatarNumero(ativos.length);
    elementos.indicadorUnidades.textContent = formatarNumero(totalUnidades);
    elementos.indicadorEstoqueBaixo.textContent = formatarNumero(produtosComEstoqueBaixo().length);
    elementos.indicadorPedidos.textContent = formatarNumero(pedidosAbertos().length);
}

function renderizarDashboard() {
    const movimentacoes = estado.movimentacoes.slice(0, 5);
    const alertas = produtosComEstoqueBaixo().slice(0, 5);

    elementos.dashboardMovimentacoes.innerHTML = movimentacoes.length
        ? movimentacoes.map((movimentacao) => {
            const sinal = movimentacao.tipo === "entrada" ? "+" : movimentacao.tipo === "saida" ? "−" : "→";
            const classe = movimentacao.tipo === "entrada"
                ? "valor-positivo"
                : movimentacao.tipo === "saida"
                    ? "valor-negativo"
                    : "valor-transferencia";
            const icone = movimentacao.tipo === "entrada"
                ? "icone-entrada"
                : movimentacao.tipo === "saida"
                    ? "icone-saida"
                    : "icone-filiais";
            const classeIcone = movimentacao.tipo === "entrada"
                ? ""
                : movimentacao.tipo === "saida"
                    ? " resumo-icone-saida"
                    : " resumo-icone-transferencia";

            return `
                <div class="resumo-linha">
                    <div class="resumo-item-principal">
                        <span class="resumo-icone${classeIcone}" aria-hidden="true"><span class="icone ${icone}"></span></span>
                        <div>
                        <strong>${escaparHTML(movimentacao.produtoNome)}</strong>
                        <span>${textoTipoMovimentacao(movimentacao.tipo)} · ${formatarData(movimentacao.criadoEm)}</span>
                        </div>
                    </div>
                    <span class="${classe}">${sinal} ${formatarNumero(movimentacao.quantidade)} ${escaparHTML(movimentacao.unidade)}</span>
                </div>
            `;
        }).join("")
        : "<p class=\"resumo-vazio\">Nenhuma movimentação registrada ainda.</p>";

    elementos.dashboardAlertas.innerHTML = alertas.length
        ? alertas.map((produto) => `
            <div class="resumo-linha">
                <div class="resumo-item-principal">
                    <span class="resumo-icone resumo-icone-alerta" aria-hidden="true"><span class="icone icone-alerta"></span></span>
                    <div>
                    <strong>${escaparHTML(produto.nome)}</strong>
                    <span>Mínimo definido: ${formatarNumero(produto.estoqueMinimo)} ${escaparHTML(produto.unidade)}</span>
                    </div>
                </div>
                <span class="valor-negativo">${formatarNumero(produto.quantidade)} ${escaparHTML(produto.unidade)}</span>
            </div>
        `).join("")
        : "<p class=\"resumo-vazio\">Todos os produtos estão acima do estoque mínimo.</p>";
}

function renderizarFiltroCategorias() {
    const valorAtual = elementos.filtroCategoria.value;
    const categorias = categoriasDisponiveis();

    elementos.filtroCategoria.innerHTML = `
        <option value="">Todas as categorias</option>
        ${categorias.map((categoria) => `<option value="${escaparHTML(categoria)}">${escaparHTML(categoria)}</option>`).join("")}
    `;

    if (categorias.includes(valorAtual)) {
        elementos.filtroCategoria.value = valorAtual;
    }
}

function renderizarProdutos() {
    const busca = textoNormalizado(elementos.buscaProdutos.value);
    const categoria = elementos.filtroCategoria.value;
    const produtos = produtosDoStatusSelecionado()
        .filter((produto) => {
            const texto = textoNormalizado(`${produto.nome} ${produto.categoria} ${produto.codigo}`);
            return (!busca || texto.includes(busca)) && (!categoria || produto.categoria === categoria);
        })
        .sort((a, b) => {
            if (ordenacaoProdutos === "nome") {
                return a.nome.localeCompare(b.nome, "pt-BR");
            }

            const diferencaQuantidade = a.quantidade - b.quantidade;

            if (diferencaQuantidade !== 0) {
                return ordenacaoQuantidade === "crescente" ? diferencaQuantidade : -diferencaQuantidade;
            }

            return a.nome.localeCompare(b.nome, "pt-BR");
        });

    const totalPaginas = Math.max(1, Math.ceil(produtos.length / PRODUTOS_POR_PAGINA));
    paginaProdutosAtual = Math.min(paginaProdutosAtual, totalPaginas);
    const inicio = (paginaProdutosAtual - 1) * PRODUTOS_POR_PAGINA;
    const produtosDaPagina = produtos.slice(inicio, inicio + PRODUTOS_POR_PAGINA);

    elementos.tabelaProdutos.innerHTML = produtos.length
        ? produtosDaPagina.map((produto) => {
            const status = produto.ativo ? situacaoProduto(produto) : { classe: "status-arquivado", texto: "Arquivado" };
            const codigo = produto.codigo ? `<span class="codigo-produto">${escaparHTML(produto.codigo)}</span>` : "";
            const dataArquivamento = produto.arquivadoEm ? `<span class="detalhe-celula">Arquivado em ${formatarData(produto.arquivadoEm)}</span>` : "";
            const acoes = produto.ativo
                ? `
                    <button type="button" class="botao-acao" data-acao="editar-produto" data-produto-id="${produto.id}"><span class="icone icone-editar" aria-hidden="true"></span>Editar</button>
                    <button type="button" class="botao-acao acao-perigo" data-acao="arquivar-produto" data-produto-id="${produto.id}"><span class="icone icone-arquivar" aria-hidden="true"></span>Arquivar</button>
                    <button type="button" class="botao-acao acao-perigo" data-acao="excluir-produto" data-produto-id="${produto.id}"><span class="icone icone-excluir" aria-hidden="true"></span>Excluir</button>
                `
                : `<button type="button" class="botao-acao acao-restaurar" data-acao="restaurar-produto" data-produto-id="${produto.id}">Restaurar</button>`;

            return `
                <tr>
                    <td data-label="Produto"><strong>${escaparHTML(produto.nome)}</strong>${codigo}</td>
                    <td data-label="Categoria">${escaparHTML(produto.categoria)}</td>
                    <td data-label="Quantidade"><strong>${formatarNumero(produto.quantidade)}</strong></td>
                    <td data-label="Estoque minimo">${formatarNumero(produto.estoqueMinimo)}</td>
                    <td data-label="Unidade">${escaparHTML(produto.unidade)}</td>
                    <td data-label="Situacao"><span class="selo-status ${status.classe}">${status.texto}</span>${dataArquivamento}</td>
                    <td data-label="Acoes">
                        <div class="acoes-tabela">${acoes}</div>
                    </td>
                </tr>
            `;
        }).join("")
        : "<tr><td colspan=\"7\" class=\"tabela-vazia\">Nenhum produto encontrado.</td></tr>";

    if (!elementos.paginacaoProdutos) return;
    elementos.paginacaoProdutos.hidden = produtos.length <= PRODUTOS_POR_PAGINA;
    elementos.paginacaoProdutos.innerHTML = produtos.length > PRODUTOS_POR_PAGINA ? `
        <p>Mostrando ${inicio + 1}–${Math.min(inicio + PRODUTOS_POR_PAGINA, produtos.length)} de ${formatarNumero(produtos.length)} produtos</p>
        <div>
            <button type="button" class="botao-secundario" data-pagina-produto="anterior" ${paginaProdutosAtual === 1 ? "disabled" : ""}>Anterior</button>
            <span>Página ${paginaProdutosAtual} de ${totalPaginas}</span>
            <button type="button" class="botao-secundario" data-pagina-produto="proxima" ${paginaProdutosAtual === totalPaginas ? "disabled" : ""}>Próxima</button>
        </div>
    ` : "";
}

function itensEmProducaoAtivos() {
    return (Array.isArray(estado.reservasProducao) ? estado.reservasProducao : [])
        .map((reserva) => {
            const pedido = estado.pedidos.find((registro) => registro.id === reserva.pedidoId);
            const item = pedido && itensDoPedido(pedido).find((registro) => registro.produtoId === reserva.produtoId);
            const produto = buscarProduto(reserva.produtoId);
            const quantidade = numeroInteiroNaoNegativo(reserva.quantidade);
            if (!pedido || !item || !produto || quantidade <= 0 || ["recebido", "recusado"].includes(situacaoDoItemPedido(item, pedido))) return null;
            return {
                pedido,
                item,
                produto,
                filial: buscarFilial(pedido.filialId),
                quantidade,
                previsao: item.producaoPrevista || pedido.producaoPrevista || ""
            };
        })
        .filter(Boolean)
        .sort((a, b) => {
            const previsaoA = a.previsao || "9999-12-31";
            const previsaoB = b.previsao || "9999-12-31";
            return previsaoA.localeCompare(previsaoB)
                || a.produto.nome.localeCompare(b.produto.nome, "pt-BR")
                || Number(a.pedido.numeroPedido || 0) - Number(b.pedido.numeroPedido || 0);
        });
}

function atualizarBotaoProducaoCabecalho() {
    if (!elementos.botaoEmProducaoCabecalho) return;
    const visivel = usuarioEhCD() && !estaNoPortalFilial();
    elementos.botaoEmProducaoCabecalho.hidden = !visivel;
    if (!visivel) return;

    const registros = itensEmProducaoAtivos();
    const totalUnidades = registros.reduce((total, registro) => total + registro.quantidade, 0);
    elementos.quantidadeEmProducaoCabecalho.textContent = formatarNumero(registros.length);
    elementos.botaoEmProducaoCabecalho.classList.toggle("sem-itens", registros.length === 0);
    elementos.botaoEmProducaoCabecalho.setAttribute("aria-label", registros.length
        ? `Ver ${registros.length} item(ns), totalizando ${totalUnidades} unidade(s) em produção`
        : "Ver itens em produção; nenhuma produção programada");
}

function abrirModalItensEmProducao() {
    if (!usuarioEhCD() || estaNoPortalFilial() || !elementos.modalItensEmProducao) return;
    const registros = itensEmProducaoAtivos();
    const totalUnidades = registros.reduce((total, registro) => total + registro.quantidade, 0);
    const totalPedidos = new Set(registros.map((registro) => registro.pedido.id)).size;

    elementos.resumoModalItensEmProducao.textContent = registros.length
        ? `${formatarNumero(totalUnidades)} unidade(s) de ${formatarNumero(registros.length)} item(ns) estão em produção para ${formatarNumero(totalPedidos)} pedido(s).`
        : "Não há itens com produção programada neste momento.";
    elementos.tabelaModalItensEmProducao.innerHTML = registros.length
        ? registros.map((registro) => `
            <tr>
                <td data-label="Produto"><strong>${escaparHTML(registro.produto.nome)}</strong><span class="detalhe-celula">${escaparHTML(registro.produto.codigo || registro.produto.categoria || "")}</span></td>
                <td data-label="Em produção"><strong class="quantidade-producao">${formatarNumero(registro.quantidade)} ${escaparHTML(registro.produto.unidade)}</strong></td>
                <td data-label="Previsão">${registro.previsao ? formatarDataSimples(registro.previsao) : "Não informada"}</td>
                <td data-label="Pedido"><span class="codigo-pedido">${numeroPedidoParaExibicao(registro.pedido)}</span></td>
                <td data-label="Filial">${escaparHTML(registro.filial?.nome || "Filial não identificada")}</td>
                <td data-label="Ação"><button type="button" class="botao-acao" data-acao="consultar-pedido" data-pedido-id="${escaparHTML(registro.pedido.id)}">Ver pedido</button></td>
            </tr>
        `).join("")
        : "<tr><td colspan=\"6\" class=\"tabela-vazia\">Nenhum item em produção.</td></tr>";
    abrirModal(elementos.modalItensEmProducao);
}

function quantidadeDisponivelParaPedido(pedido, produtoId) {
    const produto = buscarProduto(produtoId);
    const estoqueFisico = numeroInteiroNaoNegativo(produto?.quantidade);
    const inicioAtual = pedido?.producaoIniciadaEm ? new Date(pedido.producaoIniciadaEm).getTime() : Number.POSITIVE_INFINITY;
    const reservasAnteriores = (Array.isArray(estado.reservasProducao) ? estado.reservasProducao : [])
        .filter((reserva) => reserva.produtoId === String(produtoId) && reserva.pedidoId !== pedido?.id)
        .filter((reserva) => {
            const outroPedido = estado.pedidos.find((registro) => registro.id === reserva.pedidoId);
            const inicioOutro = outroPedido?.producaoIniciadaEm ? new Date(outroPedido.producaoIniciadaEm).getTime() : Number.POSITIVE_INFINITY;
            return inicioOutro < inicioAtual || (inicioOutro === inicioAtual && String(reserva.pedidoId).localeCompare(String(pedido?.id || "")) < 0);
        })
        .reduce((total, reserva) => total + reserva.quantidade, 0);
    return Math.max(0, estoqueFisico - reservasAnteriores);
}

function renderizarFormularioMovimentacao() {
    const ativos = produtosAtivos().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const valorExistente = produtoSelecionadoMovimentacao || elementos.movimentoProduto.value;
    const filialSelecionada = elementos.movimentoFilial.value;

    elementos.movimentoProduto.innerHTML = ativos.length
        ? `<option value="">Selecione um produto</option>${ativos.map((produto) => `
            <option value="${produto.id}">${escaparHTML(produto.nome)} · ${formatarNumero(produto.quantidade)} ${escaparHTML(produto.unidade)}</option>
        `).join("")}`
        : "<option value=\"\">Nenhum produto cadastrado</option>";

    if (ativos.some((produto) => produto.id === valorExistente)) {
        elementos.movimentoProduto.value = valorExistente;
        produtoSelecionadoMovimentacao = valorExistente;
    } else {
        produtoSelecionadoMovimentacao = "";
    }

    elementos.movimentoProduto.disabled = ativos.length === 0;
    elementos.buscaMovimentoProduto.disabled = ativos.length === 0;
    elementos.botaoConfirmarMovimento.disabled = ativos.length === 0;
    elementos.movimentoFilial.innerHTML = `<option value="">Saída do CD</option>${estado.filiais.map((filial) => `
        <option value="${filial.id}">${escaparHTML(filial.nome)} · ${escaparHTML(filial.cidade)}</option>
    `).join("")}`;
    if (buscarFilial(filialSelecionada)) {
        elementos.movimentoFilial.value = filialSelecionada;
    }
    sincronizarBuscaMovimentoComProduto();
    renderizarSugestoesBuscaMovimento();
    atualizarSelecaoProdutoXml();
    atualizarInformacaoProdutoMovimento();
}

function textoProdutoParaBuscaMovimento(produto) {
    return `${produto.codigo ? `${produto.codigo} · ` : ""}${produto.nome}`;
}

function sincronizarBuscaMovimentoComProduto() {
    const produto = buscarProduto(elementos.movimentoProduto.value);
    elementos.buscaMovimentoProduto.value = produto ? textoProdutoParaBuscaMovimento(produto) : "";
}

function produtosDaBuscaMovimento() {
    const busca = textoNormalizado(elementos.buscaMovimentoProduto.value);
    return produtosAtivos()
        .filter((produto) => !busca || textoNormalizado(`${produto.codigo} ${produto.nome}`).includes(busca))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function renderizarSugestoesBuscaMovimento(mostrar = document.activeElement === elementos.buscaMovimentoProduto) {
    const produtos = produtosDaBuscaMovimento();
    elementos.opcoesBuscaMovimentoProduto.innerHTML = produtos.length
        ? produtos.map((produto) => `<button type="button" role="option" class="opcao-busca-pedido" data-produto-id="${produto.id}" aria-selected="${produto.id === elementos.movimentoProduto.value}"><span>${escaparHTML(produto.codigo || "Sem código")}</span><strong>${escaparHTML(produto.nome)}</strong><small>${escaparHTML(produto.categoria)} · ${formatarNumero(produto.quantidade)} ${escaparHTML(produto.unidade)}</small></button>`).join("")
        : `<p class="opcoes-busca-vazia">Nenhum produto encontrado.</p>`;
    elementos.opcoesBuscaMovimentoProduto.hidden = !mostrar;
    elementos.buscaMovimentoProduto.setAttribute("aria-expanded", String(mostrar));
}

function selecionarProdutoDaBuscaMovimento(produtoId) {
    const produto = buscarProduto(produtoId);
    if (!produto) return;
    produtoSelecionadoMovimentacao = produto.id;
    elementos.movimentoProduto.value = produto.id;
    sincronizarBuscaMovimentoComProduto();
    elementos.opcoesBuscaMovimentoProduto.hidden = true;
    elementos.buscaMovimentoProduto.setAttribute("aria-expanded", "false");
    atualizarInformacaoProdutoMovimento();
    atualizarBotaoCadastrarProdutoXml();
}

function selecionarProdutoMovimentoPorBusca() {
    const busca = elementos.buscaMovimentoProduto.value.trim().toLocaleLowerCase("pt-BR");
    if (!busca) return null;
    const produto = produtosAtivos().find((item) => {
        const opcao = textoProdutoParaBuscaMovimento(item).toLocaleLowerCase("pt-BR");
        return opcao === busca || item.codigo.toLocaleLowerCase("pt-BR") === busca || item.nome.toLocaleLowerCase("pt-BR") === busca;
    });
    if (produto) selecionarProdutoDaBuscaMovimento(produto.id);
    return produto;
}

function atualizarInformacaoProdutoMovimento() {
    const produto = buscarProduto(elementos.movimentoProduto.value);

    if (!produto) {
        elementos.infoProdutoMovimento.textContent = produtosAtivos().length
            ? "Selecione um produto para ver o estoque atual."
            : "Cadastre um produto antes de registrar uma movimentação.";
        return;
    }

    elementos.infoProdutoMovimento.innerHTML = `Estoque atual no CD: <strong>${formatarNumero(produto.quantidade)} ${escaparHTML(produto.unidade)}</strong>. Estoque mínimo: <strong>${formatarNumero(produto.estoqueMinimo)} ${escaparHTML(produto.unidade)}</strong>.`;
}

function renderizarFormularioAcertoEstoque() {
    const ativos = produtosAtivos().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const valorAtual = elementos.acertoProduto.value;

    elementos.acertoProduto.innerHTML = ativos.length
        ? `<option value="">Selecione um produto</option>${ativos.map((produto) => `
            <option value="${produto.id}">${escaparHTML(produto.nome)} · ${formatarNumero(produto.quantidade)} ${escaparHTML(produto.unidade)}</option>
        `).join("")}`
        : "<option value=\"\">Nenhum produto cadastrado</option>";

    if (ativos.some((produto) => produto.id === valorAtual)) {
        elementos.acertoProduto.value = valorAtual;
    }

    elementos.acertoProduto.disabled = ativos.length === 0;
    elementos.buscaAcertoProduto.disabled = ativos.length === 0;
    elementos.botaoConfirmarAcerto.disabled = ativos.length === 0;
    sincronizarBuscaAcertoComProduto();
    renderizarSugestoesBuscaAcerto();
    atualizarInformacaoProdutoAcerto();
}

function sincronizarBuscaAcertoComProduto() {
    const produto = buscarProduto(elementos.acertoProduto.value);
    elementos.buscaAcertoProduto.value = produto ? textoProdutoParaBuscaMovimento(produto) : "";
}

function produtosDaBuscaAcerto() {
    const busca = textoNormalizado(elementos.buscaAcertoProduto.value);
    return produtosAtivos()
        .filter((produto) => !busca || textoNormalizado(`${produto.codigo} ${produto.nome}`).includes(busca))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function renderizarSugestoesBuscaAcerto(mostrar = document.activeElement === elementos.buscaAcertoProduto) {
    const produtos = produtosDaBuscaAcerto();
    elementos.opcoesBuscaAcertoProduto.innerHTML = produtos.length
        ? produtos.map((produto) => `<button type="button" role="option" class="opcao-busca-pedido" data-produto-id="${produto.id}" aria-selected="${produto.id === elementos.acertoProduto.value}"><span>${escaparHTML(produto.codigo || "Sem código")}</span><strong>${escaparHTML(produto.nome)}</strong><small>${escaparHTML(produto.categoria)} · ${formatarNumero(produto.quantidade)} ${escaparHTML(produto.unidade)}</small></button>`).join("")
        : `<p class="opcoes-busca-vazia">Nenhum produto encontrado.</p>`;
    elementos.opcoesBuscaAcertoProduto.hidden = !mostrar;
    elementos.buscaAcertoProduto.setAttribute("aria-expanded", String(mostrar));
}

function selecionarProdutoDaBuscaAcerto(produtoId) {
    const produto = buscarProduto(produtoId);
    if (!produto) return;
    elementos.acertoProduto.value = produto.id;
    sincronizarBuscaAcertoComProduto();
    elementos.opcoesBuscaAcertoProduto.hidden = true;
    elementos.buscaAcertoProduto.setAttribute("aria-expanded", "false");
    atualizarInformacaoProdutoAcerto();
}

function selecionarProdutoAcertoPorBusca() {
    const busca = elementos.buscaAcertoProduto.value.trim().toLocaleLowerCase("pt-BR");
    if (!busca) {
        elementos.acertoProduto.value = "";
        atualizarInformacaoProdutoAcerto();
        return null;
    }
    const produto = produtosAtivos().find((item) => {
        const opcao = textoProdutoParaBuscaMovimento(item).toLocaleLowerCase("pt-BR");
        return opcao === busca || String(item.codigo || "").toLocaleLowerCase("pt-BR") === busca || item.nome.toLocaleLowerCase("pt-BR") === busca;
    });
    if (produto) {
        selecionarProdutoDaBuscaAcerto(produto.id);
    } else {
        elementos.acertoProduto.value = "";
        atualizarInformacaoProdutoAcerto();
    }
    return produto;
}

function atualizarInformacaoProdutoAcerto() {
    const produto = buscarProduto(elementos.acertoProduto.value);
    if (!produto) {
        elementos.infoProdutoAcerto.textContent = produtosAtivos().length
            ? "Selecione um produto para conferir o saldo atual."
            : "Cadastre um produto antes de realizar um ajuste.";
        return;
    }

    elementos.infoProdutoAcerto.innerHTML = `Saldo registrado no CD: <strong>${formatarNumero(produto.quantidade)} ${escaparHTML(produto.unidade)}</strong>. Estoque mínimo: <strong>${formatarNumero(produto.estoqueMinimo)} ${escaparHTML(produto.unidade)}</strong>.`;
}

function renderizarEstoqueBaixo() {
    const produtos = produtosComEstoqueBaixo().sort((a, b) => a.quantidade - b.quantidade || a.nome.localeCompare(b.nome, "pt-BR"));

    elementos.tabelaEstoqueBaixo.innerHTML = produtos.length
        ? produtos.map((produto) => `
            <tr>
                <td data-label="Produto"><strong>${escaparHTML(produto.nome)}</strong></td>
                <td data-label="Categoria">${escaparHTML(produto.categoria)}</td>
                <td data-label="Quantidade atual"><strong>${formatarNumero(produto.quantidade)}</strong></td>
                <td data-label="Estoque minimo">${formatarNumero(produto.estoqueMinimo)}</td>
                <td data-label="Unidade">${escaparHTML(produto.unidade)}</td>
                <td data-label="Acao rapida"><button type="button" class="botao-acao acao-entrada" data-acao="movimentar" data-produto-id="${produto.id}" data-tipo="entrada">Registrar entrada</button></td>
            </tr>
        `).join("")
        : "<tr><td colspan=\"6\" class=\"tabela-vazia\">Nenhum produto está com estoque baixo.</td></tr>";
}

function resumoQuantidadesItemPedido(pedido, item, opcoes = {}) {
    const { mostrarEstoqueFilial = false, mostrarDisponivelCD = true } = opcoes;
    const atendimento = window.PedidosUtils.calcularAtendimentoPedido(pedido, estado.remessas).itens
        .find((registro) => registro.produtoId === item.produtoId);
    const situacao = situacaoDoItemPedido(item, pedido);
    const enviado = atendimento?.enviado || 0;
    const pendente = atendimento?.pendente || 0;
    const disponivel = situacao === "recusado" ? 0 : quantidadeDisponivelParaPedido(pedido, item.produtoId);
    const quantidadeProducao = situacao === "recusado" ? 0 : Math.max(pendente - disponivel, 0);
    const producaoProgramada = Boolean(item.producaoPrevista) || situacao === "em_producao";
    const unidade = escaparHTML(item.unidade);
    const quantidade = (valor) => `${formatarNumero(valor)} ${unidade}`;

    return `<div class="resumo-quantidades-item">
        <span class="quantidade-resumo solicitado"><small>Solicitado</small><strong>${quantidade(item.quantidadeSolicitada)}</strong></span>
        ${mostrarEstoqueFilial ? `<span class="quantidade-resumo estoque-filial"><small>Estoque filial</small><strong>${quantidade(item.estoqueInformado)}</strong></span>` : ""}
        ${mostrarDisponivelCD ? `<span class="quantidade-resumo disponivel"><small>Disponível CD</small><strong>${quantidade(disponivel)}</strong></span>` : ""}
        <span class="quantidade-resumo enviado"><small>Enviado</small><strong>${quantidade(enviado)}</strong></span>
        <span class="quantidade-resumo pendente"><small>Falta enviar</small><strong>${quantidade(pendente)}</strong></span>
        ${(atendimento?.encerrado || 0) > 0 ? `<span class="quantidade-resumo pendente"><small>Saldo encerrado</small><strong>${quantidade(atendimento.encerrado)}</strong></span>` : ""}
        ${(atendimento?.encerrado || 0) > 0 && item.motivoEncerramento ? `<span class="quantidade-resumo observacao-matriz"><small>Motivo do saldo encerrado</small><strong>${escaparHTML(item.motivoEncerramento)}</strong></span>` : ""}
        ${quantidadeProducao > 0 ? `<span class="quantidade-resumo producao ${producaoProgramada ? "producao-programada" : ""}"><small>${producaoProgramada ? "Em produção" : "A produzir"}</small><strong>${quantidade(quantidadeProducao)}</strong>${item.producaoPrevista ? `<em>Prev.: ${formatarDataSimples(item.producaoPrevista)}</em>` : ""}</span>` : ""}
    </div>`;
}

function statusExibicaoItemPedido(pedido, item) {
    const atendimento = window.PedidosUtils.calcularAtendimentoPedido(pedido, estado.remessas).itens
        .find((registro) => registro.produtoId === item.produtoId);
    const situacao = situacaoDoItemPedido(item, pedido);
    const enviado = atendimento?.enviado || 0;
    const pendente = atendimento?.pendente || 0;

    if (situacao === "recebido") {
        return { texto: "Recebido", classe: classeSituacaoPedido(situacao), envioParcial: false, foiEnviado: true };
    }
    if (enviado > 0 && pendente > 0) {
        return { texto: "Envio parcial", classe: "tipo-aprovado", envioParcial: true, foiEnviado: true };
    }
    if (enviado > 0) {
        return { texto: "Enviado", classe: "tipo-aprovado", envioParcial: false, foiEnviado: true };
    }
    return { texto: textoSituacaoPedido(situacao), classe: classeSituacaoPedido(situacao), envioParcial: false, foiEnviado: false };
}

function renderizarPedidos() {
    const statusSelecionado = elementos.filtroStatusPedidos.value;
    const statusItemSelecionado = elementos.filtroStatusItensPedidos.value;
    const pedidos = [...estado.pedidos]
        .filter((pedido) => pedidoCorrespondeStatus(pedido, statusSelecionado))
        .filter((pedido) => !statusItemSelecionado
            || itensDoPedido(pedido).some((item) => itemCorrespondeStatus(pedido, item, statusItemSelecionado)))
        .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

    elementos.tabelaPedidos.innerHTML = pedidos.length
        ? pedidos.map((pedido) => {
            const filial = buscarFilial(pedido.filialId);
            const itens = itensDoPedido(pedido);
            const itensVisiveis = statusItemSelecionado
                ? itens.filter((item) => itemCorrespondeStatus(pedido, item, statusItemSelecionado))
                : itens;
            const situacao = situacaoDoPedido(pedido);
            const atendimento = window.PedidosUtils.calcularAtendimentoPedido(pedido, estado.remessas);
            const pendenteParaEnvio = atendimento.itens
                .filter((item) => situacaoDoItemPedido(item, pedido) !== "recusado")
                .reduce((total, item) => total + item.pendente, 0);
            const envioParcial = atendimento.itens.some((item) => situacaoDoItemPedido(item, pedido) !== "recusado" && item.enviado > 0 && item.pendente > 0);
            const producao = pedido.producaoPrevista ? `Prazo de produção: ${formatarDataSimples(pedido.producaoPrevista)}` : "";
            const entrega = pedido.entregaPrevista ? `Entrega prevista: ${formatarDataSimples(pedido.entregaPrevista)}` : "";
            const listaItens = renderizarItensAgrupadosPorCategoria(itensVisiveis, (item) => {
                const statusItem = statusExibicaoItemPedido(pedido, item);
                return `
                <details class="item-pedido-resumo item-pedido-dobravel">
                    <summary><strong>${escaparHTML(item.produtoNome)}</strong><span class="selo-tipo selo-status-item ${statusItem.classe}">${statusItem.texto}</span></summary>
                    <div class="conteudo-item-dobravel">${resumoQuantidadesItemPedido(pedido, item, { mostrarEstoqueFilial: true })}</div>
                </details>
            `;
            }, "grupo-itens-categoria-resumo");
            const haItensPendentes = itens.some((item) => (item.situacao || pedido.situacao) === "pendente");
            const itensPendentesDeEnvio = atendimento.itens.filter((item) => item.pendente > 0 && situacaoDoItemPedido(item, pedido) !== "recusado");
            const existeSaldoParaExpedir = itensPendentesDeEnvio.some((item) => quantidadeDisponivelParaPedido(pedido, item.produtoId) > 0);
            const existeItemSemSaldo = itensPendentesDeEnvio.some((item) => quantidadeDisponivelParaPedido(pedido, item.produtoId) === 0);
            const remessasRecebidas = atendimento.remessas.filter((remessa) => remessa.situacao === "recebida").length;
            const remessasEmTransito = atendimento.remessas.filter((remessa) => remessa.situacao === "em_transito").length;
            const acaoPrincipal = haItensPendentes
                ? `<button type="button" class="botao-acao acao-aprovar" data-acao="analisar-pedido" data-pedido-id="${pedido.id}">Analisar itens</button>`
                : atendimento.pendente > 0
                    ? existeSaldoParaExpedir
                        ? `<button type="button" class="botao-acao acao-aprovar" data-acao="criar-remessa" data-pedido-id="${pedido.id}">${existeItemSemSaldo ? "Criar remessa parcial" : "Criar remessa"}</button>`
                        : ""
                    : "";
            const acoes = `<div class="acoes-tabela acoes-pedido-cd">${acaoPrincipal}<button type="button" class="botao-acao" data-acao="consultar-pedido" data-pedido-id="${pedido.id}">Ver detalhes</button></div>`;

            return `
                <tr>
                    <td data-label="Data">${formatarData(pedido.criadoEm)}</td>
                    <td data-label="N° do Pedido"><span class="codigo-pedido">${numeroPedidoParaExibicao(pedido)}</span></td>
                    <td data-label="Filial"><strong>${escaparHTML(filial?.nome || "Filial não identificada")}</strong></td>
                    <td data-label="Itens solicitados">${listaItens}${pedido.observacao ? `<span class="detalhe-celula">${escaparHTML(pedido.observacao)}</span>` : ""}</td>
                    <td data-label="Situacao"><span class="selo-tipo ${classeSituacaoPedido(situacao)}">${textoSituacaoPedido(situacao)}</span><span class="detalhe-celula ${envioParcial ? "detalhe-envio-parcial" : ""}">${envioParcial ? "Envio parcial" : "Enviado"}: ${formatarNumero(atendimento.enviado)} · Faltam: ${formatarNumero(pendenteParaEnvio)}</span>${remessasRecebidas || remessasEmTransito ? `<span class="detalhe-celula">Remessas: ${remessasRecebidas} recebida(s) · ${remessasEmTransito} em trânsito</span>` : ""}${producao ? `<span class="detalhe-celula">${escaparHTML(producao)}</span>` : ""}${entrega ? `<span class="detalhe-celula">${escaparHTML(entrega)}</span>` : ""}</td>
                    <td data-label="Acoes">${acoes}</td>
                </tr>
            `;
        }).join("")
        : "<tr><td colspan=\"6\" class=\"tabela-vazia\">Nenhum pedido criado ainda.</td></tr>";
}

function abrirModalAnalisarPedido(pedidoId) {
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);
    const filial = pedido && buscarFilial(pedido.filialId);
    if (!pedido || !usuarioEhCD()) return;
    pedidoEmAnaliseId = pedidoId;

    itensDoPedido(pedido).forEach((item) => { item.situacao ||= pedido.situacao || "pendente"; });

    elementos.tituloModalAnalisarPedido.textContent = `Pedido da filial ${filial?.nome || ""}`.trim();
    elementos.listaAnalisarPedido.innerHTML = renderizarItensAgrupadosPorCategoria(itensDoPedido(pedido), (item) => {
        const situacao = situacaoDoItemPedido(item, pedido);
        const acoes = situacao === "pendente"
            ? `<div class="acoes-tabela"><button type="button" class="botao-acao acao-aprovar" data-acao="aprovar-item-pedido" data-pedido-id="${pedido.id}" data-produto-id="${item.produtoId}"><span class="icone icone-check" aria-hidden="true"></span>Aprovar</button><button type="button" class="botao-acao acao-perigo" data-acao="recusar-item-pedido" data-pedido-id="${pedido.id}" data-produto-id="${item.produtoId}"><span class="icone icone-recusar" aria-hidden="true"></span>Recusar</button></div>`
            : "";
        return `<article class="item-analise-pedido"><div class="item-analise-informacoes"><strong>${escaparHTML(item.produtoNome)}</strong>${resumoQuantidadesItemPedido(pedido, item, { mostrarEstoqueFilial: true })}${item.observacaoMatriz ? `<span>${escaparHTML(item.observacaoMatriz)}</span>` : ""}</div><div class="item-analise-acoes"><span class="selo-tipo ${classeSituacaoPedido(situacao)}">${textoSituacaoPedido(situacao)}</span>${acoes}</div></article>`;
    }, "grupo-itens-categoria-analise");
    const todosItensAnalisados = itensDoPedido(pedido).every((item) => situacaoDoItemPedido(item, pedido) !== "pendente");
    elementos.botaoEnviarPedidoAnalisado.disabled = !todosItensAnalisados;
    elementos.botaoEnviarPedidoAnalisado.hidden = !todosItensAnalisados;
    elementos.botaoEnviarPedidoAnalisado.innerHTML = '<span class="icone icone-saida" aria-hidden="true"></span>Criar remessa';
    elementos.botaoEnviarPedidoAnalisado.dataset.pedidoId = pedido.id;
    abrirModal(elementos.modalAnalisarPedido);
}

function categoriasDisponiveis() {
    return [...categoriasProdutos].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function renderizarOpcoesCategoriaProduto(valorSelecionado = elementos.produtoCategoria.value) {
    const categorias = categoriasDisponiveis();
    elementos.produtoCategoria.innerHTML = `
        <option value="">Selecione uma categoria</option>
        ${categorias.map((categoria) => `<option value="${escaparHTML(categoria)}">${escaparHTML(categoria)}</option>`).join("")}
    `;
    if (categorias.includes(valorSelecionado)) elementos.produtoCategoria.value = valorSelecionado;
}

function renderizarCategoriasConfiguracoes() {
    if (!elementos.tabelaCategorias) return;
    const categorias = categoriasDisponiveis();
    elementos.tabelaCategorias.innerHTML = categorias.map((categoria) => {
        const quantidadeProdutos = estado.produtos.filter((produto) => produto.categoria === categoria).length;
        return `<tr>
            <td data-label="Categoria"><strong>${escaparHTML(categoria)}</strong></td>
            <td data-label="Produtos">${quantidadeProdutos}</td>
            <td data-label="Acoes"><div class="acoes-tabela">
                <button type="button" class="botao-acao" data-acao="editar-categoria" data-categoria="${escaparHTML(categoria)}"><span class="icone icone-editar" aria-hidden="true"></span>Editar</button>
                <button type="button" class="botao-acao acao-perigo" data-acao="excluir-categoria" data-categoria="${escaparHTML(categoria)}"><span class="icone icone-excluir" aria-hidden="true"></span>Excluir</button>
            </div></td>
        </tr>`;
    }).join("") || '<tr><td colspan="3" class="tabela-vazia">Nenhuma categoria cadastrada.</td></tr>';
}

async function criarCategoria(nome) {
    const categoria = nome.trim();
    if (!categoria) {
        elementos.mensagemCategoria.textContent = "Informe o nome da categoria.";
        return;
    }
    if (categoriasDisponiveis().some((item) => item.localeCompare(categoria, "pt-BR", { sensitivity: "accent" }) === 0)) {
        elementos.mensagemCategoria.textContent = "Já existe uma categoria com esse nome.";
        return;
    }
    const { error } = await clienteSupabase.from("categorias_produtos").insert({ nome: categoria });
    if (error) {
        console.error(error);
        elementos.mensagemCategoria.textContent = error.code === "23505" ? "Já existe uma categoria com esse nome." : "Não foi possível criar a categoria.";
        return;
    }
    elementos.formularioCategoria.reset();
    elementos.mensagemCategoria.textContent = "";
    await carregarDadosSupabase();
    fecharModal(elementos.modalCategoria);
    notificar("Categoria criada.");
}

function abrirModalCategoria(nomeAtual = "") {
    categoriaEmEdicao = nomeAtual;
    elementos.formularioCategoria.reset();
    elementos.mensagemCategoria.textContent = "";
    elementos.tituloModalCategoria.textContent = nomeAtual ? "Editar categoria" : "Cadastrar categoria";
    elementos.botaoSalvarCategoria.textContent = nomeAtual ? "Salvar alterações" : "Cadastrar categoria";
    elementos.categoriaNome.value = nomeAtual;
    abrirModal(elementos.modalCategoria);
    elementos.categoriaNome.focus();
}

async function editarCategoria(nomeAtual) {
    abrirModalCategoria(nomeAtual);
}

async function salvarEdicaoCategoria(nomeAtual, nome) {
    const novoNome = nome.trim();
    if (!novoNome) { notificar("Informe um nome válido para a categoria.", "erro"); return; }
    if (novoNome === nomeAtual) return;
    if (categoriasDisponiveis().some((categoria) => categoria !== nomeAtual && categoria.localeCompare(novoNome, "pt-BR", { sensitivity: "accent" }) === 0)) {
        notificar("Já existe uma categoria com esse nome.", "erro");
        return;
    }
    const { error } = await clienteSupabase.from("categorias_produtos").update({ nome: novoNome }).eq("nome", nomeAtual);
    if (error) { console.error(error); elementos.mensagemCategoria.textContent = "Não foi possível editar a categoria."; return; }
    await carregarDadosSupabase();
    fecharModal(elementos.modalCategoria);
    notificar("Categoria atualizada.");
}

async function excluirCategoria(nome) {
    const quantidadeProdutos = estado.produtos.filter((produto) => produto.categoria === nome).length;
    if (quantidadeProdutos) {
        notificar(`A categoria "${nome}" possui ${quantidadeProdutos} produto(s). Reclassifique-os antes de excluí-la.`, "erro");
        return;
    }
    if (!window.confirm(`Excluir a categoria "${nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await clienteSupabase.from("categorias_produtos").delete().eq("nome", nome);
    if (error) { console.error(error); notificar("Não foi possível excluir a categoria.", "erro"); return; }
    await carregarDadosSupabase();
    notificar("Categoria excluída.");
}

function unidadesDisponiveis() {
    return [...unidadesMedida].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function renderizarOpcoesUnidadeProduto(valorSelecionado = elementos.produtoUnidade.value) {
    const unidades = unidadesDisponiveis();
    elementos.produtoUnidade.innerHTML = `
        <option value="">Selecione uma unidade</option>
        ${unidades.map((unidade) => `<option value="${escaparHTML(unidade)}">${escaparHTML(unidade)}</option>`).join("")}
    `;
    if (unidades.includes(valorSelecionado)) elementos.produtoUnidade.value = valorSelecionado;
}

function renderizarUnidadesConfiguracoes() {
    if (!elementos.tabelaUnidades) return;
    const unidades = unidadesDisponiveis();
    elementos.tabelaUnidades.innerHTML = unidades.map((unidade) => {
        const quantidadeProdutos = estado.produtos.filter((produto) => produto.unidade === unidade).length;
        return `<tr>
            <td data-label="Unidade"><strong>${escaparHTML(unidade)}</strong></td>
            <td data-label="Produtos">${quantidadeProdutos}</td>
            <td data-label="Acoes"><div class="acoes-tabela">
                <button type="button" class="botao-acao" data-acao="editar-unidade" data-unidade="${escaparHTML(unidade)}"><span class="icone icone-editar" aria-hidden="true"></span>Editar</button>
                <button type="button" class="botao-acao acao-perigo" data-acao="excluir-unidade" data-unidade="${escaparHTML(unidade)}"><span class="icone icone-excluir" aria-hidden="true"></span>Excluir</button>
            </div></td>
        </tr>`;
    }).join("") || '<tr><td colspan="3" class="tabela-vazia">Nenhuma unidade cadastrada.</td></tr>';
}

async function criarUnidade(nome) {
    const unidade = nome.trim();
    if (!unidade) { elementos.mensagemUnidade.textContent = "Informe o nome da unidade."; return; }
    if (unidadesDisponiveis().some((item) => item.localeCompare(unidade, "pt-BR", { sensitivity: "accent" }) === 0)) {
        elementos.mensagemUnidade.textContent = "Já existe uma unidade com esse nome.";
        return;
    }
    const { error } = await clienteSupabase.from("unidades_medida").insert({ nome: unidade });
    if (error) {
        console.error(error);
        elementos.mensagemUnidade.textContent = error.code === "23505" ? "Já existe uma unidade com esse nome." : "Não foi possível criar a unidade.";
        return;
    }
    elementos.formularioUnidade.reset();
    elementos.mensagemUnidade.textContent = "";
    await carregarDadosSupabase();
    fecharModal(elementos.modalUnidade);
    notificar("Unidade criada.");
}

function abrirModalUnidade(nomeAtual = "") {
    unidadeEmEdicao = nomeAtual;
    elementos.formularioUnidade.reset();
    elementos.mensagemUnidade.textContent = "";
    elementos.tituloModalUnidade.textContent = nomeAtual ? "Editar unidade de medida" : "Cadastrar unidade de medida";
    elementos.botaoSalvarUnidade.textContent = nomeAtual ? "Salvar alterações" : "Cadastrar unidade";
    elementos.unidadeNome.value = nomeAtual;
    abrirModal(elementos.modalUnidade);
    elementos.unidadeNome.focus();
}

async function editarUnidade(nomeAtual) {
    abrirModalUnidade(nomeAtual);
}

async function salvarEdicaoUnidade(nomeAtual, nome) {
    const novoNome = nome.trim();
    if (!novoNome) { notificar("Informe um nome válido para a unidade.", "erro"); return; }
    if (novoNome === nomeAtual) return;
    if (unidadesDisponiveis().some((unidade) => unidade !== nomeAtual && unidade.localeCompare(novoNome, "pt-BR", { sensitivity: "accent" }) === 0)) {
        notificar("Já existe uma unidade com esse nome.", "erro");
        return;
    }
    const { error } = await clienteSupabase.from("unidades_medida").update({ nome: novoNome }).eq("nome", nomeAtual);
    if (error) { console.error(error); elementos.mensagemUnidade.textContent = "Não foi possível editar a unidade."; return; }
    await carregarDadosSupabase();
    fecharModal(elementos.modalUnidade);
    notificar("Unidade atualizada.");
}

async function excluirUnidade(nome) {
    const quantidadeProdutos = estado.produtos.filter((produto) => produto.unidade === nome).length;
    if (quantidadeProdutos) {
        notificar(`A unidade "${nome}" possui ${quantidadeProdutos} produto(s). Altere-os antes de excluí-la.`, "erro");
        return;
    }
    if (!window.confirm(`Excluir a unidade "${nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await clienteSupabase.from("unidades_medida").delete().eq("nome", nome);
    if (error) { console.error(error); notificar("Não foi possível excluir a unidade.", "erro"); return; }
    await carregarDadosSupabase();
    notificar("Unidade excluída.");
}

function loginParaExibicao(email) {
    const sufixoInterno = "@usuarios.therapeutica.local";
    return String(email || "").endsWith(sufixoInterno)
        ? String(email).slice(0, -sufixoInterno.length)
        : String(email || "");
}

function renderizarNotificacaoPedidos() {
    const pendentes = estado.pedidos.filter((pedido) => itensDoPedido(pedido).some((item) => (item.situacao || pedido.situacao) === "pendente")).length;
    elementos.notificacaoPedidos.hidden = pendentes === 0;
    elementos.notificacaoPedidos.textContent = pendentes > 99 ? "99+" : String(pendentes);
    elementos.notificacaoPedidos.setAttribute("aria-label", `${pendentes} ${pendentes === 1 ? "pedido pendente" : "pedidos pendentes"}`);
}

function renderizarFiliais() {
    elementos.listaFiliais.innerHTML = estado.filiais.map((filial) => {
        const pedidos = estado.pedidos.filter((pedido) => pedido.filialId === filial.id);
        const abertos = pedidos.filter((pedido) => ["pendente", "aprovado", "em_producao", "agendado_envio", "em_transito"].includes(pedido.situacao)).length;
        const produtosControlados = Object.keys(estado.estoqueFiliais).filter((chave) => chave.startsWith(`${filial.id}:`)).length;

        return `
            <article class="filial-card">
                <p class="subtitulo-secao">Filial Therapeutica</p>
                <h3>${escaparHTML(filial.nome)}</h3>
                <p>${escaparHTML(filial.cidade)}</p>
                <div class="metricas-filial">
                    <div class="metrica-filial"><strong>${formatarNumero(abertos)}</strong><span>pedidos abertos</span></div>
                    <div class="metrica-filial"><strong>${formatarNumero(produtosControlados)}</strong><span>itens informados</span></div>
                </div>
                <div class="acoes-tabela">
                    <button type="button" class="botao-secundario" data-acao="abrir-portal-filial" data-filial-id="${filial.id}">Abrir portal</button>
                    <button type="button" class="botao-secundario" data-acao="consultar-estoque-filial" data-filial-id="${filial.id}">Consultar estoque</button>
                </div>
            </article>
        `;
    }).join("");
}

function referenciaRemessaParaHistorico(movimentacao) {
    if (!movimentacao.remessaId) return "";

    const remessa = estado.remessas.find((registro) => registro.id === movimentacao.remessaId);
    const pedido = estado.pedidos.find((registro) => registro.id === (remessa?.pedidoId || movimentacao.pedidoId));
    if (!remessa || !pedido) return "Remessa vinculada";

    const remessasDoPedido = estado.remessas
        .filter((registro) => registro.pedidoId === pedido.id)
        .sort((a, b) => {
            const diferenca = new Date(a.enviadaEm || a.criadaEm || 0) - new Date(b.enviadaEm || b.criadaEm || 0);
            return diferenca || String(a.id).localeCompare(String(b.id));
        });
    const numeroRemessa = remessasDoPedido.findIndex((registro) => registro.id === remessa.id) + 1;
    return `Pedido ${escaparHTML(numeroPedidoParaExibicao(pedido))} · Remessa ${numeroRemessa}`;
}

function renderizarHistorico() {
    const busca = elementos.buscaHistorico.value.trim().toLocaleLowerCase("pt-BR");
    const tipo = elementos.filtroHistorico.value;
    const movimentacoes = estado.movimentacoes.filter((movimentacao) => {
        const texto = `${movimentacao.produtoNome} ${movimentacao.observacao}`.toLocaleLowerCase("pt-BR");
        return (!busca || texto.includes(busca)) && (!tipo || movimentacao.tipo === tipo);
    });

    elementos.tabelaHistorico.innerHTML = movimentacoes.length
        ? movimentacoes.map((movimentacao) => {
            const filial = movimentacao.filialId ? buscarFilial(movimentacao.filialId) : null;
            const saldo = movimentacao.saldoAntes !== null && movimentacao.saldoDepois !== null
                ? `Saldo: ${formatarNumero(movimentacao.saldoAntes)} → ${formatarNumero(movimentacao.saldoDepois)}`
                : "Saldo anterior não registrado";
            const destino = filial ? `Destino: ${filial.nome}` : movimentacao.observacao || "Sem observação";
            const referenciaRemessa = referenciaRemessaParaHistorico(movimentacao);

            return `
                <tr>
                    <td data-label="Data">${formatarData(movimentacao.criadoEm)}</td>
                    <td data-label="Tipo"><span class="selo-tipo ${classeTipoMovimentacao(movimentacao.tipo)}">${textoTipoMovimentacao(movimentacao.tipo)}</span></td>
                    <td data-label="Produto"><strong>${escaparHTML(movimentacao.produtoNome)}</strong><span class="detalhe-celula">${saldo}</span></td>
                    <td data-label="Quantidade">${formatarNumero(movimentacao.quantidade)} ${escaparHTML(movimentacao.unidade)}</td>
                    <td data-label="Destino ou observacao">${escaparHTML(destino)}${referenciaRemessa ? `<span class="detalhe-celula">${referenciaRemessa}</span>` : movimentacao.observacao && filial ? `<span class="detalhe-celula">${escaparHTML(movimentacao.observacao)}</span>` : ""}</td>
                </tr>
            `;
        }).join("")
        : "<tr><td colspan=\"5\" class=\"tabela-vazia\">Nenhuma movimentação encontrada.</td></tr>";
}

function formatarDuracao(milisegundos) {
    if (!Number.isFinite(milisegundos) || milisegundos < 0) return "—";
    const minutos = Math.floor(milisegundos / 60000);
    if (minutos < 60) return `${minutos}min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `${horas}h${minutos % 60 ? ` ${minutos % 60}min` : ""}`;
    const dias = Math.floor(horas / 24);
    return `${dias}d${horas % 24 ? ` ${horas % 24}h` : ""}`;
}

function mediaDuracao(valores) {
    if (!valores.length) return "—";
    return formatarDuracao(valores.reduce((total, valor) => total + valor, 0) / valores.length);
}

function percentual(numerador, denominador) {
    if (!denominador) return "—";
    return `${((numerador / denominador) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function comparacaoPercentual(atual, anterior) {
    if (!anterior) return "Sem dados no período anterior";
    const variacao = ((atual - anterior) / anterior) * 100;
    return `${variacao >= 0 ? "+" : ""}${variacao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs. período anterior`;
}

function dataLocalISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function inicioDoDia(data) {
    const resultado = new Date(data);
    resultado.setHours(0, 0, 0, 0);
    return resultado;
}

function fimDoDia(data) {
    const resultado = new Date(data);
    resultado.setHours(23, 59, 59, 999);
    return resultado;
}

function intervaloRelatorio(filtros = filtrosRelatorio, referencia = new Date()) {
    const fim = fimDoDia(referencia);
    const inicio = inicioDoDia(referencia);
    const hoje = inicioDoDia(referencia);
    if (filtros.periodo === "todos") return { inicio: null, fim: null, anteriorInicio: null, anteriorFim: null };
    if (filtros.periodo === "hoje") {
        return { inicio: hoje, fim, anteriorInicio: new Date(hoje.getTime() - 86400000), anteriorFim: new Date(hoje.getTime() - 1) };
    }
    if (filtros.periodo === "mes-atual" || filtros.periodo === "mes-anterior") {
        const deslocamento = filtros.periodo === "mes-anterior" ? -1 : 0;
        inicio.setMonth(inicio.getMonth() + deslocamento, 1);
        const periodoInicio = inicioDoDia(inicio);
        const periodoFim = deslocamento ? fimDoDia(new Date(referencia.getFullYear(), referencia.getMonth(), 0)) : fim;
        const anteriorFim = new Date(periodoInicio.getTime() - 1);
        const anteriorInicio = inicioDoDia(new Date(anteriorFim.getFullYear(), anteriorFim.getMonth(), 1));
        return { inicio: periodoInicio, fim: periodoFim, anteriorInicio, anteriorFim };
    }
    if (filtros.periodo === "personalizado") {
        const periodoInicio = filtros.dataInicial ? inicioDoDia(`${filtros.dataInicial}T12:00:00`) : null;
        const periodoFim = filtros.dataFinal ? fimDoDia(`${filtros.dataFinal}T12:00:00`) : null;
        if (!periodoInicio || !periodoFim || periodoFim < periodoInicio) return { inicio: null, fim: null, anteriorInicio: null, anteriorFim: null };
        const duracao = periodoFim.getTime() - periodoInicio.getTime() + 1;
        return { inicio: periodoInicio, fim: periodoFim, anteriorInicio: new Date(periodoInicio.getTime() - duracao), anteriorFim: new Date(periodoInicio.getTime() - 1) };
    }
    const dias = Number(filtros.periodo) || 30;
    inicio.setDate(inicio.getDate() - (dias - 1));
    return { inicio, fim, anteriorInicio: new Date(inicio.getTime() - dias * 86400000), anteriorFim: new Date(inicio.getTime() - 1) };
}

function metricasDoPedido(pedido) {
    const atendimento = window.PedidosUtils.calcularAtendimentoPedido(pedido, estado.remessas);
    const itens = atendimento.itens.filter((item) => situacaoDoItemPedido(item, pedido) !== "recusado").map((item) => ({
        ...item,
        quantidadeSolicitada: item.solicitado,
        quantidadeEnviadaRelatorio: item.enviado,
        quantidadePendenteRelatorio: item.pendente
    }));
    const prazo = pedido.entregaPrevista || "";
    return {
        pedido, itens, remessas: atendimento.remessas, solicitada: atendimento.solicitado,
        enviada: atendimento.enviado, pendente: atendimento.pendente,
        completo: atendimento.totalmenteEnviado, parcial: atendimento.parcial,
        primeiroEnvio: atendimento.primeiroEnvio, ultimoEnvio: atendimento.ultimoEnvio,
        completamenteRecebido: atendimento.totalmenteRecebido,
        prazo, situacao: situacaoDoPedido(pedido)
    };
}

function pedidoNoPeriodo(pedido, inicio, fim) {
    const criadoEm = new Date(pedido.criadoEm);
    return !Number.isNaN(criadoEm.getTime()) && (!inicio || criadoEm >= inicio) && (!fim || criadoEm <= fim);
}

function pedidosFiltradosRelatorio(intervalo = intervaloRelatorio()) {
    return estado.pedidos.filter((pedido) => {
        if (!pedidoNoPeriodo(pedido, intervalo.inicio, intervalo.fim)) return false;
        if (filtrosRelatorio.filialId && pedido.filialId !== filtrosRelatorio.filialId) return false;
        if (!pedidoCorrespondeStatus(pedido, filtrosRelatorio.status)) return false;
        const itens = itensDoPedido(pedido).filter((item) => {
            const produto = buscarProduto(item.produtoId);
            return (!filtrosRelatorio.produtoId || item.produtoId === filtrosRelatorio.produtoId)
                && (!filtrosRelatorio.categoria || produto?.categoria === filtrosRelatorio.categoria);
        });
        return itens.length > 0;
    }).map((pedido) => {
        const metricas = metricasDoPedido(pedido);
        const itens = metricas.itens.filter((item) => {
            const produto = buscarProduto(item.produtoId);
            return (!filtrosRelatorio.produtoId || item.produtoId === filtrosRelatorio.produtoId)
                && (!filtrosRelatorio.categoria || produto?.categoria === filtrosRelatorio.categoria);
        });
        const solicitada = itens.reduce((total, item) => total + item.quantidadeSolicitada, 0);
        const enviada = itens.reduce((total, item) => total + item.quantidadeEnviadaRelatorio, 0);
        const pendente = itens.reduce((total, item) => total + item.quantidadePendenteRelatorio, 0);
        const produtosFiltrados = new Set(itens.map((item) => item.produtoId));
        const remessas = metricas.remessas.filter((remessa) => remessa.itens.some((item) => produtosFiltrados.has(item.produtoId)));
        return {
            ...metricas, itens, remessas, solicitada, enviada, pendente,
            completo: solicitada > 0 && pendente === 0,
            parcial: enviada > 0 && pendente > 0,
            primeiroEnvio: remessas.map((remessa) => new Date(remessa.enviadaEm)).filter((data) => !Number.isNaN(data.getTime())).sort((a, b) => a - b)[0] || null,
            ultimoEnvio: remessas.map((remessa) => new Date(remessa.enviadaEm)).filter((data) => !Number.isNaN(data.getTime())).sort((a, b) => b - a)[0] || null
        };
    });
}

function preencherFiltrosRelatorio() {
    if (!elementos.relatorioFilial) return;
    const filialSelecionada = filtrosRelatorio.filialId;
    elementos.relatorioFilial.innerHTML = `<option value="">Todas as filiais</option>${estado.filiais.map((filial) => `<option value="${escaparHTML(filial.id)}">${escaparHTML(filial.nome)}</option>`).join("")}`;
    elementos.relatorioProduto.innerHTML = `<option value="">Todos os produtos</option>${produtosAtivos().map((produto) => `<option value="${escaparHTML(produto.id)}">${escaparHTML(produto.nome)}</option>`).join("")}`;
    elementos.relatorioCategoria.innerHTML = `<option value="">Todas as categorias</option>${categoriasProdutos.map((categoria) => `<option value="${escaparHTML(categoria)}">${escaparHTML(categoria)}</option>`).join("")}`;
    elementos.relatorioFilial.value = filialSelecionada;
    elementos.relatorioStatus.value = filtrosRelatorio.status;
    elementos.relatorioProduto.value = filtrosRelatorio.produtoId;
    elementos.relatorioCategoria.value = filtrosRelatorio.categoria;
}

function definirValorRelatorio(elemento, valor) {
    if (elemento) elemento.textContent = valor;
}

function linhasVaziasRelatorio(colunas, texto = "Sem dados no período.") {
    return `<tr><td colspan="${colunas}" class="tabela-vazia">${texto}</td></tr>`;
}

function renderizarTabelaProdutosRelatorio(elemento, registros, limite) {
    if (!elemento) return;
    elemento.innerHTML = registros.length ? registros.slice(0, limite).map((registro) => `<tr><td><button type="button" class="link-relatorio" data-acao="relatorio-filtrar-produto" data-produto-id="${escaparHTML(registro.produtoId)}">${escaparHTML(registro.nome)}</button></td><td>${formatarNumero(registro.solicitada)}</td><td>${formatarNumero(registro.enviada)}</td><td>${formatarNumero(registro.pendente)}</td><td>${formatarNumero(registro.pedidos)}</td></tr>`).join("") : linhasVaziasRelatorio(5);
}

function renderizarEvolucaoRelatorio(registros, intervalo) {
    if (!elementos.relatorioEvolucao) return;
    const porDia = new Map();
    registros.forEach((registro) => {
        const chave = dataLocalISO(new Date(registro.pedido.criadoEm));
        const atual = porDia.get(chave) || { chave, realizados: 0, concluidos: 0, parciais: 0 };
        atual.realizados += 1;
        if (registro.completo && registro.pedido.recebidoEm) atual.concluidos += 1;
        if (registro.parcial) atual.parciais += 1;
        porDia.set(chave, atual);
    });
    const pontos = [...porDia.values()].sort((a, b) => a.chave.localeCompare(b.chave));
    if (!pontos.length) { elementos.relatorioEvolucao.innerHTML = '<p class="resumo-vazio">Sem pedidos no período selecionado.</p>'; return; }
    const maximo = Math.max(...pontos.flatMap((ponto) => [ponto.realizados, ponto.concluidos, ponto.parciais]), 1);
    const barras = pontos.slice(-12).map((ponto) => `<div class="barra-evolucao" title="${formatarDataSimples(ponto.chave)}: ${ponto.realizados} realizados, ${ponto.concluidos} concluídos, ${ponto.parciais} parciais"><div class="barra-serie realizado" style="height:${(ponto.realizados / maximo) * 100}%"></div><div class="barra-serie concluido" style="height:${(ponto.concluidos / maximo) * 100}%"></div><div class="barra-serie parcial" style="height:${(ponto.parciais / maximo) * 100}%"></div><span>${formatarDataSimples(ponto.chave).slice(0, 5)}</span></div>`).join("");
    elementos.relatorioEvolucao.innerHTML = `<div class="legenda-grafico"><span><i class="realizado"></i>Realizados</span><span><i class="concluido"></i>Concluídos</span><span><i class="parcial"></i>Parciais</span></div><div class="barras-evolucao">${barras}</div>`;
}

function renderizarStatusRelatorio(registros) {
    if (!elementos.relatorioStatusGrafico) return;
    const contagens = new Map();
    registros.forEach((registro) => contagens.set(registro.situacao, (contagens.get(registro.situacao) || 0) + 1));
    const itens = [...contagens.entries()];
    if (!itens.length) { elementos.relatorioStatusGrafico.innerHTML = '<p class="resumo-vazio">Sem pedidos no período selecionado.</p>'; return; }
    const cores = ["#e87861", "#3d8a61", "#d08b22", "#687ea7", "#9a79bf", "#aa4d3c", "#806e68"];
    let acumulado = 0;
    const partes = itens.map(([situacao, quantidade], indice) => { const inicio = acumulado; acumulado += (quantidade / registros.length) * 100; return `${cores[indice % cores.length]} ${inicio}% ${acumulado}%`; }).join(", ");
    elementos.relatorioStatusGrafico.innerHTML = `<div class="donut-status" style="background:conic-gradient(${partes})"><strong>${formatarNumero(registros.length)}</strong><span>pedidos</span></div><div class="legenda-status">${itens.map(([situacao, quantidade], indice) => `<button type="button" data-acao="relatorio-filtrar-status" data-status="${situacao}"><i style="background:${cores[indice % cores.length]}"></i>${escaparHTML(textoSituacaoPedido(situacao))}<strong>${formatarNumero(quantidade)}</strong></button>`).join("")}</div>`;
}

function renderizarCalendarioSaidas() {
    if (!elementos.relatorioCalendarioSaidas || !elementos.relatorioCalendarioMes) return;

    const mesAtual = dataLocalISO(new Date()).slice(0, 7);
    const mesSelecionado = elementos.relatorioCalendarioMes.value || mesAtual;
    elementos.relatorioCalendarioMes.value = mesSelecionado;

    const [ano, mes] = mesSelecionado.split("-").map(Number);
    if (!Number.isInteger(ano) || !Number.isInteger(mes)) return;

    const saidasPorDia = new Map();
    estado.movimentacoes
        .filter((movimentacao) => ["saida", "transferencia"].includes(movimentacao.tipo))
        .filter((movimentacao) => dataLocalISO(new Date(movimentacao.criadoEm)).startsWith(mesSelecionado))
        .filter((movimentacao) => {
            const produto = buscarProduto(movimentacao.produtoId);
            return (!filtrosRelatorio.filialId || movimentacao.filialId === filtrosRelatorio.filialId)
                && (!filtrosRelatorio.produtoId || movimentacao.produtoId === filtrosRelatorio.produtoId)
                && (!filtrosRelatorio.categoria || produto?.categoria === filtrosRelatorio.categoria);
        })
        .forEach((movimentacao) => {
            const data = new Date(movimentacao.criadoEm);
            if (Number.isNaN(data.getTime())) return;
            const dia = data.getDate();
            const produto = buscarProduto(movimentacao.produtoId);
            const registro = saidasPorDia.get(dia) || { quantidade: 0, produtos: new Map() };
            const produtoRegistrado = registro.produtos.get(movimentacao.produtoId) || {
                nome: movimentacao.produtoNome || produto?.nome || "Produto não identificado",
                unidade: movimentacao.unidade || produto?.unidade || "Unidade",
                quantidade: 0
            };
            produtoRegistrado.quantidade += movimentacao.quantidade;
            registro.quantidade += movimentacao.quantidade;
            registro.produtos.set(movimentacao.produtoId, produtoRegistrado);
            saidasPorDia.set(dia, registro);
        });

    const primeiroDia = new Date(ano, mes - 1, 1);
    const totalDias = new Date(ano, mes, 0).getDate();
    const inicioSemana = (primeiroDia.getDay() + 6) % 7;
    const totalUnidades = [...saidasPorDia.values()].reduce((total, registro) => total + registro.quantidade, 0);
    const nomeMes = primeiroDia.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const cabecalhos = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const celulasVazias = Array.from({ length: inicioSemana }, () => '<div class="dia-calendario vazio" aria-hidden="true"></div>').join("");
    const hoje = dataLocalISO(new Date());
    const dias = Array.from({ length: totalDias }, (_valor, indice) => {
        const dia = indice + 1;
        const chave = `${mesSelecionado}-${String(dia).padStart(2, "0")}`;
        const registro = saidasPorDia.get(dia);
        const produtos = registro ? [...registro.produtos.values()].sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR")) : [];
        if (!registro) return `<article class="dia-calendario ${chave === hoje ? "hoje" : ""}"><time datetime="${chave}">${dia}</time></article>`;
        return `<button type="button" class="dia-calendario tem-saida ${chave === hoje ? "hoje" : ""}" data-acao="ver-saidas-calendario" data-data-saidas="${chave}"><time datetime="${chave}">${dia}</time><strong>${formatarNumero(registro.quantidade)} <small>un.</small></strong><small class="ver-itens-calendario">Ver produtos</small></button>`;
    }).join("");

    elementos.relatorioCalendarioSaidas.innerHTML = `<p class="titulo-mes-calendario">${escaparHTML(nomeMes)}</p><div class="semana-calendario">${cabecalhos.map((dia) => `<span>${dia}</span>`).join("")}</div><div class="dias-calendario">${celulasVazias}${dias}</div>`;
    elementos.relatorioCalendarioTotal.textContent = totalUnidades ? `${formatarNumero(totalUnidades)} unidades no mês` : "Sem saídas no mês selecionado";
}

function abrirModalSaidasCalendario(data) {
    if (!elementos.modalSaidasCalendario || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return;
    const saidas = new Map();

    estado.movimentacoes
        .filter((movimentacao) => ["saida", "transferencia"].includes(movimentacao.tipo))
        .filter((movimentacao) => dataLocalISO(new Date(movimentacao.criadoEm)) === data)
        .filter((movimentacao) => {
            const produto = buscarProduto(movimentacao.produtoId);
            return (!filtrosRelatorio.filialId || movimentacao.filialId === filtrosRelatorio.filialId)
                && (!filtrosRelatorio.produtoId || movimentacao.produtoId === filtrosRelatorio.produtoId)
                && (!filtrosRelatorio.categoria || produto?.categoria === filtrosRelatorio.categoria);
        })
        .forEach((movimentacao) => {
            const produto = buscarProduto(movimentacao.produtoId);
            const registro = saidas.get(movimentacao.produtoId) || {
                nome: movimentacao.produtoNome || produto?.nome || "Produto não identificado",
                unidade: movimentacao.unidade || produto?.unidade || "Unidade",
                quantidade: 0
            };
            registro.quantidade += movimentacao.quantidade;
            saidas.set(movimentacao.produtoId, registro);
        });

    const produtos = [...saidas.values()].sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR"));
    const total = produtos.reduce((soma, produto) => soma + produto.quantidade, 0);
    elementos.tituloModalSaidasCalendario.textContent = `Saídas em ${formatarDataSimples(data)}`;
    elementos.resumoModalSaidasCalendario.textContent = `${formatarNumero(total)} unidade(s) saíram do CD nesta data.`;
    elementos.listaModalSaidasCalendario.innerHTML = produtos.map((produto) => `<article><strong>${escaparHTML(produto.nome)}</strong><span>${formatarNumero(produto.quantidade)} ${escaparHTML(produto.unidade)}</span></article>`).join("") || "<p class=\"resumo-vazio\">Nenhuma saída encontrada.</p>";
    abrirModal(elementos.modalSaidasCalendario);
}

function renderizarRelatorios() {
    if (!elementos.relatorioPedidosRealizados) return;
    preencherFiltrosRelatorio();
    const intervalo = intervaloRelatorio();
    const registros = pedidosFiltradosRelatorio(intervalo);
    const anterior = intervalo.anteriorInicio ? pedidosFiltradosRelatorio({ inicio: intervalo.anteriorInicio, fim: intervalo.anteriorFim, anteriorInicio: null, anteriorFim: null }) : [];
    const solicitada = registros.reduce((total, registro) => total + registro.solicitada, 0);
    const enviada = registros.reduce((total, registro) => total + registro.enviada, 0);
    const parciais = registros.filter((registro) => registro.parcial);
    const completosRecebidos = registros.filter((registro) => registro.completo && registro.pedido.recebidoEm);
    const elegiveisOtif = completosRecebidos.filter((registro) => registro.prazo);
    const noPrazo = elegiveisOtif.filter((registro) => new Date(registro.pedido.recebidoEm) <= fimDoDia(`${registro.prazo}T12:00:00`));
    const duracoesPrimeiroEnvio = registros.filter((registro) => registro.primeiroEnvio).map((registro) => registro.primeiroEnvio - new Date(registro.pedido.criadoEm)).filter((duracao) => duracao >= 0);
    const duracoesLeadTime = completosRecebidos.map((registro) => new Date(registro.pedido.recebidoEm) - new Date(registro.pedido.criadoEm)).filter((duracao) => duracao >= 0);
    const unidadesAnteriores = anterior.reduce((total, registro) => total + registro.solicitada, 0);
    definirValorRelatorio(elementos.relatorioPedidosRealizados, formatarNumero(registros.length));
    definirValorRelatorio(elementos.relatorioPedidosComparacao, comparacaoPercentual(registros.length, anterior.length));
    definirValorRelatorio(elementos.relatorioUnidadesSolicitadas, registros.length ? formatarNumero(solicitada) : "—");
    definirValorRelatorio(elementos.relatorioUnidadesComparacao, registros.length ? comparacaoPercentual(solicitada, unidadesAnteriores) : "Sem dados no período");
    definirValorRelatorio(elementos.relatorioTaxaAtendimento, percentual(enviada, solicitada));
    definirValorRelatorio(elementos.relatorioAtendimentoDetalhe, solicitada ? `${formatarNumero(enviada)} de ${formatarNumero(solicitada)} unidades enviadas` : "Sem dados no período");
    definirValorRelatorio(elementos.relatorioEnviosParciais, registros.length ? formatarNumero(parciais.length) : "—");
    definirValorRelatorio(elementos.relatorioParciaisDetalhe, registros.length ? `${percentual(parciais.length, registros.length)} dos pedidos` : "Sem dados no período");
    definirValorRelatorio(elementos.relatorioOtif, percentual(noPrazo.length, elegiveisOtif.length));
    definirValorRelatorio(elementos.relatorioOtifDetalhe, elegiveisOtif.length ? `${formatarNumero(noPrazo.length)} de ${formatarNumero(elegiveisOtif.length)} recebidos integralmente no prazo de entrega` : "Sem pedidos elegíveis concluídos");
    definirValorRelatorio(elementos.relatorioTempoEnvio, mediaDuracao(duracoesPrimeiroEnvio));
    definirValorRelatorio(elementos.relatorioTempoProducao, "Dados insuficientes");
    definirValorRelatorio(elementos.relatorioLeadTime, mediaDuracao(duracoesLeadTime));
    definirValorRelatorio(elementos.relatorioEntregasPrazo, percentual(noPrazo.length, elegiveisOtif.length));
    definirValorRelatorio(elementos.relatorioEntregasPrazoDetalhe, elegiveisOtif.length ? "confirmados até o prazo de entrega" : "Sem pedidos elegíveis concluídos");

    const produtos = new Map();
    registros.forEach((registro) => registro.itens.forEach((item) => {
        const produto = produtos.get(item.produtoId) || { produtoId: item.produtoId, nome: item.produtoNome, unidade: item.unidade, solicitada: 0, enviada: 0, pendente: 0, pedidos: 0, pedidosIds: new Set(), pendenciasPorFilial: new Map() };
        produto.solicitada += item.quantidadeSolicitada;
        produto.enviada += item.quantidadeEnviadaRelatorio;
        produto.pendente += item.quantidadePendenteRelatorio;
        produto.pedidosIds.add(registro.pedido.id);
        produto.pedidos = produto.pedidosIds.size;
        if (item.quantidadePendenteRelatorio > 0) {
            produto.pendenciasPorFilial.set(registro.pedido.filialId, (produto.pendenciasPorFilial.get(registro.pedido.filialId) || 0) + item.quantidadePendenteRelatorio);
        }
        produtos.set(item.produtoId, produto);
    }));
    const listaProdutos = [...produtos.values()];
    const demandasAbertas = listaProdutos.filter((produto) => produto.pendente > 0).map((produto) => ({ pendente: produto.pendente, estoqueDisponivel: buscarProduto(produto.produtoId)?.quantidade || 0 }));
    const producaoNecessaria = window.RelatoriosUtils.calcularProducaoNecessaria(demandasAbertas);
    definirValorRelatorio(elementos.relatorioProducaoNecessaria, registros.length ? formatarNumero(producaoNecessaria) : "—");
    definirValorRelatorio(elementos.relatorioProducaoDetalhe, registros.length ? `${formatarNumero(demandasAbertas.filter((produto) => produto.pendente > produto.estoqueDisponivel).length)} produto(s) com saldo insuficiente no CD` : "Sem pedidos abertos no período");
    const planoProducao = listaProdutos.map((produto) => {
        const estoqueDisponivel = numeroInteiroNaoNegativo(buscarProduto(produto.produtoId)?.quantidade);
        const quantidadeFabricar = Math.max(produto.pendente - estoqueDisponivel, 0);
        const filiais = [...produto.pendenciasPorFilial.entries()].map(([filialId, quantidade]) => `${buscarFilial(filialId)?.nome || "Filial não identificada"} (${formatarNumero(quantidade)})`).join(", ");
        return { ...produto, estoqueDisponivel, quantidadeFabricar, filiais };
    }).filter((produto) => produto.quantidadeFabricar > 0).sort((a, b) => b.quantidadeFabricar - a.quantidadeFabricar);
    elementos.relatorioPlanoProducao.innerHTML = planoProducao.length ? planoProducao.map((produto) => `<tr><td><strong>${escaparHTML(produto.nome)}</strong></td><td>${formatarNumero(produto.estoqueDisponivel)} ${escaparHTML(produto.unidade)}</td><td>${formatarNumero(produto.pendente)} ${escaparHTML(produto.unidade)}</td><td><strong class="quantidade-producao">${formatarNumero(produto.quantidadeFabricar)} ${escaparHTML(produto.unidade)}</strong></td><td>${escaparHTML(produto.filiais)}</td></tr>`).join("") : linhasVaziasRelatorio(5, "O saldo do CD atende os pedidos em aberto no período.");
    renderizarTabelaProdutosRelatorio(elementos.relatorioProdutosSolicitados, [...listaProdutos].sort((a, b) => b.solicitada - a.solicitada), filtrosRelatorio.limiteProdutos);
    renderizarTabelaProdutosRelatorio(elementos.relatorioProdutosPendentes, [...listaProdutos].filter((produto) => produto.pendente > 0).sort((a, b) => b.pendente - a.pendente), filtrosRelatorio.limiteProdutos);

    const desempenho = estado.filiais.map((filial) => {
        const pedidos = registros.filter((registro) => registro.pedido.filialId === filial.id);
        const solicitadoFilial = pedidos.reduce((total, registro) => total + registro.solicitada, 0);
        const enviadoFilial = pedidos.reduce((total, registro) => total + registro.enviada, 0);
        const leadTimes = pedidos.filter((registro) => registro.completo && registro.pedido.recebidoEm).map((registro) => new Date(registro.pedido.recebidoEm) - new Date(registro.pedido.criadoEm)).filter((duracao) => duracao >= 0);
        const otifElegiveis = pedidos.filter((registro) => registro.completo && registro.pedido.recebidoEm && registro.prazo);
        const otifNoPrazo = otifElegiveis.filter((registro) => new Date(registro.pedido.recebidoEm) <= fimDoDia(`${registro.prazo}T12:00:00`));
        return { filial, pedidos, solicitado: solicitadoFilial, enviado: enviadoFilial, parciais: pedidos.filter((registro) => registro.parcial).length, leadTime: mediaDuracao(leadTimes), otif: percentual(otifNoPrazo.length, otifElegiveis.length) };
    }).filter((linha) => linha.pedidos.length);
    elementos.relatorioDesempenhoFiliais.innerHTML = desempenho.length ? desempenho.map((linha) => `<tr><td><button type="button" class="link-relatorio" data-acao="relatorio-filtrar-filial" data-filial-id="${escaparHTML(linha.filial.id)}">${escaparHTML(linha.filial.nome)}</button></td><td>${formatarNumero(linha.pedidos.length)}</td><td>${formatarNumero(linha.solicitado)}</td><td>${formatarNumero(linha.enviado)}</td><td>${percentual(linha.enviado, linha.solicitado)}</td><td>${formatarNumero(linha.parciais)}</td><td>${linha.leadTime}</td><td>${linha.otif}</td></tr>`).join("") : linhasVaziasRelatorio(8);
    elementos.relatorioPedidosParciais.innerHTML = parciais.length ? parciais.map((registro) => `<tr><td><button type="button" class="link-relatorio" data-acao="relatorio-ver-pedido" data-pedido-id="${escaparHTML(registro.pedido.id)}">${numeroPedidoParaExibicao(registro.pedido)}</button></td><td>${escaparHTML(buscarFilial(registro.pedido.filialId)?.nome || "—")}</td><td>${formatarNumero(registro.solicitada)}</td><td>${formatarNumero(registro.enviada)}</td><td>${formatarNumero(registro.pendente)}</td><td>${registro.ultimoEnvio ? formatarData(registro.ultimoEnvio) : "—"}</td><td><span class="selo-tipo tipo-pendente">Parcial</span></td></tr>`).join("") : linhasVaziasRelatorio(7, "Nenhum pedido parcial no período.");
    const agora = new Date();
    const criticos = registros.map((registro) => {
        const prazoData = registro.prazo ? fimDoDia(`${registro.prazo}T12:00:00`) : null;
        const aguardando = formatarDuracao(agora - new Date(registro.pedido.criadoEm));
        if (registro.pendente > 0 && prazoData && prazoData < agora) return { registro, problema: "Prazo vencido com pendência", classe: "tipo-recusado", aguardando };
        if (registro.pendente > 0 && prazoData && prazoData - agora <= 2 * 86400000) return { registro, problema: "Prazo próximo com pendência", classe: "tipo-pendente", aguardando };
        if (registro.parcial) return { registro, problema: "Envio parcial", classe: "tipo-pendente", aguardando };
        if (registro.enviada > 0 && !registro.pedido.recebidoEm) return { registro, problema: "Enviado sem confirmação", classe: "tipo-pendente", aguardando };
        return null;
    }).filter(Boolean);
    elementos.relatorioPedidosCriticos.innerHTML = criticos.length ? criticos.map(({ registro, problema, classe, aguardando }) => `<tr><td><button type="button" class="link-relatorio" data-acao="relatorio-ver-pedido" data-pedido-id="${escaparHTML(registro.pedido.id)}">${numeroPedidoParaExibicao(registro.pedido)}</button></td><td>${escaparHTML(buscarFilial(registro.pedido.filialId)?.nome || "—")}</td><td><span class="selo-tipo ${classe}">${escaparHTML(problema)}</span></td><td>${registro.prazo ? formatarDataSimples(registro.prazo) : "Sem prazo"}</td><td>${aguardando}</td><td>${escaparHTML(textoSituacaoPedido(registro.situacao))}</td></tr>`).join("") : linhasVaziasRelatorio(6, "Nenhum pedido requer atenção no período.");
    renderizarEvolucaoRelatorio(registros, intervalo);
    renderizarStatusRelatorio(registros);
    renderizarCalendarioSaidas();
}

function exportarRelatorioCsv() {
    const registros = pedidosFiltradosRelatorio();
    const linhas = [["Pedido", "Filial", "Criado em", "Status", "Remessas", "Solicitado", "Enviado", "Pendente", "Atendimento", "Prazo", "Recebido em"]];
    registros.forEach((registro) => linhas.push([numeroPedidoParaExibicao(registro.pedido), buscarFilial(registro.pedido.filialId)?.nome || "", registro.pedido.criadoEm || "", textoSituacaoPedido(registro.situacao), registro.remessas.length, registro.solicitada, registro.enviada, registro.pendente, percentual(registro.enviada, registro.solicitada), registro.prazo || "", registro.pedido.recebidoEm || ""]));
    const csv = linhas.map((linha) => linha.map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(";")).join("\n");
    const arquivo = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-pedidos-${dataLocalISO(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function renderizarUsuarios() {
    if (!elementos.tabelaUsuarios) return;
    elementos.tabelaUsuarios.innerHTML = usuarios.length
        ? usuarios.map((usuario) => {
            const filial = usuario.filial_id ? (buscarFilial(usuario.filial_id)?.nome || usuario.filial_id) : "—";
            const papel = usuario.papel === "cd_admin" ? "Administrador" : "Filial";
            const podeExcluir = usuario.id !== usuarioAtual?.id;
            return `<tr><td data-label="Usuario">${escaparHTML(usuario.nome || "Sem nome")}</td><td data-label="Login">${escaparHTML(loginParaExibicao(usuario.email))}</td><td data-label="Papel"><span class="selo-tipo ${usuario.papel === "cd_admin" ? "tipo-aprovado" : "tipo-pendente"}">${papel}</span></td><td data-label="Filial">${escaparHTML(filial)}</td><td data-label="Acoes"><div class="acoes-usuario"><button type="button" class="botao-acao" data-acao="editar-usuario" data-usuario-id="${usuario.id}">Editar</button>${podeExcluir ? `<button type="button" class="botao-acao" data-acao="excluir-usuario" data-usuario-id="${usuario.id}">Excluir</button>` : ""}</div></td></tr>`;
        }).join("")
        : "<tr><td colspan=\"5\" class=\"tabela-vazia\">Nenhum usuário encontrado.</td></tr>";
}

function renderizarPortalFilial() {
    const filial = filialAtual();

    if (!filial) return;

    const statusSelecionado = elementos.filtroStatusMeusPedidos.value;
    const pedidosDaFilial = estado.pedidos.filter((pedido) => pedido.filialId === filial.id);
    const abertos = pedidosDaFilial.filter((pedido) => ["pendente", "aprovado", "em_producao", "agendado_envio", "em_transito"].includes(situacaoDoPedido(pedido))).length;

    elementos.tituloPortalFilial.textContent = `Portal Therapeutica · ${filial.nome}`;
    elementos.indicadorFilialPedidos.textContent = formatarNumero(abertos);

    const produtos = produtosAtivos().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const selecionado = elementos.itemPedidoProduto.value;
    elementos.itemPedidoProduto.innerHTML = produtos.map((produto) => `<option value="${produto.id}">${escaparHTML(produto.nome)}</option>`).join("");

    if (produtos.some((produto) => produto.id === selecionado)) {
        elementos.itemPedidoProduto.value = selecionado;
    }

    elementos.itemPedidoProduto.disabled = produtos.length === 0;
    elementos.buscaItemPedido.disabled = produtos.length === 0;
    renderizarSugestoesBuscaItemPedido();
    atualizarEstoqueAtualDoItemPedido();
    renderizarCarrinhoPedido();

    const pedidosFiltrados = pedidosDaFilial.filter((pedido) => pedidoCorrespondeStatus(pedido, statusSelecionado));
    elementos.listaMeusPedidos.innerHTML = pedidosFiltrados.length
        ? pedidosFiltrados.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)).map((pedido) => {
            const situacaoPedido = situacaoDoPedido(pedido);
            const producao = pedido.producaoPrevista ? formatarDataSimples(pedido.producaoPrevista) : "";
            const envio = pedido.envioPrevisto ? formatarDataSimples(pedido.envioPrevisto) : "";
            const entrega = pedido.entregaPrevista ? formatarDataSimples(pedido.entregaPrevista) : "";
            return `
                <article class="pedido-filial-card">
                    <div class="cabecalho-pedido-filial">
                        <div>
                            <h3>Pedido ${numeroPedidoParaExibicao(pedido)} · ${formatarData(pedido.criadoEm)}</h3>
                            <p>${pedido.observacao ? escaparHTML(pedido.observacao) : "Sem observação geral."}</p>
                        </div>
                        <span class="selo-tipo ${classeSituacaoPedido(situacaoPedido)}">${textoSituacaoPedido(situacaoPedido)}</span>
                    </div>
                    <div class="itens-pedido-resumo">
                        ${renderizarItensAgrupadosPorCategoria(itensDoPedido(pedido), (item) => {
                            const situacaoItem = item.situacao || pedido.situacao;
                            const statusItem = statusExibicaoItemPedido(pedido, item);
                            const motivoRecusa = item.observacaoMatriz || pedido.observacaoMatriz || "Motivo não informado pelo CD.";
                            return `
                                <details class="item-pedido-resumo item-pedido-dobravel">
                                    <summary><strong>${escaparHTML(item.produtoNome)}</strong><span class="selo-tipo selo-status-item ${statusItem.classe}">${statusItem.texto}</span></summary>
                                    <div class="conteudo-item-dobravel">${resumoQuantidadesItemPedido(pedido, item, { mostrarEstoqueFilial: true, mostrarDisponivelCD: false })}${situacaoItem === "recusado" ? `<span class="motivo-recusa-pedido">Motivo da recusa: ${escaparHTML(motivoRecusa)}</span>` : ""}</div>
                                </details>
                            `;
                        }, "grupo-itens-categoria-filial")}
                    </div>
                    ${producao ? `<p><strong>Prazo de produção:</strong> ${escaparHTML(producao)}</p>` : ""}
                    ${envio ? `<p><strong>Envio previsto:</strong> ${escaparHTML(envio)}</p>` : ""}
                    ${entrega ? `<p><strong>Entrega prevista:</strong> ${escaparHTML(entrega)}</p>` : ""}
                    ${pedido.recebidoEm ? `<p><strong>Recebido em:</strong> ${formatarData(pedido.recebidoEm)}</p>` : ""}
                    ${pedido.observacaoMatriz ? `<p><strong>Resposta do CD:</strong> ${escaparHTML(pedido.observacaoMatriz)}</p>` : ""}
                    <div class="acoes-pedido-filial">
                        <button type="button" class="botao-acao" data-acao="ver-detalhes-pedido" data-pedido-id="${pedido.id}">Ver detalhes</button>
                    </div>
                </article>
            `;
        }).join("")
        : "<p class=\"resumo-vazio\">Nenhum pedido foi enviado por esta filial.</p>";
}

function renderizarCarrinhoPedido() {
    elementos.quantidadeItensCarrinho.textContent = `${itensDoPedidoAtual.length} ${itensDoPedidoAtual.length === 1 ? "item" : "itens"}`;
    elementos.itensCarrinhoPedido.innerHTML = itensDoPedidoAtual.length
        ? renderizarItensAgrupadosPorCategoria(itensDoPedidoAtual, (item, indice) => `
            <div class="linha-carrinho">
                <div>
                    <strong>${escaparHTML(item.produtoNome)}</strong>
                    <span>Estoque atual: ${formatarNumero(item.estoqueInformado)} · Solicitação: ${formatarNumero(item.quantidadeSolicitada)} ${escaparHTML(item.unidade)}</span>
                </div>
                <button type="button" class="botao-remover-item" data-acao="remover-item-pedido" data-indice-item="${indice}">Remover</button>
            </div>
        `, "grupo-itens-categoria-carrinho")
        : "<p class=\"resumo-vazio\">Adicione produtos para montar a lista do pedido.</p>";
}

function atualizarEstoqueAtualDoItemPedido() {
    elementos.itemPedidoEstoque.value = "";
    const produto = buscarProduto(elementos.itemPedidoProduto.value);
    const busca = elementos.buscaItemPedido.value.trim().toLocaleLowerCase("pt-BR");
    const textoProduto = produto ? `${produto.codigo ? `${produto.codigo} · ` : ""}${produto.nome}`.toLocaleLowerCase("pt-BR") : "";
    const produtoFoiSelecionado = Boolean(busca) && (busca === textoProduto || busca === String(produto?.codigo || "").toLocaleLowerCase("pt-BR") || busca === produto?.nome?.toLocaleLowerCase("pt-BR"));

    if (!produto || !produtoFoiSelecionado) {
        elementos.disponibilidadeCdItemPedido.hidden = true;
        elementos.disponibilidadeCdItemPedido.textContent = "";
        return;
    }

    elementos.disponibilidadeCdItemPedido.hidden = false;
    elementos.disponibilidadeCdItemPedido.innerHTML = `<span>Estoque disponível no CD</span><strong>${formatarNumero(numeroInteiroNaoNegativo(produto.quantidade))} ${escaparHTML(produto.unidade)}</strong>`;
}

function selecionarProdutoPedidoPorBusca() {
    const busca = elementos.buscaItemPedido.value.trim().toLocaleLowerCase("pt-BR");
    if (!busca) return null;
    const produto = produtosAtivos().find((item) => {
        const opcao = `${item.codigo ? `${item.codigo} · ` : ""}${item.nome}`.toLocaleLowerCase("pt-BR");
        return opcao === busca || item.codigo.toLocaleLowerCase("pt-BR") === busca || item.nome.toLocaleLowerCase("pt-BR") === busca;
    });
    if (produto) {
        elementos.itemPedidoProduto.value = produto.id;
        atualizarEstoqueAtualDoItemPedido();
    }
    return produto;
}

function produtosDaBuscaDePedido() {
    const busca = textoNormalizado(elementos.buscaItemPedido.value);
    return produtosAtivos()
        .filter((produto) => !busca || textoNormalizado(`${produto.codigo} ${produto.nome}`).includes(busca))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function renderizarSugestoesBuscaItemPedido(mostrar = document.activeElement === elementos.buscaItemPedido) {
    const produtos = produtosDaBuscaDePedido();
    elementos.opcoesBuscaItemPedido.innerHTML = produtos.length
        ? produtos.map((produto) => `<button type="button" role="option" class="opcao-busca-pedido" data-produto-id="${produto.id}" aria-selected="${produto.id === elementos.itemPedidoProduto.value}"><span>${escaparHTML(produto.codigo || "Sem código")}</span><strong>${escaparHTML(produto.nome)}</strong><small>${escaparHTML(produto.categoria)} · ${escaparHTML(produto.unidade)}</small></button>`).join("")
        : `<p class="opcoes-busca-vazia">Nenhum produto encontrado.</p>`;
    elementos.opcoesBuscaItemPedido.hidden = !mostrar;
    elementos.buscaItemPedido.setAttribute("aria-expanded", String(mostrar));
}

function selecionarProdutoDaBuscaPedido(produtoId) {
    const produto = buscarProduto(produtoId);
    if (!produto) return;
    elementos.itemPedidoProduto.value = produto.id;
    elementos.buscaItemPedido.value = `${produto.codigo ? `${produto.codigo} · ` : ""}${produto.nome}`;
    elementos.opcoesBuscaItemPedido.hidden = true;
    elementos.buscaItemPedido.setAttribute("aria-expanded", "false");
    atualizarEstoqueAtualDoItemPedido();
}

function renderizarTudo() {
    atualizarBotaoProducaoCabecalho();
    renderizarIndicadores();
    renderizarDashboard();
    renderizarFiltroCategorias();
    renderizarOpcoesCategoriaProduto();
    renderizarCategoriasConfiguracoes();
    renderizarOpcoesUnidadeProduto();
    renderizarUnidadesConfiguracoes();
    renderizarProdutos();
    renderizarFormularioMovimentacao();
    renderizarFormularioAcertoEstoque();
    renderizarEstoqueBaixo();
    renderizarPedidos();
    renderizarNotificacaoPedidos();
    renderizarFiliais();
    renderizarHistorico();
    renderizarRelatorios();
    renderizarUsuarios();
    renderizarPortalFilial();
    if (pedidoEmAnaliseId && elementos.modalAnalisarPedido.classList.contains("modal-aberto")) {
        const pedidoEmAnalise = estado.pedidos.find((pedido) => pedido.id === pedidoEmAnaliseId);
        if (pedidoEmAnalise) {
            abrirModalAnalisarPedido(pedidoEmAnaliseId);
        } else {
            fecharModal(elementos.modalAnalisarPedido);
            pedidoEmAnaliseId = "";
        }
    }
}

async function carregarUsuarios() {
    if (!usuarioEhCD()) return;
    const { data, error } = await clienteSupabase.rpc("listar_usuarios");
    if (error) { console.error(error); notificar("Não foi possível carregar os usuários. Execute usuarios-admin.sql.", "erro"); return; }
    usuarios = data || [];
    renderizarUsuarios();
}

function abrirModalUsuario(id) {
    const usuario = usuarios.find((item) => item.id === id);
    if (!usuario) return;
    elementos.formularioUsuario.reset();
    elementos.mensagemUsuario.textContent = "";
    elementos.usuarioId.value = usuario.id;
    elementos.usuarioEmail.value = loginParaExibicao(usuario.email);
    elementos.usuarioEmail.disabled = true;
    elementos.usuarioNome.value = usuario.nome || "";
    elementos.campoSenhaInicial.hidden = true;
    elementos.usuarioSenhaInicial.required = false;
    elementos.campoSenhaTemporaria.hidden = false;
    elementos.usuarioSenhaTemporaria.required = false;
    elementos.usuarioPapel.value = usuario.papel;
    elementos.usuarioFilial.value = usuario.filial_id || "";
    elementos.usuarioFilial.disabled = usuario.papel === "cd_admin";
    elementos.tituloModalUsuario.textContent = "Editar usuário";
    elementos.botaoSalvarUsuario.textContent = "Salvar alterações";
    abrirModal(elementos.modalUsuario);
}

function abrirModalNovoUsuario() {
    if (!usuarioEhCD()) return;
    elementos.formularioUsuario.reset();
    elementos.mensagemUsuario.textContent = "";
    elementos.usuarioId.value = "";
    elementos.usuarioEmail.disabled = false;
    elementos.campoSenhaInicial.hidden = false;
    elementos.usuarioSenhaInicial.required = true;
    elementos.campoSenhaTemporaria.hidden = true;
    elementos.usuarioSenhaTemporaria.required = false;
    elementos.usuarioFilial.disabled = false;
    elementos.tituloModalUsuario.textContent = "Novo usuário";
    elementos.botaoSalvarUsuario.textContent = "Criar usuário";
    abrirModal(elementos.modalUsuario);
}

async function excluirUsuario(id) {
    if (!usuarioEhCD() || id === usuarioAtual?.id) {
        notificar("Você não pode excluir a própria conta.", "erro");
        return;
    }
    const usuario = usuarios.find((item) => item.id === id);
    if (!usuario) return;
    if (!window.confirm(`Excluir permanentemente o acesso de ${usuario.nome || loginParaExibicao(usuario.email)}?`)) return;

    const { error } = await clienteSupabase.functions.invoke("excluir-usuario", { body: { usuario_id: id } });
    if (error) { console.error(error); notificar("Não foi possível excluir o usuário.", "erro"); return; }
    notificar("Usuário excluído.");
    await carregarUsuarios();
}

function abrirModalEstoqueFilial(filialId) {
    if (!usuarioEhCD()) return;
    const filial = buscarFilial(filialId);
    if (!filial) return;

    const itensComProduto = Object.entries(estado.estoqueFiliais)
        .filter(([chave]) => chave.startsWith(`${filial.id}:`))
        .map(([chave, registro]) => ({ produto: buscarProduto(chave.slice(`${filial.id}:`.length)), registro }))
        .filter((item) => item.produto);

    elementos.tituloModalEstoqueFilial.textContent = `Estoque da filial ${filial.nome}`;
    elementos.tabelaModalEstoqueFilial.innerHTML = itensComProduto.length
        ? itensComProduto.sort((a, b) => a.produto.nome.localeCompare(b.produto.nome, "pt-BR")).map(({ produto, registro }) => `
            <tr>
                <td><strong>${escaparHTML(produto.nome)}</strong></td>
                <td>${escaparHTML(produto.categoria)}</td>
                <td><strong>${formatarNumero(registro?.quantidade ?? registro)}</strong></td>
                <td>${escaparHTML(produto.unidade)}</td>
                <td>${registro?.atualizadoEm ? formatarData(registro.atualizadoEm) : "Não informado"}</td>
            </tr>
        `).join("")
        : "<tr><td colspan=\"5\" class=\"tabela-vazia\">Nenhum estoque foi informado para esta filial.</td></tr>";
    abrirModal(elementos.modalEstoqueFilial);
}

function abrirModalProduto(produtoId = "") {
    elementos.formularioProduto.reset();
    elementos.mensagemProduto.textContent = "";
    elementos.produtoId.value = "";
    elementos.produtoQuantidade.disabled = false;
    elementos.ajudaQuantidadeProduto.textContent = "Depois use entradas e saídas para alterar o estoque.";
    elementos.tituloModalProduto.textContent = "Cadastrar produto";

    const produto = produtoId ? buscarProduto(produtoId) : null;
    renderizarOpcoesCategoriaProduto(produto?.categoria || "Outros");
    renderizarOpcoesUnidadeProduto(produto?.unidade || "Unidade");

    if (produto) {
        elementos.tituloModalProduto.textContent = "Editar produto";
        elementos.produtoId.value = produto.id;
        elementos.produtoCodigo.value = produto.codigo;
        elementos.produtoNome.value = produto.nome;
        elementos.produtoCategoria.value = produto.categoria;
        elementos.produtoQuantidade.value = produto.quantidade;
        elementos.produtoMinimo.value = produto.estoqueMinimo;
        elementos.produtoUnidade.value = produto.unidade;
        elementos.produtoQuantidade.disabled = true;
        elementos.ajudaQuantidadeProduto.textContent = "Para preservar o histórico, altere a quantidade usando Entrada ou Saída.";
    }

    abrirModal(elementos.modalProduto);
    setTimeout(() => elementos.produtoNome.focus(), 0);
}

function abrirModalPedido(filialId = "") {
    const produtos = produtosAtivos();

    if (!produtos.length) {
        notificar("Cadastre pelo menos um produto antes de criar um pedido.", "erro");
        return;
    }

    elementos.formularioPedido.reset();
    elementos.mensagemPedido.textContent = "";
    elementos.pedidoFilial.innerHTML = FILIAIS_PADRAO.map((filial) => `<option value="${filial.id}">${escaparHTML(filial.nome)} · ${escaparHTML(filial.cidade)}</option>`).join("");
    elementos.pedidoProduto.innerHTML = produtos
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map((produto) => `<option value="${produto.id}">${escaparHTML(produto.nome)} · CD: ${formatarNumero(produto.quantidade)} ${escaparHTML(produto.unidade)}</option>`)
        .join("");

    if (buscarFilial(filialId)) {
        elementos.pedidoFilial.value = filialId;
    }

    abrirModal(elementos.modalPedido);
    setTimeout(() => elementos.pedidoEstoqueAtual.focus(), 0);
}

function preencherSeletoresEntrega(dataBase = new Date()) {
    const meses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const anoAtual = dataBase.getFullYear();
    const diaAtual = dataBase.getDate();
    const mesAtual = dataBase.getMonth() + 1;

    elementos.entregaDia.innerHTML = Array.from({ length: 31 }, (_, indice) => {
        const dia = indice + 1;
        return `<option value="${dia}">${String(dia).padStart(2, "0")}</option>`;
    }).join("");
    elementos.entregaMes.innerHTML = meses.map((mes, indice) => `<option value="${indice + 1}">${mes}</option>`).join("");
    elementos.entregaAno.innerHTML = Array.from({ length: 4 }, (_, indice) => {
        const ano = anoAtual + indice;
        return `<option value="${ano}">${ano}</option>`;
    }).join("");

    elementos.entregaDia.value = String(diaAtual);
    elementos.entregaMes.value = String(mesAtual);
    elementos.entregaAno.value = String(anoAtual);
}

function definirTextoBotaoConfirmarEntrega(texto) {
    const rotulo = elementos.botaoConfirmarData.querySelector(".rotulo-botao-confirmar-entrega");
    if (rotulo) {
        rotulo.textContent = texto;
        return;
    }
    elementos.botaoConfirmarData.textContent = texto;
}

function configurarModalDataPedido(pedido, modo, produtoId = "") {
    if (!pedido) return;
    const filial = buscarFilial(pedido.filialId);
    const itemEmProducao = produtoId ? itensDoPedido(pedido).find((item) => item.produtoId === produtoId) : null;
    const itens = itemEmProducao ? [itemEmProducao] : itensEmAcao(pedido);
    const atendimentoItem = itemEmProducao && window.PedidosUtils.calcularAtendimentoPedido(pedido, estado.remessas).itens.find((item) => item.produtoId === produtoId);
    const textos = {
        iniciar_producao: {
            titulo: itemEmProducao ? `Produção · ${itemEmProducao.produtoNome}` : "Prazo de produção",
            resumo: itemEmProducao
                ? `Faltam ${formatarNumero(atendimentoItem?.pendente || 0)} ${itemEmProducao.unidade}(s) para a filial ${filial?.nome || ""}. Defina a previsão somente deste produto.`
                : `Informe até quando o pedido de ${filial?.nome || "a filial"} ficará em produção. A filial verá este prazo antes do agendamento do envio.`,
            botao: itemEmProducao ? "Programar produção" : "Iniciar produção"
        },
        entrega: {
            titulo: "Data prevista de entrega",
            resumo: `Pedido para ${filial?.nome || "a filial"} com ${itens.length} item(ns). Escolha a previsão de entrega.`,
            botao: "Aprovar envio"
        },
        enviar_pedido: {
            titulo: "Data de envio",
            resumo: `Informe a data de envio para ${filial?.nome || "a filial"}. Ao confirmar, o pedido será enviado e a filial será informada.`,
            botao: "Registrar envio"
        },
    }[modo];

    elementos.formularioEntrega.reset();
    elementos.campoEntregaData.hidden = false;
    [elementos.entregaDia, elementos.entregaMes, elementos.entregaAno].forEach((campo) => {
        campo.disabled = false;
        campo.required = true;
    });
    elementos.entregaPedidoId.value = pedido.id;
    elementos.entregaProdutoId.value = itemEmProducao?.produtoId || "";
    elementos.entregaModo.value = modo;
    elementos.tituloModalEntrega.textContent = textos.titulo;
    elementos.entregaResumo.textContent = textos.resumo;
    definirTextoBotaoConfirmarEntrega(textos.botao);
    elementos.botaoConfirmarData.disabled = false;
    elementos.botaoAprovarParaProducao.hidden = true;
    elementos.mensagemEntrega.textContent = "";

    const itemUnico = modo === "entrega" && itens.length === 1;
    elementos.campoEntregaQuantidade.hidden = !itemUnico;
    elementos.entregaQuantidade.required = itemUnico;
    elementos.entregaQuantidade.disabled = !itemUnico;
    if (itemUnico) {
        const item = itens[0];
        const produto = buscarProduto(item.produtoId);
        const maximo = Math.min(item.quantidadeSolicitada, produto?.quantidade || 0);
        elementos.entregaQuantidade.min = "1";
        elementos.entregaQuantidade.max = String(maximo);
        elementos.entregaQuantidade.value = String(maximo);
        elementos.ajudaEntregaQuantidade.textContent = `Solicitado: ${formatarNumero(item.quantidadeSolicitada)} ${item.unidade}. Disponível no CD: ${formatarNumero(produto?.quantidade || 0)} ${item.unidade}.`;
    }
    preencherSeletoresEntrega(new Date());
    abrirModal(elementos.modalEntrega);
    setTimeout(() => elementos.entregaDia.focus(), 0);
}

function abrirModalEntrega(pedidoId) {
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);

    if (!pedido || !itensEmAcao(pedido).some((item) => (item.situacao || pedido.situacao) === "pendente")) return;

    const itens = itensEmAcao(pedido).filter((item) => (item.situacao || pedido.situacao) === "pendente");
    const item = itens[0];
    const produto = buscarProduto(item.produtoId);
    const estoqueNoCD = numeroInteiroNaoNegativo(produto?.quantidade);
    // A aprovação representa a quantidade que já pode ser atendida pelo CD.
    // Nunca permita aprovar mais do que o saldo físico disponível agora.
    const maximo = Math.min(item.quantidadeSolicitada, estoqueNoCD);
    elementos.formularioEntrega.reset();
    elementos.entregaPedidoId.value = pedido.id;
    elementos.entregaModo.value = "aprovar_item";
    elementos.tituloModalEntrega.textContent = "Quantidade a enviar";
    elementos.entregaResumo.textContent = `Informe a quantidade de ${item.produtoNome} que sera enviada.`;
    definirTextoBotaoConfirmarEntrega("Aprovar item");
    elementos.botaoConfirmarData.disabled = maximo === 0;
    elementos.botaoAprovarParaProducao.hidden = maximo > 0;
    elementos.mensagemEntrega.textContent = maximo === 0
        ? "Não há estoque disponível no CD para aprovar este item. Faça a entrada ou programe a produção antes de aprová-lo."
        : "";
    elementos.campoEntregaQuantidade.hidden = false;
    elementos.entregaQuantidade.required = maximo > 0;
    elementos.entregaQuantidade.disabled = maximo === 0;
    elementos.entregaQuantidade.min = "1";
    elementos.entregaQuantidade.max = String(maximo);
    elementos.entregaQuantidade.value = maximo > 0 ? String(maximo) : "";
    elementos.ajudaEntregaQuantidade.innerHTML = `Solicitado: ${formatarNumero(item.quantidadeSolicitada)} ${escaparHTML(item.unidade)}.<br>Disponível no CD: ${formatarNumero(estoqueNoCD)} ${escaparHTML(item.unidade)}.`;
    elementos.campoEntregaData.hidden = true;
    [elementos.entregaDia, elementos.entregaMes, elementos.entregaAno].forEach((campo) => {
        campo.disabled = true;
        campo.required = false;
    });
    abrirModal(elementos.modalEntrega);
    if (maximo > 0) setTimeout(() => elementos.entregaQuantidade.focus(), 0);
}

async function aprovarItemParaProducao(pedidoId) {
    const pedido = estado.pedidos.find((registro) => registro.id === pedidoId);
    const item = itensEmAcao(pedido || {}).find((registro) => (registro.situacao || pedido?.situacao) === "pendente");
    const produto = item && buscarProduto(item.produtoId);

    if (!pedido || !item || !produto || !produto.ativo) {
        elementos.mensagemEntrega.textContent = "Não foi possível preparar este item para produção.";
        return;
    }

    elementos.botaoAprovarParaProducao.disabled = true;
    elementos.mensagemEntrega.textContent = "";

    if (clienteSupabase && usuarioEhCD()) {
        const { error } = await clienteSupabase.rpc("aprovar_item_para_producao", {
            p_pedido_id: pedido.id,
            p_produto_id: item.produtoId
        });
        if (error) {
            console.error(error);
            elementos.mensagemEntrega.textContent = error.message || "Não foi possível aprovar o item para produção.";
            elementos.botaoAprovarParaProducao.disabled = false;
            return;
        }

        await carregarDadosSupabase();
        fecharModal(elementos.modalEntrega);
        const pedidoAtualizado = estado.pedidos.find((registro) => registro.id === pedido.id);
        // Reabre a mesma janela já configurada para produção acima da análise.
        // O pequeno atraso garante que o fechamento anterior seja aplicado antes
        // do cálculo da nova camada do modal.
        await new Promise((resolver) => setTimeout(resolver, 0));
        configurarModalDataPedido(pedidoAtualizado, "iniciar_producao", item.produtoId);
        return;
    }

    item.situacao = "aprovado";
    item.quantidadeEnviada = null;
    pedido.analisadoEm = new Date().toISOString();
    atualizarSituacaoDoPedido(pedido);
    salvarEstado();
    renderizarTudo();
    fecharModal(elementos.modalEntrega);
    configurarModalDataPedido(pedido, "iniciar_producao", item.produtoId);
}

function arquivarProduto(produtoId) {
    const produto = buscarProduto(produtoId);

    if (!produto) return;

    const pedidoAberto = pedidosAbertos().some((pedido) => itensDoPedido(pedido).some((item) => item.produtoId === produto.id));

    if (pedidoAberto) {
        notificar("Este produto tem pedido aberto e não pode ser arquivado agora.", "erro");
        return;
    }

    const confirmou = window.confirm(`Arquivar o produto “${produto.nome}”? O histórico será preservado.`);

    if (!confirmou) return;

    produto.ativo = false;
    produto.arquivadoEm = new Date().toISOString();
    produto.atualizadoEm = produto.arquivadoEm;
    salvarEstado();
    renderizarTudo();
    notificar("Produto arquivado. O histórico foi preservado.");
}

async function excluirProduto(produtoId) {
    if (!usuarioEhCD()) {
        notificar("Apenas administradores do CD podem excluir produtos.", "erro");
        return;
    }

    const produto = buscarProduto(produtoId);
    if (!produto) return;

    const possuiMovimentacoes = estado.movimentacoes.some((movimentacao) => movimentacao.produtoId === produto.id);
    const possuiPedidos = estado.pedidos.some((pedido) => itensDoPedido(pedido).some((item) => item.produtoId === produto.id));
    const possuiEstoqueEmFilial = Object.keys(estado.estoqueFiliais).some((chave) => chave.endsWith(`:${produto.id}`));

    if (possuiMovimentacoes || possuiPedidos || possuiEstoqueEmFilial) {
        notificar("Este produto possui histórico ou vínculo com filial. Para preservá-los, use Arquivar em vez de Excluir.", "erro");
        return;
    }

    const confirmou = window.confirm(`Excluir permanentemente o produto “${produto.nome}”? Esta ação não pode ser desfeita.`);
    if (!confirmou) return;

    if (!clienteSupabase) {
        notificar("Não foi possível conectar ao banco para excluir o produto.", "erro");
        return;
    }

    const { error } = await clienteSupabase.from("produtos").delete().eq("id", produto.id);
    if (error) {
        console.error(error);
        notificar("Não foi possível excluir o produto. Atualize a página e tente novamente.", "erro");
        return;
    }

    estado.produtos = estado.produtos.filter((item) => item.id !== produto.id);
    salvarEstado();
    renderizarTudo();
    notificar("Produto excluído permanentemente.");
}

function restaurarProduto(produtoId) {
    const produto = buscarProduto(produtoId);

    if (!produto || produto.ativo) return;

    produto.ativo = true;
    produto.arquivadoEm = null;
    produto.atualizadoEm = new Date().toISOString();
    salvarEstado();
    renderizarTudo();
    notificar("Produto restaurado ao estoque ativo.");
}

async function aprovarItemPedido(pedidoId, quantidadeSelecionada) {
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);
    const item = itensEmAcao(pedido || {}).find((registro) => (registro.situacao || pedido?.situacao) === "pendente");
    const produto = item && buscarProduto(item.produtoId);
    const quantidade = Number(quantidadeSelecionada);
    const maximoDisponivel = Math.min(item?.quantidadeSolicitada || 0, numeroInteiroNaoNegativo(produto?.quantidade));

    if (!pedido || !item || !produto || !produto.ativo || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > maximoDisponivel) {
        elementos.mensagemEntrega.textContent = maximoDisponivel > 0
            ? `Informe uma quantidade entre 1 e ${formatarNumero(maximoDisponivel)}, conforme o estoque disponível no CD.`
            : "Não há estoque disponível no CD para aprovar este item.";
        return;
    }

    if (clienteSupabase && usuarioEhCD()) {
        const { error } = await clienteSupabase.rpc("analisar_item_pedido", {
            p_pedido_id: pedido.id,
            p_produto_id: item.produtoId,
            p_acao: "aprovar",
            p_quantidade: quantidade,
            p_motivo: null
        });
        if (error) {
            console.error(error);
            elementos.mensagemEntrega.textContent = error.message || "Não foi possível aprovar o item.";
            return;
        }
        await carregarDadosSupabase();
        fecharModal(elementos.modalEntrega);
        const pedidoAtualizado = estado.pedidos.find((registro) => registro.id === pedido.id);
        const todosAnalisados = pedidoAtualizado && itensDoPedido(pedidoAtualizado).every((registro) => situacaoDoItemPedido(registro, pedidoAtualizado) !== "pendente");
        if (todosAnalisados) {
            fecharModal(elementos.modalAnalisarPedido);
            abrirModalEnviarPedido(pedido.id);
            return;
        }
        abrirModalAnalisarPedido(pedido.id);
        notificar("Item aprovado. Continue a análise dos demais itens.");
        return;
    }

    item.situacao = "aprovado";
    item.quantidadeEnviada = quantidade;
    pedido.analisadoEm = new Date().toISOString();
    salvarEstado();
    fecharModal(elementos.modalEntrega);
    renderizarTudo();
    const todosAnalisados = itensDoPedido(pedido).every((registro) => situacaoDoItemPedido(registro, pedido) !== "pendente");
    if (todosAnalisados) {
        fecharModal(elementos.modalAnalisarPedido);
        abrirModalEnviarPedido(pedido.id);
        return;
    }
    abrirModalAnalisarPedido(pedido.id);
    notificar("Item aprovado. Continue a análise dos demais itens.");
}

function abrirModalEnviarPedido(pedidoId) {
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);
    if (!pedido || itensDoPedido(pedido).some((item) => situacaoDoItemPedido(item, pedido) === "pendente")) {
        notificar("Analise todos os itens antes de enviar o pedido.", "erro");
        return;
    }
    abrirModalNovaRemessa(pedido.id);
}

function abrirModalNovaRemessa(pedidoId) {
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);
    if (!pedido || !usuarioEhCD()) return;
    const itensNaoAnalisados = itensDoPedido(pedido).some((item) => situacaoDoItemPedido(item, pedido) === "pendente");
    if (itensNaoAnalisados) {
        notificar("Analise todos os itens antes de criar uma remessa.", "erro");
        return;
    }
    const atendimento = window.PedidosUtils.calcularAtendimentoPedido(pedido, estado.remessas);
    const itensDisponiveis = atendimento.itens.filter((item) => item.pendente > 0 && situacaoDoItemPedido(item, pedido) !== "recusado");
    if (!itensDisponiveis.length) {
        notificar("Este pedido já foi totalmente expedido.", "erro");
        return;
    }
    const haSaldoParaRemessa = itensDisponiveis.some((item) => quantidadeDisponivelParaPedido(pedido, item.produtoId) > 0);
    if (!haSaldoParaRemessa) {
        configurarModalDataPedido(pedido, "iniciar_producao");
        return;
    }
    elementos.formularioRemessa.reset();
    elementos.remessaPedidoId.value = pedido.id;
    elementos.tituloModalRemessa.textContent = `Criar remessa · ${numeroPedidoParaExibicao(pedido)}`;
    elementos.remessaResumo.textContent = "Cada quantidade será validada contra o saldo pendente do pedido e o estoque atual do CD.";
    elementos.mensagemRemessa.textContent = "";
    elementos.listaItensRemessa.innerHTML = itensDisponiveis.map((item) => {
        const produto = buscarProduto(item.produtoId);
        const estoque = numeroInteiroNaoNegativo(produto?.quantidade);
        const disponivel = quantidadeDisponivelParaPedido(pedido, item.produtoId);
        const maximo = Math.min(item.pendente, disponivel);
        return `<label class="item-remessa"><strong>${escaparHTML(item.produtoNome)}</strong><span>Solicitado: ${formatarNumero(item.solicitado)} · Já enviado: ${formatarNumero(item.enviado)} · Pendente: ${formatarNumero(item.pendente)} · CD: ${formatarNumero(estoque)} · Disponível para este pedido: ${formatarNumero(disponivel)} ${escaparHTML(item.unidade)}</span><input type="number" min="0" max="${maximo}" step="1" value="${maximo}" data-remessa-produto-id="${escaparHTML(item.produtoId)}" aria-label="Quantidade de ${escaparHTML(item.produtoNome)} nesta remessa" ${maximo ? "" : "disabled"}></label>`;
    }).join("");
    abrirModal(elementos.modalRemessa);
}

async function criarRemessaDoFormulario() {
    const pedidoId = elementos.remessaPedidoId.value;
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);
    if (!pedido || !clienteSupabase) {
        elementos.mensagemRemessa.textContent = "A expedição de remessas exige conexão com o Supabase.";
        return;
    }
    const itens = [...elementos.listaItensRemessa.querySelectorAll("[data-remessa-produto-id]")]
        .map((campo) => ({ produto_id: campo.dataset.remessaProdutoId, quantidade: Number(campo.value) }))
        .filter((item) => Number.isInteger(item.quantidade) && item.quantidade > 0);
    if (!itens.length) {
        elementos.mensagemRemessa.textContent = "Informe ao menos uma quantidade para expedir.";
        return;
    }
    const { error } = await clienteSupabase.rpc("criar_remessa", {
        p_pedido_id: pedido.id,
        p_itens: itens,
        p_envio_previsto: null,
        p_entrega_prevista: elementos.remessaEntregaPrevista.value || null
    });
    if (error) {
        console.error(error);
        elementos.mensagemRemessa.textContent = error.message || "Não foi possível expedir a remessa.";
        return;
    }
    fecharModal(elementos.modalRemessa);
    await carregarDadosSupabase();
    notificar("Remessa expedida. O estoque do CD foi atualizado.");
}

async function iniciarProducaoPedido(pedidoId, prazoProducao, produtoId = "") {
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);
    if (!pedido) return;
    const detalhesAbertos = elementos.modalDetalhesPedido?.classList.contains("modal-aberto");

    const itens = produtoId ? itensDoPedido(pedido).filter((item) => item.produtoId === produtoId) : itensDoPedido(pedido);
    if (!itens.every((item) => ["aprovado", "recusado", "em_transito", "recebido", "em_producao"].includes(situacaoDoItemPedido(item, pedido)))) {
        notificar("Analise todos os itens antes de iniciar a produção.", "erro");
        return;
    }

    const pendencias = new Map(window.PedidosUtils.calcularAtendimentoPedido(pedido, estado.remessas).itens.map((item) => [item.produtoId, item.pendente]));
    const itensAprovados = itens.filter((item) => situacaoDoItemPedido(item, pedido) !== "recusado" && (pendencias.get(item.produtoId) || 0) > 0);
    if (!itensAprovados.length) {
        fecharModal(elementos.modalEntrega);
        fecharModal(elementos.modalAnalisarPedido);
        notificar("Todos os itens foram recusados.");
        return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(prazoProducao) || Number.isNaN(new Date(`${prazoProducao}T12:00:00`).getTime())) {
        elementos.mensagemEntrega.textContent = "Escolha um prazo de produção válido.";
        return;
    }

    if (clienteSupabase) {
        elementos.botaoConfirmarData.disabled = true;
        const { error } = produtoId
            ? await clienteSupabase.rpc("iniciar_producao_item_pedido", { p_pedido_id: pedido.id, p_produto_id: produtoId, p_prazo_producao: prazoProducao })
            : await clienteSupabase.rpc("iniciar_producao_pedido", { p_pedido_id: pedido.id, p_prazo_producao: prazoProducao });
        if (error) {
            console.error(error);
            elementos.mensagemEntrega.textContent = error.message || "Não foi possível iniciar a produção.";
            elementos.botaoConfirmarData.disabled = false;
            return;
        }
        itensAprovados.forEach((item) => {
            item.situacao = "em_producao";
            item.producaoPrevista = prazoProducao;
        });
        pedido.producaoPrevista = prazoProducao;
        fecharModal(elementos.modalEntrega);
        fecharModal(elementos.modalAnalisarPedido);
        if (detalhesAbertos) abrirModalDetalhesPedido(pedido.id);
        await carregarDadosSupabase();
        if (detalhesAbertos) abrirModalDetalhesPedido(pedido.id);
        notificar("Produção iniciada. Registre a entrada produzida no estoque antes de criar a próxima remessa.");
        return;
    }

    const agora = new Date().toISOString();
    itensAprovados.forEach((item) => {
        item.situacao = "em_producao";
        item.producaoPrevista = prazoProducao;
    });
    atualizarSituacaoDoPedido(pedido);
    pedido.producaoPrevista = prazoProducao;
    pedido.producaoIniciadaEm = agora;
    pedido.analisadoEm = agora;
    pedido.observacaoMatriz = `Pedido em produção. Prazo informado: ${formatarDataSimples(prazoProducao)}.`;
    salvarEstado();
    fecharModal(elementos.modalEntrega);
    fecharModal(elementos.modalAnalisarPedido);
    renderizarTudo();
    if (detalhesAbertos) abrirModalDetalhesPedido(pedido.id);
    notificar("Produção iniciada e prazo informado à filial.");
}

function enviarPedidoProduzido(pedidoId) {
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);
    const itens = pedido && itensDoPedido(pedido).filter((item) => situacaoDoItemPedido(item, pedido) === "agendado_envio");
    if (!pedido || !itens?.length) return;
    const indisponiveis = itens.filter((item) => !buscarProduto(item.produtoId) || buscarProduto(item.produtoId).quantidade < item.quantidadeEnviada);
    if (indisponiveis.length) { notificar("O estoque do CD não atende mais as quantidades aprovadas.", "erro"); return; }
    if (!window.confirm(`Confirmar o envio de ${itens.length} item(ns) para ${buscarFilial(pedido.filialId)?.nome || "a filial"}?`)) return;
    const agora = new Date().toISOString();
    itens.forEach((item) => {
        const produto = buscarProduto(item.produtoId);
        const saldoAntes = produto.quantidade;
        produto.quantidade -= item.quantidadeEnviada;
        produto.atualizadoEm = agora;
        item.situacao = "em_transito";
        registrarMovimentacao({ produto, tipo: "transferencia", quantidade: item.quantidadeEnviada, saldoAntes, saldoDepois: produto.quantidade, observacao: pedido.observacao || "Pedido enviado após a produção.", filialId: pedido.filialId, pedidoId: pedido.id });
    });
    atualizarSituacaoDoPedido(pedido);
    pedido.enviadoEm = agora;
    pedido.entregaPrevista = agora.slice(0, 10);
    pedido.observacaoMatriz = "Pedido enviado pelo CD após a produção.";
    salvarEstado();
    renderizarTudo();
    notificar("Pedido enviado para a filial.");
}

function enviarPedidoComData(pedidoId, dataEnvio) {
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);
    const itens = pedido && itensDoPedido(pedido).filter((item) => ["aprovado", "em_producao"].includes(situacaoDoItemPedido(item, pedido)));
    if (!pedido || !itens?.length) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataEnvio) || Number.isNaN(new Date(`${dataEnvio}T12:00:00`).getTime())) {
        elementos.mensagemEntrega.textContent = "Escolha uma data de envio válida.";
        return;
    }
    const indisponiveis = itens.filter((item) => (buscarProduto(item.produtoId)?.quantidade || 0) < item.quantidadeEnviada);
    if (indisponiveis.length) {
        notificar("O estoque ainda não é suficiente para enviar este pedido. Informe um prazo de produção.", "erro");
        return;
    }
    const agora = new Date().toISOString();
    itens.forEach((item) => {
        const produto = buscarProduto(item.produtoId);
        const saldoAntes = produto.quantidade;
        produto.quantidade -= item.quantidadeEnviada;
        produto.atualizadoEm = agora;
        item.situacao = "em_transito";
        registrarMovimentacao({ produto, tipo: "transferencia", quantidade: item.quantidadeEnviada, saldoAntes, saldoDepois: produto.quantidade, observacao: pedido.observacao || `Envio programado para ${formatarDataSimples(dataEnvio)}.`, filialId: pedido.filialId, pedidoId: pedido.id });
    });
    atualizarSituacaoDoPedido(pedido);
    pedido.envioPrevisto = dataEnvio;
    pedido.enviadoEm = agora;
    pedido.entregaPrevista = dataEnvio;
    pedido.observacaoMatriz = `Pedido enviado pelo CD. Data de envio: ${formatarDataSimples(dataEnvio)}.`;
    salvarEstado();
    fecharModal(elementos.modalEntrega);
    renderizarTudo();
    notificar("Envio registrado e filial informada.");
}

function aprovarPedido(pedidoId, dataEntrega, quantidadeSelecionada = null) {
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);

    if (!pedido || !itensEmAcao(pedido).some((item) => (item.situacao || pedido.situacao) === "pendente")) return;

    const itens = itensEmAcao(pedido).filter((item) => (item.situacao || pedido.situacao) === "pendente");
    const quantidadesParaEnviar = new Map(itens.map((item) => [item.produtoId, item.quantidadeSolicitada]));
    if (itens.length === 1 && quantidadeSelecionada !== null) {
        const quantidade = Number(quantidadeSelecionada);
        const item = itens[0];
        const produto = buscarProduto(item.produtoId);
        if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > item.quantidadeSolicitada || quantidade > (produto?.quantidade || 0)) {
            elementos.mensagemEntrega.textContent = "Informe uma quantidade disponível entre 1 e o total solicitado.";
            return;
        }
        quantidadesParaEnviar.set(item.produtoId, quantidade);
    }

    const itensIndisponiveis = itens.filter((item) => {
        const produto = buscarProduto(item.produtoId);
        return !produto || !produto.ativo || produto.quantidade < quantidadesParaEnviar.get(item.produtoId);
    });

    if (itensIndisponiveis.length) {
        notificar("O CD não possui saldo suficiente para todos os itens. Inicie a produção antes de agendar o envio.", "erro");
        return;
    }

    const filial = buscarFilial(pedido.filialId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataEntrega) || Number.isNaN(new Date(`${dataEntrega}T12:00:00`).getTime())) {
        elementos.mensagemEntrega.textContent = "Escolha uma data de entrega válida.";
        return;
    }

    const confirmou = window.confirm(`Aprovar o envio de ${itens.length} item(ns) para ${filial?.nome || "a filial"} com entrega prevista em ${formatarDataSimples(dataEntrega)}?`);

    if (!confirmou) return;

    itens.forEach((item) => {
        item.situacao = "em_transito";
        item.quantidadeEnviada = quantidadesParaEnviar.get(item.produtoId);
    });
    atualizarSituacaoDoPedido(pedido);
    pedido.entregaPrevista = dataEntrega;
    pedido.recebidoEm = null;
    pedido.analisadoEm = new Date().toISOString();
    pedido.observacaoMatriz = `Pedido aprovado. Entrega prevista: ${formatarDataSimples(dataEntrega)}.`;

    itens.forEach((item) => {
        const produto = buscarProduto(item.produtoId);
        const saldoAntes = produto.quantidade;

        produto.quantidade -= item.quantidadeEnviada;
        produto.atualizadoEm = new Date().toISOString();

        registrarMovimentacao({
            produto,
            tipo: "transferencia",
            quantidade: item.quantidadeEnviada,
            saldoAntes,
            saldoDepois: produto.quantidade,
            observacao: pedido.observacao || `Envio aprovado para entrega em ${formatarDataSimples(dataEntrega)}.`,
            filialId: pedido.filialId,
            pedidoId: pedido.id
        });
    });

    salvarEstado();
    fecharModal(elementos.modalEntrega);
    renderizarTudo();
    notificar("Pedido aprovado. Estoque do CD baixado e entrega informada à filial.");
}

function abrirModalConfirmarRecebimento(pedidoId) {
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);
    const filial = filialAtual();
    if (!pedido || pedido.situacao !== "em_transito" || !filial || pedido.filialId !== filial.id) return;

    const itensEnviados = itensDoPedido(pedido).filter((item) => (item.situacao || pedido.situacao) === "em_transito");
    if (!itensEnviados.length) return;

    pedidoEmConfirmacaoId = pedido.id;
    elementos.listaConfirmacaoRecebimento.innerHTML = renderizarItensAgrupadosPorCategoria(itensDoPedido(pedido), (item) => {
        const situacao = item.situacao || pedido.situacao;
        const enviado = situacao === "em_transito";
        const descricao = enviado
            ? "Enviado pelo CD — confirme o recebimento deste item."
            : `Não será enviado: ${item.observacaoMatriz || "item cancelado pelo CD."}`;
        return `<article class="item-analise-pedido"><div class="item-analise-informacoes"><strong>${escaparHTML(item.produtoNome)}</strong><span>Solicitado: ${formatarNumero(item.quantidadeSolicitada)} ${escaparHTML(item.unidade)}</span><span>${escaparHTML(descricao)}</span></div><div class="item-analise-acoes"><span class="selo-tipo ${classeSituacaoPedido(situacao)}">${enviado ? "Enviado" : textoSituacaoPedido(situacao)}</span></div></article>`;
    }, "grupo-itens-categoria-confirmacao");
    abrirModal(elementos.modalConfirmarRecebimento);
}

function renderizarItensDaRemessa(remessa) {
    return `<div class="itens-remessa-detalhe">${remessa.itens.map((item) => `
        <span><strong>${escaparHTML(buscarProduto(item.produtoId)?.nome || "Produto")}</strong><b>${formatarNumero(item.quantidade)}</b></span>
    `).join("")}</div>`;
}

function abrirModalDetalhesPedido(pedidoId) {
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);
    const filial = filialAtual();
    if (!pedido || (!usuarioEhCD() && (!filial || pedido.filialId !== filial.id))) return;

    elementos.tituloModalDetalhesPedido.textContent = `Pedido ${numeroPedidoParaExibicao(pedido)} · ${formatarData(pedido.criadoEm)}`;
    elementos.resumoDetalhesPedido.textContent = pedido.observacao || "Sem observação geral.";
    elementos.listaDetalhesPedido.innerHTML = renderizarItensAgrupadosPorCategoria(itensDoPedido(pedido), (item) => {
        const situacao = item.situacao || pedido.situacao || "pendente";
        const atendimentoItem = window.PedidosUtils.calcularAtendimentoPedido(pedido, estado.remessas).itens.find((registro) => registro.produtoId === item.produtoId);
        const foiEnviado = (atendimentoItem?.enviado || 0) > 0;
        const quantidadePendente = atendimentoItem?.pendente || 0;
        const saldoEncerrado = atendimentoItem?.encerrado || 0;
        const disponibilidade = quantidadeDisponivelParaPedido(pedido, item.produtoId);
        const envioParcial = foiEnviado && quantidadePendente > 0;
        const statusItem = statusExibicaoItemPedido(pedido, item);
        // Produção é uma decisão posterior à aprovação do CD. Um pedido ainda
        // pendente pode indicar falta de saldo, mas não deve exibir uma ação que
        // permita programá-lo antes de ter sido analisado.
        // Um envio parcial não encerra a necessidade de produção do saldo.
        // O item em trânsito também pode ter o restante programado separadamente.
        const itemAprovadoParaProducao = ["aprovado", "em_producao", "em_transito"].includes(situacao);
        const precisaProducao = usuarioEhCD() && !estaNoPortalFilial() && itemAprovadoParaProducao && quantidadePendente > disponibilidade;
        const producaoProgramada = itemAprovadoParaProducao && Boolean(item.producaoPrevista) && quantidadePendente > 0;
        const acaoProducao = (precisaProducao || producaoProgramada)
            ? producaoProgramada
                ? `<button type="button" class="botao-acao botao-producao-programada" disabled>Produção programada<br><small>Prevista para ${formatarDataSimples(item.producaoPrevista)}</small></button>`
                : `<button type="button" class="botao-acao acao-aprovar" data-acao="iniciar-producao-item" data-pedido-id="${pedido.id}" data-produto-id="${item.produtoId}">Programar produção<br><small>Faltam ${formatarNumero(quantidadePendente - disponibilidade)}</small></button>`
            : "";
        const acaoEncerrarSaldo = usuarioEhCD() && !estaNoPortalFilial() && foiEnviado && quantidadePendente > 0
            ? `<button type="button" class="botao-acao acao-perigo" data-acao="encerrar-saldo-item" data-pedido-id="${pedido.id}" data-produto-id="${item.produtoId}">Encerrar saldo restante<br><small>Faltam ${formatarNumero(quantidadePendente)}</small></button>`
            : "";
        const confirmadoEm = atendimentoItem?.totalmenteRecebido ? (atendimentoItem.recebidoEm || pedido.recebidoEm) : null;
        const descricao = foiEnviado
            ? situacao === "recebido" ? "Recebido pela filial." : "Enviado pelo CD e aguardando confirmação."
            : {
                recusado: "Não enviado: item recusado pelo CD.",
                em_producao: item.producaoPrevista ? `Em produção no CD. Previsão: ${formatarDataSimples(item.producaoPrevista)}.` : "Em produção no CD. Previsão ainda não informada.",
                agendado_envio: "Envio agendado pelo CD. Aguarde a confirmação de despacho.",
                pendente: "Não enviado: aguardando análise do CD."
            }[situacao] || "Não enviado pelo CD.";
        return `
            <article class="item-detalhes-pedido">
                <div>
                    <strong>${escaparHTML(item.produtoNome)}</strong>
                    ${resumoQuantidadesItemPedido(pedido, item, { mostrarEstoqueFilial: true, mostrarDisponivelCD: !estaNoPortalFilial() })}
                    <span>${escaparHTML(descricao)}</span>
                </div>
                <div class="acoes-item-detalhes">
                    <span class="selo-tipo ${statusItem.classe}">${statusItem.texto}</span>
                    ${saldoEncerrado > 0 ? `<span class="data-recebimento-item">Atendido parcialmente</span>` : ""}
                    ${confirmadoEm ? `<span class="data-recebimento-item">Confirmado em<br>${formatarData(confirmadoEm)}</span>` : ""}
                    ${acaoProducao}
                    ${acaoEncerrarSaldo}
                </div>
            </article>
        `;
    }, "grupo-itens-categoria-detalhes");
    const remessas = [...window.PedidosUtils.calcularAtendimentoPedido(pedido, estado.remessas).remessas]
        .sort((a, b) => new Date(a.enviadaEm || 0) - new Date(b.enviadaEm || 0));
    if (remessas.length) {
        elementos.listaDetalhesPedido.innerHTML = `<section class="grupo-itens-categoria grupo-itens-categoria-resumo"><h4>Remessas <span>${remessas.length}</span></h4><div class="lista-itens-categoria">${remessas.map((remessa, indice) => `<article class="item-pedido-resumo"><strong>Remessa ${indice + 1} · ${remessa.situacao === "recebida" ? "Recebida" : remessa.situacao === "cancelada" ? "Cancelada" : "Em trânsito"}</strong>${renderizarItensDaRemessa(remessa)}<span>Enviada em ${formatarData(remessa.enviadaEm)}${remessa.recebidaEm ? ` · Recebida em ${formatarData(remessa.recebidaEm)}` : ""}</span>${remessa.situacao === "em_transito" ? `${usuarioEhCD() && !estaNoPortalFilial() ? `<button type="button" class="botao-acao acao-perigo" data-acao="cancelar-remessa" data-remessa-id="${remessa.id}" data-pedido-id="${pedido.id}">Cancelar remessa</button>` : ""}${podeConfirmarRecebimento(pedido) ? `<button type="button" class="botao-acao acao-aprovar" data-acao="confirmar-remessa" data-remessa-id="${remessa.id}" data-pedido-id="${pedido.id}"><span class="icone icone-check" aria-hidden="true"></span>Confirmar recebimento</button>` : ""}` : ""}</article>`).join("")}</div></section>` + elementos.listaDetalhesPedido.innerHTML;
    }
    const eventos = estado.eventosPedido.filter((evento) => evento.pedidoId === pedido.id).sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
    if (eventos.length) elementos.listaDetalhesPedido.innerHTML += `<section class="grupo-itens-categoria grupo-itens-categoria-resumo grupo-historico-pedido"><h4>Histórico <span>${eventos.length} eventos</span></h4><div class="lista-itens-categoria">${eventos.map((evento) => `<article class="item-pedido-resumo"><strong>${escaparHTML(textoEventoPedido(evento.tipo))}</strong><span>${formatarData(evento.criadoEm)}</span></article>`).join("")}</div></section>`;
    abrirModal(elementos.modalDetalhesPedido);
}

function textoEventoPedido(tipo) {
    return { pedido_criado: "Pedido criado", pedido_status_alterado: "Status do pedido atualizado", remessa_expedida: "Remessa expedida", remessa_recebida: "Recebimento de remessa confirmado", remessa_cancelada: "Remessa cancelada" }[tipo] || "Evento do pedido";
}

async function confirmarRecebimentoRemessa(remessaId, pedidoId) {
    if (!clienteSupabase) return;
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);
    if (!podeConfirmarRecebimento(pedido)) {
        notificar("Somente a filial destinatária pode confirmar esta remessa.", "erro");
        return;
    }
    const { error } = await clienteSupabase.rpc("confirmar_recebimento_remessa", { p_remessa_id: remessaId });
    if (error) {
        console.error(error);
        notificar(`Não foi possível confirmar a remessa: ${error.message}`, "erro");
        return;
    }
    await carregarDadosSupabase();
    abrirModalDetalhesPedido(pedidoId);
    notificar("Recebimento da remessa confirmado.");
}

function abrirModalCancelarRemessa(remessaId, pedidoId) {
    const remessa = estado.remessas.find((registro) => registro.id === remessaId);
    const pedido = estado.pedidos.find((registro) => registro.id === pedidoId);
    if (!clienteSupabase || !usuarioEhCD() || !remessa || !pedido || remessa.situacao !== "em_transito") return;

    const itens = itensDoPedido(pedido);
    const remessasAtivas = estado.remessas.filter((registro) => registro.pedidoId === pedido.id && registro.situacao !== "cancelada");
    const cancelarPedidoCompleto = itens.length === 1 && remessasAtivas.length === 1;
    const outrosItens = itens.filter((item) => !remessa.itens.some((itemRemessa) => itemRemessa.produtoId === item.produtoId));
    const itensEmAndamento = outrosItens.filter((item) => !["recebido", "recusado"].includes(situacaoDoItemPedido(item, pedido)));

    elementos.formularioCancelarRemessa.reset();
    elementos.cancelarRemessaId.value = remessaId;
    elementos.cancelarRemessaPedidoId.value = pedidoId;
    elementos.cancelarRemessaPedidoCompleto.value = String(cancelarPedidoCompleto);
    elementos.resumoCancelarRemessa.textContent = cancelarPedidoCompleto
        ? "Este pedido possui apenas um item e esta é a única remessa ativa. Ao confirmar, a remessa e o pedido serão cancelados. O estoque retornará ao CD."
        : `Apenas esta remessa será cancelada e seu estoque retornará ao CD. O pedido continuará ativo${itensEmAndamento.length ? ` com ${itensEmAndamento.length} outro(s) item(ns) em andamento` : ""}; nenhum outro item será cancelado.`;
    elementos.mensagemCancelarRemessa.textContent = "";
    abrirModal(elementos.modalCancelarRemessa);
    setTimeout(() => elementos.motivoCancelarRemessa.focus(), 0);
}

async function cancelarRemessa(remessaId, pedidoId, motivo, cancelarPedidoCompleto = false) {
    if (!clienteSupabase || !usuarioEhCD()) return;
    const { error } = await clienteSupabase.rpc("cancelar_remessa", {
        p_remessa_id: remessaId,
        p_motivo: motivo,
        p_cancelar_pedido: cancelarPedidoCompleto
    });
    if (error) {
        console.error(error);
        elementos.mensagemCancelarRemessa.textContent = error.message || "Não foi possível cancelar a remessa.";
        return;
    }
    fecharModal(elementos.modalCancelarRemessa);
    await carregarDadosSupabase();
    abrirModalDetalhesPedido(pedidoId);
    notificar("Remessa cancelada e estoque estornado ao CD.");
}

async function confirmarRecebimentoItem(pedidoId, produtoId) {
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);
    const filial = filialAtual();
    const item = pedido && itensDoPedido(pedido).find((registro) => registro.produtoId === produtoId);
    if (!pedido || !item || (item.situacao || pedido.situacao) !== "em_transito" || !filial || pedido.filialId !== filial.id) return;

    if (clienteSupabase) {
        const { error } = await clienteSupabase.rpc("confirmar_recebimento_item_pedido", { p_pedido_id: pedido.id, p_produto_id: item.produtoId });
        if (error) {
            console.error(error);
            notificar(`Não foi possível confirmar o item: ${error.message}`, "erro");
            return;
        }
        await carregarDadosSupabase();
        abrirModalDetalhesPedido(pedido.id);
        notificar("Recebimento do item confirmado.");
        return;
    }

    const produto = buscarProduto(item.produtoId);
    if (!produto) return;
    const agora = new Date().toISOString();
    const chave = chaveEstoqueFilial(pedido.filialId, produto.id);
    const registroAtual = estado.estoqueFiliais[chave];
    const saldoAtual = numeroInteiroNaoNegativo(registroAtual?.quantidade ?? registroAtual ?? item.estoqueInformado);
    estado.estoqueFiliais[chave] = { quantidade: saldoAtual + (item.quantidadeEnviada || item.quantidadeSolicitada), atualizadoEm: agora };
    item.situacao = "recebido";
    item.recebidoEm = agora;
    atualizarSituacaoDoPedido(pedido);
    if (pedido.situacao === "recebido") {
        pedido.recebidoEm = agora;
        pedido.observacaoMatriz = pedido.observacaoMatriz || "Todos os itens enviados foram recebidos pela filial.";
    }
    salvarEstado();
    renderizarTudo();
    abrirModalDetalhesPedido(pedido.id);
    notificar("Recebimento do item confirmado.");
}

async function confirmarItensEnviados(pedidoId) {
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);
    const filial = filialAtual();
    if (!pedido || pedido.situacao !== "em_transito" || !filial || pedido.filialId !== filial.id) return;

    if (clienteSupabase) {
        const { error } = await clienteSupabase.rpc("confirmar_recebimento_pedido", { p_pedido_id: pedido.id });
        if (error) {
            console.error(error);
            notificar(`Não foi possível confirmar o recebimento: ${error.message}`, "erro");
            return;
        }

        fecharModal(elementos.modalConfirmarRecebimento);
        pedidoEmConfirmacaoId = "";
        await carregarDadosSupabase();
        notificar("Recebimento dos itens enviados confirmado.");
        return;
    }

    const agora = new Date().toISOString();
    itensDoPedido(pedido).filter((item) => (item.situacao || pedido.situacao) === "em_transito").forEach((item) => {
        const produto = buscarProduto(item.produtoId);
        if (!produto) return;
        const chave = chaveEstoqueFilial(pedido.filialId, produto.id);
        const registroAtual = estado.estoqueFiliais[chave];
        const saldoAtual = numeroInteiroNaoNegativo(registroAtual?.quantidade ?? registroAtual ?? item.estoqueInformado);
        estado.estoqueFiliais[chave] = { quantidade: saldoAtual + item.quantidadeSolicitada, atualizadoEm: agora };
        item.situacao = "recebido";
    });

    atualizarSituacaoDoPedido(pedido);
    pedido.recebidoEm = agora;
    pedido.observacaoMatriz = pedido.observacaoMatriz || "Pedido recebido pela filial.";
    salvarEstado();
    fecharModal(elementos.modalConfirmarRecebimento);
    pedidoEmConfirmacaoId = "";
    renderizarTudo();
    notificar("Recebimento dos itens enviados confirmado.");
}

function confirmarRecebimentoPedido(pedidoId) {
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);
    const filial = filialAtual();

    if (!pedido || pedido.situacao !== "em_transito" || !filial || pedido.filialId !== filial.id) return;

    const confirmou = window.confirm("Confirmar que todos os produtos deste pedido chegaram na filial?");

    if (!confirmou) return;

    const agora = new Date().toISOString();

    itensDoPedido(pedido).filter((item) => (item.situacao || pedido.situacao) === "em_transito").forEach((item) => {
        const produto = buscarProduto(item.produtoId);
        if (!produto) return;

        const chave = chaveEstoqueFilial(pedido.filialId, produto.id);
        const registroAtual = estado.estoqueFiliais[chave];
        const saldoAtual = numeroInteiroNaoNegativo(registroAtual?.quantidade ?? registroAtual ?? item.estoqueInformado);

        estado.estoqueFiliais[chave] = {
            quantidade: saldoAtual + item.quantidadeSolicitada,
            atualizadoEm: agora
        };
    });

    itensDoPedido(pedido).filter((item) => (item.situacao || pedido.situacao) === "em_transito").forEach((item) => { item.situacao = "recebido"; });
    atualizarSituacaoDoPedido(pedido);
    pedido.recebidoEm = agora;
    pedido.observacaoMatriz = pedido.observacaoMatriz || "Pedido recebido pela filial.";
    salvarEstado();
    renderizarTudo();
    notificar("Recebimento confirmado. Estoque da filial atualizado.");
}

async function recusarPedido(pedidoId) {
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);

    if (!pedido || pedido.situacao !== "pendente") return;

    const motivo = window.prompt("Informe o motivo da recusa:");

    if (motivo === null) return;

    const observacaoMatriz = motivo.trim() || "Pedido recusado pelo CD.";
    const analisadoEm = new Date().toISOString();

    if (clienteSupabase && usuarioEhCD()) {
        const { data, error } = await clienteSupabase.from("pedidos")
            .update({
                situacao: "recusado",
                observacao_matriz: observacaoMatriz,
                analisado_em: analisadoEm,
                atualizado_em: analisadoEm
            })
            .eq("id", pedido.id)
            .eq("atualizado_em", pedido.atualizadoEm)
            .select("id");

        if (error) {
            console.error(error);
            notificar(`Não foi possível recusar o pedido: ${error.message}`, "erro");
            return;
        }

        if (!data?.length) {
            await carregarDadosSupabase();
            notificar("O pedido foi alterado por outra sessão. Os dados foram atualizados; tente novamente.", "erro");
            return;
        }

        await carregarDadosSupabase();
        notificar("Pedido recusado.");
        return;
    }

    pedido.situacao = "recusado";
    pedido.observacaoMatriz = observacaoMatriz;
    pedido.analisadoEm = analisadoEm;
    salvarEstado();
    renderizarTudo();
    notificar("Pedido recusado.");
}

function abrirModalRecusarItem(pedidoId, produtoId) {
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);
    const item = pedido && itensDoPedido(pedido).find((registro) => String(registro.produtoId) === String(produtoId));

    if (!pedido || !item || situacaoDoItemPedido(item, pedido) !== "pendente") {
        notificar("Este item já foi analisado ou não está mais disponível para recusa.", "erro");
        return;
    }

    elementos.formularioRecusarItem.reset();
    elementos.recusaPedidoId.value = pedido.id;
    elementos.recusaProdutoId.value = item.produtoId;
    elementos.tituloModalRecusarItem.textContent = "Recusar item";
    elementos.resumoRecusarItem.textContent = `Informe o motivo da recusa de ${item.produtoNome}. A filial poderá visualizar esta informação.`;
    elementos.mensagemRecusarItem.textContent = "";
    abrirModal(elementos.modalRecusarItem);
    setTimeout(() => elementos.motivoRecusarItem.focus(), 0);
}

async function recusarItemPedido(pedidoId, produtoId, motivo) {
    const pedido = estado.pedidos.find((item) => item.id === pedidoId);
    if (!pedido) {
        notificar("Não foi possível localizar o pedido. Atualize a página e tente novamente.", "erro");
        return;
    }

    const item = itensDoPedido(pedido).find((registro) => String(registro.produtoId) === String(produtoId));
    if (!item) {
        notificar("Não foi possível localizar o item do pedido. Atualize a página e tente novamente.", "erro");
        return;
    }

    const situacao = item.situacao || pedido.situacao || "pendente";
    if (situacao !== "pendente") {
        notificar("Este item já foi analisado e não pode ser recusado.", "erro");
        return;
    }

    const observacaoMatriz = motivo.trim() || "Item recusado pelo CD.";

    if (clienteSupabase && usuarioEhCD()) {
        const { error } = await clienteSupabase.rpc("analisar_item_pedido", {
            p_pedido_id: pedido.id,
            p_produto_id: item.produtoId,
            p_acao: "recusar",
            p_quantidade: null,
            p_motivo: observacaoMatriz
        });
        if (error) {
            console.error(error);
            notificar(`Não foi possível recusar o item: ${error.message}`, "erro");
            return;
        }

        await carregarDadosSupabase();
        fecharModal(elementos.modalRecusarItem);
        abrirModalAnalisarPedido(pedido.id);
        notificar("Item recusado.");
        return;
    }

    item.situacao = "recusado";
    item.observacaoMatriz = observacaoMatriz;
    atualizarSituacaoDoPedido(pedido);
    salvarEstado();
    renderizarTudo();
    fecharModal(elementos.modalRecusarItem);
    abrirModalAnalisarPedido(pedido.id);
    notificar("Item recusado.");
}

function abrirModalEncerrarSaldoItem(pedidoId, produtoId) {
    const pedido = estado.pedidos.find((registro) => registro.id === pedidoId);
    const item = pedido && itensDoPedido(pedido).find((registro) => registro.produtoId === produtoId);
    const atendimento = pedido && window.PedidosUtils.calcularAtendimentoPedido(pedido, estado.remessas).itens.find((registro) => registro.produtoId === produtoId);
    const saldo = atendimento?.pendente || 0;
    if (!pedido || !item || (atendimento?.enviado || 0) === 0 || saldo === 0 || !usuarioEhCD()) {
        notificar("Este item não possui saldo enviado parcialmente disponível para encerramento.", "erro");
        return;
    }
    elementos.formularioEncerrarSaldoItem.reset();
    elementos.encerrarSaldoPedidoId.value = pedido.id;
    elementos.encerrarSaldoProdutoId.value = item.produtoId;
    elementos.resumoEncerrarSaldoItem.textContent = `Serão mantidas as ${formatarNumero(atendimento.enviado)} ${item.unidade}(s) já enviadas. O saldo de ${formatarNumero(saldo)} ${item.unidade}(s) não será produzido nem enviado para a filial.`;
    elementos.mensagemEncerrarSaldoItem.textContent = "";
    abrirModal(elementos.modalEncerrarSaldoItem);
    setTimeout(() => elementos.motivoEncerrarSaldoItem.focus(), 0);
}

async function encerrarSaldoItemPedido(pedidoId, produtoId, motivo) {
    if (!clienteSupabase || !usuarioEhCD()) return;
    const { error } = await clienteSupabase.rpc("encerrar_saldo_item_pedido", { p_pedido_id: pedidoId, p_produto_id: produtoId, p_motivo: motivo });
    if (error) {
        console.error(error);
        elementos.mensagemEncerrarSaldoItem.textContent = error.message || "Não foi possível encerrar o saldo deste item.";
        return;
    }
    fecharModal(elementos.modalEncerrarSaldoItem);
    await carregarDadosSupabase();
    abrirModalDetalhesPedido(pedidoId);
    notificar("Saldo restante encerrado. As unidades já enviadas foram preservadas.");
}

function exportarBackup() {
    const backup = {
        ...estado,
        exportadoEm: new Date().toISOString(),
        aplicacao: "Estoque Therapeutica"
    };
    const arquivo = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    const data = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `backup-therapeutica-${data}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notificar("Backup baixado com sucesso.");
}

async function importarBackup(evento) {
    const arquivo = evento.target.files?.[0];

    if (!arquivo) return;

    try {
        const conteudo = await arquivo.text();
        const dados = JSON.parse(conteudo);

        if (!dados || typeof dados !== "object") {
            throw new Error("Arquivo inválido");
        }

        const confirmou = window.confirm("Importar este backup substituirá os dados atuais deste navegador. Deseja continuar?");

        if (!confirmou) return;

        estado = normalizarEstado(dados);
        salvarEstado();

        renderizarTudo();
        navegar("dashboard");
        notificar("Backup importado com sucesso.");
    } catch {
        notificar("Não foi possível importar esse arquivo JSON.", "erro");
    } finally {
        evento.target.value = "";
    }
}

function carregarDadosDemo() {
    const confirmou = window.confirm("Carregar dados de demonstração? Isso substituirá produtos, pedidos e histórico salvos neste navegador.");

    if (!confirmou) return;

    estado = criarEstadoDemo();
    salvarEstado();
    produtoSelecionadoMovimentacao = "";
    itensDoPedidoAtual = [];

    renderizarTudo();
    navegar("dashboard");
    notificar("Dados de demonstração carregados.");
}

function lidarComAcao(acao, elemento) {
    switch (acao) {
        case "novo-produto":
            abrirModalProduto();
            break;
        case "nova-entrada":
            navegar("movimentacao", { tipoMovimentacao: "entrada" });
            break;
        case "ver-historico":
            navegar("historico");
            break;
        case "ver-alertas":
            navegar("estoque-baixo");
            break;
        case "ver-itens-em-producao":
            abrirModalItensEmProducao();
            break;
        case "movimentar":
            navegar("movimentacao", {
                tipoMovimentacao: elemento.dataset.tipo,
                produtoId: elemento.dataset.produtoId
            });
            break;
        case "editar-produto":
            abrirModalProduto(elemento.dataset.produtoId);
            break;
        case "editar-categoria":
            editarCategoria(elemento.dataset.categoria);
            break;
        case "excluir-categoria":
            excluirCategoria(elemento.dataset.categoria);
            break;
        case "editar-unidade":
            editarUnidade(elemento.dataset.unidade);
            break;
        case "excluir-unidade":
            excluirUnidade(elemento.dataset.unidade);
            break;
        case "editar-usuario":
            abrirModalUsuario(elemento.dataset.usuarioId);
            break;
        case "novo-usuario":
            abrirModalNovoUsuario();
            break;
        case "nova-categoria":
            abrirModalCategoria();
            break;
        case "nova-unidade":
            abrirModalUnidade();
            break;
        case "excluir-usuario":
            excluirUsuario(elemento.dataset.usuarioId);
            break;
        case "arquivar-produto":
            arquivarProduto(elemento.dataset.produtoId);
            break;
        case "excluir-produto":
            excluirProduto(elemento.dataset.produtoId);
            break;
        case "restaurar-produto":
            restaurarProduto(elemento.dataset.produtoId);
            break;
        case "novo-pedido":
            abrirModalPedido();
            break;
        case "novo-pedido-filial":
            abrirModalPedido(elemento.dataset.filialId);
            break;
        case "abrir-portal-filial":
            portalAtual = elemento.dataset.filialId;
            elementos.seletorPortal.value = portalAtual;
            itensDoPedidoAtual = [];
            navegar("portal-filial");
            break;
        case "consultar-estoque-filial":
            abrirModalEstoqueFilial(elemento.dataset.filialId);
            break;
        case "abrir-novo-pedido-filial":
            navegar("novo-pedido-filial");
            break;
        case "remover-item-pedido":
            itensDoPedidoAtual.splice(Number(elemento.dataset.indiceItem), 1);
            renderizarCarrinhoPedido();
            break;
        case "analisar-pedido":
            abrirModalAnalisarPedido(elemento.dataset.pedidoId);
            break;
        case "consultar-pedido":
            abrirModalDetalhesPedido(elemento.dataset.pedidoId);
            break;
        case "criar-remessa":
            abrirModalNovaRemessa(elemento.dataset.pedidoId);
            break;
        case "iniciar-producao-pedido":
            configurarModalDataPedido(estado.pedidos.find((pedido) => pedido.id === elemento.dataset.pedidoId), "iniciar_producao");
            break;
        case "iniciar-producao-item":
            configurarModalDataPedido(estado.pedidos.find((pedido) => pedido.id === elemento.dataset.pedidoId), "iniciar_producao", elemento.dataset.produtoId);
            break;
        case "enviar-pedido-produzido":
            enviarPedidoProduzido(elemento.dataset.pedidoId);
            break;
        case "agendar-envio-pedido":
            configurarModalDataPedido(estado.pedidos.find((pedido) => pedido.id === elemento.dataset.pedidoId), "enviar_pedido");
            break;
        case "aprovar-item-pedido":
    itensSelecionadosPedido = [elemento.dataset.produtoId];
            abrirModalEntrega(elemento.dataset.pedidoId);
            break;
        case "recusar-item-pedido":
            abrirModalRecusarItem(elemento.dataset.pedidoId, elemento.dataset.produtoId);
            break;
        case "aprovar-pedido":
            abrirModalEntrega(elemento.dataset.pedidoId);
            break;
        case "confirmar-recebimento-item":
            confirmarRecebimentoItem(elemento.dataset.pedidoId, elemento.dataset.produtoId);
            break;
        case "confirmar-remessa":
            confirmarRecebimentoRemessa(elemento.dataset.remessaId, elemento.dataset.pedidoId);
            break;
        case "cancelar-remessa":
            abrirModalCancelarRemessa(elemento.dataset.remessaId, elemento.dataset.pedidoId);
            break;
        case "encerrar-saldo-item":
            abrirModalEncerrarSaldoItem(elemento.dataset.pedidoId, elemento.dataset.produtoId);
            break;
        case "ver-detalhes-pedido":
            abrirModalDetalhesPedido(elemento.dataset.pedidoId);
            break;
        case "relatorio-filtrar-status":
            filtrosRelatorio.status = elemento.dataset.status || "";
            renderizarRelatorios();
            break;
        case "relatorio-filtrar-filial":
            filtrosRelatorio.filialId = elemento.dataset.filialId || "";
            renderizarRelatorios();
            break;
        case "relatorio-filtrar-produto":
            filtrosRelatorio.produtoId = elemento.dataset.produtoId || "";
            renderizarRelatorios();
            break;
        case "ver-saidas-calendario":
            abrirModalSaidasCalendario(elemento.dataset.dataSaidas || "");
            break;
        case "relatorio-ver-pedido": {
            const pedido = estado.pedidos.find((item) => item.id === elemento.dataset.pedidoId);
            if (!pedido) break;
            portalAtual = pedido.filialId;
            elementos.seletorPortal.value = portalAtual;
            navegar("portal-filial");
            abrirModalDetalhesPedido(pedido.id);
            break;
        }
        case "recusar-pedido":
            recusarPedido(elemento.dataset.pedidoId);
            break;
        default:
            break;
    }
}

elementos.navegacao.forEach((item) => {
    item.addEventListener("click", () => {
        if (item === elementos.botaoConfiguracoes) return;
        navegar(item.dataset.pagina, { tipoMovimentacao: item.dataset.tipoMovimentacao });
    });
});

elementos.botaoConfiguracoes.addEventListener("click", () => {
    const aberto = !elementos.submenuConfiguracoes.hidden;
    elementos.submenuConfiguracoes.hidden = aberto;
    elementos.botaoConfiguracoes.setAttribute("aria-expanded", String(!aberto));
});

elementos.botaoRecolherMenu?.addEventListener("click", () => {
    const reduzido = !elementos.menuLateral.classList.contains("menu-reduzido");
    atualizarMenuLateral(reduzido);
    try {
        localStorage.setItem(MENU_REDUZIDO_STORAGE_KEY, String(reduzido));
    } catch {
        // O menu continua funcionando quando o armazenamento local não estiver disponível.
    }
});

elementos.botaoMenuMobile?.addEventListener("click", () => {
    const aberto = !elementos.menuLateral.classList.contains("menu-mobile-aberto");
    elementos.menuLateral.classList.toggle("menu-mobile-aberto", aberto);
    elementos.botaoMenuMobile.setAttribute("aria-expanded", String(aberto));
    fecharSeletorMobile();
});

elementos.botaoSeletorMobile?.addEventListener("click", () => {
    const aberto = elementos.painelSeletorMobile.hidden;
    elementos.painelSeletorMobile.hidden = !aberto;
    elementos.botaoSeletorMobile.setAttribute("aria-expanded", String(aberto));
    sincronizarSeletorPortalMobile();
    fecharMenuMobile();
    fecharPerfilMobile();
});

elementos.botaoPerfilMobile?.addEventListener("click", () => {
    const aberto = elementos.painelPerfilMobile.hidden;
    elementos.painelPerfilMobile.hidden = !aberto;
    elementos.botaoPerfilMobile.setAttribute("aria-expanded", String(aberto));
    fecharSeletorMobile();
    fecharMenuMobile();
});

elementos.botaoAlterarSenhaMobile?.addEventListener("click", () => {
    fecharPerfilMobile();
    elementos.botaoAlterarSenha.click();
});

elementos.botaoSairMobile?.addEventListener("click", () => {
    elementos.botaoSair.click();
});

elementos.seletorPortalMobile?.addEventListener("change", () => {
    elementos.seletorPortal.value = elementos.seletorPortalMobile.value;
    elementos.seletorPortal.dispatchEvent(new Event("change", { bubbles: true }));
    fecharSeletorMobile();
});

document.addEventListener("click", (evento) => {
    const fechar = evento.target.closest("[data-fechar-modal]");

    if (fechar) {
        const modal = document.querySelector(`#${fechar.dataset.fecharModal}`);
        if (modal) fecharModal(modal);
        return;
    }

    const botaoAcao = evento.target.closest("[data-acao]");
    if (botaoAcao) {
        lidarComAcao(botaoAcao.dataset.acao, botaoAcao);
    }

    if (!evento.target.closest("#menu-perfil")) fecharMenuPerfil();
    if (!evento.target.closest(".cabecalho-mobile")) fecharSeletorMobile();
    if (!evento.target.closest(".cabecalho-mobile")) fecharPerfilMobile();
    if (!evento.target.closest(".menu-lateral") && !evento.target.closest("#botao-menu-mobile")) fecharMenuMobile();
});

[elementos.modalProduto, elementos.modalPedido, elementos.modalEntrega, elementos.modalAnalisarPedido, elementos.modalRecusarItem, elementos.modalEncerrarSaldoItem, elementos.modalCancelarRemessa, elementos.modalRemessa, elementos.modalUsuario, elementos.modalAlterarSenha, elementos.modalEstoqueFilial, elementos.modalDetalhesPedido, elementos.modalItensEmProducao].forEach((modal) => {
    modal.addEventListener("click", (evento) => {
        if (evento.target === modal) fecharModal(modal);
    });
});

document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
        fecharMenuMobile();
        fecharSeletorMobile();
        fecharPerfilMobile();
        fecharModal(elementos.modalProduto);
        fecharModal(elementos.modalPedido);
        fecharModal(elementos.modalEntrega);
        fecharModal(elementos.modalAnalisarPedido);
        fecharModal(elementos.modalRecusarItem);
        fecharModal(elementos.modalEncerrarSaldoItem);
        fecharModal(elementos.modalCancelarRemessa);
        fecharModal(elementos.modalRemessa);
        fecharModal(elementos.modalUsuario);
        fecharModal(elementos.modalAlterarSenha);
        fecharModal(elementos.modalEstoqueFilial);
        fecharModal(elementos.modalDetalhesPedido);
        fecharModal(elementos.modalItensEmProducao);
    }
});

elementos.buscaProdutos.addEventListener("input", () => {
    paginaProdutosAtual = 1;
    renderizarProdutos();
});
elementos.filtroCategoria.addEventListener("change", () => {
    paginaProdutosAtual = 1;
    renderizarProdutos();
});
elementos.filtroStatusProdutos.addEventListener("change", () => {
    paginaProdutosAtual = 1;
    renderizarFiltroCategorias();
    renderizarProdutos();
});
elementos.botaoOrdenarQuantidade.addEventListener("click", () => {
    if (ordenacaoProdutos === "quantidade") {
        ordenacaoQuantidade = ordenacaoQuantidade === "crescente" ? "decrescente" : "crescente";
    }

    ordenacaoProdutos = "quantidade";
    const crescente = ordenacaoQuantidade === "crescente";

    elementos.botaoOrdenarQuantidade.textContent = crescente ? "↑" : "↓";
    elementos.botaoOrdenarQuantidade.setAttribute("aria-label", `Ordenar produtos por quantidade, ${ordenacaoQuantidade}`);
    elementos.botaoOrdenarQuantidade.title = `Ordenar por quantidade: ${ordenacaoQuantidade}`;
    elementos.botaoOrdenarQuantidade.setAttribute("aria-pressed", String(!crescente));
    paginaProdutosAtual = 1;
    renderizarProdutos();
});
elementos.paginacaoProdutos?.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-pagina-produto]");
    if (!botao || botao.disabled) return;
    paginaProdutosAtual += botao.dataset.paginaProduto === "proxima" ? 1 : -1;
    renderizarProdutos();
});
elementos.buscaHistorico.addEventListener("input", renderizarHistorico);
elementos.filtroHistorico.addEventListener("change", renderizarHistorico);
elementos.filtroStatusPedidos.addEventListener("change", renderizarPedidos);
elementos.filtroStatusItensPedidos.addEventListener("change", renderizarPedidos);
elementos.filtroStatusMeusPedidos.addEventListener("change", renderizarPortalFilial);
elementos.movimentoProduto.addEventListener("change", () => {
    produtoSelecionadoMovimentacao = elementos.movimentoProduto.value;
    sincronizarBuscaMovimentoComProduto();
    atualizarInformacaoProdutoMovimento();
    atualizarBotaoCadastrarProdutoXml();
});
elementos.buscaMovimentoProduto.addEventListener("focus", () => renderizarSugestoesBuscaMovimento(true));
elementos.buscaMovimentoProduto.addEventListener("input", () => {
    selecionarProdutoMovimentoPorBusca();
    renderizarSugestoesBuscaMovimento(true);
});
elementos.buscaMovimentoProduto.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
        const produto = selecionarProdutoMovimentoPorBusca();
        if (produto) {
            evento.preventDefault();
            selecionarProdutoDaBuscaMovimento(produto.id);
        }
    }
    if (evento.key === "Escape") {
        elementos.opcoesBuscaMovimentoProduto.hidden = true;
        elementos.buscaMovimentoProduto.setAttribute("aria-expanded", "false");
    }
});
elementos.opcoesBuscaMovimentoProduto.addEventListener("click", (evento) => {
    const opcao = evento.target.closest("[data-produto-id]");
    if (opcao) selecionarProdutoDaBuscaMovimento(opcao.dataset.produtoId);
});
document.addEventListener("pointerdown", (evento) => {
    if (evento.target.closest(".campo-busca-movimento")) return;
    elementos.opcoesBuscaMovimentoProduto.hidden = true;
    elementos.buscaMovimentoProduto.setAttribute("aria-expanded", "false");
});
elementos.acertoProduto.addEventListener("change", atualizarInformacaoProdutoAcerto);
elementos.buscaAcertoProduto.addEventListener("focus", () => renderizarSugestoesBuscaAcerto(true));
elementos.buscaAcertoProduto.addEventListener("input", () => {
    selecionarProdutoAcertoPorBusca();
    renderizarSugestoesBuscaAcerto(true);
});
elementos.buscaAcertoProduto.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
        const produto = selecionarProdutoAcertoPorBusca();
        if (produto) evento.preventDefault();
    }
    if (evento.key === "Escape") {
        elementos.opcoesBuscaAcertoProduto.hidden = true;
        elementos.buscaAcertoProduto.setAttribute("aria-expanded", "false");
    }
});
elementos.opcoesBuscaAcertoProduto.addEventListener("click", (evento) => {
    const opcao = evento.target.closest("[data-produto-id]");
    if (opcao) selecionarProdutoDaBuscaAcerto(opcao.dataset.produtoId);
});
document.addEventListener("pointerdown", (evento) => {
    if (evento.target.closest(".campo-busca-acerto")) return;
    elementos.opcoesBuscaAcertoProduto.hidden = true;
    elementos.buscaAcertoProduto.setAttribute("aria-expanded", "false");
});
elementos.movimentoXml.addEventListener("change", importarXmlMovimentacao);
elementos.movimentoItemXml.addEventListener("change", () => preencherItemXmlMovimentacao(elementos.movimentoItemXml.value));
elementos.botaoRemoverXml.addEventListener("click", () => limparImportacaoXml());
elementos.botaoCadastrarProdutoXml.addEventListener("click", abrirCadastroProdutoDoXml);

elementos.botaoGerarQuantidadesAleatorias?.addEventListener("click", async () => {
    const minimo = Number(elementos.quantidadeAleatoriaMinima.value);
    const maximo = Number(elementos.quantidadeAleatoriaMaxima.value);
    const produtos = produtosAtivos();

    elementos.mensagemGerarEstoque.textContent = "";
    if (!Number.isInteger(minimo) || !Number.isInteger(maximo) || minimo < 0 || maximo < minimo) {
        elementos.mensagemGerarEstoque.textContent = "Informe quantidades inteiras válidas, com o máximo igual ou maior que o mínimo.";
        return;
    }
    if (!produtos.length) {
        elementos.mensagemGerarEstoque.textContent = "Não há produtos ativos para atualizar.";
        return;
    }
    if (!window.confirm(`Gerar quantidades entre ${minimo} e ${maximo} para os ${produtos.length} produto(s) ativos? Os saldos atuais serão substituídos.`)) return;

    const agora = new Date().toISOString();
    produtos.forEach((produto) => {
        const saldoAntes = produto.quantidade;
        const saldoDepois = Math.floor(Math.random() * (maximo - minimo + 1)) + minimo;
        produto.quantidade = saldoDepois;
        produto.atualizadoEm = agora;
        registrarMovimentacao({
            produto,
            tipo: "ajuste",
            quantidade: Math.abs(saldoDepois - saldoAntes),
            saldoAntes,
            saldoDepois,
            observacao: `Quantidade de validação gerada nas configurações (${minimo}–${maximo}).`
        });
    });

    elementos.botaoGerarQuantidadesAleatorias.disabled = true;
    await salvarEstado();
    elementos.botaoGerarQuantidadesAleatorias.disabled = false;
    renderizarTudo();
    notificar(`Quantidades de validação geradas para ${produtos.length} produto(s).`);
});

elementos.formularioProduto.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const id = elementos.produtoId.value;
    const nome = elementos.produtoNome.value.trim();
    const codigo = elementos.produtoCodigo.value.trim();
    const categoria = elementos.produtoCategoria.value;
    const unidade = elementos.produtoUnidade.value;
    const quantidade = numeroInteiroNaoNegativo(elementos.produtoQuantidade.value);
    const estoqueMinimo = numeroInteiroNaoNegativo(elementos.produtoMinimo.value);

    if (!nome || !categoria || !unidade) {
        elementos.mensagemProduto.textContent = "Preencha todos os campos obrigatórios.";
        return;
    }

    const duplicado = produtosAtivos().find((produto) => produto.id !== id && produto.nome.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"));

    if (duplicado) {
        elementos.mensagemProduto.textContent = "Já existe um produto ativo com esse nome.";
        return;
    }

    if (id) {
        const produto = buscarProduto(id);
        if (!produto) return;

        produto.codigo = codigo;
        produto.nome = nome;
        produto.categoria = categoria;
        produto.estoqueMinimo = estoqueMinimo;
        produto.unidade = unidade;
        produto.atualizadoEm = new Date().toISOString();
        salvarEstado();
        fecharModal(elementos.modalProduto);
        renderizarTudo();
        notificar("Produto atualizado.");
        return;
    }

    const produto = {
        id: gerarId("prod"),
        codigo,
        nome,
        categoria,
        quantidade,
        estoqueMinimo,
        unidade,
        ativo: true,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        arquivadoEm: null
    };

    const produtoSalvo = produto;
    estado.produtos.push(produtoSalvo);

    if (quantidade > 0) {
        registrarMovimentacao({
            produto: produtoSalvo,
            tipo: "entrada",
            quantidade,
            saldoAntes: 0,
            saldoDepois: quantidade,
            observacao: "Estoque inicial no cadastro do produto."
        });
    }

    await salvarEstado();
    fecharModal(elementos.modalProduto);
    renderizarTudo();
    if (Number.isInteger(indiceItemXmlSelecionado)) {
        preencherItemXmlMovimentacao(indiceItemXmlSelecionado);
    }
    notificar("Produto cadastrado com sucesso.");
});

elementos.formularioMovimentacao.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const produto = buscarProduto(elementos.movimentoProduto.value);
    const quantidade = Number(elementos.movimentoQuantidade.value);
    const observacao = elementos.movimentoObservacao.value.trim();
    const filial = tipoMovimentacaoAtual === "saida" ? buscarFilial(elementos.movimentoFilial.value) : null;

    elementos.mensagemMovimentacao.textContent = "";

    if (!produto || !produto.ativo) {
        elementos.mensagemMovimentacao.textContent = "Selecione um produto válido.";
        return;
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
        elementos.mensagemMovimentacao.textContent = "Informe uma quantidade inteira maior que zero.";
        return;
    }

    if (tipoMovimentacaoAtual === "saida" && quantidade > produto.quantidade) {
        elementos.mensagemMovimentacao.textContent = "A saída não pode ser maior que o estoque disponível no CD.";
        return;
    }

    const saldoAntes = produto.quantidade;
    produto.quantidade += tipoMovimentacaoAtual === "entrada" ? quantidade : -quantidade;
    produto.atualizadoEm = new Date().toISOString();

    if (filial) {
        const chave = chaveEstoqueFilial(filial.id, produto.id);
        const estoqueAtual = numeroInteiroNaoNegativo(estado.estoqueFiliais[chave]?.quantidade ?? estado.estoqueFiliais[chave]);
        estado.estoqueFiliais[chave] = {
            quantidade: estoqueAtual + quantidade,
            atualizadoEm: produto.atualizadoEm
        };
    }

    registrarMovimentacao({
        produto,
        tipo: filial ? "transferencia" : tipoMovimentacaoAtual,
        quantidade,
        saldoAntes,
        saldoDepois: produto.quantidade,
        observacao,
        filialId: filial?.id || ""
    });

    salvarEstado();
    elementos.movimentoFilial.value = "";
    if (!avancarItemXmlAposEntrada()) {
        elementos.movimentoQuantidade.value = "";
        elementos.movimentoObservacao.value = "";
        limparImportacaoXml(false);
    }
    renderizarTudo();
    notificar(tipoMovimentacaoAtual === "entrada" ? "Entrada registrada." : "Saída registrada.");
});

elementos.formularioAcertoEstoque.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const produto = buscarProduto(elementos.acertoProduto.value);
    const quantidadeFisica = Number(elementos.acertoQuantidade.value);
    const motivo = elementos.acertoObservacao.value.trim();

    elementos.mensagemAcertoEstoque.textContent = "";
    if (!produto || !produto.ativo) {
        elementos.mensagemAcertoEstoque.textContent = "Selecione um produto válido.";
        return;
    }
    if (!Number.isInteger(quantidadeFisica) || quantidadeFisica < 0) {
        elementos.mensagemAcertoEstoque.textContent = "Informe uma quantidade física inteira igual ou maior que zero.";
        return;
    }
    if (!motivo) {
        elementos.mensagemAcertoEstoque.textContent = "Informe o motivo do acerto para manter a rastreabilidade.";
        return;
    }

    const saldoAntes = produto.quantidade;
    if (quantidadeFisica === saldoAntes) {
        elementos.mensagemAcertoEstoque.textContent = "A quantidade física já é igual ao saldo registrado.";
        return;
    }

    produto.quantidade = quantidadeFisica;
    produto.atualizadoEm = new Date().toISOString();
    registrarMovimentacao({
        produto,
        tipo: "ajuste",
        quantidade: Math.abs(quantidadeFisica - saldoAntes),
        saldoAntes,
        saldoDepois: quantidadeFisica,
        observacao: `Ajuste de estoque: ${motivo}`
    });

    elementos.botaoConfirmarAcerto.disabled = true;
    await salvarEstado();
    elementos.acertoQuantidade.value = "";
    elementos.acertoObservacao.value = "";
    elementos.botaoConfirmarAcerto.disabled = false;
    renderizarTudo();
    notificar("Ajuste de estoque registrado.");
});

elementos.formularioPedido.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const filial = buscarFilial(elementos.pedidoFilial.value);
    const produto = buscarProduto(elementos.pedidoProduto.value);
    const estoqueInformado = Number(elementos.pedidoEstoqueAtual.value);
    const quantidadeSolicitada = Number(elementos.pedidoQuantidade.value);
    const observacao = elementos.pedidoObservacao.value.trim();

    elementos.mensagemPedido.textContent = "";

    if (!filial || !produto || !produto.ativo) {
        elementos.mensagemPedido.textContent = "Selecione uma filial e um produto válidos.";
        return;
    }

    if (!Number.isInteger(estoqueInformado) || estoqueInformado < 0 || !Number.isInteger(quantidadeSolicitada) || quantidadeSolicitada <= 0) {
        elementos.mensagemPedido.textContent = "Informe números inteiros válidos para o estoque atual e a quantidade solicitada.";
        return;
    }

    estado.pedidos.unshift({
        id: gerarId("ped"),
        filialId: filial.id,
        itens: [{
            produtoId: produto.id,
            produtoNome: produto.nome,
            unidade: produto.unidade,
            estoqueInformado,
            quantidadeSolicitada,
            observacao: ""
        }],
        observacao,
        observacaoMatriz: "",
        situacao: "pendente",
        criadoEm: new Date().toISOString(),
        analisadoEm: null,
        atualizadoEm: agora
    });

    salvarEstado();
    fecharModal(elementos.modalPedido);
    renderizarTudo();
    notificar("Pedido enviado para análise do CD.");
});

elementos.formularioEntrega.addEventListener("submit", (evento) => {
    evento.preventDefault();
    if (elementos.entregaModo.value === "aprovar_item") {
        aprovarItemPedido(elementos.entregaPedidoId.value, elementos.entregaQuantidade.value);
        return;
    }
    const dia = String(elementos.entregaDia.value).padStart(2, "0");
    const mes = String(elementos.entregaMes.value).padStart(2, "0");
    const ano = elementos.entregaAno.value;
    const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();

    elementos.mensagemEntrega.textContent = "";

    if (Number(dia) > ultimoDia) {
        elementos.mensagemEntrega.textContent = "Este mês não possui esse dia. Escolha outra data.";
        return;
    }

    const dataSelecionada = `${ano}-${mes}-${dia}`;

    if (elementos.entregaModo.value === "iniciar_producao") {
        iniciarProducaoPedido(elementos.entregaPedidoId.value, dataSelecionada, elementos.entregaProdutoId.value);
        return;
    }

    if (elementos.entregaModo.value === "enviar_pedido") {
        enviarPedidoComData(elementos.entregaPedidoId.value, dataSelecionada);
        return;
    }

    aprovarPedido(elementos.entregaPedidoId.value, dataSelecionada, elementos.campoEntregaQuantidade.hidden ? null : elementos.entregaQuantidade.value);
});

elementos.botaoAprovarParaProducao.addEventListener("click", () => {
    aprovarItemParaProducao(elementos.entregaPedidoId.value);
});

elementos.botaoEnviarPedidoAnalisado.addEventListener("click", () => {
    abrirModalEnviarPedido(elementos.botaoEnviarPedidoAnalisado.dataset.pedidoId);
});

elementos.formularioRecusarItem.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const motivo = elementos.motivoRecusarItem.value.trim();

    elementos.mensagemRecusarItem.textContent = "";
    if (!motivo) {
        elementos.mensagemRecusarItem.textContent = "Informe o motivo da recusa para continuar.";
        elementos.motivoRecusarItem.focus();
        return;
    }

    recusarItemPedido(elementos.recusaPedidoId.value, elementos.recusaProdutoId.value, motivo);
});

elementos.formularioEncerrarSaldoItem.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const motivo = elementos.motivoEncerrarSaldoItem.value.trim();
    elementos.mensagemEncerrarSaldoItem.textContent = "";
    if (!motivo) {
        elementos.mensagemEncerrarSaldoItem.textContent = "Informe o motivo do encerramento para continuar.";
        elementos.motivoEncerrarSaldoItem.focus();
        return;
    }
    encerrarSaldoItemPedido(elementos.encerrarSaldoPedidoId.value, elementos.encerrarSaldoProdutoId.value, motivo);
});

elementos.formularioCancelarRemessa.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const motivo = elementos.motivoCancelarRemessa.value.trim();
    elementos.mensagemCancelarRemessa.textContent = "";
    if (!motivo) {
        elementos.mensagemCancelarRemessa.textContent = "Informe o motivo do cancelamento para continuar.";
        elementos.motivoCancelarRemessa.focus();
        return;
    }
    cancelarRemessa(
        elementos.cancelarRemessaId.value,
        elementos.cancelarRemessaPedidoId.value,
        motivo,
        elementos.cancelarRemessaPedidoCompleto.value === "true"
    );
});

elementos.formularioRemessa.addEventListener("submit", (evento) => {
    evento.preventDefault();
    criarRemessaDoFormulario();
});

elementos.seletorPortal.addEventListener("change", () => {
    portalAtual = elementos.seletorPortal.value;
    itensDoPedidoAtual = [];
    navegar(estaNoPortalFilial() ? "portal-filial" : "dashboard");
});

elementos.itemPedidoProduto.addEventListener("change", atualizarEstoqueAtualDoItemPedido);
elementos.buscaItemPedido.addEventListener("focus", () => renderizarSugestoesBuscaItemPedido(true));
elementos.buscaItemPedido.addEventListener("input", () => {
    selecionarProdutoPedidoPorBusca();
    renderizarSugestoesBuscaItemPedido(true);
});
elementos.buscaItemPedido.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
        const produto = selecionarProdutoPedidoPorBusca();
        if (produto) selecionarProdutoDaBuscaPedido(produto.id);
    }
    if (evento.key === "Escape") {
        elementos.opcoesBuscaItemPedido.hidden = true;
        elementos.buscaItemPedido.setAttribute("aria-expanded", "false");
    }
});
elementos.opcoesBuscaItemPedido.addEventListener("click", (evento) => {
    const opcao = evento.target.closest("[data-produto-id]");
    if (opcao) selecionarProdutoDaBuscaPedido(opcao.dataset.produtoId);
});
document.addEventListener("pointerdown", (evento) => {
    if (evento.target.closest(".campo-busca-pedido")) return;
    elementos.opcoesBuscaItemPedido.hidden = true;
    elementos.buscaItemPedido.setAttribute("aria-expanded", "false");
});

elementos.formularioItemPedido.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const filial = filialAtual();
    const produto = buscarProduto(elementos.itemPedidoProduto.value);
    const estoqueInformado = Number(elementos.itemPedidoEstoque.value);
    const quantidadeSolicitada = Number(elementos.itemPedidoQuantidade.value);

    elementos.mensagemItemPedido.textContent = "";

    if (!filial || !produto || !produto.ativo) {
        elementos.mensagemItemPedido.textContent = "Selecione um produto válido.";
        return;
    }

    if (!Number.isInteger(estoqueInformado) || estoqueInformado < 0 || !Number.isInteger(quantidadeSolicitada) || quantidadeSolicitada <= 0) {
        elementos.mensagemItemPedido.textContent = "Informe quantidades inteiras válidas.";
        return;
    }

    if (itensDoPedidoAtual.some((item) => item.produtoId === produto.id)) {
        elementos.mensagemItemPedido.textContent = "Esse produto já está na lista. Remova-o para informar uma quantidade diferente.";
        return;
    }

    itensDoPedidoAtual.push({
        produtoId: produto.id,
        produtoNome: produto.nome,
        unidade: produto.unidade,
        estoqueInformado,
        quantidadeSolicitada
    });

    elementos.formularioItemPedido.reset();
    atualizarEstoqueAtualDoItemPedido();
    renderizarCarrinhoPedido();
});

elementos.botaoLimparCarrinho.addEventListener("click", () => {
    itensDoPedidoAtual = [];
    elementos.mensagemPedidoFilial.textContent = "";
    renderizarCarrinhoPedido();
});

elementos.botaoEnviarPedidoLista.addEventListener("click", async () => {
    const filial = filialAtual();
    const observacao = elementos.observacaoPedidoCompleto.value.trim();

    elementos.mensagemPedidoFilial.textContent = "";

    if (!filial) {
        elementos.mensagemPedidoFilial.textContent = "Selecione uma filial antes de enviar o pedido.";
        return;
    }

    if (!usuarioEhCD() && String(filial.id) !== String(perfilAtual?.filial_id || "")) {
        elementos.mensagemPedidoFilial.textContent = "Sua sessão não está vinculada a esta filial. Atualize a página ou entre com a conta correta.";
        return;
    }

    if (!itensDoPedidoAtual.length) {
        elementos.mensagemPedidoFilial.textContent = "Adicione pelo menos um item à lista.";
        return;
    }

    const itens = itensDoPedidoAtual.map((item) => ({ ...item }));
    const agora = new Date().toISOString();

    const pedido = {
        id: gerarId("ped"),
        filialId: filial.id,
        itens,
        observacao,
        observacaoMatriz: "",
        situacao: "pendente",
        criadoEm: agora,
        analisadoEm: null,
        atualizadoEm: agora
    };

    if (clienteSupabase && !usuarioEhCD()) {
        const { data: pedidoCriado, error: erroPedido } = await clienteSupabase.from("pedidos")
            .insert(pedidoParaBanco(pedido))
            .select("numero_pedido")
            .single();

        if (erroPedido) {
            console.error(erroPedido);
            elementos.mensagemPedidoFilial.textContent = `Não foi possível enviar o pedido: ${erroPedido.message}`;
            return;
        }

        pedido.numeroPedido = pedidoCriado.numero_pedido;

        const { error: erroItens } = await clienteSupabase.from("pedido_itens").upsert(itensParaBanco([pedido]));

        if (erroItens) {
            console.error(erroItens);
            elementos.mensagemPedidoFilial.textContent = `O pedido foi criado, mas os itens não puderam ser gravados: ${erroItens.message}`;
            await carregarDadosSupabase();
            return;
        }

        idsPedidosRemotos.add(pedido.id);
        itensDoPedidoAtual = [];
        elementos.observacaoPedidoCompleto.value = "";
        await carregarDadosSupabase();
        notificar("Lista de pedido enviada para o CD.");
        navegar("meus-pedidos");
        return;
    }

    estado.pedidos.unshift(pedido);

    itensDoPedidoAtual = [];
    elementos.observacaoPedidoCompleto.value = "";
    salvarEstado();
    renderizarTudo();
    notificar("Lista de pedido enviada para o CD.");
    navegar("meus-pedidos");
});

elementos.botaoPerfil.addEventListener("click", () => {
    const aberto = !elementos.menuPerfilOpcoes.hidden;
    elementos.menuPerfilOpcoes.hidden = aberto;
    elementos.botaoPerfil.setAttribute("aria-expanded", String(!aberto));
});

elementos.botaoAlterarSenha.addEventListener("click", abrirModalAlterarSenha);

elementos.botaoSair.addEventListener("click", async () => {
    if (!clienteSupabase) return;
    await clienteSupabase.auth.signOut();
    window.location.replace("./login.html");
});

elementos.formularioAlterarSenha.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const novaSenha = elementos.novaSenhaUsuario.value;
    const confirmarSenha = elementos.confirmarNovaSenhaUsuario.value;

    if (novaSenha.length < 8) {
        elementos.mensagemAlterarSenha.textContent = "A nova senha deve ter pelo menos 8 caracteres.";
        return;
    }
    if (novaSenha !== confirmarSenha) {
        elementos.mensagemAlterarSenha.textContent = "As senhas não coincidem.";
        return;
    }
    if (!clienteSupabase || !usuarioAtual) {
        elementos.mensagemAlterarSenha.textContent = "Não foi possível identificar sua sessão.";
        return;
    }

    elementos.botaoSalvarNovaSenha.disabled = true;
    elementos.mensagemAlterarSenha.textContent = "Salvando nova senha...";
    const { error } = await clienteSupabase.auth.updateUser({ password: novaSenha });
    elementos.botaoSalvarNovaSenha.disabled = false;

    if (error) {
        console.error(error);
        elementos.mensagemAlterarSenha.textContent = "Não foi possível alterar sua senha. Tente novamente.";
        return;
    }

    fecharModal(elementos.modalAlterarSenha);
    notificar("Senha alterada com sucesso.");
});

elementos.usuarioPapel.addEventListener("change", () => {
    const administrador = elementos.usuarioPapel.value === "cd_admin";
    elementos.usuarioFilial.disabled = administrador;
    if (administrador) elementos.usuarioFilial.value = "";
});

elementos.botaoNovoUsuario?.addEventListener("click", abrirModalNovoUsuario);

elementos.formularioUsuario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const papel = elementos.usuarioPapel.value;
    const filialId = papel === "cd_admin" ? null : elementos.usuarioFilial.value;
    if (papel === "filial" && !filialId) { elementos.mensagemUsuario.textContent = "Selecione a filial do usuário."; return; }
    if (!elementos.usuarioId.value) {
        const senha = elementos.usuarioSenhaInicial.value;
        if (senha.length < 8) { elementos.mensagemUsuario.textContent = "A senha inicial deve ter pelo menos 8 caracteres."; return; }
        elementos.mensagemUsuario.textContent = "Criando usuário...";
        const { error } = await clienteSupabase.functions.invoke("criar-usuario", {
            body: { login: elementos.usuarioEmail.value.trim(), nome: elementos.usuarioNome.value.trim(), senha, papel, filial_id: filialId }
        });
        if (error) {
            console.error(error);
            let mensagem = error.message || "Não foi possível criar o usuário.";
            if (error.context instanceof Response) {
                try {
                    const resposta = await error.context.clone().json();
                    mensagem = resposta.error || mensagem;
                } catch { /* Mantém a mensagem padrão quando a resposta não for JSON. */ }
            }
            elementos.mensagemUsuario.textContent = mensagem;
            return;
        }
        fecharModal(elementos.modalUsuario);
        notificar("Usuário criado. Informe a senha inicial por um canal seguro.");
        await carregarUsuarios();
        return;
    }
    const usuarioEditadoId = elementos.usuarioId.value;
    const senhaTemporaria = elementos.usuarioSenhaTemporaria.value;
    if (senhaTemporaria && senhaTemporaria.length < 8) {
        elementos.mensagemUsuario.textContent = "A senha temporária deve ter pelo menos 8 caracteres.";
        return;
    }
    const alterouProprioPapel = usuarioAtual?.id === usuarioEditadoId && perfilAtual?.papel !== papel;
    const { error } = await clienteSupabase.from("usuarios").update({ nome: elementos.usuarioNome.value.trim(), papel, filial_id: filialId }).eq("id", usuarioEditadoId);
    if (error) { console.error(error); elementos.mensagemUsuario.textContent = "Não foi possível salvar as alterações."; return; }
    if (senhaTemporaria) {
        elementos.mensagemUsuario.textContent = "Definindo senha temporária...";
        const { error: erroSenha } = await clienteSupabase.functions.invoke("redefinir-senha-temporaria", {
            body: { usuario_id: usuarioEditadoId, senha: senhaTemporaria }
        });
        if (erroSenha) {
            console.error(erroSenha);
            elementos.mensagemUsuario.textContent = "Os dados foram salvos, mas não foi possível definir a senha temporária.";
            return;
        }
    }
    fecharModal(elementos.modalUsuario);
    if (alterouProprioPapel) {
        notificar("Saia do sistema para aplicar a alteração.");
        return;
    }
    notificar(senhaTemporaria ? "Usuário atualizado. A senha temporária expira em 48 horas." : "Usuário atualizado.");
    await carregarUsuarios();
});
elementos.botaoExportar.addEventListener("click", exportarBackup);
elementos.arquivoImportar.addEventListener("change", importarBackup);
elementos.formularioCategoria?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (categoriaEmEdicao) {
        await salvarEdicaoCategoria(categoriaEmEdicao, elementos.categoriaNome.value);
        return;
    }
    await criarCategoria(elementos.categoriaNome.value);
});
elementos.formularioUnidade?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (unidadeEmEdicao) {
        await salvarEdicaoUnidade(unidadeEmEdicao, elementos.unidadeNome.value);
        return;
    }
    await criarUnidade(elementos.unidadeNome.value);
});
elementos.botaoDadosDemo?.addEventListener("click", carregarDadosDemo);

function atualizarFiltrosRelatorio() {
    if (!elementos.relatorioPeriodo) return;
    filtrosRelatorio = {
        periodo: elementos.relatorioPeriodo.value,
        dataInicial: elementos.relatorioDataInicial.value,
        dataFinal: elementos.relatorioDataFinal.value,
        filialId: elementos.relatorioFilial.value,
        status: elementos.relatorioStatus.value,
        produtoId: elementos.relatorioProduto.value,
        categoria: elementos.relatorioCategoria.value,
        limiteProdutos: Number(elementos.relatorioLimiteProdutos.value) || 5
    };
    const personalizado = filtrosRelatorio.periodo === "personalizado";
    elementos.relatorioDataInicial.disabled = !personalizado;
    elementos.relatorioDataFinal.disabled = !personalizado;
    renderizarRelatorios();
}

[elementos.relatorioPeriodo, elementos.relatorioDataInicial, elementos.relatorioDataFinal, elementos.relatorioFilial, elementos.relatorioStatus, elementos.relatorioProduto, elementos.relatorioCategoria, elementos.relatorioLimiteProdutos]
    .filter(Boolean)
    .forEach((campo) => campo.addEventListener("change", atualizarFiltrosRelatorio));
elementos.relatorioCalendarioMes?.addEventListener("change", renderizarCalendarioSaidas);

elementos.botaoLimparRelatorios?.addEventListener("click", () => {
    filtrosRelatorio = { ...filtrosRelatorioPadrao };
    elementos.relatorioPeriodo.value = filtrosRelatorio.periodo;
    elementos.relatorioDataInicial.value = "";
    elementos.relatorioDataFinal.value = "";
    elementos.relatorioDataInicial.disabled = true;
    elementos.relatorioDataFinal.disabled = true;
    elementos.relatorioStatus.value = "";
    elementos.relatorioLimiteProdutos.value = String(filtrosRelatorio.limiteProdutos);
    renderizarRelatorios();
});
elementos.botaoExportarRelatorios?.addEventListener("click", exportarRelatorioCsv);

elementos.seletorPortal.value = portalAtual;
navegar("dashboard");

async function iniciarAplicacaoAutenticada() {
    if (!conectarSupabase()) { notificar("Não foi possível carregar o serviço do Supabase.", "erro"); return; }
    const { data: { session } } = await clienteSupabase.auth.getSession();
    if (!session) { window.location.replace("./login.html"); return; }
    usuarioAtual = session.user;
    const { data: perfil, error } = await clienteSupabase.from("usuarios")
        .select("id, nome, papel, filial_id, deve_alterar_senha, senha_temporaria_ate")
        .eq("id", usuarioAtual.id)
        .single();
    if (error || !perfil) { console.error(error); notificar("Perfil não encontrado. Execute supabase/reparar-perfis.sql no SQL Editor e defina o administrador.", "erro"); return; }
    if (perfil.deve_alterar_senha) {
        const expirada = !perfil.senha_temporaria_ate || new Date(perfil.senha_temporaria_ate).getTime() <= Date.now();
        if (expirada) {
            await clienteSupabase.auth.signOut();
            window.location.replace("./login.html?senha-expirada=1");
            return;
        }
        window.location.replace("./redefinir-senha.html?temporaria=1");
        return;
    }
    perfilAtual = perfil;
    aplicarPermissoesDoUsuario();
    exibirUsuarioLogado();
    const navegacaoSalva = recuperarNavegacaoAtual();
    if (usuarioEhCD() && navegacaoSalva?.portal && [CENTRO_DISTRIBUICAO_ID, ...estado.filiais.map((filial) => filial.id)].includes(navegacaoSalva.portal)) {
        portalAtual = navegacaoSalva.portal;
        elementos.seletorPortal.value = portalAtual;
    }
    navegar(navegacaoSalva?.pagina || (usuarioEhCD() ? "dashboard" : "portal-filial"), { tipoMovimentacao: navegacaoSalva?.tipoMovimentacao });
    await carregarDadosSupabase();
    await carregarUsuarios();
    clienteSupabase.channel("estoque-em-tempo-real")
        .on("postgres_changes", { event: "*", schema: "public", table: "produtos" }, carregarDadosSupabase)
        .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, carregarDadosSupabase)
        .on("postgres_changes", { event: "*", schema: "public", table: "pedido_itens" }, carregarDadosSupabase)
        .on("postgres_changes", { event: "*", schema: "public", table: "remessas" }, carregarDadosSupabase)
        .on("postgres_changes", { event: "*", schema: "public", table: "remessa_itens" }, carregarDadosSupabase)
        .on("postgres_changes", { event: "*", schema: "public", table: "pedido_eventos" }, carregarDadosSupabase)
        .on("postgres_changes", { event: "*", schema: "public", table: "estoque_filiais" }, carregarDadosSupabase)
        .on("postgres_changes", { event: "*", schema: "public", table: "movimentacoes" }, carregarDadosSupabase)
        .subscribe();
    clienteSupabase.auth.onAuthStateChange((_evento, sessao) => { if (!sessao) window.location.replace("./login.html"); });
}

window.addEventListener("online", () => carregarDadosSupabase());
window.addEventListener("load", iniciarAplicacaoAutenticada);

if (false) window.addEventListener("load", () => {
    if (conectarSupabase()) {
        carregarDadosSupabase();
    } else {
        notificar("Supabase não carregou. A interface continua disponível com os dados locais.", "erro");
    }
});
