import { useState, useEffect } from "react";
import { Save, Home, Eye, GitMerge, RefreshCw } from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { GD2FeatureLayout } from "../shared/SharedComponents";

export default function GD212UnitCustomizationScreen() {
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
