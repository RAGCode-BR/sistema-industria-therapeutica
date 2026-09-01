-- Limpa somente o ciclo operacional de pedidos para iniciar uma nova rodada de testes.
-- Catálogo, estoques, filiais, usuários e movimentações independentes de pedidos são preservados.
begin;

-- Os eventos e movimentos referenciam pedidos/remessas com ON DELETE RESTRICT.
delete from public.pedido_eventos;

delete from public.movimentacoes
where pedido_id is not null
   or remessa_id is not null;

delete from public.reservas_producao;
delete from public.remessa_itens;
delete from public.remessas;
delete from public.pedido_itens;
delete from public.pedidos;

-- A próxima solicitação volta a receber o número 1.
select setval('public.pedidos_numero_pedido_seq', 1, false);

commit;
