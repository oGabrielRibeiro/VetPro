import { useEffect, useState } from "react";
import api, { buildApiUrl } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import BeforeAfterSlider from "../components/BeforeAfterSlider";
import AppIcon from "./AppIcon";

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

  useEffect(() => {
    if (!consultation?.id) return;

    const fetchFiles = async () => {
      try {
        setLoadingFiles(true);

        const response = await api.get(
          `/consultations/${consultation.id}/files`,
        );

        setFiles(response.data);
      } catch (err) {
        console.error("Erro ao buscar exames:", err);
      } finally {
        setLoadingFiles(false);
      }
    };

    fetchFiles();
  }, [consultation?.id]);

  if (!consultation) return null;
  const patientData = patient || consultation.patient || {};
  const consultationDate = consultation.date || consultation.createdAt;
  const consultationNumber =
    consultation.recordNumber || consultation.numeroProntuario || consultation.id;
  const consultationTemplate =
    consultation.template ||
    (consultation.consultationType === "retorno" ? "return" : "general");

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

      // Atualizar lista após upload
      const response = await api.get(`/consultations/${consultation.id}/files`);

      setFiles(response.data);
      setSelectedFile(null);
    } catch (err) {
      console.error("Erro ao enviar exame:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadConsultationPDF = () => {
    const token = localStorage.getItem("token");
    window.open(
      buildApiUrl(`/consultations/${consultation.id}/pdf`, { token }),
      "_blank",
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-none sm:rounded-xl max-w-4xl w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho da ficha */}
        <div className="border-b border-gray-300 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                PRONTUÁRIO CLÍNICO VETERINÁRIO
              </h1>
              <p className="text-gray-600 mt-1">
                {activeUser?.clinicName || "Clínica VetCare"}
              </p>
              <p className="text-gray-600">
                {activeUser?.clinicAddress ||
                  "Av. Paulista, 1000 - São Paulo/SP"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">
                Nº {consultationNumber}
              </p>
              <p className="text-gray-600">{formatDateBR(consultationDate)}</p>
            </div>
          </div>
        </div>

        {/* Dados do Paciente */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
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
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
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
        <div className="p-6">
          <div className="space-y-6">
            {consultation.consultationType === "retorno" &&
              consultation.previousConsultation && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                  <h3 className="font-bold text-blue-900 text-lg mb-3">
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
                <h3 className="font-bold text-gray-800 text-lg mb-2">
                  QUEIXA PRINCIPAL
                </h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {consultation.chiefComplaint}
                </p>
              </div>
            )}

            {consultation.anamnesis && (
              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">
                  ANAMNESE
                </h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {consultation.anamnesis}
                </p>
              </div>
            )}

            {consultation.clinicalAssessment && (
              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">
                  AVALIAÇÃO CLÍNICA
                </h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {consultation.clinicalAssessment}
                </p>
              </div>
            )}

            {consultation.diagnosis && (
              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">
                  DIAGNÓSTICO
                </h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {consultation.diagnosis}
                </p>
              </div>
            )}

            {consultation.treatment && (
              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">
                  CONDUTA / TRATAMENTO
                </h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {consultation.treatment}
                </p>
              </div>
            )}

            {consultation.observations && (
              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">
                  OBSERVAÇÕES
                </h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {consultation.observations}
                </p>
              </div>
            )}

            {/* Campos específicos por espécie */}
            {(consultation.vaccinationStatus ||
              consultation.deworming ||
              consultation.diet ||
              consultation.housing) && (
              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">
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
          </div>
        </div>

        {/* Rodapé com assinatura */}
        <div className="p-6 border-t border-gray-300">
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

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <AppIcon name="paperclip" className="h-5 w-5" />
            Exames Anexados
          </h2>

          <button
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedCompareFiles([]);
            }}
            className="text-sm bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700"
          >
            {compareMode ? "Cancelar Comparação" : "Comparar Lado a Lado"}
          </button>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl mb-6">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">
            ➕ Anexar Novo Exame
          </h3>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="exame">Exame Geral</option>
              <option value="imagem">Imagem</option>
              <option value="radiografia">Radiografia</option>
              <option value="ultrassom">Ultrassom</option>
              <option value="laboratorio">Laboratório</option>
            </select>

            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
              <span aria-hidden="true">
                <AppIcon name="paperclip" className="h-4 w-4" />
              </span>
              <span>{selectedFile ? selectedFile.name : "Anexar arquivo"}</span>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="hidden"
              />
            </label>

            <button
              onClick={handleUploadFile}
              disabled={!selectedFile || uploading}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {uploading ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>

        {/* ================= EXAMES ================= */}
        <div className="mt-6 border-t pt-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">
            Arquivos por categoria
          </h2>

          {loadingFiles && (
            <p className="text-sm text-gray-500">Carregando exames...</p>
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
                            className={`flex justify-between items-center p-3 rounded-lg cursor-pointer ${
                              compareMode &&
                              selectedCompareFiles.find((f) => f.id === file.id)
                                ? "bg-indigo-100 border border-indigo-400"
                                : "bg-gray-50"
                            }`}
                            onClick={() =>
                              compareMode && toggleCompareFile(file)
                            }
                          >
                            <span className="text-sm text-gray-800">
                              {file.originalName}
                            </span>

                            <div className="flex items-center gap-3">
                              <a
                                href={buildApiUrl(`/consultations/files/${file.id}/view`, {
                                  token: localStorage.getItem("token"),
                                })}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Visualizar
                              </a>
                              <a
                                href={buildApiUrl(`/consultations/files/${file.id}/view`, {
                                  token: localStorage.getItem("token"),
                                })}
                                download={file.originalName}
                                className="text-indigo-600 hover:text-indigo-700 text-xs font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Baixar
                              </a>
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
        </div>

        {compareMode && selectedCompareFiles.length === 2 && (
          <BeforeAfterSlider
            before={selectedCompareFiles[0]}
            after={selectedCompareFiles[1]}
          />
        )}

        {/* Botões de ação */}
        <div className="p-6 bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={() => onClose?.()}
            className="px-6 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={handleDownloadConsultationPDF}
            className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center"
          >
            <span className="mr-2">
              <AppIcon name="print" className="h-4 w-4" />
            </span>
            Imprimir PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationPreview;

