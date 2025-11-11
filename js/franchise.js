/**
 * Franchise page main JavaScript file
 * Controls the franchise page functionality and coordinates the different modules
 */

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize session handler to prevent timeouts
    if (typeof Utils !== 'undefined' && Utils.sessionHandler) {
        Utils.sessionHandler();
    }
    
    // Initialize the franchise page
    FranchisePage.init();
});

// Main Franchise Page Module
const FranchisePage = (function() {
    // Private variables
    let _currentTeam = null;
    let _currentSeason = 'All Time';
    let _allTeams = [];
    
    // Initialize the page
    function init() {
        console.log('Initializing franchise page...');
        
        // Show loading state
        showLoading(true);
        
        // Get team from URL or use default
        _currentTeam = decodeURIComponent(getUrlParameter('team') || '');
        console.log('Initial team from URL:', _currentTeam);
        
        // Get season from URL or use default
        const urlSeason = getUrlParameter('season');
        if (urlSeason) {
            _currentSeason = urlSeason;
        }
        console.log('Initial season from URL:', _currentSeason);
        
        // Initialize data services
        console.log('Loading required data...');
        
        // First check if DataService is available
        if (typeof DataService === 'undefined') {
            console.error('DataService is not defined! Check script loading order.');
            showError('Critical error: DataService module is missing');
            return;
        }
        
        Promise.all([
            DataService.init().catch(e => {
                console.error('Error initializing DataService:', e);
                throw new Error('Failed to initialize data service: ' + e.message);
            }),
            FranchiseData.loadTeamAbbreviations().catch(e => {
                console.error('Error loading team abbreviations:', e);
                throw new Error('Failed to load team abbreviations: ' + e.message);
            }),
            FranchiseData.loadAccolades().catch(e => {
                console.error('Error loading accolades:', e);
                throw new Error('Failed to load accolades: ' + e.message);
            }),
            FranchiseData.loadFinalPlacements().catch(e => {
                console.error('Error loading final placements:', e);
                throw new Error('Failed to load final placements: ' + e.message);
            })
        ])
        .then(() => {
            console.log('All data loaded successfully');
            
            // Hide loading state
            showLoading(false);
            
            // Get all teams
            _allTeams = DataService.getAllTeams();
            console.log('Available teams:', _allTeams);
            
            // If no team provided or invalid team, use first team
            if (!_currentTeam || !_allTeams.includes(_currentTeam)) {
                _currentTeam = _allTeams[0] || '';
                console.log('Selected default team:', _currentTeam);
            }
            
            // Initialize UI components
            initDropdowns();
            initTabs();
            
            // Load team data
            console.log('Loading statistics for team:', _currentTeam, 'season:', _currentSeason);
            FranchiseData.loadTeamStatistics(_currentTeam, _currentSeason);
            
            // Initialize sections
            FranchiseOverview.init(_currentTeam, _currentSeason);
            FranchiseGameLog.init(_currentTeam, _currentSeason);
            FranchiseRoster.init(_currentTeam, _currentSeason);
            
            // Display the container
            document.getElementById('franchiseContent').style.display = 'block';
        })
        .catch(error => {
            console.error('Error initializing franchise page:', error);
            showError(`Failed to load franchise data: ${error.message}`);
        });
    }
    
    // Initialize dropdowns
    function initDropdowns() {
        const teamSelect = document.getElementById('franchiseTitle');
        const seasonSelect = document.getElementById('seasonSelect');
        
        // Populate team dropdown
        if (teamSelect) {
            populateTeamDropdown(teamSelect);
            teamSelect.value = _currentTeam;
            
            // Add event listener
            teamSelect.addEventListener('change', () => {
                _currentTeam = teamSelect.value;
                
                // Update URL
                setUrlParameter('team', _currentTeam);
                
                // Reload team data
                FranchiseData.loadTeamStatistics(_currentTeam, _currentSeason);
                
                // Update sections
                FranchiseOverview.update(_currentTeam, _currentSeason);
                FranchiseGameLog.update(_currentTeam, _currentSeason);
                FranchiseRoster.update(_currentTeam, _currentSeason);
            });
        }
        
        // Populate season dropdown
        if (seasonSelect) {
            populateSeasonDropdown(seasonSelect);
            seasonSelect.value = _currentSeason;
            
            // Add event listener
            seasonSelect.addEventListener('change', () => {
                _currentSeason = seasonSelect.value;
                
                // Update URL
                setUrlParameter('season', _currentSeason === 'All Time' ? null : _currentSeason);
                
                // Reload team data
                FranchiseData.loadTeamStatistics(_currentTeam, _currentSeason);
                
                // Update sections
                FranchiseOverview.update(_currentTeam, _currentSeason);
                FranchiseGameLog.update(_currentTeam, _currentSeason);
                FranchiseRoster.update(_currentTeam, _currentSeason);
            });
        }
    }
    
    // Initialize tabs
    function initTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanels = document.querySelectorAll('.tab-panel');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                tabButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to current button
                button.classList.add('active');
                
                // Hide all tab panels
                tabPanels.forEach(panel => panel.classList.remove('active'));
                
                // Show the selected tab panel
                const tabId = button.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });
    }
    
    // Populate team dropdown
    function populateTeamDropdown(select) {
        // Clear existing options
        select.innerHTML = '';
        
        // Add option for each team
        _allTeams.forEach(team => {
            const option = document.createElement('option');
            option.value = team;
            option.textContent = team;
            select.appendChild(option);
        });
    }
    
    // Populate season dropdown
    function populateSeasonDropdown(select) {
        // Clear existing options
        select.innerHTML = '';
        
        // Only add seasons we know have data
        const availableSeasons = ['2019', '2020', '2021', '2022', '2023', '2024'];
        
        // Add each season
        availableSeasons.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            select.appendChild(option);
        });
        
        // Add All Time option
        const allTimeOption = document.createElement('option');
        allTimeOption.value = 'All Time';
        allTimeOption.textContent = 'All Time';
        select.appendChild(allTimeOption);
    }
    
    // Show or hide loading state
    function showLoading(show) {
        const loadingContainer = document.getElementById('loadingContainer');
        const franchiseContent = document.getElementById('franchiseContent');
        
        if (loadingContainer) {
            loadingContainer.style.display = show ? 'flex' : 'none';
        }
        
        if (franchiseContent) {
            franchiseContent.style.display = show ? 'none' : 'block';
        }
    }
    
    // Show error message
    function showError(message) {
        showLoading(false);
        
        const franchiseContainer = document.querySelector('.franchise-container');
        if (franchiseContainer) {
            franchiseContainer.innerHTML = `
                <div class="error-message">
                    <h2>Error Loading Data</h2>
                    <p>${message}</p>
                    <p>Please try refreshing the page or contact the administrator.</p>
                </div>
            `;
        }
    }
    
    // Get URL parameter
    function getUrlParameter(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }
    
    // Set URL parameter
    function setUrlParameter(name, value) {
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);
        
        if (value === null || value === '') {
            params.delete(name);
        } else {
            params.set(name, value);
        }
        
        url.search = params.toString();
        window.history.pushState({}, '', url.toString());
    }
    
    // Public API
    return {
        init: init
    };
})();
