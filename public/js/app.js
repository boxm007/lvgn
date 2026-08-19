/**
 * LONG VOYAGE 2.0 — APP CLIENT CONTROLLER
 * Full orchestration of Modern AI Roleplay Engine, 9-Tier Memory Architecture,
 * Fate D20 Engine, Detailed Worldbook Lore, Character Avatar Customizer,
 * Typewriter Effect, and Message In-Place Editing.
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
  enableTypewriter: true,
  isLoadingTurn: false,
  editingMsgId: null,
  avatarTargetCharId: null,
  selectedAvatarUrl: ''
};
window.State = State;
window.AppState = State;

// 12 Official Narrative Style Mode Presets
const PRESET_TEMPLATES = {
  drama: {
    preset_name: 'ดราม่าเข้มข้น (Drama)',
    tone_directive: 'เน้นความขัดแย้งภายในและความสัมพันธ์ระหว่างตัวละคร ทุกฉากมีน้ำหนักทางอารมณ์ ให้ความสำคัญกับสีหน้า น้ำเสียง ความเงียบที่พูดมากกว่าคำพูด บทพูดมี subtext',
    prose_style: 'สำนวนภาษาไทยสละสลวย บรรยายฉากและประสาทสัมผัสคมชัด มี pause และความเงียบในบทสนทนา หลีกเลี่ยงการบอกอารมณ์ตรงๆ ให้คนอ่านรู้สึกเองผ่านรายละเอียด',
    pacing: 'จังหวะช้าในฉากอารมณ์สำคัญ ปล่อยให้ความเงียบและอารมณ์ตกค้างมีพื้นที่ในข้อความ',
    pronoun_pov: 'บุคคลที่ 2 (คุณ) สำหรับผู้เล่น และบุคคลที่ 3 สำหรับตัวละคร',
    max_response_tokens: 800
  },
  warm: {
    preset_name: 'อบอุ่นหัวใจ (Warm & Wholesome)',
    tone_directive: 'เน้นความสัมพันธ์เชิงบวก ความผูกพัน และช่วงเวลาสงบท่ามกลางความยากลำบาก ("ความหวังที่หาได้ยากและมีค่า") ให้พื้นที่กับความอบอุ่นเล็กๆ ระหว่างตัวละคร',
    prose_style: 'ภาษาที่นุ่มนวลกว่า มีจังหวะหายใจและรอยยิ้ม แต่ยังคงรักษาผลลัพธ์จริงของเกมอย่างซื่อสัตย์',
    pacing: 'ผ่อนคลาย อบอุ่น มีเวลาให้ตัวละครได้ปรับความเข้าใจ',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 750
  },
  romance: {
    preset_name: 'โรแมนซ์ลึกซึ้ง (Romance & Slow Burn)',
    tone_directive: 'เน้นความใกล้ชิดทางอารมณ์ ความเปราะบาง ความไว้วางใจ และความโหยหาที่ค่อยๆ ก่อตัวขึ้นอย่างสมจริงผ่านสายตา การลังเล และการกระทำ',
    prose_style: 'ภาษาประณีต เน้นแรงดึงดูด ภาษากาย สัมผัสเบาบาง และสิ่งที่ไม่ยอมพูดตรงๆ เคารพเจตจำนงของผู้เล่น',
    pacing: 'ละเอียดอ่อน เน้นช่วงเวลาชวนประทับใจ',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 800
  },
  dark: {
    preset_name: 'ดาร์กกดดัน (Dark & Gritty)',
    tone_directive: 'โทนหนักหน่วง โลกไม่ปรานีต่อตัวละคร บรรยายผลของความรุนแรง ความสูญเสีย หรือความล้มเหลวอย่างตรงไปตรงมา บรรยากาศกดดัน สิ้นหวัง ตัวละครไม่มี plot armor',
    prose_style: 'ภาพพจน์ที่หนักแน่น กระชับ ไม่ประดับประดา ความเจ็บปวดและความสูญเสียรู้สึกได้จริง ไม่มีการเยียวยาด้วยน้ำเสียงบรรยายที่ soften ความจริง',
    pacing: 'ตึงเครียด บีบคั้น รวดเร็วและไม่ประนีประนอม',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 800
  },
  comedy: {
    preset_name: 'ขบขันมีไหวพริบ (Comedy)',
    tone_directive: 'เน้นจังหวะความตลกขบขัน ความเข้าใจผิดเล็กๆ ปมบุคลิกเฉพาะตัวละคร และบทสนทนาโต้ตอบที่คมคายเข้ากับสถานการณ์',
    prose_style: 'กระฉับกระเฉง มีมุกตลกตามสถานการณ์โดยไม่ทำลายความเป็นจริงของโลก',
    pacing: 'กระฉับกระเฉง จังหวะตบมุกคมชัด',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 700
  },
  epic: {
    preset_name: 'มหากาพย์ยิ่งใหญ่ (Epic)',
    tone_directive: 'เน้นเหตุการณ์สเกลใหญ่ สงคราม ความขัดแย้งทางการเมือง การเปิดเผยความจริงครั้งประวัติศาสตร์ และบุคคลในตำนาน',
    prose_style: 'ภาพพจน์กว้างขวาง อลังการ ภาษาทรงพลัง จังหวะมั่นคง',
    pacing: 'มีน้ำหนัก น่าเกรงขาม สง่างาม',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 1000
  },
  mystery: {
    preset_name: 'ลึกลับสืบสวน (Mystery)',
    tone_directive: 'เน้นการทิ้งเบาะแส ข้อมูลไม่ครบถ้วน ความไม่แน่นอน ความขัดแย้งที่รอการคลี่คลาย และลางบอกเหตุ (Foreshadowing)',
    prose_style: 'บรรยายสังเกตการณ์ที่จับสายตาทุกรายละเอียด ไม่รีบเฉลยคำตอบ ปล่อยให้ความสงสัยนำพาเรื่อง',
    pacing: 'ระมัดระวัง ตรึงความสนใจ ชวนสืบค้น',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 800
  },
  horror: {
    preset_name: 'สยองขวัญกดประสาท (Horror)',
    tone_directive: 'เน้นความหวาดกลัวจากความไม่แน่นอน ความโดดเดี่ยว ความเปราะบาง บรรยากาศหลอน และความตึงเครียดทางจิตวิทยา ไม่พึ่งพาเพียงเลือดสาด',
    prose_style: 'บรรยายประสาทสัมผัสคมชัด เสียงแปลกปลอม ความมืด และความรู้สึกไม่ปลอดภัย',
    pacing: 'กดดัน ค่อยๆ บีบรัดหัวใจ',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 800
  },
  slice_of_life: {
    preset_name: 'ชีวิตประจำวัน (Slice of Life & School)',
    tone_directive: 'จังหวะช้า เน้นรายละเอียดชีวิตประจำวัน ปฏิสัมพันธ์เล็กๆ ระหว่างตัวละคร มื้ออาหาร การเดินทาง และบทสนทนาทั่วไป',
    prose_style: 'ภาษาเรียบง่าย เป็นธรรมชาติ เก็บเกี่ยวช่วงเวลาสงบสุขระหว่างการเดินทาง',
    pacing: 'ช้า ผ่อนคลาย ละเมียดละไม',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 700
  },
  adventure: {
    preset_name: 'ผจญภัยแอ็กชัน (Action/Adventure)',
    tone_directive: 'จังหวะเร็ว กระชับ เน้น action และการเคลื่อนไหว เผชิญหน้ากับความท้าทายและการต่อสู้',
    prose_style: 'ประโยคสั้น กระแทก สร้างความรู้สึกเร่งด่วน ใช้ sensory detail ภายนอก ลดการพรรณนาในจิตใจ',
    pacing: 'รวดเร็ว ฉับไว น่าตื่นเต้น',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 800
  },
  tactical: {
    preset_name: 'ยุทธวิธีและการต่อสู้ (Tactical & Gritty)',
    tone_directive: 'เน้นความสมจริงของผลที่ตามมาทางกายภาพและยุทธวิธี การคำนวณเวกเตอร์ แรงดันอากาศ มีตรรกะและเหตุผลชัดเจน',
    prose_style: 'ภาษากระชับ ตรงประเด็น เหมือนรายงานสถานการณ์ที่แทรกความรู้สึกเข้ามาเป็นระยะ เน้นการวางแผน ทรัพยากร และการตัดสินใจใต้ความกดดัน',
    pacing: 'แม่นยำ เด็ดขาด ตรงไปตรงมา',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 800
  },
  custom: {
    preset_name: 'ปรับแต่งอิสระ (Custom Override)',
    tone_directive: 'ตามที่ผู้เล่นกำหนดเอง',
    prose_style: 'ตามที่ผู้เล่นกำหนดเอง',
    pacing: 'กำหนดเอง',
    pronoun_pov: 'บุคคลที่ 2 (คุณ)',
    max_response_tokens: 800
  }
};

// 12 High-Quality Anime / Fantasy Avatar Presets
const AVATAR_PRESETS = [
  { name: 'เด็กหนุ่มผมดำ (Ren style)', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&auto=format&fit=crop' },
  { name: 'เด็กสาวผมยาว (Ina style)', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop' },
  { name: 'หนุ่มนักสู้ผิวแทน (Tetsujo style)', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop' },
  { name: 'หนุ่มแว่นสุภาพ (Shin style)', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop' },
  { name: 'ช่างกลอัจฉริยะ (Billy style)', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=600&auto=format&fit=crop' },
  { name: 'ชายสูงวัยเก๋าเกม (Janitor Goro)', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=600&auto=format&fit=crop' },
  { name: 'อัศวินสาวเกราะเหล็ก (Seraphina)', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop' },
  { name: 'นักปราชญ์ดวงดาว (Lumia)', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop' },
  { name: 'ไซเบอร์เน็ตเนอร์ (Ray)', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop' },
  { name: 'จอมเวทพเนจร', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=600&auto=format&fit=crop' },
  { name: 'นักดาบหญิงแห่งเงา', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop' },
  { name: 'นักประดิษฐ์สาวไซไฟ', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop' }
];

// Providers metadata
const AI_PROVIDERS = {
  deepseek: {
    name: 'DeepSeek Official',
    baseURL: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    keyPlaceholder: 'sk-... (DeepSeek API Key)'
  },
  openrouter: {
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-chat',
    keyPlaceholder: 'sk-or-v1-... (OpenRouter API Key)'
  },
  qwen: {
    name: 'Qwen (DashScope)',
    baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-max',
    keyPlaceholder: 'sk-... (DashScope API Key)'
  },
  siliconflow: {
    name: 'SiliconFlow',
    baseURL: 'https://api.siliconflow.cn/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    keyPlaceholder: 'sk-... (SiliconFlow API Key)'
  },
  custom: {
    name: 'Custom Endpoint',
    baseURL: '',
    defaultModel: '',
    keyPlaceholder: 'API Key'
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
    chkEnableTypewriter: document.getElementById('chk-enable-typewriter'),
    btnUndo: document.getElementById('btn-undo-turn'),
    btnRegen: document.getElementById('btn-regen-turn')
  },
  drawers: {
    memory: document.getElementById('drawer-memory'),
    lorebook: document.getElementById('drawer-lorebook'),
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
    baseURL: document.getElementById('input-base-url'),
    modelName: document.getElementById('input-model-name'),
    refereeModel: document.getElementById('input-referee-model'),
    btnToggleKey: document.getElementById('btn-toggle-key-visibility'),
    btnTestApiKey: document.getElementById('btn-test-api-key'),
    testResult: document.getElementById('test-connection-result'),
    headerApiDot: document.getElementById('header-api-dot'),
    btnSaveSettings: document.getElementById('btn-save-settings')
  },
  modals: {
    avatar: document.getElementById('modal-custom-avatar'),
    avatarPreview: document.getElementById('avatar-preview-img'),
    avatarTargetName: document.getElementById('avatar-target-name'),
    avatarUrlInput: document.getElementById('input-avatar-url'),
    avatarFileInput: document.getElementById('file-avatar-upload'),
    avatarPresetsContainer: document.getElementById('avatar-presets-container'),
    btnSaveAvatar: document.getElementById('btn-save-avatar'),
    btnCancelAvatar: document.getElementById('btn-cancel-avatar'),
    btnCloseAvatar: document.getElementById('btn-close-avatar-modal'),

    editMsg: document.getElementById('modal-edit-message'),
    editMsgInput: document.getElementById('input-edit-message-text'),
    btnSaveEditMsg: document.getElementById('btn-save-edit-msg'),
    btnCancelEditMsg: document.getElementById('btn-cancel-edit-msg'),
    btnCloseEditMsg: document.getElementById('btn-close-edit-modal')
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
    loreCustom: document.getElementById('adv-lore-custom'),
    charName: document.getElementById('adv-char-name'),
    charRole: document.getElementById('adv-char-role'),
    charAvatar: document.getElementById('adv-char-avatar'),
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
    previewWorldName: document.getElementById('wb-preview-world-name'),
    previewWorldTag: document.getElementById('wb-preview-world-tag'),
    previewWorldDesc: document.getElementById('wb-preview-world-desc'),
    previewWorldCover: document.getElementById('wb-preview-world-cover'),
    previewLoreGeo: document.getElementById('wb-preview-lore-geo'),
    previewLoreMagic: document.getElementById('wb-preview-lore-magic'),
    previewLoreFactions: document.getElementById('wb-preview-lore-factions'),
    previewLoreCustom: document.getElementById('wb-preview-lore-custom'),
    charsPreviewContainer: document.getElementById('wb-chars-preview-container'),
    charsCountSpan: document.getElementById('wb-chars-count'),
    btnAddChar: document.getElementById('btn-wb-add-char'),
    btnBackToUpload: document.getElementById('btn-wb-back-to-upload'),
    btnConfirmSave: document.getElementById('btn-confirm-save-worldbook')
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadInitialData();
  renderAvatarPresets();
});

async function loadInitialData() {
  try {
    const [worldsData, charsData, settingsData] = await Promise.all([
      API.getWorlds(),
      API.getCharacters(),
      API.getSettings()
    ]);

    State.worlds = worldsData.worlds || [];
    State.characters = charsData.characters || [];

    renderTagFilters(State.worlds);
    renderWorldsList(State.worlds);
    populateSettings(settingsData.settings);
  } catch (err) {
    showToast('โหลดข้อมูลเริ่มต้นล้มเหลว: ' + err.message, 'error');
  }
}

// ============================================================================
// NAVIGATION & VIEW SWITCHING
// ============================================================================
function switchView(viewName) {
  State.activeView = viewName;
  Object.keys(Elements.views).forEach(key => {
    if (key === viewName.replace('view-', '')) {
      Elements.views[key]?.classList.add('active');
    } else {
      Elements.views[key]?.classList.remove('active');
    }
  });

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
function renderTagFilters(worlds) {
  const tags = new Set(['all']);
  worlds.forEach(w => {
    if (w.tag) tags.add(w.tag);
  });

  Elements.browse.tagFilters.innerHTML = '';
  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = `filter-pill ${tag === 'all' ? 'active' : ''}`;
    btn.dataset.tag = tag;
    btn.innerText = tag === 'all' ? 'ทั้งหมด' : tag;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      filterWorlds(tag);
    });
    Elements.browse.tagFilters.appendChild(btn);
  });
}

function filterWorlds(tag) {
  if (tag === 'all') {
    renderWorldsList(State.worlds);
  } else {
    const filtered = State.worlds.filter(w => w.tag === tag);
    renderWorldsList(filtered);
  }
}

function renderWorldsList(worlds) {
  Elements.browse.worldsContainer.innerHTML = '';

  if (worlds.length === 0) {
    Elements.browse.worldsContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px 16px; color: var(--text-muted);">
        <i class="fa-solid fa-compass" style="font-size: 36px; color: var(--primary); margin-bottom: 12px;"></i>
        <h3>ไม่พบโลกหรือตัวละครที่ค้นหา</h3>
        <p style="font-size: 13px;">ลองค้นหาด้วยคำอื่น หรือสร้างโลกใหม่ด้วยตนเอง</p>
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
            <img class="char-avatar" src="${char.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'}" alt="${escapeHtml(char.name)}" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'">
            <div class="char-title-wrap">
              <span class="char-item-name">${escapeHtml(char.name)}</span>
              <span class="char-item-desc">${escapeHtml(char.short_desc || '')}</span>
            </div>
          </div>
          <button class="btn btn-primary btn-sm btn-select-char" data-char-id="${char.id}" data-world-id="${world.id}">
            <i class="fa-solid fa-play"></i> เริ่มเล่น
          </button>
        </div>
      `;
    });

    card.innerHTML = `
      <img class="world-cover" src="${world.cover_image || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop'}" alt="${escapeHtml(world.name)}">
      <div class="world-card-body">
        <span class="world-tag-badge">${escapeHtml(world.tag || 'Story')}</span>
        <h3 class="world-title">${escapeHtml(world.name)}</h3>
        <p class="world-desc">${escapeHtml(world.description || '')}</p>
        
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

  // Attach click handlers
  document.querySelectorAll('.btn-select-char, .char-item-card').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const worldId = el.dataset.worldId;
      const charId = el.dataset.charId;
      if (worldId && charId) {
        openSaveSlotsView(worldId, charId);
      }
    });
  });
}

// ============================================================================
// VIEW 2: SAVE SLOTS MANAGER
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
      <h3 style="font-size: 17px; font-weight: 700;">${escapeHtml(State.activeCharacter.name)}</h3>
      <span style="font-size: 12.5px; color: var(--text-muted);">${escapeHtml(State.activeWorld.name)}</span>
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
        <span class="slot-name">${escapeHtml(slot.slot_name || 'การเดินทาง')}</span>
        <div class="slot-stats-row">
          <span><i class="fa-regular fa-clock"></i> ${new Date(slot.updated_at).toLocaleString('th-TH')}</span>
          <span><i class="fa-solid fa-comments"></i> ${turnCount} เทิร์น</span>
          <span style="color: var(--accent-rose);"><i class="fa-solid fa-heart"></i> ความผูกพัน: ${relVal >= 0 ? '+' : ''}${relVal}</span>
          <span style="color: var(--accent-amber);"><i class="fa-regular fa-face-smile"></i> ${escapeHtml(emotion)}</span>
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
      if (confirm('คุณต้องการลบโฟลเดอร์เซฟนี้ใช่หรือไม่? ข้อมูลความจำและบทสนทนาจะถูกลบถาวร')) {
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
// VIEW 3: MAIN STORY & ROLEPLAY CHATROOM
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

  const currentAvatar = State.activeSlot.custom_avatar || State.activeCharacter.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop';
  Elements.header.charAvatar.src = currentAvatar;
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
    sceneChipHtml = `<div class="scene-status-pill"><i class="fa-solid fa-location-dot"></i> วันที่ ${day} • ${time} • ${loc}</div>`;
    content = content.replace(sceneMatch[0], '').trim();
  } else if (scene) {
    sceneChipHtml = `<div class="scene-status-pill"><i class="fa-solid fa-location-dot"></i> วันที่ ${scene.day || 1} • เวลา ${scene.time || '08:30'} น. • ${scene.location || 'จุดเริ่มต้น'}</div>`;
  }

  const paragraphs = content.split('\n\n').filter(p => p.trim());
  
  const bodyHtml = paragraphs.map(para => {
    let formatted = escapeHtml(para);
    // Golden amber dialogue highlighting
    formatted = formatted.replace(/"([^"]+)"/g, '<span class="ai-dialogue">"$1"</span>');
    formatted = formatted.replace(/“([^”]+)”/g, '<span class="ai-dialogue">“$1”</span>');
    formatted = formatted.replace(/‘([^’]+)’/g, '<span class="ai-dialogue">‘$1’</span>');
    // Lilac thought/atmosphere highlighting for italicized text (*...*)
    formatted = formatted.replace(/\*([^*]+)\*/g, '<span class="thought-text">*$1*</span>');
    return `<p>${formatted}</p>`;
  }).join('');

  return sceneChipHtml + bodyHtml;
}

