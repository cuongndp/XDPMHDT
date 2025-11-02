using System;
using System.Collections.Generic;

namespace BatteryAdminService.Models;

public partial class Pin
{
    public int Idpin { get; set; }

    public int Idloaipin { get; set; }

    public int? Idtram { get; set; }

    public float? Soh { get; set; }

    public float? Soc { get; set; }

    public string? Tinhtrang { get; set; }
}
