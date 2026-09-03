import React from 'react';

interface PageOneFormProps {
  data: Record<string, any>;
  title?: string;
  onChange: (path: string[], value: string) => void;
}

export const PageOneForm: React.FC<PageOneFormProps> = ({ data, title, onChange }) => {
  const page1 = data.page1 || {};

  const handleInputChange = (path: string[], value: string) => {
    onChange(path, value);
  };

  const inputClass = "w-full h-full bg-transparent border-none outline-none focus:bg-blue-100 transition-colors px-1 text-sm text-gray-900";
  const textareaClass = "w-full flex-1 bg-transparent border-none outline-none focus:bg-blue-100 transition-colors p-1 text-xs text-gray-900 resize-none";

  // Each textarea field occupies flex-1 space in a flex-col container
  const renderTextareaField = (title: string, path: string[], grow = 1) => {
    const value = path.reduce((acc: any, key) => acc && acc[key] ? acc[key] : '', page1) || '';
    return (
      <div className="flex flex-col border-b border-black" style={{ flex: grow }}>
        <div className="bg-gray-100 border-b border-black p-1 text-[9px] font-bold uppercase leading-tight shrink-0">{title}</div>
        <textarea
          className={textareaClass}
          value={value}
          onChange={(e) => handleInputChange(path, e.target.value)}
        />
      </div>
    );
  };

  return (
    <div className="w-full flex font-sans text-gray-900 border-2 border-black flex-1 min-h-0">
      {/* Column 1: Defensive and Competitive Bidding */}
      <div className="w-1/3 border-r-2 border-black flex flex-col bg-white min-h-0">
        <div className="text-center font-bold text-xs uppercase py-1 border-b-2 border-black bg-gray-100 shrink-0">Defensive and Competitive Bidding</div>

        {renderTextareaField("Overcalls (Style: Responses: 1 / 2 Level; Reopening)", ["defense", "overcalls"], 2)}
        {renderTextareaField("1NT Overcall (2nd/4th Live; Responses; Reopening)", ["defense", "oneNT"], 1)}
        {renderTextareaField("Jump Overcalls (Style; Responses; Unusual NT)", ["defense", "jumpOvercalls"], 1)}

        <div className="flex border-b border-black shrink-0" style={{ minHeight: '24px' }}>
          <div className="w-20 bg-gray-100 border-r border-black p-1 text-[9px] font-bold uppercase flex items-center">Reopen:</div>
          <div className="flex-1 relative" style={{ minHeight: '24px' }}>
            <input type="text" className={inputClass} value={page1.defense?.reopen || ''} onChange={(e) => handleInputChange(["defense", "reopen"], e.target.value)} />
          </div>
        </div>

        {renderTextareaField("Direct & Jump Cue Bids (Style; Response; Reopen)", ["defense", "cueBids"], 1)}
        {renderTextareaField("Vs. NT (vs. Strong/Weak; Reopening;PH)", ["defense", "vsNT"], 1)}
        {renderTextareaField("Vs. Preemts (Doubles; Cue-bids; Jumps; NT Bids)", ["defense", "vsPreempts"], 1)}
        {renderTextareaField("Vs. Artificial Strong Openings- i.e. 1♣ or 2♣", ["defense", "vsStrong"], 1)}
        {renderTextareaField("Over Opponents' Takeout Double", ["defense", "overTakeoutDouble"], 2)}
      </div>

      {/* Column 2: Leads and Signals / Doubles */}
      <div className="w-1/3 border-r-2 border-black flex flex-col bg-white min-h-0">
        <div className="text-center font-bold text-xs uppercase py-1 border-b-2 border-black bg-gray-100 shrink-0">Leads and Signals</div>

        {/* Opening Leads Style Grid */}
        <div className="flex flex-col border-b-2 border-black shrink-0">
          <div className="bg-gray-100 border-b border-black p-1 text-[9px] font-bold uppercase">Opening Leads Style</div>
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr>
                <th className="border-b border-r border-black w-1/3"></th>
                <th className="border-b border-r border-black font-bold p-1 w-1/3">Lead</th>
                <th className="border-b border-black font-bold p-1 w-1/3">In Partner's Suit</th>
              </tr>
            </thead>
            <tbody>
              {["Suit", "NT", "Subseq"].map((type) => (
                <tr key={type}>
                  <td className="border-b border-r border-black font-bold p-1 bg-gray-100 text-[9px]">{type}</td>
                  <td className="border-b border-r border-black p-0 relative h-6">
                    <input type="text" className={inputClass + " text-center"} value={page1.leadsStyle?.[type.toLowerCase()]?.lead || ''} onChange={(e) => handleInputChange(["leadsStyle", type.toLowerCase(), "lead"], e.target.value)} />
                  </td>
                  <td className="border-b border-black p-0 relative h-6">
                    <input type="text" className={inputClass + " text-center"} value={page1.leadsStyle?.[type.toLowerCase()]?.partner || ''} onChange={(e) => handleInputChange(["leadsStyle", type.toLowerCase(), "partner"], e.target.value)} />
                  </td>
                </tr>
              ))}
              <tr>
                <td className="border-r border-black font-bold p-1 bg-gray-100 text-[9px]">Other:</td>
                <td colSpan={2} className="border-none p-0 relative h-6">
                  <input type="text" className={inputClass} value={page1.leadsStyle?.other || ''} onChange={(e) => handleInputChange(["leadsStyle", "other"], e.target.value)} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Leads Table */}
        <div className="flex flex-col border-b-2 border-black shrink-0">
          <div className="bg-gray-100 border-b border-black p-1 text-[9px] font-bold uppercase">Leads</div>
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr>
                <th className="border-b border-r border-black font-bold p-1 w-1/3 text-[9px]">Lead</th>
                <th className="border-b border-r border-black font-bold p-1 w-1/3 text-[9px]">Vs. Suit</th>
                <th className="border-b border-black font-bold p-1 w-1/3 text-[9px]">Vs. NT</th>
              </tr>
            </thead>
            <tbody>
              {["Ace", "King", "Queen", "Jack", "10", "9", "Hi-X", "Lo-X"].map((card) => (
                <tr key={card}>
                  <td className="border-b border-r border-black font-bold p-1 bg-gray-100 text-[9px]">{card}</td>
                  <td className="border-b border-r border-black p-0 relative h-5">
                    <input type="text" className={inputClass + " text-center"} value={page1.leads?.[card.toLowerCase()]?.vsSuit || ''} onChange={(e) => handleInputChange(["leads", card.toLowerCase(), "vsSuit"], e.target.value)} />
                  </td>
                  <td className="border-b border-black p-0 relative h-5">
                    <input type="text" className={inputClass + " text-center"} value={page1.leads?.[card.toLowerCase()]?.vsNT || ''} onChange={(e) => handleInputChange(["leads", card.toLowerCase(), "vsNT"], e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signals in Order of Priority */}
        <div className="flex flex-col border-b-2 border-black shrink-0">
          <div className="bg-gray-100 border-b border-black p-1 text-[9px] font-bold uppercase">Signals in Order of Priority</div>
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr>
                <th className="border-b border-r border-black w-12"></th>
                <th className="border-b border-r border-black w-4"></th>
                <th className="border-b border-r border-black font-bold p-1 text-[9px]">Partner's Lead</th>
                <th className="border-b border-r border-black font-bold p-1 text-[9px]">Declarer's Lead</th>
                <th className="border-b border-black font-bold p-1 text-[9px]">Discarding</th>
              </tr>
            </thead>
            <tbody>
              {["Suit", "NT"].map((type) => (
                <React.Fragment key={type}>
                  {[1, 2, 3].map((num) => (
                    <tr key={`${type}-${num}`}>
                      {num === 1 && (
                        <td rowSpan={3} className="border-b border-r border-black font-bold p-1 bg-gray-100 [writing-mode:vertical-lr] rotate-180 text-center text-[9px]">{type}</td>
                      )}
                      <td className="border-b border-r border-black font-bold p-1 bg-gray-100 text-[9px]">{num}</td>
                      <td className="border-b border-r border-black p-0 relative h-5">
                        <input type="text" className={inputClass + " text-center"} value={page1.signals?.[type.toLowerCase()]?.[num]?.partner || ''} onChange={(e) => handleInputChange(["signals", type.toLowerCase(), num.toString(), "partner"], e.target.value)} />
                      </td>
                      <td className="border-b border-r border-black p-0 relative h-5">
                        <input type="text" className={inputClass + " text-center"} value={page1.signals?.[type.toLowerCase()]?.[num]?.declarer || ''} onChange={(e) => handleInputChange(["signals", type.toLowerCase(), num.toString(), "declarer"], e.target.value)} />
                      </td>
                      <td className="border-b border-black p-0 relative h-5">
                        <input type="text" className={inputClass + " text-center"} value={page1.signals?.[type.toLowerCase()]?.[num]?.discarding || ''} onChange={(e) => handleInputChange(["signals", type.toLowerCase(), num.toString(), "discarding"], e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              <tr>
                <td colSpan={2} className="border-r border-black font-bold p-1 bg-gray-100 text-left text-[9px]">Signals (incl. Trumps):</td>
                <td colSpan={3} className="border-none p-0 relative h-6">
                  <input type="text" className={inputClass} value={page1.signals?.other || ''} onChange={(e) => handleInputChange(["signals", "other"], e.target.value)} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Doubles section - fills remaining space */}
        <div className="text-center font-bold text-xs uppercase py-1 border-b-2 border-black bg-gray-100 shrink-0">Doubles</div>
        {renderTextareaField("Takeout Doubles (Style; Responses; Reopening)", ["doubles", "takeout"], 2)}
        {renderTextareaField("Special, Artificial & Competitive Dbls/Rdls", ["doubles", "special"], 3)}
      </div>

      {/* Column 3: CONVENTION CARD */}
      <div className="w-1/3 flex flex-col bg-white min-h-0">
        <div className="text-center font-bold text-xs uppercase py-1 border-b-2 border-black bg-gray-100 tracking-widest shrink-0 truncate px-2" title={title || "Convention Card"}>
          {title || "Convention Card"}
        </div>

        {/* Meta info */}
        <div className="flex flex-col border-b-2 border-black shrink-0">
          <div className="flex border-b border-black">
            <div className="w-1/3 p-1 font-bold text-[9px] uppercase bg-gray-50 border-r border-black flex items-center">Category:</div>
            <div className="w-2/3 relative h-6">
              <input type="text" className={inputClass} placeholder="Green / Blue / Red / HUM" value={page1.meta?.category || ''} onChange={(e) => handleInputChange(["meta", "category"], e.target.value)} />
            </div>
          </div>
          <div className="flex border-b border-black">
            <div className="w-1/3 p-1 font-bold text-[9px] uppercase bg-gray-50 border-r border-black flex items-center">NCBO:</div>
            <div className="w-2/3 relative h-6">
              <input type="text" className={inputClass} value={page1.meta?.ncbo || ''} onChange={(e) => handleInputChange(["meta", "ncbo"], e.target.value)} />
            </div>
          </div>
          <div className="flex">
            <div className="w-1/3 p-1 font-bold text-[9px] uppercase bg-gray-50 border-r border-black flex items-center">Players:</div>
            <div className="w-2/3 flex flex-col">
              <div className="relative h-6 border-b border-black">
                <input type="text" className={inputClass} value={page1.meta?.player1 || ''} onChange={(e) => handleInputChange(["meta", "player1"], e.target.value)} />
              </div>
              <div className="relative h-6">
                <input type="text" className={inputClass} value={page1.meta?.player2 || ''} onChange={(e) => handleInputChange(["meta", "player2"], e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex flex-col border-t border-black">
            <div className="p-1 font-bold text-[9px] uppercase bg-gray-50 border-b border-black">Event (Open/Women/Senior/Transnational)</div>
            <div className="relative h-6">
              <input type="text" className={inputClass} value={page1.meta?.event || ''} onChange={(e) => handleInputChange(["meta", "event"], e.target.value)} />
            </div>
          </div>
        </div>

        {/* System Summary - fills remaining space */}
        <div className="text-center font-bold text-xs uppercase py-1 border-b-2 border-black bg-gray-100 shrink-0">System Summary</div>
        {renderTextareaField("General Approach and Style", ["system", "generalApproach"], 3)}
        {renderTextareaField("Special Bids That May Require Defense", ["system", "specialBids"], 2)}
        {renderTextareaField("Special Forcing Pass Sequences", ["system", "forcingPasses"], 1)}
        {renderTextareaField("Important Notes", ["system", "importantNotes"], 2)}
        {renderTextareaField("Psychics", ["system", "psychics"], 1)}
      </div>
    </div>
  );
};
