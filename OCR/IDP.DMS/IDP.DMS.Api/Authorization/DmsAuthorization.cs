using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace IDP.DMS.Api.Authorization;

public static class AuthorizationPolicies
{
    public const string DmsAccess = "DmsAccess";
}

public static class DmsPermissions
{
    public const string ClaimType = "permission";
    public const string All = "*";
    public const string Read = "DMS.READ";
    public const string Write = "DMS.WRITE";
    public const string Ocr = "DMS.OCR";
    public const string Submit = "DMS.SUBMIT";
    public const string Review = "DMS.REVIEW";
    public const string Approve = "DMS.APPROVE";
    public const string Publish = "DMS.PUBLISH";
    public const string Admin = "DMS.ADMIN";
}

public sealed class DmsPermissionRequirement : IAuthorizationRequirement;

public sealed class DmsPermissionHandler : AuthorizationHandler<DmsPermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        DmsPermissionRequirement requirement)
    {
        if (context.Resource is not HttpContext httpContext)
        {
            return Task.CompletedTask;
        }

        var permissions = context.User.FindAll(DmsPermissions.ClaimType)
            .Select(claim => claim.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (context.User.IsInRole("SYSTEM_ADMIN") ||
            context.User.IsInRole("ADMIN") ||
            permissions.Contains(DmsPermissions.All) ||
            permissions.Contains(DmsPermissions.Admin))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        var requiredPermissions = ResolveRequiredPermissions(httpContext.Request);
        if (requiredPermissions.Any(permissions.Contains))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }

    private static IReadOnlyList<string> ResolveRequiredPermissions(HttpRequest request)
    {
        if (HttpMethods.IsGet(request.Method) || HttpMethods.IsHead(request.Method))
        {
            return [DmsPermissions.Read];
        }

        var path = request.Path.Value?.ToLowerInvariant() ?? string.Empty;

        if (path.EndsWith("/initialize", StringComparison.Ordinal) ||
            path.Contains("/access-scopes", StringComparison.Ordinal) ||
            path.Contains("/security-policies", StringComparison.Ordinal) ||
            path.Contains("/resources/users", StringComparison.Ordinal) ||
            path.Contains("/resources/roles", StringComparison.Ordinal))
        {
            return [DmsPermissions.Admin];
        }

        if (path.Contains("/ocr", StringComparison.Ordinal) ||
            path.EndsWith("/upload", StringComparison.Ordinal) ||
            path.Contains("/digitize-metadata", StringComparison.Ordinal))
        {
            return [DmsPermissions.Ocr];
        }

        if (path.Contains("/publish", StringComparison.Ordinal) ||
            path.Contains("/sign", StringComparison.Ordinal))
        {
            return [DmsPermissions.Publish];
        }

        if (path.Contains("/workflow", StringComparison.Ordinal))
        {
            return [DmsPermissions.Submit, DmsPermissions.Review, DmsPermissions.Approve, DmsPermissions.Publish];
        }

        if (path.Contains("/borrow-requests", StringComparison.Ordinal) ||
            path.Contains("/borrow", StringComparison.Ordinal))
        {
            if (path.EndsWith("/approve", StringComparison.Ordinal) ||
                path.EndsWith("/handover", StringComparison.Ordinal) ||
                path.EndsWith("/return", StringComparison.Ordinal) ||
                path.EndsWith("/recall", StringComparison.Ordinal))
            {
                return [DmsPermissions.Write, DmsPermissions.Approve, DmsPermissions.Review];
            }

            return [DmsPermissions.Read, DmsPermissions.Write];
        }

        if (path.Contains("/review-", StringComparison.Ordinal) ||
            path.Contains("/review-content", StringComparison.Ordinal) ||
            path.Contains("/approve", StringComparison.Ordinal))
        {
            return [DmsPermissions.Review, DmsPermissions.Approve, DmsPermissions.Publish];
        }

        if (path.Contains("/dossiers", StringComparison.Ordinal) ||
            path.Contains("/documents", StringComparison.Ordinal))
        {
            return [DmsPermissions.Write, DmsPermissions.Approve, DmsPermissions.Publish, DmsPermissions.Review];
        }

        return [DmsPermissions.Write];
    }
}
