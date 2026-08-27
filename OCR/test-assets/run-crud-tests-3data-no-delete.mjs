import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = path.resolve(".");
const outputDir = path.join(root, "test-assets");
const baseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:5103";
const tester = process.env.TESTER ?? "Codex";
const startedAt = new Date();
const runStamp = startedAt.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

const testDataPath = path.join(outputDir, "idp-dms-test-data.json");
const resultJsonPath = path.join(outputDir, "idp-dms-test-results-3data-no-delete.json");
const reportPath = path.join(outputDir, "idp-dms-test-execution-report-3data-no-delete.xlsx");

const operations = ["CREATE", "SEARCH", "UPDATE"];

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

function listContains(list, id, payload, resource) {
  if (!Array.isArray(list)) return false;
  const code = payload.code;
  return list.some((row) => {
    if (String(getId(row)) === String(id)) return true;
    if (code && String(row.code ?? row.Code ?? row.CODE) === String(code)) return true;
    if (resource === "borrow") return String(row.borrower ?? row.Borrower ?? "") === String(payload.borrower);
    return false;
  });
}

function makePayload(basePayload, item, dataSetIndex) {
  const payload = structuredClone(basePayload);
  const marker = `${runStamp}-${item.id.replace("TD-", "")}-${dataSetIndex}`;
  const label = `dataset ${dataSetIndex}`;

  if (item.resource === "dossiers") {
    payload.code = `T3-${marker}`.slice(0, 50);
    payload.title = `${payload.title} - ${label}`;
    return payload;
  }

  if (item.resource === "borrow") {
    payload.borrower = `${payload.borrower} - ${label} - ${runStamp}`;
    payload.note = `${payload.note ?? ""} - ${label}`;
    return payload;
  }

  payload.code = `T3-${marker}`.slice(0, 50);
  payload.name = `${payload.name} - ${label}`;
  if (payload.description) payload.description = `${payload.description} - ${label}`;
  return payload;
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

function actualValue(row, resource) {
  if (resource === "dossiers") return row?.title ?? row?.Title;
  if (resource === "borrow") return row?.borrower ?? row?.Borrower;
  return row?.name ?? row?.Name;
}

function expectedValue(payload, resource) {
  if (resource === "dossiers") return payload.title;
  if (resource === "borrow") return payload.borrower;
  return payload.name;
}

function caseId(item, dataSetIndex, operation) {
  return `TC-${item.id.replace("TD-", "")}-${operation}-DS${dataSetIndex}`;
}

function resultRow(item, dataSetIndex, operation, status, actual, durationMs = 0) {
  return {
    id: caseId(item, dataSetIndex, operation),
    baseTestDataId: item.id,
    dataSet: dataSetIndex,
    module: item.module,
    functionName: item.functionName,
    resource: item.resource,
    endpoint: endpointFor(item),
    operation,
    status,
    actual,
    durationMs,
    tester,
    executedAt: nowIso()
  };
}

async function createBorrowDependency(item, dataSetIndex) {
  if (item.resource !== "borrow") return null;
  const dossier = {
    code: `T3-DEP-${runStamp}-${item.id.replace("TD-", "")}-${dataSetIndex}`.slice(0, 50),
    title: `Hồ sơ phụ thuộc ${item.functionName} dataset ${dataSetIndex}`,
    dossierType: "HS_TEST",
    storageId: null,
    status: "DRAFT",
    fromDate: "2026-07-10",
    toDate: "2026-07-31",
    description: "Dữ liệu phụ thuộc khi kiểm thử phiếu mượn, giữ lại theo yêu cầu không test xóa"
  };
  const response = await request("POST", "/api/dms/dossiers", dossier);
  if (!response.ok) throw new Error(`Không tạo được hồ sơ phụ thuộc borrow: HTTP ${response.status} ${response.text}`);
  return getId(response.data);
}

async function runDataset(item, dataSetIndex) {
  const endpoint = endpointFor(item);
  const rows = [];
  const payload = makePayload(item.payload, item, dataSetIndex);
  const borrowDossierId = await createBorrowDependency(item, dataSetIndex);
  if (borrowDossierId) payload.dossierId = borrowDossierId;

  const create = await request("POST", endpoint, payload);
  if (!create.ok) {
    const message = `Tạo dữ liệu thất bại: HTTP ${create.status} ${create.text}`;
    rows.push(resultRow(item, dataSetIndex, "CREATE", "Fail", message, create.durationMs));
    rows.push(resultRow(item, dataSetIndex, "SEARCH", "Blocked", "Không chạy do bước tạo dữ liệu thất bại."));
    rows.push(resultRow(item, dataSetIndex, "UPDATE", "Blocked", "Không chạy do bước tạo dữ liệu thất bại."));
    return rows;
  }

  const createdId = getId(create.data);
  rows.push(resultRow(item, dataSetIndex, "CREATE", "Pass", `Tạo thành công ID=${createdId}, HTTP ${create.status}`, create.durationMs));

  const search = await request("GET", endpoint);
  const found = search.ok && listContains(search.data, createdId, payload, item.resource);
  rows.push(resultRow(
    item,
    dataSetIndex,
    "SEARCH",
    found ? "Pass" : "Fail",
    found ? `Tìm thấy bản ghi ID=${createdId} trong danh sách.` : `Không tìm thấy bản ghi sau khi tạo. HTTP ${search.status}`,
    search.durationMs
  ));

  const updatedPayload = mutatePayload(payload, item.resource);
  const update = await request("PUT", `${endpoint}/${createdId}`, updatedPayload);
  if (!update.ok) {
    rows.push(resultRow(item, dataSetIndex, "UPDATE", "Fail", `Cập nhật thất bại: HTTP ${update.status} ${update.text}`, update.durationMs));
    return rows;
  }

  const verify = item.resource === "borrow" ? await request("GET", endpoint) : await request("GET", `${endpoint}/${createdId}`);
  let updated = false;
  if (Array.isArray(verify.data)) {
    const row = verify.data.find((x) => String(getId(x)) === String(createdId));
    updated = String(actualValue(row, item.resource)) === String(expectedValue(updatedPayload, item.resource));
  } else {
    updated = String(actualValue(verify.data, item.resource)) === String(expectedValue(updatedPayload, item.resource));
  }
  rows.push(resultRow(
    item,
    dataSetIndex,
    "UPDATE",
    updated ? "Pass" : "Fail",
    updated ? `Cập nhật thành công ID=${createdId}.` : `Không xác nhận được dữ liệu sau cập nhật. HTTP ${verify.status}`,
    update.durationMs + verify.durationMs
  ));

  return rows;
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
  widths.forEach((width, index) => {
    sheet.getRangeByIndexes(0, index, matrix.length, 1).format.columnWidthPx = width;
  });
}

async function writeReport(results, testData) {
  await fs.writeFile(resultJsonPath, JSON.stringify(results, null, 2), "utf8");

  const counts = results.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
  const endedAt = new Date();
  const passRate = results.length ? `${Math.round(((counts.Pass ?? 0) / results.length) * 10000) / 100}%` : "0%";

  const workbook = Workbook.create();
  addSheet(workbook, "Execution Summary", [
    ["Hạng mục", "Giá trị"],
    ["Dự án", "IDP.DMS"],
    ["API Base URL", baseUrl],
    ["Tester", tester],
    ["Bắt đầu", startedAt.toISOString()],
    ["Kết thúc", endedAt.toISOString()],
    ["Số chức năng", testData.length],
    ["Số bộ dữ liệu mỗi chức năng", 3],
    ["Operation đã test", operations.join(", ")],
    ["Operation không test", "DELETE"],
    ["Tổng test case đã chạy", results.length],
    ["Pass", counts.Pass ?? 0],
    ["Fail", counts.Fail ?? 0],
    ["Blocked", counts.Blocked ?? 0],
    ["Pass rate", passRate],
    ["Ghi chú", "Không thực hiện test case xóa dữ liệu; các bản ghi test được giữ lại trong DB."]
  ], [260, 720]);

  addSheet(workbook, "Execution Results", [
    ["TestCase ID", "Base Test Data", "Data Set", "Module", "Chức năng", "Resource", "Endpoint", "Operation", "Status", "Actual", "Duration ms", "Tester", "Executed At"],
    ...results.map((row) => [
      row.id,
      row.baseTestDataId,
      row.dataSet,
      row.module,
      row.functionName,
      row.resource,
      row.endpoint,
      row.operation,
      row.status,
      row.actual,
      row.durationMs,
      row.tester,
      row.executedAt
    ])
  ], [160, 120, 90, 180, 230, 160, 240, 110, 90, 520, 100, 100, 190]);

  addSheet(workbook, "Module Summary", [
    ["Module", "Total", "Pass", "Fail", "Blocked", "Pass rate"],
    ...Array.from(results.reduce((map, row) => {
      const value = map.get(row.module) ?? { total: 0, pass: 0, fail: 0, blocked: 0 };
      value.total += 1;
      if (row.status === "Pass") value.pass += 1;
      if (row.status === "Fail") value.fail += 1;
      if (row.status === "Blocked") value.blocked += 1;
      map.set(row.module, value);
      return map;
    }, new Map()).entries()).map(([module, value]) => [
      module,
      value.total,
      value.pass,
      value.fail,
      value.blocked,
      value.total ? `${Math.round((value.pass / value.total) * 10000) / 100}%` : "0%"
    ])
  ], [220, 90, 90, 90, 90, 100]);

  addSheet(workbook, "Test Data Source", [
    ["Test Data ID", "Module", "Chức năng", "Resource", "Endpoint", "Payload gốc"],
    ...testData.map((row) => [
      row.id,
      row.module,
      row.functionName,
      row.resource,
      endpointFor(row),
      JSON.stringify(row.payload)
    ])
  ], [120, 180, 230, 160, 240, 700]);

  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(reportPath);
}

async function main() {
  const testData = JSON.parse(await fs.readFile(testDataPath, "utf8"));
  const health = await request("GET", "/api/dms/resources");
  if (!health.ok) throw new Error(`API không phản hồi đúng tại ${baseUrl}: HTTP ${health.status} ${health.text}`);
  const init = await request("POST", "/api/dms/initialize");
  if (!init.ok) throw new Error(`Không initialize được DB: HTTP ${init.status} ${init.text}`);

  const results = [];
  for (const item of testData) {
    for (let dataSetIndex = 1; dataSetIndex <= 3; dataSetIndex += 1) {
      try {
        const rows = await runDataset(item, dataSetIndex);
        results.push(...rows);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        for (const operation of operations) {
          results.push(resultRow(item, dataSetIndex, operation, "Fail", message));
        }
      }
    }
    const itemResults = results.filter((row) => row.baseTestDataId === item.id);
    const pass = itemResults.filter((row) => row.status === "Pass").length;
    console.log(`${item.id} ${item.functionName}: ${pass}/${itemResults.length} pass`);
  }

  await writeReport(results, testData);
  const counts = results.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log(JSON.stringify({
    baseUrl,
    total: results.length,
    counts,
    skippedOperation: "DELETE",
    dataSetsPerFunction: 3,
    resultJsonPath,
    reportPath
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
