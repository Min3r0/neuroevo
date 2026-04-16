import { NeuralNet } from './NeuralNet.js';
import { CONFIG } from './config.js';

const RAD = Math.PI / 180;

export class Agent {
  constructor(type, x, y, brain = null) {
    this.type   = type;          // 'prey' | 'predator'
    this.x = x; this.y = y;
    this.angle  = Math.random() * Math.PI * 2;
    this.speed  = 0;
    this.energy = 1.0;
    this.age    = 0;
    this.fitness = 0;
    this.alive  = true;
    this.brain  = brain || new NeuralNet(CONFIG.network.layerSizes);
    this.trail  = [];
    this.r      = type === 'prey' ? 5 : 7;

    // compteurs de la génération courante
    this.mealCount     = 0;
    this.foodEaten     = 0;
    this.kills         = 0;
    this.reproductions = 0;

    // taille d'arène mise à jour au premier update()
    this._W = 700;
    this._H = 500;
  }

  // ── 14 entrées sensorielles ────────────────────────────
  sense(agents, foods, obstacles = []) {
    const fovRad  = (this.type === 'prey' ? CONFIG.vision.preyFovDeg : CONFIG.vision.predFovDeg) * RAD;
    const halfFov = fovRad / 2;
    const range   = CONFIG.vision.range;

    const inFov = (t) => {
      const dx = t.x - this.x, dy = t.y - this.y;
      const d  = Math.hypot(dx, dy);
      if (d > range) return false;
      const rel = normalizeAngle(Math.atan2(dy, dx) - this.angle);
      if (Math.abs(rel) > halfFov) return false;
      if (obstacles.length && rayBlocked(this.x, this.y, t.x, t.y, obstacles)) return false;
      return true;
    };

    // 0–5 : 3 ennemis visibles (distance + angle relatif)
    const enemies = agents
      .filter(a => a.alive && a.type !== this.type && inFov(a))
      .sort((a, b) => dist2(this, a) - dist2(this, b))
      .slice(0, 3);

    const inputs = [];
    for (let i = 0; i < 3; i++) {
      const e = enemies[i];
      if (e) {
        const d = Math.min(Math.hypot(e.x - this.x, e.y - this.y) / range, 1);
        const rel = normalizeAngle(Math.atan2(e.y - this.y, e.x - this.x) - this.angle) / Math.PI;
        inputs.push(d, rel);
      } else {
        inputs.push(1, 0);
      }
    }

    // 6–7 : nourriture la plus proche dans le champ
    let nf = null, nfd = Infinity;
    for (const f of foods) {
      if (!inFov(f)) continue;
      const d = dist2(this, f);
      if (d < nfd) { nfd = d; nf = f; }
    }
    if (nf) {
      const d = Math.min(Math.hypot(nf.x - this.x, nf.y - this.y) / range, 1);
      const rel = normalizeAngle(Math.atan2(nf.y - this.y, nf.x - this.x) - this.angle) / Math.PI;
      inputs.push(d, rel);
    } else {
      inputs.push(1, 0);
    }

    // 8–10 : énergie des 3 ennemis (0 si absent)
    for (let i = 0; i < 3; i++) inputs.push(enemies[i] ? enemies[i].energy : 0);

    // 11–12 : mur le plus proche (distance + angle relatif)
    const W = this._W, H = this._H;
    const walls = [
      { d: this.x,     ang: Math.PI },
      { d: W - this.x, ang: 0 },
      { d: this.y,     ang: -Math.PI / 2 },
      { d: H - this.y, ang: Math.PI / 2 },
    ];
    let near = walls[0];
    for (const w of walls) if (w.d < near.d) near = w;
    const maxD = Math.min(W, H) / 2;
    inputs.push(Math.min(near.d / maxD, 1));
    inputs.push(normalizeAngle(near.ang - this.angle) / Math.PI);

    // 13 : densité d'alliés proches (rayon 80px, normalisé 0–1)
    let allies = 0;
    for (const a of agents) {
      if (!a.alive || a === this || a.type !== this.type) continue;
      const dx = a.x - this.x, dy = a.y - this.y;
      if (dx * dx + dy * dy < 80 * 80) allies++;
    }
    inputs.push(Math.min(allies / 5, 1));

    return inputs;
  }

