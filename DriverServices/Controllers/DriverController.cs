using DriverServices.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
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
        public IActionResult Register([FromBody] Dictionary<string,string>data)
        {
            string confirmpassword= data["confirmpassword"];
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
                if (email!=null)
                {
                    return BadRequest(new { message = "Email đã tồn tại" });
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
                        Role = "Customer",
                        SoDienThoai = user.SoDienThoai,
                        GioiTinh = user.GioiTinh
                    };
                    _context.Add(list);
                    _context.SaveChanges();
                    return Ok(new { message = "Đăng ký thành công" });
                }
            }
            else
            {
                return BadRequest(new { message = "Dữ liệu không hợp lệ" });
            }
        }
        [HttpPost("login")]
        public IActionResult Login([FromBody] Dictionary<string, string> data)
        {
            var user=_context.Users.FirstOrDefault(p=>p.Email==data["email"]);
            if (user==null)
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
                new Claim(ClaimTypes.Name, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Name)
            }),
                    Expires = DateTime.UtcNow.AddHours(1), // token hết hạn sau 1 giờ
                    SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
                };

                var token = tokenHandler.CreateToken(tokenDescriptor);
                var tokenString = tokenHandler.WriteToken(token);

                // 2️⃣ Trả về token cùng message
                return Ok(new { message = "Đăng nhập thành công", token = tokenString });
            }

        }

    }
}
