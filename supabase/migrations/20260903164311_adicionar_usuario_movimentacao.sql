alter table public.movimentacoes
  add column if not exists criado_por uuid references public.usuarios(id) on delete set null;

create index if not exists movimentacoes_criado_por_idx
  on public.movimentacoes (criado_por);

create or replace function public.definir_usuario_movimentacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.criado_por := auth.uid();
  end if;
  return new;
end
$$;

drop trigger if exists movimentacoes_definir_usuario on public.movimentacoes;
create trigger movimentacoes_definir_usuario
before insert on public.movimentacoes
for each row execute function public.definir_usuario_movimentacao();

create or replace function public.listar_responsaveis_movimentacoes(p_movimentacoes text[])
returns table (id uuid, nome text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct u.id, u.nome
  from public.usuarios u
  join public.movimentacoes m on m.criado_por = u.id
  where m.id = any(coalesce(p_movimentacoes, array[]::text[]))
    and public.meu_papel() = 'cd_admin'
$$;

revoke all on function public.definir_usuario_movimentacao() from public, anon, authenticated;
revoke all on function public.listar_responsaveis_movimentacoes(text[]) from public, anon;
grant execute on function public.listar_responsaveis_movimentacoes(text[]) to authenticated;
