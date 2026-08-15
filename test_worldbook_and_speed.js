const { analyzeWorldbookContent, generateOpeningPrologue } = require('./server/aiPipeline');
const db = require('./server/db');

async function testNewFeatures() {
  console.log('--- 1. Testing AI Prologue Generator ---');
  try {
    const prologue = await generateOpeningPrologue({
      worldName: 'หุบเขาสายหมอกนิรันดร์',
      worldDesc: 'ดินแดนลี้ลับที่เต็มไปด้วยสัตว์อสูรและพืชพรรณเวทมนตร์',
      characterName: 'ลิเลียน (Lilian)',
      charDesc: 'นักล่าสมุนไพรผู้ระแวดระวังและชำนาญการใช้ธนูอาบยาพิษ',
      charPersonality: ['ระแวง', 'คล่องแคล่ว', 'แอบใจดี', 'รักธรรมชาติ']
    });
    console.log('✅ Generated Prologue:\n', prologue);
  } catch (err) {
    console.error('❌ Prologue Gen error:', err.message);
  }

  console.log('\n--- 2. Testing Worldbook / Lorebook Auto-Analyzer ---');
  const sampleLorebook = `
  World: มหานครนิว-โอลิมปัส 2150 (Cyberpunk-Mythology)
  Overview: เมืองที่เหล่าทวยเทพกรีกกลายเป็นบอร์ดบริหารบรรษัทข้ามชาติ ผู้คนใช้ไซเบอร์เนติกส์สายฟ้าและน้ำยาโอมิกาส์เพื่อเอาชีวิตรอดในสลัมชั้นล่าง
  Factions: ซุส อินดัสตรีส์, เฮเดส อันเดอร์กราวด์, อธีน่า ซิเคียวริตี้
  Main Character: อธีน่า (Athena v9) - AI แอนดรอยด์ผู้พิทักษ์หอสมุดข้อมูลลับ มีดาบเลเซอร์และโล่เอจิส
  Personality: ฉลาดเป็นกรด, เย็นชา, ยึดมั่นในความจริง, กำลังตั้งคำถามถึงจิตวิญญาณตนเอง
  Secret: เธอรู้รหัสปิดระบบแม่ของซุส แต่ถูกล็อกไว้ในหน่วยความจำลึก
  `;

  try {
    const extracted = await analyzeWorldbookContent(sampleLorebook);
    console.log('✅ Extracted Worldbook Data Structure:');
    console.log('World Name:', extracted.world?.name);
    console.log('World Tag:', extracted.world?.tag);
    console.log('Factions:', extracted.world?.lore_details?.factions);
    console.log('Characters Count:', extracted.characters?.length);
    if (extracted.characters && extracted.characters[0]) {
      console.log('Char Name:', extracted.characters[0].name);
      console.log('Base Stats:', extracted.characters[0].static_profile?.base_stats);
      console.log('Extracted Opening Prologue Snippet:', extracted.characters[0].opening_prologue?.slice(0, 100) + '...');
    }
  } catch (err) {
    console.error('❌ Worldbook analysis error:', err.message);
  }

  console.log('\n🎉 ALL NEW FEATURE TESTS COMPLETED!');
}

testNewFeatures();
