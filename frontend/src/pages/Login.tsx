import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface LoginState {
  email: string;
  password: string;
  showPassword: boolean;
  loading: boolean;
  error: string | null;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<LoginState>({
    email: "",
    password: "",
    showPassword: false,
    loading: false,
    error: null,
  });

  const updateState = (updates: Partial<LoginState>) =>
    setState((prev) => ({ ...prev, ...updates }));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    updateState({ loading: true, error: null });

    try {
      const res = await fetch(`${API_BASE}/api/v1/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.email, password: state.password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Giriş başarısız.");
      }

      // Token ve kullanıcı bilgisini kaydet
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/dashboard");
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
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-1">Giriş Yap</h2>
            <p className="text-slate-400 text-sm">Hesabınıza erişin</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* E-posta */}
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
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Şifre */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">
                  Şifre
                </label>
                {/* Şifremi unuttum linki */}
                <Link
                  to="/forgot-password"
                  className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
                >
                  Şifremi Unuttum
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={state.showPassword ? "text" : "password"}
                  value={state.password}
                  onChange={(e) => updateState({ password: e.target.value, error: null })}
                  placeholder="Şifrenizi girin"
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl pl-10 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => updateState({ showPassword: !state.showPassword })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {state.showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Hata mesajı */}
            {state.error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {state.error}
              </div>
            )}

            {/* Giriş butonu */}
            <button
              type="submit"
              disabled={state.loading}
              className="w-full bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {state.loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                "Giriş Yap"
              )}
            </button>
          </form>

          {/* Kayıt ol linki */}
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              Hesabınız yok mu?{" "}
              <Link
                to="/register"
                className="text-red-400 hover:text-red-300 font-medium transition-colors"
              >
                Ücretsiz Kayıt Ol
              </Link>
            </p>
          </div>
        </div>

        {/* Alt bilgi */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Giriş yaparak{" "}
          <a href="#" className="text-slate-500 hover:text-slate-400">
            Kullanım Koşulları
          </a>{" "}
          ve{" "}
          <a href="#" className="text-slate-500 hover:text-slate-400">
            Gizlilik Politikası
          </a>
          'nı kabul etmiş olursunuz.
        </p>
      </div>
    </div>
  );
};

export default Login;