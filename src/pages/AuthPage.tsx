import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, User as UserIcon, Wind } from "lucide-react";
import { AuthError, signInWithEmail, signInWithGoogle, signUpWithEmail } from "../services/auth";
import { GoogleIcon } from "../components/shared/GoogleIcon";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../hooks/useTranslation";

type AuthMode = "login" | "signup";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthPage() {
  const navigate = useNavigate();
  const { currentUser, refreshCurrentUser } = useAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const isBusy = isSubmitting || isGoogleLoading;

  // Navigate once AuthContext's currentUser actually reflects the signed-in
  // user, rather than right after the sign-in call resolves — the auth state
  // listener updates a moment later, and navigating too early would hit
  // ProtectedRoute while it still sees a stale, logged-out state.
  useEffect(() => {
    if (currentUser) navigate("/profile", { replace: true });
  }, [currentUser, navigate]);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError("");
  }

  function validate(): string | null {
    if (mode === "signup" && !name.trim()) return t("auth.errorName");
    if (!email.trim()) return t("auth.errorEmail");
    if (!EMAIL_PATTERN.test(email)) return t("auth.errorEmailFormat");
    if (!password) return t("auth.errorPassword");
    if (password.length < 6) return t("auth.errorPasswordLength");
    if (mode === "signup" && password !== confirmPassword) return t("auth.errorPasswordMatch");
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isBusy) return;
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password, name);
        // updateProfile() mutates the auth user object in place, which may
        // not trigger a re-render on its own — force one so the display
        // name is correct wherever currentUser is read next (e.g. Profile).
        refreshCurrentUser();
      } else {
        await signInWithEmail(email, password);
      }
      // Navigation happens reactively via the currentUser effect above.
    } catch (err) {
      setError(
        err instanceof AuthError ? t(`auth.errors.${err.translationKey}`) : t("auth.genericError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    if (isBusy) return;
    setError("");
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Navigation happens reactively via the currentUser effect above.
    } catch (err) {
      setError(
        err instanceof AuthError ? t(`auth.errors.${err.translationKey}`) : t("auth.genericError"),
      );
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[480px] flex-col justify-center gap-6 overflow-y-auto p-6">
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1.5">
          <Wind size={30} className="text-brand-600" strokeWidth={2.5} />
          <span className="text-brand-700 text-2xl font-bold tracking-tight">
            AirSync
          </span>
        </div>
        <p className="text-sm text-gray-400">{t("auth.tagline")}</p>
      </div>

      <div className="flex items-center rounded-full border border-gray-200 bg-gray-50 p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`flex-1 rounded-full py-2 transition-colors ${
            mode === "login" ? "bg-brand-600 text-white" : "text-gray-500"
          }`}
        >
          {t("auth.login")}
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={`flex-1 rounded-full py-2 transition-colors ${
            mode === "signup" ? "bg-brand-600 text-white" : "text-gray-500"
          }`}
        >
          {t("auth.signup")}
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-3.5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
      >
        {mode === "signup" && (
          <div>
            <label htmlFor="auth-name" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t("auth.name")}
            </label>
            <div className="relative">
              <UserIcon
                size={18}
                className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
              />
              <input
                id="auth-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                placeholder={t("auth.namePlaceholder")}
                className="focus:border-brand-500 w-full rounded-xl border border-gray-200 py-3 pr-3.5 pl-10 text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("auth.email")}
          </label>
          <div className="relative">
            <Mail
              size={18}
              className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
            />
            <input
              id="auth-email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              className="focus:border-brand-500 w-full rounded-xl border border-gray-200 py-3 pr-3.5 pl-10 text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        <div>
          <label htmlFor="auth-password" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("auth.password")}
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
            />
            <input
              id="auth-password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.passwordPlaceholder")}
              className="focus:border-brand-500 w-full rounded-xl border border-gray-200 py-3 pr-10 pl-10 text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              className="absolute top-1/2 right-3.5 -translate-y-1/2 text-gray-400"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {mode === "signup" && (
          <div>
            <label htmlFor="auth-confirm-password" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t("auth.confirmPassword")}
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
              />
              <input
                id="auth-confirm-password"
                name="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.confirmPasswordPlaceholder")}
                className="focus:border-brand-500 w-full rounded-xl border border-gray-200 py-3 pr-3.5 pl-10 text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isBusy}
          className="bg-brand-600 hover:bg-brand-700 flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white shadow-sm transition-colors disabled:opacity-60"
        >
          {isSubmitting && <Loader2 size={18} className="animate-spin" />}
          {mode === "signup" ? t("auth.signup") : t("auth.login")}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">{t("auth.or")}</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isBusy}
        className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
      >
        {isGoogleLoading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <GoogleIcon size={18} />
        )}
        {t("auth.googleLogin")}
      </button>
    </div>
  );
}
