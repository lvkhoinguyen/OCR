import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  RefreshCw,
  Upload,
  X,
  BarChart2,
  CheckCircle2,
  Clock,
  Zap,
  FileSearch,
  Layers3,
  Trash2,
  Settings,
  Plus,
  Download
} from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { useCrud } from "../../hooks/useCrud";
import { StatusBadge, OcrBadge, GD2FeatureLayout } from "../shared/SharedComponents";

export function documentTypeLabel(type) {
  return {
    INVOICE: "Hóa đơn",
    CONTRACT: "Hợp đồng",
    DECISION: "Quyết định",
    REPORT: "Báo cáo",
  }[type] || type || "--";
}

export function formatOcrFields(fields) {
  return (Array.isArray(fields) ? fields : [])
    .map(field => {
      const label = String(field?.label || "").trim();
      const value = String(field?.value || "").trim();
      return label && value ? `${label}: ${value}` : label || value;
    })
    .filter(Boolean)
    .join("\n");
}

export function mergeOcrTextIntoFields(fields, text) {
  const list = Array.isArray(fields) ? fields : [];
  if (!String(text || "").trim()) return list;

  const valuesByLabel = new Map(
    String(text)
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const separator = line.indexOf(":");
        if (separator < 0) return [null, line];
        return [line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim()];
      })
      .filter(([label]) => label)
  );

  return list.map(field => {
    const label = String(field?.label || "").trim().toLowerCase();
    return valuesByLabel.has(label) ? { ...field, value: valuesByLabel.get(label), confirmed: false } : field;
  });
}

const emptyStorage = { code: "", name: "", locationType: "KHO", parentId: "", status: "ACTIVE", capacity: "" };
const emptySimple = { code: "", name: "", parentId: "", status: "ACTIVE", description: "", extra1: "", extra2: "", date1: "", date2: "" };

const gd26ZoneFieldOptions = [
  { key: "documentNumber", label: "Số hiệu" },
  { key: "issueDate", label: "Ngày ban hành" },
  { key: "issuingAuthority", label: "Cơ quan ban hành" },
  { key: "subject", label: "Trích yếu" },
  { key: "signer", label: "Người ký" },
];

export function parseMetadataFromDoc(desc) {
  if (!desc) return { documentNumber: "", issueDate: "", issuingAuthority: "", subject: "", signer: "", fullText: "" };
  const openTag = "[METADATA_JSON]";
  const closeTag = "[/METADATA_JSON]";
  const openIdx = desc.indexOf(openTag);
  const closeIdx = desc.indexOf(closeTag);
  if (openIdx >= 0 && closeIdx > openIdx) {
    try {
      const jsonStr = desc.slice(openIdx + openTag.length, closeIdx).trim();
      const meta = JSON.parse(jsonStr);
      let text = desc.slice(closeIdx + closeTag.length).trim();
      const origClose = "[/ORIG_FILE]";
      const origIdx = text.indexOf(origClose);
      if (origIdx >= 0) text = text.slice(origIdx + origClose.length).trim();
      return {
        documentNumber: meta.documentNumber || "",
        issueDate: meta.issueDate || "",
        issuingAuthority: meta.issuingAuthority || "",
        subject: meta.subject || "",
        signer: meta.signer || "",
        fullText: text
      };
    } catch {}
  }
  return { documentNumber: "", issueDate: "", issuingAuthority: "", subject: "", signer: "", fullText: desc };
}

