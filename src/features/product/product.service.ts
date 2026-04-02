import axios from "axios";
import { generateProductMock } from "@features/product/__mock__/product.mock";
import { IProductRequest, IProductResponse } from "@features/product";
import {
  getProductMetadataCollection,
  GroupDocument,
  GroupProductDocument,
  productDocumentTypes,
} from "../../database";
import { userRepository } from "@repository";

class ProductService {
  private normalizeSearchValue(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  private async getAccessToken(store_id: number): Promise<string> {
    const { access_token } = await userRepository.findOne(store_id);

    if (!access_token) {
      throw new Error("Store not authenticated");
    }

    return access_token;
  }

  async getApiClient(store_id: number) {
    const token = await this.getAccessToken(store_id);

    return axios.create({
      baseURL: `https://api.tiendanube.com/v1/${store_id}`,
      headers: {
        Authentication: `bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }

  async create(user_id: number): Promise<IProductResponse> {
    const randomProduct: IProductRequest = generateProductMock();

    const api = await this.getApiClient(user_id);

    const response = await api.post("/products", randomProduct);

    return {
      id: response.data.id,
      ...randomProduct,
    } as IProductResponse;

  }

  async delete(user_id: number, productId: string): Promise<any> {
    const api = await this.getApiClient(user_id);

    return await api.delete(`/products/${productId}`);
  }

  async findAll(user_id: number): Promise<any[]> {
    const api = await this.getApiClient(user_id);

    const response = await api.get("/products");

    return response.data;
  }

  async findAllCount(user_id: number): Promise<{ total: number }> {

    const products = await this.findAll(user_id);

    return { total: products.length };

  }

  async getProductsByIds(store_id: number, ids: number[]) {
    if (!ids.length) return [];

    const api = await this.getApiClient(store_id);

    const response = await api.get("/products");

    const products = response.data;

    const idsSet = new Set(ids.map(Number));

    return products
      .filter((product: any) => idsSet.has(product.id))
      .map((product: any) => ({
        id: product.id,
        name: product.name?.pt || product.name?.en || "",
        sku: product.variants?.[0]?.sku || "",
        image: product.images?.[0]?.src || null,
      }));
  }

  async getProduct(store_id: number, productId: number) {

    const api = await this.getApiClient(store_id);

    const response = await api.get(`/products/${productId}`);

    const product = response.data;

    return {
      id: product.id,
      name: product.name?.pt || product.name?.en || "",
      sku: product.variants?.[0]?.sku || "",
      image: product.images?.[0]?.src || null,
    };

  }

  async search(store_id: number, query: string) {
    const api = await this.getApiClient(store_id);

    const response = await api.get("/products");

    const q = this.normalizeSearchValue(query);

    const filtered = response.data.filter((product: any) => {
      const name = this.normalizeSearchValue(
        product.name?.pt ||
          product.name?.en ||
          ""
      );

      const sku = this.normalizeSearchValue(product.variants?.[0]?.sku || "");

      const id = String(product.id);

      return name.includes(q) || sku.includes(q) || id.includes(q);
    });

    if (!filtered.length) {
      return [];
    }

    const normalizedProducts = filtered.map((product: any) => ({
      id: product.id,
      name: product.name?.pt || product.name?.en || "",
      sku: product.variants?.[0]?.sku || "",
      image: product.images?.[0]?.src || null,
    }));

    const productIds = normalizedProducts.map((product: any) =>
      Number(product.id)
    );
    const assignmentsByProductId = await this.getAssignmentsByProductId(
      store_id,
      productIds
    );

    return normalizedProducts.map((product: any) => {
      const assignment = assignmentsByProductId.get(Number(product.id));

      return {
        ...product,
        assignedGroupId: assignment?.assignedGroupId ?? null,
        assignedGroupName: assignment?.assignedGroupName ?? null,
      };
    });
  }

  private async getAssignmentsByProductId(
    store_id: number,
    productIds: number[]
  ) {
    const collection = await getProductMetadataCollection();

    const assignments = (await collection
      .find({
        type: productDocumentTypes.groupProduct,
        store_id: Number(store_id),
        product_id: { $in: productIds },
      })
      .sort({ position: 1 })
      .toArray()) as GroupProductDocument[];

    if (!assignments.length) {
      return new Map<
        number,
        { assignedGroupId: string; assignedGroupName: string | null }
      >();
    }

    const groupIds = [...new Set(assignments.map((assignment) => assignment.group_id))];
    const groups = (await collection
      .find({
        type: productDocumentTypes.group,
        store_id: Number(store_id),
        group_id: { $in: groupIds },
      })
      .toArray()) as GroupDocument[];

    const groupNameById = new Map(
      groups.map((group) => [group.group_id, group.name])
    );
    const assignmentsByProductId = new Map<
      number,
      { assignedGroupId: string; assignedGroupName: string | null }
    >();

    for (const assignment of assignments) {
      if (assignmentsByProductId.has(assignment.product_id)) {
        continue;
      }

      assignmentsByProductId.set(assignment.product_id, {
        assignedGroupId: assignment.group_id,
        assignedGroupName: groupNameById.get(assignment.group_id) || null,
      });
    }

    return assignmentsByProductId;
  }

}

export const productService = new ProductService();
