using IDP.DMS.Api.Models;

namespace IDP.DMS.Api.Services;

public sealed class Gd2BusinessService
{
    private const long ReportDigitizedBase = 1245;
    private const long ReportApprovedBase = 983;
    private const long ReportBorrowBase = 131;

    private const long SystemDossierBase = 1715;
    private const long SystemDocumentBase = 1245;
    private const long SystemApprovedBase = 983;
    private const long SystemBorrowBase = 131;
    private const long SystemNotificationBase = 18;
    private const long SystemWorkflowBase = 40;

    private readonly object _gate = new();
    private readonly List<WorkflowEventDto> _workflowEvents = new();
    private readonly Dictionary<long, DossierDto> _dossiers = new();
    private readonly Dictionary<long, string> _borrowStatuses = new();
    private readonly Dictionary<long, DocumentState> _documents = new();
    private readonly List<NotificationDto> _notifications = new();
    private readonly List<ReportRunDto> _reportRuns = new();
    private readonly List<ReportConfigDto> _reportConfigs = new();
    private readonly List<Gd2AuditLogDto> _auditLogs = new();
    private readonly List<Gd2AccessScopeDto> _accessScopes = new();
    private readonly List<Gd2SecurityPolicyDto> _securityPolicies = new();
    private readonly List<Gd2DigitalSignatureDto> _digitalSignatures = new();
    private readonly List<SupplementGuideDto> _supplementGuides = new();
    private readonly Dictionary<long, Gd2OcrExtractionDto> _ocrExtractions = new();
    private readonly List<Gd2IntegrationSystemDto> _integrationSystems = new();
    private readonly List<Gd2ApiKeyDto> _apiKeys = new();
    private readonly List<Gd2IntegrationLogDto> _integrationLogs = new();
    private readonly Dictionary<string, Gd2SecurityLabelDto> _securityLabels = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, Gd2UnitCustomizationDto> _unitCustomizations = new(StringComparer.OrdinalIgnoreCase);
    private readonly List<Gd2SharedDossierTypeDto> _sharedDossierTypes = new();
    private readonly List<Gd2ArchiveDossierDto> _archiveDossiers = new();
    private readonly List<Gd2BorrowFlowDto> _borrowFlows = new();

    private long _workflowEventSequence;
    private long _documentVersionSequence;
    private long _notificationSequence;
    private long _reportRunSequence;
    private long _reportConfigSequence;
    private long _auditSequence;
    private long _accessScopeSequence;
    private long _digitalSignatureSequence;
    private long _supplementGuideSequence;
    private long _apiKeySequence;
    private long _integrationLogSequence;
    private long _sharedDossierTypeSequence;
    private long _archiveDossierSequence;
    private long _borrowFlowSequence;

    public Gd2BusinessService()
    {
        Seed();
    }

    public Task<IReadOnlyList<DossierDto>> GetWorkflowItemsAsync()
    {
        lock (_gate)
        {
            return Task.FromResult<IReadOnlyList<DossierDto>>(_dossiers.Values.OrderBy(item => item.Id).ToList());
        }
    }

    public Task<WorkflowDraftSeedResult> CreateWorkflowDraftSeedAsync()
    {
        lock (_gate)
        {
            var now = DateTime.UtcNow;
            var nextDossierId = _dossiers.Count == 0 ? 1 : _dossiers.Keys.Max() + 1;
            var nextDocumentId = _documents.Count == 0 ? 1 : _documents.Keys.Max() + 1;
            var dossierCode = $"HS-TD-{nextDossierId:000}";
            var documentCode = $"VB-TD-{nextDocumentId:000}";

            var dossier = new DossierDto(
                nextDossierId,
                dossierCode,
                $"Hồ sơ test DRAFT {nextDossierId}",
                "Hành chính",
                1,
                "DRAFT",
                now.AddDays(-1),
                now.AddDays(30),
                "Hồ sơ tạo tự động để test luồng GD2-6 -> GD2-2.");
            _dossiers[nextDossierId] = dossier;

            var document = new DocumentState(
                nextDocumentId,
                nextDossierId,
                documentCode,
                $"Tài liệu test DRAFT {nextDocumentId}",
                $"test-{nextDocumentId:000}.pdf",
                "PENDING",
                "DRAFT",
                "Tài liệu tạo tự động để test gửi kiểm duyệt.");
            document.Versions.Add(CreateVersionSnapshot(document, "system", "Khởi tạo tài liệu test", "Khởi tạo phiên bản test"));
            document.NextVersionNumber = 2;
            _documents[nextDocumentId] = document;

            AddWorkflowEvent("DOSSIER", nextDossierId, "SEED", null, "DRAFT", "Tạo hồ sơ test DRAFT", "system", "DEFAULT");
            AddWorkflowEvent("DOCUMENT", nextDocumentId, "SEED", null, "DRAFT", "Tạo tài liệu test DRAFT", "system", "DEFAULT");

            return Task.FromResult(new WorkflowDraftSeedResult(
                nextDossierId,
                dossierCode,
                nextDocumentId,
                documentCode,
                "DRAFT",
                now));
        }
    }

    public Task<IReadOnlyList<DossierDto>> GetSupplementReviewItemsAsync()
    {
        lock (_gate)
        {
            var items = _dossiers.Values
                .Where(item => NormalizeStatus(item.Status) is "PENDING" or "APPROVED" or "PUBLISHED" or "NEEDS_SUPPLEMENT" or "REJECTED")
                .OrderBy(item => item.Id)
                .ToList();

            return Task.FromResult<IReadOnlyList<DossierDto>>(items);
        }
    }

    public Task<WorkflowTransitionResult> TransitionWorkflowAsync(WorkflowTransitionRequest request)
    {
        ValidateTransitionRequest(request);

        lock (_gate)
        {
            var entityType = Normalize(request.EntityType);
            var action = Normalize(request.Action);
            var actor = request.Actor.Trim();
            var unitCode = string.IsNullOrWhiteSpace(request.UnitCode) ? null : request.UnitCode.Trim();
            var comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim();
            var recipient = string.IsNullOrWhiteSpace(request.Recipient) ? null : request.Recipient.Trim();

            return entityType switch
            {
                "DOSSIER" => Task.FromResult(TransitionDossier(request.EntityId, action, actor, unitCode, comment, recipient)),
                "DOCUMENT" => Task.FromResult(TransitionDocument(request.EntityId, action, actor, unitCode, comment, recipient)),
                "BORROW" => Task.FromResult(TransitionBorrow(request.EntityId, action, actor, unitCode, comment, recipient)),
                _ => throw new BusinessRuleException($"Không hỗ trợ chuyển trạng thái cho loại thực thể '{request.EntityType}'.")
            };
        }
    }

    public Task<IReadOnlyList<WorkflowEventDto>> GetWorkflowHistoryAsync(string entityType, long entityId)
    {
        lock (_gate)
        {
            var normalizedType = Normalize(entityType);
            var history = _workflowEvents
                .Where(item => Normalize(item.EntityType) == normalizedType && item.EntityId == entityId)
                .OrderByDescending(item => item.CreatedAt)
                .ToList();
            return Task.FromResult<IReadOnlyList<WorkflowEventDto>>(history);
        }
    }

    public Task<WorkflowDefinitionDto> GetWorkflowDefinitionAsync()
    {
        lock (_gate)
        {
            return Task.FromResult(BuildWorkflowDefinition());
        }
    }

    public Task<WorkflowStatusDto> GetWorkflowStatusAsync(string entityType, long entityId)
    {
        lock (_gate)
        {
            var normalizedType = Normalize(entityType);
            var currentStatus = normalizedType switch
            {
                "DOSSIER" => NormalizeStatus(EnsureDossier(entityId).Status),
                "DOCUMENT" => NormalizeStatus(EnsureDocument(entityId).Status),
                _ => throw new BusinessRuleException($"Khong ho tro theo doi workflow cho '{entityType}'.")
            };
            var history = _workflowEvents
                .Where(item => Normalize(item.EntityType) == normalizedType && item.EntityId == entityId)
                .OrderByDescending(item => item.CreatedAt)
                .ToList();
            var steps = BuildRuntimeWorkflowSteps(currentStatus, history);
            var currentStep = steps.FirstOrDefault(item => item.State == "CURRENT") ?? steps.Last();

            return Task.FromResult(new WorkflowStatusDto(
                normalizedType,
                entityId,
                currentStatus,
                currentStep.Code,
                currentStep.Assignee,
                currentStep.Deadline,
                steps,
                history,
                DateTime.UtcNow));
        }
    }

    public Task<IReadOnlyList<DocumentVersionDto>> GetDocumentVersionsAsync(long documentId)
    {
        lock (_gate)
        {
            var document = EnsureDocument(documentId);
            return Task.FromResult<IReadOnlyList<DocumentVersionDto>>(document.Versions
                .OrderByDescending(item => item.VersionNumber)
                .ToList());
        }
    }

    public Task<IReadOnlyList<Gd2DocumentVersionDetailDto>> GetDocumentVersionTimelineAsync(long documentId)
    {
        lock (_gate)
        {
            var document = EnsureDocument(documentId);
            return Task.FromResult<IReadOnlyList<Gd2DocumentVersionDetailDto>>(document.Versions
                .OrderByDescending(item => item.VersionNumber)
                .Select(ToVersionDetail)
                .ToList());
        }
    }

    public Task<Gd2DocumentVersionCompareDto> CompareDocumentVersionsAsync(long documentId, long leftVersionId, long rightVersionId)
    {
        lock (_gate)
        {
            var document = EnsureDocument(documentId);
            var left = document.Versions.FirstOrDefault(item => item.Id == leftVersionId)
                ?? throw new BusinessRuleException("Không tìm thấy phiên bản bên trái để so sánh.");
            var right = document.Versions.FirstOrDefault(item => item.Id == rightVersionId)
                ?? throw new BusinessRuleException("Không tìm thấy phiên bản bên phải để so sánh.");

            var fields = new List<Gd2DocumentVersionDiffFieldDto>
            {
                Diff("code", "Mã tài liệu", left.Code, right.Code),
                Diff("title", "Tên tài liệu", left.Title, right.Title),
                Diff("fileName", "File", left.FileName, right.FileName),
                Diff("ocrStatus", "OCR", left.OcrStatus, right.OcrStatus),
                Diff("status", "Trạng thái", left.Status, right.Status),
                Diff("description", "Metadata/Nội dung OCR", left.Description, right.Description),
                Diff("note", "Ghi chú thay đổi", left.Note, right.Note),
            };

            AddAuditLog("COMPARE_VERSION", "DOCUMENT", documentId, "current-user", "DEFAULT", null, "CHUYEN_VIEN", $"So sánh {VersionLabel(left)} và {VersionLabel(right)}", "SUCCESS");
            return Task.FromResult(new Gd2DocumentVersionCompareDto(documentId, ToVersionDetail(left), ToVersionDetail(right), fields, DateTime.UtcNow));
        }
    }

    public Task<IReadOnlyList<DocumentDto>> GetOcrItemsAsync(string? status)
    {
        lock (_gate)
        {
            var normalizedStatus = string.IsNullOrWhiteSpace(status) ? null : NormalizeStatus(status);
            var items = _documents.Values
                .Where(item => normalizedStatus is null || NormalizeStatus(item.OcrStatus) == normalizedStatus)
                .OrderBy(item => item.Id)
                .Select(ToDocumentDto)
                .ToList();

            return Task.FromResult<IReadOnlyList<DocumentDto>>(items);
        }
    }

    public Task<Gd2DocumentSearchResult> SearchDocumentsAsync(Gd2DocumentSearchRequest request)
    {
        lock (_gate)
        {
            var page = Math.Max(1, request.Page);
            var pageSize = Math.Clamp(request.PageSize <= 0 ? 10 : request.PageSize, 5, 2000);
            var query = request.Query?.Trim();
            var metadata = request.Metadata?.Trim();
            var documentType = request.DocumentType?.Trim();
            var status = request.Status?.Trim();
            var ocrStatus = request.OcrStatus?.Trim();

            var filtered = _documents.Values.AsEnumerable();
            if (request.DossierId is > 0)
            {
                filtered = filtered.Where(item => item.DossierId == request.DossierId.Value);
            }
            if (request.StorageId is > 0)
            {
                filtered = filtered.Where(item =>
                    _dossiers.TryGetValue(item.DossierId, out var dossier) && dossier.StorageId == request.StorageId.Value);
            }
            if (!string.IsNullOrWhiteSpace(query))
            {
                filtered = filtered.Where(item => $"{item.Code} {item.Title} {item.FileName} {item.Description}".Contains(query, StringComparison.OrdinalIgnoreCase));
            }
            if (!string.IsNullOrWhiteSpace(metadata))
            {
                filtered = filtered.Where(item => $"{item.Description} {item.FileName}".Contains(metadata, StringComparison.OrdinalIgnoreCase));
            }
            if (!string.IsNullOrWhiteSpace(documentType))
            {
                filtered = filtered.Where(item => InferDocumentType(item).Equals(documentType, StringComparison.OrdinalIgnoreCase));
            }
            if (!string.IsNullOrWhiteSpace(status))
            {
                filtered = filtered.Where(item => string.Equals(NormalizeStatus(item.Status), NormalizeStatus(status), StringComparison.OrdinalIgnoreCase));
            }
            if (!string.IsNullOrWhiteSpace(ocrStatus))
            {
                filtered = filtered.Where(item => string.Equals(NormalizeStatus(item.OcrStatus), NormalizeStatus(ocrStatus), StringComparison.OrdinalIgnoreCase));
            }
            if (request.FromDate.HasValue)
            {
                filtered = filtered.Where(item => LatestDocumentDate(item) >= request.FromDate.Value.Date);
            }
            if (request.ToDate.HasValue)
            {
                filtered = filtered.Where(item => LatestDocumentDate(item) < request.ToDate.Value.Date.AddDays(1));
            }

            var total = filtered.Count();
            var items = filtered
                .OrderBy(item => item.Code)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(ToDocumentDto)
                .ToList();

            return Task.FromResult(new Gd2DocumentSearchResult(
                items,
                page,
                pageSize,
                total,
                Math.Max(1, (int)Math.Ceiling(total / (double)pageSize)),
                DateTime.UtcNow));
        }
    }

    public Task<IReadOnlyList<Gd2DocumentTreeNodeDto>> GetDocumentTreeAsync()
    {
        lock (_gate)
        {
            var dossierNodes = _dossiers.Values
                .OrderBy(item => item.Code)
                .Select(dossier =>
                {
                    var children = _documents.Values
                        .Where(document => document.DossierId == dossier.Id)
                        .GroupBy(InferDocumentType)
                        .OrderBy(group => group.Key)
                        .Select(group => new Gd2DocumentTreeNodeDto(
                            $"type-{dossier.Id}-{group.Key}",
                            group.Key,
                            "DOCUMENT_TYPE",
                            null,
                            group.Count(),
                            []))
                        .ToList();

                    return new Gd2DocumentTreeNodeDto(
                        $"dossier-{dossier.Id}",
                        $"{dossier.Code} - {dossier.Title}",
                        "DOSSIER",
                        dossier.Id,
                        children.Sum(child => child.Count),
                        children);
                })
                .ToList();

            return Task.FromResult<IReadOnlyList<Gd2DocumentTreeNodeDto>>([
                new("root", "Kho tài liệu số hóa", "ROOT", null, _documents.Count, dossierNodes)
            ]);
        }
    }

    public Task<DocumentDto> PublishDocumentAsync(long documentId, WorkflowTransitionRequest request)
    {
        lock (_gate)
        {
            var document = EnsureDocument(documentId);
            var actor = NormalizeUser(request.Actor);
            var previous = NormalizeStatus(document.Status);
            document.Status = "PUBLISHED";
            document.Versions.Add(CreateVersionSnapshot(document, actor, "Tạo phiên bản published mặc định cho khai thác", "Published version"));
            document.NextVersionNumber++;
            AddWorkflowEvent("DOCUMENT", documentId, "PUBLISH", previous, document.Status, request.Comment ?? "Xuất bản tài liệu số hóa", actor, request.UnitCode);
            return Task.FromResult(ToDocumentDto(document));
        }
    }

    public Task<DocumentDto> IndexDocumentAsync(long documentId, string actor, string? unitCode, string? note = null)
    {
        lock (_gate)
        {
            var document = EnsureDocument(documentId);
            AddWorkflowEvent("DOCUMENT", documentId, "INDEX", document.OcrStatus, document.OcrStatus ?? "PENDING", note ?? "Tự động đánh chỉ mục tài liệu", NormalizeUser(actor), unitCode);
            return Task.FromResult(ToDocumentDto(document));
        }
    }

    public Task<Gd2DocumentExportResult> ExportDocumentsAsync(string? format, IReadOnlyList<long>? documentIds)
    {
        lock (_gate)
        {
            var normalizedFormat = NormalizeExportFormat(format);
            var ids = documentIds?.Where(id => id > 0).Distinct().ToList();
            var count = ids is { Count: > 0 } ? ids.Count(id => _documents.ContainsKey(id)) : _documents.Count;
            AddAuditLog("EXPORT", "DOCUMENT", ids?.FirstOrDefault() ?? 0, "current-user", "DEFAULT", null, "CHUYEN_VIEN", $"Xuất {count} tài liệu dạng {normalizedFormat}", "SUCCESS");
            return Task.FromResult(new Gd2DocumentExportResult(
                normalizedFormat,
                $"gd2-documents-{DateTime.UtcNow:yyyyMMddHHmmss}.{ExportExtension(normalizedFormat)}",
                count,
                DateTime.UtcNow));
        }
    }

    public Task<IReadOnlyList<Gd2DigitalSignatureDto>> GetDocumentSignaturesAsync(long documentId)
    {
        lock (_gate)
        {
            EnsureDocument(documentId);
            return Task.FromResult<IReadOnlyList<Gd2DigitalSignatureDto>>(_digitalSignatures
                .Where(item => item.DocumentId == documentId)
                .OrderByDescending(item => item.SignedAt)
                .ToList());
        }
    }

    public Task<Gd2DigitalSignatureDto> SignDocumentAsync(Gd2DigitalSignatureRequest request)
    {
        ValidateSignatureRequest(request);
        lock (_gate)
        {
            var document = EnsureDocument(request.DocumentId);
            var provider = NormalizeSignatureProvider(request.Provider);
            var now = DateTime.UtcNow;
            var signature = new Gd2DigitalSignatureDto(
                ++_digitalSignatureSequence,
                document.Id,
                document.Code,
                document.Title,
                NormalizeUser(request.Signer),
                provider,
                BuildCertificateSubject(request.Signer, provider),
                string.IsNullOrWhiteSpace(request.CertificateSerial) ? $"IDP-{document.Id:000}-{_digitalSignatureSequence:000}" : request.CertificateSerial.Trim(),
                now.AddYears(-1),
                now.AddYears(2),
                now,
                now.AddSeconds(2),
                "GOOD",
                "GOOD",
                "VALID",
                NormalizeSignatureZone(request.Zone),
                string.IsNullOrWhiteSpace(request.AppearanceText) ? $"Ky boi {NormalizeUser(request.Signer)}" : request.AppearanceText.Trim());

            _digitalSignatures.Insert(0, signature);
            var previous = NormalizeStatus(document.Status);
            document.Status = "PUBLISHED";
            AddWorkflowEvent("DOCUMENT", document.Id, "SIGN", previous, "PUBLISHED", $"Ky so bang {provider}", signature.Signer, request.UnitCode);
            AddAuditLog("DIGITAL_SIGN", "DOCUMENT", document.Id, signature.Signer, request.UnitCode, null, "LANH_DAO", $"Ky tai trang {signature.Zone.Page}, toa do {signature.Zone.X},{signature.Zone.Y}", "SUCCESS");
            return Task.FromResult(signature);
        }
    }

