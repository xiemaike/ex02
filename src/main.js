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
const healthFill = document.querySelector('#health-fill');
const healthText = document.querySelector('#health-text');
const crystalCount = document.querySelector('#crystal-count');
const monsterCount = document.querySelector('#monster-count');
const damageFlash = document.querySelector('#damage-flash');
const crosshair = document.querySelector('#crosshair');

const CHARACTER_COLORS = {
  skin: ['#f2c7a5', '#d9a077', '#b87550', '#75472f'],
  shirt: ['#df794d', '#4f9ec4', '#6fa447', '#7a64b7', '#d2a83f'],
  hair: ['#4a3028', '#1f2732', '#9a6235', '#d1b36a', '#713f58']
};
const CHARACTER_PRESETS = {
  mint: { label: '薄荷通讯者', note: '高精度模型', defaultName: '青铃', skin: '#f2c7ae', shirt: '#f4f3ed', hair: '#92d6bd', trousers: '#293244', accent: '#9b3035', eyes: '#c34f80', hairStyle: 'twin', accessory: 'none', model: 'mint' },
  furina: { label: '水之歌者', note: '方块礼帽', defaultName: '芙露娜', skin: '#f2c7a5', shirt: '#203f74', hair: '#e8edf4', trousers: '#16294f', accent: '#71d8e5', eyes: '#43bfe0', hairStyle: 'long', accessory: 'hat', model: 'voxel' },
  sakura: { label: '樱花魔法使', note: '方块双马尾', defaultName: '小樱', skin: '#f0c0a2', shirt: '#c86b9d', hair: '#efa5c4', trousers: '#60466f', accent: '#ffe5f1', eyes: '#8d4bb0', hairStyle: 'twin', accessory: 'ribbon', model: 'voxel' },
  knight: { label: '金焰骑士', note: '方块铠甲', defaultName: '艾琳', skin: '#e9b88f', shirt: '#e7e4da', hair: '#e3b95e', trousers: '#683d3b', accent: '#d84e3b', eyes: '#5c91c7', hairStyle: 'long', accessory: 'crown', model: 'voxel' },
  miko: { label: '月夜巫女', note: '方块巫女服', defaultName: '月璃', skin: '#f1c8ae', shirt: '#f3eee5', hair: '#202737', trousers: '#9d3341', accent: '#d94a5b', eyes: '#bc425c', hairStyle: 'long', accessory: 'ribbon', model: 'voxel' },
  forest: { label: '森灵弓手', note: '方块精灵耳', defaultName: '青叶', skin: '#d7a47b', shirt: '#4f8b61', hair: '#75a86a', trousers: '#3f5748', accent: '#d5c46b', eyes: '#d1a83a', hairStyle: 'short', accessory: 'ears', model: 'voxel' }
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
  grounded: false, placed: 0, health: 100, crystals: 0, invulnerable: 0
};
const keys = new Set();
let selectedIndex = 0;
let activeHit = null;
let started = false;
let dayPhase = .22;
let manualTime = false;
let thirdPerson = false;
let frontView = false;
let editingCharacter = false;
let characterFromStart = false;
const character = {
  name: '探险家', skin: CHARACTER_COLORS.skin[1], shirt: CHARACTER_COLORS.shirt[0],
  hair: CHARACTER_COLORS.hair[0], trousers: '#34455d', accent: '#f5d06f', eyes: '#243344',
  hairStyle: 'short', accessory: 'none', preset: 'custom', model: 'voxel', created: false
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
avatar.scale.setScalar(.92);
scene.add(avatar);

function avatarBox(size, position, material, parent = avatar, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
  if (rotation) mesh.rotation.set(...rotation);
  parent.add(mesh); return mesh;
}

const genericFaceCanvas = document.createElement('canvas');
genericFaceCanvas.width = genericFaceCanvas.height = 32;
const genericFaceTexture = new THREE.CanvasTexture(genericFaceCanvas);
genericFaceTexture.magFilter = THREE.NearestFilter; genericFaceTexture.minFilter = THREE.NearestFilter;
genericFaceTexture.colorSpace = THREE.SRGBColorSpace;
const genericFaceMaterial = new THREE.MeshBasicMaterial({ map: genericFaceTexture });

function drawGenericFace(skin, eyeColor) {
  const ctx = genericFaceCanvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = skin; ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = '#302833'; ctx.fillRect(4, 12, 10, 2); ctx.fillRect(18, 12, 10, 2);
  ctx.fillStyle = '#fffafa'; ctx.fillRect(5, 14, 8, 7); ctx.fillRect(19, 14, 8, 7);
  ctx.fillStyle = eyeColor; ctx.fillRect(7, 14, 5, 7); ctx.fillRect(20, 14, 5, 7);
  ctx.fillStyle = '#272231'; ctx.fillRect(8, 18, 4, 3); ctx.fillRect(20, 18, 4, 3);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(8, 14, 2, 2); ctx.fillRect(21, 14, 2, 2);
  ctx.fillStyle = '#a76569'; ctx.fillRect(14, 25, 5, 1);
  genericFaceTexture.needsUpdate = true;
}

function createMintFaceTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#f2c7ae'; ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = '#392634'; ctx.fillRect(4, 12, 10, 2); ctx.fillRect(18, 12, 10, 2);
  ctx.fillStyle = '#fff7f7'; ctx.fillRect(5, 14, 8, 7); ctx.fillRect(19, 14, 8, 7);
  ctx.fillStyle = '#c34f80'; ctx.fillRect(7, 14, 5, 7); ctx.fillRect(20, 14, 5, 7);
  ctx.fillStyle = '#7c294f'; ctx.fillRect(8, 17, 4, 4); ctx.fillRect(20, 17, 4, 4);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(8, 14, 2, 2); ctx.fillRect(21, 14, 2, 2);
  ctx.fillStyle = '#d99791'; ctx.fillRect(15, 21, 2, 1);
  ctx.fillStyle = '#7d444d'; ctx.fillRect(14, 25, 5, 1);
  const texture = new THREE.CanvasTexture(canvas); texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter; texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const mintMaterials = {
  skin: new THREE.MeshLambertMaterial({ color: '#f2c7ae' }),
  hair: new THREE.MeshLambertMaterial({ color: '#92d6bd' }),
  hairLight: new THREE.MeshLambertMaterial({ color: '#b9ebd8' }),
  hairDark: new THREE.MeshLambertMaterial({ color: '#589a86' }),
  shirt: new THREE.MeshLambertMaterial({ color: '#f4f3ed' }),
  sweater: new THREE.MeshLambertMaterial({ color: '#8a8e98' }),
  trousers: new THREE.MeshLambertMaterial({ color: '#293244' }),
  shoe: new THREE.MeshLambertMaterial({ color: '#e8e6dc' }),
  ribbon: new THREE.MeshLambertMaterial({ color: '#9b3035' }),
  phone: new THREE.MeshStandardMaterial({ color: '#70757d', metalness: .65, roughness: .25 }),
  phoneDark: new THREE.MeshStandardMaterial({ color: '#171b22', metalness: .35, roughness: .3 }),
  face: new THREE.MeshBasicMaterial({ map: createMintFaceTexture() })
};
const mintAvatar = new THREE.Group(); mintAvatar.scale.setScalar(.88); scene.add(mintAvatar);

function mintBox(size, position, material, parent = mintAvatar, rotation = null) {
  const mesh = avatarBox(size, position, material, parent);
  if (rotation) mesh.rotation.set(...rotation);
  return mesh;
}

function mintLimb(position, size, material) {
  const pivot = new THREE.Group(); pivot.position.set(...position); mintAvatar.add(pivot);
  mintBox(size, [0, -size[1] / 2, 0], material, pivot); return pivot;
}

const mintParts = {
  leftLeg: mintLimb([-.17, .8, 0], [.29, .74, .32], mintMaterials.trousers),
  rightLeg: mintLimb([.17, .8, 0], [.29, .74, .32], mintMaterials.trousers),
  leftArm: mintLimb([-.48, 1.49, 0], [.2, .7, .23], mintMaterials.skin),
  braids: []
};
mintBox([.32, .2, .43], [-.17, .1, -.055], mintMaterials.shoe);
mintBox([.32, .2, .43], [.17, .1, -.055], mintMaterials.shoe);
mintBox([.72, .68, .37], [0, 1.15, 0], mintMaterials.shirt);
mintBox([.78, .17, .42], [0, 1.43, .015], mintMaterials.sweater);
mintBox([.18, .64, .14], [-.14, 1.12, -.22], mintMaterials.sweater, mintAvatar, [0, 0, -.13]);
mintBox([.18, .64, .14], [.14, 1.12, -.22], mintMaterials.sweater, mintAvatar, [0, 0, .13]);
mintBox([.28, .19, .16], [0, .86, -.25], mintMaterials.sweater, mintAvatar, [0, 0, .75]);

mintBox([.62, .58, .6], [0, 1.8, 0], mintMaterials.skin);
const face = new THREE.Mesh(new THREE.PlaneGeometry(.59, .55), mintMaterials.face);
face.position.set(0, 1.8, -.306); face.rotation.y = Math.PI; mintAvatar.add(face);
mintBox([.68, .15, .65], [0, 2.1, .01], mintMaterials.hair);
mintBox([.13, .53, .62], [-.325, 1.86, .02], mintMaterials.hairDark);
mintBox([.13, .53, .62], [.325, 1.86, .02], mintMaterials.hair);
mintBox([.62, .56, .14], [0, 1.83, .305], mintMaterials.hairDark);
const bangData = [
  [-.25, 1.97, .29, -.18], [-.13, 1.93, .36, -.09], [0, 1.9, .4, .03],
  [.13, 1.94, .34, .1], [.25, 1.98, .27, .18]
];
bangData.forEach(([x, y, h, rz], index) => mintBox([.14, h, .13], [x, y, -.34], index % 2 ? mintMaterials.hairLight : mintMaterials.hair, mintAvatar, [0, 0, rz]));
mintBox([.18, .13, .18], [.05, 2.23, .02], mintMaterials.hairLight, mintAvatar, [0, 0, -.25]);

for (const side of [-1, 1]) {
  const braid = new THREE.Group(); mintAvatar.add(braid); mintParts.braids.push(braid);
  for (let i = 0; i < 7; i++) {
    const y = 1.58 - i * .18;
    const x = side * (.43 + Math.sin(i * .9) * .035);
    mintBox([.2 - i * .008, .24, .2 - i * .008], [x, y, .04], i % 2 ? mintMaterials.hairLight : mintMaterials.hair, braid, [0, 0, side * (i % 2 ? .17 : -.12)]);
  }
  mintBox([.25, .11, .22], [side * .43, .44, .04], mintMaterials.ribbon, braid);
  mintBox([.13, .19, .12], [side * .52, .42, .04], mintMaterials.ribbon, braid, [0, 0, side * .55]);
  mintBox([.13, .19, .12], [side * .34, .42, .04], mintMaterials.ribbon, braid, [0, 0, -side * .55]);
  mintBox([.16, .22, .16], [side * .43, .28, .04], mintMaterials.hairLight, braid);
}

mintBox([.21, .55, .23], [.47, 1.23, -.01], mintMaterials.skin);
mintBox([.19, .58, .21], [.43, 1.62, -.12], mintMaterials.skin, mintAvatar, [0, 0, .08]);
mintBox([.2, .18, .22], [.39, 1.91, -.12], mintMaterials.skin);
mintBox([.14, .43, .09], [.53, 1.88, -.14], mintMaterials.phone, mintAvatar, [0, 0, .12]);
mintBox([.075, .075, .025], [.52, 2.0, -.19], mintMaterials.phoneDark);
mintBox([.075, .075, .025], [.54, 1.88, -.19], mintMaterials.phoneDark);
mintBox([.3, .15, .22], [-.48, 1.43, 0], mintMaterials.sweater);

const avatarParts = {
  leftLeg: avatarBox([.29, .75, .32], [-.17, .375, 0], characterMaterials.trousers),
  rightLeg: avatarBox([.29, .75, .32], [.17, .375, 0], characterMaterials.trousers),
  body: avatarBox([.68, .7, .38], [0, 1.1, 0], characterMaterials.shirt),
  leftArm: avatarBox([.22, .72, .24], [-.46, 1.09, 0], characterMaterials.shirt),
  rightArm: avatarBox([.22, .72, .24], [.46, 1.09, 0], characterMaterials.shirt),
  head: avatarBox([.64, .61, .62], [0, 1.72, 0], characterMaterials.skin),
  hair: avatarBox([.68, .15, .66], [0, 2.09, .01], characterMaterials.hair)
};
const genericFace = new THREE.Mesh(new THREE.PlaneGeometry(.61, .58), genericFaceMaterial);
genericFace.position.set(0, 1.72, -.316); genericFace.rotation.y = Math.PI; avatar.add(genericFace);
const avatarAccent = avatarBox([.12, .68, .03], [0, 1.1, -.205], characterMaterials.accent);
const genericShoes = [
  avatarBox([.32, .2, .42], [-.17, .1, -.05], characterMaterials.accent),
  avatarBox([.32, .2, .42], [.17, .1, -.05], characterMaterials.accent)
];
const genericHands = [
  avatarBox([.225, .18, .245], [-.46, .69, 0], characterMaterials.skin),
  avatarBox([.225, .18, .245], [.46, .69, 0], characterMaterials.skin)
];
const hairSides = [
  avatarBox([.15, .6, .2], [-.33, 1.61, .08], characterMaterials.hair),
  avatarBox([.15, .6, .2], [.33, 1.61, .08], characterMaterials.hair)
];
const genericHairBack = avatarBox([.64, .64, .15], [0, 1.67, .32], characterMaterials.hair);
const genericBangs = [
  avatarBox([.15, .33, .13], [-.25, 1.91, -.35], characterMaterials.hair, avatar, [0, 0, -.14]),
  avatarBox([.15, .41, .13], [-.12, 1.87, -.35], characterMaterials.hair, avatar, [0, 0, -.07]),
  avatarBox([.15, .44, .13], [0, 1.84, -.35], characterMaterials.hair),
  avatarBox([.15, .39, .13], [.12, 1.88, -.35], characterMaterials.hair, avatar, [0, 0, .07]),
  avatarBox([.15, .31, .13], [.25, 1.92, -.35], characterMaterials.hair, avatar, [0, 0, .14])
];
const genericTwinTails = [];
for (const side of [-1, 1]) {
  const tail = new THREE.Group(); avatar.add(tail); genericTwinTails.push(tail);
  for (let i = 0; i < 5; i++) {
    avatarBox([.2 - i * .012, .25, .2 - i * .012], [side * (.44 + i * .025), 1.52 - i * .21, .13], characterMaterials.hair, tail, [0, 0, side * (i % 2 ? .13 : -.1)]);
  }
}
const coatTails = [
  avatarBox([.25, .53, .12], [-.18, .69, .16], characterMaterials.accent, avatar, [.08, 0, -.1]),
  avatarBox([.25, .53, .12], [.18, .69, .16], characterMaterials.accent, avatar, [.08, 0, .1])
];
const armorParts = new THREE.Group(); avatar.add(armorParts);
avatarBox([.34, .2, .42], [-.45, 1.43, 0], characterMaterials.accent, armorParts);
avatarBox([.34, .2, .42], [.45, 1.43, 0], characterMaterials.accent, armorParts);
avatarBox([.72, .12, .42], [0, 1.43, 0], characterMaterials.accent, armorParts);
const accessoryGroups = {};
accessoryGroups.hat = new THREE.Group(); avatar.add(accessoryGroups.hat);
avatarBox([.82, .08, .66], [0, 2.18, .02], characterMaterials.shirt, accessoryGroups.hat);
avatarBox([.46, .24, .48], [0, 2.33, .02], characterMaterials.shirt, accessoryGroups.hat);
avatarBox([.48, .06, .5], [0, 2.25, -.225], characterMaterials.accent, accessoryGroups.hat);
accessoryGroups.ribbon = new THREE.Group(); avatar.add(accessoryGroups.ribbon);
const ribbonLeft = avatarBox([.31, .18, .1], [-.38, 1.87, .2], characterMaterials.accent, accessoryGroups.ribbon);
const ribbonRight = avatarBox([.31, .18, .1], [.38, 1.87, .2], characterMaterials.accent, accessoryGroups.ribbon);
ribbonLeft.rotation.z = -.35; ribbonRight.rotation.z = .35;
accessoryGroups.crown = new THREE.Group(); avatar.add(accessoryGroups.crown);
avatarBox([.56, .08, .46], [0, 2.18, .02], characterMaterials.accent, accessoryGroups.crown);
avatarBox([.1, .23, .1], [-.19, 2.31, .02], characterMaterials.accent, accessoryGroups.crown);
avatarBox([.1, .3, .1], [0, 2.34, .02], characterMaterials.accent, accessoryGroups.crown);
avatarBox([.1, .23, .1], [.19, 2.31, .02], characterMaterials.accent, accessoryGroups.crown);
accessoryGroups.ears = new THREE.Group(); avatar.add(accessoryGroups.ears);
const earLeft = avatarBox([.14, .38, .14], [-.4, 1.84, 0], characterMaterials.hair, accessoryGroups.ears);
const earRight = avatarBox([.14, .38, .14], [.4, 1.84, 0], characterMaterials.hair, accessoryGroups.ears);
earLeft.rotation.z = -.45; earRight.rotation.z = .45;

function applyCharacterAppearance() {
  characterMaterials.skin.color.set(character.skin);
  characterMaterials.shirt.color.set(character.shirt);
  characterMaterials.hair.color.set(character.hair);
  characterMaterials.trousers.color.set(character.trousers);
  characterMaterials.accent.color.set(character.accent);
  characterMaterials.eye.color.set(character.eyes);
  drawGenericFace(character.skin, character.eyes);
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
    part.position.x = character.hairStyle === 'twin' ? (index ? .38 : -.38) : (index ? .33 : -.33);
  });
  genericHairBack.visible = longHair;
  genericTwinTails.forEach(tail => { tail.visible = character.hairStyle === 'twin'; });
  coatTails.forEach(part => { part.visible = ['furina', 'knight', 'miko'].includes(character.preset); });
  armorParts.visible = character.preset === 'knight';
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
  Object.assign(character, preset, { preset: key, name: preset.defaultName, model: preset.model || 'voxel' });
  if (preset.model === 'mint') { thirdPerson = true; frontView = true; viewLabel.textContent = '正面展示'; }
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
  mintAvatar.position.copy(player.position);
  mintAvatar.rotation.y = player.yaw;
  const mintSelected = character.model === 'mint';
  avatar.visible = thirdPerson && !mintSelected;
  mintAvatar.visible = thirdPerson && mintSelected;
  const moving = Math.hypot(player.velocity.x, player.velocity.z) > .25 && player.grounded;
  const swing = moving ? Math.sin(performance.now() * .012) * .55 : 0;
  const easing = Math.min(1, delta * 14);
  avatarParts.leftArm.rotation.x += (swing - avatarParts.leftArm.rotation.x) * easing;
  avatarParts.rightArm.rotation.x += (-swing - avatarParts.rightArm.rotation.x) * easing;
  avatarParts.leftLeg.rotation.x += (-swing - avatarParts.leftLeg.rotation.x) * easing;
  avatarParts.rightLeg.rotation.x += (swing - avatarParts.rightLeg.rotation.x) * easing;
  mintParts.leftLeg.rotation.x += (-swing - mintParts.leftLeg.rotation.x) * easing;
  mintParts.rightLeg.rotation.x += (swing - mintParts.rightLeg.rotation.x) * easing;
  mintParts.leftArm.rotation.x += (swing * .7 - mintParts.leftArm.rotation.x) * easing;
  mintParts.braids.forEach((braid, index) => {
    const target = moving ? Math.sin(performance.now() * .007 + index * Math.PI) * .05 : 0;
    braid.rotation.x += (target - braid.rotation.x) * easing;
  });
}

