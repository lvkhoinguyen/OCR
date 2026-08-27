using System.ComponentModel.DataAnnotations;

namespace IDP.DMS.Api.Models;

public sealed class BatchImportZipRequest
{
    [Required]
    public IFormFile DanhMucHoSo { get; init; } = null!;

    [Required]
    public IFormFile TaiLieu { get; init; } = null!;

    [StringLength(30)]
    public string OcrEngine { get; init; } = "vietocr";
}

public sealed record BatchImportExcelRow(
    int RowNumber,
    string DossierCode,
    string DossierTitle,
    string DossierType,
    string StorageCode,
    string DocumentCode,
    string DocumentTitle,
    string AttachmentFileName);

public sealed record BatchImportDocumentInput(
    int RowNumber,
    string DocumentCode,
    string DocumentTitle,
    string AttachmentFileName,
    string StoredFileName);

public sealed record BatchImportDossierInput(
    string DossierCode,
    string DossierTitle,
    string DossierType,
    string StorageCode,
    IReadOnlyList<BatchImportDocumentInput> Documents);

public sealed record BatchImportCreatedDocument(
    long ItemId,
    long DocumentId,
    string StoredFileName,
    string OcrEngine);

public sealed record BatchOcrQueueItem(
    long JobId,
    long ItemId,
    long DocumentId,
    string StoredFileName,
    string Engine);

public sealed record BatchImportItemDto(
    long Id,
    int RowNumber,
    string? DossierCode,
    string? DocumentCode,
    string? AttachmentFileName,
    string Status,
    string? Message,
    long? DossierId,
    long? DocumentId,
    string? StoredFileName,
    string? OcrEngine,
    DateTime? UpdatedAt);

public sealed record BatchImportJobDto(
    long Id,
    string Code,
    string ExcelFileName,
    string ZipFileName,
    string Status,
    int TotalRows,
    int ValidRows,
    int ImportedDossiers,
    int ImportedDocuments,
    int FailedRows,
    int OcrQueued,
    int OcrCompleted,
    int OcrFailed,
    string CreatedBy,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    IReadOnlyList<BatchImportItemDto> Items);

public sealed record BatchImportAcceptedDto(
    long JobId,
    string JobCode,
    string Status,
    int TotalRows,
    int ValidRows,
    int ImportedDossiers,
    int ImportedDocuments,
    int FailedRows,
    int OcrQueued,
    int OcrCompleted,
    int OcrFailed,
    IReadOnlyList<BatchImportItemDto> Items);
