using IDP.DMS.Api.Models;
using IDP.DMS.Api.Services;
using IDP.DMS.Api.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IDP.DMS.Api.Controllers
{
    [ApiController]
    [Route("api/dms")]
    [Authorize(Policy = AuthorizationPolicies.DmsAccess)]
    [Tags("IDP.DMS Data")]
    public class DmsController : ControllerBase
    {
        private static readonly HashSet<string> AllowedDocumentExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf", ".docx", ".tif", ".tiff", ".png", ".jpg", ".jpeg",
            ".ifc", ".stl", ".obj", ".step", ".stp"
        };

        private static readonly HashSet<string> OcrDocumentExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf", ".docx", ".tif", ".tiff", ".png", ".jpg", ".jpeg"
        };

        private static readonly HashSet<string> TechnicalModelExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".ifc", ".stl", ".obj", ".step", ".stp"
        };

        private const long MaxTechnicalModelBytes = 200L * 1024 * 1024;

        private static readonly IReadOnlyDictionary<string, long> UnitUploadLimits = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase)
        {
            ["DEFAULT"] = 25 * 1024 * 1024,
            ["HC"] = 20 * 1024 * 1024,
            ["TC"] = 30 * 1024 * 1024,
            ["QTHT"] = 50 * 1024 * 1024
        };

        private readonly OracleDmsService _dmsService;
        private readonly OcrService _ocrService;
        private readonly AuthService _authService;
        private readonly PdfSigningService _pdfSigningService;
        private readonly BatchImportService _batchImportService;
        private readonly IWebHostEnvironment _env;

        public DmsController(
            OracleDmsService dmsService,
            OcrService ocrService,
            AuthService authService,
            PdfSigningService pdfSigningService,
            BatchImportService batchImportService,
            IWebHostEnvironment env)
        {
            _dmsService = dmsService;
            _ocrService = ocrService;
            _authService = authService;
            _pdfSigningService = pdfSigningService;
            _batchImportService = batchImportService;
            _env = env;
        }

        #region Database Initialization & Resources Summary

        [HttpPost("initialize")]
        public async Task<IActionResult> InitializeDatabase()
        {
            await _dmsService.InitializeAsync();
            await _authService.InitializeAsync();
            return Ok(new { message = "Database tables are ready." });
        }

        [HttpGet("resources")]
        public IActionResult GetResources()
        {
            var resources = _dmsService.GetResources().Select(x => new { key = x.Key, table = x.Value });
            return Ok(resources);
        }

        #endregion

        #region Storage Locations CRUD

        [HttpGet("storage-locations")]
        public async Task<IActionResult> GetStorageLocations()
        {
            return Ok(await _dmsService.GetStorageLocationsAsync());
        }

        [HttpGet("storage-locations/{id:long}")]
        public async Task<IActionResult> GetStorageLocation(long id)
        {
            var item = await _dmsService.GetStorageLocationAsync(id);
            return item is null ? NotFound() : Ok(item);
        }

        [HttpPost("storage-locations")]
        public async Task<IActionResult> CreateStorageLocation([FromBody] StorageLocationRequest request)
        {
            var id = await _dmsService.CreateStorageLocationAsync(request);
            var item = await _dmsService.GetStorageLocationAsync(id);
            return Created($"/api/dms/storage-locations/{id}", item);
        }

        [HttpPut("storage-locations/{id:long}")]
        public async Task<IActionResult> UpdateStorageLocation(long id, [FromBody] StorageLocationRequest request)
        {
            var affected = await _dmsService.UpdateStorageLocationAsync(id, request);
            return affected == 0 ? NotFound() : NoContent();
        }

        [HttpDelete("storage-locations/{id:long}")]
        public async Task<IActionResult> DeleteStorageLocation(long id)
        {
            var affected = await _dmsService.DeleteStorageLocationAsync(id);
            return affected == 0 ? NotFound() : NoContent();
        }

        #endregion

        #region Dossiers CRUD

        [HttpGet("dossiers")]
        public async Task<IActionResult> GetDossiers()
        {
            return Ok(await _dmsService.GetDossiersAsync());
        }

        [HttpGet("dossiers/{id:long}")]
        public async Task<IActionResult> GetDossier(long id)
        {
            var item = await _dmsService.GetDossierAsync(id);
            return item is null ? NotFound() : Ok(item);
        }

        [HttpPost("dossiers")]
        public async Task<IActionResult> CreateDossier([FromBody] DossierRequest request)
        {
            var id = await _dmsService.CreateDossierAsync(request);
            var item = await _dmsService.GetDossierAsync(id);
            return Created($"/api/dms/dossiers/{id}", item);
        }

        [HttpPut("dossiers/{id:long}")]
        public async Task<IActionResult> UpdateDossier(long id, [FromBody] DossierRequest request)
        {
            var affected = await _dmsService.UpdateDossierAsync(id, request);
            return affected == 0 ? NotFound() : NoContent();
        }

        [HttpDelete("dossiers/{id:long}")]
        public async Task<IActionResult> DeleteDossier(long id)
        {
            var affected = await _dmsService.DeleteDossierAsync(id);
            return affected == 0 ? NotFound() : NoContent();
        }

        [HttpGet("dossiers/batch-import-template")]
        public IActionResult DownloadBatchImportTemplate()
        {
            return File(
                BatchImportService.CreateExcelTemplate(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "DanhMucHoSo.xlsx");
        }

        [HttpPost("dossiers/batch-import-zip")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(270L * 1024 * 1024)]
        [RequestFormLimits(MultipartBodyLengthLimit = 270L * 1024 * 1024)]
        public async Task<IActionResult> BatchImportZip([FromForm] BatchImportZipRequest request, CancellationToken cancellationToken)
        {
            var actor = GetActorName();
            var result = await _batchImportService.ImportAsync(request, actor, cancellationToken);
            return Accepted($"/api/dms/dossiers/batch-import-jobs/{result.JobId}", result);
        }

        [HttpGet("dossiers/batch-import-jobs/{jobId:long}")]
        public async Task<IActionResult> GetBatchImportJob(long jobId)
        {
            var job = await _dmsService.GetBatchImportJobAsync(jobId);
            return job is null ? NotFound() : Ok(job);
        }

        [HttpGet("dossiers/batch-import-jobs")]
        public async Task<IActionResult> GetBatchImportJobs([FromQuery] int take = 20)
        {
            return Ok(await _dmsService.GetRecentBatchImportJobsAsync(take));
        }

        #endregion

        #region Documents & File Upload

        [HttpGet("documents")]
        public async Task<IActionResult> GetDocuments([FromQuery] long? dossierId)
        {
            return Ok(await _dmsService.GetDocumentsAsync(dossierId));
        }

        [HttpPost("documents")]
        public async Task<IActionResult> CreateDocument([FromBody] DocumentRequest request)
        {
            var id = await _dmsService.CreateDocumentAsync(request);
            var document = await _dmsService.GetDocumentAsync(id);
            if (document != null)
            {
                await _dmsService.IndexDocumentAsync(document.Id, GetActorName(), "DEFAULT", "Tự động đánh chỉ mục sau khi tạo metadata tài liệu.");
            }
            return Created($"/api/dms/documents/{id}", id);

        }

        [HttpPost("documents/quick-upload")]
        [RequestSizeLimit(210L * 1024 * 1024)]
        [RequestFormLimits(MultipartBodyLengthLimit = 210L * 1024 * 1024)]
        public async Task<IActionResult> QuickUploadDocument([FromForm] QuickUploadDocumentRequest request)
        {
            if (request.StorageId <= 0) return BadRequest("Vui lòng chọn kho lưu trữ.");

            var normalizedUnit = ResolveUnitCode(request.UnitCode);
            if (request.File is not null)
            {
                var validation = ValidateDocumentFile(request.File, normalizedUnit);
                if (validation != null) return validation;
            }

            var safeOriginalFileName = request.File is null ? null : Path.GetFileName(request.File.FileName);
            var sourceName = safeOriginalFileName is null ? null : Path.GetFileNameWithoutExtension(safeOriginalFileName);
            var documentTitle = string.IsNullOrWhiteSpace(request.Title) ? sourceName : request.Title.Trim();
            if (string.IsNullOrWhiteSpace(documentTitle)) return BadRequest("Tên tài liệu là bắt buộc.");

            var storage = await _dmsService.GetStorageLocationAsync(request.StorageId);
            if (storage is null || !string.Equals(storage.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("Kho/Kệ/Hộp đã chọn không tồn tại hoặc chưa được kích hoạt.");
            }

            var documentType = string.IsNullOrWhiteSpace(request.DocumentType)
                ? (string.IsNullOrWhiteSpace(request.DossierType) ? "KHAC" : request.DossierType.Trim())
                : request.DocumentType.Trim();
            var status = string.IsNullOrWhiteSpace(request.Status) ? "DRAFT" : request.Status.Trim().ToUpperInvariant();
            if (status is not ("DRAFT" or "PENDING" or "ACTIVE"))
            {
                return BadRequest("Trạng thái tài liệu chỉ nhận DRAFT, PENDING hoặc ACTIVE.");
            }

            var engineName = ResolveEngineName(request.Engine, "gemini");

            var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmssfff");
            var suffix = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
            var dossierCode = $"QHS-{timestamp}-{suffix}";
            var documentCode = $"QVB-{timestamp}-{suffix}";

            var records = await _dmsService.CreateQuickUploadRecordsAsync(new DossierRequest(
                dossierCode,
                $"Hồ sơ tự sinh - {documentTitle}",
                documentType,
                request.StorageId,
                status,
                request.FromDate,
                request.ToDate,
                string.IsNullOrWhiteSpace(request.Description) ? "Tự động tạo từ luồng tải nhanh." : request.Description.Trim()),
                documentCode,
                documentTitle,
                safeOriginalFileName,
                status,
                request.File is null ? "PENDING" : "PROCESSING");

            if (request.File is null)
            {
                return Created($"/api/dms/documents/{records.DocumentId}", new
                {
                    message = $"Đã lưu tài liệu {documentTitle} vào kho {storage.Name} thành công!",
                    records.DossierId,
                    records.DossierCode,
                    records.DocumentId,
                    records.DocumentCode,
                    title = documentTitle,
                    storageId = request.StorageId,
                    storageName = storage.Name,
                    fileName = (string?)null,
                    ocrStatus = "PENDING",
                    engine = engineName,
                    text = ""
                });
            }

            try
            {
                var upload = await SaveAndProcessDocumentFileAsync(records.DocumentId, request.File, engineName, normalizedUnit);

                return Created($"/api/dms/documents/{records.DocumentId}", new
                {
                    message = $"Đã lưu tài liệu {documentTitle} vào kho {storage.Name} thành công!",
                    records.DossierId,
                    records.DossierCode,
                    records.DocumentId,
                    records.DocumentCode,
                    title = documentTitle,
                    storageId = request.StorageId,
                    storageName = storage.Name,
                    upload.fileName,
                    upload.ocrStatus,
                    upload.engine,
                    upload.text,
                    upload.usedFallback,
                    upload.workflow
                });
            }
            catch (Exception ex)
            {
                var error = $"Lỗi OCR ({engineName}): {ex.Message}";
                await _dmsService.UpdateDocumentOcrAsync(records.DocumentId, "ERROR", error.Length > 3900 ? error[..3900] : error);
                return Created($"/api/dms/documents/{records.DocumentId}", new
                {
                    message = $"Đã lưu tài liệu {documentTitle} vào kho {storage.Name} thành công! OCR đang ở trạng thái lỗi.",
                    records.DossierId,
                    records.DossierCode,
                    records.DocumentId,
                    records.DocumentCode,
                    title = documentTitle,
                    storageId = request.StorageId,
                    storageName = storage.Name,
                    fileName = safeOriginalFileName,
                    ocrStatus = "ERROR",
                    engine = engineName,
                    text = error
                });
            }
        }

        [HttpGet("documents/upload-policy")]
        public IActionResult GetDocumentUploadPolicy([FromQuery] string? unitCode)
        {
            var normalizedUnit = ResolveUnitCode(unitCode);
            var maxBytes = UnitUploadLimits.TryGetValue(normalizedUnit, out var configuredLimit)
                ? configuredLimit
                : UnitUploadLimits["DEFAULT"];
            return Ok(new
            {
                unitCode = normalizedUnit,
                maxBytes,
                maxMegabytes = maxBytes / 1024 / 1024,
                technicalModelMaxBytes = MaxTechnicalModelBytes,
                technicalModelMaxMegabytes = MaxTechnicalModelBytes / 1024 / 1024,
                extensions = AllowedDocumentExtensions.OrderBy(value => value),
                engines = new[] { "gemini", "vietocr", "easyocr", "tesseract" }
            });
        }

        [HttpPost("documents/{id:long}/upload")]
        [RequestSizeLimit(210L * 1024 * 1024)]
        [RequestFormLimits(MultipartBodyLengthLimit = 210L * 1024 * 1024)]
        public async Task<IActionResult> UploadDocumentFile(long id, IFormFile file, [FromQuery] string? engine, [FromQuery] string? unitCode)
        {
            var normalizedUnit = ResolveUnitCode(unitCode);
            var validation = ValidateDocumentFile(file, normalizedUnit);
            if (validation != null) return validation;
            var doc = await _dmsService.GetDocumentAsync(id);
            if (doc == null) return NotFound();

            try
            {
                var engineName = ResolveEngineName(engine, "easyocr");
                var upload = await SaveAndProcessDocumentFileAsync(id, file, engineName, normalizedUnit);

                return Ok(new
                {
                    message = upload.message,
                    ocrStatus = upload.ocrStatus,
                    engine = upload.engine,
                    fileName = upload.fileName,
                    text = upload.text,
                    usedFallback = upload.usedFallback,
                    workflow = upload.workflow
                });
            }
            catch (Exception ex)
            {
                await _dmsService.UpdateDocumentOcrAsync(id, "ERROR", "");
                return Problem($"An error occurred during OCR processing. Details: {ex.Message}");
            }
        }

        [HttpPost("documents/{id:long}/ocr-existing")]
        public async Task<IActionResult> ProcessExistingDocumentFile(long id, [FromQuery] string? engine, [FromQuery] string? unitCode)
        {
            var document = await _dmsService.GetDocumentAsync(id);
            if (document == null) return NotFound();
            var normalizedUnit = ResolveUnitCode(unitCode);
            var storedFileName = string.IsNullOrWhiteSpace(document.FileName)
                ? string.Empty
                : Path.GetFileName(document.FileName);
            if (TechnicalModelExtensions.Contains(Path.GetExtension(storedFileName)))
                return BadRequest("Mô hình CAD/BIM không áp dụng OCR. Hãy mở tài liệu bằng trình xem 3D.");
            var filePath = string.IsNullOrWhiteSpace(storedFileName)
                ? string.Empty
                : Path.Combine(_env.ContentRootPath, "uploads", storedFileName);

            if (string.IsNullOrWhiteSpace(filePath) || !System.IO.File.Exists(filePath))
            {
                var text = $"[Đã số hóa tự động] Văn bản: {document.Title} (Mã: {document.Code}) - Ngày tạo: {DateTime.Now:dd/MM/yyyy HH:mm}";
                await _dmsService.CreateDocumentVersionAsync(id, new DocumentVersionRequest(
                    GetActorName(),
                    "Lưu phiên bản trước khi fallback số hóa do file vật lý không tồn tại"));
                var completion = await CompleteMetadataDigitizationAsync(
                    document,
                    text,
                    string.IsNullOrWhiteSpace(storedFileName) ? "metadata" : storedFileName,
                    "metadata",
                    normalizedUnit,
                    "Đánh chỉ mục nội dung fallback do thiếu file vật lý.");

                return Ok(new
                {
                    message = "Đã số hóa thành công nội dung tài liệu.",
                    documentId = id,
                    fileName = completion.fileName,
                    sourceFileName = string.IsNullOrWhiteSpace(storedFileName) ? null : storedFileName,
                    ocrStatus = "DONE",
                    engine = "metadata",
                    usedFallback = true,
                    text,
                    workflow = completion.workflow
                });
            }

            var engineName = ResolveEngineName(engine, "gemini");
            await _dmsService.UpdateDocumentFileOcrAsync(id, storedFileName, "PROCESSING", "Đang bóc tách nội dung OCR...");

            try
            {
                var completion = await CompleteOcrAndSubmitAsync(
                    document, filePath, storedFileName, engineName, normalizedUnit);

                return Ok(new
                {
                    message = completion.message,
                    documentId = id,
                    fileName = completion.fileName,
                    sourceFileName = storedFileName,
                    ocrStatus = completion.ocrStatus,
                    engine = completion.engine,
                    usedFallback = completion.usedFallback,
                    text = completion.text,
                    workflow = completion.workflow
                });
            }
            catch (Exception ex)
            {
                var text = $"[Đã số hóa tự động] Văn bản: {document.Title} (Mã: {document.Code}) - Ngày tạo: {DateTime.Now:dd/MM/yyyy HH:mm}";
                var fallbackNote = $"Fallback số hóa metadata sau lỗi OCR {engineName}: {ex.Message}";
                if (fallbackNote.Length > 950) fallbackNote = fallbackNote[..947] + "...";
                await _dmsService.CreateDocumentVersionAsync(id, new DocumentVersionRequest(
                    GetActorName(),
                    fallbackNote));
                var completion = await CompleteMetadataDigitizationAsync(
                    document, text, storedFileName, "metadata", normalizedUnit,
                    "Đánh chỉ mục metadata fallback sau lỗi OCR engine.");
                return Ok(new
                {
                    message = "Đã số hóa thành công nội dung tài liệu bằng metadata dự phòng.",
                    documentId = id,
                    fileName = completion.fileName,
                    sourceFileName = storedFileName,
                    ocrStatus = "DONE",
                    engine = "metadata",
                    usedFallback = true,
                    fallbackReason = ex.Message,
                    text,
                    workflow = completion.workflow
                });
            }
        }

        [HttpPost("documents/{id:long}/digitize-metadata")]
        public async Task<IActionResult> DigitizeDocumentMetadata(long id, [FromQuery] string? unitCode)
        {
            var document = await _dmsService.GetDocumentAsync(id);
            if (document == null) return NotFound();

            var normalizedUnit = ResolveUnitCode(unitCode);
            var generatedText = $"Số hóa tự động từ metadata: {document.Title} - Tạo ngày {DateTime.Now:dd/MM/yyyy HH:mm:ss}";
            await _dmsService.CreateDocumentVersionAsync(id, new DocumentVersionRequest(
                GetActorName(),
                "Lưu phiên bản trước khi tự động số hóa metadata do chưa có file"));
            var completion = await CompleteMetadataDigitizationAsync(
                document, generatedText, "metadata", "metadata", normalizedUnit,
                "Đánh chỉ mục nội dung số hóa tự động từ metadata.");

            return Ok(new
            {
                message = "Tự động số hóa metadata do tài liệu chưa có tệp đính kèm.",
                documentId = id,
                fileName = completion.fileName,
                ocrStatus = "DONE",
                engine = "metadata",
                usedFallback = false,
                text = generatedText,
                workflow = completion.workflow
            });
        }

        [HttpPost("documents/{id:long}/ocr-pdf")]
        public async Task<IActionResult> ProcessDocumentToOcrPdf(long id, IFormFile file, [FromQuery] string? engine, [FromQuery] string? unitCode)
        {
            if (file == null || file.Length == 0) return BadRequest("No file uploaded.");
            if (!OcrDocumentExtensions.Contains(Path.GetExtension(file.FileName)))
                return BadRequest("Định dạng file không hợp lệ. Chỉ hỗ trợ PDF, DOCX, TIFF, PNG/JPG.");

            var normalizedUnit = ResolveUnitCode(unitCode);
            var validation = ValidateDocumentFile(file, normalizedUnit);
            if (validation != null) return validation;

            var document = await _dmsService.GetDocumentAsync(id);
            if (document == null) return NotFound();

            var uploadsFolder = Path.Combine(_env.ContentRootPath, "uploads");
            Directory.CreateDirectory(uploadsFolder);

            var extension = Path.GetExtension(file.FileName);
            var sourceName = $"{id}_{Guid.NewGuid():N}{extension}";
            var sourcePath = Path.Combine(uploadsFolder, sourceName);
            await using (var stream = new FileStream(sourcePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var engineName = ResolveEngineName(engine, "gemini");
            try
            {
                await _dmsService.UpdateDocumentFileOcrAsync(id, sourceName, "PROCESSING", "Đang bóc tách nội dung OCR...");
                var completion = await CompleteOcrAndSubmitAsync(
                    document, sourcePath, file.FileName, engineName, normalizedUnit);

                return Ok(new
                {
                    message = completion.message,
                    documentId = id,
                    sourceFileName = sourceName,
                    fileName = completion.fileName,
                    ocrStatus = "DONE",
                    engine = completion.engine,
                    usedFallback = completion.usedFallback,
                    text = completion.text,
                    workflow = completion.workflow
                });
            }
            catch (Exception ex)
            {
                await _dmsService.UpdateDocumentOcrAsync(id, "ERROR", "");
                return Problem($"Lỗi OCR tạo PDF với engine '{engineName}': {ex.Message}");
            }
        }

        [HttpGet("documents/{id:long}/file")]
        public async Task<IActionResult> GetDocumentFile(long id)
        {
            var document = await _dmsService.GetDocumentAsync(id);
            if (document?.FileName is null) return NotFound();

            var storedFileName = Path.GetFileName(document.FileName);
            if (string.IsNullOrWhiteSpace(storedFileName)) return NotFound();
            var filePath = Path.Combine(_env.ContentRootPath, "uploads", storedFileName);
            if (!System.IO.File.Exists(filePath)) return NotFound();

            var contentType = Path.GetExtension(storedFileName).ToLowerInvariant() switch
            {
                ".pdf" => "application/pdf",
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".tif" or ".tiff" => "image/tiff",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".ifc" => "application/x-step",
                ".stl" => "model/stl",
                ".obj" => "model/obj",
                ".step" or ".stp" => "model/step",
                _ => "application/octet-stream"
            };

            var watermarkText = $"IDP.DMS | current-user | DOCUMENT #{id} | {DateTime.Now:yyyy-MM-dd HH:mm:ss}";
            Response.Headers["X-IDP-DMS-Watermark"] = Uri.EscapeDataString(watermarkText);
            Response.Headers["X-IDP-DMS-Security-Level"] = "INTERNAL";

            return PhysicalFile(filePath, contentType, enableRangeProcessing: true);
        }

        [HttpGet("documents/{id:long}/ocr-preview")]
        public async Task<IActionResult> GetOcrPagePreview(long id, [FromQuery] int page = 1)
        {
            var document = await _dmsService.GetDocumentAsync(id);
            if (document?.FileName is null) return NotFound("Tài liệu chưa có tệp vật lý.");
            var source = await ResolveZonalOcrSourceAsync(document);
            if (source is null) return NotFound("Không tìm thấy tệp nguồn PDF/ảnh để OCR theo vùng.");

            try
            {
                var preview = _ocrService.RenderPagePreview(source.Value.Path, page);
                Response.Headers["X-OCR-Page"] = preview.Page.ToString();
                Response.Headers["X-OCR-Page-Count"] = preview.PageCount.ToString();
                Response.Headers["X-OCR-Image-Width"] = preview.Width.ToString();
                Response.Headers["X-OCR-Image-Height"] = preview.Height.ToString();
                Response.Headers["X-OCR-Source-File"] = Uri.EscapeDataString(source.Value.FileName);
                Response.Headers.CacheControl = "no-store";
                return File(preview.Content, "image/png");
            }
            catch (InvalidOperationException exception)
            {
                return UnprocessableEntity(exception.Message);
            }
        }

        [HttpPost("documents/{id:long}/ocr-zones")]
        public async Task<IActionResult> ExtractOcrZones(long id, [FromBody] OcrZonesRequest request)
        {
            var document = await _dmsService.GetDocumentAsync(id);
            if (document?.FileName is null) return NotFound("Tài liệu chưa có tệp vật lý.");
            var source = await ResolveZonalOcrSourceAsync(document);
            if (source is null) return NotFound("Không tìm thấy tệp nguồn PDF/ảnh để OCR theo vùng.");

            try
            {
                return Ok(_ocrService.ExtractZones(id, document.Code, source.Value.Path, request));
            }
            catch (InvalidOperationException exception)
            {
                return UnprocessableEntity(exception.Message);
            }
        }

        [HttpPost("documents/{id:long}/sign-pdf")]
        [Consumes("multipart/form-data")]
        [RequestFormLimits(MultipartBodyLengthLimit = 4 * 1024 * 1024)]
        public async Task<IActionResult> SignPdf(long id, [FromForm] SignPdfRequest request)
        {
            var actor = User.Identity?.Name ?? request.SignerName;
            return Ok(await _pdfSigningService.SignAsync(id, request, actor));
        }

        [HttpGet("documents/{id:long}/signatures")]
        public async Task<IActionResult> GetPdfSignatures(long id)
        {
            var document = await _dmsService.GetDocumentAsync(id);
            return document is null ? NotFound() : Ok(await _dmsService.GetPdfSignaturesAsync(id));
        }

        [HttpPut("documents/{id:long}")]
        public async Task<IActionResult> UpdateDocument(long id, [FromBody] DocumentRequest request)
        {
            var affected = await _dmsService.UpdateDocumentAsync(id, request);
            return affected == 0 ? NotFound() : NoContent();
        }

        [HttpDelete("documents/{id:long}")]
        public async Task<IActionResult> DeleteDocument(long id)
        {
            var affected = await _dmsService.DeleteDocumentAsync(id);
            return affected == 0 ? NotFound() : NoContent();
        }

        private async Task<DocumentUploadResult> CompleteOcrAndSubmitAsync(
            DocumentDto document,
            string sourcePath,
            string sourceFileName,
            string engineName,
            string normalizedUnit)
        {
            var extraction = _ocrService.ExtractTextDetailed(sourcePath, engineName);
            if (string.IsNullOrWhiteSpace(extraction.Text))
                throw new InvalidOperationException("OCR không nhận diện được nội dung từ tệp nguồn.");

            return await StoreDigitizedPdfAndSubmitAsync(
                document,
                extraction.Text,
                sourceFileName,
                extraction.Engine,
                extraction.UsedFallback,
                extraction.Note,
                normalizedUnit);
        }

        private async Task<DocumentUploadResult> CompleteMetadataDigitizationAsync(
            DocumentDto document,
            string text,
            string sourceFileName,
            string engine,
            string normalizedUnit,
            string indexNote)
        {
            return await StoreDigitizedPdfAndSubmitAsync(
                document,
                text,
                sourceFileName,
                engine,
                engine.Equals("metadata", StringComparison.OrdinalIgnoreCase),
                indexNote,
                normalizedUnit);
        }

        private async Task<DocumentUploadResult> StoreDigitizedPdfAndSubmitAsync(
            DocumentDto document,
            string fullText,
            string sourceFileName,
            string engine,
            bool usedFallback,
            string message,
            string normalizedUnit)
        {
            var uploadsFolder = Path.Combine(_env.ContentRootPath, "uploads");
            Directory.CreateDirectory(uploadsFolder);
            var pdfName = $"{document.Id}_ocr_{DateTime.UtcNow:yyyyMMddHHmmssfff}.pdf";
            var pdfPath = Path.Combine(uploadsFolder, pdfName);

            _ocrService.GenerateDigitizedPdf(new OcrPdfGenerationRequest(
                pdfPath,
                fullText,
                document.Code,
                document.Title,
                Path.GetFileName(sourceFileName),
                engine));

            await _dmsService.CreateDocumentVersionAsync(document.Id, new DocumentVersionRequest(
                GetActorName(),
                $"Lưu phiên bản trước khi gắn PDF số hóa OCR từ {Path.GetFileName(sourceFileName)}"));
            var description = fullText.Length > 3900 ? fullText[..3895] + "..." : fullText;
            await _dmsService.UpdateDocumentFileOcrAsync(document.Id, pdfName, "DONE", description);
            await _dmsService.IndexDocumentAsync(
                document.Id,
                GetActorName(),
                normalizedUnit,
                $"{message} File PDF số hóa: {pdfName}.");
            var workflow = await _dmsService.SubmitOcrForReviewAsync(
                document.Id,
                GetActorName(),
                normalizedUnit,
                "LANH_DAO_DON_VI");

            return new DocumentUploadResult(
                $"{message} Đã tạo PDF tiếng Việt và tự động gửi GĐ2-2.",
                "DONE",
                engine,
                pdfName,
                description,
                usedFallback,
                workflow);
        }

        private static string ResolveEngineName(string? engine, string fallback)
        {
            var normalized = string.IsNullOrWhiteSpace(engine) ? fallback : engine.Trim();
            return normalized.ToUpperInvariant() switch
            {
                "GEMINI" or "GEMINI VISION AI" => "gemini",
                "VIETOCR" => "vietocr",
                "EASYOCR" => "easyocr",
                "TESSERACT" => "tesseract",
                "CRNN" => "crnn",
                _ => throw new BusinessRuleException($"Engine OCR '{normalized}' không được hỗ trợ.")
            };
        }

        private static string ResolveUnitCode(string? unitCode) =>
            string.IsNullOrWhiteSpace(unitCode) ? "DEFAULT" : unitCode.Trim().ToUpperInvariant();

        /// <summary>Trả tên người dùng hiện tại từ JWT token. Fallback "system" nếu không xác định được.</summary>
        private string GetActorName() => User.Identity?.Name ?? "system";

        private async Task<(string FileName, string Path)?> ResolveZonalOcrSourceAsync(DocumentDto document)
        {
            var uploadsFolder = Path.Combine(_env.ContentRootPath, "uploads");
            var currentName = Path.GetFileName(document.FileName ?? string.Empty);
            var generatedOcrPdf = currentName.StartsWith($"{document.Id}_ocr_", StringComparison.OrdinalIgnoreCase);
            var candidates = new List<string>();

            if (generatedOcrPdf)
            {
                var versions = await _dmsService.GetDocumentVersionsAsync(document.Id);
                candidates.AddRange(versions
                    .Select(version => Path.GetFileName(version.FileName))
                    .OfType<string>()
                    .Where(fileName => !string.IsNullOrWhiteSpace(fileName)));
            }
            if (!string.IsNullOrWhiteSpace(currentName)) candidates.Add(currentName);

            foreach (var candidate in candidates.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                var extension = Path.GetExtension(candidate).ToLowerInvariant();
                if (extension is not (".pdf" or ".png" or ".jpg" or ".jpeg" or ".webp" or ".bmp" or ".tif" or ".tiff"))
                    continue;
                var path = Path.Combine(uploadsFolder, candidate);
                if (System.IO.File.Exists(path)) return (candidate, path);
            }
            return null;
        }

        private IActionResult? ValidateDocumentFile(IFormFile? file, string normalizedUnit)
        {
            if (file == null || file.Length == 0) return BadRequest("No file uploaded.");
            var extension = Path.GetExtension(file.FileName);
            if (!AllowedDocumentExtensions.Contains(extension))
            {
                return BadRequest("Định dạng file không hợp lệ. Hỗ trợ PDF, DOCX, TIFF, PNG/JPG và mô hình IFC/STL/OBJ/STEP.");
            }

            var maxBytes = TechnicalModelExtensions.Contains(extension)
                ? MaxTechnicalModelBytes
                : UnitUploadLimits.TryGetValue(normalizedUnit, out var configuredLimit)
                    ? configuredLimit
                    : UnitUploadLimits["DEFAULT"];
            if (file.Length > maxBytes)
            {
                return BadRequest($"File vượt giới hạn dung lượng của đơn vị {normalizedUnit}: {maxBytes / 1024 / 1024}MB.");
            }

            return null;
        }

        private async Task<DocumentUploadResult> SaveAndProcessDocumentFileAsync(long id, IFormFile file, string engineName, string normalizedUnit)
        {
            var uploadsFolder = Path.Combine(_env.ContentRootPath, "uploads");
            Directory.CreateDirectory(uploadsFolder);

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var originalStem = Path.GetFileNameWithoutExtension(Path.GetFileName(file.FileName));
            var invalidCharacters = Path.GetInvalidFileNameChars();
            var safeStem = new string(originalStem.Select(character => invalidCharacters.Contains(character) ? '_' : character).ToArray()).Trim();
            if (string.IsNullOrWhiteSpace(safeStem)) safeStem = "document";
            if (safeStem.Length > 180) safeStem = safeStem[..180];
            var fileName = $"{id}_{Guid.NewGuid():N}_{safeStem}{ext}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var document = await _dmsService.GetDocumentAsync(id)
                ?? throw new BusinessRuleException($"Không tìm thấy tài liệu #{id} sau khi tải tệp.");
            if (TechnicalModelExtensions.Contains(ext))
            {
                await _dmsService.CreateDocumentVersionAsync(id, new DocumentVersionRequest(
                    GetActorName(), $"Lưu phiên bản trước khi cập nhật mô hình CAD/BIM {Path.GetFileName(file.FileName)}"));
                await _dmsService.UpdateDocumentFileOcrAsync(
                    id, fileName, "NOT_APPLICABLE", $"Mô hình kỹ thuật {ext.TrimStart('.').ToUpperInvariant()} - xem bằng trình xem 3D WebGL.");
                await _dmsService.IndexDocumentAsync(
                    id, GetActorName(), normalizedUnit, $"Đã lưu mô hình CAD/BIM {Path.GetFileName(file.FileName)}; không áp dụng OCR.");
                return new DocumentUploadResult(
                    "Đã lưu mô hình CAD/BIM và sẵn sàng xem 3D.",
                    "NOT_APPLICABLE",
                    "3d-viewer",
                    fileName,
                    "",
                    false,
                    null);
            }
            await _dmsService.UpdateDocumentFileOcrAsync(id, fileName, "PROCESSING", "Đang bóc tách nội dung OCR...");
            return await CompleteOcrAndSubmitAsync(document, filePath, file.FileName, engineName, normalizedUnit);
        }

        private sealed record DocumentUploadResult(
            string message,
            string ocrStatus,
            string engine,
            string fileName,
            string text,
            bool usedFallback,
            OcrWorkflowSubmissionResult? workflow);

        #endregion

        #region Borrow Requests

        [HttpGet("borrow-requests")]
        public async Task<IActionResult> GetBorrowRequests()
        {
            return Ok(await _dmsService.GetBorrowRequestsAsync());
        }

        [HttpPost("borrow-requests")]
        public async Task<IActionResult> CreateBorrowRequest([FromBody] BorrowRequestRequest request)
        {
            var id = await _dmsService.CreateBorrowRequestAsync(request);
            return Created($"/api/dms/borrow-requests/{id}", new { id });
        }

        [HttpPut("borrow-requests/{id:long}")]
        public async Task<IActionResult> UpdateBorrowRequest(long id, [FromBody] BorrowRequestRequest request)
        {
            var affected = await _dmsService.UpdateBorrowRequestAsync(id, request);
            return affected == 0 ? NotFound() : NoContent();
        }

        [HttpDelete("borrow-requests/{id:long}")]
        public async Task<IActionResult> DeleteBorrowRequest(long id)
        {
            var affected = await _dmsService.DeleteBorrowRequestAsync(id);
            return affected == 0 ? NotFound() : NoContent();
        }

        #endregion

        #region Workflow DMS

        [HttpGet("workflow/items")]
        public async Task<IActionResult> GetWorkflowItems()
        {
            return Ok(await _dmsService.GetDossiersAsync());
        }

        [HttpPost("workflow/transition")]
        public async Task<IActionResult> TransitionWorkflow([FromBody] WorkflowTransitionRequest request)
        {
            return Ok(await _dmsService.TransitionWorkflowAsync(request));
        }

        [HttpGet("workflow/{entityType}/{entityId:long}/history")]
        public async Task<IActionResult> GetWorkflowHistory(string entityType, long entityId)
        {
            return Ok(await _dmsService.GetWorkflowHistoryAsync(entityType, entityId));
        }

        #endregion

        #region Generic Resource Management

        [HttpGet("resources/{resource}")]
        public async Task<IActionResult> GetSimpleRecords(string resource)
        {
            try
            {
                return Ok(await _dmsService.GetSimpleRecordsAsync(resource));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("resources/{resource}/{id:long}")]
        public async Task<IActionResult> GetSimpleRecord(string resource, long id)
        {
            try
            {
                var item = await _dmsService.GetSimpleRecordAsync(resource, id);
                return item is null ? NotFound() : Ok(item);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("resources/{resource}")]
        public async Task<IActionResult> CreateSimpleRecord(string resource, [FromBody] SimpleRecordRequest request)
        {
            try
            {
                var id = await _dmsService.CreateSimpleRecordAsync(resource, request);
                var item = await _dmsService.GetSimpleRecordAsync(resource, id);
                return Created($"/api/dms/resources/{resource}/{id}", item);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPut("resources/{resource}/{id:long}")]
        public async Task<IActionResult> UpdateSimpleRecord(string resource, long id, [FromBody] SimpleRecordRequest request)
        {
            try
            {
                var affected = await _dmsService.UpdateSimpleRecordAsync(resource, id, request);
                return affected == 0 ? NotFound() : NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpDelete("resources/{resource}/{id:long}")]
        public async Task<IActionResult> DeleteSimpleRecord(string resource, long id)
        {
            try
            {
                var affected = await _dmsService.DeleteSimpleRecordAsync(resource, id);
                return affected == 0 ? NotFound() : NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        #endregion
    }
}
