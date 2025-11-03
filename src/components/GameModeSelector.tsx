import { useBuildStore } from '../store/buildStore';
import type { GameMode } from '../types/gw2';

const GAME_MODES: GameMode[] = ['PvE', 'PvP', 'WvW'];

const MODE_ACCENTS: Record<GameMode, { gradient: string; glow: string }> = {
  PvE: { gradient: 'from-emerald-500/60 to-emerald-400/80', glow: '#34d399' },
  PvP: { gradient: 'from-rose-500/70 to-rose-400/80', glow: '#f87171' },
  WvW: { gradient: 'from-amber-500/70 to-amber-400/80', glow: '#fbbf24' },
};

export default function GameModeSelector() {
  const { gameMode, setGameMode } = useBuildStore();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Game Mode</p>
          <h2 className="mt-2 text-base font-semibold text-white">Contextual balance</h2>
        </div>
        <div className="rounded-full border border-slate-700 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-slate-400">
          Alpha
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {GAME_MODES.map((mode) => {
          const isActive = gameMode === mode;
          const accent = MODE_ACCENTS[mode];

          return (
            <button
              key={mode}
              type="button"
              onClick={() => setGameMode(mode)}
              className={`rounded-2xl border border-slate-800 px-3 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition hover:border-slate-600 ${
                isActive
                  ? `bg-gradient-to-br ${accent.gradient} text-slate-900 shadow-[0_10px_30px_-20px_rgba(56,189,248,1)]`
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-100'
              }`}
              style={isActive ? { boxShadow: `0 0 14px -4px ${accent.glow}66` } : undefined}
            >
              {mode}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Skills and trait functionality adapts per mode. Preview updates follow your selection instantly.
      </p>
    </div>
  );
}
