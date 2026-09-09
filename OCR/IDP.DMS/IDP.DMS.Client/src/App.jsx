import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import {
  Archive, BookOpen, CheckCircle2, Database, FileSearch, FileText, FolderTree, Home,
  Layers3, Plus, RefreshCw, Save, Search, Send, Trash2, Upload, PieChart,
  Download, History, Edit, Settings, GitMerge, X, Eye, Shield, Link, PenTool,
  Activity, Bell, ChevronRight, AlertCircle, Clock, User, Zap, BarChart2,
  Lock, Mail, MessageSquare, Wifi, WifiOff, LogOut, QrCode
} from "lucide-react";
import { uiApi } from "./services/uiApi";
import LoginScreen from "./components/LoginScreen";

// ── Lazy-loaded heavy components ──────────────────────────────────────────────
const ArchiveLabelModal = lazy(() => import("./components/ArchiveLabelModal"));
const TechnicalModelViewer = lazy(() => import("./components/TechnicalModelViewer"));

// ── Screen components ─────────────────────────────────────────────────────────
import StorageScreen from "./components/screens/StorageScreen";
import DossierScreen from "./components/screens/DossierScreen";
import SearchScreen, { BorrowApprovalScreen, BorrowScreen } from "./components/screens/SearchAndBorrowScreens";
import DocumentManagementScreen from "./components/screens/DocumentManagementScreen";
import ApprovalScreen from "./components/screens/ApprovalScreen";
import DashboardReportScreen from "./components/screens/DashboardReportScreen";
import DigitizeReviewScreen from "./components/screens/DigitizeReviewScreen";
import BatchImportScreen from "./components/screens/BatchImportScreen";
import PermissionScreen from "./components/screens/PermissionScreen";
import OcrScreen from "./components/screens/OcrScreen";
import IntegrationScreen from "./components/screens/IntegrationScreen";
import WorkflowBuilderScreen from "./components/screens/WorkflowBuilderScreen";
import AdminScreen, { ReportCrudScreen, ReportScreen } from "./components/screens/AdminReportScreens";
import SimpleResourceScreen from "./components/screens/SimpleResourceScreen";
import NotificationHub from "./components/shared/NotificationHub";
import UserGuideScreen from "./components/screens/UserGuideScreen";

// ── Phase 2 (GD2) Screen components ───────────────────────────────────────────
import GD21DocumentScreen from "./components/screens/GD21DocumentScreen";
import GD22WorkflowScreen, { GD22WorkflowScreenV2 } from "./components/screens/GD22WorkflowScreen";
import GD23PermissionScreen from "./components/screens/GD23PermissionScreen";
import GD26OcrScreen from "./components/screens/GD26OcrScreen";
import GD2619OcrConfirmationScreen from "./components/screens/GD2619OcrConfirmationScreen";
import GD27IntegrationScreen from "./components/screens/GD27IntegrationScreen";
import GD29PdfSignatureScreen from "./components/screens/GD29PdfSignatureScreen";
import GD21013ExecutiveDashboardScreen from "./components/screens/GD21013ExecutiveDashboardScreen";
import GD211DocumentVersionScreen from "./components/screens/GD211DocumentVersionScreen";
import GD212UnitCustomizationScreen from "./components/screens/GD212UnitCustomizationScreen";
import GD21415SecurityDataScreen from "./components/screens/GD21415SecurityDataScreen";
import GD216SharedDossierTypeScreen from "./components/screens/GD216SharedDossierTypeScreen";
import GD220ReviewSupplementScreen from "./components/screens/GD220ReviewSupplementScreen";
import GD2NotificationScreen from "./components/screens/GD2NotificationScreen";
import GD22526DossierBorrowScreen from "./components/screens/GD22526DossierBorrowScreen";

// ── Shared utilities ──────────────────────────────────────────────────────────
import { moduleMap, itemResourceMap, designMenuGroups } from "./utils/constants";
import { repairDisplayedText, repairRenderedText, normalizeMenuGroups, mergeMenuWithDesign } from "./utils/textUtils";
import { iconFor } from "./components/shared/CrudComponents";

