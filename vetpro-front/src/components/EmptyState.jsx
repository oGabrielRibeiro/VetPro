import React from 'react';
import AppIcon from './AppIcon';

const EmptyState = ({
  title = 'Nenhum registro encontrado',
  description = 'Não há dados para exibir nesta lista.',
  icon = 'search',
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`text-center py-8 sm:py-12 px-4 ${className}`}>
      <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-700">
        <AppIcon name={icon} className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

// EmptyState específico para pacientes
export const EmptyPatientsState = ({ onAddPatient }) => (
  <EmptyState
    title="Nenhum paciente cadastrado"
    description="Você ainda não cadastrou nenhum paciente. Comece adicionando seu primeiro paciente."
    icon="patients"
    actionLabel="Adicionar Paciente"
    onAction={onAddPatient}
  />
);

// EmptyState específico para consultas
export const EmptyConsultationsState = ({ onNewConsultation }) => (
  <EmptyState
    title="Nenhum prontuário registrado"
    description="Você ainda não registrou nenhuma consulta. Comece registrando a primeira consulta do seu paciente."
    icon="consultations"
    actionLabel="Registrar Primeira Consulta"
    onAction={onNewConsultation}
  />
);

// EmptyState específico para agendamentos
export const EmptyAppointmentsState = ({ onNewAppointment }) => (
  <EmptyState
    title="Nenhum agendamento"
    description="Você não tem agendamentos pendentes."
    icon="appointments"
    actionLabel="Novo Agendamento"
    onAction={onNewAppointment}
  />
);

// EmptyState para busca vazia
export const EmptySearchState = ({ searchQuery, onClear }) => (
  <EmptyState
    title="Nenhum resultado encontrado"
    description={`Não encontramos resultados para "${searchQuery}". Tente outros termos.`}
    icon="search"
    actionLabel="Limpar Busca"
    onAction={onClear}
  />
);

export default EmptyState;
