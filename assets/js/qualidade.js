(function () {
    const Q = window.QualidadeUtils;
    if (!Q) return;

    const el = (seletor) => document.querySelector(seletor);
    const $ = {
        pagina: el("#pagina-qualidade"),
        tabela: el("#qualidade-tabela-ocorrencias"),
        resumo: el("#qualidade-resumo-lista"),
        textoApresentacao: el("#qualidade-texto-apresentacao"),
        modalNovo: el("#modal-ocorrencia-qualidade"),
        modalDetalhes: el("#modal-detalhes-qualidade"),
        modalResolver: el("#modal-resolver-chamado"),
        form: el("#formulario-ocorrencia-qualidade"),
        campoPedido: el("#qualidade-campo-pedido"),
        pedido: el("#qualidade-pedido"),
        campoRemessa: el("#qualidade-campo-remessa"),
        remessa: el("#qualidade-remessa"),
        produto: el("#qualidade-produto"),
        quantidade: el("#qualidade-quantidade"),
        quantidadePedida: el("#qualidade-quantidade-pedida"),
        valorQuantidadePedida: el("#qualidade-quantidade-pedida-valor"),
        tipo: el("#qualidade-tipo"),
        descricao: el("#qualidade-descricao"),
        arquivos: el("#qualidade-arquivos"),
        arquivosResposta: el("#qualidade-arquivos-resposta"),
        arquivosSolicitacao: el("#qualidade-arquivos-solicitacao"),
        previewSolicitacao: el("#qualidade-preview-solicitacao"),
        previewResposta: el("#qualidade-preview-resposta"),
        preview: el("#qualidade-preview-arquivos"),
        mensagem: el("#qualidade-mensagem-formulario"),
        salvar: el("#qualidade-salvar-ocorrencia"),
        detalhesTitulo: el("#qualidade-titulo-detalhes"),
        detalhes: el("#qualidade-detalhes-conteudo"),
        abrirResolucao: el("#qualidade-abrir-resolucao"),
        solicitarInfo: el("#qualidade-solicitar-info"),
        modalSolicitar: el("#modal-solicitar-informacoes"),
        modalResponder: el("#modal-responder-informacoes")
    };

    const dados = { chamados: [], tipos: [], categorias: [], evidencias: [], historico: [], responsaveis: [], solicitacoes: [], arquivos: [], atual: null };
    const escapar = (valor) => String(valor ?? "").replace(/[&<>"']/g, (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[caractere]));
    const estaNoPortalDaFilial = () => typeof estaNoPortalFilial === "function" && estaNoPortalFilial();
    const usuarioCD = () => perfilAtual?.papel === "cd_admin" && !estaNoPortalDaFilial();
    const filialDoChamado = () => estaNoPortalDaFilial()
        ? (typeof filialAtual === "function" ? filialAtual()?.id || "" : "")
        : perfilAtual?.filial_id || "";
    const produto = (id) => (estado?.produtos || []).find((item) => item.id === id);
    const filial = (id) => (estado?.filiais || []).find((item) => item.id === id);
    const pedido = (id) => (estado?.pedidos || []).find((item) => item.id === id);
    const remessa = (id) => (estado?.remessas || []).find((item) => item.id === id);
    const tipo = (id) => dados.tipos.find((item) => item.id === id);
    const categoria = (id) => dados.categorias.find((item) => item.id === id);
    const notificarQualidade = (texto, tipoAviso = "sucesso") => typeof notificar === "function" ? notificar(texto, tipoAviso) : window.alert(texto);
    const formatarData = (valor) => valor ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(valor)) : "—";
    const abrirModal = (modal) => { modal?.classList.add("modal-aberto"); modal?.setAttribute("aria-hidden", "false"); };
    const fecharModal = (modal) => { modal?.classList.remove("modal-aberto"); modal?.setAttribute("aria-hidden", "true"); };

    function nomeLocal(chamado) {
        return chamado.local_tipo === "cd" || chamado.origem === "production" ? "Indústria/CD" : filial(chamado.filial_id)?.nome || "Filial";
    }

    function textoOrigem(chamado) {
        return Q.textoOrigem(chamado.origem);
    }

    function textoTratamento(chamado) {
        return Q.textoTratamentoChamado(chamado.origem, chamado.encaminhamento);
    }

    function textoStatus(chamado) {
        return Q.textoStatusChamado(chamado.origem, chamado.encaminhamento, chamado.situacao);
    }

    function classeStatus(chamado) {
        if (chamado.situacao === "resolved") return "qualidade-status qualidade-status-resolved";
        if (chamado.situacao === "waiting_branch") return "qualidade-status qualidade-status-waiting-branch";
        if (chamado.encaminhamento === "cd" && chamado.origem === "branch_receiving") return "qualidade-status qualidade-status-analysis";
        return "qualidade-status qualidade-status-open";
    }

    function nomeResponsavel(id) {
        return dados.responsaveis.find((item) => item.id === id)?.nome || "Não informado";
    }

    function chamadosFiltrados() {
        const busca = (el("#qualidade-busca")?.value || "").trim().toLocaleLowerCase("pt-BR");
        const status = el("#qualidade-filtro-status")?.value || "";
        const origem = el("#qualidade-filtro-origem")?.value || "";
        return dados.chamados.filter((chamado) => {
            const item = chamado.itens?.[0];
            const textoBusca = `${chamado.codigo} ${produto(item?.produto_id)?.nome || ""} ${tipo(chamado.tipo_problema_id)?.nome || ""} ${chamado.descricao}`.toLocaleLowerCase("pt-BR");
            const aguardandoFilial = chamado.situacao === "waiting_branch";
            const aguardandoCD = chamado.situacao !== "resolved"
                && !aguardandoFilial
                && chamado.origem === "branch_receiving"
                && chamado.encaminhamento === "cd";
            const aberto = chamado.situacao !== "resolved" && !aguardandoFilial && !aguardandoCD;
            const correspondeStatus = !status
                || (status === "resolved" && chamado.situacao === "resolved")
                || (status === "waiting_branch" && aguardandoFilial)
                || (status === "cd" && aguardandoCD)
                || (status === "open" && aberto);
            return correspondeStatus && (!origem || chamado.origem === origem) && (!busca || textoBusca.includes(busca));
        });
    }

    function renderizar() {
        if (!$.pagina) return;
        const lista = chamadosFiltrados();
        const abertos = lista.filter((item) => item.situacao !== "resolved" && item.situacao !== "waiting_branch").length;
        const aguardandoCD = lista.filter((item) => item.situacao !== "resolved" && item.situacao !== "waiting_branch" && item.origem === "branch_receiving" && item.encaminhamento === "cd").length;
        const resolvidos = lista.filter((item) => item.situacao === "resolved").length;
        el("#qualidade-kpi-abertas").textContent = abertos;
        el("#qualidade-kpi-cd").textContent = aguardandoCD;
        el("#qualidade-kpi-resolvidas").textContent = resolvidos;
        el("#qualidade-kpi-total").textContent = lista.length;
        $.resumo.textContent = lista.length ? `${lista.length} chamado(s) encontrado(s).` : "Nenhum chamado encontrado.";
        $.tabela.innerHTML = lista.length ? lista.map((chamado) => {
            const item = chamado.itens?.[0];
            return `<tr><td><strong>${escapar(chamado.codigo)}</strong></td><td>${formatarData(chamado.criado_em)}</td><td>${escapar(nomeLocal(chamado))}<small>${escapar(textoOrigem(chamado))}</small></td><td>${escapar(produto(item?.produto_id)?.nome || "Produto")}</td><td>${escapar(tipo(chamado.tipo_problema_id)?.nome || "Não informado")}</td><td>${Number(item?.quantidade_afetada || 0)}</td><td>${escapar(nomeResponsavel(chamado.criado_por))}</td><td>${escapar(textoTratamento(chamado))}</td><td><span class="${classeStatus(chamado)}">${escapar(textoStatus(chamado))}</span></td><td><button type="button" class="botao-acao" data-qualidade-detalhes="${chamado.id}">Ver detalhes</button></td></tr>`;
        }).join("") : '<tr><td colspan="10" class="estado-vazio">Nenhum chamado encontrado.</td></tr>';
    }

    async function carregar() {
        if (!clienteSupabase) return;
        const consultaChamados = clienteSupabase
            .from("qualidade_ocorrencias")
            .select("*, itens:qualidade_ocorrencia_itens(*)")
            .in("origem", ["production", "branch_receiving"])
            .order("criado_em", { ascending: false });
        if (!usuarioCD()) consultaChamados.eq("filial_id", filialDoChamado());
        const [chamados, tipos, categorias, evidencias, historico] = await Promise.all([
            consultaChamados,
            clienteSupabase.from("qualidade_tipos_problema").select("*").eq("ativo", true).order("nome"),
            clienteSupabase.from("qualidade_categorias_problema").select("*").eq("ativo", true).order("nome"),
            clienteSupabase.from("qualidade_evidencias").select("*").order("criado_em"),
            clienteSupabase.from("qualidade_historico").select("*").order("criado_em", { ascending: false })
        ]);
        const erro = [chamados, tipos, categorias, evidencias, historico].find((resultado) => resultado.error)?.error;
        if (erro) { console.error(erro); if ($.pagina.classList.contains("pagina-ativa")) notificarQualidade("Não foi possível carregar os chamados de qualidade.", "erro"); return; }
        dados.chamados = chamados.data || [];
        const idsChamados = dados.chamados.map((item) => item.id);
        const responsaveis = idsChamados.length
            ? await clienteSupabase.rpc("listar_responsaveis_chamados_qualidade", { p_ocorrencias: idsChamados })
            : { data: [], error: null };
        if (responsaveis.error) { console.error(responsaveis.error); if ($.pagina.classList.contains("pagina-ativa")) notificarQualidade("Não foi possível carregar os responsáveis dos chamados.", "erro"); return; }
        dados.tipos = tipos.data || [];
        dados.categorias = categorias.data || [];
        const idsChamadosVisiveis = new Set(dados.chamados.map((item) => item.id));
        dados.evidencias = (evidencias.data || []).filter((item) => idsChamadosVisiveis.has(item.ocorrencia_id));
        dados.historico = (historico.data || []).filter((item) => idsChamadosVisiveis.has(item.ocorrencia_id));
        dados.responsaveis = responsaveis.data || [];
        const solicitacoes = await clienteSupabase.from("qualidade_solicitacoes_info").select("*").order("solicitada_em", { ascending: false });
        dados.solicitacoes = solicitacoes.error ? [] : (solicitacoes.data || []).filter((item) => idsChamadosVisiveis.has(item.ocorrencia_id));
        if (solicitacoes.error && solicitacoes.error.code !== "42P01") console.error(solicitacoes.error);
        $.textoApresentacao.textContent = usuarioCD()
            ? "Registre problemas de fabricação e resolva os chamados enviados pelas filiais."
            : "Registre problemas no recebimento. Todo chamado será encaminhado ao CD para resolução.";
        renderizar();
    }

    function preencherTipos() {
        const categoriasPermitidas = usuarioCD() ? ["Produto", "Embalagem", "Outros"] : ["Produto", "Embalagem", "Logística", "Outros"];
        $.tipo.innerHTML = '<option value="">Selecione</option>' + categoriasPermitidas.map((nome) => {
            const grupo = dados.categorias.find((item) => item.nome === nome);
            const opcoes = dados.tipos.filter((item) => item.categoria_id === grupo?.id).map((item) => `<option value="${item.id}">${escapar(item.nome)}</option>`).join("");
            return opcoes ? `<optgroup label="${escapar(nome)}">${opcoes}</optgroup>` : "";
        }).join("");
    }

    function remessasRecebidasDaFilial() {
        if (usuarioCD()) return [];
        const filialId = filialDoChamado();
        return (estado?.remessas || []).filter((item) => pedido(item.pedidoId)?.filialId === filialId && item.situacao === "recebida");
    }

    function pedidosRecebidosDaFilial() {
        const ids = new Set(remessasRecebidasDaFilial().map((item) => item.pedidoId));
        return (estado?.pedidos || []).filter((item) => ids.has(item.id));
    }

    function preencherPedidos() {
        $.pedido.innerHTML = '<option value="">Selecione o pedido</option>' + pedidosRecebidosDaFilial().map((item) => {
            return `<option value="${item.id}">Pedido #${escapar(item.numeroPedido || "—")}</option>`;
        }).join("");
    }

    function preencherRemessas() {
        const pedidoSelecionado = $.pedido.value;
        const remessas = remessasRecebidasDaFilial().filter((item) => item.pedidoId === pedidoSelecionado);
        $.remessa.innerHTML = pedidoSelecionado
            ? '<option value="">Selecione a remessa</option>' + remessas.map((item) => `<option value="${item.id}">Remessa enviada em ${formatarData(item.enviadaEm)}</option>`).join("")
            : '<option value="">Selecione primeiro o pedido</option>';
    }

    function produtosDisponiveis() {
        const remessaSelecionada = remessa($.remessa.value);
        if (!usuarioCD() && !remessaSelecionada) return [];
        const ids = remessaSelecionada ? new Set(remessaSelecionada.itens.map((item) => item.produtoId)) : null;
        return (estado?.produtos || []).filter((item) => item.ativo && (!ids || ids.has(item.id)));
    }

    function preencherProdutos() {
        const selecionado = $.produto.value;
        $.produto.innerHTML = '<option value="">Selecione</option>' + produtosDisponiveis().map((item) => `<option value="${item.id}">${escapar(item.codigo ? `${item.codigo} · ` : "")}${escapar(item.nome)}</option>`).join("");
        if ([...$.produto.options].some((opcao) => opcao.value === selecionado)) $.produto.value = selecionado;
        atualizarLimiteQuantidade();
    }

    function atualizarLimiteQuantidade() {
        const remessaSelecionada = remessa($.remessa.value);
        const item = remessaSelecionada?.itens.find((registro) => registro.produtoId === $.produto.value);
        const maximo = Number(item?.quantidade || 0);
        $.quantidade.max = maximo > 0 ? String(maximo) : "";
        if (maximo > 0 && Number($.quantidade.value) > maximo) $.quantidade.value = maximo;
        $.quantidade.title = maximo > 0 ? `Máximo enviado nesta remessa: ${maximo}` : "";
        atualizarQuantidadePedida();
    }

    function atualizarQuantidadePedida() {
        const item = pedido($.pedido.value)?.itens?.find((registro) => registro.produtoId === $.produto.value);
        const quantidadePedida = Number(item?.quantidadeSolicitada);
        const exibir = !usuarioCD() && Boolean($.produto.value) && Number.isFinite(quantidadePedida);
        $.quantidadePedida.hidden = !exibir;
        if (!exibir) return;
        const unidade = item?.unidade || produto($.produto.value)?.unidade || "unidade(s)";
        $.valorQuantidadePedida.textContent = `${quantidadePedida.toLocaleString("pt-BR")} ${unidade}`;
    }

    function atualizarPreview() {
        $.preview.innerHTML = dados.arquivos.map((arquivo, indice) => { const origem = escapar(URL.createObjectURL(arquivo)); const previa = Q.ehVideo(arquivo) ? `<video src="${origem}" muted preload="metadata" aria-label="Prévia de ${escapar(arquivo.name)}"></video>` : `<img src="${origem}" alt="Prévia de ${escapar(arquivo.name)}">`; return `<span>${previa}<span>${escapar(arquivo.name)}</span><button type="button" data-remover-arquivo="${indice}" aria-label="Remover ${escapar(arquivo.name)}">×</button></span>`; }).join("");
    }

    function definirArquivos(files, preview = $.preview) {
        const arquivos = [...files].filter(Q.validarAnexo);
        const imagens = arquivos.filter((arquivo) => !Q.ehVideo(arquivo));
        const videos = arquivos.filter(Q.ehVideo);
        dados.arquivos = [...imagens.slice(0, 3), ...videos.slice(0, 1)];
        if (dados.arquivos.length !== files.length) notificarQualidade("Você pode anexar no máximo 3 fotos e 1 vídeo. Fotos: até 10 MB; vídeo: até 50 MB.", "erro");
        if (preview === $.preview) atualizarPreview();
        else if (preview) preview.innerHTML = dados.arquivos.map((arquivo) => `<span>${escapar(arquivo.name)}</span>`).join("");
    }

    function configurarAreaDeAnexo() {
        const area = $.arquivos?.closest("label");
        if (!area) return;
        area.classList.add("qualidade-dropzone");
        ["dragenter", "dragover"].forEach((evento) => area.addEventListener(evento, (acao) => { acao.preventDefault(); area.classList.add("arrastando-arquivo"); }));
        ["dragleave", "dragend"].forEach((evento) => area.addEventListener(evento, () => area.classList.remove("arrastando-arquivo")));
        area.addEventListener("drop", (acao) => { acao.preventDefault(); area.classList.remove("arrastando-arquivo"); definirArquivos(acao.dataTransfer?.files || []); });
    }

    function abrirNovoChamado() {
        $.form.reset();
        $.mensagem.textContent = "";
        dados.arquivos = [];
        atualizarPreview();
        $.campoPedido.hidden = usuarioCD();
        $.campoRemessa.hidden = usuarioCD();
        $.pedido.required = !usuarioCD();
        $.remessa.required = !usuarioCD();
        preencherPedidos();
        preencherRemessas();
        preencherProdutos();
        preencherTipos();
        abrirModal($.modalNovo);
    }

    async function enviarEvidencias(chamadoId, contexto = "initial", solicitacaoId = "") {
        for (const arquivo of dados.arquivos) {
            const caminho = `${chamadoId}/${crypto.randomUUID()}-${arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            const envio = await clienteSupabase.storage.from("quality-evidence").upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
            if (envio.error) { console.error(envio.error); notificarQualidade(`Não foi possível enviar ${arquivo.name}.`, "erro"); continue; }
            const registro = await clienteSupabase.rpc("registrar_evidencia_qualidade", { p_ocorrencia_id: chamadoId, p_evidencia: { caminho_storage: caminho, nome_arquivo: arquivo.name, mime_type: arquivo.type, tamanho_bytes: arquivo.size, contexto, solicitacao_id: solicitacaoId, legenda: "" } });
            if (registro.error) { console.error(registro.error); notificarQualidade(`A imagem ${arquivo.name} foi enviada, mas não pôde ser vinculada.`, "erro"); }
        }
    }

    async function salvarChamado(evento) {
        evento.preventDefault();
        $.mensagem.textContent = "";
        const quantidade = Number($.quantidade.value);
        const maximo = Number($.quantidade.max || 0);
        if (!usuarioCD() && (!$.pedido.value || !$.remessa.value)) {
            $.mensagem.textContent = "Selecione o pedido recebido e a remessa correspondente.";
            return;
        }
        if (!Number.isInteger(quantidade) || quantidade <= 0 || (maximo && quantidade > maximo)) {
            $.mensagem.textContent = maximo ? `A quantidade deve ficar entre 1 e ${maximo}.` : "Informe uma quantidade válida.";
            return;
        }
        $.salvar.disabled = true;
        const { data: id, error } = await clienteSupabase.rpc("criar_chamado_qualidade", { p_chamado: {
            filial_id: usuarioCD() ? "" : filialDoChamado(),
            pedido_id: usuarioCD() ? "" : $.pedido.value,
            remessa_id: usuarioCD() ? "" : $.remessa.value,
            produto_id: $.produto.value,
            quantidade_afetada: quantidade,
            tipo_problema_id: $.tipo.value,
            encaminhamento: "cd",
            descricao: $.descricao.value.trim()
        } });
        if (error) { console.error(error); $.mensagem.textContent = error.message || "Não foi possível abrir o chamado."; $.salvar.disabled = false; return; }
        await enviarEvidencias(id);
        $.salvar.disabled = false;
        fecharModal($.modalNovo);
        await carregar();
        notificarQualidade("Chamado aberto com sucesso.");
        abrirDetalhes(id);
    }

    async function carregarGaleriasSolicitacao(evidencias) {
        const galerias = [...document.querySelectorAll("[data-qualidade-galeria-solicitacao]")];
        await Promise.all(galerias.map(async (galeria) => {
            const anexosDaSolicitacao = evidencias.filter((item) => item.solicitacao_id === galeria.dataset.qualidadeGaleriaSolicitacao && item.contexto === galeria.dataset.contextoAnexo);
            if (!anexosDaSolicitacao.length) { galeria.remove(); return; }
            const anexos = await Promise.all(anexosDaSolicitacao.map(async (evidencia) => {
                const resultado = await clienteSupabase.storage.from("quality-evidence").createSignedUrl(evidencia.caminho_storage, 3600);
                if (!resultado.data?.signedUrl) return "";
                const url = escapar(resultado.data.signedUrl);
                return evidencia.mime_type?.startsWith("video/") ? `<video controls preload="metadata" src="${url}"></video>` : `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${escapar(evidencia.nome_arquivo)}"></a>`;
            }));
            galeria.innerHTML = anexos.join("");
        }));
    }
    async function carregarGaleria(evidencias) {
        const galeria = el("#qualidade-galeria");
        if (!galeria || !evidencias.length) return;
        const anexos = await Promise.all(evidencias.map(async (evidencia) => {
            const resultado = await clienteSupabase.storage.from("quality-evidence").createSignedUrl(evidencia.caminho_storage, 3600);
            if (!resultado.data?.signedUrl) return "";
            const url = escapar(resultado.data.signedUrl);
            const nome = escapar(evidencia.legenda || evidencia.nome_arquivo);
            return evidencia.mime_type?.startsWith("video/")
                ? `<video controls preload="metadata" src="${url}" aria-label="${nome}"></video>`
                : `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${nome}"></a>`;
        }));
        galeria.innerHTML = anexos.join("");
    }

    function descricaoHistorico(evento) {
        if (evento.tipo === "created") return "Ocorrência criada no modelo anterior.";
        if (evento.tipo === "status_changed" && evento.dados?.anterior && evento.dados?.atual) return `Status alterado de ${Q.textoSituacao(evento.dados.anterior)} para ${Q.textoSituacao(evento.dados.atual)}.`;
        return evento.descricao;
    }

    function secoesSolicitacoes(chamado) {
        const solicitacoes = dados.solicitacoes.filter((item) => item.ocorrencia_id === chamado.id).sort((a, b) => new Date(b.solicitada_em) - new Date(a.solicitada_em));
        if (!solicitacoes.length) return "";
        return `<section class="qualidade-bloco qualidade-solicitacoes"><h3>Solicitações de informações</h3>${solicitacoes.map((item) => `<article class="qualidade-solicitacao"><div><strong>CD solicitou</strong><small>${formatarData(item.solicitada_em)}</small></div><p>${escapar(item.pergunta)}</p><div class="qualidade-galeria qualidade-galeria-resposta" data-qualidade-galeria-solicitacao="${item.id}" data-contexto-anexo="request"></div>${item.respondida_em ?  `<div class="qualidade-resposta-solicitacao"><div class="qualidade-resposta-conteudo"><div><strong>Resposta da filial</strong><small>${formatarData(item.respondida_em)}</small></div><div class="qualidade-texto-resposta">${escapar(item.resposta || "")}</div></div><div class="qualidade-galeria qualidade-galeria-resposta" data-qualidade-galeria-solicitacao="${item.id}" data-contexto-anexo="response"></div></div>` : '<p class="qualidade-solicitacao-pendente">Aguardando resposta da filial.</p>'}</article>`).join("")}</section>`;
    }
    function acoesDoChamado(chamado) {
        if (chamado.situacao === "resolved") return `<section class="qualidade-bloco qualidade-resolucao"><h3>Resolução</h3><p>${escapar(chamado.resolucao || "Chamado resolvido.")}</p><small>Resolvido por ${escapar(nomeResponsavel(chamado.resolvido_por))} em ${formatarData(chamado.resolvido_em)}</small></section>`;
        const solicitacao = dados.solicitacoes.find((item) => item.ocorrencia_id === chamado.id && !item.respondida_em);
        if (!usuarioCD() && solicitacao) return `<section class="qualidade-bloco qualidade-aguardando"><h3>Informações solicitadas pelo CD</h3><p>${escapar(solicitacao.pergunta)}</p><button type="button" class="botao-principal" data-responder-solicitacao="${solicitacao.id}">Responder ao CD</button></section>`;
        if (!usuarioCD()) return '<section class="qualidade-bloco qualidade-aguardando"><h3>Aguardando a indústria/CD</h3><p>O chamado foi encaminhado e será resolvido pela equipe do CD.</p></section>';
        return '';
    }

    function abrirDetalhes(id) {
        const chamado = dados.chamados.find((item) => item.id === id);
        if (!chamado) return;
        dados.atual = chamado;
        const item = chamado.itens?.[0];
        const evidencias = dados.evidencias.filter((registro) => registro.ocorrencia_id === id && registro.contexto === "initial");

        const eventos = dados.historico.filter((registro) => registro.ocorrencia_id === id);
        $.detalhesTitulo.textContent = `${chamado.codigo} · ${textoStatus(chamado)}`;
        $.abrirResolucao.hidden = chamado.situacao === "resolved" || !usuarioCD();
        $.solicitarInfo.hidden = chamado.situacao === "resolved" || !usuarioCD();
        $.detalhes.innerHTML = `<section class="qualidade-resumo-chamado"><div><small>Origem</small><strong>${escapar(textoOrigem(chamado))}</strong></div><div><small>Local</small><strong>${escapar(nomeLocal(chamado))}</strong></div><div><small>Tratamento</small><strong>${escapar(textoTratamento(chamado))}</strong></div><div><small>Status</small><span class="${classeStatus(chamado)}">${escapar(textoStatus(chamado))}</span></div></section><section class="qualidade-bloco"><h3>${escapar(produto(item?.produto_id)?.nome || "Produto")}</h3><p><strong>${Number(item?.quantidade_afetada || 0)} unidade(s) afetada(s)</strong>${item?.quantidade_referencia ? ` de ${Number(item.quantidade_referencia)} enviada(s)` : ""}</p><p>${escapar(tipo(chamado.tipo_problema_id)?.nome || "Problema não informado")} · ${escapar(categoria(chamado.categoria_problema_id)?.nome || "")}</p><p>${escapar(chamado.descricao)}</p></section><section class="qualidade-bloco"><h3>Anexos do chamado</h3><div class="qualidade-galeria" id="qualidade-galeria">${evidencias.length ? "Carregando anexos…" : "Nenhuma foto ou vídeo adicionado."}</div></section>${secoesSolicitacoes(chamado)}${acoesDoChamado(chamado)}<section class="qualidade-bloco"><h3>Histórico</h3><div class="qualidade-timeline">${eventos.map((evento) => `<p><strong>${formatarData(evento.criado_em)}</strong> · ${escapar(descricaoHistorico(evento))}</p>`).join("") || "Sem eventos."}</div></section>`;
        abrirModal($.modalDetalhes);
        carregarGaleria(evidencias); carregarGaleriasSolicitacao(dados.evidencias.filter((registro) => registro.ocorrencia_id === id));
    }

    function abrirResposta(id) { dados.solicitacaoAtual = dados.solicitacoes.find((item) => item.id === id); if (!dados.solicitacaoAtual) return; dados.arquivos = []; if ($.arquivosResposta) $.arquivosResposta.value = ""; if ($.previewResposta) $.previewResposta.innerHTML = ""; el("#qualidade-pergunta-recebida").textContent = `Solicitação do CD: ${dados.solicitacaoAtual.pergunta}`; el("#qualidade-resposta-info").value = ""; abrirModal($.modalResponder); }
    async function enviarResposta() { const resposta = el("#qualidade-resposta-info").value.trim(); if (!resposta) { el("#qualidade-mensagem-resposta").textContent = "Informe a resposta para o CD."; return; } const { error } = await clienteSupabase.rpc("responder_solicitacao_qualidade", { p_solicitacao_id: dados.solicitacaoAtual.id, p_resposta: resposta, p_filial_id: filialDoChamado() }); if (error) { el("#qualidade-mensagem-resposta").textContent = error.message; return; } await enviarEvidencias(dados.atual.id, "response", dados.solicitacaoAtual.id); fecharModal($.modalResponder); await carregar(); abrirDetalhes(dados.atual.id); }
    function abrirSolicitacao() { dados.arquivos = []; if ($.arquivosSolicitacao) $.arquivosSolicitacao.value = ""; if ($.previewSolicitacao) $.previewSolicitacao.innerHTML = ""; el("#qualidade-pergunta-info").value = ""; el("#qualidade-mensagem-pergunta").textContent = ""; abrirModal($.modalSolicitar); }
    async function enviarSolicitacao() { const pergunta = el("#qualidade-pergunta-info").value.trim(); if (!pergunta) { el("#qualidade-mensagem-pergunta").textContent = "Descreva a informação necessária."; return; } const { data: solicitacaoId, error } = await clienteSupabase.rpc("solicitar_informacoes_chamado_qualidade", { p_ocorrencia_id: dados.atual.id, p_pergunta: pergunta }); if (error) { el("#qualidade-mensagem-pergunta").textContent = error.message; return; } await enviarEvidencias(dados.atual.id, "request", solicitacaoId); fecharModal($.modalSolicitar); await carregar(); abrirDetalhes(dados.atual.id); }
    function abrirResolucao() {
        const campo = el("#qualidade-resolucao");
        const mensagem = el("#qualidade-mensagem-resolucao");
        if (campo) campo.value = "";
        if (mensagem) mensagem.textContent = "";
        abrirModal($.modalResolver);
        setTimeout(() => campo?.focus(), 100);
    }
    async function resolverChamado() {
        const chamado = dados.atual;
        const resolucao = el("#qualidade-resolucao")?.value.trim() || "";
        const mensagem = el("#qualidade-mensagem-resolucao");
        if (!resolucao) { if (mensagem) mensagem.textContent = "Descreva como o problema foi resolvido."; return; }
        const { error } = await clienteSupabase.rpc("resolver_chamado_qualidade", { p_ocorrencia_id: chamado.id, p_resolucao: resolucao });
        if (error) { if (mensagem) mensagem.textContent = error.message; return; }
        fecharModal($.modalResolver); await carregar(); abrirDetalhes(chamado.id); notificarQualidade("Chamado resolvido.");
    }

    el("#botao-nova-ocorrencia-qualidade")?.addEventListener("click", abrirNovoChamado);
    $.form?.addEventListener("submit", salvarChamado);
    $.pedido?.addEventListener("change", () => { preencherRemessas(); $.produto.value = ""; $.quantidade.value = ""; preencherProdutos(); });
    $.remessa?.addEventListener("change", () => { preencherProdutos(); $.quantidade.value = ""; });
    $.produto?.addEventListener("change", atualizarLimiteQuantidade);
    $.arquivos?.addEventListener("change", () => definirArquivos($.arquivos.files));
    $.arquivosResposta?.addEventListener("change", () => definirArquivos($.arquivosResposta.files, $.previewResposta));
    $.arquivosSolicitacao?.addEventListener("change", () => definirArquivos($.arquivosSolicitacao.files, $.previewSolicitacao));
    $.preview?.addEventListener("click", (evento) => { const indice = evento.target.closest("[data-remover-arquivo]")?.dataset.removerArquivo; if (indice === undefined) return; dados.arquivos.splice(Number(indice), 1); atualizarPreview(); });
    $.tabela?.addEventListener("click", (evento) => { const id = evento.target.closest("[data-qualidade-detalhes]")?.dataset.qualidadeDetalhes; if (id) abrirDetalhes(id); });
    $.modalResolver?.addEventListener("click", (evento) => { if (evento.target.closest("#qualidade-resolver-chamado")) resolverChamado(); });
    $.abrirResolucao?.addEventListener("click", abrirResolucao);
    $.solicitarInfo?.addEventListener("click", abrirSolicitacao);
    el("#qualidade-enviar-pergunta")?.addEventListener("click", enviarSolicitacao);
    el("#qualidade-enviar-resposta")?.addEventListener("click", enviarResposta);
    $.detalhes?.addEventListener("click", (evento) => { const id = evento.target.closest("[data-responder-solicitacao]")?.dataset.responderSolicitacao; if (id) abrirResposta(id); });
    ["#qualidade-busca", "#qualidade-filtro-status", "#qualidade-filtro-origem"].forEach((id) => el(id)?.addEventListener("input", renderizar));
    el("#qualidade-limpar-filtros")?.addEventListener("click", () => { ["#qualidade-busca", "#qualidade-filtro-status", "#qualidade-filtro-origem"].forEach((id) => { el(id).value = ""; }); renderizar(); });
    document.addEventListener("click", (evento) => {
        const alvo = evento.target.closest("[data-fechar-modal]")?.dataset.fecharModal;
        if (alvo === "modal-ocorrencia-qualidade") fecharModal($.modalNovo);
        if (alvo === "modal-detalhes-qualidade") fecharModal($.modalDetalhes);
        if (alvo === "modal-resolver-chamado") fecharModal($.modalResolver);
        if (alvo === "modal-solicitar-informacoes") fecharModal($.modalSolicitar);
        if (alvo === "modal-responder-informacoes") fecharModal($.modalResponder);
        if (evento.target.closest('[data-pagina="qualidade"]')) setTimeout(carregar, 0);
    });
    ["#seletor-portal", "#seletor-portal-mobile"].forEach((seletor) => {
        el(seletor)?.addEventListener("change", () => setTimeout(carregar, 0));
    });

    configurarAreaDeAnexo();
    window.addEventListener("load", () => setTimeout(carregar, 500));
    setInterval(() => { if ($.pagina?.classList.contains("pagina-ativa")) carregar(); }, 60000);
})();
