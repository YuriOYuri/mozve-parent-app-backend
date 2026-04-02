import { Request, Response } from "express";
import { preferencesService } from "./preferences.service";

export class PreferencesController {
  async get(req: Request, res: Response) {
    try {
      const storeId = Number((req as any).user?.user_id);

      if (!storeId) {
        return res.status(401).json({ error: "Store não autenticada" });
      }

      const preferences = await preferencesService.getByStore(storeId);

      return res.json(preferences);
    } catch (error) {
      console.error("Erro ao buscar preferências:", error);
      return res.status(500).json({ error: "Erro interno" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const storeId = Number((req as any).user?.user_id);

      if (!storeId) {
        return res.status(401).json({ error: "Store não autenticada" });
      }

      const preferences = await preferencesService.update(storeId, req.body ?? {});

      return res.json(preferences);
    } catch (error) {
      console.error("Erro ao salvar preferências:", error);
      return res.status(500).json({ error: "Erro interno" });
    }
  }

  async getPublic(req: Request, res: Response) {
    try {
      const storeId = Number(req.query.store_id);

      if (!Number.isFinite(storeId) || storeId <= 0) {
        return res.status(400).json({ error: "store_id inválido" });
      }

      const preferences = await preferencesService.getByStore(storeId);

      return res.json(preferences);
    } catch (error) {
      console.error("Erro ao buscar preferências públicas:", error);
      return res.status(500).json({ error: "Erro interno" });
    }
  }
}

export default new PreferencesController();
