/**
 * Franchise Charts Module
 * Handles creating and rendering charts for the franchise page
 */

const FranchiseCharts = (function() {
    // Private variables
    let _charts = {}; // Store chart instances to destroy when needed
    
    // Create score distribution chart
    function createScoreDistributionChart(containerId, teamStats) {
        const chartContainer = document.getElementById(containerId);
        if (!chartContainer || !teamStats || teamStats.games < 5) {
            if (chartContainer) {
                chartContainer.innerHTML = '<p class="no-data">Insufficient data for score distribution chart.</p>';
            }
            return;
        }
        
        // Clear container
        chartContainer.innerHTML = '';
        
        // Create canvas with unique ID
        const canvas = document.createElement('canvas');
        canvas.id = 'scoreDistributionChart_' + new Date().getTime();
        chartContainer.appendChild(canvas);
        
        // Prepare data for histogram
        const scores = teamStats.gameLog.map(game => game.teamScore);
        
        // Get league-wide scores for comparison
        const leagueScores = DataService.getAllScores();
        
        // Define bins
        const minScore = Math.floor(Math.min(...scores, ...leagueScores) / 10) * 10;
        const maxScore = Math.ceil(Math.max(...scores, ...leagueScores) / 10) * 10;
        const binWidth = 20;
        const bins = [];
        
        for (let i = minScore; i <= maxScore; i += binWidth) {
            bins.push({
                min: i,
                max: i + binWidth,
                count: 0,
                leagueCount: 0,
                label: `${i}-${i + binWidth}`
            });
        }
        
        // Count scores in each bin for team
        scores.forEach(score => {
            for (const bin of bins) {
                if (score >= bin.min && score < bin.max) {
                    bin.count++;
                    break;
                }
            }
        });
        
        // Count scores in each bin for league
        leagueScores.forEach(score => {
            for (const bin of bins) {
                if (score >= bin.min && score < bin.max) {
                    bin.leagueCount++;
                    break;
                }
            }
        });
        
        // Calculate percentages
        bins.forEach(bin => {
            bin.percentage = (bin.count / scores.length) * 100;
            bin.leaguePercentage = (bin.leagueCount / leagueScores.length) * 100;
        });
        
        // Calculate league mean and standard deviation for normal distribution
        const leagueMean = leagueScores.reduce((sum, score) => sum + score, 0) / leagueScores.length;
        const leagueVariance = leagueScores.reduce((sum, score) => sum + Math.pow(score - leagueMean, 2), 0) / leagueScores.length;
        const leagueStdDev = Math.sqrt(leagueVariance);
        
        // Create normal distribution curve points
        const normalDistribution = bins.map(bin => {
            // Use midpoint of bin for x value
            const x = (bin.min + bin.max) / 2;
            
            // Normal distribution formula
            // f(x) = (1 / (σ * sqrt(2π))) * e^(-0.5 * ((x - μ) / σ)^2)
            const normalValue = (1 / (leagueStdDev * Math.sqrt(2 * Math.PI))) * 
                                Math.exp(-0.5 * Math.pow((x - leagueMean) / leagueStdDev, 2));
            
            // Scale to percentage (area under normal curve = 1, so multiply by binWidth and 100 for percentage)
            return normalValue * binWidth * 100;
        });
        
        // Create chart
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (_charts[containerId]) {
            _charts[containerId].destroy();
        }
        
        // Generate gradients for the area
        const teamGradient = ctx.createLinearGradient(0, 0, 0, 400);
        teamGradient.addColorStop(0, 'rgba(220, 53, 69, 0.7)');
        teamGradient.addColorStop(1, 'rgba(220, 53, 69, 0.1)');
        
        _charts[containerId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: bins.map(bin => bin.label),
                datasets: [
                    {
                        label: 'Team Score Distribution',
                        data: bins.map(bin => bin.percentage),
                        backgroundColor: teamGradient,
                        borderColor: '#dc3545',
                        borderWidth: 2,
                        pointRadius: 4,
                        pointBackgroundColor: '#dc3545',
                        tension: 0.4,
                        fill: true,
                        order: 1
                    },
                    {
                        label: 'League Score Distribution',
                        data: bins.map(bin => bin.leaguePercentage),
                        borderColor: '#10b981',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.4,
                        fill: false,
                        order: 2
                    },
                    {
                        label: 'League Statistical Normal Distribution',
                        data: normalDistribution,
                        borderColor: '#ef4444',
                        borderWidth: 2,
                        pointRadius: 0,
                        borderDash: [5, 5],
                        tension: 0.4,
                        fill: false,
                        order: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Score Distribution',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                const item = tooltipItems[0];
                                const index = item.dataIndex;
                                const bin = bins[index];
                                
                                return `Score Range: ${bin.min}-${bin.max}`;
                            },
                            label: function(context) {
                                const percentage = context.raw.toFixed(1);
                                if (context.datasetIndex === 0) {
                                    const count = bins[context.dataIndex].count;
                                    return [
                                        `${context.dataset.label}: ${percentage}%`,
                                        `(${count} games)`
                                    ];
                                } else {
                                    return `${context.dataset.label}: ${percentage}%`;
                                }
                            }
                        },
                        padding: 10,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        titleFont: {
                            size: 13
                        },
                        bodyFont: {
                            size: 13
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Percentage of Games',
                            font: {
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            },
                            padding: 5
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            drawBorder: false
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Score Range',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            padding: 5
                        }
                    }
                }
            }
        });
        
        return _charts[containerId];
    }
    
    // Public API
    return {
        createScoreDistributionChart: createScoreDistributionChart
    };
})();
