import { useEffect, useMemo, useRef, useState } from 'react';
import { useBuildStore } from '../store/buildStore';
import type { SkillSelection } from '../types/gw2';

declare global {
  interface Window {
    GW2Armory?: {
      initAll?: (options?: { rootElement?: HTMLElement }) => void;
    };
  }
}

const ARMORY_SCRIPT_URL = 'https://unpkg.com/armory-embeds@0.16.0/armory-embeds.js';

let scriptPromise: Promise<void> | null = null;

const loadArmoryScript = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window object'));
  if (window.GW2Armory) return Promise.resolve();

  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[src="${ARMORY_SCRIPT_URL}"]`) as HTMLScriptElement | null;

      if (existing?.dataset.loaded === 'true') {
        resolve();
        return;
      }

      const script = existing ?? document.createElement('script');
      script.src = ARMORY_SCRIPT_URL;
      script.async = true;

      const handleLoad = () => {
        script.dataset.loaded = 'true';
        resolve();
      };
      const handleError = () => reject(new Error('Failed to load GW2 Armory embeds'));

      script.addEventListener('load', handleLoad, { once: true });
      script.addEventListener('error', handleError, { once: true });

      if (!existing) {
        document.head.appendChild(script);
      }
    });
  }

  return scriptPromise;
};

const SKILL_SLOT_ORDER: Array<keyof SkillSelection> = [
  'heal',
  'utility1',
  'utility2',
  'utility3',
  'elite',
];

export default function ArmoryPreview() {
  const { skills, traits, profession } = useBuildStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => {
    let isMounted = true;

    setStatus('loading');
    loadArmoryScript()
      .then(() => {
        if (!isMounted) return;
        setStatus('ready');
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const skillIds = useMemo(() => {
    return SKILL_SLOT_ORDER.map((slot) => skills[slot])
      .filter((value): value is number => typeof value === 'number')
      .join(',');
  }, [skills]);

  const traitIds = useMemo(() => {
    const selected: number[] = [];
    const choiceKeys: Array<'spec1Choices' | 'spec2Choices' | 'spec3Choices'> = [
      'spec1Choices',
      'spec2Choices',
      'spec3Choices',
    ];

    choiceKeys.forEach((key) => {
      const choices = traits[key];
      if (!choices) return;
      choices.forEach((choice) => {
        if (choice) selected.push(choice);
      });
    });

    return selected.join(',');
  }, [traits]);

  useEffect(() => {
    if (status !== 'ready' || !containerRef.current) return;

    window.GW2Armory?.initAll?.({ rootElement: containerRef.current });
  }, [status, skillIds, traitIds, profession]);

  const hasSelection = Boolean(skillIds || traitIds);

  return (
    <div className="rounded-[32px] border border-slate-800/80 bg-gradient-to-b from-slate-900/70 via-slate-950/70 to-slate-950/90 p-6 shadow-[0_30px_70px_-30px_rgba(15,23,42,0.9)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Preview</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Armory Embed</h2>
          <p className="mt-1 text-sm text-slate-400">
            A live preview of the skills and traits you&apos;ve selected for your {profession}.
          </p>
        </div>
        <span className={`inline-flex h-10 min-w-[120px] items-center justify-center rounded-full border border-slate-700 px-4 text-xs font-semibold uppercase tracking-[0.3em] ${
          status === 'ready' ? 'text-emerald-300 border-emerald-500/40' : status === 'loading' ? 'text-amber-300 border-amber-500/40' : 'text-rose-300 border-rose-500/40'
        }`}>
          {status === 'ready' ? 'Online' : status === 'loading' ? 'Loading…' : 'Offline'}
        </span>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6">
        <div
          ref={containerRef}
          className="min-h-[420px] rounded-2xl border border-dashed border-slate-800/70 bg-slate-950/80 p-6"
        >
          {status === 'error' && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-rose-300">Unable to load GW2 Armory embeds.</p>
              <p className="mt-1 max-w-sm text-xs text-slate-400">
                Check your network connection or allow third-party scripts from <code className="font-mono text-slate-300">unpkg.com</code>.
              </p>
            </div>
          )}

          {status !== 'error' && !hasSelection && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-base font-medium text-slate-200">No selections yet</p>
              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Choose skills or traits on the left to populate the preview. We&apos;ll initialise the embed automatically.
              </p>
            </div>
          )}

          {status === 'ready' && hasSelection && (
            <div className="flex flex-col gap-4">
              {skillIds && (
                <div
                  key={skillIds}
                  data-armory-embed="skills"
                  data-armory-ids={skillIds}
                  data-armory-size="64"
                  className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                />
              )}

              {traitIds && (
                <div
                  key={traitIds}
                  data-armory-embed="traits"
                  data-armory-ids={traitIds}
                  className="grid gap-4 md:grid-cols-2"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
