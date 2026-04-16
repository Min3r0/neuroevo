import { NeuralNet } from './NeuralNet.js';
import { CONFIG } from './config.js';

const { layerSizes } = CONFIG.network;
const { preyMaxSpeed, predMaxSpeed, turnSpeed, acceleration } = CONFIG.speed;
const { preyBaseDrain, predBaseDrain, speedDrain, preyFoodGain, predKillGain, childStartEnergy } = CONFIG.energy;
const { preyFovDeg, predFovDeg, range } = CONFIG.vision;
const { eatRadius } = CONFIG.food;

export class Agent {
  constructor(type, x, y, brain = null) {
    this.type  = type;
    this.x     = x;
    this.y     = y;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 0;
    this.energy = 1.0;
    this.age    = 0;
    this.fitness = 0;
    this.alive  = true;
    this.brain  = brain || new NeuralNet(layerSizes);
    this.trail  = [];
    this.r      = type === 'prey' ? 5 : 7;
    this.kills  = 0;
    this.foodEaten    = 0;
    this.reproductions = 0;
  }

  sense(agents, foods, obstacles = []) {
    const fovRad  = (this.type === 'prey' ? preyFovDeg : predFovDeg) * Math.PI / 180;
    const halfFov = fovRad / 2;

    const inFov = (target) => {
      const dx  = target.x - this.x, dy = target.y - this.y;
      const d   = Math.sqrt(dx*dx + dy*dy);
      if (d > range) return false;
      const rel = _normalizeAngle(Math.atan2(dy, dx) - this.angle);
      if (Math.abs(rel) > halfFov) return false;
      // Blocage par obstacle (raycasting simplifié)
      return !_rayBlockedByObstacle(this.x, this.y, target.x, target.y, obstacles);
    };

    const others = agents
      .filter(a => a.alive && a.type !== this.type && inFov(a))
      .sort((a, b) => _dist(this, a) - _dist(this, b))
      .slice(0, 3);

    const inputs = [];
    for (let i = 0; i < 3; i++) {
      if (others[i]) {
        const d      = Math.min(_dist(this, others[i]) / range, 1);
        const relAng = _normalizeAngle(Math.atan2(others[i].y - this.y, others[i].x - this.x) - this.angle) / Math.PI;
        inputs.push(d, relAng);
      } else {
        inputs.push(1, 0);
      }
    }

    const foodsInFov = foods
      .filter(f => inFov(f))
      .sort((a, b) => _dist(this, a) - _dist(this, b));
    const nf = foodsInFov[0];
    if (nf) {
      const d      = Math.min(_dist(this, nf) / range, 1);
      const relAng = _normalizeAngle(Math.atan2(nf.y - this.y, nf.x - this.x) - this.angle) / Math.PI;
      inputs.push(d, relAng);
    } else {
      inputs.push(1, 0);
    }

    inputs.push(this.energy, this.speed);
    return inputs;
  }

