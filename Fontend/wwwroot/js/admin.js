// Admin Dashboard JavaScript
let currentSection = 'dashboard';
let charts = {};

// Track last loaded date for auto-refresh when date changes
let lastLoadedDate = new Date().toDateString();
let dateCheckInterval = null; // Store interval ID to avoid creating multiple intervals

// Initialize the admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra authentication một lần nữa (backup check)
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
        // Nếu không có token, redirect ngay
        window.location.replace('admin-login.html');
        return;
    }
    
    // Ẩn loading screen
    const authCheck = document.getElementById('auth-check');
    if (authCheck) {
        authCheck.classList.add('hidden');
    }
    
    // Đánh dấu đã authenticated
    document.documentElement.classList.add('authenticated');
    document.body.classList.add('authenticated');
    
    initializeDashboard();
    setupEventListeners();
    loadDashboardData();
    initializeCharts();
    loadAdminInfo();
});

// Kiểm tra authentication
async function checkAdminAuth() {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
        return false;
    }
    
    // Có thể gọi API để verify token nếu cần
    // Tạm thời chỉ kiểm tra có token trong localStorage
    return true;
}

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
    // Mặc định load tab "Người dùng" (driver)
    currentUserRoleFilter = 'driver';
    const driverTab = document.getElementById('tab-driver');
    if (driverTab) {
        driverTab.classList.add('active');
    }
    loadUsersData('driver');
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

    // Chart period selector
    const periodSelect = document.querySelector('.chart-period');
    if (periodSelect) {
        periodSelect.addEventListener('change', function() {
            loadSwapsChartData();
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
        
        // Load data khi vào section packages
        if (sectionId === 'packages') {
            loadPackagesData();
        }
        
        // Load data khi vào section users - mặc định load tab "Người dùng"
        if (sectionId === 'users') {
            currentUserRoleFilter = 'driver';
            document.querySelectorAll('.user-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            const driverTab = document.getElementById('tab-driver');
            if (driverTab) {
                driverTab.classList.add('active');
            }
            loadUsersData('driver');
        }
        
        // Load data khi vào section complaints
        if (sectionId === 'complaints') {
            loadComplaints();
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
        'complaints': 'Xử lý khiếu nại',
        'settings': 'Cài đặt'
    };
    return titles[sectionId] || 'Dashboard';
}

// Check if date changed and reload dashboard data
function checkDateChange() {
    const currentDate = new Date().toDateString();
    if (currentDate !== lastLoadedDate) {
        lastLoadedDate = currentDate;
        // Date changed, reload dashboard data
        console.log('Ngày mới phát hiện, đang tải lại dữ liệu dashboard...');
        updateDashboardStats();
        loadChartsData();
    }
}

// Load dashboard data
function loadDashboardData() {
    // Set initial loaded date
    lastLoadedDate = new Date().toDateString();
    // Load dashboard stats
    updateDashboardStats();
    // Load charts data
    loadChartsData();
    
    // Check for date change every minute (only create interval once)
    if (!dateCheckInterval) {
        dateCheckInterval = setInterval(checkDateChange, 60 * 1000); // Check every 1 minute
    }
}

// Update dashboard stats
async function updateDashboardStats() {
    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            console.error('Không có token admin');
            return;
        }

        const response = await fetch('http://localhost:5000/gateway/batteryadmin/dashboard/stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Không thể tải thống kê dashboard');
        }

        const stats = await response.json();

        // Update stat cards
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach((card, index) => {
            const valueElement = card.querySelector('h3');
            if (valueElement) {
                const values = [
                    stats.totalStations || 0,
                    stats.activeUsers || 0,
                    stats.todaySwaps || 0,
                    formatCurrency(stats.todayRevenue || 0)
                ];
                valueElement.textContent = values[index] || '0';
            }
        });
    } catch (error) {
        console.error('Lỗi khi tải thống kê dashboard:', error);
        // Fallback to default values if API fails
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach((card, index) => {
            const valueElement = card.querySelector('h3');
            if (valueElement) {
                const values = [0, 0, 0, '₫0'];
                valueElement.textContent = values[index] || '0';
            }
        });
    }
}

// Format currency helper
function formatCurrency(amount) {
    if (amount >= 1000000) {
        return `₫${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
        return `₫${(amount / 1000).toFixed(0)}K`;
    }
    return `₫${amount}`;
}

// Load charts data from API
async function loadChartsData() {
    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            console.error('Không có token admin');
            return;
        }

        // Load swaps chart data
        await loadSwapsChartData();
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu biểu đồ:', error);
    }
}

// Load swaps chart data
async function loadSwapsChartData() {
    try {
        const adminToken = localStorage.getItem('adminToken');
        
        // Get selected period from dropdown (default 30 days)
        const periodSelect = document.querySelector('.chart-period');
        const days = periodSelect ? parseInt(periodSelect.value) || 30 : 30;
        
        const response = await fetch(`http://localhost:5000/gateway/driver/bookings/chart?days=${days}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Không thể tải dữ liệu biểu đồ');
        }

        const chartData = await response.json();

        // Update chart if it exists
        if (charts.swaps && chartData.labels && chartData.data) {
            charts.swaps.data.labels = chartData.labels;
            charts.swaps.data.datasets[0].data = chartData.data;
            charts.swaps.update();
        }
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu biểu đồ lượt đổi pin:', error);
    }
}

// Initialize charts
function initializeCharts() {
    initializeSwapsChart();
    initializeBatteryHealthChart();
    initializeReportsCharts();
}

