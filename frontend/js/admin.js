// ==========================================
// Admin Dashboard JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize
    theme.init();
    checkAdminAuth();
    initAdminDashboard();
});

// Check admin authentication
function checkAdminAuth() {
    const token = localStorage.getItem('token');
    const user = storage.get('user');

    if (!token || !user) {
        window.location.href = '/login';
        return;
    }

    if (user.role !== 'admin') {
        alert('Access denied. Admin only.');
        window.location.href = '/dashboard';
        return;
    }

    // Update admin info
    document.getElementById('adminName').textContent = user.name;
    document.getElementById('userGreeting').textContent = `Hello, ${user.name}`;

    // Logout handler
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        storage.remove('user');
        window.location.href = '/login';
    });
}

// Initialize admin dashboard
function initAdminDashboard() {
    // Setup sidebar navigation
    setupSidebarNav();

    // Load initial data
    loadDashboardStats();
    loadPendingCount();

    // Setup filters
    setupAdminFilters();

    // Setup modals
    setupModals();
}

// Setup sidebar navigation
function setupSidebarNav() {
    const sidebarLinks = document.querySelectorAll('.sidebar-link');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            const section = link.dataset.section;

            // Update active link
            sidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show section
            document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
            document.getElementById(section)?.classList.add('active');

            // Load section data
            loadSectionData(section);
        });
    });
}

