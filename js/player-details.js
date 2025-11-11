// Global variables
let playerIds = [];
let rosters = [];
let nflTeamColors = null;

// Function to create position comparison chart using position_analysis.json
async function createPositionComparisonChart(playerId, chartContainer) {
    const canvas = document.getElementById('positionChart');
    const loadingDiv = document.getElementById('chartLoading');
    
    if (!canvas || !loadingDiv) {
        console.error('Chart elements not found');
        return;
    }
    
    try {
        loadingDiv.textContent = 'Loading position data...';
        
        const response = await fetch('../data/position_analysis.json');
        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.status}`);
        }
        const positionData = await response.json();
        
        const currentPlayer = positionData.find(p => p.playerId == playerId);
        if (!currentPlayer) {
            loadingDiv.textContent = 'Player not found in position analysis data';
            return;
        }
        
        const playerPosition = currentPlayer.position;
        const positionMean = currentPlayer.positionAveragePointsPerWeek;
        const positionStdDev = currentPlayer.positionStDevPointsPerWeek;
        const playerMean = currentPlayer.playerAveragePointsPerWeek;
        const playerStdDev = currentPlayer.playerStDevPointsPerWeek;
        
        // Generate normal distribution curves
        const generateNormalCurve = (mean, stdDev, min, max, points = 100) => {
            const step = (max - min) / points;
            const curve = [];
            
            for (let i = 0; i <= points; i++) {
                const x = min + i * step;
                const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * 
                          Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
                curve.push({ x, y });
            }
            
            return curve;
        };
        
        const minPoints = Math.max(0, Math.min(positionMean - 3 * positionStdDev, playerMean - 3 * playerStdDev));
        const maxPoints = Math.max(positionMean + 3 * positionStdDev, playerMean + 3 * playerStdDev);
        
        const positionCurve = generateNormalCurve(positionMean, positionStdDev, minPoints, maxPoints);
        const playerCurve = generateNormalCurve(playerMean, playerStdDev, minPoints, maxPoints);
        
        loadingDiv.style.display = 'none';
        canvas.style.display = 'block';
        
        // Add toggle for true vs weighted curves
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'chart-toggle-container';
        toggleContainer.innerHTML = `
            <div class="chart-toggle">
                <label class="toggle-label">Distribution Type:</label>
                <button id="trueDistBtn" class="toggle-btn active">True Distribution</button>
                <button id="weightedDistBtn" class="toggle-btn">Weighted (Standardized)</button>
            </div>
        `;
        chartContainer.insertBefore(toggleContainer, canvas);
        
        let currentChart = new Chart(canvas, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: `${playerPosition} Position Average`,
                        data: positionCurve,
                        borderColor: '#ffc107',
                        backgroundColor: 'rgba(255, 193, 7, 0.3)',
                        fill: true,
                        pointRadius: 0,
                        tension: 0.4,
                        borderWidth: 2
                    },
                    {
                        label: `${currentPlayer.name}`,
                        data: playerCurve,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.3)',
                        fill: true,
                        pointRadius: 0,
                        tension: 0.4,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Fantasy Points per Week',
                            font: { size: 14, weight: 'bold' }
                        },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Probability Density',
                            font: { size: 14, weight: 'bold' }
                        },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${playerPosition} Performance Distribution`,
                        font: { size: 16, weight: 'bold' },
                        color: '#fff'
                    },
                    legend: {
                        display: true,
                        labels: { color: '#fff', font: { size: 12 } }
                    },
                    tooltip: {
                        callbacks: {
                            title: function() { return ''; },
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(4)} density at ${context.parsed.x.toFixed(1)} pts`;
                            }
                        }
                    }
                }
            }
        });
        
        // Function to calculate weighted (standardized) curves
        const generateWeightedCurves = () => {
            // Position baseline at 0 (position average becomes the reference point)
            const positionWeightedCurve = generateNormalCurve(0, 1, -4, 4);
            
            // Player performance relative to their position average (in position standard deviations)
            const playerRelativePerformance = (playerMean - positionMean) / positionStdDev;
            const playerRelativeConsistency = playerStdDev / positionStdDev;
            const playerWeightedCurve = generateNormalCurve(playerRelativePerformance, playerRelativeConsistency, -4, 4);
            
            return {
                position: positionWeightedCurve,
                player: playerWeightedCurve
            };
        };
        
        // Toggle event handlers
        setTimeout(() => {
            const trueDistBtn = document.getElementById('trueDistBtn');
            const weightedDistBtn = document.getElementById('weightedDistBtn');
            
            if (trueDistBtn && weightedDistBtn) {
                trueDistBtn.addEventListener('click', function() {
                    if (!this.classList.contains('active')) {
                        this.classList.add('active');
                        weightedDistBtn.classList.remove('active');
                        
                        currentChart.data.datasets[0].data = positionCurve;
                        currentChart.data.datasets[1].data = playerCurve;
                        currentChart.options.scales.x.title.text = 'Fantasy Points per Week';
                        currentChart.update();
                    }
                });
                
                weightedDistBtn.addEventListener('click', function() {
                    if (!this.classList.contains('active')) {
                        this.classList.add('active');
                        trueDistBtn.classList.remove('active');
                        
                        const weightedCurves = generateWeightedCurves();
                        currentChart.data.datasets[0].data = weightedCurves.position;
                        currentChart.data.datasets[1].data = weightedCurves.player;
                        currentChart.options.scales.x.title.text = 'Standardized Performance (Standard Deviations)';
                        currentChart.update();
                    }
                });
            }
        }, 100);
        
        // Add comparison stats
        const statsDiv = document.createElement('div');
        statsDiv.className = 'position-stats-grid';
        
        const difference = (playerMean - positionMean).toFixed(1);
        const diffSign = difference >= 0 ? '+' : '';
        const diffColor = difference >= 0 ? '#28a745' : '#dc3545';
        
        statsDiv.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Player Performance</div>
                <div class="stat-value">${playerMean.toFixed(1)} pts/week</div>
                <div class="stat-detail">±${playerStdDev.toFixed(1)} std dev</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">${playerPosition} Position Average</div>
                <div class="stat-value">${positionMean.toFixed(1)} pts/week</div>
                <div class="stat-detail">±${positionStdDev.toFixed(1)} std dev</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Performance vs Position</div>
                <div class="stat-value" style="color: ${diffColor}">${diffSign}${difference} pts/week</div>
                <div class="stat-detail">${currentPlayer.gamesPlayed} games played</div>
            </div>
        `;
        
        chartContainer.appendChild(statsDiv);
        
    } catch (error) {
        console.error('Error creating chart:', error);
        loadingDiv.textContent = `Error: ${error.message}`;
    }
}

