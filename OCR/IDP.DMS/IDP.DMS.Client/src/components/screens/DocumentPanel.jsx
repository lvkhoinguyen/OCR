import { useState, useMemo, useRef } from "react";
import { FileText, Upload, Eye, Trash2, Plus, Download, X, AlertCircle, File, CheckCircle } from "lucide-react";
import { uiApi } from "../../services/uiApi";

export function parseDocMetadata(doc) {
  if (!doc) return { code: "", title: "", issueDate: "", issuingAuthority: "", fileName: "", fileSize: 0 };
  let issueDate = doc.issueDate || "";
  let issuingAuthority = doc.issuingAuthority || "";
  let fileSize = doc.fileSize || 0;

  const desc = doc.description || "";
  const openIdx = desc.indexOf("[METADATA_JSON]");
  const closeIdx = desc.indexOf("[/METADATA_JSON]");
  if (openIdx >= 0 && closeIdx > openIdx) {
    try {
      const jsonStr = desc.slice(openIdx + 15, closeIdx).trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed.issueDate) issueDate = parsed.issueDate;
      if (parsed.issuingAuthority) issuingAuthority = parsed.issuingAuthority;
      if (parsed.fileSize) fileSize = parsed.fileSize;
    } catch {
      // Bỏ qua lỗi parse JSON
    }
  } else {
    const mDate = desc.match(/(?:Ngày ban hành|Ngày ký|Ngày|Ban hành):\s*([^\s|;,\n]+)/i);
    if (mDate) issueDate = mDate[1].trim();
    const mAuth = desc.match(/(?:Cơ quan ban hành|Cơ quan|Đơn vị):\s*([^|;\n]+)/i);
    if (mAuth) issuingAuthority = mAuth[1].trim();
    const mSize = desc.match(/(?:Dung lượng|Size):\s*([0-9.]+\s*[KMGT]?B)/i);
    if (mSize) fileSize = mSize[1].trim();
  }

  return {
    code: doc.code || "",
    title: doc.title || "",
    issueDate,
    issuingAuthority,
    fileName: doc.fileName || (doc.file?.name) || "",
    fileSize: fileSize || (doc.file?.size) || 0
  };
}

