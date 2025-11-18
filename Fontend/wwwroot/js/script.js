// Sample station data
let stationsData = [
    //{
    //    id: 1,
    //    name: "Trạm đổi pin Quận 1",
    //    address: "123 Nguyễn Huệ, Quận 1, TP.HCM",
    //    distance: "0.5 km",
    //    status: "available",
    //    batteries: 15,
    //    charging: 8,
    //    maintenance: 2,
    //    rating: 4.8,
    //    phone: "028-1234-5678"
    //},
    //{
    //    id: 2,
    //    name: "Trạm đổi pin Quận 2",
    //    address: "456 Võ Văn Tần, Quận 2, TP.HCM",
    //    distance: "1.2 km",
    //    status: "charging",
    //    batteries: 5,
    //    charging: 12,
    //    maintenance: 1,
    //    rating: 4.6,
    //    phone: "028-2345-6789"
    //},
    //{
    //    id: 3,
    //    name: "Trạm đổi pin Quận 3",
    //    address: "789 Lê Văn Sỹ, Quận 3, TP.HCM",
    //    distance: "2.1 km",
    //    status: "maintenance",
    //    batteries: 0,
    //    charging: 0,
    //    maintenance: 20,
    //    rating: 4.9,
    //    phone: "028-3456-7890"
    //},
    //{
    //    id: 4,
    //    name: "Trạm đổi pin Quận 7",
    //    address: "321 Nguyễn Thị Thập, Quận 7, TP.HCM",
    //    distance: "3.5 km",
    //    status: "available",
    //    batteries: 20,
    //    charging: 5,
    //    maintenance: 0,
    //    rating: 4.7,
    //    phone: "028-4567-8901"
    //}
];

// DOM Elements
let currentFilter = 'all';

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    Stationds();
    setupEventListeners();
    getPackagesFromAPI();
    setupMobileMenu();
    setupPasswordStrength();
    checkLoginStatus(); // Kiểm tra trạng thái đăng nhập khi load trang
});

// Setup event listeners
function setupEventListeners() {
    // Filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            // Update current filter
            currentFilter = this.dataset.filter;
            // Reload stations with new filter
            loadStations();
        });
    });

    // Form submissions
    const loginForm = document.querySelector('#loginForm');
    const registerForm = document.querySelector('#registerForm');
    const forgotPasswordForm = document.querySelector('#forgotPasswordForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
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

// Setup mobile menu
function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }
}

// Load stations based on current filter
function loadStations() {
    const stationsGrid = document.getElementById('stationsGrid');
    if (!stationsGrid) return;

    let filteredStations = stationsData;
    
    if (currentFilter !== 'all') {
        filteredStations = stationsData.filter(station => station.status === currentFilter);
    }
//<span class="station-status status-${station.status}">
//                    ${getStatusText(station.status)}
//                </span>

//<p><i class="fas fa-battery-full"></i> Điện thoại: ${station.phone}</p>


    stationsGrid.innerHTML = filteredStations.map(station => `
        <div class="station-card">
            <div class="station-header">
                <h3 class="station-name">${station.name}</h3>
                
            </div>
            <div class="station-info">
                <p><i class="fas fa-map-marker-alt"></i> ${station.address}</p>
                <p><i class="fas fa-route"></i> Cách đây ${station.khoangcach}</p>
                
                <p><i class="fas fa-charging-station"></i> Giờ mở cửa: ${station.openTime}</p>
                <p><i class="fas fa-tools"></i> Giờ đóng cửa: ${station.closeTime}</p>
                <p><i class="fas fa-star"></i> Thời gian đến: ${station.thoigianden}</p>
                <p><i class="fas fa-phone"></i> ${station.phone}</p>
            </div>
            <div class="station-actions">
                <button class="btn btn-primary" onclick="bookStation(${station.id})">
                    <i class="fas fa-calendar-check"></i> Đặt chỗ
                </button>
                <button class="btn btn-outline" onclick="getDirections(${station.id})">
                    <i class="fas fa-directions"></i> Chỉ đường
                </button>
            </div>
        </div>
    `).join('');
    
}

