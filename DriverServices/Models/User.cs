using System;
using System.Collections.Generic;

namespace DriverServices.Models;

public partial class User
{
    public int Id { get; set; }

    public string? Name { get; set; }

    public string? Email { get; set; }

    public string? Password { get; set; }

    public int? Age { get; set; }

    public string? Role { get; set; }

    public string? SoDienThoai { get; set; }

    public string? GioiTinh { get; set; }

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual ICollection<PhuongTien> PhuongTiens { get; set; } = new List<PhuongTien>();
}
