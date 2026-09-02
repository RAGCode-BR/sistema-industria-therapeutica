-- Módulo de Qualidade: registro rastreável de não conformidades.
-- Não altera saldos, reservas, pedidos ou remessas existentes.
begin;

create sequence if not exists public.qualidade_ocorrencias_numero_seq;

create table if not exists public.qualidade_categorias_problema (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (nome = btrim(nome) and nome <> ''),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (nome)
);

create table if not exists public.qualidade_tipos_problema (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.qualidade_categorias_problema(id) on delete restrict,
  nome text not null check (nome = btrim(nome) and nome <> ''),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (categoria_id, nome)
);

create table if not exists public.qualidade_tipos_tratativa (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (nome = btrim(nome) and nome <> ''),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (nome)
);

create table if not exists public.qualidade_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  numero bigint not null default nextval('public.qualidade_ocorrencias_numero_seq'),
  codigo text generated always as ('QLD-' || lpad(numero::text, 6, '0')) stored,
  origem text not null check (origem in ('production', 'expedition', 'transport', 'branch_receiving', 'stock', 'other')),
  filial_id text references public.filiais(id) on delete restrict,
  pedido_id text references public.pedidos(id) on delete restrict,
  remessa_id uuid references public.remessas(id) on delete restrict,
  categoria_problema_id uuid not null references public.qualidade_categorias_problema(id) on delete restrict,
  tipo_problema_id uuid not null references public.qualidade_tipos_problema(id) on delete restrict,
  prioridade text not null default 'medium' check (prioridade in ('low', 'medium', 'high', 'critical')),
  situacao text not null default 'open' check (situacao in ('open', 'analysis', 'treatment', 'waiting_confirmation', 'resolved', 'cancelled')),
  comercializacao text not null default 'waiting_analysis' check (comercializacao in ('allowed', 'blocked', 'waiting_analysis')),
  descricao text not null check (btrim(descricao) <> ''),
  causa_identificada text not null default '',
  observacoes_analise text not null default '',
  tipo_tratativa_id uuid references public.qualidade_tipos_tratativa(id) on delete restrict,
  descricao_tratativa text not null default '',
  prazo_tratativa date,
  criado_por uuid not null references public.usuarios(id) on delete restrict,
  responsavel_id uuid references public.usuarios(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  cancelado_em timestamptz,
  unique (numero),
  unique (codigo),
  check ((situacao = 'resolved') = (resolvido_em is not null)),
  check ((situacao = 'cancelled') = (cancelado_em is not null))
);

create table if not exists public.qualidade_ocorrencia_itens (
  id uuid primary key default gen_random_uuid(),
  ocorrencia_id uuid not null references public.qualidade_ocorrencias(id) on delete restrict,
  produto_id text not null references public.produtos(id) on delete restrict,
  quantidade_afetada integer not null check (quantidade_afetada > 0),
  quantidade_referencia integer check (quantidade_referencia is null or quantidade_referencia >= quantidade_afetada),
  criado_em timestamptz not null default now(),
  unique (ocorrencia_id, produto_id)
);

create table if not exists public.qualidade_evidencias (
  id uuid primary key default gen_random_uuid(),
  ocorrencia_id uuid not null references public.qualidade_ocorrencias(id) on delete restrict,
  caminho_storage text not null unique check (caminho_storage = btrim(caminho_storage) and caminho_storage <> ''),
  nome_arquivo text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  tamanho_bytes integer not null check (tamanho_bytes > 0 and tamanho_bytes <= 10485760),
  contexto text not null default 'initial' check (contexto in ('initial', 'treatment', 'final')),
  legenda text not null default '',
  enviado_por uuid not null references public.usuarios(id) on delete restrict,
  criado_em timestamptz not null default now()
);

create table if not exists public.qualidade_acoes (
  id uuid primary key default gen_random_uuid(),
  ocorrencia_id uuid not null references public.qualidade_ocorrencias(id) on delete restrict,
  titulo text not null check (titulo = btrim(titulo) and titulo <> ''),
  descricao text not null default '',
  responsavel_id uuid references public.usuarios(id) on delete restrict,
  prazo date,
  situacao text not null default 'pending' check (situacao in ('pending', 'in_progress', 'completed', 'cancelled')),
  criado_por uuid not null references public.usuarios(id) on delete restrict,
  criado_em timestamptz not null default now(),
  concluido_em timestamptz
);

