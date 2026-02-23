import React, { useState } from "react";
import AppIcon from "../components/AppIcon";
import SpeciesIcon from "../components/SpeciesIcon";

const Patients = ({ patients, onEditPatient, onAddPatient, onViewConsultations }) => {
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
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-3 sm:mb-0">Meus Pacientes</h1>

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 sm:space-x-3">
          <div className="relative flex-1 min-w-[180px] sm:min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar pacientes..."
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            />
            <div className="absolute left-2 top-2 sm:left-3 sm:top-2.5 text-gray-400">
              <AppIcon name="search" className="h-4 w-4" />
            </div>
          </div>

          <button
            onClick={onAddPatient}
            className="btn btn-success btn-md"
          >
            <span className="mr-1 sm:mr-2">
              <AppIcon name="plus" className="h-4 w-4" />
            </span>
            Novo Paciente
          </button>
        </div>
      </div>

      {filteredPatients.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-3 sm:p-4 md:p-5">
                <div className="flex items-start space-x-2 sm:space-x-3 md:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <SpeciesIcon species={patient.species} subcategory={patient.subcategory} breed={patient.breed} className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm sm:text-base md:text-lg text-gray-800 truncate">{patient.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{patient.ownerName}</p>
                    <div className="mt-1.5 sm:mt-2 flex flex-wrap gap-1.5">
                      <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] sm:text-xs">{patient.species}</span>
                      {patient.subcategory && (
                        <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-purple-50 text-purple-700 rounded-full text-[10px] sm:text-xs">
                          {patient.subcategory}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] sm:text-xs">{patient.age}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => onEditPatient(patient)}
                    className="btn btn-info-soft btn-sm btn-block"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onViewConsultations(patient)}
                    className="btn btn-primary btn-sm btn-block"
                  >
                    Prontuario
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 sm:py-12 bg-white rounded-xl border border-dashed border-gray-300 mt-4 sm:mt-6">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
            <AppIcon name="patients" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
            {searchQuery ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 max-w-md mx-auto px-2">
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
