// Configuration Chart.js pour Spatial Research Lab
import Chart from 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js';

// Configuration globale
Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
Chart.defaults.color = '#b0bec5';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
Chart.defaults.backgroundColor = 'rgba(0, 188, 212, 0.1)';

// Enregistrement des éléments personnalisés
Chart.register({
    id: 'spatialBackground',
    beforeDraw: (chart) => {
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        
        if (!chartArea) return;
        
        // Fond dégradé
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, 'rgba(13, 27, 42, 0.8)');
        gradient.addColorStop(1, 'rgba(13, 27, 42, 0.4)');
        
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
        ctx.restore();
    }
});

// Configuration des types de graphiques
const chartConfigs = {
    line: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#b0bec5',
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(13, 27, 42, 0.9)',
                titleColor: '#00bcd4',
                bodyColor: '#ffffff',
                borderColor: 'rgba(0, 188, 212, 0.3)',
                borderWidth: 1,
                cornerRadius: 8,
                displayColors: true
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
        },
        elements: {
            line: {
                tension: 0.4,
                borderWidth: 2
            },
            point: {
                radius: 3,
                hoverRadius: 6,
                backgroundColor: '#00bcd4',
                borderColor: '#ffffff',
                borderWidth: 2
            }
        }
    },
    
    bar: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#b0bec5'
                }
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
        },
        elements: {
            bar: {
                backgroundColor: 'rgba(0, 188, 212, 0.6)',
                borderColor: 'rgba(0, 188, 212, 1)',
                borderWidth: 1,
                borderRadius: 4
            }
        }
    },
    
    radar: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#b0bec5'
                }
            }
        },
        scales: {
            r: {
                angleLines: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                pointLabels: {
                    color: '#b0bec5'
                },
                ticks: {
                    color: '#b0bec5',
                    backdropColor: 'transparent'
                }
            }
        }
    }
};

// Couleurs de la palette Spatial Research
const colorPalette = {
    quantum: '#00bcd4',
    research: '#7b1fa2',
    success: '#00c853',
    warning: '#ffab00',
    danger: '#ff1744',
    primary: '#3949ab',
    secondary: '#283593'
};

// Fonctions utilitaires
export function initCharts() {
    console.log('📊 Initialisation des graphiques...');
    
    // Initialiser tous les graphiques sur la page
    document.querySelectorAll('[data-chart]').forEach(element => {
        const chartType = element.dataset.chart;
        const chartData = element.dataset.chartData;
        
        if (chartData) {
            try {
                const data = JSON.parse(chartData);
                createChart(element, chartType, data);
            } catch (error) {
                console.error('Erreur parsing données graphique:', error);
            }
        }
    });
}

export function createChart(canvas, type, data, options = {}) {
    const ctx = canvas.getContext('2d');
    const config = {
        type,
        data: prepareChartData(data, type),
        options: { ...chartConfigs[type], ...options }
    };
    
    return new Chart(ctx, config);
}

export function updatePerformanceChart(state) {
    const chart = Chart.getChart('performance-chart');
    if (!chart) return;
    
    const metrics = [
        state.orbital.altitude.value,
        state.research.qFactor.value * 50, // Normalisation
        state.scientific.quantumEfficiency.value,
        state.research.ispEfficiency.value
    ];
    
    chart.data.datasets[0].data = metrics;
    chart.update('none');
}

function prepareChartData(data, type) {
    const baseData = {
        labels: data.labels || [],
        datasets: []
    };
    
    if (data.datasets && Array.isArray(data.datasets)) {
        data.datasets.forEach((dataset, index) => {
            const colors = getDatasetColors(index, type);
            
            baseData.datasets.push({
                label: dataset.label || `Dataset ${index + 1}`,
                data: dataset.data || [],
                ...colors,
                ...dataset
            });
        });
    }
    
    return baseData;
}

function getDatasetColors(index, type) {
    const palette = Object.values(colorPalette);
    const color = palette[index % palette.length];
    
    switch (type) {
        case 'line':
            return {
                borderColor: color,
                backgroundColor: hexToRgba(color, 0.1),
                pointBackgroundColor: color,
                pointBorderColor: '#ffffff'
            };
            
        case 'bar':
            return {
                backgroundColor: hexToRgba(color, 0.6),
                borderColor: color,
                borderWidth: 1
            };
            
        case 'radar':
            return {
                borderColor: color,
                backgroundColor: hexToRgba(color, 0.2),
                pointBackgroundColor: color,
                pointBorderColor: '#ffffff'
            };
            
        default:
            return {
                backgroundColor: color,
                borderColor: color
            };
    }
}

function hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Graphiques spécialisés
export function createOrbitalChart(canvas, trajectoryData) {
    return createChart(canvas, 'line', {
        labels: trajectoryData.map((_, index) => `T+${index * 10}s`),
        datasets: [{
            label: 'Altitude (km)',
            data: trajectoryData.map(point => point.altitude),
            borderColor: colorPalette.quantum,
            backgroundColor: hexToRgba(colorPalette.quantum, 0.1),
            fill: true
        }, {
            label: 'Vitesse (km/s)',
            data: trajectoryData.map(point => point.velocity),
            borderColor: colorPalette.research,
            backgroundColor: hexToRgba(colorPalette.research, 0.1),
            fill: true
        }]
    });
}

export function createResearchMetricsChart(canvas, metrics) {
    return createChart(canvas, 'radar', {
        labels: ['Efficacité Q', 'Rendement ISP', 'Marge Structure', 'Facteur Sécurité', 'ΔV Résiduel'],
        datasets: [{
            label: 'Métriques de Recherche',
            data: [
                metrics.qFactor * 50,
                metrics.ispEfficiency,
                metrics.structuralMargin * 3.33,
                metrics.safetyFactor * 50,
                100 - (metrics.deltaVResidual / 5)
            ],
            borderColor: colorPalette.quantum,
            backgroundColor: hexToRgba(colorPalette.quantum, 0.2),
            pointBackgroundColor: colorPalette.quantum
        }]
    });
}

export function createSimulationComparisonChart(canvas, simulations) {
    return createChart(canvas, 'bar', {
        labels: simulations.map(sim => sim.name),
        datasets: [{
            label: 'Durée (s)',
            data: simulations.map(sim => sim.duration),
            backgroundColor: colorPalette.quantum
        }, {
            label: 'Précision (%)',
            data: simulations.map(sim => sim.accuracy * 100),
            backgroundColor: colorPalette.research
        }]
    });
}

// Export global pour utilisation dans les templates
window.SpatialCharts = {
    init: initCharts,
    create: createChart,
    updatePerformance: updatePerformanceChart,
    createOrbital: createOrbitalChart,
    createResearchMetrics: createResearchMetricsChart,
    createSimulationComparison: createSimulationComparisonChart
};

export default Chart;