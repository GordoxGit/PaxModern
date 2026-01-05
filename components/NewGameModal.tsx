import React, { useState } from 'react'
import { gameApi, countryApi, MOCK_COUNTRIES } from '../services/api'
import { useGameStore } from '../stores/gameStore'
import { Country } from '../types'

interface NewGameModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewGameModal({ isOpen, onClose }: NewGameModalProps) {
  const { setGame, setCountries } = useGameStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleSelectCountry = async (country: Country) => {
    setLoading(true)
    setError(null)
    try {
      const response = await gameApi.create({
        player_country: country.id,
        name: `${country.name_fr || country.name} - Campagne`,
      })
      
      setGame(response.data)
      setCountries(MOCK_COUNTRIES)
      onClose()
    } catch (err: any) {
      setError('Erreur lors du lancement de la mission.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[5000] p-4 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h2 className="text-xl font-bold text-white tracking-widest uppercase">NOUVELLE MISSION</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-3">
              <span className="text-lg">⚠️</span> {error}
            </div>
          )}
          
          <p className="text-gray-500 text-xs uppercase tracking-[0.2em] mb-6 font-semibold">Sélectionnez une puissance souveraine</p>
          
          <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {MOCK_COUNTRIES.map((country) => (
              <button 
                key={country.id} 
                onClick={() => handleSelectCountry(country)}
                disabled={loading}
                className="w-full group relative p-4 bg-gray-800/40 hover:bg-blue-600/10 border border-gray-700/50 hover:border-blue-500/50 rounded-lg transition-all flex items-center justify-between overflow-hidden"
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex items-center gap-5 relative z-10">
                  <span className="text-3xl filter drop-shadow-md group-hover:scale-110 transition-transform">{country.flag}</span>
                  <div className="text-left">
                    <div className="text-gray-100 font-bold text-lg tracking-wide">{country.name_fr || country.name}</div>
                    <div className="text-gray-500 text-[10px] uppercase font-mono tracking-widest">{country.leader_name}</div>
                  </div>
                </div>
                
                <div className="text-gray-600 group-hover:text-blue-400 transition-colors relative z-10">
                   {loading ? (
                     <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                   ) : (
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                     </svg>
                   )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800/30 p-4 border-t border-gray-800 text-center">
           <span className="text-[10px] text-gray-600 font-mono tracking-widest uppercase">Initialisation des protocoles diplomatiques v2.5</span>
        </div>
      </div>
    </div>
  )
}