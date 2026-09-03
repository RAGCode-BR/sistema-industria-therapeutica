alter table public.qualidade_ocorrencias
  add column if not exists local_tipo text not null default 'nao_aplicavel'
  check (local_tipo in ('cd', 'filial', 'nao_aplicavel'));

update public.qualidade_ocorrencias
set local_tipo = case when filial_id is null then 'nao_aplicavel' else 'filial' end
where local_tipo = 'nao_aplicavel';

create index if not exists qualidade_ocorrencias_local_cd_idx
  on public.qualidade_ocorrencias (criado_em desc)
  where local_tipo = 'cd';

create or replace function public.validar_local_ocorrencia_qualidade()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.local_tipo = 'cd' and (new.filial_id is not null or new.pedido_id is not null or new.remessa_id is not null) then
    raise exception 'Ocorrências do CD não podem ser vinculadas a pedido, remessa ou filial.';
  end if;
  if new.local_tipo = 'filial' and new.filial_id is null then
    raise exception 'Informe a filial quando o local for uma filial.';
  end if;
  if new.local_tipo = 'nao_aplicavel' and new.filial_id is not null then
    raise exception 'O local deve ser uma filial quando houver filial vinculada.';
  end if;
  return new;
end
$$;

drop trigger if exists qualidade_z_validar_local on public.qualidade_ocorrencias;
create trigger qualidade_z_validar_local
before insert or update on public.qualidade_ocorrencias
for each row execute function public.validar_local_ocorrencia_qualidade();

create or replace function public.criar_ocorrencia_qualidade(p_ocorrencia jsonb, p_itens jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_filial text; v_local_tipo text; v_item record;
begin
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'Informe ao menos um produto afetado.'; end if;
  v_filial := nullif(p_ocorrencia->>'filial_id', '');
  v_local_tipo := coalesce(nullif(p_ocorrencia->>'local_tipo', ''), case when v_filial is null then 'nao_aplicavel' else 'filial' end);
  if public.meu_papel() = 'filial' and (v_local_tipo <> 'filial' or v_filial is null or v_filial <> public.minha_filial_id()) then raise exception 'A filial só pode registrar ocorrências do próprio local.'; end if;
  if public.meu_papel() not in ('cd_admin', 'filial') then raise exception 'Você não tem permissão para registrar ocorrências.'; end if;
  insert into public.qualidade_ocorrencias (origem, local_tipo, filial_id, pedido_id, remessa_id, categoria_problema_id, tipo_problema_id, prioridade, comercializacao, descricao, criado_por)
  values (p_ocorrencia->>'origem', v_local_tipo, v_filial, nullif(p_ocorrencia->>'pedido_id', ''), nullif(p_ocorrencia->>'remessa_id', '')::uuid,
    (p_ocorrencia->>'categoria_problema_id')::uuid, (p_ocorrencia->>'tipo_problema_id')::uuid,
    coalesce(nullif(p_ocorrencia->>'prioridade', ''), 'medium'), coalesce(nullif(p_ocorrencia->>'comercializacao', ''), 'waiting_analysis'),
    p_ocorrencia->>'descricao', auth.uid()) returning id into v_id;
  for v_item in select * from jsonb_to_recordset(p_itens) as x(produto_id text, quantidade_afetada integer, quantidade_referencia integer) loop
    insert into public.qualidade_ocorrencia_itens (ocorrencia_id, produto_id, quantidade_afetada, quantidade_referencia)
    values (v_id, v_item.produto_id, v_item.quantidade_afetada, v_item.quantidade_referencia);
  end loop;
  perform public.registrar_historico_qualidade(v_id, 'created', 'Ocorrência criada.');
  return v_id;
end
$$;

grant execute on function public.criar_ocorrencia_qualidade(jsonb, jsonb) to authenticated;
