import React from "react";
import ExamCompareSlider from "../components/ExamCompareSlider";

export default function CompareExams({ fileA, fileB, onBack }) {
  if (!fileA || !fileB) {
    return (
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-3 sm:py-4">
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm font-medium text-red-700 dark:text-red-300">
          Arquivos invalidos para comparacao.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4 subtle-enter">
      <section className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-3 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
              Comparacao
            </p>
            <h1 className="shell-title text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
              Exames lado a lado
            </h1>
          </div>
          <button
            onClick={onBack}
            className="inline-flex min-h-[40px] items-center rounded-xl border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
          >
            &larr; Voltar
          </button>
        </div>
      </section>

      <div className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-2 sm:p-4">
        <ExamCompareSlider fileA={fileA} fileB={fileB} />
      </div>
    </div>
  );
}
