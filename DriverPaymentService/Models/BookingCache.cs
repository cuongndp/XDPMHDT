using System;
using System.Collections.Generic;

namespace DriverPaymentService.Models;

public partial class BookingCache
{
    public int Id { get; set; }

    public int? IdUser { get; set; }

    public int? IdLoaiPin { get; set; }

    public decimal? ChiPhi { get; set; }

    public string? TrangThai { get; set; }

    public string? TrangThaiThanhToan { get; set; }

    public string? PhuongThucThanhToan { get; set; }
}
