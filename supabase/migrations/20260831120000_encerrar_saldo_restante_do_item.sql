-- Permite encerrar somente a parte ainda não enviada de um item atendido parcialmente.
alter table public.pedido_itens
  add column if not exists quantidade_encerrada integer not null default 0,
  add column if not exists motivo_encerramento text,
  add column if not exists encerrado_em timestamptz;

alter table public.pedido_itens drop constraint if exists pedido_itens_quantidade_encerrada_check;
alter table public.pedido_itens add constraint pedido_itens_quantidade_encerrada_check
  check (quantidade_encerrada >= 0 and quantidade_encerrada <= quantidade_solicitada);

create or replace function public.recalcular_situacao_pedido_por_remessas(p_pedido_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.pedido_itens i
  set situacao = case
        when resumo.recebida >= greatest(i.quantidade_solicitada - i.quantidade_encerrada, 0) then 'recebido'
        when resumo.em_transito > 0 then 'em_transito'
        when resumo.enviada > 0 then 'aprovado'
        else i.situacao
      end,
      recebido_em = case when resumo.recebida >= greatest(i.quantidade_solicitada - i.quantidade_encerrada, 0) then resumo.ultimo_recebimento else null end
  from lateral (
    select coalesce(sum(ri.quantidade) filter (where r.situacao <> 'cancelada'), 0) as enviada,
      coalesce(sum(ri.quantidade) filter (where r.situacao = 'em_transito'), 0) as em_transito,
      coalesce(sum(ri.quantidade) filter (where r.situacao = 'recebida'), 0) as recebida,
      max(r.recebida_em) filter (where r.situacao = 'recebida') as ultimo_recebimento
    from public.remessa_itens ri join public.remessas r on r.id = ri.remessa_id
    where ri.pedido_id = i.pedido_id and ri.produto_id = i.produto_id
  ) resumo
  where i.pedido_id = p_pedido_id;

  update public.pedidos p set situacao = case
      when not exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao <> 'recusado') then 'recusado'
      when not exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao not in ('recebido', 'recusado')) then 'recebido'
      when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'em_transito') then 'em_transito'
      when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'em_producao') then 'em_producao'
      when exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao = 'aprovado') then 'aprovado'
      else 'pendente' end,
    recebido_em = case when not exists (select 1 from public.pedido_itens where pedido_id = p.id and situacao not in ('recebido', 'recusado'))
      then (select max(recebida_em) from public.remessas where pedido_id = p.id and situacao = 'recebida') else null end,
    atualizado_em = now()
  where p.id = p_pedido_id;
end;
$$;

create or replace function public.encerrar_saldo_item_pedido(p_pedido_id text, p_produto_id text, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare v_enviada integer; v_solicitada integer; v_encerrada integer; v_saldo integer; v_agora timestamptz := now();
begin
  if public.meu_papel() <> 'cd_admin' then raise exception 'Você não tem permissão para encerrar o saldo de itens.'; end if;
  if nullif(trim(coalesce(p_motivo, '')), '') is null then raise exception 'Informe o motivo do encerramento.'; end if;
  select quantidade_solicitada, quantidade_encerrada into v_solicitada, v_encerrada
  from public.pedido_itens where pedido_id = p_pedido_id and produto_id = p_produto_id for update;
  if not found then raise exception 'Item não encontrado neste pedido.'; end if;
  select coalesce(sum(ri.quantidade), 0)::integer into v_enviada from public.remessa_itens ri join public.remessas r on r.id = ri.remessa_id
    where ri.pedido_id = p_pedido_id and ri.produto_id = p_produto_id and r.situacao <> 'cancelada';
  v_saldo := greatest(v_solicitada - v_enviada - v_encerrada, 0);
  if v_enviada = 0 or v_saldo = 0 then raise exception 'Somente o saldo pendente de um item enviado parcialmente pode ser encerrado.'; end if;
  update public.pedido_itens set quantidade_encerrada = quantidade_encerrada + v_saldo, motivo_encerramento = trim(p_motivo), encerrado_em = v_agora, producao_prevista = null
    where pedido_id = p_pedido_id and produto_id = p_produto_id;
  delete from public.reservas_producao where pedido_id = p_pedido_id and produto_id = p_produto_id;
  perform public.registrar_evento_pedido(p_pedido_id, null, 'saldo_item_encerrado', jsonb_build_object('produto_id', p_produto_id, 'quantidade', v_saldo, 'motivo', trim(p_motivo)));
  perform public.recalcular_situacao_pedido_por_remessas(p_pedido_id);
end;
$$;

create or replace function public.validar_quantidade_remessa_com_saldo_encerrado()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_solicitada integer; v_encerrada integer; v_enviada integer;
begin
  select quantidade_solicitada, quantidade_encerrada into v_solicitada, v_encerrada from public.pedido_itens
    where pedido_id = new.pedido_id and produto_id = new.produto_id for update;
  select coalesce(sum(ri.quantidade), 0)::integer into v_enviada from public.remessa_itens ri join public.remessas r on r.id = ri.remessa_id
    where ri.pedido_id = new.pedido_id and ri.produto_id = new.produto_id and r.situacao <> 'cancelada';
  if new.quantidade > greatest(v_solicitada - v_encerrada - v_enviada, 0) then
    raise exception 'A quantidade excede o saldo do item disponível para envio.';
  end if;
  return new;
end;
$$;

drop trigger if exists validar_quantidade_remessa_com_saldo_encerrado on public.remessa_itens;
create trigger validar_quantidade_remessa_com_saldo_encerrado before insert on public.remessa_itens
for each row execute function public.validar_quantidade_remessa_com_saldo_encerrado();

revoke all on function public.encerrar_saldo_item_pedido(text, text, text) from public, anon;
grant execute on function public.encerrar_saldo_item_pedido(text, text, text) to authenticated;
