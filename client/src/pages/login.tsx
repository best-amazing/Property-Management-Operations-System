import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { pmosApi } from "../services/pmosApi";

export const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loginSessionToken, setLoginSessionToken] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("token")) navigate("/");
  }, [navigate]);

  const sendOtp = async () => {
    setError("");
    setIsSending(true);
    try {
      const res = await pmosApi.login({ username, password });
      setLoginSessionToken(res.loginSessionToken);
      setCode("");
    } catch (e: any) {
      setError(e.message || "Incorrect username or password.");
    } finally {
      setIsSending(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendOtp();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsVerifying(true);
    try {
      const { token } = await pmosApi.verifyOtp({ loginSessionToken, code });
      localStorage.setItem("token", token);
      navigate("/");
    } catch (e: any) {
      setError(e.message || "Invalid code.");
    } finally {
      setIsVerifying(false);
    }
  };

  const resetLogin = () => {
    setLoginSessionToken("");
    setCode("");
    setError("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, next?: string) => {
    if (e.key === "Enter") {
      if (next) document.getElementById(next)?.focus();
    }
  };

  return (
    <div className="pmos-login-wrap">
      <div className="pmos-login-card">
        <div className="pmos-login-stamp">AB Investment Groups</div>
        <h2>Pipeline Board</h2>

        {!loginSessionToken ? (
          <>
            <p>Sign in to your team's operations board.</p>
            <form onSubmit={handleLogin}>
              <div className="pmos-field">
                <label>Email</label>
                <input
                  id="pmos-username"
                  autoComplete="email"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => handleKeyDown(e, "pmos-password")}
                />
              </div>
              <div className="pmos-field">
                <label>Password</label>
                <input
                  id="pmos-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => handleKeyDown(e)}
                />
              </div>
              <div className="pmos-login-error">{error}</div>
              <button type="submit" className="pmos-btn primary" style={{ width: "100%" }} disabled={isSending}>
                {isSending ? "Sending code..." : "Sign in"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p>Enter the 6-digit code sent to <strong>{username}</strong>.</p>
            <form onSubmit={handleVerify}>
              <div className="pmos-field">
                <label>Verification code</label>
                <input
                  id="pmos-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => handleKeyDown(e)}
                />
              </div>
              <div className="pmos-login-error">{error}</div>
              <button type="submit" className="pmos-btn primary" style={{ width: "100%" }} disabled={isVerifying || code.length !== 6}>
                {isVerifying ? "Verifying..." : "Verify & Sign in"}
              </button>
            </form>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
              <button type="button" className="pmos-btn" onClick={sendOtp} disabled={isSending}>
                {isSending ? "Sending..." : "Resend code"}
              </button>
              <button type="button" className="pmos-btn" onClick={resetLogin}>
                Different account
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
