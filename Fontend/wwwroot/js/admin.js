// Admin Dashboard JavaScript
let currentSection = 'dashboard';
let charts = {};

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

// Load danh sách trạm (bước đầu tiên)
let currentStationId = null;

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
                return;
            }

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
    } catch (error) {
        console.error('Lỗi khi load dữ liệu pin:', error);
        const tableBody = document.getElementById('batteriesTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: red;">Lỗi khi tải dữ liệu pin</td></tr>';
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
    // Nếu currentStatus không phải "Đang chờ" hoặc "Đang sạc", mặc định là "Đang chờ"
    const validStatus = (currentStatus === 'Đang chờ' || currentStatus === 'Đang sạc') ? currentStatus : 'Đang chờ';
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

function deleteUser(id) {
    if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
        showNotification(`Đã xóa người dùng ${id}`, 'success');
        loadUsersData();
    }
}

function deleteBattery(id) {
    if (confirm('Bạn có chắc chắn muốn xóa pin này?')) {
        // TODO: Implement delete API nếu cần
        showNotification(`Chức năng xóa pin đang được phát triển`, 'info');
        // loadBatteriesData();
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