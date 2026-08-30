"use client";

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { ArrowLeft, Filter, Pickaxe, Zap, Lock, Check, X, Shield, Star, Gem, TrendingUp, Target, ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ClientPortal } from "@/components/layout/ClientPortal";
import { usePetCatalog, useUserPets, useMiningStatus, usePurchasePet, useEquipPet, useUnequipPet, useSettleMining, useSnapshot } from "@/hooks/queries";
import { usePetStore } from "@/store/pet-store";
import { PET_RARITY_CONFIG, PET_ARCHETYPE_CONFIG, PET_MINING_DAILY_CAP } from "@/lib/pets/data";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PetCatalogItem } from "@/types/api";

type FilterRarity = "all" | "common" | "rare" | "epic" | "legendary" | "mythic";
type FilterStatus = "all" | "owned" | "available" | "locked";
type SortBy = "recommended" | "mining" | "xp" | "price" | "level";

const RARITY_FILTERS: { id: FilterRarity; label: string; color: string }[] = [
  { id: "all", label: "All", color: "#5E5CE6" },
  { id: "common", label: "Common", color: "#94A3B8" },
  { id: "rare", label: "Rare", color: "#3B82F6" },
  { id: "epic", label: "Epic", color: "#8B5CF6" },
  { id: "legendary", label: "Legendary", color: "#F59E0B" },
  { id: "mythic", label: "Mythic", color: "#EF4444" },
];

const STATUS_FILTERS: { id: FilterStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "owned", label: "Owned" },
  { id: "available", label: "Available" },
  { id: "locked", label: "Locked" },
];

const COLLECTION_MILESTONES = [
  { count: 3, reward: "+5% ST Yield", icon: "⚡" },
  { count: 5, reward: "+10% ST Yield", icon: "🔥" },
  { count: 7, reward: "Exclusive Frame", icon: "👑" },
  { count: 10, reward: "+20% ST Yield", icon: "💎" },
  { count: 14, reward: "Mythic Unlock", icon: "🦄" },
];

const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)";
const RARITY_RANK: Record<string, number> = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };

/* ═══════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                     */
/* ═══════════════════════════════════════════════════════════════ */

