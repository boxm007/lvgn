const { executeTurnPipeline } = require('./server/aiPipeline');
const db = require('./server/db');

async function testInteraction() {
  const slot = db.getSaveSlotById('slot_1786950639985_0gax');
  console.log('Testing turn on active slot:', slot.id);
  console.log('Slot World Roster Chars:', slot.roster.map(r => r.name));

  const startTime = Date.now();
  const res = await executeTurnPipeline({
    slotId: slot.id,
    playerInput: {
      type: 'Do',
      text: 'เดินไปหาบิลลี่ที่ห้องปฏิบัติการกลไก แล้วถามว่าชุด Combat Exoskeleton ไปถึงไหนแล้ว'
    }
  });

  const duration = Date.now() - startTime;
  console.log('--- TURN RESULT ---');
  console.log('Duration:', duration, 'ms');
  console.log('Fate Roll:', res.fateResult.badgeText);
  console.log('AI Turn Narration:\n', res.aiTurn.content);
  console.log('Narration Body Length:', res.aiTurn.content.length);

  const updatedSlot = db.getSaveSlotById(slot.id);
  const billyInRoster = updatedSlot.roster.find(r => r.name.includes('บิลลี่'));
  console.log('Billy Relationship:', billyInRoster?.relationship_value, '| Status:', billyInRoster?.relationship_status);
}

testInteraction().catch(console.error);
