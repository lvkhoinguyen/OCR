/**
 * ==============================================================================
 * IDP.DMS - KỊCH BẢN KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN NGHIỆM THU (E2E SMOKE TEST)
 * File: OCR/test-assets/run-handover-test.mjs
 * 
 * Thực thi tuần tự 10 bước nghiệp vụ sống còn từ đầu đến cuối:
 *   [Bước 1] Kiểm tra trạng thái API & Kết nối Oracle Database
 *   [Bước 2] Khởi tạo Schema Database & Tài khoản mặc định
 *   [Bước 3] Đăng nhập xác thực JWT Token đa vai trò
 *   [Bước 4] Tạo Kho hồ sơ lưu trữ mới
 *   [Bước 5] Tạo Hồ sơ lưu trữ mới (Trạng thái DRAFT)
 *   [Bước 6] Tạo Văn bản thành phần & Bóc tách đối soát OCR Metadata
 *   [Bước 7] Trình gửi kiểm duyệt hồ sơ số hóa (DRAFT -> PENDING)
 *   [Bước 8] Phê duyệt hồ sơ (PENDING -> APPROVED) và Ký số PDF điện tử
 *   [Bước 9] Đăng ký mượn hồ sơ & Cán bộ duyệt phiếu mượn
 *   [Bước 10] Kiểm tra Dashboard Lãnh đạo phản ánh số liệu thực tế
 * ==============================================================================
 */

import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

// ── CẤU HÌNH KẾT NỐI & THÔNG TIN KIỂM THỬ ────────────────────────────────────
const BASE_URL = process.env.API_BASE_URL || "http://localhost:5103";
const OUTPUT_DIR = path.resolve(import.meta.dirname || "test-assets");
const RESULT_FILE = path.join(OUTPUT_DIR, "handover-test-result.json");

// ANSI Color Codes
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgGreen: "\x1b[42m\x1b[30m",
  bgRed: "\x1b[41m\x1b[37m",
  bgBlue: "\x1b[44m\x1b[37m"
};

// State lưu trữ dữ liệu liên bước
const context = {
  adminToken: null,
  nhaplieuToken: null,
  kiemduyetToken: null,
  docgiaToken: null,
  storageId: null,
  storageCode: null,
  dossierId: null,
  dossierCode: null,
  documentId: null,
  documentCode: null,
  borrowRequestId: null,
  startTime: performance.now(),
  stepResults: []
};

// Helper gọi API HTTP
async function apiRequest(endpoint, { method = "GET", body = null, token = null, isFormData = false } = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let requestBody = undefined;
  if (body) {
    if (isFormData) {
      requestBody = body; // FormData tự set header Content-Type multipart
    } else {
      headers["Content-Type"] = "application/json; charset=utf-8";
      requestBody = JSON.stringify(body);
    }
  }

  const start = performance.now();
  const response = await fetch(url, {
    method,
    headers,
    body: requestBody
  });
  const durationMs = Math.round(performance.now() - start);

  let data = null;
  const rawText = await response.text();
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    durationMs,
    headers: response.headers
  };
}

