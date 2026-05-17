class TopNav {
	constructor(config = {}) {
		this.brandLabel = config.brandLabel || 'REPORTING BY JACK WALKER';
		this.websiteLabel = config.websiteLabel || 'Website';
		this.websiteHref = config.websiteHref || 'https://jackwalker.xyz';
		this.githubLabel = config.githubLabel || 'Github';
		this.githubHref = config.githubHref || 'https://github.com/jack-walk';
		this.rootSelector = config.rootSelector || '#site-nav-root';
	}

	render() {
		const root = document.querySelector(this.rootSelector) || document.body;

		const nav = document.createElement('nav');
		nav.className = 'top-nav';
		nav.setAttribute('aria-label', 'Site navigation');

		const left = document.createElement('div');
		left.className = 'top-nav__section top-nav__section--left';

		const brandText = document.createElement('span');
		brandText.textContent = this.brandLabel;
		brandText.className = 'top-nav__link top-nav__link--brand';

		left.appendChild(brandText);

		const right = document.createElement('div');
		right.className = 'top-nav__section top-nav__section--right';

		const websiteLink = document.createElement('a');
		websiteLink.href = this.websiteHref;
		websiteLink.textContent = this.websiteLabel;
		websiteLink.className = 'top-nav__link';

		const githubLink = document.createElement('a');
		githubLink.href = this.githubHref;
		githubLink.textContent = this.githubLabel;
		githubLink.className = 'top-nav__link';

		right.appendChild(websiteLink);
		right.appendChild(githubLink);

		nav.appendChild(left);
		nav.appendChild(right);

		if (root === document.body) {
			root.prepend(nav);
			return;
		}

		root.replaceChildren(nav);
	}
}

window.addEventListener('DOMContentLoaded', () => {
	const topNav = new TopNav();
	topNav.render();
});