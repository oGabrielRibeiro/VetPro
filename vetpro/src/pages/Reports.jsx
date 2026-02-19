import React, { useEffect, useState } from "react";
import { filterConsultationsByDate, formatDateBR, generateMonthlyData } from "../utils";
import AppIcon from "../components/AppIcon";

const EmptyCell = ({ icon, text, tone = "gray" }) => {
  const toneMap = {
    gray: "bg-gray-100 text-gray-700",
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    indigo: "bg-indigo-100 text-indigo-700",
  };

  return (
    <div className="py-3 text-center text-gray-500">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${toneMap[tone] || toneMap.gray}`}>
        <AppIcon name={icon} />
      </div>
      <p>{text}</p>
    </div>
  );
};

const MetricCard = ({ icon, title, value, caption, className }) => (
  <div className={className}>
    <div className="mb-1 sm:mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
      <AppIcon name={icon} />
    </div>
    <h3 className="text-xs sm:text-sm font-medium opacity-90">{title}</h3>
    <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">{value}</p>
    <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs opacity-80">{caption}</p>
  </div>
);

const Reports = ({ consultations, patients, dateRange, onDateRangeChange, onResetDateRange }) => {
  const [reportData, setReportData] = useState({
    monthlyConsultations: [],
    speciesDistribution: [],
    templateDistribution: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (consultations.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const filteredConsultations = filterConsultationsByDate(
        consultations,
        dateRange.startDate,
        dateRange.endDate,
      );

      const monthlyData = generateMonthlyData(dateRange.startDate, dateRange.endDate);
      filteredConsultations.forEach((consultation) => {
        const consultDate = new Date(consultation.date);
        const monthKey = consultDate.toLocaleString("pt-BR", {
          month: "short",
          year: "numeric",
        });
        if (monthlyData[monthKey] !== undefined) monthlyData[monthKey] += 1;
      });

      const monthlyConsultations = Object.entries(monthlyData).map(([month, count]) => ({
        month,
        consultas: count,
      }));

      const speciesCount = {};
      filteredConsultations.forEach((consultation) => {
        const patient = patients.find((p) => p.id === consultation.patientId);
        if (!patient) return;
        speciesCount[patient.species] = (speciesCount[patient.species] || 0) + 1;
      });
      const speciesDistribution = Object.entries(speciesCount).map(([name, value]) => ({
        name,
        value,
      }));

      const templateCount = {
        "Consulta Geral": 0,
        Retorno: 0,
        "Vacinacao": 0,
      };
      filteredConsultations.forEach((consultation) => {
        switch (consultation.template) {
          case "general":
            templateCount["Consulta Geral"] += 1;
            break;
          case "return":
            templateCount.Retorno += 1;
            break;
          case "vaccination":
            templateCount["Vacinacao"] += 1;
            break;
          default:
            templateCount["Consulta Geral"] += 1;
            break;
        }
      });

      const templateDistribution = Object.entries(templateCount).map(([name, value]) => ({
        name,
        value,
      }));

      setReportData({
        monthlyConsultations,
        speciesDistribution,
        templateDistribution,
      });
    } catch (err) {
      console.error("Erro ao gerar relatorios:", err);
      setError("Erro ao gerar relatorios. Verifique o periodo selecionado e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [consultations, patients, dateRange]);

  const filteredConsultations = filterConsultationsByDate(
    consultations,
    dateRange.startDate,
    dateRange.endDate,
  );

  const totalConsultations = filteredConsultations.length;
  const uniquePatients = new Set(filteredConsultations.map((c) => c.patientId)).size;
  const returnConsultations = filteredConsultations.filter((c) => c.template === "return").length;
  const returnRate = totalConsultations > 0 ? Math.round((returnConsultations / totalConsultations) * 100) : 0;
  const vaccinationConsultations = filteredConsultations.filter((c) => c.template === "vaccination").length;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Relatorios e Estatisticas</h1>

        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Periodo:</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => onDateRangeChange("startDate", e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm"
              />
              <span className="text-gray-500">ate</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => onDateRangeChange("endDate", e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm"
              />
            </div>
          </div>
          <button
            onClick={onResetDateRange}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-1.5 px-3 rounded text-xs sm:text-sm transition-colors"
          >
            Restaurar padrao
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando relatorios...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-base sm:text-xl font-bold text-gray-800">Consultas por Mes</h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {formatDateBR(dateRange.startDate)} ate {formatDateBR(dateRange.endDate)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consultas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">%</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.monthlyConsultations.length > 0 ? (
                    reportData.monthlyConsultations.map((item, index) => {
                      const total = reportData.monthlyConsultations.reduce((sum, curr) => sum + curr.consultas, 0);
                      const percentage = total > 0 ? Math.round((item.consultas / total) * 100) : 0;
                      return (
                        <tr key={item.month} className={index % 2 === 0 ? "bg-emerald-50" : "bg-white"}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.month}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                              </div>
                              <span>{item.consultas}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{percentage}%</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                        <EmptyCell icon="reports" text="Nenhum dado de consultas para o periodo selecionado" tone="emerald" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
            <h2 className="text-base sm:text-xl font-bold text-gray-800 mb-4">Distribuicao por Especie</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especie</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consultas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">%</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.speciesDistribution.length > 0 ? (
                    reportData.speciesDistribution.map((item, index) => {
                      const total = reportData.speciesDistribution.reduce((sum, curr) => sum + curr.value, 0);
                      const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                      return (
                        <tr key={item.name} className={index % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                              </div>
                              <span>{item.value}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{percentage}%</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                        <EmptyCell icon="patients" text="Nenhuma consulta registrada para analise" tone="blue" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
            <h2 className="text-base sm:text-xl font-bold text-gray-800 mb-4">Distribuicao por Tipo de Consulta</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Consulta</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consultas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">%</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.templateDistribution.length > 0 ? (
                    reportData.templateDistribution.map((item, index) => {
                      const total = reportData.templateDistribution.reduce((sum, curr) => sum + curr.value, 0);
                      const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                      return (
                        <tr key={item.name} className={index % 2 === 0 ? "bg-purple-50" : "bg-white"}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                <div
                                  className={`h-2.5 rounded-full ${index === 0 ? "bg-emerald-600" : index === 1 ? "bg-blue-600" : "bg-purple-600"}`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span>{item.value}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{percentage}%</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                        <EmptyCell icon="consultations" text="Nenhum dado de tipo de consulta para o periodo selecionado" tone="indigo" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon="reports"
              title="Total de Consultas"
              value={totalConsultations}
              caption="Periodo selecionado"
              className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 sm:p-5 text-white"
            />
            <MetricCard
              icon="patients"
              title="Pacientes Atendidos"
              value={uniquePatients}
              caption="Pacientes unicos"
              className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-4 sm:p-5 text-white"
            />
            <MetricCard
              icon="refresh"
              title="Taxa de Retorno"
              value={`${returnRate}%`}
              caption="Consultas de retorno"
              className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 sm:p-5 text-white"
            />
            <MetricCard
              icon="vaccine"
              title="Consultas de Vacinacao"
              value={vaccinationConsultations}
              caption="Vacinacoes realizadas"
              className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-4 sm:p-5 text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
