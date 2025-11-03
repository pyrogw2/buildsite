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
    return availableSkills.filter(skill =>
      skill.slot?.toLowerCase() === slotType.toLowerCase()
    );
  };

  const renderSkillSlot = (slot: SkillSlot) => {
    const slotType = slot === 'heal' ? 'Heal' :
                      slot === 'elite' ? 'Elite' : 'Utility';
    const skillsForSlot = getSkillsForSlot(slotType);
    const selectedSkillId = skills[slot];
    const selectedSkill = availableSkills.find(s => s.id === selectedSkillId);

    return (
      <div key={slot} className="bg-gray-700 rounded-lg p-2">
        <label className="text-xs text-gray-400 mb-1 block text-center font-medium">
          {SLOT_LABELS[slot]}
        </label>

        {/* Skill Icon Display */}
        {selectedSkill ? (
          <div className="mb-1">
            <div className="w-12 h-12 mx-auto rounded border-2 border-yellow-400 bg-gray-800 overflow-hidden">
              <img
                src={selectedSkill.icon}
                alt={selectedSkill.name}
                className="w-full h-full object-cover"
                title={selectedSkill.name}
              />
            </div>
            <div className="text-xs text-center text-gray-300 mt-0.5 font-medium line-clamp-1">
              {selectedSkill.name}
            </div>
          </div>
        ) : (
          <div className="mb-1">
            <div className="w-12 h-12 mx-auto rounded border-2 border-gray-600 bg-gray-800 flex items-center justify-center">
              <span className="text-gray-500 text-xs">Empty</span>
            </div>
          </div>
        )}

        {/* Skill Selector */}
        <select
          value={selectedSkillId || ''}
          onChange={(e) => {
            const skillId = e.target.value ? parseInt(e.target.value) : 0;
            if (skillId) setSkill(slot, skillId);
          }}
          className="w-full bg-gray-600 text-white rounded px-1.5 py-0.5 text-xs"
        >
          <option value="">Select...</option>
          {skillsForSlot.map(skill => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Skills</h2>
        <div className="text-gray-400">Loading skills...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <h2 className="text-sm font-semibold mb-2">Skills</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {renderSkillSlot('heal')}
        {renderSkillSlot('utility1')}
        {renderSkillSlot('utility2')}
        {renderSkillSlot('utility3')}
        {renderSkillSlot('elite')}
      </div>
    </div>
  );
}
