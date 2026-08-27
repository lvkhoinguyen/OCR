import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Download,
  FileText,
  RefreshCw,
  Eye,
  Edit,
  CheckCircle2,
  PenTool,
  Save,
  Shield,
} from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { StatusBadge, Metric, GD2FeatureLayout } from "../shared/SharedComponents";

export const gd2WorkspaceActions = ["VIEW", "CREATE", "EDIT", "DELETE", "APPROVE", "EXPORT", "SIGN", "DOWNLOAD"];

export default function GD2BusinessWorkspaceScreen({ title, feature = "GD2" }) {
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
