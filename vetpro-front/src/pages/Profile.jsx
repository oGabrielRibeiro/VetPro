import React, { useEffect, useMemo, useState } from "react";
import FeedbackBanner from "../components/FeedbackBanner";
import AppIcon from "../components/AppIcon";
import ConfirmDialog from "../components/ConfirmDialog";
import { VpButton } from "../components/ui";
import TwoFactorSetup from "../components/TwoFactorSetup";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  crmvNumber: "",
  crmvState: "",
  specialty: "",
  clinicName: "",
  clinicAddress: "",
  clinicCNPJ: "",
  clinicPhone: "",
  clinicEmail: "",
  clinicPrescriptionTemplate: "classic",
  profilePhotoPreview: "",
  signaturePreview: "",
  clinicLogoPreview: "",
  profilePhotoFile: null,
  signatureFile: null,
  clinicLogoFile: null,
};

function parseCrmv(raw = "") {
  const value = String(raw || "").trim();
  if (!value) return { crmvState: "", crmvNumber: "" };
  const [state, number] = value.split("-").map((part) => part.trim());
  if (number) return { crmvState: state, crmvNumber: number };
  return { crmvState: "", crmvNumber: state || "" };
}

function buildInitialForm(profile = {}) {
  const parsed = parseCrmv(profile.crmv || profile.crmvNumber);

  return {
    ...emptyForm,
    ...profile,
    name: profile.name || "",
    email: profile.email || "",
    phone: profile.phone || "",
    crmvNumber: profile.crmvNumber || parsed.crmvNumber || "",
    crmvState: profile.crmvState || parsed.crmvState || "",
    specialty: profile.specialty || "",
    clinicName: profile.clinicName || profile.clinic?.name || "",
    clinicAddress:
      profile.clinicAddress ?? profile.clinic?.address ?? "",
    clinicCNPJ: profile.clinicCNPJ ?? profile.clinic?.cnpj ?? "",
    clinicPhone: profile.clinicPhone ?? profile.clinic?.phone ?? "",
    clinicEmail: profile.clinicEmail ?? profile.clinic?.email ?? "",
    clinicPrescriptionTemplate:
      profile.clinicPrescriptionTemplate ||
      profile.clinic?.prescriptionTemplate ||
      "classic",
    clinicLogoPreview:
      profile.clinicLogoPreview ||
      profile.clinic?.logoUrl ||
      "",
    profilePhotoPreview:
      profile.profilePhotoPreview || profile.profilePhoto || "",
    signaturePreview:
      profile.signaturePreview || profile.signature || "",
    profilePhotoFile: null,
    signatureFile: null,
    clinicLogoFile: null,
  };
}

