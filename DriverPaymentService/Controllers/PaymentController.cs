using DriverPaymentService.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DriverPaymentService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentController : ControllerBase
    {
        public readonly PaymentServiceDbContext _context;
        public PaymentController(PaymentServiceDbContext context)
        {
            _context = context;
        }



        //[Authorize("driver")]
        [HttpGet("loggoi")]
        public async Task<IActionResult> GetLogGoi()
        {
            var loggoi = await _context.DichVus.ToListAsync();
            return Ok(loggoi);
        }


        [Authorize("driver")]
        [HttpGet("loggoiid/{id}")]
        public async Task<IActionResult> Getloggoiid(int id)
        {
            var loggoi = await _context.DichVus.FindAsync(id);
            if (loggoi == null)
            {
                return BadRequest();
            }
            return Ok(loggoi);
        }

        //[Authorize("driver")]
        [HttpGet("paymentgetgoi/{id}")]
        public async Task<IActionResult> Goidichvu(int id)
        {
            var loggoi = await _context.DichVus.FirstOrDefaultAsync(i=>i.Id==id);
            if (loggoi == null)
            {
                return BadRequest(new {message ="Gói bạn đang load không tồn tại" });
            }
            else
            {
                var dichvu = new DichVu
                {
                        Id = loggoi.Id,
                        Tendichvu = loggoi.Tendichvu,
                        Mota = loggoi.Mota,
                        Thoihan = loggoi.Thoihan,
                        Phi = loggoi.Phi,
                        Solandoipin = loggoi.Solandoipin
                };
                return Ok(dichvu);
            }    
                
        }
        [Authorize("driver")]
        [HttpGet("logdichvu/{id}")]
        public async Task<IActionResult> GetLogDichVu(int id)
        {
            var logdichvu = await _context.DichVus
                .Where(d => d.Id == id)
                .Select(selector: d => new
                {
                    d.Tendichvu,
                    d.Mota,
                    d.Phi,
                }).FirstOrDefaultAsync();
            if (logdichvu == null)
            {
                return BadRequest();
            }
            else
                return Ok(logdichvu);
        }

        // API cho nhân viên - Tạo hóa đơn sau khi hoàn thành đổi pin
        [HttpPost("hoadon")]
        [Authorize(Roles = "staff")]
        public async Task<IActionResult> CreateHoaDon([FromBody] Dictionary<string, string> data)
        {
            try
            {
                // Validate dữ liệu
                if (!data.ContainsKey("idbooking") || !data.ContainsKey("iduser") || 
                    !data.ContainsKey("chiphi"))
                {
                    return BadRequest(new { message = "Thiếu thông tin bắt buộc" });
                }

                var hoaDon = new HoaDon
                {
                    Idbooking = int.Parse(data["idbooking"]),
                    Iduser = int.Parse(data["iduser"]),
                    Idloaipin = data.ContainsKey("idloaipin") ? int.Parse(data["idloaipin"]) : null,
                    Idtramdoipin = data.ContainsKey("idtramdoipin") ? int.Parse(data["idtramdoipin"]) : 1, // Default trạm 1
                    Chiphi = int.Parse(data["chiphi"]),
                    Ngaydoipin = DateOnly.FromDateTime(DateTime.Now)
                };

                _context.HoaDons.Add(hoaDon);
                await _context.SaveChangesAsync();

                return Ok(new 
                { 
                    message = "Tạo hóa đơn thành công",
                    hoadonId = hoaDon.Id,
                    hoadon = new
                    {
                        id = hoaDon.Id,
                        idbooking = hoaDon.Idbooking,
                        iduser = hoaDon.Iduser,
                        idloaipin = hoaDon.Idloaipin,
                        idtramdoipin = hoaDon.Idtramdoipin,
                        chiphi = hoaDon.Chiphi,
                        ngaydoipin = hoaDon.Ngaydoipin
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi tạo hóa đơn: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // API lấy hóa đơn theo booking ID (driver và staff đều có thể xem)
        [HttpGet("hoadon/booking/{bookingId}")]
        [Authorize] // Cả driver và staff đều được xem
        public async Task<IActionResult> GetHoaDonByBooking(int bookingId)
        {
            try
            {
                var hoaDon = await _context.HoaDons
                    .Where(h => h.Idbooking == bookingId)
                    .FirstOrDefaultAsync();

                if (hoaDon == null)
                {
                    return NotFound(new { message = "Không tìm thấy hóa đơn" });
                }

                return Ok(hoaDon);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi lấy hóa đơn: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }
    }
}