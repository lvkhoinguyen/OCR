import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { Metric, GD2FeatureLayout } from "../shared/SharedComponents";

export default function GD2SystemDataScreen() {
  const [activeTab, setActiveTab] = useState("screen");
  const [summary, setSummary] = useState({ sources: [], totalRecords: 0, checkedAt: null });
  const [error, setError] = useState("");

  useEffect(() => {
    loadSystemData();
  }, []);

  async function loadSystemData() {
    try {
      setError("");
      setSummary(await uiApi.gd2.systemDataSummary());
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  const leftPanel = (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Mã nguồn</th><th>Nguồn dữ liệu</th><th>Số bản ghi</th><th>Trạng thái</th></tr></thead>
        <tbody>
          {summary.sources.map(source => (
            <tr key={source.code}>
              <td><span className="gd2-code">{source.code}</span></td>
              <td>{source.name}</td>
              <td>{source.recordCount.toLocaleString("vi-VN")}</td>
              <td><span className="vld-badge rule">{source.status === "READY" ? "Sẵn sàng" : source.status}</span></td>
            </tr>
          ))}
          {summary.sources.length === 0 && <tr><td colSpan="4" className="empty-cell">Chưa có dữ liệu.</td></tr>}
        </tbody>
      </table>
      {error && <div className="alert">{error}</div>}
    </div>
  );

  const rightPanel = (
    <div className="gd2-system-summary">
      <Metric label="Tổng bản ghi" value={summary.totalRecords.toLocaleString("vi-VN")} />
      <Metric label="Nguồn dữ liệu" value={String(summary.sources.length)} />
      <Metric label="Trạng thái" value={error ? "Có lỗi" : "Sẵn sàng"} />
      <Metric label="Kiểm tra cuối" value={summary.checkedAt ? new Date(summary.checkedAt).toLocaleString("vi-VN") : "--"} />
    </div>
  );

  return (
    <GD2FeatureLayout
      featureId="GĐ2-15"
      featureName="Dữ liệu hệ thống"
      description="Theo dõi tập trung nguồn dữ liệu nghiệp vụ, dữ liệu OCR và kho tập số hóa."
      actor="admin"
      actionBarLabel="Giám sát dữ liệu hệ thống"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="1.2fr 0.8fr"
      leftPanelTitle="Nguồn dữ liệu"
      rightPanelTitle="Tổng quan"
      actions={
        <button className="btn primary" onClick={loadSystemData}>
          <RefreshCw size={14}/> Kiểm tra dữ liệu
        </button>
      }
      actionRows={[
        { action: "Xem dữ liệu", description: "Theo dõi các nguồn dữ liệu đang kết nối", result: "Hiển thị số lượng và trạng thái từng nguồn" },
        { action: "Kiểm tra", description: "Kiểm tra khả dụng và đồng bộ dữ liệu", result: "Cập nhật thời gian kiểm tra gần nhất" },
        { action: "Sao lưu", description: "Tạo yêu cầu sao lưu dữ liệu hệ thống", result: "Ghi nhận tác vụ sao lưu" },
      ]}
      validationItems={[
        { type: "perm", label: "Phân quyền", text: "Chỉ quản trị viên được xem số liệu toàn hệ thống và thực hiện sao lưu." },
        { type: "rule", label: "Đồng bộ", text: "Nguồn dữ liệu phải sẵn sàng trước khi tổng hợp báo cáo." },
      ]}
      flowSteps={[
        { step: "1", label: "Kết nối", desc: "Kiểm tra nguồn dữ liệu", color: "#3264f4" },
        { step: "2", label: "Đối soát", desc: "Đếm và kiểm tra bản ghi", color: "#7c3aed" },
        { step: "3", label: "Đồng bộ", desc: "Cập nhật dữ liệu thay đổi", color: "#f59e0b" },
        { step: "4", label: "Sao lưu", desc: "Lưu bản dự phòng", color: "#22c55e" },
      ]}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}
