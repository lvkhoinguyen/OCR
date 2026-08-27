using System.Net.Http.Headers;
using System.Net;
using System.Text;
using System.Text.Json;
using System.IO.Compression;
using System.Xml.Linq;
using IDP.DMS.Api.Models;

namespace IDP.DMS.Api.Services;

public class OcrService : IDisposable
{
    private readonly ILogger<OcrService> _logger;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _contentRootPath;

    public OcrService(
        IWebHostEnvironment env,
        ILogger<OcrService> logger,
        IConfiguration config,
        IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _config = config;
        _httpClientFactory = httpClientFactory;
        _contentRootPath = env.ContentRootPath;
    }

    /// <summary>
    /// Extract text from an image or PDF file using the specified OCR engine.
    /// </summary>
    /// <param name="imagePath">Path to the image or PDF file</param>
    /// <param name="engine">OCR engine: "easyocr", "crnn", "vietocr", "gemini"</param>
    public string ExtractText(string imagePath, string engine = "easyocr")
    {
        if (!File.Exists(imagePath))
        {
            _logger.LogWarning("File not found for OCR: {Path}", imagePath);
            return string.Empty;
        }

        try
        {
            // DOCX là gói OpenXML; đọc trực tiếp nội dung thay vì gửi tệp nén vào engine ảnh.
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
                        .Select(paragraph => string.Concat(paragraph.Descendants(word + "t").Select(node => node.Value)))
                        .Where(text => !string.IsNullOrWhiteSpace(text)));
            }

