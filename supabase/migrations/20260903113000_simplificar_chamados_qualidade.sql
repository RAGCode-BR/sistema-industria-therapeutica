alter table public.qualidade_ocorrencias
  add column if not exists encaminhamento text not null default 'cd'
    check (encaminhamento in ('interno', 'cd')),
  add column if not exists encaminhado_em timestamptz,
  add column if not exists resolucao text not null default '',
  add column if not exists resolvido_por uuid references public.usuarios(id) on delete restrict;

-- Chamados tratados pela própria filial são privados. O CD enxerga apenas
-- chamados de fabricação e aqueles que a filial decidiu encaminhar.
create or replace function public.qualidade_pode_acessar_ocorrencia(p_ocorrencia_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.qualidade_ocorrencias o
    where o.id = p_ocorrencia_id
      and (
        (public.meu_papel() = 'cd_admin' and (o.origem = 'production' or o.encaminhamento = 'cd'))
        or (public.meu_papel() = 'filial' and o.filial_id = public.minha_filial_id())
      )
  )
$$;

drop policy if exists "cd administra ocorrencias qualidade" on public.qualidade_ocorrencias;
create policy "cd le chamados recebidos qualidade" on public.qualidade_ocorrencias
for select to authenticated
using (public.meu_papel() = 'cd_admin' and (origem = 'production' or encaminhamento = 'cd'));

drop policy if exists "cd remove evidencias storage" on storage.objects;
create policy "cd remove evidencias storage" on storage.objects for delete to authenticated
using (
  bucket_id = 'quality-evidence'
  and public.qualidade_pode_acessar_ocorrencia((storage.foldername(name))[1]::uuid)
);

