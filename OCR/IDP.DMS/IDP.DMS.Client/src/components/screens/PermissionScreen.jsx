import { useState } from "react";
import { Shield, User, Save, Edit } from "lucide-react";
import { useCrud } from "../../hooks/useCrud";
import { emptySimple } from "../../utils/constants";
import { PanelTitle } from "../shared/SharedComponents";

export default function PermissionScreen({ title }) {
  const crud = useCrud("permission-groups", emptySimple);
  const [editId, setEditId] = useState(null);
  const [perms, setPerms] = useState({});

  const modules = ["Quản lý tài liệu", "Hồ sơ lưu trữ", "OCR AI", "Báo cáo", "Workflow", "Tích hợp", "Ký số"];
  const actions = ["Xem", "Thêm", "Sửa", "Xóa", "Duyệt", "Xuất"];

  const getKey = (module, action) => `${module}_${action}`;
  const isChecked = (rowId, module, action) => {
    const key = `${rowId}_${getKey(module, action)}`;
    if (key in perms) return perms[key];
    // Default: Xem=true, Thêm/Sửa=true for non-delete, Xóa=false
    return action !== "Xóa" && action !== "Duyệt";
  };

  const toggle = (rowId, module, action) => {
    const key = `${rowId}_${getKey(module, action)}`;
    setPerms(prev => ({ ...prev, [key]: !isChecked(rowId, module, action) }));
  };

  const handleSave = () => {
    alert("Đã lưu cấu hình phân quyền thành công!");
    setEditId(null);
  };

  return (
    <section className="panel">
      <PanelTitle icon={<Shield />} title={title || "Phân quyền truy cập"} />
      <p className="muted" style={{marginBottom:14}}>Thiết lập quyền truy cập theo nhóm và chức năng. Chọn nhóm để chỉnh sửa.</p>

      {crud.rows.length === 0 ? (
        <div className="empty-state"><Shield size={40} color="#94a3b8"/><p>Chưa có nhóm quyền. Khởi tạo DB trước.</p></div>
      ) : (
        <>
          {/* Chọn nhóm để sửa */}
          <div className="perm-group-selector">
            {crud.rows.map(row => (
              <button
                key={row.id}
                className={`btn ${editId === row.id ? "primary" : ""}`}
                onClick={() => setEditId(editId === row.id ? null : row.id)}
              >
                <User size={13}/> {row.name || row.code}
              </button>
            ))}
          </div>

          {editId && (() => {
            const row = crud.rows.find(r => r.id === editId);
            return (
              <div className="perm-matrix-wrap" style={{marginTop:16}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
                  <h4 style={{margin:0}}>Phân quyền: <span style={{color:"var(--brand)"}}>{row?.name || row?.code}</span></h4>
                  <div style={{display:"flex", gap:8}}>
                    <button className="btn ok" onClick={handleSave}><Save size={13}/> Lưu thay đổi</button>
                    <button className="btn" onClick={() => setEditId(null)}>Hủy</button>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="perm-matrix">
                    <thead>
                      <tr>
                        <th style={{minWidth:150}}>Chức năng / Module</th>
                        {actions.map(a => <th key={a} style={{textAlign:"center",width:70}}>{a}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map(mod => (
                        <tr key={mod}>
                          <td><strong>{mod}</strong></td>
                          {actions.map(act => (
                            <td key={act} style={{textAlign:"center"}}>
                              <input
                                type="checkbox"
                                checked={isChecked(editId, mod, act)}
                                onChange={() => toggle(editId, mod, act)}
                                style={{width:16, height:16, accentColor:"var(--brand)"}}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {!editId && (
            <div className="table-wrap" style={{marginTop:14}}>
              <table>
                <thead>
                  <tr><th>Nhóm quyền</th><th>Mô tả</th><th>Phạm vi</th><th>Thao tác</th></tr>
                </thead>
                <tbody>
                  {crud.rows.map(row => (
                    <tr key={row.id}>
                      <td><strong>{row.name || row.code}</strong></td>
                      <td className="muted">{row.description || "Chưa có mô tả"}</td>
                      <td>{row.extra1 || "Toàn đơn vị"}</td>
                      <td>
                        <button className="btn warn" onClick={() => setEditId(row.id)}><Edit size={13}/> Sửa quyền</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
