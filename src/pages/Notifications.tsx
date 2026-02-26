import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { retryOnAuthErrorLabeled } from '@/lib/auth-session';

interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  read: boolean;
  created_at: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const Notifications = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from('notifications').select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setNotifications(data);
      });
  }, [session?.user?.id]);

  const markAllRead = async () => {
    if (!session?.user?.id) return;
    await retryOnAuthErrorLabeled(async () => {
      const result = await supabase.from('notifications')
        .update({ read: true })
        .eq('user_id', session.user.id)
        .eq('read', false)
        .select();
      return result;
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Group by date
  const grouped = notifications.reduce<Record<string, Notification[]>>((acc, n) => {
    const key = formatDate(n.created_at);
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="min-h-dvh bg-background pb-24 safe-area-top">
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-mono font-bold text-foreground text-sm">Notificações</h1>
        </div>
        {hasUnread && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs text-primary">
            <CheckCheck size={14} />
            Marcar todas como lidas
          </button>
        )}
      </header>

      <div className="px-5 mt-2">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bell size={40} className="text-muted-foreground mb-3" strokeWidth={1.2} />
            <p className="text-sm text-muted-foreground">Nenhuma notificação ainda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">{date}</p>
                <div className="space-y-2">
                  {items.map((n) => (
                    <div
                      key={n.id}
                      className={`rounded-xl bg-card p-4 transition-opacity ${n.read ? 'opacity-70' : 'border-l-2'}`}
                      style={!n.read ? { borderLeftColor: 'hsl(var(--vyr-accent-action))' } : {}}
                    >
                      <div className="flex items-start gap-3">
                        {!n.read && (
                          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'hsl(var(--vyr-accent-action))' }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-foreground">{n.title}</h3>
                            <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">{formatTime(n.created_at)}</span>
                          </div>
                          {n.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Notifications;
