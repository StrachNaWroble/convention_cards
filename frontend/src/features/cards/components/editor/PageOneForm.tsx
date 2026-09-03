import React from 'react';

interface PageOneFormProps {
  data: Record<string, any>;
  onChange: (path: string[], value: string) => void;
}

export const PageOneForm: React.FC<PageOneFormProps> = ({ data, onChange }) => {
  const page1 = data.page1 || {};

  const handleInputChange = (path: string[], value: string) => {
    onChange(path, value);
  };

  const inputClass = "w-full h-full bg-transparent border-none outline-none focus:bg-blue-100 transition-colors px-1 text-sm text-gray-900";
  const textareaClass = "w-full h-full bg-transparent border-none outline-none focus:bg-blue-100 transition-colors p-1 text-sm text-gray-900 resize-none";

  const renderTextareaField = (title: string, path: string[], minHeight = "80px") => {
    const value = path.reduce((acc, key) => acc && acc[key] ? acc[key] : '', page1) || '';
    return (
      <div className="flex flex-col border-b border-black" style={{ minHeight }}>
        <div className="bg-gray-100 border-b border-black p-1 text-[10px] font-bold uppercase">{title}</div>
        <textarea
          className={textareaClass}
          value={value}
          onChange={(e) => handleInputChange(path, e.target.value)}
        />
      </div>
    );
  };

  return (
    <div className="w-full flex font-sans text-gray-900 border-2 border-black flex-1">
      {/* Column 1: Defensive and Competitive Bidding */}
      <div className="w-1/3 border-r-2 border-black flex flex-col bg-white">
        <div className="text-center font-bold text-sm uppercase py-1 border-b-2 border-black bg-gray-100">Defensive and Competitive Bidding</div>
        
        {renderTextareaField("Overcalls (Style: Responses: 1 / 2 Level; Reopening)", ["defense", "overcalls"])}
        {renderTextareaField("1NT Overcall (2nd/4th Live; Responses; Reopening)", ["defense", "oneNT"])}
        {renderTextareaField("Jump Overcalls (Style; Responses; Unusual NT)", ["defense", "jumpOvercalls"])}
        
        <div className="flex border-b border-black min-h-[30px]">
          <div className="w-20 bg-gray-100 border-r border-black p-1 text-[10px] font-bold uppercase flex items-center">Reopen:</div>
          <div className="flex-1 relative">
            <input type="text" className={inputClass} value={page1.defense?.reopen || ''} onChange={(e) => handleInputChange(["defense", "reopen"], e.target.value)} />
          </div>
        </div>

        {renderTextareaField("Direct & Jump Cue Bids (Style; Response; Reopen)", ["defense", "cueBids"])}
        {renderTextareaField("Vs. NT (vs. Strong/Weak; Reopening;PH)", ["defense", "vsNT"])}
        {renderTextareaField("Vs. Preemts (Doubles; Cue-bids; Jumps; NT Bids)", ["defense", "vsPreempts"])}
        {renderTextareaField("Vs. Artificial Strong Openings- i.e. 1♣ or 2♣", ["defense", "vsStrong"])}
        <div className="flex-1">
          {renderTextareaField("Over Opponents' Takeout Double", ["defense", "overTakeoutDouble"], "100%")}
        </div>
      </div>

      {/* Column 2: Leads and Signals / Doubles */}
      <div className="w-1/3 border-r-2 border-black flex flex-col bg-white">
        <div className="text-center font-bold text-sm uppercase py-1 border-b-2 border-black bg-gray-100">Leads and Signals</div>
        
        {/* Opening Leads Style Grid */}
        <div className="flex flex-col border-b-2 border-black">
          <div className="bg-gray-100 border-b border-black p-1 text-[10px] font-bold uppercase">Opening Leads Style</div>
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
                  <td className="border-b border-r border-black font-bold p-1 bg-gray-100">{type}</td>
                  <td className="border-b border-r border-black p-0 relative h-6">
                    <input type="text" className={inputClass + " text-center"} value={page1.leadsStyle?.[type.toLowerCase()]?.lead || ''} onChange={(e) => handleInputChange(["leadsStyle", type.toLowerCase(), "lead"], e.target.value)} />
                  </td>
                  <td className="border-b border-black p-0 relative h-6">
                    <input type="text" className={inputClass + " text-center"} value={page1.leadsStyle?.[type.toLowerCase()]?.partner || ''} onChange={(e) => handleInputChange(["leadsStyle", type.toLowerCase(), "partner"], e.target.value)} />
                  </td>
                </tr>
              ))}
              <tr>
                <td className="border-r border-black font-bold p-1 bg-gray-100">Other:</td>
                <td colSpan={2} className="border-none p-0 relative h-6">
                  <input type="text" className={inputClass} value={page1.leadsStyle?.other || ''} onChange={(e) => handleInputChange(["leadsStyle", "other"], e.target.value)} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Leads Table */}
        <div className="flex flex-col border-b-2 border-black">
          <div className="bg-gray-100 border-b border-black p-1 text-[10px] font-bold uppercase">Leads</div>
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr>
                <th className="border-b border-r border-black font-bold p-1 w-1/3">Lead</th>
                <th className="border-b border-r border-black font-bold p-1 w-1/3">Vs. Suit</th>
                <th className="border-b border-black font-bold p-1 w-1/3">Vs. NT</th>
              </tr>
            </thead>
            <tbody>
              {["Ace", "King", "Queen", "Jack", "10", "9", "Hi-X", "Lo-X"].map((card) => (
                <tr key={card}>
                  <td className="border-b border-r border-black font-bold p-1 bg-gray-100">{card}</td>
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
        <div className="flex flex-col border-b-2 border-black">
          <div className="bg-gray-100 border-b border-black p-1 text-[10px] font-bold uppercase">Signals in Order of Priority</div>
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr>
                <th className="border-b border-r border-black w-12"></th>
                <th className="border-b border-r border-black w-4"></th>
                <th className="border-b border-r border-black font-bold p-1">Partner's Lead</th>
                <th className="border-b border-r border-black font-bold p-1">Declarer's Lead</th>
                <th className="border-b border-black font-bold p-1">Discarding</th>
              </tr>
            </thead>
            <tbody>
              {["Suit", "NT"].map((type) => (
                <React.Fragment key={type}>
                  {[1, 2, 3].map((num) => (
                    <tr key={`${type}-${num}`}>
                      {num === 1 && (
                        <td rowSpan={3} className="border-b border-r border-black font-bold p-1 bg-gray-100 [writing-mode:vertical-lr] rotate-180 text-center">{type}</td>
                      )}
                      <td className="border-b border-r border-black font-bold p-1 bg-gray-100 text-[10px]">{num}</td>
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
                <td colSpan={2} className="border-r border-black font-bold p-1 bg-gray-100 text-left text-[10px]">Signals (including Trumps):</td>
                <td colSpan={3} className="border-none p-0 relative h-6">
                  <input type="text" className={inputClass} value={page1.signals?.other || ''} onChange={(e) => handleInputChange(["signals", "other"], e.target.value)} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="text-center font-bold text-sm uppercase py-1 border-b-2 border-black bg-gray-100">Doubles</div>
        {renderTextareaField("Takeout Doubles (Style; Responses; Reopening)", ["doubles", "takeout"])}
        <div className="flex-1">
          {renderTextareaField("Special, Artificial & Competitive Dbls/Rdls", ["doubles", "special"], "100%")}
        </div>
      </div>

      {/* Column 3: W B F CONVENTION CARD */}
      <div className="w-1/3 flex flex-col bg-white">
        <div className="text-center font-bold text-sm uppercase py-1 border-b-2 border-black bg-gray-100 tracking-widest">W B F Convention Card</div>
        
        <div className="flex flex-col border-b-2 border-black pb-1">
          <div className="flex">
            <div className="w-1/3 p-1 font-bold text-[10px] uppercase">Category:</div>
            <div className="w-2/3 relative h-6">
              <input type="text" className={inputClass} placeholder="i.e. Green / Blue / Red / HUM" value={page1.meta?.category || ''} onChange={(e) => handleInputChange(["meta", "category"], e.target.value)} />
            </div>
          </div>
          <div className="flex">
            <div className="w-1/3 p-1 font-bold text-[10px] uppercase">NCBO:</div>
            <div className="w-2/3 relative h-6">
              <input type="text" className={inputClass} value={page1.meta?.ncbo || ''} onChange={(e) => handleInputChange(["meta", "ncbo"], e.target.value)} />
            </div>
          </div>
          <div className="flex">
            <div className="w-1/3 p-1 font-bold text-[10px] uppercase">Players:</div>
            <div className="w-2/3 flex flex-col">
              <div className="relative h-6 border-b border-black">
                <input type="text" className={inputClass} value={page1.meta?.player1 || ''} onChange={(e) => handleInputChange(["meta", "player1"], e.target.value)} />
              </div>
              <div className="relative h-6">
                <input type="text" className={inputClass} value={page1.meta?.player2 || ''} onChange={(e) => handleInputChange(["meta", "player2"], e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="p-1 font-bold text-[10px] uppercase border-t border-black">Event (Open/Women/Senior/Transnational)</div>
            <div className="relative h-6">
              <input type="text" className={inputClass} value={page1.meta?.event || ''} onChange={(e) => handleInputChange(["meta", "event"], e.target.value)} />
            </div>
          </div>
        </div>

        <div className="text-center font-bold text-sm uppercase py-1 border-b-2 border-black bg-gray-100">System Summary</div>
        {renderTextareaField("General Approach and Style", ["system", "generalApproach"])}
        {renderTextareaField("Special Bids That May Require Defense", ["system", "specialBids"])}
        {renderTextareaField("Special Forcing Pass Sequences", ["system", "forcingPasses"])}
        {renderTextareaField("Important Notes", ["system", "importantNotes"])}
        <div className="flex-1 border-t-0">
          {renderTextareaField("Psychics", ["system", "psychics"], "100%")}
        </div>
      </div>
    </div>
  );
};