create table if not exists public.qualidade_historico (
  id bigint generated always as identity primary key,
  ocorrencia_id uuid not null references public.qualidade_ocorrencias(id) on delete restrict,
  tipo text not null,
  descricao text not null,
  dados jsonb not null default '{}'::jsonb,
  criado_por uuid references public.usuarios(id) on delete restrict,
  criado_em timestamptz not null default now()
);

create index if not exists qualidade_ocorrencias_status_criado_idx on public.qualidade_ocorrencias (situacao, criado_em desc);
create index if not exists qualidade_ocorrencias_filial_idx on public.qualidade_ocorrencias (filial_id, criado_em desc) where filial_id is not null;
create index if not exists qualidade_ocorrencias_pedido_idx on public.qualidade_ocorrencias (pedido_id) where pedido_id is not null;
create index if not exists qualidade_ocorrencias_remessa_idx on public.qualidade_ocorrencias (remessa_id) where remessa_id is not null;
create index if not exists qualidade_ocorrencias_responsavel_idx on public.qualidade_ocorrencias (responsavel_id, situacao) where responsavel_id is not null;
create index if not exists qualidade_itens_produto_idx on public.qualidade_ocorrencia_itens (produto_id, criado_em desc);
create index if not exists qualidade_evidencias_ocorrencia_idx on public.qualidade_evidencias (ocorrencia_id, criado_em);
create index if not exists qualidade_acoes_ocorrencia_idx on public.qualidade_acoes (ocorrencia_id, situacao);
create index if not exists qualidade_historico_ocorrencia_idx on public.qualidade_historico (ocorrencia_id, criado_em desc);

insert into public.qualidade_categorias_problema (nome) values
  ('Produto'), ('Embalagem'), ('Logística'), ('Outros')
on conflict (nome) do nothing;

insert into public.qualidade_tipos_problema (categoria_id, nome)
select c.id, x.nome
from public.qualidade_categorias_problema c
join (values
  ('Produto', 'Fora do padrão'), ('Produto', 'Cor incorreta'), ('Produto', 'Odor diferente'),
  ('Produto', 'Textura inconsistente'), ('Produto', 'Peso/volume incorreto'), ('Produto', 'Defeito de fabricação'), ('Produto', 'Produto vencido'),
  ('Embalagem', 'Embalagem danificada'), ('Embalagem', 'Tampa quebrada'), ('Embalagem', 'Vazamento'), ('Embalagem', 'Rótulo incorreto'), ('Embalagem', 'Rótulo danificado'), ('Embalagem', 'Ausência de rótulo'),
  ('Logística', 'Produto quebrado'), ('Logística', 'Caixa danificada'), ('Logística', 'Produto molhado'), ('Logística', 'Produto amassado'), ('Logística', 'Quantidade divergente'),
  ('Outros', 'Outros')
) as x(categoria, nome) on x.categoria = c.nome
on conflict (categoria_id, nome) do nothing;

insert into public.qualidade_tipos_tratativa (nome) values
  ('Substituição'), ('Retrabalho'), ('Nova produção'), ('Devolução ao CD'), ('Descarte'), ('Reembalagem'), ('Correção de rótulo'), ('Liberação para comercialização'), ('Envio complementar'), ('Análise adicional'), ('Outro')
on conflict (nome) do nothing;

