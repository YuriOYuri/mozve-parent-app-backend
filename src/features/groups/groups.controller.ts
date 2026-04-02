import { Request, Response } from "express";
import { groupsService } from "./groups.service";
import { productService } from "@features/product/product.service";

export class GroupsController {

  async create(req: Request, res: Response) {
    try {

      const { name } = req.body;
      const storeId = (req as any).user?.user_id;

      if (!storeId) {
        return res.status(401).json({ error: "Store não autenticada" });
      }

      if (!name) {
        return res.status(400).json({ error: "Nome do grupo é obrigatório" });
      }

      const group = await groupsService.create(storeId, name);

      return res.status(201).json(group);

    } catch (error) {

      console.error("Erro ao criar grupo:", error);
      return res.status(500).json({ error: "Erro interno" });

    }
  }

  async list(req: Request, res: Response) {
    try {

      const storeId = (req as any).user?.user_id;

      if (!storeId) {
        return res.status(401).json({ error: "Store não autenticada" });
      }

      const groups = await groupsService.listByStore(storeId);

      return res.json(groups);

    } catch (error) {

      console.error("Erro ao listar grupos:", error);
      return res.status(500).json({ error: "Erro interno" });

    }
  }

  async update(req: Request, res: Response) {
    try {

      const storeId = (req as any).user?.user_id;
      const groupId = req.params.id;
      const { name, hidden } = req.body;

      if (!storeId) {
        return res.status(401).json({ error: "Store não autenticada" });
      }

      if (!name) {
        return res.status(400).json({ error: "Nome do grupo é obrigatório" });
      }

      const normalizedHidden = Boolean(hidden);

      const group = await groupsService.update(
        storeId,
        groupId,
        name,
        normalizedHidden
      );

      if (!group) {
        return res.status(404).json({ error: "Grupo não encontrado" });
      }

      return res.json(group);

    } catch (error) {

      console.error("Erro ao atualizar grupo:", error);
      return res.status(500).json({ error: "Erro interno" });

    }
  }

  async addProducts(req: Request, res: Response) {
    try {

      const storeId = (req as any).user?.user_id;
      const groupId = req.params.id;
      const { products } = req.body;

      if (!storeId) {
        return res.status(401).json({ error: "Store não autenticada" });
      }

      if (!Array.isArray(products)) {
        return res.status(400).json({ error: "Products deve ser um array" });
      }

      const result = await groupsService.syncProductsInGroup(
        storeId,
        groupId,
        products
      );

      return res.json(result);

    } catch (error: any) {

      console.error("Erro ao adicionar produtos ao grupo:", error);

      if (error?.statusCode === 409) {
        return res.status(409).json({
          error: error.message,
          conflicts: error.details ?? [],
        });
      }

      return res.status(500).json({ error: "Erro interno" });

    }
  }

async getProducts(req: Request, res: Response) {
  try {

    const storeId = (req as any).user?.user_id;
    const groupId = req.params.id;

    if (!storeId) {
      return res.status(401).json({ error: "Store não autenticada" });
    }

    const groupProducts = await groupsService.getProductsFromGroup(
      storeId,
      groupId
    );

    // pega todos os IDs
    const ids = groupProducts.map((gp: any) => Number(gp.product_id));

    // busca tudo em 1 request
    const productsFromApi = await productService.getProductsByIds(
      storeId,
      ids
    );

    // cria mapa para acesso rápido
    const productsMap = new Map<number, any>(
      productsFromApi.map((p: any) => [p.id, p])
    );

    // monta resposta final com metadata
    const products = groupProducts.map((groupProduct: any) => {

      const productId = Number(groupProduct.product_id);

      const product = productsMap.get(productId) || {
        id: productId,
        name: `Produto ${productId}`,
        image: null,
        sku: ""
      };

      return {
        ...product,
        alternateName: groupProduct.alternate_name || product.name,
        showThumbnail: groupProduct.show_thumbnail,
        colorOnly: groupProduct.color_only,
        showcaseColor: groupProduct.showcase_color,
      };
    });

    return res.json(products);

  } catch (error) {

    console.error("Erro ao buscar produtos do grupo:", error);
    return res.status(500).json({ error: "Erro interno" });

  }
}

  async removeProduct(req: Request, res: Response) {

    try {

      const storeId = (req as any).user?.user_id;
      const groupId = req.params.id;
      const productId = Number(req.params.productId);

      if (!storeId) {
        return res.status(401).json({ error: "Store não autenticada" });
      }

      await groupsService.removeProductFromGroup(
        storeId,
        groupId,
        productId
      );

      return res.json({ success: true });

    } catch (error) {

      console.error("Erro ao remover produto do grupo:", error);
      return res.status(500).json({ error: "Erro interno" });

    }

  }

  async delete(req: Request, res: Response) {

    try {

      const storeId = (req as any).user?.user_id;
      const groupId = req.params.id;

      if (!storeId) {
        return res.status(401).json({ error: "Store não autenticada" });
      }

      await groupsService.deleteGroup(storeId, groupId);

      return res.json({ success: true });

    } catch (error) {

      console.error("Erro ao deletar grupo:", error);
      return res.status(500).json({ error: "Erro interno" });

    }

  }

}
