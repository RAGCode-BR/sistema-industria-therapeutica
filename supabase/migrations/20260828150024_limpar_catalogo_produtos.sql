-- Reinicializa o catálogo para o novo cadastro. As categorias, filiais,
-- usuários e demais configurações são preservados.
-- Movimentações e saldos dependem diretamente dos produtos e são removidos
-- para não manter histórico apontando para itens inexistentes.
begin;

delete from public.estoque_filiais;
delete from public.movimentacoes;
delete from public.produtos;

commit;
