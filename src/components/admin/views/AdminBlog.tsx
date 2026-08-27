import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText, Plus, Pencil, Trash2, Star, Eye, EyeOff, X, Check, AlertTriangle,
  Tag, Heart, MessageCircle, Send, ArrowLeft, UploadCloud, ImagePlus,
} from 'lucide-react';
import type { Article, ArticleStatus, Category } from '../../../types';
import { slugify } from '../../../lib/blog/slug';
import { readMinutes } from '../../../lib/blog/readTime';
import { parseSegments } from '../../../lib/blog/markdown';
import { uploadBlogImage } from '../../../lib/blog/uploadImage';
import { MarkdownRenderer } from '../../blog/content/MarkdownRenderer';
import {
  adminListArticles, adminSaveArticle, adminDeleteArticle,
  adminListCategories, adminSaveCategory, adminDeleteCategory,
  adminGetArticleCounts,
} from '../../../lib/blog/adminBlogRepo';

const nowIso = () => new Date().toISOString();

const blankArticle = (categoryId: string): Article => ({
  slug: '', title: '', excerpt: '', coverImageUrl: '', categoryId,
  authorName: '', authorAvatarUrl: '', bodyMarkdown: '', status: 'draft',
  featured: false, readMinutes: 1, publishedAt: null, scheduledFor: null,
  createdAt: '', updatedAt: '',
  seo: { metaTitle: '', metaDescription: '', ogImageUrl: '' },
  counts: { likes: 0, comments: 0, views: 0 },
});

const STATUS_COLOR: Record<ArticleStatus, string> = {
  published: '#16A34A', draft: '#9CA3AF', scheduled: '#EA580C',
};

type Toast = { ok: boolean; msg: string } | null;

