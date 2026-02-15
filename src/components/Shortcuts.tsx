import { useCallback, useEffect, useState } from "react";
import { useWallpaper } from "../wallpaper/WallpaperContext";
import { getFaviconUrl } from "../utils";
import { Modal, Form, Button } from "react-bootstrap";

const SHORTCUTS_KEY = "minim-shortcuts";
const MAX_SHORTCUTS = 5;

export interface ShortcutItem {
  id: string;
  url: string;
  title: string;
}

// High-quality custom icons from Simple Icons (SVG)
const CUSTOM_ICONS: Record<string, string> = {
  "mail.google.com": "https://cdn.simpleicons.org/gmail/EA4335",
  "gemini.google.com": "https://cdn.simpleicons.org/googlegemini/8E75B2",
  "chatgpt.com": "https://cdn.simpleicons.org/openai/412991",
  "chat.openai.com": "https://cdn.simpleicons.org/openai/412991",
  "www.youtube.com": "https://cdn.simpleicons.org/youtube/FF0000",
  "youtube.com": "https://cdn.simpleicons.org/youtube/FF0000",
  "drive.google.com": "https://cdn.simpleicons.org/googledrive/4285F4",
};

const defaultShortcuts: ShortcutItem[] = [
  { id: "1", url: "https://mail.google.com", title: "Gmail" },
  { id: "2", url: "https://gemini.google.com", title: "Gemini" },
  { id: "3", url: "https://chatgpt.com", title: "ChatGPT" },
  { id: "4", url: "https://www.youtube.com", title: "YouTube" },
  { id: "5", url: "https://drive.google.com", title: "Drive" },
];

function getShortcutIconUrl(url: string): string {
  try {
    const host = new URL(url).hostname;
    return CUSTOM_ICONS[host] ?? getFaviconUrl(url, 64);
  } catch {
    return getFaviconUrl(url, 64);
  }
}

function loadShortcuts(): ShortcutItem[] {
  try {
    const stored = localStorage.getItem(SHORTCUTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ShortcutItem[];
      return parsed.length <= MAX_SHORTCUTS ? parsed : parsed.slice(0, MAX_SHORTCUTS);
    }
  } catch {
    // ignore
  }
  return defaultShortcuts;
}

function saveShortcuts(items: ShortcutItem[]) {
  localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(items));
}

function getLabel(item: ShortcutItem): string {
  if (item.title) return item.title;
  try {
    return new URL(item.url).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}

export function Shortcuts() {
  const { font } = useWallpaper();
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>(loadShortcuts);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    saveShortcuts(shortcuts);
  }, [shortcuts]);

  const ensureSlots = useCallback(() => {
    setShortcuts((prev) => {
      const result = [...prev];
      while (result.length < MAX_SHORTCUTS) {
        result.push({
          id: String(Date.now() + result.length),
          url: "",
          title: "",
        });
      }
      return result.slice(0, MAX_SHORTCUTS);
    });
  }, []);

  useEffect(() => {
    ensureSlots();
  }, [ensureSlots]);

  const startEdit = (index: number) => {
    const item = shortcuts[index];
    setEditUrl(item?.url ?? "");
    setEditTitle(item?.title ?? "");
    setEditingIndex(index);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const url = editUrl.trim();
    const title = editTitle.trim();
    setShortcuts((prev) => {
      const next = [...prev];
      next[editingIndex] = {
        id: next[editingIndex]?.id ?? String(Date.now()),
        url: url || "",
        title: title || "",
      };
      return next;
    });
    setEditingIndex(null);
  };

  const removeShortcut = (index: number) => {
    setShortcuts((prev) => {
      const next = prev.filter((_, i) => i !== index);
      while (next.length < MAX_SHORTCUTS) {
        next.push({ id: String(Date.now() + next.length), url: "", title: "" });
      }
      return next.slice(0, MAX_SHORTCUTS);
    });
    setEditingIndex(null);
  };

  const handleShortcutClick = (index: number) => {
    const item = shortcuts[index];
    if (item?.url) {
      window.open(item.url, "_blank", "noopener,noreferrer");
    } else {
      startEdit(index);
    }
  };

  return (
    <>
      <div className="shortcuts" style={{ fontFamily: font }}>
        {shortcuts.map((item, index) => (
          <div
            key={item.id}
            className={`shortcut-tile ${item.url ? "shortcut-tile-filled" : "shortcut-tile-empty"}`}
          >
            {item.url ? (
              <>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shortcut-link"
                  onClick={(e) => {
                    e.preventDefault();
                    handleShortcutClick(index);
                  }}
                >
                  <div className="shortcut-icon-wrap">
                    <img
                      src={getShortcutIconUrl(item.url)}
                      alt=""
                      className="shortcut-icon"
                      width={64}
                      height={64}
                    />
                  </div>
                  <span className="shortcut-label">{getLabel(item)}</span>
                </a>
                <button
                  type="button"
                  className="shortcut-edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(index);
                  }}
                  aria-label="Edit shortcut"
                >
                  ✎
                </button>
              </>
            ) : (
              <button
                type="button"
                className="shortcut-add"
                onClick={() => startEdit(index)}
              >
                <span className="shortcut-add-icon">+</span>
                <span className="shortcut-add-label">Add</span>
              </button>
            )}
          </div>
        ))}
      </div>

      <Modal
        show={editingIndex !== null}
        onHide={() => setEditingIndex(null)}
        centered
        className="shortcuts-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {shortcuts[editingIndex ?? 0]?.url ? "Edit shortcut" : "Add shortcut"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>URL</Form.Label>
            <Form.Control
              type="url"
              placeholder="https://example.com"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Name (optional)</Form.Label>
            <Form.Control
              type="text"
              placeholder="Site name"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          {shortcuts[editingIndex ?? 0]?.url && (
            <Button
              variant="outline-danger"
              onClick={() => editingIndex !== null && removeShortcut(editingIndex)}
            >
              Remove
            </Button>
          )}
          <Button variant="secondary" onClick={() => setEditingIndex(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={saveEdit}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
