import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import FeedbackBanner from "./components/FeedbackBanner";
import AppIcon from "./components/AppIcon";
import SpeciesIcon from "./components/SpeciesIcon";
import PatientForm from "./components/PatientForm";
import api, { buildApiUrl } from "./services/api";
import { addToQueue } from "./services/offlineQueue";
import { getQueue, clearQueue } from "./services/offlineQueue";
import { toUserFriendlyError } from "./utils/errorMessages";
import { sanitizeConsultationNotesForDisplay } from "./utils/consultationNotes";
import {
  buildReturnConsultationInitialData,
  resolveConsultationContext,
} from "./utils/consultationContext";
import useDarkMode from "./hooks/useDarkMode";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Patients = lazy(() => import("./pages/Patients"));
const Consultations = lazy(() => import("./pages/Consultations"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Reports = lazy(() => import("./pages/Reports"));
const Profile = lazy(() => import("./pages/Profile"));
const QuickConsultation = lazy(() => import("./components/QuickConsultation"));
const FieldModeConsultation = lazy(() =>
  import("./components/FieldModeConsultation"),
);
const ConsultationPreview = lazy(() =>
  import("./components/ConsultationPreview"),
);

const MOBILE_NAV_ITEMS = [
  { id: "dashboard", icon: "dashboard", label: "Inicio" },
  { id: "patients", icon: "patients", label: "Pacientes" },
  { id: "appointments", icon: "appointments", label: "Agenda" },
  { id: "consultations", icon: "consultations", label: "Pront." },
  { id: "profile", icon: "profile", label: "Perfil" },
  { id: "logout", icon: "logout", label: "Sair" },
];

// Componente principal com roteamento baseado em estado
const MainApp = () => {
  const { user, loading, logout, updateProfile } = useAuth();
  const [currentView, setCurrentView] = useState("dashboard");
  const [isMobile, setIsMobile] = useState(false);
  const { isDark, toggleDarkMode } = useDarkMode();

  // Estados para dados
  const [patients, setPatients] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [appointments, setAppointments] = useState([]);

  // Estados para edicao
  const [editingPatient, setEditingPatient] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [currentConsultationPatient, setCurrentConsultationPatient] =
    useState(null);
  const [selectedConsultationPatientId, setSelectedConsultationPatientId] =
    useState("");
  const [returnSourceConsultation, setReturnSourceConsultation] = useState(null);
  const [fieldModeDraftInitialData, setFieldModeDraftInitialData] = useState(null);
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [fieldMode, setFieldMode] = useState(
    () => localStorage.getItem("vetpro_field_mode") === "true",
  );
  const [dataError, setDataError] = useState("");
  const [actionFeedback, setActionFeedback] = useState(null);

  const [currentConsultation, setCurrentConsultation] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // Estados para relatorios
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 5))
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const { isAuthenticated } = useAuth();
  const lazyFallback = (
    <div className="min-h-[220px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
    </div>
  );
 
  const handleToggleFieldMode = () => {
    setFieldMode((prev) => {
      const next = !prev;
      if (currentView === "new-consultation-quick" && next) {
        setCurrentView("new-consultation-field");
      } else if (currentView === "new-consultation-field" && !next) {
        setCurrentView("new-consultation-quick");
      }
      return next;
    });
  };

  const normalizePatient = (patient) => ({
    ...patient,
    species: patient.species || patient.specie || "Não informado",
  });

  const normalizeConsultation = (consultation) => ({
    ...consultation,
    recordNumber:
      consultation.recordNumber ||
      consultation.numeroProntuario ||
      consultation.id,
    date: consultation.date || consultation.createdAt,
    template:
      consultation.template ||
      (consultation.consultationType === "retorno" ? "return" : "general"),
    clinicalAssessment:
      consultation.clinicalAssessment || consultation.physicalExam || "",
    observations: sanitizeConsultationNotesForDisplay(
      consultation.observations || consultation.notes || "",
    ),
  });

  const cleanPersistentValue = (value) => {
    const text = String(value || "").trim();
    if (!text) return "";
    const normalized = text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (normalized === "nao informado" || normalized === "não informado") {
      return "";
    }
    return text;
  };

  const buildPersistentProfileFromPatientForm = (form, existingProfile = {}) => {
    const listFromCsv = (value) =>
      String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    const propertyAndManagementParts = [
      cleanPersistentValue(form.pp_responsavel_local?.value),
      cleanPersistentValue(form.pp_contato_propriedade?.value)
        ? `Contato: ${cleanPersistentValue(form.pp_contato_propriedade?.value)}`
        : "",
      cleanPersistentValue(form.pp_fazenda?.value)
        ? `Fazenda: ${cleanPersistentValue(form.pp_fazenda?.value)}`
        : "",
      cleanPersistentValue(form.pp_endereco_propriedade?.value)
        ? `Endereco: ${cleanPersistentValue(form.pp_endereco_propriedade?.value)}`
        : "",
      cleanPersistentValue(form.pp_tipo_criacao?.value)
        ? `Tipo criacao: ${cleanPersistentValue(form.pp_tipo_criacao?.value)}`
        : "",
      cleanPersistentValue(form.pp_tipo_alimentacao?.value)
        ? `Alimentacao: ${cleanPersistentValue(form.pp_tipo_alimentacao?.value)}`
        : "",
      cleanPersistentValue(form.pp_sal_mineral?.value)
        ? `Sal mineral: ${cleanPersistentValue(form.pp_sal_mineral?.value)}`
        : "",
    ].filter(Boolean);

    // Persistimos apenas dados realmente estaveis entre consultas.
    // Apenas dados estaveis da ficha base (propriedade e manejo).
    const contactantes = cleanPersistentValue(form.pp_contactantes?.value);
    const largeFieldsRaw = {
      farmName: cleanPersistentValue(form.pp_fazenda?.value),
      productionSystem: cleanPersistentValue(form.pp_tipo_criacao?.value),
      animalFunction: cleanPersistentValue(form.pp_animal_function?.value),
      contactAnimals: contactantes,
      propertyAndManagement: propertyAndManagementParts.join("; "),
    };

    const smallFields = {
      contactWithAnimals: contactantes,
    };
    const largeFields = Object.entries(largeFieldsRaw).reduce((acc, [key, value]) => {
      if (!value) return acc;
      acc[key] = value;
      return acc;
    }, {});

    const contactantesList = listFromCsv(contactantes);
    if (contactantesList.length) {
      largeFields.contactAnimals = contactantesList.join(", ");
    }

    const nextProfile = {
      ...(existingProfile && typeof existingProfile === "object" ? existingProfile : {}),
      updatedAt: new Date().toISOString(),
      pequeno: {
        fields: {
          ...((existingProfile?.pequeno?.fields && typeof existingProfile.pequeno.fields === "object")
            ? existingProfile.pequeno.fields
            : {}),
          ...smallFields,
        },
      },
      grande: {
        fields: {
          ...((existingProfile?.grande?.fields && typeof existingProfile.grande.fields === "object")
            ? existingProfile.grande.fields
            : {}),
          ...largeFields,
        },
      },
    };

    return nextProfile;
  };
 
  const showActionError = useCallback((message) => {
    setActionFeedback({ type: "error", message });
  }, []);

  const showActionSuccess = useCallback((message) => {
    setActionFeedback({ type: "success", message });
  }, []);

  const fetchPatients = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await api.get("/patients");
      const payload = response.data.data || response.data || [];
      setPatients(payload.map(normalizePatient));
      setDataError("");
    } catch (err) {
      console.error("Erro ao buscar pacientes:", err);
      setDataError(
        toUserFriendlyError(err, "Não foi possível carregar os pacientes."),
      );
    }
  }, [isAuthenticated]);

  const fetchConsultations = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await api.get("/consultations");
      const payload = response.data.data || response.data || [];
      setConsultations(payload.map(normalizeConsultation));
      setDataError("");
    } catch (err) {
      console.error("Erro ao buscar consultas:", err);
      setDataError(
        toUserFriendlyError(err, "Não foi possível carregar as consultas."),
      );
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchPatients();
    fetchConsultations();
  }, [isAuthenticated, fetchConsultations, fetchPatients]);

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [fetchConsultations]);

  useEffect(() => {
    const syncData = async () => {
      if (!navigator.onLine) return;

      const queue = getQueue();
      if (queue.length === 0) return;

      console.log("Sincronizando dados offline...");

      for (const item of queue) {
        if (item.type === "CREATE_CONSULTATION") {
          try {
            await api.post("/consultations", item.data);
          } catch (error) {
            console.error("Falha ao sincronizar consulta offline:", error);
            return;
          }
        }
      }

      clearQueue();
      showActionSuccess("Dados offline sincronizados com sucesso.");
      await fetchConsultations();
    };

    window.addEventListener("online", syncData);

    return () => {
      window.removeEventListener("online", syncData);
    };
  }, [fetchConsultations, showActionSuccess]);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  // Carregar dados do localStorage com tratamento de erros
  useEffect(() => {
    try {
      const savedPatients = localStorage.getItem("vetpro_patients");
      const savedConsultations = localStorage.getItem("vetpro_consultations");
      const savedAppointments = localStorage.getItem("vetpro_appointments");

      if (savedPatients) setPatients(JSON.parse(savedPatients));
      if (savedConsultations) setConsultations(JSON.parse(savedConsultations));
      if (savedAppointments) setAppointments(JSON.parse(savedAppointments));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      // Resetar dados em caso de erro
      localStorage.removeItem("vetpro_patients");
      localStorage.removeItem("vetpro_consultations");
      localStorage.removeItem("vetpro_appointments");
    }
  }, []);

  // Salvar dados no localStorage com tratamento de erros
  useEffect(() => {
    try {
      if (patients.length > 0) {
        localStorage.setItem("vetpro_patients", JSON.stringify(patients));
      }
    } catch (error) {
      console.error("Erro ao salvar pacientes:", error);
    }
  }, [patients]);

  useEffect(() => {
    try {
      if (consultations.length > 0) {
        localStorage.setItem(
          "vetpro_consultations",
          JSON.stringify(consultations),
        );
      }
    } catch (error) {
      console.error("Erro ao salvar consultas:", error);
    }
  }, [consultations]);

  useEffect(() => {
    try {
      if (appointments.length > 0) {
        localStorage.setItem(
          "vetpro_appointments",
          JSON.stringify(appointments),
        );
      }
    } catch (error) {
      console.error("Erro ao salvar agendamentos:", error);
    }
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem("vetpro_field_mode", fieldMode ? "true" : "false");
  }, [fieldMode]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setCurrentView("dashboard");
      setActionFeedback({
        type: "error",
        message: "Sua sessão expirou. Faça login novamente.",
      });
    };

    window.addEventListener("vetpro:auth-expired", handleAuthExpired);
    return () =>
      window.removeEventListener("vetpro:auth-expired", handleAuthExpired);
  }, []);

  // Funcoes de manipulacao de dados
  const handleAddConsultation = async (consultationData) => {
    const { returnPlan, ...payload } = consultationData || {};

    if (!navigator.onLine) {
      addToQueue({
        type: "CREATE_CONSULTATION",
        data: payload,
      });

      showActionSuccess("Sem internet. Consulta salva offline.");
      return { offline: true };
    }
    try {
      const response = await api.post("/consultations", payload);
      const savedConsultation = normalizeConsultation(response.data);

      if (returnPlan?.recommended) {
        const hasDate = Boolean(returnPlan.date && !returnPlan.open);
        setAppointments((prev) => [
          ...prev,
          {
            id: Date.now(),
            patientId: payload.patientId,
            type: "retorno",
            date: hasDate ? returnPlan.date : "",
            time: hasDate ? "09:00" : "",
            reason: hasDate
              ? "Retorno recomendado em consulta"
              : "Possivel retorno (data em aberto)",
            status: hasDate ? "agendado" : "possivel-retorno",
            linkedConsultationId: savedConsultation.id,
            createdAt: new Date().toISOString(),
          },
        ]);
      }

      await fetchConsultations();
      await fetchPatients();
      return savedConsultation;
    } catch (error) {
      console.error("Erro ao salvar consulta:", error);
      showActionError(
        toUserFriendlyError(error, "Não foi possível salvar a consulta."),
      );
      throw error;
    }
  };

  const handleEditPatient = async (id, updatedData) => {
    try {
      await api.put(`/patients/${id}`, updatedData);
      const saved = normalizePatient({ ...updatedData, id });
      setPatients((prev) => prev.map((p) => (p.id === id ? saved : p)));

      setCurrentView("patients");
      return true;
    } catch (err) {
      console.error("Erro ao editar paciente:", err);
      showActionError(
        toUserFriendlyError(err, "Não foi possível atualizar o paciente."),
      );
      return false;
    }
  };

  const handleAddPatient = async (patientData) => {
    try {
      const response = await api.post("/patients", patientData);
      const createdPatient = normalizePatient(response.data.data || response.data);
      setPatients((prev) => [...prev, createdPatient]);
      setCurrentView("patients");
      return true;
    } catch (err) {
      console.error("Erro ao adicionar paciente:", err);
      showActionError(
        toUserFriendlyError(err, "Não foi possível cadastrar o paciente."),
      );
      return false;
    }
  };

  const handleAddAppointment = (appointmentData) => {
    try {
      const newAppointment = {
        ...appointmentData,
        id: Date.now(),
        createdAt: new Date().toISOString(),
      };
      setAppointments((prev) => [...prev, newAppointment]);
      setCurrentView("appointments");
      return true;
    } catch (error) {
      console.error("Erro ao adicionar agendamento:", error);
      showActionError("Não foi possível adicionar o agendamento.");
      return false;
    }
  };

  const handleDeleteAppointment = (id) => {
    try {
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error);
      showActionError("Não foi possível excluir o agendamento.");
      return false;
    }
  };

  const handleDeleteAccount = async () => {
    await api.delete("/auth/account");
    try {
      localStorage.removeItem("vetpro_patients");
      localStorage.removeItem("vetpro_consultations");
      localStorage.removeItem("vetpro_appointments");
      localStorage.removeItem("vetpro_field_mode");
    } catch {
      // ignore storage errors
    }
    logout("Conta excluida com sucesso.");
  };

  const handleViewConsultation = async (consultationInput) => {
    const consultationId =
      (typeof consultationInput === "object" && consultationInput
        ? consultationInput.id || consultationInput.consultationId
        : consultationInput) || null;
    const localConsultation =
      typeof consultationInput === "object" && consultationInput
        ? normalizeConsultation(consultationInput)
        : consultations.find((item) => String(item.id) === String(consultationId));

    const openPreview = (consultationData) => {
      const normalized = normalizeConsultation(consultationData);
      setCurrentConsultation(normalized);
      if (normalized.patient) {
        setCurrentConsultationPatient(normalizePatient(normalized.patient));
      } else {
        const patientId = normalized.patientId || localConsultation?.patientId;
        if (patientId) {
          const matchedPatient = patients.find(
            (patient) => String(patient.id) === String(patientId),
          );
          if (matchedPatient) {
            setCurrentConsultationPatient(normalizePatient(matchedPatient));
          }
        }
      }
      setCurrentView("consultation-preview");
    };

    if (!consultationId && localConsultation) {
      openPreview(localConsultation);
      return;
    }

    if (!consultationId) {
      showActionError("Nao foi possivel identificar o prontuario.");
      return;
    }

    try {
      const response = await api.get(`/consultations/${consultationId}`);
      openPreview(response.data);
    } catch (err) {
      console.error("Erro ao buscar consulta:", err);
      if (localConsultation) {
        openPreview(localConsultation);
        showActionError(
          "Prontuario aberto em modo local. Nao foi possivel carregar dados completos do servidor.",
        );
      } else {
        showActionError(
          toUserFriendlyError(err, "Não foi possível abrir o prontuário."),
        );
      }
    }
  };

  const handleCreateReturn = (consultation) => {
    const patient = patients.find(
      (p) => String(p.id) === String(consultation.patientId),
    );
    if (!patient) {
      showActionError("Paciente do retorno não encontrado.");
      return;
    }

    setCurrentConsultationPatient(patient);
    setReturnSourceConsultation(consultation);
    setCurrentView(fieldMode ? "new-consultation-field" : "new-consultation-quick");
  };

  const handleGeneratePrescription = (consultation) => {
    if (
      consultation?.consultationType === "retorno" &&
      (!consultation?.medications ||
        /n[aã]o prescrita/i.test(String(consultation.medications)))
    ) {
      showActionError(
        "Este retorno não possui medicação nova para gerar receita.",
      );
      return;
    }

    const token = localStorage.getItem("token");
    window.open(
      buildApiUrl(`/consultations/${consultation.id}/prescription`, {
        token,
      }),
      "_blank",
    );
  };

  const isMobileTabActive = (tabId) => {
    if (tabId === "consultations") {
      return [
        "consultations",
        "patient-consultations",
        "new-consultation-quick",
        "new-consultation-field",
        "consultation-preview",
      ].includes(currentView);
    }
    return currentView === tabId;
  };

  const currentViewTitle = () => {
    switch (currentView) {
      case "dashboard":
        return "Dashboard";
      case "patients":
        return "Pacientes";
      case "appointments":
        return "Agenda";
      case "consultations":
      case "patient-consultations":
      case "new-consultation-quick":
      case "new-consultation-field":
        return "Prontuários";
      case "reports":
        return "Relatórios";
      case "profile":
        return "Meu Perfil";
      default:
        return "VetPro";
    }
  };

  const handleGoToNewConsultation = (openPicker = false) => {
    if (!patients.length) {
      showActionError("Cadastre um paciente antes de iniciar a consulta.");
      setCurrentView("add-patient");
      return;
    }

    if (openPicker || !currentConsultationPatient) {
      setSelectedConsultationPatientId(
        String(currentConsultationPatient?.id || patients[0].id),
      );
      setShowPatientPicker(true);
      return;
    }

    setFieldModeDraftInitialData(null);
    setReturnSourceConsultation(null);
    setCurrentView(fieldMode ? "new-consultation-field" : "new-consultation-quick");
  };

  const confirmPatientForConsultation = () => {
    const selected = patients.find(
      (p) => String(p.id) === String(selectedConsultationPatientId),
    );
    if (!selected) return;
    setCurrentConsultationPatient(selected);
    setFieldModeDraftInitialData(null);
    setReturnSourceConsultation(null);
    setShowPatientPicker(false);
    setCurrentView(fieldMode ? "new-consultation-field" : "new-consultation-quick");
  };

  // Renderizar a view atual
  const renderCurrentView = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <Dashboard
            patients={patients}
            consultations={consultations}
            appointments={appointments}
            onViewConsultations={(patient) => {
              setCurrentConsultationPatient(patient);
              setCurrentView("patient-consultations");
            }}
            onViewAppointments={() => setCurrentView("appointments")}
            onAddPatient={() => {
              setEditingPatient(null);
              setCurrentView("add-patient");
            }}
            onNewConsultation={() => handleGoToNewConsultation(true)}
            onOpenPatients={() => setCurrentView("patients")}
            onOpenAppointments={() => setCurrentView("appointments")}
          />
        );

      case "patients":
        return (
          <Patients
            patients={patients}
            onEditPatient={(patient) => {
              setEditingPatient(patient);
              setCurrentView("add-patient");
            }}
            onAddPatient={() => {
              setEditingPatient(null);
              setCurrentView("add-patient");
            }}
            onViewConsultations={(patient) => {
              setCurrentConsultationPatient(patient);
              setCurrentView("patient-consultations");
            }}
          />
        );

      case "new-consultation-quick": {
        const quickInitialData = fieldModeDraftInitialData
          ? fieldModeDraftInitialData
          : buildReturnConsultationInitialData(returnSourceConsultation);

        if (fieldMode && !fieldModeDraftInitialData) {
          return (
            <FieldModeConsultation
              patient={currentConsultationPatient}
              initialData={quickInitialData}
              onSave={handleAddConsultation}
              onSwitchToManual={() => setCurrentView("new-consultation-quick")}
              onContinueToManual={(draftInitialData) => {
                setFieldModeDraftInitialData(draftInitialData || null);
                setCurrentView("new-consultation-quick");
              }}
              onBack={() => {
                setFieldModeDraftInitialData(null);
                setReturnSourceConsultation(null);
                setCurrentView("patient-consultations");
              }}
            />
          );
        }

        return (
          <QuickConsultation
            patient={currentConsultationPatient}
            onSave={handleAddConsultation}
            initialData={quickInitialData}
            onBack={() => {
              setFieldModeDraftInitialData(null);
              setReturnSourceConsultation(null);
              setCurrentView("patient-consultations");
            }}
          />
        );
      }
      case "new-consultation-field": {
        const fieldInitialData =
          buildReturnConsultationInitialData(returnSourceConsultation) ||
          fieldModeDraftInitialData;
        return (
          <FieldModeConsultation
            patient={currentConsultationPatient}
            initialData={fieldInitialData}
            onSave={handleAddConsultation}
            onSwitchToManual={() => setCurrentView("new-consultation-quick")}
            onContinueToManual={(draftInitialData) => {
              setFieldModeDraftInitialData(draftInitialData || null);
              setCurrentView("new-consultation-quick");
            }}
            onBack={() => {
              setFieldModeDraftInitialData(null);
              setReturnSourceConsultation(null);
              setCurrentView("patient-consultations");
            }}
          />
        );
      }
      case "consultation-preview":
        if (!currentConsultation) return null;

        return (
          <ConsultationPreview
            consultation={currentConsultation}
            patient={currentConsultationPatient || currentConsultation?.patient}
            onClose={() => setCurrentView("patient-consultations")}
          />
        );

