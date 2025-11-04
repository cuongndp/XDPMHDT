using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BatteryAdminService.Models;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace BatteryAdminService.Controllers;

[Route("api/Admin/[controller]")]
[ApiController]
[Authorize(Roles = "admin")]
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

    // GET: api/Pin - Lấy danh sách tất cả pin hoặc theo trạm
    [HttpGet]
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

}

