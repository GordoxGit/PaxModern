
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { diplomacyApi } from '../services/api';
import { Message, Country } from '../types';

export const DiplomacyPanel: React.FC = () => {
  const { 
    activeConversationId, 
    conversations, 
    countries, 
    currentGame, 
    addMessage, 
    closeConversation,
    openConversation,
    isDiplomacyListOpen,
    toggleDiplomacyList,
    selectCountry
  } = useGameStore();

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [statusText, setStatusText] = useState('CANAL CRYPTÉ');
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 250, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversations, activeConversationId, isTyping]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const conversation = conversations.find(c => c.id === activeConversationId);
  const targetCountry = activeConversationId 
    ? countries.find(c => activeConversationId.includes(c.id)) 
    : null;

  const getStationId = (countryId: string) => {
    const stations: Record<string, string> = {
      germany: 'BERLIN',
      france: 'PARIS',
      usa: 'WDC',
      china: 'PEK',
      russia: 'MOS'
    };
    return stations[countryId] || countryId.toUpperCase().substring(0, 3);
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping || !targetCountry || !currentGame || !activeConversationId) return;
    
    const textToSend = input;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const playerMsg: Message = { from: 'player', content: textToSend, timestamp: Date.now() };
    addMessage(activeConversationId, playerMsg);

    const currentHistory = conversation ? [...conversation.messages, playerMsg] : [playerMsg];
    const start = new Date('2025-01-01').getTime();
    const currentDate = new Date(start + currentGame.game_date * 86400000).toLocaleDateString('fr-FR', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });

    try {
        setStatusText('TRANSMISSION...');
        setIsTyping(true);
        const apiPromise = diplomacyApi.sendMessage(
            currentGame.id, activeConversationId, textToSend, targetCountry.id,
            currentHistory, { countryName: currentGame.player_country, leaderName: currentGame.player_leader.name },
            currentDate
        );
        const [response] = await Promise.all([apiPromise, new Promise(r => setTimeout(r, 1000))]); // Délai réduit pour nervosité
        addMessage(activeConversationId, response.data.aiMessage);
        setIsTyping(false);
        setStatusText('CANAL CRYPTÉ');
    } catch (error) {
        setIsTyping(false);
        setStatusText('ÉCHEC LIAISON');
    }
  };

  const handleOpenChat = (country: Country) => {
    if(!currentGame) return;
    const convId = `conv_${currentGame.id}_${country.id}`;
    selectCountry(country.id);
    openConversation(convId);
  };

  const windowStyles = isMobile 
    ? { top: 0, left: 0, width: '100vw', height: '100dvh' }
    : { top: position.y, left: position.x, width: '500px', height: '600px' };

  return (
    <>
      {/* 1. CONTACT LIST - GAME STYLE */}
      <div className="fixed bottom-4 left-4 z-[2500] flex flex-col items-start gap-4 pointer-events-auto font-mono">
        {isDiplomacyListOpen && (
          <div className="mb-2 w-72 bg-gray-950 border border-blue-900/50 rounded-none shadow-[0_0_20px_rgba(0,0,0,0.8)] overflow-hidden animate-in slide-in-from-bottom-5">
            <div className="bg-blue-950/30 p-2 border-b border-blue-800/50 flex justify-between items-center">
              <span className="text-blue-400 text-[10px] tracking-[0.2em] uppercase glow-text">Cibles Diplomatiques</span>
              <button onClick={toggleDiplomacyList} className="text-blue-500 hover:text-white px-2">✕</button>
            </div>
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {countries.filter(c => c.id !== currentGame?.player_country).map(country => (
                <button key={country.id} onClick={() => handleOpenChat(country)} className="w-full text-left p-3 hover:bg-blue-900/20 border-b border-gray-900 flex items-center gap-3 transition-colors group">
                  <span className="text-xl filter grayscale group-hover:grayscale-0 transition-all">{country.flag}</span>
                  <div>
                    <div className="text-gray-300 font-bold text-xs uppercase group-hover:text-blue-300">{country.name_fr || country.name}</div>
                    <div className="text-[9px] text-gray-600 font-mono tracking-widest">{getStationId(country.id)}-LINK</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        <button 
          onClick={toggleDiplomacyList} 
          title="Messagerie"
          className="flex items-center justify-center w-14 h-14 bg-gray-950 border border-blue-500/50 text-blue-400 rounded-none shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:bg-blue-900/20 hover:border-blue-400 hover:text-white transition-all active:scale-95 group"
        >
          <span className="text-2xl group-hover:animate-pulse">💬</span>
        </button>
      </div>

      {/* 2. CHAT WINDOW - MILITARY TERMINAL STYLE */}
      {activeConversationId && targetCountry && (
        <div 
          className={`fixed z-[3000] bg-gray-950 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.9)] ${isMobile ? '' : 'border border-blue-800/60'}`}
          style={windowStyles}
        >
          {/* Header */}
          <div onMouseDown={handleMouseDown} className={`bg-gray-900/90 p-3 border-b border-blue-800/50 flex justify-between items-center ${isMobile ? '' : 'cursor-move'}`}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <span className="text-3xl filter drop-shadow-lg">{targetCountry.flag}</span>
                <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse border border-black"></span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-black text-blue-100 uppercase tracking-widest font-mono">
                    {targetCountry.name_fr || targetCountry.name}
                </h3>
                <span className="text-[9px] text-blue-500/80 font-mono tracking-[0.2em] uppercase">
                  Liaison: SECURE-{getStationId(targetCountry.id)} // 100%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
                 <div className="hidden md:flex flex-col items-end mr-4">
                    <span className="w-16 h-[2px] bg-blue-500/30 overflow-hidden">
                        <div className="h-full bg-blue-500 animate-progress"></div>
                    </span>
                 </div>
                 <button onClick={closeConversation} className="text-blue-500 hover:text-red-500 bg-blue-900/10 hover:bg-red-900/20 px-3 py-1 text-xs border border-blue-800/30 hover:border-red-500/50 transition-colors uppercase font-mono">
                    Fermer
                 </button>
            </div>
          </div>

          {/* Body */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-5 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-gray-950 custom-scrollbar relative">
            <div className="absolute inset-0 bg-blue-900/5 pointer-events-none"></div>
            
            {conversation?.messages.map((msg, idx) => {
                const isPlayer = msg.from === 'player';
                const displayName = isPlayer 
                    ? (countries.find(c => c.id === currentGame?.player_country)?.name_fr || 'QUARTIER GÉNÉRAL').toUpperCase()
                    : (targetCountry.name_fr || targetCountry.name).toUpperCase();

                return (
                    <div key={idx} className={`relative z-10 flex w-full flex-col ${isPlayer ? 'items-end' : 'items-start'}`}>
                        <div className={`text-[9px] font-mono font-bold uppercase tracking-widest mb-1 px-1 opacity-70 ${isPlayer ? 'text-blue-400 mr-1' : 'text-red-400 ml-1'}`}>
                          {displayName} // {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        
                        <div className={`max-w-[85%] flex flex-col ${isPlayer ? 'items-end' : 'items-start'}`}>
                            <div className={`p-3 text-xs md:text-sm font-mono shadow-lg backdrop-blur-sm ${
                                isPlayer ? 'bg-blue-900/20 border border-blue-500/30 text-blue-100 rounded-sm' 
                                         : 'bg-red-900/10 border border-red-500/30 text-gray-200 rounded-sm'
                            }`}>
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
            
            {isTyping && (
                <div className="flex items-center gap-2 text-blue-500/50 ml-2 animate-pulse font-mono text-xs">
                    <span>█</span>
                    <span className="tracking-widest uppercase">Réception de données...</span>
                </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-900 border-t border-blue-900/50">
             <div className="flex items-end gap-2 bg-black/50 border border-blue-900/30 p-1 focus-within:border-blue-500/70 transition-colors">
                <span className="text-blue-500/50 pl-2 py-1.5 font-mono text-xs select-none">{'>'}</span>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                  }}
                  placeholder="Entrez votre directive..."
                  className="flex-1 bg-transparent text-blue-100 placeholder-blue-900/50 focus:outline-none text-xs md:text-sm py-1.5 font-mono resize-none custom-scrollbar"
                  rows={1}
                  autoFocus
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="px-3 py-1.5 text-blue-500 hover:text-blue-300 hover:bg-blue-500/10 disabled:opacity-20 transition-all uppercase font-mono text-xs font-bold tracking-wider border-l border-blue-900/30"
                >
                  Envoyer
                </button>
             </div>
             <div className="mt-1 flex justify-between items-center px-1">
                <span className={`text-[8px] uppercase font-bold font-mono tracking-[0.2em] ${isTyping ? 'text-yellow-500 animate-pulse' : 'text-blue-600'}`}>
                    {statusText}
                </span>
                <span className="text-[8px] text-blue-900 font-mono">v.2.0.4 // SECURE</span>
             </div>
          </div>
        </div>
      )}
    </>
  );
};
