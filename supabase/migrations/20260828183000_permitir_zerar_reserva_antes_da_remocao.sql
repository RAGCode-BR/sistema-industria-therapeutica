-- A remessa baixa a reserva e, em seguida, remove a linha zerada na mesma transação.
-- O zero precisa ser aceito nesse intervalo atômico para a última unidade poder sair.
alter table public.reservas_producao drop constraint if exists reservas_producao_quantidade_check;
alter table public.reservas_producao add constraint reservas_producao_quantidade_check check (quantidade >= 0);

delete from public.reservas_producao where quantidade = 0;
