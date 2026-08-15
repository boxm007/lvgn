# Lean Bible System — Long Voyage

> ปรับจากแนวคิด "Story Bible" (full-detail knowledge base) ให้เข้ากับสถาปัตยกรรมของ Long Voyage โดยคงหลักการ **"ไม่ทิ้งรายละเอียด ไม่ตกหล่น"** ไว้ทั้งหมด แต่เปลี่ยนวิธี "ดึงข้อมูลมาใช้" ให้ประหยัด token ที่สุด

## หลักการหลัก: แยก "ที่เก็บ" กับ "สิ่งที่ inject เข้า context"

Story Bible ต้นฉบับมีปรัชญาว่า "when in doubt, keep it" — เรา **เก็บปรัชญานี้ไว้เต็มร้อยสำหรับชั้นการจัดเก็บ (storage)** เพราะคุณเล่นยาว ไม่อยากให้อะไรหาย

แต่เราเพิ่มชั้นกรองก่อนถึง AI: ทุกไฟล์ detail จะไม่ถูกอ่านทั้งหมด มีแค่ **Index** (เบามาก, ไม่กี่บรรทัดต่อรายการ) ที่ AI #1 มองเห็นตลอดเวลา ส่วนไฟล์ detail เต็ม (ที่ยังคงละเอียดยิบแบบ Story Bible เดิม) จะถูก "เปิดอ่าน" เฉพาะเมื่อ index บอกว่าเกี่ยวข้องกับ turn นั้นจริงๆ

```
┌─────────────────────────────────────────────┐
│ LAYER 1: MASTER INDEX (อยู่ใน context เสมอ)   │
│ เบามาก — 1-3 บรรทัดต่อ entity                 │
│ AI #1 อ่านชั้นนี้เพื่อ "ชี้เป้า" ว่าจะเปิดไฟล์ไหน │
└─────────────────────────────────────────────┘
                    │
                    │ AI #1 เลือกเฉพาะที่เกี่ยวข้อง
                    ▼
┌─────────────────────────────────────────────┐
│ LAYER 2: DETAIL FILES (เปิดตามสั่งเท่านั้น)    │
│ ละเอียดเต็มแบบ Story Bible เดิม — ไม่มีการตัด  │
│ ทอน ไม่มีการสรุปทิ้งรายละเอียด                │
│ ถูก inject เข้า context เฉพาะไฟล์ที่ index      │
│ ชี้ว่าเกี่ยวข้องกับ turn นี้เท่านั้น             │
└─────────────────────────────────────────────┘
                    │
                    │ อัปเดตหลัง AI #4 เขียน
                    ▼
┌─────────────────────────────────────────────┐
│ LAYER 3: DYNAMIC STATE (ค่าที่เปลี่ยนทุก turn) │
│ แยกจาก detail file เพราะเปลี่ยนบ่อยที่สุด       │
│ เก็บเป็น record สั้นๆ ต่างหาก ไม่ปนกับ lore     │
└─────────────────────────────────────────────┘
```

**ผลลัพธ์:** ข้อมูลไม่หายแม้แต่บรรทัดเดียว (ตรงตามที่คุณต้องการ — เล่นนานไม่ลืม) แต่ token ที่ใช้ต่อ turn ขึ้นอยู่กับว่า turn นั้นเกี่ยวข้องกับกี่ entity จริงๆ ไม่ใช่ขนาดของทั้ง World

---

## LAYER 1 — Master Index (รูปแบบไฟล์)

หนึ่ง World มี Index ไฟล์เดียว เป็นตารางสั้นๆ นี่คือไฟล์เดียวที่ AI #1 เห็นตลอดเวลาทุก turn

