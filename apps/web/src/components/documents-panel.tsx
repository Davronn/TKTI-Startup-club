'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, ExternalLink, FileImage, FileSpreadsheet, FileText, LoaderCircle, Presentation, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { StartupDocument } from '@/lib/types';
import { ErrorState } from '@/components/ui';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.docx,.xlsx,.pptx';

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function isInline(contentType: string) {
  return contentType.startsWith('image/') || contentType === 'application/pdf';
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <FileImage size={18} />;
  if (type.includes('spreadsheet')) return <FileSpreadsheet size={18} />;
  if (type.includes('presentation')) return <Presentation size={18} />;
  return <FileText size={18} />;
}

export function DocumentsPanel({ startupId, canEdit, canDelete }: { startupId: string; canEdit: boolean; canDelete: boolean }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const key = ['startup-files', startupId];
  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: key,
    queryFn: () => apiFetch<StartupDocument[]>(`/startups/${startupId}/files`),
  });
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: key }),
    queryClient.invalidateQueries({ queryKey: ['startup', startupId] }),
  ]);

  const remove = useMutation({
    mutationFn: (fileId: string) => apiFetch(`/startups/${startupId}/files/${fileId}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Hujjat o‘chirildi'); void refresh(); },
    onError: (mutationError) => toast.error(mutationError instanceof Error ? mutationError.message : 'Hujjatni o‘chirib bo‘lmadi'),
  });

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    let uploaded = 0;
    // Bir nechta fayl tanlansa, ketma-ket yuklanadi — biri xato bersa, qolganlari davom etadi
    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: fayl 10 MB dan katta`);
        continue;
      }
      setUploading(file.name);
      try {
        const form = new FormData();
        form.append('file', file, file.name);
        await apiFetch(`/startups/${startupId}/files`, { method: 'POST', body: form });
        uploaded += 1;
      } catch (uploadError) {
        toast.error(`${file.name}: ${uploadError instanceof Error ? uploadError.message : 'yuklab bo‘lmadi'}`);
      }
    }
    setUploading(null);
    if (inputRef.current) inputRef.current.value = '';
    if (uploaded) {
      toast.success(uploaded === 1 ? 'Hujjat yuklandi' : `${uploaded} ta hujjat yuklandi`);
      void refresh();
    }
  }

  if (isLoading) return <div className="finance-loading">Hujjatlar yuklanmoqda...</div>;
  if (error) return <div className="panel-error"><ErrorState error={error} onRetry={() => void refetch()} /></div>;

  return (
    <div className="documents-panel">
      <div className="documents-toolbar">
        <div>
          <h3>Hujjatlar</h3>
          <p>Pitch deck, shartnoma, taqdimot va boshqa fayllar. PDF, rasm, DOCX, XLSX, PPTX — 10 MB gacha.</p>
        </div>
        {canEdit && (
          <>
            <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={(event) => void upload(event.target.files)} />
            <button className="button button-primary" disabled={Boolean(uploading)} onClick={() => inputRef.current?.click()}>
              {uploading ? <LoaderCircle className="spin" size={15} /> : <Upload size={15} />}
              {uploading ? 'Yuklanmoqda...' : 'Fayl yuklash'}
            </button>
          </>
        )}
      </div>
      {uploading && <p className="documents-progress">“{uploading}” yuklanmoqda…</p>}
      {data.length ? (
        <ul className="documents-list">
          {data.map((file) => {
            const url = `/api/backend/startups/${startupId}/files/${file.id}`;
            return (
              <li key={file.id} className="document-row">
                <span className="document-icon"><FileIcon type={file.contentType} /></span>
                <div className="document-main">
                  <a href={url} target={isInline(file.contentType) ? '_blank' : undefined} rel="noreferrer" download={isInline(file.contentType) ? undefined : file.name}>{file.name}</a>
                  <span>{formatBytes(file.size)} · {file.uploader?.fullName || 'Noma’lum'} · {formatDate(file.createdAt, true)}</span>
                </div>
                <div className="document-actions">
                  <a className="icon-button" href={url} target={isInline(file.contentType) ? '_blank' : undefined} rel="noreferrer" download={isInline(file.contentType) ? undefined : file.name} aria-label={isInline(file.contentType) ? 'Ochish' : 'Yuklab olish'}>
                    {isInline(file.contentType) ? <ExternalLink size={15} /> : <Download size={15} />}
                  </a>
                  {canDelete && (
                    <button
                      className="icon-button danger-icon"
                      aria-label={`${file.name} faylini o‘chirish`}
                      disabled={remove.isPending}
                      onClick={() => window.confirm(`"${file.name}" o‘chirilsinmi? Bu amalni qaytarib bo‘lmaydi.`) && remove.mutate(file.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="finance-empty"><FileText size={24} /><strong>Hujjatlar yo‘q</strong><span>{canEdit ? 'Pitch deck yoki boshqa muhim fayllarni yuklang.' : 'Bu startapga hali fayl biriktirilmagan.'}</span></div>
      )}
    </div>
  );
}
