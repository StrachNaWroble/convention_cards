import React from 'react';

export const CardsList: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">My Convention Cards</h2>
          <p className="text-sm text-gray-400 mt-1">Manage your active partnerships and systems</p>
        </div>
        <button
          type="button"
          className="group relative inline-flex items-center justify-center px-6 py-3 font-bold text-white transition-all duration-200 bg-gradient-to-r from-indigo-500 to-purple-600 border border-transparent rounded-xl hover:from-indigo-400 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:-translate-y-0.5"
        >
          <span className="mr-2 text-xl leading-none">+</span>
          Create New Card
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder for an empty state or a list of cards */}
        <div className="col-span-full py-12 flex flex-col items-center justify-center bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 border-dashed">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No convention cards yet</h3>
          <p className="text-gray-400 text-sm text-center max-w-sm mb-6">
            You don't have any convention cards. Create one to start playing with your partner using the WBF system.
          </p>
          <button className="text-indigo-400 hover:text-indigo-300 font-medium text-sm transition-colors">
            Learn how to create a card &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
