const {
  parseClinicalFieldsFromSegments,
  analyzeFieldConversation,
} = require('../services/fieldAssistFunctions');

describe('fieldAssistFunctions.parseClinicalFieldsFromSegments', () => {
  it('deve separar conteúdo clínico por campo com base em falas de Tutor e Medico', () => {
    const segments = [
      {
        stamp: '00:05',
        speaker: 'Tutor',
        text: 'Doutor, ele esta vomitando desde ontem e nao quer comer.',
      },
      {
        stamp: '00:20',
        speaker: 'Medico',
        text: 'No exame fisico, mucosas rosadas e temperatura 39.5 graus.',
      },
      {
        stamp: '00:33',
        speaker: 'Medico',
        text: 'Diagnostico presuntivo de gastroenterite. Vou iniciar tratamento com hidratacao e prescrevo ondansetrona 0,2 mg/kg BID.',
      },
      {
        stamp: '00:45',
        speaker: 'Medico',
        text: 'Solicito hemograma e retorno em 48 horas.',
      },
    ];

    const result = parseClinicalFieldsFromSegments(segments, '');

    expect(result.parsed.chiefComplaint).toMatch(/vomitando|nao quer comer/i);
    expect(result.parsed.anamnesis).toMatch(/desde ontem|vomitando/i);
    expect(result.parsed.physicalExam).toMatch(/mucosas|temperatura/i);
    expect(result.parsed.diagnosis).toMatch(/gastroenterite/i);
    expect(result.parsed.treatment).toMatch(/tratamento|hidratacao/i);
    expect(result.parsed.medications).toMatch(/ondansetrona|mg\/kg|bid/i);
    expect(result.parsed.examDetails).toMatch(/hemograma/i);
  });

  it('deve reclassificar speaker quando a frase tem forte evidência de fala médica', () => {
    const segments = [
      {
        stamp: '00:01',
        speaker: 'Tutor',
        text: 'Dr ele esta com diarreia ha dois dias.',
      },
      {
        stamp: '00:12',
        speaker: 'Tutor',
        text: 'No exame fisico observei dor abdominal e suspeita de gastrite.',
      },
    ];

    const result = parseClinicalFieldsFromSegments(segments, '');

    expect(result.context.medicoContent).toMatch(/exame fisico|suspeita/i);
    expect(result.parsed.diagnosis).toMatch(/gastrite|suspeita/i);
  });

  it('deve gerar alerta semântico quando faltam campos clínicos centrais', () => {
    const segments = [
      {
        stamp: '00:02',
        speaker: 'Tutor',
        text: 'Ele esta mais quieto hoje.',
      },
    ];

    const result = parseClinicalFieldsFromSegments(segments, '');

    expect(Array.isArray(result.pipeline?.semanticRules?.alerts)).toBe(true);
    expect(result.pipeline.semanticRules.alerts.length).toBeGreaterThan(0);
    expect(result.pipeline.semanticRules.alerts[0].id).toBe(
      'missing_core_fields',
    );
  });

  it('deve funcionar sem segmentos usando texto livre como fallback', () => {
    const text =
      'Queixa principal: tosse seca. Anamnese: começou ontem. Diagnostico: traqueite. Tratamento: repouso e nebulizacao.';

    const result = parseClinicalFieldsFromSegments([], text);

    expect(result.parsed.chiefComplaint).toMatch(/tosse/i);
    expect(result.parsed.anamnesis).toMatch(/ontem|anamnese/i);
    expect(result.parsed.diagnosis).toMatch(/traqueite/i);
    expect(result.parsed.treatment).toMatch(/repouso|nebulizacao/i);
  });

  it('deve respeitar prefixo explicito de speaker com timestamp e separador hifen', () => {
    const segments = [
      {
        stamp: '00:01',
        speaker: 'Tutor',
        text: '[00:01] Tutor - Ele esta mancando desde ontem.',
      },
      {
        stamp: '00:10',
        speaker: 'Tutor',
        text: '[00:10] Vet - No exame fisico: dor a palpacao e edema local.',
      },
      {
        stamp: '00:19',
        speaker: 'Tutor',
        text: '[00:19] Medico - Diagnostico: entorse. Tratamento com anti-inflamatorio.',
      },
    ];

    const result = parseClinicalFieldsFromSegments(segments, '');

    expect(result.context.tutorContent).toMatch(/mancando desde ontem/i);
    expect(result.context.medicoContent).toMatch(
      /exame fisico|diagnostico|tratamento/i,
    );
    expect(result.parsed.diagnosis).toMatch(/entorse|diagnostico/i);
    expect(result.parsed.treatment).toMatch(/tratamento|anti-inflamatorio/i);
  });

  it('deve normalizar alias de speaker Vet no fallback do segmento', () => {
    const segments = [
      {
        stamp: '00:01',
        speaker: 'Vet',
        text: 'Solicito hemograma e ultrassom abdominal.',
      },
    ];

    const result = parseClinicalFieldsFromSegments(segments, '');

    expect(result.context.medicoContent).toMatch(/hemograma|ultrassom/i);
    expect(result.parsed.examDetails).toMatch(/hemograma|ultrassom/i);
  });
});

