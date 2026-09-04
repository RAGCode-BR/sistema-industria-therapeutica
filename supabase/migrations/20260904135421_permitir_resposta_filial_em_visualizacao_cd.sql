-- O administrador pode testar o portal de uma filial pela visualizacao do sistema.
create or replace function public.responder_solicitacao_qualidade(p_solicitacao_id uuid, p_resposta text, p_filial_id text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_solicitacao public.qualidade_solicitacoes_info%rowtype; v_ocorrencia public.qualidade_ocorrencias%rowtype; v_papel text := public.meu_papel();
begin
  if coalesce(btrim(p_resposta), '') = '' then raise exception 'Informe a resposta para o CD.'; end if;
  select * into v_solicitacao from public.qualidade_solicitacoes_info where id = p_solicitacao_id for update;
  if v_solicitacao.id is null or v_solicitacao.respondida_em is not null then raise exception 'Solicitacao nao encontrada ou ja respondida.'; end if;
  select * into v_ocorrencia from public.qualidade_ocorrencias where id = v_solicitacao.ocorrencia_id for update;
  if v_papel = 'filial' and v_ocorrencia.filial_id <> public.minha_filial_id() then raise exception 'Esta solicitacao nao pertence a sua filial.'; end if;
  if v_papel = 'cd_admin' and (p_filial_id is null or v_ocorrencia.filial_id <> p_filial_id) then raise exception 'Selecione a filial correta para responder esta solicitacao.'; end if;
  if v_papel not in ('filial', 'cd_admin') then raise exception 'Somente a filial pode responder esta solicitacao.'; end if;
  update public.qualidade_solicitacoes_info set resposta = btrim(p_resposta), respondida_por = auth.uid(), respondida_em = now() where id = v_solicitacao.id;
  update public.qualidade_ocorrencias set situacao = 'analysis', atualizado_em = now() where id = v_ocorrencia.id;
  perform public.registrar_historico_qualidade(v_ocorrencia.id, 'information_answered', 'Filial respondeu a solicitacao de informacoes.', jsonb_build_object('resposta', btrim(p_resposta)));
  return v_ocorrencia.id;
end
$$;
revoke all on function public.responder_solicitacao_qualidade(uuid, text, text) from public, anon;
grant execute on function public.responder_solicitacao_qualidade(uuid, text, text) to authenticated;