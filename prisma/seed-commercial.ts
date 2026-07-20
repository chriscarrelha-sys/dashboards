/**
 * Commercial-catalog-only seed. Populates plans/prices/entitlements/add-ons/AI
 * actions/vendor rates/budgets/trial+founding config WITHOUT any demonstration
 * cases — the right starting point for a personal instance you'll fill with your
 * own real matters. Idempotent (safe to re-run).
 */
import { PrismaClient } from '@prisma/client';
import { seedCommercial } from '../lib/commercial/seed';

const prisma = new PrismaClient();

async function main() {
  const r = await seedCommercial(prisma);
  console.log(`Commercial catalog seeded: ${r.plans} plans, ${r.prices} prices, ${r.addOns} add-ons, ${r.actions} AI actions. No demo cases created.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
