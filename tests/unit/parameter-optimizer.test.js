const { describe, test, expect } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

// Load the module using dynamic import to support ESM file in project
const modulePath = path.resolve(__dirname, '../../frontend/js/modules/research-tools/ParameterOptimizer.js');

describe('ParameterOptimizer utilities', () => {
  test('expandParamSpace produces expected combinations for small grid', async () => {
    const code = await fs.promises.readFile(modulePath, 'utf8');
    // crude extraction: run module in VM to get expandParamSpace
    const vm = require('vm');
    const sandbox = { module: {}, exports: {}, require, console };
    vm.createContext(sandbox);
    // wrap code to expose expandParamSpace
    const wrapped = `${code}\n;module.exports = { expandParamSpace: typeof expandParamSpace !== 'undefined' ? expandParamSpace : null };`;
    vm.runInContext(wrapped, sandbox);
    const expandParamSpace = sandbox.module.exports.expandParamSpace;
    expect(typeof expandParamSpace).toBe('function');
    const combos = expandParamSpace({ a: [1,2], b: { min: 0, max: 0.5, step: 0.5 } });
    // Expected combos: a x b => 2 * 2 = 4
    expect(combos.length).toBe(4);
    const set = combos.map(c => `${c.a},${c.b}`).sort();
    expect(set).toEqual(['1,0','1,0.5','2,0','2,0.5']);
  });

  test('seeded random sampling is deterministic', async () => {
    const vm = require('vm');
    const code = await fs.promises.readFile(modulePath, 'utf8');
    const sandbox = { module: {}, exports: {}, require, console };
    vm.createContext(sandbox);
    const wrapped = `${code}\n;module.exports = { seededRandom: typeof seededRandom !== 'undefined' ? seededRandom : null };`;
    vm.runInContext(wrapped, sandbox);
    const seededRandom = sandbox.module.exports.seededRandom;
    expect(typeof seededRandom).toBe('function');
    const r1 = seededRandom('seed1')();
    const r2 = seededRandom('seed1')();
    expect(typeof r1).toBe('number');
    // Same seed should produce same first value across constructions
    const s = seededRandom('seed1');
    const r3 = s();
    expect(r1).toBeCloseTo(r3, 8);
  });
});
