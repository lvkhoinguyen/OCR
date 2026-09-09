const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
const accessTokenKey = "idp.dms.accessToken";
const refreshTokenKey = "idp.dms.refreshToken";
const authUserKey = "idp.dms.user";
let refreshPromise = null;

function readStoredJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(accessTokenKey, session.accessToken);
  localStorage.setItem(refreshTokenKey, session.refreshToken);
  localStorage.setItem(authUserKey, JSON.stringify(session.user));
}

function clearSession(notify = true) {
  localStorage.removeItem(accessTokenKey);
  localStorage.removeItem(refreshTokenKey);
  localStorage.removeItem(authUserKey);
  if (notify) window.dispatchEvent(new CustomEvent("auth:unauthorized"));
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(refreshTokenKey);
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Không thể làm mới phiên đăng nhập.");
        const session = await response.json();
        saveSession(session);
        return session.accessToken;
      })
      .catch(() => {
        clearSession();
        return null;
      })
      .finally(() => { refreshPromise = null; });
  }

  return refreshPromise;
}

async function request(path, options = {}) {
  const { expectJson = true, responseType = "json", retryUnauthorized = true, skipAuth = false, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers ?? {});
  const accessToken = localStorage.getItem(accessTokenKey);
  if (!skipAuth && accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${baseUrl}${path}`, { ...fetchOptions, headers });
  if (response.status === 401 && !skipAuth) {
    if (retryUnauthorized && !path.startsWith("/api/auth/")) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) return request(path, { ...options, retryUnauthorized: false });
    }
    clearSession();
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    let detail = body;
    try {
      const parsed = JSON.parse(body);
      detail = parsed.message ?? parsed.detail ?? parsed.error ?? parsed.title ?? body;
    } catch {
      // API có thể trả plain text.
    }
    if ((!detail || !detail.trim()) && (response.status === 500 || response.status === 502 || response.status === 503)) {
      detail = "Không thể kết nối tới Backend API (port 5103). Vui lòng kiểm tra xem Backend .NET đã được khởi động chưa.";
    }
    throw new Error(detail || `API ${path} failed with ${response.status}`);
  }

  if (!expectJson || response.status === 204) {
    return null;
  }

  if (responseType === "blob") {
    return response.blob();
  }

  if (responseType === "blobWithMetadata") {
    return {
      blob: await response.blob(),
      page: Number(response.headers.get("X-OCR-Page") || 1),
      pageCount: Number(response.headers.get("X-OCR-Page-Count") || 1),
      width: Number(response.headers.get("X-OCR-Image-Width") || 0),
      height: Number(response.headers.get("X-OCR-Image-Height") || 0),
      sourceFileName: decodeURIComponent(response.headers.get("X-OCR-Source-File") || ""),
    };
  }

  return response.json();
}

function uploadFormData(path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${baseUrl}${path}`);
    const accessToken = localStorage.getItem(accessTokenKey);
    if (accessToken) xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round(event.loaded * 100 / event.total));
    };
    xhr.onerror = () => reject(new Error("Không thể kết nối API để tải gói import."));
    xhr.onload = () => {
      if (xhr.status === 401) clearSession();
      let payload = null;
      try { payload = xhr.responseText ? JSON.parse(xhr.responseText) : null; }
      catch { payload = xhr.responseText; }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
        return;
      }
      reject(new Error(payload?.message ?? payload?.detail ?? payload?.error ?? payload ?? `API ${path} failed with ${xhr.status}`));
    };
    xhr.send(formData);
  });
}

