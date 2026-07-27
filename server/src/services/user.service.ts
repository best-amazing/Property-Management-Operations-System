import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const userService = {
  findByUsername: (username: string) => prisma.user.findUnique({ where: { username } }),
  findAll: () => prisma.user.findMany({
    select: { id: true, username: true, display_name: true, role: true, created_at: true },
  }),
  create: async (data: any) => {
    const password_hash = await bcrypt.hash(data.password, 10);
    return prisma.user.create({
      data: {
        username: data.username.toLowerCase(),
        display_name: data.display_name,
        password_hash,
        role: data.role,
      },
      select: { id: true, username: true, display_name: true, role: true, created_at: true },
    });
  },
  delete: (id: string) => prisma.user.delete({ where: { id } }),
};
