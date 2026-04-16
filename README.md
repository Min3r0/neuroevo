# NeuroEvo

> Simulation de neuroévolution par écosystème — JavaScript pur, zéro dépendance.

Des proies et des prédateurs apprennent à survivre génération après génération. Leur comportement n'est pas codé en dur : il émerge uniquement de l'évolution de leur réseau de neurones via un algorithme génétique.

![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-f0c040?style=flat-square&logo=javascript&logoColor=black)
![Canvas](https://img.shields.io/badge/Canvas-2D-4ade80?style=flat-square)
![Dépendances](https://img.shields.io/badge/dépendances-0-f87171?style=flat-square)
![Licence](https://img.shields.io/badge/licence-MIT-white?style=flat-square)

---

## Aperçu

| Zone | Contenu |
|------|---------|
| **Arène** | Canvas 2D animé — agents, trails, nourriture, obstacles |
| **Réseau** | Visualisation live du réseau de neurones de l'agent sélectionné |
| **Graphiques** | Courbes de fitness moyen / best par génération |
| **Paramètres** | Sliders ajustables en cours de simulation |

---

## Démarrage rapide

Aucun `npm install` requis. Il faut uniquement un serveur HTTP local (les modules ES6 ne fonctionnent pas en `file://`).

```bash
git clone https://github.com/votre-compte/neuroevo.git
cd neuroevo

# Option 1 — Node.js
npx serve .

# Option 2 — Python
python -m http.server 8080

# Option 3 — VS Code
# Installer l'extension "Live Server" → clic droit sur index.html → Open with Live Server
```

Ouvrir ensuite `http://localhost:3000` (ou `8080` selon l'option choisie).

> **Note :** Modifier `src/config.js` puis faire F5 suffit pour appliquer les changements — pas besoin de redémarrer quoi que ce soit.

---

## Comment ça fonctionne

### 1. L'écosystème

La simulation tourne dans une arène 2D à bords physiques (les entités rebondissent sur les murs). À chaque tick :

- Les **proies** 🟢 cherchent de la nourriture et fuient les prédateurs
- Les **prédateurs** 🔴 chassent les proies pour regagner de l'énergie
- La **nourriture** 🟡 apparaît aléatoirement à un rythme configurable
- Des **obstacles** ⬛ (activés par défaut) créent des couloirs et zones d'embuscade — la nourriture ne peut pas y apparaître

Chaque agent a une barre d'énergie qui diminue en permanence (plus vite à grande vitesse). Sans énergie → mort. La génération dure un temps fixe, puis le cycle génétique se déclenche.

### 2. Le réseau de neurones

Chaque agent est contrôlé par un réseau **feed-forward entièrement connecté** :

```
Entrées (14)  →  Cachée 1 (20)  →  Cachée 2 (12)  →  Sorties (3)
                     tanh                tanh
```

**Entrées (14) :**

| # | Signal |
|---|--------|
| 0–1 | Distance + angle relatif vers l'ennemi le plus proche |
| 2–3 | Distance + angle vers le 2e ennemi |
| 4–5 | Distance + angle vers le 3e ennemi |
| 6–7 | Distance + angle vers la nourriture la plus proche |
| 8–10 | Énergie des 3 ennemis visibles (0 si absent) |
| 11–12 | Distance + angle relatif vers le mur le plus proche |
| 13 | Densité d'alliés proches (rayon 80px, normalisé 0–1) |

**Sorties (3) :**

| # | Action |
|---|--------|
| 0 | Vitesse cible (0–1) |
| 1 | Virage par tick (`tanh(x) × turnSpeed`, soit ±`turnSpeed` rad max) |
| 2 | Réservé (action future) |

**Champ de vision :**
- Proies : **240°** centré vers l'avant, portée configurable
- Prédateurs : **180°** centré vers l'avant, portée configurable
- Les obstacles bloquent la vision (raycasting segment/rectangle)

### 3. Système de reproduction et sélection

La reproduction suit une logique biologique en deux temps :

```
Pendant la génération :
  - Chaque agent accumule un compteur de repas (mealCount)
  - Aucune reproduction instantanée

En fin de génération :
  1. Sélection  → seuls les agents ayant mangé ≥ survivalThreshold passent
  2. Crossover  → mélange des poids entre deux parents sélectionnés
  3. Mutation   → perturbation gaussienne des poids
  4. Élitisme   → les 2 meilleurs passent sans modification
  5. Enfants bonus → chaque agent ayant mangé ≥ childThreshold génère 1 enfant muté
  6. Anti-extinction → injection d'individus aléatoires si population trop basse
```

### 4. Score de fitness

```
Proie     → age × 8  +  nourriture × 5  +  reproductions × 15  +  bonus_survie × 20
Prédateur → captures × 20  +  age × 2  +  reproductions × 25  +  bonus_survie × 20
```

Le bonus survie (+20) est accordé à tout agent ayant atteint le seuil de repas minimum.

---

## Structure du projet

```
neuroevo/
├── index.html          Point d'entrée — layout, CSS, HTML
├── LICENSE
├── README.md
└── src/
    ├── config.js       ★ Fichier de configuration central (modifier ici)
    ├── main.js         Boucle principale, bindings UI
    ├── Simulation.js   Tick, gestion des générations, anti-extinction
    ├── Agent.js        Agents (proies/prédateurs), capteurs, mouvement, raycasting
    ├── NeuralNet.js    Réseau feed-forward, crossover, mutation
    ├── Genetics.js     Sélection par tournoi, élitisme, survie par repas
    ├── Renderer.js     Rendu Canvas 2D, cone de vision, visualisation réseau
    └── Stats.js        Graphiques fitness par génération
```

---

## Configuration (`src/config.js`)

Toutes les valeurs sont centralisées dans ce fichier. F5 suffit pour les appliquer.

### Population

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `preyCount` | `40` | Nombre de proies par génération |
| `predCount` | `15` | Nombre de prédateurs par génération |

### Durée

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `genDuration` | `25` | Durée d'une génération (secondes simulées) |

### Énergie

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `preyBaseDrain` | `0.0003` | Drain de base des proies au repos |
| `predBaseDrain` | `0.0006` | Drain de base des prédateurs au repos |
| `speedDrain` | `0.0002` | Drain supplémentaire par unité de vitesse |
| `preyFoodGain` | `0.25` | Énergie gagnée en mangeant une plante |
| `predKillGain` | `0.30` | Énergie gagnée en attrapant une proie |

### Vitesse

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `preyMaxSpeed` | `2.8` | Vitesse max des proies |
| `predMaxSpeed` | `2.2` | Vitesse max des prédateurs |
| `turnSpeed` | `0.12` | Amplitude de virage par tick |
| `acceleration` | `0.15` | Lissage de l'accélération |

### Champ de vision

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `preyFovDeg` | `240` | Angle de vision des proies (degrés) |
| `predFovDeg` | `180` | Angle de vision des prédateurs (degrés) |
| `range` | `200` | Portée de vision (pixels) |

### Nourriture

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `spawnRate` | `1.2` | Plantes spawned par seconde |
| `maxOnMap` | `80` | Nombre max de plantes simultanées |
| `initialCount` | `30` | Plantes au départ de chaque génération |
| `eatRadius` | `4` | Distance pour manger (pixels) |

### Reproduction

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `survivalThreshold` | `1` | Repas minimum pour être éligible à la reproduction |
| `childThreshold` | `2` | Repas pour générer un enfant bonus en fin de génération |
| `minPreyPopulation` | `8` | Seuil anti-extinction proies |
| `minPredPopulation` | `4` | Seuil anti-extinction prédateurs |

### Algorithme génétique

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `eliteRatio` | `0.20` | Part de la population sélectionnée |
| `mutationRate` | `0.05` | Probabilité de mutation par poids |
| `mutationStd` | `0.15` | Amplitude du bruit gaussien |
| `tournamentSize` | `3` | Taille du tournoi de sélection |

### Score de fitness

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `prey.ageFactor` | `8` | Points par seconde de survie (proie) |
| `prey.foodFactor` | `5` | Points par plante mangée |
| `prey.reproductionBonus` | `15` | Points par reproduction réussie |
| `predator.ageFactor` | `2` | Points par seconde de survie (prédateur) |
| `predator.killFactor` | `20` | Points par proie capturée |
| `predator.reproductionBonus` | `25` | Points par reproduction réussie |

### Réseau de neurones

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `layerSizes` | `[14, 20, 12, 3]` | Taille de chaque couche |

### Obstacles

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `enabled` | `true` | Activer les obstacles au démarrage |

---

## Interface

| Contrôle | Action |
|----------|--------|
| **Clic sur un agent** | Affiche son réseau de neurones + son champ de vision en temps réel |
| **Slider vitesse** | Accélère la simulation (×1 à ×10) |
| **Bouton Pause** | Met en pause / reprend |
| **Toggle thème** | Bascule entre thème sombre et clair |
| **Toggle obstacles** | Active / désactive les obstacles à la volée |
| **Sliders paramètres** | Modifient la prochaine génération en direct |

La barre de progression en bas de l'écran indique l'avancement de la génération en cours.

---

## Conseils pour faire évoluer les agents plus vite

- Augmenter `genDuration` à `35–40` — plus de temps pour que les différences se voient
- Baisser `eliteRatio` à `0.10` — sélection plus dure
- Lancer à ×10 et laisser tourner 80–100 générations
- Activer les obstacles — ça force des comportements plus sophistiqués

---

## Roadmap

- [x] Simulation proies / prédateurs avec réseau de neurones
- [x] Algorithme génétique (crossover + mutation + élitisme)
- [x] Visualisation du réseau de neurones en temps réel
- [x] Graphiques d'évolution du fitness
- [x] Paramètres ajustables à la volée
- [x] Reproduction basée sur les repas (survie + enfant bonus en fin de génération)
- [x] Obstacles avec blocage de vision (raycasting)
- [x] Champ de vision 240° / 180° avec cone visuel
- [x] 14 entrées sensorielles (ennemis, nourriture, énergie ennemis, murs, alliés)
- [x] Anti-extinction (injection si population trop basse)
- [x] Thème sombre / clair
- [x] Fichier de configuration central
- [ ] Sauvegarde / chargement d'une population (JSON)
- [ ] Plusieurs espèces de proies
- [ ] Mode headless (simulation sans rendu, plus rapide)
- [ ] Algorithme NEAT (topologie évolutive)

---

## Licence

MIT — voir [LICENSE](LICENSE)