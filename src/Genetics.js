import { CONFIG } from './config.js';
import { NeuralNet } from './NeuralNet.js';
import { Agent } from './Agent.js';

export class Genetics {
  constructor(cfg) {
    this.eliteRatio  = cfg.eliteRatio  ?? CONFIG.genetics.eliteRatio;
    this.mutationRate = cfg.mutationRate ?? CONFIG.genetics.mutationRate;
    this.mutationStd  = cfg.mutationStd  ?? CONFIG.genetics.mutationStd;
  }

  evolve(agents, type, popSize, W, H) {
    const { survivalThreshold } = CONFIG.reproduction;

    // Seuls les agents ayant mangé assez sont éligibles à la reproduction
    const survivors = agents.filter(a => a.type === type && a.mealCount >= survivalThreshold);
    // Les autres participent quand même au pool si pas assez de survivants
    const fallback  = agents.filter(a => a.type === type && a.mealCount < survivalThreshold);
    const pool      = survivors.length >= 2 ? survivors : [...survivors, ...fallback];

    pool.forEach(a => a.computeFitness());
    pool.sort((a, b) => b.fitness - a.fitness);

    const eliteCount = Math.max(2, Math.floor(pool.length * this.eliteRatio));
    const elites = pool.slice(0, eliteCount);

    const avgFitness = pool.reduce((s, a) => s + a.fitness, 0) / (pool.length || 1);
    const bestFitness = elites[0]?.fitness ?? 0;

    const newAgents = [];

    // Keep top 2 (elitism)
    for (let i = 0; i < Math.min(2, elites.length); i++) {
      const a = new Agent(type, Math.random() * W, Math.random() * H, elites[i].brain.clone());
      newAgents.push(a);
    }

    while (newAgents.length < popSize) {
      const parentA = this._tournamentSelect(elites);
      const parentB = this._tournamentSelect(elites);
      const childBrain = NeuralNet.crossover(parentA.brain, parentB.brain);
      childBrain.mutate(this.mutationRate, this.mutationStd);
      newAgents.push(new Agent(type, Math.random() * W, Math.random() * H, childBrain));
    }

    return { agents: newAgents, avgFitness, bestFitness };
  }

  _tournamentSelect(pool, k = CONFIG.genetics.tournamentSize) {
    let best = null;
    for (let i = 0; i < k; i++) {
      const candidate = pool[Math.floor(Math.random() * pool.length)];
      if (!best || candidate.fitness > best.fitness) best = candidate;
    }
    return best;
  }
}