// Get status text in Vietnamese
function getStatusText(status) {
    const statusMap = {
        'available': 'Có sẵn',
        'charging': 'Đang sạc',
        'maintenance': 'Bảo trì'
    };
    return statusMap[status] || status;
}

// Search stations
//function searchStations() {
//    const locationInput = document.getElementById('locationInput');
//    const query = locationInput.value.toLowerCase();
    
//    if (query.trim() === '') {
//        loadStations();
//        return;
//    }

//    const filteredStations = stationsData.filter(station => 
//        station.name.toLowerCase().includes(query) ||
//        station.address.toLowerCase().includes(query)
//    );

//    const stationsGrid = document.getElementById('stationsGrid');
//    if (!stationsGrid) return;




//    stationsGrid.innerHTML = filteredStations.map(station => `
//        <div class="station-card">
//            <div class="station-header">
//                <h3 class="station-name">${station.name}</h3>
//                <span class="station-status status-${station.status}">
//                    ${getStatusText(station.status)}
//                </span>
//            </div>
//            <div class="station-info">
//                <p><i class="fas fa-map-marker-alt"></i> ${station.address}</p>
//                <p><i class="fas fa-route"></i> Cách đây ${station.distance}</p>
//                <p><i class="fas fa-battery-full"></i> Pin có sẵn: ${station.batteries}</p>
//                <p><i class="fas fa-charging-station"></i> Đang sạc: ${station.charging}</p>
//                <p><i class="fas fa-tools"></i> Bảo trì: ${station.maintenance}</p>
//                <p><i class="fas fa-star"></i> Đánh giá: ${station.rating}/5</p>
//                <p><i class="fas fa-phone"></i> ${station.phone}</p>
//            </div>
//            <div class="station-actions">
//                <button class="btn btn-primary" onclick="bookStation(${station.id})">
//                    <i class="fas fa-calendar-check"></i> Đặt chỗ
//                </button>
//                <button class="btn btn-outline" onclick="getDirections(${station.id})">
//                    <i class="fas fa-directions"></i> Chỉ đường
//                </button>
//            </div>
//        </div>
//    `).join('');
//}

// Book a station - placeholder
//function bookStation(stationId) {
//    // Logic xử lý sẽ được implement ở backend
//    console.log('Book station:', stationId);
//}

