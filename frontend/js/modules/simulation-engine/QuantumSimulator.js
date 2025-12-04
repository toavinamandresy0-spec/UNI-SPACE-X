class QuantumSimulator {
    constructor() {
        this.constants = {
            H_BAR: 1.0545718e-34,
            C: 299792458,
            K_B: 1.380649e-23,
            E: 1.60217662e-19
        };
        this.states = new Map();
    }

    // États quantiques
    createQubit(state = [1, 0]) {
        const qubit = {
            id: this.generateId(),
            state: this.normalizeState(state),
            entangledWith: null,
            decoherence: 0
        };
        this.states.set(qubit.id, qubit);
        return qubit;
    }

    normalizeState(state) {
        const magnitude = Math.sqrt(state.reduce((sum, amp) => sum + Math.pow(Math.abs(amp), 2), 0));
        return state.map(amp => amp / magnitude);
    }

    // Portes quantiques
    applyGate(qubitId, gate) {
        const qubit = this.states.get(qubitId);
        if (!qubit) return null;

        const newState = this.matrixMultiply(gate.matrix, qubit.state);
        qubit.state = this.normalizeState(newState);
        
        return qubit;
    }

    matrixMultiply(matrix, vector) {
        return matrix.map(row => 
            row.reduce((sum, element, j) => sum + element * vector[j], 0)
        );
    }

    // Portes standard
    get gates() {
        return {
            H: { // Hadamard
                matrix: [[1/Math.sqrt(2), 1/Math.sqrt(2)], [1/Math.sqrt(2), -1/Math.sqrt(2)]],
                name: 'Hadamard'
            },
            X: { // Pauli-X
                matrix: [[0, 1], [1, 0]],
                name: 'Pauli-X'
            },
            Y: { // Pauli-Y
                matrix: [[0, -1j], [1j, 0]],
                name: 'Pauli-Y'
            },
            Z: { // Pauli-Z
                matrix: [[1, 0], [0, -1]],
                name: 'Pauli-Z'
            },
            CNOT: {
                matrix: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]],
                name: 'Controlled-NOT'
            }
        };
    }

    // Intrication quantique
    entangleQubits(qubit1Id, qubit2Id) {
        const qubit1 = this.states.get(qubit1Id);
        const qubit2 = this.states.get(qubit2Id);
        
        if (!qubit1 || !qubit2) return false;

        // Créer un état de Bell (état intriqué)
        const entangledState = [
            1/Math.sqrt(2), 0, 0, 1/Math.sqrt(2) // |00⟩ + |11⟩
        ];
        
        qubit1.entangledWith = qubit2Id;
        qubit2.entangledWith = qubit1Id;
        
        // Mettre à jour les états
        qubit1.state = [entangledState[0], entangledState[1]];
        qubit2.state = [entangledState[2], entangledState[3]];
        
        return true;
    }

    // Téléportation quantique
    quantumTeleportation(senderQubitId, receiverQubitId) {
        const sender = this.states.get(senderQubitId);
        const receiver = this.states.get(receiverQubitId);
        
        if (!sender || !receiver) return false;

        // Simuler la téléportation
        receiver.state = [...sender.state];
        sender.state = [1, 0]; // Réinitialiser l'état
        
        return {
            success: true,
            fidelity: this.calculateFidelity(sender.state, receiver.state),
            classicalBits: 2 // Bits classiques nécessaires
        };
    }

    calculateFidelity(state1, state2) {
        const overlap = state1.reduce((sum, amp, i) => sum + Math.abs(amp * state2[i]), 0);
        return Math.pow(overlap, 2);
    }

    // Calculs quantiques avancés
    quantumFourierTransform(input) {
        const N = input.length;
        const output = new Array(N).fill(0);
        
        for (let k = 0; k < N; k++) {
            for (let n = 0; n < N; n++) {
                const angle = -2 * Math.PI * k * n / N;
                output[k] += input[n] * Math.cos(angle);
            }
        }
        
        return output;
    }

    simulateQuantumCircuit(circuit) {
        const results = {
            executionTime: 0,
            measurements: [],
            stateEvolution: [],
            success: true
        };

        const startTime = performance.now();
        
        try {
            for (const operation of circuit.operations) {
                const qubit = this.states.get(operation.qubitId);
                if (qubit) {
                    this.applyGate(operation.qubitId, operation.gate);
                    results.stateEvolution.push({
                        step: operation.step,
                        state: [...qubit.state],
                        gate: operation.gate.name
                    });
                }
            }
            
            // Mesure finale
            for (const qubitId of circuit.measureQubits) {
                const measurement = this.measureQubit(qubitId);
                results.measurements.push(measurement);
            }
            
        } catch (error) {
            results.success = false;
            results.error = error.message;
        }
        
        results.executionTime = performance.now() - startTime;
        return results;
    }

    measureQubit(qubitId) {
        const qubit = this.states.get(qubitId);
        if (!qubit) return null;

        const probability0 = Math.pow(Math.abs(qubit.state[0]), 2);
        const random = Math.random();
        
        const result = random < probability0 ? 0 : 1;
        
        // Effondrement de la fonction d'onde
        qubit.state = result === 0 ? [1, 0] : [0, 1];
        
        return {
            qubitId: qubitId,
            result: result,
            probability: result === 0 ? probability0 : 1 - probability0,
            timestamp: Date.now()
        };
    }

    // Algorithmes quantiques
    groverSearch(database, target) {
        const n = Math.ceil(Math.log2(database.length));
        const iterations = Math.floor(Math.PI / 4 * Math.sqrt(database.length));
        
        let state = this.initializeUniformState(n);
        
        for (let i = 0; i < iterations; i++) {
            // Oracle de Grover
            state = this.applyGroverOracle(state, target, database);
            // Diffusion de Grover
            state = this.applyGroverDiffusion(state);
        }
        
        return {
            iterations: iterations,
            probability: this.calculateSuccessProbability(state, target, database),
            state: state
        };
    }

    initializeUniformState(n) {
        const size = Math.pow(2, n);
        return new Array(size).fill(1 / Math.sqrt(size));
    }

    applyGroverOracle(state, target, database) {
        return state.map((amplitude, index) => {
            const element = database[index];
            return element === target ? -amplitude : amplitude;
        });
    }

    applyGroverDiffusion(state) {
        const mean = state.reduce((sum, amp) => sum + amp, 0) / state.length;
        return state.map(amp => 2 * mean - amp);
    }

    calculateSuccessProbability(state, target, database) {
        let probability = 0;
        state.forEach((amplitude, index) => {
            if (database[index] === target) {
                probability += Math.pow(Math.abs(amplitude), 2);
            }
        });
        return probability;
    }

    // Simulation de champs quantiques
    simulateQuantumField(dimensions, timeSteps) {
        const field = this.initializeQuantumField(dimensions);
        const evolution = [field];
        
        for (let t = 1; t <= timeSteps; t++) {
            const newField = this.evolveQuantumField(field, t * 0.1);
            evolution.push(newField);
        }
        
        return {
            dimensions: dimensions,
            timeSteps: timeSteps,
            evolution: evolution,
            energy: this.calculateFieldEnergy(evolution[evolution.length - 1])
        };
    }

    initializeQuantumField(dimensions) {
        const field = [];
        for (let x = 0; x < dimensions; x++) {
            const row = [];
            for (let y = 0; y < dimensions; y++) {
                row.push({
                    x: x,
                    y: y,
                    amplitude: (Math.random() - 0.5) * 2,
                    phase: Math.random() * 2 * Math.PI
                });
            }
            field.push(row);
        }
        return field;
    }

    evolveQuantumField(field, time) {
        return field.map(row => 
            row.map(cell => ({
                ...cell,
                amplitude: cell.amplitude * Math.cos(time),
                phase: cell.phase + time * 0.1
            }))
        );
    }

    calculateFieldEnergy(field) {
        let energy = 0;
        field.forEach(row => {
            row.forEach(cell => {
                energy += Math.pow(cell.amplitude, 2);
            });
        });
        return energy;
    }

    // Utilitaires
    generateId() {
        return 'qubit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getQubitState(qubitId) {
        return this.states.get(qubitId);
    }

    getAllQubits() {
        return Array.from(this.states.values());
    }

    reset() {
        this.states.clear();
    }

    // Export des données
    exportQuantumData() {
        return {
            timestamp: new Date().toISOString(),
            qubits: this.getAllQubits(),
            constants: this.constants,
            statistics: {
                totalQubits: this.states.size,
                entangledPairs: this.countEntangledPairs(),
                averageDecoherence: this.calculateAverageDecoherence()
            }
        };
    }

    countEntangledPairs() {
        let count = 0;
        const processed = new Set();
        
        this.states.forEach(qubit => {
            if (qubit.entangledWith && !processed.has(qubit.id)) {
                count++;
                processed.add(qubit.id);
                processed.add(qubit.entangledWith);
            }
        });
        
        return count;
    }

    calculateAverageDecoherence() {
        const qubits = this.getAllQubits();
        if (qubits.length === 0) return 0;
        
        const total = qubits.reduce((sum, qubit) => sum + qubit.decoherence, 0);
        return total / qubits.length;
    }
}

// Export global
if (typeof window !== 'undefined') {
    window.QuantumSimulator = QuantumSimulator;
}