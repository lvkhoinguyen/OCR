import { useState, useEffect, useMemo, useRef } from "react";
import { Upload, X, Trash2 } from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { useCrud } from "../../hooks/useCrud";
import { emptyStorage } from "../../utils/constants";
import { PanelTitle, StatusBadge, OcrBadge } from "../shared/SharedComponents";

const technicalModelPattern = /\.(ifc|stl|obj|step|stp)$/i;
const isTechnicalModelFile = fileName => technicalModelPattern.test(String(fileName || ""));

export default function DossierScreen({ mode }) {
  const storageCrud = useCrud("storage", emptyStorage);
  const [dossiers, setDossiers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadPolicy, setUploadPolicy] = useState({ maxBytes: 25 * 1024 * 1024, maxMegabytes: 25, technicalModelMaxBytes: 200 * 1024 * 1024, technicalModelMaxMegabytes: 200 });
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    storageId: "",
    title: "",
    documentType: "QUYET_DINH",
    status: "DRAFT",
    engine: "gemini"
  });

  const storageById = useMemo(
    () => new Map(storageCrud.rows.map(row => [Number(row.id), row])),
    [storageCrud.rows]
  );
  const storageOptions = useMemo(() => {
    const typeLabel = { KHO: "Kho", KE: "Kệ", TANG: "Tầng", HOP: "Hộp" };
    const pathOf = row => {
      const path = [];
      const visited = new Set();
      let current = row;
      while (current && !visited.has(Number(current.id))) {
        visited.add(Number(current.id));
        path.unshift(current.name);
        current = storageById.get(Number(current.parentId));
      }
      return path.join(" / ");
    };
    return storageCrud.rows
      .filter(row => String(row.status || "ACTIVE").toUpperCase() === "ACTIVE")
      .map(row => ({
        value: String(row.id),
        label: `${typeLabel[row.locationType] || row.locationType}: ${pathOf(row)} (${row.code})`
      }));
  }, [storageCrud.rows, storageById]);
  const dossierById = useMemo(
    () => new Map(dossiers.map(row => [Number(row.id), row])),
    [dossiers]
  );

  useEffect(() => {
    runSearch();
    uiApi.crud("documents").uploadPolicy("DEFAULT")
      .then(setUploadPolicy)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.storageId && storageOptions.length) {
      setField("storageId", storageOptions[0].value);
    }
  }, [storageOptions, form.storageId]);

  async function runSearch() {
    try {
      const [dossierResult, documentResult] = await Promise.all([
        uiApi.crud("dossiers").list(),
        uiApi.crud("documents").list()
      ]);
      setDossiers(Array.isArray(dossierResult) ? dossierResult : (dossierResult?.items || []));
      const rows = Array.isArray(documentResult) ? documentResult : (documentResult?.items || []);
      setDocuments([...rows].sort((left, right) => Number(right.id) - Number(left.id)));
    } catch (e) {
      setNotice({ type: "error", text: "Không tải được danh sách tài liệu." });
    }
  }

  async function loadTree() {
    await storageCrud.load();
  }

  function setField(key, value) { setForm(current => ({ ...current, [key]: value })); }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    const fileLimit = isTechnicalModelFile(file?.name) ? uploadPolicy.technicalModelMaxBytes : uploadPolicy.maxBytes;
    const fileLimitMb = isTechnicalModelFile(file?.name) ? uploadPolicy.technicalModelMaxMegabytes : uploadPolicy.maxMegabytes;
    if (file && file.size > fileLimit) {
      setPendingFile(null);
      event.target.value = "";
      setNotice({ type: "error", text: `Tệp vượt hạn mức tải lên (${fileLimitMb} MB).` });
      return;
    }
    setPendingFile(file);
    setNotice(null);
    if (file && !form.title.trim()) {
      setField("title", file.name.replace(/\.[^.]+$/, ""));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.storageId || !form.title.trim()) {
      setNotice({ type: "error", text: "Vui lòng chọn kho lưu trữ và nhập tên tài liệu." });
      return;
    }
    const pendingLimit = isTechnicalModelFile(pendingFile?.name) ? uploadPolicy.technicalModelMaxBytes : uploadPolicy.maxBytes;
    const pendingLimitMb = isTechnicalModelFile(pendingFile?.name) ? uploadPolicy.technicalModelMaxMegabytes : uploadPolicy.maxMegabytes;
    if (pendingFile && pendingFile.size > pendingLimit) {
      setNotice({ type: "error", text: `Tệp vượt hạn mức tải lên (${pendingLimitMb} MB).` });
      return;
    }
    setLoading(true);
    setNotice(null);
    try {
      const result = await uiApi.crud("documents").quickUpload({
        storageId: Number(form.storageId),
        file: pendingFile,
        title: form.title.trim(),
        documentType: form.documentType,
        status: form.status,
        engine: form.engine,
        unitCode: "DEFAULT"
      });
      setNotice({ type: "success", text: result?.message || `Đã lưu tài liệu ${form.title.trim()} vào kho thành công!` });
      resetForm();
      await Promise.all([loadTree(), runSearch()]);
    } catch (e) {
      setNotice({ type: "error", text: `Lỗi: ${e.message}` });
    } finally { setLoading(false); }
  }

  async function removeDocument(id) {
    if (!window.confirm("Xóa tài liệu này?")) return;
    try { await uiApi.crud("documents").remove(id); await runSearch(); }
    catch (e) { setNotice({ type: "error", text: `Lỗi xóa: ${e.message}` }); }
  }

  function resetForm() {
    setForm(current => ({
      storageId: current.storageId || storageOptions[0]?.value || "",
      title: "",
      documentType: "QUYET_DINH",
      status: "DRAFT",
      engine: "gemini"
    }));
    setPendingFile(null);
    setFileInputKey(key => key + 1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="all-in-one-screen">
      <section className="panel upload-panel">
        <PanelTitle icon={<Upload />} title="Thêm mới & Tải lên tài liệu vào Kho" />
        <form onSubmit={handleSubmit} className="all-in-one-upload-form">
          <label className="field required upload-storage-field">
            <span>Kho lưu trữ</span>
            <select value={form.storageId} onChange={e => setField("storageId", e.target.value)} required>
              <option value="">{storageOptions.length ? "Chọn Kho / Kệ / Hộp" : "Chưa có kho đang hoạt động"}</option>
              {storageOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </label>
          <label className="field required upload-title-field">
            <span>Tên tài liệu</span>
            <input value={form.title} onChange={e => setField("title", e.target.value)} placeholder="Nhập tên văn bản" required />
          </label>
          <label className="field">
            <span>Loại tài liệu</span>
            <select value={form.documentType} onChange={e => setField("documentType", e.target.value)}>
              <option value="QUYET_DINH">Quyết định</option>
              <option value="TO_TRINH">Tờ trình</option>
              <option value="HOP_DONG">Hợp đồng</option>
              <option value="CONG_VAN">Công văn</option>
              <option value="BAN_VE">Bản vẽ</option>
              <option value="KHAC">Khác</option>
            </select>
          </label>
          <label className="field">
            <span>Trạng thái</span>
            <select value={form.status} onChange={e => setField("status", e.target.value)}>
              <option value="DRAFT">Dự thảo (DRAFT)</option>
              <option value="PENDING">Chờ duyệt (PENDING)</option>
              <option value="ACTIVE">Hoạt động (ACTIVE)</option>
            </select>
          </label>
          <label className="field upload-file-field">
            <span>Đính kèm tệp</span>
            <div className="upload-file-picker">
              <input key={fileInputKey} ref={fileInputRef} type="file" accept=".pdf,.docx,.tif,.tiff,.png,.jpg,.jpeg,.ifc,.stl,.obj,.step,.stp" onChange={handleFileChange} />
              <small>{pendingFile ? `${pendingFile.name} · ${(pendingFile.size / 1024 / 1024).toFixed(2)} MB` : `PDF/ảnh/văn bản hoặc IFC/STL/OBJ/STEP · mô hình tối đa ${uploadPolicy.technicalModelMaxMegabytes} MB`}</small>
            </div>
          </label>
          <label className="field">
            <span>Engine OCR</span>
            <select value={form.engine} onChange={e => setField("engine", e.target.value)}>
              <option value="gemini">Gemini Vision AI</option>
              <option value="vietocr">VietOCR</option>
              <option value="easyocr">EasyOCR</option>
              <option value="tesseract">Tesseract</option>
            </select>
          </label>
          <div className="form-actions all-in-one-actions">
            <button className="btn primary" type="submit" disabled={loading}><Upload size={16} /> {loading ? "Đang lưu & bóc tách..." : "Lưu & Tải lên"}</button>
            <button className="btn" type="button" onClick={resetForm} disabled={loading}><X size={16} /> Bỏ qua</button>
          </div>
        </form>
        {notice && <div className={`upload-toast ${notice.type}`} role="status"><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo"><X size={15} /></button></div>}
        <div className="table-wrap" style={{ marginTop: "16px" }}>
          <table>
            <thead><tr><th>Mã tài liệu</th><th>Tên tài liệu</th><th>Loại</th><th>Kho / Hồ sơ</th><th>Tệp</th><th>OCR</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {documents.length === 0 ? (
                <tr><td colSpan={8} className="empty-cell">Chưa có tài liệu. Nhập thông tin và nhấn “Lưu & Tải lên”.</td></tr>
              ) : documents.map(row => {
                const dossier = dossierById.get(Number(row.dossierId));
                const storage = storageById.get(Number(dossier?.storageId));
                return (
                <tr key={row.id}>
                  <td><span className="gd2-code">{row.code}</span></td>
                  <td>{row.title}</td>
                  <td>{dossier?.dossierType || "Khác"}</td>
                  <td>{storage ? `${storage.code} · ${storage.name}` : dossier?.storageId || "-"}<small className="upload-dossier-code">{dossier?.code}</small></td>
                  <td>{row.fileName ? <span className="file-attached">Đã tải lên</span> : <span className="file-missing">Chưa có tệp</span>}</td>
                  <td><OcrBadge status={row.ocrStatus || "PENDING"} /></td>
                  <td><StatusBadge status={row.status || "DRAFT"} /></td>
                  <td><button className="icon-btn danger" onClick={() => removeDocument(row.id)} title="Xóa"><Trash2 size={14} /></button></td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
