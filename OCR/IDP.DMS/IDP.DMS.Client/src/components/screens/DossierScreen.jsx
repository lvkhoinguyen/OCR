import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FolderPlus,
  List,
  Save,
  Send,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Archive,
  Layers,
  Box,
  FileText,
  Sparkles,
  Edit,
  Trash2,
  Filter,
  Eye,
  ChevronRight
} from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { StatusBadge } from "../shared/SharedComponents";
import DocumentPanel, { formatFileSize } from "./DocumentPanel";

export default function DossierScreen({ mode }) {
  const [activeTab, setActiveTab] = useState("FORM"); // "FORM" | "LIST"
  const [dossiers, setDossiers] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [storageRows, setStorageRows] = useState([]);
  const [dossierTypes, setDossierTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  // Form State
  const [currentDossierId, setCurrentDossierId] = useState(null);
  const [form, setForm] = useState({
    code: "",
    title: "",
    dossierType: "",
    storageId: "",
    status: "DRAFT",
    fromDate: "",
    toDate: "",
    description: ""
  });

  // Cascading Storage State (Kho -> Kệ -> Tầng -> Hộp)
  const [selectedKhoId, setSelectedKhoId] = useState("");
  const [selectedKeId, setSelectedKeId] = useState("");
  const [selectedTangId, setSelectedTangId] = useState("");
  const [selectedHopId, setSelectedHopId] = useState("");

  // Attached child documents for the current dossier
  const [attachedDocuments, setAttachedDocuments] = useState([]);

  // Search & Filter State for Tab 2
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const storageById = useMemo(
    () => new Map(storageRows.map(r => [Number(r.id), r])),
    [storageRows]
  );

  // Storage cascading collections
  const khoOptions = useMemo(
    () => storageRows.filter(r => r.locationType === "KHO" && String(r.status || "ACTIVE").toUpperCase() === "ACTIVE"),
    [storageRows]
  );

  const keOptions = useMemo(() => {
    if (!selectedKhoId) return [];
    return storageRows.filter(
      r => r.locationType === "KE" && Number(r.parentId) === Number(selectedKhoId) && String(r.status || "ACTIVE").toUpperCase() === "ACTIVE"
    );
  }, [storageRows, selectedKhoId]);

  const tangOptions = useMemo(() => {
    if (!selectedKeId) return [];
    return storageRows.filter(
      r => r.locationType === "TANG" && Number(r.parentId) === Number(selectedKeId) && String(r.status || "ACTIVE").toUpperCase() === "ACTIVE"
    );
  }, [storageRows, selectedKeId]);

  const hopOptions = useMemo(() => {
    if (!selectedTangId) return [];
    return storageRows.filter(
      r => r.locationType === "HOP" && Number(r.parentId) === Number(selectedTangId) && String(r.status || "ACTIVE").toUpperCase() === "ACTIVE"
    );
  }, [storageRows, selectedTangId]);

  // Documents count per dossier
  const docCountByDossierId = useMemo(() => {
    const counts = new Map();
    allDocuments.forEach(doc => {
      const dId = Number(doc.dossierId);
      counts.set(dId, (counts.get(dId) || 0) + 1);
    });
    return counts;
  }, [allDocuments]);

  // Location path helper
  const getLocationPath = useCallback((storageId) => {
    if (!storageId) return "--";
    const path = [];
    const visited = new Set();
    let curr = storageById.get(Number(storageId));
    while (curr && !visited.has(Number(curr.id))) {
      visited.add(Number(curr.id));
      path.unshift(`${curr.name} (${curr.code})`);
      curr = storageById.get(Number(curr.parentId));
    }
    return path.length ? path.join(" > ") : `Vị trí #${storageId}`;
  }, [storageById]);

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dossierRes, docRes, storageRes, typeRes] = await Promise.all([
        uiApi.crud("dossiers").list().catch(() => []),
        uiApi.crud("documents").list().catch(() => []),
        uiApi.crud("storage").list().catch(() => []),
        uiApi.crud("dossier-types").list().catch(() => [])
      ]);

      const dossierList = Array.isArray(dossierRes) ? dossierRes : (dossierRes?.items || []);
      const docList = Array.isArray(docRes) ? docRes : (docRes?.items || []);
      const sList = Array.isArray(storageRes) ? storageRes : (storageRes?.items || []);
      const tList = Array.isArray(typeRes) ? typeRes : (typeRes?.items || []);

      setDossiers([...dossierList].sort((a, b) => Number(b.id) - Number(a.id)));
      setAllDocuments(docList);
      setStorageRows(sList);
      setDossierTypes(tList);
    } catch (err) {
      setNotice({ type: "error", text: `Không thể tải dữ liệu: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper sinh mã tự động HS-YYYY-001
  function generateAutoDossierCode() {
    const currentYear = new Date().getFullYear();
    const pattern = new RegExp(`^HS-${currentYear}-(\\d+)$`, "i");
    let maxSeq = 0;

    dossiers.forEach(d => {
      const match = String(d.code || "").match(pattern);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    });

    const nextSeq = maxSeq + 1;
    const nextCode = `HS-${currentYear}-${String(nextSeq).padStart(3, "0")}`;
    setForm(prev => ({ ...prev, code: nextCode }));
    setNotice({ type: "success", text: `Đã tự động sinh mã hồ sơ mới: ${nextCode}` });
  }

  // Handle Cascading Storage Selection
  function handleKhoChange(khoId) {
    setSelectedKhoId(khoId);
    setSelectedKeId("");
    setSelectedTangId("");
    setSelectedHopId("");
    setForm(prev => ({ ...prev, storageId: khoId }));
  }

  function handleKeChange(keId) {
    setSelectedKeId(keId);
    setSelectedTangId("");
    setSelectedHopId("");
    setForm(prev => ({ ...prev, storageId: keId || selectedKhoId }));
  }

  function handleTangChange(tangId) {
    setSelectedTangId(tangId);
    setSelectedHopId("");
    setForm(prev => ({ ...prev, storageId: tangId || selectedKeId || selectedKhoId }));
  }

  function handleHopChange(hopId) {
    setSelectedHopId(hopId);
    setForm(prev => ({ ...prev, storageId: hopId || selectedTangId || selectedKeId || selectedKhoId }));
  }

  // Populate cascading selectors when editing a dossier with existing storageId
  const setStorageHierarchy = useCallback((storageId) => {
    if (!storageId) {
      setSelectedKhoId("");
      setSelectedKeId("");
      setSelectedTangId("");
      setSelectedHopId("");
      return;
    }
    const item = storageById.get(Number(storageId));
    if (!item) return;

    if (item.locationType === "HOP") {
      setSelectedHopId(String(item.id));
      const tang = storageById.get(Number(item.parentId));
      if (tang) {
        setSelectedTangId(String(tang.id));
        const ke = storageById.get(Number(tang.parentId));
        if (ke) {
          setSelectedKeId(String(ke.id));
          setSelectedKhoId(String(ke.parentId || ""));
        }
      }
    } else if (item.locationType === "TANG") {
      setSelectedHopId("");
      setSelectedTangId(String(item.id));
      const ke = storageById.get(Number(item.parentId));
      if (ke) {
        setSelectedKeId(String(ke.id));
        setSelectedKhoId(String(ke.parentId || ""));
      }
    } else if (item.locationType === "KE") {
      setSelectedHopId("");
      setSelectedTangId("");
      setSelectedKeId(String(item.id));
      setSelectedKhoId(String(item.parentId || ""));
    } else if (item.locationType === "KHO") {
      setSelectedHopId("");
      setSelectedTangId("");
      setSelectedKeId("");
      setSelectedKhoId(String(item.id));
    }
  }, [storageById]);

  // Chuyển sang chỉnh sửa hồ sơ
  function handleEditDossier(dossier) {
    setCurrentDossierId(dossier.id);
    setForm({
      code: dossier.code || "",
      title: dossier.title || "",
      dossierType: dossier.dossierType || "",
      storageId: dossier.storageId ? String(dossier.storageId) : "",
      status: dossier.status || "DRAFT",
      fromDate: dossier.fromDate ? String(dossier.fromDate).split("T")[0] : "",
      toDate: dossier.toDate ? String(dossier.toDate).split("T")[0] : "",
      description: dossier.description || ""
    });

    setStorageHierarchy(dossier.storageId);

    // Lọc các tài liệu thuộc hồ sơ này
    const docs = allDocuments.filter(doc => Number(doc.dossierId) === Number(dossier.id));
    setAttachedDocuments(docs);

    setActiveTab("FORM");
    setNotice({ type: "info", text: `Đang mở hồ sơ: ${dossier.code} - ${dossier.title}` });
  }

  // Reset form về trạng thái tạo mới
  function handleResetForm() {
    setCurrentDossierId(null);
    setForm({
      code: "",
      title: "",
      dossierType: dossierTypes[0]?.name || "Hồ sơ dự án",
      storageId: "",
      status: "DRAFT",
      fromDate: "",
      toDate: "",
      description: ""
    });
    setSelectedKhoId("");
    setSelectedKeId("");
    setSelectedTangId("");
    setSelectedHopId("");
    setAttachedDocuments([]);
    setNotice(null);
  }

  // Lưu hồ sơ (status: "DRAFT" khi Lưu tạm, "WAITING_APPROVAL" khi Gửi kiểm duyệt)
  async function saveDossierWithStatus(targetStatus) {
    // Validation
    if (!form.code.trim()) {
      setNotice({ type: "error", text: "Vui lòng nhập hoặc tự động sinh Mã hồ sơ." });
      return;
    }
    if (!form.title.trim()) {
      setNotice({ type: "error", text: "Vui lòng nhập Tên hồ sơ (*)." });
      return;
    }
    if (!form.dossierType) {
      setNotice({ type: "error", text: "Vui lòng chọn Loại hồ sơ (*)." });
      return;
    }
    if (!form.storageId) {
      setNotice({ type: "error", text: "Vui lòng chọn vị trí lưu trữ (Kho > Kệ > Tầng > Hộp)." });
      return;
    }

    // Nếu gửi kiểm duyệt: Bắt buộc phải có ít nhất 1 văn bản con đính kèm
    if (targetStatus === "PENDING") {
      if (attachedDocuments.length === 0) {
        setNotice({
          type: "error",
          text: "Hồ sơ chưa có văn bản thành phần nào! Vui lòng đính kèm ít nhất 1 tệp văn bản trước khi Gửi kiểm duyệt."
        });
        return;
      }
    }

    setLoading(true);
    setNotice(null);

    try {
      const payload = {
        code: form.code.trim(),
        title: form.title.trim(),
        dossierType: form.dossierType,
        storageId: Number(form.storageId),
        status: targetStatus,
        fromDate: form.fromDate ? new Date(form.fromDate).toISOString() : null,
        toDate: form.toDate ? new Date(form.toDate).toISOString() : null,
        description: form.description.trim()
      };

      let savedDossierId = currentDossierId;

      if (currentDossierId) {
        // Cập nhật hồ sơ hiện tại
        await uiApi.crud("dossiers").update(currentDossierId, payload);
      } else {
        // Tạo mới hồ sơ
        const created = await uiApi.crud("dossiers").create(payload);
        savedDossierId = created?.id || created;
        setCurrentDossierId(savedDossierId);
      }

      // Xử lý các tài liệu con đang ở trạng thái local (chưa lưu vào DB)
      const localDocs = attachedDocuments.filter(doc => doc.isLocal || String(doc.id).startsWith("temp_"));
      if (localDocs.length > 0 && savedDossierId) {
        for (const doc of localDocs) {
          const docId = await uiApi.crud("documents").create({
            dossierId: Number(savedDossierId),
            code: doc.code,
            title: doc.title,
            fileName: doc.fileName || (doc.file?.name) || "",
            ocrStatus: "PENDING",
            status: targetStatus === "PENDING" ? "PENDING" : "DRAFT",
            description: doc.description || `Cơ quan: ${doc.issuingAuthority || "N/A"} | Ngày: ${doc.issueDate || "N/A"}`
          });

          if (doc.file instanceof File || doc.file instanceof Blob) {
            try {
              await uiApi.crud("documents").upload(docId, doc.file, "easyocr");
            } catch (uErr) {
              console.warn("Upload child doc error:", uErr);
            }
          }
        }
      }

      // Nếu chuyển sang trạng thái PENDING, ghi log workflow transition
      if (targetStatus === "PENDING" && savedDossierId) {
        try {
          await uiApi.gd2.transition({
            entityType: "DOSSIER",
            entityId: Number(savedDossierId),
            action: "SUBMIT",
            comment: "Nhân viên nhập liệu gửi duyệt hồ sơ kèm tài liệu số hóa."
          });
        } catch (wfErr) {
          console.warn("Workflow transition warning:", wfErr);
        }
      }

      const successMsg = targetStatus === "PENDING"
        ? `Đã gửi hồ sơ "${form.code}" lên Lãnh đạo kiểm duyệt thành công! Trạng thái: Chờ duyệt (PENDING).`
        : `Đã lưu tạm nháp hồ sơ "${form.code}" thành công! Trạng thái: Lưu nháp (DRAFT).`;

      setNotice({ type: "success", text: successMsg });

      // Cập nhật lại form status
      setForm(prev => ({ ...prev, status: targetStatus }));

      // Tải lại dữ liệu hệ thống
      await loadData();
    } catch (err) {
      setNotice({ type: "error", text: `Thao tác thất bại: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  // Quick submit to review from the list table
  async function handleQuickSubmitToReview(dossier) {
    const docCount = docCountByDossierId.get(Number(dossier.id)) || 0;
    if (docCount === 0) {
      setNotice({
        type: "error",
        text: `Hồ sơ "${dossier.code}" chưa có văn bản thành phần! Vui lòng vào chỉnh sửa và đính kèm ít nhất 1 văn bản trước khi gửi duyệt.`
      });
      return;
    }

    if (!window.confirm(`Gửi kiểm duyệt hồ sơ "${dossier.code} - ${dossier.title}" lên Lãnh đạo?`)) {
      return;
    }

    try {
      setLoading(true);
      await uiApi.crud("dossiers").update(dossier.id, {
        ...dossier,
        status: "PENDING"
      });
      try {
        await uiApi.gd2.transition({
          entityType: "DOSSIER",
          entityId: Number(dossier.id),
          action: "SUBMIT",
          comment: dossier.status === "NEEDS_SUPPLEMENT" ? "Chuyên viên gửi lại kiểm duyệt sau khi bổ sung." : "Gửi kiểm duyệt hồ sơ từ danh sách."
        });
      } catch {}

      setNotice({ type: "success", text: `Đã gửi duyệt hồ sơ "${dossier.code}" thành công! Trạng thái: Chờ duyệt (PENDING).` });
      await loadData();
    } catch (err) {
      setNotice({ type: "error", text: `Lỗi gửi duyệt: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  // Xóa hồ sơ
  async function handleDeleteDossier(dossier) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ "${dossier.code} - ${dossier.title}"?`)) {
      return;
    }
    try {
      setLoading(true);
      await uiApi.crud("dossiers").remove(dossier.id);
      setNotice({ type: "success", text: `Đã xóa hồ sơ "${dossier.code}" thành công.` });
      if (currentDossierId === dossier.id) {
        handleResetForm();
      }
      await loadData();
    } catch (err) {
      setNotice({ type: "error", text: `Không thể xóa hồ sơ: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  // Lọc danh sách hồ sơ ở Tab 2
  const filteredDossiers = useMemo(() => {
    return dossiers.filter(d => {
      const matchSearch = !searchTerm.trim() ||
        `${d.code} ${d.title} ${d.dossierType || ""}`.toLowerCase().includes(searchTerm.trim().toLowerCase());
      const matchStatus = statusFilter === "ALL" || String(d.status || "").toUpperCase() === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [dossiers, searchTerm, statusFilter]);

  // Danh mục loại hồ sơ mặc định nếu DB chưa có
  const defaultDossierTypes = [
    "Hồ sơ dự án đầu tư",
    "Hồ sơ cán bộ công chức",
    "Hồ sơ tài chính kế toán",
    "Hồ sơ thanh tra kiểm tra",
    "Hồ sơ quản lý đất đai",
    "Hồ sơ văn thư lưu trữ chung"
  ];

  return (
    <div className="dossier-screen-container" style={{ padding: "8px 0" }}>
      {/* Header & Tabs Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid #e2e8f0"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#e0f2fe",
              color: "#0369a1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Archive size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>
              Nhập mới & Quản lý Hồ sơ lưu trữ
            </h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
              Tạo hồ sơ, chọn vị trí Kho - Kệ - Tầng - Hộp, đính kèm văn bản và gửi kiểm duyệt
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className={`btn ${activeTab === "FORM" ? "primary" : ""}`}
            onClick={() => setActiveTab("FORM")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <FolderPlus size={16} />
            <span>{currentDossierId ? "Đang sửa hồ sơ" : "Nhập mới hồ sơ"}</span>
          </button>
          <button
            type="button"
            className={`btn ${activeTab === "LIST" ? "primary" : ""}`}
            onClick={() => setActiveTab("LIST")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <List size={16} />
            <span>Danh sách hồ sơ ({dossiers.length})</span>
          </button>
        </div>
      </div>

      {/* Thông báo Toast */}
      {notice && (
        <div
          className={`alert ${notice.type}`}
          style={{
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            borderRadius: "8px",
            background: notice.type === "success" ? "#ecfdf5" : notice.type === "error" ? "#fef2f2" : "#f0f9ff",
            color: notice.type === "success" ? "#065f46" : notice.type === "error" ? "#991b1b" : "#075985",
            border: `1px solid ${notice.type === "success" ? "#a7f3d0" : notice.type === "error" ? "#fecaca" : "#bae6fd"}`
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {notice.type === "success" && <CheckCircle2 size={18} />}
            {notice.type === "error" && <AlertCircle size={18} />}
            {notice.type === "info" && <Sparkles size={18} />}
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: "4px" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ===================== TAB 1: FORM NHẬP MỚI / CHỈNH SỬA ===================== */}
      {activeTab === "FORM" && (
        <div className="dossier-form-container">
          <div className="panel" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "20px" }}>
            {/* Header Form */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: "16px",
                paddingBottom: "12px",
                borderBottom: "1px solid #f1f5f9"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FolderPlus size={18} color="#0284c7" />
                <strong style={{ fontSize: "15px", color: "#1e293b" }}>
                  {currentDossierId ? `Chỉnh sửa hồ sơ #${currentDossierId}` : "1. Thông tin chung hồ sơ"}
                </strong>
                <span style={{ marginLeft: "8px" }}>
                  <StatusBadge status={form.status || "DRAFT"} />
                </span>
              </div>

              {currentDossierId && (
                <button
                  type="button"
                  className="btn"
                  onClick={handleResetForm}
                  style={{ fontSize: "12px", padding: "4px 10px" }}
                >
                  <RotateCcw size={13} /> Nhập hồ sơ mới
                </button>
              )}
            </div>

            {/* Cảnh báo nếu hồ sơ bị yêu cầu bổ sung hoặc từ chối */}
            {form.status === "NEEDS_SUPPLEMENT" && (
              <div
                style={{
                  width: "100%",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "16px",
                  color: "#92400e",
                  fontSize: "13px"
                }}
              >
                <div style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertCircle size={16} color="#d97706" />
                  Lãnh đạo yêu cầu bổ sung / chỉnh sửa hồ sơ:
                </div>
                <div style={{ marginTop: "4px", paddingLeft: "22px", fontStyle: "italic", color: "#78350f" }}>
                  {form.description || "Vui lòng kiểm tra lại tài liệu và thông tin trước khi gửi lại kiểm duyệt."}
                </div>
              </div>
            )}
            {form.status === "REJECTED" && (
              <div
                style={{
                  width: "100%",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "16px",
                  color: "#991b1b",
                  fontSize: "13px"
                }}
              >
                <div style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertCircle size={16} color="#dc2626" />
                  Hồ sơ đã bị từ chối phê duyệt:
                </div>
                <div style={{ marginTop: "4px", paddingLeft: "22px", fontStyle: "italic", color: "#7f1d1d" }}>
                  {form.description || "Lý do từ chối không được ghi rõ."}
                </div>
              </div>
            )}

            {/* Khối 1: Thông tin cơ bản hồ sơ */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {/* Mã hồ sơ + Nút sinh mã tự động */}
              <div className="field required">
                <span>Mã hồ sơ (*)</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="Vd: HS-2026-001"
                    value={form.code}
                    onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                    disabled={loading}
                    style={{ flex: 1, fontWeight: "600", color: "#0369a1" }}
                  />
                  <button
                    type="button"
                    className="btn"
                    onClick={generateAutoDossierCode}
                    disabled={loading}
                    title="Tự động sinh mã hồ sơ theo năm"
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}
                  >
                    <Sparkles size={14} color="#d97706" />
                    <span>Sinh mã</span>
                  </button>
                </div>
              </div>

              {/* Tên hồ sơ */}
              <div className="field required">
                <span>Tên hồ sơ (*)</span>
                <input
                  type="text"
                  placeholder="Vd: Hồ sơ quy hoạch dự án Khu đô thị mới 2026..."
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  disabled={loading}
                />
              </div>

              {/* Loại hồ sơ */}
              <div className="field required">
                <span>Loại hồ sơ (*)</span>
                <select
                  value={form.dossierType}
                  onChange={e => setForm(prev => ({ ...prev, dossierType: e.target.value }))}
                  disabled={loading}
                >
                  <option value="">-- Chọn loại hồ sơ --</option>
                  {dossierTypes.length > 0 ? (
                    dossierTypes.map(t => (
                      <option key={t.id || t.code} value={t.name || t.code}>
                        {t.code ? `${t.code} - ${t.name}` : t.name} {t.extra1 ? `(${t.extra1})` : ""}
                      </option>
                    ))
                  ) : (
                    defaultDossierTypes.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Khối 2: Vị trí lưu trữ phân cấp 4 tầng: Kho -> Kệ -> Tầng -> Hộp */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "16px",
                marginTop: "16px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Archive size={16} color="#475569" />
                <strong style={{ fontSize: "13px", color: "#334155" }}>
                  Vị trí lưu trữ vật lý (Phân cấp: Kho &gt; Kệ &gt; Tầng &gt; Hộp) (*)
                </strong>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                {/* 1. Kho */}
                <label className="field required">
                  <span>1. Kho lưu trữ</span>
                  <select
                    value={selectedKhoId}
                    onChange={e => handleKhoChange(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">-- Chọn Kho --</option>
                    {khoOptions.map(kho => (
                      <option key={kho.id} value={kho.id}>
                        {kho.name} ({kho.code})
                      </option>
                    ))}
                  </select>
                </label>

                {/* 2. Kệ */}
                <label className="field required">
                  <span>2. Kệ lưu trữ</span>
                  <select
                    value={selectedKeId}
                    onChange={e => handleKeChange(e.target.value)}
                    disabled={loading || !selectedKhoId}
                  >
                    <option value="">
                      {!selectedKhoId ? "Chọn Kho trước" : "-- Chọn Kệ --"}
                    </option>
                    {keOptions.map(ke => (
                      <option key={ke.id} value={ke.id}>
                        {ke.name} ({ke.code})
                      </option>
                    ))}
                  </select>
                </label>

                {/* 3. Tầng */}
                <label className="field required">
                  <span>3. Tầng lưu trữ</span>
                  <select
                    value={selectedTangId}
                    onChange={e => handleTangChange(e.target.value)}
                    disabled={loading || !selectedKeId}
                  >
                    <option value="">
                      {!selectedKeId ? "Chọn Kệ trước" : "-- Chọn Tầng --"}
                    </option>
                    {tangOptions.map(tang => (
                      <option key={tang.id} value={tang.id}>
                        {tang.name} ({tang.code})
                      </option>
                    ))}
                  </select>
                </label>

                {/* 4. Hộp */}
                <label className="field required">
                  <span>4. Hộp hồ sơ</span>
                  <select
                    value={selectedHopId}
                    onChange={e => handleHopChange(e.target.value)}
                    disabled={loading || !selectedTangId}
                  >
                    <option value="">
                      {!selectedTangId ? "Chọn Tầng trước" : "-- Chọn Hộp --"}
                    </option>
                    {hopOptions.map(hop => (
                      <option key={hop.id} value={hop.id}>
                        {hop.name} ({hop.code})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Breadcrumb vị trí đã chọn */}
              {form.storageId && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "6px 12px",
                    background: "#e0f2fe",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#0369a1",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Box size={14} />
                  <span>
                    <strong>Vị trí đã chọn:</strong> {getLocationPath(form.storageId)}
                  </span>
                </div>
              )}
            </div>

            {/* Khối 3: Thời gian và mô tả */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
              <div className="field">
                <span>Thời gian hồ sơ: Từ ngày</span>
                <input
                  type="date"
                  value={form.fromDate}
                  onChange={e => setForm(prev => ({ ...prev, fromDate: e.target.value }))}
                  disabled={loading}
                />
              </div>

              <div className="field">
                <span>Đến ngày</span>
                <input
                  type="date"
                  value={form.toDate}
                  onChange={e => setForm(prev => ({ ...prev, toDate: e.target.value }))}
                  disabled={loading}
                />
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Mô tả / Ghi chú hồ sơ</span>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm thông tin quản lý, tình trạng hồ sơ..."
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Khối 4: Thành phần hồ sơ (Văn bản con) - nhúng DocumentPanel */}
            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <FileText size={18} color="#0284c7" />
                <strong style={{ fontSize: "15px", color: "#1e293b" }}>
                  2. Thành phần hồ sơ (Văn bản con)
                </strong>
              </div>
              <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#64748b" }}>
                Tải lên các văn bản thành phần (Quyết định, Tờ trình, Hợp đồng...) kèm tệp PDF/hình ảnh để đính kèm vào hồ sơ này.
              </p>

              <DocumentPanel
                dossierId={currentDossierId}
                documents={attachedDocuments}
                onDocumentsChange={setAttachedDocuments}
                readonly={loading}
              />
            </div>

            {/* Khối 5: Các nút hành động chính */}
            <div
              style={{
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px"
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={handleResetForm}
                disabled={loading}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <RotateCcw size={15} />
                <span>Nhập lại</span>
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                {/* Nút [Lưu tạm] */}
                <button
                  type="button"
                  className="btn"
                  onClick={() => saveDossierWithStatus("DRAFT")}
                  disabled={loading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#f1f5f9",
                    color: "#334155",
                    borderColor: "#cbd5e1"
                  }}
                >
                  <Save size={16} />
                  <span>{loading ? "Đang lưu..." : "Lưu tạm (DRAFT)"}</span>
                </button>

                {/* Nút [Gửi kiểm duyệt] */}
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => saveDossierWithStatus("PENDING")}
                  disabled={loading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#0284c7",
                    color: "#ffffff"
                  }}
                >
                  <Send size={16} />
                  <span>
                    {loading
                      ? "Đang xử lý..."
                      : form.status === "NEEDS_SUPPLEMENT"
                      ? "Gửi lại kiểm duyệt"
                      : "Gửi kiểm duyệt"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: DANH SÁCH HỒ SƠ ===================== */}
      {activeTab === "LIST" && (
        <div className="dossier-list-container">
          {/* Bộ lọc và Tìm kiếm */}
          <div
            className="panel"
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "16px",
              marginBottom: "16px"
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: "10px", top: "10px", color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo mã, tên hồ sơ, loại hồ sơ..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: "32px", width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Filter size={16} color="#64748b" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{ width: "180px" }}
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="DRAFT">Lưu nháp (DRAFT)</option>
                  <option value="WAITING_APPROVAL">Chờ duyệt (WAITING_APPROVAL)</option>
                  <option value="APPROVED">Đã duyệt (APPROVED)</option>
                  <option value="REJECTED">Từ chối (REJECTED)</option>
                  <option value="NEEDS_SUPPLEMENT">Cần bổ sung (NEEDS_SUPPLEMENT)</option>
                </select>
              </div>

              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  handleResetForm();
                  setActiveTab("FORM");
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <FolderPlus size={16} />
                <span>Nhập hồ sơ mới</span>
              </button>
            </div>
          </div>

          {/* Bảng hồ sơ */}
          <div className="table-wrap" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
            <table>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ width: "130px" }}>Mã hồ sơ</th>
                  <th>Tên hồ sơ</th>
                  <th style={{ width: "160px" }}>Loại hồ sơ</th>
                  <th style={{ width: "240px" }}>Vị trí lưu trữ</th>
                  <th style={{ width: "90px", textAlign: "center" }}>Văn bản con</th>
                  <th style={{ width: "130px", textAlign: "center" }}>Trạng thái</th>
                  <th style={{ width: "140px", textAlign: "center" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredDossiers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px 12px", color: "#64748b" }}>
                      Không tìm thấy hồ sơ nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredDossiers.map(dossier => {
                    const docCount = docCountByDossierId.get(Number(dossier.id)) || 0;
                    const canSubmit = ["DRAFT", "NEEDS_SUPPLEMENT"].includes(String(dossier.status || "DRAFT").toUpperCase());
                    const isDraft = String(dossier.status || "DRAFT").toUpperCase() === "DRAFT";

                    return (
                      <tr key={dossier.id}>
                        <td>
                          <span style={{ fontWeight: "700", color: "#0284c7" }}>{dossier.code}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: "600", color: "#0f172a" }}>{dossier.title}</div>
                          {dossier.description && (
                            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                              {dossier.description}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: "12px", color: "#334155" }}>{dossier.dossierType || "--"}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: "12px", color: "#475569" }} title={getLocationPath(dossier.storageId)}>
                            {getLocationPath(dossier.storageId)}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "10px",
                              fontSize: "12px",
                              fontWeight: "600",
                              background: docCount > 0 ? "#e0f2fe" : "#fef2f2",
                              color: docCount > 0 ? "#0369a1" : "#b91c1c"
                            }}
                          >
                            {docCount} tệp
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <StatusBadge status={dossier.status || "DRAFT"} />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => handleEditDossier(dossier)}
                              title="Xem & Chỉnh sửa hồ sơ"
                              style={{ padding: "4px 8px", fontSize: "12px", color: "#0284c7" }}
                            >
                              <Edit size={14} />
                              <span style={{ marginLeft: "4px" }}>Sửa</span>
                            </button>

                            {canSubmit && (
                              <button
                                type="button"
                                className="btn"
                                onClick={() => handleQuickSubmitToReview(dossier)}
                                title={dossier.status === "NEEDS_SUPPLEMENT" ? "Gửi lại kiểm duyệt" : "Gửi kiểm duyệt ngay"}
                                style={{ padding: "4px 8px", fontSize: "12px", color: "#059669", background: "#ecfdf5" }}
                              >
                                <Send size={14} />
                                <span style={{ marginLeft: "4px" }}>
                                  {dossier.status === "NEEDS_SUPPLEMENT" ? "Gửi lại" : "Gửi duyệt"}
                                </span>
                              </button>
                            )}

                            {isDraft && (
                              <button
                                type="button"
                                className="icon-btn danger"
                                onClick={() => handleDeleteDossier(dossier)}
                                title="Xóa hồ sơ"
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
      )}
    </div>
  );
}
