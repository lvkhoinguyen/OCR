import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = path.resolve(".");
const outputDir = path.join(root, "test-assets");
const baseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:5103";
const tester = process.env.TESTER ?? "Codex";
const startedAt = new Date();

const testDataPath = path.join(outputDir, "idp-dms-test-data.json");
const testCasesPath = path.join(outputDir, "idp-dms-test-cases.json");
const resultJsonPath = path.join(outputDir, "idp-dms-test-results.json");
const reportPath = path.join(outputDir, "idp-dms-test-execution-report.xlsx");

const specialResources = new Set(["storage", "dossiers", "borrow"]);

function nowIso() {
  return new Date().toISOString();
}

function endpointFor(item) {
  if (item.resource === "storage") return "/api/dms/storage-locations";
  if (item.resource === "dossiers") return "/api/dms/dossiers";
  if (item.resource === "borrow") return "/api/dms/borrow-requests";
  return item.endpoint;
}

async function request(method, url, body) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json; charset=utf-8" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return {
    ok: response.ok,
    status: response.status,
    data,
    text,
    durationMs: Math.round(performance.now() - started)
  };
}

function getId(data) {
  return data?.id ?? data?.Id ?? data?.ID;
}

function getCode(payload) {
  return payload.code ?? payload.Code;
}

function getDisplayName(item) {
  return item.functionName ?? item.module ?? item.id;
}

function listContains(list, id, payload, resource) {
  if (!Array.isArray(list)) return false;
  const code = getCode(payload);
  return list.some((row) => {
    if (String(row.id ?? row.Id ?? row.ID) === String(id)) return true;
    if (code && String(row.code ?? row.Code ?? row.CODE) === String(code)) return true;
    if (resource === "borrow") {
      return String(row.borrower ?? row.Borrower ?? "") === String(payload.borrower);
    }
    return false;
  });
}

function mutatePayload(payload, resource) {
  const updated = structuredClone(payload);
  if (resource === "storage") {
    updated.name = `${updated.name} - updated`;
    updated.status = "INACTIVE";
    updated.capacity = Number(updated.capacity ?? 0) + 1;
    return updated;
  }
  if (resource === "dossiers") {
    updated.title = `${updated.title} - updated`;
    updated.status = "APPROVED";
    updated.description = `${updated.description ?? ""} - updated`;
    return updated;
  }
  if (resource === "borrow") {
    updated.borrower = `${updated.borrower} - updated`;
    updated.status = "APPROVED";
    updated.note = `${updated.note ?? ""} - updated`;
    return updated;
  }
  updated.name = `${updated.name} - updated`;
  updated.status = "INACTIVE";
  updated.description = `${updated.description ?? ""} - updated`;
  return updated;
}

function expectedUpdatedValue(payload, resource) {
  if (resource === "dossiers") return payload.title;
  if (resource === "borrow") return payload.borrower;
  return payload.name;
}

function actualValue(row, resource) {
  if (resource === "dossiers") return row?.title ?? row?.Title;
  if (resource === "borrow") return row?.borrower ?? row?.Borrower;
  return row?.name ?? row?.Name;
}

async function cleanupByCode(item) {
  const payload = item.payload;
  const code = getCode(payload);
  if (!code || item.resource === "borrow") return;
  const endpoint = endpointFor(item);
  const list = await request("GET", endpoint);
  if (!list.ok || !Array.isArray(list.data)) return;
  const rows = list.data.filter((row) => String(row.code ?? row.Code ?? row.CODE) === String(code));
  for (const row of rows) {
    const id = getId(row);
    if (id) await request("DELETE", `${endpoint}/${id}`);
  }
}

async function createBorrowDependency(item) {
  if (item.resource !== "borrow") return null;
  const suffix = `${item.id}-${Date.now()}`;
  const dossier = {
    code: `DEP-BORROW-${suffix}`.slice(0, 50),
    title: `Hồ sơ phụ thuộc cho ${item.functionName}`,
    dossierType: "HS_TEST",
    storageId: null,
    status: "DRAFT",
    fromDate: "2026-07-10",
    toDate: "2026-07-31",
    description: "Dữ liệu phụ thuộc khi kiểm thử phiếu mượn"
  };
  const response = await request("POST", "/api/dms/dossiers", dossier);
  if (!response.ok) {
    throw new Error(`Không tạo được hồ sơ phụ thuộc cho borrow: HTTP ${response.status} ${response.text}`);
  }
  return getId(response.data);
}

async function deleteBorrowDependency(id) {
  if (id) await request("DELETE", `/api/dms/dossiers/${id}`);
}

function newCaseResult(caseId, status, actual, durationMs = 0) {
  return {
    caseId,
    status,
    actual,
    durationMs,
    tester,
    executedAt: nowIso()
  };
}

