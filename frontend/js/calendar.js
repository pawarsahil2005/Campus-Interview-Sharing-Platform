// ==========================================
// Calendar Page JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return; // Protect route
    init();
});

async function init() {
    // Auth nav
    const token = localStorage.getItem('token');
    if (token) {
        document.getElementById('navAuth').style.display = 'none';
        document.getElementById('navUser').style.display = 'flex';
        loadNotifications();
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        });
    }

    // Nav toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    if (navToggle) {
        navToggle.addEventListener('click', () => navMenu.classList.toggle('active'));
    }

    // Notification dropdown
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationDropdown = document.getElementById('notificationDropdown');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.style.display = notificationDropdown.style.display === 'none' ? 'block' : 'none';
        });
        document.addEventListener('click', () => notificationDropdown.style.display = 'none');
    }

    const markAllRead = document.getElementById('markAllRead');
    if (markAllRead) {
        markAllRead.addEventListener('click', async () => {
            try {
                await api.put('/notifications/read-all', {});
                loadNotifications();
            } catch (e) { }
        });
    }

    // Theme
    if (typeof theme !== 'undefined') theme.init();

    // Load drives
    await loadUpcomingDrives();
}

async function loadNotifications() {
    try {
        const data = await api.get('/notifications');
        const badge = document.getElementById('notificationBadge');
        const list = document.getElementById('notificationList');

        if (data.unreadCount > 0) {
            badge.style.display = 'flex';
            badge.textContent = data.unreadCount > 9 ? '9+' : data.unreadCount;
        } else {
            badge.style.display = 'none';
        }

        if (data.notifications.length === 0) {
            list.innerHTML = '<p class="no-notifications">No notifications</p>';
        } else {
            list.innerHTML = data.notifications.slice(0, 10).map(n => `
                <div class="notification-item ${n.isRead ? '' : 'unread'}" data-id="${n._id}">
                    <div class="notification-icon"><i class="fas fa-${getNotificationIcon(n.type)}"></i></div>
                    <div class="notification-content">
                        <p class="notification-title">${escapeHtml(n.title)}</p>
                        <p class="notification-message">${escapeHtml(n.message)}</p>
                        <span class="notification-time">${timeAgo(n.createdAt)}</span>
                    </div>
                </div>
            `).join('');

            list.querySelectorAll('.notification-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const id = item.dataset.id;
                    await api.put(`/notifications/${id}/read`, {});
                    item.classList.remove('unread');
                    loadNotifications();
                });
            });
        }
    } catch (e) {
        console.error('Load notifications error:', e);
    }
}

function getNotificationIcon(type) {
    const icons = {
        'experience_approved': 'check-circle',
        'experience_rejected': 'times-circle',
        'new_answer': 'comment',
        'new_experience': 'file-alt',
        'campus_drive': 'calendar-alt'
    };
    return icons[type] || 'bell';
}

async function loadUpcomingDrives() {
    const container = document.getElementById('upcomingDrives');
    const emptyState = document.getElementById('emptyState');

    try {
        const data = await api.get('/calendar?upcoming=true');
        const drives = data.drives || [];

        if (drives.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        container.innerHTML = drives.map(d => renderDriveCard(d)).join('');
    } catch (error) {
        console.error('Load drives error:', error);
        container.innerHTML = '<p class="error-text">Failed to load drives</p>';
    }
}

function renderDriveCard(drive) {
    const driveDate = new Date(drive.driveDate);
    const dateStr = driveDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const deadline = drive.registrationDeadline ? new Date(drive.registrationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null;

    return `
        <div class="drive-card">
            <div class="drive-date-badge">
                <span class="drive-day">${driveDate.getDate()}</span>
                <span class="drive-month">${driveDate.toLocaleDateString('en-IN', { month: 'short' })}</span>
            </div>
            <div class="drive-content">
                <h3 class="drive-company">${escapeHtml(drive.companyName)}</h3>
                <p class="drive-role"><i class="fas fa-briefcase"></i> ${escapeHtml(drive.jobRole)}</p>
                ${drive.packageOffered ? `<p class="drive-package"><i class="fas fa-rupee-sign"></i> ${escapeHtml(drive.packageOffered)}</p>` : ''}
                ${drive.venue ? `<p class="drive-venue"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(drive.venue)}</p>` : ''}
                ${drive.eligibleBranches && drive.eligibleBranches.length > 0 ? `
                    <div class="drive-branches">
                        <i class="fas fa-graduation-cap"></i>
                        ${drive.eligibleBranches.map(b => `<span class="branch-tag">${b}</span>`).join('')}
                    </div>
                ` : ''}
                ${drive.minCGPA ? `<p class="drive-cgpa"><i class="fas fa-star"></i> Min CGPA: ${drive.minCGPA}</p>` : ''}
                ${deadline ? `<p class="drive-deadline"><i class="fas fa-clock"></i> Register by: ${deadline}</p>` : ''}
                ${drive.description ? `<p class="drive-desc">${escapeHtml(drive.description)}</p>` : ''}
            </div>
            <div class="drive-actions">
                ${drive.registrationLink ? `<a href="${escapeHtml(drive.registrationLink)}" class="btn btn-primary btn-sm" target="_blank"><i class="fas fa-external-link-alt"></i> Register</a>` : ''}
                <a href="/company/${encodeURIComponent(drive.companyName)}" class="btn btn-outline btn-sm"><i class="fas fa-building"></i> View Company</a>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
