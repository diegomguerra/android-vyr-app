import brainIcon from '@/assets/brain-icon.png';

interface BrainLogoProps {
  size?: number;
}

const BrainLogo = ({ size = 48 }: BrainLogoProps) => {
  return (
    <div
      className="rounded-lg overflow-hidden flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <img
        src={brainIcon}
        alt="VYR"
        className="w-full h-full object-cover"
        style={{ filter: 'grayscale(100%) brightness(0.9) contrast(1.8)', opacity: 0.85 }}
      />
    </div>
  );
};

export default BrainLogo;
