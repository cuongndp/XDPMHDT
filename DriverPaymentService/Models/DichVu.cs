using System;
using System.Collections.Generic;

namespace DriverPaymentService.Models;

public partial class DichVu
{
    public int Id { get; set; }

    public string Tendichvu { get; set; } = null!;

    public string? Mota { get; set; }

    public int? Thoihan { get; set; }

    public decimal Phi { get; set; }

    public string? Solandoipin { get; set; }
}
