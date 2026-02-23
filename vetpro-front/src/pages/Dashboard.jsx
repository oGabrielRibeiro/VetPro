import React from "react";
import AppIcon from "../components/AppIcon";
import SpeciesIcon from "../components/SpeciesIcon";

const Dashboard = ({
  patients = [],
  consultations = [],
  appointments = [],
  onViewConsultations,
  onViewAppointments,
  onAddPatient,
  onNewConsultation,
  onOpenPatients,
  onOpenAppointments,
}) => {
  const totalPatients = patients.length;
  const totalConsultations = consultations.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.date);
    aptDate.setHours(0, 0, 0, 0);
    return aptDate.getTime() === today.getTime();
  }).length;

  const returnConsultations = consultations.filter((c) => c.template === "return").length;
  const returnRate = totalConsultations > 0 ? Math.round((returnConsultations / totalConsultations) * 100) : 0;

  const recentPatients = [...patients]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <button
          onClick={() => onAddPatient?.()}
          className="btn btn-success btn-lg btn-block !min-h-[52px] text-sm sm:text-base"
        >
          <div className="flex items-center justify-center space-x-2">
            <AppIcon name="plus" />
            <span>Novo Paciente</span>
          </div>
        </button>

        <button
          onClick={() => onNewConsultation?.()}
          className="btn btn-primary btn-lg btn-block !min-h-[52px] text-sm sm:text-base"
        >
          <div className="flex items-center justify-center space-x-2">
            <AppIcon name="consultations" />
            <span>Nova Consulta</span>
          </div>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Status do Sistema</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-blue-50 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-blue-700 mb-1 sm:mb-2">{totalPatients}</div>
            <div className="text-xs sm:text-sm text-blue-800 font-medium">Pacientes</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-purple-700 mb-1 sm:mb-2">{totalConsultations}</div>
            <div className="text-xs sm:text-sm text-purple-800 font-medium">Consultas</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-amber-700 mb-1 sm:mb-2">{todayAppointments}</div>
            <div className="text-xs sm:text-sm text-amber-800 font-medium">Hoje</div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-700 mb-1 sm:mb-2">{returnRate}%</div>
            <div className="text-xs sm:text-sm text-emerald-800 font-medium">Taxa de Retorno</div>
          </div>
        </div>
      </div>

      <div className="mb-6 sm:mb-8">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold text-gray-800">Pacientes Recentes</h2>
          <button onClick={() => onOpenPatients?.()} className="text-emerald-600 hover:text-emerald-700 font-medium text-xs sm:text-sm">
            Ver todos
          </button>
        </div>
        <div className="flex space-x-3 sm:space-x-4 overflow-x-auto pb-3 sm:pb-4 hide-scrollbar">
          {recentPatients.map((patient) => (
            <div
              key={patient.id}
              className="flex-shrink-0 w-48 sm:w-56 md:w-64 bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onViewConsultations(patient)}
            >
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <SpeciesIcon species={patient.species} subcategory={patient.subcategory} breed={patient.breed} className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-gray-800 truncate">{patient.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">{patient.ownerName}</p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                    {patient.species} {patient.subcategory && `- ${patient.subcategory}`}
                  </p>
                  <button className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                    Ver prontuario
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold text-gray-800">Consultas de Hoje</h2>
          <button
            onClick={() => onOpenAppointments?.() || onViewAppointments?.()}
            className="text-emerald-600 hover:text-emerald-700 font-medium text-xs sm:text-sm"
          >
            Ver agenda
          </button>
        </div>
        <div className="space-y-3">
          {appointments.filter((apt) => {
            const aptDate = new Date(apt.date);
            aptDate.setHours(0, 0, 0, 0);
            return aptDate.getTime() === today.getTime();
          }).length > 0 ? (
            appointments
              .filter((apt) => {
                const aptDate = new Date(apt.date);
                aptDate.setHours(0, 0, 0, 0);
                return aptDate.getTime() === today.getTime();
              })
              .map((appointment) => {
                const patient = patients.find((p) => p.id === appointment.patientId);
                if (!patient) return null;
                return (
                  <div key={appointment.id} className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:shadow-sm transition-shadow">
                    <div className="mb-2 sm:mb-0">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <SpeciesIcon species={patient.species} subcategory={patient.subcategory} breed={patient.breed} className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm sm:text-base text-gray-800">{patient.name}</h3>
                          <p className="text-xs sm:text-sm text-gray-600">{patient.ownerName}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-blue-600">{appointment.time}</p>
                      <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">{appointment.reason}</p>
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 sm:p-8 text-center">
              <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                <AppIcon name="appointments" />
              </div>
              <p className="text-xs sm:text-sm text-gray-500">Nenhuma consulta agendada para hoje</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 sm:hidden grid grid-cols-2 gap-2">
        <button
          onClick={() => onOpenPatients?.()}
          className="btn btn-info-soft btn-lg btn-block"
        >
          Pacientes
        </button>
        <button
          onClick={() => onOpenAppointments?.() || onViewAppointments?.()}
          className="btn btn-primary btn-lg btn-block"
        >
          Agenda
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
