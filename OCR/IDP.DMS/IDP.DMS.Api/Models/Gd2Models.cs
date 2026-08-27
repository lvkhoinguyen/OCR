namespace IDP.DMS.Api.Models;

// ──────────────────────────────────────────────────────────────────────────
// GD2 Business Models – Search, Export, Reports, Notifications, Borrow,
// Unit Customization, Shared Dossier Types, Supplement Guides, Overview.
//
// Liên quan: Gd2WorkflowModels.cs | Gd2OcrModels.cs |
//            Gd2IntegrationModels.cs | Gd2SecurityModels.cs
// ──────────────────────────────────────────────────────────────────────────

// ─── Document Search & Export ────────────────────────────────────────────

public sealed record Gd2DocumentSearchRequest(
    string? Query,
    string? Metadata,
    string? DocumentType,
    string? Status,
    string? OcrStatus,
    DateTime? FromDate,
    DateTime? ToDate,
    long? DossierId,
    long? StorageId,
    int Page,
    int PageSize);

public sealed record Gd2DocumentSearchResult(
    IReadOnlyList<DocumentDto> Items,
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages,
    DateTime IndexedAt);

public sealed record Gd2DocumentTreeNodeDto(
    string Id,
    string Name,
    string Type,
    long? ReferenceId,
    int Count,
    IReadOnlyList<Gd2DocumentTreeNodeDto> Children);

public sealed record Gd2DocumentExportResult(
    string Format,
    string FileName,
    int ItemCount,
    DateTime CreatedAt);

public sealed record Gd2DocumentExportRequest(
    string? Format,
    IReadOnlyList<long>? DocumentIds);

// ─── Reports ────────────────────────────────────────────────────────────

public sealed record ReportConfigRequest(
    string Code,
    string Name,
    string DataType,
    string TemplateFileName,
    string? Parameters,
    string? Status);

public sealed record ReportConfigDto(
    long Id,
    string Code,
    string Name,
    string DataType,
    string TemplateFileName,
    string? Parameters,
    string Status,
    DateTime CreatedAt);

public sealed record ReportSummaryRow(
    string Key,
    string Indicator,
    long Quantity,
    decimal Rate);

public sealed record ReportSummaryDto(
    IReadOnlyList<ReportSummaryRow> Rows,
    DateTime GeneratedAt);

public sealed record ReportRunRequest(
    string ReportCode,
    string DataType,
    string Format,
    string Actor,
    string? UnitCode,
    string? Parameters);

public sealed record ReportRunDto(
    long Id,
    string ReportCode,
    string DataType,
    string Format,
    string Actor,
    string? UnitCode,
    string? Parameters,
    string Status,
    long RowCount,
    DateTime CreatedAt);

public sealed record Gd2KpiCardDto(
    string Code,
    string Label,
    decimal Value,
    string Unit,
    decimal ChangePercent,
    string Status);

public sealed record Gd2ChartPointDto(
    string Label,
    decimal Value,
    string Category,
    string Color);

public sealed record Gd2EmployeePerformanceDto(
    string EmployeeCode,
    string EmployeeName,
    string Department,
    long ProcessedDossiers,
    decimal AverageHours,
    decimal OnTimeRate,
    string RankLabel);

public sealed record Gd2ExecutiveDashboardDto(
    IReadOnlyList<Gd2KpiCardDto> Kpis,
    IReadOnlyList<Gd2ChartPointDto> NewDossierTrend,
    IReadOnlyList<Gd2ChartPointDto> ApprovalSlaPie,
    IReadOnlyList<Gd2ChartPointDto> BorrowReturnTrend,
    IReadOnlyList<Gd2EmployeePerformanceDto> PerformanceRanking,
    string Department,
    string DossierType,
    DateTime? FromDate,
    DateTime? ToDate,
    DateTime GeneratedAt);

// ─── Notifications ───────────────────────────────────────────────────────

public sealed record NotificationDto(
    long Id,
    string Code,
    string EntityType,
    long EntityId,
    string Recipient,
    string Channel,
    string Title,
    string? Content,
    string Status,
    DateTime? SentAt,
    DateTime? ReadAt,
    DateTime CreatedAt);

// ─── Supplement Guides (Phiếu hướng dẫn bổ sung) ───────────────────────

public sealed record SupplementTemplateDto(
    string Code,
    string Title,
    string Content,
    string Severity);

public sealed record SupplementGuideRequest(
    long DossierId,
    string Actor,
    string Recipient,
    string TemplateCode,
    string Reason,
    string? UnitCode,
    IReadOnlyList<string>? MissingItems);

public sealed record SupplementGuideDto(
    long Id,
    long DossierId,
    string DossierCode,
    string GuideCode,
    string TemplateCode,
    string Reason,
    IReadOnlyList<string> MissingItems,
    string Content,
    string Actor,
    string Recipient,
    string Status,
    DateTime CreatedAt);

// ─── System Data Summary ─────────────────────────────────────────────────

public sealed record SystemDataSourceDto(
    string Code,
    string Name,
    long RecordCount,
    string Status);

public sealed record SystemDataSummaryDto(
    IReadOnlyList<SystemDataSourceDto> Sources,
    long TotalRecords,
    DateTime CheckedAt);

