// Réseau feed-forward fully-connected.
// Activation : tanh sur les couches cachées, linéaire sur la couche de sortie.
// (Le mapping des sorties — vitesse [0,1], virage borné — est fait côté Agent.)

export class NeuralNet {
  constructor(layerSizes) {
    this.layerSizes = layerSizes;
    this.weights = [];
    this.biases  = [];
    for (let l = 0; l < layerSizes.length - 1; l++) {
      const inN = layerSizes[l], outN = layerSizes[l + 1];
      const w = new Array(inN * outN);
      for (let i = 0; i < w.length; i++) w[i] = (Math.random() * 2 - 1) * 0.5;
      this.weights.push(w);
      this.biases.push(new Array(outN).fill(0));
    }
  }

  forward(inputs) {
    let cur = inputs.slice();
    for (let l = 0; l < this.weights.length; l++) {
      const inN = this.layerSizes[l], outN = this.layerSizes[l + 1];
      const isLast = l === this.weights.length - 1;
      const next = new Array(outN);
      for (let o = 0; o < outN; o++) {
        let s = this.biases[l][o];
        for (let i = 0; i < inN; i++) s += cur[i] * this.weights[l][i * outN + o];
        next[o] = isLast ? s : Math.tanh(s);
      }
      cur = next;
    }
    return cur;
  }

  clone() {
    const n = new NeuralNet(this.layerSizes);
    n.weights = this.weights.map(w => w.slice());
    n.biases  = this.biases.map(b => b.slice());
    return n;
  }

  mutate(rate, std) {
    for (let l = 0; l < this.weights.length; l++) {
      const w = this.weights[l], b = this.biases[l];
      for (let i = 0; i < w.length; i++) if (Math.random() < rate) w[i] += gauss() * std;
      for (let i = 0; i < b.length; i++) if (Math.random() < rate) b[i] += gauss() * std;
    }
  }
}

function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
