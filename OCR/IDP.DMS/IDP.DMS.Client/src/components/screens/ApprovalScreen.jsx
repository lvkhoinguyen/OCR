import { useState, useEffect } from "react";
import { CheckCircle2, PenTool, Eye, Lock } from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { PanelTitle, StatusBadge } from "../shared/SharedComponents";

export default function ApprovalScreen({ title }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signPin, setSignPin] = useState("");
  const [signCert, setSignCert] = useState("VNPT CA");
  const [signOtp, setSignOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const [signHistory, setSignHistory] = useState([]);

  useEffect(() => {
    uiApi.gd2.workflowItems()
      .then(data => setRows(data.filter(d => ["PENDING", "DRAFT", "APPROVED"].includes(d.status))))
      .catch(e => setError(e.message));
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const dossierRow = rows.find(r => r.id === id);
      const action = newStatus === "REJECTED" ? "REJECT" : "APPROVE";
      const result = await uiApi.gd2.transition({
        entityType: "DOSSIER",
        entityId: id,
        action,
        actor: "current-user",
        unitCode: "DEFAULT",
        comment: action === "REJECT" ? "Từ chối hồ sơ" : "Phê duyệt hồ sơ",
        recipient: dossierRow?.code,
      });
      alert(`Đã chuyển trạng thái hồ sơ sang ${result.currentStatus}`);
      setRows(rows.filter(r => r.id !== id));
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  };

  const handleSendOtp = () => {
    setOtpSent(true);
    alert("OTP đã được gửi về số điện thoại đã đăng ký: ***6789");
  };

  const handleSignConfirm = async () => {
    if (!signPin) {
      alert("Vui lòng nhập mã PIN");
      return;
    }

    setShowSignModal(false);
    if (!selectedId) return;

    try {
      const dossierRow = rows.find(r => r.id === selectedId);
      if (!dossierRow) return;

      if (dossierRow.status !== "APPROVED") {
        await uiApi.gd2.transition({
          entityType: "DOSSIER",
          entityId: selectedId,
          action: "APPROVE",
          actor: "current-user",
          unitCode: "DEFAULT",
          comment: "Phê duyệt trước khi ký số",
          recipient: dossierRow.code,
        });
      }

      const result = await uiApi.gd2.transition({
        entityType: "DOSSIER",
        entityId: selectedId,
        action: "SIGN",
        actor: "current-user",
        unitCode: "DEFAULT",
        comment: `Ký số bằng ${signCert}`,
        recipient: dossierRow.code,
      });

      const ts = new Date().toLocaleString("vi-VN");
      setSignHistory(prev => [{ id: selectedId, cert: signCert, ts, code: dossierRow?.code }, ...prev]);
      alert(`Đã ký số & ban hành hồ sơ thành công!\nTrạng thái: ${result.currentStatus}\nChứng thư: ${signCert}\nThời gian: ${ts}`);
      setRows(rows.filter(r => r.id !== selectedId));
      setSignPin("");
      setSignOtp("");
      setOtpSent(false);
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  };

  return (
    <section className="panel">
      <PanelTitle icon={<CheckCircle2 />} title={title || "Kiểm duyệt hồ sơ xuất bản"} />
      {error && <div className="alert">{error}</div>}

      {signHistory.length > 0 && (
        <div className="sign-history-bar">
          <strong><PenTool size={14} /> Lịch sử ký số gần đây:</strong>
          {signHistory.slice(0, 3).map((h, i) => (
            <span key={i} className="sign-history-item">HS#{h.code} – {h.cert} – {h.ts}</span>
          ))}
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã HS</th><th>Tên HS</th><th>Loại</th><th>Trạng thái</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td><strong>{row.code}</strong></td>
                <td>{row.title}</td>
                <td>{row.dossierType || "—"}</td>
                <td><StatusBadge status={row.status} /></td>
                <td>
                  <button className="btn ok" style={{ marginRight: 4 }} onClick={() => handleStatusChange(row.id, "APPROVED")}>✓ Duyệt</button>
                  <button className="btn warn" style={{ marginRight: 4 }} onClick={() => handleStatusChange(row.id, "REJECTED")}>✕ Từ chối</button>
                  <button className="btn primary" style={{ marginRight: 4 }} onClick={() => { setSelectedId(row.id); setShowSignModal(true); }}><PenTool size={13}/> Ký số</button>
                  <button className="icon-btn" onClick={() => setViewDoc(row)} title="Xem chi tiết"><Eye size={14}/></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="5" className="empty-cell">Không có hồ sơ nào chờ duyệt.</td></tr>}
          </tbody>
        </table>
      </div>

      {showSignModal && (
        <div className="modal-overlay" onClick={() => setShowSignModal(false)}>
          <div className="modal-content sign-modal" onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-wrap sign-icon"><PenTool size={22} color="#fff"/></div>
              <div>
                <h3>Ký số &amp; Ban hành hồ sơ</h3>
                <p className="muted">Xác thực danh tính trước khi ký số chính thức</p>
              </div>
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <span>Chứng thư số</span>
              <select value={signCert} onChange={event => setSignCert(event.target.value)}>
                <option value="VNPT CA">USB Token – VNPT CA</option>
                <option value="Viettel CA">USB Token – Viettel CA</option>
                <option value="HSM">Máy chủ HSM Doanh nghiệp</option>
                <option value="SmartSign">SmartSign Mobile</option>
              </select>
            </div>
            <div className="field">
              <span>Mã PIN chứng thư</span>
              <input type="password" value={signPin} onChange={event => setSignPin(event.target.value)} placeholder="Nhập mã PIN..." />
            </div>
            <div className="field">
              <span>Xác thực OTP (tùy chọn)</span>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" value={signOtp} onChange={event => setSignOtp(event.target.value)} placeholder={otpSent ? "Nhập mã OTP..." : "Chưa gửi OTP"} style={{ flex: 1 }} />
                <button className="btn primary" type="button" onClick={handleSendOtp} style={{ whiteSpace: "nowrap" }}>
                  {otpSent ? "Gửi lại" : "Gửi OTP"}
                </button>
              </div>
            </div>
            <div className="sign-cert-info">
              <Lock size={13}/> Thông tin chứng thư: <strong>{signCert}</strong> – Hiệu lực đến 31/12/2026
            </div>
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn primary" onClick={handleSignConfirm}><PenTool size={14}/> Xác nhận Ký số</button>
              <button className="btn" onClick={() => { setShowSignModal(false); setSignPin(""); setSignOtp(""); setOtpSent(false); }}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {viewDoc && (
        <div className="modal-overlay" onClick={() => setViewDoc(null)}>
          <div className="modal-content" onClick={event => event.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="modal-icon-wrap" style={{ background: "#0ea5e9" }}><Eye size={22} color="#fff"/></div>
              <div>
                <h3>Chi tiết hồ sơ #{viewDoc.code}</h3>
                <p className="muted">Xem thông tin và lịch sử xử lý</p>
              </div>
            </div>
            <div className="detail-grid" style={{ marginTop: 16 }}>
              <div className="detail-row"><span>Mã hồ sơ</span><strong>{viewDoc.code}</strong></div>
              <div className="detail-row"><span>Tên hồ sơ</span><strong>{viewDoc.title}</strong></div>
              <div className="detail-row"><span>Loại hồ sơ</span><strong>{viewDoc.dossierType || "—"}</strong></div>
              <div className="detail-row"><span>Trạng thái</span><StatusBadge status={viewDoc.status}/></div>
              <div className="detail-row"><span>Mô tả</span><span>{viewDoc.description || "Chưa có mô tả"}</span></div>
            </div>
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn primary" onClick={() => { setSelectedId(viewDoc.id); setViewDoc(null); setShowSignModal(true); }}>Ký số ngay</button>
              <button className="btn" onClick={() => setViewDoc(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
