require('../config/loadEnv');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const globalForPrisma = global;

const pool = globalForPrisma.prismaPool
  ? globalForPrisma.prismaPool
  : new Pool({
      connectionString: process.env.DATABASE_URL,
    });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaPool = pool;
}

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
