import { useState } from "react";
import { LockKeyhole, LogIn, UserRound } from "lucide-react";
import { uiApi } from "../services/uiApi";

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await uiApi.auth.login(username.trim(), password);
      onLogin(session);
    } catch (requestError) {
      setError(requestError.message || "Không thể đăng nhập.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <div className="login-brand-mark">IDP</div>
          <div>
            <strong>IDP Technology</strong>
            <span>Document Management System</span>
          </div>
        </div>

        <div className="login-heading">
          <h1 id="login-title">Đăng nhập hệ thống</h1>
          <p>Sử dụng tài khoản được cấp để truy cập và xử lý hồ sơ.</p>
        </div>

        <form className="login-form" onSubmit={submit}>
          <label>
            <span>Tên đăng nhập</span>
            <div className="login-input-wrap">
              <UserRound size={18} aria-hidden="true" />
              <input value={username} onChange={(event) => setUsername(event.target.value)}
                autoComplete="username" autoFocus required placeholder="Nhập tên đăng nhập" />
            </div>
          </label>

          <label>
            <span>Mật khẩu</span>
            <div className="login-input-wrap">
              <LockKeyhole size={18} aria-hidden="true" />
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password" required placeholder="Nhập mật khẩu" />
            </div>
          </label>

          {error && <div className="login-error" role="alert">{error}</div>}

          <button className="login-submit" type="submit" disabled={loading}>
            <LogIn size={18} />
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="login-footnote">Phiên đăng nhập được bảo vệ bằng JWT và tự động hết hạn.</p>
      </section>
    </main>
  );
}
