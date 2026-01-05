import React, { useState } from 'react';
import { GameLayout } from './components/GameLayout';
import { useGame } from './hooks/useGame';
import { useGameStore } from './stores/gameStore';
import NewGameModal from './components/NewGameModal';

const App: React.FC = () => {
  // Initialize game logic hooks
  useGame('demo'); // Keeps the hook structure but 'demo' id is ignored by the new logic
  
  const { currentGame } = useGameStore();
  const [showNewGameModal, setShowNewGameModal] = useState(false);

  // If no game is loaded, show Main Menu
  if (!currentGame) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center relative overflow-hidden">
        
        {/* Animated Background */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-50"></div>
           <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-900/20 to-gray-900"></div>
        </div>

        <div className="z-10 text-center max-w-lg w-full p-8">
          <h1 className="text-6xl font-black text-white mb-2 tracking-tighter">
            PAX <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">MODERN</span>
          </h1>
          <p className="text-gray-400 mb-10 text-lg tracking-wide uppercase font-light">Simulation Géopolitique Haute Fidélité</p>
          
          <div className="space-y-4">
            <button
              onClick={() => setShowNewGameModal(true)}
              className="w-full group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transform transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]"
            >
              <div className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded"></div>
              NOUVELLE PARTIE
            </button>
            
            <button
              disabled
              className="w-full px-8 py-4 bg-gray-800 text-gray-500 font-bold rounded cursor-not-allowed border border-gray-700"
            >
              CHARGER UNE PARTIE
            </button>
            
            <button
               disabled
               className="w-full px-8 py-4 bg-transparent text-gray-400 hover:text-white font-medium transition-colors"
            >
              OPTIONS
            </button>
          </div>
          
          <div className="mt-16 text-gray-600 text-xs font-mono">
            VERSION ALPHA 0.2.1 • build 2025.05.15
          </div>
        </div>
        
        <NewGameModal
          isOpen={showNewGameModal}
          onClose={() => setShowNewGameModal(false)}
        />
      </div>
    );
  }

  return (
    <React.StrictMode>
      <GameLayout />
    </React.StrictMode>
  );
};

export default App;