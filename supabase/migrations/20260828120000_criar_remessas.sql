-- Pedido é a solicitação original; remessa é cada expedição física do pedido.
create table public.remessas (
  id uuid primary key default gen_random_uuid(),
  pedido_id text not null references public.pedidos(id) on delete restrict,
  situacao text not null default 'em_transito'
    check (situacao in ('em_transito', 'recebida', 'cancelada')),
  envio_previsto date,
  entrega_prevista date,
  enviada_em timestamptz not null default now(),
  recebida_em timestamptz,
  criada_por uuid references auth.users(id),
  recebida_por uuid references auth.users(id),
  criada_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check ((situacao = 'recebida') = (recebida_em is not null))
);

create table public.remessa_itens (
  remessa_id uuid not null references public.remessas(id) on delete restrict,
  pedido_id text not null,
  produto_id text not null,
  quantidade integer not null check (quantidade > 0),
  recebido_em timestamptz,
  primary key (remessa_id, produto_id),
  foreign key (pedido_id, produto_id)
    references public.pedido_itens(pedido_id, produto_id) on delete restrict
);

alter table public.movimentacoes
  add column remessa_id uuid references public.remessas(id) on delete restrict;

create unique index movimentacoes_remessa_produto_unico_idx
  on public.movimentacoes(remessa_id, produto_id)
  where remessa_id is not null;
create index remessas_pedido_id_idx on public.remessas(pedido_id, enviada_em);
create index remessas_situacao_idx on public.remessas(situacao) where situacao <> 'recebida';
create index remessa_itens_pedido_produto_idx on public.remessa_itens(pedido_id, produto_id);

alter table public.remessas enable row level security;
alter table public.remessa_itens enable row level security;

create policy "cd administra remessas" on public.remessas for all to authenticated
  using (public.meu_papel() = 'cd_admin') with check (public.meu_papel() = 'cd_admin');
create policy "filial le suas remessas" on public.remessas for select to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id and p.filial_id = public.minha_filial_id()));
create policy "cd administra itens de remessa" on public.remessa_itens for all to authenticated
  using (public.meu_papel() = 'cd_admin') with check (public.meu_papel() = 'cd_admin');
create policy "filial le itens das suas remessas" on public.remessa_itens for select to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id and p.filial_id = public.minha_filial_id()));

create or replace function public.recalcular_situacao_pedido_por_remessas(p_pedido_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.pedido_itens i
  set situacao = case
        when resumo.recebida >= i.quantidade_solicitada then 'recebido'
        when resumo.em_transito > 0 then 'em_transito'
        when resumo.enviada > 0 then 'aprovado'
        else i.situacao
      end,
      recebido_em = case when resumo.recebida >= i.quantidade_solicitada then resumo.ultimo_recebimento else null end
  from lateral (
    select
      coalesce(sum(ri.quantidade) filter (where r.situacao <> 'cancelada'), 0) as enviada,
      coalesce(sum(ri.quantidade) filter (where r.situacao = 'em_transito'), 0) as em_transito,
      coalesce(sum(ri.quantidade) filter (where r.situacao = 'recebida'), 0) as recebida,
      max(r.recebida_em) filter (where r.situacao = 'recebida') as ultimo_recebimento
    from public.remessa_itens ri
    join public.remessas r on r.id = ri.remessa_id
    where ri.pedido_id = i.pedido_id and ri.produto_id = i.produto_id
  ) resumo
  where i.pedido_id = p_pedido_id;

  update public.pedidos p
  set situacao = case
        when not exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao <> 'recusado') then 'recusado'
        when not exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao not in ('recebido', 'recusado')) then 'recebido'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'em_transito') then 'em_transito'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'em_producao') then 'em_producao'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'aprovado') then 'aprovado'
        else 'pendente'
      end,
      recebido_em = case when not exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao not in ('recebido', 'recusado'))
        then (select max(recebida_em) from public.remessas where pedido_id = p.id and situacao = 'recebida') else null end,
      atualizado_em = now()
  where p.id = p_pedido_id;
end;
$$;

