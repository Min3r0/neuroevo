import { Simulation } from './Simulation.js';
import { Renderer } from './Renderer.js';
import { StatsChart } from './Stats.js';

const arenaCanvas = document.getElementById('arena');
const netCanvas   = document.getElementById('net-canvas');
const chartCanvas = document.getElementById('chart-canvas');

const sim = new Simulation({
  W: arenaCanvas.clientWidth  || 700,
  H: arenaCanvas.clientHeight || 460,
});

const renderer = new Renderer(arenaCanvas);
renderer.resize(sim.cfg.W, sim.cfg.H);

const chart = new StatsChart(chartCanvas);

let paused   = false;
let speed    = 1;
let lastTime = null;

// ── UI bindings ──────────────────────────────────────
document.getElementById('btn-pause').addEventListener('click', () => {
  paused = !paused;
  document.getElementById('btn-pause').textContent = paused ? '▶ Reprendre' : '⏸ Pause';
});

document.getElementById('speed-slider').addEventListener('input', e => {
  speed = +e.target.value;
  document.getElementById('speed-label').textContent = `×${speed}`;
});

['prey-count','pred-count','mutation-rate','elite-ratio'].forEach(id => {
  const el  = document.getElementById(id);
  const lbl = document.getElementById(id + '-val');
  if (!el) return;
  el.addEventListener('input', () => { lbl.textContent = el.value; applyParams(); });
});

function applyParams() {
  sim.cfg.preyCount        = +document.getElementById('prey-count').value;
  sim.cfg.predCount        = +document.getElementById('pred-count').value;
  sim.genetics.mutationRate = +document.getElementById('mutation-rate').value;
  sim.genetics.eliteRatio   = +document.getElementById('elite-ratio').value;
}

// Click to select agent
arenaCanvas.addEventListener('click', e => {
  const rect = arenaCanvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (sim.cfg.W / rect.width);
  const my = (e.clientY - rect.top)  * (sim.cfg.H / rect.height);
  let best = null, bestD = 20;
  for (const a of sim.agents) {
    if (!a.alive) continue;
    const d = Math.hypot(a.x - mx, a.y - my);
    if (d < bestD) { bestD = d; best = a; }
  }
  sim.selectedAgent = best;
  updateNetInfo();
});

function updateNetInfo() {
  const a    = sim.selectedAgent;
  const info = document.getElementById('net-info');
  if (!a) { info.textContent = 'Cliquez sur un agent pour voir son réseau'; return; }
  info.textContent = `${a.type === 'prey' ? '🟢 Proie' : '🔴 Prédateur'} · Énergie: ${(a.energy * 100).toFixed(0)}% · Fitness: ${a.fitness.toFixed(1)} · Âge: ${a.age.toFixed(1)}s`;
}

function updateStats() {
  const last = sim.history[sim.history.length - 1];

  document.getElementById('stat-gen').textContent        = sim.generation;
  document.getElementById('stat-prey').textContent       = sim.preyAlive;
  document.getElementById('stat-pred').textContent       = sim.predAlive;
  document.getElementById('stat-time').textContent       = sim.time.toFixed(1) + 's';
  document.getElementById('stat-live-births').textContent = sim.totalBirths;
  document.getElementById('progress-bar').style.width   = (sim.progress * 100).toFixed(1) + '%';

  if (last) {
    document.getElementById('stat-prey-fit').textContent  = last.preyAvg.toFixed(1);
    document.getElementById('stat-pred-fit').textContent  = last.predAvg.toFixed(1);
    document.getElementById('stat-prey-best').textContent = last.preyBest.toFixed(1);
    document.getElementById('stat-pred-best').textContent = last.predBest.toFixed(1);
    document.getElementById('stat-births').textContent    = last.births ?? 0;
  }
}

// ── Game loop ────────────────────────────────────────
function loop(ts) {
  if (lastTime === null) lastTime = ts;
  const rawDt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (!paused) {
    for (let s = 0; s < speed; s++) sim.tick(rawDt);
  }

  renderer.draw(sim);

  if (sim.selectedAgent?.alive) {
    const inputs = sim.selectedAgent.sense(sim.agents, sim.foods, sim.cfg.W, sim.cfg.H);
    renderer.drawNeuralNet(netCanvas, sim.selectedAgent.brain, inputs);
    updateNetInfo();
  } else {
    renderer.drawEmpty(netCanvas); // utilise la méthode du renderer, thème compris
  }

  chart.draw(sim.history);
  updateStats();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);