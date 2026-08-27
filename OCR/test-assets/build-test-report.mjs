import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = path.resolve(".");
const outputDir = path.join(root, "test-assets");

const menu = [
  { title: "Quản trị hệ thống", items: ["Danh sách vai trò", "Hệ thống nhóm quyền", "Danh sách báo cáo nhóm", "Quản lý nơi sử dụng", "Định nghĩa danh mục", "Danh mục đơn vị hành chính", "Danh mục dùng chung"] },
  { title: "Quản trị nơi sử dụng", items: ["Hệ thống nhóm quyền", "Quản lý cây đơn vị", "Quản trị người dùng", "Danh sách nhóm báo cáo", "Cấu hình người dùng", "Cấu hình duyệt hồ sơ", "Định nghĩa danh mục riêng", "Cấu hình phòng ban"] },
  { title: "Nhập liệu", items: ["Nhập mới hồ sơ", "Cập nhật hồ sơ", "Import hồ sơ", "Chuyển kho hồ sơ", "Thanh lý hồ sơ", "Phân bổ hồ sơ", "Nhập liệu hồ sơ phân bổ"] },
  { title: "Tìm kiếm", items: ["Tìm kiếm hồ sơ theo từ gợi nhớ", "Tìm kiếm hồ sơ theo điều kiện"] },
  { title: "Kiểm duyệt", items: ["Xác nhận hồ sơ xuất bản", "Hủy xác nhận xuất bản hồ sơ", "Nhận xét hồ sơ", "Hồ sơ không hợp lệ"] },
  { title: "Khai thác", items: ["Xem hồ sơ", "Lịch sử mượn hồ sơ"] },
  { title: "Danh mục", items: ["Danh mục riêng", "Danh mục kho hồ sơ", "Danh mục kệ", "Danh mục tầng", "Danh mục hộp", "Danh mục loại hồ sơ", "Danh mục phông lưu trữ", "Danh mục loại văn bản", "Danh mục mục lục"] },
  { title: "Báo cáo", items: ["Khai báo cáo", "Xuất báo cáo"] },
  { title: "Duyệt phiếu", items: ["Duyệt phiếu mượn", "Chuyển giao hồ sơ", "Thu hồi hồ sơ"] }
];

const resourceMap = {
  "Danh sách vai trò": "roles",
  "Hệ thống nhóm quyền": "permission-groups",
  "Danh sách báo cáo nhóm": "report-groups",
  "Quản lý nơi sử dụng": "org-units",
  "Định nghĩa danh mục": "categories",
  "Danh mục đơn vị hành chính": "admin-units",
  "Danh mục dùng chung": "categories",
  "Quản lý cây đơn vị": "org-units",
  "Quản trị người dùng": "users",
  "Danh sách nhóm báo cáo": "report-groups",
  "Cấu hình người dùng": "user-groups",
  "Cấu hình duyệt hồ sơ": "approval-configs",
  "Định nghĩa danh mục riêng": "private-categories",
  "Cấu hình phòng ban": "departments",
  "Nhập mới hồ sơ": "dossiers",
  "Cập nhật hồ sơ": "dossiers",
  "Import hồ sơ": "import-jobs",
  "Chuyển kho hồ sơ": "storage-transfers",
  "Thanh lý hồ sơ": "disposal-records",
  "Phân bổ hồ sơ": "assignments",
  "Nhập liệu hồ sơ phân bổ": "assignments",
  "Tìm kiếm hồ sơ theo từ gợi nhớ": "dossiers",
  "Tìm kiếm hồ sơ theo điều kiện": "dossiers",
  "Xác nhận hồ sơ xuất bản": "publish-requests",
  "Hủy xác nhận xuất bản hồ sơ": "publish-requests",
  "Nhận xét hồ sơ": "approval-tickets",
  "Hồ sơ không hợp lệ": "invalid-records",
  "Xem hồ sơ": "dossiers",
  "Lịch sử mượn hồ sơ": "borrow",
  "Danh mục riêng": "private-categories",
  "Danh mục kho hồ sơ": "storage",
  "Danh mục kệ": "storage",
  "Danh mục tầng": "storage",
  "Danh mục hộp": "storage",
  "Danh mục loại hồ sơ": "dossier-types",
  "Danh mục phông lưu trữ": "fonts",
  "Danh mục loại văn bản": "document-types",
  "Danh mục mục lục": "catalog-indexes",
  "Khai báo cáo": "reports",
  "Xuất báo cáo": "reports",
  "Duyệt phiếu mượn": "borrow",
  "Chuyển giao hồ sơ": "transfer-tickets",
  "Thu hồi hồ sơ": "recall-tickets"
};

