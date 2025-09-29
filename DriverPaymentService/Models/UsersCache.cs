using System;
using System.Collections.Generic;

namespace DriverPaymentService.Models;

public partial class UsersCache
{
    public int Id { get; set; }

    public string? Name { get; set; }

    public string? Email { get; set; }

    public string? SoDienThoai { get; set; }
}
