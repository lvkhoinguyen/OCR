import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import {
  Archive,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSearch,
  FileText,
  FolderTree,
  Layers3,
  Plus,
  Save,
  Search,
  Upload,
  X,
  Zap,
  QrCode
} from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { useCrud, toPayload } from "../../hooks/useCrud";
import { StatusBadge, OcrBadge, GD2FeatureLayout, TreeNode } from "../shared/SharedComponents";
import ArchiveLabelModal from "../ArchiveLabelModal";
import {
  emptyDocument,
  emptyDossier,
  emptyStorage,
  emptySimple,
  isTechnicalModelFile,
  technicalModelPattern,
} from "../../utils/constants";

const TechnicalModelViewer = lazy(() => import("../TechnicalModelViewer"));

export function parseReviewedOcrContent(description) {
  const text = String(description || "").replace(/\r/g, "");
  const marker = "Toàn văn:\n";
  const markerIndex = text.indexOf(marker);
  const metadataText = markerIndex >= 0 ? text.slice(0, markerIndex) : "";
  const fullText = markerIndex >= 0 ? text.slice(markerIndex + marker.length) : text;
  const readValue = label => {
    const line = metadataText.split("\n").find(item => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));
    return line ? line.slice(line.indexOf(":") + 1).trim() : "";
  };
  return {
    documentNumber: readValue("Số hiệu"),
    issueDate: readValue("Ngày ban hành"),
    summary: readValue("Trích yếu"),
    fullText
  };
}

export function ocrEngineDisplayName(engine) {
  return {
    gemini: "Gemini Vision AI",
    vietocr: "VietOCR",
    easyocr: "EasyOCR",
    tesseract: "Tesseract",
    pdfpig: "PdfPig (text layer PDF)",
    "docx-text": "DOCX OpenXML",
    metadata: "Số hóa metadata",
    "metadata-client": "Frontend metadata fallback"
  }[String(engine || "").toLowerCase()] || engine || "không xác định";
}

export function composeReviewedOcrContent(form) {
  return [
    `Số hiệu: ${String(form?.documentNumber || "").trim()}`,
    `Ngày ban hành: ${String(form?.issueDate || "").trim()}`,
    `Trích yếu: ${String(form?.summary || "").trim()}`,
    "Toàn văn:",
    String(form?.fullText || "").trim()
  ].join("\n");
}

export function workflowStatusLabel(status) {
  return {
    DRAFT: "Trình duyệt",
    PENDING: "Kiểm duyệt",
    NEEDS_SUPPLEMENT: "Yêu cầu sửa đổi",
    APPROVED: "Phê duyệt",
    PUBLISHED: "Xuất bản",
    CONFIRMED: "Hoàn tất",
    REJECTED: "Từ chối",
    CANCELLED: "Đã hủy",
  }[status] || status || "--";
}

export function workflowActionLabel(action) {
  return {
    SUBMIT: "Trình duyệt",
    APPROVE: "Đồng ý",
    PUBLISH: "Xuất bản",
    REJECT: "Từ chối",
    FORWARD: "Chuyển tiếp",
    REQUEST_SUPPLEMENT: "Yêu cầu bổ sung",
    RESUBMIT: "Trình lại",
    SIGN: "Xuất bản",
    CONFIRM: "Xác nhận",
    EDIT_OCR: "Hiệu chỉnh OCR",
    SEED: "Khởi tạo",
  }[action] || action || "--";
}

