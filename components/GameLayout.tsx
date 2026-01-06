
import React from 'react';
import { TopBar } from './TopBar';
import { WorldMap } from './WorldMap';
import { useGameStore } from '../stores/gameStore';
import { Panel } from './Panel';
import { Button } from './Button';
import { DiplomacyPanel } from './DiplomacyPanel';
import { AdvisorPanel } from './AdvisorPanel';
import { IntelFeed } from './IntelFeed';

export const GameLayout: React.FC = () => {
  const { selectedCountry, countries, currentGame, openConversation, toggleAdvisor, isAdvisorOpen, selectCountry } = useGameStore();
  
  // SÉCURITÉ : Si les données critiques sont absentes, on affiche un loader au lieu de crasher
  if (!currentGame || !countries) {
    return <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-blue-500 font-mono animate-pulse">CHARGEMENT DES DONNÉES GÉOPOLITIQUES...</div>;
  }

  // SÉCURITÉ : Vérifier que countries est bien un tableau avant le .find
  const selectedCountryData = Array.isArray(countries) ? countries.find(c => c.id === selectedCountry) : null;
  
  const isPlayerCountry = currentGame?.player_country === selectedCountryData?.id;

  const handleContact = () => {
      if (!currentGame || !selectedCountry) return;
      const convId = `conv_${currentGame.id}_${selectedCountry}`;
      openConversation(convId);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-900 text-gray-100 relative font-sans">
      
      {/* GLOBAL SCREEN EFFECTS */}
      <div className="pointer-events-none absolute inset-0 z-[9999] overflow-hidden">
        {/* Scanlines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-20"></div>
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)] pointer-events-none"></div>
      </div>

      <TopBar />
      
      <div className="flex-1 relative w-full h-full">
        <WorldMap />
        
        {/* Panneau Latéral Contextuel - Responsive */}
        {selectedCountryData && (
          <div className="absolute top-12 left-2 right-2 md:right-auto md:top-16 md:left-4 md:w-80 z-[2000] pointer-events-auto">
            <div className="relative group">
              <Panel title={selectedCountryData.name_fr || selectedCountryData.name} className="animate-in slide-in-from-left duration-300 border-blue-500/30 bg-gray-900/90 backdrop-blur-md relative">
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-7 md:w-12 md:h-8 bg-gray-800 rounded border border-gray-600 flex items-center justify-center text-xl md:text-2xl">
                       {selectedCountryData.flag}
                    </div>
                    <div>
                      <div className="text-[8px] md:text-[10px] text-blue-400 uppercase font-bold">Dirigeant</div>
                      <div className="text-xs md:text-sm font-medium text-white">{selectedCountryData.leader_name}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] md:text-sm">
                    <div className="bg-gray-800/50 p-1.5 md:p-2 rounded border border-gray-700/50">
                      <div className="text-gray-400 text-[8px] md:text-[10px] uppercase">PIB</div>
                      <div className="font-mono text-green-400 font-bold">${selectedCountryData.economy.gdp}B</div>
                    </div>
                     <div className="bg-gray-800/50 p-1.5 md:p-2 rounded border border-gray-700/50">
                      <div className="text-gray-400 text-[8px] md:text-[10px] uppercase">Armée</div>
                      <div className="font-mono text-red-400 font-bold">{selectedCountryData.military.strength}k</div>
                    </div>
                  </div>

                  {!isPlayerCountry ? (
                      <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                          <Button variant="primary" size="sm" onClick={handleContact} className="w-full uppercase font-bold tracking-tighter border border-blue-500/50">Contact</Button>
                          <Button variant="secondary" size="sm" className="w-full uppercase font-bold tracking-tighter border border-gray-600">Espion</Button>
                          <Button variant="secondary" size="sm" className="w-full uppercase font-bold tracking-tighter border border-gray-600">Commerce</Button>
                          <Button variant="danger" size="sm" className="w-full uppercase font-bold tracking-tighter border border-red-500/50">Guerre</Button>
                      </div>
                  ) : (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                      <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Votre Territoire</span>
                    </div>
                  )}
                </div>
              </Panel>
              
              <button 
                onClick={() => selectCountry(null)}
                className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-md transition-all z-[2010] shadow-lg active:scale-95"
                title="Fermer"
              >
                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <DiplomacyPanel />
        <AdvisorPanel />

        <div className="absolute bottom-4 right-4 flex flex-col items-end space-y-4 z-[2000] pointer-events-auto">
           {/* Bouton CONSEILLER - ICON ONLY */}
           <button 
                onClick={toggleAdvisor}
                title="Conseiller"
                className={`flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full border shadow-2xl transition-all hover:scale-110 active:scale-95 ${
                    isAdvisorOpen ? 'bg-green-800 border-green-500 text-white ring-2 ring-green-500/50' : 'bg-gray-900/95 border-gray-700 text-white'
                }`}
           >
                <span className="text-2xl md:text-3xl filter drop-shadow-lg">🤵</span>
           </button>
           <IntelFeed />
        </div>
      </div>
    </div>
  );
};
