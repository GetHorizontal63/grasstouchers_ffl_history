/**
 * Main JavaScript file for Fantasy Football League application
 */

/**
 * Calculate elimination/magic number without depending on global standings page variables
 */
function calculateElimNumber(team, divisionTeams, season, currentWeek) {
    // Skip calculation for Week 0 or invalid data
    if (currentWeek === '0' || currentWeek === 0 || !season || !currentWeek) {
        return '--';
    }
    
    // Get playoff structure and regular season length for the year
    const yearInt = parseInt(season);
    let regularSeasonWeeks, playoffTeamsPerDivision;
    
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
    } else {
        return '--'; // Unknown year
    }
    
    const remainingWeeks = regularSeasonWeeks - parseInt(currentWeek);
    
    if (remainingWeeks <= 0) {
        return '--'; // Season is over
    }
    
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
            if (elimNumber <= 0) return 'E'; // Mathematically eliminated
            return elimNumber.toString();
        }
        return '--';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Skip authentication check for now
    // checkAuthenticationStatus();
    
    // Initialize navigation
    initializeNavigation();
    
    // Handle home page specific functionality
    if (isHomePage()) {
        // Wait a moment for scripts to load, then initialize
        setTimeout(() => {
            initializeHomePage();
        }, 100);
    }
});

/**
 * Check if the user is authenticated
 */
function checkAuthenticationStatus() {
    // Check localStorage first for quick UI update
    const isAuthenticated = localStorage.getItem('ffl_authenticated') === 'true';
    
    if (isAuthenticated) {
        // Update UI for authenticated users
        updateAuthenticatedUI(JSON.parse(localStorage.getItem('ffl_user') || '{}'));
    } else {
        // Update UI for non-authenticated users
        updateNonAuthenticatedUI();
    }
    
    // Verify with server
    fetch('server/check_auth.php', {
        method: 'POST',
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.authenticated) {
            // Update localStorage and UI
            localStorage.setItem('ffl_authenticated', 'true');
            localStorage.setItem('ffl_user', JSON.stringify(data.user));
            updateAuthenticatedUI(data.user);
        } else {
            // Clear localStorage and update UI
            localStorage.removeItem('ffl_authenticated');
            localStorage.removeItem('ffl_user');
            updateNonAuthenticatedUI();
        }
    })
    .catch(error => {
        console.error('Authentication check error:', error);
    });
}

/**
 * Update UI for authenticated users
 */
function updateAuthenticatedUI(user) {
    const userStatusContainer = document.querySelector('.user-status');
    
    if (userStatusContainer) {
        // Clear existing content
        userStatusContainer.innerHTML = '';
        
        // Show logged in user information and logout button
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        
        const username = document.createElement('span');
        username.className = 'username';
        username.textContent = user.username;
        userInfo.appendChild(username);
        
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'logout-btn';
        logoutBtn.textContent = 'Logout';
        logoutBtn.addEventListener('click', logoutUser);
        
        userStatusContainer.appendChild(userInfo);
        userStatusContainer.appendChild(logoutBtn);
    }
    
    // Update welcome buttons if on home page
    if (isHomePage()) {
        const loginWelcomeBtn = document.getElementById('login-welcome-btn');
        const registerWelcomeBtn = document.getElementById('register-welcome-btn');
        
        if (loginWelcomeBtn && registerWelcomeBtn) {
            // Replace login/register buttons with my leagues and create league buttons
            const welcomeActions = loginWelcomeBtn.parentElement;
            
            welcomeActions.innerHTML = `
                <a href="pages/my-teams.html" class="welcome-btn">
                    <i class="fas fa-trophy"></i>
                    <span>My Teams</span>
                </a>
                <a href="pages/create-league.html" class="welcome-btn">
                    <i class="fas fa-plus-circle"></i>
                    <span>Create League</span>
                </a>
            `;
        }
    }
    
    // Remove 'restricted' class from nav items
    document.querySelectorAll('.nav-item.restricted').forEach(item => {
        item.classList.remove('restricted');
    });
}

/**
 * Update UI for non-authenticated users
 */
