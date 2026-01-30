import { useAccessibility } from '../../context/AccessibilityContext';

function Toggle({ label, description, checked, onChange }) {
  const id = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="pr-4">
        <label htmlFor={id} className="font-medium text-gray-900 dark:text-white cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
          checked ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function AccessibilitySettings() {
  const {
    reduceMotion,
    highContrast,
    largeText,
    keyboardOnly,
    updateSetting,
    resetSettings
  } = useAccessibility();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Accessibility Settings
        </h3>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          <div className="p-4">
            <Toggle
              label="Reduce Motion"
              description="Minimize animations and transitions throughout the app"
              checked={reduceMotion}
              onChange={(value) => updateSetting('reduceMotion', value)}
            />

            <Toggle
              label="High Contrast"
              description="Increase contrast for better readability"
              checked={highContrast}
              onChange={(value) => updateSetting('highContrast', value)}
            />

            <Toggle
              label="Large Text"
              description="Increase font sizes throughout the app"
              checked={largeText}
              onChange={(value) => updateSetting('largeText', value)}
            />

            <Toggle
              label="Keyboard Navigation Mode"
              description="Always show focus indicators for keyboard navigation"
              checked={keyboardOnly}
              onChange={(value) => updateSetting('keyboardOnly', value)}
            />
          </div>
        </div>
      </div>

      <button
        onClick={resetSettings}
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
      >
        Reset to defaults
      </button>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Keyboard Shortcuts
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li><kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">?</kbd> - Show all keyboard shortcuts</li>
          <li><kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">Tab</kbd> - Navigate through interactive elements</li>
          <li><kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">Escape</kbd> - Close dialogs and menus</li>
          <li><kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">Enter</kbd> / <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">Space</kbd> - Activate buttons and links</li>
        </ul>
      </div>
    </div>
  );
}

export default AccessibilitySettings;