// Initialize swaps chart
function initializeSwapsChart() {
    const ctx = document.getElementById('swapsChart');
    if (!ctx) return;

    // Initialize with empty data, will be updated by loadChartsData
    charts.swaps = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
            datasets: [{
                label: 'Lượt đổi pin',
                data: [0, 0, 0, 0, 0, 0, 0],
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

// Biến global để lưu filter role hiện tại
let currentUserRoleFilter = 'driver'; // Mặc định là driver
let allUsersData = [];

// Load users data từ API
async function loadUsersData(role = 'driver') {
    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            showNotification('Không có quyền truy cập', 'error');
            return;
        }

        const tableBody = document.getElementById('usersTableBody');
        if (!tableBody) return;

        // Hiển thị loading
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-spinner fa-spin"></i> Đang tải...
                </td>
            </tr>
        `;

        let url = 'http://localhost:5000/gateway/batteryadmin/users';
        if (role) {
            url += `?role=${role}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Không thể tải danh sách người dùng');
        }

        const users = await response.json();
        
        // Lưu vào biến global
        if (!role || role === 'all') {
            allUsersData = users;
        }

        // Tính toán stats
        const totalUsers = users.length;
        const drivers = users.filter(u => u.role === 'driver' || u.role === 'Driver');
        const staffs = users.filter(u => u.role === 'staff' || u.role === 'Staff');
        
        // Phân loại gói thuê theo thời hạn
        // Cần lấy thông tin chi tiết gói để biết thoihan
        let monthlyPackagesCount = 0;
        let yearlyPackagesCount = 0;
        
        // Lấy danh sách gói từ API để biết thời hạn
        try {
            const packagesResponse = await fetch('http://localhost:5000/gateway/batteryadmin/goi-thue', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (packagesResponse.ok) {
                const packages = await packagesResponse.json();
                const packagesMap = new Map();
                packages.forEach(pkg => {
                    packagesMap.set(pkg.tendichvu || pkg.Tendichvu, pkg.thoihan || pkg.Thoihan || 0);
                });
                
                // Đếm users có gói tháng (thoihan < 12) và gói năm (thoihan >= 12)
                // Gói 12 tháng = 1 năm nên tính là gói năm
                users.forEach(user => {
                    if (user.goi_thue && user.goi_thue !== null && user.goi_thue !== 'Chưa đăng ký' && user.goi_thue !== '--') {
                        const thoihan = packagesMap.get(user.goi_thue);
                        if (thoihan !== undefined && thoihan > 0) {
                            if (thoihan < 12) {
                                monthlyPackagesCount++;
                            } else {
                                // >= 12 tháng = gói năm
                                yearlyPackagesCount++;
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Lỗi khi lấy danh sách gói:', error);
            // Fallback: đếm tất cả gói là gói tháng nếu không lấy được thông tin
            const withPackage = users.filter(u => u.goi_thue && u.goi_thue !== null && u.goi_thue !== 'Chưa đăng ký' && u.goi_thue !== '--');
            monthlyPackagesCount = withPackage.length;
        }

        // Cập nhật stats
        document.getElementById('totalUsers').textContent = totalUsers.toLocaleString('vi-VN');
        document.getElementById('newUsers').textContent = drivers.length.toLocaleString('vi-VN');
        document.getElementById('monthlyPackages').textContent = monthlyPackagesCount.toLocaleString('vi-VN');
        document.getElementById('yearlyPackages').textContent = yearlyPackagesCount.toLocaleString('vi-VN');

        // Render table
        if (users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
                        Không có dữ liệu
                    </td>
                </tr>
            `;
            return;
        }

        // Ẩn/hiện cột "Gói thuê" dựa trên role filter
        const isStaffTab = currentUserRoleFilter === 'staff';
        const goiThueColumn = document.querySelector('.goi-thue-column');
        if (goiThueColumn) {
            goiThueColumn.style.display = isStaffTab ? 'none' : '';
        }
        
        tableBody.innerHTML = users.map(user => {
            const isStaff = user.role === 'staff' || user.role === 'Staff';
            const goiThue = isStaff ? '--' : (user.goi_thue || 'Chưa đăng ký');
            const roleText = isStaff ? 'Nhân viên' : 'Người dùng';
            const roleBadge = isStaff
                ? '<span class="status-badge" style="background: #3b82f6; color: white;">Nhân viên</span>'
                : '<span class="status-badge" style="background: #10b981; color: white;">Người dùng</span>';

            return `
                <tr>
                    <td>${user.id || user.Id}</td>
                    <td>${user.name || user.Name || '--'}</td>
                    <td>${user.email || user.Email || '--'}</td>
                    <td>${user.sodienthoai || user.SoDienThoai || '--'}</td>
                    <td>${roleBadge}</td>
                    <td class="goi-thue-cell" style="display: ${isStaffTab ? 'none' : ''};">${goiThue}</td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id || user.Id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Ẩn/hiện các cell "Gói thuê" trong tbody
        document.querySelectorAll('.goi-thue-cell').forEach(cell => {
            cell.style.display = isStaffTab ? 'none' : '';
        });

    } catch (error) {
        console.error('Lỗi khi load dữ liệu users:', error);
        const tableBody = document.getElementById('usersTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #ef4444;">
                        <i class="fas fa-exclamation-triangle"></i> Lỗi tải dữ liệu: ${error.message}
                    </td>
                </tr>
            `;
        }
        showNotification('Không thể tải danh sách người dùng', 'error');
    }
}

// Switch user tab
function switchUserTab(role) {
    currentUserRoleFilter = role;
    
    // Update tab active state
    document.querySelectorAll('.user-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`tab-${role}`).classList.add('active');
    
    // Load data với filter
    loadUsersData(role);
}

// Show add user modal
function showAddUserModal() {
    const form = document.getElementById('addUserForm');
    if (form) {
        form.reset();
    }
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Handle create user
async function handleCreateUser(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role') || 'driver',
        sodienthoai: formData.get('sodienthoai') || null,
        age: formData.get('age') || null,
        gioitinh: formData.get('gioitinh') || null
    };

    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            showNotification('Không có quyền truy cập', 'error');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo...';

        const response = await fetch('http://localhost:5000/gateway/batteryadmin/users', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Không thể tạo người dùng');
        }

        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;

        showNotification('Tạo người dùng thành công!', 'success');
        closeModal('addUserModal');
        
        // Reload danh sách
        await loadUsersData(currentUserRoleFilter || 'driver');
    } catch (error) {
        console.error('Lỗi khi tạo user:', error);
        showNotification(error.message || 'Không thể tạo người dùng', 'error');
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Tạo người dùng';
        }
    }
}

// Edit user - Load dữ liệu và hiển thị modal
async function editUser(id) {
    try {
        // Tìm user trong danh sách đã load
        const user = allUsersData.find(u => (u.id || u.Id) === id);
        
        if (!user) {
            showNotification('Không tìm thấy thông tin người dùng', 'error');
            return;
        }

        // Điền dữ liệu vào form
        document.getElementById('editUserId').value = user.id || user.Id;
        document.getElementById('editUserName').value = user.name || user.Name || '';
        document.getElementById('editUserEmail').value = user.email || user.Email || '';
        document.getElementById('editUserRole').value = user.role || user.Role || 'driver';
        document.getElementById('editUserPhone').value = user.sodienthoai || user.SoDienThoai || '';
        document.getElementById('editUserAge').value = user.age || user.Age || '';
        document.getElementById('editUserGender').value = user.gioitinh || user.GioiTinh || '';
        document.getElementById('editUserPassword').value = '';

        // Hiển thị modal
        const modal = document.getElementById('editUserModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    } catch (error) {
        console.error('Lỗi khi load thông tin user:', error);
        showNotification('Không thể tải thông tin người dùng', 'error');
    }
}

// Handle update user
async function handleUpdateUser(event) {
    event.preventDefault();
    
    const form = event.target;
    const userId = document.getElementById('editUserId').value;
    const formData = new FormData(form);
    
    const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        role: formData.get('role') || 'driver',
        sodienthoai: formData.get('sodienthoai') || null,
        age: formData.get('age') || null,
        gioitinh: formData.get('gioitinh') || null
    };

    // Chỉ thêm password nếu có nhập
    const password = formData.get('password');
    if (password && password.trim() !== '') {
        userData.password = password;
    }

    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            showNotification('Không có quyền truy cập', 'error');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang cập nhật...';

        const response = await fetch(`http://localhost:5000/gateway/batteryadmin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Không thể cập nhật người dùng');
        }

        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;

        showNotification('Cập nhật người dùng thành công!', 'success');
        closeModal('editUserModal');
        
        // Reload danh sách
        await loadUsersData(currentUserRoleFilter || 'driver');
    } catch (error) {
        console.error('Lỗi khi cập nhật user:', error);
        showNotification(error.message || 'Không thể cập nhật người dùng', 'error');
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Cập nhật';
        }
    }
}

// Load danh sách trạm (bước đầu tiên)
let currentStationId = null;
let batteriesDataCache = []; // Cache dữ liệu pin để sắp xếp
let batteriesDataOriginal = []; // Dữ liệu pin gốc (chưa filter)
let currentSortColumn = null;
let currentSortDirection = 'asc'; // 'asc' or 'desc'
let currentStatusFilter = 'all'; // Filter trạng thái hiện tại

async function loadStationsList() {
    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            console.error('Không có token admin');
            return;
        }

        // Lấy danh sách trạm từ StationService
        const response = await fetch('http://localhost:5000/gateway/station/danhsach', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            console.error('Lỗi khi lấy danh sách trạm:', response.status);
            return;
        }

        const stations = await response.json();
        const stationsListSection = document.getElementById('stationsListSection');
        const batteriesDetailSection = document.getElementById('batteriesDetailSection');
        const backToStationsBtn = document.getElementById('backToStationsBtn');
        const refreshBatteriesBtn = document.getElementById('refreshBatteriesBtn');

        // Hiển thị danh sách trạm, ẩn chi tiết pin
        if (stationsListSection) {
            stationsListSection.style.display = 'grid';
        }
        if (batteriesDetailSection) {
            batteriesDetailSection.style.display = 'none';
        }
        if (backToStationsBtn) {
            backToStationsBtn.style.display = 'none';
        }
        if (refreshBatteriesBtn) {
            refreshBatteriesBtn.style.display = 'none';
        }
        const coordinationBtn = document.getElementById('coordinationBtn');
        if (coordinationBtn) {
            coordinationBtn.style.display = 'none';
        }

        if (stationsListSection) {
            if (!stations || stations.length === 0) {
                stationsListSection.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">Chưa có trạm nào</div>';
                return;
            }

            stationsListSection.innerHTML = stations.map(station => {
                return `
                    <div class="station-card" style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s;" 
                         onclick="viewStationBatteries(${station.id})" 
                         onmouseover="this.style.transform='scale(1.02)'" 
                         onmouseout="this.style.transform='scale(1)'">
                        <div style="display: flex; align-items: center; margin-bottom: 15px;">
                            <div style="width: 50px; height: 50px; background: #3b82f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                                <i class="fas fa-charging-station" style="color: white; font-size: 24px;"></i>
                            </div>
                            <div>
                                <h3 style="margin: 0; color: #1f2937; font-size: 18px;">${station.tentram || `Trạm ${station.id}`}</h3>
                                <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">
                                    <i class="fas fa-map-marker-alt"></i> ${station.diachi || 'Chưa có địa chỉ'}
                                </p>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                            <div>
                                <span style="color: #6b7280; font-size: 12px;">Trạng thái:</span>
                                <span class="status-badge status-${station.trangthai === 'Hoạt động' ? 'active' : 'inactive'}" style="margin-left: 8px;">
                                    ${station.trangthai || 'Không xác định'}
                                </span>
                            </div>
                            <button class="btn btn-primary btn-sm" style="padding: 6px 16px;">
                                <i class="fas fa-arrow-right"></i> Xem pin
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        currentStationId = null;
    } catch (error) {
        console.error('Lỗi khi load danh sách trạm:', error);
        const stationsListSection = document.getElementById('stationsListSection');
        if (stationsListSection) {
            stationsListSection.innerHTML = '<div style="text-align: center; padding: 40px; color: red;">Lỗi khi tải danh sách trạm</div>';
        }
    }
}

// Xem pin của trạm cụ thể
async function viewStationBatteries(stationId) {
    currentStationId = stationId;
    
    // Ẩn danh sách trạm, hiển thị chi tiết pin
    const stationsListSection = document.getElementById('stationsListSection');
    const batteriesDetailSection = document.getElementById('batteriesDetailSection');
    const backToStationsBtn = document.getElementById('backToStationsBtn');
    const refreshBatteriesBtn = document.getElementById('refreshBatteriesBtn');
    const coordinationBtn = document.getElementById('coordinationBtn');

    if (stationsListSection) {
        stationsListSection.style.display = 'none';
    }
    if (batteriesDetailSection) {
        batteriesDetailSection.style.display = 'block';
    }
    if (backToStationsBtn) {
        backToStationsBtn.style.display = 'inline-block';
    }
    if (refreshBatteriesBtn) {
        refreshBatteriesBtn.style.display = 'inline-block';
    }
    if (coordinationBtn) {
        coordinationBtn.style.display = 'inline-block';
    }

    // Load pin của trạm
    await loadBatteriesData(stationId);
}

// Load batteries data từ API theo trạm
async function loadBatteriesData(stationId = null) {
    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            console.error('Không có token admin');
            return;
        }

        // Sử dụng stationId từ parameter hoặc currentStationId
        const targetStationId = stationId || currentStationId;

        // Lấy thống kê pin
        // Ocelot route: /gateway/batteryadmin/{everything} -> /api/Admin/{everything}
        // PinController route: api/Admin/[controller] = api/Admin/Pin
        // Gọi: /gateway/batteryadmin/Pin/stats
        const statsResponse = await fetch('http://localhost:5000/gateway/batteryadmin/Pin/stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            
            // Cập nhật tổng quan pin
            const overviewStats = document.querySelectorAll('.overview-stat');
            if (overviewStats.length >= 4) {
                overviewStats[0].querySelector('.value').textContent = stats.total || 0;
                overviewStats[1].querySelector('.value').textContent = stats.inUse || 0;
                overviewStats[2].querySelector('.value').textContent = stats.charging || 0;
                overviewStats[3].querySelector('.value').textContent = stats.maintenance || 0;
            }
        }

        // Lấy danh sách pin (filter theo trạm nếu có)
        // Ocelot route: /gateway/batteryadmin/{everything} -> /api/Admin/{everything}
        // PinController route: api/Admin/[controller] = api/Admin/Pin
        // Gọi: /gateway/batteryadmin/Pin
        let pinUrl = 'http://localhost:5000/gateway/batteryadmin/Pin';
        if (targetStationId) {
            pinUrl += `?idtram=${targetStationId}`;
        }

        const response = await fetch(pinUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            console.error('Lỗi khi lấy danh sách pin:', response.status);
            return;
        }

        const batteriesData = await response.json();
        const tableBody = document.getElementById('batteriesTableBody');
        
        if (tableBody) {
            if (!batteriesData || batteriesData.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Chưa có pin nào trong trạm này</td></tr>';
                batteriesDataCache = [];
                batteriesDataOriginal = [];
                return;
            }

            // Lưu cache dữ liệu để sắp xếp và filter
            batteriesDataCache = batteriesData;
            batteriesDataOriginal = batteriesData; // Lưu dữ liệu gốc
            
            // Áp dụng filter hiện tại (nếu có)
            applyBatteryFilter();
        }
    } catch (error) {
        console.error('Lỗi khi load dữ liệu pin:', error);
        const tableBody = document.getElementById('batteriesTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: red;">Lỗi khi tải dữ liệu pin</td></tr>';
        }
        batteriesDataCache = [];
        batteriesDataOriginal = [];
    }
}

// Filter pin theo trạng thái
function filterBatteriesByStatus() {
    const filterSelect = document.getElementById('batteryStatusFilter');
    if (!filterSelect) return;
    
    currentStatusFilter = filterSelect.value;
    applyBatteryFilter();
}

// Áp dụng filter và render lại bảng
function applyBatteryFilter() {
    if (!batteriesDataOriginal || batteriesDataOriginal.length === 0) {
        return;
    }
    
    let filteredData = [...batteriesDataOriginal];
    
    // Lọc theo trạng thái nếu không phải "all"
    if (currentStatusFilter !== 'all') {
        filteredData = filteredData.filter(battery => {
            const status = (battery.tinhtrang || '').trim();
            return status === currentStatusFilter;
        });
    }
    
    // Áp dụng sắp xếp nếu có
    if (currentSortColumn) {
        filteredData = sortBatteryData(filteredData, currentSortColumn, currentSortDirection);
    }
    
    // Cập nhật cache và render
    batteriesDataCache = filteredData;
    renderBatteriesTable(filteredData);
}

// Sắp xếp dữ liệu pin (hàm riêng để tái sử dụng)
function sortBatteryData(data, column, direction) {
    return [...data].sort((a, b) => {
        let aValue, bValue;

        switch (column) {
            case 'idpin':
                aValue = a.idpin || 0;
                bValue = b.idpin || 0;
                break;
            case 'loaipin':
                aValue = (a.loaipin || '').toLowerCase();
                bValue = (b.loaipin || '').toLowerCase();
                break;
            case 'dienap':
                aValue = a.dienap || 0;
                bValue = b.dienap || 0;
                break;
            case 'congsuat':
                aValue = a.congsuat || 0;
                bValue = b.congsuat || 0;
                break;
            case 'giadoipin':
                aValue = a.giadoipin || 0;
                bValue = b.giadoipin || 0;
                break;
            case 'soh':
                aValue = a.soh || 0;
                bValue = b.soh || 0;
                break;
            case 'soc':
                aValue = a.soc || 0;
                bValue = b.soc || 0;
                break;
            case 'tinhtrang':
                // Sắp xếp theo thứ tự ưu tiên: Pin đang sạc -> Pin đầy -> các trạng thái khác
                const getStatusPriority = (status) => {
                    const statusLower = (status || '').toLowerCase();
                    if (statusLower.includes('đang sạc') || statusLower.includes('đang chờ')) {
                        return 1; // Ưu tiên cao nhất
                    } else if (statusLower.includes('đầy')) {
                        return 2; // Ưu tiên thứ hai
                    } else {
                        return 3; // Các trạng thái khác
                    }
                };
                aValue = getStatusPriority(a.tinhtrang);
                bValue = getStatusPriority(b.tinhtrang);
                
                // Nếu cùng mức ưu tiên, sắp xếp theo tên trạng thái
                if (aValue === bValue) {
                    aValue = (a.tinhtrang || '').toLowerCase();
                    bValue = (b.tinhtrang || '').toLowerCase();
                    if (direction === 'asc') {
                        return aValue.localeCompare(bValue);
                    } else {
                        return bValue.localeCompare(aValue);
                    }
                }
                break;
            default:
                return 0;
        }

        // So sánh
        if (typeof aValue === 'string') {
            if (direction === 'asc') {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        } else {
            if (direction === 'asc') {
                return aValue - bValue;
            } else {
                return bValue - aValue;
            }
        }
    });
}

// Render bảng pin
function renderBatteriesTable(batteriesData) {
    const tableBody = document.getElementById('batteriesTableBody');
    if (!tableBody) return;

    // Load thông tin chi tiết loại pin - đã được PinController gọi từ backend
    // PinController đã gọi StationService và trả về đầy đủ thông tin (dienap, congsuat, giadoipin)
    tableBody.innerHTML = batteriesData.map((battery) => {
                // Dữ liệu đã có sẵn từ backend (PinController đã gọi StationService)
                let loaiPinInfo = {
                    tenloaipin: battery.loaipin || `Pin ${battery.idloaipin}`,
                    dienap: battery.dienap || null,
                    congsuat: battery.congsuat || null,
                    giadoipin: battery.giadoipin || null
                };

                // Chuyển đổi tình trạng sang format cho UI
                let statusClass = 'available';
                let statusText = battery.tinhtrang || 'Khả dụng';
                
                if (statusText.includes('sử dụng') || statusText.includes('Sử dụng')) {
                    statusClass = 'in-use';
                } else if (statusText.includes('sạc') || statusText.includes('Sạc')) {
                    statusClass = 'charging';
                } else if (statusText.includes('Bảo trì') || statusText.includes('bảo trì')) {
                    statusClass = 'maintenance';
                } else if (statusText.includes('Lỗi') || statusText.includes('lỗi')) {
                    statusClass = 'faulty';
                }

                return `
                    <tr>
                        <td>${battery.idpin}</td>
                        <td>${loaiPinInfo.tenloaipin}</td>
                        <td>${loaiPinInfo.dienap !== null && loaiPinInfo.dienap !== undefined ? loaiPinInfo.dienap + 'V' : '--'}</td>
                        <td>${loaiPinInfo.congsuat !== null && loaiPinInfo.congsuat !== undefined ? loaiPinInfo.congsuat + 'Ah' : '--'}</td>
                        <td>${loaiPinInfo.giadoipin ? (loaiPinInfo.giadoipin.toLocaleString('vi-VN') + 'đ') : '--'}</td>
                        <td>${battery.soh?.toFixed(1) || 100}%</td>
                        <td>${battery.soc?.toFixed(1) || 100}%</td>
                        <td>
                            <span class="status-badge status-${statusClass}">
                                ${statusText}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-primary btn-sm" onclick="updateBatteryStatus(${battery.idpin}, '${statusText.replace(/'/g, "\\'")}', ${battery.soh || 100}, ${battery.soc || 100})" title="Cập nhật tình trạng pin">
                                <i class="fas fa-edit"></i> Cập nhật
                            </button>
                        </td>
                    </tr>
                `;
    }).join('');
}

// Sắp xếp danh sách pin
function sortBatteries(column) {
    if (!batteriesDataCache || batteriesDataCache.length === 0) {
        return;
    }

    // Đảo ngược hướng sắp xếp nếu click vào cùng một cột
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }

    // Áp dụng filter trước khi sắp xếp
    let dataToSort = currentStatusFilter === 'all' 
        ? [...batteriesDataOriginal] 
        : batteriesDataOriginal.filter(b => (b.tinhtrang || '').trim() === currentStatusFilter);
    
    // Sắp xếp dữ liệu
    const sortedData = sortBatteryData(dataToSort, column, currentSortDirection);

    // Cập nhật icon sắp xếp
    updateSortIcons(column, currentSortDirection);

    // Render lại bảng với dữ liệu đã sắp xếp
    renderBatteriesTable(sortedData);
    
    // Cập nhật cache với dữ liệu đã sắp xếp
    batteriesDataCache = sortedData;
}

// Cập nhật icon sắp xếp
function updateSortIcons(activeColumn, direction) {
    // Reset tất cả icon
    const allSortIcons = document.querySelectorAll('[id^="sort-"]');
    allSortIcons.forEach(icon => {
        icon.className = 'fas fa-sort';
        icon.style.color = '';
    });

    // Cập nhật icon của cột đang được sắp xếp
    const activeIcon = document.getElementById(`sort-${activeColumn}`);
    if (activeIcon) {
        if (direction === 'asc') {
            activeIcon.className = 'fas fa-sort-up';
            activeIcon.style.color = '#3b82f6';
        } else {
            activeIcon.className = 'fas fa-sort-down';
            activeIcon.style.color = '#3b82f6';
        }
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
        'charging': 'Pin đang sạc',
        'faulty': 'Lỗi',
        'in-use': 'Đang sử dụng',
        'Khả dụng': 'Khả dụng',
        'Đang sử dụng': 'Đang sử dụng',
        'Pin đầy': 'Pin đầy',
        'Pin đang sạc': 'Pin đang sạc',
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
        // Đảm bảo tab driver được active và load data
        currentUserRoleFilter = currentUserRoleFilter || 'driver';
        document.querySelectorAll('.user-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.getElementById(`tab-${currentUserRoleFilter}`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        loadUsersData(currentUserRoleFilter);
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

// Load packages data from AdminService
async function loadPackagesData() {
    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            console.error('Không có token admin');
            return;
        }

        const response = await fetch('http://localhost:5000/gateway/batteryadmin/goi-thue', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            console.error('Lỗi khi lấy danh sách gói:', response.status);
            const packagesGrid = document.getElementById('packagesGrid');
            if (packagesGrid) {
                packagesGrid.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #ef4444;">
                        <i class="fas fa-exclamation-triangle"></i> Không thể tải danh sách gói
                    </div>
                `;
            }
            return;
        }

        const packages = await response.json();
        const packagesGrid = document.getElementById('packagesGrid');
        
        if (!packagesGrid) return;

        if (!packages || packages.length === 0) {
            packagesGrid.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-inbox"></i> Chưa có gói thuê nào
                </div>
            `;
            return;
        }

        // Lưu packages vào biến global để dùng khi edit
        window.packagesData = packages;

        // Render packages
        packagesGrid.innerHTML = packages.map(pkg => {
            const price = (pkg.phi || 0).toLocaleString('vi-VN');
            const thoihan = pkg.thoihan ? `${pkg.thoihan} tháng` : 'Không giới hạn';
            const solandoipin = (pkg.solandoipin === '-1' || pkg.solandoipin === -1) ? 'Không giới hạn' : (pkg.solandoipin || '--');
            
            return `
                <div class="package-card">
                    <div class="package-header">
                        <h3>${pkg.tendichvu || 'Gói dịch vụ'}</h3>
                        <div class="package-price">${price}đ</div>
                    </div>
                    <div class="package-stats">
                        <div class="stat">
                            <span class="label">Thời hạn:</span>
                            <span class="value">${thoihan}</span>
                        </div>
                        <div class="stat">
                            <span class="label">Số lần đổi:</span>
                            <span class="value">${solandoipin}</span>
                        </div>
                    </div>
                    ${pkg.mota ? `<div style="padding: 10px; color: #64748b; font-size: 13px;">${pkg.mota}</div>` : ''}
                    <div class="package-actions">
                        <button class="btn btn-outline" onclick="editPackage(${pkg.id})">Chỉnh sửa</button>
                        <button class="btn btn-danger" onclick="deletePackage(${pkg.id})">Xóa</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Lỗi khi load dữ liệu gói:', error);
        const packagesGrid = document.getElementById('packagesGrid');
        if (packagesGrid) {
            packagesGrid.innerHTML = `
                <div style="text-align: center; padding: 40px; color: red;">
                    <i class="fas fa-exclamation-triangle"></i> Lỗi khi tải dữ liệu gói
                </div>
            `;
        }
    }
}

// Show add package modal
function showAddPackageModal() {
    const modal = document.getElementById('addPackageModal');
    if (modal) {
        // Reset form
        const form = document.getElementById('addPackageForm');
        if (form) {
            form.reset();
        }
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Handle create package
async function handleCreatePackage(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const packageData = {
        tendichvu: formData.get('tendichvu'),
        mota: formData.get('mota') || null,
        thoihan: formData.get('thoihan') ? parseInt(formData.get('thoihan')) : null,
        phi: parseFloat(formData.get('phi')),
        solandoipin: formData.get('solandoipin') || null
    };

    // Validate
    if (!packageData.tendichvu || !packageData.phi) {
        showNotification('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
        return;
    }

    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            showNotification('Không có quyền truy cập', 'error');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo...';

        const response = await fetch('http://localhost:5000/gateway/batteryadmin/goi-thue', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(packageData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Không thể tạo gói');
        }

        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;

        showNotification('Tạo gói thành công!', 'success');
        closeModal('addPackageModal');
        
        // Reload danh sách gói
        await loadPackagesData();
    } catch (error) {
        console.error('Lỗi khi tạo gói:', error);
        showNotification(error.message || 'Không thể tạo gói', 'error');
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Tạo gói';
        }
    }
}

// Edit package - Load dữ liệu và hiển thị modal
async function editPackage(id) {
    try {
        // Tìm gói trong danh sách đã load
        const pkg = window.packagesData?.find(p => p.id === id || p.Id === id);
        
        if (!pkg) {
            showNotification('Không tìm thấy thông tin gói', 'error');
            return;
        }

        // Điền dữ liệu vào form
        document.getElementById('editPackageId').value = pkg.id || pkg.Id;
        document.getElementById('editPackageName').value = pkg.tendichvu || pkg.Tendichvu || '';
        document.getElementById('editPackageMota').value = pkg.mota || pkg.Mota || '';
        document.getElementById('editPackageThoihan').value = pkg.thoihan || pkg.Thoihan || '';
        document.getElementById('editPackagePrice').value = pkg.phi || pkg.Phi || '';
        document.getElementById('editPackageSolandoipin').value = pkg.solandoipin || pkg.Solandoipin || '';

        // Hiển thị modal
        const modal = document.getElementById('editPackageModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    } catch (error) {
        console.error('Lỗi khi load thông tin gói:', error);
        showNotification('Không thể tải thông tin gói', 'error');
    }
}

// Handle update package
async function handleUpdatePackage(event) {
    event.preventDefault();
    
    const form = event.target;
    const packageId = document.getElementById('editPackageId').value;
    const formData = new FormData(form);
    const packageData = {
        tendichvu: formData.get('tendichvu'),
        mota: formData.get('mota') || null,
        thoihan: formData.get('thoihan') ? parseInt(formData.get('thoihan')) : null,
        phi: parseFloat(formData.get('phi')),
        solandoipin: formData.get('solandoipin') || null
    };

    // Validate
    if (!packageData.tendichvu || !packageData.phi) {
        showNotification('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
        return;
    }

    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            showNotification('Không có quyền truy cập', 'error');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang cập nhật...';

        const response = await fetch(`http://localhost:5000/gateway/batteryadmin/goi-thue/${packageId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(packageData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Không thể cập nhật gói');
        }

        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;

        showNotification('Cập nhật gói thành công!', 'success');
        closeModal('editPackageModal');
        
        // Reload danh sách gói
        await loadPackagesData();
    } catch (error) {
        console.error('Lỗi khi cập nhật gói:', error);
        showNotification(error.message || 'Không thể cập nhật gói', 'error');
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Cập nhật';
        }
    }
}

// Delete package
async function deletePackage(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa gói này? Hành động này không thể hoàn tác.')) {
        return;
    }

    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            showNotification('Không có quyền truy cập', 'error');
            return;
        }

        const response = await fetch(`http://localhost:5000/gateway/batteryadmin/goi-thue/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Không thể xóa gói');
        }

        showNotification('Xóa gói thành công!', 'success');
        
        // Reload danh sách gói
        await loadPackagesData();
    } catch (error) {
        console.error('Lỗi khi xóa gói:', error);
        showNotification(error.message || 'Không thể xóa gói', 'error');
    }
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Reset form và button trong modal
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Cập nhật';
            }
        }
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

// Mở modal cập nhật tình trạng pin
function updateBatteryStatus(id, currentStatus, currentSoH, currentSoC) {
    document.getElementById('updateBatteryId').value = id;
    // Nếu currentStatus không phải "Pin đầy" hoặc "Pin đang sạc", mặc định là "Pin đầy"
    const validStatus = (currentStatus === 'Pin đầy' || currentStatus === 'Pin đang sạc') ? currentStatus : 'Pin đầy';
    document.getElementById('updateBatteryStatus').value = validStatus;
    if (document.getElementById('updateBatterySoH')) {
        document.getElementById('updateBatterySoH').value = currentSoH || 100;
    }
    if (document.getElementById('updateBatterySoC')) {
        document.getElementById('updateBatterySoC').value = currentSoC || 100;
    }
    
    const modal = document.getElementById('updateBatteryStatusModal');
    if (modal) {
        // Reset button về trạng thái ban đầu khi mở modal
        const form = modal.querySelector('form');
        if (form) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Cập nhật';
            }
        }
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Xử lý submit form cập nhật tình trạng pin
async function handleUpdateBatteryStatus(event) {
    event.preventDefault();
    
    const id = document.getElementById('updateBatteryId').value;
    const tinhtrang = document.getElementById('updateBatteryStatus').value;
    const sohInput = document.getElementById('updateBatterySoH');
    const socInput = document.getElementById('updateBatterySoC');
    const soh = sohInput ? parseFloat(sohInput.value) : null;
    const soc = socInput ? parseFloat(socInput.value) : null;
    
    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            showNotification('Không có quyền truy cập', 'error');
            return;
        }

        // Disable button và hiển thị loading
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang cập nhật...';

        // Tạo body với các giá trị có sẵn
        const bodyData = {
            tinhtrang: tinhtrang
        };
        
        // Chỉ thêm soh và soc nếu có field và giá trị hợp lệ
        if (sohInput && !isNaN(soh) && soh >= 0 && soh <= 100) {
            bodyData.soh = soh;
        }
        if (socInput && !isNaN(soc) && soc >= 0 && soc <= 100) {
            bodyData.soc = soc;
        }

        const response = await fetch(`http://localhost:5000/gateway/batteryadmin/Pin/${id}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(bodyData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'Cập nhật thất bại';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            showNotification(errorMessage, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            return;
        }

        const data = await response.json();

        if (response.ok) {
            // Reset button về trạng thái ban đầu TRƯỚC KHI đóng modal
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            
            showNotification('Cập nhật tình trạng pin thành công!', 'success');
            closeModal('updateBatteryStatusModal');
            
            // Reload lại danh sách pin để hiển thị dữ liệu mới
            if (currentStationId) {
                await loadBatteriesData(currentStationId);
            } else {
                await loadBatteriesData();
            }
        } else {
            showNotification(data.message || 'Cập nhật thất bại', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật pin:', error);
        showNotification('Không thể kết nối đến server', 'error');
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Delete functions
function deleteStation(id) {
    if (confirm('Bạn có chắc chắn muốn xóa trạm này?')) {
        showNotification(`Đã xóa trạm ${id}`, 'success');
        loadStationsData();
    }
}

// Delete user
async function deleteUser(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác.')) {
        return;
    }

    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            showNotification('Không có quyền truy cập', 'error');
            return;
        }

        const response = await fetch(`http://localhost:5000/gateway/batteryadmin/users/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Không thể xóa người dùng');
        }

        showNotification('Xóa người dùng thành công!', 'success');
        
        // Reload danh sách
        await loadUsersData(currentUserRoleFilter || 'driver');
    } catch (error) {
        console.error('Lỗi khi xóa user:', error);
        showNotification(error.message || 'Không thể xóa người dùng', 'error');
    }
}

function deleteBattery(id) {
    if (confirm('Bạn có chắc chắn muốn xóa pin này?')) {
        // TODO: Implement delete API nếu cần
        showNotification(`Chức năng xóa pin đang được phát triển`, 'info');
        // loadBatteriesData();
    }
}

// Hiển thị modal điều phối pin
async function showBatteryCoordinationModal() {
    const modal = document.getElementById('batteryCoordinationModal');
    if (!modal) return;

    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            showNotification('Không có quyền truy cập', 'error');
            return;
        }

        // Load danh sách trạm với tồn kho
        const response = await fetch('http://localhost:5000/gateway/batteryadmin/Pin/coordination/stations', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            showNotification('Không thể lấy danh sách trạm', 'error');
            return;
        }

        const stations = await response.json();
        
        // Populate dropdowns
        const fromStationSelect = document.getElementById('fromStationSelect');
        const toStationSelect = document.getElementById('toStationSelect');
        
        if (fromStationSelect && toStationSelect) {
            // Clear existing options except first
            fromStationSelect.innerHTML = '<option value="">-- Chọn trạm nguồn --</option>';
            toStationSelect.innerHTML = '<option value="">-- Chọn trạm đích --</option>';
            
            stations.forEach(station => {
                const option1 = document.createElement('option');
                option1.value = station.id;
                // Đếm số pin đầy có thể chuyển
                const fullBatteriesCount = station.inventory?.full || 0;
                option1.textContent = `${station.tentram} (${fullBatteriesCount} pin đầy)`;
                fromStationSelect.appendChild(option1);
                
                const option2 = document.createElement('option');
                option2.value = station.id;
                option2.textContent = `${station.tentram} (${station.inventory?.total || 0} pin)`;
                toStationSelect.appendChild(option2);
            });
        }

        // Reset battery list
        const batteryList = document.getElementById('availableBatteriesList');
        if (batteryList) {
            batteryList.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">Vui lòng chọn trạm nguồn để xem danh sách pin</p>';
        }

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Lỗi khi mở modal điều phối:', error);
        showNotification('Không thể mở modal điều phối', 'error');
    }
}

// Load danh sách pin của trạm nguồn
async function loadStationBatteries(type) {
    if (type !== 'from') return;

    const fromStationId = document.getElementById('fromStationSelect')?.value;
    if (!fromStationId) {
        const batteryList = document.getElementById('availableBatteriesList');
        if (batteryList) {
            batteryList.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">Vui lòng chọn trạm nguồn</p>';
        }
        return;
    }

    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            showNotification('Không có quyền truy cập', 'error');
            return;
        }

        const response = await fetch(`http://localhost:5000/gateway/batteryadmin/Pin/coordination/inventory/${fromStationId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            showNotification('Không thể lấy danh sách pin', 'error');
            return;
        }

        const data = await response.json();
        const batteryList = document.getElementById('availableBatteriesList');
        
        if (!batteryList) return;

        if (!data.pins || data.pins.length === 0) {
            batteryList.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">Trạm này không có pin nào</p>';
            return;
        }

        // Filter chỉ pin có thể chuyển (chỉ Pin đầy mới có thể chuyển trạm)
        const transferablePins = data.pins.filter(pin => 
            pin.tinhtrang === 'Pin đầy'
        );

        if (transferablePins.length === 0) {
            batteryList.innerHTML = '<p style="color: #f59e0b; text-align: center; padding: 20px;">Không có pin nào có thể chuyển (chỉ pin "Pin đầy" mới có thể chuyển trạm)</p>';
            return;
        }

        batteryList.innerHTML = `
            <div style="margin-bottom: 10px; padding: 10px; background: #f3f4f6; border-radius: 6px;">
                <strong>Tổng: ${transferablePins.length} pin có thể chuyển</strong>
            </div>
            <div style="display: grid; gap: 10px;">
                ${transferablePins.map(pin => `
                    <label style="display: flex; align-items: center; padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: background 0.2s;" 
                           onmouseover="this.style.background='#f9fafb'" 
                           onmouseout="this.style.background='white'">
                        <input type="checkbox" name="batteryIds" value="${pin.idpin}" style="margin-right: 12px; width: 18px; height: 18px; cursor: pointer;">
                        <div style="flex: 1;">
                            <div style="font-weight: 500; color: #1f2937;">Pin #${pin.idpin} - ${pin.loaipin}</div>
                            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                                SoH: ${pin.soh?.toFixed(1) || 100}% | SoC: ${pin.soc?.toFixed(1) || 100}% | 
                                <span class="status-badge status-${pin.tinhtrang === 'Pin đầy' ? 'available' : 'charging'}" style="margin-left: 4px;">
                                    ${pin.tinhtrang}
                                </span>
                            </div>
                        </div>
                    </label>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Lỗi khi load pin:', error);
        showNotification('Không thể tải danh sách pin', 'error');
    }
}

// Xử lý điều phối pin
async function handleBatteryCoordination(event) {
    event.preventDefault();
    
    const fromStationId = document.getElementById('fromStationSelect')?.value;
    const toStationId = document.getElementById('toStationSelect')?.value;
    const batteryCheckboxes = document.querySelectorAll('input[name="batteryIds"]:checked');
    
    if (!fromStationId || !toStationId) {
        showNotification('Vui lòng chọn cả trạm nguồn và trạm đích', 'error');
        return;
    }
    
    if (fromStationId === toStationId) {
        showNotification('Trạm nguồn và trạm đích không thể giống nhau', 'error');
        return;
    }
    
    if (batteryCheckboxes.length === 0) {
        showNotification('Vui lòng chọn ít nhất một pin để chuyển', 'error');
        return;
    }
    
    const batteryIds = Array.from(batteryCheckboxes).map(cb => parseInt(cb.value));
    
    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            showNotification('Không có quyền truy cập', 'error');
            return;
        }

        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

        const response = await fetch('http://localhost:5000/gateway/batteryadmin/Pin/coordination/transfer', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                fromStationId: parseInt(fromStationId),
                toStationId: parseInt(toStationId),
                batteryIds: batteryIds
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showNotification(data.message || 'Điều phối thất bại', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            return;
        }

        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;

        // Hiển thị kết quả
        const successCount = data.summary?.success || 0;
        const failedCount = data.summary?.failed || 0;
        
        if (successCount > 0) {
            showNotification(data.message || `Đã chuyển ${successCount} pin thành công`, 'success');
            closeModal('batteryCoordinationModal');
            
            // Reload lại danh sách pin nếu đang xem trạm
            if (currentStationId) {
                await loadBatteriesData(currentStationId);
            }
        } else {
            showNotification('Không có pin nào được chuyển thành công', 'error');
        }

        if (failedCount > 0 && data.failed && data.failed.length > 0) {
            const failedReasons = data.failed.map(f => `Pin #${f.idpin}: ${f.reason}`).join('\n');
            alert(`Các pin không thể chuyển:\n${failedReasons}`);
        }
    } catch (error) {
        console.error('Lỗi khi điều phối pin:', error);
        showNotification('Không thể kết nối đến server', 'error');
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Xác nhận điều phối';
    }
}

// Logout function
async function logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        try {
            // Gọi API logout
            const response = await fetch('http://localhost:5000/gateway/batteryadmin/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            // Xóa token khỏi localStorage
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('adminName');
            localStorage.removeItem('adminId');
            
            showNotification('Đã đăng xuất thành công!', 'success');
            
            // Redirect to login page
            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 1000);
        } catch (error) {
            console.error('Lỗi khi đăng xuất:', error);
            // Vẫn xóa localStorage và redirect dù có lỗi
            localStorage.clear();
            window.location.href = 'admin-login.html';
        }
    }
}

// ==================== COMPLAINTS MANAGEMENT ====================

let currentComplaintsPage = 1;
let currentComplaintsPageSize = 10;
let allComplaintsData = [];
let filteredComplaintsData = [];

// Load danh sách khiếu nại
async function loadComplaints(page = 1, pageSize = 10) {
    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            showNotification('Không có quyền truy cập', 'error');
            return;
        }

        const statusFilter = document.getElementById('complaintStatusFilter')?.value || '';
        const url = `http://localhost:5000/gateway/batteryadmin/xu-ly-khieu-nai?page=${page}&pageSize=${pageSize}${statusFilter ? `&trangThai=${encodeURIComponent(statusFilter)}` : ''}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Không thể tải danh sách khiếu nại');
        }

        const data = await response.json();
        allComplaintsData = data.data || [];
        currentComplaintsPage = data.page || 1;
        currentComplaintsPageSize = data.pageSize || 10;

        renderComplaintsTable(allComplaintsData);
        renderComplaintsPagination(data);
    } catch (error) {
        console.error('Lỗi khi load khiếu nại:', error);
        const tableBody = document.getElementById('complaintsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: red;">
                        <i class="fas fa-exclamation-triangle"></i> Lỗi khi tải danh sách khiếu nại
                    </td>
                </tr>
            `;
        }
        showNotification('Không thể tải danh sách khiếu nại', 'error');
    }
}