```markdown
# WORLD INDEX — [ชื่อ World]

## Characters
| id | name | short_desc | importance | memory_class | file |
|---|---|---|---|---|---|
| char_fon | ฝน | นักเจรจา อดีตพันธมิตร | High | Long-term | 04_CHARACTERS/fon.md |
| char_ren | เร็น | หัวหน้าหน่วย ASD, ตรงไปตรงมา | Critical | Long-term | 04_CHARACTERS/ren.md |

## Factions
| id | name | short_desc | importance | memory_class | file |
|---|---|---|---|---|---|
| faction_iron | Iron Covenant | คุมเมือง Ashveil, กำลังทำสงคราม | High | Long-term | 02_FACTIONS/iron_covenant.md |

## Locations
| id | name | short_desc | importance | memory_class | file |
|---|---|---|---|---|---|
| loc_camp | ค่ายเชลย | จุดเริ่มเรื่อง, มียามเฝ้า | Medium | Medium-term | 03_LOCATIONS/prison_camp.md |

## Loose Threads (ปม/เงื่อนไขที่ยังไม่คลี่คลาย)
| id | name | urgency | file |
|---|---|---|---|
| lt_01 | ใครเป็นคนขายข้อมูลให้ศัตรู | High | 08_LOOSE_THREADS/loose_threads.md#lt_01 |

## Current State (สรุปสั้นล่าสุด — อัปเดตทุก turn โดย AI #4)
> อยู่ที่ค่ายเชลย พยายามหนี ความสัมพันธ์กับเร็นตึงเครียดจากเหตุการณ์ turn ที่ 40

## Recent Rolling Summary Pointer
- Turns 1-39: `09_MEMORY_SYSTEM/summary_block_01.md`
- Turns 40-current: active window (ไม่ต้อง summary ยัง)
```

**กฎของ Index:**
- แต่ละแถวยาวไม่เกิน 1 บรรทัด — ถ้า short_desc ยาวเกินไปคือทำผิดหลักการ
- Index **ไม่มีวันถูกลบทิ้ง** entity ที่ตายไปแล้ว/หมดความสำคัญ ให้เปลี่ยน `importance` เป็น `Background` ไม่ใช่ลบแถวออก (กันข้อมูลหายสนิท)
- ทุกครั้งที่ AI #4 สร้าง entity ใหม่ (NPC ใหม่ที่ผู้เล่นเจอ, สถานที่ใหม่) ต้อง insert แถวลง Index ทันที

---

## LAYER 2 — Detail Files (คงความละเอียดแบบ Story Bible เดิมเต็มรูปแบบ)

ไฟล์ระดับนี้ **ไม่ตัดทอนอะไรเลย** ใช้โครงจาก Story Bible เดิมได้ตรงๆ:

- `04_CHARACTERS/[character_id].md` — full identity, personality, history, secrets, relationships, arc, inventory, quotes ฯลฯ (โครงเดียวกับ Story Bible §2.4 ทุกหัวข้อ)
- `02_FACTIONS/[faction_id].md` — โครงเดียวกับ §2.2 ทุกหัวข้อ
- `03_LOCATIONS/[location_id].md` — โครงเดียวกับ §2.3
- `01_WORLD/*.md` — geography, history, religion, culture ฯลฯ ตามที่ Story Bible กำหนด (เก็บไว้เผื่อ world ซับซ้อนขึ้นเรื่อยๆ)

**สิ่งที่ต่างจาก Story Bible เดิม:** field `Cross-references` ในแต่ละไฟล์ให้ใส่เป็น **entity id เท่านั้น** (เช่น `char_ren`, `faction_iron`) ไม่ใช่ชื่อเต็มหรือคำอธิบายซ้ำ — เพื่อให้ AI #1 lookup กลับไป Index ได้ ไม่ต้อง duplicate เนื้อหา

**Memory Class ใช้ตรงตาม Story Bible เดิม** (Permanent Canon / Long-term / Medium-term / Short-term / Scene) — field นี้คือสิ่งที่บอก AI #4 ว่าอะไรควรอยู่ใน Rolling Summary ระยะยาว อะไรทิ้งได้หลังจบฉาก

---

## LAYER 3 — Dynamic State (แยกออกจาก Detail File)

เหตุผลที่แยก: dynamic_state เปลี่ยนแทบทุก turn ถ้าปนอยู่ในไฟล์ detail (ที่ยาวและนิ่ง) จะทำให้ AI #4 ต้องเขียนทับไฟล์ยาวๆ ทุกครั้งโดยไม่จำเป็น — แยกเป็น record เล็กต่างหากต่อ character

```json
// dynamic_state/char_ren.json — อัปเดตโดย AI #4 เท่านั้น
{
  "character_id": "char_ren",
  "relationship_value": -3,
  "relationship_status": "tense",
  "current_emotion": "suspicious",
  "last_updated_turn": 42,
  "state_history_pointer": "snapshots/char_ren/"  // สำหรับ Undo/Rollback
}
```

ไฟล์นี้เบามาก (ไม่กี่ร้อย byte) — inject เข้า context ได้ถูกๆ ทุกครั้งที่ตัวละครนั้นเกี่ยวข้อง โดยไม่ต้องแตะไฟล์ detail หลักเลย

---

