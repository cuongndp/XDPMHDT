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

// Cấu hình URL DriverService
builder.Configuration["DriverServiceUrl"] = "http://driverservices:5004";

// Cấu hình URL StationService
builder.Configuration["StationServiceUrl"] = "http://stationservice:5002";

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
        ValidAudience = "BatteryAdminService", // 👈 Audience RIÊNG cho Admin Service
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
            }
            // 2. Nếu không có header, đọc từ cookie admin_token (cho admin)
            else if (context.Request.Cookies.ContainsKey("admin_token"))
            {
                context.Token = context.Request.Cookies["admin_token"];
            }
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