function createMessageElement(msg, isLast) {
  const item = document.createElement('div');
  item.className = `message-item ${msg.role === 'user' ? 'user-message' : 'ai-message'} message-card`;
  item.dataset.msgId = msg.id || ('msg_' + Date.now());

  // Message Hover Actions Toolbar
  const actionToolbar = `
    <div class="message-actions-toolbar">
      <button class="msg-action-btn btn-edit-msg" data-msg-id="${msg.id}" title="แก้ไขข้อความนี้">
        <i class="fa-solid fa-pen"></i>
      </button>
      <button class="msg-action-btn btn-copy-msg" data-msg-id="${msg.id}" title="คัดลอกข้อความ">
        <i class="fa-solid fa-copy"></i>
      </button>
    </div>
  `;

  if (msg.role === 'user') {
    const isDo = msg.type === 'Do';
    item.innerHTML = `
      ${actionToolbar}
      <div class="user-bubble">
        <span class="user-tag-pill">${isDo ? '⚔️ DO (กระทำ)' : '💬 SAY (คำพูด)'}</span>
        <div>${escapeHtml(msg.content)}</div>
      </div>
    `;
  } else {
    let fateHtml = '';
    if (msg.fateResult && msg.fateResult.badgeText) {
      fateHtml = `
        <div class="fate-badge-card ${msg.fateResult.tier}">
          <i class="fa-solid fa-dice-d20"></i>
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
    if (msg.consequence && msg.consequence.consequence_summary && msg.consequence.consequence_summary !== 'การสนทนาดำเนินต่อไป' && msg.consequence.consequence_summary !== 'การกระทำดำเนินต่อไปอย่างราบรื่น') {
      consequenceHtml = `
        <div class="consequence-alert-pill">
          <i class="fa-solid fa-sparkles"></i>
          <span>${escapeHtml(msg.consequence.consequence_summary)}</span>
        </div>
      `;
    }

    const formattedBody = formatProseContent(msg.content, msg.scene);

    item.innerHTML = `
      ${actionToolbar}
      ${prologueRibbon}
      ${fateHtml}
      <div class="ai-prose-bubble ${msg.is_prologue ? 'is-prologue-card' : ''}">
        <div class="prose-content-wrap">${formattedBody}</div>
        ${consequenceHtml}
      </div>
    `;
  }

  // Bind Actions
  item.querySelector('.btn-edit-msg')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openEditMessageModal(msg.id);
  });

  item.querySelector('.btn-copy-msg')?.addEventListener('click', (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(msg.content);
    showToast('คัดลอกข้อความเรียบร้อย', 'info');
  });

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

/**
 * Typewriter Text Streamer
 */
function streamTypewriterText(containerEl, formattedHtml, speedMs = 10) {
  return new Promise((resolve) => {
    containerEl.innerHTML = '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = formattedHtml;

    // Create stream container
    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    containerEl.appendChild(tempDiv);
    containerEl.appendChild(cursor);

    // Simple smooth reveal
    const paragraphs = tempDiv.querySelectorAll('p');
    if (paragraphs.length === 0) {
      cursor.remove();
      resolve();
      return;
    }

    let pIdx = 0;
    paragraphs.forEach((p, idx) => {
      if (idx > 0) p.style.opacity = '0';
    });

    const interval = setInterval(() => {
      if (pIdx < paragraphs.length) {
        paragraphs[pIdx].style.opacity = '1';
        paragraphs[pIdx].style.animation = 'fadeIn 0.3s ease';
        pIdx++;
        scrollToBottom();
      } else {
        clearInterval(interval);
        cursor.remove();
        resolve();
      }
    }, 180);
  });
}

// ============================================================================
// TURN EXECUTION (WITH 9-TIER MEMORY & HYBRID RAG)
// ============================================================================
async function handleSendTurn() {
  if (State.isLoadingTurn || !State.activeSlot) return;

  const text = Elements.story.input.value.trim();
  if (!text) return;

  const mode = State.currentMode;
  const enableDice = Elements.story.chkEnableDice.checked;
  const enableTypewriter = Elements.story.chkEnableTypewriter?.checked ?? true;

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
    
    const msgEl = createMessageElement(res.aiTurn, true);
    Elements.story.messagesList.appendChild(msgEl);

    if (enableTypewriter) {
      const proseWrap = msgEl.querySelector('.prose-content-wrap');
      if (proseWrap) {
        const fullHtml = formatProseContent(res.aiTurn.content, res.aiTurn.scene);
        await streamTypewriterText(proseWrap, fullHtml);
      }
    }
    
    // Check dynamic NPC discovery
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
  document.getElementById('typing-status-text').innerText = 'AI กำลังเขียนคำบรรยายใหม่ด้วย Hybrid RAG...';

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
    document.getElementById('typing-status-text').innerText = 'AI กำลังประมวลผล...';
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
// MEMORY & FACT INSPECTOR DRAWER (9-TIER ARCHITECTURE)
// ============================================================================
async function openMemoryDrawer() {
  if (!State.activeSlot) {
    showToast('กรุณาเลือกหรือเปิด Save Slot ก่อน', 'info');
    return;
  }

  openDrawer('drawer-memory');

  try {
    const data = await API.getSlotMemories(State.activeSlot.id);
    const memories = data.memories || [];
    const facts = data.facts || [];
    const summary = data.rolling_summary || 'ยังไม่มีสรุปเรื่องย่อ (สรุปจะเกิดขึ้นทุกๆ 8 เทิร์น)';

    document.getElementById('mem-count-badge').innerText = `${memories.length} รายการ`;
    document.getElementById('facts-count-badge').innerText = `${facts.length} ข้อ`;
    document.getElementById('memory-rolling-summary-content').innerText = summary;

    // 1. Render Episodic Memories
    const memContainer = document.getElementById('memory-episodic-list');
    memContainer.innerHTML = '';
    if (memories.length === 0) {
      memContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-dim); font-size: 13px;">ยังไม่มีความจำเหตุการณ์ที่บันทึกไว้</div>`;
    } else {
      memories.slice().reverse().forEach(mem => {
        const card = document.createElement('div');
        card.className = 'memory-card';
        card.innerHTML = `
          <div class="memory-card-header">
            <span class="memory-turn-badge"><i class="fa-solid fa-turn-up"></i> เทิร์นที่ ${mem.turn_number || 1}</span>
            <span class="memory-importance-badge"><i class="fa-solid fa-star"></i> ความสำคัญ ${mem.importance || 5}/10</span>
          </div>
          <div class="memory-content">${escapeHtml(mem.content)}</div>
          <div class="memory-card-footer">
            <span><i class="fa-regular fa-clock"></i> ${new Date(mem.timestamp).toLocaleTimeString('th-TH')} | ${escapeHtml(mem.location || 'ในฉาก')}</span>
            <button class="btn-delete-mem" data-mem-id="${mem.memory_id}" title="ลบความจำนี้"><i class="fa-solid fa-trash-can"></i> ลบ</button>
          </div>
        `;
        memContainer.appendChild(card);
      });

      memContainer.querySelectorAll('.btn-delete-mem').forEach(btn => {
        btn.addEventListener('click', async () => {
          const memId = btn.dataset.memId;
          await API.deleteMemory(State.activeSlot.id, memId);
          showToast('ลบความจำเรียบร้อย', 'info');
          openMemoryDrawer();
        });
      });
    }

    // 2. Render Active Facts (Triplets)
    const factsContainer = document.getElementById('memory-facts-list');
    factsContainer.innerHTML = '';
    if (facts.length === 0) {
      factsContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-dim); font-size: 13px;">ยังไม่มีข้อเท็จจริงที่บันทึกไว้</div>`;
    } else {
      facts.slice().reverse().forEach(fact => {
        const isSuperseded = fact.status === 'SUPERSEDED';
        const card = document.createElement('div');
        card.className = 'fact-card';
        if (isSuperseded) card.style.opacity = '0.5';

        card.innerHTML = `
          <div class="fact-triplet">
            <span class="fact-subject">${escapeHtml(fact.subject)}</span>
            <span class="fact-pred">${escapeHtml(fact.predicate)}</span>
            <span class="fact-obj">"${escapeHtml(fact.object)}"</span>
            ${isSuperseded ? '<span style="font-size: 10px; color: #ef4444; border: 1px solid #ef4444; border-radius: 3px; padding: 1px 4px;">SUPERSEDED</span>' : ''}
          </div>
          <button class="btn-delete-mem btn-delete-fact" data-fact-id="${fact.id}" title="ลบข้อเท็จจริงนี้">
            <i class="fa-solid fa-xmark"></i>
          </button>
        `;
        factsContainer.appendChild(card);
      });

      factsContainer.querySelectorAll('.btn-delete-fact').forEach(btn => {
        btn.addEventListener('click', async () => {
          const factId = btn.dataset.factId;
          await API.deleteFact(State.activeSlot.id, factId);
          showToast('ลบข้อเท็จจริงเรียบร้อย', 'info');
          openMemoryDrawer();
        });
      });
    }
  } catch (err) {
    showToast('โหลดความจำไม่สำเร็จ: ' + err.message, 'error');
  }
}

