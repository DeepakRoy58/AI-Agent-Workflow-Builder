import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/router";
import { useSignInEmailPassword, useAuthenticationStatus } from "@nhost/react";

// ---- tiny inline icons (no extra deps) ----
const MailIcon = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <rect x="2" y="4" width="20" height="16" rx="3" />
    <path d="m3 6 9 7 9-7" />
  </svg>
);
const LockIcon = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
const EyeIcon = ({ off, ...props }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    {off ? (
      <>
        <path d="M3 3l18 18" />
        <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6 0 9.5 5.5 9.9 7a11.3 11.3 0 0 1-3 3.9M6.6 6.6C3.9 8.3 2.4 11 2.1 12c.4 1.5 3.9 7 9.9 7 1.3 0 2.5-.2 3.5-.6" />
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      </>
    ) : (
      <>
        <path d="M2.1 12S5.6 5 12 5s9.9 7 9.9 7-3.5 7-9.9 7-9.9-7-9.9-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);
const ArrowIcon = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
    <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.5c-2 1.5-4.6 2.5-7.5 2.5-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.5 5.5C39.9 37.1 44 31.4 44 24c0-1.3-.1-2.7-.4-3.5z"/>
  </svg>
);
const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
    <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z"/>
  </svg>
);
const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
    <path d="M16.4 1c.1 1.1-.3 2.2-1 3-.7.8-1.9 1.5-3 1.4-.1-1.1.4-2.2 1-2.9C14.1 1.6 15.3 1 16.4 1zM20.7 17.2c-.5 1.1-.7 1.6-1.4 2.6-.9 1.4-2.2 3.1-3.8 3.1-1.4 0-1.8-.9-3.7-.9-1.9 0-2.4.9-3.7.9-1.6 0-2.8-1.5-3.7-2.9C1.9 17.1 1.3 13 2.8 10.2c.8-1.5 2.3-2.5 3.9-2.5 1.5 0 2.5 1 3.7 1 1.2 0 2-.9 3.7-1 .7 0 2.6.2 3.9 2-.1.1-2.3 1.4-2.3 4 0 3.1 2.7 4.2 2.9 4.3z"/>
  </svg>
);

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { signInEmailPassword, isLoading, isError, error } = useSignInEmailPassword();
  const { isAuthenticated } = useAuthenticationStatus();
  const router = useRouter();

  // Redirect as soon as auth state flips to true, regardless of how it got there
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const result = await signInEmailPassword(email, password);

      // Force navigation immediately on success OR on "already-signed-in"
      // (which means a valid session already exists from an earlier attempt).
      if (result?.isSuccess || result?.error?.error === "already-signed-in") {
        window.location.href = "/";
      }
    } catch (err) {
      console.error("SIGNIN THREW:", err);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.badge}>
          <ArrowIcon color="#1a1a1a" />
        </div>

        <h1 style={styles.title}>Sign in with email</h1>
        <p style={styles.subtitle}>
          Make a new doc to bring your words, data, and teams together. For free.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={styles.inputWrap}>
            <MailIcon style={styles.leftIcon} color="#9aa1ac" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputWrap}>
            <LockIcon style={styles.leftIcon} color="#9aa1ac" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ ...styles.input, paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              style={styles.eyeButton}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <EyeIcon off={!showPassword} color="#9aa1ac" />
            </button>
          </div>

          <div style={styles.forgotRow}>
            <a href="/forgot-password" style={styles.link}>
              Forgot password?
            </a>
          </div>

          {isError && (
            <p style={styles.error}>
              {error?.message || "Something went wrong. Please try again."}
            </p>
          )}

          <button type="submit" disabled={isLoading} style={styles.cta}>
            {isLoading ? "Signing in…" : "Get Started"}
          </button>
        </form>

        <div style={styles.dividerRow}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>Or sign in with</span>
          <span style={styles.dividerLine} />
        </div>

        <div style={styles.socialRow}>
          <button type="button" style={{ ...styles.socialButton, background: "#fff" }} aria-label="Sign in with Google">
            <GoogleIcon />
          </button>
          <button type="button" style={{ ...styles.socialButton, background: "#1877F2" }} aria-label="Sign in with Facebook">
            <FacebookIcon />
          </button>
          <button type="button" style={{ ...styles.socialButton, background: "#000" }} aria-label="Sign in with Apple">
            <AppleIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: CSSProperties } = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background:
      "radial-gradient(circle at 15% 15%, #dfe9fb 0%, transparent 45%), radial-gradient(circle at 85% 20%, #eadcf7 0%, transparent 45%), radial-gradient(circle at 50% 100%, #e3f0ea 0%, transparent 50%), #f4f6fb",
  },
  card: {
    width: "100%",
    maxWidth: 380,
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(20px)",
    borderRadius: 28,
    padding: "36px 32px",
    boxShadow: "0 20px 60px rgba(30,41,80,0.12)",
    border: "1px solid rgba(255,255,255,0.6)",
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 16px rgba(30,41,80,0.1)",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#12141a",
    margin: "0 0 8px",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 1.5,
    color: "#6b7280",
    margin: "0 0 24px",
  },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    marginBottom: 12,
  },
  leftIcon: {
    position: "absolute",
    left: 14,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 14px 14px 40px",
    borderRadius: 14,
    border: "1px solid #e6e8ee",
    background: "#fff",
    fontSize: 14,
    outline: "none",
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    background: "none",
    border: "none",
    padding: 0,
    display: "flex",
    cursor: "pointer",
  },
  forgotRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  link: {
    fontSize: 13,
    color: "#4f5b76",
    textDecoration: "none",
  },
  error: {
    fontSize: 13,
    color: "#d64545",
    margin: "0 0 12px",
  },
  cta: {
    width: "100%",
    padding: "15px 0",
    borderRadius: 999,
    border: "none",
    background: "#14161a",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  dividerRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "24px 0 18px",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "#e6e8ee",
  },
  dividerText: {
    fontSize: 12,
    color: "#9aa1ac",
    whiteSpace: "nowrap",
  },
  socialRow: {
    display: "flex",
    gap: 12,
  },
  socialButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
};