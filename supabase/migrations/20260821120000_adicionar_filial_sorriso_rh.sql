-- Inclui a unidade de RH sem alterar as filiais ou vínculos já existentes.
insert into public.filiais (id, nome, cidade)
values ('matriz', 'Sorriso', 'Sorriso, MT')
on conflict (id) do update
set nome = excluded.nome,
    cidade = excluded.cidade;
