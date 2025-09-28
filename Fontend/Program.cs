var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// cho phép phục vụ file tĩnh từ wwwroot
app.UseDefaultFiles();   // tự tìm index.html
app.UseStaticFiles();

app.Run();
