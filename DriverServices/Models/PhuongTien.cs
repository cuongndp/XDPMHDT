using System;
using System.Collections.Generic;

namespace DriverServices.Models;

public partial class PhuongTien
{
    public int Id { get; set; }

    public string? TenPhuongTien { get; set; }

    public string? BienSo { get; set; }

    public int? IdUser { get; set; }

    public int? IdLoaiPin { get; set; }

    public virtual LoaiPin? IdLoaiPinNavigation { get; set; }

    public virtual User? IdUserNavigation { get; set; }
}
