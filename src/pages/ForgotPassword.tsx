import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BrainLogo from '@/components/BrainLogo';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
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
          <div className="text-center py-4">
            <h2 className="text-xl font-semibold text-foreground mb-2">Email enviado</h2>
            <p className="text-sm text-muted-foreground">Verifique sua caixa de entrada para redefinir sua senha.</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-foreground mb-1">Esqueci minha senha</h2>
            <p className="text-sm text-muted-foreground mb-6">Informe seu email para receber o link de recuperação</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-ring transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary text-primary-foreground font-medium py-3.5 text-sm transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