// Function to fetch data from a URL
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch data from ${url}: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching data from ${url}:`, error);
        return null;
    }
}

// Function to get all available seasons
async function getAvailableSeasons() {
    try {
        const seasonsData = await fetchData('../data/available_seasons.json');
        if (seasonsData) {
            return seasonsData;
        }
    } catch (error) {
        console.warn('No available_seasons.json file, trying to scan folders');
    }
    return [2025, 2024, 2023, 2022, 2021, 2020, 2019];
}

// Function to get all weeks for a season
async function getAvailableWeeks(season) {
    try {
        const weeksData = await fetchData(`../data/rosters/${season}/available_weeks.json`);
        if (weeksData) {
            return weeksData;
        }
    } catch (error) {
        console.warn(`No available_weeks.json file for season ${season}, using default range`);
    }
    return Array.from({ length: 17 }, (_, i) => i + 1);
}

// Function to load roster data for a specific week and season
async function loadRosterData(season, week) {
    const url = `../data/rosters/${season}/week_${week}_rosters.json`;
    try {
        const data = await fetchData(url);
        return data;
    } catch (error) {
        console.warn(`Could not load roster data for ${season} week ${week}: ${error.message}`);
        return null;
    }
}

// Function to load NFL team colors
async function loadNFLTeamColors() {
    if (nflTeamColors) return nflTeamColors; // Return cached data if available
    
    try {
        const colorsData = await fetchData('../assets/nfl-team-colors.json');
        if (colorsData && colorsData.teams) {
            nflTeamColors = colorsData.teams;
            return nflTeamColors;
        }
    } catch (error) {
        console.warn('Failed to load NFL team colors:', error);
    }
    
    return null;
}

// Function to get team colors by abbreviation
function getTeamColors(abbreviation) {
    if (!nflTeamColors || !abbreviation) return null;
    
    const teamData = nflTeamColors.find(team => 
        team.abbreviation.toUpperCase() === abbreviation.toUpperCase());
    
    return teamData ? teamData.colors : null;
}

// Function to find player data in roster file
function findPlayerInRoster(rosterData, playerId) {
    if (!rosterData || !rosterData.teams) {
        return null;
    }

    for (const team of rosterData.teams) {
        if (!team.roster) continue;

        for (const player of team.roster) {
            if (player.playerId && player.playerId.toString() === playerId.toString()) {
                return {
                    ...player,
                    teamName: team.team_name || `Team ${team.team_id}`,
                    owner: team.owner || 'Unknown',
                    teamId: team.team_id,
                    year: rosterData.year,
                    week: rosterData.week
                };
            }
        }
    }
    return null;
}

// Function to collect player data across all weeks and seasons
async function collectPlayerPerformanceHistory(playerId) {
    console.log(`Collecting performance history for player ID: ${playerId}`);
    const seasons = await getAvailableSeasons();
    const performanceHistory = [];

    for (const season of seasons) {
        console.log(`Scanning season: ${season}`);
        const weeks = await getAvailableWeeks(season);

        for (const week of weeks) {
            console.log(`Loading data for ${season} week ${week}...`);
            const rosterData = await loadRosterData(season, week);

            if (rosterData) {
                const playerData = findPlayerInRoster(rosterData, playerId);
                if (playerData) {
                    console.log(`Found player in ${season} week ${week}`);
                    performanceHistory.push(playerData);
                }
            }
        }
    }

    performanceHistory.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.week - a.week;
    });

    console.log(`Total performances found: ${performanceHistory.length}`);
    return performanceHistory;
}

// Utility function to safely apply toFixed to potentially null values
function safeToFixed(value, digits = 1) {
    if (value === null || value === undefined || isNaN(value)) {
        return '0.0';
    }
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
        return '0.0';
    }
    return numValue.toFixed(digits);
}

// Add a utility function to cap values between min and max
function capValue(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
}

// Function to calculate player statistics from performance history
function calculatePlayerStats(performanceHistory) {
    const defaultStats = {
        totalPoints: 0,
        ppg: 0,
        fpPlus: 0,
        fpPlusR: 0,
        bestGame: 0,
        medianPerformance: 0,
        stdDev: 0,
        seasonEquivalent: 0,
        pointContribution: 0,
        chosGrade: 0,
        chosGradeComponents: {
            baseProduction: 0,
            efficiency: 0,
            reliability: 0
        }
    };

    if (!performanceHistory || !Array.isArray(performanceHistory) || performanceHistory.length === 0) {
        return defaultStats;
    }

    try {
        const validGames = performanceHistory.filter(game =>
            game && game.actualPoints !== undefined && game.actualPoints !== null && !isNaN(game.actualPoints));

        if (validGames.length === 0) {
            return defaultStats;
        }

        const totalPoints = validGames.reduce((sum, game) => sum + (parseFloat(game.actualPoints) || 0), 0);
        const gamesPlayed = validGames.length;
        const ppg = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0;
        const bestGame = validGames.length > 0 ?
            Math.max(...validGames.map(game => parseFloat(game.actualPoints) || 0)) : 0;

        const sortedPoints = validGames
            .map(game => parseFloat(game.actualPoints) || 0)
            .sort((a, b) => a - b);

        let medianPerformance = 0;
        if (sortedPoints.length > 0) {
            const mid = Math.floor(sortedPoints.length / 2);
            medianPerformance = sortedPoints.length % 2 === 0
                ? (sortedPoints[mid - 1] + sortedPoints[mid]) / 2
                : sortedPoints[mid];
        }

        const mean = ppg;
        const squareDiffs = sortedPoints.map(value => {
            const diff = value - mean;
            return diff * diff;
        });
        const avgSquareDiff = squareDiffs.length > 0 ? squareDiffs.reduce((sum, value) => sum + value, 0) / squareDiffs.length : 0;
        const stdDev = Math.sqrt(avgSquareDiff);
        const seasonEquivalent = ppg * 17;

        // Calculate CHOS Grade components
        
        // Get position data for the player
        const playerPosition = getPlayerPosition(validGames[0]);
        
        // Position average data (these would ideally come from a data source)
        const positionData = getPositionAverages(playerPosition);
        
        // Base Production Score (40 points max)
        const ppgRatio = capValue(ppg / positionData.avgPPG, 0, 1.6); // Cap at 1.6x position average
        const parScore = capValue((ppg - positionData.replacementValue) / positionData.stdDevPAR, -2, 2); // Normalize PAR score between -2 and 2
        const consistencyScore = capValue(1 - (stdDev / positionData.avgStdDev), 0, 1.5); // Allow up to 1.5x better consistency
        
        const baseProduction = 
            (ppgRatio * 25) + 
            ((parScore + 2) / 4 * 10) + // Rescale from [-2,2] to [0,1] then multiply by 10
            (consistencyScore * 5);
        
        // Efficiency Score (30 points max)
        const ppoRatio = capValue(calculatePPO(validGames) / positionData.avgPPO, 0, 1.5); // Cap at 1.5x position average
        
        // Calculate actual vs projected ratio - cap at 1.5 to prevent extreme values
        const totalProjected = validGames.reduce((sum, game) => sum + (parseFloat(game.projectedPoints) || 0), 0);
        const actualVsProjectedRatio = capValue(totalProjected > 0 ? totalPoints / totalProjected : 1, 0, 1.5);
        
        // Calculate playoff performance ratio - cap at 2.0 for exceptional playoff performers
        const regularSeasonGames = validGames.filter(game => game.week <= 14);
        const playoffGames = validGames.filter(game => game.week > 14);
        
        const regularSeasonPPG = regularSeasonGames.length > 0 ? 
            regularSeasonGames.reduce((sum, game) => sum + (parseFloat(game.actualPoints) || 0), 0) / regularSeasonGames.length : 0;
        
        const playoffPoints = playoffGames.reduce((sum, game) => sum + (parseFloat(game.actualPoints) || 0), 0);
        const playoffRatio = capValue(regularSeasonPPG > 0 && playoffGames.length > 0 ? 
            playoffPoints / (regularSeasonPPG * playoffGames.length) : 1, 0, 2.0);
        
        const efficiency = 
            (ppoRatio * 15) + 
            (actualVsProjectedRatio * 10) + 
            (playoffRatio * 5);
        
        // Reliability Score (30 points max)
        const weeksStarted = validGames.filter(game => 
            game.slotPosition && !game.slotPosition.includes('Bench')).length;
        const weeksRostered = validGames.length;
        const totalWeeks = 17; // Assuming a 17-week season
        
        const startRatio = weeksRostered > 0 ? weeksStarted / weeksRostered : 0;
        const availabilityRatio = totalWeeks > 0 ? weeksRostered / totalWeeks : 0;
        
        const reliability = 
            (startRatio * 15) + 
            (availabilityRatio * 15);
        
        // Calculate Fantasy Points Plus (FP+) using real data instead of placeholder
        // FP+ is a player's points compared to position average, normalized to 100
        const positionAvgPPG = positionData.avgPPG;
        const fpPlus = positionAvgPPG > 0 ? (ppg / positionAvgPPG) * 100 : 100;
        
        // Calculate FP+R (Fantasy Points Plus Realized)
        // This only counts games where the player was actually in the starting lineup
        const startingGames = validGames.filter(game => 
            !game.slotPosition?.includes('Bench') && game.slotPosition !== 'BE');
        
        let fpPlusR = fpPlus; // Default to same as FP+ if no starting games
        
        if (startingGames.length > 0) {
            const startingPoints = startingGames.reduce((sum, game) => 
                sum + (parseFloat(game.actualPoints) || 0), 0);
            const startingPPG = startingPoints / startingGames.length;
            fpPlusR = positionAvgPPG > 0 ? (startingPPG / positionAvgPPG) * 100 : 100;
        }
        
        // Calculate Point Contribution using real data
        // This is player points as a percentage of team points when they started
        let pointContribution = 0;
        const startingGamesForContribution = validGames.filter(game => !game.slotPosition?.includes('Bench'));
        
        if (startingGamesForContribution.length > 0) {
            // Sum points scored by player when starting
            const playerStartingPoints = startingGamesForContribution.reduce((sum, game) => 
                sum + (parseFloat(game.actualPoints) || 0), 0);
            
            // Estimate team points when player started
            // A typical fantasy team scores around 110-130 points per week
            // Using 120 as an average team score
            const estimatedTeamPoints = startingGamesForContribution.length * 120;
            
            // Calculate contribution percentage
            pointContribution = (playerStartingPoints / estimatedTeamPoints) * 100;
        }
        
        // Calculate final CHOS Grade and ensure it's in 0-100 range
        const rawGrade = baseProduction + efficiency + reliability;
        const chosGrade = capValue(rawGrade, 0, 100);
        
        return {
            totalPoints: totalPoints,
            ppg: ppg,
            fpPlus: fpPlus,
            fpPlusR: fpPlusR,
            bestGame: bestGame,
            medianPerformance: medianPerformance,
            stdDev: stdDev,
            seasonEquivalent: seasonEquivalent,
            pointContribution: pointContribution,
            chosGrade: chosGrade,
            chosGradeComponents: {
                baseProduction: capValue(baseProduction, 0, 40),
                efficiency: capValue(efficiency, 0, 30),
                reliability: capValue(reliability, 0, 30)
            }
        };
    } catch (error) {
        console.error('Error calculating player stats:', error);
        return defaultStats;
    }
}

// Function to get position-specific averages
function getPositionAverages(position) {
    // These values would typically come from a data source
    // Placeholder values for demonstration
    const positionData = {
        'QB': { avgPPG: 20, replacementValue: 15, stdDevPAR: 5, avgStdDev: 7, avgPPO: 0.8 },
        'RB': { avgPPG: 15, replacementValue: 8, stdDevPAR: 4, avgStdDev: 6, avgPPO: 0.6 },
        'WR': { avgPPG: 14, replacementValue: 7, stdDevPAR: 4, avgStdDev: 5.5, avgPPO: 0.5 },
        'TE': { avgPPG: 10, replacementValue: 5, stdDevPAR: 3, avgStdDev: 4, avgPPO: 0.4 },
        'K': { avgPPG: 8, replacementValue: 6, stdDevPAR: 2, avgStdDev: 3, avgPPO: 0.9 },
        'DST': { avgPPG: 8, replacementValue: 5, stdDevPAR: 3, avgStdDev: 4, avgPPO: 0.7 }
    };
    
    // Return the data for the requested position or default values if position not found
    return positionData[position] || { avgPPG: 10, replacementValue: 5, stdDevPAR: 3, avgStdDev: 5, avgPPO: 0.5 };
}

// Function to calculate points per opportunity (PPO)
function calculatePPO(games) {
    // This would be more sophisticated in a real implementation
    // Ideally, we'd have data on touches, targets, etc.
    // For now, using a simple placeholder calculation
    const totalPoints = games.reduce((sum, game) => sum + (parseFloat(game.actualPoints) || 0), 0);
    const totalOpportunities = games.length * 10; // Placeholder: assuming 10 opportunities per game
    
    return totalOpportunities > 0 ? totalPoints / totalOpportunities : 0;
}

// Function to create past performance content
function createPastPerformanceContent(performanceHistory) {
    const container = document.createElement('div');

    if (!performanceHistory || performanceHistory.length === 0) {
        const noData = document.createElement('p');
        noData.textContent = 'No performance data available for this player.';
        container.appendChild(noData);
        return container;
    }

    const seasonGroups = {};
    performanceHistory.forEach(game => {
        if (!seasonGroups[game.year]) {
            seasonGroups[game.year] = [];
        }
        seasonGroups[game.year].push(game);
    });

    Object.keys(seasonGroups).sort((a, b) => b - a).forEach(season => {
        const seasonSection = document.createElement('div');
        seasonSection.className = 'season-section';

        const seasonHeader = document.createElement('h3');
        seasonHeader.textContent = `${season} Season`;
        seasonSection.appendChild(seasonHeader);

        const gamesTable = document.createElement('table');
        gamesTable.className = 'games-table';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Week', 'Owner', 'Position', 'Points', 'Proj.'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        gamesTable.appendChild(thead);

        const tbody = document.createElement('tbody');
        seasonGroups[season].sort((a, b) => b.week - a.week).forEach(game => {
            const row = document.createElement('tr');

            const weekCell = document.createElement('td');
            weekCell.textContent = game.week;
            row.appendChild(weekCell);

            const teamCell = document.createElement('td');
            teamCell.textContent = game.owner;
            row.appendChild(teamCell);

            const positionCell = document.createElement('td');
            positionCell.textContent = game.slotPosition;
            row.appendChild(positionCell);

            const pointsCell = document.createElement('td');
            pointsCell.textContent = safeToFixed(game.actualPoints);
            row.appendChild(pointsCell);

            const projCell = document.createElement('td');
            projCell.textContent = safeToFixed(game.projectedPoints);
            row.appendChild(projCell);

            tbody.appendChild(row);
        });
        gamesTable.appendChild(tbody);
        seasonSection.appendChild(gamesTable);

        container.appendChild(seasonSection);
    });

    return container;
}

// Function to create the CHOS Grade explanation modal
function createChosGradeModal(playerStats) {
    // Create modal elements
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop';
    
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const modalTitle = document.createElement('h2');
    modalTitle.className = 'modal-title';
    modalTitle.textContent = 'CHOS Grade Calculation Explained';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
        modalBackdrop.classList.remove('active');
        setTimeout(() => {
            modalBackdrop.remove();
        }, 300);
    });
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    // Modal body
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    
    // Overall explanation
    const overallExplanation = document.createElement('div');
    overallExplanation.className = 'grade-explanation';
    
    const overallText = document.createElement('p');
    overallText.textContent = 'The CHOS Grade is a comprehensive player evaluation system that combines production, efficiency, and reliability metrics to provide a 0-100 grade for fantasy players.';
    
    const formulaDisplay = document.createElement('div');
    formulaDisplay.className = 'grade-formula';
    formulaDisplay.innerHTML = `CHOS Grade = Base Production (40%) + Efficiency (30%) + Reliability (30%)
    
