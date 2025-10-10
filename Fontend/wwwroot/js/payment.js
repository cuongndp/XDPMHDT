// ==============================
// PAYMENT.JS - PRODUCTION MODE
// ==============================

const API_BASE_URL = 'https://localhost:5000';

// Biến lưu trữ
let selectedPackageData = null;

// Helper fetch qua gateway
async function gatewayFetch(url, options = {}) {
    const fullUrl = `${API_BASE_URL}${url}`;
    return fetch(fullUrl, options);
}

// Format tiền tệ VNĐ
function formatCurrencyVND(amount) {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount) || 0;
    }
    return amount.toLocaleString('vi-VN') + 'đ';
}

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', function () {
    checkLoginStatus();
    getPackagesFromAPI();
    //setupEventListeners();
});

// Bắt buộc đăng nhập
function checkLoginStatus() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Vui lòng đăng nhập để tiếp tục thanh toán!');
        window.location.href = 'index.html';
    }
}

// Đọc package + profile từ API và render
async function getPackagesFromAPI() {
    const token = localStorage.getItem('token');
    let id = new URLSearchParams(window.location.search).get('packageId') || localStorage.getItem('selectedPackageId');

    if (!id) {
        alert('Không tìm thấy gói dịch vụ. Vui lòng chọn lại gói.');
        window.location.href = 'index.html#packages';
        return;
    }

    try {
        // Gọi API lấy chi tiết gói
        const [resPackage, resProfile] = await Promise.all([
            gatewayFetch(`/gateway/payment/paymentgetgoi/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                credentials: 'include'
            }),
            gatewayFetch('/gateway/driver/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                credentials: 'include'
            })
        ]);

        if (!resPackage.ok) {
            const err = await resPackage.json().catch(() => ({}));
            throw new Error(err.message || 'Không lấy được thông tin gói.');
        }
        if (!resProfile.ok) {
            const err = await resProfile.json().catch(() => ({}));
            throw new Error(err.message || 'Không lấy được thông tin người dùng.');
        }

        const data = await resPackage.json();
        const profiledata = await resProfile.json();

        // Lưu để dùng khi thanh toán
        selectedPackageData = data;
        localStorage.setItem('selectedPackageId', String(id));

        // Render gói
        const nameEl = document.getElementById('packageName');
        if (nameEl) nameEl.textContent = data.tendichvu || 'Gói dịch vụ';

        const durationEl = document.getElementById('packageDuration');
        if (durationEl) durationEl.textContent = data.thoihan ? `${data.thoihan} tháng` : 'Không xác định';

        const swapsEl = document.getElementById('packageSwaps');
        if (swapsEl) swapsEl.textContent = (data.solandoipin === '-1' || data.solandoipin === -1)
            ? 'Không giới hạn'
            : `${data.solandoipin} lần đổi`;

        const descriptionEl = document.getElementById('packageDescription');
        if (descriptionEl) descriptionEl.textContent = data.mota || 'Không có mô tả';

        const priceEl = document.getElementById('packagePrice');
        if (priceEl) priceEl.textContent = formatCurrencyVND(data.phi || 0);

        // Tính VAT 10% và tổng
        const basePrice = parseFloat(data.phi) || 0;
        const vat = basePrice * 0.10;
        const total = basePrice + vat;

        //const vatEl = document.getElementById('vatAmount');
        //if (vatEl) vatEl.textContent = formatCurrencyVND(vat);

        //const totalEl = document.getElementById('totalPrice');
        //if (totalEl) totalEl.textContent = formatCurrencyVND(total);
        
        // Render thông tin người dùng
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = profiledata.name || 'Chưa cập nhật';

        const userEmailEl = document.getElementById('userEmail');
        if (userEmailEl) userEmailEl.textContent = profiledata.email || 'Chưa cập nhật';

        const userPhoneEl = document.getElementById('userPhone');
        if (userPhoneEl) userPhoneEl.textContent = profiledata.sodienthoai || 'Chưa cập nhật';

        const userAgeEl = document.getElementById('userAge');
        if (userAgeEl) userAgeEl.textContent = profiledata.age ? `${profiledata.age} tuổi` : 'Chưa cập nhật';

        const userGenderEl = document.getElementById('userGender');
        if (userGenderEl) userGenderEl.textContent = profiledata.gioitinh || 'Chưa cập nhật';
        console.log(profiledata);
        console.log(data);
    } catch (error) {
        console.error('getPackagesFromAPI error:', error);
        showMessage('error', error.message || 'Không thể tải dữ liệu. Vui lòng thử lại.');
        //setTimeout(() => {
        //    window.location.href = 'index.html#packages';
        //}, 1500);
    }
}

//// Lắng nghe submit form
//function setupEventListeners() {
//    const form = document.getElementById('paymentForm');
//    if (form) {
//        form.addEventListener('submit', handlePayment);
//    }
//}

// Xử lý thanh toán (gọi API thật)
async function handlePayment(e) {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('error', 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        setTimeout(() => (window.location.href = 'index.html'), 1200);
        return;
    }

    // Lấy phương thức thanh toán
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    if (!paymentMethod) {
        showMessage('error', 'Vui lòng chọn phương thức thanh toán.');
        return;
    }

    // Lấy packageId
    const packageId = new URLSearchParams(window.location.search).get('packageId')
        || localStorage.getItem('selectedPackageId');

    if (!packageId) {
        showMessage('error', 'Thiếu thông tin gói dịch vụ. Vui lòng chọn lại.');
        setTimeout(() => (window.location.href = 'index.html#packages'), 1200);
        return;
    }

    // Nút loading
    const submitBtn = document.getElementById('submitPaymentBtn');
    const originalBtnText = submitBtn?.innerHTML;
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
        submitBtn.disabled = true;
    }

    try {
        // Gọi API thanh toán (chỉnh payload/endpoint theo backend của bạn)
        const res = await gatewayFetch('/gateway/payment/subscribe', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                packageId: Number(packageId),
                paymentMethod
            })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(data.message || 'Thanh toán thất bại');
        }

        showMessage('success', data.message || 'Thanh toán thành công!');
        // Xoá lựa chọn gói
        localStorage.removeItem('selectedPackageId');

        // Điều hướng sau khi thành công (nếu muốn)
        setTimeout(() => {
            // window.location.href = 'account.html';
        }, 1200);

    } catch (error) {
        console.error('Payment error:', error);
        showMessage('error', error.message || 'Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại.');
    } finally {
        if (submitBtn) {
            setTimeout(() => {
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }, 1200);
        }
    }
}

// Hiển thị thông báo
function showMessage(type, message) {
    const messageEl = document.getElementById('paymentMessage');
    if (!messageEl) return;

    messageEl.className = `alert-message ${type}`;
    const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
    messageEl.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    messageEl.style.display = 'flex';
    messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (type !== 'error') {
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
}

// Quay lại
function goBack() {
    window.history.back();
}



document.getElementById("paymentForm").addEventListener("submit", async function (e) {
    e.preventDefault(); // chặn reload
    const formData = new FormData(this);
    const body = Object.fromEntries(formData.entries());
    const token = localStorage.getItem('token');
    let id = new URLSearchParams(window.location.search).get('packageId') || localStorage.getItem('selectedPackageId');

    try {
        //const res = await gatewayFetch('/gateway/driver/register', {
        //    method: "POST",
        //    headers: { "Content-Type": "application/json" }, // gửi json
        //    body: JSON.stringify(body)
        //});

        //const data = await res.json();

        
        const res = await gatewayFetch(`/gateway/payment/paymentgetgoi/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                
            },
            credentials: 'include'
        });
        const data = await res.json();
        const payload = {
            ...body,
            iddichvu: String(id),
            thoihan: String(data.thoihan),
            solandoipin: String(data.solandoipin),
        };

        const res2 = await gatewayFetch('/gateway/driver/dangkydichvu', {

            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            credentials: 'include',
                body: JSON.stringify(payload)
        });
        const data2 = await res2.json();
        
        //const messagedangky = document.getElementById("messagedangky");
        const messageform = document.getElementById("messageform");

        //messagedangky.style.display = "block";
        //messagedangky.style.color = "blue";
        //messagedangky.innerText = "Đang đăng ký vui lòng chờ...";

        if (!res2.ok) {
            //// hiển thị lỗi
            //messagedangky.style.display = "none";
            messageform.style.display = "block";
            messageform.style.color = "red";
            messageform.innerText = data2.message;
            setTimeout(() => {
                window.location.href = 'index.html';// chuyển hướng về trang chủ sau 1s
            }, 1500);
        } else {
            //messagedangky.style.display = "none";
            messageform.style.display = "block";
            messageform.style.color = "green";
            messageform.innerText = data2.message;
            setTimeout(() => {
                window.location.href = 'index.html';// chuyển hướng về trang chủ sau 1s
            }, 1500);
        }
    } catch (err) {
        //messagedangky.style.display = "none";
        messageform.style.display = "block";
        messageform.style.color = "red";
        messageform.innerText = "Mất kết nối";
    }




});