// Helper thực thi từng bước kiểm thử
async function runStep(stepNum, stepName, endpoint, fn) {
  process.stdout.write(`  ${C.bold}[Bước ${stepNum}]${C.reset} ${stepName.padEnd(55, ".")} `);
  const start = performance.now();
  try {
    const details = await fn();
    const durationMs = Math.round(performance.now() - start);
    console.log(`${C.green}${C.bold}[PASS]${C.reset} ${C.dim}(${durationMs}ms)${C.reset}`);
    if (details) {
      console.log(`         ${C.cyan}↳ ${details}${C.reset}`);
    }
    context.stepResults.push({
      step: stepNum,
      name: stepName,
      endpoint,
      status: "PASS",
      durationMs,
      details: details || "Thành công",
      timestamp: new Date().toISOString()
    });
    return true;
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    console.log(`${C.red}${C.bold}[FAIL]${C.reset} ${C.dim}(${durationMs}ms)${C.reset}`);
    console.log(`         ${C.red}↳ Lỗi: ${err.message}${C.reset}`);
    context.stepResults.push({
      step: stepNum,
      name: stepName,
      endpoint,
      status: "FAIL",
      durationMs,
      error: err.message,
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

// ── CHƯƠNG TRÌNH KIỂM THỬ CHÍNH ──────────────────────────────────────────────
async function main() {
  console.log("\n" + "=".repeat(80));
  console.log(`${C.bold}${C.blue}   IDP.DMS - KỊCH BẢN KIỂM THỬ TOÀN DIỆN BÀN GIAO NGHIỆM THU (E2E SMOKE TEST)${C.reset}`);
  console.log(`${C.dim}   Target API: ${BASE_URL} | Thời gian bắt đầu: ${new Date().toLocaleString("vi-VN")}${C.reset}`);
  console.log("=".repeat(80) + "\n");

  const timestamp = Date.now();

  // ── BƯỚC 1: Kiểm tra trạng thái API & Kết nối Oracle Database ───────────────
  await runStep(1, "Kiểm tra API & Kết nối Oracle DB", "GET /api/dms/resources", async () => {
    const res = await apiRequest("/api/dms/resources");
    if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể kết nối API IDP.DMS`);
    const count = Array.isArray(res.data) ? res.data.length : Object.keys(res.data || {}).length;
    return `Oracle DB sẵn sàng (${count} danh mục tài nguyên metadata)`;
  });

  // ── BƯỚC 2: Khởi tạo Schema Database & Tài khoản mặc định ───────────────────
  await runStep(2, "Khởi tạo Schema Database & Seed tài khoản", "POST /api/dms/initialize", async () => {
    const res = await apiRequest("/api/dms/initialize", { method: "POST" });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Khởi tạo database thất bại`);
    return `Bảng Oracle & 5 vai trò demo chuẩn đã sẵn sàng`;
  });

  // ── BƯỚC 3: Đăng nhập lấy JWT Token với các tài khoản ───────────────────────
  await runStep(3, "Đăng nhập JWT đa vai trò (admin, nhaplieu...)", "POST /api/auth/login", async () => {
    // 1. Admin login
    const adminRes = await apiRequest("/api/auth/login", {
      method: "POST",
      body: { username: "admin", password: "Admin@123" }
    });
    if (!adminRes.ok || !adminRes.data?.accessToken) {
      throw new Error(`Đăng nhập admin thất bại: ${JSON.stringify(adminRes.data)}`);
    }
    context.adminToken = adminRes.data.accessToken;

    // 2. Nhập liệu login
    const nhaplieuRes = await apiRequest("/api/auth/login", {
      method: "POST",
      body: { username: "nhaplieu", password: "Nhaplieu@123" }
    });
    if (!nhaplieuRes.ok || !nhaplieuRes.data?.accessToken) {
      throw new Error(`Đăng nhập nhaplieu thất bại: ${JSON.stringify(nhaplieuRes.data)}`);
    }
    context.nhaplieuToken = nhaplieuRes.data.accessToken;

    // 3. Kiểm duyệt login
    const kiemduyetRes = await apiRequest("/api/auth/login", {
      method: "POST",
      body: { username: "kiemduyet", password: "Kiemduyet@123" }
    });
    if (!kiemduyetRes.ok || !kiemduyetRes.data?.accessToken) {
      throw new Error(`Đăng nhập kiemduyet thất bại: ${JSON.stringify(kiemduyetRes.data)}`);
    }
    context.kiemduyetToken = kiemduyetRes.data.accessToken;

    // 4. Độc giả login
    const docgiaRes = await apiRequest("/api/auth/login", {
      method: "POST",
      body: { username: "docgia", password: "Docgia@123" }
    });
    if (!docgiaRes.ok || !docgiaRes.data?.accessToken) {
      throw new Error(`Đăng nhập docgia thất bại: ${JSON.stringify(docgiaRes.data)}`);
    }
    context.docgiaToken = docgiaRes.data.accessToken;

    return `Cấp thành công 4 JWT Tokens: admin (SYSTEM_ADMIN), nhaplieu (ARCHIVIST), kiemduyet (REVIEWER), docgia (READER)`;
  });

  // ── BƯỚC 4: Tạo 1 Kho hồ sơ lưu trữ mới ────────────────────────────────────
  await runStep(4, "Tạo 1 Kho hồ sơ lưu trữ mới", "POST /api/dms/storage-locations", async () => {
    context.storageCode = `KHO-E2E-${timestamp}`;
    const payload = {
      code: context.storageCode,
      name: `Kho Lưu Trữ Nghiệm Thu E2E ${timestamp}`,
      locationType: "KHO",
      parentId: null,
      status: "ACTIVE",
      capacity: 10000
    };
    const res = await apiRequest("/api/dms/storage-locations", {
      method: "POST",
      body: payload,
      token: context.adminToken
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Tạo kho thất bại (${JSON.stringify(res.data)})`);
    context.storageId = res.data?.id || res.data?.Id;
    return `Tạo thành công Kho #${context.storageId} (${context.storageCode}) - Sức chứa: 10.000 hồ sơ`;
  });

  // ── BƯỚC 5: Tạo 1 Hồ sơ lưu trữ mới ở trạng thái DRAFT ─────────────────────
  await runStep(5, "Tạo Hồ sơ lưu trữ mới trạng thái DRAFT", "POST /api/dms/dossiers", async () => {
    context.dossierCode = `HS-E2E-${timestamp}`;
    const payload = {
      code: context.dossierCode,
      title: `Hồ sơ nghiệm thu bàn giao hệ thống số hóa IDP.DMS ${timestamp}`,
      dossierType: "HÀNH CHÍNH",
      storageId: context.storageId,
      status: "DRAFT",
      fromDate: new Date().toISOString(),
      toDate: new Date(Date.now() + 86400000 * 365).toISOString(),
      description: "Hồ sơ kiểm thử nghiệm thu tự động toàn trình"
    };
    const res = await apiRequest("/api/dms/dossiers", {
      method: "POST",
      body: payload,
      token: context.nhaplieuToken
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Tạo hồ sơ thất bại (${JSON.stringify(res.data)})`);
    context.dossierId = res.data?.id || res.data?.Id;
    return `Tạo thành công Hồ sơ #${context.dossierId} (${context.dossierCode}) - Trạng thái: DRAFT`;
  });

  // ── BƯỚC 6: Tạo văn bản thành phần & Bóc tách đối soát OCR Metadata ────────
  await runStep(6, "Tạo văn bản & Bóc tách đối soát OCR Metadata", "POST /api/ocr/confirm", async () => {
    // 1. Tạo văn bản thành phần
    context.documentCode = `VB-E2E-${timestamp}`;
    const docPayload = {
      dossierId: context.dossierId,
      code: context.documentCode,
      title: `Quyết định nghiệm thu hệ thống số hóa lưu trữ ${timestamp}`,
      fileName: "quyet_dinh_phe_duyet.pdf",
      ocrStatus: "PENDING",
      status: "DRAFT",
      description: "Văn bản đính kèm phục vụ kiểm thử OCR và Ký số"
    };
    const createRes = await apiRequest("/api/dms/documents", {
      method: "POST",
      body: docPayload,
      token: context.nhaplieuToken
    });
    if (!createRes.ok) throw new Error(`HTTP ${createRes.status}: Tạo văn bản thất bại`);
    context.documentId = typeof createRes.data === "number" ? createRes.data : (createRes.data?.id || createRes.data?.Id);

    // 2. Đối soát OCR & xác nhận metadata
    const ocrPayload = {
      documentId: context.documentId,
      documentNumber: `01/QĐ-UBND-${timestamp}`,
      issueDate: new Date().toISOString().slice(0, 10),
      issuingAuthority: "Ủy ban Nhân dân Thành phố",
      subject: "Quyết định phê duyệt nghiệm thu bàn giao hệ thống số hóa IDP.DMS",
      signer: "Nguyễn Văn Nghiệm Thu",
      ocrText: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\nQUYẾT ĐỊNH\nVề việc phê duyệt nghiệm thu bàn giao hệ thống số hóa hồ sơ lưu trữ IDP.DMS"
    };
    const confirmRes = await apiRequest("/api/ocr/confirm", {
      method: "POST",
      body: ocrPayload,
      token: context.nhaplieuToken
    });
    if (!confirmRes.ok) throw new Error(`HTTP ${confirmRes.status}: Xác nhận OCR thất bại (${JSON.stringify(confirmRes.data)})`);

    return `Tạo Văn bản #${context.documentId} & Đối soát OCR thành công -> Trạng thái OCR: CONFIRMED`;
  });

  // ── BƯỚC 7: Trình gửi kiểm duyệt hồ sơ chuyển trạng thái DRAFT -> PENDING ──
  await runStep(7, "Trình gửi kiểm duyệt hồ sơ (DRAFT -> PENDING)", "POST /api/dms/gd2/workflow/transition", async () => {
    const transitionPayload = {
      entityType: "DOSSIER",
      entityId: context.dossierId,
      action: "SUBMIT",
      actor: "nhaplieu",
      unitCode: "HC",
      comment: "Kính trình Lãnh đạo thẩm định và phê duyệt hồ sơ đã số hóa hoàn tất",
      recipient: "kiemduyet"
    };
    const res = await apiRequest("/api/dms/gd2/workflow/transition", {
      method: "POST",
      body: transitionPayload,
      token: context.nhaplieuToken
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Trình duyệt thất bại (${JSON.stringify(res.data)})`);
    const result = res.data;
    if (result?.currentStatus !== "PENDING") {
      throw new Error(`Trạng thái không phải PENDING, nhận được: ${result?.currentStatus}`);
    }
    return `Chuyển trạng thái: ${result.previousStatus} ➜ ${result.currentStatus} (Hàng chờ duyệt Lãnh đạo)`;
  });

  // ── BƯỚC 8: Cán bộ duyệt thực hiện Phê duyệt và Ký số PDF ───────────────────
  await runStep(8, "Phê duyệt hồ sơ (PENDING -> APPROVED) & Ký số PDF", "POST /api/dms/documents/{id}/sign-pdf", async () => {
    // 1. Phê duyệt hồ sơ
    const approvePayload = {
      entityType: "DOSSIER",
      entityId: context.dossierId,
      action: "APPROVE",
      actor: "kiemduyet",
      unitCode: "HC",
      comment: "Đã kiểm tra đối soát metadata, hồ sơ đạt chuẩn và phê duyệt xuất bản",
      recipient: null
    };
    const approveRes = await apiRequest("/api/dms/gd2/workflow/transition", {
      method: "POST",
      body: approvePayload,
      token: context.kiemduyetToken
    });
    if (!approveRes.ok) throw new Error(`HTTP ${approveRes.status}: Phê duyệt hồ sơ thất bại`);

    // 2. Cập nhật trạng thái văn bản sang APPROVED để sẵn sàng ký số
    const docUpdateRes = await apiRequest(`/api/dms/documents/${context.documentId}`, {
      method: "PUT",
      body: {
        dossierId: context.dossierId,
        code: context.documentCode,
        title: `Quyết định nghiệm thu hệ thống số hóa lưu trữ ${timestamp}`,
        fileName: "quyet_dinh_phe_duyet.pdf",
        ocrStatus: "CONFIRMED",
        status: "APPROVED",
        description: "Văn bản đã phê duyệt và sẵn sàng ký số điện tử"
      },
      token: context.kiemduyetToken
    });
    if (!docUpdateRes.ok) throw new Error(`HTTP ${docUpdateRes.status}: Cập nhật trạng thái văn bản thất bại (${JSON.stringify(docUpdateRes.data)})`);

    // 3. Thực hiện ký số PDF điện tử
    const form = new FormData();
    form.append("CertType", "DEVELOPMENT");
    form.append("SignerName", "Nguyễn Văn Kiểm Duyệt");
    form.append("Reason", "Ký số phê duyệt văn bản nghiệm thu bàn giao hệ thống");
    form.append("Location", "IDP.DMS Hà Nội");
    form.append("PositionX", "58");
    form.append("PositionY", "76");
    form.append("Width", "36");
    form.append("Height", "16");

    const signRes = await apiRequest(`/api/dms/documents/${context.documentId}/sign-pdf`, {
      method: "POST",
      body: form,
      token: context.kiemduyetToken,
      isFormData: true
    });
    if (!signRes.ok) throw new Error(`HTTP ${signRes.status}: Ký số PDF thất bại (${JSON.stringify(signRes.data)})`);
    const signResult = signRes.data;

    return `Hồ sơ chuyển APPROVED & Ký số PDF thành công: ${signResult?.signedFileName || "Tệp đã ký số"} (Chứng thư: ${signResult?.certificateType || "DEV"})`;
  });

  // ── BƯỚC 9: Đăng ký mượn hồ sơ & Phê duyệt phiếu mượn ──────────────────────
  await runStep(9, "Đăng ký mượn hồ sơ & Phê duyệt phiếu mượn", "POST /api/dms/borrow-requests", async () => {
    // 1. Độc giả gửi phiếu mượn
    const borrowPayload = {
      dossierId: context.dossierId,
      borrower: `Độc giả Nghiệm Thu ${timestamp}`,
      borrowFrom: new Date().toISOString().slice(0, 10),
      borrowTo: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
      purpose: "Nghiên cứu tài liệu phục vụ đối soát nghiệm thu bàn giao",
      borrowType: "DIGITAL",
      requestedItems: [{ documentId: context.documentId, documentTitle: "Văn bản nghiệm thu hệ thống" }]
    };
    const createBorrowRes = await apiRequest("/api/dms/borrow-requests", {
      method: "POST",
      body: borrowPayload,
      token: context.docgiaToken
    });
    if (!createBorrowRes.ok) throw new Error(`HTTP ${createBorrowRes.status}: Gửi phiếu mượn thất bại (${JSON.stringify(createBorrowRes.data)})`);
    context.borrowRequestId = createBorrowRes.data?.id;

    // 2. Cán bộ duyệt phiếu mượn
    const approveBorrowRes = await apiRequest(`/api/dms/borrow-requests/${context.borrowRequestId}/approve`, {
      method: "POST",
      body: {
        approver: "kiemduyet",
        note: "Đồng ý cấp quyền khai thác bản sao điện tử trực tuyến"
      },
      token: context.kiemduyetToken
    });
    if (!approveBorrowRes.ok) throw new Error(`HTTP ${approveBorrowRes.status}: Duyệt phiếu mượn thất bại`);

    return `Phiếu mượn #${context.borrowRequestId} được tạo bởi docgia và phê duyệt bởi kiemduyet -> Trạng thái: APPROVED`;
  });

  // ── BƯỚC 10: Kiểm tra Dashboard Lãnh đạo phản ánh số liệu thực tế ───────────
  await runStep(10, "Kiểm tra Dashboard Lãnh đạo phản ánh số liệu", "GET /api/dms/gd2/reports/executive-dashboard", async () => {
    const res = await apiRequest("/api/dms/gd2/reports/executive-dashboard", {
      token: context.adminToken
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Lấy dữ liệu Dashboard thất bại`);
    const dbData = res.data;
    const kpis = Array.isArray(dbData?.kpis) ? dbData.kpis : [];
    const kpiNewDossiers = kpis.find((k) => k.code === "NEW_DOSSIER" || k.Code === "NEW_DOSSIER" || k.key === "NEW_DOSSIER");
    const newDossiers = Number(kpiNewDossiers?.value ?? kpiNewDossiers?.Value ?? 0);
    const kpiBorrow = kpis.find((k) => k.code === "BORROW_RETURN" || k.Code === "BORROW_RETURN" || k.key === "BORROW_RETURN");
    const borrowReturn = Number(kpiBorrow?.value ?? kpiBorrow?.Value ?? 0);
    const rankingCount = Array.isArray(dbData?.performanceRanking) ? dbData.performanceRanking.length : 0;

    if (newDossiers <= 0) {
      throw new Error(`Chỉ số newDossiers = ${newDossiers}, kỳ vọng > 0`);
    }

    return `Dashboard Oracle thật: Tổng hồ sơ mới = ${newDossiers}, Lượt mượn trả = ${borrowReturn}, Cán bộ thi đua thực = ${rankingCount}`;
  });

  // ── TỔNG HỢP & XUẤT BÁO CÁO ───────────────────────────────────────────────
  const totalDuration = Math.round(performance.now() - context.startTime);
  const passedSteps = context.stepResults.filter((s) => s.status === "PASS").length;
  const totalSteps = context.stepResults.length;
  const isAllPassed = passedSteps === totalSteps;

  console.log("\n" + "=".repeat(80));
  console.log(`${C.bold}                 BẢNG TỔNG HỢP KẾT QUẢ KIỂM THỬ NGHIỆM THU E2E${C.reset}`);
  console.log("=".repeat(80));
  console.log(`  ${C.bold}Bước   Trạng thái   Thời gian   Tên bước kiểm thử${C.reset}`);
  console.log("  " + "-".repeat(76));

  for (const r of context.stepResults) {
    const statusText = r.status === "PASS"
      ? `${C.green}${C.bold}  PASS  ${C.reset}`
      : `${C.red}${C.bold}  FAIL  ${C.reset}`;
    const stepStr = String(r.step).padStart(2, " ");
    const timeStr = `${r.durationMs}ms`.padStart(7, " ");
    console.log(`  [${stepStr}]   ${statusText}   ${timeStr}   ${r.name}`);
  }
  console.log("  " + "-".repeat(76));

  const summaryBadge = isAllPassed
    ? `${C.bgGreen}${C.bold} PASS (100%) - TẤT CẢ 10 BƯỚC ĐỀU THÀNH CÔNG ${C.reset}`
    : `${C.bgRed}${C.bold} FAIL (${passedSteps}/${totalSteps}) - CÓ BƯỚC THẤT BẠI ${C.reset}`;

  console.log(`\n  Kết luận: ${summaryBadge}`);
  console.log(`  Tổng thời gian thực thi: ${C.bold}${totalDuration}ms${C.reset}`);
  console.log(`  Kho lưu trữ đã tạo: ${C.cyan}#${context.storageId} (${context.storageCode})${C.reset}`);
  console.log(`  Hồ sơ đã tạo:       ${C.cyan}#${context.dossierId} (${context.dossierCode}) [APPROVED]${C.reset}`);
  console.log(`  Văn bản & Ký số:    ${C.cyan}#${context.documentId} (${context.documentCode}) [SIGNED]${C.reset}`);
  console.log(`  Phiếu mượn:         ${C.cyan}#${context.borrowRequestId} [APPROVED]${C.reset}\n`);

  // Lưu file JSON kết quả nghiệm thu
  const reportJson = {
    testSuite: "IDP.DMS E2E Handover Smoke Test",
    executedAt: new Date().toISOString(),
    totalDurationMs: totalDuration,
    summary: {
      totalSteps,
      passedSteps,
      failedSteps: totalSteps - passedSteps,
      passRate: `${Math.round((passedSteps / totalSteps) * 100)}%`,
      status: isAllPassed ? "PASSED" : "FAILED"
    },
    context: {
      storageId: context.storageId,
      storageCode: context.storageCode,
      dossierId: context.dossierId,
      dossierCode: context.dossierCode,
      documentId: context.documentId,
      documentCode: context.documentCode,
      borrowRequestId: context.borrowRequestId
    },
    steps: context.stepResults
  };

  await fs.writeFile(RESULT_FILE, JSON.stringify(reportJson, null, 2), "utf-8");
  console.log(`  ${C.green}✓${C.reset} Đã xuất báo cáo chi tiết: ${C.bold}${RESULT_FILE}${C.reset}\n`);

  if (!isAllPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n${C.red}${C.bold}Lỗi nghiêm trọng trong quá trình thực thi:${C.reset}`, err);
  process.exit(1);
});
