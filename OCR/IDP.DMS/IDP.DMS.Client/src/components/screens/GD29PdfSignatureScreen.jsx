import { useState, useEffect, useRef } from "react";
import { Lock, PenTool, CheckCircle2, Shield, RefreshCw, Upload } from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { StatusBadge, GD2FeatureLayout } from "../shared/SharedComponents";

export default function GD29PdfSignatureScreen() {
  const sessionUser = uiApi.auth.session()?.user;
  const [activeTab, setActiveTab] = useState("screen");
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [pdfUrl, setPdfUrl] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [certType, setCertType] = useState("DEVELOPMENT");
  const [signerName, setSignerName] = useState(sessionUser?.fullName || sessionUser?.username || "Lãnh đạo đơn vị");
  const [reason, setReason] = useState("Phê duyệt hồ sơ lưu trữ");
  const [location, setLocation] = useState("IDP.DMS");
  const [pin, setPin] = useState("");
  const [signatureImage, setSignatureImage] = useState("");
  const [signatureMode, setSignatureMode] = useState("draw");
  const [zone, setZone] = useState({ x: 58, y: 76, width: 36, height: 16 });
  const [dragging, setDragging] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  const selected = documents.find(item => item.id === selectedId) || null;
  const latestSignature = signatures[0] || null;
  const certificateOptions = [
    { value: "DEVELOPMENT", label: "Chứng thư thử nghiệm" },
    { value: "PFX", label: "Chứng thư PFX" },
    { value: "WINDOWS_STORE", label: "Windows Certificate Store" },
    { value: "USB_TOKEN", label: "USB Token (cần adapter)" },
  ];

  useEffect(() => { loadDocuments(); }, []);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setSignatures([]);
    setPdfUrl("");
    if (!selectedId) return undefined;

    Promise.allSettled([
      uiApi.gd2.pdfSignatures(selectedId),
      uiApi.gd2.documentPdfBlob(selectedId),
    ]).then(([signatureResult, pdfResult]) => {
      if (!active) return;
      if (signatureResult.status === "fulfilled") setSignatures(signatureResult.value);
      else setNotice({ type: "error", text: `Không đọc được chữ ký: ${signatureResult.reason.message}` });
      if (pdfResult.status === "fulfilled") {
        objectUrl = URL.createObjectURL(pdfResult.value);
        setPdfUrl(objectUrl);
      } else {
        setNotice({ type: "error", text: `Không mở được PDF: ${pdfResult.reason.message}` });
      }
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedId, reloadKey]);

  async function loadDocuments(keepNotice = false) {
    try {
      setLoading(true);
      const result = await uiApi.gd2.documentSearch({ page: 1, pageSize: 50 });
      const items = (result.items || []).filter(item => String(item.fileName || "").toLowerCase().endsWith(".pdf"));
      setDocuments(items);
      setSelectedId(current => items.some(item => item.id === current) ? current : items[0]?.id || null);
      if (!keepNotice) setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được danh sách PDF: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  function moveZone(event) {
    if (!dragging || !pageRef.current) return;
    const rect = pageRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 100 / rect.width - zone.width / 2;
    const y = (event.clientY - rect.top) * 100 / rect.height - zone.height / 2;
    setZone(current => ({
      ...current,
      x: Math.max(0, Math.min(100 - current.width, Number(x.toFixed(2)))),
      y: Math.max(0, Math.min(100 - current.height, Number(y.toFixed(2)))),
    }));
  }

  function getCanvasPoint(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height,
    };
  }

  function beginStroke(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(event);
    const context = canvas.getContext("2d");
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function drawStroke(event) {
    if (!drawingRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext("2d");
    const point = getCanvasPoint(event);
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#123b86";
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function endStroke() {
    if (!drawingRef.current || !canvasRef.current) return;
    drawingRef.current = false;
    setSignatureImage(canvasRef.current.toDataURL("image/png"));
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setSignatureImage("");
  }

  function uploadSignature(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type) || file.size > 2 * 1024 * 1024) {
      setNotice({ type: "error", text: "Ảnh chữ ký phải là PNG/JPEG và không vượt quá 2 MB." });
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSignatureImage(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function signPdf() {
    if (!selected) return;
    if (!signerName.trim() || !reason.trim() || !location.trim()) {
      setNotice({ type: "error", text: "Người ký, lý do và địa điểm ký là bắt buộc." });
      return;
    }
    try {
      setLoading(true);
      const result = await uiApi.gd2.signPdf(selected.id, {
        certType,
        signerName: signerName.trim(),
        reason: reason.trim(),
        location: location.trim(),
        pin,
        imageSignature: signatureImage,
        positionX: zone.x,
        positionY: zone.y,
        width: zone.width,
        height: zone.height,
      });
      setShowModal(false);
      setPin("");
      setNotice({
        type: result.certificateTrusted ? "success" : "warning",
        text: result.certificateTrusted
          ? `Đã ký PDF ${result.documentCode}; chứng thư có chuỗi tin cậy.`
          : `Đã ký PDF ${result.documentCode}; chứng thư tự ký/thử nghiệm chưa có chuỗi tin cậy.`,
      });
      await loadDocuments(true);
      setReloadKey(value => value + 1);
    } catch (error) {
      setNotice({ type: "error", text: `Ký PDF thất bại: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  const leftPanel = (
    <div className="gd29-left">
      <div className="gd29-provider-grid">
        {certificateOptions.map(item => (
          <button type="button" key={item.value} className={`gd29-provider ${certType === item.value ? "active" : ""}`} onClick={() => setCertType(item.value)}>
            <Lock size={14}/>{item.label}
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th style={{width:36}}></th><th>Mã</th><th>Tài liệu PDF</th><th>Workflow</th><th></th></tr></thead>
          <tbody>
            {documents.map(item => (
              <tr key={item.id} className={item.id === selectedId ? "row-selected" : ""} onClick={() => setSelectedId(item.id)}>
                <td><input type="radio" checked={item.id === selectedId} onChange={() => setSelectedId(item.id)}/></td>
                <td><span className="gd2-code">{item.code}</span></td>
                <td><strong>{item.title}</strong><span className="gd21415-subtext">{item.fileName}</span></td>
                <td><StatusBadge status={item.status}/></td>
                <td><button className="icon-btn" title="Ký PDF" disabled={item.status !== "APPROVED"} onClick={event => { event.stopPropagation(); setSelectedId(item.id); setShowModal(true); }}><PenTool size={13}/></button></td>
              </tr>
            ))}
            {!documents.length && <tr><td colSpan="5" className="empty-cell">{loading ? "Đang tải..." : "Không có tài liệu PDF."}</td></tr>}
          </tbody>
        </table>
      </div>
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  const rightPanel = (
    <div className="gd29-right">
      <div className="gd29-pdf-toolbar">
        <div><span className="gd21415-section-kicker">Trang cuối PDF</span><h3>{selected?.title || "Chưa chọn tài liệu"}</h3></div>
        {latestSignature && <span className={`gd29-valid-badge ${latestSignature.certificateTrusted ? "" : "untrusted"}`}><CheckCircle2 size={14}/>{latestSignature.certificateTrusted ? "Chứng thư tin cậy" : "Đã ký · chưa tin cậy"}</span>}
      </div>
      <div className="gd29-pdf-preview">
        <div className="gd29-pdf-page" ref={pageRef} onMouseMove={moveZone} onMouseUp={() => setDragging(false)} onMouseLeave={() => setDragging(false)}>
          {pdfUrl ? <object className="gd29-pdf-object" data={`${pdfUrl}#page=999999&toolbar=0&navpanes=0`} type="application/pdf" aria-label="Xem trước PDF"/> : <div className="gd29-pdf-lines"><span/><span/><span/><span/><span/><span/></div>}
          <button type="button" className="gd29-sign-zone" style={{left:`${zone.x}%`,top:`${zone.y}%`,width:`${zone.width}%`,height:`${zone.height}%`}} onMouseDown={() => setDragging(true)} title="Kéo để đặt con dấu">
            {signatureImage && <img src={signatureImage} alt="Chữ ký xem trước"/>}
            <span><strong>Ký bởi: {signerName || "..."}</strong><small>Trang cuối · {reason || "Lý do ký"}</small></span>
          </button>
        </div>
      </div>
      <div className="gd29-zone-grid">
        <label>Trang<input value="Trang cuối" readOnly/></label>
        <label>X %<input type="number" value={zone.x} onChange={event => setZone(value => ({...value,x:Number(event.target.value)||0}))}/></label>
        <label>Y %<input type="number" value={zone.y} onChange={event => setZone(value => ({...value,y:Number(event.target.value)||0}))}/></label>
      </div>
      <div className="gd29-cert-panel">
        <div className="gd22-section-head"><Shield size={16}/> Chữ ký PDF đã lưu</div>
        {latestSignature ? <div className="gd29-cert-valid"><strong>{latestSignature.certificateSubject}</strong><span>Serial: {latestSignature.certificateSerial}</span><span>{new Date(latestSignature.signedAt).toLocaleString("vi-VN")} · {latestSignature.validationStatus}</span><span>SHA-256: {latestSignature.fileHashSha256}</span></div> : <div className="empty-cell">Tài liệu chưa có chữ ký số.</div>}
      </div>
    </div>
  );

  return <>
    <GD2FeatureLayout
      featureId="GD2-9" featureName="Chữ ký số và ký điện tử"
      description="Ký mật mã lên tệp PDF vật lý, đặt con dấu trực quan ở trang cuối và lưu một phiên bản tài liệu mới."
      actor="Lãnh đạo / Cán bộ được ủy quyền ký" actionBarLabel="PAdES / Visual Digital Signature"
      activeTab={activeTab} onTabChange={setActiveTab} splitRatio="0.95fr 1.05fr" className="gd29-feature"
      leftPanelTitle="Tài liệu PDF chờ ký" rightPanelTitle="Preview vị trí con dấu"
      actions={<><button className="btn" onClick={() => loadDocuments()}><RefreshCw size={14}/> Tải lại</button><button className="btn primary" disabled={loading || !selected || selected.status !== "APPROVED" || Boolean(latestSignature)} onClick={() => setShowModal(true)}><PenTool size={14}/> Ký PDF</button></>}
      actionRows={[
        {action:"Chọn chứng thư",description:"PFX, Windows Store hoặc chứng thư Development",result:"Private key ký SHA-256 lên PDF"},
        {action:"Đặt con dấu",description:"Kéo vùng ký và tải/vẽ chữ ký",result:"Con dấu nằm trên trang cuối"},
        {action:"Lưu phiên bản",description:"Ghi PDF, SHA-256 và audit",result:"Version mới, trạng thái PUBLISHED"},
      ]}
      validationItems={[
        {type:"required",label:"PDF",text:"Tài liệu phải là PDF và có trạng thái APPROVED."},
        {type:"required",label:"Private key",text:"Chứng thư phải còn hiệu lực và có private key."},
        {type:"rule",label:"Không ký đè",text:"Không ký đè tài liệu đã có chữ ký để tránh làm mất hiệu lực chữ ký cũ."},
      ]}
      flowSteps={[
        {step:"1",label:"Chọn PDF",desc:"Trạng thái APPROVED",color:"#3264f4"},
        {step:"2",label:"Đặt vùng ký",desc:"Trang cuối",color:"#0ea5e9"},
        {step:"3",label:"Chọn chứng thư",desc:"PFX/Windows",color:"#f59e0b"},
        {step:"4",label:"Ký số",desc:"CMS + SHA-256",color:"#7c3aed"},
        {step:"5",label:"Lưu version",desc:"PDF + audit",color:"#22c55e"},
      ]}
      leftPanel={leftPanel} rightPanel={rightPanel}
    />
    {showModal && <div className="modal-overlay" onClick={() => setShowModal(false)}>
      <div className="modal-content sign-modal" onClick={event => event.stopPropagation()}>
        <div className="modal-header"><div className="modal-icon-wrap sign-icon"><PenTool size={22} color="#fff"/></div><div><h3>Ký số tệp PDF</h3><p className="muted">Ký mật mã và tạo con dấu trực quan trên trang cuối</p></div></div>
        <div className="field" style={{marginTop:16}}><span>Người ký</span><input value={signerName} onChange={event => setSignerName(event.target.value)}/></div>
        <div className="field"><span>Loại chứng thư</span><select value={certType} onChange={event => setCertType(event.target.value)}>{certificateOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <div className="field"><span>Lý do ký</span><input value={reason} onChange={event => setReason(event.target.value)}/></div>
        <div className="field"><span>Địa điểm ký</span><input value={location} onChange={event => setLocation(event.target.value)}/></div>
        <div className="field"><span>PIN/mật khẩu PFX (nếu cần)</span><input type="password" value={pin} onChange={event => setPin(event.target.value)} autoComplete="off" placeholder="Không lưu trên trình duyệt"/></div>
        <div className="gd29-signature-tabs"><button type="button" className={signatureMode === "draw" ? "active" : ""} onClick={() => setSignatureMode("draw")}><PenTool size={13}/> Vẽ chữ ký</button><button type="button" className={signatureMode === "upload" ? "active" : ""} onClick={() => setSignatureMode("upload")}><Upload size={13}/> Tải ảnh/con dấu</button></div>
        {signatureMode === "draw" ? <div className="gd29-canvas-wrap"><canvas ref={canvasRef} width="720" height="220" onPointerDown={beginStroke} onPointerMove={drawStroke} onPointerUp={endStroke} onPointerCancel={endStroke} onPointerLeave={endStroke}/><button className="btn ghost" type="button" onClick={clearSignature}>Xóa nét vẽ</button></div> : <label className="gd29-upload-signature"><Upload size={18}/><span>Chọn PNG/JPEG, tối đa 2 MB</span><input type="file" accept="image/png,image/jpeg" onChange={uploadSignature}/></label>}
        {signatureImage && <div className="gd29-image-preview"><img src={signatureImage} alt="Mẫu chữ ký/con dấu"/><span>Mẫu sẽ hiển thị trong con dấu PDF</span></div>}
        <div className="sign-cert-info"><Lock size={13}/> Vị trí: <strong>trang cuối</strong>, X {zone.x}%, Y {zone.y}% · {zone.width}×{zone.height}%</div>
        {certType === "DEVELOPMENT" && <div className="gd2-report-notice warning">Chứng thư DEVELOPMENT là tự ký, chỉ dùng kiểm thử và được ghi nhận là chưa tin cậy.</div>}
        {certType === "USB_TOKEN" && <div className="gd2-report-notice warning">USB Token cần adapter SDK/PKCS#11 của nhà cung cấp trên backend; hệ thống không mô phỏng chữ ký token.</div>}
        <div className="modal-actions" style={{marginTop:20}}><button className="btn primary" disabled={loading} onClick={signPdf}><PenTool size={14}/> Xác nhận ký số</button><button className="btn" onClick={() => {setShowModal(false);setPin("");}}>Hủy</button></div>
      </div>
    </div>}
  </>;
}
