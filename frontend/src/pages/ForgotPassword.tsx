import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

type Step = "email" | "sent" | "reset" | "success";

interface ForgotPasswordState {
  email: string;
  token: string;
  newPassword: string;
  confirmPassword: string;
  loading: boolean;
  error: string | null;
  step: Step;
}

const ForgotPassword: React.FC = () => {
  const [state, setState] = useState<ForgotPasswordState>({
    email: "",
    token: "",
    newPassword: "",
    confirmPassword: "",
    loading: false,
    error: null,
    step: "email",
  });

  const updateState = (updates: Partial<ForgotPasswordState>) =>
    setState((prev) => ({ ...prev, ...updates }));

  // E-posta gönder
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.email.trim()) {
      updateState({ error: "E-posta adresi gerekli." });
      return;
    }

    updateState({ loading: true, error: null });

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Bir hata oluştu.");
      }

      // Geliştirme ortamında token otomatik doldur
      if (data.debug_token) {
        updateState({
          token: data.debug_token,
          step: "reset",
          loading: false,
        });
      } else {
        updateState({ step: "sent", loading: false });
      }
    } catch (err: any) {
      updateState({ error: err.message, loading: false });
    }
  };

  // Şifreyi sıfırla
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.newPassword || state.newPassword.length < 8) {
      updateState({ error: "Şifre en az 8 karakter olmalı." });
      return;
    }

    if (state.newPassword !== state.confirmPassword) {
      updateState({ error: "Şifreler eşleşmiyor." });
      return;
    }

    updateState({ loading: true, error: null });

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: state.token,
          new_password: state.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Şifre sıfırlanamadı.");
      }

      updateState({ step: "success", loading: false });
    } catch (err: any) {
      updateState({ error: err.message, loading: false });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 flex items-center justify-center p-4">
      {/* Arka plan efekti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-2xl mb-4 border border-red-500/30">
            <span className="text-3xl">🌍</span>
          </div>
          <h1 className="text-2xl font-bold text-white">QuakeSense</h1>
          <p className="text-slate-400 text-sm mt-1">Deprem Takip Platformu</p>
        </div>

        {/* Kart */}
        <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {/* E-posta adımı */}
          {state.step === "email" && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Şifremi Unuttum
                </h2>
                <p className="text-slate-400 text-sm">
                  Kayıtlı e-posta adresinizi girin. Şifre sıfırlama bağlantısı
                  göndereceğiz.
                </p>
              </div>

              <form onSubmit={handleSendEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    E-posta Adresi
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={state.email}
                      onChange={(e) => updateState({ email: e.target.value, error: null })}
                      placeholder="ornek@email.com"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                {state.error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {state.error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={state.loading}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {state.loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    "Sıfırlama Bağlantısı Gönder"
                  )}
                </button>
              </form>
            </>
          )}

          {/* Gönderildi adımı */}
          {state.step === "sent" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                E-posta Gönderildi!
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                <strong className="text-slate-300">{state.email}</strong> adresine
                şifre sıfırlama bağlantısı gönderdik. Lütfen gelen kutunuzu
                kontrol edin.
              </p>
              <p className="text-slate-500 text-xs mb-6">
                E-posta gelmedi mi? Spam klasörünü kontrol edin veya birkaç
                dakika bekleyin.
              </p>
              <button
                onClick={() => updateState({ step: "email", error: null })}
                className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
              >
                Farklı e-posta dene
              </button>
            </div>
          )}

          {/* Şifre sıfırlama adımı */}
          {state.step === "reset" && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Yeni Şifre Belirle
                </h2>
                <p className="text-slate-400 text-sm">
                  Güçlü bir şifre seçin. En az 8 karakter olmalı.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* Token alanı (geliştirme için görünür, production'da gizli) */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Sıfırlama Kodu
                  </label>
                  <input
                    type="text"
                    value={state.token}
                    onChange={(e) => updateState({ token: e.target.value, error: null })}
                    placeholder="E-postanızdaki kodu girin"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors font-mono text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Yeni Şifre
                  </label>
                  <input
                    type="password"
                    value={state.newPassword}
                    onChange={(e) => updateState({ newPassword: e.target.value, error: null })}
                    placeholder="En az 8 karakter"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Şifre Tekrar
                  </label>
                  <input
                    type="password"
                    value={state.confirmPassword}
                    onChange={(e) => updateState({ confirmPassword: e.target.value, error: null })}
                    placeholder="Şifreyi tekrar girin"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                    required
                  />
                </div>

                {/* Şifre gücü göstergesi */}
                {state.newPassword && (
                  <PasswordStrengthIndicator password={state.newPassword} />
                )}

                {state.error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {state.error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={state.loading}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {state.loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Güncelleniyor...
                    </>
                  ) : (
                    "Şifremi Güncelle"
                  )}
                </button>
              </form>
            </>
          )}

          {/* Başarı adımı */}
          {state.step === "success" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Şifre Güncellendi!
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş
                yapabilirsiniz.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Giriş Yap
              </Link>
            </div>
          )}

          {/* Geri dön linki */}
          {state.step !== "success" && (
            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-300 text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Giriş sayfasına dön
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Şifre gücü göstergesi bileşeni
const PasswordStrengthIndicator: React.FC<{ password: string }> = ({ password }) => {
  const checks = [
    { label: "En az 8 karakter", ok: password.length >= 8 },
    { label: "Büyük harf", ok: /[A-Z]/.test(password) },
    { label: "Küçük harf", ok: /[a-z]/.test(password) },
    { label: "Rakam", ok: /\d/.test(password) },
    { label: "Özel karakter", ok: /[!@#$%^&*]/.test(password) },
  ];

  const score = checks.filter((c) => c.ok).length;
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-green-500"];
  const strengthLabels = ["Çok Zayıf", "Zayıf", "Orta", "Güçlü", "Çok Güçlü"];

  return (
    <div className="space-y-2">
      {/* Güç çubuğu */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= score ? strengthColors[score - 1] : "bg-slate-600"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-400">
        Güç:{" "}
        <span className={`font-medium ${score >= 4 ? "text-green-400" : score >= 3 ? "text-yellow-400" : "text-red-400"}`}>
          {strengthLabels[score - 1] || "Çok Zayıf"}
        </span>
      </p>
    </div>
  );
};

export default ForgotPassword;