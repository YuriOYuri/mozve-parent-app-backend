import { Router } from "express";
import { GroupsController } from "./groups.controller";

const router = Router();
const groupsController = new GroupsController();

router.get("/groups", groupsController.list);
router.post("/groups", groupsController.create);

router.post("/groups/:id/products", groupsController.addProducts);
router.get("/groups/:id/products", groupsController.getProducts);

router.delete("/groups/:id/products/:productId", groupsController.removeProduct);

router.delete("/groups/:id", groupsController.delete);
export default router;