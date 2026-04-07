import React from "react";
import PropTypes from "prop-types";
import AppIcon from "./AppIcon";

const buildMedicationItem = () => ({
  name: "",
  dose: "",
  route: "",
  frequency: "",
  duration: "",
});

const MedicationFormFields = ({ value, onChange }) => {
  const data = value || {};

  const updateField = (key, nextValue) => {
    onChange?.({ ...data, [key]: nextValue });
  };

  const updateItem = (index, key, nextValue) => {
    const items = [...(data.items || [])];
    items[index] = { ...items[index], [key]: nextValue };
    updateField("items", items);
  };

  const addItem = () => {
    updateField("items", [...(data.items || []), buildMedicationItem()]);
  };

  const removeItem = (index) => {
    const items = [...(data.items || [])];
    items.splice(index, 1);
    updateField("items", items);
  };

  return (
    <div className="space-y-4">
      <div className="vp-card p-4">
        <p className="vp-overline">Prescricao</p>
        <h2 className="vp-h2 mt-1">Consulta medicamentosa</h2>
        <p className="vp-helper mt-1">
          Formato resumido para prescrever medicacoes e orientacoes.
        </p>
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Diagnostico / indicacao</h3>
        <textarea
          className="vp-input-field min-h-[90px]"
          value={data.diagnosis || ""}
          onChange={(e) => updateField("diagnosis", e.target.value)}
          placeholder="Descreva o motivo da prescricao."
        />
      </div>

      <div className="vp-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="vp-h3">Medicacoes</h3>
          <button type="button" className="btn btn-neutral btn-sm" onClick={addItem}>
            <AppIcon name="plus" className="h-3.5 w-3.5" />
            Adicionar
          </button>
        </div>
        {(data.items || []).length === 0 && (
          <p className="vp-helper">Nenhuma medicacao adicionada.</p>
        )}
        {(data.items || []).map((item, index) => (
          <div
            key={`med-${index}`}
            className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2"
          >
            <input
              className="vp-input-field"
              placeholder="Medicamento"
              value={item.name || ""}
              onChange={(e) => updateItem(index, "name", e.target.value)}
            />
            <input
              className="vp-input-field"
              placeholder="Dose"
              value={item.dose || ""}
              onChange={(e) => updateItem(index, "dose", e.target.value)}
            />
            <input
              className="vp-input-field"
              placeholder="Via"
              value={item.route || ""}
              onChange={(e) => updateItem(index, "route", e.target.value)}
            />
            <input
              className="vp-input-field"
              placeholder="Frequencia"
              value={item.frequency || ""}
              onChange={(e) => updateItem(index, "frequency", e.target.value)}
            />
            <input
              className="vp-input-field"
              placeholder="Duracao"
              value={item.duration || ""}
              onChange={(e) => updateItem(index, "duration", e.target.value)}
            />
            <button
              type="button"
              className="btn btn-danger-soft btn-sm"
              onClick={() => removeItem(index)}
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Orientacoes adicionais</h3>
        <textarea
          className="vp-input-field min-h-[110px]"
          value={data.notes || ""}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Cuidados, retorno e alertas."
        />
      </div>
    </div>
  );
};

MedicationFormFields.propTypes = {
  value: PropTypes.shape({
    diagnosis: PropTypes.string,
    items: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      dose: PropTypes.string,
      route: PropTypes.string,
      frequency: PropTypes.string,
      duration: PropTypes.string
    })),
    observations: PropTypes.string
  }),
  onChange: PropTypes.func.isRequired
};

MedicationFormFields.defaultProps = {
  value: null
};

export default MedicationFormFields;
