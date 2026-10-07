import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { COLORS, DIM, R } from '../data/watchParams';
import { bezelTexture, dialTexture, lcdTexture } from './textures';

export function createMaterials() {
  return {
    steelBrushed: new THREE.MeshPhysicalMaterial({ color: COLORS.steelLight, metalness: 1, roughness: 0.34, anisotropy: 0.7 }),
    steelPolished: new THREE.MeshPhysicalMaterial({ color: COLORS.steelLight, metalness: 1, roughness: 0.07 }),
    steelDark: new THREE.MeshPhysicalMaterial({ color: COLORS.steelDark, metalness: 1, roughness: 0.4 }),
    bezelInsert: new THREE.MeshPhysicalMaterial({
      map: bezelTexture(R.insertInner, R.insertOuter), metalness: 0.2, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08,
    }),
    dial: new THREE.MeshPhysicalMaterial({ map: dialTexture(R.dial), metalness: 0.45, roughness: 0.32, clearcoat: 0.5 }),
    lume: new THREE.MeshStandardMaterial({ color: COLORS.white, roughness: 0.5, emissive: '#dfe9e2', emissiveIntensity: 0.08 }),
    sapphire: new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0, roughness: 0, transmission: 1, thickness: DIM.crystalThickness, ior: 1.77, specularIntensity: 1,
    }),
    resin: new THREE.MeshPhysicalMaterial({ color: COLORS.black, roughness: 0.72, clearcoat: 0.15 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#15171b', roughness: 0.9 }),
    leather: new THREE.MeshPhysicalMaterial({
      color: '#5b3a26', roughness: 0.78, sheen: 0.4, sheenColor: new THREE.Color('#a3765a'), sheenRoughness: 0.6, side: THREE.DoubleSide,
    }),
    lcd: new THREE.MeshStandardMaterial({ map: lcdTexture(), roughness: 0.45 }),
    pcb: new THREE.MeshStandardMaterial({ color: '#1f5a3c', roughness: 0.6 }),
    chip: new THREE.MeshStandardMaterial({ color: COLORS.black, roughness: 0.5 }),
    brass: new THREE.MeshPhysicalMaterial({ color: COLORS.gold, metalness: 1, roughness: 0.28 }),
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
