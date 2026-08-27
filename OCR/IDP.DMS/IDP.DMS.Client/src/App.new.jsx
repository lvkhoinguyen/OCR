import { useEffect, useMemo, useState } from "react";
import { lazy, Suspense } from "react";
import {
  Archive, CheckCircle2, Database, FileSearch, FileText, FolderTree, Home,
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
import ApprovalScreen from "./components/screens/ApprovalScreen";
import PermissionScreen from "./components/screens/PermissionScreen";
import DashboardReportScreen from "./components/screens/DashboardReportScreen";
import IntegrationScreen from "./components/screens/IntegrationScreen";
import OcrScreen from "./components/screens/OcrScreen";
import DocumentManagementScreen from "./components/screens/DocumentManagementScreen";
import GD211DocumentVersionScreen from "./components/screens/GD211DocumentVersionScreen";
import WorkflowBuilderScreen from "./components/screens/WorkflowBuilderScreen";
import GD212UnitCustomizationScreen from "./components/screens/GD212UnitCustomizationScreen";
import GD216SharedDossierTypeScreen from "./components/screens/GD216SharedDossierTypeScreen";
import WorkflowManagementScreen from "./components/screens/WorkflowManagementScreen";
import GD219ConfirmationScreen from "./components/screens/GD219ConfirmationScreen";
import GD21DocumentScreen from "./components/screens/GD21DocumentScreen";
import GD22WorkflowScreen, { GD22WorkflowScreenV2 } from "./components/screens/GD22WorkflowScreen";
import GD23PermissionScreen from "./components/screens/GD23PermissionScreen";
import GD2619OcrConfirmationScreen from "./components/screens/GD2619OcrConfirmationScreen";
import GD26OcrScreen from "./components/screens/GD26OcrScreen";
import GD27IntegrationScreen from "./components/screens/GD27IntegrationScreen";
import GD29DigitalSignatureScreen from "./components/screens/GD29DigitalSignatureScreen";
import GD29PdfSignatureScreen from "./components/screens/GD29PdfSignatureScreen";
import GD29SignatureScreenV2 from "./components/screens/GD29SignatureScreenV2";
import GD29SignatureScreen from "./components/screens/GD29SignatureScreen";
import GD210ReportScreen from "./components/screens/GD210ReportScreen";
import GD21013ExecutiveDashboardScreen from "./components/screens/GD21013ExecutiveDashboardScreen";
import GD21415SecurityDataScreen from "./components/screens/GD21415SecurityDataScreen";
import GD2SystemDataScreen from "./components/screens/GD2SystemDataScreen";
import GD220ReviewSupplementScreen from "./components/screens/GD220ReviewSupplementScreen";
import GD2NotificationScreen from "./components/screens/GD2NotificationScreen";
import GD22526DossierBorrowScreen from "./components/screens/GD22526DossierBorrowScreen";
import GD2BusinessWorkspaceScreen from "./components/screens/GD2BusinessWorkspaceScreen";
import StorageScreen from "./components/screens/StorageScreen";
import DossierScreen from "./components/screens/DossierScreen";
import SearchScreen, { BorrowScreen } from "./components/screens/SearchAndBorrowScreens";
import BatchImportScreen from "./components/screens/BatchImportScreen";
import SimpleResourceScreen from "./components/screens/SimpleResourceScreen";
import AdminScreen, { ReportCrudScreen, ReportScreen } from "./components/screens/AdminReportScreens";
import { NotificationHub } from "./components/shared/NotificationHub";

// ── Shared utilities ──────────────────────────────────────────────────────────
import { moduleMap, itemResourceMap, designMenuGroups } from "./utils/constants";
import { repairDisplayedText, repairRenderedText, normalizeMenuGroups, mergeMenuWithDesign } from "./utils/textUtils";
import { iconFor } from "./components/shared/CrudComponents";

// ── Helper: read initial screen from URL query param ─────────────────────────
function initialMenuSelection() {
  const requestedItem = new URLSearchParams(window.location.search).get("screen");
  const requestedGroup = designMenuGroups.find((group) => group.items.includes(requestedItem));
  return requestedGroup
    ? { group: requestedGroup.title, item: requestedItem }
    : { group: "Nhập liệu", item: "GĐ2-1 Quản lý tài liệu" };
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

  // Auth initialization
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

  // Mojibake text repair observer
  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return undefined;
    const repair = () => repairRenderedText(root);
    repair();
    const observer = new MutationObserver(repair);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  // Menu initialization from API (falls back to design menu on error)
  useEffect(() => {
    uiApi.menu()
      .then((groups) => {
        const normalizedGroups = normalizeMenuGroups(groups);
        if (normalizedGroups.length) setMenu(mergeMenuWithDesign(normalizedGroups, designMenuGroups));
        if (groups.length && !activeGroup) {
          setActiveGroup(normalizedGroups[0].title);
          setActiveItem(normalizedGroups[0].items[0]);
        }
      })
      .catch(() => {
        // Backend có thể chưa chạy trong lúc dựng/kiểm tra UI. Giữ menu thiết kế.
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
    const workflowGroup = menu.find((group) => group.items?.includes(workflowItem));
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
          <button className="btn" type="button" onClick={() => window.print()}><Download size={16} /> In / xuất PDF</button>
          <button className="btn" type="button" onClick={() => window.location.reload()}><RefreshCw size={16} /> Làm mới</button>
          <button className="btn db-action" type="button" onClick={initializeDatabase}><Database size={16} /> Khởi tạo DB</button>
          {!authBypassEnabled && <button className="btn logout-action" type="button" onClick={handleLogout}><LogOut size={16} /> Đăng xuất</button>}
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
          {/* ── Phase 1 Screens ─────────────────────────────────────── */}
          {activeResource === "storage" && <StorageScreen />}
          {activeResource === "dossiers" && (
            activeGroup === "Tìm kiếm" || activeGroup === "Khai thác" || activeGroup === "Tra cứu & Đăng ký mượn hồ sơ"
              ? <SearchScreen />
              : <DossierScreen mode={activeItem} />
          )}
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

          {/* ── Phase 2 (GD2) Screens ────────────────────────────────── */}
          {activeResource === "gd2-documents" && <GD21DocumentScreen />}
          {activeResource === "gd2-workflow" && <GD22WorkflowScreenV2 handoff={workflowHandoff} />}
          {activeResource === "gd2-permissions" && <GD23PermissionScreen />}
          {activeResource === "gd2-ocr" && (
            <GD2619OcrConfirmationScreen title={activeItem} onReviewReady={setWorkflowHandoff} onOpenWorkflow={openWorkflowReview} />
          )}
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

          {/* ── Fallback: generic CRUD screen for admin resources ────── */}
          {![
            "storage", "dossiers", "documents", "ocr-screen", "integration-screen",
            "approval", "borrow", "reports", "report-dashboard", "permission-groups",
            "workflow-builder", "import-jobs",
            "gd2-documents", "gd2-workflow", "gd2-permissions", "gd2-ocr", "gd2-integration", "gd2-signature",
            "gd2-reports", "gd2-document-versions", "gd2-interface-workflow", "gd2-leadership", "gd2-security",
            "gd2-system-data", "gd2-dossier-types", "gd2-confirmation", "gd2-review-supplement",
            "gd2-notifications", "gd2-dossier-system", "gd2-borrow-process",
          ].includes(activeResource) && (
            <SimpleResourceScreen title={activeItem} resource={activeResource} group={activeGroup} />
          )}
        </section>
      </main>
    </div>
  );
}