// ─── Unit Customization ──────────────────────────────────────────────────

public sealed record Gd2UnitWorkflowStepDto(
    string Code,
    string Name,
    string Role,
    bool Required,
    bool Enabled,
    int Order,
    string Description);

public sealed record Gd2UnitCustomizationDto(
    string UnitCode,
    string UnitName,
    string LogoUrl,
    string BannerText,
    string PrimaryColor,
    string AccentColor,
    string LayoutMode,
    bool MobileOptimized,
    IReadOnlyList<Gd2UnitWorkflowStepDto> WorkflowSteps,
    string UpdatedBy,
    DateTime UpdatedAt);

public sealed record Gd2UnitCustomizationRequest(
    string UnitCode,
    string UnitName,
    string? LogoUrl,
    string? BannerText,
    string PrimaryColor,
    string AccentColor,
    string LayoutMode,
    bool MobileOptimized,
    IReadOnlyList<Gd2UnitWorkflowStepDto>? WorkflowSteps,
    string Actor);

// ─── Shared Dossier Types ────────────────────────────────────────────────

public sealed record Gd2SharedDossierTypeDto(
    long Id,
    string Code,
    string Name,
    string MasterUnitCode,
    string StorageScope,
    string Status,
    IReadOnlyList<string> SharedUnitCodes,
    DateTime UpdatedAt);

public sealed record Gd2SharedDossierTypeRequest(
    string Code,
    string Name,
    string UnitCode,
    string StorageScope,
    IReadOnlyList<string>? SharedUnitCodes,
    string Actor);

public sealed record Gd2DeduplicationCandidateDto(
    long Id,
    string Code,
    string Name,
    string MasterUnitCode,
    string MatchReason,
    decimal Similarity,
    IReadOnlyList<string> SharedUnitCodes);

public sealed record Gd2DeduplicationCheckRequest(
    string Code,
    string Name,
    string UnitCode,
    string StorageScope);

public sealed record Gd2DeduplicationCheckResult(
    bool DuplicateFound,
    Gd2DeduplicationCandidateDto? MasterRecord,
    string Recommendation,
    DateTime CheckedAt);

public sealed record Gd2ShareAccessRequest(
    long MasterRecordId,
    IReadOnlyList<string> UnitCodes,
    string Actor,
    string? Reason);

public sealed record Gd2ShareAccessResult(
    Gd2SharedDossierTypeDto MasterRecord,
    IReadOnlyList<string> AddedUnitCodes,
    string Message,
    DateTime SharedAt);

// ─── Archive Dossiers & Borrow Flow ─────────────────────────────────────

public sealed record Gd2ArchiveDossierDto(
    long Id,
    string Code,
    string Title,
    string DossierType,
    string StorageLocation,
    string SecurityLevel,
    string BorrowCondition,
    bool AllowOnlineRead,
    bool AllowSoftCopy,
    bool AllowHardCopy,
    int MaxHardCopyBorrowDays,
    string Status,
    DateTime UpdatedAt);

public sealed record Gd2ArchiveDossierRequest(
    string Code,
    string Title,
    string DossierType,
    string StorageLocation,
    string SecurityLevel,
    string BorrowCondition,
    bool AllowOnlineRead,
    bool AllowSoftCopy,
    bool AllowHardCopy,
    int MaxHardCopyBorrowDays,
    string Actor);

public sealed record Gd2BorrowFlowDto(
    long Id,
    long DossierId,
    string DossierCode,
    string DossierTitle,
    string Borrower,
    string ExploitMode,
    string Status,
    DateTime RequestedAt,
    DateTime BorrowFrom,
    DateTime DueDate,
    DateTime? ApprovedAt,
    DateTime? HandoverAt,
    DateTime? ReturnedAt,
    string? Approver,
    string? AccessLink,
    string Note,
    bool Overdue);

public sealed record Gd2BorrowRegistrationRequest(
    long DossierId,
    string Borrower,
    string ExploitMode,
    DateTime BorrowFrom,
    int? RequestedDays,
    string Purpose,
    string Actor);

public sealed record Gd2BorrowActionRequest(
    string Actor,
    string? Note);

public sealed record Gd2DossierBorrowDashboardDto(
    IReadOnlyList<Gd2ArchiveDossierDto> Dossiers,
    IReadOnlyList<Gd2BorrowFlowDto> BorrowRequests,
    long PendingCount,
    long ApprovedNotReturnedCount,
    long OverdueCount,
    long ReturnedCount,
    DateTime GeneratedAt);

// ─── Business Overview ───────────────────────────────────────────────────

public sealed record Gd2BusinessOverviewDto(
    IReadOnlyList<DossierDto> Dossiers,
    IReadOnlyList<DocumentDto> Documents,
    IReadOnlyList<NotificationDto> Notifications,
    IReadOnlyList<Gd2AuditLogDto> AuditLogs,
    IReadOnlyList<Gd2AccessScopeDto> AccessScopes,
    IReadOnlyList<Gd2SecurityPolicyDto> SecurityPolicies,
    SystemDataSummaryDto SystemData,
    DateTime GeneratedAt);
