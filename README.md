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
| **Arène** | Canvas 2D animé — agents, trails, nourriture |
| **Réseau** | Visualisation live du réseau de l'agent sélectionné |
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

---

## Comment ça fonctionne

### 1. L'écosystème

La simulation tourne dans une arène 2D bouclée (les bords se rejoignent). À chaque tick :

- Les **proies** 🟢 cherchent de la nourriture et fuient les prédateurs
- Les **prédateurs** 🔴 chassent les proies pour regagner de l'énergie
- La **nourriture** 🟡 apparaît aléatoirement à un rythme configurable

Chaque agent a une barre d'énergie. Sans énergie → mort. La génération dure un temps fixe (défaut : 25 secondes simulées), puis tout le monde est remplacé.

### 2. Le réseau de neurones

Chaque agent est contrôlé par un réseau **feed-forward entièrement connecté** :

```
Entrées (8)  →  Cachée 1 (12)  →  Cachée 2 (8)  →  Sorties (3)
                    tanh                tanh
```

**Entrées :**
| # | Signal |
|---|--------|
| 0–1 | Distance + angle relatif vers l'ennemi le plus proche |
| 2–3 | Distance + angle vers le 2e ennemi |
| 4–5 | Distance + angle vers le 3e ennemi |
| 6–7 | Distance + angle vers la nourriture la plus proche |
| 8 | Énergie actuelle (0–1) |
| 9 | Vitesse actuelle (0–1) |

**Sorties :**
| # | Action |
|---|--------|
| 0 | Vitesse cible (0–1) |
| 1 | Virage (−180° à +180°) |
| 2 | Action spéciale (binaire) |

### 3. Score de fitness

Calculé en fin de génération pour chaque agent :

```
Proie     → age × 8  +  nourriture_mangée × 5
Prédateur → captures × 20  +  age × 2
```

### 4. Algorithme génétique

Les **poids du réseau = génome** de l'agent.

```
1. Tri par fitness (décroissant)
2. Sélection des top 20 % (configurable)
3. Crossover  → pour chaque poids, tirage aléatoire entre parent A et parent B
4. Mutation   → avec probabilité p, perturbation gaussienne (σ = 0.15)
5. Élitisme   → les 2 meilleurs passent sans modification
```

---

## Structure du projet

```
neuroevo/
├── index.html          Point d'entrée — layout, CSS, HTML
└── src/
    ├── main.js         Boucle principale, bindings UI
    ├── Simulation.js   Tick, gestion des générations
    ├── Agent.js        Agents (proies/prédateurs), capteurs, mouvement
    ├── NeuralNet.js    Réseau feed-forward, crossover, mutation
    ├── Genetics.js     Sélection par tournoi, élitisme
    ├── Renderer.js     Rendu Canvas 2D + visualisation réseau
    └── Stats.js        Graphiques fitness par génération
```

---

## Paramètres configurables

Tous ajustables via les sliders de l'interface, ou directement dans `src/Simulation.js` :

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `preyCount` | `40` | Nombre de proies par génération |
| `predCount` | `15` | Nombre de prédateurs par génération |
| `genDuration` | `25` | Durée d'une génération (secondes simulées) |
| `mutationRate` | `0.05` | Probabilité de mutation par poids |
| `mutationStd` | `0.15` | Amplitude du bruit gaussien |
| `eliteRatio` | `0.20` | Part de la population sélectionnée |
| `foodSpawnRate` | `0.4` | Unités de nourriture spawned par seconde |

---

## Interface

| Contrôle | Action |
|----------|--------|
| **Clic sur un agent** | Affiche son réseau de neurones en temps réel |
| **Slider vitesse** | Accélère la simulation (×1 à ×10) |
| **Bouton Pause** | Met en pause / reprend |
| **Sliders paramètres** | Modifient la prochaine génération à la volée |

La barre de progression en haut de l'arène indique l'avancement de la génération en cours.

---

## Roadmap

- [x] Simulation proies / prédateurs avec réseau de neurones
- [x] Algorithme génétique (crossover + mutation + élitisme)
- [x] Visualisation du réseau de neurones en temps réel
- [x] Graphiques d'évolution du fitness
- [x] Paramètres ajustables à la volée
- [ ] **Reproduction en direct** — si un prédateur mange une proie et que son énergie dépasse 100 %, il engendre un enfant (clone muté) qui naît à 50 % d'énergie, sans attendre la fin de la génération
- [ ] Obstacles dans l'arène
- [ ] Sauvegarde / chargement d'une population (JSON)
- [ ] Plusieurs espèces de proies
- [ ] Mode headless (simulation sans rendu, plus rapide)
- [ ] Algorithme NEAT (topologie évolutive)

---

## Licence

MIT — voir [LICENSE](LICENSE)
