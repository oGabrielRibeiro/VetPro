# Optimize localStorage in App.jsx - Add debounced save and item limits
$filePath = "vetpro-front\src\App.jsx"
$content = Get-Content $filePath -Raw

# 1. Add saveTimeoutRef and debounced save function after the state declarations
$searchPattern = 'const [dataError, setDataError] = useState("");'
$replaceWith = 'const [dataError, setDataError] = useState("");
  const saveTimeoutRef = useRef(null);
  const MAX_LOCALSTORAGE_ITEMS = 100;

  // Debounced localStorage save function
  const debouncedSave = useCallback((key, data) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      try {
        if (Array.isArray(data) && data.length > MAX_LOCALSTORAGE_ITEMS) {
          const limitedData = data.slice(0, MAX_LOCALSTORAGE_ITEMS);
          localStorage.setItem(key, JSON.stringify(limitedData));
          console.log(`[localStorage] Limited ${key} to ${MAX_LOCALSTORAGE_ITEMS} items`);
        } else if (data) {
          localStorage.setItem(key, JSON.stringify(data));
        }
      } catch (error) {
        console.error(`[localStorage] Error saving ${key}:`, error);
      }
    }, 1000);
  }, []);'
$content = $content.Replace($searchPattern, $replaceWith)

# 2. Replace the first localStorage save useEffect (patients)
$searchPattern2 = '  // Salvar dados no localStorage com tratamento de erros
  useEffect(() => {
    try {
      if (patients.length > 0) {
        localStorage.setItem("vetpro_patients", JSON.stringify(patients));
      }
    } catch (error) {
      console.error("Erro ao salvar pacientes:", error);
    }
  }, [patients]);'
$replaceWith2 = '  // Consolidated debounced localStorage saves
  useEffect(() => {
    if (patients.length > 0) {
      debouncedSave("vetpro_patients", patients);
    }
  }, [patients, debouncedSave]);'
$content = $content.Replace($searchPattern2, $replaceWith2)

# 3. Replace the consultations useEffect
$searchPattern3 = '  useEffect(() => {
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
  }, [consultations]);'
$replaceWith3 = '  useEffect(() => {
    if (consultations.length > 0) {
      debouncedSave("vetpro_consultations", consultations);
    }
  }, [consultations, debouncedSave]);'
$content = $content.Replace($searchPattern3, $replaceWith3)

# 4. Replace the appointments useEffect
$searchPattern4 = '  useEffect(() => {
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
  }, [appointments]);'
$replaceWith4 = '  useEffect(() => {
    if (appointments.length > 0) {
      debouncedSave("vetpro_appointments", appointments);
    }
  }, [appointments, debouncedSave]);'
$content = $content.Replace($searchPattern4, $replaceWith4)

# 5. Add cleanup on unmount after fieldMode effect
$searchPattern5 = '  useEffect(() => {
    localStorage.setItem("vetpro_field_mode", fieldMode ? "true" : "false");
  }, [fieldMode]);'
$replaceWith5 = '  useEffect(() => {
    localStorage.setItem("vetpro_field_mode", fieldMode ? "true" : "false");
  }, [fieldMode]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);'
$content = $content.Replace($searchPattern5, $replaceWith5)

Set-Content -Path $filePath -Value $content -NoNewline
Write-Host "localStorage optimization applied"
