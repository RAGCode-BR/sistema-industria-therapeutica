-- Remove os registros que foram restaurados pelo cache local antes da
-- desativação da migração automática no front-end.
begin;

delete from public.estoque_filiais;
delete from public.movimentacoes;
delete from public.produtos;

commit;
