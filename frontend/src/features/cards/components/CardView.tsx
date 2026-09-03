import React, { useEffect, useState } from 'react';
import { cardsApi, ConventionCard } from '../services/cards.api';

interface CardViewProps {
  cardId: string;
  onBack: () => void;
  onEdit?: () => void;
}

export const CardView: React.FC<CardViewProps> = ({ cardId, onBack, onEdit }) => {
  const [card, setCard] = useState<ConventionCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCard = async () => {
      try {
        setIsLoading(true);
        const data = await cardsApi.getCard(cardId);
        setCard(data);
      } catch (err) {
        console.error('Failed to fetch card', err);
        setError('Failed to load card details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCard();
  }, [cardId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400">Loading convention card...</p>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
        <h3 className="text-xl font-semibold text-red-400 mb-2">Error</h3>
        <p className="text-gray-400 mb-6">{error || 'Card not found'}</p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
        >
          &larr; Back to My Cards
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="text-gray-400 hover:text-white transition-colors flex items-center text-sm font-medium"
      >
        <span className="mr-2">&larr;</span> Back to My Cards
      </button>

      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-8 border-b border-white/10 bg-gradient-to-r from-white/[0.02] to-transparent">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-3xl font-bold text-white tracking-tight">{card.title || 'Untitled Card'}</h2>
            <div className="flex gap-3 items-center">
              <span className={`px-3 py-1 text-sm rounded-full font-medium shadow-sm ${
                card.status === 'active' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                card.status === 'draft' ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30' :
                'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}>
                {card.status.replace(/_/g, ' ')}
              </span>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded shadow transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <p>Created: <span className="text-gray-300">{new Date(card.createdAt).toLocaleDateString()}</span></p>
            <p>Last updated: <span className="text-gray-300">{new Date(card.updatedAt).toLocaleDateString()}</span></p>
            {card.revisionNumber > 1 && (
              <p>Revision: <span className="text-gray-300">#{card.revisionNumber}</span></p>
            )}
          </div>
        </div>

        {/* Content Preview (Basic JSON display since we don't have a complex editor yet) */}
        <div className="p-8 bg-slate-900/50">
          <h3 className="text-lg font-medium text-white mb-4">Card Data</h3>
          {Object.keys(card.cardData || {}).length > 0 ? (
            <div className="bg-black/40 rounded-xl p-4 overflow-x-auto border border-white/5">
              <pre className="text-sm text-gray-300 font-mono">
                {JSON.stringify(card.cardData, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="py-12 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
              <p className="text-gray-400">This convention card has no data yet.</p>
              {card.status === 'draft' && onEdit && (
                <button onClick={onEdit} className="mt-4 px-4 py-2 bg-indigo-500/20 text-indigo-300 rounded-lg hover:bg-indigo-500/30 transition-colors">
                  Edit Card Data
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
