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
      maxPredators: cfg.maxPredators ?? 40,
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
    this.birthEvents = [];
    this.totalBirths = 0;
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
    this.birthEvents = [];
  }

  tick(dt) {
    const { W, H, genDuration, foodSpawnRate, maxPredators } = this.cfg;

    // Spawn food
    if (Math.random() < foodSpawnRate * dt) {
      this.foods.push({ x: Math.random() * W, y: Math.random() * H });
      if (this.foods.length > 80) this.foods.shift();
    }

    // Snapshot so mid-tick births don't run this tick
    const snapshot = this.agents.slice();
    const currentPredCount = snapshot.filter(a => a.type === 'predator' && a.alive).length;

    for (const agent of snapshot) {
      if (!agent.alive) continue;
      const result = agent.update(this.agents, this.foods, W, H, dt);
      if (result?.eaten != null) this.foods.splice(result.eaten, 1);

      // Live reproduction: predator ate while already full
      if (result?.reproduce && currentPredCount < maxPredators) {
        const childBrain = agent.brain.clone();
        childBrain.mutate(0.08, 0.12);

        const offsetAngle = Math.random() * Math.PI * 2;
        const child = new Agent(
          'predator',
          ((agent.x + Math.cos(offsetAngle) * 22 + W) % W),
          ((agent.y + Math.sin(offsetAngle) * 22 + H) % H),
          childBrain
        );
        child.energy = 0.5;
        child.angle = agent.angle + (Math.random() - 0.5) * 0.8;
        this.agents.push(child);

        this.birthEvents.push({ x: agent.x, y: agent.y, ttl: 0.7 });
        this.totalBirths++;
      }
    }

    // Decay birth events
    for (let i = this.birthEvents.length - 1; i >= 0; i--) {
      this.birthEvents[i].ttl -= dt;
      if (this.birthEvents[i].ttl <= 0) this.birthEvents.splice(i, 1);
    }

    this.time += dt;

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
      births: this.totalBirths,
    });

    this.generation++;
    this.agents = [...preyEvo.agents, ...predEvo.agents];
    this.foods = [];
    for (let i = 0; i < 30; i++) this.foods.push({ x: Math.random() * W, y: Math.random() * H });
    this.time = 0;
    this.selectedAgent = null;
    this.birthEvents = [];
    this.totalBirths = 0;
  }

  get preyAlive() { return this.agents.filter(a => a.type === 'prey' && a.alive).length; }
  get predAlive() { return this.agents.filter(a => a.type === 'predator' && a.alive).length; }
  get progress() { return Math.min(this.time / this.cfg.genDuration, 1); }
}
