import { PrismaClient, Prisma } from '@/app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // reset the old data
  // await prisma.log.deleteMany();
  const myUserId = '3c9b6012-48aa-4b09-b8df-44da1c776947';

  const logsData: Prisma.LogCreateInput[] = [
    {
      userId: myUserId,
      content: { activity: 'Handle RLS with Prisma', status: 'failure' },
    },
    {
      userId: myUserId,
      content: {
        activity:
          'Handle RLS with Prisma inside migrate.sql. Getting around auth.uid() with request.jwt.claim.sub',
        status: 'success',
      },
    },
  ];
  console.log(`Start seeding...`);
  for (const log of logsData) {
    const l = await prisma.log.create({ data: log });
    console.log(`Created log with id ${l.id}`);
  }
  console.log(`Finished seeding`);
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
