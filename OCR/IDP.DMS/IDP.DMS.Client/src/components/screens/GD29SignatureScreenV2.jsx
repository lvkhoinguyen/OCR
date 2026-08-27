import { useState, useEffect } from "react";
import { FileText, PenTool, X, Lock } from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { StatusBadge, GD2FeatureLayout } from "../shared/SharedComponents";

export default function GD29SignatureScreenV2() {
  const [activeTab, setActiveTab] = useState("screen");
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [requester, setRequester] = useState("current-user");
  const [note, setNote] = useState("");
  const [nextApprover, setNextApprover] = useState("lanh-dao-don-vi");
  const [showSignModal, setShowSignModal] = useState(false);
  const [signPin, setSignPin] = useState("");
  const [signCert, setSignCert] = useState("VNPT CA");
  const [signOtp, setSignOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [signHistory, setSignHistory] = useState([]);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWorkflowItems();
  }, []);

  const selected = rows.find(row => row.id === selectedId) || rows[0] || null;

  async function loadWorkflowItems() {
    try {
      setLoading(true);
      const data = await uiApi.gd2.workflowItems();
      setRows(data);
      setSelectedId(current => current || data[0]?.id || null);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được danh sách hồ sơ: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function processWorkflow(action, target = selected) {
    if (!target) {
      setNotice({ type: "error", text: "Vui lòng chọn một hồ sơ để xử lý." });
      return;
    }

    const actionText = {
      APPROVE: "Duyệt",
      FORWARD: "Chuyển cấp",
      REJECT: "Từ chối",
      CANCEL: "Hủy",
      SIGN: "Ký số",
    }[action] || action;

    try {
      setLoading(true);
      const result = await uiApi.gd2.transition({
        entityType: "DOSSIER",
        entityId: target.id,
        action,
        actor: requester.trim() || "current-user",
        unitCode: "DEFAULT",
        comment: note.trim() || `${actionText} hồ sơ ${target.code}`,
        recipient: action === "FORWARD" ? nextApprover : target.code,
      });
      setRows(current => current.map(row => row.id === target.id ? { ...row, status: result.currentStatus } : row));
      setSelectedId(target.id);
      setNotice({ type: "success", text: `${actionText} thành công. Trạng thái hiện tại: ${result.currentStatus}.` });
      setNote("");
    } catch (error) {
      setNotice({ type: "error", text: `${actionText} thất bại: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  const handleSendOtp = () => {
    setOtpSent(true);
    setNotice({ type: "success", text: "OTP đã được gửi đến thiết bị xác thực." });
  };

  const handleSignConfirm = async () => {
    if (!signPin) {
      setNotice({ type: "error", text: "Vui lòng nhập mã PIN." });
      return;
    }
    if (!selected) {
      setNotice({ type: "error", text: "Vui lòng chọn hồ sơ để ký." });
      return;
    }

    try {
      setLoading(true);
      if (selected.status !== "APPROVED") {
        await uiApi.gd2.transition({
          entityType: "DOSSIER",
          entityId: selected.id,
          action: "APPROVE",
          actor: requester.trim() || "current-user",
          unitCode: "DEFAULT",
          comment: "Phê duyệt trước khi ký số",
          recipient: selected.code,
        });
      }

      const result = await uiApi.gd2.transition({
        entityType: "DOSSIER",
        entityId: selected.id,
        action: "SIGN",
        actor: requester.trim() || "current-user",
        unitCode: "DEFAULT",
        comment: `Ký số bằng ${signCert}`,
        recipient: selected.code,
      });

      const ts = new Date().toLocaleString("vi-VN");
      setSignHistory(prev => [{ id: selected.id, cert: signCert, ts, code: selected.code }, ...prev]);
      setNotice({ type: "success", text: `Đã ký số thành công. Trạng thái: ${result.currentStatus}.` });
      setSignPin("");
      setSignOtp("");
      setOtpSent(false);
    } catch (error) {
      setNotice({ type: "error", text: `Ký số thất bại: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const leftPanel = (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{width:36}}></th>
            <th>Mã</th>
            <th>Tên/Nội dung</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={row.id}
              className={row.id === selected?.id ? "row-selected" : ""}
              onClick={() => setSelectedId(row.id)}
            >
              <td><input type="radio" checked={row.id === selected?.id} onChange={() => setSelectedId(row.id)} /></td>
              <td><span className="gd2-code">{row.code}</span></td>
              <td>{row.title}</td>
              <td><StatusBadge status={row.status} /></td>
              <td style={{display:"flex",gap:4}}>
                <button className="icon-btn" type="button" title="Xem" onClick={(event) => { event.stopPropagation(); setSelectedId(row.id); }}><FileText size={13}/></button>
                <button className="icon-btn" type="button" title="Ký số" onClick={(event) => { event.stopPropagation(); setSelectedId(row.id); setShowSignModal(true); }}><PenTool size={13}/></button>
                <button className="icon-btn danger" type="button" title="Hủy" onClick={(event) => { event.stopPropagation(); processWorkflow("CANCEL", row); }}><X size={13}/></button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan="5" className="empty-cell">{loading ? "Đang tải..." : "Chưa có hồ sơ trong hàng chờ."}</td></tr>
          )}
        </tbody>
      </table>
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  const rightPanel = (
    <div className="gd2-config-form">
      <div className="gd2-form-row">
        <div className="gd2-field">
          <label>Người yêu cầu</label>
          <input placeholder="Người yêu cầu" value={requester} onChange={event => setRequester(event.target.value)} />
        </div>
        <div className="gd2-field required">
          <label>Lý do/ghi chú <span className="req-star">*</span></label>
          <textarea rows="3" placeholder="Lý do/ghi chú" value={note} onChange={event => setNote(event.target.value)} style={{resize:"none"}}></textarea>
        </div>
      </div>
      <div className="gd2-field">
        <label>Người duyệt tiếp theo</label>
        <select value={nextApprover} onChange={event => setNextApprover(event.target.value)}>
            <option value="lanh-dao-don-vi">Lãnh đạo đơn vị</option>
            <option value="van-thu">Văn thư</option>
            <option value="quan-tri-ho-so">Quản trị hồ sơ</option>
        </select>
      </div>
      {selected && (
        <div className="detail-grid" style={{marginTop: 12}}>
          <div className="detail-row"><span>Mã hồ sơ</span><strong>{selected.code}</strong></div>
          <div className="detail-row"><span>Tên hồ sơ</span><strong>{selected.title}</strong></div>
          <div className="detail-row"><span>Loại hồ sơ</span><strong>{selected.dossierType || "--"}</strong></div>
          <div className="detail-row"><span>Trạng thái</span><StatusBadge status={selected.status} /></div>
        </div>
      )}
      <div className="gd2-field" style={{marginTop: 8}}>
        <label>Luồng xử lý</label>
        <div className="workflow-steps-list">
          <div className="wf-step-item">Tạo yêu cầu</div>
          <div className="wf-step-item">Kiểm tra điều kiện</div>
          <div className="wf-step-item">Phê duyệt / chuyển cấp / từ chối</div>
          <div className="wf-step-item">Ký số và ghi log</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <GD2FeatureLayout
        featureId="GD2-9"
        featureName="Chữ ký số và ký điện tử"
        description="Tích hợp công nghệ ký số để phê duyệt tài liệu trực tuyến, giảm thiểu giấy tờ."
        actor="approve"
        actionBarLabel="Hàng chờ duyệt và xử lý hồ sơ"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        splitRatio="1fr 440px"
        leftPanelTitle="Danh sách chờ xử lý"
        rightPanelTitle="Chi tiết phê duyệt"
        actions={
          <>
            <button className="btn" disabled={loading || !selected} style={{color: "#16a34a", borderColor: "#bbf7d0"}} onClick={() => processWorkflow("APPROVE")}>✓ Duyệt</button>
            <button className="btn" disabled={loading || !selected} style={{color: "#d97706", borderColor: "#fde68a"}} onClick={() => processWorkflow("FORWARD")}>Chuyển cấp</button>
            <button className="btn" disabled={loading || !selected} style={{color: "#dc2626", borderColor: "#fecaca"}} onClick={() => processWorkflow("REJECT")}>Từ chối</button>
            <button className="btn" disabled={loading || !selected} style={{color: "#6b7280", borderColor: "#d1d5db"}} onClick={() => processWorkflow("CANCEL")}>Hủy</button>
          </>
        }
        leftPanel={leftPanel}
        rightPanel={rightPanel}
      />
      {showSignModal && (
        <div className="modal-overlay" onClick={() => setShowSignModal(false)}>
          <div className="modal-content sign-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-wrap sign-icon"><PenTool size={22} color="#fff"/></div>
              <div>
                <h3>Ký số &amp; Ban hành hồ sơ</h3>
                <p className="muted">Xác thực danh tính trước khi ký số chính thức</p>
              </div>
            </div>
            <div className="field" style={{marginTop:16}}>
              <span>Chứng thư số</span>
              <select value={signCert} onChange={e => setSignCert(e.target.value)}>
                <option value="VNPT CA">USB Token - VNPT CA</option>
                <option value="Viettel CA">USB Token - Viettel CA</option>
                <option value="HSM">Máy chủ HSM Doanh nghiệp</option>
                <option value="SmartSign">SmartSign Mobile</option>
              </select>
            </div>
            <div className="field">
              <span>Mã PIN chứng thư</span>
              <input type="password" value={signPin} onChange={e => setSignPin(e.target.value)} placeholder="Nhập mã PIN..." />
            </div>
            <div className="field">
              <span>Xác thực OTP (tùy chọn)</span>
              <div style={{display:"flex", gap:8}}>
                <input type="text" value={signOtp} onChange={e => setSignOtp(e.target.value)} placeholder={otpSent ? "Nhập mã OTP..." : "Chưa gửi OTP"} style={{flex:1}}/>
                <button className="btn primary" type="button" onClick={handleSendOtp} style={{whiteSpace:"nowrap"}}>
                  {otpSent ? "Gửi lại" : "Gửi OTP"}
                </button>
              </div>
            </div>
            <div className="sign-cert-info">
              <Lock size={13}/> Thông tin chứng thư: <strong>{signCert}</strong> - Hiệu lực đến 31/12/2026
            </div>
            <div className="modal-actions" style={{marginTop:20}}>
              <button className="btn primary" onClick={handleSignConfirm}><PenTool size={14}/> Xác nhận ký số</button>
              <button className="btn" onClick={() => { setShowSignModal(false); setSignPin(""); setSignOtp(""); setOtpSent(false); }}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
