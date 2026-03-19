import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Users, Activity, AlertTriangle, Database, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

/* ── Types ── */

interface UserRow {
  user_id: string;
  nome: string;
  email: string;
  status: string;
  last_sync_at: string | null;
  days_of_data: number;
  total_samples: number;
  today_score: number | null;
  today_level: string | null;
  hr_count: number;
  hrv_count: number;
  sleep_count: number;
  steps_count: number;
  rhr_count: number;
  spo2_count: number;
  rr_count: number;
}

interface BiomarkerDetail {
  type: string;
  ts: string;
  value: number | null;
  source: string;
  payload_json: any;
  end_ts: string | null;
}

interface DailyMetric {
  day: string;
  hr_avg: number | null;
  rhr: number | null;
  hrv: number | null;
  stress: number | null;
  sleep_h: number | null;
  steps: number | null;
  score: number | null;
}

/* ── Helpers ── */

function timeAgo(iso: string | null): string {
  if (!iso) return 'Nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Agora';
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

function isStale(iso: string | null): boolean {
  if (!iso) return true;
  return Date.now() - new Date(iso).getTime() > 24 * 60 * 60 * 1000;
}

const COLORS = ['#4B7BEC', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

/* ── Main Component ── */

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userBiomarkers, setUserBiomarkers] = useState<BiomarkerDetail[]>([]);
  const [userDailyMetrics, setUserDailyMetrics] = useState<DailyMetric[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [totalSamplesGlobal, setTotalSamplesGlobal] = useState(0);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      // 1. Get all participants
      const { data: participants } = await (supabase
        .from('participantes')
        .select('user_id, nome_publico') as any);

      // 2. Get all user auth emails
      const userMap = new Map<string, { nome: string; email: string }>();
      for (const p of (participants || [])) {
        userMap.set(p.user_id, { nome: p.nome_publico || 'Sem nome', email: '' });
      }

      // 3. Get integrations
      const { data: integrations } = await (supabase
        .from('user_integrations')
        .select('user_id, status, last_sync_at')
        .eq('provider', 'health_connect') as any);

      const integMap = new Map<string, { status: string; last_sync_at: string | null }>();
      for (const i of (integrations || [])) {
        integMap.set(i.user_id, { status: i.status, last_sync_at: i.last_sync_at });
      }

      // 4. Get ring_daily_data counts per user
      const { data: ringCounts } = await (supabase
        .from('ring_daily_data')
        .select('user_id, day') as any);

      const daysMap = new Map<string, number>();
      for (const r of (ringCounts || [])) {
        daysMap.set(r.user_id, (daysMap.get(r.user_id) || 0) + 1);
      }

      // 5. Get today's computed_states
      const today = new Date().toISOString().split('T')[0];
      const { data: todayStates } = await (supabase
        .from('computed_states')
        .select('user_id, score, level')
        .eq('day', today) as any);

      const stateMap = new Map<string, { score: number; level: string }>();
      for (const s of (todayStates || [])) {
        stateMap.set(s.user_id, { score: s.score, level: s.level });
      }

      // 6. Get biomarker_samples counts by user and type
      const { data: sampleCounts } = await supabase
        .rpc('get_biomarker_counts_by_user') as any;

      // If RPC doesn't exist, fallback to raw query
      let sampleMap = new Map<string, Record<string, number>>();
      let globalTotal = 0;

      if (sampleCounts) {
        for (const row of sampleCounts) {
          const existing = sampleMap.get(row.user_id) || {};
          existing[row.type] = row.cnt;
          sampleMap.set(row.user_id, existing);
          globalTotal += row.cnt;
        }
      } else {
        // Fallback: count from biomarker_samples directly
        const { data: rawCounts } = await (supabase
          .from('biomarker_samples')
          .select('user_id, type') as any);

        for (const r of (rawCounts || [])) {
          const existing = sampleMap.get(r.user_id) || {};
          existing[r.type] = (existing[r.type] || 0) + 1;
          sampleMap.set(r.user_id, existing);
          globalTotal++;
        }
      }

      setTotalSamplesGlobal(globalTotal);

      // 7. Build user rows
      const allUserIds = new Set([
        ...userMap.keys(),
        ...integMap.keys(),
        ...daysMap.keys(),
      ]);

      const rows: UserRow[] = [];
      for (const uid of allUserIds) {
        const info = userMap.get(uid) || { nome: 'Usuário', email: '' };
        const integ = integMap.get(uid);
        const state = stateMap.get(uid);
        const counts = sampleMap.get(uid) || {};
        const totalSamples = Object.values(counts).reduce((a, b) => a + b, 0);

        rows.push({
          user_id: uid,
          nome: info.nome,
          email: info.email,
          status: integ?.status || 'not_connected',
          last_sync_at: integ?.last_sync_at || null,
          days_of_data: daysMap.get(uid) || 0,
          total_samples: totalSamples,
          today_score: state?.score ?? null,
          today_level: state?.level ?? null,
          hr_count: counts['hr'] || 0,
          hrv_count: counts['hrv'] || 0,
          sleep_count: counts['sleep'] || 0,
          steps_count: counts['steps'] || 0,
          rhr_count: counts['rhr'] || 0,
          spo2_count: counts['spo2'] || 0,
          rr_count: counts['rr'] || 0,
        });
      }

      rows.sort((a, b) => {
        // Stale users first
        const aStale = isStale(a.last_sync_at) ? 0 : 1;
        const bStale = isStale(b.last_sync_at) ? 0 : 1;
        if (aStale !== bStale) return aStale - bStale;
        return (b.last_sync_at || '').localeCompare(a.last_sync_at || '');
      });

      setUsers(rows);
    } catch (e) {
      console.error('[admin] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Load user detail when expanded
  const loadUserDetail = async (userId: string) => {
    setLoadingDetail(true);
    try {
      // Recent biomarker samples (last 100)
      const { data: samples } = await (supabase
        .from('biomarker_samples')
        .select('type, ts, value, source, payload_json, end_ts')
        .eq('user_id', userId)
        .order('ts', { ascending: false })
        .limit(200) as any);

      setUserBiomarkers(samples || []);

      // Daily metrics (last 30 days)
      const { data: ringData } = await (supabase
        .from('ring_daily_data')
        .select('day, metrics')
        .eq('user_id', userId)
        .order('day', { ascending: true })
        .limit(30) as any);

      const { data: statesData } = await (supabase
        .from('computed_states')
        .select('day, score')
        .eq('user_id', userId)
        .order('day', { ascending: true })
        .limit(30) as any);

      const scoreMap = new Map<string, number>();
      for (const s of (statesData || [])) {
        scoreMap.set(s.day, s.score);
      }

      const dailyMetrics: DailyMetric[] = (ringData || []).map((r: any) => {
        const m = r.metrics || {};
        return {
          day: r.day,
          hr_avg: m.hr_avg,
          rhr: m.rhr,
          hrv: m.hrv_sdnn,
          stress: m.stress_level,
          sleep_h: m.sleep_duration_hours,
          steps: m.steps,
          score: scoreMap.get(r.day) ?? null,
        };
      });

      setUserDailyMetrics(dailyMetrics);
    } catch (e) {
      console.error('[admin] detail error:', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const toggleUser = (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      loadUserDetail(userId);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = users.length;
    const connected = users.filter(u => u.status === 'connected' || u.status === 'active').length;
    const stale = users.filter(u => isStale(u.last_sync_at)).length;
    const critical = users.filter(u => u.today_score !== null && u.today_score < 40).length;
    return { total, connected, stale, critical };
  }, [users]);

  // Biomarker distribution for pie chart
  const biomarkerDistribution = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const u of users) {
      totals['HR'] = (totals['HR'] || 0) + u.hr_count;
      totals['RHR'] = (totals['RHR'] || 0) + u.rhr_count;
      totals['HRV'] = (totals['HRV'] || 0) + u.hrv_count;
      totals['Sleep'] = (totals['Sleep'] || 0) + u.sleep_count;
      totals['Steps'] = (totals['Steps'] || 0) + u.steps_count;
      totals['SpO2'] = (totals['SpO2'] || 0) + u.spo2_count;
      totals['RR'] = (totals['RR'] || 0) + u.rr_count;
    }
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0);
  }, [users]);

  // Samples per user for bar chart
  const samplesPerUser = useMemo(() => {
    return users
      .filter(u => u.total_samples > 0)
      .map(u => ({ name: u.nome.split(' ')[0], samples: u.total_samples }))
      .sort((a, b) => b.samples - a.samples);
  }, [users]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#080808] flex items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-[#4B7BEC]" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#080808] pb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#1A1A1A' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-[#667788]">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg text-white" style={{ fontWeight: 500 }}>Admin Dashboard</h1>
            <p className="text-[10px] uppercase" style={{ fontWeight: 500, color: '#4B7BEC', letterSpacing: '0.14em' }}>
              VYR Labs · Painel Interno
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
          style={{ background: '#111', border: '1px solid #222', color: '#99AABB', fontWeight: 500 }}
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </header>

      <div className="px-5 mt-4 space-y-4">
        {/* ── Overview Cards ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ background: '#0D0D0D', border: '1px solid #1A1A1A' }}>
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} style={{ color: '#4B7BEC' }} />
              <span className="text-[10px] uppercase" style={{ fontWeight: 500, color: '#556677', letterSpacing: '0.12em' }}>Usuários</span>
            </div>
            <span className="text-2xl text-white" style={{ fontWeight: 300 }}>{stats.total}</span>
          </div>

          <div className="rounded-xl p-3" style={{ background: '#0D0D0D', border: '1px solid #1A1A1A' }}>
            <div className="flex items-center gap-2 mb-1">
              <Activity size={14} style={{ color: '#10B981' }} />
              <span className="text-[10px] uppercase" style={{ fontWeight: 500, color: '#556677', letterSpacing: '0.12em' }}>Conectados</span>
            </div>
            <span className="text-2xl text-white" style={{ fontWeight: 300 }}>{stats.connected}</span>
          </div>

          <div className="rounded-xl p-3" style={{ background: stats.stale > 0 ? '#1A1008' : '#0D0D0D', border: `1px solid ${stats.stale > 0 ? '#2D1A00' : '#1A1A1A'}` }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
              <span className="text-[10px] uppercase" style={{ fontWeight: 500, color: '#556677', letterSpacing: '0.12em' }}>Sem dados 24h+</span>
            </div>
            <span className="text-2xl" style={{ fontWeight: 300, color: stats.stale > 0 ? '#F59E0B' : 'white' }}>{stats.stale}</span>
          </div>

          <div className="rounded-xl p-3" style={{ background: stats.critical > 0 ? '#1A0808' : '#0D0D0D', border: `1px solid ${stats.critical > 0 ? '#2D0000' : '#1A1A1A'}` }}>
            <div className="flex items-center gap-2 mb-1">
              <Database size={14} style={{ color: '#EF4444' }} />
              <span className="text-[10px] uppercase" style={{ fontWeight: 500, color: '#556677', letterSpacing: '0.12em' }}>Estado Crítico</span>
            </div>
            <span className="text-2xl" style={{ fontWeight: 300, color: stats.critical > 0 ? '#EF4444' : 'white' }}>{stats.critical}</span>
          </div>
        </div>

        {/* ── Total Samples Card ── */}
        <div className="rounded-xl p-4" style={{ background: '#0D0D0D', border: '1px solid #1A1A1A' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase" style={{ fontWeight: 500, color: '#4B7BEC', letterSpacing: '0.14em' }}>
              Amostras Brutas Totais
            </span>
            <span className="text-xl text-white" style={{ fontWeight: 300 }}>{totalSamplesGlobal.toLocaleString()}</span>
          </div>

          {/* Biomarker distribution pie */}
          {biomarkerDistribution.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={biomarkerDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                  {biomarkerDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: 10, color: '#667788' }}
                  formatter={(value: string) => <span style={{ color: '#99AABB', fontSize: 10 }}>{value}</span>}
                />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#99AABB' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Samples per User Bar ── */}
        {samplesPerUser.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: '#0D0D0D', border: '1px solid #1A1A1A' }}>
            <span className="text-[10px] uppercase" style={{ fontWeight: 500, color: '#4B7BEC', letterSpacing: '0.14em' }}>
              Amostras por Usuário
            </span>
            <ResponsiveContainer width="100%" height={Math.max(120, samplesPerUser.length * 35)}>
              <BarChart data={samplesPerUser} layout="vertical" margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                <XAxis type="number" tick={{ fill: '#556677', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={60} tick={{ fill: '#99AABB', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, fontSize: 11 }}
                />
                <Bar dataKey="samples" fill="#4B7BEC" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Users List ── */}
        <div>
          <span className="text-[10px] uppercase block mb-2" style={{ fontWeight: 500, color: '#556677', letterSpacing: '0.14em' }}>
            Usuários ({users.length})
          </span>

          <div className="space-y-2">
            {users.map((user) => {
              const stale = isStale(user.last_sync_at);
              const critical = user.today_score !== null && user.today_score < 40;
              const isExpanded = expandedUser === user.user_id;

              return (
                <div key={user.user_id}>
                  {/* User row */}
                  <button
                    onClick={() => toggleUser(user.user_id)}
                    className="w-full rounded-xl p-3 text-left transition-colors"
                    style={{
                      background: critical ? '#0D0808' : '#0D0D0D',
                      border: `1px solid ${critical ? '#2D0000' : stale ? '#2D1A00' : '#1A1A1A'}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Status dot */}
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            background: stale ? '#F59E0B' : user.status === 'connected' || user.status === 'active' ? '#10B981' : '#555',
                            boxShadow: stale ? '0 0 6px #F59E0B44' : user.status === 'connected' ? '0 0 6px #10B98144' : 'none',
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white truncate" style={{ fontWeight: 500 }}>{user.nome}</span>
                            {critical && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#2D0000', color: '#EF4444', fontWeight: 500 }}>
                                CRÍTICO
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px]" style={{ color: stale ? '#F59E0B' : '#556677' }}>
                              Sync: {timeAgo(user.last_sync_at)}
                            </span>
                            <span className="text-[10px]" style={{ color: '#556677' }}>
                              {user.days_of_data}d dados
                            </span>
                            <span className="text-[10px]" style={{ color: '#556677' }}>
                              {user.total_samples.toLocaleString()} amostras
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {user.today_score !== null && (
                          <div className="text-right">
                            <span className="text-lg" style={{
                              fontWeight: 300,
                              color: user.today_score >= 70 ? '#10B981' : user.today_score >= 45 ? '#F59E0B' : '#EF4444',
                            }}>
                              {user.today_score}
                            </span>
                            <p className="text-[9px]" style={{ color: '#556677' }}>{user.today_level}</p>
                          </div>
                        )}
                        {isExpanded ? <ChevronUp size={14} style={{ color: '#556677' }} /> : <ChevronDown size={14} style={{ color: '#556677' }} />}
                      </div>
                    </div>

                    {/* Biomarker counts mini bar */}
                    {user.total_samples > 0 && (
                      <div className="flex gap-2 mt-2 ml-5">
                        {[
                          { label: 'HR', count: user.hr_count, color: '#4B7BEC' },
                          { label: 'RHR', count: user.rhr_count, color: '#8B5CF6' },
                          { label: 'HRV', count: user.hrv_count, color: '#10B981' },
                          { label: 'Sleep', count: user.sleep_count, color: '#EC4899' },
                          { label: 'Steps', count: user.steps_count, color: '#F59E0B' },
                          { label: 'SpO2', count: user.spo2_count, color: '#06B6D4' },
                          { label: 'RR', count: user.rr_count, color: '#EF4444' },
                        ].filter(b => b.count > 0).map(b => (
                          <span key={b.label} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${b.color}15`, color: b.color }}>
                            {b.label} {b.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-1 rounded-xl p-4 space-y-4" style={{ background: '#0A0A0A', border: '1px solid #151515' }}>
                      {loadingDetail ? (
                        <div className="flex items-center justify-center py-6">
                          <RefreshCw size={16} className="animate-spin text-[#4B7BEC]" />
                        </div>
                      ) : (
                        <>
                          {/* Daily trend chart */}
                          {userDailyMetrics.length > 0 && (
                            <div>
                              <span className="text-[10px] uppercase block mb-2" style={{ fontWeight: 500, color: '#4B7BEC', letterSpacing: '0.14em' }}>
                                Tendência Diária (Score VYR + Biomarcadores)
                              </span>
                              <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={userDailyMetrics} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                                  <XAxis dataKey="day" tick={{ fill: '#556677', fontSize: 9 }} tickFormatter={(d: string) => d.slice(5)} />
                                  <YAxis tick={{ fill: '#556677', fontSize: 9 }} />
                                  <Tooltip
                                    contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, fontSize: 11 }}
                                    labelStyle={{ color: '#99AABB' }}
                                  />
                                  <Line type="monotone" dataKey="score" stroke="#4B7BEC" strokeWidth={2} dot={false} name="Score" />
                                  <Line type="monotone" dataKey="rhr" stroke="#8B5CF6" strokeWidth={1.5} dot={false} name="RHR" />
                                  <Line type="monotone" dataKey="hrv" stroke="#10B981" strokeWidth={1.5} dot={false} name="HRV" />
                                  <Line type="monotone" dataKey="stress" stroke="#EF4444" strokeWidth={1.5} dot={false} name="Stress" />
                                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} formatter={(v: string) => <span style={{ color: '#99AABB' }}>{v}</span>} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {/* Sleep + Steps chart */}
                          {userDailyMetrics.length > 0 && (
                            <div>
                              <span className="text-[10px] uppercase block mb-2" style={{ fontWeight: 500, color: '#EC4899', letterSpacing: '0.14em' }}>
                                Sono + Passos
                              </span>
                              <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={userDailyMetrics} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                                  <XAxis dataKey="day" tick={{ fill: '#556677', fontSize: 9 }} tickFormatter={(d: string) => d.slice(5)} />
                                  <YAxis yAxisId="left" tick={{ fill: '#556677', fontSize: 9 }} />
                                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#556677', fontSize: 9 }} />
                                  <Tooltip
                                    contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, fontSize: 11 }}
                                    labelStyle={{ color: '#99AABB' }}
                                  />
                                  <Bar yAxisId="right" dataKey="steps" fill="#F59E0B" radius={[2, 2, 0, 0]} name="Passos" opacity={0.6} />
                                  <Bar yAxisId="left" dataKey="sleep_h" fill="#EC4899" radius={[2, 2, 0, 0]} name="Sono (h)" />
                                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} formatter={(v: string) => <span style={{ color: '#99AABB' }}>{v}</span>} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {/* Raw biomarker samples table */}
                          <div>
                            <span className="text-[10px] uppercase block mb-2" style={{ fontWeight: 500, color: '#F59E0B', letterSpacing: '0.14em' }}>
                              Amostras Brutas Recentes ({userBiomarkers.length})
                            </span>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left">
                                <thead>
                                  <tr style={{ borderBottom: '1px solid #1A1A1A' }}>
                                    <th className="py-1.5 pr-3 text-[10px] uppercase" style={{ fontWeight: 500, color: '#556677', letterSpacing: '0.1em' }}>Tipo</th>
                                    <th className="py-1.5 pr-3 text-[10px] uppercase" style={{ fontWeight: 500, color: '#556677', letterSpacing: '0.1em' }}>Timestamp</th>
                                    <th className="py-1.5 pr-3 text-[10px] uppercase" style={{ fontWeight: 500, color: '#556677', letterSpacing: '0.1em' }}>Valor</th>
                                    <th className="py-1.5 pr-3 text-[10px] uppercase" style={{ fontWeight: 500, color: '#556677', letterSpacing: '0.1em' }}>Source</th>
                                    <th className="py-1.5 text-[10px] uppercase" style={{ fontWeight: 500, color: '#556677', letterSpacing: '0.1em' }}>Meta</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {userBiomarkers.slice(0, 50).map((s, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                                      <td className="py-1 pr-3">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                                          background: s.type === 'hr' ? '#4B7BEC15' : s.type === 'sleep' ? '#EC489915' : s.type === 'hrv' ? '#10B98115' : '#F59E0B15',
                                          color: s.type === 'hr' ? '#4B7BEC' : s.type === 'sleep' ? '#EC4899' : s.type === 'hrv' ? '#10B981' : '#F59E0B',
                                          fontWeight: 500,
                                        }}>
                                          {s.type}
                                        </span>
                                      </td>
                                      <td className="py-1 pr-3 text-[10px]" style={{ color: '#99AABB' }}>
                                        {new Date(s.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                      </td>
                                      <td className="py-1 pr-3 text-xs text-white" style={{ fontWeight: 300 }}>
                                        {s.value !== null ? s.value : '—'}
                                      </td>
                                      <td className="py-1 pr-3 text-[10px] truncate max-w-[100px]" style={{ color: '#556677' }}>
                                        {(s.source || '').split('.').pop()}
                                      </td>
                                      <td className="py-1 text-[10px]" style={{ color: '#556677' }}>
                                        {s.payload_json ? JSON.stringify(s.payload_json) : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {userBiomarkers.length > 50 && (
                                <p className="text-[10px] text-center mt-2" style={{ color: '#556677' }}>
                                  Mostrando 50 de {userBiomarkers.length} amostras
                                </p>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
