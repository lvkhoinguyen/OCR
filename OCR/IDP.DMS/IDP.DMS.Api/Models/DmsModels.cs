namespace IDP.DMS.Api.Models;

public sealed record StorageLocationDto(
    long Id,
    string Code,
    string Name,
    string LocationType,
    long? ParentId,
    string? Status,
    int? Capacity,
    DateTime? CreatedAt = null);

public sealed record StorageLocationRequest(
    string Code,
    string Name,
    string LocationType,
    long? ParentId,
    string? Status,
    int? Capacity);

public sealed record DossierDto(
    long Id,
    string Code,
    string Title,
    string? DossierType,
    long? StorageId,
    string? Status,
    DateTime? FromDate,
    DateTime? ToDate,
    string? Description,
    DateTime? CreatedAt = null);

public sealed record DossierRequest(
    string Code,
    string Title,
    string? DossierType,
    long? StorageId,
    string? Status,
    DateTime? FromDate,
    DateTime? ToDate,
    string? Description);

public sealed record DocumentDto(
    long Id,
    long DossierId,
    string Code,
    string Title,
    string? FileName,
    string? OcrStatus,
    string? Status,
    string? Description);

public sealed record DocumentRequest(
    long DossierId,
    string Code,
    string Title,
    string? FileName,
    string? OcrStatus,
    string? Status,
    string? Description);

public sealed record DocumentReviewContentRequest(
    string Description,
    string Actor,
    string? Note);

public sealed class QuickUploadDocumentRequest
{
    public long StorageId { get; set; }
    public IFormFile? File { get; set; }
    public string? Title { get; set; }
    public string? DocumentType { get; set; }
    public string? DossierType { get; set; }
    public string? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? Description { get; set; }
    public string? Engine { get; set; }
    public string? UnitCode { get; set; }
}

public sealed record QuickUploadRecordsResult(
    long DossierId,
    string DossierCode,
    long DocumentId,
    string DocumentCode);

public sealed record BorrowRequestDto(
    long Id,
    long DossierId,
    string Borrower,
    DateTime? BorrowFrom,
    DateTime? BorrowTo,
    string? Status,
    string? Approver,
    string? Note);

public sealed record BorrowRequestRequest(
    long DossierId,
    string Borrower,
    DateTime? BorrowFrom,
    DateTime? BorrowTo,
    string? Status,
    string? Approver,
    string? Note);

public sealed record SimpleRecordDto(
    long Id,
    string Code,
    string Name,
    long? ParentId,
    string? Status,
    string? Description,
    string? Extra1,
    string? Extra2,
    DateTime? Date1,
    DateTime? Date2);

public sealed record SimpleRecordRequest(
    string Code,
    string Name,
    long? ParentId,
    string? Status,
    string? Description,
    string? Extra1,
    string? Extra2,
    DateTime? Date1,
    DateTime? Date2);
