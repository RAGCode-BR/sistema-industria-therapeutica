-- O recebimento é uma confirmação operacional da filial destinatária.
-- O CD apenas expede e acompanha a remessa em trânsito.
create or replace function public.confirmar_recebimento_remessa(p_remessa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_id text;
  v_filial_id text;
  v_situacao text;
  v_agora timestamptz := now();
  v_item record;
begin
  select r.pedido_id, p.filial_id, r.situacao
    into v_pedido_id, v_filial_id, v_situacao
  from public.remessas r
  join public.pedidos p on p.id = r.pedido_id
  where r.id = p_remessa_id
  for update of r;

  if not found then
    raise exception 'Remessa não encontrada.';
  end if;

  if public.meu_papel() <> 'filial' or v_filial_id <> public.minha_filial_id() then
    raise exception 'Somente a filial destinatária pode confirmar esta remessa.';
  end if;

  if v_situacao = 'recebida' then return; end if;
  if v_situacao <> 'em_transito' then
    raise exception 'Esta remessa não pode ser confirmada.';
  end if;

  for v_item in select produto_id, quantidade from public.remessa_itens where remessa_id = p_remessa_id loop
    insert into public.estoque_filiais (filial_id, produto_id, quantidade, atualizado_em)
    values (v_filial_id, v_item.produto_id, v_item.quantidade, v_agora)
    on conflict (filial_id, produto_id) do update
      set quantidade = public.estoque_filiais.quantidade + excluded.quantidade,
          atualizado_em = excluded.atualizado_em;
  end loop;

  update public.remessas
  set situacao = 'recebida', recebida_em = v_agora, recebida_por = auth.uid(), atualizado_em = v_agora
  where id = p_remessa_id;

  update public.remessa_itens set recebido_em = v_agora where remessa_id = p_remessa_id;
  perform public.recalcular_situacao_pedido_por_remessas(v_pedido_id);
end;
$$;

revoke all on function public.confirmar_recebimento_remessa(uuid) from public, anon;
grant execute on function public.confirmar_recebimento_remessa(uuid) to authenticated;
