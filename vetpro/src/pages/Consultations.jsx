import React, { useEffect, useState } from "react";
import { formatDateTimeBR } from "../utils";
import AppIcon from "../components/AppIcon";
import SpeciesIcon from "../components/SpeciesIcon";

const Consultations = ({ consultations, patients, onNewConsultation, onViewPatientConsultations }) => {
  const [filterPatientId, setFilterPatientId] = useState("");
  const [filterDateRange, setFilterDateRange] = useState({ start: "", end: "" });
  const [filteredConsultations, setFilteredConsultations] = useState([]);

  useEffect(() => {
    let filtered = [...consultations];

    if (filterPatientId) {
      filtered = filtered.filter((c) => String(c.patientId) === String(filterPatientId));
    }

    if (filterDateRange.start) {
      const startDate = new Date(filterDateRange.start);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((c) => {
        const consultDate = new Date(c.date || c.createdAt);
        consultDate.setHours(0, 0, 0, 0);
        return consultDate >= startDate;
      });
    }

    if (filterDateRange.end) {
      const endDate = new Date(filterDateRange.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((c) => {
        const consultDate = new Date(c.date || c.createdAt);
        consultDate.setHours(0, 0, 0, 0);
        return consultDate <= endDate;
      });
    }

    filtered.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    setFilteredConsultations(filtered);
  }, [consultations, filterPatientId, filterDateRange]);

  const getPatientById = (id) => patients.find((p) => String(p.id) === String(id));

  const resetFilters = () => {
    setFilterPatientId("");
    setFilterDateRange({ start: "", end: "" });
  };

  const getTemplateLabel = (template) => {
    switch (template) {
      case "general":
      case "nova":
        return "Consulta Geral";
      case "return":
      case "retorno":
        return "Retorno";
      case "vaccination":
        return "Vacinacao";
      default:
        return "Consulta";
    }
  };

  const viewConsultationPreview = (consultation) => {
    window.dispatchEvent(new CustomEvent("preview-consultation", { detail: consultation }));
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Prontuarios Veterinarios</h1>
          <p className="text-gray-600 text-sm mt-1">Historico completo de atendimentos e evolucoes clinicas</p>
        </div>
        <button
          onClick={onNewConsultation}
          className="mt-4 sm:mt-0 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center text-xs sm:text-sm"
        >
          <span className="mr-2"><AppIcon name="plus" className="h-4 w-4" /></span>
          Nova Consulta
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Filtrar Consultas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Paciente</label>
            <select
              value={filterPatientId}
              onChange={(e) => setFilterPatientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            >
              <option value="">Todos os pacientes</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.name} - {patient.ownerName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
            <input
              type="date"
              value={filterDateRange.start}
              onChange={(e) => setFilterDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Data Final</label>
            <input
              type="date"
              value={filterDateRange.end}
              onChange={(e) => setFilterDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end space-x-3">
          <button onClick={resetFilters} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium">Limpar Filtros</button>
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">Aplicar Filtros</button>
        </div>
      </div>

      {filteredConsultations.length > 0 ? (
        <div className="space-y-4">
          {filteredConsultations.map((consultation) => {
            const patient = getPatientById(consultation.patientId);
            if (!patient) return null;
            return (
              <div key={consultation.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center">
                  <div className="mb-2 sm:mb-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                        <SpeciesIcon species={patient.species} subcategory={patient.subcategory} className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{patient.name}</h3>
                        <p className="text-xs text-gray-600">{patient.ownerName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-emerald-700">{consultation.recordNumber || consultation.numeroProntuario}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{formatDateTimeBR(consultation.date || consultation.createdAt)}</p>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      consultation.template === "general"
                        ? "bg-blue-100 text-blue-800"
                        : consultation.template === "return"
                          ? "bg-emerald-100 text-emerald-800"
                          : consultation.template === "vaccination"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-800"
                    }`}>
                      {getTemplateLabel(consultation.template)}
                    </span>
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">{patient.species}{patient.subcategory ? ` - ${patient.subcategory}` : ""}</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-800 text-sm mb-1">Queixa Principal</h4>
                    <p className="text-gray-700 text-sm">{consultation.chiefComplaint || "Nao informado"}</p>
                  </div>

                  {consultation.diagnosis && (
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm mb-1">Diagnostico</h4>
                      <p className="text-gray-700 text-sm">{consultation.diagnosis}</p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                    <div className="flex space-x-2">
                      <button onClick={() => viewConsultationPreview(consultation)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Visualizar Prontuario</button>
                      <button
                        onClick={() => onViewPatientConsultations(patient)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center"
                      >
                        <span className="mr-1"><AppIcon name="consultations" className="h-3.5 w-3.5" /></span>
                        <span>Ver Historico</span>
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">Dr(a). {consultation.veterinarianName}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 sm:p-12 text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-700"><AppIcon name="consultations" /></div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
            {filterPatientId || filterDateRange.start || filterDateRange.end ? "Nenhuma consulta encontrada" : "Nenhuma consulta registrada"}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 max-w-md mx-auto">
            {filterPatientId || filterDateRange.start || filterDateRange.end
              ? "Nenhuma consulta corresponde aos filtros selecionados. Tente ajustar os filtros."
              : "Voce ainda nao registrou nenhuma consulta. Comece registrando a primeira consulta do seu paciente."}
          </p>
          <button onClick={onNewConsultation} className="bg-emerald-600 text-white font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-xl shadow-md hover:shadow-lg transition-all text-xs sm:text-sm">Registrar Primeira Consulta</button>
        </div>
      )}

      <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Estatisticas do Periodo</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-blue-700 mb-1 sm:mb-2">{filteredConsultations.length}</div>
            <div className="text-xs sm:text-sm text-blue-800 font-medium">Consultas</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-purple-700 mb-1 sm:mb-2">{new Set(filteredConsultations.map((c) => c.patientId)).size}</div>
            <div className="text-xs sm:text-sm text-purple-800 font-medium">Pacientes Unicos</div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-700 mb-1 sm:mb-2">{Math.round((filteredConsultations.filter((c) => c.template === "return" || c.consultationType === "retorno").length / (filteredConsultations.length || 1)) * 100)}%</div>
            <div className="text-xs sm:text-sm text-emerald-800 font-medium">Taxa de Retorno</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-amber-700 mb-1 sm:mb-2">{filteredConsultations.filter((c) => c.template === "vaccination" || c.consultationType === "vacinacao").length}</div>
            <div className="text-xs sm:text-sm text-amber-800 font-medium">Vacinacoes</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Consultations;
