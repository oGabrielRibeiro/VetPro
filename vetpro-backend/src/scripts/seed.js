// Console replaced by logger
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

async function main() {
  const password = 'admin123'; // mude depois
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  const user = await prisma.user.upsert({
    where: { email: 'admin@vetpro.local' },
    update: {},
    create: {
      name: 'Admin VetPro',
      email: 'admin@vetpro.local',
      password: hash,
      crmv: '00000',
      clinicName: 'Clínica Exemplo',
    },
  });

  logger.info('Admin criado:', user.email, 'senha:', password);
}

main()
  .catch((e) => {
    logger.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
