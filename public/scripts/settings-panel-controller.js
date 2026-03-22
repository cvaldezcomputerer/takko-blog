/*
 * WARNING: Browser-only helper.
 * Manages the shared settings panel lifecycle across header/island triggers.
 */
(function initializeTakkoSettingsPanelController() {
  if (typeof window === 'undefined') return;
  if (window.TakkoSettingsPanelController) return;

  let panel = null;
  let backdrop = null;

  function hasLiveNodes() {
    return Boolean(panel && backdrop && panel.isConnected && backdrop.isConnected);
  }

  function ensurePanelNodes() {
    if (hasLiveNodes()) return { panel, backdrop };

    panel = null;
    backdrop = null;

    const panels = document.querySelectorAll('.settings-cog-wrapper .settings-panel');
    if (!panels.length) return { panel: null, backdrop: null };

    panel = panels[0];
    panel.classList.add('settings-sheet');
    if (panel.parentElement !== document.body) {
      document.body.appendChild(panel);
    }

    for (let i = 1; i < panels.length; i += 1) {
      panels[i].remove();
    }

    let managedBackdrop = document.querySelector('.settings-sheet-backdrop[data-controller="takko"]');
    if (!managedBackdrop) {
      managedBackdrop = document.createElement('div');
      managedBackdrop.className = 'settings-sheet-backdrop';
      managedBackdrop.dataset.controller = 'takko';
      managedBackdrop.addEventListener('click', closeAllPanels);
      document.body.appendChild(managedBackdrop);
    }

    backdrop = managedBackdrop;
    return { panel, backdrop };
  }

  function closeAllPanels() {
    const wrappers = document.querySelectorAll('.settings-cog-wrapper');
    for (const wrapper of wrappers) {
      wrapper.classList.remove('is-open');
      if (wrapper instanceof HTMLDetailsElement) {
        wrapper.open = false;
      }
    }

    if (panel) panel.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
  }

  function openForWrapper(wrapper) {
    if (!(wrapper instanceof Element)) return;
    const host = wrapper.closest('.settings-cog-wrapper');
    if (!host) return;

    const nodes = ensurePanelNodes();
    if (!nodes.panel || !nodes.backdrop) return;

    const alreadyOpen = host.classList.contains('is-open') && nodes.panel.classList.contains('is-open');
    closeAllPanels();
    if (alreadyOpen) return;

    host.classList.add('is-open');
    nodes.panel.classList.add('is-open');
    nodes.backdrop.classList.add('is-open');
  }

  function bindTriggers() {
    const wrappers = document.querySelectorAll('.settings-cog-wrapper');
    for (const wrapper of wrappers) {
      if (wrapper.dataset.panelTriggerBound) continue;
      wrapper.dataset.panelTriggerBound = 'true';

      const trigger = wrapper.querySelector('.settings-cog');
      if (!trigger) continue;

      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        openForWrapper(wrapper);
      });
    }
  }

  function bindGlobalClosers() {
    if (window.__takkoSettingsPanelCloseBound) return;
    window.__takkoSettingsPanelCloseBound = true;

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeAllPanels();
      }
    });

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest('.settings-cog-wrapper .settings-cog')) return;
      if (panel && panel.contains(target)) return;
      if (target.closest('.language-controls')) return;

      closeAllPanels();
    });
  }

  function initialize() {
    ensurePanelNodes();
    bindTriggers();
    bindGlobalClosers();
  }

  document.addEventListener('takko:settings-open', (event) => {
    const wrapper = event?.detail?.wrapper;
    if (wrapper) {
      openForWrapper(wrapper);
    }
  });

  document.addEventListener('takko:settings-close', closeAllPanels);
  document.addEventListener('astro:page-load', initialize);
  document.addEventListener('astro:after-swap', () => {
    // Remove any panel that persisted through the view transition so
    // ensurePanelNodes() always grabs a fresh element from the new page.
    if (panel && panel.isConnected) {
      panel.remove();
    }
    panel = null;
    initialize();
  });

  window.TakkoSettingsPanelController = {
    initialize,
    closeAllPanels,
    openForWrapper,
  };
})();
