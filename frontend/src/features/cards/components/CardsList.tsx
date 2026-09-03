import React, { useEffect, useState } from 'react';
import { cardsApi, ConventionCard } from '../services/cards.api';

interface CardsListProps {
  onViewCard?: (cardId: string) => void;
  onEditCard?: (cardId: string) => void;
}

export const CardsList: React.FC<CardsListProps> = ({ onViewCard, onEditCard }) => {
  const [cards, setCards] = useState<ConventionCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = async () => {
    try {
      setIsLoading(true);
      const response = await cardsApi.listMyCards();
      setCards(response.cards);
    } catch (err) {
      console.error('Failed to fetch cards', err);
      setError('Failed to load convention cards.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleCreateCard = async () => {
    setIsCreating(true);
    try {
      const title = window.prompt("Enter a title for your new card:", "My New Convention Card");
      if (title === null) {
        setIsCreating(false);
        return;
      }
      
      const newCard = await cardsApi.createCard(title);
      setCards(prev => [newCard, ...prev]);
      
      // Open the card editor immediately for a new card
      if (onEditCard) {
        onEditCard(newCard.id);
      } else if (onViewCard) {
        onViewCard(newCard.id);
      }
    } catch (err) {
      console.error('Failed to create card', err);
      alert('Failed to create new card.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!window.confirm("Are you sure you want to delete this convention card?")) {
      return;
    }
    
    try {
      await cardsApi.archiveCard(cardId);
      setCards(prev => prev.filter(c => c.id !== cardId));
    } catch (err) {
      console.error('Failed to delete card', err);
      alert('Failed to delete card.');
    }
  };

  const handleRestoreCard = async (cardId: string) => {
    try {
      await cardsApi.unarchiveCard(cardId);
      // Fetch cards again to get correct statuses and ordering, or just update local state
      fetchCards();
    } catch (err) {
      console.error('Failed to restore card', err);
      alert('Failed to restore card.');
    }
  };

  const handleSendToPartner = (cardId: string) => {
    // Placeholder action as requested
    alert(`This will open a sharing modal for card ${cardId}`);
  };

  const activeCards = cards.filter(c => c.status === 'active');
  const archivedCards = cards.filter(c => c.status === 'archived');
  const draftCards = cards.filter(c => c.status !== 'active' && c.status !== 'archived');

  const renderCard = (card: ConventionCard, type: 'active' | 'draft' | 'archived') => (
    <div 
      key={card.id} 
      onClick={() => onViewCard?.(card.id)}
      className={`bg-white/5 backdrop-blur-md rounded-2xl border ${type === 'archived' ? 'border-gray-500/30 opacity-75' : 'border-white/10'} p-6 flex flex-col hover:bg-white/10 transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/20`}
    >
      <div className="flex justify-between items-start mb-4 gap-2">
        <h3 className="text-lg font-semibold text-white flex-1">{card.title || 'Untitled Card'}</h3>
        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
          card.status === 'active' ? 'bg-green-500/20 text-green-300' :
          card.status === 'archived' ? 'bg-gray-500/20 text-gray-400' :
          'bg-blue-500/20 text-blue-300'
        }`}>
          {card.status.replace(/_/g, ' ')}
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-6 flex-1">
        Last updated: {new Date(card.updatedAt).toLocaleDateString()}
      </p>
      
      <div className="flex flex-col gap-2 mt-auto border-t border-white/5 pt-4" onClick={(e) => e.stopPropagation()}>
        {type === 'active' && (
          <>
            <button onClick={() => handleSendToPartner(card.id)} className="w-full py-2 text-sm font-medium text-white bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 rounded-lg transition-colors">
              Send to new partner
            </button>
            <button onClick={() => handleDeleteCard(card.id)} className="w-full py-2 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors">
              Archive
            </button>
          </>
        )}
        {type === 'draft' && (
          <>
            <button onClick={() => handleSendToPartner(card.id)} className="w-full py-2 text-sm font-medium text-white bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/30 rounded-lg transition-colors">
              Send to partner
            </button>
            <button onClick={() => handleDeleteCard(card.id)} className="w-full py-2 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors">
              Archive
            </button>
          </>
        )}
        {type === 'archived' && (
          <button onClick={() => handleRestoreCard(card.id)} className="w-full py-2 text-sm font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg transition-colors">
            Restore
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">My Convention Cards</h2>
          <p className="text-sm text-gray-400 mt-1">Manage your active partnerships and systems</p>
        </div>
        <button
          type="button"
          onClick={handleCreateCard}
          disabled={isCreating}
          className="group relative inline-flex items-center justify-center px-6 py-3 font-bold text-white transition-all duration-200 bg-gradient-to-r from-indigo-500 to-purple-600 border border-transparent rounded-xl hover:from-indigo-400 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="mr-2 text-xl leading-none">{isCreating ? '...' : '+'}</span>
          {isCreating ? 'Creating...' : 'Create New Card'}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading cards...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-400">{error}</div>
      ) : cards.length > 0 ? (
        <div className="space-y-10">
          {activeCards.length > 0 && (
            <section>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400"></span> Active Cards
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeCards.map(c => renderCard(c, 'active'))}
              </div>
            </section>
          )}

          {draftCards.length > 0 && (
            <section>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span> Drafts & Pending
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {draftCards.map(c => renderCard(c, 'draft'))}
              </div>
            </section>
          )}

          {archivedCards.length > 0 && (
            <section className="pt-8 border-t border-white/10">
              <h3 className="text-xl font-bold text-gray-400 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-500"></span> Archived Cards
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {archivedCards.map(c => renderCard(c, 'archived'))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="col-span-full py-12 flex flex-col items-center justify-center bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 border-dashed">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No convention cards yet</h3>
            <p className="text-gray-400 text-sm text-center max-w-sm mb-6">
              You don't have any convention cards. Create one to start playing with your partner using standard systems.
            </p>
            <button className="text-indigo-400 hover:text-indigo-300 font-medium text-sm transition-colors">
              Learn how to create a card &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
