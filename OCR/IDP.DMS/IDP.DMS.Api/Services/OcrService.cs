using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.IO.Compression;
using System.Xml.Linq;
using IDP.DMS.Api.Models;
using Docnet.Core;
using Docnet.Core.Models;
using SharpImage = SixLabors.ImageSharp.Image;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Png;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;


namespace IDP.DMS.Api.Services;

public class OcrService : IDisposable
{
    private readonly ILogger<OcrService> _logger;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;

    public OcrService(
        IWebHostEnvironment env,
        ILogger<OcrService> logger,
        IConfiguration config,
        IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _config = config;
        _httpClientFactory = httpClientFactory;

        // QuestPDF community license (free for open-source / internal use)
        QuestPDF.Settings.License = LicenseType.Community;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ExtractText  (Gemini API only — local engines removed)
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Extract text from a document using Gemini Vision API or direct text-layer reading.
    /// </summary>
    /// <param name="imagePath">Path to the image, PDF or DOCX file.</param>
    /// <param name="engine">OCR engine — only "gemini" is supported; any other value also routes to Gemini.</param>
    public string ExtractText(string imagePath, string engine = "gemini")
    {
        if (!File.Exists(imagePath))
        {
            _logger.LogWarning("File not found for OCR: {Path}", imagePath);
            return string.Empty;
        }

        try
        {
            // DOCX: read the OpenXML text layer directly without spawning any process.
            if (imagePath.EndsWith(".docx", StringComparison.OrdinalIgnoreCase))
            {
                using var archive = ZipFile.OpenRead(imagePath);
                var documentEntry = archive.GetEntry("word/document.xml");
                if (documentEntry is null) return string.Empty;
                using var stream = documentEntry.Open();
                var document = XDocument.Load(stream);
                XNamespace word = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
                return string.Join(Environment.NewLine,
                    document.Descendants(word + "p")
                        .Select(p => string.Concat(p.Descendants(word + "t").Select(t => t.Value)))
                        .Where(t => !string.IsNullOrWhiteSpace(t)));
            }

            // Digital PDF: read the embedded text layer first (fast, no API call).
            if (imagePath.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            {
                using var pdf = UglyToad.PdfPig.PdfDocument.Open(imagePath);
                var sb = new StringBuilder();
                foreach (var page in pdf.GetPages())
                    sb.AppendLine(page.Text);
                var pdfText = sb.ToString().Trim();
                if (!string.IsNullOrWhiteSpace(pdfText)) return pdfText;
                // Scanned PDF: fall through to Gemini below.
            }

            // All image formats + scanned PDFs → Gemini Vision API.
            return ExtractTextWithGemini(imagePath).GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during OCR on file: {Path}", imagePath);
            throw;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ExtractTextDetailed
    // ─────────────────────────────────────────────────────────────────────────

    public OcrExtractionResult ExtractTextDetailed(string filePath, string engine = "gemini", bool forceGemini = false)
    {
        if (!File.Exists(filePath))
            throw new FileNotFoundException("Không tìm thấy file cần OCR.", filePath);

        // Digital PDF text-layer.
        if (filePath.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            using var pdf = UglyToad.PdfPig.PdfDocument.Open(filePath);
            var textLayer = string.Join(Environment.NewLine, pdf.GetPages().Select(p => p.Text)).Trim();
            if (!string.IsNullOrWhiteSpace(textLayer))
            {
                _logger.LogInformation("Extracted PDF text layer directly with PdfPig: {Path}", filePath);
                return new OcrExtractionResult(textLayer, "pdfpig", false, "Đọc trực tiếp text layer PDF bằng PdfPig.");
            }
            _logger.LogInformation("PDF has no text layer; routing to Gemini Vision API: {Path}", filePath);
        }

        // DOCX.
        if (filePath.EndsWith(".docx", StringComparison.OrdinalIgnoreCase))
        {
            var docxText = ExtractText(filePath);
            if (string.IsNullOrWhiteSpace(docxText))
                throw new InvalidOperationException("Không đọc được nội dung chữ từ file DOCX.");
            return new OcrExtractionResult(docxText, "docx-text", false, "Đọc trực tiếp nội dung OpenXML của DOCX.");
        }

        // Validate Gemini key + supported file types.
        var configuredGeminiKey = _config["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(configuredGeminiKey) || configuredGeminiKey == "YOUR_GEMINI_API_KEY_HERE")
            throw new InvalidOperationException("Chưa cấu hình Gemini API Key. Vui lòng liên hệ quản trị viên.");

        var supportedExtensions = new[] { ".png", ".jpg", ".jpeg", ".webp", ".pdf" };
        if (!supportedExtensions.Contains(Path.GetExtension(filePath), StringComparer.OrdinalIgnoreCase))
            throw new InvalidOperationException("Gemini chỉ hỗ trợ PDF, PNG, JPG/JPEG hoặc WEBP.");

        var text = ExtractTextWithGemini(filePath).GetAwaiter().GetResult();
        if (string.IsNullOrWhiteSpace(text))
            throw new InvalidOperationException("Gemini không nhận diện được nội dung chữ trong tài liệu.");
        return new OcrExtractionResult(text, "gemini", false, "Bóc tách thành công bằng Gemini Vision API.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RenderPagePreview  (PDF/TIFF → PNG using Docnet + ImageSharp — no Python)
    // ─────────────────────────────────────────────────────────────────────────

    public OcrPagePreviewResult RenderPagePreview(string filePath, int page)
    {
        if (!File.Exists(filePath))
            throw new FileNotFoundException("Không tìm thấy file cần xem trước OCR.", filePath);
        if (page < 1)
            throw new BusinessRuleException("Số trang xem trước phải lớn hơn hoặc bằng 1.");

        var ext = Path.GetExtension(filePath).ToLowerInvariant();

        // PDF → render via Docnet (PDFium wrapper)
        if (ext == ".pdf")
        {
            using var library = DocLib.Instance;
            using var reader  = library.GetDocReader(filePath, new PageDimensions(2000, 2800));
            var pageCount = reader.GetPageCount();
            if (page > pageCount)
                throw new BusinessRuleException($"Trang {page} không tồn tại; tài liệu có {pageCount} trang.");

            using var pageReader = reader.GetPageReader(page - 1);
            var rawBytes = pageReader.GetImage(); // BGRA byte array
            int width    = pageReader.GetPageWidth();
            int height   = pageReader.GetPageHeight();

            // Convert BGRA → PNG using ImageSharp
            using var image = SharpImage.LoadPixelData<Bgra32>(rawBytes, width, height);
            using var ms    = new MemoryStream();
            image.Save(ms, PngFormat.Instance);
            return new OcrPagePreviewResult(ms.ToArray(), page, pageCount, width, height);
        }

        // TIFF multi-frame → render via ImageSharp
        if (ext is ".tif" or ".tiff")
        {
            using var image = SharpImage.Load(filePath);
            var frameCount = image.Frames.Count;
            if (page > frameCount)
                throw new BusinessRuleException($"Trang {page} không tồn tại; tài liệu có {frameCount} trang.");
            using var frame = image.Frames.CloneFrame(page - 1);
            using var ms    = new MemoryStream();
            frame.Save(ms, PngFormat.Instance);
            return new OcrPagePreviewResult(ms.ToArray(), page, frameCount, frame.Width, frame.Height);
        }

        // Single image
        {
            using var image = SharpImage.Load(filePath);
            using var ms    = new MemoryStream();
            image.Save(ms, PngFormat.Instance);
            return new OcrPagePreviewResult(ms.ToArray(), 1, 1, image.Width, image.Height);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ExtractZones  (zone cropping in C# via ImageSharp, text via Gemini API)
    // ─────────────────────────────────────────────────────────────────────────

    public OcrZonesResultDto ExtractZones(
        long documentId,
        string documentCode,
        string filePath,
        OcrZonesRequest request)
    {
        if (!File.Exists(filePath))
            throw new FileNotFoundException("Không tìm thấy file nguồn để OCR theo vùng.", filePath);
        if (request.Zones.Count is < 1 or > 12)
            throw new BusinessRuleException("Mỗi lần OCR phải có từ 1 đến 12 vùng.");

        var allowedFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            { "documentNumber", "issueDate", "issuingAuthority", "subject", "signer" };
        if (request.Zones.Any(z => !allowedFields.Contains(z.FieldKey)))
            throw new BusinessRuleException("Nhãn vùng OCR không thuộc danh sách trường metadata được hỗ trợ.");
        if (request.Zones.Select(z => z.Id).Distinct(StringComparer.OrdinalIgnoreCase).Count() != request.Zones.Count)
            throw new BusinessRuleException("Mã định danh của các vùng OCR không được trùng nhau.");
        if (request.Zones.Any(z => z.X + z.Width > 100 || z.Y + z.Height > 100))
            throw new BusinessRuleException("Tọa độ vùng OCR phải nằm hoàn toàn trong trang tài liệu.");

        // Render each required page to an in-memory image
        var requiredPages = request.Zones.Select(z => z.Page).Distinct().OrderBy(p => p).ToList();
        var pageImages    = new Dictionary<int, SharpImage>();
        try
        {
            foreach (var pageNumber in requiredPages)
                pageImages[pageNumber] = LoadPageImage(filePath, pageNumber);

            var results = new List<OcrZoneResultDto>(request.Zones.Count);
            for (var index = 0; index < request.Zones.Count; index++)
            {
                var zone  = request.Zones[index];
                var image = pageImages[zone.Page];

                // Convert percentage coordinates to pixels (zone coords are decimal)
                int left   = Math.Max(0, (int)Math.Floor(image.Width  * (double)zone.X / 100.0));
                int top    = Math.Max(0, (int)Math.Floor(image.Height * (double)zone.Y / 100.0));
                int right  = Math.Min(image.Width,  (int)Math.Ceiling(image.Width  * (double)(zone.X + zone.Width)  / 100.0));
                int bottom = Math.Min(image.Height, (int)Math.Ceiling(image.Height * (double)(zone.Y + zone.Height) / 100.0));

                if (right - left < 2 || bottom - top < 2)
                    throw new BusinessRuleException($"Vùng '{zone.Label}' quá nhỏ để OCR.");

                var cropRect   = new Rectangle(left, top, right - left, bottom - top);
                using var crop = image.Clone(ctx => ctx.Crop(cropRect));

                // Upscale very small crops for better recognition quality
                var scaleFactor = Math.Max(1.0, Math.Min(3.0, Math.Max(700.0 / crop.Width, 100.0 / crop.Height)));
                SharpImage finalCrop;
                if (scaleFactor > 1.05)
                {
                    finalCrop = crop.Clone(ctx => ctx.Resize(
                        (int)(crop.Width * scaleFactor),
                        (int)(crop.Height * scaleFactor),
                        KnownResamplers.Lanczos3));
                }
                else
                {
                    finalCrop = crop.Clone(ctx => { });
                }

                string text;
                try
                {
                    // Save crop to a temp file and call Gemini Vision API
                    var cropTempPath = Path.Combine(Path.GetTempPath(), $"idpdms_zone_{Guid.NewGuid():N}.png");
                    try
                    {
                        finalCrop.Save(cropTempPath);
                        var extraction = ExtractTextDetailed(cropTempPath, "gemini");
                        text = extraction.Text.Trim();
                    }
                    finally
                    {
                        finalCrop.Dispose();
                        try { File.Delete(cropTempPath); } catch (IOException) { }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Gemini OCR zone '{Label}' failed; using empty string.", zone.Label);
                    text = string.Empty;
                }

                results.Add(new OcrZoneResultDto(
                    zone.Id, zone.FieldKey, zone.Label, zone.Page,
                    zone.X, zone.Y, zone.Width, zone.Height,
                    left, top, right - left, bottom - top,
                    text, "gemini"));
            }

            var metadata = results
                .GroupBy(z => z.FieldKey, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(
                    g => g.Key,
                    g => string.Join(Environment.NewLine, g.Select(z => z.Text).Where(t => !string.IsNullOrWhiteSpace(t))),
                    StringComparer.OrdinalIgnoreCase);

            return new OcrZonesResultDto(documentId, documentCode, "gemini", metadata, results, DateTime.UtcNow);
        }
        finally
        {
            foreach (var img in pageImages.Values)
                img.Dispose();
        }
    }

    /// <summary>Loads a single page from a PDF, TIFF or image file as an ImageSharp Image.</summary>
    private SharpImage LoadPageImage(string filePath, int page)
    {
        var ext = Path.GetExtension(filePath).ToLowerInvariant();

        if (ext == ".pdf")
        {
            using var library = DocLib.Instance;
            using var reader  = library.GetDocReader(filePath, new PageDimensions(2000, 2800));
            using var pageReader = reader.GetPageReader(page - 1);
            var raw    = pageReader.GetImage();
            int width  = pageReader.GetPageWidth();
            int height = pageReader.GetPageHeight();
            return SharpImage.LoadPixelData<Bgra32>(raw, width, height);
        }

        if (ext is ".tif" or ".tiff")
        {
            using var src = SharpImage.Load(filePath);
            return src.Frames.CloneFrame(page - 1);
        }

        return SharpImage.Load(filePath);
    }


    // ─────────────────────────────────────────────────────────────────────────
    // GenerateDigitizedPdf  (QuestPDF — no Python / reportlab)
    // ─────────────────────────────────────────────────────────────────────────

    public void GenerateDigitizedPdf(OcrPdfGenerationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.OutputPath))
            throw new ArgumentException("Đường dẫn PDF đầu ra là bắt buộc.", nameof(request));
        if (string.IsNullOrWhiteSpace(request.Text))
            throw new ArgumentException("Nội dung OCR để sinh PDF là bắt buộc.", nameof(request));

        Directory.CreateDirectory(Path.GetDirectoryName(request.OutputPath)
            ?? throw new InvalidOperationException("Không xác định được thư mục PDF đầu ra."));

        var normalizedText = (request.Text ?? string.Empty)
            .Replace("\r\n", "\n").Replace("\r", "\n").Trim();
        if (string.IsNullOrWhiteSpace(normalizedText))
            normalizedText = "Không có nội dung OCR.";

        Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(18, Unit.Millimetre);
                page.DefaultTextStyle(x => x.FontSize(10.5f).FontFamily("Arial"));

                page.Header().Column(col =>
                {
                    col.Item().Text("HỆ THỐNG QUẢN LÝ VÀ SỐ HÓA HỒ SƠ IDP.DMS")
                        .Bold().FontSize(15).FontColor("#0f3d73").AlignCenter();
                    col.Item().Text("PHIÊN BẢN PDF SỐ HÓA OCR")
                        .FontSize(11).FontColor("#0f3d73").AlignCenter();
                    col.Item().PaddingTop(6).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.ConstantColumn(42, Unit.Millimetre);
                            cols.RelativeColumn();
                        });
                        void Row(string label, string? value)
                        {
                            table.Cell().Background("#eaf2fb").Padding(5).Text(label).Bold().FontSize(9.5f);
                            table.Cell().Padding(5).Text(value ?? "—").FontSize(9.5f);
                        }
                        Row("Mã tài liệu",   request.Code);
                        Row("Tên tài liệu",  request.Title);
                        Row("Tệp nguồn",     request.SourceFileName);
                        Row("Công cụ OCR",   request.Engine);
                        Row("Thời gian số hóa", DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
                    });
                    col.Item().PaddingTop(8).Text("TOÀN VĂN OCR BÓC TÁCH")
                        .Bold().FontSize(11).FontColor("#0f3d73");
                });

                page.Content().PaddingTop(8).Column(col =>
                {
                    foreach (var block in normalizedText.Split("\n\n", StringSplitOptions.RemoveEmptyEntries))
                    {
                        col.Item().Text(block.Replace("\n", " ")).FontSize(10.5f).Justify();
                        col.Item().Height(4);
                    }
                });

                page.Footer().AlignCenter()
                    .Text(text =>
                    {
                        text.Span("IDP.DMS • Tài liệu số hóa • Trang ");
                        text.CurrentPageNumber();
                        text.Span("/");
                        text.TotalPages();
                    });
            });
        }).GeneratePdf(request.OutputPath);

        if (!File.Exists(request.OutputPath) || new FileInfo(request.OutputPath).Length == 0)
            throw new InvalidOperationException("QuestPDF không tạo được file PDF số hóa.");

        _logger.LogInformation("Digitized PDF generated: {Path}", request.OutputPath);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ExtractTextWithGemini  (Gemini Vision API — unchanged)
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Calls Gemini Vision API to extract Vietnamese text from an image or scanned PDF.</summary>
    private async Task<string> ExtractTextWithGemini(string imagePath)
    {
        var apiKey = _config["Gemini:ApiKey"];
        var model  = _config["Gemini:Model"] ?? "gemini-flash-latest";

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "YOUR_GEMINI_API_KEY_HERE")
            throw new Exception("Chưa cấu hình Gemini API Key. Vui lòng cập nhật 'Gemini:ApiKey' trong appsettings.json.");

        var imageBytes  = await File.ReadAllBytesAsync(imagePath);
        var base64Image = Convert.ToBase64String(imageBytes);
        var ext         = Path.GetExtension(imagePath).TrimStart('.').ToLowerInvariant();
        var mimeType    = ext switch
        {
            "jpg" or "jpeg" => "image/jpeg",
            "png"           => "image/png",
            "webp"          => "image/webp",
            "pdf"           => "application/pdf",
            _               => "image/jpeg"
        };

        var prompt = @"Bạn là hệ thống OCR chuyên bóc tách văn bản hành chính Việt Nam.
Hãy chép lại trung thực TOÀN BỘ nội dung nhìn thấy trong tài liệu, theo đúng thứ tự đọc và đúng từng trang.

Yêu cầu bắt buộc:
1. Giữ nguyên Quốc hiệu, Tiêu ngữ, tên cơ quan ban hành, số/ký hiệu, địa danh, ngày tháng, trích yếu và căn cứ pháp lý.
2. Giữ nguyên cấu trúc tiêu đề, đoạn văn, danh sách, mục/điều/khoản, bảng biểu; với bảng hãy dùng các cột ngăn bởi ký tự | và không bỏ sót ô.
3. Chép lại phần nơi nhận, chức vụ/thẩm quyền ký, họ tên người ký, nội dung chữ ký đọc được, dấu mộc và ghi chú viết tay. Mô tả phần không thể chép bằng nhãn [DẤU MỘC], [CHỮ KÝ] hoặc [KHÔNG ĐỌC RÕ].
4. Giữ nguyên chính tả, dấu tiếng Việt, chữ hoa/thường, số liệu, đơn vị, dấu câu và xuống dòng; không tự sửa hoặc diễn giải nội dung nguồn.
5. Với tài liệu nhiều trang, đặt dòng --- Trang N --- trước nội dung mỗi trang.
6. Không bịa nội dung. Nếu ký tự/từ không chắc chắn, dùng [KHÔNG ĐỌC RÕ] thay vì đoán.
7. Chỉ trả về văn bản thuần UTF-8; không Markdown, không code fence, không lời mở đầu, không nhận xét.";

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = prompt },
                        new { inlineData = new { mimeType, data = base64Image } }
                    }
                }
            },
            generationConfig = new { temperature = 0.1, maxOutputTokens = 8192 }
        };

        var json   = JsonSerializer.Serialize(requestBody);
        var url    = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
        var client = _httpClientFactory.CreateClient("Gemini");
        client.Timeout = TimeSpan.FromSeconds(60);

        _logger.LogInformation("Calling Gemini Vision API with model {Model}", model);

        HttpResponseMessage? response  = null;
        string responseBody            = string.Empty;
        Exception? lastException       = null;
        const int maxAttempts          = 3;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                using var content = new StringContent(json, Encoding.UTF8, "application/json");
                response     = await client.PostAsync(url, content);
                responseBody = await response.Content.ReadAsStringAsync();
                if (response.IsSuccessStatusCode) break;

                var transient = response.StatusCode is HttpStatusCode.RequestTimeout or HttpStatusCode.TooManyRequests
                    || (int)response.StatusCode >= 500;
                lastException = new HttpRequestException(
                    $"Gemini API lỗi {(int)response.StatusCode}: {responseBody}", null, response.StatusCode);
                if (!transient)
                    throw new InvalidOperationException($"Gemini API từ chối yêu cầu ({(int)response.StatusCode}): {responseBody}");
                if (attempt == maxAttempts) throw lastException;

                var delay = response.Headers.RetryAfter?.Delta ?? TimeSpan.FromSeconds(Math.Pow(2, attempt - 1));
                _logger.LogWarning(
                    "Gemini transient error {StatusCode}; retry {Next}/{Max} after {Delay} ms.",
                    response.StatusCode, attempt + 1, maxAttempts, delay.TotalMilliseconds);
                response.Dispose();
                response = null;
                await Task.Delay(delay);
            }
            catch (Exception ex) when ((ex is HttpRequestException or TaskCanceledException) && attempt < maxAttempts)
            {
                lastException = ex;
                var delay = TimeSpan.FromSeconds(Math.Pow(2, attempt - 1));
                _logger.LogWarning(ex, "Gemini network error; retry {Next}/{Max} after {Delay} ms.",
                    attempt + 1, maxAttempts, delay.TotalMilliseconds);
                await Task.Delay(delay);
            }
        }

        if (response is null || !response.IsSuccessStatusCode)
            throw lastException ?? new HttpRequestException("Gemini API không trả về kết quả sau 3 lần thử.");

        using (response)
        {
            _logger.LogInformation("Gemini OCR completed successfully.");
        }

        using var doc  = JsonDocument.Parse(responseBody);
        var text = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString() ?? string.Empty;

        return text.Trim();
    }

    public void Dispose() { }
}

// ─────────────────────────────────────────────────────────────────────────────
// Supporting records
// ─────────────────────────────────────────────────────────────────────────────

public sealed record OcrExtractionResult(
    string Text,
    string Engine,
    bool UsedFallback,
    string Note);

public sealed record OcrPdfGenerationRequest(
    string OutputPath,
    string Text,
    string? Code,
    string? Title,
    string? SourceFileName,
    string? Engine);
