export class NeuralNet {
  constructor(layerSizes) {
    this.layerSizes = layerSizes;
    this.weights = [];
    this.biases = [];
    for (let i = 0; i < layerSizes.length - 1; i++) {
      const w = [];
      for (let j = 0; j < layerSizes[i] * layerSizes[i + 1]; j++) {
        w.push((Math.random() * 2 - 1) * 0.5);
      }
      this.weights.push(w);
      const b = [];
      for (let j = 0; j < layerSizes[i + 1]; j++) b.push(0);
      this.biases.push(b);
    }
  }

  forward(inputs) {
    let current = [...inputs];
    for (let l = 0; l < this.weights.length; l++) {
      const next = [];
      const inSize = this.layerSizes[l];
      const outSize = this.layerSizes[l + 1];
      for (let o = 0; o < outSize; o++) {
        let sum = this.biases[l][o];
        for (let i = 0; i < inSize; i++) sum += current[i] * this.weights[l][i * outSize + o];
        next.push(l < this.weights.length - 1 ? Math.tanh(sum) : sum);
      }
      current = next;
    }
    return current;
  }

  clone() {
    const n = new NeuralNet(this.layerSizes);
    n.weights = this.weights.map(w => [...w]);
    n.biases = this.biases.map(b => [...b]);
    return n;
  }

  static crossover(a, b) {
    const child = a.clone();
    for (let l = 0; l < child.weights.length; l++) {
      for (let i = 0; i < child.weights[l].length; i++) {
        if (Math.random() < 0.5) child.weights[l][i] = b.weights[l][i];
      }
      for (let i = 0; i < child.biases[l].length; i++) {
        if (Math.random() < 0.5) child.biases[l][i] = b.biases[l][i];
      }
    }
    return child;
  }

  mutate(rate = 0.05, std = 0.15) {
    for (let l = 0; l < this.weights.length; l++) {
      for (let i = 0; i < this.weights[l].length; i++) {
        if (Math.random() < rate) this.weights[l][i] += this._gaussian() * std;
      }
      for (let i = 0; i < this.biases[l].length; i++) {
        if (Math.random() < rate) this.biases[l][i] += this._gaussian() * std;
      }
    }
  }

  _gaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}
