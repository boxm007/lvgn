const db = require('../server/db');
const fs = require('fs');
const path = require('path');
const { initSeedData } = require('../server/seedData');

// 1. Reset Global Seed Characters with latest rich Billy Lore
const charsFile = path.join(__dirname, '..', 'data', 'characters.json');
const worldsFile = path.join(__dirname, '..', 'data', 'worlds.json');

console.log('--- RE-SYNCING WORLD & CHARACTER CANON ---');
// Empty database and re-seed from seedData.js
db.worlds = [];
db.characters = [];
initSeedData();

console.log('✅ Re-seeded worlds:', db.getWorlds().map(w => w.name));
console.log('✅ Re-seeded characters:', db.getCharacters().map(c => c.name));

// 2. Update existing WILL Academy save slots with full roster including updated Codex and notes
const savesDir = path.join(__dirname, '..', 'data', 'saves');
if (fs.existsSync(savesDir)) {
  const slots = fs.readdirSync(savesDir);
  slots.forEach(slotId => {
    const slot = db.getSaveSlotById(slotId);
    if (slot && slot.world_id === 'world_will_academy') {
      const willChars = db.getCharacters().filter(c => c.world_id === 'world_will_academy' && c.id !== slot.character_id);
      slot.roster = willChars.map(c => ({
        id: c.id,
        name: c.name,
        role: c.role || c.short_desc || '',
        avatar: c.avatar,
        short_desc: c.short_desc,
        relationship_value: c.dynamic_state?.relationship_value || (c.id === 'char_billy_ichika' ? 10 : 0),
        relationship_status: c.dynamic_state?.relationship_status || (c.id === 'char_billy_ichika' ? 'เพื่อนสนิทร่วมอุดมการณ์' : 'เป็นกลาง'),
        current_emotion: c.dynamic_state?.current_emotion || 'ปกติ',
        personality_tags: c.personality_tags || [],
        base_stats: c.static_profile?.base_stats || {},
        codex_notes: JSON.parse(JSON.stringify(c.codex_notes || [])),
        is_canon: true
      }));
      db.updateSaveSlot(slotId, slot);
      console.log('✅ Updated full roster for slot:', slotId, 'Roster count:', slot.roster.length);
    }
  });
}

console.log('🎉 SYNC COMPLETE!');
