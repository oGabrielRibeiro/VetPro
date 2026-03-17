const {
  resolveFieldAssistPrompt,
  getFieldAssistPromptChangelog,
} = require('../services/fieldAssistPromptRegistry');

describe('fieldAssistPromptRegistry', () => {
  it('deve resolver prompt ativo com versao e user prompt preenchido', () => {
    const resolved = resolveFieldAssistPrompt({
      combinedText: 'Tutor relata febre e apatia.',
    });

    expect(resolved.version).toMatch(/^field_assist_extraction_v/i);
    expect(resolved.systemPrompt).toMatch(/assistente clínico veterinário/i);
    expect(resolved.userPrompt).toMatch(/Tutor relata febre e apatia/i);
    expect(resolved.userPrompt).toMatch(/autoavaliacao/i);
    expect(resolved.fallbackApplied).toBe(false);
  });

  it('deve aplicar fallback quando versao solicitada nao existir', () => {
    const resolved = resolveFieldAssistPrompt({
      promptVersion: 'versao_inexistente',
      combinedText: 'Teste',
    });

    expect(resolved.version).toBe('field_assist_extraction_v1.0.0');
    expect(resolved.fallbackApplied).toBe(true);
  });

  it('deve expor changelog de versoes de prompt', () => {
    const changelog = getFieldAssistPromptChangelog();
    expect(Array.isArray(changelog)).toBe(true);
    expect(changelog.length).toBeGreaterThan(0);
    expect(changelog[0]).toHaveProperty('version');
    expect(changelog[0]).toHaveProperty('changes');
  });

  it('deve aplicar instrucoes por contexto clinico solicitado', () => {
    const resolved = resolveFieldAssistPrompt({
      contextMode: 'retorno',
      combinedText: 'Retorno com melhora parcial.',
    });
    expect(resolved.contextMode).toBe('retorno');
    expect(resolved.systemPrompt).toMatch(/CONTEXTO CLINICO: RETORNO/i);
    expect(resolved.userPrompt).toMatch(/Contexto desta consulta: retorno/i);
  });

  it('deve selecionar few-shots curados e expor ids de exemplos', () => {
    const resolved = resolveFieldAssistPrompt({
      contextMode: 'campo',
      combinedText:
        'Tutor relata sem febre em casa, mas no exame com febre e sinais em bovino.',
    });

    expect(Array.isArray(resolved.fewShotExamples)).toBe(true);
    expect(resolved.fewShotExamples.length).toBeGreaterThan(0);
    expect(resolved.systemPrompt).toMatch(/EXEMPLOS CURADOS/i);
    expect(resolved.fewShotExamples[0]).toHaveProperty('id');
  });
});
