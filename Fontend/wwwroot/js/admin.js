// Admin Dashboard JavaScript
let currentSection = 'dashboard';
let charts = {};

// Initialize the admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupEventListeners();
    loadDashboardData();
    initializeCharts();
    loadAdminInfo();
});

// Load thông tin admin
function loadAdminInfo() {
    const adminName = localStorage.getItem('adminName') || 'Admin User';
    const adminEmail = localStorage.getItem('adminEmail') || 'admin@evswap.com';
    
    // Cập nhật UI với thông tin admin
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => {
        el.textContent = adminName;
    });
    
    // Cập nhật avatar nếu có
    // const userAvatar = document.querySelector('.user-avatar');
    // if (userAvatar) {
    //     userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=3b82f6&color=fff`;
    // }
}

// Initialize dashboard
function initializeDashboard() {
    // Set active section
    showSection('dashboard');
    
    // Load initial data
    loadStationsData();
    loadUsersData();
    loadBatteriesData();
}

// Setup event listeners
function setupEventListeners() {
    // Sidebar navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;
            showSection(section);
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Sidebar toggle for mobile
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }

    // User dropdown
    const userMenu = document.querySelector('.user-menu');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    if (userMenu && dropdownMenu) {
        userMenu.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            dropdownMenu.style.display = 'none';
        });
    }

    // Form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            handleFormSubmit(this);
        });
    });

    // Filter changes
    const filters = document.querySelectorAll('select, input[type="text"]');
    filters.forEach(filter => {
        filter.addEventListener('change', function() {
            handleFilterChange(this);
        });
    });
}

// Show section
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionId;
        
        // Update page title
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) {
            pageTitle.textContent = getSectionTitle(sectionId);
        }
        
        // Load data khi vào section batteries
        if (sectionId === 'batteries') {
            loadStationsList(); // Load danh sách trạm trước
    }
}
}

// Get section title
function getSectionTitle(sectionId) {
    const titles = {
        'dashboard': 'Dashboard',
        'stations': 'Quản lý trạm',
        'users': 'Quản lý người dùng',
        'packages': 'Gói thuê',
        'batteries': 'Quản lý pin',
        'reports': 'Báo cáo',
        'settings': 'Cài đặt'
    };
    return titles[sectionId] || 'Dashboard';
}

// Load dashboard data
function loadDashboardData() {
    // Simulate loading dashboard stats
    updateDashboardStats();
    loadRecentActivity();
}

// Update dashboard stats
function updateDashboardStats() {
    // This would typically fetch from API
    const stats = {
        totalStations: 25,
        activeUsers: 1247,
        todaySwaps: 3456,
        todayRevenue: 2400000
    };

    // Update stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        const valueElement = card.querySelector('h3');
        if (valueElement) {
            const values = [stats.totalStations, stats.activeUsers, stats.todaySwaps, stats.todayRevenue];
            valueElement.textContent = values[index] || '0';
        }
    });
}

