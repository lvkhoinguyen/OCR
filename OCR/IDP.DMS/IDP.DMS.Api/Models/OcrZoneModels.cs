using System.ComponentModel.DataAnnotations;

namespace IDP.DMS.Api.Models;

public sealed class OcrZonesRequest
{
    [Required, StringLength(30)]
    public string Engine { get; init; } = "vietocr";

    [Required, MinLength(1), MaxLength(12)]
    public IReadOnlyList<OcrZoneRequest> Zones { get; init; } = [];
}

public sealed class OcrZoneRequest
{
    [Required, StringLength(80)]
    public string Id { get; init; } = string.Empty;

    [Required, StringLength(50)]
    public string FieldKey { get; init; } = string.Empty;

    [Required, StringLength(100)]
    public string Label { get; init; } = string.Empty;

    [Range(1, 10000)]
    public int Page { get; init; } = 1;

    [Range(0, 100)] public decimal X { get; init; }
    [Range(0, 100)] public decimal Y { get; init; }
    [Range(0.25, 100)] public decimal Width { get; init; }
    [Range(0.25, 100)] public decimal Height { get; init; }
}

public sealed record OcrZoneResultDto(
    string Id,
    string FieldKey,
    string Label,
    int Page,
    decimal X,
    decimal Y,
    decimal Width,
    decimal Height,
    int PixelX,
    int PixelY,
    int PixelWidth,
    int PixelHeight,
    string Text,
    string Engine);

public sealed record OcrZonesResultDto(
    long DocumentId,
    string DocumentCode,
    string RequestedEngine,
    IReadOnlyDictionary<string, string> Metadata,
    IReadOnlyList<OcrZoneResultDto> Zones,
    DateTime ProcessedAt);

public sealed record OcrPagePreviewResult(
    byte[] Content,
    int Page,
    int PageCount,
    int Width,
    int Height);

internal sealed record PythonOcrZonesOutput(
    string Engine,
    IReadOnlyList<PythonOcrZoneOutput> Zones);

internal sealed record PythonOcrZoneOutput(
    string Id,
    string FieldKey,
    string Label,
    int Page,
    decimal X,
    decimal Y,
    decimal Width,
    decimal Height,
    int PixelX,
    int PixelY,
    int PixelWidth,
    int PixelHeight,
    string Text,
    string? Engine,
    string? CropFileName);

internal sealed record PythonOcrPagePreview(
    int Page,
    int PageCount,
    int Width,
    int Height);
