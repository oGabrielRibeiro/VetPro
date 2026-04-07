import { useEffect, useId, useMemo, useState } from "react";
import PropTypes from "prop-types";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import BeforeAfterSlider from "../components/BeforeAfterSlider";
import FeedbackBanner from "./FeedbackBanner";
import AppIcon from "./AppIcon";
import LoadingDot from "./LoadingDot";
import { downloadApiBlob, openApiBlobInNewTab } from "../utils/blobDownloads";
import {
  parsePorteDataFromNotes,
  sanitizeConsultationNotesForDisplay,
} from "../utils/consultationNotes";

const PORTE_FIELD_LABELS = {
  vaccinationStatus: "Vacinacao",
  vaccinationProtocol: "Protocolo vacinal",
  lastVaccines: "Ultimas vacinas aplicadas",
  dewormingStatus: "Vermifugacao",
  ectoparasiteControl: "Controle de ectoparasitas",
  diet: "Dieta",
  rationBrand: "Racao / marca",
  feedingFrequency: "Frequencia alimentar",
  waterIntakeSmall: "Ingestao de agua",
  housing: "Ambiente",
  lifestyle: "Estilo de vida",
  contactWithAnimals: "Contato com outros animais",
  reproductiveStatusSmall: "Estado reprodutivo",
  preventiveCare: "Preventivos em uso",
  behavior: "Comportamento",
  allergyHistory: "Historico alergico",
  chronicDiseases: "Doencas cronicas",
  currentSupplements: "Suplementos em uso",
  farmName: "Propriedade",
  productionSystem: "Sistema de producao",
  animalFunction: "Finalidade zootecnica",
  batch: "Lote",
  animalId: "Identificacao do animal",
  bodyConditionScore: "Escore corporal",
  reproductiveStatus: "Estado reprodutivo",
  daysInMilk: "Dias em lactacao",
  parity: "Numero de partos",
  herdVaccination: "Vacinacao do rebanho",
  herdDeworming: "Vermifugacao do rebanho",
  forage: "Volumoso",
  concentrate: "Concentrado",
  waterIntake: "Consumo de agua",
  mineralSupplementation: "Suplementacao mineral",
  hoofStatus: "Casco e locomocao",
  rumenMotility: "Motilidade ruminal",
  fecesAndUrine: "Fezes e urina",
  milkProduction: "Producao de leite",
  historicalDiseases: "Historico sanitario",
  propertyAndManagement: "Propriedade e manejo",
  contactAnimals: "Contactantes",
  animalIdentificationDetails: "Animal atendido - identificacao detalhada",
  neonateAndReproduction: "Neonato / reproducao",
  previousTreatmentHistory: "Tratamento anterior",
  physicalExamDetailed: "Exame fisico detalhado",
  requestedExamPanel: "Exames complementares solicitados",
};

