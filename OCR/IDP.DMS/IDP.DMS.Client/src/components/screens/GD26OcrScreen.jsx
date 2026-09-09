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
  Download,
  Crop,
  Square,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Send,
  FileText
} from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { useCrud } from "../../hooks/useCrud";
import { StatusBadge, OcrBadge, GD2FeatureLayout } from "../shared/SharedComponents";
import ArchiveLabelModal from "../ArchiveLabelModal";

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
  { key: "documentNumber", label: "Số ký hiệu", color: "#2563eb" },
  { key: "issueDate", label: "Ngày ban hành", color: "#059669" },
  { key: "issuingAuthority", label: "Cơ quan ban hành", color: "#7c3aed" },
  { key: "subject", label: "Trích yếu", color: "#d97706" },
  { key: "signer", label: "Người ký", color: "#db2777" },
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

export default function GD26OcrScreen({ onOpenWorkflow } = {}) {
  const [activeTab, setActiveTab] = useState("screen");
  const storageCrud = useCrud("storage", emptyStorage);
  const dossierTypeCrud = useCrud("dossier-types", emptySimple);
  const [documents, setDocuments] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, done: 0, pending: 0, error: 0, completionRate: 0 });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedStorageId, setSelectedStorageId] = useState("");
  const [selectedDossierId, setSelectedDossierId] = useState("");
  const [currentDossierId, setCurrentDossierId] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [ocrEngine, setOcrEngine] = useState("gemini");
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  // Quick Dossier Modal states
  const [showQuickDossierModal, setShowQuickDossierModal] = useState(false);
  const [quickDossierCode, setQuickDossierCode] = useState("");
  const [quickDossierTitle, setQuickDossierTitle] = useState("");
  const [quickDossierStorageId, setQuickDossierStorageId] = useState("");
  const [creatingQuickDossier, setCreatingQuickDossier] = useState(false);

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

  // Zonal OCR States
  const [ocrMode, setOcrMode] = useState("ZONAL"); // "ZONAL" | "FULL_PAGE"
  const [ocrZones, setOcrZones] = useState([]);
  const [drawingZone, setDrawingZone] = useState(null);
  const [zoneProcessing, setZoneProcessing] = useState(false);
  const [zonePreviewPage, setZonePreviewPage] = useState(1);
  const [zonePageCount, setZonePageCount] = useState(1);
  const [zonePreviewUrl, setZonePreviewUrl] = useState("");
  const [zonePreviewLoading, setZonePreviewLoading] = useState(false);
  const zoneCanvasRef = useRef(null);
  const [labelModalItem, setLabelModalItem] = useState(null);

  const fileInputRef = useRef(null);

  const filteredOcrDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (selectedStorageId) {
        const dossier = dossiers.find(item => Number(item.id) === Number(doc.dossierId));
        if (dossier && String(dossier?.storageId || "") !== selectedStorageId) return false;
      }
      if (selectedDossierId) {
        if (String(doc.dossierId || "") !== selectedDossierId) return false;
      }
      if (statusFilter !== "ALL") {
        const st = String(doc.ocrStatus || "PENDING").toUpperCase();
        if (statusFilter === "PENDING" && !["PENDING", "PROCESSING"].includes(st)) return false;
        if (statusFilter === "DONE" && st !== "DONE") return false;
        if (statusFilter === "CONFIRMED" && st !== "CONFIRMED") return false;
      }
      return true;
    });
  }, [documents, dossiers, selectedStorageId, selectedDossierId, statusFilter]);

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

  // Danh sách hồ sơ phù hợp theo Kho đang lọc
  const dossierOptions = useMemo(() => {
    const list = selectedStorageId
      ? dossiers.filter(d => String(d.storageId) === selectedStorageId)
      : dossiers;
    return list.map(d => ({
      value: String(d.id),
      label: `${d.code || `HS #${d.id}`} - ${d.title || "Chưa có tên"}`
    }));
  }, [dossiers, selectedStorageId]);

  // Tự động chọn Kho đầu tiên có trong hệ thống nếu chưa chọn
  useEffect(() => {
    if (!selectedStorageId && storageOptions.length > 0) {
      setSelectedStorageId(storageOptions[0].value);
    }
  }, [storageOptions, selectedStorageId]);

  // Mở modal tạo nhanh hồ sơ
  function openQuickDossierModal() {
    setQuickDossierCode(`HS-${Date.now().toString().slice(-4)}`);
    setQuickDossierTitle("");
    setQuickDossierStorageId(selectedStorageId || storageOptions[0]?.value || "");
    setShowQuickDossierModal(true);
  }

  // Xử lý lưu hồ sơ tạo nhanh
  async function handleCreateQuickDossier(e) {
    if (e) e.preventDefault();
    if (!quickDossierTitle.trim()) {
      alert("Vui lòng nhập tiêu đề hồ sơ!");
      return;
    }
    setCreatingQuickDossier(true);
    try {
      const code = quickDossierCode.trim() || `HS-QUICK-${Date.now()}`;
      const targetStorageId = Number(quickDossierStorageId || selectedStorageId || storageOptions[0]?.value || 1);
      const newDossier = await uiApi.crud("dossiers").create({
        code,
        title: quickDossierTitle.trim(),
        storageId: targetStorageId,
        dossierType: "Hành chính",
        status: "DRAFT",
        description: "Tạo nhanh từ màn hình Bóc tách văn bản AI"
      });
      setDossiers(prev => [newDossier, ...prev]);
      setSelectedStorageId(String(targetStorageId));
      setSelectedDossierId(String(newDossier.id));
      setCurrentDossierId(String(newDossier.id));
      setShowQuickDossierModal(false);
      setNotice({
        type: "success",
        text: `Đã tạo nhanh hồ sơ "${newDossier.code} - ${newDossier.title}" thành công!`
      });
    } catch (err) {
      alert(`Không tạo được hồ sơ: ${err.message}`);
    } finally {
      setCreatingQuickDossier(false);
    }
  }

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

    if (selectedDocument.dossierId) {
      setCurrentDossierId(String(selectedDocument.dossierId));
    } else if (dossiers.length > 0) {
      const defaultDossier = dossiers.find(d => !selectedStorageId || String(d.storageId) === String(selectedStorageId)) || dossiers[0];
      if (defaultDossier) {
        setCurrentDossierId(String(defaultDossier.id));
      }
    }
  }, [selectedDocument?.id, selectedDocument?.description, selectedDocument?.dossierId, dossiers, selectedStorageId]);

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

  // Load Zonal Page Preview for Selected Document
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setZonePreviewUrl("");
    if (!selectedDocument?.id || !selectedDocument.fileName) return;

    setZonePreviewLoading(true);
    uiApi.gd2.ocrZonePreview(selectedDocument.id, zonePreviewPage)
      .then(result => {
        if (!active) return;
        objectUrl = URL.createObjectURL(result.blob);
        setZonePreviewUrl(objectUrl);
        setZonePageCount(result.pageCount || 1);
      })
      .catch(() => {
        if (!active) return;
        setZonePreviewUrl(previewBlobUrl || "");
        setZonePageCount(1);
      })
      .finally(() => {
        if (active) setZonePreviewLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedDocument?.id, selectedDocument?.fileName, zonePreviewPage, previewBlobUrl]);

  // Reset zones on document switch
  useEffect(() => {
    setOcrZones([]);
    setDrawingZone(null);
    setZonePreviewPage(1);
  }, [selectedDocument?.id]);

  function pointInZoneCanvas(event) {
    if (!zoneCanvasRef.current) return { x: 0, y: 0 };
    const rect = zoneCanvasRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  }

  function beginZoneDrawing(event) {
    const activeUrl = zonePreviewUrl || previewBlobUrl;
    if (!activeUrl || event.button !== 0) return;
    if (event.target !== zoneCanvasRef.current && !event.target.classList.contains("zone-bg-img")) return;
    event.currentTarget?.setPointerCapture?.(event.pointerId);
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
    if (width < 1.5 || height < 1.5) return;
    if (ocrZones.length >= 10) {
      setNotice({ type: "error", text: "Mỗi lần chỉ được tạo tối đa 10 vùng OCR." });
      return;
    }
    const field = gd26ZoneFieldOptions.find(option => !ocrZones.some(z => z.fieldKey === option.key)) || gd26ZoneFieldOptions[0];
    setOcrZones(current => [...current, {
      id: `zone-${Date.now()}-${current.length}`,
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

  function removeZone(zoneId) {
    setOcrZones(current => current.filter(z => z.id !== zoneId));
  }

  async function extractSelectedZones() {
    if (!selectedDocument || ocrZones.length === 0) {
      setNotice({ type: "error", text: "Vui lòng khoanh ít nhất một vùng trước khi bóc tách." });
      return;
    }
    try {
      setZoneProcessing(true);
      setNotice({ type: "info", text: `Đang bóc tách ${ocrZones.length} vùng đã chọn bằng ${ocrEngine}...` });
      const result = await uiApi.gd2.extractOcrZones(selectedDocument.id, {
        engine: ocrEngine,
        zones: ocrZones,
      });
      const meta = result.metadata || {};
      if (meta.documentNumber) setDocumentNumber(meta.documentNumber);
      if (meta.issueDate) setIssueDate(meta.issueDate);
      if (meta.issuingAuthority) setIssuingAuthority(meta.issuingAuthority);
      if (meta.subject) setSubject(meta.subject);
      if (meta.signer) setSigner(meta.signer);

      const zoneTexts = (result.zones || []).map(z => `${z.label}: ${z.text}`).join("\n");
      if (zoneTexts) {
        setFullText(prev => prev ? `${prev}\n\n[Zonal OCR]:\n${zoneTexts}` : zoneTexts);
      }

      setNotice({
        type: "success",
        text: `Đã bóc tách thành công ${result.zones?.length || 0} vùng và tự động điền vào các trường đối soát!`
      });
    } catch (error) {
      setNotice({ type: "error", text: `Bóc tách theo vùng thất bại: ${error.message}` });
    } finally {
      setZoneProcessing(false);
    }
  }

  // Handle Run AI OCR
  async function handleRunOcr() {
    if (!selectedDocument) {
      setNotice({ type: "error", text: "Vui lòng chọn tài liệu cần bóc tách OCR." });
      return;
    }
    setOcrLoading(true);
    setNotice({ type: "info", text: `Đang chạy AI OCR (${ocrEngine}) bóc tách tài liệu ${selectedDocument.code}...` });
    try {
      // Đặt timeout 25s tránh giao diện bị treo vô hạn
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Quá thời gian phản hồi từ máy chủ OCR (25s). Vui lòng thử chọn động cơ Tesseract/VietOCR hoặc đối soát trực tiếp.")), 25000)
      );
      const res = await Promise.race([
        uiApi.ocr.process(selectedDocument.id, ocrEngine),
        timeoutPromise
      ]);
      setDocumentNumber(res.documentNumber || "");
      setIssueDate(res.issueDate || "");
      setIssuingAuthority(res.issuingAuthority || "");
      setSubject(res.subject || "");
      setSigner(res.signer || "");
      setFullText(res.text || res.fullText || "");
      setNotice({
        type: "success",
        text: `Bóc tách AI OCR hoàn thành bằng ${res.engine || ocrEngine}! Vui lòng đối soát các trường bên phải và bấm [Xác nhận & Lưu].`
      });
      await loadOcrData();
    } catch (err) {
      setNotice({ type: "error", text: `Lỗi khi chạy OCR: ${err.message}` });
    } finally {
      setOcrLoading(false);
    }
  }

  // Handle Confirm & Save (Lưu kết quả)
  async function handleConfirmSave() {
    if (!selectedDocument) return;
    setSaveLoading(true);
    setNotice({ type: "info", text: "Đang lưu kết quả đối soát vào hệ thống..." });
    try {
      await uiApi.ocr.confirm({
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

      if (currentDossierId && Number(currentDossierId) !== Number(selectedDocument.dossierId)) {
        await uiApi.crud("documents").update(selectedDocument.id, {
          ...selectedDocument,
          dossierId: Number(currentDossierId)
        });
      }

      setNotice({
        type: "success",
        text: `Đã lưu kết quả đối soát thành công! Trạng thái OCR đã chuyển sang CONFIRMED.`
      });
      await loadOcrData();
      return true;
    } catch (err) {
      setNotice({ type: "error", text: `Lỗi khi lưu kết quả: ${err.message}` });
      return false;
    } finally {
      setSaveLoading(false);
    }
  }

  // Handle Save & Submit for Review (Gộp thao tác: Lưu & Gửi kiểm duyệt)
  async function handleSaveAndSubmitReview() {
    if (!selectedDocument) return;
    setSaveLoading(true);
    setNotice({ type: "info", text: "Đang lưu kết quả và chuyển tài liệu sang hàng chờ kiểm duyệt..." });
    try {
      await uiApi.ocr.confirm({
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

      if (currentDossierId && Number(currentDossierId) !== Number(selectedDocument.dossierId)) {
        await uiApi.crud("documents").update(selectedDocument.id, {
          ...selectedDocument,
          dossierId: Number(currentDossierId)
        });
      }

      await uiApi.dms.transition({
        entityType: "DOCUMENT",
        entityId: selectedDocument.id,
        action: "SUBMIT",
        actor: "current-user",
        unitCode: "DEFAULT",
        comment: `Gửi kiểm duyệt cho tài liệu ${selectedDocument.code} sau khi bóc tách OCR và đối soát.`,
        recipient: selectedDocument.code,
      });

      const currentDocId = selectedDocument.id;
      const currentStorId = selectedStorageId;
      setNotice({
        type: "success",
        text: `Đã lưu kết quả OCR và gửi tài liệu "${selectedDocument.code}" sang hàng chờ kiểm duyệt thành công!`,
        hint: "Trạng thái đã chuyển sang [Chờ kiểm duyệt - PENDING]. Bạn có thể xem tại: Kiểm duyệt văn bản đã tách ➔ Hồ sơ chờ phê duyệt.",
        actionBtn: onOpenWorkflow ? {
          label: "👉 Mở hàng chờ duyệt ngay",
          onClick: () => onOpenWorkflow({ focusDocumentId: currentDocId, storageId: currentStorId })
        } : null
      });
      await loadOcrData();
    } catch (err) {
      setNotice({ type: "error", text: `Lỗi khi lưu & gửi kiểm duyệt: ${err.message}` });
    } finally {
      setSaveLoading(false);
    }
  }

  // Handle Send for Review (Workflow transition riêng biệt)
  async function handleSubmitReview() {
    if (!selectedDocument) return;
    try {
      setLoading(true);
      await uiApi.dms.transition({
        entityType: "DOCUMENT",
        entityId: selectedDocument.id,
        action: "SUBMIT",
        actor: "current-user",
        unitCode: "DEFAULT",
        comment: `Gửi kiểm duyệt cho tài liệu ${selectedDocument.code} sau khi hoàn tất đối soát OCR.`,
        recipient: selectedDocument.code,
      });
      const currentDocId = selectedDocument.id;
      const currentStorId = selectedStorageId;
      setNotice({
        type: "success",
        text: `Đã gửi tài liệu "${selectedDocument.code}" sang hàng chờ kiểm duyệt thành công!`,
        hint: "Trạng thái đã chuyển sang [Chờ kiểm duyệt - PENDING]. Bạn có thể xem tại: Kiểm duyệt văn bản đã tách ➔ Hồ sơ chờ phê duyệt.",
        actionBtn: onOpenWorkflow ? {
          label: "👉 Mở hàng chờ duyệt ngay",
          onClick: () => onOpenWorkflow({ focusDocumentId: currentDocId, storageId: currentStorId })
        } : null
      });
      await loadOcrData();
    } catch (err) {
      setNotice({ type: "error", text: `Lỗi gửi kiểm duyệt: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  // Quick file upload and OCR (Tải tài liệu & Bóc tách AI)
  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setOcrLoading(true);
    setNotice({ type: "info", text: `Đang tải lên tệp '${file.name}' và bóc tách AI OCR...` });
    try {
      let docId = selectedDocument?.id;
      if (!docId) {
        // Tự động gán hoặc tạo hồ sơ mặc định trong kho hiện tại
        let targetDossierId = currentDossierId;
        if (!targetDossierId && dossiers.length > 0) {
          targetDossierId = dossiers[0].id;
        }
        if (!targetDossierId) {
          const defaultStorageId = selectedStorageId || storageOptions[0]?.value || 1;
          const autoDossier = await uiApi.crud("dossiers").create({
            code: `HS-AUTO-${Date.now()}`,
            title: "Hồ sơ tiếp nhận số hóa",
            storageId: Number(defaultStorageId),
            dossierType: "Hành chính",
            status: "DRAFT",
            description: "Hồ sơ tự động tạo từ màn hình Số hóa & OCR"
          });
          targetDossierId = autoDossier.id;
          setDossiers(prev => [autoDossier, ...prev]);
        }

        const newDoc = await uiApi.crud("documents").create({
          code: `VB-AUTO-${Date.now()}`,
          title: file.name.replace(/\.[^/.]+$/, ""),
          dossierId: Number(targetDossierId),
          documentType: "DOCUMENT",
          status: "DRAFT",
          ocrStatus: "PENDING",
          fileName: file.name
        });
        docId = newDoc.id;
        setSelectedId(docId);
      }

      const res = await uiApi.ocr.process(docId, ocrEngine, file);
      setDocumentNumber(res.documentNumber || "");
      setIssueDate(res.issueDate || "");
      setIssuingAuthority(res.issuingAuthority || "");
      setSubject(res.subject || "");
      setSigner(res.signer || "");
      setFullText(res.text || "");
      setNotice({ type: "success", text: `Đã đính kèm tệp và bóc tách AI OCR thành công! Vui lòng đối soát và bấm [Lưu kết quả] hoặc [Lưu & Gửi kiểm duyệt].` });
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
          Kho lưu trữ
        </label>
        <select
          value={selectedStorageId}
          onChange={e => {
            setSelectedStorageId(e.target.value);
            setSelectedDossierId("");
          }}
          style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
        >
          {storageOptions.length === 0 && <option value="">-- Đang tải kho lưu trữ... --</option>}
          {storageOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#1e3a8a" }}>
            Hồ sơ lưu trữ
          </label>
          <button
            type="button"
            className="btn"
            onClick={openQuickDossierModal}
            style={{ fontSize: "11px", padding: "2px 8px", background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" }}
            title="Tạo nhanh mã hồ sơ mới tại chỗ mà không cần rời màn hình"
          >
            + Tạo nhanh hồ sơ
          </button>
        </div>
        <select
          value={selectedDossierId}
          onChange={e => setSelectedDossierId(e.target.value)}
          style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
        >
          <option value="">-- Tất cả hồ sơ --</option>
          {dossierOptions.map(opt => (
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
                <OcrBadge status={ocrSt} />
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
        <div className={`gd2-report-notice ${notice.type}`} style={{
          margin: 0,
          padding: "12px 16px",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap"
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{notice.text}</div>
            {notice.hint && (
              <div style={{ marginTop: "4px", fontSize: "12px", opacity: 0.9 }}>
                ℹ️ {notice.hint}
              </div>
            )}
          </div>
          {notice.actionBtn && (
            <button
              type="button"
              className="btn"
              onClick={notice.actionBtn.onClick}
              style={{
                fontSize: "12px",
                background: "#1d4ed8",
                color: "#fff",
                borderColor: "#1d4ed8",
                padding: "6px 14px",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              {notice.actionBtn.label}
            </button>
          )}
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
            disabled={ocrLoading}
            onClick={() => fileInputRef.current?.click()}
            title="Đổi tệp hoặc tải lên tệp mới để bóc tách AI"
          >
            <Upload size={14} /> Tải tài liệu & Bóc tách AI
          </button>

          <button
            className="btn"
            type="button"
            disabled={!selectedDocument}
            onClick={() => setLabelModalItem({
              id: selectedDocument.id,
              code: selectedDocument.code,
              name: selectedDocument.title,
              entityType: "DOCUMENT",
              location: selectedDossier?.title || "Chưa gắn hồ sơ",
              createdAt: selectedDocument.createdAt
            })}
            title="In tem Barcode / QR Code tài liệu"
            style={{ color: "#4f46e5" }}
          >
            <QrCode size={14} /> In nhãn
          </button>

          <button
            className="btn primary"
            type="button"
            disabled={!selectedDocument || !selectedDocument.fileName}
            onClick={() => {
              if (ocrLoading) {
                setOcrLoading(false);
                setNotice({ type: "warning", text: "Đã hủy trạng thái chờ bóc tách. Bạn có thể chọn động cơ Tesseract/VietOCR hoặc chỉnh sửa trực tiếp các trường bên phải." });
              } else {
                handleRunOcr();
              }
            }}
            style={{
              background: ocrLoading ? "#ef4444" : "#2563eb",
              color: "#fff",
              fontWeight: 700,
              padding: "8px 16px"
            }}
            title={ocrLoading ? "Bấm để Hủy tiến trình đang chạy" : "Bấm để bóc tách văn bản bằng AI"}
          >
            {ocrLoading ? (
              <>
                <X size={16} /> Hủy chờ OCR
              </>
            ) : (
              <>
                <Zap size={16} /> Chạy OCR AI
              </>
            )}
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
        {/* Left Column: Original File Preview with Zonal OCR */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          border: "1px solid #cbd5e1",
          borderRadius: "10px",
          background: "#fff",
          overflow: "hidden"
        }}>
          {/* Header & Mode Switcher */}
          <div style={{
            padding: "8px 12px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                className={`btn ${ocrMode === "ZONAL" ? "primary" : ""}`}
                onClick={() => setOcrMode("ZONAL")}
                style={{ fontSize: "12px", padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <Crop size={13} /> Khoanh vùng (Zonal OCR)
              </button>
              <button
                type="button"
                className={`btn ${ocrMode === "FULL_PAGE" ? "primary" : ""}`}
                onClick={() => setOcrMode("FULL_PAGE")}
                style={{ fontSize: "12px", padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <FileText size={13} /> Xem toàn trang
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {ocrMode === "ZONAL" && zonePageCount > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#475569" }}>
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={zonePreviewPage <= 1}
                    onClick={() => setZonePreviewPage(p => Math.max(1, p - 1))}
                    style={{ padding: "2px" }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span>Trang {zonePreviewPage} / {zonePageCount}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={zonePreviewPage >= zonePageCount}
                    onClick={() => setZonePreviewPage(p => Math.min(zonePageCount, p + 1))}
                    style={{ padding: "2px" }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

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
          </div>

          {/* Zonal Action Toolbar */}
          {ocrMode === "ZONAL" && (
            <div style={{
              padding: "6px 12px",
              background: "#eff6ff",
              borderBottom: "1px solid #dbeafe",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  className="btn primary"
                  disabled={zoneProcessing || ocrZones.length === 0}
                  onClick={extractSelectedZones}
                  style={{ fontSize: "12px", padding: "4px 10px", background: "#0284c7" }}
                >
                  <Zap size={13} /> {zoneProcessing ? "Đang nhận dạng..." : `Nhận dạng ${ocrZones.length} vùng`}
                </button>
                {ocrZones.length > 0 && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setOcrZones([])}
                    style={{ fontSize: "12px", padding: "4px 8px", color: "#dc2626" }}
                    title="Xóa tất cả các vùng đã vẽ"
                  >
                    <Trash2 size={13} /> Xóa vùng
                  </button>
                )}
              </div>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                💡 Rê chuột vẽ khung trên ảnh để trích xuất trường tương ứng
              </span>
            </div>
          )}

          {/* Preview & Drawing Canvas Area */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#64748b10", padding: "8px", overflow: "auto" }}>
            {previewLoading || zonePreviewLoading ? (
              <div style={{ textAlign: "center", color: "#64748b" }}>
                <RefreshCw size={24} className="spin" style={{ marginBottom: "8px" }} />
                <div>Đang kết xuất ảnh tài liệu...</div>
              </div>
            ) : (zonePreviewUrl || previewBlobUrl) ? (
              ocrMode === "ZONAL" ? (
                <div
                  ref={zoneCanvasRef}
                  onPointerDown={beginZoneDrawing}
                  onPointerMove={updateZoneDrawing}
                  onPointerUp={finishZoneDrawing}
                  onPointerCancel={() => setDrawingZone(null)}
                  style={{
                    position: "relative",
                    display: "inline-block",
                    userSelect: "none",
                    touchAction: "none",
                    cursor: "crosshair",
                    maxWidth: "100%",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
                    borderRadius: "6px",
                    overflow: "hidden"
                  }}
                >
                  <img
                    className="zone-bg-img"
                    src={zonePreviewUrl || previewBlobUrl}
                    alt="Zonal Preview"
                    style={{ display: "block", maxWidth: "100%", maxHeight: "560px", objectFit: "contain", pointerEvents: "none" }}
                  />

                  {/* Render Existing Zones */}
                  {ocrZones.filter(z => z.page === zonePreviewPage).map((zone, idx) => {
                    const opt = gd26ZoneFieldOptions.find(o => o.key === zone.fieldKey) || gd26ZoneFieldOptions[0];
                    return (
                      <div
                        key={zone.id}
                        style={{
                          position: "absolute",
                          left: `${zone.x}%`,
                          top: `${zone.y}%`,
                          width: `${zone.width}%`,
                          height: `${zone.height}%`,
                          border: `2px solid ${opt.color}`,
                          background: `${opt.color}22`,
                          boxSizing: "border-box",
                          pointerEvents: "auto",
                          zIndex: 10
                        }}
                      >
                        {/* Zone Tag & Selector */}
                        <div
                          style={{
                            position: "absolute",
                            top: "-22px",
                            left: "0",
                            display: "flex",
                            alignItems: "center",
                            background: opt.color,
                            color: "#fff",
                            fontSize: "10px",
                            fontWeight: 700,
                            borderRadius: "4px",
                            padding: "1px 4px",
                            whiteSpace: "nowrap",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.3)"
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <select
                            value={zone.fieldKey}
                            onChange={e => changeZoneField(zone.id, e.target.value)}
                            style={{
                              background: "transparent",
                              color: "#fff",
                              border: "none",
                              fontSize: "10px",
                              fontWeight: 700,
                              cursor: "pointer",
                              padding: "0"
                            }}
                          >
                            {gd26ZoneFieldOptions.map(o => (
                              <option key={o.key} value={o.key} style={{ color: "#000" }}>{o.label}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeZone(zone.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#fff",
                              cursor: "pointer",
                              marginLeft: "4px",
                              padding: "0",
                              fontSize: "11px",
                              lineHeight: 1
                            }}
                            title="Xóa vùng này"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Active Drawing Rectangle */}
                  {drawingZone && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${Math.min(drawingZone.startX, drawingZone.currentX)}%`,
                        top: `${Math.min(drawingZone.startY, drawingZone.currentY)}%`,
                        width: `${Math.abs(drawingZone.currentX - drawingZone.startX)}%`,
                        height: `${Math.abs(drawingZone.currentY - drawingZone.startY)}%`,
                        border: "2px dashed #0284c7",
                        background: "rgba(2, 132, 199, 0.2)",
                        boxSizing: "border-box",
                        pointerEvents: "none",
                        zIndex: 20
                      }}
                    />
                  )}
                </div>
              ) : (
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
              )
            ) : (
              <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 20px" }}>
                <FileSearch size={40} style={{ marginBottom: "10px" }} />
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#64748b" }}>Chưa có tệp xem trước</div>
                <p style={{ fontSize: "12px", maxWidth: "300px", margin: "6px auto 14px" }}>
                  Tài liệu này chưa có tệp vật lý đính kèm hoặc tệp đang được xử lý.
                </p>
                <button
                  className="btn primary"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: "12px", background: "#2563eb", color: "#fff" }}
                >
                  <Upload size={13} /> Tải tài liệu & Bóc tách AI
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
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                  Hồ sơ lưu trữ <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <button
                  type="button"
                  className="btn"
                  onClick={openQuickDossierModal}
                  style={{ fontSize: "11px", padding: "2px 8px", background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" }}
                  title="Tạo nhanh mã hồ sơ mới tại chỗ mà không cần rời màn hình"
                >
                  + Tạo nhanh hồ sơ
                </button>
              </div>
              <select
                value={currentDossierId}
                onChange={e => setCurrentDossierId(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              >
                {dossierOptions.length === 0 && <option value="">-- Chưa có hồ sơ nào --</option>}
                {dossierOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

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

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                className="btn ok"
                type="button"
                disabled={saveLoading || !selectedDocument}
                onClick={handleConfirmSave}
                style={{ background: "#16a34a", color: "#fff", borderColor: "#16a34a", fontWeight: 700, padding: "8px 18px" }}
              >
                <CheckCircle2 size={15} /> {saveLoading ? "Đang lưu..." : "Lưu kết quả"}
              </button>

              <button
                className="btn primary"
                type="button"
                disabled={saveLoading || !selectedDocument}
                onClick={handleSaveAndSubmitReview}
                style={{ background: "#2563eb", color: "#fff", borderColor: "#2563eb", fontWeight: 700, padding: "8px 18px" }}
                title="Lưu kết quả OCR và gửi hồ sơ sang hàng chờ kiểm duyệt trong một thao tác"
              >
                <Send size={15} /> {saveLoading ? "Đang xử lý..." : "✓ Lưu & Gửi kiểm duyệt"}
              </button>

              <button
                className="btn"
                type="button"
                disabled={loading || !selectedDocument || !["DONE", "CONFIRMED"].includes(String(selectedDocument?.ocrStatus || "").toUpperCase())}
                onClick={handleSubmitReview}
                style={{ background: "#7c3aed", color: "#fff", borderColor: "#7c3aed", fontWeight: 700 }}
              >
                <Send size={14} /> Gửi kiểm duyệt
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
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
            <button className="btn primary" type="button" onClick={() => fileInputRef.current?.click()} disabled={ocrLoading}><Upload size={14}/> Tải tài liệu & Bóc tách AI</button>
            <button className="btn ok" type="button" onClick={handleConfirmSave} disabled={saveLoading || !selectedDocument} style={{ background: "#16a34a", color: "#fff" }}><CheckCircle2 size={14}/> Lưu kết quả</button>
            <button className="btn" type="button" onClick={handleSaveAndSubmitReview} disabled={saveLoading || !selectedDocument} style={{ background: "#2563eb", color: "#fff", borderColor: "#2563eb", fontWeight: 700 }}><Send size={14}/> ✓ Lưu & Gửi kiểm duyệt</button>
          </>
        }
        leftPanel={leftPanel}
        rightPanel={rightPanel}
      />
      {labelModalItem && (
        <ArchiveLabelModal
          item={labelModalItem}
          onClose={() => setLabelModalItem(null)}
        />
      )}
      {showQuickDossierModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowQuickDossierModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "24px",
              width: "480px",
              maxWidth: "90vw",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              border: "1px solid #e2e8f0"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#1e3a8a", fontWeight: 700 }}>
                📁 Tạo nhanh Hồ sơ lưu trữ
              </h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowQuickDossierModal(false)}
                style={{ padding: "4px", border: "none", background: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateQuickDossier} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "4px" }}>
                  Kho lưu trữ <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select
                  value={quickDossierStorageId}
                  onChange={e => setQuickDossierStorageId(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                >
                  {storageOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "4px" }}>
                  Mã hồ sơ <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  value={quickDossierCode}
                  onChange={e => setQuickDossierCode(e.target.value)}
                  placeholder="Ví dụ: HS-2026-01"
                  required
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "4px" }}>
                  Tiêu đề hồ sơ <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  value={quickDossierTitle}
                  onChange={e => setQuickDossierTitle(e.target.value)}
                  placeholder="Ví dụ: Hồ sơ quyết định đầu tư năm 2026"
                  required
                  autoFocus
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowQuickDossierModal(false)}
                  disabled={creatingQuickDossier}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={creatingQuickDossier}
                  style={{ background: "#2563eb", color: "#fff", fontWeight: 700 }}
                >
                  {creatingQuickDossier ? "Đang tạo..." : "✓ Tạo hồ sơ ngay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