create or replace function public.criar_chamado_qualidade(p_chamado jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_papel text := public.meu_papel();
  v_filial text;
  v_origem text;
  v_encaminhamento text;
  v_situacao text;
  v_tipo uuid;
  v_categoria uuid;
  v_produto text;
  v_quantidade integer;
  v_remessa uuid;
  v_pedido text;
  v_filial_remessa text;
begin
  if v_papel not in ('cd_admin', 'filial') then raise exception 'Você não tem permissão para abrir chamados.'; end if;

  v_tipo := nullif(p_chamado->>'tipo_problema_id', '')::uuid;
  v_produto := nullif(p_chamado->>'produto_id', '');
  v_quantidade := nullif(p_chamado->>'quantidade_afetada', '')::integer;
  v_remessa := nullif(p_chamado->>'remessa_id', '')::uuid;
  select categoria_id into v_categoria from public.qualidade_tipos_problema where id = v_tipo and ativo;

  if v_categoria is null then raise exception 'Selecione um tipo de problema válido.'; end if;
  if v_produto is null or not exists (select 1 from public.produtos where id = v_produto and ativo) then raise exception 'Selecione um produto válido.'; end if;
  if v_quantidade is null or v_quantidade <= 0 then raise exception 'Informe uma quantidade afetada válida.'; end if;
  if coalesce(btrim(p_chamado->>'descricao'), '') = '' then raise exception 'Descreva o problema encontrado.'; end if;

  if v_papel = 'cd_admin' then
    v_filial := null;
    v_origem := 'production';
    v_encaminhamento := 'cd';
    v_situacao := 'open';
    v_remessa := null;
    v_pedido := null;
  else
    v_filial := public.minha_filial_id();
    if v_filial is null then raise exception 'Seu usuário não possui uma filial vinculada.'; end if;
    v_origem := 'branch_receiving';
    v_encaminhamento := coalesce(nullif(p_chamado->>'encaminhamento', ''), 'interno');
    if v_encaminhamento not in ('interno', 'cd') then raise exception 'Escolha como o chamado será tratado.'; end if;
    v_situacao := case when v_encaminhamento = 'cd' then 'analysis' else 'open' end;
    if v_remessa is not null then
      select r.pedido_id, p.filial_id into v_pedido, v_filial_remessa
      from public.remessas r join public.pedidos p on p.id = r.pedido_id
      where r.id = v_remessa;
      if v_pedido is null or v_filial_remessa <> v_filial then raise exception 'A remessa não pertence à sua filial.'; end if;
    end if;
  end if;

  insert into public.qualidade_ocorrencias (
    origem, local_tipo, filial_id, pedido_id, remessa_id, categoria_problema_id, tipo_problema_id,
    prioridade, situacao, comercializacao, encaminhamento, encaminhado_em, descricao, criado_por
  ) values (
    v_origem, case when v_papel = 'cd_admin' then 'cd' else 'filial' end, v_filial, v_pedido, v_remessa,
    v_categoria, v_tipo, 'medium', v_situacao, 'waiting_analysis', v_encaminhamento,
    case when v_encaminhamento = 'cd' and v_papel = 'filial' then now() else null end,
    btrim(p_chamado->>'descricao'), auth.uid()
  ) returning id into v_id;

  insert into public.qualidade_ocorrencia_itens (ocorrencia_id, produto_id, quantidade_afetada)
  values (v_id, v_produto, v_quantidade);

  perform public.registrar_historico_qualidade(v_id, 'ticket_created', 'Chamado de qualidade aberto.');
  if v_papel = 'filial' and v_encaminhamento = 'cd' then
    perform public.registrar_historico_qualidade(v_id, 'ticket_forwarded', 'Chamado enviado pela filial para a indústria/CD.');
  end if;
  return v_id;
end
$$;

create or replace function public.encaminhar_chamado_qualidade(p_ocorrencia_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_ocorrencia public.qualidade_ocorrencias%rowtype;
begin
  if public.meu_papel() <> 'filial' then raise exception 'Somente a filial pode encaminhar este chamado.'; end if;
  select * into v_ocorrencia from public.qualidade_ocorrencias where id = p_ocorrencia_id for update;
  if v_ocorrencia.id is null or v_ocorrencia.filial_id <> public.minha_filial_id() then raise exception 'Chamado não encontrado para esta filial.'; end if;
  if v_ocorrencia.situacao = 'resolved' then raise exception 'Este chamado já foi resolvido.'; end if;
  if v_ocorrencia.encaminhamento = 'cd' then raise exception 'Este chamado já foi enviado para a indústria/CD.'; end if;
  update public.qualidade_ocorrencias set encaminhamento = 'cd', encaminhado_em = now(), situacao = 'analysis', atualizado_em = now()
  where id = p_ocorrencia_id;
  perform public.registrar_historico_qualidade(p_ocorrencia_id, 'ticket_forwarded', 'Chamado enviado pela filial para a indústria/CD.');
end
$$;

create or replace function public.resolver_chamado_qualidade(p_ocorrencia_id uuid, p_resolucao text)
returns void language plpgsql security definer set search_path = public as $$
declare v_ocorrencia public.qualidade_ocorrencias%rowtype; v_papel text := public.meu_papel();
begin
  if coalesce(btrim(p_resolucao), '') = '' then raise exception 'Descreva como o chamado foi resolvido.'; end if;
  select * into v_ocorrencia from public.qualidade_ocorrencias where id = p_ocorrencia_id for update;
  if v_ocorrencia.id is null then raise exception 'Chamado não encontrado.'; end if;
  if v_ocorrencia.situacao = 'resolved' then raise exception 'Este chamado já foi resolvido.'; end if;
  if v_papel = 'filial' and (v_ocorrencia.filial_id <> public.minha_filial_id() or v_ocorrencia.encaminhamento <> 'interno') then
    raise exception 'A filial só pode resolver internamente os próprios chamados.';
  end if;
  if v_papel = 'cd_admin' and not (v_ocorrencia.origem = 'production' or v_ocorrencia.encaminhamento = 'cd') then
    raise exception 'Este chamado está sendo tratado internamente pela filial.';
  end if;
  if v_papel not in ('cd_admin', 'filial') then raise exception 'Você não tem permissão para resolver chamados.'; end if;
  update public.qualidade_ocorrencias set
    situacao = 'resolved', resolucao = btrim(p_resolucao), resolvido_por = auth.uid(),
    resolvido_em = now(), cancelado_em = null, atualizado_em = now()
  where id = p_ocorrencia_id;
  perform public.registrar_historico_qualidade(
    p_ocorrencia_id, 'ticket_resolved', 'Chamado resolvido.', jsonb_build_object('resolucao', btrim(p_resolucao))
  );
end
$$;

grant execute on function public.criar_chamado_qualidade(jsonb) to authenticated;
grant execute on function public.encaminhar_chamado_qualidade(uuid) to authenticated;
grant execute on function public.resolver_chamado_qualidade(uuid, text) to authenticated;

-- Encerra o fluxo avançado anterior: todas as alterações passam pelas três
-- operações simples acima, inclusive quando alguém tenta usar o DevTools.
revoke execute on function public.criar_ocorrencia_qualidade(jsonb, jsonb) from authenticated;
revoke execute on function public.atualizar_ocorrencia_qualidade(uuid, jsonb) from authenticated;
revoke execute on function public.adicionar_acao_qualidade(uuid, jsonb) from authenticated;
revoke execute on function public.atualizar_acao_qualidade(uuid, text) from authenticated;
