-- Chamados abertos pela filial passam a ser tratados exclusivamente pelo CD.
-- Chamados internos pendentes existentes tambem sao encaminhados para preservar
-- o novo fluxo sem alterar o historico de chamados ja resolvidos.
with chamados_encaminhados as (
  update public.qualidade_ocorrencias
  set encaminhamento = 'cd',
      situacao = 'analysis',
      encaminhado_em = coalesce(encaminhado_em, now()),
      atualizado_em = now()
  where origem = 'branch_receiving'
    and situacao <> 'resolved'
    and encaminhamento <> 'cd'
  returning id
)
insert into public.qualidade_historico (ocorrencia_id, tipo, descricao, dados, criado_por)
select id, 'ticket_forwarded', 'Chamado encaminhado para a industria/CD pelo novo fluxo.', '{}'::jsonb, null
from chamados_encaminhados;

create or replace function public.criar_chamado_qualidade(p_chamado jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_papel text := public.meu_papel();
  v_filial text;
  v_filial_solicitada text := nullif(p_chamado->>'filial_id', '');
  v_chamado_filial boolean;
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
  if v_papel not in ('cd_admin', 'filial') then raise exception 'Voce nao tem permissao para abrir chamados.'; end if;

  v_tipo := nullif(p_chamado->>'tipo_problema_id', '')::uuid;
  v_produto := nullif(p_chamado->>'produto_id', '');
  v_quantidade := nullif(p_chamado->>'quantidade_afetada', '')::integer;
  v_remessa := nullif(p_chamado->>'remessa_id', '')::uuid;
  v_pedido := nullif(p_chamado->>'pedido_id', '');
  select categoria_id into v_categoria from public.qualidade_tipos_problema where id = v_tipo and ativo;

  if v_categoria is null then raise exception 'Selecione um tipo de problema valido.'; end if;
  if v_produto is null or not exists (select 1 from public.produtos where id = v_produto and ativo) then raise exception 'Selecione um produto valido.'; end if;
  if v_quantidade is null or v_quantidade <= 0 then raise exception 'Informe uma quantidade afetada valida.'; end if;
  if coalesce(btrim(p_chamado->>'descricao'), '') = '' then raise exception 'Descreva o problema encontrado.'; end if;

  v_chamado_filial := v_papel = 'filial' or (v_papel = 'cd_admin' and v_filial_solicitada is not null);
  if not v_chamado_filial then
    v_filial := null;
    v_origem := 'production';
    v_encaminhamento := 'cd';
    v_situacao := 'open';
    v_remessa := null;
    v_pedido := null;
  else
    v_filial := case when v_papel = 'filial' then public.minha_filial_id() else v_filial_solicitada end;
    if v_filial is null then raise exception 'Seu usuario nao possui uma filial vinculada.'; end if;
    if v_papel = 'filial' and v_filial_solicitada is not null and v_filial_solicitada <> v_filial then
      raise exception 'A filial so pode registrar chamados do proprio local.';
    end if;
    if v_pedido is null then raise exception 'Selecione um pedido recebido pela sua filial.'; end if;
    if v_remessa is null then raise exception 'Selecione a remessa recebida relacionada ao pedido.'; end if;

    select r.pedido_id, p.filial_id, r.situacao
      into v_pedido_remessa, v_filial_remessa, v_situacao_remessa
    from public.remessas r
    join public.pedidos p on p.id = r.pedido_id
    where r.id = v_remessa;

    if v_pedido_remessa is null or v_pedido_remessa <> v_pedido then raise exception 'A remessa nao pertence ao pedido selecionado.'; end if;
    if v_filial_remessa <> v_filial then raise exception 'O pedido nao pertence a filial informada.'; end if;
    if v_situacao_remessa <> 'recebida' then raise exception 'A remessa precisa estar recebida pela filial.'; end if;

    v_origem := 'branch_receiving';
    v_encaminhamento := 'cd';
    v_situacao := 'analysis';
  end if;

  insert into public.qualidade_ocorrencias (
    origem, local_tipo, filial_id, pedido_id, remessa_id, categoria_problema_id, tipo_problema_id,
    prioridade, situacao, comercializacao, encaminhamento, encaminhado_em, descricao, criado_por
  ) values (
    v_origem, case when v_chamado_filial then 'filial' else 'cd' end, v_filial, v_pedido, v_remessa,
    v_categoria, v_tipo, 'medium', v_situacao, 'waiting_analysis', v_encaminhamento,
    case when v_chamado_filial then now() else null end,
    btrim(p_chamado->>'descricao'), auth.uid()
  ) returning id into v_id;

  insert into public.qualidade_ocorrencia_itens (ocorrencia_id, produto_id, quantidade_afetada)
  values (v_id, v_produto, v_quantidade);

  perform public.registrar_historico_qualidade(v_id, 'ticket_created', 'Chamado de qualidade aberto.');
  if v_chamado_filial then
    perform public.registrar_historico_qualidade(v_id, 'ticket_forwarded', 'Chamado enviado pela filial para a industria/CD.');
  end if;
  return v_id;
end
$$;

create or replace function public.resolver_chamado_qualidade(p_ocorrencia_id uuid, p_resolucao text)
returns void language plpgsql security definer set search_path = public as $$
declare v_ocorrencia public.qualidade_ocorrencias%rowtype; v_papel text := public.meu_papel();
begin
  if coalesce(btrim(p_resolucao), '') = '' then raise exception 'Descreva como o chamado foi resolvido.'; end if;
  if v_papel <> 'cd_admin' then raise exception 'Somente a equipe do CD pode resolver chamados.'; end if;
  select * into v_ocorrencia from public.qualidade_ocorrencias where id = p_ocorrencia_id for update;
  if v_ocorrencia.id is null then raise exception 'Chamado nao encontrado.'; end if;
  if v_ocorrencia.situacao = 'resolved' then raise exception 'Este chamado ja foi resolvido.'; end if;
  if not (v_ocorrencia.origem = 'production' or v_ocorrencia.encaminhamento = 'cd' or v_ocorrencia.criado_por = auth.uid()) then
    raise exception 'Este chamado esta sendo tratado internamente pela filial.';
  end if;
  update public.qualidade_ocorrencias set
    situacao = 'resolved', resolucao = btrim(p_resolucao), resolvido_por = auth.uid(),
    resolvido_em = now(), cancelado_em = null, atualizado_em = now()
  where id = p_ocorrencia_id;
  perform public.registrar_historico_qualidade(
    p_ocorrencia_id, 'ticket_resolved', 'Chamado resolvido.', jsonb_build_object('resolucao', btrim(p_resolucao))
  );
end
$$;

revoke all on function public.criar_chamado_qualidade(jsonb) from public, anon;
revoke all on function public.resolver_chamado_qualidade(uuid, text) from public, anon;
grant execute on function public.criar_chamado_qualidade(jsonb) to authenticated;
grant execute on function public.resolver_chamado_qualidade(uuid, text) to authenticated;