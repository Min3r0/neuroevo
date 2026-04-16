import { CONFIG } from './config.js';
import { Agent } from './Agent.js';
import { Genetics } from './Genetics.js';

export class Simulation {
  constructor(cfg = {}) {
    this.cfg = {
      preyCount:        cfg.preyCount        ?? CONFIG.population.preyCount,
      predCount:        cfg.predCount        ?? CONFIG.population.predCount,
      genDuration:      cfg.genDuration      ?? CONFIG.time.genDuration,
      foodSpawnRate:    cfg.foodSpawnRate    ?? CONFIG.food.spawnRate,
      mutationRate:     cfg.mutationRate     ?? CONFIG.genetics.mutationRate,
      mutationStd:      cfg.mutationStd      ?? CONFIG.genetics.mutationStd,
      obstaclesEnabled: cfg.obstaclesEnabled ?? CONFIG.obstacles.enabled,
      W: cfg.W ?? 700,
      H: cfg.H ?? 500,
    };
    this.genetics      = new Genetics(this.cfg);
    this.generation    = 0;
    this.time          = 0;
    this.agents        = [];
    this.foods         = [];
    this.history       = [];
    this.selectedAgent = null;
    this.birthEvents   = [];
    this.totalBirths   = 0;
    this.obstacles     = this.cfg.obstaclesEnabled ? this._generateObstacles() : [];
    this._init();
  }

  // ── Obstacles ────────────────────────────────────────────
  _generateObstacles() {
    const { W, H } = this.cfg;
    return [
      { x: Math.round(W * 0.20), y: Math.round(H * 0.15), w: 80,  h: 18 },
      { x: Math.round(W * 0.60), y: Math.round(H * 0.15), w: 80,  h: 18 },
      { x: Math.round(W * 0.10), y: Math.round(H * 0.45), w: 18,  h: 90 },
      { x: Math.round(W * 0.75), y: Math.round(H * 0.40), w: 18,  h: 90 },
      { x: Math.round(W * 0.35), y: Math.round(H * 0.65), w: 110, h: 18 },
      { x: Math.round(W * 0.55), y: Math.round(H * 0.30), w: 18,  h: 70 },
    ];
  }

  _isInsideObstacle(x, y) {
    for (const o of this.obstacles) {
      if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return true;
    }
    return false;
  }

  _randomFreePos(maxAttempts = 20) {
    const { W, H } = this.cfg;
    for (let i = 0; i < maxAttempts; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      if (!this._isInsideObstacle(x, y)) return { x, y };
    }
    return null;
  }

  _clampPos(x, y) {
    const { W, H } = this.cfg;
    return {
      x: Math.max(8, Math.min(W - 8, x)),
      y: Math.max(8, Math.min(H - 8, y)),
    };
  }

  setObstacles(enabled) {
    this.cfg.obstaclesEnabled = enabled;
    this.obstacles = enabled ? this._generateObstacles() : [];
    if (enabled) this.foods = this.foods.filter(f => !this._isInsideObstacle(f.x, f.y));
  }

  // ── Initialisation d'une génération 0 ───────────────────
  _init() {
    const { preyCount, predCount, W, H } = this.cfg;
    this.agents = [];
    for (let i = 0; i < preyCount; i++) {
      const p = this._randomFreePos() || { x: Math.random() * W, y: Math.random() * H };
      this.agents.push(new Agent('prey', p.x, p.y));
    }
    for (let i = 0; i < predCount; i++) {
      const p = this._randomFreePos() || { x: Math.random() * W, y: Math.random() * H };
      this.agents.push(new Agent('predator', p.x, p.y));
    }
    this.foods = [];
    for (let i = 0; i < CONFIG.food.initialCount; i++) {
      const p = this._randomFreePos();
      if (p) this.foods.push(p);
    }
    this.time        = 0;
    this.birthEvents = [];
  }

  // ── Boucle tick ─────────────────────────────────────────
  tick(dt) {
    const { W, H, genDuration, foodSpawnRate } = this.cfg;

    // Spawn de nourriture (hors obstacles)
    if (Math.random() < foodSpawnRate * dt) {
      const p = this._randomFreePos();
      if (p) {
        this.foods.push(p);
        if (this.foods.length > CONFIG.food.maxOnMap) this.foods.shift();
      }
    }

    for (const a of this.agents) {
      if (!a.alive) continue;
      const r = a.update(this.agents, this.foods, W, H, dt, this.obstacles);
      if (r?.eaten != null) this.foods.splice(r.eaten, 1);
    }

    // Decay des flashs de naissance
    for (let i = this.birthEvents.length - 1; i >= 0; i--) {
      this.birthEvents[i].ttl -= dt;
      if (this.birthEvents[i].ttl <= 0) this.birthEvents.splice(i, 1);
    }

    this.time += dt;
    if (this.time >= genDuration) this._nextGeneration();
  }

