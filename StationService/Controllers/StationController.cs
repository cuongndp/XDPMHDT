using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StationService.Models;
using System.Text;
using System.Text.Json;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace StationService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StationController : ControllerBase
    {
        public readonly StationServiceContext _context;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        
        public StationController(StationServiceContext context, IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _context = context;
            _httpClient = httpClientFactory.CreateClient();
            _configuration = configuration;
        }
        [Authorize]
        [HttpGet("themxe")]
        public IActionResult GetBatteryTypes()
        {
            var dsPin = _context.LoaiPins.ToList();
            return Ok(dsPin);
        }
        // Bỏ [Authorize] để cho phép internal service calls từ BatteryAdminService
        [HttpGet("check/{Idloaipin}")]
        public async Task<IActionResult> Check(int Idloaipin)
        {
            var userId = await _context.LoaiPins.FirstOrDefaultAsync(p=> p.Id==Idloaipin);
            if (userId == null)
            {
                return BadRequest();
            }
            else
            {
                return Ok(new LoaiPin
                {
                    
                    Tenloaipin = userId.Tenloaipin,
                    Dienap = userId.Dienap,
                    Congsuat = userId.Congsuat,
                    Giadoipin = userId.Giadoipin
                });
            }
            
        }
        [HttpGet("danhsach")]
        public async Task<IActionResult> GetStations()
        {
            var stations = await _context.TramDoiPins.ToListAsync();
            return Ok(stations);
        }

        [Authorize(Roles = "driver")]
        [HttpGet("map/{lat}/{lng}")]
        public async Task<IActionResult> GetStations(double lat, double lng)
        {
            var apiKey = ""; // hoặc lấy từ cấu hình
            var stations = await _context.TramDoiPins
                .Where(t => t.Latitude != null && t.Longitude != null)
                .ToListAsync();

            if (!stations.Any())
                return NotFound("Không có trạm nào trong hệ thống.");

            // Ghép danh sách trạm thành chuỗi cho Google API
            var destinations = string.Join("|", stations.Select(t => $"{t.Latitude},{t.Longitude}"));

            var url = $"https://maps.googleapis.com/maps/api/distancematrix/json?origins={lat},{lng}&destinations={destinations}&key={apiKey}&language=vi&region=vn";

            using var client = new HttpClient();
            var response = await client.GetStringAsync(url);
            var json = Newtonsoft.Json.Linq.JObject.Parse(response);

            var rows = json["rows"]?.FirstOrDefault()?["elements"];
            if (rows == null)
                return BadRequest("Không thể lấy dữ liệu khoảng cách từ Google.");

            // Ghép kết quả với danh sách trạm
            var result = stations
                .Select((tram, index) => new
                {
                    Tram = tram,
                    KhoangCachKm = ((double?)rows[index]?["distance"]?["value"] ?? 0) / 1000,
                    ThoiGianPhut = ((double?)rows[index]?["duration"]?["value"] ?? 0) / 60
                })
                .OrderBy(x => x.KhoangCachKm)
                .Take(3)
                .ToList();

            return Ok(result);
        }

        [Authorize("driver")]
        [HttpGet("gettram/{id}")]
        public async Task<IActionResult> GetStationById(int id)
        {
            var station = await _context.TramDoiPins.FindAsync(id);
            if (station == null)
                return NotFound("Không tìm thấy trạm với ID đã cho.");
            return Ok(station);
        }
        [Authorize]
        [HttpGet("hoadon/{id}")]
        public async Task<IActionResult> GetStationInvoice(int id)
        {
            var stationInvoice = await _context.TramDoiPins.FirstOrDefaultAsync(d=>d.Id==id);
            if (stationInvoice == null)
            {
                return NotFound(new { message = "Không tìm thấy trạm" });
            }
            return Ok(stationInvoice.Tentram ?? "");
        }

        // API cho nhân viên - Cập nhật trạng thái booking với thông tin pin
        [HttpPut("bookings/{id}/status")]
        [Authorize(Roles = "staff")]
        public async Task<IActionResult> UpdateBookingStatus(int id, [FromBody] JsonElement jsonElement)
        {
            try
            {
                // Đọc dữ liệu từ JSON
                var data = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(jsonElement.GetRawText());

                // Lấy token từ request header
                var authHeader = Request.Headers["Authorization"].ToString();
                if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
                {
                    return Unauthorized(new { message = "Thiếu token xác thực" });
                }
                var token = authHeader.Replace("Bearer ", "").Trim();
                
                var driverServiceUrl = _configuration["DriverServiceUrl"] ?? "http://localhost:5000/gateway/driver";
                Console.WriteLine($"[UpdateBookingStatus] DriverServiceUrl: {driverServiceUrl}");
                
                // Bước 1: Gọi DriverService để cập nhật trạng thái booking
                var bookingUpdateRequest = new Dictionary<string, string>();
                if (data.ContainsKey("trangthai") && data["trangthai"].ValueKind != JsonValueKind.Null)
                {
                    var trangThaiValue = data["trangthai"].GetString();
                    if (!string.IsNullOrEmpty(trangThaiValue))
                    {
                        bookingUpdateRequest["trangthai"] = trangThaiValue;
                    }
                }
                if (data.ContainsKey("trangthaithanhtoan") && data["trangthaithanhtoan"].ValueKind != JsonValueKind.Null)
                {
                    var trangThaiThanhToanValue = data["trangthaithanhtoan"].GetString();
                    if (!string.IsNullOrEmpty(trangThaiThanhToanValue))
                    {
                        bookingUpdateRequest["trangthaithanhtoan"] = trangThaiThanhToanValue;
                    }
                }

                var bookingJson = JsonSerializer.Serialize(bookingUpdateRequest);
                var bookingContent = new StringContent(bookingJson, Encoding.UTF8, "application/json");
                
                var bookingUpdateHttpRequest = new HttpRequestMessage(HttpMethod.Put, $"{driverServiceUrl}/bookings/{id}/status")
                {
                    Content = bookingContent
                };
                bookingUpdateHttpRequest.Headers.Add("Authorization", $"Bearer {token}");
                
                Console.WriteLine($"[UpdateBookingStatus] Gọi DriverService: {driverServiceUrl}/bookings/{id}/status");
                var bookingResponse = await _httpClient.SendAsync(bookingUpdateHttpRequest);
                
                if (!bookingResponse.IsSuccessStatusCode)
                {
                    var errorContent = await bookingResponse.Content.ReadAsStringAsync();
                    Console.WriteLine($"[UpdateBookingStatus] Lỗi từ DriverService: {bookingResponse.StatusCode} - {errorContent}");
                    return StatusCode((int)bookingResponse.StatusCode, new { message = $"Lỗi khi cập nhật booking: {errorContent}" });
                }
                Console.WriteLine($"[UpdateBookingStatus] DriverService cập nhật thành công");

                // Bước 2: Nếu có thông tin pin đổi và pin nhận về, đổi chỗ pin
                if (data.ContainsKey("pinDoi") && data.ContainsKey("pinNhanVe"))
                {
                    var pinDoiElement = data["pinDoi"];
                    var pinNhanVeElement = data["pinNhanVe"];
                    
                    var pinDoi = JsonSerializer.Deserialize<Dictionary<string, object>>(pinDoiElement.GetRawText());
                    var pinNhanVe = JsonSerializer.Deserialize<Dictionary<string, object>>(pinNhanVeElement.GetRawText());
                    
                    if (pinDoi == null || pinNhanVe == null)
                    {
                        Console.WriteLine("[UpdateBookingStatus] Lỗi: pinDoi hoặc pinNhanVe là null");
                        return BadRequest(new { message = "Dữ liệu pin không hợp lệ" });
                    }
                    
                    // Validate pin đổi
                    if (!pinDoi.ContainsKey("idpin") || pinDoi["idpin"] == null)
                    {
                        return BadRequest(new { message = "Thiếu idpin trong pin đổi" });
                    }
                    
                    // Validate pin nhận về - BẮT BUỘC phải có SoH và SoC
                    if (!pinNhanVe.ContainsKey("soh") || pinNhanVe["soh"] == null)
                    {
                        return BadRequest(new { message = "Thiếu SoH của pin nhận về. Vui lòng nhập đầy đủ thông tin!" });
                    }
                    if (!pinNhanVe.ContainsKey("soc") || pinNhanVe["soc"] == null)
                    {
                        return BadRequest(new { message = "Thiếu SoC của pin nhận về. Vui lòng nhập đầy đủ thông tin!" });
                    }
                    
                    int pinDoiId = Convert.ToInt32(pinDoi["idpin"].ToString());
                    float pinNhanVeSoh = Convert.ToSingle(pinNhanVe["soh"].ToString());
                    float pinNhanVeSoc = Convert.ToSingle(pinNhanVe["soc"].ToString());
                    
                    // Validate giá trị SoH và SoC (0-100)
                    if (pinNhanVeSoh < 0 || pinNhanVeSoh > 100)
                    {
                        return BadRequest(new { message = "SoH của pin nhận về phải từ 0 đến 100!" });
                    }
                    if (pinNhanVeSoc < 0 || pinNhanVeSoc > 100)
                    {
                        return BadRequest(new { message = "SoC của pin nhận về phải từ 0 đến 100!" });
                    }
                    
                    // Lấy thông tin booking từ response đã có (hoặc gọi lại API)
                    // Lấy từ pin đổi để có idloaipin
                    int idloaipin = pinDoi.ContainsKey("idloaipin") ? Convert.ToInt32(pinDoi["idloaipin"].ToString()) : 0;
                    
                    // Lấy idtram từ booking response hoặc từ pin đổi
                    int idtram = 0;
                    if (pinDoi.ContainsKey("idtram"))
                    {
                        idtram = Convert.ToInt32(pinDoi["idtram"].ToString());
                    }
                    else
                    {
                        // Gọi API để lấy booking info
                        var bookingInfoRequest = new HttpRequestMessage(HttpMethod.Get, $"{driverServiceUrl}/bookings/{id}");
                        bookingInfoRequest.Headers.Add("Authorization", $"Bearer {token}");
                        var bookingInfoResponse = await _httpClient.SendAsync(bookingInfoRequest);
                        
                        if (bookingInfoResponse.IsSuccessStatusCode)
                        {
                            var bookingInfo = await bookingInfoResponse.Content.ReadAsStringAsync();
                            var bookingData = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(bookingInfo);
                            
                            if (bookingData != null)
                            {
                                if (bookingData.ContainsKey("idtram") && bookingData["idtram"].ValueKind != JsonValueKind.Null)
                                {
                                    idtram = bookingData["idtram"].GetInt32();
                                }
                                if (idloaipin == 0 && bookingData.ContainsKey("idloaipin") && bookingData["idloaipin"].ValueKind != JsonValueKind.Null)
                                {
                                    idloaipin = bookingData["idloaipin"].GetInt32();
                                }
                            }
                        }
                    }
                    
                    // Đổi chỗ pin: pin đổi → cập nhật thành pin nhận về (SoH, SoC mới)
                    // Không cần tạo pin mới, chỉ cập nhật pin đổi
                    try
                    {
                        await CreateNewPinAndUpdateRelatedTables(pinDoiId, idloaipin, idtram, pinNhanVeSoh, pinNhanVeSoc, token);
                        Console.WriteLine($"[UpdateBookingStatus] Đã đổi chỗ pin thành công: pin {pinDoiId} → pin nhận về (SoH={pinNhanVeSoh}, SoC={pinNhanVeSoc})");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[UpdateBookingStatus] Lỗi khi đổi chỗ pin: {ex.Message}");
                        // Vẫn trả về success cho booking update, nhưng log lỗi pin
                    }
                }

                return Ok(new { message = "Cập nhật trạng thái thành công" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[UpdateBookingStatus] Exception: {ex.Message}");
                Console.WriteLine($"[UpdateBookingStatus] Stack trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[UpdateBookingStatus] Inner exception: {ex.InnerException.Message}");
                }
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}", details = ex.ToString() });
            }
        }

        // Helper method để đổi chỗ pin: pin đổi → cập nhật thành pin nhận về
        private async Task CreateNewPinAndUpdateRelatedTables(int pinDoiId, int idloaipin, int idtram, float soh, float soc, string token)
        {
            try
            {
                var batteryAdminUrl = _configuration["BatteryAdminServiceUrl"] ?? "http://localhost:5000/gateway/batteryadmin";
                
                Console.WriteLine($"[SwapPin] Bắt đầu đổi pin: pinDoiId={pinDoiId}, soh={soh}, soc={soc}");
                
                // Đổi chỗ: Pin đổi (pin cũ) → cập nhật thành pin nhận về (SoH, SoC mới)
                // Pin đổi sẽ trở thành pin nhận về trong trạm
                var updatePinRequest = new
                {
                    soh = soh,
                    soc = soc,
                    tinhtrang = "Pin đang sạc" // Pin nhận về sẽ được sạc
                };
                
                var updateJson = JsonSerializer.Serialize(updatePinRequest);
                var updateContent = new StringContent(updateJson, Encoding.UTF8, "application/json");
                
                var updateRequest = new HttpRequestMessage(HttpMethod.Put, $"{batteryAdminUrl}/Pin/{pinDoiId}/status")
                {
                    Content = updateContent
                };
                updateRequest.Headers.Add("Authorization", $"Bearer {token}");
                
                Console.WriteLine($"[SwapPin] Gọi API cập nhật pin {pinDoiId}: {batteryAdminUrl}/Pin/{pinDoiId}/status");
                var updateResponse = await _httpClient.SendAsync(updateRequest);
                
                if (updateResponse.IsSuccessStatusCode)
                {
                    var responseContent = await updateResponse.Content.ReadAsStringAsync();
                    Console.WriteLine($"[SwapPin] Đã cập nhật pin đổi {pinDoiId} thành pin nhận về thành công");
                    Console.WriteLine($"[SwapPin] Response: {responseContent}");
                }
                else
                {
                    var errorContent = await updateResponse.Content.ReadAsStringAsync();
                    Console.WriteLine($"[SwapPin] Lỗi khi cập nhật pin {pinDoiId}: {updateResponse.StatusCode} - {errorContent}");
                    throw new Exception($"Không thể cập nhật pin {pinDoiId}: {errorContent}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SwapPin] Exception: {ex.Message}");
                Console.WriteLine($"[SwapPin] Stack trace: {ex.StackTrace}");
                throw; // Throw lại để caller biết có lỗi
            }
        }

    }

}


