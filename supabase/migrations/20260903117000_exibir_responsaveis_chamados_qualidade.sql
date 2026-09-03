create or replace function public.listar_responsaveis_chamados_qualidade(p_ocorrencias uuid[])
returns table (id uuid, nome text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct u.id, u.nome
  from public.usuarios u
  join public.qualidade_ocorrencias o
    on u.id in (o.criado_por, o.resolvido_por)
  where o.id = any(coalesce(p_ocorrencias, array[]::uuid[]))
    and public.qualidade_pode_acessar_ocorrencia(o.id)
$$;

revoke all on function public.listar_responsaveis_chamados_qualidade(uuid[]) from public, anon;
grant execute on function public.listar_responsaveis_chamados_qualidade(uuid[]) to authenticated;
