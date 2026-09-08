import { PrismaClient } from "@prisma/client";

// Single shared PrismaClient for the whole app. Instantiating a new client per
// service/handler opens a separate connection pool, which quickly exhausts the
// Postgres connection limit (e.g. "Too many database connections opened").
const prisma = new PrismaClient();

export default prisma;
