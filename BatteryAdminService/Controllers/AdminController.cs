using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Linq;
using System.Net.Http;

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
        _httpClient.Timeout = TimeSpan.FromSeconds(30);
        _httpClient.DefaultRequestHeaders.Clear();
        _configuration = configuration;
        _logger = logger;
    }

    // API Login cho Admin - gọi qua DriverService
    [HttpPost("login")]
    public async Task<IActionResult> AdminLogin([FromBody] Dictionary<string, string> data)
    {
        try
        {
            // Validate input
            if (data == null)
            {
                _logger.LogWarning("Login request data is null");
                return BadRequest(new { message = "Dữ liệu đăng nhập không hợp lệ" });
            }

            if (!data.ContainsKey("email") || !data.ContainsKey("password"))
            {
                _logger.LogWarning("Login request missing email or password");
                return BadRequest(new { message = "Email và mật khẩu không được để trống" });
            }

            var email = data["email"];
            var password = data["password"];

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                _logger.LogWarning("Email or password is empty");
                return BadRequest(new { message = "Email và mật khẩu không được để trống" });
            }

            // Gọi trực tiếp DriverService (không qua Gateway để tránh loop)
            var driverServiceUrl = _configuration["DriverServiceUrl"] ?? "http://localhost:5004";
            var loginUrl = $"{driverServiceUrl}/api/Driver/login";
            
            _logger.LogInformation($"[ADMIN LOGIN] Attempt for email: {email}");
            _logger.LogInformation($"[ADMIN LOGIN] Calling DriverService at: {loginUrl}");
            
            // Gọi API login từ DriverService
            var loginRequest = new Dictionary<string, string>
            {
                { "email", email },
                { "password", password }
            };

            var json = JsonSerializer.Serialize(loginRequest);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            HttpResponseMessage response;
            string responseContent = string.Empty;
            try
            {
                using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(15));
                response = await _httpClient.PostAsync(loginUrl, content, cts.Token);
                responseContent = await response.Content.ReadAsStringAsync();
                _logger.LogInformation($"[ADMIN LOGIN] DriverService response: Status={response.StatusCode}, ContentLength={responseContent.Length}");
                
                if (!string.IsNullOrEmpty(responseContent) && responseContent.Length > 500)
                {
                    _logger.LogInformation($"[ADMIN LOGIN] Response preview: {responseContent.Substring(0, 200)}...");
                }
                else
                {
                    _logger.LogInformation($"[ADMIN LOGIN] Response: {responseContent}");
                }
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError($"[ADMIN LOGIN] Timeout khi gọi DriverService: {ex.Message}");
                return StatusCode(500, new { message = "Timeout khi kết nối đến DriverService. Vui lòng kiểm tra xem DriverService có đang chạy trên port 5004 không." });
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError($"[ADMIN LOGIN] Không thể kết nối đến DriverService: {ex.Message}");
                _logger.LogError($"[ADMIN LOGIN] InnerException: {ex.InnerException?.Message}");
                return StatusCode(500, new { message = $"Không thể kết nối đến DriverService tại {driverServiceUrl}. Vui lòng kiểm tra xem DriverService có đang chạy không." });
            }
            catch (Exception ex)
            {
                _logger.LogError($"[ADMIN LOGIN] Lỗi khi gọi DriverService: {ex.Message}");
                _logger.LogError($"[ADMIN LOGIN] StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning($"[ADMIN LOGIN] Login failed: Status={response.StatusCode}, Content={responseContent}");
                try
                {
                    if (!string.IsNullOrEmpty(responseContent))
                    {
                        var errorResponse = JsonSerializer.Deserialize<Dictionary<string, object>>(responseContent);
                        var errorMessage = errorResponse?.ContainsKey("message") == true ? errorResponse["message"].ToString() : "Đăng nhập thất bại";
                        return BadRequest(new { message = errorMessage });
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"[ADMIN LOGIN] Không thể parse error response: {ex.Message}");
                }
                return BadRequest(new { message = $"Đăng nhập thất bại. Status: {response.StatusCode}" });
            }

            // Parse response
            Dictionary<string, object> loginResponse;
            try
            {
                if (string.IsNullOrEmpty(responseContent))
                {
                    _logger.LogError("[ADMIN LOGIN] Response content is empty");
                    return StatusCode(500, new { message = "Lỗi server: Không nhận được phản hồi từ DriverService" });
                }

                loginResponse = JsonSerializer.Deserialize<Dictionary<string, object>>(responseContent);
                if (loginResponse == null)
                {
                    _logger.LogError($"[ADMIN LOGIN] Failed to parse response. Content: {responseContent}");
                    return StatusCode(500, new { message = "Lỗi server: Không thể parse phản hồi từ DriverService" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"[ADMIN LOGIN] Lỗi parse login response: {ex.Message}");
                _logger.LogError($"[ADMIN LOGIN] Response content: {responseContent}");
                return StatusCode(500, new { message = $"Lỗi parse dữ liệu: {ex.Message}" });
            }
            
            // Kiểm tra role phải là admin
            if (!loginResponse.ContainsKey("token"))
            {
                _logger.LogWarning("[ADMIN LOGIN] Login response không có token");
                _logger.LogWarning($"[ADMIN LOGIN] Response keys: {string.Join(", ", loginResponse.Keys)}");
                return BadRequest(new { message = "Đăng nhập thất bại: Không nhận được token" });
            }

            try
            {
                var token = loginResponse["token"].ToString();
                
                if (string.IsNullOrEmpty(token))
                {
                    _logger.LogWarning("[ADMIN LOGIN] Token is null or empty");
                    return BadRequest(new { message = "Đăng nhập thất bại: Token không hợp lệ" });
                }

                // Giải mã JWT token để lấy role
                var tokenHandler = new JwtSecurityTokenHandler();
                JwtSecurityToken jwtToken;
                try
                {
                    jwtToken = tokenHandler.ReadJwtToken(token);
                }
                catch (Exception ex)
                {
                    _logger.LogError($"[ADMIN LOGIN] Lỗi decode JWT token: {ex.Message}");
                    return BadRequest(new { message = "Token không hợp lệ" });
                }
                
                // Kiểm tra role từ claims
                var roleClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "role");
                if (roleClaim == null || roleClaim.Value != "admin")
                {
                    _logger.LogWarning($"[ADMIN LOGIN] User không có quyền admin. Role: {roleClaim?.Value ?? "null"}");
                    return BadRequest(new { message = "Tài khoản không có quyền admin" });
                }

                // Lấy thông tin user từ claims
                var userId = jwtToken.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;
                var userEmail = jwtToken.Claims.FirstOrDefault(c => c.Type == "email")?.Value;
                var userName = jwtToken.Claims.FirstOrDefault(c => c.Type == "unique_name")?.Value;

                // Tạo token JWT MỚI riêng cho Admin với Issuer và Audience riêng
                var adminTokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.ASCII.GetBytes("xay_dung_phan_men_huong_doi_tuong"); // Cùng secret key
                var adminTokenDescriptor = new Microsoft.IdentityModel.Tokens.SecurityTokenDescriptor
                {
                    Subject = new System.Security.Claims.ClaimsIdentity(new[]
                    {
                        new System.Security.Claims.Claim(JwtRegisteredClaimNames.Sub, userId ?? ""),
                        new System.Security.Claims.Claim(JwtRegisteredClaimNames.Email, userEmail ?? ""),
                        new System.Security.Claims.Claim(JwtRegisteredClaimNames.UniqueName, userName ?? ""),
                        new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, "admin"),
                        new System.Security.Claims.Claim("role", "admin")
                    }),
                    Expires = DateTime.UtcNow.AddHours(8), // Admin session 8 giờ
                    Issuer = "ApiGateway",
                    Audience = "BatteryAdminService", // 👈 Audience riêng cho Admin Service
                    SigningCredentials = new Microsoft.IdentityModel.Tokens.SigningCredentials(
                        new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key), 
                        Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256Signature)
                };

                var adminToken = adminTokenHandler.CreateToken(adminTokenDescriptor);
                var adminTokenString = adminTokenHandler.WriteToken(adminToken);

                var userData = new Dictionary<string, object>
                {
                    { "id", userId ?? "" },
                    { "email", userEmail ?? "" },
                    { "name", userName ?? "" },
                    { "role", "admin" }
                };

                // Set cookie với token admin riêng
                var cookieOptions = new Microsoft.AspNetCore.Http.CookieOptions
                {
                    HttpOnly = true,
                    Secure = false, // Set true nếu dùng HTTPS
                    SameSite = Microsoft.AspNetCore.Http.SameSiteMode.None,
                    Expires = DateTime.UtcNow.AddHours(8)
                };
                Response.Cookies.Append("admin_token", adminTokenString, cookieOptions);

                _logger.LogInformation($"[ADMIN LOGIN] Login successful for user: {userEmail}");
                return Ok(new 
                { 
                    message = "Đăng nhập admin thành công", 
                    token = adminTokenString, // Trả về token admin riêng
                    user = userData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"[ADMIN LOGIN] Lỗi xử lý token: {ex.Message}");
                _logger.LogError($"[ADMIN LOGIN] StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { message = $"Lỗi xử lý token: {ex.Message}" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ADMIN LOGIN] Lỗi admin login - Exception");
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

    // GET: api/Admin/xu-ly-khieu-nai - Lấy danh sách khiếu nại với thông tin khách hàng
    [HttpGet("xu-ly-khieu-nai")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetDanhSachKhieuNai([FromQuery] int? page = 1, [FromQuery] int? pageSize = 10, [FromQuery] string? trangThai = null)
    {
        try
        {
            var paymentServiceUrl = _configuration["PaymentServiceUrl"] ?? "http://driverpaymentservice:5003";
            var driverServiceUrl = _configuration["DriverServiceUrl"] ?? "http://driverservices:5004";

            // Lấy danh sách khiếu nại từ PaymentService - gọi endpoint đơn giản
            var paymentRequest = new HttpRequestMessage(HttpMethod.Get, $"{paymentServiceUrl}/api/Payment/yeu-cau-ho-tro/all");
            var authHeader = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader))
            {
                paymentRequest.Headers.Add("Authorization", authHeader);
            }
            
            var paymentResponse = await _httpClient.SendAsync(paymentRequest);
            if (!paymentResponse.IsSuccessStatusCode)
            {
                var errorContent = await paymentResponse.Content.ReadAsStringAsync();
                _logger.LogError($"Lỗi lấy danh sách khiếu nại từ PaymentService: {errorContent}");
                return StatusCode(500, new { message = "Không thể lấy danh sách khiếu nại" });
            }

            var paymentContent = await paymentResponse.Content.ReadAsStringAsync();
            var paymentData = JsonSerializer.Deserialize<JsonElement>(paymentContent);
            
            if (paymentData.ValueKind != JsonValueKind.Object || !paymentData.TryGetProperty("data", out var dataArray))
            {
                return Ok(new { total = 0, page = page ?? 1, pageSize = pageSize ?? 10, data = new List<object>() });
            }

            var yeuCaus = JsonSerializer.Deserialize<List<JsonElement>>(dataArray.GetRawText()) ?? new List<JsonElement>();

            // Lọc theo trạng thái nếu có
            if (!string.IsNullOrEmpty(trangThai))
            {
                yeuCaus = yeuCaus.Where(y => 
                    y.TryGetProperty("trang_thai", out var tt) && 
                    tt.ValueKind == JsonValueKind.String &&
                    tt.GetString()?.Equals(trangThai, StringComparison.OrdinalIgnoreCase) == true
                ).ToList();
            }

            // Lấy thông tin user cho mỗi khiếu nại
            var result = new List<Dictionary<string, object>>();
            foreach (var yeuCau in yeuCaus)
            {
                var yeuCauDict = new Dictionary<string, object>();
                
                // Convert JsonElement sang object
                foreach (var prop in yeuCau.EnumerateObject())
                {
                    yeuCauDict[prop.Name] = prop.Value.ValueKind switch
                    {
                        JsonValueKind.String => prop.Value.GetString(),
                        JsonValueKind.Number => prop.Value.GetInt32(),
                        JsonValueKind.True => true,
                        JsonValueKind.False => false,
                        JsonValueKind.Null => null,
                        _ => prop.Value.GetRawText()
                    };
                }
                
                // Lấy thông tin user từ DriverService
                if (yeuCau.TryGetProperty("iduser", out var idUserProp) && idUserProp.ValueKind == JsonValueKind.Number)
                {
                    var userId = idUserProp.GetInt32();
                    try
                    {
                        var userResponse = await _httpClient.GetAsync($"{driverServiceUrl}/api/Driver/user/{userId}");
                        if (userResponse.IsSuccessStatusCode)
                        {
                            var userContent = await userResponse.Content.ReadAsStringAsync();
                            var userData = JsonSerializer.Deserialize<JsonElement>(userContent);
                            if (userData.ValueKind == JsonValueKind.Object)
                            {
                                yeuCauDict["user"] = new Dictionary<string, object>
                                {
                                    { "id", userData.TryGetProperty("id", out var uid) ? uid.GetInt32() : userId },
                                    { "name", userData.TryGetProperty("name", out var name) ? name.GetString() ?? "" : "" },
                                    { "email", userData.TryGetProperty("email", out var email) ? email.GetString() ?? "" : "" },
                                    { "sodienthoai", userData.TryGetProperty("sodienthoai", out var sdt) ? sdt.GetString() ?? "" : "" }
                                };
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning($"Không thể lấy thông tin user {userId}: {ex.Message}");
                        yeuCauDict["user"] = new Dictionary<string, object>
                        {
                            { "id", userId },
                            { "name", "Không xác định" },
                            { "email", "" },
                            { "sodienthoai", "" }
                        };
                    }
                }

                result.Add(yeuCauDict);
            }

            // Phân trang
            var total = result.Count;
            var pagedResult = result
                .Skip(((page ?? 1) - 1) * (pageSize ?? 10))
                .Take(pageSize ?? 10)
                .ToList();

            return Ok(new
            {
                total = total,
                page = page ?? 1,
                pageSize = pageSize ?? 10,
                totalPages = (int)Math.Ceiling(total / (double)(pageSize ?? 10)),
                data = pagedResult
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi lấy danh sách khiếu nại");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // GET: api/Admin/xu-ly-khieu-nai/{id} - Lấy chi tiết khiếu nại với thông tin khách hàng đầy đủ
    [HttpGet("xu-ly-khieu-nai/{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetChiTietKhieuNai(int id)
    {
        try
        {
            var paymentServiceUrl = _configuration["PaymentServiceUrl"] ?? "http://driverpaymentservice:5003";
            var driverServiceUrl = _configuration["DriverServiceUrl"] ?? "http://driverservices:5004";

            // Lấy chi tiết khiếu nại từ PaymentService
            var paymentRequest = new HttpRequestMessage(HttpMethod.Get, $"{paymentServiceUrl}/api/Payment/yeu-cau-ho-tro/{id}");
            var authHeader = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader))
            {
                paymentRequest.Headers.Add("Authorization", authHeader);
            }
            
            var paymentResponse = await _httpClient.SendAsync(paymentRequest);
            if (!paymentResponse.IsSuccessStatusCode)
            {
                if (paymentResponse.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return NotFound(new { message = "Không tìm thấy khiếu nại" });
                }
                var errorContent = await paymentResponse.Content.ReadAsStringAsync();
                _logger.LogError($"Lỗi lấy chi tiết khiếu nại từ PaymentService: {errorContent}");
                return StatusCode(500, new { message = "Không thể lấy chi tiết khiếu nại" });
            }

            var paymentContent = await paymentResponse.Content.ReadAsStringAsync();
            var yeuCau = JsonSerializer.Deserialize<JsonElement>(paymentContent);
            if (yeuCau.ValueKind != JsonValueKind.Object)
            {
                return NotFound(new { message = "Không tìm thấy khiếu nại" });
            }

            // Convert JsonElement sang object
            var yeuCauDict = new Dictionary<string, object>();
            foreach (var prop in yeuCau.EnumerateObject())
            {
                yeuCauDict[prop.Name] = prop.Value.ValueKind switch
                {
                    JsonValueKind.String => prop.Value.GetString(),
                    JsonValueKind.Number => prop.Value.GetInt32(),
                    JsonValueKind.True => true,
                    JsonValueKind.False => false,
                    JsonValueKind.Null => null,
                    _ => prop.Value.GetRawText()
                };
            }

            // Lấy thông tin user từ DriverService
            if (yeuCau.TryGetProperty("iduser", out var idUserProp) && idUserProp.ValueKind == JsonValueKind.Number)
            {
                var userId = idUserProp.GetInt32();
                try
                {
                    var userResponse = await _httpClient.GetAsync($"{driverServiceUrl}/api/Driver/user/{userId}");
                    if (userResponse.IsSuccessStatusCode)
                    {
                        var userContent = await userResponse.Content.ReadAsStringAsync();
                        var userData = JsonSerializer.Deserialize<JsonElement>(userContent);
                        if (userData.ValueKind == JsonValueKind.Object)
                        {
                            yeuCauDict["user"] = new Dictionary<string, object>
                            {
                                { "id", userData.TryGetProperty("id", out var uid) ? uid.GetInt32() : userId },
                                { "name", userData.TryGetProperty("name", out var name) ? name.GetString() ?? "" : "" },
                                { "email", userData.TryGetProperty("email", out var email) ? email.GetString() ?? "" : "" },
                                { "sodienthoai", userData.TryGetProperty("sodienthoai", out var sdt) ? sdt.GetString() ?? "" : "" },
                                { "age", userData.TryGetProperty("age", out var age) && age.ValueKind == JsonValueKind.Number ? age.GetInt32() : (int?)null },
                                { "gioitinh", userData.TryGetProperty("gioitinh", out var gt) ? gt.GetString() ?? "" : "" }
                            };
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"Không thể lấy thông tin user {userId}: {ex.Message}");
                    yeuCauDict["user"] = new Dictionary<string, object>
                    {
                        { "id", userId },
                        { "name", "Không xác định" },
                        { "email", "" },
                        { "sodienthoai", "" }
                    };
                }
            }

            // Lấy danh sách tin nhắn
            try
            {
                var messagesRequest = new HttpRequestMessage(HttpMethod.Get, $"{paymentServiceUrl}/api/Payment/tin-nhan-ho-tro/{id}");
                if (!string.IsNullOrEmpty(authHeader))
                {
                    messagesRequest.Headers.Add("Authorization", authHeader);
                }
                
                var messagesResponse = await _httpClient.SendAsync(messagesRequest);
                if (messagesResponse.IsSuccessStatusCode)
                {
                    var messagesContent = await messagesResponse.Content.ReadAsStringAsync();
                    var messagesData = JsonSerializer.Deserialize<JsonElement>(messagesContent);
                    if (messagesData.ValueKind == JsonValueKind.Object && messagesData.TryGetProperty("data", out var msgsArray))
                    {
                        var messages = JsonSerializer.Deserialize<List<JsonElement>>(msgsArray.GetRawText()) ?? new List<JsonElement>();
                        var messagesWithUser = new List<Dictionary<string, object>>();
                        
                        foreach (var msg in messages)
                        {
                            var msgDict = new Dictionary<string, object>();
                            foreach (var prop in msg.EnumerateObject())
                            {
                                msgDict[prop.Name] = prop.Value.ValueKind switch
                                {
                                    JsonValueKind.String => prop.Value.GetString(),
                                    JsonValueKind.Number => prop.Value.GetInt32(),
                                    JsonValueKind.True => true,
                                    JsonValueKind.False => false,
                                    JsonValueKind.Null => null,
                                    _ => prop.Value.GetRawText()
                                };
                            }

                            if (msg.TryGetProperty("id_user", out var msgUserIdProp) && msgUserIdProp.ValueKind == JsonValueKind.Number)
                            {
                                var msgUserId = msgUserIdProp.GetInt32();
                                try
                                {
                                    var msgUserResponse = await _httpClient.GetAsync($"{driverServiceUrl}/api/Driver/user/{msgUserId}");
                                    if (msgUserResponse.IsSuccessStatusCode)
                                    {
                                        var msgUserContent = await msgUserResponse.Content.ReadAsStringAsync();
                                        var msgUserData = JsonSerializer.Deserialize<JsonElement>(msgUserContent);
                                        if (msgUserData.ValueKind == JsonValueKind.Object)
                                        {
                                            msgDict["user"] = new Dictionary<string, object>
                                            {
                                                { "id", msgUserData.TryGetProperty("id", out var uid) ? uid.GetInt32() : msgUserId },
                                                { "name", msgUserData.TryGetProperty("name", out var name) ? name.GetString() ?? "" : "" },
                                                { "email", msgUserData.TryGetProperty("email", out var email) ? email.GetString() ?? "" : "" }
                                            };
                                        }
                                    }
                                }
                                catch (Exception ex)
                                {
                                    _logger.LogWarning($"Không thể lấy thông tin user {msgUserId} cho tin nhắn: {ex.Message}");
                                }
                            }
                            messagesWithUser.Add(msgDict);
                        }
                        yeuCauDict["messages"] = messagesWithUser;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Không thể lấy tin nhắn: {ex.Message}");
            }

            return Ok(yeuCauDict);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi lấy chi tiết khiếu nại");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // PUT: api/Admin/xu-ly-khieu-nai/{id}/tra-loi - Trả lời khiếu nại
    [HttpPut("xu-ly-khieu-nai/{id}/tra-loi")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> TraLoiKhieuNai(int id, [FromBody] Dictionary<string, object> data)
    {
        try
        {
            var paymentServiceUrl = _configuration["PaymentServiceUrl"] ?? "http://driverpaymentservice:5003";

            // Validate dữ liệu
            if (!data.ContainsKey("phan_hoi") || string.IsNullOrEmpty(data["phan_hoi"]?.ToString()))
            {
                return BadRequest(new { message = "Nội dung phản hồi không được để trống" });
            }

            var phanHoi = data["phan_hoi"].ToString();
            var trangThai = data.ContainsKey("trang_thai") ? data["trang_thai"].ToString() : "Đã xử lý";

            // Gọi API PaymentService để cập nhật phản hồi
            var updateData = new Dictionary<string, object>
            {
                { "phan_hoi", phanHoi },
                { "trang_thai", trangThai }
            };

            var json = JsonSerializer.Serialize(updateData);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            var request = new HttpRequestMessage(HttpMethod.Put, $"{paymentServiceUrl}/api/Payment/yeu-cau-ho-tro/{id}/phan-hoi");
            var authHeader = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader))
            {
                request.Headers.Add("Authorization", authHeader);
            }
            request.Content = content;

            var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return NotFound(new { message = "Không tìm thấy khiếu nại" });
                }
                _logger.LogError($"Lỗi cập nhật phản hồi: {responseContent}");
                return StatusCode((int)response.StatusCode, new { message = "Không thể cập nhật phản hồi" });
            }

            var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
            return Ok(new { message = "Trả lời khiếu nại thành công", data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi trả lời khiếu nại");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // GET: api/Admin/goi-thue - Lấy danh sách gói thuê từ PaymentService
    [HttpGet("goi-thue")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetDanhSachGoiThue()
    {
        try
        {
            // Gọi trực tiếp PaymentService (không qua gateway để tránh loop)
            var paymentServiceUrl = _configuration["PaymentServiceUrl"] ?? "http://localhost:5003";
            var url = $"{paymentServiceUrl}/api/Payment/loggoi";

            _logger.LogInformation($"Gọi PaymentService: {url}");

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            
            var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogInformation($"PaymentService response: Status={response.StatusCode}");

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError($"Lỗi từ PaymentService: {responseContent}");
                return StatusCode((int)response.StatusCode, new { message = $"Không thể lấy danh sách gói: {responseContent}" });
            }

            // Parse JSON response
            var packages = JsonSerializer.Deserialize<List<JsonElement>>(responseContent);
            if (packages == null)
            {
                return Ok(new List<object>());
            }

            // Convert sang Dictionary
            var result = packages.Select(pkg =>
            {
                var dict = new Dictionary<string, object>();
                foreach (var prop in pkg.EnumerateObject())
                {
                    dict[prop.Name] = prop.Value.ValueKind switch
                    {
                        JsonValueKind.String => prop.Value.GetString() ?? "",
                        JsonValueKind.Number => prop.Value.TryGetInt32(out var intVal) ? intVal : (object)prop.Value.GetDecimal(),
                        JsonValueKind.True => true,
                        JsonValueKind.False => false,
                        JsonValueKind.Null => null,
                        _ => prop.Value.GetRawText()
                    };
                }
                return dict;
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi lấy danh sách gói thuê");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // POST: api/Admin/goi-thue - Tạo gói thuê mới (gọi PaymentService)
    [HttpPost("goi-thue")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> TaoGoiThue([FromBody] Dictionary<string, object> data)
    {
        try
        {
            // Validate dữ liệu
            if (!data.ContainsKey("tendichvu") || string.IsNullOrEmpty(data["tendichvu"]?.ToString()))
            {
                return BadRequest(new { message = "Tên dịch vụ không được để trống" });
            }

            if (!data.ContainsKey("phi") || !decimal.TryParse(data["phi"]?.ToString(), out decimal phi) || phi <= 0)
            {
                return BadRequest(new { message = "Phí phải lớn hơn 0" });
            }

            // Gọi trực tiếp PaymentService
            var paymentServiceUrl = _configuration["PaymentServiceUrl"] ?? "http://localhost:5003";
            var url = $"{paymentServiceUrl}/api/Payment/loggoi";

            _logger.LogInformation($"Tạo gói thuê: {url}");

            var json = JsonSerializer.Serialize(data);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, url);
            var authHeader = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader))
            {
                request.Headers.Add("Authorization", authHeader);
            }
            request.Content = content;

            var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogInformation($"PaymentService response: Status={response.StatusCode}");

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError($"Lỗi tạo gói: {responseContent}");
                var errorMessage = "Không thể tạo gói thuê";
                try
                {
                    var errorData = JsonSerializer.Deserialize<JsonElement>(responseContent);
                    if (errorData.ValueKind == JsonValueKind.Object && errorData.TryGetProperty("message", out var msg))
                    {
                        errorMessage = msg.GetString() ?? errorMessage;
                    }
                }
                catch { }
                return StatusCode((int)response.StatusCode, new { message = errorMessage });
            }

            var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
            return Ok(new { message = "Tạo gói thuê thành công", data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi tạo gói thuê");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // PUT: api/Admin/goi-thue/{id} - Cập nhật gói thuê
    [HttpPut("goi-thue/{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> CapNhatGoiThue(int id, [FromBody] Dictionary<string, object> data)
    {
        try
        {
            var paymentServiceUrl = _configuration["PaymentServiceUrl"] ?? "http://localhost:5003";
            var url = $"{paymentServiceUrl}/api/Payment/loggoi/{id}";

            _logger.LogInformation($"Cập nhật gói thuê {id}: {url}");

            var json = JsonSerializer.Serialize(data);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Put, url);
            var authHeader = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader))
            {
                request.Headers.Add("Authorization", authHeader);
            }
            request.Content = content;

            var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogInformation($"PaymentService response: Status={response.StatusCode}");

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError($"Lỗi cập nhật gói: {responseContent}");
                var errorMessage = "Không thể cập nhật gói thuê";
                try
                {
                    var errorData = JsonSerializer.Deserialize<JsonElement>(responseContent);
                    if (errorData.ValueKind == JsonValueKind.Object && errorData.TryGetProperty("message", out var msg))
                    {
                        errorMessage = msg.GetString() ?? errorMessage;
                    }
                }
                catch { }
                return StatusCode((int)response.StatusCode, new { message = errorMessage });
            }

            var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
            return Ok(new { message = "Cập nhật gói thuê thành công", data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi cập nhật gói thuê");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // DELETE: api/Admin/goi-thue/{id} - Xóa gói thuê
    [HttpDelete("goi-thue/{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> XoaGoiThue(int id)
    {
        try
        {
            var paymentServiceUrl = _configuration["PaymentServiceUrl"] ?? "http://localhost:5003";
            var url = $"{paymentServiceUrl}/api/Payment/loggoi/{id}";

            _logger.LogInformation($"Xóa gói thuê {id}: {url}");

            var request = new HttpRequestMessage(HttpMethod.Delete, url);
            var authHeader = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader))
            {
                request.Headers.Add("Authorization", authHeader);
            }

            var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogInformation($"PaymentService response: Status={response.StatusCode}");

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError($"Lỗi xóa gói: {responseContent}");
                var errorMessage = "Không thể xóa gói thuê";
                try
                {
                    var errorData = JsonSerializer.Deserialize<JsonElement>(responseContent);
                    if (errorData.ValueKind == JsonValueKind.Object && errorData.TryGetProperty("message", out var msg))
                    {
                        errorMessage = msg.GetString() ?? errorMessage;
                    }
                }
                catch { }
                return StatusCode((int)response.StatusCode, new { message = errorMessage });
            }

            var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
            return Ok(new { message = "Xóa gói thuê thành công", data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi xóa gói thuê");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // GET: api/Admin/users - Lấy danh sách users với thông tin gói thuê
    [HttpGet("users")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetDanhSachUsers([FromQuery] string? role = null)
    {
        try
        {
            // Lấy URL từ configuration (đã được set trong Program.cs)
            var driverServiceUrl = _configuration["DriverServiceUrl"] ?? "http://localhost:5004";
            var paymentServiceUrl = _configuration["PaymentServiceUrl"] ?? "http://localhost:5003";

            _logger.LogInformation($"Gọi DriverService: {driverServiceUrl}/api/Driver/users/all?role={role}");

            // Gọi DriverService để lấy danh sách users
            var usersUrl = $"{driverServiceUrl}/api/Driver/users/all";
            if (!string.IsNullOrEmpty(role))
            {
                usersUrl += $"?role={role}";
            }

            var usersRequest = new HttpRequestMessage(HttpMethod.Get, usersUrl);
            var authHeader = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader))
            {
                usersRequest.Headers.Add("Authorization", authHeader);
            }

            var usersResponse = await _httpClient.SendAsync(usersRequest);
            var usersContent = await usersResponse.Content.ReadAsStringAsync();

            var previewContent = usersContent.Length > 200 ? usersContent.Substring(0, 200) + "..." : usersContent;
            _logger.LogInformation($"DriverService response: Status={usersResponse.StatusCode}, Content={previewContent}");

            if (!usersResponse.IsSuccessStatusCode)
            {
                _logger.LogError($"Lỗi lấy danh sách users từ DriverService: Status={usersResponse.StatusCode}, Content={usersContent}");
                return StatusCode(500, new { message = $"Không thể lấy danh sách users: {usersContent}" });
            }

            List<JsonElement> users;
            try
            {
                users = JsonSerializer.Deserialize<List<JsonElement>>(usersContent) ?? new List<JsonElement>();
            }
            catch (Exception ex)
            {
                _logger.LogError($"Lỗi parse JSON từ DriverService: {ex.Message}, Content={usersContent}");
                return StatusCode(500, new { message = $"Lỗi parse dữ liệu: {ex.Message}" });
            }

            // Lấy danh sách gói từ PaymentService
            _logger.LogInformation($"Gọi PaymentService: {paymentServiceUrl}/api/Payment/loggoi");
            var packagesRequest = new HttpRequestMessage(HttpMethod.Get, $"{paymentServiceUrl}/api/Payment/loggoi");
            var packagesResponse = await _httpClient.SendAsync(packagesRequest);
            var packagesContent = await packagesResponse.Content.ReadAsStringAsync();
            
            List<JsonElement> packages = new List<JsonElement>();
            if (packagesResponse.IsSuccessStatusCode)
            {
                try
                {
                    packages = JsonSerializer.Deserialize<List<JsonElement>>(packagesContent) ?? new List<JsonElement>();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"Không thể parse danh sách gói từ PaymentService: {ex.Message}");
                }
            }
            else
            {
                _logger.LogWarning($"Không thể lấy danh sách gói từ PaymentService: Status={packagesResponse.StatusCode}");
            }

            // Tạo dictionary để map id -> tên gói
            var packagesDict = new Dictionary<int, string>();
            foreach (var pkg in packages)
            {
                if (pkg.TryGetProperty("id", out var idProp) && idProp.ValueKind == JsonValueKind.Number)
                {
                    var pkgId = idProp.GetInt32();
                    var pkgName = pkg.TryGetProperty("tendichvu", out var nameProp) 
                        ? nameProp.GetString() 
                        : pkg.TryGetProperty("Tendichvu", out var nameProp2) 
                            ? nameProp2.GetString() 
                            : $"Gói {pkgId}";
                    packagesDict[pkgId] = pkgName ?? $"Gói {pkgId}";
                }
            }

            // Lấy thông tin đăng ký dịch vụ từ DriverService
            var result = new List<Dictionary<string, object>>();
            foreach (var user in users)
            {
                try
                {
                    var userDict = new Dictionary<string, object>();
                    foreach (var prop in user.EnumerateObject())
                    {
                        try
                        {
                            userDict[prop.Name] = prop.Value.ValueKind switch
                            {
                                JsonValueKind.String => prop.Value.GetString() ?? "",
                                JsonValueKind.Number => prop.Value.GetInt32(),
                                JsonValueKind.True => true,
                                JsonValueKind.False => false,
                                JsonValueKind.Null => null,
                                _ => prop.Value.GetRawText()
                            };
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning($"Lỗi parse property {prop.Name}: {ex.Message}");
                            userDict[prop.Name] = null;
                        }
                    }

                    // Lấy thông tin gói thuê - chỉ cho driver
                    userDict["goi_thue"] = null; // Mặc định là null
                    
                    if (user.TryGetProperty("id", out var userIdProp) && userIdProp.ValueKind == JsonValueKind.Number)
                    {
                        var userId = userIdProp.GetInt32();
                        var userRole = user.TryGetProperty("role", out var roleProp) ? roleProp.GetString() : "driver";
                        
                        // Chỉ lấy gói thuê cho driver, staff không có gói thuê
                        if (userRole == "driver" || userRole == "Driver")
                        {
                            try
                            {
                                // Gọi API lấy đăng ký dịch vụ của user
                                var dkRequest = new HttpRequestMessage(HttpMethod.Get, $"{driverServiceUrl}/api/Driver/dangkydichvu/user/{userId}");
                                if (!string.IsNullOrEmpty(authHeader))
                                {
                                    dkRequest.Headers.Add("Authorization", authHeader);
                                }
                                
                                // Set timeout ngắn để tránh chờ quá lâu
                                using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(5));
                                var dkResponse = await _httpClient.SendAsync(dkRequest, cts.Token);
                                
                                if (dkResponse.IsSuccessStatusCode)
                                {
                                    var dkContent = await dkResponse.Content.ReadAsStringAsync();
                                    try
                                    {
                                        var dkData = JsonSerializer.Deserialize<JsonElement>(dkContent);
                                        
                                        if (dkData.ValueKind == JsonValueKind.Object)
                                        {
                                            var iddichvu = dkData.TryGetProperty("iddichvu", out var dvId) && dvId.ValueKind == JsonValueKind.Number
                                                ? dvId.GetInt32()
                                                : dkData.TryGetProperty("Iddichvu", out var dvId2) && dvId2.ValueKind == JsonValueKind.Number
                                                    ? dvId2.GetInt32()
                                                    : 0;
                                            
                                            if (iddichvu > 0 && packagesDict.ContainsKey(iddichvu))
                                            {
                                                userDict["goi_thue"] = packagesDict[iddichvu];
                                                userDict["dangkydichvu_id"] = iddichvu;
                                            }
                                        }
                                    }
                                    catch (Exception ex)
                                    {
                                        _logger.LogWarning($"Lỗi parse dangkydichvu cho user {userId}: {ex.Message}");
                                    }
                                }
                            }
                            catch (TaskCanceledException)
                            {
                                _logger.LogWarning($"Timeout khi lấy thông tin gói cho user {userId}");
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning($"Không thể lấy thông tin gói cho user {userId}: {ex.Message}");
                            }
                        }
                    }

                    result.Add(userDict);
                }
                catch (Exception ex)
                {
                    _logger.LogError($"Lỗi xử lý user: {ex.Message}");
                    // Bỏ qua user này và tiếp tục với user khác
                }
            }

            _logger.LogInformation($"Trả về {result.Count} users");
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Lỗi lấy danh sách users: {ex.Message}, StackTrace: {ex.StackTrace}");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // POST: api/Admin/users - Tạo user mới
    [HttpPost("users")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> TaoUser([FromBody] Dictionary<string, object> data)
    {
        try
        {
            var driverServiceUrl = _configuration["DriverServiceUrl"] ?? "http://localhost:5004";

            // Convert data sang Dictionary<string, string>
            var userData = new Dictionary<string, string>();
            foreach (var kvp in data)
            {
                userData[kvp.Key] = kvp.Value?.ToString() ?? "";
            }

            var json = JsonSerializer.Serialize(userData);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, $"{driverServiceUrl}/api/Driver/users");
            var authHeader = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader))
            {
                request.Headers.Add("Authorization", authHeader);
            }
            request.Content = content;

            var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError($"Lỗi tạo user: {responseContent}");
                var errorMessage = "Không thể tạo user";
                try
                {
                    var errorData = JsonSerializer.Deserialize<JsonElement>(responseContent);
                    if (errorData.ValueKind == JsonValueKind.Object && errorData.TryGetProperty("message", out var msg))
                    {
                        errorMessage = msg.GetString() ?? errorMessage;
                    }
                }
                catch { }
                return StatusCode((int)response.StatusCode, new { message = errorMessage });
            }

            var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
            return Ok(new { message = "Tạo user thành công", data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi tạo user");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // PUT: api/Admin/users/{id} - Cập nhật user
    [HttpPut("users/{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> CapNhatUser(int id, [FromBody] Dictionary<string, object> data)
    {
        try
        {
            var driverServiceUrl = _configuration["DriverServiceUrl"] ?? "http://localhost:5004";

            // Convert data sang Dictionary<string, string>
            var userData = new Dictionary<string, string>();
            foreach (var kvp in data)
            {
                userData[kvp.Key] = kvp.Value?.ToString() ?? "";
            }

            var json = JsonSerializer.Serialize(userData);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Put, $"{driverServiceUrl}/api/Driver/users/{id}");
            var authHeader = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader))
            {
                request.Headers.Add("Authorization", authHeader);
            }
            request.Content = content;

            var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError($"Lỗi cập nhật user: {responseContent}");
                var errorMessage = "Không thể cập nhật user";
                try
                {
                    var errorData = JsonSerializer.Deserialize<JsonElement>(responseContent);
                    if (errorData.ValueKind == JsonValueKind.Object && errorData.TryGetProperty("message", out var msg))
                    {
                        errorMessage = msg.GetString() ?? errorMessage;
                    }
                }
                catch { }
                return StatusCode((int)response.StatusCode, new { message = errorMessage });
            }

            var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
            return Ok(new { message = "Cập nhật user thành công", data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi cập nhật user");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // DELETE: api/Admin/users/{id} - Xóa user
    [HttpDelete("users/{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> XoaUser(int id)
    {
        try
        {
            var driverServiceUrl = _configuration["DriverServiceUrl"] ?? "http://localhost:5004";

            var request = new HttpRequestMessage(HttpMethod.Delete, $"{driverServiceUrl}/api/Driver/users/{id}");
            var authHeader = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader))
            {
                request.Headers.Add("Authorization", authHeader);
            }

            var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError($"Lỗi xóa user: {responseContent}");
                var errorMessage = "Không thể xóa user";
                try
                {
                    var errorData = JsonSerializer.Deserialize<JsonElement>(responseContent);
                    if (errorData.ValueKind == JsonValueKind.Object && errorData.TryGetProperty("message", out var msg))
                    {
                        errorMessage = msg.GetString() ?? errorMessage;
                    }
                }
                catch { }
                return StatusCode((int)response.StatusCode, new { message = errorMessage });
            }

            var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
            return Ok(new { message = "Xóa user thành công", data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi xóa user");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // GET: api/Admin/dashboard/stats - Lấy thống kê dashboard
    [HttpGet("dashboard/stats")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetDashboardStats()
    {
        try
        {
            var driverServiceUrl = _configuration["DriverServiceUrl"] ?? "http://localhost:5004";
            var stationServiceUrl = _configuration["StationServiceUrl"] ?? "http://localhost:5002";

            _logger.LogInformation("Lấy thống kê dashboard");

            int totalStations = 0;
            int activeUsers = 0;
            int todaySwaps = 0;
            int todayRevenue = 0;

            // 1. Lấy tổng số trạm từ StationService
            try
            {
                var stationsUrl = $"{stationServiceUrl}/api/Station/danhsach";
                var stationsRequest = new HttpRequestMessage(HttpMethod.Get, stationsUrl);
                var authHeader = Request.Headers["Authorization"].ToString();
                if (!string.IsNullOrEmpty(authHeader))
                {
                    stationsRequest.Headers.Add("Authorization", authHeader);
                }

                var stationsResponse = await _httpClient.SendAsync(stationsRequest);
                if (stationsResponse.IsSuccessStatusCode)
                {
                    var stationsContent = await stationsResponse.Content.ReadAsStringAsync();
                    var stationsArray = JsonSerializer.Deserialize<JsonElement>(stationsContent);
                    if (stationsArray.ValueKind == JsonValueKind.Array)
                    {
                        totalStations = stationsArray.GetArrayLength();
                    }
                }
                else
                {
                    _logger.LogWarning($"Không thể lấy danh sách trạm: {stationsResponse.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách trạm");
            }

            // 2. Lấy số người dùng hoạt động (drivers) từ DriverService
            try
            {
                var usersUrl = $"{driverServiceUrl}/api/Driver/users/all?role=driver";
                var usersRequest = new HttpRequestMessage(HttpMethod.Get, usersUrl);
                var authHeader = Request.Headers["Authorization"].ToString();
                if (!string.IsNullOrEmpty(authHeader))
                {
                    usersRequest.Headers.Add("Authorization", authHeader);
                }

                var usersResponse = await _httpClient.SendAsync(usersRequest);
                if (usersResponse.IsSuccessStatusCode)
                {
                    var usersContent = await usersResponse.Content.ReadAsStringAsync();
                    var usersArray = JsonSerializer.Deserialize<JsonElement>(usersContent);
                    if (usersArray.ValueKind == JsonValueKind.Array)
                    {
                        activeUsers = usersArray.GetArrayLength();
                    }
                }
                else
                {
                    _logger.LogWarning($"Không thể lấy danh sách người dùng: {usersResponse.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách người dùng");
            }

            // 3. Lấy thống kê bookings hôm nay từ DriverService
            try
            {
                var bookingsUrl = $"{driverServiceUrl}/api/Driver/bookings/stats";
                var bookingsRequest = new HttpRequestMessage(HttpMethod.Get, bookingsUrl);
                var authHeader = Request.Headers["Authorization"].ToString();
                if (!string.IsNullOrEmpty(authHeader))
                {
                    bookingsRequest.Headers.Add("Authorization", authHeader);
                }

                var bookingsResponse = await _httpClient.SendAsync(bookingsRequest);
                if (bookingsResponse.IsSuccessStatusCode)
                {
                    var bookingsContent = await bookingsResponse.Content.ReadAsStringAsync();
                    var bookingsStats = JsonSerializer.Deserialize<JsonElement>(bookingsContent);
                    
                    if (bookingsStats.ValueKind == JsonValueKind.Object)
                    {
                        if (bookingsStats.TryGetProperty("totalToday", out var totalTodayEl))
                        {
                            todaySwaps = totalTodayEl.GetInt32();
                        }
                        if (bookingsStats.TryGetProperty("revenue", out var revenueEl))
                        {
                            todayRevenue = revenueEl.GetInt32();
                        }
                    }
                }
                else
                {
                    _logger.LogWarning($"Không thể lấy thống kê bookings: {bookingsResponse.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy thống kê bookings");
            }

            var stats = new
            {
                totalStations = totalStations,
                activeUsers = activeUsers,
                todaySwaps = todaySwaps,
                todayRevenue = todayRevenue
            };

            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy thống kê dashboard");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }
}

