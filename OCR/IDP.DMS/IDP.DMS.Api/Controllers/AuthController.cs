using System.Security.Claims;
using IDP.DMS.Api.Models;
using IDP.DMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace IDP.DMS.Api.Controllers;

[ApiController]
[Route("api/auth")]
[Tags("Authentication")]
public sealed class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly AuthenticationBypassOptions _bypassOptions;
    private readonly IWebHostEnvironment _environment;

    public AuthController(
        AuthService authService,
        IOptions<AuthenticationBypassOptions> bypassOptions,
        IWebHostEnvironment environment)
    {
        _authService = authService;
        _bypassOptions = bypassOptions.Value;
        _environment = environment;
    }

    [AllowAnonymous]
    [HttpGet("configuration")]
    public ActionResult<AuthConfigurationDto> Configuration()
    {
        var enabled = IsBypassEnabled;
        return Ok(new AuthConfigurationDto(enabled, enabled ? _bypassOptions.ToUser() : null));
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<AuthTokenResponse>> Login([FromBody] LoginRequest request) =>
        Ok(await _authService.LoginAsync(request));

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<AuthUserDto>> Register([FromBody] RegisterRequest request)
    {
        var canAssignRole = User.IsInRole("SYSTEM_ADMIN") || User.IsInRole("ADMIN") ||
            User.HasClaim("permission", "DMS.ADMIN") || User.HasClaim("permission", "*");
        var user = await _authService.RegisterAsync(request, canAssignRole);
        return Created($"/api/auth/users/{user.Id}", user);
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthTokenResponse>> Refresh([FromBody] RefreshTokenRequest request) =>
        Ok(await _authService.RefreshAsync(request.RefreshToken));

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (IsBypassEnabled)
        {
            return BadRequest(new
            {
                message = "Không thể đổi mật khẩu khi chế độ bỏ qua đăng nhập đang bật."
            });
        }

        await _authService.ChangePasswordAsync(GetUserId(), request);
        return Ok(new { message = "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<AuthUserDto>> Me()
    {
        if (IsBypassEnabled)
        {
            return Ok(_bypassOptions.ToUser());
        }

        return Ok(await _authService.GetUserAsync(GetUserId()));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest? request)
    {
        if (IsBypassEnabled)
        {
            return NoContent();
        }

        await _authService.RevokeRefreshTokenAsync(GetUserId());
        return NoContent();
    }

    private bool IsBypassEnabled => _bypassOptions.IsActive(_environment);

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (!long.TryParse(value, out var userId))
        {
            throw new UnauthorizedAccessException("Token không chứa định danh người dùng hợp lệ.");
        }

        return userId;
    }
}
