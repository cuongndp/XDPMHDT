using DriverPaymentService.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

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
        [HttpGet]
        public IActionResult GetUsers()
        {
            var users = _context.HoaDons.ToList();
            return Ok(users);
        }

    }
}
