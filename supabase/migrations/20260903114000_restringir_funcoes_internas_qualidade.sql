-- Apenas as operações públicas do fluxo simples podem ser chamadas pelo cliente.
-- Funções auxiliares e o fluxo avançado antigo continuam disponíveis ao banco,
-- mas não podem ser executados manualmente por uma sessão autenticada.
revoke all on function public.criar_chamado_qualidade(jsonb) from public, anon;
revoke all on function public.encaminhar_chamado_qualidade(uuid) from public, anon;
revoke all on function public.resolver_chamado_qualidade(uuid, text) from public, anon;

grant execute on function public.criar_chamado_qualidade(jsonb) to authenticated;
grant execute on function public.encaminhar_chamado_qualidade(uuid) to authenticated;
grant execute on function public.resolver_chamado_qualidade(uuid, text) to authenticated;

revoke all on function public.criar_ocorrencia_qualidade(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.atualizar_ocorrencia_qualidade(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.adicionar_acao_qualidade(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.atualizar_acao_qualidade(uuid, text) from public, anon, authenticated;
revoke all on function public.registrar_historico_qualidade(uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.validar_item_ocorrencia_qualidade() from public, anon, authenticated;
revoke all on function public.validar_local_ocorrencia_qualidade() from public, anon, authenticated;
revoke all on function public.validar_vinculos_ocorrencia_qualidade() from public, anon, authenticated;

-- Esta função precisa ser executável pelo perfil autenticado porque é usada
-- diretamente pelas políticas RLS das tabelas e do Storage.
revoke all on function public.qualidade_pode_acessar_ocorrencia(uuid) from public, anon;
grant execute on function public.qualidade_pode_acessar_ocorrencia(uuid) to authenticated;
