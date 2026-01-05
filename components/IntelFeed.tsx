
import React, { useState } from 'react';
import { Panel } from './Panel';

export const IntelFeed: React.FC = () => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    return (
        <div className="pointer-events-auto transition-all duration-300 ease-in-out">
            {isCollapsed ? (
                <button 
                    onClick={() => setIsCollapsed(false)}
                    title="Rapports de Renseignement"
                    className="relative w-12 h-12 md:w-16 md:h-16 bg-gray-900/95 border border-blue-500/30 rounded-full shadow-2xl hover:scale-110 hover:border-blue-400 active:scale-95 transition-all flex items-center justify-center"
                >
                    <span className="text-2xl md:text-3xl">📡</span>
                    <span className="absolute top-1 right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-gray-900 animate-pulse"></span>
                </button>
            ) : (
                <Panel className="w-80 md:w-96 border-blue-500/30 bg-gray-900/95 backdrop-blur-md flex flex-col shadow-2xl animate-in slide-in-from-bottom-5">
                     <div className="px-4 py-2 border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-100 uppercase tracking-wider flex items-center gap-2">
                            <span>📡 INTEL</span>
                        </h3>
                        <button onClick={() => setIsCollapsed(true)} className="text-gray-400 hover:text-white p-1">
                            −
                        </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2 p-4 custom-scrollbar">
                        <div className="p-3 bg-gray-800/40 border-l-2 border-yellow-500 rounded-r hover:bg-gray-800/60 transition-colors cursor-default">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wide">12 JAN 2025</span>
                                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                            </div>
                            <p className="text-gray-200 text-xs leading-relaxed">
                                Annonce de sommets mondiaux pour apaiser les tensions croissantes dans le Pacifique.
                            </p>
                        </div>
                        <div className="p-3 bg-gray-800/40 border-l-2 border-blue-500 rounded-r hover:bg-gray-800/60 transition-colors cursor-default">
                            <span className="text-[10px] text-gray-400 block mb-1 uppercase tracking-wide">05 JAN 2025</span>
                            <p className="text-gray-200 text-xs leading-relaxed">
                                Nouveaux accords commerciaux signés entre les puissances majeures.
                            </p>
                        </div>
                    </div>
                </Panel>
            )}
        </div>
    );
};
