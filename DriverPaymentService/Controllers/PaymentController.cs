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
    }
}