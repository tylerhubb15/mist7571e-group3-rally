import React, { useState } from "react";
import { Activity, Mail, Lock, User, Loader2, MailCheck } from "lucide-react";
import { useAuth } from "../hooks/hooks.jsx";
import { isSupabaseConfigured } from "../lib/services.js";
import { ErrorNote, CharWarning } from "./Shared.jsx";
import { sanitizeName } from "../lib/textFilter.js";
import { useCharWarning } from "../hooks/useCharWarning.js";

// Sign in with Apple needs a paid Apple Developer account (Services ID +
// private key) configured in the Supabase dashboard. Flip this on once
// that's set up — the button and handler are already wired.
const APPLE_OAUTH_ENABLED = false;

export default function Auth() {
  const { signIn, signUpWithEmail, signInWithEmail } = useAuth();
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [oauthLoading, setOauthLoading] = useState(null); // 'google' | null
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [firstNameWarn, filterFirstName] = useCharWarning(sanitizeName);
  const [lastNameWarn, filterLastName] = useCharWarning(sanitizeName);

  const withOAuth = async (provider) => {
    setError(null);
    setOauthLoading(provider);
    const { error: err } = await signIn(provider);
    if (err) setError(err);
    setOauthLoading(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setFormLoading(true);
    const { data, error: err } =
      mode === "signup"
        ? await signUpWithEmail({ email, password, firstName, lastName })
        : await signInWithEmail({ email, password });
    setFormLoading(false);
    if (err) { setError(err); return; }
    // Email confirmation is on by default — signUp succeeds but returns no
    // session until the user clicks the link in their inbox.
    if (mode === "signup" && !data?.session) setCheckEmail(true);
  };

  return (
    <div className="rally court-bg flex-center" style={{ minHeight: "100vh", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div className="flex-col-center mb-26">
          <div className="logo-ring flex-center mb-8" style={{ width: 44, height: 44 }}>
            <Activity size={22} color="var(--ink)" />
          </div>
          <span className="disp" style={{ fontSize: 28, fontWeight: 800 }}>RALLY</span>
          <span className="text-muted-sm">find your hit</span>
        </div>

        <div className="card pop" style={{ padding: 24 }}>
          {!isSupabaseConfigured ? (
            <ErrorNote
              error={{ message: "not configured" }}
              label="Supabase isn't configured yet — copy .env.example to .env and fill in your project URL + anon key."
            />
          ) : null}

          {checkEmail ? (
            <div className="modal-container">
              <MailCheck size={30} className="modal-icon" color="var(--optic-d)" />
              <div className="disp modal-heading">Check your email</div>
              <p className="modal-text">
                We sent a confirmation link to <strong style={{ color: "var(--ink)" }}>{email}</strong>.
                Click it to activate your account, then sign in below.
              </p>
              <button className="btn btn-ghost btn-full mt-16"
                onClick={() => { setCheckEmail(false); setMode("signin"); }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <button className="btn btn-o btn-full mb-9"
                disabled={oauthLoading !== null} onClick={() => withOAuth("google")}>
                {oauthLoading === "google" ? <Loader2 size={16} className="spin" /> : <GoogleG />}
                Continue with Google
              </button>
              <button className="btn btn-ghost btn-full mb-16"
                disabled={!APPLE_OAUTH_ENABLED || oauthLoading !== null}
                onClick={() => withOAuth("apple")}>
                <AppleLogo />
                Continue with Apple{!APPLE_OAUTH_ENABLED ? " — coming soon" : ""}
              </button>

              <div className="modal-divider-wrapper">
                <div className="divider flex-1" />
                <span className="text-muted-sm">OR</span>
                <div className="divider flex-1" />
              </div>

              <ErrorNote error={error} />

              <form onSubmit={submit}>
                {mode === "signup" ? (
                  <div style={{ display: "flex", gap: 9, marginBottom: 11 }}>
                    <div className="inp-icon-wrapper flex-1">
                      <User size={15} className="inp-icon" />
                      <input className="inp inp-with-icon" placeholder="First name"
                        value={firstName} onChange={(e) => setFirstName(filterFirstName(e.target.value))} required />
                      <CharWarning show={firstNameWarn} />
                    </div>
                    <div className="flex-1">
                      <input className="inp" placeholder="Last name"
                        value={lastName} onChange={(e) => setLastName(filterLastName(e.target.value))} required />
                      <CharWarning show={lastNameWarn} />
                    </div>
                  </div>
                ) : null}
                <div className="inp-icon-wrapper mb-11">
                  <Mail size={15} className="inp-icon" />
                  <input className="inp inp-with-icon" type="email" placeholder="Email"
                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="inp-icon-wrapper mb-16">
                  <Lock size={15} className="inp-icon" />
                  <input className="inp inp-with-icon" type="password"
                    placeholder={mode === "signup" ? "Password (min 6 characters)" : "Password"}
                    value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
                </div>
                <button className="btn btn-y btn-full"
                  disabled={formLoading}>
                  {formLoading ? <Loader2 size={16} className="spin" /> : null}
                  {mode === "signup" ? "Create account" : "Sign in"}
                </button>
              </form>

              <div className="text-center text-muted mt-16" style={{ fontSize: 13 }}>
                {mode === "signup" ? "Already have an account?" : "New to Rally?"}{" "}
                <button className="btn btn-ghost" style={{ padding: "2px 6px", fontWeight: 800, color: "var(--ink)" }}
                  onClick={() => { setError(null); setMode(mode === "signup" ? "signin" : "signup"); }}>
                  {mode === "signup" ? "Sign in" : "Create one"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const GoogleG = () => (
  <svg width="16" height="16" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z" />
    <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33Z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
  </svg>
);

const AppleLogo = () => (
  <svg width="15" height="15" viewBox="0 0 384 512" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
  </svg>
);
