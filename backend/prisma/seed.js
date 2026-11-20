import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { demoProducts } from './catalog.js';
const prisma = new PrismaClient();

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.product.createMany({ data: demoProducts });
  console.log(`Seeded ${demoProducts.length} ShopSmart products.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
