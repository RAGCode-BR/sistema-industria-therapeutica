-- As políticas RLS já limitam escrita ao CD; os privilégios permitem que elas sejam efetivas.
grant insert, update, delete on public.qualidade_categorias_problema, public.qualidade_tipos_problema, public.qualidade_tipos_tratativa to authenticated;
