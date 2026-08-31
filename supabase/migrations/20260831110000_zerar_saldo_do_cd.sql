-- Zera exclusivamente o saldo físico do Centro de Distribuição.
-- Cadastro, categorias, unidades, estoque mínimo e saldos das filiais são preservados.
update public.produtos
set quantidade = 0,
    atualizado_em = now()
where quantidade <> 0;