## Workflow การดึงข้อมูลจริงใน 1 Turn (เชื่อมกับ 4-Stage Pipeline เดิม)

```
1. AI #1 (Context Extractor) ได้รับ:
   - Player input
   - Master Index (Layer 1 เท่านั้น — เบามาก)
   - Active window ของ chat history

   AI #1 ตัดสินใจว่า turn นี้เกี่ยวกับ entity id ไหนบ้าง
   → output: ["char_ren", "loc_camp"]

2. ระบบ (ไม่ใช่ AI) ดึง:
   - dynamic_state/char_ren.json (Layer 3, เบา)
   - 04_CHARACTERS/ren.md (Layer 2, เฉพาะไฟล์นี้ไฟล์เดียว)
   - 03_LOCATIONS/prison_camp.md (Layer 2, เฉพาะไฟล์นี้)
   → ไม่แตะไฟล์อื่นใน World เลย แม้ World จะมี 50 ตัวละครก็ตาม

3. AI #2, #3 ทำงานตามปกติด้วยข้อมูลที่ดึงมาเฉพาะจุด

4. AI #4 เขียนกลับ:
   - อัปเดต dynamic_state/char_ren.json (Layer 3)
   - ถ้ามี fact ใหม่ที่ต้องจำถาวร → append ลง 04_CHARACTERS/ren.md
     (Layer 2 — เพิ่มได้ ไม่ลบของเดิม)
   - ถ้ามี entity ใหม่เกิดขึ้น → insert แถวใหม่ใน Master Index
   - อัปเดต "Current State" summary บรรทัดเดียวใน Index
```

**จุดสำคัญ:** ต่อ 1 turn ปกติ context ที่ AI ต้องอ่านคือ **Index (บางเสมอ) + ไฟล์ detail เฉพาะ 1-3 entity ที่เกี่ยวข้อง** ไม่ใช่ทั้ง World — นี่คือจุดที่ประหยัด token ขั้นสุดตามที่ต้องการ ในขณะที่ตัว World โดยรวมยังคงเก็บทุกรายละเอียดแบบ Story Bible เดิมได้เต็มที่ ไม่มีอะไรถูกตัดทิ้งจริงๆ

---

## ทำไมวิธีนี้ตอบโจทย์ "เล่นนานไม่ลืม" ได้ดีกว่าการสรุปทิ้ง

- **ไม่มีการบีบอัดข้อมูลจนสูญเสียรายละเอียด** (lossy compression) เหมือนการทำ rolling summary ธรรมดาที่สรุปทิ้งของเก่า — ไฟล์ detail เต็มยังอยู่ครบ 100% เสมอ
- **Rolling Summary (จาก §7 เดิม) ยังใช้ได้** แต่เปลี่ยนบทบาท: ไม่ใช่ "แทนที่" ข้อมูลเก่า แต่เป็น **ทางลัด** สำหรับเหตุการณ์ในอดีตไกลๆ ที่ไม่กระทบ state ปัจจุบันแล้ว — ถ้าจำเป็นต้องขุดรายละเอียดจริง ยังไปอ่านไฟล์ detail ต้นฉบับได้เสมอ (Layer 2 ไม่เคยถูกลบ)
- **Contradiction Log จาก Story Bible เดิมยังเก็บไว้ได้** — เผื่อกรณีที่ผู้เล่นเปลี่ยนใจเรื่อง lore หรือ AI ตีความขัดแย้งกันเอง มีที่ log ไว้ตรวจสอบทีหลัง

---

## สิ่งที่ต้องเพิ่มในเฟส 1 (Data Schema) ของ context.md เดิม

- [ ] เขียน template Master Index (Layer 1) ให้เป็น parseable format จริง (แนะนำ: เก็บเป็น table ใน SQLite แทน markdown จริงๆ เพื่อ query เร็ว แล้ว generate เป็น markdown snippet ตอนจะส่งเข้า AI #1 เท่านั้น)
- [ ] เขียน template Detail File (Layer 2) ต่อประเภท entity (character/faction/location) โดยอิงโครงจาก Story Bible เดิม
- [ ] ออกแบบ dynamic_state schema (Layer 3) ให้ตรงกับ Character Card เดิมใน §5 ของ context.md (รวมเป็นระบบเดียวกัน ไม่ใช่คนละระบบ)
- [ ] เขียนกฎการ "insert แถวใหม่ลง Index" ให้ AI #4 ทำอัตโนมัติเมื่อพบ entity ใหม่
