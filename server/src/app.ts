import express from "express";
import cors from "cors";
import adminRouter from "./api/admin";
import clientRouter from "./api/client";
import healthRouter from "./api/health";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/client", clientRouter);
app.use("/health", healthRouter);

export default app;
