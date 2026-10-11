import React from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';

export function DashboardSidebar({
  sidebarCollapsed,
  setSidebarCollapsed,
  setQuickSearchOpen,
  navItems,
  activeNav,
  setActiveNav,
  setActiveTabPill,
}) {
  return (
    <aside
      className={`border-r border-zinc-200 bg-white flex flex-col justify-between transition-all duration-200 ease-in-out shrink-0 z-20 ${
        sidebarCollapsed ? 'w-14' : 'w-60'
      }`}
    >
      {/* Top section: Search & Nav items */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden ${sidebarCollapsed ? 'px-1.5 py-2.5 space-y-1.5' : 'p-2.5 space-y-1'}`}>
        {/* Quick search button */}
        {!sidebarCollapsed ? (
          <div
            onClick={() => setQuickSearchOpen(true)}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-md border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-500 text-xs cursor-pointer mb-2.5 shadow-2xs transition-colors"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[11px] text-zinc-400">Rechercher...</span>
            </div>
            <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200">
              ctrl + K
            </kbd>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setQuickSearchOpen(true)}
            className="w-10 h-10 mx-auto flex items-center justify-center rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
            title="Rechercher (Ctrl + K)"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        {/* Sidebar toggle button (repli/dépli) */}
        {!sidebarCollapsed ? (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(true)}
            className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md flex items-center justify-between mb-2 transition-colors group"
            title="Replier la barre latérale"
          >
            <div className="flex items-center gap-2 truncate">
              <ChevronLeft className="w-4 h-4 text-zinc-500 group-hover:text-zinc-900 shrink-0" />
              <span className="text-[11px] font-medium text-zinc-600 group-hover:text-zinc-900 truncate">Réduire la barre</span>
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            className="w-10 h-10 mx-auto flex items-center justify-center rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
            title="Déplier la barre latérale"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Subtle divider */}
        <div className={`border-b border-zinc-200/80 my-1.5 ${sidebarCollapsed ? 'w-8 mx-auto' : 'mx-1'}`} />

        {/* Menu List */}
        <nav className={sidebarCollapsed ? 'space-y-1 flex flex-col items-center' : 'space-y-0.5'}>
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveNav(item.id);
                  setActiveTabPill(item.id);
                }}
                title={sidebarCollapsed ? item.label : undefined}
                className={
                  sidebarCollapsed
                    ? `w-10 h-10 mx-auto flex items-center justify-center rounded-md transition-colors ${
                        isActive
                          ? 'bg-zinc-100 text-zinc-900 font-semibold shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 font-normal'
                      }`
                    : `w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                        isActive
                          ? 'bg-zinc-100 font-semibold text-zinc-900 shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50/90 font-normal'
                      }`
                }
              >
                {sidebarCollapsed ? (
                  <IconComponent
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-zinc-900' : 'text-zinc-500'
                    }`}
                  />
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 truncate">
                      <IconComponent
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-zinc-900' : 'text-zinc-500'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.hasSub && (
                      <ChevronRight className="w-3 h-3 text-zinc-400 shrink-0" />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom section: Help & Secondary Toggle */}
      <div className="border-t border-zinc-100 py-2 px-1 text-zinc-400">
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              className="w-10 h-10 mx-auto flex items-center justify-center hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors text-zinc-500"
              title="Aide & Guide"
              onClick={() => window.open('https://github.com/Houthoofd/Predictix', '_blank')}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="w-10 h-10 mx-auto flex items-center justify-center hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors text-zinc-500"
              title="Déplier la barre latérale"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2.5">
            <button
              type="button"
              className="p-1.5 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
              title="Aide & Guide"
              onClick={() => window.open('https://github.com/Houthoofd/Predictix', '_blank')}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono text-zinc-400">v1.2.0 • Pi</span>
          </div>
        )}
      </div>
    </aside>
  );
}
