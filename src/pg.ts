import { prisma } from "./lib/prisma.ts";

async function main() {
  const ticket = await prisma.ticket.findUnique({
    where: {
      id: 20,
    },
  });
  console.log("Ticket:", JSON.stringify(ticket, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
