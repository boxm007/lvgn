# TASK: AUDIT & อัปเกรดระบบ Memory ของ AI Roleplay Chatbot (LLM Wiki-Informed)

## Role
คุณคือ senior AI systems architect ที่เชี่ยวชาญ LLM memory, agentic retrieval, persistent knowledge systems, long-context optimization, และ LLM Wiki architectures

## กรอบงานสำคัญที่สุด (อ่านก่อน)

ระบบ AI roleplay chatbot ที่มีอยู่แล้ว **มี memory/knowledge architecture ที่ทำงานได้ดีในระดับหนึ่งอยู่แล้ว** และอาจมีแนวคิดที่ใกล้เคียงกับ LLM Wiki อยู่บ้างแล้วด้วยซ้ำ

งานนี้ **ไม่ใช่** "รื้อระบบ memory เดิมทิ้งแล้วสร้าง LLM Wiki ใหม่"

งานนี้คือ:

**AUDIT → COMPARE → IDENTIFY GAPS → DESIGN IMPROVEMENTS → (รอ approval) → IMPLEMENT**

เป้าหมาย: ทำให้ **ระบบ memory ที่มีอยู่แล้ว** แม่นยำ ประหยัด token และ scale ได้ดีขึ้น โดยหยิบเฉพาะแนวคิดจาก LLM Wiki research ที่พิสูจน์แล้วว่าเหมาะกับ codebase นี้จริงๆ

ห้ามสมมติว่า architecture เดิมด้อยกว่า ห้ามรื้อ component ที่ทำงานดีอยู่แล้วเพียงเพราะ reference architecture ต่างออกไป ถ้า proposed improvement เพิ่ม complexity หรือ token cost โดยไม่ได้ประโยชน์ชัดเจน → reject ทิ้ง

## Reference Documents

1. **AI Roleplay System Architecture.pdf** — research เรื่อง AI roleplay system architecture: memory, retrieval, lorebook, context management, token budgeting, summarization, world information
2. **Deep Research Study on LLM Wiki.pdf** — research เฉพาะเรื่อง LLM Wiki: knowledge compilation, canonical entity pages, hierarchical index, explicit wikilinks, bidirectional relationships, progressive retrieval, retrieval-as-reasoning, self-evolving knowledge, provenance, versioning, Error Book / self-correction, token efficiency, structural failure modes

ทั้งสองไฟล์เป็น **research reference ไม่ใช่ specification** — ถ้า codebase ปัจจุบันทำอะไรได้ดีกว่าที่เอกสารแนะนำอยู่แล้ว ให้เก็บของเดิมไว้ ถ้าแนวคิดในเอกสารไม่เข้ากับระบบนี้ ไม่ต้อง implement

---

## กติกาที่ต้องทำตามตลอดทั้งงาน

- ห้ามแก้โค้ดใดๆ ก่อนจบ analysis phase (Phase 0-9 ด้านล่าง)
- ห้ามเดา architecture ที่ไม่มีอยู่ใน source code จริง — ใช้เครื่องมืออ่านโค้ดจริง (view/grep/glob) ไม่ใช่เดาจาก pattern ทั่วไปที่เคยเห็น
- ห้ามสมมติว่า reference PDF ถูกต้องทุกเรื่อง หรือเหมาะกับ codebase นี้โดยอัตโนมัติ
- ห้ามเสนอเปลี่ยนแปลงเพียงเพราะ "มันอยู่ใน PDF" — ทุกข้อเสนอต้องมี current implementation / gap / expected benefit / cost ประกอบ
- ห้ามเพิ่ม LLM call หรือ token usage โดยไม่ประเมิน cost ก่อน
- ห้ามให้ memory/wiki override authoritative game state
- ห้ามลบ historical information โดยไม่มี versioning
- ห้าม overwrite memory แบบ destructive
- รักษา backward compatibility ให้มากที่สุดเท่าที่ทำได้ ต้องมี rollback และ logging เสมอ
- ทุก retrieval ต้อง debug ได้ว่า "memory ไหนถูกดึงมา เพราะอะไร"

---

## PHASE 0 — Map ระบบปัจจุบันจาก Source Code จริง

อ่านและทำความเข้าใจ codebase ทั้งหมดที่เกี่ยวข้อง ระบุ:

- chat pipeline / conversation flow
- memory pipeline (extraction, storage, retrieval, update)
- memory storage (database schema, file format, vector index ฯลฯ)
- entity representation (character, NPC, location, faction, item)
- retrieval, search, ranking, linking
- summarization
- contradiction handling (ถ้ามี)
- world state vs character state vs event history
- prompt construction / context assembly
- token budgeting
- model calls (กี่ตัว ทำหน้าที่อะไรบ้าง)
- caching, background jobs
- API interfaces, existing tests

