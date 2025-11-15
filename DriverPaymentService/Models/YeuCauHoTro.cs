using System;

namespace DriverPaymentService.Models;

public partial class YeuCauHoTro
{
    public int Id { get; set; }
    public int Iduser { get; set; }
    public int? Idtramdoipin { get; set; }
    public int? Idpin { get; set; }
    public int? Idbooking { get; set; }
    public string MoTa { get; set; } = null!;
    public string TrangThai { get; set; } = "Chờ xử lý";
    public string DoUuTien { get; set; } = "Trung bình";
    public string? PhanHoi { get; set; }
    public DateTime NgayTao { get; set; } = DateTime.Now;
    public DateTime? NgayXuLy { get; set; }
}

