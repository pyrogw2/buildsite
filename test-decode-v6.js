import { decodeBuild } from './src/lib/buildEncoder.ts';

const encoded = "eNpj42Bl5GtdxMTS5MDAwF3AwMDjwMS86gDjkgOMfA4szEBqzmYW-Ye6a3VX6U40uP-BkZ2NQY3JkoG55RDjlils7LuAort0AWchE8Y";

console.log('='.repeat(80));
console.log('DECODING V6 BUILD WITH TRAIT POSITIONS');
console.log('='.repeat(80));
console.log(`URL length: ${encoded.length} characters\n`);

try {
  const decoded = decodeBuild(encoded);

  console.log('✅ Decode successful!\n');
  console.log(`Profession: ${decoded.profession}`);
  console.log(`Game Mode: ${decoded.gameMode}\n`);

  console.log('Traits:');
  console.log(`  Spec 1: ${decoded.traits.spec1} - choices: [${decoded.traits.spec1Choices?.join(', ')}]`);
  console.log(`  Spec 2: ${decoded.traits.spec2} - choices: [${decoded.traits.spec2Choices?.join(', ')}]`);
  console.log(`  Spec 3: ${decoded.traits.spec3} - choices: [${decoded.traits.spec3Choices?.join(', ')}]`);

  console.log(`\nSkills: heal=${decoded.skills.heal}, u1=${decoded.skills.utility1}, u2=${decoded.skills.utility2}, u3=${decoded.skills.utility3}, elite=${decoded.skills.elite}`);

  console.log(`\nRune: ${decoded.runeId}, Relic: ${decoded.relicId}`);

  console.log(`\nEquipment pieces: ${decoded.equipment.length}`);
  const weapons = decoded.equipment.filter(e => e.weaponType);
  console.log(`Weapons: ${weapons.map(w => `${w.slot}=${w.weaponType}`).join(', ')}`);

  console.log(`\nAmalgam morphs: ${JSON.stringify(decoded.professionMechanics?.amalgamMorphs)}`);

  console.log('\n' + '='.repeat(80));

} catch (error) {
  console.error('❌ Decode error:', error.message);
  console.error(error.stack);
}