// Load recent activity
function loadRecentActivity() {
    const activities = [
        {
            type: 'success',
            icon: 'fas fa-check',
            message: 'Trạm Quận 1 đã hoàn thành bảo trì',
            time: '2 phút trước'
        },
        {
            type: 'warning',
            icon: 'fas fa-exclamation-triangle',
            message: 'Trạm Quận 3 cần thay thế pin',
            time: '15 phút trước'
        },
        {
            type: 'info',
            icon: 'fas fa-info',
            message: 'Người dùng mới đăng ký gói tháng',
            time: '1 giờ trước'
        }
    ];

    const activityList = document.querySelector('.activity-list');
    if (activityList) {
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <p><strong>${activity.message}</strong></p>
                    <span class="activity-time">${activity.time}</span>
                </div>
            </div>
        `).join('');
    }
}

// Initialize charts
function initializeCharts() {
    initializeSwapsChart();
    initializeStationsStatusChart();
    initializeBatteryHealthChart();
    initializeReportsCharts();
}

// Initialize swaps chart
function initializeSwapsChart() {
    const ctx = document.getElementById('swapsChart');
    if (!ctx) return;

    charts.swaps = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
            datasets: [{
                label: 'Lượt đổi pin',
                data: [1200, 1900, 3000, 5000, 2000, 3000, 4500],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#f1f5f9'
                    }
                },
                x: {
                    grid: {
                        color: '#f1f5f9'
                    }
                }
            }
        }
    });
}

// Initialize stations status chart
function initializeStationsStatusChart() {
    const ctx = document.getElementById('stationsStatusChart');
    if (!ctx) return;

    charts.stationsStatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Hoạt động', 'Bảo trì', 'Offline'],
            datasets: [{
                data: [20, 3, 2],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Initialize battery health chart
function initializeBatteryHealthChart() {
    const ctx = document.getElementById('batteryHealthChart');
    if (!ctx) return;

    charts.batteryHealth = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['90-100%', '80-89%', '70-79%', '60-69%', '<60%'],
            datasets: [{
                label: 'Số lượng pin',
                data: [1200, 800, 300, 100, 50],
                backgroundColor: ['#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#f1f5f9'
                    }
                },
                x: {
                    grid: {
                        color: '#f1f5f9'
                    }
                }
            }
        }
    });
}

// Initialize reports charts
function initializeReportsCharts() {
    // Revenue chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        charts.revenue = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
                datasets: [{
                    label: 'Doanh thu (triệu VNĐ)',
                    data: [15, 18, 22, 25, 28, 30, 35],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9'
                        }
                    },
                    x: {
                        grid: {
                            color: '#f1f5f9'
                        }
                    }
                }
            }
        });
    }

    // Swaps report chart
    const swapsReportCtx = document.getElementById('swapsReportChart');
    if (swapsReportCtx) {
        charts.swapsReport = new Chart(swapsReportCtx, {
            type: 'bar',
            data: {
                labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
                datasets: [{
                    label: 'Lượt đổi pin',
                    data: [1200, 1500, 1800, 2000, 2200, 2500, 2800],
                    backgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9'
                        }
                    },
                    x: {
                        grid: {
                            color: '#f1f5f9'
                        }
                    }
                }
            }
        });
    }

    // Peak hours chart
    const peakHoursCtx = document.getElementById('peakHoursChart');
    if (peakHoursCtx) {
        charts.peakHours = new Chart(peakHoursCtx, {
            type: 'bar',
            data: {
                labels: ['6h', '8h', '10h', '12h', '14h', '16h', '18h', '20h'],
                datasets: [{
                    label: 'Lượt đổi pin',
                    data: [50, 200, 150, 300, 250, 400, 500, 350],
                    backgroundColor: '#f59e0b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9'
                        }
                    },
                    x: {
                        grid: {
                            color: '#f1f5f9'
                        }
                    }
                }
            }
        });
    }
}

// Load stations data
function loadStationsData() {
    const stationsData = [
        {
            id: 1,
            name: 'Trạm Quận 1',
            address: '123 Nguyễn Huệ, Q1, TP.HCM',
            status: 'active',
            batteries: 15,
            charging: 8,
            maintenance: 2,
            rating: 4.8
        },
        {
            id: 2,
            name: 'Trạm Quận 2',
            address: '456 Võ Văn Tần, Q2, TP.HCM',
            status: 'maintenance',
            batteries: 5,
            charging: 12,
            maintenance: 1,
            rating: 4.6
        },
        {
            id: 3,
            name: 'Trạm Quận 3',
            address: '789 Lê Văn Sỹ, Q3, TP.HCM',
            status: 'offline',
            batteries: 0,
            charging: 0,
            maintenance: 20,
            rating: 4.9
        }
    ];

    const tableBody = document.getElementById('stationsTableBody');
    if (tableBody) {
        tableBody.innerHTML = stationsData.map(station => `
            <tr>
                <td>${station.name}</td>
                <td>${station.address}</td>
                <td>
                    <span class="status-badge status-${station.status}">
                        ${getStatusText(station.status)}
                    </span>
                </td>
                <td>${station.batteries}</td>
                <td>${station.charging}</td>
                <td>${station.maintenance}</td>
                <td>${station.rating}/5</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="editStation(${station.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteStation(${station.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

// Load users data
function loadUsersData() {
    const usersData = [
        {
            id: 1,
            name: 'Nguyễn Văn A',
            email: 'nguyenvana@email.com',
            phone: '0901234567',
            package: 'Gói tháng',
            swaps: 45,
            status: 'active'
        },
        {
            id: 2,
            name: 'Trần Thị B',
            email: 'tranthib@email.com',
            phone: '0907654321',
            package: 'Gói năm',
            swaps: 120,
            status: 'active'
        },
        {
            id: 3,
            name: 'Lê Văn C',
            email: 'levanc@email.com',
            phone: '0909876543',
            package: 'Gói cơ bản',
            swaps: 8,
            status: 'inactive'
        }
    ];

    const tableBody = document.getElementById('usersTableBody');
    if (tableBody) {
        tableBody.innerHTML = usersData.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.phone}</td>
                <td>${user.package}</td>
                <td>${user.swaps}</td>
                <td>
                    <span class="status-badge status-${user.status}">
                        ${getStatusText(user.status)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

// Load batteries data
function loadBatteriesData() {
    const batteriesData = [
        {
            id: 'BAT001',
            station: 'Trạm Quận 1',
            capacity: '75kWh',
            soh: 95,
            status: 'available',
            cycles: 150,
            created: '2024-01-15'
        },
        {
            id: 'BAT002',
            station: 'Trạm Quận 2',
            capacity: '50kWh',
            soh: 78,
            status: 'charging',
            cycles: 200,
            created: '2024-01-10'
        },
        {
            id: 'BAT003',
            station: 'Trạm Quận 3',
            capacity: '100kWh',
            soh: 45,
            status: 'maintenance',
            cycles: 300,
            created: '2023-12-20'
        }
    ];

    const tableBody = document.getElementById('batteriesTableBody');
    if (tableBody) {
        tableBody.innerHTML = batteriesData.map(battery => `
            <tr>
                <td>${battery.id}</td>
                <td>${battery.station}</td>
                <td>${battery.capacity}</td>
                <td>${battery.soh}%</td>
                <td>
                    <span class="status-badge status-${battery.status}">
                        ${getStatusText(battery.status)}
                    </span>
                </td>
                <td>${battery.cycles}</td>
                <td>${battery.created}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="editBattery('${battery.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteBattery('${battery.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

// Get status text
function getStatusText(status) {
    const statusMap = {
        'active': 'Hoạt động',
        'inactive': 'Không hoạt động',
        'maintenance': 'Bảo trì',
        'offline': 'Offline',
        'available': 'Có sẵn',
        'charging': 'Đang sạc',
        'faulty': 'Lỗi',
        'in-use': 'Đang sử dụng',
        'Khả dụng': 'Khả dụng',
        'Đang sử dụng': 'Đang sử dụng',
        'Đang sạc': 'Đang sạc',
        'Bảo trì': 'Bảo trì',
        'Lỗi': 'Lỗi'
    };
    return statusMap[status] || status;
}

// Handle form submission
function handleFormSubmit(form) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Simulate form submission
    console.log('Form submitted:', data);
    
    // Show success message
    showNotification('Cập nhật thành công!', 'success');
    
    // Close modal if it's a modal form
    const modal = form.closest('.modal');
    if (modal) {
        closeModal(modal.id);
    }
}

// Handle filter change
function handleFilterChange(filter) {
    const filterType = filter.id;
    const filterValue = filter.value;
    
    console.log(`Filter changed: ${filterType} = ${filterValue}`);
    
    // Reload data based on filter
    if (currentSection === 'stations') {
        loadStationsData();
    } else if (currentSection === 'users') {
        loadUsersData();
    } else if (currentSection === 'batteries') {
        loadBatteriesData();
    }
}

// Show add station modal
function showAddStationModal() {
    const modal = document.getElementById('addStationModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Show add package modal
function showAddPackageModal() {
    const modal = document.getElementById('addPackageModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Generate report
function generateReport() {
    showNotification('Đang tạo báo cáo...', 'info');
    
    // Simulate report generation
    setTimeout(() => {
        showNotification('Báo cáo đã được tạo thành công!', 'success');
    }, 2000);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Edit functions
function editStation(id) {
    showNotification(`Chỉnh sửa trạm ${id}`, 'info');
}

function editUser(id) {
    showNotification(`Chỉnh sửa người dùng ${id}`, 'info');
}

function editBattery(id) {
    showNotification(`Chỉnh sửa pin ${id}`, 'info');
}

// Delete functions
function deleteStation(id) {
    if (confirm('Bạn có chắc chắn muốn xóa trạm này?')) {
        showNotification(`Đã xóa trạm ${id}`, 'success');
        loadStationsData();
    }
}

function deleteUser(id) {
    if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
        showNotification(`Đã xóa người dùng ${id}`, 'success');
        loadUsersData();
    }
}

function deleteBattery(id) {
    if (confirm('Bạn có chắc chắn muốn xóa pin này?')) {
        showNotification(`Đã xóa pin ${id}`, 'success');
        loadBatteriesData();
    }
}

// Logout function
function logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        showNotification('Đã đăng xuất thành công!', 'success');
        // Redirect to login page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .status-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
    }
    
    .status-active {
        background: #dcfce7;
        color: #166534;
    }
    
    .status-inactive {
        background: #fee2e2;
        color: #991b1b;
    }
    
    .status-maintenance {
        background: #fef3c7;
        color: #92400e;
    }
    
    .status-offline {
        background: #f3f4f6;
        color: #374151;
    }
    
    .status-available {
        background: #dcfce7;
        color: #166534;
    }
    
    .status-charging {
        background: #fef3c7;
        color: #92400e;
    }
    
    .status-faulty {
        background: #fee2e2;
        color: #991b1b;
    }
    
    .btn-sm {
        padding: 6px 12px;
        font-size: 12px;
    }
`;
document.head.appendChild(style);