// ============================================================================
// LOREBOOK & WORLD MAP DRAWER
// ============================================================================
async function openLorebookDrawer() {
  if (!State.activeWorld) {
    showToast('กรุณาเลือกโลกก่อน', 'info');
    return;
  }

  openDrawer('drawer-lorebook');

  try {
    const data = await API.getWorldLorebook(State.activeWorld.id);
    const entries = data.lorebook_entries || [];
    const locks = data.canon_locks || [];
    const details = data.lore_details || {};

    const container = document.getElementById('drawer-lorebook-content');
    container.innerHTML = `
      <div style="margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 700; color: var(--accent-amber);"><i class="fa-solid fa-globe"></i> ${escapeHtml(data.name)}</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">ข้อมูล Worldbook, ภูมิศาสตร์, วิทยาการ, และกฎเหล็ก Canon</p>
      </div>

      <!-- CANON LOCKS SECTION -->
      ${locks.length > 0 ? `
        <div style="margin-bottom: 18px;">
          <h4 style="font-size: 13.5px; font-weight: 700; color: #f87171; margin-bottom: 8px;">
            <i class="fa-solid fa-shield-halved"></i> กฎ Canon Locks (${locks.length} ข้อบังคับ)
          </h4>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${locks.map(l => `
              <div class="canon-lock-badge">
                <i class="fa-solid fa-lock"></i>
                <span>${escapeHtml(l.rule)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- LORE DETAILS -->
      <div style="margin-bottom: 18px;">
        <h4 style="font-size: 13.5px; font-weight: 700; color: var(--text-dim); margin-bottom: 8px;">
          <i class="fa-solid fa-map"></i> ภูมิศาสตร์ & สถานที่ (Geography)
        </h4>
        <div class="lore-entry-card">
          <p style="font-size: 13px; line-height: 1.6; color: var(--text-main); margin: 0;">${escapeHtml(details.geography || 'ไม่มีข้อมูล')}</p>
        </div>
      </div>

      <div style="margin-bottom: 18px;">
        <h4 style="font-size: 13.5px; font-weight: 700; color: var(--text-dim); margin-bottom: 8px;">
          <i class="fa-solid fa-wand-magic-sparkles"></i> กฎพลังเจตจำนง / ระบบพลัง (Magic & Will)
        </h4>
        <div class="lore-entry-card">
          <p style="font-size: 13px; line-height: 1.6; color: var(--text-main); margin: 0;">${escapeHtml(details.magic_rules || 'ไม่มีข้อมูล')}</p>
        </div>
      </div>

      <div style="margin-bottom: 18px;">
        <h4 style="font-size: 13.5px; font-weight: 700; color: var(--text-dim); margin-bottom: 8px;">
          <i class="fa-solid fa-users-rays"></i> ฝ่าย & องค์กร (Factions)
        </h4>
        <div class="lore-entry-card">
          <p style="font-size: 13px; line-height: 1.6; color: var(--text-main); margin: 0;">${escapeHtml(details.factions || 'ไม่มีข้อมูล')}</p>
        </div>
      </div>

      <!-- KEYWORD TRIGGERED ENTRIES -->
      ${entries.length > 0 ? `
        <div>
          <h4 style="font-size: 13.5px; font-weight: 700; color: var(--accent-amber); margin-bottom: 8px;">
            <i class="fa-solid fa-book-bookmark"></i> Lorebook Entries (${entries.length} รายการพร้อมคีย์เวิร์ดสแกน)
          </h4>
          ${entries.map(e => `
            <div class="lore-entry-card">
              <div class="lore-entry-title"><i class="fa-solid fa-feather"></i> ${escapeHtml(e.title)}</div>
              <div class="lore-entry-keys">
                ${(e.keys || []).map(k => `<span class="lore-key-pill">${escapeHtml(k)}</span>`).join('')}
              </div>
              <p style="font-size: 13px; line-height: 1.6; color: var(--text-main); margin: 0;">${escapeHtml(e.content)}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  } catch (err) {
    showToast('โหลด Lorebook ไม่สำเร็จ: ' + err.message, 'error');
  }
}

// ============================================================================
// AVATAR & IMAGE CUSTOMIZER MODAL
// ============================================================================
function renderAvatarPresets() {
  const container = Elements.modals.avatarPresetsContainer;
  if (!container) return;

  container.innerHTML = '';
  AVATAR_PRESETS.forEach(preset => {
    const item = document.createElement('div');
    item.className = 'avatar-preset-item';
    item.title = preset.name;
    item.innerHTML = `<img src="${preset.url}" alt="${escapeHtml(preset.name)}">`;
    item.addEventListener('click', () => {
      document.querySelectorAll('.avatar-preset-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      State.selectedAvatarUrl = preset.url;
      Elements.modals.avatarPreview.src = preset.url;
      Elements.modals.avatarUrlInput.value = preset.url;
    });
    container.appendChild(item);
  });
}

function openAvatarModal(targetCharId = null) {
  State.avatarTargetCharId = targetCharId;
  const isPlayer = !targetCharId || (State.activeCharacter && targetCharId === State.activeCharacter.id);

  let charName = State.activeCharacter ? State.activeCharacter.name : 'ตัวละคร';
  let currentAvatar = State.activeCharacter ? State.activeCharacter.avatar : AVATAR_PRESETS[0].url;

  if (!isPlayer && State.activeSlot && State.activeSlot.roster) {
    const npc = State.activeSlot.roster.find(r => r.id === targetCharId);
    if (npc) {
      charName = npc.name;
      currentAvatar = npc.avatar || currentAvatar;
    }
  } else if (State.activeSlot && State.activeSlot.custom_avatar) {
    currentAvatar = State.activeSlot.custom_avatar;
  }

  Elements.modals.avatarTargetName.innerText = `ปรับแต่งรูป: ${charName}`;
  Elements.modals.avatarPreview.src = currentAvatar;
  Elements.modals.avatarUrlInput.value = currentAvatar;
  State.selectedAvatarUrl = currentAvatar;

  Elements.modals.avatar.style.display = 'flex';
}

// ============================================================================
// IN-PLACE MESSAGE EDITING
// ============================================================================
function openEditMessageModal(msgId) {
  if (!State.activeSlot) return;
  const msg = State.activeSlot.history.find(m => m.id === msgId);
  if (!msg) return;

  State.editingMsgId = msgId;
  Elements.modals.editMsgInput.value = msg.content;
  Elements.modals.editMsg.style.display = 'flex';
}

// ============================================================================
// CODEX & INVENTORY DRAWERS
// ============================================================================
let activeCodexTab = 'social';

function renderCodexDrawer() {
  if (!State.activeSlot || !State.activeCharacter) return;

  const character = State.activeCharacter;
  const world = State.activeWorld || {};
  const slot = State.activeSlot;
  const stats = character.static_profile?.base_stats || {};

  const roster = slot.roster || [];
  const discoveredNpcs = slot.discovered_npcs || [];
  const allNpcs = [...roster, ...discoveredNpcs];

  // 1. Protagonist Secrets HTML
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

  // 2. Social Roster HTML
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
            <div class="avatar-wrapper" style="cursor: pointer;" title="คลิกเพื่อเปลี่ยนรูปตัวละครนี้" onclick="openAvatarModal('${npc.id}')">
              <img src="${escapeHtml(npc.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop')}" alt="${escapeHtml(npc.name)}" class="npc-social-avatar" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'">
              <span class="avatar-edit-badge"><i class="fa-solid fa-camera"></i></span>
            </div>
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

  // 3. Protagonist Tab HTML
  const tabProtagonistHtml = `
    <div id="codex-pane-protag" class="codex-pane ${activeCodexTab === 'protagonist' ? 'active' : ''}">
      <div class="codex-profile-card">
        <div class="avatar-wrapper" style="cursor: pointer;" title="คลิกเพื่อเปลี่ยนรูปตัวละคร" onclick="openAvatarModal()">
          <img class="codex-avatar" src="${slot.custom_avatar || character.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'}">
          <span class="avatar-edit-badge"><i class="fa-solid fa-camera"></i></span>
        </div>
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

  // 4. Social Tab HTML
  const tabSocialHtml = `
    <div id="codex-pane-social" class="codex-pane ${activeCodexTab === 'social' ? 'active' : ''}">
      <p class="section-desc">รายชื่อตัวละครทั้งหมดในโลกนี้ พร้อมระดับความผูกพันและบันทึกลับที่ค้นพบ</p>
      <div class="npcs-social-list">
        ${npcsSocialHtml}
      </div>
    </div>
  `;

  // Render Full Codex Container
  Elements.drawers.codexContent.innerHTML = `
    <div class="codex-tabs-header">
      <button class="codex-tab-btn ${activeCodexTab === 'social' ? 'active' : ''}" data-tab="social">
        <i class="fa-solid fa-users"></i> ความสัมพันธ์ (${allNpcs.length})
      </button>
      <button class="codex-tab-btn ${activeCodexTab === 'protagonist' ? 'active' : ''}" data-tab="protagonist">
        <i class="fa-solid fa-user-astronaut"></i> ตัวคุณ (${escapeHtml(character.name.split(' ')[0])})
      </button>
    </div>
    ${tabSocialHtml}
    ${tabProtagonistHtml}
  `;

  // Bind tab switching
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
    Elements.drawers.inventoryList.innerHTML = `<span style="font-size: 13px; color: var(--text-dim);">ไม่มีไอเทมในกระเป๋า</span>`;
    return;
  }

  items.forEach((item, idx) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'inventory-item';
    itemEl.innerHTML = `
      <span><i class="fa-solid fa-cube" style="color: var(--accent-amber); margin-right: 6px;"></i> ${escapeHtml(item)}</span>
      <button class="btn-remove-item" data-idx="${idx}" title="ทิ้งไอเทมนี้"><i class="fa-solid fa-xmark"></i></button>
    `;
    Elements.drawers.inventoryList.appendChild(itemEl);
  });

  Elements.drawers.inventoryList.querySelectorAll('.btn-remove-item').forEach(btn => {
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
  
  const tokens = preset.max_response_tokens || 800;
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
  Elements.drawers.baseURL.value = settings.baseURL || 'https://api.deepseek.com';
  Elements.drawers.modelName.value = settings.model || 'deepseek-chat';
  if (Elements.drawers.refereeModel) {
    Elements.drawers.refereeModel.value = settings.refereeModel || 'deepseek-v4-flash';
  }

  if (Elements.drawers.headerApiDot) {
    Elements.drawers.headerApiDot.className = settings.apiKey ? 'api-status-dot green' : 'api-status-dot red';
    Elements.drawers.headerApiDot.title = settings.apiKey ? `AI Model: ${settings.model}` : 'ยังไม่ได้ตั้งค่า API Key';
  }
}

// ============================================================================
// EVENT LISTENERS SETUP
// ============================================================================
function setupEventListeners() {
  // Navigation
  document.getElementById('btn-home')?.addEventListener('click', () => {
    switchView('view-browse');
  });

  Elements.slots.btnBack?.addEventListener('click', () => {
    switchView('view-browse');
  });

  Elements.slots.btnNewSlot?.addEventListener('click', createNewSlotHandler);

  // Interaction Mode
  Elements.story.btnModeDo?.addEventListener('click', () => setInteractionMode('Do'));
  Elements.story.btnModeSay?.addEventListener('click', () => setInteractionMode('Say'));

  // Chat Send Turn
  Elements.story.btnSend?.addEventListener('click', handleSendTurn);
  Elements.story.input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendTurn();
    }
  });

  // Floating Type Button (Mobile)
  document.getElementById('btn-floating-type')?.addEventListener('click', () => {
    Elements.story.input?.focus();
    scrollToBottom();
  });

  // Story Room Header Action Buttons
  document.getElementById('btn-open-memory')?.addEventListener('click', openMemoryDrawer);
  document.getElementById('btn-open-lorebook')?.addEventListener('click', openLorebookDrawer);
  document.getElementById('btn-open-codex')?.addEventListener('click', () => openDrawer('drawer-codex'));
  document.getElementById('btn-open-inventory')?.addEventListener('click', () => openDrawer('drawer-inventory'));
  document.getElementById('btn-open-preset')?.addEventListener('click', () => openDrawer('drawer-preset'));
  document.getElementById('btn-open-slots')?.addEventListener('click', () => {
    if (State.activeWorld && State.activeCharacter) {
      openSaveSlotsView(State.activeWorld.id, State.activeCharacter.id);
    }
  });
  document.getElementById('btn-open-settings')?.addEventListener('click', () => openDrawer('drawer-settings'));

  // Header Avatar Click -> Open Avatar Customizer
  document.getElementById('btn-header-avatar-click')?.addEventListener('click', () => openAvatarModal());

  // Quick Action Buttons
  Elements.story.btnRegen?.addEventListener('click', handleRegenerate);
  Elements.story.btnUndo?.addEventListener('click', handleUndo);

  // Drawer Close Buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const drawerId = btn.dataset.close;
      closeDrawer(drawerId);
    });
  });

  // Memory Drawer Tab Switching
  document.querySelectorAll('[data-memtab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-memtab]').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.memory-tab-pane').forEach(p => p.style.display = 'none');

      btn.classList.add('active');
      const tabId = btn.dataset.memtab;
      if (tabId === 'mem-episodic') document.getElementById('mem-tab-episodic').style.display = 'block';
      if (tabId === 'mem-facts') document.getElementById('mem-tab-facts').style.display = 'block';
      if (tabId === 'mem-summary') document.getElementById('mem-tab-summary').style.display = 'block';
    });
  });

  // Add Manual Fact in Memory Drawer
  document.getElementById('btn-add-manual-fact')?.addEventListener('click', async () => {
    const sub = document.getElementById('input-fact-subject')?.value.trim();
    const pred = document.getElementById('input-fact-pred')?.value.trim();
    const obj = document.getElementById('input-fact-obj')?.value.trim();

    if (!sub || !pred || !obj) {
      showToast('กรุณากรอก Subject, Predicate และ Object ให้ครบ', 'info');
      return;
    }

    try {
      await API.addFact(State.activeSlot.id, { subject: sub, predicate: pred, object: obj });
      document.getElementById('input-fact-subject').value = '';
      document.getElementById('input-fact-pred').value = '';
      document.getElementById('input-fact-obj').value = '';
      showToast('เพิ่มข้อเท็จจริงสำเร็จ!', 'success');
      openMemoryDrawer();
    } catch (err) {
      showToast('เพิ่มข้อเท็จจริงล้มเหลว: ' + err.message, 'error');
    }
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

  // Provider Chips Selection
  document.querySelectorAll('.provider-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.provider-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const providerKey = chip.dataset.provider;
      const provider = AI_PROVIDERS[providerKey];
      if (!provider) return;

      if (providerKey !== 'custom' && provider.baseURL) {
        Elements.drawers.baseURL.value = provider.baseURL;
      }
      if (providerKey !== 'custom' && provider.defaultModel) {
        Elements.drawers.modelName.value = provider.defaultModel;
      }
      if (Elements.drawers.apiKey) {
        Elements.drawers.apiKey.placeholder = provider.keyPlaceholder;
      }
    });
  });

  // Toggle API Key Visibility
  Elements.drawers.btnToggleKey?.addEventListener('click', () => {
    const type = Elements.drawers.apiKey.type === 'password' ? 'text' : 'password';
    Elements.drawers.apiKey.type = type;
  });

  // Test & Verify API Key
  Elements.drawers.btnTestApiKey?.addEventListener('click', async () => {
    const apiKey = Elements.drawers.apiKey.value.trim();
    const model = Elements.drawers.modelName.value.trim() || 'deepseek-chat';
    const baseURL = Elements.drawers.baseURL.value.trim() || 'https://api.deepseek.com';

    if (!apiKey) {
      showToast('กรุณากรอก API Key ก่อนทดสอบ', 'error');
      return;
    }

    Elements.drawers.btnTestApiKey.disabled = true;
    Elements.drawers.btnTestApiKey.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังทดสอบเชื่อมต่อ...';
    Elements.drawers.testResult.style.display = 'block';
    Elements.drawers.testResult.innerHTML = `กำลังทดสอบส่งข้อความไปยัง ${baseURL}...`;

    try {
      const res = await API.verifySettings({ apiKey, baseURL, model });
      Elements.drawers.testResult.innerHTML = `
        <div style="color: var(--accent-emerald); font-weight: 600;">
          <i class="fa-solid fa-circle-check"></i> เชื่อมต่อสำเร็จ! (${res.latencyMs} ms)
        </div>
        <div style="font-size: 12px; margin-top: 4px; color: var(--text-muted);">
          AI ตอบกลับ: "${escapeHtml(res.reply)}" | โมเดล: ${escapeHtml(res.model)}
        </div>
      `;
      if (Elements.drawers.headerApiDot) Elements.drawers.headerApiDot.className = 'api-status-dot green';
      showToast(`เชื่อมต่อโมเดล ${model} สำเร็จ!`, 'success');

      // Auto save
      await API.saveSettings({
        apiKey,
        model,
        baseURL,
        refereeModel: Elements.drawers.refereeModel?.value.trim() || 'deepseek-v4-flash'
      });
    } catch (err) {
      Elements.drawers.testResult.innerHTML = `
        <div style="color: #ef4444; font-weight: 600;">
          <i class="fa-solid fa-triangle-exclamation"></i> การเชื่อมต่อล้มเหลว
        </div>
        <div style="font-size: 12px; margin-top: 4px; color: #f87171;">
          ${escapeHtml(err.message)}
        </div>
      `;
      if (Elements.drawers.headerApiDot) Elements.drawers.headerApiDot.className = 'api-status-dot red';
      showToast('เชื่อมต่อไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      Elements.drawers.btnTestApiKey.disabled = false;
      Elements.drawers.btnTestApiKey.innerHTML = '<i class="fa-solid fa-network-wired"></i> ทดสอบการเชื่อมต่อ (Verify Connection)';
    }
  });

  // Save Settings
  Elements.drawers.btnSaveSettings?.addEventListener('click', async () => {
    const settings = {
      apiKey: Elements.drawers.apiKey.value.trim(),
      model: Elements.drawers.modelName.value.trim(),
      refereeModel: Elements.drawers.refereeModel?.value.trim() || 'deepseek-v4-flash',
      baseURL: Elements.drawers.baseURL.value.trim()
    };

    try {
      await API.saveSettings(settings);
      if (Elements.drawers.headerApiDot) {
        Elements.drawers.headerApiDot.className = settings.apiKey ? 'api-status-dot green' : 'api-status-dot red';
      }
      showToast(`บันทึกการตั้งค่า AI สำเร็จ`, 'success');
      closeDrawer('drawer-settings');
    } catch (err) {
      showToast('บันทึกการตั้งค่าไม่สำเร็จ: ' + err.message, 'error');
    }
  });

  // Avatar Customizer Events
  Elements.modals.avatarUrlInput?.addEventListener('input', (e) => {
    const url = e.target.value.trim();
    if (url) {
      Elements.modals.avatarPreview.src = url;
      State.selectedAvatarUrl = url;
    }
  });

  Elements.modals.avatarFileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (re) => {
        const base64 = re.target.result;
        Elements.modals.avatarPreview.src = base64;
        Elements.modals.avatarUrlInput.value = base64;
        State.selectedAvatarUrl = base64;
      };
      reader.readAsDataURL(file);
    }
  });

  Elements.modals.btnSaveAvatar?.addEventListener('click', async () => {
    const newAvatar = State.selectedAvatarUrl || Elements.modals.avatarUrlInput.value.trim();
    if (!newAvatar) {
      showToast('กรุณาระบุ URL หรือเลือกรูปภาพ', 'info');
      return;
    }

    if (!State.activeSlot) {
      showToast('กรุณาเปิด Save Slot ก่อนเปลี่ยนรูป', 'info');
      return;
    }

    try {
      await API.updateSlotAvatar(State.activeSlot.id, newAvatar, State.avatarTargetCharId);
      
      if (!State.avatarTargetCharId || State.avatarTargetCharId === State.activeCharacter.id) {
        State.activeSlot.custom_avatar = newAvatar;
        State.activeCharacter.avatar = newAvatar;
        Elements.header.charAvatar.src = newAvatar;
      } else if (State.activeSlot.roster) {
        const npc = State.activeSlot.roster.find(r => r.id === State.avatarTargetCharId);
        if (npc) npc.avatar = newAvatar;
      }

      Elements.modals.avatar.style.display = 'none';
      renderCodexDrawer();
      showToast('บันทึกรูปภาพตัวละครเรียบร้อย!', 'success');
    } catch (err) {
      showToast('เปลี่ยนรูปภาพไม่สำเร็จ: ' + err.message, 'error');
    }
  });

  Elements.modals.btnCloseAvatar?.addEventListener('click', () => Elements.modals.avatar.style.display = 'none');
  Elements.modals.btnCancelAvatar?.addEventListener('click', () => Elements.modals.avatar.style.display = 'none');

  // Edit Message Events
  Elements.modals.btnSaveEditMsg?.addEventListener('click', async () => {
    const newText = Elements.modals.editMsgInput.value.trim();
    if (!newText || !State.editingMsgId || !State.activeSlot) return;

    const msg = State.activeSlot.history.find(m => m.id === State.editingMsgId);
    if (msg) {
      msg.content = newText;
      renderChatMessages(State.activeSlot.history);
      await API.updatePreset(State.activeSlot.id, State.activeSlot.style_preset);
      showToast('แก้ไขข้อความเรียบร้อย', 'success');
    }
    Elements.modals.editMsg.style.display = 'none';
  });

  Elements.modals.btnCloseEditMsg?.addEventListener('click', () => Elements.modals.editMsg.style.display = 'none');
  Elements.modals.btnCancelEditMsg?.addEventListener('click', () => Elements.modals.editMsg.style.display = 'none');

  // Detailed World Creator Modal
  Elements.browse.btnCreateWorld?.addEventListener('click', () => Elements.advModal.modal.style.display = 'flex');
  Elements.advModal.btnClose?.addEventListener('click', () => Elements.advModal.modal.style.display = 'none');
  Elements.advModal.btnCancel?.addEventListener('click', () => Elements.advModal.modal.style.display = 'none');

  document.querySelectorAll('.creator-tabs-nav .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.creator-tabs-nav .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // AI Gen Prologue in World Creator
  Elements.advModal.btnAiGenPrologue?.addEventListener('click', async () => {
    const charName = Elements.advModal.charName.value.trim();
    if (!charName) {
      showToast('กรุณาระบุชื่อตัวละครก่อน', 'info');
      return;
    }

    const btn = Elements.advModal.btnAiGenPrologue;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังแต่งบทนำ...';

    try {
      const res = await API.generateAIPrologue({
        worldName: Elements.advModal.worldName.value.trim(),
        worldDesc: Elements.advModal.worldDesc.value.trim(),
        characterName: charName,
        charDesc: Elements.advModal.charRole.value.trim(),
        charPersonality: Elements.advModal.charTags.value.split(',').map(t => t.trim()).filter(Boolean)
      });
      Elements.advModal.charPrologue.value = res.prologue;
      showToast('AI แต่งบทนำสำเร็จ!', 'success');
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
        factions: Elements.advModal.loreFactions.value.trim(),
        custom_lore: Elements.advModal.loreCustom.value.trim()
      }
    };

    const charPayload = {
      name: charName,
      short_desc: Elements.advModal.charRole.value.trim(),
      avatar: Elements.advModal.charAvatar.value.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
      personality_tags: Elements.advModal.charTags.value.split(',').map(t => t.trim()).filter(Boolean),
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
      initial_inventory: Elements.advModal.charInv.value.split(',').map(i => i.trim()).filter(Boolean),
      codex_notes: Elements.advModal.sec1Title.value.trim() ? [{
        id: 'sec_1',
        title: Elements.advModal.sec1Title.value.trim(),
        content: Elements.advModal.sec1Content.value.trim(),
        hint: Elements.advModal.sec1Hint.value.trim() || 'พูดคุยเปิดใจ',
        unlocked: false
      }] : []
    };

    try {
      await API.createAdvancedWorld(worldPayload, [charPayload]);
      Elements.advModal.modal.style.display = 'none';
      showToast(`สร้างโลก "${worldName}" และตัวละคร "${charName}" สำเร็จ!`, 'success');
      await loadInitialData();
    } catch (err) {
      showToast('สร้างโลกล้มเหลว: ' + err.message, 'error');
    }
  });

  // Worldbook Import Modal
  Elements.browse.btnImportWorldbook?.addEventListener('click', () => Elements.wbModal.modal.style.display = 'flex');
  Elements.wbModal.btnClose?.addEventListener('click', () => Elements.wbModal.modal.style.display = 'none');
  Elements.wbModal.btnCancel?.addEventListener('click', () => Elements.wbModal.modal.style.display = 'none');

  Elements.wbModal.dropzone?.addEventListener('click', () => Elements.wbModal.fileInput?.click());
  Elements.wbModal.fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (re) => {
        Elements.wbModal.rawInput.value = re.target.result;
        showToast(`โหลดไฟล์ ${file.name} สำเร็จ`, 'info');
      };
      reader.readAsText(file);
    }
  });

  Elements.wbModal.btnStartAnalyze?.addEventListener('click', async () => {
    const raw = Elements.wbModal.rawInput.value.trim();
    if (!raw) {
      showToast('กรุณาอัปโหลดไฟล์หรือวางเนื้อหา Worldbook', 'info');
      return;
    }

    Elements.wbModal.btnStartAnalyze.disabled = true;
    Elements.wbModal.analyzingBanner.style.display = 'flex';

    try {
      const result = await API.analyzeWorldbook(raw);
      populateWbPreview(result);
      switchWbStep('preview');
      showToast('AI วิเคราะห์และสกัดข้อมูลสำเร็จ!', 'success');
    } catch (err) {
      showToast('วิเคราะห์ Worldbook ล้มเหลว: ' + err.message, 'error');
    } finally {
      Elements.wbModal.btnStartAnalyze.disabled = false;
      Elements.wbModal.analyzingBanner.style.display = 'none';
    }
  });

  Elements.wbModal.btnBackToUpload?.addEventListener('click', () => switchWbStep('upload'));

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

    try {
      await API.createAdvancedWorld(worldPayload, characters);
      Elements.wbModal.modal.style.display = 'none';
      switchWbStep('upload');
      showToast(`สร้างโลก "${worldName}" พร้อม ${characters.length} ตัวละครสำเร็จ!`, 'success');
      await loadInitialData();
    } catch (err) {
      showToast('บันทึก Worldbook ไม่สำเร็จ: ' + err.message, 'error');
    }
  });

  // Search Filter
  Elements.browse.searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderWorldsList(State.worlds);
      return;
    }
    const filtered = State.worlds.filter(w => {
      const charMatches = State.characters.some(c => c.world_id === w.id && c.name.toLowerCase().includes(q));
      return w.name.toLowerCase().includes(q) ||
        (w.tag && w.tag.toLowerCase().includes(q)) ||
        (w.description && w.description.toLowerCase().includes(q)) ||
        charMatches;
    });
    renderWorldsList(filtered);
  });
}

