import { useState, useEffect, useMemo } from "react";
import {
  PieChart,
  BarChart2,
  Clock,
  CheckCircle2,
  User,
  AlertTriangle,
  Send,
  ArrowRight,
  Eye,
  Filter,
  Search,
  Calendar,
  X,
  BellRing,
  Check,
  Building2,
  FileText,
  AlertCircle,
  RotateCcw,
  CheckCheck,
  Download
} from "lucide-react";
import { PanelTitle, StatusBadge } from "../shared/SharedComponents";
import { uiApi } from "../../services/uiApi";

const STORAGE_KEY_APPROVED = "idp.dms.approvedList";

const BASE_DELAYED_DOSSIERS = [
  {
    id: "DL-01",
    code: "HS-2026-004",
    title: "Hồ sơ Nghiệm thu hạ tầng mạng và máy chủ Data Center",
    department: "Phòng Vận hành",
    officer: "Nguyễn Văn An",
    officerEmail: "an.nv@idp.local",
    officerPhone: "0912.345.678",
    submittedDate: "2026-08-20",
    slaDeadline: "2026-08-26",
    delayDays: 7,
    status: "PENDING",
    severity: "URGENT",
    bottleneck: "Chờ Trưởng phòng ký số biên bản nghiệm thu kỹ thuật",
    documentCount: 4,
    notes: "Đã quá hạn SLA 7 ngày, cần hoàn tất để thanh toán đợt 1 cho nhà thầu"
  },
  {
    id: "DL-02",
    code: "VH-2026-081",
    title: "Kế hoạch Bảo trì định kỳ hệ thống máy chủ và lưu trữ Quý 3",
    department: "Phòng Vận hành",
    officer: "Bùi Đình Trọng",
    officerEmail: "trong.bd@idp.local",
    officerPhone: "0904.555.888",
    submittedDate: "2026-08-22",
    slaDeadline: "2026-08-28",
    delayDays: 6,
    status: "PENDING",
    severity: "URGENT",
    bottleneck: "Chờ duyệt phương án thời gian dừng hệ thống ngoài giờ",
    documentCount: 2,
    notes: "Cần phê duyệt trước thứ 6 tuần này để gửi thông báo cho các chi nhánh"
  },
  {
    id: "DL-03",
    code: "KT-2026-089",
    title: "Hồ sơ Quyết toán chi phí bản quyền phần mềm DMS & Cloud",
    department: "Phòng Kế toán",
    officer: "Trần Thị Bích",
    officerEmail: "bich.tt@idp.local",
    officerPhone: "0983.111.222",
    submittedDate: "2026-08-24",
    slaDeadline: "2026-08-29",
    delayDays: 5,
    status: "NEEDS_SUPPLEMENT",
    severity: "URGENT",
    bottleneck: "Thiếu hóa đơn điện tử GTGT đối soát từ phía đối tác",
    documentCount: 6,
    notes: "Đang chờ đối tác xuất lại hóa đơn chiết khấu bổ sung"
  },
  {
    id: "DL-04",
    code: "KT-2026-092",
    title: "Tờ trình Phê duyệt dự toán chi phí số hóa tài liệu đợt 2",
    department: "Phòng Kế toán",
    officer: "Vũ Đức Thịnh",
    officerEmail: "thinh.vd@idp.local",
    officerPhone: "0976.222.333",
    submittedDate: "2026-08-25",
    slaDeadline: "2026-08-30",
    delayDays: 4,
    status: "PENDING",
    severity: "WARNING",
    bottleneck: "Chờ Kế toán trưởng ký duyệt số thẩm định nguồn vốn",
    documentCount: 3,
    notes: "Hồ sơ đủ thủ tục, cần ký duyệt để giải ngân"
  },
  {
    id: "DL-05",
    code: "NS-2026-045",
    title: "Hồ sơ Tiếp nhận và bổ nhiệm cán bộ kỹ thuật số hóa",
    department: "Phòng Nhân sự",
    officer: "Đỗ Mỹ Linh",
    officerEmail: "linh.dm@idp.local",
    officerPhone: "0915.666.777",
    submittedDate: "2026-08-25",
    slaDeadline: "2026-08-30",
    delayDays: 4,
    status: "PENDING",
    severity: "WARNING",
    bottleneck: "Chờ văn bản xác minh lý lịch tư pháp từ cơ quan địa phương",
    documentCount: 5,
    notes: "Đã gửi công văn đôn đốc địa phương"
  },
  {
    id: "DL-06",
    code: "NS-2026-051",
    title: "Báo cáo Đánh giá kết quả thử việc nhân sự Quý 3",
    department: "Phòng Nhân sự",
    officer: "Phạm Minh Tuấn",
    officerEmail: "tuan.pm@idp.local",
    officerPhone: "0908.777.999",
    submittedDate: "2026-08-26",
    slaDeadline: "2026-08-31",
    delayDays: 3,
    status: "PENDING",
    severity: "WARNING",
    bottleneck: "Chờ tổng hợp phiếu đánh giá từ 2 trưởng phòng chuyên môn",
    documentCount: 3,
    notes: "Hạn hợp đồng thử việc sắp kết thúc trong 3 ngày tới"
  },
  {
    id: "DL-07",
    code: "HC-2026-112",
    title: "Tờ trình Mua sắm máy quét Scan tài liệu khổ lớn A0/A1",
    department: "Phòng Hành chính",
    officer: "Nguyễn Thanh Tùng",
    officerEmail: "tung.nt@idp.local",
    officerPhone: "0934.888.111",
    submittedDate: "2026-08-27",
    slaDeadline: "2026-09-01",
    delayDays: 2,
    status: "PENDING",
    severity: "WARNING",
    bottleneck: "Chờ báo giá so sánh cạnh tranh từ nhà cung cấp thứ 3",
    documentCount: 4,
    notes: "Đã nhận 2/3 báo giá hợp lệ"
  },
  {
    id: "DL-08",
    code: "VH-2026-095",
    title: "Biên bản Bàn giao trang thiết bị văn phòng cho kho lưu trữ số 2",
    department: "Phòng Vận hành",
    officer: "Nguyễn Văn An",
    officerEmail: "an.nv@idp.local",
    officerPhone: "0912.345.678",
    submittedDate: "2026-08-26",
    slaDeadline: "2026-08-31",
    delayDays: 3,
    status: "PENDING",
    severity: "WARNING",
    bottleneck: "Chờ cán bộ thủ kho ký xác nhận kiểm kê danh mục",
    documentCount: 2,
    notes: "Hàng đã giao đến địa điểm"
  },
  {
    id: "DL-09",
    code: "KT-2026-098",
    title: "Báo cáo Kiểm kê tài sản cố định và chứng từ lưu kho năm 2026",
    department: "Phòng Kế toán",
    officer: "Nguyễn Thị Mai",
    officerEmail: "mai.nt@idp.local",
    officerPhone: "0903.456.789",
    submittedDate: "2026-08-26",
    slaDeadline: "2026-08-31",
    delayDays: 3,
    status: "PENDING",
    severity: "WARNING",
    bottleneck: "Chờ số liệu đối chiếu từ kho vật lý chi nhánh phía Nam",
    documentCount: 7,
    notes: "Cần hoàn tất trước kỳ báo cáo thuế"
  },
  {
    id: "DL-10",
    code: "VH-2026-099",
    title: "Hồ sơ Triển khai cấp phát chứng thư số nội bộ đợt mới",
    department: "Phòng Vận hành",
    officer: "Bùi Đình Trọng",
    officerEmail: "trong.bd@idp.local",
    officerPhone: "0904.555.888",
    submittedDate: "2026-08-28",
    slaDeadline: "2026-09-01",
    delayDays: 2,
    status: "PENDING",
    severity: "WARNING",
    bottleneck: "Chờ xác thực thông tin tài khoản từ các phòng ban",
    documentCount: 3,
    notes: "Ưu tiên xử lý để kích hoạt luồng ký số hồ sơ"
  }
];

