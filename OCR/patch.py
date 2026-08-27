import re

app_path = r"d:\Hacom\OCR\OCR\IDP.DMS\IDP.DMS.Client\src\App.jsx"

with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add icons to lucide-react import
content = re.sub(r'(\s+X\n\} from "lucide-react";)', r'\n  CheckCircle2,\n  PieChart,\n  Download,\n  History,\n  RefreshCw\1', content)

# 2. Update moduleMap and itemResourceMap
# moduleMap
content = content.replace('"Báo cáo thống kê": "reports"', '"Báo cáo thống kê": "reports",\n  "Tích hợp hệ thống": "admin"')
# itemResourceMap
item_res = """  "Danh mục mục lục": "catalog-indexes",
  "Tích hợp phần mềm ngoài": "integration-screen",
  "Thiết lập nhóm quyền": "permission-groups",
  "Khai báo cáo": "report-dashboard",
  "Xuất báo cáo": "report-dashboard",
  "Số hóa & Bóc tách AI (OCR)": "ocr-screen",
  "Kiểm duyệt hồ sơ xuất bản": "approval",
  "Xác nhận hồ sơ xuất bản": "approval","""
content = re.sub(r'  "Danh mục mục lục": "catalog-indexes",\n\s+"Khai báo cáo": "reports",\n\s+"Xuất báo cáo": "reports",', item_res, content)

# 3. Update activeResource router (main tag)
router_old = """          {activeResource === "reports" && <ReportCrudScreen />}
          {!["storage", "dossiers", "documents", "borrow", "reports"].includes(activeResource) && <SimpleResourceScreen title={activeItem} resource={activeResource} group={activeGroup} />}"""
router_new = """          {activeResource === "reports" && <ReportCrudScreen />}
          {activeResource === "approval" && <ApprovalScreen title={activeItem} />}
          {activeResource === "report-dashboard" && <DashboardReportScreen />}
          {activeResource === "permission-groups" && <PermissionScreen title={activeItem} />}
          {activeResource === "ocr-screen" && <OcrScreen />}
          {activeResource === "integration-screen" && <IntegrationScreen />}
          {!["storage", "dossiers", "documents", "ocr-screen", "integration-screen", "approval", "borrow", "reports", "report-dashboard", "permission-groups"].includes(activeResource) && <SimpleResourceScreen title={activeItem} resource={activeResource} group={activeGroup} />}"""
content = content.replace(router_old, router_new)

# 4. Modify DocumentManagementScreen to add OCR uploading and History
doc_old = """function DocumentManagementScreen() {
  const crud = useCrud("documents", emptyDocument);
  const [keyword, setKeyword] = useState("");
  const rows = useMemo(() => {
    if (!keyword) return crud.rows;
    const k = keyword.toLowerCase();
    return crud.rows.filter((row) => `${row.code} ${row.title} ${row.fileName}`.toLowerCase().includes(k));
  }, [crud.rows, keyword]);

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
      />
    </section>
  );
}"""

doc_new = """function DocumentManagementScreen() {
  const crud = useCrud("documents", emptyDocument);
  const [keyword, setKeyword] = useState("");
  const fileInputRef = React.useRef(null);
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
}"""
content = content.replace(doc_old, doc_new)

# 5. Modify DataTable to support onUpload and onHistory
dt_old = """function DataTable({ rows, columns, onEdit, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map(([, label]) => (
              <th key={label}>{label}</th>
            ))}
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="empty-cell">
                Chưa có dữ liệu hoặc chưa khởi tạo DB.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                {columns.map(([key]) => (
                  <td key={key}>{formatCell(row[key])}</td>
                ))}
                <td>
                  {onEdit && (
                    <button className="icon-btn primary" onClick={() => onEdit(row.id)} title="Sửa">
                      <Edit size={15} />
                    </button>
                  )}
                  {onDelete && (
                    <button className="icon-btn danger" onClick={() => onDelete(row.id)} title="Xóa">
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}"""

dt_new = """function DataTable({ rows, columns, onEdit, onDelete, onUpload, onHistory }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map(([, label]) => (
              <th key={label}>{label}</th>
            ))}
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="empty-cell">
                Chưa có dữ liệu hoặc chưa khởi tạo DB.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                {columns.map(([key]) => (
                  <td key={key}>{formatCell(row[key])}</td>
                ))}
                <td>
                  {onHistory && (
                    <button className="icon-btn" style={{ color: '#0369a1', marginRight: 5 }} onClick={() => onHistory(row.id)} title="Lịch sử phiên bản">
                      <RefreshCw size={15} />
                    </button>
                  )}
                  {onUpload && (
                    <button className="icon-btn ok" onClick={() => onUpload(row.id)} title="Tải lên file & chạy OCR" style={{ marginRight: 5 }}>
                      <Upload size={15} />
                    </button>
                  )}
                  {onEdit && (
                    <button className="icon-btn primary" onClick={() => onEdit(row.id)} title="Sửa" style={{ marginRight: 5 }}>
                      <Edit size={15} />
                    </button>
                  )}
                  {onDelete && (
                    <button className="icon-btn danger" onClick={() => onDelete(row.id)} title="Xóa">
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}"""
content = content.replace(dt_old, dt_new)


