// ═══════════════════════════════════════════════════════════
//  NeuroEvo — Configuration centrale
//  Modifie ces valeurs puis F5 pour appliquer.
// ═══════════════════════════════════════════════════════════

export const CONFIG = {

  // ── Population ─────────────────────────────────────────
  population: {
    preyCount: 40,   // Nombre de proies au démarrage / par génération de base
    predCount: 15,   // Nombre de prédateurs au démarrage / par génération de base
  },

  // ── Durée d'une génération ─────────────────────────────
  time: {
    genDuration: 25,   // secondes simulées
  },

  // ── Énergie ────────────────────────────────────────────
  energy: {
    preyBaseDrain: 0.0003,   // drain de base par tick (× dt × 60), proie au repos
    predBaseDrain: 0.0006,   // drain de base par tick, prédateur au repos
    speedDrain:    0.0002,   // drain additionnel par unité de vitesse
    preyFoodGain:  0.25,     // énergie gagnée en mangeant une plante
    predKillGain:  0.30,     // énergie gagnée en attrapant une proie
  },

  // ── Vitesse ────────────────────────────────────────────
  speed: {
    preyMaxSpeed: 2.8,
    predMaxSpeed: 2.2,
    turnSpeed:    0.12,   // amplitude max de virage par tick (rad)
    acceleration: 0.15,   // lissage (0 = lent, 1 = instantané)
  },

  // ── Champ de vision ────────────────────────────────────
  vision: {
    preyFovDeg: 240,
    predFovDeg: 180,
    range:      200,   // pixels
  },

  // ── Nourriture ─────────────────────────────────────────
  food: {
    spawnRate:    1.2,   // plantes par seconde
    maxOnMap:     80,
    initialCount: 30,
    eatRadius:    4,     // rayon de capture (pixels)
  },

  // ── Reproduction ───────────────────────────────────────
  reproduction: {
    survivalThreshold: 2,   // mealCount minimum pour cloner ; aussi seuil du bonus survie
    minPreyPopulation: 8,   // anti-extinction proies
    minPredPopulation: 4,   // anti-extinction prédateurs
  },

  // ── Algorithme génétique ───────────────────────────────
  genetics: {
    mutationRate: 0.05,   // probabilité de mutation par poids
    mutationStd:  0.15,   // amplitude du bruit gaussien
  },

  // ── Réseau de neurones ─────────────────────────────────
  network: {
    layerSizes: [14, 20, 12, 3],   // [entrées, cachée1, cachée2, sorties]
  },

  // ── Score de fitness ───────────────────────────────────
  fitness: {
    prey:     { ageFactor: 8, foodFactor: 5, reproductionBonus: 15 },
    predator: { ageFactor: 2, killFactor: 20, reproductionBonus: 25 },
  },

  // ── Obstacles ──────────────────────────────────────────
  obstacles: {
    enabled: true,   // activés au démarrage
  },

};
