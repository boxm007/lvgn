/**
 * LONG VOYAGE — APP CLIENT CONTROLLER
 * Full orchestration of Khuiai UI, 4-Stage AI Pipeline, Detailed Worldbook, Dynamic NPC Discovery & Fast Responses
 */

// Global State
const State = {
  activeView: 'view-browse',
  worlds: [],
  characters: [],
  activeWorld: null,
  activeCharacter: null,
  activeSlot: null,
  currentMode: 'Say', // 'Say' or 'Do'
  enableDice: true,
  isLoadingTurn: false
};

// 6 Official Style Mode Presets from `prompt ai/ai3_storyteller-1.md`
const PRESET_TEMPLATES = {
  drama: {
    preset_name: 'ดราม่าเข้มข้น (Drama)',
    tone_directive: 'เน้นความขัดแย้งภายในและความสัมพันธ์ระหว่างตัวละคร ทุกฉากมีน้ำหนักทางอารมณ์ ให้ความสำคัญกับสีหน้า น้ำเสียง ความเงียบที่พูดมากกว่าคำพูด บทพูดมี subtext',
    prose_style: 'สำนวนภาษาไทยสละสลวย บรรยายฉากและประสาทสัมผัสคมชัด มี pause และความเงียบในบทสนทนา หลีกเลี่ยงการบอกอารมณ์ตรงๆ ให้คนอ่านรู้สึกเองผ่านรายละเอียด',
    pacing: 'จังหวะช้าในฉากอารมณ์สำคัญ ปล่อยให้ความเงียบและอารมณ์ตกค้างมีพื้นที่ในข้อความ',
    pronoun_pov: 'บุคคลที่ 2 (คุณ) สำหรับผู้เล่น และบุคคลที่ 3 สำหรับตัวละคร',
    max_response_tokens: 500
  },
  warm: {
    preset_name: 'อบอุ่นหัวใจ (Warm & Bonding)',
    tone_directive: 'เน้นความสัมพันธ์เชิงบวก ความผูกพัน และช่วงเวลาสงบท่ามกลางความยากลำบาก ("ความหวังที่หาได้ยากและมีค่า") ให้พื้นที่กับความอบอุ่นเล็กๆ ระหว่างตัวละคร',
    prose_style: 'ภาษาที่นุ่มนวลกว่า มีจังหวะหายใจและรอยยิ้ม แต่ยังคงรักษาผลลัพธ์จริงของเกมอย่างซื่อสัตย์',
    pacing: 'ผ่อนคลาย อบอุ่น มีเวลาให้ตัวละครได้ปรับความเข้าใจ',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 450
  },
  romance: {
    preset_name: 'โรแมนซ์ลึกซึ้ง (Romance)',
    tone_directive: 'เน้นความใกล้ชิดทางอารมณ์ ความเปราะบาง ความไว้วางใจ และความโหยหาที่ค่อยๆ ก่อตัวขึ้นอย่างสมจริงผ่านสายตา การลังเล และการกระทำ',
    prose_style: 'ภาษาประณีต เน้นแรงดึงดูด ภาษากาย สัมผัสเบาบาง และสิ่งที่ไม่ยอมพูดตรงๆ เคารพเจตจำนงของผู้เล่น',
    pacing: 'ละเอียดอ่อน เน้นช่วงเวลาชวนประทับใจ',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 500
  },
  dark: {
    preset_name: 'ดาร์กกดดัน (Dark & Gritty)',
    tone_directive: 'โทนหนักหน่วง โลกไม่ปรานีต่อตัวละคร บรรยายผลของความรุนแรง ความสูญเสีย หรือความล้มเหลวอย่างตรงไปตรงมา บรรยากาศกดดัน สิ้นหวัง ตัวละครไม่มี plot armor',
    prose_style: 'ภาพพจน์ที่หนักแน่น กระชับ ไม่ประดับประดา ความเจ็บปวดและความสูญเสียรู้สึกได้จริง ไม่มีการเยียวยาด้วยน้ำเสียงบรรยายที่ soften ความจริง',
    pacing: 'ตึงเครียด บีบคั้น รวดเร็วและไม่ประนีประนอม',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 500
  },
  comedy: {
    preset_name: 'ขบขันมีไหวพริบ (Comedy)',
    tone_directive: 'เน้นจังหวะความตลกขบขัน ความเข้าใจผิดเล็กๆ ปมบุคลิกเฉพาะตัวละคร และบทสนทนาโต้ตอบที่คมคายเข้ากับสถานการณ์',
    prose_style: 'กระฉับกระเฉง มีมุกตลกตามสถานการณ์โดยไม่ทำลายความเป็นจริงของโลก',
    pacing: 'กระฉับกระเฉง จังหวะตบมุกคมชัด',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 450
  },
  epic: {
    preset_name: 'มหากาพย์ยิ่งใหญ่ (Epic)',
    tone_directive: 'เน้นเหตุการณ์สเกลใหญ่ สงคราม ความขัดแย้งทางการเมือง การเปิดเผยความจริงครั้งประวัติศาสตร์ และบุคคลในตำนาน',
    prose_style: 'ภาพพจน์กว้างขวาง อลังการ ภาษาทรงพลัง จังหวะมั่นคง',
    pacing: 'มีน้ำหนัก น่าเกรงขาม สง่างาม',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 600
  },
  mystery: {
    preset_name: 'ลึกลับสืบสวน (Mystery)',
    tone_directive: 'เน้นการทิ้งเบาะแส ข้อมูลไม่ครบถ้วน ความไม่แน่นอน ความขัดแย้งที่รอการคลี่คลาย และลางบอกเหตุ (Foreshadowing)',
    prose_style: 'บรรยายสังเกตการณ์ที่จับสายตาทุกรายละเอียด ไม่รีบเฉลยคำตอบ ปล่อยให้ความสงสัยนำพาเรื่อง',
    pacing: 'ระมัดระวัง ตรึงความสนใจ ชวนสืบค้น',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 500
  },
  horror: {
    preset_name: 'สยองขวัญกดประสาท (Horror)',
    tone_directive: 'เน้นความหวาดกลัวจากความไม่แน่นอน ความโดดเดี่ยว ความเปราะบาง บรรยากาศหลอน และความตึงเครียดทางจิตวิทยา ไม่พึ่งพาเพียงเลือดสาด',
    prose_style: 'บรรยายประสาทสัมผัสคมชัด เสียงแปลกปลอม ความมืด และความรู้สึกไม่ปลอดภัย',
    pacing: 'กดดัน ค่อยๆ บีบรัดหัวใจ',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 500
  },
  slice_of_life: {
    preset_name: 'เรียบง่ายสมจริง (Slice of Life)',
    tone_directive: 'จังหวะช้า เน้นรายละเอียดชีวิตประจำวัน ปฏิสัมพันธ์เล็กๆ ระหว่างตัวละคร มื้ออาหาร การเดินทาง และบทสนทนาทั่วไป',
    prose_style: 'ภาษาเรียบง่าย เป็นธรรมชาติ เก็บเกี่ยวช่วงเวลาสงบสุขระหว่างการเดินทาง',
    pacing: 'ช้า ผ่อนคลาย ละเมียดละไม',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 400
  },
  adventure: {
    preset_name: 'ผจญภัยแอ็กชัน (Action/Adventure)',
    tone_directive: 'จังหวะเร็ว กระชับ เน้น action และการเคลื่อนไหว เผชิญหน้ากับความท้าทายและการต่อสู้',
    prose_style: 'ประโยคสั้น กระแทก สร้างความรู้สึกเร่งด่วน ใช้ sensory detail ภายนอก (เสียง, การเคลื่อนไหว, เสี้ยววินาที) ลดการพรรณนาในจิตใจ เน้นสิ่งที่เกิดขึ้นภายนอก',
    pacing: 'รวดเร็ว ฉับไว น่าตื่นเต้น',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 450
  },
  tactical: {
    preset_name: 'ยุทธวิธี/สมจริงหยาบกระด้าง (Tactical & Gritty)',
    tone_directive: 'เน้นความสมจริงของผลที่ตามมาทางกายภาพและยุทธวิธี (ทำแบบนี้ → ผลแบบนี้) ไม่โรแมนติไซส์ความรุนแรง มีตรรกะและเหตุผลชัดเจน',
    prose_style: 'ภาษากระชับ ตรงประเด็น เหมือนรายงานสถานการณ์ที่แทรกความรู้สึกเข้ามาเป็นระยะ เน้นการวางแผน ทรัพยากร และการตัดสินใจใต้ความกดดัน',
    pacing: 'แม่นยำ เด็ดขาด ตรงไปตรงมา',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 450
  },
  custom: {
    preset_name: 'ปรับแต่งอิสระ (Custom Override)',
    tone_directive: 'ตามที่ผู้เล่นกำหนดเอง',
    prose_style: 'ตามที่ผู้เล่นกำหนดเอง',
    pacing: 'กำหนดเอง',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 500
  }
};

