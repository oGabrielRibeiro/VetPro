import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "./Input";
import Select from "./Select";
import DatePicker from "./DatePicker";
import { patientSchema, formatPhone } from "../utils/validationSchemas";

const porteMap = {
  Equino: "Grande",
  Bovino: "Grande",
  "Suíno": "Grande",
  Caprino: "Médio",
  Ovino: "Médio",
  Canino: "Pequeno",
  Felino: "Pequeno",
};

const normalizePorteForApi = (value) => {
  const raw = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  if (!raw) return null;
  if (raw === "pequeno") return "pequeno";
  if (raw === "medio") return "pequeno";
  if (raw === "grande") return "grande";
  if (raw === "gigante") return "grande";
  return null;
};

const calculateAge = (birthDate) => {
  if (!birthDate) return null;

  const today = new Date();
  const birth = new Date(birthDate);

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();

  if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
    years -= 1;
    months += 12;
  }

  if (today.getDate() < birth.getDate()) {
    months -= 1;
    if (months < 0) months += 12;
  }

  if (years > 0 && months > 0) {
    return {
      formatted: `${years} Ano${years > 1 ? "s" : ""}, ${months} Mês${months > 1 ? "es" : ""}`,
      numeric: years,
    };
  }

  if (years > 0) {
    return {
      formatted: `${years} Ano${years > 1 ? "s" : ""}`,
      numeric: years,
    };
  }

  if (months > 0) {
    return {
      formatted: `${months} Mês${months > 1 ? "es" : ""}`,
      numeric: 0,
    };
  }

  return { formatted: "Recém-nascido", numeric: 0 };
};