สร้าง architecture diagram จาก **โค้ดจริงเท่านั้น** เช่นตัวอย่างรูปแบบ (ไม่ใช่ template ที่ต้อง fit ตาม):

```
User → Chat API → Memory Retrieval → Prompt Assembly → LLM → Response → Memory Update
```

diagram จริงต้องมาจากสิ่งที่เจอในโค้ด ไม่ใช่จาก reference PDF

---

## PHASE 1 — Memory Audit (เชิงกลไก: ระบบทำงานอย่างไร)

ตอบให้ได้จากโค้ดจริง:

- Memory ถูกสร้างเมื่อไหร่ / ใครเป็นคนสร้าง (LLM? deterministic trigger?)
- เก็บข้อมูลรูปแบบอะไร เก็บที่ไหน
- Retrieval ทำอย่างไร ranking ทำอย่างไร
- Memory ถูก update / ลบ / supersede เมื่อไหร่และอย่างไร
- มีการตรวจ contradiction หรือไม่
- มี temporal information / entity resolution / relationship tracking หรือไม่
- world state แยกจาก memory หรือไม่
- มี summary memory / episodic memory / semantic memory แยกกันหรือไม่
- conversation history แยกจาก memory หรือไม่

## PHASE 2 — Memory Audit (เชิงวินิจฉัย: อะไรดี อะไรพัง)

จากสิ่งที่เจอใน Phase 1 วินิจฉัยว่า:

1. อะไรที่ดีอยู่แล้ว — ควร **เก็บไว้เป็นฐาน** ไม่ใช่ทิ้ง
2. อะไรที่ redundant / fragile / ไม่ scale
3. อะไรที่ทำให้เกิด memory loss, hallucinated memory, contradictory memory
4. อะไรที่ทำให้เกิด irrelevant retrieval, excessive token usage, retrieval latency
5. ข้อมูลอะไร retrieve ยาก / update ยาก / ถูก overwrite ทิ้งง่าย
6. ข้อมูลอะไรที่ขาด provenance หรือ temporal state

**ยังไม่ต้องเสนอวิธีแก้ในขั้นนี้** — ให้เป็น diagnostic report ล้วนๆ ก่อน

---

## PHASE 3 — เทียบกับ LLM Wiki Research ทีละ Component

ใช้ "Deep Research Study on LLM Wiki.pdf" วิเคราะห์ระบบปัจจุบันเทียบกับหลักการต่อไปนี้ **ทีละข้อ** ห้ามสรุปรวบยอดว่า "LLM Wiki ดีกว่า RAG เปลี่ยนหมดเลย":

**A. Compilability** — ระบบ compile raw event ให้เป็น structured canonical knowledge หรือเก็บเป็น fragment ซ้ำๆ?

**B. Composability** — retrieval ทำได้แค่ `query → top-K → return chunks` หรือทำ `search → read → follow link → inspect → retrieve more → stop` ได้?

**C. Evolvability** — knowledge base evolve ได้ปลอดภัยไหม detect stale info / contradiction / duplicate entity / broken link ได้หรือไม่?

**D. Explicit Relationships** — มี Entity A ↔ Entity B ที่ explicit หรือพึ่ง embedding similarity ล้วนๆ?

**E. Progressive Disclosure** — ดึง summary ก่อน แล้วค่อยดึง detail/history ลึกเมื่อจำเป็นเท่านั้นได้ไหม?

**F. Provenance** — รู้ไหมว่า memory แต่ละอันมาจากไหน

**G. Versioning** — เก็บ historical information ไว้ได้ไหมเมื่อข้อมูลเปลี่ยน

**H. Self-Correction** — มี pattern แบบ `detect error → identify cause → store constraint → repair → verify` (Error Book) หรือไม่

สำหรับแต่ละข้อ: **ถ้ามีอยู่แล้ว** → ประเมินว่าปรับปรุงได้ไหม / **ถ้าไม่มี** → ประเมินว่าจำเป็นจริงไหมสำหรับระบบนี้

---

## PHASE 4 — ตัดสินว่าข้อมูลแต่ละประเภทควรเก็บที่ไหน (Taxonomy)

พิจารณาประเภทข้อมูลต่อไปนี้อย่างน้อย: World Knowledge, Character Knowledge, NPC Knowledge, Location Knowledge, Faction Knowledge, Item Knowledge, Historical Events, Relationships, Player History, Important Decisions, Current World State, Active Quests, Temporary Scene State, Conversation History

