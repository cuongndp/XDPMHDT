// Booking state
let bookingState = {
    currentStep: 1,
    selectedStation: null,
    stationData: null,
    selectedDate: null,
    selectedTime: null,
    selectedVehicle: null,
    note: '',
    
    selectedLoaipin: null,   // id loại pin
    serviceFee: null,
    hasServicePackage: false, // người dùng có gói dịch vụ không
    paymentMethod: null       // phương thức thanh toán
}; 
let idloaipinGlobal = null;
let gia = null;


// API Base URL - Adjust this to match your backend
const API_BASE_URL = 'http://localhost:5000';

// Initialize booking page
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    loadUserInfo();
    checkUserVehicle();
    getStationIdFromURL();
    //loadVehicles();
    setupDateRestrictions();
    setupFormListeners();
});

// Check if user is logged in
function checkLoginStatus() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Vui lòng đăng nhập để đặt chỗ!');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Load user information
function loadUserInfo() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userName = userData.name || 'Khách hàng';
    document.getElementById('bookingUserName').textContent = `Xin chào, ${userName}`;
}

// Get station ID from URL parameter
function getStationIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const stationId = urlParams.get('stationId');
    
    if (!stationId) {
        alert('Vui lòng chọn trạm từ trang chủ!');
        window.location.href = 'index.html#stations';
        return;
    }
    
    bookingState.selectedStation = stationId;
    loadSelectedStation(stationId);
}

// Load selected station information
//async function loadSelectedStation(stationId) {
//    const stationDetails = document.getElementById('selectedStationDetails');
    
//    try {
//        // Show loading state
//        stationDetails.innerHTML = `
//            <div class="loading-state">
//                <i class="fas fa-spinner fa-spin"></i>
//                <p>Đang tải thông tin trạm...</p>
//            </div>
//        `;

//        const response = await fetch(`${API_BASE_URL}/Station/get-station-by-id/${stationId}`, {
//            method: 'GET',
//            headers: {
//                'Content-Type': 'application/json'
//            }
//        });

//        if (!response.ok) {
//            throw new Error('Không thể tải thông tin trạm');
//        }

//        const station = await response.json();
//        bookingState.stationData = station;
        
//        // Display station info
//        displaySelectedStation(station);
        
//    } catch (error) {
//        console.error('Error loading station:', error);
//        stationDetails.innerHTML = `
//            <div class="loading-state">
//                <i class="fas fa-exclamation-triangle"></i>
//                <p>Không thể tải thông tin trạm. Vui lòng thử lại.</p>
//            </div>
//        `;
//    }
//}

// Display selected station information
function displaySelectedStation(station) {
    const stationDetails = document.getElementById('selectedStationDetails');
    
    stationDetails.innerHTML = `
        <h4>${station.tentram || 'Trạm đổi pin'}</h4>
        <div class="station-detail-row">
            <i class="fas fa-map-marker-alt"></i>
            <span>${station.diachi || 'Chưa có địa chỉ'}</span>
        </div>
        <div class="station-detail-row">
            <i class="fas fa-phone"></i>
            <span>${station.sodienthoaitd || 'N/A'}</span>
        </div>
        <div class="station-hours">
            <div class="hour-item">
                <i class="fas fa-clock"></i>
                <span>Mở cửa: ${station.giomocua || '06:00'}</span>
            </div>
            <div class="hour-item">
                <i class="fas fa-clock"></i>
                <span>Đóng cửa: ${station.giodongcua || '22:00'}</span>
            </div>
        </div>
       
    `;
}


//<div class="station-stats">
//    <div class="stat-item">
//        <i class="fas fa-battery-full"></i>
//        <span class="stat-value">${station.soPinSanCo || 0}</span>
//        <span class="stat-label">Pin sẵn có</span>
//    </div>
//    <div class="stat-item">
//        <i class="fas fa-charging-station"></i>
//        <span class="stat-value">${station.soPinDangSac || 0}</span>
//        <span class="stat-label">Pin đang sạc</span>
//    </div>
//</div>



// Load user vehicles

//async function loadVehicles() {
//    const token = localStorage.getItem('token');
//    const vehicleSelect = document.getElementById('vehicleSelect');
    
