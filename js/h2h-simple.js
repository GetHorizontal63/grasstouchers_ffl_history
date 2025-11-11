document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const owner1Select = document.getElementById('owner1Select');
    const owner2Select = document.getElementById('owner2Select');
    const compareBtn = document.getElementById('compareBtn');
    const gameScoreboard = document.getElementById('gameScoreboard');
    const statsContainer = document.getElementById('statsContainer');
    const playerStatsContainer = document.getElementById('playerStatsContainer');
    
    // Tab functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(
                content => content.classList.add('hidden')
            );
            
            const tabId = this.getAttribute('data-tab') + 'Stats';
            document.getElementById(tabId).classList.remove('hidden');
        });
    });
    
    // Global variables
    let leagueData = [];
    let leagueConfig = {};
    let availableOwners = [];
    let availableSeasons = [];
    let currentComparison = null;
    
    // Load league score data
    async function loadLeagueData() {
        try {
            // Load both league score data and league config
            const [scoreResponse, configResponse] = await Promise.all([
                fetch('../data/league_score_data.json'),
                fetch('../data/league_config.json')
            ]);
            
            if (!scoreResponse.ok || !configResponse.ok) {
                throw new Error('Failed to load league data');
            }
            
            leagueData = await scoreResponse.json();
            leagueConfig = await configResponse.json();
            
            // Extract unique owners and seasons
            availableOwners = [...new Set(leagueData.map(game => game.Team))].sort();
            availableSeasons = [...new Set(leagueData.map(game => game.Season))].sort((a, b) => b - a);
            
            populateOwnerSelects();
            
        } catch (error) {
            console.error('Error loading league data:', error);
            showError('Failed to load league data. Please try again later.');
        }
    }
    
    // Populate owner select dropdowns
    function populateOwnerSelects() {
        const defaultOption = '<option value="">Select an owner...</option>';
        
        owner1Select.innerHTML = defaultOption + 
            availableOwners.map(owner => `<option value="${owner}">${owner}</option>`).join('');
        
        owner2Select.innerHTML = defaultOption + 
            availableOwners.map(owner => `<option value="${owner}">${owner}</option>`).join('');
    }
    
    // Check if comparison button should be enabled
    function checkComparisonButton() {
        const owner1 = owner1Select.value;
        const owner2 = owner2Select.value;
        
        compareBtn.disabled = !owner1 || !owner2 || owner1 === owner2;
    }
    
    // Event listeners
    owner1Select.addEventListener('change', checkComparisonButton);
    owner2Select.addEventListener('change', checkComparisonButton);
    
    compareBtn.addEventListener('click', function() {
        const owner1 = owner1Select.value;
        const owner2 = owner2Select.value;
        
        if (owner1 && owner2 && owner1 !== owner2) {
            performComparison(owner1, owner2);
        }
    });
    
    // Perform head-to-head comparison
    function performComparison(owner1, owner2) {
        currentComparison = { owner1, owner2 };
        
        // Use all league data (no season filtering)
        const filteredData = leagueData;
        
        // Calculate head-to-head record (direct matchups)
        const h2hRecord = calculateHeadToHeadRecord(owner1, owner2, filteredData);
        
        // Calculate overall record (higher score wins each week)
        const overallRecord = calculateOverallRecord(owner1, owner2, filteredData);
        
        // Calculate playoff record
        const playoffRecord = calculatePlayoffRecord(owner1, owner2, filteredData);
        
        // Calculate statistics only from direct matchups
        const owner1Stats = calculateOwnerStats(h2hRecord.matchups);
        const owner2Stats = calculateOwnerStatsAsOpponent(h2hRecord.matchups);
        
        // Display results
        displayGameScoreboard(owner1, owner2, h2hRecord, overallRecord, playoffRecord);
        displayStatistics(owner1, owner2, owner1Stats, owner2Stats);
        displayGameHistory(owner1, owner2, h2hRecord, overallRecord, playoffRecord, filteredData);
        
        // Show result containers
        gameScoreboard.style.display = 'block';
        if (statsContainer) statsContainer.style.display = 'block';
        if (playerStatsContainer) playerStatsContainer.style.display = 'block';
        
        // Scroll to results
        gameScoreboard.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Calculate head-to-head record (direct matchups only)
    function calculateHeadToHeadRecord(owner1, owner2, data) {
        // Find all games where these two owners played each other directly
        const directMatchups = [];
        
        data.forEach(game => {
            if (game.Team === owner1 && game.Opponent === owner2) {
                const teamScore = Number(game['Team Score']) || 0;
                const opponentScore = Number(game['Opponent Score']) || 0;
                
                // Exclude games where both teams have 0.0 score
                if (teamScore > 0 || opponentScore > 0) {
                    directMatchups.push(game);
                }
            }
        });
        
        let owner1Wins = 0;
        let owner2Wins = 0;
        let ties = 0;
        
        directMatchups.forEach(game => {
            const teamScore = Number(game['Team Score']) || 0;
            const opponentScore = Number(game['Opponent Score']) || 0;
            
            if (teamScore > opponentScore) {
                owner1Wins++;
            } else if (teamScore < opponentScore) {
                owner2Wins++;
            } else {
                ties++;
            }
        });
        
        return {
            owner1Wins,
            owner2Wins,
            ties,
            totalGames: directMatchups.length,
            matchups: directMatchups
        };
    }
    
    // Calculate playoff record (direct matchups in non-regular season)
    function calculatePlayoffRecord(owner1, owner2, data) {
        // Find all playoff games where these two owners played each other directly
        const playoffMatchups = [];
        
        data.forEach(game => {
            if (game.Team === owner1 && game.Opponent === owner2 && game['Season Period'] !== 'Regular') {
                const teamScore = Number(game['Team Score']) || 0;
                const opponentScore = Number(game['Opponent Score']) || 0;
                
                // Exclude games where both teams have 0.0 score
                if (teamScore > 0 || opponentScore > 0) {
                    playoffMatchups.push(game);
                }
            }
        });
        
        if (playoffMatchups.length === 0) {
            return {
                owner1Wins: 0,
                owner2Wins: 0,
                ties: 0,
                totalGames: 0,
                neverMet: true,
                matchups: []
            };
        }
        
        let owner1Wins = 0;
        let owner2Wins = 0;
        let ties = 0;
        
        playoffMatchups.forEach(game => {
            const teamScore = Number(game['Team Score']) || 0;
            const opponentScore = Number(game['Opponent Score']) || 0;
            
            if (teamScore > opponentScore) {
                owner1Wins++;
            } else if (teamScore < opponentScore) {
                owner2Wins++;
            } else {
                ties++;
            }
        });
        
        return {
            owner1Wins,
            owner2Wins,
            ties,
            totalGames: playoffMatchups.length,
            neverMet: false,
            matchups: playoffMatchups
        };
    }

    // Calculate overall record (based on who had higher score each week)
    function calculateOverallRecord(owner1, owner2, data) {
        // Group games by League Week and Season
        const weeklyComparison = {};
        
        data.forEach(game => {
            const weekKey = `${game.Season}-${game['League Week']}`;
            
            if (!weeklyComparison[weekKey]) {
                weeklyComparison[weekKey] = {};
            }
            
            if (game.Team === owner1 || game.Team === owner2) {
                const teamScore = Number(game['Team Score']) || 0;
                weeklyComparison[weekKey][game.Team] = teamScore;
            }
        });
        
        let owner1Wins = 0;
        let owner2Wins = 0;
        let ties = 0;
        
        Object.values(weeklyComparison).forEach(week => {
            if (week[owner1] !== undefined && week[owner2] !== undefined) {
                // Exclude weeks where both teams have 0.0 score
                if (week[owner1] > 0 || week[owner2] > 0) {
                    if (week[owner1] > week[owner2]) {
                        owner1Wins++;
                    } else if (week[owner1] < week[owner2]) {
                        owner2Wins++;
                    } else {
                        ties++;
                    }
                }
            }
        });
        
        return {
            owner1Wins,
            owner2Wins,
            ties,
            totalGames: owner1Wins + owner2Wins + ties,
            weeklyData: weeklyComparison
        };
    }
    
    // Calculate statistics for an owner from direct matchups only
    function calculateOwnerStats(matchups) {
        // Filter out games where team score is 0.0 or null
        const validGames = matchups.filter(game => {
            const teamScore = Number(game['Team Score']) || 0;
            return teamScore > 0;
        });
        
        if (validGames.length === 0) {
            return {
                avgScore: 0,
                maxScore: 0,
                minScore: 0,
                avgWinMargin: 0,
                totalScore: 0
            };
        }
        
        const scores = validGames.map(game => Number(game['Team Score']) || 0);
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        
        // Calculate average win margin (only for games won)
        const winningGames = validGames.filter(game => {
            const teamScore = Number(game['Team Score']) || 0;
            const opponentScore = Number(game['Opponent Score']) || 0;
            return teamScore > opponentScore;
        });
        
        let avgWinMargin = 0;
        if (winningGames.length > 0) {
            const totalWinMargin = winningGames.reduce((sum, game) => {
                const teamScore = Number(game['Team Score']) || 0;
                const opponentScore = Number(game['Opponent Score']) || 0;
                return sum + (teamScore - opponentScore);
            }, 0);
            avgWinMargin = totalWinMargin / winningGames.length;
        }
        
        return {
            avgScore: totalScore / validGames.length,
            maxScore: Math.max(...scores),
            minScore: Math.min(...scores),
            avgWinMargin: avgWinMargin,
            totalScore: totalScore
        };
    }
    
    // Calculate statistics for owner2 (as opponent in the matchups)
    function calculateOwnerStatsAsOpponent(matchups) {
        // Filter out games where opponent score is 0.0 or null
        const validGames = matchups.filter(game => {
            const opponentScore = Number(game['Opponent Score']) || 0;
            return opponentScore > 0;
        });
        
        if (validGames.length === 0) {
            return {
                avgScore: 0,
                maxScore: 0,
                minScore: 0,
                avgWinMargin: 0,
                totalScore: 0
            };
        }
        
        const scores = validGames.map(game => Number(game['Opponent Score']) || 0);
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        
        // Calculate average win margin for owner2 (when opponent score > team score)
        const winningGames = validGames.filter(game => {
            const teamScore = Number(game['Team Score']) || 0;
            const opponentScore = Number(game['Opponent Score']) || 0;
            return opponentScore > teamScore;
        });
        
        let avgWinMargin = 0;
        if (winningGames.length > 0) {
            const totalWinMargin = winningGames.reduce((sum, game) => {
                const teamScore = Number(game['Team Score']) || 0;
                const opponentScore = Number(game['Opponent Score']) || 0;
                return sum + (opponentScore - teamScore);
            }, 0);
            avgWinMargin = totalWinMargin / winningGames.length;
        }
        
        return {
            avgScore: totalScore / validGames.length,
            maxScore: Math.max(...scores),
            minScore: Math.min(...scores),
            avgWinMargin: avgWinMargin,
            totalScore: totalScore
        };
    }
    
    // Get team logo for owner
    function getTeamLogo(ownerName) {
        // Find the manager in league config
        const manager = leagueConfig.managers?.find(m => m.name === ownerName);
        
        if (manager && manager.active) {
            // Try to load the owner's specific logo
            return `../assets/ffl-logos/${ownerName}.png`;
        } else if (manager && !manager.active) {
            // Inactive manager gets nil.png
            return '../assets/ffl-logos/nil.png';
        } else {
            // Not found in config gets default.png
            return '../assets/ffl-logos/default.png';
        }
    }

    // Display main scoreboard using NFL game details structure
    function displayGameScoreboard(owner1, owner2, h2hRecord, overallRecord, playoffRecord) {
        // Determine who has better head-to-head record
        const h2hWinner = h2hRecord.owner1Wins > h2hRecord.owner2Wins ? 'owner1' : 
                         h2hRecord.owner2Wins > h2hRecord.owner1Wins ? 'owner2' : 'tie';
        
        const playoffRecordText = playoffRecord.neverMet 
            ? 'Never Met in Playoffs' 
            : `${playoffRecord.owner1Wins} - ${playoffRecord.owner2Wins}${playoffRecord.ties > 0 ? ` - ${playoffRecord.ties}` : ''}`;
        
        const gameScoreboardHTML = `
            <div class="matchup-container">
                <div class="team-display ${h2hWinner === 'owner1' ? 'winner' : ''}" id="owner1Display">
                    <div class="team-logo-large">
                        <img src="${getTeamLogo(owner1)}" alt="${owner1}" onerror="this.src='../assets/ffl-logos/default.png'">
                    </div>
                    <div class="team-name-large">${owner1}</div>
                    <div class="team-record">
                        H2H: ${h2hRecord.owner1Wins}-${h2hRecord.owner2Wins}${h2hRecord.ties > 0 ? `-${h2hRecord.ties}` : ''}
                    </div>
                </div>
                
                <div class="score-display">
                    <div class="score-value">
                        <span>${h2hRecord.owner1Wins}</span>
                        <span class="score-divider">-</span>
                        <span>${h2hRecord.owner2Wins}</span>
                    </div>
                    <div class="game-status-large">HEAD TO HEAD RECORD</div>
                    <div style="font-size: 1rem; color: var(--text-dim); margin-top: 0.5rem;">
                        Overall: ${overallRecord.owner1Wins} - ${overallRecord.owner2Wins}${overallRecord.ties > 0 ? ` - ${overallRecord.ties}` : ''}
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-dim); margin-top: 0.3rem;">
                        Playoffs: ${playoffRecordText}
                    </div>
                </div>
                
                <div class="team-display ${h2hWinner === 'owner2' ? 'winner' : ''}" id="owner2Display">
                    <div class="team-logo-large">
                        <img src="${getTeamLogo(owner2)}" alt="${owner2}" onerror="this.src='../assets/ffl-logos/default.png'">
                    </div>
                    <div class="team-name-large">${owner2}</div>
                    <div class="team-record">
                        H2H: ${h2hRecord.owner2Wins}-${h2hRecord.owner1Wins}${h2hRecord.ties > 0 ? `-${h2hRecord.ties}` : ''}
                    </div>
                </div>
            </div>
        `;
        
        gameScoreboard.innerHTML = gameScoreboardHTML;
    }
    
    // Display statistics
    function displayStatistics(owner1, owner2, owner1Stats, owner2Stats) {
        if (!statsContainer) return;
        
        const statsHTML = `
            <div class="stat-grid">
                <div class="stat-card">
                    <h3>Average Score</h3>
                    <div class="stat-comparison">
                        <div class="stat-item">
                            <span class="stat-owner">${owner1}</span>
                            <span class="stat-value">${owner1Stats.avgScore.toFixed(1)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-owner">${owner2}</span>
                            <span class="stat-value">${owner2Stats.avgScore.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <h3>Highest Score</h3>
                    <div class="stat-comparison">
                        <div class="stat-item">
                            <span class="stat-owner">${owner1}</span>
                            <span class="stat-value">${owner1Stats.maxScore.toFixed(1)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-owner">${owner2}</span>
                            <span class="stat-value">${owner2Stats.maxScore.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <h3>Lowest Score</h3>
                    <div class="stat-comparison">
                        <div class="stat-item">
                            <span class="stat-owner">${owner1}</span>
                            <span class="stat-value">${owner1Stats.minScore.toFixed(1)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-owner">${owner2}</span>
                            <span class="stat-value">${owner2Stats.minScore.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <h3>Avg Win Margin</h3>
                    <div class="stat-comparison">
                        <div class="stat-item">
                            <span class="stat-owner">${owner1}</span>
                            <span class="stat-value">${owner1Stats.avgWinMargin.toFixed(1)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-owner">${owner2}</span>
                            <span class="stat-value">${owner2Stats.avgWinMargin.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const teamStats = document.getElementById('teamStats');
        if (teamStats) {
            teamStats.innerHTML = statsHTML;
        }
    }
    
    // Display game history
    function displayGameHistory(owner1, owner2, h2hRecord, overallRecord, playoffRecord, filteredData) {
        if (!playerStatsContainer) return;
        
        // Summary tab with cleaner visual design
        const summaryContent = document.querySelector('.summary-stats-content');
        if (summaryContent) {
            summaryContent.innerHTML = `
                <div class="matchup-summary-grid">
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-sword-cross"></i>
                        </div>
                        <div class="summary-info">
                            <h4>Direct Matchups</h4>
                            <span class="summary-value">${h2hRecord.totalGames} Games</span>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <div class="summary-info">
                            <h4>Weekly Comparisons</h4>
                            <span class="summary-value">${overallRecord.totalGames} Weeks</span>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-trophy"></i>
                        </div>
                        <div class="summary-info">
                            <h4>Playoff Meetings</h4>
                            <span class="summary-value">${playoffRecord.neverMet ? 'Never Met' : playoffRecord.totalGames + ' Games'}</span>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="summary-info">
                            <h4>Closest Game</h4>
                            <span class="summary-value">${getClosestGameMargin(h2hRecord.matchups)} pts</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Direct matches tab
        const directMatchesContent = document.querySelector('.direct-matches-content');
        if (directMatchesContent) {
            if (h2hRecord.matchups.length > 0) {
                const matchupsHTML = h2hRecord.matchups.map(game => {
                    const teamScore = Number(game['Team Score']) || 0;
                    const opponentScore = Number(game['Opponent Score']) || 0;
                    
                    return `
                        <tr>
                            <td>${game.Season}</td>
                            <td>Week ${game['League Week']}</td>
                            <td>${teamScore.toFixed(1)}</td>
                            <td>${opponentScore.toFixed(1)}</td>
                            <td class="${teamScore > opponentScore ? 'win' : teamScore < opponentScore ? 'loss' : 'tie'}">
                                ${teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'T'}
                            </td>
                        </tr>
                    `;
                }).join('');
                
                directMatchesContent.innerHTML = `
                    <table class="history-table">
                        <thead>
                            <tr>
                                <th>Season</th>
                                <th>Week</th>
                                <th>${owner1} Score</th>
                                <th>${owner2} Score</th>
                                <th>Result (${owner1})</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${matchupsHTML}
                        </tbody>
                    </table>
                `;
            } else {
                directMatchesContent.innerHTML = '<p><em>No direct matchups found between these owners</em></p>';
            }
        }
    }
    
    // Helper function to get closest game margin
    function getClosestGameMargin(matchups) {
        if (!matchups || matchups.length === 0) {
            return 'N/A';
        }
        
        let closestMargin = Infinity;
        matchups.forEach(game => {
            const teamScore = Number(game['Team Score']) || 0;
            const opponentScore = Number(game['Opponent Score']) || 0;
            const margin = Math.abs(teamScore - opponentScore);
            
            if (margin < closestMargin) {
                closestMargin = margin;
            }
        });
        
        return closestMargin === Infinity ? 'N/A' : closestMargin.toFixed(1);
    }

    // Helper function to get initials
    function getInitials(name) {
        return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
    }
    
    // Show error message
    function showError(message) {
        if (gameScoreboard) {
            gameScoreboard.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                </div>
            `;
            gameScoreboard.style.display = 'block';
        }
    }
    
    // Initialize
    loadLeagueData();
});
