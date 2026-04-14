export class StatsChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  draw(history) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    if (history.length < 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('En attente de données...', W / 2, H / 2);
      return;
    }

    const padL = 42, padR = 12, padT = 16, padB = 30;
    const cW = W - padL - padR, cH = H - padT - padB;

    const allVals = history.flatMap(h => [h.preyAvg, h.predAvg, h.preyBest, h.predBest]).filter(v => isFinite(v));
    const maxVal = Math.max(...allVals, 1);
    const n = history.length;

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + cH - (i / 4) * cH;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + cW, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal * i / 4), padL - 4, y + 3);
    }

    // X labels
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px monospace';
    const step = Math.max(1, Math.floor(n / 5));
    for (let i = 0; i < n; i += step) {
      const x = padL + (i / (n - 1)) * cW;
      ctx.fillText(`G${history[i].gen}`, x, H - 8);
    }

    const drawLine = (getData, color, dashed = false) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = dashed ? 1.5 : 2;
      if (dashed) ctx.setLineDash([4, 3]);
      else ctx.setLineDash([]);
      history.forEach((h, i) => {
        const x = padL + (i / (n - 1)) * cW;
        const y = padT + cH - (getData(h) / maxVal) * cH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawLine(h => h.preyBest, 'rgba(80,220,120,0.5)', true);
    drawLine(h => h.preyAvg, 'rgba(80,220,120,1)');
    drawLine(h => h.predBest, 'rgba(220,80,80,0.5)', true);
    drawLine(h => h.predAvg, 'rgba(220,80,80,1)');

    // Legend
    const items = [
      { color: 'rgba(80,220,120,1)', label: 'Proies moy.' },
      { color: 'rgba(220,80,80,1)', label: 'Préd. moy.' },
    ];
    items.forEach((item, i) => {
      const lx = padL + 8 + i * 100;
      ctx.fillStyle = item.color;
      ctx.fillRect(lx, padT + 2, 14, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, lx + 18, padT + 6);
    });
  }
}
