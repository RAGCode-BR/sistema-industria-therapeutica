-- Reinicia os saldos para uma nova rodada de testes sem alterar o catálogo,
-- as categorias, as unidades ou os estoques mínimos dos produtos.
begin;

update public.produtos
set quantidade = 0;

update public.estoque_filiais
set quantidade = 0,
    atualizado_em = now();

commit;
