-- Ao cancelar uma remessa em trânsito, o saldo retorna ao CD e continua
-- reservado para o mesmo pedido. Assim ele não é consumido por outro pedido.
create or replace function public.cancelar_remessa(p_remessa_id uuid, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_id text;
  v_situacao text;
  v_item record;
  v_agora timestamptz := now();
begin
  if public.meu_papel() <> 'cd_admin' then
    raise exception 'Você não tem permissão para cancelar remessas.';
  end if;

  select pedido_id, situacao into v_pedido_id, v_situacao
  from public.remessas where id = p_remessa_id for update;
  if not found then raise exception 'Remessa não encontrada.'; end if;
  if v_situacao = 'cancelada' then return; end if;
  if v_situacao = 'recebida' then
    raise exception 'Uma remessa recebida não pode ser cancelada; registre um retorno separado.';
  end if;

  for v_item in select produto_id, quantidade from public.remessa_itens where remessa_id = p_remessa_id loop
    update public.produtos set quantidade = quantidade + v_item.quantidade, atualizado_em = v_agora
    where id = v_item.produto_id;
    insert into public.reservas_producao (pedido_id, produto_id, quantidade, criada_em, atualizado_em)
    values (v_pedido_id, v_item.produto_id, v_item.quantidade, v_agora, v_agora)
    on conflict (pedido_id, produto_id) do update
      set quantidade = public.reservas_producao.quantidade + excluded.quantidade,
          atualizado_em = excluded.atualizado_em;
    insert into public.movimentacoes (id, produto_id, tipo, quantidade, observacao, pedido_id, remessa_id, criado_em)
    values (gen_random_uuid()::text, v_item.produto_id, 'entrada', v_item.quantidade,
      coalesce(nullif(trim(p_motivo), ''), 'Estorno de remessa cancelada.'), v_pedido_id, p_remessa_id, v_agora);
  end loop;

  update public.remessas set situacao = 'cancelada', atualizado_em = v_agora where id = p_remessa_id;
  perform public.recalcular_situacao_pedido_por_remessas(v_pedido_id);
end;
$$;

revoke all on function public.cancelar_remessa(uuid, text) from public, anon;
grant execute on function public.cancelar_remessa(uuid, text) to authenticated;