const PatientForm = ({ patient, onSubmit, onCancel, isEditing }) => {
  const [calculatedAge, setCalculatedAge] = useState(null);
  const [ownerGeoLoading, setOwnerGeoLoading] = useState(false);
  const [ownerGeoError, setOwnerGeoError] = useState("");

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
    watch,
    setValue,
    trigger,
    getValues,
    control,
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

  useEffect(() => {
    if (!birthDateValue) {
      setCalculatedAge(null);
      return;
    }

    const ageResult = calculateAge(birthDateValue);
    if (ageResult) {
      setCalculatedAge(ageResult);
      setValue("age", ageResult.numeric, { shouldValidate: true });
    }
  }, [birthDateValue, setValue]);

  const handleOwnerGeolocation = async () => {
    if (!navigator.geolocation) {
      setOwnerGeoError("Geolocalizacao nao suportada neste navegador.");
      return;
    }
    setOwnerGeoLoading(true);
    setOwnerGeoError("");

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);

      // Buscar endereço via Nominatim (OpenStreetMap - gratuito, sem API key)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': 'pt-BR'
          }
        }
      );

      if (!response.ok) {
        throw new Error("Falha ao buscar endereço");
      }

      const data = await response.json();
      const address = data.address;

      // Formatar endereço brasileiro
      const enderecoFormatado = [
        address.road || "",
        address.house_number || "",
        address.neighbourhood || "",
        address.suburb || "",
        address.city || address.town || "",
        address.state || "",
        address.postcode || "",
      ]
        .filter(Boolean)
        .join(", ");

      setValue("ownerAddress", enderecoFormatado || `Lat ${lat}, Long ${lng}`, {
        shouldValidate: true,
      });
      setOwnerGeoLoading(false);
    } catch (error) {
      console.error("Erro na geolocalização:", error);
      // Fallback: usar coordenadas se falhar
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      setValue("ownerAddress", `Lat ${lat}, Long ${lng}`, {
        shouldValidate: true,
      });
      setOwnerGeoLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSubcategory && porteMap[selectedSubcategory]) {
      setValue("porte", porteMap[selectedSubcategory], { shouldValidate: true });
    }
  }, [selectedSubcategory, setValue]);

  const handlePhoneChange = (e, fieldName) => {
    const formatted = formatPhone(e.target.value);
    setValue(fieldName, formatted, { shouldValidate: false });
  };

  const handleAgeChange = (e) => {
    if (birthDateValue) clearErrors("birthDate");
    setCalculatedAge(null);

    const value = e.target.value;
    const numericValue = parseInt(value, 10);
    setValue("age", Number.isNaN(numericValue) ? value : numericValue, {
      shouldValidate: true,
    });
  };

  const handleButtonClick = async () => {
    const isValid = await trigger();
    if (!isValid) return;

    const data = getValues();
    const submissionData = {
      ...data,
      age: data.age
        ? typeof data.age === "string"
          ? parseInt(data.age, 10) || null
          : data.age
        : null,
      weight: data.weight
        ? typeof data.weight === "string"
          ? parseFloat(data.weight) || null
          : data.weight
        : null,
      porte: normalizePorteForApi(data.porte),
    };

    onSubmit(submissionData);
  };

  return (
    <div className="max-w-2xl mx-auto pb-28 sm:pb-24 subtle-enter space-y-4">
      <section className="shell-surface surface-static rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
          Cadastro clinico
        </p>
        <h1 className="shell-title mt-1 text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
          {isEditing ? "Editar paciente" : "Novo paciente"}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Preencha dados essenciais para iniciar prontuarios e agenda.
        </p>
      </section>

      <div className="shell-surface surface-static rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-4 sm:p-6">
        <form className="space-y-4 sm:space-y-6">
          <div className="border-b border-gray-200 dark:border-dark-700 pb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
              Dados do Paciente
            </h3>

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

              <div>
                <Input
                  label="Idade"
                  placeholder={
                    calculatedAge ? calculatedAge.formatted : "Ex: 3 Anos, 6 Meses"
                  }
                  value={calculatedAge ? calculatedAge.numeric : undefined}
                  error={errors.age?.message}
                  onChange={handleAgeChange}
                />
                {calculatedAge && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    Calculado automaticamente
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
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    Calculado automaticamente para {selectedSubcategory}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
              Dados do Tutor
            </h3>

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
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="vp-label">Endereço</label>
                  <button
                    type="button"
                    onClick={handleOwnerGeolocation}
                    disabled={ownerGeoLoading}
                    className="btn btn-neutral btn-xs"
                  >
                    {ownerGeoLoading ? "Localizando..." : "Usar geolocalizacao"}
                  </button>
                </div>
                <input
                  className={`vp-input ${
                    errors.ownerAddress?.message
                      ? "border-red-300 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.22)]"
                      : ""
                  }`}
                  placeholder="Endereço completo"
                  {...register("ownerAddress", {
                    onChange: () => ownerGeoError && setOwnerGeoError(""),
                  })}
                />
                {(errors.ownerAddress?.message || ownerGeoError) && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.ownerAddress?.message || ownerGeoError}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-700">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="btn btn-neutral btn-lg w-full sm:w-auto disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleButtonClick}
              className="btn btn-success btn-lg w-full sm:w-auto disabled:opacity-50"
            >
              {isSubmitting
                ? "Salvando..."
                : isEditing
                  ? "Atualizar Paciente"
                  : "Cadastrar Paciente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

PatientForm.propTypes = {
  patient: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    species: PropTypes.string,
    subcategory: PropTypes.string,
    breed: PropTypes.string,
    sex: PropTypes.string,
    age: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    birthDate: PropTypes.string,
    weight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    color: PropTypes.string,
    microchip: PropTypes.string,
    porte: PropTypes.string,
    ownerName: PropTypes.string,
    ownerPhone: PropTypes.string,
    ownerAltPhone: PropTypes.string,
    ownerEmail: PropTypes.string,
    ownerAddress: PropTypes.string
  }),
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isEditing: PropTypes.bool
};

PatientForm.defaultProps = {
  patient: null,
  isEditing: false
};

export default PatientForm;
