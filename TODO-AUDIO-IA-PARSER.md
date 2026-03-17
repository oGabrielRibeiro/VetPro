# TODO - Audio / Transcricao / Parser / IA / Heuristica

## Objetivo
Elevar a precisao e robustez do pipeline de prontuario por audio (`captura -> transcricao -> parser -> enriquecimento IA -> heuristica -> preenchimento`) para nivel profissional, com metricas e regressao controlada.

## Metas de qualidade (SLO interno)
- [ ] Cobertura de campos core (queixa, anamnese, exame fisico, diagnostico, conduta): >= 90%.
- [ ] Precisao de preenchimento de campos especificos por porte: >= 85%.
- [ ] Taxa de sobrepreenchimento (campos indevidos): <= 5%.
- [ ] Consistencia entre rodadas do mesmo audio: desvio <= 10%.
- [ ] Tempo de resposta ponta a ponta (audio curto): <= 12s p95.

## P0 - Confiabilidade de transcricao
- [x] Padronizar entrada de audio (codec, sample rate, normalizacao de volume, remocao de silencio inicial/final).
- [x] Implementar validacao forte de audio antes da IA (duracao minima, sinal/ruido, mime/type).
- [x] Criar fallback de transcricao em cascata (provedor A -> B -> heuristica local) com telemetria.
- [x] Adicionar diarizacao robusta (Tutor/Vet) com score de confianca e fallback conservador.
- [x] Registrar metadados tecnicos da transcricao por request (duracao, provider, confiança, erros).

## P0 - Parser clinico (core fields)
- [x] Revisar extracao por regras para campos core com priorizacao por falante/contexto.
- [x] Criar "gates" de qualidade por campo (nao preencher sem evidencia textual minima).
- [x] Impedir preenchimento por ruido conversacional (saudacoes, fillers, eco de frase).
- [x] Implementar normalizacao clinica (siglas, sinonimos, unidades, acentuacao, negacoes).
- [x] Adicionar reconciliacao final por prioridade: evidencias estruturadas > heuristica > IA generativa.

## P0 - Campos especificos por porte (anti-sobrepreenchimento)
- [x] Exigir semantica por chave + grounding no transcript para cada campo especifico.
- [x] Bloquear reaproveitamento da mesma frase em multiplos campos sem evidencias distintas.
- [x] Criar dicionario tecnico por porte/especie (equino, bovino, pequenos) para extracao guiada.
- [x] Tratar campos numericos com parser dedicado (ECC, dias lactacao, paridade, temperatura, FC/FR).
- [x] Adicionar modo conservador: se baixa confianca, manter campo vazio e sinalizar revisao.

## P1 - IA e prompts (nivel profissional)
- [x] Versionar prompts com identificador (`prompt_version`) e changelog por versao.
- [x] Criar prompt por contexto clinico (nova, retorno, emergencia, campo).
- [x] Adicionar few-shots curados por porte/especie e casos limite (negacao, ambiguidade, ruído).
- [x] Implementar "self-check" da IA: justificar evidencias por campo antes de aceitar output.
- [x] Definir schema estrito de resposta IA (tipagem + validacao + descarte de campo invalido).

## P1 - Heuristica avancada
- [x] Introduzir score de confianca por campo (0-1) com explicacao de origem.
- [x] Implementar ensemble leve (regex + n-gram + regras de contexto) antes do merge final.
- [x] Melhorar deteccao de negacao e temporalidade ("nao", "sem", "desde", "ha X dias").
- [x] Criar heuristicas de contradicao (ex.: "sem febre" vs "febre alta") e resolver por prioridade.
- [x] Evoluir classificacao de porte com evidencias fortes e log de decisao.

## P1 - Observabilidade e auditoria
- [x] Criar log estruturado por pipeline stage com `requestId` e latencia de cada etapa.
- [x] Salvar artefatos de debug opcionais (transcript, draft, diferencas de merge) em ambiente dev.
- [x] Dashboard de qualidade: cobertura, sobrepreenchimento, erros por campo, latencia.
- [x] Alertas para regressao (queda de cobertura, aumento de sobrepreenchimento, timeout).

## P1 - Dataset e avaliacao automatica
- [x] Montar gold dataset realista (>= 200 audios anonimizados) por porte/especie/cenario.
- [x] Definir rubrica de avaliacao por campo (exato, parcial, incorreto, nao informado).
- [x] Automatizar benchmark em CI (`ai:evaluate`, `ai:evaluate:mobile`) com relatorio versionado.
- [x] Criar suite de regressao com casos criticos repetiveis (mesmo audio, multiplas execucoes).
- [x] Publicar baseline e metas por release.
- [x] Calibrar metrica de consistencia para assinatura semantica por campo critico (diagnostico/conduta/exame), evitando falso negativo por variacao textual superficial.

## P2 - UX de confianca clinica
- [x] Exibir confianca por campo no frontend (alta/media/baixa) e origem (IA/heuristica/regra).
- [x] Permitir "aceitar/rejeitar sugestao" por campo para feedback supervisionado.
- [x] Sugerir revisao manual quando houver baixa confianca ou conflito de evidencias.
- [x] Melhorar revisao rapida (contraste, leitura, destaque de campos alterados).

## P2 - Aprendizado continuo
- [x] Capturar feedback do usuario em correcao de campos (telemetria anonima opcional).
- [x] Criar pipeline de aprendizado supervisionado por correcoes aceitas.
- [x] Revisao mensal de dicionarios, prompts e regras com base em erros reais.
- [x] Definir processo de aprovacao tecnica para mudancas no pipeline IA.

## Critérios de pronto (Definition of Done)
- [x] Sem sobrepreenchimento repetitivo em campos de porte para casos de teste conhecidos.
- [x] Benchmarks automatizados com melhoria mensuravel vs baseline anterior.
- [x] Logs e diagnostico suficientes para reproduzir erro em qualquer etapa.
- [x] Documentacao tecnica atualizada (fluxo, regras, limites, troubleshooting).
- [ ] Validacao final com amostra real multi-especie e aceite clinico.
