const { callDeepSeek } = require('./server/aiPipeline');
const db = require('./server/db');

async function testSinglePass() {
  const willWorld = db.getWorlds().find(w => w.id === 'world_will_academy');
  const allChars = db.getCharacters();
  const willChars = allChars.filter(c => c.world_id === willWorld.id);
  const ren = willChars.find(c => c.name.includes('เรน'));
  const ina = willChars.find(c => c.name.includes('อินะ'));

  const systemPrompt = `คุณคือนักเขียนนิยาย RPG ระดับปรมาจารย์ (Master Storyteller) สำหรับ Long Voyage
หน้าที่ของคุณคือเล่าเรื่องราวการผจญภัยในโลกของนิยาย โดยให้ผู้เล่นสวมบทบาทเป็นตัวเอก ${ren.name}
เขียนบรรยายเป็นภาษาไทยที่สละสลวย มีชีวิตชีวา แสดงออกผ่านภาษากาย คำพูด และอารมณ์ของตัวละครในฉากอย่างสมจริง

กฎสำคัญ:
1. เริ่มต้นบรรทัดแรกด้วยแท็กสถานะฉากเสมอ: 📍 **[ วันที่ 1 | เวลา 08:35 น. | สถานที่: ${willWorld.name} ]**
2. บรรยาย 2-3 ย่อหน้าอย่างต่อเนื่อง ดำเนินเรื่องต่อจากการกระทำของผู้เล่นและผลลัพธ์ของเหตุการณ์
3. ใส่บทสนทนาในเครื่องหมายคำพูด "..." เสมอ
4. ห้ามคืนค่าว่างเด็ดขาด`;

  const userPrompt = `[ข้อมูลโลก]: ${willWorld.name} - ${willWorld.description}
[ตัวเอกที่คุณกำลังบรรยาย]: ${ren.name} (${ren.short_desc})
[ตัวละครในฉาก]: ${ina.name} (${ina.short_desc} - นิสัย: ${ina.personality_tags.join(', ')})
[ผลการทอยเต๋า D20]: D20 (14) + [CHA +2] = 16 (สำเร็จอย่างงดงาม)
[การกระทำของผู้เล่น]: ผู้เล่น [Do]: เดินเข้าไปทักทายอินะที่กำลังฝึกซ้อมอยู่ริมลาน แล้วยิ้มให้อย่างเป็นมิตร

จงเริ่มเขียนบรรยายตอบสนองต่อการกระทำนี้ทันที:`;

  const startTime = Date.now();
  const res = await callDeepSeek({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.85,
    max_tokens: 600
  });

  console.log('Single-Pass Execution Time:', Date.now() - startTime, 'ms');
  console.log('Result:\n', res);
  console.log('Length:', res.length);
}
testSinglePass();
