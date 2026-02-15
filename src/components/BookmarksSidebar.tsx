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

const DEV_BOOKMARKS: BookmarkTreeNode[] = [
  {
    id: "dev-1",
    title: "Bookmarks Bar",
    children: [
      { id: "dev-1-1", title: "Google", url: "https://www.google.com" },
      { id: "dev-1-2", title: "GitHub", url: "https://github.com" },
      { id: "dev-1-3", title: "Stack Overflow", url: "https://stackoverflow.com" },
      {
        id: "dev-1-4",
        title: "Development",
        children: [
          { id: "dev-1-4-1", title: "MDN Web Docs", url: "https://developer.mozilla.org" },
          { id: "dev-1-4-2", title: "TypeScript", url: "https://www.typescriptlang.org" },
          { id: "dev-1-4-3", title: "Vite", url: "https://vitejs.dev" },
        ],
      },
    ],
  },
  {
    id: "dev-2",
    title: "Other Bookmarks",
    children: [
      { id: "dev-2-1", title: "YouTube", url: "https://www.youtube.com" },
      { id: "dev-2-2", title: "Reddit", url: "https://www.reddit.com" },
      {
        id: "dev-2-3",
        title: "News",
        children: [
          { id: "dev-2-3-1", title: "Hacker News", url: "https://news.ycombinator.com" },
          { id: "dev-2-3-2", title: "TechCrunch", url: "https://techcrunch.com" },
        ],
      },
    ],
  },
];

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
  onOpen,
  onClose,
}: {
  isOpen: boolean;
  onOpen: () => void;
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
    if (!isOpen) return;

    if (!isBookmarksApiAvailable()) {
      // Dev mode: use dummy bookmarks
      setBookmarks(DEV_BOOKMARKS);
      setExpandedIds(new Set(DEV_BOOKMARKS.map((n) => n.id)));
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    chrome.bookmarks.getTree((tree) => {
      const roots = (tree[0]?.children ?? []).filter(
        (n: BookmarkTreeNode) => n.children?.length || n.url
      ) as BookmarkTreeNode[];
      setBookmarks(roots);
      setExpandedIds(new Set(roots.map((n) => n.id)));
      setLoading(false);
    });
  }, [isOpen]);

  if (!isOpen) {
    return (
      <div
        className="bookmarks-sidebar-trigger"
        onMouseEnter={onOpen}
      />
    );
  }

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
        onMouseLeave={onClose}
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
