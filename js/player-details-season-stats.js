// Player Details Season Stats Module
// This module handles loading and displaying ESPN game stats for players

let seasonStatsCache, allSeasonStats;

// Initialize variables only if they don't exist
if (typeof seasonStatsCache === 'undefined') {
    seasonStatsCache = new Map();
}
if (typeof allSeasonStats === 'undefined') {
    allSeasonStats = null;
}

// Initialize season stats functionality
window.initializeSeasonStats = function(playerEspnId) {
    console.log('Initializing season stats for player ESPN ID:', playerEspnId);
    console.log('ESPN ID type:', typeof playerEspnId);
    
    if (!playerEspnId) {
        console.error('No ESPN ID provided for season stats');
        showSeasonStatsError('Player ESPN ID not available');
        return;
    }
    
    loadAllSeasonStats(playerEspnId);
};

// Load all available season stats for a player
async function loadAllSeasonStats(playerEspnId) {
    const container = document.getElementById('season-stats-content');
    if (!container) {
        console.error('Season stats container not found');
        return;
    }
    
    // Show loading state
    container.innerHTML = '<div class="loading-stats">Loading season stats...</div>';
    
    try {
        console.log(`Loading pre-built player data for ESPN ID: ${playerEspnId}`);
        
        // Try to load the pre-built player data file
        const playerDataUrl = `../data/espn_player_data/${playerEspnId}.json`;
        const response = await fetch(playerDataUrl);
        
        if (!response.ok) {
            throw new Error(`Player data file not found: ${response.status}`);
        }
        
        const playerData = await response.json();
        console.log(`Loaded player data:`, playerData);
        
        if (!playerData.career_stats || Object.keys(playerData.career_stats).length === 0) {
            showSeasonStatsError('No season stats found for this player');
            return;
        }
        
        // Convert the player data format to our display format
        const playerStats = convertPlayerDataToStats(playerData);
        
        console.log(`Total seasons with data: ${playerStats.length}`);
        displaySeasonStats(playerStats);
        
    } catch (error) {
        console.error('Error loading pre-built player data:', error);
        console.log('Falling back to scanning game files...');
        
        // Fallback to the old method if pre-built data doesn't exist
        await loadAllSeasonStatsLegacy(playerEspnId);
    }
}

// Convert pre-built player data to our stats format
function convertPlayerDataToStats(playerData) {
    const playerStats = [];
    
    // Sort seasons by year (most recent first)
    const seasons = Object.keys(playerData.career_stats).sort((a, b) => parseInt(b) - parseInt(a));
    
    for (const seasonYear of seasons) {
        const seasonData = playerData.career_stats[seasonYear];
        const games = [];
        
        // Iterate through all stat categories for this season
        for (const [category, categoryGames] of Object.entries(seasonData)) {
            // Convert each game in the category
            for (const gameData of categoryGames) {
                games.push({
                    season: parseInt(seasonYear),
                    week: gameData.week,
                    athlete: playerData.player_info,
                    stats: gameData.stats,
                    statLabels: gameData.labels,
                    statCategory: gameData.category,
                    team: gameData.team,
                    opponent: gameData.opponent,
                    gameInfo: gameData.game_info
                });
            }
        }
        
        if (games.length > 0) {
            playerStats.push({
                season: parseInt(seasonYear),
                games: games
            });
        }
    }
    
    return playerStats;
}

// Legacy method - fallback to scanning game files (keep the old logic as backup)
async function loadAllSeasonStatsLegacy(playerEspnId) {
    const container = document.getElementById('season-stats-content');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-stats">Loading season stats (legacy method)...</div>';
    
    try {
        const availableSeasons = await getAvailableStatsSeasons();
        const playerStats = [];
        
        // Check ALL seasons - don't try to be too clever
        // Use parallel requests to speed this up
        console.log(`Checking player ${playerEspnId} across all available seasons...`);
        
        const seasonPromises = availableSeasons.map(async (season) => {
            const hasData = await quickCheckPlayerInSeason(playerEspnId, season);
            return hasData ? season : null;
        });
        
        const seasonsWithData = (await Promise.all(seasonPromises)).filter(season => season !== null);
        
        console.log(`Found player in seasons: ${seasonsWithData.join(', ')}`);
        
        // Now load full data for seasons where player exists
        for (const season of seasonsWithData) {
            console.log(`Loading full stats for season ${season}`);
            const seasonData = await loadSeasonStatsForYear(playerEspnId, season);
            console.log(`Season ${season} data:`, seasonData?.length || 0, 'games');
            
            if (seasonData && seasonData.length > 0) {
                playerStats.push({
                    season: season,
                    games: seasonData
                });
            }
        }
        
        console.log(`Total seasons with data: ${playerStats.length}`);
        if (playerStats.length === 0) {
            showSeasonStatsError('No season stats found for this player');
            return;
        }
        
        displaySeasonStats(playerStats);
        
    } catch (error) {
        console.error('Error loading season stats:', error);
        showSeasonStatsError('Failed to load season stats');
    }
}

