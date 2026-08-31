/**
 * PDR-6 Feature-1: THE VAULT — Goals API
 * GET    /api/vault/goals - Get user's goal
 * POST   /api/vault/goals - Set a goal
 * DELETE /api/vault/goals - Clear goal
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/session";
import { route, fail, ok } from "@/server/http";
import { db } from "@/db";
import { vaultGoals, vaultOwnership } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getVaultCatalog } from "@/server/services/vault-catalog";

export const GET = route(async (request: NextRequest) => {
  const user = await requireUser();
  const userId = user.id;

  const goal = await db
    .select()
    .from(vaultGoals)
    .where(eq(vaultGoals.userId, userId))
    .limit(1);

  if (goal.length === 0) {
    return ok({ goal: null });
  }

  const catalog = getVaultCatalog();
  const item = catalog.getItem(goal[0].itemId);

  return ok({
    goal: {
      itemId: goal[0].itemId,
      item,
      setAt: goal[0].setAt,
    },
  });
});

export const POST = route(async (request: NextRequest) => {
  const user = await requireUser();
  const userId = user.id;

  const body = await request.json();
  const { itemId } = body;

  if (!itemId) {
    return fail("VALIDATION_ERROR", "Missing itemId");
  }

  // Verify item exists
  const catalog = getVaultCatalog();
  const item = catalog.getItem(itemId);

  if (!item) {
    return fail("NOT_FOUND", "Item not found");
  }

  // Upsert goal
  const existing = await db
    .select()
    .from(vaultGoals)
    .where(eq(vaultGoals.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(vaultGoals).values({
      userId,
      itemId,
    });
  } else {
    await db
      .update(vaultGoals)
      .set({
        itemId,
        setAt: new Date(),
      })
      .where(eq(vaultGoals.userId, userId));
  }

  return ok({
    goal: {
      itemId,
      item,
    },
  });
});

export const DELETE = route(async (request: NextRequest) => {
  const user = await requireUser();
  const userId = user.id;

  await db.delete(vaultGoals).where(eq(vaultGoals.userId, userId));

  return ok({ success: true });
});