    public Task<Gd2SignatureValidationDto> VerifyDocumentSignatureAsync(long documentId)
    {
        lock (_gate)
        {
            var document = EnsureDocument(documentId);
            var signatures = _digitalSignatures
                .Where(item => item.DocumentId == documentId)
                .OrderByDescending(item => item.SignedAt)
                .ToList();
            var valid = signatures.Count > 0 && signatures.All(item =>
                item.ValidationStatus == "VALID" &&
                item.OcspStatus == "GOOD" &&
                item.CrlStatus == "GOOD" &&
                item.ValidFrom <= DateTime.UtcNow &&
                item.ValidTo >= DateTime.UtcNow);

            AddAuditLog("VERIFY_SIGNATURE", "DOCUMENT", document.Id, "current-user", "DEFAULT", null, "CHUYEN_VIEN", valid ? "Chu ky hop le" : "Chua co chu ky hop le", valid ? "SUCCESS" : "FAILED");
            return Task.FromResult(new Gd2SignatureValidationDto(
                document.Id,
                document.Code,
                valid,
                valid ? "Chu ky hop le" : "Chua co chu ky hop le",
                signatures,
                DateTime.UtcNow));
        }
    }

    public Task<DocumentDto> SyncDocumentAsync(DocumentDto document)
    {
        lock (_gate)
        {
            var state = _documents.TryGetValue(document.Id, out var existing)
                ? existing
                : new DocumentState(
                    document.Id,
                    document.DossierId,
                    document.Code,
                    document.Title,
                    document.FileName,
                    document.OcrStatus ?? "PENDING",
                    document.Status ?? "DRAFT",
                    document.Description);

            if (existing is not null && DocumentChanged(existing, document))
            {
                existing.Versions.Add(CreateVersionSnapshot(existing, "current-user", "Tự động lưu trước khi cập nhật/tải đè tài liệu", "Auto version before sync"));
                existing.NextVersionNumber++;
            }

            state.DossierId = document.DossierId;
            state.Code = document.Code;
            state.Title = document.Title;
            state.FileName = document.FileName;
            state.OcrStatus = string.IsNullOrWhiteSpace(document.OcrStatus) ? "PENDING" : document.OcrStatus;
            state.Status = string.IsNullOrWhiteSpace(document.Status) ? "DRAFT" : document.Status;
            state.Description = document.Description;
            _documents[document.Id] = state;

            return Task.FromResult(ToDocumentDto(state));
        }
    }

    public Task<Gd2OcrSummaryDto> GetOcrSummaryAsync()
    {
        lock (_gate)
        {
            var total = _documents.Count;
            var done = CountDocumentsByOcrStatus("DONE") + CountDocumentsByOcrStatus("CONFIRMED");
            var pending = CountDocumentsByOcrStatus("PENDING") + CountDocumentsByOcrStatus("PROCESSING");
            var error = CountDocumentsByOcrStatus("ERROR");
            var completionRate = total == 0 ? 0m : Math.Round(done * 100m / total, 2);

            return Task.FromResult(new Gd2OcrSummaryDto(total, done, pending, error, completionRate, DateTime.UtcNow));
        }
    }

    public Task<Gd2OcrResultDto> ProcessOcrAsync(long documentId, Gd2OcrProcessRequest request)
    {
        lock (_gate)
        {
            return Task.FromResult(ProcessOcrDocument(documentId, request));
        }
    }

    public Task<IReadOnlyList<Gd2OcrResultDto>> ProcessOcrBatchAsync(Gd2OcrProcessRequest request)
    {
        lock (_gate)
        {
            var requestedIds = request.DocumentIds?.Where(id => id > 0).Distinct().ToList();
            var targetIds = requestedIds is { Count: > 0 }
                ? requestedIds
                : _documents.Values
                    .Where(item => NormalizeStatus(item.OcrStatus) is "PENDING" or "ERROR")
                    .OrderBy(item => item.Id)
                    .Select(item => item.Id)
                    .ToList();

            if (targetIds.Count == 0)
            {
                throw new BusinessRuleException("Không có tài liệu nào cần OCR.");
            }

            var results = targetIds.Select(id => ProcessOcrDocument(id, request)).ToList();
            return Task.FromResult<IReadOnlyList<Gd2OcrResultDto>>(results);
        }
    }

    public Task<Gd2OcrExtractionDto> ExtractOcrMetadataAsync(long documentId, Gd2OcrProcessRequest request)
    {
        lock (_gate)
        {
            var document = EnsureDocument(documentId);
            var result = ProcessOcrDocument(documentId, request);
            var extraction = BuildOcrExtraction(document, result.Engine, result.ExtractedText, result.Confidence, confirmed: false);
            _ocrExtractions[documentId] = extraction;
            AddAuditLog("OCR_EXTRACT_METADATA", "DOCUMENT", documentId, NormalizeUser(request.Actor), request.UnitCode, null, "CHUYEN_VIEN", $"Boc tach {extraction.Fields.Count} truong metadata tu {extraction.DocumentType}", "SUCCESS");
            return Task.FromResult(extraction);
        }
    }

    public Task<Gd2OcrExtractionDto> GetOcrExtractionAsync(long documentId)
    {
        lock (_gate)
        {
            var document = EnsureDocument(documentId);
            if (!_ocrExtractions.TryGetValue(documentId, out var extraction))
            {
                var text = string.IsNullOrWhiteSpace(document.Description) ? BuildOcrText(document, "GEMINI") : document.Description;
                extraction = BuildOcrExtraction(document, "GEMINI", text, CalculateOcrConfidence(document, "GEMINI"), confirmed: false);
                _ocrExtractions[documentId] = extraction;
            }

            return Task.FromResult(extraction);
        }
    }

    public Task<Gd2OcrConfirmationResult> ConfirmOcrExtractionAsync(long documentId, Gd2OcrConfirmationRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thieu yeu cau xac nhan OCR.");
        if (string.IsNullOrWhiteSpace(request.Actor)) throw new BusinessRuleException("Thieu nguoi xac nhan OCR.");
        lock (_gate)
        {
            var document = EnsureDocument(documentId);
            var current = _ocrExtractions.TryGetValue(documentId, out var existing)
                ? existing
                : BuildOcrExtraction(document, "GEMINI", document.Description ?? BuildOcrText(document, "GEMINI"), CalculateOcrConfidence(document, "GEMINI"), confirmed: false);
            var fields = request.Fields.Count == 0 ? current.Fields : request.Fields;
            var confirmedFields = fields.Select(field => field with { Confirmed = true }).ToList();
            var confidence = confirmedFields.Count == 0 ? 0 : Math.Round(confirmedFields.Average(item => item.Confidence), 2);
            var metadata = string.Join(Environment.NewLine, confirmedFields.Select(item => $"{item.Label}: {item.Value}"));
            document.Description = metadata;
            document.OcrStatus = "CONFIRMED";
            var confirmed = current with
            {
                Fields = confirmedFields,
                OverallConfidence = confidence,
                RawText = metadata,
                Status = "CONFIRMED",
                ExtractedAt = DateTime.UtcNow
            };
            _ocrExtractions[documentId] = confirmed;
            AddWorkflowEvent("DOCUMENT", documentId, "CONFIRM_OCR", current.Status, "CONFIRMED", request.Note ?? "Xac nhan du lieu OCR chinh xac", NormalizeUser(request.Actor), request.UnitCode);
            AddNotification("DOCUMENT", documentId, document.Code, $"Tài liệu {document.Code} đã xác nhận OCR", request.Note ?? "Dữ liệu OCR đã lưu chính thức vào CSDL.", "SENT");
            return Task.FromResult(new Gd2OcrConfirmationResult(documentId, document.Code, confirmed.DocumentType, confidence, "CONFIRMED", DateTime.UtcNow, confirmedFields));
        }
    }

    public Task<DocumentVersionDto> CreateDocumentVersionAsync(long documentId, DocumentVersionRequest request)
    {
        lock (_gate)
        {
            var document = EnsureDocument(documentId);
            var createdBy = NormalizeUser(request.CreatedBy);
            var version = CreateVersionSnapshot(document, createdBy, request.Note, $"Tạo phiên bản thủ công V{document.NextVersionNumber}");
            document.Versions.Add(version);
            document.NextVersionNumber++;
            return Task.FromResult(version);
        }
    }

    public Task<DocumentVersionDto> RestoreDocumentVersionAsync(long documentId, long versionId, RestoreDocumentVersionRequest request)
    {
        lock (_gate)
        {
            var document = EnsureDocument(documentId);
            var version = document.Versions.FirstOrDefault(item => item.Id == versionId);
            if (version is null)
            {
                throw new BusinessRuleException("Không tìm thấy phiên bản tài liệu cần khôi phục.");
            }

            document.Code = version.Code;
            document.Title = version.Title;
            document.FileName = version.FileName;
            document.OcrStatus = version.OcrStatus;
            document.Status = version.Status;
            document.Description = version.Description;

            var actor = NormalizeUser(request.Actor);
            var restored = CreateVersionSnapshot(document, actor, $"Khôi phục từ V{version.VersionNumber}", $"Khôi phục phiên bản V{version.VersionNumber}");
            document.Versions.Add(restored);
            document.NextVersionNumber++;

            AddWorkflowEvent(
                "DOCUMENT",
                documentId,
                "RESTORE_VERSION",
                version.Status,
                NextStatus(document.Status),
                $"Khôi phục tài liệu về phiên bản V{version.VersionNumber}",
                actor,
                null);

            AddNotification(
                "DOCUMENT",
                documentId,
                actor,
                $"Tài liệu {document.Code} đã được khôi phục",
                $"Phiên bản V{version.VersionNumber} đã được khôi phục thành công.",
                "SENT");

            return Task.FromResult(restored);
        }
    }

    public Task<ReportSummaryDto> GetReportSummaryAsync(string? dataType)
    {
        lock (_gate)
        {
            return Task.FromResult(new ReportSummaryDto(BuildReportRows(dataType), DateTime.UtcNow));
        }
    }

    public Task<Gd2ExecutiveDashboardDto> GetExecutiveDashboardAsync(DateTime? fromDate, DateTime? toDate, string? department, string? dossierType)
    {
        lock (_gate)
        {
            var normalizedDepartment = string.IsNullOrWhiteSpace(department) ? "ALL" : department.Trim();
            var normalizedDossierType = string.IsNullOrWhiteSpace(dossierType) ? "ALL" : dossierType.Trim();
            var filteredDossiers = _dossiers.Values.Where(item =>
                (!fromDate.HasValue || item.FromDate >= fromDate.Value.Date)
                && (!toDate.HasValue || item.FromDate <= toDate.Value.Date.AddDays(1).AddTicks(-1))
                && (normalizedDossierType == "ALL" || string.Equals(item.DossierType, normalizedDossierType, StringComparison.OrdinalIgnoreCase)))
                .ToList();

            var processedCount = filteredDossiers.Count(item => NormalizeStatus(item.Status) is "APPROVED" or "PUBLISHED" or "CONFIRMED");
            var overdueCount = filteredDossiers.Count(item => item.ToDate.HasValue && item.ToDate.Value < DateTime.UtcNow && NormalizeStatus(item.Status) is "DRAFT" or "PENDING" or "NEEDS_SUPPLEMENT");
            var totalDossiers = ReportDigitizedBase + filteredDossiers.Count + (normalizedDepartment == "ALL" ? 35 : 12);
            var approvedOnTime = Math.Max(0, ReportApprovedBase + processedCount - overdueCount);
            var approvedLate = 47 + overdueCount;
            var borrowTotal = ReportBorrowBase + _borrowStatuses.Count + (normalizedDepartment == "ALL" ? 18 : 6);

            var kpis = new List<Gd2KpiCardDto>
            {
                new("NEW_DOSSIER", "Ho so nhap moi", totalDossiers, "ho so", 12.5m, "UP"),
                new("SLA_APPROVAL", "Duyet dung han", Math.Round(approvedOnTime * 100m / Math.Max(1, approvedOnTime + approvedLate), 1), "%", 4.2m, "UP"),
                new("BORROW_RETURN", "Luot muon tra", borrowTotal, "luot", -2.1m, "DOWN"),
                new("AVG_PROCESSING", "TG xu ly TB", 18.6m, "gio", -8.4m, "GOOD")
            };

            var newDossierTrend = new List<Gd2ChartPointDto>
            {
                new("T1", totalDossiers - 180, "Ho so", "#3264f4"),
                new("T2", totalDossiers - 126, "Ho so", "#3264f4"),
                new("T3", totalDossiers - 74, "Ho so", "#3264f4"),
                new("T4", totalDossiers - 31, "Ho so", "#3264f4"),
                new("T5", totalDossiers + 22, "Ho so", "#3264f4"),
                new("T6", totalDossiers + 64, "Ho so", "#3264f4")
            };

            var approvalPie = new List<Gd2ChartPointDto>
            {
                new("Dung han", approvedOnTime, "SLA", "#16a34a"),
                new("Tre han", approvedLate, "SLA", "#dc2626"),
                new("Cho xu ly", Math.Max(18, filteredDossiers.Count(item => NormalizeStatus(item.Status) is "DRAFT" or "PENDING") + 36), "SLA", "#f59e0b")
            };

            var borrowTrend = new List<Gd2ChartPointDto>
            {
                new("T1", borrowTotal - 28, "Muon", "#0ea5e9"),
                new("T2", borrowTotal - 12, "Muon", "#0ea5e9"),
                new("T3", borrowTotal + 9, "Muon", "#0ea5e9"),
                new("T4", borrowTotal + 24, "Muon", "#0ea5e9"),
                new("T5", borrowTotal + 7, "Tra", "#7c3aed"),
                new("T6", borrowTotal + 31, "Tra", "#7c3aed")
            };

            var ranking = new List<Gd2EmployeePerformanceDto>
            {
                new("NV001", "Nguyen Minh Anh", normalizedDepartment == "ALL" ? "Hanh chinh" : normalizedDepartment, 186, 14.2m, 96.5m, "A+"),
                new("NV014", "Tran Quoc Bao", normalizedDepartment == "ALL" ? "Tai chinh" : normalizedDepartment, 164, 16.8m, 93.1m, "A"),
                new("NV027", "Le Thu Ha", normalizedDepartment == "ALL" ? "Nhan su" : normalizedDepartment, 142, 19.4m, 88.7m, "B+"),
                new("NV033", "Pham Hoang Nam", normalizedDepartment == "ALL" ? "Phap che" : normalizedDepartment, 118, 22.5m, 82.4m, "B")
            };

            return Task.FromResult(new Gd2ExecutiveDashboardDto(
                kpis,
                newDossierTrend,
                approvalPie,
                borrowTrend,
                ranking,
                normalizedDepartment,
                normalizedDossierType,
                fromDate,
                toDate,
                DateTime.UtcNow));
        }
    }

    public Task<ReportRunDto> LogReportRunAsync(ReportRunRequest request)
    {
        ValidateReportRunRequest(request);

        lock (_gate)
        {
            var rows = BuildReportRows(request.DataType);
            var run = new ReportRunDto(
                ++_reportRunSequence,
                request.ReportCode.Trim(),
                NormalizeReportType(request.DataType),
                request.Format.Trim().ToUpperInvariant(),
                request.Actor.Trim(),
                string.IsNullOrWhiteSpace(request.UnitCode) ? null : request.UnitCode.Trim(),
                string.IsNullOrWhiteSpace(request.Parameters) ? null : request.Parameters.Trim(),
                "COMPLETED",
                rows.Length,
                DateTime.UtcNow);

            _reportRuns.Insert(0, run);
            return Task.FromResult(run);
        }
    }

    public Task<IReadOnlyList<ReportRunDto>> GetReportRunsAsync()
    {
        lock (_gate)
        {
            return Task.FromResult<IReadOnlyList<ReportRunDto>>(_reportRuns
                .OrderByDescending(item => item.CreatedAt)
                .ToList());
        }
    }

    public Task<ReportConfigDto> SaveReportConfigAsync(ReportConfigRequest request)
    {
        ValidateReportConfigRequest(request);

        lock (_gate)
        {
            var normalizedCode = request.Code.Trim();
            var existingIndex = _reportConfigs.FindIndex(item => string.Equals(item.Code, normalizedCode, StringComparison.OrdinalIgnoreCase));
            var config = new ReportConfigDto(
                existingIndex >= 0 ? _reportConfigs[existingIndex].Id : ++_reportConfigSequence,
                normalizedCode,
                request.Name.Trim(),
                NormalizeReportType(request.DataType),
                request.TemplateFileName.Trim(),
                string.IsNullOrWhiteSpace(request.Parameters) ? null : request.Parameters.Trim(),
                string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status.Trim().ToUpperInvariant(),
                DateTime.UtcNow);

            if (existingIndex >= 0)
            {
                _reportConfigs[existingIndex] = config;
            }
            else
            {
                _reportConfigs.Insert(0, config);
            }

            return Task.FromResult(config);
        }
    }

    public Task<IReadOnlyList<ReportConfigDto>> GetReportConfigsAsync()
    {
        lock (_gate)
        {
            return Task.FromResult<IReadOnlyList<ReportConfigDto>>(_reportConfigs
                .OrderByDescending(item => item.CreatedAt)
                .ToList());
        }
    }

