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

  // Inicializa todos os meses com 0
  const monthlyData = Array(12).fill(0);

  grouped.forEach((item) => {
    const monthIndex = Number(item.month) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      monthlyData[monthIndex] = Number(item.total) || 0;
    }
  });

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

module.exports = {
  getDashboardData,
  getMonthlyConsultations,
};
