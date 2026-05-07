/**
 * Navigation Component
 * Handles routing and navigation between pages
 */

class NavigationButton {
  constructor(config) {
    this.label = config.label || 'Navigate';
    this.targetPage = config.targetPage || 'index.html';
    this.targetId = config.targetId || null;
    this.containerSelector = config.containerSelector || 'body';
    this.className = config.className || 'nav-button';
    this.position = config.position || 'bottom'; // 'bottom', 'top', 'inline'
  }

  /**
   * Creates the button element
   */
  createButton() {
    const button = document.createElement('button');
    button.textContent = this.label;
    button.className = this.className;
    button.addEventListener('click', () => this.navigate());
    return button;
  }

  /**
   * Navigates to the target page
   */
  navigate() {
    let url = this.targetPage;
    if (this.targetId) {
      url = `${this.targetPage}?id=${this.targetId}`;
    }
    window.location.href = url;
  }

  /**
   * Renders the button to the page
   */
  render() {
    const container = document.querySelector(this.containerSelector);
    if (!container) {
      console.error(`Container not found: ${this.containerSelector}`);
      return;
    }

    const button = this.createButton();
    
    if (this.position === 'bottom') {
      container.appendChild(button);
    } else if (this.position === 'top') {
      container.insertBefore(button, container.firstChild);
    } else {
      container.appendChild(button);
    }
  }
}

/**
 * Router Component
 * Handles page routing and query parameters
 */
class Router {
  constructor() {
    this.params = this.parseQueryParams();
  }

  /**
   * Parses query parameters from URL
   */
  parseQueryParams() {
    const params = {};
    const queryString = window.location.search.substring(1);
    const pairs = queryString.split('&');
    
    pairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    });
    
    return params;
  }

  /**
   * Gets a specific query parameter
   */
  getParam(key) {
    return this.params[key] || null;
  }

  /**
   * Gets all query parameters
   */
  getAllParams() {
    return this.params;
  }

  /**
   * Navigates back to previous page
   */
  goBack() {
    window.history.back();
  }

  /**
   * Navigates to a specific page
   */
  goTo(page, params = {}) {
    let url = page;
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    if (queryString) {
      url += `?${queryString}`;
    }
    
    window.location.href = url;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NavigationButton, Router };
}
