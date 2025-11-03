import { useState } from 'react';
import { useBuildStore } from '../store/buildStore';
import { getShareableUrl } from '../lib/buildEncoder';
import { generateDiscordMarkdown, generateTextSummary } from '../lib/buildExport';

export default function BuildExport() {
  const buildData = useBuildStore();
  const [copied, setCopied] = useState<string | null>(null);
  const [discordMarkdown, setDiscordMarkdown] = useState<string>('');
  const [showMarkdown, setShowMarkdown] = useState(false);

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
    <div className="bg-gray-800 rounded-lg p-3">
      <h2 className="text-sm font-semibold mb-2">Share Build</h2>

      <div className="space-y-4">
        {/* Share URL */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="font-medium text-gray-200 mb-3">Shareable Link</h3>
          <div className="flex gap-2">
            <button
              onClick={handleCopyUrl}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition-colors"
            >
              {copied === 'url' ? '✓ Copied!' : 'Copy Link'}
            </button>
            <p className="text-sm text-gray-400 flex items-center">
              Copy a link to share this build with others
            </p>
          </div>
        </div>

        {/* Discord Export */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="font-medium text-gray-200 mb-3">Discord Markdown</h3>
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleGenerateDiscord}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded font-medium transition-colors"
            >
              Generate Discord Format
            </button>
            {showMarkdown && (
              <button
                onClick={handleCopyDiscord}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium transition-colors"
              >
                {copied === 'discord' ? '✓ Copied!' : 'Copy to Clipboard'}
              </button>
            )}
          </div>

          {showMarkdown && discordMarkdown && (
            <div className="bg-gray-800 rounded p-3 mt-3">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                {discordMarkdown}
              </pre>
            </div>
          )}
        </div>

        {/* Text Summary */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="font-medium text-gray-200 mb-3">Text Summary</h3>
          <button
            onClick={handleCopyText}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-medium transition-colors"
          >
            {copied === 'text' ? '✓ Copied!' : 'Copy Text Summary'}
          </button>
        </div>

        {/* In-game Chat Link (Future) */}
        <div className="bg-gray-700 rounded-lg p-4 opacity-50">
          <h3 className="font-medium text-gray-200 mb-3">In-Game Template Code</h3>
          <button
            disabled
            className="px-4 py-2 bg-gray-600 rounded font-medium cursor-not-allowed"
          >
            Coming Soon
          </button>
          <p className="text-xs text-gray-400 mt-2">
            In-game template code generation requires implementing GW2's chat link format
          </p>
        </div>
      </div>
    </div>
  );
}