function updateCamera() {
  if (!thirdPerson) {
    camera.position.set(player.position.x, player.position.y + 1.62, player.position.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
    return;
  }
  const target = player.position.clone().add(new THREE.Vector3(0, 1.22, 0));
  const offset = new THREE.Vector3(0, 1.55 + player.pitch * .75, frontView ? -4.3 : 4.3).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
}

function toggleView() {
  if (!thirdPerson) { thirdPerson = true; frontView = false; }
  else if (!frontView) frontView = true;
  else { thirdPerson = false; frontView = false; }
  const label = !thirdPerson ? '第一人称' : frontView ? '正面展示' : '第三人称';
  viewLabel.textContent = label; showToast(`已切换为${label}`);
  saveWorld(false);
}

function respawn() {
  player.position.set(.5, terrainHeight(0, 0) + 1.01, .5);
  player.velocity.set(0, 0, 0);
  player.health = 100;
  updateSurvivalHUD();
}

const raycaster = new THREE.Raycaster();
raycaster.far = REACH;
const monsterRoot = new THREE.Group();
const dropRoot = new THREE.Group();
scene.add(monsterRoot, dropRoot);
const monsters = [];
const drops = [];
let activeMonster = null;
let monsterSerial = 0;

const MONSTER_TYPES = {
  slime: { name: '苔原史莱姆', health: 50, speed: 1.15, damage: 9, color: '#63ba66', height: 1.25 },
  shadow: { name: '暗影兽', health: 70, speed: 1.75, damage: 13, color: '#654890', height: 1.35 },
  golem: { name: '石像守卫', health: 130, speed: .72, damage: 20, color: '#747d83', height: 2.15 },
  fire: { name: '火焰精灵', health: 45, speed: 1.5, damage: 11, color: '#ed6e32', height: 1.65, flying: true }
};

function modelBox(group, size, position, material, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
  if (rotation) mesh.rotation.set(...rotation);
  group.add(mesh); return mesh;
}

function buildMonsterModel(type) {
  const config = MONSTER_TYPES[type];
  const group = new THREE.Group();
  const main = new THREE.MeshStandardMaterial({ color: config.color, roughness: .78, emissive: type === 'fire' ? '#7d1d08' : '#000000', emissiveIntensity: type === 'fire' ? .8 : 0 });
  const dark = new THREE.MeshStandardMaterial({ color: type === 'golem' ? '#42484c' : '#202433', roughness: .85 });
  const eye = new THREE.MeshStandardMaterial({ color: type === 'shadow' ? '#dc68ff' : type === 'fire' ? '#ffe171' : '#172331', emissive: type === 'shadow' ? '#8420bb' : '#000000', emissiveIntensity: 1.2 });

  if (type === 'slime') {
    modelBox(group, [.86, .58, .78], [0, .31, 0], main);
    modelBox(group, [.16, .16, .08], [-.2, .38, -.42], eye);
    modelBox(group, [.16, .16, .08], [.2, .38, -.42], eye);
  } else if (type === 'shadow') {
    modelBox(group, [.92, .58, .58], [0, .6, 0], main);
    modelBox(group, [.5, .44, .48], [0, 1.0, -.08], main);
    for (const x of [-.33, .33]) for (const z of [-.18, .2]) modelBox(group, [.16, .62, .16], [x, .31, z], dark, [z * .8, 0, 0]);
    modelBox(group, [.12, .12, .07], [-.13, 1.07, -.34], eye);
    modelBox(group, [.12, .12, .07], [.13, 1.07, -.34], eye);
  } else if (type === 'golem') {
    modelBox(group, [.86, .86, .55], [0, 1.05, 0], main);
    modelBox(group, [.64, .55, .58], [0, 1.77, -.02], main);
    modelBox(group, [.28, 1.05, .32], [-.6, 1.0, 0], dark);
    modelBox(group, [.28, 1.05, .32], [.6, 1.0, 0], dark);
    modelBox(group, [.3, .72, .34], [-.24, .36, 0], dark);
    modelBox(group, [.3, .72, .34], [.24, .36, 0], dark);
    modelBox(group, [.13, .1, .06], [-.14, 1.82, -.32], eye);
    modelBox(group, [.13, .1, .06], [.14, 1.82, -.32], eye);
  } else {
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(.48, 0), main);
    core.position.y = .82; core.castShadow = true; group.add(core);
    modelBox(group, [.16, .52, .16], [-.44, .83, 0], main, [0, 0, -.6]);
    modelBox(group, [.16, .52, .16], [.44, .83, 0], main, [0, 0, .6]);
    modelBox(group, [.1, .1, .08], [-.14, .88, -.43], eye);
    modelBox(group, [.1, .1, .08], [.14, .88, -.43], eye);
  }
  return group;
}

