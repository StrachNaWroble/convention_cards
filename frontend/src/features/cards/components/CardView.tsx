import React, { useEffect, useState } from 'react';
import { cardsApi, ConventionCard } from '../services/cards.api';
import { PageOneForm } from './editor/PageOneForm';

interface CardViewProps {
  cardId: string;
  onBack: () => void;
  onEdit?: () => void;
  onPrint?: () => void;
}

const OPENING_BIDS = [
  { bid: '1♣', label: <>1<span className="font-bold text-gray-900">♣</span></> },
  { bid: '1♦', label: <>1<span className="font-bold text-red-600">♦</span></> },
  { bid: '1♥', label: <>1<span className="font-bold text-red-600">♥</span></> },
  { bid: '1♠', label: <>1<span className="font-bold text-gray-900">♠</span></> },
  { bid: '1NT', label: <>1<span className="font-bold text-gray-900">NT</span></> },
  { bid: '2♣', label: <>2<span className="font-bold text-gray-900">♣</span></> },
  { bid: '2♦', label: <>2<span className="font-bold text-red-600">♦</span></> },
  { bid: '2♥', label: <>2<span className="font-bold text-red-600">♥</span></> },
  { bid: '2♠', label: <>2<span className="font-bold text-gray-900">♠</span></> },
  { bid: '2NT', label: <>2<span className="font-bold text-gray-900">NT</span></> },
  { bid: '3♣', label: <>3<span className="font-bold text-gray-900">♣</span></> },
  { bid: '3♦', label: <>3<span className="font-bold text-red-600">♦</span></> },
  { bid: '3♥', label: <>3<span className="font-bold text-red-600">♥</span></> },
  { bid: '3♠', label: <>3<span className="font-bold text-gray-900">♠</span></> },
  { bid: '3NT', label: <>3<span className="font-bold text-gray-900">NT</span></> },
  { bid: '4♣', label: <>4<span className="font-bold text-gray-900">♣</span></> },
  { bid: '4♦', label: <>4<span className="font-bold text-red-600">♦</span></> },
  { bid: '4♥', label: <>4<span className="font-bold text-red-600">♥</span></> },
  { bid: '4♠', label: <>4<span className="font-bold text-gray-900">♠</span></> },
  { bid: '4NT', label: <>4<span className="font-bold text-gray-900">NT</span></> },
  { bid: 'HighLevel', label: 'High Level Bidding' },
];

