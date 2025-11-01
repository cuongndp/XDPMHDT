// Staff Dashboard JavaScript
const API_BASE_URL = 'http://localhost:5000/gateway/driver';
let currentUser = null;
let batteryInventory = [];
let recentTransactions = [];
let allBookings = [];
let currentBookingId = null;

// Initialize the staff dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra đăng nhập
    checkStaffLogin();
    initializeDashboard();
    setupEventListeners();
    loadDashboardData();
});

// Kiểm tra đăng nhập
function checkStaffLogin() {
    const staffToken = localStorage.getItem('staffToken');
    if (!staffToken) {
        window.location.href = 'staff-login.html';
        return;
    }
}

// Initialize dashboard
function initializeDashboard() {
    // Lấy thông tin nhân viên từ localStorage
    const staffName = localStorage.getItem('staffName') || 'Nhân viên';
    const staffEmail = localStorage.getItem('staffEmail') || '';
    
    currentUser = {
        name: staffName,
        email: staffEmail,
        station: 'Trạm Quận 1',
        role: 'staff'
    };
    
    // Hiển thị tên nhân viên trên header
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement) {
        userNameElement.textContent = staffName;
    }
    
    // Load initial data
    loadBatteryInventory();
    updateStationStatus();
}

// Setup event listeners
function setupEventListeners() {
    // Form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            handleFormSubmit(this);
        });
    });

    // Filter changes
    const batteryFilter = document.getElementById('batteryFilter');
    if (batteryFilter) {
        batteryFilter.addEventListener('change', function() {
            filterBatteryInventory(this.value);
        });
    }

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

// Load dashboard data
function loadDashboardData() {
    updateOverviewCards();
    loadBatteryInventory();
    loadBookings(); // Load bookings từ API
    updateStationStatus();
}

