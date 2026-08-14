import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';

const MENU_GAP = 6;
// Rough ceiling on the menu's rendered height (search row + option list),
// used only to decide whether to flip it above the trigger near the
// viewport's bottom edge.
const MENU_MAX_HEIGHT = 300;

// Native <select> options can't be filtered by typing once a list grows past
// a handful of entries (the food database has 60+), so this swaps in a
// button + search field + list combo that behaves like a <select> from the
// outside (value / onChange / options) but lets the user narrow the list.
//
// The menu is rendered through a portal into document.body, positioned with
// `position: fixed` from the trigger's bounding rect. Several cards in this
// app pick up a residual `transform` from their entrance animation (fill
// mode `both`), which makes each card its own CSS stacking context — a
// menu rendered inline could never paint above a later sibling card
// regardless of z-index. Portaling sidesteps that entirely.
export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyLabel = 'No matches',
  resetAfterSelect = false,
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [menuStyle, setMenuStyle] = useState(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const selected = useMemo(
    () => options.find((opt) => String(opt.value) === String(value)),
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;
    const updateMenuStyle = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom;
      const flipUp = spaceBelow < MENU_MAX_HEIGHT && rect.top > spaceBelow;
      setMenuStyle({
        left: rect.left,
        width: rect.width,
        ...(flipUp
          ? { bottom: window.innerHeight - rect.top + MENU_GAP, maxHeight: rect.top - MENU_GAP * 2 }
          : { top: rect.bottom + MENU_GAP, maxHeight: spaceBelow - MENU_GAP * 2 }),
      });
    };
    updateMenuStyle();
    window.addEventListener('scroll', updateMenuStyle, true);
    window.addEventListener('resize', updateMenuStyle);
    return () => {
      window.removeEventListener('scroll', updateMenuStyle, true);
      window.removeEventListener('resize', updateMenuStyle);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      const inTrigger = containerRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setHighlight(0);
    const raf = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.children?.[highlight]?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const commit = (opt) => {
    onChange(opt.value);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) commit(filtered[highlight]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const showPlaceholder = resetAfterSelect || !selected;
  const label = showPlaceholder ? placeholder : selected.label;

  return (
    <div className={`searchable-select ${className}`} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="searchable-select-trigger"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={showPlaceholder ? 'placeholder' : ''}>{label}</span>
        <ChevronDown size={16} className="searchable-select-chevron" />
      </button>
      {open && menuStyle && createPortal(
        <div
          className="searchable-select-menu"
          role="listbox"
          ref={menuRef}
          style={{
            left: menuStyle.left,
            width: menuStyle.width,
            top: menuStyle.top,
            bottom: menuStyle.bottom,
            maxHeight: menuStyle.maxHeight,
          }}
        >
          <div className="searchable-select-search">
            <Search size={14} />
            <input
              ref={searchRef}
              type="text"
              value={query}
              placeholder={searchPlaceholder}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="searchable-select-options" ref={listRef}>
            {filtered.length === 0 && <div className="searchable-select-empty">{emptyLabel}</div>}
            {filtered.map((opt, i) => (
              <div
                key={opt.key ?? opt.value}
                role="option"
                aria-selected={String(opt.value) === String(value)}
                className={[
                  'searchable-select-option',
                  i === highlight ? 'highlighted' : '',
                  String(opt.value) === String(value) ? 'selected' : '',
                ].filter(Boolean).join(' ')}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(opt);
                }}
              >
                <span>{opt.label}</span>
                {String(opt.value) === String(value) && <Check size={14} />}
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
