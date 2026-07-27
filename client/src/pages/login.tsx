import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { pmosApi } from "../services/pmosApi";

export const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("token")) navigate("/");
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const { token } = await pmosApi.login({ username, password });
      localStorage.setItem("token", token);
      navigate("/");
    } catch {
      setError("Incorrect username or password.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, next?: string) => {
    if (e.key === "Enter") {
      if (next) document.getElementById(next)?.focus();
      else handleLogin(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="pmos-login-wrap">
      <div className="pmos-login-card">
        <div className="pmos-login-stamp">PMOS</div>
        <h2>Pipeline Board</h2>
        <p>Sign in to your team's operations board.</p>

        <form onSubmit={handleLogin}>
          <div className="pmos-field">
            <label>Username</label>
            <input
              id="pmos-username"
              autoComplete="username"
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
          <button type="submit" className="pmos-btn primary" style={{ width: "100%" }}>
            Sign in
          </button>
        </form>

      </div>
    </div>
  );
};
