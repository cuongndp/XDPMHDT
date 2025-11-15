using System;

namespace DriverPaymentService.Models;

public partial class TinNhanHoTro
{
    public int Id { get; set; }
    public int IdYeuCauHoTro { get; set; }
    public int IdUser { get; set; }
    public string NoiDung { get; set; } = null!;
    public DateTime NgayGui { get; set; } = DateTime.Now;
    
    // Navigation property
    public virtual YeuCauHoTro? YeuCauHoTro { get; set; }
}

