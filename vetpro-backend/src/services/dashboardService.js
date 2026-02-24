const prisma = require('../lib/prisma');

async function getDashboardData(userId) {
  const now = new Date();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const [
    totalPatients,
    totalConsultations,
    consultationsThisMonth,
    consultationsToday,
  ] = await Promise.all([
    prisma.patient.count({
      where: { userId },
    }),
    prisma.consultation.count({
      where: { userId },
    }),
    prisma.consultation.count({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
        },
      },
    }),
    prisma.consultation.count({
      where: {
        userId,
        createdAt: {
          gte: startOfToday,
        },
      },
    }),
  ]);

  return {
    totalPatients,
    totalConsultations,
    consultationsThisMonth,
    consultationsToday,
  };
}

async function getMonthlyConsultations(userId, yearParam) {
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);

  const grouped = await prisma.$queryRaw`
    SELECT
      EXTRACT(MONTH FROM "createdAt")::int AS month,
      COUNT(*)::int AS total
    FROM "Consultation"
    WHERE "userId" = ${userId}
      AND "createdAt" >= ${startOfYear}
      AND "createdAt" < ${endOfYear}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  const monthlyData = Array(12).fill(0);

  for (let i = 0; i < grouped.length; i += 1) {
    const item = grouped[i];
    const monthIndex = Number(item.month) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      monthlyData[monthIndex] = Number(item.total) || 0;
    }
  }

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  return months.map((month, index) => ({
    month,
    total: monthlyData[index],
  }));
}

/**
 * Distribuição de pacientes por espécie
 */
async function getSpeciesDistribution(userId) {
  const patients = await prisma.patient.findMany({
    where: { userId },
    select: { specie: true },
  });

  const distribution = {};
  patients.forEach((p) => {
    const specie = p.specie || 'Outro';
    distribution[specie] = (distribution[specie] || 0) + 1;
  });

  return Object.entries(distribution).map(([name, value]) => ({
    name,
    value,
  }));
}

/**
 * Evolução de pacientes por mês
 */
async function getPatientsByMonth(userId, months = 6) {
  const now = new Date();
  const startDate = new Date(
    now.getFullYear(),
    now.getMonth() - (months - 1),
    1,
  );

  const patients = await prisma.patient.findMany({
    where: {
      userId,
      createdAt: { gte: startDate },
    },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const monthlyData = {};
  const monthsList = [];

  for (let i = 0; i < months; i++) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - (months - 1) + i,
      1,
    );
    const key = date.toLocaleDateString('pt-BR', { month: 'short' });
    monthsList.push(key);
    monthlyData[key] = { total: 0, new: 0 };
  }

  let runningTotal = await prisma.patient.count({
    where: { userId, createdAt: { lt: startDate } },
  });

  patients.forEach((p) => {
    const key = new Date(p.createdAt).toLocaleDateString('pt-BR', {
      month: 'short',
    });
    if (monthlyData[key]) {
      monthlyData[key].new += 1;
      runningTotal += 1;
      monthlyData[key].total = runningTotal;
    }
  });

  return monthsList.map((month) => ({
    month,
    total: monthlyData[month].total,
    new: monthlyData[month].new,
  }));
}

/**
 * Consultas por tipo
 */
async function getConsultationsByType(userId) {
  const consultations = await prisma.consultation.findMany({
    where: { userId },
    select: { consultationType: true },
  });

  const distribution = {};
  consultations.forEach((c) => {
    const type = c.consultationType || 'normal';
    distribution[type] = (distribution[type] || 0) + 1;
  });

  const typeLabels = {
    normal: 'Normal',
    retorno: 'Retorno',
    emergencia: 'Emergência',
    acompanhamento: 'Acompanhamento',
  };

  return Object.entries(distribution).map(([type, count]) => ({
    type: typeLabels[type] || type,
    count,
  }));
}

module.exports = {
  getDashboardData,
  getMonthlyConsultations,
  getSpeciesDistribution,
  getPatientsByMonth,
  getConsultationsByType,
};
