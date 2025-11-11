/**
 * Franchise Game Log Module
 * Handles displaying the game log section with team's game history
 */

const FranchiseGameLog = (function() {
    // Private variables
    let _currentTeam = null;
    let _currentSeason = null;
    
    // Initialize the game log section
    function init(team, season) {
        _currentTeam = team;
        _currentSeason = season;
        
        update(team, season);
    }
    
    // Update the game log section with new data
    function update(team, season) {
        _currentTeam = team;
        _currentSeason = season;
        
        displayGameLog();
    }
    
    // Display game log
    function displayGameLog() {
        const gameLogContainer = document.getElementById('gameLogContainer');
        if (!gameLogContainer) return;
        
        // Clear container
        gameLogContainer.innerHTML = '';
        
        // Get team stats (which includes game log)
        const teamStats = FranchiseData.getTeamStats();
        if (!teamStats || !teamStats.gameLog || teamStats.gameLog.length === 0) {
            gameLogContainer.innerHTML = '<p class="no-data">No game data available for this team.</p>';
            return;
        }
        
        // Create table
        const table = document.createElement('table');
        table.className = 'game-log-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Season</th>
                    <th>Week</th>
                    <th>Opponent</th>
                    <th>Result</th>
                    <th>Score</th>
                    <th>Season Period</th>
                    <th>Point Differential</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        // Get sorted game log (most recent first)
        const sortedGameLog = [...teamStats.gameLog].sort((a, b) => {
            if (a.season !== b.season) {
                return parseInt(b.season) - parseInt(a.season);
            }
            return parseInt(b.week) - parseInt(a.week);
        });
        
        // Add rows
        const tbody = table.querySelector('tbody');
        sortedGameLog.forEach(game => {
            const row = document.createElement('tr');
            
            // Determine result color
            const resultColor = game.result === 'W' ? '#10b981' : '#ef4444';
            
            // Calculate point differential
            const pointDiff = game.teamScore - game.opponentScore;
            const pointDiffFormatted = pointDiff > 0 ? `+${pointDiff.toFixed(2)}` : pointDiff.toFixed(2);
            const pointDiffColor = pointDiff > 0 ? '#10b981' : pointDiff < 0 ? '#ef4444' : '#6b7280';
            
            row.innerHTML = `
                <td>Season ${game.season}</td>
                <td>Week ${game.week}</td>
                <td><a href="?team=${encodeURIComponent(game.opponent)}">${game.opponent}</a></td>
                <td style="color: ${resultColor}; font-weight: bold;">${game.result}</td>
                <td>${formatScore(game.teamScore)} - ${formatScore(game.opponentScore)}</td>
                <td>${game.seasonPeriod || 'Regular'}</td>
                <td style="color: ${pointDiffColor}; font-weight: bold;">${pointDiffFormatted}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Add table to container
        gameLogContainer.appendChild(table);
        
        // Make table sortable
        makeTableSortable(table);
    }
    
    // Make table sortable
    function makeTableSortable(table) {
        if (!table) return;
        
        const headers = table.querySelectorAll('th');
        const tbody = table.querySelector('tbody');
        
        headers.forEach((header, index) => {
            // Add sort class and click handler
            header.classList.add('sortable');
            
            header.addEventListener('click', () => {
                // Get current sort direction
                const sortDirection = tbody.getAttribute('data-sort-dir') === 'asc' ? 'desc' : 'asc';
                tbody.setAttribute('data-sort-dir', sortDirection);
                tbody.setAttribute('data-sort-col', index);
                
                // Get all rows
                const rows = Array.from(tbody.querySelectorAll('tr'));
                
                // Sort rows
                rows.sort((a, b) => {
                    const aCell = a.cells[index];
                    const bCell = b.cells[index];
                    
                    let aValue = aCell.textContent.trim();
                    let bValue = bCell.textContent.trim();
                    
                    // Special handling for numeric columns
                    if (index === 1 || index === 3 || index === 6) { // Week, Score, Point Diff
                        // Extract numbers from the text
                        const aMatch = aValue.match(/[\d.-]+/);
                        const bMatch = bValue.match(/[\d.-]+/);
                        
                        if (aMatch && bMatch) {
                            aValue = parseFloat(aMatch[0]);
                            bValue = parseFloat(bMatch[0]);
                            
                            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
                        }
                    }
                    
                    // Default string comparison
                    return sortDirection === 'asc' ? 
                        aValue.localeCompare(bValue) : 
                        bValue.localeCompare(aValue);
                });
                
                // Update table
                rows.forEach(row => tbody.appendChild(row));
                
                // Update sort indicators
                headers.forEach(th => {
                    th.classList.remove('sort-asc', 'sort-desc');
                });
                
                header.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            });
        });
    }
    
    // Format score
    function formatScore(score) {
        return parseFloat(score).toFixed(2);
    }
    
    // Public API
    return {
        init: init,
        update: update
    };
})();
