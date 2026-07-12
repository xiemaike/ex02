import * as THREE from 'three';
import './style.css';

const WORLD_SIZE = 34;
const HALF = WORLD_SIZE / 2;
const SEA_LEVEL = 3;
const REACH = 6;
const SAVE_KEY = 'blockhaven-save-v1';

const TYPES = {
  grass: { name: '草地', color: '#6fa447' },
  dirt: { name: '泥土', color: '#8a5d3b' },
  stone: { name: '岩石', color: '#87909a' },
  wood: { name: '原木', color: '#9a663c' },
  leaves: { name: '树叶', color: '#3d8648' },
  sand: { name: '沙砾', color: '#d8c17b' },
  water: { name: '水', color: '#4f9ed0', transparent: true }
};
const PALETTE = ['grass', 'dirt', 'stone', 'wood', 'leaves', 'sand'];

const gameRoot = document.querySelector('#game');
const startScreen = document.querySelector('#start-screen');
const pauseScreen = document.querySelector('#pause-screen');
const hud = document.querySelector('#hud');
const coordsEl = document.querySelector('#coords');
const countEl = document.querySelector('#placed-count');
const timeLabel = document.querySelector('#time-label');
const toast = document.querySelector('#toast');
const hotbar = document.querySelector('#hotbar');
const characterScreen = document.querySelector('#character-screen');
const characterPreview = document.querySelector('#character-preview');
const characterNameEl = document.querySelector('#character-name');
const viewLabel = document.querySelector('#view-label');
const nameInput = document.querySelector('#name-input');

const CHARACTER_COLORS = {
  skin: ['#f2c7a5', '#d9a077', '#b87550', '#75472f'],
  shirt: ['#df794d', '#4f9ec4', '#6fa447', '#7a64b7', '#d2a83f'],
  hair: ['#4a3028', '#1f2732', '#9a6235', '#d1b36a', '#713f58']
};
const CHARACTER_PRESETS = {
  furina: { label: '水之歌者', note: '芙宁娜风格', defaultName: '芙露娜', skin: '#f2c7a5', shirt: '#203f74', hair: '#e8edf4', trousers: '#16294f', accent: '#71d8e5', eyes: '#43bfe0', hairStyle: 'long', accessory: 'hat' },
  sakura: { label: '樱花魔法使', note: '原创动漫', defaultName: '小樱', skin: '#f0c0a2', shirt: '#c86b9d', hair: '#efa5c4', trousers: '#60466f', accent: '#ffe5f1', eyes: '#8d4bb0', hairStyle: 'twin', accessory: 'ribbon' },
  knight: { label: '金焰骑士', note: '原创动漫', defaultName: '艾琳', skin: '#e9b88f', shirt: '#e7e4da', hair: '#e3b95e', trousers: '#683d3b', accent: '#d84e3b', eyes: '#5c91c7', hairStyle: 'long', accessory: 'crown' },
  miko: { label: '月夜巫女', note: '原创动漫', defaultName: '月璃', skin: '#f1c8ae', shirt: '#f3eee5', hair: '#202737', trousers: '#9d3341', accent: '#d94a5b', eyes: '#bc425c', hairStyle: 'long', accessory: 'ribbon' },
  forest: { label: '森灵弓手', note: '原创动漫', defaultName: '青叶', skin: '#d7a47b', shirt: '#4f8b61', hair: '#75a86a', trousers: '#3f5748', accent: '#d5c46b', eyes: '#d1a83a', hairStyle: 'short', accessory: 'ears' }
};

const scene = new THREE.Scene();
scene.background = new THREE.Color('#8dd1e8');
scene.fog = new THREE.Fog('#8dd1e8', 22, 54);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 100);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
gameRoot.append(renderer.domElement);

