import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BackButton from '@/components/BackButton';
import BottomNav from '@/components/BottomNav';
import PerceptionsTab from '@/components/labs/PerceptionsTab';
import ReviewsTab from '@/components/labs/ReviewsTab';
import SignalsTab from '@/components/labs/SignalsTab';
import HistoryTab from '@/components/labs/HistoryTab';

const tabs = ['Histórico', 'Percepções', 'Revisões', 'Sinais'] as const;
type Tab = (typeof tabs)[number];

const Labs = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'Percepções';
  const [activeTab, setActiveTab] = useState<Tab>(
    tabs.includes(initialTab as Tab) ? initialTab as Tab : 'Percepções'
  );

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="min-h-dvh bg-background pb-24 safe-area-top">
      <header className="flex items-center gap-3 px-5 py-4">
        <BackButton />
        <h1 className="text-lg font-semibold text-foreground">Labs</h1>
      </header>

      {/* Tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-5">
        {activeTab === 'Histórico' && <HistoryTab />}
        {activeTab === 'Percepções' && <PerceptionsTab />}
        {activeTab === 'Revisões' && <ReviewsTab />}
        {activeTab === 'Sinais' && <SignalsTab />}
      </div>

      <BottomNav />
    </div>
  );
};

export default Labs;