const ConsultationPreview = ({
  consultation,
  patient,
  currentUser,
  onClose,
}) => {
  const { user } = useAuth();
  const activeUser = currentUser || user;
  const [files, setFiles] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState("exame");
  const [uploading, setUploading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompareFiles, setSelectedCompareFiles] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrintFileIds, setSelectedPrintFileIds] = useState([]);
  const dialogTitleId = useId();
  const maxClinicalPhotos = Number(
    import.meta.env.VITE_MAX_CLINICAL_PHOTOS || 8,
  );
  const printModalTitleId = useId();
  const printModalDescriptionId = useId();

  const imageCount = useMemo(() => {
    if (!files) return 0;
    return Object.values(files)
      .flat()
      .filter((file) => String(file?.mimeType || "").startsWith("image/"))
      .length;
  }, [files]);

  const allFiles = useMemo(() => {
    if (!files) return [];
    return Object.values(files).flat();
  }, [files]);

  const hasFiles = allFiles.length > 0;

  const remainingImages =
    Number.isFinite(maxClinicalPhotos) && maxClinicalPhotos > 0
      ? Math.max(maxClinicalPhotos - imageCount, 0)
      : null;

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
  };

  const fetchFiles = async () => {
    if (!consultation?.id) return;
    try {
      setLoadingFiles(true);
      const response = await api.get(`/consultations/${consultation.id}/files`);
      setFiles(response.data);
    } catch (err) {
      console.error("Erro ao buscar exames:", err);
      showFeedback("error", "Nao foi possivel carregar os anexos. Tente atualizar a lista.");
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [consultation?.id]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!consultation) return null;
  const patientData = patient || consultation.patient || {};
  const consultationDate = consultation.date || consultation.createdAt;
  const consultationUpdatedAt =
    consultation.updatedAt || consultation.updated_at || consultationDate;
  const consultationNumber =
    consultation.recordNumber || consultation.numeroProntuario || consultation.id;
  const consultationTemplate =
    consultation.template ||
    (consultation.consultationType === "retorno" ? "return" : "general");
  const porteData = parsePorteDataFromNotes(consultation.notes);
  const visibleObservations = sanitizeConsultationNotesForDisplay(
    consultation.observations || consultation.notes || "",
  );

  const formatDateBR = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const formatDateTimeBR = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleCompareFile = (file) => {
    if (!file?.mimeType?.startsWith("image/")) return;
    if (selectedCompareFiles.find((f) => f.id === file.id)) {
      setSelectedCompareFiles((prev) => prev.filter((f) => f.id !== file.id));
    } else {
      if (selectedCompareFiles.length < 2) {
        setSelectedCompareFiles((prev) => [...prev, file]);
      }
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", fileType);

      await api.post(`/consultations/${consultation.id}/files`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      await fetchFiles();
      setSelectedFile(null);
      showFeedback("success", "Arquivo anexado com sucesso.");
    } catch (err) {
      console.error("Erro ao enviar exame:", err);
      showFeedback("error", "Nao foi possivel anexar o arquivo. Verifique formato e tamanho e tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadConsultationPDF = async () => {
    try {
      await openApiBlobInNewTab(`/consultations/${consultation.id}/pdf`);
      showFeedback("success", "PDF aberto em nova aba.");
    } catch (error) {
      console.error("Erro ao abrir PDF:", error);
      showFeedback(
        "error",
        "Nao foi possivel abrir o PDF. Verifique bloqueio de popup no navegador e tente novamente.",
      );
    }
  };

  const buildPdfUrl = (fileIds) => {
    const params = new URLSearchParams();
    if (Array.isArray(fileIds) && fileIds.length) {
      params.set("files", fileIds.join(","));
    }
    const query = params.toString();
    return query
      ? `/consultations/${consultation.id}/pdf?${query}`
      : `/consultations/${consultation.id}/pdf`;
  };

  const handleDownloadConsultationPDFWithFiles = async (fileIds) => {
    try {
      await openApiBlobInNewTab(buildPdfUrl(fileIds));
      showFeedback("success", "PDF aberto em nova aba.");
    } catch (error) {
      console.error("Erro ao abrir PDF:", error);
      showFeedback(
        "error",
        "Nao foi possivel abrir o PDF. Verifique bloqueio de popup no navegador e tente novamente.",
      );
    }
  };

  const openPrintModal = () => {
    if (!hasFiles) {
      handleDownloadConsultationPDF();
      return;
    }
    setSelectedPrintFileIds(allFiles.map((file) => file.id));
    setIsPrintModalOpen(true);
  };

  const togglePrintFile = (fileId) => {
    setSelectedPrintFileIds((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId],
    );
  };

  const handlePreviewFile = async (fileId) => {
    try {
      await openApiBlobInNewTab(`/consultations/files/${fileId}/view`);
    } catch (error) {
      console.error("Erro ao visualizar arquivo:", error);
      showFeedback("error", "Nao foi possivel abrir o arquivo para visualizacao. Tente baixar o anexo.");
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      await downloadApiBlob(
        `/consultations/files/${file.id}/view`,
        file.originalName || "arquivo",
      );
      showFeedback("success", "Download iniciado com sucesso.");
    } catch (error) {
      console.error("Erro ao baixar arquivo:", error);
      showFeedback("error", "Nao foi possivel baixar o arquivo. Tente novamente em instantes.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        className="mx-auto h-[100dvh] w-full overflow-y-auto bg-white rounded-none sm:h-auto sm:max-h-[92vh] sm:max-w-4xl sm:rounded-xl"
      >
        <div className="px-4 pt-4 sm:px-6">
          <FeedbackBanner
            type={feedback?.type || "info"}
            message={feedback?.message || ""}
            onClose={() => setFeedback(null)}
          />
        </div>
        {/* Cabeçalho da ficha */}
        <div className="border-b border-gray-300 p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
            <div>
              <h1 id={dialogTitleId} className="text-xl sm:text-2xl font-bold text-gray-800">
                PRONTUÁRIO CLÍNICO VETERINÁRIO
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {activeUser?.clinicName || "Clínica VetCare"}
              </p>
              <p className="text-sm sm:text-base text-gray-600">
                {activeUser?.clinicAddress ||
                  "Av. Paulista, 1000 - São Paulo/SP"}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="font-bold text-base sm:text-lg">
                Nº {consultationNumber}
              </p>
              <p className="text-sm text-gray-600">{formatDateBR(consultationDate)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Atualizado em {formatDateTimeBR(consultationUpdatedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Dados do Paciente */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">
            DADOS DO PACIENTE
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Nome:</strong> {patientData.name}
              </p>
              <p>
                <strong>Espécie:</strong> {patientData.species || patientData.specie}{" "}
                {patientData.subcategory && `(${patientData.subcategory})`}
              </p>
              <p>
                <strong>Raça:</strong> {patientData.breed}
              </p>
              <p>
                <strong>Idade:</strong> {patientData.age}
              </p>
            </div>
            <div>
              <p>
                <strong>Tutor:</strong> {patientData.ownerName}
              </p>
              <p>
                <strong>Telefone:</strong> {patientData.ownerPhone}
              </p>
              <p>
                <strong>E-mail:</strong> {patientData.ownerEmail}
              </p>
            </div>
          </div>
        </div>

        {/* Dados do Veterinário */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">
            DADOS DO VETERINÁRIO
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Nome:</strong>{" "}
                {consultation.veterinarianName ||
                  activeUser?.name ||
                  "Não informado"}
              </p>
              <p>
                <strong>CRMV:</strong>{" "}
                {consultation.veterinarianCRMV ||
                  activeUser?.crmV ||
                  "Não informado"}
              </p>
            </div>
            <div>
              <p>
                <strong>Data/Hora:</strong>{" "}
                {formatDateTimeBR(consultationDate)}
              </p>
              <p>
                <strong>Tipo:</strong>
                {consultationTemplate === "general"
                  ? "Consulta Geral"
                  : consultationTemplate === "return"
                    ? "Retorno"
                    : consultationTemplate === "vaccination"
                      ? "Vacinação"
                      : "Consulta"}
              </p>
            </div>
          </div>
        </div>

        {/* Conteúdo do Prontuário */}
        <div className="p-4 sm:p-6">
          <div className="space-y-6">
            {consultation.consultationType === "retorno" &&
              consultation.previousConsultation && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <h3 className="font-bold text-blue-900 text-base sm:text-lg mb-3">
                    AVALIAÇÃO ANTERIOR
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg bg-white border border-blue-100 p-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1">
                        Data anterior
                      </p>
                      <p className="text-sm text-gray-800">
                        {formatDateTimeBR(
                          consultation.previousConsultation.createdAt,
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white border border-blue-100 p-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1">
                        Prontuário anterior
                      </p>
                      <p className="text-sm text-gray-800">
                        Nº {consultation.previousConsultation.numeroProntuario}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white border border-blue-100 p-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1">
                        Ocorrido anterior
                      </p>
                      <p className="text-sm text-gray-800 whitespace-pre-line">
                        {consultation.previousConsultation.chiefComplaint ||
                          "Não informado"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white border border-blue-100 p-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1">
                        Prescrição/conduta anterior
                      </p>
                      <p className="text-sm text-gray-800 whitespace-pre-line">
                        {consultation.previousConsultation.treatment ||
                          consultation.previousConsultation.medications ||
                          "Não informado"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {consultation.chiefComplaint && (
              <div>
                <h3 className="font-bold text-gray-800 text-base sm:text-lg mb-2">
                  QUEIXA PRINCIPAL
                </h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {consultation.chiefComplaint}
                </p>
              </div>
            )}

            {consultation.anamnesis && (
              <div>
                <h3 className="font-bold text-gray-800 text-base sm:text-lg mb-2">
                  ANAMNESE
                </h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {consultation.anamnesis}
                </p>
              </div>
            )}

            {consultation.clinicalAssessment && (
              <div>
                <h3 className="font-bold text-gray-800 text-base sm:text-lg mb-2">
                  AVALIAÇÃO CLÍNICA
                </h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {consultation.clinicalAssessment}
                </p>
              </div>
            )}

            {consultation.diagnosis && (
              <div>
                <h3 className="font-bold text-gray-800 text-base sm:text-lg mb-2">
                  DIAGNÓSTICO
                </h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {consultation.diagnosis}
                </p>
              </div>
            )}

            {consultation.treatment && (
              <div>
                <h3 className="font-bold text-gray-800 text-base sm:text-lg mb-2">
                  CONDUTA / TRATAMENTO
                </h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {consultation.treatment}
                </p>
              </div>
            )}

            {visibleObservations && (
              <div>
                <h3 className="font-bold text-gray-800 text-base sm:text-lg mb-2">
                  OBSERVAÇÕES
                </h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {visibleObservations}
                </p>
              </div>
            )}

            {/* Campos específicos por espécie */}
            {(consultation.vaccinationStatus ||
              consultation.deworming ||
              consultation.diet ||
              consultation.housing) && (
              <div>
                <h3 className="font-bold text-gray-800 text-base sm:text-lg mb-2">
                  INFORMAÇÕES ESPECÍFICAS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {consultation.vaccinationStatus && (
                    <div>
                      <strong>Vacinação:</strong>{" "}
                      {consultation.vaccinationStatus}
                    </div>
                  )}
                  {consultation.deworming && (
                    <div>
                      <strong>Vermifugação:</strong> {consultation.deworming}
                    </div>
                  )}
                  {consultation.diet && (
                    <div>
                      <strong>Alimentação:</strong> {consultation.diet}
                    </div>
                  )}
                  {consultation.housing && (
                    <div>
                      <strong>Ambiente:</strong> {consultation.housing}
                    </div>
                  )}
                </div>
              </div>
            )}

            {porteData && (
              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">
                  FICHA COMPLEMENTAR ({porteData.porte === "grande" ? "GRANDE PORTE" : "PEQUENO PORTE"})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  {Object.entries(porteData.fields)
                    .filter(([, value]) => String(value || "").trim())
                    .map(([key, value]) => (
                      <div key={key}>
                        <strong>{PORTE_FIELD_LABELS[key] || key}:</strong>{" "}
                        <span className="whitespace-pre-line">{String(value)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com assinatura */}
        <div className="p-4 sm:p-6 border-t border-gray-300">
          <div className="text-center">
            <div className="border-b-2 border-dashed border-gray-400 w-64 mx-auto mb-4"></div>
            <p className="font-bold">
              {consultation.veterinarianName ||
                activeUser?.name ||
                "Veterinário"}
            </p>
            <p>
              {consultation.veterinarianCRMV || activeUser?.crmV || "CRMV"}
            </p>

            {activeUser?.signaturePreview && (
              <div className="mt-4">
                <img
                  src={activeUser.signaturePreview}
                  alt="Assinatura"
                  className="max-w-xs mx-auto"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-4">
          <h2 className="text-xl sm:text-lg font-bold text-gray-800 flex items-center gap-2">
            <AppIcon name="paperclip" className="h-5 w-5" />
            Anexos de exames
          </h2>

          <button
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedCompareFiles([]);
            }}
            className="btn btn-primary btn-md btn-block sm:w-auto"
          >
            {compareMode ? "Cancelar comparacao" : "Comparar lado a lado"}
          </button>
        </div>

        <div className="bg-gray-50 p-3 sm:p-4 rounded-xl mb-6">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-sm text-gray-700">
              ➕ Anexar novo exame
            </h3>
            {remainingImages !== null && (
              <p className="text-xs text-gray-500">
                Fotos clinicas: {imageCount}/{maxClinicalPhotos} (restam{" "}
                {remainingImages})
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.3fr_auto] gap-3">
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 sm:py-2 text-sm"
            >
              <option value="exame">Exame Geral</option>
              <option value="imagem">Imagem</option>
              <option value="radiografia">Radiografia</option>
              <option value="ultrassom">Ultrassom</option>
              <option value="laboratorio">Laboratório</option>
            </select>

            <label className="w-full inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-3 sm:py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
              <span aria-hidden="true">
                <AppIcon name="paperclip" className="h-4 w-4" />
              </span>
              <span className="truncate">{selectedFile ? selectedFile.name : "Anexar arquivo"}</span>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="hidden"
              />
            </label>

            <button
              onClick={handleUploadFile}
              disabled={!selectedFile || uploading}
              className="btn btn-success btn-md btn-block sm:w-auto"
            >
              {uploading && <LoadingDot />}
              {uploading ? "Enviando..." : "📤 Enviar"}
            </button>
          </div>
        </div>

        {/* ================= EXAMES ================= */}
        <div className="mt-6 border-t pt-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">
            Arquivos por categoria
          </h2>

          {loadingFiles && (
            <p className="text-sm text-gray-500 inline-flex items-center gap-2"><LoadingDot className="text-gray-500" /> Carregando anexos...</p>
          )}

          {!loadingFiles && files && (
            <div className="space-y-4">
              {Object.entries(files).map(
                ([type, fileList]) =>
                  fileList.length > 0 && (
                    <div key={type}>
                      <h3 className="font-semibold text-sm text-gray-700 mb-2">
                        {type}
                      </h3>

                      <div className="space-y-2">
                        {fileList.map((file) => (
                          <div
                            key={file.id}
                            className={`flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-3 rounded-lg cursor-pointer ${
                              compareMode &&
                              selectedCompareFiles.find((f) => f.id === file.id)
                                ? "bg-indigo-100 border border-indigo-400"
                                : "bg-gray-50"
                            }`}
                            onClick={() =>
                              compareMode && toggleCompareFile(file)
                            }
                          >
                            <span className="text-sm text-gray-800 break-all">
                              {file.originalName}
                            </span>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <button
                                type="button"
                                className="btn btn-neutral btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreviewFile(file.id);
                                }}
                              >
                                Visualizar
                              </button>
                              <button
                                type="button"
                                className="btn btn-info-soft btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadFile(file);
                                }}
                              >
                                Baixar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {compareMode && (
                        <p className="mt-2 text-xs text-gray-500">
                          Selecione apenas imagens para comparar no slider.
                        </p>
                      )}
                    </div>
                  ),
              )}

              {Object.values(files).every((arr) => arr.length === 0) && (
                <p className="text-sm text-gray-500">Nenhum exame anexado.</p>
              )}
            </div>
          )}
          {!loadingFiles && !files && (
            <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">
              Nao foi possivel carregar os anexos.{" "}
              <button type="button" onClick={fetchFiles} className="font-semibold text-blue-700">
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        {compareMode && selectedCompareFiles.length === 2 && (
          <BeforeAfterSlider
            before={selectedCompareFiles[0]}
            after={selectedCompareFiles[1]}
          />
        )}

        {/* Botões de ação */}
        <div className="mt-4 border-t border-gray-200 bg-white/95 backdrop-blur p-4 sm:p-6">
          <div className="mx-auto max-w-4xl grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:space-x-3 sm:gap-0">
          <button
            onClick={() => onClose?.()}
            className="btn btn-neutral btn-md btn-block sm:w-auto"
          >
            Fechar
          </button>
          <button
            onClick={openPrintModal}
            className="btn btn-success btn-md btn-block sm:w-auto"
          >
            <span className="mr-2">
              <AppIcon name="print" className="h-4 w-4" />
            </span>
            Abrir PDF
          </button>
          </div>
        </div>
      </div>

      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={printModalTitleId}
            aria-describedby={printModalDescriptionId}
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-4 shadow-xl"
          >
            <h3 id={printModalTitleId} className="text-base font-bold text-gray-900">
              Selecionar anexos para imprimir
            </h3>
            <p id={printModalDescriptionId} className="mt-1 text-sm text-gray-600">
              Escolha quais anexos devem acompanhar o prontuario em PDF.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedPrintFileIds(allFiles.map((file) => file.id))}
                className="btn btn-info-soft btn-sm"
              >
                Selecionar todos
              </button>
              <button
                type="button"
                onClick={() => setSelectedPrintFileIds([])}
                className="btn btn-neutral btn-sm"
              >
                Limpar selecao
              </button>
            </div>

            <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2">
              {hasFiles ? (
                <div className="space-y-2">
                  {allFiles.map((file) => (
                    <label
                      key={file.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPrintFileIds.includes(file.id)}
                        onChange={() => togglePrintFile(file.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="flex-1 truncate">{file.originalName}</span>
                      <span className="text-xs text-gray-400">{file.examType || "ANEXO"}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nenhum anexo encontrado.</p>
              )}
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Selecionados: {selectedPrintFileIds.length} de {allFiles.length}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="btn btn-neutral btn-sm btn-block sm:w-auto"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsPrintModalOpen(false);
                  await handleDownloadConsultationPDFWithFiles([]);
                }}
                className="btn btn-info-soft btn-sm btn-block sm:w-auto"
              >
                Imprimir sem anexos
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsPrintModalOpen(false);
                  await handleDownloadConsultationPDFWithFiles(selectedPrintFileIds);
                }}
                className="btn btn-success btn-sm btn-block sm:w-auto"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ConsultationPreview.propTypes = {
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
    files: PropTypes.array,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string
  }).isRequired,
  patient: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    species: PropTypes.string,
    subcategory: PropTypes.string,
    breed: PropTypes.string,
    sex: PropTypes.string,
    age: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    weight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    color: PropTypes.string,
    microchip: PropTypes.string,
    ownerName: PropTypes.string,
    ownerPhone: PropTypes.string,
    ownerEmail: PropTypes.string
  }).isRequired,
  currentUser: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    email: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired
};

ConsultationPreview.defaultProps = {
  currentUser: null
};

export default ConsultationPreview;