const hemi = new THREE.HemisphereLight('#c9efff', '#48512f', 1.45);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0c2', 2.3);
sun.position.set(16, 26, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -25;
sun.shadow.camera.right = sun.shadow.camera.top = 25;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 70;
scene.add(sun);

const sunDisc = new THREE.Mesh(
  new THREE.SphereGeometry(1.25, 16, 16),
  new THREE.MeshBasicMaterial({ color: '#fff2a6', fog: false })
);
scene.add(sunDisc);

function pixelTexture(base, accents) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 32, 32);
  let seed = base.charCodeAt(1) * 97;
  for (let i = 0; i < 90; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = seed % 32;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = seed % 32;
    ctx.globalAlpha = .16 + (seed % 20) / 100;
    ctx.fillStyle = accents[seed % accents.length];
    const s = seed % 4 === 0 ? 2 : 1;
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const textureColors = {
  grass: ['#57893b', '#8fbd59'], dirt: ['#69442d', '#a5724b'],
  stone: ['#69737e', '#a4acb4'], wood: ['#6e432b', '#be8752'],
  leaves: ['#286f3b', '#61a855'], sand: ['#bca468', '#ead892'],
  water: ['#75c6e4', '#287fb9']
};
const materials = {};
for (const [type, data] of Object.entries(TYPES)) {
  materials[type] = new THREE.MeshLambertMaterial({
    map: pixelTexture(data.color, textureColors[type]),
    transparent: Boolean(data.transparent),
    opacity: data.transparent ? .62 : 1,
    depthWrite: !data.transparent
  });
}

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const worldGroup = new THREE.Group();
scene.add(worldGroup);
const blocks = new Map();
const meshes = [];
const editableChanges = new Map();
const keyOf = (x, y, z) => `${x},${y},${z}`;
const parseKey = key => key.split(',').map(Number);

function hash2(x, z) {
  let n = Math.imul(x, 374761393) + Math.imul(z, 668265263);
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function terrainHeight(x, z) {
  const rolling = Math.sin(x * .31) * 1.15 + Math.cos(z * .27) * 1.1 + Math.sin((x + z) * .16) * .9;
  return Math.max(1, Math.min(8, Math.floor(4.1 + rolling + hash2(x, z) * 1.25)));
}

function setBlock(x, y, z, type) {
  const key = keyOf(x, y, z);
  if (type) blocks.set(key, type); else blocks.delete(key);
}

function generateWorld() {
  blocks.clear();
  for (let x = -HALF; x < HALF; x++) {
    for (let z = -HALF; z < HALF; z++) {
      const h = terrainHeight(x, z);
      for (let y = 0; y <= h; y++) {
        let type = y === h ? (h <= SEA_LEVEL ? 'sand' : 'grass') : (y > h - 3 ? 'dirt' : 'stone');
        setBlock(x, y, z, type);
      }
      for (let y = h + 1; y <= SEA_LEVEL; y++) setBlock(x, y, z, 'water');

      const awayFromSpawn = Math.abs(x) > 3 || Math.abs(z) > 3;
      if (h > SEA_LEVEL + 1 && awayFromSpawn && hash2(x * 7, z * 11) > .91) {
        const trunk = 3 + Math.floor(hash2(x * 13, z * 17) * 2);
        for (let y = 1; y <= trunk; y++) setBlock(x, h + y, z, 'wood');
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = trunk - 1; dy <= trunk + 1; dy++) {
          if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy - trunk) < 4 && !(dx === 0 && dz === 0 && dy <= trunk)) {
            setBlock(x + dx, h + dy, z + dz, 'leaves');
          }
        }
        setBlock(x, h + trunk + 2, z, 'leaves');
      }
    }
  }
  for (const [key, type] of editableChanges) {
    const [x, y, z] = parseKey(key);
    setBlock(x, y, z, type || null);
  }
}

const dummy = new THREE.Object3D();
function rebuildMeshes() {
  for (const mesh of meshes) {
    worldGroup.remove(mesh);
    mesh.geometry.dispose();
  }
  meshes.length = 0;
  const grouped = Object.fromEntries(Object.keys(TYPES).map(type => [type, []]));
  for (const [key, type] of blocks) grouped[type].push(parseKey(key));

  for (const [type, positions] of Object.entries(grouped)) {
    if (!positions.length) continue;
    const geometry = boxGeometry.clone();
    const mesh = new THREE.InstancedMesh(geometry, materials[type], positions.length);
    mesh.userData.type = type;
    mesh.userData.positions = positions;
    mesh.userData.targetable = type !== 'water';
    positions.forEach(([x, y, z], i) => {
      dummy.position.set(x + .5, y + .5, z + .5);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = type !== 'water' && type !== 'leaves';
    mesh.receiveShadow = type !== 'water';
    mesh.renderOrder = type === 'water' ? 2 : 0;
    worldGroup.add(mesh);
    meshes.push(mesh);
  }
}

const selection = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.012, 1.012, 1.012)),
  new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: .85 })
);
selection.visible = false;
scene.add(selection);

