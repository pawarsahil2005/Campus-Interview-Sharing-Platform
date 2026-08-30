// ==========================================
// Home Page Script
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadRecentExperiences();
    await loadStats();
});

// Load recent experiences
async function loadRecentExperiences() {
    const container = document.getElementById('recentExperiences');
    if (!container) return;

    try {
        const response = await api.get('/experiences?limit=6');
        
        if (response.success && response.experiences.length > 0) {
            container.innerHTML = response.experiences.map(exp => createExperienceCard(exp)).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <p>No experiences yet. Be the first to share!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading experiences:', error);
        const isDbConnecting = error.dbConnecting || /connecting|wait a moment/i.test(error.message);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-${isDbConnecting ? 'database' : 'exclamation-circle'}"></i>
                <p>${isDbConnecting ? 'Database connecting — will retry automatically…' : 'Failed to load experiences'}</p>
                ${!isDbConnecting ? '<button class="btn btn-outline" style="margin-top:.5rem" onclick="loadRecentExperiences()">Retry</button>' : ''}
            </div>
        `;
        if (isDbConnecting) {
            setTimeout(() => loadRecentExperiences(), 15000);
        }
    }
}

// Load statistics
async function loadStats() {
    try {
        // Get experiences count
        const expResponse = await api.get('/experiences?limit=1');
        if (expResponse.success) {
            const count = expResponse.total || 0;
            const countEl = document.getElementById('experienceCount');
            if (countEl) {
                countEl.textContent = count > 0 ? `${count}+` : '0';
            }
        }

        // Get companies count
        const companiesResponse = await api.get('/experiences/companies');
        if (companiesResponse.success) {
            const count = companiesResponse.count || 0;
            const countEl = document.getElementById('companyCount');
            if (countEl) {
                countEl.textContent = count > 0 ? `${count}+` : '0';
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}
