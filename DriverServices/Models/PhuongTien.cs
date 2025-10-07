using System;
using System.Collections.Generic;

namespace DriverServices.Models;

public partial class PhuongTien
{
    public int Id { get; set; }

    public string Tenphuongtien { get; set; } = null!;

    public string Bienso { get; set; } = null!;

    public int Iduser { get; set; }

    public int Idloaipin { get; set; }

    public virtual User IduserNavigation { get; set; } = null!;
}
