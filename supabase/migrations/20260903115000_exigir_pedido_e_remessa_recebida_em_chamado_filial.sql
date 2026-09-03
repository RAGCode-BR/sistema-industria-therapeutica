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
  v_pedido_remessa text;
  v_filial_remessa text;
  v_situacao_remessa text;
begin
  if v_papel not in ('cd_admin', 'filial') then raise exception 'Você não tem permissão para abrir chamados.'; end if;

  v_tipo := nullif(p_chamado->>'tipo_problema_id', '')::uuid;
  v_produto := nullif(p_chamado->>'produto_id', '');
  v_quantidade := nullif(p_chamado->>'quantidade_afetada', '')::integer;
  v_remessa := nullif(p_chamado->>'remessa_id', '')::uuid;
  v_pedido := nullif(p_chamado->>'pedido_id', '');
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
    if v_pedido is null then raise exception 'Selecione um pedido recebido pela sua filial.'; end if;
    if v_remessa is null then raise exception 'Selecione a remessa recebida relacionada ao pedido.'; end if;

    select r.pedido_id, p.filial_id, r.situacao
      into v_pedido_remessa, v_filial_remessa, v_situacao_remessa
    from public.remessas r
    join public.pedidos p on p.id = r.pedido_id
    where r.id = v_remessa;

    if v_pedido_remessa is null or v_pedido_remessa <> v_pedido then raise exception 'A remessa não pertence ao pedido selecionado.'; end if;
    if v_filial_remessa <> v_filial then raise exception 'O pedido não pertence à sua filial.'; end if;
    if v_situacao_remessa <> 'recebida' then raise exception 'A remessa precisa estar recebida pela filial.'; end if;

    v_origem := 'branch_receiving';
    v_encaminhamento := coalesce(nullif(p_chamado->>'encaminhamento', ''), 'interno');
    if v_encaminhamento not in ('interno', 'cd') then raise exception 'Escolha como o chamado será tratado.'; end if;
    v_situacao := case when v_encaminhamento = 'cd' then 'analysis' else 'open' end;
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

revoke all on function public.criar_chamado_qualidade(jsonb) from public, anon;
grant execute on function public.criar_chamado_qualidade(jsonb) to authenticated;