// DOM Elements
const Elements = {
  views: {
    browse: document.getElementById('view-browse'),
    slots: document.getElementById('view-slots'),
    story: document.getElementById('view-story')
  },
  header: {
    storyInfo: document.getElementById('header-story-info'),
    charAvatar: document.getElementById('header-char-avatar'),
    charName: document.getElementById('header-char-name'),
    emotionPill: document.getElementById('header-emotion-pill'),
    relStatus: document.getElementById('header-rel-status'),
    relScore: document.getElementById('header-rel-score'),
    relBar: document.getElementById('header-rel-bar'),
    storyActions: document.getElementById('story-header-actions')
  },
  browse: {
    worldsContainer: document.getElementById('worlds-container'),
    searchInput: document.getElementById('input-search-world'),
    tagFilters: document.getElementById('tag-filters-container'),
    btnCreateWorld: document.getElementById('btn-create-world-modal'),
    btnImportWorldbook: document.getElementById('btn-open-worldbook-import')
  },
  slots: {
    container: document.getElementById('slots-container'),
    charBanner: document.getElementById('slots-char-banner'),
    btnBack: document.getElementById('btn-back-to-browse'),
    btnNewSlot: document.getElementById('btn-new-slot')
  },
  story: {
    feed: document.getElementById('story-feed'),
    messagesList: document.getElementById('messages-list'),
    welcomeCard: document.getElementById('feed-welcome'),
    welcomeTitle: document.getElementById('welcome-char-title'),
    welcomeDesc: document.getElementById('welcome-char-desc'),
    typingIndicator: document.getElementById('ai-typing-indicator'),
    input: document.getElementById('story-input'),
    btnSend: document.getElementById('btn-send-turn'),
    btnModeDo: document.getElementById('btn-mode-do'),
    btnModeSay: document.getElementById('btn-mode-say'),
    modeIndicator: document.getElementById('input-mode-indicator'),
    modeLabel: document.getElementById('input-mode-label'),
    chkEnableDice: document.getElementById('chk-enable-dice'),
    btnUndo: document.getElementById('btn-undo-turn'),
    btnRegen: document.getElementById('btn-regen-turn')
  },
  drawers: {
    codex: document.getElementById('drawer-codex'),
    codexContent: document.getElementById('drawer-codex-content'),
    inventory: document.getElementById('drawer-inventory'),
    inventoryList: document.getElementById('inventory-items-list'),
    inputNewItem: document.getElementById('input-new-item'),
    btnAddItem: document.getElementById('btn-add-item'),
    preset: document.getElementById('drawer-preset'),
    selectTemplate: document.getElementById('select-style-template'),
    presetTone: document.getElementById('preset-tone'),
    presetProse: document.getElementById('preset-prose'),
    presetPacing: document.getElementById('preset-pacing'),
    presetPov: document.getElementById('preset-pov'),
    presetCustomInst: document.getElementById('preset-custom-inst'),
    presetTokens: document.getElementById('input-preset-tokens'),
    presetTokensVal: document.getElementById('val-preset-tokens'),
    btnSavePreset: document.getElementById('btn-save-preset'),
    settings: document.getElementById('drawer-settings'),
    apiKey: document.getElementById('input-api-key'),
    btnToggleKey: document.getElementById('btn-toggle-key-visibility'),
    btnTestApiKey: document.getElementById('btn-test-api-key'),
    apiVerifyBox: document.getElementById('api-verify-box'),
    verifyHeaderRow: document.getElementById('verify-header-row'),
    verifyStatusTitle: document.getElementById('verify-status-title'),
    verifyDetailText: document.getElementById('verify-detail-text'),
    headerApiDot: document.getElementById('header-api-dot'),
    modelName: document.getElementById('input-model-name'),
    baseURL: document.getElementById('input-base-url'),
    globalTokens: document.getElementById('input-global-tokens'),
    globalTokensVal: document.getElementById('val-global-tokens'),
    temperature: document.getElementById('input-temperature'),
    tempVal: document.getElementById('val-temperature'),
    btnSaveSettings: document.getElementById('btn-save-settings')
  },
  advModal: {
    modal: document.getElementById('modal-create-world'),
    btnClose: document.getElementById('btn-close-create-world'),
    btnCancel: document.getElementById('btn-cancel-create-world'),
    btnSubmit: document.getElementById('btn-submit-create-world'),
    worldName: document.getElementById('adv-world-name'),
    worldTag: document.getElementById('adv-world-tag'),
    worldDesc: document.getElementById('adv-world-desc'),
    worldCover: document.getElementById('adv-world-cover'),
    loreGeo: document.getElementById('adv-lore-geo'),
    loreMagic: document.getElementById('adv-lore-magic'),
    loreFactions: document.getElementById('adv-lore-factions'),
    charName: document.getElementById('adv-char-name'),
    charAvatar: document.getElementById('adv-char-avatar'),
    charDesc: document.getElementById('adv-char-desc'),
    charTags: document.getElementById('adv-char-tags'),
    charHistory: document.getElementById('adv-char-history'),
    statStr: document.getElementById('adv-stat-str'),
    statAgi: document.getElementById('adv-stat-agi'),
    statInt: document.getElementById('adv-stat-int'),
    statCha: document.getElementById('adv-stat-cha'),
    statPer: document.getElementById('adv-stat-per'),
    charInv: document.getElementById('adv-char-inv'),
    sec1Title: document.getElementById('adv-sec1-title'),
    sec1Content: document.getElementById('adv-sec1-content'),
    sec1Hint: document.getElementById('adv-sec1-hint'),
    charPrologue: document.getElementById('adv-char-prologue'),
    btnAiGenPrologue: document.getElementById('btn-ai-gen-prologue')
  },
  wbModal: {
    modal: document.getElementById('modal-worldbook-import'),
    title: document.getElementById('wb-modal-title'),
    subtitle: document.getElementById('wb-modal-subtitle'),
    btnClose: document.getElementById('btn-close-worldbook-import'),
    stepUpload: document.getElementById('wb-step-upload'),
    stepPreview: document.getElementById('wb-step-preview'),
    footerUpload: document.getElementById('wb-footer-upload'),
    footerPreview: document.getElementById('wb-footer-preview'),
    btnCancel: document.getElementById('btn-cancel-worldbook-import'),
    btnStartAnalyze: document.getElementById('btn-start-analyze-worldbook'),
    dropzone: document.getElementById('worldbook-dropzone'),
    fileInput: document.getElementById('file-worldbook-input'),
    rawInput: document.getElementById('input-raw-worldbook'),
    analyzingBanner: document.getElementById('wb-analyzing-indicator'),
    analyzingText: document.getElementById('wb-analyzing-text'),
    // Step 2 Preview fields
    previewWorldName: document.getElementById('wb-preview-world-name'),
    previewWorldTag: document.getElementById('wb-preview-world-tag'),
    previewWorldDesc: document.getElementById('wb-preview-world-desc'),
    previewWorldCover: document.getElementById('wb-preview-world-cover'),
    previewLoreGeo: document.getElementById('wb-preview-lore-geo'),
    previewLoreMagic: document.getElementById('wb-preview-lore-magic'),
    previewLoreFactions: document.getElementById('wb-preview-lore-factions'),
    previewLoreCustom: document.getElementById('wb-preview-lore-custom'),
    charsContainer: document.getElementById('wb-chars-preview-container'),
    charsCount: document.getElementById('wb-chars-count'),
    btnAddChar: document.getElementById('btn-wb-add-char'),
    btnBackToUpload: document.getElementById('btn-wb-back-to-upload'),
    btnCancelPreview: document.getElementById('btn-cancel-worldbook-preview'),
    btnConfirmSave: document.getElementById('btn-confirm-save-worldbook')
  }
};

function initViewportHeight() {
  const setVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  setVh();
  window.addEventListener('resize', setVh);
  window.addEventListener('orientationchange', setVh);
}

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initViewportHeight();
  setupEventListeners();
  await loadInitialData();
});

async function loadInitialData() {
  try {
    const [worldsData, charactersData, settingsData] = await Promise.all([
      API.getWorlds(),
      API.getCharacters(),
      API.getSettings()
    ]);

    State.worlds = worldsData.worlds || [];
    State.characters = charactersData.characters || [];

    if (settingsData && settingsData.settings) {
      populateSettings(settingsData.settings);
    }

    renderWorldsList(State.worlds);
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + err.message, 'error');
  }
}

// ============================================================================
// NAVIGATION & VIEW SWITCHING
// ============================================================================
function switchView(viewName) {
  State.activeView = viewName;
  Object.keys(Elements.views).forEach(key => {
    const el = Elements.views[key];
    if (el) el.classList.remove('active');
  });

  const targetEl = document.getElementById(viewName);
  if (targetEl) targetEl.classList.add('active');

  if (viewName === 'view-story') {
    Elements.header.storyInfo.style.display = 'flex';
    Elements.header.storyActions.style.display = 'flex';
  } else {
    Elements.header.storyInfo.style.display = 'none';
    Elements.header.storyActions.style.display = 'none';
  }
}

// ============================================================================
// VIEW 1: BROWSE WORLDS & CHARACTERS
// ============================================================================
function renderWorldsList(worlds) {
  Elements.browse.worldsContainer.innerHTML = '';

  if (worlds.length === 0) {
    Elements.browse.worldsContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        <i class="fa-solid fa-earth-americas" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
        ยังไม่มีโลกในระบบ กดปุ่ม "สร้างโลกละเอียด" เพื่อเริ่มสร้างจักรวาลของคุณ
      </div>
    `;
    return;
  }

  worlds.forEach(world => {
    const worldChars = State.characters.filter(c => c.world_id === world.id);
    const card = document.createElement('div');
    card.className = 'world-card';

    let charsHtml = '';
    worldChars.forEach(char => {
      charsHtml += `
        <div class="char-item-card" data-char-id="${char.id}" data-world-id="${world.id}">
          <div class="char-info-left">
            <img class="char-avatar" src="${char.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'}" alt="${char.name}">
            <div class="char-title-wrap">
              <span class="char-item-name">${char.name}</span>
              <span class="char-item-desc">${char.short_desc || ''}</span>
            </div>
          </div>
          <button class="btn btn-primary btn-sm btn-select-char" data-char-id="${char.id}" data-world-id="${world.id}">
            <i class="fa-solid fa-play"></i> เริ่มเล่น
          </button>
        </div>
      `;
    });

    card.innerHTML = `
      <img class="world-cover" src="${world.cover_image || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop'}" alt="${world.name}">
      <div class="world-card-body">
        <span class="world-tag-badge">${world.tag || 'Story'}</span>
        <h3 class="world-title">${world.name}</h3>
        <p class="world-desc">${world.description}</p>
        
        <div class="world-chars-section">
          <div class="chars-header">ตัวละครในโลกนี้ (${worldChars.length})</div>
          <div class="chars-list">
            ${charsHtml || '<span style="font-size: 12px; color: var(--text-dim);">ยังไม่มีตัวละคร</span>'}
          </div>
        </div>
      </div>
    `;

    Elements.browse.worldsContainer.appendChild(card);
  });

  // Attach click events
  document.querySelectorAll('.btn-select-char').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const worldId = btn.dataset.worldId;
      const charId = btn.dataset.charId;
      openSaveSlotsView(worldId, charId);
    });
  });
}

// ============================================================================
// VIEW 2: SAVE SLOTS MANAGER (FOLDER-BASED ISOLATED SLOTS)
// ============================================================================
async function openSaveSlotsView(worldId, characterId) {
  State.activeWorld = State.worlds.find(w => w.id === worldId);
  State.activeCharacter = State.characters.find(c => c.id === characterId);

  if (!State.activeWorld || !State.activeCharacter) {
    showToast('ไม่พบข้อมูลโลกหรือตัวละคร', 'error');
    return;
  }

  Elements.slots.charBanner.innerHTML = `
    <img class="slots-char-img" src="${State.activeCharacter.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'}">
    <div>
      <h3 style="font-size: 17px; font-weight: 700;">${State.activeCharacter.name}</h3>
      <span style="font-size: 12.5px; color: var(--text-muted);">${State.activeWorld.name}</span>
    </div>
  `;

  await loadSaveSlots(worldId, characterId);
  switchView('view-slots');
}

async function loadSaveSlots(worldId, characterId) {
  try {
    const data = await API.getSlots(worldId, characterId);
    const slots = data.slots || [];
    renderSaveSlotsList(slots);
  } catch (err) {
    showToast('โหลดเซฟล้มเหลว: ' + err.message, 'error');
  }
}

function renderSaveSlotsList(slots) {
  Elements.slots.container.innerHTML = '';

  if (slots.length === 0) {
    Elements.slots.container.innerHTML = `
      <div style="text-align: center; padding: 40px; background: var(--bg-card); border-radius: var(--radius-md);">
        <i class="fa-solid fa-feather-pointed" style="font-size: 32px; color: var(--accent-amber); margin-bottom: 12px;"></i>
        <h4 style="margin-bottom: 6px;">ยังไม่มีประวัติการเดินทางกับตัวละครนี้</h4>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">เริ่มบทสนทนาพร้อมบทนำเปิดเรื่องได้เลย (ระบบจะสร้างโฟลเดอร์เซฟแยกอิสระ)</p>
        <button id="btn-empty-new-slot" class="btn btn-primary"><i class="fa-solid fa-plus"></i> เริ่มการเดินทางใหม่</button>
      </div>
    `;
    document.getElementById('btn-empty-new-slot')?.addEventListener('click', createNewSlotHandler);
    return;
  }

  slots.forEach(slot => {
    const card = document.createElement('div');
    card.className = 'slot-card';

    const turnCount = slot.history ? slot.history.filter(h => h.role === 'user').length : 0;
    const relVal = slot.dynamic_state ? slot.dynamic_state.relationship_value : 0;
    const emotion = slot.dynamic_state ? slot.dynamic_state.current_emotion : 'ปกติ';

    card.innerHTML = `
      <div class="slot-meta">
        <span class="slot-name">${slot.slot_name || 'การเดินทาง'}</span>
        <div class="slot-stats-row">
          <span><i class="fa-regular fa-clock"></i> ${new Date(slot.updated_at).toLocaleString('th-TH')}</span>
          <span><i class="fa-solid fa-comments"></i> ${turnCount} เทิร์น</span>
          <span style="color: var(--accent-rose);"><i class="fa-solid fa-heart"></i> ความผูกพัน: ${relVal >= 0 ? '+' : ''}${relVal}</span>
          <span style="color: var(--accent-amber);"><i class="fa-regular fa-face-smile"></i> ${emotion}</span>
        </div>
      </div>
      <div class="slot-actions">
        <button class="btn btn-secondary btn-sm btn-delete-slot" data-slot-id="${slot.id}" title="ลบเซฟนี้">
          <i class="fa-solid fa-trash"></i>
        </button>
        <button class="btn btn-primary btn-sm btn-play-slot" data-slot-id="${slot.id}">
          <i class="fa-solid fa-door-open"></i> เล่นต่อ
        </button>
      </div>
    `;

    Elements.slots.container.appendChild(card);
  });

  // Attach slot actions
  document.querySelectorAll('.btn-play-slot').forEach(btn => {
    btn.addEventListener('click', () => {
      openStoryRoom(btn.dataset.slotId);
    });
  });

  document.querySelectorAll('.btn-delete-slot').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('คุณต้องการลบโฟลเดอร์เซฟนี้ใช่หรือไม่? ข้อมูลการสนทนาจะหายไปอย่างถาวร')) {
        await API.deleteSlot(btn.dataset.slotId);
        showToast('ลบโฟลเดอร์เซฟเรียบร้อย', 'info');
        loadSaveSlots(State.activeWorld.id, State.activeCharacter.id);
      }
    });
  });
}

async function createNewSlotHandler() {
  if (!State.activeWorld || !State.activeCharacter) return;
  try {
    const slotName = `การเดินทาง ${new Date().toLocaleDateString('th-TH')} - ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
    const data = await API.createSlot({
      world_id: State.activeWorld.id,
      character_id: State.activeCharacter.id,
      slot_name: slotName
    });

    showToast('สร้างโฟลเดอร์เซฟแยกอิสระพร้อมบทนำสำเร็จ!', 'success');
    openStoryRoom(data.slot.id);
  } catch (err) {
    showToast('สร้างเซฟไม่สำเร็จ: ' + err.message, 'error');
  }
}

