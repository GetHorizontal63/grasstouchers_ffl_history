/**
 * Franchise Roster Module
 * Handles displaying the roster section with player analysis
 */

const FranchiseRoster = (function() {
    // Private variables
    let _currentTeam = null;
    let _currentSeason = null;
    let _playerStats = [];
    
    // Initialize the roster section
    function init(team, season) {
        _currentTeam = team;
        _currentSeason = season;
        
        // Initialize position filter
        initPositionFilter();
        
        // Load roster data
        loadRosterData(team, season);
    }
    
    // Update the roster section with new data
    function update(team, season) {
        _currentTeam = team;
        _currentSeason = season;
        
        // Load new roster data
        loadRosterData(team, season);
    }
    
    // Initialize position filter
    function initPositionFilter() {
        const positionFilter = document.getElementById('positionFilter');
        if (!positionFilter) return;
        
        positionFilter.addEventListener('change', () => {
            filterRosterTable(positionFilter.value);
        });
    }
    
    // Load roster data
    function loadRosterData(team, season) {
        const rosterContainer = document.getElementById('rosterContainer');
        if (!rosterContainer || !team) return;
        
        // Show loading indicator
        const playerRosterTable = document.getElementById('playerRosterTable');
        if (playerRosterTable && playerRosterTable.querySelector('tbody')) {
            playerRosterTable.querySelector('tbody').innerHTML = `
                <tr>
                    <td colspan="7" class="loading-cell">Loading roster data...</td>
                </tr>
            `;
        }
        
        // Determine which roster data to load
        if (season === 'All Time') {
            FranchiseData.loadAllTimeRosterData()
                .then(rosterData => {
                    processRosterData(rosterData, team);
                })
                .catch(error => {
                    console.error('Error loading all-time roster data:', error);
                    showRosterError('Failed to load roster data: ' + error.message);
                });
        } else {
            FranchiseData.loadSeasonRosterData(season)
                .then(rosterData => {
                    processRosterData(rosterData, team);
                })
                .catch(error => {
                    console.error(`Error loading roster data for season ${season}:`, error);
                    showRosterError('Failed to load roster data: ' + error.message);
                });
        }
    }
    
    // Process roster data and display
    function processRosterData(rosterData, team) {
        // Process roster data
        _playerStats = FranchiseData.processRosterData(rosterData, team);
        
        // Display player stats
        displayPlayerStats();
    }
    
    // Display player statistics
    function displayPlayerStats() {
        const playerRosterTable = document.getElementById('playerRosterTable');
        if (!playerRosterTable) return;
        
        const tbody = playerRosterTable.querySelector('tbody');
        if (!tbody) return;
        
        // Clear table
        tbody.innerHTML = '';
        
        // Check if we have player stats
        if (!_playerStats || _playerStats.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="loading-cell">No roster data available for this team in the selected season.</td>
                </tr>
            `;
            return;
        }
        
        // Update table header
        const thead = playerRosterTable.querySelector('thead');
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th data-sort="name">Player</th>
                    <th data-sort="position">Position</th>
                    <th data-sort="totalProjectedPoints">Projected Points</th>
                    <th data-sort="totalActualPoints">Actual Points</th>
                    <th data-sort="fpPlus">FP+</th>
                    <th data-sort="weeksOnRoster">Weeks on Roster</th>
                    <th data-sort="weeksStarted">Weeks Started</th>
                </tr>
            `;
            
            // Add click handlers for sorting
            thead.querySelectorAll('th').forEach(th => {
                th.addEventListener('click', () => {
                    const sortColumn = th.getAttribute('data-sort');
                    if (sortColumn) {
                        sortRosterTable(sortColumn);
                    }
                });
            });
        }
        
        // Add player rows
        _playerStats.forEach(player => {
            const row = document.createElement('tr');
            row.dataset.position = player.position;
            
            // Create FP+ column with color coding
            const fpPlus = parseFloat(player.fpPlus);
            let fpPlusColor = '#6b7280'; // Default gray
            
            if (fpPlus >= 120) fpPlusColor = '#10b981'; // Great (green)
            else if (fpPlus >= 100) fpPlusColor = '#3b82f6'; // Good (blue)
            else if (fpPlus >= 80) fpPlusColor = '#f59e0b'; // Average (yellow)
            else if (fpPlus > 0) fpPlusColor = '#ef4444'; // Poor (red)
            
            row.innerHTML = `
                <td>${player.name}</td>
                <td class="position-cell ${player.position}">${player.position}</td>
                <td>${player.totalProjectedPoints.toFixed(2)}</td>
                <td>${player.totalActualPoints.toFixed(2)}</td>
                <td style="color: ${fpPlusColor}; font-weight: bold;">${player.fpPlus}</td>
                <td>${player.weeksOnRoster}</td>
                <td>${player.weeksStarted}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Sort by actual points by default
        sortRosterTable('totalActualPoints');
        
        // Apply current position filter
        const positionFilter = document.getElementById('positionFilter');
        if (positionFilter) {
            filterRosterTable(positionFilter.value);
        }
    }
    
    // Sort roster table
    function sortRosterTable(column) {
        const table = document.getElementById('playerRosterTable');
        if (!table) return;
        
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        // Get current sort direction
        const sortDirection = tbody.dataset.sortColumn === column && 
                          tbody.dataset.sortDirection === 'desc' ? 'asc' : 'desc';
        tbody.dataset.sortDirection = sortDirection;
        tbody.dataset.sortColumn = column;
        
        // Update header indicators
        const headers = table.querySelectorAll('th');
        headers.forEach(header => {
            // Remove any existing sort indicator from all headers
            if (header.getAttribute('data-sort')) {
                header.textContent = header.textContent.replace(/ [▲▼]$/, '');
            }
            
            // Then add indicator only to the current sort column
            if (header.getAttribute('data-sort') === column) {
                const indicator = (sortDirection === 'asc' ? ' ▲' : ' ▼');
                header.textContent = header.textContent + indicator;
            }
        });
        
        // Sort rows
        rows.sort((a, b) => {
            let aValue = a.querySelector(`td:nth-child(${getColumnIndex(column)})`).textContent;
            let bValue = b.querySelector(`td:nth-child(${getColumnIndex(column)})`).textContent;
            
            // Convert to numbers for numerical columns
            if (column !== 'name' && column !== 'position') {
                aValue = parseFloat(aValue);
                bValue = parseFloat(bValue);
            }
            
            if (sortDirection === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
        
        // Re-append rows in sorted order
        rows.forEach(row => tbody.appendChild(row));
    }

    // Filter roster table by position
    function filterRosterTable(position) {
        const tableBody = document.getElementById('playerRosterTable').querySelector('tbody');
        if (!tableBody) return;
        
        const rows = tableBody.querySelectorAll('tr');
        
        rows.forEach(row => {
            if (position === 'all' || row.dataset.position === position) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
    
    // Helper function to get column index based on column name
    function getColumnIndex(column) {
        const columns = [
            'name',
            'position',
            'totalProjectedPoints',
            'totalActualPoints',
            'fpPlus',
            'weeksOnRoster',
            'weeksStarted'
        ];
        
        return columns.indexOf(column) + 1;
    }
    
    // Show error message in roster container
    function showRosterError(message) {
        const playerRosterTable = document.getElementById('playerRosterTable');
        if (playerRosterTable && playerRosterTable.querySelector('tbody')) {
            playerRosterTable.querySelector('tbody').innerHTML = `
                <tr>
                    <td colspan="7" class="loading-cell error-message">${message}</td>
                </tr>
            `;
        }
    }
    
    // Public API
    return {
        init: init,
        update: update
    };
})();