function updateNonAuthenticatedUI() {
    const userStatusContainer = document.querySelector('.user-status');
    
    if (userStatusContainer) {
        // Clear existing content
        userStatusContainer.innerHTML = '';
        
        // Show login button
        const loginBtn = document.createElement('a');
        loginBtn.href = isHomePage() ? 'pages/login.html' : '../pages/login.html';
        loginBtn.className = 'login-btn';
        loginBtn.textContent = 'Login';
        
        userStatusContainer.appendChild(loginBtn);
    }
    
    // No longer add 'restricted' class to nav items
    // All pages are accessible without authentication
}

/**
 * Initialize navigation
 */
function initializeNavigation() {
    // Set active nav item based on current page
    const currentPath = window.location.pathname;
    
    document.querySelectorAll('.nav-item').forEach(item => {
        const href = item.getAttribute('href');
        
        if (currentPath.endsWith(href)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Remove any existing 'restricted' class
    document.querySelectorAll('.nav-item.restricted').forEach(item => {
        item.classList.remove('restricted');
    });
}

/**
 * Initialize home page functionality
 */
function initializeHomePage() {
    console.log('Home page initialized');
    
    // Load landing page data
    loadCurrentStandings();
    loadNewsItems();
    
    // Initialize division tabs
    initializeDivisionTabs();
    
    // Initialize league leaders
    initializeLeagueLeaders();
}

/**
 * Load current standings for the landing page widget
 */
async function loadCurrentStandings() {
    try {
        // Use the existing standings calculation from standings.js
        if (typeof window.Standings !== 'undefined' && window.Standings.calculateStandings) {
            // Call the existing standings calculation
            const standingsData = await window.Standings.calculateStandings(2025, 3);
            if (standingsData) {
                updateSingleDivisionWidget(standingsData.divisions['Front of the Bus'], 2025, 3);
                return;
            }
        }
        
        // Fallback to current method if standings function not available
        // Load the league score data and divisions data
        const [leagueResponse, divisionsResponse] = await Promise.all([
            fetch('data/league_score_data.json'),
            fetch('data/divisions.json')
        ]);
        
        if (!leagueResponse.ok) throw new Error('Failed to load standings data');
        if (!divisionsResponse.ok) throw new Error('Failed to load divisions data');
        
        const data = await leagueResponse.json();
        const divisions = await divisionsResponse.json();
        
        console.log('Loaded league data, total entries:', data.length);
        
        // Find the most recent season and week in the data
        let currentSeason = 0;
        let maxWeek = 0;
        
        data.forEach(game => {
            if (game.Season > currentSeason) {
                currentSeason = game.Season;
                maxWeek = game.Week;
            } else if (game.Season === currentSeason && game.Week > maxWeek) {
                maxWeek = game.Week;
            }
        });
        
        console.log(`Most recent data: Season ${currentSeason}, Week ${maxWeek}`);
        
        // Get current season divisions
        const currentDivisions = divisions[currentSeason] || {};
        console.log('Current divisions:', currentDivisions);
        
        // Filter for current season and weeks 1-3
        const seasonGames = data.filter(game => 
            game.Season === currentSeason && 
            game.Week <= maxWeek
        );
        
        console.log(`Found ${seasonGames.length} game entries for ${currentSeason} weeks 1-${maxWeek}`);
        
        // Calculate standings from individual team performances
        const teamStats = {};
        
        seasonGames.forEach(game => {
            const teamName = game.Team;
            
            // Initialize team if not exists
            if (!teamStats[teamName]) {
                teamStats[teamName] = {
                    name: teamName,
                    wins: 0,
                    losses: 0,
                    pointsFor: 0,
                    games: 0,
                    division: null
                };
            }
            
            // Add points
            teamStats[teamName].pointsFor += parseFloat(game["Team Score"] || 0);
            teamStats[teamName].games++;
            
            // Determine win/loss based on score comparison
            const teamScore = parseFloat(game["Team Score"] || 0);
            const opponentScore = parseFloat(game["Opponent Score"] || 0);
            
            if (teamScore > opponentScore) {
                teamStats[teamName].wins++;
            } else if (teamScore < opponentScore) {
                teamStats[teamName].losses++;
            }
        });
        
        // Assign divisions to teams
        Object.keys(currentDivisions).forEach(divisionName => {
            const teams = currentDivisions[divisionName];
            teams.forEach(teamName => {
                if (teamStats[teamName]) {
                    teamStats[teamName].division = divisionName;
                }
            });
        });
        
        console.log('Team stats with divisions:', teamStats);
        
        // Group teams by division
        const divisionStandings = {};
        Object.values(teamStats).forEach(team => {
            const division = team.division || 'Unknown';
            if (!divisionStandings[division]) {
                divisionStandings[division] = [];
            }
            divisionStandings[division].push(team);
        });
        
        // Sort each division
        Object.keys(divisionStandings).forEach(division => {
            divisionStandings[division].sort((a, b) => {
                if (b.wins !== a.wins) return b.wins - a.wins;
                return b.pointsFor - a.pointsFor;
            });
        });
        
        console.log('Final division standings for widget:', divisionStandings);
        
        // Store data globally for toggle functionality
        currentStandingsData = {
            divisionStandings,
            season: currentSeason,
            week: maxWeek,
            isError: false
        };
        
        // Display the first division by default
        const firstDivision = Object.keys(divisionStandings)[0];
        if (firstDivision) {
            updateSingleDivisionWidget(firstDivision, divisionStandings[firstDivision], currentSeason, maxWeek);
        }
        
    } catch (error) {
        console.error('Error loading standings:', error);
        currentStandingsData = {
            divisionStandings: {},
            season: 0,
            week: 0,
            isError: true
        };
        updateSingleDivisionWidget('Error', [], 0, 0, true);
    }
}

// Global variable to store current standings data
let currentStandingsData = null;

/**
 * Initialize division tab functionality
 */
function initializeDivisionTabs() {
    const tabs = document.querySelectorAll('.division-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Get selected division
            const selectedDivision = this.getAttribute('data-division');
            
            // Update display
            if (currentStandingsData && currentStandingsData.divisionStandings[selectedDivision]) {
                updateSingleDivisionWidget(
                    selectedDivision,
                    currentStandingsData.divisionStandings[selectedDivision],
                    currentStandingsData.season,
                    currentStandingsData.week,
                    currentStandingsData.isError
                );
            }
        });
    });
}

