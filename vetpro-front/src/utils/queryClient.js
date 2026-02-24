import { QueryClient } from '@tanstack/react-query';

// Configuração do React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tempo padrão para manter os dados em cache
      staleTime: 5 * 60 * 1000, // 5 minutos
      // Tempo para considerar dados como "stale" após foco na janela
      gcTime: 30 * 60 * 1000, // 30 minutos (anteriormente cacheTime)
      // Número de tentativas em caso de erro
      retry: 2,
      // Não refetch automático quando a janela ganha foco
      refetchOnWindowFocus: false,
      // Não refetch automático ao reconectar
      refetchOnReconnect: true,
    },
    mutations: {
      // Número de tentativas em caso de erro
      retry: 1,
    },
  },
});

// Hooks customizados para operações comuns
export const queryKeys = {
  patients: ['patients'] as const,
  patient: (id: string) => ['patients', id] as const,
  consultations: ['consultations'] as const,
  consultation: (id: string) => ['consultations', id] as const,
  appointments: ['appointments'] as const,
  dashboard: ['dashboard'] as const,
};

export default queryClient;