function switchWbStep(step) {
  if (step === 'upload') {
    Elements.wbModal.stepUpload.style.display = 'block';
    Elements.wbModal.stepPreview.style.display = 'none';
    Elements.wbModal.footerUpload.style.display = 'flex';
    Elements.wbModal.footerPreview.style.display = 'none';
  } else {
    Elements.wbModal.stepUpload.style.display = 'none';
    Elements.wbModal.stepPreview.style.display = 'block';
    Elements.wbModal.footerUpload.style.display = 'none';
    Elements.wbModal.footerPreview.style.display = 'flex';
  }
}

function populateWbPreview(data) {
  const w = data.world || {};
  Elements.wbModal.previewWorldName.value = w.name || '';
  Elements.wbModal.previewWorldTag.value = w.tag || 'Hero Academy';
  Elements.wbModal.previewWorldDesc.value = w.description || '';
  Elements.wbModal.previewWorldCover.value = w.cover_image || '';
  Elements.wbModal.previewLoreGeo.value = w.lore_details?.geography || '';
  Elements.wbModal.previewLoreMagic.value = w.lore_details?.magic_rules || '';
  Elements.wbModal.previewLoreFactions.value = w.lore_details?.factions || '';
  Elements.wbModal.previewLoreCustom.value = w.lore_details?.custom_lore || '';

  renderWbCharactersPreview(data.characters || []);
}

