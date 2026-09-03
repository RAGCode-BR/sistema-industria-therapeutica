with primeira_analise_registrada as (
  select ocorrencia_id, min(criado_em) as criado_em
  from public.qualidade_historico
  where tipo = 'analysis_saved'
  group by ocorrencia_id
), status_anterior as (
  select distinct on (h.ocorrencia_id)
    h.ocorrencia_id,
    h.criado_em,
    h.criado_por,
    h.dados ->> 'atual' as situacao
  from public.qualidade_historico h
  join primeira_analise_registrada a on a.ocorrencia_id = h.ocorrencia_id
  where h.tipo = 'status_changed'
    and h.criado_em < a.criado_em
  order by h.ocorrencia_id, h.criado_em
)
insert into public.qualidade_historico (ocorrencia_id, tipo, descricao, dados, criado_por, criado_em)
select
  ocorrencia_id,
  'analysis_saved',
  'Análise e tratativa anterior migrada.',
  jsonb_build_object('situacao', situacao),
  criado_por,
  criado_em
from status_anterior;
