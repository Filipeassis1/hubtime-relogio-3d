import type { ReactNode } from 'react';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';

/** Soft product studio built from lightformers: controlled reflections on polished steel, no downloads. */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <>
      <Environment resolution={512} environmentIntensity={0.85}>
        <color attach="background" args={['#4d5560']} />
        <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 6, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[14, 6, 1]} />
        <Lightformer form="rect" intensity={2} color="#f4f1ec" position={[-7, 1, 3]} rotation={[0, Math.PI / 2, 0]} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#e6eeff" position={[7, 0, -2]} rotation={[0, -Math.PI / 2, 0]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[0, 0, 8]} scale={[12, 2, 1]} />
        <Lightformer form="ring" intensity={0.8} color="#ffffff" position={[0, -4, -6]} scale={4} />
      </Environment>
      <directionalLight position={[-120, 160, 140]} intensity={1.6} color="#fff3e6" />
      <directionalLight position={[160, 70, -170]} intensity={1.8} color="#e3ecff" />
      <hemisphereLight args={['#eef3ff', '#cdbfae', 0.3]} />
      {children}
      <ContactShadows position={[0, -112, -20]} scale={360} far={80} blur={2.6} opacity={0.38} color="#1b2433" resolution={1024} />
    </>
  );
}
