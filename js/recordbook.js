// League Record Book - Main Controller

document.addEventListener('DOMContentLoaded', function() {
    initRecordBook();
});

// Global variables
let leagueScoreData = [];

// Initialize record book
function initRecordBook() {
    console.log('Initializing record book...');
    
    // Add event listeners to tabs
    initTabNavigation();
    
    // Load league score data
    loadLeagueScoreData();
}

// Initialize tab navigation
function initTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            
            // Add active class to clicked button and corresponding section
            button.classList.add('active');
            document.getElementById(tab).classList.add('active');
            
            // Update URL parameter
            setUrlParameter('tab', tab);
        });
    });
    
    // Set initial active tab from URL or default
    const urlTab = getUrlParameter('tab');
    if (urlTab) {
        const tabButton = document.querySelector(`.tab-button[data-tab="${urlTab}"]`);
        if (tabButton) {
            tabButton.click();
        } else {
            // If invalid tab in URL, default to first tab
            tabButtons[0].click();
        }
    } else {
        // Default to first tab
        tabButtons[0].click();
    }
}

// Load league score data
function loadLeagueScoreData() {
    console.log('Loading league score data...');
    
    // Show loading state
    const loadingContainer = document.getElementById('loadingContainer');
    const recordbookContent = document.getElementById('recordbookContent');
    
    if (loadingContainer && recordbookContent) {
        loadingContainer.style.display = 'flex';
        recordbookContent.style.display = 'none';
    }
    
    // Fetch the league score data
    fetch('../data/league_score_data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load league score data');
            }
            return response.json();
        })
        .then(data => {
            leagueScoreData = data;
            
            // Process data for record book
            processLeagueRecords();
            
            // Process data for 200+ point games
            process200PlusGames();
            
            // Load any additional record book data
            loadAdditionalRecordBookData();
            
            // Hide loading state
            if (loadingContainer && recordbookContent) {
                loadingContainer.style.display = 'none';
                recordbookContent.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error loading league score data:', error);
            
            // Hide loading state and show error message
            if (loadingContainer && recordbookContent) {
                loadingContainer.style.display = 'none';
                recordbookContent.style.display = 'block';
            }
            
            // Show error states
            showEmptyStates();
        });
}

