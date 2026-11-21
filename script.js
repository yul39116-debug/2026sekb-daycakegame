'use strict';

// 모든 이미지는 assets/ 폴더에 있습니다. 원래 대지의 비율(6667 × 5334)에 맞게 표시됩니다.
const ASSET_DIR = 'assets/';
const SCENES = {
  1: '1main.png',
  2: '2cake.png',
  3: '3cake.png',
  4: '4made.png',
  5: '5made.png',
  6: '6made.png',
  7: '7eat.png',
  8: '8eat.png',
  9: '9bad.png',
  10: '10nomal.png', // 원본 ZIP의 파일명을 그대로 사용
  11: '11best1.png',
  '11-2': '11best2.png',
  12: '12final.png'
};

// 3페이지 위쪽 버튼 배치 순서: 윗줄 6개, 아랫줄 6개.
// 버튼 위에는 투명한 클릭 영역을 얹으므로 버튼 이미지를 따로 추출할 필요가 없습니다.
const INGREDIENTS = [
  { name: '두부', file: '3cake두부.png' },
  { name: '계란', file: '3cake계란.png' },
  { name: '베이킹파우더', file: '3cake베이킹파우더.png' },
  { name: '소금', file: '3cake소금.png' },
  { name: '설탕', file: '3cake설탕.png' },
  { name: '밀가루', file: '3cake밀가루.png' },
  { name: '김치', file: '3cake김치.png' },
  { name: '동치미', file: '3cake동치미.png' },
  { name: '축구공', file: '3cake축구공.png' },
  { name: '딸기', file: '3cake딸기.png' },
  { name: '초코', file: '3cake초코.png' },
  { name: '버터', file: '3cake버터.png' }
];

const REQUIRED = ['밀가루', '계란', '버터', '베이킹파우더', '설탕', '소금'];
const SECRET = ['축구공', '김치', '동치미'];

const screenImage = document.querySelector('#screen-image');
const controls = document.querySelector('#controls');
const ingredientsLayer = document.querySelector('#ingredients-layer');
const help = document.querySelector('#help');
const status = document.querySelector('#status');
const closeHelp = document.querySelector('#close-help');

// 배경음악은 화면에 버튼을 표시하지 않고 자동으로 재생을 시도합니다.
// 브라우저가 소리 있는 자동재생을 막으면 첫 터치/클릭/키보드 입력에서 시작합니다.
const bgm = document.querySelector('#bgm');
bgm.volume = 0.40;
bgm.loop = true;
bgm.preload = 'auto';

// 효과음은 별도 ON/OFF 버튼 없이 항상 활성화합니다.
const SOUND_CONFIG = {
  click:             { file: 'click.wav', volume: 0.25 },
  dialogue:          { file: 'dialogue.wav', volume: 0.24 },
  add:               { file: 'ingredient-add.wav', volume: 0.34 },
  remove:            { file: 'ingredient-remove.wav', volume: 0.28 },
  next:              { file: 'next.wav', volume: 0.30 },
  start:             { file: 'start.wav', volume: 0.34 },
  good:              { file: 'result-good.wav', volume: 0.32 },
  bad:               { file: 'result-bad.wav', volume: 0.31 },
  secret:            { file: 'result-secret.wav', volume: 0.34 },
  restart:           { file: 'restart.wav', volume: 0.27 }
};
const soundBanks = {};
let sfxBankCursor = {};
Object.entries(SOUND_CONFIG).forEach(([name, cfg]) => {
  // 빠르게 여러 번 눌러도 클릭 소리가 끊어지지 않도록 재생기 3개를 준비합니다.
  soundBanks[name] = Array.from({length:3}, () => {
    const audio = new Audio('assets/sfx/' + cfg.file);
    audio.preload = 'auto';
    audio.volume = cfg.volume;
    return audio;
  });
  sfxBankCursor[name] = 0;
});
function playSfx(name) {
  if (!soundBanks[name]) return;
  const bank = soundBanks[name];
  const i = sfxBankCursor[name];
  sfxBankCursor[name] = (i + 1) % bank.length;
  const audio = bank[i];
  try {
    audio.pause();
    audio.currentTime = 0;
    const request = audio.play();
    if (request && typeof request.catch === 'function') request.catch(() => {});
  } catch (_) { /* 환경에 따라 오디오가 재생 불가할 경우 게임은 계속 진행됩니다. */ }
}
function playBgm() {
  // 이미 재생 중이라면 다시 시작하거나 시간 위치를 초기화하지 않습니다.
  if (!bgm.paused) return;
  let request;
  try {
    request = bgm.play();
  } catch (_) {
    return; // 오디오가 불가능한 환경에서도 게임 진행은 유지합니다.
  }
  if (request && typeof request.catch === 'function') {
    request.catch((error) => {
      // 사용자 동작 전 자동재생 제한은 정상적인 브라우저 정책입니다.
      // 버튼 표시 대신, 다음 화면 클릭/터치에서 다시 시도합니다.
      if (error && error.name === 'NotAllowedError') return;
      if (error && error.name === 'AbortError') return;
      // 파일 오류 확인은 개발자 도구 Console에서 가능하도록 기록합니다.
      console.warn('배경음악 재생 실패 (assets/bgm.mp3 확인):', error);
    });
  }
}

