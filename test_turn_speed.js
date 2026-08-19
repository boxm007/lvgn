const { executeTurnPipeline } = require('./server/aiPipeline');
const db = require('./server/db');

async function benchmark() {
  const willWorld = db.getWorlds().find(w => w.id === 'world_will_academy') || db.getWorlds()[0];
  const allChars = db.getCharacters();
  const willChars = allChars.filter(c => c.world_id === willWorld.id);
  const ren = willChars.find(c => c.name.includes('เรน')) || willChars[0];

  const slot = db.createSaveSlot({
    world_id: willWorld.id,
    character_id: ren.id,
    slot_name: 'Benchmark Slot'
  });

  console.log('Testing turn on slot:', slot.id);
  const startTime = Date.now();

  try {
    const res = await executeTurnPipeline({
      slotId: slot.id,
      playerInput: {
        type: 'Do',
        text: 'เดินเข้าไปทักทายอินะที่กำลังฝึกซ้อมอยู่ริมลาน'
      }
    });

    const elapsed = Date.now() - startTime;
    console.log('Turn Execution Time:', elapsed, 'ms');
    console.log('AI Turn Narration:');
    console.log(res.aiTurn.content);
    console.log('Narration Length:', res.aiTurn.content.length);
  } catch (err) {
    console.error('Turn Error:', err);
  } finally {
    db.deleteSaveSlot(slot.id);
  }
}

benchmark();
