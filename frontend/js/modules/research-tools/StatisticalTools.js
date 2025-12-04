class StatisticalTools {
    constructor() {
        this.methods = {
            descriptive: 'analyse descriptive',
            inferential: 'analyse inférentielle',
            predictive: 'analyse prédictive',
            bayesian: 'analyse bayésienne'
        };
    }

    // Analyse descriptive avancée
    comprehensiveDescriptiveAnalysis(data) {
        const basicStats = this.calculateBasicStats(data);
        const distribution = this.analyzeDistribution(data);
        const outliers = this.detectOutliers(data);
        const normality = this.testNormality(data);
        
        return {
            basic: basicStats,
            distribution: distribution,
            outliers: outliers,
            normality: normality,
            summary: this.generateStatisticalSummary(basicStats, distribution, normality)
        };
    }

    analyzeDistribution(data) {
        const sorted = [...data].sort((a, b) => a - b);
        const n = sorted.length;
        
        // Moments statistiques
        const mean = sorted.reduce((a, b) => a + b, 0) / n;
        const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);
        
        // Skewness (asymétrie)
        const skewness = sorted.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / n;
        
        // Kurtosis (aplatissement)
        const kurtosis = sorted.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0) / n - 3;
        
        return {
            skewness: parseFloat(skewness.toFixed(4)),
            kurtosis: parseFloat(kurtosis.toFixed(4)),
            shape: this.interpretDistributionShape(skewness, kurtosis),
            modality: this.analyzeModality(data)
        };
    }

    interpretDistributionShape(skewness, kurtosis) {
        let shape = 'normal';
        
        if (Math.abs(skewness) > 1) {
            shape = skewness > 0 ? 'fortement asymétrique droite' : 'fortement asymétrique gauche';
        } else if (Math.abs(skewness) > 0.5) {
            shape = skewness > 0 ? 'modérément asymétrique droite' : 'modérément asymétrique gauche';
        }
        
        if (kurtosis > 1) shape += ', leptokurtique';
        else if (kurtosis < -1) shape += ', platykurtique';
        else shape += ', mésokurtique';
        
        return shape;
    }

    analyzeModality(data) {
        // Analyse de la modalité (unimodal, bimodal, etc.)
        const histogram = this.createHistogram(data, 20);
        const peaks = this.findPeaks(histogram.values);
        
        return {
            modality: peaks.length === 1 ? 'unimodal' : peaks.length === 2 ? 'bimodal' : 'multimodal',
            peakCount: peaks.length,
            peaks: peaks
        };
    }

    findPeaks(values, threshold = 0.1) {
        const peaks = [];
        const maxVal = Math.max(...values);
        
        for (let i = 1; i < values.length - 1; i++) {
            if (values[i] > values[i-1] && values[i] > values[i+1] && values[i] > maxVal * threshold) {
                peaks.push({
                    index: i,
                    value: values[i],
                    significance: values[i] / maxVal
                });
            }
        }
        
        return peaks;
    }

    testNormality(data) {
        // Test de normalité simplifié (Shapiro-Wilk approximatif)
        const n = data.length;
        if (n < 3) return { normal: false, message: 'Échantillon trop petit' };
        
        const sorted = [...data].sort((a, b) => a - b);
        const mean = sorted.reduce((a, b) => a + b, 0) / n;
        const stdDev = Math.sqrt(sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n);
        
        // Calcul approximatif du test de Shapiro-Wilk
        let W = 0;
        for (let i = 0; i < Math.floor(n / 2); i++) {
            const a = this.shapiroWilkCoefficient(n, i + 1);
            W += a * (sorted[n - 1 - i] - sorted[i]);
        }
        
        W = Math.pow(W, 2) / (sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0));
        
        return {
            normal: W > 0.9, // Seuil simplifié
            W: parseFloat(W.toFixed(4)),
            pValue: this.estimatePValue(W, n),
            interpretation: W > 0.9 ? 'Distribution normale' : 'Distribution non normale'
        };
    }

    shapiroWilkCoefficient(n, i) {
        // Coefficients approximatifs pour Shapiro-Wilk
        if (n <= 50) {
            const coefficients = {
                3: [0.7071],
                4: [0.6872, 0.1677],
                5: [0.6646, 0.2413],
                // ... coefficients pour autres n
            };
            return coefficients[n] ? coefficients[n][i-1] : 0.5;
        }
        return Math.sqrt(2) * this.inverseNormalCDF((i - 0.375) / (n + 0.25));
    }

    inverseNormalCDF(p) {
        // Approximation de l'inverse de la CDF normale
        if (p <= 0 || p >= 1) return 0;
        return Math.sqrt(2) * this.erfInv(2 * p - 1);
    }

    erfInv(x) {
        // Approximation de l'inverse de la fonction d'erreur
        const a = 0.147;
        const sign = x < 0 ? -1 : 1;
        const ln1x = Math.log(1 - x * x);
        return sign * Math.sqrt(Math.sqrt(Math.pow(2 / (Math.PI * a) + ln1x / 2, 2) - ln1x / a) - (2 / (Math.PI * a) + ln1x / 2));
    }

    estimatePValue(W, n) {
        // Estimation simplifiée de la p-value
        const logW = Math.log(1 - W);
        const mu = this.normalApproximationMu(n);
        const sigma = this.normalApproximationSigma(n);
        const z = (logW - mu) / sigma;
        
        return this.normalCDF(-z); // p-value unilatérale
    }

    normalApproximationMu(n) {
        return -1.2725 + 1.0521 * (Math.log(n) - Math.log(n - 0.5));
    }

    normalApproximationSigma(n) {
        return 1.0308 - 0.26758 * (Math.log(n) - Math.log(n - 0.5));
    }

    normalCDF(x) {
        // Fonction de répartition normale
        return (1 + this.erf(x / Math.sqrt(2))) / 2;
    }

    erf(x) {
        // Fonction d'erreur
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x);
        
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        
        return sign * y;
    }

    // Analyse inférentielle
    hypothesisTest(sample1, sample2, testType = 't-test') {
        switch (testType) {
            case 't-test':
                return this.tTest(sample1, sample2);
            case 'mann-whitney':
                return this.mannWhitneyTest(sample1, sample2);
            case 'chi-square':
                return this.chiSquareTest(sample1, sample2);
            default:
                throw new Error(`Test non supporté: ${testType}`);
        }
    }

    tTest(sample1, sample2) {
        const n1 = sample1.length;
        const n2 = sample2.length;
        
        const mean1 = sample1.reduce((a, b) => a + b, 0) / n1;
        const mean2 = sample2.reduce((a, b) => a + b, 0) / n2;
        
        const var1 = sample1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (n1 - 1);
        const var2 = sample2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (n2 - 1);
        
        const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
        const stdError = Math.sqrt(pooledVar * (1/n1 + 1/n2));
        
        const t = (mean1 - mean2) / stdError;
        const df = n1 + n2 - 2;
        
        const pValue = this.tDistributionPValue(t, df);
        
        return {
            test: 't-test',
            t: parseFloat(t.toFixed(4)),
            df: df,
            pValue: parseFloat(pValue.toFixed(4)),
            significant: pValue < 0.05,
            effectSize: this.calculateEffectSize(mean1, mean2, Math.sqrt(pooledVar)),
            confidenceInterval: this.calculateConfidenceInterval(mean1 - mean2, stdError, df)
        };
    }

    tDistributionPValue(t, df) {
        // Approximation de la p-value pour la distribution t
        const x = df / (df + t * t);
        const incompleteBeta = this.incompleteBeta(x, df/2, 0.5);
        return incompleteBeta;
    }

    incompleteBeta(x, a, b) {
        // Approximation de la fonction bêta incomplète
        if (x < 0 || x > 1) return 0;
        if (x === 0) return 0;
        if (x === 1) return 1;
        
        // Utiliser l'approximation par série
        let sum = 0;
        const terms = 100;
        for (let k = 0; k < terms; k++) {
            const term = Math.pow(-1, k) * Math.pow(x, a + k) / (this.factorial(k) * (a + k));
            sum += term;
        }
        
        return sum * Math.pow(x, a) * Math.pow(1 - x, b) / (a * this.betaFunction(a, b));
    }

    betaFunction(a, b) {
        return Math.exp(this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b));
    }

    logGamma(x) {
        // Approximation de log(Gamma(x))
        return Math.log(this.gamma(x));
    }

    gamma(x) {
        // Approximation de la fonction Gamma
        if (x < 0.5) {
            return Math.PI / (Math.sin(Math.PI * x) * this.gamma(1 - x));
        }
        
        x -= 1;
        let result = 1;
        for (let i = 1; i <= 8; i++) {
            result += this.gammaCoefficients[i] * Math.pow(x + 1, -i);
        }
        result *= Math.sqrt(2 * Math.PI) * Math.pow(x + 1, x + 0.5) * Math.exp(-x - 1);
        return result;
    }

    get gammaCoefficients() {
        return {
            1: 1/12,
            2: 1/288,
            3: -139/51840,
            4: -571/2488320,
            5: 163879/209018880,
            6: 5246819/75246796800,
            7: -534703531/902961561600,
            8: -4483131259/86684309913600
        };
    }

    factorial(n) {
        if (n <= 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }

    calculateEffectSize(mean1, mean2, pooledStd) {
        const cohensD = (mean1 - mean2) / pooledStd;
        return {
            cohensD: parseFloat(cohensD.toFixed(4)),
            interpretation: this.interpretEffectSize(cohensD)
        };
    }

    interpretEffectSize(d) {
        if (Math.abs(d) < 0.2) return 'négligeable';
        if (Math.abs(d) < 0.5) return 'faible';
        if (Math.abs(d) < 0.8) return 'moyen';
        return 'fort';
    }

    calculateConfidenceInterval(difference, stdError, df, confidence = 0.95) {
        const tCritical = this.tCriticalValue(df, confidence);
        const margin = tCritical * stdError;
        
        return {
            lower: parseFloat((difference - margin).toFixed(4)),
            upper: parseFloat((difference + margin).toFixed(4)),
            confidence: confidence,
            margin: parseFloat(margin.toFixed(4))
        };
    }

    tCriticalValue(df, confidence) {
        // Valeurs critiques approximatives pour la distribution t
        const alpha = 1 - confidence;
        if (df >= 120) return this.normalCriticalValue(alpha);
        
        const criticalValues = {
            0.95: {
                1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
                10: 2.228, 20: 2.086, 30: 2.042, 60: 2.000, 120: 1.980
            }
        };
        
        return criticalValues[confidence]?.[df] || 2.0;
    }

    normalCriticalValue(alpha) {
        return Math.abs(this.inverseNormalCDF(alpha / 2));
    }

    mannWhitneyTest(sample1, sample2) {
        // Test de Mann-Whitney U (non paramétrique)
        const combined = [...sample1, ...sample2];
        const ranked = this.rankData(combined);
        
        const n1 = sample1.length;
        const n2 = sample2.length;
        
        let R1 = 0;
        sample1.forEach(val => {
            R1 += ranked.find(r => r.value === val).rank;
        });
        
        const U1 = n1 * n2 + (n1 * (n1 + 1)) / 2 - R1;
        const U2 = n1 * n2 - U1;
        
        const U = Math.min(U1, U2);
        const z = (U - (n1 * n2) / 2) / Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
        
        const pValue = 2 * (1 - this.normalCDF(Math.abs(z))); // Test bilatéral
        
        return {
            test: 'mann-whitney',
            U: U,
            z: parseFloat(z.toFixed(4)),
            pValue: parseFloat(pValue.toFixed(4)),
            significant: pValue < 0.05
        };
    }

    rankData(data) {
        const sorted = [...data].sort((a, b) => a - b);
        const ranked = [];
        let currentRank = 1;
        
        for (let i = 0; i < sorted.length; i++) {
            let rank = currentRank;
            let count = 1;
            
            // Gérer les ex-aequo
            while (i + count < sorted.length && sorted[i + count] === sorted[i]) {
                count++;
            }
            
            if (count > 1) {
                rank = currentRank + (count - 1) / 2;
            }
            
            for (let j = 0; j < count; j++) {
                ranked.push({
                    value: sorted[i + j],
                    rank: rank
                });
            }
            
            currentRank += count;
            i += count - 1;
        }
        
        return ranked;
    }

    // Analyse prédictive
    linearRegression(x, y) {
        const n = x.length;
        if (n !== y.length) throw new Error('Les tableaux x et y doivent avoir la même longueur');
        
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Calcul des résidus et R²
        const yMean = sumY / n;
        let ssTotal = 0;
        let ssResidual = 0;
        
        const predictions = x.map(xi => slope * xi + intercept);
        const residuals = y.map((yi, i) => yi - predictions[i]);
        
        y.forEach(yi => { ssTotal += Math.pow(yi - yMean, 2); });
        residuals.forEach(res => { ssResidual += Math.pow(res, 2); });
        
        const rSquared = 1 - (ssResidual / ssTotal);
        const stdError = Math.sqrt(ssResidual / (n - 2));
        
        return {
            slope: parseFloat(slope.toFixed(4)),
            intercept: parseFloat(intercept.toFixed(4)),
            rSquared: parseFloat(rSquared.toFixed(4)),
            stdError: parseFloat(stdError.toFixed(4)),
            equation: `y = ${slope.toFixed(4)}x + ${intercept.toFixed(4)}`,
            predictions: predictions,
            residuals: residuals,
            significance: this.regressionSignificance(slope, stdError, x, n)
        };
    }

    regressionSignificance(slope, stdError, x, n) {
        const seSlope = stdError / Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - x.reduce((a, b) => a + b, 0) / n, 2), 0));
        const t = slope / seSlope;
        const pValue = this.tDistributionPValue(Math.abs(t), n - 2);
        
        return {
            t: parseFloat(t.toFixed(4)),
            pValue: parseFloat(pValue.toFixed(4)),
            significant: pValue < 0.05
        };
    }

    // Analyse de séries temporelles
    timeSeriesAnalysis(data, timestamps) {
        const trend = this.analyzeTrend(data, timestamps);
        const seasonality = this.analyzeSeasonality(data, timestamps);
        const stationarity = this.testStationarity(data);
        
        return {
            trend: trend,
            seasonality: seasonality,
            stationarity: stationarity,
            decomposition: this.decomposeTimeSeries(data, timestamps)
        };
    }

    analyzeTrend(data, timestamps) {
        const regression = this.linearRegression(
            timestamps.map((_, i) => i),
            data
        );
        
        return {
            slope: regression.slope,
            direction: regression.slope > 0 ? 'croissant' : 'décroissant',
            strength: Math.abs(regression.rSquared),
            equation: regression.equation
        };
    }

    analyzeSeasonality(data, timestamps) {
        // Analyse de saisonnalité simplifiée
        const periods = this.findSeasonalPeriods(data);
        const strength = this.calculateSeasonalStrength(data, periods);
        
        return {
            periods: periods,
            strength: strength,
            seasonal: strength > 0.5 ? 'forte' : strength > 0.2 ? 'modérée' : 'faible'
        };
    }

    findSeasonalPeriods(data) {
        // Trouver les périodes saisonnières via autocorrélation
        const autocorrelations = this.calculateAutocorrelations(data, 20);
        const peaks = this.findPeaks(autocorrelations.map(ac => Math.abs(ac)), 0.3);
        
        return peaks.map(peak => peak.index);
    }

    calculateAutocorrelations(data, maxLag) {
        const correlations = [];
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
        
        for (let lag = 1; lag <= maxLag; lag++) {
            let covariance = 0;
            for (let i = 0; i < data.length - lag; i++) {
                covariance += (data[i] - mean) * (data[i + lag] - mean);
            }
            correlations.push(covariance / ((data.length - lag) * variance));
        }
        
        return correlations;
    }

    calculateSeasonalStrength(data, periods) {
        if (periods.length === 0) return 0;
        
        // Force saisonnière approximative
        const seasonalComponent = this.extractSeasonalComponent(data, periods[0]);
        const totalVariance = this.calculateVariance(data);
        const seasonalVariance = this.calculateVariance(seasonalComponent);
        
        return seasonalVariance / totalVariance;
    }

    extractSeasonalComponent(data, period) {
        const seasonal = [];
        for (let i = 0; i < data.length; i++) {
            const seasonalIndex = i % period;
            let sum = 0;
            let count = 0;
            
            for (let j = seasonalIndex; j < data.length; j += period) {
                sum += data[j];
                count++;
            }
            
            seasonal.push(sum / count);
        }
        return seasonal;
    }

    testStationarity(data) {
        // Test de stationnarité simplifié (test de racine unitaire approximatif)
        const differences = this.calculateDifferences(data);
        const originalVariance = this.calculateVariance(data);
        const diffVariance = this.calculateVariance(differences);
        
        const ratio = diffVariance / originalVariance;
        
        return {
            stationary: ratio < 0.5, // Seuil arbitraire
            varianceRatio: parseFloat(ratio.toFixed(4)),
            interpretation: ratio < 0.5 ? 'série stationnaire' : 'série non stationnaire'
        };
    }

    calculateDifferences(data) {
        const differences = [];
        for (let i = 1; i < data.length; i++) {
            differences.push(data[i] - data[i-1]);
        }
        return differences;
    }

    decomposeTimeSeries(data, timestamps) {
        const trend = this.extractTrend(data);
        const seasonal = this.extractSeasonalComponent(data, 12); // Période arbitraire
        const residual = data.map((val, i) => val - trend[i] - seasonal[i]);
        
        return {
            trend: trend,
            seasonal: seasonal,
            residual: residual,
            original: data
        };
    }

    extractTrend(data) {
        // Extraction de tendance par moyenne mobile
        const windowSize = Math.min(5, Math.floor(data.length / 4));
        const trend = [];
        
        for (let i = 0; i < data.length; i++) {
            let sum = 0;
            let count = 0;
            
            for (let j = Math.max(0, i - windowSize); j <= Math.min(data.length - 1, i + windowSize); j++) {
                sum += data[j];
                count++;
            }
            
            trend.push(sum / count);
        }
        
        return trend;
    }

    // Utilitaires
    calculateBasicStats(data) {
        const sorted = [...data].sort((a, b) => a - b);
        const n = sorted.length;
        const sum = sorted.reduce((a, b) => a + b, 0);
        const mean = sum / n;
        
        const mid = Math.floor(n / 2);
        const median = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
        
        const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);
        
        const q1 = this.calculatePercentile(sorted, 25);
        const q3 = this.calculatePercentile(sorted, 75);
        
        return {
            count: n,
            mean: parseFloat(mean.toFixed(4)),
            median: parseFloat(median.toFixed(4)),
            stdDev: parseFloat(stdDev.toFixed(4)),
            variance: parseFloat(variance.toFixed(4)),
            min: sorted[0],
            max: sorted[n - 1],
            range: sorted[n - 1] - sorted[0],
            q1: parseFloat(q1.toFixed(4)),
            q3: parseFloat(q3.toFixed(4)),
            iqr: parseFloat((q3 - q1).toFixed(4))
        };
    }

    calculatePercentile(sorted, percentile) {
        const index = (percentile / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        
        if (lower === upper) return sorted[lower];
        
        return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
    }

    calculateVariance(data) {
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    }

    detectOutliers(data, method = 'iqr') {
        const stats = this.calculateBasicStats(data);
        
        if (method === 'iqr') {
            const lowerBound = stats.q1 - 1.5 * stats.iqr;
            const upperBound = stats.q3 + 1.5 * stats.iqr;
            
            const outliers = data.filter(val => val < lowerBound || val > upperBound);
            
            return {
                method: 'iqr',
                outliers: outliers,
                bounds: { lower: lowerBound, upper: upperBound },
                count: outliers.length,
                percentage: parseFloat((outliers.length / data.length * 100).toFixed(2))
            };
        }
        
        return { method: 'non supporté', outliers: [] };
    }

    createHistogram(data, bins) {
        const min = Math.min(...data);
        const max = Math.max(...data);
        const binSize = (max - min) / bins;
        
        const histogram = Array(bins).fill(0);
        const labels = [];
        
        for (let i = 0; i < bins; i++) {
            const binStart = min + i * binSize;
            const binEnd = binStart + binSize;
            labels.push(`${binStart.toFixed(2)} - ${binEnd.toFixed(2)}`);
        }
        
        data.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
            histogram[binIndex]++;
        });
        
        return { labels, values: histogram };
    }

    generateStatisticalSummary(basicStats, distribution, normality) {
        return {
            centralTendency: `${basicStats.mean.toFixed(2)} (moyenne), ${basicStats.median.toFixed(2)} (médiane)`,
            variability: `σ = ${basicStats.stdDev.toFixed(2)}, IQR = ${basicStats.iqr.toFixed(2)}`,
            distribution: distribution.shape,
            normality: normality.interpretation,
            outliers: basicStats.count > 10 ? 'à vérifier' : 'échantillon trop petit'
        };
    }

    // Méthodes d'export
    exportAnalysis(analysis, format = 'json') {
        const exportData = {
            metadata: {
                analysisType: 'statistical',
                exportedAt: new Date().toISOString(),
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
        let csv = 'Category,Metric,Value\n';
        
        if (analysis.basic) {
            Object.entries(analysis.basic).forEach(([key, value]) => {
                csv += `Basic,${key},${value}\n`;
            });
        }
        
        if (analysis.distribution) {
            Object.entries(analysis.distribution).forEach(([key, value]) => {
                if (typeof value === 'object') continue;
                csv += `Distribution,${key},${value}\n`;
            });
        }
        
        return csv;
    }
}

// Export global
if (typeof window !== 'undefined') {
    window.StatisticalTools = StatisticalTools;
}