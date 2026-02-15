import { memo, useEffect, useState } from "react";
import { useWallpaper } from "../wallpaper/WallpaperContext";
import { getFaviconUrl } from "../utils";
import { Modal, Form, Button } from "react-bootstrap";

/* ── Types ─────────────────────────────────────────────── */

interface ShortcutItem {
  id: string;
  url: string;
  title: string;
}

/* ── Constants ─────────────────────────────────────────── */

const STORAGE_KEY = "minim-shortcuts";
const MAX_SHORTCUTS = 10;

const BRAND_ICONS: Record<string, string> = {
  "mail.google.com":   "https://cdn.simpleicons.org/gmail/EA4335",
  "gemini.google.com": "https://cdn.simpleicons.org/googlegemini/8E75B2",
  "www.youtube.com":   "https://cdn.simpleicons.org/youtube/FF0000",
  "youtube.com":       "https://cdn.simpleicons.org/youtube/FF0000",
  "drive.google.com":  "https://cdn.simpleicons.org/googledrive/4285F4",
};

/* ── Helpers ───────────────────────────────────────────── */

function iconUrl(url: string, size = 64): string {
  try {
    const host = new URL(url).hostname;
    if (BRAND_ICONS[host]) return BRAND_ICONS[host];
  } catch { /* fall through */ }
  return getFaviconUrl(url, size);
}

function label(item: ShortcutItem): string {
  if (item.title) return item.title;
  try { return new URL(item.url).hostname.replace(/^www\./, ""); }
  catch { return "Link"; }
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ── Storage ───────────────────────────────────────────── */

function load(): ShortcutItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return (JSON.parse(raw) as ShortcutItem[]).slice(0, MAX_SHORTCUTS);
  } catch { /* ignore */ }
  return [];
}

function save(items: ShortcutItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/* ── Sub-components ────────────────────────────────────── */

const ShortcutTile = memo(function ShortcutTile({ item, onEdit }: { item: ShortcutItem; onEdit: () => void }) {
  return (
    <div className="shortcut-tile">
      <a
        href={item.url}
        className="shortcut-link"
        rel="noopener noreferrer"
      >
        <div className="shortcut-icon-wrap">
          <img src={iconUrl(item.url)} alt="" className="shortcut-icon" />
        </div>
        <span className="shortcut-label">{label(item)}</span>
      </a>
      <button
        type="button"
        className="shortcut-edit"
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        aria-label="Edit shortcut"
      >
        ✎
      </button>
    </div>
  );
});

const AddTile = memo(function AddTile({ onClick }: { onClick: () => void }) {
  return (
    <div className="shortcut-tile">
      <button type="button" className="shortcut-add" onClick={onClick}>
        <div className="shortcut-icon-wrap shortcut-icon-wrap-add">
          <span className="shortcut-add-icon">+</span>
        </div>
        <span className="shortcut-label">Add</span>
      </button>
    </div>
  );
});

const IconPreview = memo(function IconPreview({ url }: { url: string }) {
  if (!url) return null;
  const src = iconUrl(url, 64);
  return (
    <div className="shortcut-preview">
      <img
        src={src}
        alt=""
        width={48}
        height={48}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    </div>
  );
});

const EditModal = memo(function EditModal({
  show,
  isNew,
  initialUrl,
  initialTitle,
  onSave,
  onRemove,
  onClose,
}: {
  show: boolean;
  isNew: boolean;
  initialUrl: string;
  initialTitle: string;
  onSave: (url: string, title: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    if (show) { setUrl(initialUrl); setTitle(initialTitle); }
  }, [show, initialUrl, initialTitle]);

  const handleSave = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    onSave(trimmed, title.trim());
  };

  return (
    <Modal show={show} onHide={onClose} centered className="shortcuts-modal">
      <Modal.Header closeButton>
        <Modal.Title>{isNew ? "Add shortcut" : "Edit shortcut"}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="shortcut-modal-preview-row">
          <IconPreview url={url} />
        </div>

        <Form.Group className="mb-3">
          <Form.Label>URL</Form.Label>
          <Form.Control
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
          />
        </Form.Group>

        <Form.Group>
          <Form.Label>Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Site name (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>

      <Modal.Footer>
        {!isNew && (
          <Button variant="outline-danger" className="me-auto" onClick={onRemove}>
            Remove
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} disabled={!url.trim()}>
          {isNew ? "Add" : "Save"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

/* ── Main component ────────────────────────────────────── */

export function Shortcuts() {
  const { font } = useWallpaper();
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>(load);
  const [editing, setEditing] = useState<{ index: number; isNew: boolean } | null>(null);

  // persist on change
  useEffect(() => { save(shortcuts); }, [shortcuts]);

  const canAdd = shortcuts.length < MAX_SHORTCUTS;
  const editItem = editing !== null ? shortcuts[editing.index] : null;

  const openAdd = () => {
    setEditing({ index: shortcuts.length, isNew: true });
  };

  const openEdit = (index: number) => {
    setEditing({ index, isNew: false });
  };

  const closeModal = () => setEditing(null);

  const handleSave = (url: string, title: string) => {
    if (!editing) return;
    setShortcuts((prev) => {
      const next = [...prev];
      if (editing.isNew) {
        next.push({ id: uid(), url, title });
      } else {
        next[editing.index] = { ...next[editing.index], url, title };
      }
      return next.slice(0, MAX_SHORTCUTS);
    });
    closeModal();
  };

  const handleRemove = () => {
    if (!editing || editing.isNew) return;
    setShortcuts((prev) => prev.filter((_, i) => i !== editing.index));
    closeModal();
  };

  return (
    <>
      <div className="shortcuts" style={{ fontFamily: font }}>
        {shortcuts.map((item, i) => (
          <ShortcutTile key={item.id} item={item} onEdit={() => openEdit(i)} />
        ))}
        {canAdd && <AddTile onClick={openAdd} />}
      </div>

      <EditModal
        show={editing !== null}
        isNew={editing?.isNew ?? true}
        initialUrl={editItem?.url ?? ""}
        initialTitle={editItem?.title ?? ""}
        onSave={handleSave}
        onRemove={handleRemove}
        onClose={closeModal}
      />
    </>
  );
}
