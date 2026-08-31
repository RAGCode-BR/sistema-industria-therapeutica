-- A quantidade aprovada é a quantidade que o CD consegue atender no momento.
-- A validação no banco impede contornar o limite pela interface ou pela API.
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
  v_estoque_cd integer;
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
    select quantidade into v_estoque_cd
    from public.produtos
    where id = p_produto_id
    for update;
    if not found then
      raise exception 'Produto não encontrado no estoque do CD.';
    end if;

    if p_quantidade is null
       or p_quantidade < 1
       or p_quantidade > v_solicitada
       or p_quantidade > coalesce(v_estoque_cd, 0) then
      raise exception 'A quantidade aprovada deve ser no máximo a quantidade solicitada e o estoque disponível no CD (%).', coalesce(v_estoque_cd, 0);
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

revoke all on function public.analisar_item_pedido(text, text, text, integer, text) from public, anon;
grant execute on function public.analisar_item_pedido(text, text, text, integer, text) to authenticated;