//    try {
//        const response = await fetch(`${API_BASE_URL}/Driver/get-driver-by-token`, {
//            method: 'GET',
//            headers: {
//                'Authorization': `Bearer ${token}`,
//                'Content-Type': 'application/json'
//            }
//        });

//        if (!response.ok) {
//            throw new Error('Không thể tải thông tin xe');
//        }

//        const driverData = await response.json();
        
//        if (driverData && driverData.tenphuongtien) {
//            vehicleSelect.innerHTML = `
//                <option value="">Chọn phương tiện</option>
//                <option value="${driverData.id}">${driverData.tenphuongtien} - ${driverData.bienso}</option>
//            `;
//        } else {
//            vehicleSelect.innerHTML = `
//                <option value="">Chưa có phương tiện nào</option>
//            `;
//        }
//    } catch (error) {
//        console.error('Error loading vehicles:', error);
//        vehicleSelect.innerHTML = `
//            <option value="">Không thể tải danh sách xe</option>
//        `;
//    }
//}

// Setup date restrictions
function setupDateRestrictions() {
    const dateInput = document.getElementById('bookingDate');
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 30); // Allow booking up to 30 days in advance
    
    // Set min date to today
    dateInput.min = today.toISOString().split('T')[0];
    
    // Set max date to 30 days from now
    dateInput.max = maxDate.toISOString().split('T')[0];
}

// Setup form listeners
function setupFormListeners() {
    const bookingForm = document.getElementById('bookingForm');
    bookingForm.addEventListener('submit', handleBookingSubmit);
    //bookingForm.addEventListener('submit', function (event) {
    //    event.preventDefault(); // chặn reload trang

    //    // === LẤY DỮ LIỆU TRONG FORM ===
    //    const formData = new FormData(event.target);
    //    const bookingData = Object.fromEntries(formData.entries());

    //    // Lấy thêm thông tin từ các input và localStorage
    //    bookingData.bookingDate = document.getElementById('bookingDate').value;
    //    bookingData.bookingTime = document.getElementById('bookingTime').value;
    //    bookingData.bookingNote = document.getElementById('bookingNote').value;

    //    bookingData.vehicle = localStorage.getItem('vehicle');
    //    bookingData.selectedStation = localStorage.getItem('selectedStation');
    //    bookingData.selectedSlot = localStorage.getItem('selectedSlot');
    //    bookingData.selectedBattery = localStorage.getItem('selectedBattery');
    //    bookingData.selectedDate = localStorage.getItem('selectedDate');

    //    // === HIỂN THỊ RA CONSOLE ===
    //    console.log("🚀 DỮ LIỆU FORM KHI XÁC NHẬN:");
    //    console.log(JSON.stringify(bookingData, null, 2));
    //    console.log("==============================");

    //    alert("Đã in toàn bộ dữ liệu ra console (F12)");
    //});
}

