using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using IDP.DMS.Api.Models;
using PdfSharp.Drawing;
using PdfSharp.Fonts;
using PdfSharp.Pdf.Annotations;
using PdfSharp.Pdf.IO;
using PdfSharp.Pdf.Signatures;

namespace IDP.DMS.Api.Services;

public sealed class PdfSigningService
{
    private const int MaxSignatureImageBytes = 2 * 1024 * 1024;
    private static readonly ConcurrentDictionary<long, SemaphoreSlim> DocumentLocks = new();
    private static readonly object FontResolverLock = new();

    private readonly OracleDmsService _dmsService;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public PdfSigningService(
        OracleDmsService dmsService,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        _dmsService = dmsService;
        _configuration = configuration;
        _environment = environment;
    }

    public async Task<PdfSignatureResult> SignAsync(long documentId, SignPdfRequest request, string actor)
    {
        var documentLock = DocumentLocks.GetOrAdd(documentId, _ => new SemaphoreSlim(1, 1));
        await documentLock.WaitAsync();
        try
        {
            var document = await _dmsService.GetDocumentAsync(documentId)
                ?? throw new BusinessRuleException($"Không tìm thấy tài liệu #{documentId}.");
            if (!string.Equals(document.Status, "APPROVED", StringComparison.OrdinalIgnoreCase))
            {
                throw new BusinessRuleException("Chỉ tài liệu đã APPROVED mới được ký số và xuất bản.");
            }

            var sourceFileName = Path.GetFileName(document.FileName);
            if (string.IsNullOrWhiteSpace(sourceFileName) ||
                !string.Equals(Path.GetExtension(sourceFileName), ".pdf", StringComparison.OrdinalIgnoreCase))
            {
                throw new BusinessRuleException("Tài liệu phải có tệp PDF vật lý trước khi ký số.");
            }

            var uploadsFolder = Path.Combine(_environment.ContentRootPath, "uploads");
            var sourcePath = Path.Combine(uploadsFolder, sourceFileName);
            if (!File.Exists(sourcePath))
            {
                throw new BusinessRuleException($"Không tìm thấy tệp PDF '{sourceFileName}' trong thư mục uploads.");
            }

            EnsureFontResolver();
            var signatureImage = DecodeSignatureImage(request.ImageSignature);
            using var certificate = ResolveCertificate(request.CertType, request.Pin);
            ValidateCertificate(certificate);

            var signedAt = DateTime.UtcNow;
            var tsaUrl = _configuration["PdfSignature:TimestampServerUrl"];
            var tsaUri = Uri.TryCreate(tsaUrl, UriKind.Absolute, out var parsedTsa) ? parsedTsa : null;
            var signedFileName = $"{documentId}_signed_{signedAt:yyyyMMddHHmmssfff}.pdf";
            var signedPath = Path.Combine(uploadsFolder, signedFileName);
            var temporaryPath = signedPath + ".tmp";
            var pageIndex = 0;
            var widthPercent = Math.Clamp(request.Width, 10m, 90m);
            var heightPercent = Math.Clamp(request.Height, 6m, 40m);
            var xPercent = Math.Clamp(request.PositionX, 0m, 100m - widthPercent);
            var yPercent = Math.Clamp(request.PositionY, 0m, 100m - heightPercent);

            try
            {
                using (var pdf = PdfReader.Open(sourcePath, PdfDocumentOpenMode.Modify))
                {
                    if (pdf.PageCount == 0)
                    {
                        throw new BusinessRuleException("Tệp PDF không có trang để ký.");
                    }

                    pageIndex = pdf.PageCount - 1;
                    var page = pdf.Pages[pageIndex];
                    var rectangle = ToPdfRectangle(page.Width.Point, page.Height.Point,
                        xPercent, yPercent, widthPercent, heightPercent);

                    var signer = new PdfSharpDefaultSigner(certificate, PdfMessageDigestType.SHA256, tsaUri);
                    var options = new DigitalSignatureOptions
                    {
                        ContactInfo = actor,
                        Location = request.Location.Trim(),
                        Reason = request.Reason.Trim(),
                        AppName = "IDP.DMS",
                        PageIndex = pageIndex,
                        Rectangle = rectangle,
                        AppearanceHandler = new DmsSignatureAppearanceHandler(
                            request.SignerName.Trim(), signedAt, certificate, request.Reason.Trim(), signatureImage)
                    };

                    DigitalSignatureHandler.ForDocument(pdf, signer, options);
                    await pdf.SaveAsync(temporaryPath);
                }

                File.Move(temporaryPath, signedPath);
                await using var signedStream = File.OpenRead(signedPath);
                var hash = Convert.ToHexString(await SHA256.HashDataAsync(signedStream));
                var trusted = IsCertificateTrusted(certificate);
                var normalizedCertType = request.CertType.Trim().ToUpperInvariant();
                var commit = await _dmsService.CommitPdfSignatureAsync(new PdfSignatureCommitRequest(
                    documentId,
                    signedFileName,
                    sourceFileName,
                    request.SignerName.Trim(),
                    normalizedCertType,
                    certificate.Subject,
                    certificate.SerialNumber,
                    certificate.NotBefore.ToUniversalTime(),
                    certificate.NotAfter.ToUniversalTime(),
                    signedAt,
                    tsaUri is null ? null : signedAt,
                    trusted,
                    pageIndex + 1,
                    xPercent,
                    yPercent,
                    widthPercent,
                    heightPercent,
                    request.Reason.Trim(),
                    request.Location.Trim(),
                    hash));

                return new PdfSignatureResult(
                    documentId,
                    document.Code,
                    signedFileName,
                    commit.VersionId,
                    commit.VersionNumber,
                    commit.SignatureId,
                    certificate.Subject,
                    certificate.SerialNumber,
                    normalizedCertType,
                    signedAt,
                    trusted,
                    trusted ? "CHAIN_TRUSTED_NO_REVOCATION" : "SIGNED_UNTRUSTED_CERTIFICATE",
                    pageIndex + 1,
                    xPercent,
                    yPercent,
                    widthPercent,
                    heightPercent,
                    hash);
            }
            catch
            {
                if (File.Exists(temporaryPath)) File.Delete(temporaryPath);
                if (File.Exists(signedPath)) File.Delete(signedPath);
                throw;
            }
        }
        finally
        {
            documentLock.Release();
        }
    }

