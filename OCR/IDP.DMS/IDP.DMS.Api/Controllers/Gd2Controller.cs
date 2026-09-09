using IDP.DMS.Api.Models;
using IDP.DMS.Api.Services;
using IDP.DMS.Api.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IDP.DMS.Api.Controllers
{
    [ApiController]
    [Route("api/dms/gd2")]
    [Authorize(Policy = AuthorizationPolicies.DmsAccess)]
    [Tags("GĐ2 Business")]
    public class Gd2Controller : ControllerBase
    {
        private readonly Gd2BusinessService _gd2Service;
        private readonly OracleDmsService _oracleService;
        private readonly OcrService _ocrService;
        private readonly IWebHostEnvironment _environment;

        public Gd2Controller(
            Gd2BusinessService gd2Service,
            OracleDmsService oracleService,
            OcrService ocrService,
            IWebHostEnvironment environment)
        {
            _gd2Service = gd2Service;
            _oracleService = oracleService;
            _ocrService = ocrService;
            _environment = environment;
        }

        [HttpGet("workflow/items")]
        public async Task<IActionResult> GetWorkflowItems()
        {
            return Ok(await _oracleService.GetWorkflowItemsAsync());
        }

        [HttpGet("workflow/definition")]
        public async Task<IActionResult> GetWorkflowDefinition()
        {
            return Ok(await _gd2Service.GetWorkflowDefinitionAsync());
        }

        [HttpGet("workflow/{entityType}/{entityId:long}/status")]
        public async Task<IActionResult> GetWorkflowStatus(string entityType, long entityId)
        {
            return Ok(await _oracleService.GetWorkflowStatusAsync(entityType, entityId));
        }

        [HttpGet("review-supplement/items")]
        public async Task<IActionResult> GetSupplementReviewItems()
        {
            return Ok(await _gd2Service.GetSupplementReviewItemsAsync());
        }

        [HttpGet("review-supplement/templates")]
        public async Task<IActionResult> GetSupplementTemplates()
        {
            return Ok(await _gd2Service.GetSupplementTemplatesAsync());
        }

        [HttpGet("review-supplement/guides")]
        public async Task<IActionResult> GetSupplementGuides([FromQuery] long? dossierId)
        {
            return Ok(await _gd2Service.GetSupplementGuidesAsync(dossierId));
        }

        [HttpPost("review-supplement/guides")]
        public async Task<IActionResult> CreateSupplementGuide([FromBody] SupplementGuideRequest request)
        {
            var guide = await _gd2Service.CreateSupplementGuideAsync(request);
            return Created($"/api/dms/gd2/review-supplement/guides/{guide.Id}", guide);
        }

        [HttpPost("workflow/transition")]
        public async Task<IActionResult> TransitionWorkflow([FromBody] WorkflowTransitionRequest request)
        {
            return Ok(await _oracleService.TransitionWorkflowAsync(request));
        }

        [HttpPost("workflow/test-draft")]
        public async Task<IActionResult> CreateWorkflowDraftSeed([FromQuery] long? storageId)
        {
            return Ok(await _oracleService.CreateWorkflowDraftSeedAsync(storageId));
        }

        [HttpGet("workflow/{entityType}/{entityId:long}/history")]
        public async Task<IActionResult> GetWorkflowHistory(string entityType, long entityId)
        {
            return Ok(await _oracleService.GetWorkflowHistoryAsync(entityType, entityId));
        }

        [HttpGet("documents/{documentId:long}/versions")]
        public async Task<IActionResult> GetDocumentVersions(long documentId)
        {
            return Ok(await _oracleService.GetDocumentVersionsAsync(documentId));
        }

        [HttpGet("documents/{documentId:long}/versions/timeline")]
        public async Task<IActionResult> GetDocumentVersionTimeline(long documentId)
        {
            return Ok(await _gd2Service.GetDocumentVersionTimelineAsync(documentId));
        }

        [HttpGet("documents/{documentId:long}/versions/compare")]
        public async Task<IActionResult> CompareDocumentVersions(long documentId, [FromQuery] long leftVersionId, [FromQuery] long rightVersionId)
        {
            return Ok(await _gd2Service.CompareDocumentVersionsAsync(documentId, leftVersionId, rightVersionId));
        }

        [HttpGet("documents/tree")]
        public async Task<IActionResult> GetDocumentTree()
        {
            return Ok(await _oracleService.GetDocumentTreeAsync());
        }

        [HttpGet("documents/search")]
        public async Task<IActionResult> SearchDocuments(
            [FromQuery] string? query,
            [FromQuery] string? metadata,
            [FromQuery] string? documentType,
            [FromQuery] string? status,
            [FromQuery] string? ocrStatus,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] long? dossierId,
            [FromQuery] long? storageId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var request = new Gd2DocumentSearchRequest(query, metadata, documentType, status, ocrStatus, fromDate, toDate, dossierId, storageId, page, pageSize);
            return Ok(await _oracleService.SearchDocumentsAsync(request));
        }

        [HttpPost("documents/{documentId:long}/publish")]
        public async Task<IActionResult> PublishDocument(long documentId, [FromBody] WorkflowTransitionRequest request)
        {
            return Ok(await _oracleService.PublishDocumentAsync(documentId, request));
        }

        [HttpPost("documents/{documentId:long}/index")]
        public async Task<IActionResult> IndexDocument(long documentId, [FromBody] WorkflowTransitionRequest request)
        {
            return Ok(await _oracleService.IndexDocumentAsync(documentId, request.Actor, request.UnitCode, request.Comment));
        }

        [HttpPost("documents/export")]
        public async Task<IActionResult> ExportDocuments([FromBody] Gd2DocumentExportRequest request)
        {
            return Ok(await _oracleService.ExportDocumentsAsync(request.Format, request.DocumentIds));
        }

        [HttpGet("documents/{documentId:long}/signatures")]
        public async Task<IActionResult> GetDocumentSignatures(long documentId)
        {
            return Ok(await _gd2Service.GetDocumentSignaturesAsync(documentId));
        }

        [HttpPost("documents/{documentId:long}/sign")]
        public async Task<IActionResult> SignDocument(long documentId, [FromBody] Gd2DigitalSignatureRequest request)
        {
            var resolved = request with { DocumentId = documentId };
            return Ok(await _gd2Service.SignDocumentAsync(resolved));
        }

        [HttpGet("documents/{documentId:long}/signatures/verify")]
        public async Task<IActionResult> VerifyDocumentSignature(long documentId)
        {
            return Ok(await _gd2Service.VerifyDocumentSignatureAsync(documentId));
        }

        [HttpGet("ocr/items")]
        public async Task<IActionResult> GetOcrItems([FromQuery] string? status)
        {
            return Ok(await _oracleService.GetOcrItemsAsync(status));
        }

        [HttpGet("ocr/summary")]
        public async Task<IActionResult> GetOcrSummary()
        {
            return Ok(await _oracleService.GetOcrSummaryAsync());
        }

        [HttpPost("ocr/documents/{documentId:long}/process")]
        public async Task<IActionResult> ProcessOcrDocument(long documentId, [FromBody] Gd2OcrProcessRequest request)
        {
            return Ok(await _oracleService.ProcessOcrAsync(documentId, request));
        }

        [HttpPost("ocr/documents/{documentId:long}/extract")]
        public async Task<IActionResult> ExtractOcrMetadata(long documentId, [FromBody] Gd2OcrProcessRequest request)
        {
            return Ok(await _oracleService.ExtractOcrMetadataAsync(documentId, request));
        }

        [HttpGet("ocr/documents/{documentId:long}/extraction")]
        public async Task<IActionResult> GetOcrExtraction(long documentId)
        {
            return Ok(await _oracleService.GetOcrExtractionAsync(documentId));
        }

        [HttpPost("ocr/documents/{documentId:long}/confirm")]
        public async Task<IActionResult> ConfirmOcrExtraction(long documentId, [FromBody] Gd2OcrConfirmationRequest request)
        {
            return Ok(await _oracleService.ConfirmOcrExtractionAsync(documentId, request));
        }

        [HttpPost("ocr/batch/process")]
        public async Task<IActionResult> ProcessOcrBatch([FromBody] Gd2OcrProcessRequest request)
        {
            return Ok(await _oracleService.ProcessOcrBatchAsync(request));
        }

        [HttpGet("integration/dashboard")]
        public async Task<IActionResult> GetIntegrationDashboard()
        {
            return Ok(await _gd2Service.GetIntegrationDashboardAsync());
        }

        [HttpPost("integration/api-keys")]
        public async Task<IActionResult> CreateIntegrationApiKey([FromBody] Gd2ApiKeyRequest request)
        {
            var apiKey = await _gd2Service.CreateApiKeyAsync(request);
            return Created($"/api/dms/gd2/integration/api-keys/{apiKey.Id}", apiKey);
        }

        [HttpPost("integration/webhooks")]
        public async Task<IActionResult> ReceiveIntegrationWebhook([FromBody] Gd2WebhookEventRequest request)
        {
            return Ok(await _gd2Service.ReceiveWebhookAsync(request));
        }

        [HttpPost("integration/open-api/documents")]
        public async Task<IActionResult> ReceiveExternalDocument([FromBody] Gd2WebhookEventRequest request)
        {
            return Ok(await _gd2Service.ReceiveExternalDocumentAsync(request));
        }

        [HttpGet("integration/open-api/documents")]
        public async Task<IActionResult> PullExternalDocuments([FromQuery] string? query, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            return Ok(await _oracleService.SearchDocumentsAsync(new Gd2DocumentSearchRequest(query, null, null, null, null, null, null, null, null, page, pageSize)));
        }

        [HttpPost("integration/sync-jobs/run")]
        public async Task<IActionResult> RunIntegrationSyncJob([FromBody] Gd2SyncJobRequest request)
        {
            return Ok(await _gd2Service.RunSyncJobAsync(request));
        }

        [HttpPost("integration/logs/{id:long}/retry")]
        public async Task<IActionResult> RetryIntegrationLog(long id)
        {
            return Ok(await _gd2Service.RetryIntegrationLogAsync(id));
        }

        [HttpGet("unit-customizations")]
        public async Task<IActionResult> GetUnitCustomizations()
        {
            return Ok(await _gd2Service.GetUnitCustomizationsAsync());
        }

        [HttpGet("unit-customizations/{unitCode}")]
        public async Task<IActionResult> GetUnitCustomization(string unitCode)
        {
            return Ok(await _gd2Service.GetUnitCustomizationAsync(unitCode));
        }

        [HttpPost("unit-customizations")]
        public async Task<IActionResult> SaveUnitCustomization([FromBody] Gd2UnitCustomizationRequest request)
        {
            return Ok(await _gd2Service.SaveUnitCustomizationAsync(request));
        }

        [HttpGet("shared-dossier-types")]
        public async Task<IActionResult> GetSharedDossierTypes([FromQuery] string? unitCode)
        {
            return Ok(await _gd2Service.GetSharedDossierTypesAsync(unitCode));
        }

        [HttpPost("shared-dossier-types/dedup-check")]
        public async Task<IActionResult> CheckSharedDossierTypeDuplicate([FromBody] Gd2DeduplicationCheckRequest request)
        {
            return Ok(await _gd2Service.CheckSharedDossierTypeDuplicateAsync(request));
        }

        [HttpPost("shared-dossier-types")]
        public async Task<IActionResult> CreateSharedDossierType([FromBody] Gd2SharedDossierTypeRequest request)
        {
            var record = await _gd2Service.CreateSharedDossierTypeAsync(request);
            return Created($"/api/dms/gd2/shared-dossier-types/{record.Id}", record);
        }

        [HttpPost("shared-dossier-types/share-access")]
        public async Task<IActionResult> ShareDossierTypeAccess([FromBody] Gd2ShareAccessRequest request)
        {
            return Ok(await _gd2Service.ShareDossierTypeAccessAsync(request));
        }

        [HttpGet("dossier-borrow/dashboard")]
        public async Task<IActionResult> GetDossierBorrowDashboard([FromQuery] string? status, [FromQuery] string? securityLevel, [FromQuery] string? exploitMode)
        {
            return Ok(await _oracleService.GetDossierBorrowDashboardAsync(status, securityLevel, exploitMode));
        }

        [HttpPost("archive-dossiers")]
        public async Task<IActionResult> SaveArchiveDossier([FromBody] Gd2ArchiveDossierRequest request)
        {
            return Ok(await _oracleService.SaveArchiveDossierAsync(request));
        }

        [HttpPost("borrow-requests")]
        public async Task<IActionResult> RegisterBorrow([FromBody] Gd2BorrowRegistrationRequest request)
        {
            var borrow = await _oracleService.RegisterBorrowAsync(request);
            return Created($"/api/dms/gd2/borrow-requests/{borrow.Id}", borrow);
        }

        [HttpPost("borrow-requests/{id:long}/approve")]
        public async Task<IActionResult> ApproveBorrow(long id, [FromBody] Gd2BorrowActionRequest request)
        {
            return Ok(await _oracleService.ApproveBorrowFlowAsync(id, request));
        }

        [HttpPost("borrow-requests/{id:long}/handover")]
        public async Task<IActionResult> HandoverBorrow(long id, [FromBody] Gd2BorrowActionRequest request)
        {
            return Ok(await _oracleService.HandoverBorrowFlowAsync(id, request));
        }

        [HttpPost("borrow-requests/{id:long}/return")]
        public async Task<IActionResult> ReturnBorrow(long id, [FromBody] Gd2BorrowActionRequest request)
        {
            return Ok(await _oracleService.ReturnBorrowFlowAsync(id, request));
        }

        [HttpPost("borrow-requests/{id:long}/recall")]
        public async Task<IActionResult> RecallBorrow(long id, [FromBody] Gd2BorrowActionRequest request)
        {
            return Ok(await _oracleService.RecallBorrowFlowAsync(id, request));
        }

        [HttpPost("documents/{documentId:long}/versions")]
        public async Task<IActionResult> CreateDocumentVersion(long documentId, [FromBody] DocumentVersionRequest request)
        {
            var version = await _oracleService.CreateDocumentVersionAsync(documentId, request);
            return Created($"/api/dms/gd2/documents/{documentId}/versions/{version.Id}", version);
        }

        [HttpPut("documents/{documentId:long}/review-content")]
        public async Task<IActionResult> UpdateReviewedDocumentContent(
            long documentId,
            [FromBody] DocumentReviewContentRequest request)
        {
            var document = await _oracleService.GetDocumentAsync(documentId);
            if (document is null) return NotFound();
            if (string.IsNullOrWhiteSpace(request.Description))
                return BadRequest("Nội dung OCR hiệu chỉnh không được để trống.");

            var reviewedPdfName = GenerateReviewedPdfFile(documentId, document, request.Description);
            var updated = await _oracleService.UpdateReviewedDocumentContentAsync(documentId, request);
            await _oracleService.UpdateDocumentFileOcrAsync(
                documentId,
                reviewedPdfName,
                updated.OcrStatus ?? "DONE",
                updated.Description ?? string.Empty);
            return Ok(await _oracleService.GetDocumentAsync(documentId));
        }

        /// <summary>
        /// Tạo file PDF đã hiệu chỉnh OCR vào thư mục uploads và trả về tên file.
        /// </summary>
        private string GenerateReviewedPdfFile(long documentId, DocumentDto document, string reviewedContent)
        {
            var uploadsFolder = Path.Combine(_environment.ContentRootPath, "uploads");
            Directory.CreateDirectory(uploadsFolder);
            var pdfName = $"{documentId}_ocr_review_{DateTime.UtcNow:yyyyMMddHHmmssfff}.pdf";
            var pdfPath = Path.Combine(uploadsFolder, pdfName);
            _ocrService.GenerateDigitizedPdf(new OcrPdfGenerationRequest(
                pdfPath,
                reviewedContent,
                document.Code,
                document.Title,
                document.FileName,
                "reviewed"));
            return pdfName;
        }

        [HttpPost("documents/{documentId:long}/versions/{versionId:long}/restore")]
        public async Task<IActionResult> RestoreDocumentVersion(
            long documentId,
            long versionId,
            [FromBody] RestoreDocumentVersionRequest request)
        {
            return Ok(await _oracleService.RestoreDocumentVersionAsync(documentId, versionId, request));
        }

        [HttpGet("reports/summary")]
        public async Task<IActionResult> GetReportSummary([FromQuery] string? dataType)
        {
            return Ok(await _oracleService.GetReportSummaryAsync(dataType));
        }

        [HttpGet("reports/executive-dashboard")]
        public async Task<IActionResult> GetExecutiveDashboard(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] string? department,
            [FromQuery] string? dossierType)
        {
            return Ok(await _oracleService.GetExecutiveDashboardAsync(fromDate, toDate, department, dossierType));
        }

        [HttpGet("reports/runs")]
        public async Task<IActionResult> GetReportRuns()
        {
            return Ok(await _oracleService.GetReportRunsAsync());
        }

        [HttpPost("reports/runs")]
        public async Task<IActionResult> CreateReportRun([FromBody] ReportRunRequest request)
        {
            var run = await _oracleService.LogReportRunAsync(request);
            return Created($"/api/dms/gd2/reports/runs/{run.Id}", run);
        }

        [HttpGet("reports/configurations")]
        public async Task<IActionResult> GetReportConfigurations()
        {
            return Ok(await _gd2Service.GetReportConfigsAsync());
        }

        [HttpPost("reports/configurations")]
        public async Task<IActionResult> SaveReportConfiguration([FromBody] ReportConfigRequest request)
        {
            return Ok(await _gd2Service.SaveReportConfigAsync(request));
        }

        [HttpGet("notifications")]
        public async Task<IActionResult> GetNotifications([FromQuery] string? recipient, [FromQuery] string? status)
        {
            return Ok(await _oracleService.GetNotificationsAsync(recipient, status));
        }

        [HttpPost("notifications/{id:long}/read")]
        public async Task<IActionResult> ReadNotification(long id)
        {
            return Ok(await _oracleService.MarkNotificationReadAsync(id));
        }

        [HttpPost("notifications/{id:long}/resend")]
        public async Task<IActionResult> ResendNotification(long id)
        {
            return Ok(await _oracleService.ResendNotificationAsync(id));
        }

        [HttpGet("system-data/summary")]
        public async Task<IActionResult> GetSystemDataSummary()
        {
            return Ok(await _oracleService.GetSystemDataSummaryAsync());
        }

        [HttpGet("overview")]
        public async Task<IActionResult> GetBusinessOverview()
        {
            return Ok(await _gd2Service.GetBusinessOverviewAsync());
        }

        [HttpGet("audit-logs")]
        public async Task<IActionResult> GetAuditLogs([FromQuery] string? action, [FromQuery] string? actor, [FromQuery] string? entityType)
        {
            return Ok(await _gd2Service.GetAuditLogsAsync(action, actor, entityType));
        }

        [HttpPost("audit-logs")]
        public async Task<IActionResult> CreateAuditLog([FromBody] Gd2AuditLogRequest request)
        {
            var log = await _gd2Service.LogAuditAsync(request);
            return Created($"/api/dms/gd2/audit-logs/{log.Id}", log);
        }

        [HttpGet("audit-dashboard")]
        public async Task<IActionResult> GetAuditDashboard()
        {
            return Ok(await _gd2Service.GetAuditDashboardAsync());
        }

        [HttpGet("access-scopes")]
        public async Task<IActionResult> GetAccessScopes([FromQuery] string? unitCode, [FromQuery] string? roleLevel)
        {
            return Ok(await _gd2Service.GetAccessScopesAsync(unitCode, roleLevel));
        }

        [HttpPost("access-scopes")]
        public async Task<IActionResult> SaveAccessScope([FromBody] Gd2AccessScopeRequest request)
        {
            return Ok(await _gd2Service.SaveAccessScopeAsync(request));
        }

        [HttpGet("security-policies")]
        public async Task<IActionResult> GetSecurityPolicies([FromQuery] string? category)
        {
            return Ok(await _gd2Service.GetSecurityPoliciesAsync(category));
        }

        [HttpGet("security-labels")]
        public async Task<IActionResult> GetSecurityLabels([FromQuery] string? entityType)
        {
            return Ok(await _gd2Service.GetSecurityLabelsAsync(entityType));
        }

        [HttpGet("security-labels/{entityType}/{entityId:long}")]
        public async Task<IActionResult> GetSecurityLabel(string entityType, long entityId)
        {
            return Ok(await _gd2Service.GetSecurityLabelAsync(entityType, entityId));
        }

        [HttpPost("security-labels")]
        public async Task<IActionResult> AssignSecurityLabel([FromBody] Gd2SecurityLabelRequest request)
        {
            return Ok(await _gd2Service.AssignSecurityLabelAsync(request));
        }

        [HttpGet("security/watermark")]
        public async Task<IActionResult> CreateWatermark(
            [FromQuery] string entityType,
            [FromQuery] long entityId,
            [FromQuery] string viewer = "current-user",
            [FromQuery] string? action = "VIEW_FILE")
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            return Ok(await _gd2Service.CreateWatermarkAsync(entityType, entityId, viewer, ip, action));
        }
    }
}
