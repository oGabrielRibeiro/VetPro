import React from "react";
import AppIcon from "./AppIcon";

const buildMedicationRow = () => ({
  name: "",
  dose: "",
  route: "",
});

const ProcedureFormFields = ({ value, onChange, onRequestSignature }) => {
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
        <p className="vp-overline">Procedimento</p>
        <h2 className="vp-h2 mt-1">Procedimento cirurgico</h2>
        <p className="vp-helper mt-1">
          Registre as informacoes principais do procedimento e do consentimento.
        </p>
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Dados do procedimento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="vp-label">Procedimento</label>
            <input
              className="vp-input-field"
              value={data.procedureName || ""}
              onChange={(e) => updateField("procedureName", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Indicacao / motivo</label>
            <input
              className="vp-input-field"
              value={data.indication || ""}
              onChange={(e) => updateField("indication", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Tecnica utilizada</label>
            <input
              className="vp-input-field"
              value={data.technique || ""}
              onChange={(e) => updateField("technique", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Anestesia utilizada</label>
            <input
              className="vp-input-field"
              value={data.anesthesiaUsed || ""}
              onChange={(e) => updateField("anesthesiaUsed", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Cirurgiao</label>
            <input
              className="vp-input-field"
              value={data.surgeon || ""}
              onChange={(e) => updateField("surgeon", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Auxiliar</label>
            <input
              className="vp-input-field"
              value={data.assistant || ""}
              onChange={(e) => updateField("assistant", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Consentimento do tutor</label>
            <select
              className="vp-input-field"
              value={data.consentGiven || ""}
              onChange={(e) => updateField("consentGiven", e.target.value)}
            >
              <option value="">Selecione</option>
              <option value="Sim">Sim</option>
              <option value="Nao">Nao</option>
            </select>
          </div>
          <div>
            <label className="vp-label">Data do consentimento</label>
            <input
              type="date"
              className="vp-input-field"
              value={data.consentDate || ""}
              onChange={(e) => updateField("consentDate", e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-800">Assinatura do tutor</p>
          <p className="text-xs text-slate-500">
            Registre o aceite do procedimento cirurgico.
          </p>
          {data.consentSignature ? (
            <div className="mt-2">
              <img
                src={data.consentSignature}
                alt="Assinatura do tutor"
                className="h-24 w-auto rounded-lg border border-slate-200 bg-white"
              />
              <button
                type="button"
                className="mt-2 btn btn-neutral btn-sm"
                onClick={() => onRequestSignature?.()}
              >
                Recoletar assinatura
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="mt-2 btn btn-primary btn-sm"
              onClick={() => onRequestSignature?.()}
            >
              Capturar assinatura
            </button>
          )}
        </div>
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Achados e observacoes</h3>
        <textarea
          className="vp-input-field min-h-[110px]"
          value={data.findings || ""}
          onChange={(e) => updateField("findings", e.target.value)}
          placeholder="Achados intra-operatorios, intercorrencias, materiais usados."
        />
        <textarea
          className="vp-input-field min-h-[110px]"
          value={data.complications || ""}
          onChange={(e) => updateField("complications", e.target.value)}
          placeholder="Complicacoes, medidas corretivas, observacoes adicionais."
        />
        <textarea
          className="vp-input-field min-h-[110px]"
          value={data.postOpPlan || ""}
          onChange={(e) => updateField("postOpPlan", e.target.value)}
          placeholder="Plano pos-operatorio, cuidados e retorno."
        />
      </div>

      <div className="vp-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="vp-h3">Medicacoes do procedimento</h3>
          <button type="button" className="btn btn-neutral btn-sm" onClick={addMedicationRow}>
            <AppIcon name="plus" className="h-3.5 w-3.5" />
            Adicionar
          </button>
        </div>
        {(data.medications || []).length === 0 && <p className="vp-helper">Sem registros.</p>}
        {(data.medications || []).map((row, index) => (
          <div
            key={`proc-med-${index}`}
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
    </div>
  );
};

export default ProcedureFormFields;
