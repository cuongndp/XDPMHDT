var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Cho phép truy cập trực tiếp vào các file HTML (phải đặt TRƯỚC UseStaticFiles)
app.UseDefaultFiles();

// Cho phép phục vụ file tĩnh từ wwwroot
app.UseStaticFiles();

app.Run("http://0.0.0.0:5001");