function spawnMonster(type, seed = monsterSerial++) {
  const config = MONSTER_TYPES[type];
  const group = buildMonsterModel(type);
  let x = 8, z = 8;
  for (let attempt = 0; attempt < 18; attempt++) {
    const angle = hash2(seed * 23 + attempt, seed * 41) * Math.PI * 2;
    const radius = 7 + hash2(seed * 59, attempt * 17) * 8;
    x = Math.round(Math.cos(angle) * radius); z = Math.round(Math.sin(angle) * radius);
    if (terrainHeight(x, z) > SEA_LEVEL) break;
  }
  group.position.set(x + .5, terrainHeight(x, z) + 1, z + .5);
  const bar = new THREE.Group(); bar.position.y = config.height + .28;
  const barBack = modelBox(bar, [.72, .075, .035], [0, 0, 0], new THREE.MeshBasicMaterial({ color: '#321f29' }));
  barBack.castShadow = false;
  const barFill = modelBox(bar, [.68, .045, .045], [0, 0, -.025], new THREE.MeshBasicMaterial({ color: '#69dd73' }));
  barFill.castShadow = false; group.add(bar);
  const monster = { id: monsterSerial, type, config, group, bar, barFill, health: config.health, maxHealth: config.health, cooldown: 0, phase: hash2(seed, 99) * Math.PI * 2, hitFlash: 0 };
  group.traverse(object => { if (object.isMesh) object.userData.monster = monster; });
  monsterRoot.add(group); monsters.push(monster); updateSurvivalHUD();
  return monster;
}

