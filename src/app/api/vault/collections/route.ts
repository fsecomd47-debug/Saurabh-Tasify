/**
 * PDR-6 Feature-1: THE VAULT — Collections API
 * GET /api/vault/collections - Get all collections with progress
 * GET /api/vault/collections/:id - Get specific collection
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/session";
import { route, fail, ok } from "@/server/http";
import { getVaultCollectionsService } from "@/server/services/vault-collections";

export const GET = route(async (request: NextRequest) => {
  const user = await requireUser();
  const userId = user.id;

  const { searchParams } = new URL(request.url);
  const collectionId = searchParams.get("id");

  const collectionsService = getVaultCollectionsService();

  if (collectionId) {
    // Get specific collection
    const collection = await collectionsService.getCollection(
      userId,
      collectionId
    );

    if (!collection) {
      return fail("NOT_FOUND", "Collection not found");
    }

    return ok({ collection });
  }

  // Get all collections
  const collections = await collectionsService.getCollectionProgress(userId);

  return ok({ collections });
});
