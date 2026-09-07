import { useCrud, extraLabel1, extraLabel2 } from "../../hooks/useCrud";
import { emptySimple } from "../../utils/constants";
import { CrudScreen, iconFor } from "../shared/CrudComponents";

export function SimpleResourceScreen({ title, resource, group }) {
  const crud = useCrud(resource, emptySimple);
  const isDossierTypes = resource === "dossier-types";

  const columns = isDossierTypes
    ? [
        ["code", "Mã loại"],
        ["name", "Tên loại hồ sơ"],
        ["extra1", "Thời hạn bảo quản"],
        ["status", "Trạng thái"],
        ["description", "Mô tả / Ghi chú"]
      ]
    : [
        ["code", "Mã"],
        ["name", "Tên"],
        ["parentId", "ID cha"],
        ["status", "Trạng thái"],
        ["extra1", "Thông tin 1"],
        ["extra2", "Thông tin 2"]
      ];

  const fields = isDossierTypes
    ? [
        { key: "code", label: "Mã loại hồ sơ (*)", required: true, placeholder: "Ví dụ: HS-DUAN" },
        { key: "name", label: "Tên loại hồ sơ (*)", required: true, placeholder: "Ví dụ: Hồ sơ dự án" },
        {
          key: "extra1",
          label: "Thời hạn bảo quản (*)",
          type: "select",
          options: [
            { value: "Vĩnh viễn", label: "Vĩnh viễn" },
            { value: "5 năm", label: "5 năm" },
            { value: "10 năm", label: "10 năm" },
            { value: "20 năm", label: "20 năm" },
            { value: "50 năm", label: "50 năm" }
          ],
          placeholder: "-- Chọn thời hạn bảo quản --",
          required: true
        },
        {
          key: "status",
          label: "Trạng thái",
          type: "select",
          options: [
            { value: "ACTIVE", label: "Đang hoạt động" },
            { value: "INACTIVE", label: "Ngừng hoạt động" }
          ]
        },
        { key: "description", label: "Mô tả / Ghi chú", type: "textarea", placeholder: "Ghi chú thêm về loại hồ sơ..." }
      ]
    : [
        { key: "code", label: "Mã", required: true },
        { key: "name", label: "Tên", required: true },
        { key: "parentId", label: "ID cha", type: "number" },
        { key: "status", label: "Trạng thái", type: "select", options: ["ACTIVE", "INACTIVE", "PENDING", "APPROVED", "REJECTED"] },
        { key: "description", label: "Mô tả", type: "textarea" },
        { key: "extra1", label: extraLabel1(resource) },
        { key: "extra2", label: extraLabel2(resource) },
        { key: "date1", label: "Từ ngày", type: "date" },
        { key: "date2", label: "Đến ngày", type: "date" }
      ];

  return (
    <CrudScreen
      title={title}
      icon={iconFor(group)}
      crud={crud}
      columns={columns}
      fields={fields}
    />
  );
}

export default SimpleResourceScreen;
