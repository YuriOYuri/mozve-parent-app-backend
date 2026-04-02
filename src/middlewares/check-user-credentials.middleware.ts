import { NextFunction, Request, Response } from "express";
import userRepository from "../repository/UserRepository";

export const checkUserCredentialsMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction,
  user_id: number
): Response | void => {
  void (async () => {
    try {
      await userRepository.findOne(+user_id);
      next();
    } catch (e) {
      next(e);
    }
  })();
};
