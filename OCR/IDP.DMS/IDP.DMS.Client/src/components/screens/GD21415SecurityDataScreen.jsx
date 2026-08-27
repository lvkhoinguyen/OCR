import { useState, useEffect } from "react";
import {
  Save,
  Eye,
  AlertCircle,
  Database,
  Activity,
  RefreshCw,
  Shield,
  Lock,
  Download,
} from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { Metric, GD2FeatureLayout } from "../shared/SharedComponents";

export function buildPieGradient(items, total) {
  let cursor = 0;
  const segments = items.map(item => {
    const start = cursor;
    const end = cursor + (Number(item.value || 0) / total) * 360;
    cursor = end;
    return `${item.color} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${segments.join(", ") || "#e2e8f0 0deg 360deg"})`;
}

export function securityLevelLabel(level) {
  return {
    THUONG: "Thường / Nội bộ",
    MAT: "Mật",
    TOI_MAT: "Tối mật",
    TUYET_MAT: "Tuyệt mật",
  }[level] || level || "Thường / Nội bộ";
}

export function securityBadgeClass(level) {
  return `gd21415-security-badge ${{
    THUONG: "blue",
    MAT: "red",
    TOI_MAT: "dark-red",
    TUYET_MAT: "purple",
  }[level] || "blue"}`;
}

export default function GD21415SecurityDataScreen({ title = "Bảo mật thông tin & Dữ liệu hệ thống" }) {
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
