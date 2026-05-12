const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

async function main() {
  const password = 'admin123';

  const salt = await bcrypt.genSalt(10);

  const hash = await bcrypt.hash(password, salt);

  // =====================================================
  // CLINIC
  // =====================================================

  let clinic = await prisma.clinic.findFirst({
    where: {
      name: 'Clínica Exemplo',
    },
  });

  if (!clinic) {
    clinic = await prisma.clinic.create({
      data: {
        name: 'Clínica Exemplo',
      },
    });

    logger.info('Clínica criada:', clinic.name);
  }

  // =====================================================
  // USER
  // =====================================================

  const user = await prisma.user.upsert({
    where: {
      email: 'admin@vetpro.local',
    },

    update: {},

    create: {
      name: 'Admin VetPro',
      email: 'admin@vetpro.local',
      password: hash,
      crmv: '00000',

      clinic: {
        connect: {
          id: clinic.id,
        },
      },
    },
  });

  logger.info('Admin criado:', user.email);
  logger.info('Senha inicial:', password);
}

main()
  .catch((e) => {
    logger.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
