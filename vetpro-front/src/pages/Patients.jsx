import React, { useState } from "react";
import AppIcon from "../components/AppIcon";
import SpeciesIcon from "../components/SpeciesIcon";

const Patients = ({
  patients,
  onEditPatient,
  onAddPatient,
  onViewConsultations,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (patient.subcategory &&
        patient.subcategory.toLowerCase().includes(searchQuery.toLowerCase())),
  );

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
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
              Cadastro clinico
            </p>
            <h1 className="shell-title mt-1 text-xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              Pacientes
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
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
                className="h-11 sm:h-10 w-full rounded-xl border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 pl-10 pr-3 text-sm"
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
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {filteredPatients.length} resultado(s)
        </p>
      </div>

      {filteredPatients.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredPatients.map((patient) => (
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
      ) : (
        <div className="text-center py-10 shell-surface rounded-3xl border border-dashed border-gray-300 dark:border-dark-600">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300">
            <AppIcon name="patients" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-2">
            {searchQuery ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-md mx-auto px-2">
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
      )}
    </div>
  );
};

export default Patients;
