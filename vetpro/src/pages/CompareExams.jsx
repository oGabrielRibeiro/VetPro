import React from "react";
import ExamCompareSlider from "../components/ExamCompareSlider";

export default function CompareExams({ fileA, fileB, onBack }) {

  if (!fileA || !fileB) {
    return <p>Arquivos inválidos</p>;
  }

  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: "20px" }}>
        ← Voltar
      </button>

      <ExamCompareSlider fileA={fileA} fileB={fileB} />
    </div>
  );
}
