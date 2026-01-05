import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useGameStore } from '../stores/gameStore';
import L from 'leaflet';

const createCustomIcon = (isSelected: boolean) => {
  const size = isSelected ? 'w-6 h-6' : 'w-4 h-4';
  const ring = isSelected ? 'ring-4 ring-blue-500/50' : 'ring-2 ring-blue-400/30';
  
  return L.divIcon({
    className: 'bg-transparent',
    html: `
      <div class="relative flex items-center justify-center">
        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
        <div class="relative inline-flex rounded-full ${size} bg-blue-500 border-2 border-white shadow-lg shadow-blue-500/50 ${ring} transition-all duration-300"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -15]
  });
};

const createCityLabelIcon = (name: string, isCapital: boolean) => {
  return L.divIcon({
    className: 'bg-transparent',
    html: `
      <div class="flex flex-col items-center pointer-events-none drop-shadow-md">
        <div class="${isCapital ? 'text-yellow-400 text-xs' : 'text-gray-500 text-[10px]'} leading-none mb-1">
           ${isCapital ? '⭐' : '•'}
        </div>
        <div class="whitespace-nowrap ${isCapital ? 'text-white font-bold text-[11px] uppercase tracking-wider' : 'text-gray-400 text-[9px] font-medium'} bg-black/70 px-2 py-0.5 rounded border border-gray-700/50 backdrop-blur-sm">
          ${name}
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

const MapController = () => {
  const map = useMap();
  return null;
};

export const WorldMap: React.FC = () => {
  const { countries, selectCountry, selectedCountry } = useGameStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full bg-gray-900" />;

  return (
    <div className="w-full h-full bg-[#0a101a] relative overflow-hidden">
      
      <MapContainer
        center={[30, 0]}
        zoom={3}
        style={{ height: '100%', width: '100%', background: '#0a101a' }}
        minZoom={2}
        maxZoom={8}
        zoomControl={false}
        attributionControl={false}
        className="z-0"
      >
        <MapController />
        
        {/* CARTO DB DARK MATTER - Style "Jeu Vidéo / War Room" avec Frontières */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          className="map-tiles-filter"
          attribution=""
        />

        {countries.map(country => 
          country.cities?.map((city, idx) => (
            <Marker 
              key={`${country.id}-city-${idx}`}
              position={[city.lat, city.lng]}
              icon={createCityLabelIcon(city.name, city.is_capital)}
              interactive={false}
            />
          ))
        )}

        {countries.map((country) => (
          <Marker 
            key={country.id} 
            position={[country.lat, country.lng]}
            icon={createCustomIcon(selectedCountry === country.id)}
            eventHandlers={{
              click: () => selectCountry(country.id),
            }}
          >
            <Popup className="custom-popup">
              <div className="bg-gray-900 text-gray-100 p-2 border border-blue-500/30 rounded min-w-[150px]">
                <strong className="text-sm uppercase tracking-widest text-blue-400 block mb-1 border-b border-gray-700 pb-1">
                  {country.name_fr || country.name}
                </strong>
                <div className="text-xs text-gray-300">
                  <div>Leader: <span className="text-white">{country.leader_name}</span></div>
                  <div>PIB: <span className="text-green-400">${country.economy.gdp}B</span></div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Effet CRT / Scanline léger pour le look "Ecran de contrôle" */}
      <div className="absolute inset-0 pointer-events-none z-[500] opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

      <style>{`
        /* Ajustement léger pour booster le contraste sur la carte sombre */
        .map-tiles-filter {
          filter: contrast(110%) brightness(100%); 
        }
        .leaflet-popup-content-wrapper {
          background: rgba(17, 24, 39, 0.95) !important;
          border: 1px solid rgba(59, 130, 246, 0.4);
          border-radius: 4px !important;
          color: white !important;
        }
        .leaflet-popup-tip {
          background: rgba(17, 24, 39, 0.95) !important;
        }
        .leaflet-container {
          outline: 0;
          background: #111827;
        }
        .leaflet-control-attribution {
          display: none !important;
        }
      `}</style>
    </div>
  );
};