// ── RBAC Menu filtering ───────────────────────────────────────────────────────
function getPermittedMenuGroups(rawMenu, user) {
  if (!user || !rawMenu?.length) return rawMenu || [];
  const role = (user.roleCode || user.role || "").toUpperCase();

  // 1. Quản trị hệ thống toàn quyền: Xem tất cả 6 phân hệ
  if (role === "SYSTEM_ADMIN" || role === "QTHT") {
    return rawMenu;
  }

  // 2. Quản trị đơn vị cấp tỉnh/sở: Xem toàn bộ nghiệp vụ (trừ Cấu hình hệ thống)
  if (role === "ADMIN" || role === "QTĐV" || role === "UNIT_ADMIN") {
    return rawMenu.filter((g) => g.title !== "Cấu hình hệ thống" && g.title !== "Quản trị hệ thống");
  }

  // 3. Chuyên viên nhập liệu số hóa: Tạo kho, Bóc tách, Tra cứu
  if (role === "ARCHIVIST" || role === "DATA_ENTRY" || role === "NHAP_LIEU") {
    const allowed = [
      "Tạo kho & Thêm dữ liệu",
      "Chọn kho & Bóc tách dữ liệu",
      "Số hóa & OCR",
      "Quản lý Hồ sơ",
      "Tra cứu & Mượn trả",
      "Nhập liệu",
      "Danh mục",
      "Tìm kiếm"
    ];
    return rawMenu.filter((g) => allowed.includes(g.title));
  }

  // 4. Cán bộ kiểm duyệt & Ký số: Kiểm duyệt văn bản, Tra cứu & Mượn trả, Báo cáo & Thống kê
  if (role === "REVIEWER" || role === "APPROVER" || role === "MANAGER" || role === "KIEM_DUYET" || role === "LANH_DAO") {
    const allowed = [
      "Kiểm duyệt văn bản đã tách",
      "Kiểm duyệt",
      "Tra cứu & Mượn trả",
      "Báo cáo & Thống kê",
      "Duyệt phiếu",
      "Khai thác",
      "Tìm kiếm",
      "Báo cáo"
    ];
    return rawMenu.filter((g) => allowed.includes(g.title));
  }

  // 5. Độc giả tra cứu & mượn hồ sơ: Tra cứu & Mượn trả
  if (role === "READER" || role === "PUBLIC" || role === "VIEWER" || role === "DOC_GIA") {
    const allowed = ["Tra cứu & Mượn trả", "Khai thác", "Tìm kiếm"];
    return rawMenu.filter((g) => allowed.includes(g.title));
  }

  return rawMenu;
}

// ── Helper: đọc màn hình khởi tạo từ query param URL (?screen=...) ─────────────
function initialMenuSelection() {
  const requestedItem = new URLSearchParams(window.location.search).get("screen");
  if (requestedItem === "Hướng dẫn sử dụng" || requestedItem === "user-guide") {
    return { group: "Trợ giúp & Hướng dẫn", item: "Hướng dẫn sử dụng" };
  }
  const requestedGroup = designMenuGroups.find((group) => group.items.includes(requestedItem));
  return requestedGroup
    ? { group: requestedGroup.title, item: requestedItem }
    : { group: "Tạo kho & Thêm dữ liệu", item: "Quản lý Kho - Kệ - Hộp" };
}

