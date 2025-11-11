(function() {
    let modalTimeout = null;
    let activeGameElement = null;
    let teamFFLMap = {}; // Map: team name -> FFL abbreviation

    function init() {
        console.log('Bracket view initialized');
        
        // Create the modal container if it doesn't exist
        if (!document.getElementById('bracket-modal')) {
            const modal = document.createElement('div');
            modal.id = 'bracket-modal';
            modal.className = 'bracket-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="modal-close">&times;</span>
                    <h3 class="modal-title">Match Details</h3>
                    <div class="modal-teams-container"></div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Add click handler to close button
            modal.querySelector('.modal-close').addEventListener('click', () => {
                hideGameModal();
            });
            
            // Add hover handlers to the modal itself
            modal.addEventListener('mouseenter', () => {
                clearTimeout(modalTimeout);
            });
            
            modal.addEventListener('mouseleave', () => {
                modalTimeout = setTimeout(hideGameModal, 300);
            });
            
            // Add global click handler to close modal when clicking outside
            document.addEventListener('click', (e) => {
                const modal = document.getElementById('bracket-modal');
                if (modal && modal.style.display === 'flex' && !modal.contains(e.target) && !activeGameElement?.contains(e.target)) {
                    hideGameModal();
                }
            });
        }

        // Add listener for the main season selector (used throughout the site)
        const seasonSelect = document.getElementById('seasonSelect');
        if (seasonSelect) {
            seasonSelect.addEventListener('change', function() {
                window.currentSeason = this.value;
                loadBracket(); // Reload the bracket with the new season
                
                // Update URL if needed
                const urlParams = new URLSearchParams(window.location.search);
                urlParams.set('season', this.value);
                const newUrl = window.location.pathname + '?' + urlParams.toString();
                window.history.replaceState({}, '', newUrl);
            });
        }

        // Keep the existing season-selector listener for backwards compatibility
        const seasonSelector = document.getElementById('season-selector');
        if (seasonSelector) {
            seasonSelector.addEventListener('change', function() {
                window.currentSeason = this.value;
                loadBracket(); // Reload the bracket with the new season
                
                // Update URL if needed (optional)
                const urlParams = new URLSearchParams(window.location.search);
                urlParams.set('season', this.value);
                const newUrl = window.location.pathname + '?' + urlParams.toString();
                window.history.replaceState({}, '', newUrl);
            });
        }

        // Load team abbreviations and build the map
        fetch('../data/team_abbreviations.json')
            .then(r => r.json())
            .then(data => {
                if (data && Array.isArray(data.teams)) {
                    data.teams.forEach(team => {
                        if (team.name && team.abbreviations && team.abbreviations.FFL) {
                            teamFFLMap[team.name] = team.abbreviations.FFL;
                        }
                    });
                }
            })
            .catch(() => {
                // fallback: empty map
                teamFFLMap = {};
            });
    }

    function loadBracket() {
        const bracketSection = document.getElementById('bracket');
        if (!bracketSection) return;
        
        // Get current season from global variable
        const season = window.currentSeason || new Date().getFullYear().toString();
        
        // Show loading message
        bracketSection.innerHTML = '<div class="loading-message"><i class="fas fa-spinner fa-spin"></i><p>Loading bracket...</p></div>';
        
        // Load both data files
        Promise.all([
            fetch('../data/bracket_history.json').then(r => r.json()),
            fetch('../data/league_score_data.json').then(r => r.json())
        ])
        .then(([bracketHistory, leagueScoreData]) => {
            // Get the bracket configuration for the current season
            const bracketConfig = bracketHistory[season] || {};
            
            // Store bracket data globally for use in other functions
            window.currentBracketData = bracketConfig;
            
            // Process the league score data into a map by Game ID
            const gameDataMap = createGameDataMap(leagueScoreData);
            
            // Build the bracket HTML
            const bracketHTML = buildBracketHTML(bracketConfig, gameDataMap);
            bracketSection.innerHTML = bracketHTML;
        })
        .catch(error => {
            console.error('Error loading bracket data:', error);
            bracketSection.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-triangle"></i><p>Error loading bracket data</p></div>';
        });
    }
    
    function createGameDataMap(leagueScoreData) {
        const gameMap = {};
        
        // Group games by Game ID
        leagueScoreData.forEach(game => {
            if (!game["Game ID"]) return;
            
            const gameId = game["Game ID"];
            if (!gameMap[gameId]) {
                gameMap[gameId] = {
                    teams: [],
                    scores: []
                };
            }
            
            // Add team and score to the game data
            if (gameMap[gameId].teams.indexOf(game["Team"]) === -1) {
                gameMap[gameId].teams.push(game["Team"]);
                gameMap[gameId].scores.push(game["Team Score"]);
            }
        });
        
        return gameMap;
    }
    
    function buildBracketHTML(bracketConfig, gameDataMap) {
        // Generate standings section if available
        let standingsHTML = '';
        if (bracketConfig.standings && Array.isArray(bracketConfig.standings)) {
            standingsHTML = generateStandingsHTML(bracketConfig.standings);
        }
        
        // If no bracket data, show empty brackets
        if (Object.keys(bracketConfig).length === 0 || (!bracketConfig.Championship && !bracketConfig.Gulag)) {
            return `
                <h2 class="section-title">Playoff Brackets</h2>
                ${standingsHTML}
                <div class="bracket-simple-container">
                    <!-- Empty Championship Bracket -->
                    <div class="bracket-row">
                        <div class="bracket-column">
                            <h3 class="bracket-heading">Quarterfinals</h3>
                            <div class="bracket-game"><div class="team">TBD</div><div class="team">TBD</div></div>
                            <div class="bracket-game"><div class="team">TBD</div><div class="team">TBD</div></div>
                        </div>
                        <div class="bracket-column">
                            <h3 class="bracket-heading">Semifinal</h3>
                            <div class="bracket-game"><div class="team">TBD</div><div class="team">TBD</div></div>
                        </div>
                        <div class="bracket-column championship">
                            <h3 class="bracket-heading">Championship</h3>
                            <div class="bracket-game final"><div class="team">TBD</div><div class="team">TBD</div></div>
                        </div>
                        <div class="bracket-column">
                            <h3 class="bracket-heading">Semifinal</h3>
                            <div class="bracket-game"><div class="team">TBD</div><div class="team">TBD</div></div>
                        </div>
                        <div class="bracket-column">
                            <h3 class="bracket-heading">Quarterfinals</h3>
                            <div class="bracket-game"><div class="team">TBD</div><div class="team">TBD</div></div>
                            <div class="bracket-game"><div class="team">TBD</div><div class="team">TBD</div></div>
                        </div>
                    </div>
                    
                    <!-- Empty Gulag Bracket -->
                    <div class="bracket-row gulag-bracket">
                        <div class="bracket-column">
                            <h3 class="bracket-heading">Quarterfinals</h3>
                            <div class="bracket-game"><div class="team">TBD</div><div class="team">TBD</div></div>
                            <div class="bracket-game"><div class="team">TBD</div><div class="team">TBD</div></div>
                        </div>
                        <div class="bracket-column">
                            <h3 class="bracket-heading">Semifinal</h3>
                            <div class="bracket-game"><div class="team">TBD</div><div class="team">TBD</div></div>
                        </div>
                        <div class="bracket-column championship">
                            <h3 class="bracket-heading">Chumpionship</h3>
                            <div class="bracket-game final"><div class="team">TBD</div><div class="team">TBD</div></div>
                        </div>
                        <div class="bracket-column">
                            <h3 class="bracket-heading">Semifinal</h3>
                            <div class="bracket-game"><div class="team">TBD</div><div class="team">TBD</div></div>
                        </div>
                        <div class="bracket-column">
                            <h3 class="bracket-heading">Quarterfinals</h3>
                            <div class="bracket-game"><div class="team">TBD</div><div class="team">TBD</div></div>
                            <div class="bracket-game"><div class="team">TBD</div><div class="team">TBD</div></div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Championship bracket games
        const champBracket = bracketConfig.Championship || {};
        const pGames = {
            p1: renderGameInfo(champBracket.p1, gameDataMap, 'championship'),
            p2: renderGameInfo(champBracket.p2, gameDataMap, 'championship'),
            p3: renderGameInfo(champBracket.p3, gameDataMap, 'championship'),
            p4: renderGameInfo(champBracket.p4, gameDataMap, 'championship'),
            p5: renderGameInfo(champBracket.p5, gameDataMap, 'championship'),
            p6: renderGameInfo(champBracket.p6, gameDataMap, 'championship'),
            p7: renderGameInfo(champBracket.p7, gameDataMap, 'championship')
        };
        
        // Gulag bracket games
        const gulagBracket = bracketConfig.Gulag || {};
        const gGames = {
            g1: renderGameInfo(gulagBracket.g1, gameDataMap, 'gulag'),
            g2: renderGameInfo(gulagBracket.g2, gameDataMap, 'gulag'),
            g3: renderGameInfo(gulagBracket.g3, gameDataMap, 'gulag'),
            g4: renderGameInfo(gulagBracket.g4, gameDataMap, 'gulag'),
            g5: renderGameInfo(gulagBracket.g5, gameDataMap, 'gulag'),
            g6: renderGameInfo(gulagBracket.g6, gameDataMap, 'gulag'),
            g7: renderGameInfo(gulagBracket.g7, gameDataMap, 'gulag')
        };
        
        const html = `
            <h2 class="section-title">Playoff Brackets</h2>
            ${standingsHTML}
            <div class="bracket-simple-container">
                <!-- Championship Bracket -->
                <div class="bracket-row">
                    <div class="bracket-column">
                        <h3 class="bracket-heading">Quarterfinals</h3>
                        <div class="bracket-game" data-game-id="${champBracket.p1}" data-bracket-type="championship">${pGames.p1.html}</div>
                        <div class="bracket-game" data-game-id="${champBracket.p2}" data-bracket-type="championship">${pGames.p2.html}</div>
                    </div>
                    <div class="bracket-column">
                        <h3 class="bracket-heading">Semifinal</h3>
                        <div class="bracket-game" data-game-id="${champBracket.p5}" data-bracket-type="championship">${pGames.p5.html}</div>
                    </div>
                    <div class="bracket-column championship">
                        <h3 class="bracket-heading">Championship</h3>
                        <div class="bracket-game final" data-game-id="${champBracket.p7}" data-bracket-type="championship">${pGames.p7.html}</div>
                    </div>
                    <div class="bracket-column">
                        <h3 class="bracket-heading">Semifinal</h3>
                        <div class="bracket-game" data-game-id="${champBracket.p6}" data-bracket-type="championship">${pGames.p6.html}</div>
                    </div>
                    <div class="bracket-column">
                        <h3 class="bracket-heading">Quarterfinals</h3>
                        <div class="bracket-game" data-game-id="${champBracket.p3}" data-bracket-type="championship">${pGames.p3.html}</div>
                        <div class="bracket-game" data-game-id="${champBracket.p4}" data-bracket-type="championship">${pGames.p4.html}</div>
                    </div>
                </div>
                
                <!-- Gulag Bracket -->
                <div class="bracket-row gulag-bracket">
                    <div class="bracket-column">
                        <h3 class="bracket-heading">Quarterfinals</h3>
                        <div class="bracket-game" data-game-id="${gulagBracket.g1}" data-bracket-type="gulag">${gGames.g1.html}</div>
                        <div class="bracket-game" data-game-id="${gulagBracket.g2}" data-bracket-type="gulag">${gGames.g2.html}</div>
                    </div>
                    <div class="bracket-column">
                        <h3 class="bracket-heading">Semifinal</h3>
                        <div class="bracket-game" data-game-id="${gulagBracket.g5}" data-bracket-type="gulag">${gGames.g5.html}</div>
                    </div>
                    <div class="bracket-column championship">
                        <h3 class="bracket-heading">Chumpionship</h3>
                        <div class="bracket-game final" data-game-id="${gulagBracket.g7}" data-bracket-type="gulag">${gGames.g7.html}</div>
                    </div>
                    <div class="bracket-column">
                        <h3 class="bracket-heading">Semifinal</h3>
                        <div class="bracket-game" data-game-id="${gulagBracket.g6}" data-bracket-type="gulag">${gGames.g6.html}</div>
                    </div>
                    <div class="bracket-column">
                        <h3 class="bracket-heading">Quarterfinals</h3>
                        <div class="bracket-game" data-game-id="${gulagBracket.g3}" data-bracket-type="gulag">${gGames.g3.html}</div>
                        <div class="bracket-game" data-game-id="${gulagBracket.g4}" data-bracket-type="gulag">${gGames.g4.html}</div>
                    </div>
                </div>
            </div>
        `;
        
        // Return the HTML and schedule the binding of event handlers
        setTimeout(() => attachBracketEventListeners(), 100);
        return html;
    }
    
    function generateStandingsHTML(standings) {
        if (!standings || standings.length === 0) {
            return '';
        }
        
        // Split standings into championship (top 8) and gulag (bottom 8) brackets
        const championship = standings.slice(0, 8);
        const gulag = standings.slice(8, 16);
        
        const championshipHTML = championship.map(team => `
            <div class="standings-team championship-team" data-seed="${team.seed}">
                <span class="seed">${team.seed}</span>
                <span class="team-name">${team.team}</span>
                <span class="record">${team.wins}-${team.losses}</span>
                <span class="points">${team.points_for.toFixed(1)}</span>
                <span class="division">${team.division || ''}</span>
                <span class="playoff-reason">${team.playoff_reason || ''}</span>
            </div>
        `).join('');
        
        const gulagHTML = gulag.map(team => `
            <div class="standings-team gulag-team" data-seed="${team.seed}">
                <span class="seed">${team.seed}</span>
                <span class="team-name">${team.team}</span>
                <span class="record">${team.wins}-${team.losses}</span>
                <span class="points">${team.points_for.toFixed(1)}</span>
                <span class="division">${team.division || ''}</span>
                <span class="playoff-reason">${team.playoff_reason || ''}</span>
            </div>
        `).join('');
        
        return `
            <div class="standings-container">
                <h3 class="standings-title">Final Regular Season Standings</h3>
                <div class="standings-brackets">
                    <div class="standings-bracket championship-standings">
                        <h4 class="bracket-standings-title">Championship Bracket</h4>
                        <div class="standings-header">
                            <span class="seed-header">Seed</span>
                            <span class="team-header">Team</span>
                            <span class="record-header">Record</span>
                            <span class="points-header">Points For</span>
                            <span class="division-header">Division</span>
                            <span class="reason-header">Qualification</span>
                        </div>
                        ${championshipHTML}
                    </div>
                    <div class="standings-bracket gulag-standings">
                        <h4 class="bracket-standings-title">Gulag Bracket</h4>
                        <div class="standings-header">
                            <span class="seed-header">Seed</span>
                            <span class="team-header">Team</span>
                            <span class="record-header">Record</span>
                            <span class="points-header">Points For</span>
                            <span class="division-header">Division</span>
                            <span class="reason-header">Qualification</span>
                        </div>
                        ${gulagHTML}
                    </div>
                </div>
            </div>
        `;
    }
    
    function renderGameInfo(gameId, gameDataMap, bracketType) {
        // Default game info
        let html = `<div class="team">TBD</div><div class="team">TBD</div>`;
        let result = { html };
        
        // If no game ID or no data for this game ID
        if (!gameId || gameId === "value" || !gameDataMap[gameId]) {
            return result;
        }
        
        // Get the game data
        const gameData = gameDataMap[gameId];
        if (!gameData.teams || gameData.teams.length < 2) {
            return result;
        }
        
        // Get standings data if available to show seeds
        const standingsData = window.currentBracketData?.standings || [];
        const seedMap = {};
        standingsData.forEach(team => {
            seedMap[team.team] = team.seed;
        });
        
        // Determine winner and loser
        const score1 = parseFloat(gameData.scores[0]);
        const score2 = parseFloat(gameData.scores[1]);
        
        // Championship: Highlight winner (higher score)
        // Gulag: Highlight loser (lower score)
        let team1Class = '';
        let team2Class = '';
        
        if (bracketType === 'championship') {
            // For championship, highlight the winner (higher score)
            if (score1 > score2) {
                team1Class = 'championship-winner';
            } else if (score2 > score1) {
                team2Class = 'championship-winner';
            }
        } else if (bracketType === 'gulag') {
            // For gulag, highlight the loser (lower score)
            if (score1 < score2) {
                team1Class = 'gulag-loser';
            } else if (score2 < score1) {
                team2Class = 'gulag-loser';
            }
        }
        
        // Get seed information
        const team1Seed = seedMap[gameData.teams[0]];
        const team2Seed = seedMap[gameData.teams[1]];
        
        // Format team names with seeds if available
        const team1Display = team1Seed ? `(${team1Seed}) ${gameData.teams[0]}` : gameData.teams[0];
        const team2Display = team2Seed ? `(${team2Seed}) ${gameData.teams[1]}` : gameData.teams[1];
        
        // Format the HTML for this game - with data attributes for modal
        html = `
            <div class="team ${team1Class}" data-team="${gameData.teams[0]}" data-score="${gameData.scores[0]}" data-seed="${team1Seed || ''}">${team1Display}</div>
            <div class="team ${team2Class}" data-team="${gameData.teams[1]}" data-score="${gameData.scores[1]}" data-seed="${team2Seed || ''}">${team2Display}</div>
        `;
        
        return { 
            html, 
            teams: gameData.teams, 
            scores: gameData.scores,
            gameId: gameId, 
            bracketType: bracketType,
            seeds: [team1Seed, team2Seed]
        };
    }
    
    function attachBracketEventListeners() {
        // Add hover events to all bracket games
        const games = document.querySelectorAll('.bracket-game');
        games.forEach(game => {
            // Remove any existing event listeners first to prevent duplicates
            game.removeEventListener('mouseenter', handleGameMouseEnter);
            game.removeEventListener('mouseleave', handleGameMouseLeave);
            
            // Add new event listeners
            game.addEventListener('mouseenter', handleGameMouseEnter);
            game.addEventListener('mouseleave', handleGameMouseLeave);
        });
    }
    
    function handleGameMouseEnter(event) {
        clearTimeout(modalTimeout);
        activeGameElement = event.currentTarget;
        
        // Small delay to prevent flickering on rapid mouse movements
        modalTimeout = setTimeout(() => {
            showGameModal(event);
        }, 200);
    }
    
    function handleGameMouseLeave(event) {
        clearTimeout(modalTimeout);
        
        // Small delay before hiding to allow moving mouse to the modal
        modalTimeout = setTimeout(() => {
            hideGameModal();
        }, 300);
    }
    
    function showGameModal(event) {
        if (!activeGameElement) return;
        
        const gameElement = activeGameElement;
        const gameId = gameElement.getAttribute('data-game-id');
        const bracketType = gameElement.getAttribute('data-bracket-type');
        
        // Skip if no valid game ID
        if (!gameId || gameId === "value") return;
        
        const teamElements = gameElement.querySelectorAll('.team');
        if (teamElements.length < 2) return;
        
        // Get team data
        const team1 = teamElements[0].getAttribute('data-team');
        const team2 = teamElements[1].getAttribute('data-team');
        
        // Skip if teams are not defined
        if (team1 === "TBD" || team2 === "TBD") return;
        
        const score1 = parseFloat(teamElements[0].getAttribute('data-score'));
        const score2 = parseFloat(teamElements[1].getAttribute('data-score'));
        
        // Determine winner/loser status
        let team1Status = '';
        let team2Status = '';
        let gameStatus = '';
        
        const season = window.currentSeason || new Date().getFullYear().toString();
        const isChampionshipFinal = bracketType === 'championship' && gameElement.classList.contains('final');
        const isGulagFinal = bracketType === 'gulag' && gameElement.classList.contains('final');
        
        if (score1 > score2) {
            team1Status = bracketType === 'championship' ? 'Winner' : 'Survivor';
            team2Status = bracketType === 'championship' ? 'Eliminated' : 'Loser';
            
            if (isChampionshipFinal) {
                gameStatus = `${team1} won the ${season} Season Title`;
            } else if (isGulagFinal) {
                gameStatus = `${team2} has descended to the depths of hell`;
            } else {
                gameStatus = bracketType === 'championship' ? 
                    `${team1} advanced with a ${(score1-score2).toFixed(1)}-point victory` : 
                    `${team1} survived after a ${(score1-score2).toFixed(1)}-point victory`;
            }
        } else if (score2 > score1) {
            team2Status = bracketType === 'championship' ? 'Winner' : 'Survivor';
            team1Status = bracketType === 'championship' ? 'Eliminated' : 'Loser';
            
            if (isChampionshipFinal) {
                gameStatus = `${team2} won the ${season} Season Title`;
            } else if (isGulagFinal) {
                gameStatus = `${team1} has descended to the depths of hell`;
            } else {
                gameStatus = bracketType === 'championship' ? 
                    `${team2} advanced with a ${(score2-score1).toFixed(1)}-point victory` : 
                    `${team2} survived after a ${(score2-score1).toFixed(1)}-point victory`;
            }
        } else {
            team1Status = 'Tied';
            team2Status = 'Tied';
            gameStatus = 'Game resulted in a tie';
        }
        
        // Calculate score difference percentage for visualization
        const totalPoints = score1 + score2;
        const team1Percentage = totalPoints > 0 ? (score1 / totalPoints * 100) : 50;
        const team2Percentage = totalPoints > 0 ? (score2 / totalPoints * 100) : 50;
        
        // Set modal title based on bracket type and gameId
        const modal = document.getElementById('bracket-modal');
        const modalTitle = modal.querySelector('.modal-title');
        const modalContent = modal.querySelector('.modal-content');
        
        modalContent.className = 'modal-content';
        if (bracketType === 'championship') {
            // Check if this is the championship final game (has class 'final')
            if (gameElement.classList.contains('final')) {
                modalTitle.textContent = 'Championship Match';
            } else {
                modalTitle.textContent = 'Playoff Match';
            }
            modalContent.classList.add('championship-modal');
        } else {
            modalTitle.textContent = 'Gulag Match';
            modalContent.classList.add('gulag-modal');
        }
        
        // Round number determination - simplified approach
        let roundName = "Playoff Match";
        if (gameId.includes('p1') || gameId.includes('p2') || gameId.includes('p3') || gameId.includes('p4') ||
            gameId.includes('g1') || gameId.includes('g2') || gameId.includes('g3') || gameId.includes('g4')) {
            roundName = "Quarterfinal";
        } else if (gameId.includes('p5') || gameId.includes('p6') || 
                   gameId.includes('g5') || gameId.includes('g6')) {
            roundName = "Semifinal";
        } else if (gameId.includes('p7') || gameId.includes('g7')) {
            roundName = bracketType === 'championship' ? "Championship Final" : "Chumpionship Final";
        }
        
        // Get FFL abbreviations for logo lookup
        const ffl1 = teamFFLMap[team1] || 'default';
        const ffl2 = teamFFLMap[team2] || 'default';

        // Populate team details with both background logos flying in from bottom
        const teamsContainer = modal.querySelector('.modal-teams-container');
        teamsContainer.innerHTML = `
            <div class="smash-vs-container">
                <div class="flying-logo-bg team1-bg">
                    <img src="../assets/ffl-logos/${ffl1}.png" alt="${team1}" onerror="this.onerror=null;this.src='../assets/ffl-logos/default.png';">
                </div>
                <div class="flying-logo-bg team2-bg">
                    <img src="../assets/ffl-logos/${ffl2}.png" alt="${team2}" onerror="this.onerror=null;this.src='../assets/ffl-logos/default.png';">
                </div>
                <div class="smash-team team1 ${team1Status === 'Winner' || team1Status === 'Survivor' ? 'winner' : ''}">
                    <div class="smash-team-name">${team1}</div>
                    <div class="smash-team-score">${score1.toFixed(1)}</div>
                    <div class="smash-team-status">${team1Status}</div>
                </div>
                <div class="smash-vs">
                    <div class="smash-vs-text">VS</div>
                    <div class="smash-vs-flash"></div>
                </div>
                <div class="smash-team team2 ${team2Status === 'Winner' || team2Status === 'Survivor' ? 'winner' : ''}">
                    <div class="smash-team-name">${team2}</div>
                    <div class="smash-team-score">${score2.toFixed(1)}</div>
                    <div class="smash-team-status">${team2Status}</div>
                </div>
            </div>
            <div class="modal-game-info">
                <div class="modal-round-name">${roundName}</div>
                <div class="modal-game-id">Game ID: ${gameId.toUpperCase()}</div>
                <div class="modal-game-status">${gameStatus}</div>
            </div>
            <div class="modal-team-comparison">
                <div class="modal-score-bars">
                    <div class="modal-score-bar team1" style="width: ${team1Percentage}%; background-color: ${team1Status === 'Winner' || team1Status === 'Survivor' ? '#FFD700' : '#444'};"></div>
                    <div class="modal-score-bar team2" style="width: ${team2Percentage}%; background-color: ${team2Status === 'Winner' || team2Status === 'Survivor' ? '#FFD700' : '#444'};"></div>
                </div>
            </div>
            <div class="modal-game-stats">
                <div class="modal-stat">
                    <div class="modal-stat-label">Point Differential</div>
                    <div class="modal-stat-value">${Math.abs(score1 - score2).toFixed(1)}</div>
                </div>
                <div class="modal-stat">
                    <div class="modal-stat-label">Total Points</div>
                    <div class="modal-stat-value">${(score1 + score2).toFixed(1)}</div>
                </div>
            </div>
        `;
        
        // Add a small animation effect after rendering
        setTimeout(() => {
            const vsFlash = modal.querySelector('.smash-vs-flash');
            if (vsFlash) vsFlash.classList.add('active');
            
            const team1Elem = modal.querySelector('.smash-team.team1');
            const team2Elem = modal.querySelector('.smash-team.team2');
            if (team1Elem) team1Elem.classList.add('active');
            if (team2Elem) team2Elem.classList.add('active');
        }, 50);
        
        // Position the modal near the game
        // Display the modal first so we can get its dimensions
        modal.style.display = 'block';
        modalContent.style.position = 'fixed';
        
        // Use mouse position
        const mouseX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
        const mouseY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
        
        // Get modal dimensions
        const modalWidth = modalContent.offsetWidth;
        const modalHeight = modalContent.offsetHeight;
        
        // Calculate position - ALWAYS place it above the cursor
        let left = mouseX - (modalWidth / 2);
        
        // Determine how much space we have above the cursor
        const spaceAbove = mouseY;
        // Set top position to show the modal above cursor
        let top = mouseY - modalHeight - 15; // 15px gap between cursor and modal
        
        // If there's not enough space above, adjust to show at the top of the viewport
        if (top < 10) {
            top = 10; // Keep a small margin from the top of viewport
        }
        
        // Ensure modal stays horizontally within viewport
        if (left < 10) left = 10;
        if (left + modalWidth > window.innerWidth - 10) {
            left = window.innerWidth - modalWidth - 10;
        }
        
        modalContent.style.top = top + 'px';
        modalContent.style.left = left + 'px';
        
        // Change display mode to flex for proper layout
        modal.style.display = 'flex';
        modal.style.alignItems = 'flex-start';
        modal.style.justifyContent = 'flex-start';
    }
    
    function hideGameModal() {
        activeGameElement = null;
        const modal = document.getElementById('bracket-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Also, add a function to initialize the season selector with the current season
    function initializeSeasonSelector() {
        // Handle bracket-specific season selector if present
        const seasonSelector = document.getElementById('season-selector');
        if (seasonSelector) {
            // Remove "All Time" option if it exists
            Array.from(seasonSelector.options).forEach(option => {
                if (option.value === 'All Time') {
                    seasonSelector.removeChild(option);
                }
            });
            
            // Set the current value based on URL parameter or default
            const urlParams = new URLSearchParams(window.location.search);
            const seasonParam = urlParams.get('season');
            
            if (seasonParam && seasonParam !== 'All Time' && seasonSelector.querySelector(`option[value="${seasonParam}"]`)) {
                seasonSelector.value = seasonParam;
                window.currentSeason = seasonParam;
            } else {
                // Default to most recent season (usually the last option)
                const options = seasonSelector.querySelectorAll('option');
                if (options.length > 0) {
                    const lastOption = options[options.length - 1];
                    window.currentSeason = lastOption.value;
                    seasonSelector.value = lastOption.value;
                } else {
                    window.currentSeason = new Date().getFullYear().toString();
                }
            }
        }
        
        // Also check the main seasonSelect dropdown
        const mainSeasonSelect = document.getElementById('seasonSelect');
        if (mainSeasonSelect) {
            // Remove "All Time" option if it exists
            Array.from(mainSeasonSelect.options).forEach(option => {
                if (option.value === 'All Time') {
                    mainSeasonSelect.removeChild(option);
                }
            });
            
            // If current season is "All Time", change it to the most recent year
            if (window.currentSeason === 'All Time') {
                const options = mainSeasonSelect.querySelectorAll('option');
                if (options.length > 0) {
                    const lastOption = options[options.length - 1];
                    window.currentSeason = lastOption.value;
                    mainSeasonSelect.value = lastOption.value;
                } else {
                    window.currentSeason = new Date().getFullYear().toString();
                }
            }
        }
    }

    // Expose public methods
    window.BracketView = {
        init: init,
        load: loadBracket,
        updateSeason: function(season) {
            if (window.currentSeason !== season) {
                window.currentSeason = season;
                loadBracket();
            }
        }
    };
})();

// Initialize the module when the script loads
document.addEventListener('DOMContentLoaded', function() {
    if (window.BracketView) {
        window.BracketView.init();
        
        // Get the current season from the main selector
        const seasonSelect = document.getElementById('seasonSelect');
        if (seasonSelect) {
            window.currentSeason = seasonSelect.value;
        }
        
        // Initialize season selector if present and then load bracket
        if (typeof initializeSeasonSelector === 'function') {
            initializeSeasonSelector();
        }
        
        window.BracketView.load();
    }
});
