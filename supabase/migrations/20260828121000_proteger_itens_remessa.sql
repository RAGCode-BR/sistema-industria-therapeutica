-- Garante que um item de remessa pertence ao mesmo pedido e não é recusado.
create or replace function public.validar_item_remessa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_remessa text;
  v_situacao_item text;
begin
  select pedido_id into v_pedido_remessa from public.remessas where id = new.remessa_id;
  select situacao into v_situacao_item from public.pedido_itens
  where pedido_id = new.pedido_id and produto_id = new.produto_id;
  if v_pedido_remessa is null or v_pedido_remessa <> new.pedido_id then
    raise exception 'O item deve pertencer ao pedido da remessa.';
  end if;
  if v_situacao_item is null then
    raise exception 'O produto não pertence ao pedido.';
  end if;
  if v_situacao_item = 'recusado' then
    raise exception 'Não é permitido expedir item recusado.';
  end if;
  return new;
end;
$$;

drop trigger if exists remessa_itens_validar_pedido on public.remessa_itens;
create trigger remessa_itens_validar_pedido
before insert or update on public.remessa_itens
for each row execute procedure public.validar_item_remessa();

alter publication supabase_realtime add table public.remessas, public.remessa_itens;
