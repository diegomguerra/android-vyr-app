import { Home, FlaskConical, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/labs', label: 'Labs', icon: FlaskConical },
  { path: '/settings', label: 'Config', icon: Settings },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-vyr-bg-primary border-t border-vyr-stroke-divider safe-area-bottom">
      <div className="flex items-center justify-around py-2">
        {tabs.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1.5 px-6 py-1 transition-colors duration-150"
            >
              <Icon
                className={active ? 'text-vyr-text-primary' : 'text-vyr-text-secondary'}
                size={24}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span className={`text-[11px] font-medium tracking-wide ${active ? 'text-vyr-text-primary' : 'text-vyr-text-secondary'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
