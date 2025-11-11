document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const gameScoreboard = document.getElementById('gameScoreboard');
    const boxScore = document.getElementById('boxScore');
    const teamStats = document.getElementById('teamStats');
    const passingStats = document.getElementById('passingStats');
    const rushingStats = document.getElementById('rushingStats');
    const receivingStats = document.getElementById('receivingStats');
    const defenseStats = document.getElementById('defenseStats');
    const kickingStats = document.getElementById('kickingStats');
    const scoringPlays = document.getElementById('scoringPlays');
    const gameDate = document.getElementById('gameDate');
    
    // Tab functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all tab content
            document.querySelectorAll('.tab-content').forEach(
                content => content.classList.add('hidden')
            );
            
            // Show selected tab content
            const tabId = this.getAttribute('data-tab') + 'Stats';
            document.getElementById(tabId).classList.remove('hidden');
        });
    });
    
    // Sample NFL team data - same as in nfl-game-search.js
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
    
    // Get URL parameters
    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            gameId: params.get('gameId'),
            season: params.get('season'),
            week: params.get('week')
        };
    }
    
    // Load game data
    async function loadGameData() {
        const params = getUrlParams();
        
        if (!params.gameId || !params.season || !params.week) {
            showError('Missing required parameters: gameId, season, or week');
            return;
        }
        
        try {
            const jsonPath = `../data/espn_game_stats/${params.season}/nfl_data_${params.season}_week_${params.week}.json`;
            console.log(`Loading game data from: ${jsonPath}`);
            
            const response = await fetch(jsonPath);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch data for ${params.season} week ${params.week}`);
            }
            
            const rawData = await response.json();
            console.log('Loaded game data:', rawData);
            
            // Find the specific game by ID
            const game = rawData.games.find(g => g.header && g.header.id === params.gameId);
            
            if (!game) {
                throw new Error(`Game with ID ${params.gameId} not found in the data`);
            }
            
            // Process and display the game data
            processAndDisplayGame(game);
            
        } catch (error) {
            console.error('Error loading game data:', error);
            showError(`Error loading game data: ${error.message}`);
        }
    }
    
    // Process and display game data
    function processAndDisplayGame(game) {
        // Extract teams from boxscore
        if (!game.boxscore || !game.boxscore.teams || game.boxscore.teams.length < 2) {
            showError('Game data is missing team information');
            return;
        }
        
        const boxscoreTeams = game.boxscore.teams;
        const awayTeamBoxscore = boxscoreTeams.find(t => t.homeAway === 'away');
        const homeTeamBoxscore = boxscoreTeams.find(t => t.homeAway === 'home');
        
        if (!homeTeamBoxscore || !awayTeamBoxscore) {
            showError('Could not determine home or away team');
            return;
        }
        
        // Extract team codes
        let homeTeamCode = extractTeamCode(homeTeamBoxscore.team);
        let awayTeamCode = extractTeamCode(awayTeamBoxscore.team);
        
        // Find team objects from our nflTeams array
        const homeTeam = nflTeams.find(team => team.code === homeTeamCode) || 
                        { code: homeTeamCode || 'UNK', name: homeTeamBoxscore.team.displayName || 'Unknown Team' };
        
        const awayTeam = nflTeams.find(team => team.code === awayTeamCode) || 
                        { code: awayTeamCode || 'UNK', name: awayTeamBoxscore.team.displayName || 'Unknown Team' };
        
        // Look for team records in the header competitions section
        let homeRecord = "(0-0)";
        let awayRecord = "(0-0)";
        
        // First try to look in boxscore teams
        if (homeTeamBoxscore.record && Array.isArray(homeTeamBoxscore.record)) {
            const totalRecord = homeTeamBoxscore.record.find(r => r.type === "total");
            if (totalRecord && totalRecord.displayValue) {
                homeRecord = `(${totalRecord.displayValue})`;
            }
        }
        
        if (awayTeamBoxscore.record && Array.isArray(awayTeamBoxscore.record)) {
            const totalRecord = awayTeamBoxscore.record.find(r => r.type === "total");
            if (totalRecord && totalRecord.displayValue) {
                awayRecord = `(${totalRecord.displayValue})`;
            }
        }
        
        // If not found in boxscore, try to look in header competitions
        if (homeRecord === "(0-0)" || awayRecord === "(0-0)") {
            if (game.header && game.header.competitions && game.header.competitions.length > 0) {
                const competition = game.header.competitions[0];
                if (competition.competitors && Array.isArray(competition.competitors)) {
                    const homeCompetitor = competition.competitors.find(c => 
                        c.homeAway === 'home' || 
                        (c.team && c.team.abbreviation === homeTeamCode));
                    
                    const awayCompetitor = competition.competitors.find(c => 
                        c.homeAway === 'away' || 
                        (c.team && c.team.abbreviation === awayTeamCode));
                    
                    if (homeCompetitor && homeCompetitor.record && Array.isArray(homeCompetitor.record)) {
                        const totalRecord = homeCompetitor.record.find(r => r.type === "total");
                        if (totalRecord && totalRecord.displayValue) {
                            homeRecord = `(${totalRecord.displayValue})`;
                        }
                    }
                    
                    if (awayCompetitor && awayCompetitor.record && Array.isArray(awayCompetitor.record)) {
                        const totalRecord = awayCompetitor.record.find(r => r.type === "total");
                        if (totalRecord && totalRecord.displayValue) {
                            awayRecord = `(${totalRecord.displayValue})`;
                        }
                    }
                }
            }
        }
        
        console.log(`Home team record: ${homeRecord}, Away team record: ${awayRecord}`);
        
        // Get scores and game info
        let homeScore = 0;
        let awayScore = 0;
        let gameStatus = 'Final';
        let gameDateTime = new Date();
        
        if (game.header && game.header.competitions && game.header.competitions.length > 0) {
            const competition = game.header.competitions[0];
            
            if (competition.competitors && competition.competitors.length >= 2) {
                const homeCompetitor = competition.competitors.find(c => 
                    c.homeAway === 'home' || 
                    (c.team && c.team.abbreviation === homeTeamCode));
                
                const awayCompetitor = competition.competitors.find(c => 
                    c.homeAway === 'away' || 
                    (c.team && c.team.abbreviation === awayTeamCode));
                
                if (homeCompetitor && homeCompetitor.score) {
                    homeScore = parseInt(homeCompetitor.score) || 0;
                }
                
                if (awayCompetitor && awayCompetitor.score) {
                    awayScore = parseInt(awayCompetitor.score) || 0;
                }
            }
            
            // Extract game date and time
            if (competition.date) {
                gameDateTime = new Date(competition.date);
            }
            
            // Extract game status
            if (competition.status && competition.status.type) {
                gameStatus = competition.status.type.shortDetail || 'Final';
            }
        }
        
        // Display the game date in the header
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        gameDate.textContent = gameDateTime.toLocaleDateString('en-US', options);
        
        // Display scoreboard with records
        displayScoreboard(homeTeam, awayTeam, homeScore, awayScore, gameStatus, homeRecord, awayRecord);
        
        // Display box score (debugging linescores)
        console.log("Home team linescores:", homeTeamBoxscore.linescores);
        console.log("Away team linescores:", awayTeamBoxscore.linescores);
        displayBoxScore(game, homeTeam, awayTeam);
        
        // Display team stats
        displayTeamStats(game, homeTeam, awayTeam);
        
        // Display player stats
        displayPlayerStats(game, homeTeam, awayTeam);
        
        // Display scoring plays
        displayScoringPlays(game, homeTeam, awayTeam);
    }
    
    // Extract team code from team object
    function extractTeamCode(team) {
        if (team.abbreviation) {
            return team.abbreviation;
        }
        
        // Try to determine from logo URL
        if (team.logo) {
            const logoMatch = team.logo.match(/\/([a-z]+)\.png$/i);
            if (logoMatch) {
                return logoMatch[1].toUpperCase();
            }
        }
        
        return 'UNK';
    }
    
    // Display scoreboard
    function displayScoreboard(homeTeam, awayTeam, homeScore, awayScore, gameStatus, homeRecord, awayRecord) {
        // Determine winner
        let homeTeamClass = '';
        let awayTeamClass = '';
        
        if (homeScore > awayScore) {
            homeTeamClass = 'winner';
        } else if (awayScore > homeScore) {
            awayTeamClass = 'winner';
        } else if (homeScore === awayScore && homeScore > 0) {
            homeTeamClass = 'tie';
            awayTeamClass = 'tie';
        }
        
        gameScoreboard.innerHTML = `
            <div class="matchup-container">
                <div class="team-display ${awayTeamClass} ${awayTeam.code}">
                    <div class="team-logo-large">
                        <img src="../assets/nfl-logos/${awayTeam.code.toLowerCase()}.png" alt="${awayTeam.name} logo">
                    </div>
                    <div class="team-name-large">${awayTeam.name}</div>
                    <div class="team-record">${awayRecord}</div>
                </div>
                
                <div class="score-display">
                    <div class="score-value">
                        <span>${awayScore}</span>
                        <span class="score-divider">-</span>
                        <span>${homeScore}</span>
                    </div>
                    <div class="game-status-large">${gameStatus}</div>
                </div>
                
                <div class="team-display ${homeTeamClass} ${homeTeam.code}">
                    <div class="team-logo-large">
                        <img src="../assets/nfl-logos/${homeTeam.code.toLowerCase()}.png" alt="${homeTeam.name} logo">
                    </div>
                    <div class="team-name-large">${homeTeam.name}</div>
                    <div class="team-record">${homeRecord}</div>
                </div>
            </div>
        `;
    }
    
    // Display box score
    function displayBoxScore(game, homeTeam, awayTeam) {
        // Extract quarter-by-quarter scores
        const boxscoreTeams = game.boxscore.teams;
        const awayTeamBoxscore = boxscoreTeams.find(t => t.homeAway === 'away');
        const homeTeamBoxscore = boxscoreTeams.find(t => t.homeAway === 'home');
        
        // Log more detailed debugging information about the structure
        console.log("Home team boxscore structure:", homeTeamBoxscore);
        console.log("Away team boxscore structure:", awayTeamBoxscore);
        
        // Check for linescores in various locations in the data structure
        const homeLinescores = extractLinescores(homeTeamBoxscore, game, 'home', homeTeam.code);
        const awayLinescores = extractLinescores(awayTeamBoxscore, game, 'away', awayTeam.code);
        
        console.log("Extracted home linescores:", homeLinescores);
        console.log("Extracted away linescores:", awayLinescores);
        
        // Count maximum number of quarters/periods
        let maxPeriods = 4; // Default to 4 quarters
        
        if (homeLinescores.length > 0 || awayLinescores.length > 0) {
            maxPeriods = Math.max(
                homeLinescores.length,
                awayLinescores.length,
                4 // Always ensure at least 4 quarters
            );
        }
        
        // Create headers for each period/quarter
        let periodHeaders = '';
        for (let i = 1; i <= maxPeriods; i++) {
            const label = i <= 4 ? `Q${i}` : `OT${i-4}`;
            periodHeaders += `<th class="quarter-header">${label}</th>`;
        }
        
        // Create the HTML for the box score table
        let boxScoreHTML = `
            <table>
                <thead>
                    <tr>
                        <th style="text-align: left;">Team</th>
                        ${periodHeaders}
                        <th class="total-header">Total</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Add away team row
        boxScoreHTML += `
            <tr>
                <td class="team-cell">
                    <div class="team-logo-small">
                        <img src="../assets/nfl-logos/${awayTeam.code.toLowerCase()}.png" alt="${awayTeam.name} logo">
                    </div>
                    <span>${awayTeam.name}</span>
                </td>
        `;
        
        // Add period/quarter scores for away team
        let awayTotal = 0;
        if (awayLinescores.length > 0) {
            for (let i = 0; i < maxPeriods; i++) {
                const score = i < awayLinescores.length ? awayLinescores[i] : '0';
                boxScoreHTML += `<td>${score}</td>`;
                awayTotal += parseInt(score) || 0;
            }
        } else {
            // If no linescores, use the final score divided evenly with remainder in last quarter
            const awayScoreValue = parseInt(awayTeamBoxscore.score) || 0;
            awayTotal = awayScoreValue;
            
            if (awayScoreValue > 0) {
                const baseScore = Math.floor(awayScoreValue / maxPeriods);
                const remainder = awayScoreValue % maxPeriods;
                
                for (let i = 0; i < maxPeriods; i++) {
                    const quarterScore = (i === maxPeriods - 1) ? baseScore + remainder : baseScore;
                    boxScoreHTML += `<td>${quarterScore}</td>`;
                }
            } else {
                // All zeros if total score is 0
                for (let i = 0; i < maxPeriods; i++) {
                    boxScoreHTML += `<td>0</td>`;
                }
            }
        }
        
        // Add away team total
        boxScoreHTML += `<td class="total-cell">${awayTotal}</td></tr>`;
        
        // Add home team row
        boxScoreHTML += `
            <tr>
                <td class="team-cell">
                    <div class="team-logo-small">
                        <img src="../assets/nfl-logos/${homeTeam.code.toLowerCase()}.png" alt="${homeTeam.name} logo">
                    </div>
                    <span>${homeTeam.name}</span>
                </td>
        `;
        
        // Add period/quarter scores for home team
        let homeTotal = 0;
        if (homeLinescores.length > 0) {
            for (let i = 0; i < maxPeriods; i++) {
                const score = i < homeLinescores.length ? homeLinescores[i] : '0';
                boxScoreHTML += `<td>${score}</td>`;
                homeTotal += parseInt(score) || 0;
            }
        } else {
            // If no linescores, use the final score divided evenly with remainder in last quarter
            const homeScoreValue = parseInt(homeTeamBoxscore.score) || 0;
            homeTotal = homeScoreValue;
            
            if (homeScoreValue > 0) {
                const baseScore = Math.floor(homeScoreValue / maxPeriods);
                const remainder = homeScoreValue % maxPeriods;
                
                for (let i = 0; i < maxPeriods; i++) {
                    const quarterScore = (i === maxPeriods - 1) ? baseScore + remainder : baseScore;
                    boxScoreHTML += `<td>${quarterScore}</td>`;
                }
            } else {
                // All zeros if total score is 0
                for (let i = 0; i < maxPeriods; i++) {
                    boxScoreHTML += `<td>0</td>`;
                }
            }
        }
        
        // Add home team total
        boxScoreHTML += `<td class="total-cell">${homeTotal}</td></tr>`;
        
        // Close the table
        boxScoreHTML += `
                </tbody>
            </table>
        `;
        
        boxScore.innerHTML = boxScoreHTML;
    }
    
    // Helper function to extract linescores from various locations in the data structure
    function extractLinescores(teamBoxscore, game, homeAway, teamCode) {
        let linescores = [];
        
        // Try to get linescores from the direct property first
        if (teamBoxscore && teamBoxscore.linescores && Array.isArray(teamBoxscore.linescores)) {
            linescores = teamBoxscore.linescores.map(ls => 
                typeof ls === 'object' && ls.displayValue ? ls.displayValue : String(ls || '0')
            );
            console.log(`Found linescores in direct property for ${homeAway} team:`, linescores);
            return linescores;
        }
        
        // Try to find in header.competitions[0].competitors
        if (game.header && game.header.competitions && game.header.competitions.length > 0) {
            const competition = game.header.competitions[0];
            if (competition.competitors && Array.isArray(competition.competitors)) {
                // Find the competitor that matches our team
                const competitor = competition.competitors.find(c => 
                    c.homeAway === homeAway || 
                    (c.team && c.team.abbreviation === teamCode)
                );
                
                if (competitor && competitor.linescores && Array.isArray(competitor.linescores)) {
                    linescores = competitor.linescores.map(ls => 
                        typeof ls === 'object' && ls.displayValue ? ls.displayValue : String(ls || '0')
                    );
                    console.log(`Found linescores in header.competitions for ${homeAway} team:`, linescores);
                    return linescores;
                }
            }
        }
        
        // If we can find scoring plays, we could potentially reconstruct the quarter scores
        if (game.scoringPlays && Array.isArray(game.scoringPlays) && game.scoringPlays.length > 0) {
            console.log("Found scoring plays - could reconstruct quarter scores if needed");
            // This would be a more complex implementation to reconstruct quarter scores from scoring plays
            // For now, we'll leave this as a future enhancement
        }
        
        // Return empty array if we couldn't find any linescores
        return linescores;
    }
    
    // Display team stats
    function displayTeamStats(game, homeTeam, awayTeam) {
        // Check if team stats exist
        if (!game.boxscore || !game.boxscore.teams) {
            teamStats.innerHTML = '<div class="empty-state"><p>No team statistics available for this game.</p></div>';
            return;
        }
        
        const awayTeamBoxscore = game.boxscore.teams.find(t => t.homeAway === 'away');
        const homeTeamBoxscore = game.boxscore.teams.find(t => t.homeAway === 'home');
        
        // Extract team stats
        const awayStats = awayTeamBoxscore.statistics || [];
        const homeStats = homeTeamBoxscore.statistics || [];
        
        if (awayStats.length === 0 || homeStats.length === 0) {
            teamStats.innerHTML = '<div class="empty-state"><p>No team statistics available for this game.</p></div>';
            return;
        }
        
        // Create the HTML for the team stats table
        let teamStatsHTML = `
            <table>
                <thead>
                    <tr>
                        <th class="stat-category">Team Stats</th>
                        <th class="team-header">${awayTeam.name}</th>
                        <th class="team-header">${homeTeam.name}</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Define stat categories to display and their labels
        const statCategories = [
            { name: 'firstDowns', label: 'First Downs' },
            { name: 'thirdDownEff', label: '3rd Down Efficiency' },
            { name: 'fourthDownEff', label: '4th Down Efficiency' },
            { name: 'totalYards', label: 'Total Yards' },
            { name: 'netPassingYards', label: 'Net Passing Yards' },
            { name: 'completionAttempts', label: 'Completions-Attempts' },
            { name: 'yardsPerPass', label: 'Yards Per Pass' },
            { name: 'rushingYards', label: 'Rushing Yards' },
            { name: 'rushingAttempts', label: 'Rushing Attempts' },
            { name: 'yardsPerRushAttempt', label: 'Yards Per Rush' },
            { name: 'turnovers', label: 'Turnovers' },
            { name: 'interceptions', label: 'Interceptions Thrown' },
            { name: 'fumbles', label: 'Fumbles Lost' },
            { name: 'penalties', label: 'Penalties' },
            { name: 'penaltyYards', label: 'Penalty Yards' },
            { name: 'sacks', label: 'Sacks-Yards Lost' },
            { name: 'timeOfPossession', label: 'Time of Possession' }
        ];
        
        // Add rows for each stat category
        statCategories.forEach(category => {
            const awayStat = awayStats.find(s => s.name === category.name);
            const homeStat = homeStats.find(s => s.name === category.name);
            
            if (awayStat || homeStat) {
                teamStatsHTML += `
                    <tr>
                        <td class="stat-category">${category.label}</td>
                        <td>${awayStat ? awayStat.displayValue : 'N/A'}</td>
                        <td>${homeStat ? homeStat.displayValue : 'N/A'}</td>
                    </tr>
                `;
            }
        });
        
        // Close the table
        teamStatsHTML += `
                </tbody>
            </table>
        `;
        
        teamStats.innerHTML = teamStatsHTML;
    }
    
    // Display player stats
    function displayPlayerStats(game, homeTeam, awayTeam) {
        // Check if player stats exist
        if (!game.boxscore || !game.boxscore.players) {
            const emptyHTML = '<div class="empty-state"><p>No player statistics available for this game.</p></div>';
            passingStats.innerHTML = emptyHTML;
            rushingStats.innerHTML = emptyHTML;
            receivingStats.innerHTML = emptyHTML;
            defenseStats.innerHTML = emptyHTML;
            kickingStats.innerHTML = emptyHTML;
            return;
        }
        
        const players = game.boxscore.players;
        
        // Process each category of player statistics
        displayPassingStats(players, homeTeam, awayTeam);
        displayRushingStats(players, homeTeam, awayTeam);
        displayReceivingStats(players, homeTeam, awayTeam);
        displayDefenseStats(players, homeTeam, awayTeam);
        displayKickingStats(players, homeTeam, awayTeam);
    }
    
    // Display passing stats
    function displayPassingStats(players, homeTeam, awayTeam) {
        let passingHTML = '';
        
        // Process each team
        players.forEach(teamPlayers => {
            try {
                // Match team with our teams
                const teamCode = extractTeamCode(teamPlayers.team);
                const team = teamCode === homeTeam.code ? homeTeam : awayTeam;
                
                // Get passing stats
                const passers = teamPlayers.statistics?.find(s => s.name === 'passing');
                
                if (!passers || !passers.athletes || passers.athletes.length === 0) {
                    return; // Skip if no passing stats
                }
                
                passingHTML += `
                    <div class="team-panel">
                        <div class="team-panel-header">
                            <div class="team-logo-small">
                                <img src="../assets/nfl-logos/${team.code.toLowerCase()}.png" alt="${team.name} logo">
                            </div>
                            <div class="team-name">${team.name}</div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Player</th>
                                    <th>C/ATT</th>
                                    <th>YDS</th>
                                    <th>AVG</th>
                                    <th>TD</th>
                                    <th>INT</th>
                                    <th>SACKS</th>
                                    <th>QBR</th>
                                    <th>RTG</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                // Add rows for each player
                passers.athletes.forEach(athlete => {
                    // Handle both array-style and object-style stats
                    const stats = Array.isArray(athlete.stats) ? athlete.stats : athlete.stats || {};
                    
                    // Get values based on type of stats object
                    const compAtt = Array.isArray(stats) ? stats[0] || "0/0" : `${stats.completions || 0}/${stats.passingAttempts || 0}`;
                    const yards = Array.isArray(stats) ? stats[1] || "0" : stats.passingYards || 0;
                    const avg = Array.isArray(stats) ? stats[2] || "0.0" : stats.yardsPerPassAttempt || 0;
                    const td = Array.isArray(stats) ? stats[3] || "0" : stats.passingTouchdowns || 0;
                    const int = Array.isArray(stats) ? stats[4] || "0" : stats.interceptions || 0;
                    const sacks = Array.isArray(stats) ? stats[5] || "0" : stats.sacks || 0;
                    const qbr = Array.isArray(stats) ? stats[6] || "N/A" : stats.qbr || 'N/A';
                    const rating = Array.isArray(stats) ? stats[7] || "N/A" : stats.passerRating || 'N/A';
                    
                    passingHTML += `
                        <tr>
                            <td class="player-name">
                                <span class="player-number">${athlete.jersey || athlete.athlete?.jersey || ''}</span>
                                <span>${athlete.athlete?.displayName || 'Unknown Player'}</span>
                            </td>
                            <td>${compAtt}</td>
                            <td>${yards}</td>
                            <td>${avg}</td>
                            <td>${td}</td>
                            <td>${int}</td>
                            <td>${sacks}</td>
                            <td>${qbr}</td>
                            <td>${rating}</td>
                        </tr>
                    `;
                });
                
                passingHTML += `
                            </tbody>
                        </table>
                    </div>
                `;
            } catch (error) {
                console.error("Error processing passing stats:", error);
            }
        });
        
        // If no passing stats for any team
        if (passingHTML === '') {
            passingHTML = '<div class="empty-state"><p>No passing statistics available for this game.</p></div>';
        }
        
        passingStats.innerHTML = passingHTML;
    }
    
    // Display rushing stats with similar array handling
    function displayRushingStats(players, homeTeam, awayTeam) {
        let rushingHTML = '';
        
        // Process each team
        players.forEach(teamPlayers => {
            try {
                // Match team with our teams
                const teamCode = extractTeamCode(teamPlayers.team);
                const team = teamCode === homeTeam.code ? homeTeam : awayTeam;
                
                // Get rushing stats
                const rushers = teamPlayers.statistics?.find(s => s.name === 'rushing');
                
                if (!rushers || !rushers.athletes || rushers.athletes.length === 0) {
                    return; // Skip if no rushing stats
                }
                
                rushingHTML += `
                    <div class="team-panel">
                        <div class="team-panel-header">
                            <div class="team-logo-small">
                                <img src="../assets/nfl-logos/${team.code.toLowerCase()}.png" alt="${team.name} logo">
                            </div>
                            <div class="team-name">${team.name}</div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Player</th>
                                    <th>CAR</th>
                                    <th>YDS</th>
                                    <th>AVG</th>
                                    <th>TD</th>
                                    <th>LONG</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                // Add rows for each player
                rushers.athletes.forEach(athlete => {
                    // Handle both array-style and object-style stats
                    const stats = Array.isArray(athlete.stats) ? athlete.stats : athlete.stats || {};
                    
                    // Get values based on type of stats object
                    const carries = Array.isArray(stats) ? stats[0] || "0" : stats.rushingAttempts || 0;
                    const yards = Array.isArray(stats) ? stats[1] || "0" : stats.rushingYards || 0;
                    const avg = Array.isArray(stats) ? stats[2] || "0.0" : stats.yardsPerRushAttempt || 0;
                    const td = Array.isArray(stats) ? stats[3] || "0" : stats.rushingTouchdowns || 0;
                    const long = Array.isArray(stats) ? stats[4] || "0" : stats.longRushing || 0;
                    
                    rushingHTML += `
                        <tr>
                            <td class="player-name">
                                <span class="player-number">${athlete.jersey || athlete.athlete?.jersey || ''}</span>
                                <span>${athlete.athlete?.displayName || 'Unknown Player'}</span>
                            </td>
                            <td>${carries}</td>
                            <td>${yards}</td>
                            <td>${avg}</td>
                            <td>${td}</td>
                            <td>${long}</td>
                        </tr>
                    `;
                });
                
                rushingHTML += `
                            </tbody>
                        </table>
                    </div>
                `;
            } catch (error) {
                console.error("Error processing rushing stats:", error);
            }
        });
        
        // If no rushing stats for any team
        if (rushingHTML === '') {
            rushingHTML = '<div class="empty-state"><p>No rushing statistics available for this game.</p></div>';
        }
        
        rushingStats.innerHTML = rushingHTML;
    }
    
    // Display receiving stats with similar array handling
    function displayReceivingStats(players, homeTeam, awayTeam) {
        let receivingHTML = '';
        
        // Process each team
        players.forEach(teamPlayers => {
            try {
                // Match team with our teams
                const teamCode = extractTeamCode(teamPlayers.team);
                const team = teamCode === homeTeam.code ? homeTeam : awayTeam;
                
                // Get receiving stats
                const receivers = teamPlayers.statistics?.find(s => s.name === 'receiving');
                
                if (!receivers || !receivers.athletes || receivers.athletes.length === 0) {
                    return; // Skip if no receiving stats
                }
                
                receivingHTML += `
                    <div class="team-panel">
                        <div class="team-panel-header">
                            <div class="team-logo-small">
                                <img src="../assets/nfl-logos/${team.code.toLowerCase()}.png" alt="${team.name} logo">
                            </div>
                            <div class="team-name">${team.name}</div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Player</th>
                                    <th>REC</th>
                                    <th>YDS</th>
                                    <th>AVG</th>
                                    <th>TD</th>
                                    <th>LONG</th>
                                    <th>TGTS</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                // Add rows for each player
                receivers.athletes.forEach(athlete => {
                    // Handle both array-style and object-style stats
                    const stats = Array.isArray(athlete.stats) ? athlete.stats : athlete.stats || {};
                    
                    // Get values based on type of stats object
                    const rec = Array.isArray(stats) ? stats[0] || "0" : stats.receptions || 0;
                    const yards = Array.isArray(stats) ? stats[1] || "0" : stats.receivingYards || 0;
                    const avg = Array.isArray(stats) ? stats[2] || "0.0" : stats.yardsPerReception || 0;
                    const td = Array.isArray(stats) ? stats[3] || "0" : stats.receivingTouchdowns || 0;
                    const long = Array.isArray(stats) ? stats[4] || "0" : stats.longReception || 0;
                    const tgt = Array.isArray(stats) ? stats[5] || "0" : stats.receivingTargets || 0;
                    
                    receivingHTML += `
                        <tr>
                            <td class="player-name">
                                <span class="player-number">${athlete.jersey || athlete.athlete?.jersey || ''}</span>
                                <span>${athlete.athlete?.displayName || 'Unknown Player'}</span>
                            </td>
                            <td>${rec}</td>
                            <td>${yards}</td>
                            <td>${avg}</td>
                            <td>${td}</td>
                            <td>${long}</td>
                            <td>${tgt}</td>
                        </tr>
                    `;
                });
                
                receivingHTML += `
                            </tbody>
                        </table>
                    </div>
                `;
            } catch (error) {
                console.error("Error processing receiving stats:", error);
            }
        });
        
        // If no receiving stats for any team
        if (receivingHTML === '') {
            receivingHTML = '<div class="empty-state"><p>No receiving statistics available for this game.</p></div>';
        }
        
        receivingStats.innerHTML = receivingHTML;
    }
    
    // Display defense stats
    function displayDefenseStats(players, homeTeam, awayTeam) {
        let defenseHTML = '';
        
        // Process each team
        players.forEach(teamPlayers => {
            try {
                // Match team with our teams
                const teamCode = extractTeamCode(teamPlayers.team);
                const team = teamCode === homeTeam.code ? homeTeam : awayTeam;
                
                // Get defense stats
                const defenders = teamPlayers.statistics?.find(s => s.name === 'defensive');
                
                if (!defenders || !defenders.athletes || defenders.athletes.length === 0) {
                    console.log(`No defense data found for team ${teamCode}`);
                    return; // Skip if no defense stats
                }
                
                console.log(`Found ${defenders.athletes.length} defenders for team ${teamCode}`);
                
                defenseHTML += `
                    <div class="team-panel">
                        <div class="team-panel-header">
                            <div class="team-logo-small">
                                <img src="../assets/nfl-logos/${team.code.toLowerCase()}.png" alt="${team.name} logo">
                            </div>
                            <div class="team-name">${team.name}</div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Player</th>
                                    <th>TOT</th>
                                    <th>SOLO</th>
                                    <th>SACKS</th>
                                    <th>TFL</th>
                                    <th>PD</th>
                                    <th>QB HIT</th>
                                    <th>INT</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                // Add rows for each player
                defenders.athletes.forEach(athlete => {
                    // Handle both array-style and object-style stats
                    const stats = Array.isArray(athlete.stats) ? athlete.stats : athlete.stats || {};
                    
                    // Get values based on type of stats object
                    const tot = Array.isArray(stats) ? stats[0] || "0" : stats.totalTackles || 0;
                    const solo = Array.isArray(stats) ? stats[1] || "0" : stats.soloTackles || 0;
                    const sacks = Array.isArray(stats) ? stats[2] || "0" : stats.sacks || 0;
                    const tfl = Array.isArray(stats) ? stats[3] || "0" : stats.tacklesForLoss || 0;
                    const pd = Array.isArray(stats) ? stats[4] || "0" : stats.passesDefended || 0;
                    const qbHits = Array.isArray(stats) ? stats[5] || "0" : stats.QBHits || stats.qbHits || 0;
                    const td = Array.isArray(stats) ? stats[6] || "0" : stats.defensiveTouchdowns || stats.interceptions || 0;
                    
                    // Get player display name and jersey
                    const playerName = athlete.athlete?.displayName || 'Unknown Player';
                    const jersey = athlete.athlete?.jersey || '';
                    
                    defenseHTML += `
                        <tr>
                            <td class="player-name">
                                <span class="player-number">${jersey}</span>
                                <span>${playerName}</span>
                            </td>
                            <td>${tot}</td>
                            <td>${solo}</td>
                            <td>${sacks}</td>
                            <td>${tfl}</td>
                            <td>${pd}</td>
                            <td>${qbHits}</td>
                            <td>${td}</td>
                        </tr>
                    `;
                });
                
                defenseHTML += `
                            </tbody>
                        </table>
                    </div>
                `;
            } catch (error) {
                console.error("Error processing defense stats:", error);
            }
        });
        
        // If no defense stats for any team
        if (defenseHTML === '') {
            defenseHTML = '<div class="empty-state"><p>No defensive statistics available for this game.</p></div>';
        }
        
        defenseStats.innerHTML = defenseHTML;
    }
    
    // Display kicking stats
    function displayKickingStats(players, homeTeam, awayTeam) {
        let kickingHTML = '';
        
        // Process each team
        players.forEach(teamPlayers => {
            try {
                // Match team with our teams
                const teamCode = extractTeamCode(teamPlayers.team);
                const team = teamCode === homeTeam.code ? homeTeam : awayTeam;
                
                // Get kicking stats
                const kickers = teamPlayers.statistics?.find(s => s.name === 'kicking');
                
                if (!kickers || !kickers.athletes || kickers.athletes.length === 0) {
                    console.log(`No kicking data found for team ${teamCode}`);
                    return; // Skip if no kicking stats
                }
                
                console.log(`Found ${kickers.athletes.length} kickers for team ${teamCode}`);
                
                kickingHTML += `
                    <div class="team-panel">
                        <div class="team-panel-header">
                            <div class="team-logo-small">
                                <img src="../assets/nfl-logos/${team.code.toLowerCase()}.png" alt="${team.name} logo">
                            </div>
                            <div class="team-name">${team.name}</div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Player</th>
                                    <th>FG</th>
                                    <th>PCT</th>
                                    <th>LONG</th>
                                    <th>XP</th>
                                    <th>PTS</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                // Add rows for each player
                kickers.athletes.forEach(athlete => {
                    // Handle both array-style and object-style stats
                    const stats = Array.isArray(athlete.stats) ? athlete.stats : athlete.stats || {};
                    
                    // Get values based on type of stats object
                    const fg = Array.isArray(stats) ? stats[0] || "0/0" : (stats.fieldGoalsMade || "0") + "/" + (stats.fieldGoalAttempts || "0");
                    const pct = Array.isArray(stats) ? stats[1] || "0.0" : stats.fieldGoalPct || "0.0";
                    const long = Array.isArray(stats) ? stats[2] || "0" : stats.longFieldGoal || "0";
                    const xp = Array.isArray(stats) ? stats[3] || "0/0" : (stats.extraPointsMade || "0") + "/" + (stats.extraPointAttempts || "0");
                    
                    // Calculate points: 3 points per FG + 1 point per XP
                    let pts = "0";
                    if (Array.isArray(stats)) {
                        pts = stats[4] || "0";
                    } else {
                        // Try to calculate from made FGs and XPs
                        const fgMade = parseInt(stats.fieldGoalsMade || 0);
                        const xpMade = parseInt(stats.extraPointsMade || 0);
                        pts = ((fgMade * 3) + xpMade).toString();
                    }
                    
                    // Get player display name and jersey
                    const playerName = athlete.athlete?.displayName || 'Unknown Player';
                    const jersey = athlete.athlete?.jersey || '';
                    
                    kickingHTML += `
                        <tr>
                            <td class="player-name">
                                <span class="player-number">${jersey}</span>
                                <span>${playerName}</span>
                            </td>
                            <td>${fg}</td>
                            <td>${pct}</td>
                            <td>${long}</td>
                            <td>${xp}</td>
                            <td>${pts}</td>
                        </tr>
                    `;
                });
                
                kickingHTML += `
                            </tbody>
                        </table>
                    </div>
                `;
            } catch (error) {
                console.error("Error processing kicking stats:", error);
            }
        });
        
        // If no kicking stats for any team
        if (kickingHTML === '') {
            kickingHTML = '<div class="empty-state"><p>No kicking statistics available for this game.</p></div>';
        }
        
        kickingStats.innerHTML = kickingHTML;
    }
    
    // Display scoring plays
    function displayScoringPlays(game, homeTeam, awayTeam) {
        // Check if scoring plays exist
        if (!game.scoringPlays || !Array.isArray(game.scoringPlays) || game.scoringPlays.length === 0) {
            scoringPlays.innerHTML = '<div class="empty-state"><p>No scoring plays available for this game.</p></div>';
            return;
        }
        
        let scoringPlaysHTML = '';
        
        // Sort scoring plays chronologically
        const sortedPlays = [...game.scoringPlays].sort((a, b) => {
            // Sort by quarter first
            const quarterA = a.period?.number || 0;
            const quarterB = b.period?.number || 0;
            
            if (quarterA !== quarterB) {
                return quarterA - quarterB;
            }
            
            // Then by time within quarter (clock is in seconds, higher is earlier in quarter)
            const clockA = a.clock?.value || 0;
            const clockB = b.clock?.value || 0;
            
            return clockB - clockA;
        });
        
        // Process each scoring play
        sortedPlays.forEach(play => {
            // Skip if missing essential data
            if (!play.team) {
                return;
            }
            
            // Extract team code
            const teamCode = extractTeamCode(play.team);
            const team = nflTeams.find(t => t.code === teamCode) || 
                       { code: teamCode || 'UNK', name: play.team.displayName || 'Unknown Team' };
            
            // Format quarter/period
            const period = play.period?.number || '';
            const periodDisplay = period <= 4 ? `Q${period}` : `OT${period - 4}`;
            
            // Format time
            const clockVal = play.clock?.displayValue || '--:--';
            
            // Format score
            const score = `${play.awayScore || 0}-${play.homeScore || 0}`;
            
            // Format play text
            const playText = play.text || 'Scoring play';
            
            scoringPlaysHTML += `
                <div class="scoring-play">
                    <div class="scoring-play-quarter">${periodDisplay}</div>
                    <div class="scoring-play-time">${clockVal}</div>
                    <div class="scoring-play-team">
                        <img src="../assets/nfl-logos/${team.code.toLowerCase()}.png" alt="${team.name} logo">
                    </div>
                    <div class="scoring-play-description">${playText}</div>
                    <div class="scoring-play-score">${score}</div>
                </div>
            `;
        });
        
        // If no valid scoring plays
        if (scoringPlaysHTML === '') {
            scoringPlaysHTML = '<div class="empty-state"><p>No scoring plays available for this game.</p></div>';
        }
        
        scoringPlays.innerHTML = scoringPlaysHTML;
    }
    
    // Show error message
    function showError(message) {
        const errorHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
        
        gameScoreboard.innerHTML = errorHTML;
        boxScore.innerHTML = '';
        teamStats.innerHTML = '';
        passingStats.innerHTML = '';
        rushingStats.innerHTML = '';
        receivingStats.innerHTML = '';
        defenseStats.innerHTML = '';
        kickingStats.innerHTML = '';
        scoringPlays.innerHTML = '';
    }
    
    // Initialize on page load
    loadGameData();
});
