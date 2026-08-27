-- Adiciona a etapa de produção entre a aprovação e o envio do pedido.
alter table public.pedidos
  add column if not exists producao_prevista date,
  add column if not exists producao_iniciada_em timestamptz,
  add column if not exists enviado_em timestamptz;

alter table public.pedidos drop constraint if exists pedidos_situacao_check;
alter table public.pedidos add constraint pedidos_situacao_check
  check (situacao in ('pendente', 'aprovado', 'em_producao', 'aguardando_compra', 'em_transito', 'recebido', 'recusado'));

alter table public.pedido_itens drop constraint if exists pedido_itens_situacao_check;
alter table public.pedido_itens add constraint pedido_itens_situacao_check
  check (situacao in ('pendente', 'aprovado', 'em_producao', 'aguardando_compra', 'em_transito', 'recebido', 'recusado'));

create index if not exists pedidos_producao_prevista_idx on public.pedidos (producao_prevista) where producao_prevista is not null;
