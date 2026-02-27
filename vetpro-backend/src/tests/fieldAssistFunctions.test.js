const {
  parseClinicalFieldsFromSegments,
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
});
