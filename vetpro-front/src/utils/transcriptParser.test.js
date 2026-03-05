import {
  detectSpeakerFromText,
  normalizeSpeakerLabel,
  splitDialogueByRole,
  stripSpeakerMarkers,
} from "./transcriptParser";

describe("transcriptParser", () => {
  it("normaliza aliases de speaker para Medico", () => {
    expect(normalizeSpeakerLabel("Vet")).toBe("Medico");
    expect(normalizeSpeakerLabel("Médico")).toBe("Medico");
    expect(normalizeSpeakerLabel("Doutora")).toBe("Medico");
    expect(normalizeSpeakerLabel("Tutor")).toBe("Tutor");
  });

  it("detecta speaker explicito com timestamp e hifen", () => {
    expect(detectSpeakerFromText("[00:12] Tutor - Ele nao come hoje.")).toBe(
      "Tutor",
    );
    expect(detectSpeakerFromText("[00:25] Vet - No exame fisico, dor local.")).toBe(
      "Medico",
    );
  });

  it("separa dialogo por role com formatos mistos", () => {
    const parsed = splitDialogueByRole(
      [
        "Tutor: Ele esta apatico e sem apetite.",
        "Vet - No exame fisico, temperatura 39.5.",
        "Medico | Diagnostico de gastroenterite.",
      ].join("\n"),
    );

    expect(parsed.tutorText).toMatch(/apatico|apetite/i);
    expect(parsed.vetText).toMatch(/exame fisico|diagnostico/i);
    expect(parsed.turns.some((turn) => turn.role === "Tutor")).toBe(true);
    expect(parsed.turns.some((turn) => turn.role === "Medico")).toBe(true);
  });

  it("remove marcadores de speaker e timestamp", () => {
    const cleaned = stripSpeakerMarkers(
      "[00:03] Tutor: Ele vomitou. [00:08] Vet - Prescrevi antiemético.",
    );
    expect(cleaned).toMatch(/Ele vomitou/i);
    expect(cleaned).toMatch(/Prescrevi antiemético/i);
    expect(cleaned).not.toMatch(/\[00:03\]|Tutor:|Vet -/i);
  });
});