**ห้ามถือว่าทุกอย่างควรอยู่ใน LLM Wiki** — สำหรับแต่ละประเภท ตัดสินใจว่า source of truth ควรเป็น:

- LLM Wiki
- Database / deterministic state
- Conversation history (raw)
- Episodic memory
- Vector index
- Cache
- Hybrid (ระบุว่า hybrid ยังไง)

พร้อมเหตุผลทุกข้อ

---

## PHASE 5 — จัดหมวดข้อเสนอปรับปรุงทุกข้อ

สำหรับ **ทุก** ข้อเสนอปรับปรุงที่พบจาก Phase 3-4 ให้ classify เป็นหนึ่งใน:

`KEEP` / `IMPROVE` / `ADD` / `REPLACE` / `REMOVE` / `NO CHANGE`

พร้อมอธิบายครบทุกข้อ:
- Current implementation คืออะไร
- Research แนะนำอะไร
- Gap คืออะไร
- Proposed change
- Expected benefit
- Implementation complexity
- Token impact / Latency impact
- Risk
- **สรุปว่าคุ้มจะทำจริงไหม** (ห้ามแนะนำเปลี่ยนเพียงเพราะมันอยู่ใน PDF)

---

## PHASE 6 — จัดลำดับความสำคัญ

จัดอันดับทุกข้อเสนอด้วย VALUE / IMPLEMENTATION COST / RISK / TOKEN COST / LATENCY COST แล้วแบ่งเป็น:

- **P0** = Critical
- **P1** = High value
- **P2** = Useful
- **P3** = Optional / experimental

เป้าหมายคือ **memory quality สูงสุดด้วย complexity ที่เพิ่มขึ้นน้อยที่สุด** ไม่ใช่ระบบที่ซับซ้อนที่สุด

---

## PHASE 7 — LLM Wiki-Specific Checklist

ตรวจสอบทีละข้อว่าระบบปัจจุบันมีหรือไม่ ถ้ามีแล้วปรับปรุงได้ไหม ถ้าไม่มีจำเป็นจริงไหม:

canonical entity pages, index hierarchy, entity aliases, explicit wikilinks, bidirectional relationships, relationship metadata, progressive retrieval, retrieval-as-reasoning, search→read→traversal, provenance, temporal metadata, version history, superseded facts, contradiction detection, Error Book, deterministic link validation, orphan detection, index maintenance, knowledge consolidation, memory confidence scoring, memory importance scoring, memory freshness/decay, entity resolution, duplicate detection

---

## PHASE 8 — ออกแบบโครงสร้าง LLM Wiki (เฉพาะถ้าตัดสินใจว่าคุ้มค่าจาก Phase 4-6)

ตัวอย่าง structure ที่เป็นไปได้ (ต้อง **ปรับตาม project จริง** ไม่ใช่ copy ตรงๆ):

```
/wiki
  /characters   _index.md, Alice.md, Bob.md
  /locations    _index.md, Capital.md, Tavern.md
  /factions     _index.md
  /events       _index.md
  /items        _index.md
  /relationships
  /world        _index.md
```

ทุก entity page ควรพิจารณาเก็บ: canonical name, aliases, type, summary, attributes, relationships, current state, important history, relevant events, links, source/provenance, timestamps, confidence, version, superseded information

พิจารณา YAML frontmatter + Markdown หรือ storage format อื่นถ้ามีเหตุผลว่าเหมาะกับระบบปัจจุบันมากกว่า

---

## PHASE 9 — Retrieval Architecture (จุดสำคัญที่สุด)

**ห้าม** ใช้แนวคิด `user message → vector search → top 10 chunks → dump เข้า prompt ทั้งหมด` โดยอัตโนมัติ

ให้ประเมิน Progressive Retrieval / Retrieval-as-Reasoning เช่น:

```
User Action → Entity Detection → Index/Category Search → Candidate Pages
→ Read Summary → Determine Needed Detail → Follow Relevant Links
→ Retrieve Related Event/Relationship → Stop When Sufficient Evidence
→ Context Assembly
```

คำถามที่ระบบควรตอบได้คือ **"ข้อมูลอะไรจำเป็นต่อ turn นี้"** ไม่ใช่แค่ **"ข้อความไหน similarity สูงสุด"**

แต่ **ห้าม implement โดยไม่เทียบ** กับระบบ retrieval ปัจจุบันก่อน วัด accuracy, token usage, latency, จำนวน retrieval call, false positive, false negative ของทั้งสองแบบ

---

## PHASE 10 — Token Economics (บังคับ ห้ามข้าม)

**ห้ามสมมติว่าระบบใหม่ประหยัด token กว่าเดิมเสมอ** — ต้องวัดจริง

