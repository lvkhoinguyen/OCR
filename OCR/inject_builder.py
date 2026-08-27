import re

app_path = r"d:\Hacom\OCR\OCR\IDP.DMS\IDP.DMS.Client\src\App.jsx"

with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Workflow Builder to imports
content = re.sub(r'(\s+X\n\} from "lucide-react";)', r'\n  Settings,\n  GitMerge\1', content)

# 2. Update itemResourceMap and router
item_res = """  "Danh mục mục lục": "catalog-indexes",
  "Tùy chỉnh Giao diện & Quy trình": "workflow-builder",
  "Tích hợp phần mềm ngoài": "integration-screen","""
content = re.sub(r'  "Danh mục mục lục": "catalog-indexes",\n\s+"Tích hợp phần mềm ngoài": "integration-screen",', item_res, content)

router_old = """          {activeResource === "integration-screen" && <IntegrationScreen />}"""
router_new = """          {activeResource === "integration-screen" && <IntegrationScreen />}
          {activeResource === "workflow-builder" && <WorkflowBuilderScreen />}"""
content = content.replace(router_old, router_new)

# 3. Add WorkflowBuilderScreen component
builder_code = """

function WorkflowBuilderScreen() {
  const [activeTab, setActiveTab] = useState("ui");
  const [layout, setLayout] = useState("standard");
  const [themeColor, setThemeColor] = useState("#0ea5e9");

  return (
    <section className="panel">
      <PanelTitle icon={<Settings />} title="Tùy chỉnh Giao diện & Quy trình (Workflow Builder)" />
      <p className="muted" style={{ marginBottom: 20 }}>
        Tính năng cấu hình nâng cao dành cho Quản trị viên, cho phép thay đổi giao diện hiển thị và thiết kế luồng trình duyệt công việc (Workflow) mà không cần can thiệp vào mã nguồn (No-Code).
      </p>

      <div style={{ display: "flex", gap: 10, borderBottom: "1px solid #e2e8f0", paddingBottom: 10, marginBottom: 20 }}>
        <button 
          className={`btn ${activeTab === "ui" ? "primary" : ""}`} 
          onClick={() => setActiveTab("ui")}
        >
          Tùy chỉnh Giao diện
        </button>
        <button 
          className={`btn ${activeTab === "workflow" ? "primary" : ""}`} 
          onClick={() => setActiveTab("workflow")}
        >
          Thiết kế Quy trình (Workflow)
        </button>
      </div>

      {activeTab === "ui" && (
        <div style={{ padding: 20, border: "1px dashed #cbd5e1", borderRadius: 8, backgroundColor: "#f8fafc" }}>
          <h4>⚙️ Thiết lập Giao diện hiển thị</h4>
          <div className="field" style={{ marginTop: 15 }}>
            <span>Màu sắc chủ đạo (Theme)</span>
            <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} style={{ width: 60, height: 40, padding: 0 }} />
          </div>
          <div className="field">
            <span>Bố cục (Layout)</span>
            <select value={layout} onChange={(e) => setLayout(e.target.value)}>
              <option value="standard">Tiêu chuẩn (Menu trái, Nội dung phải)</option>
              <option value="compact">Nhỏ gọn (Thích hợp cho màn hình nhỏ)</option>
              <option value="fluid">Toàn màn hình (Mở rộng tối đa)</option>
            </select>
          </div>
          <div className="field">
            <span>Logo Đơn vị</span>
            <input type="file" accept="image/*" />
          </div>
          <button className="btn ok" onClick={() => alert("Đã lưu cấu hình giao diện!")}>Lưu thiết lập</button>
        </div>
      )}

      {activeTab === "workflow" && (
        <div style={{ padding: 20, border: "1px dashed #cbd5e1", borderRadius: 8, backgroundColor: "#f8fafc" }}>
          <h4>🔄 Workflow Builder (Mô phỏng)</h4>
          <p className="muted">Kéo thả các bước để định nghĩa quy trình luân chuyển tài liệu.</p>
          
          <div style={{ display: "flex", alignItems: "center", gap: 15, margin: "20px 0" }}>
            <div style={{ padding: "10px 20px", background: "#fff", border: "2px solid #94a3b8", borderRadius: 8, fontWeight: "bold" }}>
              Bước 1: Soạn thảo (Nhân viên)
            </div>
            <GitMerge size={20} color="#64748b" />
            <div style={{ padding: "10px 20px", background: "#fff", border: "2px solid #0ea5e9", borderRadius: 8, fontWeight: "bold" }}>
              Bước 2: Phê duyệt (Trưởng phòng)
            </div>
            <GitMerge size={20} color="#64748b" />
            <div style={{ padding: "10px 20px", background: "#fff", border: "2px solid #22c55e", borderRadius: 8, fontWeight: "bold", color: "#22c55e" }}>
              Bước 3: Ký số & Ban hành (Giám đốc)
            </div>
          </div>
          
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn primary">+ Thêm bước mới</button>
            <button className="btn warn">Chỉnh sửa điều kiện rẽ nhánh</button>
            <button className="btn ok" onClick={() => alert("Đã lưu luồng quy trình mới!")}>Lưu Quy trình</button>
          </div>
        </div>
      )}
    </section>
  );
}
"""

content = content.replace("export default function App() {", builder_code + "\nexport default function App() {")

with open(app_path, "w", encoding="utf-8") as f:
    f.write(content)
