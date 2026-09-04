alter table public.qualidade_evidencias add column if not exists solicitacao_id uuid references public.qualidade_solicitacoes_info(id) on delete restrict;
alter table public.qualidade_evidencias drop constraint if exists qualidade_evidencias_contexto_check;
alter table public.qualidade_evidencias add constraint qualidade_evidencias_contexto_check check (contexto in ('initial', 'treatment', 'final', 'request', 'response'));
create index if not exists qualidade_evidencias_solicitacao_idx on public.qualidade_evidencias (solicitacao_id) where solicitacao_id is not null;

create or replace function public.registrar_evidencia_qualidade(p_ocorrencia_id uuid, p_evidencia jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_mime_type text := p_evidencia->>'mime_type'; v_tamanho integer := (p_evidencia->>'tamanho_bytes')::integer; v_contexto text := coalesce(nullif(p_evidencia->>'contexto', ''), 'initial'); v_solicitacao uuid := nullif(p_evidencia->>'solicitacao_id', '')::uuid;
begin
  if not public.qualidade_pode_acessar_ocorrencia(p_ocorrencia_id) then raise exception 'Voce nao tem permissao para adicionar evidencias a esta ocorrencia.'; end if;
  if v_mime_type not in ('image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime') then raise exception 'Tipo de arquivo nao permitido.'; end if;
  if v_tamanho is null or v_tamanho <= 0 or v_tamanho > 52428800 then raise exception 'O anexo deve ter no maximo 50 MB.'; end if;
  if v_contexto in ('request','response') and (v_solicitacao is null or not exists (select 1 from public.qualidade_solicitacoes_info where id=v_solicitacao and ocorrencia_id=p_ocorrencia_id)) then raise exception 'Solicitacao invalida para este anexo.'; end if;
  insert into public.qualidade_evidencias (ocorrencia_id, solicitacao_id, caminho_storage, nome_arquivo, mime_type, tamanho_bytes, contexto, legenda, enviado_por)
  values (p_ocorrencia_id, v_solicitacao, p_evidencia->>'caminho_storage', p_evidencia->>'nome_arquivo', v_mime_type, v_tamanho, v_contexto, coalesce(p_evidencia->>'legenda',''), auth.uid()) returning id into v_id;
  perform public.registrar_historico_qualidade(p_ocorrencia_id, 'evidence_added', 'Evidencia adicionada.'); return v_id;
end $$;
revoke all on function public.registrar_evidencia_qualidade(uuid,jsonb) from public,anon;
grant execute on function public.registrar_evidencia_qualidade(uuid,jsonb) to authenticated;