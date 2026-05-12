import React, { useEffect, useMemo, useState } from "react";
import AppIcon from "../components/AppIcon";
import SpeciesIcon from "../components/SpeciesIcon";

const Dashboard = ({
  patients = [],
  consultations = [],
  appointments = [],
  isLoading = false,
  errorMessage = "",
  onRetry,
  onViewConsultations,
  onViewAppointments,
  onAddPatient,
  onNewConsultation,
  onOpenPatients,
  onOpenAppointments,
}) => {
  const [workspacePrefs, setWorkspacePrefs] = useState(() => {
    try {
      const raw = localStorage.getItem("vetpro_dashboard_workspace");
      if (!raw) {
        return {
          mode: "executive",
          highlightMetric: "today",
          showTips: true,
        };
      }
      const parsed = JSON.parse(raw);
      return {
        mode: parsed.mode || "executive",
        highlightMetric: parsed.highlightMetric || "today",
        showTips: parsed.showTips !== false,
      };
    } catch {
      return {
        mode: "executive",
        highlightMetric: "today",
        showTips: true,
      };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "vetpro_dashboard_workspace",
        JSON.stringify(workspacePrefs),
      );
    } catch {
      // ignore storage issues
    }
  }, [workspacePrefs]);

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

  const consultationsLast7Days = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return consultations.filter((consultation) => {
      const date = new Date(consultation.date || consultation.createdAt);
      return !Number.isNaN(date.getTime()) && date >= cutoff;
    }).length;
  }, [consultations]);

  const newPatientsLast30Days = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return patients.filter((patient) => {
      const date = new Date(patient.createdAt);
      return !Number.isNaN(date.getTime()) && date >= cutoff;
    }).length;
  }, [patients]);

  const patientsWithoutRecentConsultation = useMemo(() => {
    const latestByPatient = new Map();
    consultations.forEach((consultation) => {
      const patientId = String(consultation.patientId || "");
      const date = new Date(consultation.date || consultation.createdAt);
      if (!patientId || Number.isNaN(date.getTime())) return;
      const prev = latestByPatient.get(patientId);
      if (!prev || date > prev) latestByPatient.set(patientId, date);
    });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    return patients.filter((patient) => {
      const last = latestByPatient.get(String(patient.id));
      if (!last) return true;
      return last < cutoff;
    }).length;
  }, [consultations, patients]);

  const recentPatients = useMemo(
    () =>
      [...patients]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),
    [patients],
  );

  const stats = [
    {
      key: "patients",
      label: "Pacientes ativos",
      value: totalPatients,
      tone: "from-blue-50 to-cyan-50 text-blue-800",
      icon: "patients",
    },
    {
      key: "consultations",
      label: "Consultas totais",
      value: totalConsultations,
      tone: "from-indigo-50 to-violet-50 text-indigo-800",
      icon: "consultations",
    },
    {
      key: "today",
      label: "Atendimentos hoje",
      value: todayAppointments,
      tone: "from-amber-50 to-orange-50 text-amber-800",
      icon: "appointments",
    },
    {
      key: "returnRate",
      label: "Taxa de retorno",
      value: `${returnRate}%`,
      tone: "from-emerald-50 to-teal-50 text-emerald-800",
      icon: "reports",
    },
  ];
  const highlightedStat =
    stats.find((item) => item.key === workspacePrefs.highlightMetric) ||
    stats[0];

  const handleOpenMetric = (metricKey) => {
    if (metricKey === "today") {
      onOpenAppointments?.() || onViewAppointments?.();
      return;
    }
    if (metricKey === "patients") {
      onOpenPatients?.();
      return;
    }
    if (metricKey === "consultations" || metricKey === "returnRate") {
      onNewConsultation?.();
    }
  };

  const metricCtaByKey = {
    today: "Abrir agenda",
    patients: "Abrir pacientes",
    consultations: "Nova consulta",
    returnRate: "Revisar retornos",
  };

  const hasError = Boolean(String(errorMessage || "").trim());

  return (
    <div className="vp-page subtle-enter">
      <section className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-3 sm:p-5 lg:p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="vp-overline">
              Command Center
            </p>
            <h1 className="vp-h1 mt-1">
              Operacao clinica em tempo real
            </h1>
            <p className="vp-subtitle mt-2">
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
          <div className="space-y-3">
            <div className="rounded-2xl border border-teal-200/70 dark:border-teal-800/50 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-teal-900/30 dark:via-cyan-900/20 dark:to-blue-900/20 p-4">
              <p className="vp-overline text-teal-700 dark:text-teal-300">
                Destaque do workspace
              </p>
              <p className="mt-2 text-3xl font-black text-teal-900 dark:text-teal-200">
                {highlightedStat?.value}
              </p>
              <p className="vp-helper mt-1 text-teal-800 dark:text-teal-300">
                {highlightedStat?.label}
              </p>
              <button
                type="button"
                onClick={() => handleOpenMetric(highlightedStat?.key)}
                className="mt-4 w-full rounded-xl border border-teal-300/70 dark:border-teal-700 bg-white/80 dark:bg-dark-800/80 px-3 py-2 text-xs font-semibold text-teal-800 dark:text-teal-300"
              >
                {metricCtaByKey[highlightedStat?.key] || "Ver detalhes"}
              </button>
            </div>
            <div className="rounded-2xl border border-gray-200/80 dark:border-dark-700/70 bg-white/70 dark:bg-dark-900/55 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="vp-overline">Workspace</p>
                <AppIcon name="settings" className="h-4 w-4 text-gray-500 dark:text-gray-300" />
              </div>
              <label className="vp-label mt-3">Modo do painel</label>
              <select
                value={workspacePrefs.mode}
                onChange={(event) =>
                  setWorkspacePrefs((prev) => ({
                    ...prev,
                    mode: event.target.value,
                  }))
                }
                className="vp-input"
              >
                <option value="executive">Executivo</option>
                <option value="compact">Compacto</option>
              </select>
              <label className="vp-label mt-3">Destaque principal</label>
              <select
                value={workspacePrefs.highlightMetric}
                onChange={(event) =>
                  setWorkspacePrefs((prev) => ({
                    ...prev,
                    highlightMetric: event.target.value,
                  }))
                }
                className="vp-input"
              >
                <option value="today">Atendimentos hoje</option>
                <option value="patients">Pacientes ativos</option>
                <option value="consultations">Consultas totais</option>
                <option value="returnRate">Taxa de retorno</option>
              </select>
              <label className="mt-3 inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={workspacePrefs.showTips}
                  onChange={(event) =>
                    setWorkspacePrefs((prev) => ({
                      ...prev,
                      showTips: event.target.checked,
                    }))
                  }
                />
                Exibir recomendacoes operacionais
              </label>
              <button
                type="button"
                onClick={() =>
                  setWorkspacePrefs({
                    mode: "executive",
                    highlightMetric: "today",
                    showTips: true,
                  })
                }
                className="mt-3 w-full rounded-xl border border-gray-300 dark:border-dark-600 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200"
              >
                Restaurar padrao
              </button>
            </div>
          </div>
        </div>
      </section>

      {hasError && (
        <section className="shell-surface rounded-2xl border border-red-300 bg-red-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-red-800">
              {errorMessage || "Falha ao carregar dados do dashboard."}
            </p>
            <button type="button" onClick={onRetry} className="btn btn-danger-soft btn-md">
              Tentar novamente
            </button>
          </div>
        </section>
      )}

      {isLoading && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <article
              key={`dashboard-skeleton-${index}`}
              className="rounded-2xl border border-gray-200/80 dark:border-dark-700/70 bg-white/70 dark:bg-dark-800/50 p-3.5 animate-pulse"
            >
              <div className="h-3 w-24 rounded bg-gray-200 dark:bg-dark-700" />
              <div className="mt-3 h-7 w-14 rounded bg-gray-200 dark:bg-dark-700" />
            </article>
          ))}
        </section>
      )}

      {!isLoading && (
        <section
          className={`grid gap-3 ${
            workspacePrefs.mode === "compact"
              ? "grid-cols-2 xl:grid-cols-4"
              : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
          }`}
        >
          {stats.map((item) => (
            <article
              key={item.label}
              className={`rounded-2xl border bg-gradient-to-br ${item.tone} p-3.5 ${
                workspacePrefs.highlightMetric === item.key
                  ? "border-teal-400/70 shadow-lg shadow-teal-500/10"
                  : "border-gray-200/80 dark:border-dark-700/70"
              }`}
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
      )}

      {!isLoading && (
        <section className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="vp-overline">Painel executivo</p>
              <h2 className="vp-h2 mt-1">Sinais da operacao</h2>
              <p className="vp-subtitle mt-1">
                Resumo de tendencia para decidir prioridades da semana.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <article className="rounded-2xl border border-blue-200/70 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-900/20 p-4">
              <p className="vp-overline text-blue-700 dark:text-blue-300">Ultimos 7 dias</p>
              <p className="mt-2 text-3xl font-black text-blue-900 dark:text-blue-200">
                {consultationsLast7Days}
              </p>
              <p className="vp-helper mt-1 text-blue-800 dark:text-blue-300">consultas registradas</p>
            </article>
            <article className="rounded-2xl border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-900/20 p-4">
              <p className="vp-overline text-emerald-700 dark:text-emerald-300">Novos pacientes (30d)</p>
              <p className="mt-2 text-3xl font-black text-emerald-900 dark:text-emerald-200">
                {newPatientsLast30Days}
              </p>
              <p className="vp-helper mt-1 text-emerald-800 dark:text-emerald-300">crescimento de base ativa</p>
            </article>
            <article className="rounded-2xl border border-amber-200/70 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-900/20 p-4">
              <p className="vp-overline text-amber-700 dark:text-amber-300">Sem revisao (+90d)</p>
              <p className="mt-2 text-3xl font-black text-amber-900 dark:text-amber-200">
                {patientsWithoutRecentConsultation}
              </p>
              <p className="vp-helper mt-1 text-amber-800 dark:text-amber-300">pacientes para contato ativo</p>
            </article>
          </div>
          {workspacePrefs.showTips && (
            <div className="mt-4 rounded-2xl border border-dashed border-teal-300/70 dark:border-teal-700/60 bg-teal-50/70 dark:bg-teal-900/15 p-3">
              <p className="text-xs font-semibold text-teal-800 dark:text-teal-200">
                Sugestao automatica: priorize follow-up dos pacientes sem revisao e reserve blocos de agenda para retornos.
              </p>
            </div>
          )}
        </section>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="vp-h2">
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
            {isLoading && (
              <div className="rounded-2xl border border-gray-200 dark:border-dark-700 bg-white/70 dark:bg-dark-800/60 p-4 animate-pulse">
                <div className="h-3 w-32 rounded bg-gray-200 dark:bg-dark-700" />
                <div className="mt-2 h-3 w-24 rounded bg-gray-200 dark:bg-dark-700" />
              </div>
            )}
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
            {!isLoading && !recentPatients.length && (
              <div className="rounded-2xl border border-dashed border-gray-300 dark:border-dark-600 p-5 text-center">
                <span className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300">
                  <AppIcon name="patients" />
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Nenhum paciente recente.
                </p>
                <button
                  type="button"
                  onClick={() => onAddPatient?.()}
                  className="btn btn-success btn-md mt-3"
                >
                  Cadastrar primeiro paciente
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="vp-h2">
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
            {isLoading ? (
              <div className="rounded-2xl border border-gray-200 dark:border-dark-700 bg-white/70 dark:bg-dark-800/60 p-4 animate-pulse">
                <div className="h-3 w-36 rounded bg-gray-200 dark:bg-dark-700" />
                <div className="mt-2 h-3 w-28 rounded bg-gray-200 dark:bg-dark-700" />
              </div>
            ) : todayAppointmentList.length > 0 ? (
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
                <button
                  type="button"
                  onClick={() => onOpenAppointments?.() || onViewAppointments?.()}
                  className="btn btn-primary btn-md mt-3"
                >
                  Ir para agenda
                </button>
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
