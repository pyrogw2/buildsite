import pako from 'pako';

const buildParam = "eNpj4-JlYGBg-XaRiRFCMUEoZgjFAqFYIRQ3AwMPkAIiTogAF4RiZ2CQgYgDEQcyh4eBiX_OZhYggvD5GFhA_Ef7GSF8-Ye6u3TP6W7RPXiThV2WQZTBm4G5-x_ThQls7PNvsrTdYOm_wQIA8TU3qQ";

console.log('Checking build version...\n');
console.log(`Input: ${buildParam}`);
console.log(`Length: ${buildParam.length} characters\n`);

try {
  // Restore standard base64
  const base64 = buildParam.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

  console.log(`Base64 (first 50 chars): ${padded.substring(0, 50)}...\n`);

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  console.log(`Compressed size: ${bytes.length} bytes`);
  console.log(`First 20 compressed bytes (hex): ${Array.from(bytes.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ')}\n`);

  const decompressed = pako.inflate(bytes);

  const version = decompressed[0];
  console.log(`Version byte: ${version}`);
  console.log(`Decompressed size: ${decompressed.length} bytes`);
  console.log(`First 50 decompressed bytes (hex): ${Array.from(decompressed.slice(0, 50)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
} catch (error) {
  console.error(`Error: ${error.message}`);
  console.error('\nThis suggests the build was not compressed with V6 encoder.');
  console.error('It may be a V5 build or the encoder has a bug.');
}
