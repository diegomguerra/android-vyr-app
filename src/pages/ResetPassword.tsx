import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import BrainLogo from '@/components/BrainLogo';

/**
 * ResetPassword page — handles both web and native deep link flows.
 *
 * Web flow:
 *   User clicks link in email → browser opens /reset-password?token=...
 *   Supabase JS SDK automatically exchanges the token from the URL hash/query
 *   and fires onAuthStateChange with event PASSWORD_RECOVERY.
 *
 * Native (iOS) deep link flow:
 *   User clicks link in email → iOS opens com.vyrlabs.app.android://reset-password#...
 *   Capacitor fires App.appUrlOpen with the full URL.
 *   We extract the fragment, pass it to supabase.auth.exchangeCodeForSession(),
 *   then wait for the PASSWORD_RECOVERY event before enabling the form.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);   // true = recovery session active
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event — fired when Supabase exchanges the token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
        setError(null);
      }
    });

    // Handle native deep link: Capacitor fires appUrlOpen with the full URL
    // e.g. com.vyrlabs.app.android://reset-password#access_token=...&type=recovery
    const handleDeepLink = async (url: string) => {
      try {
        // Extract the hash fragment from the deep link URL
        const hashIndex = url.indexOf('#');
        if (hashIndex === -1) return;
        const fragment = url.substring(hashIndex + 1);
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (type === 'recovery' && accessToken && refreshToken) {
          // Set the session manually from the tokens in the deep link
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            setError('Link expirado ou inválido. Solicite um novo link de recuperação.');
          }
          // onAuthStateChange will fire PASSWORD_RECOVERY and set ready = true
        }
      } catch (e) {
        console.error('[ResetPassword] deep link handling failed:', e);
      }
    };

    // Register Capacitor deep link listener
    let capacitorListener: { remove: () => void } | null = null;
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', ({ url }) => {
        void handleDeepLink(url);
      }).then((listener) => {
        capacitorListener = listener;
      });

      // Also check if the app was opened via deep link (cold start)
      App.getLaunchUrl().then((result) => {
        if (result?.url) void handleDeepLink(result.url);
      });
    }).catch(() => {
      // Web — Supabase SDK handles the URL hash automatically
      // Just check if we already have a recovery session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setReady(true);
      });
    });

    // Timeout: if no recovery event after 10s, show error
    const timeout = setTimeout(() => {
      if (!ready) {
        setError('Link expirado ou inválido. Volte e solicite um novo link de recuperação.');
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      capacitorListener?.remove();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    }
  };

  // Success state
  if (done) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-5 bg-background">
        <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-8 text-center space-y-4">
          <CheckCircle2 size={48} className="mx-auto text-green-500" />
          <h2 className="text-xl font-semibold text-foreground">Senha atualizada!</h2>
          <p className="text-sm text-muted-foreground">Redirecionando para o login...</p>
        </div>
      </div>
    );
  }

  // Error state — invalid/expired link
  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-5 bg-background">
        <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-8 text-center space-y-4">
          <AlertCircle size={48} className="mx-auto text-destructive" />
          <h2 className="text-xl font-semibold text-foreground">Link inválido</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate('/forgot-password')}
            className="w-full rounded-xl bg-primary text-primary-foreground font-medium py-3 text-sm transition-all active:scale-[0.98]"
          >
            Solicitar novo link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 bg-background">
      <div className="flex items-center gap-3 mb-8">
        <BrainLogo size={48} />
        <h1 className="font-mono font-bold tracking-wide text-foreground text-lg">Nova senha</h1>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 sm:p-8">
        {!ready ? (
          <div className="text-center py-6 space-y-3">
            <KeyRound size={32} className="mx-auto text-muted-foreground animate-pulse" />
            <p className="text-sm text-muted-foreground">Validando link de recuperação...</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-foreground mb-1">Criar nova senha</h2>
            <p className="text-sm text-muted-foreground mb-6">Escolha uma senha segura com pelo menos 6 caracteres.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Nova senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-ring transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Confirmar senha</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-ring transition-colors"
                />
              </div>
              {confirm && password !== confirm && (
                <p className="text-xs text-destructive">As senhas não coincidem.</p>
              )}
              <button
                type="submit"
                disabled={loading || !password || !confirm || password !== confirm}
                className="w-full rounded-xl bg-primary text-primary-foreground font-medium py-3.5 text-sm transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
