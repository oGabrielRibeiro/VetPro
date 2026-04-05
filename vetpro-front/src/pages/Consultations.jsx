import React, { useEffect, useMemo, useState } from "react";
import { formatDateTimeBR } from "../utils";
import AppIcon from "../components/AppIcon";
import SpeciesIcon from "../components/SpeciesIcon";
import FeedbackBanner from "../components/FeedbackBanner";
import { VpButton } from "../components/ui";
import useDebouncedValue from "../hooks/useDebouncedValue";

const Consultations = ({
  consultations,
  patients,
  isLoading = false,
  errorMessage = "",
  onRetry,
  onNewConsultation,
  onViewPatientConsultations,
  onViewConsultation,
  onBack,
}) => {
  const [filterPatientId, setFilterPatientId] = useState("");
  const [filterDateRange, setFilterDateRange] = useState({ start: "", end: "" });
  const [filteredConsultations, setFilteredConsultations] = useState([]);
  const debouncedPatientId = useDebouncedValue(filterPatientId, 250);
  const debouncedDateRange = useDebouncedValue(filterDateRange, 250);

  useEffect(() => {
    let filtered = [...consultations];

    if (debouncedPatientId) {
      filtered = filtered.filter(
        (c) => String(c.patientId) === String(debouncedPatientId),
      );
    }

    if (debouncedDateRange?.start) {
      const startDate = new Date(debouncedDateRange.start);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((c) => {
        const consultDate = new Date(c.date || c.createdAt);
        consultDate.setHours(0, 0, 0, 0);
        return consultDate >= startDate;
      });
    }

    if (debouncedDateRange?.end) {
      const endDate = new Date(debouncedDateRange.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((c) => {
        const consultDate = new Date(c.date || c.createdAt);
        consultDate.setHours(0, 0, 0, 0);
        return consultDate <= endDate;
      });
    }

    filtered.sort(
      (a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt),
    );
    setFilteredConsultations(filtered);
  }, [consultations, debouncedPatientId, debouncedDateRange]);

  const getPatientById = (id) =>
    patients.find((p) => String(p.id) === String(id));

  const resetFilters = () => {
    setFilterPatientId("");
    setFilterDateRange({ start: "", end: "" });
  };

  const getTemplateLabel = (template) => {
    switch (template) {
      case "general":
      case "nova":
        return "Consulta geral";
      case "medicacao":
      case "prescription":
        return "Prescricao";
      case "return":
      case "retorno":
        return "Retorno";
      case "vaccination":
      case "vacinacao":
        return "Vacinacao";
      case "anestesia":
        return "Anestesia";
      case "procedimento":
        return "Procedimento";
      case "internacao":
        return "Internacao";
      default:
        return "Consulta";
    }
  };

  const templateTone = (template) => {
    if (template === "general" || template === "nova") {
      return "bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    }
    if (template === "return" || template === "retorno") {
      return "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    }
    if (template === "vaccination" || template === "vacinacao") {
      return "bg-violet-50 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300";
    }
    if (template === "anestesia") {
      return "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    }
    if (template === "medicacao" || template === "prescription") {
      return "bg-cyan-50 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300";
    }
    if (template === "procedimento") {
      return "bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
    }
    if (template === "internacao") {
      return "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    }
    return "bg-gray-100 text-gray-800 dark:bg-dark-700 dark:text-gray-200";
  };

  const viewConsultationPreview = (consultation) => {
    if (typeof onViewConsultation === "function") {
      onViewConsultation(consultation);
    }
  };

  const stats = useMemo(() => {
    const total = filteredConsultations.length;
    const uniquePatients = new Set(
      filteredConsultations.map((item) => String(item.patientId || "")),
    ).size;
    const returns = filteredConsultations.filter(
      (item) => item.template === "return" || item.consultationType === "retorno",
    ).length;
    const vaccinations = filteredConsultations.filter(
      (item) =>
        item.template === "vaccination" || item.consultationType === "vacinacao",
    ).length;
    const returnRate = total ? Math.round((returns / total) * 100) : 0;
    return { total, uniquePatients, returnRate, vaccinations };
  }, [filteredConsultations]);
  const hasError = Boolean(String(errorMessage || "").trim());

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 subtle-enter">
      {onBack && (
        <div className="flex justify-end">
          <VpButton
            onClick={onBack}
            variant="neutral"
            size="sm"
            icon={<AppIcon name="back" className="h-3.5 w-3.5" />}
            className="text-xs"
          >
            Voltar
          </VpButton>
        </div>
      )}

      <section className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-3 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="vp-overline">
              Prontuario central
            </p>
            <h1 className="vp-h1 mt-1">
              Consultas veterinarias
            </h1>
            <p className="vp-subtitle mt-1">
              Consulte historico, compare evolucao e abra rapidamente o atendimento.
            </p>
          </div>
          <VpButton
            onClick={onNewConsultation}
            variant="primary"
            size="lg"
            icon={<AppIcon name="plus" className="h-4 w-4" />}
            className="w-full sm:w-auto"
          >
            Nova consulta
          </VpButton>
        </div>
      </section>

      <section className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-3 sm:p-5 lg:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="vp-h2">
            Filtros
          </h2>
          <VpButton
            onClick={resetFilters}
            variant="neutral"
            size="sm"
            className="text-xs"
          >
            Limpar
          </VpButton>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label htmlFor="consultationFilterPatient" className="vp-label">
              Paciente
            </label>
            <select
              id="consultationFilterPatient"
              value={filterPatientId}
              onChange={(e) => setFilterPatientId(e.target.value)}
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
          <div>
            <label htmlFor="consultationFilterStartDate" className="vp-label">
              Data inicial
            </label>
            <input
              id="consultationFilterStartDate"
              type="date"
              value={filterDateRange.start}
              onChange={(e) =>
                setFilterDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
              className="vp-input"
            />
          </div>
          <div>
            <label htmlFor="consultationFilterEndDate" className="vp-label">
              Data final
            </label>
            <input
              id="consultationFilterEndDate"
              type="date"
              value={filterDateRange.end}
              onChange={(e) =>
                setFilterDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
              className="vp-input"
            />
          </div>
        </div>
      </section>

      {hasError && (
        <FeedbackBanner
          type="error"
          message={errorMessage || "Falha ao carregar consultas."}
          actionLabel="Recarregar"
          onAction={onRetry}
          className="subtle-fade"
        />
      )}

      {isLoading && (
        <section className="space-y-3 subtle-fade">
          {Array.from({ length: 4 }).map((_, index) => (
            <article
              key={`consultation-skeleton-${index}`}
              className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-4 animate-pulse"
            >
              <div className="h-4 w-44 rounded bg-gray-200 dark:bg-dark-700" />
              <div className="mt-2 h-3 w-56 rounded bg-gray-200 dark:bg-dark-700" />
              <div className="mt-4 h-9 rounded bg-gray-200 dark:bg-dark-700" />
            </article>
          ))}
        </section>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <article className="rounded-2xl border border-gray-200/80 dark:border-dark-700/70 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/25 dark:to-cyan-900/20 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-blue-700 dark:text-blue-300">
            Consultas
          </p>
          <p className="mt-2 text-2xl font-black text-blue-900 dark:text-blue-200">
            {stats.total}
          </p>
        </article>
        <article className="rounded-2xl border border-gray-200/80 dark:border-dark-700/70 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/25 dark:to-violet-900/20 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-indigo-700 dark:text-indigo-300">
            Pacientes unicos
          </p>
          <p className="mt-2 text-2xl font-black text-indigo-900 dark:text-indigo-200">
            {stats.uniquePatients}
          </p>
        </article>
        <article className="rounded-2xl border border-gray-200/80 dark:border-dark-700/70 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/25 dark:to-teal-900/20 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
            Taxa de retorno
          </p>
          <p className="mt-2 text-2xl font-black text-emerald-900 dark:text-emerald-200">
            {stats.returnRate}%
          </p>
        </article>
        <article className="rounded-2xl border border-gray-200/80 dark:border-dark-700/70 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/25 dark:to-orange-900/20 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-700 dark:text-amber-300">
            Vacinacoes
          </p>
          <p className="mt-2 text-2xl font-black text-amber-900 dark:text-amber-200">
            {stats.vaccinations}
          </p>
        </article>
      </section>

      {!isLoading && filteredConsultations.length > 0 ? (
        <section className="space-y-3 subtle-fade">
          {filteredConsultations.map((consultation) => {
            const patient = getPatientById(consultation.patientId);
            if (!patient) return null;

            return (
              <article
                key={consultation.id}
                className="shell-surface interactive-card rounded-3xl border border-gray-200/80 dark:border-dark-700/70 overflow-hidden"
              >
                <header className="border-b border-gray-200/80 dark:border-dark-700/70 px-4 py-3.5 bg-white/65 dark:bg-dark-900/45">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
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
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        {consultation.recordNumber || consultation.numeroProntuario}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTimeBR(consultation.date || consultation.createdAt)}
                      </p>
                    </div>
                  </div>
                </header>

                <div className="p-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${templateTone(consultation.template || consultation.consultationType)}`}
                    >
                      {getTemplateLabel(consultation.template || consultation.consultationType)}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      {patient.species}
                      {patient.subcategory ? ` - ${patient.subcategory}` : ""}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Queixa principal
                    </p>
                    <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                      {consultation.chiefComplaint || "Nao informado"}
                    </p>
                  </div>

                  {consultation.diagnosis && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Diagnostico
                      </p>
                      <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                        {consultation.diagnosis}
                      </p>
                    </div>
                  )}

                  <footer className="pt-3 border-t border-gray-200 dark:border-dark-700 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      <VpButton
                        onClick={() => viewConsultationPreview(consultation)}
                        variant="info"
                        size="sm"
                        className="min-h-[44px] sm:min-h-[40px]"
                      >
                        Visualizar prontuario
                      </VpButton>
                      <VpButton
                        onClick={() => onViewPatientConsultations(patient)}
                        variant="success"
                        size="sm"
                        className="min-h-[44px] sm:min-h-[40px]"
                      >
                        Ver historico
                      </VpButton>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {consultation.veterinarianName || "Veterinario nao informado"} · Atualizado em{" "}
                      {formatDateTimeBR(consultation.updatedAt || consultation.createdAt)}
                    </span>
                  </footer>
                </div>
              </article>
            );
          })}
        </section>
      ) : !isLoading ? (
        <section className="shell-surface rounded-3xl border border-dashed border-gray-300 dark:border-dark-600 p-8 text-center subtle-fade">
          <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300">
            <AppIcon name="consultations" />
          </span>
          <h3 className="vp-h2 text-gray-900 dark:text-white mb-2">
            {filterPatientId || filterDateRange.start || filterDateRange.end
              ? "Nenhuma consulta encontrada"
              : "Nenhuma consulta registrada"}
          </h3>
          <p className="vp-subtitle text-gray-500 dark:text-gray-400 mb-5 max-w-md mx-auto">
            {filterPatientId || filterDateRange.start || filterDateRange.end
              ? "Nenhuma consulta corresponde aos filtros selecionados. Ajuste os filtros e tente novamente."
              : "Voce ainda nao registrou nenhuma consulta. Comece com o primeiro atendimento."}
          </p>
          <VpButton onClick={onNewConsultation} variant="success" size="lg">
            Registrar primeira consulta
          </VpButton>
        </section>
      ) : null}
    </div>
  );
};

export default Consultations;
