import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { initializeDemoCatalog } from './catalog.js';

const prisma = new PrismaClient();

try {
  const { count } = await initializeDemoCatalog(prisma);
  console.log(count > 0
    ? `Initialized ${count} ShopSmart demo products in the empty database.`
    : 'Existing application data found. Catalog initialization skipped; no data changed.');
} catch {
  console.error('Catalog initialization failed. Check database connectivity and committed migrations.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
