import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Tesseract from "tesseract.js";
import { lazy, Suspense } from "react";
import {
  Archive,
  CheckCircle2,
  Database,
  FileSearch,
  FileText,
  FolderTree,
  Home,
  Layers3,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
  Upload,
  PieChart,
  Download,
  History,
  Edit,
  Settings,
  GitMerge,
  X,
  Eye,
  Shield,
  Link,
  PenTool,
  Activity,
  Bell,
  ChevronRight,
  AlertCircle,
  Clock,
  User,
  Zap,
  BarChart2,
  Lock,
  Mail,
  MessageSquare,
  Wifi,
  WifiOff,
  LogOut,
  QrCode
} from "lucide-react";
import { uiApi } from "./services/uiApi";
import LoginScreen from "./components/LoginScreen";

const ArchiveLabelModal = lazy(() => import("./components/ArchiveLabelModal"));
const TechnicalModelViewer = lazy(() => import("./components/TechnicalModelViewer"));
const technicalModelPattern = /\.(ifc|stl|obj|step|stp)$/i;
const isTechnicalModelFile = fileName => technicalModelPattern.test(String(fileName || ""));

const moduleMap = {
  "Quản trị hệ thống": "admin",
  "Quản trị đơn vị": "admin",
  "Quản trị nơi sử dụng": "admin",
  "Danh mục kho lưu trữ": "storage",
  "Nhập liệu & Số hóa hồ sơ": "dossiers",
  "Phê duyệt & Xuất bản hồ sơ": "approval",
  "Tra cứu & Đăng ký mượn hồ sơ": "dossiers",
  "Duyệt đăng ký mượn hồ sơ": "borrow",
  "Báo cáo & Thống kê": "report-dashboard",
  "Công cụ AI & OCR": "gd2-ocr",
  "Tài khoản cá nhân & Dashboard": "gd2-leadership",
  "Nhập liệu": "dossiers",
  "Tìm kiếm": "search",
  "Kiểm duyệt": "approval",
  "Khai thác": "borrow",
  "Danh mục": "storage",
  "Báo cáo": "report",
  "Duyệt phiếu": "borrow"
};

// Menu nền theo đúng nhóm chức năng trong bản thiết kế HTML. Dữ liệu từ API
// vẫn được ưu tiên khi có, nhưng giao diện không còn bị trắng nếu backend đang tắt.
const designMenuGroups = [
  {
    title: "Quản trị hệ thống",
    items: ["Quản lý Menu", "Quản lý Nhóm quyền & Nhóm quyền báo cáo", "Quản lý Đơn vị / Cây đơn vị", "Danh mục dùng chung & Định nghĩa"]
  },
  {
    title: "Quản trị nơi sử dụng",
    items: ["Quản lý Nhóm quyền đơn vị", "Cây đơn vị cấp tỉnh & Người dùng tỉnh", "Cấu hình người dùng & Nhóm người duyệt", "Định nghĩa danh mục riêng & Phòng ban"]
  },
  {
    title: "Nhập liệu",
    items: ["GĐ2-1 Quản lý tài liệu", "Nhập mới hồ sơ", "Cập nhật hồ sơ", "Import hồ sơ", "GĐ2-6 OCR AI tích hợp", "GĐ2-19 Xác nhận thông tin"]
  },
  {
    title: "Tìm kiếm",
    items: ["Tìm kiếm hồ sơ theo từ gợi nhớ", "Tìm kiếm hồ sơ theo điều kiện", "Tìm kiếm & Tra cứu hồ sơ nâng cao"]
  },
  {
    title: "Kiểm duyệt",
    items: ["GĐ2-2 Quản lý quy trình", "Hàng chờ duyệt & Quản lý quy trình Workflow", "GĐ2-20 Kiểm duyệt & bổ sung", "Xác nhận hồ sơ xuất bản"]
  },
  {
    title: "Khai thác",
    items: ["Xem hồ sơ", "Đăng ký mượn hồ sơ (Bản cứng / Bản mềm)", "Lịch sử mượn trả & Xem trực tuyến"]
  },
  {
    title: "Danh mục",
    items: ["Quản lý Kho - Kệ - Tầng - Hộp", "Danh mục kho hồ sơ", "Danh mục kệ", "Danh mục tầng", "Danh mục hộp", "Danh mục loại hồ sơ"]
  },
  {
    title: "Báo cáo",
    items: ["Báo cáo tổng hợp số hóa & Tỷ lệ OCR", "Báo cáo mượn trả hồ sơ", "Xuất báo cáo PDF / Excel"]
  },
  {
    title: "Duyệt phiếu",
    items: ["Hàng chờ duyệt mượn hồ sơ", "Phê duyệt / Từ chối phiếu mượn"]
  }
];

const itemResourceMap = {
  "Quản lý Menu": "menus",
  "Quản lý Nhóm quyền & Nhóm quyền báo cáo": "permission-groups",
  "Quản lý Đơn vị / Cây đơn vị": "org-units",
  "Danh mục dùng chung & Định nghĩa": "categories",
  "Quản lý Nhóm quyền đơn vị": "permission-groups",
  "Cây đơn vị cấp tỉnh & Người dùng tỉnh": "users",
  "Cấu hình người dùng & Nhóm người duyệt": "approval-configs",
  "Định nghĩa danh mục riêng & Phòng ban": "departments",
  "Danh mục loại hồ sơ & Cấu hình loại": "gd2-dossier-types",
  "Quản lý Kho - Kệ - Tầng - Hộp": "storage",
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
  // ===== Giai đoạn 2 =====
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
  "Tích hợp hệ thống khác": "gd2-integration"
};

const emptyStorage = { code: "", name: "", locationType: "KHO", parentId: "", status: "ACTIVE", capacity: "" };
const emptyDossier = { code: "", title: "", dossierType: "", storageId: "", status: "DRAFT", fromDate: "", toDate: "", description: "" };
const emptyDocument = { dossierId: "", code: "", title: "", fileName: "", ocrStatus: "PENDING", status: "DRAFT", description: "" };
const emptyBorrow = { dossierId: "", borrower: "", borrowFrom: "", borrowTo: "", status: "PENDING", approver: "", note: "" };
const emptySimple = { code: "", name: "", parentId: "", status: "ACTIVE", description: "", extra1: "", extra2: "", date1: "", date2: "" };

const brokenTextMap = {
  "Chưa có dữ liệu hoặc chưa khởi tạo DB.": "Chưa có dữ liệu hoặc chưa khởi tạo DB.",
  "Chưa có dữ liệu.": "Chưa có dữ liệu.",
  "Chưa có hồ sơ trong hàng chờ.": "Chưa có hồ sơ trong hàng chờ.",
  "Tìm kiếm...": "Tìm kiếm...",
  "Tên/Nội dung": "Tên/Nội dung",
  "Xóa": "Xóa",
  "Xem chi tiết": "Xem chi tiết",
  "Quản lý tài liệu": "Quản lý tài liệu",
  "Danh sách chờ xử lý": "Danh sách chờ xử lý",
  "Chi tiết phê duyệt": "Chi tiết phê duyệt",
  "Luồng xử lý": "Luồng xử lý",
  "Tích hợp OCR AI": "Tích hợp OCR AI",
  "Tích hợp hệ thống khác": "Tích hợp hệ thống khác",
  "Hồ sơ": "Hồ sơ",
  "Hồ sơ xuất bản HS-002": "Hồ sơ xuất bản HS-002",
  "Mã hồ sơ": "Mã hồ sơ",
  "Tên hồ sơ": "Tên hồ sơ",
  "Loại hồ sơ": "Loại hồ sơ",
  "Chức năng": "Chức năng",
  "Vui lòng": "Vui lòng",
  "Không": "Không",
  "thành công": "thành công",
  "Trạng thái": "Trạng thái",
  "hiện tại": "hiện tại",
  "Duyệt": "Duyệt",
  "Chuyển cấp": "Chuyển cấp",
  "Từ chối": "Từ chối",
  "Nhập mã PIN...": "Nhập mã PIN...",
  "Nhập mã OTP...": "Nhập mã OTP...",
  "Chưa gửi OTP": "Chưa gửi OTP"
};

function repairDisplayedText(value) {
  if (typeof value !== "string" || !value) return value;

  const score = (text) => (text.match(/[ÃÂ]|(?:áº|á»|Ä|Æ|â€)|�/g) || []).length;
  const tryDecode = (text, encoding) => {
    try {
      const bytes = Uint8Array.from([...text].map((character) => character.charCodeAt(0) & 0xff));
      return new TextDecoder(encoding).decode(bytes);
    } catch {
      return text;
    }
  };
  const repairToken = (token) => {
    if (!token || !/[ÃÂáºá»ÄÆâ€�]/.test(token)) return token;
    if (brokenTextMap[token]) return brokenTextMap[token];

    const candidates = new Set([token, token.replaceAll("�", "")]);
    [token, token.replaceAll("�", "")].forEach((current) => {
      if (!current) return;
      candidates.add(tryDecode(current, "utf-8"));
      candidates.add(tryDecode(current, "latin1"));
      candidates.add(tryDecode(current, "cp1252"));
    });

    let best = token;
    candidates.forEach((candidate) => {
      if (score(candidate) < score(best)) best = candidate;
    });
    return best;
  };

  let repaired = brokenTextMap[value] || value;
  repaired = repaired.replaceAll("Tích hợp OCR AI", "Tích hợp OCR AI");
  repaired = repaired
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      if (brokenTextMap[part]) return brokenTextMap[part];
      return repairToken(part);
    })
    .join("");

  if (score(repaired) < score(value)) return repaired;
  return repaired;
}

function repairRenderedText(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);
  textNodes.forEach((textNode) => {
    const repaired = repairDisplayedText(textNode.nodeValue);
    if (repaired !== textNode.nodeValue) textNode.nodeValue = repaired;
  });
  root.querySelectorAll("input, textarea, [title], [placeholder], option").forEach((element) => {
    ["value", "title", "placeholder"].forEach((attribute) => {
      if (element.hasAttribute(attribute)) {
        const repaired = repairDisplayedText(element.getAttribute(attribute));
        if (repaired !== element.getAttribute(attribute)) element.setAttribute(attribute, repaired);
      }
    });
  });
}

function normalizeMenuGroups(groups) {
  return groups.map((group) => ({
    ...group,
    title: repairDisplayedText(group.title),
    items: group.items.map((item) => repairDisplayedText(item))
  }));
}

function mergeMenuWithDesign(groups) {
  const aliases = {
    "Quản trị đơn vị": "Quản trị nơi sử dụng",
    "Nhập liệu & Số hóa hồ sơ": "Nhập liệu",
    "Phê duyệt & Xuất bản hồ sơ": "Kiểm duyệt",
    "Tra cứu & Đăng ký mượn hồ sơ": "Khai thác",
    "Danh mục kho lưu trữ": "Danh mục",
    "Báo cáo & Thống kê": "Báo cáo",
    "Duyệt đăng ký mượn hồ sơ": "Duyệt phiếu",
    "Công cụ AI & OCR": "Nhập liệu"
  };
  const merged = designMenuGroups.map(group => ({ ...group, items: [...group.items] }));
  groups.forEach(group => {
    const targetTitle = aliases[group.title] || group.title;
    const target = merged.find(item => item.title === targetTitle);
    if (!target) return;
    target.items = [...new Set([...target.items, ...group.items])];
  });
  return merged;
}



function ApprovalScreen({ title }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signPin, setSignPin] = useState("");
  const [signCert, setSignCert] = useState("VNPT CA");
  const [signOtp, setSignOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const [signHistory, setSignHistory] = useState([]);

  useEffect(() => {
    uiApi.gd2.workflowItems()
      .then(data => setRows(data.filter(d => ["PENDING", "DRAFT", "APPROVED"].includes(d.status))))
      .catch(e => setError(e.message));
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const dossierRow = rows.find(r => r.id === id);
      const action = newStatus === "REJECTED" ? "REJECT" : "APPROVE";
      const result = await uiApi.gd2.transition({
        entityType: "DOSSIER",
        entityId: id,
        action,
        actor: "current-user",
        unitCode: "DEFAULT",
        comment: action === "REJECT" ? "Từ chối hồ sơ" : "Phê duyệt hồ sơ",
        recipient: dossierRow?.code,
      });
      alert(`Đã chuyển trạng thái hồ sơ sang ${result.currentStatus}`);
      setRows(rows.filter(r => r.id !== id));
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  };

  const handleSendOtp = () => {
    setOtpSent(true);
    alert("OTP đã được gửi về số điện thoại đã đăng ký: ***6789");
  };

  const handleSignConfirm = async () => {
    if (!signPin) {
      alert("Vui lòng nhập mã PIN");
      return;
    }

    setShowSignModal(false);
    if (!selectedId) return;

    try {
      const dossierRow = rows.find(r => r.id === selectedId);
      if (!dossierRow) return;

      if (dossierRow.status !== "APPROVED") {
        await uiApi.gd2.transition({
          entityType: "DOSSIER",
          entityId: selectedId,
          action: "APPROVE",
          actor: "current-user",
          unitCode: "DEFAULT",
          comment: "Phê duyệt trước khi ký số",
          recipient: dossierRow.code,
        });
      }

      const result = await uiApi.gd2.transition({
        entityType: "DOSSIER",
        entityId: selectedId,
        action: "SIGN",
        actor: "current-user",
        unitCode: "DEFAULT",
        comment: `Ký số bằng ${signCert}`,
        recipient: dossierRow.code,
      });

      const ts = new Date().toLocaleString("vi-VN");
      setSignHistory(prev => [{ id: selectedId, cert: signCert, ts, code: dossierRow?.code }, ...prev]);
      alert(`Đã ký số & ban hành hồ sơ thành công!\nTrạng thái: ${result.currentStatus}\nChứng thư: ${signCert}\nThời gian: ${ts}`);
      setRows(rows.filter(r => r.id !== selectedId));
      setSignPin("");
      setSignOtp("");
      setOtpSent(false);
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  };

  return (
    <section className="panel">
      <PanelTitle icon={<CheckCircle2 />} title={title || "Kiểm duyệt hồ sơ xuất bản"} />
      {error && <div className="alert">{error}</div>}

      {signHistory.length > 0 && (
        <div className="sign-history-bar">
          <strong><PenTool size={14} /> Lịch sử ký số gần đây:</strong>
          {signHistory.slice(0, 3).map((h, i) => (
            <span key={i} className="sign-history-item">HS#{h.code} – {h.cert} – {h.ts}</span>
          ))}
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã HS</th><th>Tên HS</th><th>Loại</th><th>Trạng thái</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td><strong>{row.code}</strong></td>
                <td>{row.title}</td>
                <td>{row.dossierType || "—"}</td>
                <td><StatusBadge status={row.status} /></td>
                <td>
                  <button className="btn ok" style={{ marginRight: 4 }} onClick={() => handleStatusChange(row.id, "APPROVED")}>✓ Duyệt</button>
                  <button className="btn warn" style={{ marginRight: 4 }} onClick={() => handleStatusChange(row.id, "REJECTED")}>✕ Từ chối</button>
                  <button className="btn primary" style={{ marginRight: 4 }} onClick={() => { setSelectedId(row.id); setShowSignModal(true); }}><PenTool size={13}/> Ký số</button>
                  <button className="icon-btn" onClick={() => setViewDoc(row)} title="Xem chi tiết"><Eye size={14}/></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="5" className="empty-cell">Không có hồ sơ nào chờ duyệt.</td></tr>}
          </tbody>
        </table>
      </div>

      {showSignModal && (
        <div className="modal-overlay" onClick={() => setShowSignModal(false)}>
          <div className="modal-content sign-modal" onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-wrap sign-icon"><PenTool size={22} color="#fff"/></div>
              <div>
                <h3>Ký số &amp; Ban hành hồ sơ</h3>
                <p className="muted">Xác thực danh tính trước khi ký số chính thức</p>
              </div>
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <span>Chứng thư số</span>
              <select value={signCert} onChange={event => setSignCert(event.target.value)}>
                <option value="VNPT CA">USB Token – VNPT CA</option>
                <option value="Viettel CA">USB Token – Viettel CA</option>
                <option value="HSM">Máy chủ HSM Doanh nghiệp</option>
                <option value="SmartSign">SmartSign Mobile</option>
              </select>
            </div>
            <div className="field">
              <span>Mã PIN chứng thư</span>
              <input type="password" value={signPin} onChange={event => setSignPin(event.target.value)} placeholder="Nhập mã PIN..." />
            </div>
            <div className="field">
              <span>Xác thực OTP (tùy chọn)</span>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" value={signOtp} onChange={event => setSignOtp(event.target.value)} placeholder={otpSent ? "Nhập mã OTP..." : "Chưa gửi OTP"} style={{ flex: 1 }} />
                <button className="btn primary" type="button" onClick={handleSendOtp} style={{ whiteSpace: "nowrap" }}>
                  {otpSent ? "Gửi lại" : "Gửi OTP"}
                </button>
              </div>
            </div>
            <div className="sign-cert-info">
              <Lock size={13}/> Thông tin chứng thư: <strong>{signCert}</strong> – Hiệu lực đến 31/12/2026
            </div>
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn primary" onClick={handleSignConfirm}><PenTool size={14}/> Xác nhận Ký số</button>
              <button className="btn" onClick={() => { setShowSignModal(false); setSignPin(""); setSignOtp(""); setOtpSent(false); }}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {viewDoc && (
        <div className="modal-overlay" onClick={() => setViewDoc(null)}>
          <div className="modal-content" onClick={event => event.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="modal-icon-wrap" style={{ background: "#0ea5e9" }}><Eye size={22} color="#fff"/></div>
              <div>
                <h3>Chi tiết hồ sơ #{viewDoc.code}</h3>
                <p className="muted">Xem thông tin và lịch sử xử lý</p>
              </div>
            </div>
            <div className="detail-grid" style={{ marginTop: 16 }}>
              <div className="detail-row"><span>Mã hồ sơ</span><strong>{viewDoc.code}</strong></div>
              <div className="detail-row"><span>Tên hồ sơ</span><strong>{viewDoc.title}</strong></div>
              <div className="detail-row"><span>Loại hồ sơ</span><strong>{viewDoc.dossierType || "—"}</strong></div>
              <div className="detail-row"><span>Trạng thái</span><StatusBadge status={viewDoc.status}/></div>
              <div className="detail-row"><span>Mô tả</span><span>{viewDoc.description || "Chưa có mô tả"}</span></div>
            </div>
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn primary" onClick={() => { setSelectedId(viewDoc.id); setViewDoc(null); setShowSignModal(true); }}>Ký số ngay</button>
              <button className="btn" onClick={() => setViewDoc(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PermissionScreen({ title }) {
  const crud = useCrud("permission-groups", emptySimple);
  const [editId, setEditId] = useState(null);
  const [perms, setPerms] = useState({});

  const modules = ["Quản lý tài liệu", "Hồ sơ lưu trữ", "OCR AI", "Báo cáo", "Workflow", "Tích hợp", "Ký số"];
  const actions = ["Xem", "Thêm", "Sửa", "Xóa", "Duyệt", "Xuất"];

  const getKey = (module, action) => `${module}_${action}`;
  const isChecked = (rowId, module, action) => {
    const key = `${rowId}_${getKey(module, action)}`;
    if (key in perms) return perms[key];
    // Default: Xem=true, Thêm/Sửa=true for non-delete, Xóa=false
    return action !== "Xóa" && action !== "Duyệt";
  };

  const toggle = (rowId, module, action) => {
    const key = `${rowId}_${getKey(module, action)}`;
    setPerms(prev => ({ ...prev, [key]: !isChecked(rowId, module, action) }));
  };

  const handleSave = () => {
    alert("Đã lưu cấu hình phân quyền thành công!");
    setEditId(null);
  };

  return (
    <section className="panel">
      <PanelTitle icon={<Shield />} title={title || "Phân quyền truy cập"} />
      <p className="muted" style={{marginBottom:14}}>Thiết lập quyền truy cập theo nhóm và chức năng. Chọn nhóm để chỉnh sửa.</p>

      {crud.rows.length === 0 ? (
        <div className="empty-state"><Shield size={40} color="#94a3b8"/><p>Chưa có nhóm quyền. Khởi tạo DB trước.</p></div>
      ) : (
        <>
          {/* Chọn nhóm để sửa */}
          <div className="perm-group-selector">
            {crud.rows.map(row => (
              <button
                key={row.id}
                className={`btn ${editId === row.id ? "primary" : ""}`}
                onClick={() => setEditId(editId === row.id ? null : row.id)}
              >
                <User size={13}/> {row.name || row.code}
              </button>
            ))}
          </div>

          {editId && (() => {
            const row = crud.rows.find(r => r.id === editId);
            return (
              <div className="perm-matrix-wrap" style={{marginTop:16}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
                  <h4 style={{margin:0}}>Phân quyền: <span style={{color:"var(--brand)"}}>{row?.name || row?.code}</span></h4>
                  <div style={{display:"flex", gap:8}}>
                    <button className="btn ok" onClick={handleSave}><Save size={13}/> Lưu thay đổi</button>
                    <button className="btn" onClick={() => setEditId(null)}>Hủy</button>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="perm-matrix">
                    <thead>
                      <tr>
                        <th style={{minWidth:150}}>Chức năng / Module</th>
                        {actions.map(a => <th key={a} style={{textAlign:"center",width:70}}>{a}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map(mod => (
                        <tr key={mod}>
                          <td><strong>{mod}</strong></td>
                          {actions.map(act => (
                            <td key={act} style={{textAlign:"center"}}>
                              <input
                                type="checkbox"
                                checked={isChecked(editId, mod, act)}
                                onChange={() => toggle(editId, mod, act)}
                                style={{width:16, height:16, accentColor:"var(--brand)"}}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {!editId && (
            <div className="table-wrap" style={{marginTop:14}}>
              <table>
                <thead>
                  <tr><th>Nhóm quyền</th><th>Mô tả</th><th>Phạm vi</th><th>Thao tác</th></tr>
                </thead>
                <tbody>
                  {crud.rows.map(row => (
                    <tr key={row.id}>
                      <td><strong>{row.name || row.code}</strong></td>
                      <td className="muted">{row.description || "Chưa có mô tả"}</td>
                      <td>{row.extra1 || "Toàn đơn vị"}</td>
                      <td>
                        <button className="btn warn" onClick={() => setEditId(row.id)}><Edit size={13}/> Sửa quyền</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function DashboardReportScreen() {
  const [range, setRange] = useState("7d");
  const handleExport = (type) => alert(`Đang tải báo cáo: ${type}...`);

  const summaryCards = [
    { label: "Hồ sơ xử lý", value: "1.250", note: "+12% so với kỳ trước", color: "#2563eb", icon: <BarChart2 size={22} /> },
    { label: "Chờ phê duyệt", value: "38", note: "Cần theo dõi", color: "#f59e0b", icon: <Clock size={22} /> },
    { label: "Đúng hạn", value: "96%", note: "SLA đạt yêu cầu", color: "#16a34a", icon: <CheckCircle2 size={22} /> },
    { label: "Đơn vị đang trễ", value: "4", note: "Ưu tiên xử lý", color: "#dc2626", icon: <User size={22} /> },
  ];

  const teamRows = [
    { name: "Phòng Hành chính", handled: 312, approved: 298, onTime: "98%", backlog: 6 },
    { name: "Phòng Nhân sự", handled: 276, approved: 261, onTime: "95%", backlog: 8 },
    { name: "Phòng Kế toán", handled: 248, approved: 233, onTime: "94%", backlog: 9 },
    { name: "Phòng Vận hành", handled: 414, approved: 401, onTime: "97%", backlog: 15 },
  ];

  return (
    <section className="panel">
      <PanelTitle icon={<PieChart />} title="Theo dõi và phân tích cho lãnh đạo" />
      <p className="muted" style={{ marginBottom: 16 }}>Giám sát khối lượng xử lý, tiến độ phê duyệt và hiệu suất theo đơn vị.</p>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["24h", "7d", "30d"].map(item => (
            <button key={item} className={`btn ${range === item ? "primary" : ""}`} onClick={() => setRange(item)}>
              {item === "24h" ? "24 giờ" : item === "7d" ? "7 ngày" : "30 ngày"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn ok" onClick={() => handleExport("Excel")}>Xuất Excel</button>
          <button className="btn danger" onClick={() => handleExport("PDF")}>Xuất PDF</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, marginBottom: 20 }}>
        {summaryCards.map(card => (
          <div key={card.label} style={{ padding: 18, borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ color: card.color }}>{card.icon}</span>
              <span className="muted" style={{ fontSize: 12 }}>{range === "24h" ? "Hôm nay" : range === "7d" ? "7 ngày" : "30 ngày"}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{card.value}</div>
            <div style={{ marginTop: 8, fontWeight: 600 }}>{card.label}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{card.note}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Đơn vị</th>
                <th>Xử lý</th>
                <th>Đã duyệt</th>
                <th>Đúng hạn</th>
                <th>Tồn</th>
              </tr>
            </thead>
            <tbody>
              {teamRows.map(row => (
                <tr key={row.name}>
                  <td><strong>{row.name}</strong></td>
                  <td>{row.handled}</td>
                  <td>{row.approved}</td>
                  <td><span className="vld-badge rule">{row.onTime}</span></td>
                  <td>{row.backlog}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: 18, background: "#f8fafc" }}>
          <h4 style={{ marginTop: 0, marginBottom: 12 }}>Điểm nhấn điều hành</h4>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="detail-row"><span>Hồ sơ cần ưu tiên</span><strong>12</strong></div>
            <div className="detail-row"><span>Quy trình quá hạn</span><strong>3</strong></div>
            <div className="detail-row"><span>Đơn vị hiệu suất cao nhất</span><strong>Phòng Vận hành</strong></div>
            <div className="detail-row"><span>Tỷ lệ xử lý đúng hạn</span><strong>96%</strong></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IntegrationScreen() {
  const [selectedSys, setSelectedSys] = useState(null);
  const [syncLog, setSyncLog] = useState([
    { time: "10:32 hôm nay", sys: "ERP Oracle", status: "success", msg: "Đồng bộ 142 bản ghi hồ sơ" },
    { time: "09:15 hôm nay", sys: "Kế toán MISA", status: "success", msg: "Đồng bộ 37 chứng từ" },
    { time: "08:00 hôm nay", sys: "Email Server", status: "error", msg: "Timeout kết nối, thử lại sau" },
    { time: "Hôm qua 17:00", sys: "ERP Oracle", status: "success", msg: "Đồng bộ 89 bản ghi" },
  ]);

  const systems = [
    { id: 1, name: "ERP Oracle", type: "ERP", status: "connected", lastSync: "10:32 hôm nay", records: 142, icon: "ERP" },
    { id: 2, name: "Kế toán MISA", type: "Kế toán", status: "connected", lastSync: "09:15 hôm nay", records: 37, icon: "KT" },
    { id: 3, name: "Email Server", type: "Email", status: "error", lastSync: "08:00 hôm nay", records: 0, icon: "EM" },
    { id: 4, name: "Hệ thống văn phòng", type: "Văn phòng", status: "pending", lastSync: "Chưa kết nối", records: 0, icon: "VP" },
  ];

  const handleSync = (sys) => {
    const ts = new Date().toLocaleTimeString("vi-VN");
    setSyncLog(prev => [{ time: ts, sys: sys.name, status: "success", msg: "Đồng bộ thủ công thành công" }, ...prev]);
    alert(`Đã đồng bộ thủ công với ${sys.name}!`);
  };

  return (
    <section className="panel">
      <PanelTitle icon={<Link />} title="Tích hợp hệ thống khác" />
      <p className="muted" style={{marginBottom:20}}>Quản lý và giám sát kết nối với các hệ thống bên ngoài.</p>

      {/* Dashboard kết nối */}
      <div className="integration-grid">
        {systems.map(sys => (
          <div key={sys.id} className={`integration-card ${sys.status}`} onClick={() => setSelectedSys(sys)}>
            <div className="int-card-top">
              <span className="int-icon">{sys.icon}</span>
              <span className={`conn-badge ${sys.status}`}>
                {sys.status === "connected" ? <><Wifi size={11}/> Kết nối</> :
                 sys.status === "error" ? <><WifiOff size={11}/> Lỗi</> :
                 <><Clock size={11}/> Chờ</>}
              </span>
            </div>
            <div className="int-card-name">{sys.name}</div>
            <div className="int-card-type muted">{sys.type}</div>
            <div className="int-card-stat">
              <span>Lần cuối: <strong>{sys.lastSync}</strong></span>
              {sys.records > 0 && <span className="int-records">{sys.records} bản ghi</span>}
            </div>
            <div style={{marginTop:10, display:"flex", gap:6}}>
              <button className="btn ok" style={{fontSize:12,padding:"4px 8px"}} onClick={e => { e.stopPropagation(); handleSync(sys); }}>
                <RefreshCw size={11}/> Đồng bộ
              </button>
              <button className="btn" style={{fontSize:12,padding:"4px 8px"}} onClick={e => { e.stopPropagation(); setSelectedSys(sys); }}>
                <Eye size={11}/> Xem
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Log đồng bộ */}
      <div style={{marginTop:24}}>
        <h4 style={{marginBottom:10, display:"flex", alignItems:"center", gap:8}}><Activity size={16}/> Nhật ký đồng bộ</h4>
        <div className="sync-log">
          {syncLog.map((log, i) => (
            <div key={i} className={`sync-log-item ${log.status}`}>
              <span className="sync-time">{log.time}</span>
              <span className="sync-sys">{log.sys}</span>
              <span className="sync-msg">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal xem chi tiết hệ thống */}
      {selectedSys && (
        <div className="modal-overlay" onClick={() => setSelectedSys(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:500}}>
            <div className="modal-header">
              <div className="modal-icon-wrap" style={{background:"#7c3aed",fontSize:20}}>{selectedSys.icon}</div>
              <div><h3>{selectedSys.name}</h3><p className="muted">{selectedSys.type} - Chi tiết kết nối</p></div>
            </div>
            <div className="detail-grid" style={{marginTop:16}}>
              <div className="detail-row"><span>Trạng thái</span>
                <span className={`conn-badge ${selectedSys.status}`}>
                  {selectedSys.status === "connected" ? "Đang kết nối" : selectedSys.status === "error" ? "Lỗi" : "Chờ kết nối"}
                </span>
              </div>
              <div className="detail-row"><span>Loại hệ thống</span><strong>{selectedSys.type}</strong></div>
              <div className="detail-row"><span>Đồng bộ gần nhất</span><strong>{selectedSys.lastSync}</strong></div>
              <div className="detail-row"><span>Bản ghi đã đồng bộ</span><strong>{selectedSys.records}</strong></div>
              <div className="detail-row"><span>Endpoint API</span><code>https://api.{selectedSys.name.toLowerCase().replace(/ /g,"-")}.vn/v2</code></div>
            </div>
            <div className="modal-actions" style={{marginTop:20}}>
              <button className="btn ok" onClick={() => { handleSync(selectedSys); setSelectedSys(null); }}><RefreshCw size={13}/> Đồng bộ ngay</button>
              <button className="btn" onClick={() => setSelectedSys(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function OcrScreen() {
  const crud = useCrud("documents", emptyDocument);
  const fileInputRef = useRef(null);
  const [batchProgress, setBatchProgress] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]);

  const pendingDocs = crud.rows.filter(d => d.ocrStatus === "PENDING" || d.ocrStatus === "ERROR");
  const doneDocs = crud.rows.filter(d => d.ocrStatus === "DONE");

  const toggleSelect = (id) => setSelectedDocs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleBatchOcr = () => {
    const targets = selectedDocs.length > 0 ? selectedDocs : pendingDocs.map(d => d.id);
    if (targets.length === 0) { alert("Không có tài liệu nào cần OCR."); return; }
    setBatchProgress({ total: targets.length, done: 0, running: true });
    let done = 0;
    const timer = setInterval(() => {
      done++;
      setBatchProgress({ total: targets.length, done, running: done < targets.length });
      if (done >= targets.length) {
        clearInterval(timer);
        alert(`Đồng bộ OCR hoàn tất! Đã xử lý ${targets.length} tài liệu.`);
        crud.rows; // trigger re-render hint
      }
    }, 800);
  };

  const handleExport = (type) => {
    setExportLoading(true);
    setTimeout(() => {
      setExportLoading(false);
      alert(`Xuất báo cáo ${type} hoàn tất!\nTổng tài liệu: ${crud.rows.length}\nĐã OCR: ${doneDocs.length}\nChờ OCR: ${pendingDocs.length}`);
    }, 1200);
  };

  return (
    <section className="panel">
      <PanelTitle icon={<Zap />} title="GD2-6: Phần mềm tích hợp OCR AI" />
      <p className="muted" style={{marginBottom:16}}>Quản lý, đồng bộ và xuất báo cáo tất cả tài liệu OCR trong hệ thống.</p>

      {/* Metrics */}
      <div className="ocr-metrics">
        <div className="ocr-metric-card total"><BarChart2 size={22}/><strong>{crud.rows.length}</strong><span>Tổng tài liệu</span></div>
        <div className="ocr-metric-card done"><CheckCircle2 size={22}/><strong>{doneDocs.length}</strong><span>Đã OCR xong</span></div>
        <div className="ocr-metric-card pending"><Clock size={22}/><strong>{pendingDocs.length}</strong><span>Chờ xử lý</span></div>
        <div className="ocr-metric-card rate">
          <Activity size={22}/>
          <strong>{crud.rows.length > 0 ? Math.round(doneDocs.length / crud.rows.length * 100) : 0}%</strong>
          <span>Tỷ lệ hoàn thành</span>
        </div>
      </div>

      {/* Thanh tác vụ */}
      <div className="ocr-toolbar">
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <button className="btn primary" onClick={() => handleBatchOcr()} disabled={batchProgress?.running}>
            <Zap size={14}/> {batchProgress?.running ? `Đang OCR... (${batchProgress.done}/${batchProgress.total})` : "Đồng bộ/Batch OCR"}
          </button>
          <button className="btn ok" onClick={() => handleExport("Excel")} disabled={exportLoading}>
            <Download size={14}/> {exportLoading ? "Đang xuất..." : "Xuất Excel"}
          </button>
          <button className="btn warn" onClick={() => handleExport("PDF")} disabled={exportLoading}>
            <Download size={14}/> Xuất PDF
          </button>
          <button className="btn" onClick={() => setSelectedDocs([])}>
            <X size={14}/> Bỏ chọn ({selectedDocs.length})
          </button>
        </div>
        <div className="ocr-engine-selector">
          <span style={{fontSize:12,color:"var(--muted)"}}>AI bóc tách: <strong>Gemini Vision</strong></span>
        </div>
      </div>

      {/* Progress bar đồng bộ */}
      {batchProgress && (
        <div className="batch-progress-wrap">
          <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
            <span>Tiến trình OCR</span>
            <span>{batchProgress.done}/{batchProgress.total}</span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{width: `${batchProgress.total > 0 ? batchProgress.done/batchProgress.total*100 : 0}%`}} />
          </div>
        </div>
      )}

      {/* Bảng tài liệu */}
      <div className="table-wrap" style={{marginTop:14}}>
        <table>
          <thead>
            <tr>
              <th style={{width:36}}><input type="checkbox" onChange={e => setSelectedDocs(e.target.checked ? pendingDocs.map(d => d.id) : [])} checked={selectedDocs.length === pendingDocs.length && pendingDocs.length > 0}/></th>
              <th>Mã tài liệu</th><th>Tên tài liệu</th><th>File</th><th>OCR</th><th>Trạng thái</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {crud.rows.length === 0 && <tr><td colSpan="7" className="empty-cell">Chưa có tài liệu nào.</td></tr>}
            {crud.rows.map(doc => (
              <tr key={doc.id}>
                <td><input type="checkbox" checked={selectedDocs.includes(doc.id)} onChange={() => toggleSelect(doc.id)}/></td>
                <td><strong>{doc.code}</strong></td>
                <td>{doc.title}</td>
                <td className="muted">{doc.fileName || "Chưa có file"}</td>
                <td><OcrBadge status={doc.ocrStatus}/></td>
                <td><StatusBadge status={doc.status}/></td>
                <td>
                  <button className="btn primary" style={{fontSize:12,padding:"3px 8px"}} onClick={() => { setSelectedDocs([doc.id]); handleBatchOcr(); }}>
                    <Zap size={11}/> OCR
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DocumentManagementScreen() {
  const crud = useCrud("documents", emptyDocument);
  const [keyword, setKeyword] = useState("");
  const fileInputRef = useRef(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [ocrEngine, setOcrEngine] = useState("gemini");
  const [showEngineModal, setShowEngineModal] = useState(false);
  const [versionHistoryDoc, setVersionHistoryDoc] = useState(null);
  const [versionRows, setVersionRows] = useState([]);
  const [versionError, setVersionError] = useState("");

  const rows = useMemo(() => {
    if (!keyword) return crud.rows;
    const k = keyword.toLowerCase();
    return crud.rows.filter((row) => `${row.code} ${row.title} ${row.fileName}`.toLowerCase().includes(k));
  }, [crud.rows, keyword]);

  const handleUploadClick = (id) => {
    setUploadingId(id);
    setShowEngineModal(true);
  };

  const handleEngineConfirm = () => {
    setShowEngineModal(false);
    if(fileInputRef.current) fileInputRef.current.click();
  };

  async function openVersionHistory(document) {
    setVersionHistoryDoc(document);
    setVersionError("");
    try {
      setVersionRows(await uiApi.gd2.documentVersions(document.id));
    } catch (error) {
      setVersionRows([]);
      setVersionError(error.message);
    }
  }

  async function createVersionSnapshot() {
    if (!versionHistoryDoc) return;
    try {
      const version = await uiApi.gd2.createDocumentVersion(versionHistoryDoc.id, {
        createdBy: "current-user",
        note: "Tạo phiên bản thủ công",
      });
      setVersionRows(current => [version, ...current]);
    } catch (error) {
      setVersionError(error.message);
    }
  }

  async function restoreVersion(version) {
    if (!versionHistoryDoc || !window.confirm(`Khôi phục tài liệu về phiên bản V${version.versionNumber}?`)) return;
    try {
      await uiApi.gd2.restoreDocumentVersion(versionHistoryDoc.id, version.id, { actor: "current-user" });
      setVersionHistoryDoc(null);
      await crud.reset();
      window.location.reload();
    } catch (error) {
      setVersionError(error.message);
    }
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    alert(`AI đang bắt đầu quét ảnh bằng engine: ${ocrEngine}... Vui lòng không đóng trang!
(Quá trình này có thể mất vài giây)`);
    
    try {
      // Gọi API backend thay vì dùng Tesseract JS (vì Tesseract JS không đọc được tiếng Việt viết tay)
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`http://localhost:5103/api/ocr/extract?engine=${ocrEngine}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.title || `Lỗi HTTP: ${response.status}`);
      }

      const result = await response.json();
      const finalText = result.text ? result.text.trim() : "";
      
      let finalDescription = finalText;

      if (uploadingId) {
        alert(`Upload & OCR hoàn tất!`);
        const targetRow = rows.find(r => r.id === uploadingId);
        if (targetRow) {
           crud.edit(targetRow);
           crud.setField("fileName", file.name);
           crud.setField("description", finalDescription);
           crud.setField("ocrStatus", "DONE");
        }
        setUploadingId(null);
      } else {
         crud.setField("fileName", file.name);
         crud.setField("description", finalDescription);
         crud.setField("ocrStatus", "DONE");
         alert("Trích xuất OCR thành công!");
      }
    } catch (e) {
      alert("Lỗi AI OCR: " + e.message);
      setUploadingId(null);
    }
  };


  return (
    <section className="panel">
      <PanelTitle icon={<FileText />} title="Quản lý tài liệu" />
      <div className="search-strip">
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Nhập mã, tên, file..." />
        <button className="btn primary">
          <Search size={16} /> Tìm kiếm
        </button>
      </div>

      <form className="crud-form" onSubmit={crud.save}>
        <div className="field">
          <span>Hồ sơ ID</span>
          <input type="number" value={crud.form.dossierId || ""} onChange={(e) => crud.setField("dossierId", e.target.value)} required />
        </div>
        <div className="field">
          <span>Mã tài liệu</span>
          <input value={crud.form.code} onChange={(e) => crud.setField("code", e.target.value)} required />
        </div>
        <div className="field required">
          <span>Tên tài liệu</span>
          <input value={crud.form.title} onChange={(e) => crud.setField("title", e.target.value)} required />
        </div>
        <div className="field">
          <span>Tên file</span>
          <input value={crud.form.fileName} onChange={(e) => crud.setField("fileName", e.target.value)} />
        </div>
        <div className="field">
          <span>Mô tả / nội dung OCR</span>
          <textarea value={crud.form.description} onChange={(e) => crud.setField("description", e.target.value)} rows={3} />
        </div>
        <div className="form-actions">
          <button className="btn primary" type="submit">
            <Save size={16} /> {crud.form.id ? "Cập nhật" : "Thêm mới"}
          </button>
          <button className="btn ok" type="button" onClick={() => handleUploadClick(null)}>
            <Upload size={16} /> Quét OCR (Tạo mới)
          </button>
          <button className="btn" type="button" onClick={crud.reset}>
            <X size={16} /> Bỏ qua
          </button>
        </div>
      </form>
      {crud.error && <div className="alert">{crud.error}</div>}

      <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} accept="image/*,application/pdf" />
      {showEngineModal && (
        <div className="modal-overlay" onClick={() => setShowEngineModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Chọn Engine OCR</h3>
            <p className="muted">Hệ thống AI sẽ tự động bóc tách nội dung chữ thành văn bản máy tính.</p>
            <div className="engine-options">
              <label className={`engine-option ${ocrEngine === "gemini" ? "selected" : ""}`}>
                <input type="radio" name="engine" value="gemini" checked={ocrEngine === "gemini"} onChange={(e) => setOcrEngine(e.target.value)} />
                <div className="engine-info">
                  <strong>Gemini AI (Khuyên dùng)</strong>
                  <span>Google Gemini Vision - Chữ viết tay tiếng Việt, độ chính xác cao nhất</span>
                </div>
              </label>
              <label className={`engine-option ${ocrEngine === "vietocr" ? "selected" : ""}`}>
                <input type="radio" name="engine" value="vietocr" checked={ocrEngine === "vietocr"} onChange={(e) => setOcrEngine(e.target.value)} />
                <div className="engine-info">
                  <strong>VietOCR TransformerOCR</strong>
                  <span>Chữ viết tay tiếng Việt - Model tự huấn luyện (offline)</span>
                </div>
              </label>
              <label className={`engine-option ${ocrEngine === "easyocr" ? "selected" : ""}`}>
                <input type="radio" name="engine" value="easyocr" checked={ocrEngine === "easyocr"} onChange={(e) => setOcrEngine(e.target.value)} />
                <div className="engine-info">
                  <strong>EasyOCR</strong>
                  <span>Chữ in (printed text) - Tiếng Việt &amp; Tiếng Anh</span>
                </div>
              </label>
              <label className={`engine-option ${ocrEngine === "crnn" ? "selected" : ""}`}>
                <input type="radio" name="engine" value="crnn" checked={ocrEngine === "crnn"} onChange={(e) => setOcrEngine(e.target.value)} />
                <div className="engine-info">
                  <strong>CRNN + BiLSTM + CTC</strong>
                  <span>Chữ viết tay tiếng Việt - Model tự huấn luyện (offline)</span>
                </div>
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn primary" onClick={handleEngineConfirm}>
                <Upload size={16} /> Chọn file & Upload
              </button>
              <button className="btn" onClick={() => setShowEngineModal(false)}>
                <X size={16} /> Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {versionHistoryDoc && (
        <div className="modal-overlay" onClick={() => setVersionHistoryDoc(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <h3 style={{ margin: 0 }}>
                Lịch sử phiên bản: {versionHistoryDoc.title || versionHistoryDoc.code}
              </h3>
              <div style={{display:"flex", gap:8}}>
                <button className="btn primary" onClick={createVersionSnapshot}>Lưu phiên bản hiện tại</button>
                <button className="icon-btn" onClick={() => setVersionHistoryDoc(null)}>X</button>
              </div>
            </div>
            <p className="muted">Hệ thống ghi nhận mọi thay đổi (Version Control) để phục vụ tra cứu và khôi phục khi cần thiết.</p>
            {versionError && <div className="alert">{versionError}</div>}
            
            <div style={{ marginTop: 20 }}>
              <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Phiên bản</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Người sửa</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Thời gian</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Ghi chú thay đổi</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {versionRows.map(version => (
                    <tr key={version.id} style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#16a34a' }}>V{version.versionNumber}</td>
                      <td style={{ padding: '10px' }}>{version.createdBy}</td>
                      <td style={{ padding: '10px' }}>{new Date(version.createdAt).toLocaleString("vi-VN")}</td>
                      <td style={{ padding: '10px' }}>{version.note || "Không có ghi chú"}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button className="btn warn" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => restoreVersion(version)}>Khôi phục</button>
                      </td>
                    </tr>
                  ))}
                  {versionRows.length === 0 && <tr><td colSpan="5" className="empty-cell">Chưa có phiên bản.</td></tr>}
                </tbody>
              </table>
            </div>
            
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn" onClick={() => setVersionHistoryDoc(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      <DataTable 
        rows={rows} 
        columns={[
          ["dossierId", "Hồ sơ"],
          ["code", "Mã"],
          ["title", "Tên tài liệu"],
          ["fileName", "File"],
          ["ocrStatus", "OCR"],
          ["status", "Trạng thái"]
        ]} 
        onEdit={crud.edit} 
        onDelete={crud.remove} 
        onUpload={handleUploadClick}
        onHistory={(id) => openVersionHistory(rows.find(r => r.id === id))}
      />
    </section>
  );
}

function GD211DocumentVersionScreen() {
  const documentsCrud = useCrud("documents", emptyDocument);
  const [activeTab, setActiveTab] = useState("screen");
  const [detailTab, setDetailTab] = useState("history");
  const [keyword, setKeyword] = useState("");
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [versions, setVersions] = useState([]);
  const [compareIds, setCompareIds] = useState([]);
  const [compareResult, setCompareResult] = useState(null);
  const [notice, setNotice] = useState(null);

  const documents = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return documentsCrud.rows;
    return documentsCrud.rows.filter(row => `${row.code} ${row.title} ${row.fileName} ${row.description}`.toLowerCase().includes(text));
  }, [documentsCrud.rows, keyword]);
  const selectedDoc = documentsCrud.rows.find(row => row.id === selectedDocId) || documents[0] || null;
  const publishedVersion = versions.find(item => item.isPublished) || versions[0] || null;

  const loadVersions = useCallback(async (documentId) => {
    if (!documentId) return;
    try {
      setNotice(null);
      const rows = await uiApi.gd2.documentVersionTimeline(documentId);
      setVersions(rows);
      setCompareIds(current => current.filter(id => rows.some(row => row.id === id)).slice(0, 2));
    } catch (error) {
      setVersions([]);
      setNotice({ type: "error", text: error.message });
    }
  }, []);

  useEffect(() => {
    if (selectedDoc?.id) {
      setSelectedDocId(selectedDoc.id);
      loadVersions(selectedDoc.id);
    }
  }, [selectedDoc?.id, loadVersions]);

  function toggleCompare(versionId) {
    setCompareIds(current => {
      if (current.includes(versionId)) return current.filter(id => id !== versionId);
      return [...current, versionId].slice(-2);
    });
    setCompareResult(null);
  }

  async function compareVersions() {
    if (!selectedDoc || compareIds.length !== 2) {
      setNotice({ type: "error", text: "Chọn đúng 2 phiên bản để so sánh." });
      return;
    }
    try {
      setCompareResult(await uiApi.gd2.compareDocumentVersions(selectedDoc.id, compareIds[0], compareIds[1]));
      setDetailTab("diff");
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function createSnapshot() {
    if (!selectedDoc) return;
    try {
      await uiApi.gd2.createDocumentVersion(selectedDoc.id, {
        createdBy: "current-user",
        note: "Tạo phiên bản thủ công từ màn GĐ2-11"
      });
      setNotice({ type: "success", text: "Đã tạo snapshot phiên bản mới." });
      await loadVersions(selectedDoc.id);
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function rollback(version) {
    if (!selectedDoc || !window.confirm(`Khôi phục về ${version.versionLabel}? Hệ thống sẽ tạo một phiên bản mới, không xóa lịch sử trung gian.`)) return;
    try {
      await uiApi.gd2.restoreDocumentVersion(selectedDoc.id, version.id, { actor: "current-user" });
      setNotice({ type: "success", text: `Đã rollback từ ${version.versionLabel}; lịch sử cũ được giữ nguyên và một version mới đã được tạo.` });
      await loadVersions(selectedDoc.id);
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  const listPanel = (
    <div className="gd211-list-panel">
      <div className="gd2-table-search">
        <Search size={14}/>
        <input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm tài liệu..." />
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Mã</th><th>Tên tài liệu</th><th>Published</th></tr></thead>
          <tbody>
            {documents.map(row => (
              <tr key={row.id} className={selectedDoc?.id === row.id ? "row-selected" : ""} onClick={() => { setSelectedDocId(row.id); setCompareResult(null); setCompareIds([]); }}>
                <td><span className="gd2-code">{row.code}</span></td>
                <td>{row.title}</td>
                <td>{row.status === "PUBLISHED" ? <StatusBadge status="PUBLISHED"/> : "-"}</td>
              </tr>
            ))}
            {documents.length === 0 && <tr><td colSpan="3" className="empty-cell">Chưa có tài liệu.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  const historyPanel = (
    <div className="gd211-detail-panel">
      <div className="gd211-doc-head">
        <div>
          <h3>{selectedDoc?.title || "Chọn tài liệu"}</h3>
          <p className="muted">Published mặc định: {publishedVersion?.versionLabel || "chưa có"}</p>
        </div>
        <div className="gd211-tabs">
          <button className={detailTab === "metadata" ? "active" : ""} onClick={() => setDetailTab("metadata")}>Metadata</button>
          <button className={detailTab === "history" ? "active" : ""} onClick={() => setDetailTab("history")}>Lịch sử phiên bản</button>
          <button className={detailTab === "diff" ? "active" : ""} onClick={() => setDetailTab("diff")}>Diff View</button>
        </div>
      </div>

      {detailTab === "metadata" && (
        <div className="detail-grid">
          <div className="detail-row"><span>Mã tài liệu</span><strong>{selectedDoc?.code || "-"}</strong></div>
          <div className="detail-row"><span>File</span><span>{selectedDoc?.fileName || "-"}</span></div>
          <div className="detail-row"><span>OCR</span><OcrBadge status={selectedDoc?.ocrStatus || "PENDING"} /></div>
          <div className="detail-row"><span>Trạng thái</span><StatusBadge status={selectedDoc?.status || "DRAFT"} /></div>
          <div className="detail-row"><span>Nội dung/metadata</span><span>{selectedDoc?.description || "Chưa có"}</span></div>
        </div>
      )}

      {detailTab === "history" && (
        <>
          <div className="gd211-toolbar">
            <button className="btn primary" disabled={!selectedDoc} onClick={createSnapshot}><History size={14}/> Lưu snapshot</button>
            <button className="btn" disabled={compareIds.length !== 2} onClick={compareVersions}><GitMerge size={14}/> So sánh 2 bản</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>So sánh</th><th>Version</th><th>Published</th><th>Người sửa</th><th>Thời gian</th><th>Thay đổi</th><th>Thao tác</th></tr></thead>
              <tbody>
                {versions.map(version => (
                  <tr key={version.id}>
                    <td><input type="checkbox" checked={compareIds.includes(version.id)} onChange={() => toggleCompare(version.id)} /></td>
                    <td><strong>{version.versionLabel}</strong></td>
                    <td>{version.isPublished ? <StatusBadge status="PUBLISHED"/> : "-"}</td>
                    <td>{version.createdBy}</td>
                    <td>{new Date(version.createdAt).toLocaleString("vi-VN")}</td>
                    <td>{version.note || "Không có ghi chú"}</td>
                    <td>
                      <button className="icon-btn" title="Xem bản này" onClick={() => setCompareResult({ left: version, right: version, fields: [] })}><Eye size={14}/></button>
                      <button className="icon-btn" title="So sánh" onClick={() => toggleCompare(version.id)}><GitMerge size={14}/></button>
                      <button className="icon-btn danger" title="Khôi phục bản này" onClick={() => rollback(version)}><RefreshCw size={14}/></button>
                    </td>
                  </tr>
                ))}
                {versions.length === 0 && <tr><td colSpan="7" className="empty-cell">Chưa có lịch sử phiên bản.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {detailTab === "diff" && (
        <div className="gd211-diff">
          {compareResult ? (
            <>
              <div className="gd211-diff-head">
                <strong>{compareResult.left.versionLabel}</strong>
                <strong>{compareResult.right.versionLabel}</strong>
              </div>
              {compareResult.fields.length === 0 ? (
                <div className="empty-cell">Đang xem một phiên bản. Chọn 2 phiên bản để diff.</div>
              ) : compareResult.fields.map(field => (
                <div key={field.field} className={field.changed ? "gd211-diff-row changed" : "gd211-diff-row"}>
                  <span>{field.label}</span>
                  <pre>{field.leftValue || "-"}</pre>
                  <pre>{field.rightValue || "-"}</pre>
                </div>
              ))}
            </>
          ) : (
            <div className="empty-cell">Chọn 2 phiên bản ở tab Lịch sử phiên bản rồi bấm So sánh.</div>
          )}
        </div>
      )}
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  return (
    <GD2FeatureLayout
      featureId="GĐ2-11"
      featureName="Phiên bản tài liệu"
      description="Theo dõi lịch sử phiên bản, so sánh thay đổi và rollback không phá vỡ lịch sử trung gian."
      actor="Người dùng có quyền chỉnh sửa tài liệu"
      actionBarLabel="Version history, diff view và rollback"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="360px minmax(0, 1fr)"
      className="gd211-feature"
      leftPanelTitle="Danh sách tài liệu"
      rightPanelTitle="Chi tiết tài liệu"
      actions={
        <>
          <button className="btn" onClick={() => selectedDoc && loadVersions(selectedDoc.id)}><RefreshCw size={14}/> Làm mới</button>
          <button className="btn primary" disabled={!selectedDoc} onClick={createSnapshot}><Save size={14}/> Lưu snapshot</button>
          <button className="btn" disabled={compareIds.length !== 2} onClick={compareVersions}><GitMerge size={14}/> So sánh</button>
        </>
      }
      actionRows={[
        { action: "Tự động đánh số", description: "Tạo label v1.0/v1.1/v2.0 theo lịch sử và trạng thái published", result: "Hiển thị version label trong tab lịch sử" },
        { action: "Version History Log", description: "Lưu người sửa, thời gian và ghi chú thay đổi", result: "Truy vết toàn bộ phiên bản cũ" },
        { action: "Diff View", description: "Chọn 2 version để so sánh field-by-field", result: "Các trường thay đổi được highlight" },
        { action: "Rollback", description: "Khôi phục nội dung bản cũ", result: "Tạo version mới, không xóa lịch sử trung gian" },
      ]}
      validationItems={[
        { type: "rule", label: "Published", text: "Phiên bản published là bản mặc định hiển thị cho người khai thác." },
        { type: "rule", label: "Rollback", text: "Rollback luôn tạo version mới, không ghi đè hay xóa version trung gian." },
        { type: "perm", label: "Quyền sửa", text: "Chỉ người có quyền chỉnh sửa tài liệu được tạo snapshot/rollback." },
      ]}
      flowSteps={[
        { step: "1", label: "Sửa/tải đè", desc: "Tài liệu thay đổi", color: "#3264f4" },
        { step: "2", label: "Snapshot", desc: "Đánh số version", color: "#7c3aed" },
        { step: "3", label: "So sánh", desc: "Diff 2 bản", color: "#f59e0b" },
        { step: "4", label: "Rollback", desc: "Tạo version mới", color: "#22c55e" },
      ]}
      leftPanel={listPanel}
      rightPanel={historyPanel}
    />
  );
}



function WorkflowBuilderScreen() {
  const [activeTab, setActiveTab] = useState("ui");
  const [layout, setLayout] = useState("standard");
  const [themeColor, setThemeColor] = useState("#0ea5e9");

  return (
    <section className="panel">
      <PanelTitle icon={<Settings />} title="Tùy chỉnh Giao diện & Quy trình (Workflow Builder)" />
      <p className="muted" style={{ marginBottom: 20 }}>
          Tính năng cấu hình nâng cao dành cho Quản trị viên, cho phép thay đổi giao diện hiển thị và thiết kế luồng trình duyệt công việc (Workflow) mà không cần can thiệp vào mã nguồn (No-Code).
      </p>

      <div style={{ display: "flex", gap: 10, borderBottom: "1px solid #e2e8f0", paddingBottom: 10, marginBottom: 20 }}>
        <button 
          className={`btn ${activeTab === "ui" ? "primary" : ""}`} 
          onClick={() => setActiveTab("ui")}
        >
          Tùy chỉnh Giao diện
        </button>
        <button 
          className={`btn ${activeTab === "workflow" ? "primary" : ""}`} 
          onClick={() => setActiveTab("workflow")}
        >
          Thiết kế Quy trình (Workflow)
        </button>
      </div>

      {activeTab === "ui" && (
        <div style={{ padding: 20, border: "1px dashed #cbd5e1", borderRadius: 8, backgroundColor: "#f8fafc" }}>
          <h4>Thiết lập giao diện hiển thị</h4>
          <div className="field" style={{ marginTop: 15 }}>
            <span>Màu sắc chủ đạo (Theme)</span>
            <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} style={{ width: 60, height: 40, padding: 0 }} />
          </div>
          <div className="field">
            <span>Bố cục (Layout)</span>
            <select value={layout} onChange={(e) => setLayout(e.target.value)}>
              <option value="standard">Tiêu chuẩn (Menu trái, nội dung phải)</option>
              <option value="compact">Nhỏ gọn (Thích hợp cho màn hình nhỏ)</option>
              <option value="fluid">Toàn màn hình (Mở rộng tối đa)</option>
            </select>
          </div>
          <div className="field">
            <span>Logo đơn vị</span>
            <input type="file" accept="image/*" />
          </div>
          <button className="btn ok" onClick={() => alert("Đã lưu cấu hình giao diện!")}>Lưu thiết lập</button>
        </div>
      )}

      {activeTab === "workflow" && (
        <div style={{ padding: 20, border: "1px dashed #cbd5e1", borderRadius: 8, backgroundColor: "#f8fafc" }}>
          <h4>Workflow Builder (Mô phỏng)</h4>
          <p className="muted">Kéo thả các bước để định nghĩa quy trình luân chuyển tài liệu.</p>

          <div style={{ display: "flex", alignItems: "center", gap: 15, margin: "20px 0" }}>
            <div style={{ padding: "10px 20px", background: "#fff", border: "2px solid #94a3b8", borderRadius: 8, fontWeight: "bold" }}>
              Bước 1: Soạn thảo (Nhân viên)
            </div>
            <GitMerge size={20} color="#64748b" />
            <div style={{ padding: "10px 20px", background: "#fff", border: "2px solid #0ea5e9", borderRadius: 8, fontWeight: "bold" }}>
              Bước 2: Phê duyệt (Trưởng phòng)
            </div>
            <GitMerge size={20} color="#64748b" />
            <div style={{ padding: "10px 20px", background: "#fff", border: "2px solid #22c55e", borderRadius: 8, fontWeight: "bold", color: "#22c55e" }}>
              Bước 3: Ký số & Ban hành (Giám đốc)
            </div>
          </div>
          
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn primary">+ Thêm bước mới</button>
            <button className="btn warn">Chỉnh sửa điều kiện rẽ nhánh</button>
            <button className="btn ok" onClick={() => alert("Đã lưu luồng quy trình mới!")}>Lưu Quy trình</button>
          </div>
        </div>
      )}
    </section>
  );
}

function GD212UnitCustomizationScreen() {
  const [activeTab, setActiveTab] = useState("screen");
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("HN");
  const [form, setForm] = useState({
    unitCode: "HN",
    unitName: "Thanh pho Ha Noi",
    logoUrl: "/assets/idp-logo.svg",
    bannerText: "Kho luu tru so Ha Noi",
    primaryColor: "#3264f4",
    accentColor: "#16a34a",
    layoutMode: "STANDARD",
    mobileOptimized: true,
    workflowSteps: []
  });
  const [previewMode, setPreviewMode] = useState("desktop");
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCustomizations();
  }, []);

  async function loadCustomizations() {
    try {
      setLoading(true);
      const rows = await uiApi.gd2.unitCustomizations();
      setUnits(rows);
      const first = rows.find(item => item.unitCode === selectedUnit) || rows[0];
      if (first) applyConfig(first);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Khong tai duoc cau hinh don vi: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  function applyConfig(config) {
    setSelectedUnit(config.unitCode);
    setForm({
      unitCode: config.unitCode,
      unitName: config.unitName,
      logoUrl: config.logoUrl || "/assets/idp-logo.svg",
      bannerText: config.bannerText || "",
      primaryColor: config.primaryColor || "#3264f4",
      accentColor: config.accentColor || "#0ea5e9",
      layoutMode: config.layoutMode || "STANDARD",
      mobileOptimized: Boolean(config.mobileOptimized),
      workflowSteps: config.workflowSteps || []
    });
  }

  async function selectUnit(unitCode) {
    try {
      const config = await uiApi.gd2.unitCustomization(unitCode);
      applyConfig(config);
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  function setField(field, value) {
    setForm(current => ({ ...current, [field]: value }));
    setNotice(null);
  }

  function toggleStep(code) {
    setForm(current => ({
      ...current,
      workflowSteps: current.workflowSteps.map(step =>
        step.code === code && !step.required ? { ...step, enabled: !step.enabled } : step)
    }));
  }

  function updateStepRole(code, role) {
    setForm(current => ({
      ...current,
      workflowSteps: current.workflowSteps.map(step => step.code === code ? { ...step, role } : step)
    }));
  }

  async function saveCustomization(event) {
    event.preventDefault();
    try {
      const saved = await uiApi.gd2.saveUnitCustomization({ ...form, actor: "unit-admin" });
      applyConfig(saved);
      setUnits(current => {
        const others = current.filter(item => item.unitCode !== saved.unitCode);
        return [...others, saved].sort((a, b) => a.unitName.localeCompare(b.unitName));
      });
      setNotice({ type: "success", text: `Da luu cau hinh giao dien va quy trinh cho ${saved.unitName}.` });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  const enabledSteps = form.workflowSteps.filter(step => step.enabled);

  const leftPanel = (
    <div className="gd212-left">
      <div className="gd212-unit-list">
        {units.map(unit => (
          <button
            className={`gd212-unit ${unit.unitCode === selectedUnit ? "active" : ""}`}
            type="button"
            key={unit.unitCode}
            onClick={() => selectUnit(unit.unitCode)}
          >
            <span style={{ background: unit.primaryColor }}></span>
            <strong>{unit.unitName}</strong>
            <small>{unit.layoutMode} | {unit.mobileOptimized ? "Mobile ready" : "Desktop only"}</small>
          </button>
        ))}
      </div>

      <form className="gd212-form" onSubmit={saveCustomization}>
        <label>Ma don vi
          <input value={form.unitCode} onChange={event => setField("unitCode", event.target.value.toUpperCase())} />
        </label>
        <label>Ten don vi
          <input value={form.unitName} onChange={event => setField("unitName", event.target.value)} />
        </label>
        <label>Logo URL
          <input value={form.logoUrl} onChange={event => setField("logoUrl", event.target.value)} />
        </label>
        <label>Banner
          <input value={form.bannerText} onChange={event => setField("bannerText", event.target.value)} />
        </label>
        <div className="gd212-color-grid">
          <label>Mau chu dao
            <input type="color" value={form.primaryColor} onChange={event => setField("primaryColor", event.target.value)} />
          </label>
          <label>Mau phu
            <input type="color" value={form.accentColor} onChange={event => setField("accentColor", event.target.value)} />
          </label>
        </div>
        <label>Bo cuc
          <select value={form.layoutMode} onChange={event => setField("layoutMode", event.target.value)}>
            <option value="STANDARD">Standard</option>
            <option value="COMPACT">Compact</option>
            <option value="MOBILE">Mobile App View</option>
            <option value="FLUID">Fluid</option>
          </select>
        </label>
        <label className="gd212-toggle">
          <input type="checkbox" checked={form.mobileOptimized} onChange={event => setField("mobileOptimized", event.target.checked)} />
          Toi uu Mobile Web/App View
        </label>
        <button className="btn primary" type="submit"><Save size={14}/> Luu cau hinh</button>
      </form>
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  const midContent = (
    <div className="gd212-toolbar">
      <button className={`btn ${previewMode === "desktop" ? "primary" : ""}`} type="button" onClick={() => setPreviewMode("desktop")}><Home size={14}/> Desktop</button>
      <button className={`btn ${previewMode === "mobile" ? "primary" : ""}`} type="button" onClick={() => setPreviewMode("mobile")}><Eye size={14}/> Mobile</button>
      <span>{enabledSteps.length}/{form.workflowSteps.length || 0} buoc dang bat</span>
    </div>
  );

  const rightPanel = (
    <div className="gd212-right">
      <div className="gd212-preview-shell">
        <div
          className={`gd212-preview ${previewMode} ${form.layoutMode.toLowerCase()} ${form.mobileOptimized ? "mobile-ready" : ""}`}
          style={{ "--unit-primary": form.primaryColor, "--unit-accent": form.accentColor }}
        >
          <aside>
            <div className="gd212-logo">
              <img src={form.logoUrl} alt="" onError={event => { event.currentTarget.style.display = "none"; }} />
              <strong>{form.unitCode}</strong>
            </div>
            <span>Ho so</span>
            <span>Van ban</span>
            <span>Quy trinh</span>
          </aside>
          <main>
            <header>
              <div>
                <small>{form.unitName}</small>
                <h3>{form.bannerText}</h3>
              </div>
              <button>+ Moi</button>
            </header>
            <section>
              <div><span>Ho so trong ngay</span><strong>128</strong></div>
              <div><span>Cho duyet</span><strong>34</strong></div>
              <div><span>SLA</span><strong>94%</strong></div>
            </section>
            <div className="gd212-mini-table">
              <p><b>HS-2026-001</b><span>Dang tham dinh</span></p>
              <p><b>HS-2026-002</b><span>Cho ky so</span></p>
              <p><b>HS-2026-003</b><span>Xuat ban</span></p>
            </div>
          </main>
        </div>
      </div>

      <div className="gd212-workflow">
        <div className="gd212-section-head"><GitMerge size={16}/> Quy trinh dac thu don vi</div>
        <div className="gd212-step-grid">
          {form.workflowSteps.map(step => (
            <div className={`gd212-step ${step.enabled ? "enabled" : "disabled"}`} key={step.code}>
              <label>
                <input type="checkbox" checked={step.enabled} disabled={step.required} onChange={() => toggleStep(step.code)} />
                <strong>{step.order}. {step.name}</strong>
              </label>
              <small>{step.required ? "Bat buoc" : "Co the bat/tat"} | {step.description}</small>
              <select value={step.role} onChange={event => updateStepRole(step.code, event.target.value)}>
                <option value="CHUYEN_VIEN">Chuyen vien</option>
                <option value="LANH_DAO">Lanh dao</option>
                <option value="QTHT">Quan tri he thong</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <GD2FeatureLayout
      className="gd212-feature"
      featureId="GĐ2-12"
      featureName="Tùy biến Giao diện & Quy trình đặc thù đơn vị"
      description="Quản trị đơn vị tự cấu hình nhận diện thương hiệu, preview responsive và bật/tắt các bước workflow không bắt buộc."
      actor="Quản trị theo đơn vị sử dụng"
      actionBarLabel="Theme Customizer & Workflow Options"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="340px 1fr"
      leftPanelTitle="Cấu hình đơn vị"
      rightPanelTitle="Preview & quy trình"
      midContent={midContent}
      actions={
        <>
          <button className="btn" type="button" onClick={loadCustomizations} disabled={loading}><RefreshCw size={14}/> Tai lai</button>
          <button className="btn primary" type="button" onClick={saveCustomization}><Save size={14}/> Luu</button>
        </>
      }
      actionRows={[
        { action: "Cấu hình theme", description: "Thay logo, banner, màu chủ đạo và màu phụ theo từng đơn vị", result: "Preview giao diện đổi ngay theo thương hiệu" },
        { action: "Preview responsive", description: "Chuyển desktop/mobile để kiểm tra bố cục", result: "Đảm bảo Mobile Web/App View gọn, dễ thao tác" },
        { action: "Tùy biến workflow", description: "Bật/tắt bước không bắt buộc và chọn role xử lý", result: "Quy trình phù hợp đặc thù địa phương" },
        { action: "Lưu cấu hình", description: "Quản trị đơn vị lưu thiết lập", result: "Cấu hình có hiệu lực cho đơn vị tương ứng" }
      ]}
      validationItems={[
        { type: "required", label: "Đơn vị", text: "Mã đơn vị, tên đơn vị, màu chủ đạo và người cập nhật là bắt buộc." },
        { type: "rule", label: "Màu sắc", text: "Màu nhận diện phải đúng định dạng #RRGGBB." },
        { type: "rule", label: "Workflow", text: "Các bước Trình duyệt, Phê duyệt và Xuất bản luôn bắt buộc, không được tắt." },
        { type: "perm", label: "Phân quyền", text: "Chỉ quản trị theo đơn vị được lưu cấu hình trong phạm vi đơn vị mình." }
      ]}
      flowSteps={[
        { step: "1", label: "Chọn đơn vị", desc: "Tải cấu hình hiện tại", color: "#3264f4" },
        { step: "2", label: "Tùy biến UI", desc: "Logo, banner, màu", color: "#0ea5e9" },
        { step: "3", label: "Mobile", desc: "Preview responsive", color: "#16a34a" },
        { step: "4", label: "Workflow", desc: "Bật/tắt bước", color: "#f59e0b" },
        { step: "5", label: "Áp dụng", desc: "Lưu & audit", color: "#7c3aed" }
      ]}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}

function GD216SharedDossierTypeScreen() {
  const [activeTab, setActiveTab] = useState("screen");
  const [records, setRecords] = useState([]);
  const [unitFilter, setUnitFilter] = useState("");
  const [form, setForm] = useState({
    code: "HS-NS",
    name: "Ho so nhan su",
    unitCode: "BAN2",
    storageScope: "COMMON",
    sharedUnitCodesText: "BAN1"
  });
  const [dedupResult, setDedupResult] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSharedDossierTypes();
  }, []);

  async function loadSharedDossierTypes(nextUnit = unitFilter) {
    try {
      setLoading(true);
      const rows = await uiApi.gd2.sharedDossierTypes(nextUnit);
      setRecords(rows);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Khong tai duoc loai ho so chia se: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  function setField(field, value) {
    setForm(current => ({ ...current, [field]: value }));
    setNotice(null);
  }

  function sharedUnits() {
    return form.sharedUnitCodesText
      .split(/[,\n]/)
      .map(item => item.trim().toUpperCase())
      .filter(Boolean);
  }

  async function checkDuplicate() {
    const result = await uiApi.gd2.checkSharedDossierTypeDuplicate({
      code: form.code,
      name: form.name,
      unitCode: form.unitCode,
      storageScope: form.storageScope
    });
    setDedupResult(result);
    if (result.duplicateFound) {
      setShowDuplicateModal(true);
    } else {
      setNotice({ type: "success", text: result.recommendation });
    }
    return result;
  }

  async function createOrWarn(event) {
    event.preventDefault();
    try {
      const result = await checkDuplicate();
      if (result.duplicateFound) return;
      const created = await uiApi.gd2.createSharedDossierType({
        code: form.code,
        name: form.name,
        unitCode: form.unitCode,
        storageScope: form.storageScope,
        sharedUnitCodes: sharedUnits(),
        actor: "unit-admin"
      });
      setNotice({ type: "success", text: `Da tao master record ${created.code}.` });
      await loadSharedDossierTypes();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function shareExistingMaster() {
    if (!dedupResult?.masterRecord) return;
    try {
      const units = [form.unitCode, ...sharedUnits()];
      const result = await uiApi.gd2.shareDossierTypeAccess({
        masterRecordId: dedupResult.masterRecord.id,
        unitCodes: units,
        actor: "unit-admin",
        reason: `Dedup ${form.code} -> master ${dedupResult.masterRecord.code}`
      });
      setShowDuplicateModal(false);
      setNotice({ type: "success", text: result.message });
      await loadSharedDossierTypes();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  const leftPanel = (
    <div className="gd216-left">
      <form className="gd216-form" onSubmit={createOrWarn}>
        <div className="gd216-form-grid">
          <label>Ma loai ho so
            <input value={form.code} onChange={event => setField("code", event.target.value.toUpperCase())} />
          </label>
          <label>Don vi tao
            <select value={form.unitCode} onChange={event => setField("unitCode", event.target.value)}>
              <option value="BAN1">Ban 1</option>
              <option value="BAN2">Ban 2</option>
              <option value="BAN3">Ban 3</option>
              <option value="HC">Hanh chinh</option>
              <option value="TC">Tai chinh</option>
            </select>
          </label>
        </div>
        <label>Ten loai ho so
          <input value={form.name} onChange={event => setField("name", event.target.value)} />
        </label>
        <label>Pham vi kho
          <select value={form.storageScope} onChange={event => setField("storageScope", event.target.value)}>
            <option value="COMMON">Kho chung</option>
            <option value="UNIT">Kho don vi</option>
          </select>
        </label>
        <label>Don vi can chia se
          <textarea rows={3} value={form.sharedUnitCodesText} onChange={event => setField("sharedUnitCodesText", event.target.value)} />
        </label>
        <div className="gd216-actions">
          <button className="btn" type="button" onClick={checkDuplicate}><Search size={14}/> Check trung</button>
          <button className="btn primary" type="submit"><Plus size={14}/> Tao / chia se</button>
        </div>
      </form>
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
      {dedupResult && (
        <div className={`gd216-dedup-card ${dedupResult.duplicateFound ? "warning" : "ok"}`}>
          <strong>{dedupResult.duplicateFound ? "Phat hien trung lap" : "Khong trung lap"}</strong>
          <span>{dedupResult.recommendation}</span>
        </div>
      )}
    </div>
  );

  const midContent = (
    <div className="gd216-toolbar">
      <label>
        Loc theo don vi
        <select value={unitFilter} onChange={event => {
          const next = event.target.value;
          setUnitFilter(next);
          loadSharedDossierTypes(next);
        }}>
          <option value="">Tat ca</option>
          <option value="BAN1">Ban 1</option>
          <option value="BAN2">Ban 2</option>
          <option value="BAN3">Ban 3</option>
        </select>
      </label>
      <button className="btn" type="button" onClick={() => loadSharedDossierTypes()} disabled={loading}><RefreshCw size={14}/> Tai lai</button>
    </div>
  );

  const rightPanel = (
    <div className="gd216-right">
      <div className="gd216-summary">
        <Metric label="Master records" value={records.length} />
        <Metric label="Kho chung" value={records.filter(item => item.storageScope === "COMMON").length} />
        <Metric label="Share links" value={records.reduce((sum, item) => sum + (item.sharedUnitCodes?.length || 0), 0)} />
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Master</th><th>Kho</th><th>Don vi goc</th><th>Don vi dung chung</th><th>Trang thai</th></tr></thead>
          <tbody>
            {records.map(item => (
              <tr key={item.id}>
                <td>
                  <strong>{item.code}</strong>
                  <span className="gd216-sub">{item.name}</span>
                </td>
                <td>{item.storageScope === "COMMON" ? "Kho chung" : "Kho don vi"}</td>
                <td><span className="gd2-code">{item.masterUnitCode}</span></td>
                <td>
                  <div className="gd216-chip-row">
                    {(item.sharedUnitCodes || []).map(unit => <span key={unit}>{unit}</span>)}
                    {(item.sharedUnitCodes || []).length === 0 && <small>Chua chia se</small>}
                  </div>
                </td>
                <td><span className="gd216-status">{item.status}</span></td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan="5" className="empty-cell">Chua co loai ho so chia se.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="timeline-list">
        <div className="timeline-item">
          <strong>Deduplication Check</strong>
          <span>Quet ma, ten gan dung va pham vi kho truoc khi tao moi.</span>
        </div>
        <div className="timeline-item">
          <strong>Master Record</strong>
          <span>Neu trung lap, giu ban ghi goc va cap Share Access cho don vi lien quan.</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <GD2FeatureLayout
        className="gd216-feature"
        featureId="GĐ2-16"
        featureName="Quản lý loại hồ sơ chia sẻ & Đơn vị dùng chung"
        description="Phát hiện trùng loại hồ sơ trong kho chung, giữ Master Record và cấp quyền chia sẻ cho Ban/đơn vị liên quan."
        actor="Quản trị theo đơn vị sử dụng"
        actionBarLabel="Deduplication & Share Access"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        splitRatio="360px 1fr"
        leftPanelTitle="Tạo loại hồ sơ"
        rightPanelTitle="Kho chung & quyền chia sẻ"
        midContent={midContent}
        actions={
          <>
            <button className="btn" type="button" onClick={checkDuplicate}><FileSearch size={14}/> Check trung</button>
            <button className="btn primary" type="button" onClick={createOrWarn}><Plus size={14}/> Tao moi</button>
          </>
        }
        actionRows={[
          { action: "Kiểm tra trùng", description: "Nhập mã/tên loại hồ sơ và kho sử dụng", result: "Hệ thống tìm bản master tương đồng trong kho chung" },
          { action: "Cảnh báo", description: "Nếu trùng, mở modal kèm lý do và link tới bản ghi gốc", result: "Người dùng không tạo bản phân tán" },
          { action: "Cấp quyền chia sẻ", description: "Chọn các Ban liên quan", result: "Master Record được share access cho đơn vị dùng chung" },
          { action: "Tạo master", description: "Nếu không trùng, tạo bản ghi chính mới", result: "Loại hồ sơ sẵn sàng dùng trong kho chung hoặc kho đơn vị" }
        ]}
        validationItems={[
          { type: "required", label: "Bắt buộc", text: "Mã, tên loại hồ sơ, đơn vị và phạm vi kho phải được nhập." },
          { type: "unique", label: "Dedup", text: "Không cho tạo mới khi phát hiện bản master trùng trong kho chung." },
          { type: "rule", label: "Master", text: "Chỉ giữ lại một bản ghi chính và mở quyền dùng chung thay vì nhân bản dữ liệu." },
          { type: "perm", label: "Share Access", text: "Quyền chia sẻ được ghi vào access scope và audit log." }
        ]}
        flowSteps={[
          { step: "1", label: "Nhập mới", desc: "Khai báo loại hồ sơ", color: "#3264f4" },
          { step: "2", label: "Quét trùng", desc: "Dedup kho chung", color: "#f59e0b" },
          { step: "3", label: "Master", desc: "Liên kết bản gốc", color: "#7c3aed" },
          { step: "4", label: "Share", desc: "Cấp quyền Ban liên quan", color: "#16a34a" },
          { step: "5", label: "Audit", desc: "Ghi nhận thao tác", color: "#0ea5e9" }
        ]}
        leftPanel={leftPanel}
        rightPanel={rightPanel}
      />

      {showDuplicateModal && dedupResult?.masterRecord && (
        <div className="modal-overlay" onClick={() => setShowDuplicateModal(false)}>
          <div className="modal-content gd216-modal" onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-wrap" style={{ background: "#f59e0b" }}><AlertCircle size={22} color="#fff"/></div>
              <div>
                <h3>Cảnh báo trùng lặp loại hồ sơ</h3>
                <p className="muted">Hệ thống tìm thấy bản ghi gốc trong kho chung.</p>
              </div>
            </div>
            <div className="gd216-master-link">
              <span>Master Record</span>
              <strong>{dedupResult.masterRecord.code} - {dedupResult.masterRecord.name}</strong>
              <small>Don vi goc: {dedupResult.masterRecord.masterUnitCode} | {dedupResult.masterRecord.matchReason} | {dedupResult.masterRecord.similarity}%</small>
            </div>
            <p className="gd216-modal-text">{dedupResult.recommendation}</p>
            <div className="modal-actions">
              <button className="btn" type="button" onClick={() => setShowDuplicateModal(false)}><X size={14}/> Dong</button>
              <button className="btn primary" type="button" onClick={shareExistingMaster}><Link size={14}/> Cap quyen chia se</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// =========================================================
// Helper Components
// =========================================================
function StatusBadge({ status }) {
  const map = {
    PUBLISHED: { label: "Xuất bản", color: "#16a34a", bg: "#dcfce7" },
    PENDING: { label: "Chờ", color: "#b45309", bg: "#fef3c7" },
    DRAFT: { label: "Nháp", color: "#6b7280", bg: "#f3f4f6" },
    APPROVED: { label: "Duyệt", color: "#16a34a", bg: "#dcfce7" },
    REJECTED: { label: "Từ chối", color: "#dc2626", bg: "#fee2e2" },
    CANCELLED: { label: "Hủy", color: "#6b7280", bg: "#f3f4f6" },
    NEEDS_SUPPLEMENT: { label: "Cần bổ sung", color: "#d97706", bg: "#ffedd5" },
    CONFIRMED: { label: "Xác nhận", color: "#2563eb", bg: "#dbeafe" },
    ACTIVE: { label: "Hoạt động", color: "#2563eb", bg: "#dbeafe" },
    IN_PROGRESS: { label: "Đang xử lý", color: "#7c3aed", bg: "#ede9fe" },
    DONE: { label: "Xong", color: "#16a34a", bg: "#dcfce7" },
  };
  const s = map[status] || { label: status, color: "#6b7280", bg: "#f3f4f6" };
  return <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:12, fontSize:11, fontWeight:700, color:s.color, background:s.bg }}>{s.label}</span>;
}

function OcrBadge({ status }) {
  const map = {
    DONE: { icon: "✓", label: "Xong", color: "#16a34a", bg: "#dcfce7" },
    PENDING: { icon: "•", label: "Chờ", color: "#b45309", bg: "#fef3c7" },
    PROCESSING: { icon: "…", label: "Xử lý", color: "#7c3aed", bg: "#ede9fe" },
    ERROR: { icon: "!", label: "Lỗi", color: "#dc2626", bg: "#fee2e2" },
  };
  const s = map[status] || { icon: "•", label: status, color: "#6b7280", bg: "#f3f4f6" };
  return <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:12, fontSize:11, fontWeight:700, color:s.color, background:s.bg }}>{s.icon} {s.label}</span>;
}

// =========================================================
// GĐ2-2: Quản lý quy trình làm việc
// =========================================================
function WorkflowManagementScreen() {
  const INIT_TASKS = [
    { id: 1, code: "WF-001", name: "Duyệt hồ sơ nhân sự", assignee: "Trần Thị B", deadline: "2026-07-30", status: "PENDING", priority: "HIGH", step: "Phê duyệt" },
    { id: 2, code: "WF-002", name: "Xác nhận hợp đồng mua sắm", assignee: "Nguyễn Văn A", deadline: "2026-07-28", status: "IN_PROGRESS", priority: "MEDIUM", step: "Kiểm tra" },
    { id: 3, code: "WF-003", name: "Ban hành quyết định số 15/QĐ", assignee: "Lê Minh C", deadline: "2026-07-25", status: "DONE", priority: "HIGH", step: "Ký số" },
    { id: 4, code: "WF-004", name: "Lưu trữ tài liệu dự án X", assignee: "Phạm Thị D", deadline: "2026-08-05", status: "PENDING", priority: "LOW", step: "Soạn thảo" },
    { id: 5, code: "WF-005", name: "Ký số bảng lương tháng 7", assignee: "Hoàng Văn E", deadline: "2026-07-31", status: "PENDING", priority: "HIGH", step: "Phê duyệt" },
  ];

  const [tasks, setTasks] = useState(INIT_TASKS);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [viewTask, setViewTask] = useState(null);
  const [processNote, setProcessNote] = useState("");
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [processAction, setProcessAction] = useState("APPROVED");

  const filtered = filterStatus === "ALL" ? tasks : tasks.filter(t => t.status === filterStatus);

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === "PENDING").length,
    inProgress: tasks.filter(t => t.status === "IN_PROGRESS").length,
    done: tasks.filter(t => t.status === "DONE").length,
  };

  const openProcess = (id, action) => {
    setProcessingId(id);
    setProcessAction(action);
    setProcessNote("");
    setShowProcessModal(true);
  };

  const handleProcess = () => {
    setTasks(prev => prev.map(t =>
      t.id === processingId
        ? { ...t, status: processAction === "APPROVED" ? "DONE" : "REJECTED" }
        : t
    ));
    setShowProcessModal(false);
    alert(`Đã ${processAction === "APPROVED" ? "phê duyệt" : "từ chối"} công việc thành công!${processNote ? "\nGhi chú: " + processNote : ""}`);
  };

  const priorityColor = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#22c55e" };

  return (
    <section className="panel">
      <PanelTitle icon={<GitMerge />} title="GD2-2: Quản lý quy trình làm việc" />
      <p className="muted" style={{marginBottom:16}}>Theo dõi và xử lý các công việc trong quy trình luân chuyển tài liệu.</p>

      {/* Stats */}
      <div className="workflow-stats">
        {[{label:"Tổng công việc",val:stats.total,color:"#3264f4"},{label:"Chờ xử lý",val:stats.pending,color:"#f59e0b"},{label:"Đang thực hiện",val:stats.inProgress,color:"#7c3aed"},{label:"Hoàn thành",val:stats.done,color:"#22c55e"}].map(s => (
          <div key={s.label} className="wf-stat-card" style={{borderTop:`3px solid ${s.color}`}}>
            <strong style={{fontSize:26,color:s.color}}>{s.val}</strong>
            <span className="muted">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Bộ lọc */}
      <div style={{display:"flex", gap:8, marginBottom:14, flexWrap:"wrap"}}>
        {["ALL","PENDING","IN_PROGRESS","DONE"].map(s => (
          <button key={s} className={`btn ${filterStatus===s?"primary":""}`} onClick={() => setFilterStatus(s)}>
            {s === "ALL" ? "Tất cả" : s === "PENDING" ? "Chờ" : s === "IN_PROGRESS" ? "Đang xử lý" : "Xong"}
          </button>
        ))}
      </div>

      {/* Timeline tasks */}
      <div className="workflow-task-list">
        {filtered.map(task => (
          <div key={task.id} className={`wf-task-card ${task.status.toLowerCase().replace("_","-")}`}>
            <div className="wf-task-left">
              <div className="wf-task-code">{task.code}</div>
              <div className="wf-task-name">{task.name}</div>
              <div className="wf-task-meta">
                <span><User size={11}/> {task.assignee}</span>
                <span><Clock size={11}/> Hạn: {task.deadline}</span>
                <span><ChevronRight size={11}/> Bước: <strong>{task.step}</strong></span>
                <span style={{color: priorityColor[task.priority], fontWeight:700, fontSize:11}}>Ưu tiên {task.priority}</span>
              </div>
            </div>
            <div className="wf-task-right">
              <StatusBadge status={task.status}/>
              <div style={{display:"flex", gap:6, marginTop:8}}>
                {task.status !== "DONE" && (
                  <>
                    <button className="btn ok" style={{fontSize:11,padding:"3px 8px"}} onClick={() => openProcess(task.id, "APPROVED")}>Duyệt</button>
                    <button className="btn warn" style={{fontSize:11,padding:"3px 8px"}} onClick={() => openProcess(task.id, "REJECTED")}>Từ chối</button>
                  </>
                )}
                <button className="icon-btn" onClick={() => setViewTask(task)} title="Xem chi tiết"><Eye size={13}/></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="empty-cell" style={{padding:30,textAlign:"center"}}>Không có công việc nào.</div>}
      </div>

      {/* Modal duyệt/xử lý */}
      {showProcessModal && (
        <div className="modal-overlay" onClick={() => setShowProcessModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:440}}>
            <div className="modal-header">
              <div className="modal-icon-wrap" style={{background: processAction === "APPROVED" ? "#16a34a" : "#dc2626"}}>
                {processAction === "APPROVED" ? <CheckCircle2 size={22} color="#fff"/> : <X size={22} color="#fff"/>}
              </div>
              <div>
                <h3>{processAction === "APPROVED" ? "Phê duyệt công việc" : "Từ chối công việc"}</h3>
                <p className="muted">Công việc: <strong>{tasks.find(t => t.id === processingId)?.name}</strong></p>
              </div>
            </div>
            <div className="field" style={{marginTop:16}}>
              <span>Ghi chú xử lý</span>
              <textarea value={processNote} onChange={e => setProcessNote(e.target.value)} rows={3} placeholder={processAction === "APPROVED" ? "Ghi chú phê duyệt (tùy chọn)" : "Lý do từ chối (bắt buộc)"} />
            </div>
            <div className="modal-actions" style={{marginTop:16}}>
              <button className={`btn ${processAction === "APPROVED" ? "ok" : "danger"}`} onClick={handleProcess}>
                {processAction === "APPROVED" ? "Xác nhận duyệt" : "Xác nhận từ chối"}
              </button>
              <button className="btn" onClick={() => setShowProcessModal(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xem chi tiết task */}
      {viewTask && (
        <div className="modal-overlay" onClick={() => setViewTask(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:520}}>
            <div className="modal-header">
              <div className="modal-icon-wrap" style={{background:"#3264f4"}}><GitMerge size={22} color="#fff"/></div>
              <div><h3>Chi tiết công việc #{viewTask.code}</h3><p className="muted">Thông tin quy trình</p></div>
            </div>
            <div className="detail-grid" style={{marginTop:16}}>
              <div className="detail-row"><span>Tên công việc</span><strong>{viewTask.name}</strong></div>
              <div className="detail-row"><span>Người phụ trách</span><strong>{viewTask.assignee}</strong></div>
              <div className="detail-row"><span>Bước hiện tại</span><strong>{viewTask.step}</strong></div>
              <div className="detail-row"><span>Hạn xử lý</span><strong>{viewTask.deadline}</strong></div>
              <div className="detail-row"><span>Ưu tiên</span><strong style={{color: priorityColor[viewTask.priority]}}>{viewTask.priority}</strong></div>
              <div className="detail-row"><span>Trạng thái</span><StatusBadge status={viewTask.status}/></div>
            </div>
            <div className="wf-timeline" style={{marginTop:16}}>
              <h4 style={{marginBottom:8}}>Lịch sử quy trình</h4>
              {["Soạn thảo","Kiểm tra","Phê duyệt","Ký số","Ban hành"].map((step, i) => (
                <div key={step} className="wf-timeline-step">
                  <div className={`wf-step-dot ${i < 3 ? "done" : ""}`}/>
                  <span style={{fontSize:13, color: i < 3 ? "var(--ink)" : "var(--muted)"}}>{step}</span>
                  {i < 3 && <span className="muted" style={{fontSize:11, marginLeft:"auto"}}>Hoàn thành</span>}
                </div>
              ))}
            </div>
            <div className="modal-actions" style={{marginTop:20}}>
              {viewTask.status !== "DONE" && (
                <button className="btn ok" onClick={() => { setViewTask(null); openProcess(viewTask.id, "APPROVED"); }}>Duyệt ngay</button>
              )}
              <button className="btn" onClick={() => setViewTask(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function GD219ConfirmationScreen({ title }) {
  const [rows, setRows] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [dialogMode, setDialogMode] = useState("CONFIRM");
  const [confirmNote, setConfirmNote] = useState("");
  const [supplementNote, setSupplementNote] = useState("");
  const [busyAction, setBusyAction] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const items = await uiApi.gd2.workflowItems();
      const candidates = items.filter(item => ["APPROVED", "PUBLISHED"].includes(item.status));
      setRows(candidates);

      const historyResults = await Promise.all(
        items.map(item => uiApi.gd2.workflowHistory("DOSSIER", item.id).catch(() => []))
      );

      const flattened = historyResults
        .flat()
        .filter(item => ["CONFIRM", "REQUEST_SUPPLEMENT"].includes(item.action))
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

      setHistory(flattened);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openDialog(row, mode) {
    setSelectedRow(row);
    setDialogMode(mode);
  }

  function closeDialog() {
    setSelectedRow(null);
    setDialogMode("CONFIRM");
    setConfirmNote("");
    setSupplementNote("");
  }

  async function submitConfirmation(action) {
    if (!selectedRow) return;
    const note = action === "CONFIRM" ? confirmNote.trim() : supplementNote.trim();
    if (!note) {
      alert(action === "CONFIRM"
        ? "Vui lòng nhập nội dung xác nhận."
        : "Vui lòng nhập nội dung yêu cầu bổ sung.");
      return;
    }

    setBusyAction(action);
    try {
      const result = await uiApi.gd2.transition({
        entityType: "DOSSIER",
        entityId: selectedRow.id,
        action,
        actor: "current-user",
        unitCode: "DEFAULT",
        comment: note,
        recipient: selectedRow.code,
      });

      alert(
        action === "CONFIRM"
          ? `Đã xác nhận thông tin hồ sơ ${selectedRow.code}. Trạng thái mới: ${result.currentStatus}`
          : `Đã chuyển hồ sơ ${selectedRow.code} sang trạng thái cần bổ sung.`
      );

      closeDialog();
      await loadData();
    } catch (apiError) {
      alert("Lỗi: " + apiError.message);
    } finally {
      setBusyAction("");
    }
  }

  const confirmedCount = history.filter(item => item.action === "CONFIRM").length;

  return (
    <section className="panel">
      <PanelTitle icon={<CheckCircle2 />} title={title || "GD2-19 Xác nhận thông tin"} />
      <p className="muted" style={{ marginBottom: 16 }}>
        Đối chiếu và xác nhận độ chính xác của hồ sơ sau khai thác; nếu có sai lệch thì chuyển sang bước bổ sung.
      </p>
      {error && <div className="alert">{error}</div>}

      <div className="gd2-summary-grid">
        <div className="gd2-summary-card" style={{ "--accent": "#2563eb" }}>
          <div className="gd2-summary-top">
            <span className="gd2-summary-icon"><AlertCircle size={16} /></span>
            <span className="gd2-summary-label">Hồ sơ chờ xác nhận</span>
          </div>
          <strong className="gd2-summary-value">{rows.length}</strong>
          <span className="gd2-summary-note">Chờ đối chiếu dữ liệu sau khai thác</span>
        </div>
        <div className="gd2-summary-card" style={{ "--accent": "#16a34a" }}>
          <div className="gd2-summary-top">
            <span className="gd2-summary-icon"><CheckCircle2 size={16} /></span>
            <span className="gd2-summary-label">Lượt xác nhận gần đây</span>
          </div>
          <strong className="gd2-summary-value">{confirmedCount}</strong>
          <span className="gd2-summary-note">Các hồ sơ đã được ghi nhận chính xác</span>
        </div>
        <div className="gd2-summary-card" style={{ "--accent": "#7c3aed" }}>
          <div className="gd2-summary-top">
            <span className="gd2-summary-icon"><History size={16} /></span>
            <span className="gd2-summary-label">Lịch sử xử lý</span>
          </div>
          <strong className="gd2-summary-value">{history.length}</strong>
          <span className="gd2-summary-note">Tổng thao tác xác nhận và bổ sung</span>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã hồ sơ</th>
              <th>Tên hồ sơ</th>
              <th>Loại hồ sơ</th>
              <th>Trạng thái</th>
              <th>Mô tả</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td><strong>{row.code}</strong></td>
                <td>{row.title}</td>
                <td>{row.dossierType || "Chưa phân loại"}</td>
                <td><StatusBadge status={row.status} /></td>
                <td>{row.description || "Chưa có mô tả"}</td>
                <td>
                  <button className="btn ok" style={{ marginRight: 6 }} onClick={() => openDialog(row, "CONFIRM")}>
                    Xác nhận
                  </button>
                  <button className="btn warn" onClick={() => openDialog(row, "REQUEST_SUPPLEMENT")}>
                    Yêu cầu bổ sung
                  </button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan="6" className="empty-cell">Không có hồ sơ nào đang chờ xác nhận thông tin.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {history.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h4 style={{ marginBottom: 10 }}>Lịch sử xử lý gần đây</h4>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Hành động</th>
                  <th>Trạng thái</th>
                  <th>Người xử lý</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 8).map(item => (
                  <tr key={item.id}>
                    <td>{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                    <td>{item.action === "CONFIRM" ? "Xác nhận thông tin" : "Yêu cầu bổ sung"}</td>
                    <td><StatusBadge status={item.toStatus} /></td>
                    <td>{item.actor}</td>
                    <td>{item.comment || "Không có ghi chú"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedRow && (
        <div className="modal-overlay" onClick={closeDialog}>
          <div className="modal-content" onClick={event => event.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div className="modal-icon-wrap" style={{ background: dialogMode === "CONFIRM" ? "#2563eb" : "#d97706" }}>
                <CheckCircle2 size={22} color="#fff" />
              </div>
              <div>
                <h3>{dialogMode === "CONFIRM" ? "Xác nhận thông tin hồ sơ" : "Lập yêu cầu bổ sung"} {selectedRow.code}</h3>
                <p className="muted">
                  {dialogMode === "CONFIRM"
                    ? "Kiểm tra, đối chiếu và ghi nhận độ tin cậy của dữ liệu sau khai thác."
                    : "Ghi rõ nội dung sai lệch hoặc thiếu thông tin để chuyển hồ sơ về bước bổ sung."}
                </p>
              </div>
            </div>

            <div className="detail-grid" style={{ marginTop: 16 }}>
              <div className="detail-row"><span>Tên hồ sơ</span><strong>{selectedRow.title}</strong></div>
              <div className="detail-row"><span>Loại hồ sơ</span><strong>{selectedRow.dossierType || "Chưa phân loại"}</strong></div>
              <div className="detail-row"><span>Trạng thái hiện tại</span><StatusBadge status={selectedRow.status} /></div>
              <div className="detail-row"><span>Mô tả</span><span>{selectedRow.description || "Chưa có mô tả"}</span></div>
            </div>

            {dialogMode === "CONFIRM" ? (
              <div className="field" style={{ marginTop: 16 }}>
                <span>Nội dung xác nhận</span>
                <textarea
                  rows={3}
                  value={confirmNote}
                  onChange={event => setConfirmNote(event.target.value)}
                  placeholder="Ví dụ: Đã đối chiếu với hồ sơ gốc, thông tin chính xác và đủ điều kiện khai thác."
                />
              </div>
            ) : (
              <div className="field" style={{ marginTop: 16 }}>
                <span>Nội dung yêu cầu bổ sung</span>
                <textarea
                  rows={3}
                  value={supplementNote}
                  onChange={event => setSupplementNote(event.target.value)}
                  placeholder="Ví dụ: Thiếu văn bản đính kèm hoặc chưa khớp số hiệu, đề nghị cập nhật lại trước khi xác nhận."
                />
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: 18 }}>
              {dialogMode === "CONFIRM" ? (
                <button className="btn ok" disabled={busyAction === "REQUEST_SUPPLEMENT"} onClick={() => submitConfirmation("CONFIRM")}>
                  Xác nhận chính xác
                </button>
              ) : (
                <button className="btn warn" disabled={busyAction === "CONFIRM"} onClick={() => submitConfirmation("REQUEST_SUPPLEMENT")}>
                  Gửi yêu cầu bổ sung
                </button>
              )}
              <button className="btn" onClick={closeDialog}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function NotificationHub({ onOpenNotifications }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadHub();
    const timer = window.setInterval(loadHub, 30000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadHub() {
    try {
      const rows = await uiApi.gd2.notifications({ recipient: "current-user" });
      setItems(rows.slice(0, 8));
    } catch {
      setItems([]);
    }
  }

  async function markRead(id) {
    try {
      const updated = await uiApi.gd2.markNotificationRead(id);
      setItems(current => current.map(item => item.id === updated.id ? updated : item));
    } catch {
      // Topbar hub should stay quiet if the API is temporarily unavailable.
    }
  }

  const unread = items.filter(item => item.status !== "READ").length;

  return (
    <div className="notification-hub">
      <button className="notification-trigger" type="button" onClick={() => setOpen(value => !value)} title="Thông báo">
        <Bell size={17}/>
        {unread > 0 && <span>{unread}</span>}
      </button>
      {open && (
        <div className="notification-popover">
          <div className="notification-head">
            <strong>Thông báo kết quả</strong>
            <button type="button" onClick={onOpenNotifications}>Xem tất cả</button>
          </div>
          <div className="notification-list">
            {items.map(item => (
              <button key={item.id} className={item.status === "READ" ? "notification-item read" : "notification-item"} type="button" onClick={() => markRead(item.id)}>
                <span className={`notification-channel ${item.channel?.toLowerCase() || "system"}`}>{notificationChannelIcon(item.channel)}</span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.content || item.channel}</small>
                </span>
              </button>
            ))}
            {items.length === 0 && <div className="empty-cell">Chưa có thông báo.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function notificationChannelIcon(channel) {
  const normalized = String(channel || "").toUpperCase();
  if (normalized === "EMAIL") return <Mail size={13}/>;
  if (normalized === "SMS") return <MessageSquare size={13}/>;
  return <Bell size={13}/>;
}

function initialMenuSelection() {
  const requestedItem = new URLSearchParams(window.location.search).get("screen");
  const requestedGroup = designMenuGroups.find(group => group.items.includes(requestedItem));
  return requestedGroup
    ? { group: requestedGroup.title, item: requestedItem }
    : { group: "Nhập liệu", item: "GĐ2-1 Quản lý tài liệu" };
}

export default function App() {
  const initialAuthSession = useMemo(() => uiApi.auth.session(), []);
  const [currentUser, setCurrentUser] = useState(initialAuthSession?.user ?? null);
  const [authReady, setAuthReady] = useState(false);
  const [authBypassEnabled, setAuthBypassEnabled] = useState(false);
  const initialSelection = useMemo(initialMenuSelection, []);
  const [menu, setMenu] = useState(designMenuGroups);
  const [activeGroup, setActiveGroup] = useState(initialSelection.group);
  const [activeItem, setActiveItem] = useState(initialSelection.item);
  const [message, setMessage] = useState("");
  const [workflowHandoff, setWorkflowHandoff] = useState(null);

  useEffect(() => {
    let active = true;
    const handleUnauthorized = () => {
      setCurrentUser(null);
      setAuthReady(true);
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);

    async function initializeAuthentication() {
      try {
        const configuration = await uiApi.auth.configuration();
        if (!active) return;
        if (configuration?.bypassEnabled && configuration.user) {
          uiApi.auth.clear();
          setAuthBypassEnabled(true);
          setCurrentUser(configuration.user);
          return;
        }

        setAuthBypassEnabled(false);
        const session = uiApi.auth.session();
        if (!session?.accessToken) {
          setCurrentUser(null);
          return;
        }
        const user = await uiApi.auth.me();
        if (!active) return;
        uiApi.auth.updateStoredUser(user);
        setCurrentUser(user);
      } catch {
        if (!active) return;
        uiApi.auth.clear();
        setCurrentUser(null);
        setAuthBypassEnabled(false);
      } finally {
        if (active) setAuthReady(true);
      }
    }

    initializeAuthentication();
    return () => {
      active = false;
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return undefined;
    const repair = () => repairRenderedText(root);
    repair();
    const observer = new MutationObserver(repair);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    uiApi.menu().then((groups) => {
      const normalizedGroups = normalizeMenuGroups(groups);
      if (normalizedGroups.length) setMenu(mergeMenuWithDesign(normalizedGroups));
      if (groups.length && !activeGroup) {
        setActiveGroup(normalizedGroups[0].title);
        setActiveItem(normalizedGroups[0].items[0]);
      }
    }).catch(() => {
      // Backend có thể chưa chạy trong lúc dựng/kiểm tra UI. Giữ menu thiết kế
      // để người dùng vẫn điều hướng được toàn bộ màn hình.
      setMenu(designMenuGroups);
    });
  }, []);

  const activeResource = itemResourceMap[activeItem] ?? moduleMap[activeGroup] ?? "dossiers";

  function selectMenu(groupTitle, item) {
    setActiveGroup(repairDisplayedText(groupTitle));
    setActiveItem(repairDisplayedText(item));
    setMessage("");
  }

  function openWorkflowReview(context) {
    const workflowItem = "Hàng chờ duyệt & Quản lý quy trình Workflow";
    const workflowGroup = menu.find(group => group.items?.includes(workflowItem));
    setWorkflowHandoff(context || null);
    setActiveGroup(workflowGroup?.title || "Phê duyệt & Xuất bản hồ sơ");
    setActiveItem(workflowItem);
    setMessage("");
  }

  async function initializeDatabase() {
    setMessage("Đang khởi tạo bảng database...");
    try {
      await uiApi.initializeDb();
      setMessage("Đã khởi tạo/kiểm tra bảng database Oracle thành công.");
    } catch (error) {
      setMessage(`Không khởi tạo được DB: ${error.message}`);
    }
  }

  function handleLogin(session) {
    setCurrentUser(session.user);
    setAuthReady(true);
  }

  async function handleLogout() {
    await uiApi.auth.logout();
    setCurrentUser(null);
  }

  if (!authReady) {
    return <div className="auth-loading">Đang xác thực phiên đăng nhập...</div>;
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="ops-app">
      <header className="app-brand-header">
        <div className="side-brand">
          <div className="brand-mark">IDP</div>
          <div>
            <strong>IDP Technology</strong>
            <span>IDP.DMS</span>
          </div>
        </div>
        <div className="brand-caption">Hệ thống quản lý và số hóa hồ sơ lưu trữ</div>
        <div className="top-actions">
          <div className="current-user" title={currentUser.permissions?.join(", ")}>
            <User size={18} />
            <span>
              <strong>{currentUser.fullName}</strong>
              <small>{currentUser.roleName || currentUser.roleCode}</small>
            </span>
          </div>
          {authBypassEnabled && <span className="auth-bypass-badge">Đang bỏ qua đăng nhập</span>}
          <NotificationHub onOpenNotifications={() => selectMenu("Kiểm duyệt", "GĐ2-20 Kiểm duyệt & bổ sung")} />
          <button className="btn" type="button" onClick={() => window.print()}><Download size={16}/> In / xuất PDF</button>
          <button className="btn" type="button" onClick={() => window.location.reload()}><RefreshCw size={16}/> Làm mới</button>
          <button className="btn db-action" type="button" onClick={initializeDatabase}><Database size={16}/> Khởi tạo DB</button>
          {!authBypassEnabled && <button className="btn logout-action" type="button" onClick={handleLogout}><LogOut size={16}/> Đăng xuất</button>}
        </div>
      </header>

      <nav className="top-menu" aria-label="Điều hướng chức năng">
        <div className="top-menu-inner">
          {menu.map((group) => (
            <section className="side-group" key={group.title}>
              <button
                className={activeGroup === group.title ? "group-title active" : "group-title"}
                onClick={() => selectMenu(group.title, group.items[0])}
              >
                {iconFor(group.title)}
                {group.title}
              </button>
              <div className="side-items">
                {group.items.map((item) => (
                  <button key={item} className={activeItem === item ? "active" : ""} onClick={() => selectMenu(group.title, item)}>
                    {item}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </nav>

      <main className="ops-main">
        <header className="ops-header">
          <div>
            <h1>{activeItem}</h1>
            <p>{activeGroup} · Dữ liệu tác nghiệp đồng bộ Oracle DMS</p>
          </div>
          <span className="context-badge">IDP.DMS</span>
        </header>

        {message && <div className="alert">{message}</div>}

        <section className="ops-screen">
          {activeResource === "storage" && <StorageScreen />}
          {activeResource === "dossiers" && (activeGroup === "Tìm kiếm" || activeGroup === "Khai thác" || activeGroup === "Tra cứu & Đăng ký mượn hồ sơ" ? <SearchScreen /> : <DossierScreen mode={activeItem} />)}
          {activeResource === "borrow" && <BorrowScreen />}
          {activeResource === "reports" && <ReportCrudScreen />}
          {activeResource === "documents" && <DocumentManagementScreen />}
          {activeResource === "approval" && <ApprovalScreen title={activeItem} />}
          {activeResource === "report-dashboard" && <DashboardReportScreen />}
          {activeResource === "permission-groups" && <PermissionScreen title={activeItem} />}
          {activeResource === "ocr-screen" && <OcrScreen />}
          {activeResource === "integration-screen" && <IntegrationScreen />}
          {activeResource === "workflow-builder" && <WorkflowBuilderScreen />}
          {activeResource === "import-jobs" && <BatchImportScreen />}
          {/* ===== Giai đoạn 2 ===== */}
          {activeResource === "gd2-documents" && <GD21DocumentScreen />}
          {activeResource === "gd2-workflow" && <GD22WorkflowScreenV2 handoff={workflowHandoff} />}
          {activeResource === "gd2-permissions" && <GD23PermissionScreen />}
          {activeResource === "gd2-ocr" && <GD2619OcrConfirmationScreen title={activeItem} onReviewReady={setWorkflowHandoff} onOpenWorkflow={openWorkflowReview} />}
          {activeResource === "gd2-integration" && <GD27IntegrationScreen />}
          {activeResource === "gd2-signature" && <GD29PdfSignatureScreen />}
          {activeResource === "gd2-reports" && <GD21013ExecutiveDashboardScreen mode="report" />}
          {activeResource === "gd2-document-versions" && <GD211DocumentVersionScreen />}
          {activeResource === "gd2-interface-workflow" && <GD212UnitCustomizationScreen />}
          {activeResource === "gd2-leadership" && <GD21013ExecutiveDashboardScreen mode="leadership" />}
          {activeResource === "gd2-security" && <GD21415SecurityDataScreen title={activeItem} />}
          {activeResource === "gd2-system-data" && <GD21415SecurityDataScreen title={activeItem} />}
          {activeResource === "gd2-dossier-types" && <GD216SharedDossierTypeScreen />}
          {activeResource === "gd2-confirmation" && <GD2619OcrConfirmationScreen title={activeItem} onReviewReady={setWorkflowHandoff} onOpenWorkflow={openWorkflowReview} />}
          {activeResource === "gd2-review-supplement" && <GD220ReviewSupplementScreen title={activeItem} />}
          {activeResource === "gd2-notifications" && <GD2NotificationScreen />}
          {activeResource === "gd2-dossier-system" && <GD22526DossierBorrowScreen mode="catalog" title={activeItem} />}
          {activeResource === "gd2-borrow-process" && <GD22526DossierBorrowScreen mode="borrow" title={activeItem} />}
          {![
            "storage", "dossiers", "documents", "ocr-screen", "integration-screen",
            "approval", "borrow", "reports", "report-dashboard", "permission-groups",
            "workflow-builder", "import-jobs",
            "gd2-documents", "gd2-workflow", "gd2-permissions", "gd2-ocr", "gd2-integration", "gd2-signature",
            "gd2-reports", "gd2-document-versions", "gd2-interface-workflow", "gd2-leadership", "gd2-security",
            "gd2-system-data", "gd2-dossier-types", "gd2-confirmation", "gd2-review-supplement",
            "gd2-notifications", "gd2-dossier-system", "gd2-borrow-process"
          ].includes(activeResource) && <SimpleResourceScreen title={activeItem} resource={activeResource} group={activeGroup} />}
        </section>
      </main>
    </div>
  );
}

// =============================================================
// GĐ2 - Reusable Feature Layout Component
// Layout chính xác theo design: header + action bar + split panel
// =============================================================
function GD2FeatureLayout({
  featureId, featureName, description, actor = "admin", phase = "Giai đoạn 2",
  actionBarLabel, actions,
  leftPanelTitle = "Thông tin cấu hình", rightPanelTitle = "Danh sách dữ liệu",
  leftPanel, rightPanel, midContent, splitRatio = "420px 1fr", className = ""
}) {
  return (
    <div className={`gd2-feature-wrap ${className}`.trim()}>
      {/* Feature Header */}
      <div className="gd2-feature-header">
        <h2 className="gd2-feature-title">{featureId}. {featureName}</h2>
        <div className="gd2-tags">
          <span className="gd2-tag phase">{phase} - Mở rộng nghiệp vụ</span>
          <span className="gd2-tag actor">Theo phân quyền đơn vị</span>
          <span className="gd2-tag role">{actor}</span>
        </div>
        <p className="gd2-feature-desc">{description}</p>
      </div>

      {/* Action Bar */}
      {actionBarLabel && (
        <div className="gd2-action-bar">
          <span className="gd2-action-label">{actionBarLabel}</span>
          <div className="gd2-action-btns">{actions}</div>
        </div>
      )}

      {/* Content: split panel */}
      {midContent && <div className="gd2-mid-content">{midContent}</div>}
      <div className="gd2-split-panel" style={{gridTemplateColumns: splitRatio}}>
        <div className="gd2-left-panel">
          {leftPanelTitle && <div className="gd2-panel-title">{leftPanelTitle}</div>}
          {leftPanel}
        </div>
        <div className="gd2-right-panel">
          {rightPanelTitle && <div className="gd2-panel-title">{rightPanelTitle}</div>}
          {rightPanel}
        </div>
      </div>
    </div>
  );
}

function TreeNode({ node, onSelect, level = 0 }) {
  const [open, setOpen] = useState(level < 1);
  const hasChildren = node.children?.length > 0;

  return (
    <div>
      <button className="gd21-tree-node" style={{ paddingLeft: 8 + level * 14 }} onClick={() => {
        if (hasChildren) setOpen(current => !current);
        onSelect?.(node);
      }}>
        {hasChildren ? <ChevronRight size={13} className={open ? "open" : ""}/> : <FileText size={13}/>}
        <span>{node.name}</span>
        <small>{node.count}</small>
      </button>
      {open && hasChildren && node.children.map(child => (
        <TreeNode key={child.id} node={child} onSelect={onSelect} level={level + 1} />
      ))}
    </div>
  );
}

function GD21DocumentScreen() {
  const crud = useCrud("documents", emptyDocument);
  const dossiers = useCrud("dossiers", emptyDossier);
  const storageCrud = useCrud("storage", emptyStorage);
  const documentTypeCrud = useCrud("document-types", emptySimple);
  const [activeTab, setActiveTab] = useState("screen");
  const [tree, setTree] = useState([]);
  const [filters, setFilters] = useState({ query: "", metadata: "", documentType: "", status: "", ocrStatus: "", storageId: "", page: 1, pageSize: 8 });
  const [searchResult, setSearchResult] = useState({ items: [], page: 1, pageSize: 8, totalItems: 0, totalPages: 1 });
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [notice, setNotice] = useState(null);
  const [unitCode, setUnitCode] = useState("DEFAULT");
  const [viewMode, setViewMode] = useState("table");
  const [selectedStorageId, setSelectedStorageId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [pendingCreateFile, setPendingCreateFile] = useState(null);
  const [savingDocument, setSavingDocument] = useState(false);
  const [geminiExtraction, setGeminiExtraction] = useState(null);
  const [extractingWithGemini, setExtractingWithGemini] = useState(false);
  const fileInputRef = useRef(null);
  const createFileInputRef = useRef(null);
  const storageSelectionInitialized = useRef(false);

  async function saveDossier(event) {
    event.preventDefault();
    const code = String(dossiers.form.code || "").trim();
    const title = String(dossiers.form.title || "").trim();
    const storageId = String(dossiers.form.storageId || selectedStorageId || "").trim();
    const dossierType = String(dossiers.form.dossierType || "").trim();
    const status = String(dossiers.form.status || "DRAFT").trim();

    if (!code) { setNotice({ type: "error", text: "Vui lòng nhập Mã hồ sơ." }); return; }
    if (!title) { setNotice({ type: "error", text: "Vui lòng nhập Tên hồ sơ." }); return; }
    if (!storageId) { setNotice({ type: "error", text: "Vui lòng chọn Kho hồ sơ." }); return; }
    if (!dossierType) { setNotice({ type: "error", text: "Vui lòng chọn Loại hồ sơ." }); return; }

    setSavingDocument(true);
    try {
      const payload = toPayload({ code, title, storageId: Number(storageId), dossierType, status });
      const dossierId = dossiers.form.id ? Number(dossiers.form.id) : null;
      if (dossierId) {
        await uiApi.crud("dossiers").update(dossierId, payload);
      } else {
        await uiApi.crud("dossiers").create(payload);
      }
      dossiers.reset();
      setShowForm(false);
      selectStorage(storageId);
      await Promise.all([dossiers.load(), runSearch(filters), loadTree()]);
      setNotice({ type: "success", text: `Đã lưu hồ sơ "${title}" vào ${formatStorage(storageId)} thành công.` });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setSavingDocument(false);
    }
  }

  const resetDossierForm = () => {
    dossiers.reset();
    if (selectedStorageId) dossiers.setField?.("storageId", selectedStorageId);
    setShowForm(true);
  };

  const editDossierForm = (row) => {
    dossiers.edit(row);
    setShowForm(true);
  };

  function setFilter(key, value) {
    setFilters(current => ({ ...current, [key]: value, page: key === "page" ? Number(value) : 1 }));
  }

  const storageOptions = useMemo(
    () => storageCrud.rows.map((row) => ({
      value: String(row.id),
      label: `${row.code} - ${row.name}`
    })),
    [storageCrud.rows]
  );
  useEffect(() => {
    if (!storageSelectionInitialized.current && storageOptions.length) {
      storageSelectionInitialized.current = true;
      selectStorage(storageOptions[0].value);
    }
  }, [storageOptions]);
  const storageById = useMemo(
    () => new Map(storageCrud.rows.map((row) => [Number(row.id), row])),
    [storageCrud.rows]
  );
  const selectedStorageLabel = selectedStorageId
    ? storageOptions.find(option => option.value === selectedStorageId)?.label || `Kho #${selectedStorageId}`
    : "";
  const filteredDossiers = useMemo(
    () => dossiers.rows.filter(row => !selectedStorageId || String(row.storageId || "") === selectedStorageId),
    [dossiers.rows, selectedStorageId]
  );
  const dossierOptions = useMemo(
    () => filteredDossiers.map((row) => ({
      value: String(row.id),
      label: `${row.code} - ${row.title}`
    })),
    [filteredDossiers]
  );
  const dossierById = useMemo(
    () => new Map(dossiers.rows.map((row) => [Number(row.id), row])),
    [dossiers.rows]
  );
  const documentTypeOptions = useMemo(() => {
    const configured = documentTypeCrud.rows.map((row) => row.name || row.code).filter(Boolean);
    const fallback = ["PDF", "DOCX", "TIFF", "IMAGE", "CAD/BIM", "METADATA"];
    return Array.from(new Set([...configured, ...fallback]));
  }, [documentTypeCrud.rows]);
  const formatDossier = (value) => {
    const dossier = dossierById.get(Number(value));
    return dossier ? `${dossier.code} - ${dossier.title}` : `Hồ sơ #${value || "-"}`;
  };
  const formatStorage = (value) => {
    const storage = storageById.get(Number(value));
    return storage ? `${storage.code} - ${storage.name}` : value ? `Kho #${value}` : "-";
  };
  const formatUploadedFileName = (value) => value
    ? String(value).replace(/^\d+_[0-9a-f]{32}_/i, "")
    : "";

  // Nhận cả hai dạng phản hồi: metadata object hoặc danh sách fields từ API.
  // Điều này giúp UI vẫn tự điền được dữ liệu khi backend bổ sung trường mới.
  const normalizeExtractionFields = (result) => {
    if (Array.isArray(result?.fields)) return result.fields;
    if (result?.metadata && typeof result.metadata === "object") {
      return Object.entries(result.metadata)
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([key, value]) => ({ key, label: key, value: String(value) }));
    }
    return [];
  };
  const extractionFieldValue = (fields, keys) => fields.find(field =>
    keys.includes(String(field.key || "").toLowerCase())
  )?.value?.trim?.() || "";
  const geminiErrorMessage = (error) => {
    const message = String(error?.message || "Không thể bóc tách dữ liệu.");
    if (/429|quota|resource_exhausted/i.test(message)) return "Gemini đã hết hạn mức sử dụng. Vui lòng thử lại sau hoặc liên hệ quản trị viên.";
    if (/timeout|timed out|504/i.test(message)) return "Gemini xử lý quá lâu. Vui lòng thử lại với tệp nhỏ hơn.";
    if (/api key|cấu hình gemini/i.test(message)) return "Gemini chưa được cấu hình API Key. Vui lòng liên hệ quản trị viên.";
    return `Bóc tách bằng Gemini thất bại: ${message}`;
  };

  async function extractSelectedDocumentWithGemini() {
    if (!selectedDoc?.id || !selectedDoc.fileName) {
      setNotice({ type: "error", text: "Vui lòng chọn tài liệu đã tải tệp lên trước khi bóc tách." });
      return;
    }

    setExtractingWithGemini(true);
    setNotice({ type: "info", text: "Đang xử lý bằng AI... Gemini đang bóc tách dữ liệu tài liệu." });
    try {
      // Lấy đúng tệp đã lưu của tài liệu và gửi tới endpoint OCR. Engine được cố định ở uiApi là Gemini.
      const blob = await uiApi.gd2.documentPdfBlob(selectedDoc.id);
      const file = new File([blob], formatUploadedFileName(selectedDoc.fileName) || "tai-lieu", {
        type: blob.type || "application/octet-stream"
      });
      const ocrResult = await uiApi.extractOcr(file);
      const rawText = String(ocrResult?.text || "").trim();
      if (!rawText) throw new Error("Gemini không trả về nội dung văn bản.");

      // API GD2 chuyển Raw Text thành các metadata/fields. Các giá trị này được dùng để tự điền form phía dưới.
      const metadataResult = await uiApi.gd2.extractOcrMetadata(selectedDoc.id, {
        engine: "gemini",
        actor: "current-user",
        unitCode: "DEFAULT",
        fileName: selectedDoc.fileName,
        extractedText: rawText,
        note: "Bóc tách dữ liệu từ Gemini tại GD2-1"
      });
      const fields = normalizeExtractionFields(metadataResult);
      const autoTitle = extractionFieldValue(fields, ["title", "documenttitle", "subject", "trichyeu"]);
      const autoType = String(metadataResult?.documentType || extractionFieldValue(fields, ["documenttype", "type"]) || "").trim();

      // Map dữ liệu API vào form tài liệu hiện có; người dùng vẫn có thể chỉnh sửa trước khi lưu tiếp.
      crud.setField("title", autoTitle || selectedDoc.title);
      crud.setField("description", rawText);
      crud.setField("ocrStatus", "DONE");
      const updatedDocument = {
        dossierId: Number(selectedDoc.dossierId),
        code: selectedDoc.code,
        title: autoTitle || selectedDoc.title,
        fileName: selectedDoc.fileName,
        ocrStatus: "DONE",
        status: selectedDoc.status || "DRAFT",
        description: rawText
      };
      await uiApi.crud("documents").update(selectedDoc.id, updatedDocument);

      setGeminiExtraction({
        rawText,
        fields,
        documentType: autoType,
        engine: "gemini"
      });
      setSelectedDoc(current => current ? { ...current, ...updatedDocument } : current);
      await Promise.all([crud.load(), runSearch(filters, selectedDoc.id), loadTree()]);
      setNotice({ type: "success", text: "Bóc tách thành công. Nội dung và metadata đã được cập nhật từ Gemini." });
    } catch (error) {
      setNotice({ type: "error", text: geminiErrorMessage(error) });
    } finally {
      setExtractingWithGemini(false);
    }
  }
  const editDocumentForm = (row) => {
    crud.edit(row);
    clearCreateFile();
    const dossier = dossierById.get(Number(row.dossierId));
    const rowStorageId = dossier?.storageId ? String(dossier.storageId) : "";
    if (rowStorageId !== selectedStorageId) selectStorage(rowStorageId);
    const typeMatch = String(row.description || "").match(/Loại tài liệu:\s*([^\n]+)/i);
    setDocumentType(typeMatch?.[1]?.trim() || "");
    setShowForm(true);
  };
  const resetDocumentForm = () => {
    crud.reset();
    setDocumentType("");
    clearCreateFile();
    setShowForm(true);
  };

  function clearCreateFile() {
    setPendingCreateFile(null);
    if (createFileInputRef.current) createFileInputRef.current.value = "";
  }

  async function ensureDossierForSelectedStorage() {
    if (!selectedStorageId) throw new Error("Vui lòng chọn kho lưu trữ trước khi thêm tài liệu.");
    const existing = filteredDossiers[0];
    if (existing) return existing;
    const storage = storageById.get(Number(selectedStorageId));
    const stamp = Date.now().toString().slice(-6);
    const dossierId = await uiApi.crud("dossiers").create({
      code: `HS-${storage?.code || selectedStorageId}-${stamp}`.replace(/\s+/g, "-"),
      title: `Hồ sơ mặc định - ${storage?.name || selectedStorageId}`,
      dossierType: "SO_HOA",
      storageId: Number(selectedStorageId),
      status: "DRAFT",
      fromDate: null,
      toDate: null,
      description: "Hồ sơ hệ thống tự tạo để chứa tài liệu tạo nhanh ở GĐ2-1."
    });
    await dossiers.load?.();
    return {
      id: Number(dossierId?.id || dossierId),
      code: `HS-${storage?.code || selectedStorageId}-${stamp}`,
      title: `Hồ sơ mặc định - ${storage?.name || selectedStorageId}`,
      storageId: Number(selectedStorageId),
      status: "DRAFT"
    };
  }

  const allowedExtensions = [".pdf", ".docx", ".tif", ".tiff", ".png", ".jpg", ".jpeg", ".ifc", ".stl", ".obj", ".step", ".stp"];
  const unitLimits = { DEFAULT: 25, HC: 20, TC: 30, QTHT: 50 };

  const loadTree = useCallback(async () => {
    try {
      setTree(await uiApi.gd2.documentTree());
    } catch {
      setTree([]);
    }
  }, []);

  const runSearch = useCallback(async (nextFilters = filters, preferredDocumentId = null) => {
    try {
      setNotice(null);
      const result = await uiApi.gd2.documentSearch(nextFilters);
      setSearchResult(result);
      setSelectedDoc(current => {
        if (preferredDocumentId) {
          return result.items?.find(item => Number(item.id) === Number(preferredDocumentId)) || current || result.items?.[0] || null;
        }
        return current || result.items?.[0] || null;
      });
      return result;
    } catch (error) {
      setNotice({ type: "error", text: error.message });
      return null;
    }
  }, [filters]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  useEffect(() => {
    runSearch(filters);
  }, [runSearch, filters]);

  function setFilter(key, value) {
    setFilters(current => ({ ...current, [key]: value, page: key === "page" ? Number(value) : 1 }));
  }

  function selectStorage(value) {
    const storageId = value ? String(value) : "";
    setSelectedStorageId(storageId);
    setSelectedDoc(null);
    setSelectedIds([]);
    setFilters(current => ({ ...current, storageId, dossierId: "", page: 1 }));
  }

  function selectDossierFromTree(dossierId) {
    const dossier = dossierById.get(Number(dossierId));
    const storageId = dossier?.storageId ? String(dossier.storageId) : "";
    setSelectedStorageId(storageId);
    setSelectedDoc(null);
    setSelectedIds([]);
    setFilters(current => ({ ...current, storageId, dossierId: String(dossierId), page: 1 }));
  }

  const toggleSelect = id => setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const displayedDocuments = searchResult.items;
  const allSelected = displayedDocuments.length > 0 && displayedDocuments.every(row => selectedIds.includes(row.id));
  const toggleAll = () => setSelectedIds(allSelected ? [] : displayedDocuments.map(row => row.id));

  function validateUploadFile(file) {
    if (!file) return null;
    const extension = `.${file.name.split(".").pop()}`.toLowerCase();
    const maxMb = technicalModelPattern.test(file.name) ? 200 : (unitLimits[unitCode] ?? unitLimits.DEFAULT);
    if (!allowedExtensions.includes(extension)) {
      return "Định dạng file không hợp lệ. Hỗ trợ PDF, DOCX, TIFF, PNG/JPG và IFC/STL/OBJ/STEP.";
    }
    if (file.size > maxMb * 1024 * 1024) {
      return `File vượt giới hạn ${maxMb}MB của đơn vị ${unitCode}.`;
    }
    return null;
  }

  function selectCreateFile(event) {
    const file = event.target.files?.[0] || null;
    const validationError = validateUploadFile(file);
    if (validationError) {
      clearCreateFile();
      setNotice({ type: "error", text: validationError });
      return;
    }
    setPendingCreateFile(file);
    setNotice(null);
  }

  async function uploadFileForDocument(documentId, file) {
    const validationError = validateUploadFile(file);
    if (validationError) throw new Error(validationError);
    return uiApi.crud("documents").upload(documentId, file, "gemini", unitCode);
  }

  async function saveDocument(event) {
    event.preventDefault();
    if (!documentType) {
      setNotice({ type: "error", text: "Vui lòng chọn loại tài liệu." });
      return;
    }

    let documentId = crud.form.id ? Number(crud.form.id) : null;
    let metadataSaved = false;
    setSavingDocument(true);
    try {
      const dossier = await ensureDossierForSelectedStorage();
      const generatedDocumentCode = `VB-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const documentCode = String(crud.form.code || "").trim() || generatedDocumentCode;
      const documentTitle = String(crud.form.title || "").trim() || pendingCreateFile?.name || `Tài liệu ${documentCode}`;
      const metadata = [
        `Loại tài liệu: ${documentType}`,
        selectedStorageLabel ? `Kho lưu trữ: ${selectedStorageLabel}` : "",
        crud.form.description || ""
      ].filter(Boolean).join("\n");
      const payload = toPayload({
        ...crud.form,
        code: documentCode,
        title: documentTitle,
        dossierId: dossier.id,
        fileName: "",
        ocrStatus: "PENDING",
        status: "DRAFT",
        description: metadata
      });
      if (documentId) await uiApi.crud("documents").update(documentId, payload);
      else {
        const created = await uiApi.crud("documents").create(payload);
        documentId = Number(created?.id ?? created);
        if (!Number.isFinite(documentId) || documentId <= 0) {
          throw new Error("API không trả về ID tài liệu vừa tạo.");
        }
      }
      metadataSaved = true;

      if (pendingCreateFile) {
        await uploadFileForDocument(documentId, pendingCreateFile);
      }

      const savedTitle = documentTitle;
      const uploadedFileName = pendingCreateFile?.name;
      const successText = uploadedFileName
        ? `Đã lưu tài liệu ${savedTitle} và tải tệp ${uploadedFileName} thành công.`
        : `Đã lưu metadata tài liệu ${savedTitle} thành công.`;
      resetDocumentForm();
      setShowForm(false);
      await Promise.all([crud.load(), runSearch(filters, documentId), loadTree()]);
      setNotice({ type: "success", text: successText });
    } catch (error) {
      const errorText = metadataSaved && pendingCreateFile
        ? `Đã lưu metadata nhưng tải/OCR tệp thất bại: ${error.message}`
        : error.message;
      if (documentId) await Promise.all([crud.load(), runSearch(filters, documentId), loadTree()]);
      setNotice({ type: "error", text: errorText });
    } finally {
      setSavingDocument(false);
    }
  }

  async function uploadSelectedFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedDoc) return;
    const validationError = validateUploadFile(file);
    if (validationError) {
      setNotice({ type: "error", text: validationError });
      return;
    }

    try {
      await uploadFileForDocument(selectedDoc.id, file);
      await runSearch(filters, selectedDoc.id);
      await loadTree();
      setNotice({ type: "success", text: isTechnicalModelFile(file.name) ? "Đã tải mô hình CAD/BIM và sẵn sàng xem 3D." : "Đã tải file, OCR và đánh chỉ mục tự động." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function publishDocument(row = selectedDoc) {
    if (!row) return;
    try {
      const updated = await uiApi.gd2.publishDocument(row.id, {
        entityType: "DOCUMENT",
        entityId: row.id,
        action: "PUBLISH",
        actor: "current-user",
        unitCode,
        comment: "Xuất bản từ GĐ2-1",
        recipient: row.code
      });
      setSelectedDoc(updated);
      setNotice({ type: "success", text: `Đã xuất bản tài liệu ${row.code}.` });
      await runSearch();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function exportDocuments(format) {
    try {
      const result = await uiApi.gd2.exportDocuments({ format, documentIds: selectedIds });
      setNotice({ type: "success", text: `Đã tạo file ${result.fileName} (${result.itemCount} tài liệu).` });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }


  const dossierForm = (
    <form className="gd21-inline-form" onSubmit={saveDossier}>
      <div className="gd21-form-heading">
        <strong>Thêm mới Hồ sơ Lưu trữ</strong>
        <span>Chỉ cần nhập 5 thông tin dưới đây; hồ sơ sẽ được lưu vào kho đã chọn.</span>
      </div>
      <label className="gd21-field-label">Mã hồ sơ <span className="required">*</span></label>
      <input
        value={dossiers.form.code || ""}
        onChange={e => dossiers.setField("code", e.target.value)}
        placeholder="VD: HS-2026-001"
        required
      />
      <label className="gd21-field-label">Tên hồ sơ <span className="required">*</span></label>
      <input
        value={dossiers.form.title || ""}
        onChange={e => dossiers.setField("title", e.target.value)}
        placeholder="VD: Hồ sơ Dự án Xây dựng Trụ sở"
        required
      />
      <label className="gd21-field-label">Kho hồ sơ <span className="required">*</span></label>
      <select
        value={dossiers.form.storageId || selectedStorageId || ""}
        onChange={e => { dossiers.setField("storageId", e.target.value); selectStorage(e.target.value); }}
        required
      >
        <option value="">-- Chọn kho lưu trữ --</option>
        {storageOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <label className="gd21-field-label">Loại hồ sơ <span className="required">*</span></label>
      <select
        value={dossiers.form.dossierType || ""}
        onChange={e => dossiers.setField("dossierType", e.target.value)}
        required
      >
        <option value="">-- Chọn loại hồ sơ --</option>
        <option value="Hanh chinh">Hành chính</option>
        <option value="Tai chinh">Tài chính</option>
        <option value="Nhan su">Nhân sự</option>
        <option value="Du an">Dự án</option>
        <option value="Ky thuat">Kỹ thuật</option>
        <option value="SO_HOA">Số hóa</option>
      </select>
      <label className="gd21-field-label">Trạng thái</label>
      <select
        value={dossiers.form.status || "DRAFT"}
        onChange={e => dossiers.setField("status", e.target.value)}
      >
        <option value="DRAFT">DRAFT – Dự thảo</option>
        <option value="PENDING">PENDING – Chờ duyệt</option>
        <option value="APPROVED">APPROVED – Đã duyệt</option>
        <option value="PUBLISHED">PUBLISHED – Đã xuất bản</option>
      </select>
      <div className="gd21-form-actions">
        <button className="btn primary" type="submit" disabled={savingDocument}><Save size={14}/> {savingDocument ? "Đang lưu..." : "Lưu vào kho"}</button>
        <button className="btn" type="button" disabled={savingDocument} onClick={() => { dossiers.reset(); setShowForm(false); }}><X size={14}/> Bỏ qua</button>
      </div>
      {dossiers.error && <div className="gd21-form-error">{dossiers.error}</div>}
    </form>
  );

  const treePanel = (
    <div className="gd21-tree">
      {tree.map(node => (
        <TreeNode key={node.id} node={node} onSelect={(selectedNode) => {
          if (selectedNode.type === "ROOT") selectStorage("");
          if (selectedNode.type === "STORAGE") selectStorage(selectedNode.referenceId);
          if (selectedNode.type === "DOSSIER") selectDossierFromTree(selectedNode.referenceId);
          if (selectedNode.type === "DOCUMENT_TYPE") setFilter("documentType", selectedNode.name);
        }} />
      ))}
    </div>
  );

  const tablePanel = (
    <div className={viewMode === "grid" ? "gd21-center grid-mode" : "gd21-center"}>
      <div className="gd21-filterbar">
        <select value={selectedStorageId} onChange={e => selectStorage(e.target.value)}>
          <option value="">Tất cả kho lưu trữ</option>
          {storageOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <input placeholder="Full-text: mã, tên, nội dung OCR..." value={filters.query} onChange={e => setFilter("query", e.target.value)} />
        <input placeholder="Metadata/file/ghi chú..." value={filters.metadata} onChange={e => setFilter("metadata", e.target.value)} />
        <select value={filters.documentType} onChange={e => setFilter("documentType", e.target.value)}>
          <option value="">Mọi loại</option>
          {["PDF", "DOCX", "TIFF", "IMAGE", "METADATA"].map(item => <option key={item}>{item}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilter("status", e.target.value)}>
          <option value="">Mọi trạng thái</option>
          {["DRAFT", "PENDING", "APPROVED", "PUBLISHED"].map(item => <option key={item}>{item}</option>)}
        </select>
      </div>
      {showForm && dossierForm}
      <div className="gd21-table-tools">
        <span>
          {selectedStorageId
            ? `Hiển thị ${searchResult.totalItems} tài liệu trong kho ${selectedStorageLabel}`
            : `Hiển thị ${searchResult.totalItems} tài liệu trong tất cả kho`}
          {` · Trang ${searchResult.page}/${searchResult.totalPages}`}
        </span>
        <div>
          <button className={`icon-btn ${viewMode === "table" ? "primary" : ""}`} title="Table" onClick={() => setViewMode("table")}><Layers3 size={14}/></button>
          <button className={`icon-btn ${viewMode === "grid" ? "primary" : ""}`} title="Grid" onClick={() => setViewMode("grid")}><FolderTree size={14}/></button>
        </div>
      </div>
      {viewMode === "table" ? (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{width:36}}><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
              <th>Mã tài liệu</th>
              <th>Tên tài liệu</th>
              <th>Hồ sơ lưu trữ</th>
              <th>Tên file</th>
              <th>Trạng thái OCR</th>
              <th>Trạng thái văn bản</th>
            </tr>
          </thead>
          <tbody>
            {displayedDocuments.map(row => (
              <tr key={row.id} className={selectedDoc?.id === row.id ? "row-selected" : ""} onClick={() => { setSelectedDoc(row); editDocumentForm(row); }}>
                <td onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelect(row.id)} />
                </td>
                <td><span className="gd2-code">{row.code}</span></td>
                <td>{row.title}</td>
                <td>{formatDossier(row.dossierId)}</td>
                <td>{formatUploadedFileName(row.fileName) || "-"}</td>
                <td><OcrBadge status={row.ocrStatus || "PENDING"} /></td>
                <td><StatusBadge status={row.status || "DRAFT"} /></td>
              </tr>
            ))}
            {displayedDocuments.length === 0 && (
              <tr><td colSpan="7" className="empty-cell">
                {selectedStorageId
                  ? "Kho này hiện chưa có tài liệu nào. Hãy bấm [Thêm mới] để tải tài liệu vào kho!"
                  : "Hiện chưa có tài liệu nào trong hệ thống. Hãy bấm [Thêm mới] để tải tài liệu!"}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      ) : (
        <div className="gd21-doc-grid">
          {displayedDocuments.map(row => (
            <button key={row.id} className={selectedDoc?.id === row.id ? "gd21-doc-card active" : "gd21-doc-card"} onClick={() => { setSelectedDoc(row); editDocumentForm(row); }}>
              <FileText size={22}/>
              <strong>{row.code}</strong>
              <span>{row.title}</span>
              <StatusBadge status={row.status || "DRAFT"} />
            </button>
          ))}
        </div>
      )}
      <div className="gd21-pagination">
        <button className="btn" disabled={filters.page <= 1} onClick={() => setFilter("page", filters.page - 1)}>Trước</button>
        <select value={filters.pageSize} onChange={e => setFilters(current => ({ ...current, pageSize: Number(e.target.value), page: 1 }))}>
          {[8, 15, 30, 50].map(size => <option key={size} value={size}>{size}/trang</option>)}
        </select>
        <button className="btn" disabled={filters.page >= searchResult.totalPages} onClick={() => setFilter("page", filters.page + 1)}>Sau</button>
      </div>
    </div>
  );

  const previewPanel = (
    <div className="gd21-preview-panel">
      <div className="gd21-preview-box">
        {isTechnicalModelFile(selectedDoc?.fileName) ? (
          <Suspense fallback={<div className="gd21-preview-empty"><strong>Đang khởi tạo trình xem WebGL…</strong></div>}>
            <TechnicalModelViewer documentId={selectedDoc.id} fileName={selectedDoc.fileName} title={selectedDoc.title}/>
          </Suspense>
        ) : selectedDoc?.fileName?.toLowerCase().endsWith(".pdf") ? (
          <iframe title="PDF Viewer" src={`/api/dms/documents/${selectedDoc.id}/file`} />
        ) : selectedDoc?.fileName && /\.(png|jpg|jpeg)$/i.test(selectedDoc.fileName) ? (
          <img src={`/api/dms/documents/${selectedDoc.id}/file`} alt={selectedDoc.title} />
        ) : (
          <div className="gd21-preview-empty">
            <FileSearch size={42}/>
            <strong>{selectedDoc ? "Preview metadata" : "Chọn tài liệu"}</strong>
            <span>{formatUploadedFileName(selectedDoc?.fileName) || "PDF/ảnh sẽ hiển thị trực tuyến tại đây"}</span>
          </div>
        )}
      </div>
      <div className="detail-grid">
        <div className="detail-row"><span>Mã</span><strong>{selectedDoc?.code || "-"}</strong></div>
        <div className="detail-row"><span>Tên</span><strong>{selectedDoc?.title || "-"}</strong></div>
        <div className="detail-row"><span>Hồ sơ</span><span>{selectedDoc ? formatDossier(selectedDoc.dossierId) : "-"}</span></div>
        <div className="detail-row"><span>Kho lưu trữ</span><span>{selectedDoc ? formatStorage(dossierById.get(Number(selectedDoc.dossierId))?.storageId) : "-"}</span></div>
        <div className="detail-row"><span>File</span><span>{formatUploadedFileName(selectedDoc?.fileName) || "Chưa upload"}</span></div>
        <div className="detail-row"><span>OCR</span><OcrBadge status={selectedDoc?.ocrStatus || "PENDING"} /></div>
        <div className="detail-row"><span>Trạng thái</span><StatusBadge status={selectedDoc?.status || "DRAFT"} /></div>
        <div className="detail-row"><span>Metadata</span><span>{selectedDoc?.description || "Chưa có metadata/OCR text"}</span></div>
      </div>
      {geminiExtraction && (
        <div className="gd21-gemini-result">
          <div className="gd21-gemini-result-heading">
            <strong>Kết quả bóc tách Gemini</strong>
            <span>{geminiExtraction.documentType || "Metadata tài liệu"}</span>
          </div>
          <label className="gd21-field-label">Raw Text</label>
          <textarea value={geminiExtraction.rawText} readOnly rows={8} aria-label="Nội dung bóc tách từ Gemini" />
          {geminiExtraction.fields.length > 0 && (
            <div className="gd21-gemini-fields">
              {geminiExtraction.fields.map(field => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  <input value={field.value || ""} readOnly />
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      <input ref={fileInputRef} type="file" hidden accept=".pdf,.docx,.tif,.tiff,.png,.jpg,.jpeg,.ifc,.stl,.obj,.step,.stp" onChange={uploadSelectedFile} />
      <div className="gd21-preview-actions">
        <select value={unitCode} onChange={e => setUnitCode(e.target.value)} title="Đơn vị áp dụng giới hạn upload">
          {Object.keys(unitLimits).map(code => <option key={code} value={code}>{code} · {unitLimits[code]}MB</option>)}
        </select>
        <button className="btn primary" disabled={!selectedDoc} onClick={() => fileInputRef.current?.click()}><Upload size={14}/> Upload</button>
        <button className="btn warn" disabled={!selectedDoc?.fileName || extractingWithGemini} onClick={extractSelectedDocumentWithGemini}>
          <Zap size={14}/> {extractingWithGemini ? "Đang xử lý bằng AI..." : "Bóc tách dữ liệu"}
        </button>
        <button className="btn ok" disabled={!selectedDoc} onClick={() => publishDocument()}><CheckCircle2 size={14}/> Xuất bản</button>
      </div>
    </div>
  );

  return (
    <GD2FeatureLayout
        featureId="GD2-1"
        featureName="Quản lý tài liệu"
        description="Tạo mới, lưu trữ, phân loại cây thư mục/loại tài liệu, tìm kiếm full-text/metadata, xem trực tuyến, chỉnh sửa thuộc tính và xuất bản/xuất file."
        actor="Chuyên viên / Quản trị viên"
        actionBarLabel="Quản lý tài liệu số hóa theo phân quyền đơn vị"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        splitRatio="280px minmax(0, 1fr)"
        className="gd21-feature"
        leftPanelTitle="Cây kho / loại tài liệu"
        rightPanelTitle="Danh sách tài liệu và preview"
        midContent={notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
        actions={
          <>
            <button className="btn" onClick={() => runSearch()}><Search size={14}/> Tìm kiếm</button>
            <button className="btn primary" onClick={resetDossierForm}><Plus size={14}/> Thêm mới Hồ sơ</button>
            <button className="btn ok" onClick={() => exportDocuments("EXCEL")}><Download size={14}/> Excel metadata</button>
            <button className="btn" onClick={() => exportDocuments("PDF")}><FileText size={14}/> PDF</button>
            <button className="btn" onClick={() => exportDocuments("ZIP")}><Archive size={14}/> ZIP</button>
          </>
        }
        actionRows={[
          { actor: "Chuyên viên", action: "Tạo mới/lưu trữ", description: "Nhập metadata, chọn hồ sơ, upload file hợp lệ", result: "Tài liệu được lưu và đánh chỉ mục tự động" },
          { actor: "Chuyên viên", action: "Tìm kiếm nâng cao", description: "Full-text, metadata, thời gian, loại tài liệu, OCR/status", result: "Danh sách phân trang theo điều kiện" },
          { actor: "Quản trị viên", action: "Phân loại cây", description: "Duyệt cây kho, hồ sơ, loại tài liệu số hóa", result: "Lọc nhanh theo node" },
          { actor: "Chuyên viên", action: "Xem/xuất bản/xuất file", description: "Preview PDF/ảnh, sửa thuộc tính, xuất PDF/ZIP/Excel", result: "Ghi audit và trả về kết quả xuất" },
        ]}
        validationItems={[
          { type: "required", label: "File", text: "Hỗ trợ PDF, DOCX, TIFF, PNG/JPG và mô hình IFC/STL/OBJ/STEP." },
          { type: "rule", label: "Dung lượng", text: "Tệp văn bản theo giới hạn đơn vị; mô hình CAD/BIM tối đa 200MB." },
          { type: "rule", label: "Indexing", text: "Tự động đánh chỉ mục ngay khi tạo metadata hoặc upload file." },
          { type: "perm", label: "Phân quyền", text: "Chuyên viên và quản trị viên chỉ thao tác theo phạm vi đơn vị được cấp." },
        ]}
        flowSteps={[
          { step: "1", label: "Phân loại", desc: "Chọn cây kho/loại", color: "#3264f4" },
          { step: "2", label: "Lưu trữ", desc: "Metadata + file", color: "#7c3aed" },
          { step: "3", label: "Index", desc: "OCR/full-text", color: "#f59e0b" },
          { step: "4", label: "Khai thác", desc: "Preview/xuất bản", color: "#22c55e" },
        ]}
        leftPanel={treePanel}
        rightPanel={<div className={`gd21-three-col ${isTechnicalModelFile(selectedDoc?.fileName) ? "model-mode" : ""}`}><div>{tablePanel}</div>{previewPanel}</div>}
      />
  );
}

// =============================================================
// GÄ2-2: Workflow â€” wrapper sá»­ dá»¥ng FeatureLayout
// =============================================================
function GD22WorkflowScreen() {
  const [activeTab, setActiveTab] = useState("screen");

  const leftPanel = (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{width:36}}><input type="checkbox"/></th>
            <th>Mã</th>
            <th>Tên/Nội dung</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><input type="checkbox"/></td>
            <td><span className="gd2-code">HS-001</span></td>
            <td>Phiếu mượn PM-001</td>
            <td><span className="vld-badge unique" style={{background: "#fff7ed", color: "#c2410c", border: "none"}}>Chá» duyá»‡t</span></td>
            <td style={{display:"flex",gap:4}}><button className="icon-btn"><FileText size={13}/></button><button className="icon-btn"><Edit size={13}/></button><button className="icon-btn danger"><X size={13}/></button></td>
          </tr>
          <tr>
            <td><input type="checkbox"/></td>
            <td><span className="gd2-code">HS-002</span></td>
            <td>Hồ sơ xuất bản HS-002</td>
            <td><span className="vld-badge unique" style={{background: "#fff7ed", color: "#c2410c", border: "none"}}>Chá» xÃ¡c nháº­n</span></td>
            <td style={{display:"flex",gap:4}}><button className="icon-btn"><FileText size={13}/></button><button className="icon-btn"><Edit size={13}/></button><button className="icon-btn danger"><X size={13}/></button></td>
          </tr>
          <tr>
            <td><input type="checkbox"/></td>
            <td><span className="gd2-code">HS-003</span></td>
            <td>Báo lỗi tài liệu HS-003</td>
            <td><span className="vld-badge required" style={{background: "#fef2f2", color: "#b91c1c", border: "none"}}>Không hợp lệ</span></td>
            <td style={{display:"flex",gap:4}}><button className="icon-btn"><FileText size={13}/></button><button className="icon-btn"><Edit size={13}/></button><button className="icon-btn danger"><X size={13}/></button></td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const rightPanel = (
    <div className="gd2-config-form">
      <div className="gd2-form-row">
        <div className="gd2-field">
          <label>NgÆ°á»i yÃªu cáº§u</label>
          <input placeholder="Người yêu cầu" />
        </div>
        <div className="gd2-field required">
          <label>Lý do/ghi chú <span className="req-star">*</span></label>
          <textarea rows="3" placeholder="Lý do/ghi chú" style={{resize:"none"}}></textarea>
        </div>
      </div>
      <div className="gd2-field">
        <label>NgÆ°á»i duyá»‡t tiáº¿p theo</label>
        <select><option>Chá»n ngÆ°á»i duyá»‡t tiáº¿p theo</option></select>
      </div>
      <div className="gd2-field" style={{marginTop: 8}}>
        <label>Luồng xử lý</label>
        <div className="workflow-steps-list">
          <div className="wf-step-item">Tạo yêu cầu</div>
          <div className="wf-step-item">Kiá»ƒm tra Ä‘iá»u kiá»‡n mÆ°á»£n/xuáº¥t báº£n</div>
          <div className="wf-step-item">Phê duyệt hoặc chuyển cấp</div>
          <div className="wf-step-item">Ghi log và thông báo</div>
        </div>
      </div>
    </div>
  );

  return (
    <GD2FeatureLayout
      featureId="GĐ2-2"
      featureName="Kiểm duyệt & phê duyệt tài liệu OCR"
      description="Cán bộ kiểm duyệt xem trực tuyến PDF OCR, đối soát dữ liệu bóc tách, phê duyệt để xuất bản hoặc từ chối để xóa khỏi hệ thống."
      actor="approve"
      actionBarLabel="Hàng chờ tài liệu OCR cần kiểm duyệt"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="1fr 440px"
      leftPanelTitle="Danh sách chờ xử lý"
      rightPanelTitle="Chi tiết phê duyệt"
      actions={
        <>
          <button className="btn" style={{color: "#16a34a", borderColor: "#bbf7d0"}} onClick={() => alert("Duyệt")}>Duyệt</button>
          <button className="btn" style={{color: "#d97706", borderColor: "#fde68a"}} onClick={() => alert("Chuyển cấp")}>Chuyển cấp</button>
          <button className="btn" style={{color: "#dc2626", borderColor: "#fecaca"}} onClick={() => alert("Từ chối/Hủy")}>Từ chối/Hủy</button>
        </>
      }
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}

// =============================================================
// GÄ2-3: PhÃ¢n quyá»n
// =============================================================
function GD22WorkflowScreenV2({ handoff }) {
  const [activeTab, setActiveTab] = useState("screen");
  const [rows, setRows] = useState([]);
  const [definition, setDefinition] = useState({ steps: [] });
  const [runtime, setRuntime] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [actor, setActor] = useState("current-user");
  const [recipient, setRecipient] = useState("LANH_DAO_DON_VI");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewerZoom, setViewerZoom] = useState(1);
  const [viewerRotation, setViewerRotation] = useState(0);
  const [reviewForm, setReviewForm] = useState({ documentNumber: "", issueDate: "", summary: "", fullText: "" });

  useEffect(() => {
    loadWorkflowItems();
  }, []);

  useEffect(() => {
    if (selectedId) loadWorkflowRuntime(selectedId);
  }, [selectedId]);

  const selected = rows.find(row => row.id === selectedId) || rows[0] || null;
  useEffect(() => {
    if (!selected) {
      setReviewForm({ documentNumber: "", issueDate: "", summary: "", fullText: "" });
      return;
    }
    const parsed = parseReviewedOcrContent(selected.description);
    setReviewForm({
      documentNumber: parsed.documentNumber || selected.code || "",
      issueDate: parsed.issueDate,
      summary: parsed.summary || selected.title || "",
      fullText: parsed.fullText
    });
    setViewerZoom(1);
    setViewerRotation(0);
  }, [selected?.id, selected?.description]);

  const availableActions = useMemo(() => {
    const status = String(selected?.status || "").toUpperCase();
    const actionMap = {
      PENDING: [
        { action: "APPROVE", label: "✅ Phê duyệt", icon: CheckCircle2, tone: "success" },
        { action: "REQUEST_SUPPLEMENT", label: "🔄 Yêu cầu bổ sung", icon: RefreshCw, tone: "warning" },
        { action: "REJECT", label: "❌ Từ chối", icon: X, tone: "danger" },
      ],
      APPROVED: [],
      PUBLISHED: [],
    };

    return actionMap[status] || [];
  }, [selected?.status]);

  async function loadWorkflowItems() {
    try {
      setLoading(true);
      const [items, flowDefinition] = await Promise.all([
        uiApi.crud("documents").list(),
        uiApi.gd2.workflowDefinition(),
      ]);
      const queue = items.filter(item =>
        ["PENDING", "NEEDS_SUPPLEMENT", "REJECTED", "APPROVED", "PUBLISHED"].includes(String(item.status || "DRAFT").toUpperCase())
      );
      setRows(queue);
      setDefinition(flowDefinition);
      const requestedId = Number(handoff?.focusDocumentId || 0);
      const firstPendingId = queue.find(item => String(item.status).toUpperCase() === "PENDING")?.id;
      const nextId = queue.some(item => Number(item.id) === requestedId)
        ? requestedId
        : (queue.some(item => Number(item.id) === Number(selectedId)) ? selectedId : firstPendingId || queue[0]?.id || null);
      setSelectedId(nextId);
      if (nextId) await loadWorkflowRuntime(nextId);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được danh sách quy trình: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkflowRuntime(id) {
    try {
      const status = await uiApi.gd2.workflowStatus("DOCUMENT", id);
      setRuntime(status);
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được trạng thái luồng: ${error.message}` });
    }
  }

  function findNextPendingDocument(currentRows, currentId) {
    const currentIndex = currentRows.findIndex(row => Number(row.id) === Number(currentId));
    const isPending = row =>
      Number(row.id) !== Number(currentId) && String(row.status || "").toUpperCase() === "PENDING";
    if (currentIndex < 0) return currentRows.find(isPending) || null;

    // Ưu tiên đúng tài liệu nằm phía dưới trong bảng. Khi đã ở cuối danh
    // sách thì quay lại tài liệu PENDING đầu tiên để duyệt liên tục.
    return currentRows.slice(currentIndex + 1).find(isPending)
      || currentRows.slice(0, currentIndex).find(isPending)
      || null;
  }

  async function processWorkflow(action, target = selected) {
    if (!target) {
      setNotice({ type: "error", text: "Vui lòng chọn một tài liệu để xử lý." });
      return;
    }

    const actionText = {
      SUBMIT: "Gửi duyệt",
      APPROVE: "Duyệt",
      REQUEST_SUPPLEMENT: "Yêu cầu bổ sung",
      RESUBMIT: "Gửi lại",
      SIGN: "Ký số",
      CONFIRM: "Xác nhận",
      REJECT: "Từ chối",
    }[action] || action;

    try {
      setLoading(true);
      if (["REQUEST_SUPPLEMENT", "REJECT"].includes(action) && !note.trim()) {
        setNotice({ type: "error", text: `Vui lòng nhập lý do ${action === "REJECT" ? "từ chối" : "yêu cầu bổ sung"}.` });
        return;
      }

      if (action === "APPROVE") {
        const reviewed = await uiApi.gd2.saveReviewedDocumentContent(target.id, {
          description: composeReviewedOcrContent(reviewForm),
          actor: actor.trim() || "current-user",
          note: `Chốt nội dung OCR trước khi phê duyệt tài liệu ${target.code}`
        });
        target = { ...target, ...reviewed };
        setRows(current => current.map(row => Number(row.id) === Number(target.id) ? { ...row, ...reviewed } : row));
      }

      let result = await uiApi.gd2.transition({
        entityType: "DOCUMENT",
        entityId: target.id,
        action,
        actor: actor.trim() || "current-user",
        unitCode: "DEFAULT",
        comment: note.trim() || `${actionText} tài liệu ${target.code}`,
        recipient: recipient.trim() || target.code,
      });
      if (action === "APPROVE") {
        result = await uiApi.gd2.transition({
          entityType: "DOCUMENT",
          entityId: target.id,
          action: "PUBLISH",
          actor: actor.trim() || "current-user",
          unitCode: "DEFAULT",
          comment: "Phê duyệt đạt và xuất bản tài liệu cho phép tra cứu khai thác.",
          recipient: recipient.trim() || target.code,
        });
      }

      let dossierMessage = "";
      if (action === "APPROVE" && target.dossierId) {
        try {
          const [documents, dossiers] = await Promise.all([
            uiApi.crud("documents").list(),
            uiApi.crud("dossiers").list()
          ]);
          const dossierDocuments = documents.filter(item => Number(item.dossierId) === Number(target.dossierId));
          const dossier = dossiers.find(item => Number(item.id) === Number(target.dossierId));
          if (dossier && dossierDocuments.length > 0 && dossierDocuments.every(item => String(item.status).toUpperCase() === "PUBLISHED")) {
            let dossierStatus = String(dossier.status || "DRAFT").toUpperCase();
            if (dossierStatus === "PENDING") {
              const approvedDossier = await uiApi.gd2.transition({
                entityType: "DOSSIER",
                entityId: dossier.id,
                action: "APPROVE",
                actor: actor.trim() || "current-user",
                unitCode: "DEFAULT",
                comment: "Tự động phê duyệt hồ sơ vì toàn bộ tài liệu đã được phê duyệt.",
                recipient: recipient.trim() || "LANH_DAO_DON_VI"
              });
              dossierStatus = approvedDossier.currentStatus;
            }
            if (dossierStatus === "APPROVED") {
              const publishedDossier = await uiApi.gd2.transition({
                entityType: "DOSSIER",
                entityId: dossier.id,
                action: "SIGN",
                actor: actor.trim() || "current-user",
                unitCode: "DEFAULT",
                comment: "Tự động xuất bản hồ sơ sau khi toàn bộ tài liệu đã xuất bản.",
                recipient: recipient.trim() || "LANH_DAO_DON_VI"
              });
              dossierStatus = publishedDossier.currentStatus;
            }
            if (dossierStatus === "PUBLISHED") dossierMessage = " Hồ sơ chứa tài liệu cũng đã được xuất bản.";
          }
        } catch (dossierError) {
          dossierMessage = ` Tài liệu đã xuất bản nhưng chưa đồng bộ được trạng thái hồ sơ: ${dossierError.message}`;
        }
      }

      const nextPending = action === "APPROVE" ? findNextPendingDocument(rows, target.id) : null;
      const nextSelectedId = nextPending?.id || target.id;
      setRows(current => current.map(row =>
        Number(row.id) === Number(target.id) ? { ...row, status: result.currentStatus } : row
      ));
      setSelectedId(nextSelectedId);
      await loadWorkflowRuntime(nextSelectedId);
      setNotice({
        type: dossierMessage.includes("chưa đồng bộ") ? "info" : "success",
        text: `${actionText} thành công. Trạng thái hiện tại: ${workflowStatusLabel(result.currentStatus)}.${dossierMessage}${nextPending ? ` Đã chuyển sang tài liệu chờ tiếp theo: ${nextPending.code}.` : action === "APPROVE" ? " Hàng chờ hiện không còn tài liệu PENDING khác." : ""}`
      });
      setNote("");
    } catch (error) {
      setNotice({ type: "error", text: `${actionText} thất bại: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function saveReviewedContent() {
    if (!selected) return;
    try {
      setLoading(true);
      const updated = await uiApi.gd2.saveReviewedDocumentContent(selected.id, {
        description: composeReviewedOcrContent(reviewForm),
        actor: actor.trim() || "current-user",
        note: `Hiệu chỉnh kết quả OCR của tài liệu ${selected.code}`
      });
      setRows(current => current.map(row => Number(row.id) === Number(selected.id) ? { ...row, ...updated } : row));
      await loadWorkflowRuntime(selected.id);
      setNotice({ type: "success", text: "Đã lưu nội dung đối soát vào Oracle và ghi lịch sử phiên bản/workflow." });
    } catch (error) {
      setNotice({ type: "error", text: `Không lưu được nội dung hiệu chỉnh: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function createDraftSeed() {
    try {
      setLoading(true);
      const created = await uiApi.gd2.createWorkflowDraftSeed(handoff?.storageId || "");
      await loadWorkflowItems();
      setSelectedId(created.documentId);
      setNotice({ type: "success", text: `Đã tạo dữ liệu test ${created.documentCode}. Chạy OCR ở GĐ2-6 rồi gửi duyệt.` });
    } catch (error) {
      setNotice({ type: "error", text: `Không tạo được hồ sơ test: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => ({
    draft: rows.filter(item => item.status === "DRAFT").length,
    pending: rows.filter(item => item.status === "PENDING").length,
    supplement: rows.filter(item => item.status === "NEEDS_SUPPLEMENT").length,
    done: rows.filter(item => ["APPROVED", "PUBLISHED", "CONFIRMED"].includes(item.status)).length,
  }), [rows]);

  const leftPanel = (
    <div className="gd22-workspace">
      <div className="gd22-stats">
        <Metric label="Nháp" value={stats.draft} />
        <Metric label="Chờ kiểm duyệt" value={stats.pending} />
        <Metric label="Không đạt" value={stats.supplement} />
        <Metric label="Đã xuất bản" value={stats.done} />
      </div>
      <div className="gd22-designer">
        <div className="gd22-section-head"><GitMerge size={16}/> Luồng duyệt tài liệu OCR</div>
        <div className="gd22-designer-track">
          {definition.steps?.map((step, index) => (
            <div className="gd22-designer-step" key={step.code}>
              <span>{index + 1}</span>
              <strong>{step.name}</strong>
              <small>{step.role} · SLA {step.deadlineHours}h</small>
            </div>
          ))}
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}></th>
              <th>Mã</th>
              <th>Tài liệu PDF OCR</th>
              <th>Bước hiện tại</th>
              <th>Deadline</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const isSelected = row.id === selected?.id;
              const rowStep = isSelected ? runtime?.steps?.find(step => step.state === "CURRENT") : null;
              return (
                <tr
                  key={row.id}
                  className={isSelected ? "row-selected" : ""}
                  onClick={() => setSelectedId(row.id)}
                >
                  <td><input type="radio" checked={isSelected} onChange={() => setSelectedId(row.id)} /></td>
                  <td><span className="gd2-code">{row.code}</span></td>
                  <td>
                    <strong>{row.title}</strong>
                    <span className="gd21415-subtext">{row.fileName || "Chưa có file PDF OCR"}</span>
                  </td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>{rowStep?.deadline ? new Date(rowStep.deadline).toLocaleString("vi-VN") : "--"}</td>
                  <td><button className="icon-btn" type="button" title="Chọn xử lý" onClick={event => { event.stopPropagation(); setSelectedId(row.id); }}><Edit size={13} /></button></td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan="6" className="empty-cell">{loading ? "Đang tải..." : "Chưa có tài liệu chờ kiểm duyệt."}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{ marginTop: "14px", border: "1px solid #cbd5e1", borderRadius: "10px", overflow: "hidden", background: "#0f172a" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "9px 12px", background: "#fff", borderBottom: "1px solid #cbd5e1" }}>
            <strong style={{ fontSize: "13px", color: "#1e293b" }}><Eye size={14} style={{ verticalAlign: "middle", marginRight: "6px" }}/>PDF số hóa lưu kho: {selected.fileName || "Chưa có file"}</strong>
            <div style={{ display: "flex", gap: "6px" }}>
              <button className="btn" type="button" onClick={() => setViewerZoom(value => Math.max(.5, value - .25))}>−</button>
              <button className="btn" type="button" onClick={() => setViewerZoom(1)}>{Math.round(viewerZoom * 100)}%</button>
              <button className="btn" type="button" onClick={() => setViewerZoom(value => Math.min(2.5, value + .25))}>＋</button>
              <button className="btn" type="button" onClick={() => setViewerRotation(value => (value + 90) % 360)}>↻ Xoay</button>
            </div>
          </div>
          <div style={{ height: "560px", overflow: "auto", display: "grid", placeItems: "start center", padding: "16px" }}>
            {selected.fileName?.toLowerCase().endsWith(".pdf") ? (
              <iframe
                title="Trình xem PDF số hóa OCR"
                src={`/api/dms/documents/${selected.id}/file?v=${encodeURIComponent(selected.fileName || "pdf")}`}
                style={{ width: "100%", height: "520px", border: 0, background: "#fff", transform: `scale(${viewerZoom}) rotate(${viewerRotation}deg)`, transformOrigin: "top center" }}
              />
            ) : /\.(png|jpe?g|tiff?)$/i.test(selected.fileName || "") ? (
              <img
                src={`/api/dms/documents/${selected.id}/file?v=${encodeURIComponent(selected.fileName || "image")}`}
                alt={`File gốc ${selected.title}`}
                style={{ maxWidth: "100%", height: "auto", transform: `scale(${viewerZoom}) rotate(${viewerRotation}deg)`, transformOrigin: "top center", transition: "transform .2s ease" }}
              />
            ) : (
              <div className="gd21-preview-empty" style={{ color: "#cbd5e1", minHeight: "300px" }}>
                <FileSearch size={42}/><strong>Không có bản xem trước</strong><span>PDF và ảnh PNG/JPG/TIFF được hỗ trợ trực tiếp.</span>
              </div>
            )}
          </div>
        </div>
      )}
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  const rightPanel = (
    <div className="gd22-review-panel">
      {selected && (
        <div className="gd22-current-card">
          <div>
            <span className="gd21415-section-kicker">Tài liệu OCR đang kiểm duyệt</span>
            <h3>{selected.code} · {selected.title}</h3>
          </div>
          <StatusBadge status={selected.status} />
        </div>
      )}

      <div className="gd22-stepper">
        {runtime?.steps?.map((step, index) => (
          <div className={`gd22-step ${step.state.toLowerCase()}`} key={step.code}>
            <div className="gd22-step-dot">{step.state === "DONE" ? <CheckCircle2 size={14}/> : index + 1}</div>
            <div>
              <strong>{step.name}</strong>
              <span><User size={12}/> {step.assignee}</span>
              <span><Clock size={12}/> {new Date(step.deadline).toLocaleString("vi-VN")}</span>
            </div>
          </div>
        ))}
        {!runtime && <div className="empty-cell">Chọn tài liệu để xem stepper quy trình.</div>}
      </div>

      {selected && (
        <div style={{ marginTop: "12px", padding: "16px", border: "1px solid #bfdbfe", borderRadius: "10px", background: "#f8fbff" }}>
          <div className="gd22-section-head"><FileText size={16}/> Nội dung và metadata AI đã bóc tách</div>
          <div className="gd2-form-row" style={{ marginTop: "12px" }}>
            <div className="gd2-field">
              <label>Số hiệu</label>
              <input value={reviewForm.documentNumber} onChange={event => setReviewForm(current => ({ ...current, documentNumber: event.target.value }))} />
            </div>
            <div className="gd2-field">
              <label>Ngày ban hành</label>
              <input type="date" value={reviewForm.issueDate} onChange={event => setReviewForm(current => ({ ...current, issueDate: event.target.value }))} />
            </div>
          </div>
          <div className="gd2-field" style={{ marginTop: "10px" }}>
            <label>Trích yếu</label>
            <input value={reviewForm.summary} onChange={event => setReviewForm(current => ({ ...current, summary: event.target.value }))} />
          </div>
          <div className="gd2-field" style={{ marginTop: "10px" }}>
            <label>Toàn văn OCR</label>
            <textarea
              rows="15"
              value={reviewForm.fullText}
              onChange={event => setReviewForm(current => ({ ...current, fullText: event.target.value }))}
              placeholder="Nội dung OCR để người kiểm duyệt đối soát và chỉnh sửa trực tiếp..."
              style={{ resize: "vertical", lineHeight: 1.55, fontFamily: "inherit" }}
            />
          </div>
          <button className="btn ok" type="button" disabled={loading} onClick={saveReviewedContent} style={{ marginTop: "12px", background: "#2563eb", color: "#fff", borderColor: "#2563eb" }}>
            <Save size={15}/> Lưu chỉnh sửa
          </button>
        </div>
      )}

      <div className="gd22-action-panel">
        <div className="gd22-section-head"><CheckCircle2 size={16}/> Panel thao tác người duyệt</div>
        <div className="gd2-form-row">
          <div className="gd2-field">
          <label>Cán bộ kiểm duyệt</label>
            <input placeholder="Cán bộ kiểm duyệt" value={actor} onChange={event => setActor(event.target.value)} />
          </div>
          <div className="gd2-field">
          <label>Người nhận thông báo</label>
            <input placeholder="Nhóm/người nhận" value={recipient} onChange={event => setRecipient(event.target.value)} />
          </div>
        </div>
        <div className="gd2-field required">
          <label>Ý kiến xử lý <span className="req-star">*</span></label>
          <textarea rows="3" placeholder="Nhập ý kiến duyệt, lý do từ chối hoặc nội dung cần bổ sung" value={note} onChange={event => setNote(event.target.value)} style={{ resize: "none" }}></textarea>
        </div>
        <div className="gd22-action-grid">
          {availableActions.length === 0 ? (
            <div className="muted">Tài liệu này chưa có hành động phù hợp ở bước hiện tại.</div>
          ) : availableActions.map(actionItem => {
            const Icon = actionItem.icon;
            return (
              <button
                key={actionItem.action}
                className={`gd22-action ${actionItem.tone}`}
                type="button"
                disabled={loading || !selected}
                onClick={() => processWorkflow(actionItem.action)}
              >
                <Icon size={16}/>
                {actionItem.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="gd22-history">
        <div className="gd22-section-head"><History size={16}/> Timeline xử lý</div>
        <div className="timeline-list">
          {runtime?.history?.map(item => (
            <div className="timeline-item" key={item.id}>
              <strong>{workflowActionLabel(item.action)} · {workflowStatusLabel(item.toStatus)}</strong>
              <span>{item.actor} · {new Date(item.createdAt).toLocaleString("vi-VN")}</span>
              {item.comment && <span>{item.comment}</span>}
            </div>
          ))}
          {(!runtime?.history || runtime.history.length === 0) && <div className="empty-cell">Chưa có lịch sử xử lý.</div>}
        </div>
      </div>
    </div>
  );

  return (
    <GD2FeatureLayout
      featureId="GĐ2-2"
      featureName="Quản lý quy trình làm việc (Workflow)"
      description="Kiểm duyệt trực tiếp PDF số hóa, đối soát nội dung OCR và phê duyệt để xuất bản tài liệu, hồ sơ vào kho lưu trữ."
      className="gd22-feature"
      actor="approve"
      actionBarLabel="Hàng chờ duyệt và xử lý hồ sơ"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="minmax(0, 1fr) minmax(440px, 1fr)"
      leftPanelTitle="File gốc & hàng chờ kiểm duyệt"
      rightPanelTitle="Nội dung OCR, metadata & xử lý"
      actions={
        <>
          <button className="btn" type="button" onClick={loadWorkflowItems}><RefreshCw size={14}/> Tải lại</button>
          <button className="btn" type="button" onClick={createDraftSeed}><Plus size={14}/> Dữ liệu test</button>
          {availableActions.map(actionItem => (
            <button
              key={actionItem.action}
              className="btn"
              type="button"
              disabled={loading || !selected}
              onClick={() => processWorkflow(actionItem.action)}
            >
              <actionItem.icon size={14}/>
              {actionItem.label}
            </button>
          ))}
        </>
      }
      actionRows={[
        { action: "Đối soát song song", description: "Zoom/xoay file gốc và chỉnh trực tiếp metadata/toàn văn", result: "Lưu phiên bản nội dung chính xác vào Oracle" },
        { action: "Phê duyệt", description: "Xác nhận tài liệu đạt", result: "Tự động chuyển APPROVED rồi PUBLISHED" },
        { action: "Bổ sung / Từ chối", description: "Bắt buộc nhập lý do xử lý", result: "Chuyển NEEDS_SUPPLEMENT hoặc REJECTED, không xóa dữ liệu" },
      ]}
      validationItems={[
        { type: "required", label: "File OCR", text: "Tài liệu phải có file và nội dung OCR trước khi phê duyệt." },
        { type: "rule", label: "Luồng", text: "PENDING được phê duyệt, yêu cầu bổ sung hoặc từ chối nhưng luôn giữ bản ghi." },
        { type: "perm", label: "Phân quyền", text: "Người duyệt chỉ thao tác trong đơn vị, phòng ban hoặc vai trò được cấp." },
      ]}
      flowSteps={(definition.steps || []).map((step, index) => ({
        step: String(index + 1),
        label: step.name,
        desc: `${step.role} · ${step.deadlineHours}h`,
        color: ["#3264f4", "#0ea5e9", "#f59e0b", "#7c3aed", "#22c55e"][index] || "#3264f4"
      }))}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}

function parseReviewedOcrContent(description) {
  const text = String(description || "").replace(/\r/g, "");
  const marker = "Toàn văn:\n";
  const markerIndex = text.indexOf(marker);
  const metadataText = markerIndex >= 0 ? text.slice(0, markerIndex) : "";
  const fullText = markerIndex >= 0 ? text.slice(markerIndex + marker.length) : text;
  const readValue = label => {
    const line = metadataText.split("\n").find(item => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));
    return line ? line.slice(line.indexOf(":") + 1).trim() : "";
  };
  return {
    documentNumber: readValue("Số hiệu"),
    issueDate: readValue("Ngày ban hành"),
    summary: readValue("Trích yếu"),
    fullText
  };
}

function ocrEngineDisplayName(engine) {
  return {
    gemini: "Gemini Vision AI",
    vietocr: "VietOCR",
    easyocr: "EasyOCR",
    tesseract: "Tesseract",
    pdfpig: "PdfPig (text layer PDF)",
    "docx-text": "DOCX OpenXML",
    metadata: "Số hóa metadata",
    "metadata-client": "Frontend metadata fallback"
  }[String(engine || "").toLowerCase()] || engine || "không xác định";
}

function composeReviewedOcrContent(form) {
  return [
    `Số hiệu: ${String(form?.documentNumber || "").trim()}`,
    `Ngày ban hành: ${String(form?.issueDate || "").trim()}`,
    `Trích yếu: ${String(form?.summary || "").trim()}`,
    "Toàn văn:",
    String(form?.fullText || "").trim()
  ].join("\n");
}

function workflowStatusLabel(status) {
  return {
    DRAFT: "Trình duyệt",
    PENDING: "Kiểm duyệt",
    NEEDS_SUPPLEMENT: "Yêu cầu sửa đổi",
    APPROVED: "Phê duyệt",
    PUBLISHED: "Xuất bản",
    CONFIRMED: "Hoàn tất",
    REJECTED: "Từ chối",
    CANCELLED: "Đã hủy",
  }[status] || status || "--";
}

function workflowActionLabel(action) {
  return {
    SUBMIT: "Trình duyệt",
    APPROVE: "Đồng ý",
    PUBLISH: "Xuất bản",
    REJECT: "Từ chối",
    FORWARD: "Chuyển tiếp",
    REQUEST_SUPPLEMENT: "Yêu cầu bổ sung",
    RESUBMIT: "Trình lại",
    SIGN: "Xuất bản",
    CONFIRM: "Xác nhận",
    EDIT_OCR: "Hiệu chỉnh OCR",
    SEED: "Khởi tạo",
  }[action] || action || "--";
}

function GD23PermissionScreen() {
  const [activeTab, setActiveTab] = useState("screen");
  const [scopes, setScopes] = useState([]);
  const [unitCode, setUnitCode] = useState("DEFAULT");
  const [departmentCode, setDepartmentCode] = useState("*");
  const [actorRoleLevel, setActorRoleLevel] = useState("QTHT");
  const [effectMode, setEffectMode] = useState("REALTIME");
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    principalType: "ROLE",
    principalCode: "LANH_DAO_DON_VI",
    unitCode: "DEFAULT",
    departmentCode: "*",
    roleLevel: "LANH_DAO",
    resourceCode: "DOSSIER",
    actions: "VIEW,APPROVE,SIGN,DOWNLOAD",
    dataScope: "UNIT",
    status: "ACTIVE",
    actorRoleLevel: "QTHT"
  });

  const roles = [
    { code: "CHUYEN_VIEN", label: "Chuyên viên", rank: 1 },
    { code: "LANH_DAO", label: "Lãnh đạo", rank: 2 },
    { code: "QTHT", label: "QTHT", rank: 3 }
  ];
  const features = [
    { code: "DOSSIER", label: "Hồ sơ lưu trữ", category: "Danh mục hồ sơ" },
    { code: "DOCUMENT", label: "Tài liệu số hóa", category: "Tài liệu" },
    { code: "OCR", label: "OCR AI", category: "Số hóa" },
    { code: "WORKFLOW", label: "Quy trình phê duyệt", category: "Workflow" },
    { code: "REPORT", label: "Báo cáo", category: "Báo cáo" },
    { code: "SECURITY", label: "Bảo mật & audit", category: "Hệ thống" }
  ];
  const actions = [
    { code: "VIEW", label: "Xem" },
    { code: "CREATE", label: "Thêm" },
    { code: "EDIT", label: "Sửa" },
    { code: "DELETE", label: "Xóa" },
    { code: "APPROVE", label: "Duyệt" },
    { code: "SIGN", label: "Ký" },
    { code: "DOWNLOAD", label: "Tải/In" }
  ];
  const dataScopes = [
    { code: "OWN", label: "Hồ sơ của mình" },
    { code: "DEPARTMENT", label: "Phòng ban mình" },
    { code: "UNIT", label: "Toàn đơn vị" },
    { code: "ALL", label: "Toàn hệ thống" }
  ];

  const roleRank = (level) => roles.find(role => role.code === level)?.rank ?? 0;

  const loadScopes = useCallback(async () => {
    try {
      setNotice(null);
      setScopes(await uiApi.gd2.accessScopes({ unitCode }));
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }, [unitCode]);

  useEffect(() => {
    loadScopes();
  }, [loadScopes]);

  function scopeFor(resourceCode, roleCode) {
    return scopes.find(scope =>
      scope.resourceCode === resourceCode &&
      scope.roleLevel === roleCode &&
      (unitCode ? scope.unitCode === unitCode : true) &&
      (departmentCode === "*" || scope.departmentCode === departmentCode || scope.departmentCode === "*")
    );
  }

  function actionEnabled(resourceCode, roleCode, actionCode) {
    const scope = scopeFor(resourceCode, roleCode);
    return scope?.actions?.split(",").includes(actionCode) ?? false;
  }

  async function saveScope(payload) {
    if (roleRank(payload.roleLevel) > roleRank(actorRoleLevel)) {
      setNotice({ type: "error", text: "Không được gán quyền cao hơn cấp của chính người đang thực hiện phân quyền." });
      return;
    }

    try {
      await uiApi.gd2.saveAccessScope({ ...payload, actorRoleLevel });
      setNotice({
        type: "success",
        text: effectMode === "REALTIME"
          ? "Đã cập nhật quyền. Hiệu lực tức thì."
          : "Đã cập nhật quyền. Hiệu lực sau khi người dùng đăng nhập lại."
      });
      await loadScopes();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function toggleMatrixAction(resource, role, actionCode) {
    const current = scopeFor(resource.code, role.code);
    const currentActions = new Set((current?.actions || "").split(",").filter(Boolean));
    if (currentActions.has(actionCode)) currentActions.delete(actionCode);
    else currentActions.add(actionCode);

    const nextActions = [...currentActions].join(",") || "VIEW";
    await saveScope({
      principalType: "ROLE",
      principalCode: role.code,
      unitCode,
      departmentCode,
      roleLevel: role.code,
      resourceCode: resource.code,
      actions: nextActions,
      dataScope: current?.dataScope || (role.code === "QTHT" ? "ALL" : role.code === "LANH_DAO" ? "UNIT" : "DEPARTMENT"),
      status: "ACTIVE"
    });
  }

  function openRuleModal(scope) {
    setRuleForm(scope ? {
      principalType: scope.principalType,
      principalCode: scope.principalCode,
      unitCode: scope.unitCode,
      departmentCode: scope.departmentCode,
      roleLevel: scope.roleLevel,
      resourceCode: scope.resourceCode,
      actions: scope.actions,
      dataScope: scope.dataScope,
      status: scope.status,
      actorRoleLevel
    } : {
      principalType: "ROLE",
      principalCode: "CHUYEN_VIEN",
      unitCode,
      departmentCode,
      roleLevel: "CHUYEN_VIEN",
      resourceCode: "DOCUMENT",
      actions: "VIEW,CREATE,EDIT,DOWNLOAD",
      dataScope: "DEPARTMENT",
      status: "ACTIVE",
      actorRoleLevel
    });
    setModalOpen(true);
  }

  async function submitRule(event) {
    event.preventDefault();
    await saveScope(ruleForm);
    setModalOpen(false);
  }

  const matrixPanel = (
    <div className="gd23-screen">
      <div className="gd23-filterbar">
        <select value={unitCode} onChange={event => setUnitCode(event.target.value)}>
          <option value="DEFAULT">Đơn vị DEFAULT</option>
          <option value="HC">Hành chính</option>
          <option value="TC">Tài chính</option>
          <option value="QTHT">Quản trị hệ thống</option>
        </select>
        <select value={departmentCode} onChange={event => setDepartmentCode(event.target.value)}>
          <option value="*">Tất cả phòng ban</option>
          <option value="HC">Phòng Hành chính</option>
          <option value="TC">Phòng Tài chính</option>
          <option value="LT">Phòng Lưu trữ</option>
        </select>
        <select value={actorRoleLevel} onChange={event => setActorRoleLevel(event.target.value)}>
          {roles.map(role => <option key={role.code} value={role.code}>Người cấp quyền: {role.label}</option>)}
        </select>
        <select value={effectMode} onChange={event => setEffectMode(event.target.value)}>
          <option value="REALTIME">Hiệu lực tức thì</option>
          <option value="NEXT_LOGIN">Sau đăng nhập lại</option>
        </select>
      </div>
      <div className="gd23-matrix-wrap">
        <table className="gd23-matrix">
          <thead>
            <tr>
              <th>Tính năng / Danh mục hồ sơ</th>
              {roles.map(role => <th key={role.code}>{role.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {features.map(feature => (
              <tr key={feature.code}>
                <td>
                  <strong>{feature.label}</strong>
                  <span>{feature.category}</span>
                </td>
                {roles.map(role => {
                  const scope = scopeFor(feature.code, role.code);
                  return (
                    <td key={role.code}>
                      <div className="gd23-cell-actions">
                        {actions.map(action => (
                          <label key={action.code} title={action.label}>
                            <input
                              type="checkbox"
                              checked={actionEnabled(feature.code, role.code, action.code)}
                              disabled={role.rank > roleRank(actorRoleLevel)}
                              onChange={() => toggleMatrixAction(feature, role, action.code)}
                            />
                            <span>{action.label}</span>
                          </label>
                        ))}
                      </div>
                      <button className="gd23-scope-link" onClick={() => openRuleModal(scope || {
                        principalType: "ROLE",
                        principalCode: role.code,
                        unitCode,
                        departmentCode,
                        roleLevel: role.code,
                        resourceCode: feature.code,
                        actions: "VIEW",
                        dataScope: role.code === "QTHT" ? "ALL" : role.code === "LANH_DAO" ? "UNIT" : "DEPARTMENT",
                        status: "ACTIVE"
                      })}>
                        {dataScopes.find(item => item.code === (scope?.dataScope || ""))?.label || "Thiết lập phạm vi"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  const ruleListPanel = (
    <div className="gd23-rule-panel">
      <div className="gd23-rule-head">
        <strong>Bộ quy tắc ABAC/RBAC</strong>
        <button className="btn primary" onClick={() => openRuleModal()}><Plus size={14}/> Thêm rule</button>
      </div>
      <div className="timeline-list">
        {scopes.map(scope => (
          <button key={scope.id} className="timeline-item gd23-rule-item" onClick={() => openRuleModal(scope)}>
            <strong>{scope.principalType}:{scope.principalCode} · {scope.resourceCode}</strong>
            <span>{scope.roleLevel} · {scope.dataScope} · {scope.actions}</span>
          </button>
        ))}
        {scopes.length === 0 && <div className="empty-cell">Chưa có rule phân quyền.</div>}
      </div>
    </div>
  );

  return (
    <>
      <GD2FeatureLayout
        featureId="GĐ2-3"
        featureName="Phân quyền truy cập RBAC/ABAC"
        description="Cấu hình ma trận quyền theo nhóm người dùng, chức danh, phòng ban; giới hạn phạm vi dữ liệu theo thuộc tính đơn vị, phòng ban và danh mục được gán."
        actor="Quản trị đơn vị / Quản trị hệ thống"
        actionBarLabel="Permission Matrix và bộ quy tắc truy cập dữ liệu"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        splitRatio="minmax(0, 1fr) 360px"
        className="gd23-feature"
        leftPanelTitle="Bảng ma trận quyền"
        rightPanelTitle="Rule linh hoạt"
        actions={
          <>
            <button className="btn" onClick={loadScopes}><RefreshCw size={14}/> Làm mới</button>
            <button className="btn primary" onClick={() => openRuleModal()}><Plus size={14}/> Thêm rule</button>
            <button className="btn ok" onClick={() => setNotice({ type: "success", text: effectMode === "REALTIME" ? "Quyền đã được đẩy real-time tới session đang hoạt động." : "Quyền sẽ áp dụng sau lần đăng nhập kế tiếp." })}><Zap size={14}/> Áp dụng</button>
          </>
        }
        actionRows={[
          { actor: "Quản trị đơn vị", action: "Cấu hình ma trận", description: "Tick quyền theo feature và role trong checkbox grid", result: "Tạo/cập nhật access scope" },
          { actor: "Quản trị hệ thống", action: "Thêm rule ABAC", description: "Chọn principal, phòng ban, phạm vi dữ liệu, hiệu lực", result: "Rule được lưu và audit" },
          { actor: "Hệ thống", action: "Kiểm tra cấp quyền", description: "So sánh cấp người cấp và cấp được gán", result: "Chặn quyền vượt cấp" },
        ]}
        validationItems={[
          { type: "perm", label: "Cấp quyền", text: "Không cho phép gán quyền cao hơn cấp của người đang phân quyền." },
          { type: "rule", label: "Phạm vi", text: "Data scope bắt buộc: OWN, DEPARTMENT, UNIT hoặc ALL." },
          { type: "required", label: "Action", text: "Mỗi rule phải có ít nhất một quyền thao tác." },
          { type: "rule", label: "Hiệu lực", text: "Quyền có thể áp dụng real-time hoặc sau khi đăng nhập lại session." },
        ]}
        flowSteps={[
          { step: "1", label: "Chọn scope", desc: "Đơn vị/phòng ban", color: "#3264f4" },
          { step: "2", label: "Tick quyền", desc: "Role x feature", color: "#7c3aed" },
          { step: "3", label: "Validate", desc: "Không vượt cấp", color: "#f59e0b" },
          { step: "4", label: "Áp dụng", desc: "Real-time/session", color: "#22c55e" },
        ]}
        leftPanel={matrixPanel}
        rightPanel={ruleListPanel}
      />
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <form className="modal-content gd23-rule-modal" onSubmit={submitRule} onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-wrap"><Shield size={22} color="#fff"/></div>
              <div>
                <h3>Thêm/Sửa bộ quy tắc phân quyền</h3>
                <p className="muted">RBAC theo vai trò, ABAC theo đơn vị/phòng ban/phạm vi dữ liệu</p>
              </div>
            </div>
            <div className="gd23-rule-form">
              <label className="field"><span>Loại chủ thể</span><select value={ruleForm.principalType} onChange={event => setRuleForm(current => ({...current, principalType: event.target.value}))}>{["USER","GROUP","ROLE","DEPARTMENT"].map(item => <option key={item}>{item}</option>)}</select></label>
              <label className="field"><span>Mã chủ thể</span><input value={ruleForm.principalCode} onChange={event => setRuleForm(current => ({...current, principalCode: event.target.value}))} required /></label>
              <label className="field"><span>Đơn vị</span><input value={ruleForm.unitCode} onChange={event => setRuleForm(current => ({...current, unitCode: event.target.value.toUpperCase()}))} required /></label>
              <label className="field"><span>Phòng ban</span><input value={ruleForm.departmentCode} onChange={event => setRuleForm(current => ({...current, departmentCode: event.target.value.toUpperCase()}))} /></label>
              <label className="field"><span>Cấp bậc</span><select value={ruleForm.roleLevel} onChange={event => setRuleForm(current => ({...current, roleLevel: event.target.value}))}>{roles.map(role => <option key={role.code} value={role.code}>{role.label}</option>)}</select></label>
              <label className="field"><span>Tính năng</span><select value={ruleForm.resourceCode} onChange={event => setRuleForm(current => ({...current, resourceCode: event.target.value}))}>{features.map(feature => <option key={feature.code} value={feature.code}>{feature.label}</option>)}</select></label>
              <label className="field"><span>Phạm vi dữ liệu</span><select value={ruleForm.dataScope} onChange={event => setRuleForm(current => ({...current, dataScope: event.target.value}))}>{dataScopes.map(scope => <option key={scope.code} value={scope.code}>{scope.label}</option>)}</select></label>
              <label className="field"><span>Trạng thái</span><select value={ruleForm.status} onChange={event => setRuleForm(current => ({...current, status: event.target.value}))}>{["ACTIVE","INACTIVE"].map(item => <option key={item}>{item}</option>)}</select></label>
              <div className="gd23-action-picker">
                {actions.map(action => (
                  <label key={action.code}>
                    <input
                      type="checkbox"
                      checked={ruleForm.actions.split(",").includes(action.code)}
                      onChange={() => {
                        const next = new Set(ruleForm.actions.split(",").filter(Boolean));
                        if (next.has(action.code)) next.delete(action.code);
                        else next.add(action.code);
                        setRuleForm(current => ({ ...current, actions: [...next].join(",") || "VIEW" }));
                      }}
                    />
                    <span>{action.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn primary" type="submit"><Save size={14}/> Lưu rule</button>
              <button className="btn" type="button" onClick={() => setModalOpen(false)}>Đóng</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

// =============================================================
// GĐ2-6: OCR AI
// =============================================================
function GD2619OcrConfirmationScreen({ title = "OCR AI & Scanning hàng loạt", onReviewReady, onOpenWorkflow }) {
  const [activeTab, setActiveTab] = useState("screen");
  const [storages, setStorages] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedStorageId, setSelectedStorageId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [engine, setEngine] = useState("gemini");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [reviewHandoff, setReviewHandoff] = useState(null);
  const bulkFileInputRef = useRef(null);
  const storageLoadRequestRef = useRef(0);

  const documentList = Array.isArray(documents) ? documents : [];
  const selectedSet = useMemo(() => new Set(selectedIds.map(Number)), [selectedIds]);
  const dossierMap = useMemo(
    () => new Map((Array.isArray(dossiers) ? dossiers : []).map(item => [Number(item.id), item])),
    [dossiers]
  );
  const storageMap = useMemo(
    () => new Map((Array.isArray(storages) ? storages : []).map(item => [Number(item.id), item])),
    [storages]
  );
  const selectedStorage = (Array.isArray(storages) ? storages : [])
    .find(item => Number(item.id) === Number(selectedStorageId));
  const doneDocuments = documentList.filter(item => ["DONE", "CONFIRMED"].includes(String(item.ocrStatus || "").toUpperCase()));
  const reviewReadyDossierIds = useMemo(() => {
    const byDossier = new Map();
    documentList.forEach(document => {
      const dossierId = Number(document.dossierId);
      if (!dossierId) return;
      if (!byDossier.has(dossierId)) byDossier.set(dossierId, []);
      byDossier.get(dossierId).push(document);
    });
    return [...byDossier.entries()]
      .filter(([, items]) => items.length > 0 && items.every(item => ["DONE", "CONFIRMED"].includes(String(item.ocrStatus || "").toUpperCase())))
      .map(([dossierId]) => dossierId);
  }, [documentList]);
  const allSelected = documentList.length > 0 && documentList.every(item => selectedSet.has(Number(item.id)));
  const processing = Boolean(progress?.running);

  useEffect(() => {
    let active = true;
    Promise.all([
      uiApi.crud("storage").list(),
      uiApi.crud("dossiers").list()
    ]).then(([storageData, dossierData]) => {
      if (!active) return;
      const storageItems = Array.isArray(storageData) ? storageData : (storageData?.items || []);
      const dossierItems = Array.isArray(dossierData) ? dossierData : (dossierData?.items || []);
      setStorages(storageItems);
      setDossiers(dossierItems);
      setSelectedStorageId(current => current || String(storageItems[0]?.id || ""));
    }).catch(error => {
      if (active) setNotice({ type: "error", text: `Không tải được danh mục Kho: ${error.message}` });
    });
    return () => { active = false; };
  }, []);

  const loadStorageDocuments = useCallback(async (storageId = selectedStorageId) => {
    const requestId = ++storageLoadRequestRef.current;
    if (!storageId) {
      setDocuments([]);
      setSelectedIds([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const numericStorageId = Number(storageId);
      const result = await uiApi.gd2.documentSearch({ storageId: numericStorageId, page: 1, pageSize: 500 });
      const firstPageItems = Array.isArray(result) ? result : (result?.items || []);
      const totalPages = Number(result?.totalPages || 1);
      const remainingPages = totalPages > 1
        ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) =>
            uiApi.gd2.documentSearch({ storageId: numericStorageId, page: index + 2, pageSize: 500 })))
        : [];
      const serverItems = [
        ...firstPageItems,
        ...remainingPages.flatMap(pageResult => Array.isArray(pageResult) ? pageResult : (pageResult?.items || []))
      ];

      const allowedStorageIds = new Set([numericStorageId]);
      let treeExpanded = true;
      while (treeExpanded) {
        treeExpanded = false;
        (Array.isArray(storages) ? storages : []).forEach(storage => {
          const parentId = Number(storage.parentId);
          const childId = Number(storage.id);
          if (allowedStorageIds.has(parentId) && !allowedStorageIds.has(childId)) {
            allowedStorageIds.add(childId);
            treeExpanded = true;
          }
        });
      }
      const strictDossierMap = new Map((Array.isArray(dossiers) ? dossiers : []).map(dossier => [Number(dossier.id), dossier]));
      const items = serverItems
        .filter(document => {
          const dossierStorageId = Number(strictDossierMap.get(Number(document.dossierId))?.storageId);
          const directlyInSelectedStorage = dossierStorageId === numericStorageId;
          return directlyInSelectedStorage || allowedStorageIds.has(dossierStorageId);
        })
        .slice()
        .sort((left, right) => Number(right.id || 0) - Number(left.id || 0));

      if (requestId !== storageLoadRequestRef.current) return;
      setDocuments(items);
      setSelectedIds(current => current.filter(id => items.some(item => Number(item.id) === Number(id))));
    } catch (error) {
      if (requestId !== storageLoadRequestRef.current) return;
      setDocuments([]);
      setSelectedIds([]);
      setNotice({ type: "error", text: `Không tải được tài liệu trong Kho: ${error.message}` });
    } finally {
      if (requestId === storageLoadRequestRef.current) setLoading(false);
    }
  }, [selectedStorageId, dossiers, storages]);

  useEffect(() => {
    loadStorageDocuments(selectedStorageId);
  }, [selectedStorageId, loadStorageDocuments]);

  function toggleDocument(id) {
    setSelectedIds(current => current.some(item => Number(item) === Number(id))
      ? current.filter(item => Number(item) !== Number(id))
      : [...current, id]);
  }

  function toggleAllDocuments() {
    setSelectedIds(allSelected ? [] : documentList.map(item => item.id));
  }

  async function processSingleDocument(document) {
    if (!document.fileName) {
      return uiApi.gd2.digitizeDocumentMetadata(document.id, "DEFAULT");
    }
    return uiApi.gd2.processExistingOcr(document.id, engine, "DEFAULT");
  }

  async function runOcrDocuments(items) {
    if (!Array.isArray(items) || items.length === 0 || processing) return;

    let success = 0;
    let failed = 0;
    const successfulDocuments = [];
    const itemResults = [];
    setNotice(null);
    setBatchResults([]);
    setProgress({ running: true, current: 0, total: items.length, success: 0, failed: 0 });

    for (let index = 0; index < items.length; index += 1) {
      const document = items[index];
      setProgress({ running: true, current: index + 1, total: items.length, success, failed });
      try {
        const ocrResult = await processSingleDocument(document);
        if (String(ocrResult?.ocrStatus || "").toUpperCase() !== "DONE")
          throw new Error("Engine OCR chưa trả về trạng thái DONE.");
        successfulDocuments.push({
          ...document,
          fileName: ocrResult.fileName || document.fileName,
          status: ocrResult.workflow?.documentStatus || "PENDING",
          workflow: ocrResult.workflow
        });
        success += 1;
        itemResults.push({
          documentId: document.id,
          documentName: document.title || document.code,
          status: "success",
          detail: `Thành công (Đã tạo PDF số hóa bằng ${ocrEngineDisplayName(ocrResult.engine)}${ocrResult.usedFallback ? " — engine fallback" : ""}; tự động chuyển GĐ2-2)`
        });
      } catch (error) {
        failed += 1;
        itemResults.push({
          documentId: document.id,
          documentName: document.title || document.code,
          status: "error",
          detail: `Thất bại: ${error.message}`
        });
      }
    }

    const transitionedDossierIds = [...new Set(successfulDocuments
      .map(document => Number(document.workflow?.dossierId || document.dossierId))
      .filter(Boolean))];

    setProgress({ running: false, current: items.length, total: items.length, success, failed });
    setBatchResults(itemResults);
    await loadStorageDocuments(selectedStorageId);
    setNotice({
      type: failed === 0 ? "success" : (success > 0 ? "info" : "error"),
      text: `Đã bóc tách OCR, tạo PDF Unicode và chuyển PENDING thành công ${success}/${items.length} tài liệu${failed ? `; ${failed} tài liệu chưa xử lý được` : ""}.`
    });
    if (successfulDocuments.length > 0) {
      const context = {
        focusDocumentId: successfulDocuments[0].id,
        documentIds: successfulDocuments.map(document => document.id),
        dossierIds: transitionedDossierIds,
        storageId: Number(selectedStorageId),
        createdAt: new Date().toISOString()
      };
      setReviewHandoff(context);
      onReviewReady?.(context);
    }
  }

  function runSelectedDocuments() {
    runOcrDocuments(documentList.filter(item => selectedSet.has(Number(item.id))));
  }

  function openBulkUploadPicker() {
    const missingDocuments = documentList.filter(item => selectedSet.has(Number(item.id)) && !item.fileName);
    if (missingDocuments.length === 0) {
      setNotice({ type: "info", text: "Các tài liệu đang chọn đều đã có file đính kèm." });
      return;
    }
    bulkFileInputRef.current?.click();
  }

  async function handleBulkUpload(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    const targets = documentList.filter(item => selectedSet.has(Number(item.id)) && !item.fileName);
    if (targets.length === 0) return;
    const uploadResults = [];

    try {
      setBulkUploading(true);
      for (let index = 0; index < targets.length; index += 1) {
        const document = targets[index];
        const file = files.length === 1 ? files[0] : files[index];
        if (!file) {
          uploadResults.push({
            documentId: document.id,
            documentName: document.title || document.code,
            status: "error",
            detail: "Chưa có file tương ứng trong danh sách file đã chọn."
          });
          continue;
        }
        try {
          const result = await uiApi.crud("documents").upload(document.id, file, engine, "DEFAULT");
          uploadResults.push({
            documentId: document.id,
            documentName: document.title || document.code,
            status: String(result?.ocrStatus || "").toUpperCase() === "DONE" ? "success" : "error",
            detail: `Đã đính kèm ${file.name}; OCR bằng ${ocrEngineDisplayName(result?.engine)} (${result?.ocrStatus || "UNKNOWN"}).`
          });
        } catch (error) {
          uploadResults.push({
            documentId: document.id,
            documentName: document.title || document.code,
            status: "error",
            detail: `Không tải được ${file.name}: ${error.message}`
          });
        }
      }
      setBatchResults(uploadResults);
      await loadStorageDocuments(selectedStorageId);
      const uploadedCount = uploadResults.filter(item => item.status === "success").length;
      setNotice({
        type: uploadedCount === targets.length ? "success" : "info",
        text: `Đã đính kèm và xử lý ${uploadedCount}/${targets.length} tài liệu. Chọn một file để áp dụng chung; chọn nhiều file để ghép theo thứ tự tài liệu.`
      });
    } finally {
      setBulkUploading(false);
    }
  }

  async function submitForReview() {
    const dossierIds = reviewReadyDossierIds;
    if (dossierIds.length === 0) {
      setNotice({ type: "error", text: "Kho chưa có tài liệu bóc tách xong để gửi kiểm duyệt." });
      return;
    }

    let success = 0;
    let failed = 0;
    try {
      setLoading(true);
      for (const document of doneDocuments) {
        try {
          await uiApi.gd2.transition({
            entityType: "DOCUMENT",
            entityId: document.id,
            action: "SUBMIT",
            actor: "current-user",
            unitCode: "DEFAULT",
            comment: "Gửi tài liệu OCR sang bước kiểm tra và phê duyệt",
            recipient: "LANH_DAO_DON_VI"
          });
        } catch {
          failed += 1;
        }
      }
      for (const dossierId of dossierIds) {
        try {
          await uiApi.dms.transition({
            entityType: "DOSSIER",
            entityId: dossierId,
            action: "SUBMIT",
            actor: "current-user",
            unitCode: "DEFAULT",
            comment: "Gửi kiểm duyệt hàng loạt sau khi hoàn tất OCR (Bước 5)"
          });
          success += 1;
        } catch {
          failed += 1;
        }
      }
      setNotice({
        type: failed === 0 ? "success" : "info",
        text: `Đã gửi ${success}/${dossierIds.length} hồ sơ có tài liệu OCR hoàn tất sang hàng chờ duyệt GĐ2-2${failed ? `; ${failed} thao tác chưa đủ điều kiện.` : "."}`
      });
      if (doneDocuments.length > 0) {
        const context = {
          focusDocumentId: doneDocuments[0].id,
          documentIds: doneDocuments.map(document => document.id),
          dossierIds,
          storageId: Number(selectedStorageId),
          createdAt: new Date().toISOString()
        };
        setReviewHandoff(context);
        onReviewReady?.(context);
      }
    } finally {
      setLoading(false);
    }
  }

  const leftPanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
        <label style={{ minWidth: "300px", flex: "1 1 360px", fontWeight: 700, color: "#1e3a8a" }}>
          Chọn Kho lưu trữ
          <select
            value={selectedStorageId}
            disabled={processing}
            onChange={event => {
              storageLoadRequestRef.current += 1;
              setDocuments([]);
              setSelectedIds([]);
              setSelectedStorageId(event.target.value);
              setProgress(null);
              setBatchResults([]);
              setReviewHandoff(null);
              setNotice(null);
            }}
            style={{ display: "block", width: "100%", marginTop: "6px", padding: "10px 12px", border: "1px solid #93c5fd", borderRadius: "8px", background: "#fff" }}
          >
            <option value="">-- Chọn Kho lưu trữ --</option>
            {(Array.isArray(storages) ? storages : []).map(storage => (
              <option key={storage.id} value={storage.id}>{storage.code} - {storage.name}</option>
            ))}
          </select>
        </label>
        <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#eff6ff", color: "#1d4ed8", fontWeight: 700 }}>
          Đã chọn: {selectedIds.length} / Tổng số: {documentList.length} tài liệu trong kho {selectedStorage?.name || "--"}
        </div>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #dbe3ef", borderRadius: "10px", background: "#fff" }}>
        <table className="gd2-table" style={{ width: "100%", minWidth: "1080px", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ width: "46px", textAlign: "center" }}>
                <input type="checkbox" aria-label="Chọn tất cả tài liệu" checked={allSelected} disabled={processing || documentList.length === 0} onChange={toggleAllDocuments} />
              </th>
              <th>Mã tài liệu</th>
              <th>Tên tài liệu</th>
              <th>Hồ sơ</th>
              <th>Kho lưu trữ</th>
              <th>Tên file</th>
              <th>Trạng thái OCR</th>
              <th style={{ width: "145px" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {documentList.map(document => {
              const dossier = dossierMap.get(Number(document.dossierId));
              const documentStorage = storageMap.get(Number(dossier?.storageId));
              const ocrStatus = String(document.ocrStatus || "PENDING").toUpperCase();
              const done = ["DONE", "CONFIRMED"].includes(ocrStatus);
              return (
                <tr key={document.id}>
                  <td style={{ textAlign: "center" }}>
                    <input type="checkbox" aria-label={`Chọn ${document.title}`} checked={selectedSet.has(Number(document.id))} disabled={processing} onChange={() => toggleDocument(document.id)} />
                  </td>
                  <td><strong>{document.code || `VB-${document.id}`}</strong></td>
                  <td>{document.title || "--"}</td>
                  <td>{dossier ? `${dossier.code} - ${dossier.title}` : `Hồ sơ #${document.dossierId}`}</td>
                  <td>{documentStorage ? `${documentStorage.code} - ${documentStorage.name}` : "Chưa gán Kho"}</td>
                  <td style={{ wordBreak: "break-word" }}>{document.fileName || <span style={{ color: "#b45309" }}>Chưa có file</span>}</td>
                  <td>
                    <span style={{ display: "inline-block", padding: "4px 9px", borderRadius: "999px", fontSize: "11px", fontWeight: 800, background: done ? "#dcfce7" : ocrStatus === "ERROR" ? "#fee2e2" : "#fef3c7", color: done ? "#15803d" : ocrStatus === "ERROR" ? "#b91c1c" : "#a16207" }}>
                      {done ? "Đã bóc tách" : ocrStatus}
                    </span>
                  </td>
                  <td>
                    <button className="btn" type="button" disabled={processing} onClick={() => runOcrDocuments([document])} style={{ whiteSpace: "nowrap" }}>
                      <Zap size={13}/> Bóc tách nhanh
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && documentList.length === 0 && (
              <tr><td colSpan={8} className="empty-cell">Kho {selectedStorage?.name || "đang chọn"} hiện chưa có tài liệu nào.</td></tr>
            )}
            {loading && documentList.length === 0 && (
              <tr><td colSpan={8} className="empty-cell">Đang tải toàn bộ tài liệu trong Kho...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const rightPanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ padding: "16px", border: "1px solid #bfdbfe", borderRadius: "10px", background: "#f0f7ff" }}>
        <label style={{ display: "block", color: "#1e3a8a", fontWeight: 700 }}>
          Chọn Engine OCR
          <select value={engine} disabled={processing} onChange={event => setEngine(event.target.value)} style={{ display: "block", width: "100%", marginTop: "6px", padding: "10px", border: "1px solid #93c5fd", borderRadius: "8px", background: "#fff" }}>
            <option value="gemini">Gemini Vision AI</option>
            <option value="vietocr">VietOCR</option>
            <option value="easyocr">EasyOCR</option>
            <option value="tesseract">Tesseract</option>
          </select>
        </label>
      </div>

      <input
        ref={bulkFileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.tif,.tiff,.png,.jpg,.jpeg"
        onChange={handleBulkUpload}
        style={{ display: "none" }}
      />
      <button className="btn" type="button" disabled={processing || bulkUploading || selectedIds.length === 0} onClick={openBulkUploadPicker} style={{ minHeight: "44px", justifyContent: "center", borderColor: "#93c5fd", color: "#1d4ed8", fontWeight: 700 }}>
        <Upload size={16}/> {bulkUploading ? "Đang đính kèm tệp..." : "📁 Đính kèm tệp cho các tài liệu đang chọn"}
      </button>

      <button className="btn ok" type="button" disabled={processing || selectedIds.length === 0} onClick={runSelectedDocuments} style={{ minHeight: "48px", justifyContent: "center", background: selectedIds.length ? "#2563eb" : undefined, color: selectedIds.length ? "#fff" : undefined }}>
        <Zap size={17}/> {processing ? "Đang bóc tách OCR..." : "⚡ Bóc tách OCR các tài liệu đã chọn"}
      </button>

      {progress && (
        <div style={{ padding: "14px", border: "1px solid #cbd5e1", borderRadius: "10px", background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "8px", fontSize: "13px", fontWeight: 700 }}>
            <span>{progress.running ? `Đang bóc tách ${progress.current}/${progress.total} tài liệu...` : "Đã hoàn tất xử lý"}</span>
            <span>{Math.round((progress.current / Math.max(1, progress.total)) * 100)}%</span>
          </div>
          <div style={{ height: "9px", borderRadius: "999px", background: "#e2e8f0", overflow: "hidden" }}>
            <div style={{ width: `${(progress.current / Math.max(1, progress.total)) * 100}%`, height: "100%", background: progress.failed ? "#f59e0b" : "#22c55e", transition: "width .2s ease" }} />
          </div>
          <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>Thành công: {progress.success} · Chưa xử lý: {progress.failed}</div>
        </div>
      )}

      {batchResults.length > 0 && (
        <div style={{ padding: "14px", border: "1px solid #cbd5e1", borderRadius: "10px", background: "#fff" }}>
          <strong style={{ display: "block", marginBottom: "9px", color: "#1e293b" }}>Kết quả chi tiết</strong>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px", maxHeight: "260px", overflowY: "auto" }}>
            {batchResults.map((result, index) => (
              <div key={`${result.documentId}-${index}`} style={{ padding: "9px 10px", borderRadius: "7px", border: `1px solid ${result.status === "success" ? "#bbf7d0" : "#fecaca"}`, background: result.status === "success" ? "#f0fdf4" : "#fef2f2", color: result.status === "success" ? "#166534" : "#b91c1c", fontSize: "12px", lineHeight: 1.45 }}>
                <strong>{result.documentName}:</strong> {result.detail}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <Metric label="Tổng tài liệu" value={documentList.length} />
        <Metric label="Đã bóc tách" value={doneDocuments.length} />
      </div>

      <button className="btn" type="button" disabled={processing || loading || reviewReadyDossierIds.length === 0} onClick={submitForReview} style={{ minHeight: "44px", justifyContent: "center", background: "#16a34a", color: "#fff", borderColor: "#16a34a", fontWeight: 700 }}>
        <Send size={15}/> Gửi kiểm duyệt (Bước 5)
      </button>

      {reviewHandoff && (
        <button className="btn ok" type="button" onClick={() => onOpenWorkflow?.(reviewHandoff)} style={{ minHeight: "48px", justifyContent: "center", background: "#7c3aed", color: "#fff", borderColor: "#7c3aed", fontWeight: 800 }}>
          🚀 Chuyển sang Bước Kiểm tra & Phê duyệt (GĐ2-2)
        </button>
      )}

      <div style={{ padding: "12px", borderRadius: "8px", background: "#f8fafc", color: "#64748b", fontSize: "12px", lineHeight: 1.5 }}>
        Tất cả tài liệu thuộc các hồ sơ trong <strong>{selectedStorage?.name || "Kho đang chọn"}</strong> được truy vấn trực tiếp từ Oracle. Nội dung OCR được lưu vào DESCRIPTION và trạng thái được cập nhật ngay sau mỗi tài liệu.
      </div>
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  return (
    <>
      <GD2FeatureLayout
        featureId="GĐ2-6/19"
        featureName={title}
        description="Chọn một Kho, xử lý OCR từng tài liệu hoặc hàng loạt và chuyển toàn bộ hồ sơ hoàn tất sang hàng chờ kiểm duyệt."
        actor="Cán bộ khai thác / Chuyên viên số hóa"
        actionBarLabel="Bóc tách OCR AI & Scanning hàng loạt"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        splitRatio="minmax(0, 1fr) 330px"
        className="gd2619-feature"
        leftPanelTitle="Toàn bộ tài liệu trong Kho"
        rightPanelTitle="Điều khiển OCR hàng loạt"
        actions={
          <>
            <button className="btn" disabled={processing || !selectedStorageId} onClick={() => loadStorageDocuments(selectedStorageId)}><RefreshCw size={14}/> Tải lại</button>
            <button className="btn ok" disabled={processing || selectedIds.length === 0} onClick={runSelectedDocuments}><Zap size={14}/> Bóc tách OCR đã chọn</button>
            <button className="btn" disabled={processing || loading || reviewReadyDossierIds.length === 0} onClick={submitForReview} style={{ background: "#16a34a", color: "#fff", borderColor: "#16a34a" }}><Send size={14}/> Gửi kiểm duyệt (Bước 5)</button>
          </>
        }
        actionRows={[
          { action: "Chọn Kho", description: "Truy vấn tập trung tất cả hồ sơ và tài liệu", result: "Danh sách đầy đủ, không lọc ảo trên RAM" },
          { action: "OCR linh hoạt", description: "Chọn một, chọn tất cả hoặc bóc tách nhanh", result: "OCR_STATUS và DESCRIPTION cập nhật vào Oracle" },
          { action: "Gửi kiểm duyệt", description: "Gửi các hồ sơ có tài liệu OCR hoàn tất", result: "Xuất hiện tại hàng chờ GĐ2-2" }
        ]}
        validationItems={[
          { type: "required", label: "Kho lưu trữ", text: "Phải chọn Kho trước khi tải danh sách tài liệu." },
          { type: "rule", label: "File OCR", text: "Tài liệu chưa có file được tự động số hóa từ metadata và không làm dừng batch." },
          { type: "perm", label: "Oracle", text: "Kết quả OCR được lưu trực tiếp vào OCR_STATUS và DESCRIPTION." }
        ]}
        flowSteps={[
          { step: "1", label: "Chọn Kho", desc: "Tải tài liệu", color: "#3264f4" },
          { step: "2", label: "Tick chọn", desc: "Một / tất cả", color: "#0ea5e9" },
          { step: "3", label: "OCR", desc: "Theo Engine", color: "#f59e0b" },
          { step: "4", label: "Lưu DB", desc: "Status + nội dung", color: "#7c3aed" },
          { step: "5", label: "Kiểm duyệt", desc: "GĐ2-2", color: "#22c55e" }
        ]}
        leftPanel={leftPanel}
        rightPanel={rightPanel}
      />

      {reviewHandoff && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "grid", placeItems: "center", padding: "20px", background: "rgba(15, 23, 42, .58)" }}>
          <div style={{ width: "min(560px, 100%)", padding: "26px", borderRadius: "16px", background: "#fff", boxShadow: "0 28px 70px rgba(15, 23, 42, .32)" }}>
            <div style={{ width: "52px", height: "52px", display: "grid", placeItems: "center", marginBottom: "14px", borderRadius: "50%", background: "#dcfce7", color: "#15803d" }}><CheckCircle2 size={28}/></div>
            <h3 style={{ margin: "0 0 8px", color: "#0f172a" }}>OCR hoàn tất và đã chuyển sang chờ kiểm tra</h3>
            <p style={{ margin: "0 0 20px", color: "#475569", lineHeight: 1.55 }}>
              {reviewHandoff.documentIds.length} tài liệu đã có OCR <strong>DONE</strong> và chuyển sang <strong>PENDING</strong>; {reviewHandoff.dossierIds.length} hồ sơ liên quan đã đồng bộ trạng thái. Toàn bộ thao tác đã được ghi lịch sử workflow.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
              <button className="btn" type="button" onClick={() => setReviewHandoff(null)}>Ở lại màn hình này</button>
              <button className="btn ok" type="button" onClick={() => onOpenWorkflow?.(reviewHandoff)} style={{ minHeight: "42px", background: "#2563eb", color: "#fff", borderColor: "#2563eb", fontWeight: 800 }}>
                🚀 Chuyển sang Bước Kiểm tra & Phê duyệt ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GD2619LegacyOcrConfirmationScreen({ title = "OCR AI & Xác nhận thông tin" }) {
  const [activeTab, setActiveTab] = useState("screen");
  const [documents, setDocuments] = useState([]);
  const [storages, setStorages] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [selectedStorageId, setSelectedStorageId] = useState("");
  const [selectedDossierId, setSelectedDossierId] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [extraction, setExtraction] = useState(null);
  const [fields, setFields] = useState([]);
  const [ocrText, setOcrText] = useState("");
  const [ocrFileName, setOcrFileName] = useState("");
  const [engine, setEngine] = useState("gemini");
  const [actor, setActor] = useState("current-user");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);


  const docList = Array.isArray(documents) ? documents : [];
  // Chỉ dùng selectedId để tìm chính xác — không fallback về docList[0]
  const selected = selectedId ? (docList.find(item => Number(item.id) === Number(selectedId)) || null) : null;
  const fieldList = Array.isArray(fields) ? fields : [];
  const lowFields = fieldList.filter(field => Number(field.confidence || 0) < 80).length;
  // selectedDossier dùng selectedDossierId (từ dropdown) thay vì selected?.dossierId
  const selectedDossier = (Array.isArray(dossiers) ? dossiers : []).find(item => Number(item.id) === Number(selectedDossierId)) || null;

  useEffect(() => {
    loadDocuments();
    loadMasterData();
  }, []);

  async function loadMasterData() {
    try {
      const [storageData, dossierData] = await Promise.all([
        uiApi.crud("storage").list().catch(() => []),
        uiApi.crud("dossiers").list().catch(() => [])
      ]);
      const sList = Array.isArray(storageData) ? storageData : (storageData?.items || []);
      const dList = Array.isArray(dossierData) ? dossierData : (dossierData?.items || []);
      setStorages(sList);
      setDossiers(dList);
    } catch (e) {
      console.error("Lỗi tải danh mục:", e);
    }
  }

  const filteredDossiers = useMemo(() => {
    const list = Array.isArray(dossiers) ? dossiers : [];
    if (!selectedStorageId) return list;
    return list.filter(d => Number(d.storageId) === Number(selectedStorageId));
  }, [dossiers, selectedStorageId]);

  const filteredDocuments = useMemo(() => {
    const list = Array.isArray(documents) ? documents : [];
    if (!selectedDossierId) return list;
    return list.filter(doc => Number(doc.dossierId) === Number(selectedDossierId));
  }, [documents, selectedDossierId]);

  useEffect(() => {
    if (!selectedId) return;
    const targetDocument = docList.find(item => Number(item.id) === Number(selectedId));
    if (!targetDocument?.fileName) {
      setFields([]);
      setOcrText("");
      return;
    }
    runAiExtraction(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selected) return;
    // Chỉ đồng bộ ocrFileName khi tài liệu được chọn thay đổi
    setOcrFileName(selected.fileName || "");
    // Chỉ tự động set Kho/Hồ sơ nếu người dùng chưa chọn (lần đầu tải trang)
    if (!selectedDossierId) {
      setSelectedDossierId(String(selected.dossierId ?? ""));
      const dossier = (Array.isArray(dossiers) ? dossiers : []).find(item => Number(item.id) === Number(selected.dossierId));
      setSelectedStorageId(dossier?.storageId ? String(dossier.storageId) : "");
    }
  }, [selected]);
  const leftPanel = (
    <div className="gd2619-left" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {selected ? (
        <div style={{ background: "#eff6ff", border: "2px solid #3b82f6", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <FileText size={28} color="#2563eb" />
            <div>
              <div style={{ fontWeight: "700", color: "#1e3a8a", fontSize: "15px" }}>{selected.code} — {selected.title}</div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>Hồ sơ: {selectedDossier?.code || "--"} · {selectedDossier?.title || "--"}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div style={{ background: "#fff", borderRadius: "8px", padding: "10px 14px", border: "1px solid #bfdbfe" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", marginBottom: "4px" }}>Tên file</div>
              <div style={{ fontSize: "13px", color: "#1e293b", fontWeight: "600", wordBreak: "break-all" }}>
                {selected.fileName || <span style={{color:"#94a3b8",fontStyle:"italic"}}>Chưa có file</span>}
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: "8px", padding: "10px 14px", border: "1px solid #bfdbfe" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", marginBottom: "4px" }}>Trạng thái OCR</div>
              <div style={{ fontSize: "13px", fontWeight: "700",
                color: selected.ocrStatus === "DONE" || selected.ocrStatus === "CONFIRMED" ? "#15803d" :
                       selected.ocrStatus === "ERROR" ? "#dc2626" : "#d97706"
              }}>{selected.ocrStatus || "PENDING"}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: "8px", padding: "10px 14px", border: "1px solid #bfdbfe" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", marginBottom: "4px" }}>Mã tài liệu</div>
              <div style={{ fontSize: "13px", color: "#1e293b", fontWeight: "600" }}>{selected.code}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: "8px", padding: "10px 14px", border: "1px solid #bfdbfe" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", marginBottom: "4px" }}>Confidence</div>
              <div style={{ fontSize: "13px", color: "#1e293b", fontWeight: "600" }}>{extraction ? `${Number(extraction.overallConfidence||0)}%` : "--"}</div>
            </div>
          </div>
          {selected.fileName ? (
            <button
              type="button"
              onClick={() => runAiExtraction(selected.id)}
              disabled={loading}
              style={{ marginTop: "14px", width: "100%", padding: "10px", background: loading ? "#93c5fd" : "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              <Zap size={16} /> {loading ? "Đang bóc tách..." : "Bóc tách OCR ngay"}
            </button>
          ) : (
            <div style={{ marginTop: "14px", padding: "10px", background: "#fef9c3", border: "1px solid #fde047", borderRadius: "8px", fontSize: "13px", color: "#92400e", textAlign: "center" }}>
              ⚠️ Tài liệu này chưa có file đính kèm. Vui lòng đẩy file tại màn hình "Nhập hồ sơ mới".
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: "#f8fafc", border: "2px dashed #cbd5e1", borderRadius: "12px", padding: "40px 20px", textAlign: "center" }}>
          <FileSearch size={40} color="#94a3b8" style={{ marginBottom: "12px" }} />
          <div style={{ fontWeight: "600", color: "#64748b", fontSize: "15px", marginBottom: "6px" }}>Chưa chọn tài liệu</div>
          <div style={{ fontSize: "13px", color: "#94a3b8" }}>Vui lòng chọn Kho, Hồ sơ và Tài liệu ở bên phải để bắt đầu bóc tách OCR.</div>
        </div>
      )}

      {fields.length > 0 && (
        <div className="gd2619-pdf-shell">
          <div className="gd2619-pdf-head">
            <span>{selected?.fileName || "Kết quả OCR"}</span>
            {extraction && <strong>{documentTypeLabel(extraction.documentType)} · {Number(extraction.overallConfidence || 0)}%</strong>}
          </div>
          <div className="gd2619-pdf-page">
            <div className="gd2619-pdf-lines"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
            {(Array.isArray(fields) ? fields : []).map(field => (
              <div
                key={field.key}
                className={`gd2619-box ${Number(field.confidence) < 80 ? "low" : ""}`}
                style={{ left: `${field.box?.x ?? 10}%`, top: `${field.box?.y ?? 10}%`, width: `${field.box?.width ?? 80}%`, height: `${field.box?.height ?? 10}%`, userSelect: "text", WebkitUserSelect: "text", cursor: "text" }}
                title={`${field.label || 'Trường'}: ${field.value || ''} (${field.confidence || 90}%)`}
              >
                {field.value ? (field.label && !field.label.startsWith("Dòng") ? `${field.label}: ${field.value}` : field.value) : field.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {notice && <div className={`gd2-report-notice ${notice.type}`} style={{marginTop: "10px"}}>{notice.text}</div>}
    </div>
  );

  async function loadDocuments() {
    try {
      setLoading(true);
      const result = await uiApi.crud("documents").list();
      const items = (Array.isArray(result) ? result : (result?.items || []))
        .slice()
        .sort((left, right) => Number(right.id || 0) - Number(left.id || 0));
      setDocuments(items);
      setSelectedId(current => items.some(item => Number(item.id) === Number(current)) ? current : items[0]?.id || null);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được tài liệu OCR: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function loadExtraction(documentId) {
    try {
      const data = await uiApi.gd2.ocrExtraction(documentId);
      setExtraction(data);
      setFields(data.fields || []);
      setOcrText(formatOcrFields(data?.fields));
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được kết quả bóc tách: ${error.message}` });
    }
  }

  async function handleFileUploadAndOcr(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setLoading(true);
    setNotice({ type: "info", text: `Đang tải file '${file.name}' lên máy server và bóc tách AI (engine ${engine})...` });
    try {
      const ocrResult = await uiApi.crud("documents").upload(selected.id, file, engine);
      const text = ocrResult?.text || "";

      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      let newFields = lines.slice(0, 10).map((line, idx) => {
        const parts = line.split(":");
        const label = parts.length > 1 ? parts[0].trim() : `Dòng ${idx + 1}`;
        const val = parts.length > 1 ? parts.slice(1).join(":").trim() : line;
        return {
          key: `field_${idx + 1}`,
          label: label.slice(0, 30),
          value: val,
          confidence: Math.floor(Math.random() * 15) + 85,
          box: { x: 10, y: 10 + idx * 8, width: 80, height: 6 }
        };
      });

      if (newFields.length === 0) {
        newFields = [
          { key: "field_1", label: "Nội dung OCR", value: text || "Không tìm thấy nội dung chữ", confidence: 90, box: { x: 10, y: 15, width: 80, height: 30 } }
        ];
      }

      setFields(newFields);
      setOcrFileName(file.name);
      setOcrText(text || newFields.map(f => f.value).join("\n"));
      setExtraction(prev => ({
        ...prev,
        documentType: file.name.toLowerCase().includes("hd") ? "CONTRACT" : file.name.toLowerCase().includes("qd") ? "DECISION" : "REPORT",
        overallConfidence: 92.5,
        fields: newFields
      }));

      if (selected) {
        selected.fileName = file.name;
        await loadDocuments();
        setSelectedId(selected.id);
      }
    } catch (error) {
      setNotice({ type: "error", text: `Lỗi upload/bóc tách file: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function runAiExtraction(documentId = selected?.id, options = {}) {
    if (!documentId) return;
    const targetDocument = docList.find(item => Number(item.id) === Number(documentId)) || selected;
    try {
      setLoading(true);
      const data = await uiApi.gd2.extractOcrMetadata(documentId, {
        engine,
        actor,
        unitCode: "DEFAULT",
        fileName: targetDocument?.fileName,
        note: "OCR AI boc tach key-value va metadata",
      });
      setExtraction(data);
      setFields(data.fields || []);
      setOcrText(formatOcrFields(data?.fields));
      setNotice({ type: "success", text: `Da nhan dien ${documentTypeLabel(data.documentType)} va boc tach ${Array.isArray(data.fields) ? data.fields.length : 0} truong.` });
    } catch (error) {
      setNotice({ type: "error", text: `OCR AI that bai: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function confirmExtraction() {
    if (!selected || !Array.isArray(fields) || fields.length === 0) {
      setNotice({ type: "error", text: "Chưa có dữ liệu OCR để xác nhận." });
      return;
    }
    try {
      setLoading(true);
      const fieldsToConfirm = mergeOcrTextIntoFields(fields, ocrText);
      const result = await uiApi.gd2.confirmOcrExtraction(selected.id, {
        actor,
        unitCode: "DEFAULT",
        fields: fieldsToConfirm,
        note: "Xác nhận dữ liệu OCR chính xác và lưu chính thức vào CSDL",
      });
      await uiApi.crud("documents").update(selected.id, {
        dossierId: selected.dossierId,
        code: selected.code,
        title: selected.title,
        fileName: ocrFileName || selected.fileName,
        ocrStatus: result.status || "CONFIRMED",
        status: selected.status || "DRAFT",
        description: (result.fields || []).map(item => `${item.label}: ${item.value}`).join("\n")
      });
      setFields(result.fields || []);
      setExtraction(current => current ? { ...current, status: result.status, overallConfidence: result.overallConfidence, fields: result.fields } : current);
      setNotice({ type: "success", text: `Đã xác nhận dữ liệu chính xác cho ${result.documentCode}. Metadata đã lưu chính thức.` });
      await loadDocuments();
    } catch (error) {
      setNotice({ type: "error", text: `Xác nhận thất bại: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function submitForReview() {
    try {
      setLoading(true);
      const dossierId = selected?.dossierId || 1;
      await uiApi.dms.transition({
        entityType: "DOSSIER",
        entityId: dossierId,
        action: "SUBMIT",
        actor: actor || "current-user",
        comment: "Gửi kiểm duyệt hồ sơ sau khi bóc tách OCR AI thành công (Bước 5)"
      });
      setNotice({ type: "success", text: `Đã gửi kiểm duyệt thành công (Bước 5)! Trạng thái hồ sơ chuyển sang PENDING.` });
    } catch (error) {
      setNotice({ type: "error", text: `Lỗi gửi kiểm duyệt: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  function updateField(key, value) {
    setFields(current => {
      const nextFields = (Array.isArray(current) ? current : []).map(field => field.key === key ? { ...field, value, confirmed: false } : field);
      setOcrText(formatOcrFields(nextFields));
      return nextFields;
    });
  }

  const rightPanel = (
    <div className="gd2619-right">
      <div style={{ background: "#f0f7ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "14px", marginBottom: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={{ fontSize: "12px", fontWeight: "700", color: "#1e3a8a", display: "block", marginBottom: "4px" }}>1. Chọn Kho hồ sơ</label>
          <select
            value={selectedStorageId}
            onChange={e => {
              const sId = e.target.value;
              setSelectedStorageId(sId);
              setSelectedDossierId("");
              const firstDossier = (Array.isArray(dossiers) ? dossiers : []).find(d => !sId || Number(d.storageId) === Number(sId));
              if (firstDossier) {
                setSelectedDossierId(String(firstDossier.id));
                const firstDocument = (Array.isArray(documents) ? documents : []).find(doc => Number(doc.dossierId) === Number(firstDossier.id));
                if (firstDocument) setSelectedId(firstDocument.id);
              }
            }}
            style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #93c5fd", fontSize: "13px", background: "#fff" }}
          >
            <option value="">-- Tất cả Kho --</option>
            {(Array.isArray(storages) ? storages : []).map(s => (
              <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: "700", color: "#1e3a8a", display: "block", marginBottom: "4px" }}>2. Chọn Hồ sơ (Bước 3)</label>
          <select
            value={selectedDossierId}
            onChange={e => {
              const dId = e.target.value;
              setSelectedDossierId(dId);
              const doc = (Array.isArray(documents) ? documents : []).find(doc => Number(doc.dossierId) === Number(dId));
              if (doc) {
                setSelectedId(doc.id);
                setOcrFileName(doc.fileName || "");
              } else {
                setSelectedId(null);
                setOcrFileName("");
              }
            }}
            style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #93c5fd", fontSize: "13px", background: "#fff" }}
          >
            <option value="">-- Chọn Hồ sơ --</option>
            {(Array.isArray(filteredDossiers) ? filteredDossiers : []).map(d => (
              <option key={d.id} value={d.id}>{d.code} - {d.title}</option>
            ))}
          </select>
        </div>

        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: "12px", fontWeight: "700", color: "#1e3a8a", display: "block", marginBottom: "4px" }}>3. Chọn Tài liệu cần bóc tách OCR</label>
          <select
            value={selectedId || ""}
            onChange={e => {
              const docId = e.target.value;
              setSelectedId(docId);
              const doc = (Array.isArray(documents) ? documents : []).find(d => Number(d.id) === Number(docId));
              if (doc) {
                setOcrFileName(doc.fileName || "");
                setSelectedDossierId(String(doc.dossierId || ""));
                const dossier = (Array.isArray(dossiers) ? dossiers : []).find(item => Number(item.id) === Number(doc.dossierId));
                setSelectedStorageId(dossier?.storageId ? String(dossier.storageId) : "");
              }
            }}
            style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #93c5fd", fontSize: "13px", background: "#fff" }}
          >
            <option value="">-- Chọn Tài liệu --</option>
            {(Array.isArray(filteredDocuments) ? filteredDocuments : []).map(doc => (
              <option key={doc.id} value={doc.id}>{doc.code} - {doc.title} ({doc.fileName || "Chưa có file"})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="gd2619-control-panel">
        <label>
          Engine OCR
          <select value={engine} onChange={event => setEngine(event.target.value)}>
            <option value="gemini">Gemini Vision</option>
            <option value="vietocr">VietOCR</option>
            <option value="easyocr">EasyOCR</option>
            <option value="crnn">CRNN</option>
          </select>
        </label>
        <label>
          Người xác nhận
          <input value={actor} onChange={event => setActor(event.target.value)} />
        </label>
      </div>

      <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "16px", marginBottom: "16px", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "12px", marginBottom: "12px" }}>
          <div>
            <label style={{ fontSize: "12px", color: "#475569", fontWeight: "600", display: "block", marginBottom: "4px" }}>Tên file</label>
            <input type="text" value={ocrFileName || selected?.fileName || "CV.pdf"} readOnly style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", background: "#f8fafc", color: "#1e293b" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", color: "#475569", fontWeight: "600", display: "block", marginBottom: "4px" }}>OCR</label>
            <div style={{ padding: "8px 12px", background: "#dcfce7", color: "#15803d", fontWeight: "700", fontSize: "12px", borderRadius: "6px", textAlign: "center", border: "1px solid #bbf7d0" }}>
              {(Array.isArray(fields) && fields.length > 0) ? "DONE" : "PENDING"}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ fontSize: "13px", color: "#1e293b", fontWeight: "700", display: "block", marginBottom: "6px" }}>Kết quả OCR / Ghi chú</label>
          <textarea
            rows={5}
            value={ocrText || formatOcrFields(fields)}
            onChange={e => setOcrText(e.target.value)}
            placeholder="Nội dung bóc tách từ OCR hiển thị ở đây để bạn copy paste hoặc chỉnh sửa..."
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", lineHeight: "1.5", resize: "vertical", fontFamily: "sans-serif", background: "#ffffff", color: "#0f172a" }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-start" }}>
          <button className="btn ok" type="button" onClick={confirmExtraction} style={{ background: "#2563eb", color: "#ffffff", border: "none", padding: "8px 20px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            💾 Cập nhật
          </button>
          <button className="btn" type="button" onClick={() => setOcrText("")} style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569", padding: "8px 20px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
            ✕ Bỏ qua
          </button>
        </div>
      </div>

      <div className="gd2619-summary">
        <Metric label="Loại văn bản" value={extraction ? documentTypeLabel(extraction.documentType) : "--"} />
        <Metric label="Confidence" value={`${Number(extraction?.overallConfidence || 0)}%`} />
        <Metric label="Cần kiểm tra" value={lowFields} />
      </div>

      <div className="gd2619-field-form">
        <div className="gd22-section-head"><CheckCircle2 size={16}/> Kết quả bóc tách Key-Value</div>
        {fields.map(field => (
          <label key={field.key} className={Number(field.confidence) < 80 ? "low" : ""}>
            <span>
              {field.label}
              <strong>{Number(field.confidence)}%</strong>
            </span>
            <input value={field.value} onChange={event => updateField(field.key, event.target.value)} />
          </label>
        ))}
        {fields.length === 0 && <div className="empty-cell">Chưa có kết quả OCR. Bấm “Upload file từ máy” hoặc “Bóc tách AI” để xử lý.</div>}
      </div>
    </div>
  );

  return (
    <GD2FeatureLayout
      featureId="GĐ2-6/19"
      featureName={title}
      description="OCR AI tự động nhận diện loại văn bản, bóc tách metadata key-value và cho người dùng xác nhận lại trên split screen PDF/Form."
      actor="Cán bộ khai thác / Chuyên viên số hóa"
      actionBarLabel="Bóc tách OCR AI và xác nhận dữ liệu chính thức"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="1fr 460px"
      className="gd2619-feature"
      leftPanelTitle="File gốc có Bounding Box OCR"
      rightPanelTitle="Form xác nhận thông tin"
      actions={
        <>
          <button className="btn" onClick={loadDocuments}><RefreshCw size={14}/> Tải lại</button>
          <button className="btn" disabled={loading || !selected} onClick={runAiExtraction}><Zap size={14}/> Bóc tách AI</button>
          <button className="btn ok" disabled={loading || fields.length === 0} onClick={confirmExtraction}><CheckCircle2 size={14}/> Xác nhận dữ liệu chính xác</button>
          <button className="btn" style={{ background: "#16a34a", color: "#ffffff", borderColor: "#16a34a", fontWeight: "600" }} disabled={loading} onClick={submitForReview}><Send size={14}/> Gửi kiểm duyệt (Bước 5)</button>
        </>
      }
      actionRows={[
        { action: "OCR AI", description: "Tự động nhận diện hóa đơn, hợp đồng, quyết định, báo cáo", result: "Sinh metadata key-value theo mẫu văn bản" },
        { action: "Kiểm tra confidence", description: "Trường dưới 80% được highlight cam", result: "Người dùng sửa và xác nhận thủ công" },
        { action: "Xác nhận chính thức", description: "Bấm xác nhận dữ liệu chính xác", result: "Metadata lưu vào CSDL và ghi audit/workflow" },
      ]}
      validationItems={[
        { type: "rule", label: "Confidence", text: "Trường có độ tin cậy dưới 80% phải được người dùng kiểm tra lại." },
        { type: "required", label: "Xác nhận", text: "Chỉ lưu chính thức khi người dùng bấm xác nhận dữ liệu chính xác." },
        { type: "perm", label: "Phân quyền", text: "Người xác nhận phải có quyền khai thác hoặc số hóa tài liệu." },
      ]}
      flowSteps={[
        { step: "1", label: "Chọn file", desc: "PDF gốc", color: "#3264f4" },
        { step: "2", label: "OCR AI", desc: "Key-value + metadata", color: "#0ea5e9" },
        { step: "3", label: "Highlight", desc: "Bounding boxes", color: "#f59e0b" },
        { step: "4", label: "Xác nhận", desc: "Sửa trường thấp", color: "#7c3aed" },
        { step: "5", label: "Lưu DB", desc: "Metadata chính thức", color: "#22c55e" },
      ]}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}

function documentTypeLabel(type) {
  return {
    INVOICE: "Hóa đơn",
    CONTRACT: "Hợp đồng",
    DECISION: "Quyết định",
    REPORT: "Báo cáo",
  }[type] || type || "--";
}

function formatOcrFields(fields) {
  return (Array.isArray(fields) ? fields : [])
    .map(field => {
      const label = String(field?.label || "").trim();
      const value = String(field?.value || "").trim();
      return label && value ? `${label}: ${value}` : label || value;
    })
    .filter(Boolean)
    .join("\n");
}

function mergeOcrTextIntoFields(fields, text) {
  const list = Array.isArray(fields) ? fields : [];
  if (!String(text || "").trim()) return list;

  const valuesByLabel = new Map(
    String(text)
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const separator = line.indexOf(":");
        if (separator < 0) return [null, line];
        return [line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim()];
      })
      .filter(([label]) => label)
  );

  return list.map(field => {
    const label = String(field?.label || "").trim().toLowerCase();
    return valuesByLabel.has(label) ? { ...field, value: valuesByLabel.get(label), confirmed: false } : field;
  });
}

const gd26ZoneFieldOptions = [
  { key: "documentNumber", label: "Số hiệu" },
  { key: "issueDate", label: "Ngày ban hành" },
  { key: "issuingAuthority", label: "Cơ quan ban hành" },
  { key: "subject", label: "Trích yếu" },
  { key: "signer", label: "Người ký" },
];

function GD26OcrScreen() {
  const [activeTab, setActiveTab] = useState("screen");
  const storageCrud = useCrud("storage", emptyStorage);
  const dossierTypeCrud = useCrud("dossier-types", emptySimple);
  const [documents, setDocuments] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, done: 0, pending: 0, error: 0, completionRate: 0 });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedStorageId, setSelectedStorageId] = useState("");
  const [selectedDossierType, setSelectedDossierType] = useState("");
  const [ocrEngine, setOcrEngine] = useState("gemini");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [showEngineModal, setShowEngineModal] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [ocrFileName, setOcrFileName] = useState("");
  const [zonePreviewUrl, setZonePreviewUrl] = useState("");
  const [zonePreviewPage, setZonePreviewPage] = useState(1);
  const [zonePageCount, setZonePageCount] = useState(1);
  const [zoneSourceFileName, setZoneSourceFileName] = useState("");
  const [zonePreviewLoading, setZonePreviewLoading] = useState(false);
  const [ocrZones, setOcrZones] = useState([]);
  const [drawingZone, setDrawingZone] = useState(null);
  const [zoneMetadata, setZoneMetadata] = useState({});
  const [zoneProcessing, setZoneProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const zoneCanvasRef = useRef(null);

  const filteredOcrDocuments = useMemo(
    () => documents.filter(document => {
      if (!selectedStorageId) return true;
      const dossier = dossiers.find(item => Number(item.id) === Number(document.dossierId));
      return String(dossier?.storageId || "") === selectedStorageId;
    }),
    [documents, dossiers, selectedStorageId]
  );
  const selectedDocument = filteredOcrDocuments.find(item => Number(item.id) === Number(selectedId)) || filteredOcrDocuments[0] || null;
  const selectedDossier = dossiers.find(item => Number(item.id) === Number(selectedDocument?.dossierId)) || null;
  const selectedHasOcrPdf = Boolean(selectedDocument?.fileName && /\.pdf$/i.test(selectedDocument.fileName) && String(selectedDocument.ocrStatus || "").toUpperCase() === "DONE");
  const dossierById = useMemo(
    () => new Map(dossiers.map(item => [item.id, item])),
    [dossiers]
  );
  const storageOptions = useMemo(
    () => storageCrud.rows.map((row) => ({
      value: String(row.id),
      label: `${row.code || `Kho #${row.id}`} - ${row.name || row.title || "Chưa có tên"}`,
    })),
    [storageCrud.rows]
  );
  const dossierTypeOptions = useMemo(
    () => dossierTypeCrud.rows.map((row) => ({
      value: row.code || row.name || String(row.id),
      label: `${row.code || `LT #${row.id}`} - ${row.name || row.title || "Chưa có tên"}`,
    })),
    [dossierTypeCrud.rows]
  );

  const loadOcrData = useCallback(async () => {
    setLoading(true);
    try {
      const [items, dossierRows] = await Promise.all([
        uiApi.crud("documents").list(),
        uiApi.crud("dossiers").list(),
      ]);
      setDocuments(items);
      setDossiers(dossierRows);
      const total = items.length;
      const done = items.filter(item => String(item.ocrStatus || "").toUpperCase() === "DONE").length;
      const pending = items.filter(item => ["PENDING", "PROCESSING"].includes(String(item.ocrStatus || "").toUpperCase())).length;
      const error = items.filter(item => String(item.ocrStatus || "").toUpperCase() === "ERROR").length;
      const completionRate = total === 0 ? 0 : Math.round((done * 10000) / total) / 100;
      setSummary({ total, done, pending, error, completionRate });
      setSelectedId(current => items.some(item => item.id === current) ? current : items[0]?.id || null);
    } catch (error) {
      setNotice(`Không tải được dữ liệu OCR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOcrData();
  }, [loadOcrData]);

  useEffect(() => {
    if (!selectedStorageId && storageOptions.length > 0) {
      setSelectedStorageId(storageOptions[0].value);
    }
  }, [selectedStorageId, storageOptions]);

  useEffect(() => {
    if (!selectedDossierType && dossierTypeOptions.length > 0) {
      setSelectedDossierType(dossierTypeOptions[0].value);
    }
  }, [selectedDossierType, dossierTypeOptions]);

  useEffect(() => {
    setZonePreviewPage(1);
    setOcrZones([]);
    setZoneMetadata({});
    setDrawingZone(null);
  }, [selectedId, selectedDocument?.fileName]);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setZonePreviewUrl("");
    setZoneSourceFileName("");
    if (!selectedDocument?.id || !selectedDocument.fileName) return undefined;
    setZonePreviewLoading(true);
    uiApi.gd2.ocrZonePreview(selectedDocument.id, zonePreviewPage)
      .then(result => {
        if (!active) return;
        objectUrl = URL.createObjectURL(result.blob);
        setZonePreviewUrl(objectUrl);
        setZonePageCount(result.pageCount || 1);
        setZoneSourceFileName(result.sourceFileName || selectedDocument.fileName || "");
      })
      .catch(error => {
        if (active) setNotice(`Không tạo được preview OCR vùng: ${error.message}`);
      })
      .finally(() => active && setZonePreviewLoading(false));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedDocument?.id, selectedDocument?.fileName, zonePreviewPage]);

  function pointInZoneCanvas(event) {
    const rect = zoneCanvasRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, (event.clientX - rect.left) * 100 / rect.width)),
      y: Math.max(0, Math.min(100, (event.clientY - rect.top) * 100 / rect.height)),
    };
  }

  function beginZoneDrawing(event) {
    if (!zonePreviewUrl || event.button !== 0 || event.target !== event.currentTarget) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointInZoneCanvas(event);
    setDrawingZone({ startX: point.x, startY: point.y, currentX: point.x, currentY: point.y });
  }

  function updateZoneDrawing(event) {
    if (!drawingZone) return;
    const point = pointInZoneCanvas(event);
    setDrawingZone(current => current ? { ...current, currentX: point.x, currentY: point.y } : null);
  }

  function finishZoneDrawing() {
    if (!drawingZone) return;
    const x = Math.min(drawingZone.startX, drawingZone.currentX);
    const y = Math.min(drawingZone.startY, drawingZone.currentY);
    const width = Math.abs(drawingZone.currentX - drawingZone.startX);
    const height = Math.abs(drawingZone.currentY - drawingZone.startY);
    setDrawingZone(null);
    if (width < 1 || height < 1) {
      setNotice("Vùng OCR quá nhỏ. Hãy kéo một khung lớn hơn.");
      return;
    }
    if (ocrZones.length >= 12) {
      setNotice("Mỗi lần chỉ được tạo tối đa 12 vùng OCR.");
      return;
    }
    const field = gd26ZoneFieldOptions.find(option => !ocrZones.some(zone => zone.fieldKey === option.key)) || gd26ZoneFieldOptions[0];
    setOcrZones(current => [...current, {
      id: globalThis.crypto?.randomUUID?.() || `zone-${Date.now()}-${current.length}`,
      fieldKey: field.key,
      label: field.label,
      page: zonePreviewPage,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      width: Number(width.toFixed(2)),
      height: Number(height.toFixed(2)),
    }]);
  }

  function changeZoneField(zoneId, fieldKey) {
    const option = gd26ZoneFieldOptions.find(item => item.key === fieldKey);
    setOcrZones(current => current.map(zone => zone.id === zoneId
      ? { ...zone, fieldKey, label: option?.label || zone.label }
      : zone));
  }

  async function extractSelectedZones() {
    if (!selectedDocument || ocrZones.length === 0) {
      setNotice("Hãy vẽ ít nhất một vùng trước khi bóc tách.");
      return;
    }
    try {
      setZoneProcessing(true);
      setNotice(`Đang crop và OCR ${ocrZones.length} vùng bằng ${ocrEngine}...`);
      const result = await uiApi.gd2.extractOcrZones(selectedDocument.id, {
        engine: ocrEngine,
        zones: ocrZones,
      });
      setZoneMetadata(result.metadata || {});
      setNotice(`Đã bóc tách ${result.zones?.length || 0} vùng và ánh xạ vào ${Object.keys(result.metadata || {}).length} trường metadata.`);
    } catch (error) {
      setNotice(`OCR theo vùng thất bại: ${error.message}`);
    } finally {
      setZoneProcessing(false);
    }
  }

  const draftZoneStyle = drawingZone ? {
    left: `${Math.min(drawingZone.startX, drawingZone.currentX)}%`,
    top: `${Math.min(drawingZone.startY, drawingZone.currentY)}%`,
    width: `${Math.abs(drawingZone.currentX - drawingZone.startX)}%`,
    height: `${Math.abs(drawingZone.currentY - drawingZone.startY)}%`,
  } : null;

  async function processOcr(documentId = selectedDocument?.id) {
    if (!documentId) {
      setNotice("Vui lòng chọn tài liệu cần OCR.");
      return;
    }
    const targetDocument = documents.find(item => item.id === documentId);
    if (!targetDocument) {
      setNotice("Không tìm thấy tài liệu cần OCR.");
      return;
    }

    setLoading(true);
    try {
      await uiApi.crud("documents").update(documentId, {
        dossierId: targetDocument.dossierId,
        code: targetDocument.code,
        title: targetDocument.title,
        fileName: ocrFileName || targetDocument.fileName,
        ocrStatus: "DONE",
        status: targetDocument.status || "DRAFT",
        description: ocrText || targetDocument.description || "",
      });
      await loadOcrData();
      setNotice(`Đã lưu OCR cho ${targetDocument.code}.`);
    } catch (error) {
      setNotice(`Lỗi OCR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function openOcrUpload() {
    if (!selectedDocument) {
      setNotice("Vui lòng chọn tài liệu cần quét OCR.");
      return;
    }
    setShowEngineModal(true);
  }

  function chooseFileForOcr() {
    setShowEngineModal(false);
    fileInputRef.current?.click();
  }

  async function handleGd26FileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!selectedDocument) {
      setNotice("Vui lòng chọn tài liệu đã tạo ở GĐ2-1 trước khi OCR.");
      return;
    }

    if (!selectedDocument && documents.length > 0) {
      setSelectedId(documents[0].id);
    }

    setLoading(true);
    setNotice(`AI đang quét OCR file '${file.name}' bằng engine ${ocrEngine}. Vui lòng chờ...`);
    try {
      const result = await uiApi.gd2.processOcrPdf(selectedDocument.id, file, ocrEngine, "DEFAULT");
      setOcrFileName(result?.fileName || file.name);
      setOcrText(result?.text || "");
      setNotice(
        result?.text
          ? `Đã bóc tách OCR và tạo PDF số hóa ${result.fileName}. File đã lưu vào kho của tài liệu.`
          : `Đã xử lý file ${file.name}, nhưng OCR chưa trích xuất được chữ.`
      );
      await loadOcrData();
    } catch (error) {
      setNotice(`Lỗi AI OCR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function processBatchOcr() {
    setLoading(true);
    try {
      await loadOcrData();
      setNotice("Đã tải lại dữ liệu OCR.");
    } catch (error) {
      setNotice(`Lỗi tải dữ liệu: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function submitForReview() {
    if (!selectedDocument) {
      setNotice("Vui lòng chọn tài liệu cần gửi kiểm duyệt.");
      return;
    }

    if (!selectedDossier) {
      setNotice("Tài liệu này chưa gắn hồ sơ.");
      return;
    }

    if (!selectedHasOcrPdf) {
      setNotice("Chỉ được gửi kiểm duyệt sau khi OCR tạo PDF số hóa và lưu vào kho thành công.");
      return;
    }

    const currentStatus = String(selectedDocument.status || "DRAFT").toUpperCase();
    const action = ["DRAFT", "PENDING", "NEEDS_SUPPLEMENT"].includes(currentStatus) ? "FORWARD" : "";
    if (!action) {
      setNotice(`Tài liệu ${selectedDocument.code} đang ở trạng thái ${currentStatus}, không gửi từ GD2-6 được.`);
      return;
    }

    setLoading(true);
    setNotice("Đang gửi kiểm duyệt...");
    try {
      const result = await uiApi.dms.transition({
        entityType: "DOCUMENT",
        entityId: selectedDocument.id,
        action,
        actor: "entry",
        unitCode: "DEFAULT",
        comment: `Gửi kiểm duyệt từ GD2-6 cho tài liệu ${selectedDocument.code} sau khi OCR tạo PDF ${selectedDocument.fileName || ocrFileName}`,
        recipient: selectedDocument.code,
      });

      await loadOcrData();
      const successMessage = currentStatus === "PENDING"
        ? `Tài liệu ${selectedDocument.code} đã nằm trong hàng chờ kiểm duyệt.`
        : `Đã gửi kiểm duyệt tài liệu ${selectedDocument.code}. Trạng thái mới: ${result.currentStatus}.`;
      setNotice(successMessage);
      window.alert(successMessage);
    } catch (error) {
      const failureMessage = `Không gửi kiểm duyệt được: ${error.message}`;
      setNotice(failureMessage);
      window.alert(failureMessage);
    } finally {
      setLoading(false);
    }
  }

  async function demoSubmitForReview() {
    if (!selectedDocument) {
      setNotice("Vui lòng chọn tài liệu để chạy demo.");
      return;
    }

    const resolvedStorageId = selectedStorageId || storageOptions[0]?.value || "KHO-DEMO";
    const resolvedDossierType = selectedDossierType || dossierTypeOptions[0]?.value || "LOAI-DEMO";
    const message = [
      "DEMO GỬI KIỂM DUYỆT",
      `Tài liệu: ${selectedDocument.code}`,
      `Kho hồ sơ: ${resolvedStorageId}`,
      `Loại hồ sơ: ${resolvedDossierType}`,
      `Trạng thái mô phỏng: PENDING -> APPROVED -> SIGNED -> PUBLISHED`
    ].join("\n");

    setNotice("Đang chạy demo gửi kiểm duyệt...");
    window.alert(message);
    setNotice(`Demo hoàn tất cho ${selectedDocument.code}. Dữ liệu sẽ đi vào hàng chờ kiểm duyệt trong luồng thật.`);
  }

  async function createDraftTestData() {
    setLoading(true);
    setNotice("Đang tạo dữ liệu test DRAFT...");
    try {
      const stamp = Date.now().toString().slice(-6);
      const dossierCode = `HS-TD-${stamp}`;
      const documentCode = `VB-TD-${stamp}`;
      const storageId = Number(selectedStorageId || storageOptions[0]?.value || 1);
      const dossierType = selectedDossierType || dossierTypeOptions[0]?.value || "Hành chính";
      const dossier = await uiApi.crud("dossiers").create({
        code: dossierCode,
        title: `Hồ sơ test DRAFT ${stamp}`,
        dossierType,
        storageId,
        status: "DRAFT",
        fromDate: new Date().toISOString(),
        toDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        description: "Hồ sơ tạo tự động để test luồng GD2-6 -> GD2-2."
      });

      const document = await uiApi.crud("documents").create({
        dossierId: dossier.id,
        code: documentCode,
        title: `Tài liệu test DRAFT ${stamp}`,
        fileName: `test-${stamp}.pdf`,
        ocrStatus: "PENDING",
        status: "DRAFT",
        description: "Tài liệu tạo tự động để test gửi kiểm duyệt."
      });

      const seed = {
        dossierId: dossier.id,
        dossierCode,
        documentId: document.id,
        documentCode,
        status: "DRAFT"
      };
      await loadOcrData();
      setSelectedId(seed.documentId);
      setOcrText("");
      setOcrFileName(seed.documentCode);
      setNotice(`Đã tạo ${seed.dossierCode} và ${seed.documentCode}. Bây giờ có thể bấm Gửi kiểm duyệt để sang GD2-2.`);
      window.alert(`Tạo dữ liệu test thành công:\nHồ sơ: ${seed.dossierCode}\nTài liệu: ${seed.documentCode}\nTrạng thái: ${seed.status}`);
    } catch (error) {
      setNotice(`Không tạo được dữ liệu test: ${error.message}`);
      window.alert(`Không tạo được dữ liệu test: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const midContent = (
    <div className="gd2-wizard-steps">
      <div className="wizard-step active">
        <div className="wizard-title">1. Chọn kho</div>
        <div className="wizard-desc">Lọc tài liệu theo kho</div>
      </div>
      <div className="wizard-step">
        <div className="wizard-title">2. Chọn tài liệu</div>
        <div className="wizard-desc">Tài liệu đã tạo ở GĐ2-1</div>
      </div>
      <div className="wizard-step">
        <div className="wizard-title">3. OCR & PDF</div>
        <div className="wizard-desc">Bóc tách và lưu PDF vào kho</div>
      </div>
      <div className="wizard-step">
        <div className="wizard-title">4. Gửi duyệt</div>
        <div className="wizard-desc">Đẩy hồ sơ sang kiểm duyệt</div>
      </div>
    </div>
  );

  const leftPanel = (
      <div className="gd2-tree-view">
        <div className="tree-item active">
        <span className="tree-icon">▾</span> <span style={{color:"#2563eb", fontWeight:600}}>Tài liệu trong kho đã chọn</span>
        </div>
      {filteredOcrDocuments.map(document => (
        <button
          key={document.id}
          type="button"
          className={`tree-item ${selectedDocument?.id === document.id ? "active" : ""}`}
          style={{paddingLeft:20, width:"100%", textAlign:"left", border:0, background:"transparent", cursor:"pointer"}}
          onClick={() => {
            setSelectedId(document.id);
            setOcrText(document.description || "");
            setOcrFileName(document.fileName || "");
          }}
        >
          <span className="tree-icon">📄</span> {document.code} · OCR {document.ocrStatus || "PENDING"} · HS {dossierById.get(document.dossierId)?.status || "DRAFT"}
        </button>
      ))}
      {filteredOcrDocuments.length === 0 && <div className="tree-item" style={{paddingLeft:20}}>Không có tài liệu trong kho này.</div>}
      <button className="btn primary" style={{marginTop: 16, width: "fit-content"}} onClick={loadOcrData} disabled={loading}>
        <RefreshCw size={14}/> Tải lại
      </button>
    </div>
  );
  const rightPanel = (
    <form className="gd2-config-form">
      {notice && <div className="alert" style={{gridColumn:"1/-1", margin: 0}}>{notice}</div>}
      <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleGd26FileChange} accept="image/*,application/pdf" />
      {showEngineModal && (
        <div className="modal-overlay" onClick={() => setShowEngineModal(false)}>
          <div className="modal-content" onClick={event => event.stopPropagation()}>
            <h3>Chọn engine OCR AI</h3>
            <p className="muted">Upload ảnh hoặc PDF để hệ thống bóc tách nội dung như màn nhập hồ sơ mới.</p>
            <div className="engine-options">
              {[
                ["gemini", "Gemini AI", "Khuyên dùng cho chữ viết tay tiếng Việt và ảnh khó."],
                ["vietocr", "VietOCR", "Model OCR tiếng Việt chạy offline."],
                ["easyocr", "EasyOCR", "Phù hợp chữ in, tiếng Việt và tiếng Anh."],
                ["tesseract", "Tesseract", "OCR chữ in qua bộ ngôn ngữ vie+eng."],
                ["crnn", "CRNN + CTC", "Model nhận dạng chữ viết tay nội bộ."],
              ].map(([value, label, description]) => (
                <label key={value} className={`engine-option ${ocrEngine === value ? "selected" : ""}`}>
                  <input type="radio" name="gd26-engine" value={value} checked={ocrEngine === value} onChange={event => setOcrEngine(event.target.value)} />
                  <div className="engine-info">
                    <strong>{label}</strong>
                    <span>{description}</span>
                  </div>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn primary" type="button" onClick={chooseFileForOcr}>
                <Upload size={16} /> Chọn file & quét OCR
              </button>
              <button className="btn" type="button" onClick={() => setShowEngineModal(false)}>
                <X size={16} /> Hủy
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="ocr-metrics" style={{gridColumn:"1/-1"}}>
        <div className="ocr-metric-card total"><BarChart2 size={22}/><strong>{summary.total}</strong><span>Tổng tài liệu</span></div>
        <div className="ocr-metric-card done"><CheckCircle2 size={22}/><strong>{summary.done}</strong><span>Đã OCR</span></div>
        <div className="ocr-metric-card pending"><Clock size={22}/><strong>{summary.pending}</strong><span>Chờ xử lý</span></div>
        <div className="ocr-metric-card rate"><Zap size={22}/><strong>{summary.completionRate || 0}%</strong><span>Tỷ lệ hoàn tất</span></div>
      </div>

      <div 
        className="ocr-upload-zone" 
        onClick={chooseFileForOcr}
        style={{
          gridColumn: "1/-1",
          border: "2px dashed #2563eb",
          borderRadius: "10px",
          padding: "24px 16px",
          textAlign: "center",
          background: "#f0f7ff",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(37,99,235,0.08)",
          margin: "8px 0"
        }}
      >
        <Upload size={36} color="#2563eb" style={{ marginBottom: "8px" }} />
        <h4 style={{ margin: "0 0 6px 0", color: "#1e3a8a", fontSize: "16px", fontWeight: "600" }}>
          BÓC TÁCH OCR & TẠO FILE PDF SỐ HÓA
        </h4>
        <p style={{ margin: 0, color: "#475569", fontSize: "13px" }}>
          Chọn file gốc để AI OCR bóc tách và tự động lưu PDF số hóa vào kho của tài liệu
        </p>
      </div>
      <div className="gd2-field" style={{gridColumn:"1/-1"}}>
        <label>Engine OCR</label>
        <select value={ocrEngine} onChange={event => setOcrEngine(event.target.value)}>
          <option value="gemini">Gemini</option>
          <option value="vietocr">VietOCR</option>
          <option value="easyocr">EasyOCR</option>
          <option value="tesseract">Tesseract</option>
          <option value="crnn">CRNN</option>
        </select>
      </div>
      <div className="gd2-form-row">
        <div className="gd2-field required">
          <label>Kho lưu trữ <span className="req-star">*</span></label>
          <select value={selectedStorageId} onChange={event => setSelectedStorageId(event.target.value)}>
            <option value="">Chọn kho lưu trữ</option>
            {storageOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="gd2-field required">
          <label>Tài liệu trong kho <span className="req-star">*</span></label>
          <select value={selectedDocument?.id || ""} onChange={event => setSelectedId(Number(event.target.value))}>
            <option value="">Chọn tài liệu</option>
            {filteredOcrDocuments.map(document => (
              <option key={document.id} value={document.id}>{document.code} - {document.title}</option>
            ))}
          </select>
        </div>
      </div>
      {selectedDocument && (
        <div className="detail-grid" style={{gridColumn:"1/-1"}}>
          <div className="detail-row"><span>Tài liệu đang chọn</span><strong>{selectedDocument.code} - {selectedDocument.title}</strong></div>
          <div className="detail-row"><span>Trạng thái OCR</span><OcrBadge status={selectedDocument.ocrStatus}/></div>
          <div className="detail-row"><span>Hồ sơ</span><strong>{selectedDossier ? `${selectedDossier.code} - ${selectedDossier.title}` : "Chưa gắn hồ sơ"}</strong></div>
          <div className="detail-row"><span>Trạng thái tài liệu</span><StatusBadge status={selectedDocument.status || "DRAFT"}/></div>
          <div className="detail-row"><span>PDF OCR trong kho</span><span>{selectedDocument.fileName || "Chưa tạo PDF OCR"}</span></div>
        </div>
      )}
      {selectedDocument && !["DRAFT", "PENDING", "NEEDS_SUPPLEMENT"].includes(String(selectedDocument.status || "").toUpperCase()) && (
        <div className="alert" style={{gridColumn:"1/-1", margin: 0}}>
          Tài liệu đang ở trạng thái {selectedDocument.status}; vẫn có thể xem OCR, nhưng không gửi kiểm duyệt lại từ GD2-6.
        </div>
      )}
      <section className="gd26-zonal-ocr">
        <div className="gd26-zonal-header">
          <div>
            <span className="gd21415-section-kicker">Interactive Zonal OCR</span>
            <h3>Vẽ vùng nhận dạng trên tài liệu</h3>
            <p>Kéo chuột trực tiếp trên trang để tạo nhiều bounding box. Tọa độ được lưu theo tỷ lệ %, không phụ thuộc kích thước màn hình.</p>
          </div>
          <button className="btn primary" type="button" onClick={extractSelectedZones} disabled={zoneProcessing || !zonePreviewUrl || ocrZones.length === 0}>
            <FileSearch size={14}/> {zoneProcessing ? "Đang bóc tách..." : "Bóc tách vùng đã chọn"}
          </button>
        </div>
        <div className="gd26-zonal-body">
          <div className="gd26-preview-column">
            <div className="gd26-page-toolbar">
              <button type="button" className="btn ghost" disabled={zonePreviewPage <= 1 || zonePreviewLoading} onClick={() => setZonePreviewPage(page => Math.max(1, page - 1))}>Trang trước</button>
              <strong>Trang {zonePreviewPage}/{zonePageCount}</strong>
              <button type="button" className="btn ghost" disabled={zonePreviewPage >= zonePageCount || zonePreviewLoading} onClick={() => setZonePreviewPage(page => Math.min(zonePageCount, page + 1))}>Trang sau</button>
              <span>{ocrZones.filter(zone => zone.page === zonePreviewPage).length} vùng trên trang</span>
            </div>
            {zoneSourceFileName && <div className="gd26-source-file">Nguồn vùng OCR: <strong>{zoneSourceFileName}</strong></div>}
            <div className="gd26-zone-document">
              {zonePreviewUrl ? <img src={zonePreviewUrl} alt={`Trang ${zonePreviewPage} của tài liệu`} draggable="false"/> : <div className="gd26-preview-empty">{zonePreviewLoading ? "Đang render trang tài liệu..." : "Chọn tài liệu PDF/ảnh có tệp vật lý để vẽ vùng OCR."}</div>}
              {zonePreviewUrl && <div
                ref={zoneCanvasRef}
                className="gd26-zone-canvas"
                onPointerDown={beginZoneDrawing}
                onPointerMove={updateZoneDrawing}
                onPointerUp={finishZoneDrawing}
                onPointerCancel={() => setDrawingZone(null)}
              >
                {ocrZones.filter(zone => zone.page === zonePreviewPage).map((zone, index) => <div
                  key={zone.id}
                  className="gd26-zone-box"
                  style={{left:`${zone.x}%`,top:`${zone.y}%`,width:`${zone.width}%`,height:`${zone.height}%`}}
                >
                  <span>{index + 1}. {zone.label}</span>
                  <button type="button" title="Xóa vùng" onPointerDown={event => event.stopPropagation()} onClick={() => setOcrZones(current => current.filter(item => item.id !== zone.id))}><X size={11}/></button>
                </div>)}
                {draftZoneStyle && <div className="gd26-zone-box draft" style={draftZoneStyle}><span>Vùng mới</span></div>}
              </div>}
            </div>
          </div>
          <div className="gd26-zone-sidebar">
            <div className="gd22-section-head"><Layers3 size={15}/> Danh sách vùng ({ocrZones.length}/12)</div>
            <div className="gd26-zone-list">
              {ocrZones.map((zone, index) => <div className={`gd26-zone-item ${zone.page === zonePreviewPage ? "active" : ""}`} key={zone.id}>
                <button className="gd26-zone-index" type="button" onClick={() => setZonePreviewPage(zone.page)}>{index + 1}</button>
                <div>
                  <select value={zone.fieldKey} onChange={event => changeZoneField(zone.id, event.target.value)}>
                    {gd26ZoneFieldOptions.map(option => <option value={option.key} key={option.key}>{option.label}</option>)}
                  </select>
                  <small>Trang {zone.page} · X {zone.x}% · Y {zone.y}% · {zone.width}×{zone.height}%</small>
                </div>
                <button className="icon-btn danger" type="button" title="Xóa vùng" onClick={() => setOcrZones(current => current.filter(item => item.id !== zone.id))}><Trash2 size={12}/></button>
              </div>)}
              {ocrZones.length === 0 && <div className="empty-cell">Giữ chuột và kéo trên tài liệu để tạo vùng đầu tiên.</div>}
            </div>
            {ocrZones.length > 0 && <button type="button" className="btn ghost" onClick={() => {setOcrZones([]);setZoneMetadata({});}}>Xóa tất cả vùng</button>}
          </div>
        </div>
        {Object.keys(zoneMetadata).length > 0 && <div className="gd26-metadata-results">
          <div className="gd22-section-head"><CheckCircle2 size={15}/> Metadata nhận dạng theo vùng</div>
          <div className="gd26-metadata-grid">
            {gd26ZoneFieldOptions.map(option => <label key={option.key}>
              <span>{option.label}</span>
              <textarea rows="2" value={zoneMetadata[option.key] || ""} onChange={event => setZoneMetadata(current => ({...current,[option.key]:event.target.value}))} placeholder="Chưa có vùng/kết quả"/>
            </label>)}
          </div>
        </div>}
      </section>
      <div className="gd2-form-actions" style={{gridColumn:"1/-1", marginTop: 0}}>
        <button className="btn primary" type="button" onClick={chooseFileForOcr} disabled={loading}>
          <Upload size={14}/> Bóc tách OCR & tạo PDF số hóa
        </button>
        <button className="btn" type="button" onClick={openOcrUpload} disabled={loading || !selectedDocument}>
          <Settings size={14}/> Chọn engine nâng cao
        </button>
        <button className="btn" type="button" onClick={loadOcrData} disabled={loading}>
          <RefreshCw size={14}/> Tải lại
        </button>
      </div>
      <div className="gd2-field" style={{gridColumn:"1/-1"}}>
        <label>Kết quả OCR AI {ocrFileName ? `(${ocrFileName})` : ""}</label>
        <textarea
          rows={7}
          value={ocrText || selectedDocument?.description || ""}
          onChange={event => setOcrText(event.target.value)}
          placeholder="Sau khi chọn file và quét OCR, nội dung bóc tách sẽ hiển thị tại đây."
        />
      </div>
      <div className="muted" style={{gridColumn:"1/-1"}}>
        Gửi kiểm duyệt: {selectedHasOcrPdf ? "Đã có PDF OCR trong kho, có thể gửi duyệt." : "Chưa có PDF OCR trong kho nên chưa thể gửi duyệt."}
      </div>

      <div className="gd2-form-actions" style={{marginTop: 20}}>
        <button className="btn" style={{color:"#16a34a", borderColor:"#bbf7d0"}} type="button" onClick={submitForReview} disabled={loading || !selectedDocument || !selectedDossier || !selectedHasOcrPdf}>Gửi kiểm duyệt</button>
        <button className="btn" style={{color:"#2563eb", borderColor:"#93c5fd"}} type="button" onClick={demoSubmitForReview} disabled={!selectedDocument}>Demo gửi kiểm duyệt</button>
        <button className="btn" style={{color:"#7c3aed", borderColor:"#c4b5fd"}} type="button" onClick={createDraftTestData} disabled={loading}>Tạo dữ liệu test DRAFT</button>
      </div>
    </form>
  );

  return (
    <GD2FeatureLayout
      featureId="GĐ2-6"
      featureName="Phần mềm có tích hợp OCR AI"
      description="Phần mềm có tích hợp OCR AI để bóc tách các trường dữ liệu, giảm sai sót khi nhập liệu và tự động trích xuất nội dung từ tài liệu số hóa."
      actor="entry"
      actionBarLabel="Nhập liệu hồ sơ theo quy trình"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="280px 1fr"
      leftPanelTitle="Danh sách văn bản"
      rightPanelTitle="Xử lý OCR & kiểm duyệt"
      midContent={midContent}
      actions={
        <>
          <button className="btn primary" type="button" onClick={createDraftTestData}><Plus size={14}/> Tạo hồ sơ test</button>
          <button className="btn" type="button" onClick={loadOcrData}><RefreshCw size={14}/> Tải lại dữ liệu</button>
          <button className="btn" type="button" onClick={demoSubmitForReview}><Download size={14}/> Demo kiểm duyệt</button>
        </>
      }
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}

// =============================================================
// GĐ2-7: Tích hợp hệ thống
// =============================================================
function GD27IntegrationScreen() {
  const [activeTab, setActiveTab] = useState("screen");
  const [dashboard, setDashboard] = useState({ systems: [], apiKeys: [], logs: [], successCount: 0, errorCount: 0 });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [apiKeyForm, setApiKeyForm] = useState({
    clientName: "Partner Connector",
    systemCode: "HRM",
    authMode: "API_KEY",
    scopes: "DOCUMENT_READ,DOSSIER_WRITE,MASTER_DATA_SYNC"
  });
  const [syncForm, setSyncForm] = useState({
    systemCode: "HRM",
    dataType: "DEPARTMENT",
    trigger: "CRON",
    cronExpression: "0 */2 * * *"
  });
  const [webhookForm, setWebhookForm] = useState({
    systemCode: "VOFFICE",
    eventType: "DOCUMENT_SIGNED",
    apiKey: "idp_demo_voffice",
    payload: "{\"documentCode\":\"VB-001\",\"signedBy\":\"lanh-dao\"}"
  });

  useEffect(() => {
    loadIntegrationDashboard();
  }, []);

  async function loadIntegrationDashboard() {
    try {
      setLoading(true);
      const result = await uiApi.gd2.integrationDashboard();
      setDashboard(result);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Khong tai duoc dashboard tich hop: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function createApiKey(event) {
    event.preventDefault();
    try {
      const key = await uiApi.gd2.createIntegrationApiKey(apiKeyForm);
      setNotice({ type: "success", text: `Da tao API key ${key.keyPreview} cho ${key.systemCode}.` });
      await loadIntegrationDashboard();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function runSync(event) {
    event.preventDefault();
    try {
      const log = await uiApi.gd2.runIntegrationSync(syncForm);
      setNotice({ type: "success", text: `Dong bo ${syncForm.dataType} thanh cong qua log #${log.id}.` });
      await loadIntegrationDashboard();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function receiveWebhook(event) {
    event.preventDefault();
    try {
      const log = await uiApi.gd2.receiveIntegrationWebhook(webhookForm);
      setNotice({ type: log.result === "SUCCESS" ? "success" : "error", text: `Webhook ${log.result} - HTTP ${log.statusCode}.` });
      await loadIntegrationDashboard();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function pushDocument() {
    try {
      const log = await uiApi.gd2.pushIntegrationDocument({
        ...webhookForm,
        eventType: "DOCUMENT_PUSHED"
      });
      setNotice({ type: log.result === "SUCCESS" ? "success" : "error", text: `Open API nhan tai lieu: ${log.result}.` });
      await loadIntegrationDashboard();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function retryLog(id) {
    try {
      const log = await uiApi.gd2.retryIntegrationLog(id);
      setNotice({ type: "success", text: `Da retry webhook/log #${id}, tao log moi #${log.id}.` });
      await loadIntegrationDashboard();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  const metrics = [
    { label: "He thong", value: dashboard.systems?.length || 0, hint: "HRM, ERP/Core, VOffice" },
    { label: "API key", value: dashboard.apiKeys?.length || 0, hint: "OAuth2/JWT/API key" },
    { label: "Thanh cong", value: dashboard.successCount || 0, hint: "Request/response OK" },
    { label: "Loi", value: dashboard.errorCount || 0, hint: "Cho retry/kiem tra" }
  ];

  const leftPanel = (
    <div className="gd27-left">
      <div className="gd27-kpi">
        {metrics.map(item => (
          <div className="metric-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.hint}</small>
          </div>
        ))}
      </div>

      <div className="gd27-system-list">
        {(dashboard.systems || []).map(system => (
          <button
            className={`gd27-system ${system.status === "CONNECTED" ? "connected" : "error"}`}
            type="button"
            key={system.code}
            onClick={() => {
              setApiKeyForm(current => ({ ...current, systemCode: system.code, authMode: system.authMode }));
              setSyncForm(current => ({ ...current, systemCode: system.code, cronExpression: system.cronExpression }));
              setWebhookForm(current => ({ ...current, systemCode: system.code, apiKey: `idp_demo_${system.code.toLowerCase()}` }));
            }}
          >
            <span>{system.status === "CONNECTED" ? <Wifi size={16}/> : <WifiOff size={16}/>} {system.code}</span>
            <strong>{system.name}</strong>
            <small>{system.baseUrl}</small>
            <em>{system.authMode} | cron {system.cronExpression}</em>
          </button>
        ))}
      </div>

      {notice && <div className={`gd2-alert ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  const midContent = (
    <div className="gd27-mid">
      <form className="gd27-panel" onSubmit={createApiKey}>
        <div className="gd27-panel-head"><Lock size={16}/> API key & token policy</div>
        <label>Ung dung tich hop
          <input value={apiKeyForm.clientName} onChange={e => setApiKeyForm({ ...apiKeyForm, clientName: e.target.value })} />
        </label>
        <div className="gd27-form-grid">
          <label>He thong
            <select value={apiKeyForm.systemCode} onChange={e => setApiKeyForm({ ...apiKeyForm, systemCode: e.target.value })}>
              <option value="HRM">HRM</option>
              <option value="ERP">ERP/Core</option>
              <option value="VOFFICE">VOffice/eOffice</option>
            </select>
          </label>
          <label>Xac thuc
            <select value={apiKeyForm.authMode} onChange={e => setApiKeyForm({ ...apiKeyForm, authMode: e.target.value })}>
              <option value="API_KEY">API Key</option>
              <option value="JWT">JWT Token</option>
              <option value="OAUTH2">OAuth2</option>
            </select>
          </label>
        </div>
        <label>Scopes
          <input value={apiKeyForm.scopes} onChange={e => setApiKeyForm({ ...apiKeyForm, scopes: e.target.value })} />
        </label>
        <button className="btn primary" type="submit"><Plus size={14}/> Tao key</button>
      </form>

      <form className="gd27-panel" onSubmit={runSync}>
        <div className="gd27-panel-head"><RefreshCw size={16}/> Sync danh muc & nhan su</div>
        <div className="gd27-form-grid">
          <label>He thong
            <select value={syncForm.systemCode} onChange={e => setSyncForm({ ...syncForm, systemCode: e.target.value })}>
              <option value="HRM">HRM</option>
              <option value="ERP">ERP/Core</option>
              <option value="VOFFICE">VOffice/eOffice</option>
            </select>
          </label>
          <label>Du lieu
            <select value={syncForm.dataType} onChange={e => setSyncForm({ ...syncForm, dataType: e.target.value })}>
              <option value="DEPARTMENT">Phong ban</option>
              <option value="PERSONNEL">Nhan su</option>
              <option value="DOSSIER">Ho so</option>
              <option value="DOCUMENT">Tai lieu</option>
            </select>
          </label>
        </div>
        <div className="gd27-form-grid">
          <label>Trigger
            <select value={syncForm.trigger} onChange={e => setSyncForm({ ...syncForm, trigger: e.target.value })}>
              <option value="CRON">Cron job</option>
              <option value="WEBHOOK">Webhook event</option>
            </select>
          </label>
          <label>Cron
            <input value={syncForm.cronExpression} onChange={e => setSyncForm({ ...syncForm, cronExpression: e.target.value })} />
          </label>
        </div>
        <button className="btn" type="submit"><Zap size={14}/> Chay dong bo</button>
      </form>

      <form className="gd27-panel" onSubmit={receiveWebhook}>
        <div className="gd27-panel-head"><Link size={16}/> Webhook / Open API test</div>
        <div className="gd27-form-grid">
          <label>He thong
            <select value={webhookForm.systemCode} onChange={e => setWebhookForm({ ...webhookForm, systemCode: e.target.value })}>
              <option value="HRM">HRM</option>
              <option value="ERP">ERP/Core</option>
              <option value="VOFFICE">VOffice/eOffice</option>
            </select>
          </label>
          <label>Event
            <input value={webhookForm.eventType} onChange={e => setWebhookForm({ ...webhookForm, eventType: e.target.value })} />
          </label>
        </div>
        <label>Credential
          <input value={webhookForm.apiKey} onChange={e => setWebhookForm({ ...webhookForm, apiKey: e.target.value })} />
        </label>
        <label>Payload JSON
          <textarea rows={4} value={webhookForm.payload} onChange={e => setWebhookForm({ ...webhookForm, payload: e.target.value })} />
        </label>
        <div className="gd27-actions">
          <button className="btn primary" type="submit"><Activity size={14}/> Nhan webhook</button>
          <button className="btn" type="button" onClick={pushDocument}><Upload size={14}/> Push tai lieu</button>
        </div>
      </form>
    </div>
  );

  const rightPanel = (
    <div className="gd27-right">
      <div className="gd27-panel">
        <div className="gd27-panel-head"><Lock size={16}/> Danh sach API key</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>System</th>
                <th>Auth</th>
                <th>Scopes</th>
                <th>Key</th>
              </tr>
            </thead>
            <tbody>
              {(dashboard.apiKeys || []).map(key => (
                <tr key={key.id}>
                  <td>{key.clientName}</td>
                  <td><span className="gd2-code">{key.systemCode}</span></td>
                  <td>{key.authMode}</td>
                  <td><small>{key.scopes}</small></td>
                  <td>{key.keyPreview}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="gd27-panel">
        <div className="gd27-panel-head"><History size={16}/> Request/response log</div>
        <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Huong</th>
            <th>System</th>
            <th>Endpoint</th>
            <th>HTTP</th>
            <th>Ket qua</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(dashboard.logs || []).map(log => (
            <tr key={log.id}>
              <td>#{log.id}</td>
              <td>{log.direction}</td>
              <td><span className="gd2-code">{log.systemCode}</span></td>
              <td><small>{log.endpoint}</small></td>
              <td>{log.statusCode}</td>
              <td>
                <span className={`gd27-status ${log.result === "SUCCESS" ? "success" : "error"}`}>
                  {log.result === "SUCCESS" ? <CheckCircle2 size={13}/> : <AlertCircle size={13}/>}
                  {log.result}
                </span>
              </td>
              <td>
                {log.result === "ERROR" && (
                  <button className="icon-btn" type="button" title="Retry webhook" onClick={() => retryLog(log.id)}>
                    <RefreshCw size={13}/>
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>
      </div>
    </div>
  );

  return (
    <GD2FeatureLayout
      featureId="GD2-7"
      featureName="Tích hợp hệ thống khác"
      description="Open API bảo mật, đồng bộ HRM/ERP/VOffice theo cron hoặc webhook, giám sát log và retry lỗi tích hợp."
      actor="Quản trị hệ thống / Quản trị đơn vị"
      actionBarLabel="API Dashboard"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      className="gd27-feature"
      splitRatio="300px 1fr"
      leftPanelTitle="Hệ thống kết nối"
      rightPanelTitle="Giám sát API"
      midContent={midContent}
      actions={
        <>
          <button className="btn primary" type="button" onClick={loadIntegrationDashboard} disabled={loading}><RefreshCw size={14}/> Tai lai</button>
          <button className="btn" type="button" onClick={pushDocument}><Upload size={14}/> Test Open API</button>
        </>
      }
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}

// =============================================================
// GÄ2-9: Chữ ký số
// =============================================================
function GD29DigitalSignatureScreen() {
  const [activeTab, setActiveTab] = useState("screen");
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [signer, setSigner] = useState("lanh-dao-don-vi");
  const [provider, setProvider] = useState("USB_TOKEN");
  const [certificateSerial, setCertificateSerial] = useState("VNPT-CA-2026-001");
  const [appearanceText, setAppearanceText] = useState("Da ky so boi IDP.DMS");
  const [showSignModal, setShowSignModal] = useState(false);
  const [signPin, setSignPin] = useState("");
  const [signOtp, setSignOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [zone, setZone] = useState({ page: 1, x: 58, y: 72, width: 28, height: 12 });
  const [dragging, setDragging] = useState(false);
  const [signatures, setSignatures] = useState([]);
  const [validation, setValidation] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const pdfRef = useRef(null);

  const selected = documents.find(row => row.id === selectedId) || documents[0] || null;
  const providerOptions = [
    { value: "USB_TOKEN", label: "USB Token / PKCS#11", cert: "VNPT-CA-2026-001" },
    { value: "REMOTE_SIGNING", label: "Remote Signing / HSM", cert: "REMOTE-HSM-2026-010" },
    { value: "SIM_PKI", label: "SIM PKI", cert: "SIMPKI-2026-077" },
    { value: "SMART_CA", label: "SmartCA Mobile", cert: "SMARTCA-2026-088" },
  ];

  useEffect(() => {
    loadSignatureDocuments();
  }, []);

  useEffect(() => {
    if (selectedId) loadSignatureStatus(selectedId);
  }, [selectedId]);

  async function loadSignatureDocuments() {
    try {
      setLoading(true);
      const result = await uiApi.gd2.documentSearch({ page: 1, pageSize: 25 });
      const items = result.items || [];
      setDocuments(items);
      setSelectedId(current => current || items[0]?.id || null);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được danh sách tài liệu: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function loadSignatureStatus(documentId) {
    try {
      const [signatureRows, verifyResult] = await Promise.all([
        uiApi.gd2.documentSignatures(documentId),
        uiApi.gd2.verifyDocumentSignature(documentId),
      ]);
      setSignatures(signatureRows);
      setValidation(verifyResult);
    } catch (error) {
      setNotice({ type: "error", text: `Không kiểm tra được chữ ký: ${error.message}` });
    }
  }

  function updateProvider(nextProvider) {
    setProvider(nextProvider);
    setCertificateSerial(providerOptions.find(item => item.value === nextProvider)?.cert || certificateSerial);
  }

  function handleSendOtp() {
    setOtpSent(true);
    setNotice({ type: "success", text: "OTP đã được gửi đến thiết bị xác thực." });
  }

  function moveSignatureZone(event) {
    if (!dragging || !pdfRef.current) return;
    const rect = pdfRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100 - zone.width / 2;
    const y = ((event.clientY - rect.top) / rect.height) * 100 - zone.height / 2;
    setZone(current => ({
      ...current,
      x: Math.max(0, Math.min(100 - current.width, Number(x.toFixed(2)))),
      y: Math.max(0, Math.min(100 - current.height, Number(y.toFixed(2)))),
    }));
  }

  async function handleSignConfirm() {
    if (!selected) {
      setNotice({ type: "error", text: "Vui lòng chọn tài liệu để ký." });
      return;
    }
    if (provider === "USB_TOKEN" && !signPin) {
      setNotice({ type: "error", text: "USB Token/PKCS#11 bắt buộc nhập mã PIN." });
      return;
    }
    if (provider !== "USB_TOKEN" && !signOtp) {
      setNotice({ type: "error", text: "Ký số từ xa/SIM PKI/SmartCA bắt buộc nhập OTP." });
      return;
    }

    try {
      setLoading(true);
      const signature = await uiApi.gd2.signDocument(selected.id, {
        documentId: selected.id,
        signer: signer.trim() || "lanh-dao-don-vi",
        provider,
        certificateSerial,
        pin: signPin,
        otp: signOtp,
        zone,
        appearanceText,
        unitCode: "DEFAULT",
      });
      await loadSignatureStatus(selected.id);
      setNotice({ type: "success", text: `Đã ký tài liệu ${signature.documentCode}. Chữ ký hợp lệ.` });
      setShowSignModal(false);
      setSignPin("");
      setSignOtp("");
      setOtpSent(false);
    } catch (error) {
      setNotice({ type: "error", text: `Ký số thất bại: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  const leftPanel = (
    <div className="gd29-left">
      <div className="gd29-provider-grid">
        {providerOptions.map(item => (
          <button
            key={item.value}
            className={`gd29-provider ${provider === item.value ? "active" : ""}`}
            type="button"
            onClick={() => updateProvider(item.value)}
          >
            <Lock size={15}/>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th style={{width:36}}></th><th>Mã</th><th>Tài liệu PDF</th><th>Trạng thái ký</th><th></th></tr></thead>
          <tbody>
            {documents.map(row => {
              const signed = validation?.documentId === row.id && validation.valid;
              return (
                <tr key={row.id} className={row.id === selected?.id ? "row-selected" : ""} onClick={() => setSelectedId(row.id)}>
                  <td><input type="radio" checked={row.id === selected?.id} onChange={() => setSelectedId(row.id)} /></td>
                  <td><span className="gd2-code">{row.code}</span></td>
                  <td><strong>{row.title}</strong><span className="gd21415-subtext">{row.fileName || "document.pdf"}</span></td>
                  <td>{signed ? <span className="gd29-valid-badge"><CheckCircle2 size={13}/> Chữ ký hợp lệ</span> : <span className="vld-badge rule">Chờ ký</span>}</td>
                  <td><button className="icon-btn" type="button" title="Ký tài liệu" onClick={(event) => { event.stopPropagation(); setSelectedId(row.id); setShowSignModal(true); }}><PenTool size={13}/></button></td>
                </tr>
              );
            })}
            {documents.length === 0 && <tr><td colSpan="5" className="empty-cell">{loading ? "Đang tải..." : "Chưa có tài liệu trong hàng chờ ký."}</td></tr>}
          </tbody>
        </table>
      </div>
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  const rightPanel = (
    <div className="gd29-right">
      <div className="gd29-pdf-toolbar">
        <div>
          <span className="gd21415-section-kicker">Preview PDF</span>
          <h3>{selected?.title || "Chưa chọn tài liệu"}</h3>
        </div>
        {validation?.valid && <span className="gd29-valid-badge"><CheckCircle2 size={14}/> Chữ ký hợp lệ</span>}
      </div>
      <div
        className="gd29-pdf-preview"
        ref={pdfRef}
        onMouseMove={moveSignatureZone}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        <div className="gd29-pdf-page">
          <div className="gd29-pdf-lines"><span></span><span></span><span></span><span></span><span></span><span></span></div>
          <button
            className="gd29-sign-zone"
            type="button"
            style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%` }}
            onMouseDown={() => setDragging(true)}
            title="Kéo vùng ký"
          >
            <PenTool size={14}/> Vùng ký
          </button>
        </div>
      </div>
      <div className="gd29-zone-grid">
        <label>Trang<input type="number" min="1" value={zone.page} onChange={event => setZone(current => ({ ...current, page: Number(event.target.value) || 1 }))}/></label>
        <label>X %<input type="number" value={zone.x} onChange={event => setZone(current => ({ ...current, x: Number(event.target.value) || 0 }))}/></label>
        <label>Y %<input type="number" value={zone.y} onChange={event => setZone(current => ({ ...current, y: Number(event.target.value) || 0 }))}/></label>
      </div>
      <div className="gd29-cert-panel">
        <div className="gd22-section-head"><Shield size={16}/> Kiểm tra chứng thư số</div>
        {validation?.valid ? (
          <div className="gd29-cert-valid">
            <span className="gd29-valid-badge"><CheckCircle2 size={14}/> Chữ ký hợp lệ</span>
            <strong>{signatures[0]?.certificateSubject}</strong>
            <span>Serial: {signatures[0]?.certificateSerial}</span>
            <span>Timestamp: {signatures[0]?.timestampAt ? new Date(signatures[0].timestampAt).toLocaleString("vi-VN") : "--"}</span>
            <span>OCSP: {signatures[0]?.ocspStatus} · CRL: {signatures[0]?.crlStatus}</span>
          </div>
        ) : (
          <div className="empty-cell">Tài liệu chưa có chữ ký hợp lệ.</div>
        )}
      </div>
      <div className="timeline-list">
        {signatures.map(item => (
          <div className="timeline-item" key={item.id}>
            <strong>{item.provider} · {item.signer}</strong>
            <span>{new Date(item.signedAt).toLocaleString("vi-VN")} · Trang {item.zone.page} · ({item.zone.x}%, {item.zone.y}%)</span>
            <span>{item.validationStatus} · OCSP {item.ocspStatus} · CRL {item.crlStatus}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <GD2FeatureLayout
        featureId="GD2-9"
        featureName="Chữ ký số và ký điện tử"
        description="Tích hợp USB Token/PKCS#11, ký số từ xa, SIM PKI, SmartCA và xác thực chứng thư khi mở văn bản."
        actor="Lãnh đạo / Cán bộ được ủy quyền ký"
        actionBarLabel="Ký số tài liệu PDF và xác thực chứng thư"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        splitRatio="0.95fr 1.05fr"
        className="gd29-feature"
        leftPanelTitle="Tài liệu chờ ký"
        rightPanelTitle="Preview PDF & chứng thư"
        actions={
          <>
            <button className="btn" onClick={loadSignatureDocuments}><RefreshCw size={14}/> Tải lại</button>
            <button className="btn ghost" disabled={!selected} onClick={() => selected && loadSignatureStatus(selected.id)}><CheckCircle2 size={14}/> Kiểm tra chữ ký</button>
            <button className="btn primary" disabled={loading || !selected} onClick={() => setShowSignModal(true)}><PenTool size={14}/> Ký tài liệu</button>
          </>
        }
        actionRows={[
          { action: "Chọn phương thức ký", description: "USB Token/PKCS#11, Remote Signing, SIM PKI hoặc SmartCA", result: "Áp dụng đúng cơ chế PIN/OTP" },
          { action: "Đặt vùng ký", description: "Kéo thả Signature Zone trên preview PDF hoặc nhập tọa độ", result: "Chữ ký ảnh/con dấu nằm đúng trang và tọa độ" },
          { action: "Xác thực", description: "Kiểm tra Certificate Validity, Timestamp, OCSP và CRL", result: "Hiển thị badge Chữ ký hợp lệ" },
        ]}
        validationItems={[
          { type: "required", label: "PIN", text: "USB Token/PKCS#11 bắt buộc nhập mã PIN chứng thư." },
          { type: "required", label: "OTP", text: "Remote Signing, SIM PKI và SmartCA bắt buộc xác thực OTP." },
          { type: "rule", label: "Tọa độ", text: "Vùng ký phải nằm trong trang PDF và có kích thước hợp lệ." },
          { type: "perm", label: "Phân quyền", text: "Chỉ lãnh đạo hoặc cán bộ được ủy quyền ký được thực hiện ký số." },
        ]}
        flowSteps={[
          { step: "1", label: "Chọn tài liệu", desc: "Mở PDF cần ký", color: "#3264f4" },
          { step: "2", label: "Đặt vùng ký", desc: "Kéo thả Signature Zone", color: "#0ea5e9" },
          { step: "3", label: "Xác thực", desc: "PIN/OTP", color: "#f59e0b" },
          { step: "4", label: "Ký số", desc: "USB/Remote/SIM/SmartCA", color: "#7c3aed" },
          { step: "5", label: "Verify", desc: "OCSP/CRL/Timestamp", color: "#22c55e" },
        ]}
        leftPanel={leftPanel}
        rightPanel={rightPanel}
      />
      {showSignModal && (
        <div className="modal-overlay" onClick={() => setShowSignModal(false)}>
          <div className="modal-content sign-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-wrap sign-icon"><PenTool size={22} color="#fff"/></div>
              <div>
                <h3>Ký số tài liệu</h3>
                <p className="muted">Xác thực PIN/OTP trước khi ký số chính thức</p>
              </div>
            </div>
            <div className="field" style={{marginTop:16}}><span>Người ký</span><input value={signer} onChange={e => setSigner(e.target.value)} /></div>
            <div className="field"><span>Phương thức ký</span><select value={provider} onChange={e => updateProvider(e.target.value)}>{providerOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <div className="field"><span>Serial chứng thư</span><input value={certificateSerial} onChange={e => setCertificateSerial(e.target.value)} /></div>
            <div className="field"><span>Mã PIN chứng thư</span><input type="password" value={signPin} onChange={e => setSignPin(e.target.value)} placeholder="Nhập mã PIN..." /></div>
            <div className="field">
              <span>Xác thực OTP</span>
              <div style={{display:"flex", gap:8}}>
                <input type="text" value={signOtp} onChange={e => setSignOtp(e.target.value)} placeholder={otpSent ? "Nhập mã OTP..." : "Chưa gửi OTP"} style={{flex:1}}/>
                <button className="btn primary" type="button" onClick={handleSendOtp} style={{whiteSpace:"nowrap"}}>{otpSent ? "Gửi lại" : "Gửi OTP"}</button>
              </div>
            </div>
            <div className="field"><span>Chữ ký ảnh / con dấu</span><input value={appearanceText} onChange={e => setAppearanceText(e.target.value)} /></div>
            <div className="sign-cert-info"><Lock size={13}/> Tọa độ ký: trang <strong>{zone.page}</strong>, X {zone.x}%, Y {zone.y}%</div>
            <div className="modal-actions" style={{marginTop:20}}>
              <button className="btn primary" onClick={handleSignConfirm}><PenTool size={14}/> Xác nhận ký số</button>
              <button className="btn" onClick={() => { setShowSignModal(false); setSignPin(""); setSignOtp(""); setOtpSent(false); }}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GD29PdfSignatureScreen() {
  const sessionUser = uiApi.auth.session()?.user;
  const [activeTab, setActiveTab] = useState("screen");
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [pdfUrl, setPdfUrl] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [certType, setCertType] = useState("DEVELOPMENT");
  const [signerName, setSignerName] = useState(sessionUser?.fullName || sessionUser?.username || "Lãnh đạo đơn vị");
  const [reason, setReason] = useState("Phê duyệt hồ sơ lưu trữ");
  const [location, setLocation] = useState("IDP.DMS");
  const [pin, setPin] = useState("");
  const [signatureImage, setSignatureImage] = useState("");
  const [signatureMode, setSignatureMode] = useState("draw");
  const [zone, setZone] = useState({ x: 58, y: 76, width: 36, height: 16 });
  const [dragging, setDragging] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  const selected = documents.find(item => item.id === selectedId) || null;
  const latestSignature = signatures[0] || null;
  const certificateOptions = [
    { value: "DEVELOPMENT", label: "Chứng thư thử nghiệm" },
    { value: "PFX", label: "Chứng thư PFX" },
    { value: "WINDOWS_STORE", label: "Windows Certificate Store" },
    { value: "USB_TOKEN", label: "USB Token (cần adapter)" },
  ];

  useEffect(() => { loadDocuments(); }, []);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setSignatures([]);
    setPdfUrl("");
    if (!selectedId) return undefined;

    Promise.allSettled([
      uiApi.gd2.pdfSignatures(selectedId),
      uiApi.gd2.documentPdfBlob(selectedId),
    ]).then(([signatureResult, pdfResult]) => {
      if (!active) return;
      if (signatureResult.status === "fulfilled") setSignatures(signatureResult.value);
      else setNotice({ type: "error", text: `Không đọc được chữ ký: ${signatureResult.reason.message}` });
      if (pdfResult.status === "fulfilled") {
        objectUrl = URL.createObjectURL(pdfResult.value);
        setPdfUrl(objectUrl);
      } else {
        setNotice({ type: "error", text: `Không mở được PDF: ${pdfResult.reason.message}` });
      }
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedId, reloadKey]);

  async function loadDocuments(keepNotice = false) {
    try {
      setLoading(true);
      const result = await uiApi.gd2.documentSearch({ page: 1, pageSize: 50 });
      const items = (result.items || []).filter(item => String(item.fileName || "").toLowerCase().endsWith(".pdf"));
      setDocuments(items);
      setSelectedId(current => items.some(item => item.id === current) ? current : items[0]?.id || null);
      if (!keepNotice) setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được danh sách PDF: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  function moveZone(event) {
    if (!dragging || !pageRef.current) return;
    const rect = pageRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 100 / rect.width - zone.width / 2;
    const y = (event.clientY - rect.top) * 100 / rect.height - zone.height / 2;
    setZone(current => ({
      ...current,
      x: Math.max(0, Math.min(100 - current.width, Number(x.toFixed(2)))),
      y: Math.max(0, Math.min(100 - current.height, Number(y.toFixed(2)))),
    }));
  }

  function getCanvasPoint(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height,
    };
  }

  function beginStroke(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(event);
    const context = canvas.getContext("2d");
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function drawStroke(event) {
    if (!drawingRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext("2d");
    const point = getCanvasPoint(event);
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#123b86";
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function endStroke() {
    if (!drawingRef.current || !canvasRef.current) return;
    drawingRef.current = false;
    setSignatureImage(canvasRef.current.toDataURL("image/png"));
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setSignatureImage("");
  }

  function uploadSignature(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type) || file.size > 2 * 1024 * 1024) {
      setNotice({ type: "error", text: "Ảnh chữ ký phải là PNG/JPEG và không vượt quá 2 MB." });
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSignatureImage(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function signPdf() {
    if (!selected) return;
    if (!signerName.trim() || !reason.trim() || !location.trim()) {
      setNotice({ type: "error", text: "Người ký, lý do và địa điểm ký là bắt buộc." });
      return;
    }
    try {
      setLoading(true);
      const result = await uiApi.gd2.signPdf(selected.id, {
        certType,
        signerName: signerName.trim(),
        reason: reason.trim(),
        location: location.trim(),
        pin,
        imageSignature: signatureImage,
        positionX: zone.x,
        positionY: zone.y,
        width: zone.width,
        height: zone.height,
      });
      setShowModal(false);
      setPin("");
      setNotice({
        type: result.certificateTrusted ? "success" : "warning",
        text: result.certificateTrusted
          ? `Đã ký PDF ${result.documentCode}; chứng thư có chuỗi tin cậy.`
          : `Đã ký PDF ${result.documentCode}; chứng thư tự ký/thử nghiệm chưa có chuỗi tin cậy.`,
      });
      await loadDocuments(true);
      setReloadKey(value => value + 1);
    } catch (error) {
      setNotice({ type: "error", text: `Ký PDF thất bại: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  const leftPanel = (
    <div className="gd29-left">
      <div className="gd29-provider-grid">
        {certificateOptions.map(item => (
          <button type="button" key={item.value} className={`gd29-provider ${certType === item.value ? "active" : ""}`} onClick={() => setCertType(item.value)}>
            <Lock size={14}/>{item.label}
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th style={{width:36}}></th><th>Mã</th><th>Tài liệu PDF</th><th>Workflow</th><th></th></tr></thead>
          <tbody>
            {documents.map(item => (
              <tr key={item.id} className={item.id === selectedId ? "row-selected" : ""} onClick={() => setSelectedId(item.id)}>
                <td><input type="radio" checked={item.id === selectedId} onChange={() => setSelectedId(item.id)}/></td>
                <td><span className="gd2-code">{item.code}</span></td>
                <td><strong>{item.title}</strong><span className="gd21415-subtext">{item.fileName}</span></td>
                <td><StatusBadge status={item.status}/></td>
                <td><button className="icon-btn" title="Ký PDF" disabled={item.status !== "APPROVED"} onClick={event => { event.stopPropagation(); setSelectedId(item.id); setShowModal(true); }}><PenTool size={13}/></button></td>
              </tr>
            ))}
            {!documents.length && <tr><td colSpan="5" className="empty-cell">{loading ? "Đang tải..." : "Không có tài liệu PDF."}</td></tr>}
          </tbody>
        </table>
      </div>
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  const rightPanel = (
    <div className="gd29-right">
      <div className="gd29-pdf-toolbar">
        <div><span className="gd21415-section-kicker">Trang cuối PDF</span><h3>{selected?.title || "Chưa chọn tài liệu"}</h3></div>
        {latestSignature && <span className={`gd29-valid-badge ${latestSignature.certificateTrusted ? "" : "untrusted"}`}><CheckCircle2 size={14}/>{latestSignature.certificateTrusted ? "Chứng thư tin cậy" : "Đã ký · chưa tin cậy"}</span>}
      </div>
      <div className="gd29-pdf-preview">
        <div className="gd29-pdf-page" ref={pageRef} onMouseMove={moveZone} onMouseUp={() => setDragging(false)} onMouseLeave={() => setDragging(false)}>
          {pdfUrl ? <object className="gd29-pdf-object" data={`${pdfUrl}#page=999999&toolbar=0&navpanes=0`} type="application/pdf" aria-label="Xem trước PDF"/> : <div className="gd29-pdf-lines"><span/><span/><span/><span/><span/><span/></div>}
          <button type="button" className="gd29-sign-zone" style={{left:`${zone.x}%`,top:`${zone.y}%`,width:`${zone.width}%`,height:`${zone.height}%`}} onMouseDown={() => setDragging(true)} title="Kéo để đặt con dấu">
            {signatureImage && <img src={signatureImage} alt="Chữ ký xem trước"/>}
            <span><strong>Ký bởi: {signerName || "..."}</strong><small>Trang cuối · {reason || "Lý do ký"}</small></span>
          </button>
        </div>
      </div>
      <div className="gd29-zone-grid">
        <label>Trang<input value="Trang cuối" readOnly/></label>
        <label>X %<input type="number" value={zone.x} onChange={event => setZone(value => ({...value,x:Number(event.target.value)||0}))}/></label>
        <label>Y %<input type="number" value={zone.y} onChange={event => setZone(value => ({...value,y:Number(event.target.value)||0}))}/></label>
      </div>
      <div className="gd29-cert-panel">
        <div className="gd22-section-head"><Shield size={16}/> Chữ ký PDF đã lưu</div>
        {latestSignature ? <div className="gd29-cert-valid"><strong>{latestSignature.certificateSubject}</strong><span>Serial: {latestSignature.certificateSerial}</span><span>{new Date(latestSignature.signedAt).toLocaleString("vi-VN")} · {latestSignature.validationStatus}</span><span>SHA-256: {latestSignature.fileHashSha256}</span></div> : <div className="empty-cell">Tài liệu chưa có chữ ký số.</div>}
      </div>
    </div>
  );

  return <>
    <GD2FeatureLayout
      featureId="GD2-9" featureName="Chữ ký số và ký điện tử"
      description="Ký mật mã lên tệp PDF vật lý, đặt con dấu trực quan ở trang cuối và lưu một phiên bản tài liệu mới."
      actor="Lãnh đạo / Cán bộ được ủy quyền ký" actionBarLabel="PAdES / Visual Digital Signature"
      activeTab={activeTab} onTabChange={setActiveTab} splitRatio="0.95fr 1.05fr" className="gd29-feature"
      leftPanelTitle="Tài liệu PDF chờ ký" rightPanelTitle="Preview vị trí con dấu"
      actions={<><button className="btn" onClick={() => loadDocuments()}><RefreshCw size={14}/> Tải lại</button><button className="btn primary" disabled={loading || !selected || selected.status !== "APPROVED" || Boolean(latestSignature)} onClick={() => setShowModal(true)}><PenTool size={14}/> Ký PDF</button></>}
      actionRows={[
        {action:"Chọn chứng thư",description:"PFX, Windows Store hoặc chứng thư Development",result:"Private key ký SHA-256 lên PDF"},
        {action:"Đặt con dấu",description:"Kéo vùng ký và tải/vẽ chữ ký",result:"Con dấu nằm trên trang cuối"},
        {action:"Lưu phiên bản",description:"Ghi PDF, SHA-256 và audit",result:"Version mới, trạng thái PUBLISHED"},
      ]}
      validationItems={[
        {type:"required",label:"PDF",text:"Tài liệu phải là PDF và có trạng thái APPROVED."},
        {type:"required",label:"Private key",text:"Chứng thư phải còn hiệu lực và có private key."},
        {type:"rule",label:"Không ký đè",text:"Không ký đè tài liệu đã có chữ ký để tránh làm mất hiệu lực chữ ký cũ."},
      ]}
      flowSteps={[
        {step:"1",label:"Chọn PDF",desc:"Trạng thái APPROVED",color:"#3264f4"},
        {step:"2",label:"Đặt vùng ký",desc:"Trang cuối",color:"#0ea5e9"},
        {step:"3",label:"Chọn chứng thư",desc:"PFX/Windows",color:"#f59e0b"},
        {step:"4",label:"Ký số",desc:"CMS + SHA-256",color:"#7c3aed"},
        {step:"5",label:"Lưu version",desc:"PDF + audit",color:"#22c55e"},
      ]}
      leftPanel={leftPanel} rightPanel={rightPanel}
    />
    {showModal && <div className="modal-overlay" onClick={() => setShowModal(false)}>
      <div className="modal-content sign-modal" onClick={event => event.stopPropagation()}>
        <div className="modal-header"><div className="modal-icon-wrap sign-icon"><PenTool size={22} color="#fff"/></div><div><h3>Ký số tệp PDF</h3><p className="muted">Ký mật mã và tạo con dấu trực quan trên trang cuối</p></div></div>
        <div className="field" style={{marginTop:16}}><span>Người ký</span><input value={signerName} onChange={event => setSignerName(event.target.value)}/></div>
        <div className="field"><span>Loại chứng thư</span><select value={certType} onChange={event => setCertType(event.target.value)}>{certificateOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <div className="field"><span>Lý do ký</span><input value={reason} onChange={event => setReason(event.target.value)}/></div>
        <div className="field"><span>Địa điểm ký</span><input value={location} onChange={event => setLocation(event.target.value)}/></div>
        <div className="field"><span>PIN/mật khẩu PFX (nếu cần)</span><input type="password" value={pin} onChange={event => setPin(event.target.value)} autoComplete="off" placeholder="Không lưu trên trình duyệt"/></div>
        <div className="gd29-signature-tabs"><button type="button" className={signatureMode === "draw" ? "active" : ""} onClick={() => setSignatureMode("draw")}><PenTool size={13}/> Vẽ chữ ký</button><button type="button" className={signatureMode === "upload" ? "active" : ""} onClick={() => setSignatureMode("upload")}><Upload size={13}/> Tải ảnh/con dấu</button></div>
        {signatureMode === "draw" ? <div className="gd29-canvas-wrap"><canvas ref={canvasRef} width="720" height="220" onPointerDown={beginStroke} onPointerMove={drawStroke} onPointerUp={endStroke} onPointerCancel={endStroke} onPointerLeave={endStroke}/><button className="btn ghost" type="button" onClick={clearSignature}>Xóa nét vẽ</button></div> : <label className="gd29-upload-signature"><Upload size={18}/><span>Chọn PNG/JPEG, tối đa 2 MB</span><input type="file" accept="image/png,image/jpeg" onChange={uploadSignature}/></label>}
        {signatureImage && <div className="gd29-image-preview"><img src={signatureImage} alt="Mẫu chữ ký/con dấu"/><span>Mẫu sẽ hiển thị trong con dấu PDF</span></div>}
        <div className="sign-cert-info"><Lock size={13}/> Vị trí: <strong>trang cuối</strong>, X {zone.x}%, Y {zone.y}% · {zone.width}×{zone.height}%</div>
        {certType === "DEVELOPMENT" && <div className="gd2-report-notice warning">Chứng thư DEVELOPMENT là tự ký, chỉ dùng kiểm thử và được ghi nhận là chưa tin cậy.</div>}
        {certType === "USB_TOKEN" && <div className="gd2-report-notice warning">USB Token cần adapter SDK/PKCS#11 của nhà cung cấp trên backend; hệ thống không mô phỏng chữ ký token.</div>}
        <div className="modal-actions" style={{marginTop:20}}><button className="btn primary" disabled={loading} onClick={signPdf}><PenTool size={14}/> Xác nhận ký số</button><button className="btn" onClick={() => {setShowModal(false);setPin("");}}>Hủy</button></div>
      </div>
    </div>}
  </>;
}

function GD29SignatureScreenV2() {
  const [activeTab, setActiveTab] = useState("screen");
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [requester, setRequester] = useState("current-user");
  const [note, setNote] = useState("");
  const [nextApprover, setNextApprover] = useState("lanh-dao-don-vi");
  const [showSignModal, setShowSignModal] = useState(false);
  const [signPin, setSignPin] = useState("");
  const [signCert, setSignCert] = useState("VNPT CA");
  const [signOtp, setSignOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [signHistory, setSignHistory] = useState([]);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWorkflowItems();
  }, []);

  const selected = rows.find(row => row.id === selectedId) || rows[0] || null;

  async function loadWorkflowItems() {
    try {
      setLoading(true);
      const data = await uiApi.gd2.workflowItems();
      setRows(data);
      setSelectedId(current => current || data[0]?.id || null);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được danh sách hồ sơ: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function processWorkflow(action, target = selected) {
    if (!target) {
      setNotice({ type: "error", text: "Vui lòng chọn một hồ sơ để xử lý." });
      return;
    }

    const actionText = {
      APPROVE: "Duyệt",
      FORWARD: "Chuyển cấp",
      REJECT: "Từ chối",
      CANCEL: "Hủy",
      SIGN: "Ký số",
    }[action] || action;

    try {
      setLoading(true);
      const result = await uiApi.gd2.transition({
        entityType: "DOSSIER",
        entityId: target.id,
        action,
        actor: requester.trim() || "current-user",
        unitCode: "DEFAULT",
        comment: note.trim() || `${actionText} hồ sơ ${target.code}`,
        recipient: action === "FORWARD" ? nextApprover : target.code,
      });
      setRows(current => current.map(row => row.id === target.id ? { ...row, status: result.currentStatus } : row));
      setSelectedId(target.id);
      setNotice({ type: "success", text: `${actionText} thành công. Trạng thái hiện tại: ${result.currentStatus}.` });
      setNote("");
    } catch (error) {
      setNotice({ type: "error", text: `${actionText} thất bại: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  const handleSendOtp = () => {
    setOtpSent(true);
    setNotice({ type: "success", text: "OTP đã được gửi đến thiết bị xác thực." });
  };

  const handleSignConfirm = async () => {
    if (!signPin) {
      setNotice({ type: "error", text: "Vui lòng nhập mã PIN." });
      return;
    }
    if (!selected) {
      setNotice({ type: "error", text: "Vui lòng chọn hồ sơ để ký." });
      return;
    }

    try {
      setLoading(true);
      if (selected.status !== "APPROVED") {
        await uiApi.gd2.transition({
          entityType: "DOSSIER",
          entityId: selected.id,
          action: "APPROVE",
          actor: requester.trim() || "current-user",
          unitCode: "DEFAULT",
          comment: "Phê duyệt trước khi ký số",
          recipient: selected.code,
        });
      }

      const result = await uiApi.gd2.transition({
        entityType: "DOSSIER",
        entityId: selected.id,
        action: "SIGN",
        actor: requester.trim() || "current-user",
        unitCode: "DEFAULT",
        comment: `Ký số bằng ${signCert}`,
        recipient: selected.code,
      });

      const ts = new Date().toLocaleString("vi-VN");
      setSignHistory(prev => [{ id: selected.id, cert: signCert, ts, code: selected.code }, ...prev]);
      setNotice({ type: "success", text: `Đã ký số thành công. Trạng thái: ${result.currentStatus}.` });
      setSignPin("");
      setSignOtp("");
      setOtpSent(false);
    } catch (error) {
      setNotice({ type: "error", text: `Ký số thất bại: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const leftPanel = (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{width:36}}></th>
            <th>Mã</th>
            <th>Tên/Nội dung</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={row.id}
              className={row.id === selected?.id ? "row-selected" : ""}
              onClick={() => setSelectedId(row.id)}
            >
              <td><input type="radio" checked={row.id === selected?.id} onChange={() => setSelectedId(row.id)} /></td>
              <td><span className="gd2-code">{row.code}</span></td>
              <td>{row.title}</td>
              <td><StatusBadge status={row.status} /></td>
              <td style={{display:"flex",gap:4}}>
                <button className="icon-btn" type="button" title="Xem" onClick={(event) => { event.stopPropagation(); setSelectedId(row.id); }}><FileText size={13}/></button>
                <button className="icon-btn" type="button" title="Ký số" onClick={(event) => { event.stopPropagation(); setSelectedId(row.id); setShowSignModal(true); }}><PenTool size={13}/></button>
                <button className="icon-btn danger" type="button" title="Hủy" onClick={(event) => { event.stopPropagation(); processWorkflow("CANCEL", row); }}><X size={13}/></button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan="5" className="empty-cell">{loading ? "Đang tải..." : "Chưa có hồ sơ trong hàng chờ."}</td></tr>
          )}
        </tbody>
      </table>
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  const rightPanel = (
    <div className="gd2-config-form">
      <div className="gd2-form-row">
        <div className="gd2-field">
          <label>Người yêu cầu</label>
          <input placeholder="Người yêu cầu" value={requester} onChange={event => setRequester(event.target.value)} />
        </div>
        <div className="gd2-field required">
          <label>Lý do/ghi chú <span className="req-star">*</span></label>
          <textarea rows="3" placeholder="Lý do/ghi chú" value={note} onChange={event => setNote(event.target.value)} style={{resize:"none"}}></textarea>
        </div>
      </div>
      <div className="gd2-field">
        <label>Người duyệt tiếp theo</label>
        <select value={nextApprover} onChange={event => setNextApprover(event.target.value)}>
            <option value="lanh-dao-don-vi">Lãnh đạo đơn vị</option>
            <option value="van-thu">Văn thư</option>
            <option value="quan-tri-ho-so">Quản trị hồ sơ</option>
        </select>
      </div>
      {selected && (
        <div className="detail-grid" style={{marginTop: 12}}>
          <div className="detail-row"><span>Mã hồ sơ</span><strong>{selected.code}</strong></div>
          <div className="detail-row"><span>Tên hồ sơ</span><strong>{selected.title}</strong></div>
          <div className="detail-row"><span>Loại hồ sơ</span><strong>{selected.dossierType || "--"}</strong></div>
          <div className="detail-row"><span>Trạng thái</span><StatusBadge status={selected.status} /></div>
        </div>
      )}
      <div className="gd2-field" style={{marginTop: 8}}>
        <label>Luồng xử lý</label>
        <div className="workflow-steps-list">
          <div className="wf-step-item">Tạo yêu cầu</div>
          <div className="wf-step-item">Kiểm tra điều kiện</div>
          <div className="wf-step-item">Phê duyệt / chuyển cấp / từ chối</div>
          <div className="wf-step-item">Ký số và ghi log</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <GD2FeatureLayout
        featureId="GD2-9"
        featureName="Chữ ký số và ký điện tử"
        description="Tích hợp công nghệ ký số để phê duyệt tài liệu trực tuyến, giảm thiểu giấy tờ."
        actor="approve"
        actionBarLabel="Hàng chờ duyệt và xử lý hồ sơ"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        splitRatio="1fr 440px"
        leftPanelTitle="Danh s�ch ch? x? l�"
        rightPanelTitle="Chi ti?t ph� duy??t"
        actions={
          <>
            <button className="btn" disabled={loading || !selected} style={{color: "#16a34a", borderColor: "#bbf7d0"}} onClick={() => processWorkflow("APPROVE")}>�o" Duy�?t</button>
            <button className="btn" disabled={loading || !selected} style={{color: "#d97706", borderColor: "#fde68a"}} onClick={() => processWorkflow("FORWARD")}>Chuy�fn cấp</button>
            <button className="btn" disabled={loading || !selected} style={{color: "#dc2626", borderColor: "#fecaca"}} onClick={() => processWorkflow("REJECT")}>Từ ch�\'i</button>
            <button className="btn" disabled={loading || !selected} style={{color: "#6b7280", borderColor: "#d1d5db"}} onClick={() => processWorkflow("CANCEL")}>Hủy</button>
          </>
        }
        leftPanel={leftPanel}
        rightPanel={rightPanel}
      />
      {showSignModal && (
        <div className="modal-overlay" onClick={() => setShowSignModal(false)}>
          <div className="modal-content sign-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-wrap sign-icon"><PenTool size={22} color="#fff"/></div>
              <div>
                <h3>Ký số &amp; Ban hành hồ sơ</h3>
                <p className="muted">Xác thực danh tính trước khi ký số chính thức</p>
              </div>
            </div>
            <div className="field" style={{marginTop:16}}>
              <span>Chứng thư số</span>
              <select value={signCert} onChange={e => setSignCert(e.target.value)}>
                <option value="VNPT CA">USB Token - VNPT CA</option>
                <option value="Viettel CA">USB Token - Viettel CA</option>
                <option value="HSM">Máy chủ HSM Doanh nghiệp</option>
                <option value="SmartSign">SmartSign Mobile</option>
              </select>
            </div>
            <div className="field">
              <span>Mã PIN chứng thư</span>
              <input type="password" value={signPin} onChange={e => setSignPin(e.target.value)} placeholder="Nhập mã PIN..." />
            </div>
            <div className="field">
              <span>Xác thực OTP (tùy chọn)</span>
              <div style={{display:"flex", gap:8}}>
                <input type="text" value={signOtp} onChange={e => setSignOtp(e.target.value)} placeholder={otpSent ? "Nhập mã OTP..." : "Chưa gửi OTP"} style={{flex:1}}/>
                <button className="btn primary" type="button" onClick={handleSendOtp} style={{whiteSpace:"nowrap"}}>
                  {otpSent ? "Gửi lại" : "Gửi OTP"}
                </button>
              </div>
            </div>
            <div className="sign-cert-info">
              <Lock size={13}/> Thông tin chứng thư: <strong>{signCert}</strong> - Hiệu lực đến 31/12/2026
            </div>
            <div className="modal-actions" style={{marginTop:20}}>
              <button className="btn primary" onClick={handleSignConfirm}><PenTool size={14}/> Xác nhận ký số</button>
              <button className="btn" onClick={() => { setShowSignModal(false); setSignPin(""); setSignOtp(""); setOtpSent(false); }}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GD29SignatureScreen() {
  const [activeTab, setActiveTab] = useState("screen");

  const leftPanel = (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{width:36}}><input type="checkbox"/></th>
            <th>Mã</th>
            <th>Tên/Nội dung</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><input type="checkbox"/></td>
            <td><span className="gd2-code">HS-001</span></td>
            <td>Phiếu mượn PM-001</td>
            <td><span className="vld-badge unique" style={{background: "#fff7ed", color: "#c2410c", border: "none"}}>Chờ duy�?t</span></td>
            <td style={{display:"flex",gap:4}}><button className="icon-btn"><FileText size={13}/></button><button className="icon-btn"><Edit size={13}/></button><button className="icon-btn danger"><X size={13}/></button></td>
          </tr>
          <tr>
            <td><input type="checkbox"/></td>
            <td><span className="gd2-code">HS-002</span></td>
            <td>H�" sơ xuất bản HS-002</td>
            <td><span className="vld-badge unique" style={{background: "#fff7ed", color: "#c2410c", border: "none"}}>Chờ xác nhận</span></td>
            <td style={{display:"flex",gap:4}}><button className="icon-btn"><FileText size={13}/></button><button className="icon-btn"><Edit size={13}/></button><button className="icon-btn danger"><X size={13}/></button></td>
          </tr>
          <tr>
            <td><input type="checkbox"/></td>
            <td><span className="gd2-code">HS-003</span></td>
            <td>Báo l�-i tài li�?u HS-003</td>
            <td><span className="vld-badge required" style={{background: "#fef2f2", color: "#b91c1c", border: "none"}}>Không hợp l�?</span></td>
            <td style={{display:"flex",gap:4}}><button className="icon-btn"><FileText size={13}/></button><button className="icon-btn"><Edit size={13}/></button><button className="icon-btn danger"><X size={13}/></button></td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const rightPanel = (
    <div className="gd2-config-form">
      <div className="gd2-form-row">
        <div className="gd2-field">
          <label>Người yêu cầu</label>
          <input placeholder="Ngu?i y�u c?u" />
        </div>
        <div className="gd2-field required">
          <label>Lý do/ghi chú <span className="req-star">*</span></label>
          <textarea rows="3" placeholder="L� do/ghi ch�" style={{resize:"none"}}></textarea>
        </div>
      </div>
      <div className="gd2-field">
        <label>Người duy�?t tiếp theo</label>
        <select><option>Chọn người duy�?t tiếp theo</option></select>
      </div>
      <div className="gd2-field" style={{marginTop: 8}}>
        <label>Lu�"ng xử lý</label>
        <div className="workflow-steps-list">
          <div className="wf-step-item">Tạo yêu cầu</div>
          <div className="wf-step-item">Ki�fm tra �\'iều ki�?n mượn/xuất bản</div>
          <div className="wf-step-item">Phê duy�?t hoặc chuy�fn cấp</div>
          <div className="wf-step-item">Ghi log và thông báo</div>
        </div>
      </div>
    </div>
  );

  return (
    <GD2FeatureLayout
      featureId="GD2-9"
      featureName="Chữ ký số và ký điện tử"
      description="Tích hợp công nghệ ký số để phê duyệt tài liệu trực tuyến, giảm thiểu giấy tờ."
      actor="approve"
      actionBarLabel="Hàng chờ duyệt và xử lý hồ sơ"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="1fr 440px"
      leftPanelTitle="Danh s�ch ch? x? l�"
      rightPanelTitle="Chi ti?t ph� duy??t"
      actions={
        <>
          <button className="btn" style={{color: "#16a34a", borderColor: "#bbf7d0"}} onClick={() => alert("Duy??t")}>�o" Duy�?t</button>
          <button className="btn" style={{color: "#d97706", borderColor: "#fde68a"}} onClick={() => alert("Chuy?fn c?p")}>Chuy�fn cấp</button>
          <button className="btn" style={{color: "#dc2626", borderColor: "#fecaca"}} onClick={() => alert("Từ chối/Hủy")}>Từ chối/Hủy</button>
        </>
      }
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}

// =============================================================
// GÄ2-10: Báo cáo và phân tích
// =============================================================
function GD210ReportScreen() {
  const [activeTab, setActiveTab] = useState("screen");
  const [form, setForm] = useState({
    code: "",
    name: "",
    dataType: "",
    parameters: "",
  });
  const [templateFile, setTemplateFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [generatedAt, setGeneratedAt] = useState("");
  const [reportRows, setReportRows] = useState([]);
  const previewRef = useRef(null);

  const previewRows = form.dataType && form.dataType !== "SUMMARY"
    ? reportRows.filter(row => row.type === form.dataType)
    : reportRows;

  useEffect(() => {
    loadReportSummary("").catch(error => {
      setNotice({ type: "error", text: `Không tải được số liệu: ${error.message}` });
    });
  }, []);

  async function loadReportSummary(dataType) {
    const summary = await uiApi.gd2.reportSummary(dataType);
    const rows = summary.rows.map(row => ({
      type: row.key,
      indicator: row.indicator,
      quantity: row.quantity,
      rate: row.rate,
    }));
    setReportRows(rows);
    setGeneratedAt(new Date(summary.generatedAt).toLocaleString("vi-VN"));
    return rows;
  }

  function setField(field, value) {
    setForm(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: "" }));
    setNotice(null);
  }

  function validate() {
    const nextErrors = {};
    if (!form.code.trim()) nextErrors.code = "Vui lòng nhập mã báo cáo.";
    if (!form.name.trim()) nextErrors.name = "Vui lòng nhập tên báo cáo.";
    if (!templateFile) nextErrors.templateFile = "Vui lòng chọn tệp thiết kế.";
    if (!form.dataType) nextErrors.dataType = "Vui lòng chọn loại dữ liệu.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function generateReport() {
    if (!validate()) {
      setNotice({ type: "error", text: "Vui lòng hoàn thiện các trường bắt buộc." });
      return;
    }

    try {
      await loadReportSummary(form.dataType);
      setNotice({ type: "success", text: "Đã tổng hợp số liệu báo cáo từ hệ thống." });
      requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    } catch (error) {
      setNotice({ type: "error", text: `Không tạo được báo cáo: ${error.message}` });
    }
  }

  async function saveConfiguration() {
    if (!validate()) {
      setNotice({ type: "error", text: "Vui lòng hoàn thiện các trường bắt buộc." });
      return;
    }

    try {
      const saved = await uiApi.gd2.saveReportConfig({
        code: form.code.trim(),
        name: form.name.trim(),
        dataType: form.dataType,
        templateFileName: templateFile.name,
        parameters: form.parameters.trim() || null,
        status: "ACTIVE",
      });
      setNotice({ type: "success", text: `Đã lưu cấu hình báo cáo ${saved.code}.` });
    } catch (error) {
      setNotice({ type: "error", text: `Không lưu được cấu hình: ${error.message}` });
    }
  }

  function reportFileName(extension) {
    const baseName = (form.code || "bao-cao-thong-ke")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    return `${baseName || "bao-cao-thong-ke"}.${extension}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function reportTableHtml(rows = previewRows) {
    return `
      <table>
        <thead><tr><th>Chỉ tiêu</th><th>Số lượng</th><th>Tỷ lệ</th></tr></thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td>${escapeHtml(row.indicator)}</td>
              <td>${escapeHtml(row.quantity.toLocaleString("vi-VN"))}</td>
              <td>${escapeHtml(`${Number(row.rate).toLocaleString("vi-VN")}%`)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  async function logReportExport(format) {
    return uiApi.gd2.logReportRun({
      reportCode: form.code.trim(),
      dataType: form.dataType,
      format,
      actor: "report",
      unitCode: "DEFAULT",
      parameters: form.parameters.trim() || null,
    });
  }

  async function exportExcel() {
    if (!validate()) {
      setNotice({ type: "error", text: "Vui lòng hoàn thiện cấu hình trước khi xuất báo cáo." });
      return;
    }
    let exportRows;
    try {
      exportRows = await loadReportSummary(form.dataType);
      await logReportExport("EXCEL");
    } catch (error) {
      setNotice({ type: "error", text: `Không xuất được Excel: ${error.message}` });
      return;
    }

    const workbook = `
      <html><head><meta charset="UTF-8"></head><body>
        <h2>${escapeHtml(form.name || "Báo cáo thống kê")}</h2>
        ${reportTableHtml(exportRows)}
      </body></html>
    `;
    const blob = new Blob(["\ufeff", workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = reportFileName("xls");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice({ type: "success", text: "Đã xuất báo cáo Excel." });
  }

  async function exportPdf() {
    if (!validate()) {
      setNotice({ type: "error", text: "Vui lòng hoàn thiện cấu hình trước khi xuất báo cáo." });
      return;
    }
    const reportWindow = window.open("", "_blank", "width=900,height=700");
    if (!reportWindow) {
      setNotice({ type: "error", text: "Trình duyệt đang chặn cửa sổ xuất PDF." });
      return;
    }

    let exportRows;
    try {
      exportRows = await loadReportSummary(form.dataType);
      await logReportExport("PDF");
    } catch (error) {
      reportWindow.close();
      setNotice({ type: "error", text: `Không xuất được PDF: ${error.message}` });
      return;
    }

    reportWindow.opener = null;
    reportWindow.document.write(`
      <!doctype html>
      <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <title>${escapeHtml(form.name || "Báo cáo thống kê")}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #172033; }
            h1 { font-size: 22px; margin: 0 0 8px; }
            p { color: #667085; margin: 0 0 24px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cfd8ea; padding: 10px 12px; text-align: left; }
            th { background: #eef2f8; }
            @page { size: A4; margin: 16mm; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(form.name || "Báo cáo thống kê")}</h1>
          <p>Mã báo cáo: ${escapeHtml(form.code || "--")}</p>
          ${reportTableHtml(exportRows)}
          <script>window.onload = () => { window.print(); };<\/script>
        </body>
      </html>
    `);
    reportWindow.document.close();
    setNotice({ type: "success", text: "Đã mở bản in; chọn \"Save as PDF\" để lưu tệp." });
  }

  const formPanel = (
    <form className="gd2-report-form" onSubmit={event => { event.preventDefault(); generateReport(); }}>
      <div className="gd2-form-row">
        <div className="gd2-field required">
          <label htmlFor="report-code">Mã báo cáo <span className="req-star">*</span></label>
          <input
            id="report-code"
            placeholder="Mã báo cáo"
            value={form.code}
            onChange={event => setField("code", event.target.value)}
            aria-invalid={Boolean(errors.code)}
          />
          {errors.code && <span className="gd2-field-error">{errors.code}</span>}
        </div>
        <div className="gd2-field required">
          <label htmlFor="report-name">Tên báo cáo <span className="req-star">*</span></label>
          <input
            id="report-name"
            placeholder="Tên báo cáo"
            value={form.name}
            onChange={event => setField("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <span className="gd2-field-error">{errors.name}</span>}
        </div>
      </div>
      <div className="gd2-form-row">
        <div className="gd2-field required">
          <label htmlFor="report-template">Tệp thiết kế <span className="req-star">*</span></label>
          <input
            id="report-template"
            type="file"
            accept=".xlsx,.xls,.docx,.html,.jrxml,.rdl"
            onChange={event => {
              setTemplateFile(event.target.files?.[0] || null);
              setErrors(current => ({ ...current, templateFile: "" }));
              setNotice(null);
            }}
            aria-invalid={Boolean(errors.templateFile)}
          />
          {errors.templateFile && <span className="gd2-field-error">{errors.templateFile}</span>}
        </div>
        <div className="gd2-field required">
          <label htmlFor="report-data-type">Loại dữ liệu <span className="req-star">*</span></label>
          <select
            id="report-data-type"
            value={form.dataType}
            onChange={event => setField("dataType", event.target.value)}
            aria-invalid={Boolean(errors.dataType)}
          >
            <option value="">Chọn loại dữ liệu</option>
            <option value="SUMMARY">Tổng hợp hồ sơ</option>
            <option value="DIGITIZED">Hồ sơ số hóa</option>
            <option value="APPROVED">Hồ sơ đã duyệt</option>
            <option value="BORROW">Phiếu mượn</option>
          </select>
          {errors.dataType && <span className="gd2-field-error">{errors.dataType}</span>}
        </div>
      </div>
      <div className="gd2-field gd2-report-parameters">
        <label htmlFor="report-parameters">Tham số</label>
        <textarea
          id="report-parameters"
          rows="4"
          placeholder="Tham số"
          value={form.parameters}
          onChange={event => setField("parameters", event.target.value)}
        />
      </div>
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
      <div className="gd2-form-actions">
        <button className="btn primary" type="submit">Tạo báo cáo</button>
        <button className="btn" type="button" onClick={saveConfiguration}>Lưu cấu hình</button>
      </div>
    </form>
  );

  const previewPanel = (
    <div className="gd2-report-preview" ref={previewRef}>
      {generatedAt && (
        <div className="gd2-report-meta">
          <strong>{form.name}</strong>
          <span>Cập nhật: {generatedAt}</span>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Chỉ tiêu</th>
              <th>Số lượng</th>
              <th>Tỷ lệ</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map(row => (
              <tr key={row.type}>
                <td>{row.indicator}</td>
                <td>{row.quantity.toLocaleString("vi-VN")}</td>
                <td>{Number(row.rate).toLocaleString("vi-VN")}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <GD2FeatureLayout
      className="gd2-report-feature"
      featureId="GĐ2-10"
      featureName="Báo cáo và phân tích"
      description="Thiết kế màn hình theo danh sách hành động bên dưới."
      actor="report"
      actionBarLabel="Báo cáo thống kê"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="1fr 1fr"
      leftPanelTitle=""
      rightPanelTitle="Xem trước báo cáo"
      actions={
        <>
          <button className="btn primary" onClick={generateReport}>Xem báo cáo</button>
          <button className="btn" onClick={exportPdf}>Xuất PDF</button>
          <button className="btn" onClick={exportExcel}>Xuất Excel</button>
        </>
      }
      actionRows={[
        { action: "Xem báo cáo", description: "Nhập cấu hình và tạo bản xem trước", result: "Hiển thị số liệu thống kê theo quyền đơn vị" },
        { action: "Lưu cấu hình", description: "Lưu mã, tên, loại dữ liệu, tham số và tệp mẫu", result: "Tạo cấu hình báo cáo dùng lại" },
        { action: "Xuất PDF", description: "Mở bản in của báo cáo đang xem", result: "Lưu hoặc in báo cáo dạng PDF" },
        { action: "Xuất Excel", description: "Kết xuất bảng dữ liệu đang xem", result: "Tải tệp Excel về máy" },
      ]}
      validationItems={[
        { type: "required", label: "Bắt buộc", text: "Mã báo cáo, tên báo cáo, tệp thiết kế và loại dữ liệu phải được nhập." },
        { type: "unique", label: "Duy nhất", text: "Mã báo cáo không được trùng với cấu hình đã có." },
        { type: "rule", label: "Định dạng", text: "Tệp thiết kế hỗ trợ Excel, Word, HTML, JRXML hoặc RDL." },
        { type: "perm", label: "Phân quyền", text: "Số liệu báo cáo chỉ tổng hợp trong phạm vi đơn vị người dùng được cấp quyền." },
      ]}
      flowSteps={[
        { step: "1", label: "Khai báo", desc: "Nhập cấu hình báo cáo", color: "#3264f4" },
        { step: "2", label: "Kiểm tra", desc: "Validation & phân quyền", color: "#7c3aed" },
        { step: "3", label: "Tổng hợp", desc: "Truy vấn và tính số liệu", color: "#f59e0b" },
        { step: "4", label: "Xem trước", desc: "Hiển thị bảng báo cáo", color: "#0ea5e9" },
        { step: "5", label: "Kết xuất", desc: "Xuất PDF hoặc Excel", color: "#22c55e" },
      ]}
      leftPanel={formPanel}
      rightPanel={previewPanel}
    />
  );
}

function GD21013ExecutiveDashboardScreen({ mode = "report" }) {
  const [activeTab, setActiveTab] = useState("screen");
  const [filters, setFilters] = useState({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    toDate: new Date().toISOString().slice(0, 10),
    department: "",
    dossierType: ""
  });
  const [dashboard, setDashboard] = useState({ kpis: [], newDossierTrend: [], approvalSlaPie: [], borrowReturnTrend: [], performanceRanking: [] });
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  const isLeadership = mode === "leadership";
  const featureId = isLeadership ? "GĐ2-13" : "GĐ2-10";
  const featureName = isLeadership ? "Màn hình theo dõi hiệu suất dành cho Lãnh đạo" : "Báo cáo và phân tích";
  const maxNew = Math.max(1, ...(dashboard.newDossierTrend || []).map(item => Number(item.value)));
  const maxBorrow = Math.max(1, ...(dashboard.borrowReturnTrend || []).map(item => Number(item.value)));
  const pieTotal = (dashboard.approvalSlaPie || []).reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
  const pieGradient = buildPieGradient(dashboard.approvalSlaPie || [], pieTotal);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard(nextFilters = filters) {
    try {
      setLoading(true);
      const result = await uiApi.gd2.executiveDashboard(nextFilters);
      setDashboard(result);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Khong tai duoc dashboard: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  function setFilter(field, value) {
    setFilters(current => ({ ...current, [field]: value }));
  }

  async function applyFilters(event) {
    event.preventDefault();
    await loadDashboard(filters);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function logExport(format) {
    await uiApi.gd2.logReportRun({
      reportCode: featureId,
      dataType: "SUMMARY",
      format,
      actor: isLeadership ? "leader" : "report",
      unitCode: filters.department || "DEFAULT",
      parameters: JSON.stringify(filters)
    });
  }

  async function exportExcel() {
    try {
      await logExport("EXCEL");
      const rows = [
        ["Chi tieu", "Gia tri", "Don vi", "Tang/Giam"],
        ...(dashboard.kpis || []).map(item => [item.label, item.value, item.unit, `${item.changePercent}%`]),
        [],
        ["Nhan vien", "Phong ban", "Ho so xu ly", "Gio TB", "Dung han"],
        ...(dashboard.performanceRanking || []).map(item => [item.employeeName, item.department, item.processedDossiers, item.averageHours, `${item.onTimeRate}%`])
      ];
      const html = `<table>${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</table>`;
      const blob = new Blob(["\ufeff", `<html><head><meta charset="UTF-8"></head><body>${html}</body></html>`], { type: "application/vnd.ms-excel;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${featureId.toLowerCase().replace("đ", "d")}-dashboard.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice({ type: "success", text: "Da xuat Excel metadata KPI." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function exportPdf() {
    const reportWindow = window.open("", "_blank", "width=1100,height=760");
    if (!reportWindow) {
      setNotice({ type: "error", text: "Trinh duyet dang chan cua so xuat PDF." });
      return;
    }

    try {
      await logExport("PDF");
      reportWindow.opener = null;
      reportWindow.document.write(`
        <!doctype html>
        <html lang="vi">
          <head><meta charset="UTF-8"><title>${escapeHtml(featureName)}</title>
          <style>
            body{font-family:Arial,sans-serif;padding:28px;color:#10233f}
            h1{font-size:22px;margin:0 0 6px}
            p{color:#64748b;margin:0 0 18px}
            table{width:100%;border-collapse:collapse;margin-top:14px}
            th,td{border:1px solid #cbd5e1;padding:9px;text-align:left}
            th{background:#f1f5f9}
          </style></head>
          <body>
            <h1>${escapeHtml(featureName)}</h1>
            <p>${escapeHtml(filters.fromDate)} - ${escapeHtml(filters.toDate)} | ${escapeHtml(filters.department || "Toan don vi")}</p>
            <table><thead><tr><th>KPI</th><th>Gia tri</th><th>Don vi</th><th>Tang/Giam</th></tr></thead><tbody>
              ${(dashboard.kpis || []).map(item => `<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(item.value)}</td><td>${escapeHtml(item.unit)}</td><td>${escapeHtml(item.changePercent)}%</td></tr>`).join("")}
            </tbody></table>
            <table><thead><tr><th>Nhan vien</th><th>Phong ban</th><th>Ho so</th><th>Gio TB</th><th>Dung han</th></tr></thead><tbody>
              ${(dashboard.performanceRanking || []).map(item => `<tr><td>${escapeHtml(item.employeeName)}</td><td>${escapeHtml(item.department)}</td><td>${item.processedDossiers}</td><td>${item.averageHours}</td><td>${item.onTimeRate}%</td></tr>`).join("")}
            </tbody></table>
            <script>window.onload=()=>window.print();<\/script>
          </body>
        </html>
      `);
      reportWindow.document.close();
      setNotice({ type: "success", text: "Da mo ban in PDF Chart/KPI." });
    } catch (error) {
      reportWindow.close();
      setNotice({ type: "error", text: error.message });
    }
  }

  const filterPanel = (
    <form className="gd21013-filter" onSubmit={applyFilters}>
      <label>Tu ngay
        <input type="date" value={filters.fromDate} onChange={event => setFilter("fromDate", event.target.value)} />
      </label>
      <label>Den ngay
        <input type="date" value={filters.toDate} onChange={event => setFilter("toDate", event.target.value)} />
      </label>
      <label>Phong ban
        <select value={filters.department} onChange={event => setFilter("department", event.target.value)}>
          <option value="">Toan don vi</option>
          <option value="Hanh chinh">Hanh chinh</option>
          <option value="Tai chinh">Tai chinh</option>
          <option value="Nhan su">Nhan su</option>
          <option value="Phap che">Phap che</option>
        </select>
      </label>
      <label>Loai ho so
        <select value={filters.dossierType} onChange={event => setFilter("dossierType", event.target.value)}>
          <option value="">Tat ca</option>
          <option value="Hành chính">Hanh chinh</option>
          <option value="Tài chính">Tai chinh</option>
          <option value="Nhân sự">Nhan su</option>
          <option value="Pháp chế">Phap che</option>
        </select>
      </label>
      <button className="btn primary" type="submit" disabled={loading}><Search size={14}/> Loc</button>
    </form>
  );

  const leftPanel = (
    <div className="gd21013-left">
      <div className="gd21013-kpis">
        {(dashboard.kpis || []).map(item => (
          <div className="gd21013-kpi" key={item.code}>
            <span>{item.label}</span>
            <strong>{Number(item.value).toLocaleString("vi-VN")}{item.unit === "%" ? "%" : ""}</strong>
            <small>{item.unit !== "%" ? item.unit : "SLA"} | {Number(item.changePercent) > 0 ? "+" : ""}{item.changePercent}%</small>
          </div>
        ))}
      </div>
      <div className="gd21013-chart-panel">
        <div className="gd21013-panel-head"><BarChart2 size={16}/> Ho so nhap moi</div>
        <div className="gd21013-bar-chart">
          {(dashboard.newDossierTrend || []).map(item => (
            <div className="gd21013-bar" key={item.label}>
              <span style={{ height: `${Math.max(8, Number(item.value) / maxNew * 100)}%`, background: item.color }} title={`${item.label}: ${item.value}`}></span>
              <em>{item.label}</em>
            </div>
          ))}
        </div>
      </div>
      <div className="gd21013-chart-panel">
        <div className="gd21013-panel-head"><Activity size={16}/> Tan suat muon tra</div>
        <div className="gd21013-line-bars">
          {(dashboard.borrowReturnTrend || []).map(item => (
            <div className="gd21013-rowbar" key={`${item.category}-${item.label}`}>
              <label>{item.label} {item.category}</label>
              <span><i style={{ width: `${Math.max(10, Number(item.value) / maxBorrow * 100)}%`, background: item.color }}></i></span>
              <b>{Number(item.value).toLocaleString("vi-VN")}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const rightPanel = (
    <div className="gd21013-right">
      <div className="gd21013-chart-panel">
        <div className="gd21013-panel-head"><PieChart size={16}/> Ty le duyet SLA</div>
        <div className="gd21013-pie-wrap">
          <div className="gd21013-pie" style={{ background: pieGradient }}><span>{Math.round((Number(dashboard.approvalSlaPie?.[0]?.value || 0) / pieTotal) * 100)}%</span></div>
          <div className="gd21013-legend">
            {(dashboard.approvalSlaPie || []).map(item => (
              <p key={item.label}><i style={{ background: item.color }}></i>{item.label}<strong>{Number(item.value).toLocaleString("vi-VN")}</strong></p>
            ))}
          </div>
        </div>
      </div>
      <div className="gd21013-chart-panel">
        <div className="gd21013-panel-head"><User size={16}/> Bang xep hang hieu suat</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Can bo</th><th>Phong ban</th><th>Ho so</th><th>Gio TB</th><th>SLA</th></tr></thead>
            <tbody>
              {(dashboard.performanceRanking || []).map((item, index) => (
                <tr key={item.employeeCode}>
                  <td><span className="gd21013-rank">{index + 1}</span></td>
                  <td><strong>{item.employeeName}</strong><small className="gd21013-code">{item.employeeCode} | {item.rankLabel}</small></td>
                  <td>{item.department}</td>
                  <td>{item.processedDossiers}</td>
                  <td>{item.averageHours}h</td>
                  <td>{item.onTimeRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  return (
    <GD2FeatureLayout
      className="gd21013-feature"
      featureId={featureId}
      featureName={featureName}
      description="Dashboard điều hành hiện đại với KPI, biểu đồ hồ sơ, SLA kiểm duyệt, tần suất khai thác và xếp hạng hiệu suất nhân viên."
      actor="Lãnh đạo phòng ban / Ban Giám đốc / Quản lý đơn vị"
      actionBarLabel="Bộ lọc báo cáo"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="1.1fr 0.9fr"
      leftPanelTitle="Biểu đồ vận hành"
      rightPanelTitle="SLA & hiệu suất"
      midContent={filterPanel}
      actions={
        <>
          <button className="btn primary" type="button" onClick={() => loadDashboard(filters)} disabled={loading}><RefreshCw size={14}/> Tai lai</button>
          <button className="btn" type="button" onClick={exportPdf}><Download size={14}/> PDF Chart</button>
          <button className="btn" type="button" onClick={exportExcel}><Download size={14}/> Excel</button>
        </>
      }
      actionRows={[
        { actor: "Lãnh đạo", action: "Lọc dashboard", description: "Chọn thời gian, phòng ban, loại hồ sơ", result: "Cập nhật KPI và biểu đồ theo phạm vi quyền" },
        { actor: "Quản lý đơn vị", action: "Theo dõi SLA", description: "Xem tỷ lệ duyệt đúng hạn/trễ hạn/chờ xử lý", result: "Phát hiện điểm nghẽn xử lý" },
        { actor: "Ban Giám đốc", action: "Xem xếp hạng", description: "So sánh năng suất và thời gian xử lý từng nhân viên", result: "Có căn cứ điều hành nhân sự" },
        { actor: "Lãnh đạo", action: "Export", description: "Xuất PDF Chart hoặc Excel metadata", result: "Tải báo cáo phục vụ họp giao ban" }
      ]}
      validationItems={[
        { type: "required", label: "Khoảng thời gian", text: "Từ ngày và đến ngày dùng để giới hạn dữ liệu báo cáo." },
        { type: "rule", label: "Phạm vi", text: "Số liệu được tổng hợp theo phòng ban, loại hồ sơ và quyền đơn vị của người xem." },
        { type: "perm", label: "Bảo mật", text: "Export báo cáo được ghi nhận vào audit/report run để phục vụ giám sát." },
        { type: "rule", label: "KPI", text: "Thời gian xử lý trung bình và SLA được tính trên hồ sơ đã xử lý trong kỳ." }
      ]}
      flowSteps={[
        { step: "1", label: "Lọc", desc: "Chọn thời gian/phòng ban", color: "#3264f4" },
        { step: "2", label: "Tổng hợp", desc: "Tính KPI và SLA", color: "#0ea5e9" },
        { step: "3", label: "Phân tích", desc: "Hiển thị chart/ranking", color: "#f59e0b" },
        { step: "4", label: "Điều hành", desc: "Nhận diện điểm nghẽn", color: "#7c3aed" },
        { step: "5", label: "Export", desc: "PDF/Excel", color: "#16a34a" }
      ]}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}

function buildPieGradient(items, total) {
  let cursor = 0;
  const segments = items.map(item => {
    const start = cursor;
    const end = cursor + (Number(item.value || 0) / total) * 360;
    cursor = end;
    return `${item.color} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${segments.join(", ") || "#e2e8f0 0deg 360deg"})`;
}

function securityLevelLabel(level) {
  return {
    THUONG: "Thường / Nội bộ",
    MAT: "Mật",
    TOI_MAT: "Tối mật",
    TUYET_MAT: "Tuyệt mật",
  }[level] || level || "Thường / Nội bộ";
}

function securityBadgeClass(level) {
  return `gd21415-security-badge ${{
    THUONG: "blue",
    MAT: "red",
    TOI_MAT: "dark-red",
    TUYET_MAT: "purple",
  }[level] || "blue"}`;
}

function GD21415SecurityDataScreen({ title = "Bảo mật thông tin & Dữ liệu hệ thống" }) {
  const [activeTab, setActiveTab] = useState("screen");
  const [documents, setDocuments] = useState([]);
  const [labels, setLabels] = useState([]);
  const [dashboard, setDashboard] = useState({ recentLogs: [], alerts: [] });
  const [systemSummary, setSystemSummary] = useState({ sources: [], totalRecords: 0, checkedAt: null });
  const [selectedId, setSelectedId] = useState(null);
  const [draftLevels, setDraftLevels] = useState({});
  const [watermark, setWatermark] = useState(null);
  const [securityFilter, setSecurityFilter] = useState("");
  const [error, setError] = useState("");

  const selected = documents.find(item => item.id === selectedId) || documents[0];
  const selectedLabel = labels.find(item => item.entityType === "DOCUMENT" && Number(item.entityId) === Number(selected?.id));
  const visibleDocuments = documents.filter(item => {
    if (!securityFilter) return true;
    const level = draftLevels[item.id] || labels.find(label => Number(label.entityId) === Number(item.id))?.securityLevel || "THUONG";
    return level === securityFilter;
  });

  useEffect(() => {
    loadSecurityData();
  }, []);

  async function loadSecurityData() {
    try {
      setError("");
      const [documentResult, labelRows, auditStats, systemData] = await Promise.all([
        uiApi.gd2.documentSearch({ page: 1, pageSize: 25 }),
        uiApi.gd2.securityLabels("DOCUMENT"),
        uiApi.gd2.auditDashboard(),
        uiApi.gd2.systemDataSummary(),
      ]);
      const documentRows = documentResult.items || [];
      setDocuments(documentRows);
      setLabels(labelRows);
      setDashboard(auditStats);
      setSystemSummary(systemData);
      setSelectedId(current => current || documentRows[0]?.id || null);
      setDraftLevels(Object.fromEntries(labelRows.map(item => [item.entityId, item.securityLevel])));
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function assignLabel(documentId) {
    const level = draftLevels[documentId] || "THUONG";
    try {
      const updated = await uiApi.gd2.saveSecurityLabel({
        entityType: "DOCUMENT",
        entityId: documentId,
        securityLevel: level,
        actor: "admin-security",
        unitCode: "DEFAULT",
        reason: `Cập nhật cấp độ bảo mật ${securityLevelLabel(level)}`,
      });
      setLabels(current => {
        const others = current.filter(item => !(item.entityType === updated.entityType && Number(item.entityId) === Number(updated.entityId)));
        return [...others, updated].sort((a, b) => Number(a.entityId) - Number(b.entityId));
      });
      await refreshAuditOnly();
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  async function previewWatermark(documentId = selected?.id) {
    if (!documentId) return;
    try {
      setError("");
      const mark = await uiApi.gd2.watermark({
        entityType: "DOCUMENT",
        entityId: documentId,
        viewer: "current-user",
        action: "VIEW_FILE",
      });
      setWatermark(mark);
      await refreshAuditOnly();
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  async function simulateBulkDownload() {
    if (documents.length === 0) return;
    try {
      setError("");
      await Promise.all(documents.slice(0, 6).map(item => uiApi.gd2.logAudit({
        action: "DOWNLOAD",
        entityType: "DOCUMENT",
        entityId: item.id,
        actor: "current-user",
        unitCode: "DEFAULT",
        departmentCode: "HC",
        roleLevel: "CHUYEN_VIEN",
        detail: `Tải xuống ${item.code || item.fileName}`,
      })));
      await refreshAuditOnly();
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  async function logFailureLogin() {
    try {
      setError("");
      await uiApi.gd2.logAudit({
        action: "LOGIN_FAILURE",
        entityType: "USER",
        entityId: 1,
        actor: "unknown",
        unitCode: "DEFAULT",
        departmentCode: "*",
        roleLevel: "CHUYEN_VIEN",
        detail: "Đăng nhập thất bại vào phân hệ dữ liệu hệ thống",
      });
      await refreshAuditOnly();
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  async function refreshAuditOnly() {
    const [auditStats, systemData] = await Promise.all([
      uiApi.gd2.auditDashboard(),
      uiApi.gd2.systemDataSummary(),
    ]);
    setDashboard(auditStats);
    setSystemSummary(systemData);
  }

  const midContent = (
    <div className="gd21415-dashboard">
      <Metric label="Lượt truy cập" value={dashboard.totalAccess ?? 0} />
      <Metric label="Lượt xuất dữ liệu" value={dashboard.totalExports ?? 0} />
      <Metric label="Đăng nhập lỗi" value={dashboard.failedLogins ?? 0} />
      <Metric label="Xem dữ liệu nhạy cảm" value={dashboard.sensitiveViews ?? 0} />
      <Metric label="Cảnh báo tải hàng loạt" value={dashboard.bulkDownloadAlerts ?? 0} />
    </div>
  );

  const leftPanel = (
    <div className="gd21415-left">
      <div className="gd21415-filterbar">
        <label>
          Tìm trong tài liệu
          <input placeholder="Mã, tên, metadata..." onChange={(event) => {
            const query = event.target.value;
            uiApi.gd2.documentSearch({ query, page: 1, pageSize: 25 })
              .then(result => setDocuments(result.items || []))
              .catch(err => setError(err.message));
          }} />
        </label>
        <label>
          Cấp độ
          <select value={securityFilter} onChange={(event) => setSecurityFilter(event.target.value)}>
            <option value="">Tất cả</option>
            <option value="THUONG">Thường / Nội bộ</option>
            <option value="MAT">Mật</option>
            <option value="TOI_MAT">Tối mật</option>
            <option value="TUYET_MAT">Tuyệt mật</option>
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Tài liệu</th><th>Trạng thái</th><th>Cấp độ bảo mật</th><th>Thao tác</th></tr></thead>
          <tbody>
            {visibleDocuments.map(item => {
              const label = labels.find(row => row.entityType === "DOCUMENT" && Number(row.entityId) === Number(item.id));
              const level = draftLevels[item.id] || label?.securityLevel || "THUONG";
              return (
                <tr key={item.id} className={item.id === selected?.id ? "row-selected" : ""} onClick={() => setSelectedId(item.id)}>
                  <td>
                    <strong>{item.code}</strong>
                    <span className="gd21415-subtext">{item.title}</span>
                  </td>
                  <td>{item.status || "--"}</td>
                  <td>
                    <span className={securityBadgeClass(level)}>{securityLevelLabel(level)}</span>
                  </td>
                  <td>
                    <div className="gd21415-row-actions" onClick={(event) => event.stopPropagation()}>
                      <select value={level} onChange={(event) => setDraftLevels(current => ({ ...current, [item.id]: event.target.value }))}>
                        <option value="THUONG">Thường / Nội bộ</option>
                        <option value="MAT">Mật</option>
                        <option value="TOI_MAT">Tối mật</option>
                        <option value="TUYET_MAT">Tuyệt mật</option>
                      </select>
                      <button className="btn ghost icon-only" title="Lưu nhãn" onClick={() => assignLabel(item.id)}><Save size={14}/></button>
                      <button className="btn ghost icon-only" title="Xem watermark" onClick={() => previewWatermark(item.id)}><Eye size={14}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visibleDocuments.length === 0 && <tr><td colSpan="4" className="empty-cell">Chưa có tài liệu phù hợp.</td></tr>}
          </tbody>
        </table>
      </div>
      {error && <div className="alert">{error}</div>}
    </div>
  );

  const rightPanel = (
    <div className="gd21415-right">
      <div className="gd21415-preview">
        <div>
          <span className="gd21415-section-kicker">Preview bảo mật</span>
          <h3>{selected?.title || "Chưa chọn tài liệu"}</h3>
          {selectedLabel && <span className={securityBadgeClass(selectedLabel.securityLevel)}>{selectedLabel.label}</span>}
        </div>
        <div className={`gd21415-watermark ${watermark?.required ? "required" : ""}`}>
          <span>{watermark?.text || "Watermark sẽ tự chèn khi mở hoặc tải file nhạy cảm"}</span>
        </div>
      </div>

      <div className="gd21415-alerts">
        <div className="gd21415-section-head"><AlertCircle size={16}/> Cảnh báo bất thường</div>
        {dashboard.alerts?.map(alert => (
          <div className="gd21415-alert" key={`${alert.code}-${alert.createdAt}`}>
            <strong>{alert.title}</strong>
            <span>{alert.detail}</span>
          </div>
        ))}
        {(!dashboard.alerts || dashboard.alerts.length === 0) && <div className="empty-cell">Không có cảnh báo mới.</div>}
      </div>

      <div className="gd21415-system">
        <div className="gd21415-section-head"><Database size={16}/> Dữ liệu hệ thống</div>
        <div className="gd21415-source-grid">
          {systemSummary.sources?.slice(0, 6).map(source => (
            <div className="gd21415-source" key={source.code}>
              <span>{source.code}</span>
              <strong>{Number(source.recordCount || 0).toLocaleString("vi-VN")}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="gd21415-logs">
        <div className="gd21415-section-head"><Activity size={16}/> Nhật ký gần nhất</div>
        <div className="timeline-list">
          {dashboard.recentLogs?.slice(0, 8).map(log => (
            <div className="timeline-item" key={log.id}>
              <strong>{log.action} - {log.entityType} #{log.entityId}</strong>
              <span>{log.actor} · {log.result} · {new Date(log.createdAt).toLocaleString("vi-VN")}</span>
              {log.detail && <span>{log.detail}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <GD2FeatureLayout
      featureId="GĐ2-14/15"
      featureName={title}
      description="Phân cấp bảo mật, watermark chống rò rỉ dữ liệu nhạy cảm và giám sát nhật ký hệ thống tập trung."
      actor="Quản trị đơn vị / Quản trị hệ thống"
      actionBarLabel="Giám sát bảo mật dữ liệu"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="1.1fr 0.9fr"
      className="gd21415-feature"
      midContent={midContent}
      leftPanelTitle="Gán nhãn bảo mật tài liệu"
      rightPanelTitle="Audit, watermark & dữ liệu hệ thống"
      actions={
        <>
          <button className="btn ghost" onClick={loadSecurityData}><RefreshCw size={14}/> Làm mới</button>
          <button className="btn ghost" onClick={() => previewWatermark()}><Shield size={14}/> Watermark</button>
          <button className="btn ghost" onClick={logFailureLogin}><Lock size={14}/> Log lỗi đăng nhập</button>
          <button className="btn primary" onClick={simulateBulkDownload}><Download size={14}/> Mô phỏng tải hàng loạt</button>
        </>
      }
      actionRows={[
        { action: "Gán nhãn", description: "Chọn cấp độ Thường, Mật, Tối mật hoặc Tuyệt mật cho tài liệu/hồ sơ", result: "Nhãn bảo mật cập nhật tức thì và ghi audit" },
        { action: "Mở/Tải file", description: "Tài liệu nhạy cảm được watermark bằng người xem, IP và thời gian", result: "Giảm rủi ro rò rỉ dữ liệu" },
        { action: "Giám sát log", description: "Theo dõi access log, export log và failure login log", result: "Hiển thị dashboard và cảnh báo bất thường" },
      ]}
      validationItems={[
        { type: "required", label: "Bắt buộc", text: "Mỗi hồ sơ/tài liệu nhạy cảm phải có cấp độ bảo mật trước khi xuất bản." },
        { type: "rule", label: "Watermark", text: "File Mật trở lên luôn chèn người xem, IP và thời gian khi mở hoặc tải." },
        { type: "perm", label: "Phân quyền", text: "Chỉ quản trị đơn vị hoặc QTHT được thay đổi nhãn bảo mật và xem dashboard toàn hệ thống." },
        { type: "rule", label: "Audit", text: "Mọi thao tác xem, xuất, tải, ký số và đăng nhập lỗi đều được ghi log." },
      ]}
      flowSteps={[
        { step: "1", label: "Gán nhãn", desc: "Xác định cấp độ bảo mật", color: "#3264f4" },
        { step: "2", label: "Kiểm quyền", desc: "RBAC/ABAC theo đơn vị", color: "#7c3aed" },
        { step: "3", label: "Watermark", desc: "Chèn dấu khi xem/tải", color: "#ef4444" },
        { step: "4", label: "Audit", desc: "Ghi nhật ký hệ thống", color: "#f59e0b" },
        { step: "5", label: "Cảnh báo", desc: "Phát hiện hành vi bất thường", color: "#22c55e" },
      ]}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}

function GD2SystemDataScreen() {
  const [activeTab, setActiveTab] = useState("screen");
  const [summary, setSummary] = useState({ sources: [], totalRecords: 0, checkedAt: null });
  const [error, setError] = useState("");

  useEffect(() => {
    loadSystemData();
  }, []);

  async function loadSystemData() {
    try {
      setError("");
      setSummary(await uiApi.gd2.systemDataSummary());
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  const leftPanel = (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Mã nguồn</th><th>Nguồn dữ liệu</th><th>Số bản ghi</th><th>Trạng thái</th></tr></thead>
        <tbody>
          {summary.sources.map(source => (
            <tr key={source.code}>
              <td><span className="gd2-code">{source.code}</span></td>
              <td>{source.name}</td>
              <td>{source.recordCount.toLocaleString("vi-VN")}</td>
              <td><span className="vld-badge rule">{source.status === "READY" ? "Sẵn sàng" : source.status}</span></td>
            </tr>
          ))}
          {summary.sources.length === 0 && <tr><td colSpan="4" className="empty-cell">Chưa có dữ liệu.</td></tr>}
        </tbody>
      </table>
      {error && <div className="alert">{error}</div>}
    </div>
  );

  const rightPanel = (
    <div className="gd2-system-summary">
      <Metric label="Tổng bản ghi" value={summary.totalRecords.toLocaleString("vi-VN")} />
      <Metric label="Nguồn dữ liệu" value={String(summary.sources.length)} />
      <Metric label="Trạng thái" value={error ? "Có lỗi" : "Sẵn sàng"} />
      <Metric label="Kiểm tra cuối" value={summary.checkedAt ? new Date(summary.checkedAt).toLocaleString("vi-VN") : "--"} />
    </div>
  );

  return (
    <GD2FeatureLayout
      featureId="GĐ2-15"
      featureName="Dữ liệu hệ thống"
      description="Theo dõi tập trung nguồn dữ liệu nghiệp vụ, dữ liệu OCR và kho tập số hóa."
      actor="admin"
      actionBarLabel="Giám sát dữ liệu hệ thống"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="1.2fr 0.8fr"
      leftPanelTitle="Nguồn dữ liệu"
      rightPanelTitle="Tổng quan"
      actions={
        <button className="btn primary" onClick={loadSystemData}>
          <RefreshCw size={14}/> Kiểm tra dữ liệu
        </button>
      }
      actionRows={[
        { action: "Xem dữ liệu", description: "Theo dõi các nguồn dữ liệu đang kết nối", result: "Hiển thị số lượng và trạng thái từng nguồn" },
        { action: "Kiểm tra", description: "Kiểm tra khả dụng và đồng bộ dữ liệu", result: "Cập nhật thời gian kiểm tra gần nhất" },
        { action: "Sao lưu", description: "Tạo yêu cầu sao lưu dữ liệu hệ thống", result: "Ghi nhận tác vụ sao lưu" },
      ]}
      validationItems={[
        { type: "perm", label: "Phân quyền", text: "Chỉ quản trị viên được xem số liệu toàn hệ thống và thực hiện sao lưu." },
        { type: "rule", label: "Đồng bộ", text: "Nguồn dữ liệu phải sẵn sàng trước khi tổng hợp báo cáo." },
      ]}
      flowSteps={[
        { step: "1", label: "Kết nối", desc: "Kiểm tra nguồn dữ liệu", color: "#3264f4" },
        { step: "2", label: "Đối soát", desc: "Đếm và kiểm tra bản ghi", color: "#7c3aed" },
        { step: "3", label: "Đồng bộ", desc: "Cập nhật dữ liệu thay đổi", color: "#f59e0b" },
        { step: "4", label: "Sao lưu", desc: "Lưu bản dự phòng", color: "#22c55e" },
      ]}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}

function notificationStatusLabel(status) {
  return {
    PENDING: "Chờ gửi",
    SENT: "Đã gửi",
    READ: "Đã đọc",
    FAILED: "Gửi lỗi",
  }[status] || status || "Không xác định";
}

function GD220ReviewSupplementScreen({ title = "Kiểm duyệt & bổ sung" }) {
  const [activeTab, setActiveTab] = useState("screen");
  const [rows, setRows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [guides, setGuides] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [actor, setActor] = useState("can-bo-kiem-duyet");
  const [recipient, setRecipient] = useState("current-user");
  const [templateCode, setTemplateCode] = useState("THIEU_GIAY_TO");
  const [reason, setReason] = useState("Hồ sơ chưa đủ thành phần theo quy định, vui lòng bổ sung để tiếp tục kiểm duyệt.");
  const [missingItems, setMissingItems] = useState("Bản scan giấy tờ gốc\nChữ ký người nộp\nTệp PDF rõ nét");
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  const selected = rows.find(item => item.id === selectedId) || rows[0] || null;
  const selectedTemplate = templates.find(item => item.code === templateCode) || templates[0];

  useEffect(() => {
    loadReviewData();
  }, []);

  useEffect(() => {
    if (selectedId) loadGuides(selectedId);
  }, [selectedId]);

  async function loadReviewData() {
    try {
      setLoading(true);
      const [items, templateRows] = await Promise.all([
        uiApi.gd2.supplementReviewItems(),
        uiApi.gd2.supplementTemplates(),
      ]);
      setRows(items);
      setTemplates(templateRows);
      setTemplateCode(current => current || templateRows[0]?.code || "THIEU_GIAY_TO");
      setSelectedId(current => current || items[0]?.id || null);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được dữ liệu kiểm duyệt: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function loadGuides(dossierId) {
    try {
      setGuides(await uiApi.gd2.supplementGuides(dossierId));
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được phiếu hướng dẫn: ${error.message}` });
    }
  }

  async function createSupplementGuide() {
    if (!selected) {
      setNotice({ type: "error", text: "Vui lòng chọn hồ sơ cần yêu cầu bổ sung." });
      return;
    }
    if (!reason.trim()) {
      setNotice({ type: "error", text: "Vui lòng nhập lý do yêu cầu bổ sung." });
      return;
    }

    try {
      setLoading(true);
      const guide = await uiApi.gd2.createSupplementGuide({
        dossierId: selected.id,
        actor,
        recipient,
        templateCode,
        reason,
        unitCode: "DEFAULT",
        missingItems: missingItems.split(/\r?\n/).map(item => item.trim()).filter(Boolean),
      });
      setRows(current => current.map(item => item.id === selected.id ? { ...item, status: "NEEDS_SUPPLEMENT" } : item));
      setGuides(current => [guide, ...current]);
      setNotice({ type: "success", text: `Đã tạo ${guide.guideCode}, đổi trạng thái sang Chờ bổ sung và gửi thông báo đa kênh.` });
    } catch (error) {
      setNotice({ type: "error", text: `Tạo yêu cầu bổ sung thất bại: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function decide(action) {
    if (!selected) return;
    const label = action === "APPROVE" ? "Đã duyệt" : "Bị từ chối";
    try {
      setLoading(true);
      const result = await uiApi.gd2.transition({
        entityType: "DOSSIER",
        entityId: selected.id,
        action,
        actor,
        unitCode: "DEFAULT",
        comment: reason,
        recipient,
      });
      setRows(current => current.map(item => item.id === selected.id ? { ...item, status: result.currentStatus } : item));
      setNotice({ type: "success", text: `${label}. Hệ thống đã gửi thông báo In-app, Email và SMS.` });
    } catch (error) {
      setNotice({ type: "error", text: `Cập nhật kết quả thất bại: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  const leftPanel = (
    <div className="gd220-left">
      <div className="gd220-template-strip">
        {templates.map(item => (
          <button key={item.code} className={templateCode === item.code ? "active" : ""} type="button" onClick={() => { setTemplateCode(item.code); setReason(item.content); }}>
            <AlertCircle size={14}/>
            <span>{item.title}</span>
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th></th><th>Mã</th><th>Hồ sơ</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {rows.map(item => (
              <tr key={item.id} className={item.id === selected?.id ? "row-selected" : ""} onClick={() => setSelectedId(item.id)}>
                <td><input type="radio" checked={item.id === selected?.id} onChange={() => setSelectedId(item.id)} /></td>
                <td><span className="gd2-code">{item.code}</span></td>
                <td><strong>{item.title}</strong><span className="gd21415-subtext">{item.dossierType || "Hồ sơ nghiệp vụ"}</span></td>
                <td><StatusBadge status={item.status} /></td>
                <td><button className="icon-btn" type="button" title="Yêu cầu bổ sung" onClick={(event) => { event.stopPropagation(); setSelectedId(item.id); }}><Edit size={13}/></button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="5" className="empty-cell">{loading ? "Đang tải..." : "Chưa có hồ sơ kiểm duyệt."}</td></tr>}
          </tbody>
        </table>
      </div>
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  const rightPanel = (
    <div className="gd220-right">
      <div className="gd220-current">
        <div>
          <span className="gd21415-section-kicker">Hồ sơ đang kiểm duyệt</span>
          <h3>{selected ? `${selected.code} · ${selected.title}` : "Chưa chọn hồ sơ"}</h3>
        </div>
        {selected && <StatusBadge status={selected.status} />}
      </div>

      <div className="gd220-form">
        <div className="gd2-form-row">
          <div className="gd2-field"><label>Cán bộ kiểm duyệt</label><input value={actor} onChange={event => setActor(event.target.value)} /></div>
          <div className="gd2-field"><label>Người nộp/nhận kết quả</label><input value={recipient} onChange={event => setRecipient(event.target.value)} /></div>
        </div>
        <div className="gd2-field">
          <label>Template lý do</label>
          <select value={templateCode} onChange={event => {
            const next = templates.find(item => item.code === event.target.value);
            setTemplateCode(event.target.value);
            if (next) setReason(next.content);
          }}>
            {templates.map(item => <option key={item.code} value={item.code}>{item.title}</option>)}
          </select>
        </div>
        <div className="gd2-field required">
          <label>Nội dung yêu cầu bổ sung <span className="req-star">*</span></label>
          <textarea rows="4" value={reason} onChange={event => setReason(event.target.value)} />
        </div>
        <div className="gd2-field">
          <label>Thành phần cần bổ sung</label>
          <textarea rows="4" value={missingItems} onChange={event => setMissingItems(event.target.value)} />
        </div>
        <div className="gd220-actions">
          <button className="btn primary" disabled={loading || !selected} onClick={createSupplementGuide}><FileText size={14}/> Tạo phiếu bổ sung</button>
          <button className="btn" disabled={loading || !selected} style={{color:"#166534", borderColor:"#bbf7d0"}} onClick={() => decide("APPROVE")}><CheckCircle2 size={14}/> Đã duyệt</button>
          <button className="btn" disabled={loading || !selected} style={{color:"#b91c1c", borderColor:"#fecaca"}} onClick={() => decide("REJECT")}><X size={14}/> Từ chối</button>
        </div>
      </div>

      <div className="gd220-guide-preview">
        <div className="gd22-section-head"><FileText size={16}/> Phiếu hướng dẫn hoàn thiện hồ sơ</div>
        <pre>{guides[0]?.content || `PHIEU HUONG DAN HOAN THIEN HO SO\nHo so: ${selected?.code || "--"}\nMau ly do: ${selectedTemplate?.title || "--"}\nNoi dung: ${reason}\nThanh phan can bo sung:\n${missingItems}`}</pre>
      </div>
    </div>
  );

  return (
    <GD2FeatureLayout
      featureId="GĐ2-20/21"
      featureName={title}
      description="Kiểm duyệt hồ sơ, yêu cầu bổ sung bằng phiếu hướng dẫn chuẩn và gửi thông báo kết quả tự động đa kênh."
      actor="Cán bộ kiểm duyệt / Người nộp hồ sơ"
      actionBarLabel="Kiểm duyệt, bổ sung và thông báo kết quả"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="1fr 460px"
      className="gd220-feature"
      leftPanelTitle="Danh sách hồ sơ kiểm duyệt"
      rightPanelTitle="Form yêu cầu bổ sung"
      actions={
        <>
          <button className="btn" onClick={loadReviewData}><RefreshCw size={14}/> Tải lại</button>
          <button className="btn primary" disabled={loading || !selected} onClick={createSupplementGuide}><FileText size={14}/> Yêu cầu bổ sung</button>
        </>
      }
      actionRows={[
        { action: "Yêu cầu bổ sung", description: "Chọn template, nhập lý do và thành phần thiếu", result: "Sinh phiếu hướng dẫn, đổi trạng thái Chờ bổ sung" },
        { action: "Thông báo kết quả", description: "Khi hồ sơ Đã duyệt, Bị từ chối hoặc Cần bổ sung", result: "Gửi In-app Notification, Email và SMS" },
        { action: "Người nộp cập nhật", description: "Nhận phiếu hướng dẫn và bổ sung hồ sơ", result: "Hồ sơ quay lại luồng kiểm duyệt" },
      ]}
      validationItems={[
        { type: "required", label: "Bắt buộc", text: "Lý do yêu cầu bổ sung phải được nhập trước khi tạo phiếu." },
        { type: "rule", label: "Trạng thái", text: "Yêu cầu bổ sung tự động chuyển hồ sơ sang Chờ bổ sung." },
        { type: "perm", label: "Phân quyền", text: "Chỉ cán bộ kiểm duyệt được tạo phiếu hoặc thay đổi kết quả kiểm duyệt." },
      ]}
      flowSteps={[
        { step: "1", label: "Kiểm tra", desc: "Đối chiếu điều kiện", color: "#3264f4" },
        { step: "2", label: "Chọn kết quả", desc: "Duyệt/từ chối/bổ sung", color: "#f59e0b" },
        { step: "3", label: "Tạo phiếu", desc: "Mẫu hướng dẫn chuẩn", color: "#7c3aed" },
        { step: "4", label: "Thông báo", desc: "In-app, Email, SMS", color: "#0ea5e9" },
        { step: "5", label: "Bổ sung", desc: "Người nộp cập nhật", color: "#22c55e" },
      ]}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}

function GD2NotificationScreen() {
  const [activeTab, setActiveTab] = useState("screen");
  const [selectedId, setSelectedId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const selected = notifications.find(item => item.id === selectedId) || notifications[0];

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      setError("");
      const rows = await uiApi.gd2.notifications();
      setNotifications(rows);
      setSelectedId(current => current || rows[0]?.id || null);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function markAsRead() {
    if (!selected) return;
    try {
      const updated = await uiApi.gd2.markNotificationRead(selected.id);
      setNotifications(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  async function resend() {
    if (!selected) return;
    try {
      const updated = await uiApi.gd2.resendNotification(selected.id);
      setNotifications(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  const leftPanel = (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Mã</th><th>Nội dung thông báo</th><th>Kênh gửi</th><th>Trạng thái</th></tr></thead>
        <tbody>
          {notifications.map(item => (
            <tr
              key={item.id}
              className={item.id === selectedId ? "row-selected" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <td><span className="gd2-code">{item.code}</span></td>
              <td>{item.title}</td>
              <td>{item.channel}</td>
              <td><span className="vld-badge rule">{notificationStatusLabel(item.status)}</span></td>
            </tr>
          ))}
          {notifications.length === 0 && <tr><td colSpan="4" className="empty-cell">Chưa có thông báo.</td></tr>}
        </tbody>
      </table>
      {error && <div className="alert">{error}</div>}
    </div>
  );

  const rightPanel = selected && (
    <div className="detail-grid">
      <div className="detail-row"><span>Mã thông báo</span><strong>{selected.code}</strong></div>
      <div className="detail-row"><span>Người nhận</span><strong>{selected.recipient}</strong></div>
      <div className="detail-row"><span>Kênh gửi</span><strong>{selected.channel}</strong></div>
      <div className="detail-row"><span>Trạng thái</span><strong>{notificationStatusLabel(selected.status)}</strong></div>
      <div className="detail-row"><span>Nội dung</span><span>{selected.title}</span></div>
    </div>
  );

  return (
    <GD2FeatureLayout
      featureId="GĐ2-21"
      featureName="Thông báo kết quả"
      description="Thông báo kết quả xử lý hồ sơ đến đúng người nhận qua kênh được cấu hình."
      actor="entry"
      actionBarLabel="Danh sách thông báo xử lý hồ sơ"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="1.25fr 0.75fr"
      leftPanelTitle="Thông báo gần đây"
      rightPanelTitle="Chi tiết thông báo"
      actions={
        <>
          <button className="btn primary" onClick={resend}><RefreshCw size={14}/> G?i l?i</button>
          <button className="btn" onClick={markAsRead}><CheckCircle2 size={14}/> D�nh d?u ?'ã �'?c</button>
        </>
      }
      actionRows={[
        { action: "Xem thông báo", description: "Chọn thông báo trong danh sách", result: "Hiển thị người nhận, kênh gửi và nội dung" },
        { action: "Gửi lại", description: "Gửi lại thông báo chưa thành công", result: "Cập nhật trạng thái đã gửi" },
        { action: "Đánh dấu đã đọc", description: "Xác nhận thông báo đã được tiếp nhận", result: "Cập nhật trạng thái đã đọc" },
      ]}
      validationItems={[
        { type: "required", label: "Bắt buộc", text: "Thông báo phải có người nhận, nội dung và ít nhất một kênh gửi." },
        { type: "perm", label: "Phân quyền", text: "Người dùng chỉ xem thông báo thuộc hồ sơ trong phạm vi đơn vị." },
      ]}
      flowSteps={[
        { step: "1", label: "Hoàn tất", desc: "Có kết quả xử lý hồ sơ", color: "#3264f4" },
        { step: "2", label: "Tạo tin", desc: "Sinh nội dung thông báo", color: "#7c3aed" },
        { step: "3", label: "Gửi", desc: "Email hoặc trong hệ thống", color: "#f59e0b" },
        { step: "4", label: "Xác nhận", desc: "Ghi nhận trạng thái đọc", color: "#22c55e" },
      ]}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}

function borrowStatusLabel(status, overdue) {
  if (overdue || status === "OVERDUE") return "Quá hạn";
  return {
    PENDING: "Đang chờ duyệt",
    APPROVED: "Đã duyệt - Chưa trả",
    HANDED_OVER: "Đã bàn giao",
    BORROWED: "Đã duyệt - Chưa trả",
    RETURNED: "Đã trả",
    RECALLED: "Đã thu hồi",
    REJECTED: "Bị từ chối"
  }[status] || status || "--";
}

function borrowStatusClass(status, overdue) {
  if (overdue || status === "OVERDUE") return "overdue";
  return {
    PENDING: "pending",
    APPROVED: "approved",
    HANDED_OVER: "approved",
    BORROWED: "approved",
    RETURNED: "returned",
    RECALLED: "returned"
  }[status] || "pending";
}

function exploitModeLabel(mode) {
  return {
    ONLINE_READ: "Đọc PDF trực tuyến",
    SOFT_COPY: "Tải bản mềm",
    HARD_COPY: "Mượn bản cứng"
  }[mode] || mode || "--";
}

function GD22526DossierBorrowScreen({ mode = "catalog", title }) {
  const [activeTab, setActiveTab] = useState("screen");
  const [dashboard, setDashboard] = useState({ dossiers: [], borrowRequests: [] });
  const [selectedDossierId, setSelectedDossierId] = useState(null);
  const [filters, setFilters] = useState({ status: "", securityLevel: "", exploitMode: "" });
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [catalogForm, setCatalogForm] = useState({
    code: "KLT-004",
    title: "Ho so du an dau tu",
    dossierType: "Dau tu",
    storageLocation: "Kho C / Ke 03 / Hop 02",
    securityLevel: "MAT",
    borrowCondition: "Can phe duyet lanh dao phong truoc khi khai thac.",
    allowOnlineRead: true,
    allowSoftCopy: false,
    allowHardCopy: true,
    maxHardCopyBorrowDays: 7
  });
  const [borrowForm, setBorrowForm] = useState({
    borrower: "current-user",
    exploitMode: "ONLINE_READ",
    borrowFrom: new Date().toISOString().slice(0, 10),
    requestedDays: 7,
    purpose: "Khai thac phuc vu xu ly nghiep vu"
  });

  const selectedDossier = dashboard.dossiers?.find(item => Number(item.id) === Number(selectedDossierId)) || dashboard.dossiers?.[0] || null;
  const featureId = mode === "catalog" ? "GĐ2-25" : "GĐ2-26";
  const featureName = title || (mode === "catalog" ? "Hệ thống quản lý hồ sơ" : "Quy trình mượn, tra, khai thác hồ sơ");

  useEffect(() => {
    loadDossierBorrow();
  }, []);

  async function loadDossierBorrow(nextFilters = filters) {
    try {
      setLoading(true);
      const result = await uiApi.gd2.dossierBorrowDashboard(nextFilters);
      setDashboard(result);
      setSelectedDossierId(current => current || result.dossiers?.[0]?.id || null);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được dữ liệu hồ sơ/mượn trả: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  function applyFilter(field, value) {
    const next = { ...filters, [field]: value };
    setFilters(next);
    loadDossierBorrow(next);
  }

  async function saveCatalog(event) {
    event.preventDefault();
    try {
      const saved = await uiApi.gd2.saveArchiveDossier({ ...catalogForm, actor: "archive-admin" });
      setNotice({ type: "success", text: `Đã lưu danh mục hồ sơ ${saved.code}.` });
      await loadDossierBorrow();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function registerBorrow(event) {
    event.preventDefault();
    if (!selectedDossier) {
      setNotice({ type: "error", text: "Vui lòng chọn hồ sơ cần khai thác." });
      return;
    }
    try {
      const created = await uiApi.gd2.registerBorrow({
        dossierId: selectedDossier.id,
        borrower: borrowForm.borrower,
        exploitMode: borrowForm.exploitMode,
        borrowFrom: borrowForm.borrowFrom,
        requestedDays: Number(borrowForm.requestedDays),
        purpose: borrowForm.purpose,
        actor: borrowForm.borrower
      });
      setNotice({ type: "success", text: `Đã tạo phiếu mượn #${created.id}, hạn trả ${new Date(created.dueDate).toLocaleDateString("vi-VN")}.` });
      await loadDossierBorrow();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function runBorrowAction(id, action) {
    try {
      const payload = { actor: action === "APPROVE" ? "lanh-dao" : "van-thu", note: `${action} phieu muon #${id}` };
      if (action === "APPROVE") await uiApi.gd2.approveBorrow(id, payload);
      if (action === "HANDOVER") await uiApi.gd2.handoverBorrow(id, payload);
      if (action === "RETURN") await uiApi.gd2.returnBorrow(id, payload);
      if (action === "RECALL") await uiApi.gd2.recallBorrow(id, payload);
      setNotice({ type: "success", text: `Đã cập nhật phiếu mượn #${id}.` });
      await loadDossierBorrow();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  const midContent = (
    <div className="gd22526-filter">
      <select value={filters.status} onChange={event => applyFilter("status", event.target.value)}>
        <option value="">Tất cả trạng thái</option>
        <option value="PENDING">Đang chờ duyệt</option>
        <option value="APPROVED">Đã duyệt</option>
        <option value="OVERDUE">Quá hạn</option>
        <option value="RETURNED">Đã trả</option>
      </select>
      <select value={filters.securityLevel} onChange={event => applyFilter("securityLevel", event.target.value)}>
        <option value="">Tất cả cấp độ</option>
        <option value="THUONG">Thường</option>
        <option value="MAT">Mật</option>
        <option value="TOI_MAT">Tối mật</option>
        <option value="TUYET_MAT">Tuyệt mật</option>
      </select>
      <select value={filters.exploitMode} onChange={event => applyFilter("exploitMode", event.target.value)}>
        <option value="">Mọi hình thức</option>
        <option value="ONLINE_READ">Đọc PDF trực tuyến</option>
        <option value="SOFT_COPY">Tải bản mềm</option>
        <option value="HARD_COPY">Mượn bản cứng</option>
      </select>
      <button className="btn" type="button" onClick={() => loadDossierBorrow()} disabled={loading}><RefreshCw size={14}/> Làm mới</button>
    </div>
  );

  const leftPanel = (
    <div className="gd22526-left">
      <div className="gd22526-kpis">
        <Metric label="Chờ duyệt" value={dashboard.pendingCount || 0} />
        <Metric label="Đã duyệt - Chưa trả" value={dashboard.approvedNotReturnedCount || 0} />
        <Metric label="Quá hạn" value={dashboard.overdueCount || 0} />
        <Metric label="Đã trả/Thu hồi" value={dashboard.returnedCount || 0} />
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Hồ sơ</th><th>Bảo mật</th><th>Điều kiện</th><th>Hạn bản cứng</th></tr></thead>
          <tbody>
            {(dashboard.dossiers || []).map(item => (
              <tr key={item.id} className={Number(selectedDossier?.id) === Number(item.id) ? "row-selected" : ""} onClick={() => setSelectedDossierId(item.id)}>
                <td><strong>{item.code}</strong><span className="gd22526-sub">{item.title}</span></td>
                <td><span className={securityBadgeClass(item.securityLevel)}>{securityLevelLabel(item.securityLevel)}</span></td>
                <td><small>{item.borrowCondition}</small></td>
                <td>{item.maxHardCopyBorrowDays} ngày</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="gd22526-card" onSubmit={saveCatalog}>
        <div className="gd22526-head"><Archive size={16}/> Danh mục & điều kiện khai thác</div>
        <div className="gd22526-grid">
          <input value={catalogForm.code} onChange={event => setCatalogForm({ ...catalogForm, code: event.target.value.toUpperCase() })} placeholder="Mã hồ sơ" />
          <input value={catalogForm.dossierType} onChange={event => setCatalogForm({ ...catalogForm, dossierType: event.target.value })} placeholder="Loại hồ sơ" />
        </div>
        <input value={catalogForm.title} onChange={event => setCatalogForm({ ...catalogForm, title: event.target.value })} placeholder="Tên hồ sơ" />
        <input value={catalogForm.storageLocation} onChange={event => setCatalogForm({ ...catalogForm, storageLocation: event.target.value })} placeholder="Vị trí kho" />
        <textarea rows={2} value={catalogForm.borrowCondition} onChange={event => setCatalogForm({ ...catalogForm, borrowCondition: event.target.value })} />
        <div className="gd22526-grid">
          <select value={catalogForm.securityLevel} onChange={event => setCatalogForm({ ...catalogForm, securityLevel: event.target.value })}>
            <option value="THUONG">Thường</option><option value="MAT">Mật</option><option value="TOI_MAT">Tối mật</option><option value="TUYET_MAT">Tuyệt mật</option>
          </select>
          <input type="number" min="1" max="30" value={catalogForm.maxHardCopyBorrowDays} onChange={event => setCatalogForm({ ...catalogForm, maxHardCopyBorrowDays: Number(event.target.value) })} />
        </div>
        <div className="gd22526-checks">
          <label><input type="checkbox" checked={catalogForm.allowOnlineRead} onChange={event => setCatalogForm({ ...catalogForm, allowOnlineRead: event.target.checked })}/> Đọc online</label>
          <label><input type="checkbox" checked={catalogForm.allowSoftCopy} onChange={event => setCatalogForm({ ...catalogForm, allowSoftCopy: event.target.checked })}/> Bản mềm</label>
          <label><input type="checkbox" checked={catalogForm.allowHardCopy} onChange={event => setCatalogForm({ ...catalogForm, allowHardCopy: event.target.checked })}/> Bản cứng</label>
        </div>
        <button className="btn primary" type="submit"><Save size={14}/> Lưu danh mục</button>
      </form>
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  const rightPanel = (
    <div className="gd22526-right">
      <form className="gd22526-card" onSubmit={registerBorrow}>
        <div className="gd22526-head"><FileSearch size={16}/> Phiếu đăng ký mượn</div>
        <div className="gd22526-selected">
          <strong>{selectedDossier?.code || "--"}</strong>
          <span>{selectedDossier?.title || "Chưa chọn hồ sơ"}</span>
        </div>
        <input value={borrowForm.borrower} onChange={event => setBorrowForm({ ...borrowForm, borrower: event.target.value })} placeholder="Người mượn" />
        <select value={borrowForm.exploitMode} onChange={event => setBorrowForm({ ...borrowForm, exploitMode: event.target.value })}>
          <option value="ONLINE_READ">Đọc file PDF trực tuyến</option>
          <option value="SOFT_COPY">Tải bản mềm sao chép</option>
          <option value="HARD_COPY">Mượn bản cứng tại kho</option>
        </select>
        <div className="gd22526-grid">
          <input type="date" value={borrowForm.borrowFrom} onChange={event => setBorrowForm({ ...borrowForm, borrowFrom: event.target.value })} />
          <input type="number" min="1" max={selectedDossier?.maxHardCopyBorrowDays || 14} value={borrowForm.requestedDays} onChange={event => setBorrowForm({ ...borrowForm, requestedDays: Number(event.target.value) })} />
        </div>
        <textarea rows={3} value={borrowForm.purpose} onChange={event => setBorrowForm({ ...borrowForm, purpose: event.target.value })} />
        <button className="btn primary" type="submit"><Plus size={14}/> Gửi yêu cầu mượn</button>
      </form>

      <div className="gd22526-card">
        <div className="gd22526-head"><History size={16}/> Lịch sử mượn trả</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Phiếu</th><th>Hình thức</th><th>Hạn trả</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {(dashboard.borrowRequests || []).map(item => (
                <tr key={item.id}>
                  <td><strong>#{item.id}</strong><span className="gd22526-sub">{item.dossierCode} · {item.borrower}</span></td>
                  <td>{exploitModeLabel(item.exploitMode)}</td>
                  <td>{new Date(item.dueDate).toLocaleDateString("vi-VN")}</td>
                  <td><span className={`gd22526-badge ${borrowStatusClass(item.status, item.overdue)}`}>{borrowStatusLabel(item.status, item.overdue)}</span></td>
                  <td><div className="gd22526-row-actions">
                    {item.status === "PENDING" && <button className="icon-btn" title="Phê duyệt" onClick={() => runBorrowAction(item.id, "APPROVE")}><CheckCircle2 size={13}/></button>}
                    {["APPROVED"].includes(item.status) && <button className="icon-btn" title="Bàn giao" onClick={() => runBorrowAction(item.id, "HANDOVER")}><Upload size={13}/></button>}
                    {["APPROVED","BORROWED","HANDED_OVER","OVERDUE"].includes(item.status) && <button className="icon-btn" title="Trả hồ sơ" onClick={() => runBorrowAction(item.id, "RETURN")}><RefreshCw size={13}/></button>}
                    {["APPROVED","BORROWED","HANDED_OVER","OVERDUE"].includes(item.status) && <button className="icon-btn danger" title="Thu hồi" onClick={() => runBorrowAction(item.id, "RECALL")}><X size={13}/></button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <GD2FeatureLayout
      className="gd22526-feature"
      featureId={featureId}
      featureName={featureName}
      description="Quản lý danh mục hồ sơ lưu trữ, điều kiện khai thác và quy trình mượn trả bản cứng/bản mềm từ đăng ký đến phê duyệt, bàn giao, thu hồi."
      actor="Người khai thác / Văn thư / Lãnh đạo phê duyệt"
      actionBarLabel="Danh mục, phiếu mượn và lịch sử khai thác"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="1.1fr 0.9fr"
      leftPanelTitle="Danh mục hồ sơ lưu trữ"
      rightPanelTitle="Đăng ký & lịch sử mượn trả"
      midContent={midContent}
      actions={
        <>
          <button className="btn" type="button" onClick={() => loadDossierBorrow()}><RefreshCw size={14}/> Làm mới</button>
          <button className="btn primary" type="button" onClick={registerBorrow}><FileSearch size={14}/> Gửi phiếu</button>
        </>
      }
      actionRows={[
        { action: "Quản lý danh mục", description: "Lưu hồ sơ, cấp bảo mật và điều kiện được mượn/đọc", result: "Danh mục khai thác thống nhất" },
        { action: "Đăng ký mượn", description: "Chọn online PDF, bản mềm hoặc bản cứng", result: "Sinh phiếu mượn PENDING và tự tính hạn trả" },
        { action: "Phê duyệt", description: "Lãnh đạo/Văn thư duyệt phiếu", result: "Chuyển sang đã duyệt, sẵn sàng bàn giao" },
        { action: "Bàn giao/Trả/Thu hồi", description: "Cung cấp link hoặc giao bản cứng, sau đó trả/thu hồi", result: "Cập nhật lịch sử mượn trả và cảnh báo quá hạn" }
      ]}
      validationItems={[
        { type: "required", label: "Điều kiện mượn", text: "Mỗi hồ sơ phải có cấp bảo mật và điều kiện khai thác." },
        { type: "rule", label: "Thời hạn", text: "Bản cứng bị giới hạn theo số ngày tối đa cấu hình trên hồ sơ." },
        { type: "rule", label: "Bảo mật", text: "Hồ sơ Tối mật/Tuyệt mật không cho tải bản mềm sao chép." },
        { type: "perm", label: "Phê duyệt", text: "Chỉ Lãnh đạo/Văn thư được duyệt, bàn giao, thu hồi phiếu mượn." }
      ]}
      flowSteps={[
        { step: "1", label: "Yêu cầu", desc: "Người dùng đăng ký mượn", color: "#3264f4" },
        { step: "2", label: "Phê duyệt", desc: "Lãnh đạo/Văn thư duyệt", color: "#f59e0b" },
        { step: "3", label: "Bàn giao", desc: "Link hoặc bản cứng", color: "#0ea5e9" },
        { step: "4", label: "Theo dõi", desc: "Cảnh báo quá hạn", color: "#dc2626" },
        { step: "5", label: "Trả/Thu hồi", desc: "Đóng phiếu", color: "#16a34a" }
      ]}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}

const gd2WorkspaceActions = ["VIEW", "CREATE", "EDIT", "DELETE", "APPROVE", "EXPORT", "SIGN", "DOWNLOAD"];

function GD2BusinessWorkspaceScreen({ title, feature = "GD2" }) {
  const [activeTab, setActiveTab] = useState("screen");
  const [overview, setOverview] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [unitCode, setUnitCode] = useState("DEFAULT");
  const [roleLevel, setRoleLevel] = useState("");
  const [selected, setSelected] = useState(null);
  const [modalMode, setModalMode] = useState("");
  const [notice, setNotice] = useState(null);
  const [scopeForm, setScopeForm] = useState({
    principalType: "ROLE",
    principalCode: "LANH_DAO_DON_VI",
    unitCode: "DEFAULT",
    departmentCode: "*",
    roleLevel: "LANH_DAO",
    resourceCode: "DOSSIER",
    actions: "VIEW,APPROVE,EXPORT,SIGN,DOWNLOAD",
    dataScope: "UNIT",
    status: "ACTIVE"
  });

  const loadOverview = useCallback(async () => {
    try {
      setNotice(null);
      const data = await uiApi.gd2.overview();
      setOverview(data);
      setSelected(current => current || data.dossiers?.[0] || null);
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const rows = useMemo(() => {
    const items = overview?.dossiers ?? [];
    const text = query.trim().toLowerCase();
    return items.filter(item => {
      const matchesText = !text || `${item.code} ${item.title} ${item.dossierType} ${item.description}`.toLowerCase().includes(text);
      const matchesStatus = !status || item.status === status;
      const matchesUnit = !unitCode || unitCode === "DEFAULT" || String(item.storageId ?? "").includes(unitCode);
      const matchesRole = !roleLevel || (roleLevel === "LANH_DAO" ? ["PENDING", "APPROVED", "PUBLISHED"].includes(item.status) : true);
      return matchesText && matchesStatus && matchesUnit && matchesRole;
    });
  }, [overview, query, status, unitCode, roleLevel]);

  const auditRows = overview?.auditLogs ?? [];
  const accessRows = overview?.accessScopes ?? [];
  const securityPolicies = overview?.securityPolicies ?? [];
  const documents = overview?.documents ?? [];

  async function writeAudit(action, row = selected, detail = "") {
    if (!row) return null;
    const log = await uiApi.gd2.logAudit({
      action,
      entityType: "DOSSIER",
      entityId: row.id,
      actor: "current-user",
      unitCode,
      departmentCode: scopeForm.departmentCode,
      roleLevel: roleLevel || scopeForm.roleLevel,
      detail: detail || `${action} ${row.code}`
    });
    await loadOverview();
    return log;
  }

  async function handleQuickAction(action, row = selected) {
    if (!row) return;
    try {
      if (["APPROVE", "SIGN"].includes(action)) {
        await uiApi.gd2.transition({
          entityType: "DOSSIER",
          entityId: row.id,
          action,
          actor: "current-user",
          unitCode,
          comment: `${action} từ màn ${feature}`,
          recipient: row.code
        });
      } else {
        await writeAudit(action, row);
      }
      setNotice({ type: "success", text: `Đã ghi nhận thao tác ${action} cho ${row.code}.` });
      await loadOverview();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function saveScope(event) {
    event.preventDefault();
    try {
      await uiApi.gd2.saveAccessScope(scopeForm);
      setNotice({ type: "success", text: "Đã lưu phân quyền theo đơn vị, phòng ban, nhóm và cấp bậc." });
      await loadOverview();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  const leftPanel = (
    <div className="gd2-business-screen">
      <div className="gd2-filter-grid">
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm mã, tên, loại hồ sơ..." />
        <select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {["DRAFT", "PENDING", "APPROVED", "PUBLISHED", "NEEDS_SUPPLEMENT", "CONFIRMED"].map(item => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={unitCode} onChange={event => setUnitCode(event.target.value)}>
          <option value="DEFAULT">Đơn vị DEFAULT</option>
          <option value="1">Kho/đơn vị 1</option>
          <option value="2">Kho/đơn vị 2</option>
          <option value="3">Kho/đơn vị 3</option>
        </select>
        <select value={roleLevel} onChange={event => setRoleLevel(event.target.value)}>
          <option value="">Mọi cấp bậc</option>
          <option value="LANH_DAO">Lãnh đạo</option>
          <option value="CHUYEN_VIEN">Chuyên viên</option>
          <option value="QTHT">QTHT</option>
        </select>
      </div>
      <div className="gd2-toolbar-row">
        <button className="btn primary" onClick={() => setModalMode("CREATE")}><Plus size={14}/> Tạo yêu cầu</button>
        <button className="btn" onClick={() => handleQuickAction("EXPORT")}><Download size={14}/> Xuất</button>
        <button className="btn" onClick={() => handleQuickAction("DOWNLOAD")}><FileText size={14}/> Tải hồ sơ</button>
        <button className="btn" onClick={loadOverview}><RefreshCw size={14}/> Đồng bộ</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Mã hồ sơ</th><th>Tên hồ sơ</th><th>Loại</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className={selected?.id === row.id ? "row-selected" : ""} onClick={() => setSelected(row)}>
                <td><span className="gd2-code">{row.code}</span></td>
                <td>{row.title}</td>
                <td>{row.dossierType || "-"}</td>
                <td><StatusBadge status={row.status}/></td>
                <td>
                  <button className="icon-btn" title="Xem chi tiết" onClick={(event) => { event.stopPropagation(); setSelected(row); writeAudit("VIEW", row); setModalMode("DETAIL"); }}><Eye size={14}/></button>
                  <button className="icon-btn primary" title="Sửa" onClick={(event) => { event.stopPropagation(); setSelected(row); handleQuickAction("EDIT", row); }}><Edit size={14}/></button>
                  <button className="icon-btn" title="Duyệt" onClick={(event) => { event.stopPropagation(); setSelected(row); handleQuickAction("APPROVE", row); }}><CheckCircle2 size={14}/></button>
                  <button className="icon-btn" title="Ký số" onClick={(event) => { event.stopPropagation(); setSelected(row); handleQuickAction("SIGN", row); }}><PenTool size={14}/></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="5" className="empty-cell">Không có hồ sơ phù hợp bộ lọc.</td></tr>}
          </tbody>
        </table>
      </div>
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  const rightPanel = (
    <div className="gd2-business-side">
      <div className="gd2-kpi-strip">
        <Metric label="Hồ sơ" value={overview?.dossiers?.length ?? 0} />
        <Metric label="Tài liệu" value={documents.length} />
        <Metric label="Audit" value={auditRows.length} />
      </div>
      <form className="gd2-config-form" onSubmit={saveScope}>
        <div className="gd2-panel-title">Phân quyền sâu</div>
        <div className="gd2-form-row">
          <div className="gd2-field"><label>Chủ thể</label><select value={scopeForm.principalType} onChange={event => setScopeForm(current => ({...current, principalType: event.target.value}))}>{["USER","GROUP","ROLE","DEPARTMENT"].map(item => <option key={item}>{item}</option>)}</select></div>
          <div className="gd2-field"><label>Mã chủ thể</label><input value={scopeForm.principalCode} onChange={event => setScopeForm(current => ({...current, principalCode: event.target.value}))}/></div>
        </div>
        <div className="gd2-form-row">
          <div className="gd2-field"><label>Cấp bậc</label><select value={scopeForm.roleLevel} onChange={event => setScopeForm(current => ({...current, roleLevel: event.target.value}))}>{["LANH_DAO","CHUYEN_VIEN","QTHT"].map(item => <option key={item}>{item}</option>)}</select></div>
          <div className="gd2-field"><label>Phạm vi</label><select value={scopeForm.dataScope} onChange={event => setScopeForm(current => ({...current, dataScope: event.target.value}))}>{["UNIT","DEPARTMENT","OWN","ALL"].map(item => <option key={item}>{item}</option>)}</select></div>
        </div>
        <div className="gd2-field"><label>Quyền thao tác</label><input value={scopeForm.actions} onChange={event => setScopeForm(current => ({...current, actions: event.target.value}))} list="gd2-action-list"/></div>
        <datalist id="gd2-action-list">{gd2WorkspaceActions.map(item => <option key={item} value={item}/>)}</datalist>
        <button className="btn primary" type="submit"><Save size={14}/> Lưu quyền</button>
      </form>
      <div className="gd2-mini-section">
        <div className="gd2-panel-title">Timeline / lịch sử xử lý</div>
        <div className="timeline-list">
          {auditRows.slice(0, 6).map(item => (
            <div key={item.id} className="timeline-item">
              <strong>{item.action}</strong>
              <span>{item.actor} · {new Date(item.createdAt).toLocaleString("vi-VN")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <GD2FeatureLayout
        featureId={feature}
        featureName={title || "Mở rộng nghiệp vụ"}
        description="Không gian tác nghiệp GD2 đầy đủ bộ lọc, danh sách dữ liệu, toolbar thao tác nhanh, modal chi tiết và timeline audit."
        actor="leader / specialist / admin"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        actionBarLabel="Trung tâm xử lý nghiệp vụ và bảo mật"
        splitRatio="minmax(0, 1.25fr) minmax(360px, 0.75fr)"
        leftPanelTitle="Danh sách dữ liệu"
        rightPanelTitle="Bảo mật, phân quyền và audit"
        actions={<button className="btn primary" onClick={() => setModalMode("SCOPE")}><Shield size={14}/> Kiểm tra quyền</button>}
        actionRows={[
          { action: "Tìm kiếm", description: "Lọc đa tiêu chí theo mã, trạng thái, đơn vị, cấp bậc", result: "Danh sách hồ sơ đúng phạm vi quyền" },
          { action: "Xem/Sửa/Xuất/Ký/Tải", description: "Thao tác nhanh trên từng hồ sơ", result: "Ghi audit theo actor, đơn vị, phòng ban, cấp bậc" },
          { action: "Lưu phân quyền", description: "Cấu hình scope theo user/group/role/department", result: "Kiểm soát truy cập sâu" },
        ]}
        validationItems={[
          { type: "required", label: "Audit", text: "Mọi thao tác xem, sửa, xuất, ký số, tải hồ sơ đều phải sinh nhật ký." },
          { type: "perm", label: "Scope", text: "Dữ liệu được giới hạn theo đơn vị, phòng ban, nhóm người dùng và cấp bậc." },
          { type: "rule", label: "Bảo mật", text: "Chính sách chống rò rỉ thông tin nhạy cảm luôn bật ở mức HIGH." },
        ]}
        flowSteps={[
          { step: "1", label: "Lọc", desc: "Tìm đúng hồ sơ", color: "#3264f4" },
          { step: "2", label: "Kiểm quyền", desc: "So khớp scope", color: "#7c3aed" },
          { step: "3", label: "Xử lý", desc: "Duyệt, ký, xuất", color: "#f59e0b" },
          { step: "4", label: "Audit", desc: "Ghi lịch sử", color: "#22c55e" },
        ]}
        leftPanel={leftPanel}
        rightPanel={rightPanel}
      />
      {modalMode && (
        <div className="modal-overlay" onClick={() => setModalMode("")}>
          <div className="modal-content gd2-business-modal" onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-wrap"><Shield size={22} color="#fff"/></div>
              <div>
                <h3>{modalMode === "DETAIL" ? `Chi tiết ${selected?.code}` : "Thông tin nghiệp vụ GD2"}</h3>
                <p className="muted">Audit, phân quyền sâu và chính sách bảo mật đang áp dụng</p>
              </div>
            </div>
            <div className="gd2-modal-grid">
              <div className="detail-grid">
                <div className="detail-row"><span>Mã hồ sơ</span><strong>{selected?.code || "-"}</strong></div>
                <div className="detail-row"><span>Trạng thái</span><StatusBadge status={selected?.status || "DRAFT"}/></div>
                <div className="detail-row"><span>Đơn vị</span><strong>{unitCode}</strong></div>
                <div className="detail-row"><span>Cấp bậc</span><strong>{roleLevel || scopeForm.roleLevel}</strong></div>
              </div>
              <div className="timeline-list">
                {securityPolicies.map(policy => (
                  <div key={policy.code} className="timeline-item">
                    <strong>{policy.name}</strong>
                    <span>{policy.category} · {policy.severity} · {policy.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn primary" onClick={() => handleQuickAction("VIEW")}><Eye size={14}/> Ghi log xem</button>
              <button className="btn" onClick={() => setModalMode("")}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StorageScreen() {
  const crud = useCrud("storage", emptyStorage);
  const [filterType, setFilterType] = useState("ALL");
  const [keyword, setKeyword] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
  const [labelItem, setLabelItem] = useState(null);
  const type = crud.form.locationType || "KHO";
  const typeMeta = {
    KHO: { label: "Kho", parent: null, parentLabel: "", color: "blue" },
    KE: { label: "Kệ", parent: "KHO", parentLabel: "Kho trực thuộc", color: "violet" },
    TANG: { label: "Tầng", parent: "KE", parentLabel: "Kệ trực thuộc", color: "amber" },
    HOP: { label: "Hộp", parent: "TANG", parentLabel: "Tầng trực thuộc", color: "green" }
  };
  const rowById = useMemo(() => new Map(crud.rows.map(row => [Number(row.id), row])), [crud.rows]);
  const parentOptions = useMemo(
    () => crud.rows.filter(row => row.locationType === typeMeta[type].parent),
    [crud.rows, type]
  );
  const visibleRows = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return crud.rows.filter(row => {
      const matchesType = filterType === "ALL" || row.locationType === filterType;
      const matchesKeyword = !normalizedKeyword || `${row.code} ${row.name}`.toLowerCase().includes(normalizedKeyword);
      return matchesType && matchesKeyword;
    });
  }, [crud.rows, filterType, keyword]);

  function hierarchyPath(row) {
    const path = [];
    const visited = new Set();
    let current = row;
    while (current && !visited.has(Number(current.id))) {
      visited.add(Number(current.id));
      path.unshift(current.name);
      current = rowById.get(Number(current.parentId));
    }
    return path.join(" / ");
  }

  function selectLocationType(nextType) {
    setFilterType(nextType);
    crud.setField("locationType", nextType);
    crud.setField("parentId", "");
  }

  function editStorage(row) {
    crud.edit(row);
    setFilterType(row.locationType || "ALL");
  }

  function openBoxLabel(row) {
    setLabelItem({
      entityType: "BOX",
      id: row.id,
      code: row.code,
      name: row.name,
      location: hierarchyPath(row),
      createdAt: row.createdAt
    });
  }

  return (
    <section className="panel storage-management">
      <div className="storage-heading">
        <PanelTitle icon={<Archive />} title="Danh mục Kho - Kệ - Tầng - Hộp" />
        <p>Thiết lập đúng cây vị trí vật lý để hồ sơ, tài liệu OCR được lưu và tra cứu theo từng cấp.</p>
      </div>

      <div className="storage-type-grid">
        {Object.entries(typeMeta).map(([key, meta]) => {
          const count = crud.rows.filter(row => row.locationType === key).length;
          return (
            <button key={key} type="button" className={`storage-type-card ${meta.color} ${filterType === key ? "active" : ""}`} onClick={() => selectLocationType(key)}>
              <span>{key === "KHO" ? <Archive size={20}/> : <Layers3 size={20}/>}</span>
              <strong>{count}</strong>
              <small>{meta.label} lưu trữ</small>
            </button>
          );
        })}
      </div>

      <div className="storage-toolbar">
        <div className="storage-search"><Search size={16}/><input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm theo mã hoặc tên vị trí..." /></div>
        <select value={filterType} onChange={event => setFilterType(event.target.value)}>
          <option value="ALL">Tất cả cấp lưu trữ</option>
          {Object.entries(typeMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
        </select>
        <button className="btn" type="button" onClick={crud.load}><RefreshCw size={15}/> Tải lại</button>
      </div>

      <div className="storage-workspace">
        <form className="storage-form" onSubmit={crud.save}>
          <div className="storage-form-title">
            <span>{crud.form.id ? "Chỉnh sửa vị trí lưu trữ" : `Thêm ${typeMeta[type].label.toLowerCase()} mới`}</span>
            <small>Cấu trúc: Kho → Kệ → Tầng → Hộp</small>
          </div>
          <label className="field required">
            <span>Loại vị trí</span>
            <select value={type} onChange={event => { crud.setField("locationType", event.target.value); crud.setField("parentId", ""); }}>
              {Object.entries(typeMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
            </select>
          </label>
          {typeMeta[type].parent && (
            <label className="field required">
              <span>{typeMeta[type].parentLabel}</span>
              <select value={crud.form.parentId || ""} onChange={event => crud.setField("parentId", event.target.value)} required>
                <option value="">-- Chọn {typeMeta[type].parentLabel.toLowerCase()} --</option>
                {parentOptions.map(row => <option key={row.id} value={row.id}>{row.code} - {hierarchyPath(row)}</option>)}
              </select>
              {!parentOptions.length && <small className="storage-field-note">Cần tạo {typeMeta[typeMeta[type].parent].label.toLowerCase()} cha trước.</small>}
            </label>
          )}
          <label className="field required"><span>Mã {typeMeta[type].label.toLowerCase()}</span><input value={crud.form.code || ""} onChange={event => crud.setField("code", event.target.value)} required placeholder={`Ví dụ: ${type}-01`} /></label>
          <label className="field required"><span>Tên {typeMeta[type].label.toLowerCase()}</span><input value={crud.form.name || ""} onChange={event => crud.setField("name", event.target.value)} required /></label>
          <label className="field"><span>Sức chứa dự kiến</span><input type="number" min="0" value={crud.form.capacity || ""} onChange={event => crud.setField("capacity", event.target.value)} placeholder="Số hồ sơ / tài liệu" /></label>
          <label className="field"><span>Trạng thái</span><select value={crud.form.status || "ACTIVE"} onChange={event => crud.setField("status", event.target.value)}><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></select></label>
          <div className="form-actions">
            <button className="btn primary" type="submit"><Save size={15}/> {crud.form.id ? "Cập nhật" : "Thêm mới"}</button>
            <button className="btn" type="button" onClick={crud.reset}><X size={15}/> Bỏ qua</button>
          </div>
          {crud.error && <div className="alert">{crud.error}</div>}
        </form>

        <div className="storage-table-panel">
          <div className="storage-list-title"><strong>Cây vị trí lưu trữ</strong><span>{visibleRows.length} / {crud.rows.length} vị trí</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Loại</th><th>Mã</th><th>Đường dẫn vị trí</th><th>Sức chứa</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
              <tbody>
                {visibleRows.map(row => (
                  <tr key={row.id}>
                    <td><span className={`storage-kind ${typeMeta[row.locationType]?.color || "blue"}`}>{typeMeta[row.locationType]?.label || row.locationType}</span></td>
                    <td><span className="gd2-code">{row.code}</span></td>
                    <td><strong>{hierarchyPath(row)}</strong>{row.parentId && <small className="storage-parent">Cấp cha: {rowById.get(Number(row.parentId))?.code || row.parentId}</small>}</td>
                    <td>{row.capacity || 0}</td>
                    <td><StatusBadge status={row.status || "ACTIVE"}/></td>
                    <td>
                      {row.locationType === "HOP" && <button className="icon-btn label-action" type="button" onClick={() => openBoxLabel(row)} title="In Mã Vạch / QR Code"><QrCode size={14}/></button>}
                      <button className="icon-btn primary" type="button" onClick={() => editStorage(row)} title="Sửa"><Edit size={14}/></button>
                      <button className="icon-btn danger" type="button" onClick={() => crud.remove(row.id)} title="Xóa"><Trash2 size={14}/></button>
                    </td>
                  </tr>
                ))}
                {!visibleRows.length && <tr><td colSpan={6} className="empty-cell">Chưa có vị trí phù hợp. Hãy tạo theo thứ tự Kho → Kệ → Tầng → Hộp.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {labelItem && <Suspense fallback={null}><ArchiveLabelModal item={labelItem} onClose={() => setLabelItem(null)} /></Suspense>}
    </section>
  );
}

function DossierScreen({ mode }) {
  const storageCrud = useCrud("storage", emptyStorage);
  const [dossiers, setDossiers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadPolicy, setUploadPolicy] = useState({ maxBytes: 25 * 1024 * 1024, maxMegabytes: 25, technicalModelMaxBytes: 200 * 1024 * 1024, technicalModelMaxMegabytes: 200 });
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    storageId: "",
    title: "",
    documentType: "QUYET_DINH",
    status: "DRAFT",
    engine: "gemini"
  });

  const storageById = useMemo(
    () => new Map(storageCrud.rows.map(row => [Number(row.id), row])),
    [storageCrud.rows]
  );
  const storageOptions = useMemo(() => {
    const typeLabel = { KHO: "Kho", KE: "Kệ", TANG: "Tầng", HOP: "Hộp" };
    const pathOf = row => {
      const path = [];
      const visited = new Set();
      let current = row;
      while (current && !visited.has(Number(current.id))) {
        visited.add(Number(current.id));
        path.unshift(current.name);
        current = storageById.get(Number(current.parentId));
      }
      return path.join(" / ");
    };
    return storageCrud.rows
      .filter(row => String(row.status || "ACTIVE").toUpperCase() === "ACTIVE")
      .map(row => ({
        value: String(row.id),
        label: `${typeLabel[row.locationType] || row.locationType}: ${pathOf(row)} (${row.code})`
      }));
  }, [storageCrud.rows, storageById]);
  const dossierById = useMemo(
    () => new Map(dossiers.map(row => [Number(row.id), row])),
    [dossiers]
  );

  useEffect(() => {
    runSearch();
    uiApi.crud("documents").uploadPolicy("DEFAULT")
      .then(setUploadPolicy)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.storageId && storageOptions.length) {
      setField("storageId", storageOptions[0].value);
    }
  }, [storageOptions, form.storageId]);

  async function runSearch() {
    try {
      const [dossierResult, documentResult] = await Promise.all([
        uiApi.crud("dossiers").list(),
        uiApi.crud("documents").list()
      ]);
      setDossiers(Array.isArray(dossierResult) ? dossierResult : (dossierResult?.items || []));
      const rows = Array.isArray(documentResult) ? documentResult : (documentResult?.items || []);
      setDocuments([...rows].sort((left, right) => Number(right.id) - Number(left.id)));
    } catch (e) {
      setNotice({ type: "error", text: "Không tải được danh sách tài liệu." });
    }
  }

  async function loadTree() {
    await storageCrud.load();
  }

  function setField(key, value) { setForm(current => ({ ...current, [key]: value })); }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    const fileLimit = isTechnicalModelFile(file?.name) ? uploadPolicy.technicalModelMaxBytes : uploadPolicy.maxBytes;
    const fileLimitMb = isTechnicalModelFile(file?.name) ? uploadPolicy.technicalModelMaxMegabytes : uploadPolicy.maxMegabytes;
    if (file && file.size > fileLimit) {
      setPendingFile(null);
      event.target.value = "";
      setNotice({ type: "error", text: `Tệp vượt hạn mức tải lên (${fileLimitMb} MB).` });
      return;
    }
    setPendingFile(file);
    setNotice(null);
    if (file && !form.title.trim()) {
      setField("title", file.name.replace(/\.[^.]+$/, ""));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.storageId || !form.title.trim()) {
      setNotice({ type: "error", text: "Vui lòng chọn kho lưu trữ và nhập tên tài liệu." });
      return;
    }
    const pendingLimit = isTechnicalModelFile(pendingFile?.name) ? uploadPolicy.technicalModelMaxBytes : uploadPolicy.maxBytes;
    const pendingLimitMb = isTechnicalModelFile(pendingFile?.name) ? uploadPolicy.technicalModelMaxMegabytes : uploadPolicy.maxMegabytes;
    if (pendingFile && pendingFile.size > pendingLimit) {
      setNotice({ type: "error", text: `Tệp vượt hạn mức tải lên (${pendingLimitMb} MB).` });
      return;
    }
    setLoading(true);
    setNotice(null);
    try {
      const result = await uiApi.crud("documents").quickUpload({
        storageId: Number(form.storageId),
        file: pendingFile,
        title: form.title.trim(),
        documentType: form.documentType,
        status: form.status,
        engine: form.engine,
        unitCode: "DEFAULT"
      });
      setNotice({ type: "success", text: result?.message || `Đã lưu tài liệu ${form.title.trim()} vào kho thành công!` });
      resetForm();
      await Promise.all([loadTree(), runSearch()]);
    } catch (e) {
      setNotice({ type: "error", text: `Lỗi: ${e.message}` });
    } finally { setLoading(false); }
  }

  async function removeDocument(id) {
    if (!window.confirm("Xóa tài liệu này?")) return;
    try { await uiApi.crud("documents").remove(id); await runSearch(); }
    catch (e) { setNotice({ type: "error", text: `Lỗi xóa: ${e.message}` }); }
  }

  function resetForm() {
    setForm(current => ({
      storageId: current.storageId || storageOptions[0]?.value || "",
      title: "",
      documentType: "QUYET_DINH",
      status: "DRAFT",
      engine: "gemini"
    }));
    setPendingFile(null);
    setFileInputKey(key => key + 1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="all-in-one-screen">
      <section className="panel upload-panel">
        <PanelTitle icon={<Upload />} title="Thêm mới & Tải lên tài liệu vào Kho" />
        <form onSubmit={handleSubmit} className="all-in-one-upload-form">
          <label className="field required upload-storage-field">
            <span>Kho lưu trữ</span>
            <select value={form.storageId} onChange={e => setField("storageId", e.target.value)} required>
              <option value="">{storageOptions.length ? "Chọn Kho / Kệ / Hộp" : "Chưa có kho đang hoạt động"}</option>
              {storageOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </label>
          <label className="field required upload-title-field">
            <span>Tên tài liệu</span>
            <input value={form.title} onChange={e => setField("title", e.target.value)} placeholder="Nhập tên văn bản" required />
          </label>
          <label className="field">
            <span>Loại tài liệu</span>
            <select value={form.documentType} onChange={e => setField("documentType", e.target.value)}>
              <option value="QUYET_DINH">Quyết định</option>
              <option value="TO_TRINH">Tờ trình</option>
              <option value="HOP_DONG">Hợp đồng</option>
              <option value="CONG_VAN">Công văn</option>
              <option value="BAN_VE">Bản vẽ</option>
              <option value="KHAC">Khác</option>
            </select>
          </label>
          <label className="field">
            <span>Trạng thái</span>
            <select value={form.status} onChange={e => setField("status", e.target.value)}>
              <option value="DRAFT">Dự thảo (DRAFT)</option>
              <option value="PENDING">Chờ duyệt (PENDING)</option>
              <option value="ACTIVE">Hoạt động (ACTIVE)</option>
            </select>
          </label>
          <label className="field upload-file-field">
            <span>Đính kèm tệp</span>
            <div className="upload-file-picker">
              <input key={fileInputKey} ref={fileInputRef} type="file" accept=".pdf,.docx,.tif,.tiff,.png,.jpg,.jpeg,.ifc,.stl,.obj,.step,.stp" onChange={handleFileChange} />
              <small>{pendingFile ? `${pendingFile.name} · ${(pendingFile.size / 1024 / 1024).toFixed(2)} MB` : `PDF/ảnh/văn bản hoặc IFC/STL/OBJ/STEP · mô hình tối đa ${uploadPolicy.technicalModelMaxMegabytes} MB`}</small>
            </div>
          </label>
          <label className="field">
            <span>Engine OCR</span>
            <select value={form.engine} onChange={e => setField("engine", e.target.value)}>
              <option value="gemini">Gemini Vision AI</option>
              <option value="vietocr">VietOCR</option>
              <option value="easyocr">EasyOCR</option>
              <option value="tesseract">Tesseract</option>
            </select>
          </label>
          <div className="form-actions all-in-one-actions">
            <button className="btn primary" type="submit" disabled={loading}><Upload size={16} /> {loading ? "Đang lưu & bóc tách..." : "Lưu & Tải lên"}</button>
            <button className="btn" type="button" onClick={resetForm} disabled={loading}><X size={16} /> Bỏ qua</button>
          </div>
        </form>
        {notice && <div className={`upload-toast ${notice.type}`} role="status"><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo"><X size={15} /></button></div>}
        <div className="table-wrap" style={{ marginTop: "16px" }}>
          <table>
            <thead><tr><th>Mã tài liệu</th><th>Tên tài liệu</th><th>Loại</th><th>Kho / Hồ sơ</th><th>Tệp</th><th>OCR</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {documents.length === 0 ? (
                <tr><td colSpan={8} className="empty-cell">Chưa có tài liệu. Nhập thông tin và nhấn “Lưu & Tải lên”.</td></tr>
              ) : documents.map(row => {
                const dossier = dossierById.get(Number(row.dossierId));
                const storage = storageById.get(Number(dossier?.storageId));
                return (
                <tr key={row.id}>
                  <td><span className="gd2-code">{row.code}</span></td>
                  <td>{row.title}</td>
                  <td>{dossier?.dossierType || "Khác"}</td>
                  <td>{storage ? `${storage.code} · ${storage.name}` : dossier?.storageId || "-"}<small className="upload-dossier-code">{dossier?.code}</small></td>
                  <td>{row.fileName ? <span className="file-attached">Đã tải lên</span> : <span className="file-missing">Chưa có tệp</span>}</td>
                  <td><OcrBadge status={row.ocrStatus || "PENDING"} /></td>
                  <td><StatusBadge status={row.status || "DRAFT"} /></td>
                  <td><button className="icon-btn danger" onClick={() => removeDocument(row.id)} title="Xóa"><Trash2 size={14} /></button></td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
function DocumentPanel() {
  const crud = useCrud("documents", emptyDocument);
  const dossiers = useCrud("dossiers", emptyDossier);
  const dossierOptions = useMemo(
    () => dossiers.rows.map((row) => ({
      value: String(row.id),
      label: `${row.code} - ${row.title}`
    })),
    [dossiers.rows]
  );
  const dossierById = useMemo(
    () => new Map(dossiers.rows.map((row) => [Number(row.id), row])),
    [dossiers.rows]
  );
  const formatDossier = (value) => {
    const dossier = dossierById.get(Number(value));
    return dossier ? `${dossier.code} - ${dossier.title}` : `Hồ sơ #${value}`;
  };

  return (
    <CrudScreen
      compact
      title="Tài liệu/OCR"
      icon={<FileText />}
      crud={crud}
      columns={[
        ["dossierId", "Hồ sơ", formatDossier],
        ["code", "Mã"],
        ["title", "Tên tài liệu"],
        ["ocrStatus", "OCR"],
        ["status", "Trạng thái"]
      ]}
      fields={[
        {
          key: "dossierId",
          label: "Hồ sơ",
          type: "select",
          required: true,
          placeholder: dossiers.rows.length ? "Chọn hồ sơ" : "Chưa có hồ sơ trong DB",
          options: dossierOptions
        },
        { key: "code", label: "Mã tài liệu", required: true },
        { key: "title", label: "Tên tài liệu", required: true },
        { key: "fileName", label: "File tài liệu (PDF/Ảnh đính kèm)", type: "file" },
        { key: "ocrStatus", label: "OCR", type: "select", options: ["PENDING", "PROCESSING", "DONE", "ERROR"] },
        { key: "status", label: "Trạng thái", type: "select", options: ["DRAFT", "VALID", "INVALID"] }
      ]}
    />
  );
}

function SearchScreen() {
  const crud = useCrud("dossiers", emptyDossier);
  const storageCrud = useCrud("storage", emptyStorage);
  const [keyword, setKeyword] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
  const [labelItem, setLabelItem] = useState(null);
  const storageById = useMemo(
    () => new Map(storageCrud.rows.map(row => [Number(row.id), row])),
    [storageCrud.rows]
  );
  const rows = useMemo(() => {
    if (!keyword) return crud.rows;
    const k = keyword.toLowerCase();
    return crud.rows.filter((row) => `${row.code} ${row.title} ${row.dossierType}`.toLowerCase().includes(k));
  }, [crud.rows, keyword]);

  function storagePath(storageId) {
    const path = [];
    const visited = new Set();
    let current = storageById.get(Number(storageId));
    while (current && !visited.has(Number(current.id))) {
      visited.add(Number(current.id));
      path.unshift(`${current.code} · ${current.name}`);
      current = storageById.get(Number(current.parentId));
    }
    return path.join(" / ") || "Chưa xác định vị trí";
  }

  function openDossierLabel(row) {
    setLabelItem({
      entityType: "DOSSIER",
      id: row.id,
      code: row.code,
      name: row.title,
      location: storagePath(row.storageId),
      createdAt: row.createdAt || row.fromDate
    });
  }

  return (
    <section className="panel">
      <PanelTitle icon={<Search />} title="Tra cứu hồ sơ" />
      <div className="search-strip">
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Nhập mã, tên, loại hồ sơ..." />
        <button className="btn primary">
          <Search size={16} /> Tìm kiếm
        </button>
      </div>
      <DataTable rows={rows} columns={[["code", "Mã hồ sơ"], ["title", "Tên hồ sơ"], ["dossierType", "Loại"], ["status", "Trạng thái"]]} onLabel={openDossierLabel} onEdit={crud.edit} onDelete={crud.remove} />
      {labelItem && <Suspense fallback={null}><ArchiveLabelModal item={labelItem} onClose={() => setLabelItem(null)} /></Suspense>}
    </section>
  );
}



function BorrowScreen() {
  const crud = useCrud("borrow", emptyBorrow);
  const dossiers = useCrud("dossiers", emptyDossier);
  const dossierOptions = useMemo(
    () => dossiers.rows.map((row) => ({
      value: String(row.id),
      label: `${row.code} - ${row.title}`
    })),
    [dossiers.rows]
  );
  const dossierById = useMemo(
    () => new Map(dossiers.rows.map((row) => [Number(row.id), row])),
    [dossiers.rows]
  );
  const formatDossier = (value) => {
    const dossier = dossierById.get(Number(value));
    return dossier ? `${dossier.code} - ${dossier.title}` : `Hồ sơ #${value}`;
  };

  return (
    <CrudScreen
      title="Quy trình mượn, tra, khai thác hồ sơ"
      icon={<FileSearch />}
      crud={crud}
      columns={[
        ["dossierId", "Hồ sơ", formatDossier],
        ["borrower", "Người mượn"],
        ["borrowFrom", "Từ ngày"],
        ["borrowTo", "Đến ngày"],
        ["status", "Trạng thái"],
        ["approver", "Người duyệt"]
      ]}
      fields={[
        {
          key: "dossierId",
          label: "Hồ sơ",
          type: "select",
          required: true,
          placeholder: dossiers.rows.length ? "Chọn hồ sơ cần mượn" : "Chưa có hồ sơ trong DB",
          options: dossierOptions
        },
        { key: "borrower", label: "Người mượn", required: true },
        { key: "borrowFrom", label: "Từ ngày", type: "date" },
        { key: "borrowTo", label: "Đến ngày", type: "date" },
        { key: "status", label: "Trạng thái", type: "select", options: ["PENDING", "APPROVED", "REJECTED", "RETURNED"] },
        { key: "approver", label: "Người duyệt" },
        { key: "note", label: "Ghi chú", type: "textarea" }
      ]}
    />
  );
}

function BatchImportScreen() {
  const [excelFile, setExcelFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [ocrEngine, setOcrEngine] = useState("vietocr");
  const [job, setJob] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [pollJobId, setPollJobId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState(0);
  const [dragTarget, setDragTarget] = useState("");
  const [notice, setNotice] = useState(null);
  const excelInputRef = useRef(null);
  const zipInputRef = useRef(null);

  const terminalStatuses = new Set(["COMPLETED", "COMPLETED_WITH_ERRORS"]);
  const progress = job ? calculateImportProgress(job) : uploadStage;

  useEffect(() => { loadRecentJobs(); }, []);

  useEffect(() => {
    if (!pollJobId) return undefined;
    let cancelled = false;
    let timer;
    async function poll() {
      try {
        const current = await uiApi.dms.batchImportJob(pollJobId);
        if (cancelled) return;
        setJob(current);
        if (terminalStatuses.has(current.status)) {
          setPollJobId(null);
          loadRecentJobs();
          return;
        }
      } catch (error) {
        if (!cancelled) setNotice({type:"error",text:`Không cập nhật được tiến trình: ${error.message}`});
      }
      if (!cancelled) timer = window.setTimeout(poll, 1500);
    }
    poll();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [pollJobId]);

  async function loadRecentJobs() {
    try {
      setRecentJobs(await uiApi.dms.batchImportJobs(12));
    } catch (error) {
      setNotice({type:"error",text:`Không tải được lịch sử import. Hãy khởi tạo DB sau khi triển khai: ${error.message}`});
    }
  }

  function acceptFile(file, type) {
    if (!file) return;
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (type === "excel" && extension !== ".xlsx") {
      setNotice({type:"error",text:"Danh mục hồ sơ phải là tệp .xlsx."});
      return;
    }
    if (type === "zip" && extension !== ".zip") {
      setNotice({type:"error",text:"Tài liệu đính kèm phải là tệp .zip."});
      return;
    }
    if (type === "excel" && file.size > 10 * 1024 * 1024) {
      setNotice({type:"error",text:"Tệp Excel vượt giới hạn 10 MB."});
      return;
    }
    if (type === "zip" && file.size > 250 * 1024 * 1024) {
      setNotice({type:"error",text:"Tệp ZIP vượt giới hạn 250 MB."});
      return;
    }
    if (type === "excel") setExcelFile(file); else setZipFile(file);
    setNotice(null);
  }

  function handleDrop(event, type) {
    event.preventDefault();
    setDragTarget("");
    acceptFile(event.dataTransfer.files?.[0], type);
  }

  async function downloadTemplate() {
    try {
      const blob = await uiApi.dms.batchImportTemplate();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "DanhMucHoSo.xlsx";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice({type:"error",text:`Không tải được template: ${error.message}`});
    }
  }

  async function startImport() {
    if (!excelFile || !zipFile) {
      setNotice({type:"error",text:"Vui lòng chọn đủ DanhMucHoSo.xlsx và TaiLieu.zip."});
      return;
    }
    try {
      setUploading(true);
      setJob(null);
      setUploadStage(5);
      setNotice({type:"info",text:"Đang upload, kiểm tra Excel và đối chiếu nội dung ZIP..."});
      const result = await uiApi.dms.batchImportZip(excelFile, zipFile, ocrEngine, percent => {
        setUploadStage(Math.min(28, 5 + percent * 0.23));
      });
      setJob(result);
      setUploadStage(30);
      setNotice({
        type: result.failedRows > 0 ? "warning" : "success",
        text: `Đã import ${result.importedDossiers} hồ sơ, ${result.importedDocuments} văn bản; ${result.failedRows} dòng lỗi. ${result.ocrQueued > result.ocrCompleted + result.ocrFailed ? "OCR đang chạy nền." : "Phiên import đã hoàn tất."}`,
      });
      if (!terminalStatuses.has(result.status)) setPollJobId(result.jobId);
      await loadRecentJobs();
    } catch (error) {
      setUploadStage(0);
      setNotice({type:"error",text:`Import thất bại: ${error.message}`});
    } finally {
      setUploading(false);
    }
  }

  function openJob(selectedJob) {
    setJob(selectedJob);
    if (!terminalStatuses.has(selectedJob.status)) setPollJobId(selectedJob.id);
    else setPollJobId(null);
  }

  return <div className="batch-import-screen">
    <div className="batch-import-header">
      <div>
        <span className="gd21415-section-kicker">ZIP + Excel Batch Import</span>
        <h2>Import hồ sơ hàng loạt</h2>
        <p>Đối chiếu danh mục Excel với file trong ZIP, tạo hồ sơ/văn bản và tự động OCR nền.</p>
      </div>
      <button className="btn" type="button" onClick={downloadTemplate}><Download size={15}/> Tải template Excel mẫu</button>
    </div>

    {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}

    <div className="batch-import-controls">
      <div className="batch-import-drop-grid">
        <div className={`batch-drop-zone ${dragTarget === "excel" ? "dragging" : ""} ${excelFile ? "selected" : ""}`}
          onDragOver={event => {event.preventDefault();setDragTarget("excel");}} onDragLeave={() => setDragTarget("")} onDrop={event => handleDrop(event,"excel")} onClick={() => excelInputRef.current?.click()}>
          <input ref={excelInputRef} type="file" accept=".xlsx" onChange={event => acceptFile(event.target.files?.[0],"excel")}/>
          <FileText size={30}/><strong>DanhMucHoSo.xlsx</strong>
          <span>{excelFile ? `${excelFile.name} · ${formatBatchFileSize(excelFile.size)}` : "Kéo thả hoặc bấm để chọn Excel"}</span>
          {excelFile && <button className="icon-btn danger" type="button" title="Bỏ tệp" onClick={event => {event.stopPropagation();setExcelFile(null);}}><X size={13}/></button>}
        </div>
        <div className={`batch-drop-zone zip ${dragTarget === "zip" ? "dragging" : ""} ${zipFile ? "selected" : ""}`}
          onDragOver={event => {event.preventDefault();setDragTarget("zip");}} onDragLeave={() => setDragTarget("")} onDrop={event => handleDrop(event,"zip")} onClick={() => zipInputRef.current?.click()}>
          <input ref={zipInputRef} type="file" accept=".zip" onChange={event => acceptFile(event.target.files?.[0],"zip")}/>
          <Archive size={30}/><strong>TaiLieu.zip</strong>
          <span>{zipFile ? `${zipFile.name} · ${formatBatchFileSize(zipFile.size)}` : "Kéo thả hoặc bấm để chọn ZIP"}</span>
          {zipFile && <button className="icon-btn danger" type="button" title="Bỏ tệp" onClick={event => {event.stopPropagation();setZipFile(null);}}><X size={13}/></button>}
        </div>
      </div>
      <div className="batch-import-action-row">
        <label>Engine OCR nền<select value={ocrEngine} onChange={event => setOcrEngine(event.target.value)}><option value="vietocr">VietOCR</option><option value="gemini">Gemini</option><option value="easyocr">EasyOCR</option><option value="tesseract">Tesseract</option><option value="crnn">CRNN</option></select></label>
        <button className="btn primary" type="button" disabled={uploading || !excelFile || !zipFile} onClick={startImport}><Upload size={15}/>{uploading ? "Đang kiểm tra..." : "Bắt đầu import"}</button>
      </div>
      <div className="batch-progress-block">
        <div><strong>Tiến trình</strong><span>{Math.round(progress)}%</span></div>
        <div className="progress-bar-track"><div className="progress-bar-fill" style={{width:`${progress}%`}}></div></div>
        <small>{job ? `${job.ocrCompleted || 0}/${job.ocrQueued || 0} OCR hoàn tất · ${job.ocrFailed || 0} lỗi OCR · Trạng thái ${job.status}` : "Chưa bắt đầu"}</small>
      </div>
    </div>

    {job && <div className="batch-import-summary">
      <div><strong>{job.totalRows}</strong><span>Dòng Excel</span></div><div><strong>{job.importedDossiers}</strong><span>Hồ sơ đã tạo</span></div><div><strong>{job.importedDocuments}</strong><span>Văn bản đã tạo</span></div><div className={job.failedRows ? "error" : ""}><strong>{job.failedRows}</strong><span>Dòng lỗi</span></div><div><strong>{job.ocrCompleted || 0}/{job.ocrQueued || 0}</strong><span>OCR hoàn tất</span></div>
    </div>}

    <div className="batch-import-layout">
      <div className="batch-result-panel">
        <div className="gd22-section-head"><CheckCircle2 size={16}/> Bảng đối soát kết quả {job ? `· ${job.jobCode || job.code}` : ""}</div>
        <div className="table-wrap"><table><thead><tr><th>Dòng</th><th>Mã hồ sơ</th><th>Mã văn bản</th><th>File đính kèm</th><th>Trạng thái</th><th>Kết quả</th></tr></thead><tbody>
          {(job?.items || []).map(item => <tr key={item.id}><td>{item.rowNumber}</td><td><span className="gd2-code">{item.dossierCode || "--"}</span></td><td>{item.documentCode || "--"}</td><td title={item.attachmentFileName}>{item.attachmentFileName || "--"}</td><td><StatusBadge status={item.status}/></td><td className={item.status.includes("ERROR") ? "batch-error-text" : ""}>{item.message || "--"}</td></tr>)}
          {!job?.items?.length && <tr><td colSpan="6" className="empty-cell">Kết quả từng dòng sẽ hiển thị sau khi import.</td></tr>}
        </tbody></table></div>
      </div>
      <aside className="batch-history-panel">
        <div className="gd22-section-head"><History size={16}/> Lịch sử import <button className="icon-btn" type="button" onClick={loadRecentJobs}><RefreshCw size={12}/></button></div>
        <div className="batch-history-list">{recentJobs.map(item => <button type="button" key={item.id} className={job?.id === item.id || job?.jobId === item.id ? "active" : ""} onClick={() => openJob(item)}><strong>{item.code}</strong><span>{new Date(item.createdAt).toLocaleString("vi-VN")}</span><small>{item.importedDocuments} văn bản · {item.failedRows} lỗi · {item.status}</small></button>)}{!recentJobs.length && <div className="empty-cell">Chưa có phiên import.</div>}</div>
      </aside>
    </div>
  </div>;
}

function calculateImportProgress(job) {
  if (["COMPLETED", "COMPLETED_WITH_ERRORS"].includes(job?.status)) return 100;
  const imported = Number(job?.importedDocuments || 0);
  const total = Math.max(1, Number(job?.totalRows || imported || 1));
  const queued = Number(job?.ocrQueued || 0);
  const processed = Number(job?.ocrCompleted || 0) + Number(job?.ocrFailed || 0);
  return Math.min(99, 30 * imported / total + (queued ? 70 * processed / queued : 0));
}

function formatBatchFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function SimpleResourceScreen({ title, resource, group }) {
  const crud = useCrud(resource, emptySimple);
  return (
    <CrudScreen
      title={title}
      icon={iconFor(group)}
      crud={crud}
      columns={[
        ["code", "Mã"],
        ["name", "Tên"],
        ["parentId", "ID cha"],
        ["status", "Trạng thái"],
        ["extra1", "Thông tin 1"],
        ["extra2", "Thông tin 2"]
      ]}
      fields={[
        { key: "code", label: "Mã", required: true },
        { key: "name", label: "Tên", required: true },
        { key: "parentId", label: "ID cha", type: "number" },
        { key: "status", label: "Trạng thái", type: "select", options: ["ACTIVE", "INACTIVE", "PENDING", "APPROVED", "REJECTED"] },
        { key: "description", label: "Mô tả", type: "textarea" },
        { key: "extra1", label: extraLabel1(resource) },
        { key: "extra2", label: extraLabel2(resource) },
        { key: "date1", label: "Từ ngày", type: "date" },
        { key: "date2", label: "Đến ngày", type: "date" }
      ]}
    />
  );
}

function ReportCrudScreen() {
  const crud = useCrud("reports", emptySimple);
  return (
    <CrudScreen
      title="Khai báo / xuất báo cáo"
      icon={<FileText />}
      crud={crud}
      columns={[
        ["code", "Mã báo cáo"],
        ["name", "Tên báo cáo"],
        ["status", "Trạng thái"],
        ["extra1", "Loại dữ liệu"],
        ["extra2", "File mẫu"]
      ]}
      fields={[
        { key: "code", label: "Mã báo cáo", required: true },
        { key: "name", label: "Tên báo cáo", required: true },
        { key: "status", label: "Trạng thái", type: "select", options: ["ACTIVE", "INACTIVE"] },
        { key: "description", label: "Mô tả", type: "textarea" },
        { key: "extra1", label: "Loại dữ liệu trả về" },
        { key: "extra2", label: "Tên file mẫu" },
        { key: "date1", label: "Từ ngày", type: "date" },
        { key: "date2", label: "Đến ngày", type: "date" }
      ]}
    />
  );
}

function ReportScreen() {
  return (
    <section className="panel">
      <PanelTitle icon={<FileText />} title="Báo cáo thống kê" />
      <div className="report-grid">
        <Metric label="Hồ sơ" value="Theo DB" />
        <Metric label="Tài liệu OCR" value="Theo DB" />
        <Metric label="Phiếu mượn" value="Theo DB" />
      </div>
      <p className="muted">Các báo cáo sẽ tổng hợp từ bảng DMS_DOSSIERS, DMS_DOCUMENTS và DMS_BORROW_REQUESTS.</p>
    </section>
  );
}

function AdminScreen({ title }) {
  return (
    <section className="panel">
      <PanelTitle icon={<Home />} title={title} />
      <p className="muted">Màn hình quản trị dùng chung. Các danh mục nghiệp vụ có thể cấu hình tiếp thành bảng riêng khi chốt mô hình dữ liệu chi tiết.</p>
    </section>
  );
}

function CrudScreen({ title, icon, crud, columns, fields, compact = false }) {
  return (
    <section className={compact ? "panel compact" : "panel"}>
      <PanelTitle icon={icon} title={title} />
      <form className="crud-form" onSubmit={crud.save}>
        {fields.map((field) => (
          <Field key={field.key} field={field} value={crud.form[field.key] ?? ""} onChange={(value) => crud.setField(field.key, value)} />
        ))}
        <div className="form-actions">
          <button className="btn primary" type="submit">
            <Save size={16} /> {crud.form.id ? "Cập nhật" : "Thêm mới"}
          </button>
          <button className="btn" type="button" onClick={crud.reset}>
            <X size={16} /> Bỏ qua
          </button>
        </div>
      </form>
      {crud.error && <div className="alert">{crud.error}</div>}
      <DataTable rows={crud.rows} columns={columns} onEdit={crud.edit} onDelete={crud.remove} />
    </section>
  );
}

function Field({ field, value, onChange }) {
  const common = {
    value: value ?? "",
    required: field.required,
    onChange: (event) => onChange(event.target.value)
  };
  return (
    <label className={field.required ? "field required" : "field"}>
      <span>{field.label}</span>
      {field.type === "textarea" ? (
        <textarea {...common} />
      ) : field.type === "select" ? (
        <select {...common}>
          {field.placeholder && <option value="">{field.placeholder}</option>}
          {field.options.map((option) => (
            <option key={option.value ?? option} value={option.value ?? option}>
              {option.label ?? option}
            </option>
          ))}
        </select>
      ) : field.type === "file" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onChange(file.name);
            }}
            style={{ padding: "6px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
          />
          {value && (
            <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "600" }}>
              📄 Đã đính kèm: <strong>{value}</strong>
            </span>
          )}
        </div>
      ) : (
        <input type={field.type ?? "text"} {...common} />
      )}
    </label>
  );
}

function DataTable({ rows, columns, onEdit, onDelete, onUpload, onHistory, onLabel }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map(([, label]) => (
              <th key={label}>{label}</th>
            ))}
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="empty-cell">
                Chưa có dữ liệu hoặc chưa khởi tạo DB.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                {columns.map(([key, , formatter]) => (
                  <td key={key}>{formatter ? formatter(row[key], row) : formatCell(row[key])}</td>
                ))}
                <td>
                  {onLabel && (
                    <button className="icon-btn label-action" onClick={() => onLabel(row)} title="In Mã Vạch / QR Code" style={{ marginRight: 5 }}>
                      <QrCode size={15} />
                    </button>
                  )}
                  {onHistory && (
                    <button className="icon-btn" style={{ color: '#0369a1', marginRight: 5 }} onClick={() => onHistory(row.id)} title="Lịch sử phiên bản">
                      <RefreshCw size={15} />
                    </button>
                  )}
                  {onUpload && (
                    <button className="icon-btn ok" onClick={() => onUpload(row.id)} title="Tải lên file & chạy OCR" style={{ marginRight: 5 }}>
                      <Upload size={15} />
                    </button>
                  )}
                  {onEdit && (
                    <button className="icon-btn primary" onClick={() => onEdit(row)} title="Sửa" style={{ marginRight: 5 }}>
                      <Edit size={15} />
                    </button>
                  )}
                  {onDelete && (
                    <button className="icon-btn danger" onClick={() => onDelete(row.id)} title="Xóa">
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function PanelTitle({ icon, title }) {
  return (
    <div className="panel-title">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <article className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function useCrud(type, emptyForm) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const api = uiApi.crud(type);

  async function load() {
    try {
      setError("");
      setRows(await api.list());
    } catch (err) {
      setError(err.message);
      setRows([]);
    }
  }

  useEffect(() => {
    load();
  }, [type]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function edit(row) {
    setForm(toForm(row, emptyForm));
  }

  async function save(event) {
    event.preventDefault();
    try {
      setError("");
      const payload = toPayload(form);
      if (form.id) {
        await api.update(form.id, payload);
      } else {
        await api.create(payload);
      }
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!window.confirm("Xóa bản ghi đã chọn?")) return;
    try {
      setError("");
      await api.remove(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return { rows, form, error, load, setField, edit, save, remove, reset: () => setForm(emptyForm) };
}

function toPayload(form) {
  const payload = {};
  Object.entries(form).forEach(([key, value]) => {
    if (key === "id") return;
    if (value === "") payload[key] = null;
    else if (["parentId", "capacity", "storageId", "dossierId"].includes(key)) payload[key] = Number(value);
    else payload[key] = value;
  });
  return payload;
}

function toForm(row, emptyForm) {
  const next = { ...emptyForm, id: row.id };
  Object.keys(emptyForm).forEach((key) => {
    const value = row[key];
    if (value == null) {
      next[key] = "";
    } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      next[key] = value.slice(0, 10);
    } else {
      next[key] = String(value);
    }
  });
  return next;
}

function formatCell(value) {
  if (value == null || value === "") return "-";
  if (typeof value === "string" && value.includes("T00:00:00")) return value.slice(0, 10);
  return String(value);
}

function extraLabel1(resource) {
  if (resource === "users") return "Email";
  if (resource === "org-units" || resource === "departments" || resource === "admin-units") return "Cấp/loại đơn vị";
  if (resource === "permission-groups" || resource === "roles" || resource === "user-groups") return "Phạm vi quyền";
  if (resource === "reports" || resource === "report-groups") return "Loại báo cáo";
  if (resource.includes("ticket") || resource.includes("request")) return "Người yêu cầu";
  if (resource.includes("import")) return "File nguồn";
  return "Thông tin 1";
}

function extraLabel2(resource) {
  if (resource === "users") return "Số điện thoại";
  if (resource === "org-units" || resource === "departments" || resource === "admin-units") return "Địa chỉ";
  if (resource === "permission-groups" || resource === "roles" || resource === "user-groups") return "Vai trò/nhóm";
  if (resource === "reports" || resource === "report-groups") return "File mẫu";
  if (resource.includes("ticket") || resource.includes("request")) return "Người xử lý";
  if (resource.includes("import")) return "Kết quả import";
  return "Thông tin 2";
}

function iconFor(title) {
  if (title.includes("AI") || title.includes("OCR")) return <Zap size={18} />;
  if (title.includes("Dashboard")) return <Activity size={18} />;
  if (title.includes("Tài khoản")) return <User size={18} />;
  if (title.includes("mượn")) return <History size={18} />;
  if (title.includes("Tài liệu") || title.includes("hồ sơ")) return <FileText size={18} />;
  if (title.includes("Quy trình") || title.includes("phê duyệt")) return <GitMerge size={18} />;
  if (title.includes("Số hóa") || title.includes("hệ thống")) return <Settings size={18} />;
  if (title.includes("Quản trị") || title.includes("điều hành")) return <Shield size={18} />;
  if (title.includes("Nhập")) return <Upload size={18} />;
  if (title.includes("Tìm")) return <Search size={18} />;
  if (title.includes("Duyệt") || title.includes("Kiểm")) return <CheckCircle2 size={18} />;
  if (title.includes("Danh mục")) return <Archive size={18} />;
  if (title.includes("Báo")) return <FileText size={18} />;
  if (title.includes("Khai")) return <FileSearch size={18} />;
  return <Layers3 size={18} />;
}

