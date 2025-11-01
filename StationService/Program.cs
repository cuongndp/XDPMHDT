
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StationService.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
var key = Encoding.ASCII.GetBytes("xay_dung_phan_men_huong_doi_tuong");
builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", builder =>
    {
        builder.WithOrigins("https://localhost:7210", "http://localhost:5000", "https://localhost:5000")
               .AllowAnyMethod()
               .AllowAnyHeader()
               .AllowCredentials();
    });
});
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<StationServiceContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
});
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = "ApiGateway",     // phải trùng với issuer ở DriverService
            ValidAudience = "DriveService",     // phải trùng với audience lúc phát token
            IssuerSigningKey = new SymmetricSecurityKey(key),
            NameClaimType = System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.UniqueName,
            RoleClaimType = "role",
            ClockSkew = TimeSpan.Zero
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
                // 2. Nếu không có header, đọc từ cookie access_token (cho driver)
                else if (context.Request.Cookies.ContainsKey("access_token"))
                {
                    context.Token = context.Request.Cookies["access_token"];
                }
                // 3. Nếu không có, đọc từ cookie staff_token (cho staff)
                else if (context.Request.Cookies.ContainsKey("staff_token"))
                {
                    context.Token = context.Request.Cookies["staff_token"];
                }
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services
    .AddAuthorizationBuilder()
    .AddPolicy("driver", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireRole("driver"); // trùng giá trị claim "role" trong JWT
    })
    .AddPolicy("staff", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireRole("staff"); // policy cho nhân viên
    });

var app = builder.Build();

// Tự động tạo database/bảng nếu chưa có (chạy trong container Docker)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<StationService.Models.StationServiceContext>();
    var retries = 0;
    while (true)
    {
        try
        {
            db.Database.Migrate();
            db.Database.EnsureCreated();
            break;
        }
        catch
        {
            if (retries++ >= 5) throw;
            Thread.Sleep(3000);
        }
    }
}

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

app.Run("http://0.0.0.0:5002");
