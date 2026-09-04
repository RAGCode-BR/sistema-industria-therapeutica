-- Associa evidencias de respostas criadas antes da coluna solicitacao_id.
update public.qualidade_evidencias e
set solicitacao_id = (
  select s.id
  from public.qualidade_solicitacoes_info s
  where s.ocorrencia_id = e.ocorrencia_id
    and s.respondida_em is not null
  order by s.respondida_em desc
  limit 1
)
where e.contexto = 'response'
  and e.solicitacao_id is null;