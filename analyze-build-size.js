import pako from 'pako';

const buildParam = "eNoBTgCx_wYKART20QICDAACA6i5BKrAAQ4AEQOcswSZwAEfyi2tLbQtui3sLQcVlASABMAOBoIE4gOFDEu-Es8S5hIDi_4C5Z4GB_7XBJ_ZBOvaBLyPG6o";

console.log('='.repeat(80));
console.log('BUILD SIZE ANALYSIS');
console.log('='.repeat(80));
console.log(`Total URL param length: ${buildParam.length} characters\n`);

// Decode
const base64 = buildParam.replace(/-/g, '+').replace(/_/g, '/');
const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
const binary = atob(padded);
const bytes = new Uint8Array(binary.length);
for (let i = 0; i < binary.length; i++) {
  bytes[i] = binary.charCodeAt(i);
}

const decompressed = pako.inflate(bytes);

console.log(`Compressed size: ${bytes.length} bytes`);
console.log(`Decompressed size: ${decompressed.length} bytes`);
console.log(`Compression ratio: ${(decompressed.length / bytes.length).toFixed(2)}x\n`);

// Analyze byte by byte
let offset = 0;
console.log('BYTE-BY-BYTE BREAKDOWN:');
console.log('-'.repeat(80));

const version = decompressed[offset++];
console.log(`[${offset-1}] Version: ${version} (1 byte)`);

const packed = decompressed[offset++];
const profIdx = (packed >> 2) & 0x07;
const modeIdx = packed & 0x03;
console.log(`[${offset-1}] Profession+Mode: ${profIdx},${modeIdx} (1 byte)`);

// Infusions
const infusionTypeCount = decompressed[offset++];
console.log(`[${offset-1}] Infusion types: ${infusionTypeCount} (1 byte)`);
let infusionBytes = 1;
for (let i = 0; i < infusionTypeCount; i++) {
  let count = 0, countBytes = 0;
  let byte = decompressed[offset++];
  countBytes++;
  count = byte & 0x7F;
  while (byte & 0x80) {
    byte = decompressed[offset++];
    countBytes++;
    count |= (byte & 0x7F) << 7;
  }

  let id = 0, idBytes = 0;
  byte = decompressed[offset++];
  idBytes++;
  id = byte & 0x7F;
  while (byte & 0x80) {
    byte = decompressed[offset++];
    idBytes++;
    id |= (byte & 0x7F) << 7;
  }

  console.log(`  Type ${i+1}: count=${count} (${countBytes}b), id=${id} (${idBytes}b)`);
  infusionBytes += countBytes + idBytes;
}
console.log(`Total infusion section: ${infusionBytes} bytes\n`);

// Equipment
const eqCount = decompressed[offset++];
console.log(`[${offset-1}] Equipment count: ${eqCount} (1 byte)`);
let equipmentBytes = 1;
let equipmentStart = offset;
for (let i = 0; i < eqCount; i++) {
  const eqStart = offset;

  const byte1 = decompressed[offset++];
  let slotStat = 2; // default: 2 bytes for slot+stat packing

  if (decompressed[offset] === 0xFF) {
    offset++; // skip 0xFF
    slotStat = 2; // byte1 + 0xFF, then string (not analyzing string length here)
  } else {
    offset++; // byte2
  }

  const weaponByte = decompressed[offset++];

  // Sigil flags (2 bits packed in 1 byte)
  const sigilFlags = decompressed[offset++];
  const hasSigil1 = sigilFlags & 0x01;
  const hasSigil2 = sigilFlags & 0x02;

  let sigilBytes = 0;
  if (hasSigil1) {
    let byte = decompressed[offset++];
    sigilBytes++;
    while (byte & 0x80) {
      byte = decompressed[offset++];
      sigilBytes++;
    }
  }
  if (hasSigil2) {
    let byte = decompressed[offset++];
    sigilBytes++;
    while (byte & 0x80) {
      byte = decompressed[offset++];
      sigilBytes++;
    }
  }

  const eqBytes = offset - eqStart;
  console.log(`  Equipment ${i+1}: ${eqBytes} bytes (slot+stat=${slotStat}b, weapon=1b, sigils=${1+sigilBytes}b)`);
  equipmentBytes += eqBytes;
}
console.log(`Total equipment section: ${equipmentBytes} bytes\n`);

