import React, { useState, useEffect, useRef } from 'react';
import { cardsApi, ConventionCard } from '../services/cards.api';

import { PageOneForm } from './editor/PageOneForm';

interface CardEditorProps {
  cardId: string;
  onBack: () => void;
  autoPrint?: boolean;
}

const OPENING_BIDS = [
  { bid: '1♣', label: <>1<span className="text-gray-900 font-bold">♣</span></> },
  { bid: '1♦', label: <>1<span className="text-red-600 font-bold">♦</span></> },
  { bid: '1♥', label: <>1<span className="text-red-600 font-bold">♥</span></> },
  { bid: '1♠', label: <>1<span className="text-gray-900 font-bold">♠</span></> },
  { bid: '1NT', label: <>1<span className="text-gray-900 font-bold">NT</span></> },
  { bid: '2♣', label: <>2<span className="text-gray-900 font-bold">♣</span></> },
  { bid: '2♦', label: <>2<span className="text-red-600 font-bold">♦</span></> },
  { bid: '2♥', label: <>2<span className="text-red-600 font-bold">♥</span></> },
  { bid: '2♠', label: <>2<span className="text-gray-900 font-bold">♠</span></> },
  { bid: '2NT', label: <>2<span className="text-gray-900 font-bold">NT</span></> },
  { bid: '3♣', label: <>3<span className="text-gray-900 font-bold">♣</span></> },
  { bid: '3♦', label: <>3<span className="text-red-600 font-bold">♦</span></> },
  { bid: '3♥', label: <>3<span className="text-red-600 font-bold">♥</span></> },
  { bid: '3♠', label: <>3<span className="text-gray-900 font-bold">♠</span></> },
  { bid: '3NT', label: <>3<span className="text-gray-900 font-bold">NT</span></> },
  { bid: '4♣', label: <>4<span className="text-gray-900 font-bold">♣</span></> },
  { bid: '4♦', label: <>4<span className="text-red-600 font-bold">♦</span></> },
  { bid: '4♥', label: <>4<span className="text-red-600 font-bold">♥</span></> },
  { bid: '4♠', label: <>4<span className="text-gray-900 font-bold">♠</span></> },
  { bid: '4NT', label: <>4<span className="text-gray-900 font-bold">NT</span></> },
  { bid: 'HighLevel', label: 'High Level Bidding' }
];

