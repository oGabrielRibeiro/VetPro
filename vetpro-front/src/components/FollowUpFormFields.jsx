import React from "react";

const FollowUpFormFields = ({ value, onChange }) => {
  const data = value || {};

  const updateField = (key, nextValue) => {
    onChange?.({ ...data, [key]: nextValue });
  };

  return (
    <div className="space-y-4">
      <div className="vp-card p-4">
        <p className="vp-overline">Retorno</p>
        <h2 className="vp-h2 mt-1">Retorno / Follow-up</h2>
        <p className="vp-helper mt-1">
          Reavaliacao do caso, resposta ao tratamento e novos ajustes.
        </p>
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Reavaliacao</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="vp-label">Diagnostico anterior</label>
            <input
              className="vp-input-field"
              value={data.previousDiagnosis || ""}
              onChange={(e) => updateField("previousDiagnosis", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Status atual</label>
            <input
              className="vp-input-field"
              value={data.currentStatus || ""}
              onChange={(e) => updateField("currentStatus", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Resposta e ajustes</h3>
        <textarea
          className="vp-input-field min-h-[110px]"
          value={data.responseToTreatment || ""}
          onChange={(e) => updateField("responseToTreatment", e.target.value)}
          placeholder="Resposta ao tratamento, evolucao clinica, queixas atuais."
        />
        <textarea
          className="vp-input-field min-h-[110px]"
          value={data.adjustments || ""}
          onChange={(e) => updateField("adjustments", e.target.value)}
          placeholder="Ajustes na conduta, medicacoes e orientacoes."
        />
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Proximo retorno</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="vp-label">Data sugerida</label>
            <input
              type="date"
              className="vp-input-field"
              value={data.nextVisitDate || ""}
              onChange={(e) => updateField("nextVisitDate", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Observacoes</label>
            <input
              className="vp-input-field"
              value={data.notes || ""}
              onChange={(e) => updateField("notes", e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FollowUpFormFields;
