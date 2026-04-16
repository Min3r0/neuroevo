// ═══════════════════════════════════════════════════════════
//  NeuroEvo — Fichier de configuration central
//  Modifiez ces valeurs pour ajuster la simulation
// ═══════════════════════════════════════════════════════════

export const CONFIG = {

  // ── Population ─────────────────────────────────────────
  population: {
    preyCount:    40,   // Nombre de proies par génération
    predCount:    15,   // Nombre de prédateurs par génération
    maxPrey:      80,   // Plafond proies (reproduction en direct)
    maxPredators: 40,   // Plafond prédateurs (reproduction en direct)
  },

  // ── Durée & temps ──────────────────────────────────────
  time: {
    genDuration:  25,   // Durée d'une génération (secondes simulées)
  },

  // ── Énergie ────────────────────────────────────────────
  energy: {
    // Drain de base par tick (× dt × 60)
    preyBaseDrain:  0.0003,   // Proie au repos
    predBaseDrain:  0.0006,   // Prédateur au repos (plus gourmand)
    speedDrain:     0.0002,   // Drain supplémentaire par unité de vitesse (commun)

    // Gain d'énergie
    preyFoodGain:   0.25,     // Énergie gagnée en mangeant une plante
    predKillGain:   0.30,     // Énergie gagnée en attrapant une proie

    // Reproduction (déclenchée si énergie dépasse 1.0 après gain)
    childStartEnergy: 0.50,   // Énergie de départ d'un enfant né en direct
  },

  // ── Vitesse de déplacement ─────────────────────────────
  speed: {
    preyMaxSpeed:  2.8,   // Vitesse max des proies
    predMaxSpeed:  2.2,   // Vitesse max des prédateurs
    turnSpeed:     0.12,  // Amplitude de virage par tick
    acceleration:  0.15,  // Lissage de l'accélération (0 = lent, 1 = instantané)
  },

  // ── Champ de vision ────────────────────────────────────
  vision: {
    preyFovDeg:  240,   // Angle du champ de vision des proies (degrés)
    predFovDeg:  180,   // Angle du champ de vision des prédateurs (degrés)
    range:       200,   // Portée maximale de la vision (pixels)
  },

  // ── Nourriture ─────────────────────────────────────────
  food: {
    spawnRate:    1.2,   // Plantes spawned par seconde
    maxOnMap:     80,    // Nombre max de plantes simultanées
    initialCount: 30,    // Plantes présentes au départ de chaque génération
    eatRadius:    4,     // Distance pour manger (pixels)
  },

  // ── Algorithme génétique ───────────────────────────────
  genetics: {
    eliteRatio:      0.20,   // Part de la population sélectionnée (top %)
    mutationRate:    0.05,   // Probabilité de mutation par poids
    mutationStd:     0.15,   // Amplitude du bruit gaussien
    tournamentSize:   3,     // Taille du tournoi de sélection
  },

  // ── Réseau de neurones ─────────────────────────────────
  network: {
    layerSizes: [14, 20, 12, 3],  // [entrées, cachée1, cachée2, sorties]
  },

  // ── Score de fitness ───────────────────────────────────
  fitness: {
    prey: {
      ageFactor:          8,    // Points par seconde de survie
      foodFactor:         5,    // Points par plante mangée
      reproductionBonus:  15,   // Points par reproduction réussie
    },
    predator: {
      ageFactor:          2,    // Points par seconde de survie
      killFactor:         20,   // Points par proie capturée
      reproductionBonus:  25,   // Points par reproduction réussie
    },
  },

  // ── Obstacles ──────────────────────────────────────────
  obstacles: {
    enabled: false,   // Activer les obstacles au démarrage
  },

};
