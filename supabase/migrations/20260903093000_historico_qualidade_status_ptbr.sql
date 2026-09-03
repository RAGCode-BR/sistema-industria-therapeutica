create or replace function public.atualizar_ocorrencia_qualidade(p_ocorrencia_id uuid, p_atualizacao jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_anterior text; v_nova text; v_anterior_texto text; v_nova_texto text; v_ocorrencia public.qualidade_ocorrencias%rowtype;
begin
  if public.meu_papel() <> 'cd_admin' then raise exception 'Somente o CD pode analisar e tratar ocorrências.'; end if;
  select situacao into v_anterior from public.qualidade_ocorrencias where id = p_ocorrencia_id for update;
  if v_anterior is null then raise exception 'Ocorrência não encontrada.'; end if;
  v_nova := coalesce(nullif(p_atualizacao->>'situacao', ''), v_anterior);
  update public.qualidade_ocorrencias set
    situacao = v_nova,
    responsavel_id = case when p_atualizacao ? 'responsavel_id' then nullif(p_atualizacao->>'responsavel_id', '')::uuid else responsavel_id end,
    causa_identificada = coalesce(p_atualizacao->>'causa_identificada', causa_identificada),
    observacoes_analise = coalesce(p_atualizacao->>'observacoes_analise', observacoes_analise),
    tipo_tratativa_id = case when p_atualizacao ? 'tipo_tratativa_id' then nullif(p_atualizacao->>'tipo_tratativa_id', '')::uuid else tipo_tratativa_id end,
    descricao_tratativa = coalesce(p_atualizacao->>'descricao_tratativa', descricao_tratativa),
    prazo_tratativa = case when p_atualizacao ? 'prazo_tratativa' then nullif(p_atualizacao->>'prazo_tratativa', '')::date else prazo_tratativa end,
    resolvido_em = case when v_nova = 'resolved' then now() else null end,
    cancelado_em = case when v_nova = 'cancelled' then now() else null end,
    atualizado_em = now()
  where id = p_ocorrencia_id
  returning * into v_ocorrencia;
  if v_nova <> v_anterior then
    v_anterior_texto := case v_anterior when 'open' then 'Aberta' when 'analysis' then 'Em análise' when 'treatment' then 'Em tratativa' when 'waiting_confirmation' then 'Aguardando confirmação' when 'resolved' then 'Resolvida' when 'cancelled' then 'Cancelada' else v_anterior end;
    v_nova_texto := case v_nova when 'open' then 'Aberta' when 'analysis' then 'Em análise' when 'treatment' then 'Em tratativa' when 'waiting_confirmation' then 'Aguardando confirmação' when 'resolved' then 'Resolvida' when 'cancelled' then 'Cancelada' else v_nova end;
    perform public.registrar_historico_qualidade(p_ocorrencia_id, 'status_changed', 'Status alterado de ' || v_anterior_texto || ' para ' || v_nova_texto || '.', jsonb_build_object('anterior', v_anterior, 'atual', v_nova));
  end if;
  perform public.registrar_historico_qualidade(
    p_ocorrencia_id,
    'analysis_saved',
    'Análise e tratativa registrada.',
    jsonb_build_object(
      'situacao', v_ocorrencia.situacao,
      'responsavel_id', v_ocorrencia.responsavel_id,
      'tipo_tratativa_id', v_ocorrencia.tipo_tratativa_id,
      'prazo_tratativa', v_ocorrencia.prazo_tratativa,
      'causa_identificada', v_ocorrencia.causa_identificada,
      'descricao_tratativa', v_ocorrencia.descricao_tratativa
    )
  );
end
$$;
