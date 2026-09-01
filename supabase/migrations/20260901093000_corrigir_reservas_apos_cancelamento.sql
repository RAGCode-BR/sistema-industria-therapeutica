-- Uma remessa pode usar estoque já disponível, mesmo que a reserva de produção
-- do pedido seja menor. A reserva nunca pode ficar negativa nesse processo.
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
  v_situacao_item text;
  v_ja_enviada integer;
  v_estoque integer;
  v_reservado_antes integer;
  v_disponivel integer;
  v_linhas_atualizadas integer;
  v_agora timestamptz := now();
  v_producao_atual timestamptz;
begin
  if public.meu_papel() <> 'cd_admin' then raise exception 'Você não tem permissão para expedir remessas.'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'Informe ao menos um item para a remessa.'; end if;
  if exists (select 1 from jsonb_to_recordset(p_itens) as x(produto_id text, quantidade integer) group by produto_id having count(*) > 1) then raise exception 'Um produto não pode ser repetido na mesma remessa.'; end if;

  select producao_iniciada_em into v_producao_atual from public.pedidos where id = p_pedido_id for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  if exists (select 1 from public.pedido_itens where pedido_id = p_pedido_id and situacao = 'pendente') then raise exception 'Analise todos os itens antes de expedir uma remessa.'; end if;

  perform 1 from public.produtos p
  join jsonb_to_recordset(p_itens) as x(produto_id text, quantidade integer) on x.produto_id = p.id
  order by p.id for update;

  insert into public.remessas (pedido_id, envio_previsto, entrega_prevista, criada_por, enviada_em)
  values (p_pedido_id, p_envio_previsto, p_entrega_prevista, auth.uid(), v_agora)
  returning id into v_remessa_id;

  for v_item in select produto_id, quantidade from jsonb_to_recordset(p_itens) as x(produto_id text, quantidade integer) loop
    if v_item.produto_id is null or v_item.quantidade is null or v_item.quantidade <= 0 then raise exception 'Os itens da remessa devem ter produto e quantidade positiva.'; end if;
    select quantidade_solicitada, situacao into v_solicitada, v_situacao_item from public.pedido_itens
      where pedido_id = p_pedido_id and produto_id = v_item.produto_id for update;
    if not found then raise exception 'O produto % não pertence ao pedido.', v_item.produto_id; end if;
    if v_situacao_item not in ('aprovado', 'em_producao') then raise exception 'O item % não está aprovado para expedição.', v_item.produto_id; end if;
    select coalesce(sum(ri.quantidade), 0)::integer into v_ja_enviada
      from public.remessa_itens ri join public.remessas r on r.id = ri.remessa_id
      where ri.pedido_id = p_pedido_id and ri.produto_id = v_item.produto_id and r.situacao <> 'cancelada';
    if v_item.quantidade > greatest(v_solicitada - v_ja_enviada, 0) then raise exception 'Quantidade para % excede o saldo pendente do pedido.', v_item.produto_id; end if;

    select quantidade into v_estoque from public.produtos where id = v_item.produto_id;
    select coalesce(sum(r.quantidade), 0)::integer into v_reservado_antes
      from public.reservas_producao r join public.pedidos p on p.id = r.pedido_id
      where r.produto_id = v_item.produto_id and r.pedido_id <> p_pedido_id
        and (coalesce(p.producao_iniciada_em, 'infinity'::timestamptz), p.id) < (coalesce(v_producao_atual, 'infinity'::timestamptz), p_pedido_id);
    v_disponivel := greatest(v_estoque - v_reservado_antes, 0);
    if v_item.quantidade > v_disponivel then raise exception 'Estoque disponível para este pedido é de %, pois parte do saldo está reservada para pedidos em produção anteriores.', v_disponivel; end if;

    update public.produtos set quantidade = quantidade - v_item.quantidade, atualizado_em = v_agora
      where id = v_item.produto_id and ativo = true and quantidade >= v_item.quantidade;
    get diagnostics v_linhas_atualizadas = row_count;
    if v_linhas_atualizadas <> 1 then raise exception 'Estoque insuficiente para o produto %.', v_item.produto_id; end if;
    insert into public.remessa_itens (remessa_id, pedido_id, produto_id, quantidade) values (v_remessa_id, p_pedido_id, v_item.produto_id, v_item.quantidade);
    update public.reservas_producao
    set quantidade = greatest(quantidade - v_item.quantidade, 0), atualizado_em = v_agora
    where pedido_id = p_pedido_id and produto_id = v_item.produto_id;
    delete from public.reservas_producao where pedido_id = p_pedido_id and produto_id = v_item.produto_id and quantidade <= 0;
    insert into public.movimentacoes (id, produto_id, tipo, quantidade, observacao, filial_id, pedido_id, remessa_id, criado_em)
      select gen_random_uuid()::text, v_item.produto_id, 'transferencia', v_item.quantidade, 'Remessa ' || v_remessa_id::text, p.filial_id, p.id, v_remessa_id, v_agora from public.pedidos p where p.id = p_pedido_id;
  end loop;
  perform public.recalcular_situacao_pedido_por_remessas(p_pedido_id);
  return v_remessa_id;
