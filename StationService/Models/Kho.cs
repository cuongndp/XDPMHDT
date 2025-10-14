using System;
using System.Collections.Generic;

namespace StationService.Models;

public partial class Kho
{
    public int Id { get; set; }

    public int Idloaipin { get; set; }

    public int? Soluong { get; set; }

    public int? Idtram { get; set; }

    public virtual LoaiPin IdloaipinNavigation { get; set; } = null!;

    public virtual TramDoiPin? IdtramNavigation { get; set; }
}
