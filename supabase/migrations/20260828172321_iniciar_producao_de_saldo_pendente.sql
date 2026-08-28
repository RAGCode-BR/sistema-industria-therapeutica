-- Inicia produção somente para o saldo ainda não expedido do pedido.
create or replace function public.iniciar_producao_pedido(
  p_pedido_id text,
  p_prazo_producao date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agora timestamptz := now();
begin
  if public.meu_papel() <> 'cd_admin' then
    raise exception 'Você não tem permissão para iniciar a produção.';
  end if;
  if p_prazo_producao is null then
    raise exception 'Informe um prazo de produção.';
  end if;

  perform 1 from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'Pedido não encontrado.';
  end if;

  update public.pedido_itens i
  set situacao = 'em_producao'
  where i.pedido_id = p_pedido_id
    and i.situacao <> 'recusado'
    and i.quantidade_solicitada > coalesce((
      select sum(ri.quantidade)
      from public.remessa_itens ri
      join public.remessas r on r.id = ri.remessa_id
      where ri.pedido_id = i.pedido_id
        and ri.produto_id = i.produto_id
        and r.situacao <> 'cancelada'
    ), 0);

  if not found then
    raise exception 'Não há saldo pendente para produção neste pedido.';
  end if;

  update public.pedidos
  set situacao = 'em_producao',
      producao_prevista = p_prazo_producao,
      producao_iniciada_em = v_agora,
      analisado_em = v_agora,
      observacao_matriz = 'Pedido em produção. Prazo informado: ' || to_char(p_prazo_producao, 'DD/MM/YYYY') || '.',
      atualizado_em = v_agora
  where id = p_pedido_id;
end;
$$;

revoke all on function public.iniciar_producao_pedido(text, date) from public, anon;
grant execute on function public.iniciar_producao_pedido(text, date) to authenticated;