ออกแบบ progressive disclosure เป็น level เช่น:

- Level 0: Index / metadata
- Level 1: Entity summary
- Level 2: Relevant details
- Level 3: Deep history / events
- Level 4: Source evidence

โหลดระดับลึกขึ้นเฉพาะเมื่อจำเป็น แล้ววัดเทียบ **ระบบเดิม vs ระบบใหม่**:

- retrieval input/output tokens, generation context tokens
- จำนวน LLM call ต่อ turn, total tokens ต่อ turn, cost ต่อ turn
- retrieval latency, final context size

ถ้าระบบใหม่แพงกว่าเดิม **ต้องบอกตรงๆ** และหาวิธีแก้ ห้ามซ่อน regression

---

## PHASE 11 — Memory Writing / Knowledge Compilation Pipeline

ออกแบบ pipeline การเขียน/อัปเดต memory:

```
New Event → Extract Facts → Identify Entities → Find Existing Pages
→ Compare Existing Facts → Detect Contradiction
→ Decide: CREATE / UPDATE / APPEND / SUPERSEDE / IGNORE
→ Update Wiki → Update Links → Validate → Commit
```

ห้ามให้ LLM overwrite canonical information โดยไม่มี validation step

---

## PHASE 12 — Contradiction & Temporal Consistency

ระบบต้องรองรับข้อมูลที่เปลี่ยนตามเวลา เช่น:

> ก่อน: Alice ไม่ไว้ใจผู้เล่น → ต่อมา: ผู้เล่นช่วยชีวิต Alice → ต่อมา: Alice เริ่มไว้ใจผู้เล่น

**ห้ามลบ history ทิ้ง** ต้องแยกได้ว่าอะไรคือ Historical Fact / Current Fact / Superseded Fact และรู้ว่า fact ไหน active อยู่

นอกจากนี้ต้องแยก 4 information class ให้ถูก ไม่ปนกัน เช่น:

- Historical: "Alice เคยเกลียดผู้เล่น"
- Current (canonical/wiki): "ตอนนี้ Alice ไว้ใจผู้เล่นแล้ว"
- State (deterministic): "Alice อยู่ที่เมืองหลวงตอนนี้"
- Conversation (raw): "ผู้เล่นเพิ่งคุยกับ Alice ไปเมื่อกี้"

ต้องป้องกัน: hallucinated memory, stale memory, contradictory memory, duplicate entity, incorrect entity merge, timeline corruption

---

## PHASE 13 — World State ต้องเป็น Authoritative เสมอ

**ห้ามให้ LLM Wiki override deterministic game state** เช่น:

> Database: Player HP = 0
> Wiki: Player HP = 80
> → ต้องใช้ค่าจาก Database เสมอ ไม่ใช่ให้ LLM เลือกเอง

กำหนด information hierarchy (ตัวอย่าง ต้องปรับตาม architecture จริง):

1. Authoritative Game State
2. Active World Configuration
3. Canonical Wiki
4. Important Memory
5. Recent Conversation
6. Model inference

---

## PHASE 14 — Model Responsibility (Deterministic Code vs LLM)

ห้ามใช้ LLM กับงานที่ deterministic code ทำได้แม่นยำกว่าและถูกกว่า:

| ควรเป็น Deterministic Code | ควรเป็น LLM |
|---|---|
| state update, schema validation | fact extraction |
| link validation, timestamp, ID | entity resolution |
| token counting | semantic classification |
| database transaction | contradiction interpretation |
| | knowledge synthesis, complex retrieval planning |

---

## PHASE 15 — Failure Prevention Checklist

ตรวจสอบและป้องกันโดยเฉพาะ: hallucinated memory, memory overwrite, accidental fact erasure, stale information, contradictory pages, broken links, orphan entities, duplicate entities, incorrect entity merges, retrieval loops, irrelevant/excessive/missing retrieval, corrupted summaries

ใช้ deterministic code ทุกจุดที่ทำได้ อย่าใช้ LLM validate สิ่งที่ code ทำได้แม่นยำกว่า

---

## PHASE 16 — Migration Strategy

```
Old Memory → Parse → Classify → Entity Resolution → Compile → Create Wiki → Validate → Activate
```

ต้องรองรับ existing memories / conversations / world data / character data ที่มีอยู่แล้ว **ห้ามบังคับให้เริ่ม campaign ใหม่** ถ้า migration มีความเสี่ยง ต้อง backup ได้และ rollback ได้

---

## PHASE 17 — Implementation Plan (Incremental)

