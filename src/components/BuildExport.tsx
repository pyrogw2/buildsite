import { useState } from 'react';
import { useBuildStore } from '../store/buildStore';
import { getShareableUrl } from '../lib/buildEncoder';
import { generateDiscordMarkdown, generateTextSummary } from '../lib/buildExport';

export default function BuildExport() {
  const buildData = useBuildStore();
  const [copied, setCopied] = useState<string | null>(null);
  const [discordMarkdown, setDiscordMarkdown] = useState<string>('');
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleCopyUrl = () => {
    const url = getShareableUrl(buildData);
    navigator.clipboard.writeText(url);
    setCopied('url');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerateDiscord = async () => {
    try {
      const url = getShareableUrl(buildData);
      const markdown = await generateDiscordMarkdown(buildData, url);
      setDiscordMarkdown(markdown);
      setShowMarkdown(true);
    } catch (error) {
      console.error('Failed to generate Discord markdown:', error);
      alert('Failed to generate Discord markdown. Please try again.');
    }
  };

  const handleCopyDiscord = () => {
    navigator.clipboard.writeText(discordMarkdown);
    setCopied('discord');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyText = () => {
    const text = generateTextSummary(buildData);
    navigator.clipboard.writeText(text);
    setCopied('text');
    setTimeout(() => setCopied(null), 2000);
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Shareable link</h3>
                <p className="text-sm text-slate-400">Generate a one-click URL for this build.</p>
              </div>
              <button
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-2 rounded-full border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:border-sky-400 hover:bg-sky-500/20"
              >
                <span>{copied === 'url' ? '✓ Copied' : 'Copy link'}</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Discord markdown</h3>
                <p className="text-sm text-slate-400">Post-ready formatting for guild channels.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleGenerateDiscord}
                  className="rounded-full border border-indigo-500/60 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:border-indigo-400 hover:bg-indigo-500/20"
                >
                  Generate
                </button>
                {showMarkdown && (
                  <button
                    onClick={handleCopyDiscord}
                    className="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20"
                  >
                    {copied === 'discord' ? '✓ Copied' : 'Copy'}
                  </button>
                )}
              </div>
            </div>

            {showMarkdown && discordMarkdown && (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <pre className="text-xs text-slate-300">
                  {discordMarkdown}
                </pre>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Text summary</h3>
                <p className="text-sm text-slate-400">Copy a quick overview for notes or forums.</p>
              </div>
              <button
                onClick={handleCopyText}
                className="rounded-full border border-purple-500/60 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-200 transition hover:border-purple-400 hover:bg-purple-500/20"
              >
                {copied === 'text' ? '✓ Copied' : 'Copy text'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-slate-500">
            <h3 className="text-base font-semibold text-slate-300">In-game template code</h3>
            <p className="mt-1 text-sm">
              Coming soon — we&apos;re working on automatic chat code export once the encoder is finalised.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
