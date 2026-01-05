import React from 'react';
import { useGameStore } from '../stores/gameStore';
import { Button } from './Button';

export const TopBar: React.FC = () => {
  const { currentGame, isPaused, togglePause } = useGameStore();

  const formatDate = (ticks: number) => {
    const start = new Date('2025-01-01').getTime();
    const current = new Date(start + ticks * 86400000);
    return current.toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="h-10 md:h-14 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-2 md:px-4 z-50 absolute top-0 left-0 right-0 shadow-md">
      <div className="flex items-center space-x-2 md:space-x-4">
        <h1 className="text-sm md:text-xl font-bold text-white tracking-tight">
          PAX <span className="text-blue-500">MODERN</span>
        </h1>
        {currentGame && (
          <div className="hidden sm:flex items-center space-x-2 text-gray-400 text-[10px] md:text-sm border-l border-gray-700 pl-2 md:pl-4">
            <span className="font-medium text-gray-200 truncate max-w-[80px] md:max-w-none">{currentGame.player_country}</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden lg:inline">{currentGame.player_leader.name}</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 md:space-x-6">
        {/* Resources - Masqués sur petits mobiles */}
        <div className="hidden lg:flex items-center space-x-4 text-sm">
          <div className="flex flex-col items-center">
            <span className="text-gray-500 text-[10px]">GDP (B)</span>
            <span className="text-green-400 font-mono font-bold">$2,450</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-gray-500 text-[10px]">Stab.</span>
            <span className="text-blue-400 font-mono font-bold">78%</span>
          </div>
        </div>

        {/* Game Controls */}
        <div className="flex items-center space-x-1 md:space-x-2 bg-gray-800 rounded-md p-0.5 md:p-1 border border-gray-700">
          <Button 
            variant={isPaused ? "primary" : "secondary"} 
            size="sm"
            onClick={togglePause}
            className="!px-2 !py-0.5 md:!px-3 md:!py-1"
          >
            {isPaused ? "▶" : "II"}
          </Button>
          <div className="px-1.5 py-0.5 bg-gray-900 rounded text-[9px] md:text-xs font-mono text-gray-300 min-w-[80px] md:min-w-[120px] text-center">
             {currentGame ? formatDate(currentGame.game_date) : "1 Jan. 2025"}
          </div>
        </div>
      </div>
    </div>
  );
};