describe('fieldAssistFunctions.analyzeFieldConversation', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    if (typeof originalApiKey === 'undefined') {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
    jest.restoreAllMocks();
  });

  it('deve transcrever audio e preencher campos estruturados com IA', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Tutor relata tosse desde ontem e vomito em duas ocasioes.',
          duration: 9.4,
          segments: [
            { start: 0, text: 'Tutor relata tosse desde ontem.' },
            { start: 4, text: 'Vet orienta hidratacao e retorno em 48 horas.' },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  transcricao_organizada:
                    '[TUTOR]: Tutor relata tosse desde ontem e vomito em duas ocasioes.',
                  identificacao: {},
                  anamnese: {
                    queixa_principal: 'Tosse e vomito',
                    historico_do_problema: 'Sinais iniciaram ontem',
                  },
                  exame_fisico: {
                    achados_relevantes: 'Nao informado na consulta',
                  },
                  avaliacao: {
                    diagnostico_presuntivo: 'Gastroenterite em avaliacao',
                  },
                  plano: {
                    orientacoes_ao_tutor: 'Hidratacao oral e repouso',
                    medicacoes_prescritas: 'Antiemetico conforme prescricao',
                    retorno: 'Reavaliar em 48 horas',
                    exames_solicitados: 'Nao informado na consulta',
                  },
                }),
              },
            },
          ],
        }),
      });

    global.fetch = fetchMock;

    const result = await analyzeFieldConversation({
      audioBuffer: Buffer.from('fake-audio-buffer'),
      mimeType: 'audio/wav',
      filename: 'consulta.wav',
      segments: [],
      transcript: '',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('/audio/transcriptions');
    expect(fetchMock.mock.calls[1][0]).toContain('/chat/completions');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
      'Bearer test-openai-key',
    );
    expect(result.transcript).toMatch(/tosse desde ontem/i);
    expect(result.parsed.chiefComplaint).toMatch(/tosse|vomito/i);
    expect(result.parsed.diagnosis).toMatch(
      /gastroenterite|enteropatia aguda em avaliacao/i,
    );
    expect(result.parsed.treatment).toMatch(/hidric|monitor|repouso/i);
    expect(Array.isArray(result.segments)).toBe(true);
    expect(result.segments.length).toBeGreaterThan(0);
  });

  it('deve usar transcript fallback quando Whisper retornar texto com baixo sinal clinico', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'ruido teste',
          duration: 2.1,
          segments: [{ start: 0, text: 'ruido teste' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  transcricao_organizada:
                    '[TUTOR]: Animal com febre alta e apatia desde ontem.',
                  identificacao: {},
                  anamnese: {
                    queixa_principal: 'Febre e apatia',
                  },
                  exame_fisico: {
                    achados_relevantes: 'Nao informado na consulta',
                  },
                  avaliacao: {
                    diagnostico_presuntivo: 'Doenca infecciosa em avaliacao',
                  },
                  plano: {
                    orientacoes_ao_tutor: 'Monitorar temperatura',
                    medicacoes_prescritas: 'Conforme prescricao',
                    retorno: 'Reavaliar em 24 horas',
                    exames_solicitados: 'Hemograma',
                  },
                }),
              },
            },
          ],
        }),
      });

    global.fetch = fetchMock;

    const fallbackTranscript =
      'Tutor relata febre alta e apatia desde ontem. No exame fisico temperatura 39.8. Diagnostico presuntivo infeccioso.';

    const result = await analyzeFieldConversation({
      audioBuffer: Buffer.from('fake-audio-buffer'),
      mimeType: 'audio/wav',
      filename: 'consulta.wav',
      segments: [],
      transcript: fallbackTranscript,
    });

    expect(result.transcript).toMatch(/febre alta/i);
    expect(result.transcript).not.toMatch(/^ruido teste$/i);
    expect(result.parsed.chiefComplaint).toMatch(/febre|apatia/i);
  });

  it('deve priorizar tratamento heuristico quando a sugestao da IA tiver baixa aderencia ao transcript', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Tutor relata diarreia e medico orienta hidratacao oral com dieta leve por 48 horas.',
          duration: 8.2,
          segments: [
            {
              start: 0,
              text: 'Tutor relata diarreia desde ontem e apatia.',
            },
            {
              start: 4,
              text: 'Medico orienta tratamento com hidratacao oral e dieta leve por 48 horas.',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  transcricao_organizada:
                    '[TUTOR]: Tutor relata diarreia desde ontem.\n[VETERINÁRIO]: Medico orienta conduta.',
                  identificacao: {},
                  anamnese: {
                    queixa_principal: 'Diarreia aguda',
                  },
                  exame_fisico: {
                    achados_relevantes: 'Nao informado na consulta',
                  },
                  avaliacao: {
                    diagnostico_presuntivo: 'Enteropatia em avaliacao',
                  },
                  plano: {
                    orientacoes_ao_tutor:
                      'Internacao imediata e cirurgia exploratoria de urgencia.',
                    medicacoes_prescritas: 'Nao informado na consulta',
                    retorno: 'Reavaliar em 48 horas',
                    exames_solicitados: 'Hemograma',
                  },
                }),
              },
            },
          ],
        }),
      });

    global.fetch = fetchMock;

    const result = await analyzeFieldConversation({
      audioBuffer: Buffer.from('fake-audio-buffer'),
      mimeType: 'audio/wav',
      filename: 'consulta.wav',
      segments: [],
      transcript: '',
    });

    expect(result.parsed.treatment).toMatch(
      /hidratacao|dieta leve|suporte hidrico|ajuste nutricional/i,
    );
    expect(result.parsed.treatment).not.toMatch(/cirurgia exploratoria/i);
  });

  it('deve estabilizar diagnostico e exame fisico com base no contexto clinico do transcript', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Bovino com dor abdominal, temperatura 39.8 e frequencia cardiaca elevada. Suspeita de reticuloperitonite traumatica.',
          duration: 7.6,
          segments: [
            {
              start: 0,
              text: 'Bovino com dor abdominal e motilidade reduzida.',
            },
            {
              start: 3,
              text: 'No exame fisico temperatura 39.8 e frequencia cardiaca alta.',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  transcricao_organizada:
                    '[TUTOR]: Dor abdominal.\n[VETERINÁRIO]: Exame fisico alterado.',
                  identificacao: {},
                  anamnese: {
                    queixa_principal: 'Dor abdominal',
                  },
                  exame_fisico: {
                    achados_relevantes: 'Sem alteracoes clinicas relevantes.',
                  },
                  avaliacao: {
                    diagnostico_presuntivo:
                      'Quadro inespecifico sem definicao.',
                  },
                  plano: {
                    orientacoes_ao_tutor: 'Monitorar',
                    medicacoes_prescritas: 'Conforme prescricao',
                    retorno: 'Reavaliar',
                    exames_solicitados: 'Hemograma',
                  },
                }),
              },
            },
          ],
        }),
      });

    global.fetch = fetchMock;

    const result = await analyzeFieldConversation({
      audioBuffer: Buffer.from('fake-audio-buffer'),
      mimeType: 'audio/wav',
      filename: 'consulta.wav',
      segments: [],
      transcript: '',
    });

    expect(result.parsed.diagnosis).toMatch(/reticuloperitonite|avaliacao/i);
    expect(result.parsed.physicalExam).toMatch(
      /exame fisico|frequencia|temperatura|semiolog/i,
    );
  });
});
