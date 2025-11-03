import { useBuildStore } from '../store/buildStore';
import type { GameMode } from '../types/gw2';

const GAME_MODES: GameMode[] = ['PvE', 'PvP', 'WvW'];

const MODE_COLORS: Record<GameMode, string> = {
  PvE: 'bg-green-600',
  PvP: 'bg-red-600',
  WvW: 'bg-orange-600',
};

export default function GameModeSelector() {
  const { gameMode, setGameMode } = useBuildStore();

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <h2 className="text-sm font-semibold mb-2">Game Mode</h2>
      <div className="flex gap-2">
        {GAME_MODES.map((mode) => (
          <button
            key={mode}
            onClick={() => setGameMode(mode)}
            className={`
              flex-1 px-3 py-2 rounded font-medium transition-all text-sm
              ${gameMode === mode
                ? `${MODE_COLORS[mode]} text-white shadow-md`
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
            `}
          >
            {mode}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Skills and traits may have different effects in different game modes
      </p>
    </div>
  );
}
