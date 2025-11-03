#!/bin/bash

cat > /tmp/complete-sigil-names.txt << 'EOF'
Superior Sigil of Accuracy
Superior Sigil of Force
Superior Sigil of Bursting
Superior Sigil of Malice
Superior Sigil of Concentration
Superior Sigil of Transference
Superior Sigil of Agony
Superior Sigil of Smoldering
Superior Sigil of Chilling
Superior Sigil of Hobbling
Superior Sigil of Venom
Superior Sigil of Demons
Superior Sigil of Peril
Superior Sigil of Debility
Superior Sigil of Paralyzation
Superior Sigil of Centaur Slaying
Superior Sigil of Demon Slaying
Superior Sigil of Destroyer Slaying
Superior Sigil of Sorrow
Superior Sigil of Elemental Slaying
Superior Sigil of Smothering
Superior Sigil of Ghost Slaying
Superior Sigil of Grawl Slaying
Superior Sigil of Hologram Slaying
Superior Sigil of Icebrood Slaying
Superior Sigil of Mad Scientists
Superior Sigil of Justice
Superior Sigil of Karka Slaying
Superior Sigil of Serpent Slaying
Superior Sigil of Dreams
Superior Sigil of the Night
Superior Sigil of Ogre Slaying
Superior Sigil of Wrath
Superior Sigil of Impact
Superior Sigil of Undead Slaying
Superior Sigil of Nullification
Superior Sigil of Purity
Superior Sigil of Frailty
Superior Sigil of Ice
Superior Sigil of Incapacitation
Superior Sigil of Air
Superior Sigil of Fire
Superior Sigil of Blood
Superior Sigil of Generosity
Superior Sigil of Rage
Superior Sigil of Strength
Superior Sigil of Water
Superior Sigil of Blight
Superior Sigil of Earth
Superior Sigil of Torment
Superior Sigil of Frenzy
Superior Sigil of Luck
Superior Sigil of Speed
Superior Sigil of Stamina
Superior Sigil of Bounty
Superior Sigil of Corruption
Superior Sigil of Cruelty
Superior Sigil of Benevolence
Superior Sigil of Life
Superior Sigil of Bloodlust
Superior Sigil of Perception
Superior Sigil of Momentum
Superior Sigil of the Stars
Superior Sigil of Agility
Superior Sigil of Battle
Superior Sigil of Cleansing
Superior Sigil of Doom
Superior Sigil of Energy
Superior Sigil of Geomancy
Superior Sigil of Hydromancy
Superior Sigil of Leeching
Superior Sigil of Mischief
Superior Sigil of Renewal
Superior Sigil of Vision
Superior Sigil of Absorption
Superior Sigil of Celerity
Superior Sigil of Draining
Superior Sigil of Rending
Superior Sigil of Restoration
Superior Sigil of Ruthlessness
Superior Sigil of Severance
EOF

echo "Extracting all 81 sigil IDs from wiki..."
echo "export const SIGIL_IDS = [" > /tmp/all_sigil_ids.txt

count=0
while IFS= read -r name; do
  url_name=$(echo "$name" | sed 's/ /_/g')
  wiki_url="https://wiki.guildwars2.com/wiki/${url_name}"
  id=$(curl -s "$wiki_url" | grep -oP 'api\.guildwars2\.com/v2/items\?ids=\K\d+' | head -n 1)

  if [ -n "$id" ]; then
    short_name=$(echo "$name" | sed 's/Superior Sigil of the //g' | sed 's/Superior Sigil of //g')
    echo "  $id, // $short_name" >> /tmp/all_sigil_ids.txt
    count=$((count + 1))
    echo "  [$count/81] Found: $name -> $id"
  else
    echo "  [$count/81] MISSING: $name"
  fi

  sleep 0.1
done < /tmp/complete-sigil-names.txt

echo "] as const;" >> /tmp/all_sigil_ids.txt
echo ""
echo "Complete! Found $count/81 sigils"
echo ""
cat /tmp/all_sigil_ids.txt
