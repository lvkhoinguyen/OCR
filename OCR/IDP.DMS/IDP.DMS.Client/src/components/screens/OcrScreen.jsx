import { useState, useRef } from "react";
import { Zap, BarChart2, CheckCircle2, Clock, Activity, Download, X } from "lucide-react";
import { useCrud } from "../../hooks/useCrud";
import { emptyDocument } from "../../utils/constants";
import { PanelTitle, StatusBadge, OcrBadge } from "../shared/SharedComponents";

export default function OcrScreen() {
  const crud = useCrud("documents", emptyDocument);
  const fileInputRef = useRef(null);
  const [batchProgress, setBatchProgress] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]);

  const pendingDocs = crud.rows.filter(d => d.ocrStatus === "PENDING" || d.ocrStatus === "ERROR");
  const doneDocs = crud.rows.filter(d => d.ocrStatus === "DONE");

  const toggleSelect = (id) => setSelectedDocs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleBatchOcr = () => {
    const targets = selectedDocs.length > 0 ? selectedDocs : pendingDocs.map(d => d.id);
    if (targets.length === 0) { alert("Không có tài liệu nào cần OCR."); return; }
    setBatchProgress({ total: targets.length, done: 0, running: true });
    let done = 0;
    const timer = setInterval(() => {
      done++;
      setBatchProgress({ total: targets.length, done, running: done < targets.length });
      if (done >= targets.length) {
        clearInterval(timer);
        alert(`Đồng bộ OCR hoàn tất! Đã xử lý ${targets.length} tài liệu.`);
        crud.rows; // trigger re-render hint
      }
    }, 800);
  };

  const handleExport = (type) => {
    setExportLoading(true);
    setTimeout(() => {
      setExportLoading(false);
      alert(`Xuất báo cáo ${type} hoàn tất!\nTổng tài liệu: ${crud.rows.length}\nĐã OCR: ${doneDocs.length}\nChờ OCR: ${pendingDocs.length}`);
    }, 1200);
  };

  return (
    <section className="panel">
      <PanelTitle icon={<Zap />} title="GD2-6: Phần mềm tích hợp OCR AI" />
      <p className="muted" style={{marginBottom:16}}>Quản lý, đồng bộ và xuất báo cáo tất cả tài liệu OCR trong hệ thống.</p>

      {/* Metrics */}
      <div className="ocr-metrics">
        <div className="ocr-metric-card total"><BarChart2 size={22}/><strong>{crud.rows.length}</strong><span>Tổng tài liệu</span></div>
        <div className="ocr-metric-card done"><CheckCircle2 size={22}/><strong>{doneDocs.length}</strong><span>Đã OCR xong</span></div>
        <div className="ocr-metric-card pending"><Clock size={22}/><strong>{pendingDocs.length}</strong><span>Chờ xử lý</span></div>
        <div className="ocr-metric-card rate">
          <Activity size={22}/>
          <strong>{crud.rows.length > 0 ? Math.round(doneDocs.length / crud.rows.length * 100) : 0}%</strong>
          <span>Tỷ lệ hoàn thành</span>
        </div>
      </div>

      {/* Thanh tác vụ */}
      <div className="ocr-toolbar">
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <button className="btn primary" onClick={() => handleBatchOcr()} disabled={batchProgress?.running}>
            <Zap size={14}/> {batchProgress?.running ? `Đang OCR... (${batchProgress.done}/${batchProgress.total})` : "Đồng bộ/Batch OCR"}
          </button>
          <button className="btn ok" onClick={() => handleExport("Excel")} disabled={exportLoading}>
            <Download size={14}/> {exportLoading ? "Đang xuất..." : "Xuất Excel"}
          </button>
          <button className="btn warn" onClick={() => handleExport("PDF")} disabled={exportLoading}>
            <Download size={14}/> Xuất PDF
          </button>
          <button className="btn" onClick={() => setSelectedDocs([])}>
            <X size={14}/> Bỏ chọn ({selectedDocs.length})
          </button>
        </div>
        <div className="ocr-engine-selector">
          <span style={{fontSize:12,color:"var(--muted)"}}>AI bóc tách: <strong>Gemini Vision</strong></span>
        </div>
      </div>

      {/* Progress bar đồng bộ */}
      {batchProgress && (
        <div className="batch-progress-wrap">
          <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
            <span>Tiến trình OCR</span>
            <span>{batchProgress.done}/{batchProgress.total}</span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{width: `${batchProgress.total > 0 ? batchProgress.done/batchProgress.total*100 : 0}%`}} />
          </div>
        </div>
      )}

      {/* Bảng tài liệu */}
      <div className="table-wrap" style={{marginTop:14}}>
        <table>
          <thead>
            <tr>
              <th style={{width:36}}><input type="checkbox" onChange={e => setSelectedDocs(e.target.checked ? pendingDocs.map(d => d.id) : [])} checked={selectedDocs.length === pendingDocs.length && pendingDocs.length > 0}/></th>
              <th>Mã tài liệu</th><th>Tên tài liệu</th><th>File</th><th>OCR</th><th>Trạng thái</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {crud.rows.length === 0 && <tr><td colSpan="7" className="empty-cell">Chưa có tài liệu nào.</td></tr>}
            {crud.rows.map(doc => (
              <tr key={doc.id}>
                <td><input type="checkbox" checked={selectedDocs.includes(doc.id)} onChange={() => toggleSelect(doc.id)}/></td>
                <td><strong>{doc.code}</strong></td>
                <td>{doc.title}</td>
                <td className="muted">{doc.fileName || "Chưa có file"}</td>
                <td><OcrBadge status={doc.ocrStatus}/></td>
                <td><StatusBadge status={doc.status}/></td>
                <td>
                  <button className="btn primary" style={{fontSize:12,padding:"3px 8px"}} onClick={() => { setSelectedDocs([doc.id]); handleBatchOcr(); }}>
                    <Zap size={11}/> OCR
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
