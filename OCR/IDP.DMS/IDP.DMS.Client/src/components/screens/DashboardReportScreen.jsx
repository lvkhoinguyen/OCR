import { useState } from "react";
import { PieChart, BarChart2, Clock, CheckCircle2, User } from "lucide-react";
import { PanelTitle } from "../shared/SharedComponents";

export default function DashboardReportScreen() {
  const [range, setRange] = useState("7d");
  const handleExport = (type) => alert(`Đang tải báo cáo: ${type}...`);

  const summaryCards = [
    { label: "Hồ sơ xử lý", value: "1.250", note: "+12% so với kỳ trước", color: "#2563eb", icon: <BarChart2 size={22} /> },
    { label: "Chờ phê duyệt", value: "38", note: "Cần theo dõi", color: "#f59e0b", icon: <Clock size={22} /> },
    { label: "Đúng hạn", value: "96%", note: "SLA đạt yêu cầu", color: "#16a34a", icon: <CheckCircle2 size={22} /> },
    { label: "Đơn vị đang trễ", value: "4", note: "Ưu tiên xử lý", color: "#dc2626", icon: <User size={22} /> },
  ];

  const teamRows = [
    { name: "Phòng Hành chính", handled: 312, approved: 298, onTime: "98%", backlog: 6 },
    { name: "Phòng Nhân sự", handled: 276, approved: 261, onTime: "95%", backlog: 8 },
    { name: "Phòng Kế toán", handled: 248, approved: 233, onTime: "94%", backlog: 9 },
    { name: "Phòng Vận hành", handled: 414, approved: 401, onTime: "97%", backlog: 15 },
  ];

  return (
    <section className="panel">
      <PanelTitle icon={<PieChart />} title="Theo dõi và phân tích cho lãnh đạo" />
      <p className="muted" style={{ marginBottom: 16 }}>Giám sát khối lượng xử lý, tiến độ phê duyệt và hiệu suất theo đơn vị.</p>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["24h", "7d", "30d"].map(item => (
            <button key={item} className={`btn ${range === item ? "primary" : ""}`} onClick={() => setRange(item)}>
              {item === "24h" ? "24 giờ" : item === "7d" ? "7 ngày" : "30 ngày"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn ok" onClick={() => handleExport("Excel")}>Xuất Excel</button>
          <button className="btn danger" onClick={() => handleExport("PDF")}>Xuất PDF</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, marginBottom: 20 }}>
        {summaryCards.map(card => (
          <div key={card.label} style={{ padding: 18, borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ color: card.color }}>{card.icon}</span>
              <span className="muted" style={{ fontSize: 12 }}>{range === "24h" ? "Hôm nay" : range === "7d" ? "7 ngày" : "30 ngày"}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{card.value}</div>
            <div style={{ marginTop: 8, fontWeight: 600 }}>{card.label}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{card.note}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Đơn vị</th>
                <th>Xử lý</th>
                <th>Đã duyệt</th>
                <th>Đúng hạn</th>
                <th>Tồn</th>
              </tr>
            </thead>
            <tbody>
              {teamRows.map(row => (
                <tr key={row.name}>
                  <td><strong>{row.name}</strong></td>
                  <td>{row.handled}</td>
                  <td>{row.approved}</td>
                  <td><span className="vld-badge rule">{row.onTime}</span></td>
                  <td>{row.backlog}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: 18, background: "#f8fafc" }}>
          <h4 style={{ marginTop: 0, marginBottom: 12 }}>Điểm nhấn điều hành</h4>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="detail-row"><span>Hồ sơ cần ưu tiên</span><strong>12</strong></div>
            <div className="detail-row"><span>Quy trình quá hạn</span><strong>3</strong></div>
            <div className="detail-row"><span>Đơn vị hiệu suất cao nhất</span><strong>Phòng Vận hành</strong></div>
            <div className="detail-row"><span>Tỷ lệ xử lý đúng hạn</span><strong>96%</strong></div>
          </div>
        </div>
      </div>
    </section>
  );
}
