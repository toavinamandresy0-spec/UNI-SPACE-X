import ParameterOptimizer from './ParameterOptimizer.js';

// Exemple d'utilisation minimal pour le navigateur ou node (avec bundler)
(async () => {
  // Evaluator simulé : retourne score = - (lr - 0.01)^2 - depth
  const evaluator = async (params) => {
    const lr = params.lr || 0.01;
    const depth = params.depth || 1;
    const score = -Math.pow(lr - 0.01, 2) - depth * 0.1;
    return { score, details: { lr, depth } };
  };

  const optimizer = new ParameterOptimizer({
    paramSpace: {
      lr: { min: 0.001, max: 0.02, step: 0.001 },
      depth: [1, 2, 3]
    },
    evaluator,
    strategy: 'random',
    maxIter: 30,
    parallel: 4,
    seed: 'example-seed',
    onProgress: ({ tried, total, best }) => {
      console.log(`Progress: ${tried}/${total}`);
      if (best) console.log('Current best:', best.score, best.params);
    }
  });

  const result = await optimizer.run();
  console.log('Final best:', result.best);
})();
