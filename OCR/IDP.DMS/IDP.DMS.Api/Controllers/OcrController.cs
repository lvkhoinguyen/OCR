using System.Text.RegularExpressions;
using System.Text.Json;
using IDP.DMS.Api.Models;
using IDP.DMS.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace IDP.DMS.Api.Controllers
{
    [ApiController]
    [Route("api/ocr")]
    [Tags("OCR Engine")]
    public class OcrController : ControllerBase
    {
        private readonly OcrService _ocrService;
        private readonly OracleDmsService _dmsService;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<OcrController> _logger;

        public OcrController(
            OcrService ocrService,
            OracleDmsService dmsService,
            IWebHostEnvironment env,
            ILogger<OcrController> logger)
        {
            _ocrService = ocrService;
            _dmsService = dmsService;
            _env = env;
            _logger = logger;
        }

        /// <summary>
        /// Bóc tách văn bản từ file ảnh/PDF bằng Gemini Vision AI.
        /// </summary>
        [HttpPost("extract")]
        public async Task<IActionResult> ExtractOcrText(IFormFile file, [FromQuery] string? engine)
        {
            if (file == null || file.Length == 0) return BadRequest("No file uploaded.");

            const string engineName = "gemini";
            var tempFolder = Path.Combine(_env.ContentRootPath, "temp_ocr");
            Directory.CreateDirectory(tempFolder);

            var ext = Path.GetExtension(file.FileName);
            var filePath = Path.Combine(tempFolder, $"{Guid.NewGuid():N}{ext}");

            try
            {
                await using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var extraction = _ocrService.ExtractTextDetailed(filePath, engineName, forceGemini: true);

                return Ok(new
                {
                    text = extraction.Text,
                    engine = extraction.Engine,
                    usedFallback = extraction.UsedFallback,
                    message = extraction.Note
                });
            }
            catch (Exception ex)
            {
                return Problem($"Lỗi OCR ({engineName}): {ex.Message}");
            }
            finally
            {
                if (System.IO.File.Exists(filePath))
                    System.IO.File.Delete(filePath);
            }
        }

        /// <summary>
        /// Xử lý AI OCR bóc tách metadata có cấu trúc (Số VB, Ngày, Trích yếu, Cơ quan, Người ký).
        /// Tiếp nhận DocumentId hoặc tệp tải lên trực tiếp.
        /// </summary>
        [HttpPost("process")]
        public async Task<IActionResult> ProcessOcr(
            [FromQuery] long? documentId,
            [FromQuery] string? engine)
        {
            IFormFile? file = null;
            long? targetDocId = documentId;
            string targetEngine = string.IsNullOrWhiteSpace(engine) ? "gemini" : engine.Trim();
            string? tempFilePath = null;
            string filePath = string.Empty;
            string originalFileName = string.Empty;

            try
            {
                // Kiểm tra form data nếu có
                if (Request.HasFormContentType)
                {
                    var form = await Request.ReadFormAsync();
                    if (form.Files.Count > 0)
                    {
                        file = form.Files["file"] ?? form.Files[0];
                    }
                    if (!targetDocId.HasValue && form.TryGetValue("documentId", out var formDocIdStr) &&
                        long.TryParse(formDocIdStr, out var parsedDocId))
                    {
                        targetDocId = parsedDocId;
                    }
                    if (form.TryGetValue("engine", out var formEngine) && !string.IsNullOrWhiteSpace(formEngine))
                    {
                        targetEngine = formEngine.ToString();
                    }
                }
                // Hoặc parse body JSON nếu có
                else if (!targetDocId.HasValue && Request.ContentType?.Contains("json") == true)
                {
                    using var reader = new StreamReader(Request.Body);
                    var bodyText = await reader.ReadToEndAsync();
                    if (!string.IsNullOrWhiteSpace(bodyText))
                    {
                        try
                        {
                            using var doc = JsonDocument.Parse(bodyText);
                            if (doc.RootElement.TryGetProperty("documentId", out var docIdProp) && docIdProp.TryGetInt64(out var jsonDocId))
                            {
                                targetDocId = jsonDocId;
                            }
                            if (doc.RootElement.TryGetProperty("engine", out var engineProp) && engineProp.ValueKind == JsonValueKind.String)
                            {
                                targetEngine = engineProp.GetString() ?? targetEngine;
                            }
                        }
                        catch { /* JSON parse error handled gracefully */ }
                    }
                }

                var uploadsFolder = Path.Combine(_env.ContentRootPath, "uploads");
                Directory.CreateDirectory(uploadsFolder);

                string? newlyUploadedName = null;
                // TH1: Tải file mới lên
                if (file != null && file.Length > 0)
                {
                    originalFileName = file.FileName;
                    var ext = Path.GetExtension(file.FileName);
                    var savedName = $"{targetDocId?.ToString() ?? "ocr"}_{DateTime.UtcNow:yyyyMMddHHmmssfff}{ext}";
                    newlyUploadedName = savedName;
                    filePath = Path.Combine(uploadsFolder, savedName);
                    await using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await file.CopyToAsync(stream);
                    }

                    if (targetDocId.HasValue)
                    {
                        await _dmsService.UpdateDocumentFileOcrAsync(targetDocId.Value, savedName, "PROCESSING", string.Empty);
                    }
                }
                // TH2: Truy vấn theo documentId đã có sẵn file trên hệ thống
                else if (targetDocId.HasValue)
                {
                    var doc = await _dmsService.GetDocumentAsync(targetDocId.Value);
                    if (doc == null)
                    {
                        return NotFound(new { success = false, message = $"Không tìm thấy tài liệu #{targetDocId.Value}." });
                    }

                    if (string.IsNullOrWhiteSpace(doc.FileName))
                    {
                        return BadRequest(new { success = false, message = $"Tài liệu {doc.Code} chưa có tệp đính kèm." });
                    }

                    originalFileName = doc.FileName;
                    filePath = Path.Combine(uploadsFolder, doc.FileName);
                    if (!System.IO.File.Exists(filePath))
                    {
                        // Thử tìm theo mẫu ID trong thư mục uploads
                        var candidate = Directory.GetFiles(uploadsFolder, $"{targetDocId.Value}_*").FirstOrDefault();
                        if (candidate != null && System.IO.File.Exists(candidate))
                        {
                            filePath = candidate;
                        }
                        else
                        {
                            return BadRequest(new { success = false, message = $"Không tìm thấy tệp '{doc.FileName}' trong thư mục lưu trữ." });
                        }
                    }
                }
                else
                {
                    return BadRequest(new { success = false, message = "Vui lòng cung cấp DocumentId hoặc tải tệp lên để OCR." });
                }

                // Thực hiện bóc tách AI OCR theo engine được yêu cầu (hỗ trợ chế độ ngoại tuyến Tesseract/VietOCR)
                DigitizeMetadataResult extraction;
                if (targetEngine.Equals("tesseract", StringComparison.OrdinalIgnoreCase) ||
                    targetEngine.Equals("vietocr", StringComparison.OrdinalIgnoreCase) ||
                    targetEngine.Equals("fallback", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogInformation("Engine '{Engine}' được chỉ định, thực thi bóc tách cục bộ...", targetEngine);
                    extraction = RunFallbackExtraction(filePath);
                }
                else
                {
                    try
                    {
                        extraction = await _ocrService.ExtractStructuredMetadataAsync(filePath);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Gemini OCR gặp lỗi trên {Path}. Đang chuyển sang cơ chế fallback...", filePath);
                        extraction = RunFallbackExtraction(filePath);
                    }
                }

                // Nếu có targetDocId -> Cập nhật Database
                if (targetDocId.HasValue)
                {
                    var encoded = OracleDmsService.EncodeDescription(extraction.Metadata, originalFileName, extraction.FullText);
                    var storedDescription = TrimTextToBytes(encoded, 3900);

                    try
                    {
                        if (!string.IsNullOrWhiteSpace(newlyUploadedName))
                        {
                            await _dmsService.UpdateDocumentFileOcrAsync(targetDocId.Value, newlyUploadedName, "DONE", storedDescription);
                        }
                        else
                        {
                            await _dmsService.UpdateDocumentOcrAsync(targetDocId.Value, "DONE", storedDescription);
                        }
                    }
                    catch (Exception ex) when (ex.Message.Contains("ORA-12899"))
                    {
                        var fallbackDesc = TrimTextToBytes(encoded, 980);
                        if (!string.IsNullOrWhiteSpace(newlyUploadedName))
                        {
                            await _dmsService.UpdateDocumentFileOcrAsync(targetDocId.Value, newlyUploadedName, "DONE", fallbackDesc);
                        }
                        else
                        {
                            await _dmsService.UpdateDocumentOcrAsync(targetDocId.Value, "DONE", fallbackDesc);
                        }
                    }
                }

                return Ok(new
                {
                    success = true,
                    documentId = targetDocId,
                    documentNumber = extraction.Metadata.DocumentNumber ?? string.Empty,
                    issueDate = extraction.Metadata.IssueDate ?? string.Empty,
                    issuingAuthority = extraction.Metadata.IssuingAuthority ?? string.Empty,
                    subject = extraction.Metadata.Subject ?? string.Empty,
                    signer = extraction.Metadata.Signer ?? string.Empty,
                    text = extraction.FullText,
                    engine = extraction.Engine,
                    ocrStatus = "DONE",
                    message = "Bóc tách AI OCR thành công."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi chạy OCR process");
                return Problem($"Lỗi khi bóc tách OCR: {ex.Message}");
            }
            finally
            {
                if (!string.IsNullOrWhiteSpace(tempFilePath) && System.IO.File.Exists(tempFilePath))
                {
                    try { System.IO.File.Delete(tempFilePath); } catch { }
                }
            }
        }

        /// <summary>
        /// Xác nhận & Lưu kết quả đối soát OCR, cập nhật thông tin hiệu chỉnh vào Database.
        /// Chuyển trạng thái OCR thành CONFIRMED.
        /// </summary>
        [HttpPost("confirm")]
        public async Task<IActionResult> ConfirmOcr([FromBody] OcrConfirmationRequest request)
        {
            if (request == null || request.DocumentId <= 0)
            {
                return BadRequest(new { success = false, message = "DocumentId là bắt buộc." });
            }

            var doc = await _dmsService.GetDocumentAsync(request.DocumentId);
            if (doc == null)
            {
                return NotFound(new { success = false, message = $"Không tìm thấy tài liệu #{request.DocumentId}." });
            }

            var meta = new DigitizeMetadata(
                request.DocumentNumber?.Trim(),
                request.IssueDate?.Trim(),
                request.IssuingAuthority?.Trim(),
                request.Subject?.Trim(),
                request.Signer?.Trim());

            var (_, _, existingFullText) = OracleDmsService.DecodeDescription(doc.Description);
            var fullText = !string.IsNullOrWhiteSpace(request.FullText) ? request.FullText : existingFullText;
            var encoded = OracleDmsService.EncodeDescription(meta, doc.FileName, fullText);
            var storedDescription = TrimTextToBytes(encoded, 3900);

            var actor = string.IsNullOrWhiteSpace(request.Actor) ? "current-user" : request.Actor.Trim();

            await _dmsService.CreateDocumentVersionAsync(request.DocumentId, new DocumentVersionRequest(
                actor, string.IsNullOrWhiteSpace(request.Note) ? "Xác nhận đối soát dữ liệu OCR" : request.Note));

            try
            {
                await _dmsService.UpdateDocumentOcrAsync(request.DocumentId, "CONFIRMED", storedDescription);
            }
            catch (Exception ex) when (ex.Message.Contains("ORA-12899"))
            {
                var fallbackDesc = TrimTextToBytes(encoded, 980);
                await _dmsService.UpdateDocumentOcrAsync(request.DocumentId, "CONFIRMED", fallbackDesc);
            }

            return Ok(new
            {
                success = true,
                documentId = request.DocumentId,
                documentNumber = meta.DocumentNumber,
                issueDate = meta.IssueDate,
                issuingAuthority = meta.IssuingAuthority,
                subject = meta.Subject,
                signer = meta.Signer,
                ocrStatus = "CONFIRMED",
                message = "Đã xác nhận và lưu dữ liệu đối soát thành công."
            });
        }

        /// <summary>
        /// Fallback bóc tách metadata từ PDF text-layer hoặc EasyOCR khi Gemini không phản hồi.
        /// </summary>
        private DigitizeMetadataResult RunFallbackExtraction(string filePath)
        {
            var ext = Path.GetExtension(filePath).ToLowerInvariant();
            string text = string.Empty;

            if (ext == ".pdf" && System.IO.File.Exists(filePath))
            {
                try
                {
                    using var pdf = UglyToad.PdfPig.PdfDocument.Open(filePath);
                    var sb = new System.Text.StringBuilder();
                    foreach (var page in pdf.GetPages())
                    {
                        sb.AppendLine(page.Text);
                    }
                    text = sb.ToString().Trim();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "PdfPig không đọc được text layer từ {Path}", filePath);
                }
            }

            if (string.IsNullOrWhiteSpace(text))
            {
                try
                {
                    var fallbackRes = _ocrService.ExtractWithEasyOcrFallback(filePath);
                    text = fallbackRes.FullText;
                    if (!string.IsNullOrWhiteSpace(fallbackRes.Metadata.DocumentNumber))
                    {
                        return fallbackRes;
                    }
                }
                catch { }
            }

            // Phân tích văn bản bằng regex hành chính Việt Nam
            string? docNumber = null;
            string? issueDate = null;
            string? issuingAuthority = null;
            string? subject = null;
            string? signer = null;

            if (!string.IsNullOrWhiteSpace(text))
            {
                // Số / Ký hiệu
                var mDocNum = Regex.Match(text, @"(?:Số|Số/Ký hiệu|Số hiệu)\s*[:：\.]?\s*([0-9A-Z_/\-\.\s]{2,30})", RegexOptions.IgnoreCase);
                if (mDocNum.Success) docNumber = mDocNum.Groups[1].Value.Trim();

                // Ngày ban hành
                var mDate1 = Regex.Match(text, @"ngày\s+([0-9]{1,2})\s+tháng\s+([0-9]{1,2})\s+năm\s+([0-9]{4})", RegexOptions.IgnoreCase);
                if (mDate1.Success)
                {
                    var d = mDate1.Groups[1].Value.PadLeft(2, '0');
                    var m = mDate1.Groups[2].Value.PadLeft(2, '0');
                    var y = mDate1.Groups[3].Value;
                    issueDate = $"{d}/{m}/{y}";
                }
                else
                {
                    var mDate2 = Regex.Match(text, @"\b([0-9]{1,2}[/\-\.][0-9]{1,2}[/\-\.][0-9]{4})\b");
                    if (mDate2.Success) issueDate = mDate2.Groups[1].Value.Trim();
                }

                // Cơ quan ban hành
                var mAuthority = Regex.Match(text, @"(?:\bỦY BAN NHÂN DÂN[^\r\n]*|\bBỘ\s+[A-ZÀ-Ỵ\s]+|\bSỞ\s+[A-ZÀ-Ỵ\s]+|\bCÔNG TY[^\r\n]*)", RegexOptions.IgnoreCase);
                if (mAuthority.Success) issuingAuthority = mAuthority.Value.Trim();

                // Trích yếu
                var mSubj = Regex.Match(text, @"(?:V/v|Về việc|Trích yếu)\s*[:：\.]?\s*([^\r\n]+)", RegexOptions.IgnoreCase);
                if (mSubj.Success) subject = mSubj.Groups[1].Value.Trim();

                // Người ký
                var mSigner = Regex.Match(text, @"(?:CHỦ TỊCH|GIÁM ĐỐC|THỦ TRƯỞNG|KT\.\s*CHỦ TỊCH|TM\.\s*ỦY BAN NHÂN DÂN)[\r\n\s]+(?:[^\r\n]*[\r\n\s]+)?([A-ZÀ-Ỵ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỵ][a-zà-ỹ]+){1,4})", RegexOptions.Multiline);
                if (mSigner.Success) signer = mSigner.Groups[1].Value.Trim();
            }

            var metadata = new DigitizeMetadata(docNumber, issueDate, issuingAuthority, subject, signer);
            return new DigitizeMetadataResult(metadata, text, "fallback-rule");
        }

        private static string TrimTextToBytes(string value, int maxBytes)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            var bytes = System.Text.Encoding.UTF8.GetBytes(value);
            if (bytes.Length <= maxBytes) return value;

            var chars = value.ToCharArray();
            int len = chars.Length;
            while (len > 0 && System.Text.Encoding.UTF8.GetByteCount(chars, 0, len) > Math.Max(0, maxBytes - 3))
            {
                len--;
            }
            return new string(chars, 0, len) + "…";
        }
    }

    public sealed record OcrConfirmationRequest(
        long DocumentId,
        string? DocumentNumber,
        string? IssueDate,
        string? IssuingAuthority,
        string? Subject,
        string? Signer,
        string? FullText,
        string? Actor,
        string? Note);
}
