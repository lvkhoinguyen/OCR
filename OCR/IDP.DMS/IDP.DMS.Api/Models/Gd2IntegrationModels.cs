namespace IDP.DMS.Api.Models;

// ──────────────────────────────────────────────────────────────────────────
// Integration – API Keys, Webhooks, Sync Jobs, Integration Logs & Dashboard
// ──────────────────────────────────────────────────────────────────────────

public sealed record Gd2IntegrationSystemDto(
    string Code,
    string Name,
    string SystemType,
    string BaseUrl,
    string AuthMode,
    string Status,
    string CronExpression,
    DateTime LastSyncAt);

public sealed record Gd2ApiKeyDto(
    long Id,
    string ClientName,
    string SystemCode,
    string AuthMode,
    string KeyPreview,
    string Scopes,
    string Status,
    DateTime CreatedAt,
    DateTime? LastUsedAt);

public sealed record Gd2ApiKeyRequest(
    string ClientName,
    string SystemCode,
    string AuthMode,
    string Scopes);

public sealed record Gd2IntegrationLogDto(
    long Id,
    string Direction,
    string SystemCode,
    string Endpoint,
    string Method,
    int StatusCode,
    string Result,
    string RequestBody,
    string ResponseBody,
    DateTime CreatedAt,
    long? RetryOfId);

public sealed record Gd2WebhookEventRequest(
    string SystemCode,
    string EventType,
    string Payload,
    string? ApiKey);

public sealed record Gd2SyncJobRequest(
    string SystemCode,
    string DataType,
    string Trigger,
    string? CronExpression);

public sealed record Gd2IntegrationDashboardDto(
    IReadOnlyList<Gd2IntegrationSystemDto> Systems,
    IReadOnlyList<Gd2ApiKeyDto> ApiKeys,
    IReadOnlyList<Gd2IntegrationLogDto> Logs,
    long SuccessCount,
    long ErrorCount,
    DateTime GeneratedAt);
