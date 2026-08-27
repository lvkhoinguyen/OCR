import { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, Zap, Shield, Save } from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { GD2FeatureLayout } from "../shared/SharedComponents";

export default function GD23PermissionScreen() {
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
