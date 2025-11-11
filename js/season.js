// Season Overview Page - Main Controller

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the season overview
    initSeason();
});

// Global variables
let currentSeason = new Date().getFullYear().toString(); // Default to current year
let seasonData = null;
let availableSeasons = [];

// Initialize season overview
function initSeason() {
    console.log('Initializing season overview page...');
    
    // Get DOM elements
    const seasonSelect = document.getElementById('seasonSelect');
    
    // Show loading state
    toggleLoading(true);
    
    // Get season from URL if available
    const urlSeason = getUrlParameter('season');
    if (urlSeason) {
        currentSeason = urlSeason;
    }
    
    // First discover available seasons, then continue initialization
    discoverAvailableSeasons()
        .then(() => {
            // Populate season dropdown
            populateSeasonDropdown(seasonSelect);
            
            // Set dropdown value to current season if it exists, otherwise use the most recent season
            if (seasonSelect) {
                if (availableSeasons.includes(currentSeason)) {
                    seasonSelect.value = currentSeason;
                } else if (availableSeasons.length > 0) {
                    // Use the most recent season (first in the sorted list)
                    currentSeason = availableSeasons[0];
                    seasonSelect.value = currentSeason;
                }
            }
            
            // Add event listeners to tabs
            initTabNavigation();
            
            // Initialize season dropdown
            initSeasonDropdown();
            
            // Load season data
            loadSeasonData();
        })
        .catch(error => {
            console.error('Error discovering seasons:', error);
            // Still continue loading with default or current season
            populateSeasonDropdown(seasonSelect);
            if (seasonSelect) seasonSelect.value = currentSeason;
            initTabNavigation();
            initSeasonDropdown();
            loadSeasonData();
        });
}

// Discover available seasons by checking the roster directory
function discoverAvailableSeasons() {
    console.log('Discovering available seasons from roster data');
    
    return new Promise((resolve) => {
        // Strategy 1: Try directory listing (may not work on all servers)
        fetch('../data/rosters/')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Could not access roster directory');
                }
                // If we get here, we might be able to parse a directory listing
                // but this is less reliable, so we'll use Strategy 2 as well
                return null;
            })
            .catch(() => null)
            .finally(() => {
                // Strategy 2: Try to fetch a seasons.json file that might exist
                fetch('../data/rosters/seasons.json')
                    .then(response => {
                        if (response.ok) {
                            return response.json()
                                .then(data => {
                                    if (data.seasons && Array.isArray(data.seasons)) {
                                        console.log('Found seasons from seasons.json:', data.seasons);
                                        availableSeasons = [...data.seasons].sort().reverse();
                                        resolve(availableSeasons);
                                        return;
                                    }
                                    throw new Error('Invalid seasons.json format');
                                });
                        }
                        throw new Error('No seasons.json found');
                    })
                    .catch(() => {
                        // Strategy 3: Try to check for specific years by checking if week_1_rosters.json exists
                        // Try last 10 years plus next year
                        const currentYear = new Date().getFullYear();
                        const yearsToCheck = [];
                        
                        // Check from next year down to 10 years ago (more recent first)
                        for (let year = currentYear + 1; year >= currentYear - 10; year--) {
                            yearsToCheck.push(year.toString());
                        }
                        
                        console.log('Checking for seasons by testing for roster files:', yearsToCheck);
                        
                        const checkPromises = yearsToCheck.map(year => {
                            return fetch(`../data/rosters/${year}/week_1_rosters.json`)
                                .then(response => {
                                    if (response.ok) {
                                        return year;
                                    }
                                    return null;
                                })
                                .catch(() => null);
                        });
                        
                        Promise.all(checkPromises)
                            .then(results => {
                                // Filter out null values and sort in descending order
                                const validYears = results.filter(year => year !== null)
                                    .sort((a, b) => parseInt(b) - parseInt(a));
                                
                                console.log('Found valid seasons:', validYears);
                                
                                if (validYears.length > 0) {
                                    availableSeasons = validYears;
                                } else {
                                    // If no years found, use a reasonable default
                                    availableSeasons = ['2024', '2023', '2022', '2021', '2020'];
                                    console.log('No seasons found, using defaults:', availableSeasons);
                                }
                                
                                resolve(availableSeasons);
                            });
                    });
            });
    });
}

