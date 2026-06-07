import { useState, useEffect } from 'react';

export default function useNavigationState() {
  const [theme, setTheme] = useState('modern');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [trackerSubTab, setTrackerSubTab] = useState('journal');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedMagicSport, setSelectedMagicSport] = useState('all');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return {
    theme,
    setTheme,
    activeTab,
    setActiveTab,
    trackerSubTab,
    setTrackerSubTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    selectedMagicSport,
    setSelectedMagicSport
  };
}
