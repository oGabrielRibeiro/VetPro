import React, { useMemo } from "react";
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

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const todayAppointmentList = useMemo(
    () =>
      appointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() === today.getTime();
      }),
    [appointments, today],
  );

  const todayAppointments = todayAppointmentList.length;

  const returnRate = useMemo(() => {
    const returnConsultations = consultations.filter(
      (consultation) => consultation.template === "return",
    ).length;
    return totalConsultations > 0
      ? Math.round((returnConsultations / totalConsultations) * 100)
      : 0;
  }, [consultations, totalConsultations]);

  const recentPatients = useMemo(
    () =>
      [...patients]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),
    [patients],
  );

  const stats = [
    {
      label: "Pacientes ativos",
      value: totalPatients,
      tone: "from-blue-50 to-cyan-50 text-blue-800",
      icon: "patients",
    },
    {
      label: "Consultas totais",
      value: totalConsultations,
      tone: "from-indigo-50 to-violet-50 text-indigo-800",
      icon: "consultations",
    },
    {
      label: "Atendimentos hoje",
      value: todayAppointments,
      tone: "from-amber-50 to-orange-50 text-amber-800",
      icon: "appointments",
    },
    {
      label: "Taxa de retorno",
      value: `${returnRate}%`,
      tone: "from-emerald-50 to-teal-50 text-emerald-800",
      icon: "reports",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 subtle-enter">
      <section className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-3 sm:p-5 lg:p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
              Command Center
            </p>
            <h1 className="shell-title mt-1 text-xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              Operacao clinica em tempo real
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Acompanhe indicadores, abra prontuarios e inicie atendimento de campo com menos toques.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => onAddPatient?.()}
                className="btn btn-success btn-lg w-full sm:w-auto"
              >
                <AppIcon name="plus" />
                Novo paciente
              </button>
              <button
                onClick={() => onNewConsultation?.()}
                className="btn btn-primary btn-lg w-full sm:w-auto"
              >
                <AppIcon name="consultations" />
                Nova consulta
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-teal-200/70 dark:border-teal-800/50 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-teal-900/30 dark:via-cyan-900/20 dark:to-blue-900/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700 dark:text-teal-300">
              Hoje
            </p>
            <p className="mt-2 text-3xl font-black text-teal-900 dark:text-teal-200">
              {todayAppointments}
            </p>
            <p className="mt-1 text-xs text-teal-800 dark:text-teal-300">
              agendamento(s) no dia
            </p>
            <button
              type="button"
              onClick={() => onOpenAppointments?.() || onViewAppointments?.()}
              className="mt-4 w-full rounded-xl border border-teal-300/70 dark:border-teal-700 bg-white/80 dark:bg-dark-800/80 px-3 py-2 text-xs font-semibold text-teal-800 dark:text-teal-300"
            >
              Abrir agenda
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((item) => (
          <article
            key={item.label}
            className={`rounded-2xl border border-gray-200/80 dark:border-dark-700/70 bg-gradient-to-br ${item.tone} p-3.5`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] opacity-80">
                {item.label}
              </p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-gray-700 dark:bg-dark-800 dark:text-gray-200">
                <AppIcon name={item.icon} />
              </span>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Pacientes recentes
            </h2>
            <button
              onClick={() => onOpenPatients?.()}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-300"
            >
              Ver todos
            </button>
          </div>
          <div className="space-y-2.5">
            {recentPatients.map((patient) => (
              <button
                key={patient.id}
                type="button"
                className="interactive-card w-full rounded-2xl border border-gray-200 dark:border-dark-700 bg-white/80 dark:bg-dark-800/70 p-3 text-left hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors"
                onClick={() => onViewConsultations(patient)}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                    <SpeciesIcon
                      species={patient.species}
                      subcategory={patient.subcategory}
                      breed={patient.breed}
                      className="h-5 w-5"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {patient.name}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                      {patient.ownerName}
                    </span>
                  </span>
                </div>
              </button>
            ))}
            {!recentPatients.length && (
              <div className="rounded-2xl border border-dashed border-gray-300 dark:border-dark-600 p-5 text-center text-sm text-gray-500 dark:text-gray-400">
                Nenhum paciente recente.
              </div>
            )}
          </div>
        </div>
        <div className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Agenda de hoje
            </h2>
            <button
              onClick={() => onOpenAppointments?.() || onViewAppointments?.()}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-300"
            >
              Ver agenda
            </button>
          </div>
          <div className="space-y-2.5">
            {todayAppointmentList.length > 0 ? (
              todayAppointmentList.map((appointment) => {
                const patient = patients.find(
                  (p) => String(p.id) === String(appointment.patientId),
                );
                if (!patient) return null;
                return (
                  <article
                    key={appointment.id}
                    className="interactive-card rounded-2xl border border-gray-200 dark:border-dark-700 bg-white/80 dark:bg-dark-800/70 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {patient.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {patient.ownerName}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                        {appointment.time || "--:--"}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                      {appointment.reason || "Sem motivo informado"}
                    </p>
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 dark:border-dark-600 p-6 text-center">
                <span className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300">
                  <AppIcon name="appointments" />
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Nenhuma consulta agendada para hoje.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mt-1 sm:hidden grid grid-cols-2 gap-2">
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
