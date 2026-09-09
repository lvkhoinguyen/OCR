import { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  FileSearch,
  FileText,
  GitMerge,
  History,
  Plus,
  RefreshCw,
  Save,
  User,
  X,
  AlertCircle,
  Archive
} from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { StatusBadge, Metric, GD2FeatureLayout } from "../shared/SharedComponents";

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
    DRAFT: "Bản nháp",
    PENDING: "Chờ kiểm duyệt",
    NEEDS_SUPPLEMENT: "Cần bổ sung",
    APPROVED: "Đã phê duyệt",
    PUBLISHED: "Đã xuất bản",
    CONFIRMED: "Đã xác nhận",
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

export function GD22WorkflowScreen({ handoff }) {
  const [activeTab, setActiveTab] = useState("screen");
  const [rows, setRows] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [statusFilter, setStatusFilter] = useState("PENDING"); // 1. Mặc định chỉ lọc các hồ sơ "Chờ kiểm duyệt"
  const [definition, setDefinition] = useState({ steps: [] });
  const [runtime, setRuntime] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [actor, setActor] = useState("current-user");
  const [recipient, setRecipient] = useState("LANH_DAO_DON_VI");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewerZoom, setViewerZoom] = useState(1);
  const [viewerRotation, setViewerRotation] = useState(0);
  const [reviewForm, setReviewForm] = useState({ documentNumber: "", issueDate: "", summary: "", fullText: "" });

  // Modal nhập lý do yêu cầu bổ sung hoặc từ chối
  const [actionModal, setActionModal] = useState(null);
  const [actionReason, setActionReason] = useState("");

  useEffect(() => {
    loadWorkflowItems();
  }, []);

  const dossierMap = useMemo(
    () => new Map((Array.isArray(dossiers) ? dossiers : []).map(item => [Number(item.id), item])),
    [dossiers]
  );

  // Lọc danh sách hồ sơ theo tab trạng thái đang chọn (Mặc định PENDING)
  const filteredRows = useMemo(() => {
    return rows.filter(item => {
      const st = String(item.status || "DRAFT").toUpperCase();
      if (statusFilter === "PENDING") return st === "PENDING";
      if (statusFilter === "NEEDS_SUPPLEMENT") return st === "NEEDS_SUPPLEMENT";
      if (statusFilter === "APPROVED") return ["APPROVED", "PUBLISHED", "CONFIRMED"].includes(st);
      if (statusFilter === "ALL") return true;
      return true;
    });
  }, [rows, statusFilter]);

  const selected = useMemo(() => {
    return filteredRows.find(row => String(row.id) === String(selectedId))
      || filteredRows[0]
      || rows.find(row => String(row.id) === String(selectedId))
      || rows[0]
      || null;
  }, [filteredRows, rows, selectedId]);

  const selectedDossier = useMemo(() => {
    return dossierMap.get(Number(selected?.dossierId)) || null;
  }, [dossierMap, selected]);

  useEffect(() => {
    if (selected) {
      loadWorkflowRuntime(selected);
    }
  }, [selected]);

  useEffect(() => {
    if (!selected) {
      setReviewForm({ documentNumber: "", issueDate: "", summary: "", fullText: "" });
      return;
    }
    const parsed = parseReviewedOcrContent(selected.description);
    setReviewForm({
      documentNumber: parsed.documentNumber || selected.code || "",
      issueDate: parsed.issueDate || "",
      summary: parsed.summary || selected.title || "",
      fullText: parsed.fullText || ""
    });
    setViewerZoom(1);
    setViewerRotation(0);
  }, [selected?.id, selected?.description]);

  async function loadWorkflowItems() {
    try {
      setLoading(true);
      const [items, dossierList, flowDefinition] = await Promise.all([
        uiApi.crud("documents").list(),
        uiApi.crud("dossiers").list(),
        uiApi.gd2.workflowDefinition(),
      ]);
      const validDossiers = Array.isArray(dossierList) ? dossierList : [];
      const validItems = Array.isArray(items) ? items : [];
      const dMap = new Map(validDossiers.map(d => [Number(d.id), d]));

      // Nhận diện tài liệu hoặc hồ sơ nằm trong luồng duyệt
      const queue = validItems.filter(item => {
        const itemSt = String(item.status || "DRAFT").toUpperCase();
        const parentDossier = dMap.get(Number(item.dossierId));
        const parentSt = String(parentDossier?.status || "DRAFT").toUpperCase();
        return ["PENDING", "NEEDS_SUPPLEMENT", "REJECTED", "APPROVED", "PUBLISHED"].includes(itemSt)
          || ["PENDING", "NEEDS_SUPPLEMENT"].includes(parentSt);
      });

      // Sắp xếp các văn bản: ưu tiên Chờ duyệt (PENDING) lên đầu, mới nhất lên trước
      queue.sort((a, b) => {
        const aPending = String(a.status).toUpperCase() === "PENDING" ? 0 : 1;
        const bPending = String(b.status).toUpperCase() === "PENDING" ? 0 : 1;
        if (aPending !== bPending) return aPending - bPending;
        return Number(b.id) - Number(a.id);
      });

      setRows(queue);
      setDossiers(validDossiers);
      setDefinition(flowDefinition || { steps: [] });
      const requestedId = Number(handoff?.focusDocumentId || 0);
      const firstPendingId = queue.find(item => String(item.status).toUpperCase() === "PENDING")?.id;
      const nextId = queue.some(item => Number(item.id) === requestedId)
        ? requestedId
        : (queue.some(item => Number(item.id) === Number(selectedId)) ? selectedId : firstPendingId || queue[0]?.id || null);
      setSelectedId(nextId);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được danh sách quy trình: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkflowRuntime(selectedItemOrId) {
    try {
      let entityType = "DOCUMENT";
      let entityId = null;

      if (typeof selectedItemOrId === "object" && selectedItemOrId !== null) {
        entityType = selectedItemOrId.isDossierOnly ? "DOSSIER" : "DOCUMENT";
        entityId = selectedItemOrId.isDossierOnly ? Number(selectedItemOrId.dossierId) : Number(selectedItemOrId.id);
      } else if (typeof selectedItemOrId === "string" && selectedItemOrId.startsWith("dossier_")) {
        entityType = "DOSSIER";
        entityId = Number(selectedItemOrId.replace("dossier_", ""));
      } else if (selectedItemOrId && !isNaN(Number(selectedItemOrId))) {
        entityType = "DOCUMENT";
        entityId = Number(selectedItemOrId);
      }

      if (!entityId || isNaN(entityId)) {
        setRuntime(null);
        return;
      }

      const status = await uiApi.gd2.workflowStatus(entityType, entityId);
      setRuntime(status);
    } catch (error) {
      console.warn("loadWorkflowRuntime warning:", error);
      setRuntime(null);
    }
  }

  function findNextPendingDocument(currentRows, currentId) {
    const currentIndex = currentRows.findIndex(row => Number(row.id) === Number(currentId));
    const isPending = row =>
      Number(row.id) !== Number(currentId) && String(row.status || "").toUpperCase() === "PENDING";
    if (currentIndex < 0) return currentRows.find(isPending) || null;

    return currentRows.slice(currentIndex + 1).find(isPending)
      || currentRows.slice(0, currentIndex).find(isPending)
      || null;
  }

  async function processWorkflow(action, target = selected, reasonText = "") {
    if (!target) {
      setNotice({ type: "error", text: "Vui lòng chọn một hồ sơ hoặc tài liệu để xử lý." });
      return;
    }

    const isDossier = !!target.isDossierOnly;
    const entityType = isDossier ? "DOSSIER" : "DOCUMENT";
    const entityId = isDossier ? Number(target.dossierId) : Number(target.id);

    const actionText = {
      SUBMIT: "Gửi duyệt",
      APPROVE: "Phê duyệt",
      REQUEST_SUPPLEMENT: "Yêu cầu bổ sung",
      RESUBMIT: "Gửi lại",
      SIGN: "Ký số",
      CONFIRM: "Xác nhận",
      REJECT: "Từ chối",
    }[action] || action;

    const commentContent = (reasonText || note).trim() || (action === "APPROVE" ? "Phê duyệt hồ sơ đạt yêu cầu." : `${actionText} hồ sơ/tài liệu ${target.code}`);

    try {
      setLoading(true);
      if (["REQUEST_SUPPLEMENT", "REJECT"].includes(action) && !commentContent.trim()) {
        setNotice({ type: "error", text: `Vui lòng nhập lý do ${action === "REJECT" ? "từ chối" : "yêu cầu bổ sung"}.` });
        return;
      }

      if (isDossier) {
        let result = await uiApi.gd2.transition({
          entityType: "DOSSIER",
          entityId,
          action,
          actor: actor.trim() || "current-user",
          unitCode: "DEFAULT",
          comment: commentContent,
          recipient: recipient.trim() || "LANH_DAO_DON_VI",
        });
        if (action === "APPROVE") {
          await uiApi.gd2.transition({
            entityType: "DOSSIER",
            entityId,
            action: "SIGN",
            actor: actor.trim() || "current-user",
            unitCode: "DEFAULT",
            comment: "Phê duyệt và xuất bản hồ sơ lưu trữ.",
            recipient: recipient.trim() || "LANH_DAO_DON_VI",
          });
        }
        setNotice({
          type: "success",
          text: `Đã ${actionText.toLowerCase()} hồ sơ "${target.code}" thành công!`
        });
        await loadWorkflowItems();
        return;
      }

      if (action === "APPROVE") {
        const reviewed = await uiApi.gd2.saveReviewedDocumentContent(target.id, {
          description: composeReviewedOcrContent(reviewForm),
          actor: actor.trim() || "current-user",
          note: `Chốt nội dung OCR trước khi phê duyệt tài liệu ${target.code}`
        });
        target = { ...target, ...reviewed };
        setRows(current => current.map(row => Number(row.id) === Number(target.id) ? { ...row, ...reviewed } : row));
      }

      let result = await uiApi.gd2.transition({
        entityType: "DOCUMENT",
        entityId: target.id,
        action,
        actor: actor.trim() || "current-user",
        unitCode: "DEFAULT",
        comment: commentContent,
        recipient: recipient.trim() || target.code,
      });
      if (action === "APPROVE") {
        result = await uiApi.gd2.transition({
          entityType: "DOCUMENT",
          entityId: target.id,
          action: "PUBLISH",
          actor: actor.trim() || "current-user",
          unitCode: "DEFAULT",
          comment: "Phê duyệt đạt và xuất bản tài liệu cho phép tra cứu khai thác.",
          recipient: recipient.trim() || target.code,
        });
      }

      let dossierMessage = "";
      if (action === "APPROVE" && target.dossierId) {
        try {
          const [documents, dossiers] = await Promise.all([
            uiApi.crud("documents").list(),
            uiApi.crud("dossiers").list()
          ]);
          const dossierDocuments = documents.filter(item => Number(item.dossierId) === Number(target.dossierId));
          const dossier = dossiers.find(item => Number(item.id) === Number(target.dossierId));
          if (dossier && dossierDocuments.length > 0 && dossierDocuments.every(item => String(item.status).toUpperCase() === "PUBLISHED")) {
            let dossierStatus = String(dossier.status || "DRAFT").toUpperCase();
            if (dossierStatus === "PENDING") {
              const approvedDossier = await uiApi.gd2.transition({
                entityType: "DOSSIER",
                entityId: dossier.id,
                action: "APPROVE",
                actor: actor.trim() || "current-user",
                unitCode: "DEFAULT",
                comment: "Tự động phê duyệt hồ sơ vì toàn bộ tài liệu đã được phê duyệt.",
                recipient: recipient.trim() || "LANH_DAO_DON_VI"
              });
              dossierStatus = approvedDossier.currentStatus;
            }
            if (dossierStatus === "APPROVED") {
              const publishedDossier = await uiApi.gd2.transition({
                entityType: "DOSSIER",
                entityId: dossier.id,
                action: "SIGN",
                actor: actor.trim() || "current-user",
                unitCode: "DEFAULT",
                comment: "Tự động xuất bản hồ sơ sau khi toàn bộ tài liệu đã xuất bản.",
                recipient: recipient.trim() || "LANH_DAO_DON_VI"
              });
              dossierStatus = publishedDossier.currentStatus;
            }
            if (dossierStatus === "PUBLISHED") dossierMessage = " Hồ sơ chứa tài liệu cũng đã được phê duyệt và xuất bản.";
          }
        } catch (dossierError) {
          dossierMessage = ` Tài liệu đã xuất bản nhưng chưa đồng bộ được trạng thái hồ sơ: ${dossierError.message}`;
        }
      }

      const nextPending = action === "APPROVE" ? findNextPendingDocument(rows, target.id) : null;
      const nextSelectedId = nextPending?.id || target.id;
      setRows(current => current.map(row =>
        Number(row.id) === Number(target.id) ? { ...row, status: result.currentStatus } : row
      ));
      setSelectedId(nextSelectedId);
      await loadWorkflowRuntime(nextSelectedId);
      setNotice({
        type: dossierMessage.includes("chưa đồng bộ") ? "info" : "success",
        text: `Đã ${actionText.toLowerCase()} thành công! Trạng thái hiện tại: ${workflowStatusLabel(result.currentStatus)}.${dossierMessage}${nextPending ? ` Đã tự động chuyển sang tài liệu chờ duyệt tiếp theo: ${nextPending.code}.` : action === "APPROVE" ? " Hàng chờ hiện không còn tài liệu PENDING khác." : ""}`
      });
      setNote("");
      setActionModal(null);
    } catch (error) {
      setNotice({ type: "error", text: `${actionText} thất bại: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  function handleActionClick(action) {
    if (!selected) {
      setNotice({ type: "error", text: "Vui lòng chọn hồ sơ hoặc tài liệu để xử lý." });
      return;
    }
    if (action === "APPROVE") {
      processWorkflow("APPROVE", selected, "Phê duyệt hồ sơ đạt yêu cầu.");
    } else if (action === "REQUEST_SUPPLEMENT") {
      setActionModal({
        type: "REQUEST_SUPPLEMENT",
        title: "Yêu cầu bổ sung hồ sơ",
        label: "Lý do / Nội dung cần bổ sung",
        placeholder: "Vui lòng nhập chi tiết các tài liệu hoặc nội dung cần bổ sung...",
        confirmLabel: "Gửi yêu cầu bổ sung"
      });
      setActionReason("");
    } else if (action === "REJECT") {
      setActionModal({
        type: "REJECT",
        title: "Từ chối hồ sơ",
        label: "Lý do từ chối",
        placeholder: "Vui lòng nhập lý do từ chối tiếp nhận hồ sơ này...",
        confirmLabel: "Xác nhận từ chối"
      });
      setActionReason("");
    }
  }

  function handleConfirmActionModal() {
    if (!actionModal) return;
    if (!actionReason.trim()) {
      alert("Vui lòng nhập lý do xử lý!");
      return;
    }
    processWorkflow(actionModal.type, selected, actionReason.trim());
  }

  async function saveReviewedContent() {
    if (!selected) return;
    try {
      setLoading(true);
      const updated = await uiApi.gd2.saveReviewedDocumentContent(selected.id, {
        description: composeReviewedOcrContent(reviewForm),
        actor: actor.trim() || "current-user",
        note: `Hiệu chỉnh kết quả OCR của tài liệu ${selected.code}`
      });
      setRows(current => current.map(row => Number(row.id) === Number(selected.id) ? { ...row, ...updated } : row));
      await loadWorkflowRuntime(selected.id);
      setNotice({ type: "success", text: "Đã lưu nội dung đối soát vào Oracle và ghi lịch sử phiên bản/workflow." });
    } catch (error) {
      setNotice({ type: "error", text: `Không lưu được nội dung hiệu chỉnh: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function createDraftSeed() {
    try {
      setLoading(true);
      const created = await uiApi.gd2.createWorkflowDraftSeed(handoff?.storageId || "");
      await loadWorkflowItems();
      setSelectedId(created.documentId);
      setNotice({ type: "success", text: `Đã tạo dữ liệu test ${created.documentCode}. Chạy OCR ở GĐ2-6 rồi gửi duyệt.` });
    } catch (error) {
      setNotice({ type: "error", text: `Không tạo được hồ sơ test: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => ({
    draft: rows.filter(item => String(item.status || "").toUpperCase() === "DRAFT").length,
    pending: rows.filter(item => String(item.status || "").toUpperCase() === "PENDING").length,
    supplement: rows.filter(item => String(item.status || "").toUpperCase() === "NEEDS_SUPPLEMENT").length,
    done: rows.filter(item => ["APPROVED", "PUBLISHED", "CONFIRMED"].includes(String(item.status || "").toUpperCase())).length,
  }), [rows]);

  const leftPanel = (
    <div className="gd22-workspace">
      {/* 3. Thông báo hướng dẫn ngắn gọn phía trên cùng */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 16px",
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: "8px",
        marginBottom: "12px",
        color: "#1e40af",
        fontSize: "13px",
        fontWeight: 600
      }}>
        <AlertCircle size={18} color="#2563eb" style={{ flexShrink: 0 }} />
        <span>Vui lòng kiểm tra văn bản đính kèm và thông tin bóc tách bên dưới trước khi phê duyệt.</span>
      </div>

      <div className="gd22-stats">
        <Metric label="Chờ kiểm duyệt" value={stats.pending} />
        <Metric label="Cần bổ sung" value={stats.supplement} />
        <Metric label="Đã phê duyệt" value={stats.done} />
        <Metric label="Tổng số" value={rows.length} />
      </div>

      {/* 1. Bộ lọc trạng thái - Mặc định chỉ lọc các hồ sơ "Chờ kiểm duyệt" (PENDING) */}
      <div style={{ display: "flex", gap: "6px", margin: "12px 0 10px", background: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
        {[
          { key: "PENDING", label: `Chờ kiểm duyệt (${stats.pending})` },
          { key: "NEEDS_SUPPLEMENT", label: `Cần bổ sung (${stats.supplement})` },
          { key: "APPROVED", label: `Đã phê duyệt (${stats.done})` },
          { key: "ALL", label: `Tất cả (${rows.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            style={{
              flex: 1,
              padding: "7px 4px",
              fontSize: "12px",
              fontWeight: statusFilter === tab.key ? 700 : 500,
              background: statusFilter === tab.key ? "#fff" : "transparent",
              color: statusFilter === tab.key ? "#2563eb" : "#64748b",
              border: "none",
              borderRadius: "6px",
              boxShadow: statusFilter === tab.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bảng danh sách chờ duyệt */}
      <div className="table-wrap" style={{ border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}></th>
              <th>Hồ sơ lưu trữ</th>
              <th>Người gửi</th>
              <th>Ngày gửi</th>
              <th style={{ textAlign: "center" }}>Văn bản đính kèm</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(row => {
              const isSelected = row.id === selected?.id;
              const parentDossier = dossierMap.get(Number(row.dossierId));
              const docCount = rows.filter(d => Number(d.dossierId) === Number(row.dossierId)).length || 1;
              const sender = row.createdBy || row.actor || parentDossier?.createdBy || "Cán bộ số hóa";
              const sentDate = row.createdAt ? new Date(row.createdAt).toLocaleDateString("vi-VN") : "--";
              const dossierTitle = parentDossier ? `${parentDossier.code} - ${parentDossier.title}` : (row.title || "Hồ sơ số hóa");

              return (
                <tr
                  key={row.id}
                  className={isSelected ? "row-selected" : ""}
                  onClick={() => setSelectedId(row.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td><input type="radio" checked={isSelected} onChange={() => setSelectedId(row.id)} /></td>
                  <td>
                    <strong style={{ color: isSelected ? "#1d4ed8" : "#1e293b", fontSize: "13px", display: "block" }}>
                      📁 {dossierTitle}
                    </strong>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                      {row.isDossierOnly ? (
                        <span style={{ color: "#d97706", fontWeight: 500 }}>
                          📋 Duyệt cấp hồ sơ lưu trữ (Chưa đính kèm văn bản con)
                        </span>
                      ) : (
                        <>📄 Văn bản: <span className="gd2-code">{row.code}</span> — {row.title}</>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: "12px", color: "#334155" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <User size={13} color="#64748b" /> {sender}
                    </span>
                  </td>
                  <td style={{ fontSize: "12px", color: "#64748b" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={13} color="#64748b" /> {sentDate}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      background: row.isDossierOnly ? "#fef3c7" : "#f1f5f9",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: row.isDossierOnly ? "#b45309" : "#475569"
                    }}>
                      {row.isDossierOnly ? "0 văn bản" : `${docCount} văn bản`}
                    </span>
                  </td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>
                    <button
                      className="icon-btn"
                      type="button"
                      title="Chọn xử lý"
                      onClick={event => { event.stopPropagation(); setSelectedId(row.id); }}
                    >
                      <Edit size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan="7" className="empty-cell" style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>
                  {loading ? "Đang tải dữ liệu..." : `Không có hồ sơ nào ở trạng thái ${workflowStatusLabel(statusFilter)}.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{ marginTop: "14px", border: "1px solid #cbd5e1", borderRadius: "10px", overflow: "hidden", background: "#0f172a" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "9px 12px", background: "#fff", borderBottom: "1px solid #cbd5e1" }}>
            <strong style={{ fontSize: "13px", color: "#1e293b" }}><Eye size={14} style={{ verticalAlign: "middle", marginRight: "6px" }}/>PDF số hóa lưu kho: {selected.fileName || "Chưa có file"}</strong>
            <div style={{ display: "flex", gap: "6px" }}>
              <button className="btn" type="button" onClick={() => setViewerZoom(value => Math.max(.5, value - .25))}>−</button>
              <button className="btn" type="button" onClick={() => setViewerZoom(1)}>{Math.round(viewerZoom * 100)}%</button>
              <button className="btn" type="button" onClick={() => setViewerZoom(value => Math.min(2.5, value + .25))}>＋</button>
              <button className="btn" type="button" onClick={() => setViewerRotation(value => (value + 90) % 360)}>↻ Xoay</button>
            </div>
          </div>
          <div style={{ height: "560px", overflow: "auto", display: "grid", placeItems: "start center", padding: "16px" }}>
            {selected.isDossierOnly ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", maxWidth: "500px", margin: "auto" }}>
                <Archive size={52} color="#94a3b8" style={{ display: "block", margin: "0 auto 16px" }} />
                <h3 style={{ color: "#f8fafc", margin: "0 0 10px", fontSize: "16px" }}>📁 {selected.code}</h3>
                <p style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: 1.5, marginBottom: "20px" }}>
                  {selected.title}
                </p>
                <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "14px 18px", textAlign: "left", fontSize: "13px", color: "#e2e8f0" }}>
                  <div style={{ marginBottom: "6px" }}>Mã hồ sơ: <strong style={{ color: "#60a5fa" }}>{selected.code}</strong></div>
                  <div style={{ marginBottom: "6px" }}>Trạng thái luồng: <StatusBadge status={selected.status} /></div>
                  {selected.description && <div>Mô tả: <span style={{ color: "#94a3b8" }}>{selected.description}</span></div>}
                </div>
              </div>
            ) : selected.fileName?.toLowerCase().endsWith(".pdf") ? (
              <iframe
                title="Trình xem PDF số hóa OCR"
                src={`/api/dms/documents/${selected.id}/file?v=${encodeURIComponent(selected.fileName || "pdf")}`}
                style={{ width: "100%", height: "520px", border: 0, background: "#fff", transform: `scale(${viewerZoom}) rotate(${viewerRotation}deg)`, transformOrigin: "top center" }}
              />
            ) : /\.(png|jpe?g|tiff?)$/i.test(selected.fileName || "") ? (
              <img
                src={`/api/dms/documents/${selected.id}/file?v=${encodeURIComponent(selected.fileName || "image")}`}
                alt={`File gốc ${selected.title}`}
                style={{ maxWidth: "100%", height: "auto", transform: `scale(${viewerZoom}) rotate(${viewerRotation}deg)`, transformOrigin: "top center", transition: "transform .2s ease" }}
              />
            ) : (
              <div className="gd21-preview-empty" style={{ color: "#cbd5e1", minHeight: "300px" }}>
                <FileSearch size={42}/><strong>Không có bản xem trước</strong><span>PDF và ảnh PNG/JPG/TIFF được hỗ trợ trực tiếp.</span>
              </div>
            )}
          </div>
        </div>
      )}
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  const rightPanel = (
    <div className="gd22-review-panel">
      {/* 2. Khung chi tiết hồ sơ với 3 nút hành động ở vị trí nổi bật, rõ ràng */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "10px",
        padding: "12px",
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        <button
          type="button"
          disabled={loading || !selected}
          onClick={() => handleActionClick("APPROVE")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "10px 12px",
            background: loading || !selected ? "#94a3b8" : "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 700,
            fontSize: "13px",
            cursor: loading || !selected ? "not-allowed" : "pointer",
            boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)",
            transition: "all 0.15s ease"
          }}
        >
          <CheckCircle2 size={16} />
          ✓ Phê duyệt hồ sơ
        </button>

        <button
          type="button"
          disabled={loading || !selected}
          onClick={() => handleActionClick("REQUEST_SUPPLEMENT")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "10px 12px",
            background: loading || !selected ? "#94a3b8" : "#ea580c",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 700,
            fontSize: "13px",
            cursor: loading || !selected ? "not-allowed" : "pointer",
            boxShadow: "0 2px 4px rgba(234, 88, 12, 0.2)",
            transition: "all 0.15s ease"
          }}
        >
          <AlertCircle size={16} />
          ! Yêu cầu bổ sung
        </button>

        <button
          type="button"
          disabled={loading || !selected}
          onClick={() => handleActionClick("REJECT")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "10px 12px",
            background: loading || !selected ? "#94a3b8" : "#dc2626",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 700,
            fontSize: "13px",
            cursor: loading || !selected ? "not-allowed" : "pointer",
            boxShadow: "0 2px 4px rgba(220, 38, 38, 0.2)",
            transition: "all 0.15s ease"
          }}
        >
          <X size={16} />
          ✕ Từ chối
        </button>
      </div>

      {selected && (
        <div className="gd22-current-card" style={{ marginTop: "12px" }}>
          <div>
            <span className="gd21415-section-kicker">Hồ sơ / Tài liệu đang kiểm duyệt</span>
            <h3>{selected.code} · {selected.title}</h3>
          </div>
          <StatusBadge status={selected.status} />
        </div>
      )}

      <div className="gd22-stepper">
        {runtime?.steps?.map((step, index) => (
          <div className={`gd22-step ${step.state.toLowerCase()}`} key={step.code}>
            <div className="gd22-step-dot">{step.state === "DONE" ? <CheckCircle2 size={14}/> : index + 1}</div>
            <div>
              <strong>{step.name}</strong>
              <span><User size={12}/> {step.assignee}</span>
              <span><Clock size={12}/> {new Date(step.deadline).toLocaleString("vi-VN")}</span>
            </div>
          </div>
        ))}
        {!runtime && <div className="empty-cell">Chọn tài liệu để xem stepper quy trình.</div>}
      </div>

      {selected && (
        <div style={{ marginTop: "12px", padding: "16px", border: "1px solid #bfdbfe", borderRadius: "10px", background: "#f8fbff" }}>
          <div className="gd22-section-head"><FileText size={16}/> Nội dung và metadata AI đã bóc tách</div>
          <div className="gd2-form-row" style={{ marginTop: "12px" }}>
            <div className="gd2-field">
              <label>Số hiệu văn bản</label>
              <input value={reviewForm.documentNumber} onChange={event => setReviewForm(current => ({ ...current, documentNumber: event.target.value }))} />
            </div>
            <div className="gd2-field">
              <label>Ngày ban hành</label>
              <input type="date" value={reviewForm.issueDate} onChange={event => setReviewForm(current => ({ ...current, issueDate: event.target.value }))} />
            </div>
          </div>
          <div className="gd2-field" style={{ marginTop: "10px" }}>
            <label>Trích yếu nội dung</label>
            <input value={reviewForm.summary} onChange={event => setReviewForm(current => ({ ...current, summary: event.target.value }))} />
          </div>
          <div className="gd2-field" style={{ marginTop: "10px" }}>
            <label>Toàn văn OCR</label>
            <textarea
              rows="12"
              value={reviewForm.fullText}
              onChange={event => setReviewForm(current => ({ ...current, fullText: event.target.value }))}
              placeholder="Nội dung OCR để người kiểm duyệt đối soát và chỉnh sửa trực tiếp..."
              style={{ resize: "vertical", lineHeight: 1.55, fontFamily: "inherit" }}
            />
          </div>
          <button className="btn ok" type="button" disabled={loading} onClick={saveReviewedContent} style={{ marginTop: "12px", background: "#2563eb", color: "#fff", borderColor: "#2563eb" }}>
            <Save size={15}/> Lưu chỉnh sửa OCR
          </button>
        </div>
      )}

      <div className="gd22-action-panel">
        <div className="gd22-section-head"><CheckCircle2 size={16}/> Thông tin người duyệt & Ý kiến xử lý</div>
        <div className="gd2-form-row">
          <div className="gd2-field">
            <label>Cán bộ kiểm duyệt</label>
            <input placeholder="Cán bộ kiểm duyệt" value={actor} onChange={event => setActor(event.target.value)} />
          </div>
          <div className="gd2-field">
            <label>Người nhận thông báo</label>
            <input placeholder="Nhóm/người nhận" value={recipient} onChange={event => setRecipient(event.target.value)} />
          </div>
        </div>
        <div className="gd2-field">
          <label>Ý kiến / Ghi chú kiểm duyệt</label>
          <textarea
            rows="3"
            placeholder="Nhập ghi chú ý kiến duyệt, lý do từ chối hoặc yêu cầu bổ sung..."
            value={note}
            onChange={event => setNote(event.target.value)}
            style={{ resize: "none" }}
          />
        </div>
      </div>

      <div className="gd22-history">
        <div className="gd22-section-head"><History size={16}/> Lịch sử & Tiến trình xử lý</div>
        <div className="timeline-list">
          {runtime?.history?.map(item => (
            <div className="timeline-item" key={item.id}>
              <strong>{workflowActionLabel(item.action)} · {workflowStatusLabel(item.toStatus)}</strong>
              <span>{item.actor} · {new Date(item.createdAt).toLocaleString("vi-VN")}</span>
              {item.comment && <span>{item.comment}</span>}
            </div>
          ))}
          {(!runtime?.history || runtime.history.length === 0) && <div className="empty-cell">Chưa có lịch sử xử lý.</div>}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <GD2FeatureLayout
        featureId="GĐ2-2"
        featureName="Kiểm duyệt & Phê duyệt hồ sơ"
        description="Kiểm duyệt trực tiếp PDF số hóa, đối soát nội dung OCR và phê duyệt để xuất bản tài liệu, hồ sơ vào kho lưu trữ."
        className="gd22-feature"
        actor="approve"
        actionBarLabel="Hàng chờ duyệt và xử lý hồ sơ"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        splitRatio="minmax(0, 1fr) minmax(460px, 1fr)"
        leftPanelTitle="Danh sách hồ sơ chờ kiểm duyệt"
        rightPanelTitle="Chi tiết hồ sơ & Phê duyệt"
        actions={
          <>
            <button className="btn" type="button" onClick={loadWorkflowItems}><RefreshCw size={14}/> Tải lại</button>
            <button
              className="btn"
              type="button"
              disabled={loading || !selected}
              onClick={() => handleActionClick("APPROVE")}
              style={{ background: "#16a34a", color: "#fff", borderColor: "#16a34a", fontWeight: 600 }}
            >
              <CheckCircle2 size={14}/> Phê duyệt hồ sơ
            </button>
            <button
              className="btn"
              type="button"
              disabled={loading || !selected}
              onClick={() => handleActionClick("REQUEST_SUPPLEMENT")}
              style={{ background: "#ea580c", color: "#fff", borderColor: "#ea580c", fontWeight: 600 }}
            >
              <AlertCircle size={14}/> Yêu cầu bổ sung
            </button>
            <button
              className="btn"
              type="button"
              disabled={loading || !selected}
              onClick={() => handleActionClick("REJECT")}
              style={{ background: "#dc2626", color: "#fff", borderColor: "#dc2626", fontWeight: 600 }}
            >
              <X size={14}/> Từ chối
            </button>
          </>
        }
        actionRows={[
          { action: "Đối soát song song", description: "Zoom/xoay file gốc và chỉnh trực tiếp metadata/toàn văn", result: "Lưu phiên bản nội dung chính xác vào Oracle" },
          { action: "Phê duyệt", description: "Xác nhận tài liệu đạt", result: "Tự động chuyển APPROVED rồi PUBLISHED" },
          { action: "Bổ sung / Từ chối", description: "Bắt buộc nhập lý do xử lý", result: "Chuyển NEEDS_SUPPLEMENT hoặc REJECTED, không xóa dữ liệu" },
        ]}
        validationItems={[
          { type: "required", label: "File OCR", text: "Tài liệu phải có file và nội dung OCR trước khi phê duyệt." },
          { type: "rule", label: "Luồng", text: "PENDING được phê duyệt, yêu cầu bổ sung hoặc từ chối nhưng luôn giữ bản ghi." },
          { type: "perm", label: "Phân quyền", text: "Người duyệt chỉ thao tác trong đơn vị, phòng ban hoặc vai trò được cấp." },
        ]}
        flowSteps={(definition.steps || []).map((step, index) => ({
          step: String(index + 1),
          label: step.name,
          desc: `${step.role} · ${step.deadlineHours}h`,
          color: ["#3264f4", "#0ea5e9", "#f59e0b", "#7c3aed", "#22c55e"][index] || "#3264f4"
        }))}
        leftPanel={leftPanel}
        rightPanel={rightPanel}
      />

      {/* Modal nhập lý do yêu cầu bổ sung hoặc từ chối */}
      {actionModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          backdropFilter: "blur(2px)"
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "480px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            overflow: "hidden"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              background: actionModal.type === "REJECT" ? "#fef2f2" : "#fff7ed",
              borderBottom: actionModal.type === "REJECT" ? "1px solid #fee2e2" : "1px solid #ffedd5"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {actionModal.type === "REJECT" ? (
                  <X size={20} color="#dc2626" />
                ) : (
                  <AlertCircle size={20} color="#ea580c" />
                )}
                <h3 style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 700,
                  color: actionModal.type === "REJECT" ? "#991b1b" : "#9a3412"
                }}>
                  {actionModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px"
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              <div style={{ marginBottom: "12px", fontSize: "13px", color: "#475569" }}>
                Đang xử lý tài liệu: <strong>{selected?.code}</strong> — {selected?.title}
              </div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                {actionModal.label} <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <textarea
                autoFocus
                rows={4}
                value={actionReason}
                onChange={e => setActionReason(e.target.value)}
                placeholder={actionModal.placeholder}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "13px",
                  lineHeight: 1.5,
                  boxSizing: "border-box",
                  outline: "none",
                  resize: "vertical"
                }}
              />
            </div>

            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              padding: "14px 20px",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0"
            }}>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                style={{
                  padding: "8px 16px",
                  background: "#fff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#475569",
                  cursor: "pointer"
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={loading || !actionReason.trim()}
                onClick={handleConfirmActionModal}
                style={{
                  padding: "8px 18px",
                  background: actionModal.type === "REJECT" ? "#dc2626" : "#ea580c",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: loading || !actionReason.trim() ? "not-allowed" : "pointer",
                  opacity: loading || !actionReason.trim() ? 0.6 : 1
                }}
              >
                {actionModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const GD22WorkflowScreenV2 = GD22WorkflowScreen;
export default GD22WorkflowScreen;
