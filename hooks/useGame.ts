import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { gameApi } from '../services/api';

export const useGame = (gameId?: string) => {
  const { setGame, setCountries, isPaused, togglePause } = useGameStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch if a specific ID is provided AND it's not the generic 'demo' string used in App initialization
    // If gameId is 'demo', we basically do nothing and let the App show the menu.
    // If we wanted to load a save, we would fetch here.
    
    if (gameId && gameId !== 'demo') {
        const fetchGame = async () => {
          setIsLoading(true);
          try {
            const response = await gameApi.get(gameId);
            setGame(response.data);
            // In a real app we would also fetch countries for this game here
          } catch (error) {
            console.error('Failed to fetch game:', error);
            setError('Failed to load game');
          } finally {
            setIsLoading(false);
          }
        };
        fetchGame();
    }
  }, [gameId, setGame, setCountries]);

  return {
    isLoading,
    error
  };
};