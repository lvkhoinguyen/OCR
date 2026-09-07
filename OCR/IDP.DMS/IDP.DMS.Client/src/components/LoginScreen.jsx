import { useState } from "react";
import { LockKeyhole, LogIn, UserRound, UserPlus, Mail, ShieldCheck, CheckCircle2 } from "lucide-react";
import { uiApi } from "../services/uiApi";

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

  // Xử lý đăng nhập
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
      // Tự động đăng nhập luôn sau khi đăng ký
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

  const fillCredentials = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError("");
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title" style={{ maxWidth: 440 }}>
        <div className="login-brand">
          <div className="login-brand-mark">IDP</div>
          <div>
            <strong>IDP Technology</strong>
            <span>Document Management System</span>
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
              <p style={{ fontSize: 13 }}>Sử dụng tài khoản quản trị hoặc tài khoản được cấp theo vai trò.</p>
            </div>

            {/* Box gợi ý tài khoản mặc định */}
            <div style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 16,
              fontSize: 12
            }}>
              <div style={{ fontWeight: 700, color: "#166534", display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                <ShieldCheck size={15} /> Tài khoản kiểm thử nhanh:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => fillCredentials("admin", "Admin@123")}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #16a34a",
                    color: "#166534",
                    borderRadius: 6,
                    padding: "6px 8px",
                    fontSize: 11,
                    textAlign: "left",
                    cursor: "pointer",
                    lineHeight: 1.3
                  }}
                >
                  <strong>1. Quản trị (Admin)</strong><br />
                  <span style={{ color: "#64748b" }}>admin / Admin@123</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("nhaplieu", "User@123")}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #2563eb",
                    color: "#1d4ed8",
                    borderRadius: 6,
                    padding: "6px 8px",
                    fontSize: 11,
                    textAlign: "left",
                    cursor: "pointer",
                    lineHeight: 1.3
                  }}
                >
                  <strong>2. Nhập liệu</strong><br />
                  <span style={{ color: "#64748b" }}>nhaplieu / User@123</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("lanhdao", "Approver@123")}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #d97706",
                    color: "#b45309",
                    borderRadius: 6,
                    padding: "6px 8px",
                    fontSize: 11,
                    textAlign: "left",
                    cursor: "pointer",
                    lineHeight: 1.3
                  }}
                >
                  <strong>3. Kiểm duyệt</strong><br />
                  <span style={{ color: "#64748b" }}>lanhdao / Approver@123</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("khach", "Guest@123")}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #7c3aed",
                    color: "#6d28d9",
                    borderRadius: 6,
                    padding: "6px 8px",
                    fontSize: 11,
                    textAlign: "left",
                    cursor: "pointer",
                    lineHeight: 1.3
                  }}
                >
                  <strong>4. Khai thác</strong><br />
                  <span style={{ color: "#64748b" }}>khach / Guest@123</span>
                </button>
              </div>
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
                    autoFocus
                    required
                    placeholder="VD: admin"
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
              <p style={{ fontSize: 13 }}>Tài khoản đầu tiên khởi tạo sẽ nhận vai trò Quản trị viên cao nhất.</p>
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
          Phiên đăng nhập được bảo vệ bằng JWT và tự động hết hạn.
        </p>
      </section>
    </main>
  );
}
