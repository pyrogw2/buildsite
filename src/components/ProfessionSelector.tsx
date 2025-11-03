import { useBuildStore } from '../store/buildStore';
import type { Profession } from '../types/gw2';

const PROFESSIONS: Profession[] = [
  'Guardian',
  'Warrior',
  'Engineer',
  'Ranger',
  'Thief',
  'Elementalist',
  'Mesmer',
  'Necromancer',
  'Revenant',
];

const PROFESSION_HEX: Record<Profession, string> = {
  Guardian: '#72C1D9',
  Warrior: '#FFD166',
  Engineer: '#D09C59',
  Ranger: '#8CDC82',
  Thief: '#C08F95',
  Elementalist: '#F68A87',
  Mesmer: '#B679D5',
  Necromancer: '#52A76F',
  Revenant: '#D16E5A',
};

const PROFESSION_GLOW: Record<Profession, string> = {
  Guardian: 'from-gw2-guardian/30 via-gw2-guardian/60 to-gw2-guardian',
  Warrior: 'from-gw2-warrior/30 via-gw2-warrior/60 to-gw2-warrior',
  Engineer: 'from-gw2-engineer/30 via-gw2-engineer/60 to-gw2-engineer',
  Ranger: 'from-gw2-ranger/30 via-gw2-ranger/60 to-gw2-ranger',
  Thief: 'from-gw2-thief/30 via-gw2-thief/60 to-gw2-thief',
  Elementalist: 'from-gw2-elementalist/30 via-gw2-elementalist/60 to-gw2-elementalist',
  Mesmer: 'from-gw2-mesmer/30 via-gw2-mesmer/60 to-gw2-mesmer',
  Necromancer: 'from-gw2-necromancer/30 via-gw2-necromancer/60 to-gw2-necromancer',
  Revenant: 'from-gw2-revenant/30 via-gw2-revenant/60 to-gw2-revenant',
};

export default function ProfessionSelector() {
  const { profession, setProfession } = useBuildStore();
  const accent = PROFESSION_HEX[profession];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Profession</p>
          <h2 className="mt-2 text-base font-semibold text-white">Choose your legend</h2>
        </div>
        <div
          className={`h-12 w-12 rounded-2xl border border-slate-800 bg-gradient-to-br ${PROFESSION_GLOW[profession]}`}
          style={{ boxShadow: `0 0 18px -6px ${accent}55` }}
        />
      </div>

      <div className="mt-4">
        <label className="sr-only" htmlFor="profession-select">
          Profession
        </label>
        <select
          id="profession-select"
          value={profession}
          onChange={(event) => setProfession(event.target.value as Profession)}
          className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm font-medium text-white shadow-[0_12px_30px_-24px_rgba(14,21,37,1)] transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-500"
          style={{ boxShadow: `0 0 0 1px ${accent}20 inset` }}
        >
          {PROFESSIONS.map((professionOption) => (
            <option key={professionOption} value={professionOption}>
              {professionOption}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
