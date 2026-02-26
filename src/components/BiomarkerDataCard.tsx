import { useEffect, useState } from 'react';
import { Heart, Activity, Moon, Footprints, Wind, Droplets } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Metrics {
  rhr: number | null;
  hrv_sdnn: number | null;
  sleep_duration_hours: number | null;
  sleep_quality: number | null;
  steps: number | null;
  spo2: number | null;
  respiratory_rate: number | null;
}

const BiomarkerDataCard = () => {
  const { session } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    const today = new Date().toISOString().split('T')[0];

    supabase
      .from('ring_daily_data')
      .select('metrics')
      .eq('user_id', session.user.id)
      .eq('day', today)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.metrics) setMetrics(data.metrics as unknown as Metrics);
        setLoading(false);
      });
  }, [session?.user?.id]);

  if (loading) return null;

  if (!metrics) {
    return (
      <div className="rounded-2xl bg-card border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Dados Recebidos</h3>
        <p className="text-xs text-muted-foreground">
          Nenhum dado sincronizado ainda — clique em Sincronizar.
        </p>
      </div>
    );
  }

  const items = [
    { icon: Heart, label: 'FC Repouso', value: metrics.rhr, unit: 'bpm', color: 'text-red-400' },
    { icon: Activity, label: 'HRV', value: metrics.hrv_sdnn, unit: 'ms', color: 'text-emerald-400' },
    { icon: Moon, label: 'Sono', value: metrics.sleep_duration_hours, unit: 'h', color: 'text-indigo-400' },
    { icon: Footprints, label: 'Passos', value: metrics.steps, unit: '', color: 'text-amber-400' },
    { icon: Droplets, label: 'SpO₂', value: metrics.spo2, unit: '%', color: 'text-sky-400' },
    { icon: Wind, label: 'Freq. Resp.', value: metrics.respiratory_rate, unit: 'rpm', color: 'text-teal-400' },
  ];

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Dados Recebidos</h3>
      <div className="grid grid-cols-3 gap-3">
        {items.map(({ icon: Icon, label, value, unit, color }) => (
          <div key={label} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-muted/50">
            <Icon size={16} className={color} />
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-semibold text-foreground">
              {value != null ? `${value}${unit ? ` ${unit}` : ''}` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BiomarkerDataCard;
