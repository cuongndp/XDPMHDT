using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace BatteryAdminService.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AdminController : ControllerBase
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AdminController> _logger;

    public AdminController(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<AdminController> logger)
    {
        _httpClient = httpClientFactory.CreateClient();
        _configuration = configuration;
        _logger = logger;
    }

    // API Login cho Admin - gọi qua DriverService
    [HttpPost("login")]
    public async Task<IActionResult> AdminLogin([FromBody] Dictionary<string, string> data)
    {
        try
        {
            // Lấy URL của DriverService từ configuration hoặc hardcode
            var driverServiceUrl = _configuration["DriverServiceUrl"] ?? "http://driverservices:5004";
            
            // Gọi API login từ DriverService
            var loginRequest = new Dictionary<string, string>
            {
                { "email", data["email"] },
                { "password", data["password"] }
            };

            var json = JsonSerializer.Serialize(loginRequest);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{driverServiceUrl}/api/Driver/login", content);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                var errorResponse = JsonSerializer.Deserialize<Dictionary<string, object>>(responseContent);
                return BadRequest(new { message = errorResponse?.ContainsKey("message") == true ? errorResponse["message"].ToString() : "Đăng nhập thất bại" });
            }

            var loginResponse = JsonSerializer.Deserialize<Dictionary<string, object>>(responseContent);
            
            // Kiểm tra role phải là admin
            // Lấy token và decode để kiểm tra role
            if (loginResponse != null && loginResponse.ContainsKey("token"))
            {
                var token = loginResponse["token"].ToString();
                
                // Giải mã JWT token để lấy role
                var tokenHandler = new JwtSecurityTokenHandler();
                var jwtToken = tokenHandler.ReadJwtToken(token);
                
                // Kiểm tra role từ claims
                var roleClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "role");
                if (roleClaim == null || roleClaim.Value != "admin")
                {
                    return BadRequest(new { message = "Tài khoản không có quyền admin" });
                }

                // Lấy thông tin user từ claims
                var userId = jwtToken.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;
                var userEmail = jwtToken.Claims.FirstOrDefault(c => c.Type == "email")?.Value;
                var userName = jwtToken.Claims.FirstOrDefault(c => c.Type == "unique_name")?.Value;

                
            }

            return BadRequest(new { message = "Đăng nhập thất bại" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi admin login");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    [HttpPost("logout")]
    [Authorize(Roles = "admin")]
    public IActionResult AdminLogout()
    {
        Response.Cookies.Delete("admin_token");
        return Ok(new { message = "Đăng xuất admin thành công" });
    }
}