export const CardEditor: React.FC<CardEditorProps> = ({ cardId, onBack, autoPrint }) => {
  const [card, setCard] = useState<ConventionCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPrinted = useRef(false);
  const activeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchCard = async () => {
      try {
        const data = await cardsApi.getCard(cardId);
        if (!data.cardData) data.cardData = {};
        if (!data.cardData.openings) data.cardData.openings = {};
        setCard(data);
      } catch (err) {
        console.error('Failed to load card', err);
        setError('Failed to load card details.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCard();
  }, [cardId]);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') {
        activeInputRef.current = e.target as HTMLInputElement;
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  // Auto-print once after card loads (when opened via Print button in CardView)
  useEffect(() => {
    if (!isLoading && card && autoPrint && !hasPrinted.current) {
      hasPrinted.current = true;
      setTimeout(() => window.print(), 400);
    }
  }, [isLoading, card, autoPrint]);;

  const insertSymbol = (symbol: string) => {
    const el = activeInputRef.current;
    if (el) {
      const start = el.selectionStart || 0;
      const end = el.selectionEnd || 0;
      const text = el.value;
      const newValue = text.substring(0, start) + symbol + text.substring(end);
      
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      nativeInputValueSetter?.call(el, newValue);
      const event = new Event('input', { bubbles: true });
      el.dispatchEvent(event);

      el.focus();
      setTimeout(() => {
        el.setSelectionRange(start + symbol.length, start + symbol.length);
      }, 0);
    }
  };

  const handleRowChange = (bid: string, field: string, value: string) => {
    if (!card) return;
    
    const openingsData: Record<string, any> = (card.cardData.openings as Record<string, any>) || {};
    const currentBidData = openingsData[bid] || {};
    const newData = {
      ...openingsData,
      [bid]: {
        ...currentBidData,
        [field]: value
      }
    };

    setCard({
      ...card,
      cardData: {
        ...card.cardData,
        openings: newData
      }
    });
  };

  const handlePageOneChange = (path: string[], value: string) => {
    if (!card) return;

    const newPage1 = { ...((card.cardData.page1 as Record<string, any>) || {}) };
    let current = newPage1;

    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current[path[i]] = { ...current[path[i]] };
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;

    setCard({
      ...card,
      cardData: {
        ...card.cardData,
        page1: newPage1
      }
    });
  };

  const handleSave = async () => {
    if (!card) return;
    setIsSaving(true);
    try {
      await cardsApi.updateCard(cardId, { cardData: card.cardData });
      onBack();
    } catch (err) {
      console.error('Failed to save card', err);
      setError('Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading editor...</div>;
  }

  if (error || !card) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>{error || 'Card not found'}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-200 rounded">Back</button>
      </div>
    );
  }

  const openingsData: Record<string, any> = (card.cardData.openings as Record<string, any>) || {};

  return (
    <div className="flex flex-col h-full bg-gray-50">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0 no-print">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back
          </button>
          <h2 className="text-xl font-bold text-gray-900">{card.title} - Editor</h2>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
          >
            Print / PDF
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto p-6 flex flex-col items-center gap-6 bg-gray-200">
        
        {/* Toolbar (Sticky across both pages) — hidden on print */}
        <div className="no-print sticky top-0 z-50 flex gap-2 p-2 bg-white border border-gray-300 rounded-md shadow-md w-fit items-center">
          <span className="text-sm font-semibold text-gray-700 mr-2">Wstaw symbol:</span>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertSymbol('♣')} className="w-8 h-8 flex items-center justify-center bg-gray-50 border border-gray-300 rounded hover:bg-gray-100 text-gray-900 font-bold shadow-sm transition-colors">♣</button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertSymbol('♦')} className="w-8 h-8 flex items-center justify-center bg-gray-50 border border-gray-300 rounded hover:bg-gray-100 text-red-600 font-bold shadow-sm transition-colors">♦</button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertSymbol('♥')} className="w-8 h-8 flex items-center justify-center bg-gray-50 border border-gray-300 rounded hover:bg-gray-100 text-red-600 font-bold shadow-sm transition-colors">♥</button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertSymbol('♠')} className="w-8 h-8 flex items-center justify-center bg-gray-50 border border-gray-300 rounded hover:bg-gray-100 text-gray-900 font-bold shadow-sm transition-colors">♠</button>
          <span className="text-xs text-gray-400 ml-2">(Kliknij pole tekstowe, a następnie symbol)</span>
        </div>

        {/* Print container — only this is visible during print */}
        <div className="print-container w-full flex flex-col items-center gap-6">

          {/* Page 1: General & Defense */}
          <div className="w-full max-w-[297mm] min-h-[210mm] flex flex-col font-sans bg-white shadow-xl border border-gray-300 print-page">
            {/* PageOneForm must fill the whole height - it uses flex-1 internally */}
            <PageOneForm data={card.cardData} onChange={handlePageOneChange} />
          </div>

          {/* Page 2: Openings — table fills the whole page */}
          <div className="w-full max-w-[297mm] min-h-[210mm] flex flex-col font-sans bg-white p-3 shadow-xl border border-gray-300 print-page text-gray-900">
            <table className="w-full border-collapse border-2 border-black text-xs h-full table-fixed">
              <colgroup>
                <col style={{width: '30px'}} />
                <col style={{width: '22px'}} />
                <col style={{width: '22px'}} />
                <col style={{width: '22px'}} />
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
                  <th className="border border-black p-1 bg-gray-100 text-[9px] font-bold uppercase text-center">Competitive & Passed<br/>Hand Bidding</th>
                </tr>
              </thead>
              <tbody>
                {OPENING_BIDS.map((row) => {
                  const rowData = openingsData[row.bid] || {};
                  
                  if (row.bid === 'HighLevel') {
                    return (
                      <tr key={row.bid} className="hover:bg-gray-50 transition-colors">
                        <td colSpan={8} className="border border-black p-0 relative bg-white h-[100px]">
                          <div className="absolute inset-0 flex flex-col">
                            <div className="text-center font-bold text-[10px] uppercase pt-1 text-gray-500 tracking-widest border-b border-gray-200">High Level Bidding</div>
                            <textarea 
                              className="w-full flex-1 bg-transparent border-none outline-none focus:bg-blue-100 transition-colors p-2 text-gray-900 resize-none text-sm"
                              placeholder="Miejsce na konwencje np. Blackwood, cue-bidy itd..."
                              value={rowData.highLevel || ''}
                              onChange={(e) => handleRowChange('HighLevel', 'highLevel', e.target.value)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={row.bid} className="hover:bg-gray-50 transition-colors h-[34px]">
                      <td className="border border-black p-1 text-center whitespace-nowrap bg-gray-100">
                        {row.label}
                      </td>
                      <td className="border border-black p-0 relative">
                        <input 
                          type="text" 
                          className="absolute inset-0 bg-transparent w-full h-full px-1 text-center border-none outline-none focus:bg-blue-100 transition-colors duration-150 text-gray-900 text-[11px]" 
                          value={rowData.artificial || ''}
                          onChange={(e) => handleRowChange(row.bid, 'artificial', e.target.value)}
                        />
                        <div className="h-[34px] invisible"></div>
                      </td>
                      <td className="border border-black p-0 relative">
                        <input 
                          type="text" 
                          className="absolute inset-0 bg-transparent w-full h-full px-1 text-center border-none outline-none focus:bg-blue-100 transition-colors duration-150 text-gray-900 text-[11px]" 
                          value={rowData.minCards || ''}
                          onChange={(e) => handleRowChange(row.bid, 'minCards', e.target.value)}
                        />
                      </td>
                      <td className="border border-black p-0 relative">
                        <input 
                          type="text" 
                          className="absolute inset-0 bg-transparent w-full h-full px-1 text-center border-none outline-none focus:bg-blue-100 transition-colors duration-150 text-gray-900 text-[11px]" 
                          value={rowData.negDbl || ''}
                          onChange={(e) => handleRowChange(row.bid, 'negDbl', e.target.value)}
                        />
                      </td>
                      <td className="border border-black p-0 relative">
                        <input 
                          type="text" 
                          className="absolute inset-0 bg-transparent w-full h-full px-2 border-none outline-none focus:bg-blue-100 transition-colors duration-150 text-gray-900 text-[11px]" 
                          value={rowData.description || ''}
                          onChange={(e) => handleRowChange(row.bid, 'description', e.target.value)}
                        />
                      </td>
                      <td className="border border-black p-0 relative">
                        <input 
                          type="text" 
                          className="absolute inset-0 bg-transparent w-full h-full px-2 border-none outline-none focus:bg-blue-100 transition-colors duration-150 text-gray-900 text-[11px]" 
                          value={rowData.responses || ''}
                          onChange={(e) => handleRowChange(row.bid, 'responses', e.target.value)}
                        />
                      </td>
                      <td className="border border-black p-0 relative">
                        <input 
                          type="text" 
                          className="absolute inset-0 bg-transparent w-full h-full px-2 border-none outline-none focus:bg-blue-100 transition-colors duration-150 text-gray-900 text-[11px]" 
                          value={rowData.subsequent || ''}
                          onChange={(e) => handleRowChange(row.bid, 'subsequent', e.target.value)}
                        />
                      </td>
                      <td className="border border-black p-0 relative">
                        <input 
                          type="text" 
                          className="absolute inset-0 bg-transparent w-full h-full px-2 border-none outline-none focus:bg-blue-100 transition-colors duration-150 text-gray-900 text-[11px]" 
                          value={rowData.competitive || ''}
                          onChange={(e) => handleRowChange(row.bid, 'competitive', e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>{/* /Page 2 */}

        </div>{/* /print-container */}
      </div>{/* /Editor Content */}
    </div>
  );
};

