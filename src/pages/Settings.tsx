import { useState, useEffect } from 'react';
import { User, Bell, Link, LogOut, ChevronRight, Shield, Watch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import BackButton from '@/components/BackButton';
import BrainLogo from '@/components/BrainLogo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useVYRStore } from '@/hooks/useVYRStore';
import { requireValidUserId, retryOnAuthErrorLabeled } from '@/lib/auth-session';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { wearableConnection } = useVYRStore();
  const [userName, setUserName] = useState('Usuário VYR');
  const [baselineDays, setBaselineDays] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [insightAlerts, setInsightAlerts] = useState(true);
  const [dailySummary, setDailySummary] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    Promise.all([
      supabase.from('participantes').select('nome_publico').eq('user_id', user.id).maybeSingle(),
      supabase.from('ring_daily_data').select('day', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('notification_preferences').select('*').eq('user_id', user.id).maybeSingle(),
    ]).then(([nameRes, baselineRes, notifRes]) => {
      if (nameRes.data?.nome_publico) setUserName(nameRes.data.nome_publico);
      if (baselineRes.count) setBaselineDays(Math.min(baselineRes.count, 7));
      if (notifRes.data) {
        setPushEnabled(notifRes.data.push_enabled);
        setInsightAlerts(notifRes.data.insight_alerts);
        setDailySummary(notifRes.data.daily_summary);
      }
    });

    const { data } = supabase.storage.from('avatars').getPublicUrl(`${user.id}/avatar.jpg`);
    setAvatarUrl(data.publicUrl);
  }, [user?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const updateNotifPref = async (field: string, value: boolean) => {
    try {
      const userId = await requireValidUserId();
      await retryOnAuthErrorLabeled(async () => {
        return supabase.from('notification_preferences').upsert(
          { user_id: userId, [field]: value },
          { onConflict: 'user_id' }
        ).select();
      }, { table: 'notification_preferences', operation: 'upsert' });
    } catch (err) {
      console.error('[settings] notif pref update failed:', err);
    }
  };

  const isWearableConnected = wearableConnection?.status === 'active' || wearableConnection?.status === 'connected';
  const lastSync = wearableConnection?.lastSyncAt
    ? new Date(wearableConnection.lastSyncAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

  const menuItems = [
    { icon: User, label: 'Meu Perfil', desc: 'Editar dados e foto', path: '/profile' },
    { icon: Bell, label: 'Notificações', desc: 'Gerenciar alertas', path: '/notifications' },
    { icon: Link, label: 'Integrações', desc: 'Wearables e dispositivos', path: '/integrations' },
  ];

  return (
    <div className="min-h-dvh bg-background pb-24 safe-area-top">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4">
        <BackButton />
        <h1 className="text-lg font-semibold text-foreground">Configurações</h1>
      </header>

      {/* User card */}
      <div className="mx-5 rounded-2xl bg-card border border-border p-4 flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <BrainLogo size={24} />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{userName}</p>
          <p className="text-xs text-muted-foreground">{user?.email || 'usuario@email.com'}</p>
        </div>
      </div>

      <div className="px-5 space-y-1">
        {menuItems.map(({ icon: Icon, label, desc, path }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors active:bg-accent"
          >
            <Icon size={20} className="text-muted-foreground" strokeWidth={1.8} />
            <div className="flex-1 text-left">
              <span className="text-sm text-foreground">{label}</span>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        ))}

        {/* Wearable status */}
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-3 mb-1">
            <Watch size={20} className="text-muted-foreground" strokeWidth={1.8} />
            <div className="flex-1">
              <span className="text-sm text-foreground">Wearable</span>
              <p className="text-[10px] text-muted-foreground">
                {isWearableConnected
                  ? `${wearableConnection?.provider === 'apple_health' ? 'Apple Health' : wearableConnection?.provider} · ${lastSync ? `Sync: ${lastSync}` : 'Nunca sincronizado'}`
                  : 'Nenhum conectado'}
              </p>
            </div>
            <span className={`w-2 h-2 rounded-full ${isWearableConnected ? 'bg-vyr-positive' : 'bg-muted-foreground'}`} style={isWearableConnected ? { background: 'hsl(var(--vyr-accent-stable))' } : {}} />
          </div>
        </div>

        {/* Baseline progress */}
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={20} className="text-muted-foreground" strokeWidth={1.8} />
            <div className="flex-1">
              <span className="text-sm text-foreground">Baseline pessoal</span>
              <p className="text-[10px] text-muted-foreground">{baselineDays}/7 dias registrados</p>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden ml-8">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(baselineDays / 7) * 100}%`,
                background: 'hsl(var(--vyr-accent-action))',
              }}
            />
          </div>
        </div>

        {/* Notifications section */}
        <div className="mt-2">
          <div className="flex items-center justify-between px-4 mb-2">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Notificações</p>
            <button onClick={() => navigate('/notifications')} className="text-[10px] text-primary flex items-center gap-0.5">
              Ver todas <ChevronRight size={12} />
            </button>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell size={18} className="text-muted-foreground" strokeWidth={1.8} />
                <span className="text-sm font-medium text-foreground">Push notifications</span>
              </div>
              <button
                onClick={() => { setPushEnabled(!pushEnabled); updateNotifPref('push_enabled', !pushEnabled); }}
                className={`w-11 h-6 rounded-full transition-colors relative ${pushEnabled ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-transform ${pushEnabled ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between pl-9">
              <span className="text-sm text-muted-foreground">Insights cognitivos</span>
              <button
                onClick={() => { setInsightAlerts(!insightAlerts); updateNotifPref('insight_alerts', !insightAlerts); }}
                className={`w-11 h-6 rounded-full transition-colors relative ${insightAlerts ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-transform ${insightAlerts ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between pl-9">
              <span className="text-sm text-muted-foreground">Lembretes de sachets</span>
              <button
                onClick={() => { setDailySummary(!dailySummary); updateNotifPref('daily_summary', !dailySummary); }}
                className={`w-11 h-6 rounded-full transition-colors relative ${dailySummary ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-transform ${dailySummary ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="h-px bg-border my-2" />
        <div className="px-4 py-3">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Seus dados biométricos são processados internamente e nunca compartilhados com terceiros. O algoritmo VYR opera exclusivamente no seu dispositivo e na sua conta segura.
          </p>
        </div>

        <div className="h-px bg-border my-2" />

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors active:bg-accent"
        >
          <LogOut size={20} className="text-destructive" strokeWidth={1.8} />
          <span className="text-sm text-destructive">Sair</span>
        </button>
      </div>

      {/* Version */}
      <p className="text-center text-[10px] font-mono text-muted-foreground mt-8 opacity-40">
        VYR Labs v1.0.0 · Build 001
      </p>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;
