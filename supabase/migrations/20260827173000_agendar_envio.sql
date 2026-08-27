-- Separa o agendamento do envio da confirmação de expedição.
alter table public.pedidos add column if not exists envio_previsto date;

alter table public.pedidos drop constraint if exists pedidos_situacao_check;
alter table public.pedidos add constraint pedidos_situacao_check
  check (situacao in ('pendente', 'aprovado', 'em_producao', 'agendado_envio', 'aguardando_compra', 'em_transito', 'recebido', 'recusado'));

alter table public.pedido_itens drop constraint if exists pedido_itens_situacao_check;
alter table public.pedido_itens add constraint pedido_itens_situacao_check
  check (situacao in ('pendente', 'aprovado', 'em_producao', 'agendado_envio', 'aguardando_compra', 'em_transito', 'recebido', 'recusado'));
