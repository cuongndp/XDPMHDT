// Account Management JavaScript

// Sample vehicle data - chỉ cho phép 1 xe
let vehicles = [];

// Lịch sử booking - sẽ load từ API
let bookingHistory = [];
let tramdoipin = null; // Mã trạm đổi pin giả định

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

// Load booking history từ API
async function loadBookingHistory() {
    const historyList = document.querySelector('.history-list');
    if (!historyList) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-sign-in-alt"></i>
                <h3>Vui lòng đăng nhập</h3>
                <p>Đăng nhập để xem lịch sử đổi pin</p>
            </div>
        `;
        return;
    }
    
    try {
        const res = await gatewayFetch('/gateway/driver/mybookings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!res.ok) {
            console.error('Không thể tải lịch sử booking');
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Không thể tải lịch sử</h3>
                    <p>Vui lòng thử lại sau</p>
                </div>
            `;
            return;
        }
        
        const data = await res.json();
        console.log('Lịch sử booking:', data);
        bookingHistory = data;
        
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
        
        // Render lịch sử với dữ liệu THẬT từ database
        historyList.innerHTML = bookingHistory.map(booking => `
            <div class="history-item">
                <div class="history-info">
                    <h4>
                        <i class="fas fa-map-marker-alt"></i> 
                        Trạm ID: ${booking.idtram || 'N/A'}
                    </h4>
                    <p><i class="fas fa-calendar"></i> ${formatDate(booking.ngayhen)} - ${formatTime(booking.giohen)}</p>
                    <p><i class="fas fa-money-bill"></i> ${formatCurrency(booking.chiphi || 0)}</p>
                    <p><i class="fas fa-info-circle"></i> Thanh toán: ${booking.trangthaithanhtoan || 'N/A'}</p>
                    ${booking.phuongthucthanhtoan ? `<p><i class="fas fa-credit-card"></i> ${booking.phuongthucthanhtoan}</p>` : ''}
                </div>
                <div class="history-actions">
                    <span class="status ${getStatusClass(booking.trangthai)}">${booking.trangthai}</span>
                    ${booking.trangthai === 'Hoàn thành' && booking.trangthaithanhtoan === 'Đã thanh toán' ? 
                        `<button class="btn btn-primary btn-small" onclick="viewInvoice(${booking.id})">
                            <i class="fas fa-file-invoice"></i> Xem hóa đơn
                        </button>` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Lỗi khi load booking history:', error);
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Lỗi kết nối</h3>
                <p>Không thể tải lịch sử đổi pin</p>
            </div>
        `;
    }
}

// Format time từ TimeOnly
function formatTime(timeString) {
    if (!timeString) return '';
    return timeString.substring(0, 5); // HH:mm
}

// Get status class
function getStatusClass(status) {
    const classMap = {
        'Hoàn thành': 'success',
        'Đang xử lý': 'pending',
        'Đã đặt': 'pending',
        'Đã hủy': 'cancelled'
    };
    return classMap[status] || 'pending';
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
    // Scroll đến phần lịch sử
    document.querySelector('.info-card:last-of-type').scrollIntoView({ behavior: 'smooth' });
}