// ── Root application component ────────────────────────────────────────────────
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

  const permittedMenu = useMemo(() => {
    return getPermittedMenuGroups(menu, currentUser);
  }, [menu, currentUser]);

  // Đồng bộ nhóm đang chọn khi danh sách quyền thay đổi
  useEffect(() => {
    if (!permittedMenu.length) return;
    // Bỏ qua không reset nếu người dùng đang xem Cẩm nang / Hướng dẫn sử dụng
    if (activeGroup === "Trợ giúp & Hướng dẫn" || activeItem === "Hướng dẫn sử dụng" || itemResourceMap[activeItem] === "user-guide") {
      return;
    }
    const currentGroupPermitted = permittedMenu.find((g) => g.title === activeGroup);
    if (!currentGroupPermitted) {
      const defaultGroup = permittedMenu[0];
      setActiveGroup(defaultGroup.title);
      setActiveItem(defaultGroup.items[0]);
    } else if (!currentGroupPermitted.items.includes(activeItem)) {
      setActiveItem(currentGroupPermitted.items[0]);
    }
  }, [permittedMenu, activeGroup, activeItem]);

  // Khởi tạo phiên đăng nhập & xác thực
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

  // Tự động sửa lỗi hiển thị ký tự UTF-8 mojibake
  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return undefined;
    const repair = () => repairRenderedText(root);
    repair();
    const observer = new MutationObserver(repair);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  // Tải danh mục menu từ API backend (tự động fallback sang designMenuGroups nếu backend chưa sẵn sàng)
  useEffect(() => {
    uiApi.menu().then((groups) => {
      const normalizedGroups = normalizeMenuGroups(groups);
      if (normalizedGroups.length) setMenu(mergeMenuWithDesign(normalizedGroups, designMenuGroups));
      if (groups.length && !activeGroup) {
        setActiveGroup(normalizedGroups[0].title);
        setActiveItem(normalizedGroups[0].items[0]);
      }
    }).catch(() => {
      setMenu(designMenuGroups);
    });
  }, []);

  const activeResource = itemResourceMap[activeItem] ?? moduleMap[activeGroup] ?? "dossiers";

  function selectMenu(groupTitle, item) {
    setActiveGroup(repairDisplayedText(groupTitle));
    setActiveItem(repairDisplayedText(item));
    setMessage("");
  }

  function openUserGuide() {
    setActiveGroup("Trợ giúp & Hướng dẫn");
    setActiveItem("Hướng dẫn sử dụng");
    setMessage("");
  }

  function openWorkflowReview(context) {
    const workflowItem = "Hồ sơ chờ phê duyệt";
    const workflowGroup = menu.find((group) => group.items?.includes(workflowItem));
    setWorkflowHandoff(context || null);
    setActiveGroup(workflowGroup?.title || "Kiểm duyệt văn bản đã tách");
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

  const userRole = (currentUser?.roleCode || currentUser?.role || "").toUpperCase();
  const isSysAdmin = userRole === "SYSTEM_ADMIN" || userRole === "QTHT";
  // Chỉ hiển thị các công cụ kỹ thuật (Khởi tạo DB, Bỏ qua đăng nhập, Đổi vai trò Demo) cho Quản trị viên
  const canSeeDevTools = isSysAdmin;

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

        <div className="top-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Thông tin người dùng hiện tại */}
          <div className="current-user" title={currentUser.permissions?.join(", ")}>
            <User size={18} />
            <span>
              <strong>{currentUser.fullName}</strong>
              <small>{currentUser.roleName || currentUser.roleCode}</small>
            </span>
          </div>

          {/* Nhãn kỹ thuật - chỉ hiển thị cho Quản trị viên */}
          {canSeeDevTools && authBypassEnabled && (
            <span className="auth-bypass-badge" title="Đang chạy ở chế độ bỏ qua đăng nhập">Bỏ qua đăng nhập</span>
          )}

          <div style={{ height: "22px", width: "1px", background: "#e2e8f0", margin: "0 2px" }} />

          {/* Thông báo */}
          <NotificationHub onOpenNotifications={() => selectMenu("Kiểm duyệt văn bản đã tách", "Hồ sơ yêu cầu bổ sung")} />

          {/* Các nút tiện ích nghiệp vụ */}
          <button
            className="btn"
            type="button"
            onClick={openUserGuide}
            title="Xem cẩm nang hướng dẫn sử dụng và mẹo xử lý sự cố"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: activeItem === "Hướng dẫn sử dụng" ? "#dcfce7" : "#f0fdf4",
              color: "#166534",
              borderColor: "#86efac",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            <BookOpen size={15} /> Hướng dẫn sử dụng
          </button>
          <button className="btn" type="button" onClick={() => window.print()} title="In / xuất PDF">
            <Download size={15} /> In / xuất PDF
          </button>
          <button className="btn" type="button" onClick={() => window.location.reload()} title="Làm mới trang">
            <RefreshCw size={15} /> Làm mới
          </button>

          {/* Các nút kỹ thuật - chỉ hiển thị cho Quản trị hệ thống */}
          {canSeeDevTools && (
            <>
              <button
                className="btn db-action"
                type="button"
                onClick={initializeDatabase}
                title="Khởi tạo hoặc kiểm tra bảng dữ liệu Oracle"
                style={{ background: "#f8fafc", borderColor: "#cbd5e1" }}
              >
                <Database size={15} /> Khởi tạo DB
              </button>
              {!authBypassEnabled && (
                <button
                  className="btn"
                  type="button"
                  onClick={handleLogout}
                  title="Đăng xuất và mở bảng chọn nhanh vai trò Demo"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    borderColor: "#bfdbfe",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  <Zap size={14} color="#eab308" fill="#eab308" /> Đổi vai trò Demo
                </button>
              )}
            </>
          )}

          {/* Nút đăng xuất luôn có sẵn */}
          <button
            className="btn logout-action"
            type="button"
            onClick={handleLogout}
            title="Đăng xuất khỏi hệ thống"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#fee2e2",
              color: "#b91c1c",
              borderColor: "#fca5a5",
              fontWeight: 600,
              cursor: "pointer",
              marginLeft: "4px"
            }}
          >
            <LogOut size={15} /> Đăng xuất
          </button>
        </div>
      </header>

      <nav className="top-menu" aria-label="Điều hướng chức năng">
        <div className="top-menu-inner">
          {permittedMenu.map((group) => (
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

          {/* Nút Hướng dẫn sử dụng trên thanh menu */}
          <section className="side-group help-menu-group" style={{ flex: "0 0 auto", marginLeft: "auto", display: "flex", alignItems: "center" }}>
            <button
              className={activeItem === "Hướng dẫn sử dụng" ? "group-title active help-btn" : "group-title help-btn"}
              onClick={openUserGuide}
              style={{
                background: activeItem === "Hướng dẫn sử dụng" ? "#047857" : "rgba(255,255,255,0.18)",
                color: "#fff",
                fontWeight: 600,
                borderRadius: "6px",
                margin: "4px 0",
                minHeight: "36px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                border: "1px solid rgba(255,255,255,0.25)"
              }}
              title="Xem cẩm nang hướng dẫn sử dụng và mẹo xử lý sự cố"
            >
              <BookOpen size={15} />
              <span>Hướng dẫn sử dụng</span>
            </button>
          </section>
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
          {/* ── Giai đoạn 1 Screens ─────────────────────────────────── */}
          {activeResource === "storage" && <StorageScreen />}
          {activeResource === "dossiers" && (
            activeGroup === "Tìm kiếm" || activeGroup === "Khai thác" || activeGroup === "Tra cứu & Đăng ký mượn hồ sơ" || activeGroup === "Tra cứu & Mượn trả"
              ? <SearchScreen />
              : <DossierScreen mode={activeItem} />
          )}
          {activeResource === "borrow" && <BorrowApprovalScreen />}
          {activeResource === "reports" && <ReportCrudScreen />}
          {activeResource === "documents" && <DocumentManagementScreen />}
          {activeResource === "approval" && <ApprovalScreen title={activeItem} />}
          {activeResource === "report-dashboard" && <DashboardReportScreen onNavigate={selectMenu} />}
          {activeResource === "permission-groups" && <PermissionScreen title={activeItem} />}
          {activeResource === "digitize-review" && <DigitizeReviewScreen />}
          {activeResource === "ocr-screen" && <OcrScreen />}
          {activeResource === "integration-screen" && <IntegrationScreen />}
          {activeResource === "workflow-builder" && <WorkflowBuilderScreen />}
          {activeResource === "import-jobs" && <BatchImportScreen />}

          {/* ── Giai đoạn 2 Screens ─────────────────────────────────── */}
          {activeResource === "gd2-documents" && <GD21DocumentScreen />}
          {activeResource === "gd2-workflow" && <GD22WorkflowScreenV2 handoff={workflowHandoff} />}
          {activeResource === "gd2-permissions" && <GD23PermissionScreen />}
          {activeResource === "gd2-ocr" && <GD26OcrScreen onOpenWorkflow={openWorkflowReview} />}
          {activeResource === "gd2-integration" && <GD27IntegrationScreen />}
          {activeResource === "gd2-signature" && <GD29PdfSignatureScreen />}
          {activeResource === "gd2-reports" && <GD21013ExecutiveDashboardScreen mode="report" />}
          {activeResource === "gd2-document-versions" && <GD211DocumentVersionScreen />}
          {activeResource === "gd2-interface-workflow" && <GD212UnitCustomizationScreen />}
          {activeResource === "gd2-leadership" && <GD21013ExecutiveDashboardScreen mode="leadership" />}
          {activeResource === "gd2-security" && <GD21415SecurityDataScreen title={activeItem} />}
          {activeResource === "gd2-system-data" && <GD21415SecurityDataScreen title={activeItem} />}
          {activeResource === "gd2-dossier-types" && <GD216SharedDossierTypeScreen />}
          {activeResource === "gd2-confirmation" && (
            <GD2619OcrConfirmationScreen title={activeItem} onReviewReady={setWorkflowHandoff} onOpenWorkflow={openWorkflowReview} />
          )}
          {activeResource === "gd2-review-supplement" && <GD220ReviewSupplementScreen title={activeItem} />}
          {activeResource === "gd2-notifications" && <GD2NotificationScreen />}
          {activeResource === "gd2-dossier-system" && <GD22526DossierBorrowScreen mode="catalog" title={activeItem} />}
          {activeResource === "gd2-borrow-process" && <GD22526DossierBorrowScreen mode="borrow" title={activeItem} />}
          {activeResource === "user-guide" && <UserGuideScreen onNavigate={selectMenu} />}

          {/* ── Fallback: generic CRUD screen cho 27 bảng danh mục hệ thống ── */}
          {![
            "digitize-review", "storage", "dossiers", "documents", "ocr-screen", "integration-screen",
            "approval", "borrow", "reports", "report-dashboard", "permission-groups",
            "workflow-builder", "import-jobs",
            "gd2-documents", "gd2-workflow", "gd2-permissions", "gd2-ocr", "gd2-integration", "gd2-signature",
            "gd2-reports", "gd2-document-versions", "gd2-interface-workflow", "gd2-leadership", "gd2-security",
            "gd2-system-data", "gd2-dossier-types", "gd2-confirmation", "gd2-review-supplement",
            "gd2-notifications", "gd2-dossier-system", "gd2-borrow-process", "user-guide"
          ].includes(activeResource) && (
            <SimpleResourceScreen title={activeItem} resource={activeResource} group={activeGroup} />
          )}
        </section>
      </main>
    </div>
  );
}