export default function GD21DocumentScreen() {
  const crud = useCrud("documents", emptyDocument);
  const dossiers = useCrud("dossiers", emptyDossier);
  const storageCrud = useCrud("storage", emptyStorage);
  const documentTypeCrud = useCrud("document-types", emptySimple);
  const [activeTab, setActiveTab] = useState("screen");
  const [tree, setTree] = useState([]);
  const [filters, setFilters] = useState({ query: "", metadata: "", documentType: "", status: "", ocrStatus: "", storageId: "", page: 1, pageSize: 8 });
  const [searchResult, setSearchResult] = useState({ items: [], page: 1, pageSize: 8, totalItems: 0, totalPages: 1 });
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [notice, setNotice] = useState(null);
  const [unitCode, setUnitCode] = useState("DEFAULT");
  const [viewMode, setViewMode] = useState("table");
  const [selectedStorageId, setSelectedStorageId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [pendingCreateFile, setPendingCreateFile] = useState(null);
  const [savingDocument, setSavingDocument] = useState(false);
  const [geminiExtraction, setGeminiExtraction] = useState(null);
  const [extractingWithGemini, setExtractingWithGemini] = useState(false);
  const [labelModalItem, setLabelModalItem] = useState(null);
  const fileInputRef = useRef(null);
  const createFileInputRef = useRef(null);
  const storageSelectionInitialized = useRef(false);

  async function saveDossier(event) {
    event.preventDefault();
    const code = String(dossiers.form.code || "").trim();
    const title = String(dossiers.form.title || "").trim();
    const storageId = String(dossiers.form.storageId || selectedStorageId || "").trim();
    const dossierType = String(dossiers.form.dossierType || "").trim();
    const status = String(dossiers.form.status || "DRAFT").trim();

    if (!code) { setNotice({ type: "error", text: "Vui lòng nhập Mã hồ sơ." }); return; }
    if (!title) { setNotice({ type: "error", text: "Vui lòng nhập Tên hồ sơ." }); return; }
    if (!storageId) { setNotice({ type: "error", text: "Vui lòng chọn Kho hồ sơ." }); return; }
    if (!dossierType) { setNotice({ type: "error", text: "Vui lòng chọn Loại hồ sơ." }); return; }

    setSavingDocument(true);
    try {
      const payload = toPayload({ code, title, storageId: Number(storageId), dossierType, status });
      const dossierId = dossiers.form.id ? Number(dossiers.form.id) : null;
      if (dossierId) {
        await uiApi.crud("dossiers").update(dossierId, payload);
      } else {
        await uiApi.crud("dossiers").create(payload);
      }
      dossiers.reset();
      setShowForm(false);
      selectStorage(storageId);
      await Promise.all([dossiers.load(), runSearch(filters), loadTree()]);
      setNotice({ type: "success", text: `Đã lưu hồ sơ "${title}" vào ${formatStorage(storageId)} thành công.` });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setSavingDocument(false);
    }
  }

  const resetDossierForm = () => {
    dossiers.reset();
    if (selectedStorageId) dossiers.setField?.("storageId", selectedStorageId);
    setShowForm(true);
  };

  const editDossierForm = (row) => {
    dossiers.edit(row);
    setShowForm(true);
  };

  function setFilter(key, value) {
    setFilters(current => ({ ...current, [key]: value, page: key === "page" ? Number(value) : 1 }));
  }

  const storageOptions = useMemo(
    () => storageCrud.rows.map((row) => ({
      value: String(row.id),
      label: `${row.code} - ${row.name}`
    })),
    [storageCrud.rows]
  );
  useEffect(() => {
    if (!storageSelectionInitialized.current && storageOptions.length) {
      storageSelectionInitialized.current = true;
      selectStorage(storageOptions[0].value);
    }
  }, [storageOptions]);
  const storageById = useMemo(
    () => new Map(storageCrud.rows.map((row) => [Number(row.id), row])),
    [storageCrud.rows]
  );
  const selectedStorageLabel = selectedStorageId
    ? storageOptions.find(option => option.value === selectedStorageId)?.label || `Kho #${selectedStorageId}`
    : "";
  const filteredDossiers = useMemo(
    () => dossiers.rows.filter(row => !selectedStorageId || String(row.storageId || "") === selectedStorageId),
    [dossiers.rows, selectedStorageId]
  );
  const dossierOptions = useMemo(
    () => filteredDossiers.map((row) => ({
      value: String(row.id),
      label: `${row.code} - ${row.title}`
    })),
    [filteredDossiers]
  );
  const dossierById = useMemo(
    () => new Map(dossiers.rows.map((row) => [Number(row.id), row])),
    [dossiers.rows]
  );
  const documentTypeOptions = useMemo(() => {
    const configured = documentTypeCrud.rows.map((row) => row.name || row.code).filter(Boolean);
    const fallback = ["PDF", "DOCX", "TIFF", "IMAGE", "CAD/BIM", "METADATA"];
    return Array.from(new Set([...configured, ...fallback]));
  }, [documentTypeCrud.rows]);
  const formatDossier = (value) => {
    const dossier = dossierById.get(Number(value));
    return dossier ? `${dossier.code} - ${dossier.title}` : `Hồ sơ #${value || "-"}`;
  };
  const formatStorage = (value) => {
    const storage = storageById.get(Number(value));
    return storage ? `${storage.code} - ${storage.name}` : value ? `Kho #${value}` : "-";
  };
  const formatUploadedFileName = (value) => value
    ? String(value).replace(/^\d+_[0-9a-f]{32}_/i, "")
    : "";

  // Nhận cả hai dạng phản hồi: metadata object hoặc danh sách fields từ API.
  // Điều này giúp UI vẫn tự điền được dữ liệu khi backend bổ sung trường mới.
  const normalizeExtractionFields = (result) => {
    if (Array.isArray(result?.fields)) return result.fields;
    if (result?.metadata && typeof result.metadata === "object") {
      return Object.entries(result.metadata)
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([key, value]) => ({ key, label: key, value: String(value) }));
    }
    return [];
  };
  const extractionFieldValue = (fields, keys) => fields.find(field =>
    keys.includes(String(field.key || "").toLowerCase())
  )?.value?.trim?.() || "";
  const geminiErrorMessage = (error) => {
    const message = String(error?.message || "Không thể bóc tách dữ liệu.");
    if (/429|quota|resource_exhausted/i.test(message)) return "Gemini đã hết hạn mức sử dụng. Vui lòng thử lại sau hoặc liên hệ quản trị viên.";
    if (/timeout|timed out|504/i.test(message)) return "Gemini xử lý quá lâu. Vui lòng thử lại với tệp nhỏ hơn.";
    if (/api key|cấu hình gemini/i.test(message)) return "Gemini chưa được cấu hình API Key. Vui lòng liên hệ quản trị viên.";
    return `Bóc tách bằng Gemini thất bại: ${message}`;
  };

  async function extractSelectedDocumentWithGemini() {
    if (!selectedDoc?.id || !selectedDoc.fileName) {
      setNotice({ type: "error", text: "Vui lòng chọn tài liệu đã tải tệp lên trước khi bóc tách." });
      return;
    }

    setExtractingWithGemini(true);
    setNotice({ type: "info", text: "Đang xử lý bằng AI... Gemini đang bóc tách dữ liệu tài liệu." });
    try {
      // Lấy đúng tệp đã lưu của tài liệu và gửi tới endpoint OCR. Engine được cố định ở uiApi là Gemini.
      const blob = await uiApi.gd2.documentPdfBlob(selectedDoc.id);
      const file = new File([blob], formatUploadedFileName(selectedDoc.fileName) || "tai-lieu", {
        type: blob.type || "application/octet-stream"
      });
      const ocrResult = await uiApi.extractOcr(file);
      const rawText = String(ocrResult?.text || "").trim();
      if (!rawText) throw new Error("Gemini không trả về nội dung văn bản.");

      // API GD2 chuyển Raw Text thành các metadata/fields. Các giá trị này được dùng để tự điền form phía dưới.
      const metadataResult = await uiApi.gd2.extractOcrMetadata(selectedDoc.id, {
        engine: "gemini",
        actor: "current-user",
        unitCode: "DEFAULT",
        fileName: selectedDoc.fileName,
        extractedText: rawText,
        note: "Bóc tách dữ liệu từ Gemini tại GD2-1"
      });
      const fields = normalizeExtractionFields(metadataResult);
      const autoTitle = extractionFieldValue(fields, ["title", "documenttitle", "subject", "trichyeu"]);
      const autoType = String(metadataResult?.documentType || extractionFieldValue(fields, ["documenttype", "type"]) || "").trim();

      // Map dữ liệu API vào form tài liệu hiện có; người dùng vẫn có thể chỉnh sửa trước khi lưu tiếp.
      crud.setField("title", autoTitle || selectedDoc.title);
      crud.setField("description", rawText);
      crud.setField("ocrStatus", "DONE");
      const updatedDocument = {
        dossierId: Number(selectedDoc.dossierId),
        code: selectedDoc.code,
        title: autoTitle || selectedDoc.title,
        fileName: selectedDoc.fileName,
        ocrStatus: "DONE",
        status: selectedDoc.status || "DRAFT",
        description: rawText
      };
      await uiApi.crud("documents").update(selectedDoc.id, updatedDocument);

      setGeminiExtraction({
        rawText,
        fields,
        documentType: autoType,
        engine: "gemini"
      });
      setSelectedDoc(current => current ? { ...current, ...updatedDocument } : current);
      await Promise.all([crud.load(), runSearch(filters, selectedDoc.id), loadTree()]);
      setNotice({ type: "success", text: "Bóc tách thành công. Nội dung và metadata đã được cập nhật từ Gemini." });
    } catch (error) {
      setNotice({ type: "error", text: geminiErrorMessage(error) });
    } finally {
      setExtractingWithGemini(false);
    }
  }
  const editDocumentForm = (row) => {
    crud.edit(row);
    clearCreateFile();
    const dossier = dossierById.get(Number(row.dossierId));
    const rowStorageId = dossier?.storageId ? String(dossier.storageId) : "";
    if (rowStorageId !== selectedStorageId) selectStorage(rowStorageId);
    const typeMatch = String(row.description || "").match(/Loại tài liệu:\s*([^\n]+)/i);
    setDocumentType(typeMatch?.[1]?.trim() || "");
    setShowForm(true);
  };
  const resetDocumentForm = () => {
    crud.reset();
    setDocumentType("");
    clearCreateFile();
    setShowForm(true);
  };

  function clearCreateFile() {
    setPendingCreateFile(null);
    if (createFileInputRef.current) createFileInputRef.current.value = "";
  }

  async function ensureDossierForSelectedStorage() {
    if (!selectedStorageId) throw new Error("Vui lòng chọn kho lưu trữ trước khi thêm tài liệu.");
    const existing = filteredDossiers[0];
    if (existing) return existing;
    const storage = storageById.get(Number(selectedStorageId));
    const stamp = Date.now().toString().slice(-6);
    const dossierId = await uiApi.crud("dossiers").create({
      code: `HS-${storage?.code || selectedStorageId}-${stamp}`.replace(/\s+/g, "-"),
      title: `Hồ sơ mặc định - ${storage?.name || selectedStorageId}`,
      dossierType: "SO_HOA",
      storageId: Number(selectedStorageId),
      status: "DRAFT",
      fromDate: null,
      toDate: null,
      description: "Hồ sơ hệ thống tự tạo để chứa tài liệu tạo nhanh ở GĐ2-1."
    });
    await dossiers.load?.();
    return {
      id: Number(dossierId?.id || dossierId),
      code: `HS-${storage?.code || selectedStorageId}-${stamp}`,
      title: `Hồ sơ mặc định - ${storage?.name || selectedStorageId}`,
      storageId: Number(selectedStorageId),
      status: "DRAFT"
    };
  }

  const allowedExtensions = [".pdf", ".docx", ".tif", ".tiff", ".png", ".jpg", ".jpeg", ".ifc", ".stl", ".obj", ".step", ".stp"];
  const unitLimits = { DEFAULT: 25, HC: 20, TC: 30, QTHT: 50 };

  const loadTree = useCallback(async () => {
    try {
      setTree(await uiApi.gd2.documentTree());
    } catch {
      setTree([]);
    }
  }, []);

  const runSearch = useCallback(async (nextFilters = filters, preferredDocumentId = null) => {
    try {
      setNotice(null);
      const result = await uiApi.gd2.documentSearch(nextFilters);
      setSearchResult(result);
      setSelectedDoc(current => {
        if (preferredDocumentId) {
          return result.items?.find(item => Number(item.id) === Number(preferredDocumentId)) || current || result.items?.[0] || null;
        }
        return current || result.items?.[0] || null;
      });
      return result;
    } catch (error) {
      setNotice({ type: "error", text: error.message });
      return null;
    }
  }, [filters]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  useEffect(() => {
    runSearch(filters);
  }, [runSearch, filters]);

  function selectStorage(value) {
    const storageId = value ? String(value) : "";
    setSelectedStorageId(storageId);
    setSelectedDoc(null);
    setSelectedIds([]);
    setFilters(current => ({ ...current, storageId, dossierId: "", page: 1 }));
  }

  function selectDossierFromTree(dossierId) {
    const dossier = dossierById.get(Number(dossierId));
    const storageId = dossier?.storageId ? String(dossier.storageId) : "";
    setSelectedStorageId(storageId);
    setSelectedDoc(null);
    setSelectedIds([]);
    setFilters(current => ({ ...current, storageId, dossierId: String(dossierId), page: 1 }));
  }

  const toggleSelect = id => setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const displayedDocuments = searchResult.items;
  const allSelected = displayedDocuments.length > 0 && displayedDocuments.every(row => selectedIds.includes(row.id));
  const toggleAll = () => setSelectedIds(allSelected ? [] : displayedDocuments.map(row => row.id));

  function validateUploadFile(file) {
    if (!file) return null;
    const extension = `.${file.name.split(".").pop()}`.toLowerCase();
    const maxMb = technicalModelPattern.test(file.name) ? 200 : (unitLimits[unitCode] ?? unitLimits.DEFAULT);
    if (!allowedExtensions.includes(extension)) {
      return "Định dạng file không hợp lệ. Hỗ trợ PDF, DOCX, TIFF, PNG/JPG và IFC/STL/OBJ/STEP.";
    }
    if (file.size > maxMb * 1024 * 1024) {
      return `File vượt giới hạn ${maxMb}MB của đơn vị ${unitCode}.`;
    }
    return null;
  }

  function selectCreateFile(event) {
    const file = event.target.files?.[0] || null;
    const validationError = validateUploadFile(file);
    if (validationError) {
      clearCreateFile();
      setNotice({ type: "error", text: validationError });
      return;
    }
    setPendingCreateFile(file);
    setNotice(null);
  }

  async function uploadFileForDocument(documentId, file) {
    const validationError = validateUploadFile(file);
    if (validationError) throw new Error(validationError);
    return uiApi.crud("documents").upload(documentId, file, "gemini", unitCode);
  }

  async function saveDocument(event) {
    event.preventDefault();
    if (!documentType) {
      setNotice({ type: "error", text: "Vui lòng chọn loại tài liệu." });
      return;
    }

    let documentId = crud.form.id ? Number(crud.form.id) : null;
    let metadataSaved = false;
    setSavingDocument(true);
    try {
      const dossier = await ensureDossierForSelectedStorage();
      const generatedDocumentCode = `VB-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const documentCode = String(crud.form.code || "").trim() || generatedDocumentCode;
      const documentTitle = String(crud.form.title || "").trim() || pendingCreateFile?.name || `Tài liệu ${documentCode}`;
      const metadata = [
        `Loại tài liệu: ${documentType}`,
        selectedStorageLabel ? `Kho lưu trữ: ${selectedStorageLabel}` : "",
        crud.form.description || ""
      ].filter(Boolean).join("\n");
      const payload = toPayload({
        ...crud.form,
        code: documentCode,
        title: documentTitle,
        dossierId: dossier.id,
        fileName: "",
        ocrStatus: "PENDING",
        status: "DRAFT",
        description: metadata
      });
      if (documentId) await uiApi.crud("documents").update(documentId, payload);
      else {
        const created = await uiApi.crud("documents").create(payload);
        documentId = Number(created?.id ?? created);
        if (!Number.isFinite(documentId) || documentId <= 0) {
          throw new Error("API không trả về ID tài liệu vừa tạo.");
        }
      }
      metadataSaved = true;

      if (pendingCreateFile) {
        await uploadFileForDocument(documentId, pendingCreateFile);
      }

      const savedTitle = documentTitle;
      const uploadedFileName = pendingCreateFile?.name;
      const successText = uploadedFileName
        ? `Đã lưu tài liệu ${savedTitle} và tải tệp ${uploadedFileName} thành công.`
        : `Đã lưu metadata tài liệu ${savedTitle} thành công.`;
      resetDocumentForm();
      setShowForm(false);
      await Promise.all([crud.load(), runSearch(filters, documentId), loadTree()]);
      setNotice({ type: "success", text: successText });
    } catch (error) {
      const errorText = metadataSaved && pendingCreateFile
        ? `Đã lưu metadata nhưng tải/OCR tệp thất bại: ${error.message}`
        : error.message;
      if (documentId) await Promise.all([crud.load(), runSearch(filters, documentId), loadTree()]);
      setNotice({ type: "error", text: errorText });
    } finally {
      setSavingDocument(false);
    }
  }

  async function uploadSelectedFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedDoc) return;
    const validationError = validateUploadFile(file);
    if (validationError) {
      setNotice({ type: "error", text: validationError });
      return;
    }

    try {
      await uploadFileForDocument(selectedDoc.id, file);
      await runSearch(filters, selectedDoc.id);
      await loadTree();
      setNotice({ type: "success", text: isTechnicalModelFile(file.name) ? "Đã tải mô hình CAD/BIM và sẵn sàng xem 3D." : "Đã tải file, OCR và đánh chỉ mục tự động." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function publishDocument(row = selectedDoc) {
    if (!row) return;
    try {
      const updated = await uiApi.gd2.publishDocument(row.id, {
        entityType: "DOCUMENT",
        entityId: row.id,
        action: "PUBLISH",
        actor: "current-user",
        unitCode,
        comment: "Xuất bản từ GĐ2-1",
        recipient: row.code
      });
      setSelectedDoc(updated);
      setNotice({ type: "success", text: `Đã xuất bản tài liệu ${row.code}.` });
      await runSearch();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function exportDocuments(format) {
    try {
      const result = await uiApi.gd2.exportDocuments({ format, documentIds: selectedIds });
      setNotice({ type: "success", text: `Đã tạo file ${result.fileName} (${result.itemCount} tài liệu).` });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  const dossierForm = (
    <form className="gd21-inline-form" onSubmit={saveDossier}>
      <div className="gd21-form-heading">
        <strong>Thêm mới Hồ sơ Lưu trữ</strong>
        <span>Chỉ cần nhập 5 thông tin dưới đây; hồ sơ sẽ được lưu vào kho đã chọn.</span>
      </div>
      <label className="gd21-field-label">Mã hồ sơ <span className="required">*</span></label>
      <input
        value={dossiers.form.code || ""}
        onChange={e => dossiers.setField("code", e.target.value)}
        placeholder="VD: HS-2026-001"
        required
      />
      <label className="gd21-field-label">Tên hồ sơ <span className="required">*</span></label>
      <input
        value={dossiers.form.title || ""}
        onChange={e => dossiers.setField("title", e.target.value)}
        placeholder="VD: Hồ sơ Dự án Xây dựng Trụ sở"
        required
      />
      <label className="gd21-field-label">Kho hồ sơ <span className="required">*</span></label>
      <select
        value={dossiers.form.storageId || selectedStorageId || ""}
        onChange={e => { dossiers.setField("storageId", e.target.value); selectStorage(e.target.value); }}
        required
      >
        <option value="">-- Chọn kho lưu trữ --</option>
        {storageOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <label className="gd21-field-label">Loại hồ sơ <span className="required">*</span></label>
      <select
        value={dossiers.form.dossierType || ""}
        onChange={e => dossiers.setField("dossierType", e.target.value)}
        required
      >
        <option value="">-- Chọn loại hồ sơ --</option>
        <option value="Hanh chinh">Hành chính</option>
        <option value="Tai chinh">Tài chính</option>
        <option value="Nhan su">Nhân sự</option>
        <option value="Du an">Dự án</option>
        <option value="Ky thuat">Kỹ thuật</option>
        <option value="SO_HOA">Số hóa</option>
      </select>
      <label className="gd21-field-label">Trạng thái</label>
      <select
        value={dossiers.form.status || "DRAFT"}
        onChange={e => dossiers.setField("status", e.target.value)}
      >
        <option value="DRAFT">Bản nháp</option>
        <option value="PENDING">Chờ kiểm duyệt</option>
        <option value="APPROVED">Đã phê duyệt</option>
        <option value="PUBLISHED">Đã xuất bản</option>
      </select>
      <div className="gd21-form-actions">
        <button className="btn primary" type="submit" disabled={savingDocument}><Save size={14}/> {savingDocument ? "Đang lưu..." : "Lưu vào kho"}</button>
        <button className="btn" type="button" disabled={savingDocument} onClick={() => { dossiers.reset(); setShowForm(false); }}><X size={14}/> Bỏ qua</button>
      </div>
      {dossiers.error && <div className="gd21-form-error">{dossiers.error}</div>}
    </form>
  );

  const treePanel = (
    <div className="gd21-tree">
      {tree.map(node => (
        <TreeNode key={node.id} node={node} onSelect={(selectedNode) => {
          if (selectedNode.type === "ROOT") selectStorage("");
          if (selectedNode.type === "STORAGE") selectStorage(selectedNode.referenceId);
          if (selectedNode.type === "DOSSIER") selectDossierFromTree(selectedNode.referenceId);
          if (selectedNode.type === "DOCUMENT_TYPE") setFilter("documentType", selectedNode.name);
        }} />
      ))}
    </div>
  );

  const tablePanel = (
    <div className={viewMode === "grid" ? "gd21-center grid-mode" : "gd21-center"}>
      <div className="gd21-filterbar">
        <select value={selectedStorageId} onChange={e => selectStorage(e.target.value)}>
          <option value="">Tất cả kho lưu trữ</option>
          {storageOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <input placeholder="Full-text: mã, tên, nội dung OCR..." value={filters.query} onChange={e => setFilter("query", e.target.value)} />
        <input placeholder="Metadata/file/ghi chú..." value={filters.metadata} onChange={e => setFilter("metadata", e.target.value)} />
        <select value={filters.documentType} onChange={e => setFilter("documentType", e.target.value)}>
          <option value="">Mọi loại</option>
          {["PDF", "DOCX", "TIFF", "IMAGE", "METADATA"].map(item => <option key={item}>{item}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilter("status", e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="PENDING">Chờ kiểm duyệt</option>
          <option value="APPROVED">Đã phê duyệt</option>
          <option value="PUBLISHED">Đã xuất bản</option>
        </select>
      </div>
      {showForm && dossierForm}
      <div className="gd21-table-tools">
        <span>
          {selectedStorageId
            ? `Hiển thị ${searchResult.totalItems} tài liệu trong kho ${selectedStorageLabel}`
            : `Hiển thị ${searchResult.totalItems} tài liệu trong tất cả kho`}
          {` · Trang ${searchResult.page}/${searchResult.totalPages}`}
        </span>
        <div>
          <button className={`icon-btn ${viewMode === "table" ? "primary" : ""}`} title="Table" onClick={() => setViewMode("table")}><Layers3 size={14}/></button>
          <button className={`icon-btn ${viewMode === "grid" ? "primary" : ""}`} title="Grid" onClick={() => setViewMode("grid")}><FolderTree size={14}/></button>
        </div>
      </div>
      {viewMode === "table" ? (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{width:36}}><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
              <th>Mã tài liệu</th>
              <th>Tên tài liệu</th>
              <th>Hồ sơ lưu trữ</th>
              <th>Tên file</th>
              <th>Trạng thái OCR</th>
              <th>Trạng thái văn bản</th>
              <th style={{width: 80, textAlign: "center"}}>In nhãn</th>
            </tr>
          </thead>
          <tbody>
            {displayedDocuments.map(row => (
              <tr key={row.id} className={selectedDoc?.id === row.id ? "row-selected" : ""} onClick={() => { setSelectedDoc(row); editDocumentForm(row); }}>
                <td onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelect(row.id)} />
                </td>
                <td><span className="gd2-code">{row.code}</span></td>
                <td>{row.title}</td>
                <td>{formatDossier(row.dossierId)}</td>
                <td>{formatUploadedFileName(row.fileName) || "-"}</td>
                <td><OcrBadge status={row.ocrStatus || "PENDING"} /></td>
                <td><StatusBadge status={row.status || "DRAFT"} /></td>
                <td style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    className="icon-btn"
                    title="In Barcode / QR Code"
                    style={{ color: "#4f46e5" }}
                    onClick={() => setLabelModalItem({
                      id: row.id,
                      code: row.code,
                      name: row.title,
                      entityType: "DOCUMENT",
                      location: formatStorage(dossierById.get(Number(row.dossierId))?.storageId),
                      createdAt: row.createdAt
                    })}
                  >
                    <QrCode size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {displayedDocuments.length === 0 && (
              <tr><td colSpan="8" className="empty-cell">
                {selectedStorageId
                  ? "Kho này hiện chưa có tài liệu nào. Hãy bấm [Thêm mới] để tải tài liệu vào kho!"
                  : "Hiện chưa có tài liệu nào trong hệ thống. Hãy bấm [Thêm mới] để tải tài liệu!"}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      ) : (
        <div className="gd21-doc-grid">
          {displayedDocuments.map(row => (
            <button key={row.id} className={selectedDoc?.id === row.id ? "gd21-doc-card active" : "gd21-doc-card"} onClick={() => { setSelectedDoc(row); editDocumentForm(row); }}>
              <FileText size={22}/>
              <strong>{row.code}</strong>
              <span>{row.title}</span>
              <StatusBadge status={row.status || "DRAFT"} />
            </button>
          ))}
        </div>
      )}
      <div className="gd21-pagination">
        <button className="btn" disabled={filters.page <= 1} onClick={() => setFilter("page", filters.page - 1)}>Trước</button>
        <select value={filters.pageSize} onChange={e => setFilters(current => ({ ...current, pageSize: Number(e.target.value), page: 1 }))}>
          {[8, 15, 30, 50].map(size => <option key={size} value={size}>{size}/trang</option>)}
        </select>
        <button className="btn" disabled={filters.page >= searchResult.totalPages} onClick={() => setFilter("page", filters.page + 1)}>Sau</button>
      </div>
    </div>
  );

  const previewPanel = (
    <div className="gd21-preview-panel">
      <div className="gd21-preview-box">
        {isTechnicalModelFile(selectedDoc?.fileName) ? (
          <Suspense fallback={<div className="gd21-preview-empty"><strong>Đang khởi tạo trình xem WebGL…</strong></div>}>
            <TechnicalModelViewer documentId={selectedDoc.id} fileName={selectedDoc.fileName} title={selectedDoc.title}/>
          </Suspense>
        ) : selectedDoc?.fileName?.toLowerCase().endsWith(".pdf") ? (
          <iframe title="PDF Viewer" src={`/api/dms/documents/${selectedDoc.id}/file`} />
        ) : selectedDoc?.fileName && /\.(png|jpg|jpeg)$/i.test(selectedDoc.fileName) ? (
          <img src={`/api/dms/documents/${selectedDoc.id}/file`} alt={selectedDoc.title} />
        ) : (
          <div className="gd21-preview-empty">
            <FileSearch size={42}/>
            <strong>{selectedDoc ? "Preview metadata" : "Chọn tài liệu"}</strong>
            <span>{formatUploadedFileName(selectedDoc?.fileName) || "PDF/ảnh sẽ hiển thị trực tuyến tại đây"}</span>
          </div>
        )}
      </div>
      <div className="detail-grid">
        <div className="detail-row"><span>Mã</span><strong>{selectedDoc?.code || "-"}</strong></div>
        <div className="detail-row"><span>Tên</span><strong>{selectedDoc?.title || "-"}</strong></div>
        <div className="detail-row"><span>Hồ sơ</span><span>{selectedDoc ? formatDossier(selectedDoc.dossierId) : "-"}</span></div>
        <div className="detail-row"><span>Kho lưu trữ</span><span>{selectedDoc ? formatStorage(dossierById.get(Number(selectedDoc.dossierId))?.storageId) : "-"}</span></div>
        <div className="detail-row"><span>File</span><span>{formatUploadedFileName(selectedDoc?.fileName) || "Chưa upload"}</span></div>
        <div className="detail-row"><span>OCR</span><OcrBadge status={selectedDoc?.ocrStatus || "PENDING"} /></div>
        <div className="detail-row"><span>Trạng thái</span><StatusBadge status={selectedDoc?.status || "DRAFT"} /></div>
        <div className="detail-row"><span>Metadata</span><span>{selectedDoc?.description || "Chưa có metadata/OCR text"}</span></div>
      </div>
      {geminiExtraction && (
        <div className="gd21-gemini-result">
          <div className="gd21-gemini-result-heading">
            <strong>Kết quả bóc tách Gemini</strong>
            <span>{geminiExtraction.documentType || "Metadata tài liệu"}</span>
          </div>
          <label className="gd21-field-label">Raw Text</label>
          <textarea value={geminiExtraction.rawText} readOnly rows={8} aria-label="Nội dung bóc tách từ Gemini" />
          {geminiExtraction.fields.length > 0 && (
            <div className="gd21-gemini-fields">
              {geminiExtraction.fields.map(field => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  <input value={field.value || ""} readOnly />
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      <input ref={fileInputRef} type="file" hidden accept=".pdf,.docx,.tif,.tiff,.png,.jpg,.jpeg,.ifc,.stl,.obj,.step,.stp" onChange={uploadSelectedFile} />
      <div className="gd21-preview-actions">
        <select value={unitCode} onChange={e => setUnitCode(e.target.value)} title="Đơn vị áp dụng giới hạn upload">
          {Object.keys(unitLimits).map(code => <option key={code} value={code}>{code} · {unitLimits[code]}MB</option>)}
        </select>
        <button className="btn primary" disabled={!selectedDoc} onClick={() => fileInputRef.current?.click()}><Upload size={14}/> Upload</button>
        <button
          className="btn"
          disabled={!selectedDoc}
          onClick={() => setLabelModalItem({
            id: selectedDoc.id,
            code: selectedDoc.code,
            name: selectedDoc.title,
            entityType: "DOCUMENT",
            location: formatStorage(dossierById.get(Number(selectedDoc.dossierId))?.storageId),
            createdAt: selectedDoc.createdAt
          })}
          title="In tem Barcode / QR Code"
          style={{ color: "#4f46e5" }}
        >
          <QrCode size={14} /> In nhãn
        </button>
        <button className="btn warn" disabled={!selectedDoc?.fileName || extractingWithGemini} onClick={extractSelectedDocumentWithGemini}>
          <Zap size={14}/> {extractingWithGemini ? "Đang xử lý bằng AI..." : "Bóc tách dữ liệu"}
        </button>
        <button className="btn ok" disabled={!selectedDoc} onClick={() => publishDocument()}><CheckCircle2 size={14}/> Xuất bản</button>
      </div>
    </div>
  );

  return (
    <>
      <GD2FeatureLayout
        featureId="GD2-1"
        featureName="Quản lý tài liệu"
        description="Tạo mới, lưu trữ, phân loại cây thư mục/loại tài liệu, tìm kiếm full-text/metadata, xem trực tuyến, chỉnh sửa thuộc tính và xuất bản/xuất file."
        actor="Chuyên viên / Quản trị viên"
        actionBarLabel="Quản lý tài liệu số hóa theo phân quyền đơn vị"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        splitRatio="280px minmax(0, 1fr)"
        className="gd21-feature"
        leftPanelTitle="Cây kho / loại tài liệu"
        rightPanelTitle="Danh sách tài liệu và preview"
        midContent={notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
        actions={
          <>
            <button className="btn" onClick={() => runSearch()}><Search size={14}/> Tìm kiếm</button>
            <button className="btn primary" onClick={resetDossierForm}><Plus size={14}/> Thêm mới Hồ sơ</button>
            <button className="btn ok" onClick={() => exportDocuments("EXCEL")}><Download size={14}/> Excel metadata</button>
            <button className="btn" onClick={() => exportDocuments("PDF")}><FileText size={14}/> PDF</button>
            <button className="btn" onClick={() => exportDocuments("ZIP")}><Archive size={14}/> ZIP</button>
          </>
        }
        actionRows={[
          { actor: "Chuyên viên", action: "Tạo mới/lưu trữ", description: "Nhập metadata, chọn hồ sơ, upload file hợp lệ", result: "Tài liệu được lưu và đánh chỉ mục tự động" },
          { actor: "Chuyên viên", action: "Tìm kiếm nâng cao", description: "Full-text, metadata, thời gian, loại tài liệu, OCR/status", result: "Danh sách phân trang theo điều kiện" },
          { actor: "Quản trị viên", action: "Phân loại cây", description: "Duyệt cây kho, hồ sơ, loại tài liệu số hóa", result: "Lọc nhanh theo node" },
          { actor: "Chuyên viên", action: "Xem/xuất bản/xuất file", description: "Preview PDF/ảnh, sửa thuộc tính, xuất PDF/ZIP/Excel", result: "Ghi audit và trả về kết quả xuất" },
        ]}
        validationItems={[
          { type: "required", label: "File", text: "Hỗ trợ PDF, DOCX, TIFF, PNG/JPG và mô hình IFC/STL/OBJ/STEP." },
          { type: "rule", label: "Dung lượng", text: "Tệp văn bản theo giới hạn đơn vị; mô hình CAD/BIM tối đa 200MB." },
          { type: "rule", label: "Indexing", text: "Tự động đánh chỉ mục ngay khi tạo metadata hoặc upload file." },
          { type: "perm", label: "Phân quyền", text: "Chuyên viên và quản trị viên chỉ thao tác theo phạm vi đơn vị được cấp." },
        ]}
        flowSteps={[
          { step: "1", label: "Phân loại", desc: "Chọn cây kho/loại", color: "#3264f4" },
          { step: "2", label: "Lưu trữ", desc: "Metadata + file", color: "#7c3aed" },
          { step: "3", label: "Index", desc: "OCR/full-text", color: "#f59e0b" },
          { step: "4", label: "Khai thác", desc: "Preview/xuất bản", color: "#22c55e" },
        ]}
        leftPanel={treePanel}
        rightPanel={<div className={`gd21-three-col ${isTechnicalModelFile(selectedDoc?.fileName) ? "model-mode" : ""}`}><div>{tablePanel}</div>{previewPanel}</div>}
      />
      {labelModalItem && (
        <ArchiveLabelModal
          item={labelModalItem}
          onClose={() => setLabelModalItem(null)}
        />
      )}
    </>
  );
}
