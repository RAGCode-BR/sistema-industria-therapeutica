-- A função é usada pelas políticas RLS para aplicar o isolamento por filial.
grant execute on function public.qualidade_pode_acessar_ocorrencia(uuid) to authenticated;