const player = {
  position: new THREE.Vector3(0.5, terrainHeight(0, 0) + 1.01, 0.5),
  velocity: new THREE.Vector3(), yaw: 0, pitch: 0, radius: .3, height: 1.78,
  grounded: false, placed: 0
};
const keys = new Set();
let selectedIndex = 0;
let activeHit = null;
let started = false;
let dayPhase = .22;
let manualTime = false;
let thirdPerson = false;
let editingCharacter = false;
let characterFromStart = false;
const character = {
  name: '探险家', skin: CHARACTER_COLORS.skin[1], shirt: CHARACTER_COLORS.shirt[0],
  hair: CHARACTER_COLORS.hair[0], trousers: '#34455d', accent: '#f5d06f', eyes: '#243344',
  hairStyle: 'short', accessory: 'none', preset: 'custom', created: false
};

const characterMaterials = {
  skin: new THREE.MeshLambertMaterial({ color: character.skin }),
  shirt: new THREE.MeshLambertMaterial({ color: character.shirt }),
  hair: new THREE.MeshLambertMaterial({ color: character.hair }),
  trousers: new THREE.MeshLambertMaterial({ color: character.trousers }),
  accent: new THREE.MeshLambertMaterial({ color: character.accent }),
  eye: new THREE.MeshLambertMaterial({ color: character.eyes })
};
const avatar = new THREE.Group();
scene.add(avatar);

function avatarBox(size, position, material, parent = avatar) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}

const avatarParts = {
  leftLeg: avatarBox([.26, .72, .28], [-.15, .36, 0], characterMaterials.trousers),
  rightLeg: avatarBox([.26, .72, .28], [.15, .36, 0], characterMaterials.trousers),
  body: avatarBox([.62, .65, .34], [0, 1.02, 0], characterMaterials.shirt),
  leftArm: avatarBox([.18, .7, .22], [-.42, 1.01, 0], characterMaterials.shirt),
  rightArm: avatarBox([.18, .7, .22], [.42, 1.01, 0], characterMaterials.shirt),
  head: avatarBox([.5, .48, .48], [0, 1.58, 0], characterMaterials.skin),
  hair: avatarBox([.54, .14, .52], [0, 1.85, .01], characterMaterials.hair)
};
avatarBox([.075, .085, .025], [-.12, 1.61, -.247], characterMaterials.eye);
avatarBox([.075, .085, .025], [.12, 1.61, -.247], characterMaterials.eye);
const avatarAccent = avatarBox([.1, .64, .025], [0, 1.02, -.183], characterMaterials.accent);
const hairSides = [
  avatarBox([.13, .55, .18], [-.28, 1.45, .08], characterMaterials.hair),
  avatarBox([.13, .55, .18], [.28, 1.45, .08], characterMaterials.hair)
];
const accessoryGroups = {};
accessoryGroups.hat = new THREE.Group(); avatar.add(accessoryGroups.hat);
avatarBox([.76, .07, .58], [0, 1.94, .02], characterMaterials.shirt, accessoryGroups.hat);
avatarBox([.42, .22, .44], [0, 2.07, .02], characterMaterials.shirt, accessoryGroups.hat);
avatarBox([.44, .055, .46], [0, 2.0, -.205], characterMaterials.accent, accessoryGroups.hat);
accessoryGroups.ribbon = new THREE.Group(); avatar.add(accessoryGroups.ribbon);
const ribbonLeft = avatarBox([.3, .18, .1], [-.27, 1.78, .18], characterMaterials.accent, accessoryGroups.ribbon);
const ribbonRight = avatarBox([.3, .18, .1], [.27, 1.78, .18], characterMaterials.accent, accessoryGroups.ribbon);
ribbonLeft.rotation.z = -.35; ribbonRight.rotation.z = .35;
accessoryGroups.crown = new THREE.Group(); avatar.add(accessoryGroups.crown);
avatarBox([.5, .08, .42], [0, 1.94, .02], characterMaterials.accent, accessoryGroups.crown);
avatarBox([.09, .22, .09], [-.17, 2.06, .02], characterMaterials.accent, accessoryGroups.crown);
avatarBox([.09, .28, .09], [0, 2.09, .02], characterMaterials.accent, accessoryGroups.crown);
avatarBox([.09, .22, .09], [.17, 2.06, .02], characterMaterials.accent, accessoryGroups.crown);
accessoryGroups.ears = new THREE.Group(); avatar.add(accessoryGroups.ears);
const earLeft = avatarBox([.13, .34, .13], [-.32, 1.76, 0], characterMaterials.hair, accessoryGroups.ears);
const earRight = avatarBox([.13, .34, .13], [.32, 1.76, 0], characterMaterials.hair, accessoryGroups.ears);
earLeft.rotation.z = -.45; earRight.rotation.z = .45;

