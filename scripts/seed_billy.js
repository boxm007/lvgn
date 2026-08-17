const db = require('../server/db');
const fs = require('fs');
const path = require('path');

const chars = db.getCharacters();
const exists = chars.find(c => c.id === 'char_billy_ichika' || c.name.includes('บิลลี่'));

if (!exists) {
  const billy = db.createCharacter({
    id: 'char_billy_ichika',
    world_id: 'world_will_academy',
    name: 'บิลลี่ อิจิกะ (Billy Ichika)',
    short_desc: 'เด็กหนุ่มอัจฉริยะวิศวกรรม ผู้ไม่มี Will และปฏิเสธที่จะยอมแพ้ สวมใส่และพัฒนา Combat Exoskeleton (โครงสร้างเสริมแรงกลไก) ด้วยการ Iteration เพื่อพิสูจน์ว่ามนุษย์ธรรมดาที่ไม่มีพรสวรรค์ก็เป็นวีรชนได้',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=600&auto=format&fit=crop',
    personality_tags: ['วิศวกรอัจฉริยะ', 'ไม่ยอมแพ้', 'บ้าพลังสร้างของ', 'จริงจังกับสิ่งที่ทำ', 'เพื่อนแท้'],
    opening_prologue: 'เสียงประกายไฟจากการเชื่อมโลหะสว่างวาบ ‘ชี่... แปรี๊ยะ!’ กลิ่นโอโซนและควันไหม้ของแผงวงจรลอยคลุ้งอยู่ในห้องปฏิบัติการกลไกหลังอาคารเรียน บนโต๊ะทำงานที่เต็มไปด้วยพิมพ์เขียว ประแจ และชิ้นส่วนมอเตอร์ไฮดรอลิก เด็กหนุ่มสวมแว่นนิรภัยเปื้อนคราบน้ำมัน บิลลี่ อิจิกะ กำลังขบฟันแน่นขณะขันน็อตข้อต่อแขนกล Combat Exoskeleton เข้ากับแขนตัวเอง\n\n“บ้าเอ๊ย... เซอร์โวมอเตอร์รับแรงบิดเกิน 400 นิวตันเมตรไม่ได้อีกแล้วเหรอวะ...” บิลลี่สบถพึมพำกับตัวเองอย่างหัวเสีย ก่อนจะถอดแว่นนิรภัยออกเผยให้เห็นขอบตาที่คล้ำจากการอดนอน เมื่อเขาเหลือบเห็นคุณยืนอยู่หน้าประตู เขาก็กระตุกยิ้มอย่างไม่ยอมจำนน\n\n“ไง เรน! มาดูความล้มเหลวครั้งที่สี่สิบแปดของฉันเหรอ?” เขาเคาะเกราะแขนกลที่ส่งเสียงดังกิ๊ง “หัวเราะได้นะเว้ย... แต่รอบที่ห้าสิบ มันจะชกทะลวงกำแพงหินคอนกรีตได้แน่นอน คนไม่มี Will อย่างพวกเรา จะยอมแพ้แค่นี้ไม่ได้หรอกจริงไหม?”',
    static_profile: {
      history: 'เด็กหนุ่มที่ไม่มี Will ตั้งแต่เกิด และปฏิเสธจะยอมรับว่าตัวเอง "แพ้" เพราะไม่มีพรสวรรค์ เขาจึงแก้ปัญหาด้วย Engineering พัฒนา Combat Exoskeleton ขึ้นมาเองจากศูนย์ พระเอกกับบิลลี่สนิทกันมากเพราะมีความรู้สึกร่วมว่าไม่ได้เกิดมาเก่ง แต่บิลลี่เลือกตอบโจทย์ด้วยเทคโนโลยีและวิศวกรรม',
      base_stats: { strength: 7, agility: 10, intelligence: 17, charisma: 11, perception: 16 }
    },
    dynamic_state: { relationship_value: 10, relationship_status: 'เพื่อนสนิทร่วมอุดมการณ์', current_emotion: 'มุ่งมั่นสร้างนวัตกรรมใหม่' },
    initial_inventory: ['ประแจเลื่อนไฮดรอลิก', 'แว่นตานิรภัยช่างกล', 'แผงวงจรควบคุมเซอร์โวมอเตอร์', 'สมุดพิมพ์เขียว Exoskeleton Mk.I'],
    codex_notes: [
      { id: 'sec_billy_1', title: 'ปรัชญา Iteration', content: 'คนอื่นมี Will Training — บิลลี่มี Iteration (สร้าง -> พัง -> วิเคราะห์ -> แก้ -> สร้างใหม่) บิลลี่ไม่ได้ชนะเพราะพรสวรรค์ แต่ชนะเพราะไม่หยุดแก้ปัญหา', hint: 'เมื่อร่วมมือกันทดสอบเกราะกลไกในห้องแล็บ', unlocked: false },
      { id: 'sec_billy_2', title: 'กลไก Combat Exoskeleton', content: 'ชุดเกราะเสริมแรงกลไก มีขีดจำกัดจากแบตเตอรี่และความร้อนสะสม (ทำงานเหมือน Stamina เฉพาะของชุด) ซึ่งจะพัฒนาดีขึ้นเรื่อยๆ ตามเนื้อเรื่อง', hint: 'เมื่อช่วยเหลือบิลลี่หาชิ้นส่วนมอเตอร์หรือระบายความร้อน', unlocked: false }
    ],
    creator: 'system'
  });
  console.log('✅ Created character Billy Ichika in Database:', billy.name);
} else {
  console.log('Billy already in character db');
}

// Update all WILL Academy save slots
const savesDir = path.join(__dirname, '..', 'data', 'saves');
if (fs.existsSync(savesDir)) {
  const slots = fs.readdirSync(savesDir);
  slots.forEach(slotId => {
    const slot = db.getSaveSlotById(slotId);
    if (slot && slot.world_id === 'world_will_academy') {
      if (!slot.roster) slot.roster = [];
      const hasBilly = slot.roster.some(r => r.name.includes('บิลลี่'));
      if (!hasBilly && slot.character_id !== 'char_billy_ichika') {
        slot.roster.push({
          id: 'char_billy_ichika',
          name: 'บิลลี่ อิจิกะ (Billy Ichika)',
          role: 'วิศวกรผู้พัฒนา Combat Exoskeleton (ไร้ Will)',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=600&auto=format&fit=crop',
          short_desc: 'เพื่อนสนิทของเรน ผู้แก้ปัญหาการไร้ Will ด้วยวิศวกรรมและการ Iteration',
          relationship_value: 10,
          relationship_status: 'เพื่อนสนิทร่วมอุดมการณ์',
          current_emotion: 'มุ่งมั่นสร้างนวัตกรรมใหม่',
          personality_tags: ['วิศวกรอัจฉริยะ', 'ไม่ยอมแพ้', 'เพื่อนแท้'],
          base_stats: { strength: 7, agility: 10, intelligence: 17, charisma: 11, perception: 16 },
          codex_notes: [
            { id: 'sec_billy_1', title: 'ปรัชญา Iteration', content: 'คนอื่นมี Will Training — บิลลี่มี Iteration ชนะเพราะไม่หยุดแก้ปัญหา', hint: 'ร่วมทดสอบเกราะกลไก', unlocked: false }
          ],
          is_canon: true
        });
        db.updateSaveSlot(slotId, slot);
        console.log('✅ Added Billy to roster of save slot:', slotId);
      }
    }
  });
}
