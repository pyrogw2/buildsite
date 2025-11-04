#!/usr/bin/env node

import { scrapeSkillSplits } from './wiki-scraper.js';

const testSkill = {
  id: 10545,
  name: 'Well of Corruption',
};

console.log('Fetching wiki data for Well of Corruption...\n');

const splits = await scrapeSkillSplits(testSkill);

if (splits) {
  console.log('Raw wiki data:\n');
  console.log(JSON.stringify(splits, null, 2));
} else {
  console.log('No splits found');
}
