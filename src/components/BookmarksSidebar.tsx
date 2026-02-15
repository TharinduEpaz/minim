import { useCallback, useEffect, useState } from "react";
import { useWallpaper } from "../wallpaper/WallpaperContext";
import { getFaviconUrl } from "../utils";

interface BookmarkTreeNode {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkTreeNode[];
}

function isBookmarksApiAvailable(): boolean {
  return typeof chrome !== "undefined" && !!chrome?.bookmarks;
}

function bookmarkLabel(node: BookmarkTreeNode): string {
  if (node.title) return node.title;
  if (!node.url) return "Link";
  try {
    return new URL(node.url).hostname;
  } catch {
    return node.url;
  }
}

export function BookmarksSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { font } = useWallpaper();
  const [bookmarks, setBookmarks] = useState<BookmarkTreeNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isOpen || !isBookmarksApiAvailable()) {
      setLoading(false);
      if (!isBookmarksApiAvailable()) setError("Bookmarks unavailable");
      return;
    }

    setLoading(true);
    setError(null);

    chrome.bookmarks.getTree((tree) => {
      const roots = (tree[0]?.children ?? []).filter(
        (n) => n.children?.length || n.url
      ) as BookmarkTreeNode[];
      setBookmarks(roots);
      setExpandedIds(new Set(roots.map((n) => n.id)));
      setLoading(false);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="bookmarks-sidebar-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="bookmarks-sidebar"
        style={{ fontFamily: font }}
        role="navigation"
      >
        <div className="bookmarks-sidebar-header">
          <span className="bookmarks-sidebar-title">Bookmarks</span>
          <button
            type="button"
            className="bookmarks-sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>

        <div className="bookmarks-sidebar-content">
          {loading && (
            <div className="bookmarks-sidebar-loading">Loading…</div>
          )}
          {error && (
            <div className="bookmarks-sidebar-error">{error}</div>
          )}
          {!loading && !error && (
            <BookmarkTree
              nodes={bookmarks}
              expandedIds={expandedIds}
              onToggle={toggleExpanded}
              depth={0}
            />
          )}
        </div>
      </aside>
    </>
  );
}

function BookmarkTree({
  nodes,
  expandedIds,
  onToggle,
  depth,
}: {
  nodes: BookmarkTreeNode[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  depth: number;
}) {
  return (
    <ul className="bookmarks-tree" style={{ paddingLeft: depth * 12 }}>
      {nodes.map((node) => (
        <BookmarkNode
          key={node.id}
          node={node}
          expandedIds={expandedIds}
          onToggle={onToggle}
          depth={depth}
        />
      ))}
    </ul>
  );
}

function BookmarkNode({
  node,
  expandedIds,
  onToggle,
  depth,
}: {
  node: BookmarkTreeNode;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  depth: number;
}) {
  const isFolder = !!node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = isFolder && node.children!.length > 0;

  if (node.url) {
    const faviconUrl = getFaviconUrl(node.url);
    return (
      <li className="bookmarks-item bookmarks-link">
        <a
          href={node.url}
          target="_blank"
          rel="noopener noreferrer"
          className="bookmarks-link-anchor"
        >
          {faviconUrl && (
            <img
              src={faviconUrl}
              alt=""
              className="bookmarks-favicon"
              width={16}
              height={16}
            />
          )}
          <span className="bookmarks-link-text">{bookmarkLabel(node)}</span>
        </a>
      </li>
    );
  }

  return (
    <li className="bookmarks-item bookmarks-folder">
      <button
        type="button"
        className="bookmarks-folder-toggle"
        onClick={() => onToggle(node.id)}
      >
        <span className="bookmarks-folder-icon">
          {hasChildren ? (isExpanded ? "▾" : "▸") : ""}
        </span>
        <span className="bookmarks-folder-title">{node.title}</span>
      </button>
      {hasChildren && isExpanded && (
        <BookmarkTree
          nodes={node.children!}
          expandedIds={expandedIds}
          onToggle={onToggle}
          depth={depth + 1}
        />
      )}
    </li>
  );
}
