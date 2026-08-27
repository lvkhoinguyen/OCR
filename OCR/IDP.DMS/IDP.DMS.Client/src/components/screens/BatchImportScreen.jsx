import { useState, useEffect, useRef } from "react";
import { Download, Upload, FileText, Archive, X, CheckCircle2, History, RefreshCw } from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { StatusBadge } from "../shared/SharedComponents";

export function calculateImportProgress(job) {
  if (["COMPLETED", "COMPLETED_WITH_ERRORS"].includes(job?.status)) return 100;
  const imported = Number(job?.importedDocuments || 0);
  const total = Math.max(1, Number(job?.totalRows || imported || 1));
  const queued = Number(job?.ocrQueued || 0);
  const processed = Number(job?.ocrCompleted || 0) + Number(job?.ocrFailed || 0);
  return Math.min(99, 30 * imported / total + (queued ? 70 * processed / queued : 0));
}

export function formatBatchFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function BatchImportScreen() {
  const [excelFile, setExcelFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [ocrEngine, setOcrEngine] = useState("vietocr");
  const [job, setJob] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [pollJobId, setPollJobId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState(0);
  const [dragTarget, setDragTarget] = useState("");
  const [notice, setNotice] = useState(null);
  const excelInputRef = useRef(null);
  const zipInputRef = useRef(null);

  const terminalStatuses = new Set(["COMPLETED", "COMPLETED_WITH_ERRORS"]);
  const progress = job ? calculateImportProgress(job) : uploadStage;

  useEffect(() => { loadRecentJobs(); }, []);

  useEffect(() => {
    if (!pollJobId) return undefined;
    let cancelled = false;
    let timer;
    async function poll() {
      try {
        const current = await uiApi.dms.batchImportJob(pollJobId);
        if (cancelled) return;
        setJob(current);
        if (terminalStatuses.has(current.status)) {
          setPollJobId(null);
          loadRecentJobs();
          return;
        }
      } catch (error) {
        if (!cancelled) setNotice({type:"error",text:`Không cập nhật được tiến trình: ${error.message}`});
      }
      if (!cancelled) timer = window.setTimeout(poll, 1500);
    }
    poll();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [pollJobId]);

  async function loadRecentJobs() {
    try {
      setRecentJobs(await uiApi.dms.batchImportJobs(12));
    } catch (error) {
      setNotice({type:"error",text:`Không tải được lịch sử import. Hãy khởi tạo DB sau khi triển khai: ${error.message}`});
    }
  }

  function acceptFile(file, type) {
    if (!file) return;
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (type === "excel" && extension !== ".xlsx") {
      setNotice({type:"error",text:"Danh mục hồ sơ phải là tệp .xlsx."});
      return;
    }
    if (type === "zip" && extension !== ".zip") {
      setNotice({type:"error",text:"Tài liệu đính kèm phải là tệp .zip."});
      return;
    }
    if (type === "excel" && file.size > 10 * 1024 * 1024) {
      setNotice({type:"error",text:"Tệp Excel vượt giới hạn 10 MB."});
      return;
    }
    if (type === "zip" && file.size > 250 * 1024 * 1024) {
      setNotice({type:"error",text:"Tệp ZIP vượt giới hạn 250 MB."});
      return;
    }
    if (type === "excel") setExcelFile(file); else setZipFile(file);
    setNotice(null);
  }

  function handleDrop(event, type) {
    event.preventDefault();
    setDragTarget("");
    acceptFile(event.dataTransfer.files?.[0], type);
  }

  async function downloadTemplate() {
    try {
      const blob = await uiApi.dms.batchImportTemplate();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "DanhMucHoSo.xlsx";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice({type:"error",text:`Không tải được template: ${error.message}`});
    }
  }

  async function startImport() {
    if (!excelFile || !zipFile) {
      setNotice({type:"error",text:"Vui lòng chọn đủ DanhMucHoSo.xlsx và TaiLieu.zip."});
      return;
    }
    try {
      setUploading(true);
      setJob(null);
      setUploadStage(5);
      setNotice({type:"info",text:"Đang upload, kiểm tra Excel và đối chiếu nội dung ZIP..."});
      const result = await uiApi.dms.batchImportZip(excelFile, zipFile, ocrEngine, percent => {
        setUploadStage(Math.min(28, 5 + percent * 0.23));
      });
      setJob(result);
      setUploadStage(30);
      setNotice({
        type: result.failedRows > 0 ? "warning" : "success",
        text: `Đã import ${result.importedDossiers} hồ sơ, ${result.importedDocuments} văn bản; ${result.failedRows} dòng lỗi. ${result.ocrQueued > result.ocrCompleted + result.ocrFailed ? "OCR đang chạy nền." : "Phiên import đã hoàn tất."}`,
      });
      if (!terminalStatuses.has(result.status)) setPollJobId(result.jobId);
      await loadRecentJobs();
    } catch (error) {
      setUploadStage(0);
      setNotice({type:"error",text:`Import thất bại: ${error.message}`});
    } finally {
      setUploading(false);
    }
  }

  function openJob(selectedJob) {
    setJob(selectedJob);
    if (!terminalStatuses.has(selectedJob.status)) setPollJobId(selectedJob.id);
    else setPollJobId(null);
  }

  return (
    <div className="batch-import-screen">
      <div className="batch-import-header">
        <div>
          <span className="gd21415-section-kicker">ZIP + Excel Batch Import</span>
          <h2>Import hồ sơ hàng loạt</h2>
          <p>Đối chiếu danh mục Excel với file trong ZIP, tạo hồ sơ/văn bản và tự động OCR nền.</p>
        </div>
        <button className="btn" type="button" onClick={downloadTemplate}><Download size={15}/> Tải template Excel mẫu</button>
      </div>

      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}

      <div className="batch-import-controls">
        <div className="batch-import-drop-grid">
          <div className={`batch-drop-zone ${dragTarget === "excel" ? "dragging" : ""} ${excelFile ? "selected" : ""}`}
            onDragOver={event => {event.preventDefault();setDragTarget("excel");}} onDragLeave={() => setDragTarget("")} onDrop={event => handleDrop(event,"excel")} onClick={() => excelInputRef.current?.click()}>
            <input ref={excelInputRef} type="file" accept=".xlsx" onChange={event => acceptFile(event.target.files?.[0],"excel")}/>
            <FileText size={30}/><strong>DanhMucHoSo.xlsx</strong>
            <span>{excelFile ? `${excelFile.name} · ${formatBatchFileSize(excelFile.size)}` : "Kéo thả hoặc bấm để chọn Excel"}</span>
            {excelFile && <button className="icon-btn danger" type="button" title="Bỏ tệp" onClick={event => {event.stopPropagation();setExcelFile(null);}}><X size={13}/></button>}
          </div>
          <div className={`batch-drop-zone zip ${dragTarget === "zip" ? "dragging" : ""} ${zipFile ? "selected" : ""}`}
            onDragOver={event => {event.preventDefault();setDragTarget("zip");}} onDragLeave={() => setDragTarget("")} onDrop={event => handleDrop(event,"zip")} onClick={() => zipInputRef.current?.click()}>
            <input ref={zipInputRef} type="file" accept=".zip" onChange={event => acceptFile(event.target.files?.[0],"zip")}/>
            <Archive size={30}/><strong>TaiLieu.zip</strong>
            <span>{zipFile ? `${zipFile.name} · ${formatBatchFileSize(zipFile.size)}` : "Kéo thả hoặc bấm để chọn ZIP"}</span>
            {zipFile && <button className="icon-btn danger" type="button" title="Bỏ tệp" onClick={event => {event.stopPropagation();setZipFile(null);}}><X size={13}/></button>}
          </div>
        </div>
        <div className="batch-import-action-row">
          <label>Engine OCR nền<select value={ocrEngine} onChange={event => setOcrEngine(event.target.value)}><option value="vietocr">VietOCR</option><option value="gemini">Gemini</option><option value="easyocr">EasyOCR</option><option value="tesseract">Tesseract</option><option value="crnn">CRNN</option></select></label>
          <button className="btn primary" type="button" disabled={uploading || !excelFile || !zipFile} onClick={startImport}><Upload size={15}/>{uploading ? "Đang kiểm tra..." : "Bắt đầu import"}</button>
        </div>
        <div className="batch-progress-block">
          <div><strong>Tiến trình</strong><span>{Math.round(progress)}%</span></div>
          <div className="progress-bar-track"><div className="progress-bar-fill" style={{width:`${progress}%`}}></div></div>
          <small>{job ? `${job.ocrCompleted || 0}/${job.ocrQueued || 0} OCR hoàn tất · ${job.ocrFailed || 0} lỗi OCR · Trạng thái ${job.status}` : "Chưa bắt đầu"}</small>
        </div>
      </div>

      {job && <div className="batch-import-summary">
        <div><strong>{job.totalRows}</strong><span>Dòng Excel</span></div><div><strong>{job.importedDossiers}</strong><span>Hồ sơ đã tạo</span></div><div><strong>{job.importedDocuments}</strong><span>Văn bản đã tạo</span></div><div className={job.failedRows ? "error" : ""}><strong>{job.failedRows}</strong><span>Dòng lỗi</span></div><div><strong>{job.ocrCompleted || 0}/{job.ocrQueued || 0}</strong><span>OCR hoàn tất</span></div>
      </div>}

      <div className="batch-import-layout">
        <div className="batch-result-panel">
          <div className="gd22-section-head"><CheckCircle2 size={16}/> Bảng đối soát kết quả {job ? `· ${job.jobCode || job.code}` : ""}</div>
          <div className="table-wrap"><table><thead><tr><th>Dòng</th><th>Mã hồ sơ</th><th>Mã văn bản</th><th>File đính kèm</th><th>Trạng thái</th><th>Kết quả</th></tr></thead><tbody>
            {(job?.items || []).map(item => <tr key={item.id}><td>{item.rowNumber}</td><td><span className="gd2-code">{item.dossierCode || "--"}</span></td><td>{item.documentCode || "--"}</td><td title={item.attachmentFileName}>{item.attachmentFileName || "--"}</td><td><StatusBadge status={item.status}/></td><td className={item.status.includes("ERROR") ? "batch-error-text" : ""}>{item.message || "--"}</td></tr>)}
            {!job?.items?.length && <tr><td colSpan="6" className="empty-cell">Kết quả từng dòng sẽ hiển thị sau khi import.</td></tr>}
          </tbody></table></div>
        </div>
        <aside className="batch-history-panel">
          <div className="gd22-section-head"><History size={16}/> Lịch sử import <button className="icon-btn" type="button" onClick={loadRecentJobs}><RefreshCw size={12}/></button></div>
          <div className="batch-history-list">{recentJobs.map(item => <button type="button" key={item.id} className={job?.id === item.id || job?.jobId === item.id ? "active" : ""} onClick={() => openJob(item)}><strong>{item.code}</strong><span>{new Date(item.createdAt).toLocaleString("vi-VN")}</span><small>{item.importedDocuments} văn bản · {item.failedRows} lỗi · {item.status}</small></button>)}{!recentJobs.length && <div className="empty-cell">Chưa có phiên import.</div>}</div>
        </aside>
      </div>
    </div>
  );
}
