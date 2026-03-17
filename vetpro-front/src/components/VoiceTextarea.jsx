import { useEffect, useMemo, useRef, useState } from "react";
import FeedbackBanner from "./FeedbackBanner";

const VoiceTextarea = ({
  id,
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  className = "",
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [feedback, setFeedback] = useState("");
  const keepRecordingRef = useRef(false);
  const valueRef = useRef(value || "");

  useEffect(() => {
    valueRef.current = value || "";
  }, [value]);

  const supportsSpeech = useMemo(
    () =>
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
    [],
  );

  useEffect(() => {
    return () => {
      keepRecordingRef.current = false;
      recognition?.stop?.();
    };
  }, [recognition]);

  const toggleRecording = () => {
    if (!supportsSpeech) {
      setFeedback(
        "Reconhecimento de voz não disponível neste navegador. Use Chrome atualizado ou preencha manualmente.",
      );
      return;
    }

    if (feedback) setFeedback("");

    if (isRecording && recognition) {
      keepRecordingRef.current = false;
      recognition.stop();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const next = new SpeechRecognition();
    next.lang = "pt-BR";
    next.continuous = true;
    next.interimResults = false;

    keepRecordingRef.current = true;
    next.onstart = () => setIsRecording(true);
    next.onend = () => {
      if (keepRecordingRef.current) {
        try {
          next.start();
          return;
        } catch {
          // fall through and finalize recording state
        }
      }
      setIsRecording(false);
    };
    next.onerror = () => {
      if (!keepRecordingRef.current) {
        setIsRecording(false);
      }
    };
    next.onresult = (event) => {
      const transcript =
        event.results[event.results.length - 1]?.[0]?.transcript || "";
      if (!transcript) return;
      const base = valueRef.current.trim();
      const merged = `${base}${base ? " " : ""}${transcript.trim()}`;
      valueRef.current = merged;
      onChange(merged);
    };

    setRecognition(next);
    next.start();
  };

  return (
    <div>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <button
          type="button"
          onClick={toggleRecording}
          className={`w-full sm:w-auto min-h-[42px] rounded-lg px-3 py-2 text-xs font-semibold text-white flex items-center justify-center gap-2 ${
            isRecording ? "bg-red-600" : "bg-indigo-600"
          }`}
        >
          {isRecording ? (
            <>
              <span className="animate-pulse">🎤</span>
              <span className="hidden sm:inline">Gravando...</span>
            </>
          ) : (
            <>
              <span>🎤</span>
              <span className="hidden sm:inline">Por voz</span>
            </>
          )}
        </button>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`vp-input-field text-base sm:text-sm py-3 ${className}`}
      />
      <FeedbackBanner className="mt-2" type="error" message={feedback} onClose={() => setFeedback("")} />
    </div>
  );
};

export default VoiceTextarea;