// ============================================================================
// VIEW 3: MAIN STORY & ROLEPLAY CHATROOM (KHUIAI UI)
// ============================================================================
async function openStoryRoom(slotId) {
  try {
    const data = await API.getSlot(slotId);
    State.activeSlot = data.slot;
    State.activeCharacter = data.character;
    State.activeWorld = data.world;

    updateHeaderUI();
    renderChatMessages(State.activeSlot.history || []);
    renderCodexDrawer();
    renderInventoryDrawer();
    renderPresetDrawer();

    switchView('view-story');
    scrollToBottom();
  } catch (err) {
    showToast('ไม่สามารถเปิดห้องเล่นได้: ' + err.message, 'error');
  }
}

function updateHeaderUI() {
  if (!State.activeCharacter || !State.activeSlot) return;

  Elements.header.charAvatar.src = State.activeCharacter.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop';
  Elements.header.charName.innerText = State.activeCharacter.name;
  
  const dynamicState = State.activeSlot.dynamic_state || {};
  const scene = dynamicState.scene || { day: 1, time: "08:30", location: "โรงเรียนวีรชน" };
  const totalNpcs = (State.activeSlot.roster?.length || 0) + (State.activeSlot.discovered_npcs?.length || 0);

  Elements.header.emotionPill.innerText = `👑 คุณ (${State.activeCharacter.name.split(' ')[0]})`;
  Elements.header.relStatus.innerText = `📍 วันที่ ${scene.day} | ${scene.location}`;
  Elements.header.relScore.innerText = `👥 ${totalNpcs} NPCs`;

  const codexBtn = document.getElementById('btn-open-codex');
  if (codexBtn) {
    const textSpan = codexBtn.querySelector('.btn-text-responsive');
    if (textSpan) textSpan.innerText = `Codex (${totalNpcs})`;
  }

  Elements.story.welcomeTitle.innerText = `การผจญภัยของ ${State.activeCharacter.name}`;
  Elements.story.welcomeDesc.innerText = State.activeCharacter.short_desc || 'พร้อมสำหรับการผจญภัยในโลกนี้';
}

function renderChatMessages(history) {
  Elements.story.messagesList.innerHTML = '';

  if (!history || history.length === 0) {
    Elements.story.welcomeCard.style.display = 'block';
    return;
  }

  Elements.story.welcomeCard.style.display = 'none';

  history.forEach((msg, idx) => {
    const msgEl = createMessageElement(msg, idx === history.length - 1);
    Elements.story.messagesList.appendChild(msgEl);
  });
}



function formatProseContent(rawText, scene = null) {
  if (!rawText) return '';
  
  let content = rawText;
  let sceneChipHtml = '';

  // Match 📍 **[ วันที่ X | เวลา XX:XX น. | สถานที่: ... ]**
  const sceneMatch = content.match(/📍\s*\*\*\[\s*วันที่\s*([^|]+)\|\s*เวลา\s*([^|]+)\|\s*สถานที่:\s*([^\]]+)\]\*\*/);
  if (sceneMatch) {
    const day = sceneMatch[1].trim();
    const time = sceneMatch[2].trim();
    const loc = sceneMatch[3].trim();
    sceneChipHtml = `<div class="scene-status-chip"><i class="fa-solid fa-location-dot"></i> วันที่ ${day} • ${time} • ${loc}</div>`;
    content = content.replace(sceneMatch[0], '').trim();
  } else if (scene) {
    sceneChipHtml = `<div class="scene-status-chip"><i class="fa-solid fa-location-dot"></i> วันที่ ${scene.day || 1} • เวลา ${scene.time || '08:30'} น. • ${scene.location || 'จุดเริ่มต้น'}</div>`;
  }

  const paragraphs = content.split('\n\n').filter(p => p.trim());
  
  const bodyHtml = paragraphs.map(para => {
    let formatted = escapeHtml(para);
    formatted = formatted.replace(/"([^"]+)"/g, '<span class="ai-dialogue">"$1"</span>');
    formatted = formatted.replace(/“([^”]+)”/g, '<span class="ai-dialogue">“$1”</span>');
    return `<p>${formatted}</p>`;
  }).join('');

  return sceneChipHtml + bodyHtml;
}

function createMessageElement(msg, isLast) {
  const item = document.createElement('div');
  item.className = `message-item ${msg.role === 'user' ? 'user-message' : 'ai-message'}`;

  if (msg.role === 'user') {
    const isDo = msg.type === 'Do';
    item.innerHTML = `
      <div class="user-bubble">
        <span class="user-tag-pill">${isDo ? '⚔️ DO (กระทำ)' : '💬 SAY (คำพูด)'}</span>
        <div>${escapeHtml(msg.content)}</div>
      </div>
    `;
  } else {
    // AI Storyteller / Prologue Message
    let fateHtml = '';
    if (msg.fateResult && msg.fateResult.badgeText) {
      fateHtml = `
        <div class="fate-badge-card ${msg.fateResult.tier}">
          <span>${msg.fateResult.badgeText}</span>
        </div>
      `;
    }

    let prologueRibbon = '';
    if (msg.is_prologue) {
      prologueRibbon = `
        <div class="prologue-ribbon">
          <i class="fa-solid fa-book-open"></i>
          <span>บทนำเปิดฉากการเดินทาง (Prologue)</span>
        </div>
      `;
    }

    let consequenceHtml = '';
    if (msg.consequence && msg.consequence.consequence_summary && msg.consequence.consequence_summary !== 'การสนทนาดำเนินต่อไป') {
      consequenceHtml = `
        <div class="consequence-alert-pill">
          <i class="fa-solid fa-sparkles"></i>
          <span>${escapeHtml(msg.consequence.consequence_summary)}</span>
        </div>
      `;
    }

    const formattedBody = formatProseContent(msg.content, msg.scene);

    item.innerHTML = `
      ${prologueRibbon}
      ${fateHtml}
      <div class="ai-prose-bubble ${msg.is_prologue ? 'is-prologue-card' : ''}">
        ${formattedBody}
        ${consequenceHtml}
      </div>
    `;
  }

  return item;
}

function renderDiscoveredNpcPrompt(npc) {
  if (!npc || !npc.name) return;

  const card = document.createElement('div');
  card.className = 'npc-discovery-card';
  card.id = 'npc-prompt-' + Date.now();
  card.innerHTML = `
    <div class="npc-discovery-header">
      <i class="fa-solid fa-user-plus"></i>
      <span>พบตัวละครใหม่: <strong>${escapeHtml(npc.name)}</strong> (${escapeHtml(npc.role || 'NPC')})</span>
    </div>
    <div class="npc-discovery-desc">${escapeHtml(npc.brief_desc || 'ตัวละครที่เพิ่งมีปฏิสัมพันธ์ในเนื้อเรื่อง')}</div>
    <div class="npc-discovery-actions">
      <button class="btn btn-sm btn-primary btn-remember-npc">
        <i class="fa-solid fa-bookmark"></i> ✅ จดจำลง Worldbook
      </button>
      <button class="btn btn-sm btn-ghost btn-ignore-npc">
        <i class="fa-solid fa-xmark"></i> ❌ ไม่จำ (ปล่อยผ่าน)
      </button>
    </div>
  `;

  Elements.story.messagesList.appendChild(card);
  scrollToBottom();

  card.querySelector('.btn-remember-npc')?.addEventListener('click', async () => {
    try {
      const res = await API.rememberNPC(State.activeSlot.id, npc);
      State.activeSlot = res.slot;
      renderCodexDrawer();
      card.innerHTML = `
        <div style="color: var(--accent-emerald); font-size: 13px; font-weight: 600;">
          <i class="fa-solid fa-circle-check"></i> บันทึก <strong>${escapeHtml(npc.name)}</strong> ลงใน Worldbook & Codex เรียบร้อยแล้ว!
        </div>
      `;
      showToast(`จดจำตัวละคร ${npc.name} เรียบร้อย!`, 'success');
      setTimeout(() => card.remove(), 3000);
    } catch (err) {
      showToast('จดจำตัวละครไม่สำเร็จ: ' + err.message, 'error');
    }
  });

  card.querySelector('.btn-ignore-npc')?.addEventListener('click', () => {
    card.style.opacity = '0';
    setTimeout(() => card.remove(), 250);
  });
}

function scrollToBottom() {
  setTimeout(() => {
    if (Elements.story && Elements.story.feed) {
      Elements.story.feed.scrollTop = Elements.story.feed.scrollHeight;
    }
  }, 50);
}

/**
 * Interactive Live 3D D20 Dice Rolling Animation
 */
