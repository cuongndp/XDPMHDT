using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using BatteryAdminService.Models;
using System.Text;
using System.IdentityModel.Tokens.Jwt;

var builder = WebApplication.CreateBuilder(args);

// Key bí mật để ký và validate token
var key = Encoding.ASCII.GetBytes("xay_dung_phan_men_huong_doi_tuong");

// Add services to the container.
builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5001", "http://localhost:5000")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddDbContext<BatteryAdminDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// Add HttpClient để gọi DriverService
builder.Services.AddHttpClient();

// Cấu hình URL các service
// Kiểm tra xem có đang chạy trong Docker không
var isRunningInDocker = File.Exists("/.dockerenv") 
    || Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true";

// Nếu chạy trong Docker, dùng Docker service name; nếu không, dùng localhost
var driverServiceUrl = isRunningInDocker ? "http://driverservices:5004" : "http://localhost:5004";
var stationServiceUrl = isRunningInDocker ? "http://stationservice:5002" : "http://localhost:5002";
var paymentServiceUrl = isRunningInDocker ? "http://driverpaymentservice:5003" : "http://localhost:5003";

builder.Configuration["DriverServiceUrl"] = driverServiceUrl;
builder.Configuration["StationServiceUrl"] = stationServiceUrl;
builder.Configuration["PaymentServiceUrl"] = paymentServiceUrl;

// Log để debug
Console.WriteLine($"[BatteryAdminService] Running in Docker: {isRunningInDocker}");
Console.WriteLine($"[BatteryAdminService] DriverServiceUrl: {driverServiceUrl}");
Console.WriteLine($"[BatteryAdminService] StationServiceUrl: {stationServiceUrl}");
Console.WriteLine($"[BatteryAdminService] PaymentServiceUrl: {paymentServiceUrl}");

// Authentication với JWT cho Admin Service
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // dev có thể tắt HTTPS
    options.SaveToken = true;
    options.MapInboundClaims = false; // đọc chuẩn JWT, không map sang ClaimTypes.*
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,

        ValidIssuer = "ApiGateway", // 👈 Issuer giống các service khác
        ValidAudiences = new[] { "BatteryAdminService", "DriveService" }, // 👈 Chấp nhận cả Admin và Staff token
        IssuerSigningKey = new SymmetricSecurityKey(key),
        NameClaimType = JwtRegisteredClaimNames.UniqueName,
        RoleClaimType = "role"
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // 1. Ưu tiên đọc từ Authorization Header (Bearer token)
            var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
            {
                context.Token = authHeader.Substring("Bearer ".Length).Trim();
                Console.WriteLine($"[BatteryAdminService] Token received from Authorization header: {context.Token?.Substring(0, Math.Min(20, context.Token?.Length ?? 0))}...");
            }
            // 2. Nếu không có header, đọc từ cookie admin_token (cho admin)
            else if (context.Request.Cookies.ContainsKey("admin_token"))
            {
                context.Token = context.Request.Cookies["admin_token"];
                Console.WriteLine("[BatteryAdminService] Token received from admin_token cookie");
            }
            else
            {
                Console.WriteLine("[BatteryAdminService] No token found in Authorization header or cookies");
            }
            return Task.CompletedTask;
        },
        OnAuthenticationFailed = context =>
        {
            Console.WriteLine($"[BatteryAdminService] Authentication failed: {context.Exception.Message}");
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            var role = context.Principal?.Claims.FirstOrDefault(c => c.Type == "role")?.Value;
            Console.WriteLine($"[BatteryAdminService] Token validated. Role: {role}");
            return Task.CompletedTask;
        }
    };
});

// Authorization policies cho Admin
builder.Services
    .AddAuthorizationBuilder()
    .AddPolicy("admin", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireRole("admin");
    });

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run("http://0.0.0.0:5006");
