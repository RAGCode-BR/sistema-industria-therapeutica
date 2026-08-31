-- Permite ao CD analisar um item sem saldo imediato e encaminhá-lo para produção.
-- A data é definida em seguida pela função iniciar_producao_item_pedido.
create or replace function public.aprovar_item_para_producao(
  p_pedido_id text,
  p_produto_id text
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
    raise exception 'Você não tem permissão para analisar itens.';
  end if;

  perform 1
  from public.pedido_itens
  where pedido_id = p_pedido_id
    and produto_id = p_produto_id
    and situacao = 'pendente'
  for update;
  if not found then
    raise exception 'Este item já foi analisado ou não pertence ao pedido.';
  end if;

  update public.pedido_itens
  set situacao = 'aprovado',
      quantidade_enviada = 0,
      observacao_matriz = 'Item aprovado para produção.'
  where pedido_id = p_pedido_id
    and produto_id = p_produto_id;

  update public.pedidos p
  set situacao = case
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'pendente') then 'pendente'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'em_producao') then 'em_producao'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'em_transito') then 'em_transito'
        when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'aprovado') then 'aprovado'
        when not exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao <> 'recusado') then 'recusado'
        else p.situacao
      end,
      analisado_em = v_agora,
      atualizado_em = v_agora
  where p.id = p_pedido_id;
end;
$$;

revoke all on function public.aprovar_item_para_producao(text, text) from public, anon;
grant execute on function public.aprovar_item_para_producao(text, text) to authenticated;
