using System;
using System.Collections.Generic;

namespace StationService.Models;

public partial class TramDoiPin
{
    public int Id { get; set; }

    public string Tentram { get; set; } = null!;

    public string Diachi { get; set; } = null!;

    public string? Sodienthoaitd { get; set; }

    public TimeOnly? Giomocua { get; set; }

    public TimeOnly? Giodongcua { get; set; }

    public string? Trangthai { get; set; }

    public string? Tenloaipin { get; set; }

    public int? Idkho { get; set; }

    public virtual Kho? IdkhoNavigation { get; set; }
}
