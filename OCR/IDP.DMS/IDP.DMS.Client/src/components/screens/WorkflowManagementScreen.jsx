import { useState } from "react";
import {
  GitMerge,
  User,
  Clock,
  ChevronRight,
  Eye,
  CheckCircle2,
  X,
} from "lucide-react";
import { PanelTitle, StatusBadge } from "../shared/SharedComponents";

export default function WorkflowManagementScreen() {
  const INIT_TASKS = [
    { id: 1, code: "WF-001", name: "Duyệt hồ sơ nhân sự", assignee: "Trần Thị B", deadline: "2026-07-30", status: "PENDING", priority: "HIGH", step: "Phê duyệt" },
    { id: 2, code: "WF-002", name: "Xác nhận hợp đồng mua sắm", assignee: "Nguyễn Văn A", deadline: "2026-07-28", status: "IN_PROGRESS", priority: "MEDIUM", step: "Kiểm tra" },
    { id: 3, code: "WF-003", name: "Ban hành quyết định số 15/QĐ", assignee: "Lê Minh C", deadline: "2026-07-25", status: "DONE", priority: "HIGH", step: "Ký số" },
    { id: 4, code: "WF-004", name: "Lưu trữ tài liệu dự án X", assignee: "Phạm Thị D", deadline: "2026-08-05", status: "PENDING", priority: "LOW", step: "Soạn thảo" },
    { id: 5, code: "WF-005", name: "Ký số bảng lương tháng 7", assignee: "Hoàng Văn E", deadline: "2026-07-31", status: "PENDING", priority: "HIGH", step: "Phê duyệt" },
  ];

  const [tasks, setTasks] = useState(INIT_TASKS);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [viewTask, setViewTask] = useState(null);
  const [processNote, setProcessNote] = useState("");
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [processAction, setProcessAction] = useState("APPROVED");

  const filtered = filterStatus === "ALL" ? tasks : tasks.filter(t => t.status === filterStatus);

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === "PENDING").length,
    inProgress: tasks.filter(t => t.status === "IN_PROGRESS").length,
    done: tasks.filter(t => t.status === "DONE").length,
  };

  const openProcess = (id, action) => {
    setProcessingId(id);
    setProcessAction(action);
    setProcessNote("");
    setShowProcessModal(true);
  };

  const handleProcess = () => {
    setTasks(prev => prev.map(t =>
      t.id === processingId
        ? { ...t, status: processAction === "APPROVED" ? "DONE" : "REJECTED" }
        : t
    ));
    setShowProcessModal(false);
    alert(`Đã ${processAction === "APPROVED" ? "phê duyệt" : "từ chối"} công việc thành công!${processNote ? "\nGhi chú: " + processNote : ""}`);
  };

  const priorityColor = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#22c55e" };

  return (
    <section className="panel">
      <PanelTitle icon={<GitMerge />} title="GD2-2: Quản lý quy trình làm việc" />
      <p className="muted" style={{marginBottom:16}}>Theo dõi và xử lý các công việc trong quy trình luân chuyển tài liệu.</p>

      {/* Stats */}
      <div className="workflow-stats">
        {[{label:"Tổng công việc",val:stats.total,color:"#3264f4"},{label:"Chờ xử lý",val:stats.pending,color:"#f59e0b"},{label:"Đang thực hiện",val:stats.inProgress,color:"#7c3aed"},{label:"Hoàn thành",val:stats.done,color:"#22c55e"}].map(s => (
          <div key={s.label} className="wf-stat-card" style={{borderTop:`3px solid ${s.color}`}}>
            <strong style={{fontSize:26,color:s.color}}>{s.val}</strong>
            <span className="muted">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Bộ lọc */}
      <div style={{display:"flex", gap:8, marginBottom:14, flexWrap:"wrap"}}>
        {["ALL","PENDING","IN_PROGRESS","DONE"].map(s => (
          <button key={s} className={`btn ${filterStatus===s?"primary":""}`} onClick={() => setFilterStatus(s)}>
            {s === "ALL" ? "Tất cả" : s === "PENDING" ? "Chờ" : s === "IN_PROGRESS" ? "Đang xử lý" : "Xong"}
          </button>
        ))}
      </div>

      {/* Timeline tasks */}
      <div className="workflow-task-list">
        {filtered.map(task => (
          <div key={task.id} className={`wf-task-card ${task.status.toLowerCase().replace("_","-")}`}>
            <div className="wf-task-left">
              <div className="wf-task-code">{task.code}</div>
              <div className="wf-task-name">{task.name}</div>
              <div className="wf-task-meta">
                <span><User size={11}/> {task.assignee}</span>
                <span><Clock size={11}/> Hạn: {task.deadline}</span>
                <span><ChevronRight size={11}/> Bước: <strong>{task.step}</strong></span>
                <span style={{color: priorityColor[task.priority], fontWeight:700, fontSize:11}}>Ưu tiên {task.priority}</span>
              </div>
            </div>
            <div className="wf-task-right">
              <StatusBadge status={task.status}/>
              <div style={{display:"flex", gap:6, marginTop:8}}>
                {task.status !== "DONE" && (
                  <>
                    <button className="btn ok" style={{fontSize:11,padding:"3px 8px"}} onClick={() => openProcess(task.id, "APPROVED")}>Duyệt</button>
                    <button className="btn warn" style={{fontSize:11,padding:"3px 8px"}} onClick={() => openProcess(task.id, "REJECTED")}>Từ chối</button>
                  </>
                )}
                <button className="icon-btn" onClick={() => setViewTask(task)} title="Xem chi tiết"><Eye size={13}/></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="empty-cell" style={{padding:30,textAlign:"center"}}>Không có công việc nào.</div>}
      </div>

      {/* Modal duyệt/xử lý */}
      {showProcessModal && (
        <div className="modal-overlay" onClick={() => setShowProcessModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:440}}>
            <div className="modal-header">
              <div className="modal-icon-wrap" style={{background: processAction === "APPROVED" ? "#16a34a" : "#dc2626"}}>
                {processAction === "APPROVED" ? <CheckCircle2 size={22} color="#fff"/> : <X size={22} color="#fff"/>}
              </div>
              <div>
                <h3>{processAction === "APPROVED" ? "Phê duyệt công việc" : "Từ chối công việc"}</h3>
                <p className="muted">Công việc: <strong>{tasks.find(t => t.id === processingId)?.name}</strong></p>
              </div>
            </div>
            <div className="field" style={{marginTop:16}}>
              <span>Ghi chú xử lý</span>
              <textarea value={processNote} onChange={e => setProcessNote(e.target.value)} rows={3} placeholder={processAction === "APPROVED" ? "Ghi chú phê duyệt (tùy chọn)" : "Lý do từ chối (bắt buộc)"} />
            </div>
            <div className="modal-actions" style={{marginTop:16}}>
              <button className={`btn ${processAction === "APPROVED" ? "ok" : "danger"}`} onClick={handleProcess}>
                {processAction === "APPROVED" ? "Xác nhận duyệt" : "Xác nhận từ chối"}
              </button>
              <button className="btn" onClick={() => setShowProcessModal(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xem chi tiết task */}
      {viewTask && (
        <div className="modal-overlay" onClick={() => setViewTask(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:520}}>
            <div className="modal-header">
              <div className="modal-icon-wrap" style={{background:"#3264f4"}}><GitMerge size={22} color="#fff"/></div>
              <div><h3>Chi tiết công việc #{viewTask.code}</h3><p className="muted">Thông tin quy trình</p></div>
            </div>
            <div className="detail-grid" style={{marginTop:16}}>
              <div className="detail-row"><span>Tên công việc</span><strong>{viewTask.name}</strong></div>
              <div className="detail-row"><span>Người phụ trách</span><strong>{viewTask.assignee}</strong></div>
              <div className="detail-row"><span>Bước hiện tại</span><strong>{viewTask.step}</strong></div>
              <div className="detail-row"><span>Hạn xử lý</span><strong>{viewTask.deadline}</strong></div>
              <div className="detail-row"><span>Ưu tiên</span><strong style={{color: priorityColor[viewTask.priority]}}>{viewTask.priority}</strong></div>
              <div className="detail-row"><span>Trạng thái</span><StatusBadge status={viewTask.status}/></div>
            </div>
            <div className="wf-timeline" style={{marginTop:16}}>
              <h4 style={{marginBottom:8}}>Lịch sử quy trình</h4>
              {["Soạn thảo","Kiểm tra","Phê duyệt","Ký số","Ban hành"].map((step, i) => (
                <div key={step} className="wf-timeline-step">
                  <div className={`wf-step-dot ${i < 3 ? "done" : ""}`}/>
                  <span style={{fontSize:13, color: i < 3 ? "var(--ink)" : "var(--muted)"}}>{step}</span>
                  {i < 3 && <span className="muted" style={{fontSize:11, marginLeft:"auto"}}>Hoàn thành</span>}
                </div>
              ))}
            </div>
            <div className="modal-actions" style={{marginTop:20}}>
              {viewTask.status !== "DONE" && (
                <button className="btn ok" onClick={() => { setViewTask(null); openProcess(viewTask.id, "APPROVED"); }}>Duyệt ngay</button>
              )}
              <button className="btn" onClick={() => setViewTask(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
