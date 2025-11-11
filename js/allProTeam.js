// All-Pro Team module for Season Overview

window.AllProTeam = (function() {
    // Private variables
    let allProData = null;
    let currentSeason = null;
    let rosterRules = null;
    
    // Load function called by the main controller
    function load(data, season) {
        allProData = data;
        currentSeason = season || window.currentSeason || 'All Time';
        
        console.log(`Loading All-Pro Team for ${currentSeason}`);
        
        // First, load the roster rules
        loadRosterRules()
            .then(() => {
                // Then check if we have pre-calculated all-pro team data
                if (!allProData || !allProData.players || allProData.players.length === 0) {
                    calculateAllProTeamAcrossAllWeeks(currentSeason);
                } else {
                    render();
                }
            })
            .catch(error => {
                console.error("Error loading roster rules:", error);
                // Use default rules and continue
                rosterRules = getDefaultRosterRules();
                
                if (!allProData || !allProData.players || allProData.players.length === 0) {
                    calculateAllProTeamAcrossAllWeeks(currentSeason);
                } else {
                    render();
                }
            });
    }
    
    // New function to handle season changes
    function updateSeason(season) {
        if (season === currentSeason) {
            return; // No change, don't reload
        }
        
        console.log(`Updating All-Pro Team for new season: ${season}`);
        currentSeason = season;
        
        // Reset the data
        allProData = null;
        rosterRules = null;
        
        // Show loading state
        const container = document.getElementById('all-pro-team');
        if (container) {
            container.innerHTML = `
                <h2 class="section-title">All-Pro Team</h2>
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading All-Pro Team data for ${season}...</p>
                </div>
            `;
        }
        
        // Reload with new season data
        load(null, season);
    }
    
    // Load roster rules for the current season
    function loadRosterRules() {
        return fetch('../data/roster_rules.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load roster rules');
                }
                return response.json();
            })
            .then(data => {
                // Find rules for the current season, or use the most recent season's rules
                let rules = null;
                
                if (currentSeason === 'All Time') {
                    // For All Time, use the most recent season's rules
                    rules = data.sort((a, b) => b.Season - a.Season)[0];
                } else {
                    // Find rules for the current season
                    rules = data.find(r => r.Season.toString() === currentSeason);
                    
                    // If no rules found for the current season, use the most recent
                    if (!rules) {
                        rules = data.sort((a, b) => b.Season - a.Season)[0];
                    }
                }
                
                rosterRules = rules.Slots;
                console.log("Loaded roster rules:", rosterRules);
                return rosterRules;
            });
    }
    
    // Load roster rules synchronously (for immediate use)
    function loadRosterRulesSync() {
        console.log('Loading roster rules synchronously for', currentSeason);
        
        try {
            // Use XMLHttpRequest for synchronous loading
            const xhr = new XMLHttpRequest();
            xhr.open('GET', '../data/roster_rules.json', false); // false makes it synchronous
            xhr.send(null);
            
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                
                // Find rules for the current season
                let rules = null;
                
                if (currentSeason === 'All Time') {
                    // For All Time, use the most recent season's rules
                    rules = data.sort((a, b) => b.Season - a.Season)[0];
                } else {
                    // Find rules for the current season
                    rules = data.find(r => r.Season.toString() === currentSeason);
                    
                    // If no rules found for the current season, use the most recent
                    if (!rules) {
                        rules = data.sort((a, b) => b.Season - a.Season)[0];
                    }
                }
                
                if (rules && rules.Slots) {
                    rosterRules = rules.Slots;
                    console.log("Loaded roster rules for", rules.Season, ":", rosterRules);
                } else {
                    console.warn("No roster slots found, using defaults");
                    rosterRules = getDefaultRosterRules();
                }
            } else {
                console.warn("Failed to load roster rules, using defaults");
                rosterRules = getDefaultRosterRules();
            }
        } catch (error) {
            console.error("Error loading roster rules:", error);
            rosterRules = getDefaultRosterRules();
        }
        
        return rosterRules;
    }
    
    // Get default roster rules in case we can't load them
    function getDefaultRosterRules() {
        return {
            "QB": 1,
            "RB": 2,
            "WR": 2,
            "TE": 1,
            "FLEX": 2,
            "D/ST": 1,
            "K": 1,
            "P": 1,
            "HC": 1,
            "FLEX Eligible": "RB, WR, TE"
        };
    }
    
    // Calculate All-Pro Team using data from all weeks in the season
    function calculateAllProTeamAcrossAllWeeks(season) {
        // Show loading state
        const container = document.getElementById('all-pro-team');
        if (container) {
            container.innerHTML = `
                <h2 class="section-title">All-Pro Team</h2>
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Analyzing season-long player data for ${season}...</p>
                </div>
            `;
        }
        
        // Don't try to calculate for "All Time" - this would require all seasons' data
        if (season === 'All Time') {
            renderNoData("All-Pro Team data is not available for All Time view.", true);
            return;
        }
        
        // First discover all available weeks
        discoverAvailableWeeks(season)
            .then(weeks => {
                console.log(`Discovered ${weeks.length} weeks for season ${season}:`, weeks);
                
                if (weeks.length === 0) {
                    throw new Error(`No weekly data found for ${season} season`);
                }
                
                // Sort weeks in numeric order to ensure proper processing
                const sortedWeeks = weeks.sort((a, b) => parseInt(a) - parseInt(b));
                
                // Load data from all weeks
                return loadAllWeeklyData(season, sortedWeeks);
            })
            .then(allWeeksData => {
                console.log(`Successfully loaded data from all weeks`);
                
                // Process all weeks data to calculate season totals
                const allProTeams = calculateAllProFromSeasonData(allWeeksData);
                
                if (allProTeams.first.length === 0 && 
                    allProTeams.second.length === 0 && 
                    allProTeams.third.length === 0) {
                    throw new Error('No players found with stats');
                }
                
                allProData = {
                    description: `${season} Season All-Pro Teams - Based on total season performance.`,
                    teams: allProTeams
                };
                render();
            })
            .catch(error => {
                console.error('Error calculating All-Pro Team:', error);
                renderNoData(`Could not generate All-Pro Team: ${error.message}`, true);
            });
    }
    
    // Discover available weeks for a season
    function discoverAvailableWeeks(season) {
        return fetch(`../data/rosters/${season}/`)
            .then(response => {
                // If directory listing is not enabled, try an alternative approach
                // Check for common weeks based on NFL season structure (1-17)
                const weeksToCheck = Array.from({ length: 17 }, (_, i) => (i + 1).toString());
                
                const weekPromises = weeksToCheck.map(week => {
                    return fetch(`../data/rosters/${season}/week_${week}_rosters.json`)
                        .then(response => {
                            if (response.ok) {
                                return week;
                            }
                            return null;
                        })
                        .catch(() => null);
                });
                
                return Promise.all(weekPromises)
                    .then(results => {
                        return results.filter(week => week !== null);
                    });
            })
            .catch(error => {
                console.error(`Error discovering weeks for season ${season}:`, error);
                return [];
            });
    }
    
    // Load data from all weekly roster files
    function loadAllWeeklyData(season, weeks) {
        console.log(`Loading data from ${weeks.length} weeks for season ${season}`);
        
        // Create an array of promises to fetch all weekly data
        const weekPromises = weeks.map(week => {
            return fetch(`../data/rosters/${season}/week_${week}_rosters.json`)
                .then(response => {
                    if (!response.ok) {
                        console.warn(`Could not load data for week ${week}`);
                        return null;
                    }
                    return response.json()
                        .then(data => ({ week, data }));
                })
                .catch(error => {
                    console.warn(`Error loading week ${week}:`, error);
                    return null;
                });
        });
        
        // Wait for all promises to resolve
        return Promise.all(weekPromises)
            .then(results => {
                // Filter out null results (weeks that couldn't be loaded)
                return results.filter(result => result !== null);
            });
    }
    
    // Calculate All-Pro Team from season-long data
    function calculateAllProFromSeasonData(allWeeksData) {
        console.log('Calculating All-Pro Teams from season-long data');
        
        // Create a map to track each player's stats across all weeks
        const playerStatsMap = new Map();
        
        // Process each week's data
        allWeeksData.forEach(weekData => {
            const { week, data } = weekData;
            
            if (!data || !data.teams || !Array.isArray(data.teams)) {
                console.warn(`Invalid data format for week ${week}`);
                return;
            }
            
            // Process each team's roster
            data.teams.forEach(team => {
                if (!team.roster || !Array.isArray(team.roster)) {
                    return;
                }
                
                // Process each player
                team.roster.forEach(player => {
                    // Skip players with no points or no position
                    if (!player.position || player.actualPoints === null || player.actualPoints === undefined) {
                        return;
                    }
                    
                    const playerId = player.playerId;
                    const actualPoints = parseFloat(player.actualPoints) || 0;
                    
                    // Initialize or update player in the map
                    if (!playerStatsMap.has(playerId)) {
                        playerStatsMap.set(playerId, {
                            id: playerId,
                            name: player.name,
                            position: player.position,
                            nflTeam: player.proTeam,
                            fantasyTeam: team.team_name,
                            owner: team.owner,
                            totalPoints: 0,
                            weeksPlayed: 0,
                            weeklyPoints: [],
                            slotPosition: player.slotPosition
                        });
                    }
                    
                    // Update player stats
                    const playerStats = playerStatsMap.get(playerId);
                    
                    // Only count points for players who actually played (not on bench)
                    // We don't want to penalize players who were on bye or injured
                    if (actualPoints > 0) {
                        playerStats.totalPoints += actualPoints;
                        playerStats.weeksPlayed++;
                        playerStats.weeklyPoints.push({
                            week: week,
                            points: actualPoints
                        });
                    }
                    
                    // Update team/owner info
                    if (team.team_name) {
                        playerStats.fantasyTeam = team.team_name;
                    }
                    if (team.owner) {
                        playerStats.owner = team.owner;
                    }
                });
            });
        });
        
        // Convert map to array of players
        const allPlayers = Array.from(playerStatsMap.values());
        
        console.log(`Processed ${allPlayers.length} players across all weeks`);
        
        // Filter out players with no points
        const playersWithStats = allPlayers.filter(player => player.totalPoints > 0);
        
        console.log(`${playersWithStats.length} players have positive total points`);
        
        // Calculate PPG (points per game) for each player
        playersWithStats.forEach(player => {
            player.ppg = player.weeksPlayed > 0 ? player.totalPoints / player.weeksPlayed : 0;
            player.points = player.totalPoints; // For compatibility with the UI
        });
        
        // Group players by position
        const playersByPosition = {};
        playersWithStats.forEach(player => {
            // Normalize positions (DEF/ST -> DEF, etc.)
            let normalizedPosition = player.position;
            if (normalizedPosition === 'D/ST') normalizedPosition = 'DEF';
            
            if (!playersByPosition[normalizedPosition]) {
                playersByPosition[normalizedPosition] = [];
            }
            playersByPosition[normalizedPosition].push(player);
        });
        
        // Display the positions found
        console.log('Positions found:', Object.keys(playersByPosition));
        
        // Select top players for all three teams
        return createAllProTeams(playersByPosition);
    }
    
    // Create three All-Pro teams (1st, 2nd, 3rd) based on roster rules for the selected season
    function createAllProTeams(playersByPosition) {
        // Use dynamic position limits based on roster rules for the current season
        let positionLimits = {};
        
        // Load roster rules for the current season if not already loaded
        if (!rosterRules) {
            loadRosterRulesSync();
        }
        
        // Get position limits from roster rules
        if (rosterRules) {
            // Extract standard positions (excluding FLEX)
            Object.keys(rosterRules).forEach(position => {
                // Skip FLEX positions and FLEX Eligible
                if (position !== 'FLEX' && position !== 'FLEX Eligible') {
                    // Normalize position names (D/ST -> DEF)
                    const normalizedPosition = position === 'D/ST' ? 'DEF' : position;
                    positionLimits[normalizedPosition] = rosterRules[position];
                }
            });
        } else {
            // Fallback to default position limits if no roster rules found
            positionLimits = {
                'QB': 1,
                'RB': 2,
                'WR': 2,
                'TE': 1,
                'K': 1,
                'DEF': 1
            };
        }
        
        console.log(`Using position limits from ${currentSeason} roster rules:`, positionLimits);
        
        // Initialize teams
        const firstTeam = [];
        const secondTeam = [];
        const thirdTeam = [];
        
        // For each position, select the top players
        Object.keys(positionLimits).forEach(position => {
            if (playersByPosition[position] && playersByPosition[position].length > 0) {
                const positionCount = positionLimits[position] || 1;
                console.log(`Selecting top ${positionCount} players for position ${position}`);
                
                // Sort players by total points (descending)
                const sortedPlayers = playersByPosition[position].sort((a, b) => b.totalPoints - a.totalPoints);
                
                // Calculate how many players we need for all three teams
                const totalNeeded = positionCount * 3;
                const available = sortedPlayers.length;
                
                // Take up to totalNeeded players (or fewer if not enough available)
                const selectedPlayers = sortedPlayers.slice(0, Math.min(totalNeeded, available));
                
                // Tag players with their All-Pro team
                selectedPlayers.forEach((player, index) => {
                    // Determine which team this player belongs to
                    if (index < positionCount) {
                        player.team = "first";
                        firstTeam.push(player);
                    } else if (index < positionCount * 2) {
                        player.team = "second";
                        secondTeam.push(player);
                    } else {
                        thirdTeam.push(player);
                    }
                });
            } else {
                console.warn(`No players found for position ${position}`);
            }
        });
        
        console.log('1st Team All-Pro:', firstTeam);
        console.log('2nd Team All-Pro:', secondTeam);
        console.log('3rd Team All-Pro:', thirdTeam);
        
        return {
            first: firstTeam,
            second: secondTeam,
            third: thirdTeam,
            positionLimits: positionLimits // Return the position limits for reference
        };
    }
    
    // Helper function to render "no data" message
    function renderNoData(message, includeTitle = false) {
        const container = document.getElementById('all-pro-team');
        if (container) {
            container.innerHTML = `
                ${includeTitle ? '<h2 class="section-title">All-Pro Team</h2>' : ''}
                <div class="no-data">
                    <p>${message}</p>
                </div>
            `;
        }
    }
    
    // Helper function to render the all-pro team
    function renderAllProTeam() {
        if (!allProData || !allProData.teams || !allProData.teams.first) {
            return `<div class="no-data">No players found for All-Pro Team</div>`;
        }
        
        // Get the position order from roster rules or use default order
        const positionOrder = getPositionOrder();
        const positionLimits = allProData.teams.positionLimits || {
            'QB': 1, 'RB': 2, 'WR': 2, 'TE': 1, 'K': 1, 'DEF': 1
        };
        
        let html = `
            <div class="all-pro-teams-container">
        `;
        
        // Create a header row with team titles
        html += `
            <div class="all-pro-header-row">
                <div class="position-header-cell">Position</div>
                <div class="team-header-cell first-team">First Team</div>
                <div class="team-header-cell second-team">Second Team</div>
                <div class="team-header-cell third-team">Third Team</div>
            </div>
        `;
        
        // Loop through positions in the specified order
        positionOrder.forEach(position => {
            // Get count for this position directly from roster rules
            const positionCount = positionLimits[position] || 1;
            
            html += `<div class="all-pro-position-row">`;
            
            // Position cell without count
            html += `<div class="position-cell ${position}">${getPositionName(position)}</div>`;
            
            // First team players for this position
            html += renderPositionTeamCell(position, "first", allProData.teams.first, positionCount);
            
            // Second team players for this position
            html += renderPositionTeamCell(position, "second", allProData.teams.second, positionCount);
            
            // Third team players for this position
            html += renderPositionTeamCell(position, "third", allProData.teams.third, positionCount);
            
            html += `</div>`;
        });
        
        html += `</div>`;
        
        return html;
    }
    
    // Helper function to render a team cell for a specific position
    function renderPositionTeamCell(position, teamType, teamPlayers, positionCount) {
        let html = `<div class="player-cell ${teamType}-team">`;
        
        // Get all players for this position
        const positionPlayers = teamPlayers.filter(p => 
            position === 'DEF' ? (p.position === 'DEF' || p.position === 'D/ST') : p.position === position
        );
        
        if (positionPlayers.length > 0) {
            // Only show up to the position count
            const playersToShow = positionPlayers.slice(0, positionCount);
            
            playersToShow.forEach(player => {
                html += renderPlayerCard(player, teamType);
            });
            
            // If we have fewer players than the position count, add empty slots
            for (let i = playersToShow.length; i < positionCount; i++) {
                html += `<div class="empty-player">No player selected</div>`;
            }
        } else {
            // Add empty slots for the full position count
            for (let i = 0; i < positionCount; i++) {
                html += `<div class="empty-player">No player selected</div>`;
            }
        }
        
        html += `</div>`;
        return html;
    }
    
    // Helper function to render a player card
    function renderPlayerCard(player, teamType) {
        if (!player) return '';
        
        // Format season total and points per game
        const totalPoints = formatNumber(player.totalPoints || player.points);
        const ppg = formatNumber(player.ppg);
        
        // Determine if we should show NFL team logo or player headshot
        const isTeamPosition = player.position === 'HC' || player.position === 'D/ST' || player.position === 'DEF';
        
        // Get the source for the image
        let imgSrc, imgAlt;
        
        if (isTeamPosition) {
            // For HC and D/ST positions, show the NFL team logo
            const nflTeam = player.nflTeam && player.nflTeam !== 'TEAM0' ? 
                player.nflTeam.toLowerCase() : 'nfl';
            imgSrc = `../assets/nfl-logos/${nflTeam}.png`;
            imgAlt = player.nflTeam || 'NFL';
        } else {
            // For player positions, show the headshot
            imgSrc = `../assets/espn-player-images/${player.id}.png`;
            imgAlt = player.name;
        }
        
        return `
            <div class="ap-player-card ${teamType}-team">
                <div class="ap-player-image-container">
                    <img src="${imgSrc}" 
                        onerror="this.src='../assets/espn-player-images/default.png'"
                        alt="${imgAlt}" class="ap-player-headshot">
                </div>
                <div class="ap-player-details">
                    <div class="ap-player-name">
                        <a href="player-details.html?id=${player.id}">${player.name}</a>
                    </div>
                    <div class="ap-player-stats">
                        <div class="ap-player-stat">
                            <span class="stat-label">Total</span>
                            <span class="stat-value">${totalPoints}</span>
                        </div>
                        <div class="ap-player-stat">
                            <span class="stat-label">PPG</span>
                            <span class="stat-value">${ppg}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Render the all-pro team
    function render() {
        const container = document.getElementById('all-pro-team');
        if (!container) return;
        
        try {
            if (!allProData) {
                renderNoData("All-Pro Team data is not available for this season.", true);
                return;
            }
            
            let html = `
                <h2 class="section-title">All-Pro Team</h2>
                <div class="all-pro-team-container">
                    ${renderAllProTeam()}
                </div>
            `;
            
            container.innerHTML = html;
        } catch (error) {
            console.error('Error rendering All-Pro Team:', error);
            renderNoData(`Could not display All-Pro Team: ${error.message}`, true);
        }
    }
    
    // Helper function to get position full name
    function getPositionName(position) {
        const positionMap = {
            'QB': 'Quarterbacks',
            'RB': 'Running Backs',
            'WR': 'Wide Receivers',
            'TE': 'Tight Ends',
            'K': 'Kickers',
            'DEF': 'Defense & Special Teams',
            'P': 'Punters',
            'HC': 'Head Coaches'
        };
        
        return positionMap[position] || position;
    }
    
    // Helper function to format number
    function formatNumber(num, decimals = 1) {
        if (isNaN(num) || num === undefined || num === null) {
            return "0.0";
        }
        return parseFloat(num).toFixed(decimals);
    }
    
    // Get position order from roster rules
    function getPositionOrder() {
        // Default position order if no roster rules available
        const defaultOrder = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
        
        if (!rosterRules) {
            return defaultOrder;
        }
        
        // Extract positions from roster rules, ignoring FLEX and FLEX Eligible
        const positions = Object.keys(rosterRules)
            .filter(pos => pos !== 'FLEX' && pos !== 'FLEX Eligible')
            .map(pos => pos === 'D/ST' ? 'DEF' : pos);
        
        // Use a custom order for display if we got valid positions
        if (positions.length > 0) {
            // Move these positions to the front in this specific order
            const preferredOrder = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'P', 'HC'];
            
            return preferredOrder.filter(pos => positions.includes(pos));
        }
        
        return defaultOrder;
    }
    
    // Public API
    return {
        load: function(data) {
            load(data, window.currentSeason || 'All Time');
        },
        // Add updateSeason to public API
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
            if (window.AllProTeam && window.AllProTeam.updateSeason) {
                window.AllProTeam.updateSeason(selectedSeason);
            }
        });
    }
});
