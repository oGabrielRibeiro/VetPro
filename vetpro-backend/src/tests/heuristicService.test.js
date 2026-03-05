const {
  splitDialogueByRole,
  runUnifiedClinicalBrain,
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

    expect(unified.context?.tutorContent).toMatch(/nao quer comer|desde ontem/i);
    expect(unified.context?.medicoContent).toMatch(
      /exame fisico|diagnostico|tratamento/i,
    );
    expect(unified.parsed?.diagnosis).toMatch(/gastrite|diagnostico/i);
    expect(unified.parsed?.treatment).toMatch(/tratamento|fluidoterapia/i);
  });
});