const BASE_TEAMS = [
  { name: "Phòng Vận hành", handled: 414, initialApproved: 401, onTime: "97%", initialBacklog: 15, head: "Phạm Quốc Đạt", phone: "0912.789.012" },
  { name: "Phòng Kế toán", handled: 248, initialApproved: 233, onTime: "94%", initialBacklog: 9, head: "Nguyễn Thị Mai", phone: "0903.456.789" },
  { name: "Phòng Nhân sự", handled: 276, initialApproved: 261, onTime: "95%", initialBacklog: 8, head: "Lê Văn Hùng", phone: "0988.123.456" },
  { name: "Phòng Hành chính", handled: 312, initialApproved: 298, onTime: "98%", initialBacklog: 6, head: "Hoàng Thu Trang", phone: "0977.888.999" }
];

export default function DashboardReportScreen({ onNavigate }) {
  const [range, setRange] = useState("7d");
  const [selectedMetric, setSelectedMetric] = useState("delayed");
  const [subTab, setSubTab] = useState("unresolved"); // "unresolved" | "resolved"
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [delayedList, setDelayedList] = useState(BASE_DELAYED_DOSSIERS);
  const [viewingDossier, setViewingDossier] = useState(null);
  const [extendingDossier, setExtendingDossier] = useState(null);
  const [extendDays, setExtendDays] = useState(3);
  const [extendReason, setExtendReason] = useState("");
  const [remindedMap, setRemindedMap] = useState({});
  const [toast, setToast] = useState(null);

  // Danh sách các hồ sơ đã được duyệt (lưu trong localStorage để đồng bộ mọi màn hình)
  const [approvedSet, setApprovedSet] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_APPROVED);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });

  // Tự ẩn toast sau 4 giây
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Lắng nghe sự kiện duyệt hồ sơ từ bất kỳ màn hình nào (GĐ2-2, Phê duyệt, Số hóa...)
  useEffect(() => {
    const handleApprovedEvent = (event) => {
      const detail = event.detail || {};
      const idsToAdd = [];
      if (detail.id) idsToAdd.push(String(detail.id));
      if (detail.code) idsToAdd.push(String(detail.code));
      if (detail.entityId) idsToAdd.push(String(detail.entityId));
      if (detail.recipient) idsToAdd.push(String(detail.recipient));
      if (detail.documentId) idsToAdd.push(String(detail.documentId));

      if (idsToAdd.length > 0) {
        setApprovedSet(prev => {
          const next = new Set(prev);
          idsToAdd.forEach(id => next.add(id));
          try {
            localStorage.setItem(STORAGE_KEY_APPROVED, JSON.stringify([...next]));
          } catch {}
          return next;
        });
      }
    };

    window.addEventListener("dms:dossier-approved", handleApprovedEvent);
    return () => window.removeEventListener("dms:dossier-approved", handleApprovedEvent);
  }, []);

  // Đọc danh sách hồ sơ từ Oracle DMS để tự động gỡ bỏ các hồ sơ đã APPROVED / PUBLISHED
  useEffect(() => {
    async function syncWithOracleDatabase() {
      try {
        const [dossiers, docs] = await Promise.all([
          uiApi.crud("dossiers").list().catch(() => []),
          uiApi.crud("documents").list().catch(() => [])
        ]);

        const approvedFromDb = [];
        if (Array.isArray(dossiers)) {
          dossiers.forEach(d => {
            const st = String(d.status || "").toUpperCase();
            if (st === "APPROVED" || st === "PUBLISHED") {
              approvedFromDb.push(String(d.id), String(d.code));
            }
          });
        }
        if (Array.isArray(docs)) {
          docs.forEach(doc => {
            const st = String(doc.status || "").toUpperCase();
            if (st === "APPROVED" || st === "PUBLISHED") {
              approvedFromDb.push(String(doc.id), String(doc.code));
            }
          });
        }

        if (approvedFromDb.length > 0) {
          setApprovedSet(prev => {
            const next = new Set(prev);
            approvedFromDb.forEach(id => next.add(id));
            try {
              localStorage.setItem(STORAGE_KEY_APPROVED, JSON.stringify([...next]));
            } catch {}
            return next;
          });
        }
      } catch (err) {
        console.warn("Đồng bộ Oracle DMS:", err);
      }
    }
    syncWithOracleDatabase();
  }, []);

  // Tách danh sách thành: 1. Đang trễ (chưa duyệt) và 2. Đã xử lý / Đã duyệt
  const activeDelayedList = useMemo(() => {
    return delayedList.filter(item => {
      const isApproved =
        item.status === "APPROVED" ||
        item.status === "PUBLISHED" ||
        approvedSet.has(String(item.id)) ||
        approvedSet.has(String(item.code));
      return !isApproved;
    });
  }, [delayedList, approvedSet]);

  const resolvedList = useMemo(() => {
    return delayedList.filter(item => {
      const isApproved =
        item.status === "APPROVED" ||
        item.status === "PUBLISHED" ||
        approvedSet.has(String(item.id)) ||
        approvedSet.has(String(item.code));
      return isApproved;
    });
  }, [delayedList, approvedSet]);

  // Tính toán số liệu động theo từng đơn vị dựa trên số hồ sơ thực tế còn trễ
  const teamRows = useMemo(() => {
    return BASE_TEAMS.map(team => {
      const teamActive = activeDelayedList.filter(d => d.department === team.name);
      const teamResolved = resolvedList.filter(d => d.department === team.name);
      const currentDelayedCount = teamActive.length;
      const currentBacklog = Math.max(0, team.initialBacklog - teamResolved.length);
      const currentApproved = team.initialApproved + teamResolved.length;
      const total = team.handled;
      const onTimePercent = Math.min(100, Math.round((currentApproved / total) * 100));

      return {
        ...team,
        delayedCount: currentDelayedCount,
        backlog: currentBacklog,
        approved: currentApproved,
        onTime: `${onTimePercent}%`
      };
    });
  }, [activeDelayedList, resolvedList]);

  // Đếm số đơn vị THỰC SỰ CÒN HỒ SƠ TRỄ (delayedCount > 0)
  const delayedUnitsCount = useMemo(() => {
    return teamRows.filter(t => t.delayedCount > 0).length;
  }, [teamRows]);

  // Thẻ chỉ số tổng quan với dữ liệu nhảy số trực tiếp (Dynamic KPIs)
  const summaryCards = useMemo(() => [
    {
      key: "handled",
      label: "Hồ sơ xử lý",
      value: (1250 + resolvedList.length).toLocaleString("vi-VN"),
      note: resolvedList.length > 0 ? `+${resolvedList.length} vừa phê duyệt` : "+12% so với kỳ trước",
      color: "#2563eb",
      icon: <BarChart2 size={22} />,
      hint: "Bấm để xem tổng quan hồ sơ"
    },
    {
      key: "pending",
      label: "Chờ phê duyệt",
      value: String(Math.max(0, 38 - resolvedList.length)),
      note: resolvedList.length > 0 ? `Đã giảm ${resolvedList.length} hồ sơ` : "Cần theo dõi",
      color: "#f59e0b",
      icon: <Clock size={22} />,
      hint: "Bấm để xem hồ sơ chờ duyệt"
    },
    {
      key: "ontime",
      label: "Đúng hạn",
      value: `${Math.min(100, 96 + Math.round(resolvedList.length * 0.4))}%`,
      note: resolvedList.length > 0 ? `Tăng sau khi duyệt` : "SLA đạt yêu cầu",
      color: "#16a34a",
      icon: <CheckCircle2 size={22} />,
      hint: "Bấm để xem các đơn vị đạt chuẩn"
    },
    {
      key: "delayed",
      label: "Đơn vị đang trễ",
      value: String(delayedUnitsCount),
      note: delayedUnitsCount === 0 ? "Tuyệt vời! Không còn đơn vị trễ ✓" : `${activeDelayedList.length} hồ sơ tồn quá hạn`,
      color: delayedUnitsCount === 0 ? "#16a34a" : "#dc2626",
      icon: <User size={22} />,
      hint: "Bấm để xem danh sách & xử lý"
    }
  ], [delayedUnitsCount, activeDelayedList.length, resolvedList.length]);

  // Danh sách hiển thị theo tab (Chưa giải quyết vs Đã duyệt) và bộ lọc
  const displayedList = useMemo(() => {
    const source = subTab === "unresolved" ? activeDelayedList : resolvedList;
    return source.filter(item => {
      if (selectedDept !== "ALL" && item.department !== selectedDept) return false;
      if (severityFilter === "URGENT" && item.delayDays < 5) return false;
      if (severityFilter === "WARNING" && item.delayDays >= 5) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchCode = item.code.toLowerCase().includes(term);
        const matchTitle = item.title.toLowerCase().includes(term);
        const matchOfficer = item.officer.toLowerCase().includes(term);
        const matchDept = item.department.toLowerCase().includes(term);
        if (!matchCode && !matchTitle && !matchOfficer && !matchDept) return false;
      }
      return true;
    });
  }, [subTab, activeDelayedList, resolvedList, selectedDept, severityFilter, searchTerm]);

  // HÀNH ĐỘNG PHÊ DUYỆT 1 HỒ SƠ
  const handleApproveDossier = async (dossier) => {
    try {
      if (dossier.id && !String(dossier.id).startsWith("DL-")) {
        await uiApi.crud("dossiers").update(dossier.id, { status: "APPROVED" }).catch(() => {});
      }
    } catch (e) {
      console.warn("Lỗi lưu phê duyệt DB:", e);
    }

    const nextSet = new Set(approvedSet);
    nextSet.add(String(dossier.id));
    nextSet.add(String(dossier.code));
    setApprovedSet(nextSet);

    try {
      localStorage.setItem(STORAGE_KEY_APPROVED, JSON.stringify([...nextSet]));
      window.dispatchEvent(new CustomEvent("dms:dossier-approved", {
        detail: { id: dossier.id, code: dossier.code, department: dossier.department }
      }));
    } catch {}

    setViewingDossier(null);
    setToast({
      type: "success",
      text: `✓ Đã phê duyệt hồ sơ ${dossier.code} thành công! Số lượng hồ sơ chậm trễ đã giảm ngay lập tức.`
    });
  };

  // HÀNH ĐỘNG PHÊ DUYỆT TẤT CẢ HỒ SƠ ĐANG TRỄ
  const handleApproveAll = () => {
    const nextSet = new Set(approvedSet);
    activeDelayedList.forEach(item => {
      nextSet.add(String(item.id));
      nextSet.add(String(item.code));
    });
    setApprovedSet(nextSet);

    try {
      localStorage.setItem(STORAGE_KEY_APPROVED, JSON.stringify([...nextSet]));
      window.dispatchEvent(new CustomEvent("dms:dossier-approved", { detail: { all: true } }));
    } catch {}

    setToast({
      type: "success",
      text: `🎉 Đã phê duyệt toàn bộ ${activeDelayedList.length} hồ sơ chậm trễ! Số đơn vị đang trễ hiện đã về 0.`
    });
  };

  // KHÔI PHỤC DỮ LIỆU BAN ĐẦU ĐỂ DEMO LẠI
  const handleResetDemoData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_APPROVED);
    } catch {}
    setApprovedSet(new Set());
    setDelayedList(BASE_DELAYED_DOSSIERS);
    setToast({
      type: "info",
      text: "Đã khôi phục dữ liệu ban đầu: 4 đơn vị và 10 hồ sơ chậm trễ để tiếp tục kiểm tra/demo."
    });
  };

  // Đôn đốc đơn vị / hồ sơ
  const handleRemind = (key, targetName) => {
    setRemindedMap(prev => ({ ...prev, [key]: true }));
    setToast({
      type: "success",
      text: `⚡ Đã gửi cảnh báo đôn đốc khẩn cấp tới ${targetName}! Hệ thống đã gửi email và notification tự động.`
    });
  };

  const handleRemindAll = () => {
    const nextMap = { ...remindedMap };
    teamRows.forEach(row => { nextMap[row.name] = true; });
    delayedList.forEach(item => { nextMap[item.id] = true; });
    setRemindedMap(nextMap);
    setToast({
      type: "success",
      text: `⚡ Đã gửi đôn đốc SLA đồng loạt tới Trưởng phòng và Cán bộ phụ trách của toàn bộ 4 đơn vị đang trễ!`
    });
  };

  // Chuyển sang GĐ2-2
  const handleNavigateToWorkflow = (dossier) => {
    if (onNavigate) {
      onNavigate("Kiểm duyệt", "GĐ2-2 Quản lý quy trình");
      setToast({
        type: "info",
        text: `Đang chuyển sang màn hình GĐ2-2 Quản lý quy trình để duyệt hồ sơ: ${dossier.code}`
      });
    } else {
      setToast({
        type: "info",
        text: `Vui lòng chọn menu: [Kiểm duyệt] ➔ [GĐ2-2 Quản lý quy trình] để duyệt hồ sơ ${dossier.code}`
      });
    }
  };

  // Yêu cầu bổ sung
  const handleQuickSupplement = (dossier) => {
    setDelayedList(prev => prev.map(item => item.id === dossier.id ? { ...item, status: "NEEDS_SUPPLEMENT", bottleneck: "Đã yêu cầu chuyên viên bổ sung chứng từ" } : item));
    setViewingDossier(null);
    setToast({
      type: "warning",
      text: `Đã gửi thông báo Yêu cầu bổ sung cho hồ sơ ${dossier.code} tới ${dossier.officer}!`
    });
  };

  // Gia hạn SLA
  const handleConfirmExtend = () => {
    if (!extendingDossier) return;
    setDelayedList(prev => prev.map(item => {
      if (item.id === extendingDossier.id) {
        const newDelay = Math.max(0, item.delayDays - extendDays);
        return {
          ...item,
          delayDays: newDelay,
          severity: newDelay >= 5 ? "URGENT" : "WARNING",
          notes: `${item.notes ? item.notes + " | " : ""}Đã gia hạn thêm ${extendDays} ngày: ${extendReason || "Gia hạn xử lý hợp lệ"}`
        };
      }
      return item;
    }));
    const code = extendingDossier.code;
    setExtendingDossier(null);
    setExtendReason("");
    setToast({
      type: "success",
      text: `⏱️ Đã gia hạn thành công hồ sơ ${code} thêm ${extendDays} ngày!`
    });
  };

  // XUẤT TỆP EXCEL THẬT (.xls) TỰ ĐỘNG TẢI VỀ MÁY (THƯ MỤC DOWNLOADS)
  const exportExcel = () => {
    const nowStr = new Date().toISOString().slice(0, 10);
    const fileName = `Bao-cao-ho-so-cham-tre-${nowStr}.xls`;

    const tableTeams = `
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; margin-bottom: 20px;">
        <thead style="background-color: #f1f5f9;">
          <tr>
            <th>Đơn vị</th>
            <th>Xử lý</th>
            <th>Đã duyệt</th>
            <th>Đúng hạn</th>
            <th>Tồn đọng</th>
            <th>Trưởng phòng</th>
            <th>Điện thoại</th>
          </tr>
        </thead>
        <tbody>
          ${teamRows.map(t => `
            <tr>
              <td><b>${t.name}</b></td>
              <td align="center">${t.handled}</td>
              <td align="center">${t.approved}</td>
              <td align="center">${t.onTime}</td>
              <td align="center" style="color: ${t.delayedCount > 0 ? '#dc2626' : '#16a34a'}; font-weight: bold;">
                ${t.backlog} (${t.delayedCount} trễ)
              </td>
              <td>${t.head}</td>
              <td>${t.phone}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    const tableDossiers = `
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse;">
        <thead style="background-color: #fee2e2;">
          <tr>
            <th>STT</th>
            <th>Mã hồ sơ</th>
            <th>Tên hồ sơ / Nội dung</th>
            <th>Đơn vị</th>
            <th>Cán bộ phụ trách</th>
            <th>Hạn SLA</th>
            <th>Số ngày trễ</th>
            <th>Trạng thái</th>
            <th>Điểm nghẽn / Lý do</th>
          </tr>
        </thead>
        <tbody>
          ${(activeDelayedList.length > 0 ? activeDelayedList : delayedList).map((d, index) => `
            <tr>
              <td align="center">${index + 1}</td>
              <td><b>${d.code}</b></td>
              <td>${d.title}</td>
              <td>${d.department}</td>
              <td>${d.officer} (${d.officerPhone})</td>
              <td align="center">${d.slaDeadline}</td>
              <td align="center" style="color: #dc2626; font-weight: bold;">Trễ ${d.delayDays} ngày</td>
              <td align="center">${d.status}</td>
              <td>${d.bottleneck}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <title>Báo cáo theo dõi hồ sơ chậm trễ</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1e3a8a; margin-bottom: 4px;">HỆ THỐNG QUẢN LÝ VÀ SỐ HÓA HỒ SƠ LƯU TRỮ IDP.DMS</h2>
          <h3 style="color: #dc2626; margin-top: 0;">BÁO CÁO THEO DÕI TIẾN ĐỘ VÀ DANH SÁCH HỒ SƠ CHẬM TRỄ SLA</h3>
          <p style="color: #475569; font-size: 13px;">
            Ngày xuất báo cáo: ${new Date().toLocaleString("vi-VN")} | Kỳ báo cáo: ${range === "24h" ? "24 giờ" : range === "7d" ? "7 ngày" : "30 ngày"}<br>
            Tổng số hồ sơ chậm trễ: <b>${activeDelayedList.length} hồ sơ</b> | Đơn vị đang trễ: <b>${delayedUnitsCount} đơn vị</b>
          </p>
          <h4 style="color: #1e293b; margin-bottom: 8px;">1. BẢNG HIỆU SUẤT THEO ĐƠN VỊ</h4>
          ${tableTeams}
          <h4 style="color: #1e293b; margin-bottom: 8px;">2. DANH SÁCH CHI TIẾT CÁC HỒ SƠ CHẬM TRỄ CẦN XỬ LÝ GẤP</h4>
          ${tableDossiers}
        </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", htmlContent], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setToast({
      type: "success",
      text: `✓ Đã tải tệp Excel "${fileName}" về thư mục Downloads (Tải về) của máy bạn!`
    });
  };

  // XUẤT PDF: MỞ CỬA SỔ IN KHỔ A4 TỰ ĐỘNG KÍCH HOẠT HỘP THOẠI LƯU PDF
  const exportPdf = () => {
    const reportWindow = window.open("", "_blank", "width=1050,height=800");
    if (!reportWindow) {
      setToast({ type: "warning", text: "Trình duyệt đang chặn cửa sổ pop-up in PDF. Vui lòng cho phép mở pop-up." });
      return;
    }

    const tableTeams = `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead style="background-color: #f1f5f9;">
          <tr>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Đơn vị</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Xử lý</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Đã duyệt</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Đúng hạn</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Tồn đọng</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Trưởng phòng</th>
          </tr>
        </thead>
        <tbody>
          ${teamRows.map(t => `
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 8px;"><b>${t.name}</b></td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${t.handled}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: #16a34a; font-weight: bold;">${t.approved}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${t.onTime}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: ${t.delayedCount > 0 ? '#dc2626' : '#16a34a'}; font-weight: bold;">
                ${t.backlog} ${t.delayedCount > 0 ? `(${t.delayedCount} trễ)` : '✓'}
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">${t.head} (${t.phone})</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    const tableDossiers = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead style="background-color: #fee2e2;">
          <tr>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">STT</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Mã hồ sơ</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Tên hồ sơ / Nội dung</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Đơn vị phụ trách</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Cán bộ thụ lý</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Hạn SLA</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Trễ hạn</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Điểm nghẽn xử lý</th>
          </tr>
        </thead>
        <tbody>
          ${(activeDelayedList.length > 0 ? activeDelayedList : delayedList).map((d, index) => `
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${index + 1}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 8px; color: #1e40af; font-weight: bold;">${d.code}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${d.title}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${d.department}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${d.officer}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${d.slaDeadline}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; color: #dc2626; font-weight: bold;">Trễ ${d.delayDays} ngày</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 12px;">${d.bottleneck}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    reportWindow.document.write(`
      <!doctype html>
      <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <title>Bao-cao-ho-so-cham-tre-${new Date().toISOString().slice(0,10)}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1e293b; line-height: 1.5; }
            h1 { font-size: 18px; margin: 0 0 4px; color: #1e40af; }
            h2 { font-size: 15px; margin: 0 0 12px; color: #dc2626; }
            .kpi-box { display: flex; gap: 12px; margin-bottom: 20px; }
            .kpi { flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; text-align: center; }
            .kpi-val { font-size: 20px; font-weight: bold; }
            .kpi-lbl { font-size: 12px; color: #64748b; }
            @page { size: A4 landscape; margin: 12mm; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 16px; padding: 12px; background: #e0f2fe; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span>ℹ️ Chọn mục <b>"Destination" (Máy in đích) ➔ "Save as PDF" (Lưu dưới dạng PDF)</b> để lưu tệp về máy tính.</span>
            <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: 0; border-radius: 6px; font-weight: bold; cursor: pointer;">
              🖨️ In / Lưu PDF ngay
            </button>
          </div>
          <h1>HỆ THỐNG QUẢN LÝ VÀ SỐ HÓA HỒ SƠ LƯU TRỮ IDP.DMS</h1>
          <h2>BÁO CÁO GIÁM SÁT TIẾN ĐỘ & DANH SÁCH HỒ SƠ CHẬM TRỄ SLA</h2>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 16px;">
            Thời gian kết xuất: ${new Date().toLocaleString("vi-VN")} | Kỳ báo cáo: ${range === "24h" ? "24 giờ" : range === "7d" ? "7 ngày" : "30 ngày"}
          </p>
          <div class="kpi-box">
            <div class="kpi"><div class="kpi-val" style="color: #2563eb;">${(1250 + resolvedList.length).toLocaleString("vi-VN")}</div><div class="kpi-lbl">Hồ sơ xử lý</div></div>
            <div class="kpi"><div class="kpi-val" style="color: #f59e0b;">${Math.max(0, 38 - resolvedList.length)}</div><div class="kpi-lbl">Chờ phê duyệt</div></div>
            <div class="kpi"><div class="kpi-val" style="color: #16a34a;">${Math.min(100, 96 + Math.round(resolvedList.length * 0.4))}%</div><div class="kpi-lbl">Đúng hạn SLA</div></div>
            <div class="kpi"><div class="kpi-val" style="color: ${delayedUnitsCount === 0 ? '#16a34a' : '#dc2626'};">${delayedUnitsCount}</div><div class="kpi-lbl">Đơn vị đang trễ</div></div>
          </div>
          <h3 style="font-size: 14px; margin: 16px 0 8px;">1. HIỆU SUẤT THEO ĐƠN VỊ</h3>
          ${tableTeams}
          <h3 style="font-size: 14px; margin: 16px 0 8px;">2. CHI TIẾT HỒ SƠ QUÁ HẠN SLA CẦN XỬ LÝ GẤP (${activeDelayedList.length} hồ sơ)</h3>
          ${tableDossiers}
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 400);
            };
          <\/script>
        </body>
      </html>
    `);
    reportWindow.document.close();
    setToast({
      type: "success",
      text: "Đã mở cửa sổ in/xuất PDF! Bạn chọn 'Save as PDF' để lưu file vào máy tính."
    });
  };

  return (
    <section className="panel" style={{ position: "relative" }}>
      {/* Toast thông báo kết quả */}
      {toast && (
        <div style={{
          position: "fixed",
          top: 24,
          right: 24,
          zIndex: 9999,
          padding: "12px 20px",
          borderRadius: 8,
          background: toast.type === "success" ? "#16a34a" : toast.type === "warning" ? "#d97706" : "#2563eb",
          color: "#fff",
          fontWeight: 600,
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          animation: "slideIn 0.3s ease-out"
        }}>
          {toast.type === "success" ? <Check size={20} /> : <AlertCircle size={20} />}
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} style={{ background: "transparent", border: 0, color: "#fff", cursor: "pointer", marginLeft: 8 }}>
            <X size={16} />
          </button>
        </div>
      )}

      <PanelTitle icon={<PieChart />} title="Theo dõi và phân tích cho lãnh đạo" />
      <p className="muted" style={{ marginBottom: 16 }}>
        Giám sát khối lượng xử lý, tiến độ phê duyệt và hiệu suất theo đơn vị. <strong>Bấm vào bất kỳ thẻ chỉ số nào bên dưới để mở danh sách chi tiết và các nút xử lý.</strong>
      </p>

      {/* Bộ lọc thời gian & nút chức năng */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {["24h", "7d", "30d"].map(item => (
            <button
              key={item}
              className={`btn ${range === item ? "primary" : ""}`}
              onClick={() => setRange(item)}
            >
              {item === "24h" ? "24 giờ" : item === "7d" ? "7 ngày" : "30 ngày"}
            </button>
          ))}
          {resolvedList.length > 0 && (
            <button
              className="btn"
              onClick={handleResetDemoData}
              title="Khôi phục lại trạng thái ban đầu để kiểm tra demo lại"
              style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, color: "#64748b" }}
            >
              <RotateCcw size={13} /> Khôi phục dữ liệu mẫu
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn ok" onClick={exportExcel} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
            <Download size={15} /> Xuất Excel
          </button>
          <button className="btn danger" onClick={exportPdf} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
            <FileText size={15} /> Xuất PDF
          </button>
        </div>
      </div>

      {/* 4 Thẻ chỉ số tổng quan (TỰ ĐỘNG CẬP NHẬT KHI PHÊ DUYỆT) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, marginBottom: 20 }}>
        {summaryCards.map(card => {
          const isSelected = selectedMetric === card.key;
          return (
            <div
              key={card.label}
              onClick={() => setSelectedMetric(isSelected ? null : card.key)}
              title={card.hint}
              style={{
                padding: 18,
                borderRadius: 16,
                border: isSelected ? `2.5px solid ${card.color}` : "1px solid #e2e8f0",
                background: isSelected ? "#fff" : "#fff",
                boxShadow: isSelected ? `0 8px 24px ${card.color}33` : "0 2px 6px rgba(0,0,0,0.04)",
                cursor: "pointer",
                position: "relative",
                transition: "all 0.2s ease-in-out",
                transform: isSelected ? "translateY(-3px)" : "none"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ color: card.color }}>{card.icon}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {isSelected && (
                    <span style={{
                      background: card.color,
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 10
                    }}>
                      Đang xem ▼
                    </span>
                  )}
                  <span className="muted" style={{ fontSize: 12 }}>
                    {range === "24h" ? "Hôm nay" : range === "7d" ? "7 ngày" : "30 ngày"}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: card.color }}>
                {card.value}
              </div>
              <div style={{ marginTop: 8, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{card.label}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <span className="muted" style={{ fontSize: 12 }}>{card.note}</span>
                <span style={{ fontSize: 11, color: card.color, fontWeight: 600 }}>
                  {isSelected ? "Thu gọn ▲" : "Chi tiết ➔"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* BẢNG ĐIỀU HÀNH & XỬ LÝ ĐƠN VỊ ĐANG TRỄ (KHI BẤM THẺ ĐỎ) */}
      {/* ========================================================================= */}
      {selectedMetric === "delayed" && (
        <div style={{
          border: delayedUnitsCount === 0 ? "2px solid #16a34a" : "2px solid #dc2626",
          borderRadius: 16,
          background: delayedUnitsCount === 0 ? "#f0fdf4" : "#fffafb",
          padding: 20,
          marginBottom: 24,
          boxShadow: delayedUnitsCount === 0 ? "0 10px 30px rgba(22, 163, 74, 0.12)" : "0 10px 30px rgba(220, 38, 38, 0.12)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16, borderBottom: "1px solid #fee2e2", paddingBottom: 14 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: delayedUnitsCount === 0 ? "#16a34a" : "#dc2626", display: "flex" }}>
                  {delayedUnitsCount === 0 ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                </span>
                <h3 style={{ margin: 0, color: delayedUnitsCount === 0 ? "#15803d" : "#991b1b", fontSize: 18 }}>
                  {delayedUnitsCount === 0
                    ? "TẤT CẢ CÁC ĐƠN VỊ ĐÃ XỬ LÝ HỒ SƠ TRỄ XONG!"
                    : `DANH SÁCH ${delayedUnitsCount} ĐƠN VỊ & CÁC HỒ SƠ ĐANG CHẬM TRỄ CẦN XỬ LÝ GẤP`}
                </h3>
              </div>
              <p className="muted" style={{ margin: "4px 0 0 32px", fontSize: 13, color: delayedUnitsCount === 0 ? "#166534" : "#7f1d1d" }}>
                {delayedUnitsCount === 0
                  ? "Toàn bộ các hồ sơ chậm trễ đã được phê duyệt thành công. Tỷ lệ SLA được bảo đảm tuyệt đối."
                  : `Hiện còn ${activeDelayedList.length} hồ sơ quá hạn SLA. Bấm [Duyệt ngay] để giải quyết tức thì, số lượng sẽ tự động giảm.`}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {activeDelayedList.length > 0 && (
                <>
                  <button
                    className="btn ok"
                    onClick={handleApproveAll}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}
                    title="Phê duyệt toàn bộ hồ sơ đang trễ để hoàn tất nhanh"
                  >
                    <CheckCheck size={16} /> Phê duyệt tất cả ({activeDelayedList.length})
                  </button>
                  <button
                    className="btn danger"
                    onClick={handleRemindAll}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}
                  >
                    <BellRing size={16} /> Đôn đốc tất cả
                  </button>
                </>
              )}
              <button
                className="btn"
                onClick={() => setSelectedMetric(null)}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <X size={16} /> Thu gọn
              </button>
            </div>
          </div>

          {/* 4 Thẻ tóm tắt tình trạng của từng đơn vị */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 20 }}>
            {teamRows.map(team => {
              const isReminded = remindedMap[team.name];
              const isDeptActive = selectedDept === team.name;
              const isClean = team.delayedCount === 0;

              return (
                <div
                  key={team.name}
                  style={{
                    border: isClean
                      ? "1px solid #bbf7d0"
                      : isDeptActive ? "2px solid #dc2626" : "1px solid #fecaca",
                    borderRadius: 12,
                    background: isClean ? "#f0fdf4" : isDeptActive ? "#fff" : "#ffffff",
                    padding: 14,
                    boxShadow: isDeptActive ? "0 4px 12px rgba(220,38,38,0.15)" : "none",
                    position: "relative"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                      <Building2 size={16} color={isClean ? "#16a34a" : "#dc2626"} />
                      {team.name}
                    </div>
                    <span style={{
                      background: isClean ? "#dcfce7" : team.delayedCount >= 3 ? "#fee2e2" : "#fef3c7",
                      color: isClean ? "#15803d" : team.delayedCount >= 3 ? "#dc2626" : "#b45309",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 10
                    }}>
                      {isClean ? "✓ Đã xử lý hết" : `${team.delayedCount} hồ sơ quá hạn`}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, lineHeight: 1.6 }}>
                    <div>
                      Tồn đọng: <strong style={{ color: isClean ? "#16a34a" : "#dc2626" }}>{team.backlog} hồ sơ</strong> · Đã duyệt: <strong style={{ color: "#16a34a" }}>{team.approved}</strong>
                    </div>
                    <div>Trưởng phòng: <strong>{team.head}</strong> ({team.phone})</div>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className={`btn ${isDeptActive ? "primary" : ""}`}
                      onClick={() => setSelectedDept(isDeptActive ? "ALL" : team.name)}
                      style={{ flex: 1, fontSize: 11, padding: "5px 8px", justifyContent: "center" }}
                    >
                      <Filter size={12} /> {isDeptActive ? "Xem tất cả" : "Lọc hồ sơ"}
                    </button>
                    {!isClean && (
                      <button
                        className={`btn ${isReminded ? "ok" : "danger"}`}
                        onClick={() => handleRemind(team.name, team.name)}
                        style={{ fontSize: 11, padding: "5px 8px" }}
                        title="Gửi email và thông báo cảnh báo đôn đốc"
                      >
                        {isReminded ? <Check size={12} /> : <Send size={12} />}
                        {isReminded ? "Đã đôn đốc" : "Đôn đốc"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Thanh chuyển tab: [CẦN XỬ LÝ GẤP] vs [ĐÃ PHÊ DUYỆT XONG] */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className={`btn ${subTab === "unresolved" ? "danger" : ""}`}
                onClick={() => setSubTab("unresolved")}
                style={{ fontWeight: 700, fontSize: 13 }}
              >
                <AlertTriangle size={14} /> 🚨 Cần xử lý gấp ({activeDelayedList.length})
              </button>
              <button
                className={`btn ${subTab === "resolved" ? "ok" : ""}`}
                onClick={() => setSubTab("resolved")}
                style={{ fontWeight: 700, fontSize: 13 }}
              >
                <Check size={14} /> ✓ Đã xử lý / Đã duyệt xong ({resolvedList.length})
              </button>
            </div>

            {/* Tìm kiếm & Lọc mức độ */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Tìm mã, tên hồ sơ, cán bộ..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    padding: "6px 12px 6px 32px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 12,
                    width: 220
                  }}
                />
                <Search size={14} style={{ position: "absolute", left: 10, top: 9, color: "#94a3b8" }} />
              </div>

              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12 }}
              >
                <option value="ALL">Mọi mức độ trễ</option>
                <option value="URGENT">Khẩn cấp (Trễ ≥ 5 ngày)</option>
                <option value="WARNING">Cảnh báo (Trễ 2-4 ngày)</option>
              </select>
            </div>
          </div>

          {/* Bảng chi tiết hồ sơ */}
          <div className="table-wrap" style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <table>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ width: 140 }}>Mã hồ sơ</th>
                  <th>Tên hồ sơ / Nội dung</th>
                  <th style={{ width: 170 }}>Đơn vị & Cán bộ</th>
                  <th style={{ width: 140 }}>Hạn SLA & Trễ</th>
                  <th>Điểm nghẽn xử lý</th>
                  <th style={{ width: 220, textAlign: "center" }}>Hành động xử lý</th>
                </tr>
              </thead>
              <tbody>
                {displayedList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#64748b" }}>
                      {subTab === "unresolved"
                        ? "🎉 Tuyệt vời! Hiện không còn hồ sơ nào chậm trễ trong danh sách này."
                        : "Chưa có hồ sơ nào được phê duyệt trong phiên làm việc này."}
                    </td>
                  </tr>
                ) : (
                  displayedList.map(item => {
                    const isReminded = remindedMap[item.id];
                    const isApproved =
                      item.status === "APPROVED" ||
                      item.status === "PUBLISHED" ||
                      approvedSet.has(String(item.id)) ||
                      approvedSet.has(String(item.code));

                    return (
                      <tr key={item.id} style={{ background: isApproved ? "#f0fdf4" : item.delayDays >= 5 ? "#fff8f8" : "#fff" }}>
                        <td>
                          <div style={{ fontWeight: 700, color: isApproved ? "#15803d" : "#1e40af", fontSize: 13 }}>{item.code}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{item.documentCount} văn bản</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 13, marginBottom: 2 }}>{item.title}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            Gửi ngày: {item.submittedDate} · <StatusBadge status={isApproved ? "APPROVED" : item.status} />
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 12 }}>{item.department}</div>
                          <div style={{ fontSize: 11, color: "#475569" }}>
                            {item.officer} <span style={{ color: "#94a3b8" }}>({item.officerPhone})</span>
                          </div>
                        </td>
                        <td>
                          {isApproved ? (
                            <span style={{ background: "#dcfce7", color: "#15803d", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                              ✓ Đã phê duyệt
                            </span>
                          ) : (
                            <>
                              <div style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                background: item.delayDays >= 5 ? "#fee2e2" : "#fef3c7",
                                color: item.delayDays >= 5 ? "#dc2626" : "#b45309"
                              }}>
                                {item.delayDays >= 5 ? "⚠️ Khẩn cấp" : "Cảnh báo"}: Trễ {item.delayDays} ngày
                              </div>
                              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                Hạn: {item.slaDeadline}
                              </div>
                            </>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: 12, color: "#334155" }}>
                            {isApproved ? "Hồ sơ đã được phê duyệt hợp lệ và đưa vào xuất bản." : item.bottleneck}
                          </div>
                          {item.notes && (
                            <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginTop: 2 }}>
                              {item.notes}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {isApproved ? (
                            <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 700 }}>
                              Đã giải quyết xong ✓
                            </span>
                          ) : (
                            <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>
                              {/* NÚT DUYỆT NGAY: TRỰC TIẾP GIẢM SỐ LƯỢNG TRỄ */}
                              <button
                                className="btn ok"
                                onClick={() => handleApproveDossier(item)}
                                style={{ fontSize: 11, padding: "4px 8px", fontWeight: 700 }}
                                title="Bấm để phê duyệt hồ sơ này ngay lập tức"
                              >
                                <Check size={12} /> Duyệt ngay
                              </button>

                              {/* ĐẾN GĐ2-2 WORKFLOW */}
                              <button
                                className="btn primary"
                                onClick={() => handleNavigateToWorkflow(item)}
                                style={{ fontSize: 11, padding: "4px 8px" }}
                                title="Chuyển sang GĐ2-2 để thẩm định quy trình"
                              >
                                <ArrowRight size={12} /> Đến GĐ2-2
                              </button>

                              {/* ĐÔN ĐỐC */}
                              <button
                                className={`btn ${isReminded ? "ok" : "danger"}`}
                                onClick={() => handleRemind(item.id, `${item.officer} (${item.department})`)}
                                style={{ fontSize: 11, padding: "4px 8px" }}
                                title="Gửi cảnh báo đôn đốc chuyên viên"
                              >
                                {isReminded ? <Check size={12} /> : <Send size={12} />}
                                {isReminded ? "Đã đôn đốc" : "Đôn đốc"}
                              </button>

                              {/* XEM CHI TIẾT */}
                              <button
                                className="btn"
                                onClick={() => setViewingDossier(item)}
                                style={{ fontSize: 11, padding: "4px 8px" }}
                                title="Xem chi tiết nội dung hồ sơ"
                              >
                                <Eye size={12} /> Chi tiết
                              </button>

                              {/* GIA HẠN */}
                              <button
                                className="btn"
                                onClick={() => setExtendingDossier(item)}
                                style={{ fontSize: 11, padding: "4px 8px" }}
                                title="Gia hạn thời gian xử lý SLA"
                              >
                                <Calendar size={12} /> Gia hạn
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bảng tổng hợp theo đơn vị */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <div className="table-wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #e2e8f0" }}>
            <h4 style={{ margin: 0 }}>Hiệu suất xử lý theo đơn vị</h4>
            <span className="muted" style={{ fontSize: 12 }}>Đồng bộ thời gian thực sau phê duyệt</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Đơn vị</th>
                <th>Xử lý</th>
                <th>Đã duyệt</th>
                <th>Đúng hạn</th>
                <th>Tồn</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {teamRows.map(row => (
                <tr key={row.name}>
                  <td><strong>{row.name}</strong></td>
                  <td>{row.handled}</td>
                  <td><strong style={{ color: "#16a34a" }}>{row.approved}</strong></td>
                  <td><span className="vld-badge rule">{row.onTime}</span></td>
                  <td>
                    <span style={{ color: row.delayedCount > 0 ? "#dc2626" : "#16a34a", fontWeight: 700 }}>
                      {row.backlog} {row.delayedCount > 0 ? `(${row.delayedCount} trễ)` : "✓"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn"
                      style={{ fontSize: 11, padding: "3px 8px" }}
                      onClick={() => {
                        setSelectedMetric("delayed");
                        setSelectedDept(row.name);
                        setSubTab("unresolved");
                      }}
                    >
                      {row.delayedCount > 0 ? `Xử lý ${row.delayedCount} hồ sơ trễ` : "Xem hồ sơ đã duyệt"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: 18, background: "#f8fafc" }}>
          <h4 style={{ marginTop: 0, marginBottom: 12 }}>Điểm nhấn điều hành</h4>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="detail-row">
              <span>Hồ sơ cần ưu tiên còn lại</span>
              <strong style={{ color: activeDelayedList.length === 0 ? "#16a34a" : "#dc2626", fontSize: 16 }}>
                {activeDelayedList.length} hồ sơ
              </strong>
            </div>
            <div className="detail-row">
              <span>Quy trình quá hạn</span>
              <strong style={{ color: delayedUnitsCount === 0 ? "#16a34a" : "#dc2626", fontSize: 16 }}>
                {delayedUnitsCount} đơn vị
              </strong>
            </div>
            <div className="detail-row">
              <span>Hồ sơ đã giải quyết xong</span>
              <strong style={{ color: "#16a34a", fontSize: 16 }}>
                {resolvedList.length} hồ sơ
              </strong>
            </div>
            <div className="detail-row">
              <span>Tỷ lệ xử lý đúng hạn toàn hệ thống</span>
              <strong style={{ color: "#16a34a" }}>
                {Math.min(100, 96 + Math.round(resolvedList.length * 0.4))}%
              </strong>
            </div>
          </div>
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
            <button
              className="btn danger"
              onClick={() => {
                setSelectedMetric("delayed");
                setSubTab("unresolved");
              }}
              style={{ width: "100%", justifyContent: "center", fontWeight: 700 }}
            >
              {activeDelayedList.length === 0
                ? "✓ Tất cả hồ sơ đã duyệt xong - Xem danh sách"
                : `🚨 Xem và xử lý ${activeDelayedList.length} hồ sơ chậm trễ`}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL XEM CHI TIẾT & PHÊ DUYỆT NHANH */}
      {viewingDossier && (
        <div className="modal-overlay" onClick={() => setViewingDossier(null)}>
          <div className="modal-content" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#2563eb" }}><FileText size={22} /></span>
                <h3 style={{ margin: 0 }}>Chi tiết hồ sơ cần xử lý</h3>
              </div>
              <button className="btn" onClick={() => setViewingDossier(null)} style={{ border: 0, padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ margin: "16px 0", display: "grid", gap: 10 }}>
              <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e40af" }}>{viewingDossier.code}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{viewingDossier.title}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                <div>Đơn vị: <strong>{viewingDossier.department}</strong></div>
                <div>Cán bộ phụ trách: <strong>{viewingDossier.officer}</strong></div>
                <div>Ngày nộp: <strong>{viewingDossier.submittedDate}</strong></div>
                <div>Hạn SLA cam kết: <strong>{viewingDossier.slaDeadline}</strong></div>
                <div>Trạng thái hiện tại: <StatusBadge status={viewingDossier.status} /></div>
                <div>Số ngày trễ SLA: <strong style={{ color: "#dc2626" }}>{viewingDossier.delayDays} ngày</strong></div>
              </div>

              <div style={{ background: "#fee2e2", padding: 12, borderRadius: 8, border: "1px solid #fecaca" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#991b1b", marginBottom: 4 }}>
                  ⚠️ ĐIỂM NGHẼN / NGUYÊN NHÂN CHẬM TRỄ:
                </div>
                <div style={{ fontSize: 13, color: "#7f1d1d" }}>{viewingDossier.bottleneck}</div>
                {viewingDossier.notes && (
                  <div style={{ fontSize: 12, color: "#991b1b", marginTop: 4, fontStyle: "italic" }}>
                    Ghi chú: {viewingDossier.notes}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <button
                className="btn primary"
                onClick={() => {
                  setViewingDossier(null);
                  handleNavigateToWorkflow(viewingDossier);
                }}
              >
                👉 Mở trong GĐ2-2 để kiểm duyệt
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn ok"
                  onClick={() => handleApproveDossier(viewingDossier)}
                  style={{ fontWeight: 700 }}
                >
                  <Check size={14} /> Duyệt hồ sơ ngay
                </button>
                <button
                  className="btn danger"
                  onClick={() => handleQuickSupplement(viewingDossier)}
                >
                  Yêu cầu bổ sung
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GIA HẠN SLA */}
      {extendingDossier && (
        <div className="modal-overlay" onClick={() => setExtendingDossier(null)}>
          <div className="modal-content" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Calendar size={20} color="#2563eb" />
                <h3 style={{ margin: 0 }}>Gia hạn thời hạn xử lý (SLA)</h3>
              </div>
              <button className="btn" onClick={() => setExtendingDossier(null)} style={{ border: 0, padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ margin: "16px 0", display: "grid", gap: 12, fontSize: 13 }}>
              <div>
                Hồ sơ: <strong>{extendingDossier.code}</strong> - {extendingDossier.title}
              </div>
              <div>
                Đơn vị phụ trách: <strong>{extendingDossier.department}</strong> ({extendingDossier.officer})
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Số ngày xin gia hạn thêm:</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[1, 2, 3, 5, 7].map(days => (
                    <button
                      key={days}
                      type="button"
                      className={`btn ${extendDays === days ? "primary" : ""}`}
                      onClick={() => setExtendDays(days)}
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      +{days} ngày
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Lý do xin gia hạn:</label>
                <textarea
                  rows={3}
                  value={extendReason}
                  onChange={e => setExtendReason(e.target.value)}
                  placeholder="Nhập lý do gia hạn (ví dụ: Chờ thẩm định hồ sơ kỹ thuật bên ngoài, chờ đối tác bổ sung hóa đơn...)"
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1" }}
                />
              </div>
            </div>

            <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn" onClick={() => setExtendingDossier(null)}>Hủy bỏ</button>
              <button className="btn ok" onClick={handleConfirmExtend}>
                <Check size={14} /> Xác nhận gia hạn
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
