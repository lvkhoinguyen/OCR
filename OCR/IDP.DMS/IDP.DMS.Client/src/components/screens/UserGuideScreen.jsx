import { useState, useMemo } from "react";
import {
  BookOpen,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Archive,
  FileText,
  Search,
  Activity,
  Settings,
  ChevronRight,
  Download,
  Upload,
  RefreshCw,
  X,
  Layers3,
  FileSearch,
  Clock,
  ShieldCheck,
  Cpu,
  UserCheck,
  QrCode,
  PenTool,
  Printer,
  MousePointer,
  Sparkles,
  ArrowRight
} from "lucide-react";

export default function UserGuideScreen({ onNavigate }) {
  const [activeTab, setActiveTab] = useState("ocr-help");
  const [activeRole, setActiveRole] = useState("entry"); // "entry" | "approver" | "reader"
  const [searchQuery, setSearchQuery] = useState("");

  const faqsNonTech = [
    {
      q: "Tại sao tôi bấm nút Chạy OCR AI mà máy cứ quay vòng tròn mãi không xong?",
      a: "Nguyên nhân rất đơn giản: Khi bạn chọn chế độ 'Gemini Vision AI', hệ thống cần kết nối mạng Internet ra ngoài máy chủ AI của Google. Nếu mạng cơ quan hôm đó bị yếu, chập chờn hoặc có tường lửa bảo mật chặn, tiến trình sẽ bị chờ lâu. Cách xử lý ngay: Bấm nút đỏ [✕ Hủy chờ OCR] để ngắt chờ, sau đó bấm vào ô bên cạnh chọn dòng 'Tesseract OCR' hoặc 'VietOCR' rồi bấm Chạy lại: máy sẽ đọc chữ cực nhanh trong 1-2 giây bằng bộ đọc có sẵn trong máy tính mà không cần mạng Internet!"
    },
    {
      q: "Nếu máy đọc chữ không ra hoặc ra thiếu chữ thì tôi phải làm sao?",
      a: "Bạn hoàn toàn KHÔNG CẦN CHỜ máy đọc! Bạn chỉ việc nhìn văn bản gốc ở khung bên trái, sau đó dùng chuột bấm vào các ô bên phải (Số hiệu, Ngày ban hành, Cơ quan, Trích yếu, Người ký) và gõ trực tiếp nội dung đúng vào, rồi bấm nút [✓ Xác nhận & Lưu]. Hệ thống luôn ưu tiên thông tin do chính tay bạn kiểm tra và lưu lại."
    },
    {
      q: "Tính năng 'Khoanh vùng (Zonal OCR)' dùng để làm gì và dùng thế nào?",
      a: "Rất tiện lợi khi văn bản có chữ mờ hoặc bạn chỉ cần đọc nhanh 1 ô (ví dụ chỉ cần lấy Số quyết định hoặc tên Người ký). Cách dùng: Bấm nút [Khoanh vùng Zonal OCR] ở góc trên ảnh ➔ Dùng chuột quét 1 ô vuông quanh dòng chữ bạn cần ➔ Bấm [Bóc tách vùng đã chọn]: chữ trong ô đó sẽ tự động nhảy vào đúng ô thông tin bên phải!"
    },
    {
      q: "Sau khi bóc tách xong, làm sao để chuyển hồ sơ cho sếp duyệt?",
      a: "Sau khi bạn đối soát các ô thông tin bên phải thấy đã chuẩn xác, bạn chỉ cần bấm nút màu xanh dương [🚀 Lưu & Gửi kiểm duyệt]. Hồ sơ sẽ tự động chuyển sang trạng thái 'Chờ duyệt' và ngay lập tức xuất hiện trên màn hình làm việc của Cán bộ kiểm duyệt / Lãnh đạo."
    },
    {
      q: "Tôi muốn in mã vạch hoặc mã QR để dán lên bìa hồ sơ/hộp hồ sơ thì bấm vào đâu?",
      a: "Ở bất kỳ màn hình nào (Quản lý Kho, Danh mục Hồ sơ hay Bóc tách văn bản), bạn chỉ cần bấm vào nút [In nhãn] có biểu tượng mã QR. Một cửa sổ mẫu in tem chuẩn kích thước sẽ hiện lên, bạn bấm [In ngay] để in ra máy in tem dán lên hồ sơ."
    },
    {
      q: "Ảnh chụp hoặc file scan tải lên hệ thống như thế nào là chuẩn nhất?",
      a: "Bạn nên scan văn bản ở độ phân giải 200 DPI hoặc 300 DPI, xoay đúng chiều thẳng đứng, lưu dưới dạng file PDF, JPG hoặc PNG (dung lượng khoảng 1MB đến 3MB). Tránh chụp ảnh bị nghiêng, bóng ngón tay hoặc quá tối để máy nhận diện chữ đạt độ chính xác cao nhất."
    }
  ];

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqsNonTech;
    const q = searchQuery.toLowerCase();
    return faqsNonTech.filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  }, [searchQuery, faqsNonTech]);

  return (
    <div className="user-guide-screen" style={{ padding: "20px 24px", maxWidth: "1200px", margin: "0 auto", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header Banner thân thiện */}
      <div style={{
        background: "linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)",
        borderRadius: "14px",
        padding: "24px 30px",
        color: "#fff",
        boxShadow: "0 10px 25px rgba(37, 99, 235, 0.25)",
        marginBottom: "22px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255,255,255,0.2)",
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "12.5px",
              fontWeight: 600,
              marginBottom: "10px",
              backdropFilter: "blur(4px)"
            }}>
              <Sparkles size={14} color="#fef08a" /> Sổ tay Hướng dẫn Văn phòng (Dễ hiểu & Cầm tay chỉ việc)
            </div>
            <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 800, letterSpacing: "-0.3px" }}>
              Hướng dẫn Sử dụng Hệ thống Quản lý & Số hóa Hồ sơ IDP.DMS
            </h1>
            <p style={{ margin: 0, opacity: 0.95, fontSize: "14px", maxWidth: "750px", lineHeight: 1.5 }}>
              Tài liệu viết riêng cho người dùng nghiệp vụ, cán bộ văn thư, chuyên viên số hóa và lãnh đạo duyệt hồ sơ. Không dùng thuật ngữ công nghệ phức tạp.
            </p>
          </div>
          <button
            className="btn"
            onClick={() => window.print()}
            style={{
              background: "#fff",
              color: "#1e40af",
              fontWeight: 700,
              border: "none",
              padding: "9px 16px",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Printer size={16} /> In sổ tay ra giấy
          </button>
        </div>

        {/* 3 Tab chính trực quan */}
        <div style={{ display: "flex", gap: "10px", marginTop: "22px", flexWrap: "wrap" }}>
          {[
            { id: "ocr-help", label: "🚨 Xử lý khi Bóc tách OCR quay tròn / Chạy lâu", icon: Zap, highlight: true },
            { id: "daily-flow", label: "📋 Hướng dẫn làm việc theo vai trò công việc", icon: MousePointer, highlight: false },
            { id: "faq", label: "❓ Câu hỏi thường gặp & Mẹo vặt văn phòng", icon: HelpCircle, highlight: false }
          ].map(tab => {
            const IconComponent = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  borderRadius: "9px",
                  border: isCurrent ? "2px solid #fff" : "1px solid rgba(255,255,255,0.25)",
                  cursor: "pointer",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  transition: "all 0.15s ease",
                  background: isCurrent ? "#fff" : tab.highlight ? "rgba(239, 68, 68, 0.35)" : "rgba(255, 255, 255, 0.15)",
                  color: isCurrent ? (tab.highlight ? "#dc2626" : "#1e40af") : "#fff",
                  boxShadow: isCurrent ? "0 4px 14px rgba(0,0,0,0.15)" : "none"
                }}
              >
                <IconComponent size={16} color={isCurrent ? (tab.highlight ? "#dc2626" : "#1e40af") : "#fff"} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: CẤP CỨU KHI BÓC TÁCH OCR BỊ QUAY TRÒN / CHẠY MÃI KHÔNG XONG       */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === "ocr-help" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Hộp cảnh báo nguyên nhân */}
          <div style={{
            background: "#fffbeb",
            border: "1.5px solid #fcd34d",
            borderRadius: "12px",
            padding: "18px 22px",
            display: "flex",
            alignItems: "flex-start",
            gap: "14px"
          }}>
            <div style={{ background: "#f59e0b", color: "#fff", padding: "10px", borderRadius: "10px", flexShrink: 0 }}>
              <AlertTriangle size={26} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 800, color: "#92400e" }}>
                Tại sao máy đọc chữ (OCR) lại quay vòng tròn mãi không dừng?
              </h3>
              <p style={{ margin: 0, fontSize: "13.5px", color: "#78350f", lineHeight: 1.55 }}>
                Khi bạn bấm nút <strong>"Chạy OCR AI"</strong> ở chế độ mặc định (Gemini Vision AI), máy tính sẽ gửi ảnh văn bản lên mạng để AI của Google đọc chữ. Nếu <strong>mạng Internet của cơ quan đang chậm, chập chờn hoặc có tường lửa bảo mật chặn</strong>, màn hình sẽ bị quay tròn và chờ rất lâu.
              </p>
            </div>
          </div>

          {/* 4 Bước xử lý dứt điểm bằng ngôn ngữ văn phòng */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "16.5px", fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
              <Zap size={20} color="#eab308" /> 4 Cách xử lý tức thì khi gặp tình trạng này:
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              {/* Cách 1 */}
              <div style={{ background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: "10px", padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#b91c1c", fontWeight: 800, fontSize: "14px" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#b91c1c", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>1</span>
                  Cách 1: Bấm nút đỏ Hủy chờ
                </div>
                <div style={{ fontSize: "13px", color: "#7f1d1d", lineHeight: 1.6 }}>
                  <div>• <strong>Hàng 1</strong>: Khi thấy nút quay lâu, nhìn vào nút đó.</div>
                  <div>• <strong>Hàng 2</strong>: Nút đã chuyển thành chữ đỏ <strong>[✕ Hủy chờ OCR]</strong>.</div>
                  <div>• <strong>Hàng 3</strong>: Bấm thẳng vào nút đỏ đó: máy sẽ dừng chờ ngay mà không cần F5!</div>
                </div>
              </div>

              {/* Cách 2 */}
              <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: "10px", padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#15803d", fontWeight: 800, fontSize: "14px" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#15803d", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>2</span>
                  Cách 2: Đổi sang Tesseract / VietOCR
                </div>
                <div style={{ fontSize: "13px", color: "#14532d", lineHeight: 1.6 }}>
                  <div>• <strong>Hàng 1</strong>: Bấm vào ô danh sách bên cạnh nút chạy.</div>
                  <div>• <strong>Hàng 2</strong>: Chọn dòng <strong>"Tesseract OCR"</strong> hoặc <strong>"VietOCR"</strong>.</div>
                  <div>• <strong>Hàng 3</strong>: Bấm lại nút <strong>[⚡ Chạy OCR AI]</strong>: máy đọc ngay trong 1-2 giây!</div>
                </div>
              </div>

              {/* Cách 3 */}
              <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: "10px", padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#1d4ed8", fontWeight: 800, fontSize: "14px" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#1d4ed8", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>3</span>
                  Cách 3: Vẽ ô khoanh vùng (Zonal)
                </div>
                <div style={{ fontSize: "13px", color: "#1e3a8a", lineHeight: 1.6 }}>
                  <div>• <strong>Hàng 1</strong>: Bấm nút <strong>[Khoanh vùng Zonal OCR]</strong> phía trên ảnh.</div>
                  <div>• <strong>Hàng 2</strong>: Giữ chuột vẽ 1 ô vuông quanh góc Số hiệu hoặc chữ ký.</div>
                  <div>• <strong>Hàng 3</strong>: Bấm nút <strong>[Bóc tách vùng đã chọn]</strong> để đọc riêng ô đó.</div>
                </div>
              </div>

              {/* Cách 4 */}
              <div style={{ background: "#faf5ff", border: "1.5px solid #e9d5ff", borderRadius: "10px", padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#7e22ce", fontWeight: 800, fontSize: "14px" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#7e22ce", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>4</span>
                  Cách 4: Gõ tay vào ô và bấm Lưu
                </div>
                <div style={{ fontSize: "13px", color: "#581c87", lineHeight: 1.6 }}>
                  <div>• <strong>Hàng 1</strong>: Không cần chờ máy đọc nếu đang vội.</div>
                  <div>• <strong>Hàng 2</strong>: Nhìn ảnh bên trái, bấm chuột vào ô bên phải gõ trực tiếp.</div>
                  <div>• <strong>Hàng 3</strong>: Bấm nút màu xanh <strong>[✓ Xác nhận & Lưu]</strong> để lưu lại.</div>
                </div>
              </div>
            </div>

            {/* Nút bấm chuyển ngay */}
            {onNavigate && (
              <div style={{ marginTop: "22px", padding: "14px 18px", background: "#f8fafc", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <span style={{ fontSize: "13.5px", color: "#334155", fontWeight: 600 }}>
                  Bạn đang cần bóc tách văn bản ngay bây giờ?
                </span>
                <button
                  className="btn primary"
                  onClick={() => onNavigate("Chọn kho & Bóc tách dữ liệu", "Bóc tách văn bản AI")}
                  style={{ fontWeight: 700, padding: "8px 18px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Zap size={16} /> Mở màn hình Bóc tách văn bản AI ngay <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: HƯỚNG DẪN LÀM VIỆC THEO TỪNG VAI TRÒ CỤ THỂ                      */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === "daily-flow" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Bộ lọc chọn vai trò */}
          <div style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap"
          }}>
            <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#1e293b" }}>Chọn công việc của bạn:</span>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[
                { id: "entry", label: "👩‍💼 Chuyên viên Văn thư / Nhập liệu hồ sơ", icon: Archive },
                { id: "approver", label: "👨‍💼 Cán bộ Kiểm duyệt / Lãnh đạo ký số", icon: CheckCircle2 },
                { id: "reader", label: "📖 Độc giả / Người tìm kiếm & mượn hồ sơ", icon: Search }
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => setActiveRole(r.id)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: activeRole === r.id ? "2px solid #2563eb" : "1px solid #cbd5e1",
                    background: activeRole === r.id ? "#eff6ff" : "#fff",
                    color: activeRole === r.id ? "#1d4ed8" : "#475569",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nội dung vai trò 1: Văn thư / Nhập liệu */}
          {activeRole === "entry" && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "17px", fontWeight: 800, color: "#1e40af", display: "flex", alignItems: "center", gap: "8px" }}>
                <Archive size={20} /> Quy trình 4 bước hàng ngày dành cho Chuyên viên Văn thư & Nhập liệu
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Bước 1 */}
                <div style={{ display: "flex", gap: "14px", padding: "16px 18px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#0284c7", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>
                    1
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                      Bước 1: Tạo Hồ sơ lưu trữ mới và đính kèm văn bản scan
                    </h4>
                    <ul style={{ margin: "0 0 10px", paddingLeft: "20px", fontSize: "13.5px", color: "#334155", lineHeight: 1.75 }}>
                      <li><strong>Hàng 1</strong>: Nhìn lên Menu trên cùng, bấm chọn nhóm <strong>"Tạo kho & Thêm dữ liệu"</strong>.</li>
                      <li><strong>Hàng 2</strong>: Bấm chuột chọn dòng <strong>"Danh mục Hồ sơ lưu trữ"</strong>.</li>
                      <li><strong>Hàng 3</strong>: Bấm vào nút màu xanh <strong>[+ Tạo Hồ sơ]</strong> ở góc trái bảng.</li>
                      <li><strong>Hàng 4</strong>: Gõ <strong>Mã hồ sơ</strong> (Ví dụ: <code>HS-2026-01</code>) và <strong>Tên hồ sơ</strong> (Ví dụ: <code>Hồ sơ nghiệm thu dự án</code>).</li>
                      <li><strong>Hàng 5</strong>: Bấm vào ô Kho lưu trữ để chọn vị trí cất giữ (Ví dụ: <code>Kho tầng 2</code>) ➔ Bấm nút <strong>[Lưu]</strong>.</li>
                      <li><strong>Hàng 6</strong>: Bấm chuột vào hồ sơ vừa tạo trong danh sách ➔ Nhìn xuống bảng bên dưới bấm nút <strong>[+ Thêm tài liệu]</strong>.</li>
                      <li><strong>Hàng 7</strong>: Gõ tên tài liệu ➔ Bấm chọn tệp ảnh chụp scan hoặc file PDF trên máy tính ➔ Bấm nút <strong>[Lưu]</strong> để hoàn tất.</li>
                    </ul>
                    {onNavigate && (
                      <button className="btn" onClick={() => onNavigate("Tạo kho & Thêm dữ liệu", "Danh mục Hồ sơ lưu trữ")} style={{ fontSize: "12px", padding: "5px 12px", color: "#0284c7", fontWeight: 600 }}>
                        Bấm vào đây để mở màn hình Tạo Hồ sơ ➔
                      </button>
                    )}
                  </div>
                </div>

                {/* Bước 2 */}
                <div style={{ display: "flex", gap: "14px", padding: "16px 18px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#eab308", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>
                    2
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                      Bước 2: Bóc tách đọc chữ tự động (AI OCR) & Đối soát kiểm tra
                    </h4>
                    <ul style={{ margin: "0 0 10px", paddingLeft: "20px", fontSize: "13.5px", color: "#334155", lineHeight: 1.75 }}>
                      <li><strong>Hàng 1</strong>: Nhìn lên Menu trên cùng, bấm chọn nhóm <strong>"Chọn kho & Bóc tách dữ liệu"</strong>.</li>
                      <li><strong>Hàng 2</strong>: Bấm chuột chọn dòng <strong>"Bóc tách văn bản AI"</strong>.</li>
                      <li><strong>Hàng 3</strong>: Nhìn sang cột bên trái, bấm chọn Kho và bấm vào tên văn bản muốn đọc chữ.</li>
                      <li><strong>Hàng 4</strong>: Ảnh văn bản scan sẽ hiển thị to rõ nét ở khung chính giữa màn hình.</li>
                      <li><strong>Hàng 5</strong>: Bấm vào nút màu xanh dương có biểu tượng tia sét: <strong>[⚡ Chạy OCR AI]</strong>.</li>
                      <li><strong>Hàng 6</strong>: Máy tính tự động đọc ảnh và điền sẵn Số hiệu, Ngày tháng, Cơ quan, Người ký vào các ô bên phải.</li>
                      <li><strong>Hàng 7</strong>: Liếc mắt đối chiếu với ảnh bên trái, nếu máy đọc thiếu chữ nào thì bấm chuột vào ô đó gõ sửa lại bằng tay.</li>
                    </ul>
                    {onNavigate && (
                      <button className="btn" onClick={() => onNavigate("Chọn kho & Bóc tách dữ liệu", "Bóc tách văn bản AI")} style={{ fontSize: "12px", padding: "5px 12px", color: "#ca8a04", fontWeight: 600 }}>
                        Bấm vào đây để mở màn hình Bóc tách văn bản AI ➔
                      </button>
                    )}
                  </div>
                </div>

                {/* Bước 3 */}
                <div style={{ display: "flex", gap: "14px", padding: "16px 18px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#16a34a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>
                    3
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                      Bước 3: Lưu lại và Trình gửi duyệt hồ sơ lên Lãnh đạo
                    </h4>
                    <ul style={{ margin: "0 0 10px", paddingLeft: "20px", fontSize: "13.5px", color: "#334155", lineHeight: 1.75 }}>
                      <li><strong>Hàng 1</strong>: Sau khi kiểm tra các ô bên phải thấy thông tin đã chính xác 100%.</li>
                      <li><strong>Hàng 2</strong>: Nếu chỉ muốn lưu tạm để hôm sau làm tiếp: Bấm nút xanh lá <strong>[✓ Xác nhận & Lưu]</strong>.</li>
                      <li><strong>Hàng 3</strong>: Nếu đã làm xong muốn gửi sếp duyệt: Bấm nút màu xanh <strong>[🚀 Lưu & Gửi kiểm duyệt]</strong>.</li>
                      <li><strong>Hàng 4</strong>: Hồ sơ lập tức chuyển sang trạng thái "Chờ duyệt" và xuất hiện ngay trên máy tính của Lãnh đạo.</li>
                    </ul>
                  </div>
                </div>

                {/* Bước 4 */}
                <div style={{ display: "flex", gap: "14px", padding: "16px 18px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>
                    4
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                      Bước 4: In tem nhãn mã vạch Barcode dán lên bìa hồ sơ
                    </h4>
                    <ul style={{ margin: "0 0 10px", paddingLeft: "20px", fontSize: "13.5px", color: "#334155", lineHeight: 1.75 }}>
                      <li><strong>Hàng 1</strong>: Bấm vào nút có biểu tượng mã QR ghi chữ <strong>[In nhãn]</strong> ở góc trên bên phải.</li>
                      <li><strong>Hàng 2</strong>: Cửa sổ mẫu tem nhãn chuẩn mực hiện ra (gồm Tên hồ sơ, Vị trí kho, Mã vạch Barcode và QR Code).</li>
                      <li><strong>Hàng 3</strong>: Bấm nút <strong>[In ngay]</strong> để xuất lệnh in ra máy in tem.</li>
                      <li><strong>Hàng 4</strong>: Lấy tem dán lên bìa cặp hồ sơ hoặc mặt ngoài hộp lưu trữ giấy thực tế trong kho.</li>
                      <li><strong>Hàng 5</strong>: Sau này khi đi tìm hồ sơ, chỉ cần lấy máy quét mã vạch tít vào tem là phần mềm tự mở đúng văn bản!</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nội dung vai trò 2: Cán bộ Kiểm duyệt / Lãnh đạo */}
          {activeRole === "approver" && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "17px", fontWeight: 800, color: "#16a34a", display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={20} /> Quy trình từng hàng dành cho Cán bộ Kiểm duyệt & Lãnh đạo cơ quan
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ padding: "16px 18px", background: "#f0fdf4", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 700, color: "#15803d" }}>
                    1. Xem và kiểm tra hồ sơ cấp dưới gửi lên
                  </h4>
                  <ul style={{ margin: "0 0 10px", paddingLeft: "20px", fontSize: "13.5px", color: "#166534", lineHeight: 1.75 }}>
                    <li><strong>Hàng 1</strong>: Nhìn lên Menu trên cùng, bấm chọn nhóm <strong>"Kiểm duyệt văn bản đã tách"</strong>.</li>
                    <li><strong>Hàng 2</strong>: Bấm chuột chọn dòng <strong>"Hồ sơ chờ phê duyệt"</strong>.</li>
                    <li><strong>Hàng 3</strong>: Bấm vào từng hồ sơ trong danh sách để xem ảnh chụp văn bản gốc và các thông tin đã bóc tách.</li>
                  </ul>
                  {onNavigate && (
                    <button className="btn" onClick={() => onNavigate("Kiểm duyệt văn bản đã tách", "Hồ sơ chờ phê duyệt")} style={{ fontSize: "12px", padding: "5px 12px", color: "#15803d", fontWeight: 600 }}>
                      Mở Danh sách Hồ sơ chờ duyệt ➔
                    </button>
                  )}
                </div>

                <div style={{ padding: "16px 18px", background: "#fff7ed", borderRadius: "10px", border: "1px solid #fed7aa" }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 700, color: "#c2410c" }}>
                    2. Ra quyết định phê duyệt hoặc yêu cầu sửa đổi
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13.5px", color: "#7c2d12", lineHeight: 1.75 }}>
                    <li><strong>Hàng 1</strong>: <strong>Nếu hồ sơ đã chuẩn xác</strong>: Bấm nút màu xanh lá <strong>[✓ Phê duyệt]</strong> để hoàn tất xuất bản lưu trữ chính thức.</li>
                    <li><strong>Hàng 2</strong>: <strong>Nếu hồ sơ bị mờ, thiếu trang hoặc gõ sai</strong>: Bấm nút màu vàng <strong>[⚠️ Yêu cầu bổ sung]</strong>.</li>
                    <li><strong>Hàng 3</strong>: Gõ lời dặn vào ô hiện ra (Ví dụ: <em>"Scan lại trang 2 do mờ dấu đỏ"</em>) rồi bấm Gửi. Hồ sơ tự chuyển về cho văn thư sửa lại.</li>
                    <li><strong>Hàng 4</strong>: <strong>Nếu hồ sơ không đạt yêu cầu</strong>: Bấm nút màu đỏ <strong>[✕ Từ chối]</strong>.</li>
                  </ul>
                </div>

                <div style={{ padding: "16px 18px", background: "#eff6ff", borderRadius: "10px", border: "1px solid #bfdbfe" }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 700, color: "#1d4ed8" }}>
                    3. Ký số điện tử & Xem Dashboard Lãnh đạo
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13.5px", color: "#1e3a8a", lineHeight: 1.75 }}>
                    <li><strong>Hàng 1</strong>: Bấm Menu <strong>"Kiểm duyệt văn bản đã tách"</strong> ➔ Chọn dòng <strong>"Ký số văn bản"</strong>.</li>
                    <li><strong>Hàng 2</strong>: Bấm chọn văn bản PDF cần ký và bấm nút <strong>[Ký số điện tử]</strong> để đóng dấu thời gian bảo mật.</li>
                    <li><strong>Hàng 3</strong>: Muốn xem tiến độ số hóa toàn cơ quan: Bấm Menu <strong>"Báo cáo & Thống kê"</strong> ➔ Chọn <strong>"Dashboard tổng quan"</strong>.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Nội dung vai trò 3: Độc giả / Người tra cứu */}
          {activeRole === "reader" && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "17px", fontWeight: 800, color: "#8b5cf6", display: "flex", alignItems: "center", gap: "8px" }}>
                <Search size={20} /> Quy trình từng hàng dành cho Cán bộ Tra cứu & Mượn trả hồ sơ
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ padding: "16px 18px", background: "#faf5ff", borderRadius: "10px", border: "1px solid #e9d5ff" }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 700, color: "#7e22ce" }}>
                    1. Tìm kiếm vị trí văn bản cần dùng
                  </h4>
                  <ul style={{ margin: "0 0 10px", paddingLeft: "20px", fontSize: "13.5px", color: "#581c87", lineHeight: 1.75 }}>
                    <li><strong>Hàng 1</strong>: Nhìn lên Menu trên cùng, bấm chọn nhóm <strong>"Tra cứu & Mượn trả"</strong>.</li>
                    <li><strong>Hàng 2</strong>: Bấm chuột chọn dòng <strong>"Tìm kiếm hồ sơ"</strong>.</li>
                    <li><strong>Hàng 3</strong>: Gõ Số hiệu văn bản hoặc từ khóa bất kỳ vào ô tìm kiếm (Ví dụ: <code>nghiệm thu</code>, <code>123/QĐ</code>).</li>
                    <li><strong>Hàng 4</strong>: Bấm Enter hoặc bấm nút Tìm kiếm: Màn hình hiện ra vị trí chính xác của bản gốc: <strong>Kho nào - Kệ nào - Tầng nào - Hộp số mấy</strong>.</li>
                  </ul>
                  {onNavigate && (
                    <button className="btn" onClick={() => onNavigate("Tra cứu & Mượn trả", "Tìm kiếm hồ sơ")} style={{ fontSize: "12px", padding: "5px 12px", color: "#7e22ce", fontWeight: 600 }}>
                      Mở màn hình Tra cứu hồ sơ ➔
                    </button>
                  )}
                </div>

                <div style={{ padding: "16px 18px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                    2. Lập phiếu đăng ký mượn hồ sơ
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13.5px", color: "#334155", lineHeight: 1.75 }}>
                    <li><strong>Hàng 1</strong>: Tại dòng hồ sơ tìm được, bấm nút <strong>[Đăng ký mượn]</strong>.</li>
                    <li><strong>Hàng 2</strong>: Bấm chọn hình thức mượn: <em>"Bản mềm"</em> (để đọc trên máy tính) hoặc <em>"Bản cứng"</em> (để đến kho rút giấy gốc).</li>
                    <li><strong>Hàng 3</strong>: Nhập Ngày hẹn trả và Lý do mượn ➔ Bấm nút <strong>[Gửi yêu cầu mượn]</strong>.</li>
                    <li><strong>Hàng 4</strong>: Thủ kho mở mục <strong>"Duyệt phiếu mượn"</strong> bấm duyệt ➔ Bạn sẽ có quyền mở đọc văn bản ngay trên màn hình.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: CÂU HỎI THƯỜNG GẶP (FAQ BÌNH DÂN)                                */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === "faq" && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
              <HelpCircle size={20} color="#2563eb" /> Các câu hỏi thường gặp nhất khi sử dụng
            </h3>
            <div style={{ position: "relative", minWidth: "260px" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Gõ từ khóa cần hỏi..."
                style={{ width: "100%", padding: "8px 12px 8px 34px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
              <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredFaqs.map((item, idx) => (
              <div key={idx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px 20px" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: "14.5px", fontWeight: 700, color: "#1e40af" }}>
                  ❓ {item.q}
                </h4>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#334155", lineHeight: 1.6 }}>
                  {item.a}
                </p>
              </div>
            ))}
            {filteredFaqs.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                Không tìm thấy câu trả lời phù hợp với từ khóa "{searchQuery}".
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