async function runItem(item) {
  const endpoint = endpointFor(item);
  const featureNumber = item.id.replace("TD-", "");
  const casePrefix = `TC-${featureNumber}`;
  const results = [];
  let createdId = null;
  let borrowDossierId = null;

  try {
    await cleanupByCode(item);
    const payload = structuredClone(item.payload);
    borrowDossierId = await createBorrowDependency(item);
    if (borrowDossierId) payload.dossierId = borrowDossierId;

    const create = await request("POST", endpoint, payload);
    if (!create.ok) {
      const message = `Tạo dữ liệu thất bại: HTTP ${create.status} ${create.text}`;
      results.push(newCaseResult(`${casePrefix}-CREATE`, "Fail", message, create.durationMs));
      results.push(newCaseResult(`${casePrefix}-SEARCH`, "Blocked", "Không chạy do bước tạo dữ liệu thất bại."));
      results.push(newCaseResult(`${casePrefix}-UPDATE`, "Blocked", "Không chạy do bước tạo dữ liệu thất bại."));
      results.push(newCaseResult(`${casePrefix}-DELETE`, "Blocked", "Không chạy do bước tạo dữ liệu thất bại."));
      return { item, results, cleanup: async () => deleteBorrowDependency(borrowDossierId) };
    }

    createdId = getId(create.data);
    results.push(newCaseResult(`${casePrefix}-CREATE`, "Pass", `Tạo thành công ID=${createdId}, HTTP ${create.status}`, create.durationMs));

    const search = await request("GET", endpoint);
    const found = search.ok && listContains(search.data, createdId, payload, item.resource);
    results.push(newCaseResult(
      `${casePrefix}-SEARCH`,
      found ? "Pass" : "Fail",
      found ? `Tìm thấy bản ghi ID=${createdId} trong danh sách.` : `Không tìm thấy bản ghi sau khi tạo. HTTP ${search.status}`,
      search.durationMs
    ));

    const updatedPayload = mutatePayload(payload, item.resource);
    const update = await request("PUT", `${endpoint}/${createdId}`, updatedPayload);
    if (!update.ok) {
      results.push(newCaseResult(`${casePrefix}-UPDATE`, "Fail", `Cập nhật thất bại: HTTP ${update.status} ${update.text}`, update.durationMs));
    } else {
      const verify = specialResources.has(item.resource) && item.resource !== "borrow"
        ? await request("GET", `${endpoint}/${createdId}`)
        : await request("GET", endpoint);
      let updated = false;
      if (Array.isArray(verify.data)) {
        const row = verify.data.find((x) => String(getId(x)) === String(createdId));
        updated = String(actualValue(row, item.resource)) === String(expectedUpdatedValue(updatedPayload, item.resource));
      } else {
        updated = String(actualValue(verify.data, item.resource)) === String(expectedUpdatedValue(updatedPayload, item.resource));
      }
      results.push(newCaseResult(
        `${casePrefix}-UPDATE`,
        updated ? "Pass" : "Fail",
        updated ? `Cập nhật thành công ID=${createdId}.` : `Không xác nhận được dữ liệu sau cập nhật. HTTP ${verify.status}`,
        update.durationMs + (verify.durationMs ?? 0)
      ));
    }

    const del = await request("DELETE", `${endpoint}/${createdId}`);
    if (!del.ok) {
      results.push(newCaseResult(`${casePrefix}-DELETE`, "Fail", `Xóa thất bại: HTTP ${del.status} ${del.text}`, del.durationMs));
    } else {
      const verifyDelete = await request("GET", endpoint);
      const stillExists = verifyDelete.ok && Array.isArray(verifyDelete.data)
        ? verifyDelete.data.some((row) => String(getId(row)) === String(createdId))
        : false;
      results.push(newCaseResult(
        `${casePrefix}-DELETE`,
        stillExists ? "Fail" : "Pass",
        stillExists ? `Bản ghi ID=${createdId} vẫn còn sau khi xóa.` : `Xóa thành công ID=${createdId}.`,
        del.durationMs + (verifyDelete.durationMs ?? 0)
      ));
    }

    return { item, results, cleanup: async () => deleteBorrowDependency(borrowDossierId) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    for (const op of ["CREATE", "SEARCH", "UPDATE", "DELETE"]) {
      if (!results.some((r) => r.caseId === `${casePrefix}-${op}`)) {
        results.push(newCaseResult(`${casePrefix}-${op}`, "Fail", message));
      }
    }
    return { item, results, cleanup: async () => deleteBorrowDependency(borrowDossierId) };
  }
}

function addSheet(workbook, name, rows, widths = []) {
  const sheet = workbook.worksheets.add(name);
  sheet.showGridLines = false;
  const matrix = rows.map((row) => row.map((value) => value == null ? "" : String(value)));
  const range = sheet.getRangeByIndexes(0, 0, matrix.length, matrix[0].length);
  range.values = matrix;
  const header = sheet.getRangeByIndexes(0, 0, 1, matrix[0].length);
  header.format = {
    fill: "#3264F4",
    font: { bold: true, color: "#FFFFFF" },
    wrapText: true
  };
  range.format.wrapText = true;
  range.format.borders = {
    insideHorizontal: { style: "Continuous", color: "#D8E2FF" },
    insideVertical: { style: "Continuous", color: "#D8E2FF" },
    edgeBottom: { style: "Continuous", color: "#D8E2FF" },
    edgeTop: { style: "Continuous", color: "#D8E2FF" },
    edgeLeft: { style: "Continuous", color: "#D8E2FF" },
    edgeRight: { style: "Continuous", color: "#D8E2FF" }
  };
  sheet.freezePanes.freezeRows(1);
  widths.forEach((width, i) => sheet.getRangeByIndexes(0, i, matrix.length, 1).format.columnWidthPx = width);
}

async function writeReport(testCases, results, testData) {
  const resultMap = new Map(results.map((result) => [result.caseId, result]));
  const enriched = testCases.map((testCase) => {
    const result = resultMap.get(testCase.id);
    return {
      ...testCase,
      status: result?.status ?? "Not Run",
      actual: result?.actual ?? "",
      tester: result?.tester ?? "",
      executedAt: result?.executedAt ?? "",
      durationMs: result?.durationMs ?? ""
    };
  });

  await fs.writeFile(resultJsonPath, JSON.stringify(enriched, null, 2), "utf8");

  const counts = enriched.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
  const endedAt = new Date();
  const elapsedSeconds = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);
  const passRate = enriched.length ? `${Math.round(((counts.Pass ?? 0) / enriched.length) * 10000) / 100}%` : "0%";

  const workbook = Workbook.create();
  addSheet(workbook, "Execution Summary", [
    ["Hạng mục", "Giá trị"],
    ["Dự án", "IDP.DMS"],
    ["API Base URL", baseUrl],
    ["Tester", tester],
    ["Bắt đầu", startedAt.toISOString()],
    ["Kết thúc", endedAt.toISOString()],
    ["Thời gian chạy (giây)", elapsedSeconds],
    ["Tổng test case", enriched.length],
    ["Pass", counts.Pass ?? 0],
    ["Fail", counts.Fail ?? 0],
    ["Blocked", counts.Blocked ?? 0],
    ["Not Run", counts["Not Run"] ?? 0],
    ["Pass rate", passRate]
  ], [220, 620]);

  addSheet(workbook, "Execution Results", [
    ["TestCase ID", "Module", "Chức năng", "Resource", "Endpoint", "Operation", "Priority", "Status", "Actual", "Duration ms", "Tester", "Executed At"],
    ...enriched.map((row) => [
      row.id,
      row.module,
      row.functionName,
      row.resource,
      row.endpoint,
      row.operation,
      row.priority,
      row.status,
      row.actual,
      row.durationMs,
      row.tester,
      row.executedAt
    ])
  ], [120, 180, 230, 160, 240, 120, 90, 90, 520, 100, 100, 190]);

  addSheet(workbook, "Test Data Used", [
    ["Test Data ID", "Module", "Chức năng", "Resource", "Endpoint", "Payload"],
    ...testData.map((row) => [
      row.id,
      row.module,
      row.functionName,
      row.resource,
      endpointFor(row),
      JSON.stringify(row.payload)
    ])
  ], [110, 180, 230, 160, 240, 700]);

  const byModule = new Map();
  for (const row of enriched) {
    const key = row.module;
    const current = byModule.get(key) ?? { total: 0, pass: 0, fail: 0, blocked: 0 };
    current.total += 1;
    if (row.status === "Pass") current.pass += 1;
    if (row.status === "Fail") current.fail += 1;
    if (row.status === "Blocked") current.blocked += 1;
    byModule.set(key, current);
  }

  addSheet(workbook, "Module Summary", [
    ["Module", "Total", "Pass", "Fail", "Blocked", "Pass rate"],
    ...Array.from(byModule.entries()).map(([module, value]) => [
      module,
      value.total,
      value.pass,
      value.fail,
      value.blocked,
      value.total ? `${Math.round((value.pass / value.total) * 10000) / 100}%` : "0%"
    ])
  ], [220, 90, 90, 90, 90, 100]);

  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(reportPath);
}

async function main() {
  const testData = JSON.parse(await fs.readFile(testDataPath, "utf8"));
  const testCases = JSON.parse(await fs.readFile(testCasesPath, "utf8"));

  const health = await request("GET", "/api/dms/resources");
  if (!health.ok) {
    throw new Error(`API không phản hồi đúng tại ${baseUrl}: HTTP ${health.status} ${health.text}`);
  }
  const init = await request("POST", "/api/dms/initialize");
  if (!init.ok) {
    throw new Error(`Không initialize được DB: HTTP ${init.status} ${init.text}`);
  }

  const allResults = [];
  for (const item of testData) {
    const run = await runItem(item);
    allResults.push(...run.results);
    await run.cleanup();
    const pass = run.results.filter((r) => r.status === "Pass").length;
    console.log(`${item.id} ${getDisplayName(item)}: ${pass}/${run.results.length} pass`);
  }

  await writeReport(testCases, allResults, testData);
  const counts = allResults.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log(JSON.stringify({
    baseUrl,
    total: allResults.length,
    counts,
    resultJsonPath,
    reportPath
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
