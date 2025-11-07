import { decodeBuild } from './src/lib/buildEncoder.ts';

const buildParam = "eNoBVwCo_wYIBQEW9tECBIJAAAALcAAADEACA6rAAaTAAQ5ABAOkwAGcswQfqi20LbotrS3sLQcdjAOIBNkDFZQEgATADku-Es8S5hIDi_4CwK4GB4_YBIbYBJ_ZBEHqHHQ";

console.log('Decoding Minstrel build...\n');
console.log(`URL length: ${buildParam.length} characters\n`);

try {
  const decoded = decodeBuild(buildParam);

  console.log('Profession:', decoded.profession);
  console.log('Default stat should be:', decoded.equipment.filter(eq => !eq.weaponType).map(eq => eq.stat));
  console.log('\nEquipment:');
  const slots = ['Helm', 'Shoulders', 'Coat', 'Gloves', 'Leggings', 'Boots', 'Amulet', 'Ring1', 'Ring2', 'Accessory1', 'Accessory2', 'Backpack', 'MainHand1', 'OffHand1', 'MainHand2', 'OffHand2'];
  const sorted = decoded.equipment.sort((a, b) => slots.indexOf(a.slot) - slots.indexOf(b.slot));
  for (const eq of sorted) {
    console.log(`  ${eq.slot}: ${eq.stat}${eq.weaponType ? ` (${eq.weaponType})` : ''}${eq.sigil1Id ? ` sigil1=${eq.sigil1Id}` : ''}${eq.sigil2Id ? ` sigil2=${eq.sigil2Id}` : ''}`);
  }

  console.log('\nWeapons specifically:');
  const weapons = decoded.equipment.filter(eq => eq.weaponType);
  console.log(`  Found ${weapons.length} weapon slots`);
  weapons.forEach(w => console.log(`  ${w.slot}: ${w.weaponType}, stat=${w.stat}`));

} catch (error) {
  console.error('Decode error:', error.message);
  console.error(error.stack);
}
