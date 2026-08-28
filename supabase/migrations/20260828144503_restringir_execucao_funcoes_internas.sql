-- Funções acionadas exclusivamente por gatilhos não devem ser endpoints RPC.
revoke all on function public.auditar_remessa() from public, anon, authenticated;
revoke all on function public.auditar_situacao_pedido() from public, anon, authenticated;
revoke all on function public.definir_prazo_pedido_da_primeira_remessa() from public, anon, authenticated;
revoke all on function public.recalcular_situacao_pedido_por_remessas(text) from public, anon, authenticated;
revoke all on function public.registrar_evento_pedido(text, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.validar_item_remessa() from public, anon, authenticated;

-- RPCs operacionais permanecem somente para sessões autenticadas. As próprias
-- funções validam o papel do usuário e a filial antes de alterar dados.
revoke all on function public.criar_remessa(text, jsonb, date, date) from public, anon;
revoke all on function public.confirmar_recebimento_remessa(uuid) from public, anon;
revoke all on function public.cancelar_remessa(uuid, text) from public, anon;

-- Estes RPCs pertenciam ao fluxo anterior, que confirmava itens/pedidos sem
-- identificar uma remessa. O front-end passou a usar apenas a confirmação de
-- remessa; manter as funções acessíveis poderia duplicar estoque.
revoke all on function public.confirmar_recebimento_pedido(text) from public, anon, authenticated;
revoke all on function public.confirmar_recebimento_item_pedido(text, text) from public, anon, authenticated;
