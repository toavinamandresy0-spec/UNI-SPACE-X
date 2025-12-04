class DataAnalyzer {
    constructor() {
        this.datasets = new Map();
        this.analysisResults = new Map();
    }

    loadDataset(name, data) {
        this.datasets.set(name, {
            data: data,
            metadata: {
                loadedAt: new Date().toISOString(),
                size: data.length,
                dimensions: this.getDataDimensions(data)
            }
        });
        
        return this.getDatasetInfo(name);
    }

    getDataDimensions(data) {
        if (data.length === 0) return { rows: 0, columns: 0 };
        
        const firstRow = data[0];
        const columns = typeof firstRow === 'object' ? Object.keys(firstRow).length : 1;
        
        return {
            rows: data.length,
            columns: columns
        };
    }

    analyzeDataset(datasetName, analysisType) {
        const dataset = this.datasets.get(datasetName);
        if (!dataset) throw new Error(`Dataset ${datasetName} non trouvé`);

        let results;
        
        switch (analysisType) {
            case 'descriptive':
                results = this.descriptiveAnalysis(dataset.data);
                break;
            case 'correlation':
                results = this.correlationAnalysis(dataset.data);
                break;
            case 'trend':
                results = this.trendAnalysis(dataset.data);
                break;
            case 'cluster':
                results = this.clusterAnalysis(dataset.data);
                break;
            default:
                throw new Error(`Type d'analyse non supporté: ${analysisType}`);
        }

        const analysisId = this.generateAnalysisId();
        this.analysisResults.set(analysisId, {
            datasetName: datasetName,
            analysisType: analysisType,
            results: results,
            timestamp: new Date().toISOString()
        });

        return {
            analysisId: analysisId,
            ...results
        };
    }

    descriptiveAnalysis(data) {
        const numericData = this.extractNumericData(data);
        const stats = {};
        
        for (const [column, values] of Object.entries(numericData)) {
            if (values.length > 0) {
                stats[column] = this.calculateDescriptiveStats(values);
            }
        }
        
        return {
            type: 'descriptive',
            statistics: stats,
            summary: this.generateSummary(stats)
        };
    }

    extractNumericData(data) {
        const numericData = {};
        
        if (data.length === 0) return numericData;
        
        // Supposer que c'est un tableau d'objets
        const firstRow = data[0];
        if (typeof firstRow === 'object') {
            Object.keys(firstRow).forEach(key => {
                const values = data.map(row => parseFloat(row[key])).filter(val => !isNaN(val));
                if (values.length > 0) {
                    numericData[key] = values;
                }
            });
        } else {
            // Données simples
            numericData['values'] = data.map(val => parseFloat(val)).filter(val => !isNaN(val));
        }
        
        return numericData;
    }

    calculateDescriptiveStats(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        const mean = sum / sorted.length;
        
        // Écart type
        const squareDiffs = sorted.map(value => Math.pow(value - mean, 2));
        const variance = squareDiffs.reduce((a, b) => a + b, 0) / sorted.length;
        const stdDev = Math.sqrt(variance);
        
        // Médiane
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 === 0 ? 
            (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
        
        // Quartiles
        const q1 = this.calculatePercentile(sorted, 25);
        const q3 = this.calculatePercentile(sorted, 75);
        
        return {
            count: sorted.length,
            mean: parseFloat(mean.toFixed(4)),
            median: parseFloat(median.toFixed(4)),
            stdDev: parseFloat(stdDev.toFixed(4)),
            variance: parseFloat(variance.toFixed(4)),
            min: sorted[0],
            max: sorted[sorted.length - 1],
            range: sorted[sorted.length - 1] - sorted[0],
            q1: parseFloat(q1.toFixed(4)),
            q3: parseFloat(q3.toFixed(4)),
            iqr: parseFloat((q3 - q1).toFixed(4))
        };
    }

    calculatePercentile(sortedValues, percentile) {
        const index = (percentile / 100) * (sortedValues.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        
        if (lower === upper) return sortedValues[lower];
        
        return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (index - lower);
    }

    correlationAnalysis(data) {
        const numericData = this.extractNumericData(data);
        const columns = Object.keys(numericData);
        const correlations = {};
        
        for (let i = 0; i < columns.length; i++) {
            for (let j = i + 1; j < columns.length; j++) {
                const col1 = columns[i];
                const col2 = columns[j];
                const correlation = this.calculateCorrelation(
                    numericData[col1], 
                    numericData[col2]
                );
                
                correlations[`${col1}_${col2}`] = {
                    correlation: parseFloat(correlation.toFixed(4)),
                    strength: this.getCorrelationStrength(correlation)
                };
            }
        }
        
        return {
            type: 'correlation',
            correlations: correlations,
            significant: this.findSignificantCorrelations(correlations)
        };
    }

    calculateCorrelation(x, y) {
        if (x.length !== y.length || x.length === 0) return 0;
        
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
        const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        
        return denominator === 0 ? 0 : numerator / denominator;
    }

    getCorrelationStrength(correlation) {
        const absCorr = Math.abs(correlation);
        if (absCorr >= 0.8) return 'forte';
        if (absCorr >= 0.5) return 'modérée';
        if (absCorr >= 0.3) return 'faible';
        return 'négligeable';
    }

    findSignificantCorrelations(correlations, threshold = 0.5) {
        return Object.entries(correlations)
            .filter(([_, data]) => Math.abs(data.correlation) >= threshold)
            .reduce((obj, [key, data]) => {
                obj[key] = data;
                return obj;
            }, {});
    }

    trendAnalysis(data) {
        const numericData = this.extractNumericData(data);
        const trends = {};
        
        for (const [column, values] of Object.entries(numericData)) {
            if (values.length >= 2) {
                trends[column] = this.calculateTrend(values);
            }
        }
        
        return {
            type: 'trend',
            trends: trends,
            overallTrend: this.determineOverallTrend(trends)
        };
    }

    calculateTrend(values) {
        const n = values.length;
        const x = Array.from({length: n}, (_, i) => i);
        
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
        const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        return {
            slope: parseFloat(slope.toFixed(4)),
            intercept: parseFloat(intercept.toFixed(4)),
            direction: slope > 0 ? 'croissant' : slope < 0 ? 'décroissant' : 'stable',
            strength: Math.abs(slope)
        };
    }

    determineOverallTrend(trends) {
        const slopes = Object.values(trends).map(trend => trend.slope);
        const avgSlope = slopes.reduce((a, b) => a + b, 0) / slopes.length;
        
        return {
            averageSlope: parseFloat(avgSlope.toFixed(4)),
            overallDirection: avgSlope > 0 ? 'croissant' : avgSlope < 0 ? 'décroissant' : 'stable',
            confidence: this.calculateTrendConfidence(slopes)
        };
    }

    calculateTrendConfidence(slopes) {
        const variance = slopes.reduce((sum, slope) => sum + Math.pow(slope, 2), 0) / slopes.length;
        return Math.max(0, 1 - Math.sqrt(variance));
    }

    clusterAnalysis(data, k = 3) {
        const numericData = this.extractNumericData(data);
        const columns = Object.keys(numericData);
        
        if (columns.length < 2) {
            throw new Error('Clustering nécessite au moins 2 dimensions');
        }
        
        // K-means simplifié
        const points = this.createDataPoints(numericData, columns);
        const clusters = this.kMeans(points, k);
        
        return {
            type: 'cluster',
            clusters: clusters,
            optimalK: this.findOptimalK(points),
            silhouetteScore: this.calculateSilhouetteScore(clusters)
        };
    }

    createDataPoints(numericData, columns) {
        const points = [];
        const n = numericData[columns[0]].length;
        
        for (let i = 0; i < n; i++) {
            const point = {
                id: i,
                values: columns.map(col => numericData[col][i])
            };
            points.push(point);
        }
        
        return points;
    }

    kMeans(points, k, maxIterations = 100) {
        // Initialisation aléatoire des centroïdes
        let centroids = this.initializeCentroids(points, k);
        let clusters = [];
        let iterations = 0;
        
        while (iterations < maxIterations) {
            // Assigner les points aux clusters
            clusters = this.assignPointsToClusters(points, centroids);
            
            // Calculer les nouveaux centroïdes
            const newCentroids = this.calculateNewCentroids(clusters);
            
            // Vérifier la convergence
            if (this.centroidsConverged(centroids, newCentroids)) {
                break;
            }
            
            centroids = newCentroids;
            iterations++;
        }
        
        return {
            clusters: clusters,
            centroids: centroids,
            iterations: iterations,
            wcss: this.calculateWCSS(clusters) // Within-Cluster Sum of Squares
        };
    }

    initializeCentroids(points, k) {
        const shuffled = [...points].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, k).map((point, i) => ({
            id: i,
            values: [...point.values]
        }));
    }

    assignPointsToClusters(points, centroids) {
        const clusters = centroids.map(centroid => ({
            centroid: centroid,
            points: []
        }));
        
        points.forEach(point => {
            let minDistance = Infinity;
            let bestCluster = 0;
            
            centroids.forEach((centroid, index) => {
                const distance = this.euclideanDistance(point.values, centroid.values);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestCluster = index;
                }
            });
            
            clusters[bestCluster].points.push(point);
        });
        
        return clusters;
    }

    euclideanDistance(a, b) {
        return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
    }

    calculateNewCentroids(clusters) {
        return clusters.map(cluster => {
            if (cluster.points.length === 0) return cluster.centroid;
            
            const dimensions = cluster.centroid.values.length;
            const newValues = Array(dimensions).fill(0);
            
            cluster.points.forEach(point => {
                point.values.forEach((val, i) => {
                    newValues[i] += val;
                });
            });
            
            return {
                id: cluster.centroid.id,
                values: newValues.map(val => val / cluster.points.length)
            };
        });
    }

    centroidsConverged(oldCentroids, newCentroids, threshold = 0.001) {
        return oldCentroids.every((old, i) => 
            this.euclideanDistance(old.values, newCentroids[i].values) < threshold
        );
    }

    calculateWCSS(clusters) {
        return clusters.reduce((sum, cluster) => {
            return sum + cluster.points.reduce((clusterSum, point) => {
                return clusterSum + Math.pow(this.euclideanDistance(point.values, cluster.centroid.values), 2);
            }, 0);
        }, 0);
    }

    findOptimalK(points, maxK = 8) {
        // Méthode du coude pour trouver le k optimal
        const wcssValues = [];
        
        for (let k = 1; k <= maxK; k++) {
            const clusters = this.kMeans(points, k);
            wcssValues.push(clusters.wcss);
        }
        
        // Calculer les différences pour trouver le "coude"
        const differences = [];
        for (let i = 1; i < wcssValues.length; i++) {
            differences.push(wcssValues[i-1] - wcssValues[i]);
        }
        
        let optimalK = 2; // Par défaut
        let maxDiff = 0;
        
        differences.forEach((diff, i) => {
            if (diff > maxDiff) {
                maxDiff = diff;
                optimalK = i + 2;
            }
        });
        
        return optimalK;
    }

    calculateSilhouetteScore(clusters) {
        // Score de silhouette simplifié
        if (clusters.clusters.length <= 1) return 0;
        
        let totalScore = 0;
        let totalPoints = 0;
        
        clusters.clusters.forEach(cluster => {
            cluster.points.forEach(point => {
                const a = this.calculateAverageDistance(point, cluster.points);
                const b = this.calculateNearestClusterDistance(point, clusters.clusters, cluster);
                const score = (b - a) / Math.max(a, b);
                totalScore += score;
                totalPoints++;
            });
        });
        
        return totalPoints > 0 ? totalScore / totalPoints : 0;
    }

    calculateAverageDistance(point, pointsInCluster) {
        if (pointsInCluster.length <= 1) return 0;
        
        const distances = pointsInCluster
            .filter(p => p.id !== point.id)
            .map(p => this.euclideanDistance(point.values, p.values));
        
        return distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
    }

    calculateNearestClusterDistance(point, allClusters, currentCluster) {
        let minDistance = Infinity;
        
        allClusters.forEach(cluster => {
            if (cluster !== currentCluster && cluster.points.length > 0) {
                const distance = this.calculateAverageDistance(point, cluster.points);
                minDistance = Math.min(minDistance, distance);
            }
        });
        
        return minDistance === Infinity ? 0 : minDistance;
    }

    generateSummary(stats) {
        const significantStats = Object.entries(stats)
            .filter(([_, data]) => data.stdDev > 0)
            .map(([column, data]) => ({
                column,
                mean: data.mean,
                variability: data.stdDev / data.mean
            }));
        
        return {
            totalMetrics: Object.keys(stats).length,
            highVariability: significantStats.filter(s => s.variability > 0.5).length,
            averageMean: significantStats.reduce((sum, s) => sum + s.mean, 0) / significantStats.length
        };
    }

    getDatasetInfo(name) {
        const dataset = this.datasets.get(name);
        if (!dataset) return null;
        
        return {
            name: name,
            ...dataset.metadata,
            preview: dataset.data.slice(0, 5)
        };
    }

    getAllDatasets() {
        return Array.from(this.datasets.entries()).map(([name, data]) => 
            this.getDatasetInfo(name)
        );
    }

    getAnalysisResult(analysisId) {
        return this.analysisResults.get(analysisId);
    }

    getAllAnalysisResults() {
        return Array.from(this.analysisResults.entries()).map(([id, result]) => ({
            id,
            ...result
        }));
    }

    generateAnalysisId() {
        return 'analysis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    exportAnalysis(analysisId, format = 'json') {
        const analysis = this.getAnalysisResult(analysisId);
        if (!analysis) throw new Error('Analyse non trouvée');
        
        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                analysisId: analysisId,
                format: format
            },
            analysis: analysis
        };
        
        switch (format) {
            case 'json':
                return JSON.stringify(exportData, null, 2);
            case 'csv':
                return this.analysisToCSV(analysis);
            default:
                return JSON.stringify(exportData);
        }
    }

    analysisToCSV(analysis) {
        let csv = 'Type,Metric,Value\n';
        
        if (analysis.results.statistics) {
            Object.entries(analysis.results.statistics).forEach(([column, stats]) => {
                Object.entries(stats).forEach(([metric, value]) => {
                    csv += `Descriptive,${column}_${metric},${value}\n`;
                });
            });
        }
        
        if (analysis.results.correlations) {
            Object.entries(analysis.results.correlations).forEach(([pair, data]) => {
                csv += `Correlation,${pair},${data.correlation}\n`;
            });
        }
        
        return csv;
    }

    clearDataset(name) {
        this.datasets.delete(name);
    }

    clearAllData() {
        this.datasets.clear();
        this.analysisResults.clear();
    }
}

// Export global
if (typeof window !== 'undefined') {
    window.DataAnalyzer = DataAnalyzer;
}