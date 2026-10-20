import Image from 'next/image';
import clubLogo from '@/img/image.png';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup">
      <Image className="brand-emblem" src={clubLogo} alt="TKTI StartUp Club logosi" priority />
      {!compact && (
        <span className="brand-copy">
          <strong>TKTI StartUp</strong>
          <small>CLUB PLATFORM</small>
        </span>
      )}
    </div>
  );
}