function renderWbCharactersPreview(chars) {
  const container = Elements.wbModal.charsPreviewContainer;
  container.innerHTML = '';
  Elements.wbModal.charsCountSpan.innerText = chars.length;

  chars.forEach((c, idx) => {
    const card = document.createElement('div');
    card.className = 'char-preview-edit-card';
    card.dataset.idx = idx;

    const stats = c.static_profile?.base_stats || { strength: 10, agility: 10, intelligence: 10, charisma: 10, perception: 10 };
    const sec1 = (c.codex_notes && c.codex_notes[0]) || { title: '', content: '', hint: '' };

    card.innerHTML = `
      <div class="char-preview-edit-header">
        <span style="font-weight: 700; color: var(--accent-amber);"><i class="fa-solid fa-user-tag"></i> ตัวละคร #${idx + 1}</span>
        <button type="button" class="btn-remove-preview-char" style="background:transparent; border:none; color:#ef4444; cursor:pointer;" title="ลบตัวละครนี้"><i class="fa-solid fa-trash"></i></button>
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label>ชื่อตัวละคร *</label>
          <input type="text" class="wb-char-name form-input" value="${escapeHtml(c.name || '')}">
        </div>
        <div class="form-group">
          <label>บทบาท / ฉายา</label>
          <input type="text" class="wb-char-role form-input" value="${escapeHtml(c.role || c.short_desc || '')}">
        </div>
      </div>
      <div class="form-group">
        <label>ประวัติย่อ</label>
        <textarea class="wb-char-history form-textarea" rows="2">${escapeHtml(c.static_profile?.history || c.history || '')}</textarea>
      </div>
      <div class="form-group">
        <label>บทนำเปิดฉาก (Prologue)</label>
        <textarea class="wb-char-prologue form-textarea" rows="3">${escapeHtml(c.opening_prologue || '')}</textarea>
      </div>
    `;

    card.querySelector('.btn-remove-preview-char')?.addEventListener('click', () => {
      card.remove();
      Elements.wbModal.charsCountSpan.innerText = container.querySelectorAll('.char-preview-edit-card').length;
    });

    container.appendChild(card);
  });
}

