/*
ParameterOptimizer

Usage:
	- paramSpace: object mapping parameter name -> array of possible values OR {min, max, step} range descriptor
		ex: { lr: {min: 0.001, max: 0.1, step: 0.001}, depth: [1,2,3,4] }
	- evaluator: async function(params) -> numeric score (higher = better) or { score, metrics }
	- strategy: 'random' | 'grid'
	- maxIter: number of evaluations (for random)
	- onProgress: optional callback({ tried, total, best }) called after each evaluation

This module is intentionally framework-agnostic and runs in the browser.
*/

function cartesianProduct(arrays) {
	return arrays.reduce((acc, arr) => {
		const res = [];
		for (const a of acc) for (const b of arr) res.push(a.concat([b]));
		return res;
	}, [[]]);
}

function expandParamSpace(paramSpace, gridLimit = 10000) {
	// Normalize each param to an array of possible values
	const keys = Object.keys(paramSpace || {});
	const arrays = keys.map((k) => {
		const v = paramSpace[k];
		if (Array.isArray(v)) return v.slice();
		if (v && typeof v === 'object' && 'min' in v && 'max' in v) {
				const step = v.step || (v.max - v.min) / 10;
				if (typeof step !== 'number' || step <= 0) {
					throw new Error(`Invalid step for param "${k}": must be > 0`);
				}
				if (v.max < v.min) {
					throw new Error(`Invalid range for param "${k}": max < min`);
				}
				const vals = [];
				for (let x = v.min; x <= v.max + 1e-12; x += step) vals.push(Number(x.toFixed(12)));
				return vals;
			}
		// single scalar value
		return [v];
	});

	const approxCount = arrays.reduce((c, a) => c * Math.max(1, a.length), 1);
	if (approxCount > gridLimit) {
		throw new Error(`Grid size ${approxCount} exceeds limit ${gridLimit}. Reduce steps or use random strategy.`);
	}

	const combos = cartesianProduct(arrays);
	return combos.map((combo) => {
		const obj = {};
		combo.forEach((val, i) => (obj[keys[i]] = val));
		return obj;
	});
}

export default class ParameterOptimizer {
	constructor({ paramSpace = {}, evaluator, strategy = 'random', maxIter = 100, parallel = 4, onProgress = null, seed = null, maximize = true } = {}) {
		if (typeof evaluator !== 'function') throw new Error('evaluator function required');
		this.paramSpace = paramSpace;
		this.evaluator = evaluator;
		this.strategy = strategy;
		this.maxIter = maxIter;
		this.parallel = Math.max(1, Math.floor(parallel));
		this.onProgress = typeof onProgress === 'function' ? onProgress : null;
		this.history = [];
		this.best = null;
		this.maximize = Boolean(maximize);
		this._rand = seed == null ? Math.random : seededRandom(seed);
	}

	async run() {
		this.history = [];
		this.best = null;

		if (this.strategy === 'grid') {
			const candidates = expandParamSpace(this.paramSpace);
			await this._evaluateBatch(candidates);
		} else if (this.strategy === 'random') {
			const candidates = [];
			for (let i = 0; i < this.maxIter; i++) candidates.push(this._sampleRandomCandidate());
			await this._evaluateBatch(candidates);
		} else {
			throw new Error(`Unknown strategy: ${this.strategy}`);
		}

		return { best: this.best, history: this.history };
	}

	_sampleRandomCandidate() {
		const keys = Object.keys(this.paramSpace);
		const out = {};
		for (const k of keys) {
			const v = this.paramSpace[k];
			if (Array.isArray(v)) {
				out[k] = v[Math.floor(this._rand() * v.length)];
			} else if (v && typeof v === 'object' && 'min' in v && 'max' in v) {
				const r = this._rand() * (v.max - v.min) + v.min;
				out[k] = v.type === 'int' ? Math.round(r) : Number(r.toFixed(12));
			} else {
				out[k] = v;
			}
		}
		return out;
	}

	async _evaluateBatch(candidates) {
		const total = candidates.length;
		let tried = 0;

		// Evaluate in parallel batches
		const queue = candidates.slice();
		const workers = new Array(this.parallel).fill(null).map(() => this._workerLoop(queue, () => {
			tried += 1;
			if (this.onProgress) this.onProgress({ tried, total, best: this.best });
		}));

		await Promise.all(workers);
	}

	async _workerLoop(queue, progressTick) {
		while (true) {
			let candidate;
			// pop next candidate atomically
			candidate = queue.shift();
			if (!candidate) break;

			try {
				const res = await this.evaluator(candidate);
				const score = typeof res === 'object' && res !== null ? res.score : res;
				const numericScore = (typeof score === 'number') ? score : Number(score);
				const record = { params: candidate, score, raw: res };
				this.history.push(record);

				if (!this.best || (this.maximize ? numericScore > (this.best.score ?? -Infinity) : numericScore < (this.best.score ?? Infinity))) {
					// store numeric score normalized
					record.score = numericScore;
					this.best = record;
				}
			} catch (e) {
				// record failure
				this.history.push({ params: candidate, error: e.message || String(e) });
			}

			progressTick();
		}
	}
}

// xfnv1a 32-bit hash -> uint32
function xfnv1a(str) {
	let h = 2166136261 >>> 0;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619) >>> 0;
	}
	return h >>> 0;
}

// mulberry32-like seeded RNG returning function() -> [0,1)
function seededRandom(seed) {
	let h = xfnv1a(String(seed));
	return function () {
		h = (h + 0x6D2B79F5) >>> 0;
		let t = Math.imul(h ^ (h >>> 15), 1 | h);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// expose utilities for tests
export { expandParamSpace, seededRandom, cartesianProduct };

