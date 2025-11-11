/**
 * Franchise Overview Module
 * Handles displaying the overview section with summary statistics
 */

const FranchiseOverview = (function() {
    // Private variables
    let _currentTeam = null;
    let _currentSeason = null;
    
    // Initialize the overview section
    function init(team, season) {
        console.log(`Initializing FranchiseOverview with team: ${team}, season: ${season}`);
        
        if (!team) {
            console.error('No team provided to FranchiseOverview.init()');
            return;
        }
        
        _currentTeam = team;
        _currentSeason = season;
        
        // Call update to render the overview
        update(team, season);
    }
    
    // Update the overview section with new data
    function update(team, season) {
        console.log(`Updating FranchiseOverview with team: ${team}, season: ${season}`);
        
        if (!team) {
            console.error('No team provided to FranchiseOverview.update()');
            return;
        }
        
        _currentTeam = team;
        _currentSeason = season;
        
        try {
            // Display all overview components
            displayTeamLogos();
            displayAccolades();
            displayStatsSummary();
            displaySeasonStats();
            displayHeadToHeadSummary();
            displayRivalries();
            createScoreDistributionChart();
        } catch (error) {
            console.error('Error updating franchise overview:', error);
            document.getElementById('overview').innerHTML = `
                <div class="error-message">
                    <h3>Error Displaying Overview</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
    
    // Display team logos
    function displayTeamLogos() {
        if (!_currentTeam) {
            console.warn('No team selected for displaying logos');
            return;
        }
        
        // Get team data from the abbreviations
        const teamData = FranchiseData.getTeamLogoData(_currentTeam);
        if (!teamData) {
            console.warn(`No logo data found for team: ${_currentTeam}`);
            return;
        }
        
        // Get the logo containers
        const dciContainer = document.getElementById('dciLogoContainer');
        const fflContainer = document.getElementById('fflLogoContainer');
        const nflContainer = document.getElementById('nflLogoContainer');
        
        // Clear existing logos from containers
        if (dciContainer) dciContainer.innerHTML = '';
        if (fflContainer) fflContainer.innerHTML = '';
        if (nflContainer) nflContainer.innerHTML = '';
        
        // Extract abbreviations
        const dciAbbr = teamData.abbreviations?.DCI || '';
        const fflAbbr = teamData.abbreviations?.FFL || '';
        const nflAbbr = teamData.abbreviations?.NFL || '';
        
        console.log(`Team: ${_currentTeam}, DCI: ${dciAbbr}, FFL: ${fflAbbr}, NFL: ${nflAbbr}`);
        
        // Add DCI logo
        if (dciContainer) {
            const dciLogo = document.createElement('img');
            dciLogo.className = 'team-logo dci-logo';
            dciLogo.src = dciAbbr && dciAbbr !== '' ? 
                `../assets/dci-logos/${dciAbbr}.png` : 
                '../assets/dci-logos/dci.png';
            dciLogo.alt = 'DCI Logo';
            dciContainer.appendChild(dciLogo);
        }
        
        // Add FFL logo
        if (fflContainer) {
            const fflLogo = document.createElement('img');
            fflLogo.className = 'team-logo ffl-logo';
            fflLogo.src = fflAbbr && fflAbbr !== '' ? 
                `../assets/ffl-logos/${fflAbbr}.png` : 
                '../assets/ffl-logos/ffl.png';
            fflLogo.alt = 'FFL Logo';
            fflContainer.appendChild(fflLogo);
        }
        
        // Add NFL logo
        if (nflContainer) {
            const nflLogo = document.createElement('img');
            nflLogo.className = 'team-logo nfl-logo';
            nflLogo.src = nflAbbr && nflAbbr !== '' ? 
                `../assets/nfl-logos/${nflAbbr}.png` : 
                '../assets/nfl-logos/nfl.png';
            nflLogo.alt = 'NFL Logo';
            nflContainer.appendChild(nflLogo);
        }
        
        // Update season subtitle
        const seasonElement = document.getElementById('franchiseSeason');
        if (seasonElement) {
            seasonElement.textContent = _currentSeason === 'All Time' ? 
                'All-Time Statistics' : 
                `${_currentSeason} Statistics`;
        }
    }
    
    // Display accolades for current team
    function displayAccolades() {
        const accoladesContainer = document.getElementById('franchiseAccolades');
        if (!accoladesContainer || !_currentTeam) return;
        
        // Clear container
        accoladesContainer.innerHTML = '';
        
        // Find accolades for the current team
        const teamAccolades = FranchiseData.getTeamAccolades(_currentTeam);
        
        // Create categories for organization
        const accoladesByCategory = {
            placements: [],
            championships: [],
            seasonal: []
        };
        
        // Categorize accolades
        teamAccolades.forEach(accolade => {
            if (accolade.award.includes('Place')) {
                accoladesByCategory.placements.push(accolade);
            } else if (accolade.award.includes('Champion')) {
                accoladesByCategory.championships.push(accolade);
            } else {
                accoladesByCategory.seasonal.push(accolade);
            }
        });
        
        // Sort placements by place (1st, 2nd, 3rd) and then by year (oldest to newest)
        accoladesByCategory.placements.sort((a, b) => {
            // Extract placement number (1, 2, 3)
            const aPlace = parseInt(a.award.split('st')[0].split('nd')[0].split('rd')[0]);
            const bPlace = parseInt(b.award.split('st')[0].split('nd')[0].split('rd')[0]);
            
            // First sort by placement (1st before 2nd before 3rd)
            if (aPlace !== bPlace) {
                return aPlace - bPlace;
            }
            
            // Then sort by year (oldest to newest)
            return a.year - b.year;
        });
        
        // Sort other categories by year (newest first)
        accoladesByCategory.championships.sort((a, b) => b.year - a.year);
        accoladesByCategory.seasonal.sort((a, b) => b.year - a.year);
        
        // Display accolades
        if (teamAccolades.length > 0) {
            const accoladesHeader = document.createElement('h3');
            accoladesHeader.textContent = 'Accolades';
            accoladesHeader.className = 'accolades-header';
            accoladesContainer.appendChild(accoladesHeader);
            
            const accoladesWrapper = document.createElement('div');
            accoladesWrapper.className = 'accolades-wrapper';
            
            // Display placements first (if any)
            if (accoladesByCategory.placements.length > 0) {
                const categorySection = document.createElement('div');
                categorySection.className = 'accolades-category';
                
                const categoryLabel = document.createElement('div');
                categoryLabel.className = 'category-label';
                categoryLabel.textContent = 'Playoff Finishes';
                categorySection.appendChild(categoryLabel);
                
                const accoladesList = document.createElement('div');
                accoladesList.className = 'accolades-list';
                
                accoladesByCategory.placements.forEach(accolade => {
                    const accoladeItem = createAccoladeItem(accolade);
                    accoladesList.appendChild(accoladeItem);
                });
                
                categorySection.appendChild(accoladesList);
                accoladesWrapper.appendChild(categorySection);
            }
            
            // Display championships (if any)
            if (accoladesByCategory.championships.length > 0) {
                const categorySection = document.createElement('div');
                categorySection.className = 'accolades-category';
                
                const categoryLabel = document.createElement('div');
                categoryLabel.className = 'category-label';
                categoryLabel.textContent = 'Championships';
                categorySection.appendChild(categoryLabel);
                
                const accoladesList = document.createElement('div');
                accoladesList.className = 'accolades-list';
                
                accoladesByCategory.championships.forEach(accolade => {
                    const accoladeItem = createAccoladeItem(accolade);
                    accoladesList.appendChild(accoladeItem);
                });
                
                categorySection.appendChild(accoladesList);
                accoladesWrapper.appendChild(categorySection);
            }
            
            // Display seasonal awards (if any)
            if (accoladesByCategory.seasonal.length > 0) {
                const categorySection = document.createElement('div');
                categorySection.className = 'accolades-category';
                
                const categoryLabel = document.createElement('div');
                categoryLabel.className = 'category-label';
                categoryLabel.textContent = 'Other Awards';
                categorySection.appendChild(categoryLabel);
                
                const accoladesList = document.createElement('div');
                accoladesList.className = 'accolades-list';
                
                accoladesByCategory.seasonal.forEach(accolade => {
                    const accoladeItem = createAccoladeItem(accolade);
                    accoladesList.appendChild(accoladeItem);
                });
                
                categorySection.appendChild(accoladesList);
                accoladesWrapper.appendChild(categorySection);
            }
            
            accoladesContainer.appendChild(accoladesWrapper);
        } else {
            accoladesContainer.innerHTML = '<p class="no-accolades">No accolades found for this franchise.</p>';
        }
    }
    
    // Helper function to create accolade items
    function createAccoladeItem(accolade) {
        const accoladeItem = document.createElement('div');
        accoladeItem.className = 'accolade-item';
        
        // Add special classes for placement accolades
        if (accolade.award === '1st Place') {
            accoladeItem.classList.add('first-place');
        } else if (accolade.award === '2nd Place') {
            accoladeItem.classList.add('second-place');
        } else if (accolade.award === '3rd Place') {
            accoladeItem.classList.add('third-place');
        }
        
        const yearSpan = document.createElement('span');
        yearSpan.className = 'accolade-year';
        yearSpan.textContent = accolade.year;
        
        const awardSpan = document.createElement('span');
        awardSpan.className = 'accolade-award';
        awardSpan.textContent = accolade.award;
        
        accoladeItem.appendChild(yearSpan);
        accoladeItem.appendChild(awardSpan);
        
        return accoladeItem;
    }
    
    // Display stats summary
    function displayStatsSummary() {
        const summaryContainer = document.getElementById('statsSummary');
        if (!summaryContainer) return;
        
        // Get team stats
        const teamStats = FranchiseData.getTeamStats();
        if (!teamStats) {
            summaryContainer.innerHTML = '<p class="no-data">No statistics available for this team.</p>';
            return;
        }
        
        // Create record span with color
        const recordColor = getRecordColor(teamStats.wins, teamStats.losses);
        
        // Create playoff record span with color
        const playoffRecordColor = getRecordColor(teamStats.playoffWins, teamStats.playoffLosses);
        const playoffRecord = teamStats.playoffWins + teamStats.playoffLosses > 0 ? 
            `${teamStats.playoffWins}-${teamStats.playoffLosses} Playoffs` : 
            'No playoff games';
        
        summaryContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-title">Record</div>
                <div class="stat-value" style="color: ${recordColor};">${teamStats.wins}-${teamStats.losses}</div>
                <div class="stat-subvalue" style="color: ${playoffRecordColor};">${playoffRecord}</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-title">Points Per Game</div>
                <div class="stat-value">${formatNumber(teamStats.avgPointsFor, 2)}</div>
                <div class="stat-subvalue">${formatNumber(teamStats.pointsFor, 2)} Total Points</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-title">Points Against</div>
                <div class="stat-value">${formatNumber(teamStats.avgPointsAgainst, 2)}</div>
                <div class="stat-subvalue">${formatNumber(teamStats.pointsAgainst, 2)} Total Against</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-title">Point Differential</div>
                <div class="stat-value ${teamStats.avgPointDifferential >= 0 ? 'positive' : 'negative'}">
                    ${teamStats.avgPointDifferential > 0 ? '+' : ''}${formatNumber(teamStats.avgPointDifferential, 2)}
                </div>
                <div class="stat-subvalue">Per Game</div>
            </div>
        `;
    }
    
    // Display season stats
    function displaySeasonStats() {
        const seasonStatsContainer = document.getElementById('seasonStatsContainer');
        const seasonStatsSection = document.getElementById('seasonStatsSection');
        
        if (!seasonStatsContainer || !seasonStatsSection) return;
        
        // Show section only for All-Time view
        if (_currentSeason !== 'All Time') {
            seasonStatsSection.style.display = 'none';
            return;
        } else {
            seasonStatsSection.style.display = 'block';
        }
        
        // Clear container
        seasonStatsContainer.innerHTML = '';
        
        // Get team stats
        const teamStats = FranchiseData.getTeamStats();
        if (!teamStats || !teamStats.seasons || teamStats.seasons.length === 0) {
            seasonStatsContainer.innerHTML = '<p class="no-data">No season data available for this team.</p>';
            return;
        }
        
        // Get stats for each season
        const seasonStatsData = [];
        
        teamStats.seasons.forEach(season => {
            const seasonStats = DataService.calculateTeamStats(_currentTeam, season);
            if (seasonStats && seasonStats.games > 0) {
                // Find placement for this team and season
                const placement = FranchiseData.getTeamFinish(_currentTeam, season);
                
                seasonStatsData.push({
                    season: season,
                    wins: seasonStats.wins,
                    losses: seasonStats.losses,
                    winPct: seasonStats.winPct,
                    avgPointsFor: seasonStats.avgPointsFor,
                    avgPointsAgainst: seasonStats.avgPointsAgainst,
                    pointsFor: seasonStats.pointsFor,
                    pointsAgainst: seasonStats.pointsAgainst,
                    placement: placement
                });
            }
        });
        
        // Create season stats table
        if (seasonStatsData.length > 0) {
            // Create table header
            const table = document.createElement('table');
            table.className = 'season-stats-table';
            
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Season</th>
                        <th>Finish</th>
                        <th>Record</th>
                        <th>Win %</th>
                        <th>PF</th>
                        <th>PA</th>
                        <th>PPG</th>
                        <th>PAPG</th>
                        <th>+/-</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            
            // Add rows
            const tbody = table.querySelector('tbody');
            
            seasonStatsData.forEach(stat => {
                const row = document.createElement('tr');
                
                // Create record span with color
                const recordColor = getRecordColor(stat.wins, stat.losses);
                
                // Format placement
                const formattedPlacement = FranchiseData.formatPlacement(stat.placement);
                
                // Add placement class for styling
                let placementClass = '';
                const place = parseInt(stat.placement);
                if (!isNaN(place)) {
                    if (place === 1) placementClass = 'finish-1';
                    else if (place === 2) placementClass = 'finish-2';
                    else if (place === 3) placementClass = 'finish-3';
                    else if (place === 16) placementClass = 'finish-16';
                    else placementClass = 'finish-badge';
                }
                
                // Calculate point differential
                const pointDiff = stat.pointsFor - stat.pointsAgainst;
                const pointDiffFormatted = pointDiff > 0 ? 
                    `+${formatNumber(pointDiff, 2)}` : 
                    formatNumber(pointDiff, 2);
                
                row.innerHTML = `
                    <td><a href="?team=${encodeURIComponent(_currentTeam)}&season=${stat.season}">${stat.season}</a></td>
                    <td><div class="${placementClass}"><span>${formattedPlacement}</span></div></td>
                    <td style="color: ${recordColor};">${stat.wins}-${stat.losses}</td>
                    <td>${formatPercent(stat.winPct)}</td>
                    <td>${formatNumber(stat.pointsFor, 2)}</td>
                    <td>${formatNumber(stat.pointsAgainst, 2)}</td>
                    <td>${formatNumber(stat.avgPointsFor, 2)}</td>
                    <td>${formatNumber(stat.avgPointsAgainst, 2)}</td>
                    <td class="${pointDiff > 0 ? 'positive' : pointDiff < 0 ? 'negative' : ''}">${pointDiffFormatted}</td>
                `;
                
                tbody.appendChild(row);
            });
            
            // Add table to container
            seasonStatsContainer.appendChild(table);
        } else {
            seasonStatsContainer.innerHTML = '<p class="no-data">No season data available for this team.</p>';
        }
    }
    
    // Display head-to-head summary (top rivalries)
    function displayHeadToHeadSummary() {
        console.log("Head-to-head summary display not yet implemented");
        const h2hSummaryContainer = document.getElementById('h2hSummaryContainer');
        if (h2hSummaryContainer) {
            h2hSummaryContainer.innerHTML = '<p class="no-data">Head-to-head data coming soon...</p>';
        }
    }

    // Display top rivalries
    function displayRivalries() {
        const container = document.getElementById('h2hSummaryContainer');
        if (!container) return;
        
        // Calculate rivalry statistics
        const rivalries = calculateRivalryStats(_currentTeam, _currentSeason);
        
        // Display rivalries
        displayRivalryStats(rivalries);
    }
    
    // Calculate rivalry statistics
    function calculateRivalryStats(team, seasonFilter = null) {
        // Get team game log
        const teamStats = FranchiseData.getTeamStats();
        if (!teamStats || !teamStats.gameLog) {
            console.error('No team stats or game log available');
            return [];
        }
        
        const gameLog = teamStats.gameLog;
        
        // Initialize rivalry stats
        const rivalries = {};
        
        // Calculate head-to-head stats against each opponent
        gameLog.forEach(game => {
            // Skip if season filter is applied and doesn't match
            if (seasonFilter && seasonFilter !== 'All Time' && game.season !== seasonFilter) {
                return;
            }
            
            const opponent = game.opponent;
            if (opponent === 'Bye') return; // Skip byes
            
            // Initialize opponent data if first encounter
            if (!rivalries[opponent]) {
                rivalries[opponent] = {
                    team: opponent,
                    games: 0,
                    wins: 0,
                    losses: 0,
                    pointsFor: 0,
                    pointsAgainst: 0,
                    streak: 0,
                    streakType: null,
                    lastGame: null
                };
            }
            
            // Update stats
            const rivalry = rivalries[opponent];
            rivalry.games++;
            
            if (game.result === 'W') {
                rivalry.wins++;
                
                // Update streak
                if (rivalry.streakType === 'W') {
                    rivalry.streak++;
                } else {
                    rivalry.streakType = 'W';
                    rivalry.streak = 1;
                }
            } else {
                rivalry.losses++;
                
                // Update streak
                if (rivalry.streakType === 'L') {
                    rivalry.streak++;
                } else {
                    rivalry.streakType = 'L';
                    rivalry.streak = 1;
                }
            }
            
            // Update points
            rivalry.pointsFor += game.teamScore;
            rivalry.pointsAgainst += game.opponentScore;
            
            // Track last game
            if (!rivalry.lastGame || parseInt(game.season) > parseInt(rivalry.lastGame.season) || 
                (parseInt(game.season) === parseInt(rivalry.lastGame.season) && parseInt(game.week) > parseInt(rivalry.lastGame.week))) {
                rivalry.lastGame = {
                    season: game.season,
                    week: game.week
                };
            }
        });
        
        // Calculate derived stats and convert to array
        const rivalriesArray = Object.values(rivalries).map(rivalry => {
            rivalry.winPct = rivalry.games > 0 ? rivalry.wins / rivalry.games : 0;
            rivalry.ppgFor = rivalry.games > 0 ? rivalry.pointsFor / rivalry.games : 0;
            rivalry.ppgAgainst = rivalry.games > 0 ? rivalry.pointsAgainst / rivalry.games : 0;
            rivalry.pointDiff = rivalry.ppgFor - rivalry.ppgAgainst;
            rivalry.record = `${rivalry.wins}-${rivalry.losses}`;
            
            // Format streak display
            if (rivalry.streakType === 'W') {
                rivalry.streakDisplay = `${rivalry.streak} W in a row`;
            } else if (rivalry.streakType === 'L') {
                rivalry.streakDisplay = `${rivalry.streak} L in a row`;
            } else {
                rivalry.streakDisplay = '-';
            }
            
            return rivalry;
        });
        
        // Sort by number of games played (most frequent opponents)
        rivalriesArray.sort((a, b) => b.games - a.games);
        
        // Return top rivals or all if less than threshold
        return rivalriesArray.slice(0, 6);
    }
    
    // Display rivalry stats
    function displayRivalryStats(rivalries) {
        const container = document.getElementById('h2hSummaryContainer');
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Display message if no rivalries found
        if (!rivalries || rivalries.length === 0) {
            container.innerHTML = '<p class="no-data">No rival data available for this team.</p>';
            return;
        }
        
        // Create rivalry cards
        rivalries.forEach(rivalry => {
            // Determine record styling
            let recordStyle = '';
            if (rivalry.wins > rivalry.losses) {
                recordStyle = 'color: #10b981;'; // Green for winning record
            } else if (rivalry.wins < rivalry.losses) {
                recordStyle = 'color: #ef4444;'; // Red for losing record
            }
            
            // Determine point diff formatting
            const pointDiffClass = rivalry.pointDiff > 0 ? 'positive' : (rivalry.pointDiff < 0 ? 'negative' : '');
            const pointDiffDisplay = rivalry.pointDiff > 0 ? `+${rivalry.pointDiff.toFixed(1)}` : rivalry.pointDiff.toFixed(1);
            
            const card = document.createElement('div');
            card.className = 'rivalry-card';
            
            card.innerHTML = `
                <div class="rivalry-header">
                    <div class="rivalry-team">
                        <a href="franchise.html?team=${encodeURIComponent(rivalry.team)}">${rivalry.team}</a>
                    </div>
                    <div class="rivalry-record" style="${recordStyle}">${rivalry.record}</div>
                </div>
                
                <div class="rivalry-stats">
                    <div class="rivalry-stat">
                        <div class="rivalry-stat-label">GAMES</div>
                        <div class="rivalry-stat-value">${rivalry.games}</div>
                    </div>
                    <div class="rivalry-stat">
                        <div class="rivalry-stat-label">WIN %</div>
                        <div class="rivalry-stat-value">${(rivalry.winPct * 100).toFixed(1)}%</div>
                    </div>
                    <div class="rivalry-stat">
                        <div class="rivalry-stat-label">PPG FOR</div>
                        <div class="rivalry-stat-value">${rivalry.ppgFor.toFixed(1)}</div>
                    </div>
                    <div class="rivalry-stat">
                        <div class="rivalry-stat-label">PPG AGAINST</div>
                        <div class="rivalry-stat-value">${rivalry.ppgAgainst.toFixed(1)}</div>
                    </div>
                    <div class="rivalry-stat">
                        <div class="rivalry-stat-label">PT DIFF</div>
                        <div class="rivalry-stat-value ${pointDiffClass}">${pointDiffDisplay}</div>
                    </div>
                    <div class="rivalry-stat">
                        <div class="rivalry-stat-label">STREAK</div>
                        <div class="rivalry-stat-value">${rivalry.streakDisplay}</div>
                    </div>
                </div>
                
                <div class="rivalry-footer">
                    <span>Last Game: Season ${rivalry.lastGame.season}, Week ${rivalry.lastGame.week}</span>
                    <a href="game-search.html?team1=${encodeURIComponent(_currentTeam)}&team2=${encodeURIComponent(rivalry.team)}">View Games</a>
                </div>
            `;
            
            container.appendChild(card);
        });
    }
    
    // Create score distribution chart
    function createScoreDistributionChart() {
        const teamStats = FranchiseData.getTeamStats();
        if (teamStats) {
            FranchiseCharts.createScoreDistributionChart('scoreDistributionContainer', teamStats);
        }
    }
    
    // Helper utilities
    function getRecordColor(wins, losses) {
        if (wins === 0 && losses === 0) return '#6b7280'; // Gray for no games
        
        const winPct = wins / (wins + losses);
        
        if (winPct >= 0.7) return '#10b981'; // Green for good records
        if (winPct >= 0.5) return '#3b82f6'; // Blue for winning records
        if (winPct >= 0.3) return '#f59e0b'; // Yellow/orange for below .500
        return '#ef4444'; // Red for poor records
    }
    
    function formatNumber(number, decimals = 0) {
        if (isNaN(number)) return '0';
        
        const fixed = parseFloat(number).toFixed(decimals);
        return fixed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    
    function formatPercent(number, decimals = 1) {
        if (isNaN(number)) return '0%';
        return (number * 100).toFixed(decimals) + '%';
    }
    
    // Public API
    return {
        init: init,
        update: update
    };
})();