  // ── Passage à la génération suivante ─────────────────────
  _nextGeneration() {
    const { preyCount, predCount, W, H } = this.cfg;

    // L'UI a peut-être changé la mutation
    this.genetics.mutationRate = this.cfg.mutationRate;
    this.genetics.mutationStd  = this.cfg.mutationStd;

    const preyPool = this.agents.filter(a => a.type === 'prey');
    const predPool = this.agents.filter(a => a.type === 'predator');

    const preyRank = this.genetics.rankPool(preyPool);
    const predRank = this.genetics.rankPool(predPool);

    const newPrey = this._breed(preyRank.sorted, 'prey', preyCount * 2);
    const newPred = this._breed(predRank.sorted, 'predator', predCount * 2);

    // Anti-extinction
    this._antiExtinction(newPrey, 'prey',     preyPool, CONFIG.reproduction.minPreyPopulation);
    this._antiExtinction(newPred, 'predator', predPool, CONFIG.reproduction.minPredPopulation);

    this.history.push({
      gen:       this.generation,
      preyAvg:   preyRank.avg,
      preyBest:  preyRank.best,
      predAvg:   predRank.avg,
      predBest:  predRank.best,
      preyAlive: preyPool.filter(a => a.alive).length,
      predAlive: predPool.filter(a => a.alive).length,
      births:    this.totalBirths,
    });

    this.generation++;
    this.agents = [...newPrey, ...newPred];
    this.foods  = [];
    for (let i = 0; i < CONFIG.food.initialCount; i++) {
      const p = this._randomFreePos();
      if (p) this.foods.push(p);
    }
    this.time          = 0;
    this.selectedAgent = null;
    this.totalBirths   = 0;
  }

  // Clone-only breeding : élitisme + enfants par mealCount + plafond doux
  _breed(sortedPool, type, popMax) {
    const { W, H } = this.cfg;
    const surv = CONFIG.reproduction.survivalThreshold;
    const newAgents = [];

    // Élitisme : top 2, cerveau cloné tel quel (pas de mutation)
    const eliteN = Math.min(2, sortedPool.length);
    for (let i = 0; i < eliteN; i++) {
      const p = this._randomFreePos() || { x: Math.random() * W, y: Math.random() * H };
      newAgents.push(new Agent(type, p.x, p.y, sortedPool[i].brain.clone()));
    }

    // Clones mutés à côté du parent (1 par repas au-delà du seuil)
    for (const parent of sortedPool) {
      if (parent.mealCount < surv) continue;
      const childCount = parent.mealCount - 1;
      for (let k = 0; k < childCount; k++) {
        const brain = this.genetics.cloneMutated(parent);
        const ang   = Math.random() * Math.PI * 2;
        const d     = type === 'predator' ? 22 : 18;
        const pos   = this._clampPos(parent.x + Math.cos(ang) * d, parent.y + Math.sin(ang) * d);
        newAgents.push(new Agent(type, pos.x, pos.y, brain));
        this.birthEvents.push({ x: parent.x, y: parent.y, ttl: 0.8 });
        this.totalBirths++;
        parent.reproductions++;
      }
    }

    // Plafond doux : on tronque le surplus au-delà de popMax en préservant les élites
    if (newAgents.length > popMax) {
      const elites = newAgents.slice(0, eliteN);
      const rest   = newAgents.slice(eliteN);
      shuffle(rest);
      return elites.concat(rest.slice(0, popMax - eliteN));
    }

    return newAgents;
  }

  _antiExtinction(list, type, parentPool, minN) {
    const { W, H } = this.cfg;
    let n = list.filter(a => a.type === type).length;
    while (n < minN) {
      const p = this._randomFreePos() || { x: Math.random() * W, y: Math.random() * H };
      list.push(this.genetics.spawnExtinctionAgent(type, parentPool, p.x, p.y));
      n++;
    }
  }

  // ── Accesseurs ──────────────────────────────────────────
  get preyAlive() { return this.agents.filter(a => a.type === 'prey'     && a.alive).length; }
  get predAlive() { return this.agents.filter(a => a.type === 'predator' && a.alive).length; }
  get progress()  { return Math.min(this.time / this.cfg.genDuration, 1); }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
