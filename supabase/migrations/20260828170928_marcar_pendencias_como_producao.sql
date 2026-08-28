-- Após uma remessa parcial, itens cujo saldo pendente excede o estoque do CD
-- devem permanecer no fluxo de produção, mesmo que outra parte esteja a caminho.
create or replace function public.recalcular_situacao_pedido_por_remessas(p_pedido_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with resumo as (
    select
      ri.pedido_id,
      ri.produto_id,
      coalesce(sum(ri.quantidade) filter (where r.situacao <> 'cancelada'), 0) as enviada,
      coalesce(sum(ri.quantidade) filter (where r.situacao = 'em_transito'), 0) as em_transito,
      coalesce(sum(ri.quantidade) filter (where r.situacao = 'recebida'), 0) as recebida,
      max(r.recebida_em) filter (where r.situacao = 'recebida') as ultimo_recebimento
    from public.remessa_itens ri
    join public.remessas r on r.id = ri.remessa_id
    where ri.pedido_id = p_pedido_id
    group by ri.pedido_id, ri.produto_id
  ), dados as (
    select
      i.pedido_id, i.produto_id, i.quantidade_solicitada, i.situacao as situacao_atual,
      coalesce(r.enviada, 0) as enviada,
      coalesce(r.em_transito, 0) as em_transito,
      coalesce(r.recebida, 0) as recebida,
      r.ultimo_recebimento,
      coalesce(p.quantidade, 0) as estoque_cd
    from public.pedido_itens i
    left join resumo r on r.pedido_id = i.pedido_id and r.produto_id = i.produto_id
    left join public.produtos p on p.id = i.produto_id
    where i.pedido_id = p_pedido_id
  )
  update public.pedido_itens i
  set situacao = case
        when dados.situacao_atual = 'recusado' then 'recusado'
        when dados.recebida >= dados.quantidade_solicitada then 'recebido'
        when dados.quantidade_solicitada - dados.enviada > dados.estoque_cd then 'em_producao'
        when dados.em_transito > 0 then 'em_transito'
        when dados.enviada > 0 then 'aprovado'
        when dados.situacao_atual in ('em_transito', 'recebido', 'agendado_envio') then 'aprovado'
        else dados.situacao_atual
      end,
      recebido_em = case
        when dados.recebida >= dados.quantidade_solicitada then dados.ultimo_recebimento
        else null
      end
  from dados
  where i.pedido_id = dados.pedido_id and i.produto_id = dados.produto_id;

  update public.pedidos p
  set situacao = case
        when not exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao <> 'recusado') then 'recusado'
        when not exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao not in ('recebido', 'recusado')) then 'recebido'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'em_producao') then 'em_producao'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'em_transito') then 'em_transito'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'aprovado') then 'aprovado'
        else 'pendente'
      end,
      recebido_em = case
        when not exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao not in ('recebido', 'recusado'))
          then (select max(recebida_em) from public.remessas where pedido_id = p.id and situacao = 'recebida')
        else null
      end,
      atualizado_em = now()
  where p.id = p_pedido_id;
end;
$$;

revoke all on function public.recalcular_situacao_pedido_por_remessas(text) from public, anon, authenticated;
