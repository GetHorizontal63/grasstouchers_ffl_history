/**
 * Franchise Data Service
 * Handles loading and processing data for the franchise page
 */

const FranchiseData = (function() {
    // Private variables
    let _teamStats = null;
    let _accoladesData = null;
    let _finalPlacementsData = null;
    let _teamAbbreviationsData = null;
    
    // Load team abbreviations data
    function loadTeamAbbreviations() {
        return fetch('../Data/team_abbreviations.json')
            .then(response => {
                if (!response.ok) {
                    console.error('Failed to load team abbreviations data:', response.status, response.statusText);
                    throw new Error('Failed to load team abbreviations data: ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                console.log('Team abbreviations data loaded successfully');
                _teamAbbreviationsData = data;
                return data;
            })
            .catch(error => {
                console.error('Error loading team abbreviations data:', error);
                throw error; // Re-throw to allow Promise.all to catch it
            });
    }
    
    // Load accolades data
    function loadAccolades() {
        return fetch('../Data/accolades.json')
            .then(response => {
                if (!response.ok) {
                    console.error('Failed to load accolades data:', response.status, response.statusText);
                    throw new Error('Failed to load accolades data: ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                console.log('Accolades data loaded successfully');
                _accoladesData = data;
                return data;
            })
            .catch(error => {
                console.error('Error loading accolades data:', error);
                throw error; // Re-throw to allow Promise.all to catch it
            });
    }
    
    // Load final placements data
    function loadFinalPlacements() {
        return fetch('../Data/final_placements.json')
            .then(response => {
                if (!response.ok) {
                    console.error('Failed to load final placements data:', response.status, response.statusText);
                    throw new Error('Failed to load final placements data: ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                console.log('Final placements data loaded successfully');
                _finalPlacementsData = data;
                return data;
            })
            .catch(error => {
                console.error('Error loading final placements data:', error);
                throw error; // Re-throw to allow Promise.all to catch it
            });
    }
    
    // Load team statistics
    function loadTeamStatistics(team, season) {
        if (!team) {
            console.error('No team provided to loadTeamStatistics');
            return null;
        }
        
        console.log(`Loading team statistics for ${team}, season ${season}`);
        
        // Get team stats for selected season
        if (season === 'All Time') {
            _teamStats = DataService.calculateTeamStats(team);
        } else {
            _teamStats = DataService.calculateTeamStats(team, season);
        }
        
        // If no stats found, create empty stats object
        if (!_teamStats) {
            console.warn(`No statistics found for team: ${team}, season: ${season}`);
            _teamStats = {
                team: team,
                games: 0,
                wins: 0,
                losses: 0,
                winPct: 0,
                playoffWins: 0,
                playoffLosses: 0,
                pointsFor: 0,
                pointsAgainst: 0,
                avgPointsFor: 0,
                avgPointsAgainst: 0,
                pointDifferential: 0,
                avgPointDifferential: 0,
                highestScore: 0,
                lowestScore: 0,
                gameLog: []
            };
        } else {
            console.log(`Statistics loaded for ${team}, found ${_teamStats.games} games`);
            // Calculate playoff record
            calculatePlayoffRecord();
        }
        
        return _teamStats;
    }
    
    // Calculate playoff record
    function calculatePlayoffRecord() {
        if (!_teamStats || !_teamStats.gameLog) return;
        
        _teamStats.playoffWins = 0;
        _teamStats.playoffLosses = 0;
        
        _teamStats.gameLog.forEach(game => {
            // Check if game is a playoff game (not Regular or Bye)
            if (game.seasonPeriod && game.seasonPeriod !== 'Regular' && game.seasonPeriod !== 'Bye') {
                if (game.result === 'W') {
                    _teamStats.playoffWins++;
                } else if (game.result === 'L') {
                    _teamStats.playoffLosses++;
                }
            }
        });
    }
    
    // Get team finish for a given season
    function getTeamFinish(team, season) {
        if (!_finalPlacementsData || !_finalPlacementsData.seasonPlacements) return '';
        
        try {
            // Find the season data
            const seasonData = _finalPlacementsData.seasonPlacements.find(s => s.year == season);
            if (!seasonData || !seasonData.placements) return '';
            
            // Find the team's placement
            const teamPlacement = seasonData.placements.find(p => p.team === team);
            if (!teamPlacement) return '';
            
            return teamPlacement.place;
        } catch (e) {
            console.error('Error getting team finish:', e);
            return '';
        }
    }
    
    // Format placement with appropriate suffix
    function formatPlacement(place) {
        if (!place && place !== 0) return 'N/A';
        
        const placeNum = parseInt(place);
        if (isNaN(placeNum)) return place;
        
        if (placeNum % 100 >= 11 && placeNum % 100 <= 13) {
            return `${placeNum}th`;
        }
        
        switch (placeNum % 10) {
            case 1: return `${placeNum}st`;
            case 2: return `${placeNum}nd`;
            case 3: return `${placeNum}rd`;
            default: return `${placeNum}th`;
        }
    }
    
    // Get team logo data
    function getTeamLogoData(team) {
        if (!_teamAbbreviationsData || !team) {
            console.warn('Team abbreviations data not loaded or no team specified');
            return null;
        }
        
        // Find team in abbreviations data
        let teamData = null;
        
        if (_teamAbbreviationsData && _teamAbbreviationsData.teams && Array.isArray(_teamAbbreviationsData.teams)) {
            teamData = _teamAbbreviationsData.teams.find(t => t.name === team);
            if (!teamData) {
                console.warn(`Team "${team}" not found in team abbreviations data`);
            }
        } else {
            console.warn('Invalid team abbreviations data structure:', _teamAbbreviationsData);
        }
        
        return teamData;
    }
    
    // Get team accolades
    function getTeamAccolades(team) {
        if (!_accoladesData || !team) {
            console.warn('Accolades data not loaded or no team specified');
            return [];
        }
        
        const teamAccolades = [];
        
        try {
            _accoladesData.awards.forEach(yearData => {
                const yearAccolades = yearData.results.filter(result => result.winner === team);
                
                if (yearAccolades.length > 0) {
                    yearAccolades.forEach(accolade => {
                        teamAccolades.push({
                            year: yearData.year,
                            award: accolade.award
                        });
                    });
                }
            });
            
            console.log(`Found ${teamAccolades.length} accolades for team ${team}`);
        } catch (error) {
            console.error(`Error processing accolades for team ${team}:`, error);
        }
        
        return teamAccolades;
    }
    
    // Get current team stats
    function getTeamStats() {
        return _teamStats;
    }
    
    // Load all-time roster data
    function loadAllTimeRosterData() {
        // Only include seasons we know have data
        const availableSeasons = ['2019', '2020', '2021', '2022', '2023', '2024'];
        
        console.log(`Loading roster data for seasons: ${availableSeasons.join(', ')}`);
        
        const allPromises = availableSeasons.map(season => loadSeasonRosterData(season));
        
        return Promise.all(allPromises)
            .then(allResults => {
                const flattenedResults = allResults.flat();
                console.log(`Successfully loaded ${flattenedResults.length} total roster entries`);
                return flattenedResults;
            });
    }
    
    // Load roster data for a specific season
    function loadSeasonRosterData(season) {
        if (season === 'All Time') {
            return loadAllTimeRosterData();
        }

        // Hardcoded information about available weeks per season
        const availableWeeks = {
            '2019': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
            '2020': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
            '2021': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
            '2022': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
            '2023': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
            '2024': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
            '2025': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
        };
        
        // If we don't have data for this season, return empty array
        if (!availableWeeks[season]) {
            console.log(`No roster data available for season ${season}`);
            return Promise.resolve([]);
        }
        
        const weeks = availableWeeks[season];
        console.log(`Loading ${weeks.length} weeks for season ${season}`);
        
        // Create promises for each available week
        const promises = weeks.map(week => {
            return fetch(`../Data/rosters/${season}/week_${week}_rosters.json`)
                .then(response => {
                    if (!response.ok) {
                        console.warn(`Failed to load week ${week} for season ${season}`);
                        return null;
                    }
                    return response.json();
                })
                .catch(error => {
                    console.error(`Error loading week ${week} data for season ${season}:`, error);
                    return null;
                });
        });
        
        return Promise.all(promises)
            .then(results => results.filter(result => result !== null));
    }
    
    // Process roster data to calculate player statistics
    function processRosterData(rosterData, teamName) {
        const playerStats = {};
        
        // Process each week's roster data
        rosterData.forEach(weekData => {
            if (!weekData || !weekData.teams) return;
            
            // Find the team belonging to the selected franchise
            const team = weekData.teams.find(team => team.owner === teamName);
            if (!team || !team.roster) return;
            
            // Process each player on the roster
            team.roster.forEach(player => {
                const playerId = player.playerId;
                if (!playerId) return;
                
                if (!playerStats[playerId]) {
                    playerStats[playerId] = {
                        playerId: playerId,
                        name: player.name || 'Unknown Player',
                        position: player.position || 'Unknown',
                        totalProjectedPoints: 0,
                        totalActualPoints: 0,
                        weeksOnRoster: 0,
                        weeksStarted: 0
                    };
                }
                
                // Update player stats
                playerStats[playerId].weeksOnRoster++;
                
                // Check if player was started (not on bench or IR)
                if (player.slotPosition !== 'BE' && player.slotPosition !== 'IR') {
                    playerStats[playerId].weeksStarted++;
                }
                
                // Add projected and actual points
                if (player.projectedPoints !== null && player.projectedPoints !== undefined) {
                    playerStats[playerId].totalProjectedPoints += parseFloat(player.projectedPoints) || 0;
                }
                
                if (player.actualPoints !== null && player.actualPoints !== undefined) {
                    playerStats[playerId].totalActualPoints += parseFloat(player.actualPoints) || 0;
                }
            });
        });
        
        // Calculate derived statistics and convert to array
        return Object.values(playerStats).map(player => {
            // Calculate FP+ (Actual Points / Projected Points * 100)
            player.fpPlus = player.totalProjectedPoints > 0 
                ? ((player.totalActualPoints / player.totalProjectedPoints) * 100).toFixed(2) 
                : 0;
                
            // Calculate fantasy points per week rostered
            player.pointsPerWeek = player.weeksOnRoster > 0 
                ? (player.totalActualPoints / player.weeksOnRoster).toFixed(2) 
                : 0;
                
            return player;
        });
    }
    
    // Public API
    return {
        loadTeamAbbreviations: loadTeamAbbreviations,
        loadAccolades: loadAccolades,
        loadFinalPlacements: loadFinalPlacements,
        loadTeamStatistics: loadTeamStatistics,
        getTeamStats: getTeamStats,
        getTeamFinish: getTeamFinish,
        formatPlacement: formatPlacement,
        getTeamLogoData: getTeamLogoData,
        getTeamAccolades: getTeamAccolades,
        loadSeasonRosterData: loadSeasonRosterData,
        loadAllTimeRosterData: loadAllTimeRosterData,
        processRosterData: processRosterData
    };
})();