// Load bookings từ API
async function loadBookings() {
    try {
        const staffToken = localStorage.getItem('staffToken');
        
        if (!staffToken) {
            showNotification('Vui lòng đăng nhập lại', 'error');
            setTimeout(() => {
                window.location.href = 'staff-login.html';
            }, 2000);
            return;
        }

        const response = await fetch("http://localhost:5000/gateway/driver/bookings", {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${staffToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Gửi cookies
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Bookings loaded:', data); // Debug
            allBookings = data;
            renderBookingsTable(allBookings);
            
            if (allBookings.length === 0) {
                showNotification('Chưa có đặt lịch nào', 'info');
            }
        } else if (response.status === 401) {
            showNotification('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại', 'error');
            localStorage.clear();
            setTimeout(() => {
                window.location.href = 'staff-login.html';
            }, 2000);
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Lỗi API:', errorData);
            showNotification(errorData.message || 'Không thể tải danh sách đặt lịch', 'error');
            renderBookingsTable([]); // Hiển thị bảng trống
        }
    } catch (error) {
        console.error('Lỗi khi tải bookings:', error);
        showNotification('Lỗi kết nối đến server. Vui lòng kiểm tra kết nối mạng.', 'error');
        renderBookingsTable([]); // Hiển thị bảng trống thay vì dữ liệu mẫu
    }
}

// Không dùng dữ liệu mẫu nữa - sẽ lấy từ API thực

// Render bảng bookings
function renderBookingsTable(bookings) {        
    const tbody = document.getElementById('bookingsTableBody');
    if (!tbody) return;

    if (bookings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>
                    Không có đặt lịch nào
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = bookings.map(booking => `
        <tr>
            <td><strong>#${booking.id}</strong></td>
            <td>${booking.username || 'N/A'}</td>
            <td>${booking.loaipin || `Loại ${booking.idloaipin}`}</td>
            <td>${formatDate(booking.ngaydat)}</td>
            <td>${formatDate(booking.ngayhen)}</td>
            <td>${formatTime(booking.giohen)}</td>
            <td><strong>${formatCurrency(booking.chiphi)}</strong></td>
            <td>${getPaymentStatusBadge(booking.trangthaithanhtoan)}</td>
            <td>${booking.phuongthucthanhtoan || '-'}</td>
            <td>${getStatusBadge(booking.trangthai)}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="openUpdateStatusModal(${booking.id})">
                    <i class="fas fa-edit"></i> Xử lý
                </button>
            </td>
        </tr>
    `).join('');
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Format time
function formatTime(timeString) {
    if (!timeString) return '-';
    // Xử lý cả format HH:mm:ss và HH:mm
    return timeString.substring(0, 5); // Lấy HH:mm
}

// Get status badge HTML
function getStatusBadge(status) {
    const statusClass = {
        'Đã đặt': 'status-pending',
        'Đang xử lý': 'status-processing',
        'Hoàn thành': 'status-completed'
    };
    return `<span class="status-badge ${statusClass[status] || ''}">${status}</span>`;
}

// Get payment status badge HTML
function getPaymentStatusBadge(status) {
    const statusClass = {
        'Đã thanh toán': 'status-paid',
        'Chưa thanh toán': 'status-unpaid',
        'Chờ thanh toán': 'status-pending'
    };
    return `<span class="status-badge ${statusClass[status] || ''}">${status}</span>`;
}

// Filter bookings
function filterBookings(status) {
    if (status === 'all') {
        renderBookingsTable(allBookings);
    } else {
        const filtered = allBookings.filter(b => b.trangthai === status);
        renderBookingsTable(filtered);
    }
}

// Mở modal cập nhật trạng thái
function openUpdateStatusModal(bookingId) {
    currentBookingId = bookingId;
    const booking = allBookings.find(b => b.id === bookingId);
    
    if (!booking) {
        showNotification('Không tìm thấy booking!', 'error');
        return;
    }

    // Hiển thị thông tin booking
    const bookingDetails = document.getElementById('bookingDetails');
    bookingDetails.innerHTML = `
        <div class="detail-row">
            <span class="label">ID Booking:</span>
            <span class="value">#${booking.id}</span>
        </div>
        <div class="detail-row">
            <span class="label">Khách hàng:</span>
            <span class="value">${booking.username || 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="label">Loại pin:</span>
            <span class="value">${booking.loaipin || `Loại ${booking.idloaipin}`}</span>
        </div>
        <div class="detail-row">
            <span class="label">Ngày hẹn:</span>
            <span class="value">${formatDate(booking.ngayhen)} - ${formatTime(booking.giohen)}</span>
        </div>
        <div class="detail-row">
            <span class="label">Chi phí:</span>
            <span class="value">${formatCurrency(booking.chiphi)}</span>
        </div>
    `;

    // Set giá trị hiện tại
    document.getElementById('newStatus').value = booking.trangthai;
    document.getElementById('paymentStatus').value = booking.trangthaithanhtoan;
    document.getElementById('staffNotes').value = '';

    // Hiển thị modal
    document.getElementById('updateStatusModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Xác nhận cập nhật trạng thái
async function confirmUpdateStatus() {
    if (!currentBookingId) return;

    const newStatus = document.getElementById('newStatus').value;
    const paymentStatus = document.getElementById('paymentStatus').value;
    const notes = document.getElementById('staffNotes').value;

    try {
        const staffToken = localStorage.getItem('staffToken');
        
        // Bước 1: Cập nhật trạng thái booking
        const response = await fetch(`${API_BASE_URL}/bookings/${currentBookingId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${staffToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                trangthai: newStatus,
                trangthaithanhtoan: paymentStatus,
                notes: notes
            })
        });

        if (response.ok) {
            showNotification('Cập nhật trạng thái thành công!', 'success');
            
            // Cập nhật local data
            const booking = allBookings.find(b => b.id === currentBookingId);
            if (booking) {
                booking.trangthai = newStatus;
                booking.trangthaithanhtoan = paymentStatus;
            }
            
            // Bước 2: Nếu hoàn thành + đã thanh toán → Tạo hóa đơn
            if (newStatus === 'Hoàn thành' && paymentStatus === 'Đã thanh toán' && booking) {
                await createHoaDon(booking);
            }
            
            // Refresh table
            const currentFilter = document.getElementById('bookingStatusFilter').value;
            filterBookings(currentFilter);
            
            closeModal('updateStatusModal');
        } else if (response.status === 401) {
            showNotification('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại', 'error');
            localStorage.clear();
            setTimeout(() => {
                window.location.href = 'staff-login.html';
            }, 2000);
        } else {
            const error = await response.json().catch(() => ({}));
            console.error('Lỗi API:', error);
            showNotification(error.message || 'Không thể cập nhật trạng thái', 'error');
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật trạng thái:', error);
        showNotification('Lỗi kết nối đến server. Không thể cập nhật trạng thái.', 'error');
    }
}

// Tạo hóa đơn sau khi hoàn thành đổi pin
async function createHoaDon(booking) {
    try {
        const staffToken = localStorage.getItem('staffToken');
        const PAYMENT_API_URL = 'http://localhost:5000/gateway/payment';
        
        console.log('Đang tạo hóa đơn cho booking:', booking);
        
        // ✅ Lấy idtram từ booking (ID trạm THẬT)
        const idtram = booking.idtram || 1; // Nếu null thì default 1
        
        const response = await fetch(`${PAYMENT_API_URL}/hoadon`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${staffToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                idbooking: booking.id.toString(),
                iduser: booking.iduser.toString(),
                idloaipin: booking.idloaipin.toString(),
                chiphi: booking.chiphi.toString(),
                idtramdoipin: idtram.toString() // ✅ Lấy từ booking - ID THẬT
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Hóa đơn đã tạo:', result);
            showNotification(`Đã tạo hóa đơn #${result.hoadonId} thành công!`, 'success');
        } else {
            const error = await response.json().catch(() => ({}));
            console.error('Lỗi tạo hóa đơn:', error);
            showNotification('Cập nhật thành công nhưng không thể tạo hóa đơn', 'warning');
        }
    } catch (error) {
        console.error('Lỗi khi tạo hóa đơn:', error);
        showNotification('Cập nhật thành công nhưng lỗi khi tạo hóa đơn', 'warning');
    }
}

// Update overview cards
async function updateOverviewCards() {
    try {
        const staffToken = localStorage.getItem('staffToken');
        
        if (!staffToken) {
            return;
        }

        const response = await fetch(`${API_BASE_URL}/bookings/stats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${staffToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Gửi cookies
        });

        if (response.ok) {
            const stats = await response.json();
            console.log('Stats loaded:', stats); // Debug
            
            // Update card numbers
            const cardNumbers = document.querySelectorAll('.card-number');
            if (cardNumbers.length >= 4) {
                cardNumbers[0].textContent = stats.pending || 0; // Đặt lịch chờ xử lý
                cardNumbers[1].textContent = stats.processing || 0; // Đang xử lý
                cardNumbers[2].textContent = stats.completed || 0; // Hoàn thành hôm nay
                cardNumbers[3].textContent = stats.totalToday || 0; // Tổng lượt hôm nay
            }
        } else if (response.status === 401) {
            console.error('Unauthorized - token hết hạn');
        } else {
            console.error('Không thể tải thống kê');
            // Hiển thị 0 thay vì dữ liệu mẫu
            const cardNumbers = document.querySelectorAll('.card-number');
            if (cardNumbers.length >= 4) {
                cardNumbers[0].textContent = 0;
                cardNumbers[1].textContent = 0;
                cardNumbers[2].textContent = 0;
                cardNumbers[3].textContent = 0;
            }
        }
    } catch (error) {
        console.error('Lỗi khi lấy thống kê:', error);
        // Hiển thị 0 thay vì dữ liệu mẫu
        const cardNumbers = document.querySelectorAll('.card-number');
        if (cardNumbers.length >= 4) {
            cardNumbers[0].textContent = 0;
            cardNumbers[1].textContent = 0;
            cardNumbers[2].textContent = 0;
            cardNumbers[3].textContent = 0;
        }
    }
}

// Load battery inventory
function loadBatteryInventory() {
    batteryInventory = [
        {
            id: 'BAT-001',
            capacity: '75kWh',
            soh: 95,
            status: 'available',
            cycles: 150,
            created: '15/01/2024',
            chargingProgress: null,
            timeRemaining: null,
            issues: null
        },
        {
            id: 'BAT-002',
            capacity: '50kWh',
            soh: 78,
            status: 'charging',
            cycles: 200,
            created: '10/01/2024',
            chargingProgress: 65,
            timeRemaining: '25 phút',
            issues: null
        },
        {
            id: 'BAT-003',
            capacity: '100kWh',
            soh: 45,
            status: 'maintenance',
            cycles: 300,
            created: '20/12/2023',
            chargingProgress: null,
            timeRemaining: null,
            issues: 'Cell 3, Cell 7'
        },
        {
            id: 'BAT-004',
            capacity: '75kWh',
            soh: 92,
            status: 'available',
            cycles: 120,
            created: '18/01/2024',
            chargingProgress: null,
            timeRemaining: null,
            issues: null
        },
        {
            id: 'BAT-005',
            capacity: '50kWh',
            soh: 88,
            status: 'charging',
            cycles: 180,
            created: '12/01/2024',
            chargingProgress: 80,
            timeRemaining: '15 phút',
            issues: null
        }
    ];

    renderBatteryInventory();
}

// Render battery inventory
function renderBatteryInventory(filter = 'all') {
    const inventoryGrid = document.querySelector('.inventory-grid');
    if (!inventoryGrid) return;

    let filteredBatteries = batteryInventory;
    if (filter !== 'all') {
        filteredBatteries = batteryInventory.filter(battery => battery.status === filter);
    }

    inventoryGrid.innerHTML = filteredBatteries.map(battery => `
        <div class="battery-card ${battery.status}">
            <div class="battery-header">
                <h4>${battery.id}</h4>
                <span class="battery-status">${getBatteryStatusText(battery.status)}</span>
            </div>
            <div class="battery-info">
                <div class="info-item">
                    <span class="label">Dung lượng:</span>
                    <span class="value">${battery.capacity}</span>
                </div>
                <div class="info-item">
                    <span class="label">SoH:</span>
                    <span class="value">${battery.soh}%</span>
                </div>
                ${battery.chargingProgress ? `
                <div class="info-item">
                    <span class="label">Tiến độ sạc:</span>
                    <span class="value">${battery.chargingProgress}%</span>
                </div>
                ` : ''}
                ${battery.timeRemaining ? `
                <div class="info-item">
                    <span class="label">Thời gian còn lại:</span>
                    <span class="value">${battery.timeRemaining}</span>
                </div>
                ` : ''}
                ${battery.issues ? `
                <div class="info-item">
                    <span class="label">Lỗi:</span>
                    <span class="value">${battery.issues}</span>
                </div>
                ` : ''}
                <div class="info-item">
                    <span class="label">Lần sạc:</span>
                    <span class="value">${battery.cycles}</span>
                </div>
                <div class="info-item">
                    <span class="label">Ngày tạo:</span>
                    <span class="value">${battery.created}</span>
                </div>
            </div>
            <div class="battery-actions">
                <button class="btn btn-outline btn-sm" onclick="viewBatteryDetails('${battery.id}')">
                    <i class="fas fa-eye"></i> Chi tiết
                </button>
                ${getBatteryActionButton(battery)}
            </div>
        </div>
    `).join('');
}

// Get battery action button based on status
function getBatteryActionButton(battery) {
    switch (battery.status) {
        case 'available':
            return `<button class="btn btn-primary btn-sm" onclick="useBattery('${battery.id}')">
                <i class="fas fa-check"></i> Sử dụng
            </button>`;
        case 'charging':
            return `<button class="btn btn-warning btn-sm" onclick="stopCharging('${battery.id}')">
                <i class="fas fa-pause"></i> Dừng sạc
            </button>`;
        case 'maintenance':
            return `<button class="btn btn-success btn-sm" onclick="completeMaintenance('${battery.id}')">
                <i class="fas fa-check"></i> Hoàn thành
            </button>`;
        default:
            return '';
    }
}

// Get battery status text
function getBatteryStatusText(status) {
    const statusMap = {
        'available': 'Có sẵn',
        'charging': 'Đang sạc',
        'maintenance': 'Bảo trì'
    };
    return statusMap[status] || status;
}

// Filter battery inventory
function filterBatteryInventory(filter) {
    renderBatteryInventory(filter);
}

// Load recent transactions
function loadRecentTransactions() {
    recentTransactions = [
        {
            id: 1,
            type: 'success',
            title: 'Đổi pin thành công',
            customer: 'Nguyễn Văn A',
            details: 'Pin: BAT-001 → BAT-005',
            amount: 50000,
            time: '10 phút trước'
        },
        {
            id: 2,
            type: 'info',
            title: 'Thanh toán gói tháng',
            customer: 'Trần Thị B',
            details: 'Gói: Tháng - 800,000đ',
            amount: 800000,
            time: '25 phút trước'
        },
        {
            id: 3,
            type: 'warning',
            title: 'Pin lỗi được trả về',
            customer: 'Lê Văn C',
            details: 'Pin: BAT-003 - Cần bảo trì',
            amount: null,
            time: '1 giờ trước'
        },
        {
            id: 4,
            type: 'success',
            title: 'Đổi pin thành công',
            customer: 'Phạm Thị D',
            details: 'Pin: BAT-002 → BAT-004',
            amount: 50000,
            time: '2 giờ trước'
        }
    ];

    renderRecentTransactions();
}

// Render recent transactions
function renderRecentTransactions() {
    const transactionsList = document.querySelector('.transactions-list');
    if (!transactionsList) return;

    transactionsList.innerHTML = recentTransactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-icon ${transaction.type}">
                <i class="fas fa-${getTransactionIcon(transaction.type)}"></i>
            </div>
            <div class="transaction-content">
                <h4>${transaction.title}</h4>
                <p>Khách hàng: ${transaction.customer}</p>
                <p>${transaction.details}</p>
                <span class="transaction-time">${transaction.time}</span>
            </div>
            <div class="transaction-amount">
                <span class="amount">${transaction.amount ? formatCurrency(transaction.amount) : '-'}</span>
            </div>
        </div>
    `).join('');
}

// Get transaction icon
function getTransactionIcon(type) {
    const iconMap = {
        'success': 'check',
        'info': 'info',
        'warning': 'exclamation-triangle',
        'error': 'times'
    };
    return iconMap[type] || 'info';
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Update station status
function updateStationStatus() {
    // Simulate real-time status updates
    const statusData = {
        power: 'Bình thường',
        network: 'Tốt',
        temperature: '25°C',
        security: 'Hoạt động'
    };

    // Update status values
    const statusValues = document.querySelectorAll('.status-value');
    if (statusValues.length >= 4) {
        statusValues[0].textContent = statusData.power;
        statusValues[1].textContent = statusData.network;
        statusValues[2].textContent = statusData.temperature;
        statusValues[3].textContent = statusData.security;
    }
}

// Show swap modal
function showSwapModal() {
    // Chuyển sang xem danh sách bookings
    document.querySelector('.booking-management').scrollIntoView({ behavior: 'smooth' });
}

// Show payment modal
function showPaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Show battery check modal
function showBatteryCheckModal() {
    const modal = document.getElementById('batteryCheckModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Show maintenance modal
function showMaintenanceModal() {
    const modal = document.getElementById('maintenanceModal');
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

// Handle form submission
function handleFormSubmit(form) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Determine form type and handle accordingly
    const modal = form.closest('.modal');
    if (modal) {
        switch (modal.id) {
            case 'swapModal':
                handleSwapSubmission(data);
                break;
            case 'paymentModal':
                handlePaymentSubmission(data);
                break;
            case 'batteryCheckModal':
                handleBatteryCheckSubmission(data);
                break;
            case 'maintenanceModal':
                handleMaintenanceSubmission(data);
                break;
        }
    }
}

// Handle swap submission
function handleSwapSubmission(data) {
    // Simulate swap processing
    showNotification('Đang xử lý đổi pin...', 'info');
    
    setTimeout(() => {
        // Update battery inventory
        const oldBattery = batteryInventory.find(b => b.id === data.oldBattery);
        const newBattery = batteryInventory.find(b => b.id === data.newBattery);
        
        if (oldBattery && newBattery) {
            oldBattery.status = 'charging';
            newBattery.status = 'available';
            
            // Add to transactions
            recentTransactions.unshift({
                id: Date.now(),
                type: 'success',
                title: 'Đổi pin thành công',
                customer: data.customerPhone,
                details: `Pin: ${data.oldBattery} → ${data.newBattery}`,
                amount: 50000,
                time: 'Vừa xong'
            });
            
            // Update UI
            renderBatteryInventory();
            renderRecentTransactions();
            updateOverviewCards();
            
            showNotification('Đổi pin thành công!', 'success');
            closeModal('swapModal');
        }
    }, 2000);
}

// Handle payment submission
function handlePaymentSubmission(data) {
    showNotification('Đang xử lý thanh toán...', 'info');
    
    setTimeout(() => {
        // Add to transactions
        recentTransactions.unshift({
            id: Date.now(),
            type: 'info',
            title: 'Thanh toán thành công',
            customer: data.paymentCustomerPhone,
            details: `Số tiền: ${formatCurrency(data.paymentAmount)}`,
            amount: parseInt(data.paymentAmount),
            time: 'Vừa xong'
        });
        
        // Update UI
        renderRecentTransactions();
        updateOverviewCards();
        
        showNotification('Thanh toán thành công!', 'success');
        closeModal('paymentModal');
    }, 1500);
}

// Handle battery check submission
function handleBatteryCheckSubmission(data) {
    showNotification('Đang lưu kết quả kiểm tra...', 'info');
    
    setTimeout(() => {
        // Update battery status if needed
        const battery = batteryInventory.find(b => b.id === data.batteryId);
        if (battery) {
            if (data.batteryCondition === 'faulty') {
                battery.status = 'maintenance';
                battery.issues = data.batteryNotes;
            }
            
            renderBatteryInventory();
            updateOverviewCards();
        }
        
        showNotification('Kết quả kiểm tra đã được lưu!', 'success');
        closeModal('batteryCheckModal');
    }, 1000);
}

// Handle maintenance submission
function handleMaintenanceSubmission(data) {
    showNotification('Đang bắt đầu bảo trì...', 'info');
    
    setTimeout(() => {
        // Update battery status
        const battery = batteryInventory.find(b => b.id === data.maintenanceBatteryId);
        if (battery) {
            battery.status = 'maintenance';
            battery.issues = data.maintenanceDescription;
            
            renderBatteryInventory();
            updateOverviewCards();
        }
        
        showNotification('Bảo trì đã được bắt đầu!', 'success');
        closeModal('maintenanceModal');
    }, 1000);
}

// Battery actions
function viewBatteryDetails(batteryId) {
    const battery = batteryInventory.find(b => b.id === batteryId);
    if (battery) {
        const details = `
ID: ${battery.id}
Dung lượng: ${battery.capacity}
SoH: ${battery.soh}%
Trạng thái: ${getBatteryStatusText(battery.status)}
Lần sạc: ${battery.cycles}
Ngày tạo: ${battery.created}
${battery.issues ? `Lỗi: ${battery.issues}` : ''}
        `;
        alert(details);
    }
}

function useBattery(batteryId) {
    if (confirm(`Bạn có chắc chắn muốn sử dụng pin ${batteryId}?`)) {
        const battery = batteryInventory.find(b => b.id === batteryId);
        if (battery) {
            battery.status = 'charging';
            renderBatteryInventory();
            updateOverviewCards();
            showNotification(`Pin ${batteryId} đã được sử dụng!`, 'success');
        }
    }
}

function stopCharging(batteryId) {
    if (confirm(`Bạn có chắc chắn muốn dừng sạc pin ${batteryId}?`)) {
        const battery = batteryInventory.find(b => b.id === batteryId);
        if (battery) {
            battery.status = 'available';
            battery.chargingProgress = null;
            battery.timeRemaining = null;
            renderBatteryInventory();
            updateOverviewCards();
            showNotification(`Đã dừng sạc pin ${batteryId}!`, 'success');
        }
    }
}

function completeMaintenance(batteryId) {
    if (confirm(`Bạn có chắc chắn muốn hoàn thành bảo trì pin ${batteryId}?`)) {
        const battery = batteryInventory.find(b => b.id === batteryId);
        if (battery) {
            battery.status = 'available';
            battery.issues = null;
            renderBatteryInventory();
            updateOverviewCards();
            showNotification(`Bảo trì pin ${batteryId} đã hoàn thành!`, 'success');
        }
    }
}

// View all transactions
function viewAllTransactions() {
    showNotification('Chuyển đến trang giao dịch...', 'info');
    // In a real app, this would navigate to a transactions page
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Icon mapping
    const iconMap = {
        'success': 'check',
        'error': 'times',
        'warning': 'exclamation-triangle',
        'info': 'info'
    };
    
    // Color mapping
    const colorMap = {
        'success': '#10b981',
        'error': '#ef4444',
        'warning': '#f59e0b',
        'info': '#3b82f6'
    };
    
    notification.innerHTML = `
        <i class="fas fa-${iconMap[type] || 'info'}-circle"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colorMap[type] || '#3b82f6'};
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
    
    // Remove after 3 seconds (warning/error: 5s)
    const duration = (type === 'warning' || type === 'error') ? 5000 : 3000;
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, duration);
}

// Logout function
async function logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        try {
            // Gọi API logout staff
            const staffToken = localStorage.getItem('staffToken');
            await fetch(`${API_BASE_URL}/staff/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${staffToken}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
        } catch (error) {
            console.log('Lỗi khi logout:', error);
        }
        
        // Xóa tất cả thông tin staff
        localStorage.removeItem('staffToken');
        localStorage.removeItem('staffEmail');
        localStorage.removeItem('staffName');
        localStorage.removeItem('staffId');
        
        showNotification('Đã đăng xuất thành công!', 'success');
        // Redirect to login page
        setTimeout(() => {
            window.location.href = 'staff-login.html';
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
`;
document.head.appendChild(style);

// Simulate real-time updates
setInterval(() => {
    // Update charging progress
    batteryInventory.forEach(battery => {
        if (battery.status === 'charging' && battery.chargingProgress < 100) {
            battery.chargingProgress = Math.min(100, battery.chargingProgress + Math.random() * 5);
            if (battery.chargingProgress >= 100) {
                battery.status = 'available';
                battery.chargingProgress = null;
                battery.timeRemaining = null;
            }
        }
    });
    
    // Re-render if needed
    renderBatteryInventory();
    updateOverviewCards();
}, 30000); // Update every 30 seconds