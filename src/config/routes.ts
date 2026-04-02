import { Router } from "express";
import passport from "passport";

import { AuthenticationController } from "@features/auth";
import { PreferencesController } from "@features/preferences";
import { ProductController } from "@features/product";
import { GroupsController } from "../features/groups/groups.controller";

const routes = Router();
const groupsController = new GroupsController();

/* =========================
   AUTH
========================= */

routes.get("/auth/install", AuthenticationController.install);
routes.post("/auth/login", AuthenticationController.login);

/* =========================
   ADMIN (PROTEGIDO JWT)
========================= */

routes.post(
  "/products",
  passport.authenticate("jwt", { session: false }),
  ProductController.create
);

routes.get(
  "/products/total",
  passport.authenticate("jwt", { session: false }),
  ProductController.getTotal
);

routes.get(
  "/products/search",
  passport.authenticate("jwt", { session: false }),
  ProductController.search
);

routes.get(
  "/products",
  passport.authenticate("jwt", { session: false }),
  ProductController.getAll
);

routes.delete(
  "/products/:id",
  passport.authenticate("jwt", { session: false }),
  ProductController.delete
);

routes.get(
  "/preferences",
  passport.authenticate("jwt", { session: false }),
  PreferencesController.get
);

routes.put(
  "/preferences",
  passport.authenticate("jwt", { session: false }),
  PreferencesController.update
);

/* =========================
   GROUPS (PROTEGIDO JWT)
========================= */

routes.get(
  "/groups",
  passport.authenticate("jwt", { session: false }),
  groupsController.list
);

routes.post(
  "/groups",
  passport.authenticate("jwt", { session: false }),
  groupsController.create
);

routes.put(
  "/groups/:id",
  passport.authenticate("jwt", { session: false }),
  groupsController.update
);

/* PRODUTOS DO GRUPO */

routes.get(
  "/groups/:id/products",
  passport.authenticate("jwt", { session: false }),
  groupsController.getProducts
);

routes.post(
  "/groups/:id/products",
  passport.authenticate("jwt", { session: false }),
  groupsController.addProducts
);

routes.delete(
  "/groups/:id/products/:productId",
  passport.authenticate("jwt", { session: false }),
  groupsController.removeProduct
);

/* EXCLUIR GRUPO */

routes.delete(
  "/groups/:id",
  passport.authenticate("jwt", { session: false }),
  groupsController.delete
);

/* =========================
   STOREFRONT (PÚBLICO)
========================= */

routes.get(
  "/storefront/preferences",
  PreferencesController.getPublic
);

routes.get(
  "/storefront/similar/:id",
  ProductController.getSimilarPublic
);

export default routes;