export const CardView: React.FC<CardViewProps> = ({ cardId, onBack, onEdit, onPrint }) => {
  const [card, setCard] = useState<ConventionCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCard = async () => {
      try {
        setIsLoading(true);
        const data = await cardsApi.getCard(cardId);
        if (!data.cardData) data.cardData = {};
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
        <button onClick={onBack} className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors">
          ← Back to My Cards
        </button>
      </div>
    );
  }

  const openingsData: Record<string, any> = (card.cardData?.openings as Record<string, any>) || {};

  // Noop for read-only PageOneForm
  const noop = () => {};

  return (
    <div className="space-y-4">
      {/* Toolbar — hidden on print */}
      <div className="no-print flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors flex items-center text-sm font-medium"
        >
          <span className="mr-2">←</span> Back to My Cards
        </button>
        <div className="flex gap-3 items-center">
          <span className={`px-3 py-1 text-sm rounded-full font-medium shadow-sm ${
            card.status === 'active' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
            card.status === 'draft'  ? 'bg-gray-500/20  text-gray-300  border border-gray-500/30'  :
            'bg-blue-500/20 text-blue-300 border border-blue-500/30'
          }`}>
            {card.status.replace(/_/g, ' ')}
          </span>
          {onPrint && (
            <button
              onClick={onPrint}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded shadow transition-colors"
            >
              Print / PDF
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded shadow transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Card title and meta — hidden on print */}
      <div className="no-print text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">{card.title || 'Untitled Card'}</h2>
        <p className="text-gray-400 text-sm">Last updated: {new Date(card.updatedAt).toLocaleDateString()}</p>
      </div>

      {/* Print container — same structure as CardEditor so same print CSS applies */}
      <div className="print-container flex flex-col items-center gap-6">

        {/* Page 1 — read-only preview */}
        <div className="w-full max-w-[297mm] min-h-[210mm] flex flex-col font-sans bg-white shadow-xl border border-gray-300 print-page">
          <PageOneForm data={card.cardData} title={card.title} onChange={noop} />
        </div>

        {/* Page 2 — Openings table, read-only */}
        <div className="w-full max-w-[297mm] min-h-[210mm] flex flex-col font-sans bg-white p-3 shadow-xl border border-gray-300 print-page text-gray-900">
          <table className="w-full border-collapse border-2 border-black text-xs h-full table-fixed">
            <colgroup>
              <col style={{ width: '30px' }} />
              <col style={{ width: '22px' }} />
              <col style={{ width: '22px' }} />
              <col style={{ width: '22px' }} />
              <col />
              <col />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2} className="border border-black p-1 bg-gray-100 text-[9px] font-bold uppercase text-center [writing-mode:vertical-rl] rotate-180">Opening</th>
                <th rowSpan={2} className="border border-black p-1 bg-gray-100 text-[8px] font-bold uppercase text-center [writing-mode:vertical-rl] rotate-180">Tick if<br/>Artif.</th>
                <th rowSpan={2} className="border border-black p-1 bg-gray-100 text-[8px] font-bold uppercase text-center [writing-mode:vertical-rl] rotate-180">Min.<br/>Cards</th>
                <th rowSpan={2} className="border border-black p-1 bg-gray-100 text-[8px] font-bold uppercase text-center [writing-mode:vertical-rl] rotate-180">Neg. Dbl<br/>Thru</th>
                <th colSpan={4} className="border border-black bg-gray-200 h-5"></th>
              </tr>
              <tr>
                <th className="border border-black p-1 bg-gray-100 text-[9px] font-bold uppercase text-center">Description</th>
                <th className="border border-black p-1 bg-gray-100 text-[9px] font-bold uppercase text-center">Responses</th>
                <th className="border border-black p-1 bg-gray-100 text-[9px] font-bold uppercase text-center">Subsequent Action</th>
                <th className="border border-black p-1 bg-gray-100 text-[9px] font-bold uppercase text-center">Competitive &amp; Passed<br/>Hand Bidding</th>
              </tr>
            </thead>
            <tbody>
              {OPENING_BIDS.map((row) => {
                const rowData = openingsData[row.bid] || {};

                if (row.bid === 'HighLevel') {
                  return (
                    <tr key={row.bid}>
                      <td colSpan={8} className="border border-black p-0 relative bg-white h-[100px]">
                        <div className="absolute inset-0 flex flex-col">
                          <div className="text-center font-bold text-[10px] uppercase pt-1 text-gray-500 tracking-widest border-b border-gray-200">High Level Bidding</div>
                          <div className="p-2 text-gray-900 text-sm whitespace-pre-wrap flex-1">{rowData.highLevel || ''}</div>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={row.bid} className="h-[34px]">
                    <td className="border border-black p-1 text-center whitespace-nowrap bg-gray-100">{row.label}</td>
                    <td className="border border-black p-1 text-center text-[11px]">{rowData.artificial || ''}</td>
                    <td className="border border-black p-1 text-center text-[11px]">{rowData.minCards || ''}</td>
                    <td className="border border-black p-1 text-center text-[11px]">{rowData.negDbl || ''}</td>
                    <td className="border border-black px-2 text-[11px]">{rowData.description || ''}</td>
                    <td className="border border-black px-2 text-[11px]">{rowData.responses || ''}</td>
                    <td className="border border-black px-2 text-[11px]">{rowData.subsequent || ''}</td>
                    <td className="border border-black px-2 text-[11px]">{rowData.competitive || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
