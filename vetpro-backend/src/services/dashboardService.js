const prisma = require("../lib/prisma");

async function getDashboardData(userId) {
  const now = new Date();

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
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
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  const grouped = await prisma.consultation.groupBy({
    by: ["createdAt"],
    where: {
      userId,
      createdAt: {
        gte: startOfYear,
        lte: endOfYear,
      },
    },
    _count: {
      _all: true,
    },
  });

  // Inicializa todos os meses com 0
  const monthlyData = Array(12).fill(0);

  grouped.forEach((item) => {
    const month = new Date(item.createdAt).getMonth();
    monthlyData[month] += item._count._all;
  });

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
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
