import { useState } from 'react';
import { useBuildStore } from '../store/buildStore';
import { getShareableUrl } from '../lib/buildEncoder';
import { generateChatLink } from '../lib/buildExport';
import { importFromChatCode } from '../lib/chatCodeConverter';
import type { BuildData } from '../types/gw2';

export default function BuildExport() {
  const buildData = useBuildStore();
  const loadBuild = useBuildStore((state) => state.loadBuild);
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [chatCodeInput, setChatCodeInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleCopyUrl = () => {
    const url = getShareableUrl(buildData as BuildData);
    navigator.clipboard.writeText(url);
    setCopied('url');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyChatCode = async () => {
    try {
      const chatCode = await generateChatLink(buildData as BuildData);
      navigator.clipboard.writeText(chatCode);
      setCopied('chatCode');
      setTimeout(() => setCopied(null), 2000);
    } catch (error: unknown) {
      console.error('Failed to generate chat code:', error);
    }
  };

  const handleImportChatCode = async () => {
    if (!chatCodeInput.trim()) {
      setImportError('Please paste a chat code');
      return;
    }

    try {
      setImportError(null);
      setImportSuccess(false);
      const importedBuild = await importFromChatCode(chatCodeInput.trim(), buildData.gameMode);
      loadBuild(importedBuild);
      setImportSuccess(true);
      setChatCodeInput('');
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (error: unknown) {
      console.error('Failed to import chat code:', error);
      const errorMessage = error instanceof Error ? error.message : 'Invalid chat code. Please check the format and try again.';
      setImportError(errorMessage);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-[0_18px_50px_-28px_rgba(14,22,40,1)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between"
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Sharing</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Build export</h2>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 text-slate-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={`h-4 w-4 transition-transform ${expanded ? '' : '-rotate-90'}`}
          >
            <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="mt-6 space-y-5">
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-slate-900/70 p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-white">Shareable link</h3>
              <p className="text-sm text-slate-400">Generate a URL to share this build.</p>
            </div>
            <button
              onClick={handleCopyUrl}
              className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-left transition hover:border-slate-600 hover:bg-slate-900"
            >
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-200">Copy URL</div>
                <div className="text-xs text-slate-500">Binary encoded, smallest URL size</div>
              </div>
              <span className="ml-3 rounded-full border border-sky-500/60 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200">
                {copied === 'url' ? '✓ Copied' : 'Copy'}
              </span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-900/70 p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-white">In-game template code</h3>
              <p className="text-sm text-slate-400">Copy chat code to paste directly in Guild Wars 2.</p>
            </div>
            <button
              onClick={handleCopyChatCode}
              className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-left transition hover:border-slate-600 hover:bg-slate-900"
            >
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-200">Copy chat code</div>
                <div className="text-xs text-slate-500">Format: [&DQMGOyYv...]</div>
              </div>
              <span className="ml-3 rounded-full border border-amber-500/60 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                {copied === 'chatCode' ? '✓ Copied' : 'Copy'}
              </span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-slate-900/70 p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-white">Import chat code</h3>
              <p className="text-sm text-slate-400">Paste a GW2 build template to load it.</p>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={chatCodeInput}
                onChange={(e) => {
                  setChatCodeInput(e.target.value);
                  setImportError(null);
                }}
                placeholder="[&DQMGOyYv...]"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 transition focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                onClick={handleImportChatCode}
                className="flex w-full items-center justify-center rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 hover:border-emerald-500"
              >
                {importSuccess ? '✓ Imported!' : 'Import Build'}
              </button>
              {importError && (
                <p className="text-xs text-red-400">{importError}</p>
              )}
              {importSuccess && (
                <p className="text-xs text-emerald-400">Build imported successfully!</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
