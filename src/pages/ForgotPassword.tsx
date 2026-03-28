import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import BrainLogo from '@/components/BrainLogo';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

function getPasswordResetRedirectUrl(): string {
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
  if (isNative) return 'com.vyrlabs.app.android://reset-password';
  return `${window.location.origin}/reset-password`;
}

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setRateLimitSeconds(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getPasswordResetRedirectUrl(),
    });
    setLoading(false);
    if (error) {
      const msg = error.message || '';
      const secondsMatch = msg.match(/(\d+)\s*second/i);
      if (error.status === 429 || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('security purposes')) {
        const seconds = secondsMatch ? parseInt(secondsMatch[1]) : 60;
        setRateLimitSeconds(seconds);
        toast({ title: 'Aguarde um momento', description: `Por segurança, aguarde ${seconds}s antes de tentar novamente.`, variant: 'destructive' });
      } else {
        toast({ title: 'Erro', description: msg, variant: 'destructive' });
      }
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 bg-background">
      <div className="flex items-center gap-3 mb-8">
        <BrainLogo size={48} />
        <div>
          <h1 className="font-mono font-bold tracking-wide text-foreground text-lg">VYR App</h1>
          <p className="font-mono text-xs text-muted-foreground">Recuperação de senha</p>
        </div>
      </div>
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 sm:p-8">
        <button onClick={() => navigate('/login')} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Voltar
        </button>
        {sent ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 size={48} className="mx-auto text-green-500" />
            <h2 className="text-xl font-semibold text-foreground">Email enviado</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enviamos um link para <span className="text-foreground font-medium">{email}</span>.
              Abra o email no celular e toque no link — ele abrirá o app direto na tela de nova senha.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Não recebeu? Verifique o spam ou{' '}
              <button className="underline hover:text-foreground transition-colors" onClick={() => { setSent(false); setRateLimitSeconds(null); }}>
                tente novamente
              </button>.
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-foreground mb-1">Esqueci minha senha</h2>
            <p className="text-sm text-muted-foreground mb-6">Informe seu email para receber o link de recuperação</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com" required autoCapitalize="none" autoCorrect="off"
                    className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-ring transition-colors"
                  />
                </div>
              </div>
              {rateLimitSeconds && (
                <p className="text-xs text-amber-500 bg-amber-500/10 rounded-lg px-3 py-2">
                  Por segurança, aguarde {rateLimitSeconds}s antes de tentar novamente.
                </p>
              )}
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary text-primary-foreground font-medium py-3.5 text-sm transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50">
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
