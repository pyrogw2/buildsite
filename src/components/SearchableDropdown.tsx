import { useState, useRef, useEffect } from 'react';

interface SearchableDropdownProps<T, K = number> {
  items: T[];
  selectedId?: K;
  onSelect: (id: K | undefined) => void;
  getItemId: (item: T) => K;
  getItemLabel: (item: T) => string;
  placeholder?: string;
  disabled?: boolean;
}

export default function SearchableDropdown<T, K = number>({
  items,
  selectedId,
  onSelect,
  getItemId,
  getItemLabel,
  placeholder = 'Select...',
  disabled = false,
}: SearchableDropdownProps<T, K>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find(item => getItemId(item) === selectedId);

  // Filter items based on search term
  const filteredItems = items.filter(item =>
    getItemLabel(item).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when filtered items change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        setIsOpen(true);
        event.preventDefault();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % filteredItems.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
        break;
      case 'Enter':
        event.preventDefault();
        if (filteredItems[highlightedIndex]) {
          handleSelect(getItemId(filteredItems[highlightedIndex]));
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  const handleSelect = (id: K) => {
    onSelect(id);
    setIsOpen(false);
    setSearchTerm('');
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onSelect(undefined);
    setSearchTerm('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : (selectedItem ? getItemLabel(selectedItem) : '')}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5 pr-16 text-xs text-slate-200 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50"
        />
        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
          {selectedItem && (
            <button
              onClick={handleClear}
              className="flex h-4 w-4 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              type="button"
            >
              ×
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-4 w-4 items-center justify-center text-slate-400"
            type="button"
          >
            {isOpen ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
        >
          {filteredItems.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">No results found</div>
          ) : (
            filteredItems.map((item, index) => {
              const itemId = getItemId(item);
              const isSelected = itemId === selectedId;
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={String(itemId)}
                  onClick={() => handleSelect(itemId)}
                  className={`w-full px-3 py-2 text-left text-xs transition ${
                    isHighlighted
                      ? 'bg-slate-700 text-white'
                      : isSelected
                      ? 'bg-slate-800 text-slate-200'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                  type="button"
                >
                  {getItemLabel(item)}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
