document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const playerSearchInput = document.getElementById('player-search');
    const positionFilter = document.getElementById('position-filter');
    const teamFilter = document.getElementById('team-filter');
    const statusFilter = document.getElementById('status-filter');
    const playerResults = document.getElementById('player-results');
    const resultsCount = document.querySelector('.results-count');
    const compareButton = document.getElementById('compare-button');
    const selectedCountSpan = document.getElementById('selected-count');
    
    // Compare functionality
    let selectedPlayers = new Set();
    const maxSelectedPlayers = 6;
    
    // Player data from JSON files
    let allPlayers = [];
    let activePlayersSet = new Set(); // Store active player IDs
    
    // Pagination variables
    let currentPage = 1;
    const playersPerPage = 21;
    let filteredPlayers = [];
    
    // Sample NFL team data
    const nflTeams = [
        { code: 'ARI', name: 'Arizona Cardinals' },
        { code: 'ATL', name: 'Atlanta Falcons' },
        { code: 'BAL', name: 'Baltimore Ravens' },
        { code: 'BUF', name: 'Buffalo Bills' },
        { code: 'CAR', name: 'Carolina Panthers' },
        { code: 'CHI', name: 'Chicago Bears' },
        { code: 'CIN', name: 'Cincinnati Bengals' },
        { code: 'CLE', name: 'Cleveland Browns' },
        { code: 'DAL', name: 'Dallas Cowboys' },
        { code: 'DEN', name: 'Denver Broncos' },
        { code: 'DET', name: 'Detroit Lions' },
        { code: 'GB', name: 'Green Bay Packers' },
        { code: 'HOU', name: 'Houston Texans' },
        { code: 'IND', name: 'Indianapolis Colts' },
        { code: 'JAX', name: 'Jacksonville Jaguars' },
        { code: 'KC', name: 'Kansas City Chiefs' },
        { code: 'LV', name: 'Las Vegas Raiders' },
        { code: 'LAC', name: 'Los Angeles Chargers' },
        { code: 'LAR', name: 'Los Angeles Rams' },
        { code: 'MIA', name: 'Miami Dolphins' },
        { code: 'MIN', name: 'Minnesota Vikings' },
        { code: 'NE', name: 'New England Patriots' },
        { code: 'NO', name: 'New Orleans Saints' },
        { code: 'NYG', name: 'New York Giants' },
        { code: 'NYJ', name: 'New York Jets' },
        { code: 'PHI', name: 'Philadelphia Eagles' },
        { code: 'PIT', name: 'Pittsburgh Steelers' },
        { code: 'SF', name: 'San Francisco 49ers' },
        { code: 'SEA', name: 'Seattle Seahawks' },
        { code: 'TB', name: 'Tampa Bay Buccaneers' },
        { code: 'TEN', name: 'Tennessee Titans' },
        { code: 'WAS', name: 'Washington Commanders' }
    ];

    // Load NFL active roster data
    async function loadActiveRosterData() {
        try {
            console.log("Loading NFL active roster data...");
            const response = await fetch('../data/nfl_active_roster.json');
            if (!response.ok) {
                throw new Error('Failed to load active roster data');
            }
            
            const activeRosterData = await response.json();
            
            // Clear the set and populate with active player IDs
            activePlayersSet.clear();
            
            if (activeRosterData.players && Array.isArray(activeRosterData.players)) {
                activeRosterData.players.forEach(player => {
                    if (player.PlayerID) {
                        activePlayersSet.add(String(player.PlayerID));
                    }
                });
            }
            
            console.log(`Loaded ${activePlayersSet.size} active players from NFL roster data`);
            return true;
        } catch (error) {
            console.error('Error loading active roster data:', error);
            // Continue without active roster data - all players will show as "Unknown" status
            return false;
        }
    }

    // Check if a player is active in the NFL
    function isPlayerActive(playerId) {
        return activePlayersSet.has(String(playerId));
    }
    async function loadRosterData() {
        try {
            const playerPositions = {};
            const playerTeams = {}; // Store player teams directly from proTeam field
            let totalPlayersFound = 0;
            let filesChecked = 0;
            let filesLoaded = 0;
            
            console.log("STARTING COMPREHENSIVE ROSTER SEARCH - CHECKING ALL POSSIBLE FILES");
            
            // Define all years to check - from 2010 to current year
            const currentYear = new Date().getFullYear();
            const yearsToCheck = [];
            for (let year = 2010; year <= currentYear; year++) {
                yearsToCheck.push(year);
            }
            
            console.log(`Will check ${yearsToCheck.length} years: ${yearsToCheck.join(', ')}`);
            
            // Check every week number from 1-22 (regular season + playoffs) for each year
            const weeksToCheck = [];
            for (let week = 1; week <= 22; week++) {
                weeksToCheck.push(week);
            }
            
            console.log(`Will check ${weeksToCheck.length} weeks for each year: ${weeksToCheck.join(', ')}`);
            
            // Brute force check every possible roster file
            const startTime = Date.now();
            for (const year of yearsToCheck) {
                let yearFiles = 0;
                
                for (const week of weeksToCheck) {
                    filesChecked++;
                    
                    try {
                        const filePath = `../data/rosters/${year}/week_${week}_rosters.json`;
                        
                        const response = await fetch(filePath);
                        
                        if (!response.ok) {
                            continue; // Skip to next file if not found
                        }
                        
                        const rosterData = await response.json();
                        filesLoaded++;
                        yearFiles++;
                        
                        console.log(`SUCCESS: Loaded roster file ${year}/week_${week}_rosters.json`);
                        
                        // Process all teams in the roster data
                        if (rosterData.teams && Array.isArray(rosterData.teams)) {
                            let playersInFile = 0;
                            rosterData.teams.forEach(team => {
                                if (team.roster && Array.isArray(team.roster)) {
                                    team.roster.forEach(player => {
                                        if (player.playerId) {
                                            // Convert to string to ensure consistent matching
                                            const playerId = String(player.playerId);
                                            
                                            // Store position if available
                                            if (player.position) {
                                                playerPositions[playerId] = player.position;
                                            }
                                            
                                            // Store proTeam directly - handling D/ST and HC entries properly
                                            if (player.proTeam) {
                                                playerTeams[playerId] = player.proTeam; // Use proTeam directly
                                                
                                                // Log special entries for D/ST and HC to debug
                                                if (playerId.startsWith('-16') || playerId.startsWith('-14') || player.position === 'D/ST') {
                                                    console.log(`FOUND SPECIAL ENTRY: ${player.name} (${player.position}), ID: ${playerId}, proTeam: ${player.proTeam}`);
                                                }
                                            }
                                            
                                            playersInFile++;
                                            totalPlayersFound++;
                                        }
                                    });
                                }
                            });
                            console.log(`→ Extracted ${playersInFile} player positions/teams from ${year}/week_${week}`);
                        }
                    } catch (error) {
                        // Silently fail for files that don't exist - this is expected
                    }
                }
                
                if (yearFiles > 0) {
                    console.log(`✓ Year ${year}: found ${yearFiles} roster files`);
                }
            }
            
            const endTime = Date.now();
            const searchTime = ((endTime - startTime) / 1000).toFixed(2);
            
            console.log(`ROSTER SEARCH COMPLETE: Checked ${filesChecked} possible files`);
            console.log(`Found ${filesLoaded} roster files containing ${totalPlayersFound} player positions`);
            console.log(`Search took ${searchTime} seconds`);
            console.log(`Found positions for ${Object.keys(playerPositions).length} unique players`);
            
            // We'll still add our fallback D/ST and HC entries for teams not found in roster data
            // But only if we don't already have data for these IDs
            nflTeams.forEach((team, index) => {
                // Only add if we don't already have this team's D/ST from roster data
                const defenseId = `-16${(index + 1).toString().padStart(3, '0')}`;
                if (!playerPositions[defenseId]) {
                    playerPositions[defenseId] = 'D/ST';
                    playerTeams[defenseId] = team.code;
                }
                
                // Only add if we don't already have this team's HC from roster data
                const coachId = `-14${(index + 1).toString().padStart(3, '0')}`;
                if (!playerPositions[coachId]) {
                    playerPositions[coachId] = 'HC';
                    playerTeams[coachId] = team.code;
                }
            });
            
            return { positions: playerPositions, teams: playerTeams };
        } catch (error) {
            console.error('Error in loadRosterData:', error);
            return { positions: {}, teams: {} };
        }
    }
    
    // Load player data from JSON file
    async function loadPlayerData() {
        try {
            // Load active roster data first
            await loadActiveRosterData();
            
            // Get roster data
            const rosterData = await loadRosterData();
            
            const playerPositions = rosterData.positions || {};
            const playerTeams = rosterData.teams || {};
            
            const response = await fetch('../data/player_ids.json');
            if (!response.ok) {
                throw new Error('Failed to load player data');
            }
            
            allPlayers = await response.json();
            
            // Log player IDs that we have positions for
            console.log(`Loaded position data for ${Object.keys(playerPositions).length} players`);
            console.log('First 10 player positions:', Object.entries(playerPositions).slice(0, 10));
            
            let positionMatches = 0;
            
            // Add mock data for demo purposes, but use real team data where available
            allPlayers = allPlayers.map(player => {
                // Get position from roster data
                let position = null;
                const stringId = String(player.id);
                
                // Look up position directly from the roster data
                if (playerPositions[stringId]) {
                    position = playerPositions[stringId];
                    positionMatches++;
                    console.log(`Position match for ${player.name}: ${position} (ID: ${stringId})`);
                } else if (stringId.startsWith('-16')) {
                    position = 'D/ST';
                    positionMatches++;
                } else if (stringId.startsWith('-14')) {
                    position = 'HC';
                    positionMatches++;
                } else {
                    position = 'Unknown';
                    console.warn(`No position data for player: ${player.name} (ID: ${stringId})`);
                }
                
                // Determine if player is active in NFL
                const isActive = isPlayerActive(stringId);
                const status = isActive ? 'active' : 'inactive';
                
                const projFP = Math.floor(Math.random() * 300) + 50;
                
                // Use team data from roster files
                let team = null;
                
                if (playerTeams[stringId]) {
                    // Use team directly from roster data - works for regular players, D/ST and HC
                    team = playerTeams[stringId];
                    console.log(`Using proTeam value for ${player.name}: ${team}`);
                } else if (stringId.startsWith('-16') || stringId.startsWith('-14')) {
                    // Special case for D/ST and HC entries not found in roster data
                    // Try to extract team code from the name if available
                    if (player.name) {
                        const nameMatch = player.name.match(/^(\w+)\s+D\/ST$/) || player.name.match(/^(\w+)\s+HC$/);
                        if (nameMatch) {
                            const teamCode = nameMatch[1].toUpperCase();
                            const matchedTeam = nflTeams.find(t => t.code === teamCode);
                            if (matchedTeam) {
                                team = matchedTeam.code;
                                console.log(`Extracted team ${team} from name for ${player.name} (ID: ${stringId})`);
                            }
                        }
                    }
                    
                    // If we couldn't extract from name, use the old index-based method
                    if (!team) {
                        const teamIndex = parseInt(stringId.substr(3)) - 1;
                        if (teamIndex >= 0 && teamIndex < nflTeams.length) {
                            team = nflTeams[teamIndex].code;
                            console.log(`Using index-based team ${team} for ${player.name} (ID: ${stringId})`);
                        }
                    }
                } else {
                    // Random fallback for regular players
                    const randomTeamIndex = Math.floor(Math.random() * nflTeams.length);
                    team = nflTeams[randomTeamIndex].code;
                    console.warn(`No team data for player: ${player.name} (ID: ${stringId}), using random team: ${team}`);
                }
                
                return {
                    ...player,
                    position: position,
                    team: team,
                    status: status,
                    projFP: projFP
                };
            });
            
            console.log(`Position assignment stats: ${positionMatches} matched from rosters`);
            
            // Initialize search with all players
            searchPlayers();
        } catch (error) {
            console.error('Error loading player data:', error);
            playerResults.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load player data. Please try again later.</p>
                </div>
            `;
        }
    }
    
    // Initialize NFL team dropdown
    function populateTeamDropdown() {
        teamFilter.innerHTML = '';
        
        // Add "All Teams" option first
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All Teams';
        teamFilter.appendChild(allOption);
        
        // Add each NFL team
        nflTeams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.code;
            option.textContent = team.name;
            teamFilter.appendChild(option);
        });
    }
    
    // Search players function
    function searchPlayers() {
        const nameQuery = playerSearchInput.value.trim().toLowerCase();
        const position = positionFilter.value;
        const team = teamFilter.value;
        const status = statusFilter.value;
        
        // Clear previous results and show loading state
        playerResults.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Searching players...</p></div>';
        
        // Filter the players based on search criteria
        filteredPlayers = allPlayers.filter(player => {
            // Name filter
            if (nameQuery && !player.name.toLowerCase().includes(nameQuery)) {
                return false;
            }
            
            // Position filter
            if (position) {
                if (position === 'FLEX') {
                    // FLEX includes RB, WR, and TE
                    if (!['RB', 'WR', 'TE'].includes(player.position)) {
                        return false;
                    }
                } else if (player.position !== position) {
                    return false;
                }
            }
            
            // Team filter
            if (team && player.team !== team) {
                return false;
            }
            
            // Status filter
            if (status && player.status !== status) {
                return false;
            }
            
            return true;
        });
        
        // Sort players alphabetically by name
        filteredPlayers.sort((a, b) => a.name.localeCompare(b.name));
        
        // Reset to first page when search criteria change
        currentPage = 1;
        
        // Display the filtered players
        displayPlayers(filteredPlayers);
    }
    
    // Display players in the UI
    function displayPlayers(players) {
        // Clear previous results
        playerResults.innerHTML = '';
        const topPaginationContainer = document.getElementById('top-pagination');
        topPaginationContainer.innerHTML = '';
        
        if (players.length === 0) {
            showEmptyState();
            resultsCount.textContent = '0 players found';
            return;
        }
        
        // Calculate pagination information
        const totalPlayers = players.length;
        const totalPages = Math.ceil(totalPlayers / playersPerPage);
        
        // Ensure current page is valid
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;
        
        // Get current page of players
        const startIndex = (currentPage - 1) * playersPerPage;
        const endIndex = Math.min(startIndex + playersPerPage, totalPlayers);
        const currentPlayers = players.slice(startIndex, endIndex);
        
        // Update results count with pagination info
        resultsCount.textContent = `${totalPlayers} players found (showing ${startIndex + 1}-${endIndex})`;
        
        // Add pagination controls at the top if more than one page
        if (totalPages > 1) {
            addPaginationControls(topPaginationContainer, totalPages);
        }
        
        // Render player cards
        currentPlayers.forEach(player => {
            renderPlayerCard(player);
        });
        
        // Add pagination controls at the bottom if more than one page
        if (totalPages > 1) {
            addPaginationControls(playerResults, totalPages);
        }
    }
    
    // Add pagination controls - now takes a container parameter
    function addPaginationControls(container, totalPages) {
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-controls';
        
        // Previous page button
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-btn' + (currentPage === 1 ? ' disabled' : '');
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i> Previous';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                displayPlayers(filteredPlayers);
                // Scroll to top of page
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        
        // Page indicator
        const pageIndicator = document.createElement('div');
        pageIndicator.className = 'page-indicator';
        pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
        
        // Next page button
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-btn' + (currentPage === totalPages ? ' disabled' : '');
        nextButton.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                displayPlayers(filteredPlayers);
                // Scroll to top of page
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        
        // Add buttons to container
        paginationContainer.appendChild(prevButton);
        paginationContainer.appendChild(pageIndicator);
        paginationContainer.appendChild(nextButton);
        
        // Add pagination to the provided container
        container.appendChild(paginationContainer);
    }
    
    // Render a player card
    function renderPlayerCard(player) {
        const playerCard = document.createElement('div');
        playerCard.className = 'game-card';
        
        // Find the team object - use FA for unknown teams
        const team = nflTeams.find(t => t.code === player.team) || 
                    { code: 'FA', name: 'Free Agent' }; // Change UNK to FA
        
        // Position-based styling
        let positionClass = '';
        switch(player.position) {
            case 'QB': positionClass = 'position-qb'; break;
            case 'RB': positionClass = 'position-rb'; break;
            case 'WR': positionClass = 'position-wr'; break;
            case 'TE': positionClass = 'position-te'; break;
            case 'K': positionClass = 'position-k'; break;
            case 'P': positionClass = 'position-p'; break;
            case 'D/ST': positionClass = 'position-def'; break; // Keep CSS class as 'position-def'
            case 'DEF': positionClass = 'position-def'; break; // Fallback for backward compatibility
            case 'HC': positionClass = 'position-hc'; break;
            default: positionClass = 'position-unknown';
        }
        
        // Status styling and text
        let statusClass = '';
        let statusText = '';
        
        switch(player.status) {
            case 'active':
                statusClass = 'status-active';
                statusText = 'Active';
                break;
            case 'inactive':
                statusClass = 'status-inactive';
                statusText = 'Inactive';
                break;
            default:
                statusClass = 'status-unknown';
                statusText = 'Unknown';
        }
        
        // Use espnId for images - they're the same as id in this case
        const imageId = player.espnId || player.id;
        
        playerCard.innerHTML = `
            <div class="game-date">
                <div class="game-date-info">
                    <div class="player-name">${player.name}</div>
                    <div class="team-info">${team.name}</div>
                </div>
                <div class="game-status ${statusClass}">${statusText}</div>
            </div>
            <div class="matchup">
                <div class="position-chip ${positionClass}">${player.position}</div>
                <div class="team-side ${team.code}">
                    <div class="team-logo">
                        <img src="../assets/espn-player-images/${imageId}.png" 
                             onerror="this.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'"
                             alt="${player.name}">
                    </div>
                    <div class="select-chip ${selectedPlayers.has(player.id) ? 'selected' : ''}" 
                         onclick="handlePlayerSelection('${player.id}', !this.classList.contains('selected'))">
                        <i class="fas ${selectedPlayers.has(player.id) ? 'fa-check' : 'fa-plus'}"></i>
                    </div>
                </div>
            </div>
            <div class="game-info">
                <div class="venue-info">
                    <span><i class="fas fa-football-ball"></i> Projected: ${player.projFP.toFixed(1)}</span>
                </div>
                <span class="game-details-link"><a href="player-details.html?id=${player.id}"><i class="fas fa-chart-bar"></i> Player Details</a></span>
            </div>
        `;
        
        playerResults.appendChild(playerCard);
    }
    
    // Show empty state when no results
    function showEmptyState() {
        playerResults.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>No players found matching your criteria. Try adjusting your filters.</p>
            </div>
        `;
    }
    
    // Compare functionality
    function handlePlayerSelection(playerId, isSelected) {
        if (isSelected) {
            if (selectedPlayers.size >= maxSelectedPlayers) {
                alert(`You can only select up to ${maxSelectedPlayers} players for comparison.`);
                return;
            }
            selectedPlayers.add(playerId);
        } else {
            selectedPlayers.delete(playerId);
        }
        updateCompareButton();
        
        // Update the chip appearance
        const chip = document.querySelector(`[onclick*="${playerId}"]`);
        if (chip) {
            if (isSelected) {
                chip.classList.add('selected');
                chip.innerHTML = '<i class="fas fa-check"></i>';
            } else {
                chip.classList.remove('selected');
                chip.innerHTML = '<i class="fas fa-plus"></i>';
            }
        }
    }
    
    function updateCompareButton() {
        selectedCountSpan.textContent = selectedPlayers.size;
        compareButton.disabled = selectedPlayers.size < 2;
        
        if (selectedPlayers.size >= 2) {
            compareButton.classList.add('active');
        } else {
            compareButton.classList.remove('active');
        }
    }
    
    function openPlayerComparison() {
        if (selectedPlayers.size < 2) {
            alert('Please select at least 2 players to compare.');
            return;
        }
        
        // Create URL with selected player IDs
        const playerIds = Array.from(selectedPlayers).join(',');
        window.open(`player-comparison.html?players=${playerIds}`, '_blank');
    }
    
    // Make functions global for onclick handlers
    window.handlePlayerSelection = handlePlayerSelection;
    window.openPlayerComparison = openPlayerComparison;
    
    // Initialize
    populateTeamDropdown();
    loadPlayerData(); // Load player data from JSON
    
    // Event listeners for filters
    playerSearchInput.addEventListener('input', debounce(searchPlayers, 300));
    positionFilter.addEventListener('change', searchPlayers);
    teamFilter.addEventListener('change', searchPlayers);
    statusFilter.addEventListener('change', searchPlayers);
    compareButton.addEventListener('click', openPlayerComparison);
    
    // Debounce function to prevent excessive searching while typing
    function debounce(func, delay) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }
});
