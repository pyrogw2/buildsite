#!/bin/bash

cat > /tmp/complete-rune-names.txt << 'EOF'
Superior Rune of Fireworks
Superior Rune of Surging
Superior Rune of the Pack
Superior Rune of the Citadel
Superior Rune of Strength
Superior Rune of the Privateer
Superior Rune of Hoelbrak
Superior Rune of the Fire
Superior Rune of the Centaur
Superior Rune of the Mad King
Superior Rune of the Flame Legion
Superior Rune of the Baelfire
Superior Rune of the Elementalist
Superior Rune of the Scholar
Superior Rune of the Deadeye
Superior Rune of the Ogre
Superior Rune of Infiltration
Superior Rune of the Spellbreaker
Superior Rune of the Mesmer
Superior Rune of the Chronomancer
Superior Rune of the Reaper
Superior Rune of the Daredevil
Superior Rune of the Scrapper
Superior Rune of the Brawler
Superior Rune of the Cavalier
Superior Rune of Vampirism
Superior Rune of the Holosmith
Superior Rune of Lyssa
Superior Rune of Rata Sum
Superior Rune of the Thief
Superior Rune of the Eagle
Superior Rune of the Ranger
Superior Rune of the Herald
Superior Rune of Durability
Superior Rune of the Earth
Superior Rune of Svanir
Superior Rune of the Forgeman
Superior Rune of the Engineer
Superior Rune of Melandru
Superior Rune of the Dolyak
Superior Rune of Mercy
Superior Rune of the Defender
Superior Rune of the Guardian
Superior Rune of Resistance
Superior Rune of Snowfall
Superior Rune of Sanctuary
Superior Rune of Radiance
Superior Rune of Speed
Superior Rune of the Lich
Superior Rune of the Ice
Superior Rune of the Wurm
Superior Rune of the Warrior
Superior Rune of the Trooper
Superior Rune of Exuberance
Superior Rune of the Aristocracy
Superior Rune of the Firebrand
Superior Rune of the Trapper
Superior Rune of the Nightmare
Superior Rune of the Krait
Superior Rune of Balthazar
Superior Rune of Grenth
Superior Rune of Perplexity
Superior Rune of Thorns
Superior Rune of the Afflicted
Superior Rune of Tormenting
Superior Rune of the Renegade
Superior Rune of the Berserker
Superior Rune of the Soulbeast
Superior Rune of the Adventurer
Superior Rune of the Undead
Superior Rune of the Mirage
Superior Rune of the Necromancer
Superior Rune of Scavenging
Superior Rune of Antitoxin
Superior Rune of the Sunless
Superior Rune of Orr
Superior Rune of Rage
Superior Rune of the Air
Superior Rune of Evasion
Superior Rune of the Dragonhunter
Superior Rune of the Golemancer
Superior Rune of the Rebirth
Superior Rune of Altruism
Superior Rune of the Monk
Superior Rune of the Water
Superior Rune of the Grove
Superior Rune of Dwayna
Superior Rune of the Scourge
Superior Rune of the Druid
Superior Rune of the Flock
Superior Rune of Nature's Bounty
Superior Rune of the Traveler
Superior Rune of Leadership
Superior Rune of the Tempest
Superior Rune of the Weaver
Superior Rune of Divinity
Superior Rune of the Revenant
Superior Rune of the Zephyrite
Superior Rune of the Stars
EOF

echo "Extracting all 99 rune IDs from wiki..."
echo "export const RUNE_IDS = [" > /tmp/all_rune_ids.txt

count=0
while IFS= read -r name; do
  url_name=$(echo "$name" | sed 's/ /_/g')
  wiki_url="https://wiki.guildwars2.com/wiki/${url_name}"
  id=$(curl -s "$wiki_url" | grep -oP 'api\.guildwars2\.com/v2/items\?ids=\K\d+' | head -n 1)

  if [ -n "$id" ]; then
    short_name=$(echo "$name" | sed 's/Superior Rune of the //g' | sed 's/Superior Rune of //g')
    echo "  $id, // $short_name" >> /tmp/all_rune_ids.txt
    count=$((count + 1))
    echo "  [$count/99] Found: $name -> $id"
  else
    echo "  [$count/99] MISSING: $name"
  fi

  sleep 0.1
done < /tmp/complete-rune-names.txt

echo "] as const;" >> /tmp/all_rune_ids.txt
echo ""
echo "Complete! Found $count/99 runes"
echo ""
cat /tmp/all_rune_ids.txt
