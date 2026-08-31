/**
 * PDR-6 Feature-1: THE VAULT — Catalog API
 * GET /api/vault/catalog - Returns the full catalog
 */

import { NextRequest } from "next/server";
import { route, fail, ok } from "@/server/http";
import { getVaultCatalog } from "@/server/services/vault-catalog";
import type { StoreFilter, StoreSort } from "@/types/vault";

export const GET = route(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const catalog = getVaultCatalog();

  // Check if requesting a specific item
  const itemId = searchParams.get("itemId");
  if (itemId) {
    const item = catalog.getItem(itemId);
    if (!item) {
      return fail("NOT_FOUND", "Item not found");
    }
    return ok({ item });
  }

  // Build filters
  const filter: StoreFilter = {};

  const types = searchParams.get("types");
  if (types) {
    filter.types = types.split(",") as any[];
  }

  const rarities = searchParams.get("rarities");
  if (rarities) {
    filter.rarities = rarities.split(",") as any[];
  }

  const priceMin = searchParams.get("priceMin");
  if (priceMin) {
    filter.priceMin = parseInt(priceMin);
  }

  const priceMax = searchParams.get("priceMax");
  if (priceMax) {
    filter.priceMax = parseInt(priceMax);
  }

  const search = searchParams.get("search");
  if (search) {
    filter.search = search;
  }

  const collections = searchParams.get("collections");
  if (collections) {
    filter.collections = collections.split(",");
  }

  const sort = (searchParams.get("sort") as StoreSort) || "recommended";

  let items = catalog.searchItems(filter);
  items = catalog.sortItems(items, sort);

  const sections = catalog.getSections();
  const featured = catalog.getFeatured();
  const collectionsList = catalog.getAllCollections();

  return ok({
    version: catalog.getCatalog().version,
    items,
    featured,
    sections,
    collections: collectionsList,
    totalItems: items.length,
  });
});
