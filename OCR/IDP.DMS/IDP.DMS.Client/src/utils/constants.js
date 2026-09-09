// Shared constants used across multiple screens in IDP.DMS Client

export const moduleMap = {
  // ── Các nhóm nghiệp vụ chuẩn hóa mới ──────────────────────────────
  "Tạo kho & Thêm dữ liệu": "storage",
  "Chọn kho & Bóc tách dữ liệu": "gd2-ocr",
  "Kiểm duyệt văn bản đã tách": "gd2-workflow",
  "Số hóa & OCR": "gd2-ocr",
  "Quản lý Hồ sơ": "gd2-documents",
  "Kiểm duyệt": "gd2-workflow",
  "Tra cứu & Mượn trả": "dossiers",
  "Báo cáo & Thống kê": "gd2-reports",
  "Cấu hình hệ thống": "permission-groups",
  "Trợ giúp & Hướng dẫn": "user-guide",
  "Hướng dẫn sử dụng": "user-guide",

  // ── Tương thích ngược ─────────────────────────────────────────────
  "Quản trị hệ thống": "admin",
  "Quản trị đơn vị": "admin",
  "Quản trị nơi sử dụng": "admin",
  "Danh mục kho lưu trữ": "storage",
  "Nhập liệu & Số hóa hồ sơ": "dossiers",
  "Nhập liệu": "dossiers",
  "Khai thác": "borrow",
  "Danh mục": "storage",
  "Báo cáo": "reports",
  "Duyệt phiếu": "borrow",
  "Phê duyệt & Xuất bản hồ sơ": "approval",
  "Tra cứu & Đăng ký mượn hồ sơ": "borrow",
  "Duyệt đăng ký mượn hồ sơ": "borrow",
  "Công cụ AI & OCR": "gd2-ocr",
};

export const itemResourceMap = {
  // ── Các mục Menu chuẩn hóa mới (Dành cho người dùng văn phòng) ────
  "Bóc tách văn bản AI": "gd2-ocr",
  "Nhập hồ sơ hàng loạt": "import-jobs",
  "Danh mục Hồ sơ lưu trữ": "gd2-documents",
  "Quản lý Kho - Kệ - Hộp": "storage",
  "Hồ sơ chờ phê duyệt": "gd2-workflow",
  "Hồ sơ yêu cầu bổ sung": "gd2-review-supplement",
  "Ký số văn bản": "gd2-signature",
  "Tìm kiếm hồ sơ": "dossiers",
  "Đăng ký mượn hồ sơ": "gd2-borrow-process",
  "Duyệt phiếu mượn": "borrow",
  "Dashboard tổng quan": "gd2-leadership",
  "Báo cáo số hóa & Xuất file": "gd2-reports",
  "Quản trị người dùng & Phân quyền": "permission-groups",
  "Danh mục dùng chung": "categories",
  "Hướng dẫn sử dụng": "user-guide",
  "Cẩm nang người dùng": "user-guide",
  "Trợ giúp & Hướng dẫn": "user-guide",

  // ── Các mục tương thích ngược ─────────────────────────────────────
  "Quản lý Menu": "menus",
  "Quản lý Nhóm quyền & Nhóm quyền báo cáo": "permission-groups",
  "Quản lý Đơn vị / Cây đơn vị": "org-units",
  "Danh mục dùng chung & Định nghĩa": "categories",
  "Quản lý Nhóm quyền đơn vị": "permission-groups",
  "Cây đơn vị cấp tỉnh & Người dùng tỉnh": "users",
  "Cấu hình người dùng & Nhóm người duyệt": "approval-configs",
  "Định nghĩa danh mục riêng & Phòng ban": "departments",
  "Danh mục loại hồ sơ & Cấu hình loại": "gd2-dossier-types",
  "Mẫu loại văn bản, Phông lưu trữ & Mục lục": "document-types",
  "Thêm mới & Quản lý danh sách hồ sơ": "gd2-documents",
  "Quản lý văn bản thành phần": "documents",
  "Chuyển kho hồ sơ": "storage-transfers",
  "Tải lên từ ứng dụng Quét / Scanning": "gd2-ocr",
  "Nhận dạng OCR nhiều vùng (Zonal OCR)": "gd2-ocr",
  "Import hồ sơ hàng loạt": "import-jobs",
  "Thanh lý hồ sơ": "disposal-records",
  "Hàng chờ duyệt & Quản lý quy trình Workflow": "gd2-workflow",
  "Phê duyệt xuất bản / Hủy xuất bản": "approval",
  "Quản lý hồ sơ không hợp lệ / Yêu cầu bổ sung": "gd2-review-supplement",
  "Tìm kiếm & Tra cứu hồ sơ nâng cao": "gd2-documents",
  "Đăng ký mượn hồ sơ (Bản cứng / Bản mềm)": "gd2-borrow-process",
  "Lịch sử mượn trả & Xem trực tuyến": "gd2-borrow-process",
  "Hàng chờ duyệt mượn hồ sơ": "borrow",
  "Phê duyệt / Từ chối phiếu mượn": "borrow",
  "Báo cáo tổng hợp số hóa & Tỷ lệ OCR": "gd2-reports",
  "Báo cáo mượn trả hồ sơ": "gd2-reports",
  "Xuất báo cáo PDF / Excel": "report-dashboard",
  "Trích xuất OCR PDF / Ảnh giữ cấu trúc biểu mẫu": "gd2-ocr",
  "Bóc tách trường dữ liệu AI": "gd2-ocr",
  "Dashboard theo dõi dành cho Lãnh đạo": "gd2-leadership",
  "Thông tin tài khoản & Đổi mật khẩu": "users",
  "Danh sách vai trò": "roles",
  "Hệ thống nhóm quyền": "permission-groups",
  "Danh sách báo cáo nhóm": "report-groups",
  "Quản lý nơi sử dụng": "org-units",
  "Định nghĩa danh mục": "categories",
  "Danh mục đơn vị hành chính": "admin-units",
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
  "Tùy chỉnh Giao diện & Quy trình": "workflow-builder",
  "Tích hợp phần mềm ngoài": "integration-screen",
  "Thiết lập nhóm quyền": "permission-groups",
  "Khai báo cáo": "report-dashboard",
  "Xuất báo cáo": "report-dashboard",
  "Số hóa & Bóc tách AI (OCR)": "ocr-screen",
  "Kiểm duyệt hồ sơ xuất bản": "approval",
  "Duyệt phiếu mượn": "borrow",
  "Chuyển giao hồ sơ": "transfer-tickets",
  "Thu hồi hồ sơ": "recall-tickets",
  // GD2 phases
  "GĐ2-1 Quản lý tài liệu": "gd2-documents",
  "GĐ2-2 Quản lý quy trình": "gd2-workflow",
  "GĐ2-3 Phân quyền truy cập": "gd2-permissions",
  "GĐ2-6 OCR AI tích hợp": "gd2-ocr",
  "GĐ2-7 Tích hợp hệ thống": "gd2-integration",
  "GD2-9 Chữ ký số": "gd2-signature",
  "GĐ2-10 Báo cáo và phân tích": "gd2-reports",
  "GĐ2-11 Phiên bản tài liệu": "gd2-document-versions",
  "GĐ2-12 Giao diện & quy trình": "gd2-interface-workflow",
  "GĐ2-13 Dashboard lãnh đạo": "gd2-leadership",
  "GD2-14 Bảo mật thông tin": "gd2-security",
  "GD2-15 Dữ liệu hệ thống": "gd2-system-data",
  "GĐ2-16 Quản lý loại hồ sơ": "gd2-dossier-types",
  "GĐ2-19 Xác nhận thông tin": "gd2-confirmation",
  "GĐ2-20 Kiểm duyệt & bổ sung": "gd2-review-supplement",
  "GĐ2-21 Thông báo kết quả": "gd2-notifications",
  "GĐ2-25 Hệ thống quản lý hồ sơ": "gd2-dossier-system",
  "GĐ2-26 Quy trình mượn, tra, khai thác hồ sơ": "gd2-borrow-process",
  "Quản lý tài liệu": "documents",
  "Tích hợp OCR AI": "gd2-ocr",
  "Phân quyền truy cập": "gd2-permissions",
  "Tích hợp hệ thống khác": "gd2-integration",
};

