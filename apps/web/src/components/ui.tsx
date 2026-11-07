import { AlertCircle, LoaderCircle, RotateCcw } from 'lucide-react';
import { StartupStatus } from '@/lib/types';
import { statusLabels } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function PageLoader() {
  return (
    <div className="page-loader">
      <LoaderCircle className="spin" size={26} />
      <span>Yuklanmoqda...</span>
    </div>
  );
}

/** So‘rov xatosi: "topilmadi"ni boshqa xatolardan ajratadi va qayta urinish imkonini beradi. */
export function ErrorState({
  error,
  title,
  onRetry,
  action,
}: {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  action?: React.ReactNode;
}) {
  const status = error instanceof ApiError ? error.status : undefined;
  const notFound = status === 404;
  const forbidden = status === 403;
  const heading = title || (notFound ? 'Ma’lumot topilmadi' : forbidden ? 'Ruxsat yo‘q' : 'Ma’lumotlarni yuklab bo‘lmadi');
  const description = notFound
    ? 'U o‘chirilgan yoki havola noto‘g‘ri bo‘lishi mumkin.'
    : forbidden
      ? 'Bu bo‘limni ko‘rish uchun sizda yetarli huquq yo‘q.'
      : error instanceof Error && error.message && status
        ? error.message
        : 'Internet aloqasini yoki serverni tekshirib, qayta urinib ko‘ring.';
  return (
    <div className="card">
      <div className="empty-state" role="alert">
        <div className="empty-icon error-icon"><AlertCircle size={23} /></div>
        <h3>{heading}</h3>
        <p>{description}</p>
        <div className="empty-actions">
          {onRetry && !notFound && !forbidden && (
            <button type="button" className="button button-secondary" onClick={onRetry}><RotateCcw size={15} /> Qayta urinish</button>
          )}
          {action}
        </div>
      </div>
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