    public Task<IReadOnlyList<NotificationDto>> GetNotificationsAsync(string? recipient, string? status)
    {
        lock (_gate)
        {
            var query = _notifications.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(recipient))
            {
                query = query.Where(item => string.Equals(item.Recipient, recipient.Trim(), StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(item => string.Equals(item.Status, status.Trim(), StringComparison.OrdinalIgnoreCase));
            }

            return Task.FromResult<IReadOnlyList<NotificationDto>>(query
                .OrderByDescending(item => item.CreatedAt)
                .ToList());
        }
    }

    public Task<NotificationDto> MarkNotificationReadAsync(long id)
    {
        lock (_gate)
        {
            var index = _notifications.FindIndex(item => item.Id == id);
            if (index < 0)
            {
                throw new BusinessRuleException("Không tìm thấy thông báo cần đánh dấu đã đọc.");
            }

            var current = _notifications[index];
            var updated = current with
            {
                Status = "READ",
                ReadAt = DateTime.UtcNow,
                SentAt = current.SentAt ?? DateTime.UtcNow
            };
            _notifications[index] = updated;
            return Task.FromResult(updated);
        }
    }

    public Task<NotificationDto> ResendNotificationAsync(long id)
    {
        lock (_gate)
        {
            var index = _notifications.FindIndex(item => item.Id == id);
            if (index < 0)
            {
                throw new BusinessRuleException("Không tìm thấy thông báo cần gửi lại.");
            }

            var current = _notifications[index];
            var updated = current with
            {
                Status = "SENT",
                SentAt = DateTime.UtcNow
            };
            _notifications[index] = updated;
            return Task.FromResult(updated);
        }
    }

    public Task<IReadOnlyList<SupplementTemplateDto>> GetSupplementTemplatesAsync()
    {
        return Task.FromResult<IReadOnlyList<SupplementTemplateDto>>(BuildSupplementTemplates());
    }

    public Task<IReadOnlyList<SupplementGuideDto>> GetSupplementGuidesAsync(long? dossierId)
    {
        lock (_gate)
        {
            var query = _supplementGuides.AsEnumerable();
            if (dossierId is > 0)
            {
                query = query.Where(item => item.DossierId == dossierId.Value);
            }

            return Task.FromResult<IReadOnlyList<SupplementGuideDto>>(query.OrderByDescending(item => item.CreatedAt).ToList());
        }
    }

    public Task<SupplementGuideDto> CreateSupplementGuideAsync(SupplementGuideRequest request)
    {
        ValidateSupplementGuideRequest(request);
        lock (_gate)
        {
            var dossier = EnsureDossier(request.DossierId);
            var template = BuildSupplementTemplates().FirstOrDefault(item => item.Code == Normalize(request.TemplateCode))
                ?? BuildSupplementTemplates()[0];
            var missingItems = request.MissingItems?.Where(item => !string.IsNullOrWhiteSpace(item)).Select(item => item.Trim()).ToList()
                ?? new List<string>();
            var content = BuildSupplementGuideContent(dossier, template, request.Reason, missingItems);
            var guide = new SupplementGuideDto(
                ++_supplementGuideSequence,
                dossier.Id,
                dossier.Code,
                $"HD-BS-{_supplementGuideSequence:0000}",
                template.Code,
                request.Reason.Trim(),
                missingItems,
                content,
                NormalizeUser(request.Actor),
                NormalizeUser(request.Recipient),
                "SENT",
                DateTime.UtcNow);

            _supplementGuides.Insert(0, guide);
            var previous = NormalizeStatus(dossier.Status);
            var updated = dossier with { Status = "NEEDS_SUPPLEMENT" };
            _dossiers[dossier.Id] = updated;
            AddWorkflowEvent("DOSSIER", dossier.Id, "REQUEST_SUPPLEMENT", previous, "NEEDS_SUPPLEMENT", request.Reason, guide.Actor, request.UnitCode);
            AddResultNotifications("DOSSIER", dossier.Id, guide.Recipient, $"Hồ sơ {dossier.Code} cần bổ sung", content, "NEEDS_SUPPLEMENT");
            return Task.FromResult(guide);
        }
    }

    public Task<Gd2IntegrationDashboardDto> GetIntegrationDashboardAsync()
    {
        lock (_gate)
        {
            return Task.FromResult(new Gd2IntegrationDashboardDto(
                _integrationSystems.OrderBy(item => item.Code).ToList(),
                _apiKeys.OrderByDescending(item => item.CreatedAt).ToList(),
                _integrationLogs.OrderByDescending(item => item.CreatedAt).Take(80).ToList(),
                _integrationLogs.Count(item => item.Result == "SUCCESS"),
                _integrationLogs.Count(item => item.Result == "ERROR"),
                DateTime.UtcNow));
        }
    }

    public Task<Gd2ApiKeyDto> CreateApiKeyAsync(Gd2ApiKeyRequest request)
    {
        ValidateApiKeyRequest(request);
        lock (_gate)
        {
            var systemCode = NormalizeIntegrationSystemCode(request.SystemCode);
            var key = new Gd2ApiKeyDto(
                ++_apiKeySequence,
                request.ClientName.Trim(),
                systemCode,
                NormalizeIntegrationAuthMode(request.AuthMode),
                $"{($"idp_{systemCode.ToLowerInvariant()}_{Guid.NewGuid():N}")[..20]}...",
                NormalizeIntegrationScopes(request.Scopes),
                "ACTIVE",
                DateTime.UtcNow,
                null);

            _apiKeys.Insert(0, key);
            AddIntegrationLog("OUTBOUND", systemCode, "/api/dms/gd2/integration/api-keys", "POST", 201, "SUCCESS", request.ClientName, "API key created", null);
            AddAuditLog("CREATE_API_KEY", "INTEGRATION", key.Id, "current-admin", "DEFAULT", null, "QTHT", $"Tao API key cho {systemCode}", "SUCCESS");
            return Task.FromResult(key);
        }
    }

    public Task<Gd2IntegrationLogDto> ReceiveWebhookAsync(Gd2WebhookEventRequest request)
    {
        ValidateWebhookRequest(request);
        lock (_gate)
        {
            var systemCode = NormalizeIntegrationSystemCode(request.SystemCode);
            var validAuth = IsIntegrationAuthValid(systemCode, request.ApiKey);
            var log = AddIntegrationLog(
                "INBOUND",
                systemCode,
                $"/open-api/webhooks/{systemCode.ToLowerInvariant()}",
                "POST",
                validAuth ? 202 : 401,
                validAuth ? "SUCCESS" : "ERROR",
                request.Payload.Trim(),
                validAuth ? $"Accepted event {Normalize(request.EventType)}" : "Invalid API key/JWT/OAuth2 token",
                null);

            AddAuditLog("WEBHOOK_RECEIVE", "INTEGRATION", log.Id, "external-system", "DEFAULT", null, "QTHT", $"{systemCode}:{request.EventType}", validAuth ? "SUCCESS" : "FAILED");
            return Task.FromResult(log);
        }
    }

    public Task<Gd2IntegrationLogDto> ReceiveExternalDocumentAsync(Gd2WebhookEventRequest request)
    {
        ValidateWebhookRequest(request);
        lock (_gate)
        {
            var systemCode = NormalizeIntegrationSystemCode(request.SystemCode);
            var validAuth = IsIntegrationAuthValid(systemCode, request.ApiKey);
            var log = AddIntegrationLog(
                "INBOUND",
                systemCode,
                "/open-api/documents",
                "POST",
                validAuth ? 201 : 401,
                validAuth ? "SUCCESS" : "ERROR",
                request.Payload.Trim(),
                validAuth ? "External document accepted for indexing queue" : "Invalid integration credential",
                null);

            AddAuditLog("OPEN_API_DOCUMENT_PUSH", "DOCUMENT", log.Id, "external-system", "DEFAULT", null, "QTHT", systemCode, validAuth ? "SUCCESS" : "FAILED");
            return Task.FromResult(log);
        }
    }

    public Task<Gd2IntegrationLogDto> RunSyncJobAsync(Gd2SyncJobRequest request)
    {
        ValidateSyncJobRequest(request);
        lock (_gate)
        {
            var systemCode = NormalizeIntegrationSystemCode(request.SystemCode);
            var systemIndex = _integrationSystems.FindIndex(item => item.Code == systemCode);
            var current = _integrationSystems[systemIndex];
            var cron = string.IsNullOrWhiteSpace(request.CronExpression) ? current.CronExpression : request.CronExpression.Trim();
            _integrationSystems[systemIndex] = current with
            {
                CronExpression = cron,
                LastSyncAt = DateTime.UtcNow,
                Status = "CONNECTED"
            };

            var dataType = NormalizeSyncDataType(request.DataType);
            var syncedRows = dataType switch
            {
                "DEPARTMENT" => 12,
                "PERSONNEL" => 86,
                "DOSSIER" => _dossiers.Count,
                "DOCUMENT" => _documents.Count,
                _ => 24
            };
            var trigger = Normalize(request.Trigger) == "WEBHOOK" ? "WEBHOOK" : "CRON";
            var log = AddIntegrationLog(
                "OUTBOUND",
                systemCode,
                $"/sync/{dataType.ToLowerInvariant()}",
                trigger,
                200,
                "SUCCESS",
                $"{trigger}:{cron}",
                $"Synced {syncedRows} {dataType} records",
                null);

            AddAuditLog("SYNC_MASTER_DATA", "INTEGRATION", log.Id, "scheduler", "DEFAULT", null, "QTHT", $"{systemCode}:{dataType}", "SUCCESS");
            return Task.FromResult(log);
        }
    }

    public Task<Gd2IntegrationLogDto> RetryIntegrationLogAsync(long id)
    {
        lock (_gate)
        {
            var source = _integrationLogs.FirstOrDefault(item => item.Id == id)
                ?? throw new BusinessRuleException($"Khong tim thay log tich hop #{id}.");
            var log = AddIntegrationLog(source.Direction, source.SystemCode, source.Endpoint, source.Method, 200, "SUCCESS", source.RequestBody, $"Retry OK for log #{id}", id);
            AddAuditLog("RETRY_WEBHOOK", "INTEGRATION", log.Id, "current-admin", "DEFAULT", null, "QTHT", $"Retry log #{id}", "SUCCESS");
            return Task.FromResult(log);
        }
    }

    public Task<IReadOnlyList<Gd2UnitCustomizationDto>> GetUnitCustomizationsAsync()
    {
        lock (_gate)
        {
            return Task.FromResult<IReadOnlyList<Gd2UnitCustomizationDto>>(_unitCustomizations.Values
                .OrderBy(item => item.UnitName)
                .ToList());
        }
    }

    public Task<Gd2UnitCustomizationDto> GetUnitCustomizationAsync(string unitCode)
    {
        lock (_gate)
        {
            var normalized = NormalizeUnitCode(unitCode);
            if (_unitCustomizations.TryGetValue(normalized, out var config))
            {
                return Task.FromResult(config);
            }

            var created = BuildDefaultCustomization(normalized, normalized, "system");
            _unitCustomizations[normalized] = created;
            return Task.FromResult(created);
        }
    }

    public Task<Gd2UnitCustomizationDto> SaveUnitCustomizationAsync(Gd2UnitCustomizationRequest request)
    {
        ValidateUnitCustomizationRequest(request);
        lock (_gate)
        {
            var unitCode = NormalizeUnitCode(request.UnitCode);
            var workflowSteps = NormalizeUnitWorkflowSteps(request.WorkflowSteps);
            var config = new Gd2UnitCustomizationDto(
                unitCode,
                request.UnitName.Trim(),
                string.IsNullOrWhiteSpace(request.LogoUrl) ? "/assets/idp-logo.svg" : request.LogoUrl.Trim(),
                string.IsNullOrWhiteSpace(request.BannerText) ? $"IDP.DMS - {request.UnitName.Trim()}" : request.BannerText.Trim(),
                NormalizeHexColor(request.PrimaryColor, "#3264f4"),
                NormalizeHexColor(request.AccentColor, "#0ea5e9"),
                NormalizeLayoutMode(request.LayoutMode),
                request.MobileOptimized,
                workflowSteps,
                NormalizeUser(request.Actor),
                DateTime.UtcNow);

            _unitCustomizations[unitCode] = config;
            AddAuditLog("SAVE_UNIT_CUSTOMIZATION", "UNIT", Math.Abs(unitCode.GetHashCode()), config.UpdatedBy, unitCode, null, "QTHT", $"Theme {config.PrimaryColor}, layout {config.LayoutMode}", "SUCCESS");
            return Task.FromResult(config);
        }
    }

    public Task<IReadOnlyList<Gd2SharedDossierTypeDto>> GetSharedDossierTypesAsync(string? unitCode)
    {
        lock (_gate)
        {
            var normalizedUnit = string.IsNullOrWhiteSpace(unitCode) ? null : NormalizeUnitCode(unitCode);
            var query = _sharedDossierTypes.AsEnumerable();
            if (normalizedUnit is not null)
            {
                query = query.Where(item => item.MasterUnitCode == normalizedUnit || item.SharedUnitCodes.Contains(normalizedUnit, StringComparer.OrdinalIgnoreCase));
            }

            return Task.FromResult<IReadOnlyList<Gd2SharedDossierTypeDto>>(query
                .OrderBy(item => item.Name)
                .ToList());
        }
    }

    public Task<Gd2DeduplicationCheckResult> CheckSharedDossierTypeDuplicateAsync(Gd2DeduplicationCheckRequest request)
    {
        ValidateDeduplicationCheckRequest(request);
        lock (_gate)
        {
            return Task.FromResult(BuildDeduplicationResult(request.Code, request.Name, request.UnitCode, request.StorageScope));
        }
    }

    public Task<Gd2SharedDossierTypeDto> CreateSharedDossierTypeAsync(Gd2SharedDossierTypeRequest request)
    {
        ValidateSharedDossierTypeRequest(request);
        lock (_gate)
        {
            var duplicate = BuildDeduplicationResult(request.Code, request.Name, request.UnitCode, request.StorageScope);
            if (duplicate.DuplicateFound && duplicate.MasterRecord is not null)
            {
                throw new BusinessRuleException($"Loai ho so da ton tai trong kho chung: {duplicate.MasterRecord.Code}. Hay cap quyen chia se vao ban ghi master.");
            }

            var unitCode = NormalizeUnitCode(request.UnitCode);
            var sharedUnits = NormalizeSharedUnits(request.SharedUnitCodes, unitCode);
            var record = new Gd2SharedDossierTypeDto(
                ++_sharedDossierTypeSequence,
                NormalizeCode(request.Code),
                request.Name.Trim(),
                unitCode,
                NormalizeStorageScope(request.StorageScope),
                "MASTER",
                sharedUnits,
                DateTime.UtcNow);
            _sharedDossierTypes.Insert(0, record);
            AddAuditLog("CREATE_SHARED_DOSSIER_TYPE", "DOSSIER_TYPE", record.Id, NormalizeUser(request.Actor), unitCode, null, "QTHT", $"Tao master {record.Code}", "SUCCESS");
            return Task.FromResult(record);
        }
    }

    public Task<Gd2ShareAccessResult> ShareDossierTypeAccessAsync(Gd2ShareAccessRequest request)
    {
        ValidateShareAccessRequest(request);
        lock (_gate)
        {
            var index = _sharedDossierTypes.FindIndex(item => item.Id == request.MasterRecordId);
            if (index < 0)
            {
                throw new BusinessRuleException("Khong tim thay ban ghi master de cap quyen chia se.");
            }

            var master = _sharedDossierTypes[index];
            var existing = new HashSet<string>(master.SharedUnitCodes.Append(master.MasterUnitCode), StringComparer.OrdinalIgnoreCase);
            var added = request.UnitCodes
                .Select(NormalizeUnitCode)
                .Where(unit => existing.Add(unit))
                .ToList();
            var updated = master with
            {
                SharedUnitCodes = existing.Where(unit => unit != master.MasterUnitCode).OrderBy(unit => unit).ToList(),
                UpdatedAt = DateTime.UtcNow
            };
            _sharedDossierTypes[index] = updated;
            foreach (var unit in added)
            {
                _accessScopes.Add(new Gd2AccessScopeDto(++_accessScopeSequence, "DEPARTMENT", unit, master.MasterUnitCode, unit, "CHUYEN_VIEN", $"DOSSIER_TYPE:{master.Code}", "VIEW,CREATE,EDIT,DOWNLOAD", "UNIT", "ACTIVE", DateTime.UtcNow));
            }
            AddAuditLog("SHARE_DOSSIER_TYPE", "DOSSIER_TYPE", master.Id, NormalizeUser(request.Actor), master.MasterUnitCode, null, "QTHT", request.Reason ?? $"Share {master.Code}: {string.Join(",", added)}", "SUCCESS");
            return Task.FromResult(new Gd2ShareAccessResult(updated, added, $"Da cap quyen chia se cho {added.Count} don vi.", DateTime.UtcNow));
        }
    }

    public Task<Gd2DossierBorrowDashboardDto> GetDossierBorrowDashboardAsync(string? status, string? securityLevel, string? exploitMode)
    {
        lock (_gate)
        {
            var dossiers = _archiveDossiers.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(securityLevel))
            {
                dossiers = dossiers.Where(item => item.SecurityLevel == NormalizeSecurityLevel(securityLevel));
            }

            var requests = _borrowFlows.Select(RefreshBorrowOverdue).AsEnumerable();
            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = NormalizeBorrowFlowStatus(status);
                requests = requests.Where(item => NormalizeBorrowFlowStatus(item.Status) == normalizedStatus);
            }
            if (!string.IsNullOrWhiteSpace(exploitMode))
            {
                var normalizedMode = NormalizeExploitMode(exploitMode);
                requests = requests.Where(item => item.ExploitMode == normalizedMode);
            }

            var requestList = requests.OrderByDescending(item => item.RequestedAt).ToList();
            return Task.FromResult(new Gd2DossierBorrowDashboardDto(
                dossiers.OrderBy(item => item.Code).ToList(),
                requestList,
                requestList.Count(item => item.Status == "PENDING"),
                requestList.Count(item => item.Status is "APPROVED" or "BORROWED" or "HANDED_OVER"),
                requestList.Count(item => item.Overdue),
                requestList.Count(item => item.Status is "RETURNED" or "RECALLED"),
                DateTime.UtcNow));
        }
    }

    public Task<Gd2ArchiveDossierDto> SaveArchiveDossierAsync(Gd2ArchiveDossierRequest request)
    {
        ValidateArchiveDossierRequest(request);
        lock (_gate)
        {
            var code = NormalizeCode(request.Code);
            var index = _archiveDossiers.FindIndex(item => item.Code == code);
            var dossier = new Gd2ArchiveDossierDto(
                index >= 0 ? _archiveDossiers[index].Id : ++_archiveDossierSequence,
                code,
                request.Title.Trim(),
                request.DossierType.Trim(),
                request.StorageLocation.Trim(),
                NormalizeSecurityLevel(request.SecurityLevel),
                request.BorrowCondition.Trim(),
                request.AllowOnlineRead,
                request.AllowSoftCopy,
                request.AllowHardCopy,
                Math.Clamp(request.MaxHardCopyBorrowDays, 1, 30),
                "ACTIVE",
                DateTime.UtcNow);

            if (index >= 0) _archiveDossiers[index] = dossier;
            else _archiveDossiers.Insert(0, dossier);
            AddAuditLog("SAVE_ARCHIVE_DOSSIER", "ARCHIVE_DOSSIER", dossier.Id, NormalizeUser(request.Actor), "DEFAULT", null, "QTHT", $"Cap nhat dieu kien muon/doc {dossier.Code}", "SUCCESS");
            return Task.FromResult(dossier);
        }
    }

    public Task<Gd2BorrowFlowDto> RegisterBorrowAsync(Gd2BorrowRegistrationRequest request)
    {
        ValidateBorrowRegistrationRequest(request);
        lock (_gate)
        {
            var dossier = _archiveDossiers.FirstOrDefault(item => item.Id == request.DossierId)
                ?? throw new BusinessRuleException("Khong tim thay ho so luu tru can khai thac.");
            var mode = NormalizeExploitMode(request.ExploitMode);
            EnsureBorrowModeAllowed(dossier, mode);
            var maxDays = mode == "HARD_COPY" ? dossier.MaxHardCopyBorrowDays : Math.Min(request.RequestedDays ?? 1, 3);
            var requestedDays = Math.Clamp(request.RequestedDays ?? maxDays, 1, maxDays);
            var dueDate = request.BorrowFrom.Date.AddDays(requestedDays);
            var accessLink = mode == "ONLINE_READ" ? $"https://idp.dms.local/view/{dossier.Code}" : null;
            var borrow = new Gd2BorrowFlowDto(
                ++_borrowFlowSequence,
                dossier.Id,
                dossier.Code,
                dossier.Title,
                NormalizeUser(request.Borrower),
                mode,
                "PENDING",
                DateTime.UtcNow,
                request.BorrowFrom.Date,
                dueDate,
                null,
                null,
                null,
                null,
                accessLink,
                request.Purpose.Trim(),
                false);
            _borrowFlows.Insert(0, borrow);
            _borrowStatuses[borrow.Id] = "PENDING";
            AddWorkflowEvent("BORROW", borrow.Id, "REQUEST", null, "PENDING", borrow.Note, request.Actor, "DEFAULT");
            AddAuditLog("REGISTER_BORROW", "BORROW", borrow.Id, NormalizeUser(request.Actor), "DEFAULT", null, "CHUYEN_VIEN", $"{dossier.Code}:{mode}", "SUCCESS");
            return Task.FromResult(borrow);
        }
    }

    public Task<Gd2BorrowFlowDto> ApproveBorrowAsync(long id, Gd2BorrowActionRequest request)
    {
        return UpdateBorrowFlowAsync(id, request, "APPROVE", "APPROVED", current => current with
        {
            Status = "APPROVED",
            ApprovedAt = DateTime.UtcNow,
            Approver = NormalizeUser(request.Actor),
            AccessLink = current.ExploitMode == "ONLINE_READ" ? $"https://idp.dms.local/view/{current.DossierCode}?ticket={current.Id}" : current.AccessLink
        });
    }

    public Task<Gd2BorrowFlowDto> HandoverBorrowAsync(long id, Gd2BorrowActionRequest request)
    {
        return UpdateBorrowFlowAsync(id, request, "HANDOVER", "HANDED_OVER", current => current with
        {
            Status = current.ExploitMode == "HARD_COPY" ? "BORROWED" : "HANDED_OVER",
            HandoverAt = DateTime.UtcNow,
            AccessLink = current.ExploitMode == "SOFT_COPY" ? $"https://idp.dms.local/download/{current.DossierCode}?ticket={current.Id}" : current.AccessLink
        });
    }

    public Task<Gd2BorrowFlowDto> ReturnBorrowAsync(long id, Gd2BorrowActionRequest request)
    {
        return UpdateBorrowFlowAsync(id, request, "RETURN", "RETURNED", current => current with
        {
            Status = "RETURNED",
            ReturnedAt = DateTime.UtcNow,
            Overdue = false
        });
    }

    public Task<Gd2BorrowFlowDto> RecallBorrowAsync(long id, Gd2BorrowActionRequest request)
    {
        return UpdateBorrowFlowAsync(id, request, "RECALL", "RECALLED", current => current with
        {
            Status = "RECALLED",
            ReturnedAt = DateTime.UtcNow,
            Overdue = false
        });
    }

    public Task<SystemDataSummaryDto> GetSystemDataSummaryAsync()
    {
        lock (_gate)
        {
            var sources = new List<SystemDataSourceDto>
            {
                new("DOSSIERS", "Hồ sơ nghiệp vụ", SystemDossierBase + _dossiers.Count, "READY"),
                new("DOCUMENTS", "Tài liệu số hóa", SystemDocumentBase + _documents.Count, "READY"),
                new("APPROVED", "Hồ sơ đã duyệt", SystemApprovedBase + CountDossiersByStatus("APPROVED"), "READY"),
                new("BORROW", "Phiếu mượn", SystemBorrowBase + _borrowStatuses.Count, "READY"),
                new("NOTIFICATIONS", "Thông báo hệ thống", SystemNotificationBase + _notifications.Count, "READY"),
                new("WORKFLOW", "Lịch sử xử lý", SystemWorkflowBase + _workflowEvents.Count, "READY")
            };

            return Task.FromResult(new SystemDataSummaryDto(sources, sources.Sum(item => item.RecordCount), DateTime.UtcNow));
        }
    }

    public Task<Gd2BusinessOverviewDto> GetBusinessOverviewAsync()
    {
        lock (_gate)
        {
            var sources = BuildSystemDataSources();
            return Task.FromResult(new Gd2BusinessOverviewDto(
                _dossiers.Values.OrderBy(item => item.Id).ToList(),
                _documents.Values.OrderBy(item => item.Id).Select(ToDocumentDto).ToList(),
                _notifications.OrderByDescending(item => item.CreatedAt).Take(20).ToList(),
                _auditLogs.OrderByDescending(item => item.CreatedAt).Take(50).ToList(),
                _accessScopes.OrderBy(item => item.PrincipalCode).ThenBy(item => item.ResourceCode).ToList(),
                _securityPolicies.ToList(),
                new SystemDataSummaryDto(sources, sources.Sum(item => item.RecordCount), DateTime.UtcNow),
                DateTime.UtcNow));
        }
    }

    public Task<IReadOnlyList<Gd2AuditLogDto>> GetAuditLogsAsync(string? action, string? actor, string? entityType)
    {
        lock (_gate)
        {
            var query = _auditLogs.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(action))
            {
                query = query.Where(item => string.Equals(item.Action, action.Trim(), StringComparison.OrdinalIgnoreCase));
            }
            if (!string.IsNullOrWhiteSpace(actor))
            {
                query = query.Where(item => item.Actor.Contains(actor.Trim(), StringComparison.OrdinalIgnoreCase));
            }
            if (!string.IsNullOrWhiteSpace(entityType))
            {
                query = query.Where(item => string.Equals(item.EntityType, entityType.Trim(), StringComparison.OrdinalIgnoreCase));
            }

            return Task.FromResult<IReadOnlyList<Gd2AuditLogDto>>(query.OrderByDescending(item => item.CreatedAt).ToList());
        }
    }

    public Task<Gd2AuditLogDto> LogAuditAsync(Gd2AuditLogRequest request)
    {
        ValidateAuditRequest(request);
        lock (_gate)
        {
            var log = AddAuditLog(
                request.Action,
                request.EntityType,
                request.EntityId,
                request.Actor,
                request.UnitCode,
                request.DepartmentCode,
                request.RoleLevel,
                request.Detail,
                "SUCCESS");
            return Task.FromResult(log);
        }
    }

    public Task<IReadOnlyList<Gd2AccessScopeDto>> GetAccessScopesAsync(string? unitCode, string? roleLevel)
    {
        lock (_gate)
        {
            var query = _accessScopes.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(unitCode))
            {
                query = query.Where(item => string.Equals(item.UnitCode, unitCode.Trim(), StringComparison.OrdinalIgnoreCase));
            }
            if (!string.IsNullOrWhiteSpace(roleLevel))
            {
                query = query.Where(item => string.Equals(item.RoleLevel, roleLevel.Trim(), StringComparison.OrdinalIgnoreCase));
            }

            return Task.FromResult<IReadOnlyList<Gd2AccessScopeDto>>(query.OrderBy(item => item.Id).ToList());
        }
    }

    public Task<Gd2AccessScopeDto> SaveAccessScopeAsync(Gd2AccessScopeRequest request)
    {
        ValidateAccessScopeRequest(request);
        lock (_gate)
        {
            var principalType = NormalizePrincipalType(request.PrincipalType);
            var principalCode = request.PrincipalCode.Trim();
            var resourceCode = request.ResourceCode.Trim().ToUpperInvariant();
            var targetRoleLevel = NormalizeRoleLevel(request.RoleLevel);
            var actorRoleLevel = string.IsNullOrWhiteSpace(request.ActorRoleLevel) ? "QTHT" : NormalizeRoleLevel(request.ActorRoleLevel);
            if (RoleRank(targetRoleLevel) > RoleRank(actorRoleLevel))
            {
                throw new BusinessRuleException("Không được gán quyền cao hơn cấp của người đang thực hiện phân quyền.");
            }
            var existingIndex = _accessScopes.FindIndex(item =>
                string.Equals(item.PrincipalType, principalType, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(item.PrincipalCode, principalCode, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(item.ResourceCode, resourceCode, StringComparison.OrdinalIgnoreCase));

            var scope = new Gd2AccessScopeDto(
                existingIndex >= 0 ? _accessScopes[existingIndex].Id : ++_accessScopeSequence,
                principalType,
                principalCode,
                request.UnitCode.Trim().ToUpperInvariant(),
                string.IsNullOrWhiteSpace(request.DepartmentCode) ? "*" : request.DepartmentCode.Trim().ToUpperInvariant(),
                targetRoleLevel,
                resourceCode,
                NormalizeActions(request.Actions),
                NormalizeDataScope(request.DataScope),
                string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status.Trim().ToUpperInvariant(),
                DateTime.UtcNow);

            if (existingIndex >= 0) _accessScopes[existingIndex] = scope;
            else _accessScopes.Insert(0, scope);

            AddAuditLog("PERMISSION_SAVE", "ACCESS_SCOPE", scope.Id, principalCode, scope.UnitCode, scope.DepartmentCode, scope.RoleLevel, $"Cập nhật phạm vi quyền {scope.ResourceCode}", "SUCCESS");
            return Task.FromResult(scope);
        }
    }

    public Task<IReadOnlyList<Gd2SecurityPolicyDto>> GetSecurityPoliciesAsync(string? category)
    {
        lock (_gate)
        {
            var query = _securityPolicies.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(item => string.Equals(item.Category, category.Trim(), StringComparison.OrdinalIgnoreCase));
            }

            return Task.FromResult<IReadOnlyList<Gd2SecurityPolicyDto>>(query.ToList());
        }
    }

    public Task<IReadOnlyList<Gd2SecurityLabelDto>> GetSecurityLabelsAsync(string? entityType)
    {
        lock (_gate)
        {
            var query = _securityLabels.Values.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(entityType))
            {
                var normalizedType = NormalizeSecurityEntityType(entityType);
                query = query.Where(item => string.Equals(item.EntityType, normalizedType, StringComparison.OrdinalIgnoreCase));
            }

            return Task.FromResult<IReadOnlyList<Gd2SecurityLabelDto>>(query
                .OrderBy(item => item.EntityType)
                .ThenBy(item => item.EntityId)
                .ToList());
        }
    }

    public Task<Gd2SecurityLabelDto> AssignSecurityLabelAsync(Gd2SecurityLabelRequest request)
    {
        ValidateSecurityLabelRequest(request);
        lock (_gate)
        {
            var entityType = NormalizeSecurityEntityType(request.EntityType);
            if (entityType == "DOCUMENT") EnsureDocument(request.EntityId);
            else EnsureDossier(request.EntityId);

            var label = BuildSecurityLabel(
                entityType,
                request.EntityId,
                request.SecurityLevel,
                NormalizeUser(request.Actor));
            _securityLabels[SecurityKey(entityType, request.EntityId)] = label;
            AddAuditLog("SECURITY_LABEL", entityType, request.EntityId, request.Actor, request.UnitCode, null, "QTHT", request.Reason ?? $"Gán nhãn {label.Label}", "SUCCESS");
            return Task.FromResult(label);
        }
    }

    public Task<Gd2SecurityLabelDto> GetSecurityLabelAsync(string entityType, long entityId)
    {
        lock (_gate)
        {
            var normalizedType = NormalizeSecurityEntityType(entityType);
            if (normalizedType == "DOCUMENT") EnsureDocument(entityId);
            else EnsureDossier(entityId);
            return Task.FromResult(GetOrCreateSecurityLabel(normalizedType, entityId));
        }
    }

    public Task<Gd2WatermarkDto> CreateWatermarkAsync(string entityType, long entityId, string viewer, string? ipAddress, string? action)
    {
        lock (_gate)
        {
            var normalizedType = NormalizeSecurityEntityType(entityType);
            if (normalizedType == "DOCUMENT") EnsureDocument(entityId);
            else EnsureDossier(entityId);
            var label = GetOrCreateSecurityLabel(normalizedType, entityId);
            var ip = string.IsNullOrWhiteSpace(ipAddress) ? "unknown-ip" : ipAddress.Trim();
            var viewedAt = DateTime.UtcNow;
            var text = $"{NormalizeUser(viewer)} | {ip} | {viewedAt:yyyy-MM-dd HH:mm:ss} UTC | {label.Label}";
            AddAuditLog(action ?? "ACCESS", normalizedType, entityId, viewer, "DEFAULT", null, "CHUYEN_VIEN", label.Sensitive ? $"Watermark: {text}" : "Truy cập dữ liệu không nhạy cảm", "SUCCESS");
            return Task.FromResult(new Gd2WatermarkDto(text, NormalizeUser(viewer), ip, viewedAt, label.SecurityLevel, label.Sensitive));
        }
    }

    public Task<Gd2AuditDashboardDto> GetAuditDashboardAsync()
    {
        lock (_gate)
        {
            var logs = _auditLogs.OrderByDescending(item => item.CreatedAt).ToList();
            var since = DateTime.UtcNow.AddHours(-1);
            var downloadsLastHour = logs.Count(item =>
                item.CreatedAt >= since &&
                (item.Action.Contains("DOWNLOAD", StringComparison.OrdinalIgnoreCase) ||
                 item.Action.Contains("EXPORT", StringComparison.OrdinalIgnoreCase)));
            var alerts = new List<Gd2AuditAlertDto>();
            if (downloadsLastHour >= 5)
            {
                alerts.Add(new Gd2AuditAlertDto(
                    "BULK-DOWNLOAD",
                    "HIGH",
                    "Tải/xuất nhiều hồ sơ trong thời gian ngắn",
                    $"{downloadsLastHour} thao tác tải/xuất trong 60 phút gần nhất.",
                    DateTime.UtcNow));
            }

            var sensitiveViews = logs.Count(item =>
                (item.Action.Contains("VIEW", StringComparison.OrdinalIgnoreCase) ||
                 item.Action.Contains("ACCESS", StringComparison.OrdinalIgnoreCase)) &&
                (item.Detail?.Contains("Watermark", StringComparison.OrdinalIgnoreCase) == true ||
                 IsSensitive(item.EntityType, item.EntityId)));

            return Task.FromResult(new Gd2AuditDashboardDto(
                logs.Count(item => item.Action.Contains("VIEW", StringComparison.OrdinalIgnoreCase) || item.Action.Contains("ACCESS", StringComparison.OrdinalIgnoreCase)),
                logs.Count(item => item.Action.Contains("EXPORT", StringComparison.OrdinalIgnoreCase)),
                logs.Count(item => item.Action.Contains("LOGIN_FAILURE", StringComparison.OrdinalIgnoreCase)),
                sensitiveViews,
                alerts.Count(item => item.Code == "BULK-DOWNLOAD"),
                logs.Take(30).ToList(),
                alerts,
                DateTime.UtcNow));
        }
    }

    public bool IsSensitive(string entityType, long entityId)
    {
        lock (_gate)
        {
            return GetOrCreateSecurityLabel(NormalizeSecurityEntityType(entityType), entityId).Sensitive;
        }
    }

    private WorkflowTransitionResult TransitionDossier(long id, string action, string actor, string? unitCode, string? comment, string? recipient)
    {
        var dossier = EnsureDossier(id);
        var previousStatus = NormalizeStatus(dossier.Status);
        var nextStatus = ResolveDossierStatus(previousStatus, action);
        var desc = dossier.Description;
        if (!string.IsNullOrWhiteSpace(comment) && action is "REQUEST_SUPPLEMENT" or "REJECT")
        {
            var prefix = action == "REQUEST_SUPPLEMENT" ? "[Yêu cầu bổ sung]: " : "[Từ chối]: ";
            desc = $"{prefix}{comment.Trim()}";
        }
        var updated = dossier with { Status = nextStatus, Description = desc };
        _dossiers[id] = updated;

        AddWorkflowEvent("DOSSIER", id, action, previousStatus, nextStatus, comment, actor, unitCode);
        if (nextStatus is "APPROVED" or "REJECTED" or "NEEDS_SUPPLEMENT")
        {
            AddResultNotifications("DOSSIER", id, recipient ?? updated.Code, DossierResultTitle(updated.Code, nextStatus), comment, nextStatus);
        }
        else
        {
            AddNotification("DOSSIER", id, recipient ?? updated.Code, $"Hồ sơ {updated.Code} đã chuyển sang {nextStatus}", comment, "SENT");
        }

        return new WorkflowTransitionResult("DOSSIER", id, previousStatus, nextStatus, action, DateTime.UtcNow);
    }

    private WorkflowTransitionResult TransitionDocument(long id, string action, string actor, string? unitCode, string? comment, string? recipient)
    {
        var document = EnsureDocument(id);
        var previousStatus = NormalizeStatus(document.Status);
        var nextStatus = ResolveDossierStatus(previousStatus, action);
        document.Status = nextStatus;

        AddWorkflowEvent("DOCUMENT", id, action, previousStatus, nextStatus, comment, actor, unitCode);
        AddNotification("DOCUMENT", id, recipient ?? document.Code, $"Tài liệu {document.Code} đã chuyển sang {nextStatus}", comment, "SENT");

        return new WorkflowTransitionResult("DOCUMENT", id, previousStatus, nextStatus, action, DateTime.UtcNow);
    }

    private WorkflowTransitionResult TransitionBorrow(long id, string action, string actor, string? unitCode, string? comment, string? recipient)
    {
        if (!_borrowStatuses.TryGetValue(id, out var currentStatus))
        {
            _borrowStatuses[id] = "PENDING";
            currentStatus = "PENDING";
        }

        var nextStatus = ResolveBorrowStatus(currentStatus, action);
        _borrowStatuses[id] = nextStatus;

        AddWorkflowEvent("BORROW", id, action, currentStatus, nextStatus, comment, actor, unitCode);
        AddNotification("BORROW", id, recipient ?? $"PHIEU-{id:000}", $"Phiếu mượn {id} đã chuyển sang {nextStatus}", comment, "SENT");

        return new WorkflowTransitionResult("BORROW", id, currentStatus, nextStatus, action, DateTime.UtcNow);
    }

    private DossierDto EnsureDossier(long id)
    {
        if (_dossiers.TryGetValue(id, out var dossier))
        {
            return dossier;
        }

        var created = new DossierDto(
            id,
            $"HS-{id:000}",
            $"Hồ sơ số {id}",
            "Hành chính",
            null,
            "PENDING",
            DateTime.UtcNow.Date.AddDays(-30),
            DateTime.UtcNow.Date.AddDays(30),
            "Hồ sơ phát sinh từ bộ nhớ nghiệp vụ.");
        _dossiers[id] = created;
        return created;
    }

    private DocumentState EnsureDocument(long id)
    {
        if (_documents.TryGetValue(id, out var document))
        {
            return document;
        }

        var created = new DocumentState(
            id,
            1,
            $"DOC-{id:000}",
            $"Tài liệu số {id}",
            $"file-{id:000}.pdf",
            "PENDING",
            "DRAFT",
            "Tài liệu khởi tạo từ bộ nhớ nghiệp vụ.");
        created.Versions.Add(CreateVersionSnapshot(created, "system", "Khởi tạo phiên bản", "Phiên bản khởi tạo"));
        created.NextVersionNumber = 2;
        _documents[id] = created;
        return created;
    }

    private Gd2OcrResultDto ProcessOcrDocument(long documentId, Gd2OcrProcessRequest request)
    {
        var document = EnsureDocument(documentId);
        var engine = NormalizeOcrEngine(request.Engine);
        var actor = NormalizeUser(request.Actor);
        var previousStatus = NormalizeStatus(document.OcrStatus);
        var extractedText = !string.IsNullOrWhiteSpace(request.ExtractedText)
            ? request.ExtractedText.Trim()
            : !string.IsNullOrWhiteSpace(document.Description)
                ? document.Description.Trim()
                : BuildOcrText(document, engine);
        var confidence = CalculateOcrConfidence(document, engine);

        document.Versions.Add(CreateVersionSnapshot(document, actor, "Lưu trước khi xử lý OCR", "Lưu trạng thái trước OCR"));
        document.NextVersionNumber++;
        if (!string.IsNullOrWhiteSpace(request.FileName))
        {
            document.FileName = request.FileName.Trim();
        }
        document.OcrStatus = "DONE";
        document.Description = TrimText(extractedText, 1000);

        var note = string.IsNullOrWhiteSpace(request.Note)
            ? $"OCR bằng engine {engine}, độ tin cậy {confidence}%."
            : $"{request.Note.Trim()} | OCR bằng engine {engine}, độ tin cậy {confidence}%.";

        AddWorkflowEvent("DOCUMENT", documentId, "OCR_PROCESS", previousStatus, document.OcrStatus, note, actor, request.UnitCode);
        AddNotification(
            "DOCUMENT",
            documentId,
            document.Code,
            $"Tài liệu {document.Code} đã OCR xong",
            note,
            "SENT");

        return new Gd2OcrResultDto(
            document.Id,
            document.Code,
            document.Title,
            engine,
            previousStatus,
            document.OcrStatus,
            confidence,
            extractedText,
            DateTime.UtcNow);
    }

    private static string NormalizeOcrEngine(string? engine)
    {
        var normalized = Normalize(engine);
        return normalized switch
        {
            "" => "GEMINI",
            "GEMINI" or "EASYOCR" or "VIETOCR" or "CRNN" => normalized,
            _ => throw new BusinessRuleException($"Engine OCR '{engine}' không được hỗ trợ.")
        };
    }

    private static decimal CalculateOcrConfidence(DocumentState document, string engine)
    {
        var baseScore = engine switch
        {
            "GEMINI" => 96m,
            "VIETOCR" => 93m,
            "EASYOCR" => 90m,
            "CRNN" => 86m,
            _ => 88m
        };

        if (string.IsNullOrWhiteSpace(document.FileName)) baseScore -= 4m;
        if (document.FileName?.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) == true) baseScore += 1m;
        return Math.Clamp(baseScore, 70m, 99m);
    }

    private static string BuildOcrText(DocumentState document, string engine)
    {
        var source = string.IsNullOrWhiteSpace(document.FileName) ? "chưa gắn tệp" : document.FileName;
        return $"""
        Mã tài liệu: {document.Code}
        Tên tài liệu: {document.Title}
        Nguồn OCR: {source}
        Engine: {engine}
        Nội dung trích xuất đã được chuẩn hóa để phục vụ tìm kiếm full-text, kiểm tra metadata và gửi kiểm duyệt.
        """.Trim();
    }

    private static Gd2OcrExtractionDto BuildOcrExtraction(DocumentState document, string engine, string rawText, decimal confidence, bool confirmed)
    {
        var documentType = DetectOcrDocumentType(document, rawText);
        var fields = BuildOcrFields(document, documentType, rawText, Math.Clamp(confidence, 60m, 99m), confirmed);
        return new Gd2OcrExtractionDto(
            document.Id,
            document.Code,
            document.Title,
            document.FileName ?? $"{document.Code}.pdf",
            documentType,
            Math.Round(fields.Average(item => item.Confidence), 2),
            fields,
            rawText,
            confirmed ? "CONFIRMED" : "EXTRACTED",
            DateTime.UtcNow);
    }

    private static string DetectOcrDocumentType(DocumentState document, string? rawText = null)
    {
        var source = Normalize($"{document.Title} {document.FileName} {document.Description} {rawText}");
        if (source.Contains("HOA_DON") || source.Contains("HÓA ĐƠN") || source.Contains("HOÁ ĐƠN") || source.Contains("INVOICE")) return "INVOICE";
        if (source.Contains("HOP_DONG") || source.Contains("HỢP ĐỒNG") || source.Contains("CONTRACT")) return "CONTRACT";
        if (source.Contains("QUYET_DINH") || source.Contains("QUYẾT ĐỊNH") || source.Contains("SO_QD") || source.Contains("SỐ QĐ") || source.Contains("QD-")) return "DECISION";
        if (source.Contains("BAO_CAO") || source.Contains("BÁO CÁO") || source.Contains("SO_BC") || source.Contains("SỐ BC") || source.Contains("REPORT")) return "REPORT";
        return (document.Id % 4) switch
        {
            0 => "REPORT",
            1 => "DECISION",
            2 => "CONTRACT",
            _ => "INVOICE"
        };
    }

    private static IReadOnlyList<Gd2OcrFieldDto> BuildOcrFields(DocumentState document, string documentType, string rawText, decimal baseConfidence, bool confirmed)
    {
        var lowConfidence = Math.Max(62m, baseConfidence - 18m);
        return documentType switch
        {
            "INVOICE" => [
                OcrField("invoiceNo", "Số hóa đơn", ExtractOcrValue(rawText, ["Số hóa đơn", "Số HD", "Hóa đơn số"], $"HD-{document.Id:0000}"), baseConfidence, 1, 13, 16, 28, 6, confirmed),
                OcrField("seller", "Đơn vị bán", ExtractOcrValue(rawText, ["Đơn vị bán", "Người bán", "Bên bán", "Công ty"], "Công ty IDP Technology"), baseConfidence - 3, 1, 12, 27, 48, 6, confirmed),
                OcrField("taxCode", "Mã số thuế", ExtractOcrValue(rawText, ["Mã số thuế", "MST", "Tax code"], "0109998888"), lowConfidence, 1, 14, 38, 34, 6, confirmed),
                OcrField("totalAmount", "Tổng tiền", ExtractOcrValue(rawText, ["Tổng tiền", "Thành tiền", "Số tiền", "Cộng tiền"], $"{(document.Id * 1250000):N0} VND"), baseConfidence - 1, 1, 56, 69, 30, 7, confirmed)
            ],
            "CONTRACT" => [
                OcrField("contractNo", "Số hợp đồng", ExtractOcrValue(rawText, ["Số hợp đồng", "Hợp đồng số", "Số HĐ"], $"HDONG-{document.Id:000}/2026"), baseConfidence, 1, 15, 15, 34, 6, confirmed),
                OcrField("partyA", "Bên A", ExtractOcrValue(rawText, ["Bên A", "Đại diện bên A"], "IDP.DMS"), baseConfidence - 2, 1, 12, 27, 42, 6, confirmed),
                OcrField("partyB", "Bên B", ExtractOcrValue(rawText, ["Bên B", "Đại diện bên B"], "Đơn vị khai thác hồ sơ"), lowConfidence, 1, 12, 37, 46, 6, confirmed),
                OcrField("effectiveDate", "Ngày hiệu lực", ExtractOcrValue(rawText, ["Ngày hiệu lực", "Hiệu lực từ", "Ngày ký"], DateTime.UtcNow.Date.ToString("yyyy-MM-dd")), baseConfidence - 4, 1, 58, 74, 26, 6, confirmed)
            ],
            "DECISION" => [
                OcrField("decisionNo", "Số quyết định", ExtractOcrValue(rawText, ["Số quyết định", "Quyết định số", "Số QĐ"], $"QD-{document.Id:000}/IDP"), baseConfidence, 1, 16, 13, 32, 6, confirmed),
                OcrField("issuer", "Cơ quan ban hành", ExtractOcrValue(rawText, ["Cơ quan ban hành", "Đơn vị ban hành", "Nơi ban hành"], "IDP Technology"), baseConfidence - 2, 1, 14, 25, 48, 6, confirmed),
                OcrField("subject", "Trích yếu", ExtractOcrValue(rawText, ["Trích yếu", "Về việc", "Nội dung"], document.Title), lowConfidence, 1, 12, 40, 64, 10, confirmed),
                OcrField("signedDate", "Ngày ký", ExtractOcrValue(rawText, ["Ngày ký", "Ký ngày", "Ban hành ngày"], DateTime.UtcNow.Date.AddDays(-document.Id).ToString("yyyy-MM-dd")), baseConfidence - 3, 1, 58, 75, 25, 6, confirmed)
            ],
            _ => [
                OcrField("reportNo", "Số báo cáo", ExtractOcrValue(rawText, ["Số báo cáo", "Báo cáo số", "Số BC"], $"BC-{document.Id:000}/2026"), baseConfidence, 1, 15, 15, 32, 6, confirmed),
                OcrField("period", "Kỳ báo cáo", ExtractOcrValue(rawText, ["Kỳ báo cáo", "Tháng", "Quý", "Năm"], $"Tháng {DateTime.UtcNow.Month}/2026", keepLineWhenNoSeparator: true), baseConfidence - 5, 1, 14, 28, 30, 6, confirmed),
                OcrField("indicator", "Chỉ tiêu chính", ExtractOcrValue(rawText, ["Chỉ tiêu chính", "Chỉ tiêu", "Nội dung", "Kết quả"], "Tỷ lệ số hóa hồ sơ"), lowConfidence, 1, 12, 42, 42, 7, confirmed),
                OcrField("approvedBy", "Người phê duyệt", ExtractOcrValue(rawText, ["Người phê duyệt", "Phê duyệt", "Người ký", "Ký bởi"], "Lãnh đạo đơn vị"), baseConfidence - 2, 1, 54, 76, 32, 6, confirmed)
            ]
        };
    }

    private static string ExtractOcrValue(string rawText, IReadOnlyList<string> labels, string fallback, bool keepLineWhenNoSeparator = false)
    {
        if (string.IsNullOrWhiteSpace(rawText)) return fallback;

        var lines = rawText
            .Replace("\r\n", "\n")
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        foreach (var line in lines)
        {
            foreach (var label in labels)
            {
                var match = System.Text.RegularExpressions.Regex.Match(
                    line,
                    $@"\b{System.Text.RegularExpressions.Regex.Escape(label)}\b\s*(?<sep>[:：\-–—]\s*)?(?<value>.+)$",
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.CultureInvariant);
                if (match.Success)
                {
                    var hasSeparator = match.Groups["sep"].Success && !string.IsNullOrWhiteSpace(match.Groups["sep"].Value);
                    var value = CleanOcrValue(keepLineWhenNoSeparator && !hasSeparator ? line : match.Groups["value"].Value);
                    if (!string.IsNullOrWhiteSpace(value) && !LooksLikeOnlyLabel(value, labels))
                    {
                        return value;
                    }
                }
            }
        }

        foreach (var label in labels)
        {
            var match = System.Text.RegularExpressions.Regex.Match(
                rawText,
                $@"{System.Text.RegularExpressions.Regex.Escape(label)}\s*(?:[:：\-–—]\s*)?(?<value>[^\r\n]+)",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.CultureInvariant);
            if (match.Success)
            {
                var value = CleanOcrValue(match.Groups["value"].Value);
                if (!string.IsNullOrWhiteSpace(value) && !LooksLikeOnlyLabel(value, labels))
                {
                    return value;
                }
            }
        }

        return fallback;
    }

    private static string CleanOcrValue(string value) =>
        value.Trim().Trim(' ', '.', ',', ';', ':', '-', '–', '—');

    private static bool LooksLikeOnlyLabel(string value, IReadOnlyList<string> labels) =>
        labels.Any(label => string.Equals(value.Trim(), label, StringComparison.OrdinalIgnoreCase));

    private static Gd2OcrFieldDto OcrField(string key, string label, string value, decimal confidence, int page, decimal x, decimal y, decimal width, decimal height, bool confirmed) =>
        new(key, label, value, Math.Clamp(Math.Round(confidence, 2), 50m, 99m), new Gd2OcrBoundingBoxDto(page, x, y, width, height), confirmed);

    private static DocumentDto ToDocumentDto(DocumentState document) =>
        new(
            document.Id,
            document.DossierId,
            document.Code,
            document.Title,
            document.FileName,
            document.OcrStatus,
            document.Status,
            document.Description);

    private static bool DocumentChanged(DocumentState current, DocumentDto next) =>
        current.DossierId != next.DossierId ||
        !string.Equals(current.Code, next.Code, StringComparison.Ordinal) ||
        !string.Equals(current.Title, next.Title, StringComparison.Ordinal) ||
        !string.Equals(current.FileName, next.FileName, StringComparison.Ordinal) ||
        !string.Equals(NormalizeStatus(current.OcrStatus), NormalizeStatus(next.OcrStatus), StringComparison.OrdinalIgnoreCase) ||
        !string.Equals(NormalizeStatus(current.Status), NormalizeStatus(next.Status), StringComparison.OrdinalIgnoreCase) ||
        !string.Equals(current.Description, next.Description, StringComparison.Ordinal);

    private static string InferDocumentType(DocumentState document)
    {
        var extension = Path.GetExtension(document.FileName ?? string.Empty).TrimStart('.').ToUpperInvariant();
        return extension switch
        {
            "PDF" => "PDF",
            "DOCX" => "DOCX",
            "TIF" or "TIFF" => "TIFF",
            "PNG" or "JPG" or "JPEG" => "IMAGE",
            _ => "METADATA"
        };
    }

    private static DateTime LatestDocumentDate(DocumentState document) =>
        document.Versions.Count == 0 ? DateTime.UtcNow : document.Versions.Max(item => item.CreatedAt);

    private static string NormalizeExportFormat(string? format)
    {
        var normalized = Normalize(format);
        return normalized switch
        {
            "" => "EXCEL",
            "PDF" or "ZIP" or "EXCEL" or "XLSX" => normalized,
            _ => throw new BusinessRuleException("Định dạng xuất chỉ hỗ trợ PDF, ZIP hoặc Excel metadata.")
        };
    }

    private static string ExportExtension(string format) =>
        format is "PDF" ? "pdf" : format is "ZIP" ? "zip" : "xlsx";

    private static string TrimText(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..Math.Max(0, maxLength - 3)] + "...";

    private DocumentVersionDto CreateVersionSnapshot(DocumentState document, string createdBy, string? note, string description)
    {
        return new DocumentVersionDto(
            ++_documentVersionSequence,
            document.Id,
            document.NextVersionNumber,
            document.Code,
            document.Title,
            document.FileName,
            document.OcrStatus,
            document.Status,
            document.Description,
            note ?? description,
            createdBy,
            DateTime.UtcNow);
    }

    private static Gd2DocumentVersionDetailDto ToVersionDetail(DocumentVersionDto version) =>
        new(
            version.Id,
            version.DocumentId,
            version.VersionNumber,
            VersionLabel(version),
            NormalizeStatus(version.Status) == "PUBLISHED",
            version.Code,
            version.Title,
            version.FileName,
            version.OcrStatus,
            version.Status,
            version.Description,
            version.Note,
            version.CreatedBy,
            version.CreatedAt);

    private static string VersionLabel(DocumentVersionDto version)
    {
        if (NormalizeStatus(version.Status) == "PUBLISHED")
        {
            return $"v{Math.Max(1, version.VersionNumber)}.0";
        }

        return $"v1.{Math.Max(0, version.VersionNumber - 1)}";
    }

    private static Gd2DocumentVersionDiffFieldDto Diff(string field, string label, string? left, string? right)
    {
        var changed = !string.Equals(left ?? string.Empty, right ?? string.Empty, StringComparison.Ordinal);
        return new Gd2DocumentVersionDiffFieldDto(field, label, left, right, changed);
    }

    private void AddWorkflowEvent(string entityType, long entityId, string action, string? fromStatus, string toStatus, string? comment, string actor, string? unitCode)
    {
        var eventDto = new WorkflowEventDto(
            ++_workflowEventSequence,
            entityType,
            entityId,
            action,
            fromStatus,
            toStatus,
            comment,
            actor,
            unitCode,
            DateTime.UtcNow);
        _workflowEvents.Insert(0, eventDto);
        AddAuditLog(action, entityType, entityId, actor, unitCode, null, null, comment, "SUCCESS");
    }

    private void AddNotification(string entityType, long entityId, string recipient, string title, string? content, string status)
    {
        AddNotification(entityType, entityId, recipient, "IN_APP", title, content, status);
    }

    private void AddNotification(string entityType, long entityId, string recipient, string channel, string title, string? content, string status)
    {
        var now = DateTime.UtcNow;
        var notification = new NotificationDto(
            ++_notificationSequence,
            $"NTF-{_notificationSequence:0000}",
            entityType,
            entityId,
            recipient,
            channel,
            title,
            content,
            status,
            status is "SENT" or "READ" ? now : null,
            status == "READ" ? now : null,
            now);

        _notifications.Insert(0, notification);
    }

    private void AddResultNotifications(string entityType, long entityId, string recipient, string title, string? content, string resultStatus)
    {
        AddNotification(entityType, entityId, recipient, "IN_APP", title, content, "SENT");
        AddNotification(entityType, entityId, recipient, "EMAIL", $"[IDP.DMS] {title}", content, "SENT");
        AddNotification(entityType, entityId, recipient, "SMS", title, ShortSms(content ?? title), "SENT");
        AddAuditLog("SEND_RESULT_NOTIFICATION", entityType, entityId, "system", "DEFAULT", null, "QTHT", $"{resultStatus}: {title}", "SUCCESS");
    }

    private static string ShortSms(string value) =>
        value.Length <= 150 ? value : value[..147] + "...";

    private IReadOnlyList<SystemDataSourceDto> BuildSystemDataSources() =>
    [
        new("DOSSIERS", "Hồ sơ nghiệp vụ", SystemDossierBase + _dossiers.Count, "READY"),
        new("DOCUMENTS", "Tài liệu số hóa", SystemDocumentBase + _documents.Count, "READY"),
        new("APPROVED", "Hồ sơ đã duyệt", SystemApprovedBase + CountDossiersByStatus("APPROVED"), "READY"),
        new("BORROW", "Phiếu mượn", SystemBorrowBase + _borrowStatuses.Count, "READY"),
        new("NOTIFICATIONS", "Thông báo hệ thống", SystemNotificationBase + _notifications.Count, "READY"),
        new("WORKFLOW", "Lịch sử xử lý", SystemWorkflowBase + _workflowEvents.Count, "READY"),
        new("AUDIT", "Nhật ký bảo mật", _auditLogs.Count, "READY"),
        new("ACCESS", "Phạm vi phân quyền", _accessScopes.Count, "READY")
    ];

    private Gd2AuditLogDto AddAuditLog(string action, string entityType, long entityId, string actor, string? unitCode, string? departmentCode, string? roleLevel, string? detail, string result)
    {
        var audit = new Gd2AuditLogDto(
            ++_auditSequence,
            Normalize(action),
            Normalize(entityType),
            entityId,
            NormalizeUser(actor),
            string.IsNullOrWhiteSpace(unitCode) ? "DEFAULT" : unitCode.Trim().ToUpperInvariant(),
            string.IsNullOrWhiteSpace(departmentCode) ? "*" : departmentCode.Trim().ToUpperInvariant(),
            string.IsNullOrWhiteSpace(roleLevel) ? "CHUYEN_VIEN" : NormalizeRoleLevel(roleLevel),
            result,
            detail,
            DateTime.UtcNow);
        _auditLogs.Insert(0, audit);
        return audit;
    }

    private ReportSummaryRow[] BuildReportRows(string? dataType)
    {
        var key = NormalizeReportType(dataType);
        return key switch
        {
            "DIGITIZED" => [BuildRow("DIGITIZED", "Hồ sơ số hóa", ReportDigitizedBase + _documents.Count, 72m)],
            "APPROVED" => [BuildRow("APPROVED", "Hồ sơ đã duyệt", ReportApprovedBase + CountDossiersByStatus("APPROVED"), 58m)],
            "BORROW" => [BuildRow("BORROW", "Phiếu mượn", ReportBorrowBase + _borrowStatuses.Count, 8m)],
            _ => [
                BuildRow("DIGITIZED", "Hồ sơ số hóa", ReportDigitizedBase + _documents.Count, 72m),
                BuildRow("APPROVED", "Hồ sơ đã duyệt", ReportApprovedBase + CountDossiersByStatus("APPROVED"), 58m),
                BuildRow("BORROW", "Phiếu mượn", ReportBorrowBase + _borrowStatuses.Count, 8m)
            ]
        };
    }

    private static ReportSummaryRow BuildRow(string key, string indicator, long quantity, decimal rate) =>
        new(key, indicator, quantity, rate);

    private static WorkflowDefinitionDto BuildWorkflowDefinition()
    {
        var steps = new List<WorkflowStepDto>
        {
            new("DRAFT", "Trinh duyet", "Can bo xu ly", 1, 8, ["SUBMIT", "FORWARD"], "Can bo lap ho so va trinh len hang cho kiem duyet."),
            new("PENDING", "Kiem duyet", "Nguoi duyet phong ban", 2, 24, ["APPROVE", "REQUEST_SUPPLEMENT", "REJECT", "FORWARD"], "Kiem tra metadata, tai lieu dinh kem va dieu kien nghiep vu."),
            new("NEEDS_SUPPLEMENT", "Yeu cau sua doi", "Can bo xu ly", 3, 16, ["RESUBMIT"], "Tra ve don vi lap de bo sung hoac sua doi noi dung."),
            new("APPROVED", "Phe duyet", "Lanh dao don vi", 4, 24, ["SIGN", "CONFIRM", "REQUEST_SUPPLEMENT"], "Lanh dao phe duyet cuoi, ky so neu can."),
            new("PUBLISHED", "Xuat ban", "Van thu / Luu tru", 5, 8, ["CONFIRM", "REQUEST_SUPPLEMENT"], "Ban hanh va dua vao kho khai thac chinh thuc.")
        };

        return new WorkflowDefinitionDto("GD2-DOSSIER-APPROVAL", "Luân chuyển phê duyệt hồ sơ đa cấp", "DOSSIER", steps, DateTime.UtcNow);
    }

    private static IReadOnlyList<WorkflowRuntimeStepDto> BuildRuntimeWorkflowSteps(string currentStatus, IReadOnlyList<WorkflowEventDto> history)
    {
        var definition = BuildWorkflowDefinition();
        var currentOrder = WorkflowOrder(currentStatus);
        var createdAt = history.Count == 0 ? DateTime.UtcNow : history.Min(item => item.CreatedAt);
        return definition.Steps.Select(step =>
        {
            var state = step.Order < currentOrder ? "DONE" : step.Order == currentOrder ? "CURRENT" : "WAITING";
            if (NormalizeStatus(currentStatus) is "REJECTED" or "CANCELLED" && step.Order >= currentOrder)
            {
                state = step.Order == currentOrder ? "BLOCKED" : "WAITING";
            }

            var lastEvent = history
                .Where(item => NormalizeStatus(item.ToStatus) == step.Code || NormalizeStatus(item.FromStatus) == step.Code)
                .OrderByDescending(item => item.CreatedAt)
                .FirstOrDefault();
            var start = lastEvent?.CreatedAt ?? createdAt.AddHours((step.Order - 1) * 6);
            return new WorkflowRuntimeStepDto(
                step.Code,
                step.Name,
                step.Role,
                WorkflowAssignee(step.Code),
                start.AddHours(step.DeadlineHours),
                state);
        }).ToList();
    }

    private static int WorkflowOrder(string? status) =>
        NormalizeStatus(status) switch
        {
            "DRAFT" => 1,
            "PENDING" => 2,
            "NEEDS_SUPPLEMENT" => 3,
            "APPROVED" => 4,
            "PUBLISHED" or "CONFIRMED" => 5,
            "REJECTED" or "CANCELLED" => 2,
            _ => 1
        };

    private static string WorkflowAssignee(string stepCode) =>
        NormalizeStatus(stepCode) switch
        {
            "DRAFT" => "Chuyen vien lap ho so",
            "PENDING" => "Kiem duyet phong ban",
            "NEEDS_SUPPLEMENT" => "Can bo xu ly",
            "APPROVED" => "Lanh dao don vi",
            "PUBLISHED" => "Van thu luu tru",
            _ => "current-user"
        };

    private static IReadOnlyList<SupplementTemplateDto> BuildSupplementTemplates() =>
    [
        new("THIEU_GIAY_TO", "Thiếu giấy tờ bắt buộc", "Hồ sơ cần bổ sung giấy tờ bắt buộc theo thành phần hồ sơ đã công bố.", "HIGH"),
        new("SAI_DINH_DANG", "Tệp đính kèm sai định dạng", "Tài liệu đính kèm chưa đúng định dạng hoặc chưa đọc được nội dung.", "MEDIUM"),
        new("CAN_XAC_NHAN", "Cần xác nhận thông tin", "Thông tin kê khai cần được xác nhận lại trước khi tiếp tục kiểm duyệt.", "MEDIUM"),
        new("THIEU_CHU_KY", "Thiếu chữ ký/con dấu", "Hồ sơ thiếu chữ ký, chữ ký số hoặc con dấu điện tử hợp lệ.", "HIGH")
    ];

    private static string BuildSupplementGuideContent(DossierDto dossier, SupplementTemplateDto template, string reason, IReadOnlyList<string> missingItems)
    {
        var items = missingItems.Count == 0 ? "Không có danh mục riêng." : string.Join("; ", missingItems);
        return $"""
        PHIEU HUONG DAN HOAN THIEN HO SO
        Ho so: {dossier.Code} - {dossier.Title}
        Mau ly do: {template.Title}
        Noi dung mau: {template.Content}
        Ly do chi tiet: {reason.Trim()}
        Thanh phan can bo sung: {items}
        Trang thai sau kiem duyet: Cho bo sung
        """.Trim();
    }

    private static string DossierResultTitle(string dossierCode, string status) =>
        NormalizeStatus(status) switch
        {
            "APPROVED" => $"Hồ sơ {dossierCode} đã được duyệt",
            "REJECTED" => $"Hồ sơ {dossierCode} bị từ chối",
            "NEEDS_SUPPLEMENT" => $"Hồ sơ {dossierCode} cần bổ sung",
            _ => $"Hồ sơ {dossierCode} đã cập nhật kết quả"
        };

    private string ResolveDossierStatus(string currentStatus, string action)
    {
        var normalizedAction = Normalize(action);
        if (normalizedAction == "FORWARD") return "PENDING";
        if (normalizedAction == "REJECT") return "REJECTED";
        if (normalizedAction == "CANCEL") return "CANCELLED";

        return (NormalizeStatus(currentStatus), normalizedAction) switch
        {
            ("DRAFT", "SUBMIT") => "PENDING",
            ("DRAFT", "APPROVE") => "APPROVED",
            ("DRAFT", "REQUEST_SUPPLEMENT") => "NEEDS_SUPPLEMENT",
            ("PENDING", "APPROVE") => "APPROVED",
            ("PENDING", "PUBLISH") => "PUBLISHED",
            ("REJECTED", "APPROVE") => "APPROVED",
            ("PENDING", "REQUEST_SUPPLEMENT") => "NEEDS_SUPPLEMENT",
            ("NEEDS_SUPPLEMENT", "RESUBMIT") => "PENDING",
            ("NEEDS_SUPPLEMENT", "SUBMIT") => "PENDING",
            ("APPROVED", "PUBLISH") => "PUBLISHED",
            ("APPROVED", "REQUEST_SUPPLEMENT") => "NEEDS_SUPPLEMENT",
            ("PUBLISHED", "REQUEST_SUPPLEMENT") => "NEEDS_SUPPLEMENT",
            ("APPROVED", "REJECT") => "REJECTED",
            ("PUBLISHED", "REJECT") => "REJECTED",
            ("REJECTED", "SUBMIT") => "PENDING",
            ("APPROVED", "SIGN") => "PUBLISHED",
            ("APPROVED", "CONFIRM") => "CONFIRMED",
            ("PUBLISHED", "CONFIRM") => "CONFIRMED",
            ("CONFIRMED", "REQUEST_SUPPLEMENT") => "NEEDS_SUPPLEMENT",
            ("APPROVED", "APPROVE") => "APPROVED",
            ("PUBLISHED", "SIGN") => "PUBLISHED",
            ("CONFIRMED", "CONFIRM") => "CONFIRMED",
            _ => throw new BusinessRuleException($"Hành động '{action}' không hợp lệ cho trạng thái '{currentStatus}'.")
        };
    }

    private string ResolveBorrowStatus(string currentStatus, string action)
    {
        return (NormalizeStatus(currentStatus), Normalize(action)) switch
        {
            ("PENDING", "APPROVE") => "APPROVED",
            ("PENDING", "REJECT") => "REJECTED",
            ("APPROVED", "HANDOVER") => "BORROWED",
            ("BORROWED", "RETURN") => "RETURNED",
            ("BORROWED", "RECALL") => "RECALLED",
            ("APPROVED", "APPROVE") => "APPROVED",
            ("BORROWED", "BORROWED") => "BORROWED",
            _ => throw new BusinessRuleException($"Hành động '{action}' không hợp lệ cho phiếu mượn ở trạng thái '{currentStatus}'.")
        };
    }

    private static void ValidateTransitionRequest(WorkflowTransitionRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thiếu yêu cầu chuyển trạng thái.");
        if (string.IsNullOrWhiteSpace(request.EntityType)) throw new BusinessRuleException("Thiếu loại thực thể.");
        if (request.EntityId <= 0) throw new BusinessRuleException("Mã thực thể không hợp lệ.");
        if (string.IsNullOrWhiteSpace(request.Action)) throw new BusinessRuleException("Thiếu hành động chuyển trạng thái.");
        if (string.IsNullOrWhiteSpace(request.Actor)) throw new BusinessRuleException("Thiếu người thao tác.");
    }

    private static void ValidateReportRunRequest(ReportRunRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thiếu yêu cầu ghi nhận lần chạy báo cáo.");
        if (string.IsNullOrWhiteSpace(request.ReportCode)) throw new BusinessRuleException("Thiếu mã báo cáo.");
        if (string.IsNullOrWhiteSpace(request.DataType)) throw new BusinessRuleException("Thiếu loại dữ liệu báo cáo.");
        if (string.IsNullOrWhiteSpace(request.Format)) throw new BusinessRuleException("Thiếu định dạng xuất báo cáo.");
        if (string.IsNullOrWhiteSpace(request.Actor)) throw new BusinessRuleException("Thiếu người thực hiện.");
    }

    private static void ValidateReportConfigRequest(ReportConfigRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thiếu yêu cầu lưu cấu hình báo cáo.");
        if (string.IsNullOrWhiteSpace(request.Code)) throw new BusinessRuleException("Thiếu mã báo cáo.");
        if (string.IsNullOrWhiteSpace(request.Name)) throw new BusinessRuleException("Thiếu tên báo cáo.");
        if (string.IsNullOrWhiteSpace(request.DataType)) throw new BusinessRuleException("Thiếu loại dữ liệu báo cáo.");
        if (string.IsNullOrWhiteSpace(request.TemplateFileName)) throw new BusinessRuleException("Thiếu tệp thiết kế.");
    }

    private static void ValidateAuditRequest(Gd2AuditLogRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thiếu yêu cầu ghi audit.");
        if (string.IsNullOrWhiteSpace(request.Action)) throw new BusinessRuleException("Thiếu hành động audit.");
        if (string.IsNullOrWhiteSpace(request.EntityType)) throw new BusinessRuleException("Thiếu loại đối tượng audit.");
        if (request.EntityId <= 0) throw new BusinessRuleException("Mã đối tượng audit không hợp lệ.");
        if (string.IsNullOrWhiteSpace(request.Actor)) throw new BusinessRuleException("Thiếu người thao tác audit.");
    }

    private static void ValidateAccessScopeRequest(Gd2AccessScopeRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thiếu yêu cầu lưu phân quyền.");
        if (string.IsNullOrWhiteSpace(request.PrincipalType)) throw new BusinessRuleException("Thiếu loại chủ thể quyền.");
        if (string.IsNullOrWhiteSpace(request.PrincipalCode)) throw new BusinessRuleException("Thiếu mã chủ thể quyền.");
        if (string.IsNullOrWhiteSpace(request.UnitCode)) throw new BusinessRuleException("Thiếu đơn vị áp dụng.");
        if (string.IsNullOrWhiteSpace(request.RoleLevel)) throw new BusinessRuleException("Thiếu cấp bậc quyền.");
        if (string.IsNullOrWhiteSpace(request.ResourceCode)) throw new BusinessRuleException("Thiếu tài nguyên phân quyền.");
        if (string.IsNullOrWhiteSpace(request.Actions)) throw new BusinessRuleException("Thiếu danh sách hành động được phép.");
        if (string.IsNullOrWhiteSpace(request.DataScope)) throw new BusinessRuleException("Thiếu phạm vi dữ liệu.");
    }

    private static string Normalize(string? value) => value?.Trim().ToUpperInvariant() ?? string.Empty;

    private static string NormalizeUser(string? value) => string.IsNullOrWhiteSpace(value) ? "system" : value.Trim();

    private static string NormalizeStatus(string? status) => string.IsNullOrWhiteSpace(status) ? "DRAFT" : status.Trim().ToUpperInvariant();

    private static string NormalizeReportType(string? value)
    {
        var normalized = Normalize(value);
        return normalized switch
        {
            "DIGITIZED" => "DIGITIZED",
            "APPROVED" => "APPROVED",
            "BORROW" => "BORROW",
            "SUMMARY" => "SUMMARY",
            _ => "SUMMARY"
        };
    }

    private static string NormalizePrincipalType(string? value)
    {
        var normalized = Normalize(value);
        return normalized switch
        {
            "USER" or "GROUP" or "ROLE" or "DEPARTMENT" => normalized,
            _ => throw new BusinessRuleException("Loại chủ thể quyền chỉ hỗ trợ USER, GROUP, ROLE hoặc DEPARTMENT.")
        };
    }

    private static string NormalizeRoleLevel(string? value)
    {
        var normalized = Normalize(value);
        return normalized switch
        {
            "LANH_DAO" or "CHUYEN_VIEN" or "QTHT" => normalized,
            _ => throw new BusinessRuleException("Cấp bậc quyền chỉ hỗ trợ LANH_DAO, CHUYEN_VIEN hoặc QTHT.")
        };
    }

    private static string NormalizeDataScope(string? value)
    {
        var normalized = Normalize(value);
        return normalized switch
        {
            "UNIT" or "DEPARTMENT" or "OWN" or "ALL" => normalized,
            _ => throw new BusinessRuleException("Phạm vi dữ liệu chỉ hỗ trợ UNIT, DEPARTMENT, OWN hoặc ALL.")
        };
    }

    private static int RoleRank(string roleLevel) =>
        NormalizeRoleLevel(roleLevel) switch
        {
            "CHUYEN_VIEN" => 1,
            "LANH_DAO" => 2,
            "QTHT" => 3,
            _ => 0
        };

    private static string NormalizeActions(string value)
    {
        var allowed = new HashSet<string>(["VIEW", "CREATE", "EDIT", "DELETE", "APPROVE", "EXPORT", "SIGN", "DOWNLOAD"], StringComparer.OrdinalIgnoreCase);
        var actions = value
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(item => item.ToUpperInvariant())
            .Distinct()
            .ToList();
        if (actions.Count == 0 || actions.Any(action => !allowed.Contains(action)))
        {
            throw new BusinessRuleException("Hành động quyền chỉ hỗ trợ VIEW, CREATE, EDIT, DELETE, APPROVE, EXPORT, SIGN, DOWNLOAD.");
        }

        return string.Join(",", actions);
    }

    private static void ValidateSignatureRequest(Gd2DigitalSignatureRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thieu yeu cau ky so.");
        if (request.DocumentId <= 0) throw new BusinessRuleException("Tai lieu ky so khong hop le.");
        if (string.IsNullOrWhiteSpace(request.Signer)) throw new BusinessRuleException("Thieu nguoi ky.");
        var provider = NormalizeSignatureProvider(request.Provider);
        if ((provider == "USB_TOKEN" || provider == "PKCS11") && string.IsNullOrWhiteSpace(request.Pin))
        {
            throw new BusinessRuleException("Ky so USB Token/PKCS#11 bat buoc nhap ma PIN.");
        }
        if ((provider == "REMOTE_SIGNING" || provider == "SIM_PKI" || provider == "SMART_CA") && string.IsNullOrWhiteSpace(request.Otp))
        {
            throw new BusinessRuleException("Ky so tu xa/SIM PKI/SmartCA bat buoc xac thuc OTP.");
        }
        NormalizeSignatureZone(request.Zone);
    }

    private static void ValidateSupplementGuideRequest(SupplementGuideRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thieu yeu cau bo sung ho so.");
        if (request.DossierId <= 0) throw new BusinessRuleException("Ho so yeu cau bo sung khong hop le.");
        if (string.IsNullOrWhiteSpace(request.Actor)) throw new BusinessRuleException("Thieu can bo kiem duyet.");
        if (string.IsNullOrWhiteSpace(request.Recipient)) throw new BusinessRuleException("Thieu nguoi nhan thong bao.");
        if (string.IsNullOrWhiteSpace(request.Reason)) throw new BusinessRuleException("Thieu ly do yeu cau bo sung.");
    }

    private static void ValidateApiKeyRequest(Gd2ApiKeyRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thieu yeu cau tao API key.");
        if (string.IsNullOrWhiteSpace(request.ClientName)) throw new BusinessRuleException("Thieu ten ung dung tich hop.");
        NormalizeIntegrationSystemCode(request.SystemCode);
        NormalizeIntegrationAuthMode(request.AuthMode);
        NormalizeIntegrationScopes(request.Scopes);
    }

    private static void ValidateWebhookRequest(Gd2WebhookEventRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thieu du lieu webhook.");
        NormalizeIntegrationSystemCode(request.SystemCode);
        if (string.IsNullOrWhiteSpace(request.EventType)) throw new BusinessRuleException("Thieu loai su kien webhook.");
        if (string.IsNullOrWhiteSpace(request.Payload)) throw new BusinessRuleException("Thieu payload webhook.");
    }

    private static void ValidateSyncJobRequest(Gd2SyncJobRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thieu yeu cau dong bo.");
        NormalizeIntegrationSystemCode(request.SystemCode);
        NormalizeSyncDataType(request.DataType);
    }

    private static void ValidateUnitCustomizationRequest(Gd2UnitCustomizationRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thieu cau hinh giao dien don vi.");
        NormalizeUnitCode(request.UnitCode);
        if (string.IsNullOrWhiteSpace(request.UnitName)) throw new BusinessRuleException("Thieu ten don vi.");
        NormalizeHexColor(request.PrimaryColor, "#3264f4");
        NormalizeHexColor(request.AccentColor, "#0ea5e9");
        NormalizeLayoutMode(request.LayoutMode);
        if (string.IsNullOrWhiteSpace(request.Actor)) throw new BusinessRuleException("Thieu nguoi cap nhat cau hinh.");
        NormalizeUnitWorkflowSteps(request.WorkflowSteps);
    }

    private static string NormalizeUnitCode(string? value)
    {
        var normalized = Normalize(value);
        if (string.IsNullOrWhiteSpace(normalized)) throw new BusinessRuleException("Thieu ma don vi.");
        return normalized;
    }

    private static string NormalizeHexColor(string? value, string fallback)
    {
        var color = string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
        if (!color.StartsWith('#') || color.Length != 7 || color.Skip(1).Any(item => !Uri.IsHexDigit(item)))
        {
            throw new BusinessRuleException("Mau giao dien phai dung dinh dang #RRGGBB.");
        }

        return color.ToLowerInvariant();
    }

    private static string NormalizeLayoutMode(string? value)
    {
        var normalized = Normalize(value).Replace("-", "_");
        return normalized switch
        {
            "" or "STANDARD" => "STANDARD",
            "COMPACT" => "COMPACT",
            "MOBILE" or "APP_VIEW" => "MOBILE",
            "FLUID" or "FULL" => "FLUID",
            _ => throw new BusinessRuleException("Bo cuc chi ho tro STANDARD, COMPACT, MOBILE hoac FLUID.")
        };
    }

    private static IReadOnlyList<Gd2UnitWorkflowStepDto> NormalizeUnitWorkflowSteps(IReadOnlyList<Gd2UnitWorkflowStepDto>? steps)
    {
        var source = steps is { Count: > 0 } ? steps : DefaultUnitWorkflowSteps();
        return source
            .OrderBy(item => item.Order)
            .Select((item, index) =>
            {
                var required = item.Required || Normalize(item.Code) is "SUBMIT" or "APPROVE" or "PUBLISH";
                return new Gd2UnitWorkflowStepDto(
                    Normalize(item.Code),
                    string.IsNullOrWhiteSpace(item.Name) ? Normalize(item.Code) : item.Name.Trim(),
                    string.IsNullOrWhiteSpace(item.Role) ? "CHUYEN_VIEN" : Normalize(item.Role),
                    required,
                    required || item.Enabled,
                    index + 1,
                    string.IsNullOrWhiteSpace(item.Description) ? "Buoc xu ly tuy bien theo don vi." : item.Description.Trim());
            })
            .ToList();
    }

    private static IReadOnlyList<Gd2UnitWorkflowStepDto> DefaultUnitWorkflowSteps() =>
    [
        new("SUBMIT", "Trinh duyet", "CHUYEN_VIEN", true, true, 1, "Ho so duoc gui vao luong xu ly."),
        new("PRE_CHECK", "Kiem tra so bo", "CHUYEN_VIEN", false, true, 2, "Buoc khong bat buoc de ra soat thanh phan ho so."),
        new("APPRAISE", "Tham dinh chuyen mon", "LANH_DAO", false, true, 3, "Tham dinh theo dac thu tung dia phuong."),
        new("APPROVE", "Phe duyet", "LANH_DAO", true, true, 4, "Lanh dao phe duyet ket qua."),
        new("SIGN", "Ky so", "LANH_DAO", false, true, 5, "Ky so neu quy trinh yeu cau."),
        new("PUBLISH", "Xuat ban", "QTHT", true, true, 6, "Cong bo va luu tru chinh thuc.")
    ];

    private static Gd2UnitCustomizationDto BuildDefaultCustomization(string unitCode, string unitName, string actor) =>
        new(
            unitCode,
            unitName,
            "/assets/idp-logo.svg",
            $"IDP.DMS - {unitName}",
            "#3264f4",
            "#0ea5e9",
            "STANDARD",
            true,
            DefaultUnitWorkflowSteps(),
            NormalizeUser(actor),
            DateTime.UtcNow);

    private static void ValidateDeduplicationCheckRequest(Gd2DeduplicationCheckRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thieu yeu cau kiem tra trung lap.");
        if (string.IsNullOrWhiteSpace(request.Code)) throw new BusinessRuleException("Thieu ma loai ho so.");
        if (string.IsNullOrWhiteSpace(request.Name)) throw new BusinessRuleException("Thieu ten loai ho so.");
        NormalizeUnitCode(request.UnitCode);
        NormalizeStorageScope(request.StorageScope);
    }

    private static void ValidateSharedDossierTypeRequest(Gd2SharedDossierTypeRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thieu yeu cau tao loai ho so chia se.");
        if (string.IsNullOrWhiteSpace(request.Actor)) throw new BusinessRuleException("Thieu nguoi tao loai ho so.");
        ValidateDeduplicationCheckRequest(new Gd2DeduplicationCheckRequest(request.Code, request.Name, request.UnitCode, request.StorageScope));
    }

    private static void ValidateShareAccessRequest(Gd2ShareAccessRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thieu yeu cau cap quyen chia se.");
        if (request.MasterRecordId <= 0) throw new BusinessRuleException("Ban ghi master khong hop le.");
        if (request.UnitCodes is null || request.UnitCodes.Count == 0) throw new BusinessRuleException("Can chon it nhat mot don vi duoc chia se.");
        if (string.IsNullOrWhiteSpace(request.Actor)) throw new BusinessRuleException("Thieu nguoi cap quyen chia se.");
    }

    private static string NormalizeCode(string? value)
    {
        var normalized = Normalize(value).Replace(" ", "-");
        if (string.IsNullOrWhiteSpace(normalized)) throw new BusinessRuleException("Thieu ma ban ghi.");
        return normalized;
    }

    private static string NormalizeStorageScope(string? value)
    {
        var normalized = Normalize(value).Replace(" ", "_");
        return normalized switch
        {
            "" or "COMMON" or "SHARED" or "KHO_CHUNG" => "COMMON",
            "UNIT" or "PRIVATE" or "KHO_DON_VI" => "UNIT",
            _ => throw new BusinessRuleException("Pham vi kho chi ho tro COMMON hoac UNIT.")
        };
    }

    private static IReadOnlyList<string> NormalizeSharedUnits(IReadOnlyList<string>? units, string masterUnitCode)
    {
        return (units ?? [])
            .Select(NormalizeUnitCode)
            .Where(unit => unit != masterUnitCode)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(unit => unit)
            .ToList();
    }

    private Gd2DeduplicationCheckResult BuildDeduplicationResult(string code, string name, string unitCode, string storageScope)
    {
        var normalizedCode = NormalizeCode(code);
        var normalizedName = NormalizeNameKey(name);
        var normalizedScope = NormalizeStorageScope(storageScope);
        var normalizedUnit = NormalizeUnitCode(unitCode);
        var candidate = _sharedDossierTypes
            .Where(item => item.StorageScope == normalizedScope || normalizedScope == "COMMON")
            .Select(item =>
            {
                var codeMatch = item.Code.Equals(normalizedCode, StringComparison.OrdinalIgnoreCase);
                var nameScore = SimilarityPercent(NormalizeNameKey(item.Name), normalizedName);
                var score = codeMatch ? 100m : nameScore;
                var reason = codeMatch ? "Trung ma loai ho so" : "Ten gan giong ban ghi trong kho chung";
                return new { item, score, reason };
            })
            .Where(item => item.score >= 82m)
            .OrderByDescending(item => item.score)
            .FirstOrDefault();

        if (candidate is null)
        {
            return new Gd2DeduplicationCheckResult(false, null, $"Chua phat hien trung lap cho don vi {normalizedUnit}. Co the tao master moi.", DateTime.UtcNow);
        }

        return new Gd2DeduplicationCheckResult(
            true,
            new Gd2DeduplicationCandidateDto(
                candidate.item.Id,
                candidate.item.Code,
                candidate.item.Name,
                candidate.item.MasterUnitCode,
                candidate.reason,
                candidate.score,
                candidate.item.SharedUnitCodes),
            "Khuyen nghi giu ban ghi master va cap Share Access cho don vi lien quan.",
            DateTime.UtcNow);
    }

    private static string NormalizeNameKey(string? value)
    {
        return new string((value ?? string.Empty)
            .Trim()
            .ToUpperInvariant()
            .Where(char.IsLetterOrDigit)
            .ToArray());
    }

    private static decimal SimilarityPercent(string left, string right)
    {
        if (string.IsNullOrWhiteSpace(left) || string.IsNullOrWhiteSpace(right)) return 0m;
        if (left == right) return 100m;
        var leftTokens = TokenizeForSimilarity(left);
        var rightTokens = TokenizeForSimilarity(right);
        var intersect = leftTokens.Intersect(rightTokens).Count();
        var union = leftTokens.Union(rightTokens).Count();
        return union == 0 ? 0m : Math.Round(intersect * 100m / union, 1);
    }

    private static IReadOnlySet<string> TokenizeForSimilarity(string value)
    {
        var compact = NormalizeNameKey(value);
        var tokens = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < compact.Length; i += 3)
        {
            tokens.Add(compact.Substring(i, Math.Min(3, compact.Length - i)));
        }
        return tokens;
    }

    private static void ValidateArchiveDossierRequest(Gd2ArchiveDossierRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thieu yeu cau luu danh muc ho so.");
        NormalizeCode(request.Code);
        if (string.IsNullOrWhiteSpace(request.Title)) throw new BusinessRuleException("Thieu ten ho so.");
        if (string.IsNullOrWhiteSpace(request.DossierType)) throw new BusinessRuleException("Thieu loai ho so.");
        if (string.IsNullOrWhiteSpace(request.StorageLocation)) throw new BusinessRuleException("Thieu vi tri/kho luu tru.");
        NormalizeSecurityLevel(request.SecurityLevel);
        if (string.IsNullOrWhiteSpace(request.BorrowCondition)) throw new BusinessRuleException("Thieu dieu kien duoc muon/doc.");
        if (!request.AllowOnlineRead && !request.AllowSoftCopy && !request.AllowHardCopy) throw new BusinessRuleException("Can cho phep it nhat mot hinh thuc khai thac.");
        if (string.IsNullOrWhiteSpace(request.Actor)) throw new BusinessRuleException("Thieu nguoi cap nhat danh muc.");
    }

    private static void ValidateBorrowRegistrationRequest(Gd2BorrowRegistrationRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thieu phieu dang ky muon.");
        if (request.DossierId <= 0) throw new BusinessRuleException("Ho so dang ky khong hop le.");
        if (string.IsNullOrWhiteSpace(request.Borrower)) throw new BusinessRuleException("Thieu nguoi muon/khai thac.");
        NormalizeExploitMode(request.ExploitMode);
        if (string.IsNullOrWhiteSpace(request.Purpose)) throw new BusinessRuleException("Thieu muc dich khai thac.");
        if (string.IsNullOrWhiteSpace(request.Actor)) throw new BusinessRuleException("Thieu nguoi tao phieu.");
    }

    private static string NormalizeExploitMode(string? value)
    {
        var normalized = Normalize(value).Replace("-", "_").Replace(" ", "_");
        return normalized switch
        {
            "" or "ONLINE" or "ONLINE_READ" or "PDF" => "ONLINE_READ",
            "SOFT" or "SOFT_COPY" or "DOWNLOAD" => "SOFT_COPY",
            "HARD" or "HARD_COPY" or "PHYSICAL" => "HARD_COPY",
            _ => throw new BusinessRuleException("Hinh thuc khai thac chi ho tro ONLINE_READ, SOFT_COPY hoac HARD_COPY.")
        };
    }

    private static string NormalizeBorrowFlowStatus(string? value)
    {
        var normalized = Normalize(value);
        return normalized switch
        {
            "" or "PENDING" => "PENDING",
            "APPROVED" => "APPROVED",
            "HANDED_OVER" => "HANDED_OVER",
            "BORROWED" => "BORROWED",
            "OVERDUE" => "OVERDUE",
            "RETURNED" => "RETURNED",
            "RECALLED" => "RECALLED",
            "REJECTED" => "REJECTED",
            _ => throw new BusinessRuleException("Trang thai phieu muon khong hop le.")
        };
    }

    private static void EnsureBorrowModeAllowed(Gd2ArchiveDossierDto dossier, string mode)
    {
        var allowed = mode switch
        {
            "ONLINE_READ" => dossier.AllowOnlineRead,
            "SOFT_COPY" => dossier.AllowSoftCopy,
            "HARD_COPY" => dossier.AllowHardCopy,
            _ => false
        };
        if (!allowed)
        {
            throw new BusinessRuleException($"Ho so {dossier.Code} khong cho phep hinh thuc khai thac {mode}.");
        }
        if (dossier.SecurityLevel is "TOI_MAT" or "TUYET_MAT" && mode == "SOFT_COPY")
        {
            throw new BusinessRuleException("Ho so Toi mat/Tuyet mat khong duoc tai ban mem sao chep.");
        }
    }

    private Task<Gd2BorrowFlowDto> UpdateBorrowFlowAsync(long id, Gd2BorrowActionRequest request, string action, string auditStatus, Func<Gd2BorrowFlowDto, Gd2BorrowFlowDto> update)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Actor)) throw new BusinessRuleException("Thieu nguoi thao tac phieu muon.");
        lock (_gate)
        {
            var index = _borrowFlows.FindIndex(item => item.Id == id);
            if (index < 0) throw new BusinessRuleException("Khong tim thay phieu muon.");
            var current = RefreshBorrowOverdue(_borrowFlows[index]);
            var updated = RefreshBorrowOverdue(update(current));
            _borrowFlows[index] = updated;
            _borrowStatuses[id] = updated.Status;
            AddWorkflowEvent("BORROW", id, action, current.Status, updated.Status, request.Note, request.Actor, "DEFAULT");
            AddAuditLog($"BORROW_{action}", "BORROW", id, NormalizeUser(request.Actor), "DEFAULT", null, "LANH_DAO", request.Note ?? auditStatus, "SUCCESS");
            if (updated.Overdue)
            {
                AddNotification("BORROW", id, updated.Borrower, $"Phieu muon {updated.DossierCode} qua han", $"Han tra: {updated.DueDate:yyyy-MM-dd}", "PENDING");
            }
            return Task.FromResult(updated);
        }
    }

    private static Gd2BorrowFlowDto RefreshBorrowOverdue(Gd2BorrowFlowDto item)
    {
        if (item.Status is "RETURNED" or "RECALLED" or "REJECTED")
        {
            return item with { Overdue = false };
        }

        var overdue = item.DueDate.Date < DateTime.UtcNow.Date && item.Status is "APPROVED" or "BORROWED" or "HANDED_OVER";
        return item with { Overdue = overdue, Status = overdue ? "OVERDUE" : item.Status };
    }

    private static string NormalizeIntegrationSystemCode(string? value)
    {
        var normalized = Normalize(value);
        return normalized switch
        {
            "HRM" => "HRM",
            "ERP" or "CORE" => "ERP",
            "VOFFICE" or "EOFFICE" => "VOFFICE",
            _ => throw new BusinessRuleException("He thong tich hop chi ho tro HRM, ERP/Core hoac VOffice/eOffice.")
        };
    }

    private static string NormalizeIntegrationAuthMode(string? value)
    {
        var normalized = Normalize(value).Replace("-", "_").Replace(" ", "_");
        return normalized switch
        {
            "" or "API_KEY" or "APIKEY" => "API_KEY",
            "JWT" or "JWT_TOKEN" => "JWT",
            "OAUTH2" or "OAUTH_2" or "OAUTH" => "OAUTH2",
            _ => throw new BusinessRuleException("Xac thuc tich hop chi ho tro API Key, JWT hoac OAuth2.")
        };
    }

    private static string NormalizeIntegrationScopes(string? value)
    {
        var allowed = new HashSet<string>(["DOSSIER_READ", "DOSSIER_WRITE", "DOCUMENT_READ", "DOCUMENT_WRITE", "MASTER_DATA_SYNC", "WEBHOOK_RETRY"], StringComparer.OrdinalIgnoreCase);
        var scopes = (value ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(item => item.ToUpperInvariant())
            .Distinct()
            .ToList();
        if (scopes.Count == 0 || scopes.Any(scope => !allowed.Contains(scope)))
        {
            throw new BusinessRuleException("Scope API chi ho tro DOSSIER_READ, DOSSIER_WRITE, DOCUMENT_READ, DOCUMENT_WRITE, MASTER_DATA_SYNC, WEBHOOK_RETRY.");
        }

        return string.Join(",", scopes);
    }

    private static string NormalizeSyncDataType(string? value)
    {
        var normalized = Normalize(value);
        return normalized switch
        {
            "" or "DEPARTMENT" => "DEPARTMENT",
            "PERSONNEL" or "EMPLOYEE" or "STAFF" => "PERSONNEL",
            "DOSSIER" => "DOSSIER",
            "DOCUMENT" => "DOCUMENT",
            _ => throw new BusinessRuleException("Loai dong bo chi ho tro DEPARTMENT, PERSONNEL, DOSSIER hoac DOCUMENT.")
        };
    }

    private bool IsIntegrationAuthValid(string systemCode, string? credential)
    {
        if (string.IsNullOrWhiteSpace(credential))
        {
            return false;
        }

        var token = credential.Trim();
        var expectedPrefix = $"idp_{systemCode.ToLowerInvariant()}";
        return (token.StartsWith("idp_demo_", StringComparison.OrdinalIgnoreCase) && token.Contains(systemCode, StringComparison.OrdinalIgnoreCase))
            || token.StartsWith(expectedPrefix, StringComparison.OrdinalIgnoreCase);
    }

    private Gd2IntegrationLogDto AddIntegrationLog(
        string direction,
        string systemCode,
        string endpoint,
        string method,
        int statusCode,
        string result,
        string requestBody,
        string responseBody,
        long? retryOfId)
    {
        var log = new Gd2IntegrationLogDto(
            ++_integrationLogSequence,
            Normalize(direction),
            NormalizeIntegrationSystemCode(systemCode),
            endpoint,
            Normalize(method),
            statusCode,
            Normalize(result),
            requestBody,
            responseBody,
            DateTime.UtcNow,
            retryOfId);
        _integrationLogs.Insert(0, log);
        return log;
    }

    private static string NormalizeSignatureProvider(string? provider)
    {
        var normalized = Normalize(provider).Replace("-", "_").Replace(" ", "_");
        return normalized switch
        {
            "" or "USB" or "USB_TOKEN" or "PKCS11" or "PKCS_11" => "USB_TOKEN",
            "REMOTE" or "REMOTE_SIGNING" or "HSM" => "REMOTE_SIGNING",
            "SIM" or "SIM_PKI" => "SIM_PKI",
            "SMARTCA" or "SMART_CA" => "SMART_CA",
            _ => throw new BusinessRuleException("Phuong thuc ky chi ho tro USB Token/PKCS#11, Remote Signing, SIM PKI hoac SmartCA.")
        };
    }

    private static Gd2SignatureZoneDto NormalizeSignatureZone(Gd2SignatureZoneDto? zone)
    {
        if (zone is null) throw new BusinessRuleException("Thieu vung ky tren PDF.");
        if (zone.Page <= 0) throw new BusinessRuleException("Trang ky phai lon hon 0.");
        var x = Math.Clamp(zone.X, 0m, 100m);
        var y = Math.Clamp(zone.Y, 0m, 100m);
        var width = Math.Clamp(zone.Width <= 0 ? 24m : zone.Width, 8m, 60m);
        var height = Math.Clamp(zone.Height <= 0 ? 10m : zone.Height, 5m, 30m);
        if (x + width > 100m) x = 100m - width;
        if (y + height > 100m) y = 100m - height;
        return new Gd2SignatureZoneDto(zone.Page, x, y, width, height);
    }

    private static string BuildCertificateSubject(string signer, string provider) =>
        $"CN={NormalizeUser(signer)}, O=IDP.DMS, OU={provider}";

    private static void ValidateSecurityLabelRequest(Gd2SecurityLabelRequest request)
    {
        if (request is null) throw new BusinessRuleException("Thieu yeu cau gan nhan bao mat.");
        if (string.IsNullOrWhiteSpace(request.EntityType)) throw new BusinessRuleException("Thieu loai doi tuong bao mat.");
        if (request.EntityId <= 0) throw new BusinessRuleException("Doi tuong gan nhan bao mat khong hop le.");
        if (string.IsNullOrWhiteSpace(request.SecurityLevel)) throw new BusinessRuleException("Thieu cap do bao mat.");
        if (string.IsNullOrWhiteSpace(request.Actor)) throw new BusinessRuleException("Thieu nguoi thuc hien gan nhan bao mat.");
        NormalizeSecurityEntityType(request.EntityType);
        NormalizeSecurityLevel(request.SecurityLevel);
    }

    private static string NormalizeSecurityEntityType(string? value)
    {
        var normalized = Normalize(value);
        return normalized switch
        {
            "DOCUMENT" or "DOSSIER" => normalized,
            _ => throw new BusinessRuleException("Loai doi tuong bao mat chi ho tro DOCUMENT hoac DOSSIER.")
        };
    }

    private static string NormalizeSecurityLevel(string? value)
    {
        var normalized = Normalize(value);
        return normalized switch
        {
            "" or "THUONG" or "NORMAL" or "INTERNAL" or "NOI_BO" => "THUONG",
            "MAT" or "CONFIDENTIAL" => "MAT",
            "TOI_MAT" or "SECRET" => "TOI_MAT",
            "TUYET_MAT" or "TOP_SECRET" => "TUYET_MAT",
            _ => throw new BusinessRuleException("Cap do bao mat chi ho tro THUONG, MAT, TOI_MAT hoac TUYET_MAT.")
        };
    }

    private static (string Label, string Color, bool Sensitive, bool Encrypt) SecurityMeta(string level) =>
        NormalizeSecurityLevel(level) switch
        {
            "MAT" => ("Mat", "red", true, true),
            "TOI_MAT" => ("Toi mat", "dark-red", true, true),
            "TUYET_MAT" => ("Tuyet mat", "purple", true, true),
            _ => ("Thuong / Noi bo", "blue", false, false)
        };

    private static string SecurityKey(string entityType, long entityId) =>
        $"{NormalizeSecurityEntityType(entityType)}:{entityId}";

    private static Gd2SecurityLabelDto BuildSecurityLabel(string entityType, long entityId, string level, string updatedBy)
    {
        var normalizedLevel = NormalizeSecurityLevel(level);
        var meta = SecurityMeta(normalizedLevel);
        return new Gd2SecurityLabelDto(
            NormalizeSecurityEntityType(entityType),
            entityId,
            normalizedLevel,
            meta.Label,
            meta.Color,
            meta.Sensitive,
            meta.Encrypt,
            NormalizeUser(updatedBy),
            DateTime.UtcNow);
    }

    private Gd2SecurityLabelDto GetOrCreateSecurityLabel(string entityType, long entityId)
    {
        var key = SecurityKey(entityType, entityId);
        if (_securityLabels.TryGetValue(key, out var label))
        {
            return label;
        }

        var defaultLevel = entityType == "DOCUMENT" && entityId % 3 == 0 ? "MAT" : "THUONG";
        label = BuildSecurityLabel(entityType, entityId, defaultLevel, "system");
        _securityLabels[key] = label;
        return label;
    }

    private static string NextStatus(string? status) => string.IsNullOrWhiteSpace(status) ? "DRAFT" : status;

    private int CountDossiersByStatus(string status) =>
        _dossiers.Values.Count(item => string.Equals(NormalizeStatus(item.Status), status, StringComparison.OrdinalIgnoreCase));

    private int CountDocumentsByOcrStatus(string status) =>
        _documents.Values.Count(item => string.Equals(NormalizeStatus(item.OcrStatus), status, StringComparison.OrdinalIgnoreCase));

    private void Seed()
    {
        var now = DateTime.UtcNow;

        _dossiers[1] = new DossierDto(1, "HS-001", "Hồ sơ số hóa hành chính", "Hành chính", 1, "DRAFT", now.AddDays(-10), now.AddDays(20), "Hồ sơ đang chờ biên mục.");
        _dossiers[2] = new DossierDto(2, "HS-002", "Hồ sơ đã tiếp nhận", "Tài chính", 1, "PENDING", now.AddDays(-25), now.AddDays(10), "Hồ sơ đã qua bước tiếp nhận.");
        _dossiers[3] = new DossierDto(3, "HS-003", "Hồ sơ đã duyệt", "Nhân sự", 2, "APPROVED", now.AddDays(-40), now.AddDays(5), "Hồ sơ đã được phê duyệt.");
        _dossiers[4] = new DossierDto(4, "HS-004", "Hồ sơ cần bổ sung", "Pháp chế", 2, "NEEDS_SUPPLEMENT", now.AddDays(-15), now.AddDays(15), "Hồ sơ đang chờ bổ sung.");

        _dossiers[5] = new DossierDto(5, "HS-005", "Ho so da xuat ban cho xac nhan", "Giao duc", 3, "PUBLISHED", now.AddDays(-5), now.AddDays(45), "Ho so san sang cho buoc xac nhan thong tin.");
        _borrowStatuses[1] = "PENDING";
        _borrowStatuses[2] = "APPROVED";
        _borrowStatuses[3] = "BORROWED";

        _securityLabels[SecurityKey("DOCUMENT", 1)] = BuildSecurityLabel("DOCUMENT", 1, "THUONG", "system");
        _securityLabels[SecurityKey("DOCUMENT", 2)] = BuildSecurityLabel("DOCUMENT", 2, "MAT", "system");
        _securityLabels[SecurityKey("DOCUMENT", 3)] = BuildSecurityLabel("DOCUMENT", 3, "TOI_MAT", "system");
        _securityLabels[SecurityKey("DOSSIER", 1)] = BuildSecurityLabel("DOSSIER", 1, "THUONG", "system");
        _securityLabels[SecurityKey("DOSSIER", 2)] = BuildSecurityLabel("DOSSIER", 2, "MAT", "system");
        _securityLabels[SecurityKey("DOSSIER", 3)] = BuildSecurityLabel("DOSSIER", 3, "TUYET_MAT", "system");
        AddAuditLog("LOGIN_FAILURE", "USER", 1, "unknown", "DEFAULT", null, "CHUYEN_VIEN", "Sai mat khau qua so lan quy dinh", "FAILED");
        AddAuditLog("EXPORT", "DOCUMENT", 2, "current-user", "DEFAULT", "HC", "CHUYEN_VIEN", "Xuat file nhay cam co watermark", "SUCCESS");

        SeedDocument(new DocumentState(1, 1, "VB-001", "Quyết định số 01", "qd01.pdf", "DONE", "DRAFT", "Bản sao quyết định đã số hóa."));
        SeedDocument(new DocumentState(2, 2, "VB-002", "Hợp đồng số 02", "hd02.pdf", "DONE", "APPROVED", "Hợp đồng đã phê duyệt."));
        SeedDocument(new DocumentState(3, 3, "VB-003", "Phiếu mượn số 03", "pm03.pdf", "PENDING", "DRAFT", "Phiếu mượn đang xử lý."));

        AddNotification("DOSSIER", 2, "current-user", "Hồ sơ HS-002 cần duyệt", "Hồ sơ vừa được đẩy vào hàng chờ duyệt.", "SENT");
        AddNotification("DOCUMENT", 1, "current-user", "Tài liệu VB-001 đã sẵn sàng", "Phiên bản tài liệu đã được ghi nhận.", "READ");
        AddNotification("BORROW", 1, "current-user", "Phiếu mượn đang chờ xử lý", "Phiếu mượn mới được tạo.", "PENDING");

        _reportRuns.Add(new ReportRunDto(1, "GD2-10", "SUMMARY", "PDF", "report", "DEFAULT", "seed", "COMPLETED", 3, now.AddMinutes(-30)));
        _reportRuns.Add(new ReportRunDto(2, "GD2-10", "DIGITIZED", "EXCEL", "report", "DEFAULT", "seed", "COMPLETED", 1, now.AddMinutes(-12)));
        _reportRunSequence = 2;

        _reportConfigs.Add(new ReportConfigDto(1, "BC-TK-01", "Báo cáo thống kê hồ sơ", "SUMMARY", "report-summary.xlsx", "Nhập liệu hàng tháng", "ACTIVE", now.AddDays(-1)));
        _reportConfigSequence = 1;

        SeedIntegrations(now);
        _unitCustomizations["HN"] = BuildDefaultCustomization("HN", "Thanh pho Ha Noi", "system") with
        {
            BannerText = "Kho luu tru so Ha Noi",
            PrimaryColor = "#3264f4",
            AccentColor = "#16a34a",
            LayoutMode = "STANDARD",
            UpdatedAt = now.AddDays(-2)
        };
        _unitCustomizations["DN"] = BuildDefaultCustomization("DN", "Thanh pho Da Nang", "system") with
        {
            BannerText = "Trung tam dieu hanh tai lieu Da Nang",
            PrimaryColor = "#0f766e",
            AccentColor = "#f59e0b",
            LayoutMode = "COMPACT",
            WorkflowSteps = NormalizeUnitWorkflowSteps(DefaultUnitWorkflowSteps().Select(item => item.Code == "APPRAISE" ? item with { Enabled = false } : item).ToList()),
            UpdatedAt = now.AddDays(-1)
        };
        _sharedDossierTypes.Add(new Gd2SharedDossierTypeDto(++_sharedDossierTypeSequence, "HS-NS", "Ho so nhan su", "BAN1", "COMMON", "MASTER", ["BAN2"], now.AddDays(-3)));
        _sharedDossierTypes.Add(new Gd2SharedDossierTypeDto(++_sharedDossierTypeSequence, "HS-TC", "Ho so tai chinh", "BAN2", "COMMON", "MASTER", ["BAN1", "BAN3"], now.AddDays(-2)));
        _sharedDossierTypes.Add(new Gd2SharedDossierTypeDto(++_sharedDossierTypeSequence, "HS-HC", "Ho so hanh chinh", "BAN1", "UNIT", "MASTER", [], now.AddDays(-1)));
        SeedArchiveBorrow(now);

        _accessScopes.Add(new Gd2AccessScopeDto(++_accessScopeSequence, "ROLE", "LANH_DAO_DON_VI", "DEFAULT", "*", "LANH_DAO", "DOSSIER", "VIEW,APPROVE,EXPORT,SIGN,DOWNLOAD", "UNIT", "ACTIVE", now.AddDays(-2)));
        _accessScopes.Add(new Gd2AccessScopeDto(++_accessScopeSequence, "GROUP", "CHUYEN_VIEN_LUU_TRU", "DEFAULT", "HC", "CHUYEN_VIEN", "DOCUMENT", "VIEW,CREATE,EDIT,DOWNLOAD", "DEPARTMENT", "ACTIVE", now.AddDays(-1)));
        _accessScopes.Add(new Gd2AccessScopeDto(++_accessScopeSequence, "ROLE", "QTHT", "DEFAULT", "*", "QTHT", "SECURITY", "VIEW,CREATE,EDIT,DELETE,EXPORT", "ALL", "ACTIVE", now));

        _securityPolicies.Add(new Gd2SecurityPolicyDto("SEC-PII", "Ẩn dữ liệu nhạy cảm", "DATA_LOSS", "HIGH", "ACTIVE", "Che thông tin cá nhân khi người dùng không có quyền xem chi tiết."));
        _securityPolicies.Add(new Gd2SecurityPolicyDto("SEC-AUDIT", "Bắt buộc audit", "AUDIT", "HIGH", "ACTIVE", "Ghi log mọi thao tác xem, sửa, xuất, ký số và tải hồ sơ."));
        _securityPolicies.Add(new Gd2SecurityPolicyDto("SEC-SCOPE", "Kiểm soát phạm vi đơn vị", "ACCESS", "MEDIUM", "ACTIVE", "Người dùng chỉ được truy cập dữ liệu theo đơn vị, phòng ban, nhóm và cấp bậc."));

        AddWorkflowEvent("DOSSIER", 1, "SEED", null, "DRAFT", "Khởi tạo hồ sơ mẫu", "system", "DEFAULT");
        AddWorkflowEvent("DOSSIER", 2, "SEED", null, "PENDING", "Khởi tạo hồ sơ mẫu", "system", "DEFAULT");
        AddWorkflowEvent("DOSSIER", 3, "SEED", null, "APPROVED", "Khởi tạo hồ sơ mẫu", "system", "DEFAULT");
        AddWorkflowEvent("BORROW", 1, "SEED", null, "PENDING", "Khởi tạo phiếu mượn mẫu", "system", "DEFAULT");
    }

    private void SeedDocument(DocumentState document)
    {
        document.Versions.Add(new DocumentVersionDto(
            ++_documentVersionSequence,
            document.Id,
            document.NextVersionNumber,
            document.Code,
            document.Title,
            document.FileName,
            document.OcrStatus,
            document.Status,
            document.Description,
            "Khởi tạo phiên bản",
            "system",
            DateTime.UtcNow.AddDays(-7)));
        document.NextVersionNumber = 2;
        _documents[document.Id] = document;
    }

    private void SeedIntegrations(DateTime now)
    {
        _integrationSystems.Add(new Gd2IntegrationSystemDto("HRM", "Phan mem Nhan su HRM", "HRM", "https://hrm.example.local/api", "OAUTH2", "CONNECTED", "0 */2 * * *", now.AddMinutes(-18)));
        _integrationSystems.Add(new Gd2IntegrationSystemDto("ERP", "Tai chinh ERP/Core", "ERP", "https://erp.example.local/open-api", "JWT", "CONNECTED", "15 */1 * * *", now.AddMinutes(-42)));
        _integrationSystems.Add(new Gd2IntegrationSystemDto("VOFFICE", "Quan ly van ban VOffice/eOffice", "VOFFICE", "https://voffice.example.local/api", "API_KEY", "ERROR", "*/30 * * * *", now.AddHours(-3)));

        _apiKeys.Add(new Gd2ApiKeyDto(++_apiKeySequence, "HRM Sync Service", "HRM", "OAUTH2", "idp_hrm_******", "MASTER_DATA_SYNC,DOSSIER_READ", "ACTIVE", now.AddDays(-8), now.AddMinutes(-18)));
        _apiKeys.Add(new Gd2ApiKeyDto(++_apiKeySequence, "ERP Core Connector", "ERP", "JWT", "idp_erp_******", "DOSSIER_READ,DOCUMENT_WRITE", "ACTIVE", now.AddDays(-5), now.AddMinutes(-42)));
        _apiKeys.Add(new Gd2ApiKeyDto(++_apiKeySequence, "VOffice Webhook", "VOFFICE", "API_KEY", "idp_vof_******", "WEBHOOK_RETRY,DOCUMENT_WRITE", "ACTIVE", now.AddDays(-3), null));

        AddIntegrationLog("INBOUND", "VOFFICE", "/open-api/webhooks/voffice", "POST", 500, "ERROR", "{\"event\":\"DOCUMENT_SIGNED\"}", "Timeout from VOffice", null);
        AddIntegrationLog("OUTBOUND", "HRM", "/sync/department", "CRON", 200, "SUCCESS", "0 */2 * * *", "Synced 12 departments", null);
        AddIntegrationLog("OUTBOUND", "ERP", "/open-api/documents", "GET", 200, "SUCCESS", "page=1&pageSize=20", "Pulled 20 dossier metadata records", null);
    }

    private void SeedArchiveBorrow(DateTime now)
    {
        _archiveDossiers.Add(new Gd2ArchiveDossierDto(++_archiveDossierSequence, "KLT-001", "Ho so quyet dinh hanh chinh", "Hanh chinh", "Kho A / Ke 01 / Hop 03", "THUONG", "Duoc doc truc tuyen, tai ban mem va muon ban cung sau phe duyet.", true, true, true, 14, "ACTIVE", now.AddDays(-4)));
        _archiveDossiers.Add(new Gd2ArchiveDossierDto(++_archiveDossierSequence, "KLT-002", "Ho so hop dong tai chinh", "Tai chinh", "Kho B / Ke 02 / Hop 08", "MAT", "Chi khai thac khi co phe duyet lanh dao phong.", true, false, true, 7, "ACTIVE", now.AddDays(-3)));
        _archiveDossiers.Add(new Gd2ArchiveDossierDto(++_archiveDossierSequence, "KLT-003", "Ho so nhan su mat", "Nhan su", "Kho an toan / Ke 04", "TOI_MAT", "Chi doc truc tuyen co watermark, khong tai ban mem.", true, false, false, 3, "ACTIVE", now.AddDays(-2)));

        _borrowFlows.Add(new Gd2BorrowFlowDto(++_borrowFlowSequence, 1, "KLT-001", "Ho so quyet dinh hanh chinh", "nguyen.van.a", "ONLINE_READ", "PENDING", now.AddHours(-5), now.Date, now.Date.AddDays(1), null, null, null, null, "https://idp.dms.local/view/KLT-001", "Doc phuc vu xu ly cong van", false));
        _borrowFlows.Add(new Gd2BorrowFlowDto(++_borrowFlowSequence, 2, "KLT-002", "Ho so hop dong tai chinh", "tran.thi.b", "HARD_COPY", "BORROWED", now.AddDays(-8), now.Date.AddDays(-8), now.Date.AddDays(-1), now.AddDays(-8).AddHours(2), now.AddDays(-8).AddHours(3), null, "van-thu", null, "Doi chieu chung tu tai kho", true));
        _borrowFlows.Add(new Gd2BorrowFlowDto(++_borrowFlowSequence, 1, "KLT-001", "Ho so quyet dinh hanh chinh", "le.van.c", "SOFT_COPY", "RETURNED", now.AddDays(-6), now.Date.AddDays(-6), now.Date.AddDays(-4), now.AddDays(-6).AddHours(1), now.AddDays(-6).AddHours(2), now.AddDays(-4), "lanh-dao", "https://idp.dms.local/download/KLT-001?ticket=3", "Sao chep phuc vu bao cao", false));
        foreach (var request in _borrowFlows)
        {
            _borrowStatuses[request.Id] = request.Status;
        }
    }

    private sealed class DocumentState
    {
        public DocumentState(long id, long dossierId, string code, string title, string? fileName, string? ocrStatus, string? status, string? description)
        {
            Id = id;
            DossierId = dossierId;
            Code = code;
            Title = title;
            FileName = fileName;
            OcrStatus = ocrStatus;
            Status = status;
            Description = description;
        }

        public long Id { get; }
        public long DossierId { get; set; }
        public string Code { get; set; }
        public string Title { get; set; }
        public string? FileName { get; set; }
        public string? OcrStatus { get; set; }
        public string? Status { get; set; }
        public string? Description { get; set; }
        public List<DocumentVersionDto> Versions { get; } = [];
        public int NextVersionNumber { get; set; } = 1;
    }
}
