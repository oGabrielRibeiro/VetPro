import { useState, useCallback } from "react";
import localStorageService from "../services/localStorageService";
import { toUserFriendlyError } from "../utils/errorMessages";

// Hook para chamadas de API locais
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiCall = useCallback(async (operation, data = null) => {
    setLoading(true);
    setError(null);

    try {
      let result;

      switch (operation) {
        case "GET_PATIENTS": {
          result = localStorageService.load("patients", []);
          break;
        }
        case "CREATE_PATIENT": {
          const patients = localStorageService.load("patients", []);
          const newPatient = {
            ...data,
            id: Date.now(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          localStorageService.save("patients", [...patients, newPatient]);
          localStorageService.save("lastActivity", new Date().toISOString());
          result = newPatient;
          break;
        }
        case "UPDATE_PATIENT": {
          const allPatients = localStorageService.load("patients", []);
          const updatedPatients = allPatients.map((p) =>
            p.id === data.id ? { ...data, updatedAt: new Date().toISOString() } : p,
          );
          localStorageService.save("patients", updatedPatients);
          localStorageService.save("lastActivity", new Date().toISOString());
          result = data;
          break;
        }
        case "DELETE_PATIENT": {
          const remainingPatients = localStorageService
            .load("patients", [])
            .filter((p) => p.id !== data.id);
          localStorageService.save("patients", remainingPatients);
          localStorageService.save("lastActivity", new Date().toISOString());
          result = { success: true };
          break;
        }
        case "GET_CONSULTATIONS": {
          result = localStorageService.load("consultations", []);
          break;
        }
        case "CREATE_CONSULTATION": {
          const consultations = localStorageService.load("consultations", []);
          const recordNumber = `VET-${new Date().getFullYear()}-${String(
            consultations.length + 1,
          ).padStart(3, "0")}`;
          const newConsultation = {
            ...data,
            id: Date.now(),
            recordNumber,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          localStorageService.save("consultations", [...consultations, newConsultation]);
          localStorageService.save("lastActivity", new Date().toISOString());
          result = newConsultation;
          break;
        }
        case "GET_APPOINTMENTS": {
          result = localStorageService.load("appointments", []);
          break;
        }
        case "CREATE_APPOINTMENT": {
          const appointments = localStorageService.load("appointments", []);
          const newAppointment = {
            ...data,
            id: Date.now(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          localStorageService.save("appointments", [...appointments, newAppointment]);
          localStorageService.save("lastActivity", new Date().toISOString());
          result = newAppointment;
          break;
        }
        default:
          throw new Error("Operacao nao suportada");
      }

      return result;
    } catch (err) {
      setError(toUserFriendlyError(err, "Nao foi possivel concluir a operacao."));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, apiCall };
};