function spawnInitialMonsters() {
  monsters.splice(0).forEach(monster => monsterRoot.remove(monster.group));
  drops.splice(0).forEach(drop => dropRoot.remove(drop.mesh));
  ['slime', 'slime', 'shadow', 'shadow', 'golem', 'golem', 'fire', 'fire', 'slime', 'shadow'].forEach((type, index) => spawnMonster(type, index + 1));
}

function dropCrystal(position, amount) {
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(.2, 0), new THREE.MeshStandardMaterial({ color: '#6ce5ef', emissive: '#248a9b', emissiveIntensity: 1.4, roughness: .25 }));
  mesh.position.copy(position).add(new THREE.Vector3(0, .45, 0)); mesh.castShadow = true;
  dropRoot.add(mesh); drops.push({ mesh, amount, phase: Math.random() * 6 });
}

function defeatMonster(monster) {
  const index = monsters.indexOf(monster);
  if (index < 0) return;
  monsters.splice(index, 1); monsterRoot.remove(monster.group);
  dropCrystal(monster.group.position, monster.type === 'golem' ? 4 : 2);
  activeMonster = null; showToast(`${monster.config.name}被击败 · 掉落晶体`);
  updateSurvivalHUD();
  setTimeout(() => { if (started) spawnMonster(monster.type); }, 9000);
}

