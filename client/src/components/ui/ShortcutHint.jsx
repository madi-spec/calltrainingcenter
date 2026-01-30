/**
 * Visual keyboard shortcut indicator
 */
export default function ShortcutHint({ keys, className = '' }) {
  if (!keys) return null;

  const keyList = Array.isArray(keys) ? keys : keys.split('+');

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {keyList.map((key, index) => (
        <span key={index} className="flex items-center">
          {index > 0 && <span className="text-gray-600 mx-0.5">+</span>}
          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-700 border border-gray-600 rounded text-gray-300 min-w-[1.5rem] text-center">
            {formatKey(key)}
          </kbd>
        </span>
      ))}
    </span>
  );
}

function formatKey(key) {
  const keyMap = {
    'ctrl': 'Ctrl',
    'meta': '\u2318', // Command key on Mac
    'alt': 'Alt',
    'shift': 'Shift',
    'enter': '\u21B5', // Return symbol
    'escape': 'Esc',
    'space': 'Space',
    ' ': 'Space',
    'arrowup': '\u2191',
    'arrowdown': '\u2193',
    'arrowleft': '\u2190',
    'arrowright': '\u2192'
  };

  const lowerKey = key.toLowerCase().trim();
  return keyMap[lowerKey] || key.toUpperCase();
}
