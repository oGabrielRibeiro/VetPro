import React from "react";
import AppIcon from "./AppIcon";

const ASA_OPTIONS = ["I", "II", "III", "IV", "V"];

const buildMedicationRow = () => ({
  name: "",
  dose: "",
  route: "",
});

const buildGridRow = () => ({
  time: "",
  fc: "",
  fr: "",
  temp: "",
  spo2: "",
  pa: "",
  co2: "",
});

const selectOptions = ["", "Sim", "Nao"];
const recoveryOptions = ["", "Ruim", "Regular", "Bom"];
const defaultLegend = [
  { code: "FC*", label: "Frequencia cardiaca" },
  { code: "FR*", label: "Frequencia respiratoria" },
  { code: "PAM*", label: "Pressao arterial media" },
  { code: "PASV*", label: "Pressao arterial sistolica" },
  { code: "Temp*", label: "Temperatura" },
  { code: "SpO2*", label: "Saturacao" },
  { code: "EtCO2*", label: "CO2 expirado" },
];

const AnesthesiaFormFields = ({ value, onChange, onRequestSignature }) => {
  const data = value || {};

  const updateField = (key, nextValue) => {
    onChange?.({ ...data, [key]: nextValue });
  };

  const updateGridRow = (index, key, nextValue) => {
    const rows = [...(data.vitalsGrid || [])];
    rows[index] = { ...rows[index], [key]: nextValue };
    updateField("vitalsGrid", rows);
  };

  const addGridRow = () => {
    updateField("vitalsGrid", [...(data.vitalsGrid || []), buildGridRow()]);
  };

  const removeGridRow = (index) => {
    const rows = [...(data.vitalsGrid || [])];
    rows.splice(index, 1);
    updateField("vitalsGrid", rows);
  };

  const updateLegendRow = (index, key, nextValue) => {
    const rows = [...(data.legendMarkers || [])];
    rows[index] = { ...rows[index], [key]: nextValue };
    updateField("legendMarkers", rows);
  };

  const addLegendRow = () => {
    updateField("legendMarkers", [
      ...(data.legendMarkers || defaultLegend),
      { code: "", label: "" },
    ]);
  };

  const removeLegendRow = (index) => {
    const rows = [...(data.legendMarkers || defaultLegend)];
    rows.splice(index, 1);
    updateField("legendMarkers", rows);
  };

  const updateMedicationRow = (section, index, key, nextValue) => {
    const rows = [...(data[section] || [])];
    rows[index] = { ...rows[index], [key]: nextValue };
    updateField(section, rows);
  };

  const addMedicationRow = (section) => {
    updateField(section, [...(data[section] || []), buildMedicationRow()]);
  };

  const removeMedicationRow = (section, index) => {
    const rows = [...(data[section] || [])];
    rows.splice(index, 1);
    updateField(section, rows);
  };

  return (
    <div className="space-y-4">
      <div className="vp-card p-4">
        <p className="vp-overline">Anestesia</p>
        <h2 className="vp-h2 mt-1">Ficha anestesica</h2>
        <p className="vp-helper mt-1">
          Preencha os dados essenciais do procedimento anestesico.
        </p>
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Ficha anestesica - identificacao</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="vp-label">Nome animal</label>
            <input
              className="vp-input-field"
              value={data.animalName || ""}
              onChange={(e) => updateField("animalName", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Nome proprietario</label>
            <input
              className="vp-input-field"
              value={data.ownerName || ""}
              onChange={(e) => updateField("ownerName", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Prontuario</label>
            <input
              className="vp-input-field"
              value={data.recordNumber || ""}
              onChange={(e) => updateField("recordNumber", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Especie</label>
            <input
              className="vp-input-field"
              value={data.species || ""}
              onChange={(e) => updateField("species", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Raca</label>
            <input
              className="vp-input-field"
              value={data.breed || ""}
              onChange={(e) => updateField("breed", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Peso (kg)</label>
            <input
              className="vp-input-field"
              value={data.weight || ""}
              onChange={(e) => updateField("weight", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Idade</label>
            <input
              className="vp-input-field"
              value={data.age || ""}
              onChange={(e) => updateField("age", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Sexo</label>
            <input
              className="vp-input-field"
              value={data.sex || ""}
              onChange={(e) => updateField("sex", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Procedimento e equipe</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="vp-label">Cirurgia realizada</label>
            <input
              className="vp-input-field"
              value={data.surgeryName || ""}
              onChange={(e) => updateField("surgeryName", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Diagnostico pre-operatorio</label>
            <input
              className="vp-input-field"
              value={data.preOpDiagnosis || ""}
              onChange={(e) => updateField("preOpDiagnosis", e.target.value)}
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
            <label className="vp-label">Anestesista</label>
            <input
              className="vp-input-field"
              value={data.anesthetist || ""}
              onChange={(e) => updateField("anesthetist", e.target.value)}
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
            <label className="vp-label">ASA</label>
            <select
              className="vp-input-field"
              value={data.asaClass || ""}
              onChange={(e) => updateField("asaClass", e.target.value)}
            >
              <option value="">Selecione</option>
              {ASA_OPTIONS.map((asa) => (
                <option key={asa} value={asa}>
                  {asa}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="vp-label">Inicio da anestesia</label>
            <input
              type="datetime-local"
              className="vp-input-field"
              value={data.anesthesiaStart || ""}
              onChange={(e) => updateField("anesthesiaStart", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Fim da anestesia</label>
            <input
              type="datetime-local"
              className="vp-input-field"
              value={data.anesthesiaEnd || ""}
              onChange={(e) => updateField("anesthesiaEnd", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Data</label>
            <input
              type="date"
              className="vp-input-field"
              value={data.procedureDate || ""}
              onChange={(e) => updateField("procedureDate", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Inicio da cirurgia</label>
            <input
              type="datetime-local"
              className="vp-input-field"
              value={data.surgeryStart || ""}
              onChange={(e) => updateField("surgeryStart", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Fim da cirurgia</label>
            <input
              type="datetime-local"
              className="vp-input-field"
              value={data.surgeryEnd || ""}
              onChange={(e) => updateField("surgeryEnd", e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-800">Assinatura do tutor</p>
          <p className="text-xs text-slate-500">
            Use para registrar o aceite do procedimento anestesico.
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
        <h3 className="vp-h3">E.P.A (avaliacao pre-anestesica)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="vp-label">Hidratacao</label>
            <input
              className="vp-input-field"
              value={data.hydration || ""}
              onChange={(e) => updateField("hydration", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Temperatura</label>
            <input
              className="vp-input-field"
              value={data.preOpTemperature || ""}
              onChange={(e) => updateField("preOpTemperature", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Freq. cardiaca</label>
            <input
              className="vp-input-field"
              value={data.preOpHeartRate || ""}
              onChange={(e) => updateField("preOpHeartRate", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Freq. respiratoria</label>
            <input
              className="vp-input-field"
              value={data.preOpRespiratoryRate || ""}
              onChange={(e) => updateField("preOpRespiratoryRate", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Cor de mucosas</label>
            <input
              className="vp-input-field"
              value={data.mucosaColor || ""}
              onChange={(e) => updateField("mucosaColor", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">TPC</label>
            <input
              className="vp-input-field"
              value={data.tpc || ""}
              onChange={(e) => updateField("tpc", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">TGO/AST</label>
            <input
              className="vp-input-field"
              value={data.tgoAst || ""}
              onChange={(e) => updateField("tgoAst", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">TP</label>
            <input
              className="vp-input-field"
              value={data.tp || ""}
              onChange={(e) => updateField("tp", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Proteinas totais</label>
            <input
              className="vp-input-field"
              value={data.totalProteins || ""}
              onChange={(e) => updateField("totalProteins", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Hemograma</label>
            <input
              className="vp-input-field"
              value={data.hematocrit || ""}
              onChange={(e) => updateField("hematocrit", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Ureia</label>
            <input
              className="vp-input-field"
              value={data.urea || ""}
              onChange={(e) => updateField("urea", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Creatinina</label>
            <input
              className="vp-input-field"
              value={data.creatinine || ""}
              onChange={(e) => updateField("creatinine", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Fibrinogenio</label>
            <input
              className="vp-input-field"
              value={data.fibrinogen || ""}
              onChange={(e) => updateField("fibrinogen", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">FA</label>
            <input
              className="vp-input-field"
              value={data.fa || ""}
              onChange={(e) => updateField("fa", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Intubacao e suporte</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="vp-label">Intubacao</label>
            <select
              className="vp-input-field"
              value={data.intubation || ""}
              onChange={(e) => updateField("intubation", e.target.value)}
            >
              {selectOptions.map((option) => (
                <option key={`intub-${option}`} value={option}>
                  {option || "Selecione"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="vp-label">Sonda</label>
            <select
              className="vp-input-field"
              value={data.tubeProbe || ""}
              onChange={(e) => updateField("tubeProbe", e.target.value)}
            >
              {selectOptions.map((option) => (
                <option key={`sonda-${option}`} value={option}>
                  {option || "Selecione"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="vp-label">Tubo / numero</label>
            <input
              className="vp-input-field"
              value={data.tubeNumber || ""}
              onChange={(e) => updateField("tubeNumber", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Numero da sonda</label>
            <input
              className="vp-input-field"
              value={data.tubeProbeNumber || ""}
              onChange={(e) => updateField("tubeProbeNumber", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Oxigenio</label>
            <input
              className="vp-input-field"
              value={data.oxygen || ""}
              onChange={(e) => updateField("oxygen", e.target.value)}
              placeholder="Fluxo / concentracao"
            />
          </div>
          <div>
            <label className="vp-label">Ventilacao</label>
            <input
              className="vp-input-field"
              value={data.ventilation || ""}
              onChange={(e) => updateField("ventilation", e.target.value)}
              placeholder="Espontanea / assistida"
            />
          </div>
        </div>
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Protocolos e medicacoes</h3>
        {[
          { key: "premedication", label: "Premedicacao" },
          { key: "induction", label: "Inducao" },
          { key: "maintenance", label: "Manutencao" },
          { key: "analgesia", label: "Analgesia" },
          { key: "rescue", label: "Resgate" },
        ].map((section) => (
          <div key={section.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {section.label}
              </p>
              <button
                type="button"
                className="btn btn-neutral btn-sm"
                onClick={() => addMedicationRow(section.key)}
              >
                <AppIcon name="plus" className="h-3.5 w-3.5" />
                Adicionar
              </button>
            </div>
            {(data[section.key] || []).length === 0 && (
              <p className="vp-helper">Sem registros.</p>
            )}
            {(data[section.key] || []).map((row, index) => (
              <div
                key={`${section.key}-${index}`}
                className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-2"
              >
                <input
                  className="vp-input-field"
                  placeholder="Medicamento"
                  value={row.name || ""}
                  onChange={(e) =>
                    updateMedicationRow(section.key, index, "name", e.target.value)
                  }
                />
                <input
                  className="vp-input-field"
                  placeholder="Dose"
                  value={row.dose || ""}
                  onChange={(e) =>
                    updateMedicationRow(section.key, index, "dose", e.target.value)
                  }
                />
                <input
                  className="vp-input-field"
                  placeholder="Via"
                  value={row.route || ""}
                  onChange={(e) =>
                    updateMedicationRow(section.key, index, "route", e.target.value)
                  }
                />
                <button
                  type="button"
                  className="btn btn-danger-soft btn-sm"
                  onClick={() => removeMedicationRow(section.key, index)}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="vp-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="vp-h3">Tabela de monitorizacao (quadrados)</h3>
            <p className="vp-helper mt-1">
              Preencha os quadrados com os sinais vitais ao longo do tempo.
            </p>
          </div>
          <button type="button" className="btn btn-neutral btn-sm" onClick={addGridRow}>
            <AppIcon name="plus" className="h-3.5 w-3.5" />
            Nova linha
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-xs table-fixed border-collapse anesthesia-grid-table">
              <thead className="bg-gray-50">
                <tr className="text-gray-600">
                  <th className="px-2 py-2 text-left font-semibold border anesthesia-grid-time">
                    Min
                  </th>
                  <th className="px-2 py-2 text-center font-semibold border">FC</th>
                  <th className="px-2 py-2 text-center font-semibold border">FR</th>
                  <th className="px-2 py-2 text-center font-semibold border">Temp</th>
                  <th className="px-2 py-2 text-center font-semibold border">SpO2</th>
                  <th className="px-2 py-2 text-center font-semibold border">PAM</th>
                  <th className="px-2 py-2 text-center font-semibold border">EtCO2</th>
                  <th className="px-2 py-2 text-center font-semibold border anesthesia-grid-actions">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody>
                {(data.vitalsGrid || []).length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-5 text-center text-gray-500 border"
                    >
                      Nenhuma linha adicionada.
                    </td>
                  </tr>
                )}
                {(data.vitalsGrid || []).map((row, index) => (
                  <tr key={`grid-${index}`} className="border-t">
                    <td className="px-2 py-2 border anesthesia-grid-time">
                      <input
                        className="vp-input-field anesthesia-grid-input anesthesia-grid-cell"
                        placeholder="min"
                        value={row.time || ""}
                        onChange={(e) => updateGridRow(index, "time", e.target.value)}
                      />
                    </td>
                    {[
                      ["fc", "FC"],
                      ["fr", "FR"],
                      ["temp", "Temp"],
                      ["spo2", "SpO2"],
                      ["pa", "PAM"],
                      ["co2", "EtCO2"],
                    ].map(([key, placeholder]) => (
                      <td key={`${key}-${index}`} className="px-2 py-2 border">
                        <input
                          className="vp-input-field anesthesia-grid-input anesthesia-grid-cell"
                          placeholder={placeholder}
                          value={row[key] || ""}
                          onChange={(e) => updateGridRow(index, key, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-2 text-center border anesthesia-grid-actions">
                      <button
                        type="button"
                        className="btn btn-danger-soft btn-sm"
                        onClick={() => removeGridRow(index)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 space-y-3">
            <p className="font-semibold text-gray-800">Legenda</p>
            {(data.legendMarkers || defaultLegend).map((item, index) => (
              <div
                key={`legend-${index}`}
                className="grid grid-cols-[60px_1fr_auto] gap-3 items-center anesthesia-legend-row"
              >
                <input
                  className="vp-input-field text-xs text-center"
                  value={item.code || ""}
                  onChange={(e) => updateLegendRow(index, "code", e.target.value)}
                />
                <input
                  className="vp-input-field text-xs"
                  value={item.label || ""}
                  onChange={(e) => updateLegendRow(index, "label", e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-danger-soft btn-sm"
                  onClick={() => removeLegendRow(index)}
                >
                  Remover
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-neutral btn-sm" onClick={addLegendRow}>
              <AppIcon name="plus" className="h-3.5 w-3.5" />
              Adicionar legenda
            </button>
          </div>
        </div>
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Condicoes / observacoes gerais</h3>
        <textarea
          className="vp-input-field min-h-[110px]"
          value={data.notes || ""}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Condicoes observadas, posicionamento, intubacao, intercorrencias."
        />
      </div>

      <div className="vp-card p-4 space-y-3">
        <h3 className="vp-h3">Respiracao, posicionamento e suporte</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="vp-label">Respiracao espontanea</label>
            <select
              className="vp-input-field"
              value={data.respSpontaneous || ""}
              onChange={(e) => updateField("respSpontaneous", e.target.value)}
            >
              {selectOptions.map((option) => (
                <option key={`resp-${option}`} value={option}>
                  {option || "Selecione"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="vp-label">Respiracao assistida</label>
            <select
              className="vp-input-field"
              value={data.respAssisted || ""}
              onChange={(e) => updateField("respAssisted", e.target.value)}
            >
              {selectOptions.map((option) => (
                <option key={`assist-${option}`} value={option}>
                  {option || "Selecione"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="vp-label">Anestesia local</label>
            <select
              className="vp-input-field"
              value={data.localAnesthesia || ""}
              onChange={(e) => updateField("localAnesthesia", e.target.value)}
            >
              {selectOptions.map((option) => (
                <option key={`local-${option}`} value={option}>
                  {option || "Selecione"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="vp-label">Anestesia geral</label>
            <select
              className="vp-input-field"
              value={data.generalAnesthesia || ""}
              onChange={(e) => updateField("generalAnesthesia", e.target.value)}
            >
              {selectOptions.map((option) => (
                <option key={`geral-${option}`} value={option}>
                  {option || "Selecione"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="vp-label">Intubacao</label>
            <select
              className="vp-input-field"
              value={data.intubation || ""}
              onChange={(e) => updateField("intubation", e.target.value)}
            >
              {selectOptions.map((option) => (
                <option key={`intub-${option}`} value={option}>
                  {option || "Selecione"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="vp-label">Posicao do animal</label>
            <input
              className="vp-input-field"
              value={data.animalPosition || ""}
              onChange={(e) => updateField("animalPosition", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Circuito</label>
            <input
              className="vp-input-field"
              value={data.circuit || ""}
              onChange={(e) => updateField("circuit", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Fluidoterapia</label>
            <input
              className="vp-input-field"
              value={data.fluidTherapy || ""}
              onChange={(e) => updateField("fluidTherapy", e.target.value)}
            />
          </div>
          <div>
            <label className="vp-label">Resultado final</label>
            <select
              className="vp-input-field"
              value={data.finalOutcome || ""}
              onChange={(e) => updateField("finalOutcome", e.target.value)}
            >
              {recoveryOptions.map((option) => (
                <option key={`outcome-${option}`} value={option}>
                  {option || "Selecione"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="vp-label">Condicoes / Observacoes</label>
            <input
              className="vp-input-field"
              value={data.conditions || ""}
              onChange={(e) => updateField("conditions", e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnesthesiaFormFields;