    private X509Certificate2 ResolveCertificate(string certType, string? pin)
    {
        var normalized = certType.Trim().ToUpperInvariant();
        return normalized switch
        {
            "DEVELOPMENT" => CreateDevelopmentCertificate(),
            "PFX" => LoadPfxCertificate(pin),
            "WINDOWS_STORE" => LoadCertificateFromStore(),
            "USB_TOKEN" or "PKCS11" or "REMOTE_SIGNING" or "SIM_PKI" or "SMART_CA" =>
                throw new BusinessRuleException($"{normalized} cần SDK/IDigitalSigner adapter của nhà cung cấp; hệ thống không mô phỏng chữ ký phần cứng/từ xa."),
            _ => throw new BusinessRuleException("certType chỉ hỗ trợ DEVELOPMENT, PFX hoặc WINDOWS_STORE trong cấu hình hiện tại.")
        };
    }

    private X509Certificate2 CreateDevelopmentCertificate()
    {
        if (!_environment.IsDevelopment() || !_configuration.GetValue("PdfSignature:AllowDevelopmentCertificate", true))
        {
            throw new BusinessRuleException("Chứng thư DEVELOPMENT chỉ được phép trong môi trường Development.");
        }

        using var rsa = RSA.Create(2048);
        var certificateRequest = new CertificateRequest(
            "CN=IDP.DMS Development PDF Signer, O=IDP Technology",
            rsa,
            HashAlgorithmName.SHA256,
            RSASignaturePadding.Pkcs1);
        certificateRequest.CertificateExtensions.Add(new X509KeyUsageExtension(
            X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.NonRepudiation, true));
        return certificateRequest.CreateSelfSigned(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddYears(1));
    }

