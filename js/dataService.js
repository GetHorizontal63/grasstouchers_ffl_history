/**
 * RChos Fantasy Football League - Data Service
 * 
 * This module handles all data operations including:
 * - Loading league data
 * - Data caching
 * - Providing data access methods
 * - Statistical calculations
 */

const DataService = (function() {
    // Private variables
    let _leagueData = null;
    let _rawScoreData = null;  // Store raw score data for bench calculations
    let _divisionData = null;  // Add variable for division data
    let _isDataLoaded = false;
    let _isDivisionsLoaded = false;  // Track division data loading
    let _lastLoaded = null;
    let _dataListeners = [];
    let _isLoading = false; // Track loading state
    let _loadError = null;  // Store any loading error

    // Configuration
    const _config = {
        dataPath: '../Data/league_score_data.json',
        divisionsPath: '../Data/divisions.json',  // Add path for divisions.json
        cacheExpiration: 30 * 60 * 1000, // 30 minutes in milliseconds
        useLocalStorage: true,
        storageKey: 'rchosffl_data',
        divisionsStorageKey: 'rchosffl_divisions'  // Add storage key for divisions
    };
    
    // Store data in localStorage
    const _storeData = function() {
        if (!_config.useLocalStorage) return;
        
        try {
            localStorage.setItem(_config.storageKey, JSON.stringify({
                data: _leagueData,
                rawData: _rawScoreData,
                timestamp: _lastLoaded
            }));
        } catch (error) {
            console.warn('Failed to store data in localStorage:', error);
        }
    };
    
    // Get stored data from localStorage
    const _getStoredData = function() {
        if (!_config.useLocalStorage) return null;
        
        try {
            const stored = localStorage.getItem(_config.storageKey);
            if (!stored) return null;
            
            const parsedData = JSON.parse(stored);
            const now = new Date().getTime();
            
            // Check if data is still valid
            if (now - parsedData.timestamp <= _config.cacheExpiration) {
                return parsedData;
            }
            
            return null;
        } catch (error) {
            console.warn('Failed to retrieve data from localStorage:', error);
            return null;
        }
    };
    
    // Notify all listeners that data has been loaded
    const _notifyListeners = function() {
        _dataListeners.forEach(listener => {
            try {
                listener(_leagueData);
            } catch (error) {
                console.error('Error in data listener:', error);
            }
        });
    };
    
    // Parse raw data and perform any necessary transformations
    const _parseData = function(rawData) {
        // Normalize the data
        if (rawData && rawData.length > 0) {
            // Create a structured format for the app
            const leagueData = {
                league_data: {
                    seasons: []
                }
            };
            
            // Group by season
            const seasonGroups = {};
            let total2025Games = 0;
            let weekSet = new Set();
            
            rawData.forEach(game => {
                // Count 2025 games for debugging
                if (game.Season === 2025) {
                    total2025Games++;
                    weekSet.add(game.Week);
                }
                
                // Convert season to string for consistency
                const season = String(game.Season);
                
                // Initialize season if not exists
                if (!seasonGroups[season]) {
                    seasonGroups[season] = {
                        season: season,
                        weeks: {}
                    };
                }
                
                // Convert week to string
                const week = String(game.Week);
                
                // Initialize week if not exists
                if (!seasonGroups[season].weeks[week]) {
                    seasonGroups[season].weeks[week] = {
                        week: week,
                        league_week: String(game["League Week"]),
                        season_period: game["Season Period"],
                        games: []
                    };
                }
                
                // Parse all numeric fields, handling empty/blank values
                const teamScoreRaw = game["Team Score"];
                const opponentScoreRaw = game["Opponent Score"];
                const teamScore = (teamScoreRaw && teamScoreRaw !== "") ? parseFloat(teamScoreRaw) : "";
                const opponentScore = (opponentScoreRaw && opponentScoreRaw !== "") ? parseFloat(opponentScoreRaw) : "";
                
                // Parse score diff, handling the case where it might be a string with quotes
                let scoreDiff = game["Score Diff"];
                if (scoreDiff && scoreDiff !== "") {
                    if (typeof scoreDiff === 'string') {
                        // Remove any quotes from string
                        scoreDiff = scoreDiff.replace(/["']/g, '');
                    }
                    scoreDiff = parseFloat(scoreDiff);
                } else {
                    scoreDiff = "";
                }
                
                // Add game to the week
                seasonGroups[season].weeks[week].games.push({
                    team: game.Team,
                    opponent: game.Opponent,
                    team_score: teamScore,
                    opponent_score: opponentScore,
                    score_diff: scoreDiff,
                    game_id: game["Game ID"]
                });
            });
            
            console.log(`Processed ${total2025Games} games for 2025, found weeks:`, Array.from(weekSet).sort());

            // Convert to arrays for easier processing
            Object.values(seasonGroups).forEach(season => {
                const weekArray = Object.values(season.weeks);
                season.weeks = weekArray;
                leagueData.league_data.seasons.push(season);
                
                // Debug 2025 season specifically
                if (season.season === '2025') {
                    console.log(`2025 season after processing: ${season.weeks.length} weeks`);
                    console.log('2025 weeks:', season.weeks.map(w => w.week));
                }
            });
            
            return leagueData;
        }
        
        // Return original data if parsing fails
        return rawData;
    };
    
    // Process raw data into a more structured format
    const _processRawData = function(rawData) {
        // This is just a wrapper for _parseData to ensure backward compatibility
        return _parseData(rawData);
    };
    
    // Load division data
    const _loadDivisionData = async function() {
        try {
            // Check if we have recent data in storage
            if (_config.useLocalStorage) {
                const stored = localStorage.getItem(_config.divisionsStorageKey);
                if (stored) {
                    const parsedData = JSON.parse(stored);
                    const now = new Date().getTime();
                    
                    if (now - parsedData.timestamp <= _config.cacheExpiration) {
                        console.log('Using cached division data');
                        _divisionData = parsedData.data;
                        _isDivisionsLoaded = true;
                        return _divisionData;
                    }
                }
            }
            
            // Use XMLHttpRequest for local file access
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', _config.divisionsPath, true);
                xhr.responseType = 'json';
                
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        // Store division data
                        _divisionData = xhr.response;
                        _isDivisionsLoaded = true;
                        _lastLoaded = new Date().getTime();
                        
                        // Cache in localStorage
                        if (_config.useLocalStorage) {
                            try {
                                localStorage.setItem(_config.divisionsStorageKey, JSON.stringify({
                                    data: _divisionData,
                                    timestamp: _lastLoaded
                                }));
                            } catch (error) {
                                console.warn('Failed to store division data in localStorage:', error);
                            }
                        }
                        
                        console.log('Division data loaded successfully');
                        resolve(_divisionData);
                    } else {
                        const error = new Error(`Failed to load division data: ${xhr.status}`);
                        console.error(error);
                        reject(error);
                    }
                };
                
                xhr.onerror = function() {
                    const error = new Error('Network error while loading division data');
                    console.error(error);
                    reject(error);
                };
                
                xhr.send();
            });
        } catch (error) {
            console.error('Error loading division data:', error);
            throw error;
        }
    };

    // Calculate team statistics for all teams
    const _calculateAllTeamStats = function(seasonFilter = null) {
        const teams = module.getAllTeams();
        const allStats = {};
        
        teams.forEach(team => {
            allStats[team] = module.calculateTeamStats(team, seasonFilter);
        });
        
        return allStats;
    };
    
    // Initialize and load data
    function _loadData() {
        _isLoading = true;
        
        // Clear any existing error
        _loadError = null;
        
        // Specify the exact file path
        const dataFilePath = '../Data/league_score_data.json';
        console.log('Loading league data from:', dataFilePath);
        
        // Fetch the data
        fetch(dataFilePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                // Store the raw data first
                _rawScoreData = data;
                
                // Store the loaded data
                _leagueData = data;
                _isDataLoaded = true;
                _isLoading = false;
                
                console.log('League data loaded successfully');
                
                // Process the raw data into a more usable format
                _leagueData = _processRawData(data);
                
                // Store data in cache
                _lastLoaded = new Date().getTime();
                _storeData();
                
                // Dispatch an event to notify that data is loaded
                const dataLoadedEvent = new CustomEvent('dataLoaded');
                document.dispatchEvent(dataLoadedEvent);
                
                console.log('League data processed and ready');
            })
            .catch(error => {
                _loadError = error.message;
                _isLoading = false;
                console.error('Error loading league data:', error);
            });
    }

    // Public API
    const module = {
        // Initialize the data service
        init: async function(options = {}) {
            // Override default config with options
            Object.assign(_config, options);
            
            console.log('Initializing DataService with config:', _config);
            
            // Load data
            try {
                // Load both league data and division data in parallel
                await Promise.all([
                    this.loadData(),
                    _loadDivisionData()
                ]);
                console.log('DataService initialized successfully');
                return _leagueData;
            } catch (error) {
                console.error('Error initializing data service:', error);
                throw error;
            }
        },
        
        // Load league data
        loadData: async function() {
            try {
                console.log('Loading league data from path:', _config.dataPath);
                
                // Force reload to ensure we have raw data for bench scoring
                // const storedData = _getStoredData();
                // if (storedData) {
                //     console.log('Using cached league data');
                //     _leagueData = storedData.data;
                //     _rawScoreData = storedData.rawData || null; // Use rawData if available, otherwise null
                //     _isDataLoaded = true;
                //     _lastLoaded = storedData.timestamp;
                //     _notifyListeners();
                //     
                //     // If we don't have raw data in cache, we'll need to reload to get it
                //     if (!_rawScoreData) {
                //         console.log('No raw data in cache, will reload for bench scoring');
                //     }
                //     
                //     return _leagueData;
                // }
                
                // Use XMLHttpRequest instead of fetch for local file access
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', _config.dataPath, true);
                    xhr.responseType = 'json';
                    
                    xhr.onload = function() {
                        if (xhr.status === 200) {
                            // Store raw data FIRST
                            _rawScoreData = xhr.response;
                            
                            // Parse and store data
                            _leagueData = _parseData(xhr.response);
                            _isDataLoaded = true;
                            _lastLoaded = new Date().getTime();
                            
                            // Cache in localStorage
                            _storeData();
                            
                            console.log('League data loaded successfully');
                            console.log('Raw score data available:', _rawScoreData ? _rawScoreData.length : 'NO');
                            
                            // Notify listeners
                            _notifyListeners();
                            
                            resolve(_leagueData);
                        } else {
                            const error = new Error(`Failed to load data: ${xhr.status}`);
                            console.error(error);
                            reject(error);
                        }
                    };
                    
                    xhr.onerror = function() {
                        const error = new Error('Network error while loading data');
                        console.error(error);
                        reject(error);
                    };
                    
                    xhr.send();
                });
            } catch (error) {
                console.error('Error loading league data:', error);
                throw error;
            }
        },
        
        // Check if data is loaded
        isDataLoaded: function() {
            return _isDataLoaded;
        },
        
        /**
         * Get the division a team belongs to in a specific season
         * @param {string} team - The team name
         * @param {string|null} season - The season to check (null or undefined will use latest season)
         * @returns {string} - Division name or null if not found
         */
        getTeamDivision: function(team, season) {
            if (!team) return null;
            
            try {
                // If no season specified, use most recent season
                if (!season) {
                    season = this.getMostRecentSeason();
                } else if (season === 'All Time') {
                    // For 'All Time', just return empty string
                    return '';
                }
                
                // Get division data from loaded data
                const divisionData = _divisionData || {};
                const seasonDivisions = divisionData[season] || {};
                
                // Look through all divisions to find the team
                for (const [divisionName, teams] of Object.entries(seasonDivisions)) {
                    if (Array.isArray(teams) && teams.includes(team)) {
                        return divisionName;
                    }
                }
                
                return 'Unknown';
            } catch (error) {
                console.error(`Error getting division for team ${team} in season ${season}:`, error);
                return 'Unknown';
            }
        },
        
        /**
         * Get all divisions for a specific season
         * @param {string|null} season - The season to get divisions for
         * @returns {object} - Object containing division names and their teams
         */
        getDivisionsForSeason: function(season) {
            try {
                // If no season specified, use most recent season
                if (!season) {
                    season = this.getMostRecentSeason();
                } else if (season === 'All Time') {
                    // For 'All Time', return divisions from most recent season
                    season = this.getMostRecentSeason();
                }
                
                // Get division data from loaded data
                const divisionData = _divisionData || {};
                return divisionData[season] || {};
            } catch (error) {
                console.error(`Error getting divisions for season ${season}:`, error);
                return {};
            }
        },
        
        /**
         * Get divisions from the most recent season
         * @returns {Array} - Array of division objects with name and teams
         */
        getLatestDivisions: function() {
            const latestSeason = this.getMostRecentSeason();
            if (!latestSeason) return [];
            
            const divisionData = _divisionData || {};
            const seasonDivisions = divisionData[latestSeason] || {};
            
            return Object.entries(seasonDivisions).map(([name, teams]) => ({
                name: name,
                teams: teams || []
            }));
        },
        
        /**
         * Get most recent season from the data
         * @returns {string} - Season identifier
         */
        getMostRecentSeason: function() {
            if (!_leagueData || !_leagueData.league_data || !_leagueData.league_data.seasons) {
                return null;
            }
            
            const seasons = _leagueData.league_data.seasons;
            if (seasons.length === 0) return null;
            
            // Find the highest season number
            let mostRecent = seasons[0].season;
            
            seasons.forEach(season => {
                if (parseInt(season.season) > parseInt(mostRecent)) {
                    mostRecent = season.season;
                }
            });
            
            return mostRecent;
        },
        
        /**
         * Get the raw loaded data for direct access
         * @returns {Object} - The raw data object
         */
        getRawData: function() {
            return {
                league_data: _leagueData?.league_data || null,
                divisions: _divisionData || null
            };
        },

        // Add a listener for data load events
        addDataListener: function(callback) {
            if (typeof callback === 'function') {
                _dataListeners.push(callback);
                
                // If data is already loaded, call the listener immediately
                if (_isDataLoaded) {
                    callback(_leagueData);
                }
            }
        },
        
        // Remove a data listener
        removeDataListener: function(callback) {
            const index = _dataListeners.indexOf(callback);
            if (index !== -1) {
                _dataListeners.splice(index, 1);
            }
        },
        
        // Clear cached data
        clearCache: function() {
            if (_config.useLocalStorage) {
                localStorage.removeItem(_config.storageKey);
                localStorage.removeItem(_config.divisionsStorageKey);  // Clear divisions cache
            }
            
            _leagueData = null;
            _divisionData = null;  // Clear division data
            _isDataLoaded = false;
            _isDivisionsLoaded = false;  // Reset divisions loading flag
            _lastLoaded = null;
        },
        
        // Get all teams from the data
        getAllTeams: function() {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return [];
            }
            
            const teamsSet = new Set();
            
            _leagueData.league_data.seasons.forEach(season => {
                season.weeks.forEach(week => {
                    week.games.forEach(game => {
                        if (game.team !== 'Bye') teamsSet.add(game.team);
                        if (game.opponent !== 'Bye') teamsSet.add(game.opponent);
                    });
                });
            });
            
            return Array.from(teamsSet).sort();
        },
        
        // Get all seasons from the data
        getAllSeasons: function() {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return [];
            }
            
            const seasonsSet = new Set();
            
            _leagueData.league_data.seasons.forEach(season => {
                seasonsSet.add(season.season);
            });
            
            return Array.from(seasonsSet).sort((a, b) => parseInt(a) - parseInt(b));
        },
        
        // Get data for a specific season
        getSeason: function(seasonYear) {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return null;
            }
            
            return _leagueData.league_data.seasons.find(s => s.season === seasonYear) || null;
        },
        
        // Get all weeks for a specific season
        getSeasonWeeks: function(seasonYear) {
            const season = this.getSeason(seasonYear);
            if (!season) return [];
            
            return [...season.weeks].sort((a, b) => parseInt(a.week) - parseInt(b.week));
        },

        // Get all weeks for a specific season
        getWeeksForSeason: function(season) {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                console.log('Data not loaded in getWeeksForSeason');
                return [];
            }
            
            console.log('Looking for season:', season, typeof season);
            console.log('Available seasons:', _leagueData.league_data.seasons.map(s => ({season: s.season, type: typeof s.season})));
            
            // Convert season to string for consistent comparison
            const seasonStr = String(season);
            const seasonData = _leagueData.league_data.seasons.find(s => String(s.season) === seasonStr);
            
            if (!seasonData) {
                console.log(`Season ${season} not found`);
                return [];
            }
            
            const weeks = seasonData.weeks.map(week => week.week);
            console.log(`Found ${weeks.length} weeks for season ${season}:`, weeks);
            return weeks;
        },
        
        // Get games for a specific week
        getGamesForWeek: function(season, week) {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return [];
            }
            
            const seasonData = _leagueData.league_data.seasons.find(s => s.season == season);
            if (!seasonData) return [];
            
            const weekData = seasonData.weeks.find(w => w.week == week);
            if (!weekData) return [];
            
            return weekData.games;
        },
        
        // Calculate overall season stats
        calculateSeasonStats: function(season) {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return null;
            }
            
            const seasonData = _leagueData.league_data.seasons.find(s => s.season == season);
            if (!seasonData) return null;
            
            let totalGames = 0;
            let totalPoints = 0;
            let highestScore = 0;
            let lowestScore = Number.MAX_VALUE;
            let closestGame = Number.MAX_VALUE;
            let biggestBlowout = 0;
            
            seasonData.weeks.forEach(week => {
                week.games.forEach(game => {
                    if (game.team !== 'Bye' && game.opponent !== 'Bye') {
                        // Check if score data is available
                        const teamScore = game.team_score;
                        const opponentScore = game.opponent_score;
                        
                        if (!teamScore || teamScore === "" || !opponentScore || opponentScore === "") {
                            return; // Skip games with missing score data
                        }
                        
                        const teamScoreNum = parseFloat(teamScore);
                        const opponentScoreNum = parseFloat(opponentScore);
                        
                        if (isNaN(teamScoreNum) || isNaN(opponentScoreNum)) {
                            return; // Skip games with invalid score data
                        }
                        
                        totalGames++;
                        totalPoints += teamScoreNum;
                        
                        // Track highest/lowest scores
                        highestScore = Math.max(highestScore, teamScoreNum);
                        lowestScore = Math.min(lowestScore, teamScoreNum);
                        
                        // Track game margins
                        const scoreDiff = Math.abs(teamScoreNum - opponentScoreNum);
                        closestGame = Math.min(closestGame, scoreDiff);
                        biggestBlowout = Math.max(biggestBlowout, scoreDiff);
                    }
                });
            });
            
            return {
                season: season,
                games: totalGames,
                totalPoints: totalPoints,
                avgScore: totalGames > 0 ? totalPoints / totalGames : 0,
                highestScore: highestScore,
                lowestScore: lowestScore === Number.MAX_VALUE ? 0 : lowestScore,
                closestGame: closestGame === Number.MAX_VALUE ? 0 : closestGame,
                biggestBlowout: biggestBlowout
            };
        },
        
        // Get league leaders
        getLeagueLeaders: function() {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return null;
            }
            
            const teams = this.getAllTeams();
            if (!teams || teams.length === 0) return null;
            
            const teamStats = teams.map(team => {
                const stats = this.calculateTeamStats(team);
                if (!stats || stats.games === 0) return null;
                
                return {
                    team: team,
                    games: stats.games,
                    wins: stats.wins,
                    losses: stats.losses,
                    winPct: stats.winPct,
                    pointsFor: stats.pointsFor,
                    avgPointsFor: stats.avgPointsFor
                };
            }).filter(Boolean);
            
            // Sort for different categories
            const pointsLeaders = [...teamStats].sort((a, b) => b.pointsFor - a.pointsFor);
            const winsLeaders = [...teamStats].sort((a, b) => {
                if (b.wins !== a.wins) return b.wins - a.wins;
                return b.winPct - a.winPct;
            });
            
            return {
                pointsLeaders: pointsLeaders,
                winsLeaders: winsLeaders
            };
        },
        
        // Calculate team statistics
        calculateTeamStats: function(team, seasonFilter = null) {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return null;
            }
            
            const stats = {
                team: team,
                games: 0,
                wins: 0,
                losses: 0,
                pointsFor: 0,
                pointsAgainst: 0,
                highestScore: 0,
                lowestScore: Infinity,
                seasons: new Set(),
                currentStreak: 0,
                streakType: null,
                longestWinStreak: 0,
                longestLossStreak: 0,
                gameLog: []
            };
            
            // Sort seasons chronologically 
            const sortedSeasons = [..._leagueData.league_data.seasons]
                .sort((a, b) => parseInt(a.season) - parseInt(b.season));
                
            // Process each season
            sortedSeasons.forEach(season => {
                // Apply season filter if present
                if (seasonFilter && season.season !== seasonFilter) {
                    return;
                }
                
                // Sort weeks chronologically
                const sortedWeeks = [...season.weeks]
                    .sort((a, b) => parseInt(a.week) - parseInt(b.week));
                    
                // Process each week
                sortedWeeks.forEach(week => {
                    // Process each game
                    week.games.forEach(game => {
                        // Skip games against "Bye"
                        if (game.team === 'Bye' || game.opponent === 'Bye') {
                            return;
                        }
                        
                        // Only process games for the requested team
                        if (game.team !== team) {
                            return;
                        }
                        
                        // Check if score data is available (not empty/blank)
                        const teamScore = game.team_score;
                        const opponentScore = game.opponent_score;
                        const scoreDiff = game.score_diff;
                        
                        // Skip games with missing score data
                        if (!teamScore || teamScore === "" || !opponentScore || opponentScore === "" ||
                            !scoreDiff || scoreDiff === "") {
                            return; // Skip this game
                        }
                        
                        // Parse scores
                        const teamScoreNum = parseFloat(teamScore);
                        const opponentScoreNum = parseFloat(opponentScore);
                        const scoreDiffNum = parseFloat(scoreDiff);
                        
                        // Verify parsed values are valid numbers
                        if (isNaN(teamScoreNum) || isNaN(opponentScoreNum) || isNaN(scoreDiffNum)) {
                            return; // Skip this game
                        }
                        
                        // Update basic stats
                        stats.games++;
                        stats.seasons.add(season.season);
                        stats.pointsFor += teamScoreNum;
                        stats.pointsAgainst += opponentScoreNum;
                        
                        // Track highest/lowest scores
                        stats.highestScore = Math.max(stats.highestScore, teamScoreNum);
                        stats.lowestScore = Math.min(stats.lowestScore, teamScoreNum);
                        
                        // Add to game log
                        stats.gameLog.push({
                            season: season.season,
                            week: week.week,
                            seasonPeriod: week.season_period,
                            opponent: game.opponent,
                            teamScore: teamScoreNum,
                            opponentScore: opponentScoreNum,
                            scoreDiff: scoreDiffNum,
                            result: scoreDiffNum > 0 ? 'W' : 'L'
                        });
                        
                        // Update win/loss and streaks
                        if (scoreDiffNum > 0) {
                            stats.wins++;
                            
                            // Update streaks
                            if (stats.streakType === 'W') {
                                stats.currentStreak++;
                            } else {
                                stats.streakType = 'W';
                                stats.currentStreak = 1;
                            }
                            
                            // Update longest win streak
                            stats.longestWinStreak = Math.max(stats.longestWinStreak, stats.currentStreak);
                        } else {
                            stats.losses++;
                            
                            // Update streaks
                            if (stats.streakType === 'L') {
                                stats.currentStreak++;
                            } else {
                                stats.streakType = 'L';
                                stats.currentStreak = 1;
                            }
                            
                            // Update longest loss streak
                            stats.longestLossStreak = Math.max(stats.longestLossStreak, stats.currentStreak);
                        }
                    });
                });
            });
            
            // Calculate derived stats
            stats.winPct = stats.games > 0 ? stats.wins / stats.games : 0;
            stats.avgPointsFor = stats.games > 0 ? stats.pointsFor / stats.games : 0;
            stats.avgPointsAgainst = stats.games > 0 ? stats.pointsAgainst / stats.games : 0;
            stats.pointDifferential = stats.pointsFor - stats.pointsAgainst;
            stats.avgPointDifferential = stats.games > 0 ? stats.pointDifferential / stats.games : 0;
            stats.seasons = Array.from(stats.seasons).sort();
            
            // Count 200+ point games
            stats.games200Plus = stats.gameLog.filter(game => game.teamScore >= 200).length;
            
            // Fix lowest score if no games played
            if (stats.lowestScore === Infinity) {
                stats.lowestScore = 0;
            }
            
            // Format current streak for display
            stats.currentStreakDisplay = stats.currentStreak > 0 ? 
                `${stats.currentStreak}${stats.streakType}` : 'None';
            
            return stats;
        },
        
        // Calculate all team stats
        calculateAllTeamStats: function(seasonFilter = null) {
            return _calculateAllTeamStats(seasonFilter);
        },
        
        // Calculate season standings for a specific season and week
        calculateSeasonStandings: function(season, week = 'All') {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return [];
            }
            
            // Get all teams
            const teams = this.getAllTeams();
            
            // Get the season data
            const seasonData = this.getSeason(season);
            if (!seasonData) return [];
            
            // Calculate stats for each team in the season up to the selected week
            const teamStats = {};
            
            // Filter weeks based on the week filter
            let weeksToInclude = [...seasonData.weeks]; 
            
            if (week !== 'All') {
                // Only include weeks up to and including the selected week
                weeksToInclude = weeksToInclude.filter(weekData => 
                    parseInt(weekData.week) <= parseInt(week)
                );
            }
            
            // Sort weeks chronologically
            weeksToInclude.sort((a, b) => parseInt(a.week) - parseInt(b.week));
            
            // Process each team
            teams.forEach(team => {
                // Initialize team stats
                teamStats[team] = {
                    team: team,
                    division: this.getTeamDivision(team, season),
                    wins: 0,
                    losses: 0,
                    pointsFor: 0,
                    pointsAgainst: 0,
                    games: 0,
                    currentStreak: 0,
                    streakType: null
                };
                
                // Process each week's games for this team
                weeksToInclude.forEach(week => {
                    week.games.forEach(game => {
                        // Skip games against "Bye"
                        if (game.team === 'Bye' || game.opponent === 'Bye') {
                            return;
                        }
                        
                        // Only process games where this team participated
                        if (game.team === team) {
                            // Check if score data is available (not empty/blank)
                            const teamScore = game.team_score;
                            const opponentScore = game.opponent_score;
                            const scoreDiff = game.score_diff;
                            
                            // Skip games with missing score data
                            if (!teamScore || teamScore === "" || !opponentScore || opponentScore === "" ||
                                !scoreDiff || scoreDiff === "") {
                                return; // Skip this game
                            }
                            
                            // Parse scores
                            const teamScoreNum = parseFloat(teamScore);
                            const opponentScoreNum = parseFloat(opponentScore);
                            const scoreDiffNum = parseFloat(scoreDiff);
                            
                            // Verify parsed values are valid numbers
                            if (isNaN(teamScoreNum) || isNaN(opponentScoreNum) || isNaN(scoreDiffNum)) {
                                return; // Skip this game
                            }
                            
                            // Update basic stats
                            teamStats[team].games++;
                            teamStats[team].pointsFor += teamScoreNum;
                            teamStats[team].pointsAgainst += opponentScoreNum;
                            
                            // Update win/loss and streaks
                            if (scoreDiffNum > 0) {
                                teamStats[team].wins++;
                                
                                // Update streak
                                if (teamStats[team].streakType === 'W') {
                                    teamStats[team].currentStreak++;
                                } else {
                                    teamStats[team].streakType = 'W';
                                    teamStats[team].currentStreak = 1;
                                }
                            } else {
                                teamStats[team].losses++;
                                
                                // Update streak
                                if (teamStats[team].streakType === 'L') {
                                    teamStats[team].currentStreak++;
                                } else {
                                    teamStats[team].streakType = 'L';
                                    teamStats[team].currentStreak = 1;
                                }
                            }
                        }
                    });
                });
                
                // Calculate derived stats
                teamStats[team].winPct = teamStats[team].games > 0 ? 
                    teamStats[team].wins / teamStats[team].games : 0;
                teamStats[team].avgPointsFor = teamStats[team].games > 0 ? 
                    teamStats[team].pointsFor / teamStats[team].games : 0;
                teamStats[team].avgPointsAgainst = teamStats[team].games > 0 ? 
                    teamStats[team].pointsAgainst / teamStats[team].games : 0;
                teamStats[team].pointDifferential = 
                    teamStats[team].pointsFor - teamStats[team].pointsAgainst;
                teamStats[team].avgPointDifferential = teamStats[team].games > 0 ? 
                    teamStats[team].pointDifferential / teamStats[team].games : 0;
                teamStats[team].currentStreakDisplay = teamStats[team].currentStreak > 0 ? 
                    `${teamStats[team].currentStreak}${teamStats[team].streakType}` : 'None';
            });
            
            // Create standings array from teams with at least one game
            const standings = Object.values(teamStats)
                .filter(stats => stats.games > 0)
                .map(stats => ({
                    team: stats.team,
                    division: stats.division,
                    wins: stats.wins,
                    losses: stats.losses,
                    winPct: stats.winPct,
                    pointsFor: stats.pointsFor,
                    avgPointsFor: stats.avgPointsFor,
                    pointsAgainst: stats.pointsAgainst,
                    avgPointsAgainst: stats.avgPointsAgainst,
                    pointDifferential: stats.pointDifferential,
                    avgPointDifferential: stats.avgPointDifferential,
                    streak: stats.currentStreakDisplay
                }));
            
            return standings;
        },
        
        // Calculate All Time standings for a specific week across all seasons
        calculateAllTimeStandings: function(week) {
            if (!_isDataLoaded || !_rawScoreData) {
                console.log('All Time standings: Data not loaded or raw data missing');
                return [];
            }
            
            console.log(`Calculating All Time standings for week ${week}`);
            console.log('Raw score data length:', _rawScoreData.length);
            
            // Get all teams
            const teams = this.getAllTeams();
            
            // Initialize team stats
            const teamStats = {};
            teams.forEach(team => {
                teamStats[team] = {
                    team: team,
                    wins: 0,
                    losses: 0,
                    pointsFor: 0,
                    pointsAgainst: 0,
                    games: 0,
                    currentStreak: 0,
                    streakType: null
                };
            });
            
            let gamesProcessed = 0;
            let teamsWithData = new Set();
            
            // Process score data for the specific week across all seasons
            _rawScoreData.forEach(game => {
                // Only include games from the specified week (regardless of season)
                if (parseInt(game.Week) !== parseInt(week)) return;
                
                // Check if we have team score data
                const teamScore = parseFloat(game["Team Score"]);
                const opponentScore = parseFloat(game["Opponent Score"]);
                const scoreDiff = parseFloat(game["Score Diff"]);
                
                // Skip if any value is NaN or missing
                if (isNaN(teamScore) || isNaN(opponentScore) || isNaN(scoreDiff)) {
                    return;
                }
                
                const team = game.Team;
                
                // Skip if team not found in our team stats
                if (!teamStats[team]) {
                    return;
                }
                
                gamesProcessed++;
                teamsWithData.add(team);
                
                // Update basic stats
                teamStats[team].games++;
                teamStats[team].pointsFor += teamScore;
                teamStats[team].pointsAgainst += opponentScore;
                
                // Determine win/loss based on Score Diff
                const isWin = scoreDiff > 0;
                
                if (isWin) {
                    teamStats[team].wins++;
                } else {
                    teamStats[team].losses++;
                }
                
                // Update streak (simplified)
                teamStats[team].streakType = isWin ? 'W' : 'L';
                teamStats[team].currentStreak = 1;
            });
            
            console.log(`Processed ${gamesProcessed} games across all seasons for week ${week}`);
            console.log(`Teams with data: ${teamsWithData.size}`, Array.from(teamsWithData));
            
            // Create standings array
            const standings = Object.values(teamStats)
                .map(stats => ({
                    team: stats.team,
                    wins: stats.wins,
                    losses: stats.losses,
                    winPct: stats.games > 0 ? stats.wins / stats.games : 0,
                    pointsFor: stats.pointsFor,
                    avgPointsFor: stats.games > 0 ? stats.pointsFor / stats.games : 0,
                    pointsAgainst: stats.pointsAgainst,
                    avgPointsAgainst: stats.games > 0 ? stats.pointsAgainst / stats.games : 0,
                    pointDifferential: stats.pointsFor - stats.pointsAgainst,
                    avgPointDifferential: stats.games > 0 ? (stats.pointsFor - stats.pointsAgainst) / stats.games : 0,
                    streak: stats.games > 0 ? `${stats.currentStreak}${stats.streakType}` : 'None'
                }));
            
            console.log(`Returning ${standings.length} total teams (${standings.filter(s => s.games > 0).length} with data)`);
            return standings;
        },
        
        // Calculate All Time bench standings for a specific week across all seasons
        calculateBenchAllTimeStandings: function(week) {
            if (!_isDataLoaded || !_rawScoreData) {
                console.log('All Time bench standings: Data not loaded or raw data missing');
                return [];
            }
            
            console.log(`Calculating All Time bench standings for week ${week}`);
            console.log('Raw score data length:', _rawScoreData.length);
            
            // Get all teams
            const teams = this.getAllTeams();
            
            // Initialize team stats
            const teamStats = {};
            teams.forEach(team => {
                teamStats[team] = {
                    team: team,
                    wins: 0,
                    losses: 0,
                    pointsFor: 0,
                    pointsAgainst: 0,
                    games: 0,
                    currentStreak: 0,
                    streakType: null
                };
            });
            
            let gamesProcessed = 0;
            let teamsWithData = new Set();
            
            // Process score data for the specific week across all seasons
            _rawScoreData.forEach(game => {
                // Only include games from the specified week (regardless of season)
                if (parseInt(game.Week) !== parseInt(week)) return;
                
                // Check if we have bench score data
                const benchScore = parseFloat(game["Bench Score"]);
                const opponentBenchScore = parseFloat(game["Opponent Bench Score"]);
                const benchScoreDiff = parseFloat(game["Bench Score Diff"]);
                
                // Skip if any value is NaN or missing
                if (isNaN(benchScore) || isNaN(opponentBenchScore) || isNaN(benchScoreDiff)) {
                    return;
                }
                
                const team = game.Team;
                
                // Skip if team not found in our team stats
                if (!teamStats[team]) {
                    return;
                }
                
                gamesProcessed++;
                teamsWithData.add(team);
                
                // Update basic stats
                teamStats[team].games++;
                teamStats[team].pointsFor += benchScore;
                teamStats[team].pointsAgainst += opponentBenchScore;
                
                // Determine win/loss based on Bench Score Diff
                const isWin = benchScoreDiff > 0;
                
                if (isWin) {
                    teamStats[team].wins++;
                } else {
                    teamStats[team].losses++;
                }
                
                // Update streak (simplified)
                teamStats[team].streakType = isWin ? 'W' : 'L';
                teamStats[team].currentStreak = 1;
            });
            
            console.log(`Processed ${gamesProcessed} bench games across all seasons for week ${week}`);
            console.log(`Teams with bench data: ${teamsWithData.size}`, Array.from(teamsWithData));
            
            // Create standings array
            const standings = Object.values(teamStats)
                .map(stats => ({
                    team: stats.team,
                    wins: stats.wins,
                    losses: stats.losses,
                    winPct: stats.games > 0 ? stats.wins / stats.games : 0,
                    pointsFor: stats.pointsFor,
                    avgPointsFor: stats.games > 0 ? stats.pointsFor / stats.games : 0,
                    pointsAgainst: stats.pointsAgainst,
                    avgPointsAgainst: stats.games > 0 ? stats.pointsAgainst / stats.games : 0,
                    pointDifferential: stats.pointsFor - stats.pointsAgainst,
                    avgPointDifferential: stats.games > 0 ? (stats.pointsFor - stats.pointsAgainst) / stats.games : 0,
                    streak: stats.games > 0 ? `${stats.currentStreak}${stats.streakType}` : 'None'
                }));
            
            console.log(`Returning ${standings.length} total teams (${standings.filter(s => s.games > 0).length} with bench data)`);
            return standings;
        },
        
        // Calculate season standings using bench scores (Bench Score Diff)
        calculateBenchSeasonStandings: function(season, week = 'All') {
            if (!_isDataLoaded || !_rawScoreData) {
                console.log('Bench standings: Data not loaded or raw data missing');
                return [];
            }
            
            console.log(`Calculating bench standings for season ${season}, week ${week}`);
            console.log('Raw score data length:', _rawScoreData.length);
            
            // Get all teams
            const teams = this.getAllTeams();
            console.log('Teams found:', teams);
            
            // Initialize team stats
            const teamStats = {};
            teams.forEach(team => {
                teamStats[team] = {
                    team: team,
                    division: this.getTeamDivision(team, season),
                    wins: 0,
                    losses: 0,
                    pointsFor: 0,
                    pointsAgainst: 0,
                    games: 0,
                    currentStreak: 0,
                    streakType: null
                };
            });
            
            let gamesProcessed = 0;
            let teamsWithData = new Set();
            
            // Process score data for bench scores
            _rawScoreData.forEach(game => {
                // Skip if wrong season
                if (String(game.Season) !== String(season)) return;
                
                // Apply week filter - include ALL weeks up to the selected week
                if (week !== 'All' && parseInt(game.Week) > parseInt(week)) return;
                
                // Check if we have bench score data - be more lenient about what constitutes valid data
                const benchScore = parseFloat(game["Bench Score"]);
                const opponentBenchScore = parseFloat(game["Opponent Bench Score"]);
                const benchScoreDiff = parseFloat(game["Bench Score Diff"]);
                
                // Skip if any value is NaN or missing
                if (isNaN(benchScore) || isNaN(opponentBenchScore) || isNaN(benchScoreDiff)) {
                    return;
                }
                
                const team = game.Team;
                
                // Skip if team not found in our team stats
                if (!teamStats[team]) {
                    return;
                }
                
                gamesProcessed++;
                teamsWithData.add(team);
                
                // Update basic stats - ACCUMULATE over time
                teamStats[team].games++;
                teamStats[team].pointsFor += benchScore;
                teamStats[team].pointsAgainst += opponentBenchScore;
                
                // Determine win/loss based on Bench Score Diff (EXACTLY as you specified)
                const isWin = benchScoreDiff > 0;
                
                // Update win/loss - ACCUMULATE over time
                if (isWin) {
                    teamStats[team].wins++;
                } else {
                    teamStats[team].losses++;
                }
                
                // Update streaks (this is more complex for proper chronological order)
                // For now, just track the most recent result
                teamStats[team].streakType = isWin ? 'W' : 'L';
                teamStats[team].currentStreak = 1; // Simplified for now
            });
            
            console.log(`Processed ${gamesProcessed} bench games for season ${season}, week ${week}`);
            console.log(`Teams with bench data: ${teamsWithData.size}`, Array.from(teamsWithData));
            
            // Calculate derived stats and create standings array - INCLUDE ALL TEAMS even if no bench data
            const standings = Object.values(teamStats)
                .map(stats => ({
                    team: stats.team,
                    division: stats.division,
                    wins: stats.wins,
                    losses: stats.losses,
                    winPct: stats.games > 0 ? stats.wins / stats.games : 0,
                    pointsFor: stats.pointsFor,
                    avgPointsFor: stats.games > 0 ? stats.pointsFor / stats.games : 0,
                    pointsAgainst: stats.pointsAgainst,
                    avgPointsAgainst: stats.games > 0 ? stats.pointsAgainst / stats.games : 0,
                    pointDifferential: stats.pointsFor - stats.pointsAgainst,
                    avgPointDifferential: stats.games > 0 ? (stats.pointsFor - stats.pointsAgainst) / stats.games : 0,
                    streak: stats.games > 0 ? `${stats.currentStreak}${stats.streakType}` : 'None'
                }));
            
            console.log(`Returning ${standings.length} total teams (${standings.filter(s => s.games > 0).length} with bench data)`);
            return standings;
        },
        
        // Find games where teams scored 200+ points
        find200ClubMembers: function() {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return [];
            }
            
            const club200Members = [];
            
            // Sort seasons chronologically 
            const sortedSeasons = [..._leagueData.league_data.seasons]
                .sort((a, b) => parseInt(a.season) - parseInt(b.season));
                
            // Process each season
            sortedSeasons.forEach(season => {
                // Sort weeks chronologically
                const sortedWeeks = [...season.weeks]
                    .sort((a, b) => parseInt(a.week) - parseInt(b.week));
                    
                // Process each week
                sortedWeeks.forEach(week => {
                    // Process each game
                    week.games.forEach(game => {
                        // Skip games against "Bye"
                        if (game.team === 'Bye' || game.opponent === 'Bye') {
                            return;
                        }
                        
                        // Check if score data is available and the team score is 200 or higher
                        const teamScore = game.team_score;
                        if (!teamScore || teamScore === "" || isNaN(parseFloat(teamScore))) {
                            return; // Skip games with missing score data
                        }
                        
                        const teamScoreNum = parseFloat(teamScore);
                        if (teamScoreNum >= 200) {
                            const opponentScore = game.opponent_score;
                            const opponentScoreNum = (opponentScore && opponentScore !== "") ? parseFloat(opponentScore) : 0;
                            
                            club200Members.push({
                                team: game.team,
                                opponent: game.opponent,
                                teamScore: teamScoreNum,
                                opponentScore: opponentScoreNum,
                                season: season.season,
                                week: week.week,
                                seasonOrder: parseInt(season.season), // For sorting by season
                                weekOrder: parseInt(week.week)        // For sorting by week
                            });
                        }
                    });
                });
            });
            
            return club200Members;
        },
        
        // Get all scores from all games
        getAllScores: function() {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return [];
            }
            
            const allScores = [];
            
            // Process each season
            _leagueData.league_data.seasons.forEach(season => {
                // Process each week
                season.weeks.forEach(week => {
                    // Process each game
                    week.games.forEach(game => {
                        // Skip games against "Bye"
                        if (game.team === 'Bye' || game.opponent === 'Bye') {
                            return;
                        }
                        
                        // Add team scores to the array
                        allScores.push(parseFloat(game.team_score));
                    });
                });
            });
            
            return allScores;
        },
        
        // Utility: Format number with commas
        formatNumber: function(number) {
            return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        // Utility: Format as percentage
        formatPercent: function(number, decimals = 1) {
            return (number * 100).toFixed(decimals) + '%';
        },
        
        // Utility: Get color for win/loss records
        getRecordColor: function(wins, losses) {
            if (wins === 0 && losses === 0) return '#6b7280'; // Gray for no games
            
            const winPct = wins / (wins + losses);
            
            if (winPct >= 0.7) return '#10b981'; // Green for good records
            if (winPct >= 0.5) return '#3b82f6'; // Blue for winning records
            if (winPct >= 0.3) return '#f59e0b'; // Yellow/orange for below .500
            return '#ef4444'; // Red for poor records
        },
        
        // Utility: Sort teams by various criteria
        sortTeams: function(teams, sortBy, direction = 'desc') {
            const sortFunctions = {
                name: (a, b) => a.team.localeCompare(b.team),
                wins: (a, b) => b.wins - a.wins,
                losses: (a, b) => b.losses - a.losses,
                winPct: (a, b) => b.winPct - a.winPct,
                pointsFor: (a, b) => b.pointsFor - a.pointsFor,
                pointsAgainst: (a, b) => b.pointsAgainst - a.pointsAgainst,
                pointDiff: (a, b) => (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst)
            };
            
            const sortFunction = sortFunctions[sortBy] || sortFunctions.winPct;
            let sorted = [...teams].sort(sortFunction);
            
            // Reverse if ascending order requested
            if (direction === 'asc') {
                sorted.reverse();
            }
            
            return sorted;
        },

        // Find most recent week based on the game with the largest Game ID
        getMostRecentWeekBasedOnGameId: function() {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return null;
            }
            
            let maxGameId = 0;
            let mostRecentWeek = null;
            let mostRecentSeason = null;
            
            // Iterate through all seasons and weeks to find the largest Game ID
            _leagueData.league_data.seasons.forEach(season => {
                season.weeks.forEach(week => {
                    week.games.forEach(game => {
                        const gameId = parseInt(game.game_id);
                        if (gameId > maxGameId) {
                            maxGameId = gameId;
                            mostRecentWeek = week.week;
                            mostRecentSeason = season.season;
                        }
                    });
                });
            });
            
            return {
                week: mostRecentWeek,
                season: mostRecentSeason
            };
        },

        // Load roster data for a specific season and week
        loadRosterData: async function(season, week) {
            try {
                const response = await fetch(`../data/rosters/${season}/week_${week}_rosters.json`);
                if (!response.ok) {
                    throw new Error(`Failed to load roster data for ${season} week ${week}`);
                }
                const rosterData = await response.json();
                return rosterData;
            } catch (error) {
                console.error('Error loading roster data:', error);
                return null;
            }
        },

        // Project end of season standings using comprehensive projection engine
        projectSeasonStandings: async function(season, currentWeek) {
            if (!_leagueData || !season || season === 'All Time') {
                return null;
            }

            try {
                // Initialize projection engine if not already done
                if (!window.projectionEngine) {
                    window.projectionEngine = new ProjectionEngine();
                    await window.projectionEngine.initialize();
                }

                // Get comprehensive projections
                const projections = window.projectionEngine.getProjectionSummary(season);
                
                if (!projections) {
                    console.warn('Projection engine failed to generate projections');
                    // Fallback to simple projection
                    return this._simpleProjection(season, currentWeek);
                }

                // Convert projections to standings format
                const projectedStandings = [];

                projections.teams.forEach((teamProjection) => {
                    // Get current team data
                    const currentData = this._getCurrentTeamData(teamProjection.teamName, season, currentWeek);
                    
                    projectedStandings.push({
                        team: teamProjection.teamName,
                        wins: teamProjection.projections.avgWins,
                        losses: 14 - teamProjection.projections.avgWins,
                        winPct: teamProjection.projections.avgWins / 14,
                        pointsFor: teamProjection.projections.avgPoints,
                        pointsAgainst: currentData.pointsAgainst || 0,
                        avgPointsFor: teamProjection.projections.avgPoints / 14,
                        avgPointsAgainst: (currentData.pointsAgainst || 0) / 14,
                        pointDifferential: teamProjection.projections.avgPoints - (currentData.pointsAgainst || 0),
                        avgPointDifferential: (teamProjection.projections.avgPoints - (currentData.pointsAgainst || 0)) / 14,
                        games: 14,
                        isProjected: true,
                        projectionDetails: {
                            playoffProbability: teamProjection.projections.playoffProbability,
                            championshipProbability: teamProjection.projections.championshipProbability,
                            bestCase: teamProjection.records.bestCase,
                            worstCase: teamProjection.records.worstCase,
                            mostLikely: teamProjection.records.mostLikely,
                            finishDistribution: teamProjection.projections.finishDistribution
                        }
                    });
                });

                // Sort by projected wins, then by projected points
                projectedStandings.sort((a, b) => {
                    if (Math.abs(a.wins - b.wins) < 0.1) {
                        return b.pointsFor - a.pointsFor;
                    }
                    return b.wins - a.wins;
                });

                return projectedStandings;

            } catch (error) {
                console.error('Error generating comprehensive projections:', error);
                // Fallback to simple projection
                return this._simpleProjection(season, currentWeek);
            }
        },

        // Get current team data for a specific team, season, and week
        _getCurrentTeamData: function(teamName, season, currentWeek) {
            const currentStandings = this.calculateSeasonStandings(season, currentWeek);
            const teamData = currentStandings.find(t => t.team === teamName);
            
            return teamData || {
                record: { wins: 0, losses: 0, ties: 0 },
                points: 0,
                pointsAgainst: 0
            };
        },

        // Simple fallback projection method
        _simpleProjection: function(season, currentWeek) {
            const currentStandings = this.calculateSeasonStandings(season, currentWeek);
            if (!currentStandings || currentStandings.length === 0) {
                return null;
            }

            const totalWeeks = 14;
            const remainingWeeks = totalWeeks - parseInt(currentWeek);

            if (remainingWeeks <= 0) {
                return currentStandings;
            }

            return currentStandings.map(team => {
                const gamesPlayed = team.wins + team.losses + team.ties;
                
                if (gamesPlayed === 0) {
                    return {
                        ...team,
                        wins: 7,
                        losses: 7,
                        winPct: 0.5,
                        isProjected: true
                    };
                }

                const winRate = team.wins / gamesPlayed;
                const pointsPerGame = (team.pointsFor || 0) / gamesPlayed;
                
                const projectedWins = team.wins + (remainingWeeks * winRate);
                const projectedPoints = (team.pointsFor || 0) + (remainingWeeks * pointsPerGame);

                return {
                    ...team,
                    wins: Math.round(projectedWins * 10) / 10,
                    losses: totalWeeks - Math.round(projectedWins * 10) / 10,
                    winPct: projectedWins / totalWeeks,
                    pointsFor: Math.round(projectedPoints),
                    isProjected: true
                };
            });
        },

        // Calculate team strengths based on roster projected points
        _calculateTeamStrengths: function(rosterData) {
            const teamStrengths = {};
            
            if (!rosterData || !rosterData.teams) {
                return teamStrengths;
            }

            rosterData.teams.forEach(team => {
                let totalProjected = 0;
                let activePlayersCount = 0;

                if (team.roster) {
                    team.roster.forEach(player => {
                        // Only count active/starting players (not bench)
                        if (player.slotId !== 20 && player.slotId !== 21 && // Not bench slots
                            player.projectedPoints && player.projectedPoints > 0) {
                            totalProjected += player.projectedPoints;
                            activePlayersCount++;
                        }
                    });
                }

                // Store team strength (average projected points per active player)
                const teamName = team.owner || team.team_name || `Team ${team.team_id}`;
                teamStrengths[teamName] = activePlayersCount > 0 ? totalProjected : 0;
            });

            return teamStrengths;
        }
    };
    
    return module;
})();

// Export the DataService module for use in Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataService;
}
