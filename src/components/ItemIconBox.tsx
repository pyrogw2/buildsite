import { useState, useRef, useEffect } from 'react';
import Tooltip from './Tooltip';
import SearchableDropdown from './SearchableDropdown';
import type { GW2Item } from '../types/gw2';

interface ItemIconBoxProps {
  itemId?: number;
  items: GW2Item[];
  onSelect: (id: number | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  size?: 'xs' | 'sm' | 'md';
  label?: string;
  getItemLabel?: (item: GW2Item) => string;
}

export default function ItemIconBox({
  itemId,
  items,
  onSelect,
  disabled = false,
  placeholder = '?',
  size = 'md',
  label,
  getItemLabel = (item) => item.name,
}: ItemIconBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find(item => item.id === itemId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
  };

  const handleSelect = (id: number | undefined) => {
    onSelect(id);
    setIsOpen(false);
  };

  const button = (
    <button
      type="button"
      onClick={() => !disabled && setIsOpen(!isOpen)}
      className={`${sizeClasses[size]} rounded border ${
        disabled
          ? 'border-slate-800 bg-slate-900/30 opacity-40 cursor-not-allowed'
          : 'border-slate-700 bg-slate-900/70 hover:border-slate-600 cursor-pointer'
      } flex items-center justify-center transition overflow-hidden`}
      disabled={disabled}
    >
      {selectedItem ? (
        <img
          src={selectedItem.icon}
          alt={selectedItem.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-xs text-slate-600 font-medium">{placeholder}</span>
      )}
    </button>
  );

  return (
    <div ref={containerRef} className="relative flex flex-col items-center gap-1">
      {label && (
        <label className="text-[8px] uppercase tracking-wider text-slate-500">
          {label}
        </label>
      )}

      {selectedItem ? (
        <Tooltip
          title={selectedItem.name}
          content={selectedItem.details?.infix_upgrade?.buff?.description || selectedItem.description || ''}
          icon={selectedItem.icon}
          rarity={selectedItem.rarity}
          itemType={selectedItem.type}
        >
          {button}
        </Tooltip>
      ) : (
        button
      )}

      {/* Dropdown Overlay */}
      {isOpen && (
        <div className="absolute top-full mt-1 z-50 w-64">
          <SearchableDropdown
            items={items}
            selectedId={itemId}
            onSelect={handleSelect}
            getItemId={(item) => item.id}
            getItemLabel={getItemLabel}
            placeholder="Search..."
            autoFocus={true}
          />
        </div>
      )}
    </div>
  );
}
