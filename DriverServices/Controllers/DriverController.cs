using DriverServices.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace DriverServices.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DriverController : ControllerBase
    {
        public readonly DriverServiceDbContext _context;
        public DriverController(DriverServiceDbContext context)
        {
            _context = context;
        }


        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] Dictionary<string, string> data)
        {
            try
            {
                string confirmpassword = data["confirmpassword"];
                User user = new User()
                {
                    Name = data["name"],
                    Email = data["email"],
                    Password = data["password"],
                    Age = int.Parse(data["age"]),
                    SoDienThoai = data["sodienthoai"],
                    GioiTinh = data["gioitinh"]
                };

                if (ModelState.IsValid)
                {
                    var email = _context.Users.FirstOrDefault(p => p.Email == user.Email);
                    if (email != null)
                    {
                        return BadRequest(new { message = "Email đã tồn tại" });
                    }
                    var phone = _context.Users.FirstOrDefault(p => p.SoDienThoai == user.SoDienThoai);
                    if (phone != null)
                    {
                        return BadRequest(new { message = "Số điện thoại đã tồn tại" });
                    }
                    else if (user.Password != confirmpassword)
                    {
                        return BadRequest(new { message = "Mật khẩu xác nhận không trùng khớp" });
                    }
                    else
                    {
                        var hash = BCrypt.Net.BCrypt.HashPassword(user.Password);
                        var list = new User
                        {
                            Name = user.Name,
                            Email = user.Email,
                            Password = hash,
                            Age = user.Age,
                            Role = "driver",
                            SoDienThoai = user.SoDienThoai,
                            GioiTinh = user.GioiTinh
                        };
                        _context.Add(list);
                        try
                        {
                            await _context.SaveChangesAsync();
                        }
                        catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
                        {
                            var inner = ex.InnerException?.Message ?? ex.Message;
                            return StatusCode(500, new { message = $"Lỗi cơ sở dữ liệu: {inner}" });
                        }
                        return Ok(new { message = "Đăng ký thành công" });
                    }
                }
                else
                {
                    return BadRequest(new { message = "Dữ liệu không hợp lệ" });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi register: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] Dictionary<string, string> data)
        {
            var user = await _context.Users.FirstOrDefaultAsync(p => p.Email == data["email"]);
            if (user == null)
            {
                return BadRequest(new { message = "Email không tồn tại" });
            }
            else if (!BCrypt.Net.BCrypt.Verify(data["password"], user.Password))
            {
                return BadRequest(new { message = "Mật khẩu không đúng" });
            }
            else
            {
                // 1️⃣ Tạo token JWT
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.ASCII.GetBytes("xay_dung_phan_men_huong_doi_tuong"); // đổi thành key bí mật
                var tokenDescriptor = new SecurityTokenDescriptor
                {
                    Subject = new ClaimsIdentity(new[]
                    {
                        new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.Name),
                new Claim("role", user.Role)
            }),
                    Expires = DateTime.UtcNow.AddHours(1),
                    Issuer = "ApiGateway",   // 👈 phải trùng với ValidIssuer
                    Audience = "DriveService", // token hết hạn sau 1 giờ
                    SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
                };

                var token = tokenHandler.CreateToken(tokenDescriptor);
                var tokenString = tokenHandler.WriteToken(token);
                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true, // chỉ gửi qua HTTPS
                    SameSite = SameSiteMode.None,
                    Expires = DateTime.UtcNow.AddMinutes(30)
                };
                Response.Cookies.Append("access_token", tokenString, cookieOptions);

                // 2️⃣ Trả về token cùng message
                return Ok(new { message = "Đăng nhập thành công", token = tokenString });
            }

        }

        // API Login cho Nhân viên (Staff)
        [HttpPost("staff/login")]
        public async Task<IActionResult> StaffLogin([FromBody] Dictionary<string, string> data)
        {
            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(p => p.Email == data["email"]);
                
                if (user == null)
                {
                    return BadRequest(new { message = "Email không tồn tại" });
                }
                
                // Kiểm tra role phải là staff
                if (user.Role != "staff")
                {
                    return BadRequest(new { message = "Tài khoản không có quyền nhân viên" });
                }
                
                if (!BCrypt.Net.BCrypt.Verify(data["password"], user.Password))
                {
                    return BadRequest(new { message = "Mật khẩu không đúng" });
                }
                
                // Tạo token JWT cho staff
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.ASCII.GetBytes("xay_dung_phan_men_huong_doi_tuong");
                var tokenDescriptor = new SecurityTokenDescriptor
                {
                    Subject = new ClaimsIdentity(new[]
                    {
                        new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                        new Claim(JwtRegisteredClaimNames.Email, user.Email),
                        new Claim(JwtRegisteredClaimNames.UniqueName, user.Name),
                        new Claim(ClaimTypes.Role, "staff"),
                        new Claim("role", "staff")
                    }),
                    Expires = DateTime.UtcNow.AddHours(8), // Staff session dài hơn
                    Issuer = "ApiGateway",
                    Audience = "DriveService",
                    SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
                };

                var token = tokenHandler.CreateToken(tokenDescriptor);
                var tokenString = tokenHandler.WriteToken(token);
                
                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.None,
                    Expires = DateTime.UtcNow.AddHours(8)
                };
                Response.Cookies.Append("staff_token", tokenString, cookieOptions);

                return Ok(new 
                { 
                    message = "Đăng nhập nhân viên thành công", 
                    token = tokenString,
                    user = new
                    {
                        id = user.Id,
                        name = user.Name,
                        email = user.Email,
                        role = user.Role
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi staff login: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        [HttpPost("logoutdriver")]
        [Authorize(Roles = "driver")]
        public IActionResult Logout()
        {
            // Xóa cookie chứa token
            Response.Cookies.Delete("access_token");
            return Ok(new { message = "Đăng xuất thành công" });
        }

        [HttpPost("staff/logout")]
        [Authorize(Roles = "staff")]
        public IActionResult StaffLogout()
        {
            // Xóa cookie staff token
            Response.Cookies.Delete("staff_token");
            return Ok(new { message = "Đăng xuất nhân viên thành công" });
        }


        [HttpGet("profile")]
        [Authorize(Roles ="driver")]
        public IActionResult profile()
        {
            var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            var user = _context.Users.FirstOrDefault(p => p.Id == int.Parse(userId));

            return Ok(new
            {
                id = user.Id,
                name = user.Name,
                email = user.Email,
                age = user.Age,
                sodienthoai = user.SoDienThoai,
                gioitinh = user.GioiTinh
            });
        }

        // GET: api/Driver/user/{id} - Lấy thông tin user theo ID (dùng cho PaymentService hoặc frontend)
        [HttpGet("user/{id}")]
        public async Task<IActionResult> GetUserById(int id)
        {
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    return NotFound(new { message = "Không tìm thấy user" });
                }

                return Ok(new
                {
                    id = user.Id,
                    name = user.Name,
                    email = user.Email,
                    role = user.Role,
                    age = user.Age,
                    sodienthoai = user.SoDienThoai,
                    gioitinh = user.GioiTinh
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi lấy user: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // GET: api/Driver/users/all - Lấy danh sách tất cả users (cho admin)
        [HttpGet("users/all")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetAllUsers([FromQuery] string? role = null)
        {
            try
            {
                var query = _context.Users.AsQueryable();

                // Filter theo role nếu có
                if (!string.IsNullOrEmpty(role))
                {
                    query = query.Where(u => u.Role == role);
                }

                var users = await query.Select(u => new
                {
                    id = u.Id,
                    name = u.Name,
                    email = u.Email,
                    role = u.Role,
                    age = u.Age,
                    sodienthoai = u.SoDienThoai,
                    gioitinh = u.GioiTinh
                }).ToListAsync();

                return Ok(users);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi lấy danh sách users: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // POST: api/Driver/users - Tạo user mới (cho admin)
        [HttpPost("users")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> CreateUser([FromBody] Dictionary<string, string> data)
        {
            try
            {
                // Validate
                if (!data.ContainsKey("name") || !data.ContainsKey("email") || !data.ContainsKey("password"))
                {
                    return BadRequest(new { message = "Thiếu thông tin bắt buộc" });
                }

                // Kiểm tra email đã tồn tại
                var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == data["email"]);
                if (existingUser != null)
                {
                    return BadRequest(new { message = "Email đã tồn tại" });
                }

                // Hash password
                var hashedPassword = BCrypt.Net.BCrypt.HashPassword(data["password"]);

                var user = new User
                {
                    Name = data["name"],
                    Email = data["email"],
                    Password = hashedPassword,
                    Role = data.ContainsKey("role") ? data["role"] : "driver",
                    SoDienThoai = data.ContainsKey("sodienthoai") ? data["sodienthoai"] : null,
                    Age = data.ContainsKey("age") && int.TryParse(data["age"], out int age) ? age : null,
                    GioiTinh = data.ContainsKey("gioitinh") ? data["gioitinh"] : null
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Tạo user thành công",
                    id = user.Id,
                    user = new
                    {
                        id = user.Id,
                        name = user.Name,
                        email = user.Email,
                        role = user.Role,
                        age = user.Age,
                        sodienthoai = user.SoDienThoai,
                        gioitinh = user.GioiTinh
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi tạo user: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // PUT: api/Driver/users/{id} - Cập nhật user (cho admin)
        [HttpPut("users/{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] Dictionary<string, string> data)
        {
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    return NotFound(new { message = "Không tìm thấy user" });
                }

                // Cập nhật thông tin
                if (data.ContainsKey("name"))
                    user.Name = data["name"];
                if (data.ContainsKey("email"))
                {
                    // Kiểm tra email trùng
                    var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == data["email"] && u.Id != id);
                    if (existingUser != null)
                    {
                        return BadRequest(new { message = "Email đã tồn tại" });
                    }
                    user.Email = data["email"];
                }
                if (data.ContainsKey("password") && !string.IsNullOrEmpty(data["password"]))
                {
                    user.Password = BCrypt.Net.BCrypt.HashPassword(data["password"]);
                }
                if (data.ContainsKey("role"))
                    user.Role = data["role"];
                if (data.ContainsKey("sodienthoai"))
                    user.SoDienThoai = data["sodienthoai"];
                if (data.ContainsKey("age") && int.TryParse(data["age"], out int age))
                    user.Age = age;
                if (data.ContainsKey("gioitinh"))
                    user.GioiTinh = data["gioitinh"];

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Cập nhật user thành công",
                    id = user.Id,
                    user = new
                    {
                        id = user.Id,
                        name = user.Name,
                        email = user.Email,
                        role = user.Role,
                        age = user.Age,
                        sodienthoai = user.SoDienThoai,
                        gioitinh = user.GioiTinh
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi cập nhật user: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // DELETE: api/Driver/users/{id} - Xóa user (cho admin)
        [HttpDelete("users/{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    return NotFound(new { message = "Không tìm thấy user" });
                }

                _context.Users.Remove(user);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Xóa user thành công" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi xóa user: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        [HttpPost("formthemxe")]
        [Authorize]
        public async Task<IActionResult> formthemxe([FromBody] Dictionary<string, string> data)
        {
            var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            PhuongTien pt = new PhuongTien()
            {
                Tenphuongtien = data["tenphuongtien"],
                Bienso = data["bienso"],
                Idloaipin = int.Parse(data["idloaipin"]),
                Iduser = int.Parse(userId)
            };
            if (ModelState.IsValid)
            {
                var bienSo = await _context.PhuongTiens.FirstOrDefaultAsync(p => p.Bienso == pt.Bienso);

                var user = await _context.PhuongTiens.FirstOrDefaultAsync(p => p.Iduser == pt.Iduser);
                if (user != null)
                {
                    return BadRequest(new { message = "Bạn đã có phương tiện" });
                }
                else
                {
                    if (bienSo != null)
                    {
                        return BadRequest(new { message = "Biển số đã tồn tại" });
                    }
                    else
                    {
                        var list = new PhuongTien
                        {
                            Tenphuongtien = pt.Tenphuongtien,
                            Bienso = pt.Bienso,
                            Idloaipin = pt.Idloaipin,
                            Iduser = pt.Iduser
                        };
                        _context.Add(list);
                        try
                        {
                            await _context.SaveChangesAsync();
                        }
                        catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
                        {
                            var inner = ex.InnerException?.Message ?? ex.Message;
                            return StatusCode(500, new { message = $"Lỗi cơ sở dữ liệu: {inner}" });
                        }
                        return Ok(new { message = "Thêm phương tiện thành công" });
                    }
                }
            }
            else
            {
                return BadRequest(new { message = "Dữ liệu không hợp lệ" });
            }
        }

        [Authorize]
        [HttpGet("check")]
        public async Task<IActionResult> Check()
        {
            var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            int iduser = int.Parse(userId);
            var user = await _context.PhuongTiens.FirstOrDefaultAsync(p => p.Iduser == iduser);
            if (user == null)
            {
                return BadRequest(new { message = "Bạn chưa có phương tiện" });
            }
            else
                return Ok(new PhuongTien
                {
                    Tenphuongtien = user.Tenphuongtien,
                    Bienso = user.Bienso,
                    Idloaipin = user.Idloaipin,
                    Id=user.Id,
                });
        }

        [Authorize("driver")]
        [HttpPost("dangkydichvu")]
        public async Task<IActionResult> Themdv([FromBody] Dictionary<string, string> data)
        {
            try
            {
                
                var userid = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
                int iduser = int.Parse(userid);
                var dv = await _context.DangKyDichVus.FirstOrDefaultAsync(p => p.Iduser == iduser);
                if (dv != null)
                {
                    return BadRequest(new { message = "Bạn đã đăng ký dịch vụ rồi" });
                }
                else
                {

                    var day = DateOnly.FromDateTime(DateTime.Now);
                    int month = int.Parse(data["thoihan"]);
                    var ngayketthuc = day.AddMonths(3);

                    DangKyDichVu dk = new DangKyDichVu()
                    {
                        Iduser = iduser,
                        Iddichvu = int.Parse(data["iddichvu"]),
                        Ngaydangky = day,
                        Ngayketthuc = ngayketthuc,
                        Trangthai = "Đang hoạt động",
                        Solandoipin = data["solandoipin"],
                        Phuongthucthanhtoan = data["phuongthucthanhtoan"],
                        Trangthaithanhtoan = "Đã thanh toán"
                    };
                    _context.Add(dk);
                    await _context.SaveChangesAsync();
                    return Ok(new { message = "Đăng ký dịch vụ thành công" });
                }
            }
            catch (Exception ex)
            {

                return BadRequest(ex.Message);
            }
        }


        [Authorize("driver")]
        [HttpGet("logdichvu")]
        public async Task<IActionResult> GetLogDichVu()
        {
            var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            int iduser = int.Parse(userId);
            var logdichvu = await _context.DangKyDichVus
                .Where(p => p.Iduser == iduser)
                .Select(p=> new {
                    p.Iddichvu,
                    p.Ngaydangky,
                    p.Ngayketthuc,
                    p.Solandoipin,
                }).FirstOrDefaultAsync();
            if (logdichvu == null)
                return BadRequest();
            else
                return Ok(logdichvu);
        }

        // GET: api/Driver/dangkydichvu/user/{userId} - Lấy đăng ký dịch vụ của user (cho admin)
        [HttpGet("dangkydichvu/user/{userId}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetDangKyDichVuByUserId(int userId)
        {
            try
            {
                var dk = await _context.DangKyDichVus
                    .Where(p => p.Iduser == userId)
                    .OrderByDescending(p => p.Ngaydangky)
                    .FirstOrDefaultAsync();

                if (dk == null)
                {
                    return NotFound(new { message = "User chưa đăng ký dịch vụ" });
                }

                return Ok(new
                {
                    id = dk.Id,
                    iduser = dk.Iduser,
                    iddichvu = dk.Iddichvu,
                    ngaydangky = dk.Ngaydangky,
                    ngayketthuc = dk.Ngayketthuc,
                    trangthai = dk.Trangthai,
                    solandoipin = dk.Solandoipin,
                    phuongthucthanhtoan = dk.Phuongthucthanhtoan,
                    trangthaithanhtoan = dk.Trangthaithanhtoan
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi lấy đăng ký dịch vụ: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }
        [Authorize("driver")]
        [HttpPost("datlich")]
        public async Task<IActionResult> datlich([FromBody] Dictionary<string, string> data)
        {
            try
            {
                var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
                int iduser = int.Parse(userId);
                int giadoipin = int.Parse(data["giadoipin"]!);
                int idtram = int.Parse(data["idtram"]!);
                DateOnly day = DateOnly.FromDateTime(DateTime.Now);
                TimeOnly giodat = TimeOnly.ParseExact(data["giodat"]!, "HH:mm", null);

                string idloaipin = data["idloaipin"]!;
                DateOnly ngayhen = DateOnly.ParseExact(data["ngaydat"]!, "yyyy-MM-dd", null);
                Booking db;
                data.TryGetValue("paymentMethod", out string? paymentMethod);
                if (string.IsNullOrEmpty(paymentMethod))
                {
                    // 🧩 Trường hợp 1: paymentMethod = null hoặc rỗng
                    db = new Booking
                    {
                        Iduser = iduser,
                        Ngaydat = day,
                        Chiphi = 0,
                        Giohen = giodat,
                        Phuongthucthanhtoan = "trống",
                        Idloaipin = int.Parse(idloaipin),
                        Ngayhen = ngayhen,
                        Trangthai = "Đang xử lý",
                        Trangthaithanhtoan = "Đã thanh toán",
                        Idtram = idtram
                    };
                }
                else
                {
                    // 🧩 Trường hợp 2: paymentMethod có giá trị (vd: vnpay)
                    db = new Booking
                    {
                        Iduser = iduser,
                        Ngaydat = day,
                        Chiphi = giadoipin,
                        Giohen = giodat,
                        Phuongthucthanhtoan = paymentMethod,
                        Idloaipin = int.Parse(idloaipin),
                        Ngayhen = ngayhen,
                        Trangthai = "Đang xử lý",
                        Trangthaithanhtoan = "Chờ thanh toán",
                        Idtram = idtram
                    };

                }
                _context.Add(db);
                await _context.SaveChangesAsync();
                return Ok(new {  message = "Lưu thành công!" });

            }
            
            catch (Exception ex)
            {
                
                return BadRequest(new {  message = ex.Message });
            }
        }

        // API cho nhân viên - Lấy danh sách bookings
        [HttpGet("bookings")]
        [Authorize("staff")]
        public async Task<IActionResult> GetBookings()
        {
            try
            {
                var bookings = await _context.Bookings
                    .Include(b => b.IduserNavigation) // Include User để lấy tên
                    .OrderByDescending(b => b.Ngaydat)
                    .ThenByDescending(b => b.Giohen)
                    .Select(b => new
                    {
                        id = b.Id,
                        iduser = b.Iduser,
                        username = b.IduserNavigation.Name,
                        idloaipin = b.Idloaipin,
                        loaipin = "Pin " + b.Idloaipin + "kWh", // Tùy chỉnh theo cấu trúc DB của bạn
                        ngaydat = b.Ngaydat,
                        ngayhen = b.Ngayhen,
                        giohen = b.Giohen,
                        chiphi = b.Chiphi,
                        trangthaithanhtoan = b.Trangthaithanhtoan,
                        trangthai = b.Trangthai,
                        phuongthucthanhtoan = b.Phuongthucthanhtoan,
                        idtram = b.Idtram // ✅ Thêm idtram
                    })
                    .ToListAsync();

                return Ok(bookings);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi khi lấy bookings: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // API cho nhân viên - Cập nhật trạng thái booking
        [HttpPut("bookings/{id}/status")]
        [Authorize(Roles = "staff")]
        public async Task<IActionResult> UpdateBookingStatus(int id, [FromBody] Dictionary<string, string> data)
        {
            try
            {
                var booking = await _context.Bookings.FindAsync(id);
                
                if (booking == null)
                {
                    return NotFound(new { message = "Không tìm thấy booking" });
                }

                // Cập nhật trạng thái
                if (data.ContainsKey("trangthai"))
                {
                    booking.Trangthai = data["trangthai"];
                }

                if (data.ContainsKey("trangthaithanhtoan"))
                {
                    booking.Trangthaithanhtoan = data["trangthaithanhtoan"];
                }

                // Lưu ghi chú nếu cần (bạn có thể thêm trường Notes vào model Booking)
                // if (data.ContainsKey("notes"))
                // {
                //     booking.Notes = data["notes"];
                // }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Cập nhật trạng thái thành công" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi khi cập nhật booking: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // API cho nhân viên và admin - Lấy thống kê
        [HttpGet("bookings/stats")]
        [Authorize(Roles = "staff,admin")]
        public async Task<IActionResult> GetBookingStats()
        {
            try
            {
                var today = DateOnly.FromDateTime(DateTime.Now);
                
                // Tổng lượt hôm nay: đếm tất cả booking có ngày hẹn là hôm nay (không phân biệt trạng thái)
                var totalToday = await _context.Bookings.CountAsync(b => b.Ngayhen.HasValue && b.Ngayhen.Value == today);
                
                // Hoàn thành hôm nay: đếm booking có trạng thái "Hoàn thành" và ngày hẹn là hôm nay
                // (Booking hoàn thành trong ngày hôm nay dựa trên ngày hẹn)
                var completed = await _context.Bookings.CountAsync(b => 
                    b.Trangthai == "Hoàn thành" && 
                    b.Ngayhen.HasValue && 
                    b.Ngayhen.Value == today);
                
                // Đang xử lý: đếm tất cả booking có trạng thái "Đang xử lý" (không phân biệt ngày)
                var processing = await _context.Bookings.CountAsync(b => b.Trangthai == "Đang xử lý");
                
                // Chờ xử lý: đếm booking có trạng thái "Đã đặt" (chờ xác nhận)
                var pending = await _context.Bookings.CountAsync(b => b.Trangthai == "Đã đặt");
                
                // Doanh thu hôm nay: tổng chi phí của booking đã thanh toán có ngày hẹn hôm nay
                var revenue = await _context.Bookings
                    .Where(b => b.Ngayhen == today && b.Trangthaithanhtoan == "Đã thanh toán")
                    .SumAsync(b => b.Chiphi ?? 0);
                
                var stats = new
                {
                    totalToday = totalToday,
                    completed = completed,
                    processing = processing,
                    pending = pending,
                    revenue = revenue
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi khi lấy thống kê: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // API cho admin - Lấy dữ liệu booking theo thời gian cho biểu đồ
        [HttpGet("bookings/chart")]
        [Authorize(Roles = "admin,staff")]
        public async Task<IActionResult> GetBookingsChartData([FromQuery] int days = 7)
        {
            try
            {
                var today = DateOnly.FromDateTime(DateTime.Now);
                var startDate = today.AddDays(-days);

                // Lấy danh sách booking trong khoảng thời gian
                var bookings = await _context.Bookings
                    .Where(b => b.Ngayhen.HasValue && b.Ngayhen.Value >= startDate && b.Ngayhen.Value <= today)
                    .ToListAsync();

                // Nhóm theo ngày
                var groupedData = bookings
                    .GroupBy(b => b.Ngayhen.Value)
                    .Select(g => new
                    {
                        date = g.Key,
                        count = g.Count()
                    })
                    .OrderBy(x => x.date)
                    .ToList();

                // Tạo mảng dữ liệu cho số ngày được chọn
                var result = new List<int>();
                var labels = new List<string>();

                for (int i = days - 1; i >= 0; i--)
                {
                    var date = today.AddDays(-i);
                    string label;
                    
                    // Nếu <= 7 ngày, hiển thị tên ngày trong tuần
                    if (days <= 7)
                    {
                        label = date.DayOfWeek switch
                        {
                            DayOfWeek.Monday => "T2",
                            DayOfWeek.Tuesday => "T3",
                            DayOfWeek.Wednesday => "T4",
                            DayOfWeek.Thursday => "T5",
                            DayOfWeek.Friday => "T6",
                            DayOfWeek.Saturday => "T7",
                            DayOfWeek.Sunday => "CN",
                            _ => ""
                        };
                    }
                    // Nếu > 7 ngày, hiển thị ngày/tháng
                    else
                    {
                        label = date.ToString("dd/MM");
                    }
                    
                    labels.Add(label);

                    var count = groupedData.FirstOrDefault(g => g.date == date)?.count ?? 0;
                    result.Add(count);
                }

                return Ok(new
                {
                    labels = labels,
                    data = result
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi khi lấy dữ liệu biểu đồ: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // API cho driver - Lấy lịch sử booking của mình
        [HttpGet("mybookings")]
        [Authorize(Roles = "driver")]
        public async Task<IActionResult> GetMyBookings()
        {
            try
            {
                var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
                int iduser = int.Parse(userId);

                var bookings = await _context.Bookings
                    .Where(b => b.Iduser == iduser)
                    .OrderByDescending(b => b.Ngaydat)
                    .ThenByDescending(b => b.Giohen)
                    .Select(b => new
                    {
                        id = b.Id,
                        idloaipin = b.Idloaipin,
                        idtram = b.Idtram,
                        ngaydat = b.Ngaydat,
                        ngayhen = b.Ngayhen,
                        giohen = b.Giohen,
                        chiphi = b.Chiphi,
                        trangthaithanhtoan = b.Trangthaithanhtoan,
                        trangthai = b.Trangthai,
                        phuongthucthanhtoan = b.Phuongthucthanhtoan
                    })
                    .ToListAsync();

                return Ok(bookings);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi khi lấy lịch sử booking: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }
    }
}
