import React, { useState } from "react";
import { VpAlert, VpBadge, VpButton, VpCard } from "../components/ui";
import Input from "../components/Input";
import Select from "../components/Select";
import AppIcon from "../components/AppIcon";

const UIPlayground = ({ onBack }) => {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !species) {
      setError("Preencha nome e especie para validar os estados de formulario.");
      return;
    }
    setError("");
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 subtle-enter">
      <div className="flex justify-end">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-dark-600 bg-white/70 dark:bg-dark-800/60 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300"
        >
          <AppIcon name="back" className="h-3.5 w-3.5" />
          Voltar
        </button>
      </div>

      <VpCard
        title="Laboratorio UI"
        subtitle="Visao interna dos componentes base para acelerar padronizacao visual."
      >
        <div className="flex flex-wrap gap-2">
          <VpBadge tone="neutral">Neutro</VpBadge>
          <VpBadge tone="success">Sucesso</VpBadge>
          <VpBadge tone="info">Info</VpBadge>
          <VpBadge tone="warning">Aviso</VpBadge>
          <VpBadge tone="danger">Erro</VpBadge>
        </div>
      </VpCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <VpCard title="Botoes" subtitle="Variantes e tamanhos oficiais">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <VpButton variant="primary">Primario</VpButton>
              <VpButton variant="success">Sucesso</VpButton>
              <VpButton variant="neutral">Neutro</VpButton>
              <VpButton variant="warning">Aviso</VpButton>
              <VpButton variant="danger">Erro</VpButton>
            </div>
            <div className="flex flex-wrap gap-2">
              <VpButton size="sm" variant="primary">Pequeno</VpButton>
              <VpButton size="md" variant="primary">Medio</VpButton>
              <VpButton size="lg" variant="primary">Grande</VpButton>
              <VpButton size="md" variant="primary" active>Ativo</VpButton>
              <VpButton size="md" variant="success" loading>Salvando</VpButton>
            </div>
          </div>
        </VpCard>

        <VpCard title="Alertas" subtitle="Padroes de severidade e acao">
          <div className="space-y-2">
            <VpAlert tone="info" title="Informacao" message="Sistema sincronizado com sucesso." />
            <VpAlert tone="success" title="Sucesso" message="Dados salvos sem pendencias." />
            <VpAlert tone="warning" title="Atencao" message="Revise os campos com baixa confianca." />
            <VpAlert tone="error" title="Erro" message="Falha na requisicao ao servidor." />
          </div>
        </VpCard>
      </div>

      <VpCard title="Formulario padrao" subtitle="Exemplo com `Input` e `Select` reutilizaveis">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              id="ui-lab-name"
              label="Nome do paciente"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Apollo"
              error={!name.trim() && error ? "Campo obrigatorio." : ""}
            />
            <Select
              id="ui-lab-species"
              label="Especie"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              placeholder="Selecione"
              options={[
                { value: "canino", label: "Canino" },
                { value: "felino", label: "Felino" },
                { value: "equino", label: "Equino" },
                { value: "bovino", label: "Bovino" },
              ]}
              error={!species && error ? "Campo obrigatorio." : ""}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <VpButton type="submit" variant="success">
              Validar formulario
            </VpButton>
            <VpButton type="button" variant="neutral" onClick={() => { setName(""); setSpecies(""); setError(""); }}>
              Limpar
            </VpButton>
          </div>
          {error && <VpAlert tone="error" message={error} />}
        </form>
      </VpCard>
    </div>
  );
};

export default UIPlayground;
