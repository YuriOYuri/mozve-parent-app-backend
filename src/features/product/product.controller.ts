import { NextFunction, Request, Response } from "express";
import { StatusCode } from "@utils";
import { ProductService } from "@features/product";
import { preferencesService } from "@features/preferences";
import { groupsService } from "@features/groups/groups.service";

class ProductController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ProductService.create(+req.user.user_id);
      return res.status(StatusCode.CREATED).json(data);
    } catch (e) {
      next(e);
    }
  }

  async getTotal(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ProductService.findAllCount(+req.user.user_id);
      return res.status(StatusCode.OK).json(data);
    } catch (e) {
      next(e);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ProductService.findAll(+req.user.user_id);
      return res.status(StatusCode.OK).json(data);
    } catch (e) {
      next(e);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ProductService.delete(
        +req.user.user_id,
        req.params.id as string
      );
      return res.status(StatusCode.OK).json(data);
    } catch (e) {
      next(e);
    }
  }

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const storeId = +req.user.user_id;
      const query = req.query.q as string;

      if (!query) {
        return res.status(400).json({ message: "Query é obrigatória" });
      }

      const data = await ProductService.search(storeId, query);

      return res.status(StatusCode.OK).json(data);
    } catch (e) {
      next(e);
    }
  }

  async getSimilarPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const storeIdRaw = (req.query.store_id as string | undefined) ?? "7297362";
      const storeId = Number(storeIdRaw);
      const productId = Number(id);

      if (!Number.isFinite(storeId) || storeId <= 0) {
        return res.status(400).json({ message: "store_id inválido" });
      }

      if (!Number.isFinite(productId) || productId <= 0) {
        return res.status(400).json({ message: "Produto inválido" });
      }

      const preferences = await preferencesService.getByStore(storeId);

      if (!preferences.appActive) {
        return res.status(StatusCode.OK).json([]);
      }

      const products = await ProductService.findAll(storeId);
      const current = (products as any[]).find(
        (product: any) => String(product.id) === String(productId)
      );

      if (!current) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }

      const groupAssignment = await groupsService.findGroupProductByProduct(
        storeId,
        productId
      );

      if (!groupAssignment) {
        return res.status(StatusCode.OK).json([]);
      }

      const group = await groupsService.findGroupById(
        storeId,
        groupAssignment.group_id
      );

      if (!group || group.hidden) {
        return res.status(StatusCode.OK).json([]);
      }

      const groupProductsResult = await groupsService.getGroupProductDocuments(
        storeId,
        groupAssignment.group_id
      );

      const groupProductIds = groupProductsResult
        .filter(
          (row) =>
            String(row.product_id) === String(productId) ||
            row.show_thumbnail !== false
        )
        .map((row) => String(row.product_id));

      const productMetadataById = new Map(
        groupProductsResult.map((row) => [
          String(row.product_id),
          {
            showThumbnail: row.show_thumbnail !== false,
            colorOnly: row.color_only === true,
            showcaseColor: row.showcase_color || "",
          },
        ])
      );

      const productsById = new Map(
        (products as any[]).map((product: any) => [String(product.id), product])
      );

      const groupProducts = groupProductIds
        .map((groupProductId: string) => {
          const product = productsById.get(groupProductId);

          if (!product) {
            return null;
          }

          return {
            ...product,
            ...productMetadataById.get(groupProductId),
          };
        })
        .filter(Boolean);

      return res.status(StatusCode.OK).json(groupProducts);
    } catch (e) {
      next(e);
    }
  }
}

export default new ProductController();
