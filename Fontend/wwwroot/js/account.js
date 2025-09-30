// Account Management JavaScript

// Sample vehicle data - chỉ cho phép 1 xe
let vehicles = [];

// Sample booking history
let bookingHistory = [
    {
        id: 1,
        stationName: 'Trạm đổi pin Quận 1',
        date: '2024-01-20',
        time: '14:30',
        cost: 50000,
        status: 'success'
    },
    {
        id: 2,
        stationName: 'Trạm đổi pin Quận 2',
        date: '2024-01-18',
        time: '10:15',
        cost: 50000,
        status: 'success'
    }
];

// Initialize account page
document.addEventListener('DOMContentLoaded', function() {
    loadVehicles();
    loadBookingHistory();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Add vehicle form
    const addVehicleForm = document.getElementById('addVehicleForm');
    if (addVehicleForm) {
        addVehicleForm.addEventListener('submit', handleAddVehicle);
    }
    
    // Edit vehicle form
    const editVehicleForm = document.getElementById('editVehicleForm');
    if (editVehicleForm) {
        editVehicleForm.addEventListener('submit', handleEditVehicle);
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

// Load vehicles
function loadVehicles() {
    const vehiclesList = document.getElementById('vehiclesList');
    const addVehicleBtn = document.getElementById('addVehicleBtn');
    
    if (!vehiclesList) return;
    
    if (vehicles.length === 0) {
        vehiclesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-car"></i>
                <h3>Chưa có phương tiện nào</h3>
                <p>Thêm phương tiện của bạn để bắt đầu sử dụng dịch vụ đổi pin</p>
                <button class="btn btn-primary" onclick="showAddVehicleModal()">
                    <i class="fas fa-plus"></i> Thêm xe
                </button>
            </div>
        `;
        // Hiển thị nút thêm xe trong header
        if (addVehicleBtn) {
            addVehicleBtn.style.display = 'block';
        }
        return;
    }
    
    // Chỉ hiển thị 1 xe
    const vehicle = vehicles[0];
    vehiclesList.innerHTML = `
        <div class="vehicle-item">
            <div class="vehicle-info">
                <h3>${vehicle.name}</h3>
                <p><i class="fas fa-id-card"></i> Biển số: ${vehicle.licensePlate}</p>
                <p><i class="fas fa-battery-full"></i> Loại pin: ${getBatteryTypeText(vehicle.batteryType)}</p>
                <p><i class="fas fa-calendar"></i> Ngày thêm: ${formatDate(vehicle.addedDate)}</p>
            </div>
            <div class="vehicle-actions">
                <button class="btn btn-outline btn-small" onclick="editVehicle(${vehicle.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-outline btn-small" onclick="deleteVehicle(${vehicle.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    // Ẩn nút thêm xe khi đã có xe
    if (addVehicleBtn) {
        addVehicleBtn.style.display = 'none';
    }
}

// Load booking history
function loadBookingHistory() {
    const historyList = document.querySelector('.history-list');
    if (!historyList) return;
    
    if (bookingHistory.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h3>Chưa có lịch sử đổi pin</h3>
                <p>Lịch sử đổi pin của bạn sẽ hiển thị ở đây</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = bookingHistory.map(booking => `
        <div class="history-item">
            <div class="history-info">
                <h4>${booking.stationName}</h4>
                <p><i class="fas fa-calendar"></i> ${formatDate(booking.date)} - ${booking.time}</p>
                <p><i class="fas fa-money-bill"></i> ${formatCurrency(booking.cost)}</p>
            </div>
            <span class="status ${booking.status}">${getStatusText(booking.status)}</span>
        </div>
    `).join('');
}

// Show add vehicle modal
function showAddVehicleModal() {
    // Kiểm tra nếu đã có xe thì không cho thêm
    if (vehicles.length > 0) {
        alert('Mỗi tài khoản chỉ được đăng ký 1 phương tiện. Vui lòng xóa xe hiện tại trước khi thêm xe mới.');
        return;
    }
    
    const modal = document.getElementById('addVehicleModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Handle add vehicle
function handleAddVehicle(event) {
    event.preventDefault();
    
    // Kiểm tra nếu đã có xe thì không cho thêm
    if (vehicles.length > 0) {
        alert('Mỗi tài khoản chỉ được đăng ký 1 phương tiện.');
        return;
    }
    
    const formData = new FormData(event.target);
    const vehicleData = {
        id: Date.now(),
        name: formData.get('vehicleName'),
        licensePlate: formData.get('licensePlate'),
        type: formData.get('vehicleType'),
        batteryType: formData.get('batteryType'),
        batteryCapacity: formData.get('batteryCapacity'),
        year: formData.get('vehicleYear'),
        color: formData.get('vehicleColor'),
        notes: formData.get('vehicleNotes'),
        addedDate: new Date().toISOString().split('T')[0]
    };
    
    // Thêm xe (chỉ cho phép 1 xe)
    vehicles = [vehicleData];
    
    // Reload vehicles list
    loadVehicles();
    
    // Close modal
    closeModal('addVehicleModal');
    
    // Reset form
    event.target.reset();
    
    console.log('Vehicle added:', vehicleData);
}

// Edit vehicle
function editVehicle(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    // Fill edit form with vehicle data
    document.getElementById('editVehicleName').value = vehicle.name;
    document.getElementById('editLicensePlate').value = vehicle.licensePlate;
    document.getElementById('editVehicleType').value = vehicle.type;
    document.getElementById('editBatteryType').value = vehicle.batteryType;
    document.getElementById('editBatteryCapacity').value = vehicle.batteryCapacity || '';
    document.getElementById('editVehicleYear').value = vehicle.year || '';
    document.getElementById('editVehicleColor').value = vehicle.color || '';
    document.getElementById('editVehicleNotes').value = vehicle.notes || '';
    
    // Show edit modal
    const modal = document.getElementById('editVehicleModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Handle edit vehicle
function handleEditVehicle(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const vehicleId = parseInt(formData.get('vehicleId')) || Date.now();
    
    const updatedVehicle = {
        id: vehicleId,
        name: formData.get('vehicleName'),
        licensePlate: formData.get('licensePlate'),
        type: formData.get('vehicleType'),
        batteryType: formData.get('batteryType'),
        batteryCapacity: formData.get('batteryCapacity'),
        year: formData.get('vehicleYear'),
        color: formData.get('vehicleColor'),
        notes: formData.get('vehicleNotes'),
        addedDate: vehicles.find(v => v.id === vehicleId)?.addedDate || new Date().toISOString().split('T')[0]
    };
    
    // Update vehicle in array
    const index = vehicles.findIndex(v => v.id === vehicleId);
    if (index !== -1) {
        vehicles[index] = updatedVehicle;
    }
    
    // Reload vehicles list
    loadVehicles();
    
    // Close modal
    closeModal('editVehicleModal');
    
    console.log('Vehicle updated:', updatedVehicle);
}

// Delete vehicle
function deleteVehicle(vehicleId) {
    if (confirm('Bạn có chắc chắn muốn xóa phương tiện này? Sau khi xóa, bạn có thể thêm phương tiện mới.')) {
        vehicles = [];
        loadVehicles();
        console.log('Vehicle deleted:', vehicleId);
    }
}

// Edit personal info
function editPersonalInfo() {
    // Sẽ được implement khi có API backend
    console.log('Edit personal info');
}

// View all history
function viewAllHistory() {
    // Sẽ được implement khi có API backend
    console.log('View all history');
}

// Utility functions
function getBatteryTypeText(type) {
    const typeMap = {
        'lithium-ion': 'Lithium-ion',
        'lithium-polymer': 'Lithium-polymer',
        'lead-acid': 'Lead-acid'
    };
    return typeMap[type] || type;
}

function getStatusText(status) {
    const statusMap = {
        'success': 'Hoàn thành',
        'pending': 'Đang xử lý',
        'cancelled': 'Đã hủy'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Modal functions (reuse from main script)
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Placeholder functions for user actions
function showUserProfile() {
    console.log('Show user profile');
}

function logout() {
    console.log('Logout');
}
