using System.ComponentModel.DataAnnotations;

namespace IDP.DMS.Api.Models;

public sealed class SignPdfRequest
{
    [Required, StringLength(40)]
    public string CertType { get; init; } = "DEVELOPMENT";

    [Required, StringLength(255)]
    public string SignerName { get; init; } = string.Empty;

    [Required, StringLength(500)]
    public string Reason { get; init; } = "Phê duyệt hồ sơ lưu trữ";

    [Required, StringLength(255)]
    public string Location { get; init; } = "IDP.DMS";

    [StringLength(500)]
    public string? Pin { get; init; }

    public string? ImageSignature { get; init; }

    [Range(0, 100)] public decimal PositionX { get; init; } = 58;
    [Range(0, 100)] public decimal PositionY { get; init; } = 76;
    [Range(10, 90)] public decimal Width { get; init; } = 36;
    [Range(6, 40)] public decimal Height { get; init; } = 16;
}

public sealed record PdfSignatureResult(
    long DocumentId,
    string DocumentCode,
    string SignedFileName,
    long DocumentVersionId,
    int VersionNumber,
    long SignatureId,
    string CertificateSubject,
    string CertificateSerial,
    string CertificateType,
    DateTime SignedAt,
    bool CertificateTrusted,
    string ValidationStatus,
    int PageNumber,
    decimal PositionX,
    decimal PositionY,
    decimal Width,
    decimal Height,
    string FileHashSha256);

public sealed record PdfSignatureRecordDto(
    long Id,
    long DocumentId,
    string Signer,
    string CertificateType,
    string CertificateSubject,
    string CertificateSerial,
    DateTime ValidFrom,
    DateTime ValidTo,
    DateTime SignedAt,
    string ValidationStatus,
    bool CertificateTrusted,
    int PageNumber,
    decimal PositionX,
    decimal PositionY,
    decimal Width,
    decimal Height,
    string? Reason,
    string? Location,
    string? SignedFileName,
    string? FileHashSha256,
    long? DocumentVersionId);

public sealed record PdfSignatureCommitRequest(
    long DocumentId,
    string SignedFileName,
    string SourceFileName,
    string Signer,
    string CertificateType,
    string CertificateSubject,
    string CertificateSerial,
    DateTime ValidFrom,
    DateTime ValidTo,
    DateTime SignedAt,
    DateTime? TimestampAt,
    bool CertificateTrusted,
    int PageNumber,
    decimal PositionX,
    decimal PositionY,
    decimal Width,
    decimal Height,
    string Reason,
    string Location,
    string FileHashSha256);

public sealed record PdfSignatureCommitResult(
    long SignatureId,
    long VersionId,
    int VersionNumber);
