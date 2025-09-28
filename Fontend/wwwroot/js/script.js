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
let currentUser = null;
let currentFilter = 'all';

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadStations();
    setupEventListeners();
    setupMobileMenu();
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
    const loginForm = document.querySelector('#loginModal form');
    const registerForm = document.querySelector('#registerModal form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
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

// Book a station
function bookStation(stationId) {
    const station = stationsData.find(s => s.id === stationId);
    if (!station) return;

    if (!currentUser) {
        showLoginModal();
        return;
    }

    if (station.status !== 'available') {
        alert('Trạm này hiện không khả dụng để đặt chỗ.');
        return;
    }

    if (station.batteries === 0) {
        alert('Trạm này hiện không có pin sẵn sàng.');
        return;
    }

    // Simulate booking process
    const bookingTime = new Date();
    bookingTime.setHours(bookingTime.getHours() + 1);
    
    alert(`Đặt chỗ thành công!\nTrạm: ${station.name}\nThời gian: ${bookingTime.toLocaleString('vi-VN')}\nPin có sẵn: ${station.batteries}`);
    
    // Update station data
    station.batteries -= 1;
    loadStations();
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

// Handle login
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Simulate login process
    if (email && password) {
        currentUser = {
            email: email,
            name: email.split('@')[0]
        };
        
        alert('Đăng nhập thành công!');
        closeModal('loginModal');
        updateUserInterface();
    } else {
        alert('Vui lòng nhập đầy đủ thông tin.');
    }
}

// Handle register
function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const vehicle = document.getElementById('registerVehicle').value;
    
    // Simulate registration process
    if (name && email && phone && password && vehicle) {
        currentUser = {
            name: name,
            email: email,
            phone: phone,
            vehicle: vehicle
        };
        
        alert('Đăng ký thành công!');
        closeModal('registerModal');
        updateUserInterface();
    } else {
        alert('Vui lòng nhập đầy đủ thông tin.');
    }
}

// Update user interface after login/register
function updateUserInterface() {
    const navButtons = document.querySelector('.nav-buttons');
    if (navButtons && currentUser) {
        navButtons.innerHTML = `
            <div class="user-info">
                <span>Xin chào, ${currentUser.name}</span>
                <button class="btn btn-outline" onclick="logout()">Đăng xuất</button>
            </div>
        `;
    }
}

// Logout function
function logout() {
    currentUser = null;
    const navButtons = document.querySelector('.nav-buttons');
    if (navButtons) {
        navButtons.innerHTML = `
            <button class="btn btn-outline" onclick="showLoginModal()">Đăng nhập</button>
            <button class="btn btn-primary" onclick="showRegisterModal()">Đăng ký</button>
        `;
    }
    alert('Đã đăng xuất thành công!');
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

// Add loading animation
function showLoading() {
    const loading = document.createElement('div');
    loading.id = 'loading';
    loading.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-battery-full"></i>
        </div>
    `;
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;
    document.body.appendChild(loading);
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.remove();
    }
}

// Simulate API calls with loading
function simulateApiCall(callback, delay = 1000) {
    showLoading();
    setTimeout(() => {
        callback();
        hideLoading();
    }, delay);
}

// Initialize with loading simulation
document.addEventListener('DOMContentLoaded', function() {
    simulateApiCall(() => {
        loadStations();
        setupEventListeners();
        setupMobileMenu();
    }, 500);
});