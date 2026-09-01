-- Cancela somente a remessa por padrão. O pedido inteiro só pode ser
-- cancelado quando há um único item e nenhuma outra remessa ativa.
drop function if exists public.cancelar_remessa(uuid, text);

create function public.cancelar_remessa(
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
  if public.meu_papel() <> 'cd_admin' then
    raise exception 'Você não tem permissão para cancelar remessas.';
  end if;

  select pedido_id, situacao into v_pedido_id, v_situacao
  from public.remessas
  where id = p_remessa_id
  for update;
  if not found then raise exception 'Remessa não encontrada.'; end if;
  if v_situacao = 'cancelada' then return; end if;
  if v_situacao = 'recebida' then
    raise exception 'Uma remessa recebida não pode ser cancelada; registre um retorno separado.';
  end if;

  if p_cancelar_pedido then
    select count(*) into v_total_itens from public.pedido_itens where pedido_id = v_pedido_id;
    select count(*) into v_remessas_ativas from public.remessas where pedido_id = v_pedido_id and situacao <> 'cancelada';
    if v_total_itens <> 1 or v_remessas_ativas <> 1 then
      raise exception 'O pedido só pode ser cancelado junto com a remessa quando possuir um único item e uma única remessa ativa.';
    end if;
  end if;

  for v_item in select produto_id, quantidade from public.remessa_itens where remessa_id = p_remessa_id loop
    update public.produtos
    set quantidade = quantidade + v_item.quantidade, atualizado_em = v_agora
    where id = v_item.produto_id;

    if not p_cancelar_pedido then
      insert into public.reservas_producao (pedido_id, produto_id, quantidade, criada_em, atualizado_em)
      values (v_pedido_id, v_item.produto_id, v_item.quantidade, v_agora, v_agora)
      on conflict (pedido_id, produto_id) do update
        set quantidade = public.reservas_producao.quantidade + excluded.quantidade,
            atualizado_em = excluded.atualizado_em;
    end if;

    insert into public.movimentacoes (id, produto_id, tipo, quantidade, observacao, pedido_id, remessa_id, criado_em)
    values (gen_random_uuid()::text, v_item.produto_id, 'entrada', v_item.quantidade,
      coalesce(nullif(trim(p_motivo), ''), 'Estorno de remessa cancelada.'), v_pedido_id, p_remessa_id, v_agora);
  end loop;

  update public.remessas set situacao = 'cancelada', atualizado_em = v_agora where id = p_remessa_id;

  if p_cancelar_pedido then
    delete from public.reservas_producao where pedido_id = v_pedido_id;
    update public.pedido_itens
    set situacao = 'recusado', quantidade_enviada = null, producao_prevista = null,
        observacao_matriz = 'Pedido cancelado pelo CD após cancelamento da remessa.'
    where pedido_id = v_pedido_id;
    update public.pedidos
    set situacao = 'recusado', analisado_em = v_agora, atualizado_em = v_agora,
        observacao_matriz = 'Pedido cancelado pelo CD após cancelamento da remessa.'
    where id = v_pedido_id;
    return;
  end if;

  update public.pedido_itens i
  set situacao = case
        when exists (
          select 1 from public.remessa_itens ri join public.remessas r on r.id = ri.remessa_id
          where ri.pedido_id = i.pedido_id and ri.produto_id = i.produto_id and r.situacao = 'em_transito'
        ) then 'em_transito'
        when exists (
          select 1 from public.reservas_producao rp
          where rp.pedido_id = i.pedido_id and rp.produto_id = i.produto_id and rp.quantidade > 0
        ) then 'em_producao'
        else 'aprovado'
      end,
      recebido_em = null
  where i.pedido_id = v_pedido_id
    and i.produto_id in (select produto_id from public.remessa_itens where remessa_id = p_remessa_id)
    and i.situacao <> 'recusado';

  perform public.recalcular_situacao_pedido_por_remessas(v_pedido_id);
end;
$$;

revoke all on function public.cancelar_remessa(uuid, text, boolean) from public, anon;
grant execute on function public.cancelar_remessa(uuid, text, boolean) to authenticated;
