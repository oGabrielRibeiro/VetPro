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
- [ ] Padronizar entrada de audio (codec, sample rate, normalizacao de volume, remocao de silencio inicial/final).
- [ ] Implementar validacao forte de audio antes da IA (duracao minima, sinal/ruido, mime/type).
- [ ] Criar fallback de transcricao em cascata (provedor A -> B -> heuristica local) com telemetria.
- [ ] Adicionar diarizacao robusta (Tutor/Vet) com score de confianca e fallback conservador.
- [ ] Registrar metadados tecnicos da transcricao por request (duracao, provider, confiança, erros).

## P0 - Parser clinico (core fields)
- [ ] Revisar extracao por regras para campos core com priorizacao por falante/contexto.
- [ ] Criar "gates" de qualidade por campo (nao preencher sem evidencia textual minima).
- [ ] Impedir preenchimento por ruido conversacional (saudacoes, fillers, eco de frase).
- [ ] Implementar normalizacao clinica (siglas, sinonimos, unidades, acentuacao, negacoes).
- [ ] Adicionar reconciliacao final por prioridade: evidencias estruturadas > heuristica > IA generativa.

## P0 - Campos especificos por porte (anti-sobrepreenchimento)
- [ ] Exigir semantica por chave + grounding no transcript para cada campo especifico.
- [ ] Bloquear reaproveitamento da mesma frase em multiplos campos sem evidencias distintas.
- [ ] Criar dicionario tecnico por porte/especie (equino, bovino, pequenos) para extracao guiada.
- [ ] Tratar campos numericos com parser dedicado (ECC, dias lactacao, paridade, temperatura, FC/FR).
- [ ] Adicionar modo conservador: se baixa confianca, manter campo vazio e sinalizar revisao.

## P1 - IA e prompts (nivel profissional)
- [ ] Versionar prompts com identificador (`prompt_version`) e changelog por versao.
- [ ] Criar prompt por contexto clinico (nova, retorno, emergencia, campo).
- [ ] Adicionar few-shots curados por porte/especie e casos limite (negacao, ambiguidade, ruído).
- [ ] Implementar "self-check" da IA: justificar evidencias por campo antes de aceitar output.
- [ ] Definir schema estrito de resposta IA (tipagem + validacao + descarte de campo invalido).

## P1 - Heuristica avancada
- [ ] Introduzir score de confianca por campo (0-1) com explicacao de origem.
- [ ] Implementar ensemble leve (regex + n-gram + regras de contexto) antes do merge final.
- [ ] Melhorar deteccao de negacao e temporalidade ("nao", "sem", "desde", "ha X dias").
- [ ] Criar heuristicas de contradicao (ex.: "sem febre" vs "febre alta") e resolver por prioridade.
- [ ] Evoluir classificacao de porte com evidencias fortes e log de decisao.

## P1 - Observabilidade e auditoria
- [ ] Criar log estruturado por pipeline stage com `requestId` e latencia de cada etapa.
- [ ] Salvar artefatos de debug opcionais (transcript, draft, diferencas de merge) em ambiente dev.
- [ ] Dashboard de qualidade: cobertura, sobrepreenchimento, erros por campo, latencia.
- [ ] Alertas para regressao (queda de cobertura, aumento de sobrepreenchimento, timeout).

## P1 - Dataset e avaliacao automatica
- [ ] Montar gold dataset realista (>= 200 audios anonimizados) por porte/especie/cenario.
- [ ] Definir rubrica de avaliacao por campo (exato, parcial, incorreto, nao informado).
- [ ] Automatizar benchmark em CI (`ai:evaluate`, `ai:evaluate:mobile`) com relatorio versionado.
- [ ] Criar suite de regressao com casos criticos repetiveis (mesmo audio, multiplas execucoes).
- [ ] Publicar baseline e metas por release.

## P2 - UX de confianca clinica
- [ ] Exibir confianca por campo no frontend (alta/media/baixa) e origem (IA/heuristica/regra).
- [ ] Permitir "aceitar/rejeitar sugestao" por campo para feedback supervisionado.
- [ ] Sugerir revisao manual quando houver baixa confianca ou conflito de evidencias.
- [ ] Melhorar revisao rapida (contraste, leitura, destaque de campos alterados).

## P2 - Aprendizado continuo
- [ ] Capturar feedback do usuario em correcao de campos (telemetria anonima opcional).
- [ ] Criar pipeline de aprendizado supervisionado por correcoes aceitas.
- [ ] Revisao mensal de dicionarios, prompts e regras com base em erros reais.
- [ ] Definir processo de aprovacao tecnica para mudancas no pipeline IA.

## Critérios de pronto (Definition of Done)
- [ ] Sem sobrepreenchimento repetitivo em campos de porte para casos de teste conhecidos.
- [ ] Benchmarks automatizados com melhoria mensuravel vs baseline anterior.
- [ ] Logs e diagnostico suficientes para reproduzir erro em qualquer etapa.
- [ ] Documentacao tecnica atualizada (fluxo, regras, limites, troubleshooting).
- [ ] Validacao final com amostra real multi-especie e aceite clinico.
