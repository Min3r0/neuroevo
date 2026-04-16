// Reproduction asexuée par clonage.
//   - Top 2 meilleurs élites : clonés sans mutation (passent intacts)
//   - Chaque agent avec mealCount ≥ survivalThreshold pond (mealCount − 1) clones mutés
//   - Anti-extinction : 50/50 cerveau neuf vs clone muté d'un survivant

import { Agent } from './Agent.js';
import { CONFIG } from './config.js';

export class Genetics {
  constructor(cfg = {}) {
    this.mutationRate = cfg.mutationRate ?? CONFIG.genetics.mutationRate;
    this.mutationStd  = cfg.mutationStd  ?? CONFIG.genetics.mutationStd;
  }

  rankPool(pool) {
    if (pool.length === 0) return { sorted: [], avg: 0, best: 0 };
    pool.forEach(a => a.computeFitness());
    pool.sort((a, b) => b.fitness - a.fitness);
    const avg  = pool.reduce((s, a) => s + a.fitness, 0) / pool.length;
    const best = pool[0].fitness;
    return { sorted: pool, avg, best };
  }

  cloneMutated(parent) {
    const b = parent.brain.clone();
    b.mutate(this.mutationRate, this.mutationStd);
    return b;
  }

  // Agent d'injection anti-extinction : 50% neuf, 50% clone muté d'un survivant
  spawnExtinctionAgent(type, pool, x, y) {
    if (pool.length > 0 && Math.random() < 0.5) {
      const parent = pool[Math.floor(Math.random() * pool.length)];
      return new Agent(type, x, y, this.cloneMutated(parent));
    }
    return new Agent(type, x, y);
  }
}
