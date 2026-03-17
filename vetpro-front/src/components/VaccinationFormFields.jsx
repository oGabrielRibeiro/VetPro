import React from "react";

const VaccinationFormFields = ({ value, onChange }) => {
  const data = value || {};

  const updateField = (key, nextValue) => {
    onChange?.({ ...data, [key]: nextValue });
  };

  return (
    <div className="space-y-4">
      <div className="vp-card p-4">
        <p className="vp-overline">Vacinacao</p>
        <h2 className="vp-h2 mt-1">Vacinacao e vermifugacao</h2>
        <p className="vp-helper mt-1">
          Dados do lote, fabricante, validade e proximas doses.
        </p>
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Vacina</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="vp-label">Vacina</label>
            <input
              className="vp-input-field"
              value={data.vaccineName || ""}
              onChange={(e) => updateField("vaccineName", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Fabricante</label>
            <input
              className="vp-input-field"
              value={data.vaccineManufacturer || ""}
              onChange={(e) => updateField("vaccineManufacturer", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Lote</label>
            <input
              className="vp-input-field"
              value={data.vaccineLot || ""}
              onChange={(e) => updateField("vaccineLot", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Validade</label>
            <input
              type="date"
              className="vp-input-field"
              value={data.vaccineExpiry || ""}
              onChange={(e) => updateField("vaccineExpiry", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Dose</label>
            <input
              className="vp-input-field"
              value={data.vaccineDose || ""}
              onChange={(e) => updateField("vaccineDose", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Via</label>
            <input
              className="vp-input-field"
              value={data.vaccineRoute || ""}
              onChange={(e) => updateField("vaccineRoute", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Data de aplicacao</label>
            <input
              type="date"
              className="vp-input-field"
              value={data.vaccineDate || ""}
              onChange={(e) => updateField("vaccineDate", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Proxima dose</label>
            <input
              type="date"
              className="vp-input-field"
              value={data.vaccineNextDate || ""}
              onChange={(e) => updateField("vaccineNextDate", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Vermifugacao</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="vp-label">Produto</label>
            <input
              className="vp-input-field"
              value={data.dewormerName || ""}
              onChange={(e) => updateField("dewormerName", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Fabricante</label>
            <input
              className="vp-input-field"
              value={data.dewormerManufacturer || ""}
              onChange={(e) => updateField("dewormerManufacturer", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Lote</label>
            <input
              className="vp-input-field"
              value={data.dewormerLot || ""}
              onChange={(e) => updateField("dewormerLot", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Data de aplicacao</label>
            <input
              type="date"
              className="vp-input-field"
              value={data.dewormerDate || ""}
              onChange={(e) => updateField("dewormerDate", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Proxima dose</label>
            <input
              type="date"
              className="vp-input-field"
              value={data.dewormerNextDate || ""}
              onChange={(e) => updateField("dewormerNextDate", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Observacoes</h3>
        <textarea
          className="vp-input-field min-h-[110px]"
          value={data.notes || ""}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Reacoes adversas, orientacoes ao tutor, observacoes gerais."
        />
      </div>
    </div>
  );
};

export default VaccinationFormFields;
