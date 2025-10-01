using System;
using System.Collections.Generic;

namespace DriverServices.Models;

public partial class Booking
{
    public int Id { get; set; }

    public int? IdUser { get; set; }

    public int? IdLoaiPin { get; set; }

    public DateOnly? NgayDat { get; set; }

    public DateOnly? NgayHen { get; set; }

    public TimeOnly? GioHen { get; set; }

    public decimal? ChiPhi { get; set; }

    public string? TrangThai { get; set; }

    public string? TrangThaiThanhToan { get; set; }

    public string? PhuongThucThanhToan { get; set; }

    public virtual LoaiPin? IdLoaiPinNavigation { get; set; }

    public virtual User? IdUserNavigation { get; set; }
}
