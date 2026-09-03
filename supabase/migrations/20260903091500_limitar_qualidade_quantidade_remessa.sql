create or replace function public.validar_item_ocorrencia_qualidade()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_pedido_id text; v_remessa_id uuid; v_quantidade_enviada integer;
begin
  select pedido_id, remessa_id into v_pedido_id, v_remessa_id
  from public.qualidade_ocorrencias where id = new.ocorrencia_id;

  if v_remessa_id is not null then
    select quantidade into v_quantidade_enviada
    from public.remessa_itens
    where remessa_id = v_remessa_id and produto_id = new.produto_id;
    if v_quantidade_enviada is null then
      raise exception 'O produto deve pertencer à remessa selecionada.';
    end if;
    if new.quantidade_afetada > v_quantidade_enviada then
      raise exception 'A quantidade afetada não pode ultrapassar a quantidade enviada na remessa.';
    end if;
    new.quantidade_referencia := v_quantidade_enviada;
  elsif v_pedido_id is not null and not exists (
    select 1 from public.pedido_itens where pedido_id = v_pedido_id and produto_id = new.produto_id
  ) then
    raise exception 'O produto deve pertencer ao pedido selecionado.';
  end if;
  return new;
end
$$;
