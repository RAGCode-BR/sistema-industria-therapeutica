-- O prazo do pedido é uma promessa única; os prazos de cada remessa são operacionais.
create or replace function public.definir_prazo_pedido_da_primeira_remessa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.pedidos
    set envio_previsto = coalesce(envio_previsto, new.envio_previsto),
        entrega_prevista = coalesce(entrega_prevista, new.entrega_prevista),
        atualizado_em = now()
    where id = new.pedido_id;
  end if;
  return new;
end;
$$;

drop trigger if exists remessas_definir_prazo_pedido on public.remessas;
create trigger remessas_definir_prazo_pedido
after insert on public.remessas
for each row execute procedure public.definir_prazo_pedido_da_primeira_remessa();

revoke all on function public.definir_prazo_pedido_da_primeira_remessa() from public;
