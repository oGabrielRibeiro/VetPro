import React, { useState } from "react";
import AppIcon from "../components/AppIcon";
import SpeciesIcon from "../components/SpeciesIcon";

const Appointments = ({ appointments = [], patients = [], onNewAppointment, onEditAppointment, onDeleteAppointment }) => {
  const [filterDate, setFilterDate] = useState("");
  const [filterPatient, setFilterPatient] = useState("");

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesDate = !filterDate || appointment.date === filterDate;
    const matchesPatient = !filterPatient || String(appointment.patientId) === String(filterPatient);
    return matchesDate && matchesPatient;
  });

  const getPatientById = (id) => patients.find((p) => String(p.id) === String(id));

  const formatAppointmentWhen = (appointment) => {
    if (!appointment?.date) return "Em aberto";
    const parsed = new Date(appointment.date);
    if (Number.isNaN(parsed.getTime())) return "Em aberto";
    const dateBR = parsed.toLocaleDateString("pt-BR");
    return appointment.time ? `${dateBR} - ${appointment.time}` : dateBR;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Agenda de Consultas</h1>
        <button
          onClick={onNewAppointment}
          className="mt-4 sm:mt-0 min-h-[46px] bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-2 px-4 sm:py-2.5 sm:px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center text-sm sm:text-base"
        >
          <span className="mr-2"><AppIcon name="plus" className="h-4 w-4" /></span>
          Nova Consulta
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Filtrar Agendamentos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Data</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Paciente</label>
            <select
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            >
              <option value="">Todos os pacientes</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} - {patient.ownerName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterDate("");
                setFilterPatient("");
              }}
              className="w-full bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {filteredAppointments.length > 0 ? (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => {
            const patient = getPatientById(appointment.patientId);
            if (!patient) return null;

            return (
              <div key={appointment.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center">
                  <div className="mb-2 sm:mb-0">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                        <SpeciesIcon species={patient.species} subcategory={patient.subcategory} className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base sm:text-lg text-gray-800">{patient.name}</h2>
                        <p className="text-xs sm:text-sm text-gray-600">{patient.ownerName}</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-lg text-blue-700">{formatAppointmentWhen(appointment)}</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">{appointment.reason}</p>
                    {appointment.status === "possivel-retorno" && (
                      <p className="text-[11px] sm:text-xs text-amber-700 mt-1 font-semibold">Possivel retorno (sem data definida)</p>
                    )}
                  </div>
                </div>

                <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center">
                  <div className="mb-3 sm:mb-0">
                    <p className="text-sm text-gray-600"><span className="font-medium">Especie:</span> {patient.species} {patient.subcategory && `- ${patient.subcategory}`}</p>
                    <p className="text-sm text-gray-600"><span className="font-medium">Raca:</span> {patient.breed}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                    <button onClick={() => onEditAppointment && onEditAppointment(appointment)} className="min-h-[40px] px-2 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm">Editar</button>
                    <button onClick={() => onDeleteAppointment && onDeleteAppointment(appointment.id)} className="min-h-[40px] px-2 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs sm:text-sm">Excluir</button>
                    <button className="min-h-[40px] px-2 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-xs sm:text-sm">Confirmar</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 sm:p-12 text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-700"><AppIcon name="appointments" /></div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">{filterDate || filterPatient ? "Nenhuma consulta encontrada" : "Nenhuma consulta agendada"}</h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 max-w-md mx-auto">
            {filterDate || filterPatient
              ? "Nenhuma consulta corresponde aos filtros selecionados. Tente outros criterios."
              : "Voce ainda nao tem consultas agendadas. Comece agendando sua primeira consulta."}
          </p>
          <button onClick={onNewAppointment} className="bg-emerald-600 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-xl shadow-md hover:shadow-lg transition-all text-xs sm:text-sm">Agendar Primeira Consulta</button>
        </div>
      )}
    </div>
  );
};

export default Appointments;
