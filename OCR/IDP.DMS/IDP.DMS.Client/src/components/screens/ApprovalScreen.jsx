import { useState, useEffect, useMemo, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  AlertCircle,
  Search,
  Clock,
  Archive,
  PenTool,
  Download,
  X,
  Box,
  Filter,
  MessageSquare,
  Sparkles,
  File
} from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { StatusBadge } from "../shared/SharedComponents";
import { formatFileSize, getFileExtension } from "./DocumentPanel";

export default function ApprovalScreen({ title }) {
  const [dossiers, setDossiers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [storageRows, setStorageRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("WAITING_APPROVAL"); // Mặc định chỉ hiển thị hồ sơ chờ duyệt

  // Selected Dossier for Preview Modal
  const [selectedDossier, setSelectedDossier] = useState(null);

  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectDossier, setRejectDossier] = useState(null);
  const [rejectAction, setRejectAction] = useState("REJECT"); // "REJECT" | "REQUEST_SUPPLEMENT"
  const [rejectReason, setRejectReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // PDF / Image Quick Preview Modal
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  const storageById = useMemo(
    () => new Map(storageRows.map(r => [Number(r.id), r])),
    [storageRows]
  );

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

  // Documents count per dossier
  const docsByDossierId = useMemo(() => {
    const map = new Map();
    documents.forEach(doc => {
      const dId = Number(doc.dossierId);
      if (!map.has(dId)) map.set(dId, []);
      map.get(dId).push(doc);
    });
    return map;
  }, [documents]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dossierRes, docRes, storageRes] = await Promise.all([
        uiApi.crud("dossiers").list().catch(() => []),
        uiApi.crud("documents").list().catch(() => []),
        uiApi.crud("storage").list().catch(() => [])
      ]);

      const dList = Array.isArray(dossierRes) ? dossierRes : (dossierRes?.items || []);
      const docList = Array.isArray(docRes) ? docRes : (docRes?.items || []);
      const sList = Array.isArray(storageRes) ? storageRes : (storageRes?.items || []);

      setDossiers([...dList].sort((a, b) => Number(b.id) - Number(a.id)));
      setDocuments(docList);
      setStorageRows(sList);
    } catch (err) {
      setError(`Không thể tải dữ liệu duyệt: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Hành động [✓ Phê duyệt xuất bản]
  async function handleApprovePublish(dossier) {
    if (!window.confirm(`Xác nhận PHÊ DUYỆT VÀ XUẤT BẢN hồ sơ "${dossier.code} - ${dossier.title}"?`)) {
      return;
    }

    setSubmittingAction(true);
    setNotice(null);
    try {
      // 1. Cập nhật trạng thái hồ sơ sang PUBLISHED trong DB
      await uiApi.crud("dossiers").update(dossier.id, {
        ...dossier,
        status: "PUBLISHED"
      });

      // 2. Ghi nhận luồng workflow transition
      try {
        await uiApi.gd2.transition({
          entityType: "DOSSIER",
          entityId: Number(dossier.id),
          action: "PUBLISH",
          actor: "lanhdao",
          comment: "Lãnh đạo phê duyệt và xuất bản hồ sơ lên hệ thống tra cứu.",
          recipient: dossier.code
        });
      } catch (wfErr) {
        console.warn("Workflow log warning:", wfErr);
      }

      setNotice({
        type: "success",
        text: `Đã phê duyệt xuất bản hồ sơ "${dossier.code}" thành công! Trạng thái: Đã xuất bản (PUBLISHED).`
      });

      if (selectedDossier?.id === dossier.id) {
        setSelectedDossier(null);
      }

      await loadData();
    } catch (err) {
      setNotice({ type: "error", text: `Lỗi phê duyệt xuất bản: ${err.message}` });
    } finally {
      setSubmittingAction(false);
    }
  }

  // Mở modal Từ chối / Báo lỗi
  function openRejectModal(dossier) {
    setRejectDossier(dossier);
    setRejectAction("REJECT");
    setRejectReason("");
    setRejectModalOpen(true);
  }

  // Xác nhận từ chối / yêu cầu bổ sung
  async function handleConfirmReject() {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối hoặc nội dung yêu cầu bổ sung.");
      return;
    }

    const dossier = rejectDossier;
    if (!dossier) return;

    setSubmittingAction(true);
    const targetStatus = rejectAction === "REQUEST_SUPPLEMENT" ? "NEEDS_SUPPLEMENT" : "REJECTED";

    try {
      // 1. Cập nhật trạng thái hồ sơ
      await uiApi.crud("dossiers").update(dossier.id, {
        ...dossier,
        status: targetStatus,
        description: `${dossier.description || ""}\n[Phản hồi lãnh đạo]: ${rejectReason.trim()}`.trim()
      });

      // 2. Ghi nhận luồng workflow transition
      try {
        await uiApi.gd2.transition({
          entityType: "DOSSIER",
          entityId: Number(dossier.id),
          action: rejectAction === "REQUEST_SUPPLEMENT" ? "REQUEST_SUPPLEMENT" : "REJECT",
          actor: "lanhdao",
          comment: rejectReason.trim(),
          recipient: dossier.code
        });
      } catch (wfErr) {
        console.warn("Workflow log warning:", wfErr);
      }

      setNotice({
        type: "info",
        text: `Đã phản hồi hồ sơ "${dossier.code}". Trạng thái: ${targetStatus === "NEEDS_SUPPLEMENT" ? "Cần bổ sung" : "Từ chối"}.`
      });

      setRejectModalOpen(false);
      setRejectDossier(null);
      if (selectedDossier?.id === dossier.id) {
        setSelectedDossier(null);
      }

      await loadData();
    } catch (err) {
      alert(`Lỗi thực hiện: ${err.message}`);
    } finally {
      setSubmittingAction(false);
    }
  }

  // Mở xem nhanh file tài liệu con
  async function openDocPreview(doc) {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewError(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    try {
      const blob = await uiApi.gd2.documentPdfBlob(doc.id, "digitized").catch(async () => {
        return await uiApi.gd2.documentPdfBlob(doc.id, "original");
      });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      setPreviewError(`Không thể tải tệp xem trước: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  }

  function closeDocPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewDoc(null);
    setPreviewError(null);
  }

  // Danh sách hồ sơ sau khi lọc
  const filteredRows = useMemo(() => {
    return dossiers.filter(d => {
      const matchSearch = !searchTerm.trim() ||
        `${d.code} ${d.title} ${d.dossierType || ""}`.toLowerCase().includes(searchTerm.trim().toLowerCase());
      const matchStatus = filterStatus === "ALL" || String(d.status || "").toUpperCase() === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [dossiers, searchTerm, filterStatus]);

  return (
    <div className="approval-screen-container" style={{ padding: "8px 0" }}>
      {/* Header */}
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
              background: "#fef3c7",
              color: "#b45309",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>
              {title || "Phê duyệt & Xuất bản hồ sơ lưu trữ"}
            </h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
              Màn hình Lãnh đạo / Kiểm duyệt kiểm tra nội dung, tài liệu đính kèm và phê duyệt xuất bản
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn"
          onClick={loadData}
          disabled={loading}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <span>{loading ? "Đang tải..." : "Làm mới danh sách"}</span>
        </button>
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
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#991b1b",
            fontSize: "13px"
          }}
        >
          {error}
        </div>
      )}

      {/* Thanh tìm kiếm & Bộ lọc trạng thái */}
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
          <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "10px", top: "10px", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã hồ sơ, tên hồ sơ, loại hồ sơ..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: "32px", width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Filter size={16} color="#64748b" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ width: "220px", fontWeight: "600" }}
            >
              <option value="WAITING_APPROVAL">⏳ Chờ duyệt (WAITING_APPROVAL)</option>
              <option value="PENDING">⏳ Chờ duyệt (PENDING)</option>
              <option value="PUBLISHED">✓ Đã xuất bản (PUBLISHED)</option>
              <option value="APPROVED">✓ Đã duyệt (APPROVED)</option>
              <option value="REJECTED">✕ Từ chối (REJECTED)</option>
              <option value="NEEDS_SUPPLEMENT">⚠ Cần bổ sung (NEEDS_SUPPLEMENT)</option>
              <option value="ALL">📋 Tất cả trạng thái</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bảng danh sách hồ sơ */}
      <div className="table-wrap" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
        <table>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ width: "130px" }}>Mã hồ sơ</th>
              <th>Tên hồ sơ</th>
              <th style={{ width: "160px" }}>Loại hồ sơ</th>
              <th style={{ width: "240px" }}>Vị trí lưu trữ</th>
              <th style={{ width: "95px", textAlign: "center" }}>Văn bản con</th>
              <th style={{ width: "130px", textAlign: "center" }}>Trạng thái</th>
              <th style={{ width: "220px", textAlign: "center" }}>Hành động kiểm duyệt</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px 12px", color: "#64748b" }}>
                  {filterStatus === "WAITING_APPROVAL"
                    ? "Hiện không có hồ sơ nào đang chờ duyệt."
                    : "Không tìm thấy hồ sơ nào phù hợp với bộ lọc."}
                </td>
              </tr>
            ) : (
              filteredRows.map(row => {
                const childDocs = docsByDossierId.get(Number(row.id)) || [];
                const docCount = childDocs.length;
                const canReview = ["WAITING_APPROVAL", "PENDING"].includes(String(row.status || "").toUpperCase());

                return (
                  <tr
                    key={row.id}
                    style={{
                      background: selectedDossier?.id === row.id ? "#f0f9ff" : "inherit",
                      cursor: "pointer"
                    }}
                    onClick={() => setSelectedDossier(row)}
                  >
                    <td>
                      <strong style={{ color: "#0284c7" }}>{row.code}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: "600", color: "#0f172a" }}>{row.title}</div>
                      {row.description && (
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                          {row.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: "#334155" }}>{row.dossierType || "--"}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: "#475569" }} title={getLocationPath(row.storageId)}>
                        {getLocationPath(row.storageId)}
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
                      <StatusBadge status={row.status || "DRAFT"} />
                    </td>
                    <td style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                        {/* Nút Xem chi tiết */}
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setSelectedDossier(row)}
                          title="Xem chi tiết nội dung & văn bản"
                          style={{ padding: "4px 8px", fontSize: "12px", color: "#0284c7" }}
                        >
                          <Eye size={13} />
                          <span style={{ marginLeft: "4px" }}>Xem</span>
                        </button>

                        {/* Nút Phê duyệt xuất bản */}
                        {canReview && (
                          <button
                            type="button"
                            className="btn primary"
                            onClick={() => handleApprovePublish(row)}
                            disabled={submittingAction}
                            title="Phê duyệt và xuất bản hồ sơ lên hệ thống"
                            style={{
                              padding: "4px 10px",
                              fontSize: "12px",
                              background: "#059669",
                              borderColor: "#059669",
                              color: "#ffffff",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <CheckCircle2 size={13} />
                            <span>Duyệt xuất bản</span>
                          </button>
                        )}

                        {/* Nút Từ chối / Báo lỗi */}
                        {canReview && (
                          <button
                            type="button"
                            className="btn"
                            onClick={() => openRejectModal(row)}
                            disabled={submittingAction}
                            title="Từ chối hoặc yêu cầu bổ sung"
                            style={{
                              padding: "4px 8px",
                              fontSize: "12px",
                              color: "#dc2626",
                              background: "#fef2f2",
                              borderColor: "#fecaca"
                            }}
                          >
                            <XCircle size={13} />
                            <span style={{ marginLeft: "4px" }}>Từ chối</span>
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

      {/* Modal Chi tiết Hồ sơ & Văn bản con đính kèm */}
      {selectedDossier && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9990,
            padding: "20px"
          }}
          onClick={() => setSelectedDossier(null)}
        >
          <div
            className="modal-content"
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
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Archive size={20} color="#0284c7" />
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#0f172a" }}>
                    Chi tiết hồ sơ: <span style={{ color: "#0284c7" }}>{selectedDossier.code}</span>
                  </h3>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {selectedDossier.title}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <StatusBadge status={selectedDossier.status} />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setSelectedDossier(null)}
                  style={{ padding: "6px" }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
              {/* Thông tin hồ sơ */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px",
                  background: "#f8fafc",
                  padding: "16px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "20px",
                  fontSize: "13px"
                }}
              >
                <div><strong>Mã hồ sơ:</strong> {selectedDossier.code}</div>
                <div><strong>Loại hồ sơ:</strong> {selectedDossier.dossierType || "--"}</div>
                <div><strong>Vị trí lưu trữ:</strong> {getLocationPath(selectedDossier.storageId)}</div>
                <div>
                  <strong>Thời hạn:</strong>{" "}
                  {selectedDossier.fromDate ? String(selectedDossier.fromDate).split("T")[0] : "--"}{" "}
                  đến {selectedDossier.toDate ? String(selectedDossier.toDate).split("T")[0] : "--"}
                </div>
                {selectedDossier.description && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <strong>Ghi chú / Mô tả:</strong> {selectedDossier.description}
                  </div>
                )}
              </div>

              {/* Danh sách văn bản con thành phần */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <FileText size={18} color="#0284c7" />
                  <h4 style={{ margin: 0, fontSize: "14px", color: "#1e293b" }}>
                    Văn bản thành phần đính kèm ({(docsByDossierId.get(Number(selectedDossier.id)) || []).length} văn bản)
                  </h4>
                </div>

                <div className="table-wrap" style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                  <table>
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        <th style={{ width: "40px", textAlign: "center" }}>STT</th>
                        <th style={{ width: "150px" }}>Số ký hiệu</th>
                        <th>Trích yếu nội dung</th>
                        <th style={{ width: "160px" }}>Tệp & Dung lượng</th>
                        <th style={{ width: "100px", textAlign: "center" }}>OCR</th>
                        <th style={{ width: "100px", textAlign: "center" }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(docsByDossierId.get(Number(selectedDossier.id)) || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                            Hồ sơ này chưa có văn bản thành phần nào đính kèm.
                          </td>
                        </tr>
                      ) : (
                        (docsByDossierId.get(Number(selectedDossier.id)) || []).map((doc, idx) => {
                          const ext = getFileExtension(doc.fileName);
                          const isPdf = ext === "pdf";

                          return (
                            <tr key={doc.id}>
                              <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                              <td><strong style={{ color: "#0369a1" }}>{doc.code}</strong></td>
                              <td>{doc.title}</td>
                              <td>
                                {doc.fileName ? (
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span
                                      style={{
                                        background: isPdf ? "#fee2e2" : "#e0f2fe",
                                        color: isPdf ? "#b91c1c" : "#0369a1",
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                        fontSize: "10px",
                                        fontWeight: "700"
                                      }}
                                    >
                                      {isPdf ? "PDF" : ext.toUpperCase() || "DOC"}
                                    </span>
                                    <span style={{ fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100px" }} title={doc.fileName}>
                                      {doc.fileName}
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>Chưa có file</span>
                                )}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    background: doc.ocrStatus === "DONE" ? "#ecfdf5" : "#f1f5f9",
                                    color: doc.ocrStatus === "DONE" ? "#047857" : "#475569"
                                  }}
                                >
                                  {doc.ocrStatus === "DONE" ? "Đã OCR" : doc.ocrStatus || "Chờ"}
                                </span>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                {doc.fileName && (
                                  <button
                                    type="button"
                                    className="btn"
                                    onClick={() => openDocPreview(doc)}
                                    title="Xem trực tuyến văn bản này"
                                    style={{ padding: "4px 8px", fontSize: "12px", color: "#0284c7" }}
                                  >
                                    <Eye size={13} />
                                    <span style={{ marginLeft: "4px" }}>Xem file</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer Hành động kiểm duyệt */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 20px",
                borderTop: "1px solid #e2e8f0",
                background: "#f8fafc"
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() => setSelectedDossier(null)}
              >
                Đóng
              </button>

              {["WAITING_APPROVAL", "PENDING"].includes(String(selectedDossier.status || "").toUpperCase()) && (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => openRejectModal(selectedDossier)}
                    disabled={submittingAction}
                    style={{
                      background: "#fef2f2",
                      color: "#dc2626",
                      borderColor: "#fecaca",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <XCircle size={16} />
                    <span>Từ chối / Báo lỗi</span>
                  </button>

                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => handleApprovePublish(selectedDossier)}
                    disabled={submittingAction}
                    style={{
                      background: "#059669",
                      borderColor: "#059669",
                      color: "#ffffff",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{submittingAction ? "Đang xử lý..." : "✓ Phê duyệt xuất bản"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Bắt buộc nhập lý do từ chối / Báo lỗi */}
      {rejectModalOpen && rejectDossier && (
        <div
          className="modal-overlay"
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
            zIndex: 9995,
            padding: "20px"
          }}
          onClick={() => setRejectModalOpen(false)}
        >
          <div
            className="modal-content"
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid #fee2e2",
                background: "#fef2f2"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#dc2626" }}>
                <AlertCircle size={20} />
                <h3 style={{ margin: 0, fontSize: "16px" }}>Từ chối / Yêu cầu bổ sung hồ sơ</h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setRejectModalOpen(false)}
                style={{ padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              <p style={{ margin: "0 0 14px 0", fontSize: "13px", color: "#475569" }}>
                Hồ sơ: <strong>{rejectDossier.code} - {rejectDossier.title}</strong>
              </p>

              <div className="field" style={{ marginBottom: "14px" }}>
                <span>Hình thức phản hồi (*)</span>
                <div style={{ display: "flex", gap: "16px", marginTop: "6px" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="rejectAction"
                      value="REJECT"
                      checked={rejectAction === "REJECT"}
                      onChange={() => setRejectAction("REJECT")}
                    />
                    <span style={{ fontSize: "13px", color: "#dc2626", fontWeight: "600" }}>Từ chối hồ sơ (REJECTED)</span>
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="rejectAction"
                      value="REQUEST_SUPPLEMENT"
                      checked={rejectAction === "REQUEST_SUPPLEMENT"}
                      onChange={() => setRejectAction("REQUEST_SUPPLEMENT")}
                    />
                    <span style={{ fontSize: "13px", color: "#d97706", fontWeight: "600" }}>Yêu cầu bổ sung (NEEDS_SUPPLEMENT)</span>
                  </label>
                </div>
              </div>

              <label className="field required">
                <span>Lý do từ chối / Nội dung yêu cầu bổ sung (*)</span>
                <textarea
                  rows={4}
                  placeholder="Ghi rõ các thiếu sót, văn bản cần bổ sung hoặc lý do không phê duyệt..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  style={{ width: "100%", marginTop: "4px" }}
                  autoFocus
                />
              </label>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                padding: "14px 20px",
                borderTop: "1px solid #e2e8f0",
                background: "#f8fafc"
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() => setRejectModalOpen(false)}
                disabled={submittingAction}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmReject}
                disabled={submittingAction}
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  borderColor: "#dc2626",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <XCircle size={15} />
                <span>{submittingAction ? "Đang gửi..." : "Xác nhận gửi phản hồi"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem nhanh tệp PDF / Ảnh */}
      {previewDoc && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
          onClick={closeDocPreview}
        >
          <div
            className="modal-content"
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "960px",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
              overflow: "hidden"
            }}
            onClick={e => e.stopPropagation()}
          >
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
                <Eye size={18} color="#0284c7" />
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", color: "#0f172a" }}>
                    {previewDoc.code} - {previewDoc.title}
                  </h4>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    Tệp đính kèm: {previewDoc.fileName}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {previewUrl && (
                  <a
                    href={previewUrl}
                    download={previewDoc.fileName || "tai-lieu"}
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
                  onClick={closeDocPreview}
                  style={{ padding: "6px" }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: "16px", minHeight: "450px", background: "#f8fafc" }}>
              {previewLoading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "400px", color: "#64748b" }}>
                  <div className="spinner" style={{ marginBottom: "12px" }}></div>
                  <span>Đang tải xem trước văn bản...</span>
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
                  {getFileExtension(previewDoc.fileName) === "pdf" ? (
                    <iframe
                      src={previewUrl}
                      title="Bản xem trước PDF"
                      style={{ width: "100%", height: "600px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff" }}
                    />
                  ) : ["jpg", "jpeg", "png", "bmp", "webp"].includes(getFileExtension(previewDoc.fileName)) ? (
                    <div style={{ textAlign: "center", padding: "10px" }}>
                      <img
                        src={previewUrl}
                        alt={previewDoc.title}
                        style={{ maxWidth: "100%", maxHeight: "580px", objectFit: "contain", borderRadius: "6px" }}
                      />
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px", color: "#475569" }}>
                      <File size={48} color="#94a3b8" style={{ marginBottom: "12px" }} />
                      <p>Định dạng tệp này không hỗ trợ xem trực tiếp.</p>
                      <a href={previewUrl} download={previewDoc.fileName} className="btn primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
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
