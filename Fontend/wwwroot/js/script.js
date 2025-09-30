// Sample station data
const stationsData = [
    {
        id: 1,
        name: "Trạm đổi pin Quận 1",
        address: "123 Nguyễn Huệ, Quận 1, TP.HCM",
        distance: "0.5 km",
        status: "available",
        batteries: 15,
        charging: 8,
        maintenance: 2,
        rating: 4.8,
        phone: "028-1234-5678"
    },
    {
        id: 2,
        name: "Trạm đổi pin Quận 2",
        address: "456 Võ Văn Tần, Quận 2, TP.HCM",
        distance: "1.2 km",
        status: "charging",
        batteries: 5,
        charging: 12,
        maintenance: 1,
        rating: 4.6,
        phone: "028-2345-6789"
    },
    {
        id: 3,
        name: "Trạm đổi pin Quận 3",
        address: "789 Lê Văn Sỹ, Quận 3, TP.HCM",
        distance: "2.1 km",
        status: "maintenance",
        batteries: 0,
        charging: 0,
        maintenance: 20,
        rating: 4.9,
        phone: "028-3456-7890"
    },
    {
        id: 4,
        name: "Trạm đổi pin Quận 7",
        address: "321 Nguyễn Thị Thập, Quận 7, TP.HCM",
        distance: "3.5 km",
        status: "available",
        batteries: 20,
        charging: 5,
        maintenance: 0,
        rating: 4.7,
        phone: "028-4567-8901"
    }
];

// DOM Elements
let currentFilter = 'all';

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadStations();
    setupEventListeners();
    setupMobileMenu();
    setupPasswordStrength();
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

    stationsGrid.innerHTML = filteredStations.map(station => `
        <div class="station-card">
            <div class="station-header">
                <h3 class="station-name">${station.name}</h3>
                <span class="station-status status-${station.status}">
                    ${getStatusText(station.status)}
                </span>
            </div>
            <div class="station-info">
                <p><i class="fas fa-map-marker-alt"></i> ${station.address}</p>
                <p><i class="fas fa-route"></i> Cách đây ${station.distance}</p>
                <p><i class="fas fa-battery-full"></i> Pin có sẵn: ${station.batteries}</p>
                <p><i class="fas fa-charging-station"></i> Đang sạc: ${station.charging}</p>
                <p><i class="fas fa-tools"></i> Bảo trì: ${station.maintenance}</p>
                <p><i class="fas fa-star"></i> Đánh giá: ${station.rating}/5</p>
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
function searchStations() {
    const locationInput = document.getElementById('locationInput');
    const query = locationInput.value.toLowerCase();
    
    if (query.trim() === '') {
        loadStations();
        return;
    }

    const filteredStations = stationsData.filter(station => 
        station.name.toLowerCase().includes(query) ||
        station.address.toLowerCase().includes(query)
    );

    const stationsGrid = document.getElementById('stationsGrid');
    if (!stationsGrid) return;

    stationsGrid.innerHTML = filteredStations.map(station => `
        <div class="station-card">
            <div class="station-header">
                <h3 class="station-name">${station.name}</h3>
                <span class="station-status status-${station.status}">
                    ${getStatusText(station.status)}
                </span>
            </div>
            <div class="station-info">
                <p><i class="fas fa-map-marker-alt"></i> ${station.address}</p>
                <p><i class="fas fa-route"></i> Cách đây ${station.distance}</p>
                <p><i class="fas fa-battery-full"></i> Pin có sẵn: ${station.batteries}</p>
                <p><i class="fas fa-charging-station"></i> Đang sạc: ${station.charging}</p>
                <p><i class="fas fa-tools"></i> Bảo trì: ${station.maintenance}</p>
                <p><i class="fas fa-star"></i> Đánh giá: ${station.rating}/5</p>
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

// Book a station - placeholder
function bookStation(stationId) {
    // Logic xử lý sẽ được implement ở backend
    console.log('Book station:', stationId);
}

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

// Logout function - placeholder
function logout() {
    // Sẽ được implement khi có API backend
    console.log('Logout');
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

document.getElementById("register").addEventListener("submit", async function (e) {
    e.preventDefault(); // chặn reload

    const formData = new FormData(this);               // gom dữ liệu form
    const body = Object.fromEntries(formData.entries()); // chuyển thành object

    try {
        const res = await fetch("http://localhost:5000/gateway/driver/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" }, // gửi json
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok) {
            // hiển thị lỗi
            message.style.display = "block";
            message.style.color = "red";
            message.innerText = data.message;
        } else {
            message.style.display = "block";
            message.style.color = "green";
            message.innerText = data.message;
        }
    } catch (err) {
        message.style.display = "block";
        message.style.color = "red";
        message.innerText = "Mất kết nối";
    }
});