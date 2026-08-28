-- Histórico imutável para reconstruir a linha do tempo operacional.
create table public.pedido_eventos (
  id bigint generated always as identity primary key,
  pedido_id text not null references public.pedidos(id) on delete restrict,
  remessa_id uuid references public.remessas(id) on delete restrict,
  tipo text not null,
  dados jsonb not null default '{}'::jsonb,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

create index pedido_eventos_pedido_criado_idx on public.pedido_eventos(pedido_id, criado_em desc);
create index pedido_eventos_remessa_idx on public.pedido_eventos(remessa_id) where remessa_id is not null;

alter table public.pedido_eventos enable row level security;
create policy "cd le eventos de pedidos" on public.pedido_eventos for select to authenticated
  using (public.meu_papel() = 'cd_admin');
create policy "filial le eventos dos seus pedidos" on public.pedido_eventos for select to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id and p.filial_id = public.minha_filial_id()));

create or replace function public.registrar_evento_pedido(
  p_pedido_id text,
  p_remessa_id uuid,
  p_tipo text,
  p_dados jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pedido_eventos (pedido_id, remessa_id, tipo, dados, criado_por)
  values (p_pedido_id, p_remessa_id, p_tipo, coalesce(p_dados, '{}'::jsonb), auth.uid());
end;
$$;

create or replace function public.auditar_remessa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.registrar_evento_pedido(new.pedido_id, new.id, 'remessa_expedida',
      jsonb_build_object('situacao', new.situacao, 'envio_previsto', new.envio_previsto, 'entrega_prevista', new.entrega_prevista));
  elsif old.situacao is distinct from new.situacao then
    perform public.registrar_evento_pedido(new.pedido_id, new.id,
      case new.situacao when 'recebida' then 'remessa_recebida' when 'cancelada' then 'remessa_cancelada' else 'remessa_atualizada' end,
      jsonb_build_object('situacao_anterior', old.situacao, 'situacao_atual', new.situacao));
  end if;
  return new;
end;
$$;

drop trigger if exists remessas_auditar on public.remessas;
create trigger remessas_auditar after insert or update on public.remessas
for each row execute procedure public.auditar_remessa();

create or replace function public.auditar_situacao_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.registrar_evento_pedido(new.id, null, 'pedido_criado', jsonb_build_object('situacao', new.situacao));
  elsif old.situacao is distinct from new.situacao then
    perform public.registrar_evento_pedido(new.id, null, 'pedido_status_alterado',
      jsonb_build_object('situacao_anterior', old.situacao, 'situacao_atual', new.situacao));
  end if;
  return new;
end;
$$;

drop trigger if exists pedidos_auditar_situacao on public.pedidos;
create trigger pedidos_auditar_situacao after insert or update on public.pedidos
for each row execute procedure public.auditar_situacao_pedido();

-- Uma remessa só pode ser cancelada antes da confirmação. O estorno é atômico.
drop index if exists public.movimentacoes_remessa_produto_unico_idx;
create unique index movimentacoes_transferencia_remessa_produto_unico_idx
  on public.movimentacoes(remessa_id, produto_id)
  where remessa_id is not null and tipo = 'transferencia';

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
  if v_situacao = 'recebida' then raise exception 'Uma remessa recebida não pode ser cancelada; registre um retorno separado.'; end if;

  for v_item in select produto_id, quantidade from public.remessa_itens where remessa_id = p_remessa_id loop
    update public.produtos set quantidade = quantidade + v_item.quantidade, atualizado_em = v_agora
    where id = v_item.produto_id;
    insert into public.movimentacoes (id, produto_id, tipo, quantidade, observacao, pedido_id, remessa_id, criado_em)
    values (gen_random_uuid()::text, v_item.produto_id, 'entrada', v_item.quantidade,
      coalesce(nullif(trim(p_motivo), ''), 'Estorno de remessa cancelada.'), v_pedido_id, p_remessa_id, v_agora);
  end loop;
  update public.remessas set situacao = 'cancelada', atualizado_em = v_agora where id = p_remessa_id;
  perform public.recalcular_situacao_pedido_por_remessas(v_pedido_id);
end;
$$;

revoke all on function public.registrar_evento_pedido(text, uuid, text, jsonb) from public;
revoke all on function public.auditar_remessa() from public;
revoke all on function public.auditar_situacao_pedido() from public;
revoke all on function public.cancelar_remessa(uuid, text) from public;
grant execute on function public.cancelar_remessa(uuid, text) to authenticated;
grant select on public.pedido_eventos to authenticated;

alter publication supabase_realtime add table public.pedido_eventos;