function playD20LiveRollAnimation(fateResultPromise) {
  return new Promise((resolve, reject) => {
    const overlay = document.createElement('div');
    overlay.className = 'd20-live-dice-overlay';
    overlay.innerHTML = `
      <div class="d20-dice-container">
        <div class="d20-dice-hex" id="active-live-d20">
          <span class="d20-live-number" id="active-live-d20-num">1</span>
        </div>
      </div>
      <div class="d20-roll-info">
        <div class="d20-roll-title"><i class="fa-solid fa-dice-d20"></i> กำลังทอยลูกเต๋า D20...</div>
        <div class="d20-roll-desc" id="active-live-d20-desc">กำหนดชะตาและผลกระทบของฉาก</div>
      </div>
    `;
    document.body.appendChild(overlay);

    const numEl = overlay.querySelector('#active-live-d20-num');
    const hexEl = overlay.querySelector('#active-live-d20');
    const titleEl = overlay.querySelector('.d20-roll-title');
    const descEl = overlay.querySelector('#active-live-d20-desc');

    // Rapid spinning numbers (1-20)
    let currentNum = 1;
    const spinInterval = setInterval(() => {
      currentNum = Math.floor(Math.random() * 20) + 1;
      if (numEl) numEl.innerText = currentNum;
    }, 60);

    const startTime = Date.now();

    fateResultPromise.then(res => {
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 900 - elapsed);

      setTimeout(() => {
        clearInterval(spinInterval);
        const fate = res.fateResult || { d20: 10, tier: 'success', tier_th: 'สำเร็จ', total: 10, targetDC: 12 };
        
        if (numEl) numEl.innerText = fate.d20;
        if (hexEl) {
          hexEl.classList.add('settled');
          if (fate.tier === 'critical_success' || fate.d20 === 20) {
            hexEl.classList.add('critical-success');
          } else if (fate.tier === 'critical_failure' || fate.d20 === 1) {
            hexEl.classList.add('critical-failure');
          }
        }

        if (titleEl) titleEl.innerHTML = `🎲 ผลลัพธ์: <strong>${fate.tier_th}</strong>`;
        if (descEl) descEl.innerHTML = `[D20: ${fate.d20}] + [${fate.statName || 'Mod'}: ${fate.modifier >= 0 ? '+' : ''}${fate.modifier || 0}] = <strong>${fate.total}</strong> (DC: ${fate.targetDC || 12})`;

        setTimeout(() => {
          overlay.style.transition = 'opacity 0.3s ease';
          overlay.style.opacity = '0';
          setTimeout(() => {
            overlay.remove();
            resolve(res);
          }, 300);
        }, 750);
      }, remainingTime);
    }).catch(err => {
      clearInterval(spinInterval);
      overlay.remove();
      reject(err);
    });
  });
}

// ============================================================================
// TURN EXECUTION (FAST & TOKEN-CONTROLLED PIPELINE WITH LIVE D20)
// ============================================================================
async function handleSendTurn() {
  if (State.isLoadingTurn || !State.activeSlot) return;

  const text = Elements.story.input.value.trim();
  if (!text) return;

  const mode = State.currentMode;
  const enableDice = Elements.story.chkEnableDice.checked;

  Elements.story.input.value = '';
  Elements.story.input.style.height = 'auto';

  const userTurn = {
    role: 'user',
    type: mode,
    content: text
  };

  Elements.story.welcomeCard.style.display = 'none';
  Elements.story.messagesList.appendChild(createMessageElement(userTurn, true));
  scrollToBottom();

  State.isLoadingTurn = true;
  Elements.story.btnSend.disabled = true;
  Elements.story.typingIndicator.style.display = 'flex';

  try {
    let res;
    if (enableDice) {
      const apiPromise = API.sendTurn(State.activeSlot.id, {
        type: mode,
        text: text
      }, {
        skipRoll: false
      });
      res = await playD20LiveRollAnimation(apiPromise);
    } else {
      res = await API.sendTurn(State.activeSlot.id, {
        type: mode,
        text: text
      }, {
        skipRoll: true
      });
    }

    State.activeSlot.dynamic_state = res.dynamic_state;
    State.activeSlot.inventory = res.inventory;
    State.activeSlot.codex_notes = res.codex_notes;
    State.activeSlot.discovered_npcs = res.discovered_npcs;
    if (res.roster) State.activeSlot.roster = res.roster;
    State.activeSlot.history.push(res.userTurn, res.aiTurn);

    Elements.story.typingIndicator.style.display = 'none';
    Elements.story.messagesList.appendChild(createMessageElement(res.aiTurn, true));
    
    // Check if a new NPC was discovered in this turn
    if (res.discovered_npc && res.discovered_npc.name) {
      renderDiscoveredNpcPrompt(res.discovered_npc);
    }

    updateHeaderUI();
    renderCodexDrawer();
    renderInventoryDrawer();
    scrollToBottom();
  } catch (err) {
    Elements.story.typingIndicator.style.display = 'none';
    showToast('เกิดข้อผิดพลาดในการประมวลผล: ' + err.message, 'error');
  } finally {
    State.isLoadingTurn = false;
    Elements.story.btnSend.disabled = false;
  }
}

// ============================================================================
// REGENERATE & UNDO
// ============================================================================
async function handleRegenerate() {
  if (State.isLoadingTurn || !State.activeSlot || State.activeSlot.history.length < 2) {
    showToast('ยังไม่มีข้อความให้เขียนใหม่', 'info');
    return;
  }

  State.isLoadingTurn = true;
  Elements.story.typingIndicator.style.display = 'flex';
  document.getElementById('typing-status-text').innerText = 'AI #3 กำลังเขียนคำบรรยายใหม่...';

  try {
    const res = await API.regenerate(State.activeSlot.id);
    State.activeSlot.history[State.activeSlot.history.length - 1] = res.aiTurn;
    
    renderChatMessages(State.activeSlot.history);
    showToast('เขียนคำบรรยายใหม่สำเร็จ!', 'success');
  } catch (err) {
    showToast('รีเจนไม่สำเร็จ: ' + err.message, 'error');
  } finally {
    State.isLoadingTurn = false;
    Elements.story.typingIndicator.style.display = 'none';
    document.getElementById('typing-status-text').innerText = 'DeepSeek กำลังประมวลผล...';
  }
}

async function handleUndo() {
  if (State.isLoadingTurn || !State.activeSlot) return;

  try {
    const res = await API.undoTurn(State.activeSlot.id);
    State.activeSlot = res.slot;

    updateHeaderUI();
    renderChatMessages(State.activeSlot.history || []);
    renderCodexDrawer();
    renderInventoryDrawer();
    showToast('ย้อนกลับสถานะสำเร็จ (Undo)', 'info');
  } catch (err) {
    showToast('ไม่มีย้อนกลับก่อนหน้านี้: ' + err.message, 'info');
  }
}

// ============================================================================
// DRAWERS & MODALS RENDERING
// ============================================================================
let activeCodexTab = 'social'; // 'protagonist' | 'social' | 'world'

