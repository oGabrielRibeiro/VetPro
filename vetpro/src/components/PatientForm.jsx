import React, { useState } from 'react';
import FeedbackBanner from "./FeedbackBanner";

const PatientForm = ({ patient, onSubmit, onCancel, isEditing }) => {
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(patient || {
    name: "",
    species: "",
    subcategory: "",
    breed: "",
    age: "",
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");
    
    // Validação simples
    if (!form.name.trim() || !form.species || !form.breed.trim() || 
        !form.age.trim() || !form.ownerName.trim()) {
      setFormError("Preencha os campos obrigatorios para salvar o paciente.");
      return;
    }
    
    onSubmit(form);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">
        {isEditing ? "Editar Paciente" : "Novo Paciente"}
      </h1>
      
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <FeedbackBanner type="error" message={formError} onClose={() => setFormError("")} />
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Nome do Paciente <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              placeholder="Ex: Rex, Mia"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Espécie <span className="text-red-500">*</span>
            </label>
            <select
              value={form.species}
              onChange={(e) => setForm({...form, species: e.target.value, subcategory: ""})}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              required
            >
              <option value="">Selecione</option>
              <option value="Mamífero">Mamífero</option>
              <option value="Ave">Ave</option>
              <option value="Réptil">Réptil</option>
              <option value="Peixe">Peixe</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
          
          {form.species === "Mamífero" && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Subcategoria <span className="text-red-500">*</span>
              </label>
              <select
                value={form.subcategory}
                onChange={(e) => setForm({...form, subcategory: e.target.value})}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                required
              >
                <option value="">Selecione</option>
                <option value="Canino">Canino</option>
                <option value="Felino">Felino</option>
                <option value="Equino">Equino</option>
                <option value="Bovino">Bovino</option>
                <option value="Caprino">Caprino</option>
                <option value="Ovino">Ovino</option>
                <option value="Suíno">Suíno</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Raça <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.breed}
              onChange={(e) => setForm({...form, breed: e.target.value})}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              placeholder="Ex: Labrador, Siamês"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Idade <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.age}
              onChange={(e) => setForm({...form, age: e.target.value})}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              placeholder="Ex: 3 anos, 6 meses"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Nome do Tutor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.ownerName}
              onChange={(e) => setForm({...form, ownerName: e.target.value})}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              placeholder="Nome completo do responsável"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Telefone do Tutor
            </label>
            <input
              type="tel"
              value={form.ownerPhone}
              onChange={(e) => setForm({...form, ownerPhone: e.target.value})}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              placeholder="(11) 99999-9999"
            />
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              E-mail do Tutor
            </label>
            <input
              type="email"
              value={form.ownerEmail}
              onChange={(e) => setForm({...form, ownerEmail: e.target.value})}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              placeholder="tutor@email.com"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:justify-between space-y-2 sm:space-y-0 sm:space-x-3 pt-3 sm:pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto bg-gray-200 text-gray-800 font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl hover:bg-gray-300 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-cyan-700 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
            >
              {isEditing ? "Atualizar Paciente" : "Cadastrar Paciente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientForm;
