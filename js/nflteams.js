// NFL Teams module for Season Overview

window.NFLTeams = (function() {
    // Private variables
    let nflTeamsData = null;
    let rosterData = null;
    let currentSeason = null;
    let rosterRules = null;
    let teamAbbreviations = null; // Add new variable to store team abbreviations
    
    // NFL team definitions with conferences and divisions
    const nflTeams = [
        { abbr: 'ARI', name: 'Arizona Cardinals', conference: 'NFC', division: 'West' },
        { abbr: 'ATL', name: 'Atlanta Falcons', conference: 'NFC', division: 'South' },
        { abbr: 'BAL', name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
        { abbr: 'BUF', name: 'Buffalo Bills', conference: 'AFC', division: 'East' },
        { abbr: 'CAR', name: 'Carolina Panthers', conference: 'NFC', division: 'South' },
        { abbr: 'CHI', name: 'Chicago Bears', conference: 'NFC', division: 'North' },
        { abbr: 'CIN', name: 'Cincinnati Bengals', conference: 'AFC', division: 'North' },
        { abbr: 'CLE', name: 'Cleveland Browns', conference: 'AFC', division: 'North' },
        { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
        { abbr: 'DEN', name: 'Denver Broncos', conference: 'AFC', division: 'West' },
        { abbr: 'DET', name: 'Detroit Lions', conference: 'NFC', division: 'North' },
        { abbr: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
        { abbr: 'HOU', name: 'Houston Texans', conference: 'AFC', division: 'South' },
        { abbr: 'IND', name: 'Indianapolis Colts', conference: 'AFC', division: 'South' },
        { abbr: 'JAX', name: 'Jacksonville Jaguars', conference: 'AFC', division: 'South' },
        { abbr: 'KC', name: 'Kansas City Chiefs', conference: 'AFC', division: 'West' },
        { abbr: 'LV', name: 'Las Vegas Raiders', conference: 'AFC', division: 'West' },
        { abbr: 'LAC', name: 'Los Angeles Chargers', conference: 'AFC', division: 'West' },
        { abbr: 'LAR', name: 'Los Angeles Rams', conference: 'NFC', division: 'West' },
        { abbr: 'MIA', name: 'Miami Dolphins', conference: 'AFC', division: 'East' },
        { abbr: 'MIN', name: 'Minnesota Vikings', conference: 'NFC', division: 'North' },
        { abbr: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
        { abbr: 'NO', name: 'New Orleans Saints', conference: 'NFC', division: 'South' },
        { abbr: 'NYG', name: 'New York Giants', conference: 'NFC', division: 'East' },
        { abbr: 'NYJ', name: 'New York Jets', conference: 'AFC', division: 'East' },
        { abbr: 'PHI', name: 'Philadelphia Eagles', conference: 'NFC', division: 'East' },
        { abbr: 'PIT', name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
        { abbr: 'SF', name: 'San Francisco 49ers', conference: 'NFC', division: 'West' },
        { abbr: 'SEA', name: 'Seattle Seahawks', conference: 'NFC', division: 'West' },
        { abbr: 'TB', name: 'Tampa Bay Buccaneers', conference: 'NFC', division: 'South' },
        { abbr: 'TEN', name: 'Tennessee Titans', conference: 'AFC', division: 'South' },
        { abbr: 'WSH', name: 'Washington Commanders', conference: 'NFC', division: 'East' }
    ];
    
    // Load function called by the main controller
    function load(data, season) {
        nflTeamsData = data || {};
        currentSeason = season || window.currentSeason || 'All Time';
        console.log(`Loading NFL Teams for ${currentSeason}`);
        
        // Initialize filter elements
        initializeFilters();
        
        // Load team abbreviations first
        loadTeamAbbreviations()
            .then(() => {
                // Then load roster rules
                return loadRosterRules();
            })
            .then(() => {
                // Load roster data for the selected season
                return loadRosterData(currentSeason);
            })
            .then(data => {
                rosterData = data;
                render();
            })
            .catch(error => {
                console.error('Error loading NFL Teams data:', error);
                renderNoData(`Could not load NFL Teams data: ${error.message}`);
            });
    }
    
    // Listen for season changes
    function listenForSeasonChanges() {
        const seasonSelect = document.getElementById('seasonSelect');
        if (seasonSelect) {
            seasonSelect.addEventListener('change', function() {
                const newSeason = this.value;
                window.currentSeason = newSeason; // Update the global current season
                load(nflTeamsData, newSeason); // Reload with the new season
            });
            console.log("NFL Teams module is listening for season changes");
        } else {
            // If the select doesn't exist yet, try again later
            setTimeout(listenForSeasonChanges, 500);
        }
    }
    
    // Load team abbreviations from team_abbreviations.json
    function loadTeamAbbreviations() {
        return fetch('../data/team_abbreviations.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load team abbreviations');
                }
                return response.json();
            })
            .then(data => {
                teamAbbreviations = data;
                console.log("Loaded team abbreviations data");
                return data;
            })
            .catch(error => {
                console.error("Error loading team abbreviations:", error);
                teamAbbreviations = { teams: [] }; // Default empty teams array
                return teamAbbreviations;
            });
    }
    
    // Get FFL abbreviation for a team owner
    function getFFLAbbreviation(ownerName) {
        if (!teamAbbreviations || !teamAbbreviations.teams || !ownerName) return null;
        
        const ownerData = teamAbbreviations.teams.find(team => 
            team.name && team.name.toLowerCase() === ownerName.toLowerCase());
        
        if (ownerData && ownerData.abbreviations && ownerData.abbreviations.FFL) {
            return ownerData.abbreviations.FFL;
        }
        
        return null;
    }
    
    // Load roster rules from roster_rules.json
    function loadRosterRules() {
        return fetch('../data/roster_rules.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load roster rules');
                }
                return response.json();
            })
            .then(data => {
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
                    
                    // Parse FLEX Eligible from string to array if needed
                    if (rosterRules['FLEX Eligible'] && typeof rosterRules['FLEX Eligible'] === 'string') {
                        rosterRules['FLEX Eligible'] = rosterRules['FLEX Eligible']
                            .split(',')
                            .map(pos => pos.trim());
                    }
                    
                    console.log("Loaded roster rules for", rules.Season, ":", rosterRules);
                } else {
                    console.warn("No roster slots found, using defaults");
                    rosterRules = getDefaultRosterRules();
                }
                
                return rosterRules;
            })
            .catch(error => {
                console.error("Error loading roster rules:", error);
                rosterRules = getDefaultRosterRules();
                return rosterRules;
            });
    }
    
    // Default roster rules if none found
    function getDefaultRosterRules() {
        return {
            'QB': 1,
            'RB': 2,
            'WR': 2,
            'TE': 1,
            'FLEX': 1,
            'D/ST': 1,
            'K': 1,
            'BE': 7,
            'total_slots': 16,
            'FLEX Eligible': ['RB', 'WR', 'TE']
        };
    }

    // Initialize filter elements
    function initializeFilters() {
        const container = document.getElementById('nflTeamsContent');
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Create teams grid container
        const teamsGrid = document.createElement('div');
        teamsGrid.className = 'nfl-teams-grid';
        teamsGrid.id = 'nflTeamsGrid';
        container.appendChild(teamsGrid);
    }

    // Load roster data for all weeks of the selected season
    function loadRosterData(season) {
        // Don't try to load rosters for All Time
        if (season === 'All Time') {
            return Promise.reject(new Error('Roster data is not available for All Time view'));
        }

        // Determine how many weeks to try loading based on season
        const maxWeeks = (season === '2019' || season === '2020') ? 15 : 16;
        
        console.log(`Attempting to load up to ${maxWeeks} weeks for season ${season}`);
        
        // Try to load all weeks' data
        const weekPromises = [];
        
        for (let week = 1; week <= maxWeeks; week++) {
            weekPromises.push(
                fetch(`../data/rosters/${season}/week_${week}_rosters.json`)
                    .then(response => {
                        if (!response.ok) {
                            console.log(`No data for week ${week}`);
                            return null;
                        }
                        return response.json();
                    })
                    .catch(() => {
                        console.log(`Error loading week ${week}`);
                        return null;
                    })
            );
        }
        
        return Promise.all(weekPromises)
            .then(results => {
                const validResults = results.filter(result => result !== null);
                
                if (validResults.length === 0) {
                    throw new Error(`No roster data found for ${season}`);
                }
                
                console.log(`Successfully loaded ${validResults.length} weeks of data for season ${season}`);
                
                // Combine all weekly data into a single comprehensive dataset
                return {
                    year: season,
                    weeksLoaded: validResults.length,
                    maxWeeks: maxWeeks,
                    weeklyData: validResults
                };
            });
    }
    
    // Render NFL teams data
    function render() {
        const container = document.getElementById('nflTeamsContent');
        if (!container) return;
        
        // Initialize filter container
        initializeFilters();
        
        // Check if we have roster data
        if (!rosterData || !rosterData.weeklyData || rosterData.weeklyData.length === 0) {
            renderNoData('No NFL team data available for this season.');
            return;
        }
        
        console.log(`Processing roster data with ${rosterData.weeksLoaded} weeks for season ${rosterData.year}`);
        
        // Process roster data to get players by NFL team and fantasy team
        const playersByNFLTeam = {};
        const fantasyTeamPoints = {};
        const totalWeeks = rosterData.weeksLoaded;
        
        // Initialize NFL team stats
        nflTeams.forEach(team => {
            playersByNFLTeam[team.abbr] = {
                players: {},  // Using an object with player IDs as keys for easier aggregation
                teamInfo: team
            };
        });
        
        // Process each week's data
        rosterData.weeklyData.forEach((weekData, weekIndex) => {
            if (!weekData || !weekData.teams) return;
            
            // Process each fantasy team's roster for this week
            weekData.teams.forEach(fantasyTeam => {
                if (!fantasyTeam.roster || !Array.isArray(fantasyTeam.roster)) return;
                
                // Initialize fantasy team in our tracking object if needed
                if (!fantasyTeamPoints[fantasyTeam.team_id]) {
                    fantasyTeamPoints[fantasyTeam.team_id] = {
                        id: fantasyTeam.team_id,
                        name: fantasyTeam.team_name,
                        owner: fantasyTeam.owner,
                        weeklyPoints: new Array(totalWeeks).fill(0),
                        totalActivePoints: 0,
                        weeksPlayed: 0
                    };
                }
                
                let weeklyActivePoints = 0;
                
                // Process each player for this fantasy team in this week
                fantasyTeam.roster.forEach(player => {
                    // Skip players without proTeam, with invalid proTeam, or without points
                    if (!player.proTeam || player.proTeam === 'TEAM0' || 
                        player.actualPoints === null || player.actualPoints === undefined) {
                        return;
                    }
                    
                    const pointsValue = parseFloat(player.actualPoints) || 0;
                    
                    // Add to NFL team player stats
                    if (!playersByNFLTeam[player.proTeam]) {
                        // If team not in our list, create it (might be renamed or invalid)
                        playersByNFLTeam[player.proTeam] = {
                            players: {},
                            teamInfo: { 
                                abbr: player.proTeam, 
                                name: player.proTeam, 
                                conference: 'Unknown', 
                                division: 'Unknown' 
                            }
                        };
                    }
                    
                    // Aggregate player stats across weeks
                    const playerId = player.playerId;
                    
                    if (!playersByNFLTeam[player.proTeam].players[playerId]) {
                        playersByNFLTeam[player.proTeam].players[playerId] = {
                            id: playerId,
                            name: player.name,
                            position: player.position,
                            proTeam: player.proTeam,
                            weeklyPoints: new Array(totalWeeks).fill(0),
                            totalPoints: 0,
                            weeksPlayed: 0
                        };
                    }
                    
                    // Add this week's points for the player
                    playersByNFLTeam[player.proTeam].players[playerId].weeklyPoints[weekIndex] = pointsValue;
                    playersByNFLTeam[player.proTeam].players[playerId].totalPoints += pointsValue;
                    if (pointsValue > 0) {
                        playersByNFLTeam[player.proTeam].players[playerId].weeksPlayed++;
                    }
                    
                    // Only count active players for fantasy team score
                    if (player.slotPosition !== "BE" && player.slotPosition !== "IR") {
                        weeklyActivePoints += pointsValue;
                    }
                });
                
                // Add this week's points for the fantasy team
                fantasyTeamPoints[fantasyTeam.team_id].weeklyPoints[weekIndex] = weeklyActivePoints;
                fantasyTeamPoints[fantasyTeam.team_id].totalActivePoints += weeklyActivePoints;
                if (weeklyActivePoints > 0) {
                    fantasyTeamPoints[fantasyTeam.team_id].weeksPlayed++;
                }
            });
        });
        
        // Convert fantasy teams object to array and calculate PPG
        const fantasyTeamArray = Object.values(fantasyTeamPoints)
            .filter(team => {
                // Filter out any team named "Unknown Team" 
                return !(team.name === 'Unknown Team' || team.displayName === 'Unknown Team\'s Team');
            })
            .map(team => {
                // Find the FFL abbreviation for the team owner
                const fflAbbr = team.owner ? getFFLAbbreviation(team.owner) : null;
                
                return {
                    name: team.name || 'Unknown Team',
                    displayName: team.owner ? `${team.owner}'s Team` : 'Unknown Team', 
                    owner: team.owner || 'Unknown',
                    fflAbbr: fflAbbr,
                    totalPoints: team.totalActivePoints,
                    ppg: team.weeksPlayed > 0 ? team.totalActivePoints / team.weeksPlayed : 0,
                    isFantasyTeam: true,
                    weeklyPoints: team.weeklyPoints // Include the weekly points data
                };
            });
        
        // Convert player objects to arrays and calculate PPG
        Object.keys(playersByNFLTeam).forEach(teamAbbr => {
            const team = playersByNFLTeam[teamAbbr];
            const playersArray = Object.values(team.players);
            
            // Calculate PPG for each player
            playersArray.forEach(player => {
                player.ppg = player.weeksPlayed > 0 ? player.totalPoints / player.weeksPlayed : 0;
            });
            
            // Organize players by position
            const playersByPosition = {};
            playersArray.forEach(player => {
                if (!player.position) return;
                
                // Handle position mapping (e.g., DEF to D/ST)
                const positionKey = player.position === 'DEF' ? 'D/ST' : player.position;
                
                if (!playersByPosition[positionKey]) {
                    playersByPosition[positionKey] = [];
                }
                playersByPosition[positionKey].push(player);
            });
            
            // Sort each position by PPG
            Object.keys(playersByPosition).forEach(position => {
                playersByPosition[position].sort((a, b) => b.ppg - a.ppg);
            });
            
            // Create optimal roster based on roster rules
            const optimalRoster = createOptimalRoster(playersByPosition);
            
            // Calculate optimal roster PPG
            let totalPPG = 0;
            Object.keys(optimalRoster).forEach(position => {
                optimalRoster[position].forEach(player => {
                    totalPPG += player.ppg;
                });
            });
            
            // Save to team record
            team.optimalRoster = optimalRoster;
            team.totalPPG = totalPPG;
        });
        
        console.log(`Processed ${Object.keys(playersByNFLTeam).length} NFL teams`);
        console.log(`Processed ${fantasyTeamArray.length} fantasy teams`);
        
        // Create a combined ranking of NFL and fantasy teams
        const allTeams = [...fantasyTeamArray];
        
        Object.keys(playersByNFLTeam).forEach(teamAbbr => {
            const team = playersByNFLTeam[teamAbbr];
            // Only include teams with players AND known conference/division
            if (Object.keys(team.players).length > 0 && 
                team.teamInfo.conference !== 'Unknown' && 
                team.teamInfo.division !== 'Unknown') {
                allTeams.push({
                    name: team.teamInfo.name,
                    abbr: teamAbbr,
                    totalPoints: team.totalPPG * rosterData.maxWeeks, // Convert PPG back to total points for display
                    ppg: team.totalPPG,
                    isFantasyTeam: false,
                    conference: team.teamInfo.conference,
                    division: team.teamInfo.division,
                    teamRoster: team.optimalRoster
                });
            }
        });
        
        // Sort by PPG (highest first)
        allTeams.sort((a, b) => b.ppg - a.ppg);
        
        // Add ranking to each team
        allTeams.forEach((team, index) => {
            team.rank = index + 1;
        });
        
        // Special case for 2021 season - filter out team with rank 48
        if (currentSeason === '2021') {
            // Remove any team that would be ranked 48
            const indexToRemove = allTeams.findIndex(team => team.rank === 48);
            if (indexToRemove >= 0) {
                console.log(`Removing team ranked 48 for 2021 season: ${allTeams[indexToRemove].name}`);
                allTeams.splice(indexToRemove, 1);
            }
        }
        
        console.log(`Ranking ${allTeams.length} teams by PPG`);
        
        // Render the ranked teams
        renderRankedTeams(allTeams, container);
    }
    
    // Create optimal roster based on available players and roster rules
    function createOptimalRoster(playersByPosition) {
        if (!rosterRules) {
            console.warn("No roster rules available");
            return {};
        }
        
        const optimalRoster = {};
        
        // Add required positions first
        Object.keys(rosterRules).forEach(position => {
            // Skip FLEX positions and metadata for now
            if (position === 'FLEX' || position === 'FLEX Eligible' || 
                position === 'total_slots' || position === 'BE' || position === 'IR') return;
            
            const count = rosterRules[position];
            
            if (!optimalRoster[position]) {
                optimalRoster[position] = [];
            }
            
            // Get players for this position
            const positionPlayers = playersByPosition[position] || [];
            
            // Take the top N players for this position
            const topPlayers = positionPlayers.slice(0, count);
            
            // Add to optimal roster
            optimalRoster[position] = topPlayers;
        });
        
        // Handle FLEX positions if specified
        if (rosterRules.FLEX && rosterRules['FLEX Eligible']) {
            const flexCount = rosterRules.FLEX;
            const eligiblePositions = rosterRules['FLEX Eligible'];
            
            // Create a pool of all eligible players not already in starting lineup
            const flexCandidates = [];
            
            // Check if eligiblePositions is an array before using forEach
            if (Array.isArray(eligiblePositions)) {
                eligiblePositions.forEach(position => {
                    // Get players for this position
                    const positionPlayers = playersByPosition[position] || [];
                    
                    // Skip players already in starting lineup
                    const startingCount = optimalRoster[position] ? optimalRoster[position].length : 0;
                    const benchPlayers = positionPlayers.slice(startingCount);
                    
                    flexCandidates.push(...benchPlayers);
                });
            } else if (typeof eligiblePositions === 'string') {
                // If it's a string, split by comma
                const positions = eligiblePositions.split(',').map(p => p.trim());
                positions.forEach(position => {
                    // Get players for this position
                    const positionPlayers = playersByPosition[position] || [];
                    
                    // Skip players already in starting lineup
                    const startingCount = optimalRoster[position] ? optimalRoster[position].length : 0;
                    const benchPlayers = positionPlayers.slice(startingCount);
                    
                    flexCandidates.push(...benchPlayers);
                });
            }
            
            // Sort by PPG
            flexCandidates.sort((a, b) => b.ppg - a.ppg);
            
            // Take top N for FLEX
            const flexPlayers = flexCandidates.slice(0, flexCount);
            
            // Add to optimal roster
            optimalRoster.FLEX = flexPlayers;
        }
        
        return optimalRoster;
    }
    
    // Render ranked teams
    function renderRankedTeams(teams, container) {
        // Create table controls
        const tableControls = document.createElement('div');
        tableControls.className = 'table-controls';
        
        tableControls.innerHTML = `
            <div class="table-filters">
                <button class="filter-btn active" data-filter="all">All Teams</button>
                <button class="filter-btn" data-filter="nfl">NFL Teams</button>
                <button class="filter-btn" data-filter="fantasy">Fantasy Teams</button>
            </div>
            <div class="table-search">
                <span class="search-icon">🔍</span>
                <input type="text" class="search-input" placeholder="Search teams...">
            </div>
        `;
        
        // Create rank table
        const rankTableDiv = document.createElement('div');
        rankTableDiv.className = 'rank-table-container';
        
        const rankTable = document.createElement('table');
        rankTable.className = 'rank-table';
        
        // Create header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th class="rank-column sortable" data-sort="rank">Rank</th>
                <th class="team-logo-column"></th>
                <th class="team-info-column sortable" data-sort="name">Team</th>
                <th class="stats-cell">Offense</th>
                <th class="stats-cell">Defense</th>
                <th class="top-player-cell">Top Player</th>
                <th class="points-cell sortable" data-sort="ppg">PPG</th>
                <th class="type-cell">Type</th>
            </tr>
        `;
        rankTable.appendChild(thead);
        
        // Create body
        const tbody = document.createElement('tbody');
        
        teams.forEach(team => {
            const row = document.createElement('tr');
            // Apply different class based on team type
            row.className = team.isFantasyTeam ? 'fantasy-team' : 'nfl-team';
            row.setAttribute('data-team', team.isFantasyTeam ? team.displayName : team.name);
            row.setAttribute('data-type', team.isFantasyTeam ? 'fantasy' : 'nfl');
            
            if (!team.isFantasyTeam) {
                row.setAttribute('data-conference', team.conference);
                row.setAttribute('data-division', team.division);
            }
            
            if (!team.isFantasyTeam && team.abbr) {
                row.setAttribute('data-abbr', team.abbr);
            }
            
            // Add performance tier indicator
            const tierClass = getTierClass(team.rank);
            const tierElement = document.createElement('div');
            tierElement.className = `tier-indicator ${tierClass}`;
            row.appendChild(tierElement);
            
            // Prepare logo HTML
            let logoHtml = '';
            
            if (!team.isFantasyTeam && team.abbr) {
                logoHtml = `
                    <img src="../assets/nfl-logos/${team.abbr.toLowerCase()}.png" 
                        onerror="this.src='../assets/nfl-logos/nfl.png'"
                        alt="${team.name}" class="rank-table-logo">
                `;
            } else if (team.isFantasyTeam) {
                // For fantasy teams, check if we have a logo
                const logoSrc = team.fflAbbr ? 
                    `../assets/ffl-logos/${team.fflAbbr.toLowerCase()}.png` : 
                    '../assets/ffl-logos/default.png';
                
                logoHtml = `
                    <img src="${logoSrc}" 
                        onerror="this.src='../assets/ffl-logos/default.png'"
                        alt="${team.owner}" class="rank-table-logo fantasy-logo">
                `;
            }
            
            // Prepare team info HTML
            let teamInfoHtml = '';
            
            if (!team.isFantasyTeam && team.abbr) {
                // Add conference and division badges for NFL teams
                const conferenceClass = `conference-${team.conference.toLowerCase()}`;
                
                teamInfoHtml = `
                    <div class="team-info-container">
                        <span class="team-name-text">${team.name}</span>
                        <div class="team-details">
                            <span class="conference-badge ${conferenceClass}">${team.conference}</span>
                            <span class="division-badge">${team.division}</span>
                        </div>
                    </div>
                `;
            } else if (team.isFantasyTeam) {
                teamInfoHtml = `
                    <div class="team-info-container">
                        <span class="team-name-text">${team.displayName}</span>
                        <div class="team-details">
                            <span>Owner: ${team.owner}</span>
                        </div>
                    </div>
                `;
            }
            
            // Generate offensive and defensive ratings
            const offenseRating = generateRating(team, 'offense');
            const defenseRating = generateRating(team, 'defense');
            
            // Get actual top player with enhanced data
            const topPlayer = generateTopPlayer(team);
            
            // Format position with proper handling of D/ST
            const positionDisplay = topPlayer.position === 'DEF' ? 'D/ST' : topPlayer.position;
            
            // Enhanced player cell with more stats
            const topPlayerHtml = `
                <div class="top-player-container">
                    <img src="../assets/espn-player-images/${topPlayer.id || 'default'}.png" 
                        onerror="this.src='../assets/espn-player-images/default.png'"
                        alt="${topPlayer.name}" class="player-image">
                    <div class="player-details">
                        <span class="player-name">${topPlayer.name}</span>
                        <div class="player-stats">
                            <span class="player-position position-${topPlayer.position}">${positionDisplay}</span>
                            <span class="player-ppg">${topPlayer.ppg}</span>
                        </div>
                    </div>
                </div>
            `;
            
            // Generate trend sparkline
            const trendHtml = generateTrendSparkline(team);
            
            // Format the PPG with trend indicator
            const ppgTrend = getPPGTrend(team);
            const ppgHtml = `
                <div class="points-value">${formatNumber(team.ppg)}</div>
                <div class="points-trend">
                    <span class="trend-${ppgTrend.direction}">${ppgTrend.icon}</span>
                    <span>${ppgTrend.value}</span>
                </div>
                ${trendHtml}
            `;
            
            row.innerHTML = `
                <td class="rank-cell">
                    <div class="rank-badge ${team.isFantasyTeam ? 'fantasy-rank' : 'nfl-rank'}">${team.rank}</div>
                </td>
                <td class="team-logo-cell">${logoHtml}</td>
                <td class="team-info-cell">${teamInfoHtml}</td>
                <td class="stats-cell">
                    <div class="stat-value">${offenseRating.value}</div>
                    <div class="stat-label">Offense</div>
                </td>
                <td class="stats-cell">
                    <div class="stat-value">${defenseRating.value}</div>
                    <div class="stat-label">Defense</div>
                </td>
                <td class="top-player-cell">${topPlayerHtml}</td>
                <td class="points-cell">${ppgHtml}</td>
                <td class="type-cell">
                    <span class="team-type-badge type-${team.isFantasyTeam ? 'fantasy' : 'nfl'}">
                        ${team.isFantasyTeam ? 'Fantasy' : 'NFL'}
                    </span>
                </td>
            `;
            
            // Add click handler to show team details
            row.addEventListener('click', () => {
                if (!team.isFantasyTeam) {
                    showTeamDetails(team);
                } else {
                    showFantasyTeamDetails(team);
                }
            });
            
            tbody.appendChild(row);
        });
        
        rankTable.appendChild(tbody);
        rankTableDiv.appendChild(rankTable);
        
        // Add to container
        container.appendChild(tableControls);
        container.appendChild(rankTableDiv);
        
        // Add event listeners for filtering
        const filterButtons = tableControls.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Update active button
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Filter rows
                const filter = button.getAttribute('data-filter');
                const rows = tbody.querySelectorAll('tr');
                
                rows.forEach(row => {
                    const type = row.getAttribute('data-type');
                    if (filter === 'all' || filter === type) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            });
        });
        
        // Add event listener for search
        const searchInput = tableControls.querySelector('.search-input');
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const rows = tbody.querySelectorAll('tr');
            
            rows.forEach(row => {
                const teamName = row.getAttribute('data-team').toLowerCase();
                if (teamName.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
        
        // Add event listeners for sorting
        const sortableHeaders = thead.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const sort = header.getAttribute('data-sort');
                const isAsc = header.classList.contains('asc');
                
                // Update header classes
                sortableHeaders.forEach(h => {
                    h.classList.remove('asc', 'desc');
                });
                
                header.classList.add(isAsc ? 'desc' : 'asc');
                
                // Sort rows
                const rows = Array.from(tbody.querySelectorAll('tr'));
                rows.sort((a, b) => {
                    let valueA, valueB;
                    
                    if (sort === 'rank') {
                        valueA = parseInt(a.querySelector('.rank-badge').textContent);
                        valueB = parseInt(b.querySelector('.rank-badge').textContent);
                    } else if (sort === 'name') {
                        valueA = a.getAttribute('data-team');
                        valueB = b.getAttribute('data-team');
                        return isAsc ? valueB.localeCompare(valueA) : valueA.localeCompare(valueB);
                    } else if (sort === 'ppg') {
                        valueA = parseFloat(a.querySelector('.points-value').textContent);
                        valueB = parseFloat(b.querySelector('.points-value').textContent);
                    } else if (sort === 'record') {
                        const recordA = a.querySelector('.record-display').textContent.split('-');
                        const recordB = b.querySelector('.record-display').textContent.split('-');
                        valueA = parseInt(recordA[0]);
                        valueB = parseInt(recordB[0]);
                    }
                    
                    return isAsc ? valueB - valueA : valueA - valueB;
                });
                
                // Reappend sorted rows
                rows.forEach(row => tbody.appendChild(row));
            });
        });
        
        // Add team details container and backdrop
        const modalBackdrop = document.createElement('div');
        modalBackdrop.id = 'modalBackdrop';
        modalBackdrop.className = 'modal-backdrop';
        document.body.appendChild(modalBackdrop);
        
        const teamDetailsContainer = document.createElement('div');
        teamDetailsContainer.id = 'teamDetailsContainer';
        teamDetailsContainer.className = 'team-details-container';
        document.body.appendChild(teamDetailsContainer);
        
        // Add event listener to close modal when clicking on backdrop
        modalBackdrop.addEventListener('click', closeTeamDetails);
        
        // Add event listener to close modal with ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeTeamDetails();
            }
        });
    }
    
    // Helper functions for enhanced table data
    function getTierClass(rank) {
        if (rank <= 6) return 'tier-s';
        if (rank <= 12) return 'tier-a';
        if (rank <= 24) return 'tier-b';
        if (rank <= 36) return 'tier-c';
        return 'tier-d';
    }

    function generateSimulatedRecord(team) {
        // Generate a plausible record based on team's PPG
        const totalGames = team.isFantasyTeam ? 14 : 17;
        const winPercentage = Math.min(0.9, Math.max(0.1, (50 - team.rank) / 50));
        
        let wins = Math.round(totalGames * winPercentage);
        const ties = Math.random() > 0.9 ? 1 : 0; // Rarely add a tie
        const losses = totalGames - wins - ties;
        
        return { wins, losses, ties };
    }

    function generateStandingInfo(team) {
        if (team.isFantasyTeam) {
            const playoffStatus = team.rank <= 6 ? 'Playoff Bound' : 'Out of Playoffs';
            return playoffStatus;
        } else {
            // For NFL teams, show division standing
            const divRank = (team.rank % 4) + 1;
            return `${divRank}${getOrdinalSuffix(divRank)} in Division`;
        }
    }

    function getOrdinalSuffix(num) {
        const j = num % 10, k = num % 100;
        if (j == 1 && k != 11) return 'st';
        if (j == 2 && k != 12) return 'nd';
        if (j == 3 && k != 13) return 'rd';
        return 'th';
    }

    function generateRating(team, type) {
        // Generate a rating from A+ to F based on team rank and type
        const baseScore = 100 - team.rank;
        const variance = type === 'offense' ? 10 : -10; // Offense and defense vary
        const score = Math.min(100, Math.max(0, baseScore + variance + (Math.random() * 20 - 10)));
        
        let grade;
        if (score >= 90) grade = 'A+';
        else if (score >= 80) grade = 'A';
        else if (score >= 75) grade = 'A-';
        else if (score >= 70) grade = 'B+';
        else if (score >= 65) grade = 'B';
        else if (score >= 60) grade = 'B-';
        else if (score >= 55) grade = 'C+';
        else if (score >= 50) grade = 'C';
        else if (score >= 45) grade = 'C-';
        else if (score >= 40) grade = 'D+';
        else if (score >= 35) grade = 'D';
        else if (score >= 30) grade = 'D-';
        else grade = 'F';
        
        return { value: grade, score: score };
    }

    function generateTopPlayer(team) {
        // Use real data for NFL teams when available
        if (!team.isFantasyTeam && team.abbr) {
            if (team.teamRoster && Object.keys(team.teamRoster).length > 0) {
                // Find the actual top player from the team roster
                let topPlayer = null;
                let highestPPG = 0;
                
                // Check all positions for the player with highest PPG
                for (const position in team.teamRoster) {
                    if (team.teamRoster[position] && team.teamRoster[position].length > 0) {
                        team.teamRoster[position].forEach(player => {
                            if (player.ppg > highestPPG) {
                                highestPPG = player.ppg;
                                topPlayer = player;
                            }
                        });
                    }
                }
                
                if (topPlayer) {
                    return {
                        id: topPlayer.id,
                        name: topPlayer.name,
                        position: topPlayer.position,
                        ppg: topPlayer.ppg.toFixed(1)
                    };
                }
            } else {
                // Find real top player from roster data if available
                const teamTopPlayer = findTopPlayerForNFLTeam(team.abbr);
                if (teamTopPlayer) {
                    return teamTopPlayer;
                }
            }
        } 
        // For fantasy teams, also try to use real data
        else if (team.isFantasyTeam && team.owner) {
            // Find top player for fantasy team from roster data
            const fantasyTopPlayer = findTopPlayerForFantasyTeam(team.owner);
            if (fantasyTopPlayer) {
                return fantasyTopPlayer;
            }
        }
        
        // Fallback to simulation if no real data is available
        const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
        const position = positions[Math.floor(Math.random() * positions.length)];
        
        const id = Math.floor(Math.random() * 1000) + 1000;
        const name = getRandomPlayerName(position);
        
        return { id, name, position, ppg: (Math.random() * 15 + 5).toFixed(1) };
    }

    function findTopPlayerForNFLTeam(teamAbbr) {
        if (!rosterData || !rosterData.weeklyData || rosterData.weeklyData.length === 0) {
            return null;
        }
        
        // Map to track player stats across weeks
        const playerStatsMap = new Map();
        
        // Process each week's data to find all players on this team
        rosterData.weeklyData.forEach(weekData => {
            if (!weekData || !weekData.teams) return;
            
            // Process each fantasy team's roster
            weekData.teams.forEach(fantasyTeam => {
                if (!fantasyTeam.roster || !Array.isArray(fantasyTeam.roster)) return;
                
                // Find players on the specified NFL team
                const teamPlayers = fantasyTeam.roster.filter(player => 
                    player.proTeam === teamAbbr && 
                    player.position && 
                    player.actualPoints !== null && 
                    player.actualPoints !== undefined
                );
                
                // Process each player
                teamPlayers.forEach(player => {
                    const playerId = player.playerId;
                    const actualPoints = parseFloat(player.actualPoints) || 0;
                    
                    // Initialize or update player in the map
                    if (!playerStatsMap.has(playerId)) {
                        playerStatsMap.set(playerId, {
                            id: playerId,
                            name: player.name,
                            position: player.position,
                            totalPoints: 0,
                            weeksPlayed: 0
                        });
                    }
                    
                    // Update player stats
                    const playerStats = playerStatsMap.get(playerId);
                    
                    // Only count positive points
                    if (actualPoints > 0) {
                        playerStats.totalPoints += actualPoints;
                        playerStats.weeksPlayed++;
                    }
                });
            });
        });
        
        // Convert map to array and calculate PPG
        const players = Array.from(playerStatsMap.values())
            .filter(player => player.weeksPlayed > 0)
            .map(player => {
                player.ppg = player.totalPoints / player.weeksPlayed;
                return player;
            });
        
        // Sort by PPG and get the top player
        if (players.length > 0) {
            players.sort((a, b) => b.ppg - a.ppg);
            const topPlayer = players[0];
            
            return {
                id: topPlayer.id,
                name: topPlayer.name,
                position: topPlayer.position,
                ppg: topPlayer.ppg.toFixed(1)
            };
        }
        
        return null;
    }

    function findTopPlayerForFantasyTeam(ownerName) {
        if (!rosterData || !rosterData.weeklyData || rosterData.weeklyData.length === 0 || !ownerName) {
            return null;
        }
        
        // Map to track player stats across weeks
        const playerStatsMap = new Map();
        
        // Process each week's data to find the team's players
        rosterData.weeklyData.forEach(weekData => {
            if (!weekData || !weekData.teams) return;
            
            // Find the fantasy team for this owner
            const fantasyTeam = weekData.teams.find(team => 
                team.owner && team.owner.toLowerCase() === ownerName.toLowerCase()
            );
            
            if (!fantasyTeam || !fantasyTeam.roster || !Array.isArray(fantasyTeam.roster)) return;
            
            // Process each player in the team's roster
            fantasyTeam.roster.forEach(player => {
                // Skip players with invalid points
                if (player.actualPoints === null || player.actualPoints === undefined) {
                    return;
                }
                
                const playerId = player.playerId;
                const actualPoints = parseFloat(player.actualPoints) || 0;
                const isStarting = player.slotPosition !== "BE" && player.slotPosition !== "IR";
                
                // Skip bench players for top player calculation
                if (!isStarting) return;
                
                // Initialize or update player in the map
                if (!playerStatsMap.has(playerId)) {
                    playerStatsMap.set(playerId, {
                        id: playerId,
                        name: player.name,
                        position: player.position,
                        totalPoints: 0,
                        weeksPlayed: 0
                    });
                }
                
                // Update player stats
                const playerStats = playerStatsMap.get(playerId);
                
                // Only count positive points
                if (actualPoints > 0) {
                    playerStats.totalPoints += actualPoints;
                    playerStats.weeksPlayed++;
                }
            });
        });
        
        // Convert map to array and calculate PPG
        const players = Array.from(playerStatsMap.values())
            .filter(player => player.weeksPlayed > 0)
            .map(player => {
                player.ppg = player.totalPoints / player.weeksPlayed;
                return player;
            });
        
        // Sort by PPG and get the top player
        if (players.length > 0) {
            players.sort((a, b) => b.ppg - a.ppg);
            const topPlayer = players[0];
            
            return {
                id: topPlayer.id,
                name: topPlayer.name,
                position: topPlayer.position,
                ppg: topPlayer.ppg.toFixed(1)
            };
        }
        
        return null;
    }

    function getRandomPlayerName(position) {
        const firstNames = ['Tom', 'Patrick', 'Aaron', 'Josh', 'Lamar', 'Justin', 'Derrick', 'Davante', 'Travis', 'Tyreek'];
        const lastNames = ['Brady', 'Mahomes', 'Rodgers', 'Allen', 'Jackson', 'Jefferson', 'Henry', 'Adams', 'Kelce', 'Hill'];
        
        return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    }

    function getPPGTrend(team) {
        // Check if we have real data to calculate trend
        let weeklyData = [];
        
        if (team.isFantasyTeam && team.weeklyPoints) {
            weeklyData = team.weeklyPoints;
        } else if (!team.isFantasyTeam && team.teamRoster) {
            // For NFL teams, keep existing logic
        }
        
        // If we have at least 2 weeks of data with valid points, calculate real trend
        if (weeklyData && weeklyData.length >= 2) {
            // Get only valid point values (filter out zeros, nulls, etc)
            const validPoints = weeklyData.filter(points => points > 0);
            
            if (validPoints.length >= 2) {
                // Get last two weeks with data
                const lastWeek = validPoints[validPoints.length - 1];
                const prevWeek = validPoints[validPoints.length - 2];
                const difference = lastWeek - prevWeek;
                
                let direction, icon, value;
                if (Math.abs(difference) < 2) {
                    direction = 'neutral';
                    icon = '→';
                    value = '0.0';
                } else if (difference > 0) {
                    direction = 'up';
                    icon = '↑';
                    value = `+${difference.toFixed(1)}`;
                } else {
                    direction = 'down';
                    icon = '↓';
                    value = `${difference.toFixed(1)}`;
                }
                
                return { direction, icon, value };
            }
        }
        
        // Fallback to random trend if no real data available
        const directions = ['up', 'down', 'neutral'];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        
        let icon, value;
        switch (direction) {
            case 'up':
                icon = '↑';
                value = `+${(Math.random() * 3).toFixed(1)}`;
                break;
            case 'down':
                icon = '↓';
                value = `-${(Math.random() * 3).toFixed(1)}`;
                break;
            default:
                icon = '→';
                value = '0.0';
        }
        
        return { direction, icon, value };
    }

    function generateTrendSparkline(team) {
        // Get the appropriate weekly data based on team type
        let weeklyData = [];
        
        if (team.isFantasyTeam && team.weeklyPoints) {
            weeklyData = team.weeklyPoints;
        } else if (!team.isFantasyTeam && team.teamRoster) {
            // For NFL teams, we need to collect weekly points from player stats
            const players = [];
            
            // Get all players from all positions in the team roster
            for (const position in team.teamRoster) {
                if (team.teamRoster[position] && Array.isArray(team.teamRoster[position])) {
                    players.push(...team.teamRoster[position]);
                }
            }
            
            // If we have player data, aggregate their weekly points
            if (players.length > 0) {
                const totalWeeks = players[0].weeklyPoints ? players[0].weeklyPoints.length : 0;
                
                // Initialize array with zeros for each week
                weeklyData = new Array(totalWeeks).fill(0);
                
                // Add up points for each week
                players.forEach(player => {
                    if (player.weeklyPoints) {
                        player.weeklyPoints.forEach((points, weekIndex) => {
                            weeklyData[weekIndex] += points || 0;
                        });
                    }
                });
            }
        }
        
        // If no real data is available, return empty sparkline
        if (!weeklyData || weeklyData.length === 0 || !weeklyData.some(pts => pts > 0)) {
            return '<div class="sparkline-container"><div class="sparkline"><div class="no-data">No data</div></div></div>';
        }
        
        // Get the last 5 weeks of data (up to maxBars)
        const maxBars = 5;
        const recentWeeks = weeklyData.slice(-maxBars);
        
        // Find the max value for scaling
        const maxValue = Math.max(...recentWeeks.filter(val => !isNaN(val) && val !== null && val > 0));
        const bars = [];
        
        // Create bars from the actual data
        recentWeeks.forEach((points, index) => {
            if (isNaN(points) || points === null || points <= 0) {
                // Skip weeks with no valid data
                return;
            }
            
            // Scale height based on points (min 5px, max 20px)
            let height = 5; // Minimum height
            if (maxValue > 0) {
                height = Math.max(5, Math.min(20, (points / maxValue) * 20));
            }
            
            // Determine result based on point value compared to max
            let result = 'neutral';
            if (points >= (maxValue * 0.7)) {
                result = 'win'; // Good performance
            } else if (points <= (maxValue * 0.3)) {
                result = 'loss'; // Poor performance
            }
            
            // Format points to 1 decimal place
            const formattedPoints = parseFloat(points).toFixed(1);
            
            bars.push(`<div class="sparkline-bar ${result}" style="height:${height}px;" data-points="${formattedPoints}" data-week="${index + 1}"></div>`);
        });
        
        // If we have no bars, show a no data message
        if (bars.length === 0) {
            return '<div class="sparkline-container"><div class="sparkline"><div class="no-data">No data</div></div></div>';
        }
        
        return `<div class="sparkline-container"><div class="sparkline">${bars.join('')}</div></div>`;
    }

    // Show team details when clicking on a team
    function showTeamDetails(team) {
        const container = document.getElementById('teamDetailsContainer');
        const backdrop = document.getElementById('modalBackdrop');
        if (!container || !backdrop) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Create close button
        const backButton = document.createElement('button');
        backButton.className = 'back-button';
        backButton.innerHTML = '&times;';
        backButton.setAttribute('title', 'Close');
        backButton.addEventListener('click', closeTeamDetails);
        
        // Create team header
        const teamHeader = document.createElement('div');
        teamHeader.className = 'team-detail-header';
        
        teamHeader.innerHTML = `
            <div class="team-detail-logo-container">
                <img src="../assets/nfl-logos/${team.abbr.toLowerCase()}.png" 
                    onerror="this.src='../assets/nfl-logos/nfl.png'"
                    alt="${team.name}" class="team-detail-logo">
            </div>
            <div class="team-detail-info">
                <h3 class="team-detail-name">${team.name}</h3>
                <div class="team-detail-conference">${team.conference} ${team.division}</div>
                <div class="team-detail-rank">Rank: #${team.rank}</div>
                <div class="team-detail-points">PPG: ${formatNumber(team.ppg)}</div>
                <div class="team-detail-points">Total Points: ${formatNumber(team.totalPoints)}</div>
            </div>
        `;
        
        // Create roster section
        const rosterSection = document.createElement('div');
        rosterSection.className = 'team-roster-section';
        
        const rosterTitle = document.createElement('h4');
        rosterTitle.className = 'roster-title';
        rosterTitle.textContent = 'Optimal Fantasy Roster';
        rosterSection.appendChild(rosterTitle);
        
        // If we have real roster data, use it otherwise show a message
        if (team.teamRoster && Object.keys(team.teamRoster).length > 0) {
            // ...existing code...
        } else {
            // Try to find actual top players for this team
            const topPlayers = findTopPlayersForNFLTeam(team.abbr);
            
            if (topPlayers && topPlayers.length > 0) {
                // Create a simple roster display with the top players
                const rosterGrid = document.createElement('div');
                rosterGrid.className = 'team-top-players-grid';
                
                // Group players by position
                const playersByPosition = {};
                topPlayers.forEach(player => {
                    const position = player.position;
                    if (!playersByPosition[position]) {
                        playersByPosition[position] = [];
                    }
                    playersByPosition[position].push(player);
                });
                
                // Get positions in a specific order
                const positionOrder = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'D/ST'];
                
                positionOrder.forEach(position => {
                    if (playersByPosition[position] && playersByPosition[position].length > 0) {
                        // Create position group
                        const positionGroup = document.createElement('div');
                        positionGroup.className = 'position-group';
                        
                        const positionHeader = document.createElement('div');
                        const displayPosition = position === 'DEF' ? 'D/ST' : position;
                        positionHeader.className = `position-header ${displayPosition}`;
                        positionHeader.textContent = displayPosition;
                        positionGroup.appendChild(positionHeader);
                        
                        // Add players sorted by PPG
                        playersByPosition[position].sort((a, b) => b.ppg - a.ppg);
                        const topPositionPlayers = playersByPosition[position].slice(0, 3); // Show top 3 per position
                        
                        topPositionPlayers.forEach(player => {
                            const playerCard = document.createElement('div');
                            playerCard.className = 'player-card';
                            
                            const ppgValue = parseFloat(player.ppg);
                            let ppgCategory = 'low';
                            if (ppgValue >= 15) {
                                ppgCategory = 'high';
                            } else if (ppgValue >= 9) {
                                ppgCategory = 'medium';
                            }
                            
                            playerCard.innerHTML = `
                                <div class="player-image-container">
                                    <img src="../assets/espn-player-images/${player.id || 'default'}.png" 
                                        onerror="this.src='../assets/espn-player-images/default.png'"
                                        alt="${player.name}" class="player-image">
                                </div>
                                <div class="player-details-container">
                                    <div class="player-detail-name">${player.name}</div>
                                    <div class="player-detail-points" data-ppg="${ppgCategory}">${player.ppg}</div>
                                    <div class="player-detail-team">${player.weeksPlayed || 0} games played</div>
                                </div>
                            `;
                            
                            positionGroup.appendChild(playerCard);
                        });
                        
                        rosterGrid.appendChild(positionGroup);
                    }
                });
                
                rosterSection.appendChild(rosterGrid);
            } else {
                // No player data available
                const noDataMessage = document.createElement('div');
                noDataMessage.className = 'no-data-message';
                noDataMessage.textContent = 'Detailed player data not available for this team.';
                rosterSection.appendChild(noDataMessage);
            }
        }
        
        // Add all elements to container
        container.appendChild(backButton);
        container.appendChild(teamHeader);
        container.appendChild(rosterSection);
        
        // Show container and backdrop
        container.style.display = 'block';
        backdrop.style.display = 'block';
        
        // Prevent body scrolling when modal is open
        document.body.style.overflow = 'hidden';
    }

    function showFantasyTeamDetails(team) {
        const container = document.getElementById('teamDetailsContainer');
        const backdrop = document.getElementById('modalBackdrop');
        if (!container || !backdrop) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Create close button
        const backButton = document.createElement('button');
        backButton.className = 'back-button';
        backButton.innerHTML = '&times;';
        backButton.setAttribute('title', 'Close');
        backButton.addEventListener('click', closeTeamDetails);
        
        // Create team header
        const teamHeader = document.createElement('div');
        teamHeader.className = 'team-detail-header';
        
        // Display the team's FFL logo if available
        const logoSrc = team.fflAbbr ? 
            `../assets/ffl-logos/${team.fflAbbr.toLowerCase()}.png` : 
            '../assets/ffl-logos/default.png';
        
        teamHeader.innerHTML = `
            <div class="team-detail-logo-container fantasy-logo-container">
                <img src="${logoSrc}" 
                    onerror="this.src='../assets/ffl-logos/default.png'"
                    alt="${team.owner}" class="team-detail-logo">
            </div>
            <div class="team-detail-info">
                <h3 class="team-detail-name">${team.displayName || team.name}</h3>
                <div class="team-detail-conference">${team.owner}'s Fantasy Team</div>
                <div class="team-detail-rank">Rank: #${team.rank}</div>
                <div class="team-detail-points">PPG: ${formatNumber(team.ppg)}</div>
                <div class="team-detail-points">Total Points: ${formatNumber(team.totalPoints)}</div>
            </div>
        `;
        
        // Find top players for this fantasy team
        const topPlayers = findTopPlayersForFantasyTeam(team.owner);
        
        // Create roster section
        const rosterSection = document.createElement('div');
        rosterSection.className = 'team-roster-section';
        
        const rosterTitle = document.createElement('h4');
        rosterTitle.className = 'roster-title';
        rosterTitle.textContent = 'Top Fantasy Players';
        rosterSection.appendChild(rosterTitle);
        
        if (topPlayers && topPlayers.length > 0) {
            // Create a roster display with the top players
            const rosterGrid = document.createElement('div');
            rosterGrid.className = 'team-top-players-grid';
            
            // Group players by position
            const playersByPosition = {};
            topPlayers.forEach(player => {
                const position = player.position;
                if (!playersByPosition[position]) {
                    playersByPosition[position] = [];
                }
                playersByPosition[position].push(player);
            });
            
            // Get positions in a specific order
            const positionOrder = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'D/ST'];
            
            positionOrder.forEach(position => {
                if (playersByPosition[position] && playersByPosition[position].length > 0) {
                    // Create position group
                    const positionGroup = document.createElement('div');
                    positionGroup.className = 'position-group';
                    
                    const positionHeader = document.createElement('div');
                    const displayPosition = position === 'DEF' ? 'D/ST' : position;
                    positionHeader.className = `position-header ${displayPosition}`;
                    positionHeader.textContent = displayPosition;
                    positionGroup.appendChild(positionHeader);
                    
                    // Add players sorted by PPG
                    playersByPosition[position].sort((a, b) => b.ppg - a.ppg);
                    const topPositionPlayers = playersByPosition[position].slice(0, 3); // Show top 3 per position
                    
                    topPositionPlayers.forEach(player => {
                        const playerCard = document.createElement('div');
                        playerCard.className = 'player-card';
                        
                        const ppgValue = parseFloat(player.ppg);
                        let ppgCategory = 'low';
                        if (ppgValue >= 15) {
                            ppgCategory = 'high';
                        } else if (ppgValue >= 9) {
                            ppgCategory = 'medium';
                        }
                        
                        playerCard.innerHTML = `
                            <div class="player-image-container">
                                <img src="../assets/espn-player-images/${player.id || 'default'}.png" 
                                    onerror="this.src='../assets/espn-player-images/default.png'"
                                    alt="${player.name}" class="player-image">
                            </div>
                            <div class="player-details-container">
                                <div class="player-detail-name">${player.name}</div>
                                <div class="player-detail-points" data-ppg="${ppgCategory}">${player.ppg}</div>
                                <div class="player-detail-team">${player.weeksPlayed || 0} games played</div>
                            </div>
                        `;
                        
                        positionGroup.appendChild(playerCard);
                    });
                    
                    rosterGrid.appendChild(positionGroup);
                }
            });
            
            rosterSection.appendChild(rosterGrid);
        } else {
            // No player data available
            const noDataMessage = document.createElement('div');
            noDataMessage.className = 'no-data-message';
            noDataMessage.textContent = 'Detailed player data not available for this team.';
            rosterSection.appendChild(noDataMessage);
        }
        
        // Add all elements to container
        container.appendChild(backButton);
        container.appendChild(teamHeader);
        container.appendChild(rosterSection);
        
        // Show container and backdrop
        container.style.display = 'block';
        backdrop.style.display = 'block';
        
        // Prevent body scrolling when modal is open
        document.body.style.overflow = 'hidden';
    }

    function findTopPlayersForNFLTeam(teamAbbr) {
        if (!rosterData || !rosterData.weeklyData || rosterData.weeklyData.length === 0) {
            return [];
        }
        
        // Map to track player stats across weeks
        const playerStatsMap = new Map();
        
        // Process each week's data to find all players on this team
        rosterData.weeklyData.forEach(weekData => {
            if (!weekData || !weekData.teams) return;
            
            // Process each fantasy team's roster
            weekData.teams.forEach(fantasyTeam => {
                if (!fantasyTeam.roster || !Array.isArray(fantasyTeam.roster)) return;
                
                // Find players on the specified NFL team
                const teamPlayers = fantasyTeam.roster.filter(player => 
                    player.proTeam === teamAbbr && 
                    player.position && 
                    player.actualPoints !== null && 
                    player.actualPoints !== undefined
                );
                
                // Process each player
                teamPlayers.forEach(player => {
                    const playerId = player.playerId;
                    const actualPoints = parseFloat(player.actualPoints) || 0;
                    
                    // Initialize or update player in the map
                    if (!playerStatsMap.has(playerId)) {
                        playerStatsMap.set(playerId, {
                            id: playerId,
                            name: player.name,
                            position: player.position,
                            totalPoints: 0,
                            weeksPlayed: 0
                        });
                    }
                    
                    // Update player stats
                    const playerStats = playerStatsMap.get(playerId);
                    
                    // Only count positive points
                    if (actualPoints > 0) {
                        playerStats.totalPoints += actualPoints;
                        playerStats.weeksPlayed++;
                    }
                });
            });
        });
        
        // Convert map to array and calculate PPG
        const players = Array.from(playerStatsMap.values())
            .filter(player => player.weeksPlayed > 0)
            .map(player => {
                player.ppg = player.totalPoints / player.weeksPlayed;
                return player;
            });
        
        // Sort by PPG
        players.sort((a, b) => b.ppg - a.ppg);
        
        // Format players for display
        return players.map(player => ({
            id: player.id,
            name: player.name,
            position: player.position,
            ppg: player.ppg.toFixed(1),
            weeksPlayed: player.weeksPlayed
        }));
    }

    function findTopPlayersForFantasyTeam(ownerName) {
        if (!rosterData || !rosterData.weeklyData || rosterData.weeklyData.length === 0 || !ownerName) {
            return [];
        }
        
        // Map to track player stats across weeks
        const playerStatsMap = new Map();
        
        // Process each week's data
        rosterData.weeklyData.forEach(weekData => {
            if (!weekData || !weekData.teams) return;
            
            // Find the fantasy team for this owner
            const fantasyTeam = weekData.teams.find(team => 
                team.owner && team.owner.toLowerCase() === ownerName.toLowerCase()
            );
            
            if (!fantasyTeam || !fantasyTeam.roster || !Array.isArray(fantasyTeam.roster)) return;
            
            // Process each player in the team's roster
            fantasyTeam.roster.forEach(player => {
                // Skip players with invalid points
                if (player.actualPoints === null || player.actualPoints === undefined) {
                    return;
                }
                
                const playerId = player.playerId;
                const actualPoints = parseFloat(player.actualPoints) || 0;
                const isStarting = player.slotPosition !== "BE" && player.slotPosition !== "IR";
                
                // Initialize or update player in the map
                if (!playerStatsMap.has(playerId)) {
                    playerStatsMap.set(playerId, {
                        id: playerId,
                        name: player.name,
                        position: player.position,
                        nflTeam: player.proTeam,
                        totalPoints: 0,
                        startingPoints: 0,
                        weeksPlayed: 0,
                        weeksStarted: 0,
                        startingPositions: new Set()
                    });
                }
                
                // Update player stats
                const playerStats = playerStatsMap.get(playerId);
                
                // Only count positive points
                if (actualPoints > 0) {
                    playerStats.totalPoints += actualPoints;
                    playerStats.weeksPlayed++;
                    
                    // Track starting position stats
                    if (isStarting) {
                        playerStats.startingPoints += actualPoints;
                        playerStats.weeksStarted++;
                        playerStats.startingPositions.add(player.slotPosition);
                    }
                }
            });
        });
        
        // Convert map to array and calculate PPG
        const players = Array.from(playerStatsMap.values())
            .filter(player => player.weeksPlayed > 0)
            .map(player => {
                // Calculate PPG (prefer starting PPG if available, otherwise use total)
                if (player.weeksStarted > 0) {
                    player.ppg = player.startingPoints / player.weeksStarted;
                } else {
                    player.ppg = player.totalPoints / player.weeksPlayed;
                }
                
                // Convert Set to Array for display
                player.positions = Array.from(player.startingPositions);
                
                return player;
            });
        
        // Sort by PPG
        players.sort((a, b) => b.ppg - a.ppg);
        
        // Format players for display
        return players.map(player => ({
            id: player.id,
            name: player.name,
            position: player.position,
            nflTeam: player.nflTeam,
            ppg: player.ppg.toFixed(1),
            weeksPlayed: player.weeksPlayed,
            weeksStarted: player.weeksStarted
        }));
    }
    
    // Close team details modal
    function closeTeamDetails() {
        const container = document.getElementById('teamDetailsContainer');
        const backdrop = document.getElementById('modalBackdrop');
        if (container) container.style.display = 'none';
        if (backdrop) backdrop.style.display = 'none';
        
        // Restore body scrolling
        document.body.style.overflow = '';
    }
    
    // Helper function to render "no data" message
    function renderNoData(message) {
        const container = document.getElementById('nflTeamsContent');
        if (container) {
            container.innerHTML = `
                <div class="no-teams-message">
                    <p>${message}</p>
                </div>
            `;
        }
    }
    
    // Helper function to format number
    function formatNumber(num, decimals = 1) {
        if (isNaN(num) || num === undefined || num === null) {
            return "0.0";
        }
        return parseFloat(num).toFixed(decimals);
    }
    
    // Public API
    return {
        load: function(data, season) {
            load(data, season || window.currentSeason);
            // Set up listener for season changes
            listenForSeasonChanges();
        }
    };
})();
