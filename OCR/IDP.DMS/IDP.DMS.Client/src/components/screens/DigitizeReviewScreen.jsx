import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ArrowLeft,
  Save,
  Check,
  X,
  Eye,
  FileCheck,
  Building,
  Calendar,
  Hash,
  User,
  AlignLeft,
  Sparkles,
  Inbox
} from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { StatusBadge, OcrBadge } from "../shared/SharedComponents";

export default function DigitizeReviewScreen() {
  const [activeTab, setActiveTab] = useState("upload"); // 'upload' | 'queue' | 'review'

  // Data states
  const [storages, setStorages] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [docDetail, setDocDetail] = useState(null);

  // Upload states
  const [selectedStorageId, setSelectedStorageId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [uploadStep, setUploadStep] = useState(0); // 0: Idle, 1: Uploading, 2: Gemini OCR, 3: QuestPDF, 4: Done
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Review states
  const [reviewSide, setReviewSide] = useState("digitized"); // 'digitized' | 'original'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [originalBlobUrl, setOriginalBlobUrl] = useState(null);
  const [loadingBlob, setLoadingBlob] = useState(false);

  // Editable metadata form in review
  const [editMeta, setEditMeta] = useState({
    documentNumber: "",
    issueDate: "",
    issuingAuthority: "",
    subject: "",
    signer: "",
    fullText: "",
    note: ""
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal / Action states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNeedsSupplement, setRejectNeedsSupplement] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const fileInputRef = useRef(null);

  // Tự ẩn thông báo sau 5 giây
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Tải danh sách kho lưu trữ
  const loadStorages = useCallback(async () => {
    try {
      const data = await uiApi.resources.storage.list();
      const list = Array.isArray(data) ? data : data?.items || [];
      const activeList = list.filter(
        (s) => String(s.status || "").toUpperCase() === "ACTIVE"
      );
      setStorages(activeList);
      if (activeList.length > 0 && !selectedStorageId) {
        setSelectedStorageId(String(activeList[0].id));
      }
    } catch (err) {
      console.error("Lỗi tải danh mục kho:", err);
    }
  }, [selectedStorageId]);

  // Tải danh sách tài liệu chờ duyệt
  const loadPendingDocs = useCallback(async () => {
    try {
      const data = await uiApi.pendingReviewDocuments();
      setPendingDocs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Lỗi tải hàng đợi kiểm duyệt:", err);
      setNotice({ type: "error", message: "Không thể tải danh sách tài liệu chờ duyệt: " + err.message });
    }
  }, []);

  useEffect(() => {
    loadStorages();
    loadPendingDocs();
  }, [loadStorages, loadPendingDocs]);

  // Xử lý chọn file ảnh
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["png", "jpg", "jpeg"].includes(ext)) {
      setNotice({ type: "error", message: "Chỉ chấp nhận tệp hình ảnh (.png, .jpg, .jpeg)!" });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setNotice({ type: "error", message: "Dung lượng ảnh không được vượt quá 25 MB." });
      return;
    }

    setSelectedFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setUploadResult(null);
    setUploadStep(0);
  };

  // Bước 1: Gửi ảnh & Số hóa OCR
  const handleUploadAndDigitize = async () => {
    if (!selectedFile) {
      setNotice({ type: "error", message: "Vui lòng chọn 1 tệp hình ảnh." });
      return;
    }
    if (!selectedStorageId) {
      setNotice({ type: "error", message: "Vui lòng chọn kho lưu trữ." });
      return;
    }

    setUploading(true);
    setUploadStep(1); // 1: Tải lên máy chủ

    // Mô phỏng tiến trình 3 bước trực quan
    const stepTimer1 = setTimeout(() => setUploadStep(2), 800); // 2: Gemini Vision AI OCR
    const stepTimer2 = setTimeout(() => setUploadStep(3), 3500); // 3: QuestPDF

    try {
      const res = await uiApi.uploadAndDigitize(selectedStorageId, selectedFile);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setUploadStep(4); // Hoàn thành
      setUploadResult(res);
      setNotice({ type: "success", message: `Số hóa thành công tài liệu #${res.documentId}! Đã chuyển vào hàng đợi duyệt.` });
      loadPendingDocs();
    } catch (err) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setUploadStep(0);
      setNotice({ type: "error", message: "Lỗi trong quá trình số hóa: " + err.message });
    } finally {
      setUploading(false);
    }
  };

  // Tải chi tiết và mở màn hình kiểm duyệt
  const handleOpenReview = async (docId) => {
    setSelectedDocId(docId);
    setLoadingBlob(true);
    setDocDetail(null);
    setZoomLevel(1);
    setRotation(0);
    setReviewSide("digitized");

    try {
      const detail = await uiApi.digitizeDocumentDetail(docId);
      setDocDetail(detail);

      setEditMeta({
        documentNumber: detail.metadata?.documentNumber || "",
        issueDate: detail.metadata?.issueDate || "",
        issuingAuthority: detail.metadata?.issuingAuthority || "",
        subject: detail.metadata?.subject || detail.title || "",
        signer: detail.metadata?.signer || "",
        fullText: detail.fullText || "",
        note: ""
      });

      // Tải PDF blob và Original Image blob song song
      try {
        const pdfBlob = await uiApi.documentPdfBlob(docId, "digitized");
        setPdfBlobUrl(URL.createObjectURL(pdfBlob));
      } catch (e) {
        console.warn("Không tải được blob PDF:", e);
      }

      try {
        const origBlob = await uiApi.documentPdfBlob(docId, "original");
        setOriginalBlobUrl(URL.createObjectURL(origBlob));
      } catch (e) {
        console.warn("Không tải được blob ảnh gốc:", e);
      }

      setActiveTab("review");
    } catch (err) {
      setNotice({ type: "error", message: "Không thể mở tài liệu kiểm duyệt: " + err.message });
    } finally {
      setLoadingBlob(false);
    }
  };

  // Lưu nội dung chỉnh sửa (PUT /review-content)
  const handleSaveEdit = async () => {
    if (!selectedDocId) return;
    setSavingEdit(true);
    try {
      const user = uiApi.auth.session()?.user;
      const actor = user?.fullName || user?.username || "Chuyên viên kiểm duyệt";
      const updated = await uiApi.updateReviewContent(selectedDocId, {
        documentNumber: editMeta.documentNumber,
        issueDate: editMeta.issueDate,
        issuingAuthority: editMeta.issuingAuthority,
        subject: editMeta.subject,
        signer: editMeta.signer,
        fullText: editMeta.fullText,
        actor,
        note: editMeta.note || "Cập nhật nội dung đối soát OCR"
      });
      setDocDetail(updated);
      setNotice({ type: "success", message: "Đã lưu bản chỉnh sửa metadata & toàn văn!" });
    } catch (err) {
      setNotice({ type: "error", message: "Lỗi lưu chỉnh sửa: " + err.message });
    } finally {
      setSavingEdit(false);
    }
  };

  // Bước 4A: Phê duyệt & Nhập kho chính thức (POST /approve)
  const handleApprove = async () => {
    if (!selectedDocId) return;
    if (!window.confirm("Xác nhận phê duyệt tài liệu này và lưu kho chính thức? Hệ thống sẽ cập nhật PDF bản chuẩn và ghi nhận phiên bản.")) {
      return;
    }

    setActionLoading(true);
    try {
      const user = uiApi.auth.session()?.user;
      const actor = user?.fullName || user?.username || "Lãnh đạo / Người duyệt";
      await uiApi.approveDigitizeDocument(selectedDocId, {
        actor,
        note: editMeta.note || "Phê duyệt tài liệu số hóa đạt yêu cầu chất lượng"
      });

      setNotice({
        type: "success",
        message: `Đã phê duyệt tài liệu #${selectedDocId} và nhập kho thành công!`
      });

      // Tải lại hàng đợi và quay lại danh sách
      await loadPendingDocs();
      setActiveTab("queue");
    } catch (err) {
      setNotice({ type: "error", message: "Phê duyệt thất bại: " + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Bước 4B: Từ chối / Yêu cầu bổ sung (POST /reject)
  const handleRejectConfirm = async () => {
    if (!selectedDocId) return;
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối hoặc yêu cầu bổ sung.");
      return;
    }

    setActionLoading(true);
    try {
      const user = uiApi.auth.session()?.user;
      const actor = user?.fullName || user?.username || "Người duyệt";
      await uiApi.rejectDigitizeDocument(selectedDocId, {
        actor,
        reason: rejectReason.trim(),
        needsSupplement: rejectNeedsSupplement
      });

      setNotice({
        type: "info",
        message: rejectNeedsSupplement
          ? `Đã chuyển tài liệu #${selectedDocId} sang trạng thái CẦN BỔ SUNG.`
          : `Đã TỪ CHỐI tài liệu #${selectedDocId}.`
      });

      setShowRejectModal(false);
      setRejectReason("");
      await loadPendingDocs();
      setActiveTab("queue");
    } catch (err) {
      setNotice({ type: "error", message: "Thao tác từ chối thất bại: " + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: 1400, margin: "0 auto", fontFamily: "Segoe UI, sans-serif" }}>
      {/* Banner Tiêu Đề */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f3d73", margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={24} color="#0284c7" />
            Số hóa Tài liệu từ Ảnh sang PDF & Kiểm duyệt Lưu kho
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
            Quy trình khép kín: Tải ảnh văn bản → Gemini Vision OCR bóc tách metadata → QuestPDF sinh PDF chuẩn chữ → Đối soát 2 cột & Duyệt lưu kho
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: 8, background: "#f1f5f9", padding: 4, borderRadius: 8 }}>
          <button
            onClick={() => setActiveTab("upload")}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: activeTab === "upload" ? "#0f3d73" : "transparent",
              color: activeTab === "upload" ? "#ffffff" : "#475569",
              transition: "all 0.2s"
            }}
          >
            <Upload size={16} /> Tải ảnh & Bóc tách
          </button>
          <button
            onClick={() => { setActiveTab("queue"); loadPendingDocs(); }}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: activeTab === "queue" ? "#0f3d73" : "transparent",
              color: activeTab === "queue" ? "#ffffff" : "#475569",
              transition: "all 0.2s",
              position: "relative"
            }}
          >
            <Clock size={16} /> Hàng đợi duyệt
            {pendingDocs.length > 0 && (
              <span style={{
                background: "#ef4444",
                color: "#ffffff",
                fontSize: 11,
                padding: "1px 6px",
                borderRadius: 10,
                marginLeft: 4,
                fontWeight: 700
              }}>
                {pendingDocs.length}
              </span>
            )}
          </button>
          {selectedDocId && (
            <button
              onClick={() => setActiveTab("review")}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: activeTab === "review" ? "#0f3d73" : "transparent",
                color: activeTab === "review" ? "#ffffff" : "#475569",
                transition: "all 0.2s"
              }}
            >
              <Eye size={16} /> Kiểm duyệt đối soát #{selectedDocId}
            </button>
          )}
        </div>
      </div>

      {/* Thông báo Alert */}
      {notice && (
        <div style={{
          padding: "12px 16px",
          borderRadius: 8,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 13,
          fontWeight: 500,
          background: notice.type === "error" ? "#fef2f2" : notice.type === "success" ? "#f0fdf4" : "#eff6ff",
          color: notice.type === "error" ? "#991b1b" : notice.type === "success" ? "#166534" : "#1e40af",
          border: `1px solid ${notice.type === "error" ? "#fca5a5" : notice.type === "success" ? "#86efac" : "#93c5fd"}`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {notice.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{notice.message}</span>
          </div>
          <button onClick={() => setNotice(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* TAB 1: TẢI ẢNH LÊN & BÓC TÁCH OCR */}
      {activeTab === "upload" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 20 }}>
          {/* Cột trái: Form Upload */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
              <Upload size={18} color="#0284c7" /> Bước 1: Tải hình ảnh & Chọn Kho lưu trữ
            </h2>

            {/* Chọn Kho */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Kho lưu trữ mục tiêu <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={selectedStorageId}
                onChange={(e) => setSelectedStorageId(e.target.value)}
                disabled={uploading}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  color: "#1e293b",
                  background: "#ffffff"
                }}
              >
                <option value="">-- Chọn kho lưu trữ --</option>
                {storages.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Drag-drop hoặc chọn File */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Tệp hình ảnh văn bản <span style={{ color: "#ef4444" }}>* (PNG, JPG, JPEG)</span>
              </label>
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: 8,
                  padding: "30px 20px",
                  textAlign: "center",
                  cursor: uploading ? "not-allowed" : "pointer",
                  background: selectedFile ? "#f8fafc" : "#ffffff",
                  transition: "all 0.2s"
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  disabled={uploading}
                />
                {selectedFile ? (
                  <div>
                    <FileCheck size={40} color="#16a34a" style={{ margin: "0 auto 10px" }} />
                    <p style={{ margin: "0 0 4px 0", fontWeight: 600, fontSize: 14, color: "#1e293b" }}>
                      {selectedFile.name}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Nhấp để chọn tệp khác
                    </p>
                  </div>
                ) : (
                  <div>
                    <Upload size={40} color="#94a3b8" style={{ margin: "0 auto 10px" }} />
                    <p style={{ margin: "0 0 6px 0", fontWeight: 600, fontSize: 14, color: "#334155" }}>
                      Nhấp để chọn ảnh hoặc kéo thả tệp vào đây
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
                      Hỗ trợ: PNG, JPG, JPEG (Tối đa 25MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Nút Thực hiện */}
            <button
              onClick={handleUploadAndDigitize}
              disabled={uploading || !selectedFile || !selectedStorageId}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                border: "none",
                background: uploading || !selectedFile || !selectedStorageId ? "#94a3b8" : "#0f3d73",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 14,
                cursor: uploading || !selectedFile || !selectedStorageId ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 2px 4px rgba(15, 61, 115, 0.2)"
              }}
            >
              {uploading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Đang xử lý số hóa tự động...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Tải lên & Bóc tách OCR
                </>
              )}
            </button>

            {/* Tiến trình 3 bước */}
            {uploadStep > 0 && (
              <div style={{ marginTop: 24, padding: 16, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 13, fontWeight: 700, color: "#334155" }}>
                  Tiến trình Số hóa AI:
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    {uploadStep > 1 ? <CheckCircle2 size={16} color="#16a34a" /> : <RefreshCw size={16} className="animate-spin" color="#0284c7" />}
                    <span style={{ fontWeight: uploadStep === 1 ? 700 : 400, color: uploadStep >= 1 ? "#1e293b" : "#94a3b8" }}>
                      1. Tiếp nhận & Lưu tệp hình ảnh gốc lên máy chủ
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    {uploadStep > 2 ? <CheckCircle2 size={16} color="#16a34a" /> : uploadStep === 2 ? <RefreshCw size={16} className="animate-spin" color="#0284c7" /> : <Clock size={16} color="#cbd5e1" />}
                    <span style={{ fontWeight: uploadStep === 2 ? 700 : 400, color: uploadStep >= 2 ? "#1e293b" : "#94a3b8" }}>
                      2. Gemini Vision AI phân tích văn bản & bóc tách metadata
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    {uploadStep > 3 ? <CheckCircle2 size={16} color="#16a34a" /> : uploadStep === 3 ? <RefreshCw size={16} className="animate-spin" color="#0284c7" /> : <Clock size={16} color="#cbd5e1" />}
                    <span style={{ fontWeight: uploadStep === 3 ? 700 : 400, color: uploadStep >= 3 ? "#1e293b" : "#94a3b8" }}>
                      3. QuestPDF sinh file PDF số hóa dạng chữ A4
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    {uploadStep === 4 ? <CheckCircle2 size={16} color="#16a34a" /> : <Clock size={16} color="#cbd5e1" />}
                    <span style={{ fontWeight: uploadStep === 4 ? 700 : 400, color: uploadStep === 4 ? "#16a34a" : "#94a3b8" }}>
                      4. Đưa vào Hàng đợi kiểm duyệt (STATUS: PENDING)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cột phải: Xem trước ảnh & Kết quả bóc tách */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
            {uploadResult ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#16a34a", display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle2 size={20} /> Kết quả Bóc tách Metadata Thành công
                  </h3>
                  <button
                    onClick={() => handleOpenReview(uploadResult.documentId)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "none",
                      background: "#0284c7",
                      color: "#ffffff",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <Eye size={14} /> Vào Kiểm duyệt ngay
                  </button>
                </div>

                {/* Bảng Metadata bóc tách */}
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: 14, marginBottom: 16, border: "1px solid #e2e8f0" }}>
                  <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "8px 0", color: "#64748b", fontWeight: 600, width: "35%" }}>Số hiệu văn bản:</td>
                        <td style={{ padding: "8px 0", color: "#0f3d73", fontWeight: 700 }}>
                          {uploadResult.metadata?.documentNumber || "(Chưa nhận diện rõ)"}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "8px 0", color: "#64748b", fontWeight: 600 }}>Ngày ban hành:</td>
                        <td style={{ padding: "8px 0", color: "#1e293b" }}>
                          {uploadResult.metadata?.issueDate || "(Chưa có)"}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "8px 0", color: "#64748b", fontWeight: 600 }}>Cơ quan ban hành:</td>
                        <td style={{ padding: "8px 0", color: "#1e293b" }}>
                          {uploadResult.metadata?.issuingAuthority || "(Chưa có)"}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "8px 0", color: "#64748b", fontWeight: 600 }}>Trích yếu nội dung:</td>
                        <td style={{ padding: "8px 0", color: "#1e293b" }}>
                          {uploadResult.metadata?.subject || "(Chưa có)"}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "8px 0", color: "#64748b", fontWeight: 600 }}>Người ký:</td>
                        <td style={{ padding: "8px 0", color: "#1e293b" }}>
                          {uploadResult.metadata?.signer || "(Chưa có)"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h4 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 700, color: "#334155" }}>
                  Xem trước Toàn văn OCR bóc tách:
                </h4>
                <div style={{
                  background: "#f1f5f9",
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 12,
                  maxHeight: 240,
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                  color: "#334155",
                  border: "1px solid #cbd5e1"
                }}>
                  {uploadResult.fullText || "Không có nội dung bóc tách."}
                </div>
              </div>
            ) : imagePreviewUrl ? (
              <div>
                <h3 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                  Xem trước Hình ảnh đã chọn:
                </h3>
                <div style={{ textAlign: "center", maxHeight: 460, overflow: "hidden", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    style={{ maxWidth: "100%", maxHeight: 460, objectFit: "contain" }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "80px 20px", color: "#94a3b8" }}>
                <Inbox size={48} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                  Vui lòng chọn hình ảnh để xem trước và số hóa
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HÀNG ĐỢI KIỂM DUYỆT (PENDING REVIEW QUEUE) */}
      {activeTab === "queue" && (
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={18} color="#f59e0b" />
              Danh sách Tài liệu Chờ Kiểm duyệt (Hàng đợi Reviewer)
            </h2>
            <button
              onClick={loadPendingDocs}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 600
              }}
            >
              <RefreshCw size={14} /> Làm mới
            </button>
          </div>

          {pendingDocs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
              <CheckCircle2 size={48} color="#16a34a" style={{ margin: "0 auto 12px" }} />
              <p style={{ margin: "0 0 6px 0", fontSize: 15, fontWeight: 600, color: "#1e293b" }}>
                Không có tài liệu nào đang chờ kiểm duyệt
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
                Tất cả tài liệu đã được phê duyệt hoặc chưa có tài liệu mới tải lên.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "10px 12px", width: 60 }}>ID</th>
                    <th style={{ padding: "10px 12px" }}>Mã tài liệu</th>
                    <th style={{ padding: "10px 12px" }}>Tên tài liệu / Tiêu đề</th>
                    <th style={{ padding: "10px 12px" }}>Tệp PDF số hóa</th>
                    <th style={{ padding: "10px 12px" }}>OCR Status</th>
                    <th style={{ padding: "10px 12px" }}>Trạng thái</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDocs.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px", fontWeight: 700, color: "#0f3d73" }}>#{doc.id}</td>
                      <td style={{ padding: "12px", fontFamily: "monospace", fontSize: 12 }}>{doc.code}</td>
                      <td style={{ padding: "12px", fontWeight: 600, color: "#1e293b" }}>{doc.title}</td>
                      <td style={{ padding: "12px", color: "#64748b", fontSize: 12 }}>
                        {doc.fileName ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <FileText size={14} color="#0284c7" /> {doc.fileName}
                          </span>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <OcrBadge status={doc.ocrStatus} />
                      </td>
                      <td style={{ padding: "12px" }}>
                        <StatusBadge status={doc.status} />
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <button
                          onClick={() => handleOpenReview(doc.id)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 6,
                            border: "none",
                            background: "#0284c7",
                            color: "#ffffff",
                            fontWeight: 600,
                            fontSize: 12,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4
                          }}
                        >
                          <Eye size={13} /> Kiểm duyệt đối soát
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MÀN HÌNH KIỂM DUYỆT ĐỐI SOÁT 2 CỘT (SPLIT-VIEW REVIEWER) */}
      {activeTab === "review" && docDetail && (
        <div>
          {/* Thanh công cụ đỉnh */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "10px 16px",
            marginBottom: 16
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => setActiveTab("queue")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#64748b",
                  fontWeight: 600,
                  fontSize: 13
                }}
              >
                <ArrowLeft size={16} /> Quay lại Hàng đợi
              </button>
              <div style={{ height: 18, width: 1, background: "#cbd5e1" }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: "#0f3d73" }}>
                Kiểm duyệt Tài liệu #{docDetail.id}: {docDetail.title}
              </span>
              <StatusBadge status={docDetail.status} />
            </div>

            {/* Nhóm nút Quyết định phê duyệt / từ chối */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: savingEdit ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <Save size={15} />
                {savingEdit ? "Đang lưu..." : "Lưu chỉnh sửa"}
              </button>

              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "none",
                  background: "#fee2e2",
                  color: "#dc2626",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <X size={15} /> Từ chối / Bổ sung
              </button>

              <button
                onClick={handleApprove}
                disabled={actionLoading}
                style={{
                  padding: "8px 18px",
                  borderRadius: 6,
                  border: "none",
                  background: "#16a34a",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 4px rgba(22, 163, 74, 0.25)"
                }}
              >
                <Check size={16} /> Phê duyệt & Nhập kho
              </button>
            </div>
          </div>

          {/* Khối Split-view 2 Cột */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* CỘT TRÁI: PREVIEW FILE (Ảnh gốc | PDF số hóa) */}
            <div style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              height: "calc(100vh - 200px)"
            }}>
              {/* Header điều khiển Preview */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc"
              }}>
                {/* Tabs Chuyển đổi Loại tệp */}
                <div style={{ display: "flex", gap: 4, background: "#e2e8f0", padding: 2, borderRadius: 6 }}>
                  <button
                    onClick={() => setReviewSide("digitized")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      background: reviewSide === "digitized" ? "#ffffff" : "transparent",
                      color: reviewSide === "digitized" ? "#0f3d73" : "#64748b"
                    }}
                  >
                    PDF Số hóa
                  </button>
                  <button
                    onClick={() => setReviewSide("original")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      background: reviewSide === "original" ? "#ffffff" : "transparent",
                      color: reviewSide === "original" ? "#0f3d73" : "#64748b"
                    }}
                  >
                    Ảnh gốc đối soát
                  </button>
                </div>

                {/* Toolbar Zoom / Xoay / Tải về */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.15))}
                    title="Thu nhỏ"
                    style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#ffffff", cursor: "pointer" }}
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", minWidth: 38, textAlign: "center" }}>
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.15))}
                    title="Phóng to"
                    style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#ffffff", cursor: "pointer" }}
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    title="Đặt lại zoom 100%"
                    style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#ffffff", cursor: "pointer", fontSize: 11 }}
                  >
                    1:1
                  </button>
                  {reviewSide === "original" && (
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      title="Xoay 90°"
                      style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#ffffff", cursor: "pointer" }}
                    >
                      <RotateCw size={14} />
                    </button>
                  )}
                  <a
                    href={uiApi.documentFileUrl(docDetail.id, reviewSide)}
                    download
                    title="Tải tệp về máy"
                    style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#334155",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center"
                    }}
                  >
                    <Download size={14} />
                  </a>
                </div>
              </div>

              {/* Vùng hiển thị tài liệu */}
              <div style={{ flex: 1, overflow: "auto", position: "relative", background: "#334155", padding: 10, textAlign: "center" }}>
                {loadingBlob ? (
                  <div style={{ color: "#ffffff", marginTop: 100, fontSize: 14 }}>Đang tải xem trước...</div>
                ) : reviewSide === "digitized" ? (
                  pdfBlobUrl ? (
                    <iframe
                      src={pdfBlobUrl}
                      title="Digitized PDF Preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: "top center",
                        transition: "transform 0.15s ease-out"
                      }}
                    />
                  ) : (
                    <div style={{ color: "#ffffff", marginTop: 100, fontSize: 14 }}>
                      Chưa có tệp PDF số hóa hoặc không thể hiển thị trực tiếp.
                    </div>
                  )
                ) : originalBlobUrl ? (
                  <div style={{ display: "inline-block", transition: "transform 0.15s ease-out" }}>
                    <img
                      src={originalBlobUrl}
                      alt="Original Document"
                      style={{
                        maxWidth: "100%",
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                        transformOrigin: "center center",
                        transition: "transform 0.15s ease-out",
                        borderRadius: 4,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ color: "#ffffff", marginTop: 100, fontSize: 14 }}>
                    Không tìm thấy tệp ảnh gốc.
                  </div>
                )}
              </div>
            </div>

            {/* CỘT PHẢI: FORM CHỈNH SỬA METADATA & TOÀN VĂN */}
            <div style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              height: "calc(100vh - 200px)",
              overflowY: "auto",
              padding: 16
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: 6 }}>
                <AlignLeft size={18} color="#0284c7" />
                Thông tin Bóc tách & Nội dung Đối soát (Có thể chỉnh sửa)
              </h3>

              {/* Grid 5 trường Metadata */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                {/* Số hiệu */}
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    <Hash size={13} /> Số / Ký hiệu văn bản:
                  </label>
                  <input
                    type="text"
                    value={editMeta.documentNumber}
                    onChange={(e) => setEditMeta({ ...editMeta, documentNumber: e.target.value })}
                    placeholder="VD: 123/QĐ-UBND"
                    style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                  />
                </div>

                {/* Ngày ban hành */}
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    <Calendar size={13} /> Ngày ban hành:
                  </label>
                  <input
                    type="text"
                    value={editMeta.issueDate}
                    onChange={(e) => setEditMeta({ ...editMeta, issueDate: e.target.value })}
                    placeholder="VD: 15/08/2025"
                    style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                  />
                </div>

                {/* Cơ quan ban hành */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    <Building size={13} /> Cơ quan ban hành:
                  </label>
                  <input
                    type="text"
                    value={editMeta.issuingAuthority}
                    onChange={(e) => setEditMeta({ ...editMeta, issuingAuthority: e.target.value })}
                    placeholder="VD: Ủy ban nhân dân Thành phố..."
                    style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                  />
                </div>

                {/* Trích yếu nội dung */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    <FileText size={13} /> Trích yếu nội dung:
                  </label>
                  <textarea
                    rows={2}
                    value={editMeta.subject}
                    onChange={(e) => setEditMeta({ ...editMeta, subject: e.target.value })}
                    placeholder="Trích yếu nội dung văn bản..."
                    style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, resize: "vertical" }}
                  />
                </div>

                {/* Người ký */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    <User size={13} /> Người ký & chức vụ:
                  </label>
                  <input
                    type="text"
                    value={editMeta.signer}
                    onChange={(e) => setEditMeta({ ...editMeta, signer: e.target.value })}
                    placeholder="VD: Nguyễn Văn A - Chủ tịch"
                    style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                  />
                </div>
              </div>

              {/* Toàn văn nội dung OCR */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                  <span>Toàn văn nội dung OCR (Bản dịch dạng chữ UTF-8):</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{editMeta.fullText.length} ký tự</span>
                </label>
                <textarea
                  value={editMeta.fullText}
                  onChange={(e) => setEditMeta({ ...editMeta, fullText: e.target.value })}
                  placeholder="Nội dung toàn văn văn bản bóc tách..."
                  style={{
                    flex: 1,
                    minHeight: 180,
                    width: "100%",
                    padding: "10px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    fontFamily: "Segoe UI, sans-serif",
                    lineHeight: 1.6,
                    resize: "none"
                  }}
                />
              </div>

              {/* Ghi chú kiểm duyệt */}
              <div style={{ marginTop: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                  Ghi chú của người kiểm duyệt (tùy chọn):
                </label>
                <input
                  type="text"
                  value={editMeta.note}
                  onChange={(e) => setEditMeta({ ...editMeta, note: e.target.value })}
                  placeholder="VD: Đã đối chiếu dấu mộc và số hiệu khớp ảnh gốc..."
                  style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TỪ CHỐI / YÊU CẦU BỔ SUNG */}
      {showRejectModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999
        }}>
          <div style={{ background: "#ffffff", borderRadius: 10, padding: 24, width: 480, maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700, color: "#dc2626" }}>
              Từ chối / Yêu cầu bổ sung tài liệu #{selectedDocId}
            </h3>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={rejectNeedsSupplement}
                  onChange={(e) => setRejectNeedsSupplement(e.target.checked)}
                />
                <span style={{ fontWeight: 600, color: "#334155" }}>
                  Chỉ yêu cầu bổ sung (NEEDS_SUPPLEMENT thay vì REJECTED hoàn toàn)
                </span>
              </label>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Lý do từ chối / Nội dung cần bổ sung <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nêu rõ lý do (ví dụ: ảnh mờ góc dưới, thiếu con dấu cơ quan, trích yếu chưa đúng...)"
                style={{ width: "100%", padding: "10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#ffffff", cursor: "pointer" }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={actionLoading || !rejectReason.trim()}
                style={{
                  padding: "8px 18px",
                  borderRadius: 6,
                  border: "none",
                  background: actionLoading || !rejectReason.trim() ? "#94a3b8" : "#dc2626",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: actionLoading || !rejectReason.trim() ? "not-allowed" : "pointer"
                }}
              >
                {actionLoading ? "Đang xử lý..." : "Xác nhận gửi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