สร้างแผนแบบเป็นขั้น แต่ละขั้นต้อง test ได้อิสระ และลำดับจริงต้องเลือกจาก codebase ไม่ใช่ตามตัวอย่างนี้เป๊ะๆ:

Memory abstraction → Wiki storage → Compiler → Retrieval → Context assembly → Conflict resolution → Migration → Evaluation → Optimization

## PHASE 18 — ก่อนแก้โค้ดจริง ต้องรายงานก่อน

ก่อนเริ่ม implement ต้องบอก:

1. ไฟล์ที่จะถูกแก้ / ไฟล์ที่จะถูกสร้างใหม่ / ไฟล์ที่จะถูกลบ
2. เหตุผลของแต่ละการเปลี่ยนแปลง
3. Migration requirement
4. Rollback strategy
5. Testing strategy

ห้าม rewrite ระบบทั้งหมดถ้าไม่จำเป็นจริงๆ — เลือก incremental modification ก่อนเสมอ

---

## PHASE 19 — Testing

ต้องมี automated test เท่าที่ทำได้ ครอบคลุมอย่างน้อย:

จำ NPC ที่พบเมื่อหลาย turn ก่อน, จำเหตุการณ์สำคัญระยะไกล, จำ relationship change, จำ location/item/historical event, handle contradiction, handle entity alias, handle same-name entity, handle world-state change, ป้องกัน hallucinated memory, retrieve multi-hop relationship, หลีกเลี่ยง irrelevant memory, อยู่ใน token budget

---

## PHASE 20 — Benchmark Before/After

สร้าง baseline จากระบบเดิมก่อน implement วัด: memory retrieval accuracy, relevant memory recall, irrelevant memory rate, contradiction rate, token usage, latency, API cost, context size, จำนวน LLM call, storage overhead

หลัง implement เทียบ **OLD vs NEW** ด้วย metric เดียวกัน **ห้ามประกาศว่าระบบใหม่ดีกว่าจนกว่าจะมี evidence และถ้าแย่ลงในจุดไหนต้องบอกตรงๆ ห้ามซ่อน regression**

---

## MANDATORY STOP CONDITIONS

หยุดและถามกลับทันที (ห้ามเดา ห้าม implement ต่อ) ถ้าเจอ:

- architecture / database schema / memory flow ปัจจุบันไม่ชัดเจน
- model responsibility ไม่ชัดเจนว่าใครทำหน้าที่อะไร
- migration risk สูง (อาจทำข้อมูลเดิมพัง)
- requirement ขัดแย้งกันเอง หรือ reference PDF ขัดแย้งกับโค้ดจริง
- มีหลายวิธีที่เหมาะสมพอๆ กัน แต่เลือกไม่ได้จากข้อมูลที่มี
- การตัดสินใจ implementation จุดใดจุดหนึ่งจะกระทบ architecture ใหญ่

ให้ถามเป็น **รายการคำถามที่จำเป็นจริงๆ เท่านั้น** พร้อมอธิบายว่าแต่ละคำตอบมีผลต่อ architecture อย่างไร

---

## FIRST RESPONSE ต้องเป็นแบบนี้เท่านั้น

**ห้ามแก้ไฟล์ใดๆ ใน response แรก** หลังอ่าน codebase + reference PDF ทั้งสองไฟล์ ให้รายงานเท่านั้น:

1. Current Architecture (จากโค้ดจริง)
2. Current Memory Architecture
3. สิ่งที่ระบบเดิมทำได้ดีอยู่แล้ว
4. Weaknesses / Bottlenecks
5. Comparison กับ LLM Wiki research (ทีละ component ตาม Phase 3)
6. อะไรจาก reference PDF ที่ applicable / อะไรที่ไม่ applicable กับระบบนี้
7. Potential Improvements (พร้อม KEEP/IMPROVE/ADD/REPLACE/REMOVE)
8. Prioritized Improvements (P0-P3)
9. Expected Token / Latency Impact
10. Proposed Upgrade Architecture (unchanged/modified/new/removed ชัดเจน)
11. Major Risks
12. คำถามที่ต้องให้ฉันตัดสินใจก่อนถึงจะ implement ได้

**จากนั้นหยุดรอ approval เท่านั้น ห้าม implement ต่อจนกว่าจะได้รับการอนุมัติ**

---

*หมายเหตุ: prompt นี้จะถูกรันใน Claude Code ซึ่งมี repo อยู่แล้ว — ใช้เครื่องมืออ่าน/ค้นหาไฟล์จริง (read/grep/glob) ในทุกขั้นตอนที่เกี่ยวกับโค้ด ห้ามอ้างอิงจาก pattern ทั่วไปที่เคยเห็นจาก training data แทนการอ่านโค้ดจริง*
