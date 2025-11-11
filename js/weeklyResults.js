// Weekly Results module for Season Overview

window.WeeklyResults = (function() {
    // Private variables
    let leagueScoreData = null;
    let currentSeason = null;
    let currentWeek = null;
    let allWeeks = [];
    let teamAbbreviations = null; // To store team abbreviations
    
    // Load function called by the main controller
    function load(data, season) {
        console.log('Loading Weekly Results...');
        currentSeason = season || window.currentSeason || 'All Time';
        
        // Reset currentWeek when switching seasons
        currentWeek = null;
        
        // Show loading state initially
        const container = document.getElementById('weekly-results');
        if (container) {
            container.innerHTML = `
                <h2 class="section-title">Weekly Results</h2>
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading weekly results for ${currentSeason}...</p>
                </div>
            `;
        }
        
        // First load team abbreviations
        loadTeamAbbreviations()
            .then(() => {
                // Then load data from league_score_data.json
                return loadLeagueScoreData();
            })
            .then(data => {
                leagueScoreData = data;
                processWeeklyData();
                render();
            })
            .catch(error => {
                console.error('Error loading weekly results:', error);
                renderNoData('Could not load weekly results data for this season.');
            });
    }
    
    // Load team abbreviations from json file
    function loadTeamAbbreviations() {
        return fetch('../data/team_abbreviations.json')
            .then(response => {
                if (!response.ok) {
                    console.warn('Failed to load team abbreviations, will use default logo handling');
                    return { teams: [] };
                }
                return response.json();
            })
            .then(data => {
                teamAbbreviations = data.teams || [];
                console.log('Loaded team abbreviations for', teamAbbreviations.length, 'teams');
                return teamAbbreviations;
            })
            .catch(error => {
                console.error('Error loading team abbreviations:', error);
                teamAbbreviations = [];
                return teamAbbreviations;
            });
    }
    
    // Get FFL abbreviation for a team name
    function getTeamFFLAbbreviation(teamName) {
        if (!teamAbbreviations || teamAbbreviations.length === 0) {
            return null;
        }
        
        // Find the team in the abbreviations list
        const team = teamAbbreviations.find(t => 
            t.name.toLowerCase() === teamName.toLowerCase()
        );
        
        if (team && team.abbreviations && team.abbreviations.FFL) {
            return team.abbreviations.FFL || null;
        }
        
        return null;
    }
    
    // Get team colors by name
    function getTeamColors(teamName) {
        if (!teamAbbreviations || teamAbbreviations.length === 0 || !teamName) {
            return { primary: '#3a7ca5', secondary: '#2c3e50' };
        }
        
        // Find the team in the abbreviations list
        const team = teamAbbreviations.find(t => 
            t.name.toLowerCase() === teamName.toLowerCase()
        );
        
        if (team && team.abbreviations) {
            // Get colors from the abbreviations object
            const primary = team.abbreviations.Primary || '#3a7ca5';
            const secondary = team.abbreviations.Secondary || '#2c3e50';
            
            return { primary, secondary };
        }
        
        return { primary: '#3a7ca5', secondary: '#2c3e50' };
    }
    
    // Load data from league_score_data.json
    function loadLeagueScoreData() {
        return fetch('../data/league_score_data.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load league score data');
                }
                return response.json();
            });
    }
    
    // Process weekly data to extract all weeks and set initial week
    function processWeeklyData() {
        if (!leagueScoreData || !Array.isArray(leagueScoreData)) {
            allWeeks = [];
            return;
        }
        
        // Filter data for current season if not "All Time"
        let seasonData = leagueScoreData;
        if (currentSeason !== 'All Time') {
            seasonData = leagueScoreData.filter(game => 
                game.Season && game.Season.toString() === currentSeason
            );
        }
        
        // Get unique weeks
        const weekSet = new Set();
        seasonData.forEach(game => {
            if (game.Week) {
                weekSet.add(parseInt(game.Week));
            }
        });
        
        // Convert to array and sort
        allWeeks = Array.from(weekSet).sort((a, b) => a - b);
        
        // Set current week if not already set
        if (!currentWeek && allWeeks.length > 0) {
            currentWeek = allWeeks[0]; // Default to first week
        }
        
        console.log(`Processed ${seasonData.length} games, found ${allWeeks.length} weeks for ${currentSeason}`);
    }
    
    // Function to handle season changes
    function updateSeason(season) {
        if (season === currentSeason) return;
        
        console.log(`Updating Weekly Results for ${season}`);
        currentSeason = season;
        
        // Reset data
        currentWeek = null;
        allWeeks = [];
        
        // Reload with new season data
        load(null, season);
    }
    
    // Function to handle week changes
    function changeWeek(week) {
        currentWeek = parseInt(week);
        renderWeeklyResults();
        
        // Update active class on week chips
        document.querySelectorAll('.week-chip').forEach(chip => {
            chip.classList.toggle('active', parseInt(chip.getAttribute('data-week')) === currentWeek);
        });
    }
    
    // Helper function to render "no data" message
    function renderNoData(message) {
        const container = document.getElementById('weekly-results');
        if (container) {
            container.innerHTML = `
                <h2 class="section-title">Weekly Results</h2>
                <div class="no-data">
                    <p>${message}</p>
                </div>
            `;
        }
    }
    
    // Main render function
    function render() {
        const container = document.getElementById('weekly-results');
        if (!container) return;
        
        if (!leagueScoreData || !Array.isArray(leagueScoreData) || leagueScoreData.length === 0) {
            renderNoData('No weekly results available for this season.');
            return;
        }
        
        // Create main structure with enhanced week chips as the primary navigation
        let html = `
            <h2 class="section-title">Weekly Results</h2>
            <div class="weekly-results-container">
                <!-- Enhanced week chips for primary navigation -->
                <div class="week-chips-container">
                    ${allWeeks.map(week => `
                        <button class="week-chip ${week === currentWeek ? 'active' : ''}" 
                                data-week="${week}">
                            ${week}
                        </button>
                    `).join('')}
                </div>
                
                <div id="weeklyResultsContent" class="weekly-results-content">
                    <!-- Weekly results will be rendered here -->
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Add event listeners to week chips
        document.querySelectorAll('.week-chip').forEach(chip => {
            chip.addEventListener('click', function() {
                changeWeek(parseInt(this.getAttribute('data-week')));
            });
        });
        
        // Render weekly results for the initial week
        renderWeeklyResults();
    }

    // Render weekly results for the current week
    function renderWeeklyResults() {
        const contentContainer = document.getElementById('weeklyResultsContent');
        if (!contentContainer) return;
        
        // Filter data for current season and week
        let filteredData = leagueScoreData.filter(game => 
            (currentSeason === 'All Time' || (game.Season && game.Season.toString() === currentSeason)) &&
            game.Week && parseInt(game.Week) === currentWeek
        );
        
        if (!filteredData || filteredData.length === 0) {
            contentContainer.innerHTML = `
                <div class="no-data">
                    <p>No results available for Week ${currentWeek}.</p>
                </div>
            `;
            return;
        }
        
        // Update week navigation buttons
        const prevWeekBtn = document.getElementById('prevWeekBtn');
        const nextWeekBtn = document.getElementById('nextWeekBtn');
        
        if (prevWeekBtn) {
            prevWeekBtn.disabled = allWeeks.indexOf(currentWeek) === 0;
        }
        
        if (nextWeekBtn) {
            nextWeekBtn.disabled = allWeeks.indexOf(currentWeek) === allWeeks.length - 1;
        }
        
        // Calculate week statistics
        const weekStats = calculateWeekStats(filteredData);
        
        // Find the highest score in the week to normalize all bars
        const highestWeekScore = weekStats.highScore;
        
        // Render week summary
        let html = `
            <div class="week-summary">
                <div class="week-summary-title">Week ${currentWeek} Summary</div>
                <div class="week-summary-stats">
                    <div class="summary-stat">
                        <div class="stat-value">${formatPoints(weekStats.highScore)}</div>
                        <div class="stat-label">Highest Score</div>
                        <div class="stat-detail">${weekStats.highScoreTeam}</div>
                    </div>
                    <div class="summary-stat">
                        <div class="stat-value">${formatPoints(weekStats.lowScore)}</div>
                        <div class="stat-label">Lowest Score</div>
                        <div class="stat-detail">${weekStats.lowScoreTeam}</div>
                    </div>
                    <div class="summary-stat">
                        <div class="stat-value">${formatPoints(weekStats.avgScore)}</div>
                        <div class="stat-label">Average Score</div>
                    </div>
                    <div class="summary-stat">
                        <div class="stat-value">${weekStats.totalGames}</div>
                        <div class="stat-label">Matchups</div>
                    </div>
                </div>
            </div>
        `;
        
        // Process matchups to avoid duplicates
        const matchups = processMatchups(filteredData);
        
        // Sort matchups by gameId (smallest to largest) instead of by combined score
        matchups.sort((a, b) => {
            return parseInt(a.gameId) - parseInt(b.gameId);
        });
        
        // Add matchups container
        html += `<div class="matchups-container">`;
        
        // Render all matchups for this week
        matchups.forEach(matchup => {
            const team1Points = parseFloat(matchup.team1.score);
            const team2Points = parseFloat(matchup.team2.score);
            
            const team1Winner = team1Points > team2Points;
            const team2Winner = team2Points > team1Points;
            const isTie = team1Points === team2Points;
            
            // Calculate team percentages against the highest score in the week
            const team1Percentage = (team1Points / highestWeekScore) * 100;
            const team2Percentage = (team2Points / highestWeekScore) * 100;
            
            // Get team colors based on name
            const team1Colors = getTeamColors(matchup.team1.name);
            const team2Colors = getTeamColors(matchup.team2.name);
            
            // Create style attributes for winner highlighting with halo effect but NO secondary color border
            const team1WinnerStyle = team1Winner ? 
                `style="background-color: ${team1Colors.primary}22; box-shadow: 0 0 15px ${team1Colors.secondary}44;"` : '';

            const team2WinnerStyle = team2Winner ? 
                `style="background-color: ${team2Colors.primary}22; box-shadow: 0 0 15px ${team2Colors.secondary}44;"` : '';
            
            // Adjust score bar colors to use primary color
            const team1BarStyle = `background-color: ${team1Colors.primary};`;
            const team2BarStyle = `background-color: ${team2Colors.primary};`;
            
            html += `
                <div class="matchup-card" data-matchup-id="${matchup.gameId}">
                    <div class="matchup-header">
                        <span class="matchup-title">Week ${currentWeek} Matchup</span>
                        <span class="matchup-id">#${matchup.gameId}</span>
                    </div>
                    <div class="matchup-teams">
                        <div class="team ${team1Winner ? 'winner' : ''} ${isTie ? 'tie' : ''}" ${team1WinnerStyle}>
                            <div class="team-logo-bg">
                                <img src="${getTeamLogo(matchup.team1.name)}" 
                                     onerror="this.src='../assets/team-logos/default.png'"
                                     alt="${matchup.team1.name}" class="team-bg-img">
                            </div>
                            <div class="team-info">
                                <div class="team-name">${matchup.team1.name}</div>
                                <div class="team-score-weekly">${formatPoints(team1Points)}</div>
                                <div class="team-rank">${matchup.team1.rank ? `Score Rank: #${matchup.team1.rank}` : ''}</div>
                            </div>
                            <div class="weekly-score-bar-container">
                                <div class="weekly-score-bar" style="width: ${team1Percentage}%; ${team1BarStyle}"></div>
                            </div>
                        </div>
                        <div class="matchup-vs">
                            <span class="matchup-vs-text">VS</span>
                        </div>
                        <div class="team ${team2Winner ? 'winner' : ''} ${isTie ? 'tie' : ''}" ${team2WinnerStyle}>
                            <div class="team-logo-bg">
                                <img src="${getTeamLogo(matchup.team2.name)}" 
                                     onerror="this.src='../assets/team-logos/default.png'"
                                     alt="${matchup.team2.name}" class="team-bg-img">
                            </div>
                            <div class="team-info">
                                <div class="team-name">${matchup.team2.name}</div>
                                <div class="team-score-weekly">${formatPoints(team2Points)}</div>
                                <div class="team-rank">${matchup.team2.rank ? `Score Rank: #${matchup.team2.rank}` : ''}</div>
                            </div>
                            <div class="weekly-score-bar-container">
                                <div class="weekly-score-bar" style="width: ${team2Percentage}%; ${team2BarStyle}"></div>
                            </div>
                        </div>
                    </div>
                    <div class="matchup-footer">
                        <span class="matchup-result ${isTie ? 'tie' : ''}">${isTie ? "Tie Game" : `${Math.abs(team1Points - team2Points).toFixed(2)} Point ${team1Winner ? 'Margin' : 'Margin'}`}</span>
                        <span class="matchup-total">Total: ${formatPoints(team1Points + team2Points)} pts</span>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        contentContainer.innerHTML = html;
    }
    
    // Process matchups to avoid duplicates
    function processMatchups(data) {
        const matchupMap = new Map();
        
        data.forEach(game => {
            // Skip incomplete game data
            if (!game["Game ID"] || !game.Team || !game.Opponent || 
                game["Team Score"] === undefined || game["Opponent Score"] === undefined) {
                return;
            }
            
            const gameId = game["Game ID"];
            const team = game.Team;
            const opponent = game.Opponent;
            const teamScore = game["Team Score"];
            const opponentScore = game["Opponent Score"];
            const teamRank = game["Score Rank on Week"];
            const opponentRank = game["Opponent Score Rank on Week"];
            
            // Create a unique key for this matchup
            const matchupKey = `${gameId}_${currentWeek}`;
            
            // Only add this matchup if we haven't seen it before
            if (!matchupMap.has(matchupKey)) {
                matchupMap.set(matchupKey, {
                    gameId: gameId,
                    team1: {
                        name: team,
                        score: teamScore,
                        rank: teamRank
                    },
                    team2: {
                        name: opponent,
                        score: opponentScore,
                        rank: opponentRank
                    }
                });
            }
        });
        
        return Array.from(matchupMap.values());
    }
    
    // Calculate week statistics
    function calculateWeekStats(weekData) {
        const stats = {
            highScore: 0,
            highScoreTeam: '',
            lowScore: Number.MAX_VALUE,
            lowScoreTeam: '',
            totalPoints: 0,
            avgScore: 0,
            totalTeams: 0,
            totalGames: 0,
            uniqueMatchups: new Set()
        };
        
        // Track processed teams to avoid counting twice
        const processedTeams = new Set();
        
        weekData.forEach(game => {
            // Count unique games
            if (game["Game ID"]) {
                stats.uniqueMatchups.add(game["Game ID"]);
            }
            
            // Process team score
            if (!processedTeams.has(game.Team)) {
                processedTeams.add(game.Team);
                const score = parseFloat(game["Team Score"]) || 0;
                stats.totalPoints += score;
                stats.totalTeams++;
                
                if (score > stats.highScore) {
                    stats.highScore = score;
                    stats.highScoreTeam = game.Team;
                }
                
                if (score < stats.lowScore) {
                    stats.lowScore = score;
                    stats.lowScoreTeam = game.Team;
                }
            }
            
            // Process opponent score
            if (!processedTeams.has(game.Opponent)) {
                processedTeams.add(game.Opponent);
                const score = parseFloat(game["Opponent Score"]) || 0;
                stats.totalPoints += score;
                stats.totalTeams++;
                
                if (score > stats.highScore) {
                    stats.highScore = score;
                    stats.highScoreTeam = game.Opponent;
                }
                
                if (score < stats.lowScore) {
                    stats.lowScore = score;
                    stats.lowScoreTeam = game.Opponent;
                }
            }
        });
        
        stats.totalGames = stats.uniqueMatchups.size;
        
        if (stats.totalTeams > 0) {
            stats.avgScore = stats.totalPoints / stats.totalTeams;
        }
        
        return stats;
    }
    
    // Helper function to format points
    function formatPoints(points) {
        if (typeof points !== 'number') {
            points = parseFloat(points) || 0;
        }
        return points.toFixed(2);
    }
    
    // Helper function to sanitize team names for image filenames
    function sanitizeTeamName(name) {
        if (!name) return 'default';
        return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }
    
    // Helper function to get logo for a team
    function getTeamLogo(teamName) {
        if (!teamName) return '../assets/team-logos/default.png';
        
        // First try to get the FFL abbreviation
        const fflAbbr = getTeamFFLAbbreviation(teamName);
        
        if (fflAbbr && fflAbbr !== 'nil' && fflAbbr !== '') {
            // Use FFL logo if available
            return `../assets/ffl-logos/${fflAbbr}.png`;
        } else {
            // Fall back to sanitized team name
            return `../assets/team-logos/${sanitizeTeamName(teamName)}.png`;
        }
    }
    
    // Public API
    return {
        load: function(data) {
            load(data, window.currentSeason || 'All Time');
        },
        updateSeason: function(season) {
            updateSeason(season);
        }
    };
})();

// Add an event listener for season changes if it doesn't exist elsewhere
document.addEventListener('DOMContentLoaded', function() {
    const seasonSelect = document.getElementById('seasonSelect');
    if (seasonSelect) {
        seasonSelect.addEventListener('change', function() {
            const selectedSeason = this.value;
            if (window.WeeklyResults && window.WeeklyResults.updateSeason) {
                window.WeeklyResults.updateSeason(selectedSeason);
            }
        });
    }
});
