import React, { useMemo } from "react";
import {
  filterConsultationsByDate,
  formatDateBR,
  generateMonthlyData,
} from "../utils";
import AppIcon from "../components/AppIcon";
import { VpButton } from "../components/ui";

const EmptyState = ({ icon, text }) => (
  <div className="vp-card vp-card--dashed p-5 text-center">
    <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300">
      <AppIcon name={icon} />
    </div>
    <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
  </div>
);

const ReportsSkeleton = () => (
  <div className="space-y-4">
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <article
          key={`report-stat-skeleton-${index}`}
          className="vp-card vp-card--flat p-3.5 animate-pulse"
        >
          <div className="h-3 w-20 rounded bg-gray-200 dark:bg-dark-700" />
          <div className="mt-3 h-7 w-12 rounded bg-gray-200 dark:bg-dark-700" />
        </article>
      ))}
    </section>
    <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`report-panel-skeleton-${index}`}
          className="vp-card vp-card--flat p-4 animate-pulse space-y-3"
        >
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-dark-700" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((__, rowIndex) => (
              <div key={`report-row-${index}-${rowIndex}`} className="h-3 w-full rounded bg-gray-200 dark:bg-dark-700" />
            ))}
          </div>
        </div>
      ))}
    </section>
  </div>
);

const ProgressList = ({ items = [], valueKey = "value", emptyText }) => {
  const total = items.reduce((sum, item) => sum + Number(item[valueKey] || 0), 0);
  if (!items.length || total === 0) {
    return <EmptyState icon="reports" text={emptyText} />;
  }

  return (
    <div className="space-y-2.5">
      {items.map((item, index) => {
        const value = Number(item[valueKey] || 0);
        const percent = total > 0 ? Math.round((value / total) * 100) : 0;
        const color = index % 3 === 0 ? "bg-emerald-500" : index % 3 === 1 ? "bg-blue-500" : "bg-violet-500";
        return (
          <div
            key={`${item.name || item.month || index}-${index}`}
            className="rounded-xl border border-gray-200 dark:border-dark-700 bg-white/80 dark:bg-dark-800/70 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {item.name || item.month}
              </p>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {value} ({percent}%)
              </p>
            </div>
            <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-dark-700 overflow-hidden">
              <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Reports = ({
  consultations,
  patients,
  dateRange,
  onDateRangeChange,
  onResetDateRange,
  onBack,
  isLoading = false,
  errorMessage = "",
  onRetry,
}) => {
  const reportResult = useMemo(() => {
    try {
      if (!consultations.length) {
        return {
          reportData: {
            monthlyConsultations: [],
            speciesDistribution: [],
            templateDistribution: [],
          },
          generationError: "",
        };
      }

      const filteredConsultations = filterConsultationsByDate(
        consultations,
        dateRange.startDate,
        dateRange.endDate,
      );

      const monthlyData = generateMonthlyData(
        dateRange.startDate,
        dateRange.endDate,
      );
      filteredConsultations.forEach((consultation) => {
        const consultDate = new Date(consultation.date || consultation.createdAt);
        const monthKey = consultDate.toLocaleString("pt-BR", {
          month: "short",
          year: "numeric",
        });
        if (monthlyData[monthKey] !== undefined) monthlyData[monthKey] += 1;
      });

      const monthlyConsultations = Object.entries(monthlyData).map(
        ([month, count]) => ({
          month,
          consultas: count,
        }),
      );

      const speciesCount = {};
      filteredConsultations.forEach((consultation) => {
        const patient = patients.find((p) => p.id === consultation.patientId);
        if (!patient) return;
        speciesCount[patient.species] = (speciesCount[patient.species] || 0) + 1;
      });
      const speciesDistribution = Object.entries(speciesCount).map(
        ([name, value]) => ({
          name,
          value,
        }),
      );

      const templateCount = {
        "Consulta Geral": 0,
        Retorno: 0,
        Vacinacao: 0,
      };
      filteredConsultations.forEach((consultation) => {
        const kind = consultation.template || consultation.consultationType;
        switch (kind) {
          case "general":
          case "nova":
            templateCount["Consulta Geral"] += 1;
            break;
          case "return":
          case "retorno":
            templateCount.Retorno += 1;
            break;
          case "vaccination":
          case "vacinacao":
            templateCount.Vacinacao += 1;
            break;
          default:
            templateCount["Consulta Geral"] += 1;
            break;
        }
      });

      const templateDistribution = Object.entries(templateCount).map(
        ([name, value]) => ({
          name,
          value,
        }),
      );

      return {
        reportData: {
          monthlyConsultations,
          speciesDistribution,
          templateDistribution,
        },
        generationError: "",
      };
    } catch (err) {
      console.error("Erro ao gerar relatorios:", err);
      return {
        reportData: {
          monthlyConsultations: [],
          speciesDistribution: [],
          templateDistribution: [],
        },
        generationError:
          "Nao foi possivel gerar os relatorios. Revise o periodo ou restaure o intervalo padrao e tente novamente.",
      };
    }
  }, [consultations, patients, dateRange]);

  const reportData = reportResult.reportData;
  const resolvedError = errorMessage || reportResult.generationError;

  const filteredConsultations = useMemo(
    () =>
      filterConsultationsByDate(
        consultations,
        dateRange.startDate,
        dateRange.endDate,
      ),
    [consultations, dateRange],
  );

  const stats = useMemo(() => {
    const totalConsultations = filteredConsultations.length;
    const uniquePatients = new Set(
      filteredConsultations.map((c) => c.patientId),
    ).size;
    const returnConsultations = filteredConsultations.filter(
      (c) => c.template === "return" || c.consultationType === "retorno",
    ).length;
    const returnRate =
      totalConsultations > 0
        ? Math.round((returnConsultations / totalConsultations) * 100)
        : 0;
    const vaccinationConsultations = filteredConsultations.filter(
      (c) => c.template === "vaccination" || c.consultationType === "vacinacao",
    ).length;

    return {
      totalConsultations,
      uniquePatients,
      returnRate,
      vaccinationConsultations,
    };
  }, [filteredConsultations]);

  return (
    <div className="vp-page subtle-enter">
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="vp-overline">
              Inteligencia de Negocio
            </p>
            <h1 className="vp-h1 mt-1">
              Relatorios e desempenho
            </h1>
            <p className="vp-subtitle mt-1">
              Analise o periodo, acompanhe retorno e identifique tendencias clinicas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full lg:w-auto">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => onDateRangeChange("startDate", e.target.value)}
              className="vp-input-field text-sm h-11 sm:h-10"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => onDateRangeChange("endDate", e.target.value)}
              className="vp-input-field text-sm h-11 sm:h-10"
            />
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <VpButton onClick={onResetDateRange} variant="neutral" size="sm">
            Restaurar padrao
          </VpButton>
        </div>
      </section>

      {resolvedError && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300 subtle-fade">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{resolvedError}</span>
            {onRetry && (
              <VpButton type="button" onClick={onRetry} variant="danger" size="sm">
                Tentar novamente
              </VpButton>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <ReportsSkeleton />
      ) : (
        <div className="space-y-4 subtle-fade">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <article className="rounded-2xl border border-gray-200/80 dark:border-dark-700/70 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/25 dark:to-teal-900/20 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                Consultas
              </p>
              <p className="mt-2 text-2xl font-black text-emerald-900 dark:text-emerald-200">
                {stats.totalConsultations}
              </p>
            </article>
            <article className="rounded-2xl border border-gray-200/80 dark:border-dark-700/70 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/25 dark:to-cyan-900/20 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-blue-700 dark:text-blue-300">
                Pacientes unicos
              </p>
              <p className="mt-2 text-2xl font-black text-blue-900 dark:text-blue-200">
                {stats.uniquePatients}
              </p>
            </article>
            <article className="rounded-2xl border border-gray-200/80 dark:border-dark-700/70 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/25 dark:to-orange-900/20 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-700 dark:text-amber-300">
                Taxa retorno
              </p>
              <p className="mt-2 text-2xl font-black text-amber-900 dark:text-amber-200">
                {stats.returnRate}%
              </p>
            </article>
            <article className="rounded-2xl border border-gray-200/80 dark:border-dark-700/70 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/25 dark:to-indigo-900/20 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-700 dark:text-violet-300">
                Vacinacoes
              </p>
              <p className="mt-2 text-2xl font-black text-violet-900 dark:text-violet-200">
                {stats.vaccinationConsultations}
              </p>
            </article>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Consultas por mes
                </h2>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {formatDateBR(dateRange.startDate)} a {formatDateBR(dateRange.endDate)}
                </span>
              </div>
              <ProgressList
                items={reportData.monthlyConsultations.map((item) => ({
                  ...item,
                  value: item.consultas,
                  name: item.month,
                }))}
                valueKey="value"
                emptyText="Sem dados no periodo selecionado."
              />
            </div>

            <div className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-4">
              <h2 className="mb-3 text-base font-bold text-gray-900 dark:text-white">
                Distribuicao por especie
              </h2>
              <ProgressList
                items={reportData.speciesDistribution}
                valueKey="value"
                emptyText="Nenhuma especie registrada no periodo."
              />
            </div>

            <div className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-4">
              <h2 className="mb-3 text-base font-bold text-gray-900 dark:text-white">
                Tipo de consulta
              </h2>
              <ProgressList
                items={reportData.templateDistribution}
                valueKey="value"
                emptyText="Sem consultas classificadas para este periodo."
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default Reports;
