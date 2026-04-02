import {
  getStorePreferencesCollection,
  StorePreferencesDocument,
} from "../../database";

export interface StorePreferences {
  appActive: boolean;
  workspaceName: string;
  defaultEntry: string;
  heroTitle: string;
  itemType: string;
  storefrontSize: string;
  desktopSize: string;
  desktopAnchor: string;
  desktopSelector: string;
  mobileSize: string;
  mobileColumns: number;
  mobileSpacing: string;
  similarTitle: string;
  similarLimit: number;
  similarPosition: string;
  similarSpacing: string;
}

const DEFAULT_ENTRY_OPTIONS = ["Grupos", "Produtos", "Configuracoes"];
const ITEM_TYPE_OPTIONS = [
  "Quadrado arredondado",
  "Quadrado",
  "Circulo",
];
const DESKTOP_ANCHOR_OPTIONS = ["Antes", "Depois", "Dentro"];
const SIMILAR_POSITION_OPTIONS = [
  "Abaixo da galeria",
  "Abaixo do preço",
  "Antes do formulário",
];

export const DEFAULT_STORE_PREFERENCES: StorePreferences = {
  appActive: true,
  workspaceName: "Workspace principal",
  defaultEntry: "Grupos",
  heroTitle: "Configurações",
  itemType: "Quadrado arredondado",
  storefrontSize: "30px",
  desktopSize: "60px",
  desktopAnchor: "Antes",
  desktopSelector: '[data-store="product-form-{product_id}"]',
  mobileSize: "36px",
  mobileColumns: 4,
  mobileSpacing: "8px",
  similarTitle: "Produtos similares",
  similarLimit: 6,
  similarPosition: "Abaixo da galeria",
  similarSpacing: "20px",
};

class PreferencesService {
  async ensureTable() {
    await getStorePreferencesCollection();
  }

  private normalizeBoolean(value: unknown, fallback: boolean) {
    return typeof value === "boolean" ? value : fallback;
  }

  private normalizeText(value: unknown, fallback: string, maxLength = 255) {
    if (typeof value !== "string") {
      return fallback;
    }

    const trimmed = value.trim();

    if (!trimmed) {
      return fallback;
    }

    return trimmed.slice(0, maxLength);
  }

  private normalizeEnum(
    value: unknown,
    allowedValues: string[],
    fallback: string
  ) {
    if (typeof value !== "string") {
      return fallback;
    }

    return allowedValues.includes(value) ? value : fallback;
  }