Final Grade: <strong>${playerStats.chosGrade.toFixed(1)} / 100</strong> (${getLetterGrade(playerStats.chosGrade)})`;
    
    overallExplanation.appendChild(overallText);
    overallExplanation.appendChild(formulaDisplay);
    
    modalBody.appendChild(overallExplanation);
    
    // Component 1: Base Production
    const baseProductionExplanation = document.createElement('div');
    baseProductionExplanation.className = 'component-explanation';
    
    const baseTitle = document.createElement('h3');
    baseTitle.className = 'component-title';
    baseTitle.textContent = 'Base Production (40 points max)';
    
    const baseScore = document.createElement('p');
    baseScore.innerHTML = `<strong>Score:</strong> ${playerStats.chosGradeComponents.baseProduction.toFixed(1)} / 40 points`;
    
    const baseFormula = document.createElement('p');
    baseFormula.innerHTML = `Base Production Score = 
    (Player PPG / Position Avg PPG) * 25 + 
    (PAR Score) * 10 + 
    (1 - (StdDev / Position Avg StdDev)) * 5`;
    
    const baseCalcSteps = document.createElement('div');
    baseCalcSteps.className = 'calculation-steps';
    
    [
        {
            name: 'PPG Ratio',
            description: 'How player\'s points per game compare to position average',
            formula: '(Player PPG / Position Avg PPG) * 25'
        },
        {
            name: 'PAR Score',
            description: 'Points Above Replacement - how player performs compared to waiver wire options',
            formula: '(PPG - Replacement Value) / Standard Deviation * 10'
        },
        {
            name: 'Consistency',
            description: 'How consistent player performance is compared to position average',
            formula: '(1 - (StdDev / Position Avg StdDev)) * 5'
        }
    ].forEach(step => {
        const stepElement = document.createElement('div');
        stepElement.className = 'calculation-step';
        
        const stepInfo = document.createElement('div');
        
        const stepName = document.createElement('div');
        stepName.className = 'calculation-name';
        stepName.textContent = step.name;
        stepInfo.appendChild(stepName);
        
        const stepDesc = document.createElement('div');
        stepDesc.className = 'calculation-description';
        stepDesc.textContent = step.description;
        stepInfo.appendChild(stepDesc);
        
        const stepFormula = document.createElement('div');
        stepFormula.className = 'calculation-formula';
        stepFormula.textContent = step.formula;
        stepInfo.appendChild(stepFormula);
        
        stepElement.appendChild(stepInfo);
        baseCalcSteps.appendChild(stepElement);
    });
    
    baseProductionExplanation.appendChild(baseTitle);
    baseProductionExplanation.appendChild(baseScore);
    baseProductionExplanation.appendChild(baseFormula);
    baseProductionExplanation.appendChild(baseCalcSteps);
    
    modalBody.appendChild(baseProductionExplanation);
    
    // Component 2: Efficiency
    const efficiencyExplanation = document.createElement('div');
    efficiencyExplanation.className = 'component-explanation';
    
    const effTitle = document.createElement('h3');
    effTitle.className = 'component-title';
    effTitle.textContent = 'Efficiency (30 points max)';
    
    const effScore = document.createElement('p');
    effScore.innerHTML = `<strong>Score:</strong> ${playerStats.chosGradeComponents.efficiency.toFixed(1)} / 30 points`;
    
    const effFormula = document.createElement('p');
    effFormula.innerHTML = `Efficiency Score = 
    (Player PPO / Position Avg PPO) * 15 + 
    (Actual Points / Projected Points) * 10 + 
    (Playoff Points / Regular Season PPG) * 5`;
    
    const effCalcSteps = document.createElement('div');
    effCalcSteps.className = 'calculation-steps';
    
    [
        {
            name: 'Points Per Opportunity',
            description: 'How efficiently player uses their opportunities',
            formula: '(Player PPO / Position Avg PPO) * 15'
        },
        {
            name: 'Projection Accuracy',
            description: 'How player performs versus expectations',
            formula: '(Actual Points / Projected Points) * 10'
        },
        {
            name: 'Playoff Performance',
            description: 'How player performs in high-stakes playoff weeks',
            formula: '(Playoff Points / Regular Season PPG) * 5'
        }
    ].forEach(step => {
        const stepElement = document.createElement('div');
        stepElement.className = 'calculation-step';
        
        const stepInfo = document.createElement('div');
        
        const stepName = document.createElement('div');
        stepName.className = 'calculation-name';
        stepName.textContent = step.name;
        stepInfo.appendChild(stepName);
        
        const stepDesc = document.createElement('div');
        stepDesc.className = 'calculation-description';
        stepDesc.textContent = step.description;
        stepInfo.appendChild(stepDesc);
        
        const stepFormula = document.createElement('div');
        stepFormula.className = 'calculation-formula';
        stepFormula.textContent = step.formula;
        stepInfo.appendChild(stepFormula);
        
        stepElement.appendChild(stepInfo);
        effCalcSteps.appendChild(stepElement);
    });
    
    efficiencyExplanation.appendChild(effTitle);
    efficiencyExplanation.appendChild(effScore);
    efficiencyExplanation.appendChild(effFormula);
    efficiencyExplanation.appendChild(effCalcSteps);
    
    modalBody.appendChild(efficiencyExplanation);
    
    // Component 3: Reliability
    const reliabilityExplanation = document.createElement('div');
    reliabilityExplanation.className = 'component-explanation';
    
    const relTitle = document.createElement('h3');
    relTitle.className = 'component-title';
    relTitle.textContent = 'Reliability (30 points max)';
    
    const relScore = document.createElement('p');
    relScore.innerHTML = `<strong>Score:</strong> ${playerStats.chosGradeComponents.reliability.toFixed(1)} / 30 points`;
    
    const relFormula = document.createElement('p');
    relFormula.innerHTML = `Reliability Score = 
    (Weeks Started / Weeks Rostered) * 15 + 
    (Weeks Rostered / Total Weeks) * 15`;
    
    const relCalcSteps = document.createElement('div');
    relCalcSteps.className = 'calculation-steps';
    
    [
        {
            name: 'Starting Percentage',
            description: 'How often player was in starting lineups when rostered',
            formula: '(Weeks Started / Weeks Rostered) * 15'
        },
        {
            name: 'Availability',
            description: 'How often player was on a roster throughout the season',
            formula: '(Weeks Rostered / Total Weeks) * 15'
        }
    ].forEach(step => {
        const stepElement = document.createElement('div');
        stepElement.className = 'calculation-step';
        
        const stepInfo = document.createElement('div');
        
        const stepName = document.createElement('div');
        stepName.className = 'calculation-name';
        stepName.textContent = step.name;
        stepInfo.appendChild(stepName);
        
        const stepDesc = document.createElement('div');
        stepDesc.className = 'calculation-description';
        stepDesc.textContent = step.description;
        stepInfo.appendChild(stepDesc);
        
        const stepFormula = document.createElement('div');
        stepFormula.className = 'calculation-formula';
        stepFormula.textContent = step.formula;
        stepInfo.appendChild(stepFormula);
        
        stepElement.appendChild(stepInfo);
        relCalcSteps.appendChild(stepElement);
    });
    
    reliabilityExplanation.appendChild(relTitle);
    reliabilityExplanation.appendChild(relScore);
    reliabilityExplanation.appendChild(relFormula);
    reliabilityExplanation.appendChild(relCalcSteps);
    
    modalBody.appendChild(reliabilityExplanation);
    
    // Modal footer
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    
    const closeModalButton = document.createElement('button');
    closeModalButton.className = 'modal-button';
    closeModalButton.textContent = 'Close';
    closeModalButton.addEventListener('click', () => {
        modalBackdrop.classList.remove('active');
        setTimeout(() => {
            modalBackdrop.remove();
        }, 300);
    });
    
    modalFooter.appendChild(closeModalButton);
    
    // Assemble modal
    modalContainer.appendChild(modalHeader);
    modalContainer.appendChild(modalBody);
    modalContainer.appendChild(modalFooter);
    modalBackdrop.appendChild(modalContainer);
    
    // Add to document
    document.body.appendChild(modalBackdrop);
    
    // Trigger animation after a small delay
    setTimeout(() => {
        modalBackdrop.classList.add('active');
    }, 10);
    
    // Close modal when clicking outside
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
            modalBackdrop.classList.remove('active');
            setTimeout(() => {
                modalBackdrop.remove();
            }, 300);
        }
    });
}

async function initializePlayerDetails() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const playerId = urlParams.get('id');

        if (!playerId) {
            showError('No player ID provided');
            return;
        }

        console.log(`Initializing player details for player ID: ${playerId}`);
        
        // Load NFL team colors first
        await loadNFLTeamColors();

        const performanceHistory = await collectPlayerPerformanceHistory(playerId);

        if (!performanceHistory || performanceHistory.length === 0) {
            showError(`No data found for player with ID ${playerId}`);
            return;
        }

        const mostRecentData = performanceHistory[0];

        const player = {
            id: playerId,
            name: mostRecentData.name,
            proTeam: mostRecentData.proTeam,
            espnId: null,
            pffId: null,
            statmuseId: null
        };

        try {
            playerIds = await fetchData('../data/player_ids.json');
            if (playerIds) {
                const playerFromList = playerIds.find(p => p.id === playerId);
                if (playerFromList) {
                    player.espnId = playerFromList.espnId;
                    player.pffId = playerFromList.pffId;
                    player.statmuseId = playerFromList.statmuseId;
                }
            }
        } catch (error) {
            console.warn('Could not load player_ids.json, using basic player data');
        }

        let playerStats = calculatePlayerStats(performanceHistory);

        renderPlayerDetails(player, mostRecentData, playerStats, performanceHistory);

        setupTabs();

    } catch (error) {
        console.error('Error initializing player details:', error);
        showError(`Failed to load player details: ${error.message}`);
    }
}

// Function to get player position
function getPlayerPosition(playerData) {
    return playerData?.position || 'N/A';
}

// Function to render player details
function renderPlayerDetails(player, playerData, playerStats, performanceHistory) {
    // Store current player stats for modal access
    window.currentPlayerStats = playerStats;

    document.title = `${player.name} - Player Details - Fantasy Football League`;
    
    // Find the container to add content to
    const container = document.querySelector('.player-details-container');
    if (!container) {
        console.error('Could not find player-details-container');
        return;
    }
    
    // Clear any existing content
    container.innerHTML = '';
    
    // Create player header wrapper (full-width) and place it right after the main-header
    let headerWrapper = document.querySelector('.player-header-wrapper');
    if (!headerWrapper) {
        headerWrapper = document.createElement('div');
        headerWrapper.className = 'player-header-wrapper';
        
        // Insert DIRECTLY after the main-header element
        const mainHeader = document.querySelector('.main-header');
        if (mainHeader && mainHeader.nextSibling) {
            mainHeader.parentNode.insertBefore(headerWrapper, mainHeader.nextSibling);
        } else {
            // Fallback - insert before main
            const mainElement = document.querySelector('main');
            if (mainElement) {
                mainElement.parentNode.insertBefore(headerWrapper, mainElement);
            }
        }
    } else {
        headerWrapper.innerHTML = ''; // Clear existing header if any
    }
    
    // Player header section
    const playerHeader = document.createElement('div');
    playerHeader.className = 'player-header';
    
    // Store team colors for later use
    let teamColors = null;
    
    // Apply team color as background if available
    if (playerData && playerData.proTeam) {
        teamColors = getTeamColors(playerData.proTeam);
        if (teamColors && teamColors.primary) {
            // Set a fallback solid color
            playerHeader.style.backgroundColor = teamColors.primary;
            
            playerHeader.style.background = `linear-gradient(to right, 
                rgba(28, 28, 30, 0.0) 10%, 
                ${teamColors.primary} 40%, 
                ${teamColors.primary} 60%, 
                rgba(28, 28, 30, 0.0) 90%)`;
        }
    }
    
    // Inner container for header content
    const headerInner = document.createElement('div');
    headerInner.className = 'player-header-inner';
    
    // Player team logo background (using pro team info)
    if (playerData && playerData.proTeam) {
        const teamLogoContainer = document.createElement('div');
        teamLogoContainer.className = 'player-logo-bg';
        
        const teamLogoImg = document.createElement('img');
        teamLogoImg.src = `../assets/nfl-logos/${playerData.proTeam.toLowerCase()}.png`;
        teamLogoImg.alt = playerData.proTeam;
        teamLogoImg.onerror = () => {
            console.warn(`Could not load team logo for ${playerData.proTeam}`);
            teamLogoContainer.style.display = 'none';
        };
        
        teamLogoContainer.appendChild(teamLogoImg);
        playerHeader.appendChild(teamLogoContainer);
    }
    
    // Player image - add to inner container but make sure it's the first element
    const playerImage = document.createElement('img');
    playerImage.className = 'player-image';
    playerImage.src = `../assets/espn-player-images/${player.id}.png`;
    playerImage.alt = player.name;
    playerImage.onerror = () => {
        console.warn(`Could not load player image for ID ${player.id}`);
        playerImage.style.display = 'none';
    };
    headerInner.appendChild(playerImage);
    
    // Player info section
    const playerInfo = document.createElement('div');
    playerInfo.className = 'player-info';
    
    // Player name
    const playerName = document.createElement('h1');
    playerName.className = 'player-name';
    playerName.textContent = player.name;
    playerInfo.appendChild(playerName);
    
    // Service links (ESPN, PFF, StatMuse)
    const serviceLinks = document.createElement('div');
    serviceLinks.className = 'service-links';
    
    // ESPN link - with fallback to search
    const espnLink = document.createElement('a');
    espnLink.className = 'service-link espn-link';
    if (player.espnId) {
        espnLink.href = `https://www.espn.com/nfl/player/_/id/${player.espnId}`;
    } else {
        // Fallback to search
        const searchName = encodeURIComponent(player.name);
        espnLink.href = `https://www.espn.com/search/_/q/${searchName}`;
    }
    espnLink.target = '_blank';
    
    // Add ESPN logo
    const espnImg = document.createElement('img');
    espnImg.src = '../assets/espn.png';
    espnImg.alt = 'ESPN';
    espnLink.appendChild(espnImg);
    
    // Add text
    espnLink.appendChild(document.createTextNode('ESPN'));
    serviceLinks.appendChild(espnLink);
    
    // PFF link - with fallback to search
    const pffLink = document.createElement('a');
    pffLink.className = 'service-link pff-link';
    if (player.pffId) {
        pffLink.href = `https://www.pff.com/nfl/players/${player.pffId}`;
    } else {
        // Fallback to search
        const searchName = encodeURIComponent(player.name);
        pffLink.href = `https://www.pff.com/search?q=${searchName}`;
    }
    pffLink.target = '_blank';
    
    // Add PFF logo
    const pffImg = document.createElement('img');
    pffImg.src = '../assets/pff.png';
    pffImg.alt = 'PFF';
    pffLink.appendChild(pffImg);
    
    // Add text
    pffLink.appendChild(document.createTextNode('PFF'));
    serviceLinks.appendChild(pffLink);
    
    // StatMuse link - with fallback to search
    const statmuseLink = document.createElement('a');
    statmuseLink.className = 'service-link statmuse-link';
    if (player.statmuseId) {
        statmuseLink.href = `https://www.statmuse.com/nfl/player/${player.statmuseId}`;
    } else {
        // Fallback to search
        const searchName = encodeURIComponent(player.name);
        statmuseLink.href = `https://www.statmuse.com/nfl/ask?q=${searchName}`;
    }
    statmuseLink.target = '_blank';
    
    // Add StatMuse logo
    const statmuseImg = document.createElement('img');
    statmuseImg.src = '../assets/statmuse.png';
    statmuseImg.alt = 'StatMuse';
    statmuseLink.appendChild(statmuseImg);
    
    // Add text
    statmuseLink.appendChild(document.createTextNode('StatMuse'));
    serviceLinks.appendChild(statmuseLink);
    
    playerInfo.appendChild(serviceLinks);
    
    // Create a container for position and team tags
    const playerTags = document.createElement('div');
    playerTags.className = 'player-tags';
    
    // Position tag
    const positionTag = document.createElement('div');
    positionTag.className = 'position-tag';
    positionTag.textContent = getPlayerPosition(playerData);
    playerTags.appendChild(positionTag);
    
    // Team tag - add if proTeam exists
    if (playerData && playerData.proTeam) {
        const teamTag = document.createElement('div');
        teamTag.className = 'team-tag';
        teamTag.textContent = playerData.proTeam;
        playerTags.appendChild(teamTag);
    }
    
    playerInfo.appendChild(playerTags);
    
    // Add the player info to the inner container
    headerInner.appendChild(playerInfo);
    
    // Stats grid - using actual player stats with null checks
    const statsGrid = createStatsGrid([
        { value: playerStats.totalPoints !== null ? playerStats.totalPoints.toFixed(1) : '0.0', label: 'TOTAL POINTS' },
        { value: playerStats.ppg !== null ? playerStats.ppg.toFixed(1) : '0.0', label: 'PPG' },
        { value: playerStats.fpPlus !== null ? playerStats.fpPlus.toFixed(1) : '0.0', label: 'FP+' },
        { value: playerStats.fpPlusR !== null ? playerStats.fpPlusR.toFixed(1) : '0.0', label: 'FP+R' },
        { value: playerStats.bestGame !== null ? playerStats.bestGame.toFixed(1) : '0.0', label: 'BEST GAME' }
    ], teamColors); // Pass team colors to the createStatsGrid function
    
    // Add stats grid to the inner container AFTER player-info
    headerInner.appendChild(statsGrid);
    
    // Add inner container to the header
    playerHeader.appendChild(headerInner);
    
    // Add header to the wrapper
    headerWrapper.appendChild(playerHeader);
    
    // Continue with the rest of the content...
    const gradeDisplay = getLetterGrade(playerStats.chosGrade);
    const performanceGrid = createPerformanceGrid([
        { 
            title: 'CHOS GRADE', 
            value: `${playerStats.chosGrade.toFixed(1)} (${gradeDisplay})`, 
            subtitle: `Base: ${playerStats.chosGradeComponents.baseProduction.toFixed(1)}/40, Eff: ${playerStats.chosGradeComponents.efficiency.toFixed(1)}/30, Rel: ${playerStats.chosGradeComponents.reliability.toFixed(1)}/30`,
            isClickable: true,
            onClick: () => createChosGradeModal(playerStats)
        },
        { 
            title: 'POINTS PER 17 GAMES', 
            value: playerStats.seasonEquivalent !== null ? playerStats.seasonEquivalent.toFixed(1) : '0.0', 
            subtitle: `Based on ${performanceHistory.length} game${performanceHistory.length !== 1 ? 's' : ''} at ${playerStats.ppg.toFixed(1)} PPG`
        },
        { 
            title: 'MEDIAN PERFORMANCE', 
            value: playerStats.medianPerformance !== null ? playerStats.medianPerformance.toFixed(1) : '0.0', 
            subtitle: `StdDev: ${playerStats.stdDev !== null ? playerStats.stdDev.toFixed(1) : '0.0'} pts`
        },
        { 
            title: 'POINT CONTRIBUTION', 
            value: `${playerStats.pointContribution !== null ? playerStats.pointContribution.toFixed(1) : '0.0'}%`, 
            subtitle: `Started ${performanceHistory.filter(g => !g.slotPosition?.includes('Bench') && g.slotPosition !== 'BE').length} of ${performanceHistory.length} games`
        }
    ]);
    container.appendChild(performanceGrid);
    
    const tabsSection = createTabsSection([
        { id: 'past-performance', text: 'PAST PERFORMANCE', active: true },
        { id: 'grades', text: 'GRADES' },
        { id: 'season-stats', text: 'SEASON STATS' }
    ]);
    container.appendChild(tabsSection);
    
    const tabContents = document.createElement('div');
    tabContents.className = 'tab-contents';
    
    const pastPerformanceContent = document.createElement('div');
    pastPerformanceContent.className = 'tab-content active';
    pastPerformanceContent.id = 'past-performance-content';
    pastPerformanceContent.appendChild(createPastPerformanceContent(performanceHistory));
    tabContents.appendChild(pastPerformanceContent);
    
    const gradesContent = document.createElement('div');
    gradesContent.className = 'tab-content';
    gradesContent.id = 'grades-content';
    
    const gradeBreakdown = document.createElement('div');
    gradeBreakdown.className = 'grade-breakdown';
    
    const gradeHeader = document.createElement('h3');
    gradeHeader.textContent = 'CHOS Grade Breakdown';
    gradeBreakdown.appendChild(gradeHeader);
    
    const components = [
        { name: 'Base Production', value: playerStats.chosGradeComponents.baseProduction, maxValue: 40 },
        { name: 'Efficiency', value: playerStats.chosGradeComponents.efficiency, maxValue: 30 },
        { name: 'Reliability', value: playerStats.chosGradeComponents.reliability, maxValue: 30 }
    ];
    
    components.forEach(component => {
        const componentRow = document.createElement('div');
        componentRow.className = 'grade-component';
        
        const label = document.createElement('div');
        label.className = 'component-label';
        label.textContent = component.name;
        
        const value = document.createElement('div');
        value.className = 'component-value';
        value.textContent = `${component.value.toFixed(1)} / ${component.maxValue}`;
        
        const barContainer = document.createElement('div');
        barContainer.className = 'progress-bar-container';
        
        const bar = document.createElement('div');
        bar.className = 'progress-bar';
        bar.style.width = `${(component.value / component.maxValue * 100)}%`;
        
        barContainer.appendChild(bar);
        
        componentRow.appendChild(label);
        componentRow.appendChild(value);
        componentRow.appendChild(barContainer);
        
        gradeBreakdown.appendChild(componentRow);
    });
    
    // Add final grade to breakdown
    const finalGradeRow = document.createElement('div');
    finalGradeRow.className = 'grade-component final-grade';
    
    const finalLabel = document.createElement('div');
    finalLabel.className = 'component-label';
    finalLabel.textContent = 'Total CHOS Grade';
    
    const finalValue = document.createElement('div');
    finalValue.className = 'component-value';
    finalValue.textContent = `${playerStats.chosGrade.toFixed(1)} / 100 (${gradeDisplay})`;
    
    finalGradeRow.appendChild(finalLabel);
    finalGradeRow.appendChild(finalValue);
    
    gradeBreakdown.appendChild(finalGradeRow);
    gradesContent.appendChild(gradeBreakdown);
    
    // Add position comparison chart
    const chartSection = document.createElement('div');
    chartSection.className = 'position-chart-section';
    chartSection.style.cssText = `
        margin-top: 30px;
        padding: 20px;
        background: rgba(0,0,0,0.2);
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.1);
    `;
    
    const chartHeader = document.createElement('h3');
    chartHeader.textContent = 'Position Performance Comparison';
    chartHeader.style.cssText = `
        margin: 0 0 20px 0;
        color: #fff;
        text-align: center;
        font-size: 18px;
        font-weight: 600;
    `;
    chartSection.appendChild(chartHeader);
    
    const chartContainer = document.createElement('div');
    chartContainer.style.cssText = `
        position: relative;
        height: 350px;
        margin-bottom: 20px;
        background: rgba(0,0,0,0.1);
        border-radius: 8px;
        padding: 10px;
    `;
    
    const canvas = document.createElement('canvas');
    canvas.id = 'positionChart';
    canvas.style.display = 'none';
    chartContainer.appendChild(canvas);
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'chartLoading';
    loadingDiv.textContent = 'Loading position data...';
    loadingDiv.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #fff;
        font-size: 16px;
    `;
    chartContainer.appendChild(loadingDiv);
    
    chartSection.appendChild(chartContainer);
    gradesContent.appendChild(chartSection);
    
    tabContents.appendChild(gradesContent);
    
    // Create the chart after DOM elements are added
    setTimeout(() => {
        createPositionComparisonChart(player.id, chartSection);
    }, 100);
    
    const seasonStatsContent = document.createElement('div');
    seasonStatsContent.className = 'tab-content';
    seasonStatsContent.id = 'season-stats-content';
    seasonStatsContent.innerHTML = '<div class="stats-loading"><div class="loading-spinner"></div><p>Select the Season Stats tab to load data from ESPN</p></div>';
    tabContents.appendChild(seasonStatsContent);
    
    container.appendChild(tabContents);
    
    // Store player object globally for access by other scripts
    window.player = player;
}

// Function to create stats grid
function createStatsGrid(stats, teamColors) {
    const statsGrid = document.createElement('div');
    statsGrid.className = 'stats-grid';
    
    stats.forEach(stat => {
        const statBox = document.createElement('div');
        statBox.className = 'stat-box';
        
        // Apply team accent color to stat box border if available with 50% transparency
        if (teamColors && teamColors.accent) {
            // Convert hex to rgba with 0.5 alpha if it's a hex color
            if (teamColors.accent.startsWith('#')) {
                const hex = teamColors.accent.slice(1);
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                statBox.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
            } else {
                // If it's not a hex color, just use it with 50% opacity
                statBox.style.borderColor = teamColors.accent + '80'; // 80 is 50% in hex
            }
        }
        
        const statValue = document.createElement('div');
        statValue.className = 'stat-value';
        statValue.textContent = stat.value; // Already sanitized in renderPlayerDetails
        
        // Apply team accent color to stat value if available
        if (teamColors && teamColors.accent) {
            statValue.style.color = teamColors.accent;
        }
        
        statBox.appendChild(statValue);
        
        const statLabel = document.createElement('div');
        statLabel.className = 'stat-label';
        statLabel.textContent = stat.label;
        statBox.appendChild(statLabel);
        
        statsGrid.appendChild(statBox);
    });
    
    return statsGrid;
}

// Enhance createPerformanceGrid function to make the click area more robust
function createPerformanceGrid(metrics) {
    const performanceGrid = document.createElement('div');
    performanceGrid.className = 'performance-grid';
    
    metrics.forEach(metric => {
        const perfBox = document.createElement('div');
        perfBox.className = 'performance-box';
        
        // Add clickable behavior if specified
        if (metric.isClickable) {
            perfBox.classList.add('clickable-box');
            
            // Make the click handling more robust
            const handleClick = () => {
                console.log("CHOS Grade box clicked!");
                if (typeof metric.onClick === 'function') {
                    metric.onClick();
                } else {
                    console.error("onClick handler is not a function:", metric.onClick);
                }
            };
            
            perfBox.addEventListener('click', handleClick);
            
            // Add an explicit button to ensure clickability
            const infoButton = document.createElement('button');
            infoButton.className = 'info-button';
            infoButton.innerHTML = 'ⓘ';
            infoButton.setAttribute('aria-label', 'View details');
            infoButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent double-triggering
                handleClick();
            });
            perfBox.appendChild(infoButton);
        }
        
        const title = document.createElement('div');
        title.className = 'performance-title';
        title.textContent = metric.title;
        perfBox.appendChild(title);
        
        const value = document.createElement('div');
        value.className = 'performance-value';
        value.textContent = metric.value;
        perfBox.appendChild(value);
        
        const subtitle = document.createElement('div');
        subtitle.className = 'performance-subtitle';
        subtitle.textContent = metric.subtitle;
        perfBox.appendChild(subtitle);
        
        performanceGrid.appendChild(perfBox);
    });
    
    return performanceGrid;
}

// Function to create tabs section
function createTabsSection(tabs) {
    const tabsSection = document.createElement('div');
    tabsSection.className = 'tabs';
    
    tabs.forEach(tab => {
        const tabElement = document.createElement('div');
        tabElement.className = `tab ${tab.active ? 'active' : ''}`;
        tabElement.dataset.tab = tab.id;
        tabElement.textContent = tab.text;
        tabsSection.appendChild(tabElement);
    });
    
    return tabsSection;
}

// Function to create navigation bar
function createNavigationBar(links) {
    const navBar = document.createElement('nav');
    navBar.className = 'nav-bar';
    
    links.forEach(link => {
        const navLink = document.createElement('a');
        navLink.className = `nav-link ${link.active ? 'active' : ''}`;
        navLink.href = link.href;
        navLink.textContent = link.text;
        navBar.appendChild(navLink);
    });
    
    return navBar;
}

// Fun
// Function to create navigation bar
function createNavigationBar(links) {
    const navBar = document.createElement('nav');
    navBar.className = 'nav-bar';
    
    links.forEach(link => {
        const navLink = document.createElement('a');
        navLink.className = `nav-link ${link.active ? 'active' : ''}`;
        navLink.href = link.href;
        navLink.textContent = link.text;
        navBar.appendChild(navLink);
    });
    
    return navBar;
}
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Show selected tab content
            const selectedContent = document.getElementById(`${tab.dataset.tab}-content`);
            if (selectedContent) {
                selectedContent.classList.add('active');
                
                // If this is the season stats tab, initialize it
                if (tab.dataset.tab === 'season-stats' && window.initializeSeasonStats) {
                    window.initializeSeasonStats(player.espnId);
                }
            }
        });
    });
}

// Function to show error message
function showError(message) {
    const container = document.querySelector('.player-details-container');
    if (container) {
        container.innerHTML = `<div class="error-message">${message}</div>`;
    } else {
        document.body.innerHTML = `<div class="container"><div class="error-message">${message}</div></div>`;
    }
    console.error(message);
}

// Function to convert numerical grade to letter grade
function getLetterGrade(score) {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 67) return 'D+';
    if (score >= 63) return 'D';
    if (score >= 60) return 'D-';
    return 'F';
}

// Initialize page when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add script for season stats
    const seasonStatsScript = document.createElement('script');
    seasonStatsScript.src = '../js/player-details-season-stats.js';
    document.head.appendChild(seasonStatsScript);
    
    // Add CSS for season stats
    const seasonStatsStyles = document.createElement('link');
    seasonStatsStyles.rel = 'stylesheet';
    seasonStatsStyles.href = '../css/player-details-season-stats.css';
    document.head.appendChild(seasonStatsStyles);
    
    initializePlayerDetails();

    // Debug click events
    document.addEventListener('click', (e) => {
        const clickableBox = e.target.closest('.clickable-box');
        if (clickableBox) {
            console.log("Clicked on or inside a clickable box:", clickableBox);
            
            // If it's the CHOS Grade box, ensure the modal opens
            const title = clickableBox.querySelector('.performance-title');
            if (title && title.textContent === 'CHOS GRADE' && window.currentPlayerStats) {
                console.log("Forcing CHOS Grade modal to open");
                createChosGradeModal(window.currentPlayerStats);
            }
        }
    });
});
