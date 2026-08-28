-- Reserva o saldo de pedidos em produção para que outro pedido não o consuma.
create table if not exists public.reservas_producao (
  pedido_id text not null references public.pedidos(id) on delete restrict,
  produto_id text not null references public.produtos(id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  criada_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (pedido_id, produto_id)
);

create index if not exists reservas_producao_produto_idx on public.reservas_producao (produto_id, criada_em);
alter table public.reservas_producao enable row level security;
create policy "cd administra reservas de producao" on public.reservas_producao for all to authenticated
  using (public.meu_papel() = 'cd_admin') with check (public.meu_papel() = 'cd_admin');
create policy "filial le reservas dos seus pedidos" on public.reservas_producao for select to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id and p.filial_id = public.minha_filial_id()));

-- Reserva saldos já marcados como produção antes desta migração.
insert into public.reservas_producao (pedido_id, produto_id, quantidade)
select i.pedido_id, i.produto_id,
  i.quantidade_solicitada - coalesce((
    select sum(ri.quantidade)
    from public.remessa_itens ri
    join public.remessas r on r.id = ri.remessa_id
    where ri.pedido_id = i.pedido_id
      and ri.produto_id = i.produto_id
      and r.situacao <> 'cancelada'
  ), 0)
from public.pedido_itens i
where i.situacao = 'em_producao'
  and i.quantidade_solicitada > coalesce((
    select sum(ri.quantidade)
    from public.remessa_itens ri
    join public.remessas r on r.id = ri.remessa_id
    where ri.pedido_id = i.pedido_id
      and ri.produto_id = i.produto_id
      and r.situacao <> 'cancelada'
  ), 0)
on conflict (pedido_id, produto_id) do update
  set quantidade = excluded.quantidade, atualizado_em = now();

create or replace function public.analisar_item_pedido(
  p_pedido_id text,
  p_produto_id text,
  p_acao text,
  p_quantidade integer default null,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitada integer;
  v_agora timestamptz := now();
begin
  if public.meu_papel() <> 'cd_admin' then
    raise exception 'Você não tem permissão para analisar itens.';
  end if;
  if p_acao not in ('aprovar', 'recusar') then
    raise exception 'Ação de análise inválida.';
  end if;

  select quantidade_solicitada into v_solicitada
  from public.pedido_itens
  where pedido_id = p_pedido_id and produto_id = p_produto_id and situacao = 'pendente'
  for update;
  if not found then
    raise exception 'Este item já foi analisado ou não pertence ao pedido.';
  end if;

  if p_acao = 'aprovar' then
    if p_quantidade is null or p_quantidade < 1 or p_quantidade > v_solicitada then
      raise exception 'A quantidade aprovada deve estar entre 1 e o total solicitado.';
    end if;
    update public.pedido_itens
    set situacao = 'aprovado', quantidade_enviada = p_quantidade, observacao_matriz = ''
    where pedido_id = p_pedido_id and produto_id = p_produto_id;
  else
    if nullif(trim(coalesce(p_motivo, '')), '') is null then
      raise exception 'Informe o motivo da recusa.';
    end if;
    update public.pedido_itens
    set situacao = 'recusado', quantidade_enviada = null, observacao_matriz = trim(p_motivo)
    where pedido_id = p_pedido_id and produto_id = p_produto_id;
  end if;

  update public.pedidos p
  set situacao = case
        when not exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao <> 'recusado') then 'recusado'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'pendente') then 'pendente'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'em_producao') then 'em_producao'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'em_transito') then 'em_transito'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'aprovado') then 'aprovado'
        else p.situacao
      end,
      analisado_em = v_agora,
      atualizado_em = v_agora
  where p.id = p_pedido_id;
end;
$$;

