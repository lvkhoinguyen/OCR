using IDP.DMS.Api.Services;
using Oracle.ManagedDataAccess.Client;

namespace IDP.DMS.Api.Middlewares
{
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;

        public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (BusinessRuleException exception)
            {
                _logger.LogWarning("Business rule violation on {Method} {Path}: {Message}",
                    context.Request.Method, context.Request.Path, exception.Message);
                context.Response.StatusCode = StatusCodes.Status422UnprocessableEntity;
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "BUSINESS_RULE_VIOLATION",
                    message = exception.Message
                });
            }
            catch (OracleException exception) when (exception.Number == 1)
            {
                _logger.LogWarning("Oracle unique constraint violation on {Method} {Path}",
                    context.Request.Method, context.Request.Path);
                context.Response.StatusCode = StatusCodes.Status422UnprocessableEntity;
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "BUSINESS_RULE_VIOLATION",
                    message = "Dữ liệu đã tồn tại, vui lòng kiểm tra mã trước khi lưu."
                });
            }
            catch (UnauthorizedAccessException exception)
            {
                _logger.LogWarning("Unauthorized access on {Method} {Path}: {Message}",
                    context.Request.Method, context.Request.Path, exception.Message);
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "UNAUTHORIZED",
                    message = exception.Message
                });
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Unhandled exception on {Method} {Path}",
                    context.Request.Method, context.Request.Path);
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "INTERNAL_SERVER_ERROR",
                    message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại hoặc liên hệ quản trị viên."
                });
            }
        }
    }

    public static class GlobalExceptionMiddlewareExtensions
    {
        public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<GlobalExceptionMiddleware>();
        }
    }
}