const resourceApi = {
  storage: "/api/dms/storage-locations",
  dossiers: "/api/dms/dossiers",
  documents: "/api/dms/documents",
  borrow: "/api/dms/borrow-requests"
};

const operations = [
  { key: "SEARCH", name: "Tìm kiếm", expected: "Danh sách trả về đúng bản ghi theo mã/tên/từ khóa; không lỗi giao diện khi không có dữ liệu." },
  { key: "CREATE", name: "Thêm mới", expected: "Lưu thành công, bản ghi xuất hiện trong bảng, các trường bắt buộc được kiểm tra." },
  { key: "UPDATE", name: "Chỉnh sửa", expected: "Cập nhật thành công, dữ liệu mới hiển thị sau khi làm mới danh sách." },
  { key: "DELETE", name: "Xóa", expected: "Xóa thành công hoặc hiển thị cảnh báo ràng buộc nếu bản ghi đã phát sinh dữ liệu." }
];

const features = menu.flatMap((group) => group.items.map((item) => ({
  group: group.title,
  item,
  resource: resourceMap[item] ?? "categories"
})));

function endpoint(resource) {
  return resourceApi[resource] ?? `/api/dms/resources/${resource}`;
}

function baseData(feature, index) {
  const suffix = String(index + 1).padStart(3, "0");
  const common = {
    code: `TC-${feature.resource.toUpperCase().replaceAll("-", "_")}-${suffix}`,
    name: `${feature.item} - dữ liệu test ${suffix}`,
    parentId: null,
    status: "ACTIVE",
    description: `Dữ liệu kiểm thử cho màn hình ${feature.item}`,
    extra1: feature.group,
    extra2: feature.resource,
    date1: "2026-07-10",
    date2: "2026-07-31"
  };

  if (feature.resource === "storage") {
    return { code: common.code, name: common.name, locationType: "KHO", parentId: null, status: "ACTIVE", capacity: 100 };
  }

  if (feature.resource === "dossiers") {
    return {
      code: common.code,
      title: common.name,
      dossierType: "HS_TEST",
      storageId: null,
      status: "DRAFT",
      fromDate: "2026-07-10",
      toDate: "2026-07-31",
      description: common.description
    };
  }

  if (feature.resource === "borrow") {
    return {
      dossierId: 1,
      borrower: `Người mượn test ${suffix}`,
      borrowFrom: "2026-07-10",
      borrowTo: "2026-07-31",
      status: "PENDING",
      approver: "Người duyệt test",
      note: common.description
    };
  }

  return common;
}

const testData = features.map((feature, index) => ({
  id: `TD-${String(index + 1).padStart(3, "0")}`,
  module: feature.group,
  functionName: feature.item,
  resource: feature.resource,
  endpoint: endpoint(feature.resource),
  payload: baseData(feature, index)
}));

const testCases = [];
features.forEach((feature, featureIndex) => {
  operations.forEach((op, opIndex) => {
    const id = `TC-${String(featureIndex + 1).padStart(3, "0")}-${op.key}`;
    const dataId = `TD-${String(featureIndex + 1).padStart(3, "0")}`;
    const steps = {
      SEARCH: `Mở menu ${feature.group} > ${feature.item}; nhập mã từ ${dataId} vào ô tìm kiếm hoặc quan sát danh sách; bấm Tìm kiếm/Làm mới.`,
      CREATE: `Mở menu ${feature.group} > ${feature.item}; nhập dữ liệu theo ${dataId}; bấm Thêm mới/Lưu.`,
      UPDATE: `Chọn bản ghi vừa tạo của ${dataId}; đổi tên/mô tả/trạng thái; bấm Cập nhật.`,
      DELETE: `Chọn bản ghi test của ${dataId}; bấm Xóa; xác nhận hộp thoại.`
    };
    testCases.push({
      id,
      module: feature.group,
      functionName: feature.item,
      resource: feature.resource,
      endpoint: endpoint(feature.resource),
      operation: op.name,
      priority: opIndex === 1 ? "High" : "Medium",
      precondition: "API đang chạy, DB đã khởi tạo bằng /api/dms/initialize, người dùng có quyền thao tác màn hình.",
      testDataId: dataId,
      steps: steps[op.key],
      expected: op.expected,
      status: "Not Run",
      actual: "",
      tester: "",
      executedAt: ""
    });
  });
});

