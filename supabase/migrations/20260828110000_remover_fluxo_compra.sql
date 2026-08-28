-- A indústria fabrica os próprios produtos: compras não fazem parte do fluxo.
-- Registros legados, caso existam, passam a ser acompanhados como produção.
update public.pedido_itens
set situacao = 'em_producao',
    observacao_matriz = coalesce(nullif(observacao_matriz, ''), 'Item migrado para produção interna.')
where situacao = 'aguardando_compra';

update public.pedidos
set situacao = 'em_producao',
    observacao_matriz = coalesce(nullif(observacao_matriz, ''), 'Pedido migrado para produção interna.')
where situacao = 'aguardando_compra';

alter table public.pedidos drop constraint if exists pedidos_situacao_check;
alter table public.pedidos add constraint pedidos_situacao_check
  check (situacao in ('pendente', 'aprovado', 'em_producao', 'agendado_envio', 'em_transito', 'recebido', 'recusado'));

alter table public.pedido_itens drop constraint if exists pedido_itens_situacao_check;
alter table public.pedido_itens add constraint pedido_itens_situacao_check
  check (situacao in ('pendente', 'aprovado', 'em_producao', 'agendado_envio', 'em_transito', 'recebido', 'recusado'));

alter table public.pedidos
  drop column if exists compra_prevista,
  drop column if exists compra_recebida_em;

create or replace function public.confirmar_recebimento_item_pedido(
  p_pedido_id text,
  p_produto_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filial_id text;
  v_quantidade integer;
  v_agora timestamptz := now();
  v_situacao_pedido text;
begin
  select filial_id into v_filial_id from public.pedidos where id = p_pedido_id;

  if v_filial_id is null or not (
    public.meu_papel() = 'cd_admin'
    or (public.meu_papel() = 'filial' and v_filial_id = public.minha_filial_id())
  ) then
    raise exception 'Você não tem permissão para confirmar este pedido.';
  end if;

  select coalesce(quantidade_enviada, quantidade_solicitada) into v_quantidade
  from public.pedido_itens
  where pedido_id = p_pedido_id and produto_id = p_produto_id and situacao = 'em_transito';

  if v_quantidade is null then
    raise exception 'Este item não está aguardando confirmação.';
  end if;

  insert into public.estoque_filiais (filial_id, produto_id, quantidade, atualizado_em)
  values (v_filial_id, p_produto_id, v_quantidade, v_agora)
  on conflict (filial_id, produto_id) do update
    set quantidade = public.estoque_filiais.quantidade + excluded.quantidade,
        atualizado_em = excluded.atualizado_em;

  update public.pedido_itens
  set situacao = 'recebido', recebido_em = v_agora
  where pedido_id = p_pedido_id and produto_id = p_produto_id and situacao = 'em_transito';

  select case
    when every(situacao in ('recebido', 'recusado')) then 'recebido'
    when bool_or(situacao = 'em_transito') then 'em_transito'
    when bool_or(situacao = 'agendado_envio') then 'agendado_envio'
    when bool_or(situacao = 'em_producao') then 'em_producao'
    when bool_or(situacao = 'aprovado') then 'aprovado'
    else 'pendente'
  end into v_situacao_pedido
  from public.pedido_itens where pedido_id = p_pedido_id;

  update public.pedidos
  set situacao = v_situacao_pedido,
      recebido_em = case when v_situacao_pedido = 'recebido' then v_agora else null end,
      observacao_matriz = case when v_situacao_pedido = 'recebido' then coalesce(nullif(observacao_matriz, ''), 'Todos os itens enviados foram recebidos pela filial.') else observacao_matriz end,
      atualizado_em = v_agora
  where id = p_pedido_id;
end;
$$;

create or replace function public.confirmar_recebimento_pedido(p_pedido_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filial_id text;
  v_agora timestamptz := now();
  v_item record;
  v_situacao_pedido text;
begin
  select filial_id into v_filial_id from public.pedidos where id = p_pedido_id;

  if v_filial_id is null or not (
    public.meu_papel() = 'cd_admin'
    or (public.meu_papel() = 'filial' and v_filial_id = public.minha_filial_id())
  ) then
    raise exception 'Você não tem permissão para confirmar este pedido.';
  end if;

  if not exists (select 1 from public.pedido_itens where pedido_id = p_pedido_id and situacao = 'em_transito') then
    raise exception 'Não há itens enviados aguardando confirmação.';
  end if;

  for v_item in
    select produto_id, coalesce(quantidade_enviada, quantidade_solicitada) as quantidade
    from public.pedido_itens where pedido_id = p_pedido_id and situacao = 'em_transito'
  loop
    insert into public.estoque_filiais (filial_id, produto_id, quantidade, atualizado_em)
    values (v_filial_id, v_item.produto_id, v_item.quantidade, v_agora)
    on conflict (filial_id, produto_id) do update
      set quantidade = public.estoque_filiais.quantidade + excluded.quantidade,
          atualizado_em = excluded.atualizado_em;
  end loop;

  update public.pedido_itens
  set situacao = 'recebido', recebido_em = v_agora
  where pedido_id = p_pedido_id and situacao = 'em_transito';

  select case
    when every(situacao in ('recebido', 'recusado')) then 'recebido'
    when bool_or(situacao = 'em_transito') then 'em_transito'
    when bool_or(situacao = 'agendado_envio') then 'agendado_envio'
    when bool_or(situacao = 'em_producao') then 'em_producao'
    when bool_or(situacao = 'aprovado') then 'aprovado'
    else 'pendente'
  end into v_situacao_pedido
  from public.pedido_itens where pedido_id = p_pedido_id;

  update public.pedidos
  set situacao = v_situacao_pedido,
      recebido_em = case when v_situacao_pedido = 'recebido' then v_agora else null end,
      observacao_matriz = case when v_situacao_pedido = 'recebido' then coalesce(nullif(observacao_matriz, ''), 'Pedido recebido pela filial.') else observacao_matriz end,
      atualizado_em = v_agora
  where id = p_pedido_id;
end;
$$;

grant execute on function public.confirmar_recebimento_item_pedido(text, text) to authenticated;
grant execute on function public.confirmar_recebimento_pedido(text) to authenticated;
