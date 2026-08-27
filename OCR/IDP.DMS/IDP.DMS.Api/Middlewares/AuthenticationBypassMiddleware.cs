using System.Security.Claims;
using IDP.DMS.Api.Authorization;
using IDP.DMS.Api.Models;
using Microsoft.Extensions.Options;

namespace IDP.DMS.Api.Middlewares;

public sealed class AuthenticationBypassMiddleware
{
    private readonly RequestDelegate _next;

    public AuthenticationBypassMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(
        HttpContext context,
        IOptions<AuthenticationBypassOptions> options,
        IWebHostEnvironment environment)
    {
        var settings = options.Value;
        if (settings.IsActive(environment) && context.User.Identity?.IsAuthenticated != true)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "0"),
                new Claim(ClaimTypes.Name, settings.FullName),
                new Claim(ClaimTypes.Role, settings.RoleCode),
                new Claim("preferred_username", settings.Username),
                new Claim(DmsPermissions.ClaimType, DmsPermissions.All)
            };
            context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "DevelopmentBypass"));
            context.Response.Headers["X-IDP-DMS-Auth-Bypass"] = "enabled";
        }

        await _next(context);
    }
}
