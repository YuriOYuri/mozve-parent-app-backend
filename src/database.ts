import { Collection, Db, Document, MongoClient } from "mongodb";

export const productDocumentTypes = {
  group: "group",
  groupProduct: "group_product",
} as const;

// O env atual expõe apenas uma coleção para metadados de produtos.
// Grupos e vínculos produto-grupo ficam separados nela pelo campo `type`.

export interface CredentialDocument extends Document {
  user_id: number;
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface StorePreferencesDocument extends Document {
  store_id: number;
  app_active: boolean;
  workspace_name: string;
  default_entry: string;
  hero_title: string;
  item_type: string;
  storefront_size: string;
  desktop_size: string;
  desktop_anchor: string;
  desktop_selector: string;
  mobile_size: string;
  mobile_columns: number;
  mobile_spacing: string;
  similar_title: string;
  similar_limit: number;
  similar_position: string;
  similar_spacing: string;
  created_at: Date;
  updated_at: Date;
}

export interface GroupDocument extends Document {
  type: typeof productDocumentTypes.group;
  store_id: number;
  group_id: string;
  name: string;
  hidden: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GroupProductDocument extends Document {
  type: typeof productDocumentTypes.groupProduct;
  store_id: number;
  group_id: string;
  product_id: number;
  position: number;
  alternate_name: string | null;
  show_thumbnail: boolean;
  color_only: boolean;
  showcase_color: string;
  created_at: Date;
  updated_at: Date;
}

export type ProductMetadataDocument = GroupDocument | GroupProductDocument;

const defaultCollectionNames = {
  credentials: "credentials",
  productMetadata: "products",
  storePreferences: "storePreferences",
} as const;

let client: MongoClient | null = null;
let database: Db | null = null;
let connectionPromise: Promise<Db> | null = null;

function getAtlasUri() {
  const connectionString = process.env.DATABASE_URL_ATLAS;

  if (!connectionString) {
    throw new Error("DATABASE_URL_ATLAS não definida no .env");
  }

  return connectionString;
}

function getAtlasDatabaseName() {
  return process.env.DATABASE_NAME_ATLAS || process.env.MONGODB_DB_NAME;
}

export function getCollectionNames() {
  return {
    credentials:
      process.env.TABLE_CREDENTIALS || defaultCollectionNames.credentials,
    productMetadata:
      process.env.TABLE_PRODUCTS || defaultCollectionNames.productMetadata,
    storePreferences:
      process.env.TABLE_STORE_PREFERENCES ||
      defaultCollectionNames.storePreferences,
  };
}

async function ensureIndexes(db: Db) {
  const collectionNames = getCollectionNames();
  const credentials = db.collection<CredentialDocument>(
    collectionNames.credentials
  );
  const productMetadata = db.collection<ProductMetadataDocument>(
    collectionNames.productMetadata
  );
  const storePreferences = db.collection<StorePreferencesDocument>(
    collectionNames.storePreferences
  );

  await Promise.all([
    credentials.createIndex({ user_id: 1 }, { unique: true }),
    storePreferences.createIndex({ store_id: 1 }, { unique: true }),
    productMetadata.createIndex(
      { type: 1, store_id: 1, group_id: 1 },
      {
        unique: true,
        partialFilterExpression: { type: productDocumentTypes.group },
      }
    ),
    productMetadata.createIndex(
      { type: 1, store_id: 1, group_id: 1, product_id: 1 },
      {
        unique: true,
        partialFilterExpression: { type: productDocumentTypes.groupProduct },
      }
    ),
    productMetadata.createIndex(
      { type: 1, store_id: 1, product_id: 1 },
      {
        unique: true,
        partialFilterExpression: { type: productDocumentTypes.groupProduct },
      }
    ),
    productMetadata.createIndex(
      { type: 1, store_id: 1, name: 1 },
      {
        partialFilterExpression: { type: productDocumentTypes.group },
      }
    ),
    productMetadata.createIndex(
      { type: 1, store_id: 1, group_id: 1, position: 1 },
      {
        partialFilterExpression: { type: productDocumentTypes.groupProduct },
      }
    ),
  ]);
}

export async function connectDatabase() {
  if (database) {
    return database;
  }

  if (!connectionPromise) {
    connectionPromise = (async () => {
      client = new MongoClient(getAtlasUri());
      await client.connect();

      const databaseName = getAtlasDatabaseName();
      database = databaseName ? client.db(databaseName) : client.db();

      await ensureIndexes(database);

      return database;
    })().catch((error) => {
      client = null;
      database = null;
      connectionPromise = null;
      throw error;
    });
  }

  return connectionPromise;
}

export async function getMongoClient() {
  await connectDatabase();

  if (!client) {
    throw new Error("MongoClient não inicializado");
  }

  return client;
}

export async function getCredentialsCollection() {
  return (await connectDatabase()).collection<CredentialDocument>(
    getCollectionNames().credentials
  );
}

export async function getProductMetadataCollection() {
  return (await connectDatabase()).collection<ProductMetadataDocument>(
    getCollectionNames().productMetadata
  );
}

export async function getStorePreferencesCollection() {
  return (await connectDatabase()).collection<StorePreferencesDocument>(
    getCollectionNames().storePreferences
  );
}
