import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import FeedbackBanner from "./FeedbackBanner";
import AppIcon from "./AppIcon";

const ConsultationForm = ({ 
  consultation, 
  patients, 
  onSubmit, 
  onCancel,
  currentUser,
  isPreviewMode,
  setIsPreviewMode,
  selectedFiles,
  setSelectedFiles
}) => {
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(consultation || {
    patientId: "",
    recordNumber: "",
    date: new Date().toISOString().split("T")[0],
    veterinarianName: currentUser?.name || "Dra. Juliana Mendes",
    veterinarianCRMV: currentUser?.crmV || `CRMV-${currentUser?.crmVState || "SP"} ${currentUser?.crmVNumber || "12345"}`,
    chiefComplaint: "",
    anamnesis: "",
    clinicalAssessment: "",
    diagnosis: "",
    treatment: "",
    observations: "",
    files: [],
    template: "general",
    // Species-specific fields
    vaccinationStatus: "",
    deworming: "",
    diet: "",
    housing: "",
    managementType: "",
    useType: "",
    hoofCare: "",
    productionSystem: "",
    herdBatch: "",
    animalIdentification: "",
    herdHealthStatus: "",
    birdType: "",
  });

  // Atualizar dados do veterinário quando usuário mudar
  useEffect(() => {
    if (currentUser) {
      setForm(prev => ({
        ...prev,
        veterinarianName: currentUser.name || prev.veterinarianName,
        veterinarianCRMV: `CRMV-${currentUser.crmvState || "SP"} ${currentUser.crmvNumber || "12345"}`
      }));
    }
  }, [currentUser]);

  // Resetar campos específicos quando paciente mudar
  useEffect(() => {
    if (form.patientId) {
      // Resetar campos específicos da espécie
      setForm(prev => ({
        ...prev,
        vaccinationStatus: "",
        deworming: "",
        diet: "",
        housing: "",
        managementType: "",
        useType: "",
        hoofCare: "",
        productionSystem: "",
        herdBatch: "",
        animalIdentification: "",
        herdHealthStatus: "",
        birdType: "",
      }));
    }
  }, [form.patientId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});
    
    if (!form.patientId) {
      setFormError("Selecione um paciente para continuar.");
      setFieldErrors({ patientId: "Selecione um paciente." });
      document.getElementById("consultationPatientId")?.focus();
      return;
    }

    if (!form.chiefComplaint.trim()) {
      setFormError("Informe a queixa principal para continuar.");
      setFieldErrors({ chiefComplaint: "Informe a queixa principal." });
      document.getElementById("consultationChiefComplaint")?.focus();
      return;
    }
    
    onSubmit(form);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const getPatientById = (id) => {
    return patients.find(p => p.id === parseInt(id));
  };

  const getSpeciesSpecificFields = () => {
    if (!form.patientId) return null;
    
    const patient = getPatientById(form.patientId);
    if (!patient) return null;
    
    switch(patient.species) {
      case "Mamífero":
        switch(patient.subcategory) {
          case "Canino":
          case "Felino":
            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Vacinação em dia?
                    </label>
                    <select
                      value={form.vaccinationStatus}
                      onChange={(e) => setForm({...form, vaccinationStatus: e.target.value})}
                      className="vp-input-field text-sm"
                    >
                      <option value="">Selecione</option>
                      <option value="Em dia">Em dia</option>
                      <option value="Atrasada">Atrasada</option>
                      <option value="Não aplicável">Não aplicável</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Vermifugação
                    </label>
                    <input
                      type="text"
                      value={form.deworming}
                      onChange={(e) => setForm({...form, deworming: e.target.value})}
                      className="vp-input-field text-sm"
                      placeholder="Ex: Realizada há 2 meses"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Alimentação
                  </label>
                  <input
                    type="text"
                    value={form.diet}
                    onChange={(e) => setForm({...form, diet: e.target.value})}
                    className="vp-input-field text-sm"
                    placeholder="Ex: Ração premium, 2x ao dia"
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Ambiente domiciliar
                  </label>
                  <input
                    type="text"
                    value={form.housing}
                    onChange={(e) => setForm({...form, housing: e.target.value})}
                    className="vp-input-field text-sm"
                    placeholder="Ex: Apartamento, acesso à varanda"
                  />
                </div>
              </>
            );
          
          case "Equino":
            return (
              <>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Tipo de manejo
                  </label>
                  <input
                    type="text"
                    value={form.managementType}
                    onChange={(e) => setForm({...form, managementType: e.target.value})}
                    className="vp-input-field text-sm"
                    placeholder="Ex: Pastagem, estábulo"
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Uso do animal
                  </label>
                  <select
                    value={form.useType}
                    onChange={(e) => setForm({...form, useType: e.target.value})}
                    className="vp-input-field text-sm"
                  >
                    <option value="">Selecione</option>
                    <option value="Esporte">Esporte</option>
                    <option value="Trabalho">Trabalho</option>
                    <option value="Reprodução">Reprodução</option>
                    <option value="Lazer">Lazer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Histórico de casqueamento
                  </label>
                  <input
                    type="text"
                    value={form.hoofCare}
                    onChange={(e) => setForm({...form, hoofCare: e.target.value})}
                    className="vp-input-field text-sm"
                    placeholder="Ex: Realizado há 6 semanas"
                  />
                </div>
              </>
            );
          
          case "Bovino":
            return (
              <>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Sistema de produção
                  </label>
                  <select
                    value={form.productionSystem}
                    onChange={(e) => setForm({...form, productionSystem: e.target.value})}
                    className="vp-input-field text-sm"
                  >
                    <option value="">Selecione</option>
                    <option value="Leite">Leite</option>
                    <option value="Corte">Corte</option>
                    <option value="Ambos">Ambos</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Lote/Identificação do animal
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={form.herdBatch}
                      onChange={(e) => setForm({...form, herdBatch: e.target.value})}
                      className="vp-input-field text-sm"
                      placeholder="Ex: Lote A"
                    />
                    <input
                      type="text"
                      value={form.animalIdentification}
                      onChange={(e) => setForm({...form, animalIdentification: e.target.value})}
                      className="vp-input-field text-sm"
                      placeholder="Ex: Brinco eletrônico #123"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Status sanitário do rebanho
                  </label>
                  <input
                    type="text"
                    value={form.herdHealthStatus}
                    onChange={(e) => setForm({...form, herdHealthStatus: e.target.value})}
                    className="vp-input-field text-sm"
                    placeholder="Ex: Vacinação em dia, sem surtos recentes"
                  />
                </div>
              </>
            );
          
          default:
            return null;
        }
      
      case "Ave":
        return (
          <>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Tipo de ave
              </label>
              <input
                type="text"
                value={form.birdType}
                onChange={(e) => setForm({...form, birdType: e.target.value})}
                className="vp-input-field text-sm"
                placeholder="Ex: Papagaio, Canário, Avestruz"
              />
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Ambiente de criação
              </label>
              <select
                value={form.housing}
                onChange={(e) => setForm({...form, housing: e.target.value})}
                className="vp-input-field text-sm"
              >
                <option value="">Selecione</option>
                <option value="Gaiola">Gaiola</option>
                <option value="Viveiro">Viveiro</option>
                <option value="Ambiente livre">Ambiente livre</option>
                <option value="Comercial">Comercial</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Dieta
              </label>
              <input
                type="text"
                value={form.diet}
                onChange={(e) => setForm({...form, diet: e.target.value})}
                className="vp-input-field text-sm"
                placeholder="Ex: Ração específica, sementes, frutas"
              />
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  if (isPreviewMode) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
        <div className="flex justify-between items-start mb-6 no-print">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
            Visualização do Prontuário
          </h1>
          <div className="flex space-x-3">
            <button
              onClick={() => setIsPreviewMode(false)}
              className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              Editar
            </button>
            <button
              onClick={() => window.print()}
              className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2 text-sm"
            >
              <AppIcon name="print" className="h-4 w-4" />
              <span>Imprimir/Exportar PDF</span>
            </button>
          </div>
        </div>
        
        <div 
          id="print-content"
          className="space-y-6 p-6 border border-gray-200 rounded-lg bg-white"
        >
          {/* Header */}
          <div className="border-b border-gray-300 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">PRONTUÁRIO CLÍNICO VETERINÁRIO</h1>
                <p className="text-gray-600 mt-1">{currentUser?.clinicName || "Clínica VetCare"}</p>
                <p className="text-gray-600">{currentUser?.clinicAddress || "Av. Paulista, 1000 - São Paulo/SP"}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">
                  Nº {form.recordNumber || `VET-${new Date().getFullYear()}-${String(1).padStart(3, '0')}`}
                </p>
                <p className="text-gray-600">{new Date(form.date).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>
          
          {/* Patient and Owner Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-200 pb-6">
            <div>
              <h2 className="font-bold text-lg text-gray-800 mb-3">DADOS DO PACIENTE</h2>
              {form.patientId && (
                <div className="space-y-2">
                  <div>
                    <span className="font-medium text-gray-700">Nome:</span>
                    <p className="ml-2">{getPatientById(form.patientId)?.name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Espécie:</span>
                    <p className="ml-2">{getPatientById(form.patientId)?.species}</p>
                  </div>
                  {getPatientById(form.patientId)?.subcategory && (
                    <div>
                      <span className="font-medium text-gray-700">Categoria:</span>
                      <p className="ml-2">{getPatientById(form.patientId)?.subcategory}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">Raça:</span>
                    <p className="ml-2">{getPatientById(form.patientId)?.breed}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Idade:</span>
                    <p className="ml-2">{getPatientById(form.patientId)?.age}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <h2 className="font-bold text-lg text-gray-800 mb-3">DADOS DO TUTOR</h2>
              {form.patientId && (
                <div className="space-y-2">
                  <div>
                    <span className="font-medium text-gray-700">Nome:</span>
                    <p className="ml-2">{getPatientById(form.patientId)?.ownerName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Telefone:</span>
                    <p className="ml-2">{getPatientById(form.patientId)?.ownerPhone}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">E-mail:</span>
                    <p className="ml-2">{getPatientById(form.patientId)?.ownerEmail}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Veterinarian Information */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="font-bold text-lg text-gray-800 mb-3">DADOS DO VETERINÁRIO</h2>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-700">Nome:</span>
                <p className="ml-2">{form.veterinarianName}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">CRMV:</span>
                <p className="ml-2">{form.veterinarianCRMV}</p>
              </div>
            </div>
          </div>
          
          {/* Clinical Information */}
          <div className="space-y-6">
            <div>
              <h2 className="font-bold text-lg text-gray-800 mb-3">QUEIXA PRINCIPAL</h2>
              <p className="text-gray-700 whitespace-pre-line">{form.chiefComplaint || "Não informado"}</p>
            </div>
            
            <div>
              <h2 className="font-bold text-lg text-gray-800 mb-3">ANAMNESE</h2>
              <p className="text-gray-700 whitespace-pre-line">{form.anamnesis || "Não informado"}</p>
            </div>
            
            {form.vaccinationStatus && (
              <div>
                <h2 className="font-bold text-lg text-gray-800 mb-3">INFORMAÇÕES ESPECÍFICAS</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {form.vaccinationStatus && (
                    <div>
                      <span className="font-medium text-gray-700">Vacinação:</span>
                      <p className="ml-2">{form.vaccinationStatus}</p>
                    </div>
                  )}
                  {form.deworming && (
                    <div>
                      <span className="font-medium text-gray-700">Vermifugação:</span>
                      <p className="ml-2">{form.deworming}</p>
                    </div>
                  )}
                  {form.diet && (
                    <div>
                      <span className="font-medium text-gray-700">Alimentação:</span>
                      <p className="ml-2">{form.diet}</p>
                    </div>
                  )}
                  {form.housing && (
                    <div>
                      <span className="font-medium text-gray-700">Ambiente:</span>
                      <p className="ml-2">{form.housing}</p>
                    </div>
                  )}
                  {form.managementType && (
                    <div>
                      <span className="font-medium text-gray-700">Tipo de Manejo:</span>
                      <p className="ml-2">{form.managementType}</p>
                    </div>
                  )}
                  {form.useType && (
                    <div>
                      <span className="font-medium text-gray-700">Uso do Animal:</span>
                      <p className="ml-2">{form.useType}</p>
                    </div>
                  )}
                  {form.hoofCare && (
                    <div>
                      <span className="font-medium text-gray-700">Casqueamento:</span>
                      <p className="ml-2">{form.hoofCare}</p>
                    </div>
                  )}
                  {form.productionSystem && (
                    <div>
                      <span className="font-medium text-gray-700">Sistema de Produção:</span>
                      <p className="ml-2">{form.productionSystem}</p>
                    </div>
                  )}
                  {form.herdBatch && (
                    <div>
                      <span className="font-medium text-gray-700">Lote:</span>
                      <p className="ml-2">{form.herdBatch}</p>
                    </div>
                  )}
                  {form.animalIdentification && (
                    <div>
                      <span className="font-medium text-gray-700">Identificação:</span>
                      <p className="ml-2">{form.animalIdentification}</p>
                    </div>
                  )}
                  {form.herdHealthStatus && (
                    <div>
                      <span className="font-medium text-gray-700">Status Sanitário:</span>
                      <p className="ml-2">{form.herdHealthStatus}</p>
                    </div>
                  )}
                  {form.birdType && (
                    <div>
                      <span className="font-medium text-gray-700">Tipo de Ave:</span>
                      <p className="ml-2">{form.birdType}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div>
              <h2 className="font-bold text-lg text-gray-800 mb-3">AVALIAÇÃO CLÍNICA</h2>
              <p className="text-gray-700 whitespace-pre-line">{form.clinicalAssessment || "Não informado"}</p>
            </div>
            
            <div>
              <h2 className="font-bold text-lg text-gray-800 mb-3">DIAGNÓSTICO</h2>
              <p className="text-gray-700 whitespace-pre-line">{form.diagnosis || "Não informado"}</p>
            </div>
            
            <div>
              <h2 className="font-bold text-lg text-gray-800 mb-3">CONDUTA / TRATAMENTO</h2>
              <p className="text-gray-700 whitespace-pre-line">{form.treatment || "Não informado"}</p>
            </div>
            
            <div>
              <h2 className="font-bold text-lg text-gray-800 mb-3">OBSERVAÇÕES</h2>
              <p className="text-gray-700 whitespace-pre-line">{form.observations || "Não informado"}</p>
            </div>
          </div>
          
          {/* Signature Section */}
          <div className="border-t border-gray-300 pt-8 mt-8">
            <div className="border-b-2 border-dashed border-gray-400 w-80 mx-auto mb-4"></div>
            <div className="text-center">
              <p className="font-bold">{form.veterinarianName}</p>
              <p>{form.veterinarianCRMV}</p>
              {currentUser?.signaturePreview && (
                <div className="mt-4">
                  <img 
                    src={currentUser.signaturePreview} 
                    alt="Assinatura" 
                    className="signature-image inline-block max-w-xs"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-center space-x-4 no-print">
          <button
            onClick={() => setIsPreviewMode(false)}
            className="bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-xl hover:bg-gray-300 transition-colors text-sm"
          >
            Voltar para Edição
          </button>
          <button
            onClick={() => window.print()}
            className="bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-emerald-700 transition-colors flex items-center space-x-2 text-sm"
          >
            <AppIcon name="print" className="h-4 w-4" />
            <span>Imprimir/Exportar PDF</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">
        Novo Prontuário
      </h1>
      
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-4 sm:px-6 py-3 sm:py-4">
          <h2 className="font-bold text-base sm:text-lg text-gray-800">Dados do Paciente</h2>
        </div>
        
        <div className="p-4 sm:p-6">
    <form onSubmit={handleSubmit} className="space-y-6">
      <FeedbackBanner type="error" message={formError} onClose={() => setFormError("")} />
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Selecionar Paciente <span className="text-red-500">*</span>
              </label>
              <select
                id="consultationPatientId"
                value={form.patientId}
                onChange={(e) => {
                  setForm({...form, patientId: e.target.value});
                  if (fieldErrors.patientId) {
                    setFieldErrors((prev) => ({ ...prev, patientId: "" }));
                  }
                }}
                className={`vp-input-field text-sm sm:px-4 sm:py-3 ${fieldErrors.patientId ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}`}
                required
                aria-invalid={fieldErrors.patientId ? "true" : "false"}
              >
                <option value="">Selecione um paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} - {patient.ownerName} ({patient.species}{patient.subcategory ? ` - ${patient.subcategory}` : ''})
                  </option>
                ))}
              </select>
            </div>
            
            {form.patientId && (
              <>
                <details className="rounded-xl border border-gray-200 p-4 sm:p-5" open>
                  <summary className="cursor-pointer text-sm font-semibold text-gray-800">
                    Informacoes do veterinario e consulta
                  </summary>
                  <div className="mt-3 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Nome do Veterinario
                        </label>
                        <input
                          type="text"
                          value={form.veterinarianName}
                          onChange={(e) => setForm({...form, veterinarianName: e.target.value})}
                          className="vp-input-field text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          CRMV
                        </label>
                        <input
                          type="text"
                          value={form.veterinarianCRMV}
                          onChange={(e) => setForm({...form, veterinarianCRMV: e.target.value})}
                          className="vp-input-field text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Data da Consulta
                      </label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm({...form, date: e.target.value})}
                        className="vp-input-field text-sm sm:px-4 sm:py-3"
                        required
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>
                </details>

                <details className="rounded-xl border border-gray-200 p-4 sm:p-5" open>
                  <summary className="cursor-pointer text-sm font-semibold text-gray-800">
                    Dados clinicos
                  </summary>
                  <div className="mt-3 space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Queixa Principal <span className="text-red-500">*</span>
                      </label>
                  <textarea
                    id="consultationChiefComplaint"
                    value={form.chiefComplaint}
                    onChange={(e) => {
                      setForm({...form, chiefComplaint: e.target.value});
                      if (fieldErrors.chiefComplaint) {
                        setFieldErrors((prev) => ({ ...prev, chiefComplaint: "" }));
                      }
                    }}
                    className={`vp-input-field text-sm sm:px-4 sm:py-3 min-h-[60px] sm:min-h-[80px] ${fieldErrors.chiefComplaint ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}`}
                    placeholder="Ex: Coceira excessiva, Vômitos, Perda de apetite"
                    required
                    aria-invalid={fieldErrors.chiefComplaint ? "true" : "false"}
                  />
                  {fieldErrors.chiefComplaint && (
                    <p className="mt-1 text-xs text-red-500">
                      {fieldErrors.chiefComplaint}
                    </p>
                  )}
                </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Anamnese
                      </label>
                      <textarea
                        value={form.anamnesis}
                        onChange={(e) => setForm({...form, anamnesis: e.target.value})}
                        className="vp-input-field text-sm sm:px-4 sm:py-3 min-h-[80px] sm:min-h-[100px]"
                        placeholder="Histórico do problema atual, duração, sintomas associados, etc."
                      />
                    </div>

                    {getSpeciesSpecificFields()}

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Avaliacao Clinica
                      </label>
                      <textarea
                        value={form.clinicalAssessment}
                        onChange={(e) => setForm({...form, clinicalAssessment: e.target.value})}
                        className="vp-input-field text-sm sm:px-4 sm:py-3 min-h-[80px] sm:min-h-[100px]"
                        placeholder="Exame fisico, sinais vitais, achados relevantes"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Diagnostico
                      </label>
                      <textarea
                        value={form.diagnosis}
                        onChange={(e) => setForm({...form, diagnosis: e.target.value})}
                        className="vp-input-field text-sm sm:px-4 sm:py-3 min-h-[60px] sm:min-h-[80px]"
                        placeholder="Diagnostico provisório ou definitivo"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Conduta / Tratamento
                      </label>
                      <textarea
                        value={form.treatment}
                        onChange={(e) => setForm({...form, treatment: e.target.value})}
                        className="vp-input-field text-sm sm:px-4 sm:py-3 min-h-[80px] sm:min-h-[100px]"
                        placeholder="Medicações prescritas, procedimentos realizados, orientações"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Observacoes
                      </label>
                      <textarea
                        value={form.observations}
                        onChange={(e) => setForm({...form, observations: e.target.value})}
                        className="vp-input-field text-sm sm:px-4 sm:py-3 min-h-[60px] sm:min-h-[80px]"
                        placeholder="Observacoes adicionais, recomendações para o tutor, etc."
                      />
                    </div>
                  </div>
                </details>

                <details className="rounded-xl border border-gray-200 p-4 sm:p-5">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-800">
                    Anexos e documentos
                  </summary>
                  <div className="mt-3">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Anexar Exames ou Documentos
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-6 text-center hover:border-emerald-400 transition-colors">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        multiple
                        className="hidden"
                        id="file-upload"
                        accept="image/*,.pdf,.jpg,.jpeg,.png"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center justify-center"
                      >
                        <div className="mb-2 sm:mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                          <AppIcon name="paperclip" />
                        </div>
                        <p className="text-gray-600 font-medium text-xs sm:text-sm">
                          {selectedFiles.length > 0 
                            ? `${selectedFiles.length} arquivo(s) selecionado(s)` 
                            : "Clique para anexar arquivos ou arraste e solte aqui"}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                          Suporta imagens (JPG, PNG) e PDFs. Máximo de 10MB por arquivo.
                        </p>
                      </label>
                    </div>
                    
                    {selectedFiles.length > 0 && (
                      <div className="mt-3 sm:mt-4 space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div 
                            key={index} 
                            className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center space-x-2 sm:space-x-3">
                              <span className="text-xl sm:text-2xl">
                                {file.type.startsWith('image/') ? '🖼️' : '📄'}
                              </span>
                              <div>
                                <p className="font-medium text-[10px] sm:text-xs truncate max-w-[150px] sm:max-w-xs">{file.name}</p>
                                <p className="text-[8px] sm:text-xs text-gray-500">
                                  {(file.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                              className="text-gray-400 hover:text-red-500 text-lg"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>

                <div className="flex flex-col sm:flex-row sm:justify-between space-y-2 sm:space-y-0 sm:space-x-3 pt-3 sm:pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="w-full sm:w-auto bg-gray-200 dark:bg-dark-700 text-gray-800 dark:text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl hover:bg-gray-300 dark:hover:bg-dark-600 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPreviewMode(true)}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
                  >
                    Visualizar e Salvar
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

ConsultationForm.propTypes = {
  consultation: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    patientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    date: PropTypes.string,
    veterinarianName: PropTypes.string,
    veterinarianCRMV: PropTypes.string,
    chiefComplaint: PropTypes.string,
    anamnesis: PropTypes.string,
    clinicalAssessment: PropTypes.string,
    diagnosis: PropTypes.string,
    treatment: PropTypes.string,
    observations: PropTypes.string,
    recordNumber: PropTypes.string,
    template: PropTypes.string,
    vaccinationStatus: PropTypes.string,
    deworming: PropTypes.string,
    diet: PropTypes.string,
    housing: PropTypes.string,
    managementType: PropTypes.string,
    useType: PropTypes.string,
    hoofCare: PropTypes.string,
    productionSystem: PropTypes.string,
    herdBatch: PropTypes.string,
    animalIdentification: PropTypes.string,
    herdHealthStatus: PropTypes.string,
    birdType: PropTypes.string,
    files: PropTypes.array
  }),
  patients: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    species: PropTypes.string,
    subcategory: PropTypes.string,
    breed: PropTypes.string,
    age: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    ownerName: PropTypes.string,
    ownerPhone: PropTypes.string,
    ownerEmail: PropTypes.string
  })).isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  currentUser: PropTypes.shape({
    name: PropTypes.string,
    crmvState: PropTypes.string,
    crmvNumber: PropTypes.string,
    clinicName: PropTypes.string,
    clinicAddress: PropTypes.string,
    signaturePreview: PropTypes.string
  }),
  isPreviewMode: PropTypes.bool.isRequired,
  setIsPreviewMode: PropTypes.func.isRequired,
  selectedFiles: PropTypes.array,
  setSelectedFiles: PropTypes.func
};

ConsultationForm.defaultProps = {
  consultation: null,
  currentUser: null,
  selectedFiles: [],
  setSelectedFiles: () => {}
};

export default ConsultationForm;

              {fieldErrors.patientId && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.patientId}
                </p>
              )}
