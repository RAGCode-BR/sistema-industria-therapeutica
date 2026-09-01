-- Zera os saldos para uma nova rodada de testes sem alterar o catálogo
-- nem o estoque mínimo configurado em cada produto.
begin;

update public.produtos
set quantidade = 0;

update public.estoque_filiais
set quantidade = 0,
    atualizado_em = now();

commit;