// 허용된 환경에서는 페이지를 열자마자 재생하고,
// 자동재생이 차단되는 브라우저에서는 가장 첫 사용자 동작으로 재생합니다.
// capture 단계에서 처리하므로 게임 시작 버튼의 동작보다 먼저 실행됩니다.
for (const type of ['pointerdown', 'click', 'keydown', 'touchstart']) {
  document.addEventListener(type, playBgm, { capture: true, passive: true });
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) playBgm();
});
window.addEventListener('pageshow', playBgm);
playBgm();

let page = 1;
let selected = new Set();
let selectionOrder = [];
let previousFocus = null;

function asset(file) { return ASSET_DIR + file; }

function preload(file) {
  if (!file) return;
  const image = new Image();
  image.src = asset(file);
}

/**
 * 정확한 결과 판정 우선순위:
 * 1. 필수 재료가 하나라도 없으면 9페이지.
 * 2. 필수 재료가 모두 있고 축구공·김치·동치미도 전부 있으면 11페이지.
 * 3. 그 외 필수 재료가 모두 있으면 10페이지.
 * 딸기·두부·초코 같은 다른 재료는 결과 조건에 영향을 주지 않습니다.
 */
function determineResult(picks) {
  if (!REQUIRED.every(name => picks.has(name))) return 9;
  if (SECRET.every(name => picks.has(name))) return 11;
  return 10;
}

function announce(message) { status.textContent = message; }

function makeHit({label,left,top,width,height,onClick,kind='',pressed}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `hit ${kind}`.trim();
  btn.setAttribute('aria-label',label);
  if (typeof pressed === 'boolean') {
    btn.setAttribute('aria-pressed', String(pressed));
    if (pressed) btn.classList.add('is-selected');
  }
  btn.style.left = `${left}%`;
  btn.style.top = `${top}%`;
  btn.style.width = `${width}%`;
  btn.style.height = `${height}%`;
  btn.addEventListener('click',onClick);
  controls.appendChild(btn);
  return btn;
}

function addDialogueHit(nextLabel, handler) {
  // 화살표가 들어 있는 하단 대화창 전체를 누를 수 있도록 설정.
  makeHit({ label:nextLabel, left:5.3, top:75.2, width:89.6, height:18.2, onClick:()=>{
    // 결과 화면 전환에는 별도의 결과 발표 효과음이 울립니다.
    if (page !== 8) playSfx(page === 12 ? 'restart' : 'dialogue');
    handler();
  } });
}

function renderSelectedIngredients() {
  ingredientsLayer.replaceChildren();
  // 최근 선택한 재료가 위에 표시됩니다. 원본 재료 PNG에는 그릇 앞부분이 포함되어 있습니다.
  for (const name of selectionOrder) {
    const ingredient = INGREDIENTS.find(item => item.name === name);
    if (!ingredient) continue;
    const layer = document.createElement('img');
    layer.src = asset(ingredient.file);
    layer.alt = '';
    layer.decoding = 'async';
    layer.draggable = false;
    ingredientsLayer.appendChild(layer);
  }
}

function toggleIngredient(name) {
  if (selected.has(name)) {
    selected.delete(name);
    playSfx('remove');
    selectionOrder = selectionOrder.filter(item => item !== name);
    announce(`${name} 선택 취소. 현재 ${selected.size}개 선택됨.`);
  } else {
    selected.add(name);
    playSfx('add');
    selectionOrder.push(name);
    announce(`${name} 추가! 현재 ${selected.size}개 선택됨.`);
  }
  renderSelectedIngredients();
  renderControls();
}

