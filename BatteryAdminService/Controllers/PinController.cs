using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BatteryAdminService.Models;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Linq;

namespace BatteryAdminService.Controllers;

[Route("api/Admin/[controller]")]
[ApiController]
// Authorization được đặt riêng cho từng endpoint
public class PinController : ControllerBase
{
    private readonly BatteryAdminDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PinController> _logger;

    public PinController(
        BatteryAdminDbContext context,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<PinController> logger)
    {
        _context = context;
        _httpClient = httpClientFactory.CreateClient();
        _configuration = configuration;
        _logger = logger;
    }

    // GET: api/Pin/staff - Lấy danh sách pin theo trạm (cho staff)
    [HttpGet("staff")]
    [Authorize(Roles = "staff")]
    public async Task<IActionResult> GetPinsForStaff([FromQuery] int? idtram = null)
    {
        try
        {
            // Debug: Log thông tin user và claims
            _logger.LogInformation("GetPinsForStaff called with idtram={Idtram}", idtram);
            if (User?.Identity?.IsAuthenticated == true)
            {
                _logger.LogInformation("User is authenticated. Claims: {Claims}", 
                    string.Join(", ", User.Claims.Select(c => $"{c.Type}={c.Value}")));
            }
            else
            {
                _logger.LogWarning("User is NOT authenticated!");
            }

            if (!idtram.HasValue || idtram.Value <= 0)
            {
                return BadRequest(new { message = "Vui lòng cung cấp idtram" });
            }

            var query = _context.Pins.Where(p => p.Idtram == idtram.Value);
            
            var pins = await query
                .OrderByDescending(p => p.Idpin)
                .ToListAsync();

            var result = pins.Select(pin => new
            {
                idpin = pin.Idpin,
                idloaipin = pin.Idloaipin,
                idtram = pin.Idtram ?? 0,
                soh = pin.Soh ?? 100,
                soc = pin.Soc ?? 100,
                tinhtrang = pin.Tinhtrang ?? "Khả dụng"
            }).ToList();

            _logger.LogInformation("Returning {Count} pins for station {Idtram}", result.Count, idtram.Value);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy danh sách pin cho staff");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // POST: api/Pin/staff - Tạo pin mới (cho staff)
    [HttpPost("staff")]
    [Authorize(Roles = "staff")]
    public async Task<IActionResult> CreatePinForStaff([FromBody] JsonElement jsonElement)
    {
        try
        {
            if (!jsonElement.TryGetProperty("idloaipin", out var idloaipinEl) ||
                !jsonElement.TryGetProperty("idtram", out var idtramEl) ||
                !jsonElement.TryGetProperty("soh", out var sohEl) ||
                !jsonElement.TryGetProperty("soc", out var socEl))
            {
                return BadRequest(new { message = "Thiếu thông tin bắt buộc: idloaipin, idtram, soh, soc" });
            }

            var newPin = new Pin
            {
                Idloaipin = idloaipinEl.GetInt32(),
                Idtram = idtramEl.GetInt32(),
                Soh = sohEl.GetSingle(),
                Soc = socEl.GetSingle(),
                Tinhtrang = jsonElement.TryGetProperty("tinhtrang", out var tinhtrangEl) 
                    ? tinhtrangEl.GetString() 
                    : "Pin đang sạc"
            };

            _context.Pins.Add(newPin);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                idpin = newPin.Idpin,
                idloaipin = newPin.Idloaipin,
                idtram = newPin.Idtram,
                soh = newPin.Soh,
                soc = newPin.Soc,
                tinhtrang = newPin.Tinhtrang
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi tạo pin mới cho staff");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // GET: api/Pin - Lấy danh sách tất cả pin hoặc theo trạm
    [HttpGet]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetAllPins([FromQuery] int? idtram = null)
    {
        try
        {
            var query = _context.Pins.AsQueryable();
            
            // Nếu có idtram, filter theo trạm
            if (idtram.HasValue && idtram.Value > 0)
            {
                query = query.Where(p => p.Idtram == idtram.Value);
            }
            
            var pins = await query
                .OrderByDescending(p => p.Idpin)
                .ToListAsync();

            // Lấy thông tin loại pin và trạm từ StationService
            var stationServiceUrl = _configuration["StationServiceUrl"] ?? "http://stationservice:5002";
            
            var result = new List<object>();
            
            foreach (var pin in pins)
            {
                // Lấy thông tin loại pin (gọi qua gateway)
                string loaiPinInfo = $"Pin {pin.Idloaipin}";
                if (pin.Idloaipin > 0)
                {
                    try
                    {
                        var request = new HttpRequestMessage(HttpMethod.Get, $"{stationServiceUrl}/api/Station/check/{pin.Idloaipin}");
                        // Forward token từ request hiện tại sang StationService
                        var authHeader = Request.Headers["Authorization"].FirstOrDefault();
                        if (!string.IsNullOrEmpty(authHeader))
                        {
                            request.Headers.Add("Authorization", authHeader);
                        }
                        var loaiPinResponse = await _httpClient.SendAsync(request);
                        if (loaiPinResponse.IsSuccessStatusCode)
                        {
                            var loaiPinJson = await loaiPinResponse.Content.ReadAsStringAsync();
                            using var doc = JsonDocument.Parse(loaiPinJson);
                            if (doc.RootElement.TryGetProperty("tenloaipin", out var tenloai))
                            {
                                loaiPinInfo = tenloai.GetString() ?? loaiPinInfo;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Không thể lấy thông tin loại pin {Idloaipin}", pin.Idloaipin);
                    }
                }

                // Lấy thông tin trạm (gọi qua gateway)
                string tramInfo = pin.Idtram.HasValue ? $"Trạm {pin.Idtram}" : "Chưa gán";
                if (pin.Idtram.HasValue && pin.Idtram > 0)
                {
                    try
                    {
                        var request = new HttpRequestMessage(HttpMethod.Get, $"{stationServiceUrl}/api/Station/danhsach");
                        // Forward token từ request hiện tại sang StationService
                        var authHeader = Request.Headers["Authorization"].FirstOrDefault();
                        if (!string.IsNullOrEmpty(authHeader))
                        {
                            request.Headers.Add("Authorization", authHeader);
                        }
                        var tramResponse = await _httpClient.SendAsync(request);
                        if (tramResponse.IsSuccessStatusCode)
                        {
                            var tramJson = await tramResponse.Content.ReadAsStringAsync();
                            using var doc = JsonDocument.Parse(tramJson);
                            if (doc.RootElement.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var tram in doc.RootElement.EnumerateArray())
                                {
                                    if (tram.TryGetProperty("id", out var id) && id.GetInt32() == pin.Idtram.Value)
                                    {
                                        if (tram.TryGetProperty("tentram", out var tentram))
                                        {
                                            tramInfo = tentram.GetString() ?? tramInfo;
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Không thể lấy thông tin trạm {Idtram}", pin.Idtram);
                    }
                }

                // Lấy thêm thông số chi tiết từ loai_pin nếu có
                int? dienap = null;
                int? congsuat = null;
                int? giadoipin = null;
                
                if (pin.Idloaipin > 0)
                {
                    try
                    {
                        var request = new HttpRequestMessage(HttpMethod.Get, $"{stationServiceUrl}/api/Station/check/{pin.Idloaipin}");
                        // Forward token từ request hiện tại sang StationService
                        var authHeader = Request.Headers["Authorization"].FirstOrDefault();
                        if (!string.IsNullOrEmpty(authHeader))
                        {
                            request.Headers.Add("Authorization", authHeader);
                        }
                        var loaiPinResponse = await _httpClient.SendAsync(request);
                        if (loaiPinResponse.IsSuccessStatusCode)
                        {
                            var loaiPinJson = await loaiPinResponse.Content.ReadAsStringAsync();
                            using var doc = JsonDocument.Parse(loaiPinJson);
                            if (doc.RootElement.TryGetProperty("dienap", out var dienapEl))
                            {
                                dienap = dienapEl.GetInt32();
                            }
                            if (doc.RootElement.TryGetProperty("congsuat", out var congsuatEl))
                            {
                                congsuat = congsuatEl.GetInt32();
                            }
                            if (doc.RootElement.TryGetProperty("giadoipin", out var giadoipinEl))
                            {
                                giadoipin = giadoipinEl.GetInt32();
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Không thể lấy thông số chi tiết loại pin {Idloaipin}", pin.Idloaipin);
                    }
                }

                result.Add(new
                {
                    idpin = pin.Idpin,
                    idloaipin = pin.Idloaipin,
                    loaipin = loaiPinInfo,
                    idtram = pin.Idtram,
                    tentram = tramInfo,
                    soh = pin.Soh ?? 100,
                    soc = pin.Soc ?? 100,
                    tinhtrang = pin.Tinhtrang ?? "Khả dụng",
                    dienap = dienap,
                    congsuat = congsuat,
                    giadoipin = giadoipin
                });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy danh sách pin");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // GET: api/Pin/{id} - Lấy thông tin chi tiết 1 pin
    [HttpGet("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetPinById(int id)
    {
        try
        {
            var pin = await _context.Pins.FindAsync(id);
            if (pin == null)
            {
                return NotFound(new { message = "Không tìm thấy pin" });
            }

            return Ok(new
            {
                idpin = pin.Idpin,
                idloaipin = pin.Idloaipin,
                idtram = pin.Idtram,
                soh = pin.Soh ?? 100,
                soc = pin.Soc ?? 100,
                tinhtrang = pin.Tinhtrang ?? "Khả dụng"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy thông tin pin {Id}", id);
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // PUT: api/Pin/{id}/status - Cập nhật tình trạng pin
    [HttpPut("{id}/status")]
    [Authorize(Roles = "admin,staff")]
    public async Task<IActionResult> UpdatePinStatus(int id, [FromBody] JsonElement jsonElement)
    {
        try
        {
            var pin = await _context.Pins.FindAsync(id);
            if (pin == null)
            {
                return NotFound(new { message = "Không tìm thấy pin" });
            }

            bool hasUpdate = false;

            // Đọc và cập nhật tinhtrang từ JSON
            if (jsonElement.TryGetProperty("tinhtrang", out var tinhtrangElement))
            {
                var tinhtrangValue = tinhtrangElement.GetString();
                if (!string.IsNullOrEmpty(tinhtrangValue))
                {
                    pin.Tinhtrang = tinhtrangValue;
                    hasUpdate = true;
                }
            }

            // Đọc và cập nhật SoH từ JSON
            if (jsonElement.TryGetProperty("soh", out var sohElement))
            {
                if (sohElement.ValueKind == JsonValueKind.Number && sohElement.TryGetSingle(out float sohValue))
                {
                    pin.Soh = sohValue;
                    hasUpdate = true;
                }
                else if (sohElement.ValueKind == JsonValueKind.String && float.TryParse(sohElement.GetString(), out float sohParsed))
                {
                    pin.Soh = sohParsed;
                    hasUpdate = true;
                }
            }

            // Đọc và cập nhật SoC từ JSON
            if (jsonElement.TryGetProperty("soc", out var socElement))
            {
                if (socElement.ValueKind == JsonValueKind.Number && socElement.TryGetSingle(out float socValue))
                {
                    pin.Soc = socValue;
                    hasUpdate = true;
                }
                else if (socElement.ValueKind == JsonValueKind.String && float.TryParse(socElement.GetString(), out float socParsed))
                {
                    pin.Soc = socParsed;
                    hasUpdate = true;
                }
            }

            if (!hasUpdate)
            {
                return BadRequest(new { message = "Không có dữ liệu nào để cập nhật" });
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật tình trạng pin thành công",
                pin = new
                {
                    idpin = pin.Idpin,
                    idloaipin = pin.Idloaipin,
                    idtram = pin.Idtram,
                    soh = pin.Soh,
                    soc = pin.Soc,
                    tinhtrang = pin.Tinhtrang
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi cập nhật pin {Id}", id);
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // GET: api/Pin/stats - Lấy thống kê pin
    [HttpGet("stats")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetPinStats()
    {
        try
        {
            var totalPins = await _context.Pins.CountAsync();
            var availablePins = await _context.Pins.CountAsync(p => p.Tinhtrang == "Khả dụng");
            var chargingPins = await _context.Pins.CountAsync(p => p.Tinhtrang == "Đang sạc");
            var maintenancePins = await _context.Pins.CountAsync(p => p.Tinhtrang == "Bảo trì" || p.Tinhtrang == "Bảo trì");
            var inUsePins = await _context.Pins.CountAsync(p => p.Tinhtrang == "Đang sử dụng");

            return Ok(new
            {
                total = totalPins,
                available = availablePins,
                inUse = inUsePins,
                charging = chargingPins,
                maintenance = maintenancePins
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy thống kê pin");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }


    // GET: api/Pin/coordination/stations - Lấy danh sách trạm với thống kê pin
    [HttpGet("coordination/stations")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetStationsWithInventory()
    {
        try
        {
            var stationServiceUrl = _configuration["StationServiceUrl"] ?? "http://stationservice:5002";

            // Lấy danh sách trạm từ StationService
            var request = new HttpRequestMessage(HttpMethod.Get, $"{stationServiceUrl}/api/Station/danhsach");
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrEmpty(authHeader))
            {
                request.Headers.Add("Authorization", authHeader);
            }

            var stationResponse = await _httpClient.SendAsync(request);
            if (!stationResponse.IsSuccessStatusCode)
            {
                return StatusCode(500, new { message = "Không thể lấy danh sách trạm" });
            }

            var stationJson = await stationResponse.Content.ReadAsStringAsync();
            using var stationDoc = JsonDocument.Parse(stationJson);

            var result = new List<object>();

            if (stationDoc.RootElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var station in stationDoc.RootElement.EnumerateArray())
                {
                    if (station.TryGetProperty("id", out var stationIdEl))
                    {
                        var stationId = stationIdEl.GetInt32();

                        // Đếm pin theo trạng thái tại trạm này
                        var totalPins = await _context.Pins.CountAsync(p => p.Idtram == stationId);
                        var availablePins = await _context.Pins.CountAsync(p => p.Idtram == stationId && p.Tinhtrang == "Khả dụng");
                        var fullPins = await _context.Pins.CountAsync(p => p.Idtram == stationId && p.Tinhtrang == "Pin đầy");
                        var chargingPins = await _context.Pins.CountAsync(p => p.Idtram == stationId && (p.Tinhtrang == "Đang sạc" || p.Tinhtrang == "Pin đang sạc"));
                        var inUsePins = await _context.Pins.CountAsync(p => p.Idtram == stationId && p.Tinhtrang == "Đang sử dụng");
                        var maintenancePins = await _context.Pins.CountAsync(p => p.Idtram == stationId && (p.Tinhtrang == "Bảo trì" || p.Tinhtrang == "Bảo trì"));

                        result.Add(new
                        {
                            id = stationId,
                            tentram = station.TryGetProperty("tentram", out var tentram) ? tentram.GetString() : $"Trạm {stationId}",
                            diachi = station.TryGetProperty("diachi", out var diachi) ? diachi.GetString() : "",
                            latitude = station.TryGetProperty("latitude", out var lat) ? lat.GetDouble() : (double?)null,
                            longitude = station.TryGetProperty("longitude", out var lng) ? lng.GetDouble() : (double?)null,
                            trangthai = station.TryGetProperty("trangthai", out var trangthai) ? trangthai.GetString() : "",
                            inventory = new
                            {
                                total = totalPins,
                                available = availablePins,
                                full = fullPins, // Số pin đầy có thể chuyển
                                charging = chargingPins,
                                inUse = inUsePins,
                                maintenance = maintenancePins
                            }
                        });
                    }
                }
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy danh sách trạm với tồn kho");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // GET: api/Pin/coordination/inventory/{stationId} - Lấy tồn kho pin chi tiết theo trạm
    [HttpGet("coordination/inventory/{stationId}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetStationInventory(int stationId)
    {
        try
        {
            var stationServiceUrl = _configuration["StationServiceUrl"] ?? "http://stationservice:5002";

            // Lấy thông tin trạm
            var request = new HttpRequestMessage(HttpMethod.Get, $"{stationServiceUrl}/api/Station/danhsach");
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrEmpty(authHeader))
            {
                request.Headers.Add("Authorization", authHeader);
            }

            var stationResponse = await _httpClient.SendAsync(request);
            string? tentram = null;

            if (stationResponse.IsSuccessStatusCode)
            {
                var stationJson = await stationResponse.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(stationJson);
                if (doc.RootElement.ValueKind == JsonValueKind.Array)
                {
                    foreach (var station in doc.RootElement.EnumerateArray())
                    {
                        if (station.TryGetProperty("id", out var id) && id.GetInt32() == stationId)
                        {
                            if (station.TryGetProperty("tentram", out var tentramEl))
                            {
                                tentram = tentramEl.GetString();
                            }
                            break;
                        }
                    }
                }
            }

            // Lấy danh sách pin tại trạm
            var pins = await _context.Pins
                .Where(p => p.Idtram == stationId)
                .OrderByDescending(p => p.Idpin)
                .ToListAsync();

            var pinDetails = new List<object>();

            foreach (var pin in pins)
            {
                // Lấy thông tin loại pin
                string loaiPinInfo = $"Pin {pin.Idloaipin}";
                if (pin.Idloaipin > 0)
                {
                    try
                    {
                        var loaiPinRequest = new HttpRequestMessage(HttpMethod.Get, $"{stationServiceUrl}/api/Station/check/{pin.Idloaipin}");
                        if (!string.IsNullOrEmpty(authHeader))
                        {
                            loaiPinRequest.Headers.Add("Authorization", authHeader);
                        }
                        var loaiPinResponse = await _httpClient.SendAsync(loaiPinRequest);
                        if (loaiPinResponse.IsSuccessStatusCode)
                        {
                            var loaiPinJson = await loaiPinResponse.Content.ReadAsStringAsync();
                            using var loaiPinDoc = JsonDocument.Parse(loaiPinJson);
                            if (loaiPinDoc.RootElement.TryGetProperty("tenloaipin", out var tenloai))
                            {
                                loaiPinInfo = tenloai.GetString() ?? loaiPinInfo;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Không thể lấy thông tin loại pin {Idloaipin}", pin.Idloaipin);
                    }
                }

                pinDetails.Add(new
                {
                    idpin = pin.Idpin,
                    idloaipin = pin.Idloaipin,
                    loaipin = loaiPinInfo,
                    soh = pin.Soh ?? 100,
                    soc = pin.Soc ?? 100,
                    tinhtrang = pin.Tinhtrang ?? "Khả dụng"
                });
            }

            // Thống kê
            var stats = new
            {
                total = pins.Count,
                available = pins.Count(p => p.Tinhtrang == "Khả dụng"),
                charging = pins.Count(p => p.Tinhtrang == "Đang sạc"),
                inUse = pins.Count(p => p.Tinhtrang == "Đang sử dụng"),
                maintenance = pins.Count(p => p.Tinhtrang == "Bảo trì" || p.Tinhtrang == "Bảo trì")
            };

            return Ok(new
            {
                stationId = stationId,
                tentram = tentram ?? $"Trạm {stationId}",
                stats = stats,
                pins = pinDetails
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy tồn kho trạm {StationId}", stationId);
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }

    // POST: api/Pin/coordination/transfer - Điều phối pin từ trạm này sang trạm khác
    [HttpPost("coordination/transfer")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> TransferBatteries([FromBody] JsonElement jsonElement)
    {
        try
        {
            // Đọc thông tin từ request
            if (!jsonElement.TryGetProperty("fromStationId", out var fromStationEl) ||
                !jsonElement.TryGetProperty("toStationId", out var toStationEl) ||
                !jsonElement.TryGetProperty("batteryIds", out var batteryIdsEl))
            {
                return BadRequest(new { message = "Thiếu thông tin: fromStationId, toStationId, batteryIds" });
            }

            var fromStationId = fromStationEl.GetInt32();
            var toStationId = toStationEl.GetInt32();

            if (fromStationId == toStationId)
            {
                return BadRequest(new { message = "Không thể chuyển pin trong cùng một trạm" });
            }

            // Đọc danh sách ID pin
            var batteryIds = new List<int>();
            if (batteryIdsEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var idEl in batteryIdsEl.EnumerateArray())
                {
                    if (idEl.ValueKind == JsonValueKind.Number)
                    {
                        batteryIds.Add(idEl.GetInt32());
                    }
                }
            }

            if (batteryIds.Count == 0)
            {
                return BadRequest(new { message = "Danh sách pin không được rỗng" });
            }

            // Kiểm tra và cập nhật pin
            var transferredPins = new List<object>();
            var failedPins = new List<object>();

            foreach (var batteryId in batteryIds)
            {
                var pin = await _context.Pins.FindAsync(batteryId);
                if (pin == null)
                {
                    failedPins.Add(new { idpin = batteryId, reason = "Không tìm thấy pin" });
                    continue;
                }

                if (pin.Idtram != fromStationId)
                {
                    failedPins.Add(new { idpin = batteryId, reason = $"Pin không thuộc trạm {fromStationId}" });
                    continue;
                }

                // Chỉ pin "Pin đầy" mới có thể chuyển trạm
                if (pin.Tinhtrang != "Pin đầy")
                {
                    failedPins.Add(new { idpin = batteryId, reason = $"Pin đang ở trạng thái '{pin.Tinhtrang}', chỉ pin 'Pin đầy' mới có thể chuyển trạm" });
                    continue;
                }

                // Cập nhật trạm cho pin
                pin.Idtram = toStationId;
                transferredPins.Add(new
                {
                    idpin = pin.Idpin,
                    idloaipin = pin.Idloaipin,
                    fromStationId = fromStationId,
                    toStationId = toStationId
                });
            }

            await _context.SaveChangesAsync();

            // Lấy tên trạm
            var stationServiceUrl = _configuration["StationServiceUrl"] ?? "http://stationservice:5002";
            string? fromStationName = null;
            string? toStationName = null;

            try
            {
                var request = new HttpRequestMessage(HttpMethod.Get, $"{stationServiceUrl}/api/Station/danhsach");
                var authHeader = Request.Headers["Authorization"].FirstOrDefault();
                if (!string.IsNullOrEmpty(authHeader))
                {
                    request.Headers.Add("Authorization", authHeader);
                }
                var stationResponse = await _httpClient.SendAsync(request);
                if (stationResponse.IsSuccessStatusCode)
                {
                    var stationJson = await stationResponse.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(stationJson);
                    if (doc.RootElement.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var station in doc.RootElement.EnumerateArray())
                        {
                            if (station.TryGetProperty("id", out var id))
                            {
                                var stationId = id.GetInt32();
                                if (stationId == fromStationId && station.TryGetProperty("tentram", out var fromName))
                                {
                                    fromStationName = fromName.GetString();
                                }
                                if (stationId == toStationId && station.TryGetProperty("tentram", out var toName))
                                {
                                    toStationName = toName.GetString();
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Không thể lấy tên trạm");
            }

            return Ok(new
            {
                message = $"Đã chuyển {transferredPins.Count} pin từ trạm {fromStationName ?? fromStationId.ToString()} sang trạm {toStationName ?? toStationId.ToString()}",
                transferred = transferredPins,
                failed = failedPins,
                summary = new
                {
                    total = batteryIds.Count,
                    success = transferredPins.Count,
                    failed = failedPins.Count
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi điều phối pin");
            return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
        }
    }
}

