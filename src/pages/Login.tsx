import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import brainIcon from '@/assets/brain-icon.png';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithOAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({ title: 'Erro', description: error, variant: 'destructive' });
    } else if (isSignUp) {
      toast({ title: 'Conta criada', description: 'Verifique seu email para confirmar.' });
    } else {
      navigate('/');
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    const { error } = await signInWithOAuth(provider);
    if (error) {
      toast({ title: 'Erro', description: error, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center px-5 pt-14 pb-10" style={{ background: '#0d1117' }}>
      {/* Header */}
      <div className="w-full max-w-sm flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
            <img
              src={brainIcon}
              alt="VYR"
              className="w-full h-full object-cover"
              style={{ filter: 'grayscale(80%) brightness(0.9) contrast(1.1)', opacity: 0.85 }}
            />
          </div>
          <div>
            <h1 className="font-mono font-bold tracking-wide text-lg" style={{ color: '#c9d1d9' }}>
              VYR  App
            </h1>
            <p className="font-mono text-sm" style={{ color: '#6b7b8d' }}>
              Performance cognitiva
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 mt-1">
          <span
            className="border rounded px-3 py-1 text-[10px] uppercase tracking-[0.3em] font-mono"
            style={{ borderColor: '#2a3441', color: '#6b7b8d' }}
          >
            secure
          </span>
          <span
            className="text-[10px] uppercase tracking-[0.3em] font-mono"
            style={{ color: '#6b7b8d' }}
          >
            v1.0
          </span>
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-7 sm:p-9"
        style={{ background: '#161b22', border: '1px solid #21262d' }}
      >
        <h2 className="text-2xl font-bold mb-1" style={{ color: '#c9d1d9' }}>
          {isSignUp ? 'Criar conta' : 'Entrar'}
        </h2>
        <p className="text-sm font-mono mb-7" style={{ color: '#6b7b8d' }}>
          {isSignUp ? 'Crie sua conta VYR' : 'Acesse sua conta'}
        </p>

        {/* OAuth buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleOAuth('google')}
            className="w-full flex items-center justify-center gap-3 rounded-xl px-4 py-4 text-sm font-medium transition-transform active:scale-[0.98]"
            style={{ background: '#0d1117', border: '1px solid #21262d', color: '#8b949e' }}
          >
            <span className="text-lg font-bold" style={{ color: '#8b949e' }}>G</span>
            Continuar com Google
          </button>
          <button
            onClick={() => handleOAuth('apple')}
            className="w-full flex items-center justify-center gap-3 rounded-xl px-4 py-4 text-sm font-medium transition-transform active:scale-[0.98]"
            style={{ background: '#0d1117', border: '1px solid #21262d', color: '#8b949e' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#8b949e"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Continuar com Apple
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-7">
          <div className="flex-1 h-px" style={{ background: '#21262d' }} />
          <span className="text-xs uppercase tracking-wider font-mono" style={{ color: '#6b7b8d' }}>ou</span>
          <div className="flex-1 h-px" style={{ background: '#21262d' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-semibold mb-2 block" style={{ color: '#c9d1d9' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full rounded-xl px-4 py-4 text-sm outline-none transition-colors"
              style={{
                background: '#0d1117',
                border: '1px solid #21262d',
                color: '#c9d1d9',
              }}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold" style={{ color: '#c9d1d9' }}>Senha</label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm hover:underline"
                  style={{ color: '#6b7b8d' }}
                >
                  Esqueci minha senha
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-xl px-4 py-4 text-sm outline-none transition-colors pr-10"
                style={{
                  background: '#0d1117',
                  border: '1px solid #21262d',
                  color: '#c9d1d9',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: '#6b7b8d' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl font-semibold py-4 text-base transition-all active:scale-[0.98] hover:opacity-90 mt-3 disabled:opacity-50"
            style={{
              background: '#e6edf3',
              color: '#0d1117',
            }}
          >
            {loading ? 'Aguarde...' : isSignUp ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: '#6b7b8d' }}>
          {isSignUp ? 'Já tem conta? ' : 'Não tem conta? '}
          <button onClick={() => setIsSignUp(!isSignUp)} className="hover:underline" style={{ color: '#8b949e' }}>
            {isSignUp ? 'Entrar' : 'Criar'}
          </button>
        </p>
      </div>

      <p className="font-mono text-xs mt-10 text-center" style={{ color: '#3a4450' }}>
        Clareza mental é construída com consistência.
      </p>
    </div>
  );
};

export default Login;
