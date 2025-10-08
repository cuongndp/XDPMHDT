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
    ensureAuthenticatedAndHydrate();
     checkUserVehicle(); // hàm này sẽ dc gọi khi load trang
    loadBookingHistory();
    setupEventListeners();
    setupBatteryTypeUI();
});

function ensureAuthenticatedAndHydrate() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    let displayName = localStorage.getItem('userName') || '';
    try {
        if (typeof parseJwt === 'function') {
            const decoded = parseJwt(token);
            // Support both JWT standard and legacy mappings
            displayName = decoded["unique_name"] || decoded["name"] || decoded["given_name"] || displayName || '';
        }
    } catch (_) {
        // ignore decode errors, fallback to localStorage
    }
    const nameEl = document.getElementById('accountUserName');
    if (nameEl) {
        nameEl.textContent = displayName ? `Xin chào, ${displayName}` : 'Xin chào';
    }
}

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
    
    // battery type change listeners
    const batteryTypeAdd = document.getElementById('batteryType');
    if (batteryTypeAdd) {
        batteryTypeAdd.addEventListener('change', onBatteryTypeChangeAdd);
    }
    const batteryTypeEdit = document.getElementById('editBatteryType');
    if (batteryTypeEdit) {
        batteryTypeEdit.addEventListener('change', onBatteryTypeChangeEdit);
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

// Populate battery type options and wire default info
function setupBatteryTypeUI() {
    const batteryTypes = window.__BATTERY_TYPES__ || [];
    const selects = [document.getElementById('batteryType'), document.getElementById('editBatteryType')];
    selects.forEach(sel => {
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = '<option value="">Chọn loại pin</option>' + batteryTypes.map(bt => `<option value="${bt.id}">${bt.name}</option>`).join('');
        if (current) sel.value = current;
    });
}

function onBatteryTypeChangeAdd(e) {
    const bt = findBatteryTypeById(e.target.value);
    document.getElementById('batteryVoltageInfo').value = bt ? (bt.voltage + ' V') : '';
    document.getElementById('batteryPowerInfo').value = bt ? (bt.power + ' kWh') : '';
}

function onBatteryTypeChangeEdit(e) {
    const bt = findBatteryTypeById(e.target.value);
    document.getElementById('editBatteryVoltageInfo').value = bt ? (bt.voltage + ' V') : '';
    document.getElementById('editBatteryPowerInfo').value = bt ? (bt.power + ' kWh') : '';
}

function findBatteryTypeById(id) {
    const list = window.__BATTERY_TYPES__ || [];
    return list.find(x => String(x.id) === String(id));
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
                <button class="btn btn-primary" onclick="showAddVehicleModal(); loadBatteryInfo();">
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
        batteryType: formData.get('batteryType'),
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
    // Only battery type is kept now
    document.getElementById('editBatteryType').value = vehicle.batteryType;
    
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
        batteryType: formData.get('batteryType'),
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
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    window.location.href = 'index.html';
}

document.addEventListener("DOMContentLoaded", () => {
    let profile = null;
    try { profile = JSON.parse(localStorage.getItem("profile") || "{}"); } catch (_) {}

    let displayName = profile?.name || profile?.fullName || localStorage.getItem('userName') || '';
    let email = profile?.email || '';
    let phone = profile?.sodienthoai || '';
    let age = profile?.age || '';
    let gioitinh = profile?.gioitinh || '';
    if (!displayName) {
        const token = localStorage.getItem('token');
        try {
            if (token && typeof parseJwt === 'function') {
                const decoded = parseJwt(token);
                displayName = decoded["unique_name"] || decoded["name"] || decoded["given_name"] || '';
            }
        } catch (_) {}
    }

    const nameEl = document.getElementById("userName");
    if (nameEl && displayName) {
        nameEl.innerText = displayName;
    }

    const helloEl = document.getElementById("accountUserName");
    if (helloEl) helloEl.textContent = displayName ? `Xin chào, ${displayName}` : 'Xin chào';


    const emailEl = document.getElementById("userEmail");
    if (emailEl && email) {
        emailEl.innerText = email;
    }
    const phoneEl = document.getElementById("userPhone");
    if (phoneEl && phone) {
        phoneEl.innerText = phone;
    }
    const ageEl = document.getElementById("userAge");
    if (ageEl && age) {
        ageEl.innerText = age;
    }
    const gioitinhEl = document.getElementById("userGioiTinh");
    if (gioitinhEl && gioitinh) {
        gioitinhEl.innerText = gioitinh;
    }
});



const themxeBtn = document.getElementById("themxe");
if (themxeBtn) {
    themxeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        loadBatteryInfo();
    });
}

