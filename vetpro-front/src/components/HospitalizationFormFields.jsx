import React from "react";
import AppIcon from "./AppIcon";

const buildMedicationRow = () => ({
  name: "",
  dose: "",
  route: "",
});

const HospitalizationFormFields = ({ value, onChange }) => {
  const data = value || {};

  const updateField = (key, nextValue) => {
    onChange?.({ ...data, [key]: nextValue });
  };

  const updateMedicationRow = (index, key, nextValue) => {
    const rows = [...(data.medications || [])];
    rows[index] = { ...rows[index], [key]: nextValue };
    updateField("medications", rows);
  };

  const addMedicationRow = () => {
    updateField("medications", [...(data.medications || []), buildMedicationRow()]);
  };

  const removeMedicationRow = (index) => {
    const rows = [...(data.medications || [])];
    rows.splice(index, 1);
    updateField("medications", rows);
  };

  return (
    <div className="space-y-4">
      <div className="vp-card p-4">
        <p className="vp-overline">Internacao</p>
        <h2 className="vp-h2 mt-1">Evolucao e internacao</h2>
        <p className="vp-helper mt-1">
          Registro de evolucao diaria, sinais e cuidados durante internacao.
        </p>
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Dados de internacao</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="vp-label">Data de admissao</label>
            <input
              type="date"
              className="vp-input-field"
              value={data.admissionDate || ""}
              onChange={(e) => updateField("admissionDate", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Data de alta</label>
            <input
              type="date"
              className="vp-input-field"
              value={data.dischargeDate || ""}
              onChange={(e) => updateField("dischargeDate", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Diagnostico principal</label>
            <input
              className="vp-input-field"
              value={data.mainDiagnosis || ""}
              onChange={(e) => updateField("mainDiagnosis", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Responsavel</label>
            <input
              className="vp-input-field"
              value={data.responsible || ""}
              onChange={(e) => updateField("responsible", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Evolucao e cuidados</h3>
        <textarea
          className="vp-input-field min-h-[110px]"
          value={data.dailyEvolution || ""}
          onChange={(e) => updateField("dailyEvolution", e.target.value)}
          placeholder="Evolucao diaria, sinais clinicos, dor, comportamento."
        />
        <textarea
          className="vp-input-field min-h-[110px]"
          value={data.vitalsNotes || ""}
          onChange={(e) => updateField("vitalsNotes", e.target.value)}
          placeholder="Sinais vitais, temperatura, FC/FR, hidratacao."
        />
      </div>

      <div className="vp-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="vp-h3">Medicacoes em uso</h3>
          <button type="button" className="btn btn-neutral btn-sm" onClick={addMedicationRow}>
            <AppIcon name="plus" className="h-3.5 w-3.5" />
            Adicionar
          </button>
        </div>
        {(data.medications || []).length === 0 && <p className="vp-helper">Sem registros.</p>}
        {(data.medications || []).map((row, index) => (
          <div
            key={`int-med-${index}`}
            className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-2"
          >
            <input
              className="vp-input-field"
              placeholder="Medicamento"
              value={row.name || ""}
              onChange={(e) => updateMedicationRow(index, "name", e.target.value)}
            />
            <input
              className="vp-input-field"
              placeholder="Dose"
              value={row.dose || ""}
              onChange={(e) => updateMedicationRow(index, "dose", e.target.value)}
            />
            <input
              className="vp-input-field"
              placeholder="Via"
              value={row.route || ""}
              onChange={(e) => updateMedicationRow(index, "route", e.target.value)}
            />
            <button
              type="button"
              className="btn btn-danger-soft btn-sm"
              onClick={() => removeMedicationRow(index)}
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Alimentacao e eliminacoes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="vp-label">Alimentacao</label>
            <input
              className="vp-input-field"
              value={data.feeding || ""}
              onChange={(e) => updateField("feeding", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Hidratacao</label>
            <input
              className="vp-input-field"
              value={data.hydration || ""}
              onChange={(e) => updateField("hydration", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Eliminacoes</label>
            <input
              className="vp-input-field"
              value={data.elimination || ""}
              onChange={(e) => updateField("elimination", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Observacoes</label>
            <input
              className="vp-input-field"
              value={data.observations || ""}
              onChange={(e) => updateField("observations", e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalizationFormFields;
