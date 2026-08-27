using System.Collections.Concurrent;
using System.IO.Compression;
using System.Threading.Channels;
using ClosedXML.Excel;
using IDP.DMS.Api.Models;

namespace IDP.DMS.Api.Services;

public sealed class BatchImportService
{
    private const long MaxExcelBytes = 10L * 1024 * 1024;
    private const long MaxZipBytes = 250L * 1024 * 1024;
    private const long MaxEntryBytes = 50L * 1024 * 1024;
    private const long MaxExpandedBytes = 1024L * 1024 * 1024;
    private const int MaxRows = 5000;
    private const int MaxZipEntries = 5000;
    private static readonly string[] RequiredHeaders =
    [
        "MaHoSo", "TenHoSo", "LoaiHoSo", "MaKho", "MaVanBan", "TenVanBan", "TenFileDinhKem"
    ];
    private static readonly HashSet<string> AllowedAttachments = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff"
    };

    private readonly OracleDmsService _repository;
    private readonly BatchOcrQueue _queue;
    private readonly IWebHostEnvironment _environment;

    public BatchImportService(OracleDmsService repository, BatchOcrQueue queue, IWebHostEnvironment environment)
    {
        _repository = repository;
        _queue = queue;
        _environment = environment;
    }

    public static byte[] CreateExcelTemplate()
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("DanhMucHoSo");
        for (var index = 0; index < RequiredHeaders.Length; index++)
            sheet.Cell(1, index + 1).Value = RequiredHeaders[index];
        sheet.Range(1, 1, 1, RequiredHeaders.Length).Style
            .Font.SetBold().Font.SetFontColor(XLColor.White).Fill.SetBackgroundColor(XLColor.FromHtml("#1D4ED8"));
        var sample = new[] { "HS-2026-001", "Hồ sơ hành chính mẫu", "HANH_CHINH", "KHO-01", "VB-2026-001", "Quyết định mẫu", "quyet-dinh-001.pdf" };
        for (var index = 0; index < sample.Length; index++) sheet.Cell(2, index + 1).Value = sample[index];
        sheet.SheetView.FreezeRows(1);
        sheet.Columns().AdjustToContents(12, 42);
        sheet.RangeUsed()?.SetAutoFilter();
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public async Task<BatchImportAcceptedDto> ImportAsync(
        BatchImportZipRequest request,
        string actor,
        CancellationToken cancellationToken)
    {
        ValidateUpload(request);
        var engine = NormalizeEngine(request.OcrEngine);
        IReadOnlyList<BatchImportExcelRow> rows;
        await using (var excelStream = request.DanhMucHoSo.OpenReadStream())
            rows = ParseExcel(excelStream);

        await using var zipStream = request.TaiLieu.OpenReadStream();
        using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read, leaveOpen: false);
        var zipIndex = BuildZipIndex(archive);
        var errors = ValidateRows(rows, zipIndex);
        var jobCode = $"IMP-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
        var jobId = await _repository.CreateBatchImportJobAsync(
            jobCode,
            Path.GetFileName(request.DanhMucHoSo.FileName),
            Path.GetFileName(request.TaiLieu.FileName),
            actor,
            engine,
            rows,
            errors);

        var uploadsFolder = Path.Combine(_environment.ContentRootPath, "uploads");
        Directory.CreateDirectory(uploadsFolder);
        var validRows = rows.Where(row => !errors.ContainsKey(row.RowNumber)).ToList();
        var queuedOcrItems = new List<BatchOcrQueueItem>();
        foreach (var dossierRows in validRows.GroupBy(row => row.DossierCode, StringComparer.OrdinalIgnoreCase))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var storedPaths = new List<string>();
            try
            {
                var documents = new List<BatchImportDocumentInput>();
                foreach (var row in dossierRows)
                {
                    var entry = zipIndex.ByReference[row.AttachmentFileName];
                    var storedFileName = BuildStoredFileName(jobId, row.DocumentCode, entry.Name);
                    var storedPath = Path.Combine(uploadsFolder, storedFileName);
                    await ExtractEntryAsync(entry, storedPath, cancellationToken);
                    storedPaths.Add(storedPath);
                    documents.Add(new BatchImportDocumentInput(
                        row.RowNumber, row.DocumentCode, row.DocumentTitle,
                        row.AttachmentFileName, storedFileName));
                }

                var first = dossierRows.First();
                var queueItems = await _repository.ImportBatchDossierAsync(jobId,
                    new BatchImportDossierInput(
                        first.DossierCode, first.DossierTitle, first.DossierType, first.StorageCode, documents),
                    engine);
                queuedOcrItems.AddRange(queueItems);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                foreach (var path in storedPaths)
                {
                    try { File.Delete(path); }
                    catch (IOException) { }
                    catch (UnauthorizedAccessException) { }
                }
                await _repository.MarkBatchImportRowsFailedAsync(
                    jobId, dossierRows.Select(row => row.RowNumber).ToList(), exception.Message);
            }
        }

        await _repository.RefreshBatchImportJobAsync(jobId);
        foreach (var queueItem in queuedOcrItems)
            await _queue.EnqueueAsync(queueItem, CancellationToken.None);
        var job = await _repository.GetBatchImportJobAsync(jobId)
            ?? throw new InvalidOperationException("Không tải lại được kết quả import vừa tạo.");
        return new BatchImportAcceptedDto(
            job.Id, job.Code, job.Status, job.TotalRows, job.ValidRows,
            job.ImportedDossiers, job.ImportedDocuments, job.FailedRows,
            job.OcrQueued, job.OcrCompleted, job.OcrFailed, job.Items);
    }

    private static void ValidateUpload(BatchImportZipRequest request)
    {
        if (request.DanhMucHoSo is null || request.DanhMucHoSo.Length == 0)
            throw new BusinessRuleException("Bắt buộc tải tệp DanhMucHoSo.xlsx.");
        if (request.TaiLieu is null || request.TaiLieu.Length == 0)
            throw new BusinessRuleException("Bắt buộc tải tệp TaiLieu.zip.");
        if (!Path.GetExtension(request.DanhMucHoSo.FileName).Equals(".xlsx", StringComparison.OrdinalIgnoreCase))
            throw new BusinessRuleException("Danh mục hồ sơ phải là tệp .xlsx.");
        if (!Path.GetExtension(request.TaiLieu.FileName).Equals(".zip", StringComparison.OrdinalIgnoreCase))
            throw new BusinessRuleException("Tài liệu đính kèm phải là tệp .zip.");
        if (request.DanhMucHoSo.Length > MaxExcelBytes)
            throw new BusinessRuleException("Tệp Excel vượt giới hạn 10 MB.");
        if (request.TaiLieu.Length > MaxZipBytes)
            throw new BusinessRuleException("Tệp ZIP vượt giới hạn nén 250 MB.");
    }

    private static IReadOnlyList<BatchImportExcelRow> ParseExcel(Stream stream)
    {
        try
        {
            using var workbook = new XLWorkbook(stream);
            var sheet = workbook.Worksheets.FirstOrDefault()
                ?? throw new BusinessRuleException("Tệp Excel không có worksheet.");
            var headerCells = sheet.Row(1).Cells(1, RequiredHeaders.Length)
                .Select(cell => cell.GetString().Trim()).ToArray();
            for (var index = 0; index < RequiredHeaders.Length; index++)
            {
                if (!headerCells[index].Equals(RequiredHeaders[index], StringComparison.OrdinalIgnoreCase))
                    throw new BusinessRuleException($"Cột {index + 1} phải là '{RequiredHeaders[index]}'.");
            }

            var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;
            if (lastRow - 1 > MaxRows)
                throw new BusinessRuleException($"Tệp Excel vượt giới hạn {MaxRows} dòng dữ liệu.");
            var rows = new List<BatchImportExcelRow>();
            for (var rowNumber = 2; rowNumber <= lastRow; rowNumber++)
            {
                var values = Enumerable.Range(1, RequiredHeaders.Length)
                    .Select(column => sheet.Cell(rowNumber, column).GetFormattedString().Trim()).ToArray();
                if (values.All(string.IsNullOrWhiteSpace)) continue;
                rows.Add(new BatchImportExcelRow(rowNumber, values[0], values[1], values[2], values[3], values[4], values[5], NormalizeZipReference(values[6])));
            }
            if (rows.Count == 0) throw new BusinessRuleException("Tệp Excel không có dòng dữ liệu.");
            return rows;
        }
        catch (BusinessRuleException) { throw; }
        catch (Exception exception)
        {
            throw new BusinessRuleException($"Không đọc được tệp Excel: {exception.Message}");
        }
    }

    private static ZipIndex BuildZipIndex(ZipArchive archive)
    {
        var entries = archive.Entries.Where(entry => !string.IsNullOrEmpty(entry.Name)).ToList();
        if (entries.Count > MaxZipEntries)
            throw new BusinessRuleException($"ZIP vượt giới hạn {MaxZipEntries} tệp.");
        long expandedBytes = 0;
        var byReference = new Dictionary<string, ZipArchiveEntry>(StringComparer.OrdinalIgnoreCase);
        var baseNames = new Dictionary<string, ZipArchiveEntry>(StringComparer.OrdinalIgnoreCase);
        var duplicateBaseNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var entry in entries)
        {
            var reference = NormalizeZipReference(entry.FullName);
            ValidateZipPath(reference);
            if (entry.Length <= 0 || entry.Length > MaxEntryBytes)
                throw new BusinessRuleException($"Tệp ZIP '{entry.FullName}' rỗng hoặc vượt giới hạn 50 MB.");
            expandedBytes = checked(expandedBytes + entry.Length);
            if (expandedBytes > MaxExpandedBytes)
                throw new BusinessRuleException("Tổng dung lượng giải nén ZIP vượt giới hạn 1 GB.");
            if (entry.CompressedLength > 0 && entry.Length / (double)entry.CompressedLength > 200d)
                throw new BusinessRuleException($"Tệp ZIP '{entry.FullName}' có tỷ lệ nén bất thường.");
            var extension = Path.GetExtension(entry.Name);
            if (!AllowedAttachments.Contains(extension))
                throw new BusinessRuleException($"Định dạng '{extension}' trong ZIP không được hỗ trợ.");
            if (!byReference.TryAdd(reference, entry))
                throw new BusinessRuleException($"ZIP chứa nhiều tệp trùng đường dẫn '{entry.FullName}'.");
            if (!baseNames.TryAdd(entry.Name, entry)) duplicateBaseNames.Add(entry.Name);
        }
        foreach (var pair in baseNames.Where(pair => !duplicateBaseNames.Contains(pair.Key)))
            byReference.TryAdd(pair.Key, pair.Value);
        return new ZipIndex(byReference);
    }

    private static IReadOnlyDictionary<int, string> ValidateRows(IReadOnlyList<BatchImportExcelRow> rows, ZipIndex zipIndex)
    {
        var errors = new Dictionary<int, string>();
        foreach (var row in rows)
        {
            var rowErrors = new List<string>();
            Required(row.DossierCode, "MaHoSo", 50, rowErrors);
            Required(row.DossierTitle, "TenHoSo", 500, rowErrors);
            Required(row.DossierType, "LoaiHoSo", 100, rowErrors);
            Required(row.StorageCode, "MaKho", 50, rowErrors);
            Required(row.DocumentCode, "MaVanBan", 50, rowErrors);
            Required(row.DocumentTitle, "TenVanBan", 500, rowErrors);
            Required(row.AttachmentFileName, "TenFileDinhKem", 500, rowErrors);
            if (!string.IsNullOrWhiteSpace(row.AttachmentFileName) && !zipIndex.ByReference.ContainsKey(row.AttachmentFileName))
                rowErrors.Add($"Không tìm thấy '{row.AttachmentFileName}' trong ZIP");
            if (rowErrors.Count > 0) errors[row.RowNumber] = string.Join("; ", rowErrors);
        }

        foreach (var duplicate in rows.GroupBy(row => row.DocumentCode, StringComparer.OrdinalIgnoreCase).Where(group => !string.IsNullOrWhiteSpace(group.Key) && group.Count() > 1))
            foreach (var row in duplicate) AppendError(errors, row.RowNumber, $"MaVanBan '{row.DocumentCode}' bị trùng trong Excel");
        foreach (var duplicate in rows.GroupBy(row => row.AttachmentFileName, StringComparer.OrdinalIgnoreCase).Where(group => !string.IsNullOrWhiteSpace(group.Key) && group.Count() > 1))
            foreach (var row in duplicate) AppendError(errors, row.RowNumber, $"TenFileDinhKem '{row.AttachmentFileName}' được tham chiếu nhiều lần");
        foreach (var dossier in rows.GroupBy(row => row.DossierCode, StringComparer.OrdinalIgnoreCase))
        {
            var first = dossier.First();
            if (dossier.Any(row => !row.DossierTitle.Equals(first.DossierTitle, StringComparison.OrdinalIgnoreCase)
                || !row.DossierType.Equals(first.DossierType, StringComparison.OrdinalIgnoreCase)
                || !row.StorageCode.Equals(first.StorageCode, StringComparison.OrdinalIgnoreCase)))
            {
                foreach (var row in dossier) AppendError(errors, row.RowNumber, "Các dòng cùng MaHoSo phải có TenHoSo, LoaiHoSo và MaKho giống nhau");
            }
        }
        return errors;
    }

    private static async Task ExtractEntryAsync(ZipArchiveEntry entry, string targetPath, CancellationToken cancellationToken)
    {
        await using var input = entry.Open();
        await using var output = new FileStream(targetPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true);
        await input.CopyToAsync(output, cancellationToken);
        if (output.Length != entry.Length)
            throw new InvalidDataException($"Dung lượng giải nén không khớp cho '{entry.FullName}'.");
    }

    private static string BuildStoredFileName(long jobId, string documentCode, string originalName)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var safeCode = new string(documentCode.Select(character => invalid.Contains(character) ? '_' : character).ToArray());
        var safeStem = new string(Path.GetFileNameWithoutExtension(originalName).Select(character => invalid.Contains(character) ? '_' : character).ToArray());
        if (safeCode.Length > 50) safeCode = safeCode[..50];
        if (safeStem.Length > 100) safeStem = safeStem[..100];
        return $"batch_{jobId}_{safeCode}_{Guid.NewGuid():N}_{safeStem}{Path.GetExtension(originalName).ToLowerInvariant()}";
    }

    private static void ValidateZipPath(string path)
    {
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (path.StartsWith('/') || path.Contains(':') || segments.Any(segment => segment is "." or ".."))
            throw new BusinessRuleException($"Đường dẫn không an toàn trong ZIP: '{path}'.");
    }

    private static string NormalizeZipReference(string value) => value.Trim().Replace('\\', '/').TrimStart('/');

    private static void Required(string value, string field, int maxLength, ICollection<string> errors)
    {
        if (string.IsNullOrWhiteSpace(value)) errors.Add($"{field} là bắt buộc");
        else if (value.Length > maxLength) errors.Add($"{field} vượt {maxLength} ký tự");
    }

    private static void AppendError(IDictionary<int, string> errors, int rowNumber, string message) =>
        errors[rowNumber] = errors.TryGetValue(rowNumber, out var current) ? $"{current}; {message}" : message;

    private static string NormalizeEngine(string engine) => (engine ?? "vietocr").Trim().ToLowerInvariant() switch
    {
        "gemini" => "gemini",
        "vietocr" => "vietocr",
        "easyocr" => "easyocr",
        "tesseract" => "tesseract",
        "crnn" => "crnn",
        _ => throw new BusinessRuleException("Engine OCR chỉ hỗ trợ Gemini, VietOCR, EasyOCR, Tesseract hoặc CRNN.")
    };

    private sealed record ZipIndex(IReadOnlyDictionary<string, ZipArchiveEntry> ByReference);
}

