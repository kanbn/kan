
import crypto from "crypto";
import { createDrizzleClient } from "./client"; 
import {  boards, labels, lists, users, workspaceMembers, workspaces } from "./schema";
import { create as createMember } from "./repository/member.repo";
import { bulkCreate } from "./repository/list.repo";

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .createHmac("sha512", salt)
    .update(password)
    .digest("hex");

  return `${salt}:${hash}`;
}

export async function seed(db: ReturnType<typeof createDrizzleClient>) {
  try {
    await seedWorkspaces(db);
    const userId = await seedUsers(db);
    await seedBoards(db);
    await seedLabels(db);
    await seedLists(db, userId, 1);
    console.log("Seed completed!");
  } catch (err) {
    console.error("Error seeding DB:", err);
    throw err;  
  }
}


export async function seedUsers(db: ReturnType<typeof createDrizzleClient>){
  try {
    const seedData: typeof users.$inferInsert[] = [
      { 
        email: "td@costao.com.br",
        emailVerified: true,
      },
    ];
    const [createdUser] = await db
      .insert(users)
      .values(seedData)
      .onConflictDoNothing()
      .returning();

    if (createdUser?.id) {
      const password = "Mudar@123";
      const hashedPassword = hashPassword(password);

      await db.execute(
        `INSERT INTO public.account
          ("accountId", "providerId", "userId", "password")
        VALUES (${createdUser.id}, "credential", ${createdUser.id},${hashedPassword})
        ON CONFLICT DO NOTHING`
      );

    console.log(`Created BetterAuth user ${createdUser.email}`);
      await createMember(db, {
        userId: createdUser.id,
        email: "td@costao.com.br",
        workspaceId: 1,
        createdBy: createdUser.id,
        role: "admin",
        status: "active",
      });
      console.log("User and member seeded!");
    } else {
      console.warn("User already exists, skipping user/member creation.");
    }

    return createdUser?.id;

  } catch (err) {
    console.error("Error seeding Users:", err);
    throw err;
  }
}

export async function seedWorkspaces(db: ReturnType<typeof createDrizzleClient>) {
  try {
    const seedData: typeof workspaces.$inferInsert[] = [
      { 
        publicId: "1sreptat5xx9",
        name: "Lavanderia",
        slug: "1sreptat5xx9",
      },
    ];

    await db.insert(workspaces).values(seedData).onConflictDoNothing();
    console.log("Workspaces seeded!");
  } catch (err) {
    console.error("Error seeding Workspaces:", err);
    throw err;
  }
}

export async function seedBoards(db: ReturnType<typeof createDrizzleClient>) {
  try {
    const seedData: typeof boards.$inferInsert[] = [
      { 
        publicId: "q12dwmkr8rg8",
        name: "Pedidos",
        slug: "pedidos",
        workspaceId: 1,
      },
    ];

    await db.insert(boards).values(seedData).onConflictDoNothing();
    console.log("Boards seeded!");
  } catch (err) {
    console.error("Error seeding Boards:", err);
    throw err;
  }
}

export async function seedLabels(db: ReturnType<typeof createDrizzleClient>) {
  try {
    const seedData: typeof labels.$inferInsert[] = [
      {
        publicId: "okez8x7u5g3w",
        name: "Express",
        colourCode: "#0d9488",
        boardId: 1,
      },
      {
        publicId: "dmx4ztw7z067",
        name: "Normal",
        colourCode: "#0284c7",
        boardId: 1,
      },
    ];

    await db.insert(labels).values(seedData).onConflictDoNothing();
    console.log("Labels seeded!");
  } catch (err) {
    console.error("Error seeding Labels:", err);
    throw err;
  }
}

export async function seedLists(
  db: ReturnType<typeof createDrizzleClient>, 
  userID: string, 
  boardId: number
) {
  try {
    const seedData = [
      { publicId: "7nxgnqbk65la", name: "Novo Pedido", createdBy: userID, boardId, index: 0 },
      { publicId: "fawyjhx7darq", name: "Coletado", createdBy: userID, boardId, index: 1 },
      { publicId: "jhvz2na9gi22", name: "Entregue - lavanderia", createdBy: userID, boardId, index: 2 },
      { publicId: "c14ikagaacjz", name: "Pronto para Coleta", createdBy: userID, boardId, index: 3 },
      { publicId: "ifwvvnkr4811", name: "Entregue - Hospede", createdBy: userID, boardId, index: 4 },
    ];

    await bulkCreate(db, seedData);
    console.log("Lists seeded!");
  } catch (err) {
    console.error("Error seeding Lists:", err);
    throw err;
  }
}
