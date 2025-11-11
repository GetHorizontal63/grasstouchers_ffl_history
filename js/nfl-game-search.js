document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const seasonSelect = document.getElementById('season');
    const weekSelect = document.getElementById('week');
    const teamSelect = document.getElementById('team');
    const gameResults = document.getElementById('gameResults');
    const resultsCount = document.querySelector('.results-count');
    
    // Available seasons - will be populated dynamically
    let availableSeasons = [];
    
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
    
    // Dynamically scan for seasons without hardcoded ranges
    async function discoverAvailableSeasons() {
        console.log('Starting season discovery...');
        availableSeasons = [];
        
        try {
            // Attempt to get directory listing
            const response = await fetch('../data/espn_game_stats/');
            
            if (!response.ok) {
                throw new Error('Cannot access directory listing');
            }
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const links = doc.querySelectorAll('a');
            
            // Extract any folder that looks like a year (4 digit number)
            links.forEach(link => {
                const href = link.getAttribute('href');
                // Match 4-digit years as folder names
                const yearMatch = href.match(/^(\d{4})\/$/);
                if (yearMatch) {
                    availableSeasons.push(parseInt(yearMatch[1]));
                }
            });
            
            // Sort in descending order (newest first)
            availableSeasons.sort((a, b) => b - a);
            
            if (availableSeasons.length === 0) {
                throw new Error('No season folders found in directory listing');
            }
            
            console.log('Seasons discovered via directory listing:', availableSeasons);
        } catch (error) {
            console.error('Error discovering seasons:', error);
            console.log('Directory listing unavailable. Will try alternative discovery...');
            
            // If directory listing fails, we can try to discover seasons by probing common weeks
            // This is slower but more reliable than assuming a fixed range
            await discoverSeasonsByProbing();
        }
        
        if (availableSeasons.length === 0) {
            console.error('Could not discover any seasons after multiple attempts');
            // Don't use ANY fallback hardcoded values - if we can't find seasons, show an error
            displayDiscoveryError('No NFL seasons could be discovered. Please check the data directory structure.');
            return;
        }
        
        // Populate dropdown with found seasons
        populateSeasonDropdown();
        
        // Initialize with first available season
        if (availableSeasons.length > 0) {
            seasonSelect.value = availableSeasons[0];
            discoverWeeksForSeason(availableSeasons[0]);
        }
    }
    
    // Alternative method to discover seasons by probing for specific files
    async function discoverSeasonsByProbing() {
        // Instead of hardcoding year ranges, we'll try to detect patterns
        // We'll start with current year and work backwards until we don't find anything for several years
        
        const currentYear = new Date().getFullYear();
        let consecutiveFailures = 0;
        const maxConsecutiveFailures = 3; // Stop after 3 consecutive years with no data
        
        for (let year = currentYear; year >= 1920; year--) {
            // Try to find any week file for this year
            const hasData = await probeForSeasonData(year);
            
            if (hasData) {
                availableSeasons.push(year);
                consecutiveFailures = 0; // Reset failure counter
            } else {
                consecutiveFailures++;
                
                // If we've had several consecutive years with no data, and we've found at least some seasons,
                // we can assume we've gone back far enough
                if (consecutiveFailures >= maxConsecutiveFailures && availableSeasons.length > 0) {
                    break;
                }
            }
        }
        
        // Sort in descending order
        availableSeasons.sort((a, b) => b - a);
        console.log('Seasons discovered via probing:', availableSeasons);
    }
    
    // Probe for any data for a specific season
    async function probeForSeasonData(season) {
        // Try several common weeks to maximize chances of finding data
        const weeksToTry = [1, 8, 16]; // Try beginning, middle, and end of season
        
        for (const week of weeksToTry) {
            try {
                const response = await fetch(
                    `../data/espn_game_stats/${season}/nfl_data_${season}_week_${week}.json`, 
                    { method: 'HEAD', cache: 'no-store' }
                );
                
                if (response.ok) {
                    console.log(`Found data for season ${season} (week ${week})`);
                    return true;
                }
            } catch (error) {
                // Ignore errors and continue trying
            }
        }
        
        return false;
    }
    
    // Discover weeks for a specific season without assuming a range
    async function discoverWeeksForSeason(season) {
        console.log(`Discovering weeks for season ${season}...`);
        weekSelect.innerHTML = '<option value="loading">Discovering weeks...</option>';
        weekSelect.disabled = true;
        
        let availableWeeks = [];
        
        try {
            // Try to get directory listing for the season
            const response = await fetch(`../data/espn_game_stats/${season}/`);
            
            if (!response.ok) {
                throw new Error(`Cannot access directory listing for season ${season}`);
            }
            
            const html = await response.text();
            
            // Parse HTML to find all JSON files
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const links = doc.querySelectorAll('a');
            
            console.log(`Found ${links.length} files/links in directory ${season}`);
            
            // Extract week numbers from any filename pattern containing both season and week info
            links.forEach(link => {
                const href = link.getAttribute('href');
                
                // Log all JSON files found for debugging
                if (href.endsWith('.json')) {
                    console.log(`Found JSON file: ${href}`);
                }
                
                // Match more flexibly - look for any JSON with week and number pattern
                // This will match patterns like:
                // - nfl_data_YYYY_week_N.json
                // - YYYY_week_N.json
                // - any_prefix_week_N_any_suffix.json
                const weekMatches = href.match(/week[_-](\d+)\.json$/i) || 
                                    href.match(/w(\d+)\.json$/i) ||
                                    href.match(/week[_\s-]?(\d+)/i);
                
                if (weekMatches && weekMatches[1]) {
                    const weekNum = parseInt(weekMatches[1]);
                    if (!isNaN(weekNum) && !availableWeeks.includes(weekNum)) {
                        availableWeeks.push(weekNum);
                        console.log(`Extracted week ${weekNum} from file ${href}`);
                    }
                }
            });
            
            // Sort numerically
            availableWeeks.sort((a, b) => a - b);
            
            if (availableWeeks.length === 0) {
                throw new Error(`No week files found in directory listing for season ${season}`);
            }
            
        } catch (error) {
            console.error(`Error discovering weeks via directory listing:`, error);
            
            // If directory listing fails, try scanning the folder for JSON files
            availableWeeks = await scanFolderForWeeks(season);
        }
        
        if (availableWeeks.length === 0) {
            console.error(`Could not discover any weeks for season ${season}`);
            // Don't use ANY fallback values - just show an error in the dropdown
            weekSelect.innerHTML = '<option value="error">No weeks found</option>';
            return;
        }
        
        console.log(`Final list of weeks for season ${season}:`, availableWeeks);
        
        // Populate the week dropdown
        populateWeekDropdown(availableWeeks);
    }
    
    // More comprehensive folder scanning for weeks
    async function scanFolderForWeeks(season) {
        console.log(`Scanning folder for weeks in season ${season}...`);
        const availableWeeks = [];
        
        try {
            // Try to get a list of files using a wildcard approach
            // This attempts to fetch a non-existent "index" file that will typically 
            // trigger a directory listing on most servers
            const response = await fetch(`../data/espn_game_stats/${season}/index`);
            const html = await response.text();
            
            // Parse any JSON filenames from the error page or directory listing
            const matches = html.match(/[\w\-\.]+\.json/g);
            if (matches) {
                console.log(`Found ${matches.length} JSON filenames in response:`, matches);
                
                matches.forEach(filename => {
                    // Extract week number from filename
                    const weekMatches = filename.match(/week[_-](\d+)\.json$/i) || 
                                        filename.match(/w(\d+)\.json$/i) ||
                                        filename.match(/week[_\s-]?(\d+)/i);
                    
                    if (weekMatches && weekMatches[1]) {
                        const weekNum = parseInt(weekMatches[1]);
                        if (!isNaN(weekNum) && !availableWeeks.includes(weekNum)) {
                            availableWeeks.push(weekNum);
                            console.log(`Extracted week ${weekNum} from file ${filename}`);
                        }
                    }
                });
                
                if (availableWeeks.length > 0) {
                    availableWeeks.sort((a, b) => a - b);
                    return availableWeeks;
                }
            }
        } catch (error) {
            console.log('Alternative folder scanning failed, falling back to probing');
        }
        
        // If all else fails, use traditional probing approach
        return await probeForWeeks(season);
    }
    
    // Improved probing for available weeks
    async function probeForWeeks(season) {
        console.log(`Probing for weeks in season ${season}...`);
        const availableWeeks = [];
        
        // Try a broader range of possible week file patterns
        const patterns = [
            week => `nfl_data_${season}_week_${week}.json`,
            week => `week_${week}.json`,
            week => `${season}_week_${week}.json`,
            week => `w${week}.json`,
            week => `week${week}.json`
        ];
        
        let consecutiveFailures = 0;
        const maxConsecutiveFailures = 5;
        const maxWeekToTry = 30; // Safety limit
        
        // Start at week 1 and continue until we have too many consecutive failures
        for (let week = 1; week <= maxWeekToTry; week++) {
            let foundWeek = false;
            
            // Try each pattern
            for (const patternFn of patterns) {
                const filename = patternFn(week);
                try {
                    const response = await fetch(
                        `../data/espn_game_stats/${season}/${filename}`, 
                        { method: 'HEAD', cache: 'no-store' }
                    );
                    
                    if (response.ok) {
                        if (!availableWeeks.includes(week)) {
                            availableWeeks.push(week);
                            console.log(`Found week ${week} using pattern ${filename}`);
                        }
                        foundWeek = true;
                        break; // Found this week, move to next week
                    }
                } catch (error) {
                    // Ignore errors and continue trying other patterns
                }
            }
            
            if (foundWeek) {
                consecutiveFailures = 0;
            } else {
                consecutiveFailures++;
                console.log(`Week ${week} not found with any pattern (failure ${consecutiveFailures}/${maxConsecutiveFailures})`);
            }
            
            // If we've had several consecutive failures and found at least some weeks, stop
            if (consecutiveFailures >= maxConsecutiveFailures && availableWeeks.length > 0) {
                console.log(`Stopping week detection after ${maxConsecutiveFailures} consecutive failures`);
                break;
            }
        }
        
        // Sort weeks numerically
        availableWeeks.sort((a, b) => a - b);
        console.log(`Weeks found through probing:`, availableWeeks);
        return availableWeeks;
    }
    
    // Populate season dropdown with available seasons
    function populateSeasonDropdown() {
        seasonSelect.innerHTML = '';
        
        availableSeasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season;
            option.textContent = season;
            seasonSelect.appendChild(option);
        });
    }
    
    // Populate week dropdown with weeks based on the season
    function populateWeekDropdown(weeks) {
        weekSelect.innerHTML = '';
        
        // Determine the number of weeks based on the season
        const season = parseInt(seasonSelect.value);
        const maxWeeks = season >= 2021 ? 18 : 17;
        
        console.log(`Populating weeks for season ${season} with max ${maxWeeks} weeks`);
        
        // Add each week, limited to appropriate max weeks for this season
        for (let week = 1; week <= maxWeeks; week++) {
            // Only add the week if it's available in our discovered weeks
            // or if we're not using discovery (empty weeks array passed in)
            if (weeks.length === 0 || weeks.includes(week)) {
                const option = document.createElement('option');
                option.value = week;
                option.textContent = `Week ${week}`;
                weekSelect.appendChild(option);
            }
        }
        
        // If we have discovered weeks beyond the season limit, add them as playoffs
        const playoffWeeks = weeks.filter(week => week > maxWeeks);
        if (playoffWeeks.length > 0) {
            const playoffsOption = document.createElement('option');
            playoffsOption.value = "playoffs";
            playoffsOption.textContent = "Playoffs";
            weekSelect.appendChild(playoffsOption);
        }
        
        weekSelect.disabled = false;
        
        // Select the first week by default
        if (weekSelect.options.length > 0) {
            weekSelect.selectedIndex = 0;
        }
        
        // Trigger a search after populating the week dropdown
        searchGames();
    }
    
    // Populate team dropdown with NFL teams
    function populateTeamDropdown() {
        teamSelect.innerHTML = '';
        
        // Add "All Teams" option first
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Teams';
        teamSelect.appendChild(allOption);
        
        // Add each NFL team
        nflTeams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.code;
            option.textContent = team.name;
            teamSelect.appendChild(option);
        });
    }
    
    // Display discovery error in UI
    function displayDiscoveryError(message) {
        // Update UI to show error
        seasonSelect.innerHTML = '<option value="error">Error</option>';
        weekSelect.innerHTML = '<option value="error">Error</option>';
        gameResults.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    }
    
    // Search games function
    function searchGames() {
        const season = seasonSelect.value;
        const week = weekSelect.value;
        const team = teamSelect.value;
        
        // Clear previous results and show loading state
        gameResults.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Loading games...</p></div>';
        
        // Always try to load the actual JSON file for the selected week
        loadGameDataFromJson(season, week, team);
    }
    
    // Load game data from JSON file
    async function loadGameDataFromJson(season, week, team) {
        try {
            // Construct the correct file path to match the folder structure
            const jsonPath = `../data/espn_game_stats/${season}/nfl_data_${season}_week_${week}.json`;
            console.log(`Loading game data from: ${jsonPath}`);
            
            const response = await fetch(jsonPath);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch data for ${season} week ${week}`);
            }
            
            const rawData = await response.json();
            console.log('Loaded game data:', rawData);
            
            // Process the JSON data
            const formattedGames = processGameData(rawData, team);
            displayGames(formattedGames, team);
            
        } catch (error) {
            console.error('Error loading game data:', error);
            gameResults.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading game data for ${season} Week ${week}. ${error.message}</p>
                </div>
            `;
        }
    }
    
    // Process JSON game data into the format needed for display
    function processGameData(gameData, teamFilter) {
        const games = [];
        
        // Check if we have games in the data
        if (gameData && gameData.games && Array.isArray(gameData.games)) {
            gameData.games.forEach(game => {
                try {
                    // Extract teams from boxscore
                    if (!game.boxscore || !game.boxscore.teams || game.boxscore.teams.length < 2) {
                        console.warn('Game missing boxscore or teams data', game);
                        return;
                    }
                    
                    const boxscoreTeams = game.boxscore.teams;
                    const awayTeamBoxscore = boxscoreTeams.find(t => t.homeAway === 'away');
                    const homeTeamBoxscore = boxscoreTeams.find(t => t.homeAway === 'home');
                    
                    if (!homeTeamBoxscore || !awayTeamBoxscore) {
                        console.warn('Could not determine home or away team', game);
                        return;
                    }
                    
                    // Extract more detailed team info from the leaders section if available
                    let homeTeamInfo = null;
                    let awayTeamInfo = null;
                    
                    if (game.leaders && Array.isArray(game.leaders) && game.leaders.length >= 2) {
                        homeTeamInfo = game.leaders.find(l => 
                            l.team && l.team.logo === homeTeamBoxscore.team.logo);
                        awayTeamInfo = game.leaders.find(l => 
                            l.team && l.team.logo === awayTeamBoxscore.team.logo);
                    }
                    
                    // Extract team codes from competitors if available
                    let homeTeamCode = '';
                    let awayTeamCode = '';
                    let homeTeamName = '';
                    let awayTeamName = '';
                    
                    // First try to get from leaders
                    if (homeTeamInfo && homeTeamInfo.team) {
                        homeTeamCode = homeTeamInfo.team.abbreviation || '';
                        homeTeamName = homeTeamInfo.team.displayName || '';
                    }
                    
                    if (awayTeamInfo && awayTeamInfo.team) {
                        awayTeamCode = awayTeamInfo.team.abbreviation || '';
                        awayTeamName = awayTeamInfo.team.displayName || '';
                    }
                    
                    // If not found, try to determine from logo URL
                    if (!homeTeamCode && homeTeamBoxscore.team.logo) {
                        const logoMatch = homeTeamBoxscore.team.logo.match(/\/([a-z]+)\.png$/i);
                        if (logoMatch) {
                            homeTeamCode = logoMatch[1].toUpperCase();
                            const teamFound = nflTeams.find(t => t.code.toLowerCase() === homeTeamCode.toLowerCase());
                            if (teamFound) {
                                homeTeamCode = teamFound.code;
                                homeTeamName = teamFound.name;
                            }
                        }
                    }
                    
                    if (!awayTeamCode && awayTeamBoxscore.team.logo) {
                        const logoMatch = awayTeamBoxscore.team.logo.match(/\/([a-z]+)\.png$/i);
                        if (logoMatch) {
                            awayTeamCode = logoMatch[1].toUpperCase();
                            const teamFound = nflTeams.find(t => t.code.toLowerCase() === awayTeamCode.toLowerCase());
                            if (teamFound) {
                                awayTeamCode = teamFound.code;
                                awayTeamName = teamFound.name;
                            }
                        }
                    }
                    
                    // Find team objects from our nflTeams array
                    const homeTeam = nflTeams.find(team => team.code === homeTeamCode) || 
                                    { code: homeTeamCode || 'UNK', name: homeTeamName || 'Unknown Team' };
                    
                    const awayTeam = nflTeams.find(team => team.code === awayTeamCode) || 
                                    { code: awayTeamCode || 'UNK', name: awayTeamName || 'Unknown Team' };
                    
                    // Filter by team if specified
                    if (teamFilter !== 'all' && homeTeam.code !== teamFilter && awayTeam.code !== teamFilter) {
                        return;
                    }
                    
                    // Get scores from the header if available
                    let homeScore = 0;
                    let awayScore = 0;
                    
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
                    }
                    
                    // Extract game date
                    let gameDate = new Date();
                    if (game.header && game.header.competitions && game.header.competitions.length > 0) {
                        const competition = game.header.competitions[0];
                        if (competition.date) {
                            gameDate = new Date(competition.date);
                        }
                    }
                    
                    // Extract stadium/venue and attendance
                    let stadium = 'Unknown Stadium';
                    let attendance = 0;
                    
                    if (game.gameInfo) {
                        if (game.gameInfo.venue && game.gameInfo.venue.fullName) {
                            stadium = game.gameInfo.venue.fullName;
                        }
                        
                        if (game.gameInfo.attendance) {
                            attendance = game.gameInfo.attendance;
                        }
                    }
                    
                    // Add processed game to our games array
                    games.push({
                        id: game.header?.id || games.length + 1,
                        homeTeam: homeTeam,
                        awayTeam: awayTeam,
                        homeScore: homeScore,
                        awayScore: awayScore,
                        date: gameDate,
                        stadium: stadium,
                        attendance: attendance
                    });
                    
                } catch (error) {
                    console.error('Error processing game data:', error, game);
                }
            });
        } else if (gameData && gameData.year && gameData.week) {
            // The JSON structure might be different than expected
            console.warn('JSON structure is different than expected, trying alternative processing');
            
            // If we have a different structure, try to extract games differently
            // This is more of a fallback for different JSON formats
            if (Array.isArray(gameData)) {
                // If the data is already an array of games
                return processGameData({ games: gameData }, teamFilter);
            }
        }
        
        console.log(`Processed ${games.length} games`);
        return games;
    }
    
    // Display games in the UI
    function displayGames(games, team) {
        // Clear previous results
        gameResults.innerHTML = '';
        
        if (games.length === 0) {
            showEmptyState();
            resultsCount.textContent = '0 games found';
            return;
        }
        
        resultsCount.textContent = `${games.length} games found`;
        
        games.forEach(game => {
            renderGameCard(game);
        });
    }
    
    // Generate sample game data based on filters
    function generateSampleGames(season, week, team) {
        const numberOfGames = Math.floor(Math.random() * 6);
        const games = [];
        
        for (let i = 0; i < numberOfGames; i++) {
            const homeTeamIndex = Math.floor(Math.random() * nflTeams.length);
            let awayTeamIndex = Math.floor(Math.random() * nflTeams.length);
            
            while (awayTeamIndex === homeTeamIndex) {
                awayTeamIndex = Math.floor(Math.random() * nflTeams.length);
            }
            
            const homeTeam = nflTeams[homeTeamIndex];
            const awayTeam = nflTeams[awayTeamIndex];
            
            if (team !== 'all' && homeTeam.code !== team && awayTeam.code !== team) {
                continue;
            }
            
            const homeScore = Math.floor(Math.random() * 42);
            const awayScore = Math.floor(Math.random() * 42);
            
            const gameDate = new Date(Number(season), Math.floor(Math.random() * 5) + 8, Math.floor(Math.random() * 30) + 1);
            
            games.push({
                id: i + 1,
                homeTeam: homeTeam,
                awayTeam: awayTeam,
                homeScore: homeScore,
                awayScore: awayScore,
                date: gameDate,
                stadium: 'Sample Stadium',
                attendance: Math.floor(Math.random() * 70000) + 10000
            });
        }
        
        return games;
    }
    
    // Render a game card
    function renderGameCard(game) {
        const gameCard = document.createElement('div');
        gameCard.className = 'game-card';
        
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        const formattedDate = game.date.toLocaleDateString('en-US', options);
        const [weekday, month, day] = formattedDate.split(', ');
        
        // Determine winner or tie
        let homeTeamClass = '';
        let awayTeamClass = '';
        let gameStatus = 'Final';
        
        if (game.homeScore > game.awayScore) {
            homeTeamClass = 'winner';
        } else if (game.awayScore > game.homeScore) {
            awayTeamClass = 'winner';
        } else if (game.homeScore === game.awayScore && game.homeScore > 0) {
            homeTeamClass = 'tie';
            awayTeamClass = 'tie';
        }
        
        // Extract season and week information from the current selections
        const season = document.getElementById('season').value;
        const week = document.getElementById('week').value;
        
        gameCard.innerHTML = `
            <div class="game-date">
                <div class="game-date-info">
                    <div class="day">${weekday}</div>
                    <div class="date">${month} ${day}</div>
                </div>
                <div class="game-status">${gameStatus}</div>
            </div>
            <div class="matchup">
                <div class="team-side ${awayTeamClass} ${game.awayTeam.code}">
                    <div class="team-logo">
                        <img src="../assets/nfl-logos/${game.awayTeam.code.toLowerCase()}.png" alt="${game.awayTeam.name} logo">
                    </div>
                    <div class="team-score">${game.awayScore}</div>
                    <div class="team-name">${game.awayTeam.name}</div>
                </div>
                <div class="team-side ${homeTeamClass} ${game.homeTeam.code}">
                    <div class="team-logo">
                        <img src="../assets/nfl-logos/${game.homeTeam.code.toLowerCase()}.png" alt="${game.homeTeam.name} logo">
                    </div>
                    <div class="team-score">${game.homeScore}</div>
                    <div class="team-name">${game.homeTeam.name}</div>
                </div>
            </div>
            <div class="game-info">
                <div class="venue-info">
                    <span><i class="fas fa-map-marker-alt"></i> ${game.stadium}</span>
                    <span><i class="fas fa-users"></i> ${game.attendance.toLocaleString()}</span>
                </div>
                <span class="game-details-link"><a href="nfl-game-details.html?gameId=${game.id}&season=${season}&week=${week}"><i class="fas fa-chart-bar"></i> Game Details</a></span>
            </div>
        `;
        
        gameResults.appendChild(gameCard);
    }
    
    // Show empty state when no results
    function showEmptyState() {
        gameResults.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>No games found matching your criteria. Try adjusting your filters.</p>
            </div>
        `;
    }
    
    // Initialize
    discoverAvailableSeasons();
    populateTeamDropdown();
    
    // Event listeners for filters to trigger search automatically
    seasonSelect.addEventListener('change', function() {
        // Get the new season value
        const newSeason = parseInt(this.value);
        console.log(`Season changed to: ${newSeason}`);
        
        // Clear and disable the week dropdown during update
        weekSelect.innerHTML = '<option value="loading">Loading weeks...</option>';
        weekSelect.disabled = true;
        
        // Update weeks for the selected season
        discoverWeeksForSeason(newSeason);
        // Note: searchGames() will be called by populateWeekDropdown when it's done
    });
    
    // Add event listeners to trigger search when filters change
    weekSelect.addEventListener('change', searchGames);
    teamSelect.addEventListener('change', searchGames);
});