function attackMonster(monster) {
  monster.health -= 25;
  monster.hitFlash = .16;
  const ratio = Math.max(0, monster.health / monster.maxHealth);
  monster.barFill.scale.x = ratio;
  monster.barFill.position.x = -(1 - ratio) * .34;
  if (monster.health <= 0) defeatMonster(monster);
}

function damagePlayer(amount, source) {
  if (player.invulnerable > 0) return;
  player.health = Math.max(0, player.health - amount); player.invulnerable = .65;
  damageFlash.classList.add('hit'); setTimeout(() => damageFlash.classList.remove('hit'), 130);
  const push = player.position.clone().sub(source).setY(.25).normalize().multiplyScalar(3.5);
  player.velocity.add(push); updateSurvivalHUD();
  if (player.health <= 0) { showToast('你被怪物击倒，已返回出生点'); respawn(); }
}

function updateSurvivalHUD() {
  healthFill.style.width = `${player.health}%`; healthText.textContent = Math.ceil(player.health);
  crystalCount.textContent = player.crystals; monsterCount.textContent = monsters.length;
}

function updateMonsters(delta, active) {
  player.invulnerable = Math.max(0, player.invulnerable - delta);
  const nightBoost = Math.sin(dayPhase * Math.PI * 2) < .15 ? 1.28 : 1;
  const now = performance.now() * .001;
  for (const monster of monsters) {
    monster.cooldown = Math.max(0, monster.cooldown - delta);
    monster.hitFlash = Math.max(0, monster.hitFlash - delta);
    monster.group.scale.setScalar(monster.hitFlash > 0 ? 1.12 : 1);
    const flat = player.position.clone().sub(monster.group.position); flat.y = 0;
    const distance = flat.length();
    let direction = new THREE.Vector3(Math.sin(now * .35 + monster.phase), 0, Math.cos(now * .35 + monster.phase));
    if (distance < 8 * nightBoost) direction.copy(flat).normalize();
    if (active && distance < 12 && distance > .9) {
      const step = monster.config.speed * nightBoost * delta;
      const candidate = monster.group.position.clone().addScaledVector(direction, step);
      candidate.x = THREE.MathUtils.clamp(candidate.x, -HALF + 1, HALF - 1);
      candidate.z = THREE.MathUtils.clamp(candidate.z, -HALF + 1, HALF - 1);
      const ground = terrainHeight(Math.floor(candidate.x), Math.floor(candidate.z));
      if (ground > SEA_LEVEL || monster.config.flying) {
        monster.group.position.x = candidate.x; monster.group.position.z = candidate.z;
      }
    }
    const groundY = terrainHeight(Math.floor(monster.group.position.x), Math.floor(monster.group.position.z)) + 1;
    const bob = monster.type === 'slime' ? Math.abs(Math.sin(now * 3.5 + monster.phase)) * .16 : monster.type === 'fire' ? 1.1 + Math.sin(now * 3 + monster.phase) * .2 : 0;
    monster.group.position.y += (groundY + bob - monster.group.position.y) * Math.min(1, delta * 8);
    if (direction.lengthSq()) monster.group.rotation.y = Math.atan2(-direction.x, -direction.z);
    if (active && distance < 1.15 && monster.cooldown <= 0) {
      damagePlayer(monster.config.damage, monster.group.position); monster.cooldown = 1.15;
    }
  }
  for (let i = drops.length - 1; i >= 0; i--) {
    const drop = drops[i]; drop.mesh.rotation.y += delta * 2.5;
    drop.mesh.position.y += Math.sin(now * 3 + drop.phase) * delta * .08;
    if (drop.mesh.position.distanceTo(player.position.clone().add(new THREE.Vector3(0, .7, 0))) < 1.15) {
      player.crystals += drop.amount; dropRoot.remove(drop.mesh); drops.splice(i, 1);
      showToast(`获得 ${drop.amount} 枚水晶`); updateSurvivalHUD(); autoSaveSoon();
    }
  }
}

