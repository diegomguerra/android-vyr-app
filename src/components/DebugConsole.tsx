import { useState, useEffect, useRef, useCallback } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error';
  message: string;
}

const MAX_LOGS = 500;

export default function DebugConsole() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((level: LogEntry['level'], args: unknown[]) => {
    const message = args
      .map((a) => {
        if (typeof a === 'string') return a;
        try { return JSON.stringify(a, null, 1); } catch { return String(a); }
      })
      .join(' ');
    const now = new Date();
    const timestamp = now.toLocaleTimeString('pt-BR', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
    setLogs((prev) => {
      const next = [...prev, { timestamp, level, message }];
      return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
    });
  }, []);

  useEffect(() => {
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;

    console.log = (...args: unknown[]) => { origLog.apply(console, args); addLog('log', args); };
    console.warn = (...args: unknown[]) => { origWarn.apply(console, args); addLog('warn', args); };
    console.error = (...args: unknown[]) => { origError.apply(console, args); addLog('error', args); };

    return () => { console.log = origLog; console.warn = origWarn; console.error = origError; };
  }, [addLog]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, open]);

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const levelColor: Record<string, string> = {
    log: 'text-green-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 left-3 z-[9999] w-10 h-10 rounded-full bg-black/70 text-white text-lg flex items-center justify-center shadow-lg border border-white/20"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        🐛
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-[9998] h-[50dvh] flex flex-col bg-black/90 backdrop-blur-sm border-t border-white/10">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 shrink-0">
            <span className="text-xs text-white/60 font-mono">Debug Console ({logs.length})</span>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="text-xs text-blue-400 font-mono">Copiar</button>
              <button onClick={() => setLogs([])} className="text-xs text-red-400 font-mono">Limpar</button>
              <button onClick={() => setOpen(false)} className="text-xs text-white/60 font-mono">✕</button>
            </div>
          </div>

          {/* Logs */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {logs.length === 0 && (
              <p className="text-xs text-white/30 font-mono text-center mt-4">Nenhum log capturado ainda...</p>
            )}
            {logs.map((entry, i) => (
              <div key={i} className="text-[11px] font-mono leading-tight break-all">
                <span className="text-white/40">{entry.timestamp}</span>{' '}
                <span className={levelColor[entry.level]}>[{entry.level.toUpperCase()}]</span>{' '}
                <span className="text-white/80">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
