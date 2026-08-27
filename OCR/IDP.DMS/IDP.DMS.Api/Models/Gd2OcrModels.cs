namespace IDP.DMS.Api.Models;

// ──────────────────────────────────────────────────────────────────────────
// OCR – Requests, Results, Extractions, Confirmations, Summary
// ──────────────────────────────────────────────────────────────────────────

public sealed record Gd2OcrProcessRequest(
    IReadOnlyList<long>? DocumentIds,
    string? Engine,
    string? Actor,
    string? UnitCode,
    string? Note,
    string? FileName,
    string? ExtractedText);

public sealed record Gd2OcrResultDto(
    long DocumentId,
    string Code,
    string Title,
    string Engine,
    string PreviousStatus,
    string CurrentStatus,
    decimal Confidence,
    string ExtractedText,
    DateTime ProcessedAt);

public sealed record Gd2OcrBoundingBoxDto(
    int Page,
    decimal X,
    decimal Y,
    decimal Width,
    decimal Height);

public sealed record Gd2OcrFieldDto(
    string Key,
    string Label,
    string Value,
    decimal Confidence,
    Gd2OcrBoundingBoxDto Box,
    bool Confirmed);

public sealed record Gd2OcrExtractionDto(
    long DocumentId,
    string DocumentCode,
    string DocumentTitle,
    string FileName,
    string DocumentType,
    decimal OverallConfidence,
    IReadOnlyList<Gd2OcrFieldDto> Fields,
    string RawText,
    string Status,
    DateTime ExtractedAt);

public sealed record Gd2OcrConfirmationRequest(
    string Actor,
    string? UnitCode,
    IReadOnlyList<Gd2OcrFieldDto> Fields,
    string? Note);

public sealed record Gd2OcrConfirmationResult(
    long DocumentId,
    string DocumentCode,
    string DocumentType,
    decimal OverallConfidence,
    string Status,
    DateTime ConfirmedAt,
    IReadOnlyList<Gd2OcrFieldDto> Fields);

public sealed record Gd2OcrSummaryDto(
    long Total,
    long Done,
    long Pending,
    long Error,
    decimal CompletionRate,
    DateTime CheckedAt);