function applyCharacterAppearance() {
  characterMaterials.skin.color.set(character.skin);
  characterMaterials.shirt.color.set(character.shirt);
  characterMaterials.hair.color.set(character.hair);
  characterMaterials.trousers.color.set(character.trousers);
  characterMaterials.accent.color.set(character.accent);
  characterMaterials.eye.color.set(character.eyes);
  characterPreview.style.setProperty('--skin', character.skin);
  characterPreview.style.setProperty('--shirt', character.shirt);
  characterPreview.style.setProperty('--hair', character.hair);
  characterPreview.style.setProperty('--trousers', character.trousers);
  characterPreview.style.setProperty('--accent', character.accent);
  characterPreview.style.setProperty('--eyes', character.eyes);
  characterPreview.dataset.hairStyle = character.hairStyle;
  characterPreview.dataset.accessory = character.accessory;
  const longHair = character.hairStyle === 'long' || character.hairStyle === 'twin';
  hairSides.forEach((part, index) => {
    part.visible = longHair;
    part.position.x = character.hairStyle === 'twin' ? (index ? .38 : -.38) : (index ? .28 : -.28);
  });
  Object.entries(accessoryGroups).forEach(([name, group]) => { group.visible = character.accessory === name; });
  avatarAccent.visible = true;
  characterNameEl.textContent = character.name || '探险家';
  for (const [kind, colors] of Object.entries(CHARACTER_COLORS)) {
    [...document.querySelector(`#${kind}-options`).children].forEach((button, index) => {
      button.classList.toggle('active', colors[index] === character[kind]);
    });
  }
  document.querySelectorAll('.preset-card').forEach(card => card.classList.toggle('active', card.dataset.preset === character.preset));
}

function applyPreset(key) {
  const preset = CHARACTER_PRESETS[key];
  if (!preset) return;
  Object.assign(character, preset, { preset: key, name: preset.defaultName });
  nameInput.value = character.name;
  applyCharacterAppearance();
}

function setupCharacterEditor() {
  const presets = document.querySelector('#preset-options');
  presets.innerHTML = '';
  for (const [key, preset] of Object.entries(CHARACTER_PRESETS)) {
    const button = document.createElement('button');
    button.className = 'preset-card'; button.dataset.preset = key;
    button.innerHTML = `<div class="preset-icon" style="--hair:${preset.hair};--skin:${preset.skin};--shirt:${preset.shirt};--accent:${preset.accent}"></div><strong>${preset.label}</strong><small>${preset.note}</small>`;
    button.addEventListener('click', () => applyPreset(key));
    presets.append(button);
  }
  for (const [kind, colors] of Object.entries(CHARACTER_COLORS)) {
    const container = document.querySelector(`#${kind}-options`);
    container.innerHTML = '';
    colors.forEach(color => {
      const button = document.createElement('button');
      button.className = 'swatch'; button.style.setProperty('--swatch', color);
      button.setAttribute('aria-label', `选择${kind}颜色`);
      button.addEventListener('click', () => { character[kind] = color; character.preset = 'custom'; applyCharacterAppearance(); });
      container.append(button);
    });
  }
  applyCharacterAppearance();
}

