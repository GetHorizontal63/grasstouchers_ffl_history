// Retro Terminal Admin Panel JavaScript
class RetroAdminPanel {
    constructor() {
        this.runningJobs = new Set();
        this.scheduledJobs = [];
        this.init();
        this.addRetroEffects();
    }

    init() {
        this.bindEvents();
        this.checkSystemStatus();
        this.loadScheduledJobs();
        this.loadLogs();
        this.startStatusPolling();
        this.showBootSequence();
    }

    addRetroEffects() {
        // Add typing effect to initial log
        const initialLog = document.querySelector('.log-entry .log-message');
        if (initialLog) {
            const originalText = initialLog.textContent;
            initialLog.textContent = '';
            this.typeText(initialLog, originalText, 50);
        }

        // Add random screen flicker
        setInterval(() => {
            if (Math.random() < 0.02) { // 2% chance every interval
                document.body.style.filter = 'brightness(1.1)';
                setTimeout(() => {
                    document.body.style.filter = 'brightness(1)';
                }, 50);
            }
        }, 1000);
    }

    typeText(element, text, speed = 50) {
        let i = 0;
        const timer = setInterval(() => {
            element.textContent += text[i];
            i++;
            if (i >= text.length) {
                clearInterval(timer);
            }
        }, speed);
    }

    showBootSequence() {
        const bootMessages = [
            'INITIALIZING FFLSITE ADMIN TERMINAL...',
            'LOADING PYTHON ENVIRONMENT...',
            'CHECKING SCRIPT DEPENDENCIES...',
            'ESTABLISHING DATABASE CONNECTIONS...',
            'MOUNTING DATA VOLUMES...',
            'SYSTEM READY FOR OPERATION'
        ];

        let delay = 0;
        bootMessages.forEach((message, index) => {
            setTimeout(() => {
                this.addLog('info', message, 'SYSTEM');
            }, delay);
            delay += 300;
        });
    }

