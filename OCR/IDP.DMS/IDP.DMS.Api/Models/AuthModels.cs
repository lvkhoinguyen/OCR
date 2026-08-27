using System.ComponentModel.DataAnnotations;

namespace IDP.DMS.Api.Models;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; init; } = "IDP.DMS.Api";
    public string Audience { get; init; } = "IDP.DMS.Client";
    public string SigningKey { get; init; } = string.Empty;
    public int AccessTokenHours { get; init; } = 8;
    public int RefreshTokenDays { get; init; } = 30;
}

public sealed class AuthenticationBypassOptions
{
    public const string SectionName = "AuthenticationBypass";

    public bool Enabled { get; init; }
    public bool DevelopmentOnly { get; init; } = true;
    public string Username { get; init; } = "dev-admin";
    public string FullName { get; init; } = "Quản trị phát triển";
    public string Email { get; init; } = "dev-admin@idp.local";
    public string RoleCode { get; init; } = "SYSTEM_ADMIN";
    public string RoleName { get; init; } = "Quản trị hệ thống (Bypass)";

    public bool IsActive(IHostEnvironment environment) =>
        Enabled && (!DevelopmentOnly || environment.IsDevelopment());

    public AuthUserDto ToUser() => new(
        0,
        Username,
        FullName,
        Email,
        RoleCode,
        RoleName,
        ["*"]);
}

public sealed record AuthConfigurationDto(
    bool BypassEnabled,
    AuthUserDto? User);

public sealed record LoginRequest(
    [property: Required, StringLength(80)] string Username,
    [property: Required] string Password);

public sealed record RegisterRequest(
    [property: Required, StringLength(80, MinimumLength = 3)] string Username,
    [property: Required, StringLength(200, MinimumLength = 8)] string Password,
    [property: Required, StringLength(255)] string FullName,
    [property: EmailAddress, StringLength(255)] string? Email,
    [property: StringLength(80)] string? RoleCode);

public sealed record RefreshTokenRequest([property: Required] string RefreshToken);

public sealed record ChangePasswordRequest(
    [property: Required] string CurrentPassword,
    [property: Required, StringLength(200, MinimumLength = 8)] string NewPassword);

public sealed record LogoutRequest(string? RefreshToken);

public sealed record AuthUserDto(
    long Id,
    string Username,
    string FullName,
    string? Email,
    string RoleCode,
    string RoleName,
    IReadOnlyList<string> Permissions);

public sealed record AuthTokenResponse(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    DateTime RefreshTokenExpiresAt,
    AuthUserDto User);

internal sealed record AuthUserRecord(
    long Id,
    string Username,
    string PasswordHash,
    string FullName,
    string? Email,
    string Status,
    long RoleId,
    string RoleCode,
    string RoleName,
    string Permissions,
    string? RefreshTokenHash,
    DateTime? RefreshTokenExpiresAt);
