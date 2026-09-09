import { useState, useEffect, useMemo } from "react";
import {
  RefreshCw,
  Archive,
  Save,
  FileSearch,
  Plus,
  History,
  CheckCircle2,
  Upload,
  X,
} from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { Metric, GD2FeatureLayout } from "../shared/SharedComponents";
import { securityBadgeClass, securityLevelLabel } from "./GD21415SecurityDataScreen";

export function borrowStatusLabel(status, overdue) {
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

export function borrowStatusClass(status, overdue) {
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

export function exploitModeLabel(mode) {
  return {
    ONLINE_READ: "Đọc PDF trực tuyến",
    SOFT_COPY: "Tải bản mềm",
    HARD_COPY: "Mượn bản cứng"
  }[mode] || mode || "--";
}

export default function GD22526DossierBorrowScreen({ mode = "catalog", title }) {
  const [activeTab, setActiveTab] = useState("screen");
  const [dashboard, setDashboard] = useState({ dossiers: [], borrowRequests: [] });
  const [allDocs, setAllDocs] = useState([]);
  const [dossierSearch, setDossierSearch] = useState("");
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

  const selectedDossierDocs = useMemo(() => {
    if (!selectedDossier?.id) return [];
    return allDocs.filter(d => Number(d.dossierId) === Number(selectedDossier.id));
  }, [allDocs, selectedDossier]);

  const displayedDossiers = useMemo(() => {
    if (!dossierSearch.trim()) return dashboard.dossiers || [];
    const q = dossierSearch.trim().toLowerCase();
    return (dashboard.dossiers || []).filter(d =>
      `${d.code} ${d.title} ${d.dossierType || ""} ${d.storageLocation || ""}`.toLowerCase().includes(q)
    );
  }, [dashboard.dossiers, dossierSearch]);

  useEffect(() => {
    loadDossierBorrow();
  }, []);

  async function loadDossierBorrow(nextFilters = filters) {
    try {
      setLoading(true);
      const [result, docRes] = await Promise.all([
        uiApi.gd2.dossierBorrowDashboard(nextFilters),
        uiApi.crud("documents").list().catch(() => [])
      ]);
      setDashboard(result);
      setAllDocs(Array.isArray(docRes) ? docRes : (docRes?.items || []));
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
      if (action === "APPROVE") {
        try {
          await uiApi.gd2.approveBorrow(id, payload);
        } catch {
          await uiApi.approveBorrow(id, { approver: payload.actor, note: payload.note });
        }
      }
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
      <div style={{ marginBottom: "10px" }}>
        <input
          value={dossierSearch}
          onChange={e => setDossierSearch(e.target.value)}
          placeholder="🔍 Tìm kiếm mã hoặc tên hồ sơ cần mượn..."
          style={{ width: "100%", height: "36px", fontSize: "13px", padding: "0 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Hồ sơ ({displayedDossiers.length})</th><th>Bảo mật</th><th>Điều kiện</th><th>Hạn bản cứng</th></tr></thead>
          <tbody>
            {displayedDossiers.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Không tìm thấy hồ sơ nào.</td></tr>
            ) : (
              displayedDossiers.map(item => (
                <tr key={item.id} className={Number(selectedDossier?.id) === Number(item.id) ? "row-selected" : ""} onClick={() => setSelectedDossierId(item.id)}>
                  <td>
                    <strong>{item.code}</strong>
                    <span className="gd22526-sub">{item.title}</span>
                    <div style={{ fontSize: "11px", color: "#059669", marginTop: "2px" }}>
                      {item.status === "PUBLISHED" ? "● Đã xuất bản" : item.status === "APPROVED" ? "✓ Đã phê duyệt" : item.status}
                    </div>
                  </td>
                  <td><span className={securityBadgeClass(item.securityLevel)}>{securityLevelLabel(item.securityLevel)}</span></td>
                  <td><small>{item.borrowCondition}</small></td>
                  <td>{item.maxHardCopyBorrowDays} ngày</td>
                </tr>
              ))
            )}
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <strong>{selectedDossier?.code || "--"}</strong>
              <div style={{ fontWeight: "600", fontSize: "13px", color: "#0f172a" }}>{selectedDossier?.title || "Chưa chọn hồ sơ"}</div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                Kho: {selectedDossier?.storageLocation || "--"} · Trạng thái: {selectedDossier?.status || "PUBLISHED"}
              </div>
            </div>
            <span style={{ fontSize: "11px", background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "10px", fontWeight: "600" }}>
              {selectedDossierDocs.length} văn bản
            </span>
          </div>
          {selectedDossierDocs.length > 0 && (
            <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #cbd5e1", maxHeight: "120px", overflowY: "auto" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>Văn bản thành phần trong hồ sơ:</div>
              {selectedDossierDocs.map(d => (
                <div key={d.id} style={{ fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", color: "#334155" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }} title={d.title}>
                    📄 <strong>{d.code}</strong>: {d.title}
                  </span>
                  <span style={{ fontSize: "10px", color: "#059669", fontWeight: "600" }}>{d.status}</span>
                </div>
              ))}
            </div>
          )}
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
