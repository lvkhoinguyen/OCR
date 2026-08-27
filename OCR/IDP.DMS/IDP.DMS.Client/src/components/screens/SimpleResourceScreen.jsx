import { useCrud, extraLabel1, extraLabel2 } from "../../hooks/useCrud";
import { emptySimple } from "../../utils/constants";
import { CrudScreen, iconFor } from "../shared/CrudComponents";

export function SimpleResourceScreen({ title, resource, group }) {
  const crud = useCrud(resource, emptySimple);
  return (
    <CrudScreen
      title={title}
      icon={iconFor(group)}
      crud={crud}
      columns={[
        ["code", "Mã"],
        ["name", "Tên"],
        ["parentId", "ID cha"],
        ["status", "Trạng thái"],
        ["extra1", "Thông tin 1"],
        ["extra2", "Thông tin 2"]
      ]}
      fields={[
        { key: "code", label: "Mã", required: true },
        { key: "name", label: "Tên", required: true },
        { key: "parentId", label: "ID cha", type: "number" },
        { key: "status", label: "Trạng thái", type: "select", options: ["ACTIVE", "INACTIVE", "PENDING", "APPROVED", "REJECTED"] },
        { key: "description", label: "Mô tả", type: "textarea" },
        { key: "extra1", label: extraLabel1(resource) },
        { key: "extra2", label: extraLabel2(resource) },
        { key: "date1", label: "Từ ngày", type: "date" },
        { key: "date2", label: "Đến ngày", type: "date" }
      ]}
    />
  );
}

export default SimpleResourceScreen;
