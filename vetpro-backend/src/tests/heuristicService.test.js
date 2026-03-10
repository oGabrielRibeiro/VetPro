const {
  splitDialogueByRole,
  runUnifiedClinicalBrain,
  buildHeuristicDraft,
  SPECIFIC_FIELDS_BY_PORTE,
} = require('../services/heuristicService');

describe('heuristicService', () => {
  it('deve separar dialogo por role com prefixos explicitos variados', () => {
    const text = [
      'Tutor: Ele esta tossindo desde ontem e ficou apatico.',
      'Vet - No exame fisico: temperatura 39.6 e secrecao nasal.',
      'Medico | Diagnostico: traqueite. Conduta: nebulizacao e retorno em 48h.',
    ].join('\n');

    const result = splitDialogueByRole(text);

    expect(result.tutorText).toMatch(/tossindo|apatico/i);
    expect(result.vetText).toMatch(/exame fisico|diagnostico|conduta/i);
    expect(result.turns.some((turn) => turn.role === 'Tutor')).toBe(true);
    expect(result.turns.some((turn) => turn.role === 'Medico')).toBe(true);
  });

  it('deve manter contexto tutor/medico ao processar mensagens com timestamp e hifen', () => {
    const unified = runUnifiedClinicalBrain([
      {
        role: 'user',
        content: [
          '[00:02] Tutor - Ele nao quer comer desde ontem.',
          '[00:16] Vet - No exame fisico: dor abdominal e desidratacao leve.',
          '[00:29] Vet - Diagnostico presuntivo de gastrite e tratamento com fluidoterapia.',
        ].join('\n'),
      },
    ]);

    expect(unified.context?.tutorContent).toMatch(
      /nao quer comer|desde ontem/i,
    );
    expect(unified.context?.medicoContent).toMatch(
      /exame fisico|diagnostico|tratamento/i,
    );
    expect(unified.parsed?.diagnosis).toMatch(/gastrite|diagnostico/i);
    expect(unified.parsed?.treatment).toMatch(/tratamento|fluidoterapia/i);
  });

  it('deve evitar sobrepreenchimento de ficha de grande porte com frase repetida sem semantica', () => {
    const result = buildHeuristicDraft(
      [
        {
          role: 'user',
          content: [
            'Tutor: Certo, Ricardo, ele ta com febre alta, 39.',
            'Vet: Diagnostico presuntivo de processo infeccioso.',
            'Tutor: Finalidade zootecnica: esporte.',
            'Tutor: Lote: lote 7.',
          ].join('\n'),
        },
      ],
      'nova',
      { species: 'Equino', porte: 'grande' },
      { porte: 'grande', specificFieldKeys: SPECIFIC_FIELDS_BY_PORTE.grande },
    );

    const specific = result?.draft?.specificFields || {};

    expect(specific.animalFunction).toMatch(/esporte/i);
    expect(specific.batch).toMatch(/lote 7/i);
    expect(specific.productionSystem).toBe('');
    expect(specific.herdVaccination).toBe('');
    expect(specific.forage).toBe('');

    const repeatedPhraseCount = Object.values(specific).filter((value) =>
      /certo,\s*ricardo,\s*ele ta com febre alta/i.test(String(value || '')),
    ).length;
    expect(repeatedPhraseCount).toBe(0);
  });

  it('deve preencher campos especificos de grande porte quando houver evidencia explicita no texto', () => {
    const result = buildHeuristicDraft(
      [
        {
          role: 'user',
          content: [
            'Tutor: Propriedade: Haras Santo Antonio.',
            'Tutor: Sistema de producao: semi-intensivo.',
            'Tutor: Vacinacao do rebanho: em dia.',
            'Tutor: Vermifugacao do rebanho: ivermectina ha 60 dias.',
            'Tutor: Volumoso: silagem de milho.',
            'Tutor: Consumo de agua: reduzido nas ultimas 24 horas.',
          ].join('\n'),
        },
      ],
      'nova',
      { species: 'Equino', porte: 'grande' },
      { porte: 'grande', specificFieldKeys: SPECIFIC_FIELDS_BY_PORTE.grande },
    );

    const specific = result?.draft?.specificFields || {};

    expect(specific.farmName).toMatch(/haras|santo antonio/i);
    expect(specific.productionSystem).toMatch(/semi-intensivo/i);
    expect(specific.herdVaccination).toMatch(/em dia/i);
    expect(specific.herdDeworming).toMatch(/ivermectina|60 dias/i);
    expect(specific.forage).toMatch(/silagem/i);
    expect(specific.waterIntake).toMatch(/reduzido|24 horas/i);
  });
});