export default function GD26OcrScreen() {
  const [activeTab, setActiveTab] = useState("screen");
  const storageCrud = useCrud("storage", emptyStorage);
  const dossierTypeCrud = useCrud("dossier-types", emptySimple);
  const [documents, setDocuments] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, done: 0, pending: 0, error: 0, completionRate: 0 });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedStorageId, setSelectedStorageId] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [ocrEngine, setOcrEngine] = useState("gemini");
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  // Metadata form fields
  const [documentNumber, setDocumentNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [subject, setSubject] = useState("");
  const [signer, setSigner] = useState("");
  const [fullText, setFullText] = useState("");

  // Preview state
  const [previewBlobUrl, setPreviewBlobUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const fileInputRef = useRef(null);

  const filteredOcrDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (selectedStorageId) {
        const dossier = dossiers.find(item => Number(item.id) === Number(doc.dossierId));
        if (String(dossier?.storageId || "") !== selectedStorageId) return false;
      }
      if (statusFilter !== "ALL") {
        const st = String(doc.ocrStatus || "PENDING").toUpperCase();
        if (statusFilter === "PENDING" && !["PENDING", "PROCESSING"].includes(st)) return false;
        if (statusFilter === "DONE" && st !== "DONE") return false;
        if (statusFilter === "CONFIRMED" && st !== "CONFIRMED") return false;
      }
      return true;
    });
  }, [documents, dossiers, selectedStorageId, statusFilter]);

  const selectedDocument = useMemo(() => {
    return documents.find(item => Number(item.id) === Number(selectedId)) || filteredOcrDocuments[0] || null;
  }, [documents, selectedId, filteredOcrDocuments]);

  const selectedDossier = useMemo(() => {
    return dossiers.find(item => Number(item.id) === Number(selectedDocument?.dossierId)) || null;
  }, [dossiers, selectedDocument]);

  const storageOptions = useMemo(() => {
    return storageCrud.rows.map((row) => ({
      value: String(row.id),
      label: `${row.code || `Kho #${row.id}`} - ${row.name || row.title || "Chưa có tên"}`,
    }));
  }, [storageCrud.rows]);

  const loadOcrData = useCallback(async () => {
    setLoading(true);
    try {
      const [items, dossierRows] = await Promise.all([
        uiApi.crud("documents").list(),
        uiApi.crud("dossiers").list(),
      ]);
      const sorted = (Array.isArray(items) ? items : []).slice().sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
      setDocuments(sorted);
      setDossiers(Array.isArray(dossierRows) ? dossierRows : []);
      const total = sorted.length;
      const done = sorted.filter(item => ["DONE", "CONFIRMED"].includes(String(item.ocrStatus || "").toUpperCase())).length;
      const pending = sorted.filter(item => ["PENDING", "PROCESSING"].includes(String(item.ocrStatus || "").toUpperCase())).length;
      const error = sorted.filter(item => String(item.ocrStatus || "").toUpperCase() === "ERROR").length;
      const completionRate = total === 0 ? 0 : Math.round((done * 10000) / total) / 100;
      setSummary({ total, done, pending, error, completionRate });
      setSelectedId(current => sorted.some(item => Number(item.id) === Number(current)) ? current : sorted[0]?.id || null);
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được dữ liệu OCR: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOcrData();
  }, [loadOcrData]);

  // Sync form fields when selectedDocument changes
  useEffect(() => {
    if (!selectedDocument) {
      setDocumentNumber("");
      setIssueDate("");
      setIssuingAuthority("");
      setSubject("");
      setSigner("");
      setFullText("");
      return;
    }
    const parsed = parseMetadataFromDoc(selectedDocument.description);
    setDocumentNumber(parsed.documentNumber || selectedDocument.code || "");
    setIssueDate(parsed.issueDate || "");
    setIssuingAuthority(parsed.issuingAuthority || "");
    setSubject(parsed.subject || selectedDocument.title || "");
    setSigner(parsed.signer || "");
    setFullText(parsed.fullText || "");
  }, [selectedDocument?.id, selectedDocument?.description]);

  // Load preview blob for selectedDocument
  useEffect(() => {
    let active = true;
    let url = "";
    setPreviewBlobUrl("");
    if (!selectedDocument?.id || !selectedDocument.fileName) return;

    setPreviewLoading(true);
    uiApi.gd2.documentPdfBlob(selectedDocument.id, "original")
      .then(blob => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setPreviewBlobUrl(url);
      })
      .catch(() => {
        if (!active) return;
        uiApi.gd2.documentPdfBlob(selectedDocument.id, "digitized")
          .then(blob => {
            if (!active) return;
            url = URL.createObjectURL(blob);
            setPreviewBlobUrl(url);
          })
          .catch(() => {
            if (active) setPreviewBlobUrl("");
          });
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [selectedDocument?.id, selectedDocument?.fileName]);

  // Handle Run AI OCR
  async function handleRunOcr() {
    if (!selectedDocument) {
      setNotice({ type: "error", text: "Vui lòng chọn tài liệu cần bóc tách OCR." });
      return;
    }
    setOcrLoading(true);
    setNotice({ type: "info", text: `Đang chạy AI OCR (${ocrEngine}) bóc tách tài liệu ${selectedDocument.code}...` });
    try {
      const res = await uiApi.ocr.process(selectedDocument.id, ocrEngine);
      setDocumentNumber(res.documentNumber || "");
      setIssueDate(res.issueDate || "");
      setIssuingAuthority(res.issuingAuthority || "");
      setSubject(res.subject || "");
      setSigner(res.signer || "");
      setFullText(res.text || "");
      setNotice({
        type: "success",
        text: `Bóc tách AI OCR thành công bằng ${res.engine}! Vui lòng đối soát các trường bên phải và bấm [Xác nhận & Lưu].`
      });
      await loadOcrData();
    } catch (err) {
      setNotice({ type: "error", text: `Lỗi khi chạy OCR: ${err.message}` });
    } finally {
      setOcrLoading(false);
    }
  }

  // Handle Confirm & Save
  async function handleConfirmSave() {
    if (!selectedDocument) return;
    setSaveLoading(true);
    setNotice({ type: "info", text: "Đang lưu dữ liệu đối soát vào hệ thống..." });
    try {
      const res = await uiApi.ocr.confirm({
        documentId: selectedDocument.id,
        documentNumber,
        issueDate,
        issuingAuthority,
        subject,
        signer,
        fullText,
        actor: "current-user",
        note: "Đối soát và xác nhận thông tin OCR"
      });
      setNotice({
        type: "success",
        text: `Đã xác nhận và lưu thông tin đối soát thành công! Trạng thái OCR đã chuyển sang CONFIRMED.`
      });
      await loadOcrData();
    } catch (err) {
      setNotice({ type: "error", text: `Lỗi khi lưu đối soát: ${err.message}` });
    } finally {
      setSaveLoading(false);
    }
  }

  // Handle Send for Review (Workflow transition)
  async function handleSubmitReview() {
    if (!selectedDocument) return;
    try {
      setLoading(true);
      await uiApi.dms.transition({
        entityType: "DOCUMENT",
        entityId: selectedDocument.id,
        action: "FORWARD",
        actor: "current-user",
        unitCode: "DEFAULT",
        comment: `Gửi kiểm duyệt từ GĐ2-6 cho tài liệu ${selectedDocument.code} sau khi hoàn tất đối soát OCR.`,
        recipient: selectedDocument.code,
      });
      setNotice({ type: "success", text: `Đã gửi tài liệu ${selectedDocument.code} sang hàng chờ kiểm duyệt (GĐ2-2).` });
      await loadOcrData();
    } catch (err) {
      setNotice({ type: "error", text: `Lỗi gửi kiểm duyệt: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  // Quick file upload and OCR
  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedDocument) return;

    setOcrLoading(true);
    setNotice({ type: "info", text: `Đang tải lên tệp '${file.name}' và bóc tách AI OCR...` });
    try {
      const res = await uiApi.ocr.process(selectedDocument.id, ocrEngine, file);
      setDocumentNumber(res.documentNumber || "");
      setIssueDate(res.issueDate || "");
      setIssuingAuthority(res.issuingAuthority || "");
      setSubject(res.subject || "");
      setSigner(res.signer || "");
      setFullText(res.text || "");
      setNotice({ type: "success", text: `Đã đính kèm tệp và bóc tách AI OCR thành công! Vui lòng đối soát và lưu.` });
      await loadOcrData();
    } catch (err) {
      setNotice({ type: "error", text: `Lỗi tải file & OCR: ${err.message}` });
    } finally {
      setOcrLoading(false);
    }
  }

  // Left Panel: Document selection tree & status filter
  const leftPanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
      <div>
        <label style={{ fontSize: "12px", fontWeight: 700, color: "#1e3a8a", display: "block", marginBottom: "4px" }}>
          Lọc theo Kho lưu trữ
        </label>
        <select
          value={selectedStorageId}
          onChange={e => setSelectedStorageId(e.target.value)}
          style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
        >
          <option value="">-- Tất cả Kho --</option>
          {storageOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
        {[
          { key: "ALL", label: "Tất cả" },
          { key: "PENDING", label: "Chờ OCR" },
          { key: "DONE", label: "Đã OCR" },
          { key: "CONFIRMED", label: "Đã duyệt" }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            style={{
              flex: 1,
              padding: "6px 2px",
              fontSize: "11px",
              fontWeight: statusFilter === tab.key ? 700 : 500,
              background: statusFilter === tab.key ? "#fff" : "transparent",
              color: statusFilter === tab.key ? "#2563eb" : "#64748b",
              border: "none",
              borderRadius: "6px",
              boxShadow: statusFilter === tab.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              cursor: "pointer"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff" }}>
        {filteredOcrDocuments.map(doc => {
          const isSelected = selectedDocument?.id === doc.id;
          const ocrSt = String(doc.ocrStatus || "PENDING").toUpperCase();
          const badgeColor = ocrSt === "CONFIRMED" ? "#16a34a" : ocrSt === "DONE" ? "#2563eb" : ocrSt === "ERROR" ? "#dc2626" : "#d97706";
          const badgeBg = ocrSt === "CONFIRMED" ? "#dcfce7" : ocrSt === "DONE" ? "#eff6ff" : ocrSt === "ERROR" ? "#fee2e2" : "#fef3c7";

          return (
            <div
              key={doc.id}
              onClick={() => setSelectedId(doc.id)}
              style={{
                padding: "10px 12px",
                borderBottom: "1px solid #f1f5f9",
                background: isSelected ? "#eff6ff" : "transparent",
                borderLeft: isSelected ? "3px solid #2563eb" : "3px solid transparent",
                cursor: "pointer",
                transition: "background 0.15s"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <strong style={{ fontSize: "13px", color: isSelected ? "#1d4ed8" : "#1e293b" }}>{doc.code}</strong>
                <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "999px", background: badgeBg, color: badgeColor, fontWeight: 700 }}>
                  {ocrSt}
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {doc.title || "Chưa có tiêu đề"}
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                {doc.fileName ? `📁 ${doc.fileName}` : "⚠️ Chưa có file"}
              </div>
            </div>
          );
        })}
        {filteredOcrDocuments.length === 0 && (
          <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
            Không tìm thấy tài liệu phù hợp.
          </div>
        )}
      </div>

      <button
        className="btn"
        type="button"
        onClick={loadOcrData}
        disabled={loading}
        style={{ width: "100%", justifyContent: "center", minHeight: "36px" }}
      >
        <RefreshCw size={14} /> Tải lại danh sách
      </button>
    </div>
  );

  // Right Panel: Side-by-Side verification layout
  const rightPanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", height: "100%" }}>
      {notice && (
        <div className={`gd2-report-notice ${notice.type}`} style={{ margin: 0, padding: "10px 14px", borderRadius: "8px" }}>
          {notice.text}
        </div>
      )}

      {/* Top Header & Actions */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        padding: "14px 18px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "10px"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#1e3a8a" }}>
              {selectedDocument ? `${selectedDocument.code} — ${selectedDocument.title}` : "Chưa chọn tài liệu"}
            </h3>
            {selectedDocument && <OcrBadge status={selectedDocument.ocrStatus} />}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
            Hồ sơ: <strong>{selectedDossier ? `${selectedDossier.code} - ${selectedDossier.title}` : "Chưa gắn hồ sơ"}</strong> · Tệp gốc: <strong>{selectedDocument?.fileName || "Chưa có file"}</strong>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <select
            value={ocrEngine}
            onChange={e => setOcrEngine(e.target.value)}
            disabled={ocrLoading}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#fff" }}
          >
            <option value="gemini">Gemini Vision AI (Ưu tiên)</option>
            <option value="tesseract">Tesseract OCR</option>
            <option value="easyocr">EasyOCR</option>
            <option value="vietocr">VietOCR</option>
          </select>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
          />

          <button
            className="btn"
            type="button"
            disabled={ocrLoading || !selectedDocument}
            onClick={() => fileInputRef.current?.click()}
            title="Đổi tệp hoặc tải lên tệp mới cho tài liệu này"
          >
            <Upload size={14} /> Tải file mới
          </button>

          <button
            className="btn primary"
            type="button"
            disabled={ocrLoading || !selectedDocument || !selectedDocument.fileName}
            onClick={handleRunOcr}
            style={{ background: "#2563eb", color: "#fff", fontWeight: 700, padding: "8px 16px" }}
          >
            <Zap size={16} /> {ocrLoading ? "Đang chạy AI OCR..." : "Chạy OCR AI"}
          </button>
        </div>
      </div>

      {/* Side-by-Side Area */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.1fr 1fr",
        gap: "16px",
        flex: 1,
        minHeight: "560px"
      }}>
        {/* Left Column: Original File Preview */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          border: "1px solid #cbd5e1",
          borderRadius: "10px",
          background: "#fff",
          overflow: "hidden"
        }}>
          <div style={{
            padding: "10px 14px",
            background: "#f1f5f9",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <strong style={{ fontSize: "13px", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
              <FileText size={15} color="#2563eb" /> Khung xem trước tệp gốc (PDF / Ảnh)
            </strong>
            {previewBlobUrl && (
              <a
                href={previewBlobUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none", fontWeight: 600 }}
              >
                Mở tab mới ↗
              </a>
            )}
          </div>

          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#64748b10", padding: "8px", overflow: "hidden" }}>
            {previewLoading ? (
              <div style={{ textAlign: "center", color: "#64748b" }}>
                <RefreshCw size={24} className="spin" style={{ marginBottom: "8px" }} />
                <div>Đang tải tài liệu xem trước...</div>
              </div>
            ) : previewBlobUrl ? (
              selectedDocument?.fileName?.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewBlobUrl}
                  title="PDF Preview"
                  style={{ width: "100%", height: "100%", minHeight: "520px", border: "none", borderRadius: "6px", background: "#fff" }}
                />
              ) : (
                <img
                  src={previewBlobUrl}
                  alt="Original Document"
                  style={{ maxWidth: "100%", maxHeight: "540px", objectFit: "contain", borderRadius: "6px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
                />
              )
            ) : (
              <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 20px" }}>
                <FileSearch size={40} style={{ marginBottom: "10px" }} />
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#64748b" }}>Chưa có tệp xem trước</div>
                <p style={{ fontSize: "12px", maxWidth: "300px", margin: "6px auto 14px" }}>
                  Tài liệu này chưa có tệp vật lý đính kèm hoặc tệp đang được xử lý.
                </p>
                <button
                  className="btn"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: "12px" }}
                >
                  <Upload size={13} /> Tải tệp lên ngay
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Metadata Verification Form */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          border: "1px solid #cbd5e1",
          borderRadius: "10px",
          background: "#fff",
          overflow: "hidden"
        }}>
          <div style={{
            padding: "10px 14px",
            background: "#eff6ff",
            borderBottom: "1px solid #bfdbfe",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <strong style={{ fontSize: "13px", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={15} color="#16a34a" /> Form kết quả trích xuất & Đối soát dữ liệu
            </strong>
            <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: 600 }}>
              {selectedDocument?.ocrStatus === "CONFIRMED" ? "✅ Đã xác nhận" : "✏️ Cho phép chỉnh sửa"}
            </span>
          </div>

          <div style={{ flex: 1, padding: "14px 16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "4px" }}>
                  Số / Ký hiệu văn bản <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={e => setDocumentNumber(e.target.value)}
                  placeholder="Ví dụ: 01/QĐ-UBND"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 600 }}
                />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "4px" }}>
                  Ngày ban hành
                </label>
                <input
                  type="text"
                  value={issueDate}
                  onChange={e => setIssueDate(e.target.value)}
                  placeholder="dd/MM/yyyy"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "4px" }}>
                Cơ quan ban hành
              </label>
              <input
                type="text"
                value={issuingAuthority}
                onChange={e => setIssuingAuthority(e.target.value)}
                placeholder="Ví dụ: Ủy ban nhân dân tỉnh Hà Công"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "4px" }}>
                Trích yếu nội dung <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <textarea
                rows={3}
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Về việc phê duyệt chủ trương đầu tư..."
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", resize: "vertical" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "4px" }}>
                Người ký & Chức vụ
              </label>
              <input
                type="text"
                value={signer}
                onChange={e => setSigner(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A - Chủ tịch"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "4px" }}>
                Toàn văn nội dung OCR
              </label>
              <textarea
                rows={5}
                value={fullText}
                onChange={e => setFullText(e.target.value)}
                placeholder="Nội dung toàn văn được AI OCR bóc tách..."
                style={{ flex: 1, width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", fontFamily: "monospace", resize: "vertical" }}
              />
            </div>
          </div>

          {/* Action Footer */}
          <div style={{
            padding: "12px 16px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap"
          }}>
            <button
              className="btn"
              type="button"
              disabled={ocrLoading || !selectedDocument}
              onClick={handleRunOcr}
              style={{ fontSize: "13px" }}
            >
              <Zap size={14} /> Chạy lại OCR
            </button>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn ok"
                type="button"
                disabled={saveLoading || !selectedDocument}
                onClick={handleConfirmSave}
                style={{ background: "#16a34a", color: "#fff", borderColor: "#16a34a", fontWeight: 700, padding: "8px 18px" }}
              >
                <CheckCircle2 size={15} /> {saveLoading ? "Đang lưu..." : "Xác nhận & Lưu"}
              </button>

              <button
                className="btn"
                type="button"
                disabled={loading || !selectedDocument || !["DONE", "CONFIRMED"].includes(String(selectedDocument?.ocrStatus || "").toUpperCase())}
                onClick={handleSubmitReview}
                style={{ background: "#7c3aed", color: "#fff", borderColor: "#7c3aed", fontWeight: 700 }}
              >
                <Send size={14} /> Gửi kiểm duyệt (GĐ2-2)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <GD2FeatureLayout
      featureId="GĐ2-6"
      featureName="Tích hợp AI OCR & Đối soát dữ liệu"
      description="Bóc tách văn bản hành chính bằng AI OCR (Gemini / Tesseract), đối soát Side-by-Side hai cột trực quan và xác nhận thông tin lưu trữ."
      actor="Cán bộ số hóa / Chuyên viên nhập liệu"
      actionBarLabel="Bóc tách & Đối soát OCR"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="300px 1fr"
      leftPanelTitle="Danh sách văn bản"
      rightPanelTitle="Đối soát Side-by-Side"
      actions={
        <>
          <button className="btn" type="button" onClick={loadOcrData}><RefreshCw size={14}/> Tải lại</button>
          <button className="btn primary" type="button" onClick={handleRunOcr} disabled={ocrLoading || !selectedDocument}><Zap size={14}/> Chạy OCR AI</button>
          <button className="btn ok" type="button" onClick={handleConfirmSave} disabled={saveLoading || !selectedDocument} style={{ background: "#16a34a", color: "#fff" }}><CheckCircle2 size={14}/> Xác nhận & Lưu</button>
        </>
      }
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}
