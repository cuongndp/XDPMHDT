using System;
using System.Collections.Generic;

namespace DriverServices.Models;

public partial class TramDoiPinCache
{
    public int Id { get; set; }

    public string? TenTram { get; set; }

    public string? DiaChi { get; set; }

    public string? SoDienThoaiTd { get; set; }

    public string? GioMoCua { get; set; }

    public string? GioDongCua { get; set; }

    public string? TrangThai { get; set; }

    public string? TenLoaiPin { get; set; }

    public int? IdKho { get; set; }
}
