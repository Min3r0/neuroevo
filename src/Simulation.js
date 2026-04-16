import { CONFIG } from './config.js';
import { Agent } from './Agent.js';
import { Genetics } from './Genetics.js';

export class Simulation {
  constructor(cfg) {
    this.cfg = {
      preyCount:    cfg.preyCount    ?? CONFIG.population.preyCount,
      predCount:    cfg.predCount    ?? CONFIG.population.predCount,
      genDuration:  cfg.genDuration  ?? CONFIG.time.genDuration,
      foodSpawnRate: cfg.foodSpawnRate ?? CONFIG.food.spawnRate,
      eliteRatio:   cfg.eliteRatio   ?? CONFIG.genetics.eliteRatio,
      mutationRate: cfg.mutationRate ?? CONFIG.genetics.mutationRate,
      mutationStd:  cfg.mutationStd  ?? CONFIG.genetics.mutationStd,
      maxPredators: cfg.maxPredators ?? CONFIG.population.maxPredators,
      maxPrey:      cfg.maxPrey      ?? CONFIG.population.maxPrey,
      obstaclesEnabled: cfg.obstaclesEnabled ?? CONFIG.obstacles.enabled,
      W: cfg.W ?? 700,
      H: cfg.H ?? 500,
    };
    this.genetics    = new Genetics(this.cfg);
    this.generation  = 0;
    this.time        = 0;
    this.agents      = [];
    this.foods       = [];
    this.history     = [];
    this.selectedAgent = null;
    this.birthEvents = [];
    this.totalBirths = 0;
    this._init();
  }

  _init() {
    const { preyCount, predCount, W, H } = this.cfg;
    this.agents = [];
    for (let i = 0; i < preyCount; i++) this.agents.push(new Agent('prey',      Math.random() * W, Math.random() * H));
    for (let i = 0; i < predCount; i++) this.agents.push(new Agent('predator',  Math.random() * W, Math.random() * H));
    this.foods = [];
    for (let i = 0; i < 30; i++) this.foods.push({ x: Math.random() * W, y: Math.random() * H });
    this.time        = 0;
    this.birthEvents = [];
    this.obstacles   = this.cfg.obstaclesEnabled ? this._generateObstacles() : [];
  }

  _generateObstacles() {
    const { W, H } = this.cfg;
    const obs = [];
    const candidates = [
      { x: W*0.2, y: H*0.15, w: 80, h: 18 },
      { x: W*0.6, y: H*0.15, w: 80, h: 18 },
      { x: W*0.1, y: H*0.45, w: 18, h: 90 },
      { x: W*0.75,y: H*0.40, w: 18, h: 90 },
      { x: W*0.35,y: H*0.65, w: 110,h: 18 },
      { x: W*0.55,y: H*0.30, w: 18, h: 70 },
    ];
    for (const c of candidates) {
      obs.push({ x: Math.round(c.x), y: Math.round(c.y), w: c.w, h: c.h });
    }
    return obs;
  }

  // Clamp position inside the arena (bords physiques, pas de wrap)
  _clampPos(x, y) {
    const { W, H } = this.cfg;
    return {
      x: Math.max(8, Math.min(W - 8, x)),
      y: Math.max(8, Math.min(H - 8, y)),
    };
  }

  _spawnChild(type, parent) {
    const offsetAngle = Math.random() * Math.PI * 2;
    const dist = type === 'predator' ? 22 : 18;
    const pos  = this._clampPos(
      parent.x + Math.cos(offsetAngle) * dist,
      parent.y + Math.sin(offsetAngle) * dist
    );
    const childBrain = parent.brain.clone();
    childBrain.mutate(CONFIG.genetics.liveMutationRate, CONFIG.genetics.liveMutationStd);
    const child = new Agent(type, pos.x, pos.y, childBrain);
    child.energy = 0.5;
    child.angle  = parent.angle + (Math.random() - 0.5) * 0.8;
    return child;
  }

  tick(dt) {
    const { W, H, genDuration, foodSpawnRate, maxPredators, maxPrey } = this.cfg;

    // Spawn food
    if (Math.random() < foodSpawnRate * dt) {
      this.foods.push({ x: Math.random() * W, y: Math.random() * H });
      if (this.foods.length > 80) this.foods.shift();
    }

    const snapshot        = this.agents.slice();
    const currentPredCount = snapshot.filter(a => a.type === 'predator' && a.alive).length;
    const currentPreyCount = snapshot.filter(a => a.type === 'prey'     && a.alive).length;

    for (const agent of snapshot) {
      if (!agent.alive) continue;
      const result = agent.update(this.agents, this.foods, W, H, dt, this.obstacles);
      if (result?.eaten != null) this.foods.splice(result.eaten, 1);

      if (result?.reproduce) {
        if (agent.type === 'prey' && currentPreyCount < maxPrey) {
          const child = this._spawnChild('prey', agent);
          this.agents.push(child);
          this.birthEvents.push({ x: agent.x, y: agent.y, ttl: 0.7 });
          this.totalBirths++;
        }
        if (agent.type === 'predator' && currentPredCount < maxPredators) {
          const child = this._spawnChild('predator', agent);
          this.agents.push(child);
          this.birthEvents.push({ x: agent.x, y: agent.y, ttl: 0.7 });
          this.totalBirths++;
        }
      }
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

    const preyEvo = this.genetics.evolve(this.agents, 'prey',      preyCount, W, H);
    const predEvo = this.genetics.evolve(this.agents, 'predator',  predCount, W, H);

    this.history.push({
      gen:       this.generation,
      preyAvg:   preyEvo.avgFitness,
      preyBest:  preyEvo.bestFitness,
      predAvg:   predEvo.avgFitness,
      predBest:  predEvo.bestFitness,
      preyAlive: this.agents.filter(a => a.type === 'prey'     && a.alive).length,
      predAlive: this.agents.filter(a => a.type === 'predator' && a.alive).length,
      births:    this.totalBirths,
    });

    this.generation++;
    this.agents = [...preyEvo.agents, ...predEvo.agents];
    this.foods  = [];
    for (let i = 0; i < 30; i++) this.foods.push({ x: Math.random() * W, y: Math.random() * H });
    this.time          = 0;
    this.selectedAgent = null;
    this.birthEvents   = [];
    this.totalBirths   = 0;
  }

  setObstacles(enabled) {
    this.cfg.obstaclesEnabled = enabled;
    this.obstacles = enabled ? this._generateObstacles() : [];
  }

  get preyAlive() { return this.agents.filter(a => a.type === 'prey'     && a.alive).length; }
  get predAlive() { return this.agents.filter(a => a.type === 'predator' && a.alive).length; }
  get progress()  { return Math.min(this.time / this.cfg.genDuration, 1); }
}
