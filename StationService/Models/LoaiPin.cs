using System;
using System.Collections.Generic;

namespace StationService.Models;

public partial class LoaiPin
{
    public int Id { get; set; }

    public string Tenloaipin { get; set; } = null!;

    public int? Dienap { get; set; }

    public int? Congsuat { get; set; }

    public int? Giadoipin { get; set; }

    public virtual ICollection<Kho> Khos { get; set; } = new List<Kho>();
}
