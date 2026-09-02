import React, { useState } from 'react';

type Suit = '♣' | '♦' | '♥' | '♠' | 'NT';
type Level = 1 | 2 | 3 | 4 | 5;

interface Bid {
  level: Level;
  suit: Suit;
}

const bids: Bid[] = [
  { level: 1, suit: '♣' }, { level: 1, suit: '♦' }, { level: 1, suit: '♥' }, { level: 1, suit: '♠' }, { level: 1, suit: 'NT' },
  { level: 2, suit: '♣' }, { level: 2, suit: '♦' }, { level: 2, suit: '♥' }, { level: 2, suit: '♠' }, { level: 2, suit: 'NT' },
  { level: 3, suit: '♣' }, { level: 3, suit: '♦' }, { level: 3, suit: '♥' }, { level: 3, suit: '♠' }, { level: 3, suit: 'NT' },
  { level: 4, suit: '♣' }, { level: 4, suit: '♦' }, { level: 4, suit: '♥' }, { level: 4, suit: '♠' }, { level: 4, suit: 'NT' },
  { level: 5, suit: '♣' }, { level: 5, suit: '♦' }, { level: 5, suit: '♥' }, { level: 5, suit: '♠' }
];

const BiddingTable: React.FC = () => {
  // Stan do przechowywania referencji do ostatnio aktywnego inputa
  const [activeInput, setActiveInput] = useState<HTMLInputElement | null>(null);

  const insertSymbol = (symbol: string) => {
    if (activeInput) {
      const start = activeInput.selectionStart || 0;
      const end = activeInput.selectionEnd || 0;
      const text = activeInput.value;
      
      const newText = text.substring(0, start) + symbol + text.substring(end);
      
      // Tworzymy sztuczne zdarzenie zmiany dla Reacta
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      nativeInputValueSetter?.call(activeInput, newText);
      const ev = new Event('input', { bubbles: true });
      activeInput.dispatchEvent(ev);

      // Przywracamy kursor za wstawionym symbolem
      setTimeout(() => {
        activeInput.focus();
        activeInput.setSelectionRange(start + symbol.length, start + symbol.length);
      }, 0);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setActiveInput(e.target);
  };

  const renderSuit = (suit: Suit) => {
    if (suit === '♥' || suit === '♦') {
      return <span className="text-red-600 font-bold">{suit}</span>;
    }
    if (suit === '♣' || suit === '♠') {
      return <span className="text-gray-900 font-bold">{suit}</span>;
    }
    return <span className="font-bold">{suit}</span>;
  };

  return (
    <div className="w-full flex flex-col gap-4 font-sans bg-white p-4">
      {/* Pasek narzędzi / Toolbar */}
      <div className="sticky top-0 z-10 flex gap-2 p-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm w-fit items-center">
        <span className="text-sm font-semibold text-gray-700 mr-2">Wstaw symbol:</span>
        <button type="button" onClick={() => insertSymbol('♣')} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-900 font-bold shadow-sm transition-colors">♣</button>
        <button type="button" onClick={() => insertSymbol('♦')} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100 text-red-600 font-bold shadow-sm transition-colors">♦</button>
        <button type="button" onClick={() => insertSymbol('♥')} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100 text-red-600 font-bold shadow-sm transition-colors">♥</button>
        <button type="button" onClick={() => insertSymbol('♠')} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-900 font-bold shadow-sm transition-colors">♠</button>
        <span className="text-xs text-gray-400 ml-2">(Kliknij pole tekstowe, a następnie symbol)</span>
      </div>

      {/* Tabela */}
      <div className="w-full overflow-x-auto pb-4">
        <table className="w-full border-collapse border-2 border-black text-xs min-w-[900px] shadow-sm">
          <thead>
            {/* Pierwszy wiersz nagłówka */}
            <tr>
              <th rowSpan={2} className="border border-black p-1 w-10 bg-gray-100 text-[10px] font-bold uppercase text-center [writing-mode:vertical-rl] rotate-180">
                Opening
              </th>
              <th rowSpan={2} className="border border-black p-1 w-8 bg-gray-100 text-[10px] font-bold uppercase text-center [writing-mode:vertical-rl] rotate-180">
                Tick if<br/>Artificial
              </th>
              <th rowSpan={2} className="border border-black p-1 w-8 bg-gray-100 text-[10px] font-bold uppercase text-center [writing-mode:vertical-rl] rotate-180">
                Min. No. of<br/>Cards
              </th>
              <th rowSpan={2} className="border border-black p-1 w-8 bg-gray-100 text-[10px] font-bold uppercase text-center [writing-mode:vertical-rl] rotate-180">
                Neg. Dbl<br/>Thru
              </th>
              <th colSpan={4} className="border border-black bg-gray-200 h-6">
                {/* Szare tło nad opisami */}
              </th>
            </tr>
            {/* Drugi wiersz nagłówka */}
            <tr>
              <th className="border border-black p-1 bg-gray-100 text-[10px] font-bold uppercase text-center w-[22%]">
                Description
              </th>
              <th className="border border-black p-1 bg-gray-100 text-[10px] font-bold uppercase text-center w-[22%]">
                Responses
              </th>
              <th className="border border-black p-1 bg-gray-100 text-[10px] font-bold uppercase text-center w-[22%]">
                Subsequent Action
              </th>
              <th className="border border-black p-1 bg-gray-100 text-[10px] font-bold uppercase text-center w-[22%]">
                Competitive & Passed<br/>Hand Bidding
              </th>
            </tr>
          </thead>
          <tbody>
            {bids.map((bid) => {
              const isHighLevelBiddingStart = bid.level === 5 && bid.suit === '♣';
              
              return (
                <React.Fragment key={`${bid.level}${bid.suit}`}>
                  {isHighLevelBiddingStart && (
                    <tr className="bg-gray-200">
                      <td colSpan={4} className="border border-black"></td>
                      <td 
                        colSpan={4} 
                        className="border border-black p-1 text-[10px] font-bold uppercase text-center"
                      >
                        High Level Bidding
                      </td>
                    </tr>
                  )}
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="border border-black p-1 text-center whitespace-nowrap bg-gray-100">
                      {bid.level}{renderSuit(bid.suit)}
                    </td>
                    {/* Tick if artificial */}
                    <td className="border border-black p-0 relative">
                      <input 
                        type="text" 
                        onFocus={handleFocus}
                        onChange={() => {}} 
                        className="absolute inset-0 bg-transparent w-full h-full px-1 text-center border-none outline-none focus:bg-blue-100 transition-colors duration-150"
                      />
                      <div className="h-6 invisible"></div>
                    </td>
                    {/* Min. no of cards */}
                    <td className="border border-black p-0 relative">
                      <input 
                        type="text" 
                        onFocus={handleFocus}
                        onChange={() => {}} 
                        className="absolute inset-0 bg-transparent w-full h-full px-1 text-center border-none outline-none focus:bg-blue-100 transition-colors duration-150"
                      />
                    </td>
                    {/* Neg. DBL thru */}
                    <td className="border border-black p-0 relative">
                      <input 
                        type="text" 
                        onFocus={handleFocus}
                        onChange={() => {}} 
                        className="absolute inset-0 bg-transparent w-full h-full px-1 text-center border-none outline-none focus:bg-blue-100 transition-colors duration-150"
                      />
                    </td>
                    {/* Description */}
                    <td className="border border-black p-0 relative">
                      <input 
                        type="text" 
                        onFocus={handleFocus}
                        onChange={() => {}} 
                        className="absolute inset-0 bg-transparent w-full h-full px-2 border-none outline-none focus:bg-blue-100 transition-colors duration-150"
                      />
                    </td>
                    {/* Responses */}
                    <td className="border border-black p-0 relative">
                      <input 
                        type="text" 
                        onFocus={handleFocus}
                        onChange={() => {}} 
                        className="absolute inset-0 bg-transparent w-full h-full px-2 border-none outline-none focus:bg-blue-100 transition-colors duration-150"
                      />
                    </td>
                    {/* Subsequent Action */}
                    <td className="border border-black p-0 relative">
                      <input 
                        type="text" 
                        onFocus={handleFocus}
                        onChange={() => {}} 
                        className="absolute inset-0 bg-transparent w-full h-full px-2 border-none outline-none focus:bg-blue-100 transition-colors duration-150"
                      />
                    </td>
                    {/* Competitive */}
                    <td className="border border-black p-0 relative">
                      <input 
                        type="text" 
                        onFocus={handleFocus}
                        onChange={() => {}} 
                        className="absolute inset-0 bg-transparent w-full h-full px-2 border-none outline-none focus:bg-blue-100 transition-colors duration-150"
                      />
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BiddingTable;
