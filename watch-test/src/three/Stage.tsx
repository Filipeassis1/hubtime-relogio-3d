import type { ReactNode } from 'react';
import { ContactShadows, Environment } from '@react-three/drei';

export function Stage({ children }: { children: ReactNode }) {
  return (
    <>
      <Environment preset="studio" environmentIntensity={0.9} />
      <directionalLight position={[-120, 160, 140]} intensity={2.4} color="#fff3e6" />
      <directionalLight position={[160, 70, -170]} intensity={2.2} color="#e3ecff" />
      <hemisphereLight args={['#eef3ff', '#cdbfae', 0.35]} />
      {children}
      <ContactShadows position={[0, -112, -20]} scale={360} far={80} blur={2.6} opacity={0.38} color="#1b2433" resolution={1024} />
    </>
  );
}