// Empty form templates
export const emptyStorage = { code: "", name: "", locationType: "KHO", parentId: "", status: "ACTIVE", capacity: "" };
export const emptyDossier = { code: "", title: "", dossierType: "", storageId: "", status: "DRAFT", fromDate: "", toDate: "", description: "" };
export const emptyDocument = { dossierId: "", code: "", title: "", fileName: "", ocrStatus: "PENDING", status: "DRAFT", description: "" };
export const emptyBorrow = { dossierId: "", borrower: "", borrowFrom: "", borrowTo: "", status: "PENDING", approver: "", note: "" };
export const emptySimple = { code: "", name: "", parentId: "", status: "ACTIVE", description: "", extra1: "", extra2: "", date1: "", date2: "" };

// Technical model file detection
export const technicalModelPattern = /\.(ifc|stl|obj|step|stp)$/i;
export const isTechnicalModelFile = (fileName) => technicalModelPattern.test(String(fileName || ""));

// Menu chuẩn hóa thân thiện với người dùng văn phòng
export const designMenuGroups = [
  {
    title: "Tạo kho & Thêm dữ liệu",
    items: [
      "Quản lý Kho - Kệ - Hộp",
      "Danh mục Hồ sơ lưu trữ",
      "Nhập hồ sơ hàng loạt"
    ]
  },
  {
    title: "Chọn kho & Bóc tách dữ liệu",
    items: [
      "Bóc tách văn bản AI"
    ]
  },
  {
    title: "Kiểm duyệt văn bản đã tách",
    items: [
      "Hồ sơ chờ phê duyệt",
      "Hồ sơ yêu cầu bổ sung",
      "Ký số văn bản"
    ]
  },
  {
    title: "Tra cứu & Mượn trả",
    items: [
      "Tìm kiếm hồ sơ",
      "Đăng ký mượn hồ sơ",
      "Duyệt phiếu mượn"
    ]
  },
  {
    title: "Báo cáo & Thống kê",
    items: [
      "Dashboard tổng quan",
      "Báo cáo số hóa & Xuất file"
    ]
  },
  {
    title: "Cấu hình hệ thống",
    items: [
      "Quản trị người dùng & Phân quyền",
      "Danh mục dùng chung"
    ]
  }
];

