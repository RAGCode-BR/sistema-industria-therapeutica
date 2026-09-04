-- Perguntas do CD e respostas da filial dentro do chamado de qualidade.
alter table public.qualidade_ocorrencias drop constraint if exists qualidade_ocorrencias_situacao_check;
alter table public.qualidade_ocorrencias add constraint qualidade_ocorrencias_situacao_check
  check (situacao in ('open', 'analysis', 'treatment', 'waiting_confirmation', 'waiting_branch', 'resolved', 'cancelled'));

alter table public.qualidade_evidencias drop constraint if exists qualidade_evidencias_contexto_check;
alter table public.qualidade_evidencias add constraint qualidade_evidencias_contexto_check
  check (contexto in ('initial', 'treatment', 'final', 'response'));

create table public.qualidade_solicitacoes_info (
  id uuid primary key default gen_random_uuid(),
  ocorrencia_id uuid not null references public.qualidade_ocorrencias(id) on delete restrict,
  pergunta text not null check (btrim(pergunta) <> ''),
  solicitada_por uuid not null references public.usuarios(id) on delete restrict,
  solicitada_em timestamptz not null default now(),
  resposta text,
  respondida_por uuid references public.usuarios(id) on delete restrict,
  respondida_em timestamptz,
  check ((respondida_em is null) = (respondida_por is null))
);
create unique index qualidade_solicitacao_info_aberta_idx
  on public.qualidade_solicitacoes_info (ocorrencia_id) where respondida_em is null;
create index qualidade_solicitacao_info_ocorrencia_idx
  on public.qualidade_solicitacoes_info (ocorrencia_id, solicitada_em desc);
alter table public.qualidade_solicitacoes_info enable row level security;
grant select on public.qualidade_solicitacoes_info to authenticated;
create policy "qualidade le solicitacoes informacao permitidas" on public.qualidade_solicitacoes_info
  for select to authenticated using (public.qualidade_pode_acessar_ocorrencia(ocorrencia_id));

create or replace function public.solicitar_informacoes_chamado_qualidade(p_ocorrencia_id uuid, p_pergunta text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ocorrencia public.qualidade_ocorrencias%rowtype;
begin
  if public.meu_papel() <> 'cd_admin' then raise exception 'Somente a equipe do CD pode solicitar informacoes.'; end if;
  if coalesce(btrim(p_pergunta), '') = '' then raise exception 'Descreva a informacao que precisa da filial.'; end if;
  select * into v_ocorrencia from public.qualidade_ocorrencias where id = p_ocorrencia_id for update;
  if v_ocorrencia.id is null or not (v_ocorrencia.origem = 'production' or v_ocorrencia.encaminhamento = 'cd' or v_ocorrencia.criado_por = auth.uid()) then raise exception 'Chamado nao encontrado.'; end if;
  if v_ocorrencia.situacao = 'resolved' then raise exception 'Este chamado ja foi resolvido.'; end if;
  if exists (select 1 from public.qualidade_solicitacoes_info where ocorrencia_id = p_ocorrencia_id and respondida_em is null) then raise exception 'Ja existe uma solicitacao aguardando resposta da filial.'; end if;
  insert into public.qualidade_solicitacoes_info (ocorrencia_id, pergunta, solicitada_por)
    values (p_ocorrencia_id, btrim(p_pergunta), auth.uid()) returning id into v_id;
  update public.qualidade_ocorrencias set situacao = 'waiting_branch', atualizado_em = now() where id = p_ocorrencia_id;
  perform public.registrar_historico_qualidade(p_ocorrencia_id, 'information_requested', 'CD solicitou informacoes a filial.', jsonb_build_object('pergunta', btrim(p_pergunta)));
  return v_id;
end
$$;

create or replace function public.responder_solicitacao_qualidade(p_solicitacao_id uuid, p_resposta text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_solicitacao public.qualidade_solicitacoes_info%rowtype; v_ocorrencia public.qualidade_ocorrencias%rowtype;
begin
  if public.meu_papel() <> 'filial' then raise exception 'Somente a filial pode responder esta solicitacao.'; end if;
  if coalesce(btrim(p_resposta), '') = '' then raise exception 'Informe a resposta para o CD.'; end if;
  select * into v_solicitacao from public.qualidade_solicitacoes_info where id = p_solicitacao_id for update;
  if v_solicitacao.id is null or v_solicitacao.respondida_em is not null then raise exception 'Solicitacao nao encontrada ou ja respondida.'; end if;
  select * into v_ocorrencia from public.qualidade_ocorrencias where id = v_solicitacao.ocorrencia_id for update;
  if v_ocorrencia.filial_id <> public.minha_filial_id() then raise exception 'Esta solicitacao nao pertence a sua filial.'; end if;
  update public.qualidade_solicitacoes_info set resposta = btrim(p_resposta), respondida_por = auth.uid(), respondida_em = now() where id = v_solicitacao.id;
  update public.qualidade_ocorrencias set situacao = 'analysis', atualizado_em = now() where id = v_ocorrencia.id;
  perform public.registrar_historico_qualidade(v_ocorrencia.id, 'information_answered', 'Filial respondeu a solicitacao de informacoes.', jsonb_build_object('resposta', btrim(p_resposta)));
  return v_ocorrencia.id;
end
$$;

revoke all on function public.solicitar_informacoes_chamado_qualidade(uuid, text), public.responder_solicitacao_qualidade(uuid, text) from public, anon;
grant execute on function public.solicitar_informacoes_chamado_qualidade(uuid, text), public.responder_solicitacao_qualidade(uuid, text) to authenticated;