export function formatFileSize(bytes) {
  if (!bytes) return "--";
  if (typeof bytes === "string") return bytes;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getFileExtension(fileName) {
  if (!fileName) return "";
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export default function DocumentPanel({
  dossierId = null,
  documents = [],
  onDocumentsChange = () => {},
  readonly = false
}) {
  const [form, setForm] = useState({
    code: "",
    issueDate: new Date().toISOString().split("T")[0],
    issuingAuthority: "",
    title: ""
  });
  const [pendingFile, setPendingFile] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // State cho modal xem nhanh (Quick Preview)
  const [previewItem, setPreviewItem] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  function handleFieldChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        setError("Kích thước tệp vượt quá giới hạn cho phép (25 MB).");
        return;
      }
      setPendingFile(file);
      setError(null);
      // Gợi ý trích yếu nếu người dùng chưa nhập
      if (!form.title) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        setForm(prev => ({ ...prev, title: cleanName }));
      }
    }
  }

  async function handleAddDocument(e) {
    e?.preventDefault();
    if (!form.code.trim()) {
      setError("Vui lòng nhập Số ký hiệu văn bản.");
      return;
    }
    if (!form.title.trim()) {
      setError("Vui lòng nhập Trích yếu nội dung văn bản.");
      return;
    }

    setAdding(true);
    setError(null);

    const docMeta = {
      code: form.code.trim(),
      title: form.title.trim(),
      issueDate: form.issueDate,
      issuingAuthority: form.issuingAuthority.trim(),
      file: pendingFile,
      fileName: pendingFile?.name || "",
      fileSize: pendingFile?.size || 0
    };

    const encodedDesc = `[METADATA_JSON]\n${JSON.stringify({
      documentNumber: docMeta.code,
      issueDate: docMeta.issueDate,
      issuingAuthority: docMeta.issuingAuthority,
      subject: docMeta.title,
      fileSize: docMeta.fileSize
    })}\n[/METADATA_JSON]\nCơ quan: ${docMeta.issuingAuthority || "N/A"} | Ban hành: ${docMeta.issueDate || "N/A"} | Dung lượng: ${formatFileSize(docMeta.fileSize)}`;

    try {
      // Nếu hồ sơ đã được lưu trên máy chủ (có dossierId hợp lệ)
      if (dossierId && Number(dossierId) > 0) {
        const newDocId = await uiApi.crud("documents").create({
          dossierId: Number(dossierId),
          code: docMeta.code,
          title: docMeta.title,
          fileName: docMeta.fileName,
          ocrStatus: "PENDING",
          status: "VALID",
          description: encodedDesc
        });

        if (pendingFile) {
          try {
            await uiApi.crud("documents").upload(newDocId, pendingFile, "easyocr");
          } catch (uploadErr) {
            console.warn("Upload file warning:", uploadErr);
          }
        }

        const createdDoc = {
          id: newDocId,
          dossierId: Number(dossierId),
          code: docMeta.code,
          title: docMeta.title,
          fileName: docMeta.fileName,
          fileSize: docMeta.fileSize,
          issueDate: docMeta.issueDate,
          issuingAuthority: docMeta.issuingAuthority,
          description: encodedDesc,
          ocrStatus: "PENDING",
          status: "VALID",
          file: pendingFile
        };

        onDocumentsChange([...documents, createdDoc]);
      } else {
        // Nếu hồ sơ đang tạo mới (chưa lưu vào DB), lưu tạm tài liệu con vào mảng cục bộ
        const localDoc = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          dossierId: null,
          code: docMeta.code,
          title: docMeta.title,
          issueDate: docMeta.issueDate,
          issuingAuthority: docMeta.issuingAuthority,
          fileName: docMeta.fileName,
          fileSize: docMeta.fileSize,
          description: encodedDesc,
          ocrStatus: "PENDING",
          status: "DRAFT",
          file: pendingFile,
          isLocal: true
        };

        onDocumentsChange([...documents, localDoc]);
      }

      // Reset form nhập
      setForm({
        code: "",
        issueDate: new Date().toISOString().split("T")[0],
        issuingAuthority: "",
        title: ""
      });
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(`Lỗi khi thêm văn bản: ${err.message}`);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveDocument(index, doc) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa văn bản "${doc.code || doc.title}" khỏi hồ sơ?`)) {
      return;
    }

    try {
      if (doc.id && !String(doc.id).startsWith("temp_") && dossierId) {
        await uiApi.crud("documents").remove(doc.id);
      }
      const updated = documents.filter((_, i) => i !== index);
      onDocumentsChange(updated);
    } catch (err) {
      setError(`Lỗi khi xóa văn bản: ${err.message}`);
    }
  }

  async function openQuickPreview(doc) {
    setPreviewItem(doc);
    setPreviewError(null);
    setPreviewLoading(true);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    try {
      // Trường hợp 1: Tệp đính kèm cục bộ (vừa chọn chưa upload)
      if (doc.file instanceof File || doc.file instanceof Blob) {
        const url = URL.createObjectURL(doc.file);
        setPreviewUrl(url);
        setPreviewLoading(false);
        return;
      }

      // Trường hợp 2: Tài liệu đã có trên máy chủ
      if (doc.id && !String(doc.id).startsWith("temp_")) {
        const blob = await uiApi.gd2.documentPdfBlob(doc.id, "digitized").catch(async () => {
          return await uiApi.gd2.documentPdfBlob(doc.id, "original");
        });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } else {
        throw new Error("Không tìm thấy tệp để xem trước.");
      }
    } catch (err) {
      setPreviewError(`Không thể tải bản xem trước: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  }

  function closeQuickPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewItem(null);
    setPreviewError(null);
  }

  return (
    <div className="document-panel-container" style={{ marginTop: "12px" }}>
      {/* Form nhập văn bản con */}
      {!readonly && (
        <div
          className="document-add-box"
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "16px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <FileText size={18} color="#0284c7" />
            <strong style={{ fontSize: "14px", color: "#0f172a" }}>Thêm văn bản thành phần vào hồ sơ</strong>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
            <label className="field required">
              <span>Số ký hiệu văn bản (*)</span>
              <input
                type="text"
                placeholder="Vd: 01/QĐ-UBND, 12/TTr-SXD..."
                value={form.code}
                onChange={e => handleFieldChange("code", e.target.value)}
                disabled={adding}
              />
            </label>

            <label className="field">
              <span>Ngày ban hành</span>
              <input
                type="date"
                value={form.issueDate}
                onChange={e => handleFieldChange("issueDate", e.target.value)}
                disabled={adding}
              />
            </label>

            <label className="field">
              <span>Cơ quan ban hành</span>
              <input
                type="text"
                placeholder="Vd: UBND Tỉnh, Sở Xây Dựng..."
                value={form.issuingAuthority}
                onChange={e => handleFieldChange("issuingAuthority", e.target.value)}
                disabled={adding}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "10px" }}>
            <label className="field required" style={{ gridColumn: "1 / -1" }}>
              <span>Trích yếu nội dung văn bản (*)</span>
              <input
                type="text"
                placeholder="Vd: Quyết định về việc phê duyệt chủ trương đầu tư..."
                value={form.title}
                onChange={e => handleFieldChange("title", e.target.value)}
                disabled={adding}
              />
            </label>

            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Tệp đính kèm (PDF hoặc hình ảnh JPG/PNG)</span>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.docx"
                  onChange={handleFileChange}
                  disabled={adding}
                  style={{ display: "none" }}
                  id="document-file-input"
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={adding}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Upload size={15} />
                  <span>{pendingFile ? "Đổi tệp khác" : "Chọn tệp đính kèm..."}</span>
                </button>
                {pendingFile ? (
                  <span style={{ fontSize: "13px", color: "#0369a1", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle size={15} color="#059669" />
                    <strong>{pendingFile.name}</strong> ({formatFileSize(pendingFile.size)})
                  </span>
                ) : (
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Hỗ trợ tệp PDF, JPG, PNG, DOCX (tối đa 25 MB)
                  </span>
                )}
              </div>
            </label>
          </div>

          {error && (
            <div
              style={{
                marginTop: "10px",
                padding: "8px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "6px",
                color: "#b91c1c",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn primary"
              onClick={handleAddDocument}
              disabled={adding}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Plus size={16} />
              <span>{adding ? "Đang thêm..." : "Thêm vào danh sách văn bản"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bảng danh sách tài liệu con */}
      <div style={{ marginTop: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
            Danh sách văn bản thành phần ({documents.length} văn bản)
          </span>
          {documents.length === 0 && (
            <span style={{ fontSize: "12px", color: "#ef4444" }}>
              * Hồ sơ cần ít nhất 1 văn bản thành phần trước khi gửi kiểm duyệt
            </span>
          )}
        </div>

        <div className="table-wrap" style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
          <table>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={{ width: "45px", textAlign: "center" }}>STT</th>
                <th style={{ width: "140px" }}>Số ký hiệu</th>
                <th>Trích yếu nội dung</th>
                <th style={{ width: "180px" }}>Cơ quan & Ngày ban hành</th>
                <th style={{ width: "180px" }}>Tệp & Dung lượng</th>
                <th style={{ width: "110px", textAlign: "center" }}>Trạng thái</th>
                <th style={{ width: "120px", textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "28px 12px", color: "#64748b" }}>
                    Chưa có văn bản thành phần nào trong hồ sơ. Hãy nhập thông tin phía trên và nhấn &quot;Thêm vào danh sách văn bản&quot;.
                  </td>
                </tr>
              ) : (
                documents.map((doc, idx) => {
                  const meta = parseDocMetadata(doc);
                  const ext = getFileExtension(meta.fileName);
                  const isPdf = ext === "pdf";
                  const isImg = ["jpg", "jpeg", "png", "bmp", "webp"].includes(ext);

                  return (
                    <tr key={doc.id || idx}>
                      <td style={{ textAlign: "center", fontWeight: "500", color: "#64748b" }}>{idx + 1}</td>
                      <td>
                        <strong style={{ color: "#0369a1" }}>{meta.code || doc.code || "--"}</strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: "500", color: "#0f172a" }}>{meta.title || doc.title}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: "12px", color: "#334155" }}>{meta.issuingAuthority || "--"}</div>
                        {meta.issueDate && (
                          <div style={{ fontSize: "11px", color: "#64748b" }}>Ngày: {meta.issueDate}</div>
                        )}
                      </td>
                      <td>
                        {meta.fileName ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {isPdf && (
                              <span
                                style={{
                                  background: "#fee2e2",
                                  color: "#b91c1c",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                  fontWeight: "700"
                                }}
                              >
                                PDF
                              </span>
                            )}
                            {isImg && (
                              <span
                                style={{
                                  background: "#e0f2fe",
                                  color: "#0369a1",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                  fontWeight: "700"
                                }}
                              >
                                IMG
                              </span>
                            )}
                            {!isPdf && !isImg && (
                              <span
                                style={{
                                  background: "#f1f5f9",
                                  color: "#475569",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                  fontWeight: "700"
                                }}
                              >
                                {ext.toUpperCase() || "DOC"}
                              </span>
                            )}
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px" }} title={meta.fileName}>
                              <span style={{ fontSize: "12px" }}>{meta.fileName}</span>
                            </div>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>({formatFileSize(meta.fileSize)})</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>Chưa đính kèm tệp</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "500",
                            background: doc.ocrStatus === "DONE" ? "#ecfdf5" : doc.ocrStatus === "PROCESSING" ? "#fef3c7" : "#f1f5f9",
                            color: doc.ocrStatus === "DONE" ? "#047857" : doc.ocrStatus === "PROCESSING" ? "#b45309" : "#475569"
                          }}
                        >
                          {doc.ocrStatus === "DONE" ? "Đã OCR" : doc.ocrStatus === "PROCESSING" ? "Đang xử lý" : "Sẵn sàng"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          {(meta.fileName || doc.file) && (
                            <button
                              type="button"
                              className="btn"
                              onClick={() => openQuickPreview(doc)}
                              title="Xem nhanh văn bản"
                              style={{ padding: "4px 8px", fontSize: "12px", color: "#0284c7" }}
                            >
                              <Eye size={14} />
                              <span style={{ marginLeft: "4px" }}>Xem</span>
                            </button>
                          )}
                          {!readonly && (
                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() => handleRemoveDocument(idx, doc)}
                              title="Xóa văn bản"
                              style={{ padding: "4px" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Xem nhanh tệp (Quick Preview Modal) */}
      {previewItem && (
        <div
          className="quick-preview-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
          onClick={closeQuickPreview}
        >
          <div
            className="quick-preview-dialog"
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "960px",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden"
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Eye size={20} color="#0284c7" />
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", color: "#0f172a" }}>
                    Xem nhanh văn bản: <span style={{ color: "#0284c7" }}>{previewItem.code || previewItem.title}</span>
                  </h4>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {previewItem.title}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {previewUrl && (
                  <a
                    href={previewUrl}
                    download={previewItem.fileName || "tai-lieu"}
                    className="btn"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "6px 12px" }}
                  >
                    <Download size={14} />
                    <span>Tải về</span>
                  </a>
                )}
                <button
                  type="button"
                  className="icon-btn"
                  onClick={closeQuickPreview}
                  style={{ padding: "6px", borderRadius: "6px" }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Meta Bar */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "16px",
                padding: "8px 20px",
                background: "#f1f5f9",
                borderBottom: "1px solid #e2e8f0",
                fontSize: "12px",
                color: "#475569"
              }}
            >
              <span><strong>Số ký hiệu:</strong> {previewItem.code || "--"}</span>
              <span><strong>Cơ quan:</strong> {previewItem.issuingAuthority || "--"}</span>
              <span><strong>Ngày ban hành:</strong> {previewItem.issueDate || "--"}</span>
              <span><strong>Tên tệp:</strong> {previewItem.fileName || (previewItem.file?.name) || "--"}</span>
              <span><strong>Dung lượng:</strong> {formatFileSize(previewItem.fileSize || previewItem.file?.size)}</span>
            </div>

            {/* Modal Body / Viewer */}
            <div style={{ flex: 1, overflow: "auto", padding: "16px", minHeight: "450px", background: "#f8fafc" }}>
              {previewLoading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "400px", color: "#64748b" }}>
                  <div className="spinner" style={{ marginBottom: "12px" }}></div>
                  <span>Đang tải xem trước tài liệu...</span>
                </div>
              )}

              {previewError && (
                <div
                  style={{
                    padding: "20px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    color: "#b91c1c",
                    textAlign: "center"
                  }}
                >
                  <AlertCircle size={24} style={{ marginBottom: "8px" }} />
                  <p>{previewError}</p>
                </div>
              )}

              {!previewLoading && !previewError && previewUrl && (
                <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center" }}>
                  {getFileExtension(previewItem.fileName || previewItem.file?.name) === "pdf" ? (
                    <iframe
                      src={previewUrl}
                      title="Bản xem trước PDF"
                      style={{ width: "100%", height: "600px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff" }}
                    />
                  ) : ["jpg", "jpeg", "png", "bmp", "webp"].includes(getFileExtension(previewItem.fileName || previewItem.file?.name)) ? (
                    <div style={{ textAlign: "center", padding: "10px" }}>
                      <img
                        src={previewUrl}
                        alt={previewItem.title}
                        style={{ maxWidth: "100%", maxHeight: "580px", objectFit: "contain", borderRadius: "6px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                      />
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px", color: "#475569" }}>
                      <File size={48} color="#94a3b8" style={{ marginBottom: "12px" }} />
                      <p>Định dạng tệp này không hỗ trợ xem trực tiếp.</p>
                      <a href={previewUrl} download={previewItem.fileName} className="btn primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px" }}>
                        <Download size={16} /> Tải tệp về máy
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