const loadBatteryInfo = async () => {
    // Lấy token
    const token = localStorage.getItem('token');

    // Lấy các element input sớm để hiển thị trạng thái loading
    const batteryTypeEl = document.getElementById('batteryType');
    const voltageEl = document.getElementById('batteryVoltageInfo');
    const powerEl = document.getElementById('batteryPowerInfo');

    if (batteryTypeEl) {
        batteryTypeEl.innerHTML = '<option value="">Đang tải danh sách...</option>';
        batteryTypeEl.disabled = true;
    }

    // Lấy danh sách pin từ gateway
    let batteryList = [];
    try {
        const res = await gatewayFetch('/gateway/station/themxe', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        if (!res.ok) {
            console.error('Fetch battery list failed:', res.status);
            return;
        }

        const apiList = await res.json();
        batteryList = (apiList || []).map(x => ({
            id: x?.id ?? x?.Id,
            name: x?.tenloaipin ?? x?.Tenloaipin,
            voltage: x?.dienap ?? x?.Dienap,
            power: x?.congsuat ?? x?.Congsuat
        }));
        localStorage.setItem('batteryList', JSON.stringify(batteryList));
    } catch (_) {
        console.error('Error fetching battery list');
        if (batteryTypeEl) {
            batteryTypeEl.innerHTML = '<option value="">Tải thất bại</option>';
            batteryTypeEl.disabled = false;
        }
        return;
    }

    // Populate dropdown
    if (batteryTypeEl) {
        batteryTypeEl.disabled = false;
        if (batteryList.length > 0) {
            batteryTypeEl.innerHTML = '<option value="">--Chọn loại pin--</option>';
            batteryList.forEach(b => {
                const option = document.createElement('option');
                option.value = b.id;
                option.textContent = b.name;
                batteryTypeEl.appendChild(option);
            });

            // Hiển thị pin mặc định (cái đầu tiên)
            const firstBattery = batteryList[0];
            if (firstBattery) {
                batteryTypeEl.value = firstBattery.id;
                if (voltageEl) voltageEl.value = firstBattery.voltage || '';
                if (powerEl) powerEl.value = firstBattery.power || '';
            }
        } else {
            batteryTypeEl.innerHTML = '<option value="">Không có dữ liệu</option>';
        }
    }

    // Khi người dùng thay đổi loại pin
    if (batteryTypeEl) {
        batteryTypeEl.addEventListener('change', (e) => {
            const selectedId = e.target.value;
            const selectedBattery = batteryList.find(b => b.id == selectedId);

            if (selectedBattery) {
                if (voltageEl) voltageEl.value = selectedBattery.voltage || '';
                if (powerEl) powerEl.value = selectedBattery.power || '';
            } else {
                if (voltageEl) voltageEl.value = '';
                if (powerEl) powerEl.value = '';
            }
        });
    }
};

// Gọi hàm khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', loadBatteryInfo);


//document.getElementById("themxeform").addEventListener("submit", async function (e) {
//    e.preventDefault(); // chặn reload
    
//});
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("themxeform");
    if (form) {
        form.addEventListener("submit", async function (e) {
            e.preventDefault();
            console.log("Form submit ok!");
            // Lấy token
            const token = localStorage.getItem('token');
            const formData = new FormData(this);               // gom dữ liệu form
            const body = Object.fromEntries(formData.entries()); // chuyển thành object


            //const messagewaitredd = document.getElementById("messagewaitredd");
            const message = document.getElementById("thongbaothemxe");


            const thongbao = document.getElementById("thongbao");
            thongbao.style.display = "block";
            thongbao.style.color = "blue";
            thongbao.innerText = "Đang đăng ký vui lòng chờ...";
            try {
                const res = await gatewayFetch('/gateway/driver/formthemxe', {
                    method: "POST",
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include', // gửi json
                    body: JSON.stringify(body)
                    
                });
                const data = await res.json();
                const message = document.getElementById("messageform");
                if (!res.ok) {
                    // hiển thị lỗi
                    thongbao.style.display = "none";
                    message.style.display = "block";
                    message.style.color = "red";
                    message.innerText = data.message;
                } else {
                    thongbao.style.display = "none";
                    message.style.display = "block";
                    message.style.color = "green";
                    message.innerText = data.message;
                    setTimeout(() => {
                        closeModal('addVehicleModal'); // đóng modal thêm xe
                        setTimeout(() => {
                            location.reload(); // reload lại trang để cập nhật danh sách xe
                        }, 800);
                        
                    }, 900);
                }
            } catch (err) {
                thongbao.style.display = "none";
                message.style.display = "block";
                message.style.color = "red";
                message.innerText = "Mất kết nối";
            }
        });
    } else {
        console.error("Không tìm thấy form themxeform");
    }
});


