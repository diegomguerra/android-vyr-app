import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  label?: string;
}

const BackButton = ({ label = 'Voltar' }: BackButtonProps) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
    >
      <ChevronLeft size={20} strokeWidth={1.8} />
      <span className="text-sm">{label}</span>
    </button>
  );
};

export default BackButton;
