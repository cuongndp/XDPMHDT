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
        [HttpPost("logoutdriver")]
        [Authorize(Roles = "driver")]
        public IActionResult Logout()
        {
            // Xóa cookie chứa token
            Response.Cookies.Delete("access_token");
            return Ok(new { message = "Đăng xuất thành công" });
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
                    Idloaipin = user.Idloaipin
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
    }
}
