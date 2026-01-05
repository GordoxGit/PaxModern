import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { advisorApi } from '../services/api';
import { Message } from '../types';

export const AdvisorPanel: React.FC = () => {
  const { 
    isAdvisorOpen, 
    toggleAdvisor, 
    advisorMessages, 
    addAdvisorMessage, 
    activeConversationId, 
    conversations,
    countries,
    selectedCountry
  } = useGameStore();
  
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [advisorMessages, isThinking, isAdvisorOpen]);

  if (!isAdvisorOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    const userText = input;
    setInput('');

    // 1. User Message
    addAdvisorMessage({
        from: 'player',
        content: userText,
        timestamp: Date.now()
    });

    setIsThinking(true);

    try {
        // 2. Gather Context intelligently
        let diplomaticContext: Message[] = [];
        let targetName = null;
        let targetId = null;

        // Priorité 1: Le pays actuellement sélectionné sur la carte
        if (selectedCountry) {
            targetId = selectedCountry;
            const target = countries.find(c => c.id === selectedCountry);
            if (target) targetName = target.name;

            const conv = conversations.find(c => 
                c.id.includes(selectedCountry) || 
                (c.participants && c.participants.includes(selectedCountry))
            );
            
            if (conv) {
                diplomaticContext = conv.messages;
            }
        } 
        // Priorité 2: La conversation active
        else if (activeConversationId) {
            const conv = conversations.find(c => c.id === activeConversationId);
            if (conv) {
                diplomaticContext = conv.messages;
                targetName = "Interlocuteur Actif"; 
            }
        }

        // 3. Call AI
        const responseText = await advisorApi.ask(userText, diplomaticContext, targetName);

        // 4. Advisor Response
        addAdvisorMessage({
            from: 'advisor',
            content: responseText,
            timestamp: Date.now()
        });

    } catch (e) {
        console.error(e);
        addAdvisorMessage({
            from: 'system',
            content: "Désolé Excellence, je n'arrive pas à joindre mes contacts pour le moment.",
            timestamp: Date.now()
        });
    } finally {
        setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  return (
    <div className="absolute bottom-20 right-4 w-[450px] z-[2900] flex flex-col pointer-events-auto shadow-2xl rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-600 p-3 flex justify-between items-center">
            <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center border-2 border-slate-500 overflow-hidden">
                     <span className="text-xl">🤵</span>
                </div>
                <div>
                    <h3 className="font-bold text-slate-100 text-sm">Conseiller Diplomatique</h3>
                    <div className="flex items-center space-x-1">
                        <span className={`w-2 h-2 rounded-full ${selectedCountry ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                        <span className="text-[10px] text-slate-400 uppercase">
                            {selectedCountry ? `Cible: ${countries.find(c => c.id === selectedCountry)?.name}` : 'En attente'}
                        </span>
                    </div>
                </div>
            </div>
            <button onClick={toggleAdvisor} className="text-slate-400 hover:text-white transition-colors p-1">✕</button>
        </div>

        {/* Chat Body */}
        <div 
            ref={scrollRef}
            className="h-[450px] bg-slate-900 overflow-y-auto p-4 space-y-4 custom-scrollbar"
        >
            {advisorMessages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.from === 'player' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[90%] p-3 rounded-lg text-sm shadow-sm ${
                        msg.from === 'player' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-slate-700 text-slate-200 rounded-tl-none border border-slate-600'
                    }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 px-1">
                        {msg.from === 'player' ? 'Vous' : 'Conseiller'} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
            ))}
            
            {isThinking && (
                 <div className="flex items-center space-x-2 text-slate-500 text-xs ml-2">
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-200"></span>
                 </div>
            )}
        </div>

        {/* Input */}
        <div className="bg-slate-800 p-3 border-t border-slate-700">
            <div className="relative flex items-end bg-slate-900 rounded-md border border-slate-600 focus-within:border-blue-500 transition-colors">
                <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ex: Que répondre à cette offre ?"
                    className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none text-sm px-3 py-2.5 resize-none max-h-32 custom-scrollbar"
                    rows={1}
                    autoFocus
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                    }}
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="p-2 text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-0.5"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
  );
};