// Get directions to station
function getDirections(stationId) {
    const station = stationsData.find(s => s.id === stationId);
    if (!station) return;

    // In a real app, this would open maps app
    const address = encodeURIComponent(station.address);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${address}`;
    window.open(mapsUrl, '_blank');
}

// Show login modal
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Show register modal
function showRegisterModal() {
    const modal = document.getElementById('registerModal');
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

// Switch between modals
function switchModal(fromModal, toModal) {
    closeModal(fromModal);
    showModal(toModal);
}

// Show modal (helper function)
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Handle login - chỉ xử lý giao diện
function handleLogin(event) {
    event.preventDefault();
    
    // Validate form
    if (!validateForm('loginForm')) {
        alert('Vui lòng điền đầy đủ thông tin');
        return;
    }
    
    // Lấy dữ liệu form
    const formData = new FormData(event.target);
    const loginData = {
        identifier: formData.get('loginIdentifier'),
        password: formData.get('password'),
        rememberMe: formData.get('rememberMe') === 'on'
    };
    
    // Logic xử lý sẽ được implement ở backend
    console.log('Login form submitted:', loginData);
    
    // Hiển thị thông báo thành công (tạm thời)
    alert('Đăng nhập thành công! (Demo)');
    closeModal('loginModal');
    
    // Reset form
    event.target.reset();
}

// Handle register - chỉ xử lý giao diện
function handleRegister(event) {
    event.preventDefault();
    
    // Validate form
    if (!validateForm('registerForm')) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }
    
    // Lấy dữ liệu form
    const formData = new FormData(event.target);
    const userData = {
        name: formData.get('name'),
        age: formData.get('age'),
        gender: formData.get('gender'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword')
    };
    
    // Validation cơ bản
    if (!userData.gender) {
        alert('Vui lòng chọn giới tính');
        return;
    }
    
    if (userData.password !== userData.confirmPassword) {
        alert('Mật khẩu xác nhận không khớp');
        return;
    }
    
    if (userData.password.length < 6) {
        alert('Mật khẩu phải có ít nhất 6 ký tự');
        return;
    }
    
    // Logic xử lý sẽ được implement ở backend
    console.log('Register form submitted:', userData);
    
    // Hiển thị thông báo thành công (tạm thời)
    alert('Đăng ký thành công! (Demo)');
    closeModal('registerModal');
    
    // Reset form
    event.target.reset();
}

// Update user interface - placeholder cho backend integration
function updateUserInterface() {
    // Sẽ được implement khi có API backend
    console.log('Update user interface');
}

// Kiểm tra trạng thái đăng nhập
function checkLoginStatus() {
    const token = localStorage.getItem('token'); //cái này sẽ lấy token từ localStorage và lưu vào biến token
    if (token) {
        const decoded = parseJwt(token); //nếu có token thì giải mã token để lấy thông tin người dùng
        // Hỗ trợ cả chuẩn JWT (unique_name) và các key phổ biến khác
        const userName = decoded["unique_name"] || decoded["name"] || decoded["given_name"];
        if (userName) {
            showUserInterface(userName); //nếu có tên người dùng thì hiển thị giao diện người dùng đã đăng nhập
            return;
        }
    }
    showGuestInterface();
}

// Hiển thị giao diện người dùng đã đăng nhập
function showUserInterface(userName) {
    const navGuest = document.getElementById('navGuest');
    const navUser = document.getElementById('navUser');
    const userNameElement = document.getElementById('userName');
    
    if (navGuest && navUser && userNameElement) {
        // Ẩn giao diện khách với animation
        navGuest.classList.add('hidden');
        setTimeout(() => {
            navGuest.style.display = 'none';
            navUser.style.display = 'flex';
            navUser.classList.remove('hidden');
            userNameElement.textContent = userName;
        }, 150);
    }
}

// Hiển thị giao diện khách
function showGuestInterface() {
    const navGuest = document.getElementById('navGuest');
    const navUser = document.getElementById('navUser');
    
    if (navGuest && navUser) {
        // Ẩn giao diện người dùng với animation
        navUser.classList.add('hidden');
        setTimeout(() => {
            navUser.style.display = 'none';
            navGuest.style.display = 'flex';
            navGuest.classList.remove('hidden');
        }, 150);
    }
}

// Logout function
async function logout() {
    // 1️⃣ Gọi API để xóa cookie trên server
    await fetch('http://localhost:5000/gateway/driver/logoutdriver', {
        method: 'POST',
        credentials: 'include'
    });
    // Xóa thông tin đăng nhập khỏi localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    
    // Chuyển về giao diện khách
    showGuestInterface();
    
    
}

// Smooth scroll to section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Add scroll effect to navbar
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.backdropFilter = 'blur(10px)';
    } else {
        navbar.style.background = '#fff';
        navbar.style.backdropFilter = 'none';
    }
});

// Loading functions - có thể sử dụng khi integrate với API
function showLoading() {
    console.log('Show loading');
}

function hideLoading() {
    console.log('Hide loading');
}

// Handle forgot password - placeholder
function handleForgotPassword(event) {
    event.preventDefault();
    // Logic xử lý sẽ được implement ở backend
    console.log('Forgot password form submitted');
}

// Show forgot password modal
function showForgotPassword() {
    closeModal('loginModal');
    showModal('forgotPasswordModal');
}

// Show terms modal
function showTerms() {
    showModal('termsModal');
}

// Show privacy modal
function showPrivacy() {
    showModal('privacyModal');
}

// Show user profile - placeholder
function showUserProfile() {
    // Sẽ được implement khi có API backend
    console.log('Show user profile');
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const toggleBtn = input.parentElement.querySelector('.password-toggle i');
    
    if (input.type === 'password') {
        input.type = 'text';
        toggleBtn.classList.remove('fa-eye');
        toggleBtn.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        toggleBtn.classList.remove('fa-eye-slash');
        toggleBtn.classList.add('fa-eye');
    }
}

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    let strengthText = 'Mật khẩu yếu';
    
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    const strengthBar = document.getElementById('passwordStrength');
    const strengthTextEl = document.getElementById('passwordStrengthText');
    
    if (strengthBar && strengthTextEl) {
        strengthBar.className = 'strength-fill';
        
        if (strength <= 2) {
            strengthBar.classList.add('weak');
            strengthText = 'Mật khẩu yếu';
        } else if (strength <= 4) {
            strengthBar.classList.add('medium');
            strengthText = 'Mật khẩu trung bình';
        } else {
            strengthBar.classList.add('strong');
            strengthText = 'Mật khẩu mạnh';
        }
        
        strengthTextEl.textContent = strengthText;
    }
}

// Setup password strength monitoring
function setupPasswordStrength() {
    const passwordInput = document.getElementById('registerPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    }
}

// Enhanced form validation
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    const inputs = form.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = '#ef4444';
            isValid = false;
        } else {
            input.style.borderColor = '#e2e8f0';
        }
    });
    
    // Check password match for register form
    if (formId === 'registerForm') {
        const password = document.getElementById('registerPassword');
        const confirmPassword = document.getElementById('registerConfirmPassword');
        
        if (password && confirmPassword && password.value !== confirmPassword.value) {
            confirmPassword.style.borderColor = '#ef4444';
            isValid = false;
        }
    }
    
    return isValid;
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadStations();
    setupEventListeners();
    setupMobileMenu();
});

// gửi dữ liệu cho api
const GATEWAY_BASE = 'http://localhost:5000';

function gatewayFetch(path, options = {}) {
    const url = new URL(path, GATEWAY_BASE);
    const finalOptions = {
        credentials: 'include',
        ...options
    };
    console.log('Gateway request →', url.toString());
    return fetch(url.toString(), finalOptions);
}

document.getElementById("register").addEventListener("submit", async function (e) {
    e.preventDefault(); // chặn reload

    const formData = new FormData(this);               // gom dữ liệu form
    const body = Object.fromEntries(formData.entries()); // chuyển thành object
    const messagewaitre = document.getElementById("messagewaitre");
    const message = document.getElementById("message");
    
    messagewaitre.style.display = "block";
    messagewaitre.style.color = "blue";
    messagewaitre.innerText = "Đang đăng ký vui lòng chờ...";

    try {
        const res = await gatewayFetch('/gateway/driver/register', {
            method: "POST",
            headers: { "Content-Type": "application/json" }, // gửi json
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok) {
            // hiển thị lỗi
            messagewaitre.style.display = "none";
            message.style.display = "block";
            message.style.color = "red";
            message.innerText = data.message;
        } else {
            messagewaitre.style.display = "none";
            message.style.display = "block";
            message.style.color = "green";
            message.innerText = data.message;
            setTimeout(() => {
                closeModal('registerModal') // chuyển hướng về trang chủ sau 1s
            }, 600);
        }
    } catch (err) {
        messagewaitre.style.display = "none";
        message.style.display = "block";
        message.style.color = "red";
        message.innerText = "Mất kết nối";
    }
});

function parseJwt(token) {
    // 1️⃣ Lấy payload từ token
    const base64Url = token.split('.')[1]; // phải có const/let/var
    // 2️⃣ Chuyển Base64Url -> Base64 chuẩn
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    // 3️⃣ Decode UTF-8
    const jsonPayload = decodeURIComponent(
        atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
    );
    return JSON.parse(jsonPayload);
}


//login
const messagelogin = document.getElementById("messagelogin");
document.getElementById("login").addEventListener("submit", async function (e) {
    e.preventDefault(); // chặn reload

    const formData = new FormData(this);               // gom dữ liệu form
    const body = Object.fromEntries(formData.entries()); // chuyển thành object
    const messagewait = document.getElementById("messagewait");
    messagewait.style.display = "block";
    messagewait.style.color = "blue";
    messagewait.innerText = "Đang đăng nhập vui lòng chờ...";
    try {
        const res = await gatewayFetch('/gateway/driver/login', {
            method: "POST",
            headers: { "Content-Type": "application/json" }, // gửi json
            body: JSON.stringify(body)
        });

        const data = await res.json();
       

        if (!res.ok) {
            messagewait.style.display = "none"
            // hiển thị lỗi
            messagelogin.style.display = "block";
            messagelogin.style.color = "red";
            messagelogin.innerText = data.message;
        } else {
            messagewait.style.display="none"
            messagelogin.style.display = "block";
            messagelogin.style.color = "green";
            messagelogin.innerText = data.message;

            
            
            
            // Lưu tên người dùng nếu có trong response
            if (data.token) //nếu tokn tồn tại 
            {
                const decoded = parseJwt(data.token); //giải mã token để lấy thông tin lưu vào decoded
                // Hỗ trợ cả chuẩn JWT (unique_name) và các key phổ biến khác
                const userName = decoded["unique_name"] || decoded["name"] || decoded["given_name"]; //lấy tên người dùng từ decoded
                console.log(userName);
                localStorage.setItem("userName", userName); //lưu tên người dùng vào localStorage
            }

            localStorage.setItem("token", data.token); // lưu token vào localstorage

            // Cập nhật giao diện ngay lập tức
            await checkLoginStatus();
            
            setTimeout(() => {
                closeModal('loginModal') // chuyển hướng về trang chủ sau 1s
            }, 600);
        }
    } catch (err) {
        messagewait.style.display = "none"
        messagelogin.style.display = "block";
        messagelogin.style.color = "red";
        messagelogin.innerText = "Mất kết nối";
    }
});

document.getElementById("profileLink").addEventListener("click", function (e) {
    e.preventDefault();
    profile();
});

const profile = async () => {
    const token = localStorage.getItem('token');
    

    const res = await fetch('http://localhost:5000/gateway/driver/profile', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
        // Nếu backend đọc token từ cookie thay vì header, thêm:
        // credentials: 'include'
    });

    if (!res.ok) {
        // Tùy ý: hiện lỗi/UI
        console.error('Fetch profile failed:', res.status);
        return;
    }

    const data = await res.json();
    localStorage.setItem("profile", JSON.stringify(data));
    window.location.href = "account.html";
    
};







// Chọn gói thuê và chuyển đến trang thanh toán
// function selectPackage(packageType, price) {
//     // Kiểm tra đăng nhập
//     const token = localStorage.getItem('token');
//     if (!token) {
//         alert('Vui lòng đăng nhập để đăng ký gói dịch vụ');
//         showLoginModal();
//         return;
//     }

//     // Lưu thông tin gói đã chọn
//     const packageData = {
//         type: packageType,
//         price: price,
//         name: packageType === 'month' ? 'Gói tháng' : 'Gói năm',
//         duration: packageType === 'month' ? '1 tháng' : '1 năm'
//     };

//     localStorage.setItem('selectedPackage', JSON.stringify(packageData));

//     // Hiển thị thông tin trong modal thanh toán
//     document.getElementById('selectedPackageName').textContent = packageData.name;
//     document.getElementById('selectedPackagePrice').textContent = formatCurrencyVND(price);

//     // Mở modal thanh toán
//     showModal('paymentModal');
// }

// // Format tiền tệ VNĐ
// function formatCurrencyVND(amount) {
//     return new Intl.NumberFormat('vi-VN', {
//         style: 'currency',
//         currency: 'VND'
//     }).format(amount);
// }

// // Xử lý form thanh toán
// document.addEventListener('DOMContentLoaded', function() {
//     const paymentForm = document.getElementById('paymentForm');
//     if (paymentForm) {
//         paymentForm.addEventListener('submit', handlePayment);
//     }
// });

// async function handlePayment(event) {
//     event.preventDefault();

//     const token = localStorage.getItem('token');
//     if (!token) {
//         alert('Vui lòng đăng nhập lại');
//         closeModal('paymentModal');
//         showLoginModal();
//         return;
//     }

//     // Lấy thông tin gói đã chọn
//     const packageData = JSON.parse(localStorage.getItem('selectedPackage') || '{}');
//     if (!packageData.type) {
//         alert('Không tìm thấy thông tin gói dịch vụ');
//         return;
//     }

//     // Lấy phương thức thanh toán
//     const formData = new FormData(event.target);
//     const paymentMethod = formData.get('paymentMethod');

//     const paymentWait = document.getElementById('paymentWait');
//     const paymentMessage = document.getElementById('paymentMessage');

//     paymentWait.style.display = 'block';
//     paymentWait.style.color = 'blue';
//     paymentWait.innerText = 'Đang xử lý thanh toán...';

//     // Chuẩn bị dữ liệu gửi lên server
//     const paymentData = {
//         packageType: packageData.type,
//         price: packageData.price,
//         paymentMethod: paymentMethod,
//         packageName: packageData.name
//     };

//     try {
//         // Gọi API thanh toán (cần implement backend)
//         const res = await gatewayFetch('/gateway/payment/subscribe', {
//             method: 'POST',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json'
//             },
//             credentials: 'include',
//             body: JSON.stringify(paymentData)
//         });

//         const data = await res.json();

//         if (!res.ok) {
//             paymentWait.style.display = 'none';
//             paymentMessage.style.display = 'block';
//             paymentMessage.style.color = 'red';
//             paymentMessage.innerText = data.message || 'Thanh toán thất bại';
//         } else {
//             paymentWait.style.display = 'none';
//             paymentMessage.style.display = 'block';
//             paymentMessage.style.color = 'green';
//             paymentMessage.innerText = data.message || 'Thanh toán thành công!';

//             // Xóa thông tin gói đã chọn
//             localStorage.removeItem('selectedPackage');

//             setTimeout(() => {
//                 closeModal('paymentModal');
//                 // Có thể chuyển đến trang tài khoản hoặc hiển thị thông báo
//                 alert('Cảm ơn bạn đã đăng ký gói dịch vụ. Bạn có thể sử dụng dịch vụ ngay bây giờ!');
//             }, 1500);
//         }
//     } catch (err) {
//         console.error('Payment error:', err);
//         paymentWait.style.display = 'none';
//         paymentMessage.style.display = 'block';
//         paymentMessage.style.color = 'red';
//         paymentMessage.innerText = 'Lỗi kết nối. Vui lòng thử lại sau.';
//     }
// }

async function getPackagesFromAPI() {
    const token = localStorage.getItem('token');
    const res = await gatewayFetch('/gateway/payment/loggoi', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        },
        credentials: 'include'
    });
    const data = await res.json();
    console.log('Battery info:', data);

    // Lấy container
    const container = document.getElementById("packagesContainer");
    container.innerHTML = ""; // xóa nội dung cũ

    // Lặp qua từng gói
    data.forEach(pkg => {
        // Tạo khối HTML mẫu (giống cách bạn làm ở trên với nameEl...)
        const card = document.createElement("div");
        card.classList.add("package-card"); // class cho CSS

        // Template gắn dữ liệu
        //card.innerHTML = `
        //    <h3>${pkg.tendichvu || '--'}</h3>
        //    <p>${pkg.mota || '--'}</p>
        //    <p><strong>Thời hạn:</strong> ${pkg.thoihan || '--'} tháng</p>
        //    <p><strong>Số lần đổi pin:</strong> ${pkg.solandoipin || '--'}</p>
        //    <p><strong>Phí:</strong> ${pkg.phi?.toLocaleString() || '--'}đ</p>
        //    <button onclick="chonGoi(${pkg.id})" class="btn-choose">Chọn gói</button>
        //`;


        card.innerHTML = `
            <div class="package-badge">${pkg.phobien ? "Phổ biến" : ""}</div>
            <div class="package-header">
                <h3>${pkg.tendichvu || "--"}</h3>
                <div class="package-duration">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Thời gian: ${pkg.thoihan || "--"} tháng</span>
                </div>
                <div class="price">${(pkg.phi || 0).toLocaleString()}đ</div>
            </div>
            <div class="package-info">
                <div class="info-item">
                    <i class="fas fa-sync-alt"></i>
                    <span>Số lần đổi: ${pkg.solandoipin === -1 ? "Không giới hạn" : pkg.solandoipin || "--"}</span>
                </div>
            </div>
            <div class="package-description">
                <p>${pkg.mota || "Không có mô tả"}</p>
            </div>
            <button class="btn" onclick="chonGoi(${pkg.id})">
                Chọn gói
            </button>
        `;

        container.appendChild(card);
    });
}
function formatThoiGian(phut) {
    if (phut < 60) return `${Math.round(phut)} phút`;
    const gio = Math.floor(phut / 60);
    const phutConLai = Math.round(phut % 60);
    return `${gio} giờ ${phutConLai} phút`;
}


