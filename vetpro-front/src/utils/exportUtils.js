import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/**
 * Exporta dados para Excel
 * @param {Array} data - Array de objetos para exportar
 * @param {string} filename - Nome do arquivo (sem extensão)
 * @param {Array} columns - Array de colunas { key, label }
 */
export async function exportToExcel(data, filename, columns) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VetPro";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Dados");

  // Adicionar cabeçalho
  const headerRow = worksheet.addRow(columns.map((col) => col.label));
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  // Adicionar dados
  data.forEach((row) => {
    const rowData = columns.map((col) => row[col.key]);
    worksheet.addRow(rowData);
  });

  // Ajustar largura das colunas
  columns.forEach((col, index) => {
    worksheet.getColumn(index + 1).width = Math.max(col.label.length, 15);
  });

  // Gerar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, `${filename}.xlsx`);
}

/**
 * Exporta dados para CSV
 * @param {Array} data - Array de objetos para exportar
 * @param {string} filename - Nome do arquivo (sem extensão)
 * @param {Array} columns - Array de colunas { key, label }
 */
export function exportToCSV(data, filename, columns) {
  // Formatar dados
  const formattedData = data.map((row) => {
    const formatted = {};
    columns.forEach((col) => {
      formatted[col.label] = row[col.key];
    });
    return formatted;
  });

  // Criar conteúdo CSV
  const headers = columns.map((col) => col.label).join(",");
  const rows = formattedData.map((row) =>
    columns
      .map((col) => {
        const value = row[col.label] || "";
        // Escapar vírgulas e aspas
        const stringValue = String(value);
        if (
          stringValue.includes(",") ||
          stringValue.includes('"') ||
          stringValue.includes("\n")
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(","),
  );

  const csv = [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `${filename}.csv`);
}

/**
 * Exporta pacientes para Excel
 */
export function exportPatients(patients) {
  const columns = [
    { key: "name", label: "Nome" },
    { key: "specie", label: "Espécie" },
    { key: "breed", label: "Raça" },
    { key: "sex", label: "Sexo" },
    { key: "age", label: "Idade" },
    { key: "ownerName", label: "Tutor" },
    { key: "ownerPhone", label: "Telefone" },
    { key: "status", label: "Status" },
    { key: "createdAt", label: "Data Cadastro" },
  ];

  const formattedPatients = patients.map((p) => ({
    ...p,
    createdAt: p.createdAt
      ? new Date(p.createdAt).toLocaleDateString("pt-BR")
      : "",
  }));

  exportToExcel(formattedPatients, `pacientes_${Date.now()}`, columns);
}

/**
 * Exporta consultas para Excel
 */
export function exportConsultations(consultations) {
  const columns = [
    { key: "numeroProntuario", label: "Nº Prontuário" },
    { key: "patientName", label: "Paciente" },
    { key: "consultationType", label: "Tipo" },
    { key: "chiefComplaint", label: "Motivo" },
    { key: "diagnosis", label: "Diagnóstico" },
    { key: "treatment", label: "Tratamento" },
    { key: "createdAt", label: "Data" },
  ];

  const formatted = consultations.map((c) => ({
    ...c,
    createdAt: c.createdAt
      ? new Date(c.createdAt).toLocaleDateString("pt-BR")
      : "",
  }));

  exportToExcel(formatted, `consultas_${Date.now()}`, columns);
}

/**
 * Exporta agendamentos para Excel
 */
export function exportAppointments(appointments) {
  const columns = [
    { key: "date", label: "Data" },
    { key: "time", label: "Hora" },
    { key: "patientName", label: "Paciente" },
    { key: "reason", label: "Motivo" },
    { key: "type", label: "Tipo" },
    { key: "status", label: "Status" },
  ];

  exportToExcel(appointments, `agendamentos_${Date.now()}`, columns);
}

/**
 * Exporta relatório financeiro para Excel
 */
export function exportFinancialReport(data, filename = "relatorio_financeiro") {
  const columns = [
    { key: "period", label: "Período" },
    { key: "totalConsultations", label: "Total Consultas" },
    { key: "totalPatients", label: "Total Pacientes" },
    { key: "newPatients", label: "Pacientes Novos" },
    { key: "returnPatients", label: "Retornos" },
  ];

  exportToExcel(data, filename, columns);
}
