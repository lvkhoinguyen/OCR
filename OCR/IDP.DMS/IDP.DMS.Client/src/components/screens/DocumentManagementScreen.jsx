import { useState, useRef, useMemo } from "react";
import { FileText, Search, Save, Upload, X } from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { useCrud } from "../../hooks/useCrud";
import { emptyDocument } from "../../utils/constants";
import { PanelTitle, DataTable } from "../shared/SharedComponents";

export default function DocumentManagementScreen() {
  const crud = useCrud("documents", emptyDocument);
  const [keyword, setKeyword] = useState("");
  const fileInputRef = useRef(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [ocrEngine, setOcrEngine] = useState("gemini");
  const [showEngineModal, setShowEngineModal] = useState(false);
  const [versionHistoryDoc, setVersionHistoryDoc] = useState(null);
  const [versionRows, setVersionRows] = useState([]);
  const [versionError, setVersionError] = useState("");

  const rows = useMemo(() => {
    if (!keyword) return crud.rows;
    const k = keyword.toLowerCase();
    return crud.rows.filter((row) => `${row.code} ${row.title} ${row.fileName}`.toLowerCase().includes(k));
  }, [crud.rows, keyword]);

  const handleUploadClick = (id) => {
    setUploadingId(id);
    setShowEngineModal(true);
  };

  const handleEngineConfirm = () => {
    setShowEngineModal(false);
    if(fileInputRef.current) fileInputRef.current.click();
  };

  async function openVersionHistory(document) {
    setVersionHistoryDoc(document);
    setVersionError("");
    try {
      setVersionRows(await uiApi.gd2.documentVersions(document.id));
    } catch (error) {
      setVersionRows([]);
      setVersionError(error.message);
    }
  }

  async function createVersionSnapshot() {
    if (!versionHistoryDoc) return;
    try {
      const version = await uiApi.gd2.createDocumentVersion(versionHistoryDoc.id, {
        createdBy: "current-user",
        note: "Tạo phiên bản thủ công",
      });
      setVersionRows(current => [version, ...current]);
    } catch (error) {
      setVersionError(error.message);
    }
  }

  async function restoreVersion(version) {
    if (!versionHistoryDoc || !window.confirm(`Khôi phục tài liệu về phiên bản V${version.versionNumber}?`)) return;
    try {
      await uiApi.gd2.restoreDocumentVersion(versionHistoryDoc.id, version.id, { actor: "current-user" });
      setVersionHistoryDoc(null);
      await crud.reset();
      window.location.reload();
    } catch (error) {
      setVersionError(error.message);
    }
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    alert(`AI đang bắt đầu quét ảnh bằng engine: ${ocrEngine}... Vui lòng không đóng trang!
(Quá trình này có thể mất vài giây)`);
    
    try {
      // Gọi API backend thay vì dùng Tesseract JS (vì Tesseract JS không đọc được tiếng Việt viết tay)
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`http://localhost:5103/api/ocr/extract?engine=${ocrEngine}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.title || `Lỗi HTTP: ${response.status}`);
      }

      const result = await response.json();
      const finalText = result.text ? result.text.trim() : "";
      
      let finalDescription = finalText;

      if (uploadingId) {
        alert(`Upload & OCR hoàn tất!`);
        const targetRow = rows.find(r => r.id === uploadingId);
        if (targetRow) {
           crud.edit(targetRow);
           crud.setField("fileName", file.name);
           crud.setField("description", finalDescription);
           crud.setField("ocrStatus", "DONE");
        }
        setUploadingId(null);
      } else {
         crud.setField("fileName", file.name);
         crud.setField("description", finalDescription);
         crud.setField("ocrStatus", "DONE");
         alert("Trích xuất OCR thành công!");
      }
    } catch (e) {
      alert("Lỗi AI OCR: " + e.message);
      setUploadingId(null);
    }
  };


  return (
    <section className="panel">
      <PanelTitle icon={<FileText />} title="Quản lý tài liệu" />
      <div className="search-strip">
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Nhập mã, tên, file..." />
        <button className="btn primary">
          <Search size={16} /> Tìm kiếm
        </button>
      </div>

      <form className="crud-form" onSubmit={crud.save}>
        <div className="field">
          <span>Hồ sơ ID</span>
          <input type="number" value={crud.form.dossierId || ""} onChange={(e) => crud.setField("dossierId", e.target.value)} required />
        </div>
        <div className="field">
          <span>Mã tài liệu</span>
          <input value={crud.form.code} onChange={(e) => crud.setField("code", e.target.value)} required />
        </div>
        <div className="field required">
          <span>Tên tài liệu</span>
          <input value={crud.form.title} onChange={(e) => crud.setField("title", e.target.value)} required />
        </div>
        <div className="field">
          <span>Tên file</span>
          <input value={crud.form.fileName} onChange={(e) => crud.setField("fileName", e.target.value)} />
        </div>
        <div className="field">
          <span>Mô tả / nội dung OCR</span>
          <textarea value={crud.form.description} onChange={(e) => crud.setField("description", e.target.value)} rows={3} />
        </div>
        <div className="form-actions">
          <button className="btn primary" type="submit">
            <Save size={16} /> {crud.form.id ? "Cập nhật" : "Thêm mới"}
          </button>
          <button className="btn ok" type="button" onClick={() => handleUploadClick(null)}>
            <Upload size={16} /> Quét OCR (Tạo mới)
          </button>
          <button className="btn" type="button" onClick={crud.reset}>
            <X size={16} /> Bỏ qua
          </button>
        </div>
      </form>
      {crud.error && <div className="alert">{crud.error}</div>}

      <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} accept="image/*,application/pdf" />
      {showEngineModal && (
        <div className="modal-overlay" onClick={() => setShowEngineModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Chọn Engine OCR</h3>
            <p className="muted">Hệ thống AI sẽ tự động bóc tách nội dung chữ thành văn bản máy tính.</p>
            <div className="engine-options">
              <label className={`engine-option ${ocrEngine === "gemini" ? "selected" : ""}`}>
                <input type="radio" name="engine" value="gemini" checked={ocrEngine === "gemini"} onChange={(e) => setOcrEngine(e.target.value)} />
                <div className="engine-info">
                  <strong>Gemini AI (Khuyên dùng)</strong>
                  <span>Google Gemini Vision - Chữ viết tay tiếng Việt, độ chính xác cao nhất</span>
                </div>
              </label>
              <label className={`engine-option ${ocrEngine === "vietocr" ? "selected" : ""}`}>
                <input type="radio" name="engine" value="vietocr" checked={ocrEngine === "vietocr"} onChange={(e) => setOcrEngine(e.target.value)} />
                <div className="engine-info">
                  <strong>VietOCR TransformerOCR</strong>
                  <span>Chữ viết tay tiếng Việt - Model tự huấn luyện (offline)</span>
                </div>
              </label>
              <label className={`engine-option ${ocrEngine === "easyocr" ? "selected" : ""}`}>
                <input type="radio" name="engine" value="easyocr" checked={ocrEngine === "easyocr"} onChange={(e) => setOcrEngine(e.target.value)} />
                <div className="engine-info">
                  <strong>EasyOCR</strong>
                  <span>Chữ in (printed text) - Tiếng Việt &amp; Tiếng Anh</span>
                </div>
              </label>
              <label className={`engine-option ${ocrEngine === "crnn" ? "selected" : ""}`}>
                <input type="radio" name="engine" value="crnn" checked={ocrEngine === "crnn"} onChange={(e) => setOcrEngine(e.target.value)} />
                <div className="engine-info">
                  <strong>CRNN + BiLSTM + CTC</strong>
                  <span>Chữ viết tay tiếng Việt - Model tự huấn luyện (offline)</span>
                </div>
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn primary" onClick={handleEngineConfirm}>
                <Upload size={16} /> Chọn file & Upload
              </button>
              <button className="btn" onClick={() => setShowEngineModal(false)}>
                <X size={16} /> Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {versionHistoryDoc && (
        <div className="modal-overlay" onClick={() => setVersionHistoryDoc(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <h3 style={{ margin: 0 }}>
                Lịch sử phiên bản: {versionHistoryDoc.title || versionHistoryDoc.code}
              </h3>
              <div style={{display:"flex", gap:8}}>
                <button className="btn primary" onClick={createVersionSnapshot}>Lưu phiên bản hiện tại</button>
                <button className="icon-btn" onClick={() => setVersionHistoryDoc(null)}>X</button>
              </div>
            </div>
            <p className="muted">Hệ thống ghi nhận mọi thay đổi (Version Control) để phục vụ tra cứu và khôi phục khi cần thiết.</p>
            {versionError && <div className="alert">{versionError}</div>}
            
            <div style={{ marginTop: 20 }}>
              <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Phiên bản</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Người sửa</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Thời gian</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Ghi chú thay đổi</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {versionRows.map(version => (
                    <tr key={version.id} style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#16a34a' }}>V{version.versionNumber}</td>
                      <td style={{ padding: '10px' }}>{version.createdBy}</td>
                      <td style={{ padding: '10px' }}>{new Date(version.createdAt).toLocaleString("vi-VN")}</td>
                      <td style={{ padding: '10px' }}>{version.note || "Không có ghi chú"}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button className="btn warn" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => restoreVersion(version)}>Khôi phục</button>
                      </td>
                    </tr>
                  ))}
                  {versionRows.length === 0 && <tr><td colSpan="5" className="empty-cell">Chưa có phiên bản.</td></tr>}
                </tbody>
              </table>
            </div>
            
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn" onClick={() => setVersionHistoryDoc(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      <DataTable 
        rows={rows} 
        columns={[
          ["dossierId", "Hồ sơ"],
          ["code", "Mã"],
          ["title", "Tên tài liệu"],
          ["fileName", "File"],
          ["ocrStatus", "OCR"],
          ["status", "Trạng thái"]
        ]} 
        onEdit={crud.edit} 
        onDelete={crud.remove} 
        onUpload={handleUploadClick}
        onHistory={(id) => openVersionHistory(rows.find(r => r.id === id))}
      />
    </section>
  );
}
