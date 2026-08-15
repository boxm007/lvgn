# Long Voyage — Project Context Blueprint

> เอกสารนี้คือ System Context ฉบับสมบูรณ์สำหรับโปรเจกต์ Long Voyage ใช้เป็นบริบทตั้งต้นในการพัฒนา ทุกส่วนที่เขียนในนี้คือข้อสรุปจากการออกแบบร่วมกัน ไม่ใช่ draft — ยึดตามนี้เป็นหลักเว้นแต่จะมีการอัปเดตภายหลัง

---

## 1. Project Overview & Philosophy

**Project Name:** Long Voyage (การเดินทางอันยาวนาน)

**Architecture Style:** Self-hosted / Localhost Engine — แรงบันดาลใจจากสไตล์ SillyTavern รองรับการรันบนคอมพิวเตอร์ และรองรับการรันแบบ **stand-alone บนมือถือผ่าน Termux** โดยตัวมือถือทำหน้าที่เป็น server เอง ไม่ต้องพึ่งเครื่องอื่น

**Core Philosophy:** ไม่ใช่แอปสนองความต้องการที่ควบคุมได้ตามใจนึก (Wish Fulfillment) แต่เป็น "ประสบการณ์จริงในสถานการณ์ที่ยาก ลำบาก และไร้รูปแบบตายตัว" มีความกดดัน มีผลลัพธ์ที่ตามมาจริง (Consequences)

**หมายเหตุสำคัญเรื่อง Consequence vs Undo:** ปรัชญา "ผลลัพธ์จริง" หมายถึง **สถานะของโลก** (relationship, inventory, event flags) ที่ต้อง cement เมื่อ AI #4 (Memory Writer) บันทึกแล้ว ไม่ reset ง่ายๆ — แต่ **ตัวข้อความบรรยาย (prose)** แก้ไข/regenerate ได้เสมอ เพราะเป็นคนละชั้นกับการตัดสินใจเชิงกลไก สองเรื่องนี้แยกกันชัดเจน ไม่ขัดกัน

**Target Scale:** Single Player เท่านั้น (ตัดระบบ multi-user/small group ออกจาก scope แล้ว) — Save Slot ไม่จำกัดจำนวน (infinite save slots) แต่ละ slot คือการเริ่มเรื่องใหม่ที่แยก state จากกันอย่างสมบูรณ์ แม้จะอยู่ใน World เดียวกันก็ตาม เน้นการเก็บความจำระยะยาวได้ลึกและละเอียดที่สุดโดยไม่เปลือง Token

---

## 2. Core Gameplay Mechanics

### Interaction Types
ตัดเหลือเพียง 2 คำสั่งหลัก:
- **Do** — การกระทำทางกายภาพ / ยุทธวิธี
- **Say** — คำพูด / การเจรจา / การกดดัน

### Fate & Status Engine (Anti-Cheat)
- สุ่มค่า D20 จริงด้วยระบบ **Python 100%** (ไม่ให้ AI สุ่มตัวเลขเอง เพื่อป้องกันการโกงหรือความลำเอียงของโมเดล)
- นำค่าลูกเต๋าไปบวกกับ Stat Modifier ของตัวละคร
- สรุปผลลัพธ์ 4 ระดับ: **Critical Failure, Failure, Success, Critical Success**
- แสดงผลบน UI เป็นป้าย Badge เล็กๆ กระชับ เช่น `🎲 [D20: 14] + [พลัง: +2] = 16 (ผ่าน)`
- Fate Engine เป็น pure deterministic code — ไม่มี AI เกี่ยวข้องในขั้นตอนนี้เลย ทดสอบแยกจากส่วนอื่นได้ง่ายที่สุด

---

## 3. On-Demand Data Modules (UI Panels)

แยกหน้าต่างข้อมูลออกจากหน้าจอแชทหลัก เพื่อประหยัด Token และไม่รกสายตา:

