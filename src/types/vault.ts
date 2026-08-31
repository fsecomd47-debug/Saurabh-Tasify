/**
 * PDR-6 Feature-1: THE VAULT — God-Tier Store & Collection Economy
 * Core types for the store system.
 */

// ============================================================================
// Item Types
// ============================================================================

export type VaultItemType =
  | "pet"
  | "car"
  | "superbike"
  | "vehicle"
  | "frame"
  | "title"
  | "badge"
  | "boost"
  | "theme"
  | "accessory"
  | "collectible";

export type ItemRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic";

export type ItemStatus = "draft" | "active" | "retired";

export type EquipSlot =
  | "activePet"
  | "activeVehicle"
  | "profileFrame"
  | "profileTitle"
  | "profileBadge"
  | "theme";

// ============================================================================
// Item Ability System
// ============================================================================

export type AbilityType =
  | "mission_xp"
  | "quest_xp"
  | "pet_xp"
  | "st_bonus"
  | "streak_support"
  | "cooldown_reduction"
  | "collection_bonus";

export type ItemAbility = {
  type: AbilityType;
  value: number;
  stackingGroup: string;
  maxGroupBonus: number;
  description: string;
};

// ============================================================================
// Item Requirements
// ============================================================================

export type ItemRequirement = {
  type: "level" | "quest" | "badge" | "collection" | "mission_count";
  value: number | string;
  description: string;
};

// ============================================================================
// Vault Item
// ============================================================================

export type VaultItem = {
  id: string;
  name: string;
  description: string;
  type: VaultItemType;
  rarity: ItemRarity;
  price: number;
  abilities?: ItemAbility[];
  requirements?: ItemRequirement[];
  previewAsset: string;
  thumbnailAsset?: string;
  collectionId?: string;
  status: ItemStatus;
  featured: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// Collection
// ============================================================================

export type Collection = {
  id: string;
  name: string;
  description: string;
  itemIds: string[];
  completionReward?: {
    badgeId?: string;
    titleId?: string;
    frameId?: string;
  };
  metadata: Record<string, unknown>;
  createdAt: Date;
};

// ============================================================================
// User Inventory
// ============================================================================

export type ItemOwnership = {
  userId: string;
  itemId: string;
  acquiredAt: Date;
  quantity: number;
  equipped: boolean;
  favorite: boolean;
  showcased: boolean;
};

// ============================================================================
// Equipment State
// ============================================================================

export type EquipmentState = {
  userId: string;
  activePet?: string;
  activeVehicle?: string;
  profileFrame?: string;
  profileTitle?: string;
  profileBadge?: string;
  theme?: string;
  showcaseItems: string[];
};

// ============================================================================
// Purchase
// ============================================================================

export type VaultPurchase = {
  id: string;
  userId: string;
  itemId: string;
  price: number;
  purchasedAt: Date;
  transactionId: string;
  operationKey: string;
};

// ============================================================================
// Wishlist & Favorites
// ============================================================================

export type WishlistItem = {
  userId: string;
  itemId: string;
  addedAt: Date;
};

export type FavoriteItem = {
  userId: string;
  itemId: string;
  addedAt: Date;
};

// ============================================================================
// Item Goal
// ============================================================================

export type ItemGoal = {
  userId: string;
  itemId: string;
  setAt: Date;
};

// ============================================================================
// Store Sections
// ============================================================================

export type VaultSection = {
  id: string;
  title: string;
  itemIds: string[];
  type: "featured" | "trending" | "near_goal" | "new" | "collection" | "category";
  metadata?: Record<string, unknown>;
};

// ============================================================================
// Store Catalog
// ============================================================================

export type VaultCatalog = {
  version: number;
  items: VaultItem[];
  collections: Collection[];
  featuredItemIds: string[];
  sections: VaultSection[];
  updatedAt: Date;
};

// ============================================================================
// User Vault State
// ============================================================================

export type UserVaultState = {
  userId: string;
  balance: number;
  inventory: ItemOwnership[];
  equipment: EquipmentState;
  wishlist: string[];
  favorites: string[];
  goal?: string;
  collectionProgress: Record<string, { owned: string[]; total: number }>;
  totalOwned: number;
  totalItems: number;
};

// ============================================================================
// Store Filters
// ============================================================================

export type StoreFilter = {
  types?: VaultItemType[];
  rarities?: ItemRarity[];
  priceMin?: number;
  priceMax?: number;
  owned?: boolean;
  notOwned?: boolean;
  abilities?: AbilityType[];
  collections?: string[];
  search?: string;
};

export type StoreSort =
  | "recommended"
  | "price_asc"
  | "price_desc"
  | "rarity"
  | "newest"
  | "near_affordable";

// ============================================================================
// Store Recommendations
// ============================================================================

export type StoreRecommendationContext = {
  userLevel: number;
  stBalance: number;
  activeGoal?: string;
  activePetId?: string;
  wishlist: string[];
  ownedItems: string[];
  collectionProgress: Record<string, number>;
};

// ============================================================================
// API Response Types
// ============================================================================

export type CatalogResponse = {
  success: boolean;
  catalog?: VaultCatalog;
  error?: string;
};

export type PurchaseResponse = {
  success: boolean;
  purchase?: VaultPurchase;
  newBalance?: number;
  error?: string;
};

export type InventoryResponse = {
  success: boolean;
  inventory?: ItemOwnership[];
  equipment?: EquipmentState;
  error?: string;
};

export type CollectionResponse = {
  success: boolean;
  collections?: Array<
    Collection & {
      ownedCount: number;
      completed: boolean;
    }
  >;
  error?: string;
};
