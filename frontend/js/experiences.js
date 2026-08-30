// ==========================================
// Experiences Page JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return; // Protect route
    // Initialize
    theme.init();
    initExperiencesPage();
});

// State
let currentPage = 1;
let currentFilters = {};
let totalPages = 1;

async function initExperiencesPage() {
    await Promise.all([
        loadFilters(),
        loadExperiences()
    ]);

    setupFilterListeners();
    setupSearchListener();
}

// Load filter options
async function loadFilters() {
    try {
        const [companiesRes, rolesRes, yearsRes] = await Promise.all([
            api.get('/experiences/companies'),
            api.get('/experiences/jobroles'),
            api.get('/experiences/years')
        ]);

        // Populate company filter
        const companyFilter = document.getElementById('companyFilter');
        if (companyFilter && companiesRes.companies) {
            companiesRes.companies.forEach(company => {
                const option = document.createElement('option');
                option.value = company;
                option.textContent = company;
                companyFilter.appendChild(option);
            });
        }

        // Populate role filter
        const roleFilter = document.getElementById('roleFilter');
        if (roleFilter && rolesRes.jobRoles) {
            rolesRes.jobRoles.forEach(role => {
                const option = document.createElement('option');
                option.value = role;
                option.textContent = role;
                roleFilter.appendChild(option);
            });
        }

        // Populate year filter
        const yearFilter = document.getElementById('yearFilter');
        if (yearFilter && yearsRes.years) {
            yearsRes.years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading filters:', error);
    }
}

// Load experiences
async function loadExperiences() {
    const grid = document.getElementById('experiencesGrid');
    grid.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading experiences...</p>
        </div>
    `;

    try {
        // Build query string
        const params = new URLSearchParams();
        params.append('page', currentPage);
        params.append('limit', 12);

        if (currentFilters.search) params.append('search', currentFilters.search);
        if (currentFilters.company) params.append('company', currentFilters.company);
        if (currentFilters.jobRole) params.append('jobRole', currentFilters.jobRole);
        if (currentFilters.difficulty) params.append('difficulty', currentFilters.difficulty);
        if (currentFilters.year) params.append('year', currentFilters.year);
        if (currentFilters.experienceType) params.append('experienceType', currentFilters.experienceType);

        const response = await api.get(`/experiences?${params.toString()}`);

        totalPages = response.totalPages;

        // Update results count
        const resultsCount = document.getElementById('resultsCount');
        resultsCount.textContent = `Showing ${response.count} of ${response.total} experiences`;

        // Render experiences
        if (response.experiences.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-search"></i>
                    <h3>No experiences found</h3>
                    <p>Try adjusting your filters or search terms</p>
                </div>
            `;
        } else {
            grid.innerHTML = response.experiences.map(exp => createExperienceCard(exp)).join('');
            // Load user bookmarks to mark saved experiences
            loadUserBookmarks();
        }

        // Render pagination
        renderPagination();
    } catch (error) {
        console.error('Error loading experiences:', error);
        const isDbConnecting = error.dbConnecting || /connecting|wait a moment/i.test(error.message);
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-${isDbConnecting ? 'database' : 'exclamation-circle'}"></i>
                <h3>${isDbConnecting ? 'Database connecting…' : 'Error loading experiences'}</h3>
                <p>${isDbConnecting ? 'The server is connecting to the database. This page will refresh automatically.' : error.message}</p>
                <button class="btn btn-primary" style="margin-top:1rem" onclick="loadExperiences()" id="retryBtn">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            </div>
        `;
        // Auto-retry every 15 s while the DB is still connecting
        if (isDbConnecting) {
            setTimeout(() => loadExperiences(), 15000);
        }
    }
}

// Create experience card HTML
function createExperienceCard(exp) {
    const date = new Date(exp.interviewDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short'
    });

    const submitter = exp.isAnonymous ? 'Anonymous' : (exp.submittedBy?.name || 'Student');
    const summary = exp.tips ? exp.tips.substring(0, 100) + '...' : 'No tips provided';

    return `
        <div class="experience-card" data-id="${exp._id}">
            <button class="bookmark-btn" data-exp-id="${exp._id}" onclick="event.stopPropagation(); toggleBookmark('${exp._id}', this)" title="Save for later">
                <i class="far fa-bookmark"></i>
            </button>
            <div class="experience-card-content" onclick="viewExperience('${exp._id}')">
                <div class="experience-card-header">
                    <div class="company-info">
                        <h3>${escapeHtml(exp.companyName)}</h3>
                        <p>${escapeHtml(exp.jobRole)}</p>
                    </div>
                    <span class="difficulty-badge difficulty-${exp.difficulty}">${exp.difficulty}</span>
                </div>
                <div class="experience-card-body">
                    <div class="experience-meta">
                        <span class="meta-item">
                            <i class="fas fa-calendar"></i> ${date}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-user"></i> ${escapeHtml(submitter)}
                        </span>
                    </div>
                    <p class="experience-summary">${escapeHtml(summary)}</p>
                </div>
                <div class="experience-card-footer">
                    <span class="experience-type type-${exp.experienceType}">
                        <i class="fas fa-${exp.experienceType === 'Positive' ? 'smile' : exp.experienceType === 'Negative' ? 'frown' : 'meh'}"></i>
                        ${exp.experienceType}
                    </span>
                    <span class="view-count">
                        <i class="fas fa-eye"></i> ${exp.views || 0}
                    </span>
                </div>
            </div>
        </div>
    `;
}

// Toggle bookmark
async function toggleBookmark(expId, btn) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login to bookmark experiences');
        window.location.href = '/login';
        return;
    }

    try {
        const res = await api.post(`/bookmarks/experience/${expId}`);
        const icon = btn.querySelector('i');
        if (res.bookmarked) {
            btn.classList.add('bookmarked');
            icon.className = 'fas fa-bookmark';
        } else {
            btn.classList.remove('bookmarked');
            icon.className = 'far fa-bookmark';
        }
    } catch (error) {
        console.error('Error toggling bookmark:', error);
        alert('Error saving bookmark');
    }
}

// Check user bookmarks on load
async function loadUserBookmarks() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await api.get('/bookmarks');
        const bookmarkedIds = res.experiences.map(e => e._id);
        document.querySelectorAll('.bookmark-btn').forEach(btn => {
            if (bookmarkedIds.includes(btn.dataset.expId)) {
                btn.classList.add('bookmarked');
                btn.querySelector('i').className = 'fas fa-bookmark';
            }
        });
    } catch (error) {
        console.error('Error loading bookmarks:', error);
    }
}

// Render pagination
function renderPagination() {
    const pagination = document.getElementById('pagination');

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';

    // Previous button
    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
    </button>`;

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        html += `<button class="page-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            html += `<span class="page-ellipsis">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="page-ellipsis">...</span>`;
        }
        html += `<button class="page-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }

    // Next button
    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
    </button>`;

    pagination.innerHTML = html;
}

// Change page
function changePage(page) {
    currentPage = page;
    loadExperiences();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Setup filter listeners
function setupFilterListeners() {
    // Apply filters button
    document.getElementById('applyFilters')?.addEventListener('click', applyFilters);

    // Clear filters button
    document.getElementById('clearFilters')?.addEventListener('click', clearFilters);

    // Sort select
    document.getElementById('sortSelect')?.addEventListener('change', () => {
        currentPage = 1;
        loadExperiences();
    });

    // Checkbox filters
    document.querySelectorAll('input[name="difficulty"], input[name="experienceType"]').forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });
}

// Setup search listener with debounce
function setupSearchListener() {
    let searchTimeout;
    const searchInput = document.getElementById('searchInput');

    searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentFilters.search = e.target.value;
            currentPage = 1;
            loadExperiences();
        }, 500);
    });
}

// Apply filters
function applyFilters() {
    currentFilters = {
        search: document.getElementById('searchInput')?.value || '',
        company: document.getElementById('companyFilter')?.value || '',
        jobRole: document.getElementById('roleFilter')?.value || '',
        year: document.getElementById('yearFilter')?.value || ''
    };

    // Get checked difficulties
    const difficultyChecks = document.querySelectorAll('input[name="difficulty"]:checked');
    if (difficultyChecks.length === 1) {
        currentFilters.difficulty = difficultyChecks[0].value;
    }

    // Get checked experience types
    const typeChecks = document.querySelectorAll('input[name="experienceType"]:checked');
    if (typeChecks.length === 1) {
        currentFilters.experienceType = typeChecks[0].value;
    }

    currentPage = 1;
    loadExperiences();
}

// Clear filters
function clearFilters() {
    // Reset all inputs
    document.getElementById('searchInput').value = '';
    document.getElementById('companyFilter').value = '';
    document.getElementById('roleFilter').value = '';
    document.getElementById('yearFilter').value = '';

    document.querySelectorAll('input[name="difficulty"], input[name="experienceType"]').forEach(checkbox => {
        checkbox.checked = false;
    });

    currentFilters = {};
    currentPage = 1;
    loadExperiences();
}

// View experience detail
function viewExperience(id) {
    window.location.href = `/experience/${id}`;
}

// Helper: Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