export const uiApi = {
  auth: {
    configuration: () => request("/api/auth/configuration", { skipAuth: true }),
    login: async (username, password) => {
      const session = await request("/api/auth/login", {
        ...jsonOptions("POST", { username, password }),
        skipAuth: true
      });
      saveSession(session);
      return session;
    },
    register: (payload) => request("/api/auth/register", jsonOptions("POST", payload)),
    me: () => request("/api/auth/me"),
    changePassword: (currentPassword, newPassword) =>
      request("/api/auth/change-password", jsonOptions("POST", { currentPassword, newPassword })),
    logout: async () => {
      try {
        await request("/api/auth/logout", jsonOptions("POST", {
          refreshToken: localStorage.getItem(refreshTokenKey)
        }, false));
      } finally {
        clearSession(false);
      }
    },
    session: () => {
      const accessToken = localStorage.getItem(accessTokenKey);
      if (!accessToken) return null;
      return {
        accessToken,
        refreshToken: localStorage.getItem(refreshTokenKey),
        user: readStoredJson(authUserKey)
      };
    },
    updateStoredUser: (user) => localStorage.setItem(authUserKey, JSON.stringify(user)),
    clear: () => clearSession(false)
  },
  summary: () => request("/api/ui/summary"),
  menu: () => request("/api/ui/menu"),
  initializeDb: () => request("/api/dms/initialize", { method: "POST" }),
  // GD2 chỉ sử dụng Gemini; không nhận engine từ giao diện để tránh gọi nhầm model.
  extractOcr: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/api/ocr/extract?engine=gemini", {
      method: "POST",
      body: formData
    });
  },
  ocr: {
    process: (documentId, engine = "gemini", file = null) => {
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        if (documentId) formData.append("documentId", String(documentId));
        if (engine) formData.append("engine", engine);
        return request("/api/ocr/process", { method: "POST", body: formData });
      }
      const params = new URLSearchParams();
      if (documentId) params.set("documentId", String(documentId));
      if (engine) params.set("engine", engine);
      return request(`/api/ocr/process?${params.toString()}`, { method: "POST" });
    },
    confirm: (payload) =>
      request("/api/ocr/confirm", jsonOptions("POST", payload))
  },
  features: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const query = params.toString();
    return request(`/api/ui/features${query ? `?${query}` : ""}`);
  },
  screen: (featureId) => request(`/api/ui/features/${encodeURIComponent(featureId)}/screen`),
  gd2: {
    transition: async (payload) => {
      const res = await request("/api/dms/gd2/workflow/transition", jsonOptions("POST", payload));
      if (payload?.action === "APPROVE") {
        try {
          const approvedList = JSON.parse(localStorage.getItem("idp.dms.approvedList") || "[]");
          if (payload.entityId) approvedList.push(String(payload.entityId));
          if (payload.recipient) approvedList.push(String(payload.recipient));
          localStorage.setItem("idp.dms.approvedList", JSON.stringify([...new Set(approvedList)]));
          window.dispatchEvent(new CustomEvent("dms:dossier-approved", { detail: payload }));
        } catch {}
      }
      return res;
    },
    createWorkflowDraftSeed: (storageId = "") =>
      request(`/api/dms/gd2/workflow/test-draft${storageId ? `?storageId=${encodeURIComponent(storageId)}` : ""}`, jsonOptions("POST", {})),
    workflowItems: () => request("/api/dms/gd2/workflow/items"),
    workflowDefinition: () => request("/api/dms/gd2/workflow/definition"),
    workflowStatus: (entityType, entityId) =>
      request(`/api/dms/gd2/workflow/${encodeURIComponent(entityType)}/${entityId}/status`),
    workflowHistory: (entityType, entityId) =>
      request(`/api/dms/gd2/workflow/${encodeURIComponent(entityType)}/${entityId}/history`),
    documentTree: () => request("/api/dms/gd2/documents/tree"),
    documentSearch: (filters = {}) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") params.set(key, value);
      });
      const query = params.toString();
      return request(`/api/dms/gd2/documents/search${query ? `?${query}` : ""}`);
    },
    publishDocument: (documentId, payload) =>
      request(`/api/dms/gd2/documents/${documentId}/publish`, jsonOptions("POST", payload)),
    indexDocument: (documentId, payload) =>
      request(`/api/dms/gd2/documents/${documentId}/index`, jsonOptions("POST", payload)),
    exportDocuments: (payload) => request("/api/dms/gd2/documents/export", jsonOptions("POST", payload)),
    documentSignatures: (documentId) => request(`/api/dms/gd2/documents/${documentId}/signatures`),
    signDocument: (documentId, payload) =>
      request(`/api/dms/gd2/documents/${documentId}/sign`, jsonOptions("POST", payload)),
    verifyDocumentSignature: (documentId) =>
      request(`/api/dms/gd2/documents/${documentId}/signatures/verify`),
    pdfSignatures: (documentId) => request(`/api/dms/documents/${documentId}/signatures`),
    documentPdfBlob: (documentId, type = "digitized") =>
      request(`/api/dms/documents/${documentId}/file?type=${type}`, { responseType: "blob" }),
    documentFileUrl: (documentId, type = "digitized") =>
      `${baseUrl}/api/dms/documents/${documentId}/file?type=${type}`,
    uploadAndDigitize: (storageId, file) => {
      const formData = new FormData();
      formData.append("storageId", storageId);
      formData.append("file", file);
      return request("/api/dms/documents/upload-and-digitize", { method: "POST", body: formData });
    },
    pendingReviewDocuments: () =>
      request("/api/dms/documents/pending-review"),
    digitizeDocumentDetail: (documentId) =>
      request(`/api/dms/documents/${documentId}/detail`),
    updateReviewContent: (documentId, payload) =>
      request(`/api/dms/documents/${documentId}/review-content`, jsonOptions("PUT", payload)),
    approveDigitizeDocument: async (documentId, payload) => {
      const res = await request(`/api/dms/documents/${documentId}/approve`, jsonOptions("POST", payload));
      try {
        const approvedList = JSON.parse(localStorage.getItem("idp.dms.approvedList") || "[]");
        approvedList.push(String(documentId));
        localStorage.setItem("idp.dms.approvedList", JSON.stringify([...new Set(approvedList)]));
        window.dispatchEvent(new CustomEvent("dms:dossier-approved", { detail: { documentId } }));
      } catch {}
      return res;
    },
    rejectDigitizeDocument: (documentId, payload) =>
      request(`/api/dms/documents/${documentId}/reject`, jsonOptions("POST", payload)),
    signPdf: (documentId, payload) => {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") formData.append(key, String(value));
      });
      return request(`/api/dms/documents/${documentId}/sign-pdf`, { method: "POST", body: formData });
    },
    ocrItems: (status = "") =>
      request(`/api/dms/gd2/ocr/items${status ? `?status=${encodeURIComponent(status)}` : ""}`),
    ocrSummary: () => request("/api/dms/gd2/ocr/summary"),
    processOcr: (documentId, payload = {}) =>
      request(`/api/dms/gd2/ocr/documents/${documentId}/process`, jsonOptions("POST", { ...payload, engine: "gemini" })),
    processOcrPdf: (documentId, file, engine = "gemini", unitCode = "DEFAULT") => {
      const formData = new FormData();
      formData.append("file", file);
      const params = new URLSearchParams();
      if (engine) params.set("engine", engine);
      if (unitCode) params.set("unitCode", unitCode);
      return request(`/api/dms/documents/${documentId}/ocr-pdf?${params.toString()}`, { method: "POST", body: formData });
    },
    processExistingOcr: (documentId, engine = "gemini", unitCode = "DEFAULT") => {
      const params = new URLSearchParams();
      if (engine) params.set("engine", engine);
      if (unitCode) params.set("unitCode", unitCode);
      return request(`/api/dms/documents/${documentId}/ocr-existing?${params.toString()}`, { method: "POST" });
    },
    digitizeDocumentMetadata: (documentId, unitCode = "DEFAULT") =>
      request(`/api/dms/documents/${documentId}/digitize-metadata?unitCode=${encodeURIComponent(unitCode)}`, { method: "POST" }),
    ocrZonePreview: (documentId, page = 1) =>
      request(`/api/dms/documents/${documentId}/ocr-preview?page=${encodeURIComponent(page)}`, { responseType: "blobWithMetadata" }),
    extractOcrZones: (documentId, payload) =>
      request(`/api/dms/documents/${documentId}/ocr-zones`, jsonOptions("POST", payload)),
    extractOcrMetadata: (documentId, payload = {}) =>
      request(`/api/dms/gd2/ocr/documents/${documentId}/extract`, jsonOptions("POST", { ...payload, engine: "gemini" })),
    ocrExtraction: (documentId) =>
      request(`/api/dms/gd2/ocr/documents/${documentId}/extraction`),
    confirmOcrExtraction: (documentId, payload) =>
      request(`/api/dms/gd2/ocr/documents/${documentId}/confirm`, jsonOptions("POST", payload)),
    processOcrBatch: (payload) =>
      request("/api/dms/gd2/ocr/batch/process", jsonOptions("POST", payload)),
    integrationDashboard: () => request("/api/dms/gd2/integration/dashboard"),
    createIntegrationApiKey: (payload) =>
      request("/api/dms/gd2/integration/api-keys", jsonOptions("POST", payload)),
    receiveIntegrationWebhook: (payload) =>
      request("/api/dms/gd2/integration/webhooks", jsonOptions("POST", payload)),
    pushIntegrationDocument: (payload) =>
      request("/api/dms/gd2/integration/open-api/documents", jsonOptions("POST", payload)),
    runIntegrationSync: (payload) =>
      request("/api/dms/gd2/integration/sync-jobs/run", jsonOptions("POST", payload)),
    retryIntegrationLog: (id) =>
      request(`/api/dms/gd2/integration/logs/${id}/retry`, { method: "POST" }),
    unitCustomizations: () => request("/api/dms/gd2/unit-customizations"),
    unitCustomization: (unitCode) => request(`/api/dms/gd2/unit-customizations/${encodeURIComponent(unitCode)}`),
    saveUnitCustomization: (payload) =>
      request("/api/dms/gd2/unit-customizations", jsonOptions("POST", payload)),
    sharedDossierTypes: (unitCode = "") =>
      request(`/api/dms/gd2/shared-dossier-types${unitCode ? `?unitCode=${encodeURIComponent(unitCode)}` : ""}`),
    checkSharedDossierTypeDuplicate: (payload) =>
      request("/api/dms/gd2/shared-dossier-types/dedup-check", jsonOptions("POST", payload)),
    createSharedDossierType: (payload) =>
      request("/api/dms/gd2/shared-dossier-types", jsonOptions("POST", payload)),
    shareDossierTypeAccess: (payload) =>
      request("/api/dms/gd2/shared-dossier-types/share-access", jsonOptions("POST", payload)),
    dossierBorrowDashboard: (filters = {}) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") params.set(key, value);
      });
      const query = params.toString();
      return request(`/api/dms/gd2/dossier-borrow/dashboard${query ? `?${query}` : ""}`);
    },
    saveArchiveDossier: (payload) =>
      request("/api/dms/gd2/archive-dossiers", jsonOptions("POST", payload)),
    registerBorrow: (payload) =>
      request("/api/dms/gd2/borrow-requests", jsonOptions("POST", payload)),
    approveBorrow: (id, payload) =>
      request(`/api/dms/gd2/borrow-requests/${id}/approve`, jsonOptions("POST", payload)),
    handoverBorrow: (id, payload) =>
      request(`/api/dms/gd2/borrow-requests/${id}/handover`, jsonOptions("POST", payload)),
    returnBorrow: (id, payload) =>
      request(`/api/dms/gd2/borrow-requests/${id}/return`, jsonOptions("POST", payload)),
    recallBorrow: (id, payload) =>
      request(`/api/dms/gd2/borrow-requests/${id}/recall`, jsonOptions("POST", payload)),
    documentVersions: (documentId) => request(`/api/dms/gd2/documents/${documentId}/versions`),
    documentVersionTimeline: (documentId) =>
      request(`/api/dms/gd2/documents/${documentId}/versions/timeline`),
    compareDocumentVersions: (documentId, leftVersionId, rightVersionId) =>
      request(`/api/dms/gd2/documents/${documentId}/versions/compare?leftVersionId=${leftVersionId}&rightVersionId=${rightVersionId}`),
    createDocumentVersion: (documentId, payload) =>
      request(`/api/dms/gd2/documents/${documentId}/versions`, jsonOptions("POST", payload)),
    saveReviewedDocumentContent: (documentId, payload) =>
      request(`/api/dms/gd2/documents/${documentId}/review-content`, jsonOptions("PUT", payload)),
    restoreDocumentVersion: (documentId, versionId, payload) =>
      request(`/api/dms/gd2/documents/${documentId}/versions/${versionId}/restore`, jsonOptions("POST", payload)),
    reportSummary: (dataType = "") =>
      request(`/api/dms/gd2/reports/summary${dataType ? `?dataType=${encodeURIComponent(dataType)}` : ""}`),
    executiveDashboard: (filters = {}) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") params.set(key, value);
      });
      const query = params.toString();
      return request(`/api/dms/gd2/reports/executive-dashboard${query ? `?${query}` : ""}`);
    },
    reportRuns: () => request("/api/dms/gd2/reports/runs"),
    logReportRun: (payload) => request("/api/dms/gd2/reports/runs", jsonOptions("POST", payload)),
    saveReportConfig: (payload) => request("/api/dms/gd2/reports/configurations", jsonOptions("POST", payload)),
    notifications: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.recipient) params.set("recipient", filters.recipient);
      if (filters.status) params.set("status", filters.status);
      const query = params.toString();
      return request(`/api/dms/gd2/notifications${query ? `?${query}` : ""}`);
    },
    supplementReviewItems: () => request("/api/dms/gd2/review-supplement/items"),
    supplementTemplates: () => request("/api/dms/gd2/review-supplement/templates"),
    supplementGuides: (dossierId = "") =>
      request(`/api/dms/gd2/review-supplement/guides${dossierId ? `?dossierId=${dossierId}` : ""}`),
    createSupplementGuide: (payload) =>
      request("/api/dms/gd2/review-supplement/guides", jsonOptions("POST", payload)),
    markNotificationRead: (id) =>
      request(`/api/dms/gd2/notifications/${id}/read`, { method: "POST" }),
    resendNotification: (id) =>
      request(`/api/dms/gd2/notifications/${id}/resend`, { method: "POST" }),
    systemDataSummary: () => request("/api/dms/gd2/system-data/summary"),
    overview: () => request("/api/dms/gd2/overview"),
    auditLogs: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.action) params.set("action", filters.action);
      if (filters.actor) params.set("actor", filters.actor);
      if (filters.entityType) params.set("entityType", filters.entityType);
      const query = params.toString();
      return request(`/api/dms/gd2/audit-logs${query ? `?${query}` : ""}`);
    },
    logAudit: (payload) => request("/api/dms/gd2/audit-logs", jsonOptions("POST", payload)),
    accessScopes: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.unitCode) params.set("unitCode", filters.unitCode);
      if (filters.roleLevel) params.set("roleLevel", filters.roleLevel);
      const query = params.toString();
      return request(`/api/dms/gd2/access-scopes${query ? `?${query}` : ""}`);
    },
    saveAccessScope: (payload) => request("/api/dms/gd2/access-scopes", jsonOptions("POST", payload)),
    securityPolicies: (category = "") =>
      request(`/api/dms/gd2/security-policies${category ? `?category=${encodeURIComponent(category)}` : ""}`),
    auditDashboard: () => request("/api/dms/gd2/audit-dashboard"),
    securityLabels: (entityType = "") =>
      request(`/api/dms/gd2/security-labels${entityType ? `?entityType=${encodeURIComponent(entityType)}` : ""}`),
    securityLabel: (entityType, entityId) =>
      request(`/api/dms/gd2/security-labels/${encodeURIComponent(entityType)}/${entityId}`),
    saveSecurityLabel: (payload) => request("/api/dms/gd2/security-labels", jsonOptions("POST", payload)),
    watermark: (params = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") query.set(key, value);
      });
      return request(`/api/dms/gd2/security/watermark?${query.toString()}`);
    }
  },
  dms: {
    workflowItems: () => uiApi.crud("dossiers").list(),
    transition: (payload) => request("/api/dms/gd2/workflow/transition", jsonOptions("POST", payload)),
    workflowHistory: (entityType, entityId) =>
      request(`/api/dms/gd2/workflow/${encodeURIComponent(entityType)}/${entityId}/history`),
    batchImportTemplate: () => request("/api/dms/dossiers/batch-import-template", { responseType: "blob" }),
    batchImportZip: (excelFile, zipFile, ocrEngine = "vietocr", onProgress) => {
      const formData = new FormData();
      formData.append("DanhMucHoSo", excelFile);
      formData.append("TaiLieu", zipFile);
      formData.append("OcrEngine", ocrEngine);
      return uploadFormData("/api/dms/dossiers/batch-import-zip", formData, onProgress);
    },
    batchImportJob: (jobId) => request(`/api/dms/dossiers/batch-import-jobs/${jobId}`),
    batchImportJobs: (take = 20) => request(`/api/dms/dossiers/batch-import-jobs?take=${encodeURIComponent(take)}`)
  },
  borrowRequests: (status = "") => {
    const params = status ? `?status=${encodeURIComponent(status)}` : "";
    return request(`/api/dms/borrow-requests${params}`);
  },
  createBorrow: (payload) => request("/api/dms/borrow-requests", jsonOptions("POST", payload)),
  approveBorrow: (id, payload) =>
    request(`/api/dms/borrow-requests/${id}/approve`, jsonOptions("POST", payload)),
  returnBorrow: (id, payload) =>
    request(`/api/dms/gd2/borrow-requests/${id}/return`, jsonOptions("POST", payload)),
  recallBorrow: (id, payload) =>
    request(`/api/dms/gd2/borrow-requests/${id}/recall`, jsonOptions("POST", payload)),
  autoGenerateStorage: (payload) => request("/api/dms/storage-locations/auto-generate", jsonOptions("POST", payload)),
  crud: (type) => {
    const paths = {
      storage: "/api/dms/storage-locations",
      dossiers: "/api/dms/dossiers",
      documents: "/api/dms/documents",
      borrow: "/api/dms/borrow-requests"
    };
    const path = paths[type] ?? `/api/dms/resources/${type}`;
    return {
      list: () => request(path),
      create: (payload) => request(path, jsonOptions("POST", payload)),
      update: (id, payload) => request(`${path}/${id}`, jsonOptions("PUT", payload, false)),
      remove: (id) => request(`${path}/${id}`, { method: "DELETE", expectJson: false }),
      autoGenerate: (payload) => request("/api/dms/storage-locations/auto-generate", jsonOptions("POST", payload)),
      upload: (id, file, engine = 'easyocr', unitCode = "DEFAULT") => {
        const formData = new FormData();
        formData.append("file", file);
        const params = new URLSearchParams();
        if (engine) params.set("engine", engine);
        if (unitCode) params.set("unitCode", unitCode);
        const query = params.toString();
        return request(`${path}/${id}/upload${query ? `?${query}` : ""}`, { method: "POST", body: formData });
      },
      quickUpload: (payload) => {
        const formData = new FormData();
        formData.append("storageId", payload.storageId);
        if (payload.file) formData.append("file", payload.file);
        if (payload.title) formData.append("title", payload.title);
        if (payload.documentType) formData.append("documentType", payload.documentType);
        if (payload.dossierType) formData.append("dossierType", payload.dossierType);
        if (payload.status) formData.append("status", payload.status);
        if (payload.fromDate) formData.append("fromDate", payload.fromDate);
        if (payload.toDate) formData.append("toDate", payload.toDate);
        if (payload.description) formData.append("description", payload.description);
        if (payload.engine) formData.append("engine", payload.engine);
        if (payload.unitCode) formData.append("unitCode", payload.unitCode);
        return request("/api/dms/documents/quick-upload", { method: "POST", body: formData });
      },
      uploadPolicy: (unitCode = "DEFAULT") =>
        request(`/api/dms/documents/upload-policy?unitCode=${encodeURIComponent(unitCode)}`)
    };
  }
};

