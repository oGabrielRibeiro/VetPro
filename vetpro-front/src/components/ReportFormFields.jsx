import React from "react";

const ReportFormFields = ({ value, onChange }) => {
  const data = value || {};

  const updateField = (key, nextValue) => {
    onChange?.({ ...data, [key]: nextValue });
  };

  return (
    <div className="space-y-4">
      <div className="vp-card p-4">
        <p className="vp-overline">Laudo</p>
        <h2 className="vp-h2 mt-1">Laudo / atestado</h2>
        <p className="vp-helper mt-1">
          Documento oficial com resumo tecnico, conclusao e recomendacoes.
        </p>
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Identificacao do laudo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="vp-label">Titulo</label>
            <input
              className="vp-input-field"
              value={data.title || ""}
              onChange={(e) => updateField("title", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Data</label>
            <input
              type="date"
              className="vp-input-field"
              value={data.reportDate || ""}
              onChange={(e) => updateField("reportDate", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Resumo e conclusao</h3>
        <textarea
          className="vp-input-field min-h-[110px]"
          value={data.summary || ""}
          onChange={(e) => updateField("summary", e.target.value)}
          placeholder="Resumo clinico, historico e contexto do laudo."
        />
        <textarea
          className="vp-input-field min-h-[110px]"
          value={data.findings || ""}
          onChange={(e) => updateField("findings", e.target.value)}
          placeholder="Achados tecnicos, exames, observacoes."
        />
        <textarea
          className="vp-input-field min-h-[110px]"
          value={data.conclusion || ""}
          onChange={(e) => updateField("conclusion", e.target.value)}
          placeholder="Conclusao e parecer final."
        />
        <textarea
          className="vp-input-field min-h-[110px]"
          value={data.recommendations || ""}
          onChange={(e) => updateField("recommendations", e.target.value)}
          placeholder="Recomendacoes, orientacoes e restricoes."
        />
      </div>
    </div>
  );
};

export default ReportFormFields;