public sealed class BatchOcrQueue
{
    private readonly Channel<BatchOcrQueueItem> _channel = Channel.CreateUnbounded<BatchOcrQueueItem>(
        new UnboundedChannelOptions { SingleReader = true, AllowSynchronousContinuations = false });
    private readonly ConcurrentDictionary<long, byte> _queuedItems = new();

    public async ValueTask EnqueueAsync(BatchOcrQueueItem item, CancellationToken cancellationToken = default)
    {
        if (!_queuedItems.TryAdd(item.ItemId, 0)) return;
        try { await _channel.Writer.WriteAsync(item, cancellationToken); }
        catch { _queuedItems.TryRemove(item.ItemId, out _); throw; }
    }

    public IAsyncEnumerable<BatchOcrQueueItem> ReadAllAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAllAsync(cancellationToken);

    public void Complete(BatchOcrQueueItem item) => _queuedItems.TryRemove(item.ItemId, out _);
}

public sealed class BatchOcrWorker : BackgroundService
{
    private readonly BatchOcrQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<BatchOcrWorker> _logger;

    public BatchOcrWorker(
        BatchOcrQueue queue,
        IServiceScopeFactory scopeFactory,
        IWebHostEnvironment environment,
        ILogger<BatchOcrWorker> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _environment = environment;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var recoveryScope = _scopeFactory.CreateScope();
            var repository = recoveryScope.ServiceProvider.GetRequiredService<OracleDmsService>();
            foreach (var pending in await repository.GetPendingBatchOcrItemsAsync())
                await _queue.EnqueueAsync(pending, stoppingToken);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Không thể khôi phục hàng đợi OCR import; bảng có thể chưa được khởi tạo.");
        }