function collides(pos) {
  const minX = Math.floor(pos.x - player.radius);
  const maxX = Math.floor(pos.x + player.radius);
  const minY = Math.floor(pos.y);
  const maxY = Math.floor(pos.y + player.height - .01);
  const minZ = Math.floor(pos.z - player.radius);
  const maxZ = Math.floor(pos.z + player.radius);
  for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) for (let z = minZ; z <= maxZ; z++) {
    const type = blocks.get(keyOf(x, y, z));
    if (type && type !== 'water') return true;
  }
  return false;
}

function movePlayer(delta) {
  const speed = keys.has('ShiftLeft') ? 6.3 : 4.4;
  const input = new THREE.Vector3(
    (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0), 0,
    (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0)
  );
  if (input.lengthSq()) input.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
  player.velocity.x += (input.x * speed - player.velocity.x) * Math.min(1, delta * 12);
  player.velocity.z += (input.z * speed - player.velocity.z) * Math.min(1, delta * 12);
  player.velocity.y -= 20 * delta;
  if (player.grounded && keys.has('Space')) {
    player.velocity.y = 7.2;
    player.grounded = false;
  }

  const next = player.position.clone();
  next.x += player.velocity.x * delta;
  if (!collides(next)) player.position.x = next.x; else player.velocity.x = 0;
  next.copy(player.position); next.z += player.velocity.z * delta;
  if (!collides(next)) player.position.z = next.z; else player.velocity.z = 0;
  next.copy(player.position); next.y += player.velocity.y * delta;
  if (!collides(next)) {
    player.position.y = next.y;
    player.grounded = false;
  } else {
    if (player.velocity.y < 0) player.grounded = true;
    player.velocity.y = 0;
  }
  player.position.x = THREE.MathUtils.clamp(player.position.x, -HALF + .35, HALF - .35);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -HALF + .35, HALF - .35);
  if (player.position.y < -10) respawn();
}

function updateAvatar(delta) {
  avatar.position.copy(player.position);
  avatar.rotation.y = player.yaw;
  avatar.visible = thirdPerson;
  const moving = Math.hypot(player.velocity.x, player.velocity.z) > .25 && player.grounded;
  const swing = moving ? Math.sin(performance.now() * .012) * .55 : 0;
  const easing = Math.min(1, delta * 14);
  avatarParts.leftArm.rotation.x += (swing - avatarParts.leftArm.rotation.x) * easing;
  avatarParts.rightArm.rotation.x += (-swing - avatarParts.rightArm.rotation.x) * easing;
  avatarParts.leftLeg.rotation.x += (-swing - avatarParts.leftLeg.rotation.x) * easing;
  avatarParts.rightLeg.rotation.x += (swing - avatarParts.rightLeg.rotation.x) * easing;
}

function updateCamera() {
  if (!thirdPerson) {
    camera.position.set(player.position.x, player.position.y + 1.62, player.position.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
    return;
  }
  const target = player.position.clone().add(new THREE.Vector3(0, 1.22, 0));
  const offset = new THREE.Vector3(0, 1.55 + player.pitch * .75, 4.3).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
}

function toggleView() {
  thirdPerson = !thirdPerson;
  viewLabel.textContent = thirdPerson ? '第三人称' : '第一人称';
  showToast(thirdPerson ? '已切换为第三人称' : '已切换为第一人称');
  saveWorld(false);
}

function respawn() {
  player.position.set(.5, terrainHeight(0, 0) + 1.01, .5);
  player.velocity.set(0, 0, 0);
}

const raycaster = new THREE.Raycaster();
raycaster.far = REACH;
function updateTarget() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const targetMeshes = meshes.filter(mesh => mesh.userData.targetable);
  const hit = raycaster.intersectObjects(targetMeshes, false)[0];
  if (!hit || hit.distance > REACH) {
    activeHit = null;
    selection.visible = false;
    return;
  }
  const pos = hit.object.userData.positions[hit.instanceId];
  activeHit = { position: pos, normal: hit.face.normal.clone() };
  selection.position.set(pos[0] + .5, pos[1] + .5, pos[2] + .5);
  selection.visible = true;
}

