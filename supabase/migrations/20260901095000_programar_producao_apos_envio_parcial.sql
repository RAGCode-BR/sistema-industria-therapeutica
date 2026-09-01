-- Permite programar o saldo de um produto mesmo quando outra parte já está em trânsito.
create or replace function public.iniciar_producao_item_pedido(
  p_pedido_id text,
  p_produto_id text,
  p_prazo_producao date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitada integer;
  v_enviada integer;
  v_pendente integer;
  v_situacao text;
  v_agora timestamptz := now();
begin
  if public.meu_papel() <> 'cd_admin' then raise exception 'Você não tem permissão para programar a produção.'; end if;
  if p_prazo_producao is null then raise exception 'Informe uma previsão de produção.'; end if;

  perform 1 from public.pedidos where id = p_pedido_id for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  select quantidade_solicitada, situacao into v_solicitada, v_situacao
  from public.pedido_itens where pedido_id = p_pedido_id and produto_id = p_produto_id for update;
  if not found then raise exception 'Produto não encontrado neste pedido.'; end if;
  if v_situacao not in ('aprovado', 'em_producao', 'em_transito') then
    raise exception 'Este produto precisa estar aprovado antes de programar a produção.';
  end if;

  select coalesce(sum(ri.quantidade), 0)::integer into v_enviada
  from public.remessa_itens ri join public.remessas r on r.id = ri.remessa_id
  where ri.pedido_id = p_pedido_id and ri.produto_id = p_produto_id and r.situacao <> 'cancelada';
  v_pendente := greatest(v_solicitada - v_enviada, 0);
  if v_pendente = 0 then raise exception 'Este produto já foi totalmente enviado.'; end if;

  insert into public.reservas_producao (pedido_id, produto_id, quantidade, criada_em, atualizado_em)
  values (p_pedido_id, p_produto_id, v_pendente, v_agora, v_agora)
  on conflict (pedido_id, produto_id) do update
    set quantidade = excluded.quantidade, atualizado_em = excluded.atualizado_em;

  update public.pedido_itens set situacao = 'em_producao', producao_prevista = p_prazo_producao
  where pedido_id = p_pedido_id and produto_id = p_produto_id;

  update public.pedidos p
  set situacao = case
        when not exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao <> 'recusado') then 'recusado'
        when not exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao not in ('recebido', 'recusado')) then 'recebido'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'em_producao') then 'em_producao'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'em_transito') then 'em_transito'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'aprovado') then 'aprovado'
        else 'pendente'
      end,
      analisado_em = v_agora, atualizado_em = v_agora
  where p.id = p_pedido_id;
end;
$$;

-- Reservas existentes identificam o saldo que permanece em produção, mesmo com
-- outra parcela do mesmo item a caminho ou já recebida pela filial.
create or replace function public.recalcular_situacao_pedido_por_remessas(p_pedido_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with resumos as (
    select i.pedido_id, i.produto_id,
      coalesce(sum(ri.quantidade) filter (where r.situacao <> 'cancelada'), 0) as enviada,
      coalesce(sum(ri.quantidade) filter (where r.situacao = 'em_transito'), 0) as em_transito,
      coalesce(sum(ri.quantidade) filter (where r.situacao = 'recebida'), 0) as recebida,
      max(r.recebida_em) filter (where r.situacao = 'recebida') as ultimo_recebimento
    from public.pedido_itens i
    left join public.remessa_itens ri on ri.pedido_id = i.pedido_id and ri.produto_id = i.produto_id
    left join public.remessas r on r.id = ri.remessa_id
    where i.pedido_id = p_pedido_id
    group by i.pedido_id, i.produto_id
  )
  update public.pedido_itens i
  set situacao = case
        when resumo.recebida >= greatest(i.quantidade_solicitada - i.quantidade_encerrada, 0) then 'recebido'
        when exists (select 1 from public.reservas_producao rp where rp.pedido_id = i.pedido_id and rp.produto_id = i.produto_id and rp.quantidade > 0) then 'em_producao'
        when resumo.em_transito > 0 then 'em_transito'
        when resumo.enviada > 0 then 'aprovado'
        else i.situacao
      end,
      recebido_em = case when resumo.recebida >= greatest(i.quantidade_solicitada - i.quantidade_encerrada, 0) then resumo.ultimo_recebimento else null end
  from resumos resumo
  where i.pedido_id = resumo.pedido_id and i.produto_id = resumo.produto_id;

  update public.pedidos p
  set situacao = case
        when not exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao <> 'recusado') then 'recusado'
        when not exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao not in ('recebido', 'recusado')) then 'recebido'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'em_producao') then 'em_producao'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'em_transito') then 'em_transito'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'aprovado') then 'aprovado'
        else 'pendente'
      end,
      recebido_em = case when not exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao not in ('recebido', 'recusado'))
        then (select max(recebida_em) from public.remessas where pedido_id = p.id and situacao = 'recebida') else null end,
      atualizado_em = now()
  where p.id = p_pedido_id;
end;
$$;

revoke all on function public.iniciar_producao_item_pedido(text, text, date) from public, anon;
grant execute on function public.iniciar_producao_item_pedido(text, text, date) to authenticated;
revoke all on function public.recalcular_situacao_pedido_por_remessas(text) from public, anon, authenticated;
