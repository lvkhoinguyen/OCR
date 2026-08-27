import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { GD2FeatureLayout } from "../shared/SharedComponents";

export function notificationStatusLabel(status) {
  return {
    PENDING: "Chờ gửi",
    SENT: "Đã gửi",
    READ: "Đã đọc",
    FAILED: "Gửi lỗi",
  }[status] || status || "Không xác định";
}

export default function GD2NotificationScreen() {
  const [activeTab, setActiveTab] = useState("screen");
  const [selectedId, setSelectedId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const selected = notifications.find(item => item.id === selectedId) || notifications[0];

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      setError("");
      const rows = await uiApi.gd2.notifications();
      setNotifications(rows);
      setSelectedId(current => current || rows[0]?.id || null);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function markAsRead() {
    if (!selected) return;
    try {
      const updated = await uiApi.gd2.markNotificationRead(selected.id);
      setNotifications(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  async function resend() {
    if (!selected) return;
    try {
      const updated = await uiApi.gd2.resendNotification(selected.id);
      setNotifications(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  const leftPanel = (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Mã</th><th>Nội dung thông báo</th><th>Kênh gửi</th><th>Trạng thái</th></tr></thead>
        <tbody>
          {notifications.map(item => (
            <tr
              key={item.id}
              className={item.id === selectedId ? "row-selected" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <td><span className="gd2-code">{item.code}</span></td>
              <td>{item.title}</td>
              <td>{item.channel}</td>
              <td><span className="vld-badge rule">{notificationStatusLabel(item.status)}</span></td>
            </tr>
          ))}
          {notifications.length === 0 && <tr><td colSpan="4" className="empty-cell">Chưa có thông báo.</td></tr>}
        </tbody>
      </table>
      {error && <div className="alert">{error}</div>}
    </div>
  );

  const rightPanel = selected && (
    <div className="detail-grid">
      <div className="detail-row"><span>Mã thông báo</span><strong>{selected.code}</strong></div>
      <div className="detail-row"><span>Người nhận</span><strong>{selected.recipient}</strong></div>
      <div className="detail-row"><span>Kênh gửi</span><strong>{selected.channel}</strong></div>
      <div className="detail-row"><span>Trạng thái</span><strong>{notificationStatusLabel(selected.status)}</strong></div>
      <div className="detail-row"><span>Nội dung</span><span>{selected.title}</span></div>
    </div>
  );

  return (
    <GD2FeatureLayout
      featureId="GĐ2-21"
      featureName="Thông báo kết quả"
      description="Thông báo kết quả xử lý hồ sơ đến đúng người nhận qua kênh được cấu hình."
      actor="entry"
      actionBarLabel="Danh sách thông báo xử lý hồ sơ"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="1.25fr 0.75fr"
      leftPanelTitle="Thông báo gần đây"
      rightPanelTitle="Chi tiết thông báo"
      actions={
        <>
          <button className="btn primary" onClick={resend}><RefreshCw size={14}/> Gửi lại</button>
          <button className="btn" onClick={markAsRead}><CheckCircle2 size={14}/> Đánh dấu đã đọc</button>
        </>
      }
      actionRows={[
        { action: "Xem thông báo", description: "Chọn thông báo trong danh sách", result: "Hiển thị người nhận, kênh gửi và nội dung" },
        { action: "Gửi lại", description: "Gửi lại thông báo chưa thành công", result: "Cập nhật trạng thái đã gửi" },
        { action: "Đánh dấu đã đọc", description: "Xác nhận thông báo đã được tiếp nhận", result: "Cập nhật trạng thái đã đọc" },
      ]}
      validationItems={[
        { type: "required", label: "Bắt buộc", text: "Thông báo phải có người nhận, nội dung và ít nhất một kênh gửi." },
        { type: "perm", label: "Phân quyền", text: "Người dùng chỉ xem thông báo thuộc hồ sơ trong phạm vi đơn vị." },
      ]}
      flowSteps={[
        { step: "1", label: "Hoàn tất", desc: "Có kết quả xử lý hồ sơ", color: "#3264f4" },
        { step: "2", label: "Tạo tin", desc: "Sinh nội dung thông báo", color: "#7c3aed" },
        { step: "3", label: "Gửi", desc: "Email hoặc trong hệ thống", color: "#f59e0b" },
        { step: "4", label: "Xác nhận", desc: "Ghi nhận trạng thái đọc", color: "#22c55e" },
      ]}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}