// Populate season dropdown with discovered seasons
function populateSeasonDropdown(select) {
    if (!select) return;
    
    // Clear existing options
    select.innerHTML = '';
    
    // Add options for each discovered season
    if (availableSeasons.length > 0) {
        // Seasons are already sorted in discoverAvailableSeasons
        availableSeasons.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            select.appendChild(option);
        });
    } else {
        // Fallback to current year if no seasons discovered
        const currentYear = new Date().getFullYear().toString();
        const option = document.createElement('option');
        option.value = currentYear;
        option.textContent = currentYear;
        select.appendChild(option);
    }
}

// Load season data
function loadSeasonData() {
    console.log(`Loading data for season ${currentSeason}...`);
    
    // Reset loading states
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.innerHTML = `
            <div class="loading-message">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading data...</p>
            </div>
        `;
    });
    
    // Save current season to a global variable so other modules can access it
    window.currentSeason = currentSeason;
    
    // Fetch the season data
    fetch(`../data/season/${currentSeason}/season_data.json`)
        .then(response => {
            if (!response.ok) {
                // If no season_data.json exists, create empty data structure
                console.warn(`No season data found for ${currentSeason}, using empty data structure`);
                return {
                    leagueLeaders: {},
                    notableGames: {},
                    weeklyResults: [],
                    playoffs: {},
                    allProTeam: {}
                };
            }
            return response.json();
        })
        .then(data => {
            seasonData = data;
            
            toggleLoading(false);
            
            // Trigger each module's load function with the appropriate data
            // Even if data is empty, modules should handle this gracefully
            if (window.LeagueLeaders && typeof window.LeagueLeaders.load === 'function') {
                window.LeagueLeaders.load(data.leagueLeaders || {});
            }
            
            if (window.NotableGames && typeof window.NotableGames.load === 'function') {
                window.NotableGames.load(data.notableGames || {});
            }
            
            if (window.WeeklyResults && typeof window.WeeklyResults.load === 'function') {
                window.WeeklyResults.load(data.weeklyResults || []);
            }
            
            if (window.PlayoffBracket && typeof window.PlayoffBracket.load === 'function') {
                window.PlayoffBracket.load(data.playoffs || {});
            }
            
            if (window.BracketView && typeof window.BracketView.load === 'function') {
                window.BracketView.load(data.playoffs || {});
            }
            
            if (window.AllProTeam && typeof window.AllProTeam.load === 'function') {
                window.AllProTeam.load(data.allProTeam || {});
            }
        })
        .catch(error => {
            console.error('Error loading season data:', error);
            // We won't display an error message anymore - instead each module should handle missing data
            // But we'll still need to show the content area
            toggleLoading(false);
            
            // Load modules with empty data
            if (window.LeagueLeaders && typeof window.LeagueLeaders.load === 'function') {
                window.LeagueLeaders.load({});
            }
            
            if (window.NotableGames && typeof window.NotableGames.load === 'function') {
                window.NotableGames.load({});
            }
            
            if (window.WeeklyResults && typeof window.WeeklyResults.load === 'function') {
                window.WeeklyResults.load([]);
            }
            
            if (window.PlayoffBracket && typeof window.PlayoffBracket.load === 'function') {
                window.PlayoffBracket.load({});
            }
            
            if (window.BracketView && typeof window.BracketView.load === 'function') {
                window.BracketView.load({});
            }
            
            if (window.AllProTeam && typeof window.AllProTeam.load === 'function') {
                window.AllProTeam.load({});
            }
        });
}

// Toggle loading state
function toggleLoading(isLoading) {
    const loadingContainer = document.getElementById('loadingContainer');
    const seasonContent = document.getElementById('seasonContent');
    
    if (loadingContainer && seasonContent) {
        if (isLoading) {
            loadingContainer.style.display = 'flex';
            seasonContent.style.display = 'none';
        } else {
            loadingContainer.style.display = 'none';
            seasonContent.style.display = 'block';
        }
    }
}

