interface ContextCardProps {
  items: { text: string; status: 'favorable' | 'attention' | 'limiting' }[];
}

const dotColors: Record<string, string> = {
  favorable: '--vyr-accent-action',
  attention: '--vyr-text-muted',
  limiting: '--vyr-energia',
};

const ContextCard = ({ items }: ContextCardProps) => {
  return (
    <div className="rounded-2xl bg-card p-4">
      <h3 className="text-xs uppercase tracking-[0.15em] text-vyr-text-muted font-medium mb-3">
        Contexto do dia
      </h3>
      <div className="space-y-2.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: `hsl(var(${dotColors[item.status]}))` }}
            />
            <span className="text-sm text-vyr-text-secondary">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContextCard;
