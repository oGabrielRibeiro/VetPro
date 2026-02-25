import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import Input from './Input';
import Select from './Select';
import DatePicker from './DatePicker';
import FeedbackBanner from "./FeedbackBanner";
import { patientSchema } from '../utils/validationSchemas';
import { formatPhone } from '../utils/validationSchemas';

const PatientForm = ({ patient, onSubmit, onCancel, isEditing }) => {
  const speciesOptions = [
    { value: "Mamífero", label: "Mamífero" },
    { value: "Ave", label: "Ave" },
    { value: "Réptil", label: "Réptil" },
    { value: "Peixe", label: "Peixe" },
    { value: "Anfíbio", label: "Anfíbio" },
    { value: "Outro", label: "Outro" },
  ];

  const subcategoryOptions = [
    { value: "Canino", label: "Canino" },
    { value: "Felino", label: "Felino" },
    { value: "Equino", label: "Equino" },
    { value: "Bovino", label: "Bovino" },
    { value: "Caprino", label: "Caprino" },
    { value: "Ovino", label: "Ovino" },
    { value: "Suíno", label: "Suíno" },
    { value: "Outro", label: "Outro" },
  ];

  const sexOptions = [
    { value: "Macho", label: "Macho" },
    { value: "Fêmea", label: "Fêmea" },
  ];

  const porteOptions = [
    { value: "Pequeno", label: "Pequeno" },
    { value: "Médio", label: "Médio" },
    { value: "Grande", label: "Grande" },
    { value: "Gigante", label: "Gigante" },
  ];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(patientSchema),
    defaultValues: patient || {
      name: "",
      species: "",
      subcategory: "",
      breed: "",
      sex: "",
      age: "",
      birthDate: "",
      weight: "",
      color: "",
      microchip: "",
      porte: "",
      ownerName: "",
      ownerPhone: "",
      ownerAltPhone: "",
      ownerEmail: "",
      ownerAddress: "",
    },
  });

  const selectedSpecies = watch("species");

  // Handler para formatar telefone em tempo real
  const handlePhoneChange = (e, fieldName) => {
    const formatted = formatPhone(e.target.value);
    setValue(fieldName, formatted, { shouldValidate: false });
  };

  const onFormSubmit = (data) => {
    console.log("Form submitted with data:", data);
    onSubmit(data);
  };

  const handleButtonClick = async () => {
    console.log("Button clicked!");
    // Validar todos os campos primeiro
    const isValid = await trigger();
    console.log("Validation result:", isValid);
    
    if (isValid) {
      const data = getValues();
      console.log("Form data after validation:", data);
      onSubmit(data);
    } else {
      console.log("Form has validation errors, not submitting");
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-28 sm:pb-24">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">
        {isEditing ? "Editar Paciente" : "Novo Paciente"}
      </h1>
      
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
        <form className="space-y-4 sm:space-y-6">
          {/* Seção: Identificação do Paciente */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Dados do Paciente</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do Paciente"
                placeholder="Ex: Rex, Mia"
                required
                error={errors.name?.message}
                {...register("name")}
              />
              
              <Select
                label="Espécie"
                options={speciesOptions}
                required
                error={errors.species?.message}
                {...register("species")}
              />
              
              {selectedSpecies === "Mamífero" && (
                <Select
                  label="Subcategoria"
                  options={subcategoryOptions}
                  required
                  error={errors.subcategory?.message}
                  {...register("subcategory")}
                />
              )}
              
              <Input
                label="Raça"
                placeholder="Ex: Labrador, Siamês"
                required
                error={errors.breed?.message}
                {...register("breed")}
              />
              
              <Select
                label="Sexo"
                options={sexOptions}
                error={errors.sex?.message}
                {...register("sex")}
              />
              
              <Input
                label="Idade"
                placeholder="Ex: 3 anos, 6 meses"
                required
                error={errors.age?.message}
                {...register("age")}
              />
              
              <DatePicker
                label="Data de Nascimento"
                error={errors.birthDate?.message}
                {...register("birthDate")}
              />
              
              <Input
                label="Peso (kg)"
                placeholder="Ex: 15.5"
                type="number"
                step="0.1"
                error={errors.weight?.message}
                {...register("weight")}
              />
              
              <Input
                label="Cor"
                placeholder="Ex: Preto, Branco"
                error={errors.color?.message}
                {...register("color")}
              />
              
              <Input
                label="Microchip"
                placeholder="Número do microchip"
                error={errors.microchip?.message}
                {...register("microchip")}
              />
              
              <Select
                label="Porte"
                options={porteOptions}
                error={errors.porte?.message}
                {...register("porte")}
              />
            </div>
          </div>

          {/* Seção: Dados do Tutor */}
          <div className="pt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Dados do Tutor</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do Tutor"
                placeholder="Nome completo do responsável"
                required
                error={errors.ownerName?.message}
                {...register("ownerName")}
              />
              
              <Input
                label="Telefone"
                placeholder="(11) 99999-9999"
                error={errors.ownerPhone?.message}
                {...register("ownerPhone", {
                  onChange: (e) => handlePhoneChange(e, "ownerPhone"),
                })}
              />
              
              <Input
                label="Telefone Alternativo"
                placeholder="(11) 99999-9999"
                error={errors.ownerAltPhone?.message}
                {...register("ownerAltPhone", {
                  onChange: (e) => handlePhoneChange(e, "ownerAltPhone"),
                })}
              />
              
              <Input
                label="E-mail"
                type="email"
                placeholder="tutor@email.com"
                error={errors.ownerEmail?.message}
                {...register("ownerEmail")}
              />
              
              <div className="md:col-span-2">
                <Input
                  label="Endereço"
                  placeholder="Endereço completo"
                  error={errors.ownerAddress?.message}
                  {...register("ownerAddress")}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleButtonClick}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-700 hover:shadow-lg text-white font-bold transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Salvando..." : (isEditing ? "Atualizar Paciente" : "Cadastrar Paciente")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientForm;
