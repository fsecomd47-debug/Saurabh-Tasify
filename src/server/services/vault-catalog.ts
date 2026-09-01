/**
 * PDR-6 Feature-1: THE VAULT — Catalog Service
 * Manages the 200+ item catalog with collections, featured items, and sections.
 */

import type {
  VaultItem,
  VaultItemType,
  ItemRarity,
  Collection,
  VaultCatalog,
  VaultSection,
  StoreFilter,
  StoreSort,
} from "../../types/vault";

// ============================================================================
// Static Catalog Data (200+ items)
// ============================================================================

const CATALOG_ITEMS: VaultItem[] = [
  // ──────────────────── PETS (30) ────────────────────
  { id: "pet-wolf", name: "Wolf", description: "Loyal companion with keen instincts.", type: "pet", rarity: "common", price: 800, previewAsset: "/assets/pets/wolf.jpg", status: "active", featured: false, metadata: {}, abilities: [{ type: "pet_xp", value: 0.02, stackingGroup: "pet_xp", maxGroupBonus: 0.10, description: "+2% Pet XP" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-cat", name: "Shadow Cat", description: "Graceful and independent.", type: "pet", rarity: "common", price: 600, previewAsset: "/assets/pets/cat.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-hawk", name: "Hawk", description: "Sharp-eyed aerial scout.", type: "pet", rarity: "uncommon", price: 1200, previewAsset: "/assets/pets/hawk.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-fox", name: "Arctic Fox", description: "Clever and swift.", type: "pet", rarity: "uncommon", price: 1500, previewAsset: "/assets/pets/fox.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-owl", name: "Night Owl", description: "Wise beyond its years.", type: "pet", rarity: "uncommon", price: 1400, previewAsset: "/assets/pets/owl.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-rabbit", name: "Shadow Rabbit", description: "Quick and elusive.", type: "pet", rarity: "common", price: 500, previewAsset: "/assets/pets/rabbit.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-snake", name: "Viper", description: "Silent and deadly.", type: "pet", rarity: "rare", price: 2500, previewAsset: "/assets/pets/snake.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-bear", name: "Grizzly", description: "Powerful protector.", type: "pet", rarity: "rare", price: 3000, previewAsset: "/assets/pets/bear.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-eagle", name: "Golden Eagle", description: "Majestic predator of the skies.", type: "pet", rarity: "rare", price: 3500, previewAsset: "/assets/pets/eagle.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-panther", name: "Shadow Panther", description: "Silent hunter of the night.", type: "pet", rarity: "epic", price: 5000, previewAsset: "/assets/pets/panther.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-dragon", name: "Baby Dragon", description: "Small but fierce.", type: "pet", rarity: "epic", price: 6000, previewAsset: "/assets/pets/dragon.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-phoenix", name: "Phoenix", description: "Rises from the ashes.", type: "pet", rarity: "legendary", price: 10000, previewAsset: "/assets/pets/phoenix.jpg", status: "active", featured: true, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-unicorn", name: "Celestial Unicorn", description: "Magical being of pure light.", type: "pet", rarity: "legendary", price: 12000, previewAsset: "/assets/pets/unicorn.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-griffin", name: "Griffin", description: "Majestic hybrid of eagle and lion.", type: "pet", rarity: "legendary", price: 15000, previewAsset: "/assets/pets/griffin.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-kraken", name: "Baby Kraken", description: "Terror of the deep.", type: "pet", rarity: "mythic", price: 25000, previewAsset: "/assets/pets/kraken.jpg", status: "active", featured: true, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-leviathan", name: "Leviathan", description: "Ancient sea monster.", type: "pet", rarity: "mythic", price: 30000, previewAsset: "/assets/pets/leviathan.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-manticore", name: "Manticore", description: "Lion body, scorpion tail.", type: "pet", rarity: "epic", price: 7000, previewAsset: "/assets/pets/manticore.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-chimera", name: "Chimera", description: "Fire-breathing hybrid.", type: "pet", rarity: "epic", price: 8000, previewAsset: "/assets/pets/chimera.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-penguin", name: "Penguin", description: "Adorable waddler.", type: "pet", rarity: "common", price: 400, previewAsset: "/assets/pets/penguin.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-panda", name: "Panda", description: "Gentle giant.", type: "pet", rarity: "uncommon", price: 1800, previewAsset: "/assets/pets/panda.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-tiger", name: "Bengal Tiger", description: "Striped royalty.", type: "pet", rarity: "rare", price: 4000, previewAsset: "/assets/pets/tiger.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-lion", name: "African Lion", description: "King of beasts.", type: "pet", rarity: "legendary", price: 11000, previewAsset: "/assets/pets/lion.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-robot-dog", name: "Robo Dog", description: "Cybernetic companion.", type: "pet", rarity: "rare", price: 2800, previewAsset: "/assets/pets/robot-dog.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-ghost", name: "Ghost", description: "Ethereal protector.", type: "pet", rarity: "epic", price: 5500, previewAsset: "/assets/pets/ghost.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-fairy", name: "Fairy", description: "Sparkle dust trail.", type: "pet", rarity: "uncommon", price: 1600, previewAsset: "/assets/pets/fairy.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-golem", name: "Stone Golem", description: "Unbreakable guardian.", type: "pet", rarity: "rare", price: 3200, previewAsset: "/assets/pets/golem.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-wisp", name: "Will-o-Wisp", description: "Mysterious guiding light.", type: "pet", rarity: "uncommon", price: 1300, previewAsset: "/assets/pets/wisp.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-cerberus", name: "Cerberus", description: "Three-headed guardian.", type: "pet", rarity: "mythic", price: 28000, previewAsset: "/assets/pets/cerberus.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-sphinx", name: "Sphinx", description: "Guardian of secrets.", type: "pet", rarity: "legendary", price: 14000, previewAsset: "/assets/pets/sphinx.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "pet-turtle", name: "Ancient Turtle", description: "Wise and enduring.", type: "pet", rarity: "uncommon", price: 1100, previewAsset: "/assets/pets/turtle.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },

  // ──────────────────── CARS (35) ────────────────────
  { id: "car-pulse", name: "Pulse X", description: "Electric street racer.", type: "car", rarity: "common", price: 2000, previewAsset: "/assets/cars/pulse-x.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-drift", name: "Drift S", description: "Precision cornering.", type: "car", rarity: "common", price: 2500, previewAsset: "/assets/cars/drift-s.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-volt", name: "Volt R", description: "Pure electric power.", type: "car", rarity: "uncommon", price: 4000, previewAsset: "/assets/cars/volt-r.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-apex", name: "Apex", description: "Track-focused weapon.", type: "car", rarity: "uncommon", price: 4500, previewAsset: "/assets/cars/apex.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-shadow", name: "Shadow RS", description: "Silent assassin.", type: "car", rarity: "rare", price: 7000, previewAsset: "/assets/cars/shadow-rs.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-blaze", name: "Blaze GT", description: "Fire on four wheels.", type: "car", rarity: "rare", price: 8000, previewAsset: "/assets/cars/blaze-gt.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-thunder", name: "Thunderbolt", description: "Lightning fast.", type: "car", rarity: "epic", price: 12000, previewAsset: "/assets/cars/thunderbolt.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-aurora", name: "Aurora GT", description: "Northern lights on asphalt.", type: "car", rarity: "epic", price: 14000, previewAsset: "/assets/cars/aurora-gt.jpg", status: "active", featured: true, metadata: {}, abilities: [{ type: "mission_xp", value: 0.05, stackingGroup: "vehicle_xp", maxGroupBonus: 0.10, description: "+5% Mission XP" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "car-vortex", name: "Vortex GT", description: "Tornado in a bottle.", type: "car", rarity: "rare", price: 7500, previewAsset: "/assets/cars/vortex-gt.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-titan", name: "Titan R", description: "Unstoppable force.", type: "car", rarity: "epic", price: 15000, previewAsset: "/assets/cars/titan-r.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-phantom", name: "Phantom X", description: "Ghost on the highway.", type: "car", rarity: "legendary", price: 22000, previewAsset: "/assets/cars/phantom-x.jpg", status: "active", featured: true, metadata: {}, abilities: [{ type: "mission_xp", value: 0.08, stackingGroup: "vehicle_xp", maxGroupBonus: 0.10, description: "+8% Mission XP" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "car-nebula", name: "Nebula R1", description: "Cosmic speed machine.", type: "car", rarity: "legendary", price: 25000, previewAsset: "/assets/cars/nebula-r1.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-infinity", name: "Infinity", description: "Beyond limits.", type: "car", rarity: "mythic", price: 40000, previewAsset: "/assets/cars/infinity.jpg", status: "active", featured: true, metadata: {}, abilities: [{ type: "mission_xp", value: 0.10, stackingGroup: "vehicle_xp", maxGroupBonus: 0.10, description: "+10% Mission XP" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "car-zero", name: "Zero GS", description: "Zero to sixty in nothing.", type: "car", rarity: "common", price: 1500, previewAsset: "/assets/cars/zero-gs.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-flux", name: "Flux", description: "Time-bending acceleration.", type: "car", rarity: "uncommon", price: 3800, previewAsset: "/assets/cars/flux.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-nova", name: "Nova", description: "Stellar performance.", type: "car", rarity: "rare", price: 6500, previewAsset: "/assets/cars/nova.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-quake", name: "Quake", description: "Earth-shaking power.", type: "car", rarity: "uncommon", price: 4200, previewAsset: "/assets/cars/quake.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-blitz", name: "Blitz", description: "Lightning strike.", type: "car", rarity: "rare", price: 7200, previewAsset: "/assets/cars/blitz.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-storm", name: "Storm Chaser", description: "Rides the lightning.", type: "car", rarity: "epic", price: 13000, previewAsset: "/assets/cars/storm-chaser.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-crimson", name: "Crimson Fury", description: "Blood red fury.", type: "car", rarity: "legendary", price: 20000, previewAsset: "/assets/cars/crimson-fury.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-onyx", name: "Onyx", description: "Dark as midnight.", type: "car", rarity: "common", price: 1800, previewAsset: "/assets/cars/onyx.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-frost", name: "Frost Bite", description: "Cold as ice.", type: "car", rarity: "uncommon", price: 3500, previewAsset: "/assets/cars/frost-bite.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-solar", name: "Solar Flare", description: "Blinding speed.", type: "car", rarity: "rare", price: 8500, previewAsset: "/assets/cars/solar-flare.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-quantum", name: "Quantum", description: "Exists everywhere at once.", type: "car", rarity: "mythic", price: 45000, previewAsset: "/assets/cars/quantum.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-pulse-ev", name: "Pulse EV", description: "Electric evolution.", type: "car", rarity: "common", price: 2200, previewAsset: "/assets/cars/pulse-ev.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-raptor", name: "Raptor", description: "Apex predator.", type: "car", rarity: "uncommon", price: 4800, previewAsset: "/assets/cars/raptor.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-sentinel", name: "Sentinel", description: "Guardian of the road.", type: "car", rarity: "rare", price: 6800, previewAsset: "/assets/cars/sentinel.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-wraith", name: "Wraith", description: "Silent death.", type: "car", rarity: "epic", price: 16000, previewAsset: "/assets/cars/wraith.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-apollo", name: "Apollo", description: "Sun god's chariot.", type: "car", rarity: "legendary", price: 28000, previewAsset: "/assets/cars/apollo.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-hellcat", name: "Hellcat", description: "Pure American muscle.", type: "car", rarity: "rare", price: 9000, previewAsset: "/assets/cars/hellcat.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-demon", name: "Demon", description: "Forged in hellfire.", type: "car", rarity: "legendary", price: 24000, previewAsset: "/assets/cars/demon.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-ghost-rider", name: "Ghost Rider", description: "Flaming wheels.", type: "car", rarity: "mythic", price: 50000, previewAsset: "/assets/cars/ghost-rider.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-spark", name: "Spark", description: "Small but electric.", type: "car", rarity: "common", price: 1200, previewAsset: "/assets/cars/spark.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "car-rush", name: "Rush", description: "Adrenaline on wheels.", type: "car", rarity: "uncommon", price: 3200, previewAsset: "/assets/cars/rush.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },

  // ──────────────────── SUPERBIKES (25) ────────────────────
  { id: "bike-pulse", name: "Pulse 600", description: "Entry-level sport bike.", type: "superbike", rarity: "common", price: 1800, previewAsset: "/assets/bikes/pulse-600.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-blade", name: "Blade S", description: "Sharp handling.", type: "superbike", rarity: "common", price: 2000, previewAsset: "/assets/bikes/blade-s.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-venom", name: "Venom", description: "Deadly acceleration.", type: "superbike", rarity: "uncommon", price: 3500, previewAsset: "/assets/bikes/venom.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-fury", name: "Fury X", description: "Raw power.", type: "superbike", rarity: "uncommon", price: 4000, previewAsset: "/assets/bikes/fury-x.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-spectre", name: "Spectre", description: "Ghostly speed.", type: "superbike", rarity: "rare", price: 6000, previewAsset: "/assets/bikes/spectre.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-raptor", name: "Raptor 1000", description: "Apex predator.", type: "superbike", rarity: "rare", price: 7000, previewAsset: "/assets/bikes/raptor-1000.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-vortex", name: "Vortex S", description: "Tornado twist.", type: "superbike", rarity: "rare", price: 7500, previewAsset: "/assets/bikes/vortex-s.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-thunder", name: "Thunder 1200", description: "Lightning strike.", type: "superbike", rarity: "epic", price: 11000, previewAsset: "/assets/bikes/thunder-1200.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-nebula", name: "Nebula R1", description: "Cosmic superbike.", type: "superbike", rarity: "epic", price: 14000, previewAsset: "/assets/bikes/nebula-r1.jpg", status: "active", featured: true, metadata: {}, abilities: [{ type: "mission_xp", value: 0.06, stackingGroup: "vehicle_xp", maxGroupBonus: 0.10, description: "+6% Mission XP" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-phantom", name: "Phantom S", description: "Silent assassin.", type: "superbike", rarity: "epic", price: 15000, previewAsset: "/assets/bikes/phantom-s.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-infinity", name: "Infinity Blade", description: "Beyond limits.", type: "superbike", rarity: "legendary", price: 22000, previewAsset: "/assets/bikes/infinity-blade.jpg", status: "active", featured: true, metadata: {}, abilities: [{ type: "mission_xp", value: 0.08, stackingGroup: "vehicle_xp", maxGroupBonus: 0.10, description: "+8% Mission XP" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-quantum", name: "Quantum Rush", description: "Time-bending speed.", type: "superbike", rarity: "mythic", price: 35000, previewAsset: "/assets/bikes/quantum-rush.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-flux", name: "Flux 600", description: "Electric street fighter.", type: "superbike", rarity: "common", price: 1500, previewAsset: "/assets/bikes/flux-600.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-shadow", name: "Shadow 750", description: "Darkness rides.", type: "superbike", rarity: "uncommon", price: 3800, previewAsset: "/assets/bikes/shadow-750.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-blitz", name: "Blitz", description: "Lightning fast.", type: "superbike", rarity: "rare", price: 6500, previewAsset: "/assets/bikes/blitz.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-crimson", name: "Crimson Blaze", description: "Fire on two wheels.", type: "superbike", rarity: "epic", price: 13000, previewAsset: "/assets/bikes/crimson-blaze.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-aurora", name: "Aurora", description: "Northern lights.", type: "superbike", rarity: "legendary", price: 20000, previewAsset: "/assets/bikes/aurora.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-demon", name: "Demon 1000", description: "Hell's machine.", type: "superbike", rarity: "legendary", price: 25000, previewAsset: "/assets/bikes/demon-1000.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-storm", name: "Storm", description: "Rides the lightning.", type: "superbike", rarity: "uncommon", price: 3200, previewAsset: "/assets/bikes/storm.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-rush", name: "Rush 500", description: "Adrenaline pump.", type: "superbike", rarity: "common", price: 1600, previewAsset: "/assets/bikes/rush-500.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-apex", name: "Apex 1000", description: "Track weapon.", type: "superbike", rarity: "rare", price: 8000, previewAsset: "/assets/bikes/apex-1000.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-viper", name: "Viper", description: "Strikes fast.", type: "superbike", rarity: "uncommon", price: 3000, previewAsset: "/assets/bikes/viper.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-ghost", name: "Ghost Rider", description: "Undead speed.", type: "superbike", rarity: "mythic", price: 40000, previewAsset: "/assets/bikes/ghost-rider.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-titan", name: "Titan", description: "Heavyweight champion.", type: "superbike", rarity: "epic", price: 12000, previewAsset: "/assets/bikes/titan.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "bike-nova", name: "Nova", description: "Stellar performance.", type: "superbike", rarity: "common", price: 1400, previewAsset: "/assets/bikes/nova.jpg", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },

  // ──────────────────── FRAMES (25) ────────────────────
  { id: "frame-steel", name: "Steel Frame", description: "Industrial strength.", type: "frame", rarity: "common", price: 300, previewAsset: "/assets/frames/steel.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-neon", name: "Neon Glow", description: "Electric vibes.", type: "frame", rarity: "common", price: 400, previewAsset: "/assets/frames/neon.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-gold", name: "Golden Frame", description: "Shining bright.", type: "frame", rarity: "uncommon", price: 1200, previewAsset: "/assets/frames/gold.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-crystal", name: "Crystal", description: "Pure and clear.", type: "frame", rarity: "uncommon", price: 1500, previewAsset: "/assets/frames/crystal.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-flame", name: "Flame Frame", description: "Burning passion.", type: "frame", rarity: "rare", price: 2500, previewAsset: "/assets/frames/flame.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-ice", name: "Frozen Frame", description: "Cold as ice.", type: "frame", rarity: "rare", price: 2800, previewAsset: "/assets/frames/ice.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-shadow", name: "Shadow Frame", description: "Dark elegance.", type: "frame", rarity: "rare", price: 3000, previewAsset: "/assets/frames/shadow.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-lightning", name: "Lightning", description: "Electric energy.", type: "frame", rarity: "epic", price: 4500, previewAsset: "/assets/frames/lightning.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-nebula", name: "Nebula Frame", description: "Cosmic dust.", type: "frame", rarity: "epic", price: 5000, previewAsset: "/assets/frames/nebula.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-phoenix", name: "Phoenix Frame", description: "Rising from ashes.", type: "frame", rarity: "legendary", price: 8000, previewAsset: "/assets/frames/phoenix.png", status: "active", featured: true, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-dragon", name: "Dragon Frame", description: "Ancient power.", type: "frame", rarity: "legendary", price: 9000, previewAsset: "/assets/frames/dragon.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-void", name: "Void Frame", description: "Beyond reality.", type: "frame", rarity: "mythic", price: 15000, previewAsset: "/assets/frames/void.png", status: "active", featured: true, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-cherry", name: "Cherry Blossom", description: "Delicate beauty.", type: "frame", rarity: "uncommon", price: 1100, previewAsset: "/assets/frames/cherry.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-ocean", name: "Ocean Wave", description: "Deep blue.", type: "frame", rarity: "uncommon", price: 1300, previewAsset: "/assets/frames/ocean.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-forest", name: "Forest Frame", description: "Nature's embrace.", type: "frame", rarity: "common", price: 500, previewAsset: "/assets/frames/forest.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-sunset", name: "Sunset Glow", description: "Golden hour.", type: "frame", rarity: "common", price: 350, previewAsset: "/assets/frames/sunset.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-royal", name: "Royal Frame", description: "Regal elegance.", type: "frame", rarity: "rare", price: 3500, previewAsset: "/assets/frames/royal.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-cosmic", name: "Cosmic Frame", description: "Stars and galaxies.", type: "frame", rarity: "epic", price: 5500, previewAsset: "/assets/frames/cosmic.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-aurora", name: "Aurora Frame", description: "Northern lights.", type: "frame", rarity: "legendary", price: 10000, previewAsset: "/assets/frames/aurora.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-mystic", name: "Mystic Frame", description: "Magical energy.", type: "frame", rarity: "rare", price: 2200, previewAsset: "/assets/frames/mystic.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-vintage", name: "Vintage", description: "Classic charm.", type: "frame", rarity: "common", price: 250, previewAsset: "/assets/frames/vintage.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-modern", name: "Modern Minimal", description: "Clean lines.", type: "frame", rarity: "common", price: 200, previewAsset: "/assets/frames/modern.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-pixel", name: "Pixel Frame", description: "Retro gaming.", type: "frame", rarity: "uncommon", price: 900, previewAsset: "/assets/frames/pixel.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-cyber", name: "Cyber Frame", description: "Future tech.", type: "frame", rarity: "rare", price: 3200, previewAsset: "/assets/frames/cyber.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "frame-infinity", name: "Infinity Frame", description: "Endless possibilities.", type: "frame", rarity: "mythic", price: 18000, previewAsset: "/assets/frames/infinity.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },

  // ──────────────────── TITLES (20) ────────────────────
  { id: "title-vault-runner", name: "Vault Runner", description: "First steps into the Vault.", type: "title", rarity: "common", price: 200, previewAsset: "/assets/titles/vault-runner.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-mission-master", name: "Mission Master", description: "Completed 50 missions.", type: "title", rarity: "uncommon", price: 800, previewAsset: "/assets/titles/mission-master.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-wealth-builder", name: "Wealth Builder", description: "Accumulated serious ST.", type: "title", rarity: "rare", price: 2000, previewAsset: "/assets/titles/wealth-builder.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-pet-tamer", name: "Pet Tamer", description: "Master of companions.", type: "title", rarity: "rare", price: 2500, previewAsset: "/assets/titles/pet-tamer.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-garage-king", name: "Garage King", description: "Collector of vehicles.", type: "title", rarity: "epic", price: 5000, previewAsset: "/assets/titles/garage-king.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-vault-master", name: "Vault Master", description: "Collected everything.", type: "title", rarity: "mythic", price: 25000, previewAsset: "/assets/titles/vault-master.png", status: "active", featured: true, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-speed-demon", name: "Speed Demon", description: "Faster than lightning.", type: "title", rarity: "rare", price: 2200, previewAsset: "/assets/titles/speed-demon.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-shadow", name: "Shadow", description: "Silent and deadly.", type: "title", rarity: "uncommon", price: 1000, previewAsset: "/assets/titles/shadow.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-legend", name: "Legend", description: "Legendary status.", type: "title", rarity: "legendary", price: 12000, previewAsset: "/assets/titles/legend.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-pioneer", name: "Pioneer", description: "First to explore.", type: "title", rarity: "common", price: 300, previewAsset: "/assets/titles/pioneer.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-warrior", name: "Warrior", description: "Battle-hardened.", type: "title", rarity: "uncommon", price: 900, previewAsset: "/assets/titles/warrior.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-sage", name: "Sage", description: "Wise beyond years.", type: "title", rarity: "rare", price: 1800, previewAsset: "/assets/titles/sage.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-titan", name: "Titan", description: "Unstoppable force.", type: "title", rarity: "epic", price: 4000, previewAsset: "/assets/titles/titan.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-nova", name: "Nova", description: "Bright star.", type: "title", rarity: "common", price: 250, previewAsset: "/assets/titles/nova.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-phantom", name: "Phantom", description: "Ghost in the machine.", type: "title", rarity: "rare", price: 2800, previewAsset: "/assets/titles/phantom.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-crimson", name: "Crimson", description: "Blood red determination.", type: "title", rarity: "uncommon", price: 1200, previewAsset: "/assets/titles/crimson.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-aurora", name: "Aurora", description: "Northern lights guide.", type: "title", rarity: "legendary", price: 10000, previewAsset: "/assets/titles/aurora.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-quantum", name: "Quantum", description: "Exists everywhere.", type: "title", rarity: "mythic", price: 20000, previewAsset: "/assets/titles/quantum.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-rookie", name: "Rookie", description: "Just getting started.", type: "title", rarity: "common", price: 100, previewAsset: "/assets/titles/rookie.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "title-veteran", name: "Veteran", description: "Seasoned player.", type: "title", rarity: "uncommon", price: 1500, previewAsset: "/assets/titles/veteran.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },

  // ──────────────────── BADGES (20) ────────────────────
  { id: "badge-first-purchase", name: "First Purchase", description: "Made your first Vault purchase.", type: "badge", rarity: "common", price: 0, previewAsset: "/assets/badges/first-purchase.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-first-car", name: "First Car", description: "Added your first car.", type: "badge", rarity: "common", price: 0, previewAsset: "/assets/badges/first-car.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-first-pet", name: "First Pet", description: "Adopted your first companion.", type: "badge", rarity: "common", price: 0, previewAsset: "/assets/badges/first-pet.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-collector", name: "Collector", description: "Owned 25 items.", type: "badge", rarity: "uncommon", price: 0, previewAsset: "/assets/badges/collector.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-hoarder", name: "Hoarder", description: "Owned 50 items.", type: "badge", rarity: "rare", price: 0, previewAsset: "/assets/badges/hoarder.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-curator", name: "Curator", description: "Owned 100 items.", type: "badge", rarity: "epic", price: 0, previewAsset: "/assets/badges/curator.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-legend", name: "Legend", description: "Owned 150 items.", type: "badge", rarity: "legendary", price: 0, previewAsset: "/assets/badges/legend.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-vault-master", name: "Vault Master", description: "Owned all standard items.", type: "badge", rarity: "mythic", price: 0, previewAsset: "/assets/badges/vault-master.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-speed-king", name: "Speed King", description: "Collected all superbikes.", type: "badge", rarity: "epic", price: 0, previewAsset: "/assets/badges/speed-king.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-garage-master", name: "Garage Master", description: "Collected all cars.", type: "badge", rarity: "epic", price: 0, previewAsset: "/assets/badges/garage-master.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-pet-paradise", name: "Pet Paradise", description: "Collected all pets.", type: "badge", rarity: "epic", price: 0, previewAsset: "/assets/badges/pet-paradise.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-fashionista", name: "Fashionista", description: "Collected all frames.", type: "badge", rarity: "rare", price: 0, previewAsset: "/assets/badges/fashionista.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-wordsmith", name: "Wordsmith", description: "Collected all titles.", type: "badge", rarity: "rare", price: 0, previewAsset: "/assets/badges/wordsmith.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-big-spender", name: "Big Spender", description: "Spent 100,000 ST.", type: "badge", rarity: "legendary", price: 0, previewAsset: "/assets/badges/big-spender.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-wishlist-master", name: "Wishlist Master", description: "Wishlisted 10 items.", type: "badge", rarity: "common", price: 0, previewAsset: "/assets/badges/wishlist-master.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-goal-setter", name: "Goal Setter", description: "Set your first item goal.", type: "badge", rarity: "common", price: 0, previewAsset: "/assets/badges/goal-setter.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-achieved", name: "Achieved", description: "Completed your first goal.", type: "badge", rarity: "uncommon", price: 0, previewAsset: "/assets/badges/achieved.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-loyal", name: "Loyal", description: "30-day streak.", type: "badge", rarity: "rare", price: 0, previewAsset: "/assets/badges/loyal.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-dedicated", name: "Dedicated", description: "90-day streak.", type: "badge", rarity: "epic", price: 0, previewAsset: "/assets/badges/dedicated.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "badge-devoted", name: "Devoted", description: "365-day streak.", type: "badge", rarity: "legendary", price: 0, previewAsset: "/assets/badges/devoted.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },

  // ──────────────────── BOOSTS (20) ────────────────────
  { id: "boost-xp-30m", name: "XP Boost 30m", description: "+10% XP for 30 minutes.", type: "boost", rarity: "common", price: 500, previewAsset: "/assets/boosts/xp-30m.png", status: "active", featured: false, metadata: { durationMs: 1800000 }, abilities: [{ type: "mission_xp", value: 0.10, stackingGroup: "xp_boost", maxGroupBonus: 0.20, description: "+10% Mission XP" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-xp-1h", name: "XP Boost 1h", description: "+10% XP for 1 hour.", type: "boost", rarity: "uncommon", price: 900, previewAsset: "/assets/boosts/xp-1h.png", status: "active", featured: false, metadata: { durationMs: 3600000 }, abilities: [{ type: "mission_xp", value: 0.10, stackingGroup: "xp_boost", maxGroupBonus: 0.20, description: "+10% Mission XP" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-st-30m", name: "ST Boost 30m", description: "+5% ST for 30 minutes.", type: "boost", rarity: "uncommon", price: 600, previewAsset: "/assets/boosts/st-30m.png", status: "active", featured: false, metadata: { durationMs: 1800000 }, abilities: [{ type: "st_bonus", value: 0.05, stackingGroup: "st_boost", maxGroupBonus: 0.10, description: "+5% ST Bonus" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-st-1h", name: "ST Boost 1h", description: "+5% ST for 1 hour.", type: "boost", rarity: "rare", price: 1100, previewAsset: "/assets/boosts/st-1h.png", status: "active", featured: false, metadata: { durationMs: 3600000 }, abilities: [{ type: "st_bonus", value: 0.05, stackingGroup: "st_boost", maxGroupBonus: 0.10, description: "+5% ST Bonus" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-pet-xp-30m", name: "Pet XP 30m", description: "+15% Pet XP for 30 minutes.", type: "boost", rarity: "uncommon", price: 700, previewAsset: "/assets/boosts/pet-xp-30m.png", status: "active", featured: false, metadata: { durationMs: 1800000 }, abilities: [{ type: "pet_xp", value: 0.15, stackingGroup: "pet_boost", maxGroupBonus: 0.25, description: "+15% Pet XP" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-pet-xp-1h", name: "Pet XP 1h", description: "+15% Pet XP for 1 hour.", type: "boost", rarity: "rare", price: 1200, previewAsset: "/assets/boosts/pet-xp-1h.png", status: "active", featured: false, metadata: { durationMs: 3600000 }, abilities: [{ type: "pet_xp", value: 0.15, stackingGroup: "pet_boost", maxGroupBonus: 0.25, description: "+15% Pet XP" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-quest-30m", name: "Quest Boost 30m", description: "+10% Quest progress for 30 minutes.", type: "boost", rarity: "rare", price: 1000, previewAsset: "/assets/boosts/quest-30m.png", status: "active", featured: false, metadata: { durationMs: 1800000 }, abilities: [{ type: "quest_xp", value: 0.10, stackingGroup: "quest_boost", maxGroupBonus: 0.20, description: "+10% Quest Progress" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-quest-1h", name: "Quest Boost 1h", description: "+10% Quest progress for 1 hour.", type: "boost", rarity: "epic", price: 1800, previewAsset: "/assets/boosts/quest-1h.png", status: "active", featured: false, metadata: { durationMs: 3600000 }, abilities: [{ type: "quest_xp", value: 0.10, stackingGroup: "quest_boost", maxGroupBonus: 0.20, description: "+10% Quest Progress" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-collection-30m", name: "Collection Boost 30m", description: "+5% collection bonus for 30 minutes.", type: "boost", rarity: "rare", price: 800, previewAsset: "/assets/boosts/collection-30m.png", status: "active", featured: false, metadata: { durationMs: 1800000 }, abilities: [{ type: "collection_bonus", value: 0.05, stackingGroup: "collection_boost", maxGroupBonus: 0.10, description: "+5% Collection Bonus" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-collection-1h", name: "Collection Boost 1h", description: "+5% collection bonus for 1 hour.", type: "boost", rarity: "epic", price: 1500, previewAsset: "/assets/boosts/collection-1h.png", status: "active", featured: false, metadata: { durationMs: 3600000 }, abilities: [{ type: "collection_bonus", value: 0.05, stackingGroup: "collection_boost", maxGroupBonus: 0.10, description: "+5% Collection Bonus" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-xp-2h", name: "XP Boost 2h", description: "+15% XP for 2 hours.", type: "boost", rarity: "rare", price: 1600, previewAsset: "/assets/boosts/xp-2h.png", status: "active", featured: false, metadata: { durationMs: 7200000 }, abilities: [{ type: "mission_xp", value: 0.15, stackingGroup: "xp_boost", maxGroupBonus: 0.20, description: "+15% Mission XP" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-st-2h", name: "ST Boost 2h", description: "+8% ST for 2 hours.", type: "boost", rarity: "epic", price: 1900, previewAsset: "/assets/boosts/st-2h.png", status: "active", featured: false, metadata: { durationMs: 7200000 }, abilities: [{ type: "st_bonus", value: 0.08, stackingGroup: "st_boost", maxGroupBonus: 0.10, description: "+8% ST Bonus" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-pet-xp-2h", name: "Pet XP 2h", description: "+20% Pet XP for 2 hours.", type: "boost", rarity: "epic", price: 2000, previewAsset: "/assets/boosts/pet-xp-2h.png", status: "active", featured: false, metadata: { durationMs: 7200000 }, abilities: [{ type: "pet_xp", value: 0.20, stackingGroup: "pet_boost", maxGroupBonus: 0.25, description: "+20% Pet XP" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-quest-2h", name: "Quest Boost 2h", description: "+15% Quest progress for 2 hours.", type: "boost", rarity: "legendary", price: 3000, previewAsset: "/assets/boosts/quest-2h.png", status: "active", featured: false, metadata: { durationMs: 7200000 }, abilities: [{ type: "quest_xp", value: 0.15, stackingGroup: "quest_boost", maxGroupBonus: 0.20, description: "+15% Quest Progress" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-all-30m", name: "Mega Boost 30m", description: "+5% to all bonuses for 30 minutes.", type: "boost", rarity: "legendary", price: 2500, previewAsset: "/assets/boosts/mega-30m.png", status: "active", featured: true, metadata: { durationMs: 1800000 }, abilities: [{ type: "mission_xp", value: 0.05, stackingGroup: "mega_boost", maxGroupBonus: 0.10, description: "+5% All Bonuses" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-all-1h", name: "Mega Boost 1h", description: "+5% to all bonuses for 1 hour.", type: "boost", rarity: "legendary", price: 4500, previewAsset: "/assets/boosts/mega-1h.png", status: "active", featured: false, metadata: { durationMs: 3600000 }, abilities: [{ type: "mission_xp", value: 0.05, stackingGroup: "mega_boost", maxGroupBonus: 0.10, description: "+5% All Bonuses" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-streak-30m", name: "Streak Shield 30m", description: "Protect your streak for 30 minutes.", type: "boost", rarity: "rare", price: 1500, previewAsset: "/assets/boosts/streak-30m.png", status: "active", featured: false, metadata: { durationMs: 1800000 }, abilities: [{ type: "streak_support", value: 1, stackingGroup: "streak_shield", maxGroupBonus: 1, description: "Streak Protection" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-streak-1h", name: "Streak Shield 1h", description: "Protect your streak for 1 hour.", type: "boost", rarity: "epic", price: 2800, previewAsset: "/assets/boosts/streak-1h.png", status: "active", featured: false, metadata: { durationMs: 3600000 }, abilities: [{ type: "streak_support", value: 1, stackingGroup: "streak_shield", maxGroupBonus: 1, description: "Streak Protection" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-cooldown-30m", name: "Cooldown Reduction 30m", description: "-20% cooldown for 30 minutes.", type: "boost", rarity: "uncommon", price: 800, previewAsset: "/assets/boosts/cooldown-30m.png", status: "active", featured: false, metadata: { durationMs: 1800000 }, abilities: [{ type: "cooldown_reduction", value: 0.20, stackingGroup: "cooldown_boost", maxGroupBonus: 0.30, description: "-20% Cooldown" }], createdAt: new Date(), updatedAt: new Date() },
  { id: "boost-cooldown-1h", name: "Cooldown Reduction 1h", description: "-20% cooldown for 1 hour.", type: "boost", rarity: "rare", price: 1400, previewAsset: "/assets/boosts/cooldown-1h.png", status: "active", featured: false, metadata: { durationMs: 3600000 }, abilities: [{ type: "cooldown_reduction", value: 0.20, stackingGroup: "cooldown_boost", maxGroupBonus: 0.30, description: "-20% Cooldown" }], createdAt: new Date(), updatedAt: new Date() },

  // ──────────────────── THEMES (15) ────────────────────
  { id: "theme-dark", name: "Dark Mode", description: "Classic dark theme.", type: "theme", rarity: "common", price: 200, previewAsset: "/assets/themes/dark.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "theme-light", name: "Clean Light", description: "Bright and minimal.", type: "theme", rarity: "common", price: 200, previewAsset: "/assets/themes/light.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "theme-neon", name: "Neon Nights", description: "Electric vibes.", type: "theme", rarity: "uncommon", price: 800, previewAsset: "/assets/themes/neon.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "theme-ocean", name: "Ocean Deep", description: "Deep blue serenity.", type: "theme", rarity: "uncommon", price: 900, previewAsset: "/assets/themes/ocean.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "theme-forest", name: "Forest Green", description: "Nature's embrace.", type: "theme", rarity: "uncommon", price: 850, previewAsset: "/assets/themes/forest.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "theme-sunset", name: "Sunset Glow", description: "Golden hour warmth.", type: "theme", rarity: "rare", price: 1500, previewAsset: "/assets/themes/sunset.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "theme-cosmic", name: "Cosmic Purple", description: "Galaxy vibes.", type: "theme", rarity: "rare", price: 1800, previewAsset: "/assets/themes/cosmic.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "theme-crimson", name: "Crimson Fire", description: "Blood red passion.", type: "theme", rarity: "rare", price: 1600, previewAsset: "/assets/themes/crimson.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "theme-aurora", name: "Aurora Borealis", description: "Northern lights.", type: "theme", rarity: "epic", price: 3000, previewAsset: "/assets/themes/aurora.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "theme-void", name: "Void", description: "Beyond reality.", type: "theme", rarity: "epic", price: 3500, previewAsset: "/assets/themes/void.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "theme-cherry", name: "Cherry Blossom", description: "Delicate beauty.", type: "theme", rarity: "uncommon", price: 1000, previewAsset: "/assets/themes/cherry.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "theme-midnight", name: "Midnight", description: "Deep night sky.", type: "theme", rarity: "common", price: 300, previewAsset: "/assets/themes/midnight.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "theme-gold", name: "Golden Hour", description: "Luxurious gold.", type: "theme", rarity: "legendary", price: 6000, previewAsset: "/assets/themes/gold.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "theme-infinity", name: "Infinity", description: "Endless possibilities.", type: "theme", rarity: "mythic", price: 12000, previewAsset: "/assets/themes/infinity.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "theme-pixel", name: "Retro Pixel", description: "8-bit nostalgia.", type: "theme", rarity: "uncommon", price: 700, previewAsset: "/assets/themes/pixel.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },

  // ──────────────────── ACCESSORIES (10) ────────────────────
  { id: "acc-crown", name: "Royal Crown", description: "Wear the crown.", type: "accessory", rarity: "legendary", price: 8000, previewAsset: "/assets/accessories/crown.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "acc-wings", name: "Angel Wings", description: "Fly high.", type: "accessory", rarity: "epic", price: 5000, previewAsset: "/assets/accessories/wings.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "acc-horns", name: "Demon Horns", description: "Unleash the beast.", type: "accessory", rarity: "epic", price: 4500, previewAsset: "/assets/accessories/horns.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "acc-shield", name: "Guardian Shield", description: "Protection.", type: "accessory", rarity: "rare", price: 2500, previewAsset: "/assets/accessories/shield.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "acc-sword", name: "Legendary Sword", description: "Power in your hands.", type: "accessory", rarity: "rare", price: 2800, previewAsset: "/assets/accessories/sword.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "acc-aura", name: "Mystic Aura", description: "Magical energy.", type: "accessory", rarity: "uncommon", price: 1200, previewAsset: "/assets/accessories/aura.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "acc-glow", name: "Neon Glow", description: "Electric vibes.", type: "accessory", rarity: "uncommon", price: 1000, previewAsset: "/assets/accessories/glow.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "acc-flame", name: "Fire Trail", description: "Leave a trail of fire.", type: "accessory", rarity: "rare", price: 3000, previewAsset: "/assets/accessories/flame.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "acc-frost", name: "Ice Crown", description: "Frozen elegance.", type: "accessory", rarity: "uncommon", price: 1100, previewAsset: "/assets/accessories/frost.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "acc-void", name: "Void Portal", description: "Beyond reality.", type: "accessory", rarity: "mythic", price: 15000, previewAsset: "/assets/accessories/void.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },

  // ──────────────────── SPECIAL COLLECTIBLES (10) ────────────────────
  { id: "special-nft", name: "Genesis NFT", description: "First edition collectible.", type: "collectible", rarity: "mythic", price: 50000, previewAsset: "/assets/special/genesis.png", status: "active", featured: true, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "special-anniversary", name: "Anniversary Token", description: "Celebration collectible.", type: "collectible", rarity: "legendary", price: 15000, previewAsset: "/assets/special/anniversary.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "special-founder", name: "Founder's Badge", description: "Early supporter.", type: "collectible", rarity: "legendary", price: 0, previewAsset: "/assets/special/founder.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "special-legend", name: "Legend's Trophy", description: "Top 10 achievement.", type: "collectible", rarity: "mythic", price: 0, previewAsset: "/assets/special/legend-trophy.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "special-champion", name: "Champion's Medal", description: "Weekly champion.", type: "collectible", rarity: "legendary", price: 0, previewAsset: "/assets/special/champion.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "special-newyear", name: "New Year's Gift", description: "2026 celebration.", type: "collectible", rarity: "epic", price: 5000, previewAsset: "/assets/special/newyear.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "special-teej", name: "Teej Festival", description: "Festival collectible.", type: "collectible", rarity: "epic", price: 4000, previewAsset: "/assets/special/teej.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "special-dashain", name: "Dashain Blessing", description: "Victory celebration.", type: "collectible", rarity: "epic", price: 4500, previewAsset: "/assets/special/dashain.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "special-mystery", name: "Mystery Box", description: "What's inside?", type: "collectible", rarity: "rare", price: 2000, previewAsset: "/assets/special/mystery.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
  { id: "special-timecapsule", name: "Time Capsule", description: "Frozen in time.", type: "collectible", rarity: "legendary", price: 10000, previewAsset: "/assets/special/timecapsule.png", status: "active", featured: false, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
];

// ============================================================================
// Collections
// ============================================================================

const CATALOG_COLLECTIONS: Collection[] = [
  {
    id: "col-velocity",
    name: "Velocity Series",
    description: "Built for players who never stop moving.",
    itemIds: ["car-aurora", "car-pulse", "car-drift", "car-volt", "car-apex", "car-shadow", "car-blaze", "car-vortex", "car-titan", "car-phantom"],
    completionReward: { badgeId: "badge-garage-master" },
    metadata: {},
    createdAt: new Date(),
  },
  {
    id: "col-pet-legends",
    name: "Pet Legends",
    description: "The most powerful companions.",
    itemIds: ["pet-phoenix", "pet-unicorn", "pet-griffin", "pet-kraken", "pet-leviathan"],
    completionReward: { badgeId: "badge-pet-paradise" },
    metadata: {},
    createdAt: new Date(),
  },
  {
    id: "col-night-runners",
    name: "Night Runners",
    description: "Speed demons of the night.",
    itemIds: ["bike-nebula", "bike-infinity", "bike-thunder", "bike-phantom", "bike-quantum", "bike-crimson", "bike-aurora", "bike-demon"],
    completionReward: { badgeId: "badge-speed-king" },
    metadata: {},
    createdAt: new Date(),
  },
  {
    id: "col-builder",
    name: "Builder Series",
    description: "Customize your profile.",
    itemIds: ["frame-phoenix", "frame-dragon", "frame-nebula", "frame-lightning", "frame-cosmic", "frame-aurora", "frame-void", "frame-infinity", "frame-cyber", "frame-royal"],
    completionReward: { badgeId: "badge-fashionista" },
    metadata: {},
    createdAt: new Date(),
  },
  {
    id: "col-first-garage",
    name: "First Garage",
    description: "Your starter vehicle collection.",
    itemIds: ["car-pulse", "car-drift", "car-zero"],
    completionReward: { badgeId: "badge-first-car" },
    metadata: {},
    createdAt: new Date(),
  },
  {
    id: "col-starter-pets",
    name: "Starter Pets",
    description: "Your first companions.",
    itemIds: ["pet-wolf", "pet-cat", "pet-rabbit"],
    completionReward: { badgeId: "badge-first-pet" },
    metadata: {},
    createdAt: new Date(),
  },
  {
    id: "col-elite",
    name: "Elite Collection",
    description: "For the most dedicated players.",
    itemIds: ["car-infinity", "bike-quantum", "pet-kraken", "frame-void", "title-vault-master"],
    completionReward: { badgeId: "badge-legend" },
    metadata: {},
    createdAt: new Date(),
  },
  {
    id: "col-cosmic",
    name: "Cosmic Series",
    description: "Beyond the stars.",
    itemIds: ["car-nebula", "bike-nebula", "pet-phoenix", "frame-nebula", "theme-cosmic"],
    completionReward: { badgeId: "badge-curator" },
    metadata: {},
    createdAt: new Date(),
  },
];

// ============================================================================
// Catalog Service
// ============================================================================

export class VaultCatalogService {
  private catalog: VaultCatalog;
  private itemsById: Map<string, VaultItem>;
  private itemsByType: Map<VaultItemType, VaultItem[]>;
  private collectionsById: Map<string, Collection>;

  constructor() {
    this.itemsById = new Map(CATALOG_ITEMS.map((item) => [item.id, item]));
    this.itemsByType = new Map();
    for (const item of CATALOG_ITEMS) {
      const existing = this.itemsByType.get(item.type) || [];
      existing.push(item);
      this.itemsByType.set(item.type, existing);
    }
    this.collectionsById = new Map(CATALOG_COLLECTIONS.map((col) => [col.id, col]));

    this.catalog = {
      version: 1,
      items: CATALOG_ITEMS,
      collections: CATALOG_COLLECTIONS,
      featuredItemIds: CATALOG_ITEMS.filter((i) => i.featured).map((i) => i.id),
      sections: this.generateSections(),
      updatedAt: new Date(),
    };
  }

  getCatalog(): VaultCatalog {
    return this.catalog;
  }

  getItem(id: string): VaultItem | undefined {
    return this.itemsById.get(id);
  }

  getItemsByType(type: VaultItemType): VaultItem[] {
    return this.itemsByType.get(type) || [];
  }

  getCollection(id: string): Collection | undefined {
    return this.collectionsById.get(id);
  }

  getAllCollections(): Collection[] {
    return CATALOG_COLLECTIONS;
  }

  searchItems(filter: StoreFilter): VaultItem[] {
    let items = CATALOG_ITEMS.filter((i) => i.status === "active");

    if (filter.types?.length) {
      items = items.filter((i) => filter.types!.includes(i.type));
    }
    if (filter.rarities?.length) {
      items = items.filter((i) => filter.rarities!.includes(i.rarity));
    }
    if (filter.priceMin !== undefined) {
      items = items.filter((i) => i.price >= filter.priceMin!);
    }
    if (filter.priceMax !== undefined) {
      items = items.filter((i) => i.price <= filter.priceMax!);
    }
    if (filter.abilities?.length) {
      items = items.filter((i) =>
        i.abilities?.some((a) => filter.abilities!.includes(a.type as any))
      );
    }
    if (filter.collections?.length) {
      items = items.filter((i) =>
        filter.collections!.includes(i.collectionId || "")
      );
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }

    return items;
  }

  sortItems(items: VaultItem[], sort: StoreSort, userBalance?: number): VaultItem[] {
    const sorted = [...items];
    switch (sort) {
      case "price_asc":
        return sorted.sort((a, b) => a.price - b.price);
      case "price_desc":
        return sorted.sort((a, b) => b.price - a.price);
      case "rarity": {
        const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
        return sorted.sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity]);
      }
      case "newest":
        return sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      case "near_affordable":
        if (userBalance !== undefined) {
          return sorted.sort((a, b) => {
            const diffA = Math.abs(a.price - userBalance);
            const diffB = Math.abs(b.price - userBalance);
            return diffA - diffB;
          });
        }
        return sorted;
      case "recommended":
      default:
        return sorted.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return b.price - a.price;
        });
    }
  }

  getFeatured(): VaultItem[] {
    return CATALOG_ITEMS.filter((i) => i.featured && i.status === "active");
  }

  getSections(): VaultSection[] {
    return this.catalog.sections;
  }

  private generateSections(): VaultSection[] {
    return [
      {
        id: "featured",
        title: "Featured",
        itemIds: CATALOG_ITEMS.filter((i) => i.featured).slice(0, 8).map((i) => i.id),
        type: "featured",
      },
      {
        id: "new",
        title: "New Drops",
        itemIds: CATALOG_ITEMS.filter((i) => i.status === "active")
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 8)
          .map((i) => i.id),
        type: "new",
      },
      {
        id: "trending",
        title: "Trending",
        itemIds: CATALOG_ITEMS.filter((i) => i.status === "active")
          .sort((a, b) => b.price - a.price)
          .slice(0, 8)
          .map((i) => i.id),
        type: "trending",
      },
      {
        id: "pets",
        title: "Pets",
        itemIds: CATALOG_ITEMS.filter((i) => i.type === "pet" && i.status === "active")
          .slice(0, 8)
          .map((i) => i.id),
        type: "category",
      },
      {
        id: "cars",
        title: "Cars",
        itemIds: CATALOG_ITEMS.filter((i) => i.type === "car" && i.status === "active")
          .slice(0, 8)
          .map((i) => i.id),
        type: "category",
      },
      {
        id: "bikes",
        title: "Superbikes",
        itemIds: CATALOG_ITEMS.filter((i) => i.type === "superbike" && i.status === "active")
          .slice(0, 8)
          .map((i) => i.id),
        type: "category",
      },
      {
        id: "cosmetics",
        title: "Style Lab",
        itemIds: CATALOG_ITEMS.filter(
          (i) => ["frame", "title", "badge", "theme", "accessory"].includes(i.type) && i.status === "active"
        )
          .slice(0, 8)
          .map((i) => i.id),
        type: "category",
      },
    ];
  }
}

// Singleton
let catalogInstance: VaultCatalogService | null = null;

export function getVaultCatalog(): VaultCatalogService {
  if (!catalogInstance) {
    catalogInstance = new VaultCatalogService();
  }
  return catalogInstance;
}
