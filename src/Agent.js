import { NeuralNet } from './NeuralNet.js';

const LAYER_SIZES = [8, 12, 8, 3];

export class Agent {
  constructor(type, x, y, brain = null) {
    this.type = type; // 'prey' | 'predator'
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 0;
    this.energy = 1.0;
    this.age = 0;
    this.fitness = 0;
    this.alive = true;
    this.brain = brain || new NeuralNet(LAYER_SIZES);
    this.trail = [];
    this.r = type === 'prey' ? 5 : 7;
    this.kills = 0;
    this.foodEaten = 0;
  }

  sense(agents, foods, W, H) {
    // Find nearest 3 of opposite type
    const others = agents.filter(a => a.alive && a.type !== this.type);
    others.sort((a, b) => dist(this, a) - dist(this, b));
    const nearest = others.slice(0, 3);

    const inputs = [];
    for (let i = 0; i < 3; i++) {
      if (nearest[i]) {
        const d = Math.min(dist(this, nearest[i]) / 300, 1);
        const ang = angleTo(this, nearest[i]);
        const relAng = normalizeAngle(ang - this.angle) / Math.PI;
        inputs.push(d, relAng);
      } else {
        inputs.push(1, 0);
      }
    }

    // Nearest food
    const nearFood = foods.slice().sort((a, b) => dist(this, a) - dist(this, b))[0];
    if (nearFood) {
      const d = Math.min(dist(this, nearFood) / 300, 1);
      const ang = angleTo(this, nearFood);
      inputs.push(d, normalizeAngle(ang - this.angle) / Math.PI);
    } else {
      inputs.push(1, 0);
    }

    inputs.push(this.energy);
    inputs.push(this.speed);
    return inputs;
  }

  update(agents, foods, W, H, dt) {
    if (!this.alive) return null;

    const inputs = this.sense(agents, foods, W, H);
    const out = this.brain.forward(inputs);

    // Outputs: speed, turn, action
    const targetSpeed = (Math.tanh(out[0]) + 1) / 2;
    const turn = Math.tanh(out[1]) * 0.12;
    const action = out[2] > 0.5;

    this.speed += (targetSpeed - this.speed) * 0.15;
    this.speed = Math.min(this.speed, this.type === 'predator' ? 2.2 : 2.8);
    this.angle += turn;

    this.x += Math.cos(this.angle) * this.speed * dt * 60;
    this.y += Math.sin(this.angle) * this.speed * dt * 60;

    // Wrap
    this.x = ((this.x % W) + W) % W;
    this.y = ((this.y % H) + H) % H;

    // Energy drain
    this.energy -= (0.0003 + this.speed * 0.0002) * dt * 60;
    this.age += dt;

    // Trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 20) this.trail.shift();

    if (this.energy <= 0) {
      this.alive = false;
      return null;
    }

    // Eat food
    let eaten = null;
    if (this.type === 'prey') {
      for (let i = foods.length - 1; i >= 0; i--) {
        if (dist(this, foods[i]) < this.r + 4) {
          this.energy = Math.min(1, this.energy + 0.25);
          this.foodEaten++;
          eaten = i;
          break;
        }
      }
    }

    // Hunt
    let killed = null;
    if (this.type === 'predator') {
      for (const prey of agents) {
        if (prey.alive && prey.type === 'prey' && dist(this, prey) < this.r + prey.r) {
          prey.alive = false;
          this.energy = Math.min(1, this.energy + 0.5);
          this.kills++;
          killed = prey;
          break;
        }
      }
    }

    return { eaten, killed };
  }

  computeFitness() {
    if (this.type === 'prey') {
      this.fitness = this.age * 8 + this.foodEaten * 5;
    } else {
      this.fitness = this.kills * 20 + this.age * 2;
    }
    return this.fitness;
  }
}

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function angleTo(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
