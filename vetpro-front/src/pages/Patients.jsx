import React, { useEffect, useMemo, useState } from "react";
import AppIcon from "../components/AppIcon";
import FeedbackBanner from "../components/FeedbackBanner";
import SpeciesIcon from "../components/SpeciesIcon";
import useDebouncedValue from "../hooks/useDebouncedValue";

const Patients = ({
  patients,
  isLoading = false,
  errorMessage = "",
  onRetry,
  onEditPatient,
  onAddPatient,
  onViewConsultations,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, 250);

  const filteredPatients = useMemo(() => {
    const term = String(debouncedQuery || "").toLowerCase().trim();
    if (!term) return patients;
    return patients.filter(
      (patient) =>
        patient.name.toLowerCase().includes(term) ||
        patient.ownerName.toLowerCase().includes(term) ||
        patient.species.toLowerCase().includes(term) ||
        (patient.subcategory &&
          patient.subcategory.toLowerCase().includes(term)),
    );
  }, [patients, debouncedQuery]);
  const patientsProgressiveEnabled = filteredPatients.length > 30;
  const [visiblePatientsCount, setVisiblePatientsCount] = useState(24);
  const totalPatientsCount = filteredPatients.length;
  const visiblePatients = patientsProgressiveEnabled
    ? filteredPatients.slice(0, visiblePatientsCount)
    : filteredPatients;
  const hasMorePatients =
    patientsProgressiveEnabled && visiblePatientsCount < totalPatientsCount;

  useEffect(() => {
    setVisiblePatientsCount(24);
  }, [filteredPatients]);

  const loadMorePatients = () => {
    setVisiblePatientsCount((current) =>
      Math.min(current + 24, totalPatientsCount),
    );
  };
  const hasError = Boolean(String(errorMessage || "").trim());

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 subtle-enter">
      {onBack && (
        <div className="flex justify-end">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-dark-600 bg-white/70 dark:bg-dark-800/60 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300"
          >
            <AppIcon name="back" className="h-3.5 w-3.5" />
            Voltar
          </button>
        </div>
      )}

      <section className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-3 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="vp-overline">
              Cadastro clinico
            </p>
            <h1 className="vp-h1 mt-1">
              Pacientes
            </h1>
            <p className="vp-subtitle mt-1">
              Gerencie fichas com identificacao, tutor e acesso direto ao prontuario.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="relative min-w-[220px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, tutor ou especie"
                className="vp-input pl-10 pr-3"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">
                <AppIcon name="search" className="h-4 w-4" />
              </span>
            </div>
            <button onClick={onAddPatient} className="btn btn-success btn-md w-full sm:w-auto">
              <AppIcon name="plus" className="h-4 w-4" />
              Novo paciente
            </button>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <p className="vp-helper text-gray-500 dark:text-gray-400">
          {filteredPatients.length} resultado(s)
        </p>
        {!isLoading && filteredPatients.length > 0 && (
          <p className="vp-helper text-gray-500 dark:text-gray-400">
            Exibindo {visiblePatientsCount} de {totalPatientsCount}
          </p>
        )}
      </div>

      {hasError && (
        <FeedbackBanner
          type="error"
          message={errorMessage || "Falha ao carregar pacientes."}
          actionLabel="Recarregar"
          onAction={onRetry}
          className="subtle-fade"
        />
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 subtle-fade">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`patient-skeleton-${index}`}
              className="shell-surface rounded-2xl border border-gray-200/80 dark:border-dark-700/70 p-4 animate-pulse"
            >
              <div className="h-4 w-32 rounded bg-gray-200 dark:bg-dark-700" />
              <div className="mt-2 h-3 w-24 rounded bg-gray-200 dark:bg-dark-700" />
              <div className="mt-4 h-9 rounded bg-gray-200 dark:bg-dark-700" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredPatients.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 subtle-fade">
          {visiblePatients.map((patient) => (
            <div
              key={patient.id}
              className="shell-surface interactive-card rounded-2xl border border-gray-200/80 dark:border-dark-700/70 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-shrink-0">
                    <SpeciesIcon
                      species={patient.species}
                      subcategory={patient.subcategory}
                      breed={patient.breed}
                      className="h-6 w-6"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">
                      {patient.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {patient.ownerName}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-semibold uppercase tracking-wide">
                        {patient.species}
                      </span>
                      {patient.subcategory && (
                        <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-semibold uppercase tracking-wide">
                          {patient.subcategory}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-[10px] font-semibold uppercase tracking-wide">
                        {patient.age}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-700 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onEditPatient(patient)}
                    className="btn btn-info-soft btn-sm btn-block"
                  >
                    <AppIcon name="edit" className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => onViewConsultations(patient)}
                    className="btn btn-primary btn-sm btn-block"
                  >
                    <AppIcon name="consultations" className="h-3.5 w-3.5" />
                    Prontuario
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !isLoading ? (
        <div className="text-center py-10 shell-surface rounded-3xl border border-dashed border-gray-300 dark:border-dark-600 subtle-fade">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300">
            <AppIcon name="patients" />
          </div>
          <h3 className="vp-h2 text-gray-800 dark:text-white mb-2">
            {searchQuery ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
          </h3>
          <p className="vp-subtitle text-gray-500 dark:text-gray-400 mb-5 max-w-md mx-auto px-2">
            {searchQuery
              ? "Nenhum paciente corresponde a sua busca. Tente outros termos."
              : "Voce ainda nao cadastrou nenhum paciente. Comece adicionando seu primeiro paciente."}
          </p>
          <button
            onClick={onAddPatient}
            className="btn btn-success btn-lg"
          >
            Adicionar Paciente
          </button>
        </div>
      ) : null}

      {!isLoading && hasMorePatients && (
        <div className="flex justify-center pt-1 subtle-fade">
          <button onClick={loadMorePatients} className="btn btn-neutral btn-md">
            Carregar mais pacientes
          </button>
        </div>
      )}
    </div>
  );
};

export default Patients;