function blockIntersectsPlayer(x, y, z) {
  return x + 1 > player.position.x - player.radius && x < player.position.x + player.radius &&
    z + 1 > player.position.z - player.radius && z < player.position.z + player.radius &&
    y + 1 > player.position.y && y < player.position.y + player.height;
}

function editBlock(button) {
  if (!activeHit || document.pointerLockElement !== renderer.domElement) return;
  const [x, y, z] = activeHit.position;
  if (button === 0) {
    if (y <= 0) return showToast('最底层无法破坏');
    editableChanges.set(keyOf(x, y, z), 0);
    setBlock(x, y, z, null);
  } else if (button === 2) {
    const nx = x + Math.round(activeHit.normal.x);
    const ny = y + Math.round(activeHit.normal.y);
    const nz = z + Math.round(activeHit.normal.z);
    if (ny < 0 || Math.abs(nx) >= HALF || Math.abs(nz) >= HALF || blockIntersectsPlayer(nx, ny, nz)) return;
    const type = PALETTE[selectedIndex];
    editableChanges.set(keyOf(nx, ny, nz), type);
    setBlock(nx, ny, nz, type);
    player.placed++;
  }
  rebuildMeshes();
  countEl.textContent = player.placed;
  autoSaveSoon();
}

function buildHotbar() {
  hotbar.innerHTML = '';
  PALETTE.forEach((type, index) => {
    const button = document.createElement('button');
    button.className = `slot${index === selectedIndex ? ' active' : ''}`;
    button.innerHTML = `<small>${index + 1}</small><div class="cube" style="background:${TYPES[type].color}"></div><label>${TYPES[type].name}</label>`;
    button.addEventListener('click', () => selectSlot(index));
    hotbar.append(button);
  });
}

function selectSlot(index) {
  selectedIndex = (index + PALETTE.length) % PALETTE.length;
  [...hotbar.children].forEach((el, i) => el.classList.toggle('active', i === selectedIndex));
}

function saveWorld(showMessage = true) {
  const data = {
    changes: [...editableChanges], placed: player.placed,
    position: player.position.toArray(), yaw: player.yaw, pitch: player.pitch,
    selectedIndex, dayPhase, thirdPerson, character
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  if (showMessage) showToast('世界已保存');
}

function loadWorld() {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!data) return;
    editableChanges.clear();
    for (const [key, value] of data.changes || []) editableChanges.set(key, value);
    player.placed = data.placed || 0;
    if (data.position?.length === 3) player.position.fromArray(data.position);
    player.yaw = data.yaw || 0; player.pitch = data.pitch || 0;
    selectedIndex = data.selectedIndex || 0; dayPhase = data.dayPhase ?? dayPhase;
    thirdPerson = Boolean(data.thirdPerson);
    if (data.character) Object.assign(character, data.character);
  } catch { localStorage.removeItem(SAVE_KEY); }
}

let saveTimer;
function autoSaveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveWorld(false), 900); }
function showToast(message) {
  toast.textContent = message; toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1400);
}

function updateSky(delta) {
  if (!manualTime) dayPhase = (dayPhase + delta * .004) % 1;
  const angle = dayPhase * Math.PI * 2;
  const daylight = THREE.MathUtils.smoothstep(Math.sin(angle), -.2, .35);
  sun.position.set(Math.cos(angle) * 27, Math.sin(angle) * 30, 10);
  sunDisc.position.copy(sun.position).normalize().multiplyScalar(45);
  sun.intensity = .12 + daylight * 2.15;
  hemi.intensity = .18 + daylight * 1.3;
  const sky = new THREE.Color('#091326').lerp(new THREE.Color('#8dd1e8'), daylight);
  scene.background.copy(sky); scene.fog.color.copy(sky);
  sunDisc.visible = Math.sin(angle) > -.1;
  timeLabel.textContent = daylight > .58 ? '白昼' : '夜晚';
}

