using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using StationService.Models;

namespace StationService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StationController : ControllerBase
    {
        public readonly StationServiceContext _context;
        public StationController(StationServiceContext context)
        {
            _context = context;
        }
        [Authorize]
        [HttpGet("themxe")]
        public IActionResult GetBatteryTypes()
        {
            var dsPin = _context.LoaiPins.ToList();
            return Ok(dsPin);
        }
        [Authorize]
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
        
        [Authorize(Roles = "driver")]
        [HttpGet("map/{lat}/{lng}")]
        public async Task<IActionResult> GetStations(double lat, double lng)
        {
            var apiKey = "AIzaSyAhKLQftgIywgKiCq1As-6fWeo9bPiIjYY"; // hoặc lấy từ cấu hình
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
    }

}
    