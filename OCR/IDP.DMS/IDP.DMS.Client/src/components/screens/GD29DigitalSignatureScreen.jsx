import { useState, useEffect, useRef } from "react";
import { Lock, CheckCircle2, PenTool, Shield, RefreshCw } from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { GD2FeatureLayout } from "../shared/SharedComponents";

export default function GD29DigitalSignatureScreen() {
  const [activeTab, setActiveTab] = useState("screen");
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [signer, setSigner] = useState("lanh-dao-don-vi");
  const [provider, setProvider] = useState("USB_TOKEN");
  const [certificateSerial, setCertificateSerial] = useState("VNPT-CA-2026-001");
  const [appearanceText, setAppearanceText] = useState("Da ky so boi IDP.DMS");
  const [showSignModal, setShowSignModal] = useState(false);
  const [signPin, setSignPin] = useState("");
  const [signOtp, setSignOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [zone, setZone] = useState({ page: 1, x: 58, y: 72, width: 28, height: 12 });
  const [dragging, setDragging] = useState(false);
  const [signatures, setSignatures] = useState([]);
  const [validation, setValidation] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const pdfRef = useRef(null);

  const selected = documents.find(row => row.id === selectedId) || documents[0] || null;
  const providerOptions = [
    { value: "USB_TOKEN", label: "USB Token / PKCS#11", cert: "VNPT-CA-2026-001" },
    { value: "REMOTE_SIGNING", label: "Remote Signing / HSM", cert: "REMOTE-HSM-2026-010" },
    { value: "SIM_PKI", label: "SIM PKI", cert: "SIMPKI-2026-077" },
    { value: "SMART_CA", label: "SmartCA Mobile", cert: "SMARTCA-2026-088" },
  ];

  useEffect(() => {
    loadSignatureDocuments();
  }, []);

  useEffect(() => {
    if (selectedId) loadSignatureStatus(selectedId);
  }, [selectedId]);

  async function loadSignatureDocuments() {
    try {
      setLoading(true);
      const result = await uiApi.gd2.documentSearch({ page: 1, pageSize: 25 });
      const items = result.items || [];
      setDocuments(items);
      setSelectedId(current => current || items[0]?.id || null);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được danh sách tài liệu: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function loadSignatureStatus(documentId) {
    try {
      const [signatureRows, verifyResult] = await Promise.all([
        uiApi.gd2.documentSignatures(documentId),
        uiApi.gd2.verifyDocumentSignature(documentId),
      ]);
      setSignatures(signatureRows);
      setValidation(verifyResult);
    } catch (error) {
      setNotice({ type: "error", text: `Không kiểm tra được chữ ký: ${error.message}` });
    }
  }

  function updateProvider(nextProvider) {
    setProvider(nextProvider);
    setCertificateSerial(providerOptions.find(item => item.value === nextProvider)?.cert || certificateSerial);
  }

  function handleSendOtp() {
    setOtpSent(true);
    setNotice({ type: "success", text: "OTP đã được gửi đến thiết bị xác thực." });
  }

  function moveSignatureZone(event) {
    if (!dragging || !pdfRef.current) return;
    const rect = pdfRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100 - zone.width / 2;
    const y = ((event.clientY - rect.top) / rect.height) * 100 - zone.height / 2;
    setZone(current => ({
      ...current,
      x: Math.max(0, Math.min(100 - current.width, Number(x.toFixed(2)))),
      y: Math.max(0, Math.min(100 - current.height, Number(y.toFixed(2)))),
    }));
  }

  async function handleSignConfirm() {
    if (!selected) {
      setNotice({ type: "error", text: "Vui lòng chọn tài liệu để ký." });
      return;
    }
    if (provider === "USB_TOKEN" && !signPin) {
      setNotice({ type: "error", text: "USB Token/PKCS#11 bắt buộc nhập mã PIN." });
      return;
    }
    if (provider !== "USB_TOKEN" && !signOtp) {
      setNotice({ type: "error", text: "Ký số từ xa/SIM PKI/SmartCA bắt buộc nhập OTP." });
      return;
    }

    try {
      setLoading(true);
      const signature = await uiApi.gd2.signDocument(selected.id, {
        documentId: selected.id,
        signer: signer.trim() || "lanh-dao-don-vi",
        provider,
        certificateSerial,
        pin: signPin,
        otp: signOtp,
        zone,
        appearanceText,
        unitCode: "DEFAULT",
      });
      await loadSignatureStatus(selected.id);
      setNotice({ type: "success", text: `Đã ký tài liệu ${signature.documentCode}. Chữ ký hợp lệ.` });
      setShowSignModal(false);
      setSignPin("");
      setSignOtp("");
      setOtpSent(false);
    } catch (error) {
      setNotice({ type: "error", text: `Ký số thất bại: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  const leftPanel = (
    <div className="gd29-left">
      <div className="gd29-provider-grid">
        {providerOptions.map(item => (
          <button
            key={item.value}
            className={`gd29-provider ${provider === item.value ? "active" : ""}`}
            type="button"
            onClick={() => updateProvider(item.value)}
          >
            <Lock size={15}/>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th style={{width:36}}></th><th>Mã</th><th>Tài liệu PDF</th><th>Trạng thái ký</th><th></th></tr></thead>
          <tbody>
            {documents.map(row => {
              const signed = validation?.documentId === row.id && validation.valid;
              return (
                <tr key={row.id} className={row.id === selected?.id ? "row-selected" : ""} onClick={() => setSelectedId(row.id)}>
                  <td><input type="radio" checked={row.id === selected?.id} onChange={() => setSelectedId(row.id)} /></td>
                  <td><span className="gd2-code">{row.code}</span></td>
                  <td><strong>{row.title}</strong><span className="gd21415-subtext">{row.fileName || "document.pdf"}</span></td>
                  <td>{signed ? <span className="gd29-valid-badge"><CheckCircle2 size={13}/> Chữ ký hợp lệ</span> : <span className="vld-badge rule">Chờ ký</span>}</td>
                  <td><button className="icon-btn" type="button" title="Ký tài liệu" onClick={(event) => { event.stopPropagation(); setSelectedId(row.id); setShowSignModal(true); }}><PenTool size={13}/></button></td>
                </tr>
              );
            })}
            {documents.length === 0 && <tr><td colSpan="5" className="empty-cell">{loading ? "Đang tải..." : "Chưa có tài liệu trong hàng chờ ký."}</td></tr>}
          </tbody>
        </table>
      </div>
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  const rightPanel = (
    <div className="gd29-right">
      <div className="gd29-pdf-toolbar">
        <div>
          <span className="gd21415-section-kicker">Preview PDF</span>
          <h3>{selected?.title || "Chưa chọn tài liệu"}</h3>
        </div>
        {validation?.valid && <span className="gd29-valid-badge"><CheckCircle2 size={14}/> Chữ ký hợp lệ</span>}
      </div>
      <div
        className="gd29-pdf-preview"
        ref={pdfRef}
        onMouseMove={moveSignatureZone}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        <div className="gd29-pdf-page">
          <div className="gd29-pdf-lines"><span></span><span></span><span></span><span></span><span></span><span></span></div>
          <button
            className="gd29-sign-zone"
            type="button"
            style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%` }}
            onMouseDown={() => setDragging(true)}
            title="Kéo vùng ký"
          >
            <PenTool size={14}/> Vùng ký
          </button>
        </div>
      </div>
      <div className="gd29-zone-grid">
        <label>Trang<input type="number" min="1" value={zone.page} onChange={event => setZone(current => ({ ...current, page: Number(event.target.value) || 1 }))}/></label>
        <label>X %<input type="number" value={zone.x} onChange={event => setZone(current => ({ ...current, x: Number(event.target.value) || 0 }))}/></label>
        <label>Y %<input type="number" value={zone.y} onChange={event => setZone(current => ({ ...current, y: Number(event.target.value) || 0 }))}/></label>
      </div>
      <div className="gd29-cert-panel">
        <div className="gd22-section-head"><Shield size={16}/> Kiểm tra chứng thư số</div>
        {validation?.valid ? (
          <div className="gd29-cert-valid">
            <span className="gd29-valid-badge"><CheckCircle2 size={14}/> Chữ ký hợp lệ</span>
            <strong>{signatures[0]?.certificateSubject}</strong>
            <span>Serial: {signatures[0]?.certificateSerial}</span>
            <span>Timestamp: {signatures[0]?.timestampAt ? new Date(signatures[0].timestampAt).toLocaleString("vi-VN") : "--"}</span>
            <span>OCSP: {signatures[0]?.ocspStatus} · CRL: {signatures[0]?.crlStatus}</span>
          </div>
        ) : (
          <div className="empty-cell">Tài liệu chưa có chữ ký hợp lệ.</div>
        )}
      </div>
      <div className="timeline-list">
        {signatures.map(item => (
          <div className="timeline-item" key={item.id}>
            <strong>{item.provider} · {item.signer}</strong>
            <span>{new Date(item.signedAt).toLocaleString("vi-VN")} · Trang {item.zone.page} · ({item.zone.x}%, {item.zone.y}%)</span>
            <span>{item.validationStatus} · OCSP {item.ocspStatus} · CRL {item.crlStatus}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <GD2FeatureLayout
        featureId="GD2-9"
        featureName="Chữ ký số và ký điện tử"
        description="Tích hợp USB Token/PKCS#11, ký số từ xa, SIM PKI, SmartCA và xác thực chứng thư khi mở văn bản."
        actor="Lãnh đạo / Cán bộ được ủy quyền ký"
        actionBarLabel="Ký số tài liệu PDF và xác thực chứng thư"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        splitRatio="0.95fr 1.05fr"
        className="gd29-feature"
        leftPanelTitle="Tài liệu chờ ký"
        rightPanelTitle="Preview PDF & chứng thư"
        actions={
          <>
            <button className="btn" onClick={loadSignatureDocuments}><RefreshCw size={14}/> Tải lại</button>
            <button className="btn ghost" disabled={!selected} onClick={() => selected && loadSignatureStatus(selected.id)}><CheckCircle2 size={14}/> Kiểm tra chữ ký</button>
            <button className="btn primary" disabled={loading || !selected} onClick={() => setShowSignModal(true)}><PenTool size={14}/> Ký tài liệu</button>
          </>
        }
        actionRows={[
          { action: "Chọn phương thức ký", description: "USB Token/PKCS#11, Remote Signing, SIM PKI hoặc SmartCA", result: "Áp dụng đúng cơ chế PIN/OTP" },
          { action: "Đặt vùng ký", description: "Kéo thả Signature Zone trên preview PDF hoặc nhập tọa độ", result: "Chữ ký ảnh/con dấu nằm đúng trang và tọa độ" },
          { action: "Xác thực", description: "Kiểm tra Certificate Validity, Timestamp, OCSP và CRL", result: "Hiển thị badge Chữ ký hợp lệ" },
        ]}
        validationItems={[
          { type: "required", label: "PIN", text: "USB Token/PKCS#11 bắt buộc nhập mã PIN chứng thư." },
          { type: "required", label: "OTP", text: "Remote Signing, SIM PKI và SmartCA bắt buộc xác thực OTP." },
          { type: "rule", label: "Tọa độ", text: "Vùng ký phải nằm trong trang PDF và có kích thước hợp lệ." },
          { type: "perm", label: "Phân quyền", text: "Chỉ lãnh đạo hoặc cán bộ được ủy quyền ký được thực hiện ký số." },
        ]}
        flowSteps={[
          { step: "1", label: "Chọn tài liệu", desc: "Mở PDF cần ký", color: "#3264f4" },
          { step: "2", label: "Đặt vùng ký", desc: "Kéo thả Signature Zone", color: "#0ea5e9" },
          { step: "3", label: "Xác thực", desc: "PIN/OTP", color: "#f59e0b" },
          { step: "4", label: "Ký số", desc: "USB/Remote/SIM/SmartCA", color: "#7c3aed" },
          { step: "5", label: "Verify", desc: "OCSP/CRL/Timestamp", color: "#22c55e" },
        ]}
        leftPanel={leftPanel}
        rightPanel={rightPanel}
      />
      {showSignModal && (
        <div className="modal-overlay" onClick={() => setShowSignModal(false)}>
          <div className="modal-content sign-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-wrap sign-icon"><PenTool size={22} color="#fff"/></div>
              <div>
                <h3>Ký số tài liệu</h3>
                <p className="muted">Xác thực PIN/OTP trước khi ký số chính thức</p>
              </div>
            </div>
            <div className="field" style={{marginTop:16}}><span>Người ký</span><input value={signer} onChange={e => setSigner(e.target.value)} /></div>
            <div className="field"><span>Phương thức ký</span><select value={provider} onChange={e => updateProvider(e.target.value)}>{providerOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <div className="field"><span>Serial chứng thư</span><input value={certificateSerial} onChange={e => setCertificateSerial(e.target.value)} /></div>
            <div className="field"><span>Mã PIN chứng thư</span><input type="password" value={signPin} onChange={e => setSignPin(e.target.value)} placeholder="Nhập mã PIN..." /></div>
            <div className="field">
              <span>Xác thực OTP</span>
              <div style={{display:"flex", gap:8}}>
                <input type="text" value={signOtp} onChange={e => setSignOtp(e.target.value)} placeholder={otpSent ? "Nhập mã OTP..." : "Chưa gửi OTP"} style={{flex:1}}/>
                <button className="btn primary" type="button" onClick={handleSendOtp} style={{whiteSpace:"nowrap"}}>{otpSent ? "Gửi lại" : "Gửi OTP"}</button>
              </div>
            </div>
            <div className="field"><span>Chữ ký ảnh / con dấu</span><input value={appearanceText} onChange={e => setAppearanceText(e.target.value)} /></div>
            <div className="sign-cert-info"><Lock size={13}/> Tọa độ ký: trang <strong>{zone.page}</strong>, X {zone.x}%, Y {zone.y}%</div>
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
