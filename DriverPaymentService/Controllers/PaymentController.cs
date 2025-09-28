using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DriverPaymentService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetPayments()
        {
            var list = new List<DriverPayment>
            {
                new DriverPayment { Id = 1, DriverName = "Nguyen Van A", Amount = 1000 },
                new DriverPayment { Id = 2, DriverName = "Tran Van B", Amount = 2000 },
                new DriverPayment { Id = 3, DriverName = "Le Van C", Amount = 1500 }
            };

            return Ok(list);
        }
    }
}
