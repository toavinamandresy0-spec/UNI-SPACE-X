class TrajectoryOptimizer {
    constructor() {
        this.physicsCalculator = new PhysicsCalculator();
    }

    optimizeLaunchTrajectory(parameters) {
        const {
            payloadMass,
            targetOrbit,
            launchSite,
            constraints = {}
        } = parameters;

        // Algorithmes d'optimisation
        const geneticResult = this.geneticAlgorithm(parameters);
        const gradientResult = this.gradientDescent(parameters);
        
        return {
            genetic: geneticResult,
            gradient: gradientResult,
            recommended: this.selectBestTrajectory([geneticResult, gradientResult])
        };
    }

    geneticAlgorithm(parameters, populationSize = 50, generations = 100) {
        let population = this.initializePopulation(populationSize, parameters);
        
        for (let gen = 0; gen < generations; gen++) {
            // Évaluation
            const evaluated = population.map(individual => ({
                individual,
                fitness: this.evaluateFitness(individual, parameters)
            })).sort((a, b) => b.fitness - a.fitness);

            // Sélection élite
            const newPopulation = evaluated.slice(0, Math.floor(populationSize * 0.1))
                .map(item => item.individual);

            // Croisement et mutation
            while (newPopulation.length < populationSize) {
                const parent1 = this.selectParent(evaluated);
                const parent2 = this.selectParent(evaluated);
                const child = this.crossover(parent1, parent2);
                const mutatedChild = this.mutate(child, 0.1);
                newPopulation.push(mutatedChild);
            }

            population = newPopulation;
        }

        return population[0];
    }

    initializePopulation(size, parameters) {
        const population = [];
        for (let i = 0; i < size; i++) {
            population.push({
                launchAngle: Math.random() * Math.PI,
                azimuth: Math.random() * 2 * Math.PI,
                thrustProfile: Array(10).fill(0).map(() => Math.random()),
                staging: Array(3).fill(0).map(() => Math.random() * 1000),
                turnStart: 50 + Math.random() * 100
            });
        }
        return population;
    }

    evaluateFitness(individual, parameters) {
        const simulation = this.simulateTrajectory(individual, parameters);
        
        let fitness = 0;
        
        // Récompense pour atteindre l'orbite cible
        if (simulation.reachedOrbit) {
            fitness += 1000;
            fitness += (1 / (simulation.fuelUsed + 1)) * 500;
        }
        
        // Pénalités pour les contraintes
        if (simulation.maxGForce > 8) {
            fitness -= (simulation.maxGForce - 8) * 100;
        }
        
        if (simulation.maxDynamicPressure > 50000) {
            fitness -= (simulation.maxDynamicPressure - 50000) / 1000;
        }
        
        return Math.max(0, fitness);
    }

    simulateTrajectory(individual, parameters) {
        // Simulation simplifiée de trajectoire
        const { launchAngle, thrustProfile } = individual;
        
        return {
            reachedOrbit: Math.random() > 0.3,
            fuelUsed: 0.7 + Math.random() * 0.3,
            maxGForce: 3 + Math.random() * 6,
            maxDynamicPressure: 20000 + Math.random() * 40000,
            finalOrbit: {
                altitude: parameters.targetOrbit.altitude * (0.9 + Math.random() * 0.2),
                inclination: parameters.targetOrbit.inclination
            }
        };
    }

    gradientDescent(parameters, learningRate = 0.01, iterations = 1000) {
        let currentSolution = this.initializePopulation(1, parameters)[0];
        let bestFitness = this.evaluateFitness(currentSolution, parameters);
        
        for (let i = 0; i < iterations; i++) {
            const neighbor = this.mutate(currentSolution, learningRate);
            const neighborFitness = this.evaluateFitness(neighbor, parameters);
            
            if (neighborFitness > bestFitness) {
                currentSolution = neighbor;
                bestFitness = neighborFitness;
            }
        }
        
        return currentSolution;
    }

    selectParent(evaluatedPopulation) {
        // Sélection par roulette
        const totalFitness = evaluatedPopulation.reduce((sum, item) => sum + item.fitness, 0);
        let random = Math.random() * totalFitness;
        
        for (const item of evaluatedPopulation) {
            random -= item.fitness;
            if (random <= 0) return item.individual;
        }
        
        return evaluatedPopulation[0].individual;
    }

    crossover(parent1, parent2) {
        return {
            launchAngle: Math.random() < 0.5 ? parent1.launchAngle : parent2.launchAngle,
            azimuth: Math.random() < 0.5 ? parent1.azimuth : parent2.azimuth,
            thrustProfile: parent1.thrustProfile.map((val, i) => 
                Math.random() < 0.5 ? val : parent2.thrustProfile[i]
            ),
            staging: parent1.staging.map((val, i) => 
                Math.random() < 0.5 ? val : parent2.staging[i]
            ),
            turnStart: Math.random() < 0.5 ? parent1.turnStart : parent2.turnStart
        };
    }

    mutate(individual, mutationRate) {
        const mutated = JSON.parse(JSON.stringify(individual));
        
        if (Math.random() < mutationRate) {
            mutated.launchAngle += (Math.random() - 0.5) * 0.1;
        }
        
        if (Math.random() < mutationRate) {
            mutated.azimuth += (Math.random() - 0.5) * 0.2;
        }
        
        mutated.thrustProfile = mutated.thrustProfile.map(val => 
            Math.random() < mutationRate ? Math.random() : val
        );
        
        return mutated;
    }

    selectBestTrajectory(trajectories) {
        return trajectories.reduce((best, current) => {
            const currentScore = this.evaluateFitness(current, {});
            const bestScore = this.evaluateFitness(best, {});
            return currentScore > bestScore ? current : best;
        });
    }

    calculatePorkchopPlot(departureWindows, arrivalWindows) {
        const plot = [];
        
        for (const departure of departureWindows) {
            const row = [];
            for (const arrival of arrivalWindows) {
                const deltaV = this.calculateTransferDeltaV(departure, arrival);
                row.push({
                    departure: departure,
                    arrival: arrival,
                    deltaV: deltaV,
                    duration: arrival - departure
                });
            }
            plot.push(row);
        }
        
        return plot;
    }

    calculateTransferDeltaV(departure, arrival) {
        // Calcul simplifié de deltaV pour transfert interplanétaire
        const baseDeltaV = 6000; // m/s
        const timeFactor = Math.abs(arrival - departure) / (365 * 24 * 60 * 60 * 1000); // années
        return baseDeltaV * (1 + timeFactor * 0.5);
    }
}

if (typeof window !== 'undefined') {
    window.TrajectoryOptimizer = TrajectoryOptimizer;
}