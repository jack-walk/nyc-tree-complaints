/**
 * Button Pair Component
 * Displays two navigation buttons side by side
 */

class ButtonPair {
  constructor(config) {
    this.buttons = config.buttons || []; // Array of button configs
    this.containerSelector = config.containerSelector || 'body';
    this.className = config.className || 'button-pair-container';
  }

  /**
   * Creates a single button element
   */
  createButton(buttonConfig) {
    const button = document.createElement('button');
    button.textContent = buttonConfig.label || 'Button';
    button.className = `button-pair-btn ${buttonConfig.className || ''}`;
    button.addEventListener('click', () => this.navigate(buttonConfig.targetPage));
    return button;
  }

  /**
   * Navigates to the target page
   */
  navigate(targetPage) {
    window.location.href = targetPage;
  }

  /**
   * Renders the button pair to the page
   */
  render() {
    const container = document.querySelector(this.containerSelector);
    if (!container) {
      console.error(`Container not found: ${this.containerSelector}`);
      return;
    }

    // Create wrapper div for the pair
    const wrapper = document.createElement('div');
    wrapper.className = this.className;

    // Create and append each button
    this.buttons.forEach(buttonConfig => {
      const button = this.createButton(buttonConfig);
      wrapper.appendChild(button);
    });

    // Append wrapper to container
    container.appendChild(wrapper);
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ButtonPair };
}
