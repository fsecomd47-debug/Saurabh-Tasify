"use client";

/**
 * PDR-6 Feature-1: THE VAULT — VaultHome
 * Main store page with hero, featured, sections, and collections.
 *
 * Architecture:
 * THE VAULT
 * ├── Hero (featured item)
 * ├── Almost Yours (near-affordable)
 * ├── Trending
 * ├── New Drops
 * ├── Style Lab
 * ├── Garage
 * ├── Collections
 * ├── Categories (Pets, Cars, Bikes, Style)
 * └── Search/Filter
 */

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Heart,
  Target,
  ShoppingBag,
  ChevronRight,
  X,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { ItemCard } from "./ItemCard";
import { CollectionCard } from "./CollectionCard";
import type {
  VaultItem,
  VaultCatalog,
  VaultSection,
  Collection,
  StoreFilter,
  StoreSort,
  ItemRarity,
} from "@/types/vault";

type VaultViewTab = "browse" | "wishlist" | "favorites" | "my_items";

type PricePreset = {
  label: string;
  min: number;
  max: number;
};

const PRICE_PRESETS: PricePreset[] = [
  { label: "Under 1K", min: 0, max: 999 },
  { label: "1K–5K", min: 1000, max: 5000 },
  { label: "5K–15K", min: 5000, max: 15000 },
  { label: "15K–30K", min: 15000, max: 30000 },
  { label: "30K+", min: 30000, max: Infinity },
];

type VaultHomeProps = {
  catalog: VaultCatalog | null;
  onItemSelect: (item: VaultItem) => void;
  onCollectionSelect: (collection: Collection) => void;
  userBalance?: number;
  ownedItems?: string[];
  equippedItems?: string[];
  favoritedIds?: string[];
  wishlistIds?: string[];
  goal?: string | null;
  onToggleFavorite?: (itemId: string) => void;
};

const CATEGORIES = [
  { id: "all", label: "All", types: [] },
  { id: "pet", label: "Pets", types: ["pet"] },
  { id: "car", label: "Cars", types: ["car"] },
  { id: "superbike", label: "Bikes", types: ["superbike"] },
  { id: "frame", label: "Frames", types: ["frame"] },
  { id: "title", label: "Titles", types: ["title"] },
  { id: "badge", label: "Badges", types: ["badge"] },
  { id: "boost", label: "Boosts", types: ["boost"] },
  { id: "theme", label: "Themes", types: ["theme"] },
  { id: "accessory", label: "Accessories", types: ["accessory"] },
  { id: "collectible", label: "Special", types: ["collectible"] },
];

const SORT_OPTIONS = [
  { id: "recommended", label: "Recommended" },
  { id: "price_asc", label: "Price: Low → High" },
  { id: "price_desc", label: "Price: High → Low" },
  { id: "rarity", label: "Rarity" },
  { id: "near_affordable", label: "Closest to Affordable" },
];

const RARITY_COLORS = {
  common: "#8E8E93",
  uncommon: "#34C759",
  rare: "#007AFF",
  epic: "#5856D6",
  legendary: "#FF9500",
  mythic: "#FF2D55",
};

const VIEW_TABS: { id: VaultViewTab; label: string }[] = [
  { id: "browse", label: "Browse" },
  { id: "wishlist", label: "Wishlist" },
  { id: "favorites", label: "Favorites" },
  { id: "my_items", label: "My Items" },
];

const RARITY_LIST: ItemRarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "mythic",
];

const STYLE_TYPES = ["frame", "title", "badge"];
const GARAGE_TYPES = ["car", "superbike"];

