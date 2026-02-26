import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackButton from '@/components/BackButton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import type { PillarScore } from '@/lib/vyr-engine';

interface DayData {
  score: number;
  level: string;
  pillars: PillarScore;
  phase: string;
}

interface ActionEntry {
  action_type: string;
  created_at: string;
}

function generateNarrative(section: 'start' | 'middle' | 'end', data: DayData | null, actions: ActionEntry[]): string {
  if (!data) return 'Sem dados disponíveis para este período.';

  const { score, pillars } = data;

  if (section === 'start') {
    if (score >= 70) return `O dia iniciou com boa disponibilidade cognitiva. Energia em ${pillars.energia.toFixed(1)}/5 e clareza em ${pillars.clareza.toFixed(1)}/5 indicavam condições favoráveis para demandas intensas.`;
    if (score >= 50) return `O início do dia apresentou capacidade moderada. Os pilares indicavam necessidade de gestão cuidadosa de energia ao longo das horas.`;
    return `O dia começou com capacidade reduzida. O sistema recomendava priorizar tarefas simples e focar em recuperação.`;
  }

  if (section === 'middle') {
    const bootActions = actions.filter((a) => a.action_type === 'BOOT').length;
    const holdActions = actions.filter((a) => a.action_type === 'HOLD').length;
    const actionText = bootActions + holdActions > 0
      ? `Foram registradas ${bootActions + holdActions} ações de protocolo ao longo do dia.`
      : 'Nenhuma ação de protocolo foi registrada durante o dia.';
    
    if (pillars.estabilidade >= 3.5) return `A estabilidade se manteve em ${pillars.estabilidade.toFixed(1)}/5, permitindo sustentação adequada. ${actionText}`;
    return `A estabilidade oscilou para ${pillars.estabilidade.toFixed(1)}/5, exigindo ajustes na demanda cognitiva. ${actionText}`;
  }

  // end
  const clearActions = actions.filter((a) => a.action_type === 'CLEAR').length;
  if (clearActions > 0) return `O encerramento foi feito com protocolo CLEAR ativado, facilitando a transição para recuperação. Score final: ${score}/100.`;
  return `O dia encerrou com score ${score}/100. ${score >= 65 ? 'Boa capacidade mantida até o final.' : 'Recomenda-se atenção à qualidade do sono para recuperação.'}`;
}

function generateValue(data: DayData | null): string {
  if (!data) return 'Continue registrando para que o sistema possa gerar insights.';
  const { score } = data;
  if (score >= 80) return 'Este dia demonstrou alta capacidade cognitiva. O sistema identificou boa integração entre os pilares, sustentando rendimento ao longo das horas.';
  if (score >= 65) return 'Dia funcional com capacidade disponível. O sistema manteve equilíbrio entre os pilares com margem para demandas moderadas.';
  if (score >= 50) return 'O sistema operou com restrições neste dia. Ajustes na rotina podem melhorar os resultados futuros.';
  return 'Este dia exigiu gestão cuidadosa de energia. Priorizar recuperação e sono de qualidade pode restaurar a capacidade para os próximos dias.';
}

const DayReview = () => {
  const navigate = useNavigate();
  const { day } = useParams<{ day: string }>();
  const { session } = useAuth();
  const [data, setData] = useState<DayData | null>(null);
  const [actions, setActions] = useState<ActionEntry[]>([]);

  useEffect(() => {
    if (!session?.user?.id || !day) return;

    Promise.all([
      supabase.from('computed_states').select('score, level, pillars, phase')
        .eq('user_id', session.user.id).eq('day', day).maybeSingle(),
      supabase.from('action_logs').select('action_type, created_at')
        .eq('user_id', session.user.id).eq('day', day),
    ]).then(([stateRes, actionsRes]) => {
      if (stateRes.data) {
        const p = stateRes.data.pillars as any;
        setData({
          score: stateRes.data.score ?? 0,
          level: stateRes.data.level ?? 'Crítico',
          pillars: { energia: p?.energia ?? 0, clareza: p?.clareza ?? 0, estabilidade: p?.estabilidade ?? 0 },
          phase: stateRes.data.phase ?? 'BOOT',
        });
      }
      if (actionsRes.data) setActions(actionsRes.data);
    });
  }, [session?.user?.id, day]);

  const formattedDate = day
    ? new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="min-h-dvh bg-background pb-24 safe-area-top">
      <header className="flex items-center gap-3 px-5 py-4">
        <BackButton />
        <div>
          <h1 className="font-mono font-bold text-foreground text-sm">Encerramento do dia</h1>
          <p className="text-[10px] text-muted-foreground">{formattedDate}</p>
        </div>
      </header>

      <div className="px-5 mt-4 space-y-6">
        {/* Início do dia */}
        <div>
          <h3 className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2">
            Início do dia
          </h3>
          <p className="text-sm text-secondary-foreground leading-relaxed">
            {generateNarrative('start', data, actions)}
          </p>
        </div>

        {/* Ao longo do dia */}
        <div>
          <h3 className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2">
            Ao longo do dia
          </h3>
          <p className="text-sm text-secondary-foreground leading-relaxed">
            {generateNarrative('middle', data, actions)}
          </p>
        </div>

        {/* Encerramento */}
        <div>
          <h3 className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2">
            Encerramento
          </h3>
          <p className="text-sm text-secondary-foreground leading-relaxed">
            {generateNarrative('end', data, actions)}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Value */}
        <p className="text-sm text-foreground leading-relaxed">
          {generateValue(data)}
        </p>

        {/* Closing line */}
        <p className="text-xs text-muted-foreground italic text-center">
          A clareza se constrói dia após dia.
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default DayReview;
