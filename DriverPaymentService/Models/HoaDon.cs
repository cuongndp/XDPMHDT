using System;
using System.Collections.Generic;

namespace DriverPaymentService.Models;

public partial class HoaDon
{
    public int Id { get; set; }

    public int? IdBooking { get; set; }

    public int? IdUser { get; set; }

    public int? IdLoaiPin { get; set; }

    public int? IdTramDoiPin { get; set; }

    public decimal? ChiPhi { get; set; }

    public DateOnly? NgayDoiPin { get; set; }
}
