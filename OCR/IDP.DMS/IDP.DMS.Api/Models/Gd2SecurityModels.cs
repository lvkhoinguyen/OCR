namespace IDP.DMS.Api.Models;

// ──────────────────────────────────────────────────────────────────────────
// Security & Audit – Access Scopes, Security Policies/Labels, Audit Logs,
// Watermarks, Digital Signatures
// ──────────────────────────────────────────────────────────────────────────

public sealed record Gd2AccessScopeDto(
    long Id,
    string PrincipalType,
    string PrincipalCode,
    string UnitCode,
    string DepartmentCode,
    string RoleLevel,
    string ResourceCode,
    string Actions,
    string DataScope,
    string Status,
    DateTime UpdatedAt);

public sealed record Gd2AccessScopeRequest(
    string PrincipalType,
    string PrincipalCode,
    string UnitCode,
    string? DepartmentCode,
    string RoleLevel,
    string ResourceCode,
    string Actions,
    string DataScope,
    string? Status,
    string? ActorRoleLevel);

public sealed record Gd2SecurityPolicyDto(
    string Code,
    string Name,
    string Category,
    string Severity,
    string Status,
    string Description);

public sealed record Gd2SecurityLabelDto(
    string EntityType,
    long EntityId,
    string SecurityLevel,
    string Label,
    string Color,
    bool Sensitive,
    bool EncryptionRequired,
    string UpdatedBy,
    DateTime UpdatedAt);

public sealed record Gd2SecurityLabelRequest(
    string EntityType,
    long EntityId,
    string SecurityLevel,
    string Actor,
    string? UnitCode,
    string? Reason);

public sealed record Gd2WatermarkDto(
    string Text,
    string Viewer,
    string IpAddress,
    DateTime ViewedAt,
    string SecurityLevel,
    bool Required);

public sealed record Gd2AuditLogDto(
    long Id,
    string Action,
    string EntityType,
    long EntityId,
    string Actor,
    string UnitCode,
    string DepartmentCode,
    string RoleLevel,
    string Result,
    string? Detail,
    DateTime CreatedAt);

public sealed record Gd2AuditLogRequest(
    string Action,
    string EntityType,
    long EntityId,
    string Actor,
    string? UnitCode,
    string? DepartmentCode,
    string? RoleLevel,
    string? Detail);

public sealed record Gd2AuditDashboardDto(
    long TotalAccess,
    long TotalExports,
    long FailedLogins,
    long SensitiveViews,
    long BulkDownloadAlerts,
    IReadOnlyList<Gd2AuditLogDto> RecentLogs,
    IReadOnlyList<Gd2AuditAlertDto> Alerts,
    DateTime GeneratedAt);

public sealed record Gd2AuditAlertDto(
    string Code,
    string Severity,
    string Title,
    string Detail,
    DateTime CreatedAt);

public sealed record Gd2SignatureZoneDto(
    int Page,
    decimal X,
    decimal Y,
    decimal Width,
    decimal Height);

public sealed record Gd2DigitalSignatureRequest(
    long DocumentId,
    string Signer,
    string Provider,
    string CertificateSerial,
    string? Pin,
    string? Otp,
    Gd2SignatureZoneDto Zone,
    string? AppearanceText,
    string? UnitCode);

public sealed record Gd2DigitalSignatureDto(
    long Id,
    long DocumentId,
    string DocumentCode,
    string DocumentTitle,
    string Signer,
    string Provider,
    string CertificateSubject,
    string CertificateSerial,
    DateTime ValidFrom,
    DateTime ValidTo,
    DateTime SignedAt,
    DateTime TimestampAt,
    string OcspStatus,
    string CrlStatus,
    string ValidationStatus,
    Gd2SignatureZoneDto Zone,
    string AppearanceText);

public sealed record Gd2SignatureValidationDto(
    long DocumentId,
    string DocumentCode,
    bool Valid,
    string Badge,
    IReadOnlyList<Gd2DigitalSignatureDto> Signatures,
    DateTime CheckedAt);
