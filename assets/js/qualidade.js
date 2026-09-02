(function () {
    const Q = window.QualidadeUtils;
    if (!Q) return;
    const el = (seletor) => document.querySelector(seletor);
    const $ = {
        pagina: el("#pagina-qualidade"), tabela: el("#qualidade-tabela-ocorrencias"), resumo: el("#qualidade-resumo-lista"),
        rankingProdutos: el("#qualidade-ranking-produtos"), rankingOrigens: el("#qualidade-ranking-origens"),
        modalNovo: el("#modal-ocorrencia-qualidade"), modalDetalhes: el("#modal-detalhes-qualidade"), form: el("#formulario-ocorrencia-qualidade"),
        origem: el("#qualidade-origem"), filial: el("#qualidade-filial"), pedido: el("#qualidade-pedido"), remessa: el("#qualidade-remessa"), categoria: el("#qualidade-categoria"), tipo: el("#qualidade-tipo"),
        prioridade: el("#qualidade-prioridade"), comercializacao: el("#qualidade-comercializacao"), descricao: el("#qualidade-descricao"), itens: el("#qualidade-itens-formulario"),
        arquivos: el("#qualidade-arquivos"), preview: el("#qualidade-preview-arquivos"), mensagem: el("#qualidade-mensagem-formulario"), salvar: el("#qualidade-salvar-ocorrencia"),
        detalhesTitulo: el("#qualidade-titulo-detalhes"), detalhes: el("#qualidade-detalhes-conteudo")
    };
    const estadoQualidade = { ocorrencias: [], categorias: [], tipos: [], tratativas: [], evidencias: [], acoes: [], historico: [], arquivos: [], ocorrenciaAtual: null };
    const e = (valor) => String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
    const cd = () => perfilAtual?.papel === "cd_admin";
    const toast = (texto, tipo = "sucesso") => typeof notificar === "function" ? notificar(texto, tipo) : window.alert(texto);
    const data = (valor) => valor ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(valor)) : "—";
    const classeStatus = (status) => `qualidade-status qualidade-status-${status}`;
    const modalAbrir = (modal) => { modal.classList.add("modal-aberto"); modal.setAttribute("aria-hidden", "false"); };
    const modalFechar = (modal) => { modal.classList.remove("modal-aberto"); modal.setAttribute("aria-hidden", "true"); };
    const produtos = () => (estado?.produtos || []).filter((p) => p.ativo);
    const filial = (id) => (estado?.filiais || []).find((item) => item.id === id);
    const produto = (id) => produtos().find((item) => item.id === id);
    const pedido = (id) => (estado?.pedidos || []).find((item) => item.id === id);
    const remessa = (id) => (estado?.remessas || []).find((item) => item.id === id);
    const usuario = (id) => (usuarios || []).find((item) => item.id === id);
    const tipo = (id) => estadoQualidade.tipos.find((item) => item.id === id);
    const categoria = (id) => estadoQualidade.categorias.find((item) => item.id === id);
    const itensOcorrencia = (id) => (estadoQualidade.ocorrencias.find((o) => o.id === id)?.itens || []);

    async function carregar() {
        if (!clienteSupabase) return;
        const [ocorrencias, categorias, tipos, tratativas, evidencias, acoes, historico] = await Promise.all([
            clienteSupabase.from("qualidade_ocorrencias").select("*, itens:qualidade_ocorrencia_itens(*)").order("criado_em", { ascending: false }),
            clienteSupabase.from("qualidade_categorias_problema").select("*").eq("ativo", true).order("nome"),
            clienteSupabase.from("qualidade_tipos_problema").select("*").eq("ativo", true).order("nome"),
            clienteSupabase.from("qualidade_tipos_tratativa").select("*").eq("ativo", true).order("nome"),
            clienteSupabase.from("qualidade_evidencias").select("*").order("criado_em"),
            clienteSupabase.from("qualidade_acoes").select("*").order("criado_em"),
            clienteSupabase.from("qualidade_historico").select("*").order("criado_em", { ascending: false })
        ]);
        const erro = [ocorrencias, categorias, tipos, tratativas, evidencias, acoes, historico].find((r) => r.error)?.error;
        if (erro) { console.error(erro); if ($.pagina?.classList.contains("pagina-ativa")) toast("Não foi possível carregar as ocorrências de qualidade.", "erro"); return; }
        estadoQualidade.ocorrencias = ocorrencias.data || [];
        estadoQualidade.categorias = categorias.data || [];
        estadoQualidade.tipos = tipos.data || [];
        estadoQualidade.tratativas = tratativas.data || [];
        estadoQualidade.evidencias = evidencias.data || [];
        estadoQualidade.acoes = acoes.data || [];
        estadoQualidade.historico = historico.data || [];
        if (cd() && !usuarios.length) { const resultado = await clienteSupabase.rpc("listar_usuarios"); if (!resultado.error) usuarios = resultado.data || []; }
        renderizar();
    }

    function ocorrenciasFiltradas() {
        const busca = (el("#qualidade-busca")?.value || "").trim().toLocaleLowerCase("pt-BR");
        const status = el("#qualidade-filtro-status")?.value || "";
        const prioridade = el("#qualidade-filtro-prioridade")?.value || "";
        const origem = el("#qualidade-filtro-origem")?.value || "";
        const filialId = el("#qualidade-filtro-filial")?.value || "";
        const produtoId = el("#qualidade-filtro-produto")?.value || "";
        return estadoQualidade.ocorrencias.filter((o) => {
            const nomes = (o.itens || []).map((i) => produto(i.produto_id)?.nome || "").join(" ");
            const problema = tipo(o.tipo_problema_id)?.nome || "";
            return (!status || o.situacao === status) && (!prioridade || o.prioridade === prioridade) && (!origem || o.origem === origem) && (!filialId || o.filial_id === filialId) && (!produtoId || (o.itens || []).some((i) => i.produto_id === produtoId)) && (!busca || `${o.codigo} ${nomes} ${problema}`.toLocaleLowerCase("pt-BR").includes(busca));
        });
    }

    function preencherFiltros() {
        const filialFiltro = el("#qualidade-filtro-filial"); const produtoFiltro = el("#qualidade-filtro-produto");
        if (!filialFiltro || filialFiltro.dataset.pronto) return;
        filialFiltro.insertAdjacentHTML("beforeend", (estado.filiais || []).map((f) => `<option value="${e(f.id)}">${e(f.nome)}</option>`).join(""));
        produtoFiltro.insertAdjacentHTML("beforeend", produtos().map((p) => `<option value="${e(p.id)}">${e(p.codigo ? `${p.codigo} · ` : "")}${e(p.nome)}</option>`).join(""));
        filialFiltro.dataset.pronto = "true";
    }

    function renderizar() {
        if (!$.pagina) return;
        preencherFiltros();
        const lista = ocorrenciasFiltradas();
        const abertas = lista.filter((o) => o.situacao === "open").length;
        const analise = lista.filter((o) => o.situacao === "analysis").length;
        const tratativa = lista.filter((o) => o.situacao === "treatment").length;
        const criticas = lista.filter((o) => o.prioridade === "critical" && !["resolved", "cancelled"].includes(o.situacao)).length;
        const resolvidas = lista.filter((o) => o.situacao === "resolved");
        const tempos = resolvidas.map((o) => new Date(o.resolvido_em).getTime() - new Date(o.criado_em).getTime()).filter(Number.isFinite);
        [["#qualidade-kpi-abertas", abertas], ["#qualidade-kpi-analise", analise], ["#qualidade-kpi-tratativa", tratativa], ["#qualidade-kpi-criticas", criticas], ["#qualidade-kpi-resolvidas", resolvidas.length]].forEach(([id, v]) => { const n = el(id); if (n) n.textContent = v; });
        const media = el("#qualidade-kpi-tempo"); if (media) media.textContent = tempos.length ? Q.duracao(0, tempos.reduce((a, b) => a + b, 0) / tempos.length) : "—";
        $.resumo.textContent = lista.length ? `${lista.length} ocorrência(s) encontrada(s).` : "Nenhuma ocorrência de qualidade encontrada. Quando uma não conformidade for registrada, ela aparecerá aqui.";
        $.tabela.innerHTML = lista.length ? lista.map((o) => {
            const itens = o.itens || []; const primeiro = itens[0]; const p = produto(primeiro?.produto_id); const problema = tipo(o.tipo_problema_id);
            const afetado = itens.reduce((s, i) => s + Number(i.quantidade_afetada || 0), 0);
            return `<tr><td><strong>${e(o.codigo)}</strong></td><td>${data(o.criado_em)}</td><td>${e(p?.nome || "Vários produtos")}${itens.length > 1 ? `<small> +${itens.length - 1}</small>` : ""}</td><td>${e(filial(o.filial_id)?.nome || "—")}<small>${e(Q.textoOrigem(o.origem))}</small></td><td>${e(problema?.nome || "—")}</td><td>${afetado}</td><td><span class="qualidade-prioridade prioridade-${o.prioridade}">${e(Q.textoPrioridade(o.prioridade))}</span></td><td>${e(usuario(o.responsavel_id)?.nome || "Não definido")}</td><td><span class="${classeStatus(o.situacao)}">${e(Q.textoSituacao(o.situacao))}</span></td><td>${["resolved", "cancelled"].includes(o.situacao) ? "—" : Q.duracao(o.criado_em)}</td><td><button type="button" class="botao-acao" data-qualidade-detalhes="${o.id}">Ver detalhes</button></td></tr>`;
        }).join("") : `<tr><td colspan="11" class="estado-vazio">Nenhuma ocorrência encontrada.</td></tr>`;
        const produtosRanking = new Map(); lista.forEach((o) => (o.itens || []).forEach((i) => { const r = produtosRanking.get(i.produto_id) || { n: 0, q: 0 }; r.n++; r.q += Number(i.quantidade_afetada); produtosRanking.set(i.produto_id, r); }));
        $.rankingProdutos.innerHTML = [...produtosRanking.entries()].sort((a,b) => b[1].n - a[1].n).slice(0, 5).map(([id, r]) => `<tr><td>${e(produto(id)?.nome || "Produto")}</td><td>${r.n}</td><td>${r.q}</td></tr>`).join("") || `<tr><td colspan="3" class="estado-vazio">Sem dados.</td></tr>`;
        const origens = new Map(); lista.forEach((o) => origens.set(o.origem, (origens.get(o.origem) || 0) + 1));
        $.rankingOrigens.innerHTML = [...origens.entries()].sort((a,b) => b[1] - a[1]).map(([id, n]) => `<tr><td>${e(Q.textoOrigem(id))}</td><td>${n}</td></tr>`).join("") || `<tr><td colspan="2" class="estado-vazio">Sem dados.</td></tr>`;
    }

    function opcoes(select, itens, valor, texto, vazio = "Selecione") { select.innerHTML = `<option value="">${vazio}</option>${itens.map((i) => `<option value="${e(valor(i))}">${e(texto(i))}</option>`).join("")}`; }
    function pedidosVisiveis() { return (estado?.pedidos || []).filter((p) => cd() || p.filialId === perfilAtual?.filial_id); }
    function atualizarOpcoesFormulario() {
        const filialAtual = $.filial.value; const pedidoAtual = $.pedido.value; const remessaAtual = $.remessa.value;
        const manterPedido = pedidoAtual; opcoes($.pedido, pedidosVisiveis().filter((p) => !filialAtual || p.filialId === filialAtual), (p) => p.id, (p) => `Pedido #${p.numeroPedido}` , "Sem vínculo"); $.pedido.value = manterPedido;
        const manterRemessa = remessaAtual; opcoes($.remessa, (estado?.remessas || []).filter((r) => !pedidoAtual || r.pedidoId === pedidoAtual), (r) => r.id, (r) => `Remessa ${String(r.id).slice(0, 8)}`, "Sem vínculo"); $.remessa.value = manterRemessa;
        const catAtual = $.categoria.value; opcoes($.categoria, estadoQualidade.categorias, (c) => c.id, (c) => c.nome); $.categoria.value = catAtual || estadoQualidade.categorias[0]?.id || "";
        const tipoAtual = $.tipo.value; opcoes($.tipo, estadoQualidade.tipos.filter((t) => t.categoria_id === $.categoria.value), (t) => t.id, (t) => t.nome); $.tipo.value = tipoAtual;
        renderizarItensFormulario();
    }
    function produtosPermitidos() {
        const r = remessa($.remessa.value); const p = pedido($.pedido.value);
        if (r) { const itens = (estado?.remessas || []).find((x) => x.id === r.id); return produtos().filter((prod) => (estado?.pedidos || []).find((x) => x.id === r.pedidoId)?.itens?.some((i) => i.produtoId === prod.id)); }
        if (p) return produtos().filter((prod) => p.itens?.some((i) => i.produtoId === prod.id));
        return produtos();
    }
    function renderizarItensFormulario() {
        const linhas = $.itens.querySelectorAll(".qualidade-item-linha");
        if (!linhas.length) adicionarItem();
        $.itens.querySelectorAll(".qualidade-item-produto").forEach((select) => { const salvo = select.value; opcoes(select, produtosPermitidos(), (p) => p.id, (p) => `${p.codigo ? `${p.codigo} · ` : ""}${p.nome}`); select.value = salvo; });
    }
    function adicionarItem() {
        const linha = document.createElement("div"); linha.className = "qualidade-item-linha";
        linha.innerHTML = `<label>Produto<select class="qualidade-item-produto" required></select></label><label>Quantidade afetada<input class="qualidade-item-afetada" type="number" min="1" step="1" required></label><label>Quantidade de referência<input class="qualidade-item-referencia" type="number" min="1" step="1"></label><button type="button" class="botao-secundario qualidade-remover-item">Remover</button>`;
        $.itens.appendChild(linha); renderizarItensFormulario();
    }
    function abrirNovo() {
        $.form.reset(); $.mensagem.textContent = ""; $.itens.innerHTML = ""; estadoQualidade.arquivos = [];
        opcoes($.filial, (estado?.filiais || []).filter((f) => cd() || f.id === perfilAtual?.filial_id), (f) => f.id, (f) => f.nome, "Quando aplicável");
        if (!cd()) $.filial.value = perfilAtual?.filial_id || "";
        atualizarOpcoesFormulario(); atualizarPreview(); modalAbrir($.modalNovo);
    }
    function atualizarPreview() { $.preview.innerHTML = estadoQualidade.arquivos.map((f, i) => `<span><img src="${e(URL.createObjectURL(f))}" alt="Prévia de ${e(f.name)}">${e(f.name)} <button type="button" data-remover-arquivo="${i}" aria-label="Remover ${e(f.name)}">×</button></span>`).join(""); }
    function anexarArquivos(files) {
        const arquivos = [...files]; const validos = arquivos.filter(Q.validarImagem);
        if (arquivos.length !== validos.length) toast("Alguns arquivos foram ignorados: aceitamos JPEG, PNG e WEBP de até 10 MB.", "erro");
        estadoQualidade.arquivos = validos; atualizarPreview();
    }
    function configurarAreaDeAnexo() {
        const area = $.arquivos?.closest("label"); if (!area) return;
        area.classList.add("qualidade-dropzone");
        ["dragenter", "dragover"].forEach((tipo) => area.addEventListener(tipo, (evento) => { evento.preventDefault(); area.classList.add("arrastando-arquivo"); }));
        ["dragleave", "dragend"].forEach((tipo) => area.addEventListener(tipo, () => area.classList.remove("arrastando-arquivo")));
        area.addEventListener("drop", (evento) => { evento.preventDefault(); area.classList.remove("arrastando-arquivo"); anexarArquivos(evento.dataTransfer?.files || []); });
    }
    async function enviarEvidencias(ocorrenciaId) {
        for (const arquivo of estadoQualidade.arquivos) {
            const caminho = `${ocorrenciaId}/${crypto.randomUUID()}-${arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            const envio = await clienteSupabase.storage.from("quality-evidence").upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
            if (envio.error) { console.error(envio.error); toast(`Não foi possível enviar ${arquivo.name}.`, "erro"); continue; }
            const registro = await clienteSupabase.rpc("registrar_evidencia_qualidade", { p_ocorrencia_id: ocorrenciaId, p_evidencia: { caminho_storage: caminho, nome_arquivo: arquivo.name, mime_type: arquivo.type, tamanho_bytes: arquivo.size, contexto: "initial", legenda: "" } });
            if (registro.error) { console.error(registro.error); toast(`A imagem ${arquivo.name} foi enviada, mas não pôde ser vinculada.`, "erro"); }
        }
    }
    async function salvar(evento) {
        evento.preventDefault(); $.mensagem.textContent = "";
        const itens = [...$.itens.querySelectorAll(".qualidade-item-linha")].map((linha) => ({ produto_id: linha.querySelector(".qualidade-item-produto").value, quantidade_afetada: Number(linha.querySelector(".qualidade-item-afetada").value), quantidade_referencia: Number(linha.querySelector(".qualidade-item-referencia").value) || null }));
        if (itens.some((i) => !i.produto_id || !Number.isInteger(i.quantidade_afetada) || i.quantidade_afetada <= 0 || (i.quantidade_referencia && i.quantidade_afetada > i.quantidade_referencia))) { $.mensagem.textContent = "Revise as quantidades dos produtos afetados."; return; }
        $.salvar.disabled = true;
        const { data: id, error } = await clienteSupabase.rpc("criar_ocorrencia_qualidade", { p_ocorrencia: { origem: $.origem.value, filial_id: $.filial.value, pedido_id: $.pedido.value, remessa_id: $.remessa.value, categoria_problema_id: $.categoria.value, tipo_problema_id: $.tipo.value, prioridade: $.prioridade.value, comercializacao: $.comercializacao.value, descricao: $.descricao.value.trim() }, p_itens: itens });
        if (error) { console.error(error); $.mensagem.textContent = error.message || "Não foi possível registrar a ocorrência."; $.salvar.disabled = false; return; }
        await enviarEvidencias(id); $.salvar.disabled = false; modalFechar($.modalNovo); await carregar(); toast("Ocorrência registrada com sucesso."); abrirDetalhes(id);
    }
    async function abrirDetalhes(id) {
        const o = estadoQualidade.ocorrencias.find((x) => x.id === id); if (!o) return;
        estadoQualidade.ocorrenciaAtual = o; const itens = o.itens || []; const afetado = itens.reduce((s, i) => s + Number(i.quantidade_afetada), 0);
        const evidencias = estadoQualidade.evidencias.filter((x) => x.ocorrencia_id === id); const acoes = estadoQualidade.acoes.filter((x) => x.ocorrencia_id === id); const eventos = estadoQualidade.historico.filter((x) => x.ocorrencia_id === id);
        $.detalhesTitulo.textContent = `${o.codigo} · ${Q.textoSituacao(o.situacao)}`;
        $.detalhes.innerHTML = `<section class="qualidade-detalhes-grid"><div><small>Origem</small><strong>${e(Q.textoOrigem(o.origem))}</strong></div><div><small>Prioridade</small><strong>${e(Q.textoPrioridade(o.prioridade))}</strong></div><div><small>Filial</small><strong>${e(filial(o.filial_id)?.nome || "Não aplicável")}</strong></div><div><small>Comercialização</small><strong>${e({allowed:"Liberado",blocked:"Bloqueado",waiting_analysis:"Aguardando avaliação"}[o.comercializacao])}</strong></div></section><section class="qualidade-bloco"><h3>Produtos afetados</h3>${itens.map((i) => `<p><strong>${e(produto(i.produto_id)?.nome || "Produto")}</strong> · ${i.quantidade_afetada} afetada(s)${i.quantidade_referencia ? ` de ${i.quantidade_referencia}` : ""}</p>`).join("")}</section><section class="qualidade-bloco"><h3>Problema</h3><p><strong>${e(categoria(o.categoria_problema_id)?.nome || "")}</strong> · ${e(tipo(o.tipo_problema_id)?.nome || "")}</p><p>${e(o.descricao)}</p>${o.pedido_id ? `<p>Pedido: <strong>#${e(pedido(o.pedido_id)?.numeroPedido || "")}</strong></p>` : ""}</section><section class="qualidade-bloco"><h3>Evidências</h3><div class="qualidade-galeria" id="qualidade-galeria">${evidencias.length ? "Carregando imagens…" : "Nenhuma evidência adicionada."}</div><label class="qualidade-adicionar-evidencia">Adicionar evidências<input id="qualidade-adicionar-evidencia" type="file" multiple accept="image/jpeg,image/png,image/webp"></label></section><section class="qualidade-bloco"><h3>Análise e tratativa</h3>${cd() ? `<form id="qualidade-form-tratativa"><div class="grade-formulario-qualidade"><label>Status<select id="qualidade-editar-status">${["open","analysis","treatment","waiting_confirmation","resolved","cancelled"].map((s) => `<option value="${s}" ${o.situacao === s ? "selected" : ""}>${e(Q.textoSituacao(s))}</option>`).join("")}</select></label><label>Responsável<select id="qualidade-editar-responsavel"><option value="">Não definido</option>${(usuarios || []).map((u) => `<option value="${u.id}" ${o.responsavel_id === u.id ? "selected" : ""}>${e(u.nome)}</option>`).join("")}</select></label><label>Tratativa<select id="qualidade-editar-tratativa"><option value="">Não definida</option>${estadoQualidade.tratativas.map((t) => `<option value="${t.id}" ${o.tipo_tratativa_id === t.id ? "selected" : ""}>${e(t.nome)}</option>`).join("")}</select></label><label>Prazo<input id="qualidade-editar-prazo" type="date" value="${e(o.prazo_tratativa || "")}"></label></div><label>Causa identificada<textarea id="qualidade-editar-causa" rows="2">${e(o.causa_identificada)}</textarea></label><label>Descrição da tratativa<textarea id="qualidade-editar-descricao" rows="2">${e(o.descricao_tratativa)}</textarea></label><div class="acoes-formulario"><button class="botao-principal" type="submit">Salvar análise</button></div></form>` : `<p>${e(o.causa_identificada || "Aguardando análise do CD.")}</p>`}</section><section class="qualidade-bloco"><h3>Ações</h3><div class="qualidade-acoes">${acoes.map((a) => `<p><strong>${e(a.titulo)}</strong> · ${e(a.situacao)} ${cd() && a.situacao !== "completed" ? `<button type="button" class="botao-acao" data-qualidade-concluir-acao="${a.id}">Concluir</button>` : ""}</p>`).join("") || "Nenhuma ação registrada."}</div>${cd() ? `<form id="qualidade-form-acao" class="qualidade-nova-acao"><input id="qualidade-acao-titulo" required placeholder="Nova ação"><input id="qualidade-acao-prazo" type="date"><button class="botao-secundario">Adicionar ação</button></form>` : ""}</section><section class="qualidade-bloco"><h3>Histórico</h3><div class="qualidade-timeline">${eventos.map((h) => `<p><strong>${data(h.criado_em)}</strong> · ${e(h.descricao)}</p>`).join("") || "Sem eventos."}</div></section>`;
        modalAbrir($.modalDetalhes); carregarGaleria(evidencias); 
    }
    async function carregarGaleria(evidencias) { const galeria = el("#qualidade-galeria"); if (!galeria || !evidencias.length) return; const urls = await Promise.all(evidencias.map(async (ev) => { const r = await clienteSupabase.storage.from("quality-evidence").createSignedUrl(ev.caminho_storage, 3600); return r.data?.signedUrl ? `<a href="${e(r.data.signedUrl)}" target="_blank" rel="noopener"><img src="${e(r.data.signedUrl)}" alt="${e(ev.legenda || ev.nome_arquivo)}"></a>` : `<span>${e(ev.nome_arquivo)}</span>`; })); galeria.innerHTML = urls.join(""); }
    async function salvarTratativa(evento) { evento.preventDefault(); const o = estadoQualidade.ocorrenciaAtual; const { error } = await clienteSupabase.rpc("atualizar_ocorrencia_qualidade", { p_ocorrencia_id: o.id, p_atualizacao: { situacao: el("#qualidade-editar-status").value, responsavel_id: el("#qualidade-editar-responsavel").value, tipo_tratativa_id: el("#qualidade-editar-tratativa").value, prazo_tratativa: el("#qualidade-editar-prazo").value, causa_identificada: el("#qualidade-editar-causa").value, descricao_tratativa: el("#qualidade-editar-descricao").value } }); if (error) { toast(error.message, "erro"); return; } await carregar(); abrirDetalhes(o.id); toast("Análise atualizada."); }
    async function adicionarAcao(evento) { evento.preventDefault(); const o = estadoQualidade.ocorrenciaAtual; const { error } = await clienteSupabase.rpc("adicionar_acao_qualidade", { p_ocorrencia_id: o.id, p_acao: { titulo: el("#qualidade-acao-titulo").value.trim(), prazo: el("#qualidade-acao-prazo").value } }); if (error) { toast(error.message, "erro"); return; } await carregar(); abrirDetalhes(o.id); }
    async function concluirAcao(id) { const o = estadoQualidade.ocorrenciaAtual; const { error } = await clienteSupabase.rpc("atualizar_acao_qualidade", { p_acao_id: id, p_situacao: "completed" }); if (error) { toast(error.message, "erro"); return; } await carregar(); abrirDetalhes(o.id); }
    async function adicionarEvidencias(files) { const o = estadoQualidade.ocorrenciaAtual; const validos = [...files].filter(Q.validarImagem); if (!validos.length) { toast("Selecione imagens JPEG, PNG ou WEBP de até 10 MB.", "erro"); return; } estadoQualidade.arquivos = validos; await enviarEvidencias(o.id); await carregar(); abrirDetalhes(o.id); }

    el("#botao-nova-ocorrencia-qualidade")?.addEventListener("click", abrirNovo); configurarAreaDeAnexo();
    $.form?.addEventListener("submit", salvar); $.origem?.addEventListener("change", atualizarOpcoesFormulario); $.filial?.addEventListener("change", atualizarOpcoesFormulario); $.pedido?.addEventListener("change", atualizarOpcoesFormulario); $.remessa?.addEventListener("change", atualizarOpcoesFormulario); $.categoria?.addEventListener("change", atualizarOpcoesFormulario); el("#qualidade-adicionar-item")?.addEventListener("click", adicionarItem);
    $.itens?.addEventListener("click", (ev) => { if (ev.target.closest(".qualidade-remover-item")) { ev.target.closest(".qualidade-item-linha").remove(); if (!$.itens.children.length) adicionarItem(); } });
    $.arquivos?.addEventListener("change", () => { const arquivos = [...$.arquivos.files]; const invalidos = arquivos.filter((f) => !Q.validarImagem(f)); if (invalidos.length) toast("Alguns arquivos foram ignorados: aceitamos JPEG, PNG e WEBP de até 10 MB.", "erro"); estadoQualidade.arquivos = arquivos.filter(Q.validarImagem); atualizarPreview(); });
    $.preview?.addEventListener("click", (ev) => { const i = ev.target.dataset.removerArquivo; if (i !== undefined) { estadoQualidade.arquivos.splice(Number(i), 1); atualizarPreview(); } });
    ["#qualidade-busca", "#qualidade-filtro-status", "#qualidade-filtro-prioridade", "#qualidade-filtro-origem", "#qualidade-filtro-filial", "#qualidade-filtro-produto"].forEach((id) => el(id)?.addEventListener("input", renderizar));
    el("#qualidade-limpar-filtros")?.addEventListener("click", () => { ["#qualidade-busca", "#qualidade-filtro-status", "#qualidade-filtro-prioridade", "#qualidade-filtro-origem", "#qualidade-filtro-filial", "#qualidade-filtro-produto"].forEach((id) => { el(id).value = ""; }); renderizar(); });
    $.tabela?.addEventListener("click", (ev) => { const id = ev.target.closest("[data-qualidade-detalhes]")?.dataset.qualidadeDetalhes; if (id) abrirDetalhes(id); });
    $.detalhes?.addEventListener("submit", (ev) => { if (ev.target.id === "qualidade-form-tratativa") salvarTratativa(ev); if (ev.target.id === "qualidade-form-acao") adicionarAcao(ev); });
    $.detalhes?.addEventListener("click", (ev) => { const id = ev.target.closest("[data-qualidade-concluir-acao]")?.dataset.qualidadeConcluirAcao; if (id) concluirAcao(id); });
    $.detalhes?.addEventListener("change", (ev) => { if (ev.target.id === "qualidade-adicionar-evidencia") adicionarEvidencias(ev.target.files); });
    document.addEventListener("click", (ev) => { const fechar = ev.target.closest("[data-fechar-modal]"); if (fechar?.dataset.fecharModal === "modal-ocorrencia-qualidade") modalFechar($.modalNovo); if (fechar?.dataset.fecharModal === "modal-detalhes-qualidade") modalFechar($.modalDetalhes); });
    window.addEventListener("load", () => setTimeout(carregar, 500));
    setInterval(() => { if ($.pagina?.classList.contains("pagina-ativa")) carregar(); }, 60000);
})();