export function VaultHome({
  catalog,
  onItemSelect,
  onCollectionSelect,
  userBalance = 0,
  ownedItems = [],
  equippedItems = [],
  favoritedIds = [],
  wishlistIds = [],
  goal = null,
  onToggleFavorite,
}: VaultHomeProps) {
  const [loading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState<StoreSort>("recommended");
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [viewTab, setViewTab] = useState<VaultViewTab>("browse");

  // Advanced filter state
  const [filterRarities, setFilterRarities] = useState<ItemRarity[]>([]);
  const [filterPriceMin, setFilterPriceMin] = useState<number>(0);
  const [filterPriceMax, setFilterPriceMax] = useState<number>(Infinity);
  const [filterOwned, setFilterOwned] = useState<"all" | "owned" | "not_owned">("all");
  const [activePricePreset, setActivePricePreset] = useState<string | null>(null);

  const toggleRarity = useCallback((r: ItemRarity) => {
    setFilterRarities((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  }, []);

  const applyPricePreset = useCallback((preset: PricePreset) => {
    setFilterPriceMin(preset.min);
    setFilterPriceMax(preset.max);
    setActivePricePreset(preset.label);
  }, []);

  const clearFilters = useCallback(() => {
    setFilterRarities([]);
    setFilterPriceMin(0);
    setFilterPriceMax(Infinity);
    setFilterOwned("all");
    setActivePricePreset(null);
  }, []);

  const hasActiveFilters =
    filterRarities.length > 0 ||
    filterPriceMin > 0 ||
    filterPriceMax < Infinity ||
    filterOwned !== "all";

  // Filter items
  const filteredItems = React.useMemo(() => {
    if (!catalog) return [];

    let items = catalog.items.filter((i) => i.status === "active");

    // Category filter (only in browse tab)
    if (viewTab === "browse" && activeCategory !== "all") {
      const category = CATEGORIES.find((c) => c.id === activeCategory);
      if (category?.types.length) {
        items = items.filter((i) => category.types.includes(i.type));
      }
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }

    // View tab filters
    if (viewTab === "wishlist") {
      items = items.filter((i) => wishlistIds.includes(i.id));
    } else if (viewTab === "favorites") {
      items = items.filter((i) => favoritedIds.includes(i.id));
    } else if (viewTab === "my_items") {
      items = items.filter((i) => ownedItems.includes(i.id));
    }

    // Advanced filters
    if (filterRarities.length > 0) {
      items = items.filter((i) => filterRarities.includes(i.rarity));
    }
    if (filterPriceMin > 0) {
      items = items.filter((i) => i.price >= filterPriceMin);
    }
    if (filterPriceMax < Infinity) {
      items = items.filter((i) => i.price <= filterPriceMax);
    }
    if (filterOwned === "owned") {
      items = items.filter((i) => ownedItems.includes(i.id));
    } else if (filterOwned === "not_owned") {
      items = items.filter((i) => !ownedItems.includes(i.id));
    }

    // Sort
    switch (sortBy) {
      case "price_asc":
        items.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        items.sort((a, b) => b.price - a.price);
        break;
      case "rarity": {
        const order = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
        items.sort((a, b) => order[b.rarity] - order[a.rarity]);
        break;
      }
      case "near_affordable":
        items.sort((a, b) => {
          const diffA = Math.abs(a.price - userBalance);
          const diffB = Math.abs(b.price - userBalance);
          return diffA - diffB;
        });
        break;
      default:
        items.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return b.price - a.price;
        });
    }

    return items;
  }, [
    catalog,
    activeCategory,
    searchQuery,
    sortBy,
    userBalance,
    viewTab,
    wishlistIds,
    favoritedIds,
    ownedItems,
    filterRarities,
    filterPriceMin,
    filterPriceMax,
    filterOwned,
  ]);

  // Get near-affordable items
  const nearAffordable = React.useMemo(() => {
    if (!catalog) return [];
    return catalog.items
      .filter(
        (i) =>
          i.status === "active" &&
          i.price > userBalance &&
          i.price - userBalance <= 2000
      )
      .sort((a, b) => a.price - b.price)
      .slice(0, 4);
  }, [catalog, userBalance]);

  // Get featured item for hero
  const featuredItem = React.useMemo(() => {
    if (!catalog) return null;
    const featured = catalog.items.filter(
      (i) => i.featured && i.status === "active"
    );
    return featured[0] || null;
  }, [catalog]);

  // Dynamic sections for "all" category with no search
  const showDynamicSections = viewTab === "browse" && activeCategory === "all" && !searchQuery;

  const trendingItems = React.useMemo(() => {
    if (!catalog || !showDynamicSections) return [];
    return catalog.items
      .filter((i) => i.status === "active")
      .sort((a, b) => b.price - a.price)
      .slice(0, 6);
  }, [catalog, showDynamicSections]);

  const newDropsItems = React.useMemo(() => {
    if (!catalog || !showDynamicSections) return [];
    return catalog.items
      .filter((i) => i.status === "active")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [catalog, showDynamicSections]);

  const styleLabItems = React.useMemo(() => {
    if (!catalog || !showDynamicSections) return [];
    return catalog.items
      .filter((i) => i.status === "active" && STYLE_TYPES.includes(i.type))
      .slice(0, 6);
  }, [catalog, showDynamicSections]);

  const garageItems = React.useMemo(() => {
    if (!catalog || !showDynamicSections) return [];
    return catalog.items
      .filter((i) => i.status === "active" && GARAGE_TYPES.includes(i.type))
      .slice(0, 6);
  }, [catalog, showDynamicSections]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5E5CE6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[14px] text-[#8E8E93]">Loading The Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-24">
      {/* Header + View Tabs — sticky */}
      <div className="sticky top-0 z-40 bg-[#F2F2F7]/80 backdrop-blur-xl border-b border-[#E5E5EA]">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[24px] font-bold text-[#1C1C1E]">
                THE VAULT
              </h1>
              <p className="text-[12px] text-[#8E8E93]">
                Build your collection
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-[#E5E5EA] px-3 py-1.5 rounded-full">
                <span className="text-[14px] font-bold text-[#1C1C1E]">
                  {userBalance.toLocaleString()} ST
                </span>
              </div>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="w-10 h-10 rounded-full bg-[#E5E5EA] flex items-center justify-center"
              >
                <Search className="w-5 h-5 text-[#636366]" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E93]" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white rounded-[12px] text-[14px] text-[#1C1C1E] placeholder:text-[#C7C7CC] border border-[#E5E5EA] focus:outline-none focus:border-[#5E5CE6]"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <X className="w-5 h-5 text-[#8E8E93]" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* View tabs */}
        <div className="px-4 pb-2">
          <div className="flex gap-1 bg-white rounded-[12px] p-1 border border-[#E5E5EA]">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewTab(tab.id)}
                className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${
                  viewTab === tab.id
                    ? "bg-[#1C1C1E] text-white shadow-sm"
                    : "text-[#636366]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category tabs — NOT sticky, scrolls with content */}
      {viewTab === "browse" && (
        <div className="px-4 py-3">
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all min-w-0 ${
                  activeCategory === cat.id
                    ? "bg-[#1C1C1E] text-white shadow-md"
                    : "bg-white text-[#636366] border border-[#E5E5EA] active:bg-[#F2F2F7]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hero */}
      {featuredItem && showDynamicSections && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-6"
        >
          <div className="bg-gradient-to-br from-[#5E5CE6] to-[#BF5AF2] rounded-[24px] p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[12px] font-semibold opacity-80 mb-1">
                FEATURED
              </p>
              <h2 className="text-[28px] font-bold mb-1">
                {featuredItem.name}
              </h2>
              <p className="text-[14px] opacity-80 mb-4">
                {featuredItem.description}
              </p>
              <div className="flex items-center gap-4 mb-4">
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                  style={{
                    backgroundColor: `${RARITY_COLORS[featuredItem.rarity]}40`,
                    color: "white",
                  }}
                >
                  {featuredItem.rarity}
                </span>
                <span className="text-[18px] font-bold">
                  {featuredItem.price.toLocaleString()} ST
                </span>
              </div>
              {userBalance < featuredItem.price && (
                <p className="text-[13px] opacity-80">
                  {(featuredItem.price - userBalance).toLocaleString()} ST to
                  go
                </p>
              )}
            </div>
            <button
              onClick={() => onItemSelect(featuredItem)}
              className="absolute bottom-6 right-6 bg-white text-[#5E5CE6] px-6 py-2.5 rounded-full text-[14px] font-bold"
            >
              VIEW
            </button>
          </div>
        </motion.section>
      )}

      {/* Goal Progress */}
      {goal && showDynamicSections && (() => {
        const goalItem = catalog?.items.find((i) => i.id === goal);
        if (!goalItem) return null;
        const progress = Math.min((userBalance / goalItem.price) * 100, 100);
        const remaining = Math.max(goalItem.price - userBalance, 0);
        return (
          <section className="px-4 mb-6">
            <div className="bg-white rounded-[16px] p-4 border border-[#E5E5EA]">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-[#5E5CE6]" />
                <p className="text-[13px] font-semibold text-[#5E5CE6]">
                  YOUR GOAL
                </p>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[16px] font-bold text-[#1C1C1E]">
                    {goalItem.name}
                  </p>
                  <p className="text-[12px] text-[#8E8E93]">
                    {goalItem.price.toLocaleString()} ST
                  </p>
                </div>
                <button
                  onClick={() => onItemSelect(goalItem)}
                  className="bg-[#5E5CE6] text-white px-4 py-1.5 rounded-full text-[13px] font-semibold"
                >
                  View
                </button>
              </div>
              <div className="h-2 bg-[#E5E5EA] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-[#5E5CE6] rounded-full"
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] text-[#8E8E93]">
                  {userBalance.toLocaleString()} / {goalItem.price.toLocaleString()} ST
                </p>
                <p className="text-[11px] font-semibold text-[#5E5CE6]">
                  {remaining > 0 ? `${remaining.toLocaleString()} ST away` : "Ready to buy!"}
                </p>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Near Affordable */}
      {nearAffordable.length > 0 && showDynamicSections && (
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[18px] font-bold text-[#1C1C1E]">
              Almost Yours
            </h3>
            <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {nearAffordable.map((item) => (
              <div key={item.id} className="flex-shrink-0 w-[160px]">
                <ItemCard
                  item={item}
                  userBalance={userBalance}
                  owned={ownedItems.includes(item.id)}
                  equipped={equippedItems.includes(item.id)}
                  favorited={favoritedIds.includes(item.id)}
                  onSelect={() => onItemSelect(item)}
                  onToggleFavorite={onToggleFavorite}
                  compact
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dynamic Sections */}
      {showDynamicSections && (
        <>
          {/* Trending */}
          {trendingItems.length > 0 && (
            <section className="px-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[18px] font-bold text-[#1C1C1E]">
                  Trending
                </h3>
                <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {trendingItems.map((item) => (
                  <div key={item.id} className="flex-shrink-0 w-[160px]">
                    <ItemCard
                      item={item}
                      userBalance={userBalance}
                      owned={ownedItems.includes(item.id)}
                      equipped={equippedItems.includes(item.id)}
                      favorited={favoritedIds.includes(item.id)}
                      onSelect={() => onItemSelect(item)}
                      onToggleFavorite={onToggleFavorite}
                      compact
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* New Drops */}
          {newDropsItems.length > 0 && (
            <section className="px-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[18px] font-bold text-[#1C1C1E]">
                  New Drops
                </h3>
                <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {newDropsItems.map((item) => (
                  <div key={item.id} className="flex-shrink-0 w-[160px]">
                    <ItemCard
                      item={item}
                      userBalance={userBalance}
                      owned={ownedItems.includes(item.id)}
                      equipped={equippedItems.includes(item.id)}
                      favorited={favoritedIds.includes(item.id)}
                      onSelect={() => onItemSelect(item)}
                      onToggleFavorite={onToggleFavorite}
                      compact
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Style Lab */}
          {styleLabItems.length > 0 && (
            <section className="px-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[18px] font-bold text-[#1C1C1E]">
                  Style Lab
                </h3>
                <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {styleLabItems.map((item) => (
                  <div key={item.id} className="flex-shrink-0 w-[160px]">
                    <ItemCard
                      item={item}
                      userBalance={userBalance}
                      owned={ownedItems.includes(item.id)}
                      equipped={equippedItems.includes(item.id)}
                      favorited={favoritedIds.includes(item.id)}
                      onSelect={() => onItemSelect(item)}
                      onToggleFavorite={onToggleFavorite}
                      compact
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Garage */}
          {garageItems.length > 0 && (
            <section className="px-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[18px] font-bold text-[#1C1C1E]">
                  Garage
                </h3>
                <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {garageItems.map((item) => (
                  <div key={item.id} className="flex-shrink-0 w-[160px]">
                    <ItemCard
                      item={item}
                      userBalance={userBalance}
                      owned={ownedItems.includes(item.id)}
                      equipped={equippedItems.includes(item.id)}
                      favorited={favoritedIds.includes(item.id)}
                      onSelect={() => onItemSelect(item)}
                      onToggleFavorite={onToggleFavorite}
                      compact
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Collections */}
      {catalog?.collections && showDynamicSections && (
        <section className="px-4 mb-6">
          <h3 className="text-[18px] font-bold text-[#1C1C1E] mb-3">
            Collections
          </h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {catalog.collections.slice(0, 4).map((col) => (
              <div key={col.id} className="flex-shrink-0 w-[200px]">
                <CollectionCard
                  collection={col}
                  ownedCount={col.itemIds.filter((id) =>
                    ownedItems.includes(id)
                  ).length}
                  onSelect={() => onCollectionSelect(col)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* My Items header */}
      {viewTab === "my_items" && (
        <section className="px-4 mb-4">
          <div className="bg-white rounded-[16px] p-4 border border-[#E5E5EA]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[20px] font-bold text-[#1C1C1E]">
                  {ownedItems.length} items collected
                </p>
                <p className="text-[12px] text-[#8E8E93] mt-0.5">
                  {equippedItems.length} currently equipped
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#E8FAF0] flex items-center justify-center">
                <Check className="w-6 h-6 text-[#34C759]" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Sort bar + filter button */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-[#8E8E93]">
            {filteredItems.length} items
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold border transition-colors ${
                hasActiveFilters
                  ? "bg-[#5E5CE6] text-white border-[#5E5CE6]"
                  : "bg-white text-[#636366] border-[#E5E5EA]"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as StoreSort)}
              className="bg-white border border-[#E5E5EA] rounded-[8px] px-3 py-1.5 text-[13px] text-[#1C1C1E] focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-4 mb-4"
          >
            <div className="bg-white rounded-[16px] p-4 border border-[#E5E5EA] space-y-4">
              {/* Rarity */}
              <div>
                <p className="text-[11px] font-bold text-[#636366] uppercase tracking-wider mb-2">
                  Rarity
                </p>
                <div className="flex flex-wrap gap-2">
                  {RARITY_LIST.map((r) => {
                    const isActive = filterRarities.includes(r);
                    return (
                      <button
                        key={r}
                        onClick={() => toggleRarity(r)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                          isActive
                            ? "text-white"
                            : "bg-white text-[#636366] border-[#E5E5EA]"
                        }`}
                        style={
                          isActive
                            ? {
                                backgroundColor: RARITY_COLORS[r],
                                borderColor: RARITY_COLORS[r],
                              }
                            : undefined
                        }
                      >
                        {isActive && <Check className="w-3 h-3" />}
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <p className="text-[11px] font-bold text-[#636366] uppercase tracking-wider mb-2">
                  Price Range
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRICE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => applyPricePreset(preset)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                        activePricePreset === preset.label
                          ? "bg-[#1C1C1E] text-white border-[#1C1C1E]"
                          : "bg-white text-[#636366] border-[#E5E5EA]"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filterPriceMin === 0 ? "" : filterPriceMin}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : 0;
                      setFilterPriceMin(val);
                      setActivePricePreset(null);
                    }}
                    className="flex-1 px-3 py-2 bg-[#F2F2F7] rounded-[8px] text-[13px] text-[#1C1C1E] placeholder:text-[#C7C7CC] focus:outline-none focus:ring-1 focus:ring-[#5E5CE6]"
                  />
                  <span className="text-[13px] text-[#8E8E93]">–</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filterPriceMax === Infinity ? "" : filterPriceMax}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : Infinity;
                      setFilterPriceMax(val);
                      setActivePricePreset(null);
                    }}
                    className="flex-1 px-3 py-2 bg-[#F2F2F7] rounded-[8px] text-[13px] text-[#1C1C1E] placeholder:text-[#C7C7CC] focus:outline-none focus:ring-1 focus:ring-[#5E5CE6]"
                  />
                </div>
              </div>

              {/* Owned toggle */}
              <div>
                <p className="text-[11px] font-bold text-[#636366] uppercase tracking-wider mb-2">
                  Ownership
                </p>
                <div className="flex gap-2">
                  {[
                    { id: "all" as const, label: "All" },
                    { id: "owned" as const, label: "Owned" },
                    { id: "not_owned" as const, label: "Not Owned" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setFilterOwned(opt.id)}
                      className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-colors ${
                        filterOwned === opt.id
                          ? "bg-[#1C1C1E] text-white"
                          : "bg-[#F2F2F7] text-[#636366]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full py-2.5 rounded-[10px] bg-[#F2F2F7] text-[#636366] text-[13px] font-semibold"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wishlist empty state */}
      {viewTab === "wishlist" && filteredItems.length === 0 && (
        <div className="text-center py-12 px-4">
          <Heart className="w-12 h-12 text-[#C7C7CC] mx-auto mb-4" />
          <p className="text-[14px] text-[#8E8E93] font-medium">
            Your wishlist is empty
          </p>
          <p className="text-[12px] text-[#C7C7CC] mt-1">
            Tap the heart icon on items to add them here
          </p>
        </div>
      )}

      {/* Favorites empty state */}
      {viewTab === "favorites" && filteredItems.length === 0 && (
        <div className="text-center py-12 px-4">
          <Heart className="w-12 h-12 text-[#C7C7CC] mx-auto mb-4" />
          <p className="text-[14px] text-[#8E8E93] font-medium">
            No favorites yet
          </p>
          <p className="text-[12px] text-[#C7C7CC] mt-1">
            Heart items to save your favorites
          </p>
        </div>
      )}

      {/* My Items empty state */}
      {viewTab === "my_items" && filteredItems.length === 0 && (
        <div className="text-center py-12 px-4">
          <ShoppingBag className="w-12 h-12 text-[#C7C7CC] mx-auto mb-4" />
          <p className="text-[14px] text-[#8E8E93] font-medium">
            No items yet
          </p>
          <p className="text-[12px] text-[#C7C7CC] mt-1">
            Start building your collection!
          </p>
        </div>
      )}

      {/* Items grid */}
      {(viewTab !== "wishlist" || filteredItems.length > 0) &&
        (viewTab !== "favorites" || filteredItems.length > 0) &&
        (viewTab !== "my_items" || filteredItems.length > 0) && (
        <section className="px-4">
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                userBalance={userBalance}
                owned={ownedItems.includes(item.id)}
                equipped={equippedItems.includes(item.id)}
                favorited={favoritedIds.includes(item.id)}
                onSelect={() => onItemSelect(item)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-[#C7C7CC] mx-auto mb-4" />
              <p className="text-[14px] text-[#8E8E93]">
                No items found
              </p>
              <p className="text-[12px] text-[#C7C7CC]">
                Try a different search or category
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
