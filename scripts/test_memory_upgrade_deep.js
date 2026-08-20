const MemoryEngine = require('../server/memoryEngine');
const db = require('../server/db');

async function testDeepUpgrade() {
  console.log('===========================================================');
  console.log('🧪 DEEP AUDIT: P0, P1, P2 MEMORY UPGRADE VERIFICATION TEST');
  console.log('===========================================================');

  const memEngine = new MemoryEngine();
  const testSlot = db.createSaveSlot('world_will_academy', 'char_ren_akiyama', 'Deep Upgrade Test Slot');
  const slotId = testSlot.id;

  try {
    // ------------------------------------------------------------------------
    // [TEST 1: P0 Entity Alias Resolution]
    // ------------------------------------------------------------------------
    console.log('\n[1. P0 Entity Alias Resolution]');
    memEngine.registerAlias(slotId, 'เรน อากิยามะ', 'Ren');
    memEngine.registerAlias(slotId, 'เรน อากิยามะ', 'เด็กหนุ่มผมเงิน');
    memEngine.registerAlias(slotId, 'บิลลี่ อิจิกะ', 'Billy');

    const aliases = memEngine.getAliases(slotId);
    console.log('✅ Registered Aliases:', aliases);
    if (!aliases['เรน อากิยามะ'] || !aliases['เรน อากิยามะ'].includes('Ren')) {
      throw new Error('Alias registration failed!');
    }

    const resolvedRen = memEngine.resolveEntity(slotId, 'Ren');
    const resolvedBilly = memEngine.resolveEntity(slotId, 'Billy');
    console.log(`✅ "Ren" resolved to -> "${resolvedRen}"`);
    console.log(`✅ "Billy" resolved to -> "${resolvedBilly}"`);
    if (resolvedRen !== 'เรน อากิยามะ' || resolvedBilly !== 'บิลลี่ อิจิกะ') {
      throw new Error('Entity resolution mapping failed!');
    }

    // ------------------------------------------------------------------------
    // [TEST 2: P1 Temporal Metadata & Provenance on Episodic Memories]
    // ------------------------------------------------------------------------
    console.log('\n[2. P1 Temporal Metadata & Provenance on Episodic Memories]');
    const mem1 = memEngine.addEpisodicMemory(slotId, {
      turn_number: 1,
      content: 'เรนพบกับบิลลี่ในห้องทดลองตอนเช้า',
      importance: 7,
      emotional_valence: 'positive',
      entities: ['Ren', 'Billy'],
      location: 'ห้องทดลองวิศวกรรม',
      game_day: 1,
      game_time: '08:30',
      game_location: 'ห้องทดลองวิศวกรรม',
      source_turn_ids: ['msg_001_u', 'msg_001_a'],
      created_by: 'ai_extractor'
    });

    console.log('✅ Saved Episodic Memory with Temporal & Provenance:', {
      id: mem1.memory_id,
      day: mem1.game_day,
      time: mem1.game_time,
      location: mem1.game_location,
      source_turn_ids: mem1.source_turn_ids,
      created_by: mem1.created_by
    });

    if (mem1.game_day !== 1 || mem1.game_time !== '08:30' || mem1.created_by !== 'ai_extractor') {
      throw new Error('Temporal metadata / provenance missing from memory!');
    }

    // ------------------------------------------------------------------------
    // [TEST 3: P0 Fact Triplet Reconciliation with Alias Resolution & Provenance]
    // ------------------------------------------------------------------------
    console.log('\n[3. P0 Fact Triplet with Alias Resolution & P1 Temporal Metadata]');
    // Note: using alias "Ren" instead of canonical name
    const fact1 = memEngine.reconcileFact(slotId, {
      subject: 'Ren',
      predicate: 'will_awakening_status',
      object: 'unawakened',
      confidence: 0.95,
      turn_number: 1,
      game_day: 1,
      game_time: '08:30',
      game_location: 'ห้องทดลอง',
      source_turn_ids: ['msg_001_u', 'msg_001_a'],
      created_by: 'ai_extractor'
    });

    console.log(`✅ Fact Subject automatically normalized: "${fact1.subject}" (Canonical: เรน อากิยามะ)`);
    if (fact1.subject !== 'เรน อากิยามะ') {
      throw new Error('Fact subject was not resolved to canonical name!');
    }

    // Now supersede using another alias
    const fact2 = memEngine.reconcileFact(slotId, {
      subject: 'เด็กหนุ่มผมเงิน',
      predicate: 'will_awakening_status',
      object: 'awakened_wind_manipulation',
      confidence: 0.98,
      turn_number: 3,
      game_day: 2,
      game_time: '14:00',
      game_location: 'ลานประลอง',
      source_turn_ids: ['msg_003_u', 'msg_003_a'],
      created_by: 'ai_extractor'
    });

    console.log(`✅ Contradiction reconciled across different aliases: "${fact2.object}" supersedes fact ${fact2.supersedes}`);
    const activeFacts = memEngine.getActiveFacts(slotId);
    console.log(`✅ Active Facts count: ${activeFacts.length}`);
    if (activeFacts.length !== 1 || activeFacts[0].object !== 'awakened_wind_manipulation') {
      throw new Error('Contradiction supersession across aliases failed!');
    }

    // ------------------------------------------------------------------------
    // [TEST 4: P1 Progressive Fact Injection]
    // ------------------------------------------------------------------------
    console.log('\n[4. P1 Progressive Fact Injection]');
    // Add 12 diverse facts
    for (let i = 1; i <= 12; i++) {
      memEngine.reconcileFact(slotId, {
        subject: `NPC_${i}`,
        predicate: `skill_${i}`,
        object: `special_move_${i}`,
        confidence: i <= 3 ? 0.95 : 0.6, // first 3 are canonical high-confidence
        turn_number: 2
      });
    }

    const relevantFacts = memEngine.getRelevantFacts(slotId, 'special_move_5 and skill_5', { topK: 5 });
    console.log(`✅ Progressive Fact Injection retrieved: ${relevantFacts.length} facts (budget capped)`);
    if (relevantFacts.length > 5) {
      throw new Error('Progressive fact injection exceeded topK budget!');
    }

    // ------------------------------------------------------------------------
    // [TEST 5: P1 Soft-Delete]
    // ------------------------------------------------------------------------
    console.log('\n[5. P1 Soft-Delete Verification]');
    memEngine.deleteMemory(slotId, mem1.memory_id);
    const allMemsAfterDel = memEngine.getMemories(slotId);
    const deletedMem = allMemsAfterDel.find(m => m.memory_id === mem1.memory_id);
    console.log(`✅ Memory status after soft-delete: "${deletedMem.status}" (deleted_at: ${deletedMem.deleted_at})`);
    
    // Ensure deleted memory is excluded from active search
    const activeMems = memEngine.searchRelevantMemories(slotId, 'เรน บิลลี่');
    console.log(`✅ Active search result count: ${activeMems.length} (Soft-deleted memory correctly excluded)`);
    if (activeMems.length !== 0 || deletedMem.status !== 'DELETED') {
      throw new Error('Soft delete verification failed!');
    }

    // ------------------------------------------------------------------------
    // [TEST 6: P1 Summary Versioning]
    // ------------------------------------------------------------------------
    console.log('\n[6. P1 Summary Versioning]');
    memEngine.pushSummaryVersion(slotId, 'สรุปเทิร์นที่ 1-8: เรนเข้าเรียนและพบกับบิลลี่');
    memEngine.pushSummaryVersion(slotId, 'สรุปเทิร์นที่ 9-16: เรนสามารถปลุกพลัง Will สายลมได้สำเร็จ');
    const summaryHist = memEngine.getSummaryHistory(slotId);
    console.log(`✅ Summary History versions stored: ${summaryHist.length}`);
    console.log('   Latest archived summary:', summaryHist[summaryHist.length - 1]?.summary);
    if (summaryHist.length !== 2) {
      throw new Error('Summary versioning history count mismatch!');
    }

    // ------------------------------------------------------------------------
    // [TEST 7: P2 Retrieval Debug Logging]
    // ------------------------------------------------------------------------
    console.log('\n[7. P2 Retrieval Debug Logging]');
    // Add a fresh active memory
    const activeMem = memEngine.addEpisodicMemory(slotId, {
      turn_number: 10,
      content: 'บิลลี่ส่งมอบอุปกรณ์แปลงสัญญาณพลังงานให้เรนนำไปใช้ทดสอบ',
      importance: 9,
      entities: ['Billy', 'Ren']
    });

    const searchWithDebug = memEngine.searchRelevantMemories(slotId, 'บิลลี่ อุปกรณ์แปลงสัญญาณ', 10, { topK: 1 });
    console.log(`✅ Retrieval Debug Object:`, searchWithDebug[0]?.debug);
    if (!searchWithDebug[0]?.debug || typeof searchWithDebug[0]?.debug?.totalScore !== 'number') {
      throw new Error('Retrieval debug metadata missing!');
    }

    // ------------------------------------------------------------------------
    // [TEST 8: P2 Relationship Facts Sync]
    // ------------------------------------------------------------------------
    console.log('\n[8. P2 Relationship Facts Sync]');
    memEngine.syncRelationshipFact(slotId, 'บิลลี่ อิจิกะ', 'สนิทสนม', 25, 10, { day: 2, time: '16:00', location: 'โรงอาหาร' });
    const relFacts = memEngine.getActiveFacts(slotId, 'บิลลี่ อิจิกะ');
    const relFact = relFacts.find(f => f.predicate === 'relationship_with_player');
    console.log(`✅ Synced Relationship Fact: (${relFact?.subject}, ${relFact?.predicate}, "${relFact?.object}")`);
    if (!relFact || relFact.object !== 'สนิทสนม (ค่า: 25)') {
      throw new Error('Relationship fact sync failed!');
    }

    // ------------------------------------------------------------------------
    // [TEST 9: P2 Memory Importance Decay]
    // ------------------------------------------------------------------------
    console.log('\n[9. P2 Memory Importance Decay]');
    const oldMem = memEngine.addEpisodicMemory(slotId, {
      turn_number: 1, // 49 turns ago
      content: 'เดินผ่านทางเดินเฉยๆ ไม่มีอะไรเกิดขึ้น',
      importance: 2
    });
    console.log(`   Initial importance of old memory: ${oldMem.importance}`);
    memEngine.applyImportanceDecay(slotId, 50); // currentTurn = 50
    const decayedMems = memEngine.getMemories(slotId);
    const updatedOldMem = decayedMems.find(m => m.memory_id === oldMem.memory_id);
    console.log(`✅ Decayed importance of old memory: ${updatedOldMem.importance} (reduced from 2 to 1)`);
    if (updatedOldMem.importance >= 2) {
      throw new Error('Memory importance decay was not applied!');
    }

    console.log('\n===========================================================');
    console.log('🎉 ALL P0, P1, P2 MEMORY AUDIT & UPGRADE TESTS PASSED 100%!');
    console.log('===========================================================');

  } finally {
    // Cleanup
    db.deleteSaveSlot(slotId);
    console.log(`🧹 Cleaned up test slot ${slotId}`);
  }
}

testDeepUpgrade().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
