import { useState, useEffect } from "react";
import { Search, Plus, RefreshCw, FileSearch, AlertCircle, X, Link } from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { GD2FeatureLayout, Metric } from "../shared/SharedComponents";

export default function GD216SharedDossierTypeScreen() {
  const [activeTab, setActiveTab] = useState("screen");
  const [records, setRecords] = useState([]);
  const [unitFilter, setUnitFilter] = useState("");
  const [form, setForm] = useState({
    code: "HS-NS",
    name: "Ho so nhan su",
    unitCode: "BAN2",
    storageScope: "COMMON",
    sharedUnitCodesText: "BAN1",
    retentionPeriod: "Vĩnh viễn"
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
        <label>Thời hạn bảo quản
          <select value={form.retentionPeriod} onChange={event => setField("retentionPeriod", event.target.value)}>
            <option value="Vĩnh viễn">Vĩnh viễn</option>
            <option value="5 năm">5 năm</option>
            <option value="10 năm">10 năm</option>
            <option value="20 năm">20 năm</option>
            <option value="50 năm">50 năm</option>
          </select>
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