function renderCodexDrawer() {
  if (!State.activeSlot || !State.activeCharacter) return;

  const character = State.activeCharacter;
  const world = State.activeWorld || {};
  const slot = State.activeSlot;
  const stats = character.static_profile?.base_stats || {};

  const roster = slot.roster || [];
  const discoveredNpcs = slot.discovered_npcs || [];
  const allNpcs = [...roster, ...discoveredNpcs];

  // 1. PROTAGONIST SECRETS HTML
  let protagSecretsHtml = '';
  const codexNotes = slot.codex_notes || [];
  codexNotes.forEach(note => {
    if (note.unlocked) {
      protagSecretsHtml += `
        <div class="secret-note-card unlocked">
          <div class="secret-title"><i class="fa-solid fa-unlock-keyhole"></i> ${escapeHtml(note.title)}</div>
          <div class="secret-content">${escapeHtml(note.content)}</div>
        </div>
      `;
    } else {
      protagSecretsHtml += `
        <div class="secret-note-card">
          <div class="secret-title"><i class="fa-solid fa-lock"></i> ??? (${escapeHtml(note.title || 'ความลับยังไม่เปิดเผย')})</div>
          <div class="secret-content" style="color: var(--text-dim); font-style: italic;">
            คำใบ้: ${escapeHtml(note.hint || 'พูดคุยและสร้างความผูกพัน')}
          </div>
        </div>
      `;
    }
  });

  // 2. WORLD SOCIAL ROSTER HTML
  let npcsSocialHtml = '';
  if (allNpcs.length === 0) {
    npcsSocialHtml = `<div style="text-align: center; padding: 24px; color: var(--text-dim); font-size: 13px;">ยังไม่พบตัวละครอื่นในเซฟนี้</div>`;
  } else {
    allNpcs.forEach(npc => {
      const relVal = npc.relationship_value || 0;
      let badgeClass = 'neutral';
      if (relVal > 0) badgeClass = 'positive';
      if (relVal < 0) badgeClass = 'negative';

      const relPercent = Math.min(100, Math.max(0, ((relVal + 100) / 200) * 100));
      const relColor = relVal > 0 ? 'var(--status-good)' : relVal < 0 ? 'var(--status-bad)' : 'var(--text-dim)';

      // NPC Secret Notes HTML
      let npcSecretsHtml = '';
      if (Array.isArray(npc.codex_notes) && npc.codex_notes.length > 0) {
        npc.codex_notes.forEach(sn => {
          if (sn.unlocked) {
            npcSecretsHtml += `
              <div class="secret-note-card unlocked">
                <div class="secret-title"><i class="fa-solid fa-unlock-keyhole"></i> ${escapeHtml(sn.title)}</div>
                <div class="secret-content">${escapeHtml(sn.content)}</div>
              </div>
            `;
          } else {
            npcSecretsHtml += `
              <div class="secret-note-card">
                <div class="secret-title"><i class="fa-solid fa-lock"></i> 🔒 ${escapeHtml(sn.title || 'ความลับที่ซ่อนอยู่')}</div>
                <div class="secret-content" style="color: var(--text-dim); font-style: italic;">
                  คำใบ้: ${escapeHtml(sn.unlock_hint || sn.hint || 'ร่วมเดินทางและพูดคุยเปิดใจ')}
                </div>
              </div>
            `;
          }
        });
      }

      npcsSocialHtml += `
        <div class="npc-social-card">
          <div class="npc-social-header">
            <img src="${escapeHtml(npc.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop')}" alt="${escapeHtml(npc.name)}" class="npc-social-avatar" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'">
            <div class="npc-social-header-info">
              <div class="npc-social-name">
                <span>${escapeHtml(npc.name)}</span>
                <span class="npc-rel-badge ${badgeClass}">${relVal >= 0 ? '+' : ''}${relVal}</span>
              </div>
              <span class="npc-role-tag">${escapeHtml(npc.role || npc.short_desc || 'ตัวละครในโลก')}</span>
            </div>
          </div>

          <div class="npc-rel-container">
            <div class="npc-rel-header-row">
              <span>สถานะ: <strong style="color: ${relColor};">${escapeHtml(npc.relationship_status || 'เป็นกลาง')}</strong></span>
              <span class="npc-emotion-chip"><i class="fa-solid fa-comment-dots"></i> ${escapeHtml(npc.current_emotion || 'ปกติ')}</span>
            </div>
            <div class="npc-rel-bar">
              <div class="npc-rel-progress" style="width: ${relPercent}%; background: ${relColor};"></div>
            </div>
          </div>

          ${npc.short_desc ? `<p class="npc-bio-text">${escapeHtml(npc.short_desc)}</p>` : ''}

          ${npcSecretsHtml ? `
            <div class="npc-secrets-box">
              <span style="font-size: 11.5px; font-weight: 700; color: var(--accent-amber);"><i class="fa-solid fa-key"></i> บันทึกลับและความทรงจำ:</span>
              ${npcSecretsHtml}
            </div>
          ` : ''}
        </div>
      `;
    });
  }

  // 3. TAB 1: PROTAGONIST HTML
  const tabProtagonistHtml = `
    <div id="codex-pane-protag" class="codex-pane ${activeCodexTab === 'protagonist' ? 'active' : ''}">
      <div class="codex-profile-card">
        <img class="codex-avatar" src="${character.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'}">
        <div>
          <span style="font-size: 11px; background: rgba(245, 158, 11, 0.2); color: #fde68a; padding: 2px 8px; border-radius: var(--radius-full); font-weight: 600;">👑 ตัวละครของคุณ (Protagonist)</span>
          <h3 style="font-size: 16px; font-weight: 700; margin-top: 4px;">${escapeHtml(character.name)}</h3>
          <p style="font-size: 12px; color: var(--text-muted);">${escapeHtml(character.short_desc || '')}</p>
        </div>
      </div>

      <div style="margin-top: 14px;">
        <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--text-dim);">ประวัติ ความมุ่งมั่น และเป้าหมาย</h4>
        <p style="font-size: 13px; line-height: 1.6; color: var(--text-muted); background: var(--bg-card); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-card);">
          ${escapeHtml(character.static_profile?.history || 'ไม่มีข้อมูลเพิ่มเติม')}
        </p>
      </div>

      <div style="margin-top: 14px;">
        <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--text-dim);">ค่าพลังพื้นฐาน (Base Stats สำหรับทอยเต๋า D20)</h4>
        <div class="codex-stats-grid">
          <div class="stat-box"><span>💪 พละกำลัง (STR)</span><strong>${stats.strength || 10}</strong></div>
          <div class="stat-box"><span>🏃 ความว่องไว (AGI)</span><strong>${stats.agility || 10}</strong></div>
          <div class="stat-box"><span>🧠 สติปัญญา (INT)</span><strong>${stats.intelligence || 10}</strong></div>
          <div class="stat-box"><span>✨ เสน่ห์/เจรจา (CHA)</span><strong>${stats.charisma || 10}</strong></div>
          <div class="stat-box" style="grid-column: 1/-1;"><span>👁️ สัมผัสพิเศษ (PER)</span><strong>${stats.perception || 10}</strong></div>
        </div>
      </div>

      <div style="margin-top: 14px;">
        <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--accent-amber);"><i class="fa-solid fa-lock"></i> บันทึกลับส่วนตัว (Secret Notes)</h4>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${protagSecretsHtml || '<span style="font-size: 12px; color: var(--text-dim);">ไม่มีบันทึกลับ</span>'}
        </div>
      </div>
    </div>
  `;

  // 4. TAB 2: SOCIAL ROSTER HTML
  const tabSocialHtml = `
    <div id="codex-pane-social" class="codex-pane ${activeCodexTab === 'social' ? 'active' : ''}">
      <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
        ความสัมพันธ์ อารมณ์ และบันทึกลับของตัวละครทุกคนที่คุณพบเจอในโลกนี้ (${allNpcs.length} คน)
      </p>
      <div class="npcs-social-list">
        ${npcsSocialHtml}
      </div>
    </div>
  `;

  // 5. TAB 3: WORLD LORE HTML
  const loreDetails = world.lore_details || {};
  const tabWorldHtml = `
    <div id="codex-pane-world" class="codex-pane ${activeCodexTab === 'world' ? 'active' : ''}">
      <div style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 14px; margin-bottom: 12px;">
        <span style="font-size: 11px; color: var(--accent-amber); font-weight: 700;">${escapeHtml(world.tag || 'Hero Academy')}</span>
        <h3 style="font-size: 16px; font-weight: 700; margin: 4px 0 8px 0;">${escapeHtml(world.name || '')}</h3>
        <p style="font-size: 12.5px; line-height: 1.5; color: var(--text-muted);">${escapeHtml(world.description || '')}</p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${loreDetails.geography ? `
          <div style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 12px;">
            <h4 style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;"><i class="fa-solid fa-mountain-sun" style="color: #60a5fa;"></i> ภูมิศาสตร์ & สถานที่</h4>
            <p style="font-size: 12px; line-height: 1.5; color: var(--text-muted);">${escapeHtml(loreDetails.geography)}</p>
          </div>
        ` : ''}

        ${loreDetails.magic_rules ? `
          <div style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 12px;">
            <h4 style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;"><i class="fa-solid fa-bolt" style="color: var(--accent-amber);"></i> ระบบเจตจำนง (Will) & กฎพลัง</h4>
            <p style="font-size: 12px; line-height: 1.5; color: var(--text-muted);">${escapeHtml(loreDetails.magic_rules)}</p>
          </div>
        ` : ''}

        ${loreDetails.factions ? `
          <div style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 12px;">
            <h4 style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;"><i class="fa-solid fa-shield-halved" style="color: #f43f5e;"></i> ฝ่ายและองค์กร</h4>
            <p style="font-size: 12px; line-height: 1.5; color: var(--text-muted);">${escapeHtml(loreDetails.factions)}</p>
          </div>
        ` : ''}

        ${loreDetails.custom_lore ? `
          <div style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 12px;">
            <h4 style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;"><i class="fa-solid fa-scroll" style="color: #34d399;"></i> กฎ Canon & ธรรมเนียม</h4>
            <p style="font-size: 12px; line-height: 1.5; color: var(--text-muted);">${escapeHtml(loreDetails.custom_lore)}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Render entire Drawer Body with Tab Bar
  Elements.drawers.codexContent.innerHTML = `
    <div class="codex-tab-bar">
      <button type="button" class="codex-tab-btn ${activeCodexTab === 'social' ? 'active' : ''}" data-tab="social">
        <i class="fa-solid fa-users"></i> ความสัมพันธ์ (${allNpcs.length})
      </button>
      <button type="button" class="codex-tab-btn ${activeCodexTab === 'protagonist' ? 'active' : ''}" data-tab="protagonist">
        <i class="fa-solid fa-user"></i> ตัวคุณ (${escapeHtml(character.name.split(' ')[0])})
      </button>
      <button type="button" class="codex-tab-btn ${activeCodexTab === 'world' ? 'active' : ''}" data-tab="world">
        <i class="fa-solid fa-globe"></i> ข้อมูลโลก
      </button>
    </div>

    ${tabSocialHtml}
    ${tabProtagonistHtml}
    ${tabWorldHtml}
  `;

  // Add click listeners to drawer tabs
  Elements.drawers.codexContent.querySelectorAll('.codex-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCodexTab = btn.dataset.tab;
      renderCodexDrawer();
    });
  });
}