function begin() {
  editingCharacter = false;
  started = true;
  startScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  characterScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  renderer.domElement.requestPointerLock();
}

function openCharacterEditor(fromStart = false) {
  characterFromStart = fromStart;
  editingCharacter = true;
  if (document.pointerLockElement) document.exitPointerLock();
  startScreen.classList.add('hidden'); pauseScreen.classList.add('hidden');
  characterScreen.classList.remove('hidden');
  nameInput.value = character.name;
  applyCharacterAppearance();
}

document.querySelector('#play-button').addEventListener('click', () => character.created ? begin() : openCharacterEditor(true));
document.querySelector('#resume-button').addEventListener('click', begin);
document.querySelector('#save-button').addEventListener('click', () => saveWorld(true));
document.querySelector('#view-button').addEventListener('click', toggleView);
document.querySelector('#character-button').addEventListener('click', () => openCharacterEditor(false));
document.querySelector('#pause-character-button').addEventListener('click', () => openCharacterEditor(false));
document.querySelector('#save-character-button').addEventListener('click', () => {
  character.name = nameInput.value.trim().slice(0, 12) || '探险家';
  character.created = true; applyCharacterAppearance(); saveWorld(false); begin();
  showToast(`${character.name}，欢迎来到方块岛`);
});
document.querySelector('#cancel-character-button').addEventListener('click', () => {
  characterScreen.classList.add('hidden'); editingCharacter = false;
  if (characterFromStart && !started) startScreen.classList.remove('hidden'); else begin();
});
document.querySelector('#day-button').addEventListener('click', () => {
  manualTime = true;
  dayPhase = Math.sin(dayPhase * Math.PI * 2) > .2 ? .66 : .22;
  showToast(dayPhase < .5 ? '太阳升起来了' : '夜幕降临');
});
document.querySelector('#reset-button').addEventListener('click', () => {
  editableChanges.clear(); player.placed = 0;
  player.yaw = player.pitch = 0; dayPhase = .22; manualTime = false;
  respawn(); generateWorld(); rebuildMeshes(); countEl.textContent = '0'; begin();
});

renderer.domElement.addEventListener('click', () => {
  if (started && document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock();
});
renderer.domElement.addEventListener('mousedown', event => editBlock(event.button));
renderer.domElement.addEventListener('contextmenu', event => event.preventDefault());
renderer.domElement.addEventListener('wheel', event => selectSlot(selectedIndex + (event.deltaY > 0 ? 1 : -1)), { passive: true });
document.addEventListener('mousemove', event => {
  if (document.pointerLockElement !== renderer.domElement) return;
  player.yaw -= event.movementX * .0022;
  player.pitch -= event.movementY * .0022;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -Math.PI / 2 + .02, Math.PI / 2 - .02);
});
document.addEventListener('keydown', event => {
  keys.add(event.code);
  if (/^Digit[1-6]$/.test(event.code)) selectSlot(Number(event.code.at(-1)) - 1);
  if (event.code === 'F5' && started) { event.preventDefault(); toggleView(); }
  if (event.code === 'KeyC' && started && !editingCharacter) openCharacterEditor(false);
});
document.addEventListener('keyup', event => keys.delete(event.code));
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement;
  if (started && !locked && !editingCharacter) pauseScreen.classList.remove('hidden');
  if (locked) pauseScreen.classList.add('hidden');
});
window.addEventListener('beforeunload', () => saveWorld(false));
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
});

loadWorld();
generateWorld();
rebuildMeshes();
buildHotbar();
setupCharacterEditor();
nameInput.value = character.name;
countEl.textContent = player.placed;
viewLabel.textContent = thirdPerson ? '第三人称' : '第一人称';

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);
  if (document.pointerLockElement === renderer.domElement) movePlayer(delta);
  updateAvatar(delta); updateCamera();
  updateTarget(); updateSky(delta);
  coordsEl.textContent = `${player.position.x.toFixed(1)} / ${player.position.y.toFixed(1)} / ${player.position.z.toFixed(1)}`;
  renderer.render(scene, camera);
}
animate();
