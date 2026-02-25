import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import Input from './Input';
import Select from './Select';
import DatePicker from './DatePicker';
import { patientSchema } from '../utils/validationSchemas';
import { formatPhone } from '../utils/validationSchemas';

// Mapeamento de porte por subcategoria
const porteMap = {
  // Grande porte
  "Equino": "Grande",
  "Bovino": "Grande",
  "Suíno": "Grande",
  // Médio porte
  "Caprino": "Médio",
  "Ovino": "Médio",
  // Pequeno porte
  "Canino": "Pequeno",
  "Felino": "Pequeno",
};

// Função para calcular idade a partir da data de nascimento
const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  
  const today = new Date();
  const birth = new Date(birthDate);
  
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  
  // Ajusta se o mês de nascimento ainda não passou este ano
  if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
    years--;
    months += 12;
  }
  
  // Ajusta se o dia ainda não passou neste mês
  if (today.getDate() < birth.getDate()) {
    months--;
    if (months < 0) months += 12;
  }
  
  // Retorna objeto com idade formatada (anos e meses) e número
  if (years > 0 && months > 0) {
    return { 
      formatted: `${years} Ano${years > 1 ? 's' : ''}, ${months} Mês${months > 1 ? 'es' : ''}`, 
      numeric: years 
    };
  } else if (years > 0) {
    return { 
      formatted: `${years} Ano${years > 1 ? 's' : ''}`, 
      numeric: years 
    };
  } else if (months > 0) {
    return { 
      formatted: `${months} Mês${months > 1 ? 'es' : ''}`, 
      numeric: 0 
    };
  } else {
    return { formatted: 'Recém-nascido', numeric: 0 };
  }
};

const PatientForm = ({ patient, onSubmit, onCancel, isEditing }) => {
  const [calculatedAge, setCalculatedAge] = useState(null);
  
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
    control,
    setError,
    clearErrors,
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
  const selectedSubcategory = watch("subcategory");
  const birthDateValue = watch("birthDate");

  // Effect para calcular idade automaticamente quando a data de nascimento muda
  useEffect(() => {
    if (birthDateValue) {
      const ageResult = calculateAge(birthDateValue);
      if (ageResult) {
        setCalculatedAge(ageResult);
        // Define o valor numérico para o campo age (para o backend)
        setValue("age", ageResult.numeric, { shouldValidate: true });
      }
    } else {
      setCalculatedAge(null);
    }
  }, [birthDateValue, setValue]);

  // Effect para calcular porte automaticamente baseado na subcategoria
  useEffect(() => {
    if (selectedSubcategory && porteMap[selectedSubcategory]) {
      const porteCalculado = porteMap[selectedSubcategory];
      setValue("porte", porteCalculado, { shouldValidate: true });
    }
  }, [selectedSubcategory, setValue]);

  // Handler para formatar telefone em tempo real
  const handlePhoneChange = (e, fieldName) => {
    const formatted = formatPhone(e.target.value);
    setValue(fieldName, formatted, { shouldValidate: false });
  };

  // Handler para quando o usuário digita manualmente a idade
  const handleAgeChange = (e) => {
    // Limpa o erro de birthDate se o usuário começar a digitar idade manualmente
    if (birthDateValue) {
      clearErrors("birthDate");
    }
    setCalculatedAge(null);
    // Aceita o valor digitado (pode ser string ou número)
    const value = e.target.value;
    // Tenta converter para número se for possível
    const numericValue = parseInt(value);
    if (!isNaN(numericValue)) {
      setValue("age", numericValue, { shouldValidate: true });
    } else {
      setValue("age", value, { shouldValidate: true });
    }
  };

  const onFormSubmit = (data) => {
    console.log("Form submitted with data:", data);
    // Garante que age e weight sejam números para o backend
    const submissionData = {
      ...data,
      age: typeof data.age === 'string' ? parseInt(data.age) || null : data.age,
      weight: typeof data.weight === 'string' ? parseFloat(data.weight) || null : data.weight,
      porte: data.porte ? data.porte.toLowerCase() : null,
    };
    console.log("Data to submit:", submissionData);
    onSubmit(submissionData);
  };

  const handleButtonClick = async () => {
    console.log("Button clicked!");
    // Validar todos os campos primeiro
    const isValid = await trigger();
    console.log("Validation result:", isValid);
    
    if (isValid) {
      const data = getValues();
      console.log("Raw form data:", JSON.stringify(data));
      
      // Garante que age e weight sejam números para o backend, e porte em minúsculo
      const submissionData = {
        ...data,
        age: data.age ? (typeof data.age === 'string' ? parseInt(data.age, 10) || null : data.age) : null,
        weight: data.weight ? (typeof data.weight === 'string' ? parseFloat(data.weight) || null : data.weight) : null,
        porte: data.porte ? String(data.porte).toLowerCase() : null,
      };
      console.log("Form data after conversion:", JSON.stringify(submissionData));
      onSubmit(submissionData);
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
              
              {/* DatePicker com Controller para react-hook-form */}
              <Controller
                name="birthDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Data de Nascimento"
                    value={field.value || ""}
                    onChange={(value) => field.onChange(value)}
                    error={errors.birthDate?.message}
                    allowFutureDates={false}
                  />
                )}
              />
              
              {/* Campo de idade - calculado automaticamente ou manual */}
              <div>
                <Input
                  label="Idade"
                  placeholder={calculatedAge ? calculatedAge.formatted : "Ex: 3 Anos, 6 Meses"}
                  value={calculatedAge ? calculatedAge.numeric : undefined}
                  error={errors.age?.message}
                  onChange={handleAgeChange}
                />
                {calculatedAge && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    ✨ Calculado automaticamente
                  </p>
                )}
              </div>
              
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
              
              <div>
                <Select
                  label="Porte"
                  options={porteOptions}
                  error={errors.porte?.message}
                  {...register("porte")}
                />
                {selectedSubcategory && porteMap[selectedSubcategory] && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    ✨ Calculado automaticamente para {selectedSubcategory}
                  </p>
                )}
              </div>
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
