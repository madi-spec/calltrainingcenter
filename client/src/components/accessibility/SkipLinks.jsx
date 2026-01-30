function SkipLinks() {
  const links = [
    { id: 'main-content', label: 'Skip to main content' },
    { id: 'main-nav', label: 'Skip to navigation' },
    { id: 'search', label: 'Skip to search' }
  ];

  return (
    <div className="sr-only focus-within:not-sr-only">
      <nav aria-label="Skip links" className="fixed top-0 left-0 z-[100] p-2">
        <ul className="flex gap-2">
          {links.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                className="block px-4 py-2 bg-primary-600 text-white font-medium rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                           transform -translate-y-full focus:translate-y-0 transition-transform"
                onClick={(e) => {
                  e.preventDefault();
                  const target = document.getElementById(link.id);
                  if (target) {
                    target.focus();
                    target.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default SkipLinks;
