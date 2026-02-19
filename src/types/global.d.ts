interface TakkoSettingsApi {
  getTheme: () => 'light' | 'dark';
  applyTheme: (theme?: 'light' | 'dark') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  getShowDefinitionHighlights: () => boolean;
  applyDefinitionHighlightsSetting: (value?: boolean) => void;
  setShowDefinitionHighlights: (value: boolean) => void;
  getIslandVisibility: () => boolean;
  applyIslandVisibilitySetting: (value?: boolean) => void;
  setIslandVisibility: (value: boolean) => void;
  getTextSize: () => 'sm' | 'md' | 'lg';
  applyTextSizeSetting: (size?: 'sm' | 'md' | 'lg') => void;
  setTextSize: (size: 'sm' | 'md' | 'lg') => void;
  cycleTextSize: () => 'sm' | 'md' | 'lg';
  applyAll: () => void;
}

declare global {
  interface Document {
    startViewTransition?: (callback: () => void | Promise<void>) => unknown;
  }

  interface Window {
    TakkoSettings?: TakkoSettingsApi;
    __settingsCogAfterSwapBound?: boolean;
    __settingsCogPageLoadBound?: boolean;
    __settingsCogLanguageBound?: boolean;
  }
}

export {};
