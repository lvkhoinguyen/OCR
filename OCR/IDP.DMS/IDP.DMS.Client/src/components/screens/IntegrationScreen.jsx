import { useState } from "react";
import { Link, Wifi, WifiOff, Clock, RefreshCw, Eye, Activity } from "lucide-react";
import { PanelTitle } from "../shared/SharedComponents";

export default function IntegrationScreen() {
  const [selectedSys, setSelectedSys] = useState(null);
  const [syncLog, setSyncLog] = useState([
    { time: "10:32 hôm nay", sys: "ERP Oracle", status: "success", msg: "Đồng bộ 142 bản ghi hồ sơ" },
    { time: "09:15 hôm nay", sys: "Kế toán MISA", status: "success", msg: "Đồng bộ 37 chứng từ" },
    { time: "08:00 hôm nay", sys: "Email Server", status: "error", msg: "Timeout kết nối, thử lại sau" },
    { time: "Hôm qua 17:00", sys: "ERP Oracle", status: "success", msg: "Đồng bộ 89 bản ghi" },
  ]);

  const systems = [
    { id: 1, name: "ERP Oracle", type: "ERP", status: "connected", lastSync: "10:32 hôm nay", records: 142, icon: "ERP" },
    { id: 2, name: "Kế toán MISA", type: "Kế toán", status: "connected", lastSync: "09:15 hôm nay", records: 37, icon: "KT" },
    { id: 3, name: "Email Server", type: "Email", status: "error", lastSync: "08:00 hôm nay", records: 0, icon: "EM" },
    { id: 4, name: "Hệ thống văn phòng", type: "Văn phòng", status: "pending", lastSync: "Chưa kết nối", records: 0, icon: "VP" },
  ];

  const handleSync = (sys) => {
    const ts = new Date().toLocaleTimeString("vi-VN");
    setSyncLog(prev => [{ time: ts, sys: sys.name, status: "success", msg: "Đồng bộ thủ công thành công" }, ...prev]);
    alert(`Đã đồng bộ thủ công với ${sys.name}!`);
  };

  return (
    <section className="panel">
      <PanelTitle icon={<Link />} title="Tích hợp hệ thống khác" />
      <p className="muted" style={{marginBottom:20}}>Quản lý và giám sát kết nối với các hệ thống bên ngoài.</p>

      {/* Dashboard kết nối */}
      <div className="integration-grid">
        {systems.map(sys => (
          <div key={sys.id} className={`integration-card ${sys.status}`} onClick={() => setSelectedSys(sys)}>
            <div className="int-card-top">
              <span className="int-icon">{sys.icon}</span>
              <span className={`conn-badge ${sys.status}`}>
                {sys.status === "connected" ? <><Wifi size={11}/> Kết nối</> :
                 sys.status === "error" ? <><WifiOff size={11}/> Lỗi</> :
                 <><Clock size={11}/> Chờ</>}
              </span>
            </div>
            <div className="int-card-name">{sys.name}</div>
            <div className="int-card-type muted">{sys.type}</div>
            <div className="int-card-stat">
              <span>Lần cuối: <strong>{sys.lastSync}</strong></span>
              {sys.records > 0 && <span className="int-records">{sys.records} bản ghi</span>}
            </div>
            <div style={{marginTop:10, display:"flex", gap:6}}>
              <button className="btn ok" style={{fontSize:12,padding:"4px 8px"}} onClick={e => { e.stopPropagation(); handleSync(sys); }}>
                <RefreshCw size={11}/> Đồng bộ
              </button>
              <button className="btn" style={{fontSize:12,padding:"4px 8px"}} onClick={e => { e.stopPropagation(); setSelectedSys(sys); }}>
                <Eye size={11}/> Xem
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Log đồng bộ */}
      <div style={{marginTop:24}}>
        <h4 style={{marginBottom:10, display:"flex", alignItems:"center", gap:8}}><Activity size={16}/> Nhật ký đồng bộ</h4>
        <div className="sync-log">
          {syncLog.map((log, i) => (
            <div key={i} className={`sync-log-item ${log.status}`}>
              <span className="sync-time">{log.time}</span>
              <span className="sync-sys">{log.sys}</span>
              <span className="sync-msg">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal xem chi tiết hệ thống */}
      {selectedSys && (
        <div className="modal-overlay" onClick={() => setSelectedSys(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:500}}>
            <div className="modal-header">
              <div className="modal-icon-wrap" style={{background:"#7c3aed",fontSize:20}}>{selectedSys.icon}</div>
              <div><h3>{selectedSys.name}</h3><p className="muted">{selectedSys.type} - Chi tiết kết nối</p></div>
            </div>
            <div className="detail-grid" style={{marginTop:16}}>
              <div className="detail-row"><span>Trạng thái</span>
                <span className={`conn-badge ${selectedSys.status}`}>
                  {selectedSys.status === "connected" ? "Đang kết nối" : selectedSys.status === "error" ? "Lỗi" : "Chờ kết nối"}
                </span>
              </div>
              <div className="detail-row"><span>Loại hệ thống</span><strong>{selectedSys.type}</strong></div>
              <div className="detail-row"><span>Đồng bộ gần nhất</span><strong>{selectedSys.lastSync}</strong></div>
              <div className="detail-row"><span>Bản ghi đã đồng bộ</span><strong>{selectedSys.records}</strong></div>
              <div className="detail-row"><span>Endpoint API</span><code>https://api.{selectedSys.name.toLowerCase().replace(/ /g,"-")}.vn/v2</code></div>
            </div>
            <div className="modal-actions" style={{marginTop:20}}>
              <button className="btn ok" onClick={() => { handleSync(selectedSys); setSelectedSys(null); }}><RefreshCw size={13}/> Đồng bộ ngay</button>
              <button className="btn" onClick={() => setSelectedSys(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