// Quick check to see if player exists in a season (just check week 1)
async function quickCheckPlayerInSeason(playerEspnId, season) {
    try {
        const response = await fetch(`../data/espn_game_stats/${season}/nfl_data_${season}_week_1.json`);
        
        if (!response.ok) {
            return false;
        }
        
        const gameData = await response.json();
        return findPlayerInGameData(playerEspnId, gameData, season, 1) !== null;
        
    } catch (error) {
        return false;
    }
}

// Get available seasons from ESPN game stats folders
async function getAvailableStatsSeasons() {
    // Try to use cached seasons list first
    if (window.espnAvailableSeasons) {
        return window.espnAvailableSeasons;
    }
    
    // Try to load a pre-generated seasons index file
    try {
        const response = await fetch('../data/espn_game_stats/available_seasons.json');
        if (response.ok) {
            const seasonsData = await response.json();
            window.espnAvailableSeasons = seasonsData.seasons || seasonsData;
            return window.espnAvailableSeasons;
        }
    } catch (error) {
        console.warn('No available_seasons.json found, scanning directories...');
    }
    
    // Fallback: scan directories (but cache the result)
    const availableSeasons = await scanAvailableSeasons();
    window.espnAvailableSeasons = availableSeasons;
    return availableSeasons;
}

// Scan available seasons (fallback method)
async function scanAvailableSeasons() {
    // Use a smarter approach - check common years first, then expand
    const commonYears = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];
    const availableSeasons = [];
    
    // Check common years first
    for (const season of commonYears) {
        try {
            const response = await fetch(`../data/espn_game_stats/${season}/nfl_data_${season}_week_1.json`, { method: 'HEAD' });
            if (response.ok) {
                availableSeasons.push(season);
            }
        } catch (error) {
            // Season doesn't exist, continue
        }
    }
    
    // If we found recent data, also check older years more efficiently
    if (availableSeasons.length > 0) {
        // Check years 2000-2014 in parallel batches for better performance
        const olderYears = [];
        for (let year = 2000; year <= 2014; year++) {
            olderYears.push(year);
        }
        
        // Check in batches of 5 to avoid overwhelming the server
        const batchSize = 5;
        for (let i = 0; i < olderYears.length; i += batchSize) {
            const batch = olderYears.slice(i, i + batchSize);
            const batchPromises = batch.map(async (year) => {
                try {
                    const response = await fetch(`../data/espn_game_stats/${year}/nfl_data_${year}_week_1.json`, { method: 'HEAD' });
                    return response.ok ? year : null;
                } catch (error) {
                    return null;
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            batchResults.forEach(year => {
                if (year !== null) {
                    availableSeasons.push(year);
                }
            });
        }
    }
    
    return availableSeasons.sort((a, b) => b - a); // Most recent first
}

// Load season stats for a specific year
async function loadSeasonStatsForYear(playerEspnId, season) {
    const cacheKey = `${playerEspnId}-${season}`;
    
    if (seasonStatsCache.has(cacheKey)) {
        return seasonStatsCache.get(cacheKey);
    }
    
    const seasonStats = [];
    const maxWeeks = season >= 2021 ? 18 : 17;
    
    // Load all weeks for this season since we already confirmed player exists
    const weekPromises = [];
    for (let week = 1; week <= maxWeeks; week++) {
        weekPromises.push(loadWeekStats(playerEspnId, season, week));
    }
    
    // Load weeks in parallel for better performance
    const weekResults = await Promise.all(weekPromises);
    
    // Filter out null results
    weekResults.forEach(weekStats => {
        if (weekStats) {
            seasonStats.push(weekStats);
        }
    });
    
    seasonStatsCache.set(cacheKey, seasonStats);
    return seasonStats;
}

// Load stats for a specific week
async function loadWeekStats(playerEspnId, season, week) {
    try {
        const response = await fetch(`../data/espn_game_stats/${season}/nfl_data_${season}_week_${week}.json`);
        
        if (!response.ok) {
            return null;
        }
        
        const gameData = await response.json();
        return findPlayerInGameData(playerEspnId, gameData, season, week);
        
    } catch (error) {
        console.warn(`Failed to load stats for ${season} week ${week}:`, error);
        return null;
    }
}

// Find player in game data
function findPlayerInGameData(playerEspnId, gameData, season, week) {
    if (!gameData || !gameData.games) {
        console.log(`No game data for ${season} week ${week}`);
        return null;
    }
    
    const playerId = playerEspnId.toString();
    console.log(`Searching for player ID: ${playerId} in ${season} week ${week}`);
    
    for (const game of gameData.games) {
        if (!game.boxscore || !game.boxscore.players) continue;
        
        for (const playerSection of game.boxscore.players) {
            if (!playerSection.statistics) continue;
            
            for (const statCategory of playerSection.statistics) {
                if (!statCategory.athletes) continue;
                
                for (const athleteData of statCategory.athletes) {
                    if (athleteData.athlete && athleteData.athlete.id === playerId) {
                        console.log(`Found player ${athleteData.athlete.displayName} in ${season} week ${week}`);
                        
                        // Get team info from the boxscore teams
                        const teamInfo = getTeamInfoForPlayer(game.boxscore, athleteData.athlete.id);
                        
                        return {
                            season: season,
                            week: week,
                            athlete: athleteData.athlete,
                            stats: athleteData.stats || [],
                            statLabels: statCategory.labels || [],
                            statCategory: statCategory.name || 'Unknown',
                            team: teamInfo?.team,
                            opponent: teamInfo?.opponent,
                            gameInfo: {
                                date: game.gamepackage?.gmStrp?.date || `${season} Week ${week}`,
                                status: game.gamepackage?.gmStrp?.status || 'Completed'
                            }
                        };
                    }
                }
            }
        }
    }
    
    return null;
}

// Get team info for a player from the game data
function getTeamInfoForPlayer(boxscore, playerId) {
    if (!boxscore || !boxscore.teams) return null;
    
    // For now, just return the teams - we can enhance this later to determine which team the player is on
    return {
        team: boxscore.teams[0]?.team,
        opponent: boxscore.teams[1]?.team
    };
}

// Get opponent team from game data
function getOpponentTeam(teams, teamId) {
    for (const team of teams) {
        if (team.team.id !== teamId) {
            return team.team;
        }
    }
    return null;
}

// Display season stats
function displaySeasonStats(playerStats) {
    const container = document.getElementById('season-stats-content');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'season-stats-header';
    header.innerHTML = `
        <h3>Season Statistics</h3>
        <p>Season totals and averages from ESPN game data</p>
    `;
    container.appendChild(header);
    
    // Group stats by major categories
    const statCategories = organizeStatsByCategory(playerStats);
    
    // Create tabs for different stat categories
    if (statCategories.size > 1) {
        const tabsContainer = createStatCategoryTabs(statCategories);
        container.appendChild(tabsContainer);
    }
    
    // Create content for each category
    statCategories.forEach((seasonData, category) => {
        const categoryContent = createCategoryContent(category, seasonData);
        container.appendChild(categoryContent);
    });
    
    // Show the first category by default
    if (statCategories.size > 0) {
        const firstCategory = Array.from(statCategories.keys())[0];
        showStatCategory(firstCategory);
    }
}

// Organize stats by major categories
function organizeStatsByCategory(playerStats) {
    const categories = new Map();
    
    playerStats.forEach(seasonData => {
        seasonData.games.forEach(game => {
            const category = normalizeStatCategory(game.statCategory);
            
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            
            // Find existing season data or create new
            let existingSeason = categories.get(category).find(s => s.season === seasonData.season);
            if (!existingSeason) {
                existingSeason = {
                    season: seasonData.season,
                    games: []
                };
                categories.get(category).push(existingSeason);
            }
            
            existingSeason.games.push(game);
        });
    });
    
    return categories;
}

// Normalize stat category names
function normalizeStatCategory(category) {
    if (!category) return 'Other';
    
    const lower = category.toLowerCase();
    if (lower.includes('receiv') || lower.includes('catching')) return 'Receiving';
    if (lower.includes('rush') || lower.includes('running')) return 'Rushing';
    if (lower.includes('pass') || lower.includes('throwing')) return 'Passing';
    if (lower.includes('kick') || lower.includes('punt')) return 'Special Teams';
    if (lower.includes('def') || lower.includes('tackle') || lower.includes('sack')) return 'Defense';
    if (lower.includes('fumble') || lower.includes('turnover')) return 'Turnovers';
    
    return formatStatCategory(category);
}

// Create stat category tabs
function createStatCategoryTabs(statCategories) {
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'stat-category-tabs';
    
    statCategories.forEach((_, category) => {
        const tab = document.createElement('button');
        tab.className = 'stat-category-tab';
        tab.textContent = category;
        tab.dataset.category = category;
        tab.addEventListener('click', () => showStatCategory(category));
        tabsContainer.appendChild(tab);
    });
    
    return tabsContainer;
}

// Create content for a stat category
function createCategoryContent(category, seasonDataArray) {
    const content = document.createElement('div');
    content.className = 'stat-category-content';
    content.id = `category-${category.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Create table for this category
    const table = document.createElement('table');
    table.className = 'season-stats-table';
    
    // Get relevant stats for this category
    const relevantStats = getRelevantStatsForCategory(category, seasonDataArray);
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['Season', 'Games', ...relevantStats];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    // Sort seasons by year (most recent first)
    const sortedSeasons = seasonDataArray.sort((a, b) => b.season - a.season);
    
    sortedSeasons.forEach(seasonData => {
        const row = createCategorySeasonRow(seasonData, relevantStats);
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    content.appendChild(table);
    
    return content;
}

// Get relevant stats for a category
function getRelevantStatsForCategory(category, seasonDataArray) {
    const categoryStats = new Set();
    
    seasonDataArray.forEach(seasonData => {
        seasonData.games.forEach(game => {
            if (game.statLabels) {
                game.statLabels.forEach(label => {
                    categoryStats.add(label);
                });
            }
        });
    });
    
    // Filter and order stats based on category
    const statsArray = Array.from(categoryStats);
    
    if (category === 'Receiving') {
        return statsArray.filter(stat => {
            const lower = stat.toLowerCase();
            return lower.includes('rec') || lower.includes('yds') || lower.includes('td') || 
                   lower.includes('avg') || lower.includes('long') || lower.includes('tgt');
        }).sort((a, b) => {
            const order = ['rec', 'yds', 'avg', 'td', 'long', 'tgt'];
            const aIndex = order.findIndex(o => a.toLowerCase().includes(o));
            const bIndex = order.findIndex(o => b.toLowerCase().includes(o));
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });
    }
    
    if (category === 'Rushing') {
        return statsArray.filter(stat => {
            const lower = stat.toLowerCase();
            return lower.includes('car') || lower.includes('yds') || lower.includes('avg') || 
                   lower.includes('td') || lower.includes('long');
        }).sort((a, b) => {
            const order = ['car', 'yds', 'avg', 'td', 'long'];
            const aIndex = order.findIndex(o => a.toLowerCase().includes(o));
            const bIndex = order.findIndex(o => b.toLowerCase().includes(o));
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });
    }
    
    if (category === 'Passing') {
        return statsArray.filter(stat => {
            const lower = stat.toLowerCase();
            return lower.includes('att') || lower.includes('yds') || lower.includes('avg') || 
                   lower.includes('td') || lower.includes('int') || lower.includes('rtg');
        }).sort((a, b) => {
            const order = ['att', 'yds', 'avg', 'td', 'int', 'rtg'];
            const aIndex = order.findIndex(o => a.toLowerCase().includes(o));
            const bIndex = order.findIndex(o => b.toLowerCase().includes(o));
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });
    }
    
    // Default: return all stats, sorted alphabetically
    return statsArray.sort();
}

// Create season row for a category
function createCategorySeasonRow(seasonData, relevantStats) {
    const row = document.createElement('tr');
    row.className = 'season-summary-row';
    
    // Season
    const seasonCell = document.createElement('td');
    seasonCell.textContent = seasonData.season;
    seasonCell.className = 'season-year';
    row.appendChild(seasonCell);
    
    // Games count
    const gamesCell = document.createElement('td');
    gamesCell.textContent = seasonData.games.length;
    gamesCell.className = 'games-count';
    row.appendChild(gamesCell);
    
    // Aggregate stats
    const seasonTotals = aggregateSeasonStats(seasonData.games);
    
    // Add stat cells
    relevantStats.forEach(statLabel => {
        const statCell = document.createElement('td');
        
        // Find the stat value across all categories
        let statValue = null;
        seasonTotals.forEach((categoryTotals) => {
            if (categoryTotals.has(statLabel)) {
                statValue = categoryTotals.get(statLabel);
            }
        });
        
        if (statValue !== null) {
            statCell.textContent = formatStatValue(statValue, statLabel);
        } else {
            statCell.textContent = '-';
            statCell.className = 'no-stat';
        }
        
        row.appendChild(statCell);
    });
    
    return row;
}

// Show specific stat category
function showStatCategory(category) {
    // Hide all categories
    document.querySelectorAll('.stat-category-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.stat-category-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected category
    const categoryId = `category-${category.toLowerCase().replace(/\s+/g, '-')}`;
    const selectedContent = document.getElementById(categoryId);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // Mark selected tab as active
    const selectedTab = document.querySelector(`[data-category="${category}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
}

// Aggregate stats for a season
function aggregateSeasonStats(games) {
    const totals = new Map();
    const counts = new Map(); // Track count for averaging
    
    games.forEach(game => {
        if (!totals.has(game.statCategory)) {
            totals.set(game.statCategory, new Map());
            counts.set(game.statCategory, new Map());
        }
        
        const categoryTotals = totals.get(game.statCategory);
        const categoryCounts = counts.get(game.statCategory);
        
        if (game.statLabels && game.stats) {
            game.statLabels.forEach((label, index) => {
                if (game.stats[index] !== undefined && game.stats[index] !== null) {
                    const statValue = game.stats[index];
                    const numericValue = parseStatValue(statValue);
                    
                    if (numericValue !== null) {
                        const labelLower = label.toLowerCase();
                        
                        // Stats that should be averaged, not summed
                        if (shouldBeAveraged(labelLower)) {
                            const currentTotal = categoryTotals.get(label) || 0;
                            const currentCount = categoryCounts.get(label) || 0;
                            categoryTotals.set(label, currentTotal + numericValue);
                            categoryCounts.set(label, currentCount + 1);
                        } else {
                            // Stats that should be summed
                            const currentTotal = categoryTotals.get(label) || 0;
                            categoryTotals.set(label, currentTotal + numericValue);
                        }
                    }
                }
            });
        }
    });
    
    // Calculate averages for stats that should be averaged
    totals.forEach((categoryTotals, category) => {
        const categoryCounts = counts.get(category);
        categoryTotals.forEach((total, label) => {
            const labelLower = label.toLowerCase();
            if (shouldBeAveraged(labelLower)) {
                const count = categoryCounts.get(label) || 1;
                categoryTotals.set(label, total / count);
            }
        });
    });
    
    return totals;
}

// Determine if a stat should be averaged rather than summed
function shouldBeAveraged(labelLower) {
    const averageStats = [
        'rtg', 'rating', 'passer rating', 'qb rating', 'qbr',
        'avg', 'average', 'per', 'pct', 'percentage',
        'yards per', 'completion percentage', 'field goal pct'
    ];
    
    return averageStats.some(avgStat => labelLower.includes(avgStat));
}

// Parse stat value to number (handles formats like "5/8", "12.5", etc.)
function parseStatValue(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return null;
    
    // Handle fraction format (e.g., "5/8" for completions/attempts)
    if (value.includes('/')) {
        const parts = value.split('/');
        if (parts.length === 2) {
            const numerator = parseFloat(parts[0]);
            const denominator = parseFloat(parts[1]);
            if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
                return numerator; // Return just the numerator for totals
            }
        }
        return null;
    }
    
    // Handle regular numbers
    const numValue = parseFloat(value);
    return isNaN(numValue) ? null : numValue;
}

// Format stat value for display
function formatStatValue(value, label) {
    if (typeof value !== 'number') return value;
    
    // For certain stats, show as integer
    const integerStats = ['receptions', 'rushingAttempts', 'passingTouchdowns', 'receivingTouchdowns', 'rushingTouchdowns'];
    const labelLower = label.toLowerCase();
    
    if (integerStats.some(stat => labelLower.includes(stat.toLowerCase()))) {
        return Math.round(value).toString();
    }
    
    // For yards and similar stats, show as integer
    if (labelLower.includes('yard') || labelLower.includes('td') || labelLower.includes('int')) {
        return Math.round(value).toString();
    }
    
    // For averages and percentages, show one decimal place
    if (labelLower.includes('avg') || labelLower.includes('pct') || labelLower.includes('rating')) {
        return value.toFixed(1);
    }
    
    // Default to one decimal place
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
}

// Format stat category name
function formatStatCategory(category) {
    if (!category) return 'Unknown';
    
    // Convert camelCase or snake_case to readable format
    return category
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

// Show error message
function showSeasonStatsError(message) {
    const container = document.getElementById('season-stats-content');
    if (container) {
        container.innerHTML = `
            <div class="season-stats-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    }
}

// Utility function to fetch data
async function fetchStatsData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.warn(`Failed to fetch ${url}:`, error.message);
        throw error;
    }
}
