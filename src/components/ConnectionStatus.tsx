interface ConnectionStatusProps {
  status: 'connected' | 'syncing' | 'disconnected';
}

const ConnectionStatus = ({ status }: ConnectionStatusProps) => {
  const config = {
    connected: { label: 'Conectado', color: 'bg-[hsl(var(--vyr-positive))]' },
    syncing: { label: 'Sincronizando', color: 'bg-[hsl(var(--vyr-caution))]' },
    disconnected: { label: 'Sem wearable', color: 'bg-destructive animate-pulse' },
  };

  const c = config[status];

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`w-2 h-2 rounded-full ${c.color}`} />
      {c.label}
    </span>
  );
};

export default ConnectionStatus;