  update(agents, foods, W, H, dt, obstacles = []) {
    if (!this.alive) return null;

    const inputs = this.sense(agents, foods, obstacles);
    const out    = this.brain.forward(inputs);

    const targetSpeed = (Math.tanh(out[0]) + 1) / 2;
    const turn        = Math.tanh(out[1]) * turnSpeed;
    const maxSpd      = this.type === 'predator' ? predMaxSpeed : preyMaxSpeed;

    this.speed += (targetSpeed - this.speed) * acceleration;
    this.speed  = Math.min(this.speed, maxSpd);
    this.angle += turn;

    this.x += Math.cos(this.angle) * this.speed * dt * 60;
    this.y += Math.sin(this.angle) * this.speed * dt * 60;

    // Bords physiques
    if (this.x < this.r)     { this.x = this.r;     this.angle = Math.PI - this.angle; }
    if (this.x > W - this.r) { this.x = W - this.r; this.angle = Math.PI - this.angle; }
    if (this.y < this.r)     { this.y = this.r;      this.angle = -this.angle; }
    if (this.y > H - this.r) { this.y = H - this.r;  this.angle = -this.angle; }

    // Collision obstacles
    for (const obs of obstacles) {
      const nearX = Math.max(obs.x, Math.min(this.x, obs.x + obs.w));
      const nearY = Math.max(obs.y, Math.min(this.y, obs.y + obs.h));
      const dx = this.x - nearX, dy = this.y - nearY;
      const d  = Math.sqrt(dx*dx + dy*dy);
      if (d < this.r) {
        const nx = dx / (d || 1), ny = dy / (d || 1);
        this.x = nearX + nx * this.r;
        this.y = nearY + ny * this.r;
        const dot = Math.cos(this.angle) * nx + Math.sin(this.angle) * ny;
        this.angle -= 2 * dot * Math.atan2(ny, nx);
      }
    }

    // Drain énergie
    const baseDrain = this.type === 'predator' ? predBaseDrain : preyBaseDrain;
    this.energy -= (baseDrain + this.speed * speedDrain) * dt * 60;
    this.age    += dt;

    // Trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 20) this.trail.shift();

    if (this.energy <= 0) { this.alive = false; return null; }

    let eaten = null, killed = null, reproduce = false;

    // Manger (proie)
    if (this.type === 'prey') {
      for (let i = foods.length - 1; i >= 0; i--) {
        if (_dist(this, foods[i]) < this.r + eatRadius) {
          this.energy += preyFoodGain;
          if (this.energy > 1.0) { reproduce = true; this.energy = 1.0; this.reproductions++; }
          this.foodEaten++;
          eaten = i;
          break;
        }
      }
    }

    // Chasser (prédateur)
    if (this.type === 'predator') {
      for (const prey of agents) {
        if (prey.alive && prey.type === 'prey' && _dist(this, prey) < this.r + prey.r) {
          prey.alive = false;
          this.kills++;
          killed = prey;
          this.energy += predKillGain;
          if (this.energy > 1.0) { reproduce = true; this.energy = 1.0; this.reproductions++; }
          break;
        }
      }
    }

    return { eaten, killed, reproduce };
  }

  computeFitness() {
    const f = this.type === 'prey' ? CONFIG.fitness.prey : CONFIG.fitness.predator;
    if (this.type === 'prey') {
      this.fitness = this.age * f.ageFactor + this.foodEaten * f.foodFactor + this.reproductions * f.reproductionBonus;
    } else {
      this.fitness = this.kills * f.killFactor + this.age * f.ageFactor + this.reproductions * f.reproductionBonus;
    }
    return this.fitness;
  }
}

// ── Helpers ─────────────────────────────────────────────────
function _dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy);
}

function _normalizeAngle(a) {
  while (a >  Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Raycasting : est-ce qu'un segment (ax,ay)→(bx,by) traverse un obstacle ?
function _rayBlockedByObstacle(ax, ay, bx, by, obstacles) {
  for (const obs of obstacles) {
    if (_segmentIntersectsRect(ax, ay, bx, by, obs)) return true;
  }
  return false;
}

function _segmentIntersectsRect(ax, ay, bx, by, r) {
  // Test rapide AABB sur le segment
  if (Math.max(ax, bx) < r.x || Math.min(ax, bx) > r.x + r.w) return false;
  if (Math.max(ay, by) < r.y || Math.min(ay, by) > r.y + r.h) return false;
  // Les 4 côtés du rectangle
  const sides = [
    [r.x,       r.y,       r.x + r.w, r.y      ],
    [r.x + r.w, r.y,       r.x + r.w, r.y + r.h],
    [r.x,       r.y + r.h, r.x + r.w, r.y + r.h],
    [r.x,       r.y,       r.x,       r.y + r.h],
  ];
  for (const [cx, cy, dx, dy] of sides) {
    if (_segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) return true;
  }
  return false;
}

function _segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const denom = (bx-ax)*(dy-cy) - (by-ay)*(dx-cx);
  if (Math.abs(denom) < 1e-10) return false;
  const t = ((cx-ax)*(dy-cy) - (cy-ay)*(dx-cx)) / denom;
  const u = ((cx-ax)*(by-ay) - (cy-ay)*(bx-ax)) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