function renderInventoryDrawer() {
  if (!State.activeSlot) return;
  const items = State.activeSlot.inventory || [];
  Elements.drawers.inventoryList.innerHTML = '';

  if (items.length === 0) {
    Elements.drawers.inventoryList.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--text-dim);">ไม่มีไอเทมในกระเป๋า</div>
    `;
    return;
  }

  items.forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = 'inv-item';
    el.innerHTML = `
      <span><i class="fa-solid fa-cube" style="color: var(--accent-amber); margin-right: 8px;"></i> ${escapeHtml(item)}</span>
      <button class="btn btn-ghost btn-sm btn-remove-item" data-idx="${idx}" title="ทิ้งไอเทม">&times;</button>
    `;
    Elements.drawers.inventoryList.appendChild(el);
  });

  document.querySelectorAll('.btn-remove-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx, 10);
      State.activeSlot.inventory.splice(idx, 1);
      await API.updateInventory(State.activeSlot.id, State.activeSlot.inventory);
      renderInventoryDrawer();
    });
  });
}

function renderPresetDrawer() {
  if (!State.activeSlot) return;
  const preset = State.activeSlot.style_preset || PRESET_TEMPLATES.drama;

  Elements.drawers.presetTone.value = preset.tone_directive || '';
  Elements.drawers.presetProse.value = preset.prose_style || '';
  Elements.drawers.presetPacing.value = preset.pacing || '';
  Elements.drawers.presetPov.value = preset.pronoun_pov || '';
  Elements.drawers.presetCustomInst.value = preset.custom_instructions || '';
  
  const tokens = preset.max_response_tokens || 500;
  Elements.drawers.presetTokens.value = tokens;
  Elements.drawers.presetTokensVal.innerText = `${tokens} tokens`;

  updateChipActiveState(tokens);
}

function updateChipActiveState(tokens) {
  document.querySelectorAll('.btn-token-chip').forEach(chip => {
    if (parseInt(chip.dataset.tokens, 10) === parseInt(tokens, 10)) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

function populateSettings(settings) {
  if (!settings) return;
  Elements.drawers.apiKey.value = settings.apiKey || '';
  Elements.drawers.modelName.value = settings.model || 'deepseek-chat';
  Elements.drawers.baseURL.value = settings.baseURL || 'https://api.deepseek.com';
  Elements.drawers.temperature.value = settings.temperature || 0.85;
  Elements.drawers.tempVal.innerText = settings.temperature || 0.85;
  
  const tokens = settings.maxTokens || 500;
  Elements.drawers.globalTokens.value = tokens;
  Elements.drawers.globalTokensVal.innerText = tokens;

  if (Elements.drawers.headerApiDot) {
    if (settings.apiKey && settings.apiKey.trim()) {
      Elements.drawers.headerApiDot.className = 'api-status-dot green';
    } else {
      Elements.drawers.headerApiDot.className = 'api-status-dot red';
    }
  }
}

// ============================================================================
// EVENT LISTENERS & MODAL CONTROLS
// ============================================================================
function setupEventListeners() {
  // Navigation
  document.getElementById('btn-home')?.addEventListener('click', () => switchView('view-browse'));
  Elements.slots.btnBack?.addEventListener('click', () => switchView('view-browse'));
  Elements.slots.btnNewSlot?.addEventListener('click', createNewSlotHandler);

  // DO / SAY Toggle Mode
  Elements.story.btnModeDo?.addEventListener('click', () => setInteractionMode('Do'));
  Elements.story.btnModeSay?.addEventListener('click', () => setInteractionMode('Say'));

  // Story Input & Sending (Mobile & Desktop Friendly)
  Elements.story.btnSend?.addEventListener('click', handleSendTurn);
  Elements.story.input?.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    const isMobile = window.innerWidth <= 768;
    if (!isMobile && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendTurn();
    }
  });

  // Auto-resize textarea
  Elements.story.input?.addEventListener('input', () => {
    Elements.story.input.style.height = 'auto';
    const newHeight = Math.max(38, Math.min(140, Elements.story.input.scrollHeight));
    Elements.story.input.style.height = newHeight + 'px';
  });

  // Focus event on mobile: Auto scroll into view
  Elements.story.input?.addEventListener('focus', () => {
    setTimeout(() => {
      scrollToBottom();
      Elements.story.input?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 250);
  });

  // Floating Quick-Summon Type Button (Mobile)
  document.getElementById('btn-floating-type')?.addEventListener('click', () => {
    if (Elements.story.input) {
      Elements.story.input.focus();
      scrollToBottom();
      Elements.story.input.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  });

  // Quick Action Buttons
  Elements.story.btnRegen?.addEventListener('click', handleRegenerate);
  Elements.story.btnUndo?.addEventListener('click', handleUndo);

  // Drawers Toggle
  document.getElementById('btn-open-codex')?.addEventListener('click', () => openDrawer('drawer-codex'));
  document.getElementById('btn-open-inventory')?.addEventListener('click', () => openDrawer('drawer-inventory'));
  document.getElementById('btn-open-preset')?.addEventListener('click', () => openDrawer('drawer-preset'));
  document.getElementById('btn-open-slots')?.addEventListener('click', () => {
    if (State.activeWorld && State.activeCharacter) {
      openSaveSlotsView(State.activeWorld.id, State.activeCharacter.id);
    }
  });
  document.getElementById('btn-open-settings')?.addEventListener('click', () => openDrawer('drawer-settings'));

  // Drawer Close Buttons & Overlays
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const drawerId = btn.dataset.close;
      closeDrawer(drawerId);
    });
  });

  // Preset Tokens Slider & Chips
  Elements.drawers.presetTokens?.addEventListener('input', (e) => {
    const val = e.target.value;
    Elements.drawers.presetTokensVal.innerText = `${val} tokens`;
    updateChipActiveState(val);
  });

  document.querySelectorAll('.btn-token-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const tokens = chip.dataset.tokens;
      Elements.drawers.presetTokens.value = tokens;
      Elements.drawers.presetTokensVal.innerText = `${tokens} tokens`;
      updateChipActiveState(tokens);
    });
  });

  // Style Preset Template Selector
  Elements.drawers.selectTemplate?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (PRESET_TEMPLATES[val]) {
      const tmpl = PRESET_TEMPLATES[val];
      Elements.drawers.presetTone.value = tmpl.tone_directive;
      Elements.drawers.presetProse.value = tmpl.prose_style;
      Elements.drawers.presetPacing.value = tmpl.pacing;
      Elements.drawers.presetPov.value = tmpl.pronoun_pov;
      if (tmpl.max_response_tokens) {
        Elements.drawers.presetTokens.value = tmpl.max_response_tokens;
        Elements.drawers.presetTokensVal.innerText = `${tmpl.max_response_tokens} tokens`;
        updateChipActiveState(tmpl.max_response_tokens);
      }
    }
  });

  // Save Style Preset
  Elements.drawers.btnSavePreset?.addEventListener('click', async () => {
    if (!State.activeSlot) return;
    const updatedPreset = {
      tone_directive: Elements.drawers.presetTone.value,
      prose_style: Elements.drawers.presetProse.value,
      pacing: Elements.drawers.presetPacing.value,
      pronoun_pov: Elements.drawers.presetPov.value,
      custom_instructions: Elements.drawers.presetCustomInst.value,
      max_response_tokens: parseInt(Elements.drawers.presetTokens.value, 10)
    };

    try {
      await API.updatePreset(State.activeSlot.id, updatedPreset);
      State.activeSlot.style_preset = updatedPreset;
      showToast('บันทึกสไตล์ & ความเร็วสำเร็จ', 'success');
      closeDrawer('drawer-preset');
    } catch (err) {
      showToast('บันทึกสไตล์ล้มเหลว: ' + err.message, 'error');
    }
  });

  // Add Inventory Item
  Elements.drawers.btnAddItem?.addEventListener('click', async () => {
    const item = Elements.drawers.inputNewItem.value.trim();
    if (!item || !State.activeSlot) return;

    State.activeSlot.inventory.push(item);
    Elements.drawers.inputNewItem.value = '';
    await API.updateInventory(State.activeSlot.id, State.activeSlot.inventory);
    renderInventoryDrawer();
    showToast('เพิ่มไอเทมเรียบร้อย', 'success');
  });

  // Settings Handlers
  Elements.drawers.globalTokens?.addEventListener('input', (e) => {
    Elements.drawers.globalTokensVal.innerText = e.target.value;
  });

  Elements.drawers.temperature?.addEventListener('input', (e) => {
    Elements.drawers.tempVal.innerText = e.target.value;
  });

  Elements.drawers.btnToggleKey?.addEventListener('click', () => {
    const type = Elements.drawers.apiKey.type === 'password' ? 'text' : 'password';
    Elements.drawers.apiKey.type = type;
  });

  // TEST & VERIFY API KEY BUTTON
  Elements.drawers.btnTestApiKey?.addEventListener('click', async () => {
    const apiKey = Elements.drawers.apiKey.value.trim();
    const model = Elements.drawers.modelName.value.trim() || 'deepseek-chat';
    const baseURL = Elements.drawers.baseURL.value.trim() || 'https://api.deepseek.com';

    if (!apiKey) {
      showToast('กรุณากรอก DeepSeek API Key ก่อนทดสอบ', 'error');
      if (Elements.drawers.apiVerifyBox) {
        Elements.drawers.apiVerifyBox.style.display = 'flex';
        Elements.drawers.apiVerifyBox.className = 'api-verify-box error';
        Elements.drawers.verifyHeaderRow.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> <span id="verify-status-title">ยังไม่ได้ระบุ API Key</span>';
        Elements.drawers.verifyDetailText.innerText = 'กรุณาใส่ API Key ที่ขึ้นต้นด้วย sk-... แล้วกดทดสอบอีกครั้ง';
      }
      if (Elements.drawers.headerApiDot) Elements.drawers.headerApiDot.className = 'api-status-dot red';
      return;
    }

    // Loading State
    Elements.drawers.btnTestApiKey.disabled = true;
    Elements.drawers.btnTestApiKey.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังทดสอบเชื่อมต่อ...';
    if (Elements.drawers.apiVerifyBox) {
      Elements.drawers.apiVerifyBox.style.display = 'flex';
      Elements.drawers.apiVerifyBox.className = 'api-verify-box loading';
      Elements.drawers.verifyHeaderRow.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> <span id="verify-status-title">กำลังทดสอบส่งข้อความไปยัง DeepSeek...</span>';
      Elements.drawers.verifyDetailText.innerText = `กำลังส่ง Ping ไปที่ ${baseURL} (โมเดล: ${model})...`;
    }

    try {
      const res = await API.verifySettings({ apiKey, baseURL, model });
      
      // Success (GREEN)
      if (Elements.drawers.apiVerifyBox) {
        Elements.drawers.apiVerifyBox.className = 'api-verify-box success';
        Elements.drawers.verifyHeaderRow.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span id="verify-status-title">เชื่อมต่อสำเร็จ! (ความเร็ว: ${res.latencyMs} ms)</span>`;
        Elements.drawers.verifyDetailText.innerHTML = `✅ <strong>DeepSeek ตอบกลับ:</strong> "${escapeHtml(res.reply)}" | <strong>โมเดล:</strong> ${escapeHtml(res.model)} | <strong>สถานะ:</strong> พร้อมใช้งาน 100%`;
      }
      if (Elements.drawers.headerApiDot) Elements.drawers.headerApiDot.className = 'api-status-dot green';

      showToast(`เชื่อมต่อ DeepSeek API สำเร็จ (${res.latencyMs}ms)`, 'success');

      // Auto-save verified settings
      const settings = {
        apiKey: apiKey,
        model: model,
        baseURL: baseURL,
        temperature: parseFloat(Elements.drawers.temperature.value),
        maxTokens: parseInt(Elements.drawers.globalTokens.value, 10)
      };
      await API.saveSettings(settings);
    } catch (err) {
      // Error (RED)
      if (Elements.drawers.apiVerifyBox) {
        Elements.drawers.apiVerifyBox.className = 'api-verify-box error';
        Elements.drawers.verifyHeaderRow.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span id="verify-status-title">การเชื่อมต่อล้มเหลว! (Error)</span>`;
        Elements.drawers.verifyDetailText.innerText = err.message || 'ไม่สามารถเชื่อมต่อกับ DeepSeek API ได้ กรุณาตรวจสอบ API Key หรืออินเทอร์เน็ต';
      }
      if (Elements.drawers.headerApiDot) Elements.drawers.headerApiDot.className = 'api-status-dot red';
      showToast('การเชื่อมต่อล้มเหลว: ' + err.message, 'error');
    } finally {
      Elements.drawers.btnTestApiKey.disabled = false;
      Elements.drawers.btnTestApiKey.innerHTML = '<i class="fa-solid fa-bolt" style="color: var(--accent-amber);"></i> ทดสอบเชื่อมต่อ & ส่งข้อความ (Verify Key)';
    }
  });

  Elements.drawers.btnSaveSettings?.addEventListener('click', async () => {
    const settings = {
      apiKey: Elements.drawers.apiKey.value.trim(),
      model: Elements.drawers.modelName.value.trim(),
      baseURL: Elements.drawers.baseURL.value.trim(),
      temperature: parseFloat(Elements.drawers.temperature.value),
      maxTokens: parseInt(Elements.drawers.globalTokens.value, 10)
    };

    try {
      await API.saveSettings(settings);
      if (Elements.drawers.headerApiDot) {
        Elements.drawers.headerApiDot.className = settings.apiKey ? 'api-status-dot green' : 'api-status-dot red';
      }
      showToast('บันทึกการตั้งค่า DeepSeek สำเร็จ', 'success');
      closeDrawer('drawer-settings');
    } catch (err) {
      showToast('บันทึกการตั้งค่าไม่สำเร็จ: ' + err.message, 'error');
    }
  });

  // ==========================================
  // ADVANCED WORLD CREATION & TABS
  // ==========================================
  Elements.browse.btnCreateWorld?.addEventListener('click', () => {
    Elements.advModal.modal.style.display = 'flex';
  });

  Elements.advModal.btnClose?.addEventListener('click', () => {
    Elements.advModal.modal.style.display = 'none';
  });

  Elements.advModal.btnCancel?.addEventListener('click', () => {
    Elements.advModal.modal.style.display = 'none';
  });

  // Modal tab buttons
  document.querySelectorAll('.modal-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetTab = document.getElementById(btn.dataset.tab);
      if (targetTab) targetTab.classList.add('active');
    });
  });

  // AI Generate Prologue button in creation modal
  Elements.advModal.btnAiGenPrologue?.addEventListener('click', async () => {
    const charName = Elements.advModal.charName.value.trim();
    if (!charName) {
      showToast('กรุณาระบุชื่อตัวละครก่อน', 'info');
      return;
    }

    const btn = Elements.advModal.btnAiGenPrologue;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI กำลังแต่งบทนำ...';

    try {
      const res = await API.generateAIPrologue({
        worldName: Elements.advModal.worldName.value.trim(),
        worldDesc: Elements.advModal.worldDesc.value.trim(),
        characterName: charName,
        charDesc: Elements.advModal.charDesc.value.trim(),
        charPersonality: Elements.advModal.charTags.value.split(',').map(t => t.trim()).filter(Boolean)
      });

      Elements.advModal.charPrologue.value = res.prologue;
      showToast('AI แต่งบทนำเปิดฉากสำเร็จ!', 'success');
    } catch (err) {
      showToast('แต่งบทนำไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" style="color: var(--accent-amber);"></i> ให้ AI ช่วยแต่งบทนำ';
    }
  });

  // Submit Detailed World Creation
  Elements.advModal.btnSubmit?.addEventListener('click', async () => {
    const worldName = Elements.advModal.worldName.value.trim();
    const charName = Elements.advModal.charName.value.trim();

    if (!worldName || !charName) {
      showToast('กรุณาระบุชื่อโลกและชื่อตัวละครหลัก', 'error');
      return;
    }

    const worldPayload = {
      name: worldName,
      tag: Elements.advModal.worldTag.value.trim() || 'Fantasy',
      description: Elements.advModal.worldDesc.value.trim(),
      cover_image: Elements.advModal.worldCover.value.trim() || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop',
      lore_details: {
        geography: Elements.advModal.loreGeo.value.trim(),
        magic_rules: Elements.advModal.loreMagic.value.trim(),
        factions: Elements.advModal.loreFactions.value.trim()
      }
    };

    const invList = Elements.advModal.charInv.value.split(',').map(i => i.trim()).filter(Boolean);
    const tagsList = Elements.advModal.charTags.value.split(',').map(t => t.trim()).filter(Boolean);

    const codexNotes = [];
    if (Elements.advModal.sec1Title.value.trim()) {
      codexNotes.push({
        id: 'sec_' + Date.now(),
        title: Elements.advModal.sec1Title.value.trim(),
        content: Elements.advModal.sec1Content.value.trim(),
        hint: Elements.advModal.sec1Hint.value.trim() || 'พูดคุยและสร้างความผูกพัน',
        unlocked: false
      });
    }

    const charPayload = {
      name: charName,
      avatar: Elements.advModal.charAvatar.value.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
      short_desc: Elements.advModal.charDesc.value.trim(),
      personality_tags: tagsList,
      opening_prologue: Elements.advModal.charPrologue.value.trim(),
      static_profile: {
        history: Elements.advModal.charHistory.value.trim(),
        base_stats: {
          strength: parseInt(Elements.advModal.statStr.value, 10) || 10,
          agility: parseInt(Elements.advModal.statAgi.value, 10) || 10,
          intelligence: parseInt(Elements.advModal.statInt.value, 10) || 10,
          charisma: parseInt(Elements.advModal.statCha.value, 10) || 10,
          perception: parseInt(Elements.advModal.statPer.value, 10) || 10
        }
      },
      initial_inventory: invList.length > 0 ? invList : ['เหรียญเงิน 100 เหรียญ', 'สัมภาระเดินทาง'],
      codex_notes: codexNotes
    };

    try {
      await API.createAdvancedWorld(worldPayload, [charPayload]);
      Elements.advModal.modal.style.display = 'none';
      showToast('สร้างโลกและตัวละครละเอียดสำเร็จ!', 'success');
      await loadInitialData();
    } catch (err) {
      showToast('บันทึกโลกไม่สำเร็จ: ' + err.message, 'error');
    }
  });

  // ==========================================
  // WORLDBOOK IMPORT & AI ANALYZER (2-STEP SYSTEM)
  // ==========================================
  function switchWbStep(step) {
    if (step === 'preview') {
      Elements.wbModal.stepUpload.style.display = 'none';
      Elements.wbModal.footerUpload.style.display = 'none';
      Elements.wbModal.stepPreview.style.display = 'block';
      Elements.wbModal.footerPreview.style.display = 'flex';
      if (Elements.wbModal.title) Elements.wbModal.title.innerText = '📝 ตรวจสอบและแก้ไข Worldbook ก่อนยืนยัน';
      if (Elements.wbModal.subtitle) Elements.wbModal.subtitle.innerText = 'แก้ไขข้อมูลโลก ลอเร่ และตัวละครที่ AI สกัดได้ตามต้องการ แล้วกดยืนยันการสร้าง';
    } else {
      Elements.wbModal.stepUpload.style.display = 'block';
      Elements.wbModal.footerUpload.style.display = 'flex';
      Elements.wbModal.stepPreview.style.display = 'none';
      Elements.wbModal.footerPreview.style.display = 'none';
      if (Elements.wbModal.title) Elements.wbModal.title.innerText = 'นำเข้า Worldbook / Lorebook อัตโนมัติด้วย AI';
      if (Elements.wbModal.subtitle) Elements.wbModal.subtitle.innerText = 'อัปโหลดไฟล์เดียวปึ้ง AI จะสกัดข้อมูลโลก ระบบพลัง และตัวละครให้แก้ไขก่อนยืนยัน';
    }
  }

  function renderWbCharactersPreview(chars = []) {
    if (!Elements.wbModal.charsContainer) return;
    Elements.wbModal.charsContainer.innerHTML = '';
    Elements.wbModal.charsCount.innerText = chars.length;

    chars.forEach((c, idx) => {
      const card = createWbCharPreviewCard(c, idx);
      Elements.wbModal.charsContainer.appendChild(card);
    });
  }

  function createWbCharPreviewCard(char, idx) {
    const card = document.createElement('div');
    card.className = 'char-preview-card';
    card.dataset.idx = idx;

    const name = char.name || `ตัวละครที่ ${idx + 1}`;
    const role = char.role || 'นักเรียน / นักผจญภัย';
    const avatar = char.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop';
    const desc = char.short_desc || '';
    const tags = Array.isArray(char.personality_tags) ? char.personality_tags.join(', ') : (char.personality_tags || '');
    const history = char.static_profile?.history || char.history || '';
    const stats = char.static_profile?.base_stats || char.base_stats || { strength: 10, agility: 10, intelligence: 10, charisma: 10, perception: 10 };
    const inv = Array.isArray(char.initial_inventory) ? char.initial_inventory.join(', ') : (char.initial_inventory || '');
    const codex = Array.isArray(char.codex_notes) ? char.codex_notes : [];
    const sec1 = codex[0] || { title: '', content: '', hint: '' };
    const sec2 = codex[1] || { title: '', content: '', hint: '' };
    const prologue = char.opening_prologue || char.prologue || '';

    card.innerHTML = `
      <div class="char-preview-header">
        <div class="char-preview-header-left">
          <img src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}" class="char-preview-avatar-thumb" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop'">
          <div>
            <span class="char-preview-title">${escapeHtml(name)}</span>
            <span class="char-preview-role-badge">${escapeHtml(role)}</span>
          </div>
        </div>
        <div class="char-preview-header-actions">
          <button type="button" class="btn-icon-subtle btn-toggle-body" title="ย่อ/ขยาย"><i class="fa-solid fa-chevron-down"></i></button>
          <button type="button" class="btn-icon-subtle btn-delete-char" title="ลบตัวละครนี้" style="color: var(--status-bad);"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
      <div class="char-preview-body">
        <div class="form-grid-2">
          <div class="form-group">
            <label>ชื่อตัวละคร *</label>
            <input type="text" class="form-input wb-char-name" value="${escapeHtml(name)}" placeholder="ชื่อตัวละคร">
          </div>
          <div class="form-group">
            <label>บทบาท / ฉายา</label>
            <input type="text" class="form-input wb-char-role" value="${escapeHtml(role)}" placeholder="เช่น ผู้ใช้ Will สายลม / นักเรียนทุน">
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label>รูปภาพอวตาร (Avatar URL)</label>
            <input type="text" class="form-input wb-char-avatar" value="${escapeHtml(avatar)}" placeholder="https://...">
          </div>
          <div class="form-group">
            <label>แท็กบุคลิกภาพ (คั่นด้วยจุลภาค)</label>
            <input type="text" class="form-input wb-char-tags" value="${escapeHtml(tags)}" placeholder="ฉลาด, คิดมาก, กตัญญู">
          </div>
        </div>
        <div class="form-group">
          <label>คำบรรยายสั้น (Bio / Short Desc)</label>
          <textarea rows="2" class="form-textarea wb-char-desc" placeholder="คำบรรยายสั้นๆ">${escapeHtml(desc)}</textarea>
        </div>
        <div class="form-group">
          <label>ประวัติความเป็นมาเชิงลึก (Lore & Backstory)</label>
          <textarea rows="2" class="form-textarea wb-char-history" placeholder="ประวัติชีวิต ปมหลัง และเป้าหมาย">${escapeHtml(history)}</textarea>
        </div>
        <div class="form-group">
          <label>ค่าพลังพื้นฐาน (Base Stats D20):</label>
          <div class="stats-compact-grid">
            <div class="stat-compact-box">
              <span>💪 STR</span>
              <input type="number" class="wb-stat-str" value="${stats.strength || 10}" min="1" max="30">
            </div>
            <div class="stat-compact-box">
              <span>🏃 AGI</span>
              <input type="number" class="wb-stat-agi" value="${stats.agility || 10}" min="1" max="30">
            </div>
            <div class="stat-compact-box">
              <span>🧠 INT</span>
              <input type="number" class="wb-stat-int" value="${stats.intelligence || 10}" min="1" max="30">
            </div>
            <div class="stat-compact-box">
              <span>✨ CHA</span>
              <input type="number" class="wb-stat-cha" value="${stats.charisma || 10}" min="1" max="30">
            </div>
            <div class="stat-compact-box">
              <span>👁️ PER</span>
              <input type="number" class="wb-stat-per" value="${stats.perception || 10}" min="1" max="30">
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>ไอเทมเริ่มต้น (Initial Inventory คั่นด้วยจุลภาค)</label>
          <input type="text" class="form-input wb-char-inv" value="${escapeHtml(inv)}" placeholder="ไอเทมเริ่มต้น">
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label>บันทึกลับที่ 1 (Title / Hint)</label>
            <input type="text" class="form-input wb-char-sec1-title" value="${escapeHtml(sec1.title || '')}" placeholder="หัวข้อความลับ" style="margin-bottom: 4px;">
            <input type="text" class="form-input wb-char-sec1-hint" value="${escapeHtml(sec1.unlock_hint || sec1.hint || '')}" placeholder="คำใบ้ปลดล็อก">
            <textarea rows="2" class="form-textarea wb-char-sec1-content" placeholder="เนื้อหาความลับที่แท้จริง" style="margin-top: 4px;">${escapeHtml(sec1.content || '')}</textarea>
          </div>
          <div class="form-group">
            <label>บันทึกลับที่ 2 (Title / Hint)</label>
            <input type="text" class="form-input wb-char-sec2-title" value="${escapeHtml(sec2.title || '')}" placeholder="หัวข้อความลับที่ 2" style="margin-bottom: 4px;">
            <input type="text" class="form-input wb-char-sec2-hint" value="${escapeHtml(sec2.unlock_hint || sec2.hint || '')}" placeholder="คำใบ้ปลดล็อกที่ 2">
            <textarea rows="2" class="form-textarea wb-char-sec2-content" placeholder="เนื้อหาความลับที่ 2" style="margin-top: 4px;">${escapeHtml(sec2.content || '')}</textarea>
          </div>
        </div>
        <div class="form-group">
          <label>บทนำเปิดฉากการเดินทาง (Opening Prologue)</label>
          <textarea rows="4" class="form-textarea wb-char-prologue" placeholder="บทนำเปิดฉากวรรณกรรมเข้มข้น...">${escapeHtml(prologue)}</textarea>
        </div>
      </div>
    `;

    // Toggle collapse
    const header = card.querySelector('.char-preview-header');
    const body = card.querySelector('.char-preview-body');
    const btnToggle = card.querySelector('.btn-toggle-body');
    header.addEventListener('click', (e) => {
      if (e.target.closest('.btn-delete-char')) return;
      body.classList.toggle('collapsed');
      btnToggle.innerHTML = body.classList.contains('collapsed') ? '<i class="fa-solid fa-chevron-right"></i>' : '<i class="fa-solid fa-chevron-down"></i>';
    });

    // Delete character card
    const btnDelete = card.querySelector('.btn-delete-char');
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation();
      card.remove();
      const remaining = Elements.wbModal.charsContainer.querySelectorAll('.char-preview-card').length;
      Elements.wbModal.charsCount.innerText = remaining;
    });

    // Live update header name on name input
    const inputName = card.querySelector('.wb-char-name');
    const headerTitle = card.querySelector('.char-preview-title');
    inputName.addEventListener('input', () => {
      headerTitle.innerText = inputName.value.trim() || 'ตัวละครใหม่';
    });

    return card;
  }

  function getWbEditedCharacters() {
    const cards = Elements.wbModal.charsContainer.querySelectorAll('.char-preview-card');
    const chars = [];

    cards.forEach(card => {
      const name = card.querySelector('.wb-char-name')?.value.trim();
      if (!name) return;

      const role = card.querySelector('.wb-char-role')?.value.trim() || '';
      const avatar = card.querySelector('.wb-char-avatar')?.value.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop';
      const shortDesc = card.querySelector('.wb-char-desc')?.value.trim() || '';
      const tags = (card.querySelector('.wb-char-tags')?.value || '').split(',').map(t => t.trim()).filter(Boolean);
      const history = card.querySelector('.wb-char-history')?.value.trim() || '';
      const stats = {
        strength: parseInt(card.querySelector('.wb-stat-str')?.value, 10) || 10,
        agility: parseInt(card.querySelector('.wb-stat-agi')?.value, 10) || 10,
        intelligence: parseInt(card.querySelector('.wb-stat-int')?.value, 10) || 10,
        charisma: parseInt(card.querySelector('.wb-stat-cha')?.value, 10) || 10,
        perception: parseInt(card.querySelector('.wb-stat-per')?.value, 10) || 10
      };
      const inv = (card.querySelector('.wb-char-inv')?.value || '').split(',').map(i => i.trim()).filter(Boolean);
      
      const codexNotes = [];
      const sec1Title = card.querySelector('.wb-char-sec1-title')?.value.trim();
      const sec1Content = card.querySelector('.wb-char-sec1-content')?.value.trim();
      const sec1Hint = card.querySelector('.wb-char-sec1-hint')?.value.trim();
      if (sec1Title || sec1Content) {
        codexNotes.push({ id: 'sec_' + Date.now() + '_1', title: sec1Title || 'ความลับ', content: sec1Content || '', hint: sec1Hint || 'พูดคุยและผูกพัน', unlocked: false });
      }

      const sec2Title = card.querySelector('.wb-char-sec2-title')?.value.trim();
      const sec2Content = card.querySelector('.wb-char-sec2-content')?.value.trim();
      const sec2Hint = card.querySelector('.wb-char-sec2-hint')?.value.trim();
      if (sec2Title || sec2Content) {
        codexNotes.push({ id: 'sec_' + Date.now() + '_2', title: sec2Title || 'ความลับที่ 2', content: sec2Content || '', hint: sec2Hint || 'เปิดใจในสถานการณ์วิกฤต', unlocked: false });
      }

      const prologue = card.querySelector('.wb-char-prologue')?.value.trim() || '';

      chars.push({
        name,
        role,
        avatar,
        short_desc: shortDesc,
        personality_tags: tags,
        opening_prologue: prologue,
        static_profile: { history, base_stats: stats },
        dynamic_state: { relationship_value: 0, relationship_status: 'เป็นกลาง', current_emotion: 'ปกติ' },
        initial_inventory: inv.length > 0 ? inv : ['กระเป๋าสัมภาระเดินทาง', 'เหรียญเงิน 50 เหรียญ'],
        codex_notes: codexNotes
      });
    });

    return chars;
  }

  // Open / Close modal
  Elements.browse.btnImportWorldbook?.addEventListener('click', () => {
    switchWbStep('upload');
    Elements.wbModal.modal.style.display = 'flex';
  });

  Elements.wbModal.btnClose?.addEventListener('click', () => {
    Elements.wbModal.modal.style.display = 'none';
  });

  Elements.wbModal.btnCancel?.addEventListener('click', () => {
    Elements.wbModal.modal.style.display = 'none';
  });

  Elements.wbModal.btnCancelPreview?.addEventListener('click', () => {
    Elements.wbModal.modal.style.display = 'none';
  });

  Elements.wbModal.btnBackToUpload?.addEventListener('click', () => {
    switchWbStep('upload');
  });

  // Add new blank character in preview
  Elements.wbModal.btnAddChar?.addEventListener('click', () => {
    const currentCount = Elements.wbModal.charsContainer.querySelectorAll('.char-preview-card').length;
    const newCard = createWbCharPreviewCard({
      name: `ตัวละครใหม่ ${currentCount + 1}`,
      role: 'นักเรียน / วีรชน',
      personality_tags: ['จิตใจดี', 'มุ่งมั่น'],
      base_stats: { strength: 12, agility: 12, intelligence: 12, charisma: 12, perception: 12 },
      initial_inventory: ['สัมภาระเดินทาง']
    }, currentCount);
    Elements.wbModal.charsContainer.appendChild(newCard);
    Elements.wbModal.charsCount.innerText = currentCount + 1;
    newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // Dropzone file upload
  Elements.wbModal.dropzone?.addEventListener('click', () => {
    Elements.wbModal.fileInput.click();
  });

  Elements.wbModal.fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        Elements.wbModal.rawInput.value = event.target.result;
        showToast(`โหลดไฟล์ ${file.name} เรียบร้อย`, 'info');
      };
      reader.readAsText(file);
    }
  });

  // Drag and drop support
  Elements.wbModal.dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    Elements.wbModal.dropzone.style.borderColor = 'var(--accent-amber)';
  });

  Elements.wbModal.dropzone?.addEventListener('dragleave', () => {
    Elements.wbModal.dropzone.style.borderColor = 'var(--border-card)';
  });

  Elements.wbModal.dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    Elements.wbModal.dropzone.style.borderColor = 'var(--border-card)';
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        Elements.wbModal.rawInput.value = event.target.result;
        showToast(`โหลดไฟล์ ${file.name} เรียบร้อย`, 'info');
      };
      reader.readAsText(file);
    }
  });

  // Start AI Worldbook Analysis -> Switch to Live Editable Preview
  Elements.wbModal.btnStartAnalyze?.addEventListener('click', async () => {
    const raw = Elements.wbModal.rawInput.value.trim();
    if (!raw) {
      showToast('กรุณาวางเนื้อหาหรืออัปโหลดไฟล์ Worldbook ก่อน', 'info');
      return;
    }

    Elements.wbModal.analyzingBanner.style.display = 'flex';
    Elements.wbModal.btnStartAnalyze.disabled = true;

    try {
      const parsed = await API.analyzeWorldbook(raw);
      
      // Populate World Details
      if (parsed.world) {
        Elements.wbModal.previewWorldName.value = parsed.world.name || '';
        Elements.wbModal.previewWorldTag.value = parsed.world.tag || 'Hero Academy';
        Elements.wbModal.previewWorldDesc.value = parsed.world.description || '';
        Elements.wbModal.previewWorldCover.value = parsed.world.cover_image || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop';
        if (parsed.world.lore_details) {
          Elements.wbModal.previewLoreGeo.value = parsed.world.lore_details.geography || '';
          Elements.wbModal.previewLoreMagic.value = parsed.world.lore_details.magic_rules || '';
          Elements.wbModal.previewLoreFactions.value = parsed.world.lore_details.factions || '';
          Elements.wbModal.previewLoreCustom.value = parsed.world.lore_details.custom_lore || '';
        }
      }

      // Populate Characters Preview List
      const charsList = parsed.characters || (parsed.character ? [parsed.character] : []);
      renderWbCharactersPreview(charsList);

      // Switch to Step 2 Preview
      switchWbStep('preview');
      showToast('AI สกัดข้อมูล Worldbook เรียบร้อย! ตรวจสอบและแก้ไขก่อนกดยืนยัน', 'success');
    } catch (err) {
      showToast('การวิเคราะห์ Worldbook ล้มเหลว: ' + err.message, 'error');
    } finally {
      Elements.wbModal.analyzingBanner.style.display = 'none';
      Elements.wbModal.btnStartAnalyze.disabled = false;
    }
  });

  // CONFIRM & SAVE WORLDBOOK TO DATABASE
  Elements.wbModal.btnConfirmSave?.addEventListener('click', async () => {
    const worldName = Elements.wbModal.previewWorldName.value.trim();
    if (!worldName) {
      showToast('กรุณาระบุชื่อโลก / จักรวาล', 'error');
      return;
    }

    const characters = getWbEditedCharacters();
    if (characters.length === 0) {
      showToast('กรุณามีตัวละครอย่างน้อย 1 ตัวละคร', 'error');
      return;
    }

    const worldPayload = {
      name: worldName,
      tag: Elements.wbModal.previewWorldTag.value.trim() || 'Fantasy',
      description: Elements.wbModal.previewWorldDesc.value.trim(),
      cover_image: Elements.wbModal.previewWorldCover.value.trim() || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
      lore_details: {
        geography: Elements.wbModal.previewLoreGeo.value.trim(),
        magic_rules: Elements.wbModal.previewLoreMagic.value.trim(),
        factions: Elements.wbModal.previewLoreFactions.value.trim(),
        custom_lore: Elements.wbModal.previewLoreCustom.value.trim()
      }
    };

    const btn = Elements.wbModal.btnConfirmSave;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึกโลกและตัวละคร...';

    try {
      await API.createAdvancedWorld(worldPayload, characters);
      Elements.wbModal.modal.style.display = 'none';
      switchWbStep('upload');
      showToast(`สร้างโลก "${worldName}" พร้อม ${characters.length} ตัวละครสำเร็จ!`, 'success');
      await loadInitialData();
    } catch (err) {
      showToast('บันทึก Worldbook ไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> ✅ ยืนยันการสร้าง Worldbook ลงในเกม';
    }
  });

  // Search Filter
  Elements.browse.searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = State.worlds.filter(w => {
      return w.name.toLowerCase().includes(q) ||
        (w.tag && w.tag.toLowerCase().includes(q)) ||
        (w.description && w.description.toLowerCase().includes(q));
    });
    renderWorldsList(filtered);
  });

  // Tag filter pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const tag = pill.dataset.tag;
      if (tag === 'all') {
        renderWorldsList(State.worlds);
      } else {
        const filtered = State.worlds.filter(w => w.tag && w.tag.toLowerCase().includes(tag.toLowerCase()));
        renderWorldsList(filtered);
      }
    });
  });
}

function setInteractionMode(mode) {
  State.currentMode = mode;
  if (mode === 'Do') {
    Elements.story.btnModeDo.classList.add('active');
    Elements.story.btnModeSay.classList.remove('active');
    Elements.story.modeLabel.innerText = 'Do';
    Elements.story.modeIndicator.innerHTML = '<i class="fa-solid fa-hand-fist"></i> <span>Do</span>';
    Elements.story.input.placeholder = 'ระบุการกระทำทางกายภาพ/ยุทธวิธีของคุณ... เช่น "ชักดาบสั้นออกมาป้องกันตัว และมองหาทางหนีทีไล่"';
  } else {
    Elements.story.btnModeSay.classList.add('active');
    Elements.story.btnModeDo.classList.remove('active');
    Elements.story.modeLabel.innerText = 'Say';
    Elements.story.modeIndicator.innerHTML = '<i class="fa-solid fa-comment-dots"></i> <span>Say</span>';
    Elements.story.input.placeholder = 'พิมพ์คำพูดหรือแสดงความรู้สึกของคุณ... เช่น "เราไม่ได้มาที่นี่เพื่อเป็นศัตรูกับเจ้า วางดาบลงก่อนเถอะ"';
  }
}

function openDrawer(drawerId) {
  const el = document.getElementById(drawerId);
  if (el) el.classList.add('open');
}

function closeDrawer(drawerId) {
  const el = document.getElementById(drawerId);
  if (el) el.classList.remove('open');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}