### World Info / Codex
- **ข้อมูลคงที่ (Static Profile):** ชื่อ, ประวัติคร่าวๆ, ค่าพลังพื้นฐาน
- **ข้อมูลไดนามิก:** ค่าความสัมพันธ์ (ตัวเลข +/-), สถานะความสัมพันธ์ (เพื่อน/ศัตรู), อารมณ์เด่นชัด
- **Secret Notes:** ข้อมูลลับที่เริ่มต้นถูกล็อกไว้ และปลดล็อกเมื่อเกิดเหตุการณ์สำคัญ

### Inventory (Pure Text List)
- รายการสิ่งของและจำนวนแบบข้อความล้วน เช่น "เงิน 700 เหรียญ, ดาบสั้น 1 เล่ม, กำไลเงิน 1 อัน"

---

## 4. Multi-Model Backend Routing — 4-Stage AI Pipeline

นี่คือ workflow หลักของทุก turn ที่ผู้เล่นพิมพ์ Do/Say — แบ่งงานเป็น 4 AI calls + 1 deterministic call ตามความเชี่ยวชาญเฉพาะทาง ไม่ใช้โมเดลเดียวทำทุกอย่าง

```
Player Input (Do/Say)
   │
   ▼
┌─────────────────────────────────────────┐
│ AI #1 — Context Extractor                │
│ วิเคราะห์ input ผู้เล่น ดึงว่าต้องใช้ข้อมูล   │
│ อะไรจาก World/Character/Inventory/Codex   │
│ output: structured list ของ context       │
│ ที่ต้อง inject (ไม่ inject ทุกอย่างเสมอ)    │
│ → โมเดลเล็ก/เร็วพอ เพราะงาน structured    │
└─────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────┐
│ Fate Engine (Pure Python, ไม่มี AI)        │
│ ทอย D20 + modifier ตาม stat ที่เกี่ยวข้อง   │
│ output: roll result (4 ระดับ)             │
└─────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────┐
│ AI #2 — Reasoning / Consequence Engine    │
│ รับผลทอย + context ที่ดึงมา ตัดสินใจว่า     │
│ เหตุการณ์นี้ควรเกิดอะไรขึ้น "ทางกลไก"       │
│ (ไม่ใช่ทางวรรณกรรม) เช่น ความสัมพันธ์ -3,   │
│ ปลดล็อก secret note, item หาย            │
│ output: structured consequence list       │
│ → โมเดลเล็ก/เร็วพอ เพราะงาน structured    │
└─────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────┐
│ AI #3 — Storyteller / Narrator            │
│ รับ consequence list + active style       │
│ preset → เขียนเป็น prose จริงตามโทน       │
│ ที่เลือกไว้ (ดราม่า/ผจญภัย/ฯลฯ)            │
│ output: ข้อความที่ผู้เล่นเห็นจริง           │
│ → ใช้โมเดลแรงที่สุดเท่าที่งบไหว เพราะนี่คือ  │
│   หัวใจของประสบการณ์                       │
│ → จุดนี้คือจุดเดียวที่ "แก้คำตอบ/regenerate"│
│   ทำได้ โดยเรียกเฉพาะ AI #3 ใหม่ด้วย        │
│   consequence list เดิม ไม่ต้องรัน pipeline│
│   ทั้งหมดใหม่ ประหยัด token และผลเชิงกลไก   │
│   ไม่เพี้ยน                                │
└─────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────┐
│ AI #4 — Memory Writer                     │
│ สรุป turn นี้:                             │
│ - update dynamic_state (relationship,     │
│   emotion, inventory)                     │
│ - เขียน rolling summary ถ้าถึง threshold   │
│ - save ลง World/Character/Save Slot data  │
│ output: เขียนลง DB จริง — จุดที่ "ความจริง │
│ ของโลก" cement แล้ว (undo หลังจุดนี้ต้อง   │
│ rollback state ด้วย ไม่ใช่แค่ลบข้อความ)    │
└─────────────────────────────────────────┘
```

