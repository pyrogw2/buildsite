import { useState } from 'react';
import { useBuildStore } from '../store/buildStore';
import { STAT_COMBOS, INFUSIONS, type StatCombo, type InfusionType } from '../types/gw2';

export default function EquipmentPanel() {
  const { equipment, updateEquipment, applyStatToCategory, applyInfusionToCategory } = useBuildStore();
  const [bulkStat, setBulkStat] = useState<StatCombo>('Berserker');
  const [bulkInfusion, setBulkInfusion] = useState<InfusionType>('Mighty +9 Agony');

  const armorItems = equipment.filter(e =>
    ['Helm', 'Shoulders', 'Coat', 'Gloves', 'Leggings', 'Boots'].includes(e.slot)
  );
  const trinketItems = equipment.filter(e =>
    ['Backpack', 'Accessory1', 'Accessory2', 'Amulet', 'Ring1', 'Ring2'].includes(e.slot)
  );
  const weaponItems = equipment.filter(e =>
    ['MainHand1', 'OffHand1', 'MainHand2', 'OffHand2'].includes(e.slot)
  );

  const renderEquipmentSlot = (item: typeof equipment[0]) => (
    <div key={item.slot} className="bg-gray-700 p-3 rounded space-y-2">
      <div className="font-medium text-sm text-gray-300">{item.slot}</div>
      <select
        value={item.stat}
        onChange={(e) => updateEquipment(item.slot, { stat: e.target.value as StatCombo })}
        className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
      >
        {STAT_COMBOS.map(stat => (
          <option key={stat} value={stat}>{stat}</option>
        ))}
      </select>
      <select
        value={item.infusion1 || ''}
        onChange={(e) => updateEquipment(item.slot, {
          infusion1: e.target.value ? e.target.value as InfusionType : undefined
        })}
        className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
      >
        <option value="">No Infusion</option>
        {INFUSIONS.map(inf => (
          <option key={inf} value={inf}>{inf}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <h2 className="text-sm font-semibold mb-2">Equipment</h2>

      {/* Bulk Apply Controls */}
      <div className="bg-gray-700 p-2 rounded-lg mb-2 space-y-2">
        <h3 className="text-xs font-medium text-gray-200">Bulk Apply</h3>

        {/* Stats */}
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Apply Stat:</label>
          <div className="flex gap-2 flex-wrap">
            <select
              value={bulkStat}
              onChange={(e) => setBulkStat(e.target.value as StatCombo)}
              className="bg-gray-600 text-white rounded px-3 py-1.5 text-sm"
            >
              {STAT_COMBOS.map(stat => (
                <option key={stat} value={stat}>{stat}</option>
              ))}
            </select>
            <button
              onClick={() => applyStatToCategory('armor', bulkStat)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              to Armor
            </button>
            <button
              onClick={() => applyStatToCategory('trinkets', bulkStat)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              to Trinkets
            </button>
            <button
              onClick={() => applyStatToCategory('weapons', bulkStat)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              to Weapons
            </button>
            <button
              onClick={() => applyStatToCategory('all', bulkStat)}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-medium"
            >
              to All
            </button>
          </div>
        </div>

        {/* Infusions */}
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Apply Infusion:</label>
          <div className="flex gap-2 flex-wrap">
            <select
              value={bulkInfusion}
              onChange={(e) => setBulkInfusion(e.target.value as InfusionType)}
              className="bg-gray-600 text-white rounded px-3 py-1.5 text-sm"
            >
              {INFUSIONS.map(inf => (
                <option key={inf} value={inf}>{inf}</option>
              ))}
            </select>
            <button
              onClick={() => applyInfusionToCategory('armor', bulkInfusion)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm"
            >
              to Armor
            </button>
            <button
              onClick={() => applyInfusionToCategory('trinkets', bulkInfusion)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm"
            >
              to Trinkets
            </button>
            <button
              onClick={() => applyInfusionToCategory('weapons', bulkInfusion)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm"
            >
              to Weapons
            </button>
            <button
              onClick={() => applyInfusionToCategory('all', bulkInfusion)}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-medium"
            >
              to All
            </button>
          </div>
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="space-y-6">
        <div>
          <h3 className="font-medium text-gray-200 mb-3">Armor</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {armorItems.map(renderEquipmentSlot)}
          </div>
        </div>

        <div>
          <h3 className="font-medium text-gray-200 mb-3">Trinkets</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {trinketItems.map(renderEquipmentSlot)}
          </div>
        </div>

        <div>
          <h3 className="font-medium text-gray-200 mb-3">Weapons</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {weaponItems.map(renderEquipmentSlot)}
          </div>
        </div>
      </div>
    </div>
  );
}
