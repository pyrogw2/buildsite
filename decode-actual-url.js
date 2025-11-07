import pako from 'pako';

const buildParam = "eNpj4-JlYGBg-XaRiRFCMUEoZgjFAqFYIRQ3AwMPkAIiTogAF4RiZ2CQgYgDEQcyh4eBiX_OZhYggvD5GFhA_Ff7GSF8-Ye6u3TP6W7RPXiThV2WQZTBm4G5-x_ThQls7PNvsrTdYOm_wQIA8TU3qQ";

console.log('Decoding actual build URL...\n');

// Import the actual decoder from the source
const base64 = buildParam.replace(/-/g, '+').replace(/_/g, '/');
const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

const binary = atob(padded);
const bytes = new Uint8Array(binary.length);
for (let i = 0; i < binary.length; i++) {
  bytes[i] = binary.charCodeAt(i);
}

const decompressed = pako.inflate(bytes);
const version = decompressed[0];

console.log(`Version: ${version}`);
console.log(`Decompressed size: ${decompressed.length} bytes`);
console.log(`Hex dump: ${Array.from(decompressed).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

// Now let's use the actual decoder from the build
import { decodeBuild } from './src/lib/buildEncoder.ts';

try {
  const decoded = decodeBuild(buildParam);
  console.log('\nDecoded build:');
  console.log(JSON.stringify(decoded, null, 2));
} catch (error) {
  console.error('Decode error:', error.message);
}