// Render bảng khiếu nại
function renderComplaintsTable(complaints) {
    const tableBody = document.getElementById('complaintsTableBody');
    if (!tableBody) return;

    if (!complaints || complaints.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-inbox"></i> Chưa có khiếu nại nào
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = complaints.map(complaint => {
        const user = complaint.user || {};
        const moTa = (complaint.mo_ta || complaint.moTa || '').substring(0, 50) + ((complaint.mo_ta || complaint.moTa || '').length > 50 ? '...' : '');
        const ngayTao = formatDate(complaint.ngay_tao || complaint.ngayTao);
        const trangThai = complaint.trang_thai || complaint.trangThai || 'Chờ xử lý';
        const doUuTien = complaint.do_uu_tien || complaint.doUuTien || 'Trung bình';
        
        const priorityColors = {
            'Khẩn cấp': '#ef4444',
            'Cao': '#f59e0b',
            'Trung bình': '#3b82f6',
            'Thấp': '#64748b'
        };
        const priorityColor = priorityColors[doUuTien] || '#64748b';
        
        const statusClass = trangThai === 'Đã xử lý' ? 'active' : 
                           trangThai === 'Đang xử lý' ? 'warning' : 'info';

        return `
            <tr>
                <td>#${complaint.id}</td>
                <td>${user.name || 'Không xác định'}</td>
                <td>${user.email || '--'}</td>
                <td>${user.sodienthoai || '--'}</td>
                <td title="${complaint.mo_ta || complaint.moTa || ''}">${moTa}</td>
                <td>
                    <span style="padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 500; background: ${priorityColor}15; color: ${priorityColor};">
                        <i class="fas fa-flag"></i> ${doUuTien}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${statusClass}">${trangThai}</span>
                </td>
                <td>${ngayTao}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="viewComplaintDetail(${complaint.id})">
                        <i class="fas fa-eye"></i> Xem chi tiết
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Render pagination
function renderComplaintsPagination(data) {
    const pagination = document.getElementById('complaintsPagination');
    if (!pagination) return;

    const totalPages = data.totalPages || 1;
    const currentPage = data.page || 1;

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '';

    // Previous button
    paginationHTML += `
        <button class="btn btn-outline btn-sm" ${currentPage === 1 ? 'disabled' : ''} 
                onclick="loadComplaints(${currentPage - 1}, ${currentComplaintsPageSize})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            paginationHTML += `
                <button class="btn ${i === currentPage ? 'btn-primary' : 'btn-outline'} btn-sm" 
                        onclick="loadComplaints(${i}, ${currentComplaintsPageSize})">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            paginationHTML += `<span style="padding: 8px;">...</span>`;
        }
    }

    // Next button
    paginationHTML += `
        <button class="btn btn-outline btn-sm" ${currentPage === totalPages ? 'disabled' : ''} 
                onclick="loadComplaints(${currentPage + 1}, ${currentComplaintsPageSize})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    pagination.innerHTML = paginationHTML;
}

// Filter complaints
function filterComplaints() {
    const statusFilter = document.getElementById('complaintStatusFilter')?.value || '';
    const searchTerm = (document.getElementById('complaintSearch')?.value || '').toLowerCase();
    
    loadComplaints(1, currentComplaintsPageSize);
    
    // Apply search filter on client side
    if (searchTerm) {
        setTimeout(() => {
            const rows = document.querySelectorAll('#complaintsTableBody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        }, 100);
    }
}

// Refresh complaints
function refreshComplaints() {
    loadComplaints(currentComplaintsPage, currentComplaintsPageSize);
}

// View complaint detail
async function viewComplaintDetail(complaintId) {
    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            showNotification('Không có quyền truy cập', 'error');
            return;
        }

        const response = await fetch(`http://localhost:5000/gateway/batteryadmin/xu-ly-khieu-nai/${complaintId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Không thể tải chi tiết khiếu nại');
        }

        const complaint = await response.json();
        
        // Fill modal với dữ liệu
        document.getElementById('complaintDetailId').textContent = complaint.id;
        document.getElementById('complaintResponseId').value = complaint.id;
        
        // Thông tin khách hàng
        const user = complaint.user || {};
        document.getElementById('complaintCustomerName').textContent = user.name || 'Không xác định';
        document.getElementById('complaintCustomerEmail').textContent = user.email || '--';
        document.getElementById('complaintCustomerPhone').textContent = user.sodienthoai || '--';
        document.getElementById('complaintCustomerAge').textContent = user.age ? `${user.age} tuổi` : '--';
        
        // Thông tin khiếu nại
        document.getElementById('complaintDetailStatus').innerHTML = `
            <span class="status-badge status-${(complaint.trang_thai || complaint.trangThai) === 'Đã xử lý' ? 'active' : 'info'}">
                ${complaint.trang_thai || complaint.trangThai || 'Chờ xử lý'}
            </span>
        `;
        document.getElementById('complaintDetailPriority').innerHTML = `
            <span style="padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 500; background: #3b82f615; color: #3b82f6;">
                ${complaint.do_uu_tien || complaint.doUuTien || 'Trung bình'}
            </span>
        `;
        document.getElementById('complaintDetailDate').textContent = formatDate(complaint.ngay_tao || complaint.ngayTao);
        document.getElementById('complaintDetailProcessedDate').textContent = complaint.ngay_xu_ly || complaint.ngayXuLy ? formatDate(complaint.ngay_xu_ly || complaint.ngayXuLy) : 'Chưa xử lý';
        document.getElementById('complaintDetailDescription').textContent = complaint.mo_ta || complaint.moTa || 'Không có mô tả';
        
        // Tin nhắn - sắp xếp theo thời gian và tách riêng admin/user
        const messages = complaint.messages || [];
        const messagesList = document.getElementById('complaintMessagesList');
        if (messagesList) {
            if (messages.length === 0) {
                messagesList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 20px;">Chưa có tin nhắn nào</p>';
            } else {
                // Sắp xếp tin nhắn theo thời gian (từ cũ đến mới) - hiển thị tất cả theo thứ tự thời gian
                const sortedMessages = [...messages].sort((a, b) => {
                    const dateA = new Date(a.ngay_gui || a.ngayGui || 0);
                    const dateB = new Date(b.ngay_gui || b.ngayGui || 0);
                    return dateA - dateB;
                });
                
                // Render tất cả tin nhắn theo thứ tự thời gian (không tách riêng user và admin)
                let html = '';
                
                sortedMessages.forEach(msg => {
                    const msgUser = msg.user || {};
                    const isAdmin = msgUser.role === 'admin' || (msgUser.email && msgUser.email.includes('admin'));
                    
                    // Style cho tin nhắn của admin
                    if (isAdmin) {
                        html += `
                            <div style="margin-bottom: 15px; padding: 16px; background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%); border-radius: 12px; border-left: 4px solid #3b82f6; box-shadow: 0 2px 6px rgba(0,0,0,0.08);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <div style="display: flex; align-items: center;">
                                        <i class="fas fa-user-shield" style="color: #3b82f6; margin-right: 10px; font-size: 18px;"></i>
                                        <strong style="color: #1e293b; font-size: 14px; font-weight: 600;">${msgUser.name || 'Admin'}</strong>
                                        <span style="margin-left: 10px; padding: 3px 8px; background: #3b82f6; color: white; border-radius: 5px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px;">ADMIN</span>
                                    </div>
                                    <span style="color: #64748b; font-size: 12px; background: #f1f5f9; padding: 5px 10px; border-radius: 6px; font-weight: 500;">${formatDate(msg.ngay_gui || msg.ngayGui)}</span>
                                </div>
                                <p style="margin: 0; color: #475569; line-height: 1.7; white-space: pre-wrap; font-size: 14px; padding-left: 28px;">${msg.noi_dung || msg.noiDung || ''}</p>
                            </div>
                        `;
                    } else {
                        // Style cho tin nhắn của user (khách hàng)
                        html += `
                            <div style="margin-bottom: 15px; padding: 16px; background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%); border-radius: 12px; border-left: 4px solid #10b981; box-shadow: 0 2px 6px rgba(0,0,0,0.08);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <div style="display: flex; align-items: center;">
                                        <i class="fas fa-user-circle" style="color: #10b981; margin-right: 10px; font-size: 18px;"></i>
                                        <strong style="color: #1e293b; font-size: 14px; font-weight: 600;">${msgUser.name || 'Khách hàng'}</strong>
                                    </div>
                                    <span style="color: #64748b; font-size: 12px; background: #f1f5f9; padding: 5px 10px; border-radius: 6px; font-weight: 500;">${formatDate(msg.ngay_gui || msg.ngayGui)}</span>
                                </div>
                                <p style="margin: 0; color: #475569; line-height: 1.7; white-space: pre-wrap; font-size: 14px; padding-left: 28px;">${msg.noi_dung || msg.noiDung || ''}</p>
                            </div>
                        `;
                    }
                });
                
                messagesList.innerHTML = html;
                
                // Scroll xuống cuối cùng
                messagesList.scrollTop = messagesList.scrollHeight;
            }
        }
        
        // Reset form
        document.getElementById('complaintResponseText').value = '';
        const currentStatus = complaint.trang_thai || complaint.trangThai || 'Chờ xử lý';
        // Set giá trị dropdown theo trạng thái hiện tại
        const statusSelect = document.getElementById('complaintResponseStatus');
        if (statusSelect) {
            // Giữ nguyên trạng thái hiện tại, hoặc nếu là "Chờ xử lý" thì chuyển sang "Đang xử lý"
            if (currentStatus === 'Chờ xử lý') {
                statusSelect.value = 'Đang xử lý';
            } else if (currentStatus === 'Đang xử lý') {
                statusSelect.value = 'Đang xử lý';
            } else if (currentStatus === 'Đã xử lý') {
                statusSelect.value = 'Đã xử lý';
            } else {
                // Nếu trạng thái không khớp, mặc định là "Đang xử lý"
                statusSelect.value = 'Đang xử lý';
            }
        }
        
        // Show modal
        const modal = document.getElementById('complaintDetailModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    } catch (error) {
        console.error('Lỗi khi load chi tiết khiếu nại:', error);
        showNotification('Không thể tải chi tiết khiếu nại', 'error');
    }
}

