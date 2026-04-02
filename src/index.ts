import express from "express";
import cors from "cors";
import morgan from "morgan";
import passport from "passport";
// @ts-ignore
import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(".env"),
});

import { AppRoutes } from "@config";
import {
  beforeCheckClientMiddleware,
  errorHandlingMiddleware,
} from "@middlewares";
import "./utils/passaport-strategy";
import { connectDatabase } from "./database";
import { groupsService } from "./features/groups/groups.service";
import { preferencesService } from "./features/preferences";

const port = process.env.PORT || 7200;
const app = express();

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors https://*.nuvemshop.com.br https://*.lojavirtualnuvem.com.br"
  );
  res.removeHeader("X-Frame-Options");
  next();
});

app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
);

/* =========================
   ROTAS
========================= */

app.use(beforeCheckClientMiddleware);
app.use("/api", AppRoutes);
app.use(errorHandlingMiddleware);

(async () => {
  try {
    const database = await connectDatabase();
    await groupsService.ensureGroupProductSettingsColumns();
    await preferencesService.ensureTable();
    await database.command({ ping: 1 });

    app.listen(port, () => {
      console.log(`Server started on port ${port}`);
    });

    console.log(`Banco Atlas conectado: ${database.databaseName}`);
  } catch (error) {
    console.error("Erro ao conectar no banco:", error);
    process.exit(1);
  }
})();