end;
$$;

-- Ao cancelar, a quantidade retorna ao estoque físico. Ela não deve ser
-- registrada novamente como reserva de produção.
create or replace function public.cancelar_remessa(
  p_remessa_id uuid,
  p_motivo text default null,
  p_cancelar_pedido boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_id text;
  v_situacao text;
  v_item record;
  v_total_itens integer;
  v_remessas_ativas integer;
  v_agora timestamptz := now();
begin
  if public.meu_papel() <> 'cd_admin' then raise exception 'Você não tem permissão para cancelar remessas.'; end if;
  select pedido_id, situacao into v_pedido_id, v_situacao from public.remessas where id = p_remessa_id for update;
  if not found then raise exception 'Remessa não encontrada.'; end if;
  if v_situacao = 'cancelada' then return; end if;
  if v_situacao = 'recebida' then raise exception 'Uma remessa recebida não pode ser cancelada; registre um retorno separado.'; end if;

  if p_cancelar_pedido then
    select count(*) into v_total_itens from public.pedido_itens where pedido_id = v_pedido_id;
    select count(*) into v_remessas_ativas from public.remessas where pedido_id = v_pedido_id and situacao <> 'cancelada';
    if v_total_itens <> 1 or v_remessas_ativas <> 1 then raise exception 'O pedido só pode ser cancelado junto com a remessa quando possuir um único item e uma única remessa ativa.'; end if;
  end if;

  for v_item in select produto_id, quantidade from public.remessa_itens where remessa_id = p_remessa_id loop
    update public.produtos set quantidade = quantidade + v_item.quantidade, atualizado_em = v_agora where id = v_item.produto_id;
    insert into public.movimentacoes (id, produto_id, tipo, quantidade, observacao, pedido_id, remessa_id, criado_em)
    values (gen_random_uuid()::text, v_item.produto_id, 'entrada', v_item.quantidade,
      coalesce(nullif(trim(p_motivo), ''), 'Estorno de remessa cancelada.'), v_pedido_id, p_remessa_id, v_agora);
  end loop;

  update public.remessas set situacao = 'cancelada', atualizado_em = v_agora where id = p_remessa_id;
  if p_cancelar_pedido then
    delete from public.reservas_producao where pedido_id = v_pedido_id;
    update public.pedido_itens set situacao = 'recusado', quantidade_enviada = null, producao_prevista = null,
      observacao_matriz = 'Pedido cancelado pelo CD após cancelamento da remessa.' where pedido_id = v_pedido_id;
    update public.pedidos set situacao = 'recusado', analisado_em = v_agora, atualizado_em = v_agora,
      observacao_matriz = 'Pedido cancelado pelo CD após cancelamento da remessa.' where id = v_pedido_id;
    return;
  end if;

  update public.pedido_itens i
  set situacao = case
        when exists (select 1 from public.remessa_itens ri join public.remessas r on r.id = ri.remessa_id where ri.pedido_id = i.pedido_id and ri.produto_id = i.produto_id and r.situacao = 'em_transito') then 'em_transito'
        when exists (select 1 from public.reservas_producao rp where rp.pedido_id = i.pedido_id and rp.produto_id = i.produto_id and rp.quantidade > 0) then 'em_producao'
        else 'aprovado'
      end,
      recebido_em = null
  where i.pedido_id = v_pedido_id and i.produto_id in (select produto_id from public.remessa_itens where remessa_id = p_remessa_id) and i.situacao <> 'recusado';
  perform public.recalcular_situacao_pedido_por_remessas(v_pedido_id);
end;
$$;

revoke all on function public.criar_remessa(text, jsonb, date, date) from public, anon;
grant execute on function public.criar_remessa(text, jsonb, date, date) to authenticated;
revoke all on function public.cancelar_remessa(uuid, text, boolean) from public, anon;
grant execute on function public.cancelar_remessa(uuid, text, boolean) to authenticated;