    private X509Certificate2 LoadPfxCertificate(string? pin)
    {
        var configuredPath = _configuration["PdfSignature:PfxPath"];
        if (string.IsNullOrWhiteSpace(configuredPath))
        {
            throw new BusinessRuleException("Chưa cấu hình PdfSignature:PfxPath cho chứng thư PFX.");
        }

        var pfxPath = Path.IsPathRooted(configuredPath)
            ? configuredPath
            : Path.GetFullPath(Path.Combine(_environment.ContentRootPath, configuredPath));
        if (!File.Exists(pfxPath))
        {
            throw new BusinessRuleException("Không tìm thấy tệp chứng thư PFX đã cấu hình.");
        }

        var password = string.IsNullOrEmpty(pin) ? _configuration["PdfSignature:PfxPassword"] : pin;
        if (string.IsNullOrEmpty(password))
        {
            throw new BusinessRuleException("Chứng thư PFX bắt buộc nhập PIN/mật khẩu.");
        }

        try
        {
            return new X509Certificate2(
                File.ReadAllBytes(pfxPath),
                password,
                X509KeyStorageFlags.EphemeralKeySet);
        }
        catch (CryptographicException)
        {
            throw new BusinessRuleException("Không mở được chứng thư PFX. Vui lòng kiểm tra PIN/mật khẩu.");
        }
    }

    private X509Certificate2 LoadCertificateFromStore()
    {
        var thumbprint = _configuration["PdfSignature:CertificateThumbprint"]?.Replace(" ", string.Empty);
        if (string.IsNullOrWhiteSpace(thumbprint))
        {
            throw new BusinessRuleException("Chưa cấu hình PdfSignature:CertificateThumbprint.");
        }

        var location = Enum.TryParse<StoreLocation>(_configuration["PdfSignature:StoreLocation"], true, out var parsed)
            ? parsed
            : StoreLocation.CurrentUser;
        using var store = new X509Store(StoreName.My, location);
        store.Open(OpenFlags.ReadOnly);
        var certificate = store.Certificates
            .Find(X509FindType.FindByThumbprint, thumbprint, validOnly: false)
            .OfType<X509Certificate2>()
            .FirstOrDefault(item => item.HasPrivateKey);
        return certificate is null
            ? throw new BusinessRuleException("Không tìm thấy chứng thư có private key trong Windows Certificate Store.")
            : new X509Certificate2(certificate);
    }

    private static void ValidateCertificate(X509Certificate2 certificate)
    {
        var now = DateTime.UtcNow;
        if (!certificate.HasPrivateKey)
            throw new BusinessRuleException("Chứng thư không có private key để ký.");
        if (certificate.NotBefore.ToUniversalTime() > now || certificate.NotAfter.ToUniversalTime() < now)
            throw new BusinessRuleException("Chứng thư chưa có hiệu lực hoặc đã hết hạn.");
    }

    private static bool IsCertificateTrusted(X509Certificate2 certificate)
    {
        using var chain = new X509Chain();
        chain.ChainPolicy.RevocationMode = X509RevocationMode.NoCheck;
        chain.ChainPolicy.VerificationFlags = X509VerificationFlags.NoFlag;
        return chain.Build(certificate);
    }

    private static XRect ToPdfRectangle(
        double pageWidth,
        double pageHeight,
        decimal xPercent,
        decimal yPercent,
        decimal widthPercent,
        decimal heightPercent)
    {
        var width = pageWidth * (double)widthPercent / 100d;
        var height = pageHeight * (double)heightPercent / 100d;
        var x = pageWidth * (double)xPercent / 100d;
        var top = pageHeight * (double)yPercent / 100d;
        return new XRect(x, pageHeight - top - height, width, height);
    }

    private static byte[]? DecodeSignatureImage(string? imageSignature)
    {
        if (string.IsNullOrWhiteSpace(imageSignature)) return null;
        var comma = imageSignature.IndexOf(',');
        var payload = comma >= 0 ? imageSignature[(comma + 1)..] : imageSignature;
        try
        {
            var bytes = Convert.FromBase64String(payload);
            if (bytes.Length > MaxSignatureImageBytes)
                throw new BusinessRuleException("Ảnh chữ ký/con dấu không được vượt quá 2 MB.");
            var isPng = bytes.Length > 8 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47;
            var isJpeg = bytes.Length > 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF;
            if (!isPng && !isJpeg)
                throw new BusinessRuleException("Ảnh chữ ký chỉ hỗ trợ PNG hoặc JPEG.");
            return bytes;
        }
        catch (FormatException)
        {
            throw new BusinessRuleException("Dữ liệu ảnh chữ ký không phải Base64 hợp lệ.");
        }
    }

