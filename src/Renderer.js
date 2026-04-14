export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  resize(W, H) {
    this.canvas.width = W;
    this.canvas.height = H;
  }

  draw(sim) {
    const ctx = this.ctx;
    const { W, H } = sim.cfg;

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Food
    for (const f of sim.foods) {
      ctx.beginPath();
      ctx.arc(f.x, f.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#f0c040';
      ctx.fill();
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#f0c040';
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Trails
    for (const a of sim.agents) {
      if (!a.alive || a.trail.length < 2) continue;
      const color = a.type === 'prey' ? '80,220,120' : '220,80,80';
      ctx.beginPath();
      ctx.moveTo(a.trail[0].x, a.trail[0].y);
      for (let i = 1; i < a.trail.length; i++) ctx.lineTo(a.trail[i].x, a.trail[i].y);
      ctx.strokeStyle = `rgba(${color},0.15)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Agents
    for (const a of sim.agents) {
      if (!a.alive) continue;
      const selected = sim.selectedAgent === a;
      this._drawAgent(ctx, a, selected);
    }

    // Birth flash events
    for (const ev of sim.birthEvents) {
      const progress = 1 - ev.ttl / 0.7;
      const radius = 10 + progress * 28;
      const alpha = (1 - progress) * 0.8;
      ctx.beginPath();
      ctx.arc(ev.x, ev.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,200,60,${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Inner glow
      ctx.beginPath();
      ctx.arc(ev.x, ev.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,220,80,${alpha})`;
      ctx.fill();
    }

    // Selection highlight
    if (sim.selectedAgent?.alive) {
      const a = sim.selectedAgent;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r + 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  _drawAgent(ctx, a, selected) {
    const isPrey = a.type === 'prey';
    const energyColor = this._energyColor(a.energy, isPrey);

    // Body
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
    ctx.fillStyle = energyColor;
    if (selected) { ctx.shadowBlur = 16; ctx.shadowColor = energyColor; }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Direction indicator
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(
      a.x + Math.cos(a.angle) * (a.r + 5),
      a.y + Math.sin(a.angle) * (a.r + 5)
    );
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Energy bar
    const bw = a.r * 2.4;
    const bx = a.x - bw / 2;
    const by = a.y - a.r - 7;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx, by, bw, 3);
    ctx.fillStyle = a.energy > 0.4 ? '#4ade80' : '#f87171';
    ctx.fillRect(bx, by, bw * a.energy, 3);
  }

  _energyColor(e, isPrey) {
    if (isPrey) {
      const g = Math.round(120 + e * 100);
      return `rgb(40,${g},60)`;
    } else {
      const r = Math.round(140 + e * 80);
      return `rgb(${r},40,40)`;
    }
  }

  drawNeuralNet(canvas, brain, inputs) {
    if (!brain || !canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    const layers = brain.layerSizes;
    const marginX = 30, marginY = 20;
    const usableW = W - marginX * 2;
    const usableH = H - marginY * 2;
    const xStep = usableW / (layers.length - 1);

    // Precompute positions
    const positions = layers.map((size, li) => {
      const x = marginX + li * xStep;
      const yStep = usableH / (size + 1);
      return Array.from({ length: size }, (_, ni) => ({ x, y: marginY + (ni + 1) * yStep }));
    });

    // Compute activations
    let activations = [inputs || Array(layers[0]).fill(0)];
    let current = activations[0];
    for (let l = 0; l < brain.weights.length; l++) {
      const next = [];
      const inSize = layers[l], outSize = layers[l + 1];
      for (let o = 0; o < outSize; o++) {
        let sum = brain.biases[l][o];
        for (let i = 0; i < inSize; i++) sum += current[i] * brain.weights[l][i * outSize + o];
        next.push(Math.tanh(sum));
      }
      activations.push(next);
      current = next;
    }

    // Draw connections
    for (let l = 0; l < layers.length - 1; l++) {
      const wMatrix = brain.weights[l];
      const inSize = layers[l], outSize = layers[l + 1];
      for (let i = 0; i < inSize; i++) {
        for (let o = 0; o < outSize; o++) {
          const w = wMatrix[i * outSize + o];
          const alpha = Math.min(Math.abs(w) * 0.6, 0.5);
          const color = w > 0 ? `rgba(80,200,120,${alpha})` : `rgba(220,80,80,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(positions[l][i].x, positions[l][i].y);
          ctx.lineTo(positions[l + 1][o].x, positions[l + 1][o].y);
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.min(Math.abs(w) * 1.5, 2);
          ctx.stroke();
        }
      }
    }

    // Draw neurons
    for (let l = 0; l < layers.length; l++) {
      for (let n = 0; n < layers[l]; n++) {
        const { x, y } = positions[l][n];
        const act = activations[l][n] ?? 0;
        const bright = Math.abs(act);
        const color = act >= 0 ? `rgba(80,200,120,${0.3 + bright * 0.7})` : `rgba(220,80,80,${0.3 + bright * 0.7})`;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}