            // PDF số: đọc text layer trực tiếp. PDF scan sẽ đi tiếp xuống Python để render từng trang.
            if (imagePath.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            {
                using var pdf = UglyToad.PdfPig.PdfDocument.Open(imagePath);
                var sb = new System.Text.StringBuilder();
                foreach (var page in pdf.GetPages())
                    sb.AppendLine(page.Text);
                var pdfText = sb.ToString().Trim();
                if (!string.IsNullOrWhiteSpace(pdfText)) return pdfText;
            }

            // Gemini Vision API — gọi thẳng từ C#, không qua Python (nếu có ApiKey)
            if (engine.Equals("gemini", StringComparison.OrdinalIgnoreCase))
            {
                if (imagePath.EndsWith(".tif", StringComparison.OrdinalIgnoreCase) ||
                    imagePath.EndsWith(".tiff", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogInformation("Gemini does not accept TIFF directly. Falling back to EasyOCR.");
                    engine = "easyocr";
                }
                var apiKey = _config["Gemini:ApiKey"];
                if (engine.Equals("gemini", StringComparison.OrdinalIgnoreCase) &&
                    !string.IsNullOrWhiteSpace(apiKey) && apiKey != "YOUR_GEMINI_API_KEY_HERE")
                {
                    return ExtractTextWithGemini(imagePath).GetAwaiter().GetResult();
                }
                if (engine.Equals("gemini", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("Gemini API key is not configured. Falling back to vietocr.");
                    engine = "vietocr";
                }
            }

            // Các engine Python; script tự render PDF scan và TIFF nhiều trang.
            var validEngines = new[] { "easyocr", "crnn", "vietocr", "tesseract" };
            if (!validEngines.Contains(engine.ToLowerInvariant()))
            {
                _logger.LogWarning("Invalid OCR engine '{Engine}', falling back to easyocr", engine);
                engine = "easyocr";
            }

            _logger.LogInformation("Running OCR with engine '{Engine}' on file: {Path}", engine, imagePath);
            var timeoutMs = engine == "easyocr" ? 120000 : 300000;
            return RunPython(["--engine", engine, imagePath], timeoutMs, $"OCR engine '{engine}'").Trim();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing image for OCR (engine={Engine}): {Path}", engine, imagePath);
            throw;
        }
    }

    public OcrExtractionResult ExtractTextDetailed(string filePath, string engine = "easyocr", bool forceGemini = false)
    {
        if (!File.Exists(filePath))
            throw new FileNotFoundException("Không tìm thấy file cần OCR.", filePath);

        if (forceGemini)
        {
            var configuredGeminiKey = _config["Gemini:ApiKey"];
            var supportedExtensions = new[] { ".png", ".jpg", ".jpeg", ".webp", ".pdf" };
            var extension = Path.GetExtension(filePath);
            if (string.IsNullOrWhiteSpace(configuredGeminiKey) || configuredGeminiKey == "YOUR_GEMINI_API_KEY_HERE")
                throw new InvalidOperationException("Chưa cấu hình Gemini API Key. Vui lòng liên hệ quản trị viên để cấu hình Gemini.");
            if (!supportedExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
                throw new InvalidOperationException("Gemini chỉ hỗ trợ PDF, PNG, JPG/JPEG hoặc WEBP trong chức năng bóc tách này.");

            var text = ExtractTextWithGemini(filePath).GetAwaiter().GetResult();
            if (string.IsNullOrWhiteSpace(text))
                throw new InvalidOperationException("Gemini không nhận diện được nội dung chữ trong tài liệu.");
            return new OcrExtractionResult(text, "gemini", false, "Bóc tách thành công bằng Gemini.");
        }

        if (filePath.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            using var pdf = UglyToad.PdfPig.PdfDocument.Open(filePath);
            var textLayer = string.Join(Environment.NewLine, pdf.GetPages().Select(page => page.Text)).Trim();
            if (!string.IsNullOrWhiteSpace(textLayer))
            {
                _logger.LogInformation("Extracted PDF text layer directly with PdfPig: {Path}", filePath);
                return new OcrExtractionResult(textLayer, "pdfpig", false, "Đọc trực tiếp text layer PDF bằng PdfPig.");
            }
            _logger.LogInformation("PDF has no text layer; activating scanned-PDF OCR chain: {Path}", filePath);
        }

        if (filePath.EndsWith(".docx", StringComparison.OrdinalIgnoreCase))
        {
            var docxText = ExtractText(filePath, "easyocr");
            if (string.IsNullOrWhiteSpace(docxText))
                throw new InvalidOperationException("Không đọc được nội dung chữ từ file DOCX.");
            return new OcrExtractionResult(docxText, "docx-text", false, "Đọc trực tiếp nội dung OpenXML của DOCX.");
        }

        var requestedEngine = string.IsNullOrWhiteSpace(engine) ? "easyocr" : engine.Trim().ToLowerInvariant();
        var geminiKey = _config["Gemini:ApiKey"];
        var geminiConfigured = !string.IsNullOrWhiteSpace(geminiKey) && geminiKey != "YOUR_GEMINI_API_KEY_HERE";
        var geminiCompatibleFile = new[] { ".png", ".jpg", ".jpeg", ".webp", ".pdf" }
            .Contains(Path.GetExtension(filePath), StringComparer.OrdinalIgnoreCase);
        var candidates = new List<string>();

        if (requestedEngine == "gemini" && geminiConfigured && geminiCompatibleFile)
            candidates.Add("gemini");
        else if (requestedEngine == "gemini")
            _logger.LogWarning("Gemini API key is missing. Activating local OCR fallback chain.");
        else if (new[] { "vietocr", "easyocr", "tesseract", "crnn" }.Contains(requestedEngine))
            candidates.Add(requestedEngine);

        candidates.AddRange(new[] { "vietocr", "easyocr", "tesseract" });
        var distinctCandidates = candidates.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var failures = new List<string>();

        foreach (var candidate in distinctCandidates)
        {
            try
            {
                var text = ExtractText(filePath, candidate);
                if (string.IsNullOrWhiteSpace(text))
                    throw new InvalidOperationException("Engine không nhận diện được nội dung chữ.");
                var usedFallback = !candidate.Equals(requestedEngine, StringComparison.OrdinalIgnoreCase);
                var note = usedFallback
                    ? $"Engine '{requestedEngine}' không khả dụng; đã tự động fallback sang '{candidate}'."
                    : $"OCR thành công bằng engine '{candidate}'.";
                return new OcrExtractionResult(text, candidate, usedFallback, note);
            }
            catch (Exception ex)
            {
                failures.Add($"{candidate}: {ex.Message}");
                _logger.LogWarning(ex, "OCR candidate {Engine} failed; trying the next engine.", candidate);
            }
        }

        throw new InvalidOperationException($"Tất cả OCR engine đều thất bại. {string.Join(" | ", failures)}");
    }

    public OcrPagePreviewResult RenderPagePreview(string filePath, int page)
    {
        if (!File.Exists(filePath))
            throw new FileNotFoundException("Không tìm thấy file cần xem trước OCR.", filePath);
        if (page < 1)
            throw new BusinessRuleException("Số trang xem trước phải lớn hơn hoặc bằng 1.");

        var previewPath = Path.Combine(Path.GetTempPath(), $"idpdms_preview_{Guid.NewGuid():N}.png");
        try
        {
            var output = RunPython([
                "--render-page",
                "--page", page.ToString(System.Globalization.CultureInfo.InvariantCulture),
                "--output", previewPath,
                filePath
            ], 120000, "Render trang xem trước OCR");
            var metadata = JsonSerializer.Deserialize<PythonOcrPagePreview>(output,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? throw new InvalidOperationException("Python không trả về metadata trang xem trước.");
            if (!File.Exists(previewPath))
                throw new InvalidOperationException("Python không tạo được ảnh xem trước OCR.");
            return new OcrPagePreviewResult(
                File.ReadAllBytes(previewPath), metadata.Page, metadata.PageCount, metadata.Width, metadata.Height);
        }
        finally
        {
            try { File.Delete(previewPath); }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
    }

    public OcrZonesResultDto ExtractZones(
        long documentId,
        string documentCode,
        string filePath,
        OcrZonesRequest request)
    {
        if (!File.Exists(filePath))
            throw new FileNotFoundException("Không tìm thấy file nguồn để OCR theo vùng.", filePath);

        var requestedEngine = string.IsNullOrWhiteSpace(request.Engine)
            ? "vietocr"
            : request.Engine.Trim().ToLowerInvariant();
        if (requestedEngine is not ("gemini" or "vietocr" or "tesseract" or "easyocr" or "crnn"))
            throw new BusinessRuleException("Engine OCR vùng chỉ hỗ trợ Gemini, VietOCR, Tesseract, EasyOCR hoặc CRNN.");
        if (request.Zones.Count is < 1 or > 12)
            throw new BusinessRuleException("Mỗi lần OCR phải có từ 1 đến 12 vùng.");

        var allowedFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "documentNumber", "issueDate", "issuingAuthority", "subject", "signer"
        };
        if (request.Zones.Any(zone => !allowedFields.Contains(zone.FieldKey)))
            throw new BusinessRuleException("Nhãn vùng OCR không thuộc danh sách trường metadata được hỗ trợ.");
        if (request.Zones.Select(zone => zone.Id).Distinct(StringComparer.OrdinalIgnoreCase).Count() != request.Zones.Count)
            throw new BusinessRuleException("Mã định danh của các vùng OCR không được trùng nhau.");
        if (request.Zones.Any(zone => zone.X + zone.Width > 100 || zone.Y + zone.Height > 100))
            throw new BusinessRuleException("Tọa độ vùng OCR phải nằm hoàn toàn trong trang tài liệu.");

        var workingFolder = Path.Combine(Path.GetTempPath(), $"idpdms_zones_{Guid.NewGuid():N}");
        var cropsFolder = Path.Combine(workingFolder, "crops");
        var requestPath = Path.Combine(workingFolder, "zones.json");
        var outputPath = Path.Combine(workingFolder, "result.json");
        Directory.CreateDirectory(cropsFolder);
        try
        {
            File.WriteAllText(requestPath, JsonSerializer.Serialize(new { zones = request.Zones },
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }), new UTF8Encoding(false));
            RunPython([
                "--ocr-zones",
                "--engine", requestedEngine,
                "--zones-file", requestPath,
                "--zones-output", outputPath,
                "--crops-dir", cropsFolder,
                filePath
            ], 300000, $"OCR {request.Zones.Count} vùng bằng '{requestedEngine}'");

            if (!File.Exists(outputPath))
                throw new InvalidOperationException("Python không trả về kết quả OCR theo vùng.");
            var pythonOutput = JsonSerializer.Deserialize<PythonOcrZonesOutput>(
                File.ReadAllText(outputPath, Encoding.UTF8),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? throw new InvalidOperationException("Kết quả OCR theo vùng không hợp lệ.");

            var results = new List<OcrZoneResultDto>(pythonOutput.Zones.Count);
            foreach (var zone in pythonOutput.Zones)
            {
                var text = zone.Text?.Trim() ?? string.Empty;
                var actualEngine = zone.Engine ?? pythonOutput.Engine;
                if (requestedEngine == "gemini")
                {
                    var cropName = Path.GetFileName(zone.CropFileName);
                    if (string.IsNullOrWhiteSpace(cropName))
                        throw new InvalidOperationException($"Python không trả về ảnh crop của vùng '{zone.Label}'.");
                    var cropPath = Path.Combine(cropsFolder, cropName);
                    if (!File.Exists(cropPath))
                        throw new InvalidOperationException($"Không tìm thấy ảnh crop của vùng '{zone.Label}'.");
                    var extraction = ExtractTextDetailed(cropPath, "gemini");
                    text = extraction.Text.Trim();
                    actualEngine = extraction.Engine;
                }

                results.Add(new OcrZoneResultDto(
                    zone.Id, zone.FieldKey, zone.Label, zone.Page,
                    zone.X, zone.Y, zone.Width, zone.Height,
                    zone.PixelX, zone.PixelY, zone.PixelWidth, zone.PixelHeight,
                    text, actualEngine));
            }

            var metadata = results
                .GroupBy(zone => zone.FieldKey, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(
                    group => group.Key,
                    group => string.Join(Environment.NewLine, group.Select(zone => zone.Text).Where(text => !string.IsNullOrWhiteSpace(text))),
                    StringComparer.OrdinalIgnoreCase);
            return new OcrZonesResultDto(
                documentId, documentCode, requestedEngine, metadata, results, DateTime.UtcNow);
        }
        finally
        {
            try { Directory.Delete(workingFolder, recursive: true); }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
    }

    public void GenerateDigitizedPdf(OcrPdfGenerationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.OutputPath))
            throw new ArgumentException("Đường dẫn PDF đầu ra là bắt buộc.", nameof(request));
        if (string.IsNullOrWhiteSpace(request.Text))
            throw new ArgumentException("Nội dung OCR để sinh PDF là bắt buộc.", nameof(request));

        Directory.CreateDirectory(Path.GetDirectoryName(request.OutputPath)
            ?? throw new InvalidOperationException("Không xác định được thư mục PDF đầu ra."));

        var temporaryTextPath = Path.Combine(Path.GetTempPath(), $"idpdms_ocr_{Guid.NewGuid():N}.txt");
        try
        {
            File.WriteAllText(temporaryTextPath, request.Text, new UTF8Encoding(false));
            var arguments = new List<string>
            {
                "--generate-pdf",
                "--output", request.OutputPath,
                "--text-file", temporaryTextPath,
                "--code", request.Code ?? string.Empty,
                "--title", request.Title ?? string.Empty,
                "--source", request.SourceFileName ?? string.Empty,
                "--ocr-engine", request.Engine ?? string.Empty,
                "--created-at", DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss")
            };

            var normalFont = _config["Ocr:PdfFont"];
            var boldFont = _config["Ocr:PdfBoldFont"];
            if (!string.IsNullOrWhiteSpace(normalFont)) arguments.AddRange(["--font", normalFont]);
            if (!string.IsNullOrWhiteSpace(boldFont)) arguments.AddRange(["--bold-font", boldFont]);

            RunPython(arguments, 120000, "Sinh PDF số hóa Unicode");
            if (!File.Exists(request.OutputPath) || new FileInfo(request.OutputPath).Length == 0)
                throw new InvalidOperationException("Python không tạo được file PDF số hóa.");
        }
        finally
        {
            try { File.Delete(temporaryTextPath); }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
    }

    private string RunPython(IReadOnlyList<string> arguments, int timeoutMs, string operation)
    {
        var pythonScript = Path.Combine(_contentRootPath, "ocr_engine.py");
        if (!File.Exists(pythonScript))
            throw new FileNotFoundException("Không tìm thấy Python OCR engine.", pythonScript);

        var configuredPython = _config["Ocr:PythonExecutable"];
        var defaultPython = @"C:\Users\Hi\AppData\Local\Programs\Python\Python311\python.exe";
        var pythonExecutable = !string.IsNullOrWhiteSpace(configuredPython)
            ? configuredPython
            : File.Exists(defaultPython) ? defaultPython : "python";

        var start = new System.Diagnostics.ProcessStartInfo
        {
            FileName = pythonExecutable,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
            CreateNoWindow = true,
            WorkingDirectory = _contentRootPath
        };
        start.ArgumentList.Add(pythonScript);
        foreach (var argument in arguments) start.ArgumentList.Add(argument);

        using var process = System.Diagnostics.Process.Start(start)
            ?? throw new InvalidOperationException("Không thể khởi động Python OCR engine.");
        var outputTask = process.StandardOutput.ReadToEndAsync();
        var errorTask = process.StandardError.ReadToEndAsync();

        if (!process.WaitForExit(timeoutMs))
        {
            process.Kill(true);
            throw new TimeoutException($"{operation} vượt quá thời gian xử lý cho phép.");
        }

        Task.WaitAll(outputTask, errorTask);
        var output = outputTask.Result;
        var error = errorTask.Result;
        if (process.ExitCode != 0)
        {
            _logger.LogError("Python operation failed ({Operation}): {Error}", operation, error);
            throw new InvalidOperationException($"{operation} thất bại: {error.Trim()}");
        }

        return output;
    }

    /// <summary>
    /// Gọi Gemini Vision API để bóc tách chữ viết tay tiếng Việt từ ảnh.
    /// </summary>
    private async Task<string> ExtractTextWithGemini(string imagePath)
    {
        var apiKey = _config["Gemini:ApiKey"];
        var model = _config["Gemini:Model"] ?? "gemini-flash-latest";

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "YOUR_GEMINI_API_KEY_HERE")
            throw new Exception("Chưa cấu hình Gemini API Key. Vui lòng cập nhật 'Gemini:ApiKey' trong appsettings.json.");

        // Đọc ảnh và encode base64
        var imageBytes  = await File.ReadAllBytesAsync(imagePath);
        var base64Image = Convert.ToBase64String(imageBytes);
        var ext = Path.GetExtension(imagePath).TrimStart('.').ToLowerInvariant();
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

        // Tạo request body theo Gemini API format
        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = prompt },
                        new
                        {
                            inlineData = new
                            {
                                mimeType = mimeType,
                                data      = base64Image
                            }
                        }
                    }
                }
            },
            generationConfig = new
            {
                temperature     = 0.1,  // Thấp để kết quả ổn định, ít sáng tạo
                maxOutputTokens = 8192
            }
        };

        var json = JsonSerializer.Serialize(requestBody);

        var url    = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
        var client = _httpClientFactory.CreateClient("Gemini");
        client.Timeout = TimeSpan.FromSeconds(60);

        _logger.LogInformation("Calling Gemini Vision API with model {Model}", model);

        HttpResponseMessage? response = null;
        string responseBody = string.Empty;
        Exception? lastException = null;
        const int maxAttempts = 3;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                using var content = new StringContent(json, Encoding.UTF8, "application/json");
                response = await client.PostAsync(url, content);
                responseBody = await response.Content.ReadAsStringAsync();
                if (response.IsSuccessStatusCode) break;

                var transient = response.StatusCode is HttpStatusCode.RequestTimeout or HttpStatusCode.TooManyRequests
                    || (int)response.StatusCode >= 500;
                lastException = new HttpRequestException(
                    $"Gemini API lỗi {(int)response.StatusCode}: {responseBody}",
                    null,
                    response.StatusCode);
                if (!transient)
                    throw new InvalidOperationException($"Gemini API từ chối yêu cầu ({(int)response.StatusCode}): {responseBody}");
                if (attempt == maxAttempts) throw lastException;

                var delay = response.Headers.RetryAfter?.Delta
                    ?? TimeSpan.FromSeconds(Math.Pow(2, attempt - 1));
                _logger.LogWarning(
                    "Gemini transient error {StatusCode}; retry {NextAttempt}/{MaxAttempts} after {DelayMs} ms.",
                    response.StatusCode, attempt + 1, maxAttempts, delay.TotalMilliseconds);
                response.Dispose();
                response = null;
                await Task.Delay(delay);
            }
            catch (Exception ex) when ((ex is HttpRequestException or TaskCanceledException) && attempt < maxAttempts)
            {
                lastException = ex;
                var delay = TimeSpan.FromSeconds(Math.Pow(2, attempt - 1));
                _logger.LogWarning(ex,
                    "Gemini network error; retry {NextAttempt}/{MaxAttempts} after {DelayMs} ms.",
                    attempt + 1, maxAttempts, delay.TotalMilliseconds);
                await Task.Delay(delay);
            }
        }

        if (response is null || !response.IsSuccessStatusCode)
            throw lastException ?? new HttpRequestException("Gemini API không trả về kết quả sau 3 lần thử.");

        using (response)
        {
            _logger.LogInformation("Gemini OCR completed successfully after retry policy.");
        }

        // Parse kết quả từ Gemini response
        using var doc  = JsonDocument.Parse(responseBody);
        var candidates = doc.RootElement.GetProperty("candidates");
        var text       = candidates[0]
                            .GetProperty("content")
                            .GetProperty("parts")[0]
                            .GetProperty("text")
                            .GetString() ?? string.Empty;

        return text.Trim();
    }

    public void Dispose() { }
}

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