// Display error message
function displayErrorMessage(message) {
    toggleLoading(false);
    
    // Show error message
    const container = document.getElementById('seasonContent');
    if (container) {
        container.style.display = 'block';
        container.innerHTML = `
            <div class="error-message">
                <h2>Error Loading Data</h2>
                <p>${message}</p>
                <p>Please check if your data files exist in the data/season/${currentSeason} folder or try refreshing the page.</p>
            </div>
        `;
    }
}

// Initialize tab navigation
function initTabNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const contentSections = document.querySelectorAll('.content-section');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Get the section to show
            const sectionId = tab.getAttribute('data-section');
            
            // Remove active class from all tabs and hide all sections
            navTabs.forEach(t => t.classList.remove('active'));
            contentSections.forEach(section => {
                section.style.display = 'none';
            });
            
            // Add active class to clicked tab and show corresponding section
            tab.classList.add('active');
            document.getElementById(sectionId).style.display = 'block';
            
            // Update URL with the active tab
            setUrlParameter('tab', sectionId);
            
            // Initialize the specific tab content if needed
            if (sectionId === 'nfl-teams' && window.NFLTeams) {
                window.NFLTeams.load(null, currentSeason);
            } else if (sectionId === 'all-pro-team' && window.AllProTeam) {
                window.AllProTeam.load(null, currentSeason);
            } else if (sectionId === 'accolades' && window.Accolades) {
                window.Accolades.load(null, currentSeason);
            }
        });
    });
    
    // Set initial active tab from URL or default to first tab
    const urlTab = getUrlParameter('tab');
    if (urlTab) {
        const tab = document.querySelector(`.nav-tab[data-section="${urlTab}"]`);
        if (tab) {
            tab.click();
        } else {
            // Default to first tab if invalid tab in URL
            navTabs[0].click();
        }
    } else {
        // Default to first tab
        navTabs[0].click();
    }
}

// Function to handle season change
function handleSeasonChange(season) {
    currentSeason = season;
    
    // Update content for active tab
    const activeTab = document.querySelector('.nav-tab.active');
    if (activeTab) {
        const sectionId = activeTab.getAttribute('data-section');
        
        // Initialize specific tab content if needed
        if (sectionId === 'notable-games' && window.NotableGames) {
            window.NotableGames.updateSeason(season);
        } else if (sectionId === 'nfl-teams' && window.NFLTeams) {
            window.NFLTeams.load(null, currentSeason);
        } else if (sectionId === 'all-pro-team' && window.AllProTeam) {
            window.AllProTeam.load(null, currentSeason);
        } else if (sectionId === 'accolades' && window.Accolades) {
            window.Accolades.load(null, currentSeason);
        } else if (sectionId === 'bracket' && window.BracketView) {
            // Make sure to update bracket view when on bracket tab
            window.BracketView.load();
        }
    }
    
    // Load season data
    loadSeasonData(season);
}

// Initialize dropdown
function initSeasonDropdown() {
    const seasonSelect = document.getElementById('seasonSelect');
    if (!seasonSelect) return;
    
    seasonSelect.addEventListener('change', function() {
        const selectedSeason = this.value;
        
        // Update URL with the selected season
        setUrlParameter('season', selectedSeason);
        
        // Store the current season globally
        window.currentSeason = selectedSeason;
        
        // Handle season change
        handleSeasonChange(selectedSeason);
    });
}

// Get URL parameter
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Set URL parameter
function setUrlParameter(name, value) {
    const url = new URL(window.location.href);
    if (value) {
        url.searchParams.set(name, value);
    } else {
        url.searchParams.delete(name);
    }
    window.history.replaceState({}, '', url);
}

// Export utility functions to be used by other modules
window.SeasonUtils = {
    formatNumber: function(num, decimals = 2) { // Changed default from 0 to 2
        if (isNaN(num)) return '0.00';
        return parseFloat(num).toFixed(decimals);
    },
    getTeamLogoAbbr: function(team) {
        // Convert to lowercase and remove spaces
        return team ? team.replace(/\s+/g, '-').toLowerCase() : 'default';
    }
};