    bindEvents() {
        // Script running
        document.querySelectorAll('.run-script').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scriptCard = e.target.closest('.script-card');
                const scriptName = scriptCard.dataset.script;
                this.runScript(scriptName);
            });
        });

        // Script scheduling
        document.querySelectorAll('.schedule-script').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scriptCard = e.target.closest('.script-card');
                const scriptName = scriptCard.dataset.script;
                this.openScheduleModal(scriptName);
            });
        });

        // Quick actions
        document.getElementById('runAllScripts').addEventListener('click', () => {
            this.runAllScripts();
        });

        document.getElementById('stopAllJobs').addEventListener('click', () => {
            this.stopAllJobs();
        });

        document.getElementById('clearLogs').addEventListener('click', () => {
            this.clearLogs();
        });

        document.getElementById('refreshLogs').addEventListener('click', () => {
            this.loadLogs();
        });

        // Modal events
        document.getElementById('addSchedule').addEventListener('click', () => {
            this.openScheduleModal();
        });

        document.getElementById('scheduleForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSchedule();
        });

        document.getElementById('cancelSchedule').addEventListener('click', () => {
            this.closeScheduleModal();
        });

        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeScheduleModal();
        });

        // Schedule type change
        document.getElementById('scheduleType').addEventListener('change', (e) => {
            this.handleScheduleTypeChange(e.target.value);
        });

        // Log filtering
        document.getElementById('logFilter').addEventListener('change', () => {
            this.filterLogs();
        });

        document.getElementById('logLevel').addEventListener('change', () => {
            this.filterLogs();
        });
    }

    async checkSystemStatus() {
        try {
            // Check server status
            const healthResponse = await fetch('/health');
            const serverStatus = document.getElementById('serverStatus');
            if (healthResponse.ok) {
                serverStatus.textContent = 'Online';
                serverStatus.className = 'status-online';
            } else {
                throw new Error('Server unhealthy');
            }

            // Check Python environment
            const pythonResponse = await fetch('/api/admin/python-status');
            const pythonStatus = document.getElementById('pythonStatus');
            if (pythonResponse.ok) {
                const data = await pythonResponse.json();
                pythonStatus.textContent = `Python ${data.version}`;
                pythonStatus.className = 'status-online';
            } else {
                throw new Error('Python check failed');
            }

        } catch (error) {
            console.error('Status check failed:', error);
            document.getElementById('serverStatus').textContent = 'Offline';
            document.getElementById('serverStatus').className = 'status-offline';
            document.getElementById('pythonStatus').textContent = 'Unknown';
            document.getElementById('pythonStatus').className = 'status-offline';
        }

        // Update running jobs count
        document.getElementById('runningJobs').textContent = this.runningJobs.size;
    }

    async runScript(scriptName, args = '') {
        if (this.runningJobs.has(scriptName)) {
            this.showNotification('SCRIPT ALREADY RUNNING', 'warning');
            return;
        }

        try {
            this.setScriptStatus(scriptName, 'running');
            this.runningJobs.add(scriptName);
            this.updateRunningJobsCount();

            this.addLog('info', `EXECUTING ${scriptName.toUpperCase()}...`, scriptName.toUpperCase());

            const response = await fetch('/api/admin/run-script', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    script: scriptName,
                    args: args
                })
            });

            const result = await response.json();

            if (result.success) {
                this.setScriptStatus(scriptName, 'idle');
                this.addLog('success', `${scriptName.toUpperCase()} EXECUTION COMPLETE`, scriptName.toUpperCase());
                this.showNotification(`${scriptName.toUpperCase()} COMPLETE`, 'success');
                this.updateLastRun(scriptName);
            } else {
                throw new Error(result.error || 'SCRIPT EXECUTION FAILED');
            }

        } catch (error) {
            this.setScriptStatus(scriptName, 'error');
            this.addLog('error', `${scriptName.toUpperCase()} FAILED: ${error.message}`, scriptName.toUpperCase());
            this.showNotification(`${scriptName.toUpperCase()} FAILED`, 'error');
        } finally {
            this.runningJobs.delete(scriptName);
            this.updateRunningJobsCount();
        }
    }

    async runAllScripts() {
        const scriptSequence = [
            'roster_scrape',
            'espn_game_stats',
            'build_player_data',
            'calculate_team_scores',
            'espn_nfl_players',
            'analyze_playoffs'
        ];

        this.addLog('info', 'INITIATING FULL SCRIPT SEQUENCE...', 'SYSTEM');
        
        for (const script of scriptSequence) {
            await this.runScript(script);
            // Add a small delay between scripts
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.addLog('success', 'FULL SCRIPT SEQUENCE COMPLETE', 'SYSTEM');
        this.showNotification('ALL SCRIPTS COMPLETE', 'success');
    }

    stopAllJobs() {
        fetch('/api/admin/stop-all-jobs', { method: 'POST' })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    this.runningJobs.clear();
                    this.updateRunningJobsCount();
                    
                    // Reset all script statuses
                    document.querySelectorAll('.script-card').forEach(card => {
                        this.setScriptStatus(card.dataset.script, 'idle');
                    });
                    
                    this.addLog('warning', 'ALL JOBS TERMINATED', 'SYSTEM');
                    this.showNotification('ALL JOBS KILLED', 'warning');
                }
            })
            .catch(error => {
                this.addLog('error', `FAILED TO TERMINATE JOBS: ${error.message}`, 'SYSTEM');
                this.showNotification('TERMINATION FAILED', 'error');
            });
    }

    clearLogs() {
        const logsContainer = document.getElementById('logsContainer');
        logsContainer.innerHTML = '<div class="log-entry"><span class="log-timestamp">[LOGS_CLEARED]</span><span class="log-level log-info">INFO</span><span class="log-message">LOG HISTORY PURGED</span></div>';
    }

    setScriptStatus(scriptName, status) {
        const scriptCard = document.querySelector(`[data-script="${scriptName}"]`);
        if (scriptCard) {
            const statusBadge = scriptCard.querySelector('.status-badge');
            statusBadge.className = `status-badge status-${status}`;
            statusBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        }
    }

    updateLastRun(scriptName) {
        const scriptCard = document.querySelector(`[data-script="${scriptName}"]`);
        if (scriptCard) {
            const lastRunElement = scriptCard.querySelector('.last-run');
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            lastRunElement.textContent = `LAST: ${timeStr}`;
        }
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        document.getElementById('lastRun').textContent = timeStr;
    }

    updateRunningJobsCount() {
        document.getElementById('runningJobs').textContent = this.runningJobs.size;
    }

    openScheduleModal(scriptName = '') {
        const modal = document.getElementById('scheduleModal');
        const scriptSelect = document.getElementById('scheduleScript');
        
        if (scriptName) {
            scriptSelect.value = scriptName;
        }
        
        modal.style.display = 'block';
    }

    closeScheduleModal() {
        const modal = document.getElementById('scheduleModal');
        modal.style.display = 'none';
        
        // Reset form
        document.getElementById('scheduleForm').reset();
        this.handleScheduleTypeChange('once');
    }

    handleScheduleTypeChange(type) {
        const timeGroup = document.getElementById('timeGroup');
        const dateGroup = document.getElementById('dateGroup');
        const cronGroup = document.getElementById('cronGroup');
        
        timeGroup.style.display = 'block';
        dateGroup.style.display = type === 'once' ? 'block' : 'none';
        cronGroup.style.display = type === 'custom' ? 'block' : 'none';
    }

    async addSchedule() {
        const formData = new FormData(document.getElementById('scheduleForm'));
        const scheduleData = {
            script: formData.get('scheduleScript') || document.getElementById('scheduleScript').value,
            type: formData.get('scheduleType') || document.getElementById('scheduleType').value,
            time: formData.get('scheduleTime') || document.getElementById('scheduleTime').value,
            date: formData.get('scheduleDate') || document.getElementById('scheduleDate').value,
            cron: formData.get('cronExpression') || document.getElementById('cronExpression').value,
            args: formData.get('scheduleArgs') || document.getElementById('scheduleArgs').value
        };

        try {
            const response = await fetch('/api/admin/add-schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(scheduleData)
            });

            const result = await response.json();

            if (result.success) {
                this.loadScheduledJobs();
                this.closeScheduleModal();
                this.showNotification('Schedule added successfully', 'success');
                this.addLog('info', `Scheduled ${scheduleData.script} for ${scheduleData.type} execution`);
            } else {
                throw new Error(result.error || 'Failed to add schedule');
            }

        } catch (error) {
            this.showNotification(`Failed to add schedule: ${error.message}`, 'error');
        }
    }

    async loadScheduledJobs() {
        try {
            const response = await fetch('/api/admin/scheduled-jobs');
            const jobs = await response.json();
            
            const container = document.getElementById('scheduledJobs');
            
            if (jobs.length === 0) {
                container.innerHTML = '<p>No scheduled jobs</p>';
                return;
            }
            
            container.innerHTML = jobs.map(job => `
                <div class="scheduled-job">
                    <div class="job-info">
                        <h4>${job.script}</h4>
                        <p>Next run: ${new Date(job.nextRun).toLocaleString()}</p>
                        <p>Schedule: ${job.schedule}</p>
                    </div>
                    <div class="job-actions">
                        <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteSchedule('${job.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Failed to load scheduled jobs:', error);
        }
    }

    async deleteSchedule(jobId) {
        try {
            const response = await fetch(`/api/admin/scheduled-jobs/${jobId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.loadScheduledJobs();
                this.showNotification('Schedule deleted', 'success');
            } else {
                throw new Error(result.error || 'Failed to delete schedule');
            }

        } catch (error) {
            this.showNotification(`Failed to delete schedule: ${error.message}`, 'error');
        }
    }

    addLog(level, message, script = 'SYSTEM') {
        const logsContainer = document.getElementById('logsContainer');
        const now = new Date();
        const timestamp = now.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <span class="log-timestamp">${timestamp}</span>
            <span class="log-level log-${level}">${level.toUpperCase()}</span>
            <span class="log-message">${message}</span>
        `;
        
        logsContainer.insertBefore(logEntry, logsContainer.firstChild);
        
        // Keep only last 100 log entries
        while (logsContainer.children.length > 100) {
            logsContainer.removeChild(logsContainer.lastChild);
        }
        
        // Add typing effect to new log
        const messageElement = logEntry.querySelector('.log-message');
        const originalText = messageElement.textContent;
        messageElement.textContent = '';
        this.typeText(messageElement, originalText, 20);
    }

    async loadLogs() {
        try {
            const response = await fetch('/api/admin/logs');
            const logs = await response.json();
            
            const logsContainer = document.getElementById('logsContainer');
            logsContainer.innerHTML = logs.map(log => `
                <div class="log-entry">
                    <span class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</span>
                    <span class="log-level log-${log.level}">${log.level.toUpperCase()}</span>
                    <span class="log-message">${log.message}</span>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Failed to load logs:', error);
        }
    }

    filterLogs() {
        const scriptFilter = document.getElementById('logFilter').value;
        const levelFilter = document.getElementById('logLevel').value;
        
        const logEntries = document.querySelectorAll('.log-entry');
        
        logEntries.forEach(entry => {
            const message = entry.querySelector('.log-message').textContent.toLowerCase();
            const level = entry.querySelector('.log-level').textContent.toLowerCase();
            
            let showScript = scriptFilter === 'all' || message.includes(scriptFilter);
            let showLevel = levelFilter === 'all' || level.includes(levelFilter);
            
            entry.style.display = showScript && showLevel ? 'flex' : 'none';
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 5000);
    }

    startStatusPolling() {
        // Poll status every 30 seconds
        setInterval(() => {
            this.checkSystemStatus();
        }, 30000);
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new RetroAdminPanel();
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const modal = document.getElementById('scheduleModal');
    if (event.target === modal) {
        window.adminPanel.closeScheduleModal();
    }
});