        await foreach (var item in _queue.ReadAllAsync(stoppingToken))
        {
            try { await ProcessAsync(item); }
            catch (Exception exception) { _logger.LogError(exception, "Lỗi worker OCR cho import item {ItemId}.", item.ItemId); }
            finally { _queue.Complete(item); }
        }
    }

    private async Task ProcessAsync(BatchOcrQueueItem item)
    {
        using var scope = _scopeFactory.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<OracleDmsService>();
        var ocrService = scope.ServiceProvider.GetRequiredService<OcrService>();
        try
        {
            await repository.MarkBatchOcrStartedAsync(item.ItemId);
            await repository.UpdateDocumentOcrAsync(item.DocumentId, "PROCESSING", "Đang OCR nền từ import ZIP...");
            var safeFileName = Path.GetFileName(item.StoredFileName);
            var filePath = Path.Combine(_environment.ContentRootPath, "uploads", safeFileName);
            var extraction = ocrService.ExtractTextDetailed(filePath, item.Engine);
            var description = extraction.Text.Length > 3900 ? extraction.Text[..3895] + "..." : extraction.Text;
            await repository.UpdateDocumentOcrAsync(item.DocumentId, "DONE", description);
            await repository.MarkBatchOcrCompletedAsync(item.ItemId, extraction.Engine);
        }
        catch (Exception exception)
        {
            try { await repository.UpdateDocumentOcrAsync(item.DocumentId, "ERROR", ""); }
            catch (Exception updateException) { _logger.LogWarning(updateException, "Không cập nhật được OCR_STATUS cho document {DocumentId}.", item.DocumentId); }
            await repository.MarkBatchOcrFailedAsync(item.ItemId, exception.Message);
        }
        finally
        {
            await repository.RefreshBatchImportJobAsync(item.JobId);
        }
    }
}
