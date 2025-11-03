import { useBuildStore } from '../store/buildStore';

export default function EquipmentPreview() {
  const { equipment, relicId } = useBuildStore();

  const armorItems = equipment.filter(e =>
    ['Helm', 'Shoulders', 'Coat', 'Gloves', 'Leggings', 'Boots'].includes(e.slot)
  );
  const trinketItems = equipment.filter(e =>
    ['Backpack', 'Accessory1', 'Accessory2', 'Amulet', 'Ring1', 'Ring2'].includes(e.slot)
  );
  const weaponItems = equipment.filter(e =>
    ['MainHand1', 'OffHand1', 'MainHand2', 'OffHand2'].includes(e.slot)
  );

  const formatSlotName = (slot: string) => {
    // Format slot names for display
    if (slot.startsWith('MainHand')) return `Main Hand ${slot.slice(-1)}`;
    if (slot.startsWith('OffHand')) return `Off Hand ${slot.slice(-1)}`;
    if (slot.startsWith('Accessory')) return `Accessory ${slot.slice(-1)}`;
    if (slot.startsWith('Ring')) return `Ring ${slot.slice(-1)}`;
    return slot;
  };

  const renderEquipmentItem = (item: typeof equipment[0]) => (
    <div key={item.slot} className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {formatSlotName(item.slot)}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-200">{item.stat}</div>
      {item.upgrade && (
        <div className="mt-0.5 text-xs text-slate-400">{item.upgrade}</div>
      )}
      {item.infusion1 && (
        <div className="mt-0.5 text-xs text-emerald-400">{item.infusion1}</div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Armor Section */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Armor
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {armorItems.map(renderEquipmentItem)}
        </div>
      </div>

      {/* Trinkets Section */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Trinkets
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {trinketItems.map(renderEquipmentItem)}
        </div>
      </div>

      {/* Weapons Section */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Weapons
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {weaponItems.map(renderEquipmentItem)}
        </div>
      </div>

      {/* Relic Section */}
      {relicId && (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Relic
          </h3>
          <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2">
            <div className="text-sm font-medium text-slate-200">{relicId}</div>
          </div>
        </div>
      )}
    </div>
  );
}
