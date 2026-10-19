// contact-shadows.js — soft "drei-style" contact shadow for WebGLRenderer (three r186).
// Port of the official webgl_shadow_contact example as a drop-in helper. It renders the scene's depth from
// below into a small target, blurs it twice and shows it on a transparent plane: the dark, soft grounding
// right under an object that shadow maps miss. Cheap enough to update every frame for moving objects;
// for static scenes call update() once after load (or every few frames).
//
//   import { ContactShadows } from './contact-shadows.js';
//   const cs = new ContactShadows(THREE, renderer, scene, { width: 4, depth: 4, height: 1.2, blur: 2.5, darkness: 1.4, opacity: 0.75 });
//   cs.group.position.y = 0.001;      // floor height
//   // in the loop, before rendering the main frame:
//   cs.update();                       // or only when something moved
//
// Tint: { color: '#3a2c20' } gives a warm shadow that matches a warm floor (never pure black on a colored ground).

import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';

export class ContactShadows {
  constructor(THREE, renderer, scene, { width = 4, depth = 4, height = 1, resolution = 512, blur = 2.5,
    darkness = 1.2, opacity = 0.8, color = '#000000', smooth = true } = {}) {
    this.renderer = renderer; this.scene = scene; this.blur = blur; this.smooth = smooth;
    this.group = new THREE.Group();
    scene.add(this.group);
    // HalfFloat avoids banding in the blur, but does NOT clamp: alpha > 1 (darkness > 1) must be clamped when sampled
    const rtOpts = { type: THREE.HalfFloatType };
    this.rt = new THREE.WebGLRenderTarget(resolution, resolution, rtOpts);
    this.rtBlur = new THREE.WebGLRenderTarget(resolution, resolution, rtOpts);
    this.rt.texture.generateMipmaps = this.rtBlur.texture.generateMipmaps = false;
    const geo = new THREE.PlaneGeometry(width, depth).rotateX(Math.PI / 2);
    // The visible shadow: shadow alpha from the blurred depth, tinted with `color`
    this.plane = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: this.rt.texture, transparent: true, depthWrite: false, opacity, color: new THREE.Color(1, 1, 1),
    }));
    this.tint = { value: new THREE.Color(color) };
    this.plane.material.onBeforeCompile = sh => {
      sh.uniforms.tint = this.tint;
      sh.fragmentShader = 'uniform vec3 tint;\n' + sh.fragmentShader.replace('#include <map_fragment>',
        '#ifdef USE_MAP\n vec4 sampledDiffuseColor = texture2D( map, vMapUv );\n diffuseColor = vec4( tint, clamp( sampledDiffuseColor.a, 0.0, 1.0 ) * opacity );\n#endif');
    };
    this.plane.renderOrder = 1;
    this.plane.scale.y = -1; // texture is flipped
    this.group.add(this.plane);
    this.blurPlane = new THREE.Mesh(geo);
    this.blurPlane.visible = false;
    this.group.add(this.blurPlane);
    this.cam = new THREE.OrthographicCamera(-width / 2, width / 2, depth / 2, -depth / 2, 0, height);
    this.cam.rotation.x = Math.PI / 2; // look up from the floor
    this.group.add(this.cam);
    // Like MeshDepthMaterial, but black with alpha = closeness
    this.depthMat = new THREE.MeshDepthMaterial();
    this.depthMat.userData.darkness = { value: darkness };
    this.depthMat.onBeforeCompile = sh => {
      sh.uniforms.darkness = this.depthMat.userData.darkness;
      sh.fragmentShader = 'uniform float darkness;\n' + sh.fragmentShader.replace(
        'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
        'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );');
    };
    // Depth test ON: the surface closest to the floor must win, or the top of the object overwrites its sole
    // (the official example uses simple convex meshes and gets away with depthTest off).
    this.hBlur = new THREE.ShaderMaterial(HorizontalBlurShader);
    this.vBlur = new THREE.ShaderMaterial(VerticalBlurShader);
    this.hBlur.depthTest = this.vBlur.depthTest = false;
  }

  set darkness(v) { this.depthMat.userData.darkness.value = v; }
  set opacity(v) { this.plane.material.opacity = v; }
  set color(c) { this.tint.value.set(c); }

  _blur(amount) {
    const r = this.renderer;
    this.blurPlane.visible = true;
    this.blurPlane.material = this.hBlur;
    this.hBlur.uniforms.tDiffuse.value = this.rt.texture;
    this.hBlur.uniforms.h.value = amount / 256;
    r.setRenderTarget(this.rtBlur); r.render(this.blurPlane, this.cam);
    this.blurPlane.material = this.vBlur;
    this.vBlur.uniforms.tDiffuse.value = this.rtBlur.texture;
    this.vBlur.uniforms.v.value = amount / 256;
    r.setRenderTarget(this.rt); r.render(this.blurPlane, this.cam);
    this.blurPlane.visible = false;
  }

  update() {
    const r = this.renderer, s = this.scene;
    const bg = s.background, env = s.environment, fog = s.fog;
    s.background = null; s.fog = null;
    this.plane.visible = false;
    const prevTarget = r.getRenderTarget(), prevTM = r.toneMapping, prevAlpha = r.getClearAlpha();
    r.toneMapping = 0; // NoToneMapping
    r.setClearAlpha(0);
    s.overrideMaterial = this.depthMat;
    r.setRenderTarget(this.rt); r.clear(); r.render(s, this.cam);
    s.overrideMaterial = null;
    this._blur(this.blur);
    if (this.smooth) this._blur(this.blur * 0.4); // second, finer pass removes banding
    r.setRenderTarget(prevTarget);
    r.toneMapping = prevTM; r.setClearAlpha(prevAlpha);
    s.background = bg; s.environment = env; s.fog = fog;
    this.plane.visible = true;
  }

  dispose() {
    this.rt.dispose(); this.rtBlur.dispose(); this.plane.geometry.dispose();
    this.plane.material.dispose(); this.depthMat.dispose(); this.hBlur.dispose(); this.vBlur.dispose();
    this.group.removeFromParent();
  }
}