function updateTarget() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const targetMeshes = meshes.filter(mesh => mesh.userData.targetable);
  const hit = raycaster.intersectObjects(targetMeshes, false)[0];
  const monsterHit = raycaster.intersectObjects(monsterRoot.children, true).find(item => item.object.userData.monster);
  if (monsterHit && monsterHit.distance <= REACH && (!hit || monsterHit.distance < hit.distance)) {
    activeMonster = monsterHit.object.userData.monster; activeHit = null;
    selection.visible = false; crosshair.classList.add('danger'); return;
  }
  activeMonster = null; crosshair.classList.remove('danger');
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
  if (document.pointerLockElement !== renderer.domElement) return;
  if (button === 0 && activeMonster) return attackMonster(activeMonster);
  if (!activeHit) return;
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
    selectedIndex, dayPhase, thirdPerson, frontView, character, health: player.health, crystals: player.crystals
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
    frontView = Boolean(data.frontView);
    player.health = data.health ?? 100; player.crystals = data.crystals || 0;
    if (data.character) Object.assign(character, data.character);
    if (!character.model || character.model === 'generic') character.model = 'voxel';
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
  player.crystals = 0; respawn(); generateWorld(); rebuildMeshes(); spawnInitialMonsters(); countEl.textContent = '0'; begin();
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
spawnInitialMonsters();
buildHotbar();
setupCharacterEditor();
nameInput.value = character.name;
countEl.textContent = player.placed;
viewLabel.textContent = !thirdPerson ? '第一人称' : frontView ? '正面展示' : '第三人称';
updateSurvivalHUD();

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);
  if (document.pointerLockElement === renderer.domElement) movePlayer(delta);
  updateAvatar(delta); updateCamera();
  updateMonsters(delta, document.pointerLockElement === renderer.domElement);
  updateTarget(); updateSky(delta);
  coordsEl.textContent = `${player.position.x.toFixed(1)} / ${player.position.y.toFixed(1)} / ${player.position.z.toFixed(1)}`;
  renderer.render(scene, camera);
}
animate();
