using System;
using System.Collections.Generic;

namespace DriverPaymentService.Models;

public partial class HoaDon
{
    public int Id { get; set; }

    public int? Idbooking { get; set; }

    public int Iduser { get; set; }

    public int? Idloaipin { get; set; }

    public int? Idtramdoipin { get; set; }

    public int Chiphi { get; set; }

    public DateOnly? Ngaydoipin { get; set; }
}