  private normalizePositiveInteger(
    value: unknown,
    fallback: number,
    min: number,
    max: number
  ) {
    const numericValue =
      typeof value === "number"
        ? value
        : Number.parseInt(String(value ?? ""), 10);

    if (!Number.isFinite(numericValue)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, Math.round(numericValue)));
  }

  private buildDefaultDocument(store_id: number): StorePreferencesDocument {
    const now = new Date();

    return {
      store_id,
      app_active: DEFAULT_STORE_PREFERENCES.appActive,
      workspace_name: DEFAULT_STORE_PREFERENCES.workspaceName,
      default_entry: DEFAULT_STORE_PREFERENCES.defaultEntry,
      hero_title: DEFAULT_STORE_PREFERENCES.heroTitle,
      item_type: DEFAULT_STORE_PREFERENCES.itemType,
      storefront_size: DEFAULT_STORE_PREFERENCES.storefrontSize,
      desktop_size: DEFAULT_STORE_PREFERENCES.desktopSize,
      desktop_anchor: DEFAULT_STORE_PREFERENCES.desktopAnchor,
      desktop_selector: DEFAULT_STORE_PREFERENCES.desktopSelector,
      mobile_size: DEFAULT_STORE_PREFERENCES.mobileSize,
      mobile_columns: DEFAULT_STORE_PREFERENCES.mobileColumns,
      mobile_spacing: DEFAULT_STORE_PREFERENCES.mobileSpacing,
      similar_title: DEFAULT_STORE_PREFERENCES.similarTitle,
      similar_limit: DEFAULT_STORE_PREFERENCES.similarLimit,
      similar_position: DEFAULT_STORE_PREFERENCES.similarPosition,
      similar_spacing: DEFAULT_STORE_PREFERENCES.similarSpacing,
      created_at: now,
      updated_at: now,
    };
  }

  private mapRow(
    row?: Partial<StorePreferencesDocument> | null
  ): StorePreferences {
    if (!row) {
      return { ...DEFAULT_STORE_PREFERENCES };
    }

    return {
      appActive: row.app_active !== false,
      workspaceName:
        row.workspace_name || DEFAULT_STORE_PREFERENCES.workspaceName,
      defaultEntry:
        row.default_entry || DEFAULT_STORE_PREFERENCES.defaultEntry,
      heroTitle: row.hero_title || DEFAULT_STORE_PREFERENCES.heroTitle,
      itemType: row.item_type || DEFAULT_STORE_PREFERENCES.itemType,
      storefrontSize:
        row.storefront_size || DEFAULT_STORE_PREFERENCES.storefrontSize,
      desktopSize: row.desktop_size || DEFAULT_STORE_PREFERENCES.desktopSize,
      desktopAnchor:
        row.desktop_anchor || DEFAULT_STORE_PREFERENCES.desktopAnchor,
      desktopSelector:
        row.desktop_selector || DEFAULT_STORE_PREFERENCES.desktopSelector,
      mobileSize: row.mobile_size || DEFAULT_STORE_PREFERENCES.mobileSize,
      mobileColumns:
        Number(row.mobile_columns) || DEFAULT_STORE_PREFERENCES.mobileColumns,
      mobileSpacing:
        row.mobile_spacing || DEFAULT_STORE_PREFERENCES.mobileSpacing,
      similarTitle:
        row.similar_title || DEFAULT_STORE_PREFERENCES.similarTitle,
      similarLimit:
        Number(row.similar_limit) || DEFAULT_STORE_PREFERENCES.similarLimit,
      similarPosition:
        row.similar_position || DEFAULT_STORE_PREFERENCES.similarPosition,
      similarSpacing:
        row.similar_spacing || DEFAULT_STORE_PREFERENCES.similarSpacing,
    };
  }

  private async ensureRow(store_id: number) {
    const collection = await getStorePreferencesCollection();

    await collection.updateOne(
      { store_id },
      {
        $setOnInsert: this.buildDefaultDocument(store_id),
      },
      { upsert: true }
    );
  }

  async getByStore(store_id: number) {
    await this.ensureRow(store_id);
    const collection = await getStorePreferencesCollection();

    const result = await collection.findOne({ store_id });

    return this.mapRow(result);
  }

  async update(store_id: number, input: Partial<StorePreferences>) {
    const current = await this.getByStore(store_id);

    const nextPreferences: StorePreferences = {
      appActive: this.normalizeBoolean(input.appActive, current.appActive),
      workspaceName: this.normalizeText(
        input.workspaceName,
        current.workspaceName
      ),
      defaultEntry: this.normalizeEnum(
        input.defaultEntry,
        DEFAULT_ENTRY_OPTIONS,
        current.defaultEntry
      ),
      heroTitle: this.normalizeText(input.heroTitle, current.heroTitle),
      itemType: this.normalizeEnum(
        input.itemType,
        ITEM_TYPE_OPTIONS,
        current.itemType
      ),
      storefrontSize: this.normalizeText(
        input.storefrontSize,
        current.storefrontSize,
        32
      ),
      desktopSize: this.normalizeText(
        input.desktopSize,
        current.desktopSize,
        32
      ),
      desktopAnchor: this.normalizeEnum(
        input.desktopAnchor,
        DESKTOP_ANCHOR_OPTIONS,
        current.desktopAnchor
      ),
      desktopSelector: this.normalizeText(
        input.desktopSelector,
        current.desktopSelector,
        500
      ),
      mobileSize: this.normalizeText(input.mobileSize, current.mobileSize, 32),
      mobileColumns: this.normalizePositiveInteger(
        input.mobileColumns,
        current.mobileColumns,
        1,
        6
      ),
      mobileSpacing: this.normalizeText(
        input.mobileSpacing,
        current.mobileSpacing,
        32
      ),
      similarTitle: this.normalizeText(
        input.similarTitle,
        current.similarTitle
      ),
      similarLimit: this.normalizePositiveInteger(
        input.similarLimit,
        current.similarLimit,
        1,
        24
      ),
      similarPosition: this.normalizeEnum(
        input.similarPosition,
        SIMILAR_POSITION_OPTIONS,
        current.similarPosition
      ),
      similarSpacing: this.normalizeText(
        input.similarSpacing,
        current.similarSpacing,
        32
      ),
    };

    const collection = await getStorePreferencesCollection();
    const now = new Date();

    await collection.updateOne(
      { store_id },
      {
        $set: {
          app_active: nextPreferences.appActive,
          workspace_name: nextPreferences.workspaceName,
          default_entry: nextPreferences.defaultEntry,
          hero_title: nextPreferences.heroTitle,
          item_type: nextPreferences.itemType,
          storefront_size: nextPreferences.storefrontSize,
          desktop_size: nextPreferences.desktopSize,
          desktop_anchor: nextPreferences.desktopAnchor,
          desktop_selector: nextPreferences.desktopSelector,
          mobile_size: nextPreferences.mobileSize,
          mobile_columns: nextPreferences.mobileColumns,
          mobile_spacing: nextPreferences.mobileSpacing,
          similar_title: nextPreferences.similarTitle,
          similar_limit: nextPreferences.similarLimit,
          similar_position: nextPreferences.similarPosition,
          similar_spacing: nextPreferences.similarSpacing,
          updated_at: now,
        },
        $setOnInsert: {
          ...this.buildDefaultDocument(store_id),
          created_at: now,
        },
      },
      { upsert: true }
    );

    const result = await collection.findOne({ store_id });

    return this.mapRow(result);
  }
}

export const preferencesService = new PreferencesService();