// ===== HÀM KIỂM TRA GÓI DỊCH VỤ =====
// Đây là hàm mẫu, bạn có thể thay đổi logic sau
async function checkUserHasServicePackage() {
    // TODO: Thay đổi logic kiểm tra theo yêu cầu của bạn
    // Ví dụ: gọi API kiểm tra gói dịch vụ của user
    
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        // Ví dụ hàm mẫu - BẠN CẦN SỬA LẠI URL VÀ LOGIC CHO ĐÚNG
        const response = await gatewayFetch('/gateway/driver/logdichvu', {
             method: 'GET',
             headers: {
                 'Authorization': `Bearer ${token}`,
                 'Accept': 'application/json'
             },
             credentials: 'include'
        });
        const data = await response.json();
        if (response.ok) {
            
            return true;
        }

        else {
            const resstation = await gatewayFetch(`/gateway/station/check/${idloaipinGlobal}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });
            const dataloaipin = await resstation.json();
            const giaEl = document.getElementById("giadoipin");
            if (giaEl) {
                giaEl.innerText = dataloaipin.giadoipin || '--';
            }
            return false;
        }
        // const data = await response.json();
        // return data.hasActivePackage === true;
        
        // Tạm thời return false - BẠN SẼ CODE SAU
        
        
    } catch (error) {
        console.error('Error checking service package:', error);
        return false;
    }
}


async function nextStep() {
    // Validate step 1
    const dateEl = document.getElementById('bookingDate');
    const timeEl = document.getElementById('bookingTime');
    const date = dateEl ? dateEl.value : null;
    const time = timeEl ? timeEl.value : null;

    // vehicle: ưu tiên select, fallback hidden input, fallback bookingState
    let vehicle = idloaipinGlobal;
    const vehicleSelect = document.getElementById('vehicleSelect');
    if (vehicleSelect) {
        vehicle = vehicleSelect.value;
    } else {
        const selectedVehicleIdInput = document.getElementById('selectedVehicleId');
        if (selectedVehicleIdInput && selectedVehicleIdInput.value) vehicle = selectedVehicleIdInput.value;
        else if (bookingState && bookingState.selectedVehicle) vehicle = bookingState.selectedVehicle;
    }

    if (!date || !time || !vehicle) {
        alert('Vui lòng điền đầy đủ thông tin!');
        console.log({ date, time, vehicle, station: bookingState.selectedStation });
        console.log('bookingState:', bookingState.myVehicleId);
        return;
    }

    // Lưu thông tin
    bookingState.selectedDate = date;
    bookingState.selectedTime = time;
    bookingState.selectedVehicle = vehicle;
    bookingState.note = (document.getElementById('bookingNote') || {}).value || '';

    // ===== KIỂM TRA GÓI DỊCH VỤ =====
    bookingState.hasServicePackage = await checkUserHasServicePackage();
    
    // Cập nhật summary với thông tin gói dịch vụ
    updateBookingSummary();

    // Chuyển sang step 2
    const stepNumber = 2;
    document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
    const target = document.getElementById(`step${stepNumber}`);
    if (target) target.classList.add('active');
    updateProgress(stepNumber);
    bookingState.currentStep = stepNumber;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Navigate to next step
//function nextStep(stepNumber) {
//    if (stepNumber === 2) {
//        // Validate step 1
//        const date = document.getElementById('bookingDate').value;
//        const time = document.getElementById('bookingTime').value;
//        const vehicle = document.getElementById('vehicleSelect').value;
        
//        if (!date || !time || !vehicle) {
//            alert('Vui lòng điền đầy đủ thông tin!');
//            return;
//        }
        
//        // Store booking data
//        bookingState.selectedDate = date;
//        bookingState.selectedTime = time;
//        bookingState.selectedVehicle = vehicle;
//        bookingState.note = document.getElementById('bookingNote').value;
        
//        // Update summary
//        updateBookingSummary();
//    }
    
//    // Hide all steps
//    document.querySelectorAll('.form-step').forEach(step => {
//        step.classList.remove('active');
//    });
    
//    // Show target step
//    document.getElementById(`step${stepNumber}`).classList.add('active');
    
//    // Update progress
//    updateProgress(stepNumber);
    
//    // Update current step
//    bookingState.currentStep = stepNumber;
    
//    // Scroll to top
//    window.scrollTo({ top: 0, behavior: 'smooth' });
//}

// Navigate to previous step
function prevStep(stepNumber) {
    nextStep(stepNumber);
}

// Update progress tracker
function updateProgress(stepNumber) {
    // Remove all active and completed states
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        
        if (index + 1 < stepNumber) {
            step.classList.add('completed');
        } else if (index + 1 === stepNumber) {
            step.classList.add('active');
        }
    });
}

// Update booking summary
function updateBookingSummary() {
    // Use station data from bookingState
    const station = bookingState.stationData;
    
    if (station) {
        document.getElementById('summaryStationName').textContent = station.tentram || '--';
        document.getElementById('summaryStationAddress').textContent = station.diachi || '--';
        document.getElementById('summaryStationPhone').textContent = station.sodienthoaitd || '--';
    }
    
    // Format date
    const dateObj = new Date(bookingState.selectedDate);
    const formattedDate = dateObj.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    document.getElementById('summaryDate').textContent = formattedDate;
    document.getElementById('summaryTime').textContent = bookingState.selectedTime;
    
    // Get vehicle info
    let vehicleText = '--';
    const vehicleSelect = document.getElementById('vehicleSelect');
    if (vehicleSelect && vehicleSelect.selectedIndex >= 0) {
        const selectedOption = vehicleSelect.options[vehicleSelect.selectedIndex];
        vehicleText = selectedOption.text;
    } else if (bookingState.selectedVehicleName) {
        vehicleText = bookingState.selectedVehicleName;
    }
    document.getElementById('summaryVehicle').textContent = vehicleText;
    
    // Show note if exists
    if (bookingState.note) {
        document.getElementById('noteSection').style.display = 'block';
        document.getElementById('summaryNote').textContent = bookingState.note;
    } else {
        document.getElementById('noteSection').style.display = 'none';
    }

    // ===== HIỂN THỊ FORM DỰA TRÊN GÓI DỊCH VỤ =====
    const hasPackageSection = document.getElementById('hasPackageSection');
    const noPackageSection = document.getElementById('noPackageSection');
    
    if (bookingState.hasServicePackage) {
        // Trường hợp 1: Có gói dịch vụ
        hasPackageSection.style.display = 'block';
        noPackageSection.style.display = 'none';
        document.querySelectorAll('input[name="paymentMethod"]').forEach(r => r.removeAttribute('required'));
    } else {
        // Trường hợp 2: Không có gói dịch vụ
        hasPackageSection.style.display = 'none';
        noPackageSection.style.display = 'block';
    }
}

//// Handle booking submission
async function handleBookingSubmit(event) {
    event.preventDefault();

    const bookingDate = document.getElementById("bookingDate").value;
    const bookingTime = document.getElementById("bookingTime").value;
    const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value??null;
    const idtram = new URLSearchParams(window.location.search).get('stationId');
    console.log("📦 Dữ liệu form:", {
        bookingDate,
        bookingTime,
        paymentMethod: selectedPaymentMethod
    });

    if (!bookingDate || !bookingTime) {
        alert("Vui lòng chọn ngày và giờ đặt chỗ!");
        return;
    }

    //if (!selectedPaymentMethod) {
    //    alert("Vui lòng chọn phương thức thanh toán!");
    //    return;
    //}
    
    // Dữ liệu gửi API
    const payload = {
        idloaipin: idloaipinGlobal.toString(),
        giadoipin: gia.toString(),
        ngaydat: bookingDate,
        giodat: bookingTime,
        paymentMethod: selectedPaymentMethod,
        idtram: idtram.toString()
    };
    console.log("🚀 Payload gửi tới API:", payload);
    try {
        console.log("🚀 Gửi request tới API...");
        const token = localStorage.getItem('token');
        const messageDiv = document.getElementById('bookingMessage');
        
        const response = await gatewayFetch('/gateway/driver/datlich/', {
            method: 'POST',
            headers: {
                'authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            credentials: 'include'


        });
        const responseData = await response.json();
        if (!response.ok) {
            
            messageDiv.textContent = responseData.message;
            messageDiv.style.color = 'red';
            messageDiv.style.display = 'block';
        }
        else {
            
            messageDiv.textContent = responseData.message;
            messageDiv.style.color = 'green';
            messageDiv.style.display = 'block';
        }

        //const result = await response.json();
        //console.log("✅ Kết quả từ API:", result);
        //alert("Đặt chỗ thành công!");
    } catch (error) {
        console.error("❌ Lỗi khi gọi API:", error);
        alert("Không thể gửi dữ liệu, kiểm tra console để biết thêm chi tiết.");
    }
}


// Show booking message
function showBookingMessage(message, type, isLoading) {
    const messageDiv = document.getElementById('bookingMessage');
    const waitDiv = document.getElementById('bookingWait');
    
    if (isLoading) {
        waitDiv.style.display = 'block';
        waitDiv.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
        waitDiv.style.color = '#667eea';
    } else {
        messageDiv.style.display = 'block';
        messageDiv.textContent = message;
        messageDiv.style.color = type === 'error' ? '#dc2626' : '#10b981';
    }
}

// Hide booking message
function hideBookingMessage() {
    document.getElementById('bookingMessage').style.display = 'none';
    document.getElementById('bookingWait').style.display = 'none';
}

// Show success modal
function showSuccessModal(bookingCode) {
    document.getElementById('bookingCode').textContent = bookingCode;
    document.getElementById('successModal').style.display = 'flex';
}

// Close success modal
function closeSuccessModal() {
    document.getElementById('successModal').style.display = 'none';
    window.location.href = 'index.html';
}

// Go to account page
function goToAccount() {
    window.location.href = 'account.html';
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    window.location.href = 'index.html';
}


async function loadSelectedStation() {
    const idtram = new URLSearchParams(window.location.search).get('stationId');
    const token = localStorage.getItem('token');
    const res = await gatewayFetch(`/gateway/station/gettram/${idtram}`, {
        method: 'GET',
        headers: {
            'authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        },
        credentials: 'include'

        
    });
    const data = await res.json();
    bookingState.stationData = data;
    displaySelectedStation(data);

}



async function checkUserVehicle() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('No token found');
        //loadVehicles();
        return;
    }

    try {
        //console.log('Calling API to check vehicle...');
        // Gọi API để kiểm tra xem user có xe chưa - SỬA LẠI URL CHO ĐÚNG
        const res = await gatewayFetch('/gateway/driver/check', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            credentials: 'include'
        });
        if (!res.ok) {
            console.warn('API trả về lỗi:', res.status);
            alert('Không tìm thấy dữ liệu xe. Vui lòng thêm xe trước khi đặt chỗ!');
            window.location.href = 'index.html';
            return;
        }
        //console.log('API response status:', res.status);

        //if (!res.ok) {
        //    console.log('API returned error, no vehicle found');
        //    loadVehicles(); // Hiển thị empty state
        //    return;
        //}

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
            const giaEl = document.getElementById("giadoipin");
            if (giaEl) {
                giaEl.innerText = dataloaipin.giadoipin || '--';
            }
            const congsuatEl = document.getElementById("driverCongsuat");
            if (congsuatEl) {
                congsuatEl.innerText = dataloaipin.congsuat || '--';
            }


            // <-- CHÈN ĐOẠN NÀY -->
            const selectedVehicleIdInput = document.getElementById('selectedVehicleId');
            if (selectedVehicleIdInput) selectedVehicleIdInput.value = data.id || '';
            bookingState.selectedVehicle = data.id || null;
            bookingState.selectedVehicleName = `${data.tenphuongtien || '--'} - ${data.bienso || '--'}`;
            // <-- HẾT CHÈN -->


            // Hiển thị phần thông tin xe
            const linkedDisplay = document.getElementById("linkedVehicleDisplay");
            if (linkedDisplay) {
                linkedDisplay.style.display = 'block';
                console.log('Showing vehicle info');
            }
            //const idloaipin = data.idloaipin;

            //// Ẩn phần empty state
            //const vehiclesList = document.getElementById("vehiclesList");
            //if (vehiclesList) {
            //    vehiclesList.style.display = 'none';
            //}

            //// Ẩn nút thêm xe
            //const addBtn = document.getElementById("addVehicleBtn");
            //if (addBtn) {
            //    addBtn.style.display = 'none';
            //}
            //const idpin = await data.idloaipin;
            const data2 = {
                data,
                dataloaipin
            }
            return { data, dataloaipin };
        } else {
            console.log('No vehicle data, showing empty state');
            //loadVehicles(); // Hiển thị empty state
        }

    } catch (err) {
        console.error('Error checking vehicle:', err);
        //loadVehicles(); // Hiển thị empty state khi lỗi
    }
}


//checkUserVehicle().then(data2 => {

//    // Ở đây bạn có thể xử lý tiếp, ví dụ:
//    if (!data.idloaipin) {
//        alert("Không tìm thấy thông tin xe!");
//        window.location.href = "index.html";
//        return;
//    }
//    idloaipinGlobal = data2.data.idloaipin;
//    gia = data2.dataloaipin.giadoipin;

//});

checkUserVehicle().then(result => {
    //if (!result || !result.data || !result.data.idloaipin) {
    //    alert("Không tìm thấy thông tin xe!");
    //    window.location.href = "index.html";
    //    return;
    //}

    idloaipinGlobal = result.data.idloaipin;
    gia = result.dataloaipin?.giadoipin ?? result.dataloaipin?.gia ?? null;

    console.log('idloaipinGlobal =', idloaipinGlobal, 'gia =', gia);
});
