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

    public double? Latitude { get; set; }

    public double? Longitude { get; set; }

    public virtual ICollection<Kho> Khos { get; set; } = new List<Kho>();
}