  // ── Tick ───────────────────────────────────────────────
  update(agents, foods, W, H, dt, obstacles = []) {
    if (!this.alive) return null;
    this._W = W; this._H = H;

    const out = this.brain.forward(this.sense(agents, foods, obstacles));

    // Sortie 0 → vitesse cible 0..1, sortie 1 → virage ±turnSpeed rad, sortie 2 → réservée
    const targetSpeed = (Math.tanh(out[0]) + 1) / 2;
    const turn        = Math.tanh(out[1]) * CONFIG.speed.turnSpeed;
    const maxSpd      = this.type === 'prey' ? CONFIG.speed.preyMaxSpeed : CONFIG.speed.predMaxSpeed;

    this.speed += (targetSpeed - this.speed) * CONFIG.speed.acceleration;
    this.speed  = Math.min(this.speed, maxSpd);
    this.angle += turn;

    this.x += Math.cos(this.angle) * this.speed * dt * 60;
    this.y += Math.sin(this.angle) * this.speed * dt * 60;

    // Rebond sur les bords
    if (this.x < this.r)     { this.x = this.r;     this.angle = Math.PI - this.angle; }
    if (this.x > W - this.r) { this.x = W - this.r; this.angle = Math.PI - this.angle; }
    if (this.y < this.r)     { this.y = this.r;     this.angle = -this.angle; }
    if (this.y > H - this.r) { this.y = H - this.r; this.angle = -this.angle; }

    // Collision avec obstacles (rectangle)
    for (const o of obstacles) {
      const nx = Math.max(o.x, Math.min(this.x, o.x + o.w));
      const ny = Math.max(o.y, Math.min(this.y, o.y + o.h));
      const dx = this.x - nx, dy = this.y - ny;
      const d  = Math.hypot(dx, dy);
      if (d < this.r) {
        const ux = dx / (d || 1), uy = dy / (d || 1);
        this.x = nx + ux * this.r;
        this.y = ny + uy * this.r;
        const dot = Math.cos(this.angle) * ux + Math.sin(this.angle) * uy;
        this.angle -= 2 * dot * Math.atan2(uy, ux);
      }
    }

    // Drain énergie
    const baseDrain = this.type === 'prey' ? CONFIG.energy.preyBaseDrain : CONFIG.energy.predBaseDrain;
    this.energy -= (baseDrain + this.speed * CONFIG.energy.speedDrain) * dt * 60;
    this.age    += dt;

    // Trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 20) this.trail.shift();

    if (this.energy <= 0) { this.alive = false; return null; }

    let eaten = null, killed = null;

    if (this.type === 'prey') {
      for (let i = foods.length - 1; i >= 0; i--) {
        const f = foods[i];
        const dx = this.x - f.x, dy = this.y - f.y;
        const lim = this.r + CONFIG.food.eatRadius;
        if (dx * dx + dy * dy < lim * lim) {
          this.energy = Math.min(this.energy + CONFIG.energy.preyFoodGain, 1);
          this.foodEaten++;
          this.mealCount++;
          eaten = i;
          break;
        }
      }
    } else {
      for (const p of agents) {
        if (!p.alive || p.type !== 'prey') continue;
        const dx = this.x - p.x, dy = this.y - p.y;
        const lim = this.r + p.r;
        if (dx * dx + dy * dy < lim * lim) {
          p.alive = false;
          this.kills++;
          this.mealCount++;
          this.energy = Math.min(this.energy + CONFIG.energy.predKillGain, 1);
          killed = p;
          break;
        }
      }
    }

    return { eaten, killed };
  }

  computeFitness() {
    const f = this.type === 'prey' ? CONFIG.fitness.prey : CONFIG.fitness.predator;
    const survBonus = this.mealCount >= CONFIG.reproduction.survivalThreshold ? 20 : 0;
    if (this.type === 'prey') {
      this.fitness = this.age * f.ageFactor
        + this.foodEaten * f.foodFactor
        + this.reproductions * f.reproductionBonus
        + survBonus;
    } else {
      this.fitness = this.kills * f.killFactor
        + this.age * f.ageFactor
        + this.reproductions * f.reproductionBonus
        + survBonus;
    }
    return this.fitness;
  }
}

// ── helpers ──────────────────────────────────────────────

function dist2(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function normalizeAngle(a) {
  while (a >  Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function rayBlocked(ax, ay, bx, by, obstacles) {
  for (const o of obstacles) if (segIntersectsRect(ax, ay, bx, by, o)) return true;
  return false;
}

function segIntersectsRect(ax, ay, bx, by, r) {
  if (Math.max(ax, bx) < r.x || Math.min(ax, bx) > r.x + r.w) return false;
  if (Math.max(ay, by) < r.y || Math.min(ay, by) > r.y + r.h) return false;
  const sides = [
    [r.x,         r.y,         r.x + r.w,   r.y        ],
    [r.x + r.w,   r.y,         r.x + r.w,   r.y + r.h  ],
    [r.x,         r.y + r.h,   r.x + r.w,   r.y + r.h  ],
    [r.x,         r.y,         r.x,         r.y + r.h  ],
  ];
  for (const [cx, cy, dx, dy] of sides) {
    const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (Math.abs(d) < 1e-10) continue;
    const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d;
    const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  return false;
}
