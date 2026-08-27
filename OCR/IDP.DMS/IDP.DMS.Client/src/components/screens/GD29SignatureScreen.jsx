import { useState } from "react";
import { FileText, Edit, X } from "lucide-react";
import { GD2FeatureLayout } from "../shared/SharedComponents";

export default function GD29SignatureScreen() {
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
      featureId="GD2-9"
      featureName="Chữ ký số và ký điện tử"
      description="Tích hợp công nghệ ký số để phê duyệt tài liệu trực tuyến, giảm thiểu giấy tờ."
      actor="approve"
      actionBarLabel="Hàng chờ duyệt và xử lý hồ sơ"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="1fr 440px"
      leftPanelTitle="Danh sách chờ xử lý"
      rightPanelTitle="Chi tiết phê duyệt"
      actions={
        <>
          <button className="btn" style={{color: "#16a34a", borderColor: "#bbf7d0"}} onClick={() => alert("Duyệt")}>✓ Duyệt</button>
          <button className="btn" style={{color: "#d97706", borderColor: "#fde68a"}} onClick={() => alert("Chuyển cấp")}>Chuyển cấp</button>
          <button className="btn" style={{color: "#dc2626", borderColor: "#fecaca"}} onClick={() => alert("Từ chối/Hủy")}>Từ chối/Hủy</button>
        </>
      }
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}
