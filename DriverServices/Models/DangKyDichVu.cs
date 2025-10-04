using System;
using System.Collections.Generic;

namespace DriverServices.Models;

public partial class DangKyDichVu
{
    public int Id { get; set; }

    public int Iduser { get; set; }

    public int Iddichvu { get; set; }

    public DateOnly? Ngaydangky { get; set; }

    public DateOnly? Ngayketthuc { get; set; }

    public string? Trangthai { get; set; }

    public int? Solandoipin { get; set; }

    public string? Phuongthucthanhtoan { get; set; }

    public string? Trangthaithanhtoan { get; set; }

    public virtual User IduserNavigation { get; set; } = null!;
}
