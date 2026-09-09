import { useState } from "react";
import {
  LockKeyhole, LogIn, UserRound, UserPlus, Mail, ShieldCheck, CheckCircle2,
  Zap, ArrowRight, Shield, Building2, FileText, FileCheck2, BookOpen
} from "lucide-react";
import { uiApi } from "../services/uiApi";

const DEMO_ACCOUNTS = [
  {
    id: "admin",
    role: "Quản trị hệ thống",
    code: "SYSTEM_ADMIN",
    badge: "Toàn quyền hệ thống",
    username: "admin",
    password: "Admin@123",
    desc: "Toàn bộ 9 phân hệ: Cấu hình hệ thống, danh mục, phân quyền & menu",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#f87171",
    icon: Shield
  },
  {
    id: "qtdv",
    role: "Quản trị đơn vị",
    code: "ADMIN",
    badge: "Cấp Tỉnh / Sở",
    username: "qtdv",
    password: "Qtdv@123",
    desc: "Quản trị nơi sử dụng, cây đơn vị, phòng ban & phê duyệt cấp đơn vị",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#93c5fd",
    icon: Building2
  },
  {
    id: "nhaplieu",
    role: "Chuyên viên nhập liệu",
    code: "ARCHIVIST",
    badge: "Số hóa & OCR AI",
    username: "nhaplieu",
    password: "Nhaplieu@123",
    desc: "Nhập mới hồ sơ, Zonal OCR AI, kiểm tra văn bản thành phần",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#86efac",
    icon: FileText
  },
  {
    id: "kiemduyet",
    role: "Cán bộ kiểm duyệt",
    code: "REVIEWER",
    badge: "Duyệt & Ký số",
    username: "kiemduyet",
    password: "Kiemduyet@123",
    desc: "Kiểm duyệt hồ sơ, ký số PDF, duyệt phiếu mượn, dashboard",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fcd34d",
    icon: FileCheck2
  },
  {
    id: "docgia",
    role: "Độc giả tra cứu",
    code: "READER",
    badge: "Khai thác & Mượn",
    username: "docgia",
    password: "Docgia@123",
    desc: "Tra cứu hồ sơ lưu trữ, đăng ký mượn bản cứng & bản mềm trực tuyến",
    color: "#7c3aed",
    bg: "#faf5ff",
    border: "#d8b4fe",
    icon: BookOpen
  }
];

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeQuickRole, setActiveQuickRole] = useState(null);

  // Xử lý 1-Click Demo Login
  async function handleQuickLogin(account) {
    setActiveQuickRole(account.id);
    setUsername(account.username);
    setPassword(account.password);
    setError("");
    setSuccessMsg(`Đang đăng nhập vai trò [${account.role}] (${account.username})...`);
    setLoading(true);
    try {
      const session = await uiApi.auth.login(account.username, account.password);
      onLogin(session);
    } catch (requestError) {
      setError(requestError.message || `Không thể đăng nhập tài khoản ${account.username}. Vui lòng thử lại.`);
      setSuccessMsg("");
    } finally {
      setLoading(false);
      setActiveQuickRole(null);
    }
  }

  // Xử lý đăng nhập thủ công
  async function submitLogin(event) {
    event.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const session = await uiApi.auth.login(username.trim(), password);
      onLogin(session);
    } catch (requestError) {
      setError(requestError.message || "Không thể đăng nhập. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  }

  // Xử lý đăng ký tài khoản mới
  async function submitRegister(event) {
    event.preventDefault();
    setError("");
    setSuccessMsg("");

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số.");
      return;
    }

    setLoading(true);
    try {
      await uiApi.auth.register({
        username: username.trim(),
        password,
        fullName: fullName.trim(),
        email: email.trim() || undefined
      });
      setSuccessMsg("Đăng ký tài khoản thành công! Đang tự động đăng nhập...");
      setTimeout(async () => {
        try {
          const session = await uiApi.auth.login(username.trim(), password);
          onLogin(session);
        } catch {
          setMode("login");
          setSuccessMsg("Tài khoản đã tạo thành công. Vui lòng nhập mật khẩu để đăng nhập.");
        }
      }, 1000);
    } catch (requestError) {
      setError(requestError.message || "Đăng ký thất bại. Tên đăng nhập có thể đã tồn tại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title" style={{ maxWidth: 540, width: "100%" }}>
        <div className="login-brand">
          <div className="login-brand-mark">IDP</div>
          <div>
            <strong>IDP Technology</strong>
            <span>Document Management System (IDP.DMS)</span>
          </div>
        </div>

        {/* Tab chuyển đổi Đăng nhập / Đăng ký */}
        <div style={{
          display: "flex",
          background: "#f1f5f9",
          borderRadius: 8,
          padding: 4,
          marginBottom: 16,
          marginTop: 8
        }}>
          <button
            type="button"
            onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); }}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              background: mode === "login" ? "#ffffff" : "transparent",
              color: mode === "login" ? "#0f3d73" : "#64748b",
              boxShadow: mode === "login" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s"
            }}
          >
            <LogIn size={15} /> Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(""); setSuccessMsg(""); }}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              background: mode === "register" ? "#ffffff" : "transparent",
              color: mode === "register" ? "#0f3d73" : "#64748b",
              boxShadow: mode === "register" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s"
            }}
          >
            <UserPlus size={15} /> Tạo tài khoản mới
          </button>
        </div>

        {mode === "login" ? (
          <>
            <div className="login-heading" style={{ marginBottom: 12 }}>
              <h1 id="login-title" style={{ fontSize: 20 }}>Đăng nhập hệ thống</h1>
              <p style={{ fontSize: 13 }}>Đăng nhập bằng JWT bảo mật hoặc sử dụng nút 1-Click Demo bên dưới.</p>
            </div>

            {/* Quick Demo Switcher Container */}
            <div style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 16
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8
              }}>
                <span style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}>
                  <Zap size={16} color="#eab308" fill="#eab308" />
                  Chuyển nhanh vai trò Demo (1-Click Login)
                </span>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
                  Xác thực JWT thật
                </span>
              </div>
              <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px 0" }}>
                Bấm trực tiếp vào vai trò bên dưới để đăng nhập ngay mà không cần gõ mật khẩu:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {DEMO_ACCOUNTS.map((acc) => {
                  const IconComp = acc.icon;
                  const isCurrentLoading = loading && activeQuickRole === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickLogin(acc)}
                      style={{
                        background: acc.bg,
                        border: `1px solid ${acc.border}`,
                        borderRadius: 8,
                        padding: "8px 12px",
                        textAlign: "left",
                        cursor: loading ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        transition: "all 0.15s ease",
                        opacity: loading && activeQuickRole !== acc.id ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          background: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: `1px solid ${acc.border}`,
                          color: acc.color,
                          flexShrink: 0
                        }}>
                          <IconComp size={16} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <strong style={{ fontSize: 13, color: "#0f172a" }}>{acc.role}</strong>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: acc.color,
                              background: "#ffffff",
                              border: `1px solid ${acc.border}`,
                              borderRadius: 4,
                              padding: "1px 6px"
                            }}>
                              {acc.badge}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                            <code>{acc.username}</code> / <code>{acc.password}</code> &bull; <span style={{ color: "#64748b" }}>{acc.desc}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{
                        color: acc.color,
                        display: "flex",
                        alignItems: "center",
                        fontSize: 12,
                        fontWeight: 600,
                        gap: 2,
                        flexShrink: 0
                      }}>
                        {isCurrentLoading ? "Đang vào..." : (
                          <>
                            Vào <ArrowRight size={14} />
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              margin: "12px 0",
              color: "#94a3b8",
              fontSize: 11,
              fontWeight: 600
            }}>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
              HOẶC ĐĂNG NHẬP THỦ CÔNG
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
            </div>

            <form className="login-form" onSubmit={submitLogin}>
              <label>
                <span>Tên đăng nhập</span>
                <div className="login-input-wrap">
                  <UserRound size={18} aria-hidden="true" />
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    required
                    placeholder="VD: admin hoặc docgia"
                  />
                </div>
              </label>

              <label>
                <span>Mật khẩu</span>
                <div className="login-input-wrap">
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    placeholder="Nhập mật khẩu"
                  />
                </div>
              </label>

              {error && <div className="login-error" role="alert">{error}</div>}
              {successMsg && (
                <div style={{ padding: "8px 12px", background: "#f0fdf4", color: "#166534", borderRadius: 6, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={16} /> {successMsg}
                </div>
              )}

              <button className="login-submit" type="submit" disabled={loading}>
                <LogIn size={18} />
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="login-heading" style={{ marginBottom: 12 }}>
              <h1 id="login-title" style={{ fontSize: 20 }}>Đăng ký tài khoản</h1>
              <p style={{ fontSize: 13 }}>Tài khoản mới sẽ được cấp quyền mặc định theo phân quyền người dùng khai thác.</p>
            </div>

            <form className="login-form" onSubmit={submitRegister}>
              <label>
                <span>Tên đăng nhập <small>(chữ không dấu, số, dấu chấm/gạch)</small></span>
                <div className="login-input-wrap">
                  <UserRound size={18} aria-hidden="true" />
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value.toLowerCase())}
                    autoComplete="username"
                    required
                    placeholder="VD: nguyenvanan"
                  />
                </div>
              </label>

              <label>
                <span>Họ và tên</span>
                <div className="login-input-wrap">
                  <UserRound size={18} aria-hidden="true" />
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                    placeholder="VD: Nguyễn Văn An"
                  />
                </div>
              </label>

              <label>
                <span>Email liên hệ (tùy chọn)</span>
                <div className="login-input-wrap">
                  <Mail size={18} aria-hidden="true" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="VD: an.nv@idp.vn"
                  />
                </div>
              </label>

              <label>
                <span>Mật khẩu <small>(tối thiểu 8 ký tự, gồm cả chữ và số)</small></span>
                <div className="login-input-wrap">
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    placeholder="Nhập mật khẩu"
                  />
                </div>
              </label>

              <label>
                <span>Nhập lại mật khẩu</span>
                <div className="login-input-wrap">
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    placeholder="Nhập lại mật khẩu để xác nhận"
                  />
                </div>
              </label>

              {error && <div className="login-error" role="alert">{error}</div>}
              {successMsg && (
                <div style={{ padding: "8px 12px", background: "#f0fdf4", color: "#166534", borderRadius: 6, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={16} /> {successMsg}
                </div>
              )}

              <button className="login-submit" type="submit" disabled={loading} style={{ background: "#0284c7" }}>
                <UserPlus size={18} />
                {loading ? "Đang khởi tạo tài khoản..." : "Hoàn tất đăng ký"}
              </button>
            </form>
          </>
        )}

        <p className="login-footnote" style={{ marginTop: 16 }}>
          Phiên đăng nhập được bảo vệ bằng JWT &bull; Độc lập phân quyền theo vai trò.
        </p>
      </section>
    </main>
  );
}
