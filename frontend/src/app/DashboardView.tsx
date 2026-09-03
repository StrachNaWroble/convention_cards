import React, { useState } from 'react';
import { CardsList } from '../features/cards/components/CardsList';
import { CardView } from '../features/cards/components/CardView';
import { CardEditor } from '../features/cards/components/CardEditor';
import { authApi } from '../features/auth/services/auth.api';

interface DashboardViewProps {
  onLogout: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'card_details' | 'card_editor' | 'partnerships' | 'settings'>('cards');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [printOnLoad, setPrintOnLoad] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      setIsLoggingOut(false);
      onLogout();
    }
  };

  const handleViewCard = (cardId: string) => {
    setSelectedCardId(cardId);
    setActiveTab('card_details');
  };

  const handleEditCard = (cardId: string) => {
    setSelectedCardId(cardId);
    setPrintOnLoad(false);
    setActiveTab('card_editor');
  };

  const handlePrintCard = (cardId: string) => {
    setSelectedCardId(cardId);
    setPrintOnLoad(true);
    setActiveTab('card_editor');
  };

  const handleBackToCards = () => {
    setSelectedCardId(null);
    setActiveTab('cards');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex text-gray-100 font-sans selection:bg-indigo-500/30">
      {/* Background gradients — hidden on print */}
      <div className="no-print fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-indigo-900/40 blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/30 blur-[120px] mix-blend-screen"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
      </div>

      {/* Sidebar Layout — hidden on print */}
      <div className="no-print w-64 flex-shrink-0 border-r border-white/10 bg-white/[0.02] backdrop-blur-xl relative z-10 flex flex-col">
        {/* Brand */}
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg mr-3">
            <span className="text-white font-bold text-lg leading-none">♠️</span>
          </div>
          <span className="font-bold text-lg tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
            WBF Cards
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button
            onClick={() => setActiveTab('cards')}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 'cards' || activeTab === 'card_details'
                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-inner'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            My Cards
          </button>
          
          <button
            onClick={() => setActiveTab('partnerships')}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 'partnerships'
                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-inner'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Partnerships
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 'settings'
                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-inner'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </nav>

        {/* User Profile / Logout */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center px-4 py-2.5 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 rounded-xl transition-all duration-200 group"
          >
            <svg className="w-5 h-5 mr-2 opacity-70 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {isLoggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <header className="no-print h-20 px-8 flex items-center justify-between border-b border-white/5 bg-white/[0.01] backdrop-blur-sm">
          <h1 className="text-xl font-medium text-gray-200">
            {activeTab === 'cards' && 'My Convention Cards'}
            {activeTab === 'card_details' && 'Card Details'}
            {activeTab === 'partnerships' && 'Partnerships'}
            {activeTab === 'settings' && 'Account Settings'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border border-white/20 shadow-md"></div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'cards' && <CardsList onViewCard={handleViewCard} onEditCard={handleEditCard} />}
            {activeTab === 'card_details' && selectedCardId && (
              <CardView
                cardId={selectedCardId}
                onBack={handleBackToCards}
                onEdit={() => handleEditCard(selectedCardId)}
                onPrint={() => handlePrintCard(selectedCardId)}
              />
            )}
            {activeTab === 'card_editor' && selectedCardId && (
              <CardEditor
                cardId={selectedCardId}
                onBack={() => handleViewCard(selectedCardId)}
                autoPrint={printOnLoad}
              />
            )}
            {activeTab === 'partnerships' && (
              <div className="text-center py-20 text-gray-400">
                Partnerships view coming soon...
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="text-center py-20 text-gray-400">
                Settings view coming soon...
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