function renderIngredientButtons() {
  // 1000×800 기준 원본 그림에서 계산한 버튼 영역(퍼센트 좌표).
  const xs = [41.0, 50.5, 60.0, 69.5, 79.0, 88.4];
  const ys = [2.9, 15.3];
  INGREDIENTS.forEach((ingredient,index) => {
    const column = index % 6;
    const row = Math.floor(index/6);
    makeHit({
      label:`재료 ${ingredient.name} ${selected.has(ingredient.name) ? '선택 취소' : '추가'}`,
      left:xs[column], top:ys[row], width:9.1, height:11.6,
      kind:'ingredient', pressed:selected.has(ingredient.name),
      onClick:()=>toggleIngredient(ingredient.name)
    });
  });
  makeHit({
    label:'다음으로 — 재료 선택을 마치고 4페이지로 이동',
    left:77.2, top:84.8, width:20.9, height:12.5,
    onClick:()=>{playSfx('next');goToPage(4);}
  });
}

function renderControls() {
  controls.replaceChildren();
  if (page === 1) {
    makeHit({ label:'게임 시작', left:6.2,top:80.6,width:29.4,height:11.3,onClick:()=>{
      selected = new Set();
      selectionOrder=[];
      playBgm();
      playSfx('start');
      goToPage(2);
    }});
    makeHit({ label:'게임 방법 보기', left:6.2,top:67.4,width:29.4,height:10.6,onClick:()=>{playSfx('click');openHelp();} });
    return;
  }
  if (page === 3) { renderIngredientButtons(); return; }
  if (page === 2) { addDialogueHit('대화창 다음 — 재료 선택 화면으로 이동',()=>goToPage(3)); return; }
  if (page >= 4 && page <= 7) { addDialogueHit('대화창 다음',()=>goToPage(page + 1)); return; }
  if (page === 8) { addDialogueHit('대화창 다음 — 재료 조합 결과 보기',()=>goToPage(determineResult(selected))); return; }
  if (page === 11) { addDialogueHit('대화창 다음 — 특별 결과 이어서 보기',()=>goToPage('11-2')); return; }
  if (page === '11-2') { addDialogueHit('대화창 다음 — 마지막 화면',()=>goToPage(12)); return; }
  if (page === 9 || page === 10) { addDialogueHit('대화창 다음 — 마지막 화면',()=>goToPage(12)); return; }
  if (page === 12) { addDialogueHit('게임 처음부터 다시 시작',()=>goToPage(1)); }
}

function goToPage(target) {
  if (!Object.hasOwn(SCENES,target)) return;
  page = target;
  if (target === 9) playSfx('bad');
  if (target === 10) playSfx('good');
  if (target === 11) playSfx('secret');
  screenImage.src = asset(SCENES[target]);
  screenImage.alt = target === 3 ? '재료를 선택하는 3페이지' : `${target === '11-2' ? 11 : target}페이지 게임 장면`;
  // 재료는 3페이지에만 쌓아 표시합니다. 다음 페이지로 넘어가도 선택 기록은 유지됩니다.
  ingredientsLayer.style.display = page === 3 ? '' : 'none';
  if (page === 3) renderSelectedIngredients();
  renderControls();
  announce(target === 3 ? '재료를 자유롭게 선택하세요. 같은 재료를 다시 누르면 취소할 수 있습니다.' : `${target}페이지`);

  if (typeof target === 'number' && target >= 2 && target < 12) {
    const next = target === 2 ? 3 : target === 3 ? 4 : target === 8 ? determineResult(selected) : target + 1;
    if (SCENES[next]) preload(SCENES[next]);
  }
}

function openHelp() {
  previousFocus = document.activeElement;
  help.hidden = false;
  closeHelp.focus();
}
function hideHelp() {
  help.hidden = true;
  if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
}
closeHelp.addEventListener('click',()=>{playSfx('click');hideHelp();});
help.addEventListener('click',event=>{ if (event.target === help) hideHelp(); });
document.addEventListener('keydown',event=>{
  if (event.key === 'Escape' && !help.hidden) hideHelp();
  if (event.key === 'ArrowRight' && help.hidden && page !== 3 && !event.repeat) {
    // 키보드 이동도 화면의 실제 버튼과 동일한 소리/기능을 실행합니다.
    controls.querySelector('button.hit')?.click();
    event.preventDefault();
  }
});
screenImage.addEventListener('error',()=>announce('이미지 파일을 불러올 수 없습니다. assets 폴더를 확인해 주세요.'));

// 시작 화면 표시
renderControls();
preload(SCENES[2]);