function getWbEditedCharacters() {
  const cards = Elements.wbModal.charsPreviewContainer.querySelectorAll('.char-preview-edit-card');
  const chars = [];

  cards.forEach(card => {
    const name = card.querySelector('.wb-char-name')?.value.trim();
    if (name) {
      chars.push({
        name,
        role: card.querySelector('.wb-char-role')?.value.trim() || '',
        short_desc: card.querySelector('.wb-char-role')?.value.trim() || '',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
        personality_tags: ['มีมิติ', 'น่าค้นหา'],
        opening_prologue: card.querySelector('.wb-char-prologue')?.value.trim() || '',
        static_profile: {
          history: card.querySelector('.wb-char-history')?.value.trim() || '',
          base_stats: { strength: 10, agility: 10, intelligence: 10, charisma: 10, perception: 10 }
        },
        initial_inventory: ['เหรียญเงิน 50 เหรียญ', 'สัมภาระพกพา'],
        codex_notes: []
      });
    }
  });

  return chars;
}

function setInteractionMode(mode) {
  State.currentMode = mode;
  if (mode === 'Do') {
    Elements.story.btnModeDo.classList.add('active');
    Elements.story.btnModeSay.classList.remove('active');
    Elements.story.modeLabel.innerText = 'Do';
    Elements.story.modeIndicator.innerHTML = '<i class="fa-solid fa-hand-fist"></i> <span>Do</span>';
    Elements.story.input.placeholder = 'ระบุการกระทำทางกายภาพ/ยุทธวิธีของคุณ... เช่น "ชักมีดพกออกมาป้องกันตัว และสแกนหาจุดอ่อน"';
  } else {
    Elements.story.btnModeSay.classList.add('active');
    Elements.story.btnModeDo.classList.remove('active');
    Elements.story.modeLabel.innerText = 'Say';
    Elements.story.modeIndicator.innerHTML = '<i class="fa-solid fa-comment-dots"></i> <span>Say</span>';
    Elements.story.input.placeholder = 'พิมพ์คำพูดหรือแสดงความรู้สึกของคุณ... เช่น "สวัสดีครับ มีอะไรให้ผมช่วยแนะนำไหม?"';
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