// Handle complaint response
async function handleComplaintResponse(event) {
    event.preventDefault();
    
    const complaintId = document.getElementById('complaintResponseId').value;
    const phanHoi = document.getElementById('complaintResponseText').value.trim();
    const trangThai = document.getElementById('complaintResponseStatus').value;
    
    if (!phanHoi) {
        showNotification('Vui lòng nhập nội dung phản hồi', 'error');
        return;
    }
    
    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            showNotification('Không có quyền truy cập', 'error');
            return;
        }

        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';

        const response = await fetch(`http://localhost:5000/gateway/batteryadmin/xu-ly-khieu-nai/${complaintId}/tra-loi`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                phan_hoi: phanHoi,
                trang_thai: trangThai
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể gửi phản hồi');
        }

        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;

        showNotification('Gửi phản hồi thành công!', 'success');
        
        // Reload danh sách và đóng modal
        setTimeout(() => {
            closeModal('complaintDetailModal');
            loadComplaints(currentComplaintsPage, currentComplaintsPageSize);
        }, 1000);
    } catch (error) {
        console.error('Lỗi khi gửi phản hồi:', error);
        showNotification(error.message || 'Không thể gửi phản hồi', 'error');
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi phản hồi';
        }
    }
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return '--';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes} ${day}/${month}/${year}`;
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
    
    .status-warning {
        background: #fef3c7;
        color: #92400e;
    }
    
    .status-info {
        background: #dbeafe;
        color: #1e40af;
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