### หลักการ Routing โดยรวม
- Layer A (AI #3) ถูกเรียกทุก turn — คือคอขวดด้าน cost ใช้โมเดลแรงสุด
- Layer B (AI #1, #2) เรียกทุก turn เช่นกันแต่เป็นงาน structured/สั้น ใช้โมเดลเล็ก-เร็วได้
- Layer C (Fate Engine) เรียกเฉพาะเมื่อมีการ roll จริง
- Layer D (Search/Retrieval, ดูข้อ 6) เรียกเฉพาะตอน user เปิดหน้าค้นหา ไม่เกี่ยวกับ turn loop

### ทำไมแยกเป็น 4 ตัวแทนที่จะรวมเป็นก้อนเดียว
- **Consistency:** เพราะ "ตัดสินใจ" (AI #2) กับ "เล่า" (AI #3) แยกกัน โอกาสที่ narration จะขัดกับ state จริงลดลงมาก — แก้ปัญหาคลาสสิกของ AI Dungeon ที่เนื้อเรื่องพูดอย่างนึงแต่ state อีกอย่างนึง
- **Cost control:** งาน structured (extract/reason) ใช้โมเดลถูก งานเขียนจริงค่อยใช้โมเดลแพง
- **Debug ง่าย:** ถ้า narration แปลกๆ เช็คได้ทันทีว่าเป็นปัญหาที่ AI #2 ตัดสินผิด หรือ AI #3 เล่าไม่ตรงกับที่สั่ง
- **รองรับ Undo/Edit ได้สะอาด:** เพราะมีจุดตัดชัดเจนระหว่าง "ตัดสินใจแล้ว" (ก่อน AI #4) กับ "บันทึกแล้ว" (หลัง AI #4)

### จุดที่ต้องตัดสินใจเพิ่มเติม (ยังเปิดอยู่)
- ตอนนี้มี 4 AI calls + 1 Python call ต่อ 1 turn — ต้องทดสอบว่า latency/cost จริงไหวไหม
- ถ้าจะลดจำนวน call ตัวที่รวมกันได้ง่ายที่สุดคือ AI #1 + AI #2 (extract แล้วตัดสินใจในโมเดลเดียวกัน) แลกกับ debug ยากขึ้นเล็กน้อย
- **ยังไม่ได้ล็อก:** JSON schema ของ "structured consequence list" ที่เป็น contract ระหว่าง AI #2 → AI #3 → AI #4 — ควรทำเป็นงานถัดไปหลัง blueprint นี้

---

## 5. World & Character System (Searchable)

### World Container
- 1 World = 1 setting/lore container ที่มี Character หลายตัวอยู่ข้างใน
- แต่ละ World มี: ชื่อ, คำอธิบายสั้น, tag (แนวแฟนตาซี/สมัยใหม่/ฯลฯ)
- ค้นหาได้ผ่าน tag/ชื่อ/คำอธิบาย

### Character Card (Structured, Searchable)
แยก field ที่ใช้ค้นหา (เบา) ออกจาก field ที่ใช้ตอนเล่นจริง (หนัก) เพื่อไม่ให้ token บวมตอน browse:

```json
{
  "name": "...",
  "world_id": "...",
  "short_desc": "...",           // แสดงตอนค้นหา, ใช้ index
  "personality_tags": ["..."],    // ใช้ filter/search
  "static_profile": {             // โหลดเฉพาะตอนเข้าเล่นจริง
    "history": "...",
    "base_stats": {...}
  },
  "dynamic_state": {               // แยกจาก static, อัปเดตทุก turn โดย AI #4
    "relationship_value": 0,
    "relationship_status": "neutral",
    "current_emotion": "..."
  },
  "creator": "system | user"
}
```

- รองรับทั้งตัวละครที่ระบบมีให้ในแต่ละ World และตัวละครที่ผู้เล่นสร้างเอง
- Search index ใช้แค่ `name` / `short_desc` / `personality_tags` — ไม่โหลด `static_profile` เต็มตอนค้นหา

---

## 6. Storyteller Style / Prompt Preset System (แบบ SillyTavern)

ปรับได้ทุกอย่างเหมือน SillyTavern แบ่งเป็น 2 ชั้น:

### ชั้นที่ 1: Template สำเร็จรูป
ตัวอย่าง: `Drama`, `Adventure`, `Slice of Life`, `Horror`, `Tactical/Gritty`
แต่ละ template คุม: โทนเรื่อง, ความยาวคำตอบ, ระดับความละเอียดของคำอธิบาย, สัดส่วน dialogue vs narration

### ชั้นที่ 2: Custom Override
ผู้เล่นแก้ทับ template ได้ทุกจุด แบ่งเป็น field ย่อยเพื่อไม่ต้องเขียน prompt ยาวทั้งก้อนทุกครั้ง:
- `tone_directive` — โทนเรื่อง
- `prose_style` — สั้นกระชับ / บรรยายเยิ่นเย้อ
- `pacing` — ช้า / เร็ว
- `content_boundaries` — ระดับความเข้มข้นที่รับได้
- `pronoun_pov` — มุมมองบุคคลที่ 1/2/3

### Preset Management
บันทึกเป็น preset ตั้งชื่อเก็บไว้ได้ (คล้าย SillyTavern's preset dropdown) สลับใช้ระหว่าง World ต่างๆ ได้เร็ว ส่งเข้า AI #3 (Storyteller) โดยตรงทุก turn

---

## 7. Context Window Management

จำเป็นเพราะเป้าหมายคือเก็บความจำระยะยาวลึกโดยไม่เปลือง Token — ไม่งั้น AI #3 จะพังเมื่อเล่นไปนานๆ:

- **Rolling Summary:** ทุกๆ N turns มี summarization pass สรุปเหตุการณ์เป็นย่อหน้าสั้น เก็บแยกจาก raw chat log (ทำโดย AI #4)
- **Tiered Memory:**
  - **Tier 1 (Active):** ข้อความล่าสุด N turns แบบเต็ม
  - **Tier 2 (Summarized):** เหตุการณ์เก่ากว่านั้น สรุปแล้ว
  - **Tier 3 (Codex/Static):** ข้อมูลตัวละคร/world ที่ inject เฉพาะตอนเกี่ยวข้อง
- **Trigger-based Injection:** ถ้าตัวละคร B ถูกพูดถึงในข้อความ ค่อย inject `dynamic_state` ของ B เข้า context — ไม่ inject ทุกตัวละครทุกครั้ง (หน้าที่ของ AI #1)

---

## 8. World Creation Flow (Manual-first — AI เกี่ยวข้องเฉพาะตอน Save)

จุดสำคัญ: การสร้าง/แก้ไข World และ Character เป็น **form-based CRUD ล้วนๆ ไม่มี AI เกี่ยวข้อง** จนกว่าจะกด Save

```
หน้าแรก (สไตล์ AI Dungeon)
   │
   ▼
[Browse/Search World] → เลือก World ที่มีอยู่ → เลือกตัวละคร → เข้าเล่น
   │
   └─→ [+ Create New World]
          │
          ▼
       ฟอร์มกรอกมือล้วนๆ (ไม่มี AI):
       - ชื่อ World, คำอธิบาย, tag/genre
       - สร้าง Character ในนั้น (stat, ประวัติ, personality, secret notes)
       - ตั้งค่า Inventory เริ่มต้น
       - เลือก/ปรับ Style Preset
          │
          ▼
       กด [Save World] ← จุดแรกที่ AI เข้ามาเกี่ยว
          │
          ▼
       AI ทำหน้าที่:
       - ตรวจความสอดคล้อง (validation)
       - สร้าง search index จาก short_desc + tags
       - Normalize ข้อมูลให้เข้า schema (structured JSON)
          │
          ▼
       World พร้อมใช้ → ไปโผล่ในหน้า Browse
```

---

## 9. UI/UX Flow สรุปทั้งระบบ

สไตล์การเข้าเว็บและการเลือกตัวละครตั้งแต่หน้าแรก **เหมือน AI Dungeon ทุกจุด**:

```
[หน้าแรก: Browse/Search World] → เลือก/สร้าง World
   → [หน้าเลือก Character ใน World นั้น] → เลือก/สร้าง Character
      → [เลือก Save Slot: ต่อของเดิม หรือเริ่มใหม่ — infinite slots]
         → [หน้า Chat หลัก] ← เบาบาง เน้นข้อความ + badge ผลลูกเต๋า
            ├─ Panel: World Info / Codex (เปิดปิดได้)
            ├─ Panel: Inventory (text list)
            ├─ Panel: Style/Preset editor (SillyTavern-style)
            └─ Input bar: [Do] [Say] toggle + text field
               + ปุ่ม Edit/Regenerate ต่อข้อความ (เรียกเฉพาะ AI #3)
```

---

## 10. Undo / Edit System

- **แก้ไข/Regenerate ข้อความเล่าเรื่อง:** ทำได้เสมอ ไม่จำกัด — เรียกเฉพาะ AI #3 ใหม่ด้วย consequence list เดิมจาก AI #2 ไม่ต้องรัน pipeline ทั้งหมดใหม่
- **Undo ก่อน AI #4 บันทึก:** ยกเลิกได้เต็มที่ ไม่มีอะไร cement ลง state
- **Undo หลัง AI #4 บันทึกแล้ว:** ต้อง rollback state ด้วย ไม่ใช่แค่ลบข้อความ — ระบบต้องเก็บ **state snapshot ก่อน-หลังทุก turn** เพื่อให้ rollback สะอาดและแม่นยำ

---

## 11. Deployment Target: Termux Stand-alone (Android)

เป้าหมาย: มือถือทำหน้าที่เป็น server เองแบบ stand-alone ไม่ต้องพึ่งเครื่องอื่น เข้าใช้งานผ่าน browser บนเครื่องเดียวกันผ่าน `localhost`

### Tech Stack ที่เหมาะกับข้อจำกัดของ Termux
- **Backend:** Node.js — เบา ติดตั้งง่ายผ่าน `pkg install nodejs`, เหมาะกับ long-running server บนมือถือ (แนวเดียวกับที่ SillyTavern ใช้จริง)
- **Database:** SQLite — ไฟล์เดียว ไม่ต้องรัน DB server แยก ไม่กิน RAM เพิ่ม
- **Frontend:** Static HTML/JS/CSS เสิร์ฟจาก Express โดยตรง ไม่ใช้ build step หนักแบบ React SPA เต็มรูป เพื่อประหยัดแรงมือถือ

### ข้อจำกัดที่ต้องรับมือ
1. **Background kill:** Android ชอบ kill process พื้นหลัง → ใช้ `termux-wake-lock` กันเครื่อง sleep หรือใช้ Termux:Boot / Termux:Widget
2. **Storage permission:** ต้องรัน `termux-setup-storage` ถ้าอยากให้ SQLite/save file เข้าถึงง่ายนอก sandbox ของ Termux
3. **Network:** เข้าจากเครื่องเดียวกันใช้ `localhost` พอ ไม่ต้องยุ่งเรื่อง firewall/router
4. **API Key:** เก็บเป็น environment variable หรือไฟล์ config แยก ไม่ hardcode ในโค้ด

### Setup Checklist
- [ ] ติดตั้ง Termux จาก **F-Droid** (ไม่ใช่ Play Store — เวอร์ชัน Play Store เก่าและเลิกซัพพอร์ตแล้ว)
- [ ] `pkg update && pkg install nodejs git`
- [ ] `termux-setup-storage`
- [ ] ตั้ง project folder, `npm init`
- [ ] เขียน Express server: serve static frontend + REST API endpoints สำหรับ pipeline
- [ ] ทดสอบเข้าผ่าน `http://localhost:PORT` ใน Chrome บนเครื่องเดียวกัน
- [ ] ตั้ง `termux-wake-lock` หรือ Termux:Boot สำหรับ auto-start

---

## 12. Development Roadmap (เรียงตามลำดับที่ควรทำ)

### เฟส 0 — Setup พื้นฐาน
- [ ] ยืนยัน tech stack: Node.js + Express + SQLite (ตาม §11)
- [ ] ตัดสินใจว่าจะเรียก AI API ของผู้ให้บริการไหน และประเมินงบต่อ turn (4 AI calls/turn)

### เฟส 1 — Data Schema (ก่อนเขียน UI ใดๆ)
- [ ] เขียน JSON schema ของ Character Card ให้เสร็จ (static_profile / dynamic_state แยกกัน — ดู §5)
- [ ] เขียน schema ของ World container
- [ ] เขียน schema ของ Save Slot (แยกจาก World — infinite slots, state ไม่ปนกัน)
- [ ] เขียน schema ของ "structured consequence list" — contract ระหว่าง AI #2 → AI #3 → AI #4 (**ยังไม่ได้ทำ — priority สูงสุดของงานถัดไป**)

### เฟส 2 — Core Pipeline (backend logic ก่อน UI สวยๆ)
- [ ] Fate Engine (Python/JS, deterministic) — ทดสอบแยกได้ง่ายสุด ไม่พึ่ง API
- [ ] Prototype AI #1 (Context Extractor) — ทดสอบความแม่นยำในการดึง context
- [ ] Prototype AI #2 (Reasoning) — ต่อจาก #1
- [ ] Prototype AI #3 (Storyteller) — ทดสอบกับ style preset ต่างๆ
- [ ] Prototype AI #4 (Memory Writer) — ทดสอบว่า save state ถูกต้องและ rollback ได้จริง
- [ ] เชื่อม 4 ตัวเป็น pipeline เดียว ทดสอบ end-to-end 1 turn เต็ม

### เฟส 3 — UI (หลัง backend ทำงานได้จริง)
- [ ] หน้า Browse World (list/search)
- [ ] หน้า Create/Edit World (form-based ล้วน, ดู §8)
- [ ] หน้า Character select ในแต่ละ World
- [ ] หน้า Chat หลัก + Do/Say input
- [ ] Panel: World Info/Codex, Inventory, Style Preset editor
- [ ] Save Slot manager (list/สร้างใหม่/ลบ/สลับ — infinite slots)
- [ ] Undo/Edit UI ต่อ turn (ดู §10)

### เฟส 4 — Polish
- [ ] Rolling summary / tiered memory (ดู §7)
- [ ] Preset save/load แบบตั้งชื่อเก็บ
- [ ] Error handling เมื่อ API call ล้มเหลวกลาง pipeline (เช่น AI #3 fail แต่ #1, #2 สำเร็จแล้ว — ต้อง retry โดยไม่ทำ state เพี้ยน)

### เฟส 5 — Deployment
- [ ] Termux setup ตาม checklist ใน §11
- [ ] ทดสอบ full pipeline บนมือถือจริง วัด latency ต่อ turn

---

## Open Items (สิ่งที่ยังไม่ปิด ต้องตัดสินใจก่อนเริ่มเฟส 1)

1. **JSON schema ของ "structured consequence list"** — contract สำคัญที่สุดของทั้ง pipeline ยังไม่ได้ร่าง
2. **จำนวน AI calls ต่อ turn (4 ครั้ง)** — ต้องทดสอบ latency/cost จริงว่าไหวไหมบน mobile + API ที่เลือกใช้ ถ้าไม่ไหวให้พิจารณารวม AI #1 + AI #2
3. **Provider ของ AI API** — ยังไม่ระบุว่าจะเรียกผ่านผู้ให้บริการใด งบเท่าไหร่ต่อเดือน
