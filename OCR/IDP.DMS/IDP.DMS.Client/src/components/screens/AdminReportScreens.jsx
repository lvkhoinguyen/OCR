import { FileText, Home } from "lucide-react";
import { useCrud } from "../../hooks/useCrud";
import { emptySimple } from "../../utils/constants";
import { CrudScreen } from "../shared/CrudComponents";
import { PanelTitle, Metric } from "../shared/SharedComponents";

export function ReportCrudScreen() {
  const crud = useCrud("reports", emptySimple);
  return (
    <CrudScreen
      title="Khai báo / xuất báo cáo"
      icon={<FileText />}
      crud={crud}
      columns={[
        ["code", "Mã báo cáo"],
        ["name", "Tên báo cáo"],
        ["status", "Trạng thái"],
        ["extra1", "Loại dữ liệu"],
        ["extra2", "File mẫu"]
      ]}
      fields={[
        { key: "code", label: "Mã báo cáo", required: true },
        { key: "name", label: "Tên báo cáo", required: true },
        { key: "status", label: "Trạng thái", type: "select", options: ["ACTIVE", "INACTIVE"] },
        { key: "description", label: "Mô tả", type: "textarea" },
        { key: "extra1", label: "Loại dữ liệu trả về" },
        { key: "extra2", label: "Tên file mẫu" },
        { key: "date1", label: "Từ ngày", type: "date" },
        { key: "date2", label: "Đến ngày", type: "date" }
      ]}
    />
  );
}

export function ReportScreen() {
  return (
    <section className="panel">
      <PanelTitle icon={<FileText />} title="Báo cáo thống kê" />
      <div className="report-grid">
        <Metric label="Hồ sơ" value="Theo DB" />
        <Metric label="Tài liệu OCR" value="Theo DB" />
        <Metric label="Phiếu mượn" value="Theo DB" />
      </div>
      <p className="muted">Các báo cáo sẽ tổng hợp từ bảng DMS_DOSSIERS, DMS_DOCUMENTS và DMS_BORROW_REQUESTS.</p>
    </section>
  );
}

export function AdminScreen({ title }) {
  return (
    <section className="panel">
      <PanelTitle icon={<Home />} title={title} />
      <p className="muted">Màn hình quản trị dùng chung. Các danh mục nghiệp vụ có thể cấu hình tiếp thành bảng riêng khi chốt mô hình dữ liệu chi tiết.</p>
    </section>
  );
}

export default AdminScreen;
