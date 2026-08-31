-- Corrige a agregação das remessas: o alvo de um UPDATE não pode ser
-- referenciado de dentro daquele LATERAL no PostgreSQL.
create or replace function public.recalcular_situacao_pedido_por_remessas(p_pedido_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with resumos as (
    select
      i.pedido_id,
      i.produto_id,
      coalesce(sum(ri.quantidade) filter (where r.situacao <> 'cancelada'), 0) as enviada,
      coalesce(sum(ri.quantidade) filter (where r.situacao = 'em_transito'), 0) as em_transito,
      coalesce(sum(ri.quantidade) filter (where r.situacao = 'recebida'), 0) as recebida,
      max(r.recebida_em) filter (where r.situacao = 'recebida') as ultimo_recebimento
    from public.pedido_itens i
    left join public.remessa_itens ri
      on ri.pedido_id = i.pedido_id and ri.produto_id = i.produto_id
    left join public.remessas r on r.id = ri.remessa_id
    where i.pedido_id = p_pedido_id
    group by i.pedido_id, i.produto_id
  )
  update public.pedido_itens i
  set situacao = case
        when resumo.recebida >= greatest(i.quantidade_solicitada - i.quantidade_encerrada, 0) then 'recebido'
        when resumo.em_transito > 0 then 'em_transito'
        when resumo.enviada > 0 then 'aprovado'
        else i.situacao
      end,
      recebido_em = case
        when resumo.recebida >= greatest(i.quantidade_solicitada - i.quantidade_encerrada, 0)
          then resumo.ultimo_recebimento
        else null
      end
  from resumos resumo
  where i.pedido_id = resumo.pedido_id and i.produto_id = resumo.produto_id;

  update public.pedidos p
  set situacao = case
        when not exists (
          select 1 from public.pedido_itens where pedido_id = p.id and situacao <> 'recusado'
        ) then 'recusado'
        when not exists (
          select 1 from public.pedido_itens where pedido_id = p.id and situacao not in ('recebido', 'recusado')
        ) then 'recebido'
        when exists (
          select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'em_transito'
        ) then 'em_transito'
        when exists (
          select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'em_producao'
        ) then 'em_producao'
        when exists (
          select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'aprovado'
        ) then 'aprovado'
        else 'pendente'
      end,
      recebido_em = case
        when not exists (
          select 1 from public.pedido_itens where pedido_id = p.id and situacao not in ('recebido', 'recusado')
        ) then (
          select max(recebida_em) from public.remessas where pedido_id = p.id and situacao = 'recebida'
        )
        else null
      end,
      atualizado_em = now()
  where p.id = p_pedido_id;
end;
$$;

revoke all on function public.recalcular_situacao_pedido_por_remessas(text) from public, anon, authenticated;
