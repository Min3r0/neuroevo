import { Agent } from './Agent.js';
import { Genetics } from './Genetics.js';

export class Simulation {
  constructor(cfg) {
    this.cfg = {
      preyCount: cfg.preyCount ?? 40,
      predCount: cfg.predCount ?? 15,
      genDuration: cfg.genDuration ?? 25,
      foodSpawnRate: cfg.foodSpawnRate ?? 0.4,
      eliteRatio: cfg.eliteRatio ?? 0.20,
      mutationRate: cfg.mutationRate ?? 0.05,
      mutationStd: cfg.mutationStd ?? 0.15,
      W: cfg.W ?? 700,
      H: cfg.H ?? 500,
    };
    this.genetics = new Genetics(this.cfg);
    this.generation = 0;
    this.time = 0;
    this.agents = [];
    this.foods = [];
    this.history = [];
    this.selectedAgent = null;
    this._init();
  }

  _init() {
    const { preyCount, predCount, W, H } = this.cfg;
    this.agents = [];
    for (let i = 0; i < preyCount; i++) this.agents.push(new Agent('prey', Math.random() * W, Math.random() * H));
    for (let i = 0; i < predCount; i++) this.agents.push(new Agent('predator', Math.random() * W, Math.random() * H));
    this.foods = [];
    for (let i = 0; i < 30; i++) this.foods.push({ x: Math.random() * W, y: Math.random() * H });
    this.time = 0;
  }

  tick(dt) {
    const { W, H, genDuration, foodSpawnRate } = this.cfg;

    // Spawn food
    if (Math.random() < foodSpawnRate * dt) {
      this.foods.push({ x: Math.random() * W, y: Math.random() * H });
      if (this.foods.length > 80) this.foods.shift();
    }

    // Update agents
    for (const agent of this.agents) {
      if (!agent.alive) continue;
      const result = agent.update(this.agents, this.foods, W, H, dt);
      if (result?.eaten != null) this.foods.splice(result.eaten, 1);
    }

    this.time += dt;

    // Next generation
    if (this.time >= genDuration) {
      this._nextGeneration();
    }
  }

  _nextGeneration() {
    const { preyCount, predCount, W, H } = this.cfg;

    const preyEvo = this.genetics.evolve(this.agents, 'prey', preyCount, W, H);
    const predEvo = this.genetics.evolve(this.agents, 'predator', predCount, W, H);

    this.history.push({
      gen: this.generation,
      preyAvg: preyEvo.avgFitness,
      preyBest: preyEvo.bestFitness,
      predAvg: predEvo.avgFitness,
      predBest: predEvo.bestFitness,
      preyAlive: this.agents.filter(a => a.type === 'prey' && a.alive).length,
      predAlive: this.agents.filter(a => a.type === 'predator' && a.alive).length,
    });

    this.generation++;
    this.agents = [...preyEvo.agents, ...predEvo.agents];
    this.foods = [];
    for (let i = 0; i < 30; i++) this.foods.push({ x: Math.random() * W, y: Math.random() * H });
    this.time = 0;
    this.selectedAgent = null;
  }

  get preyAlive() { return this.agents.filter(a => a.type === 'prey' && a.alive).length; }
  get predAlive() { return this.agents.filter(a => a.type === 'predator' && a.alive).length; }
  get progress() { return Math.min(this.time / this.cfg.genDuration, 1); }
}