// Process league score data for records
function processLeagueRecords() {
    console.log('Processing league records from game data...');
    
    // Create data structures for tracking records
    const teamStats = {};
    const seasonStats = {};
    const weeklyPerformances = {};
    
    // Process each game in the league data
    leagueScoreData.forEach(game => {
        if (!game["Team"] || !game["Opponent"]) return;
        
        // Skip entries with empty or missing score data
        if (!game["Team Score"] || !game["Opponent Score"] || 
            game["Team Score"] === "" || game["Opponent Score"] === "") {
            return;
        }
        
        const team = game["Team"];
        const opponent = game["Opponent"];
        const teamScore = parseFloat(game["Team Score"]);
        const opponentScore = parseFloat(game["Opponent Score"]);
        const season = game["Season"];
        const week = game["Week"];
        const seasonPeriod = game["Season Period"];
        
        // Skip if any required values are invalid after parsing
        if (isNaN(teamScore) || isNaN(opponentScore)) {
            return;
        }
        
        const isWin = teamScore > opponentScore;
        
        // Track game context for tooltips
        const gameContext = `${season} Week ${week}`;
        
        // Initialize team stats if not exists
        if (!teamStats[team]) {
            teamStats[team] = {
                wins: 0,
                losses: 0,
                weeklyTopScores: 0,
                weeklyTop3Scores: 0,
                weeklyWorstScores: 0,
                weeklyBottom3Scores: 0,
                championships: 0,
                chumpionships: 0,
                championshipAppearances: 0,
                chumpionshipAppearances: 0,
                winStreak: 0,
                currentWinStreak: 0,
                losingStreak: 0,
                currentLosingStreak: 0,
                streak150Plus: 0,
                currentStreak150Plus: 0,
                streakUnder100: 0,
                currentStreakUnder100: 0,
                // Add context tracking for tooltips
                winContexts: [],
                lossContexts: [],
                streakContexts: [],
                gameScores: []
            };
        }
        
        // Track individual game scores with context
        teamStats[team].gameScores.push({
            score: teamScore,
            context: gameContext,
            season: season,
            week: week
        });
        
        // Initialize season stats if not exists
        if (!seasonStats[season]) {
            seasonStats[season] = {};
        }
        
        if (!seasonStats[season][team]) {
            seasonStats[season][team] = {
                wins: 0,
                losses: 0
            };
        }
        
        // Update win/loss records
        if (isWin) {
            teamStats[team].wins++;
            teamStats[team].winContexts.push(gameContext);
            seasonStats[season][team].wins++;
            teamStats[team].currentWinStreak++;
            teamStats[team].currentLosingStreak = 0;
            
            // Update win streak
            if (teamStats[team].currentWinStreak > teamStats[team].winStreak) {
                teamStats[team].winStreak = teamStats[team].currentWinStreak;
                // Track the range of games that made up this streak
                teamStats[team].winStreakContext = gameContext;
            }
        } else {
            teamStats[team].losses++;
            teamStats[team].lossContexts.push(gameContext);
            seasonStats[season][team].losses++;
            teamStats[team].currentLosingStreak++;
            teamStats[team].currentWinStreak = 0;
            
            // Update losing streak
            if (teamStats[team].currentLosingStreak > teamStats[team].losingStreak) {
                teamStats[team].losingStreak = teamStats[team].currentLosingStreak;
                teamStats[team].losingStreakContext = gameContext;
            }
        }
        
        // Update streak for 150+ points
        if (teamScore >= 150) {
            teamStats[team].currentStreak150Plus++;
            if (teamStats[team].currentStreak150Plus > teamStats[team].streak150Plus) {
                teamStats[team].streak150Plus = teamStats[team].currentStreak150Plus;
            }
        } else {
            teamStats[team].currentStreak150Plus = 0;
        }
        
        // Update streak for under 100 points
        if (teamScore < 100) {
            teamStats[team].currentStreakUnder100++;
            if (teamStats[team].currentStreakUnder100 > teamStats[team].streakUnder100) {
                teamStats[team].streakUnder100 = teamStats[team].currentStreakUnder100;
            }
        } else {
            teamStats[team].currentStreakUnder100 = 0;
        }
        
        // Track weekly performances
        const weekKey = `${season}-${week}`;
        if (!weeklyPerformances[weekKey]) {
            weeklyPerformances[weekKey] = [];
        }
        
        // Add this game's score to the weekly performances
        weeklyPerformances[weekKey].push({
            team: team,
            score: teamScore
        });
        
        // Check championship/chumpionship games
        if (seasonPeriod === "Championship") {
            // Championship game
            teamStats[team].championshipAppearances++;
            if (isWin) {
                teamStats[team].championships++;
            }
        } else if (seasonPeriod === "Chumpionship") {
            // Chumpionship game
            teamStats[team].chumpionshipAppearances++;
            if (!isWin) {
                teamStats[team].chumpionships++;
            }
        }
    });
    
    // Process weekly performances
    Object.keys(weeklyPerformances).forEach(weekKey => {
        const weekScores = weeklyPerformances[weekKey].sort((a, b) => b.score - a.score);
        
        // Top score team
        if (weekScores.length > 0) {
            const topTeam = weekScores[0].team;
            teamStats[topTeam].weeklyTopScores++;
        }
        
        // Top 3 scores
        for (let i = 0; i < Math.min(3, weekScores.length); i++) {
            const team = weekScores[i].team;
            teamStats[team].weeklyTop3Scores++;
        }
        
        // Worst score team
        if (weekScores.length > 0) {
            const worstTeam = weekScores[weekScores.length - 1].team;
            teamStats[worstTeam].weeklyWorstScores++;
        }
        
        // Bottom 3 scores
        for (let i = Math.max(0, weekScores.length - 3); i < weekScores.length; i++) {
            const team = weekScores[i].team;
            teamStats[team].weeklyBottom3Scores++;
        }
    });
    
    // Convert team stats to arrays for record display
    const mostWinsOverall = Object.entries(teamStats)
        .map(([team, stats]) => ({ 
            team, 
            value: stats.wins,
            context: stats.winContexts.length > 0 ? `${stats.winContexts[0]} - ${stats.winContexts[stats.winContexts.length - 1]}` : 'Multiple seasons'
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    
    const mostLossesOverall = Object.entries(teamStats)
        .map(([team, stats]) => ({ 
            team, 
            value: stats.losses,
            context: stats.lossContexts.length > 0 ? `${stats.lossContexts[0]} - ${stats.lossContexts[stats.lossContexts.length - 1]}` : 'Multiple seasons'
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    
    // Best win percentage (minimum 20 games)
    const bestWinPctOverall = Object.entries(teamStats)
        .filter(([_, stats]) => (stats.wins + stats.losses) >= 20)
        .map(([team, stats]) => ({
            team,
            value: parseFloat((stats.wins / (stats.wins + stats.losses)).toFixed(3))
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    
    // Worst win percentage (minimum 20 games)
    const worstWinPctOverall = Object.entries(teamStats)
        .filter(([_, stats]) => (stats.wins + stats.losses) >= 20)
        .map(([team, stats]) => ({
            team,
            value: parseFloat((stats.wins / (stats.wins + stats.losses)).toFixed(3))
        }))
        .sort((a, b) => a.value - b.value)
        .slice(0, 3);
    
    // Process season stats
    const seasonWinsArray = [];
    const seasonLossesArray = [];
    const seasonWinPctArray = [];
    
    Object.entries(seasonStats).forEach(([season, teams]) => {
        Object.entries(teams).forEach(([team, stats]) => {
            // Most wins in a season
            seasonWinsArray.push({
                team,
                season,
                value: stats.wins
            });
            
            // Most losses in a season
            seasonLossesArray.push({
                team,
                season,
                value: stats.losses
            });
            
            // Only include teams that played at least 10 games in a season
            if ((stats.wins + stats.losses) >= 10) {
                seasonWinPctArray.push({
                    team,
                    season,
                    value: parseFloat((stats.wins / (stats.wins + stats.losses)).toFixed(3))
                });
            }
        });
    });
    
    const mostWinsSeason = seasonWinsArray
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map(item => ({ team: `${item.team} (${item.season})`, value: item.value }));
    
    const mostLossesSeason = seasonLossesArray
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map(item => ({ team: `${item.team} (${item.season})`, value: item.value }));
    
    const bestWinPctSeason = seasonWinPctArray
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map(item => ({ team: `${item.team} (${item.season})`, value: item.value }));
    
    const worstWinPctSeason = seasonWinPctArray
        .sort((a, b) => a.value - b.value)
        .slice(0, 3)
        .map(item => ({ team: `${item.team} (${item.season})`, value: item.value }));
    
    // Weekly performance records
    const mostWeeklyTopScores = Object.entries(teamStats)
        .map(([team, stats]) => ({ 
            team, 
            value: stats.weeklyTopScores,
            context: 'Multiple weeks'
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    
    const mostWeeklyTop3Scores = Object.entries(teamStats)
        .map(([team, stats]) => ({ 
            team, 
            value: stats.weeklyTop3Scores,
            context: 'Multiple weeks'
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    
    const mostWeeklyWorstScores = Object.entries(teamStats)
        .map(([team, stats]) => ({ 
            team, 
            value: stats.weeklyWorstScores,
            context: 'Multiple weeks'
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    
    const mostWeeklyBottom3Scores = Object.entries(teamStats)
        .map(([team, stats]) => ({ 
            team, 
            value: stats.weeklyBottom3Scores,
            context: 'Multiple weeks'
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    
    // Championship records
    const mostChampionships = Object.entries(teamStats)
        .map(([team, stats]) => ({ team, value: stats.championships }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    
    const mostChumpionships = Object.entries(teamStats)
        .map(([team, stats]) => ({ team, value: stats.chumpionships }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    
    const mostChampionshipAppearances = Object.entries(teamStats)
        .map(([team, stats]) => ({ team, value: stats.championshipAppearances }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    
    const mostChumpionshipAppearances = Object.entries(teamStats)
        .map(([team, stats]) => ({ team, value: stats.chumpionshipAppearances }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    
    // Streak records
    const longestWinStreak = Object.entries(teamStats)
        .map(([team, stats]) => ({ 
            team, 
            value: stats.winStreak,
            streakContext: stats.winStreakContext || 'Multiple games'
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    
    const longestLosingStreak = Object.entries(teamStats)
        .map(([team, stats]) => ({ 
            team, 
            value: stats.losingStreak,
            streakContext: stats.losingStreakContext || 'Multiple games'
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    
    const longest150PlusStreak = Object.entries(teamStats)
        .map(([team, stats]) => ({ 
            team, 
            value: stats.streak150Plus,
            streakContext: 'Multiple games'
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    
    const longestUnder100Streak = Object.entries(teamStats)
        .map(([team, stats]) => ({ 
            team, 
            value: stats.streakUnder100,
            streakContext: 'Multiple games'
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    
    // Calculate single game records
    const singleGameRecords = calculateSingleGameRecords();
    
    // Calculate player records (async)
    calculatePlayerRecords().then(playerRecords => {
        // Update player records
        updateRecord('mostUniquePlayersOverall', playerRecords.mostUniquePlayersOverall);
        updateRecord('mostUniquePlayersSeason', playerRecords.mostUniquePlayersSeason);
        updateRecord('fewestUniquePlayersOverall', playerRecords.fewestUniquePlayersOverall);
        updateRecord('fewestUniquePlayersSeason', playerRecords.fewestUniquePlayersSeason);
    }).catch(error => {
        console.error('Error calculating player records:', error);
        // Set empty records if calculation fails
        updateRecord('mostUniquePlayersOverall', []);
        updateRecord('mostUniquePlayersSeason', []);
        updateRecord('fewestUniquePlayersOverall', []);
        updateRecord('fewestUniquePlayersSeason', []);
    });
    
    // Update the UI with calculated records
    updateRecord('mostWinsOverall', mostWinsOverall);
    updateRecord('mostWinsSeason', mostWinsSeason);
    updateRecord('mostLossesOverall', mostLossesOverall);
    updateRecord('mostLossesSeason', mostLossesSeason);
    
    updateRecord('bestWinPctOverall', bestWinPctOverall);
    updateRecord('bestWinPctSeason', bestWinPctSeason);
    updateRecord('worstWinPctOverall', worstWinPctOverall);
    updateRecord('worstWinPctSeason', worstWinPctSeason);
    
    updateRecord('mostWeeklyTopScores', mostWeeklyTopScores);
    updateRecord('mostWeeklyTop3Scores', mostWeeklyTop3Scores);
    updateRecord('mostWeeklyWorstScores', mostWeeklyWorstScores);
    updateRecord('mostWeeklyBottom3Scores', mostWeeklyBottom3Scores);
    
    updateRecord('mostChampionships', mostChampionships);
    updateRecord('mostChumpionships', mostChumpionships);
    updateRecord('mostChampionshipAppearances', mostChampionshipAppearances);
    updateRecord('mostChumpionshipAppearances', mostChumpionshipAppearances);
    
    updateRecord('longestWinStreak', longestWinStreak);
    updateRecord('longestLosingStreak', longestLosingStreak);
    updateRecord('longest150PlusStreak', longest150PlusStreak);
    updateRecord('longestUnder100Streak', longestUnder100Streak);
    
    // Update single game records
    updateRecord('highestScore', singleGameRecords.highest);
    updateRecord('lowestScore', singleGameRecords.lowest);
    updateRecord('largestBlowout', singleGameRecords.largestBlowout);
    updateRecord('closestMatchup', singleGameRecords.closestMatchup);
}

// Calculate single game records from league score data
function calculateSingleGameRecords() {
    // Check if league score data is available and not empty
    if (!leagueScoreData || !Array.isArray(leagueScoreData) || leagueScoreData.length === 0) {
        console.warn('No league score data available for single game records');
        return {
            highest: [],
            lowest: [],
            largestBlowout: [],
            closestMatchup: []
        };
    }
    
    const allScores = [];
    const allBlowouts = [];
    const allClosestGames = [];
    const processedGames = new Set(); // Track unique games to avoid duplicates
    
    // Process all games to collect scores and differences
    leagueScoreData.forEach(game => {
        if (!game["Team"] || !game["Opponent"]) return;
        
        // Skip entries with empty or missing score data
        if (!game["Team Score"] || !game["Opponent Score"] || !game["Score Diff"] || 
            game["Team Score"] === "" || game["Opponent Score"] === "" || game["Score Diff"] === "") {
            return;
        }
        
        const team = game["Team"];
        const teamScore = parseFloat(game["Team Score"]);
        const opponentScore = parseFloat(game["Opponent Score"]);
        const scoreDiff = Math.abs(parseFloat(game["Score Diff"]));
        const season = game["Season"];
        const week = game["Week"];
        
        // Skip if any required values are invalid
        if (isNaN(teamScore) || isNaN(opponentScore) || isNaN(scoreDiff)) {
            return;
        }
        
        // Add team score
        allScores.push({
            team: team,
            value: teamScore,
            context: `Week ${week}, ${season} vs ${game["Opponent"]} (${teamScore} - ${opponentScore})`,
            gameData: {
                season: season,
                week: week,
                team: team,
                opponent: game["Opponent"]
            }
        });
        
        // For blowouts and closest games, determine winner/loser and create game entry
        const isTeamWinner = teamScore > opponentScore;
        const winner = isTeamWinner ? team : game["Opponent"];
        const loser = isTeamWinner ? game["Opponent"] : team;
        const winnerScore = isTeamWinner ? teamScore : opponentScore;
        const loserScore = isTeamWinner ? opponentScore : teamScore;
        
        // Create unique game identifier to avoid duplicates
        const gameKey = `${season}-${week}-${Math.min(teamScore, opponentScore)}-${Math.max(teamScore, opponentScore)}`;
        
        // Add game entry for blowouts and closest games (only once per game)
        if (!processedGames.has(gameKey)) {
            processedGames.add(gameKey);
            
            const gameEntry = {
                team: `${winner} vs ${loser}`,
                value: scoreDiff,
                context: `Week ${week}, ${season} (${winnerScore} - ${loserScore})`,
                gameData: {
                    season: season,
                    week: week,
                    team: winner,
                    opponent: loser
                }
            };
            
            allBlowouts.push(gameEntry);
            allClosestGames.push(gameEntry);
        }
    });
    
    // Sort and get top 3 for each category
    const highestScores = allScores
        .sort((a, b) => b.value - a.value)
        .slice(0, 10) // Get more to handle potential ties
        .map(entry => ({ team: entry.team, value: entry.value, gameData: entry.gameData }));
    
    const lowestScores = allScores
        .sort((a, b) => a.value - b.value)
        .slice(0, 10) // Get more to handle potential ties
        .map(entry => ({ team: entry.team, value: entry.value, gameData: entry.gameData }));
    
    const largestBlowouts = allBlowouts
        .sort((a, b) => b.value - a.value)
        .slice(0, 3) // Only get top 3 games
        .map(entry => ({ team: entry.team, value: entry.value, gameData: entry.gameData }));
    
    const closestMatchups = allClosestGames
        .filter(entry => entry.value > 0) // Exclude exact ties (0 difference)
        .sort((a, b) => a.value - b.value)
        .slice(0, 3) // Only get top 3 games
        .map(entry => ({ team: entry.team, value: entry.value, gameData: entry.gameData }));
    
    return {
        highest: highestScores,
        lowest: lowestScores,
        largestBlowout: largestBlowouts,
        closestMatchup: closestMatchups
    };
}

// Calculate player records from roster data
function calculatePlayerRecords() {
    console.log('Calculating player records...');
    
    const teamPlayerStats = {};
    const teamSeasonPlayerStats = {};
    const teamGameCounts = {};
    const teamSeasonGameCounts = {};
    
    // Use all available seasons including current year
    const seasons = ['2019', '2020', '2021', '2022', '2023', '2024', '2025'];
    
    // Function to load roster data for a specific season and week
    const loadRosterData = async (season, week) => {
        try {
            const response = await fetch(`../data/rosters/${season}/week_${week}_rosters.json`);
            if (!response.ok) throw new Error(`Failed to load roster data for ${season} week ${week}`);
            return await response.json();
        } catch (error) {
            console.log(`No roster data for ${season} week ${week}`);
            return null;
        }
    };
    
    // Since this needs to be async, we'll return a promise that resolves to the records
    return Promise.all(seasons.map(async (season) => {
        // Sample weeks to check for roster data (beginning, middle, end of season)
        const sampleWeeks = [1, 6, 10, 14];
        
        for (const week of sampleWeeks) {
            const rosterData = await loadRosterData(season, week);
            
            if (rosterData && rosterData.teams) {
                rosterData.teams.forEach(teamData => {
                    // Use owner name if available, fallback to team_name only if owner is missing
                    const teamName = teamData.owner || teamData.team_name;
                    
                    // Skip if we don't have a valid team name
                    if (!teamName) {
                        console.log(`Skipping team with no name for team_id ${teamData.team_id} in ${season}`);
                        return;
                    }
                    
                    // Initialize overall stats if not exists
                    if (!teamPlayerStats[teamName]) {
                        teamPlayerStats[teamName] = new Set();
                        teamGameCounts[teamName] = 0;
                    }
                    
                    // Initialize season stats if not exists
                    if (!teamSeasonPlayerStats[teamName]) {
                        teamSeasonPlayerStats[teamName] = {};
                        teamSeasonGameCounts[teamName] = {};
                    }
                    if (!teamSeasonPlayerStats[teamName][season]) {
                        teamSeasonPlayerStats[teamName][season] = new Set();
                        teamSeasonGameCounts[teamName][season] = 0;
                    }
                    
                    // Count this as a game for overall and season tracking
                    teamGameCounts[teamName]++;
                    teamSeasonGameCounts[teamName][season]++;
                    
                    // Process roster for this team
                    if (teamData.roster && Array.isArray(teamData.roster)) {
                        teamData.roster.forEach(player => {
                            if (player && player.name && player.name.trim()) {
                                teamPlayerStats[teamName].add(player.name.trim());
                                teamSeasonPlayerStats[teamName][season].add(player.name.trim());
                            }
                        });
                    }
                });
            }
        }
    })).then(() => {
        // Convert Sets to counts and create records with minimum game requirements
        const overallPlayerCounts = Object.entries(teamPlayerStats)
            .filter(([team, playerSet]) => teamGameCounts[team] >= 8) // Minimum 8 samples (2+ seasons worth)
            .map(([team, playerSet]) => ({
                team: team,
                value: playerSet.size
            }));
        
        // Find season records for each team with minimum game requirements
        const seasonPlayerCounts = [];
        Object.entries(teamSeasonPlayerStats).forEach(([team, seasons]) => {
            Object.entries(seasons).forEach(([season, playerSet]) => {
                if (teamSeasonGameCounts[team][season] >= 2) { // Minimum 2 samples per season
                    seasonPlayerCounts.push({
                        team: `${team} (${season})`,
                        value: playerSet.size,
                        context: `${season} Season`
                    });
                }
            });
        });
        
        // Sort and get top 3 for each category
        const mostUniquePlayersOverall = overallPlayerCounts
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);
        
        const fewestUniquePlayersOverall = overallPlayerCounts
            .filter(entry => entry.value > 0) // Only include teams with player data
            .sort((a, b) => a.value - b.value)
            .slice(0, 3);
        
        const mostUniquePlayersSeason = seasonPlayerCounts
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);
        
        const fewestUniquePlayersSeason = seasonPlayerCounts
            .filter(entry => entry.value > 0) // Only include seasons with player data
            .sort((a, b) => a.value - b.value)
            .slice(0, 3);
        
        console.log('Game counts debug:', {
            teamGameCounts: teamGameCounts,
            teamSeasonGameCounts: teamSeasonGameCounts
        });
        
        console.log('Player records calculated:', {
            mostOverall: mostUniquePlayersOverall,
            fewestOverall: fewestUniquePlayersOverall,
            mostSeason: mostUniquePlayersSeason,
            fewestSeason: fewestUniquePlayersSeason
        });
        
        return {
            mostUniquePlayersOverall: mostUniquePlayersOverall,
            mostUniquePlayersSeason: mostUniquePlayersSeason,
            fewestUniquePlayersOverall: fewestUniquePlayersOverall,
            fewestUniquePlayersSeason: fewestUniquePlayersSeason
        };
    });
}

// Helper function to create tooltip content
function createTooltipContent(recordData, recordName) {
    const isSingleGameRecord = ['highestScore', 'lowestScore', 'largestBlowout', 'closestMatchup'].includes(recordName);
    
    if (isSingleGameRecord && recordData.gameData) {
        return `${recordData.gameData.season} Week ${recordData.gameData.week}`;
    }
    
    // Handle other record types with context
    if (recordData.context) {
        return recordData.context;
    }
    
    // For season-specific records, extract from team name
    if (recordData.team && recordData.team.includes('(') && recordData.team.includes(')')) {
        const match = recordData.team.match(/\((\d{4})\)/);
        if (match) {
            return `${match[1]} Season`;
        }
    }
    
    // For streak records, show range if available
    if (recordName.includes('Streak') || recordName.includes('streak')) {
        return recordData.streakContext || 'Multiple games';
    }
    
    // Default: show that it's across multiple games/seasons
    return 'Multiple games/seasons';
}

// Helper function to add tooltip to element
function addTooltipToElement(element, tooltipText) {
    if (!tooltipText) return;
    
    element.classList.add('record-tooltip');
    
    // Remove existing tooltip if any
    const existingTooltip = element.querySelector('.tooltip-content');
    if (existingTooltip) {
        existingTooltip.remove();
    }
    
    // Create tooltip element
    const tooltipElement = document.createElement('div');
    tooltipElement.className = 'tooltip-content';
    tooltipElement.textContent = tooltipText;
    element.appendChild(tooltipElement);
    
    // Add timer-based hover functionality to avoid conflicts
    let hoverTimer = null;
    
    element.addEventListener('mouseenter', () => {
        hoverTimer = setTimeout(() => {
            element.classList.add('show-tooltip');
        }, 1000); // 1 second delay
    });
    
    element.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimer);
        element.classList.remove('show-tooltip');
    });
}

// Update record display with data
function updateRecord(recordName, recordData) {
    // Ensure we have at least 3 entries
    while (recordData.length < 3) {
        recordData.push({ team: 'No Record', value: 0 });
    }
    
    // Format values based on record type
    const isRatioRecord = recordName.includes('WinPct');
    const isSingleGameRecord = ['highestScore', 'lowestScore', 'largestBlowout', 'closestMatchup'].includes(recordName);
    
    // Function to format value based on record type
    const formatValue = (value) => {
        if (isRatioRecord) {
            return value.toFixed(3);
        } else if (isSingleGameRecord) {
            return value.toFixed(2);
        } else {
            return value;
        }
    };
    
    // Check for ties (more than 3 teams with same value)
    let hasTies = false;
    let tiedTeams = [];
    
    // If there are more than 3 entries and the 3rd and 4th entries have the same value
    if (recordData.length > 3 && recordData[2].value === recordData[3].value) {
        hasTies = true;
        
        // Find all tied teams with the same value as the 3rd place
        const tiedValue = recordData[2].value;
        tiedTeams = recordData.slice(3).filter(record => record.value === tiedValue);
    }
    
    // Update record holder
    const holder = document.querySelector(`[data-record="${recordName}"][data-position="holder"]`);
    if (holder) {
        const nameElement = holder.querySelector('.record-name');
        const valueElement = holder.querySelector('.record-value');
        
        if (nameElement && valueElement) {
            nameElement.textContent = recordData[0].team;
            valueElement.textContent = formatValue(recordData[0].value);
            
            // Add tooltip
            const tooltipText = createTooltipContent(recordData[0], recordName);
            addTooltipToElement(nameElement, tooltipText);
            
            // Add click handler for single game records
            if (isSingleGameRecord && recordData[0].gameData) {
                nameElement.style.cursor = 'pointer';
                nameElement.style.textDecoration = 'underline';
                nameElement.onclick = () => navigateToGameDetails(recordData[0].gameData);
            }
        }
    }
    
    // Update first runner-up
    const runnerUp1 = document.querySelector(`[data-record="${recordName}"][data-position="runner-up-1"]`);
    if (runnerUp1) {
        const nameElement = runnerUp1.querySelector('.record-name');
        const valueElement = runnerUp1.querySelector('.record-value');
        
        if (nameElement && valueElement) {
            nameElement.textContent = recordData[1].team;
            valueElement.textContent = formatValue(recordData[1].value);
            
            // Add tooltip
            const tooltipText = createTooltipContent(recordData[1], recordName);
            addTooltipToElement(nameElement, tooltipText);
            
            // Add click handler for single game records
            if (isSingleGameRecord && recordData[1].gameData) {
                nameElement.style.cursor = 'pointer';
                nameElement.style.textDecoration = 'underline';
                nameElement.onclick = () => navigateToGameDetails(recordData[1].gameData);
            }
        }
    }
    
    // Update second runner-up
    const runnerUp2 = document.querySelector(`[data-record="${recordName}"][data-position="runner-up-2"]`);
    if (runnerUp2) {
        const nameElement = runnerUp2.querySelector('.record-name');
        const valueElement = runnerUp2.querySelector('.record-value');
        
        if (nameElement && valueElement) {
            nameElement.textContent = recordData[2].team;
            valueElement.textContent = formatValue(recordData[2].value);
            
            // Add tooltip
            const tooltipText = createTooltipContent(recordData[2], recordName);
            addTooltipToElement(nameElement, tooltipText);
            
            // Add click handler for single game records
            if (isSingleGameRecord && recordData[2].gameData) {
                nameElement.style.cursor = 'pointer';
                nameElement.style.textDecoration = 'underline';
                nameElement.onclick = () => navigateToGameDetails(recordData[2].gameData);
            }
        }
        
        // Add "Show More" button if there are ties
        if (hasTies && tiedTeams.length > 0) {
            // Get parent card
            const recordCard = runnerUp2.closest('.record-card');
            
            // Check if show more button already exists
            let showMoreContainer = recordCard.querySelector('.show-more-container');
            
            if (!showMoreContainer) {
                // Create show more container
                showMoreContainer = document.createElement('div');
                showMoreContainer.className = 'show-more-container';
                recordCard.appendChild(showMoreContainer);
            }
            
            // Update content
            showMoreContainer.innerHTML = `
                <button class="show-more-btn" onclick="toggleTiedTeams('${recordName}')">
                    Show ${tiedTeams.length} more with same value
                </button>
                <div id="tied-teams-${recordName}" class="tied-teams-container" style="display: none;">
                    ${tiedTeams.map(team => {
                        const tooltipText = createTooltipContent(team, recordName);
                        const tooltipHtml = tooltipText ? `<div class="tooltip-content">${tooltipText}</div>` : '';
                        return `
                        <div class="record-runner-up tied-team">
                            <div class="record-name ${isSingleGameRecord && team.gameData ? 'clickable-game-link record-tooltip' : (tooltipText ? 'record-tooltip' : '')}" 
                                 ${isSingleGameRecord && team.gameData ? `onclick="navigateToGameDetails(${JSON.stringify(team.gameData).replace(/"/g, '&quot;')})" style="cursor: pointer; text-decoration: underline;"` : ''}>
                                ${team.team}
                                ${tooltipHtml}
                            </div>
                            <div class="record-value">${formatValue(team.value)}</div>
                        </div>
                    `}).join('')}
                </div>
            `;
        } else {
            // Remove show more button if it exists but is no longer needed
            const recordCard = runnerUp2.closest('.record-card');
            const showMoreContainer = recordCard.querySelector('.show-more-container');
            if (showMoreContainer) {
                recordCard.removeChild(showMoreContainer);
            }
        }
    }
}

// Toggle tied teams visibility
function toggleTiedTeams(recordName) {
    const container = document.getElementById(`tied-teams-${recordName}`);
    const button = container.previousElementSibling;
    
    if (container.style.display === 'none') {
        container.style.display = 'block';
        button.textContent = 'Show less';
    } else {
        container.style.display = 'none';
        button.textContent = `Show ${container.childElementCount} more with same value`;
    }
}

// Make toggleTiedTeams available globally
window.toggleTiedTeams = toggleTiedTeams;

// Process 200+ point games from league data
function process200PlusGames() {
    console.log('Processing 200+ point games...');
    
    // Filter for games with 200+ points scored
    const highScoreGames = [];
    
    leagueScoreData.forEach(game => {
        if (!game["Team"] || !game["Opponent"]) return;
        
        const teamScore = parseFloat(game["Team Score"]) || 0;
        
        // Only include games where a team scored 200+ points
        if (teamScore >= 200) {
            highScoreGames.push({
                id: game["Game ID"],
                team: game["Team"],
                score: teamScore,
                opponent: game["Opponent"],
                opponentScore: parseFloat(game["Opponent Score"]) || 0,
                season: game["Season"],
                week: game["Week"],
                seasonPeriod: game["Season Period"]
            });
        }
    });
    
    // Sort by score (highest first)
    highScoreGames.sort((a, b) => b.score - a.score);
    
    // Display high score games in the table
    displayHighScoreGames(highScoreGames);
}

// Display high score games in the table
function displayHighScoreGames(games) {
    const tableContainer = document.getElementById('high-score-table');
    if (!tableContainer) return;
    
    if (!games || games.length === 0) {
        tableContainer.innerHTML = `
            <div class="empty-message">
                <p>No 200+ point games found.</p>
            </div>
        `;
        disablePagination();
        return;
    }
    
    // Initialize pagination - changed from 10 to 8 per page
    const gamesPerPage = 8;
    let currentPage = 1;
    const totalPages = Math.ceil(games.length / gamesPerPage);
    
    // Function to render a page of games
    function renderPage(page) {
        const startIndex = (page - 1) * gamesPerPage;
        const endIndex = Math.min(startIndex + gamesPerPage, games.length);
        const pageGames = games.slice(startIndex, endIndex);
        
        let html = '';
        
        pageGames.forEach((game, index) => {
            const absoluteIndex = startIndex + index + 1;
            const result = game.score > game.opponentScore ? 'W' : 'L';
            
            html += `
                <div class="high-score-row">
                    <div class="row-cell">${absoluteIndex}</div>
                    <div class="row-cell">${game.team}</div>
                    <div class="row-cell score">${game.score.toFixed(1)}</div>
                    <div class="row-cell">${game.opponent}</div>
                    <div class="row-cell">${game.opponentScore.toFixed(1)}</div>
                    <div class="row-cell">${game.season}</div>
                    <div class="row-cell">${game.week}</div>
                    <div class="row-cell">
                        <button class="action-btn" onclick="viewGame(${game.id})">View</button>
                    </div>
                </div>
            `;
        });
        
        tableContainer.innerHTML = html;
        
        // Update pagination info
        const paginationInfo = document.getElementById('high-score-pagination-info');
        if (paginationInfo) {
            paginationInfo.textContent = `Page ${page} of ${totalPages}`;
        }
        
        // Update pagination buttons
        updatePaginationButtons(page, totalPages);
    }
    
    // Render first page
    renderPage(1);
    
    // Add pagination event listeners
    const firstPageBtn = document.getElementById('high-score-first-page');
    const prevPageBtn = document.getElementById('high-score-prev-page');
    const nextPageBtn = document.getElementById('high-score-next-page');
    const lastPageBtn = document.getElementById('high-score-last-page');
    
    if (firstPageBtn) {
        firstPageBtn.addEventListener('click', () => {
            currentPage = 1;
            renderPage(currentPage);
        });
    }
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPage(currentPage);
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderPage(currentPage);
            }
        });
    }
    
    if (lastPageBtn) {
        lastPageBtn.addEventListener('click', () => {
            currentPage = totalPages;
            renderPage(currentPage);
        });
    }
}

// Update pagination buttons state
function updatePaginationButtons(currentPage, totalPages) {
    const firstPageBtn = document.getElementById('high-score-first-page');
    const prevPageBtn = document.getElementById('high-score-prev-page');
    const nextPageBtn = document.getElementById('high-score-next-page');
    const lastPageBtn = document.getElementById('high-score-last-page');
    
    if (firstPageBtn) firstPageBtn.disabled = currentPage === 1;
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
    if (lastPageBtn) lastPageBtn.disabled = currentPage === totalPages;
}

// Disable pagination buttons
function disablePagination() {
    const paginationButtons = document.querySelectorAll('.pagination-btn');
    paginationButtons.forEach(button => {
        button.disabled = true;
    });
    
    const paginationInfo = document.getElementById('high-score-pagination-info');
    if (paginationInfo) {
        paginationInfo.textContent = 'Page 0 of 0';
    }
}

// Load additional record book data that isn't from league score data
function loadAdditionalRecordBookData() {
    // First try to load team abbreviations for the member timeline
    loadTeamAbbreviationsForTimeline();
    
    // This could be used to load timeline and drum corps data
    fetch('../data/recordbook/recordbook_data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load additional record book data');
            }
            return response.json();
        })
        .then(data => {
            // Process member timeline data (will override team abbreviations data if available)
            if (data.memberTimeline && data.memberTimeline.length > 0) {
                processMemberTimeline(data.memberTimeline);
            }
            
            // Process drum corps data
            loadDrumCorpsData();
        })
        .catch(error => {
            console.error('Error loading additional record book data:', error);
            
            // Show empty states for other sections
            showEmptyDrumCorps();
            
            // Still try to load drum corps data
            loadDrumCorpsData();
        });
}

// Load Drum Corps data from DCI.json
function loadDrumCorpsData() {
    fetch('../data/dci.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load DCI data');
            }
            return response.json();
        })
        .then(data => {
            if (data.DCI_Corps) {
                processDrumCorps(data.DCI_Corps);
            } else {
                showEmptyDrumCorps();
            }
        })
        .catch(error => {
            console.error('Error loading DCI data:', error);
            showEmptyDrumCorps();
        });
}

// Load team abbreviations and use for member timeline
function loadTeamAbbreviationsForTimeline() {
    fetch('../data/team_abbreviations.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load team abbreviations');
            }
            return response.json();
        })
        .then(data => {
            if (data.teams && Array.isArray(data.teams)) {
                // Process team ownership data as a timeline
                processTeamTimeshare(data.teams);
            }
        })
        .catch(error => {
            console.error('Error loading team abbreviations for timeshare:', error);
            showEmptyMemberTimeline();
        });
}

// Process team ownership data as a timeline
function processTeamTimeshare(teams) {
    console.log('Processing team ownership timeline data');
    
    const container = document.getElementById('memberTimelineContainer');
    if (!container) return;
    
    if (!teams || teams.length === 0) {
        container.innerHTML = `
            <div class="empty-message">
                <p>No team ownership data available.</p>
            </div>
        `;
        return;
    }
    
    // FIXED YEAR CALCULATION - Get actual min year from data and current year
    const currentYear = new Date().getFullYear();
    let minYear = currentYear; // Start high and find minimum
    
    teams.forEach(team => {
        if (team.abbreviations && team.abbreviations.FirstSeason) {
            const firstSeason = parseInt(team.abbreviations.FirstSeason);
            if (!isNaN(firstSeason) && firstSeason > 0) {
                minYear = Math.min(minYear, firstSeason);
            }
        }
    });
    
    console.log(`Actual timeline data range: ${minYear} to ${currentYear}`);
    
    // Use these exact years - no rounding to decades
    const startYear = minYear;
    const endYear = currentYear;
    
    // Create timeline header
    let html = `
        <div class="visual-timeline-container">
            <h2 class="timeline-title">TIMELINES OF FFL TEAMS THROUGH THE YEARS</h2>
            <div class="timeline-grid">
                <div class="timeline-headers">
                    <div class="timeline-team-header">TEAM</div>
                    <div class="timeline-years-header">
    `;
    
    // Add year markers with appropriate spacing
    const yearSpan = endYear - startYear;
    // Adjust marker frequency based on total span to avoid overcrowding
    const markerFrequency = yearSpan > 50 ? 10 : (yearSpan > 20 ? 5 : (yearSpan > 10 ? 2 : 1));
    
    for (let year = startYear; year <= endYear; year += markerFrequency) {
        const position = ((year - startYear) / (endYear - startYear)) * 100;
        html += `<div class="year-marker" style="left: ${position}%">${year}</div>`;
    }
    
    html += `
                    </div>
                </div>
    `;
    
    // First sort by FirstSeason, then alphabetically for teams in the same year
    teams.sort((a, b) => {
        const aYear = parseInt(a.abbreviations.FirstSeason) || 9999;
        const bYear = parseInt(b.abbreviations.FirstSeason) || 9999;
        
        if (aYear !== bYear) {
            return aYear - bYear; // Sort by year ascending
        }
        
        // If same year, sort alphabetically
        return a.name.localeCompare(b.name);
    });
    
    // Add teams with timeline bars
    teams.forEach(team => {
        const name = team.name;
        const firstSeason = parseInt(team.abbreviations.FirstSeason) || currentYear;
        const lastSeason = team.abbreviations.LastSeason === "Active" ? 
                          currentYear : parseInt(team.abbreviations.LastSeason) || currentYear;
        
        html += `
            <div class="timeline-row">
                <div class="timeline-team-name">${name}</div>
                <div class="timeline-years">
        `;
        
        // Calculate positioning for the timeline bar
        const timelineStart = startYear;
        const timelineEnd = endYear;
        const timelineWidth = timelineEnd - timelineStart;
        
        const barStart = Math.max(0, ((firstSeason - timelineStart) / timelineWidth) * 100);
        // Ensure active teams show the current complete year by adding 1
        const barWidth = Math.min(100 - barStart, ((lastSeason - firstSeason + 1) / timelineWidth) * 100);
        
        const isActive = team.abbreviations.LastSeason === "Active";
        const barClass = isActive ? "timeline-bar active" : "timeline-bar inactive";
        
        html += `
            <div class="${barClass}" style="left: ${barStart}%; width: ${barWidth}%;">
            </div>
        `;
        
        html += `
                </div>
            </div>
        `;
    });
    
    html += `
        </div>
    </div>
    `;
    
    container.innerHTML = html;
}

// Show empty member timeline
function showEmptyMemberTimeline() {
    const container = document.getElementById('memberTimelineContainer');
    if (container) {
        container.innerHTML = `
            <div class="empty-message">
                <p>No member timeline data available.</p>
            </div>
        `;
    }
}

// Process Member Timeline
function processMemberTimeline(timelineData) {
    console.log('Processing member timeline data');
    
    const container = document.getElementById('memberTimelineContainer');
    if (!container) return;
    
    if (!timelineData || timelineData.length === 0) {
        container.innerHTML = `
            <div class="empty-message">
                <p>No member timeline data available.</p>
            </div>
        `;
        return;
    }
    
    // Group data by year
    const yearGroups = {};
    timelineData.forEach(item => {
        const year = item.year || 'Unknown';
        if (!yearGroups[year]) {
            yearGroups[year] = [];
        }
        yearGroups[year].push(item);
    });
    
    // Sort years in descending order
    const sortedYears = Object.keys(yearGroups).sort((a, b) => b - a);
    
    let html = '';
    
    sortedYears.forEach(year => {
        html += `
            <div class="timeline-year">
                <h3 class="year-title">${year}</h3>
                <div class="year-events">
        `;
        
        // Sort events within year by date if available
        const yearEvents = yearGroups[year].sort((a, b) => {
            if (a.date && b.date) {
                return new Date(b.date) - new Date(a.date);
            }
            return 0;
        });
        
        yearEvents.forEach(event => {
            const eventType = event.type || 'join';
            const eventDate = event.date ? new Date(event.date).toLocaleDateString() : '';
            
            html += `
                <div class="timeline-event ${eventType.toLowerCase()}">
                    <div class="event-icon">
                        <i class="fas fa-${eventType.toLowerCase() === 'join' ? 'user-plus' : 'user-minus'}"></i>
                    </div>
                    <div class="event-details">
                        <div class="event-title">${event.owner || 'Unknown'} ${eventType.toLowerCase() === 'join' ? 'joined' : 'left'} the league</div>
                        <div class="event-team">${event.team || ''}</div>
                        <div class="event-date">${eventDate}</div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Process Drum Corps
function processDrumCorps(dciData) {
    console.log('Processing drum corps data');
    
    const container = document.getElementById('drumCorpsContainer');
    if (!container) return;
    
    if (!dciData) {
        container.innerHTML = `
            <div class="empty-message">
                <p>No drum corps data available.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // Process World Class
    if (dciData.World_Class) {
        const worldClassCorps = dciData.World_Class
            .filter(corps => corps.members && corps.members.trim() !== '')
            .sort((a, b) => a.name.localeCompare(b.name));
        
        if (worldClassCorps.length > 0) {
            html += `
                <div class="drum-corps-class">
                    <h3 class="class-title">World Class</h3>
                    <div class="corps-grid">
            `;
            
            worldClassCorps.forEach(corps => {
                const members = corps.members.split(',').map(name => name.trim()).sort();
                const logoPath = `../assets/dci-logos/${corps.abbreviation.toLowerCase()}.png`;
                
                html += `
                    <div class="corps-card" title="${corps.name}">
                        <div class="corps-header">
                            <img src="${logoPath}" alt="${corps.name}" class="corps-logo" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="corps-logo-fallback" style="display: none;">${corps.abbreviation}</div>
                        </div>
                        <div class="corps-members">
                `;
                
                members.forEach(member => {
                    html += `
                        <div class="corps-member">
                            <div class="member-name">${member}</div>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
    }
    
    // Process Open Class
    if (dciData.Open_Class) {
        const openClassCorps = dciData.Open_Class
            .filter(corps => corps.members && corps.members.trim() !== '')
            .sort((a, b) => a.name.localeCompare(b.name));
        
        if (openClassCorps.length > 0) {
            html += `
                <div class="drum-corps-class">
                    <h3 class="class-title">Open Class</h3>
                    <div class="corps-grid">
            `;
            
            openClassCorps.forEach(corps => {
                const members = corps.members.split(',').map(name => name.trim()).sort();
                const logoPath = `../assets/dci-logos/${corps.abbreviation.toLowerCase()}.png`;
                
                html += `
                    <div class="corps-card" title="${corps.name}">
                        <div class="corps-header">
                            <img src="${logoPath}" alt="${corps.name}" class="corps-logo" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="corps-logo-fallback" style="display: none;">${corps.abbreviation}</div>
                        </div>
                        <div class="corps-members">
                `;
                
                members.forEach(member => {
                    html += `
                        <div class="corps-member">
                            <div class="member-name">${member}</div>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
    }
    
    if (html === '') {
        container.innerHTML = `
            <div class="empty-message">
                <p>No drum corps members found.</p>
            </div>
        `;
    } else {
        container.innerHTML = html;
        // Equalize card heights after content is loaded
        setTimeout(() => {
            equalizeCardHeights();
        }, 100);
    }
}

function equalizeCardHeights() {
    const cards = document.querySelectorAll('.corps-card');
    if (cards.length === 0) return;
    
    // Reset heights to auto to measure natural height
    cards.forEach(card => {
        card.style.height = 'auto';
    });
    
    // Find the tallest card
    let maxHeight = 0;
    cards.forEach(card => {
        const cardHeight = card.offsetHeight;
        if (cardHeight > maxHeight) {
            maxHeight = cardHeight;
        }
    });
    
    // Set all cards to the same height
    cards.forEach(card => {
        card.style.height = maxHeight + 'px';
    });
}

// Show empty drum corps
function showEmptyDrumCorps() {
    const container = document.getElementById('drumCorpsContainer');
    if (container) {
        container.innerHTML = `
            <div class="empty-message">
                <p>No drum corps data available.</p>
            </div>
        `;
    }
}

// Show empty states for all sections
function showEmptyStates() {
    // Show empty states for each section
    const highScoreTable = document.getElementById('high-score-table');
    if (highScoreTable) {
        highScoreTable.innerHTML = `
            <div class="empty-message">
                <p>No 200+ point games found.</p>
            </div>
        `;
        disablePagination();
    }
    
    showEmptyMemberTimeline();
    showEmptyDrumCorps();
}

// View game details
function viewGame(gameId) {
    if (!gameId) return;
    window.location.href = `game-details.html?id=${gameId}`;
}

// Get URL parameter
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Set URL parameter
function setUrlParameter(name, value) {
    const url = new URL(window.location.href);
    url.searchParams.set(name, value);
    window.history.replaceState({}, '', url);
}

// Navigate to game details page for single game records
function navigateToGameDetails(gameData) {
    if (!gameData || !gameData.season || !gameData.week || !gameData.team || !gameData.opponent) {
        console.error('Invalid game data for navigation:', gameData);
        return;
    }
    
    // Find the game ID from the league score data
    const gameEntry = leagueScoreData.find(game => 
        game.Season == gameData.season && 
        game.Week == gameData.week && 
        ((game.Team === gameData.team && game.Opponent === gameData.opponent) ||
         (game.Team === gameData.opponent && game.Opponent === gameData.team))
    );
    
    if (!gameEntry || !gameEntry["Game ID"]) {
        console.error('Could not find game ID for:', gameData);
        return;
    }
    
    // Construct the URL for the game details page using the correct format
    const gameDetailsUrl = `../pages/game-details.html?id=${gameEntry["Game ID"]}&season=${gameData.season}`;
    
    // Navigate to the game details page
    window.location.href = gameDetailsUrl;
}
