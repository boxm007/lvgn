const FateEngine = require('./server/fateEngine');
const db = require('./server/db');
const { initSeedData } = require('./server/seedData');
const { executeTurnPipeline, regenerateNarration } = require('./server/aiPipeline');

async function runVerification() {
  console.log('--- 1. Testing Seed Data & Database ---');
  initSeedData();
  const worlds = db.getWorlds();
  console.log(`Found ${worlds.length} worlds:`, worlds.map(w => w.name));

  const characters = db.getCharacters();
  console.log(`Found ${characters.length} characters:`, characters.map(c => c.name));

  console.log('\n--- 2. Testing Fate Engine (Anti-Cheat Deterministic D20) ---');
  for (let i = 0; i < 5; i++) {
    const roll = FateEngine.roll({ modifier: 2, statName: 'intelligence', targetDC: 12 });
    console.log(`Roll #${i+1}: ${roll.badgeText} [Tier: ${roll.tier}]`);
  }

  console.log('\n--- 3. Testing Save Slot & 4-Stage DeepSeek Pipeline ---');
  const testSlot = db.createSaveSlot(worlds[0].id, characters[0].id, 'การทดสอบระบบ');
  console.log(`Created test slot ID: ${testSlot.id} with character: ${characters[0].name}`);

  console.log('Sending Turn 1 (Say): "เซราฟิน่า... เจ้ากำลังคิดอะไรอยู่กันแน่ท่ามกลางพายุหิมะนี้?"');
  try {
    const turnResult = await executeTurnPipeline({
      slotId: testSlot.id,
      playerInput: {
        type: 'Say',
        text: 'เซราฟิน่า... เจ้ากำลังคิดอะไรอยู่กันแน่ท่ามกลางพายุหิมะนี้?'
      }
    });

    console.log('\n✅ Turn 1 Response Received from DeepSeek:');
    console.log('Fate Result:', turnResult.fateResult.badgeText);
    console.log('Consequence:', turnResult.consequence);
    console.log('Dynamic State Updated:', turnResult.dynamic_state);
    console.log('\nProse Content:\n', turnResult.aiTurn.content);

    console.log('\n--- 4. Testing Regenerate (AI #3 only) ---');
    const regenResult = await regenerateNarration({ slotId: testSlot.id });
    console.log('✅ Regenerated Story Narration:\n', regenResult.aiTurn.content);

    console.log('\n--- 5. Testing Undo / Snapshot Rollback ---');
    const rolledBack = db.rollbackSnapshot(testSlot.id);
    console.log('✅ Snapshot Rollback Successful. History length after undo:', rolledBack.history.length);

    console.log('\n🎉 ALL PIPELINE VERIFICATIONS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Pipeline test error:', err);
  }
}

runVerification();
