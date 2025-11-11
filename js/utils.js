/**
 * RChos Fantasy Football League - Utility Functions
 * 
 * A collection of helper functions for formatting, UI manipulation,
 * and common calculations used across the website.
 */

const Utils = (function() {
    // Private variables and functions
    const _monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Public API
    return {
        /**
         * Format a number with commas
         * @param {number} number - The number to format
         * @param {number} decimals - Number of decimal places (default: 0)
         * @returns {string} Formatted number
         */
        formatNumber: function(number, decimals = 0) {
            if (isNaN(number)) return '0';
            
            const fixed = parseFloat(number).toFixed(decimals);
            return fixed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        /**
         * Format a number as a percentage
         * @param {number} number - The number to format (0-1)
         * @param {number} decimals - Number of decimal places (default: 1)
         * @returns {string} Formatted percentage
         */
        formatPercent: function(number, decimals = 1) {
            if (isNaN(number)) return '0%';
            return (number * 100).toFixed(decimals) + '%';
        },
        
        /**
         * Format score with consistent decimal places
         * @param {number} score - The score to format
         * @returns {string} Formatted score
         */
        formatScore: function(score) {
            if (isNaN(score)) return '0.00';
            return parseFloat(score).toFixed(2);
        },
        
        /**
         * Format a date string
         * @param {string|Date} date - Date to format
         * @param {boolean} includeYear - Whether to include the year
         * @returns {string} Formatted date
         */
        formatDate: function(date, includeYear = true) {
            if (!date) return '';
            
            const d = typeof date === 'string' ? new Date(date) : date;
            
            if (isNaN(d.getTime())) return '';
            
            const month = _monthNames[d.getMonth()];
            const day = d.getDate();
            const year = d.getFullYear();
            
            return includeYear ? 
                `${month} ${day}, ${year}` : 
                `${month} ${day}`;
        },
        
        /**
         * Get color for win/loss records
         * @param {number} wins - Number of wins
         * @param {number} losses - Number of losses
         * @returns {string} CSS color code
         */
        getRecordColor: function(wins, losses) {
            if (wins === 0 && losses === 0) return '#6b7280'; // Gray for no games
            
            const winPct = wins / (wins + losses);
            
            if (winPct >= 0.7) return '#10b981'; // Green for good records
            if (winPct >= 0.5) return '#3b82f6'; // Blue for winning records
            if (winPct >= 0.3) return '#f59e0b'; // Yellow/orange for below .500
            return '#ef4444'; // Red for poor records
        },
        
        /**
         * Format a win-loss record
         * @param {number} wins - Number of wins
         * @param {number} losses - Number of losses
         * @returns {string} Formatted record (e.g., "10-5")
         */
        formatRecord: function(wins, losses) {
            return `${wins}-${losses}`;
        },
        
        /**
         * Calculate win percentage
         * @param {number} wins - Number of wins
         * @param {number} games - Total games
         * @returns {number} Win percentage (0-1)
         */
        calculateWinPct: function(wins, games) {
            if (games === 0) return 0;
            return wins / games;
        },
        
        /**
         * Initialize tab navigation
         * @param {Element} container - Container with tabs and tab content
         */
        initTabNavigation: function(container) {
            if (!container) return;
            
            const tabs = container.querySelectorAll('.tab');
            
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // Remove active class from all tabs
                    tabs.forEach(t => t.classList.remove('active'));
                    
                    // Add active class to clicked tab
                    tab.classList.add('active');
                    
                    // Hide all tab content
                    const tabContents = container.querySelectorAll('.tab-content');
                    tabContents.forEach(content => content.classList.remove('active'));
                    
                    // Show content for clicked tab
                    const tabId = tab.getAttribute('data-tab');
                    const tabContent = container.querySelector(`#${tabId}`);
                    if (tabContent) {
                        tabContent.classList.add('active');
                    }
                });
            });
        },
        
        /**
         * Sort table by column
         * @param {Element} table - Table element
         * @param {number} columnIndex - Index of column to sort by
         * @param {boolean} isNumeric - Whether column contains numeric data
         */
        sortTable: function(table, columnIndex, isNumeric = false) {
            const tbody = table.querySelector('tbody');
            if (!tbody) return;
            
            const rows = Array.from(tbody.querySelectorAll('tr'));
            
            // Get current sort direction
            const currentDir = tbody.getAttribute('data-sort-dir') || 'asc';
            const newDir = currentDir === 'asc' ? 'desc' : 'asc';
            
            // Update sort direction
            tbody.setAttribute('data-sort-dir', newDir);
            tbody.setAttribute('data-sort-col', columnIndex);
            
            // Sort rows
            rows.sort((a, b) => {
                const aCell = a.querySelectorAll('td')[columnIndex];
                const bCell = b.querySelectorAll('td')[columnIndex];
                
                if (!aCell || !bCell) return 0;
                
                let aValue = aCell.textContent.trim();
                let bValue = bCell.textContent.trim();
                
                if (isNumeric) {
                    // Parse numeric values
                    aValue = parseFloat(aValue.replace(/[^0-9.-]+/g, ''));
                    bValue = parseFloat(bValue.replace(/[^0-9.-]+/g, ''));
                    
                    // Handle NaN
                    if (isNaN(aValue)) aValue = 0;
                    if (isNaN(bValue)) bValue = 0;
                    
                    return newDir === 'asc' ? aValue - bValue : bValue - aValue;
                } else {
                    return newDir === 'asc' ? 
                        aValue.localeCompare(bValue) : 
                        bValue.localeCompare(aValue);
                }
            });
            
            // Update table
            rows.forEach(row => tbody.appendChild(row));
            
            // Update sort indicators
            const headers = table.querySelectorAll('th');
            headers.forEach((header, index) => {
                header.classList.remove('sort-asc', 'sort-desc');
                if (index === columnIndex) {
                    header.classList.add(newDir === 'asc' ? 'sort-asc' : 'sort-desc');
                }
            });
        },
        
        /**
         * Add sortable behavior to table headers
         * @param {Element} table - Table element
         */
        makeSortable: function(table) {
            if (!table) return;
            
            const headers = table.querySelectorAll('th');
            
            headers.forEach((header, index) => {
                // Skip non-sortable columns
                if (header.classList.contains('no-sort')) return;
                
                // Add sort class and click handler
                header.classList.add('sortable');
                
                header.addEventListener('click', () => {
                    const isNumeric = header.classList.contains('numeric');
                    this.sortTable(table, index, isNumeric);
                });
            });
        },
        
        /**
         * Show/hide loading indicator
         * @param {boolean} show - Whether to show or hide loading
         * @param {string} containerId - ID of container (optional)
         */
        toggleLoading: function(show, containerId = null) {
            const container = containerId ? 
                document.getElementById(containerId) : 
                document.querySelector('.loading-container');
            
            if (container) {
                container.style.display = show ? 'flex' : 'none';
            }
        },
        
        /**
         * Show error message
         * @param {string} message - Error message to display
         * @param {string} containerId - ID of container (optional)
         */
        showError: function(message, containerId = null) {
            console.error(message);
            
            // Find error container
            const errorContainer = containerId ? 
                document.getElementById(containerId) : 
                document.querySelector('.error-container');
                
            if (errorContainer) {
                errorContainer.textContent = message;
                errorContainer.style.display = 'block';
                return;
            }
            
            // Create error element if none exists
            const mainContent = document.querySelector('main');
            if (mainContent) {
                const errorElement = document.createElement('div');
                errorElement.className = 'error-container';
                errorElement.textContent = message;
                mainContent.prepend(errorElement);
            }
        },
        
        /**
         * Create a chart color scheme
         * @param {number} count - Number of colors needed
         * @returns {Array} Array of colors
         */
        getChartColors: function(count) {
            const baseColors = [
                '#3b82f6', // Blue
                '#10b981', // Green
                '#f59e0b', // Yellow
                '#ef4444', // Red
                '#8b5cf6', // Purple
                '#ec4899', // Pink
                '#14b8a6', // Teal
                '#f97316', // Orange
                '#6366f1', // Indigo
                '#a855f7', // Violet
                '#06b6d4', // Cyan
                '#84cc16'  // Lime
            ];
            
            // If we have enough base colors, use them
            if (count <= baseColors.length) {
                return baseColors.slice(0, count);
            }
            
            // Otherwise, generate additional colors
            const colors = [...baseColors];
            
            // Add lighter and darker variants of base colors
            while (colors.length < count) {
                const baseIndex = (colors.length - baseColors.length) % baseColors.length;
                const baseColor = baseColors[baseIndex];
                
                // Add a variant
                if (colors.length % 2 === 0) {
                    // Add lighter variant
                    colors.push(this.lightenColor(baseColor, 20));
                } else {
                    // Add darker variant
                    colors.push(this.darkenColor(baseColor, 20));
                }
            }
            
            return colors;
        },
        
        /**
         * Lighten a color
         * @param {string} color - Hex color code
         * @param {number} percent - Percent to lighten (0-100)
         * @returns {string} Lightened color
         */
        lightenColor: function(color, percent) {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = (num >> 16) + amt;
            const G = (num >> 8 & 0x00FF) + amt;
            const B = (num & 0x0000FF) + amt;
            
            return '#' + (
                0x1000000 + 
                (R < 255 ? R : 255) * 0x10000 + 
                (G < 255 ? G : 255) * 0x100 + 
                (B < 255 ? B : 255)
            ).toString(16).slice(1);
        },
        
        /**
         * Darken a color
         * @param {string} color - Hex color code
         * @param {number} percent - Percent to darken (0-100)
         * @returns {string} Darkened color
         */
        darkenColor: function(color, percent) {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = (num >> 16) - amt;
            const G = (num >> 8 & 0x00FF) - amt;
            const B = (num & 0x0000FF) - amt;
            
            return '#' + (
                0x1000000 + 
                (R > 0 ? R : 0) * 0x10000 + 
                (G > 0 ? G : 0) * 0x100 + 
                (B > 0 ? B : 0)
            ).toString(16).slice(1);
        },
        
        /**
         * Add combobox functionality to select elements
         * @param {Element} select - Select element to enhance
         */
        enhanceSelect: function(select) {
            if (!select || select.enhanced) return;
            
            // Mark as enhanced
            select.enhanced = true;
            
            // Create wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'enhanced-select-wrapper';
            select.parentNode.insertBefore(wrapper, select);
            wrapper.appendChild(select);
            
            // Create display element
            const display = document.createElement('div');
            display.className = 'enhanced-select-display';
            display.textContent = select.options[select.selectedIndex]?.textContent || 'Select...';
            wrapper.insertBefore(display, select);
            
            // Update display when select changes
            select.addEventListener('change', () => {
                display.textContent = select.options[select.selectedIndex]?.textContent || 'Select...';
            });
            
            // Toggle select on display click
            display.addEventListener('click', () => {
                wrapper.classList.toggle('active');
            });
            
            // Close select when clicking outside
            document.addEventListener('click', (event) => {
                if (!wrapper.contains(event.target)) {
                    wrapper.classList.remove('active');
                }
            });
        },
        
        /**
         * Debounce a function to limit how often it can run
         * @param {Function} func - Function to debounce
         * @param {number} wait - Milliseconds to wait
         * @returns {Function} Debounced function
         */
        debounce: function(func, wait = 300) {
            let timeout;
            
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        /**
         * Get URL parameter value
         * @param {string} name - Parameter name
         * @returns {string|null} Parameter value or null if not found
         */
        getUrlParameter: function(name) {
            const params = new URLSearchParams(window.location.search);
            return params.get(name);
        },
        
        /**
         * Set URL parameter
         * @param {string} name - Parameter name
         * @param {string} value - Parameter value
         * @param {boolean} reload - Whether to reload the page
         */
        setUrlParameter: function(name, value, reload = false) {
            const url = new URL(window.location.href);
            const params = new URLSearchParams(url.search);
            
            if (value === null || value === '') {
                params.delete(name);
            } else {
                params.set(name, value);
            }
            
            url.search = params.toString();
            
            if (reload) {
                window.location.href = url.toString();
            } else {
                window.history.pushState({}, '', url.toString());
            }
        },
        
        /**
         * Create a tooltip
         * @param {Element} element - Element to attach tooltip to
         * @param {string} content - Tooltip content
         * @param {string} position - Tooltip position (top, right, bottom, left)
         */
        createTooltip: function(element, content, position = 'top') {
            if (!element) return;
            
            // Add tooltip data
            element.setAttribute('data-tooltip', content);
            element.setAttribute('data-tooltip-position', position);
            element.classList.add('has-tooltip');
            
            // Add event listeners
            element.addEventListener('mouseenter', () => {
                const tooltip = document.createElement('div');
                tooltip.className = `tooltip tooltip-${position}`;
                tooltip.textContent = content;
                
                // Add to document
                document.body.appendChild(tooltip);
                
                // Position tooltip
                const rect = element.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                
                switch (position) {
                    case 'top':
                        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + scrollLeft}px`;
                        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5 + scrollTop}px`;
                        break;
                    case 'right':
                        tooltip.style.left = `${rect.right + 5 + scrollLeft}px`;
                        tooltip.style.top = `${rect.top + rect.height / 2 - tooltip.offsetHeight / 2 + scrollTop}px`;
                        break;
                    case 'bottom':
                        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + scrollLeft}px`;
                        tooltip.style.top = `${rect.bottom + 5 + scrollTop}px`;
                        break;
                    case 'left':
                        tooltip.style.left = `${rect.left - tooltip.offsetWidth - 5 + scrollLeft}px`;
                        tooltip.style.top = `${rect.top + rect.height / 2 - tooltip.offsetHeight / 2 + scrollTop}px`;
                        break;
                }
                
                // Save tooltip reference
                element.tooltip = tooltip;
            });
            
            element.addEventListener('mouseleave', () => {
                if (element.tooltip) {
                    element.tooltip.remove();
                    element.tooltip = null;
                }
            });
        },
        
        /**
         * Initialize all tooltips on the page
         */
        initTooltips: function() {
            document.querySelectorAll('[data-tooltip]').forEach(element => {
                const content = element.getAttribute('data-tooltip');
                const position = element.getAttribute('data-tooltip-position') || 'top';
                
                this.createTooltip(element, content, position);
            });
        },

        /**
         * Get weeks for a specific season
         * @param {string} season - Season name
         * @returns {Array} Array of week numbers
         */
        getWeeksForSeason: function(season) {
            if (!season || season === 'All Time') {
                return [];
            }
            
            const seasonData = DataService.getSeason(season);
            if (!seasonData || !seasonData.weeks) {
                return [];
            }
            
            // Extract unique week numbers and sort them
            const weekSet = new Set();
            seasonData.weeks.forEach(week => {
                weekSet.add(week.week);
            });
            
            return Array.from(weekSet).sort((a, b) => parseInt(a) - parseInt(b));
        },

        /**
         * Session and navigation error handler
         * Prevents 404 errors when pages time out
         */
        sessionHandler: function() {
            // Track last activity time
            let lastActivity = Date.now();
            const SESSION_TIMEOUT = 20 * 60 * 1000; // 20 minutes
            
            // Update activity timestamp on user interaction
            const resetActivityTimer = () => {
                lastActivity = Date.now();
                localStorage.setItem('lastActivityTime', lastActivity);
            };
            
            // Check for session timeout periodically
            const checkSession = () => {
                const currentTime = Date.now();
                const storedTime = parseInt(localStorage.getItem('lastActivityTime') || lastActivity);
                const elapsedTime = currentTime - storedTime;
                
                // If close to timeout, ping the server to keep session alive
                if (elapsedTime > SESSION_TIMEOUT - (60 * 1000)) { // 1 minute before timeout
                    console.log('Session refresh: Pinging server to keep session alive');
                    
                    // Simple fetch to any API endpoint to refresh session
                    fetch('../Data/team_abbreviations.json?keepAlive=true', { 
                        method: 'HEAD',
                        cache: 'no-store'
                    }).catch(err => console.log('Session refresh ping failed', err));
                    
                    resetActivityTimer();
                }
                
                // If session has timed out, reload the page to reset
                if (elapsedTime > SESSION_TIMEOUT) {
                    console.log('Session timeout detected, reloading page');
                    window.location.reload();
                }
            };
            
            // Add global error handler for navigation/fetch errors
            window.addEventListener('error', function(event) {
                // Check if this is a script or resource loading error (potential 404)
                if (event.target && (event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK')) {
                    console.error('Resource loading error detected', event);
                    
                    // If on a subpage and a resource fails to load, we may be having session issues
                    if (window.location.pathname.includes('/pages/') && !sessionStorage.getItem('errorRedirectPrevented')) {
                        // Set flag to prevent redirect loops
                        sessionStorage.setItem('errorRedirectPrevented', 'true');
                        
                        // Show alert and redirect to index
                        alert('The page encountered an error loading resources. Returning to home page.');
                        window.location.href = '../index.html';
                    }
                }
            }, true);
            
            // Monitor AJAX/fetch for 404/500 errors
            const originalFetch = window.fetch;
            window.fetch = function() {
                return originalFetch.apply(this, arguments)
                    .then(response => {
                        if (!response.ok && (response.status === 404 || response.status === 500)) {
                            console.error(`Navigation error: ${response.status} on ${response.url}`);
                            
                            if (window.location.pathname.includes('/pages/') && !sessionStorage.getItem('errorRedirectPrevented')) {
                                sessionStorage.setItem('errorRedirectPrevented', 'true');
                                alert(`The application encountered a ${response.status} error. Returning to home page.`);
                                window.location.href = '../index.html';
                            }
                        }
                        return response;
                    });
            };
            
            // Add event listeners for user activity
            ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
                document.addEventListener(event, resetActivityTimer, { passive: true });
            });
            
            // Initialize
            resetActivityTimer();
            setInterval(checkSession, 60000); // Check every minute
            
            // Clear error redirect prevention flag when successfully loaded
            window.addEventListener('load', function() {
                sessionStorage.removeItem('errorRedirectPrevented');
            });
        }
    };
})();

// Export the Utils module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