// Xem hóa đơn
async function viewInvoice(bookingId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Vui lòng đăng nhập để xem hóa đơn');
        return;
    }
    
    try {
        // Gọi API lấy hóa đơn từ PaymentService
        const res = await gatewayFetch(`/gateway/payment/hoadon/booking/${bookingId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                alert('Chưa có hóa đơn cho lần đổi pin này');
            } else {
                alert('Không thể tải hóa đơn. Vui lòng thử lại sau.');
            }
            return;
        }
        
        const invoice = await res.json();
        console.log('Hóa đơn:', invoice);
        
        // Hiển thị modal hóa đơn
        showInvoiceModal(invoice, bookingId);
        
    } catch (error) {
        console.error('Lỗi khi load hóa đơn:', error);
        alert('Lỗi kết nối. Không thể tải hóa đơn.');
    }
}
  

async function getTenTram(idTram) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/gateway/station/hoadon/${idTram}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Không thể lấy thông tin trạm');
        const tenTram = await response.text();
        return tenTram || 'Không xác định';
    } catch (error) {
        console.error('Lỗi khi lấy tên trạm:', error);
        return 'Không xác định';
    }
}


// Hiển thị modal hóa đơn
async function showInvoiceModal(invoice, bookingId) {
    const booking = bookingHistory.find(b => b.id === bookingId);
    
    const modal = document.getElementById('invoiceModal');
    if (!modal) {
        createInvoiceModal();
        return showInvoiceModal(invoice, bookingId);
    }

    const tenTram = await getTenTram(invoice.idtramdoipin);
    console.log('Tên trạm đổi pin:', tenTram);

    // Lấy tên loại pin từ booking hoặc từ API
    let tenLoaiPin = booking?.loaipin || null;
    
    // Nếu không có trong booking, gọi API để lấy tên loại pin
    if (!tenLoaiPin && invoice.idloaipin) {
        try {
            const token = localStorage.getItem('token');
            const res = await gatewayFetch(`/gateway/station/check/${invoice.idloaipin}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });
            
            if (res.ok) {
                const loaiPinData = await res.json();
                tenLoaiPin = loaiPinData.tenloaipin || loaiPinData.Tenloaipin || null;
                console.log('Tên loại pin từ API:', tenLoaiPin);
            }
        } catch (error) {
            console.error('Lỗi khi lấy tên loại pin:', error);
        }
    }
    
    // Fallback nếu vẫn không có tên
    if (!tenLoaiPin) {
        tenLoaiPin = `Pin ${invoice.idloaipin}kWh`;
    }

    const invoiceContent = document.getElementById('invoiceContent');
    if (invoiceContent) {
        invoiceContent.innerHTML = `
            <div class="invoice-header">
                <h2><i class="fas fa-file-invoice"></i> HÓA ĐƠN ĐỔI PIN</h2>
                <p class="invoice-number">Số hóa đơn: #${invoice.id}</p>
            </div>
            <div class="invoice-body">
                <div class="invoice-row">
                    <span class="label">Mã booking:</span>
                    <span class="value">#${invoice.idbooking}</span>
                </div>
                <div class="invoice-row">
                    <span class="label">Ngày đổi pin:</span>
                    <span class="value">${formatDate(invoice.ngaydoipin)}</span>
                </div>
                <div class="invoice-row">
                    <span class="label">Trạm đổi pin:</span>
                    <span class="value">${tenTram || 'N/A'}</span>
                </div>
                <div class="invoice-row">
                    <span class="label">Loại pin:</span>
                    <span class="value">${tenLoaiPin}</span>
                </div>
                <div class="invoice-row">
                    <span class="label">Phương thức thanh toán:</span>
                    <span class="value">${booking?.phuongthucthanhtoan || invoice.phuongthucthanhtoan || 'N/A'}</span>
                </div>
                <div class="invoice-divider"></div>
                <div class="invoice-row invoice-total">
                    <span class="label">Tổng tiền:</span>
                    <span class="value">${formatCurrency(invoice.chiphi)}</span>
                </div>
            </div>
            <div class="invoice-footer">
                <p><i class="fas fa-check-circle"></i> Đã thanh toán</p>
                <button class="btn btn-outline" onclick="printInvoice()">
                    <i class="fas fa-print"></i> In hóa đơn
                </button>
            </div>
        `;
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Tạo modal hóa đơn nếu chưa có
function createInvoiceModal() {
    const modal = document.createElement('div');
    modal.id = 'invoiceModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content invoice-modal">
            <div class="modal-header">
                <span class="close" onclick="closeModal('invoiceModal')">&times;</span>
            </div>
            <div id="invoiceContent"></div>
        </div>
    `;
    document.body.appendChild(modal);
}

// In hóa đơn
function printInvoice() {
    window.print();
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
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return 'N/A';
    }
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




    async function checkUserDV() {
        const token = localStorage.getItem('token');
        console.log('Hàm checkUserDV đang chạy...');

        try {

            const res = await gatewayFetch('/gateway/driver/logdichvu', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            const data = await res.json();
            console.log('dịch vụ:', data);


            if (res.ok) {
                const res2 = await gatewayFetch(`/gateway/payment/logdichvu/${data.iddichvu}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    },
                    credentials: 'include'

                });
                const data2 = await res2.json();
                console.log('tên dịch vụ:', data2);
                if (!res2.ok) {
                    console.log('gọi tên dịch vụ trong db payment dichvu lỗi');

                    return;
                }



                //  ngaydangky ngayketthuc solandoipin trong bảng driver 

                //gắn dô html
                const daydkEl = document.getElementById("ngayDK");
                if (daydkEl) {
                    daydkEl.innerText = data.ngaydangky || '--';
                }
                const dayktEl = document.getElementById("ngayKT");
                if (dayktEl) {
                    dayktEl.innerText = data.ngayketthuc || '--';
                }
                const today = new Date();
                const endDate = new Date(data.ngayketthuc);
                if (endDate < today) {
                    //hết hạn
                    dayktEl.style.color = "red";
                    dayktEl.style.fontWeight = "bold";
                }
                else {
                    //còn hạn
                    dayktEl.style.color = "green";
                    dayktEl.style.fontWeight = "bold";
                }
                const solandoi = document.getElementById("solandoi");
                if (solandoi) {
                    solandoi.innerText = data.solandoipin || '--';
                }

                //thông tin cần lấy tendichvu mota phi  trong bảng dichvu của payment 
                const nameDVEl = document.getElementById("tendv");
                if (nameDVEl) {
                    nameDVEl.innerText = data2.tendichvu || '--';
                }
                const motaEl = document.getElementById("mota");
                if (motaEl) {
                    motaEl.innerText = data2.mota || '--';
                }
                const phiEl = document.getElementById("phi");
                if (phiEl) {
                    phiEl.innerText = data2.phi || '--';
                }


                document.getElementById("dvdk").style.display = "block";
                document.getElementById("emptyServices").style.display = "none";
            }
             else {
                    document.getElementById("dvdk").style.display = "none";
                    document.getElementById("emptyServices").style.display = "block";
             }


                //// Hiển thị phần thông tin xe
                //const linkedDisplay = document.getElementById("dvdk");
                //if (linkedDisplay) {
                //    linkedDisplay.style.display = 'block';
                //    console.log('Showing vehicle info');
                //}

                //// Ẩn phần empty state
                //const vehiclesList = document.getElementById("emptyServices");
                //if (vehiclesList) {
                //    vehiclesList.style.display = 'none';
                //}

                //// Ẩn nút thêm xe
                //const addBtn = document.getElementById("addVehicleBtn");
                //if (addBtn) {
                //    addBtn.style.display = 'none';
                //}

            
        } catch (err) {
            console.error('Error checking vehicle:', err);
            loadVehicles(); // Hiển thị empty state khi lỗi
        }
    }
    



