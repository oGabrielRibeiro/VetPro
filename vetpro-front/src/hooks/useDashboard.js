import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { queryKeys } from '../utils/queryClient';

/**
 * Hook para buscar dados do dashboard
 */
export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const response = await api.get('/dashboard');
      return response.data;
    },
    // Dados do dashboard não mudam tão frequentemente
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar estatísticas gerais
 */
export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const [patientsRes, consultationsRes, appointmentsRes] = await Promise.all([
        api.get('/patients?limit=1'),
        api.get('/consultations?limit=1'),
        api.get('/appointments'),
      ]);

      return {
        totalPatients: patientsRes.data?.total || 0,
        totalConsultations: consultationsRes.data?.total || 0,
        todayAppointments: appointmentsRes.data?.filter(a => {
          const today = new Date().toISOString().split('T')[0];
          return a.date === today;
        }).length || 0,
      };
    },
  });
}

/**
 * Hook para buscar dados de pacientes para gráficos
 */
export function usePatientsChartData(period = '6months') {
  return useQuery({
    queryKey: ['patients', 'chart', period],
    queryFn: async () => {
      const response = await api.get(`/patients?chartData=true&period=${period}`);
      return response.data;
    },
  });
}

/**
 * Hook para buscar dados de consultas para gráficos
 */
export function useConsultationsChartData(period = '6months') {
  return useQuery({
    queryKey: ['consultations', 'chart', period],
    queryFn: async () => {
      const response = await api.get(`/consultations?chartData=true&period=${period}`);
      return response.data;
    },
  });
}

/**
 * Hook para buscar distribuição por espécie
 */
export function useSpeciesDistribution() {
  return useQuery({
    queryKey: ['patients', 'species-distribution'],
    queryFn: async () => {
      const response = await api.get('/patients/species-distribution');
      return response.data;
    },
  });
}

export default {
  useDashboard,
  useStats,
  usePatientsChartData,
  useConsultationsChartData,
  useSpeciesDistribution,
};