case "add-patient":
        return (
          <PatientForm
            patient={editingPatient}
            onSubmit={(patientData) => {
              if (editingPatient) {
                handleEditPatient(editingPatient.id, patientData);
              } else {
                handleAddPatient(patientData);
              }
            }}
            onCancel={() => setCurrentView("patients")}
            isEditing={!!editingPatient}
          />
        );

      case "consultations":
        return (
          <Consultations
            consultations={consultations}
            patients={patients}
            onNewConsultation={() => handleGoToNewConsultation(true)}
            onViewConsultation={handleViewConsultation}
            onViewPatientConsultations={(patient) => {
              setCurrentConsultationPatient(patient);
              setCurrentView("patient-consultations");
            }}
          />
        );

      case "appointments":
        return (
          <Appointments
            appointments={appointments}
            patients={patients}
            onNewAppointment={() => setCurrentView("new-appointment")}
            onEditAppointment={(appointment) => {
              setEditingAppointment(appointment);
              setCurrentView("new-appointment");
            }}
            onDeleteAppointment={handleDeleteAppointment}
          />
        );

      case "new-appointment":
        return (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6">
              {editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}
            </h1>

            <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm p-4 sm:p-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target;
                  const appointmentData = {
                    id: editingAppointment?.id,
                    patientId: form.patientId.value,
                    date: form.date.value,
                    time: form.time.value,
                    reason: form.reason.value,
                    type: form.type.value,
                  };

                  if (
                    !appointmentData.patientId ||
                    !appointmentData.date ||
                    !appointmentData.time ||
                    !appointmentData.reason
                  ) {
                    showActionError(
                      "Preencha os campos obrigatorios para salvar o agendamento.",
                    );
                    return;
                  }

                  handleAddAppointment(appointmentData);
                  setEditingAppointment(null);
                }}
                className="space-y-4 sm:space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-3 border-t border-gray-200 dark:border-dark-700">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAppointment(null);
                      setCurrentView("appointments");
                    }}
                    className="w-full sm:w-auto bg-gray-200 dark:bg-dark-700 text-gray-800 dark:text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl hover:bg-gray-300 dark:hover:bg-dark-600 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
                  >
                    Salvar Agendamento
                  </button>
                </div>
              </form>
            </div>
          </div>
        );

      case "reports":
        return (
          <Reports
            consultations={consultations}
            patients={patients}
            dateRange={dateRange}
            onDateRangeChange={(type, value) =>
              setDateRange((prev) => ({ ...prev, [type]: value }))
            }
            onResetDateRange={() => {
              const endDate = new Date();
              const startDate = new Date();
              startDate.setMonth(startDate.getMonth() - 5);
              setDateRange({
                startDate: startDate.toISOString().split("T")[0],
                endDate: endDate.toISOString().split("T")[0],
              });
            }}
          />
        );

      case "profile":
        return (
          <Profile
            profile={user || {}}
            onSave={async (updatedProfile) => {
              let clinicLogoUrl =
                updatedProfile.clinicLogoPreview ||
                user?.clinic?.logoUrl ||
                user?.clinicLogoPreview ||
                "";

              if (updatedProfile.clinicLogoFile) {
                const formData = new FormData();
                formData.append("logo", updatedProfile.clinicLogoFile);
                const logoResp = await api.post("/clinic/logo", formData, {
                  headers: { "Content-Type": "multipart/form-data" },
                });
                const logoPath = logoResp?.data?.logoUrl;
                if (logoPath) {
                  const base = new URL(api.defaults.baseURL || window.location.origin);
                  clinicLogoUrl = logoPath.startsWith("http")
                    ? logoPath
                    : `${base.origin}${logoPath}`;
                }
              }

              const response = await api.put("/auth/profile", {
                ...updatedProfile,
                profilePhoto: updatedProfile.profilePhotoPreview,
                signature: updatedProfile.signaturePreview,
              });

              const serverData = response.data || {};
              const merged = updateProfile({
                ...updatedProfile,
                ...serverData,
                profilePhotoPreview:
                  updatedProfile.profilePhotoPreview ||
                  serverData.profilePhoto ||
                  user?.profilePhotoPreview,
                signaturePreview:
                  updatedProfile.signaturePreview ||
                  serverData.signature ||
                  user?.signaturePreview,
                clinicLogoPreview: clinicLogoUrl,
                clinic: {
                  ...(serverData.clinic || user?.clinic || {}),
                  logoUrl: clinicLogoUrl || serverData?.clinic?.logoUrl,
                },
              });
              setActionFeedback({
                type: "success",
                message: "Perfil salvo com sucesso.",
              });
              return merged;
            }}
            onCancel={() => setCurrentView("dashboard")}
            onDeleteAccount={handleDeleteAccount}
          />
        );

      case "patient-consultations":
        if (!currentConsultationPatient) {
          setCurrentView("patients");
          return null;
        }

        const patientConsultations = consultations.filter(
          (c) => String(c.patientId) === String(currentConsultationPatient.id),
        );

        return (
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setCurrentView("patients")}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white font-medium mb-4 flex items-center text-sm"
            >
              <span className="mr-2">&lt;-</span> Voltar para Pacientes
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <SpeciesIcon
                  species={currentConsultationPatient.species}
                  subcategory={currentConsultationPatient.subcategory}
                  className="h-9 w-9"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {currentConsultationPatient.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {currentConsultationPatient.ownerName}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                    {currentConsultationPatient.species}
                  </span>
                  {currentConsultationPatient.subcategory && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-xs">
                      {currentConsultationPatient.subcategory}
                    </span>
                  )}
                  <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-full text-xs">
                    {currentConsultationPatient.age}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {patientConsultations.length > 0 ? (
                patientConsultations
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .map((consultation) => (
                    <div
                      key={consultation.id}
                      className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm"
                    >
                      <div className="border-b border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900 px-4 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center">
                        <div>
                          <h2 className="font-bold text-lg text-gray-800 dark:text-white">
                            Consulta em{" "}
                            {new Date(
                              consultation.createdAt,
                            ).toLocaleDateString("pt-BR")}
                          </h2>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            No {consultation.numeroProntuario} -{" "}
                            {resolveConsultationContext(
                              consultation.consultationType,
                            ).label}
                          </p>
                        </div>
                        <div className="mt-2 sm:mt-0 flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              handleViewConsultation(consultation.id)
                            }
                            className="inline-flex items-center rounded-lg border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900"
                          >
                            <span className="mr-1">
                              <AppIcon name="consultations" className="h-3.5 w-3.5" />
                            </span>
                            <span>Visualizar Prontuario</span>
                          </button>
                          <button
                            onClick={() => handleCreateReturn(consultation)}
                            className="rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900"
                          >
                            Criar Retorno
                          </button>
                          <button
                            onClick={() =>
                              handleGeneratePrescription(consultation)
                            }
                            className="rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-900"
                          >
                            Gerar Receita
                          </button>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-bold text-gray-800 dark:text-white text-sm mb-1">
                            Queixa Principal
                          </h3>
                          <p className="text-gray-700 dark:text-gray-300 text-sm">
                            {consultation.chiefComplaint || "Não informado"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="bg-white dark:bg-dark-800 rounded-xl border border-dashed border-gray-300 dark:border-dark-600 p-8 text-center">
                  <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300">
                    <AppIcon name="consultations" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                    Nenhum prontuario registrado
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Este paciente ainda não possui consultas registradas no
                    sistema.
                  </p>
                  <button
                    onClick={handleGoToNewConsultation}
                    className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                  >
                    Registrar Primeira Consulta
                  </button>
                </div>
              )}

              <div className="flex justify-center pt-4">
                <button
                  onClick={handleGoToNewConsultation}
                  className="w-full max-w-xs bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-lg">+</span>
                    <span>Nova Consulta</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <Dashboard
            patients={patients}
            consultations={consultations}
            appointments={appointments}
            onViewConsultations={(patient) => {
              setCurrentConsultationPatient(patient);
              setCurrentView("patient-consultations");
            }}
            onViewAppointments={() => setCurrentView("appointments")}
            onAddPatient={() => {
              setEditingPatient(null);
              setCurrentView("add-patient");
            }}
            onNewConsultation={() => handleGoToNewConsultation(true)}
            onOpenPatients={() => setCurrentView("patients")}
            onOpenAppointments={() => setCurrentView("appointments")}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex">
      {/* INDICADOR OFFLINE */}
      {!isOnline && (
        <div className="bg-yellow-500 text-white text-center py-2 text-sm font-medium w-full">
          ! Modo Offline - Seus dados serao sincronizados quando voltar internet
        </div>
      )}
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar
          currentUser={user}
          currentView={currentView}
          setCurrentView={setCurrentView}
          onLogout={logout}
        />
      )}

      {/* Mobile top bar */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-dark-800/95 backdrop-blur border-b border-gray-200 dark:border-dark-700 px-3 sm:px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 grid place-items-center text-sm font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || "V"}
            </span>
            <div className="leading-tight">
              <p className="text-xs text-gray-500 dark:text-gray-400">VetPro</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">{currentViewTitle()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleDarkMode}
              className={`p-2 rounded-full transition ${isDark ? 'bg-yellow-500 text-white' : 'bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-300'}`}
              title={isDark ? "Modo Claro" : "Modo Escuro"}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <button
              type="button"
              onClick={handleToggleFieldMode}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-full border transition ${
                fieldMode
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white dark:bg-dark-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-600"
              }`}
            >
              {fieldMode ? "Desativar Campo" : "Ativar Campo"}
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <div
        className={`flex-1 overflow-auto px-2 sm:px-3 pb-[7.5rem] md:px-6 md:pb-6 ${
          isMobile ? "pt-24" : "pt-6"
        }`}
      >
        {!isMobile && (
          <div className="sticky top-0 z-30 mb-4 flex items-center justify-between bg-white/90 dark:bg-dark-800/90 backdrop-blur border border-gray-200 dark:border-dark-700 rounded-2xl px-4 py-3 shadow-sm">
            <div className="leading-tight">
              <p className="text-xs text-gray-500 dark:text-gray-400">VetPro</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">{currentViewTitle()}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`p-2 rounded-full transition ${isDark ? 'bg-yellow-500 text-white' : 'bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-300'}`}
                title={isDark ? "Modo Claro" : "Modo Escuro"}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
              <button
                type="button"
                onClick={handleToggleFieldMode}
                className={`rounded-full px-4 py-2 text-xs font-bold shadow-sm ${
                  fieldMode 
                    ? "bg-emerald-600 text-white" 
                    : "bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300"
                }`}
              >
                {fieldMode ? "Desativar Modo Campo" : "Ativar Modo Campo"}
              </button>
            </div>
          </div>
        )}
        {dataError && (
          <FeedbackBanner
            className="mb-3"
            type="error"
            message={dataError}
            onClose={() => {
              setDataError("");
              fetchPatients();
              fetchConsultations();
            }}
          />
        )}
        {actionFeedback?.message && (
          <FeedbackBanner
            className="mb-3"
            type={actionFeedback.type === "success" ? "success" : "error"}
            message={actionFeedback.message}
            onClose={() => setActionFeedback(null)}
          />
        )}
        <Suspense fallback={lazyFallback}>{renderCurrentView()}</Suspense>
      </div>

      {showPatientPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-dark-800 p-5 shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              Escolher paciente
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Selecione o paciente para iniciar a consulta.
            </p>

            <select
              value={selectedConsultationPatientId}
              onChange={(e) => setSelectedConsultationPatientId(e.target.value)}
              className="mt-4 w-full rounded-lg border border-gray-300 dark:border-dark-600 px-3 py-2.5 text-sm bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            >
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} - {patient.ownerName}
                </option>
              ))}
            </select>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPatientPicker(false)}
                className="rounded-lg border border-gray-300 dark:border-dark-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmPatientForConsultation}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Iniciar consulta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-dark-700 bg-white/95 dark:bg-dark-800/95 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="grid grid-cols-6">
            {MOBILE_NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "logout") {
                    logout();
                    return;
                  }
                  setCurrentView(
                    item.id === "consultations" ? "consultations" : item.id,
                  );
                }}
                className={`py-2.5 flex flex-col items-center space-y-1 ${
                  isMobileTabActive(item.id)
                    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {item.id === "profile" ? renderProfileBubble(user) : <AppIcon name={item.icon} variant="colorful" />}
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};

// Componente raiz com provedor de autenticacao
const App = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;

function renderProfileBubble(profileUser) {
    const initial = (profileUser?.name || "U").charAt(0).toUpperCase();
    if (profileUser?.profilePhoto) {
      return (
        <span className="h-6 w-6 rounded-full overflow-hidden border border-gray-200 dark:border-dark-600">
          <img src={profileUser.profilePhoto} alt="Perfil" className="h-full w-full object-cover" />
        </span>
      );
    }
    return (
      <span className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold grid place-items-center">
        {initial}
      </span>
    );
}
