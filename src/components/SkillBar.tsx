import { useState, useEffect } from 'react';
import { useBuildStore } from '../store/buildStore';
import { gw2Api } from '../lib/gw2api';
import type { GW2Skill } from '../types/gw2';

type SkillSlot = 'heal' | 'utility1' | 'utility2' | 'utility3' | 'elite';

const SLOT_LABELS: Record<SkillSlot, string> = {
  heal: 'Heal',
  utility1: 'Utility 1',
  utility2: 'Utility 2',
  utility3: 'Utility 3',
  elite: 'Elite',
};

export default function SkillBar() {
  const { profession, skills, setSkill } = useBuildStore();
  const [availableSkills, setAvailableSkills] = useState<GW2Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    loadSkills();
  }, [profession]);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const allSkills = await gw2Api.getSkills(profession);
      setAvailableSkills(allSkills);
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSkillsForSlot = (slotType: string): GW2Skill[] => {
    return availableSkills.filter((skill) => skill.slot?.toLowerCase() === slotType.toLowerCase());
  };

  const renderSkillSlot = (slot: SkillSlot) => {
    const slotType = slot === 'heal' ? 'Heal' : slot === 'elite' ? 'Elite' : 'Utility';
    const skillsForSlot = getSkillsForSlot(slotType);
    const selectedSkillId = skills[slot];
    const selectedSkill = availableSkills.find((skill) => skill.id === selectedSkillId);

    return (
      <div
        key={slot}
        className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 shadow-[0_18px_40px_-32px_rgba(14,22,40,1)]"
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{SLOT_LABELS[slot]}</span>
          <div
            className={`relative flex h-14 w-14 items-center justify-center rounded-xl border ${
              selectedSkill ? 'border-yellow-400 bg-slate-900' : 'border-slate-700 bg-slate-900/50'
            }`}
          >
            {selectedSkill ? (
              <img src={selectedSkill.icon} alt={selectedSkill.name} className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <span className="text-[10px] text-slate-500">Empty</span>
            )}
          </div>
        </div>

        <div className="flex-1">
          <div className="text-xs font-semibold text-slate-200">
            {selectedSkill?.name ?? 'Select a skill'}
          </div>
          <select
            value={selectedSkillId || ''}
            onChange={(event) => {
              const skillId = event.target.value ? parseInt(event.target.value, 10) : 0;
              if (skillId) setSkill(slot, skillId);
            }}
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="">Select skill…</option>
            {skillsForSlot.map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-[0_18px_50px_-28px_rgba(14,22,40,1)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Utility Bar</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Skills</h2>
          </div>
          <span className="text-xs text-slate-500">Loading…</span>
        </div>
        <div className="mt-6 grid gap-3">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-16 rounded-2xl bg-slate-800/60" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-[0_18px_50px_-28px_rgba(14,22,40,1)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between"
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Utility Bar</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Skills</h2>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 text-slate-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={`h-4 w-4 transition-transform ${expanded ? '' : '-rotate-90'}`}
          >
            <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="mt-6 space-y-3">
          {renderSkillSlot('heal')}
          {renderSkillSlot('utility1')}
          {renderSkillSlot('utility2')}
          {renderSkillSlot('utility3')}
          {renderSkillSlot('elite')}
        </div>
      )}
    </section>
  );
}