create or replace function public.criar_remessa(
  p_pedido_id text,
  p_itens jsonb,
  p_envio_previsto date default null,
  p_entrega_prevista date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remessa_id uuid;
  v_item record;
  v_solicitada integer;
  v_ja_enviada integer;
  v_linhas_atualizadas integer;
  v_agora timestamptz := now();
begin
  if public.meu_papel() <> 'cd_admin' then
    raise exception 'Você não tem permissão para expedir remessas.';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Informe ao menos um item para a remessa.';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_itens) as x(produto_id text, quantidade integer)
    group by produto_id having count(*) > 1
  ) then
    raise exception 'Um produto não pode ser repetido na mesma remessa.';
  end if;

  perform 1 from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'Pedido não encontrado.';
  end if;

  insert into public.remessas (pedido_id, envio_previsto, entrega_prevista, criada_por, enviada_em)
  values (p_pedido_id, p_envio_previsto, p_entrega_prevista, auth.uid(), v_agora)
  returning id into v_remessa_id;

  for v_item in
    select produto_id, quantidade from jsonb_to_recordset(p_itens) as x(produto_id text, quantidade integer)
  loop
    if v_item.produto_id is null or v_item.quantidade is null or v_item.quantidade <= 0 then
      raise exception 'Os itens da remessa devem ter produto e quantidade positiva.';
    end if;

    select quantidade_solicitada into v_solicitada
    from public.pedido_itens
    where pedido_id = p_pedido_id and produto_id = v_item.produto_id
    for update;
    if not found then
      raise exception 'O produto % não pertence ao pedido.', v_item.produto_id;
    end if;

    select coalesce(sum(ri.quantidade), 0)::integer into v_ja_enviada
    from public.remessa_itens ri
    join public.remessas r on r.id = ri.remessa_id
    where ri.pedido_id = p_pedido_id
      and ri.produto_id = v_item.produto_id
      and r.situacao <> 'cancelada';
    if v_item.quantidade > greatest(v_solicitada - v_ja_enviada, 0) then
      raise exception 'Quantidade para % excede o saldo pendente do pedido.', v_item.produto_id;
    end if;

    update public.produtos
    set quantidade = quantidade - v_item.quantidade, atualizado_em = v_agora
    where id = v_item.produto_id and ativo = true and quantidade >= v_item.quantidade;
    get diagnostics v_linhas_atualizadas = row_count;
    if v_linhas_atualizadas <> 1 then
      raise exception 'Estoque insuficiente para o produto %.', v_item.produto_id;
    end if;

    insert into public.remessa_itens (remessa_id, pedido_id, produto_id, quantidade)
    values (v_remessa_id, p_pedido_id, v_item.produto_id, v_item.quantidade);
    insert into public.movimentacoes (id, produto_id, tipo, quantidade, observacao, filial_id, pedido_id, remessa_id, criado_em)
    select gen_random_uuid()::text, v_item.produto_id, 'transferencia', v_item.quantidade,
      'Remessa ' || v_remessa_id::text, p.filial_id, p.id, v_remessa_id, v_agora
    from public.pedidos p where p.id = p_pedido_id;
  end loop;

  perform public.recalcular_situacao_pedido_por_remessas(p_pedido_id);
  return v_remessa_id;
end;
$$;

create or replace function public.confirmar_recebimento_remessa(p_remessa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_id text;
  v_filial_id text;
  v_situacao text;
  v_agora timestamptz := now();
  v_item record;
begin
  select r.pedido_id, p.filial_id, r.situacao
  into v_pedido_id, v_filial_id, v_situacao
  from public.remessas r join public.pedidos p on p.id = r.pedido_id
  where r.id = p_remessa_id for update of r;
  if not found then raise exception 'Remessa não encontrada.'; end if;
  if not (public.meu_papel() = 'cd_admin' or (public.meu_papel() = 'filial' and v_filial_id = public.minha_filial_id())) then
    raise exception 'Você não tem permissão para confirmar esta remessa.';
  end if;
  if v_situacao = 'recebida' then return; end if;
  if v_situacao <> 'em_transito' then raise exception 'Esta remessa não pode ser confirmada.'; end if;

  for v_item in select produto_id, quantidade from public.remessa_itens where remessa_id = p_remessa_id loop
    insert into public.estoque_filiais (filial_id, produto_id, quantidade, atualizado_em)
    values (v_filial_id, v_item.produto_id, v_item.quantidade, v_agora)
    on conflict (filial_id, produto_id) do update
      set quantidade = public.estoque_filiais.quantidade + excluded.quantidade,
          atualizado_em = excluded.atualizado_em;
  end loop;

  update public.remessas
  set situacao = 'recebida', recebida_em = v_agora, recebida_por = auth.uid(), atualizado_em = v_agora
  where id = p_remessa_id;
  update public.remessa_itens set recebido_em = v_agora where remessa_id = p_remessa_id;
  perform public.recalcular_situacao_pedido_por_remessas(v_pedido_id);
end;
$$;

grant execute on function public.criar_remessa(text, jsonb, date, date) to authenticated;
grant execute on function public.confirmar_recebimento_remessa(uuid) to authenticated;
revoke all on function public.criar_remessa(text, jsonb, date, date) from public;
revoke all on function public.confirmar_recebimento_remessa(uuid) from public;
