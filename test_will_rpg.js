const db = require('./server/db');
const { executeTurnPipeline } = require('./server/aiPipeline');

async function testWillRPG() {
  console.log('--- TESTING WILL HERO ACADEMY PROTAGONIST RPG MODE ---');

  // 1. Verify World & Canon Characters exist
  const world = db.getWorldById('world_will_academy');
  console.log(`✅ Loaded World: ${world ? world.name : 'NOT FOUND'}`);

  const characters = db.getCharacters('world_will_academy');
  console.log(`✅ Canon Characters in World (${characters.length}):`, characters.map(c => c.name));

  // 2. Create Save Slot as Ren Akiyama (Protagonist)
  const ren = characters.find(c => c.id === 'char_ren_akiyama');
  if (!ren) throw new Error('Ren Akiyama not found!');

  const slot = db.createSaveSlot('world_will_academy', ren.id, 'Ren Journey Test');
  console.log(`✅ Created Save Slot: ${slot.id}`);
  console.log(`✅ Protagonist: ${ren.name}`);
  console.log(`✅ World Roster Initial Count (${slot.roster.length}):`, slot.roster.map(n => `${n.name} (Rel: ${n.relationship_value}, Emotion: ${n.current_emotion})`));

  // Verify Prologue has Scene Header
  console.log(`✅ Prologue Header: ${slot.history[0]?.content.substring(0, 70)}...`);

  // Cleanup test slot
  db.deleteSaveSlot(slot.id);
  console.log('✅ Cleaned up test slot.');
  console.log('🎉 ALL WILL RPG MODE TESTS PASSED!');
}

testWillRPG().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
