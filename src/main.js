import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

const canvas = document.querySelector('#canvas');
if (!canvas) console.error('Add <canvas id="canvas"></canvas> to index.html');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.45, 3.5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

let model;

new RGBELoader()
  .load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/qwantani_moonrise_puresky_1k.hdr', (texture) => {
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    scene.environment = envMap;
    // scene.background = envMap;
    texture.dispose();
    pmremGenerator.dispose();

    const gltfUrl = new URL('./assets/pagani1.glb', import.meta.url).href;
    const loader = new GLTFLoader();

    loader.load(
      gltfUrl,
      (gltf) => {
        model = gltf.scene;
        scene.add(model);

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.y = 0.01;

        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        model.scale.multiplyScalar(2.5 / maxDim);

        console.log('Pagani model loaded');
      },
      (xhr) => console.log((xhr.loaded / xhr.total * 100) + '% loaded'),
      (err) => console.error('GLTF load error:', err)
    );
  });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

let mouseX = 0, mouseY = 0;
window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = (e.clientY / window.innerHeight) * 2 - 1;
});

function animate() {
  requestAnimationFrame(animate);

  if (model) {
    const targetX = mouseX * Math.PI * 0.3;
    const targetY = mouseY * Math.PI * 0.3;
    model.rotation.y += (targetX - model.rotation.y) * 0.1;
    model.rotation.x += (targetY - model.rotation.x) * 0.1;
  }

  composer.render();
}
animate();