// Load section data based on active section
function loadSectionData(section) {
    switch (section) {
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'pending':
            loadPendingExperiences();
            break;
        case 'experiences':
            loadAllExperiences();
            break;
        case 'users':
            loadAllUsers();
            break;
        case 'companies':
            loadCompanies();
            break;
        case 'calendar':
            loadDrives();
            break;
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await api.get('/admin/stats');
        const stats = response.stats;

        // Update stat cards
        document.getElementById('statTotalUsers').textContent = stats.totalUsers;
        document.getElementById('statTotalExperiences').textContent = stats.totalExperiences;
        document.getElementById('statPending').textContent = stats.pendingExperiences;
        document.getElementById('statApproved').textContent = stats.approvedExperiences;

        // Render top companies chart
        renderTopCompaniesChart(stats.experiencesByCompany);

        // Render experience distribution
        renderExperienceDistribution(stats.experiencesByDifficulty, stats.experiencesByType);

        // Render recent submissions
        renderRecentSubmissions(stats.recentExperiences);

        // Render recent users
        renderRecentUsers(stats.recentUsers);

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Render top companies chart
function renderTopCompaniesChart(data) {
    const container = document.getElementById('topCompaniesChart');

    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-muted">No data available</p>';
        return;
    }

    const maxCount = Math.max(...data.map(d => d.count));

    container.innerHTML = data.slice(0, 5).map(item => `
        <div class="chart-bar">
            <span class="chart-bar-label">${escapeHtml(item._id)}</span>
            <div class="chart-bar-value">
                <div class="chart-bar-fill" style="width: ${(item.count / maxCount) * 100}%">
                    ${item.count}
                </div>
            </div>
        </div>
    `).join('');
}

// Render experience distribution
function renderExperienceDistribution(byDifficulty, byType) {
    const container = document.getElementById('experienceDistribution');

    const colors = {
        'Easy': '#10b981',
        'Medium': '#f59e0b',
        'Hard': '#ef4444',
        'Positive': '#10b981',
        'Neutral': '#f59e0b',
        'Negative': '#ef4444'
    };

    let html = '<div style="margin-bottom: 1rem;"><strong>By Difficulty:</strong></div>';

    if (byDifficulty && byDifficulty.length > 0) {
        byDifficulty.forEach(item => {
            html += `
                <div class="distribution-item">
                    <div class="distribution-label">
                        <span class="distribution-dot" style="background-color: ${colors[item._id] || '#6b7280'}"></span>
                        <span>${item._id}</span>
                    </div>
                    <span class="distribution-count">${item.count}</span>
                </div>
            `;
        });
    }

    html += '<div style="margin: 1rem 0;"><strong>By Experience Type:</strong></div>';

    if (byType && byType.length > 0) {
        byType.forEach(item => {
            html += `
                <div class="distribution-item">
                    <div class="distribution-label">
                        <span class="distribution-dot" style="background-color: ${colors[item._id] || '#6b7280'}"></span>
                        <span>${item._id}</span>
                    </div>
                    <span class="distribution-count">${item.count}</span>
                </div>
            `;
        });
    }

    container.innerHTML = html;
}

// Render recent submissions
function renderRecentSubmissions(experiences) {
    const container = document.getElementById('recentSubmissions');

    if (!experiences || experiences.length === 0) {
        container.innerHTML = '<p class="text-muted">No recent submissions</p>';
        return;
    }

    container.innerHTML = experiences.map(exp => {
        const date = new Date(exp.createdAt).toLocaleDateString('en-IN');
        const submitter = exp.submittedBy?.name || 'Unknown';

        return `
            <div class="recent-item">
                <div class="recent-item-info">
                    <span class="recent-item-title">${escapeHtml(exp.companyName)} - ${escapeHtml(exp.jobRole)}</span>
                    <span class="recent-item-meta">by ${escapeHtml(submitter)} on ${date}</span>
                </div>
                <span class="submission-status status-${exp.status}">${exp.status}</span>
            </div>
        `;
    }).join('');
}

// Render recent users
function renderRecentUsers(users) {
    const container = document.getElementById('recentUsers');

    if (!users || users.length === 0) {
        container.innerHTML = '<p class="text-muted">No recent users</p>';
        return;
    }

    container.innerHTML = users.map(user => {
        const date = new Date(user.createdAt).toLocaleDateString('en-IN');

        return `
            <div class="recent-item">
                <div class="recent-item-info">
                    <span class="recent-item-title">${escapeHtml(user.name)}</span>
                    <span class="recent-item-meta">${escapeHtml(user.email)}</span>
                </div>
                <span class="user-role">${user.role}</span>
            </div>
        `;
    }).join('');
}

// Load pending count
async function loadPendingCount() {
    try {
        const response = await api.get('/admin/experiences/pending');
        const badge = document.getElementById('pendingBadge');
        badge.textContent = response.count;
        badge.style.display = response.count > 0 ? 'inline-block' : 'none';
    } catch (error) {
        console.error('Error loading pending count:', error);
    }
}

// Load pending experiences
async function loadPendingExperiences() {
    const container = document.getElementById('pendingList');
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const response = await api.get('/admin/experiences/pending');

        if (response.experiences.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <h3>All caught up!</h3>
                    <p>No pending experiences to review</p>
                </div>
            `;
            return;
        }

        container.innerHTML = response.experiences.map(exp => createPendingCard(exp)).join('');
    } catch (error) {
        console.error('Error loading pending:', error);
        container.innerHTML = `<div class="empty-state"><h3>Error loading data</h3></div>`;
    }
}

// Create pending card HTML
function createPendingCard(exp) {
    const date = new Date(exp.createdAt).toLocaleDateString('en-IN');
    const submitter = exp.submittedBy?.name || 'Unknown';
    const email = exp.submittedBy?.email || '';

    return `
        <div class="pending-card" id="pending-${exp._id}">
            <div class="pending-card-header">
                <div class="pending-card-info">
                    <h4>${escapeHtml(exp.companyName)} - ${escapeHtml(exp.jobRole)}</h4>
                    <div class="pending-card-meta">
                        <span><i class="fas fa-user"></i> ${escapeHtml(submitter)}</span>
                        <span><i class="fas fa-envelope"></i> ${escapeHtml(email)}</span>
                        <span><i class="fas fa-calendar"></i> ${date}</span>
                        <span class="difficulty-badge difficulty-${exp.difficulty}">${exp.difficulty}</span>
                    </div>
                </div>
                <div class="pending-card-actions">
                    <button class="btn btn-success btn-sm" onclick="approveExperience('${exp._id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="rejectExperience('${exp._id}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="viewExperienceDetail('${exp._id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
            </div>
            <div class="pending-card-body">
                <p><strong>Tips:</strong> ${escapeHtml((exp.tips || '').substring(0, 200))}...</p>
                <p><strong>Rounds:</strong> ${exp.rounds?.length || 0} | <strong>Questions:</strong> ${exp.questions?.length || 0}</p>
            </div>
        </div>
    `;
}

// Approve experience
async function approveExperience(id) {
    if (!confirm('Approve this experience?')) return;

    try {
        await api.put(`/admin/experiences/${id}/approve`);
        showToast('Experience approved successfully');
        document.getElementById(`pending-${id}`)?.remove();
        loadPendingCount();
        loadDashboardStats();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Reject experience
async function rejectExperience(id) {
    const reason = prompt('Reason for rejection (optional):');

    try {
        await api.put(`/admin/experiences/${id}/reject`, { reason });
        showToast('Experience rejected');
        document.getElementById(`pending-${id}`)?.remove();
        loadPendingCount();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Load all experiences
let experiencesPage = 1;

async function loadAllExperiences(page = 1) {
    experiencesPage = page;
    const tbody = document.getElementById('experiencesTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    try {
        const status = document.getElementById('adminStatusFilter')?.value || '';
        const search = document.getElementById('adminSearchInput')?.value || '';

        let url = `/admin/experiences?page=${page}&limit=20`;
        if (status) url += `&status=${status}`;
        if (search) url += `&company=${encodeURIComponent(search)}`;

        const response = await api.get(url);

        if (response.experiences.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">No experiences found</td></tr>';
            return;
        }

        tbody.innerHTML = response.experiences.map(exp => {
            const date = new Date(exp.createdAt).toLocaleDateString('en-IN');
            const submitter = exp.submittedBy?.name || 'Unknown';

            return `
                <tr>
                    <td>${escapeHtml(exp.companyName)}</td>
                    <td>${escapeHtml(exp.jobRole)}</td>
                    <td>${escapeHtml(submitter)}</td>
                    <td>${date}</td>
                    <td><span class="submission-status status-${exp.status}">${exp.status}</span></td>
                    <td>
                        <div class="table-actions">
                            <button class="btn-icon btn-icon-primary" onclick="viewExperienceDetail('${exp._id}')" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${exp.status === 'pending' ? `
                                <button class="btn-icon btn-icon-success" onclick="approveExperience('${exp._id}')" title="Approve">
                                    <i class="fas fa-check"></i>
                                </button>
                            ` : ''}
                            <button class="btn-icon btn-icon-danger" onclick="deleteExperience('${exp._id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Render pagination
        renderAdminPagination('experiencesPagination', response.totalPages, experiencesPage, loadAllExperiences);

    } catch (error) {
        console.error('Error loading experiences:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Error loading data</td></tr>';
    }
}

// Delete experience
async function deleteExperience(id) {
    if (!confirm('Are you sure you want to delete this experience? This action cannot be undone.')) return;

    try {
        await api.delete(`/admin/experiences/${id}`);
        showToast('Experience deleted');
        loadAllExperiences(experiencesPage);
        loadDashboardStats();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Load all users
let usersPage = 1;

async function loadAllUsers(page = 1) {
    usersPage = page;
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    try {
        const role = document.getElementById('userRoleFilter')?.value || '';
        const branch = document.getElementById('userBranchFilter')?.value || '';

        let url = `/admin/users?page=${page}&limit=20`;
        if (role) url += `&role=${role}`;
        if (branch) url += `&branch=${encodeURIComponent(branch)}`;

        const response = await api.get(url);

        if (response.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = response.users.map(user => `
            <tr>
                <td>${escapeHtml(user.name)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td>${escapeHtml(user.branch || 'N/A')}</td>
                <td>${escapeHtml(user.year || 'N/A')}</td>
                <td>
                    <select class="filter-select" onchange="updateUserRole('${user._id}', this.value)" ${user.role === 'admin' ? 'disabled' : ''}>
                        <option value="junior" ${user.role === 'junior' ? 'selected' : ''}>Junior</option>
                        <option value="finalyear" ${user.role === 'finalyear' ? 'selected' : ''}>Final Year</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td>
                    <span class="submission-status ${user.isActive ? 'status-approved' : 'status-rejected'}">
                        ${user.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        ${user.role !== 'admin' ? `
                            <button class="btn-icon ${user.isActive ? 'btn-icon-danger' : 'btn-icon-success'}" 
                                    onclick="toggleUserStatus('${user._id}')" 
                                    title="${user.isActive ? 'Deactivate' : 'Activate'}">
                                <i class="fas fa-${user.isActive ? 'ban' : 'check'}"></i>
                            </button>
                            <button class="btn-icon btn-icon-danger" onclick="deleteUser('${user._id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

        // Render pagination
        renderAdminPagination('usersPagination', response.totalPages, usersPage, loadAllUsers);

    } catch (error) {
        console.error('Error loading users:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Error loading data</td></tr>';
    }
}

// Update user role
async function updateUserRole(id, role) {
    try {
        await api.put(`/admin/users/${id}/role`, { role });
        showToast('User role updated');
    } catch (error) {
        showToast(error.message, 'error');
        loadAllUsers(usersPage);
    }
}

// Toggle user status
async function toggleUserStatus(id) {
    try {
        await api.put(`/admin/users/${id}/toggle`);
        showToast('User status updated');
        loadAllUsers(usersPage);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Delete user
async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
        await api.delete(`/admin/users/${id}`);
        showToast('User deleted');
        loadAllUsers(usersPage);
        loadDashboardStats();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Load companies
async function loadCompanies() {
    const container = document.getElementById('companiesGrid');
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const response = await api.get('/admin/companies');

        if (response.companies.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-building"></i>
                    <h3>No companies added yet</h3>
                </div>
            `;
            return;
        }

        container.innerHTML = response.companies.map(company => `
            <div class="company-card">
                <h4>${escapeHtml(company.companyName)}</h4>
                <p>${company.sector || 'IT'}</p>
                <div class="company-stats">
                    <span><i class="fas fa-file-alt"></i> ${company.totalExperiences || 0} experiences</span>
                </div>
                <div style="margin-top: 1rem;">
                    <button class="btn btn-danger btn-sm" onclick="deleteCompany('${company._id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading companies:', error);
        container.innerHTML = '<div class="empty-state"><h3>Error loading data</h3></div>';
    }
}

// Delete company
async function deleteCompany(id) {
    if (!confirm('Are you sure you want to delete this company?')) return;

    try {
        await api.delete(`/admin/companies/${id}`);
        showToast('Company deleted');
        loadCompanies();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Setup admin filters
function setupAdminFilters() {
    document.getElementById('adminApplyFilters')?.addEventListener('click', () => loadAllExperiences(1));
    document.getElementById('userApplyFilters')?.addEventListener('click', () => loadAllUsers(1));

    document.getElementById('addCompanyBtn')?.addEventListener('click', () => {
        document.getElementById('addCompanyModal').classList.add('active');
    });

    document.getElementById('addCompanyForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            await api.post('/admin/companies', {
                companyName: document.getElementById('newCompanyName').value,
                sector: document.getElementById('companySector').value,
                website: document.getElementById('companyWebsite').value
            });

            showToast('Company added successfully');
            document.getElementById('addCompanyModal').classList.remove('active');
            document.getElementById('addCompanyForm').reset();
            loadCompanies();
        } catch (error) {
            document.getElementById('companyFormError').textContent = error.message;
            document.getElementById('companyFormError').style.display = 'block';
        }
    });
}

// Setup modals
function setupModals() {
    document.getElementById('closeExperienceModal')?.addEventListener('click', () => {
        document.getElementById('experienceModal').classList.remove('active');
    });

    document.getElementById('closeCompanyModal')?.addEventListener('click', () => {
        document.getElementById('addCompanyModal').classList.remove('active');
    });

    document.getElementById('closeDriveModal')?.addEventListener('click', closeDriveModal);
    document.getElementById('cancelDriveBtn')?.addEventListener('click', closeDriveModal);

    document.getElementById('addDriveBtn')?.addEventListener('click', () => openDriveModal());

    document.getElementById('driveForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveDrive();
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// View experience detail in modal
async function viewExperienceDetail(id) {
    const modal = document.getElementById('experienceModal');
    const body = document.getElementById('experienceModalBody');
    const footer = document.getElementById('experienceModalFooter');

    body.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';
    footer.innerHTML = '';
    modal.classList.add('active');

    try {
        const response = await api.get(`/experiences/${id}`);
        const exp = response.experience;

        document.getElementById('experienceModalTitle').textContent = `${exp.companyName} - ${exp.jobRole}`;

        body.innerHTML = `
            <div class="experience-detail-meta">
                <div class="meta-card">
                    <i class="fas fa-calendar"></i>
                    <div>
                        <label>Date</label>
                        <p>${new Date(exp.interviewDate).toLocaleDateString('en-IN')}</p>
                    </div>
                </div>
                <div class="meta-card">
                    <i class="fas fa-signal"></i>
                    <div>
                        <label>Difficulty</label>
                        <p>${exp.difficulty}</p>
                    </div>
                </div>
                <div class="meta-card">
                    <i class="fas fa-smile"></i>
                    <div>
                        <label>Experience</label>
                        <p>${exp.experienceType}</p>
                    </div>
                </div>
                <div class="meta-card">
                    <i class="fas fa-trophy"></i>
                    <div>
                        <label>Result</label>
                        <p>${exp.selectionStatus || 'N/A'}</p>
                    </div>
                </div>
                ${exp.packageOffered ? `
                <div class="meta-card">
                    <i class="fas fa-rupee-sign"></i>
                    <div>
                        <label>Package</label>
                        <p>${escapeHtml(exp.packageOffered)}</p>
                    </div>
                </div>` : ''}
                ${exp.submittedBy ? `
                <div class="meta-card">
                    <i class="fas fa-user"></i>
                    <div>
                        <label>Submitted By</label>
                        <p>${exp.isAnonymous ? 'Anonymous' : escapeHtml(exp.submittedBy.name || '')} ${exp.submittedBy.branch ? '· ' + escapeHtml(exp.submittedBy.branch) : ''}</p>
                    </div>
                </div>` : ''}
            </div>

            ${exp.rounds && exp.rounds.length > 0 ? `
                <h4 style="margin: 1rem 0 0.5rem;">Interview Rounds (${exp.rounds.length})</h4>
                ${exp.rounds.map((r, i) => `
                    <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 0.5rem; margin-bottom: 0.5rem;">
                        <strong>${i + 1}. ${r.roundType}</strong>
                        ${r.duration ? `<span style="font-size:0.8rem; color:var(--text-secondary); margin-left:0.5rem;">(${escapeHtml(r.duration)})</span>` : ''}
                        <p style="margin-top: 0.5rem; color: var(--text-secondary);">${escapeHtml(r.description)}</p>
                        ${r.questions && r.questions.length > 0 ? `
                            <div style="margin-top: 0.5rem;">
                                <strong style="font-size:0.85rem;">Questions Asked:</strong>
                                <ul style="margin: 0.3rem 0 0 1.2rem; color: var(--text-secondary); font-size:0.9rem;">
                                    ${r.questions.map((q, qIndex) => `
                                        <li style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.3rem;">
                                            <span>${escapeHtml(q)}</span>
                                            <button class="btn-icon btn-icon-danger" style="padding: 0.2rem; margin-left: 0.5rem;" onclick="deleteAdminQuestion('${exp._id}', ${i}, ${qIndex})" title="Delete Question">
                                                <i class="fas fa-trash" style="font-size: 0.8rem;"></i>
                                            </button>
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${r.tips ? `<p style="margin-top:0.4rem; font-size:0.85rem; color:var(--primary-color);"><i class="fas fa-lightbulb"></i> ${escapeHtml(r.tips)}</p>` : ''}
                    </div>
                `).join('')}
            ` : ''}

            ${exp.questions && exp.questions.length > 0 ? `
                <h4 style="margin: 1rem 0 0.5rem;">General Questions</h4>
                <ul style="margin: 0 0 0.5rem 1.2rem; color: var(--text-secondary); font-size:0.9rem;">
                    ${exp.questions.map((q, qIndex) => `
                        <li style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.3rem;">
                            <span>${escapeHtml(q)}</span>
                            <button class="btn-icon btn-icon-danger" style="padding: 0.2rem; margin-left: 0.5rem;" onclick="deleteAdminQuestion('${exp._id}', null, ${qIndex})" title="Delete Question">
                                <i class="fas fa-trash" style="font-size: 0.8rem;"></i>
                            </button>
                        </li>
                    `).join('')}
                </ul>
            ` : ''}

            ${exp.tips ? `
                <h4 style="margin: 1rem 0 0.5rem;">Tips</h4>
                <p style="color: var(--text-secondary);">${escapeHtml(exp.tips)}</p>
            ` : ''}
        `;

        footer.innerHTML = `
            ${exp.status === 'pending' ? `
                <button class="btn btn-success" onclick="approveExperience('${exp._id}'); document.getElementById('experienceModal').classList.remove('active');">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn btn-danger" onclick="rejectExperience('${exp._id}'); document.getElementById('experienceModal').classList.remove('active');">
                    <i class="fas fa-times"></i> Reject
                </button>
            ` : ''}
            <button class="btn btn-outline" onclick="document.getElementById('experienceModal').classList.remove('active')">
                Close
            </button>
        `;

    } catch (error) {
        body.innerHTML = `<div class="empty-state"><h3>Error loading experience</h3></div>`;
    }
}

// Delete question from experience (Admin)
async function deleteAdminQuestion(experienceId, roundIndex, questionIndex) {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) return;

    try {
        await api.delete(`/admin/experiences/${experienceId}/questions`, {
            roundIndex: roundIndex,
            questionIndex: questionIndex
        });
        showToast('Question deleted');

        // Refresh the detail modal to show the updated questions
        viewExperienceDetail(experienceId);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Render admin pagination
function renderAdminPagination(containerId, totalPages, currentPage, loadFunction) {
    const container = document.getElementById(containerId);

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="${loadFunction.name}(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
    </button>`;

    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="${loadFunction.name}(${i})">${i}</button>`;
    }

    if (totalPages > 5) {
        html += `<span>...</span>`;
        html += `<button class="page-btn" onclick="${loadFunction.name}(${totalPages})">${totalPages}</button>`;
    }

    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="${loadFunction.name}(${currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
    </button>`;

    container.innerHTML = html;
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    toastMessage.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Helper: Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// Campus Drives (Calendar) Management
// ==========================================

async function loadDrives() {
    const tbody = document.getElementById('drivesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    try {
        const res = await api.get('/calendar');
        const drives = res.drives || [];

        if (drives.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted);">No campus drives added yet. Click "Add Drive" to get started.</td></tr>';
            return;
        }

        tbody.innerHTML = drives.map(d => {
            const driveDate = new Date(d.driveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            const isPast = new Date(d.driveDate) < new Date();
            const statusBadge = isPast
                ? '<span class="status-badge status-rejected">Past</span>'
                : '<span class="status-badge status-approved">Upcoming</span>';

            return `
        <tr>
                <td><strong>${escapeHtml(d.companyName)}</strong></td>
                <td>${escapeHtml(d.jobRole)}</td>
                <td>${driveDate}</td>
                <td>${d.packageOffered ? escapeHtml(d.packageOffered) + ' LPA' : '-'}</td>
                <td>${d.venue ? escapeHtml(d.venue) : '-'}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-outline" onclick="editDrive('${d._id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteDrive('${d._id}', '${escapeHtml(d.companyName)}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--error-color);padding:1.5rem;">${error.message}</td></tr>`;
    }
}

function openDriveModal(drive = null) {
    const modal = document.getElementById('driveModal');
    const title = document.getElementById('driveModalTitle');
    const submitBtn = document.getElementById('driveSubmitBtn');
    const form = document.getElementById('driveForm');
    const errorEl = document.getElementById('driveFormError');

    form.reset();
    errorEl.textContent = '';
    document.querySelectorAll('input[name="driveBranch"]').forEach(cb => cb.checked = false);

    if (drive) {
        title.textContent = 'Edit Campus Drive';
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        document.getElementById('driveId').value = drive._id;
        document.getElementById('driveCompany').value = drive.companyName || '';
        document.getElementById('driveRole').value = drive.jobRole || '';
        document.getElementById('driveDate').value = drive.driveDate ? drive.driveDate.split('T')[0] : '';
        document.getElementById('driveDeadline').value = drive.registrationDeadline ? drive.registrationDeadline.split('T')[0] : '';
        document.getElementById('drivePackage').value = drive.packageOffered || '';
        document.getElementById('driveCGPA').value = drive.minCGPA || '';
        document.getElementById('driveVenue').value = drive.venue || '';
        document.getElementById('driveRegistrationLink').value = drive.registrationLink || '';
        document.getElementById('driveDescription').value = drive.description || '';
        if (drive.eligibleBranches && drive.eligibleBranches.length > 0) {
            drive.eligibleBranches.forEach(branch => {
                const cb = document.querySelector(`input[name="driveBranch"][value="${branch}"]`);
                if (cb) cb.checked = true;
            });
        }
    } else {
        title.textContent = 'Add Campus Drive';
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Drive';
        document.getElementById('driveId').value = '';
    }

    modal.classList.add('active');
}

function closeDriveModal() {
    document.getElementById('driveModal').classList.remove('active');
}

async function saveDrive() {
    const driveId = document.getElementById('driveId').value;
    const errorEl = document.getElementById('driveFormError');
    errorEl.textContent = '';

    const eligibleBranches = Array.from(document.querySelectorAll('input[name="driveBranch"]:checked')).map(cb => cb.value);

    const payload = {
        companyName: document.getElementById('driveCompany').value.trim(),
        jobRole: document.getElementById('driveRole').value.trim(),
        driveDate: document.getElementById('driveDate').value,
        registrationDeadline: document.getElementById('driveDeadline').value || undefined,
        packageOffered: document.getElementById('drivePackage').value.trim() || undefined,
        minCGPA: document.getElementById('driveCGPA').value ? parseFloat(document.getElementById('driveCGPA').value) : undefined,
        venue: document.getElementById('driveVenue').value.trim() || undefined,
        registrationLink: document.getElementById('driveRegistrationLink').value.trim() || undefined,
        description: document.getElementById('driveDescription').value.trim() || undefined,
        eligibleBranches: eligibleBranches.length > 0 ? eligibleBranches : undefined
    };

    try {
        if (driveId) {
            await api.put(`/calendar/${driveId}`, payload);
            showToast('Drive updated successfully!');
        } else {
            await api.post('/calendar', payload);
            showToast('Drive added! Students have been notified.');
        }
        closeDriveModal();
        loadDrives();
    } catch (error) {
        errorEl.textContent = error.message || 'Failed to save drive';
        errorEl.style.display = 'block';
    }
}

async function editDrive(id) {
    try {
        const res = await api.get(`/calendar/${id}`);
        openDriveModal(res.drive);
    } catch (error) {
        showToast('Failed to load drive details', 'error');
    }
}

async function deleteDrive(id, companyName) {
    if (!confirm(`Delete campus drive for "${companyName}"? This cannot be undone.`)) return;
    try {
        await api.delete(`/calendar/${id}`);
        showToast('Drive deleted successfully');
        loadDrives();
    } catch (error) {
        showToast(error.message || 'Failed to delete drive', 'error');
    }
}
