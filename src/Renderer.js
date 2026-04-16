import { CONFIG } from './config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  resize(W, H) {
    this.canvas.width  = W;
    this.canvas.height = H;
  }

  _isLight() { return document.documentElement.classList.contains('light'); }
  _panelBg() { return this._isLight() ? '#f0e8df' : '#0d1117'; }

  // ── Rendu principal ─────────────────────────────────────
  draw(sim) {
    const ctx = this.ctx;
    const { W, H } = sim.cfg;
    const light = this._isLight();

    // Fond arène
    ctx.fillStyle = '#456e1c';
    ctx.fillRect(0, 0, W, H);

    // Grille discrète
    ctx.strokeStyle = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Obstacles
    for (const o of sim.obstacles) {
      ctx.fillStyle   = 'rgba(0,0,0,0.35)';
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.roundRect(o.x, o.y, o.w, o.h, 4);
      ctx.fill();
      ctx.stroke();
    }

    // Nourriture
    for (const f of sim.foods) {
      ctx.beginPath();
      ctx.arc(f.x, f.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle   = '#f0c040';
      ctx.shadowBlur  = 6;
      ctx.shadowColor = '#f0c040';
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Cône de vision (avant les agents, pour passer sous eux)
    if (sim.selectedAgent?.alive) this._drawVisionCone(ctx, sim.selectedAgent, sim);

    // Trails
    for (const a of sim.agents) {
      if (!a.alive || a.trail.length < 2) continue;
      const c = a.type === 'prey' ? '80,220,120' : '220,80,80';
      ctx.beginPath();
      ctx.moveTo(a.trail[0].x, a.trail[0].y);
      for (let i = 1; i < a.trail.length; i++) ctx.lineTo(a.trail[i].x, a.trail[i].y);
      ctx.strokeStyle = `rgba(${c},0.15)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Agents
    for (const a of sim.agents) {
      if (!a.alive) continue;
      this._drawAgent(ctx, a, sim.selectedAgent === a, light);
    }

    // Flashs de naissance
    for (const ev of sim.birthEvents) {
      const progress = 1 - ev.ttl / 0.8;
      const radius   = 10 + progress * 28;
      const alpha    = (1 - progress) * 0.8;
      ctx.beginPath();
      ctx.arc(ev.x, ev.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,200,60,${alpha})`;
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ev.x, ev.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,220,80,${alpha})`;
      ctx.fill();
    }

    // Anneau de l'agent sélectionné
    if (sim.selectedAgent?.alive) {
      const a = sim.selectedAgent;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }
  }

  _drawAgent(ctx, a, selected, light) {
    const color = this._energyColor(a.energy, a.type === 'prey', light);

    ctx.beginPath();
    ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    if (selected) { ctx.shadowBlur = 16; ctx.shadowColor = color; }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Orientation
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(a.x + Math.cos(a.angle) * (a.r + 5), a.y + Math.sin(a.angle) * (a.r + 5));
    ctx.strokeStyle = light ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Barre d'énergie
    const bw = a.r * 2.4;
    const bx = a.x - bw / 2;
    const by = a.y - a.r - 7;
    ctx.fillStyle = light ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx, by, bw, 3);
    ctx.fillStyle = a.energy > 0.4 ? '#4ade80' : '#f87171';
    ctx.fillRect(bx, by, bw * Math.max(0, a.energy), 3);
  }

  _energyColor(e, isPrey, light) {
    if (isPrey) {
      if (light) return `rgb(10,${Math.round(100 + e * 60)},30)`;
      return `rgb(40,${Math.round(120 + e * 100)},60)`;
    } else {
      if (light) return `rgb(${Math.round(160 + e * 60)},20,20)`;
      return `rgb(${Math.round(140 + e * 80)},40,40)`;
    }
  }

  _drawVisionCone(ctx, a, sim) {
    const fovRad  = (a.type === 'prey' ? CONFIG.vision.preyFovDeg : CONFIG.vision.predFovDeg) * Math.PI / 180;
    const halfFov = fovRad / 2;
    const range   = CONFIG.vision.range;
    const drawR   = Math.min(range, 180);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.arc(a.x, a.y, drawR, a.angle - halfFov, a.angle + halfFov);
    ctx.closePath();
    const c = a.type === 'prey' ? '80,220,120' : '220,80,80';
    ctx.fillStyle = `rgba(${c},0.06)`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Lignes vers les ennemis effectivement perçus
    const enemies = sim.agents
      .filter(e => e.alive && e.type !== a.type)
      .sort((x, y) => Math.hypot(x.x - a.x, x.y - a.y) - Math.hypot(y.x - a.x, y.y - a.y))
      .slice(0, 3);

    for (let i = 0; i < enemies.length; i++) {
      const e   = enemies[i];
      const dx  = e.x - a.x, dy = e.y - a.y;
      const d   = Math.hypot(dx, dy);
      const rel = normalizeAngle(Math.atan2(dy, dx) - a.angle);
      if (Math.abs(rel) > halfFov || d > range) continue;
      if (rayBlocked(a.x, a.y, e.x, e.y, sim.obstacles)) continue;

      const alpha  = Math.max(0.2, 0.7 - i * 0.2);
      const eColor = a.type === 'prey' ? `rgba(220,80,80,${alpha})` : `rgba(80,220,120,${alpha})`;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(e.x, e.y);
      ctx.strokeStyle = eColor;
      ctx.lineWidth   = 1.2;
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = eColor;
      ctx.lineWidth   = 1;
      ctx.stroke();
    }

    // Plus proche nourriture vue (proies uniquement)
    if (a.type === 'prey' && sim.foods.length > 0) {
      let nf = null, nfd = Infinity;
      for (const f of sim.foods) {
        const d = Math.hypot(f.x - a.x, f.y - a.y);
        if (d < nfd) { nfd = d; nf = f; }
      }
      if (nf) {
        const rel = normalizeAngle(Math.atan2(nf.y - a.y, nf.x - a.x) - a.angle);
        if (Math.abs(rel) <= halfFov && nfd <= range && !rayBlocked(a.x, a.y, nf.x, nf.y, sim.obstacles)) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(nf.x, nf.y);
          ctx.strokeStyle = 'rgba(240,192,64,0.6)';
          ctx.lineWidth   = 1.2;
          ctx.setLineDash([3, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  }

  // ── Visualisation du réseau ─────────────────────────────
  drawNeuralNet(canvas, brain, inputs) {
    if (!brain || !canvas) return;
    const ctx   = canvas.getContext('2d');
    const W     = canvas.width, H = canvas.height;
    const light = this._isLight();

    ctx.fillStyle = this._panelBg();
    ctx.fillRect(0, 0, W, H);

    const layers  = brain.layerSizes;
    const marginX = 30, marginY = 20;
    const usableW = W - marginX * 2;
    const usableH = H - marginY * 2;
    const xStep   = usableW / (layers.length - 1);

    const pos = layers.map((size, li) => {
      const x = marginX + li * xStep;
      const yStep = usableH / (size + 1);
      return Array.from({ length: size }, (_, ni) => ({ x, y: marginY + (ni + 1) * yStep }));
    });

    // Recalcule les activations pour visualisation (toutes passées par tanh pour l'affichage)
    let cur = inputs || new Array(layers[0]).fill(0);
    const acts = [cur];
    for (let l = 0; l < brain.weights.length; l++) {
      const inN = layers[l], outN = layers[l + 1];
      const next = new Array(outN);
      for (let o = 0; o < outN; o++) {
        let s = brain.biases[l][o];
        for (let i = 0; i < inN; i++) s += cur[i] * brain.weights[l][i * outN + o];
        next[o] = Math.tanh(s);
      }
      acts.push(next);
      cur = next;
    }

    // Connexions
    for (let l = 0; l < layers.length - 1; l++) {
      const wM = brain.weights[l];
      const inN = layers[l], outN = layers[l + 1];
      for (let i = 0; i < inN; i++) {
        for (let o = 0; o < outN; o++) {
          const w = wM[i * outN + o];
          const alpha = Math.min(Math.abs(w) * 0.6, 0.5);
          ctx.beginPath();
          ctx.moveTo(pos[l][i].x,     pos[l][i].y);
          ctx.lineTo(pos[l + 1][o].x, pos[l + 1][o].y);
          ctx.strokeStyle = w > 0 ? `rgba(80,200,120,${alpha})` : `rgba(220,80,80,${alpha})`;
          ctx.lineWidth   = Math.min(Math.abs(w) * 1.5, 2);
          ctx.stroke();
        }
      }
    }

    // Neurones
    for (let l = 0; l < layers.length; l++) {
      for (let n = 0; n < layers[l]; n++) {
        const { x, y } = pos[l][n];
        const act = acts[l][n] ?? 0;
        const bright = Math.abs(act);
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = act >= 0 ? `rgba(80,200,120,${0.3 + bright * 0.7})` : `rgba(220,80,80,${0.3 + bright * 0.7})`;
        ctx.fill();
        ctx.strokeStyle = light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth   = 1;
        ctx.stroke();
      }
    }
  }

  drawEmpty(canvas) {
    const ctx = canvas.getContext('2d');
    const light = this._isLight();
    ctx.fillStyle = this._panelBg();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = light ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)';
    ctx.font      = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Cliquez sur un agent',   canvas.width / 2, canvas.height / 2 - 8);
    ctx.fillText('pour voir son réseau',   canvas.width / 2, canvas.height / 2 + 10);
  }
}

// ── helpers ──────────────────────────────────────────────

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
