class HeaderComponent {
	constructor(config) {
		this.rootSelector = config.rootSelector || '#header-component-root';
		this.imageSrc = config.imageSrc || 'images/wires3.JPG';
		this.imageAlt = config.imageAlt || '';
		this.headline = config.headline || '';
		this.subheadline = config.subheadline || '';
		this.byline = config.byline || '';
	}

	render() {
		const root = document.querySelector(this.rootSelector);
		if (!root) {
			console.error(`Header root not found: ${this.rootSelector}`);
			return;
		}

		const header = document.createElement('header');
		header.className = 'storyHeader';

		const media = document.createElement('div');
		media.className = 'storyHeader__media';

		const image = document.createElement('img');
		image.src = this.imageSrc;
		image.alt = this.imageAlt;
		media.appendChild(image);

		const content = document.createElement('div');
		content.className = 'storyHeader__content';

		const h1 = document.createElement('h1');
		h1.innerHTML = this.headline;

		const h2 = document.createElement('h2');
		h2.style.paddingTop = '10px';
		h2.textContent = this.subheadline;

		const h3 = document.createElement('h3');
		h3.style.paddingTop = '5px';
		h3.innerHTML = this.byline;

		content.appendChild(h1);
		content.appendChild(h2);
		content.appendChild(h3);

		header.appendChild(media);
		header.appendChild(content);
		root.replaceChildren(header);
	}
}

window.addEventListener('DOMContentLoaded', () => {
	const headerComponent = new HeaderComponent({
		imageSrc: 'images/wires3.JPG',
		imageAlt: 'Utility wires pass through the branches of a tree. Some appear to be caught in the branches.',
		headline: 'Marine Park residents have complained about <span style="color:#302a03;">tree maintenance</span> for years. Are parks officials listening?',
		subheadline: 'A new data investigation reveals that the neighborhood ranks first in tree service requests. Residents worry the city is overlooking risks to safety and property.',
		byline: 'By <strong><a href="https://jackwalker.xyz">Jack Walker</a></strong> | May TK, 2026'
	});

	headerComponent.render();
});