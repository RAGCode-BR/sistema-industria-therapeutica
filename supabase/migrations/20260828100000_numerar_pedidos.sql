-- Cria a numeração operacional dos pedidos sem substituir o ID técnico existente.
-- A sequência é atribuída pelo banco no momento da criação do pedido, eliminando
-- duplicidade mesmo com várias filiais enviando pedidos simultaneamente.
alter table public.pedidos
  add column if not exists numero_pedido bigint;

create sequence if not exists public.pedidos_numero_pedido_seq;

with ultimo_numero as (
  select coalesce(max(numero_pedido), 0)::bigint as numero from public.pedidos
), pedidos_sem_numero as (
  select id, (select numero from ultimo_numero) + row_number() over (order by criado_em, id)::bigint as numero
  from public.pedidos
  where numero_pedido is null
)
update public.pedidos pedidos
set numero_pedido = pedidos_sem_numero.numero
from pedidos_sem_numero
where pedidos.id = pedidos_sem_numero.id;

select setval(
  'public.pedidos_numero_pedido_seq',
  coalesce((select max(numero_pedido) from public.pedidos), 1),
  exists(select 1 from public.pedidos)
);

create or replace function public.atribuir_numero_pedido()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- O número é sempre definido no envio definitivo da filial; valores recebidos
  -- do cliente são ignorados para impedir colisões ou manipulação da sequência.
  new.numero_pedido := nextval('public.pedidos_numero_pedido_seq');
  return new;
end;
$$;

drop trigger if exists atribuir_numero_pedido_ao_criar on public.pedidos;
create trigger atribuir_numero_pedido_ao_criar
before insert on public.pedidos
for each row execute function public.atribuir_numero_pedido();

alter table public.pedidos
  alter column numero_pedido set not null;

create unique index if not exists pedidos_numero_pedido_unico_idx
  on public.pedidos (numero_pedido);

grant usage on sequence public.pedidos_numero_pedido_seq to authenticated;