// Skills
const skillStart = offset;
const skillFlags = decompressed[offset++];
let skillBytes = 1;
for (let i = 0; i < 5; i++) {
  if (skillFlags & (1 << i)) {
    let byte = decompressed[offset++];
    let bytes = 1;
    while (byte & 0x80) {
      byte = decompressed[offset++];
      bytes++;
    }
    skillBytes += bytes;
  }
}
console.log(`Skills: ${skillBytes} bytes (flags=1b + ${skillBytes-1}b for IDs)`);

// Traits
const traitStart = offset;
const specFlags = decompressed[offset++];
let traitBytes = 1;
for (let i = 0; i < 3; i++) {
  if (specFlags & (1 << i)) {
    // Spec ID
    let byte = decompressed[offset++];
    let specIdBytes = 1;
    while (byte & 0x80) {
      byte = decompressed[offset++];
      specIdBytes++;
    }

    // 3 trait choices
    let choiceBytes = 0;
    for (let j = 0; j < 3; j++) {
      byte = decompressed[offset++];
      let bytes = 1;
      while (byte & 0x80) {
        byte = decompressed[offset++];
        bytes++;
      }
      choiceBytes += bytes;
    }

    traitBytes += specIdBytes + choiceBytes;
  }
}
console.log(`Traits: ${traitBytes} bytes (flags=1b + spec IDs + trait choices)\n`);

// Rune/Relic
const runeStart = offset;
const upgradeFlags = decompressed[offset++];
let upgradeBytes = 1;
if (upgradeFlags & 0x01) {
  let byte = decompressed[offset++];
  let bytes = 1;
  while (byte & 0x80) {
    byte = decompressed[offset++];
    bytes++;
  }
  upgradeBytes += bytes;
}
if (upgradeFlags & 0x02) {
  let byte = decompressed[offset++];
  let bytes = 1;
  while (byte & 0x80) {
    byte = decompressed[offset++];
    bytes++;
  }
  upgradeBytes += bytes;
}
console.log(`Rune/Relic: ${upgradeBytes} bytes (flags=1b + IDs)`);

// Profession mechanics (rest)
const mechanicsBytes = decompressed.length - offset;
console.log(`Profession mechanics: ${mechanicsBytes} bytes\n`);

console.log('-'.repeat(80));
console.log('SUMMARY:');
console.log(`  Version + Profession/Mode: 2 bytes`);
console.log(`  Infusions: ${infusionBytes} bytes`);
console.log(`  Equipment: ${equipmentBytes} bytes`);
console.log(`  Skills: ${skillBytes} bytes`);
console.log(`  Traits: ${traitBytes} bytes`);
console.log(`  Rune/Relic: ${upgradeBytes} bytes`);
console.log(`  Profession mechanics: ${mechanicsBytes} bytes`);
console.log(`  TOTAL: ${decompressed.length} bytes`);

console.log('\nESTIMATED BASE64 CONTRIBUTION:');
const base64Multiplier = 4/3; // 3 bytes = 4 base64 chars
console.log(`  Infusions: ~${Math.ceil(infusionBytes * base64Multiplier)} chars`);
console.log(`  Equipment: ~${Math.ceil(equipmentBytes * base64Multiplier)} chars`);
console.log(`  Skills: ~${Math.ceil(skillBytes * base64Multiplier)} chars`);
console.log(`  Traits: ~${Math.ceil(traitBytes * base64Multiplier)} chars`);
console.log(`  Rune/Relic: ~${Math.ceil(upgradeBytes * base64Multiplier)} chars`);
console.log(`  Profession mechanics: ~${Math.ceil(mechanicsBytes * base64Multiplier)} chars`);

console.log('\n' + '='.repeat(80));
