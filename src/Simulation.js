import { CONFIG } from './config.js';
import { Agent } from './Agent.js';
import { Genetics } from './Genetics.js';

const { survivalThreshold, childThreshold, minPreyPopulation, minPredPopulation } = CONFIG.reproduction;

export class Simulation {
  constructor(cfg) {
    this.cfg = {
      preyCount:        cfg.preyCount    ?? CONFIG.population.preyCount,
      predCount:        cfg.predCount    ?? CONFIG.population.predCount,
      genDuration:      cfg.genDuration  ?? CONFIG.time.genDuration,
      foodSpawnRate:    cfg.foodSpawnRate ?? CONFIG.food.spawnRate,
      eliteRatio:       cfg.eliteRatio   ?? CONFIG.genetics.eliteRatio,
      mutationRate:     cfg.mutationRate ?? CONFIG.genetics.mutationRate,
      mutationStd:      cfg.mutationStd  ?? CONFIG.genetics.mutationStd,
      maxPredators:     cfg.maxPredators ?? CONFIG.population.maxPredators,
      maxPrey:          cfg.maxPrey      ?? CONFIG.population.maxPrey,
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
    this._init();
  }

  _init() {
    const { preyCount, predCount, W, H } = this.cfg;
    this.agents = [];
    for (let i = 0; i < preyCount; i++)
      this.agents.push(new Agent('prey',     Math.random() * W, Math.random() * H));
    for (let i = 0; i < predCount; i++)
      this.agents.push(new Agent('predator', Math.random() * W, Math.random() * H));
    this.foods = [];
    for (let i = 0; i < CONFIG.food.initialCount; i++)
      this.foods.push({ x: Math.random() * W, y: Math.random() * H });
    this.time        = 0;
    this.birthEvents = [];
  }

  _generateObstacles() {
    const { W, H } = this.cfg;
    return [
      { x: Math.round(W*0.20), y: Math.round(H*0.15), w: 80,  h: 18 },
      { x: Math.round(W*0.60), y: Math.round(H*0.15), w: 80,  h: 18 },
      { x: Math.round(W*0.10), y: Math.round(H*0.45), w: 18,  h: 90 },
      { x: Math.round(W*0.75), y: Math.round(H*0.40), w: 18,  h: 90 },
      { x: Math.round(W*0.35), y: Math.round(H*0.65), w: 110, h: 18 },
      { x: Math.round(W*0.55), y: Math.round(H*0.30), w: 18,  h: 70 },
    ];
  }

  _clampPos(x, y) {
    const { W, H } = this.cfg;
    return {
      x: Math.max(8, Math.min(W - 8, x)),
      y: Math.max(8, Math.min(H - 8, y)),
    };
  }

  tick(dt) {
    const { W, H, genDuration, foodSpawnRate } = this.cfg;

    // Spawn nourriture
    if (Math.random() < foodSpawnRate * dt) {
      this.foods.push({ x: Math.random() * W, y: Math.random() * H });
      if (this.foods.length > CONFIG.food.maxOnMap) this.foods.shift();
    }

    for (const agent of this.agents) {
      if (!agent.alive) continue;
      const result = agent.update(this.agents, this.foods, W, H, dt, this.obstacles);
      if (result?.eaten != null) this.foods.splice(result.eaten, 1);
    }

    // Decay birth events
    for (let i = this.birthEvents.length - 1; i >= 0; i--) {
      this.birthEvents[i].ttl -= dt;
      if (this.birthEvents[i].ttl <= 0) this.birthEvents.splice(i, 1);
    }

    this.time += dt;
    if (this.time >= genDuration) this._nextGeneration();
  }

  _nextGeneration() {
    const { preyCount, predCount, W, H } = this.cfg;

    // ── Sélection par mealCount ────────────────────────────────
    // Survivants : ont mangé au moins survivalThreshold fois
    // Parents    : ont mangé au moins childThreshold fois → génèrent 1 enfant bonus
    const preyPool = this.agents.filter(a => a.type === 'prey');
    const predPool = this.agents.filter(a => a.type === 'predator');

    const preyEvo = this.genetics.evolve(preyPool, 'prey',      preyCount, W, H);
    const predEvo = this.genetics.evolve(predPool, 'predator',  predCount, W, H);

    // ── Enfants bonus (sur-alimentation) ──────────────────────
    const bonusChildren = [];
    for (const a of this.agents) {
      if (!a.alive) continue;
      if (a.mealCount >= childThreshold) {
        const childBrain = a.brain.clone();
        childBrain.mutate(CONFIG.genetics.mutationRate, CONFIG.genetics.mutationStd);
        const angle = Math.random() * Math.PI * 2;
        const dist  = a.type === 'predator' ? 22 : 18;
        const pos   = this._clampPos(a.x + Math.cos(angle) * dist, a.y + Math.sin(angle) * dist);
        const child = new Agent(a.type, pos.x, pos.y, childBrain);
        child.energy = 0.5;
        bonusChildren.push(child);
        this.birthEvents.push({ x: a.x, y: a.y, ttl: 0.8 });
        this.totalBirths++;
        a.reproductions++;
      }
    }

    // ── Anti-extinction ────────────────────────────────────────
    let newAgents = [...preyEvo.agents, ...predEvo.agents, ...bonusChildren];

    const preyCount2 = newAgents.filter(a => a.type === 'prey').length;
    const predCount2 = newAgents.filter(a => a.type === 'predator').length;

    // Injection si population trop basse
    for (let i = preyCount2; i < minPreyPopulation; i++) {
      newAgents.push(new Agent('prey', Math.random() * W, Math.random() * H));
      this.birthEvents.push({ x: Math.random() * W, y: Math.random() * H, ttl: 0.5 });
    }
    for (let i = predCount2; i < minPredPopulation; i++) {
      newAgents.push(new Agent('predator', Math.random() * W, Math.random() * H));
    }

    // ── Historique ────────────────────────────────────────────
    this.history.push({
      gen:       this.generation,
      preyAvg:   preyEvo.avgFitness,
      preyBest:  preyEvo.bestFitness,
      predAvg:   predEvo.avgFitness,
      predBest:  predEvo.bestFitness,
      preyAlive: preyPool.filter(a => a.alive).length,
      predAlive: predPool.filter(a => a.alive).length,
      births:    this.totalBirths,
    });

    this.generation++;
    this.agents = newAgents;
    this.foods  = [];
    for (let i = 0; i < CONFIG.food.initialCount; i++)
      this.foods.push({ x: Math.random() * W, y: Math.random() * H });
    this.time          = 0;
    this.selectedAgent = null;
    this.birthEvents   = [];
    this.totalBirths   = 0;
  }

  setObstacles(enabled) {
    this.cfg.obstaclesEnabled = enabled;
    this.obstacles = enabled ? this._generateObstacles() : [];
  }

  get preyAlive()  { return this.agents.filter(a => a.type === 'prey'     && a.alive).length; }
  get predAlive()  { return this.agents.filter(a => a.type === 'predator' && a.alive).length; }
  get progress()   { return Math.min(this.time / this.cfg.genDuration, 1); }
}

// Initialiser obstacles (appelé après construction)
Simulation.prototype.obstacles = [];