const workbook = Workbook.create();

function addSheet(name, rows, options = {}) {
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
  (options.widths ?? []).forEach((width, i) => {
    sheet.getRangeByIndexes(0, i, matrix.length, 1).format.columnWidthPx = width;
  });
  return sheet;
}

addSheet("Summary", [
  ["Hạng mục", "Giá trị"],
  ["Dự án", "IDP.DMS"],
  ["Ngày lập", "2026-07-10"],
  ["Số nhóm menu", menu.length],
  ["Số mục chức năng", features.length],
  ["Số test case", testCases.length],
  ["Số resource/API", new Set(features.map((f) => f.resource)).size],
  ["Phạm vi", "Tìm kiếm, thêm mới, chỉnh sửa, xóa dữ liệu trên từng màn hình menu"],
  ["Điều kiện", "API/React đang chạy; Oracle DB đã khởi tạo bảng"]
], { widths: [220, 620] });

addSheet("CRUD Matrix", [
  ["Module", "Chức năng", "Resource", "Endpoint", "Search", "Create", "Update", "Delete"],
  ...features.map((f) => [f.group, f.item, f.resource, endpoint(f.resource), "Yes", "Yes", "Yes", "Yes"])
], { widths: [180, 260, 170, 270, 90, 90, 90, 90] });

addSheet("Test Cases", [
  ["TestCase ID", "Module", "Chức năng", "Resource", "Endpoint", "Operation", "Priority", "Precondition", "Test Data ID", "Steps", "Expected Result", "Status", "Actual Result", "Tester", "Executed At"],
  ...testCases.map((tc) => [tc.id, tc.module, tc.functionName, tc.resource, tc.endpoint, tc.operation, tc.priority, tc.precondition, tc.testDataId, tc.steps, tc.expected, tc.status, tc.actual, tc.tester, tc.executedAt])
], { widths: [120, 180, 260, 160, 260, 110, 90, 360, 120, 520, 420, 110, 260, 130, 130] });

addSheet("Test Data", [
  ["Test Data ID", "Module", "Chức năng", "Resource", "Endpoint", "Payload JSON"],
  ...testData.map((td) => [td.id, td.module, td.functionName, td.resource, td.endpoint, JSON.stringify(td.payload)])
], { widths: [120, 180, 260, 160, 260, 680] });

addSheet("Execution Checklist", [
  ["STT", "Việc cần làm", "Kết quả"],
  [1, "Gọi POST /api/dms/initialize trước khi test", ""],
  [2, "Mở React tại http://127.0.0.1:5173", ""],
  [3, "Với mỗi test data, tạo bản ghi theo đúng màn hình menu", ""],
  [4, "Chạy tìm kiếm/làm mới sau khi tạo để xác nhận dữ liệu", ""],
  [5, "Chỉnh sửa tên hoặc trạng thái của bản ghi test", ""],
  [6, "Xóa bản ghi test sau khi hoàn thành", ""],
  [7, "Cập nhật Status/Actual Result trong sheet Test Cases", ""]
], { widths: [70, 520, 240] });

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, "idp-dms-test-data.json"), JSON.stringify(testData, null, 2), "utf8");
await fs.writeFile(path.join(outputDir, "idp-dms-test-cases.json"), JSON.stringify(testCases, null, 2), "utf8");

const rendered = await workbook.render({ sheetName: "Summary", autoCrop: "all", scale: 1, format: "png" });
await fs.writeFile(path.join(outputDir, "idp-dms-test-report-preview.png"), new Uint8Array(await rendered.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path.join(outputDir, "idp-dms-test-report.xlsx"));

console.log(JSON.stringify({
  report: path.join(outputDir, "idp-dms-test-report.xlsx"),
  data: path.join(outputDir, "idp-dms-test-data.json"),
  cases: path.join(outputDir, "idp-dms-test-cases.json"),
  testCaseCount: testCases.length,
  testDataCount: testData.length
}, null, 2));
