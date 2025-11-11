// Notable Games module for Season Overview

window.NotableGames = (function() {
    // Private variables
    let leagueScoreData = null;
    let currentSeason = null;
    let teamAbbreviations = null; // To store team abbreviations
    
    // Load function called by the main controller
    function load(data, season) {
        console.log('Loading Notable Games...');
        currentSeason = season || window.currentSeason || 'All Time';
        
        // Show loading state initially
        const container = document.getElementById('notable-games');
        if (container) {
            container.innerHTML = `
                <h2 class="section-title">Notable Games</h2>
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading notable games for ${currentSeason}...</p>
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
                render();
            })
            .catch(error => {
                console.error('Error loading notable games:', error);
                renderNoData('Could not load notable games data for this season.');
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
    
    // Helper function to render "no data" message
    function renderNoData(message) {
        const container = document.getElementById('notable-games');
        if (container) {
            container.innerHTML = `
                <h2 class="section-title">Notable Games</h2>
                <div class="no-data">
                    <p>${message}</p>
                </div>
            `;
        }
    }
    
    // Format points nicely
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
    
    // Get filtered data for current season
    function getFilteredData() {
        if (!leagueScoreData || !Array.isArray(leagueScoreData)) {
            return [];
        }
        
        // Filter data for current season if not "All Time"
        if (currentSeason !== 'All Time') {
            return leagueScoreData.filter(game => 
                game.Season && game.Season.toString() === currentSeason
            );
        }
        
        return leagueScoreData;
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
            const teamScore = parseFloat(game["Team Score"]);
            const opponentScore = parseFloat(game["Opponent Score"]);
            const week = game.Week;
            const season = game.Season;
            
            // Create a unique key for this matchup
            const matchupKey = `${gameId}_${week}_${season}`;
            
            // Calculate combined score and margin
            const combinedScore = teamScore + opponentScore;
            const margin = Math.abs(teamScore - opponentScore);
            
            // Only add this matchup if we haven't seen it before
            if (!matchupMap.has(matchupKey)) {
                matchupMap.set(matchupKey, {
                    gameId: gameId,
                    week: week,
                    season: season,
                    team1: {
                        name: team,
                        score: teamScore
                    },
                    team2: {
                        name: opponent,
                        score: opponentScore
                    },
                    combinedScore: combinedScore,
                    margin: margin,
                    isBlowout: margin > 50, // Consider margins over 50 as blowouts
                    isClose: margin < 5     // Consider margins under 5 as close games
                });
            }
        });
        
        return Array.from(matchupMap.values());
    }
    
    // Main render function
    function render() {
        const container = document.getElementById('notable-games');
        if (!container) return;
        
        if (!leagueScoreData || !Array.isArray(leagueScoreData) || leagueScoreData.length === 0) {
            renderNoData('No notable games available for this season.');
            return;
        }
        
        // Filter data for current season
        const filteredData = getFilteredData();
        
        // Process matchups to avoid duplicates
        const matchups = processMatchups(filteredData);
        
        // Sort matchups for different categories - top 6 for each category
        const highestScoring = [...matchups].sort((a, b) => b.combinedScore - a.combinedScore).slice(0, 6);
        const lowestScoring = [...matchups].sort((a, b) => a.combinedScore - b.combinedScore).slice(0, 6);
        const biggestBlowouts = [...matchups].sort((a, b) => b.margin - a.margin).slice(0, 6);
        const closestGames = [...matchups].sort((a, b) => a.margin - b.margin).slice(0, 6);
        
        // Create HTML
        let html = `
            <h2 class="section-title">Notable Games</h2>
            <div class="notable-games-container">
                <div class="notable-games-categories">
                    <div class="category-tabs">
                        <button class="category-tab active" data-category="highest">Highest Scoring</button>
                        <button class="category-tab" data-category="lowest">Lowest Scoring</button>
                        <button class="category-tab" data-category="blowouts">Biggest Blowouts</button>
                        <button class="category-tab" data-category="closest">Closest Games</button>
                    </div>
                    
                    <div class="category-content">
                        <div class="category-panel active" id="highest-scoring">
                            <h3 class="category-title">Highest Scoring Games</h3>
                            <div class="notable-games-list">
                                ${renderGamesList(highestScoring, 'high')}
                            </div>
                        </div>
                        
                        <div class="category-panel" id="lowest-scoring">
                            <h3 class="category-title">Lowest Scoring Games</h3>
                            <div class="notable-games-list">
                                ${renderGamesList(lowestScoring, 'low')}
                            </div>
                        </div>
                        
                        <div class="category-panel" id="biggest-blowouts">
                            <h3 class="category-title">Biggest Blowouts</h3>
                            <div class="notable-games-list">
                                ${renderGamesList(biggestBlowouts, 'blowout')}
                            </div>
                        </div>
                        
                        <div class="category-panel" id="closest-games">
                            <h3 class="category-title">Closest Games</h3>
                            <div class="notable-games-list">
                                ${renderGamesList(closestGames, 'close')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Add event listeners for category tabs
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                // Remove active class from all tabs and panels
                document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.category-panel').forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Show corresponding panel
                const category = this.getAttribute('data-category');
                let panelId;
                
                switch(category) {
                    case 'highest':
                        panelId = 'highest-scoring';
                        break;
                    case 'lowest':
                        panelId = 'lowest-scoring';
                        break;
                    case 'blowouts':
                        panelId = 'biggest-blowouts';
                        break;
                    case 'closest':
                        panelId = 'closest-games';
                        break;
                    default:
                        panelId = 'highest-scoring';
                }
                
                document.getElementById(panelId).classList.add('active');
            });
        });
    }
    
    // Render games list for a category
    function renderGamesList(games, type) {
        if (!games || games.length === 0) {
            return `<div class="no-data">No ${type} scoring games found for this season.</div>`;
        }
        
        let html = '';
        
        games.forEach((game, index) => {
            const team1Points = game.team1.score;
            const team2Points = game.team2.score;
            
            const team1Winner = team1Points > team2Points;
            const team2Winner = team2Points > team1Points;
            const isTie = team1Points === team2Points;
            
            let badgeText = '';
            let badgeClass = '';
            
            switch(type) {
                case 'high':
                    badgeText = `${formatPoints(game.combinedScore)} Total Pts`;
                    badgeClass = 'high-score';
                    break;
                case 'low':
                    badgeText = `${formatPoints(game.combinedScore)} Total Pts`;
                    badgeClass = 'low-score';
                    break;
                case 'blowout':
                    badgeText = `${formatPoints(game.margin)} Pt Margin`;
                    badgeClass = 'blowout';
                    break;
                case 'close':
                    badgeText = `${formatPoints(game.margin)} Pt Margin`;
                    badgeClass = 'close-game';
                    break;
            }
            
            // Get team colors for styling
            const team1Colors = getTeamColors(game.team1.name);
            const team2Colors = getTeamColors(game.team2.name);
            
            // Get team logos with the updated method that uses abbreviations
            const team1Logo = getTeamLogo(game.team1.name);
            const team2Logo = getTeamLogo(game.team2.name);
            
            html += `
                <div class="notable-game-card">
                    <div class="game-header">
                        <span class="game-season-week">Season ${game.season}, Week ${game.week}</span>
                        <span class="game-badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="game-teams">
                        <div class="game-team ${team1Winner ? 'winner' : ''} ${isTie ? 'tie' : ''}">
                            <div class="team-logo-bg">
                                <img src="${team1Logo}" 
                                     onerror="this.src='../assets/team-logos/default.png'"
                                     alt="${game.team1.name}" class="team-bg-img">
                            </div>
                            <div class="team-content">
                                <div class="team-details">
                                    <div class="team-name">${game.team1.name}</div>
                                    <div class="team-score">${formatPoints(team1Points)}</div>
                                </div>
                            </div>
                        </div>
                        <div class="game-vs">
                            <span class="matchup-vs-text">VS</span>
                        </div>
                        <div class="game-team ${team2Winner ? 'winner' : ''} ${isTie ? 'tie' : ''}">
                            <div class="team-logo-bg">
                                <img src="${team2Logo}" 
                                     onerror="this.src='../assets/team-logos/default.png'"
                                     alt="${game.team2.name}" class="team-bg-img">
                            </div>
                            <div class="team-content">
                                <div class="team-details">
                                    <div class="team-name">${game.team2.name}</div>
                                    <div class="team-score">${formatPoints(team2Points)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="game-footer">
                        <span class="game-result">
                            ${isTie ? 'Tie Game' : `${team1Winner ? game.team1.name : game.team2.name} won by ${formatPoints(game.margin)}`}
                        </span>
                    </div>
                </div>
            `;
        });
        
        return html;
    }
    
    // Public API
    return {
        load: function(data) {
            load(data, window.currentSeason || 'All Time');
        },
        updateSeason: function(season) {
            currentSeason = season;
            load(null, season);
        }
    };
})();
