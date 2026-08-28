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

// ─── Digitize from Image → PDF + Review Workflow ─────────────────────────────

/// <summary>Metadata có cấu trúc bóc tách từ ảnh tài liệu.</summary>
public sealed record DigitizeMetadata(
    string? DocumentNumber,
    string? IssueDate,
    string? IssuingAuthority,
    string? Subject,
    string? Signer)
{
    public static DigitizeMetadata Empty =>
        new(null, null, null, null, null);
}

/// <summary>Request tải ảnh lên và số hóa tự động.</summary>
public sealed class UploadAndDigitizeRequest
{
    public long StorageId { get; set; }
    public IFormFile? File { get; set; }
}

/// <summary>Kết quả trả về sau khi upload ảnh & bóc tách OCR thành công.</summary>
public sealed record UploadAndDigitizeResult(
    long DocumentId,
    long DossierId,
    string DocumentCode,
    string DossierCode,
    string OcrStatus,
    string Status,
    string OriginalFileName,
    string DigitizedPdfFileName,
    DigitizeMetadata Metadata,
    string FullText,
    string Engine,
    string Message);

/// <summary>Cập nhật nội dung metadata + toàn văn sau khi người kiểm duyệt chỉnh sửa.</summary>
public sealed record ReviewContentUpdateRequest(
    string? DocumentNumber,
    string? IssueDate,
    string? IssuingAuthority,
    string? Subject,
    string? Signer,
    string FullText,
    string Actor,
    string? Note);

/// <summary>Phê duyệt tài liệu và nhập kho chính thức.</summary>
public sealed record ApproveDocumentRequest(
    string Actor,
    string? Note);

/// <summary>Từ chối hoặc yêu cầu bổ sung.</summary>
public sealed record RejectDocumentRequest(
    string Actor,
    string Reason,
    bool NeedsSupplement = false);

/// <summary>DocumentDto mở rộng gồm metadata bóc tách và tên file ảnh gốc.</summary>
public sealed record DocumentDetailDto(
    long Id,
    long DossierId,
    string Code,
    string Title,
    string? FileName,
    string? OriginalFileName,
    string? OcrStatus,
    string? Status,
    string? FullText,
    DigitizeMetadata? Metadata,
    DateTime? CreatedAt,
    DateTime? UpdatedAt);

public sealed record DigitizeMetadataResult(
    DigitizeMetadata Metadata,
    string FullText,
    string Engine);