    private void EnsureFontResolver()
    {
        if (GlobalFontSettings.FontResolver is not null) return;
        lock (FontResolverLock)
        {
            if (GlobalFontSettings.FontResolver is not null) return;
            var regular = _configuration["Ocr:PdfFont"] ?? @"C:\Windows\Fonts\arial.ttf";
            var bold = _configuration["Ocr:PdfBoldFont"] ?? @"C:\Windows\Fonts\arialbd.ttf";
            if (!File.Exists(regular) || !File.Exists(bold))
                throw new BusinessRuleException("Chưa cấu hình font Unicode Ocr:PdfFont/PdfBoldFont để tạo con dấu.");
            GlobalFontSettings.FontResolver = new DmsPdfFontResolver(regular, bold);
        }
    }

    private sealed class DmsSignatureAppearanceHandler : IAnnotationAppearanceHandler
    {
        private readonly string _signer;
        private readonly DateTime _signedAt;
        private readonly X509Certificate2 _certificate;
        private readonly string _reason;
        private readonly byte[]? _image;

        public DmsSignatureAppearanceHandler(
            string signer,
            DateTime signedAt,
            X509Certificate2 certificate,
            string reason,
            byte[]? image)
        {
            _signer = signer;
            _signedAt = signedAt;
            _certificate = certificate;
            _reason = reason;
            _image = image;
        }

        public void DrawAppearance(XGraphics graphics, XRect rectangle)
        {
            graphics.DrawRectangle(new XPen(XColor.FromArgb(29, 78, 216), 1.4), XBrushes.White, rectangle);
            var padding = Math.Max(4d, rectangle.Height * .06d);
            var imageWidth = Math.Min(rectangle.Width * .28d, rectangle.Height * .72d);
            var textX = rectangle.X + padding;

            if (_image is { Length: > 0 })
            {
                using var stream = new MemoryStream(_image, writable: false);
                using var image = XImage.FromStream(stream);
                graphics.DrawImage(image, rectangle.X + padding, rectangle.Y + padding,
                    imageWidth, rectangle.Height - padding * 2);
                textX += imageWidth + padding;
            }

            var availableWidth = rectangle.Right - textX - padding;
            var lineHeight = Math.Max(9d, rectangle.Height / 5.2d);
            var normalSize = Math.Clamp(rectangle.Height / 8d, 6d, 10d);
            var boldSize = Math.Clamp(rectangle.Height / 7d, 7d, 11d);
            var bold = new XFont("IDPArial", boldSize, XFontStyleEx.Bold);
            var normal = new XFont("IDPArial", normalSize, XFontStyleEx.Regular);
            var brush = new XSolidBrush(XColor.FromArgb(15, 23, 42));
            var certificateName = _certificate.GetNameInfo(X509NameType.SimpleName, false);

            graphics.DrawString(Trim($"Ký bởi: {_signer}", 80), bold, brush,
                new XRect(textX, rectangle.Y + padding, availableWidth, lineHeight), XStringFormats.TopLeft);
            graphics.DrawString($"Ngày ký: {_signedAt.ToLocalTime():dd/MM/yyyy HH:mm:ss}", normal, brush,
                new XRect(textX, rectangle.Y + padding + lineHeight, availableWidth, lineHeight), XStringFormats.TopLeft);
            graphics.DrawString(Trim($"Chứng thư: {certificateName}", 90), normal, brush,
                new XRect(textX, rectangle.Y + padding + lineHeight * 2, availableWidth, lineHeight), XStringFormats.TopLeft);
            graphics.DrawString(Trim($"Lý do: {_reason}", 100), normal, brush,
                new XRect(textX, rectangle.Y + padding + lineHeight * 3, availableWidth, lineHeight), XStringFormats.TopLeft);
        }

        private static string Trim(string value, int maxLength) =>
            value.Length <= maxLength ? value : value[..(maxLength - 3)] + "...";
    }

    private sealed class DmsPdfFontResolver : IFontResolver
    {
        private readonly byte[] _regular;
        private readonly byte[] _bold;

        public DmsPdfFontResolver(string regularPath, string boldPath)
        {
            _regular = File.ReadAllBytes(regularPath);
            _bold = File.ReadAllBytes(boldPath);
        }

        public FontResolverInfo ResolveTypeface(string familyName, bool isBold, bool isItalic) =>
            new(isBold ? "IDPArial#Bold" : "IDPArial#Regular", mustSimulateBold: false, mustSimulateItalic: isItalic);

        public byte[] GetFont(string faceName) =>
            faceName.EndsWith("#Bold", StringComparison.Ordinal) ? _bold : _regular;
    }
}
