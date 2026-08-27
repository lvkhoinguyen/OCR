import { useState, useEffect } from "react";
import { Bell, Mail, MessageSquare } from "lucide-react";
import { uiApi } from "../../services/uiApi";

export function notificationChannelIcon(channel) {
  const normalized = String(channel || "").toUpperCase();
  if (normalized === "EMAIL") return <Mail size={13}/>;
  if (normalized === "SMS") return <MessageSquare size={13}/>;
  return <Bell size={13}/>;
}

export default function NotificationHub({ onOpenNotifications }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadHub();
    const timer = window.setInterval(loadHub, 30000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadHub() {
    try {
      const rows = await uiApi.gd2.notifications({ recipient: "current-user" });
      setItems(rows.slice(0, 8));
    } catch {
      setItems([]);
    }
  }

  async function markRead(id) {
    try {
      const updated = await uiApi.gd2.markNotificationRead(id);
      setItems(current => current.map(item => item.id === updated.id ? updated : item));
    } catch {
      // Topbar hub should stay quiet if the API is temporarily unavailable.
    }
  }

  const unread = items.filter(item => item.status !== "READ").length;

  return (
    <div className="notification-hub">
      <button className="notification-trigger" type="button" onClick={() => setOpen(value => !value)} title="Thông báo">
        <Bell size={17}/>
        {unread > 0 && <span>{unread}</span>}
      </button>
      {open && (
        <div className="notification-popover">
          <div className="notification-head">
            <strong>Thông báo kết quả</strong>
            <button type="button" onClick={onOpenNotifications}>Xem tất cả</button>
          </div>
          <div className="notification-list">
            {items.map(item => (
              <button key={item.id} className={item.status === "READ" ? "notification-item read" : "notification-item"} type="button" onClick={() => markRead(item.id)}>
                <span className={`notification-channel ${item.channel?.toLowerCase() || "system"}`}>{notificationChannelIcon(item.channel)}</span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.content || item.channel}</small>
                </span>
              </button>
            ))}
            {items.length === 0 && <div className="empty-cell">Chưa có thông báo.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
