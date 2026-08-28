-- O recebimento é um estado do item; o pedido só é finalizado quando todos os
-- itens não recusados foram recebidos pela filial.
alter table public.pedidos drop constraint if exists pedidos_situacao_check;
alter table public.pedidos add constraint pedidos_situacao_check
  check (situacao in ('pendente', 'aprovado', 'em_producao', 'agendado_envio', 'em_transito', 'recebido', 'finalizado', 'recusado'));

create or replace function public.finalizar_pedido_quando_recebido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.situacao = 'recebido'
     and not exists (
       select 1 from public.pedido_itens
       where pedido_id = new.id and situacao not in ('recebido', 'recusado')
     ) then
    new.situacao := 'finalizado';
  end if;
  return new;
end;
$$;

drop trigger if exists finalizar_pedido_quando_recebido on public.pedidos;
create trigger finalizar_pedido_quando_recebido
before insert or update of situacao on public.pedidos
for each row execute function public.finalizar_pedido_quando_recebido();

update public.pedidos p
set situacao = 'finalizado', atualizado_em = now()
where p.situacao = 'recebido'
  and not exists (
    select 1 from public.pedido_itens i
    where i.pedido_id = p.id and i.situacao not in ('recebido', 'recusado')
  );
