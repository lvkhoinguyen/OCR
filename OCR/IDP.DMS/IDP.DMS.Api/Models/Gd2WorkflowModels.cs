namespace IDP.DMS.Api.Models;

// ──────────────────────────────────────────────────────────────────────────
// Workflow – Transitions, Events, Definitions, Status
// ──────────────────────────────────────────────────────────────────────────

public sealed record WorkflowTransitionRequest(
    string EntityType,
    long EntityId,
    string Action,
    string Actor,
    string? UnitCode,
    string? Comment,
    string? Recipient);

public sealed record WorkflowTransitionResult(
    string EntityType,
    long EntityId,
    string PreviousStatus,
    string CurrentStatus,
    string Action,
    DateTime ProcessedAt);

public sealed record OcrWorkflowSubmissionResult(
    long DocumentId,
    long DossierId,
    string PreviousDocumentStatus,
    string DocumentStatus,
    string PreviousDossierStatus,
    string DossierStatus,
    DateTime ProcessedAt);

public sealed record WorkflowDraftSeedResult(
    long DossierId,
    string DossierCode,
    long DocumentId,
    string DocumentCode,
    string Status,
    DateTime CreatedAt);

public sealed record WorkflowEventDto(
    long Id,
    string EntityType,
    long EntityId,
    string Action,
    string? FromStatus,
    string ToStatus,
    string? Comment,
    string Actor,
    string? UnitCode,
    DateTime CreatedAt);

public sealed record WorkflowStepDto(
    string Code,
    string Name,
    string Role,
    int Order,
    int DeadlineHours,
    IReadOnlyList<string> Actions,
    string Description);

public sealed record WorkflowDefinitionDto(
    string Code,
    string Name,
    string EntityType,
    IReadOnlyList<WorkflowStepDto> Steps,
    DateTime UpdatedAt);

public sealed record WorkflowRuntimeStepDto(
    string Code,
    string Name,
    string Role,
    string Assignee,
    DateTime Deadline,
    string State);

public sealed record WorkflowStatusDto(
    string EntityType,
    long EntityId,
    string CurrentStatus,
    string CurrentStepCode,
    string CurrentAssignee,
    DateTime Deadline,
    IReadOnlyList<WorkflowRuntimeStepDto> Steps,
    IReadOnlyList<WorkflowEventDto> History,
    DateTime CheckedAt);

public sealed record DocumentVersionRequest(
    string? CreatedBy,
    string? Note);

public sealed record RestoreDocumentVersionRequest(string? Actor);

public sealed record DocumentVersionDto(
    long Id,
    long DocumentId,
    int VersionNumber,
    string Code,
    string Title,
    string? FileName,
    string? OcrStatus,
    string? Status,
    string? Description,
    string? Note,
    string CreatedBy,
    DateTime CreatedAt);

public sealed record Gd2DocumentVersionDetailDto(
    long Id,
    long DocumentId,
    int VersionNumber,
    string VersionLabel,
    bool IsPublished,
    string Code,
    string Title,
    string? FileName,
    string? OcrStatus,
    string? Status,
    string? Description,
    string? Note,
    string CreatedBy,
    DateTime CreatedAt);

public sealed record Gd2DocumentVersionDiffFieldDto(
    string Field,
    string Label,
    string? LeftValue,
    string? RightValue,
    bool Changed);

public sealed record Gd2DocumentVersionCompareDto(
    long DocumentId,
    Gd2DocumentVersionDetailDto Left,
    Gd2DocumentVersionDetailDto Right,
    IReadOnlyList<Gd2DocumentVersionDiffFieldDto> Fields,
    DateTime ComparedAt);
