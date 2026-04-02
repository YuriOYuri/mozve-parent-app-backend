import { NextFunction, Request, Response } from "express";
import { HttpErrorException } from "../utils";

const requiredEnvKeys = [
  "TIENDANUBE_AUTENTICATION_URL",
  "TIENDANUBE_API_URL",
  "CLIENT_SECRET",
  "CLIENT_ID",
  "CLIENT_EMAIL",
];

export const beforeCheckClientMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const errors: string[] = [];
  for (const key of requiredEnvKeys) {
    if (!process.env[key]) errors.push(key);
  }

  if (errors.length > 0) {
    const message =
      "Configure the required environment variables in api/.env based on api/.env.example";
    return next(
      new HttpErrorException(message, `envs: [${errors.join(",")}] is required`)
    );
  }

  return next();
};
