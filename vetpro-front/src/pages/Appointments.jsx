import React, { useEffect, useMemo, useState } from "react";
import AppIcon from "../components/AppIcon";
import SpeciesIcon from "../components/SpeciesIcon";
import useDebouncedValue from "../hooks/useDebouncedValue";

const Appointments = ({
  appointments = [],
  patients = [],
  isLoading = false,
  errorMessage = "",
  onRetry,
  onNewAppointment,
  onEditAppointment,
  onDeleteAppointment,
  onBack,
}) => {
  const [filterDate, setFilterDate] = useState("");
  const [filterPatient, setFilterPatient] = useState("");
  const debouncedDate = useDebouncedValue(filterDate, 250);
  const debouncedPatient = useDebouncedValue(filterPatient, 250);

  const filteredAppointments = useMemo(
    () =>
      appointments.filter((appointment) => {
        const normalizedDate = appointment?.date
          ? String(appointment.date).split("T")[0]
          : "";
        const matchesDate = !debouncedDate || normalizedDate === debouncedDate;
        const matchesPatient =
          !debouncedPatient ||
          String(appointment.patientId) === String(debouncedPatient);
        return matchesDate && matchesPatient;
      }),
    [appointments, debouncedDate, debouncedPatient],
  );
  const appointmentsProgressiveEnabled = filteredAppointments.length > 24;
  const [visibleAppointmentsCount, setVisibleAppointmentsCount] = useState(18);
  const totalAppointmentsCount = filteredAppointments.length;
  const visibleAppointments = appointmentsProgressiveEnabled
    ? filteredAppointments.slice(0, visibleAppointmentsCount)
    : filteredAppointments;
  const hasMoreAppointments =
    appointmentsProgressiveEnabled &&
    visibleAppointmentsCount < totalAppointmentsCount;

  useEffect(() => {
    setVisibleAppointmentsCount(18);
  }, [filteredAppointments]);

  const loadMoreAppointments = () => {
    setVisibleAppointmentsCount((current) =>
      Math.min(current + 18, totalAppointmentsCount),
    );
  };

  const getPatientById = (id) =>
    patients.find((p) => String(p.id) === String(id));

  const formatAppointmentWhen = (appointment) => {
    if (!appointment?.date) return "Em aberto";
    const parsed = new Date(appointment.date);
    if (Number.isNaN(parsed.getTime())) return "Em aberto";
    const dateBR = parsed.toLocaleDateString("pt-BR");
    return appointment.time ? `${dateBR} - ${appointment.time}` : dateBR;
  };

  const todayCount = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return appointments.filter((item) => {
      if (!item?.date) return false;
      const d = new Date(item.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === now.getTime();
    }).length;
  }, [appointments]);
  const hasError = Boolean(String(errorMessage || "").trim());

  return (
    <div className="vp-page subtle-enter">
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <p className="vp-overline">
              Agenda clinica
            </p>
            <h1 className="vp-h1 mt-1">
              Consultas agendadas
            </h1>
            <p className="vp-subtitle mt-1">
              Organize visitas, priorize retornos e mantenha o dia sob controle no celular.
            </p>
            <button
              onClick={onNewAppointment}
              className="btn btn-success btn-lg mt-4 w-full sm:w-auto"
            >
              <AppIcon name="plus" className="h-4 w-4" />
              Nova consulta
            </button>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/25 dark:to-teal-900/20 p-4">
            <p className="vp-overline text-emerald-700 dark:text-emerald-300">
              Hoje
            </p>
            <p className="mt-2 text-4xl font-black text-emerald-900 dark:text-emerald-200">
              {todayCount}
            </p>
            <p className="vp-helper mt-1 text-emerald-800 dark:text-emerald-300">
              consulta(s) no dia
            </p>
          </div>
        </div>
      </section>

      <section className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-3 sm:p-5 lg:p-6">
        <h2 className="vp-h2 mb-3">
          Filtros
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label htmlFor="appointmentFilterDate" className="vp-label">
              Data
            </label>
            <input
              id="appointmentFilterDate"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="vp-input"
            />
          </div>

          <div>
            <label htmlFor="appointmentFilterPatient" className="vp-label">
              Paciente
            </label>
            <select
              id="appointmentFilterPatient"
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
              className="vp-input"
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
              className="btn btn-neutral btn-md btn-block"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </section>

      {hasError && (
        <section className="shell-surface rounded-2xl border border-red-300 bg-red-50 p-4 subtle-fade">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-red-800">
              {errorMessage || "Falha ao carregar agendamentos."}
            </p>
            <button type="button" onClick={onRetry} className="btn btn-danger-soft btn-md">
              Recarregar
            </button>
          </div>
        </section>
      )}

      {isLoading && (
        <section className="space-y-3 subtle-fade">
          {Array.from({ length: 4 }).map((_, index) => (
            <article
              key={`appointment-skeleton-${index}`}
              className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-4 animate-pulse"
            >
              <div className="h-4 w-40 rounded bg-gray-200 dark:bg-dark-700" />
              <div className="mt-2 h-3 w-52 rounded bg-gray-200 dark:bg-dark-700" />
              <div className="mt-4 h-9 rounded bg-gray-200 dark:bg-dark-700" />
            </article>
          ))}
        </section>
      )}

      {!isLoading && filteredAppointments.length > 0 ? (
        <section className="space-y-3 subtle-fade">
          <p className="vp-helper text-gray-500 dark:text-gray-400">
            Exibindo {visibleAppointmentsCount} de {totalAppointmentsCount} agendamentos
          </p>
          {visibleAppointments.map((appointment) => {
            const patient = getPatientById(appointment.patientId);
            if (!patient) return null;

            return (
              <article
                key={appointment.id}
                className="shell-surface interactive-card rounded-3xl border border-gray-200/80 dark:border-dark-700/70 overflow-hidden"
              >
                <header className="border-b border-gray-200/80 dark:border-dark-700/70 px-4 py-3 bg-white/65 dark:bg-dark-900/45">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                        <SpeciesIcon
                          species={patient.species}
                          subcategory={patient.subcategory}
                          breed={patient.breed}
                          className="h-5 w-5"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-gray-900 dark:text-white truncate">
                          {patient.name}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                          {patient.ownerName}
                        </span>
                      </span>
                    </div>
                    <span className="text-right">
                      <span className="block text-sm font-bold text-blue-700 dark:text-blue-300">
                        {formatAppointmentWhen(appointment)}
                      </span>
                    </span>
                  </div>
                </header>

                <div className="p-4 space-y-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {appointment.reason || "Sem motivo informado"}
                  </p>
                  {appointment.status === "possivel-retorno" && (
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      Possivel retorno (sem data definida)
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {patient.species}
                    {patient.subcategory ? ` - ${patient.subcategory}` : ""}
                    {patient.breed ? ` | ${patient.breed}` : ""}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-gray-200 dark:border-dark-700">
                    <button
                      onClick={() =>
                        onEditAppointment && onEditAppointment(appointment)
                      }
                      className="btn btn-neutral btn-md btn-block"
                    >
                      <AppIcon name="edit" className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() =>
                        onDeleteAppointment && onDeleteAppointment(appointment.id)
                      }
                      className="btn btn-danger-soft btn-md btn-block"
                    >
                      <AppIcon name="delete" className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                    <button className="btn btn-info-soft btn-md btn-block">
                      <AppIcon name="confirm" className="h-3.5 w-3.5" />
                      Confirmar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : !isLoading ? (
        <section className="shell-surface rounded-3xl border border-dashed border-gray-300 dark:border-dark-600 p-8 sm:p-10 text-center subtle-fade">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300">
            <AppIcon name="appointments" />
          </div>
          <h3 className="vp-h2 text-gray-900 dark:text-white mb-2">
            {filterDate || filterPatient
              ? "Nenhuma consulta encontrada"
              : "Nenhuma consulta agendada"}
          </h3>
          <p className="vp-subtitle text-gray-500 dark:text-gray-400 mb-5 max-w-md mx-auto">
            {filterDate || filterPatient
              ? "Nenhuma consulta corresponde aos filtros selecionados."
              : "Voce ainda nao tem consultas agendadas. Comece com a primeira."}
          </p>
          <button onClick={onNewAppointment} className="btn btn-success btn-lg">
            Agendar primeira consulta
          </button>
        </section>
      ) : null}

      {!isLoading && hasMoreAppointments && (
        <div className="flex justify-center pt-1 subtle-fade">
          <button onClick={loadMoreAppointments} className="btn btn-neutral btn-md">
            Carregar mais agendamentos
          </button>
        </div>
      )}
    </div>
  );
};

export default Appointments;