function jsonOptions(method, payload, expectJson = true) {
  return {
    method,
    expectJson,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  };
}

function normalizeWorkflowStatus(status) {
  return String(status ?? "DRAFT").trim().toUpperCase();
}

function resolveDossierWorkflowStatus(currentStatus, action) {
  const nextStatusMap = {
    "DRAFT:FORWARD": "PENDING",
    "DRAFT:SUBMIT": "PENDING",
    "DRAFT:APPROVE": "APPROVED",
    "DRAFT:REQUEST_SUPPLEMENT": "NEEDS_SUPPLEMENT",
    "PENDING:FORWARD": "PENDING",
    "PENDING:APPROVE": "APPROVED",
    "PENDING:REQUEST_SUPPLEMENT": "NEEDS_SUPPLEMENT",
    "PENDING:REJECT": "REJECTED",
    "NEEDS_SUPPLEMENT:FORWARD": "PENDING",
    "NEEDS_SUPPLEMENT:RESUBMIT": "PENDING",
    "APPROVED:SIGN": "PUBLISHED",
    "APPROVED:CONFIRM": "CONFIRMED",
    "APPROVED:REQUEST_SUPPLEMENT": "NEEDS_SUPPLEMENT",
    "APPROVED:REJECT": "REJECTED",
    "PUBLISHED:CONFIRM": "CONFIRMED",
    "PUBLISHED:REQUEST_SUPPLEMENT": "NEEDS_SUPPLEMENT"
  };

  const normalizedCurrentStatus = normalizeWorkflowStatus(currentStatus);
  const normalizedAction = String(action ?? "").trim().toUpperCase();
  const nextStatus = nextStatusMap[`${normalizedCurrentStatus}:${normalizedAction}`];
  if (!nextStatus) {
    throw new Error(`Hành động '${action}' không hợp lệ cho trạng thái '${normalizedCurrentStatus}'.`);
  }

  return nextStatus;
}

function buildDossierUpdatePayload(source, status) {
  return {
    code: source.code ?? "",
    title: source.title ?? "",
    dossierType: source.dossierType ?? null,
    storageId: source.storageId ?? null,
    status,
    fromDate: source.fromDate ?? null,
    toDate: source.toDate ?? null,
    description: source.description ?? null
  };
}