/**
 * Update the standings widget with a single division
 */
function updateSingleDivisionWidget(divisionName, teams, season, week, isError = false) {
    const weekInfo = document.getElementById('current-week-info');
    const container = document.getElementById('divisions-container');
    
    if (weekInfo) {
        weekInfo.textContent = isError ? 'Error' : `${season} Week ${week}`;
    }
    
    if (!container) return;
    
    if (isError || !teams || teams.length === 0) {
        container.innerHTML = '<div class="loading-divisions">Unable to load standings</div>';
        return;
    }
    
    // Create HTML for the single division
    container.innerHTML = `
        <div class="single-division-standings">
            <div class="standings-table-container">
                <table class="standings-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Team</th>
                            <th>W-L</th>
                            <th>Elim#</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${teams.map((team, index) => {
                            // Add rank property that the standings function expects
                            team.rank = index + 1;
                            team.team = team.name; // Also add team property if needed
                            
                            // Call the actual elimination calculation function
                            const elimNumber = calculateElimNumber(team, teams, season, week);
                            
                            // Determine CSS class based on team position and number type
                            let elimClass = 'elim-magic';
                            if (elimNumber === 'X') {
                                elimClass += ' clinched';
                            } else if (elimNumber === 'E') {
                                elimClass += ' eliminated';
                            } else if (elimNumber !== '--') {
                                // Magic number for teams in playoff position, elimination for others
                                const playoffSpots = 4; // Top 4 per division for 2025
                                elimClass += team.rank <= playoffSpots ? ' magic-number' : ' elimination-number';
                            }
                            
                            return `
                            <tr>
                                <td>${index + 1}</td>
                                <td class="team-name">${team.name}</td>
                                <td>${team.wins}-${team.losses}</td>
                                <td class="${elimClass}">${elimNumber}</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * Update the standings widget with divisional data
 */
function updateDivisionalStandingsWidget(divisionStandings, season, week, isError = false) {
    const weekInfo = document.getElementById('current-week-info');
    const container = document.getElementById('divisions-container');
    
    if (weekInfo) {
        weekInfo.textContent = isError ? 'Error' : `${season} Week ${week}`;
    }
    
    if (!container) return;
    
    if (isError || Object.keys(divisionStandings).length === 0) {
        container.innerHTML = '<div class="loading-divisions">Unable to load standings</div>';
        return;
    }
    
    // Create HTML for each division
    container.innerHTML = Object.keys(divisionStandings).map(divisionName => {
        const teams = divisionStandings[divisionName];
        if (!teams || teams.length === 0) return '';
        
        return `
            <div class="division-standings">
                <div class="division-header">
                    <h4 class="division-title">${divisionName}</h4>
                </div>
                <div class="standings-table-container">
                    <table class="standings-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Team</th>
                                <th>W-L</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${teams.map((team, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td class="team-name">${team.name}</td>
                                    <td>${team.wins}-${team.losses}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Load news items for the landing page
 */
async function loadNewsItems() {
    try {
        // Load news from news.json file
        const response = await fetch('data/news.json');
        if (!response.ok) throw new Error('Failed to load news data');
        
        const data = await response.json();
        const newsItems = data.news || data; // Handle both {news: []} and [] formats
        
        // Limit to top 5 stories (1 featured + 4 recent)
        const limitedNews = newsItems.slice(0, 5);
        
        updateNewsWidget(limitedNews);
        
    } catch (error) {
        console.error('Error loading news:', error);
        updateNewsWidget([], true);
    }
}

/**
 * Update the news widget with ESPN-style layout
 */
function updateNewsWidget(newsItems, isError = false) {
    const featuredContainer = document.getElementById('featured-news');
    const recentContainer = document.getElementById('recent-news-list');
    
    if (isError || newsItems.length === 0) {
        if (featuredContainer) {
            featuredContainer.innerHTML = `
                <div class="featured-news-image">
                    <div class="loading-placeholder">No news available</div>
                </div>
                <div class="featured-news-content">
                    <div class="news-category">Error</div>
                    <h3 class="featured-news-title">Unable to load news</h3>
                    <p class="featured-news-summary">Please try again later.</p>
                    <div class="news-date">--</div>
                </div>
            `;
        }
        if (recentContainer) {
            recentContainer.innerHTML = '<div class="news-item loading-item"><div class="news-content">No recent news available</div></div>';
        }
        return;
    }
    
    // Update featured news (first item)
    if (featuredContainer && newsItems.length > 0) {
        const featured = newsItems[0];
        const featuredContent = `
            <div class="featured-news-image">
                ${featured.image ? `<img src="${featured.image}" alt="${featured.title}" onerror="this.style.display='none';">` : ''}
                <div class="loading-placeholder" style="display: ${featured.image ? 'none' : 'flex'};">Latest News</div>
            </div>
            <div class="featured-news-content">
                <span class="news-category">${featured.category}</span>
                <h3 class="featured-news-title">${featured.title}</h3>
                <p class="featured-news-summary">${featured.summary || featured.content}</p>
                <div class="news-date">${formatDate(featured.date)}</div>
            </div>
        `;
        
        // Link to article page if ID exists, otherwise use external URL
        if (featured.id) {
            featuredContainer.innerHTML = `<a href="pages/news-article.html?id=${featured.id}" style="text-decoration: none; color: inherit;">${featuredContent}</a>`;
        } else if (featured.url && featured.url !== '#') {
            featuredContainer.innerHTML = `<a href="${featured.url}" target="_blank" style="text-decoration: none; color: inherit;">${featuredContent}</a>`;
        } else {
            featuredContainer.innerHTML = featuredContent;
        }
    }
    
    // Update recent news list (remaining items)
    if (recentContainer) {
        const recentItems = newsItems.slice(1, 5); // Show 4 recent items
        
        if (recentItems.length === 0) {
            recentContainer.innerHTML = '<div class="news-item loading-item"><div class="news-content">No additional news</div></div>';
        } else {
            recentContainer.innerHTML = recentItems.map(item => {
                const itemContent = `
                    <div class="news-header">
                        <h4 class="news-title">${item.title}</h4>
                        <span class="news-date">${formatDate(item.date)}</span>
                    </div>
                    <span class="news-category">${item.category}</span>
                    <p class="news-content">${item.summary || item.content}</p>
                `;
                
                // Link to article page if ID exists, otherwise use external URL
                if (item.id) {
                    return `<div class="news-item"><a href="pages/news-article.html?id=${item.id}" style="text-decoration: none; color: inherit;">${itemContent}</a></div>`;
                } else if (item.url && item.url !== '#') {
                    return `<div class="news-item"><a href="${item.url}" target="_blank" style="text-decoration: none; color: inherit;">${itemContent}</a></div>`;
                } else {
                    return `<div class="news-item">${itemContent}</div>`;
                }
            }).join('');
        }
    }
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Logout user
 */
function logoutUser() {
    const fetchUrl = isHomePage() ? 'server/auth.php' : '../server/auth.php';
    
    fetch(fetchUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'action=logout'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Clear local storage
            localStorage.removeItem('ffl_authenticated');
            localStorage.removeItem('ffl_user');
            
            // Redirect to home page
            window.location.href = isHomePage() ? 'index.html' : '../index.html';
        } else {
            console.error('Logout failed:', data.message);
        }
    })
    .catch(error => {
        console.error('Logout error:', error);
    });
}

/**
 * Initialize league leaders widget
 */
async function initializeLeagueLeaders() {
    try {
        // Load league score data
        const response = await fetch('data/league_score_data.json');
        const data = await response.json();
        
        // Find the most recent season and week dynamically
        let currentSeason = 0;
        let currentWeek = 0;
        
        data.forEach(game => {
            if (game.Season > currentSeason) {
                currentSeason = game.Season;
                currentWeek = game.Week;
            } else if (game.Season === currentSeason && game.Week > currentWeek) {
                currentWeek = game.Week;
            }
        });
        
        console.log(`League Leaders: Using Season ${currentSeason}, Week ${currentWeek}`);
        
        // Load roster data for PF+ calculation
        const rosterData = await loadRosterDataForPFPlus(currentSeason, currentWeek);
        
        // Calculate leaders for each category
        const leaders = await calculateLeagueLeaders(data, currentSeason, currentWeek, rosterData);
        
        // Display the leaders
        displayLeagueLeaders(leaders);
        
    } catch (error) {
        console.error('Error loading league leaders:', error);
        const container = document.getElementById('league-leaders-container');
        if (container) {
            container.innerHTML = '<div class="loading-leaders">Error loading league leaders</div>';
        }
    }
}

/**
 * Load roster data for all weeks to calculate projected points
 */
async function loadRosterDataForPFPlus(season, maxWeek) {
    const rosterData = {};
    
    try {
        // Load roster data for weeks 1 through maxWeek
        for (let week = 1; week <= maxWeek; week++) {
            const response = await fetch(`data/rosters/${season}/week_${week}_rosters.json`);
            if (response.ok) {
                const weekData = await response.json();
                rosterData[week] = weekData;
            }
        }
    } catch (error) {
        console.error('Error loading roster data:', error);
    }
    
    return rosterData;
}

/**
 * Calculate league leaders for PF, PA, PF+, W Streak, L Streak, and Point Diff
 */
async function calculateLeagueLeaders(data, season, maxWeek, rosterData) {
    const teamStats = {};
    
    // Filter for current season and sort by week
    const seasonGames = data.filter(game => game.Season === season)
        .sort((a, b) => a.Week - b.Week);
    
    // Process each game record for PF, PA, and streaks
    seasonGames.forEach(game => {
        const teamName = game.Team;
        const teamScore = parseFloat(game["Team Score"] || 0);
        const opponentScore = parseFloat(game["Opponent Score"] || 0);
        const isWin = teamScore > opponentScore;
        const isLoss = teamScore < opponentScore;
        
        // Initialize team stats if not exists
        if (!teamStats[teamName]) {
            teamStats[teamName] = { 
                pf: 0, 
                pa: 0, 
                games: 0, 
                truePoints: 0, 
                projectedPoints: 0,
                currentWinStreak: 0,
                currentLossStreak: 0,
                maxWinStreak: 0,
                maxLossStreak: 0,
                gameResults: [] // Track game-by-game results
            };
        }
        
        // Add this team's stats
        teamStats[teamName].pf += teamScore;
        teamStats[teamName].pa += opponentScore;
        teamStats[teamName].games++;
        teamStats[teamName].gameResults.push({ week: game.Week, isWin, isLoss });
        
        // Update streaks
        if (isWin) {
            teamStats[teamName].currentWinStreak++;
            teamStats[teamName].currentLossStreak = 0;
            if (teamStats[teamName].currentWinStreak > teamStats[teamName].maxWinStreak) {
                teamStats[teamName].maxWinStreak = teamStats[teamName].currentWinStreak;
            }
        } else if (isLoss) {
            teamStats[teamName].currentLossStreak++;
            teamStats[teamName].currentWinStreak = 0;
            if (teamStats[teamName].currentLossStreak > teamStats[teamName].maxLossStreak) {
                teamStats[teamName].maxLossStreak = teamStats[teamName].currentLossStreak;
            }
        }
    });
    
    // Calculate projected points from roster data
    for (let week = 1; week <= maxWeek; week++) {
        if (rosterData[week] && rosterData[week].teams) {
            rosterData[week].teams.forEach(team => {
                const ownerName = team.owner;
                
                if (!teamStats[ownerName]) {
                    teamStats[ownerName] = { pf: 0, pa: 0, games: 0, truePoints: 0, projectedPoints: 0 };
                }
                
                // Calculate weekly projected and actual points
                let weeklyProjected = 0;
                let weeklyActual = 0;
                
                team.roster.forEach(player => {
                    // Only count starting lineup (not bench)
                    if (player.slotId !== 20 && player.slotId !== 21) { // 20 and 21 are typically bench slots
                        weeklyProjected += player.projectedPoints || 0;
                        weeklyActual += player.actualPoints || 0;
                    }
                });
                
                teamStats[ownerName].projectedPoints += weeklyProjected;
                teamStats[ownerName].truePoints += weeklyActual;
            });
        }
    }
    
    // Calculate final stats and create sorted arrays
    const pfLeaders = [];
    const paLeaders = [];
    const pfPlusLeaders = [];
    const wStreakLeaders = [];
    const lStreakLeaders = [];
    const pointDiffLeaders = [];
    
    for (const team in teamStats) {
        const stats = teamStats[team];
        // PF+ = (True Points / Projected Points) * 100, to 2 decimal places
        const pfPlus = stats.projectedPoints > 0 ? (stats.truePoints / stats.projectedPoints) * 100 : 0;
        const pointDiff = stats.pf - stats.pa;
        
        pfLeaders.push({ team, value: stats.pf });
        paLeaders.push({ team, value: stats.pa });
        pfPlusLeaders.push({ team, value: pfPlus });
        wStreakLeaders.push({ team, value: stats.maxWinStreak });
        lStreakLeaders.push({ team, value: stats.maxLossStreak });
        pointDiffLeaders.push({ team, value: pointDiff });
    }
    
    // Sort and take top 1 for each category
    pfLeaders.sort((a, b) => b.value - a.value);
    paLeaders.sort((a, b) => b.value - a.value);
    pfPlusLeaders.sort((a, b) => b.value - a.value);
    wStreakLeaders.sort((a, b) => b.value - a.value);
    lStreakLeaders.sort((a, b) => b.value - a.value);
    pointDiffLeaders.sort((a, b) => b.value - a.value);
    
    return {
        pf: pfLeaders[0],
        pa: paLeaders[0],
        pfPlus: pfPlusLeaders[0],
        wStreak: wStreakLeaders[0],
        lStreak: lStreakLeaders[0],
        pointDiff: pointDiffLeaders[0]
    };
}

/**
 * Display league leaders in the widget
 */
function displayLeagueLeaders(leaders) {
    const container = document.getElementById('league-leaders-container');
    if (!container) return;
    
    const html = `
        <div class="standings-table-container">
            <table class="standings-table">
                <tbody>
                    <tr>
                        <td>PF</td>
                        <td>${leaders.pf.team}</td>
                        <td>${leaders.pf.value.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>PA</td>
                        <td>${leaders.pa.team}</td>
                        <td>${leaders.pa.value.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>PF+</td>
                        <td>${leaders.pfPlus.team}</td>
                        <td>${leaders.pfPlus.value.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>W Streak</td>
                        <td>${leaders.wStreak.team}</td>
                        <td>${leaders.wStreak.value}</td>
                    </tr>
                    <tr>
                        <td>L Streak</td>
                        <td>${leaders.lStreak.team}</td>
                        <td>${leaders.lStreak.value}</td>
                    </tr>
                    <tr>
                        <td>Point Diff</td>
                        <td>${leaders.pointDiff.team}</td>
                        <td>${leaders.pointDiff.value > 0 ? '+' : ''}${leaders.pointDiff.value.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Check if current page is the home page
 */
function isHomePage() {
    const path = window.location.pathname;
    return path.endsWith('index.html') || path.endsWith('/') || path.endsWith('/FFLSite/');
}
