// Accolades functionality for Season page

const Accolades = {
    // Initialize the accolades section
    init() {
        console.log('Initializing Accolades section...');
    },

    // Load accolades data for a specific season
    async load(container = null, season = null) {
        console.log(`Loading accolades for season: ${season || 'current'}`);
        
        const targetContainer = container || document.getElementById('accolades');
        if (!targetContainer) {
            console.error('Accolades container not found');
            return;
        }

        // Show loading state
        this.showLoading(targetContainer);

        try {
            // Load both accolades and placements data
            const [accoladesData, placementsData] = await Promise.all([
                this.fetchAccoladesData(),
                this.fetchPlacementsData()
            ]);

            // Find data for the specified season
            const seasonYear = season ? parseInt(season) : new Date().getFullYear();
            const seasonAccolades = accoladesData.awards.find(year => year.year === seasonYear);
            const seasonPlacements = placementsData.seasonPlacements.find(year => year.year === seasonYear);

            // Render the accolades section
            this.render(targetContainer, seasonAccolades, seasonPlacements, seasonYear);

        } catch (error) {
            console.error('Error loading accolades data:', error);
            this.showError(targetContainer, 'Failed to load accolades data');
        }
    },

    // Fetch accolades data from JSON file
    async fetchAccoladesData() {
        const response = await fetch('../data/accolades.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    },

    // Fetch placements data from JSON file
    async fetchPlacementsData() {
        const response = await fetch('../data/final_placements.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    },

    // Render the accolades section
    async render(container, accolades, placements, year) {
        // Get all accolades data to count occurrences
        const allAccoladesData = await this.fetchAccoladesData();
        
        let html = `
            <div class="accolades-container">
                <div class="accolades-grid">
                    <div class="accolades-section">
                        <h3 class="section-title">Season Awards ${year}</h3>
                        <div class="awards-list">
        `;

        if (accolades && accolades.results && accolades.results.length > 0) {
            accolades.results.forEach(award => {
                const isChampionship = award.award.includes('1st Place') || 
                                     award.award.includes('Champion') && award.award.includes('Points');
                
                // Count how many times this winner has won this specific award up to this year
                const count = this.countAccoladeWinsUpToYear(allAccoladesData, award.winner, award.award, year);
                
                html += `
                    <div class="award-item ${isChampionship ? 'championship' : ''}">
                        <span class="award-name">${award.award}</span>
                        <div class="award-winner-container">
                            <span class="award-winner">${award.winner}</span>
                            <span class="award-count">${count}</span>
                        </div>
                    </div>
                `;
            });
        } else {
            html += '<div class="no-data-message">No awards data available for this season</div>';
        }

        html += `
                        </div>
                    </div>
                    
                    <div class="placements-section">
                        <h3 class="section-title">Final Placements ${year}</h3>
                        <div class="placements-list">
        `;

        if (placements && placements.placements && placements.placements.length > 0) {
            placements.placements.forEach(placement => {
                let placeClass = '';
                if (placement.place === 1) placeClass = 'first-place';
                else if (placement.place === 2) placeClass = 'second-place';
                else if (placement.place === 3) placeClass = 'third-place';

                // Add playoff/elimination position classes
                const positionClass = placement.place <= 8 ? 'playoff-position' : 'elimination-position';

                const suffix = this.getOrdinalSuffix(placement.place);
                
                html += `
                    <div class="placement-item ${placeClass} ${positionClass}">
                        <span class="placement-number">${placement.place}${suffix}</span>
                        <span class="placement-team">${placement.team}</span>
                    </div>
                `;
            });
        } else {
            html += '<div class="no-data-message">No placement data available for this season</div>';
        }

        html += `
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    // Show loading state
    showLoading(container) {
        container.innerHTML = `
            <div class="accolades-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading accolades data...</p>
            </div>
        `;
    },

    // Show error state
    showError(container, message) {
        container.innerHTML = `
            <div class="accolades-container">
                <div class="no-data-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                </div>
            </div>
        `;
    },

    // Count how many times a winner has won a specific award up to and including the specified year
    countAccoladeWinsUpToYear(allAccoladesData, winner, awardType, maxYear) {
        let count = 0;
        
        allAccoladesData.awards.forEach(yearData => {
            // Only count awards from this year and before
            if (yearData.year <= maxYear) {
                yearData.results.forEach(award => {
                    if (award.winner === winner && award.award === awardType) {
                        count++;
                    }
                });
            }
        });
        
        return count;
    },

    // Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
    getOrdinalSuffix(num) {
        const j = num % 10;
        const k = num % 100;
        
        if (j === 1 && k !== 11) {
            return 'st';
        }
        if (j === 2 && k !== 12) {
            return 'nd';
        }
        if (j === 3 && k !== 13) {
            return 'rd';
        }
        return 'th';
    }
};

// Make Accolades globally available
window.Accolades = Accolades;