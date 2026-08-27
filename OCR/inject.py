import re

app_path = r"d:\Hacom\OCR\OCR\IDP.DMS\IDP.DMS.Client\src\App.jsx"

with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

doc_new = """function DocumentManagementScreen() {
  const crud = useCrud("documents", emptyDocument);
  const [keyword, setKeyword] = useState("");
  const fileInputRef = useRef(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [ocrEngine, setOcrEngine] = useState("vietocr");
  const [showEngineModal, setShowEngineModal] = useState(false);
  const [versionHistoryDoc, setVersionHistoryDoc] = useState(null);

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

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !uploadingId) return;
    try {
      await uiApi.crud("documents").upload(uploadingId, file, ocrEngine);
      alert(`Upload & OCR hoàn tất! (Engine: ${ocrEngine})`);
      crud.reset();
      window.location.reload();
    } catch (e) {
      alert("Lỗi upload: " + e.message);
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
            <h3>🔍 Chọn Engine OCR</h3>
            <p className="muted">Hệ thống AI sẽ tự động bóc tách nội dung chữ thành văn bản máy tính.</p>
            <div className="engine-options">
              <label className={`engine-option ${ocrEngine === "easyocr" ? "selected" : ""}`}>
                <input type="radio" name="engine" value="easyocr" checked={ocrEngine === "easyocr"} onChange={(e) => setOcrEngine(e.target.value)} />
                <div className="engine-info">
                  <strong>📝 EasyOCR</strong>
                  <span>Chữ in (printed text) — Tiếng Việt & Tiếng Anh</span>
                </div>
              </label>
              <label className={`engine-option ${ocrEngine === "crnn" ? "selected" : ""}`}>
                <input type="radio" name="engine" value="crnn" checked={ocrEngine === "crnn"} onChange={(e) => setOcrEngine(e.target.value)} />
                <div className="engine-info">
                  <strong>✍️ CRNN + BiLSTM + CTC</strong>
                  <span>Chữ viết tay tiếng Việt — Model tự huấn luyện</span>
                </div>
              </label>
              <label className={`engine-option ${ocrEngine === "vietocr" ? "selected" : ""}`}>
                <input type="radio" name="engine" value="vietocr" checked={ocrEngine === "vietocr"} onChange={(e) => setOcrEngine(e.target.value)} />
                <div className="engine-info">
                  <strong>🤖 VietOCR TransformerOCR</strong>
                  <span>Chữ viết tay tiếng Việt — Độ chính xác cao (khuyên dùng)</span>
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
              <button className="icon-btn" onClick={() => setVersionHistoryDoc(null)}>X</button>
            </div>
            <p className="muted">Hệ thống ghi nhận mọi thay đổi (Version Control) để phục vụ tra cứu và khôi phục khi cần thiết.</p>
            
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
                  <tr style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#16a34a' }}>V1.2 (Hiện tại)</td>
                    <td style={{ padding: '10px' }}>Trần Thị B</td>
                    <td style={{ padding: '10px' }}>Vừa xong</td>
                    <td style={{ padding: '10px' }}>Cập nhật file scan mới (đã ký)</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>-</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>V1.1</td>
                    <td style={{ padding: '10px' }}>Nguyễn Văn A</td>
                    <td style={{ padding: '10px' }}>Hôm qua, 14:30</td>
                    <td style={{ padding: '10px' }}>Chỉnh sửa metadata (sửa tên)</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button className="btn warn" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => { alert('Đã khôi phục tài liệu về phiên bản V1.1'); setVersionHistoryDoc(null); }}>Khôi phục</button>
                    </td>
                  </tr>
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
        onHistory={(id) => setVersionHistoryDoc(rows.find(r => r.id === id))}
      />
    </section>
  );
}
"""

# Append DocumentManagementScreen before export default App
content = content.replace("export default function App() {", doc_new + "\nexport default function App() {")

with open(app_path, "w", encoding="utf-8") as f:
    f.write(content)
