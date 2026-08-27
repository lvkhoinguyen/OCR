import { useState, useEffect } from "react";
import { Search, BarChart2, Activity, PieChart, User, RefreshCw, Download } from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { GD2FeatureLayout } from "../shared/SharedComponents";

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

export default function GD21013ExecutiveDashboardScreen({ mode = "report" }) {
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