export const AdminBlog: React.FC = () => {
  const [tab, setTab] = useState<'articles' | 'categories'>('articles');
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [editing, setEditing] = useState<Article | null>(null);   // article editor open
  const [catEditing, setCatEditing] = useState<Category | null>(null);
  const [filter, setFilter] = useState<'all' | ArticleStatus>('all');
  const [q, setQ] = useState('');

  const flash = (ok: boolean, msg: string) => { setToast({ ok, msg }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([adminListArticles(), adminListCategories()]);
      setCategories(c);
      setArticles(a);
      // Likes & comments live in subcollections now — overlay their real totals onto each
      // article (views stay on counts.views, bumped by the public view counter).
      const counts = await Promise.all(a.map(x => adminGetArticleCounts(x.slug).catch(() => null)));
      setArticles(a.map((x, i) => counts[i]
        ? { ...x, counts: { ...x.counts, likes: counts[i]!.likes, comments: counts[i]!.comments } }
        : x));
    } catch (e) {
      flash(false, (e as Error).message || 'Failed to load. Are you signed in as an admin and are the blog Firestore rules deployed?');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const stats = useMemo(() => ({
    total: articles.length,
    published: articles.filter(a => a.status === 'published').length,
    drafts: articles.filter(a => a.status === 'draft').length,
    views: articles.reduce((s, a) => s + (a.counts?.views ?? 0), 0),
  }), [articles]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return articles.filter(a =>
      (filter === 'all' || a.status === filter) &&
      (!term || a.title.toLowerCase().includes(term) || a.slug.includes(term)),
    );
  }, [articles, filter, q]);

  // ── Article actions ──────────────────────────────────────
  const saveArticle = async (a: Article) => {
    try { await adminSaveArticle(a); flash(true, `Saved “${a.title}”.`); setEditing(null); await load(); }
    catch (e) { flash(false, (e as Error).message || 'Save failed.'); }
  };
  const removeArticle = async (a: Article) => {
    if (!window.confirm(`Delete “${a.title}”? This cannot be undone.`)) return;
    try { await adminDeleteArticle(a.slug); flash(true, 'Article deleted.'); await load(); }
    catch (e) { flash(false, (e as Error).message || 'Delete failed.'); }
  };
  const togglePublish = async (a: Article) => {
    const next: Article = a.status === 'published'
      ? { ...a, status: 'draft', updatedAt: nowIso() }
      : { ...a, status: 'published', publishedAt: a.publishedAt || nowIso(), updatedAt: nowIso() };
    try { await adminSaveArticle(next); flash(true, next.status === 'published' ? 'Published.' : 'Unpublished.'); await load(); }
    catch (e) { flash(false, (e as Error).message || 'Update failed.'); }
  };
  const toggleFeatured = async (a: Article) => {
    try { await adminSaveArticle({ ...a, featured: !a.featured, updatedAt: nowIso() }); await load(); }
    catch (e) { flash(false, (e as Error).message || 'Update failed.'); }
  };

  // ── Category actions ─────────────────────────────────────
  const saveCategory = async (c: Category) => {
    try { await adminSaveCategory(c); flash(true, `Saved category “${c.name}”.`); setCatEditing(null); await load(); }
    catch (e) { flash(false, (e as Error).message || 'Save failed.'); }
  };
  const removeCategory = async (c: Category) => {
    const used = articles.filter(a => a.categoryId === c.id).length;
    if (!window.confirm(`Delete category “${c.name}”?${used ? ` ${used} article(s) use it and will keep the id but show no category.` : ''}`)) return;
    try { await adminDeleteCategory(c.id); flash(true, 'Category deleted.'); await load(); }
    catch (e) { flash(false, (e as Error).message || 'Delete failed.'); }
  };

  if (editing) {
    return <ArticleEditor article={editing} categories={categories} onSave={saveArticle} onCancel={() => setEditing(null)} />;
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={S.h1}><FileText size={22} /> Blog</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={tab === 'articles' ? S.tabOn : S.tab} onClick={() => setTab('articles')}>Articles</button>
          <button style={tab === 'categories' ? S.tabOn : S.tab} onClick={() => setTab('categories')}>Categories</button>
        </div>
      </div>
      <p style={S.sub}>Create and manage the Financial Learning Hub. Published articles go live at <code>/blog</code>.</p>

      {toast && (
        <div style={{ ...S.toast, color: toast.ok ? '#16A34A' : '#DC2626', borderColor: toast.ok ? '#16A34A55' : '#DC262655' }}>
          {toast.ok ? <Check size={15} /> : <AlertTriangle size={15} />} {toast.msg}
        </div>
      )}

      {tab === 'articles' && (
        <>
          <div style={S.statRow}>
            <Stat label="Total" value={stats.total} />
            <Stat label="Published" value={stats.published} />
            <Stat label="Drafts" value={stats.drafts} />
            <Stat label="Total views" value={stats.views} />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', margin: '4px 0 14px' }}>
            <button
              style={{ ...S.primaryBtn, opacity: categories.length ? 1 : 0.55 }}
              disabled={!categories.length}
              title={categories.length ? 'New article' : 'Create a category first'}
              onClick={() => setEditing(blankArticle(categories[0]?.id ?? ''))}
            >
              <Plus size={16} /> New article
            </button>
            {(['all', 'published', 'draft', 'scheduled'] as const).map(f => (
              <button key={f} style={filter === f ? S.chipOn : S.chip} onClick={() => setFilter(f)}>
                {f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
            <input style={{ ...S.input, maxWidth: 220, marginLeft: 'auto' }} placeholder="Search title / slug…" value={q} onChange={e => setQ(e.target.value)} />
          </div>

          {!categories.length && !loading && (
            <div style={S.empty}>Create a category first (Categories tab), then you can add articles.</div>
          )}

          {loading ? <div style={S.empty}>Loading…</div> : visible.length === 0 ? (
            <div style={S.empty}>No articles{filter !== 'all' ? ` with status “${filter}”` : ''} yet.</div>
          ) : (
            <div style={S.card}>
              {visible.map(a => (
                <div key={a.slug} style={S.row}>
                  <button title={a.featured ? 'Unfeature' : 'Feature'} style={S.iconBtn} onClick={() => toggleFeatured(a)}>
                    <Star size={16} fill={a.featured ? '#EA580C' : 'none'} color={a.featured ? '#EA580C' : 'var(--text-3)'} />
                  </button>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={S.rowTitle}>{a.title || <em style={{ color: 'var(--text-3)' }}>(untitled)</em>}</div>
                    <div style={S.rowMeta}>
                      <span style={{ ...S.badge, color: STATUS_COLOR[a.status], background: `${STATUS_COLOR[a.status]}18`, borderColor: `${STATUS_COLOR[a.status]}40` }}>{a.status}</span>
                      {catById.get(a.categoryId) && <span style={S.catTag}><Tag size={11} /> {catById.get(a.categoryId)!.name}</span>}
                      <span style={S.count}><Heart size={12} /> {a.counts?.likes ?? 0}</span>
                      <span style={S.count}><MessageCircle size={12} /> {a.counts?.comments ?? 0}</span>
                      <span style={S.count}><Eye size={12} /> {a.counts?.views ?? 0}</span>
                      <span style={S.slug}>/{a.slug}</span>
                    </div>
                  </div>
                  <button title={a.status === 'published' ? 'Unpublish' : 'Publish'} style={S.iconBtn} onClick={() => togglePublish(a)}>
                    {a.status === 'published' ? <EyeOff size={16} /> : <Send size={16} />}
                  </button>
                  <button title="Edit" style={S.iconBtn} onClick={() => setEditing(a)}><Pencil size={16} /></button>
                  <button title="Delete" style={{ ...S.iconBtn, color: '#DC2626' }} onClick={() => removeArticle(a)}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'categories' && (
        <CategoriesPanel
          categories={categories}
          loading={loading}
          editing={catEditing}
          onNew={() => setCatEditing({ id: '', name: '', slug: '', description: '', order: (categories.at(-1)?.order ?? 0) + 1, colorToken: '--gold' })}
          onEdit={setCatEditing}
          onCancel={() => setCatEditing(null)}
          onSave={saveCategory}
          onDelete={removeCategory}
        />
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div style={S.stat}><div style={S.statVal}>{value.toLocaleString()}</div><div style={S.statLbl}>{label}</div></div>
);

/* ── Drag & drop image uploader (Firebase Storage) ──────── */
const ImageUploader: React.FC<{ value: string; onChange: (url: string) => void; folder?: 'covers' | 'body' }> = ({ value, onChange, folder = 'covers' }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file?: File | null) => {
    if (!file) return;
    setErr(''); setBusy(true);
    try { onChange(await uploadBlogImage(file, folder)); }
    catch (e) { setErr((e as Error).message || 'Upload failed. Are Storage rules deployed?'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      {value ? (
        <div style={{ border: '1px solid var(--border,#e5e7eb)', borderRadius: 10, overflow: 'hidden' }}>
          <img src={value} alt="cover preview" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
          <div style={{ display: 'flex', gap: 8, padding: 8 }}>
            <button style={S.secondaryBtn} onClick={() => inputRef.current?.click()}>{busy ? 'Uploading…' : 'Replace'}</button>
            <button style={{ ...S.secondaryBtn, color: '#DC2626' }} onClick={() => onChange('')}>Remove</button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files?.[0]); }}
          style={{ ...S.dropzone, borderColor: drag ? '#EA580C' : 'var(--border,#e5e7eb)', background: drag ? 'var(--gold-dim,#FEF3E7)' : 'var(--bg-surface,#f9fafb)' }}
        >
          <UploadCloud size={22} color={drag ? '#EA580C' : 'var(--text-3)'} />
          <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{busy ? 'Uploading…' : 'Drag & drop an image, or click to choose'}</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>PNG / JPG / WebP · up to 5 MB</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }} />
      <input style={{ ...S.input, fontSize: 13, marginTop: 8 }} placeholder="…or paste an image URL" value={value} onChange={e => onChange(e.target.value)} />
      {err && <div style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>{err}</div>}
    </div>
  );
};

/* ── Article editor ─────────────────────────────────────── */
const ArticleEditor: React.FC<{
  article: Article; categories: Category[];
  onSave: (a: Article) => void; onCancel: () => void;
}> = ({ article, categories, onSave, onCancel }) => {
  const isNew = article.slug === '';
  const [f, setF] = useState<Article>(article);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [preview, setPreview] = useState(false);
  const [bodyBusy, setBodyBusy] = useState(false);
  const bodyInputRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Article>(k: K, v: Article[K]) => setF(prev => ({ ...prev, [k]: v }));

  const onTitle = (title: string) => {
    setF(prev => ({ ...prev, title, slug: isNew && !slugTouched ? slugify(title) : prev.slug }));
  };

  const canSave = f.title.trim() && f.slug.trim() && f.categoryId && f.excerpt.trim();

  const submit = () => {
    const now = nowIso();
    const scheduledFor = f.status === 'scheduled' && f.scheduledFor
      ? new Date(f.scheduledFor).toISOString() : null;
    onSave({
      ...f,
      slug: f.slug.trim(),
      title: f.title.trim(),
      readMinutes: readMinutes(f.bodyMarkdown),
      createdAt: f.createdAt || now,
      updatedAt: now,
      publishedAt: f.status === 'published' ? (f.publishedAt || now) : (f.status === 'draft' ? null : f.publishedAt),
      scheduledFor,
    });
  };

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button style={S.iconBtn} onClick={onCancel} title="Back"><ArrowLeft size={18} /></button>
        <h1 style={S.h1}>{isNew ? 'New article' : 'Edit article'}</h1>
      </div>

      <div style={{ ...S.card, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Title">
          <input style={S.input} value={f.title} onChange={e => onTitle(e.target.value)} placeholder="How to build an emergency fund" />
        </Field>
        <div style={S.grid2}>
          <Field label="Slug (URL)">
            <input
              style={{ ...S.input, opacity: isNew ? 1 : 0.6 }}
              value={f.slug}
              readOnly={!isNew}
              onChange={e => { setSlugTouched(true); set('slug', slugify(e.target.value)); }}
              placeholder="how-to-build-emergency-fund"
            />
          </Field>
          <Field label="Category">
            <select style={S.input} value={f.categoryId} onChange={e => set('categoryId', e.target.value)}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Excerpt (card + meta description)">
          <textarea style={{ ...S.input, minHeight: 56, resize: 'vertical' }} value={f.excerpt} onChange={e => set('excerpt', e.target.value)} placeholder="One or two sentences…" />
        </Field>
        <Field label="Author name"><input style={S.input} value={f.authorName} onChange={e => set('authorName', e.target.value)} /></Field>
        <Field label="Cover image">
          <ImageUploader value={f.coverImageUrl} onChange={url => set('coverImageUrl', url)} folder="covers" />
        </Field>

        <Field label="Body (Markdown + shortcodes: ::calculator{type=emergency-fund} · ::chart{data=mmf-growth} · ::youtube{id=…})">
          <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <button style={!preview ? S.chipOn : S.chip} onClick={() => setPreview(false)}>Write</button>
            <button style={preview ? S.chipOn : S.chip} onClick={() => setPreview(true)}>Preview</button>
            <button
              style={{ ...S.chip, marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: bodyBusy ? 0.6 : 1 }}
              disabled={bodyBusy}
              onClick={() => bodyInputRef.current?.click()}
            >
              <ImagePlus size={14} /> {bodyBusy ? 'Uploading…' : 'Insert image'}
            </button>
            <input ref={bodyInputRef} type="file" accept="image/*" hidden onChange={async e => {
              const file = e.target.files?.[0]; e.target.value = '';
              if (!file) return;
              setBodyBusy(true);
              try {
                const url = await uploadBlogImage(file, 'body');
                setF(prev => ({ ...prev, bodyMarkdown: (prev.bodyMarkdown ? prev.bodyMarkdown + '\n\n' : '') + `![](${url})` }));
              } catch (err) { window.alert((err as Error).message || 'Upload failed.'); }
              finally { setBodyBusy(false); }
            }} />
          </div>
          {preview ? (
            <div style={{ ...S.input, minHeight: 220, overflow: 'auto', background: 'var(--bg-card,#fff)' }}>
              {parseSegments(f.bodyMarkdown).map((seg, i) =>
                seg.kind === 'markdown'
                  ? <MarkdownRenderer key={i} text={seg.text} />
                  : <div key={i} style={S.scChip}>⧉ {seg.name}{Object.keys(seg.attrs).length ? ` (${Object.entries(seg.attrs).map(([k, v]) => `${k}=${v}`).join(', ')})` : ''} — renders on the live page</div>,
              )}
            </div>
          ) : (
            <textarea style={{ ...S.input, minHeight: 260, resize: 'vertical', fontFamily: 'ui-monospace, monospace', fontSize: 13 }} value={f.bodyMarkdown} onChange={e => set('bodyMarkdown', e.target.value)} placeholder={'## Heading\n\nText…\n\n::calculator{type=emergency-fund}'} />
          )}
        </Field>

        <div style={S.grid2}>
          <Field label="Status">
            <select style={S.input} value={f.status} onChange={e => set('status', e.target.value as ArticleStatus)}>
              <option value="draft">Draft (hidden)</option>
              <option value="published">Published (live)</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </Field>
          {f.status === 'scheduled' ? (
            <Field label="Publish at">
              <input type="datetime-local" style={S.input} value={f.scheduledFor ? f.scheduledFor.slice(0, 16) : ''} onChange={e => set('scheduledFor', e.target.value)} />
            </Field>
          ) : (
            <Field label="Featured">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-2)', padding: '10px 0' }}>
                <input type="checkbox" checked={f.featured} onChange={e => set('featured', e.target.checked)} /> Show as the featured hero on the blog home
              </label>
            </Field>
          )}
        </div>

        <details style={{ marginTop: 2 }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>SEO (optional overrides)</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <Field label="Meta title"><input style={S.input} value={f.seo.metaTitle} onChange={e => set('seo', { ...f.seo, metaTitle: e.target.value })} placeholder="Defaults to the title" /></Field>
            <Field label="Meta description"><input style={S.input} value={f.seo.metaDescription} onChange={e => set('seo', { ...f.seo, metaDescription: e.target.value })} placeholder="Defaults to the excerpt" /></Field>
            <Field label="OG image URL"><input style={S.input} value={f.seo.ogImageUrl} onChange={e => set('seo', { ...f.seo, ogImageUrl: e.target.value })} placeholder="Defaults to the cover image" /></Field>
          </div>
        </details>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button style={{ ...S.primaryBtn, opacity: canSave ? 1 : 0.5 }} disabled={!canSave} onClick={submit}>
            <Check size={16} /> {isNew ? 'Create article' : 'Save changes'}
          </button>
          <button style={S.secondaryBtn} onClick={onCancel}><X size={16} /> Cancel</button>
          {!canSave && <span style={{ fontSize: 12, color: 'var(--text-3)', alignSelf: 'center' }}>Title, slug, category & excerpt are required.</span>}
        </div>
      </div>
    </div>
  );
};

/* ── Categories panel ───────────────────────────────────── */
const CategoriesPanel: React.FC<{
  categories: Category[]; loading: boolean; editing: Category | null;
  onNew: () => void; onEdit: (c: Category) => void; onCancel: () => void;
  onSave: (c: Category) => void; onDelete: (c: Category) => void;
}> = ({ categories, loading, editing, onNew, onEdit, onCancel, onSave, onDelete }) => {
  const [f, setF] = useState<Category | null>(editing);
  useEffect(() => { setF(editing); }, [editing]);

  if (f) {
    const isNew = !categories.some(c => c.id === f.id) || f.id === '';
    const set = <K extends keyof Category>(k: K, v: Category[K]) => setF(prev => prev ? { ...prev, [k]: v } : prev);
    const canSave = f.name.trim() && f.id.trim();
    return (
      <div style={{ ...S.card, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{isNew ? 'New category' : `Edit “${f.name}”`}</h3>
        <Field label="Name">
          <input style={S.input} value={f.name} onChange={e => {
            const name = e.target.value;
            setF(prev => prev ? { ...prev, name, id: isNew ? slugify(name) : prev.id, slug: isNew ? slugify(name) : prev.slug } : prev);
          }} placeholder="Money Market Funds" />
        </Field>
        <div style={S.grid2}>
          <Field label="Id / slug"><input style={{ ...S.input, opacity: isNew ? 1 : 0.6 }} readOnly={!isNew} value={f.id} onChange={e => { const s = slugify(e.target.value); set('id', s); set('slug', s); }} /></Field>
          <Field label="Order"><input type="number" style={S.input} value={f.order} onChange={e => set('order', Number(e.target.value))} /></Field>
        </div>
        <Field label="Description"><input style={S.input} value={f.description} onChange={e => set('description', e.target.value)} /></Field>
        <Field label="Accent colour token">
          <select style={S.input} value={f.colorToken} onChange={e => set('colorToken', e.target.value)}>
            {['--gold', '--green', '--blue', '--amber', '--red'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...S.primaryBtn, opacity: canSave ? 1 : 0.5 }} disabled={!canSave} onClick={() => onSave(f)}><Check size={16} /> Save</button>
          <button style={S.secondaryBtn} onClick={onCancel}><X size={16} /> Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button style={{ ...S.primaryBtn, margin: '4px 0 14px' }} onClick={onNew}><Plus size={16} /> New category</button>
      {loading ? <div style={S.empty}>Loading…</div> : categories.length === 0 ? (
        <div style={S.empty}>No categories yet. Add one to start creating articles.</div>
      ) : (
        <div style={S.card}>
          {categories.map(c => (
            <div key={c.id} style={S.row}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: `var(${c.colorToken})`, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.rowTitle}>{c.name}</div>
                <div style={S.rowMeta}><span style={S.slug}>/{c.slug}</span> · order {c.order} · {c.description || '—'}</div>
              </div>
              <button title="Edit" style={S.iconBtn} onClick={() => onEdit(c)}><Pencil size={16} /></button>
              <button title="Delete" style={{ ...S.iconBtn, color: '#DC2626' }} onClick={() => onDelete(c)}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div><label style={S.label}>{label}</label>{children}</div>
);

const S: Record<string, React.CSSProperties> = {
  h1: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800, color: 'var(--text-1)', margin: 0 },
  sub: { fontSize: 14, color: 'var(--text-3)', margin: '6px 0 16px' },
  tab: { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border,#e5e7eb)', background: 'transparent', color: 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  tabOn: { padding: '8px 14px', borderRadius: 8, border: '1px solid #EA580C', background: 'var(--gold-dim,#FEF3E7)', color: '#EA580C', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  toast: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, padding: '8px 12px', border: '1px solid', borderRadius: 8, marginBottom: 14 },
  statRow: { display: 'flex', gap: 12, flexWrap: 'wrap', margin: '0 0 16px' },
  stat: { flex: '1 1 120px', background: 'var(--bg-card,#fff)', border: '1px solid var(--border,#e5e7eb)', borderRadius: 12, padding: '12px 16px' },
  statVal: { fontSize: 24, fontWeight: 800, color: 'var(--text-1)' },
  statLbl: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em' },
  card: { background: 'var(--bg-card,#fff)', border: '1px solid var(--border,#e5e7eb)', borderRadius: 12, padding: 8 },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderBottom: '1px solid var(--border,#f0f0f0)' },
  rowTitle: { fontSize: 14, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowMeta: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: 'var(--text-3)', marginTop: 3, flexWrap: 'wrap' },
  badge: { fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', padding: '2px 7px', borderRadius: 999, border: '1px solid' },
  catTag: { display: 'inline-flex', alignItems: 'center', gap: 3 },
  count: { display: 'inline-flex', alignItems: 'center', gap: 3 },
  slug: { fontFamily: 'ui-monospace, monospace', color: 'var(--text-3)' },
  iconBtn: { display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border,#e5e7eb)', background: 'var(--bg-surface,#f9fafb)', color: 'var(--text-2)', cursor: 'pointer', flexShrink: 0 },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#F97316,#EA580C)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' },
  secondaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 9, border: '1px solid var(--border,#e5e7eb)', background: 'var(--bg-surface,#f3f4f6)', color: 'var(--text-1)', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  chip: { padding: '7px 12px', borderRadius: 999, border: '1px solid var(--border,#e5e7eb)', background: 'transparent', color: 'var(--text-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' },
  chipOn: { padding: '7px 12px', borderRadius: 999, border: '1px solid #EA580C', background: 'var(--gold-dim,#FEF3E7)', color: '#EA580C', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border,#e5e7eb)', background: 'var(--bg-surface,#f9fafb)', color: 'var(--text-1)', fontSize: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  empty: { padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14, background: 'var(--bg-card,#fff)', border: '1px dashed var(--border,#e5e7eb)', borderRadius: 12 },
  dropzone: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', padding: '26px 16px', borderRadius: 10, border: '2px dashed', cursor: 'pointer', transition: 'background .15s, border-color .15s' },
  scChip: { display: 'inline-block', fontSize: 12, fontWeight: 600, color: '#EA580C', background: 'var(--gold-dim,#FEF3E7)', border: '1px solid #EA580C40', borderRadius: 8, padding: '6px 10px', margin: '8px 0' },
};
