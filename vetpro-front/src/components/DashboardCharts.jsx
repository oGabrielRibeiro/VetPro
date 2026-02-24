import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];

// Paleta de cores para gráficos
const CHART_COLORS = {
  primary: '#10b981',
  secondary: '#3b82f6',
  tertiary: '#8b5cf6',
  quaternary: '#f59e0b',
  danger: '#ef4444',
};

/**
 * Gráfico de barras - Consultas por mês
 */
export const ConsultationsByMonthChart = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return <div className="text-gray-400 text-center py-8">Sem dados disponíveis</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
        <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(value) => [value, 'Consultas']}
        />
        <Legend />
        <Bar dataKey="count" name="Consultas" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

/**
 * Gráfico de linha - Evolução de pacientes
 */
export const PatientsEvolutionChart = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return <div className="text-gray-400 text-center py-8">Sem dados disponíveis</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
        <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(value) => [value, 'Pacientes']}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="total"
          name="Total"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={{ fill: CHART_COLORS.primary }}
        />
        <Line
          type="monotone"
          dataKey="new"
          name="Novos"
          stroke={CHART_COLORS.secondary}
          strokeWidth={2}
          dot={{ fill: CHART_COLORS.secondary }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

/**
 * Gráfico de pizza - Distribuição por espécie
 */
export const SpeciesDistributionChart = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return <div className="text-gray-400 text-center py-8">Sem dados disponíveis</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(value) => [value, 'Quantidade']}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

/**
 * Gráfico de barras horizontais - Consultas por tipo
 */
export const ConsultationTypeChart = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return <div className="text-gray-400 text-center py-8">Sem dados disponíveis</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6b7280" />
        <YAxis type="category" dataKey="type" tick={{ fontSize: 12 }} stroke="#6b7280" width={60} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(value) => [value, 'Quantidade']}
        />
        <Legend />
        <Bar dataKey="count" name="Quantidade" fill={CHART_COLORS.tertiary} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

/**
 * Gráfico de área - Tendência de atendimentos
 */
export const TrendChart = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return <div className="text-gray-400 text-center py-8">Sem dados disponíveis</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
        <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="consultations"
          name="Consultas"
          stroke={CHART_COLORS.primary}
          fill={CHART_COLORS.primary}
          strokeWidth={2}
          fillOpacity={0.2}
        />
        <Line
          type="monotone"
          dataKey="appointments"
          name="Agendamentos"
          stroke={CHART_COLORS.secondary}
          fill={CHART_COLORS.secondary}
          strokeWidth={2}
          fillOpacity={0.2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default {
  ConsultationsByMonthChart,
  PatientsEvolutionChart,
  SpeciesDistributionChart,
  ConsultationTypeChart,
  TrendChart,
};
