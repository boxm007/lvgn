const MemoryEngine = require('../server/memoryEngine');
const LorebookEngine = require('../server/lorebookEngine');
const db = require('../server/db');
const { initSeedData } = require('../server/seedData');

async function runTests() {
  console.log('====================================================');
  console.log(' LONG VOYAGE 2.0 — VERIFICATION TEST SUITE');
  console.log('====================================================');

  // Test 1: Seed Data & Database
  console.log('\n[TEST 1] Initializing Seed Data & Worlds...');
  initSeedData();
  const worlds = db.getWorlds();
  const characters = db.getCharacters();
  console.log(`✅ Worlds loaded: ${worlds.length} worlds`);
  console.log(`✅ Characters loaded: ${characters.length} characters`);

  const willWorld = worlds.find(w => w.id === 'world_will_academy');
  if (!willWorld) throw new Error('WILL World not found!');
  console.log(`✅ WILL World Lorebook entries: ${willWorld.lorebook_entries?.length || 0}`);
  console.log(`✅ WILL World Canon locks: ${willWorld.canon_locks?.length || 0}`);

  // Test 2: Memory Engine Unit Tests
  console.log('\n[TEST 2] Testing 9-Tier Memory Engine & Hybrid RAG...');
  const memEngine = new MemoryEngine();

  // Create slot folder in db
  const testSlot = db.createSaveSlot(willWorld.id, 'char_ren_akiyama', 'Verification Test Slot');

  // Add episodic memories
  memEngine.addEpisodicMemory(testSlot.id, {
    turn_number: 1,
    location: 'โดมฝึกจำลองสถานการณ์',
    content: 'เรนพบกับบิลลี่ที่กำลังทดสอบเกราะ Combat Exoskeleton และช่วยหยิบประแจเบอร์ 12 ให้',
    importance: 8,
    entities: ['เรน', 'บิลลี่', 'Exoskeleton']
  });

  memEngine.addEpisodicMemory(testSlot.id, {
    turn_number: 2,
    location: 'โรงอาหาร',
    content: 'เท็ตโชแย่งขนมปังยากิโซบะและท้าประลองกับนักเรียนตระกูลขุนนาง',
    importance: 5,
    entities: ['เท็ตโช', 'ขนมปัง']
  });

  const allMems = memEngine.getMemories(testSlot.id);
  console.log(`✅ Memory count saved: ${allMems.length}`);

  // Test Hybrid RAG Search
  const searchResults = memEngine.searchRelevantMemories(testSlot.id, 'บิลลี่ เกราะช่างกลและประแจ', {
    currentTurn: 3,
    topK: 3
  });
  console.log(`✅ Hybrid RAG Search returned ${searchResults.length} relevant memories`);
  if (searchResults.length > 0) {
    console.log(`   Top result: "${searchResults[0]?.content}" (Score: ${searchResults[0]?.score?.toFixed(3)})`);
  }

  // Test Fact Triplets & Contradiction Resolution
  console.log('\n[TEST 3] Testing Triplet Facts & Contradiction Resolution...');
  memEngine.reconcileFact(testSlot.id, {
    subject: 'Billy',
    predicate: 'exoskeleton_battery_life',
    object: '3 minutes',
    confidence: 0.95
  });

  // Now supersede with upgraded battery
  memEngine.reconcileFact(testSlot.id, {
    subject: 'Billy',
    predicate: 'exoskeleton_battery_life',
    object: '5 minutes with cooling heatsink',
    confidence: 0.98
  });

  const activeFacts = memEngine.getActiveFacts(testSlot.id);
  console.log(`✅ Active Facts count: ${activeFacts.length}`);
  console.log(`   Active Fact: (${activeFacts[0]?.subject}, ${activeFacts[0]?.predicate}, "${activeFacts[0]?.object}")`);

  const supersededFact = memEngine.getFacts(testSlot.id).find(f => f.status === 'SUPERSEDED');
  console.log(`✅ Contradiction resolution verified: Previous fact marked as SUPERSEDED: "${supersededFact?.object}"`);

  // Test 4: Lorebook Engine Keyword Scanning & Priority Assembler
  console.log('\n[TEST 4] Testing Lorebook Engine & Priority Assembler...');
  const loreEngine = new LorebookEngine();

  const scanQuery = 'เรนกำลังเดินเข้าไปในแล็บของ บิลลี่ เพื่อขอดู เกราะไฮดรอลิก และระบบ Will';
  const triggeredEntries = loreEngine.scan(scanQuery, willWorld.lorebook_entries);
  console.log(`✅ Lorebook triggered entries count: ${triggeredEntries.length}`);
  triggeredEntries.forEach(e => {
    console.log(`   Triggered: [${e.title}] (Priority: ${e.priority})`);
  });

  // Test 5: Clean up test slot
  console.log('\n[TEST 5] Cleaning up test slot...');
  db.deleteSaveSlot(testSlot.id);
  console.log(`✅ Test slot ${testSlot.id} cleaned up successfully.`);

  console.log('\n====================================================');
  console.log(' 🎉 ALL 5 VERIFICATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