export default function PetsPage() {
  const router = useRouter();
  const [rarityFilter, setRarityFilter] = useState<FilterRarity>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recommended");
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [comparePet, setComparePet] = useState<string | null>(null);
  const { goalPetId, setGoalPet } = usePetStore();

  const { data: catalog, isLoading: catalogLoading } = usePetCatalog();
  const { data: userPets } = useUserPets();
  const { data: mining } = useMiningStatus();
  const { data: snap } = useSnapshot();
  const settleMining = useSettleMining();

  const playerLevel = snap?.progress.level ?? 1;
  const balance = snap?.wallet.balance ?? 0;

  const ownedIds = useMemo(() => new Set(userPets?.map((p) => p.petDefinitionId) ?? []), [userPets]);
  const equippedId = useMemo(() => userPets?.find((p) => p.equipped)?.petDefinitionId ?? null, [userPets]);
  const activePet = useMemo(() => catalog?.find((p) => p.id === equippedId) ?? null, [catalog, equippedId]);

  const filteredPets = useMemo(() => {
    if (!catalog) return [];
    let pets = [...catalog];
    if (rarityFilter !== "all") pets = pets.filter((p) => p.rarity === rarityFilter);
    if (statusFilter === "owned") pets = pets.filter((p) => ownedIds.has(p.id));
    else if (statusFilter === "available") pets = pets.filter((p) => !ownedIds.has(p.id) && playerLevel >= p.unlockPlayerLevel && balance >= p.priceSt);
    else if (statusFilter === "locked") pets = pets.filter((p) => !ownedIds.has(p.id) && (playerLevel < p.unlockPlayerLevel || balance < p.priceSt));

    switch (sortBy) {
      case "mining": pets.sort((a, b) => b.miningRatePerMinute - a.miningRatePerMinute); break;
      case "xp": pets.sort((a, b) => b.xpBoostPercent - a.xpBoostPercent); break;
      case "price": pets.sort((a, b) => a.priceSt - b.priceSt); break;
      case "level": pets.sort((a, b) => a.level - b.level); break;
      default: pets.sort((a, b) => (b.level - a.level) || ((RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0)));
    }
    return pets;
  }, [catalog, rarityFilter, statusFilter, sortBy, ownedIds, playerLevel, balance]);

  const totalOwned = ownedIds.size;
  const totalPets = catalog?.length ?? 0;
  const selectedPetData = selectedPet ? catalog?.find((p) => p.id === selectedPet) ?? null : null;
  const comparePetData = comparePet ? catalog?.find((p) => p.id === comparePet) ?? null : null;

  // Featured pet: highest rarity not yet owned, or first legendary
  const featuredPet = useMemo(() => {
    if (!catalog) return null;
    const unowned = catalog.filter((p) => !ownedIds.has(p.id) && playerLevel >= p.unlockPlayerLevel);
    const legendary = unowned.find((p) => p.rarity === "legendary" || p.rarity === "mythic");
    return legendary ?? unowned[0] ?? null;
  }, [catalog, ownedIds, playerLevel]);

  // Auto-settle mining periodically
  useEffect(() => {
    if (!mining?.active) return;
    const iv = setInterval(() => { settleMining.mutate(); }, 60_000);
    return () => clearInterval(iv);
  }, [mining?.active, settleMining]);

  return (
    <AppShell>
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-5 pt-1 pb-1">
        <button onClick={() => router.back()} aria-label="Go back" className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-[#636366]" />
        </button>
        <div className="flex-1">
          <h1 className="text-[22px] font-bold text-[#1C1C1E] leading-tight" style={{ letterSpacing: "-0.02em" }}>Pets</h1>
          <p className="text-[12px] font-medium text-[#8E8E93] mt-0.5">{totalOwned} / {totalPets} collected</p>
        </div>
      </div>

      {/* ── Active Pet Habitat ── */}
      <div className="px-5 mt-3">
        <ActivePetHabitat
          activePet={activePet ?? null}
          mining={mining ?? null}
          onExplore={() => {
            if (equippedId) setSelectedPet(equippedId);
            else {
              const firstOwned = catalog?.find((p) => ownedIds.has(p.id));
              if (firstOwned) setSelectedPet(firstOwned.id);
            }
          }}
        />
      </div>

      {/* ── Collection Progress ── */}
      <div className="px-5 mt-3">
        <CollectionProgressBar totalOwned={totalOwned} totalPets={totalPets} />
      </div>

      {/* ── Featured Pet ── */}
      {featuredPet && !ownedIds.has(featuredPet.id) && (
        <div className="px-5 mt-3">
          <FeaturedPetCard
            pet={featuredPet}
            affordable={balance >= featuredPet.priceSt}
            onView={() => setSelectedPet(featuredPet.id)}
          />
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="px-5 mt-3 flex items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all",
            showFilters ? "bg-[#1C1C1E] text-white" : "bg-white text-[#636366]"
          )}
          style={{ boxShadow: CARD_SHADOW }}
        >
          <Filter className="w-3 h-3" /> Filter
        </button>
        <div className="flex-1 overflow-x-auto no-scrollbar flex gap-1.5">
          {RARITY_FILTERS.slice(0, 5).map((f) => (
            <button
              key={f.id}
              onClick={() => setRarityFilter(f.id)}
              className={cn(
                "flex-shrink-0 px-2.5 py-1.5 rounded-full text-[10px] font-semibold transition-all",
                rarityFilter === f.id ? "text-white" : "bg-white text-[#636366]"
              )}
              style={rarityFilter === f.id ? { background: f.color, boxShadow: `0 2px 8px ${f.color}40` } : { boxShadow: CARD_SHADOW }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Expanded Filters ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pt-3 pb-2 space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-[#8E8E93] w-12">Status</span>
                {STATUS_FILTERS.map((f) => (
                  <button key={f.id} onClick={() => setStatusFilter(f.id)}
                    className={cn("px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all", statusFilter === f.id ? "bg-[#1C1C1E] text-white" : "bg-white text-[#636366]")}
                    style={statusFilter !== f.id ? { boxShadow: CARD_SHADOW } : undefined}>
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-[#8E8E93] w-12">Sort</span>
                {(["recommended", "mining", "xp", "price", "level"] as SortBy[]).map((s) => (
                  <button key={s} onClick={() => setSortBy(s)}
                    className={cn("px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize transition-all", sortBy === s ? "bg-[#1C1C1E] text-white" : "bg-white text-[#636366]")}
                    style={sortBy !== s ? { boxShadow: CARD_SHADOW } : undefined}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pet Grid ── */}
      <div className="px-5 mt-3 grid grid-cols-3 gap-2.5 pb-6">
        {catalogLoading && [0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-44 rounded-[20px] bg-white animate-pulse" style={{ boxShadow: CARD_SHADOW }} />
        ))}

        {!catalogLoading && filteredPets.length === 0 && (
          <div className="col-span-3 text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[#F2F2F7] flex items-center justify-center mx-auto mb-3">
              <Gem className="w-7 h-7 text-[#C7C7CC]" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] font-bold text-[#1C1C1E]">No pets found</p>
            <p className="text-[11px] text-[#8E8E93] mt-1 max-w-[220px] mx-auto">
              {statusFilter === "owned"
                ? "Your collection is just getting started. Find a companion and put it to work."
                : "Try adjusting your filters to discover more companions."}
            </p>
            {statusFilter === "owned" && (
              <button onClick={() => setStatusFilter("all")}
                className="mt-3 px-4 py-2 rounded-full bg-[#5E5CE6] text-[11px] font-bold text-white"
                style={{ boxShadow: "0 4px 12px rgba(94,92,230,0.3)" }}>
                Explore Pets
              </button>
            )}
          </div>
        )}

        {!catalogLoading && filteredPets.map((pet, idx) => (
          <PetCard
            key={pet.id}
            pet={pet}
            idx={idx}
            owned={ownedIds.has(pet.id)}
            equipped={equippedId === pet.id}
            locked={playerLevel < pet.unlockPlayerLevel}
            affordable={balance >= pet.priceSt}
            playerLevel={playerLevel}
            onClick={() => setSelectedPet(pet.id)}
            onCompare={() => setComparePet(pet.id)}
          />
        ))}
      </div>

      {/* ── Pet Detail Sheet ── */}
      <ClientPortal>
        <AnimatePresence>
          {selectedPetData && (
            <PetDetailSheet
              pet={selectedPetData}
              owned={ownedIds.has(selectedPetData.id)}
              equipped={equippedId === selectedPetData.id}
              locked={playerLevel < selectedPetData.unlockPlayerLevel}
              affordable={balance >= selectedPetData.priceSt}
              balance={balance}
              playerLevel={playerLevel}
              onClose={() => setSelectedPet(null)}
              onCompare={() => setComparePet(selectedPetData.id)}
              isGoal={goalPetId === selectedPetData.id}
              onSetGoal={() => setGoalPet(goalPetId === selectedPetData.id ? null : selectedPetData.id)}
            />
          )}
        </AnimatePresence>
      </ClientPortal>

      {/* ── Compare Sheet ── */}
      <ClientPortal>
        <AnimatePresence>
          {comparePetData && selectedPetData && (
            <ComparePetSheet
              petA={selectedPetData}
              petB={comparePetData}
              onClose={() => setComparePet(null)}
            />
          )}
        </AnimatePresence>
      </ClientPortal>
    </AppShell>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  ACTIVE PET HABITAT (HERO)                                     */
/* ═══════════════════════════════════════════════════════════════ */

function ActivePetHabitat({
  activePet,
  mining,
  onExplore,
}: {
  activePet: PetCatalogItem | null;
  mining: { active: boolean; petName: string; petEmoji: string; miningRate: number; todayMined: number; dailyCap: number } | null;
  onExplore: () => void;
}) {
  const [floatY, setFloatY] = useState(0);
  const [yieldPulse, setYieldPulse] = useState(false);
  const [floatingTokens, setFloatingTokens] = useState<{ id: number; x: number; y: number }[]>([]);
  const tokenIdRef = useRef(0);

  // Floating idle animation
  useEffect(() => {
    if (!activePet) return;
    let frame: number;
    let t = 0;
    const tick = () => {
      t += 0.02;
      setFloatY(Math.sin(t) * 6);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activePet]);

  // Floating token animation every 3s when mining
  useEffect(() => {
    if (!mining?.active || !mining.miningRate) return;
    const iv = setInterval(() => {
      const id = tokenIdRef.current++;
      const x = 30 + Math.random() * 40;
      setFloatingTokens((prev) => [...prev.slice(-4), { id, x, y: 0 }]);
      setYieldPulse(true);
      setTimeout(() => setYieldPulse(false), 600);
      setTimeout(() => setFloatingTokens((prev) => prev.filter((t) => t.id !== id)), 2000);
    }, 3000);
    return () => clearInterval(iv);
  }, [mining?.active, mining?.miningRate]);

  const rarityCfg = activePet ? PET_RARITY_CONFIG[activePet.rarity as keyof typeof PET_RARITY_CONFIG] : null;

  // Progress ring
  const ringRadius = 52;
  const ringStroke = 4;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const [ringProgress, setRingProgress] = useState(0);

  useEffect(() => {
    if (!mining?.active) return;
    const start = Date.now();
    const duration = 60_000; // 60s cycle
    let frame: number;
    const tick = () => {
      const elapsed = (Date.now() - start) % duration;
      setRingProgress(elapsed / duration);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mining?.active]);

  if (!activePet) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-[20px] bg-white p-5 text-center" style={{ boxShadow: CARD_SHADOW }}>
        <div className="w-16 h-16 rounded-full bg-[#F2F2F7] flex items-center justify-center mx-auto mb-3">
            <Gem className="w-7 h-7 text-[#C7C7CC]" strokeWidth={1.5} />
        </div>
        <p className="text-[15px] font-bold text-[#1C1C1E]">No Companion Active</p>
        <p className="text-[12px] text-[#8E8E93] mt-1">Adopt a pet and equip it to start mining ST!</p>
        <button onClick={onExplore}
          className="mt-3 px-5 py-2 rounded-full bg-[#5E5CE6] text-white text-[12px] font-bold"
          style={{ boxShadow: "0 4px 12px rgba(94,92,230,0.3)" }}>
          Explore Pets
        </button>
      </motion.div>
    );
  }

  const perMinute = mining?.miningRate ?? activePet.miningRatePerMinute;
  const todayMined = mining?.todayMined ?? 0;
  const dailyCap = mining?.dailyCap ?? PET_MINING_DAILY_CAP;
  const capPct = Math.min(100, (todayMined / dailyCap) * 100);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="relative rounded-[20px] bg-white overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>

      {/* Ambient aura glow */}
      {rarityCfg && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${rarityCfg.color}12 0%, transparent 60%)`,
          }}
        />
      )}

      <div className="relative p-5 flex items-center gap-4">
        {/* Pet pedestal with progress ring */}
        <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
          {/* SVG Progress Ring */}
          <svg className="absolute inset-0" width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={ringRadius} fill="none" stroke="#F2F2F7" strokeWidth={ringStroke} />
            <circle cx="60" cy="60" r={ringRadius} fill="none"
              stroke={rarityCfg?.color ?? "#5E5CE6"} strokeWidth={ringStroke}
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringCircumference * (1 - ringProgress)}
              transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
          </svg>

          {/* Pet emoji pedestal */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{ transform: `translateY(${floatY}px)` }}
              className={cn("transition-transform", yieldPulse && "scale-110")}>
              <span className="text-5xl select-none" style={{ filter: `drop-shadow(0 4px 12px ${rarityCfg?.color ?? "#5E5CE6"}40)` }}>
                {activePet.emoji}
              </span>
            </div>
          </div>

          {/* Floating +ST tokens */}
          <AnimatePresence>
            {floatingTokens.map((token) => (
              <motion.div key={token.id}
                initial={{ opacity: 1, y: 0, x: token.x - 60 }}
                animate={{ opacity: 0, y: -50 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 pointer-events-none"
                style={{ marginLeft: -12 }}>
                <span className="text-[10px] font-bold tabular-nums"
                  style={{ color: "#F59E0B", textShadow: "0 1px 4px rgba(245,158,11,0.3)" }}>
                  +{(perMinute).toFixed(1)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Pet info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-1.5 py-0.5 rounded-md text-[8px] font-bold tracking-wider uppercase"
              style={{ background: rarityCfg?.bg ?? "#F1F5F9", color: rarityCfg?.color ?? "#94A3B8" }}>
              {rarityCfg?.label ?? "Common"}
            </span>
            <span className="text-[10px] font-bold text-[#5E5CE6]">ACTIVE</span>
          </div>
          <h2 className="text-[17px] font-bold text-[#1C1C1E] truncate">{activePet.name}</h2>
          <p className="text-[11px] text-[#8E8E93] italic mt-0.5">&ldquo;{activePet.personality}&rdquo;</p>

          {/* Mining stats */}
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Pickaxe className="w-3 h-3 text-[#F59E0B]" />
              <span className="text-[12px] font-bold text-[#1C1C1E] tabular-nums">{perMinute.toFixed(1)}</span>
              <span className="text-[10px] text-[#8E8E93]">ST/min</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#34C759]" />
              <span className="text-[12px] font-bold text-[#34C759] tabular-nums">{formatCurrency(todayMined)}</span>
              <span className="text-[10px] text-[#8E8E93]">today</span>
            </div>
          </div>

          {/* Daily cap bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-semibold text-[#8E8E93]">Daily Cap</span>
              <span className="text-[9px] font-bold text-[#636366] tabular-nums">{formatCurrency(todayMined)} / {formatCurrency(dailyCap)}</span>
            </div>
            <div className="h-1.5 bg-[#F2F2F7] rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${capPct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, #F59E0B, #FCD34D)` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action */}
      <div className="px-5 pb-4">
        <button onClick={onExplore}
          className="w-full py-2.5 rounded-full bg-[#F2F2F7] text-[12px] font-bold text-[#636366] transition-all active:scale-[0.98]">
          {mining?.active ? "Manage Companion" : "Equip a Companion"}
        </button>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  COLLECTION PROGRESS BAR                                       */
/* ═══════════════════════════════════════════════════════════════ */

function CollectionProgressBar({ totalOwned, totalPets }: { totalOwned: number; totalPets: number }) {
  const pct = totalPets > 0 ? (totalOwned / totalPets) * 100 : 0;

  // Per-tier stats from catalog
  const { data: catalog } = usePetCatalog();
  const tiers = useMemo(() => {
    if (!catalog) return [];
    const levels = [0, 1, 2, 3, 4, 5];
    return levels.map((lvl) => {
      const petsAtLevel = catalog.filter((p) => p.level === lvl);
      const ownedAtLevel = petsAtLevel.filter((p) => p.owned).length;
      return { level: lvl, total: petsAtLevel.length, owned: ownedAtLevel, complete: ownedAtLevel === petsAtLevel.length && petsAtLevel.length > 0 };
    }).filter((t) => t.total > 0);
  }, [catalog]);

  return (
    <div className="rounded-[20px] bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#EDEDFC] flex items-center justify-center">
            <Star className="w-3.5 h-3.5 text-[#5E5CE6]" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-[#1C1C1E]">Collection</p>
            <p className="text-[10px] text-[#8E8E93]">{totalOwned} / {totalPets} pets</p>
          </div>
        </div>
        <span className="text-[11px] font-bold text-[#5E5CE6] tabular-nums">{Math.round(pct)}%</span>
      </div>

      {/* Main progress bar */}
      <div className="relative h-2 bg-[#F2F2F7] rounded-full overflow-visible mb-4">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: "linear-gradient(90deg, #5E5CE6, #7A78FF)" }}
        />

        {/* Milestone nodes */}
        {COLLECTION_MILESTONES.map((m) => {
          const pos = totalPets > 0 ? (m.count / totalPets) * 100 : 0;
          const reached = totalOwned >= m.count;
          return (
            <div key={m.count} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${pos}%`, marginLeft: -6 }}>
              <div className={cn(
                "w-3 h-3 rounded-full border-2 transition-all duration-500",
                reached ? "bg-[#5E5CE6] border-white" : "bg-white border-[#D1D5DB]"
              )}
                style={reached ? { boxShadow: "0 0 8px rgba(94,92,230,0.4)" } : undefined}
              />
            </div>
          );
        })}
      </div>

      {/* Milestone labels */}
      <div className="flex justify-between mb-3">
        {COLLECTION_MILESTONES.map((m) => {
          const reached = totalOwned >= m.count;
          return (
            <div key={m.count} className="text-center" style={{ width: 56 }}>
              <span className="text-[12px]">{m.icon}</span>
              <p className={cn("text-[8px] font-bold mt-0.5 leading-tight", reached ? "text-[#5E5CE6]" : "text-[#AEAEB2]")}>
                {m.reward}
              </p>
              <p className={cn("text-[7px] font-semibold", reached ? "text-[#636366]" : "text-[#C7C7CC]")}>
                {m.count} pets
              </p>
            </div>
          );
        })}
      </div>

      {/* Per-tier completion */}
      {tiers.length > 0 && (
        <div className="pt-3 border-t border-[rgba(0,0,0,0.04)] space-y-1.5">
          {tiers.map((t) => (
            <div key={t.level} className="flex items-center gap-2">
              <span className={cn(
                "text-[9px] font-bold w-14",
                t.complete ? "text-[#34C759]" : "text-[#8E8E93]"
              )}>
                Lv.{t.level}
              </span>
              <div className="flex-1 h-1.5 bg-[#F2F2F7] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: t.total > 0 ? `${(t.owned / t.total) * 100}%` : "0%",
                    background: t.complete ? "#34C759" : "#5E5CE6",
                  }}
                />
              </div>
              <span className={cn(
                "text-[9px] font-bold tabular-nums",
                t.complete ? "text-[#34C759]" : "text-[#8E8E93]"
              )}>
                {t.owned}/{t.total}
              </span>
              {t.complete && <span className="text-[10px]">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  PET CARD (with rarity juice + 3D tilt)                        */
/* ═══════════════════════════════════════════════════════════════ */

function PetCard({
  pet, idx, owned, equipped, locked, affordable, playerLevel, onClick, onCompare,
}: {
  pet: PetCatalogItem; idx: number; owned: boolean; equipped: boolean; locked: boolean;
  affordable: boolean; playerLevel: number; onClick: () => void; onCompare?: () => void;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });

  const rarityCfg = PET_RARITY_CONFIG[pet.rarity as keyof typeof PET_RARITY_CONFIG] ?? PET_RARITY_CONFIG.common;
  const isHighRarity = pet.rarity === "legendary" || pet.rarity === "mythic";
  const isEpicOrRare = pet.rarity === "epic" || pet.rarity === "rare";

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  // Locked progress
  const unlockPct = locked ? Math.min(100, (playerLevel / pet.unlockPlayerLevel) * 100) : 100;

  return (
    <motion.button
      ref={cardRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04, duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      whileTap={{ scale: 0.95 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className="relative text-left rounded-[20px] overflow-hidden"
      style={{
        boxShadow: isHighRarity
          ? `0 2px 8px ${rarityCfg.color}20, 0 8px 24px ${rarityCfg.color}15`
          : CARD_SHADOW,
        background: isHighRarity ? "#FAFAFA" : "#FFFFFF",
        transformStyle: "preserve-3d",
        perspective: 600,
      }}
    >
      <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative rounded-[20px] overflow-hidden"
        aria-label={`${pet.name} - ${rarityCfg.label} - ${owned ? "Owned" : locked ? "Locked" : formatCurrency(pet.priceSt) + " ST"}`}>

        {/* ── Rarity border glow (legendary/mythic) ── */}
        {isHighRarity && (
          <div className="absolute inset-0 rounded-[20px] pointer-events-none z-10"
            style={{
              border: `2px solid ${rarityCfg.color}50`,
              boxShadow: `inset 0 0 12px ${rarityCfg.color}15, 0 0 16px ${rarityCfg.color}20`,
            }}
          />
        )}

        {/* ── Epic/Rare accent border ── */}
        {isEpicOrRare && (
          <div className="absolute inset-0 rounded-[20px] pointer-events-none z-10"
            style={{ border: `1.5px solid ${rarityCfg.color}35` }}
          />
        )}

        {/* ── Holographic shine sweep (legendary/mythic) ── */}
        {isHighRarity && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-[20px]">
            <div className="absolute inset-0"
              style={{
                background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.1) 50%, transparent 55%)`,
                animation: "holoShine 4s ease-in-out infinite",
              }}
            />
          </div>
        )}

        {/* ── Particle overlay (mythic only) ── */}
        {pet.rarity === "mythic" && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-[20px]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="absolute w-1 h-1 rounded-full"
                style={{
                  background: i % 2 === 0 ? "#F59E0B" : "#EF4444",
                  left: `${15 + i * 14}%`,
                  top: `${20 + (i % 3) * 25}%`,
                  boxShadow: `0 0 4px ${i % 2 === 0 ? "#F59E0B" : "#EF4444"}`,
                  animation: `particleFloat ${2 + i * 0.3}s ease-in-out infinite`,
                  animationDelay: `${i * 0.4}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* ── Rarity badge ── */}
        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[7px] font-bold tracking-wider uppercase z-30"
          style={{
            background: isHighRarity ? rarityCfg.color : rarityCfg.bg,
            color: isHighRarity ? "#FFFFFF" : rarityCfg.color,
            boxShadow: isHighRarity ? `0 2px 8px ${rarityCfg.color}40` : undefined,
          }}>
          {rarityCfg.label}
        </span>

        {/* ── Pet emoji area ── */}
        <div className="w-full aspect-square flex items-center justify-center relative overflow-hidden"
          style={{
            background: locked
              ? "#F2F2F7"
              : `linear-gradient(135deg, ${pet.assetGradient.split(" → ")[0]}18, ${pet.assetGradient.split(" → ")[1]}18)`,
          }}>

          {/* Locked silhouette */}
          {locked ? (
            <div className="relative flex items-center justify-center">
              {/* Dark silhouette */}
              <span className="text-3xl select-none" style={{ filter: "brightness(0) opacity(0.85)" }}>
                {pet.emoji}
              </span>
              {/* Glowing eyes */}
              <div className="absolute flex gap-2" style={{ top: "38%", left: "50%", transform: "translateX(-50%)" }}>
                <div className="w-1.5 h-1.5 rounded-full"
                  style={{ background: rarityCfg.color, boxShadow: `0 0 6px ${rarityCfg.color}, 0 0 12px ${rarityCfg.color}60`, animation: "eyeGlow 2s ease-in-out infinite" }} />
                <div className="w-1.5 h-1.5 rounded-full"
                  style={{ background: rarityCfg.color, boxShadow: `0 0 6px ${rarityCfg.color}, 0 0 12px ${rarityCfg.color}60`, animation: "eyeGlow 2s ease-in-out infinite 0.3s" }} />
              </div>
              {/* Lock icon */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm">
                <div className="flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5 text-white" />
                  <span className="text-[8px] font-bold text-white">Lv.{pet.unlockPlayerLevel}</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <span className="text-3xl select-none transition-transform duration-300"
                style={{
                  filter: equipped ? `drop-shadow(0 2px 8px ${rarityCfg.color}50)` : undefined,
                  transform: equipped ? "scale(1.1)" : undefined,
                }}>
                {pet.emoji}
              </span>
              {equipped && (
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[7px] font-bold bg-[#34C759] text-white z-30"
                  style={{ boxShadow: "0 2px 6px rgba(52,199,89,0.4)" }}>
                  ACTIVE
                </span>
              )}
            </>
          )}
        </div>

        {/* ── Card content ── */}
        <div className="p-2.5">
          <p className="text-[8px] font-bold text-[#5E5CE6] uppercase tracking-wider">Lv.{pet.level}</p>
          <p className="text-[11px] font-bold text-[#1C1C1E] leading-tight truncate mt-0.5">{pet.name}</p>

          {/* Stats */}
          <div className="mt-1.5 space-y-0.5">
            <div className="flex items-center gap-1">
              <Pickaxe className="w-2.5 h-2.5 text-[#F59E0B]" />
              <span className="text-[9px] font-semibold text-[#636366]">{pet.miningRatePerMinute} ST/min</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-[#5E5CE6]" />
              <span className="text-[9px] font-semibold text-[#636366]">+{pet.xpBoostPercent}% XP</span>
            </div>
          </div>

          {/* Bottom divider + status */}
          <div className="mt-2 pt-1.5 border-t border-[rgba(0,0,0,0.04)]">
            {owned ? (
              <span className="text-[9px] font-bold text-[#34C759]">OWNED</span>
            ) : locked ? (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[8px] font-bold text-[#FF9500]">Lv.{playerLevel}/{pet.unlockPlayerLevel}</span>
                  <span className="text-[8px] font-semibold text-[#AEAEB2]">{Math.round(unlockPct)}%</span>
                </div>
                <div className="h-1 bg-[#F2F2F7] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#FF9500]" style={{ width: `${unlockPct}%` }} />
                </div>
              </div>
            ) : (
              <span className={cn("text-[9px] font-bold", affordable ? "text-[#5E5CE6]" : "text-[#AEAEB2]")}>
                {formatCurrency(pet.priceSt)} ST
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  PET DETAIL SHEET                                              */
/* ═══════════════════════════════════════════════════════════════ */

function PetDetailSheet({
  pet, owned, equipped, locked, affordable, balance, playerLevel, onClose, onCompare, isGoal, onSetGoal,
}: {
  pet: PetCatalogItem; owned: boolean; equipped: boolean; locked: boolean;
  affordable: boolean; balance: number; playerLevel: number; onClose: () => void;
  onCompare?: () => void; isGoal?: boolean; onSetGoal?: () => void;
}) {
  const router = useRouter();
  const purchase = usePurchasePet();
  const equip = useEquipPet();
  const unequip = useUnequipPet();
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [justPurchased, setJustPurchased] = useState(false);
  const [equipBurst, setEquipBurst] = useState(false);

  const rarityCfg = PET_RARITY_CONFIG[pet.rarity as keyof typeof PET_RARITY_CONFIG] ?? PET_RARITY_CONFIG.common;
  const archCfg = PET_ARCHETYPE_CONFIG[pet.archetype as keyof typeof PET_ARCHETYPE_CONFIG];
  const isHighRarity = pet.rarity === "legendary" || pet.rarity === "mythic";
  const unlockPct = locked ? Math.min(100, (playerLevel / pet.unlockPlayerLevel) * 100) : 100;

  const handlePurchase = async () => {
    try {
      await purchase.mutateAsync(pet.id);
      setShowPurchaseConfirm(false);
      setJustPurchased(true);
      setTimeout(() => setJustPurchased(false), 3000);
    } catch {
      // error handled by mutation
    }
  };

  const handleEquip = async () => {
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);
    if (equipped) {
      await unequip.mutateAsync();
    } else {
      setEquipBurst(true);
      setTimeout(() => setEquipBurst(false), 600);
      await equip.mutateAsync(pet.id);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-end justify-center bg-black/30" onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-[24px] overflow-hidden flex flex-col"
        style={{ maxHeight: "min(85vh, 100% - 64px)" }}>

        {/* Header with rarity gradient */}
        <div className="relative px-5 pt-5 pb-4 flex-shrink-0">
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(circle at 50% 30%, ${rarityCfg.color}15 0%, transparent 60%)` }} />

          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center z-10" aria-label="Close">
            <X className="w-4 h-4 text-[#636366]" />
          </button>

          <div className="relative flex flex-col items-center">
            {/* Pet display with equip burst */}
            <div className="w-28 h-28 rounded-[24px] flex items-center justify-center mb-3 relative"
              style={{
                background: `linear-gradient(135deg, ${pet.assetGradient.split(" → ")[0]}25, ${pet.assetGradient.split(" → ")[1]}25)`,
                boxShadow: isHighRarity ? `0 8px 32px ${rarityCfg.color}25` : undefined,
              }}>
              {/* Equip burst animation */}
              <AnimatePresence>
                {equipBurst && (
                  <motion.div initial={{ scale: 0, opacity: 0.8 }} animate={{ scale: 2.5, opacity: 0 }}
                    exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute inset-0 rounded-[24px] pointer-events-none z-20"
                    style={{ background: `radial-gradient(circle, ${rarityCfg.color}40 0%, transparent 70%)` }}
                  />
                )}
              </AnimatePresence>
              {/* Holographic shine on high rarity */}
              {isHighRarity && (
                <div className="absolute inset-0 rounded-[24px] overflow-hidden pointer-events-none">
                  <div className="absolute inset-0"
                    style={{
                      background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0.08) 50%, transparent 55%)`,
                      animation: "holoShine 4s ease-in-out infinite",
                    }}
                  />
                </div>
              )}
              <motion.span className="text-6xl select-none relative z-10"
                style={{ filter: `drop-shadow(0 4px 16px ${rarityCfg.color}40)` }}
                animate={equipBurst ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.4, ease: "easeInOut" }}>
                {pet.emoji}
              </motion.span>
            </div>

            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase mb-1"
              style={{
                background: isHighRarity ? rarityCfg.color : rarityCfg.bg,
                color: isHighRarity ? "#FFFFFF" : rarityCfg.color,
                boxShadow: isHighRarity ? `0 2px 8px ${rarityCfg.color}40` : undefined,
              }}>
              {rarityCfg.label}
            </span>
            <h2 className="text-[20px] font-bold text-[#1C1C1E]">{pet.name}</h2>
            <p className="text-[11px] text-[#8E8E93] italic mt-0.5">&ldquo;{pet.personality}&rdquo;</p>
            <p className="text-[12px] text-[#636366] mt-2 text-center px-4">{pet.description}</p>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-5 space-y-3 min-h-0">
          {/* Stats with animated bars */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={<Pickaxe className="w-3.5 h-3.5 text-[#F59E0B]" />} label="Mining"
              value={`${pet.miningRatePerMinute}`} unit="ST/min" color="#F59E0B" />
            <StatCard icon={<Zap className="w-3.5 h-3.5 text-[#5E5CE6]" />} label="XP Boost"
              value={`+${pet.xpBoostPercent}`} unit="%" color="#5E5CE6" />
          </div>

          <div className="flex items-center gap-2 text-[10px] text-[#8E8E93]">
            <span className="flex items-center gap-1">{archCfg?.icon} {archCfg?.label}</span>
            <span>·</span>
            <span>Pet Level {pet.level}</span>
            <span>·</span>
            <span>Req. Player Lv.{pet.unlockPlayerLevel}</span>
          </div>

          {/* Purchase success animation */}
          <AnimatePresence>
            {justPurchased && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="rounded-[16px] p-4 text-center"
                style={{ background: `linear-gradient(135deg, ${rarityCfg.color}15, ${rarityCfg.color}08)` }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                  <span className="text-4xl">{pet.emoji}</span>
                </motion.div>
                <p className="text-[13px] font-bold text-[#1C1C1E] mt-2">{pet.name} is now yours.</p>
                <p className="text-[11px] text-[#8E8E93]">Equip to start mining ST</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick actions */}
          {!locked && (
            <div className="flex gap-2">
              {onCompare && (
                <button onClick={() => { onCompare(); onClose(); }}
                  className="flex-1 py-2.5 rounded-full bg-[#F2F2F7] text-[11px] font-semibold text-[#636366] flex items-center justify-center gap-1.5">
                  <ArrowRightLeft className="w-3 h-3" /> Compare
                </button>
              )}
              {onSetGoal && (
                <button onClick={onSetGoal}
                  className={cn(
                    "flex-1 py-2.5 rounded-full text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all",
                    isGoal ? "bg-[#FFF8EB] text-[#F59E0B]" : "bg-[#F2F2F7] text-[#636366]"
                  )}>
                  <Target className="w-3 h-3" /> {isGoal ? "Goal Set ✓" : "Set as Goal"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action button - fixed at bottom with safe area */}
        <div className="flex-shrink-0 px-5 pt-3 pb-4" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))" }}>
          {showPurchaseConfirm ? (
            <div className="rounded-[16px] p-4 bg-[#F8F9FA]">
              <p className="text-[12px] font-bold text-[#1C1C1E] text-center mb-3">Adopt {pet.name}?</p>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-[#8E8E93]">Cost</span>
                <span className="font-bold text-[#1C1C1E]">{formatCurrency(pet.priceSt)} ST</span>
              </div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-[#8E8E93]">Your balance</span>
                <span className="font-bold text-[#1C1C1E]">{formatCurrency(balance)} ST</span>
              </div>
              <div className="flex items-center justify-between text-[11px] mb-3 border-t border-[rgba(0,0,0,0.06)] pt-1">
                <span className="text-[#8E8E93]">After</span>
                <span className="font-bold text-[#5E5CE6]">{formatCurrency(balance - pet.priceSt)} ST</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowPurchaseConfirm(false)}
                  className="flex-1 py-2.5 rounded-full bg-[#F2F2F7] text-[11px] font-semibold text-[#636366]">
                  Cancel
                </button>
                <button onClick={handlePurchase} disabled={purchase.isPending}
                  className="flex-1 py-2.5 rounded-full bg-[#5E5CE6] text-[11px] font-semibold text-white disabled:opacity-50"
                  style={{ boxShadow: "0 4px 12px rgba(94,92,230,0.3)" }}>
                  {purchase.isPending ? "Adopting..." : "Adopt"}
                </button>
              </div>
            </div>
          ) : owned ? (
            <button onClick={handleEquip} disabled={unequip.isPending || equip.isPending}
              className={cn(
                "w-full py-3 rounded-full text-[13px] font-bold transition-all active:scale-[0.98]",
                equipped
                  ? "text-white"
                  : "text-white"
              )}
              style={equipped
                ? { background: "linear-gradient(135deg, #EF4444, #DC2626)", boxShadow: "0 4px 16px rgba(239,68,68,0.3)" }
                : { background: "linear-gradient(135deg, #34C759, #30B855)", boxShadow: "0 4px 16px rgba(52,199,89,0.3)" }
              }>
              {equipped ? "UNEQUIP" : "EQUIP"}
            </button>
          ) : locked ? (
            <div className="text-center">
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1 px-2">
                  <span className="text-[10px] font-bold text-[#FF9500]">Lv.{playerLevel} / Lv.{pet.unlockPlayerLevel}</span>
                  <span className="text-[10px] font-semibold text-[#8E8E93]">{Math.round(unlockPct)}%</span>
                </div>
                <div className="h-2 bg-[#F2F2F7] rounded-full overflow-hidden mx-2">
                  <div className="h-full rounded-full bg-[#FF9500]" style={{ width: `${unlockPct}%` }} />
                </div>
              </div>
              <p className="text-[11px] text-[#FF9500] font-semibold mb-2">Reach player level {pet.unlockPlayerLevel} to unlock</p>
              <button onClick={() => { onClose(); router.push("/missions"); }}
                className="w-full py-3 rounded-full bg-[#F2F2F7] text-[13px] font-bold text-[#636366]">
                VIEW MISSIONS
              </button>
            </div>
          ) : (
            <div>
              {affordable ? (
                <button onClick={() => setShowPurchaseConfirm(true)}
                  className="w-full py-3 rounded-full bg-[#5E5CE6] text-[13px] font-bold text-white active:scale-[0.98] transition-transform"
                  style={{ boxShadow: "0 4px 16px rgba(94,92,230,0.3)" }}>
                  ADOPT · {formatCurrency(pet.priceSt)} ST
                </button>
              ) : (
                <div>
                  <p className="text-[11px] text-[#FF9500] font-semibold text-center mb-2">
                    {formatCurrency(pet.priceSt - balance)} ST short
                  </p>
                  <button onClick={() => { onClose(); router.push("/missions"); }}
                    className="w-full py-3 rounded-full bg-[#F2F2F7] text-[13px] font-bold text-[#636366]">
                    EARN MORE ST
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  FEATURED PET CARD                                              */
/* ═══════════════════════════════════════════════════════════════ */

function FeaturedPetCard({
  pet, affordable, onView,
}: {
  pet: PetCatalogItem; affordable: boolean; onView: () => void;
}) {
  const rarityCfg = PET_RARITY_CONFIG[pet.rarity as keyof typeof PET_RARITY_CONFIG] ?? PET_RARITY_CONFIG.common;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] bg-white overflow-hidden relative"
      style={{
        boxShadow: `0 2px 8px ${rarityCfg.color}15, 0 8px 24px ${rarityCfg.color}10`,
        border: `1.5px solid ${rarityCfg.color}25`,
      }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 80% 30%, ${rarityCfg.color}10 0%, transparent 50%)` }} />

      <div className="relative p-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-[16px] flex items-center justify-center flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${pet.assetGradient.split(" → ")[0]}20, ${pet.assetGradient.split(" → ")[1]}20)` }}>
          <span className="text-3xl">{pet.emoji}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-[#F59E0B] uppercase tracking-wider">Featured</span>
            <span className="px-1.5 py-0.5 rounded-md text-[7px] font-bold tracking-wider uppercase"
              style={{ background: rarityCfg.bg, color: rarityCfg.color }}>
              {rarityCfg.label}
            </span>
          </div>
          <p className="text-[14px] font-bold text-[#1C1C1E] mt-0.5">{pet.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-semibold text-[#636366] flex items-center gap-0.5">
              <Pickaxe className="w-2.5 h-2.5 text-[#F59E0B]" /> {pet.miningRatePerMinute} ST/min
            </span>
            <span className="text-[10px] font-semibold text-[#636366] flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5 text-[#5E5CE6]" /> +{pet.xpBoostPercent}% XP
            </span>
          </div>
        </div>

        <button onClick={onView}
          className="px-4 py-2 rounded-full text-[11px] font-bold flex-shrink-0 transition-all active:scale-[0.97]"
          style={{
            background: affordable ? rarityCfg.color : "#F2F2F7",
            color: affordable ? "#FFFFFF" : "#636366",
            boxShadow: affordable ? `0 4px 12px ${rarityCfg.color}30` : undefined,
          }}>
          {affordable ? "VIEW" : formatCurrency(pet.priceSt) + " ST"}
        </button>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  COMPARE PET SHEET                                              */
/* ═══════════════════════════════════════════════════════════════ */

function ComparePetSheet({
  petA, petB, onClose,
}: {
  petA: PetCatalogItem; petB: PetCatalogItem; onClose: () => void;
}) {
  const rA = PET_RARITY_CONFIG[petA.rarity as keyof typeof PET_RARITY_CONFIG] ?? PET_RARITY_CONFIG.common;
  const rB = PET_RARITY_CONFIG[petB.rarity as keyof typeof PET_RARITY_CONFIG] ?? PET_RARITY_CONFIG.common;

  const stats = [
    { label: "Mining Rate", key: "miningRatePerMinute" as const, unit: "ST/min", icon: <Pickaxe className="w-3 h-3 text-[#F59E0B]" />, higher: true },
    { label: "XP Boost", key: "xpBoostPercent" as const, unit: "%", icon: <Zap className="w-3 h-3 text-[#5E5CE6]" />, higher: true, prefix: "+" },
    { label: "Price", key: "priceSt" as const, unit: "ST", icon: null, higher: false },
    { label: "Level Req.", key: "unlockPlayerLevel" as const, unit: "", icon: <Lock className="w-3 h-3 text-[#8E8E93]" />, higher: false },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-end justify-center bg-black/30" onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-[24px] overflow-hidden"
        style={{ maxHeight: "min(85vh, 100% - 64px)" }}>

        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[#1C1C1E]">Compare Pets</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center" aria-label="Close">
            <X className="w-4 h-4 text-[#636366]" />
          </button>
        </div>

        {/* Pet headers */}
        <div className="px-5 grid grid-cols-2 gap-3 mb-4">
          {[{ pet: petA, rarity: rA }, { pet: petB, rarity: rB }].map(({ pet, rarity }) => (
            <div key={pet.id} className="text-center p-3 rounded-[16px]"
              style={{ background: `linear-gradient(135deg, ${pet.assetGradient.split(" → ")[0]}12, ${pet.assetGradient.split(" → ")[1]}12)` }}>
              <span className="text-3xl">{pet.emoji}</span>
              <p className="text-[12px] font-bold text-[#1C1C1E] mt-1">{pet.name}</p>
              <span className="px-1.5 py-0.5 rounded-md text-[7px] font-bold tracking-wider uppercase"
                style={{ background: rarity.bg, color: rarity.color }}>
                {rarity.label}
              </span>
            </div>
          ))}
        </div>

        {/* Stat comparison */}
        <div className="px-5 space-y-2 pb-6">
          {stats.map((s) => {
            const valA = petA[s.key];
            const valB = petB[s.key];
            const aWins = s.higher ? valA > valB : valA < valB;
            const bWins = s.higher ? valB > valA : valB < valA;
            return (
              <div key={s.key} className="grid grid-cols-3 gap-2 items-center">
                <div className={cn("text-right text-[12px] font-bold tabular-nums", aWins ? "text-[#34C759]" : "text-[#1C1C1E]")}>
                  {s.prefix ?? ""}{typeof valA === "number" ? (s.key === "miningRatePerMinute" ? valA.toFixed(1) : valA) : valA}
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-[#8E8E93] uppercase">
                    {s.icon} {s.label}
                  </div>
                </div>
                <div className={cn("text-left text-[12px] font-bold tabular-nums", bWins ? "text-[#34C759]" : "text-[#1C1C1E]")}>
                  {s.prefix ?? ""}{typeof valB === "number" ? (s.key === "miningRatePerMinute" ? valB.toFixed(1) : valB) : valB}
                </div>
              </div>
            );
          })}

          {/* Archetype comparison */}
          <div className="grid grid-cols-3 gap-2 items-center pt-2">
            <div className="text-right text-[11px] font-semibold text-[#636366]">
              {PET_ARCHETYPE_CONFIG[petA.archetype as keyof typeof PET_ARCHETYPE_CONFIG]?.icon} {PET_ARCHETYPE_CONFIG[petA.archetype as keyof typeof PET_ARCHETYPE_CONFIG]?.label}
            </div>
            <div className="text-center text-[9px] font-bold text-[#8E8E93] uppercase">Type</div>
            <div className="text-left text-[11px] font-semibold text-[#636366]">
              {PET_ARCHETYPE_CONFIG[petB.archetype as keyof typeof PET_ARCHETYPE_CONFIG]?.icon} {PET_ARCHETYPE_CONFIG[petB.archetype as keyof typeof PET_ARCHETYPE_CONFIG]?.label}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Stat Card sub-component ── */

function StatCard({ icon, label, value, unit, color = "#5E5CE6" }: { icon: React.ReactNode; label: string; value: string; unit: string; color?: string }) {
  const numVal = parseFloat(value);
  const maxVal = label === "Mining" ? 6 : 15;
  const pct = Math.min(100, (numVal / maxVal) * 100);

  return (
    <div className="rounded-[14px] p-3 bg-[#F8F9FA]">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[10px] font-bold text-[#8E8E93] uppercase">{label}</span>
      </div>
      <p className="text-[16px] font-bold text-[#1C1C1E] tabular-nums">{value} <span className="text-[10px] font-semibold text-[#8E8E93]">{unit}</span></p>
      {/* Animated stat bar */}
      <div className="mt-2 h-1 bg-[#E5E5EA] rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="h-full rounded-full" style={{ background: color }}
        />
      </div>
    </div>
  );
}
