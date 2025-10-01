using System;
using System.Collections.Generic;

namespace DriverServices.Models;

public partial class LoaiPin
{
    public int Id { get; set; }

    public string? TenLoaiPin { get; set; }

    public int? DienAp { get; set; }

    public int? CongSuat { get; set; }

    public decimal? GiaDoiPin { get; set; }

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual ICollection<PhuongTien> PhuongTiens { get; set; } = new List<PhuongTien>();
}
