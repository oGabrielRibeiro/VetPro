import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  client: {
    engineType: 'binary',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
