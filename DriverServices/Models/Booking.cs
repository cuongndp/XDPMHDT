using System;
using System.Collections.Generic;

namespace DriverServices.Models;

public partial class Booking
{
    public int Id { get; set; }

    public int Iduser { get; set; }

    public int Idloaipin { get; set; }

    public DateOnly? Ngaydat { get; set; }

    public DateOnly? Ngayhen { get; set; }

    public TimeOnly? Giohen { get; set; }

    public int? Chiphi { get; set; }

    public string? Trangthaithanhtoan { get; set; }

    public string? Trangthai { get; set; }

    public string? Phuongthucthanhtoan { get; set; }

    public int? Idtram { get; set; }

    public virtual User IduserNavigation { get; set; } = null!;
}
