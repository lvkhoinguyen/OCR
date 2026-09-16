using IDP.DMS.Api.Middlewares;
using IDP.DMS.Api.Services;
using IDP.DMS.Api.Authorization;
using IDP.DMS.Api.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Không phụ thuộc Windows Event Log: tài khoản chạy dịch vụ/demo có thể không có quyền ghi Event Log.
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

// 1. Cấu hình CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactDev", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithExposedHeaders("X-OCR-Page", "X-OCR-Page-Count", "X-OCR-Image-Width", "X-OCR-Image-Height", "X-OCR-Source-File");
    });
});

// 2. Đăng ký Services & Business Logic (Dependency Injection)
builder.Services.AddHttpClient("Gemini");
builder.Services.AddSingleton<UiDesignService>();
builder.Services.AddSingleton<OcrService>();
builder.Services.AddSingleton<Gd2BusinessService>();
builder.Services.AddScoped<OracleDmsService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<PdfSigningService>();
builder.Services.AddScoped<BatchImportService>();
builder.Services.AddSingleton<BatchOcrQueue>();
builder.Services.AddHostedService<BatchOcrWorker>();

// Prevent a BackgroundService crash (e.g. BatchOcrWorker when Oracle tables missing)
// from taking down the entire host.
builder.Services.Configure<HostOptions>(opts =>
    opts.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore);
builder.Services.Configure<AuthenticationBypassOptions>(
    builder.Configuration.GetSection(AuthenticationBypassOptions.SectionName));

var jwtSection = builder.Configuration.GetSection(JwtOptions.SectionName);
builder.Services.Configure<JwtOptions>(jwtSection);
var jwtOptions = jwtSection.Get<JwtOptions>()
    ?? throw new InvalidOperationException("Thiếu cấu hình Jwt.");
if (string.IsNullOrWhiteSpace(jwtOptions.SigningKey) || jwtOptions.SigningKey.Length < 32)
{
    throw new InvalidOperationException("Jwt:SigningKey phải có ít nhất 32 ký tự.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = System.Security.Claims.ClaimTypes.Name,
            RoleClaimType = System.Security.Claims.ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AuthorizationPolicies.DmsAccess, policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.AddRequirements(new DmsPermissionRequirement());
    });
});
builder.Services.AddSingleton<IAuthorizationHandler, DmsPermissionHandler>();

// 3. Đăng ký Controllers theo chuẩn MVC
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập JWT access token."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme
        {
            Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
        }] = Array.Empty<string>()
    });
});

var app = builder.Build();

var authenticationBypass = app.Services
    .GetRequiredService<Microsoft.Extensions.Options.IOptions<AuthenticationBypassOptions>>()
    .Value;
if (authenticationBypass.IsActive(app.Environment))
{
    app.Logger.LogWarning(
        "AUTHENTICATION BYPASS IS ENABLED. Requests without JWT run as {RoleCode}; only use this setting for development.",
        authenticationBypass.RoleCode);
}

// 4. Cấu hình HTTP Request Pipeline & Middlewares
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("ReactDev");

// Sử dụng Global Exception Middleware chuẩn MVC
app.UseGlobalExceptionHandler();
app.UseAuthentication();
app.UseMiddleware<AuthenticationBypassMiddleware>();
app.UseAuthorization();

// Mapping Controllers
app.MapControllers();

app.MapGet("/", () => Results.Redirect("/swagger"));

app.Run();