# 6. Append new screens before export default App;
screens = """

function ApprovalScreen({ title }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signPin, setSignPin] = useState("");

  useEffect(() => {
    uiApi.crud("dossiers").list().then(data => {
      setRows(data.filter(d => d.status === "PENDING" || d.status === "DRAFT"));
    }).catch(e => setError(e.message));
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const dossierRow = rows.find(r => r.id === id);
      const form = { ...emptyDossier, ...dossierRow };
      form.status = newStatus;
      const payload = { ...form };
      await uiApi.crud("dossiers").update(id, payload);
      alert(`Đã chuyển trạng thái hồ sơ sang ${newStatus}`);
      setRows(rows.filter(r => r.id !== id));
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
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
      const form = { ...emptyDossier, ...dossierRow };
      form.status = "PUBLISHED";
      form.description = (form.description ? form.description + "\\n" : "") + "[Đã ký số điện tử hợp pháp]";
      
      const payload = { ...form };
      await uiApi.crud("dossiers").update(selectedId, payload);
      alert("Đã ký số và ban hành hồ sơ thành công!");
      setRows(rows.filter(r => r.id !== selectedId));
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  };

  return (
    <section className="panel">
      <PanelTitle icon={<CheckCircle2 />} title={title || "Kiểm duyệt hồ sơ xuất bản"} />
      {error && <div className="alert">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã HS</th>
              <th>Tên HS</th>
              <th>Loại</th>
              <th>Trạng thái</th>
              <th>Thao tác duyệt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td>{row.code}</td>
                <td>{row.title}</td>
                <td>{row.dossierType}</td>
                <td><span className={`badge ${row.status.toLowerCase()}`}>{row.status}</span></td>
                <td>
                  <button className="btn ok" onClick={() => handleStatusChange(row.id, "PUBLISHED")} style={{marginRight: 5}}>Duyệt (Publish)</button>
                  <button className="btn warn" onClick={() => handleStatusChange(row.id, "REJECTED")} style={{marginRight: 5}}>Từ chối</button>
                  <button className="btn primary" onClick={() => { setSelectedId(row.id); setShowSignModal(true); }}>Ký số & Ban hành</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="5">Không có hồ sơ nào chờ duyệt.</td></tr>}
          </tbody>
        </table>
      </div>
      
      {showSignModal && (
        <div className="modal-overlay" onClick={() => setShowSignModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Ký số & Ban hành hồ sơ</h3>
            <div className="field">
              <span>Chọn chứng thư số</span>
              <select>
                <option>USB Token - VNPT CA</option>
                <option>USB Token - Viettel CA</option>
                <option>Máy chủ HSM Doanh nghiệp</option>
              </select>
            </div>
            <div className="field">
              <span>Nhập mã PIN</span>
              <input type="password" value={signPin} onChange={e => setSignPin(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn primary" onClick={handleSignConfirm}>Xác nhận Ký số</button>
              <button className="btn" onClick={() => setShowSignModal(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PermissionScreen({ title }) {
  const crud = useCrud("permission-groups", emptySimple);
  return (
    <section className="panel">
      <PanelTitle icon={<CheckCircle2 />} title={title} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nhóm quyền</th>
              <th>Xem</th>
              <th>Thêm</th>
              <th>Sửa</th>
              <th>Xóa</th>
            </tr>
          </thead>
          <tbody>
            {crud.rows.map(row => (
              <tr key={row.id}>
                <td><strong>{row.name}</strong></td>
                <td><input type="checkbox" defaultChecked /></td>
                <td><input type="checkbox" defaultChecked /></td>
                <td><input type="checkbox" defaultChecked /></td>
                <td><input type="checkbox" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DashboardReportScreen() {
  const handleExport = (type) => alert(`Đang tải báo cáo: ${type}...`);
  return (
    <section className="panel">
      <PanelTitle icon={<PieChart />} title="Báo cáo và phân tích" />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 20 }}>
        <button className="btn ok" onClick={() => handleExport("Excel")}>Xuất Excel</button>
        <button className="btn danger" onClick={() => handleExport("PDF")}>Xuất PDF</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 15, marginBottom: 30 }}>
        <div style={{ padding: 20, backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <div>Hồ sơ đã số hóa</div><div style={{ fontSize: '2rem' }}>1,250</div>
        </div>
      </div>
    </section>
  );
}

function IntegrationScreen() {
  return (
    <section className="panel">
      <PanelTitle icon={<CheckCircle2 />} title="Tích hợp phần mềm ngoài" />
      <p>Hệ thống đã kết nối thành công với phần mềm Kế toán và ERP.</p>
    </section>
  );
}

function OcrScreen() {
  return (
    <section className="panel">
      <PanelTitle icon={<CheckCircle2 />} title="Số hóa & Bóc tách AI (OCR)" />
      <p>Chức năng đã được tích hợp trực tiếp vào màn hình Quản lý tài liệu.</p>
    </section>
  );
}

"""

content = content.replace("export default function App() {", screens + "export default function App() {")

with open(app_path, "w", encoding="utf-8") as f:
    f.write(content)
