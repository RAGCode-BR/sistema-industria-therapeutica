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
        form: el("#formulario-ocorrencia-qualidade"),
        campoPedido: el("#qualidade-campo-pedido"),
        pedido: el("#qualidade-pedido"),
        campoRemessa: el("#qualidade-campo-remessa"),
        remessa: el("#qualidade-remessa"),
        produto: el("#qualidade-produto"),
        quantidade: el("#qualidade-quantidade"),
        tipo: el("#qualidade-tipo"),
        campoEncaminhamento: el("#qualidade-campo-encaminhamento"),
        encaminhamento: el("#qualidade-encaminhamento"),
        descricao: el("#qualidade-descricao"),
        arquivos: el("#qualidade-arquivos"),
        preview: el("#qualidade-preview-arquivos"),
        mensagem: el("#qualidade-mensagem-formulario"),
        salvar: el("#qualidade-salvar-ocorrencia"),
        detalhesTitulo: el("#qualidade-titulo-detalhes"),
        detalhes: el("#qualidade-detalhes-conteudo")
    };

    const dados = { chamados: [], tipos: [], categorias: [], evidencias: [], historico: [], responsaveis: [], arquivos: [], atual: null };
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
            const correspondeStatus = !status
                || (status === "resolved" && chamado.situacao === "resolved")
                || (status === "cd" && chamado.situacao !== "resolved" && chamado.origem === "branch_receiving" && chamado.encaminhamento === "cd")
                || (status === "open" && chamado.situacao !== "resolved" && !(chamado.origem === "branch_receiving" && chamado.encaminhamento === "cd"));
            return correspondeStatus && (!origem || chamado.origem === origem) && (!busca || textoBusca.includes(busca));
        });
    }

    function renderizar() {
        if (!$.pagina) return;
        const lista = chamadosFiltrados();
        const abertos = lista.filter((item) => item.situacao !== "resolved").length;
        const aguardandoCD = lista.filter((item) => item.situacao !== "resolved" && item.origem === "branch_receiving" && item.encaminhamento === "cd").length;
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
        $.textoApresentacao.textContent = usuarioCD()
            ? "Registre problemas de fabricação e resolva os chamados enviados pelas filiais."
            : "Registre problemas no recebimento e escolha entre resolver na filial ou enviar ao CD.";
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
    }

    function atualizarPreview() {
        $.preview.innerHTML = dados.arquivos.map((arquivo, indice) => `<span><img src="${escapar(URL.createObjectURL(arquivo))}" alt="Prévia de ${escapar(arquivo.name)}"><span>${escapar(arquivo.name)}</span><button type="button" data-remover-arquivo="${indice}" aria-label="Remover ${escapar(arquivo.name)}">×</button></span>`).join("");
    }

    function definirArquivos(files) {
        const arquivos = [...files];
        dados.arquivos = arquivos.filter(Q.validarImagem);
        if (dados.arquivos.length !== arquivos.length) notificarQualidade("Aceitamos apenas JPEG, PNG ou WEBP de até 10 MB.", "erro");
        atualizarPreview();
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
        $.campoEncaminhamento.hidden = usuarioCD();
        $.pedido.required = !usuarioCD();
        $.remessa.required = !usuarioCD();
        preencherPedidos();
        preencherRemessas();
        preencherProdutos();
        preencherTipos();
        abrirModal($.modalNovo);
    }

    async function enviarEvidencias(chamadoId) {
        for (const arquivo of dados.arquivos) {
            const caminho = `${chamadoId}/${crypto.randomUUID()}-${arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            const envio = await clienteSupabase.storage.from("quality-evidence").upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
            if (envio.error) { console.error(envio.error); notificarQualidade(`Não foi possível enviar ${arquivo.name}.`, "erro"); continue; }
            const registro = await clienteSupabase.rpc("registrar_evidencia_qualidade", { p_ocorrencia_id: chamadoId, p_evidencia: { caminho_storage: caminho, nome_arquivo: arquivo.name, mime_type: arquivo.type, tamanho_bytes: arquivo.size, contexto: "initial", legenda: "" } });
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
            encaminhamento: usuarioCD() ? "cd" : $.encaminhamento.value,
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

    async function carregarGaleria(evidencias) {
        const galeria = el("#qualidade-galeria");
        if (!galeria || !evidencias.length) return;
        const imagens = await Promise.all(evidencias.map(async (evidencia) => {
            const resultado = await clienteSupabase.storage.from("quality-evidence").createSignedUrl(evidencia.caminho_storage, 3600);
            return resultado.data?.signedUrl ? `<a href="${escapar(resultado.data.signedUrl)}" target="_blank" rel="noopener"><img src="${escapar(resultado.data.signedUrl)}" alt="${escapar(evidencia.legenda || evidencia.nome_arquivo)}"></a>` : "";
        }));
        galeria.innerHTML = imagens.join("");
    }

    function descricaoHistorico(evento) {
        if (evento.tipo === "created") return "Ocorrência criada no modelo anterior.";
        if (evento.tipo === "status_changed" && evento.dados?.anterior && evento.dados?.atual) return `Status alterado de ${Q.textoSituacao(evento.dados.anterior)} para ${Q.textoSituacao(evento.dados.atual)}.`;
        return evento.descricao;
    }

    function acoesDoChamado(chamado) {
        if (chamado.situacao === "resolved") return `<section class="qualidade-bloco qualidade-resolucao"><h3>Resolução</h3><p>${escapar(chamado.resolucao || "Chamado resolvido.")}</p><small>Resolvido por ${escapar(nomeResponsavel(chamado.resolvido_por))} em ${formatarData(chamado.resolvido_em)}</small></section>`;
        if (!usuarioCD() && chamado.encaminhamento === "cd") return '<section class="qualidade-bloco qualidade-aguardando"><h3>Aguardando a indústria/CD</h3><p>O chamado foi enviado e será resolvido pela equipe do CD.</p></section>';
        const podeEncaminhar = !usuarioCD() && chamado.encaminhamento === "interno";
        return `<section class="qualidade-bloco qualidade-resolver"><h3>${usuarioCD() ? "Resolver chamado" : "Resolver na filial"}</h3><label>Como o problema foi resolvido?<textarea id="qualidade-resolucao" rows="3" placeholder="Descreva de forma objetiva a solução adotada."></textarea></label><p class="mensagem-formulario" id="qualidade-mensagem-resolucao"></p><div class="acoes-formulario">${podeEncaminhar ? '<button type="button" class="botao-secundario botao-encaminhar-cd" id="qualidade-encaminhar-cd">Enviar para o CD</button>' : ""}<button type="button" class="botao-principal" id="qualidade-resolver-chamado">Marcar como resolvido</button></div></section>`;
    }

    function abrirDetalhes(id) {
        const chamado = dados.chamados.find((item) => item.id === id);
        if (!chamado) return;
        dados.atual = chamado;
        const item = chamado.itens?.[0];
        const evidencias = dados.evidencias.filter((registro) => registro.ocorrencia_id === id);
        const eventos = dados.historico.filter((registro) => registro.ocorrencia_id === id);
        $.detalhesTitulo.textContent = `${chamado.codigo} · ${textoStatus(chamado)}`;
        $.detalhes.innerHTML = `<section class="qualidade-resumo-chamado"><div><small>Origem</small><strong>${escapar(textoOrigem(chamado))}</strong></div><div><small>Local</small><strong>${escapar(nomeLocal(chamado))}</strong></div><div><small>Tratamento</small><strong>${escapar(textoTratamento(chamado))}</strong></div><div><small>Status</small><span class="${classeStatus(chamado)}">${escapar(textoStatus(chamado))}</span></div></section><section class="qualidade-bloco"><h3>${escapar(produto(item?.produto_id)?.nome || "Produto")}</h3><p><strong>${Number(item?.quantidade_afetada || 0)} unidade(s) afetada(s)</strong>${item?.quantidade_referencia ? ` de ${Number(item.quantidade_referencia)} enviada(s)` : ""}</p><p>${escapar(tipo(chamado.tipo_problema_id)?.nome || "Problema não informado")} · ${escapar(categoria(chamado.categoria_problema_id)?.nome || "")}</p><p>${escapar(chamado.descricao)}</p></section><section class="qualidade-bloco"><h3>Fotos</h3><div class="qualidade-galeria" id="qualidade-galeria">${evidencias.length ? "Carregando imagens…" : "Nenhuma foto adicionada."}</div></section>${acoesDoChamado(chamado)}<section class="qualidade-bloco"><h3>Histórico</h3><div class="qualidade-timeline">${eventos.map((evento) => `<p><strong>${formatarData(evento.criado_em)}</strong> · ${escapar(descricaoHistorico(evento))}</p>`).join("") || "Sem eventos."}</div></section>`;
        abrirModal($.modalDetalhes);
        carregarGaleria(evidencias);
    }

    async function encaminharParaCD() {
        const chamado = dados.atual;
        if (!chamado || !window.confirm("Enviar este chamado para a indústria/CD? Depois disso, a resolução ficará sob responsabilidade do CD.")) return;
        const { error } = await clienteSupabase.rpc("encaminhar_chamado_qualidade", { p_ocorrencia_id: chamado.id });
        if (error) { notificarQualidade(error.message, "erro"); return; }
        await carregar(); abrirDetalhes(chamado.id); notificarQualidade("Chamado enviado para a indústria/CD.");
    }

    async function resolverChamado() {
        const chamado = dados.atual;
        const resolucao = el("#qualidade-resolucao")?.value.trim() || "";
        const mensagem = el("#qualidade-mensagem-resolucao");
        if (!resolucao) { if (mensagem) mensagem.textContent = "Descreva como o problema foi resolvido."; return; }
        const { error } = await clienteSupabase.rpc("resolver_chamado_qualidade", { p_ocorrencia_id: chamado.id, p_resolucao: resolucao });
        if (error) { if (mensagem) mensagem.textContent = error.message; return; }
        await carregar(); abrirDetalhes(chamado.id); notificarQualidade("Chamado resolvido.");
    }

    el("#botao-nova-ocorrencia-qualidade")?.addEventListener("click", abrirNovoChamado);
    $.form?.addEventListener("submit", salvarChamado);
    $.pedido?.addEventListener("change", () => { preencherRemessas(); $.produto.value = ""; $.quantidade.value = ""; preencherProdutos(); });
    $.remessa?.addEventListener("change", () => { preencherProdutos(); $.quantidade.value = ""; });
    $.produto?.addEventListener("change", atualizarLimiteQuantidade);
    $.arquivos?.addEventListener("change", () => definirArquivos($.arquivos.files));
    $.preview?.addEventListener("click", (evento) => { const indice = evento.target.closest("[data-remover-arquivo]")?.dataset.removerArquivo; if (indice === undefined) return; dados.arquivos.splice(Number(indice), 1); atualizarPreview(); });
    $.tabela?.addEventListener("click", (evento) => { const id = evento.target.closest("[data-qualidade-detalhes]")?.dataset.qualidadeDetalhes; if (id) abrirDetalhes(id); });
    $.detalhes?.addEventListener("click", (evento) => { if (evento.target.closest("#qualidade-encaminhar-cd")) encaminharParaCD(); if (evento.target.closest("#qualidade-resolver-chamado")) resolverChamado(); });
    ["#qualidade-busca", "#qualidade-filtro-status", "#qualidade-filtro-origem"].forEach((id) => el(id)?.addEventListener("input", renderizar));
    el("#qualidade-limpar-filtros")?.addEventListener("click", () => { ["#qualidade-busca", "#qualidade-filtro-status", "#qualidade-filtro-origem"].forEach((id) => { el(id).value = ""; }); renderizar(); });
    document.addEventListener("click", (evento) => {
        const alvo = evento.target.closest("[data-fechar-modal]")?.dataset.fecharModal;
        if (alvo === "modal-ocorrencia-qualidade") fecharModal($.modalNovo);
        if (alvo === "modal-detalhes-qualidade") fecharModal($.modalDetalhes);
        if (evento.target.closest('[data-pagina="qualidade"]')) setTimeout(carregar, 0);
    });
    ["#seletor-portal", "#seletor-portal-mobile"].forEach((seletor) => {
        el(seletor)?.addEventListener("change", () => setTimeout(carregar, 0));
    });

    configurarAreaDeAnexo();
    window.addEventListener("load", () => setTimeout(carregar, 500));
    setInterval(() => { if ($.pagina?.classList.contains("pagina-ativa")) carregar(); }, 60000);
})();
