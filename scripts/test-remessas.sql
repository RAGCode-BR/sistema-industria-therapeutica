begin;

do $$
declare
  v_produto text;
  v_remessa uuid;
begin
  select id into v_produto from public.produtos order by id limit 1;
  insert into public.pedidos (id, filial_id, situacao, observacao)
  values ('teste-remessa-auditoria', 'blumenau', 'pendente', 'teste transacional');
  insert into public.pedido_itens (pedido_id, produto_id, estoque_informado, quantidade_solicitada, situacao)
  values ('teste-remessa-auditoria', v_produto, 0, 3, 'aprovado');
  insert into public.remessas (pedido_id, entrega_prevista)
  values ('teste-remessa-auditoria', current_date + 2)
  returning id into v_remessa;
  insert into public.remessa_itens (remessa_id, pedido_id, produto_id, quantidade)
  values (v_remessa, 'teste-remessa-auditoria', v_produto, 2);
  update public.remessas set situacao = 'recebida', recebida_em = now() where id = v_remessa;

  -- Ao cancelar uma nova remessa, o item precisa voltar a ficar disponível
  -- para expedição; ele não pode permanecer como "em trânsito".
  insert into public.remessas (pedido_id, entrega_prevista)
  values ('teste-remessa-auditoria', current_date + 2)
  returning id into v_remessa;
  insert into public.remessa_itens (remessa_id, pedido_id, produto_id, quantidade)
  values (v_remessa, 'teste-remessa-auditoria', v_produto, 1);
  perform public.recalcular_situacao_pedido_por_remessas('teste-remessa-auditoria');
  update public.remessas set situacao = 'cancelada' where id = v_remessa;
  perform public.recalcular_situacao_pedido_por_remessas('teste-remessa-auditoria');
  if (select situacao from public.pedido_itens where pedido_id = 'teste-remessa-auditoria' and produto_id = v_produto) <> 'aprovado' then
    raise exception 'Item cancelado permaneceu em situação incorreta';
  end if;

  if (select count(*) from public.pedido_eventos where pedido_id = 'teste-remessa-auditoria') < 3 then
    raise exception 'Histórico não foi criado';
  end if;
  if (select entrega_prevista from public.pedidos where id = 'teste-remessa-auditoria') is null then
    raise exception 'Prazo não foi propagado';
  end if;
end;
$$;

rollback;
