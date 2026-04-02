import { ObjectId } from "mongodb";
import {
  getMongoClient,
  getProductMetadataCollection,
  GroupDocument,
  GroupProductDocument,
  productDocumentTypes,
} from "../../database";

interface GroupProductInput {
  id: number;
  alternateName?: string;
  showThumbnail?: boolean;
  colorOnly?: boolean;
  showcaseColor?: string;
}

class GroupsService {
  async ensureGroupProductSettingsColumns() {
    await getProductMetadataCollection();
  }

  async create(store_id: number, name: string) {
    const collection = await getProductMetadataCollection();
    const now = new Date();
    const group: GroupDocument = {
      type: productDocumentTypes.group,
      store_id: Number(store_id),
      group_id: new ObjectId().toHexString(),
      name: name.trim(),
      hidden: false,
      created_at: now,
      updated_at: now,
    };

    await collection.insertOne(group);

    return this.mapGroup(group);
  }

  async listByStore(store_id: number) {
    const collection = await getProductMetadataCollection();
    const result = (await collection
      .find({
        type: productDocumentTypes.group,
        store_id: Number(store_id),
      })
      .sort({ name: 1 })
      .toArray()) as GroupDocument[];

    return result.map((group) => this.mapGroup(group));
  }

  async update(
    store_id: number,
    group_id: string,
    name: string,
    hidden: boolean
  ) {
    const collection = await getProductMetadataCollection();

    const result = await collection.updateOne(
      {
        type: productDocumentTypes.group,
        store_id: Number(store_id),
        group_id,
      },
      {
        $set: {
          name: name.trim(),
          hidden: Boolean(hidden),
          updated_at: new Date(),
        },
      }
    );

    if (!result.matchedCount) {
      return null;
    }

    return this.mapGroup(await this.findGroupById(store_id, group_id));
  }

