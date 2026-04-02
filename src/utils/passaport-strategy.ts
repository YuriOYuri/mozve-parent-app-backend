import passport from "passport";
import passportJWT from "passport-jwt";
import { userRepository } from "../repository";

const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.SECRET_KEY || "THE_SECRET",
    },
    async (jwtPayload, done) => {
      try {
        const user = await userRepository.findOne(Number(jwtPayload.storeId));
        return done(null, user);
      } catch (_error) {
        return done(null, false);
      }
    }
  )
);
