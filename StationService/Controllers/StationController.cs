using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
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
        [HttpGet("themxe")]
        public IActionResult GetBatteryTypes()
        {
            var dsPin = _context.LoaiPins.ToList();
            return Ok(dsPin);
        }
    }
}