  async syncProductsInGroup(
    store_id: number,
    group_id: string,
    products: Array<number | GroupProductInput>
  ) {
    const collection = await getProductMetadataCollection();
    const client = await getMongoClient();
    const session = client.startSession();
    const normalizedProducts = this.normalizeProducts(products);
    const storeId = Number(store_id);

    try {
      await session.withTransaction(async () => {
        const group = await collection.findOne(
          {
            type: productDocumentTypes.group,
            store_id: storeId,
            group_id,
          },
          { session }
        );

        if (!group) {
          const notFoundError = new Error("Grupo não encontrado");
          (notFoundError as any).statusCode = 404;
          throw notFoundError;
        }

        const productIds = normalizedProducts.map((product) => product.id);

        if (productIds.length > 0) {
          const conflictingAssignments = (await collection
            .find(
              {
                type: productDocumentTypes.groupProduct,
                store_id: storeId,
                product_id: { $in: productIds },
                group_id: { $ne: group_id },
              },
              { session }
            )
            .sort({ product_id: 1, position: 1 })
            .toArray()) as GroupProductDocument[];

          if (conflictingAssignments.length > 0) {
            const conflictGroupIds = [
              ...new Set(
                conflictingAssignments.map((assignment) => assignment.group_id)
              ),
            ];

            const conflictGroups = (await collection
              .find(
                {
                  type: productDocumentTypes.group,
                  store_id: storeId,
                  group_id: { $in: conflictGroupIds },
                },
                { session }
              )
              .toArray()) as GroupDocument[];

            const groupNameById = new Map(
              conflictGroups.map((group) => [group.group_id, group.name])
            );
            const details = [];
            const seenProductIds = new Set<number>();

            for (const conflict of conflictingAssignments) {
              if (seenProductIds.has(conflict.product_id)) {
                continue;
              }

              seenProductIds.add(conflict.product_id);
              details.push({
                product_id: conflict.product_id,
                group_id: conflict.group_id,
                group_name: groupNameById.get(conflict.group_id) || null,
              });
            }

            const conflictError = new Error(
              "Um ou mais produtos já pertencem a outro grupo"
            );
            (conflictError as any).statusCode = 409;
            (conflictError as any).details = details;
            throw conflictError;
          }
        }

        await collection.deleteMany(
          {
            type: productDocumentTypes.groupProduct,
            store_id: storeId,
            group_id,
          },
          { session }
        );

        if (normalizedProducts.length > 0) {
          const now = new Date();

          await collection.insertMany(
            normalizedProducts.map(
              (normalizedProduct, index): GroupProductDocument => ({
                type: productDocumentTypes.groupProduct,
                store_id: storeId,
                group_id,
                product_id: normalizedProduct.id,
                position: index + 1,
                alternate_name: normalizedProduct.alternateName,
                show_thumbnail: normalizedProduct.showThumbnail,
                color_only: normalizedProduct.colorOnly,
                showcase_color: normalizedProduct.showcaseColor,
                created_at: now,
                updated_at: now,
              })
            ),
            { session }
          );
        }

        await collection.updateOne(
          {
            type: productDocumentTypes.group,
            store_id: storeId,
            group_id,
          },
          {
            $set: {
              updated_at: new Date(),
            },
          },
          { session }
        );
      });

      return { success: true };
    } catch (error) {
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getProductsFromGroup(
    store_id: number,
    group_id: string
  ) {
    const result = await this.getGroupProductDocuments(store_id, group_id);

    return result.map((groupProduct) => this.mapGroupProduct(groupProduct));
  }

  async removeProductFromGroup(
    store_id: number,
    group_id: string,
    product_id: number
  ) {
    const collection = await getProductMetadataCollection();

    await collection.deleteOne({
      type: productDocumentTypes.groupProduct,
      store_id: Number(store_id),
      group_id,
      product_id: Number(product_id),
    });

    return { success: true };
  }

  async deleteGroup(
    store_id: number,
    group_id: string
  ) {
    const collection = await getProductMetadataCollection();
    const client = await getMongoClient();
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        await collection.deleteMany(
          {
            type: productDocumentTypes.groupProduct,
            store_id: Number(store_id),
            group_id,
          },
          { session }
        );

        await collection.deleteOne(
          {
            type: productDocumentTypes.group,
            store_id: Number(store_id),
            group_id,
          },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    return { success: true };
  }

  async findGroupById(store_id: number, group_id: string) {
    const collection = await getProductMetadataCollection();

    return (await collection.findOne({
      type: productDocumentTypes.group,
      store_id: Number(store_id),
      group_id,
    })) as GroupDocument | null;
  }

  async findGroupProductByProduct(store_id: number, product_id: number) {
    const collection = await getProductMetadataCollection();

    return (await collection.findOne(
      {
        type: productDocumentTypes.groupProduct,
        store_id: Number(store_id),
        product_id: Number(product_id),
      },
      {
        sort: {
          position: 1,
        },
      }
    )) as GroupProductDocument | null;
  }

  async getGroupProductDocuments(store_id: number, group_id: string) {
    const collection = await getProductMetadataCollection();

    return (await collection
      .find({
        type: productDocumentTypes.groupProduct,
        store_id: Number(store_id),
        group_id,
      })
      .sort({ position: 1 })
      .toArray()) as GroupProductDocument[];
  }

  private mapGroup(group?: GroupDocument | null) {
    if (!group) {
      return null;
    }

    return {
      id: group.group_id,
      name: group.name,
      hidden: group.hidden === true,
    };
  }

  private mapGroupProduct(groupProduct: GroupProductDocument) {
    return {
      product_id: groupProduct.product_id,
      alternate_name: groupProduct.alternate_name,
      show_thumbnail: groupProduct.show_thumbnail !== false,
      color_only: groupProduct.color_only === true,
      showcase_color: groupProduct.showcase_color || "",
    };
  }

  private normalizeProducts(products: Array<number | GroupProductInput>) {
    const normalizedProducts: Array<{
      id: number;
      alternateName: string | null;
      showThumbnail: boolean;
      colorOnly: boolean;
      showcaseColor: string;
    }> = [];
    const seenProductIds = new Set<number>();

    for (const product of products) {
      const normalizedProduct =
        typeof product === "number"
          ? {
              id: Number(product),
              alternateName: null,
              showThumbnail: true,
              colorOnly: false,
              showcaseColor: "",
            }
          : {
              id: Number(product.id),
              alternateName: product.alternateName?.trim() || null,
              showThumbnail: product.showThumbnail ?? true,
              colorOnly: product.colorOnly ?? false,
              showcaseColor: product.showcaseColor?.trim() || "",
            };

      if (
        !Number.isFinite(normalizedProduct.id) ||
        normalizedProduct.id <= 0 ||
        seenProductIds.has(normalizedProduct.id)
      ) {
        continue;
      }

      seenProductIds.add(normalizedProduct.id);
      normalizedProducts.push(normalizedProduct);
    }

    return normalizedProducts;
  }
}

export const groupsService = new GroupsService();
