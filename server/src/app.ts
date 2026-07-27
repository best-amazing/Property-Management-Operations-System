import express from "express";
import cors from "cors";
import adminRouter from "./api/admin";
import clientRouter from "./api/client";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/client", clientRouter);

export default app;
