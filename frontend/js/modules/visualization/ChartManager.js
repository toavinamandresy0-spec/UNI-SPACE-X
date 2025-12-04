class ChartManager {
    constructor() {
        this.charts = new Map();
        this.defaultConfig = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    color: '#ffffff'
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#b0bec5'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#b0bec5'
                    }
                }
            }
        };
    }

    createChart(canvasId, type, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas avec l'ID ${canvasId} non trouvé`);
            return null;
        }

        // Détruire le chart existant s'il y en a un
        if (this.charts.has(canvasId)) {
            this.destroyChart(canvasId);
        }

        const ctx = canvas.getContext('2d');
        const mergedOptions = this.mergeOptions(options);

        const chart = new Chart(ctx, {
            type: type,
            data: this.prepareChartData(data, type),
            options: mergedOptions
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    prepareChartData(data, type) {
        switch (type) {
            case 'line':
                return this.prepareLineData(data);
            case 'bar':
                return this.prepareBarData(data);
            case 'scatter':
                return this.prepareScatterData(data);
            case 'radar':
                return this.prepareRadarData(data);
            default:
                return data;
        }
    }

    prepareLineData(data) {
        return {
            labels: data.labels || [],
            datasets: data.datasets.map((dataset, index) => ({
                label: dataset.label,
                data: dataset.data,
                borderColor: dataset.color || this.getColor(index),
                backgroundColor: this.addAlpha(dataset.color || this.getColor(index), 0.1),
                borderWidth: 2,
                fill: dataset.fill || false,
                tension: dataset.tension || 0.4
            }))
        };
    }

    prepareBarData(data) {
        return {
            labels: data.labels || [],
            datasets: data.datasets.map((dataset, index) => ({
                label: dataset.label,
                data: dataset.data,
                backgroundColor: dataset.colors || dataset.data.map((_, i) => 
                    this.addAlpha(this.getColor(i), 0.8)
                ),
                borderColor: dataset.borderColors || dataset.data.map((_, i) => this.getColor(i)),
                borderWidth: 1
            }))
        };
    }

    prepareScatterData(data) {
        return {
            datasets: data.datasets.map((dataset, index) => ({
                label: dataset.label,
                data: dataset.data,
                backgroundColor: dataset.color || this.getColor(index),
                borderColor: dataset.borderColor || '#ffffff',
                borderWidth: 1,
                pointRadius: dataset.pointRadius || 4
            }))
        };
    }

    prepareRadarData(data) {
        return {
            labels: data.labels || [],
            datasets: data.datasets.map((dataset, index) => ({
                label: dataset.label,
                data: dataset.data,
                backgroundColor: this.addAlpha(dataset.color || this.getColor(index), 0.2),
                borderColor: dataset.color || this.getColor(index),
                borderWidth: 2,
                pointBackgroundColor: dataset.color || this.getColor(index)
            }))
        };
    }

    mergeOptions(customOptions) {
        return {
            ...this.defaultConfig,
            ...customOptions,
            plugins: {
                ...this.defaultConfig.plugins,
                ...(customOptions.plugins || {})
            },
            scales: {
                ...this.defaultConfig.scales,
                ...(customOptions.scales || {})
            }
        };
    }

    // Méthodes pour les graphiques spécifiques aux simulations spatiales
    createLaunchPerformanceChart(canvasId, simulationData) {
        const data = {
            labels: ['T-60', 'T-45', 'T-30', 'T-15', 'T-0', 'T+15', 'T+30', 'T+60', 'T+120'],
            datasets: [
                {
                    label: 'Poussée (kN)',
                    data: [0, 0, 0, 0, 7500, 7200, 6800, 6500, 6000],
                    borderColor: '#00c853',
                    backgroundColor: 'rgba(0, 200, 83, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4
                },
                {
                    label: 'Altitude (km)',
                    data: [0, 0, 0, 0, 0, 15, 45, 85, 160],
                    borderColor: '#2196f3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4
                },
                {
                    label: 'Vitesse (km/s)',
                    data: [0, 0, 0, 0, 0, 0.5, 1.2, 2.1, 3.8],
                    borderColor: '#ff9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    yAxisID: 'y2',
                    tension: 0.4
                }
            ]
        };

        const options = {
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Poussée (kN)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Altitude (km)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                },
                y2: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Vitesse (km/s)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        };

        return this.createChart(canvasId, 'line', data, options);
    }

    createOrbitalParametersChart(canvasId, orbitalData) {
        const data = {
            labels: ['Altitude', 'Inclinaison', 'Excentricité', 'Période', 'Vitesse'],
            datasets: [
                {
                    label: 'Paramètres Orbitaux',
                    data: [
                        orbitalData.altitude / 1000, // Normalisation
                        orbitalData.inclination,
                        orbitalData.eccentricity * 1000, // Amplification
                        orbitalData.period / 100,
                        orbitalData.velocity
                    ],
                    backgroundColor: [
                        'rgba(0, 188, 212, 0.8)',
                        'rgba(123, 31, 162, 0.8)',
                        'rgba(255, 23, 68, 0.8)',
                        'rgba(0, 200, 83, 0.8)',
                        'rgba(255, 152, 0, 0.8)'
                    ],
                    borderColor: [
                        '#00bcd4',
                        '#7b1fa2',
                        '#ff1744',
                        '#00c853',
                        '#ff9800'
                    ],
                    borderWidth: 1
                }
            ]
        };

        const options = {
            scales: {
                r: {
                    beginAtZero: true,
                    max: Math.max(...data.datasets[0].data) * 1.2
                }
            }
        };

        return this.createChart(canvasId, 'radar', data, options);
    }

    createQuantumStateChart(canvasId, quantumData) {
        const data = {
            datasets: [
                {
                    label: 'État Quantique |0⟩',
                    data: quantumData.state0 || [{x: 0, y: 1}],
                    backgroundColor: 'rgba(0, 188, 212, 0.6)',
                    borderColor: '#00bcd4'
                },
                {
                    label: 'État Quantique |1⟩',
                    data: quantumData.state1 || [{x: 1, y: 0}],
                    backgroundColor: 'rgba(123, 31, 162, 0.6)',
                    borderColor: '#7b1fa2'
                },
                {
                    label: 'Superposition',
                    data: quantumData.superposition || [{x: 0.707, y: 0.707}],
                    backgroundColor: 'rgba(255, 23, 68, 0.6)',
                    borderColor: '#ff1744'
                }
            ]
        };

        const options = {
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: -1,
                    max: 1,
                    title: {
                        display: true,
                        text: 'Composante Réelle'
                    }
                },
                y: {
                    min: -1,
                    max: 1,
                    title: {
                        display: true,
                        text: 'Composante Imaginaire'
                    }
                }
            }
        };

        return this.createChart(canvasId, 'scatter', data, options);
    }

    createResearchMetricsChart(canvasId, metricsData) {
        const data = {
            labels: metricsData.labels || ['Efficacité', 'Précision', 'Stabilité', 'Performance'],
            datasets: [
                {
                    label: 'Métriques de Recherche',
                    data: metricsData.values || [85, 92, 78, 88],
                    backgroundColor: [
                        'rgba(0, 188, 212, 0.8)',
                        'rgba(0, 200, 83, 0.8)',
                        'rgba(255, 152, 0, 0.8)',
                        'rgba(156, 39, 176, 0.8)'
                    ],
                    borderColor: [
                        '#00bcd4',
                        '#00c853',
                        '#ff9800',
                        '#9c27b0'
                    ],
                    borderWidth: 2
                }
            ]
        };

        return this.createChart(canvasId, 'bar', data);
    }

    createRealTimeChart(canvasId, initialData = []) {
        const data = {
            labels: [],
            datasets: [
                {
                    label: 'Données Temps Réel',
                    data: initialData,
                    borderColor: '#00bcd4',
                    backgroundColor: 'rgba(0, 188, 212, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        };

        const chart = this.createChart(canvasId, 'line', data);
        
        // Retourner des méthodes pour mettre à jour le graphique en temps réel
        return {
            chart: chart,
            addData: (value, label = '') => {
                if (chart.data.labels.length > 50) {
                    chart.data.labels.shift();
                    chart.data.datasets[0].data.shift();
                }
                
                chart.data.labels.push(label || new Date().toLocaleTimeString());
                chart.data.datasets[0].data.push(value);
                chart.update('quiet');
            },
            updateData: (newData, newLabels) => {
                chart.data.labels = newLabels;
                chart.data.datasets[0].data = newData;
                chart.update();
            }
        };
    }

    // Méthodes utilitaires
    getColor(index) {
        const colors = [
            '#00bcd4', '#7b1fa2', '#ff1744', '#00c853', '#ff9800',
            '#9c27b0', '#2196f3', '#ffeb3b', '#795548', '#607d8b'
        ];
        return colors[index % colors.length];
    }

    addAlpha(color, alpha) {
        // Convertir hex en rgba
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    updateChart(canvasId, newData) {
        const chart = this.charts.get(canvasId);
        if (chart) {
            chart.data = this.prepareChartData(newData, chart.config.type);
            chart.update();
        }
    }

    destroyChart(canvasId) {
        const chart = this.charts.get(canvasId);
        if (chart) {
            chart.destroy();
            this.charts.delete(canvasId);
        }
    }

    destroyAllCharts() {
        this.charts.forEach((chart, canvasId) => {
            chart.destroy();
        });
        this.charts.clear();
    }

    exportChartAsImage(canvasId, filename = 'chart') {
        const chart = this.charts.get(canvasId);
        if (!chart) return null;

        const image = chart.toBase64Image();
        const link = document.createElement('a');
        link.download = `${filename}_${new Date().getTime()}.png`;
        link.href = image;
        link.click();
        
        return image;
    }

    getChartData(canvasId) {
        const chart = this.charts.get(canvasId);
        return chart ? chart.data : null;
    }

    // Méthode pour l'analyse statistique
    createStatisticalChart(canvasId, analysisData, chartType = 'bar') {
        switch (chartType) {
            case 'distribution':
                return this.createDistributionChart(canvasId, analysisData);
            case 'correlation':
                return this.createCorrelationMatrixChart(canvasId, analysisData);
            case 'trend':
                return this.createTrendAnalysisChart(canvasId, analysisData);
            default:
                return this.createStatisticalSummaryChart(canvasId, analysisData);
        }
    }

    createDistributionChart(canvasId, data) {
        const histogram = this.createHistogram(data.values, data.bins || 10);
        
        const chartData = {
            labels: histogram.labels,
            datasets: [{
                label: 'Distribution des données',
                data: histogram.values,
                backgroundColor: 'rgba(0, 188, 212, 0.6)',
                borderColor: '#00bcd4',
                borderWidth: 1
            }]
        };

        return this.createChart(canvasId, 'bar', chartData, {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: data.xLabel || 'Valeurs'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Fréquence'
                    },
                    beginAtZero: true
                }
            }
        });
    }

    createHistogram(values, bins) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const binSize = (max - min) / bins;
        
        const histogram = Array(bins).fill(0);
        const labels = [];
        
        for (let i = 0; i < bins; i++) {
            const binStart = min + i * binSize;
            const binEnd = binStart + binSize;
            labels.push(`${binStart.toFixed(2)} - ${binEnd.toFixed(2)}`);
        }
        
        values.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
            histogram[binIndex]++;
        });
        
        return { labels, values: histogram };
    }
}

// Export global
if (typeof window !== 'undefined') {
    window.ChartManager = ChartManager;
}