import { ticket_status, type Prisma } from "../src/generated/prisma/client.ts";
import { prisma } from "../src/lib/prisma.ts";

async function seedDemoData(db: Prisma.TransactionClient) {
  if ((await db.user.count()) > 0 || (await db.ticket.count()) > 0) {
    throw new Error("Seed requires an empty database.");
  }

  const customer = await db.user.create({
    data: { firstName: "Mina", lastName: "Demo" },
    select: { id: true },
  });

  const operators = await Promise.all(
    [
      { firstName: "Sara", code: "OP-001" },
      { firstName: "Reza", code: "OP-002" },
    ].map(({ firstName, code }) =>
      db.operator.create({
        data: { code, user: { create: { firstName, lastName: "Demo" } } },
        select: { id: true, code: true, userId: true },
      }),
    ),
  );
  const [sara, reza] = operators;

  const tickets = await Promise.all(
    [
      {
        title: "Cannot sign in",
        description: "The customer cannot sign in after resetting the password.",
        status: ticket_status.OPEN,
        operatorId: null,
      },
      {
        title: "Invoice missing",
        description: "The customer needs a copy of the latest invoice.",
        status: ticket_status.OPEN,
        operatorId: null,
      },
      {
        title: "Notifications delayed",
        description: "Notifications arrive several hours after an update.",
        status: ticket_status.IN_PROGRESS,
        operatorId: sara.id,
      },
      {
        title: "Duplicate invoice",
        description: "The same invoice appeared twice in the customer account.",
        status: ticket_status.RESOLVED,
        operatorId: reza.id,
      },
      {
        title: "Profile name correction",
        description: "The display name was corrected and the customer confirmed it.",
        status: ticket_status.CLOSED,
        operatorId: sara.id,
      },
    ].map((ticket) =>
      db.ticket.create({
        data: { ...ticket, userId: customer.id },
        select: { id: true, title: true, status: true, operatorId: true },
      }),
    ),
  );
  const [open, , active, resolved, closed] = tickets;

  await db.comment.createMany({
    data: [
      { ticketId: open.id, authorId: customer.id, text: "I tried a password reset." },
      { ticketId: active.id, authorId: sara.userId, text: "I am checking the delivery logs." },
      { ticketId: resolved.id, authorId: reza.userId, text: "The duplicate invoice was removed." },
      { ticketId: closed.id, authorId: customer.id, text: "The name looks correct now." },
    ],
  });

  return { operators, tickets };
}

try {
  const { operators, tickets } = await prisma.$transaction(seedDemoData, {
    isolationLevel: "Serializable",
  });
  console.table(operators);
  console.table(tickets);
} finally {
  await prisma.$disconnect();
}
