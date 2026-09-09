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
      setNotice({ type: "error", text: `Không tải được dữ liệu báo cáo: ${error.message}` });
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
        ["CHỈ TIÊU BÁO CÁO THỐNG KÊ", "GIÁ TRỊ", "ĐƠN VỊ", "BIẾN ĐỘNG"],
        ...(dashboard.kpis || []).map(item => [item.label, item.value, item.unit, `${Number(item.changePercent) > 0 ? "+" : ""}${item.changePercent}%`]),
        [],
        ["STT", "CÁN BỘ", "PHÒNG BAN", "HỒ SƠ XỬ LÝ", "THỜI GIAN TB (GIỜ)", "ĐÚNG HẠN (SLA)"],
        ...(dashboard.performanceRanking || []).map((item, idx) => [idx + 1, item.employeeName, item.department, item.processedDossiers, item.averageHours, `${item.onTimeRate}%`])
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
      setNotice({ type: "success", text: "Đã xuất báo cáo Excel thành công." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function exportPdf() {
    const reportWindow = window.open("", "_blank", "width=1100,height=760");
    if (!reportWindow) {
      setNotice({ type: "error", text: "Trình duyệt đang chặn cửa sổ xuất PDF. Vui lòng cho phép popup để xem bản in." });
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
            h1{font-size:22px;margin:0 0 6px;color:#0f172a}
            p{color:#64748b;margin:0 0 18px;font-size:13px}
            table{width:100%;border-collapse:collapse;margin-top:14px;font-size:13px}
            th,td{border:1px solid #cbd5e1;padding:8px 10px;text-align:left}
            th{background:#f1f5f9;font-weight:600}
            h3{margin:20px 0 8px;font-size:15px;color:#334155}
          </style></head>
          <body>
            <h1>${escapeHtml(featureName)}</h1>
            <p>Thời gian thống kê: Từ ${escapeHtml(filters.fromDate)} đến ${escapeHtml(filters.toDate)} | Đơn vị: ${escapeHtml(filters.department || "Toàn đơn vị")}</p>
            <h3>1. Chỉ tiêu vận hành chính (KPI)</h3>
            <table><thead><tr><th>Chỉ số</th><th>Giá trị</th><th>Đơn vị tính</th><th>Biến động kỳ</th></tr></thead><tbody>
              ${(dashboard.kpis || []).map(item => `<tr><td>${escapeHtml(item.label)}</td><td><strong>${escapeHtml(item.value)}</strong></td><td>${escapeHtml(item.unit)}</td><td>${Number(item.changePercent) > 0 ? "+" : ""}${escapeHtml(item.changePercent)}%</td></tr>`).join("")}
            </tbody></table>
            <h3>2. Bảng xếp hạng hiệu suất cán bộ</h3>
            <table><thead><tr><th>STT</th><th>Họ tên cán bộ</th><th>Đơn vị / Phòng ban</th><th>Hồ sơ xử lý</th><th>Giờ TB</th><th>Tỷ lệ đúng hạn</th></tr></thead><tbody>
              ${(dashboard.performanceRanking || []).map((item, idx) => `<tr><td>${idx + 1}</td><td><strong>${escapeHtml(item.employeeName)}</strong></td><td>${escapeHtml(item.department)}</td><td>${item.processedDossiers}</td><td>${item.averageHours}h</td><td>${item.onTimeRate}%</td></tr>`).join("")}
            </tbody></table>
            <script>window.onload=()=>window.print();<\/script>
          </body>
        </html>
      `);
      reportWindow.document.close();
      setNotice({ type: "success", text: "Đã mở bản in PDF báo cáo." });
    } catch (error) {
      reportWindow.close();
      setNotice({ type: "error", text: error.message });
    }
  }

  const filterPanel = (
    <form className="gd21013-filter" onSubmit={applyFilters}>
      <label>Từ ngày
        <input type="date" value={filters.fromDate} onChange={event => setFilter("fromDate", event.target.value)} />
      </label>
      <label>Đến ngày
        <input type="date" value={filters.toDate} onChange={event => setFilter("toDate", event.target.value)} />
      </label>
      <label>Phòng ban
        <select value={filters.department} onChange={event => setFilter("department", event.target.value)}>
          <option value="">Toàn đơn vị</option>
          <option value="Hành chính">Hành chính</option>
          <option value="Tài chính">Tài chính</option>
          <option value="Nhân sự">Nhân sự</option>
          <option value="Pháp chế">Pháp chế</option>
        </select>
      </label>
      <label>Loại hồ sơ
        <select value={filters.dossierType} onChange={event => setFilter("dossierType", event.target.value)}>
          <option value="">Tất cả</option>
          <option value="Hành chính">Hành chính</option>
          <option value="Tài chính">Tài chính</option>
          <option value="Nhân sự">Nhân sự</option>
          <option value="Pháp chế">Pháp chế</option>
        </select>
      </label>
      <button className="btn primary" type="submit" disabled={loading}><Search size={14}/> Lọc</button>
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
        <div className="gd21013-panel-head"><BarChart2 size={16}/> Hồ sơ nhập mới theo tháng</div>
        <div className="gd21013-bar-chart">
          {(dashboard.newDossierTrend || []).map(item => (
            <div className="gd21013-bar" key={item.label}>
              <span style={{ height: `${Math.max(8, Number(item.value) / maxNew * 100)}%`, background: item.color }} title={`${item.label}: ${item.value} hồ sơ`}></span>
              <em>{item.label}</em>
            </div>
          ))}
        </div>
      </div>
      <div className="gd21013-chart-panel">
        <div className="gd21013-panel-head"><Activity size={16}/> Tần suất mượn trả tài liệu</div>
        <div className="gd21013-line-bars">
          {(dashboard.borrowReturnTrend || []).map(item => (
            <div className="gd21013-rowbar" key={`${item.category}-${item.label}`}>
              <label>{item.label} ({item.category})</label>
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
        <div className="gd21013-panel-head"><PieChart size={16}/> Tỷ lệ trạng thái & SLA duyệt</div>
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
        <div className="gd21013-panel-head"><User size={16}/> Bảng xếp hạng hiệu suất cán bộ</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Cán bộ</th><th>Phòng ban</th><th>Hồ sơ</th><th>Giờ TB</th><th>SLA</th></tr></thead>
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
          <button className="btn primary" type="button" onClick={() => loadDashboard(filters)} disabled={loading}><RefreshCw size={14}/> Tải lại</button>
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