// Helper: format tiền VND
function formatCurrencyVND(amount) {
    const n = Number(amount ?? 0);
    if (Number.isNaN(n)) return '0đ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0
    }).format(n);
    // Nếu muốn dạng "1.234.567đ": return n.toLocaleString('vi-VN') + 'đ';
}

    async function chonGoi(Idgoi) {
        const token = localStorage.getItem('token');
        const res = await gatewayFetch(`/gateway/payment/loggoiid/${Idgoi}`, {
            method: 'GET',
            headers: {
                'authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            credentials: 'include'


        });
        localStorage.setItem('selectedPackageId', String(Idgoi));

        // CHUYỂN TRANG
        window.location.href = `payment.html?packageId=${encodeURIComponent(Idgoi)}`;
        const data = await res.json();
        const NamegoiEl = document.getElementById("selectedPackageName");
        if (NamegoiEl) {
            NamegoiEl.textContent = data.tendichvu || "Gói dịch vụ";
        }
        const PricegoiEl = document.getElementById("selectedPackagePrice");
        if (PricegoiEl) {
            PricegoiEl.textContent = formatCurrencyVND(data.phi || 0);
        }
        const MotaEl = document.getElementById("Mota");
        if (MotaEl) {
            MotaEl.textContent = data.mota || "Không có mô tả";
        }
        const ThoihanEl = document.getElementById("Thoihan");
        if (ThoihanEl) {
            ThoihanEl.textContent = data.thoihan ? `${data.thoihan} tháng` : "Không xác định";
        }
        const SolandoipinEl = document.getElementById("Solandoipin");
        if (SolandoipinEl) {
            SolandoipinEl.textContent = data.solandoipin === -1 ? "Không giới hạn" : (data.solandoipin || "--");
        }
    }




let autocomplete;
let selectedLatLng = null; // lưu kinh độ và vĩ độ

async function initAutocomplete() {
    // Tạo autocomplete
    const input = document.getElementById('locationInput');

    // Dùng PlaceAutocompleteElement
    autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['geocode'],  // chỉ địa chỉ
        componentRestrictions: { country: 'vn' } // chỉ Việt Nam
    });

    // Khi người dùng chọn địa chỉ
    autocomplete.addListener('place_changed', async function () {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            alert("Địa chỉ không hợp lệ!");
            selectedLatLng = null;
            return;
        }
        selectedLatLng = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
        };
        console.log("Địa chỉ:", place.formatted_address);
        console.log("Kinh độ, vĩ độ:", selectedLatLng);


        const token = localStorage.getItem('token');
        console.log("Token hiện tại:", token);
        const res = await gatewayFetch(`/gateway/station/map/${selectedLatLng.lat}/${selectedLatLng.lng}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            credentials: 'include'


        });
        const data =await res.json();
        console.log("Battery info:", data);


        stationsData = data.map(item => ({
            id: item.tram.id,
            name: item.tram.tentram,
            address: item.tram.diachi,
            phone: item.tram.sodienthoaitd,
            openTime: item.tram.giomocua,
            closeTime: item.tram.giodongcua,
            khoangcach: `${item.khoangCachKm.toFixed(1)} km`,
            thoigianden: formatThoiGian(parseFloat(item.thoiGianPhut)),
        }));

        loadStations();


    });
    
    

}

// Khi nhấn nút tìm kiếm
document.getElementById('btnSearch').addEventListener('click', function () {
    if (!selectedLatLng) {
        alert("Vui lòng chọn địa chỉ hợp lệ từ gợi ý!");
        return;
    }
    console.log("Gọi API với kinh độ, vĩ độ:", selectedLatLng);
    // TODO: Gọi API của bạn ở đây
});





function loaddanhsach() {
    const stationsGrid = document.getElementById('stationsGrid');
    if (!stationsGrid) return;

    let filteredStations = stationsData;

    if (currentFilter !== 'all') {
        filteredStations = stationsData.filter(station => station.status === currentFilter);
    }
    //<span class="station-status status-${station.status}">
    //                    ${getStatusText(station.status)}
    //                </span>

    //<p><i class="fas fa-battery-full"></i> Điện thoại: ${station.phone}</p>


    stationsGrid.innerHTML = filteredStations.map(station => `
        <div class="station-card">
            <div class="station-header">
                <h3 class="station-name">${station.name}</h3>
                
            </div>
            <div class="station-info">
                <p><i class="fas fa-map-marker-alt"></i> ${station.address}</p>
                
                <p><i class="fas fa-charging-station"></i> Giờ mở cửa: ${station.openTime}</p>
                <p><i class="fas fa-tools"></i> Giờ đóng cửa: ${station.closeTime}</p>
                <p><i class="fas fa-phone"></i> ${station.phone}</p>
            </div>
            <div class="station-actions">
                <button class="btn btn-primary" onclick="bookStation(${station.id})">
                    <i class="fas fa-calendar-check"></i> Đặt chỗ
                </button>
                <button class="btn btn-outline" onclick="getDirections(${station.id})">
                    <i class="fas fa-directions"></i> Chỉ đường
                </button>
            </div>
        </div>
    `).join('');

}





async function Stationds() {

        const res = await gatewayFetch('/gateway/station/danhsach', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            credentials: 'include'


        });
        const data = await res.json();
        console.log("Battery info:", data);


        stationsData = data.map(item => ({
            id: item.id,
            name: item.tentram,
            address: item.diachi,
            phone: item.sodienthoaitd,
            openTime: item.giomocua,
            closeTime: item.giodongcua,
        }));

        loaddanhsach();


  



}


function bookStation(stationId) {
    // Chuyển hướng sang trang booking, kèm id trạm
    window.location.href = `/booking.html?stationId=${stationId}`;

}



