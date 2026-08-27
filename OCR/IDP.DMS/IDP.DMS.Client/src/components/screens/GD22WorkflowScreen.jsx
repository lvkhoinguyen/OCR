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

export function GD22WorkflowScreen() {
  const [activeTab, setActiveTab] = useState("screen");

  const leftPanel = (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{width:36}}><input type="checkbox"/></th>
            <th>Mã</th>
            <th>Tên/Nội dung</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><input type="checkbox"/></td>
            <td><span className="gd2-code">HS-001</span></td>
            <td>Phiếu mượn PM-001</td>
            <td><span className="vld-badge unique" style={{background: "#fff7ed", color: "#c2410c", border: "none"}}>Chờ duyệt</span></td>
            <td style={{display:"flex",gap:4}}><button className="icon-btn"><FileText size={13}/></button><button className="icon-btn"><Edit size={13}/></button><button className="icon-btn danger"><X size={13}/></button></td>
          </tr>
          <tr>
            <td><input type="checkbox"/></td>
            <td><span className="gd2-code">HS-002</span></td>
            <td>Hồ sơ xuất bản HS-002</td>
            <td><span className="vld-badge unique" style={{background: "#fff7ed", color: "#c2410c", border: "none"}}>Chờ xác nhận</span></td>
            <td style={{display:"flex",gap:4}}><button className="icon-btn"><FileText size={13}/></button><button className="icon-btn"><Edit size={13}/></button><button className="icon-btn danger"><X size={13}/></button></td>
          </tr>
          <tr>
            <td><input type="checkbox"/></td>
            <td><span className="gd2-code">HS-003</span></td>
            <td>Báo lỗi tài liệu HS-003</td>
            <td><span className="vld-badge required" style={{background: "#fef2f2", color: "#b91c1c", border: "none"}}>Không hợp lệ</span></td>
            <td style={{display:"flex",gap:4}}><button className="icon-btn"><FileText size={13}/></button><button className="icon-btn"><Edit size={13}/></button><button className="icon-btn danger"><X size={13}/></button></td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const rightPanel = (
    <div className="gd2-config-form">
      <div className="gd2-form-row">
        <div className="gd2-field">
          <label>Người yêu cầu</label>
          <input placeholder="Người yêu cầu" />
        </div>
        <div className="gd2-field required">
          <label>Lý do/ghi chú <span className="req-star">*</span></label>
          <textarea rows="3" placeholder="Lý do/ghi chú" style={{resize:"none"}}></textarea>
        </div>
      </div>
      <div className="gd2-field">
        <label>Người duyệt tiếp theo</label>
        <select><option>Chọn người duyệt tiếp theo</option></select>
      </div>
      <div className="gd2-field" style={{marginTop: 8}}>
        <label>Luồng xử lý</label>
        <div className="workflow-steps-list">
          <div className="wf-step-item">Tạo yêu cầu</div>
          <div className="wf-step-item">Kiểm tra điều kiện mượn/xuất bản</div>
          <div className="wf-step-item">Phê duyệt hoặc chuyển cấp</div>
          <div className="wf-step-item">Ghi log và thông báo</div>
        </div>
      </div>
    </div>
  );

  return (
    <GD2FeatureLayout
      featureId="GĐ2-2"
      featureName="Kiểm duyệt & phê duyệt tài liệu OCR"
      description="Cán bộ kiểm duyệt xem trực tuyến PDF OCR, đối soát dữ liệu bóc tách, phê duyệt để xuất bản hoặc từ chối để xóa khỏi hệ thống."
      actor="approve"
      actionBarLabel="Hàng chờ tài liệu OCR cần kiểm duyệt"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="1fr 440px"
      leftPanelTitle="Danh sách chờ xử lý"
      rightPanelTitle="Chi tiết phê duyệt"
      actions={
        <>
          <button className="btn" style={{color: "#16a34a", borderColor: "#bbf7d0"}} onClick={() => alert("Duyệt")}>Duyệt</button>
          <button className="btn" style={{color: "#d97706", borderColor: "#fde68a"}} onClick={() => alert("Chuyển cấp")}>Chuyển cấp</button>
          <button className="btn" style={{color: "#dc2626", borderColor: "#fecaca"}} onClick={() => alert("Từ chối/Hủy")}>Từ chối/Hủy</button>
        </>
      }
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}

export function GD22WorkflowScreenV2({ handoff }) {
  const [activeTab, setActiveTab] = useState("screen");
  const [rows, setRows] = useState([]);
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

  useEffect(() => {
    loadWorkflowItems();
  }, []);

  useEffect(() => {
    if (selectedId) loadWorkflowRuntime(selectedId);
  }, [selectedId]);

  const selected = rows.find(row => row.id === selectedId) || rows[0] || null;
  useEffect(() => {
    if (!selected) {
      setReviewForm({ documentNumber: "", issueDate: "", summary: "", fullText: "" });
      return;
    }
    const parsed = parseReviewedOcrContent(selected.description);
    setReviewForm({
      documentNumber: parsed.documentNumber || selected.code || "",
      issueDate: parsed.issueDate,
      summary: parsed.summary || selected.title || "",
      fullText: parsed.fullText
    });
    setViewerZoom(1);
    setViewerRotation(0);
  }, [selected?.id, selected?.description]);

  const availableActions = useMemo(() => {
    const status = String(selected?.status || "").toUpperCase();
    const actionMap = {
      PENDING: [
        { action: "APPROVE", label: "✅ Phê duyệt", icon: CheckCircle2, tone: "success" },
        { action: "REQUEST_SUPPLEMENT", label: "🔄 Yêu cầu bổ sung", icon: RefreshCw, tone: "warning" },
        { action: "REJECT", label: "❌ Từ chối", icon: X, tone: "danger" },
      ],
      APPROVED: [],
      PUBLISHED: [],
    };

    return actionMap[status] || [];
  }, [selected?.status]);

  async function loadWorkflowItems() {
    try {
      setLoading(true);
      const [items, flowDefinition] = await Promise.all([
        uiApi.crud("documents").list(),
        uiApi.gd2.workflowDefinition(),
      ]);
      const queue = items.filter(item =>
        ["PENDING", "NEEDS_SUPPLEMENT", "REJECTED", "APPROVED", "PUBLISHED"].includes(String(item.status || "DRAFT").toUpperCase())
      );
      setRows(queue);
      setDefinition(flowDefinition);
      const requestedId = Number(handoff?.focusDocumentId || 0);
      const firstPendingId = queue.find(item => String(item.status).toUpperCase() === "PENDING")?.id;
      const nextId = queue.some(item => Number(item.id) === requestedId)
        ? requestedId
        : (queue.some(item => Number(item.id) === Number(selectedId)) ? selectedId : firstPendingId || queue[0]?.id || null);
      setSelectedId(nextId);
      if (nextId) await loadWorkflowRuntime(nextId);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được danh sách quy trình: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkflowRuntime(id) {
    try {
      const status = await uiApi.gd2.workflowStatus("DOCUMENT", id);
      setRuntime(status);
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được trạng thái luồng: ${error.message}` });
    }
  }

  function findNextPendingDocument(currentRows, currentId) {
    const currentIndex = currentRows.findIndex(row => Number(row.id) === Number(currentId));
    const isPending = row =>
      Number(row.id) !== Number(currentId) && String(row.status || "").toUpperCase() === "PENDING";
    if (currentIndex < 0) return currentRows.find(isPending) || null;

    // Ưu tiên đúng tài liệu nằm phía dưới trong bảng. Khi đã ở cuối danh
    // sách thì quay lại tài liệu PENDING đầu tiên để duyệt liên tục.
    return currentRows.slice(currentIndex + 1).find(isPending)
      || currentRows.slice(0, currentIndex).find(isPending)
      || null;
  }

  async function processWorkflow(action, target = selected) {
    if (!target) {
      setNotice({ type: "error", text: "Vui lòng chọn một tài liệu để xử lý." });
      return;
    }

    const actionText = {
      SUBMIT: "Gửi duyệt",
      APPROVE: "Duyệt",
      REQUEST_SUPPLEMENT: "Yêu cầu bổ sung",
      RESUBMIT: "Gửi lại",
      SIGN: "Ký số",
      CONFIRM: "Xác nhận",
      REJECT: "Từ chối",
    }[action] || action;

    try {
      setLoading(true);
      if (["REQUEST_SUPPLEMENT", "REJECT"].includes(action) && !note.trim()) {
        setNotice({ type: "error", text: `Vui lòng nhập lý do ${action === "REJECT" ? "từ chối" : "yêu cầu bổ sung"}.` });
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
        comment: note.trim() || `${actionText} tài liệu ${target.code}`,
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
            if (dossierStatus === "PUBLISHED") dossierMessage = " Hồ sơ chứa tài liệu cũng đã được xuất bản.";
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
        text: `${actionText} thành công. Trạng thái hiện tại: ${workflowStatusLabel(result.currentStatus)}.${dossierMessage}${nextPending ? ` Đã chuyển sang tài liệu chờ tiếp theo: ${nextPending.code}.` : action === "APPROVE" ? " Hàng chờ hiện không còn tài liệu PENDING khác." : ""}`
      });
      setNote("");
    } catch (error) {
      setNotice({ type: "error", text: `${actionText} thất bại: ${error.message}` });
    } finally {
      setLoading(false);
    }
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
    draft: rows.filter(item => item.status === "DRAFT").length,
    pending: rows.filter(item => item.status === "PENDING").length,
    supplement: rows.filter(item => item.status === "NEEDS_SUPPLEMENT").length,
    done: rows.filter(item => ["APPROVED", "PUBLISHED", "CONFIRMED"].includes(item.status)).length,
  }), [rows]);

  const leftPanel = (
    <div className="gd22-workspace">
      <div className="gd22-stats">
        <Metric label="Nháp" value={stats.draft} />
        <Metric label="Chờ kiểm duyệt" value={stats.pending} />
        <Metric label="Không đạt" value={stats.supplement} />
        <Metric label="Đã xuất bản" value={stats.done} />
      </div>
      <div className="gd22-designer">
        <div className="gd22-section-head"><GitMerge size={16}/> Luồng duyệt tài liệu OCR</div>
        <div className="gd22-designer-track">
          {definition.steps?.map((step, index) => (
            <div className="gd22-designer-step" key={step.code}>
              <span>{index + 1}</span>
              <strong>{step.name}</strong>
              <small>{step.role} · SLA {step.deadlineHours}h</small>
            </div>
          ))}
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}></th>
              <th>Mã</th>
              <th>Tài liệu PDF OCR</th>
              <th>Bước hiện tại</th>
              <th>Deadline</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const isSelected = row.id === selected?.id;
              const rowStep = isSelected ? runtime?.steps?.find(step => step.state === "CURRENT") : null;
              return (
                <tr
                  key={row.id}
                  className={isSelected ? "row-selected" : ""}
                  onClick={() => setSelectedId(row.id)}
                >
                  <td><input type="radio" checked={isSelected} onChange={() => setSelectedId(row.id)} /></td>
                  <td><span className="gd2-code">{row.code}</span></td>
                  <td>
                    <strong>{row.title}</strong>
                    <span className="gd21415-subtext">{row.fileName || "Chưa có file PDF OCR"}</span>
                  </td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>{rowStep?.deadline ? new Date(rowStep.deadline).toLocaleString("vi-VN") : "--"}</td>
                  <td><button className="icon-btn" type="button" title="Chọn xử lý" onClick={event => { event.stopPropagation(); setSelectedId(row.id); }}><Edit size={13} /></button></td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan="6" className="empty-cell">{loading ? "Đang tải..." : "Chưa có tài liệu chờ kiểm duyệt."}</td></tr>
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
            {selected.fileName?.toLowerCase().endsWith(".pdf") ? (
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
      {selected && (
        <div className="gd22-current-card">
          <div>
            <span className="gd21415-section-kicker">Tài liệu OCR đang kiểm duyệt</span>
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
              <label>Số hiệu</label>
              <input value={reviewForm.documentNumber} onChange={event => setReviewForm(current => ({ ...current, documentNumber: event.target.value }))} />
            </div>
            <div className="gd2-field">
              <label>Ngày ban hành</label>
              <input type="date" value={reviewForm.issueDate} onChange={event => setReviewForm(current => ({ ...current, issueDate: event.target.value }))} />
            </div>
          </div>
          <div className="gd2-field" style={{ marginTop: "10px" }}>
            <label>Trích yếu</label>
            <input value={reviewForm.summary} onChange={event => setReviewForm(current => ({ ...current, summary: event.target.value }))} />
          </div>
          <div className="gd2-field" style={{ marginTop: "10px" }}>
            <label>Toàn văn OCR</label>
            <textarea
              rows="15"
              value={reviewForm.fullText}
              onChange={event => setReviewForm(current => ({ ...current, fullText: event.target.value }))}
              placeholder="Nội dung OCR để người kiểm duyệt đối soát và chỉnh sửa trực tiếp..."
              style={{ resize: "vertical", lineHeight: 1.55, fontFamily: "inherit" }}
            />
          </div>
          <button className="btn ok" type="button" disabled={loading} onClick={saveReviewedContent} style={{ marginTop: "12px", background: "#2563eb", color: "#fff", borderColor: "#2563eb" }}>
            <Save size={15}/> Lưu chỉnh sửa
          </button>
        </div>
      )}

      <div className="gd22-action-panel">
        <div className="gd22-section-head"><CheckCircle2 size={16}/> Panel thao tác người duyệt</div>
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
        <div className="gd2-field required">
          <label>Ý kiến xử lý <span className="req-star">*</span></label>
          <textarea rows="3" placeholder="Nhập ý kiến duyệt, lý do từ chối hoặc nội dung cần bổ sung" value={note} onChange={event => setNote(event.target.value)} style={{ resize: "none" }}></textarea>
        </div>
        <div className="gd22-action-grid">
          {availableActions.length === 0 ? (
            <div className="muted">Tài liệu này chưa có hành động phù hợp ở bước hiện tại.</div>
          ) : availableActions.map(actionItem => {
            const Icon = actionItem.icon;
            return (
              <button
                key={actionItem.action}
                className={`gd22-action ${actionItem.tone}`}
                type="button"
                disabled={loading || !selected}
                onClick={() => processWorkflow(actionItem.action)}
              >
                <Icon size={16}/>
                {actionItem.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="gd22-history">
        <div className="gd22-section-head"><History size={16}/> Timeline xử lý</div>
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
    <GD2FeatureLayout
      featureId="GĐ2-2"
      featureName="Quản lý quy trình làm việc (Workflow)"
      description="Kiểm duyệt trực tiếp PDF số hóa, đối soát nội dung OCR và phê duyệt để xuất bản tài liệu, hồ sơ vào kho lưu trữ."
      className="gd22-feature"
      actor="approve"
      actionBarLabel="Hàng chờ duyệt và xử lý hồ sơ"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="minmax(0, 1fr) minmax(440px, 1fr)"
      leftPanelTitle="File gốc & hàng chờ kiểm duyệt"
      rightPanelTitle="Nội dung OCR, metadata & xử lý"
      actions={
        <>
          <button className="btn" type="button" onClick={loadWorkflowItems}><RefreshCw size={14}/> Tải lại</button>
          <button className="btn" type="button" onClick={createDraftSeed}><Plus size={14}/> Dữ liệu test</button>
          {availableActions.map(actionItem => (
            <button
              key={actionItem.action}
              className="btn"
              type="button"
              disabled={loading || !selected}
              onClick={() => processWorkflow(actionItem.action)}
            >
              <actionItem.icon size={14}/>
              {actionItem.label}
            </button>
          ))}
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
  );
}

export default GD22WorkflowScreen;