create or replace function public.qualidade_pode_acessar_ocorrencia(p_ocorrencia_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.meu_papel() = 'cd_admin'
    or exists (
      select 1 from public.qualidade_ocorrencias o
      where o.id = p_ocorrencia_id and o.filial_id = public.minha_filial_id()
    )
$$;

create or replace function public.validar_vinculos_ocorrencia_qualidade()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_filial_pedido text; v_pedido_remessa text; v_categoria_tipo uuid;
begin
  if new.pedido_id is not null then
    select filial_id into v_filial_pedido from public.pedidos where id = new.pedido_id;
    if v_filial_pedido is null then raise exception 'Pedido não encontrado.'; end if;
    if new.filial_id is not null and new.filial_id <> v_filial_pedido then raise exception 'A filial deve ser a mesma do pedido informado.'; end if;
    new.filial_id := coalesce(new.filial_id, v_filial_pedido);
  end if;
  if new.remessa_id is not null then
    select pedido_id into v_pedido_remessa from public.remessas where id = new.remessa_id;
    if v_pedido_remessa is null then raise exception 'Remessa não encontrada.'; end if;
    if new.pedido_id is null then new.pedido_id := v_pedido_remessa; end if;
    if new.pedido_id <> v_pedido_remessa then raise exception 'A remessa informada não pertence ao pedido selecionado.'; end if;
    select filial_id into v_filial_pedido from public.pedidos where id = new.pedido_id;
    if new.filial_id is not null and new.filial_id <> v_filial_pedido then raise exception 'A filial deve ser a mesma da remessa informada.'; end if;
    new.filial_id := coalesce(new.filial_id, v_filial_pedido);
  end if;
  select categoria_id into v_categoria_tipo from public.qualidade_tipos_problema where id = new.tipo_problema_id and ativo;
  if v_categoria_tipo is null or v_categoria_tipo <> new.categoria_problema_id then raise exception 'O tipo de problema deve pertencer à categoria selecionada.'; end if;
  new.atualizado_em := now();
  return new;
end
$$;

create trigger qualidade_validar_vinculos before insert or update on public.qualidade_ocorrencias
for each row execute function public.validar_vinculos_ocorrencia_qualidade();

create or replace function public.validar_item_ocorrencia_qualidade()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_pedido_id text; v_remessa_id uuid;
begin
  select pedido_id, remessa_id into v_pedido_id, v_remessa_id from public.qualidade_ocorrencias where id = new.ocorrencia_id;
  if v_remessa_id is not null and not exists (select 1 from public.remessa_itens where remessa_id = v_remessa_id and produto_id = new.produto_id) then
    raise exception 'O produto deve pertencer à remessa selecionada.';
  end if;
  if v_remessa_id is null and v_pedido_id is not null and not exists (select 1 from public.pedido_itens where pedido_id = v_pedido_id and produto_id = new.produto_id) then
    raise exception 'O produto deve pertencer ao pedido selecionado.';
  end if;
  return new;
end
$$;

create trigger qualidade_validar_item before insert or update on public.qualidade_ocorrencia_itens
for each row execute function public.validar_item_ocorrencia_qualidade();

create or replace function public.registrar_historico_qualidade(p_ocorrencia_id uuid, p_tipo text, p_descricao text, p_dados jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.qualidade_historico (ocorrencia_id, tipo, descricao, dados, criado_por)
  values (p_ocorrencia_id, p_tipo, p_descricao, coalesce(p_dados, '{}'::jsonb), auth.uid());
end
$$;

create or replace function public.criar_ocorrencia_qualidade(p_ocorrencia jsonb, p_itens jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_filial text; v_item record;
begin
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'Informe ao menos um produto afetado.'; end if;
  v_filial := nullif(p_ocorrencia->>'filial_id', '');
  if public.meu_papel() = 'filial' and (v_filial is null or v_filial <> public.minha_filial_id()) then raise exception 'A filial só pode registrar ocorrências próprias.'; end if;
  if public.meu_papel() not in ('cd_admin', 'filial') then raise exception 'Você não tem permissão para registrar ocorrências.'; end if;
  insert into public.qualidade_ocorrencias (origem, filial_id, pedido_id, remessa_id, categoria_problema_id, tipo_problema_id, prioridade, comercializacao, descricao, criado_por)
  values (p_ocorrencia->>'origem', v_filial, nullif(p_ocorrencia->>'pedido_id', ''), nullif(p_ocorrencia->>'remessa_id', '')::uuid,
    (p_ocorrencia->>'categoria_problema_id')::uuid, (p_ocorrencia->>'tipo_problema_id')::uuid,
    coalesce(nullif(p_ocorrencia->>'prioridade', ''), 'medium'), coalesce(nullif(p_ocorrencia->>'comercializacao', ''), 'waiting_analysis'),
    p_ocorrencia->>'descricao', auth.uid()) returning id into v_id;
  for v_item in select * from jsonb_to_recordset(p_itens) as x(produto_id text, quantidade_afetada integer, quantidade_referencia integer) loop
    insert into public.qualidade_ocorrencia_itens (ocorrencia_id, produto_id, quantidade_afetada, quantidade_referencia)
    values (v_id, v_item.produto_id, v_item.quantidade_afetada, v_item.quantidade_referencia);
  end loop;
  perform public.registrar_historico_qualidade(v_id, 'created', 'Ocorrência criada.');
  return v_id;
end
$$;

create or replace function public.atualizar_ocorrencia_qualidade(p_ocorrencia_id uuid, p_atualizacao jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_anterior text; v_nova text;
begin
  if public.meu_papel() <> 'cd_admin' then raise exception 'Somente o CD pode analisar e tratar ocorrências.'; end if;
  select situacao into v_anterior from public.qualidade_ocorrencias where id = p_ocorrencia_id for update;
  if v_anterior is null then raise exception 'Ocorrência não encontrada.'; end if;
  v_nova := coalesce(nullif(p_atualizacao->>'situacao', ''), v_anterior);
  update public.qualidade_ocorrencias set
    situacao = v_nova,
    responsavel_id = case when p_atualizacao ? 'responsavel_id' then nullif(p_atualizacao->>'responsavel_id', '')::uuid else responsavel_id end,
    causa_identificada = coalesce(p_atualizacao->>'causa_identificada', causa_identificada),
    observacoes_analise = coalesce(p_atualizacao->>'observacoes_analise', observacoes_analise),
    tipo_tratativa_id = case when p_atualizacao ? 'tipo_tratativa_id' then nullif(p_atualizacao->>'tipo_tratativa_id', '')::uuid else tipo_tratativa_id end,
    descricao_tratativa = coalesce(p_atualizacao->>'descricao_tratativa', descricao_tratativa),
    prazo_tratativa = case when p_atualizacao ? 'prazo_tratativa' then nullif(p_atualizacao->>'prazo_tratativa', '')::date else prazo_tratativa end,
    resolvido_em = case when v_nova = 'resolved' then now() else null end,
    cancelado_em = case when v_nova = 'cancelled' then now() else null end,
    atualizado_em = now()
  where id = p_ocorrencia_id;
  if v_nova <> v_anterior then perform public.registrar_historico_qualidade(p_ocorrencia_id, 'status_changed', 'Status alterado de ' || v_anterior || ' para ' || v_nova || '.', jsonb_build_object('anterior', v_anterior, 'atual', v_nova)); end if;
end
$$;

create or replace function public.adicionar_acao_qualidade(p_ocorrencia_id uuid, p_acao jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if public.meu_papel() <> 'cd_admin' then raise exception 'Somente o CD pode definir ações de qualidade.'; end if;
  insert into public.qualidade_acoes (ocorrencia_id, titulo, descricao, responsavel_id, prazo, criado_por)
  values (p_ocorrencia_id, p_acao->>'titulo', coalesce(p_acao->>'descricao', ''), nullif(p_acao->>'responsavel_id', '')::uuid, nullif(p_acao->>'prazo', '')::date, auth.uid()) returning id into v_id;
  perform public.registrar_historico_qualidade(p_ocorrencia_id, 'action_added', 'Ação adicionada: ' || (p_acao->>'titulo') || '.');
  return v_id;
end
$$;

create or replace function public.atualizar_acao_qualidade(p_acao_id uuid, p_situacao text)
returns void language plpgsql security definer set search_path = public as $$
declare v_ocorrencia uuid; v_titulo text;
begin
  if public.meu_papel() <> 'cd_admin' then raise exception 'Somente o CD pode atualizar ações de qualidade.'; end if;
  update public.qualidade_acoes set situacao = p_situacao, concluido_em = case when p_situacao = 'completed' then now() else null end
  where id = p_acao_id returning ocorrencia_id, titulo into v_ocorrencia, v_titulo;
  if v_ocorrencia is null then raise exception 'Ação não encontrada.'; end if;
  perform public.registrar_historico_qualidade(v_ocorrencia, 'action_changed', 'Ação atualizada: ' || v_titulo || '.');
end
$$;

create or replace function public.registrar_evidencia_qualidade(p_ocorrencia_id uuid, p_evidencia jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.qualidade_pode_acessar_ocorrencia(p_ocorrencia_id) then raise exception 'Você não tem permissão para adicionar evidências a esta ocorrência.'; end if;
  insert into public.qualidade_evidencias (ocorrencia_id, caminho_storage, nome_arquivo, mime_type, tamanho_bytes, contexto, legenda, enviado_por)
  values (p_ocorrencia_id, p_evidencia->>'caminho_storage', p_evidencia->>'nome_arquivo', p_evidencia->>'mime_type', (p_evidencia->>'tamanho_bytes')::integer,
    coalesce(nullif(p_evidencia->>'contexto', ''), 'initial'), coalesce(p_evidencia->>'legenda', ''), auth.uid()) returning id into v_id;
  perform public.registrar_historico_qualidade(p_ocorrencia_id, 'evidence_added', 'Evidência adicionada.');
  return v_id;
end
$$;

alter table public.qualidade_categorias_problema enable row level security;
alter table public.qualidade_tipos_problema enable row level security;
alter table public.qualidade_tipos_tratativa enable row level security;
alter table public.qualidade_ocorrencias enable row level security;
alter table public.qualidade_ocorrencia_itens enable row level security;
alter table public.qualidade_evidencias enable row level security;
alter table public.qualidade_acoes enable row level security;
alter table public.qualidade_historico enable row level security;

grant select on public.qualidade_categorias_problema, public.qualidade_tipos_problema, public.qualidade_tipos_tratativa to authenticated;
grant select on public.qualidade_ocorrencias, public.qualidade_ocorrencia_itens, public.qualidade_evidencias, public.qualidade_acoes, public.qualidade_historico to authenticated;
revoke all on public.qualidade_categorias_problema, public.qualidade_tipos_problema, public.qualidade_tipos_tratativa, public.qualidade_ocorrencias, public.qualidade_ocorrencia_itens, public.qualidade_evidencias, public.qualidade_acoes, public.qualidade_historico from anon;

create policy "qualidade le cadastros" on public.qualidade_categorias_problema for select to authenticated using (true);
create policy "qualidade le tipos" on public.qualidade_tipos_problema for select to authenticated using (true);
create policy "qualidade le tratativas" on public.qualidade_tipos_tratativa for select to authenticated using (true);
create policy "cd administra cadastros qualidade" on public.qualidade_categorias_problema for all to authenticated using (public.meu_papel() = 'cd_admin') with check (public.meu_papel() = 'cd_admin');
create policy "cd administra tipos qualidade" on public.qualidade_tipos_problema for all to authenticated using (public.meu_papel() = 'cd_admin') with check (public.meu_papel() = 'cd_admin');
create policy "cd administra tratativas qualidade" on public.qualidade_tipos_tratativa for all to authenticated using (public.meu_papel() = 'cd_admin') with check (public.meu_papel() = 'cd_admin');
create policy "cd administra ocorrencias qualidade" on public.qualidade_ocorrencias for all to authenticated using (public.meu_papel() = 'cd_admin') with check (public.meu_papel() = 'cd_admin');
create policy "filial le ocorrencias qualidade proprias" on public.qualidade_ocorrencias for select to authenticated using (filial_id = public.minha_filial_id());
create policy "qualidade le itens permitidos" on public.qualidade_ocorrencia_itens for select to authenticated using (public.qualidade_pode_acessar_ocorrencia(ocorrencia_id));
create policy "qualidade le evidencias permitidas" on public.qualidade_evidencias for select to authenticated using (public.qualidade_pode_acessar_ocorrencia(ocorrencia_id));
create policy "qualidade le acoes permitidas" on public.qualidade_acoes for select to authenticated using (public.qualidade_pode_acessar_ocorrencia(ocorrencia_id));
create policy "qualidade le historico permitido" on public.qualidade_historico for select to authenticated using (public.qualidade_pode_acessar_ocorrencia(ocorrencia_id));

revoke all on function public.qualidade_pode_acessar_ocorrencia(uuid), public.validar_vinculos_ocorrencia_qualidade(), public.validar_item_ocorrencia_qualidade(), public.registrar_historico_qualidade(uuid, text, text, jsonb) from public, anon;
revoke all on function public.criar_ocorrencia_qualidade(jsonb, jsonb), public.atualizar_ocorrencia_qualidade(uuid, jsonb), public.adicionar_acao_qualidade(uuid, jsonb), public.atualizar_acao_qualidade(uuid, text), public.registrar_evidencia_qualidade(uuid, jsonb) from public, anon;
grant execute on function public.criar_ocorrencia_qualidade(jsonb, jsonb), public.atualizar_ocorrencia_qualidade(uuid, jsonb), public.adicionar_acao_qualidade(uuid, jsonb), public.atualizar_acao_qualidade(uuid, text), public.registrar_evidencia_qualidade(uuid, jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quality-evidence', 'quality-evidence', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "qualidade le evidencias storage" on storage.objects;
drop policy if exists "qualidade envia evidencias storage" on storage.objects;
drop policy if exists "cd remove evidencias storage" on storage.objects;
create policy "qualidade le evidencias storage" on storage.objects for select to authenticated
using (bucket_id = 'quality-evidence' and public.qualidade_pode_acessar_ocorrencia((storage.foldername(name))[1]::uuid));
create policy "qualidade envia evidencias storage" on storage.objects for insert to authenticated
with check (bucket_id = 'quality-evidence' and public.qualidade_pode_acessar_ocorrencia((storage.foldername(name))[1]::uuid));
create policy "cd remove evidencias storage" on storage.objects for delete to authenticated
using (bucket_id = 'quality-evidence' and public.meu_papel() = 'cd_admin');

commit;