async function checkUserVehicle() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('No token found');
        loadVehicles();
        return;
    }

    try {
        console.log('Calling API to check vehicle...');
        // Gọi API để kiểm tra xem user có xe chưa - SỬA LẠI URL CHO ĐÚNG
        const res = await gatewayFetch('/gateway/driver/check', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            credentials: 'include'
        });
        
        console.log('API response status:', res.status);

        if (!res.ok) {
            console.log('API returned error, no vehicle found');
            loadVehicles(); // Hiển thị empty state
            return;
        }

        const data = await res.json();
        console.log('Vehicle data:', data);

        if (data != null) {
            console.log('Vehicle found, loading battery info...');
            
            const resstation = await gatewayFetch(`/gateway/station/check/${data.idloaipin}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });
            
            const dataloaipin = await resstation.json();
            console.log('Battery info:', dataloaipin);
            
            //gắn dô html
            const nameEl = document.getElementById("driverName");
            if (nameEl) {
                nameEl.innerText = data.tenphuongtien || '--';
            }
            const licenseEl = document.getElementById("driverBienso");
            if (licenseEl) {
                licenseEl.innerText = data.bienso || '--';
            }
            const loaipinEl = document.getElementById("driverNameloaipin");
            if (loaipinEl) {
                loaipinEl.innerText = dataloaipin.tenloaipin || '--';
            }
            const batteryEl = document.getElementById("driverBattery");
            if (batteryEl) {
                batteryEl.innerText = dataloaipin.dienap || '--';
            }
            const congsuatEl = document.getElementById("driverCongsuat");
            if (congsuatEl) {
                congsuatEl.innerText = dataloaipin.congsuat || '--';
            }
            
            // Hiển thị phần thông tin xe
            const linkedDisplay = document.getElementById("linkedVehicleDisplay");
            if (linkedDisplay) {
                linkedDisplay.style.display = 'block';
                console.log('Showing vehicle info');
            }
            
            // Ẩn phần empty state
            const vehiclesList = document.getElementById("vehiclesList");
            if (vehiclesList) {
                vehiclesList.style.display = 'none';
            }
            
            // Ẩn nút thêm xe
            const addBtn = document.getElementById("addVehicleBtn");
            if (addBtn) {
                addBtn.style.display = 'none';
            }
        } else {
            console.log('No vehicle data, showing empty state');
            loadVehicles(); // Hiển thị empty state
        }

    } catch (err) {
        console.error('Error checking vehicle:', err);
        loadVehicles(); // Hiển thị empty state khi lỗi
    }
}
