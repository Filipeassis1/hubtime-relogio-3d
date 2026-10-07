import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { COLORS, DIM, R } from '../data/watchParams';
import { bezelTexture, brushedRoughness, dialTexture, lcdTexture, polishedRoughness, sunburstAnisotropy } from './textures';

export function createMaterials() {
  const brushed = brushedRoughness();
  const polished = polishedRoughness();
  return {
    // satin 316L: streaky roughness + anisotropy along the brushing direction (U)
    steelBrushed: new THREE.MeshPhysicalMaterial({
      color: '#c3c8cf', metalness: 1, roughness: 0.42, roughnessMap: brushed, anisotropy: 0.85,
    }),
    steelPolished: new THREE.MeshPhysicalMaterial({
      color: '#d2d6dc', metalness: 1, roughness: 0.1, roughnessMap: polished,
    }),
    steelDark: new THREE.MeshPhysicalMaterial({ color: COLORS.steelDark, metalness: 1, roughness: 0.45, roughnessMap: brushed }),
    // anodised aluminium insert under a glossy coat
    bezelInsert: new THREE.MeshPhysicalMaterial({
      map: bezelTexture(R.insertInner, R.insertOuter), color: '#c9d2e6', metalness: 0.55, roughness: 0.38,
      roughnessMap: polished, clearcoat: 1, clearcoatRoughness: 0.06,
    }),
    // sunburst: radial anisotropy makes the light streak from the center like a real brushed dial
    dial: new THREE.MeshPhysicalMaterial({
      map: dialTexture(R.dial), color: '#c4cde3', metalness: 0.75, roughness: 0.32,
      anisotropy: 1, anisotropyMap: sunburstAnisotropy(), clearcoat: 0.6, clearcoatRoughness: 0.12,
    }),
    lume: new THREE.MeshStandardMaterial({ color: '#eef2ec', roughness: 0.55, emissive: '#dfe9e2', emissiveIntensity: 0.05 }),
    sapphire: new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0, roughness: 0.02, transmission: 1, thickness: DIM.crystalThickness, ior: 1.77,
      specularIntensity: 0.6, specularColor: new THREE.Color('#dbe6ff'), // AR coating: dimmer, slightly blue reflections
    }),
    resin: new THREE.MeshPhysicalMaterial({ color: COLORS.black, roughness: 0.68, roughnessMap: polished, clearcoat: 0.1 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#15171b', roughness: 0.9 }),
    leather: new THREE.MeshPhysicalMaterial({
      color: '#5b3a26', roughness: 0.78, roughnessMap: polished, sheen: 0.4, sheenColor: new THREE.Color('#a3765a'),
      sheenRoughness: 0.6, side: THREE.DoubleSide,
    }),
    lcd: new THREE.MeshPhysicalMaterial({ map: lcdTexture(), roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.05 }),
    pcb: new THREE.MeshStandardMaterial({ color: '#1f5a3c', roughness: 0.55 }),
    chip: new THREE.MeshStandardMaterial({ color: COLORS.black, roughness: 0.45 }),
    brass: new THREE.MeshPhysicalMaterial({ color: '#c9a55a', metalness: 1, roughness: 0.3, roughnessMap: brushed, anisotropy: 0.6 }),
    jewel: new THREE.MeshPhysicalMaterial({ color: '#b01e3c', roughness: 0.1, clearcoat: 1 }),
    silicone: new THREE.MeshStandardMaterial({ color: '#2a2e35', roughness: 0.85 }),
  };
}

export type Mats = ReturnType<typeof createMaterials>;

/** One material set per part, so highlighting a part never tints another. Textures are shared (cached). */
export function useMats(): Mats {
  const m = useMemo(createMaterials, []);
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m]);
  return m;
}