const Profile = ({
  profile,
  onSave,
  onCancel,
  onDeleteAccount,
  onBack,
  forceCompletion = false,
}) => {
  const [form, setForm] = useState(buildInitialForm(profile));
  const [clinicLogoFileName, setClinicLogoFileName] = useState("");
  const [formError, setFormError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clinicGeoLoading, setClinicGeoLoading] = useState(false);
  const [clinicGeoError, setClinicGeoError] = useState("");
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(profile?.twoFactorEnabled || false);

  useEffect(() => {
    setForm(buildInitialForm(profile));
    setClinicLogoFileName("");
    setClinicGeoError("");
  }, [profile]);

  const initials = useMemo(() => {
    const safeName = String(form.name || "").trim();
    if (!safeName) return "U";
    return safeName.charAt(0).toUpperCase();
  }, [form.name]);

  const handleClinicGeolocation = () => {
    if (!navigator.geolocation) {
      setClinicGeoError("Geolocalizacao nao suportada neste navegador.");
      return;
    }
    setClinicGeoLoading(true);
    setClinicGeoError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setForm((prev) => ({
          ...prev,
          clinicAddress: `Lat ${lat}, Long ${lng}`,
        }));
        setClinicGeoLoading(false);
      },
      () => {
        setClinicGeoError(
          "Nao foi possivel obter a localizacao. Verifique as permissoes.",
        );
        setClinicGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({
        ...prev,
        profilePhotoPreview: reader.result,
        profilePhotoFile: file,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({
        ...prev,
        signaturePreview: reader.result,
        signatureFile: file,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleClinicLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setClinicLogoFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({
        ...prev,
        clinicLogoPreview: reader.result,
        clinicLogoFile: file,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const name = String(form.name || "").trim();
    const email = String(form.email || "").trim();
    const crmvNumber = String(form.crmvNumber || "").trim();
    const crmvState = String(form.crmvState || "").trim();

    if (!name || !email || !crmvNumber || !crmvState) {
      setFormError(
        "Preencha Nome, E-mail, CRMV e estado do CRMV para salvar o perfil."
      );
      return;
    }

    setSaveLoading(true);
    try {
      await onSave?.({
        ...form,
        name,
        email,
        crmvNumber,
        crmvState,
      });
    } catch (err) {
      setFormError("Nao foi possivel salvar o perfil. Verifique os dados e tente novamente.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");
    setDeleteLoading(true);
    try {
      await onDeleteAccount?.();
      setShowDeleteModal(false);
    } catch (err) {
      setDeleteError(
        "Nao foi possivel excluir sua conta. Tente novamente mais tarde.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="vp-page subtle-enter">
      {onBack && !forceCompletion && (
        <div className="flex justify-end">
          <VpButton
            onClick={onBack}
            variant="neutral"
            size="sm"
            icon={<AppIcon name="back" className="h-3.5 w-3.5" />}
            className="text-xs"
          >
            Voltar
          </VpButton>
        </div>
      )}

      <section className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-3 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="vp-overline">
              Configuracoes
            </p>
            <h1 className="vp-h1 mt-1">
              Meu perfil
            </h1>
            <p className="vp-subtitle mt-1">
              Ajuste dados pessoais, assinatura e informacoes da clinica.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:space-x-3 sm:gap-0 w-full sm:w-auto">
          <VpButton
            onClick={onCancel}
            disabled={saveLoading || forceCompletion}
            variant="danger"
            icon={<AppIcon name="cancel" className="h-4 w-4" />}
          >
            Cancelar
          </VpButton>
          <VpButton
            type="button"
            onClick={handleSubmit}
            loading={saveLoading}
            variant="success"
            icon={<AppIcon name="save" className="h-4 w-4" />}
          >
            Salvar
          </VpButton>
          </div>
        </div>
      </section>

      {forceCompletion && (
        <FeedbackBanner
          className="mb-4"
          type="error"
          message="Cadastro incompleto. Preencha os campos obrigatorios para liberar o uso do sistema."
        />
      )}

      <FeedbackBanner
        className="mb-4"
        type="error"
        message={formError}
        onClose={() => setFormError("")}
      />
      <FeedbackBanner
        className="mb-4"
        type="error"
        message={deleteError}
        onClose={() => setDeleteError("")}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Data */}
        <div className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 overflow-hidden">
          <div className="bg-white/65 dark:bg-dark-900/45 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-dark-700">
            <h2 className="vp-h2 text-gray-800 dark:text-white">Dados Pessoais</h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-6">
              <div className="flex-shrink-0 mb-4 sm:mb-0">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-emerald-50 border-2 border-dashed border-emerald-100 flex items-center justify-center overflow-hidden text-emerald-700">
                  {form.profilePhotoPreview ? (
                    <img
                      src={form.profilePhotoPreview}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl sm:text-4xl font-bold">
                      {initials}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Foto de Perfil
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoChange}
                    className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="vp-input-field text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      E-mail <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className="vp-input-field text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      className="vp-input-field text-sm"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Data */}
        <div className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 overflow-hidden">
          <div className="bg-white/65 dark:bg-dark-900/45 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-dark-700">
            <h2 className="vp-h2 text-gray-800 dark:text-white">Dados Profissionais</h2>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Numero do CRMV <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.crmvNumber}
                  onChange={(e) =>
                    setForm({ ...form, crmvNumber: e.target.value })
                  }
                  className="vp-input-field text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estado do CRMV <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.crmvState}
                  onChange={(e) =>
                    setForm({ ...form, crmvState: e.target.value })
                  }
                  className="vp-input-field text-sm"
                  required
                >
                  <option value="">Selecione</option>
                  {[
                    "AC",
                    "AL",
                    "AP",
                    "AM",
                    "BA",
                    "CE",
                    "DF",
                    "ES",
                    "GO",
                    "MA",
                    "MT",
                    "MS",
                    "MG",
                    "PA",
                    "PB",
                    "PR",
                    "PE",
                    "PI",
                    "RJ",
                    "RN",
                    "RS",
                    "RO",
                    "RR",
                    "SC",
                    "SP",
                    "SE",
                    "TO",
                  ].map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Especialidade
              </label>
              <input
                type="text"
                value={form.specialty}
                onChange={(e) =>
                  setForm({ ...form, specialty: e.target.value })
                }
                className="vp-input-field text-sm"
                placeholder="Ex: Clinica Geral, Dermatologia, Cardiologia"
              />
            </div>

            <div className="border-t border-gray-200 dark:border-dark-700 pt-4 mt-4 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="vp-h3 text-gray-800 dark:text-white">Dados da Clinica</h3>
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 rounded-lg bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-600 flex items-center justify-center overflow-hidden">
                    {form.clinicLogoPreview ? (
                      <img
                        src={form.clinicLogoPreview}
                        alt="Logo da clinica"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">Logo</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Logo da clinica
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleClinicLogoChange}
                      className="hidden"
                      id="clinic-logo-upload"
                    />
                    <label
                      htmlFor="clinic-logo-upload"
                      className="cursor-pointer inline-block rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      Selecionar logo
                    </label>
                    <p className="vp-helper mt-1 text-gray-500 dark:text-gray-400">
                      {clinicLogoFileName || (form.clinicLogoPreview ? "Logo carregada" : "Nenhum arquivo selecionado")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome da Clinica <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.clinicName}
                    onChange={(e) =>
                      setForm({ ...form, clinicName: e.target.value })
                    }
                    className="vp-input-field text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CNPJ (opcional)
                  </label>
                  <input
                    type="text"
                    value={form.clinicCNPJ}
                    onChange={(e) =>
                      setForm({ ...form, clinicCNPJ: e.target.value })
                    }
                    className="vp-input-field text-sm"
                    placeholder="00.000.000/0001-00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefone da clinica
                  </label>
                  <input
                    type="text"
                    value={form.clinicPhone}
                    onChange={(e) =>
                      setForm({ ...form, clinicPhone: e.target.value })
                    }
                    className="vp-input-field text-sm"
                    placeholder="(11) 3333-4444"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    E-mail da clinica
                  </label>
                  <input
                    type="email"
                    value={form.clinicEmail}
                    onChange={(e) =>
                      setForm({ ...form, clinicEmail: e.target.value })
                    }
                    className="vp-input-field text-sm"
                    placeholder="contato@clinica.com"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Template de receita
                  </label>
                  <select
                    value={form.clinicPrescriptionTemplate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        clinicPrescriptionTemplate: e.target.value,
                      })
                    }
                    className="vp-input-field text-sm"
                  >
                    <option value="classic">Classico</option>
                    <option value="compact">Compacto</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    Endereco da clinica
                  </label>
                  <button
                    type="button"
                    onClick={handleClinicGeolocation}
                    disabled={clinicGeoLoading}
                    className="btn btn-neutral btn-xs"
                  >
                    {clinicGeoLoading ? "Localizando..." : "Usar geolocalizacao"}
                  </button>
                </div>
                <textarea
                  value={form.clinicAddress}
                  onChange={(e) =>
                    setForm({ ...form, clinicAddress: e.target.value })
                  }
                  className="vp-input-field text-sm min-h-[60px]"
                  placeholder="Rua, numero, bairro, cidade e estado"
                />
                {clinicGeoError && (
                  <p className="mt-1 text-xs text-red-500">{clinicGeoError}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 overflow-hidden">
          <div className="bg-white/65 dark:bg-dark-900/45 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-dark-700">
            <h2 className="vp-h2 text-gray-800 dark:text-white">Assinatura Digital</h2>
          </div>
          <div className="p-4 sm:p-6">
            <p className="vp-subtitle text-gray-600 dark:text-gray-300 mb-4">
              Esta assinatura sera usada automaticamente na exportacao dos prontuarios em PDF.
            </p>

            <div className="border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-xl p-6 sm:p-8 text-center">
              {form.signaturePreview ? (
                <div className="max-w-xs mx-auto">
                  <img
                    src={form.signaturePreview}
                    alt="Assinatura"
                    className="w-full h-auto object-contain"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        signaturePreview: "",
                        signatureFile: null,
                      }))
                    }
                    className="mt-3 text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Remover assinatura
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-5xl mb-4"><AppIcon name="signature" className="h-12 w-12" /></div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Carregue uma imagem da sua assinatura para uso nos prontuarios
                  </p>

                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureChange}
                      className="hidden"
                      id="signature-upload"
                    />
                    <label
                      htmlFor="signature-upload"
                      className="cursor-pointer inline-block bg-emerald-50 text-emerald-700 font-medium py-2 px-4 rounded-lg hover:bg-emerald-100 transition-colors text-sm"
                    >
                      Carregar imagem da assinatura
                    </label>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">
                      Formatos suportados: PNG, JPG, JPEG. Recomendado fundo transparente.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
      <div className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 overflow-hidden">
        <div className="bg-white/65 dark:bg-dark-900/45 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-dark-700">
          <h2 className="vp-h2 text-gray-800 dark:text-white">Seguranca</h2>
        </div>
        <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="vp-h3 text-gray-800 dark:text-white">
              Autenticacao de dois fatores (2FA)
            </p>
            <p className="vp-helper text-gray-600 dark:text-gray-400">
              Status: {twoFAEnabled ? "Ativado" : "Desativado"}
            </p>
          </div>
          <VpButton
            type="button"
            onClick={() => setShowTwoFactorModal(true)}
            variant={twoFAEnabled ? "neutral" : "success"}
          >
            {twoFAEnabled ? "Gerenciar 2FA" : "Ativar 2FA"}
          </VpButton>
        </div>
      </div>
        </div>

        {/* Danger Zone */}
        <div className="shell-surface rounded-3xl border border-red-200 dark:border-red-800 overflow-hidden">
          <div className="bg-red-50 dark:bg-red-900/20 px-4 sm:px-6 py-3 sm:py-4 border-b border-red-200 dark:border-red-800">
            <h2 className="vp-h2 text-red-700">Zona de Risco</h2>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-900/15 p-4">
              <p className="vp-h3 text-red-700 dark:text-red-300 mb-1">
                Exclusao permanente
              </p>
              <p className="vp-subtitle text-gray-700 dark:text-gray-300">
                Ao excluir sua conta, todos os dados vinculados a voce serao
                removidos permanentemente.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="vp-helper text-gray-600 dark:text-gray-400">
                Esta acao nao pode ser desfeita.
              </p>
              <VpButton
                type="button"
                onClick={() => setShowDeleteModal(true)}
                disabled={saveLoading}
                variant="danger"
              >
                Excluir minha conta
              </VpButton>
            </div>
          </div>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showDeleteModal}
        title="Confirmar exclusao"
        message="Tem certeza que deseja excluir sua conta? Esta acao e irreversivel e apaga todos os seus dados."
        note='Dica: se quiser apenas sair, use o botao "Sair" no menu.'
        cancelLabel="Cancelar"
        confirmLabel={deleteLoading ? "Excluindo..." : "Excluir conta"}
        confirmVariant="danger"
        loading={deleteLoading}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
      />

      <TwoFactorSetup
        isOpen={showTwoFactorModal}
        onClose={() => setShowTwoFactorModal(false)}
        onVerify={() => setTwoFAEnabled(true)}
        onDisable={() => setTwoFAEnabled(false)}
        twoFAEnabled={twoFAEnabled}
      />
    </div>
  );
};

export default Profile;
