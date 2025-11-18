using DriverPaymentService.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Text.Json;

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

        // POST: api/payment/loggoi - Tạo gói dịch vụ mới (cho admin)
        [HttpPost("loggoi")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> CreateDichVu([FromBody] Dictionary<string, object> data)
        {
            try
            {
                // Parse dữ liệu
                string? tendichvu = null;
                string? mota = null;
                int? thoihan = null;
                decimal phi = 0;
                string? solandoipin = null;

                if (data.ContainsKey("tendichvu"))
                {
                    if (data["tendichvu"] is JsonElement tendichvuElement)
                        tendichvu = tendichvuElement.GetString();
                    else
                        tendichvu = data["tendichvu"]?.ToString();
                }

                if (data.ContainsKey("mota"))
                {
                    if (data["mota"] is JsonElement motaElement)
                        mota = motaElement.GetString();
                    else
                        mota = data["mota"]?.ToString();
                }

                if (data.ContainsKey("thoihan") && data["thoihan"] != null)
                {
                    if (data["thoihan"] is JsonElement thoihanElement && thoihanElement.ValueKind == JsonValueKind.Number)
                        thoihan = thoihanElement.GetInt32();
                    else if (int.TryParse(data["thoihan"]?.ToString(), out int parsedThoihan))
                        thoihan = parsedThoihan;
                }

                if (data.ContainsKey("phi"))
                {
                    if (data["phi"] is JsonElement phiElement && phiElement.ValueKind == JsonValueKind.Number)
                        phi = phiElement.GetDecimal();
                    else if (decimal.TryParse(data["phi"]?.ToString(), out decimal parsedPhi))
                        phi = parsedPhi;
                }

                if (data.ContainsKey("solandoipin"))
                {
                    if (data["solandoipin"] is JsonElement solandoipinElement)
                        solandoipin = solandoipinElement.GetString();
                    else
                        solandoipin = data["solandoipin"]?.ToString();
                }

                // Validate
                if (string.IsNullOrEmpty(tendichvu))
                {
                    return BadRequest(new { message = "Tên dịch vụ không được để trống" });
                }

                if (phi <= 0)
                {
                    return BadRequest(new { message = "Phí phải lớn hơn 0" });
                }

                var dichVu = new DichVu
                {
                    Tendichvu = tendichvu,
                    Mota = mota,
                    Thoihan = thoihan,
                    Phi = phi,
                    Solandoipin = solandoipin
                };

                _context.DichVus.Add(dichVu);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Tạo gói dịch vụ thành công",
                    id = dichVu.Id,
                    dichvu = new
                    {
                        id = dichVu.Id,
                        tendichvu = dichVu.Tendichvu,
                        mota = dichVu.Mota,
                        thoihan = dichVu.Thoihan,
                        phi = dichVu.Phi,
                        solandoipin = dichVu.Solandoipin
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi tạo gói dịch vụ: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // PUT: api/payment/loggoi/{id} - Cập nhật gói dịch vụ (cho admin)
        [HttpPut("loggoi/{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> UpdateDichVu(int id, [FromBody] Dictionary<string, object> data)
        {
            try
            {
                var dichVu = await _context.DichVus.FindAsync(id);
                if (dichVu == null)
                {
                    return NotFound(new { message = "Không tìm thấy gói dịch vụ" });
                }

                // Parse và cập nhật dữ liệu
                if (data.ContainsKey("tendichvu"))
                {
                    if (data["tendichvu"] is JsonElement tendichvuElement)
                        dichVu.Tendichvu = tendichvuElement.GetString() ?? dichVu.Tendichvu;
                    else
                        dichVu.Tendichvu = data["tendichvu"]?.ToString() ?? dichVu.Tendichvu;
                }

                if (data.ContainsKey("mota"))
                {
                    if (data["mota"] is JsonElement motaElement)
                        dichVu.Mota = motaElement.GetString();
                    else
                        dichVu.Mota = data["mota"]?.ToString();
                }

                if (data.ContainsKey("thoihan"))
                {
                    if (data["thoihan"] == null)
                    {
                        dichVu.Thoihan = null;
                    }
                    else if (data["thoihan"] is JsonElement thoihanElement && thoihanElement.ValueKind == JsonValueKind.Number)
                        dichVu.Thoihan = thoihanElement.GetInt32();
                    else if (int.TryParse(data["thoihan"]?.ToString(), out int parsedThoihan))
                        dichVu.Thoihan = parsedThoihan;
                }

                if (data.ContainsKey("phi"))
                {
                    if (data["phi"] is JsonElement phiElement && phiElement.ValueKind == JsonValueKind.Number)
                        dichVu.Phi = phiElement.GetDecimal();
                    else if (decimal.TryParse(data["phi"]?.ToString(), out decimal parsedPhi))
                        dichVu.Phi = parsedPhi;
                }

                if (data.ContainsKey("solandoipin"))
                {
                    if (data["solandoipin"] is JsonElement solandoipinElement)
                        dichVu.Solandoipin = solandoipinElement.GetString();
                    else
                        dichVu.Solandoipin = data["solandoipin"]?.ToString();
                }

                // Validate
                if (string.IsNullOrEmpty(dichVu.Tendichvu))
                {
                    return BadRequest(new { message = "Tên dịch vụ không được để trống" });
                }

                if (dichVu.Phi <= 0)
                {
                    return BadRequest(new { message = "Phí phải lớn hơn 0" });
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Cập nhật gói dịch vụ thành công",
                    id = dichVu.Id,
                    dichvu = new
                    {
                        id = dichVu.Id,
                        tendichvu = dichVu.Tendichvu,
                        mota = dichVu.Mota,
                        thoihan = dichVu.Thoihan,
                        phi = dichVu.Phi,
                        solandoipin = dichVu.Solandoipin
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi cập nhật gói dịch vụ: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // DELETE: api/payment/loggoi/{id} - Xóa gói dịch vụ (cho admin)
        [HttpDelete("loggoi/{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> DeleteDichVu(int id)
        {
            try
            {
                var dichVu = await _context.DichVus.FindAsync(id);
                if (dichVu == null)
                {
                    return NotFound(new { message = "Không tìm thấy gói dịch vụ" });
                }

                _context.DichVus.Remove(dichVu);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Xóa gói dịch vụ thành công" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi xóa gói dịch vụ: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
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

        // POST: api/payment/yeu-cau-ho-tro - Tạo yêu cầu hỗ trợ
        [HttpPost("yeu-cau-ho-tro")]
        [Authorize]
        public async Task<IActionResult> CreateYeuCauHoTro([FromBody] Dictionary<string, object> data)
        {
            try
            {
                // Lấy userId từ token
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                    ?? User.FindFirst("sub")?.Value;
                
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Không thể xác định người dùng" });
                }

                // Parse dữ liệu từ JSON
                string? moTa = null;
                int? idtramdoipin = null;
                int? idpin = null;
                int? idbooking = null;
                string doUuTien = "Trung bình";

                if (data.ContainsKey("mo_ta"))
                {
                    if (data["mo_ta"] is JsonElement moTaElement)
                        moTa = moTaElement.GetString();
                    else
                        moTa = data["mo_ta"]?.ToString();
                }

                if (string.IsNullOrEmpty(moTa))
                {
                    return BadRequest(new { message = "Mô tả sự cố không được để trống" });
                }

                if (data.ContainsKey("idtramdoipin") && data["idtramdoipin"] != null)
                {
                    if (data["idtramdoipin"] is JsonElement tramElement && tramElement.ValueKind == JsonValueKind.Number)
                        idtramdoipin = tramElement.GetInt32();
                    else if (int.TryParse(data["idtramdoipin"]?.ToString(), out int tramId))
                        idtramdoipin = tramId;
                }

                if (data.ContainsKey("idpin") && data["idpin"] != null)
                {
                    if (data["idpin"] is JsonElement pinElement && pinElement.ValueKind == JsonValueKind.Number)
                        idpin = pinElement.GetInt32();
                    else if (int.TryParse(data["idpin"]?.ToString(), out int pinId))
                        idpin = pinId;
                }

                if (data.ContainsKey("idbooking") && data["idbooking"] != null)
                {
                    if (data["idbooking"] is JsonElement bookingElement && bookingElement.ValueKind == JsonValueKind.Number)
                        idbooking = bookingElement.GetInt32();
                    else if (int.TryParse(data["idbooking"]?.ToString(), out int bookingId))
                        idbooking = bookingId;
                }

                if (data.ContainsKey("do_uu_tien"))
                {
                    if (data["do_uu_tien"] is JsonElement doUuTienElement)
                        doUuTien = doUuTienElement.GetString() ?? "Trung bình";
                    else
                        doUuTien = data["do_uu_tien"]?.ToString() ?? "Trung bình";
                }

                var yeuCau = new YeuCauHoTro
                {
                    Iduser = userId,
                    Idtramdoipin = idtramdoipin,
                    Idpin = idpin,
                    Idbooking = idbooking,
                    MoTa = moTa,
                    TrangThai = "Chờ xử lý",
                    DoUuTien = doUuTien,
                    NgayTao = DateTime.Now,
                    NgayXuLy = null
                };

                _context.YeuCauHoTros.Add(yeuCau);
                await _context.SaveChangesAsync();

                return Ok(new 
                { 
                    message = "Gửi yêu cầu hỗ trợ thành công",
                    id = yeuCau.Id,
                    yeuCau = new
                    {
                        id = yeuCau.Id,
                        iduser = yeuCau.Iduser,
                        idtramdoipin = yeuCau.Idtramdoipin,
                        idpin = yeuCau.Idpin,
                        idbooking = yeuCau.Idbooking,
                        mo_ta = yeuCau.MoTa,
                        trang_thai = yeuCau.TrangThai,
                        do_uu_tien = yeuCau.DoUuTien,
                        ngay_tao = yeuCau.NgayTao
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi tạo yêu cầu hỗ trợ: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                }
                
                // Trả về thông báo lỗi chi tiết hơn
                var errorMessage = ex.Message;
                if (ex.InnerException != null)
                {
                    errorMessage += $" | Chi tiết: {ex.InnerException.Message}";
                }
                
                return StatusCode(500, new { message = $"Lỗi server: {errorMessage}" });
            }
        }

        // GET: api/payment/yeu-cau-ho-tro/all - Lấy tất cả yêu cầu hỗ trợ (cho admin)
        [HttpGet("yeu-cau-ho-tro/all")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetAllYeuCauHoTro()
        {
            try
            {
                var yeuCaus = await _context.YeuCauHoTros
                    .OrderByDescending(y => y.NgayTao)
                    .ToListAsync();

                var data = yeuCaus.Select(y => new
                {
                    id = y.Id,
                    iduser = y.Iduser,
                    idtramdoipin = y.Idtramdoipin,
                    idpin = y.Idpin,
                    idbooking = y.Idbooking,
                    mo_ta = y.MoTa,
                    trang_thai = y.TrangThai,
                    do_uu_tien = y.DoUuTien,
                    phan_hoi = y.PhanHoi,
                    ngay_tao = y.NgayTao,
                    ngay_xu_ly = y.NgayXuLy
                }).ToList();

                return Ok(new { data = data });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi lấy danh sách yêu cầu hỗ trợ: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // GET: api/payment/yeu-cau-ho-tro/{id} - Lấy chi tiết yêu cầu hỗ trợ (admin có thể xem tất cả)
        [HttpGet("yeu-cau-ho-tro/{id}")]
        [Authorize]
        public async Task<IActionResult> GetYeuCauHoTroById(int id)
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                    ?? User.FindFirst("sub")?.Value;
                
                var isAdmin = User.IsInRole("admin");

                var yeuCau = await _context.YeuCauHoTros.FindAsync(id);
                if (yeuCau == null)
                {
                    return NotFound(new { message = "Không tìm thấy yêu cầu hỗ trợ" });
                }

                // Kiểm tra quyền: user chỉ xem được yêu cầu của mình, admin xem được tất cả
                if (!isAdmin)
                {
                    if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                    {
                        return Unauthorized(new { message = "Không thể xác định người dùng" });
                    }

                    if (yeuCau.Iduser != userId)
                    {
                        return Forbid("Bạn không có quyền xem yêu cầu này");
                    }
                }

                var data = new
                {
                    id = yeuCau.Id,
                    iduser = yeuCau.Iduser,
                    idtramdoipin = yeuCau.Idtramdoipin,
                    idpin = yeuCau.Idpin,
                    idbooking = yeuCau.Idbooking,
                    mo_ta = yeuCau.MoTa,
                    trang_thai = yeuCau.TrangThai,
                    do_uu_tien = yeuCau.DoUuTien,
                    phan_hoi = yeuCau.PhanHoi,
                    ngay_tao = yeuCau.NgayTao,
                    ngay_xu_ly = yeuCau.NgayXuLy
                };

                return Ok(data);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi lấy chi tiết yêu cầu hỗ trợ: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // PUT: api/payment/yeu-cau-ho-tro/{id}/phan-hoi - Cập nhật phản hồi (cho admin)
        [HttpPut("yeu-cau-ho-tro/{id}/phan-hoi")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> UpdatePhanHoi(int id, [FromBody] Dictionary<string, object> data)
        {
            try
            {
                var yeuCau = await _context.YeuCauHoTros.FindAsync(id);
                if (yeuCau == null)
                {
                    return NotFound(new { message = "Không tìm thấy yêu cầu hỗ trợ" });
                }

                // Lấy userId của admin từ token
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                    ?? User.FindFirst("sub")?.Value;
                
                int adminUserId = 0;
                if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out int parsedUserId))
                {
                    adminUserId = parsedUserId;
                }

                string? phanHoi = null;
                string? trangThai = null;

                if (data.ContainsKey("phan_hoi"))
                {
                    if (data["phan_hoi"] is JsonElement phanHoiElement)
                        phanHoi = phanHoiElement.GetString();
                    else
                        phanHoi = data["phan_hoi"]?.ToString();
                }

                if (data.ContainsKey("trang_thai"))
                {
                    if (data["trang_thai"] is JsonElement trangThaiElement)
                        trangThai = trangThaiElement.GetString();
                    else
                        trangThai = data["trang_thai"]?.ToString();
                }

                if (!string.IsNullOrEmpty(phanHoi))
                {
                    yeuCau.PhanHoi = phanHoi;
                    
                    // Tạo tin nhắn mới trong bảng tin_nhan_ho_tro
                    if (adminUserId > 0)
                    {
                        var tinNhan = new TinNhanHoTro
                        {
                            IdYeuCauHoTro = id,
                            IdUser = adminUserId,
                            NoiDung = phanHoi,
                            NgayGui = DateTime.Now
                        };
                        _context.TinNhanHoTros.Add(tinNhan);
                    }
                }

                if (!string.IsNullOrEmpty(trangThai))
                {
                    yeuCau.TrangThai = trangThai;
                }

                if (yeuCau.NgayXuLy == null && !string.IsNullOrEmpty(phanHoi))
                {
                    yeuCau.NgayXuLy = DateTime.Now;
                }

                await _context.SaveChangesAsync();

                var result = new
                {
                    id = yeuCau.Id,
                    iduser = yeuCau.Iduser,
                    idtramdoipin = yeuCau.Idtramdoipin,
                    idpin = yeuCau.Idpin,
                    idbooking = yeuCau.Idbooking,
                    mo_ta = yeuCau.MoTa,
                    trang_thai = yeuCau.TrangThai,
                    do_uu_tien = yeuCau.DoUuTien,
                    phan_hoi = yeuCau.PhanHoi,
                    ngay_tao = yeuCau.NgayTao,
                    ngay_xu_ly = yeuCau.NgayXuLy
                };

                return Ok(new { message = "Cập nhật phản hồi thành công", data = result });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi cập nhật phản hồi: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // PUT: api/payment/yeu-cau-ho-tro/update-pin/{oldIdpin} - Cập nhật idpin trong YeuCauHoTro
        [HttpPut("yeu-cau-ho-tro/update-pin/{oldIdpin}")]
        [Authorize(Roles = "staff")]
        public async Task<IActionResult> UpdateIdpinInYeuCauHoTro(int oldIdpin, [FromBody] Dictionary<string, object> data)
        {
            try
            {
                if (!data.ContainsKey("newIdpin"))
                {
                    return BadRequest(new { message = "Thiếu thông tin newIdpin" });
                }

                int newIdpin = 0;
                if (data["newIdpin"] is JsonElement newIdpinElement && newIdpinElement.ValueKind == JsonValueKind.Number)
                {
                    newIdpin = newIdpinElement.GetInt32();
                }
                else if (int.TryParse(data["newIdpin"]?.ToString(), out int parsedId))
                {
                    newIdpin = parsedId;
                }

                if (newIdpin <= 0)
                {
                    return BadRequest(new { message = "newIdpin không hợp lệ" });
                }

                // Tìm tất cả YeuCauHoTro có idpin = oldIdpin và cập nhật thành newIdpin
                var yeuCaus = await _context.YeuCauHoTros
                    .Where(y => y.Idpin == oldIdpin)
                    .ToListAsync();

                if (yeuCaus.Count == 0)
                {
                    return Ok(new { message = "Không có yêu cầu hỗ trợ nào có idpin này", updatedCount = 0 });
                }

                foreach (var yeuCau in yeuCaus)
                {
                    yeuCau.Idpin = newIdpin;
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = $"Đã cập nhật {yeuCaus.Count} yêu cầu hỗ trợ", updatedCount = yeuCaus.Count });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi khi cập nhật idpin trong YeuCauHoTro: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // GET: api/payment/yeu-cau-ho-tro/my - Lấy yêu cầu của user
        [HttpGet("yeu-cau-ho-tro/my")]
        [Authorize]
        public async Task<IActionResult> GetMyYeuCauHoTro([FromQuery] int? page = 1, [FromQuery] int? pageSize = 10)
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                    ?? User.FindFirst("sub")?.Value;
                
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Không thể xác định người dùng" });
                }

                var query = _context.YeuCauHoTros
                    .Where(y => y.Iduser == userId)
                    .OrderByDescending(y => y.NgayTao);

                var total = await query.CountAsync();
                var yeuCaus = await query
                    .Skip(((page ?? 1) - 1) * (pageSize ?? 10))
                    .Take(pageSize ?? 10)
                    .ToListAsync();

                // Map sang format snake_case để frontend dễ đọc
                var data = yeuCaus.Select(y => new
                {
                    id = y.Id,
                    iduser = y.Iduser,
                    idtramdoipin = y.Idtramdoipin,
                    idpin = y.Idpin,
                    idbooking = y.Idbooking,
                    mo_ta = y.MoTa,
                    trang_thai = y.TrangThai,
                    do_uu_tien = y.DoUuTien,
                    phan_hoi = y.PhanHoi,
                    ngay_tao = y.NgayTao,
                    ngay_xu_ly = y.NgayXuLy
                }).ToList();

                return Ok(new
                {
                    total = total,
                    page = page ?? 1,
                    pageSize = pageSize ?? 10,
                    totalPages = (int)Math.Ceiling(total / (double)(pageSize ?? 10)),
                    data = data
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi lấy yêu cầu hỗ trợ: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // POST: api/payment/tin-nhan-ho-tro - Gửi tin nhắn (nhận ten_nguoi_gui và loai_nguoi_gui từ frontend)
        [HttpPost("tin-nhan-ho-tro")]
        [Authorize]
        public async Task<IActionResult> GuiTinNhan([FromBody] Dictionary<string, object> data)
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                    ?? User.FindFirst("sub")?.Value;
                
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Không thể xác định người dùng" });
                }

                // Parse dữ liệu từ frontend
                int idYeuCauHoTro = 0;
                string? noiDung = null;

                if (data.ContainsKey("id_yeu_cau_ho_tro"))
                {
                    if (data["id_yeu_cau_ho_tro"] is JsonElement yeuCauElement && yeuCauElement.ValueKind == JsonValueKind.Number)
                        idYeuCauHoTro = yeuCauElement.GetInt32();
                    else if (int.TryParse(data["id_yeu_cau_ho_tro"]?.ToString(), out int yeuCauId))
                        idYeuCauHoTro = yeuCauId;
                }

                if (data.ContainsKey("noi_dung"))
                {
                    if (data["noi_dung"] is JsonElement noiDungElement)
                        noiDung = noiDungElement.GetString();
                    else
                        noiDung = data["noi_dung"]?.ToString();
                }

                if (idYeuCauHoTro <= 0)
                {
                    return BadRequest(new { message = "ID yêu cầu hỗ trợ không hợp lệ" });
                }

                if (string.IsNullOrEmpty(noiDung))
                {
                    return BadRequest(new { message = "Nội dung tin nhắn không được để trống" });
                }

                // Kiểm tra yêu cầu hỗ trợ
                var yeuCau = await _context.YeuCauHoTros.FindAsync(idYeuCauHoTro);
                if (yeuCau == null)
                {
                    return NotFound(new { message = "Không tìm thấy yêu cầu hỗ trợ" });
                }

                // Kiểm tra quyền (user chỉ gửi được cho yêu cầu của mình)
                if (yeuCau.Iduser != userId)
                {
                    return Forbid("Bạn không có quyền gửi tin nhắn cho yêu cầu này");
                }

                var tinNhan = new TinNhanHoTro
                {
                    IdYeuCauHoTro = idYeuCauHoTro,
                    IdUser = userId,
                    NoiDung = noiDung,
                    NgayGui = DateTime.Now
                };

                _context.TinNhanHoTros.Add(tinNhan);
                await _context.SaveChangesAsync();

                return Ok(new 
                { 
                    message = "Gửi tin nhắn thành công",
                    id = tinNhan.Id
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi gửi tin nhắn: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // GET: api/payment/tin-nhan-ho-tro/{idYeuCau} - Lấy danh sách tin nhắn (trả về id_user, frontend sẽ tự gọi DriverService để lấy tên và role)
        [HttpGet("tin-nhan-ho-tro/{idYeuCau}")]
        [Authorize]
        public async Task<IActionResult> GetTinNhanByYeuCau(int idYeuCau)
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                    ?? User.FindFirst("sub")?.Value;
                
                var isAdmin = User.IsInRole("admin");

                // Kiểm tra yêu cầu hỗ trợ
                var yeuCau = await _context.YeuCauHoTros.FindAsync(idYeuCau);
                if (yeuCau == null)
                {
                    return NotFound(new { message = "Không tìm thấy yêu cầu hỗ trợ" });
                }

                // Kiểm tra quyền: user chỉ xem được tin nhắn của yêu cầu mình, admin xem được tất cả
                if (!isAdmin)
                {
                    if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                    {
                        return Unauthorized(new { message = "Không thể xác định người dùng" });
                    }

                    if (yeuCau.Iduser != userId)
                    {
                        return Forbid("Bạn không có quyền xem tin nhắn của yêu cầu này");
                    }
                }

                var tinNhans = await _context.TinNhanHoTros
                    .Where(t => t.IdYeuCauHoTro == idYeuCau)
                    .OrderBy(t => t.NgayGui)
                    .ToListAsync();

                // Trả về với id_user, frontend sẽ tự gọi DriverService để lấy tên và role
                var data = tinNhans.Select(t => new
                {
                    id = t.Id,
                    id_yeu_cau_ho_tro = t.IdYeuCauHoTro,
                    id_user = t.IdUser,
                    noi_dung = t.NoiDung,
                    ngay_gui = t.NgayGui
                }).ToList();

                return Ok(new
                {
                    total = data.Count,
                    data = data
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi lấy tin nhắn: {ex.Message}");
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }
    }
}