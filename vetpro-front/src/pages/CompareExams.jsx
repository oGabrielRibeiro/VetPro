import React from "react";
import ExamCompareSlider from "../components/ExamCompareSlider";

export default function CompareExams({ fileA, fileB, onBack }) {
  if (!fileA || !fileB) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          Arquivos invalidos para comparacao.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
      <button
        onClick={onBack}
        className="inline-flex min-h-[44px] items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        &larr; Voltar
      </button>

      <div className="rounded-2xl border border-gray-200 bg-white p-2 sm:p-4 shadow-sm">
        <ExamCompareSlider fileA={fileA} fileB={fileB} />
      </div>
    </div>
  );
}
