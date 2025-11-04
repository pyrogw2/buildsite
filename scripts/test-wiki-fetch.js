#!/usr/bin/env node

const WIKI_BASE = 'https://wiki.guildwars2.com/index.php';

async function fetchWikiEditPage(name) {
  const pageName = name.replace(/ /g, '_');
  const url = `${WIKI_BASE}?title=${encodeURIComponent(pageName)}&action=edit`;

  console.log(`Fetching: ${url}\n`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GW2BuildSite/1.0 (https://github.com/your-repo; data collection for build editor)',
      },
    });
    if (!response.ok) {
      console.error(`✗ HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const html = await response.text();

    // Extract wikitext from the textarea with id="wpTextbox1"
    const match = html.match(/<textarea[^>]*id="wpTextbox1"[^>]*>([\s\S]*?)<\/textarea>/);
    if (!match) {
      console.error('✗ Could not find wikitext textarea in HTML');
      return null;
    }

    // Decode HTML entities
    let wikitext = match[1];
    wikitext = wikitext
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, '&');

    return wikitext;
  } catch (error) {
    console.error(`✗ Failed to fetch: ${error.message}`);
    return null;
  }
}

const wikitext = await fetchWikiEditPage('Well of Corruption');

if (wikitext) {
  console.log('✓ Successfully fetched wikitext\n');
  console.log('First 1000 characters:');
  console.log('---');
  console.log(wikitext.substring(0, 1000));
  console.log('---\n');

  // Check for skill infobox
  if (wikitext.includes('{{Skill infobox')) {
    console.log('✓ Found {{Skill infobox');
  } else {
    console.log('✗ No {{Skill infobox found');
  }

  // Check for competitive split indicators
  if (wikitext.includes('recharge wvw') || wikitext.includes('recharge pvp')) {
    console.log('✓ Found mode-specific recharge values');
  } else {
    console.log('✗ No mode-specific recharge values');
  }
} else {
  console.log('✗ Failed to fetch wikitext');
}
