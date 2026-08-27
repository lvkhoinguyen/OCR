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

export default function GD26OcrScreen() {
  const [activeTab, setActiveTab] = useState("screen");
  const storageCrud = useCrud("storage", emptyStorage);
  const dossierTypeCrud = useCrud("dossier-types", emptySimple);
  const [documents, setDocuments] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, done: 0, pending: 0, error: 0, completionRate: 0 });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedStorageId, setSelectedStorageId] = useState("");
  const [selectedDossierType, setSelectedDossierType] = useState("");
  const [ocrEngine, setOcrEngine] = useState("gemini");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [showEngineModal, setShowEngineModal] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [ocrFileName, setOcrFileName] = useState("");
  const [zonePreviewUrl, setZonePreviewUrl] = useState("");
  const [zonePreviewPage, setZonePreviewPage] = useState(1);
  const [zonePageCount, setZonePageCount] = useState(1);
  const [zoneSourceFileName, setZoneSourceFileName] = useState("");
  const [zonePreviewLoading, setZonePreviewLoading] = useState(false);
  const [ocrZones, setOcrZones] = useState([]);
  const [drawingZone, setDrawingZone] = useState(null);
  const [zoneMetadata, setZoneMetadata] = useState({});
  const [zoneProcessing, setZoneProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const zoneCanvasRef = useRef(null);

  const filteredOcrDocuments = useMemo(
    () => documents.filter(document => {
      if (!selectedStorageId) return true;
      const dossier = dossiers.find(item => Number(item.id) === Number(document.dossierId));
      return String(dossier?.storageId || "") === selectedStorageId;
    }),
    [documents, dossiers, selectedStorageId]
  );
  const selectedDocument = filteredOcrDocuments.find(item => Number(item.id) === Number(selectedId)) || filteredOcrDocuments[0] || null;
  const selectedDossier = dossiers.find(item => Number(item.id) === Number(selectedDocument?.dossierId)) || null;
  const selectedHasOcrPdf = Boolean(selectedDocument?.fileName && /\.pdf$/i.test(selectedDocument.fileName) && String(selectedDocument.ocrStatus || "").toUpperCase() === "DONE");
  const dossierById = useMemo(
    () => new Map(dossiers.map(item => [item.id, item])),
    [dossiers]
  );
  const storageOptions = useMemo(
    () => storageCrud.rows.map((row) => ({
      value: String(row.id),
      label: `${row.code || `Kho #${row.id}`} - ${row.name || row.title || "Chưa có tên"}`,
    })),
    [storageCrud.rows]
  );
  const dossierTypeOptions = useMemo(
    () => dossierTypeCrud.rows.map((row) => ({
      value: row.code || row.name || String(row.id),
      label: `${row.code || `LT #${row.id}`} - ${row.name || row.title || "Chưa có tên"}`,
    })),
    [dossierTypeCrud.rows]
  );

  const loadOcrData = useCallback(async () => {
    setLoading(true);
    try {
      const [items, dossierRows] = await Promise.all([
        uiApi.crud("documents").list(),
        uiApi.crud("dossiers").list(),
      ]);
      setDocuments(items);
      setDossiers(dossierRows);
      const total = items.length;
      const done = items.filter(item => String(item.ocrStatus || "").toUpperCase() === "DONE").length;
      const pending = items.filter(item => ["PENDING", "PROCESSING"].includes(String(item.ocrStatus || "").toUpperCase())).length;
      const error = items.filter(item => String(item.ocrStatus || "").toUpperCase() === "ERROR").length;
      const completionRate = total === 0 ? 0 : Math.round((done * 10000) / total) / 100;
      setSummary({ total, done, pending, error, completionRate });
      setSelectedId(current => items.some(item => item.id === current) ? current : items[0]?.id || null);
    } catch (error) {
      setNotice(`Không tải được dữ liệu OCR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOcrData();
  }, [loadOcrData]);

  useEffect(() => {
    if (!selectedStorageId && storageOptions.length > 0) {
      setSelectedStorageId(storageOptions[0].value);
    }
  }, [selectedStorageId, storageOptions]);

  useEffect(() => {
    if (!selectedDossierType && dossierTypeOptions.length > 0) {
      setSelectedDossierType(dossierTypeOptions[0].value);
    }
  }, [selectedDossierType, dossierTypeOptions]);

  useEffect(() => {
    setZonePreviewPage(1);
    setOcrZones([]);
    setZoneMetadata({});
    setDrawingZone(null);
  }, [selectedId, selectedDocument?.fileName]);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setZonePreviewUrl("");
    setZoneSourceFileName("");
    if (!selectedDocument?.id || !selectedDocument.fileName) return undefined;
    setZonePreviewLoading(true);
    uiApi.gd2.ocrZonePreview(selectedDocument.id, zonePreviewPage)
      .then(result => {
        if (!active) return;
        objectUrl = URL.createObjectURL(result.blob);
        setZonePreviewUrl(objectUrl);
        setZonePageCount(result.pageCount || 1);
        setZoneSourceFileName(result.sourceFileName || selectedDocument.fileName || "");
      })
      .catch(error => {
        if (active) setNotice(`Không tạo được preview OCR vùng: ${error.message}`);
      })
      .finally(() => active && setZonePreviewLoading(false));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedDocument?.id, selectedDocument?.fileName, zonePreviewPage]);

  function pointInZoneCanvas(event) {
    const rect = zoneCanvasRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, (event.clientX - rect.left) * 100 / rect.width)),
      y: Math.max(0, Math.min(100, (event.clientY - rect.top) * 100 / rect.height)),
    };
  }

  function beginZoneDrawing(event) {
    if (!zonePreviewUrl || event.button !== 0 || event.target !== event.currentTarget) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointInZoneCanvas(event);
    setDrawingZone({ startX: point.x, startY: point.y, currentX: point.x, currentY: point.y });
  }

  function updateZoneDrawing(event) {
    if (!drawingZone) return;
    const point = pointInZoneCanvas(event);
    setDrawingZone(current => current ? { ...current, currentX: point.x, currentY: point.y } : null);
  }

  function finishZoneDrawing() {
    if (!drawingZone) return;
    const x = Math.min(drawingZone.startX, drawingZone.currentX);
    const y = Math.min(drawingZone.startY, drawingZone.currentY);
    const width = Math.abs(drawingZone.currentX - drawingZone.startX);
    const height = Math.abs(drawingZone.currentY - drawingZone.startY);
    setDrawingZone(null);
    if (width < 1 || height < 1) {
      setNotice("Vùng OCR quá nhỏ. Hãy kéo một khung lớn hơn.");
      return;
    }
    if (ocrZones.length >= 12) {
      setNotice("Mỗi lần chỉ được tạo tối đa 12 vùng OCR.");
      return;
    }
    const field = gd26ZoneFieldOptions.find(option => !ocrZones.some(zone => zone.fieldKey === option.key)) || gd26ZoneFieldOptions[0];
    setOcrZones(current => [...current, {
      id: globalThis.crypto?.randomUUID?.() || `zone-${Date.now()}-${current.length}`,
      fieldKey: field.key,
      label: field.label,
      page: zonePreviewPage,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      width: Number(width.toFixed(2)),
      height: Number(height.toFixed(2)),
    }]);
  }

  function changeZoneField(zoneId, fieldKey) {
    const option = gd26ZoneFieldOptions.find(item => item.key === fieldKey);
    setOcrZones(current => current.map(zone => zone.id === zoneId
      ? { ...zone, fieldKey, label: option?.label || zone.label }
      : zone));
  }

  async function extractSelectedZones() {
    if (!selectedDocument || ocrZones.length === 0) {
      setNotice("Hãy vẽ ít nhất một vùng trước khi bóc tách.");
      return;
    }
    try {
      setZoneProcessing(true);
      setNotice(`Đang crop và OCR ${ocrZones.length} vùng bằng ${ocrEngine}...`);
      const result = await uiApi.gd2.extractOcrZones(selectedDocument.id, {
        engine: ocrEngine,
        zones: ocrZones,
      });
      setZoneMetadata(result.metadata || {});
      setNotice(`Đã bóc tách ${result.zones?.length || 0} vùng và ánh xạ vào ${Object.keys(result.metadata || {}).length} trường metadata.`);
    } catch (error) {
      setNotice(`OCR theo vùng thất bại: ${error.message}`);
    } finally {
      setZoneProcessing(false);
    }
  }

  const draftZoneStyle = drawingZone ? {
    left: `${Math.min(drawingZone.startX, drawingZone.currentX)}%`,
    top: `${Math.min(drawingZone.startY, drawingZone.currentY)}%`,
    width: `${Math.abs(drawingZone.currentX - drawingZone.startX)}%`,
    height: `${Math.abs(drawingZone.currentY - drawingZone.startY)}%`,
  } : null;

  async function processOcr(documentId = selectedDocument?.id) {
    if (!documentId) {
      setNotice("Vui lòng chọn tài liệu cần OCR.");
      return;
    }
    const targetDocument = documents.find(item => item.id === documentId);
    if (!targetDocument) {
      setNotice("Không tìm thấy tài liệu cần OCR.");
      return;
    }

    setLoading(true);
    try {
      await uiApi.crud("documents").update(documentId, {
        dossierId: targetDocument.dossierId,
        code: targetDocument.code,
        title: targetDocument.title,
        fileName: ocrFileName || targetDocument.fileName,
        ocrStatus: "DONE",
        status: targetDocument.status || "DRAFT",
        description: ocrText || targetDocument.description || "",
      });
      await loadOcrData();
      setNotice(`Đã lưu OCR cho ${targetDocument.code}.`);
    } catch (error) {
      setNotice(`Lỗi OCR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function openOcrUpload() {
    if (!selectedDocument) {
      setNotice("Vui lòng chọn tài liệu cần quét OCR.");
      return;
    }
    setShowEngineModal(true);
  }

  function chooseFileForOcr() {
    setShowEngineModal(false);
    fileInputRef.current?.click();
  }

  async function handleGd26FileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!selectedDocument) {
      setNotice("Vui lòng chọn tài liệu đã tạo ở GĐ2-1 trước khi OCR.");
      return;
    }

    if (!selectedDocument && documents.length > 0) {
      setSelectedId(documents[0].id);
    }

    setLoading(true);
    setNotice(`AI đang quét OCR file '${file.name}' bằng engine ${ocrEngine}. Vui lòng chờ...`);
    try {
      const result = await uiApi.gd2.processOcrPdf(selectedDocument.id, file, ocrEngine, "DEFAULT");
      setOcrFileName(result?.fileName || file.name);
      setOcrText(result?.text || "");
      setNotice(
        result?.text
          ? `Đã bóc tách OCR và tạo PDF số hóa ${result.fileName}. File đã lưu vào kho của tài liệu.`
          : `Đã xử lý file ${file.name}, nhưng OCR chưa trích xuất được chữ.`
      );
      await loadOcrData();
    } catch (error) {
      setNotice(`Lỗi AI OCR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function processBatchOcr() {
    setLoading(true);
    try {
      await loadOcrData();
      setNotice("Đã tải lại dữ liệu OCR.");
    } catch (error) {
      setNotice(`Lỗi tải dữ liệu: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function submitForReview() {
    if (!selectedDocument) {
      setNotice("Vui lòng chọn tài liệu cần gửi kiểm duyệt.");
      return;
    }

    if (!selectedDossier) {
      setNotice("Tài liệu này chưa gắn hồ sơ.");
      return;
    }

    if (!selectedHasOcrPdf) {
      setNotice("Chỉ được gửi kiểm duyệt sau khi OCR tạo PDF số hóa và lưu vào kho thành công.");
      return;
    }

    const currentStatus = String(selectedDocument.status || "DRAFT").toUpperCase();
    const action = ["DRAFT", "PENDING", "NEEDS_SUPPLEMENT"].includes(currentStatus) ? "FORWARD" : "";
    if (!action) {
      setNotice(`Tài liệu ${selectedDocument.code} đang ở trạng thái ${currentStatus}, không gửi từ GD2-6 được.`);
      return;
    }

    setLoading(true);
    setNotice("Đang gửi kiểm duyệt...");
    try {
      const result = await uiApi.dms.transition({
        entityType: "DOCUMENT",
        entityId: selectedDocument.id,
        action,
        actor: "entry",
        unitCode: "DEFAULT",
        comment: `Gửi kiểm duyệt từ GD2-6 cho tài liệu ${selectedDocument.code} sau khi OCR tạo PDF ${selectedDocument.fileName || ocrFileName}`,
        recipient: selectedDocument.code,
      });

      await loadOcrData();
      const successMessage = currentStatus === "PENDING"
        ? `Tài liệu ${selectedDocument.code} đã nằm trong hàng chờ kiểm duyệt.`
        : `Đã gửi kiểm duyệt tài liệu ${selectedDocument.code}. Trạng thái mới: ${result.currentStatus}.`;
      setNotice(successMessage);
      window.alert(successMessage);
    } catch (error) {
      const failureMessage = `Không gửi kiểm duyệt được: ${error.message}`;
      setNotice(failureMessage);
      window.alert(failureMessage);
    } finally {
      setLoading(false);
    }
  }

  async function demoSubmitForReview() {
    if (!selectedDocument) {
      setNotice("Vui lòng chọn tài liệu để chạy demo.");
      return;
    }

    const resolvedStorageId = selectedStorageId || storageOptions[0]?.value || "KHO-DEMO";
    const resolvedDossierType = selectedDossierType || dossierTypeOptions[0]?.value || "LOAI-DEMO";
    const message = [
      "DEMO GỬI KIỂM DUYỆT",
      `Tài liệu: ${selectedDocument.code}`,
      `Kho hồ sơ: ${resolvedStorageId}`,
      `Loại hồ sơ: ${resolvedDossierType}`,
      `Trạng thái mô phỏng: PENDING -> APPROVED -> SIGNED -> PUBLISHED`
    ].join("\n");

    setNotice("Đang chạy demo gửi kiểm duyệt...");
    window.alert(message);
    setNotice(`Demo hoàn tất cho ${selectedDocument.code}. Dữ liệu sẽ đi vào hàng chờ kiểm duyệt trong luồng thật.`);
  }

  async function createDraftTestData() {
    setLoading(true);
    setNotice("Đang tạo dữ liệu test DRAFT...");
    try {
      const stamp = Date.now().toString().slice(-6);
      const dossierCode = `HS-TD-${stamp}`;
      const documentCode = `VB-TD-${stamp}`;
      const storageId = Number(selectedStorageId || storageOptions[0]?.value || 1);
      const dossierType = selectedDossierType || dossierTypeOptions[0]?.value || "Hành chính";
      const dossier = await uiApi.crud("dossiers").create({
        code: dossierCode,
        title: `Hồ sơ test DRAFT ${stamp}`,
        dossierType,
        storageId,
        status: "DRAFT",
        fromDate: new Date().toISOString(),
        toDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        description: "Hồ sơ tạo tự động để test luồng GD2-6 -> GD2-2."
      });

      const document = await uiApi.crud("documents").create({
        dossierId: dossier.id,
        code: documentCode,
        title: `Tài liệu test DRAFT ${stamp}`,
        fileName: `test-${stamp}.pdf`,
        ocrStatus: "PENDING",
        status: "DRAFT",
        description: "Tài liệu tạo tự động để test gửi kiểm duyệt."
      });

      const seed = {
        dossierId: dossier.id,
        dossierCode,
        documentId: document.id,
        documentCode,
        status: "DRAFT"
      };
      await loadOcrData();
      setSelectedId(seed.documentId);
      setOcrText("");
      setOcrFileName(seed.documentCode);
      setNotice(`Đã tạo ${seed.dossierCode} và ${seed.documentCode}. Bây giờ có thể bấm Gửi kiểm duyệt để sang GD2-2.`);
      window.alert(`Tạo dữ liệu test thành công:\nHồ sơ: ${seed.dossierCode}\nTài liệu: ${seed.documentCode}\nTrạng thái: ${seed.status}`);
    } catch (error) {
      setNotice(`Không tạo được dữ liệu test: ${error.message}`);
      window.alert(`Không tạo được dữ liệu test: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const midContent = (
    <div className="gd2-wizard-steps">
      <div className="wizard-step active">
        <div className="wizard-title">1. Chọn kho</div>
        <div className="wizard-desc">Lọc tài liệu theo kho</div>
      </div>
      <div className="wizard-step">
        <div className="wizard-title">2. Chọn tài liệu</div>
        <div className="wizard-desc">Tài liệu đã tạo ở GĐ2-1</div>
      </div>
      <div className="wizard-step">
        <div className="wizard-title">3. OCR & PDF</div>
        <div className="wizard-desc">Bóc tách và lưu PDF vào kho</div>
      </div>
      <div className="wizard-step">
        <div className="wizard-title">4. Gửi duyệt</div>
        <div className="wizard-desc">Đẩy hồ sơ sang kiểm duyệt</div>
      </div>
    </div>
  );

  const leftPanel = (
    <div className="gd2-tree-view">
      <div className="tree-item active">
        <span className="tree-icon">▾</span> <span style={{color:"#2563eb", fontWeight:600}}>Tài liệu trong kho đã chọn</span>
      </div>
      {filteredOcrDocuments.map(document => (
        <button
          key={document.id}
          type="button"
          className={`tree-item ${selectedDocument?.id === document.id ? "active" : ""}`}
          style={{paddingLeft:20, width:"100%", textAlign:"left", border:0, background:"transparent", cursor:"pointer"}}
          onClick={() => {
            setSelectedId(document.id);
            setOcrText(document.description || "");
            setOcrFileName(document.fileName || "");
          }}
        >
          <span className="tree-icon">📄</span> {document.code} · OCR {document.ocrStatus || "PENDING"} · HS {dossierById.get(document.dossierId)?.status || "DRAFT"}
        </button>
      ))}
      {filteredOcrDocuments.length === 0 && <div className="tree-item" style={{paddingLeft:20}}>Không có tài liệu trong kho này.</div>}
      <button className="btn primary" style={{marginTop: 16, width: "fit-content"}} onClick={loadOcrData} disabled={loading}>
        <RefreshCw size={14}/> Tải lại
      </button>
    </div>
  );

  const rightPanel = (
    <form className="gd2-config-form">
      {notice && <div className="alert" style={{gridColumn:"1/-1", margin: 0}}>{notice}</div>}
      <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleGd26FileChange} accept="image/*,application/pdf" />
      {showEngineModal && (
        <div className="modal-overlay" onClick={() => setShowEngineModal(false)}>
          <div className="modal-content" onClick={event => event.stopPropagation()}>
            <h3>Chọn engine OCR AI</h3>
            <p className="muted">Upload ảnh hoặc PDF để hệ thống bóc tách nội dung như màn nhập hồ sơ mới.</p>
            <div className="engine-options">
              {[
                ["gemini", "Gemini AI", "Khuyên dùng cho chữ viết tay tiếng Việt và ảnh khó."],
                ["vietocr", "VietOCR", "Model OCR tiếng Việt chạy offline."],
                ["easyocr", "EasyOCR", "Phù hợp chữ in, tiếng Việt và tiếng Anh."],
                ["tesseract", "Tesseract", "OCR chữ in qua bộ ngôn ngữ vie+eng."],
                ["crnn", "CRNN + CTC", "Model nhận dạng chữ viết tay nội bộ."],
              ].map(([value, label, description]) => (
                <label key={value} className={`engine-option ${ocrEngine === value ? "selected" : ""}`}>
                  <input type="radio" name="gd26-engine" value={value} checked={ocrEngine === value} onChange={event => setOcrEngine(event.target.value)} />
                  <div className="engine-info">
                    <strong>{label}</strong>
                    <span>{description}</span>
                  </div>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn primary" type="button" onClick={chooseFileForOcr}>
                <Upload size={16} /> Chọn file & quét OCR
              </button>
              <button className="btn" type="button" onClick={() => setShowEngineModal(false)}>
                <X size={16} /> Hủy
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="ocr-metrics" style={{gridColumn:"1/-1"}}>
        <div className="ocr-metric-card total"><BarChart2 size={22}/><strong>{summary.total}</strong><span>Tổng tài liệu</span></div>
        <div className="ocr-metric-card done"><CheckCircle2 size={22}/><strong>{summary.done}</strong><span>Đã OCR</span></div>
        <div className="ocr-metric-card pending"><Clock size={22}/><strong>{summary.pending}</strong><span>Chờ xử lý</span></div>
        <div className="ocr-metric-card rate"><Zap size={22}/><strong>{summary.completionRate || 0}%</strong><span>Tỷ lệ hoàn tất</span></div>
      </div>

      <div 
        className="ocr-upload-zone" 
        onClick={chooseFileForOcr}
        style={{
          gridColumn: "1/-1",
          border: "2px dashed #2563eb",
          borderRadius: "10px",
          padding: "24px 16px",
          textAlign: "center",
          background: "#f0f7ff",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(37,99,235,0.08)",
          margin: "8px 0"
        }}
      >
        <Upload size={36} color="#2563eb" style={{ marginBottom: "8px" }} />
        <h4 style={{ margin: "0 0 6px 0", color: "#1e3a8a", fontSize: "16px", fontWeight: "600" }}>
          BÓC TÁCH OCR & TẠO FILE PDF SỐ HÓA
        </h4>
        <p style={{ margin: 0, color: "#475569", fontSize: "13px" }}>
          Chọn file gốc để AI OCR bóc tách và tự động lưu PDF số hóa vào kho của tài liệu
        </p>
      </div>
      <div className="gd2-field" style={{gridColumn:"1/-1"}}>
        <label>Engine OCR</label>
        <select value={ocrEngine} onChange={event => setOcrEngine(event.target.value)}>
          <option value="gemini">Gemini</option>
          <option value="vietocr">VietOCR</option>
          <option value="easyocr">EasyOCR</option>
          <option value="tesseract">Tesseract</option>
          <option value="crnn">CRNN</option>
        </select>
      </div>
      <div className="gd2-form-row">
        <div className="gd2-field required">
          <label>Kho lưu trữ <span className="req-star">*</span></label>
          <select value={selectedStorageId} onChange={event => setSelectedStorageId(event.target.value)}>
            <option value="">Chọn kho lưu trữ</option>
            {storageOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="gd2-field required">
          <label>Tài liệu trong kho <span className="req-star">*</span></label>
          <select value={selectedDocument?.id || ""} onChange={event => setSelectedId(Number(event.target.value))}>
            <option value="">Chọn tài liệu</option>
            {filteredOcrDocuments.map(document => (
              <option key={document.id} value={document.id}>{document.code} - {document.title}</option>
            ))}
          </select>
        </div>
      </div>
      {selectedDocument && (
        <div className="detail-grid" style={{gridColumn:"1/-1"}}>
          <div className="detail-row"><span>Tài liệu đang chọn</span><strong>{selectedDocument.code} - {selectedDocument.title}</strong></div>
          <div className="detail-row"><span>Trạng thái OCR</span><OcrBadge status={selectedDocument.ocrStatus}/></div>
          <div className="detail-row"><span>Hồ sơ</span><strong>{selectedDossier ? `${selectedDossier.code} - ${selectedDossier.title}` : "Chưa gắn hồ sơ"}</strong></div>
          <div className="detail-row"><span>Trạng thái tài liệu</span><StatusBadge status={selectedDocument.status || "DRAFT"}/></div>
          <div className="detail-row"><span>PDF OCR trong kho</span><span>{selectedDocument.fileName || "Chưa tạo PDF OCR"}</span></div>
        </div>
      )}
      {selectedDocument && !["DRAFT", "PENDING", "NEEDS_SUPPLEMENT"].includes(String(selectedDocument.status || "").toUpperCase()) && (
        <div className="alert" style={{gridColumn:"1/-1", margin: 0}}>
          Tài liệu đang ở trạng thái {selectedDocument.status}; vẫn có thể xem OCR, nhưng không gửi kiểm duyệt lại từ GD2-6.
        </div>
      )}
      <section className="gd26-zonal-ocr">
        <div className="gd26-zonal-header">
          <div>
            <span className="gd21415-section-kicker">Interactive Zonal OCR</span>
            <h3>Vẽ vùng nhận dạng trên tài liệu</h3>
            <p>Kéo chuột trực tiếp trên trang để tạo nhiều bounding box. Tọa độ được lưu theo tỷ lệ %, không phụ thuộc kích thước màn hình.</p>
          </div>
          <button className="btn primary" type="button" onClick={extractSelectedZones} disabled={zoneProcessing || !zonePreviewUrl || ocrZones.length === 0}>
            <FileSearch size={14}/> {zoneProcessing ? "Đang bóc tách..." : "Bóc tách vùng đã chọn"}
          </button>
        </div>
        <div className="gd26-zonal-body">
          <div className="gd26-preview-column">
            <div className="gd26-page-toolbar">
              <button type="button" className="btn ghost" disabled={zonePreviewPage <= 1 || zonePreviewLoading} onClick={() => setZonePreviewPage(page => Math.max(1, page - 1))}>Trang trước</button>
              <strong>Trang {zonePreviewPage}/{zonePageCount}</strong>
              <button type="button" className="btn ghost" disabled={zonePreviewPage >= zonePageCount || zonePreviewLoading} onClick={() => setZonePreviewPage(page => Math.min(zonePageCount, page + 1))}>Trang sau</button>
              <span>{ocrZones.filter(zone => zone.page === zonePreviewPage).length} vùng trên trang</span>
            </div>
            {zoneSourceFileName && <div className="gd26-source-file">Nguồn vùng OCR: <strong>{zoneSourceFileName}</strong></div>}
            <div className="gd26-zone-document">
              {zonePreviewUrl ? <img src={zonePreviewUrl} alt={`Trang ${zonePreviewPage} của tài liệu`} draggable="false"/> : <div className="gd26-preview-empty">{zonePreviewLoading ? "Đang render trang tài liệu..." : "Chọn tài liệu PDF/ảnh có tệp vật lý để vẽ vùng OCR."}</div>}
              {zonePreviewUrl && <div
                ref={zoneCanvasRef}
                className="gd26-zone-canvas"
                onPointerDown={beginZoneDrawing}
                onPointerMove={updateZoneDrawing}
                onPointerUp={finishZoneDrawing}
                onPointerCancel={() => setDrawingZone(null)}
              >
                {ocrZones.filter(zone => zone.page === zonePreviewPage).map((zone, index) => <div
                  key={zone.id}
                  className="gd26-zone-box"
                  style={{left:`${zone.x}%`,top:`${zone.y}%`,width:`${zone.width}%`,height:`${zone.height}%`}}
                >
                  <span>{index + 1}. {zone.label}</span>
                  <button type="button" title="Xóa vùng" onPointerDown={event => event.stopPropagation()} onClick={() => setOcrZones(current => current.filter(item => item.id !== zone.id))}><X size={11}/></button>
                </div>)}
                {draftZoneStyle && <div className="gd26-zone-box draft" style={draftZoneStyle}><span>Vùng mới</span></div>}
              </div>}
            </div>
          </div>
          <div className="gd26-zone-sidebar">
            <div className="gd22-section-head"><Layers3 size={15}/> Danh sách vùng ({ocrZones.length}/12)</div>
            <div className="gd26-zone-list">
              {ocrZones.map((zone, index) => <div className={`gd26-zone-item ${zone.page === zonePreviewPage ? "active" : ""}`} key={zone.id}>
                <button className="gd26-zone-index" type="button" onClick={() => setZonePreviewPage(zone.page)}>{index + 1}</button>
                <div>
                  <select value={zone.fieldKey} onChange={event => changeZoneField(zone.id, event.target.value)}>
                    {gd26ZoneFieldOptions.map(option => <option value={option.key} key={option.key}>{option.label}</option>)}
                  </select>
                  <small>Trang {zone.page} · X {zone.x}% · Y {zone.y}% · {zone.width}×{zone.height}%</small>
                </div>
                <button className="icon-btn danger" type="button" title="Xóa vùng" onClick={() => setOcrZones(current => current.filter(item => item.id !== zone.id))}><Trash2 size={12}/></button>
              </div>)}
              {ocrZones.length === 0 && <div className="empty-cell">Giữ chuột và kéo trên tài liệu để tạo vùng đầu tiên.</div>}
            </div>
            {ocrZones.length > 0 && <button type="button" className="btn ghost" onClick={() => {setOcrZones([]);setZoneMetadata({});}}>Xóa tất cả vùng</button>}
          </div>
        </div>
        {Object.keys(zoneMetadata).length > 0 && <div className="gd26-metadata-results">
          <div className="gd22-section-head"><CheckCircle2 size={15}/> Metadata nhận dạng theo vùng</div>
          <div className="gd26-metadata-grid">
            {gd26ZoneFieldOptions.map(option => <label key={option.key}>
              <span>{option.label}</span>
              <textarea rows="2" value={zoneMetadata[option.key] || ""} onChange={event => setZoneMetadata(current => ({...current,[option.key]:event.target.value}))} placeholder="Chưa có vùng/kết quả"/>
            </label>)}
          </div>
        </div>}
      </section>
      <div className="gd2-form-actions" style={{gridColumn:"1/-1", marginTop: 0}}>
        <button className="btn primary" type="button" onClick={chooseFileForOcr} disabled={loading}>
          <Upload size={14}/> Bóc tách OCR & tạo PDF số hóa
        </button>
        <button className="btn" type="button" onClick={openOcrUpload} disabled={loading || !selectedDocument}>
          <Settings size={14}/> Chọn engine nâng cao
        </button>
        <button className="btn" type="button" onClick={loadOcrData} disabled={loading}>
          <RefreshCw size={14}/> Tải lại
        </button>
      </div>
      <div className="gd2-field" style={{gridColumn:"1/-1"}}>
        <label>Kết quả OCR AI {ocrFileName ? `(${ocrFileName})` : ""}</label>
        <textarea
          rows={7}
          value={ocrText || selectedDocument?.description || ""}
          onChange={event => setOcrText(event.target.value)}
          placeholder="Sau khi chọn file và quét OCR, nội dung bóc tách sẽ hiển thị tại đây."
        />
      </div>
      <div className="muted" style={{gridColumn:"1/-1"}}>
        Gửi kiểm duyệt: {selectedHasOcrPdf ? "Đã có PDF OCR trong kho, có thể gửi duyệt." : "Chưa có PDF OCR trong kho nên chưa thể gửi duyệt."}
      </div>

      <div className="gd2-form-actions" style={{marginTop: 20}}>
        <button className="btn" style={{color:"#16a34a", borderColor:"#bbf7d0"}} type="button" onClick={submitForReview} disabled={loading || !selectedDocument || !selectedDossier || !selectedHasOcrPdf}>Gửi kiểm duyệt</button>
        <button className="btn" style={{color:"#2563eb", borderColor:"#93c5fd"}} type="button" onClick={demoSubmitForReview} disabled={!selectedDocument}>Demo gửi kiểm duyệt</button>
        <button className="btn" style={{color:"#7c3aed", borderColor:"#c4b5fd"}} type="button" onClick={createDraftTestData} disabled={loading}>Tạo dữ liệu test DRAFT</button>
      </div>
    </form>
  );

  return (
    <GD2FeatureLayout
      featureId="GĐ2-6"
      featureName="Phần mềm có tích hợp OCR AI"
      description="Phần mềm có tích hợp OCR AI để bóc tách các trường dữ liệu, giảm sai sót khi nhập liệu và tự động trích xuất nội dung từ tài liệu số hóa."
      actor="entry"
      actionBarLabel="Nhập liệu hồ sơ theo quy trình"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="280px 1fr"
      leftPanelTitle="Danh sách văn bản"
      rightPanelTitle="Xử lý OCR & kiểm duyệt"
      midContent={midContent}
      actions={
        <>
          <button className="btn primary" type="button" onClick={createDraftTestData}><Plus size={14}/> Tạo hồ sơ test</button>
          <button className="btn" type="button" onClick={loadOcrData}><RefreshCw size={14}/> Tải lại dữ liệu</button>
          <button className="btn" type="button" onClick={demoSubmitForReview}><Download size={14}/> Demo kiểm duyệt</button>
        </>
      }
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}
