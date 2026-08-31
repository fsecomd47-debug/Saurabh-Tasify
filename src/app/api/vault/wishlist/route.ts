/**
 * PDR-6 Feature-1: THE VAULT — Wishlist & Favorites API
 * GET    /api/vault/wishlist - Get wishlist
 * POST   /api/vault/wishlist - Add to wishlist
 * DELETE /api/vault/wishlist - Remove from wishlist
 * GET    /api/vault/favorites - Get favorites
 * POST   /api/vault/favorites - Add to favorites
 * DELETE /api/vault/favorites - Remove from favorites
 */

import { NextRequest } from "next/server";
import { requireUser } from "@/server/session";
import { route, fail, ok } from "@/server/http";
import { db } from "@/db";
import { vaultWishlist, vaultOwnership } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const GET = route(async (request: NextRequest) => {
  const user = await requireUser();
  const userId = user.id;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "wishlist";

  if (type === "wishlist") {
    const items = await db
      .select()
      .from(vaultWishlist)
      .where(eq(vaultWishlist.userId, userId));

    return ok({ items: items.map((i) => i.itemId) });
  }

  if (type === "favorites") {
    const items = await db
      .select()
      .from(vaultOwnership)
      .where(
        and(
          eq(vaultOwnership.userId, userId),
          eq(vaultOwnership.favorite, true)
        )
      );

    return ok({ items: items.map((i) => i.itemId) });
  }

  return fail("VALIDATION_ERROR", "Invalid type");
});

export const POST = route(async (request: NextRequest) => {
  const user = await requireUser();
  const userId = user.id;

  const body = await request.json();
  const { itemId, type } = body;

  if (!itemId || !type) {
    return fail("VALIDATION_ERROR", "Missing itemId or type");
  }

  if (type === "wishlist") {
    const existing = await db
      .select()
      .from(vaultWishlist)
      .where(
        and(
          eq(vaultWishlist.userId, userId),
          eq(vaultWishlist.itemId, itemId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(vaultWishlist).values({ userId, itemId });
    }

    return ok({ added: true });
  }

  if (type === "favorites") {
    const owns = await db
      .select()
      .from(vaultOwnership)
      .where(
        and(
          eq(vaultOwnership.userId, userId),
          eq(vaultOwnership.itemId, itemId)
        )
      )
      .limit(1);

    if (owns.length === 0) {
      return fail("VALIDATION_ERROR", "Item not owned");
    }

    const isFav = owns[0].favorite;
    await db
      .update(vaultOwnership)
      .set({ favorite: !isFav })
      .where(
        and(
          eq(vaultOwnership.userId, userId),
          eq(vaultOwnership.itemId, itemId)
        )
      );

    return ok({ favorited: !isFav });
  }

  return fail("VALIDATION_ERROR", "Invalid type");
});

export const DELETE = route(async (request: NextRequest) => {
  const user = await requireUser();
  const userId = user.id;

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  const type = searchParams.get("type");

  if (!itemId || !type) {
    return fail("VALIDATION_ERROR", "Missing itemId or type");
  }

  if (type === "wishlist") {
    await db
      .delete(vaultWishlist)
      .where(
        and(
          eq(vaultWishlist.userId, userId),
          eq(vaultWishlist.itemId, itemId)
        )
      );

    return ok({ removed: true });
  }

  if (type === "favorites") {
    await db
      .update(vaultOwnership)
      .set({ favorite: false })
      .where(
        and(
          eq(vaultOwnership.userId, userId),
          eq(vaultOwnership.itemId, itemId)
        )
      );

    return ok({ unfavorited: true });
  }

  return fail("VALIDATION_ERROR", "Invalid type");
});
