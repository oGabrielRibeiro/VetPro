import React, { useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Consultations from "./pages/Consultations";
import Appointments from "./pages/Appointments";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import Sidebar from "./components/Sidebar";
import QuickConsultation from "./components/QuickConsultation";
import FieldModeConsultation from "./components/FieldModeConsultation";
import ReturnConsultation from "./components/ReturnConsultation";
import ConsultationPreview from "./components/ConsultationPreview";
import FeedbackBanner from "./components/FeedbackBanner";
import AppIcon from "./components/AppIcon";
import SpeciesIcon from "./components/SpeciesIcon";
import api, { buildApiUrl } from "./services/api";
import { addToQueue } from "./services/offlineQueue";
import { getQueue, clearQueue } from "./services/offlineQueue";
import { toUserFriendlyError } from "./utils/errorMessages";

// Componente principal com roteamento baseado em estado
const MainApp = () => {
  const { user, loading, logout, updateProfile } = useAuth();
  const [currentView, setCurrentView] = useState("dashboard");
  const [isMobile, setIsMobile] = useState(false);

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
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [fieldMode, setFieldMode] = useState(
    () => localStorage.getItem("vetpro_field_mode") === "true",
  );
  const [dataError, setDataError] = useState("");
  const [actionFeedback, setActionFeedback] = useState(null);

  const [currentConsultation, setCurrentConsultation] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const mobileNavItems = [
    { id: "dashboard", icon: "dashboard", label: "Inicio" },
    { id: "patients", icon: "patients", label: "Pacientes" },
    { id: "appointments", icon: "appointments", label: "Agenda" },
    { id: "consultations", icon: "consultations", label: "Pront." },
    { id: "profile", icon: "profile", label: "Perfil" },
    { id: "logout", icon: "logout", label: "Sair" },
  ];

  // Estados para relatorios
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 5))
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const { isAuthenticated } = useAuth();

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
    observations: consultation.observations || consultation.notes || "",
  });

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

  const handleViewConsultation = async (consultationId) => {
    try {
      const response = await api.get(`/consultations/${consultationId}`);
      const consultation = normalizeConsultation(response.data);
      setCurrentConsultation(consultation);
      if (consultation.patient) {
        setCurrentConsultationPatient(normalizePatient(consultation.patient));
      }
      setCurrentView("consultation-preview");
    } catch (err) {
      console.error("Erro ao buscar consulta:", err);
      showActionError(
        toUserFriendlyError(err, "Não foi possível abrir o prontuário."),
      );
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
    setCurrentView("new-consultation-return");
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
        "new-consultation-return",
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

    setReturnSourceConsultation(null);
    setCurrentView(fieldMode ? "new-consultation-field" : "new-consultation-quick");
  };

  const confirmPatientForConsultation = () => {
    const selected = patients.find(
      (p) => String(p.id) === String(selectedConsultationPatientId),
    );
    if (!selected) return;
    setCurrentConsultationPatient(selected);
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

      case "new-consultation-quick":
        return (
          <QuickConsultation
            patient={currentConsultationPatient}
            onSave={handleAddConsultation}
            fieldMode={fieldMode}
            initialData={
              returnSourceConsultation
                ? {
                    consultationType: "retorno",
                    previousConsultationId: returnSourceConsultation.id,
                    weight: returnSourceConsultation.weight,
                    chiefComplaint: "",
                    diagnosis: returnSourceConsultation.diagnosis || "",
                    treatment: returnSourceConsultation.treatment || "",
                  }
                : null
            }
            onBack={() => {
              setReturnSourceConsultation(null);
              setCurrentView("patient-consultations");
            }}
          />
        );
      case "new-consultation-field":
        return (
          <FieldModeConsultation
            patient={currentConsultationPatient}
            onSave={handleAddConsultation}
            onSwitchToManual={() => setCurrentView("new-consultation-quick")}
            onBack={() => {
              setReturnSourceConsultation(null);
              setCurrentView("patient-consultations");
            }}
          />
        );
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
          <div className="max-w-2xl mx-auto">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">
              {editingPatient ? "Editar Paciente" : "Novo Paciente"}
            </h1>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target;
                  const name = form.name.value.trim();
                  const species = form.species.value;
                  const breed = form.breed.value.trim();
                  const age = form.age.value.trim();
                  const ownerName = form.ownerName.value.trim();

                  // Validacao basica
                  if (!name || !species || !breed || !age || !ownerName) {
                    showActionError(
                      "Preencha os campos obrigatorios para salvar o paciente.",
                    );
                    return;
                  }

                  const patientData = {
                    name,
                    species,
                    subcategory: form.subcategory?.value || "",
                    breed,
                    age,
                    ownerName,
                    ownerPhone: form.ownerPhone?.value || "",
                    createdAt:
                      editingPatient?.createdAt || new Date().toISOString(),
                  };

                  if (editingPatient) {
                    handleEditPatient(editingPatient.id, patientData);
                  } else {
                    handleAddPatient(patientData);
                  }
                }}
                className="space-y-4 sm:space-y-6"
              >
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Nome do Paciente <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingPatient?.name || ""}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Especie <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="species"
                    defaultValue={editingPatient?.species || ""}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="Mamifero">Mamifero</option>
                    <option value="Ave">Ave</option>
                    <option value="Reptil">Reptil</option>
                    <option value="Peixe">Peixe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Raca <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="breed"
                    defaultValue={editingPatient?.breed || ""}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Idade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="age"
                    defaultValue={editingPatient?.age || ""}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Nome do Tutor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="ownerName"
                    defaultValue={editingPatient?.ownerName || ""}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Telefone do Tutor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="ownerPhone"
                    defaultValue={editingPatient?.ownerPhone || ""}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Email do Tutor (opcional)
                  </label>
                  <input
                    type="email"
                    name="ownerEmail"
                    defaultValue={editingPatient?.ownerEmail || ""}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    placeholder="tutor@email.com"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Campo ainda não persistido no backend atual.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between space-y-2 sm:space-y-0 sm:space-x-3 pt-3 sm:pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setCurrentView("patients")}
                    className="w-full sm:w-auto bg-gray-200 text-gray-800 font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl hover:bg-gray-300 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-cyan-700 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
                  >
                    {editingPatient
                      ? "Atualizar Paciente"
                      : "Cadastrar Paciente"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );

      case "consultations":
        return (
          <Consultations
            consultations={consultations}
            patients={patients}
            onNewConsultation={() => handleGoToNewConsultation(true)}
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

      case "new-consultation-return":
        return (
          <ReturnConsultation
            patient={currentConsultationPatient}
            previousConsultation={returnSourceConsultation}
            onSave={handleAddConsultation}
            fieldMode={fieldMode}
            onBack={() => {
              setReturnSourceConsultation(null);
              setCurrentView("patient-consultations");
            }}
          />
        );

      case "new-appointment":
        return (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">
              {editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}
            </h1>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
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
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Paciente <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="patientId"
                    defaultValue={editingAppointment?.patientId || ""}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    required
                  >
                    <option value="">Selecione um paciente</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {p.ownerName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Data <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      defaultValue={editingAppointment?.date || ""}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Hora <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      name="time"
                      defaultValue={editingAppointment?.time || ""}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Tipo de atendimento
                  </label>
                  <select
                    name="type"
                    defaultValue={editingAppointment?.type || "consulta"}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  >
                    <option value="consulta">Consulta</option>
                    <option value="cirurgia">Cirurgia</option>
                    <option value="retorno">Retorno</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Motivo <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="reason"
                    defaultValue={editingAppointment?.reason || ""}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm min-h-[90px]"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAppointment(null);
                      setCurrentView("appointments");
                    }}
                    className="w-full sm:w-auto bg-gray-200 text-gray-800 font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl hover:bg-gray-300 transition-colors text-sm"
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
            profile={
              user || {
                name: "Dra. Juliana Mendes",
                email: "juliana@vetpro.com",
                phone: "(11) 99999-9999",
                crmvNumber: "12345",
                crmvState: "SP",
                specialty: "Clinica Geral e Medicina Preventiva",
                clinicName: "Clinica VetCare",
                clinicAddress: "Av. Paulista, 1000 - Sao Paulo/SP",
                clinicCNPJ: "12.345.678/0001-90",
                profilePhotoPreview: "",
                signaturePreview: "",
              }
            }
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
              className="text-gray-600 hover:text-gray-800 font-medium mb-4 flex items-center text-sm"
            >
              <span className="mr-2">&lt;-</span> Voltar para Pacientes
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <SpeciesIcon
                  species={currentConsultationPatient.species}
                  subcategory={currentConsultationPatient.subcategory}
                  className="h-9 w-9"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {currentConsultationPatient.name}
                </h1>
                <p className="text-gray-600">
                  {currentConsultationPatient.ownerName}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {currentConsultationPatient.species}
                  </span>
                  {currentConsultationPatient.subcategory && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                      {currentConsultationPatient.subcategory}
                    </span>
                  )}
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
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
                      className="bg-white rounded-xl border border-gray-200 shadow-sm"
                    >
                      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center">
                        <div>
                          <h2 className="font-bold text-lg text-gray-800">
                            Consulta em{" "}
                            {new Date(
                              consultation.createdAt,
                            ).toLocaleDateString("pt-BR")}
                          </h2>
                          <p className="text-xs text-gray-600 mt-0.5">
                            No {consultation.numeroProntuario} -{" "}
                            {consultation.consultationType === "nova"
                              ? "Consulta Geral"
                              : consultation.consultationType === "retorno"
                                ? "Retorno"
                                : "Outro"}
                          </p>
                        </div>
                        <div className="mt-2 sm:mt-0 flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              handleViewConsultation(consultation.id)
                            }
                            className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                          >
                            <span className="mr-1">
                              <AppIcon name="consultations" className="h-3.5 w-3.5" />
                            </span>
                            <span>Visualizar Prontuario</span>
                          </button>
                          <button
                            onClick={() => handleCreateReturn(consultation)}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                          >
                            Criar Retorno
                          </button>
                          <button
                            onClick={() =>
                              handleGeneratePrescription(consultation)
                            }
                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                          >
                            Gerar Receita
                          </button>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-bold text-gray-800 text-sm mb-1">
                            Queixa Principal
                          </h3>
                          <p className="text-gray-700 text-sm">
                            {consultation.chiefComplaint || "Não informado"}
                          </p>
                        </div>

                        {consultation.anamnesis && (
                          <div>
                            <h3 className="font-bold text-gray-800 text-sm mb-1">
                              Anamnese
                            </h3>
                            <p className="text-gray-700 text-sm">
                              {consultation.anamnesis}
                            </p>
                          </div>
                        )}

                        {consultation.clinicalAssessment && (
                          <div>
                            <h3 className="font-bold text-gray-800 text-sm mb-1">
                              Avaliacao Clinica
                            </h3>
                            <p className="text-gray-700 text-sm">
                              {consultation.clinicalAssessment}
                            </p>
                          </div>
                        )}

                        {consultation.diagnosis && (
                          <div>
                            <h3 className="font-bold text-gray-800 text-sm mb-1">
                              Diagnostico
                            </h3>
                            <p className="text-gray-700 text-sm">
                              {consultation.diagnosis}
                            </p>
                          </div>
                        )}

                        {consultation.treatment && (
                          <div>
                            <h3 className="font-bold text-gray-800 text-sm mb-1">
                              Conduta / Tratamento
                            </h3>
                            <p className="text-gray-700 text-sm">
                              {consultation.treatment}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                  <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                    <AppIcon name="consultations" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">
                    Nenhum prontuario registrado
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* INDICADOR OFFLINE */}
      {!isOnline && (
        <div className="bg-yellow-500 text-white text-center py-2 text-sm font-medium">
          ! Modo Offline - Seus dados serao sincronizados quando voltar
          internet
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
        <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center text-sm font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || "V"}
            </span>
            <div className="leading-tight">
              <p className="text-xs text-gray-500">VetPro</p>
              <p className="text-sm font-semibold text-gray-800">{currentViewTitle()}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleFieldMode}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-full border transition ${
              fieldMode
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            {fieldMode ? "Desativar Campo" : "Ativar Campo"}
          </button>
        </header>
      )}

      {/* Main Content */}
      <div
        className={`flex-1 overflow-auto px-3 pb-28 md:px-6 md:pb-6 ${
          isMobile ? "pt-20" : "pt-6"
        }`}
      >
        {!isMobile && (
          <div className="sticky top-0 z-30 mb-4 flex items-center justify-between bg-white/90 backdrop-blur border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
            <div className="leading-tight">
              <p className="text-xs text-gray-500">VetPro</p>
              <p className="text-sm font-semibold text-gray-800">{currentViewTitle()}</p>
            </div>
            <button
              type="button"
              onClick={handleToggleFieldMode}
              className={`rounded-full px-4 py-2 text-xs font-bold shadow-sm ${
                fieldMode ? "bg-emerald-600 text-white" : "bg-white border border-gray-300 text-gray-700"
              }`}
            >
              {fieldMode ? "Desativar Modo Campo" : "Ativar Modo Campo"}
            </button>
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
        {renderCurrentView()}
      </div>

      {showPatientPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-gray-800">
              Escolher paciente
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Selecione o paciente para iniciar a consulta.
            </p>

            <select
              value={selectedConsultationPatientId}
              onChange={(e) => setSelectedConsultationPatientId(e.target.value)}
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
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
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="grid grid-cols-6">
            {mobileNavItems.map((item) => (
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
                    ? "text-emerald-600 font-semibold"
                    : "text-gray-500"
                }`}
              >
                {item.id === "profile" ? renderProfileBubble(user) : <AppIcon name={item.icon} />}
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
        <span className="h-6 w-6 rounded-full overflow-hidden border border-gray-200">
          <img src={profileUser.profilePhoto} alt="Perfil" className="h-full w-full object-cover" />
        </span>
      );
    }
    return (
      <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold grid place-items-center">
        {initial}
      </span>
    );
}
