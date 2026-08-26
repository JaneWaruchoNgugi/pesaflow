import React from 'react';

export const YouTube: React.FC<{ id?: string; title?: string }> = ({ id, title }) => {
  if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
  return (
    <div style={{ position: 'relative', paddingTop: '56.25%', margin: '18px 0', borderRadius: 12, overflow: 'hidden' }}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title={title ?? 'Video'}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
      />
    </div>
  );
};
