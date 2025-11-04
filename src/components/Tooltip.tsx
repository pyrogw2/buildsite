import { useState, useRef, useEffect } from 'react';
import { parseGW2Text } from '../lib/textParser';
import type { GW2SkillModeData, GW2TraitModeData, ModeBundle, GW2Fact } from '../types/gw2';

interface TooltipProps {
  content: string;
  title: string;
  icon?: string;
  children: React.ReactNode;
  bonuses?: string[]; // For runes/relics - array of bonus strings like "(1): +25 Power"
  rarity?: string; // Item rarity (e.g., "Exotic")
  itemType?: string; // Item type (e.g., "Upgrade Component", "Relic")
  modeData?: ModeBundle<GW2SkillModeData | GW2TraitModeData>; // Optional competitive split data (currently unused, kept for future)
  currentMode?: 'pve' | 'pvp' | 'wvw'; // Current game mode to highlight (currently unused, kept for future)
  facts?: GW2Fact[]; // Facts to display (damage, range, cooldown, etc.)
}

export default function Tooltip({ content, title, icon, children, bonuses, rarity, itemType, facts }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);


  // Format a single fact for display
  const formatFact = (fact: GW2Fact): { text: string; description?: string } => {
    // Handle PrefixedBuff facts (e.g., "Defensive Protocol: Protect")
    if (fact.type === 'PrefixedBuff') {
      const prefix = (fact as any).prefix;
      const status = (fact as any).status;
      const description = (fact as any).description;

      // Use the prefix status (e.g., "Defensive Protocol: Protect") as the main text
      const text = prefix?.status || status || fact.text || 'Buff';

      return { text, description };
    }

    // Handle regular Buff/Condition facts
    if (fact.type === 'Buff') {
      const status = (fact as any).status;
      const description = (fact as any).description;
      const duration = fact.duration;
      const applyCount = (fact as any).apply_count;

      let text = status || fact.text || 'Buff';
      if (duration !== undefined) {
        text += ` (${duration}s)`;
      }
      if (applyCount !== undefined && applyCount > 1) {
        text += ` ×${applyCount}`;
      }

      return { text, description };
    }

    // Handle facts with specific values
    if (fact.type === 'Recharge' && fact.value !== undefined) {
      return { text: `${fact.text || 'Recharge'}: ${fact.value}s` };
    }
    if (fact.type === 'Range' && fact.value !== undefined) {
      return { text: `${fact.text || 'Range'}: ${fact.value}` };
    }
    if (fact.type === 'Radius' && fact.value !== undefined) {
      return { text: `${fact.text || 'Radius'}: ${fact.value}` };
    }
    if (fact.type === 'Distance' && fact.distance !== undefined) {
      return { text: `${fact.text || 'Distance'}: ${fact.distance}` };
    }
    if (fact.type === 'Duration' && fact.duration !== undefined) {
      return { text: `${fact.text || 'Duration'}: ${fact.duration}s` };
    }
    if (fact.type === 'Number' && fact.value !== undefined) {
      return { text: `${fact.text || 'Number'}: ${fact.value}` };
    }
    if (fact.type === 'Percent' && fact.percent !== undefined) {
      return { text: `${fact.text || 'Percent'}: ${fact.percent}%` };
    }
    if (fact.type === 'Time' && fact.value !== undefined) {
      return { text: `${fact.text || 'Time'}: ${fact.value}s` };
    }
    if (fact.type === 'AttributeAdjust' && fact.value !== undefined && (fact as any).target) {
      return { text: `${fact.text || (fact as any).target}: ${fact.value}` };
    }

    // For other types or facts without specific values, just show the text
    return { text: fact.text || '' };
  };


  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      const margin = 8;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Try positioning below the trigger by default
      let top = triggerRect.bottom + margin;
      let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);

      // Keep tooltip on screen horizontally
      if (left < margin) {
        left = margin;
      }
      if (left + tooltipRect.width > viewportWidth - margin) {
        left = viewportWidth - tooltipRect.width - margin;
      }

      // If tooltip would go off bottom, show above instead
      if (top + tooltipRect.height > viewportHeight - margin) {
        top = triggerRect.top - tooltipRect.height - margin;

        // If it still doesn't fit above, position at top of viewport
        if (top < margin) {
          top = margin;
        }
      }

      setPosition({ top, left });
    }
  }, [isVisible]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 max-w-sm max-h-[80vh] overflow-y-auto bg-gray-900 border-2 border-gray-600 rounded-lg p-3 shadow-2xl"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          <div className="flex items-start gap-3">
            {icon && (
              <img src={icon} alt="" className="w-14 h-14 rounded flex-shrink-0 border border-gray-700" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-orange-400 text-base mb-1">{title}</div>

              {rarity && itemType && (
                <div className="text-xs text-purple-400 mb-2">
                  {rarity} {itemType}
                </div>
              )}

              {bonuses && bonuses.length > 0 && (
                <div className="space-y-0.5 mb-2 text-xs">
                  {bonuses.map((bonus, index) => (
                    <div key={index} className="text-blue-300"
                      dangerouslySetInnerHTML={{ __html: parseGW2Text(bonus) }}
                    />
                  ))}
                </div>
              )}

              {facts && facts.length > 0 && (
                <div className="space-y-0.5 mb-2 text-xs">
                  {facts.map((fact, index) => {
                    const formatted = formatFact(fact);
                    if (!formatted.text) return null;
                    return (
                      <div key={index} className="flex items-center gap-2 text-blue-300">
                        {fact.icon && (
                          <img src={fact.icon} alt="" className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span dangerouslySetInnerHTML={{ __html: parseGW2Text(formatted.text) }} />
                      </div>
                    );
                  })}
                </div>
              )}

              {content && (
                <div
                  className="text-sm text-gray-300 leading-relaxed mt-2 pt-2 border-t border-gray-700"
                  dangerouslySetInnerHTML={{ __html: parseGW2Text(content) }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
