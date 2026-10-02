import express from "express";
import cors from "cors";
import adminRouter from "./api/admin";
import clientRouter from "./api/client";
import healthRouter from "./api/health";

const app = express();

app.use(cors());
// Bulk contact import sends up to 5,000 rows; everything else keeps the
// default 100kb body limit.
const jsonDefault = express.json();
const jsonLarge = express.json({ limit: "5mb" });
const LARGE_BODY_PATHS = new Set(["/api/v1/admin/contacts/import"]);
app.use((req, res, next) => (LARGE_BODY_PATHS.has(req.path) ? jsonLarge : jsonDefault)(req, res, next));

app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/client", clientRouter);
app.use("/health", healthRouter);

export default app;