create or replace function public.iniciar_producao_pedido(p_pedido_id text, p_prazo_producao date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agora timestamptz := now();
begin
  if public.meu_papel() <> 'cd_admin' then raise exception 'Você não tem permissão para iniciar a produção.'; end if;
  if p_prazo_producao is null then raise exception 'Informe um prazo de produção.'; end if;
  perform 1 from public.pedidos where id = p_pedido_id for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;

  perform 1 from public.produtos p
  join public.pedido_itens i on i.produto_id = p.id
  where i.pedido_id = p_pedido_id and i.situacao <> 'recusado'
  order by p.id for update;

  insert into public.reservas_producao (pedido_id, produto_id, quantidade, criada_em, atualizado_em)
  select i.pedido_id, i.produto_id,
    i.quantidade_solicitada - coalesce((
      select sum(ri.quantidade) from public.remessa_itens ri join public.remessas r on r.id = ri.remessa_id
      where ri.pedido_id = i.pedido_id and ri.produto_id = i.produto_id and r.situacao <> 'cancelada'
    ), 0), v_agora, v_agora
  from public.pedido_itens i
  where i.pedido_id = p_pedido_id and i.situacao <> 'recusado'
    and i.quantidade_solicitada > coalesce((
      select sum(ri.quantidade) from public.remessa_itens ri join public.remessas r on r.id = ri.remessa_id
      where ri.pedido_id = i.pedido_id and ri.produto_id = i.produto_id and r.situacao <> 'cancelada'
    ), 0)
  on conflict (pedido_id, produto_id) do update
    set quantidade = excluded.quantidade, atualizado_em = excluded.atualizado_em;

  if not found then raise exception 'Não há saldo pendente para produção neste pedido.'; end if;
  update public.pedido_itens i set situacao = 'em_producao'
  where i.pedido_id = p_pedido_id and i.situacao <> 'recusado'
    and exists (select 1 from public.reservas_producao r where r.pedido_id = i.pedido_id and r.produto_id = i.produto_id);
  update public.pedidos set situacao = 'em_producao', producao_prevista = p_prazo_producao,
    producao_iniciada_em = v_agora, analisado_em = v_agora,
    observacao_matriz = 'Pedido em produção. Prazo informado: ' || to_char(p_prazo_producao, 'DD/MM/YYYY') || '.', atualizado_em = v_agora
  where id = p_pedido_id;
end;
$$;

create or replace function public.confirmar_recebimento_remessa(p_remessa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_id text; v_filial_id text; v_situacao text; v_agora timestamptz := now(); v_item record;
begin
  select r.pedido_id, p.filial_id, r.situacao into v_pedido_id, v_filial_id, v_situacao
  from public.remessas r join public.pedidos p on p.id = r.pedido_id where r.id = p_remessa_id for update of r;
  if not found then raise exception 'Remessa não encontrada.'; end if;
  if public.meu_papel() <> 'filial' or v_filial_id <> public.minha_filial_id() then
    raise exception 'Somente a filial destinatária pode confirmar esta remessa.';
  end if;
  if v_situacao = 'recebida' then return; end if;
  if v_situacao <> 'em_transito' then raise exception 'Esta remessa não pode ser confirmada.'; end if;
  for v_item in select produto_id, quantidade from public.remessa_itens where remessa_id = p_remessa_id loop
    insert into public.estoque_filiais (filial_id, produto_id, quantidade, atualizado_em)
    values (v_filial_id, v_item.produto_id, v_item.quantidade, v_agora)
    on conflict (filial_id, produto_id) do update set quantidade = public.estoque_filiais.quantidade + excluded.quantidade, atualizado_em = excluded.atualizado_em;
  end loop;
  update public.remessas set situacao = 'recebida', recebida_em = v_agora, recebida_por = auth.uid(), atualizado_em = v_agora where id = p_remessa_id;
  update public.remessa_itens set recebido_em = v_agora where remessa_id = p_remessa_id;
  perform public.recalcular_situacao_pedido_por_remessas(v_pedido_id);
end;
$$;

revoke all on function public.analisar_item_pedido(text, text, text, integer, text) from public, anon;
grant execute on function public.analisar_item_pedido(text, text, text, integer, text) to authenticated;
revoke all on function public.iniciar_producao_pedido(text, date) from public, anon;
grant execute on function public.iniciar_producao_pedido(text, date) to authenticated;
revoke all on function public.confirmar_recebimento_remessa(uuid) from public, anon;
grant execute on function public.confirmar_recebimento_remessa(uuid) to authenticated;
