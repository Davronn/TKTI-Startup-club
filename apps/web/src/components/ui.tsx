import { LoaderCircle } from 'lucide-react';
import { StartupStatus } from '@/lib/types';
import { statusLabels } from '@/lib/format';

export function PageLoader() {
  return (
    <div className="page-loader">
      <LoaderCircle className="spin" size={26} />
      <span>Yuklanmoqda...</span>
    </div>
  );
}

export function StatusBadge({ status }: { status: StartupStatus }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{statusLabels[status]}</span>;
}

export function StageBadge({ name, color }: { name: string; color: string }) {
  return (
    <span className="stage-badge" style={{ '--stage-color': color } as React.CSSProperties}>
      <i /> {name}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