// Load support requests
async function loadSupportRequests() {
    const requestsList = document.getElementById('supportRequestsList');
    if (!requestsList) return;

    try {
        const res = await gatewayFetch('/gateway/payment/yeu-cau-ho-tro/my');
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Lỗi không xác định' }));
            console.error('API Error:', res.status, errorData);
            throw new Error(errorData.message || `Lỗi ${res.status}: Không thể tải yêu cầu hỗ trợ`);
        }

        const data = await res.json();
        console.log('Support requests data:', data);

        if (!data.data || data.data.length === 0) {
            requestsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>Bạn chưa có yêu cầu hỗ trợ nào.</p>
                    <p style="font-size: 12px; margin-top: 10px; color: #94a3b8;">Nhấn nút "Gửi yêu cầu" để tạo yêu cầu hỗ trợ mới</p>
                </div>
            `;
            return;
        }

        requestsList.innerHTML = data.data.map(request => {
            // Xử lý trạng thái với fallback
            const trangThai = request.trang_thai || request.TrangThai || 'Chờ xử lý';
            const statusClass = trangThai === 'Đã xử lý' ? 'success' : 
                              trangThai === 'Đang xử lý' ? 'warning' : 'info';
            
            // Xử lý ngày với fallback
            const ngayTao = request.ngay_tao || request.NgayTao;
            const ngayTaoFormatted = ngayTao ? formatDate(ngayTao) : 'N/A';
            
            // Xử lý mô tả với fallback
            const moTa = request.mo_ta || request.MoTa || 'Không có mô tả';
            
            // Xử lý độ ưu tiên
            const doUuTien = request.do_uu_tien || request.DoUuTien || 'Trung bình';
            const priorityColors = {
                'Khẩn cấp': '#ef4444',
                'Cao': '#f59e0b',
                'Trung bình': '#3b82f6',
                'Thấp': '#64748b'
            };
            const priorityColor = priorityColors[doUuTien] || '#64748b';
            const requestId = request.id || request.Id;
            
            return `
                <div id="request-card-${requestId}" style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 15px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.3s;" 
                     onclick="toggleChat(${requestId})" 
                     onmouseover="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 2px 8px rgba(59,130,246,0.2)'" 
                     onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)'">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap;">
                                <strong style="font-size: 16px; color: #1e293b;">Yêu cầu</strong>
                                <span class="status-badge status-${statusClass}" style="padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                                    ${trangThai}
                                </span>
                                <span style="padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 500; background: ${priorityColor}15; color: ${priorityColor};">
                                    <i class="fas fa-flag"></i> ${doUuTien}
                                </span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 13px;">
                                <i class="fas fa-calendar-alt"></i>
                                <span>${ngayTaoFormatted}</span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; color: #3b82f6; font-size: 13px;">
                            <i class="fas fa-comments"></i>
                            <span id="chat-toggle-${requestId}">Nhấn để nhắn tin</span>
                        </div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-top: 12px; border-left: 3px solid #3b82f6;">
                        <p style="color: #475569; margin: 0; line-height: 1.6; white-space: pre-wrap;">${moTa}</p>
                    </div>
                    ${request.phan_hoi || request.PhanHoi ? `
                        <div style="background: #f0f9ff; padding: 12px; border-radius: 8px; margin-top: 12px; border-left: 3px solid #3b82f6;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <i class="fas fa-reply" style="color: #3b82f6;"></i>
                                <strong style="color: #1e40af; font-size: 14px;">Phản hồi từ nhân viên:</strong>
                            </div>
                            <p style="color: #1e293b; margin: 0; line-height: 1.6; white-space: pre-wrap;">${request.phan_hoi || request.PhanHoi}</p>
                        </div>
                    ` : ''}
                    <!-- Chat section (hidden by default) -->
                    <div id="chat-${requestId}" style="display: none; margin-top: 20px; border-top: 2px solid #e2e8f0; padding-top: 20px;">
                        <div style="margin-bottom: 18px; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-comments" style="color: #3b82f6; font-size: 18px;"></i>
                            <strong style="color: #1e293b; font-size: 18px; font-weight: 600;">Lịch sử trò chuyện</strong>
                        </div>
                        <div id="chat-messages-${requestId}" style="max-height: 400px; overflow-y: auto; margin-bottom: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; min-height: 200px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: block !important; visibility: visible !important;">
                            <div style="text-align: center; color: #64748b; padding: 20px;">
                                <i class="fas fa-spinner fa-spin"></i> Đang tải tin nhắn...
                            </div>
                        </div>
                        <div style="margin-top: 20px; padding: 20px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <div style="display: flex; gap: 12px; align-items: flex-start;">
                                <textarea id="chat-input-${requestId}" 
                                          placeholder="Nhập tin nhắn của bạn tại đây..." 
                                          rows="4"
                                          style="flex: 1; padding: 14px 16px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 14px; outline: none; background: #ffffff; color: #1e293b; box-sizing: border-box; resize: vertical; font-family: inherit; display: block !important; visibility: visible !important; opacity: 1 !important; min-height: 80px; max-height: 200px; width: 100%; position: relative; z-index: 11; line-height: 1.6; transition: border-color 0.3s, box-shadow 0.3s;"
                                          onkeypress="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.stopPropagation(); sendMessage(${requestId}); }"
                                          onclick="event.stopPropagation();"
                                          onmousedown="event.stopPropagation();"
                                          onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)';"
                                          onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none';"></textarea>
                                <button class="btn btn-primary btn-small" onclick="event.stopPropagation(); sendMessage(${requestId})" 
                                        style="padding: 14px 28px; font-size: 14px; white-space: nowrap; height: fit-content; min-height: 80px; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; border-radius: 10px; background: #3b82f6; color: #ffffff; border: none; cursor: pointer; position: relative; z-index: 11; transition: all 0.2s; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);"
                                        onmouseover="this.style.background='#2563eb'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(59, 130, 246, 0.4)';"
                                        onmouseout="this.style.background='#3b82f6'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(59, 130, 246, 0.3)';">
                                    <i class="fas fa-paper-plane"></i> <span>Gửi</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading support requests:', error);
        if (requestsList) {
            requestsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <p><strong>Không thể tải yêu cầu hỗ trợ</strong></p>
                    <p style="font-size: 12px; margin-top: 10px; color: #94a3b8;">${error.message || 'Vui lòng thử lại sau'}</p>
                    <button class="btn btn-outline btn-small" onclick="loadSupportRequests()" style="margin-top: 15px;">
                        <i class="fas fa-redo"></i> Thử lại
                    </button>
                </div>
            `;
        }
    }
}

// Show support request modal
function showSupportRequestModal() {
    const modal = document.getElementById('supportRequestModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        // Load danh sách trạm vào dropdown (nếu cần)
        loadStationsForSupport();
    }
}

// Load stations for support request dropdown
async function loadStationsForSupport() {
    try {
        const res = await gatewayFetch('/gateway/station/danhsach');
        if (res.ok) {
            const stations = await res.json();
            const stationSelect = document.getElementById('supportStation');
            if (stationSelect && stations && stations.length > 0) {
                // Clear existing options except first
                stationSelect.innerHTML = '<option value="">-- Chọn trạm (tùy chọn) --</option>';
                stations.forEach(station => {
                    const option = document.createElement('option');
                    option.value = station.id;
                    option.textContent = station.tentram || `Trạm ${station.id}`;
                    stationSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading stations for support:', error);
    }
}

// Handle submit support request
async function handleSubmitSupportRequest(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const data = {
        mo_ta: formData.get('mo_ta'),
        do_uu_tien: formData.get('do_uu_tien')
    };
    
    const idtramdoipin = formData.get('idtramdoipin');
    if (idtramdoipin) data.idtramdoipin = parseInt(idtramdoipin);
    
    const idbooking = formData.get('idbooking');
    if (idbooking) data.idbooking = parseInt(idbooking);

    try {
        const res = await gatewayFetch('/gateway/payment/yeu-cau-ho-tro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Không thể gửi yêu cầu');
        }

        const result = await res.json();
        alert('Gửi yêu cầu hỗ trợ thành công!');
        closeModal('supportRequestModal');
        form.reset();
        loadSupportRequests();
    } catch (error) {
        console.error('Error submitting support request:', error);
        alert('Lỗi: ' + error.message);
    }
}

// Helper function để lấy thông tin user từ DriverService
async function getUserInfo(userId) {
    try {
        const res = await gatewayFetch(`/gateway/driver/user/${userId}`);
        if (res.ok) {
            const userData = await res.json();
            return {
                name: userData.name || `User ${userId}`,
                role: userData.role || 'driver'
            };
        }
    } catch (error) {
        console.error(`Error getting user info for ${userId}:`, error);
    }
    return {
        name: `User ${userId}`,
        role: 'driver'
    };
}

// Toggle chat section - Mở/đóng chat khi click vào card yêu cầu
function toggleChat(requestId) {
    const chatSection = document.getElementById(`chat-${requestId}`);
    const toggleText = document.getElementById(`chat-toggle-${requestId}`);
    const requestCard = document.getElementById(`request-card-${requestId}`);
    
    if (!chatSection || !toggleText) return;
    
    // Đóng tất cả các chat khác trước
    const allChats = document.querySelectorAll('[id^="chat-"]');
    allChats.forEach(chat => {
        if (chat.id !== `chat-${requestId}`) {
            chat.style.display = 'none';
        }
    });
    
    // Cập nhật text cho tất cả các toggle
    const allToggles = document.querySelectorAll('[id^="chat-toggle-"]');
    allToggles.forEach(toggle => {
        if (toggle.id !== `chat-toggle-${requestId}`) {
            toggle.textContent = 'Nhấn để nhắn tin';
        }
    });
    
    if (chatSection.style.display === 'none' || !chatSection.style.display) {
        chatSection.style.display = 'block';
        chatSection.style.visibility = 'visible';
        toggleText.textContent = 'Ẩn trò chuyện';
        if (requestCard) {
            requestCard.style.borderColor = '#3b82f6';
            requestCard.style.boxShadow = '0 2px 8px rgba(59,130,246,0.2)';
        }
        
        // Đảm bảo container tin nhắn hiển thị
        const messagesContainer = document.getElementById(`chat-messages-${requestId}`);
        if (messagesContainer) {
            messagesContainer.style.display = 'block';
            messagesContainer.style.visibility = 'visible';
            messagesContainer.style.opacity = '1';
        }
        
        // Load tin nhắn
        loadChatMessages(requestId);
        
        // Focus vào textarea sau khi load xong (delay một chút để đảm bảo DOM đã render)
        setTimeout(() => {
            const textarea = document.getElementById(`chat-input-${requestId}`);
            if (textarea) {
                textarea.focus();
                textarea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                console.error(`Không tìm thấy textarea với id: chat-input-${requestId}`);
            }
        }, 500);
    } else {
        chatSection.style.display = 'none';
        toggleText.textContent = 'Nhấn để nhắn tin';
        if (requestCard) {
            requestCard.style.borderColor = '#e2e8f0';
            requestCard.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }
    }
}

// Load chat messages - Frontend gọi DriverService để lấy thông tin user
async function loadChatMessages(requestId) {
    const messagesContainer = document.getElementById(`chat-messages-${requestId}`);
    if (!messagesContainer) return;

    try {
        // Bước 1: Lấy danh sách tin nhắn từ PaymentService (chỉ có id_user)
        const res = await gatewayFetch(`/gateway/payment/tin-nhan-ho-tro/${requestId}`);
        if (!res.ok) {
            throw new Error('Không thể tải tin nhắn');
        }

        const data = await res.json();
        
        if (!data.data || data.data.length === 0) {
            messagesContainer.innerHTML = `
                <div style="text-align: center; color: #64748b; padding: 30px;">
                    <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5; color: #cbd5e1;"></i>
                    <p style="font-size: 15px; margin: 0; font-weight: 500;">Chưa có tin nhắn nào</p>
                    <p style="font-size: 13px; margin-top: 8px; color: #94a3b8;">Hãy bắt đầu cuộc trò chuyện!</p>
                </div>
            `;
            return;
        }

        // Bước 2: Với mỗi tin nhắn, gọi DriverService để lấy thông tin user (name, role)
        const messagesWithUserInfo = await Promise.all(
            data.data.map(async (msg) => {
                const userInfo = await getUserInfo(msg.id_user);
                return {
                    ...msg,
                    ten_nguoi_gui: userInfo.name,
                    role: userInfo.role
                };
            })
        );

        // Bước 3: Sắp xếp tin nhắn theo thời gian (từ cũ đến mới)
        messagesWithUserInfo.sort((a, b) => {
            const dateA = new Date(a.ngay_gui || a.ngayGui || 0);
            const dateB = new Date(b.ngay_gui || b.ngayGui || 0);
            return dateA - dateB;
        });

        // Bước 4: Lấy userId hiện tại để so sánh
        const currentUserId = parseInt(localStorage.getItem('userId') || '0');

        // Bước 5: Đảm bảo container hiển thị
        messagesContainer.style.display = 'block';
        messagesContainer.style.visibility = 'visible';
        messagesContainer.style.opacity = '1';
        
        // Bước 6: Hiển thị tin nhắn với thông tin đầy đủ
        messagesContainer.innerHTML = messagesWithUserInfo.map(msg => {
            const isUser = msg.id_user === currentUserId || (msg.role === 'driver' && msg.id_user === currentUserId);
            const isAdmin = msg.role === 'admin';
            const ngayGui = formatDate(msg.ngay_gui || msg.ngayGui);
            const tenNguoiGui = msg.ten_nguoi_gui || (isUser ? 'Bạn' : (isAdmin ? 'Admin' : 'Nhân viên'));
            
            // Style cho tin nhắn của user (bên phải, màu xanh)
            if (isUser) {
                return `
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">
                        <div style="max-width: 75%; padding: 12px 16px; border-radius: 12px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3); border-bottom-right-radius: 4px;">
                            <div style="font-size: 11px; opacity: 0.9; margin-bottom: 6px; font-weight: 500; display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-user-circle"></i>
                                <span>${tenNguoiGui}</span>
                                <span style="opacity: 0.7;">•</span>
                                <span>${ngayGui}</span>
                            </div>
                            <p style="margin: 0; line-height: 1.6; white-space: pre-wrap; font-size: 14px;">${msg.noi_dung || msg.noiDung || ''}</p>
                        </div>
                    </div>
                `;
            }
            
            // Style cho tin nhắn của admin (bên trái, màu xanh dương nhạt với badge ADMIN)
            if (isAdmin) {
                return `
                    <div style="display: flex; justify-content: flex-start; margin-bottom: 15px;">
                        <div style="max-width: 75%; padding: 12px 16px; border-radius: 12px; background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%); color: #1e293b; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #3b82f6; border-bottom-left-radius: 4px;">
                            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; font-weight: 500; display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-user-shield" style="color: #3b82f6;"></i>
                                <span>${tenNguoiGui}</span>
                                <span style="padding: 2px 6px; background: #3b82f6; color: white; border-radius: 4px; font-size: 10px; font-weight: 600; letter-spacing: 0.5px;">ADMIN</span>
                                <span style="margin-left: auto;">${ngayGui}</span>
                            </div>
                            <p style="margin: 0; line-height: 1.6; white-space: pre-wrap; font-size: 14px; color: #475569;">${msg.noi_dung || msg.noiDung || ''}</p>
                        </div>
                    </div>
                `;
            }
            
            // Style cho tin nhắn của nhân viên khác (bên trái, màu trắng)
            return `
                <div style="display: flex; justify-content: flex-start; margin-bottom: 15px;">
                    <div style="max-width: 75%; padding: 12px 16px; border-radius: 12px; background: #ffffff; color: #1e293b; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #94a3b8; border-bottom-left-radius: 4px;">
                        <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; font-weight: 500; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-user-tie" style="color: #64748b;"></i>
                            <span>${tenNguoiGui}</span>
                            <span style="margin-left: auto;">${ngayGui}</span>
                        </div>
                        <p style="margin: 0; line-height: 1.6; white-space: pre-wrap; font-size: 14px; color: #475569;">${msg.noi_dung || msg.noiDung || ''}</p>
                    </div>
                </div>
            `;
        }).join('');
        
        // Auto scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        console.error('Error loading chat messages:', error);
        messagesContainer.innerHTML = `
            <div style="text-align: center; color: #ef4444; padding: 20px;">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Không thể tải tin nhắn. Vui lòng thử lại sau.</p>
            </div>
        `;
    }
}

// Send message
async function sendMessage(requestId) {
    const input = document.getElementById(`chat-input-${requestId}`);
    if (!input) {
        console.error(`Không tìm thấy input với id: chat-input-${requestId}`);
        alert('Không tìm thấy ô nhập tin nhắn. Vui lòng thử lại.');
        return;
    }

    const noiDung = input.value.trim();
    if (!noiDung) {
        alert('Vui lòng nhập nội dung tin nhắn');
        input.focus();
        return;
    }

    try {
        // Gửi tin nhắn đến PaymentService (không cần gửi name và role, chỉ cần id_yeu_cau_ho_tro và noi_dung)
        const res = await gatewayFetch('/gateway/payment/tin-nhan-ho-tro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id_yeu_cau_ho_tro: requestId,
                noi_dung: noiDung
            })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Không thể gửi tin nhắn');
        }

        // Clear input
        input.value = '';
        
        // Reload messages (sẽ tự động gọi DriverService để lấy thông tin user)
        loadChatMessages(requestId);
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Lỗi: ' + error.message);
    }
}

// Initialize account page
document.addEventListener('DOMContentLoaded', function () {
    ensureAuthenticatedAndHydrate();
    checkUserVehicle(); // hàm này sẽ dc gọi khi load trang
    loadBookingHistory();
    checkUserDV();
    loadSupportRequests(); // Load support requests when page loads
    //getPackagesFromAPI();
    setupEventListeners();
    setupBatteryTypeUI();
});