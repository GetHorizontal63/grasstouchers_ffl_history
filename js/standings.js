/**
 * Sock Tan Collective FFL - Standings Page JavaScript
 * 
 * This file handles functionality for the standings page including:
 * - Loading and displaying standings data
 * - Sorting and filtering standings
 * - Generating standings visualizations
 */

// Initialize when DOM is ready, but only on standings page
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the standings page
    if (document.getElementById('standingsContainer')) {
        // Initialize the standings page
        StandingsPage.init();
    }
});

// Standings Page Module
const StandingsPage = (function() {
    // Private variables
    let _currentSeason = 'All Time';
    let _currentWeek = 'All';
    let _currentScoreType = 'starters';
    let _standings = [];
    let _tableElement = null;
    let _sortBy = 'winPct';
    let _sortDirection = 'desc';
    let _divisionStandings = {};
    let _isProjecting = false;
    let _playoffChancesData = null;
    
    // Initialize the page
    function _init() {
        console.log('Initializing standings page...');
        
        // Get DOM elements
        const standingsContainer = document.getElementById('standingsContainer');
        const seasonSelect = document.getElementById('seasonSelect');
        const weekSelect = document.getElementById('weekSelect');
        const scoreTypeSelect = document.getElementById('scoreTypeSelect');
        
        // Initialize loading state
        Utils.toggleLoading(true, standingsContainer);
        
        // Load data
        DataService.init()
            .then(() => {
                console.log('Data service initialized');
                // Load playoff chances data
                return fetch('../data/playoff_chances_by_record.json');
            })
            .then(response => response.json())
            .then(data => {
                _playoffChancesData = data;
                console.log('Playoff chances data loaded');
                // Data loaded successfully
                Utils.toggleLoading(false, standingsContainer);
                
                // Populate season dropdown
                _populateSeasonDropdown(seasonSelect);
                
                // Set initial season (from URL or default to most recent)
                const seasonParam = Utils.getUrlParameter('season');
                if (seasonParam) {
                    _currentSeason = seasonParam;
                } else {
                    // Get all seasons and find the most recent
                    const allSeasons = DataService.getAllSeasons();
                    if (allSeasons && allSeasons.length > 0) {
                        // Sort seasons numerically
                        allSeasons.sort((a, b) => parseInt(a) - parseInt(b));
                        // Get the last (most recent) season
                        _currentSeason = allSeasons[allSeasons.length - 1];
                    } else {
                        _currentSeason = 'All Time';
                    }
                }
                console.log('Initial season:', _currentSeason);
                
                if (seasonSelect) {
                    // Ensure the value exists in the dropdown
                    const exists = Array.from(seasonSelect.options).some(option => option.value === _currentSeason);
                    seasonSelect.value = exists ? _currentSeason : 'All Time';
                    _currentSeason = seasonSelect.value; // In case it defaulted
                }
                
                // Populate week dropdown based on selected season
                _populateWeekDropdown(weekSelect, _currentSeason);
                
                // Set initial week (from URL or default based on season)
                let defaultWeek = Utils.getUrlParameter('week');
                if (!defaultWeek) {
                    if (_currentSeason === 'All Time') {
                        defaultWeek = 'All';
                    } else {
                        // For specific seasons, find the most recent week with data
                        const weeks = DataService.getWeeksForSeason(_currentSeason);
                        if (weeks && weeks.length > 0) {
                            // Get the highest week number
                            const maxWeek = Math.max(...weeks.map(w => parseInt(w) || 0));
                            defaultWeek = maxWeek.toString();
                        } else {
                            defaultWeek = '0';
                        }
                    }
                }
                _currentWeek = defaultWeek;
                
                if (weekSelect) {
                    // Ensure the value exists in the dropdown
                    const exists = Array.from(weekSelect.options).some(option => option.value === _currentWeek);
                    weekSelect.value = exists ? _currentWeek : (_currentSeason === 'All Time' ? 'All' : '0');
                    _currentWeek = weekSelect.value; // In case it defaulted
                }
                
                // Calculate standings
                _calculateStandings();
                
                // Display standings
                _createStandingsDisplay(standingsContainer);
                
                // Add event listeners
                _addEventListeners(seasonSelect, weekSelect, scoreTypeSelect);
                
                console.log('Standings page initialized');
            })
            .catch(error => {
                console.error('Error initializing standings page:', error);
                Utils.toggleLoading(false, standingsContainer);
                
                // Display error message in the container
                if (standingsContainer) {
                    standingsContainer.innerHTML = `
                        <div class="error-message">
                            <p>Failed to load standings data. Please try refreshing the page.</p>
                            <p>Error: ${error.message}</p>
                        </div>
                    `;
                }
            });
    }
    
    // Populate season dropdown
    function _populateSeasonDropdown(select) {
        if (!select) return;
        
        // Clear existing options
        select.innerHTML = '';
        
        // Add "All Time" option
        const allTimeOption = document.createElement('option');
        allTimeOption.value = 'All Time';
        allTimeOption.textContent = 'All Time';
        select.appendChild(allTimeOption);
        
        // Add season options
        const seasons = DataService.getAllSeasons();
        
        seasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season;
            option.textContent = season; // Display just the year, no "Season" prefix
            select.appendChild(option);
        });
    }
    
    // Populate week dropdown based on selected season
    function _populateWeekDropdown(select, season) {
        if (!select) return;
        
        // Clear existing options
        select.innerHTML = '';
        
        // Get projection toggle to enable/disable it
        const projectionToggle = document.getElementById('projectionToggle');
        
        // If "All Time" is selected, populate with all possible weeks
        if (season === 'All Time') {
            // Add "All Weeks" option
            const allOption = document.createElement('option');
            allOption.value = 'All';
            allOption.textContent = 'All Weeks';
            select.appendChild(allOption);
            
            // Add individual week options for filtering across all seasons
            for (let week = 1; week <= 17; week++) {
                const option = document.createElement('option');
                option.value = week;
                option.textContent = `Week ${week}`;
                select.appendChild(option);
            }
            
            // Enable the dropdown for All Time week filtering
            select.disabled = false;
            
            // Disable projection toggle for All Time
            if (projectionToggle) {
                projectionToggle.disabled = true;
                projectionToggle.checked = false;
                _isProjecting = false;
            }
            return;
        }
        
        // Enable the dropdown
        select.disabled = false;
        
        // Add Week 0 option (pre-season/divisions only)
        const week0Option = document.createElement('option');
        week0Option.value = '0';
        week0Option.textContent = 'Week 0 (Pre-Season)';
        select.appendChild(week0Option);
        
        // Get weeks for the selected season
        const weeks = DataService.getWeeksForSeason(season);
        console.log(`Season: ${season}, Found weeks:`, weeks);
        
        weeks.forEach(week => {
            const option = document.createElement('option');
            option.value = week;
            option.textContent = `Week ${week}`;
            select.appendChild(option);
        });
        
        // Enable projection toggle for specific seasons
        if (projectionToggle) {
            projectionToggle.disabled = false;
        }
    }
    
    // Calculate magic/elimination numbers based on playoff structure
    function _calculateMagicElimNumber(team, divisionTeams, season, currentWeek) {
        // Skip calculation for All Time standings or Week 0
        if (_currentSeason === 'All Time' || currentWeek === '0') {
            return '--';
        }
        
        // Get playoff structure and regular season length for the year
        const yearInt = parseInt(season);
        let regularSeasonWeeks, playoffTeamsPerDivision, isOverallPlayoffs = false;
        
        // Set regular season length
        if (yearInt === 2019 || yearInt === 2020) {
            regularSeasonWeeks = 13;
        } else {
            regularSeasonWeeks = 14;
        }
        
        // Set playoff structure
        if (yearInt === 2019 || yearInt === 2023 || yearInt === 2024 || yearInt === 2025) {
            playoffTeamsPerDivision = 4; // Top 4 from each division
        } else if (yearInt === 2020 || yearInt === 2022) {
            playoffTeamsPerDivision = 2; // Top 2 from each division
        } else if (yearInt === 2021) {
            playoffTeamsPerDivision = 8; // Top 8 overall
            isOverallPlayoffs = true;
        } else {
            return '--'; // Unknown year
        }
        
        const remainingWeeks = regularSeasonWeeks - parseInt(currentWeek);
        
        if (remainingWeeks <= 0) {
            return '--'; // Season is over
        }
        
        if (isOverallPlayoffs) {
            // 2021: Top 8 overall logic
            const allTeams = [];
            Object.values(_divisionStandings).forEach(divTeams => {
                allTeams.push(...divTeams);
            });
            allTeams.sort((a, b) => {
                if (b.wins !== a.wins) return b.wins - a.wins;
                if (b.winPct !== a.winPct) return b.winPct - a.winPct;
                return b.pointsFor - a.pointsFor;
            });
            
            const teamIndex = allTeams.findIndex(t => t.team === team.team);
            const playoffTeam = allTeams[7]; // 8th place team
            
            if (teamIndex < 8 && playoffTeam) {
                // In playoff position - check if can clinch
                const cutoffTeam = allTeams[8];
                if (!cutoffTeam) return 'X';
                const magicNumber = cutoffTeam.wins + remainingWeeks + 1 - team.wins;
                if (magicNumber <= 0) return 'X';
                if (magicNumber <= remainingWeeks) return magicNumber.toString();
            }
            
            // Calculate elimination number for everyone else
            if (playoffTeam) {
                const maxPossibleWins = team.wins + remainingWeeks;
                const elimNumber = Math.max(0, playoffTeam.wins + 1 - maxPossibleWins);
                if (elimNumber <= 0) return '--';
                if (maxPossibleWins < playoffTeam.wins) return 'E'; // Mathematically eliminated
                return elimNumber.toString();
            }
            return '--';
            
        } else {
            // Division-based playoffs - use the team's already calculated rank
            if (team.rank <= playoffTeamsPerDivision) {
                // Team is IN playoff position - calculate magic number
                const sortedDivision = [...divisionTeams].sort((a, b) => {
                    if (b.wins !== a.wins) return b.wins - a.wins;
                    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
                    return b.pointsFor - a.pointsFor;
                });
                const cutoffTeam = sortedDivision[playoffTeamsPerDivision];
                if (!cutoffTeam) return 'X';
                const magicNumber = cutoffTeam.wins + remainingWeeks + 1 - team.wins;
                console.log(`MAGIC DEBUG: ${team.team} - actualRank:${team.rank}, cutoffWins:${cutoffTeam.wins}, magicNumber:${magicNumber}, remaining:${remainingWeeks}`);
                if (magicNumber <= 0) return 'X';
                return magicNumber.toString();
            } else {
                // Team is OUT of playoff position - calculate elimination number
                const sortedDivision = [...divisionTeams].sort((a, b) => {
                    if (b.wins !== a.wins) return b.wins - a.wins;
                    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
                    return b.pointsFor - a.pointsFor;
                });
                const playoffTeam = sortedDivision[playoffTeamsPerDivision - 1];
                if (playoffTeam) {
                    const maxPossibleWins = team.wins + remainingWeeks;
                    const elimNumber = Math.max(0, maxPossibleWins + 1 - playoffTeam.wins) - 1;
                    console.log(`ELIM DEBUG: ${team.team} - actualRank:${team.rank}, maxPossible:${maxPossibleWins}, playoffCutoff:${playoffTeam.wins}, elimNumber:${elimNumber}`);
                    if (elimNumber <= 0) return 'E'; // Mathematically eliminated
                    return elimNumber.toString();
                }
                return '--';
            }
        }
    }
    
    // Calculate standings based on current season and week
    function _calculateStandings() {
        console.log(`Calculating standings for ${_currentSeason}, Week ${_currentWeek}, Projecting: ${_isProjecting}`);
        
        // Reset division standings
        _divisionStandings = {};
        
        if (_currentSeason === 'All Time') {
            if (_currentWeek === 'All') {
                // Calculate all-time standings across all weeks and seasons
                const allTeams = DataService.getAllTeams();
                _standings = allTeams.map(team => {
                    const stats = DataService.calculateTeamStats(team);
                    
                    // Skip teams with no games
                    if (!stats || stats.games === 0) return null;
                    
                    // Put all teams in one division with no name for All Time view
                    const division = "";
                    
                    // Calculate overall record for All Time view
                    const overallRecord = _calculateOverallRecord(team, 'All');
                    
                    return {
                        team: team,
                        division: division,
                        wins: stats.wins,
                        losses: stats.losses,
                        winPct: stats.winPct,
                        pointsFor: stats.pointsFor,
                        avgPointsFor: stats.avgPointsFor,
                        pointsAgainst: stats.pointsAgainst,
                        avgPointsAgainst: stats.avgPointsAgainst,
                        pointDifferential: stats.pointDifferential,
                        avgPointDifferential: stats.avgPointDifferential,
                        games: stats.games,
                        streak: stats.currentStreakDisplay,
                        overallRecord: overallRecord.overallRecord,
                        overallWins: overallRecord.overallWins,
                        overallLosses: overallRecord.overallLosses,
                        isAllTime: true
                    };
                }).filter(Boolean); // Remove null entries
            } else {
                // Calculate standings for specific week across all seasons
                if (_currentScoreType === 'bench') {
                    _standings = DataService.calculateBenchAllTimeStandings(_currentWeek) || [];
                } else {
                    _standings = DataService.calculateAllTimeStandings(_currentWeek) || [];
                }
                
                // Set division for each team (empty for All Time view) and recalculate streaks
                _standings.forEach(team => {
                    team.division = "";
                    // For All Time view with specific week, calculate streak across all seasons up to that week
                    team.streak = _calculateAllTimeStreak(team.team, _currentWeek);
                    // For All Time view, calculate overall record instead of playoff percentage
                    const overallRecord = _calculateOverallRecord(team.team, _currentWeek);
                    team.overallRecord = overallRecord.overallRecord;
                    team.overallWins = overallRecord.overallWins;
                    team.overallLosses = overallRecord.overallLosses;
                    team.isAllTime = true; // Flag to indicate this is All Time view
                });
            }
        } else if (_currentWeek === '0') {
            // Week 0 - Show divisions with no game data, only streaks from previous season
            _calculateWeek0Standings();
            return; // Exit early as _calculateWeek0Standings handles the rest
        } else {
            // Calculate season standings up to the selected week
            if (_isProjecting && _currentWeek !== '0') {
                // Use projection
                _calculateProjectedStandings();
                return; // Exit early as _calculateProjectedStandings handles the rest
            } else {
                // Regular standings calculation for specific week
                if (_currentScoreType === 'bench') {
                    _standings = DataService.calculateBenchSeasonStandings(_currentSeason, _currentWeek) || [];
                } else {
                    _standings = DataService.calculateSeasonStandings(_currentSeason, _currentWeek) || [];
                }
                console.log(`Got ${_standings.length} teams for ${_currentSeason}, Week ${_currentWeek}`);
                
                // Set division for each team and recalculate streaks across all seasons
                _standings.forEach(team => {
                    team.division = DataService.getTeamDivision(team.team, _currentSeason) || 'Unknown';
                    // Recalculate streak to include all seasons up to current point
                    team.streak = _calculateCurrentStreak(team.team, _currentSeason, _currentWeek);
                });
            }
        }
        
        // Group by division
        _standings.forEach(team => {
            const division = team.division || 'Unknown';
            if (!_divisionStandings[division]) {
                _divisionStandings[division] = [];
            }
            _divisionStandings[division].push(team);
        });
        
        // Sort each division
        for (const division in _divisionStandings) {
            _sortDivisionStandings(_divisionStandings[division]);
        }
        
        // Add playoff percentages to all teams (except All Time standings)
        if (_currentSeason !== 'All Time') {
            _addPlayoffPercentages();
        }
        
        console.log('Standings calculated:', Object.keys(_divisionStandings).length, 'divisions');
    }

    // Calculate projected standings for end of season using enhanced projection engine
    async function _calculateProjectedStandings() {
        console.log('Calculating enhanced projected standings...');
        
        try {
            // Initialize projection engine if not already done
            if (!window.projectionEngine) {
                window.projectionEngine = new ProjectionEngine();
                await window.projectionEngine.initialize();
            }
            
            // Get comprehensive analysis
            const rosterAnalysis = await window.projectionEngine.analyzeTeamRosters(parseInt(_currentSeason));
            const scheduleStrength = await window.projectionEngine.assessScheduleStrength(parseInt(_currentSeason));
            const monteCarloResults = window.projectionEngine.runEnhancedMonteCarloSimulation(parseInt(_currentSeason), 1000);
            
            // Convert Monte Carlo results to standings format
            const projectedStandings = [];
            
            Object.values(monteCarloResults).forEach(teamResult => {
                const standingsEntry = {
                    team: teamResult.team,
                    wins: Math.round(teamResult.projections.avgWins),
                    losses: 14 - Math.round(teamResult.projections.avgWins),
                    winPct: teamResult.projections.avgWins / 14,
                    pointsFor: Math.round(teamResult.projections.avgPoints),
                    pointsAgainst: Math.round(teamResult.projections.avgPoints * (1 - teamResult.projections.avgWins / 14)),
                    pointDiff: Math.round(teamResult.projections.avgPoints * (teamResult.projections.avgWins / 14 - 0.5) * 2),
                    streak: 'TBD',
                    // Enhanced projection data
                    projectedData: {
                        playoffProbability: teamResult.projections.playoffProbability,
                        championshipProbability: teamResult.projections.championshipProbability,
                        finishDistribution: teamResult.projections.finishDistribution,
                        bestCase: teamResult.records.best,
                        worstCase: teamResult.records.worst,
                        rosterStrength: rosterAnalysis[teamResult.team]?.strengthRatings || {},
                        scheduleStrength: scheduleStrength[teamResult.team]?.overallStrength || 0.5,
                        rosterConstruction: rosterAnalysis[teamResult.team]?.rosterConstruction?.type || 'unknown'
                    }
                };
                
                projectedStandings.push(standingsEntry);
            });
            
            // Sort by projected wins, then by point differential
            projectedStandings.sort((a, b) => {
                if (b.wins !== a.wins) return b.wins - a.wins;
                if (b.winPct !== a.winPct) return b.winPct - a.winPct;
                return b.pointDiff - a.pointDiff;
            });
            
            _standings = projectedStandings;
            
            // Set division for each team
            _standings.forEach(team => {
                team.division = DataService.getTeamDivision(team.team, _currentSeason) || 'Unknown';
            });
            
            // Group by division
            _divisionStandings = {};
            _standings.forEach(team => {
                const division = team.division || 'Unknown';
                if (!_divisionStandings[division]) {
                    _divisionStandings[division] = [];
                }
                _divisionStandings[division].push(team);
            });
            
            // Sort each division
            for (const division in _divisionStandings) {
                _sortDivisionStandings(_divisionStandings[division]);
            }
            
            // Update display
            const standingsContainer = document.getElementById('standingsContainer');
            if (standingsContainer) {
                _createStandingsDisplay(standingsContainer);
            }
            
            console.log('Enhanced projected standings calculated:', Object.keys(_divisionStandings).length, 'divisions');
            console.log('Projection analysis complete:', {
                rosterAnalysis: Object.keys(rosterAnalysis).length + ' teams analyzed',
                scheduleStrength: Object.keys(scheduleStrength).length + ' schedules analyzed',
                monteCarloSims: '1000 simulations completed'
            });
            
        } catch (error) {
            console.error('Error calculating enhanced projected standings:', error);
            
            // Fallback to basic projection if available
            try {
                const basicProjectedStandings = await DataService.projectSeasonStandings(_currentSeason, _currentWeek);
                
                if (basicProjectedStandings) {
                    _standings = basicProjectedStandings;
                    
                    // Set division for each team
                    _standings.forEach(team => {
                        team.division = DataService.getTeamDivision(team.team, _currentSeason) || 'Unknown';
                    });
                    
                    // Group by division
                    _divisionStandings = {};
                    _standings.forEach(team => {
                        const division = team.division || 'Unknown';
                        if (!_divisionStandings[division]) {
                            _divisionStandings[division] = [];
                        }
                        _divisionStandings[division].push(team);
                    });
                    
                    // Sort each division
                    for (const division in _divisionStandings) {
                        _sortDivisionStandings(_divisionStandings[division]);
                    }
                    
                    // Update display
                    const standingsContainer = document.getElementById('standingsContainer');
                    if (standingsContainer) {
                        _createStandingsDisplay(standingsContainer);
                    }
                    
                    console.log('Fallback projected standings calculated');
                } else {
                    throw new Error('Basic projection also failed');
                }
            } catch (fallbackError) {
                console.warn('Both enhanced and basic projections failed, falling back to regular standings');
                _isProjecting = false; // Reset toggle
                const projectionToggle = document.getElementById('projectionToggle');
                if (projectionToggle) {
                    projectionToggle.checked = false;
                }
                _calculateStandings(); // Recalculate with regular method
            }
        }
    }

    // Calculate Week 0 standings - divisions with no game data, calculate current streaks
    function _calculateWeek0Standings() {
        console.log('Calculating Week 0 standings...');
        
        // Get teams that have data for the current season
        const currentSeasonTeams = _getTeamsForSeason(_currentSeason);
        
        if (!currentSeasonTeams || currentSeasonTeams.length === 0) {
            console.warn(`No teams found for season ${_currentSeason}`);
            _standings = [];
            return;
        }
        
        _standings = currentSeasonTeams.map(team => {
            // Get the team's division for the current season
            const division = DataService.getTeamDivision(team, _currentSeason) || 'Unknown';
            
            // Calculate current streak across all seasons up to current point
            let streakDisplay = _calculateCurrentStreak(team, _currentSeason, 0);
            
            return {
                team: team,
                division: division,
                wins: 0,
                losses: 0,
                winPct: 0,
                pointsFor: 0,
                avgPointsFor: 0,
                pointsAgainst: 0,
                avgPointsAgainst: 0,
                pointDifferential: 0,
                avgPointDifferential: 0,
                games: 0,
                streak: streakDisplay,
                isWeek0: true
            };
        });
        
        // Group by division
        _standings.forEach(team => {
            const division = team.division || 'Unknown';
            if (!_divisionStandings[division]) {
                _divisionStandings[division] = [];
            }
            _divisionStandings[division].push(team);
        });
        
        // Sort each division alphabetically by team name for Week 0
        for (const division in _divisionStandings) {
            _divisionStandings[division].sort((a, b) => a.team.localeCompare(b.team));
            
            // Add rank (just sequential for Week 0)
            _divisionStandings[division].forEach((team, index) => {
                team.rank = index + 1;
            });
        }
        
        // Add playoff percentages for Week 0 (will be 0-0 records)
        _addPlayoffPercentages();
        
    }
    
    // Calculate current streak for a team up to a specific season and week
    function _calculateCurrentStreak(team, targetSeason, targetWeek) {
        if (!DataService.isDataLoaded()) {
            return 'None';
        }
        
        // Get all game data for this team across all seasons
        const allGames = [];
        
        // Get all seasons up to and including target season
        const allSeasons = DataService.getAllSeasons().sort((a, b) => parseInt(a) - parseInt(b));
        const seasonsToCheck = allSeasons.filter(season => parseInt(season) <= parseInt(targetSeason));
        
        // Collect all games chronologically
        seasonsToCheck.forEach(season => {
            const seasonData = DataService.getSeason(season);
            if (!seasonData) return;
            
            // Sort weeks chronologically
            const weeks = [...seasonData.weeks].sort((a, b) => parseInt(a.week) - parseInt(b.week));
            
            weeks.forEach(weekData => {
                // For target season, only include weeks up to targetWeek
                if (season === targetSeason && parseInt(weekData.week) > parseInt(targetWeek)) {
                    return;
                }
                
                weekData.games.forEach(game => {
                    if (game.team === team && game.opponent !== 'Bye') {
                        const scoreDiff = parseFloat(game.score_diff);
                        if (!isNaN(scoreDiff)) {
                            allGames.push({
                                season: season,
                                week: parseInt(weekData.week),
                                scoreDiff: scoreDiff,
                                result: scoreDiff > 0 ? 'W' : 'L'
                            });
                        }
                    }
                });
            });
        });
        
        // Sort games chronologically (oldest to newest)
        allGames.sort((a, b) => {
            if (parseInt(a.season) !== parseInt(b.season)) {
                return parseInt(a.season) - parseInt(b.season);
            }
            return a.week - b.week;
        });
        
        // Calculate current streak from most recent games
        if (allGames.length === 0) {
            return 'None';
        }
        
        let currentStreak = 0;
        let streakType = null;
        
        // Work backwards from most recent game to find current streak
        for (let i = allGames.length - 1; i >= 0; i--) {
            const game = allGames[i];
            
            if (streakType === null) {
                // First game (most recent)
                streakType = game.result;
                currentStreak = 1;
            } else if (game.result === streakType) {
                // Streak continues
                currentStreak++;
            } else {
                // Streak breaks
                break;
            }
        }
        
        return currentStreak > 0 ? `${currentStreak}${streakType}` : 'None';
    }
    
    // Calculate streak for All Time standings (specific week across all seasons)
    function _calculateAllTimeStreak(team, targetWeek) {
        if (!DataService.isDataLoaded()) {
            return 'None';
        }
        
        // Get all game data for this team for the specific week across all seasons
        const weekGames = [];
        
        // Get all seasons and sort chronologically
        const allSeasons = DataService.getAllSeasons().sort((a, b) => parseInt(a) - parseInt(b));
        
        // Collect games for the target week across all seasons
        allSeasons.forEach(season => {
            const seasonData = DataService.getSeason(season);
            if (!seasonData) return;
            
            const weekData = seasonData.weeks.find(w => parseInt(w.week) === parseInt(targetWeek));
            if (!weekData) return;
            
            weekData.games.forEach(game => {
                if (game.team === team && game.opponent !== 'Bye') {
                    const scoreDiff = parseFloat(game.score_diff);
                    if (!isNaN(scoreDiff)) {
                        weekGames.push({
                            season: season,
                            scoreDiff: scoreDiff,
                            result: scoreDiff > 0 ? 'W' : 'L'
                        });
                    }
                }
            });
        });
        
        // Sort games chronologically (oldest to newest)
        weekGames.sort((a, b) => parseInt(a.season) - parseInt(b.season));
        
        // Calculate current streak from most recent games
        if (weekGames.length === 0) {
            return 'None';
        }
        
        let currentStreak = 0;
        let streakType = null;
        
        // Work backwards from most recent game to find current streak
        for (let i = weekGames.length - 1; i >= 0; i--) {
            const game = weekGames[i];
            
            if (streakType === null) {
                // First game (most recent)
                streakType = game.result;
                currentStreak = 1;
            } else if (game.result === streakType) {
                // Streak continues
                currentStreak++;
            } else {
                // Streak breaks
                break;
            }
        }
        
        return currentStreak > 0 ? `${currentStreak}${streakType}` : 'None';
    }
    
    // Calculate overall record for All Time standings based on head-to-head comparisons
    function _calculateOverallRecord(team, week) {
        if (!DataService.isDataLoaded()) {
            return { overallWins: 0, overallLosses: 0, overallRecord: '0-0' };
        }
        
        let totalWins = 0;
        let totalLosses = 0;
        
        // Get all seasons and sort chronologically
        const allSeasons = DataService.getAllSeasons().sort((a, b) => parseInt(a) - parseInt(b));
        
        // For each season, get all the team's games
        allSeasons.forEach(season => {
            const seasonData = DataService.getSeason(season);
            if (!seasonData) return;
            
            // Determine which weeks to process
            let weeksToProcess = [];
            if (week === 'All') {
                // Process all weeks
                weeksToProcess = seasonData.weeks;
            } else {
                // Process only the specified week
                const weekData = seasonData.weeks.find(w => parseInt(w.week) === parseInt(week));
                if (weekData) {
                    weeksToProcess = [weekData];
                }
            }
            
            // Process each week
            weeksToProcess.forEach(weekData => {
                // Get this team's score for the week
                const teamGame = weekData.games.find(game => game.team === team && game.opponent !== 'Bye');
                if (!teamGame) return;
                
                const teamScore = parseFloat(teamGame.team_score);
                if (isNaN(teamScore)) return;
                
                // Get all other teams' scores for this week in this season
                weekData.games.forEach(otherGame => {
                    if (otherGame.team !== team && otherGame.opponent !== 'Bye') {
                        const otherScore = parseFloat(otherGame.team_score);
                        if (!isNaN(otherScore)) {
                            if (teamScore > otherScore) {
                                totalWins++;
                            } else if (teamScore < otherScore) {
                                totalLosses++;
                            }
                            // Ties are ignored
                        }
                    }
                });
            });
        });
        
        const overallRecord = totalWins > 0 || totalLosses > 0 ? 
            `${totalWins}-${totalLosses}` : '--';
            
        return {
            overallWins: totalWins,
            overallLosses: totalLosses,
            overallRecord: overallRecord
        };
    }
    
    // Get CSS class for playoff percentage color coding
    function _getPlayoffPercentageClass(percentage) {
        if (isNaN(percentage) || percentage === null || percentage === undefined) {
            return '';
        }
        
        if (percentage <= 20) {
            return 'very-low';
        } else if (percentage <= 40) {
            return 'low';
        } else if (percentage <= 50) {
            return 'medium-low';
        } else if (percentage <= 60) {
            return 'medium';
        } else if (percentage <= 80) {
            return 'good';
        } else {
            return 'excellent';
        }
    }
    
    // Load playoff chances data and lookup playoff percentage for a team's record
    function _getPlayoffPercentage(wins, losses) {
        // Return cached value if available
        if (_playoffChancesData) {
            // For Week 0 (0 wins, 0 losses), return NaN since no games have been played
            if (wins === 0 && losses === 0) {
                return NaN;
            }
            
            const record = _playoffChancesData.records.find(r => 
                r.win_count === wins && r.loss_count === losses
            );
            return record ? record.playoff_percentage : null;
        }
        return null;
    }
    
    // Add playoff percentage to all teams in standings
    function _addPlayoffPercentages() {
        if (!_playoffChancesData || !_standings) return;
        
        _standings.forEach(team => {
            const playoffPct = _getPlayoffPercentage(team.wins, team.losses);
            team.playoffPct = playoffPct;
        });
    }
    
    // Get teams that have data for a specific season
    function _getTeamsForSeason(season) {
        if (!DataService.isDataLoaded()) {
            console.warn('Data not loaded when getting teams for season');
            return [];
        }
        
        try {
            // Get all weeks for the season
            const weeks = DataService.getWeeksForSeason(season);
            if (!weeks || weeks.length === 0) {
                console.warn(`No weeks found for season ${season}`);
                return [];
            }
            
            // Get games from the first available week to determine teams
            const firstWeek = weeks[0];
            const games = DataService.getGamesForWeek(season, firstWeek);
            
            if (!games || games.length === 0) {
                console.warn(`No games found for season ${season}, week ${firstWeek}`);
                return [];
            }
            
            // Extract unique team names from the games
            const teamSet = new Set();
            games.forEach(game => {
                if (game.team) teamSet.add(game.team);
                if (game.opponent) teamSet.add(game.opponent);
            });
            
            const teams = Array.from(teamSet).sort();
            console.log(`Found ${teams.length} teams for season ${season}:`, teams);
            return teams;
            
        } catch (error) {
            console.error(`Error getting teams for season ${season}:`, error);
            return [];
        }
    }
    
    // Sort standings within a division
    function _sortDivisionStandings(divisionTeams) {
        divisionTeams.sort((a, b) => {
            let aValue, bValue;
            
            switch (_sortBy) {
                case 'team':
                    aValue = a.team;
                    bValue = b.team;
                    return _sortDirection === 'asc' ? 
                        aValue.localeCompare(bValue) : 
                        bValue.localeCompare(aValue);
                    
                case 'wins':
                    aValue = a.wins;
                    bValue = b.wins;
                    break;
                    
                case 'losses':
                    aValue = a.losses;
                    bValue = b.losses;
                    break;
                    
                case 'winPct':
                    aValue = a.winPct;
                    bValue = b.winPct;
                    // Tiebreaker: if win percentages are equal, sort by point differential
                    if (Math.abs(aValue - bValue) < 0.001) { // Handle floating point comparison
                        return b.pointDifferential - a.pointDifferential; // Higher +/- first
                    }
                    break;
                    
                case 'playoffPct':
                    aValue = a.playoffPct || 0;
                    bValue = b.playoffPct || 0;
                    break;
                    
                case 'weeklyWins':
                    aValue = a.weeklyWins || 0;
                    bValue = b.weeklyWins || 0;
                    break;
                    
                case 'overallWins':
                    aValue = a.overallWins || 0;
                    bValue = b.overallWins || 0;
                    break;
                    
                case 'pointsFor':
                    aValue = a.avgPointsFor;
                    bValue = b.avgPointsFor;
                    break;
                    
                case 'pointsAgainst':
                    aValue = a.avgPointsAgainst;
                    bValue = b.avgPointsAgainst;
                    break;
                    
                case 'pointDiff':
                    aValue = a.avgPointDifferential;
                    bValue = b.avgPointDifferential;
                    break;
                    
                default:
                    aValue = a.winPct;
                    bValue = b.winPct;
                    // Tiebreaker: if win percentages are equal, sort by point differential
                    if (Math.abs(aValue - bValue) < 0.001) { // Handle floating point comparison
                        return b.pointDifferential - a.pointDifferential; // Higher +/- first
                    }
            }
            
            // For numeric values
            return _sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        });
        
        // Add rank within division
        divisionTeams.forEach((team, index) => {
            team.rank = index + 1;
        });
    }
    
    // Create standings display
    function _createStandingsDisplay(container) {
        if (!container) {
            console.error('Standings container not found');
            return;
        }
        
        console.log('Creating standings display');
        
        // Clear existing content
        container.innerHTML = '';
        
        // Add section title with current filters
        const title = document.createElement('h2');
        title.textContent = _getStandingsTitle();
        container.appendChild(title);
        
        // Create a section for each division
        for (const division in _divisionStandings) {
            const divisionSection = document.createElement('div');
            divisionSection.className = 'division-section';
            
            const divisionHeader = document.createElement('h3');
            divisionHeader.textContent = division || 'All Teams';
            divisionSection.appendChild(divisionHeader);
            
            // Create table
            const table = document.createElement('table');
            table.className = 'standings-table';
            
            // Determine if this is All Time view
            const isAllTime = _currentSeason === 'All Time';
            const thirdColumnHeader = isAllTime ? 'Overall Rec' : 'Playoff %';
            const thirdColumnSort = isAllTime ? 'overallWins' : 'playoffPct';
            
            table.innerHTML = `
                <thead>
                    <tr>
                        <th class="rank">#</th>
                        <th data-sort="team" class="team-name">Team</th>
                        <th data-sort="winPct" class="record-cell">Record</th>
                        <th data-sort="${thirdColumnSort}" class="playoff-pct">${thirdColumnHeader}</th>
                        <th data-sort="winPct" class="win-pct">Win %</th>
                        <th data-sort="pointsFor" class="points-total">PF</th>
                        <th data-sort="pointsAgainst" class="points-total">PA</th>
                        <th data-sort="pointDiff" class="point-diff">+/-</th>
                        <th data-sort="pointsFor" class="points-for">PF/G</th>
                        <th data-sort="pointsAgainst" class="points-against">PA/G</th>
                        <th data-sort="elimMagic" class="elim-magic">Elim/Magic</th>
                        <th class="streak">Streak</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            
            // Assign to class variable for sorting
            _tableElement = table;
            
            // Populate table body
            const tbody = table.querySelector('tbody');
            _displayDivisionStandings(_divisionStandings[division], tbody);
            
            divisionSection.appendChild(table);
            container.appendChild(divisionSection);
            
            // Initialize sorting for this table
            _initializeSorting(table);
        }
        
        // Display message if no standings
        if (Object.keys(_divisionStandings).length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No standings data available for the selected criteria.';
            container.appendChild(emptyMessage);
        }
        
        console.log('Standings display created');
    }
    
    // Get title based on current filters
    function _getStandingsTitle() {
        let title = '';
        if (_currentSeason === 'All Time') {
            title = 'All-Time Standings';
        } else if (_currentWeek === '0') {
            title = `${_currentSeason} Season, Pre-Season Divisions`;
        } else {
            title = `${_currentSeason} Season, Week ${_currentWeek} Standings`;
        }
        
        // Add projection indicator
        if (_isProjecting && _currentSeason !== 'All Time' && _currentWeek !== '0') {
            title += ' (Projected Season End)';
        }
        
        return title;
    }
    
    // Display standings for a division
    function _displayDivisionStandings(teams, tbody) {
        if (!tbody) return;
        
        // Clear existing rows
        tbody.innerHTML = '';
        
        // Add row for each team
        teams.forEach(team => {
            const row = document.createElement('tr');
            
            // Add projected class if this is a projection
            if (team.isProjected) {
                row.classList.add('projected-row');
            }
            
            // Add Week 0 class if this is Week 0
            if (team.isWeek0) {
                row.classList.add('week0-row');
            }
            
            // Calculate magic/elimination number
            const elimMagicNumber = _calculateMagicElimNumber(team, teams, _currentSeason, _currentWeek);
            
            // Determine styling class based on team position and number type
            let elimMagicClass = '';
            if (elimMagicNumber === 'X') {
                elimMagicClass = 'clinched';
            } else if (elimMagicNumber === 'E') {
                elimMagicClass = 'eliminated';
            } else if (elimMagicNumber !== '--') {
                // Use the team's actual rank to determine if it's magic or elimination
                const playoffSpots = (_currentSeason == 2021) ? 8 : 4; // 2021 had 8 overall, others 4 per division
                elimMagicClass = team.rank <= playoffSpots ? 'magic' : 'elimination';
            }
            
            // Create record span with color
            const recordColor = Utils.getRecordColor(team.wins, team.losses);
            const winsDisplay = team.isProjected ? team.wins.toFixed(1) : team.wins;
            const lossesDisplay = team.isProjected ? team.losses.toFixed(1) : team.losses;
            const recordSpan = `<span class="record" style="color: ${recordColor};">${winsDisplay}-${lossesDisplay}</span>`;
            
            // Add projection details tooltip if available
            let projectionTooltip = '';
            if (team.projectionDetails) {
                projectionTooltip = `
                    <div class="projection-tooltip">
                        <div class="projection-header">Season Projection</div>
                        <div class="projection-stat">Playoff Probability: ${team.projectionDetails.playoffProbability}%</div>
                        <div class="projection-stat">Championship Probability: ${team.projectionDetails.championshipProbability}%</div>
                        <div class="projection-range">
                            <div>Best Case: ${team.projectionDetails.bestCase.wins}-${14 - team.projectionDetails.bestCase.wins} (${team.projectionDetails.bestCase.points} pts)</div>
                            <div>Most Likely: ${team.projectionDetails.mostLikely.wins}-${14 - team.projectionDetails.mostLikely.wins}</div>
                            <div>Worst Case: ${team.projectionDetails.worstCase.wins}-${14 - team.projectionDetails.worstCase.wins} (${team.projectionDetails.worstCase.points} pts)</div>
                        </div>
                    </div>
                `;
            }
            
            // Create row content
            row.innerHTML = `
                <td class="rank">${team.rank}</td>
                <td class="team-name">
                    <a href="franchise.html?team=${encodeURIComponent(team.team)}">${team.team}</a>
                    ${team.projectionDetails ? '<span class="projection-indicator" title="Click for projection details">📊</span>' : ''}
                </td>
                <td class="record-cell">${recordSpan}</td>
                <td class="playoff-pct ${team.isAllTime ? '' : _getPlayoffPercentageClass(team.playoffPct)}">${team.isAllTime ? (team.overallRecord || '--') : (team.playoffPct !== null && team.playoffPct !== undefined && !isNaN(team.playoffPct) ? team.playoffPct.toFixed(1) + '%' : 'N/A')}</td>
                <td class="win-pct">${team.winPct.toFixed(3)}</td>
                <td class="points-total">${Utils.formatNumber(team.pointsFor, 1)}</td>
                <td class="points-total">${Utils.formatNumber(team.pointsAgainst, 1)}</td>
                <td class="point-diff ${team.pointDifferential >= 0 ? 'positive' : 'negative'}">${team.pointDifferential > 0 ? '+' : ''}${Utils.formatNumber(team.pointDifferential, 1)}</td>
                <td class="points-for">${Utils.formatNumber(team.avgPointsFor, 1)}</td>
                <td class="points-against">${Utils.formatNumber(team.avgPointsAgainst, 1)}</td>
                <td class="elim-magic ${elimMagicClass}">${elimMagicNumber}</td>
                <td class="streak">${team.streak}</td>
                ${projectionTooltip}
            `;
            
            // Add click handler for projection details
            if (team.projectionDetails) {
                row.addEventListener('click', () => _showProjectionModal(team));
            }
            
            tbody.appendChild(row);
        });
        
        // Display message if no standings
        if (teams.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="11" class="empty-message">No standings data available for this division.</td>
            `;
        }
    }
    
    // Show detailed projection modal with comprehensive analysis
    function _showProjectionModal(team) {
        if (!team.projectedData) return;
        
        const modal = document.createElement('div');
        modal.className = 'projection-modal';
        modal.innerHTML = `
            <div class="projection-modal-content">
                <div class="projection-modal-header">
                    <h2>${team.team} - Comprehensive Season Projection</h2>
                    <button class="projection-modal-close">&times;</button>
                </div>
                <div class="projection-modal-body">
                    <div class="projection-overview">
                        <div class="projection-card">
                            <h3>Projected Record</h3>
                            <div class="big-stat">${team.wins}-${team.losses}</div>
                            <div class="sub-stat">${Math.round(team.pointsFor)} total points</div>
                            <div class="sub-stat">Win %: ${team.winPct.toFixed(3)}</div>
                        </div>
                        <div class="projection-card">
                            <h3>Playoff Probability</h3>
                            <div class="big-stat">${team.projectedData.playoffProbability.toFixed(1)}%</div>
                            <div class="sub-stat">Championship: ${team.projectedData.championshipProbability.toFixed(1)}%</div>
                        </div>
                        <div class="projection-card">
                            <h3>Roster Construction</h3>
                            <div class="big-stat">${team.projectedData.rosterConstruction}</div>
                            <div class="sub-stat">Schedule Difficulty: ${(team.projectedData.scheduleStrength * 100).toFixed(0)}%</div>
                        </div>
                    </div>
                    
                    <div class="projection-scenarios">
                        <h3>Possible Outcomes (Based on 1000 Simulations)</h3>
                        <div class="scenario-grid">
                            <div class="scenario best-case">
                                <h4>Best Case</h4>
                                <div>${team.projectedData.bestCase.wins}-${team.projectedData.bestCase.losses}</div>
                                <div class="scenario-note">Top 5% of outcomes</div>
                            </div>
                            <div class="scenario most-likely">
                                <h4>Most Likely</h4>
                                <div>${team.wins}-${team.losses}</div>
                                <div class="scenario-note">Expected outcome</div>
                            </div>
                            <div class="scenario worst-case">
                                <h4>Worst Case</h4>
                                <div>${team.projectedData.worstCase.wins}-${team.projectedData.worstCase.losses}</div>
                                <div class="scenario-note">Bottom 5% of outcomes</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="roster-strength">
                        <h3>Positional Strength Ratings</h3>
                        <div class="strength-grid">
                            ${Object.entries(team.projectedData.rosterStrength).map(([position, rating]) => `
                                <div class="strength-item">
                                    <div class="position-label">${position}</div>
                                    <div class="strength-bar">
                                        <div class="strength-fill" style="width: ${rating}%; background-color: ${this.getStrengthColor(rating)}"></div>
                                    </div>
                                    <div class="strength-value">${rating}/100</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="finish-distribution">
                        <h3>Finish Position Probability</h3>
                        <div class="distribution-chart">
                            ${Object.entries(team.projectedData.finishDistribution)
                                .filter(([rank, probability]) => probability > 0.5)
                                .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                                .map(([rank, probability]) => `
                                    <div class="distribution-bar">
                                        <div class="bar-label">${this.getOrdinalSuffix(rank)}</div>
                                        <div class="bar-container">
                                            <div class="bar-fill" style="width: ${Math.min(probability, 100)}%; background-color: ${this.getFinishColor(rank)}"></div>
                                        </div>
                                        <div class="bar-value">${probability.toFixed(1)}%</div>
                                    </div>
                                `).join('')}
                        </div>
                    </div>
                    
                    <div class="projection-methodology">
                        <h3>Analysis Methodology</h3>
                        <div class="methodology-grid">
                            <div class="method-item">
                                <h4>Roster Analysis</h4>
                                <p>Draft position analysis, historical performance metrics, and injury history</p>
                            </div>
                            <div class="method-item">
                                <h4>Schedule Strength</h4>
                                <p>Weekly opponent defensive rankings and matchup difficulty assessment</p>
                            </div>
                            <div class="method-item">
                                <h4>Monte Carlo Simulation</h4>
                                <p>1000 season simulations with player performance variance modeling</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(modal);
        
        // Close handlers
        const closeBtn = modal.querySelector('.projection-modal-close');
        closeBtn.addEventListener('click', () => modal.remove());
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        // Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    // Helper function to get strength color based on rating
    function getStrengthColor(rating) {
        if (rating >= 80) return '#3B7A57'; // Strong green
        if (rating >= 60) return '#F6BE36'; // Warning yellow
        if (rating >= 40) return '#FFA500'; // Orange
        return '#dc3545'; // Red for weak
    }
    
    // Helper function to get finish position color
    function getFinishColor(rank) {
        const position = parseInt(rank);
        if (position <= 2) return '#FFD700'; // Gold for top 2
        if (position <= 6) return '#3B7A57'; // Green for playoff spots
        if (position <= 10) return '#F6BE36'; // Yellow for middle
        return '#dc3545'; // Red for bottom
    }
    
    // Helper function to add ordinal suffix
    function getOrdinalSuffix(number) {
        const num = parseInt(number);
        if (num % 100 >= 11 && num % 100 <= 13) {
            return num + 'th';
        }
        switch (num % 10) {
            case 1: return num + 'st';
            case 2: return num + 'nd';
            case 3: return num + 'rd';
            default: return num + 'th';
        }
    }
    
    // Initialize sorting functionality for a table
    function _initializeSorting(table) {
        const headers = table.querySelectorAll('th[data-sort]');
        
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const sortBy = header.getAttribute('data-sort');
                
                // If already sorting by this column, toggle direction
                if (sortBy === _sortBy) {
                    _sortDirection = _sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    // New sort column, default to descending except for team name
                    _sortBy = sortBy;
                    _sortDirection = sortBy === 'team' ? 'asc' : 'desc';
                }
                
                // Resort and redisplay
                for (const division in _divisionStandings) {
                    _sortDivisionStandings(_divisionStandings[division]);
                }
                
                // Refresh the display
                _createStandingsDisplay(document.getElementById('standingsContainer'));
            });
        });
    }
    
    // Add event listeners
    function _addEventListeners(seasonSelect, weekSelect, scoreTypeSelect) {
        if (seasonSelect) {
            seasonSelect.addEventListener('change', () => {
                _currentSeason = seasonSelect.value;
                console.log('Season changed to:', _currentSeason);
                
                // Update URL parameter
                Utils.setUrlParameter('season', _currentSeason === 'All Time' ? null : _currentSeason);
                
                // Reset week selection when season changes
                if (_currentSeason === 'All Time') {
                    _currentWeek = 'All';
                } else {
                    _currentWeek = '0'; // Default to Week 0 for specific seasons
                }
                Utils.setUrlParameter('week', null);
                
                // Update the week dropdown
                _populateWeekDropdown(weekSelect, _currentSeason);
                if (weekSelect) {
                    weekSelect.value = _currentWeek;
                }
                
                // Recalculate standings
                _calculateStandings();
                
                // Update display
                const standingsContainer = document.getElementById('standingsContainer');
                if (standingsContainer) {
                    _createStandingsDisplay(standingsContainer);
                } else {
                    console.error('Standings container not found when updating display');
                }
            });
        }
        
        if (weekSelect) {
            weekSelect.addEventListener('change', () => {
                _currentWeek = weekSelect.value;
                console.log('Week changed to:', _currentWeek);
                
                // Update URL parameter
                Utils.setUrlParameter('week', _currentWeek === 'All' ? null : _currentWeek);
                
                // Disable projection toggle if "Week 0" is selected
                const projectionToggle = document.getElementById('projectionToggle');
                if (projectionToggle) {
                    if (_currentWeek === '0') {
                        projectionToggle.disabled = true;
                        projectionToggle.checked = false;
                        _isProjecting = false;
                    } else {
                        projectionToggle.disabled = false;
                    }
                }
                
                // Recalculate standings
                _calculateStandings();
                
                // Update display
                const standingsContainer = document.getElementById('standingsContainer');
                if (standingsContainer) {
                    _createStandingsDisplay(standingsContainer);
                } else {
                    console.error('Standings container not found when updating display');
                }
            });
        }

        // Add projection toggle listener
        const projectionToggle = document.getElementById('projectionToggle');
        if (projectionToggle) {
            projectionToggle.addEventListener('change', () => {
                _isProjecting = projectionToggle.checked;
                console.log('Projection toggle changed to:', _isProjecting);
                
                // Recalculate standings
                _calculateStandings();
                
                // Update display
                const standingsContainer = document.getElementById('standingsContainer');
                if (standingsContainer) {
                    _createStandingsDisplay(standingsContainer);
                } else {
                    console.error('Standings container not found when updating display');
                }
            });
        }
        
        // Add score type dropdown listener
        if (scoreTypeSelect) {
            scoreTypeSelect.addEventListener('change', () => {
                _currentScoreType = scoreTypeSelect.value;
                console.log('Score type changed to:', _currentScoreType);
                
                // Recalculate standings
                _calculateStandings();
                
                // Update display
                const standingsContainer = document.getElementById('standingsContainer');
                if (standingsContainer) {
                    _createStandingsDisplay(standingsContainer);
                } else {
                    console.error('Standings container not found when updating display');
                }
            });
        }
    }
    
    // Export public API
    return {
        init: _init
    };
})();
