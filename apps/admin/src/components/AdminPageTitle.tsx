import type { CSSProperties, ReactNode } from 'react';

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  alignItems: 'flex-start',
  gap: 16,
  marginBottom: 24,
  minHeight: 40,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  gap: 8,
};

type AdminPageTitleProps = {
  title: string;
  /** Optional lines under the title (e.g. detail subtitle + id). */
  description?: ReactNode;
  actions?: ReactNode;
};

/** Shared admin chrome: one title row so list/detail pages align when switching routes. */
export function AdminPageTitle({ title, description, actions }: AdminPageTitleProps) {
  return (
    <div style={rowStyle}>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {description != null ? <div style={{ marginTop: 8 }}>{description}</div> : null}
      </div>
      <div style={actionsStyle}>{actions ?? null}</div>
    </div>
  );
}
