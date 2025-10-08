using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
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
    }

}
