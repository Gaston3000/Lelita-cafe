// Interacciones para menú móvil y dropdown accesible
document.addEventListener('DOMContentLoaded', () => {
	const nav = document.getElementById('primary-nav');
	const menuToggle = document.querySelector('.menu-toggle');
	const dropdownToggle = document.querySelector('.dropdown-toggle');
	const submenu = document.getElementById('submenu-carta');
	const langToggle = document.querySelector('[data-lang-toggle]');
	const langMenu = document.querySelector('[data-lang-menu]');
	const langCode = document.querySelector('[data-lang-code]');
	const langOptions = document.querySelectorAll('[data-lang-option]');
	const accordionToggles = document.querySelectorAll('.accordion-toggle');
	const header = document.querySelector('.site-header');
	// Solo enlaces (excluye el botón .dropdown-toggle)
	const links = document.querySelectorAll('a.nav-link, a.submenu-link');
	const root = document.documentElement;
	const galleries = document.querySelectorAll('[data-gallery]');
	const body = document.body;
	// Devuelve la URL WebP equivalente a un src .jpg/.jpeg/.png, si aplica.
	const getWebpSrc = (src) => {
		if (!src) return null;
		const m = src.match(/^(.*)\.(jpe?g|png)(\?.*)?$/i);
		if (!m) return null;
		return `${m[1]}.webp${m[3] || ''}`;
	};

	// ---- Lightbox (ver imagen en primer plano, con detalle de plato opcional) ----
	let lightboxEl = null;
	let lightboxDialog = null;
	let lightboxImg = null;
	let lightboxSource = null;
	let lightboxInfo = null;
	let lightboxTitle = null;
	let lightboxDesc = null;
	let lightboxPrice = null;
	let lightboxCloseBtn = null;
	let lightboxLastFocus = null;

	const isLightboxOpen = () => Boolean(lightboxEl && !lightboxEl.hasAttribute('hidden'));

	const ensureLightbox = () => {
		if (lightboxEl) return;

		lightboxEl = document.createElement('div');
		lightboxEl.className = 'lightbox-backdrop';
		lightboxEl.setAttribute('hidden', '');

		lightboxDialog = document.createElement('div');
		lightboxDialog.className = 'lightbox-dialog';
		lightboxDialog.setAttribute('role', 'dialog');
		lightboxDialog.setAttribute('aria-modal', 'true');
		lightboxDialog.setAttribute('aria-label', 'Detalle ampliado');

		lightboxCloseBtn = document.createElement('button');
		lightboxCloseBtn.type = 'button';
		lightboxCloseBtn.className = 'lightbox-close';
		lightboxCloseBtn.setAttribute('aria-label', 'Cerrar');
		lightboxCloseBtn.innerHTML = '<span aria-hidden="true">×</span>';

		const media = document.createElement('div');
		media.className = 'lightbox-media';
		const picture = document.createElement('picture');
		lightboxSource = document.createElement('source');
		lightboxSource.type = 'image/webp';
		lightboxImg = document.createElement('img');
		lightboxImg.className = 'lightbox-image';
		lightboxImg.alt = '';
		lightboxImg.decoding = 'async';
		picture.appendChild(lightboxSource);
		picture.appendChild(lightboxImg);
		media.appendChild(picture);

		lightboxInfo = document.createElement('div');
		lightboxInfo.className = 'lightbox-info';
		lightboxTitle = document.createElement('h3');
		lightboxTitle.className = 'lightbox-title';
		lightboxDesc = document.createElement('p');
		lightboxDesc.className = 'lightbox-desc';
		lightboxPrice = document.createElement('div');
		lightboxPrice.className = 'lightbox-price';
		lightboxInfo.appendChild(lightboxTitle);
		lightboxInfo.appendChild(lightboxDesc);
		lightboxInfo.appendChild(lightboxPrice);

		lightboxDialog.appendChild(lightboxCloseBtn);
		lightboxDialog.appendChild(media);
		lightboxDialog.appendChild(lightboxInfo);
		lightboxEl.appendChild(lightboxDialog);
		body.appendChild(lightboxEl);

		const close = () => {
			if (!isLightboxOpen()) return;
			lightboxEl.setAttribute('hidden', '');
			root.classList.remove('has-lightbox-open');
			body.classList.remove('has-lightbox-open');
			lightboxImg.removeAttribute('src');
			lightboxImg.alt = '';
			if (lightboxSource) lightboxSource.removeAttribute('srcset');
			if (lightboxLastFocus && typeof lightboxLastFocus.focus === 'function') {
				lightboxLastFocus.focus();
			}
			lightboxLastFocus = null;
		};

		lightboxCloseBtn.addEventListener('click', close);
		lightboxEl.addEventListener('click', (event) => {
			// Click afuera del diálogo cierra
			if (event.target === lightboxEl) close();
		});

		lightboxEl.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				close();
			}
		});

		// Exponer cierre para el handler global
		lightboxEl._lelitaClose = close;
	};

	const openLightbox = (sourceImg) => {
		if (!sourceImg) return;
		ensureLightbox();
		const overrideSrc = sourceImg.dataset.lightboxSrc || sourceImg.getAttribute('data-lightbox-src');
		const src = overrideSrc || sourceImg.currentSrc || sourceImg.src;
		if (!src) return;

		lightboxLastFocus = document.activeElement;
		lightboxImg.src = src;
		lightboxImg.alt = sourceImg.alt || '';
		if (lightboxSource) {
			const webp = getWebpSrc(src);
			if (webp) {
				lightboxSource.srcset = webp;
			} else {
				lightboxSource.removeAttribute('srcset');
			}
		}

		// Si proviene de una dish-card, mostramos nombre/desc/precio como detalle premium.
		const dishCard = sourceImg.closest?.('.dish-card');
		if (dishCard && lightboxInfo) {
			const name = dishCard.querySelector('.dish-name')?.textContent?.trim() || '';
			const desc = dishCard.querySelector('.dish-desc')?.textContent?.trim() || '';
			const price = dishCard.querySelector('.dish-price')?.textContent?.trim() || '';
			lightboxTitle.textContent = name;
			lightboxTitle.hidden = !name;
			lightboxDesc.textContent = desc;
			lightboxDesc.hidden = !desc;
			lightboxPrice.textContent = price;
			lightboxPrice.hidden = !price;
			const hasAny = !!(name || desc || price);
			lightboxInfo.hidden = !hasAny;
			lightboxDialog?.classList.toggle('has-info', hasAny);
			lightboxDialog?.setAttribute('aria-label', hasAny ? `Detalle de ${name || 'plato'}` : 'Imagen ampliada');
		} else if (lightboxInfo) {
			lightboxInfo.hidden = true;
			lightboxDialog?.classList.remove('has-info');
			lightboxDialog?.setAttribute('aria-label', 'Imagen ampliada');
		}

		lightboxEl.removeAttribute('hidden');
		root.classList.add('has-lightbox-open');
		body.classList.add('has-lightbox-open');
		lightboxCloseBtn?.focus?.();
	};

	const closeLightbox = () => {
		if (!isLightboxOpen()) return false;
		lightboxEl?._lelitaClose?.();
		return true;
	};

	const initLightboxTargets = () => {
		// 1) Imágenes dentro de .gallery-figure: click directo en la foto.
		const galleryImgs = document.querySelectorAll('.gallery-figure img');
		galleryImgs.forEach((img) => {
			if (img.dataset.lightboxReady === 'true') return;
			img.dataset.lightboxReady = 'true';
			img.classList.add('lightboxable');
			if (!img.hasAttribute('tabindex')) img.tabIndex = 0;
			if (!img.hasAttribute('role')) img.setAttribute('role', 'button');
			if (!img.hasAttribute('aria-label')) {
				const label = img.alt ? `Ver imagen: ${img.alt}` : 'Ver imagen';
				img.setAttribute('aria-label', label);
			}
			img.addEventListener('click', (event) => {
				event.preventDefault();
				openLightbox(img);
			});
			img.addEventListener('keydown', (event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					openLightbox(img);
				}
			});
		});

		// 2) Dish-cards con foto: todo el card es clickeable (no solo la foto),
		//    para que se abra el detalle (foto + nombre + descripción + precio).
		const dishCards = document.querySelectorAll('.dish-card');
		dishCards.forEach((card) => {
			if (card.dataset.lightboxReady === 'true') return;
			const img = card.querySelector('.dish-media img');
			if (!img) return;
			card.dataset.lightboxReady = 'true';
			img.classList.add('lightboxable');
			// El card actúa como botón. La foto queda con cursor zoom-in por CSS.
			if (!card.hasAttribute('tabindex')) card.tabIndex = 0;
			if (!card.hasAttribute('role')) card.setAttribute('role', 'button');
			const name = card.querySelector('.dish-name')?.textContent?.trim();
			const ariaLabel = name ? `Ver detalle de ${name}` : 'Ver detalle del plato';
			if (!card.hasAttribute('aria-label')) card.setAttribute('aria-label', ariaLabel);

			card.addEventListener('click', (event) => {
				// Evitar que el click en un <a> u otro control dentro del card dispare el modal.
				if (event.target.closest('a, button')) return;
				event.preventDefault();
				openLightbox(img);
			});
			card.addEventListener('keydown', (event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					openLightbox(img);
				}
			});
		});
	};

	let lastHeaderHeight = 0;
	const updateHeaderHeight = () => {
		if (!header) return;
		const height = header.offsetHeight;
		if (height === lastHeaderHeight) return;
		lastHeaderHeight = height;
		root.style.setProperty('--header-height', `${height}px`);
	};

	updateHeaderHeight();
	window.addEventListener('load', updateHeaderHeight, { once: true });
	window.addEventListener('resize', updateHeaderHeight);
	if (header && typeof ResizeObserver !== 'undefined') {
		const headerObserver = new ResizeObserver(() => updateHeaderHeight());
		headerObserver.observe(header);
	}

	// ---- Header: estado top vs scrolled ----
	const updateHeaderState = () => {
		if (!header) return;
		const scrollTop = Math.max(window.scrollY || 0, document.documentElement.scrollTop || 0);
		const atTop = scrollTop <= 2;
		const wasAtTop = header.classList.contains('is-at-top');
		if (wasAtTop === atTop) return;
		header.classList.toggle('is-at-top', atTop);
		header.classList.toggle('is-scrolled', !atTop);
		updateHeaderHeight();
	};

	updateHeaderState();
	window.addEventListener('scroll', updateHeaderState, { passive: true });

	// ---- Performance: hints para imágenes ----
	// Mantiene el logo/hero como prioridad y aplica lazy al resto.
	const images = document.querySelectorAll('img');
	images.forEach((img) => {
		if (!img.hasAttribute('decoding')) {
			img.decoding = 'async';
		}

		if (!img.hasAttribute('loading')) {
			const isInHeader = Boolean(img.closest('.site-header'));
			const isHero = img.classList.contains('lead-media') || Boolean(img.closest('.section-hero'));
			if (!isInHeader && !isHero) {
				img.loading = 'lazy';
			}
		}
	});

	// ---- Feedback táctil: pressed state ----
	const pressables = document.querySelectorAll('.pill-link, .nav-link, .submenu-link, .menu-toggle, .dropdown-toggle, .accordion-toggle, .lang-toggle, .lang-option, .location-link, .reviews-link, .action-link, .menu-card-link, .hero-cta__btn');
	const addPressedHandlers = (el) => {
		const add = () => el.classList.add('is-pressed');
		const remove = () => el.classList.remove('is-pressed');
		el.addEventListener('pointerdown', add);
		el.addEventListener('pointerup', remove);
		el.addEventListener('pointerleave', remove);
		el.addEventListener('pointercancel', remove);
	};
	pressables.forEach(addPressedHandlers);

	// ---- Scroll reveal (sutil) ----
	const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
	const revealItems = Array.from(
		document.querySelectorAll('.section-hero:not(.section-hero--about), .section-hero--about .lead-body > :not(.about-heading), .dish-card, .location-card, .reviews-card, .menu-card, .menus-text')
	);

	const isInViewport = (el) => {
		const rect = el.getBoundingClientRect();
		return rect.top < window.innerHeight * 0.95 && rect.bottom > 0;
	};

	if (revealItems.length) {
		revealItems.forEach((el, index) => {
			el.classList.add('reveal');

			if (el.matches('.section-hero--about .lead-body > :not(.about-heading)')) {
				const i = Array.prototype.indexOf.call(el.parentElement.children, el);
				el.style.setProperty('--reveal-delay', `${i * 180}ms`);
				return;
			}

			if (el.matches('.menus-text')) {
				el.style.setProperty('--reveal-delay', '90ms');
				return;
			}

			if (index < 12) {
				el.style.setProperty('--reveal-delay', `${Math.min(index * 45, 240)}ms`);
			}
		});

		if (reduceMotion || !('IntersectionObserver' in window)) {
			revealItems.forEach((el) => el.classList.add('is-visible'));
		} else {
			// Evita parpadeos: lo que ya está en pantalla se marca visible al instante.
			revealItems.forEach((el) => {
				if (isInViewport(el)) el.classList.add('is-visible');
			});

			const observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (!entry.isIntersecting) return;
						entry.target.classList.add('is-visible');
						observer.unobserve(entry.target);
					});
				},
				{ threshold: 0.12, rootMargin: '0px 0px -10% 0px' }
			);

			revealItems.forEach((el) => {
				if (!el.classList.contains('is-visible')) observer.observe(el);
			});
		}
	}

	// ---- Video hero: respeta prefers-reduced-motion y Data Saver ----
	// Si el usuario prefiere menos movimiento o pidio ahorro de datos,
	// cancelamos autoplay y bajamos el preload para no descargar el MP4.
	const heroVideo = document.querySelector('.hero-video');
	if (heroVideo) {
		const saveData = !!(navigator.connection && navigator.connection.saveData);
		if (reduceMotion || saveData) {
			heroVideo.removeAttribute('autoplay');
			heroVideo.autoplay = false;
			heroVideo.preload = 'none';
			heroVideo.controls = true;
			try { heroVideo.pause(); } catch (_) { /* ignore */ }
		}
	}

	// ---- Mapa Lelita (Leaflet + tile cálido + pin café) ----
	// Reemplaza el iframe de Google Maps por un mapa interactivo con tono
	// desaturado/sepia y un pin temático (taza de café) en vez del globo rojo.
	const initLelitaMap = () => {
		const host = document.getElementById('lelita-map');
		if (!host || !window.L) return;
		if (host.dataset.lelitaReady === '1') return;
		host.dataset.lelitaReady = '1';

		const lat = parseFloat(host.dataset.lelitaLat || '-34.5942');
		const lng = parseFloat(host.dataset.lelitaLng || '-58.4284');
		const zoom = parseInt(host.dataset.lelitaZoom || '16', 10);

		const map = window.L.map(host, {
			zoomControl: false,
			attributionControl: true,
			scrollWheelZoom: false,
			dragging: !('ontouchstart' in window) ? true : true,
			tap: true,
			touchZoom: 'center',
			doubleClickZoom: 'center',
		}).setView([lat, lng], zoom);

		// OpenStreetMap (sin API key). CARTO pasó a exigir key y mostraba "API KEY REQUIRED".
		// El tono cálido lo da el filtro CSS de .location-map__canvas.
		window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
			maxZoom: 19,
		}).addTo(map);

		window.L.control.zoom({ position: 'bottomright' }).addTo(map);

		// Pin con el café PERFECTAMENTE centrado en el disco crema.
		// Truco: todo el glyph (vapor, taza, platito) usa transform="translate(26 22)"
		// y las coordenadas son simétricas respecto de x=0 → queda a eje del pin.
		const svg = `
			<span class="lelita-pin__pulse" aria-hidden="true"></span>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 66" aria-hidden="true">
				<defs>
					<radialGradient id="lelitaPinBg" cx="50%" cy="42%" r="58%">
						<stop offset="0" stop-color="#faf1e3"/>
						<stop offset="1" stop-color="#e7d5b8"/>
					</radialGradient>
				</defs>
				<!-- Gota / pin -->
				<path d="M26 2C14.4 2 5 11.2 5 22.6c0 7.2 4.7 13.6 10.6 21.3 4.9 6.4 8.4 12 9.1 14.4a1.3 1.3 0 0 0 2.6 0c.7-2.4 4.2-8 9.1-14.4C42.3 36.2 47 29.8 47 22.6 47 11.2 37.6 2 26 2Z" fill="#565c43" stroke="#3a3f29" stroke-width="1.1"/>
				<!-- Disco crema centrado -->
				<circle cx="26" cy="22" r="13" fill="url(#lelitaPinBg)"/>
				<!-- Glyph café — bowl agrandado + asa ajustada + 3 volutas (central más alta), centrado en el disco crema -->
				<g transform="translate(26 22)" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="#565c43">
					<!-- Vapor izquierdo (corto) -->
					<path d="M -4 -4 q 1.4 -0.9 0 -1.8 q -1.4 -0.9 0 -1.8" stroke-width="1.6"/>
					<!-- Vapor central (más alto) -->
					<path d="M 0 -4 q 1.5 -0.9 0 -1.8 q -1.5 -0.9 0 -1.8 q 1.5 -0.9 0 -1.8" stroke-width="1.6"/>
					<!-- Vapor derecho (corto) -->
					<path d="M 4 -4 q 1.4 -0.9 0 -1.8 q -1.4 -0.9 0 -1.8" stroke-width="1.6"/>
					<!-- Taza: pared recta + fondo redondeado (para que el asa no quede torcida) -->
					<path d="M -7.5 -3 h 15 v 7 a 7.5 3.5 0 0 1 -15 0 z" fill="#565c43" stroke="none"/>
					<!-- Asa hueca, flush con la pared recta -->
					<path d="M 7.5 -0.5 c 3.5 0 3.5 5 0 5" stroke-width="1.9"/>
				</g>
			</svg>
		`;

		const icon = window.L.divIcon({
			className: 'lelita-pin',
			html: svg,
			iconSize: [52, 66],
			iconAnchor: [26, 62],
			popupAnchor: [0, -52],
		});

		window.L.marker([lat, lng], {
			icon: icon,
			title: 'Cafetería Lelita — Aráoz 1186',
			alt: 'Ubicación de Cafetería Lelita',
			keyboard: true,
			riseOnHover: true,
		})
			.addTo(map)
			.bindPopup('<strong>Cafetería Lelita</strong><br>Aráoz 1186, Palermo Soho');

		host.classList.add('is-ready');
		const skeleton = host.parentElement && host.parentElement.querySelector('.location-map__skeleton');
		if (skeleton) {
			skeleton.style.transition = 'opacity 320ms ease';
			skeleton.style.opacity = '0';
			setTimeout(() => { skeleton.remove(); }, 360);
		}

		// Recalibrar tamaño tras el primer layout / cambios de orientación.
		setTimeout(() => { try { map.invalidateSize(); } catch (_) {} }, 120);
		window.addEventListener('resize', () => {
			try { map.invalidateSize(); } catch (_) {}
		});
	};

	if (window.L) {
		initLelitaMap();
	} else {
		// Leaflet se carga con `defer`; si todavía no existe, esperamos al load.
		window.addEventListener('load', initLelitaMap, { once: true });
	}

	const LANG_STORAGE_KEY = 'lelita-lang';
	const LANG_META = {
		es: { code: 'ESP', flagClass: 'flag--ar' },
		en: { code: 'ENG', flagClass: 'flag--us' },
		pt: { code: 'POR', flagClass: 'flag--br' },
	};

	const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();

	const TITLES = {
		'index.html': {
			es: 'Cafetería Lelita — Carta Digital',
			en: 'Lelita Café — Digital Menu',
			pt: 'Café Lelita — Cardápio Digital',
		},
		'privacy.html': {
			es: 'Cafeteria Lelita — Politica de privacidad',
			en: 'Lelita Cafe — Privacy Policy',
			pt: 'Cafeteria Lelita — Politica de privacidade',
		},
		'lunch.html': {
			es: 'Cafetería Lelita — Lunch',
			en: 'Lelita Café — Lunch',
			pt: 'Café Lelita — Almoço',
		},
		'infusiones.html': {
			es: 'Cafetería Lelita — Infusiones',
			en: 'Lelita Café — Drinks',
			pt: 'Café Lelita — Bebidas',
		},
		'brunch.html': {
			es: 'Cafetería Lelita — Brunch',
			en: 'Lelita Café — Brunch',
			pt: 'Café Lelita — Brunch',
		},
		'tortas.html': {
			es: 'Cafetería Lelita — Tortas',
			en: 'Lelita Café — Cakes',
			pt: 'Café Lelita — Bolos',
		},
	};

	const TEXT_TRANSLATIONS = {
		en: {
			// Navegación / UI
			'Inicio': 'Home',
			'Hacer una reserva': 'Make a reservation',
			'Reservaciones': 'Reservations',
			'Nuestra historia': 'Our story',
			'Infusiones': 'Drinks',
			'Tortas': 'Cakes',
			'Sobre nosotros': 'About us',
			'Nuestra ubicación': 'Our location',
			'Gracias por elegir Lelita': 'Thanks for choosing Lelita',
			'Lunch': 'Lunch',
			'Brunch': 'Brunch',
			'Horarios': 'Hours',
			'Lunes a viernes de 8 a 20 hrs': 'Mon–Fri 8am–8pm',
			'Sábados y domingos de 9 a 20 hrs': 'Sat–Sun 9am–8pm',
			'Seguinos también en nuestras redes sociales': 'Follow us on our social media',
			'Instagram de Lelita': 'Lelita on Instagram',
			'TikTok de Lelita': 'Lelita on TikTok',
			'Ver en Google Maps': 'View on Google Maps',
			'Ver ubicación de Cafetería Lelita en Google Maps': 'View Cafetería Lelita location on Google Maps',
			'Aráoz 1186, Cdad. Autónoma de Buenos Aires, Argentina.': 'Aráoz 1186, Buenos Aires, Argentina.',
			'Tu navegador no soporta video HTML5.': 'Your browser does not support HTML5 video.',

			// Opiniones (home)
			'Opiniones en Google': 'Google reviews',
			'Mirá qué dicen quienes ya vinieron a Lelita. Las reseñas se actualizan en Google.': 'See what people who have visited Lelita say. Reviews are updated on Google.',
			'Deslizá para ver más →': 'Swipe to see more →',
			'Ver reseñas': 'See reviews',
			'Opiniones destacadas': 'Featured reviews',
			'Ver reseñas de Cafetería Lelita en Google': 'View Cafetería Lelita reviews on Google',
			'4,8 estrellas (226 opiniones)': '4.8 stars (226 reviews)',

			// Politica de privacidad
			'Politica de privacidad': 'Privacy policy',
			'Titulo de seccion decorado': 'Decorated section title',
			'Contenido legal': 'Legal content',
			'Compromiso con tu privacidad': 'Our commitment to your privacy',
			'Esta politica describe como Cafeteria Lelita recopila y usa datos cuando navegas por esta web.': 'This policy explains how Lelita Cafe collects and uses data when you browse this website.',
			'Ultima actualizacion: 14 de febrero de 2026.': 'Last updated: February 14, 2026.',
			'1. Responsable del tratamiento': '1. Data controller',
			'Responsable:': 'Controller:',
			'Cafeteria Lelita.': 'Lelita Cafe.',
			'Domicilio:': 'Address:',
			'Araoz 1186, Cdad. Autonoma de Buenos Aires, Argentina.': 'Araoz 1186, Buenos Aires, Argentina.',
			'Email de contacto:': 'Contact email:',
			'Dominio:': 'Domain:',
			'Razon social y CUIT:': 'Legal name and tax ID:',
			'No informado al momento.': 'Not available at this time.',
			'2. Alcance de esta politica': '2. Scope of this policy',
			'Esta politica aplica al sitio web de Cafeteria Lelita y a las interacciones que se realizan desde aqui, incluyendo el boton flotante de WhatsApp, el correo electronico y los enlaces a mapas o redes sociales.': 'This policy applies to the Cafeteria Lelita website and to interactions initiated here, including the WhatsApp floating button, email, and links to maps or social networks.',
			'3. Datos que recopilamos': '3. Data we collect',
			'Datos de navegacion:': 'Browsing data:',
			'informacion tecnica y estadistica (direccion IP, paginas vistas, tiempo de visita, dispositivo, navegador y pais aproximado).': 'technical and statistical information (IP address, pages viewed, time on site, device, browser, and approximate country).',
			'Datos de contacto:': 'Contact data:',
			'nombre, email, telefono y el contenido del mensaje que nos envias por email o WhatsApp.': 'name, email, phone number, and the message you send us by email or WhatsApp.',
			'Datos de consultas o reservas:': 'Inquiry or reservation data:',
			'fecha, horario, cantidad de personas u otra informacion que compartas de manera voluntaria por WhatsApp.': 'date, time, number of guests, or other information you voluntarily share via WhatsApp.',
			'4. Como obtenemos los datos': '4. How we obtain data',
			'De forma directa cuando nos escribis por email o WhatsApp.': 'Directly when you contact us by email or WhatsApp.',
			'De forma automatica por cookies y herramientas de analitica mientras navegas el sitio.': 'Automatically through cookies and analytics tools while you browse the site.',
			'5. Finalidades del tratamiento': '5. Purposes of processing',
			'Responder consultas, pedidos o reservas.': 'Respond to inquiries, requests, or reservations.',
			'Mostrar informacion de ubicacion del local y facilitar el contacto.': 'Show the location of the venue and facilitate contact.',
			'Medir el trafico y mejorar la experiencia del sitio.': 'Measure traffic and improve the site experience.',
			'Garantizar la seguridad del sitio y prevenir usos indebidos.': 'Ensure site security and prevent misuse.',
			'6. Bases legales': '6. Legal bases',
			'Tratamos los datos en base al consentimiento del usuario, el interes legitimo para mejorar la web y la atencion de consultas, y el cumplimiento de obligaciones legales cuando corresponda.': 'We process data based on user consent, our legitimate interest in improving the website and handling inquiries, and compliance with legal obligations when applicable.',
			'7. Cookies y tecnologias similares': '7. Cookies and similar technologies',
			'Usamos cookies de Google Analytics para medir el trafico del sitio de forma agregada; no las usamos para publicidad. Podes bloquearlas o borrarlas desde la configuracion de tu navegador.': 'We use Google Analytics cookies to measure site traffic in aggregate; we do not use them for advertising. You can block or delete them from your browser settings.',
			'8. Servicios de terceros': '8. Third-party services',
			'Google Analytics (GA4):': 'Google Analytics (GA4):',
			'nos ayuda a medir el trafico del sitio.': 'helps us measure site traffic.',
			'OpenStreetMap:': 'OpenStreetMap:',
			'muestra el mapa con la ubicacion del local. Los botones "Abrir en Maps" y "Como llegar" abren Google Maps.': 'shows the map with the venue location. The "Abrir en Maps" and "Como llegar" buttons open Google Maps.',
			'WhatsApp:': 'WhatsApp:',
			'al hacer clic en el boton, la conversacion ocurre en la plataforma de WhatsApp.': 'when you click the button, the conversation happens on the WhatsApp platform.',
			'Redes sociales:': 'Social media:',
			'enlaces a Instagram y TikTok.': 'links to Instagram and TikTok.',
			'Proveedor de hosting:': 'Hosting provider:',
			'puede registrar logs tecnicos para operar y proteger el sitio.': 'may record technical logs to operate and protect the site.',
			'Estos servicios pueden recopilar datos segun sus propias politicas de privacidad y, en algunos casos, tratar datos fuera de Argentina.': 'These services may collect data under their own privacy policies and, in some cases, process data outside Argentina.',
			'9. Conservacion': '9. Retention',
			'Los datos se conservan el tiempo necesario para cumplir las finalidades indicadas o segun obligaciones legales aplicables. Los mensajes enviados por WhatsApp o email se conservan mientras sean necesarios para la atencion de la consulta.': 'Data is retained for the time necessary to fulfill the purposes described or as required by applicable legal obligations. Messages sent via WhatsApp or email are kept for as long as needed to address the inquiry.',
			'10. Seguridad': '10. Security',
			'Aplicamos medidas razonables para proteger la informacion frente a accesos no autorizados, perdida o uso indebido.': 'We apply reasonable measures to protect information from unauthorized access, loss, or misuse.',
			'11. Derechos de las personas usuarias': '11. User rights',
			'Podes solicitar acceso, rectificacion, actualizacion o eliminacion de tus datos. Para ejercer tus derechos, escribinos a': 'You can request access, rectification, update, or deletion of your data. To exercise your rights, write to',
			'En Argentina, la Ley 25.326 protege los datos personales. La autoridad de control es la Agencia de Acceso a la Informacion Publica (AAIP):': 'In Argentina, Law 25.326 protects personal data. The supervisory authority is the Agency for Access to Public Information (AAIP):',
			'12. Menores de edad': '12. Minors',
			'Este sitio no esta dirigido a menores de 13 anos. Si sos menor, pedimos que consultes con una persona adulta responsable antes de compartir datos personales.': 'This site is not directed to minors under 13. If you are a minor, please consult with a responsible adult before sharing personal data.',
			'13. Imagenes y contenido': '13. Images and content',
			'Las fotos y contenidos publicados en esta web son propios o cuentan con autorizacion para su uso. Si detectas un contenido que vulnera derechos, contactanos para revisarlo.': 'Photos and content published on this website are owned by us or authorized for use. If you notice content that infringes rights, contact us so we can review it.',
			'14. Cambios en esta politica': '14. Changes to this policy',
			'Podemos actualizar esta politica. Si hay cambios relevantes, los publicaremos en esta misma pagina.': 'We may update this policy. If there are relevant changes, we will publish them on this page.',

			// Menús (home)
			'Nuestros menús': 'Our menus',
			'Elegí una sección para ver la carta.': 'Choose a section to view the menu.',
			'Secciones del menú': 'Menu sections',
			'Abrir menú de Brunch': 'Open Brunch menu',
			'Abrir menú de Lunch': 'Open Lunch menu',
			'Abrir menú de Infusiones': 'Open Drinks menu',
			'Abrir menú de Tortas': 'Open Cakes menu',
			'Infusiones': 'Drinks',
			'Tortas': 'Cakes',
			'Opciones especiales': 'Special options',
			'En la carta buscá estos símbolos junto al plato:': 'Look for these symbols on the menu:',
			'Platos señalados como': 'Dishes marked as',
			'Vegetariano': 'Vegetarian',
			'Sin TACC': 'Gluten free',
			'y': 'and',

			// Lunch
			'Nuestros almuerzos de temporada': 'Seasonal lunches',
			'Platos caseros con guarniciones frescas.': 'Homemade dishes with fresh sides.',
			'Promociones de Menú Ejecutivo': 'Executive menu promotions',
			'Combos cerrados para el almuerzo.': 'Set lunch combos.',
			'Promo 1': 'Promo 1',
			'Promo 2': 'Promo 2',
			'Plato principal + gaseosa o copa de vino + postre (budín de pan o brownie con helado) + café': 'Main course + soda or glass of wine + dessert (bread pudding or brownie with ice cream) + coffee',
			'Plato principal + gaseosa o copa de vino + postre (torta a elección) + café': 'Main course + soda or glass of wine + dessert (cake of choice) + coffee',
			'Ensaladas': 'Salads',
			'Bebidas sin alcohol': 'Non-alcoholic drinks',
			'Tragos': 'Cocktails',
			'Postres': 'Desserts',
			
			'Suprema': 'Chicken cutlet',
			'Pechuga de pollo rebozada y dorada, con guarnición del día o fritas.': 'Breaded and golden chicken breast, served with the side of the day or fries.',
			'Milanesa Napolitana': 'Neapolitan milanesa',
			'Milanesa dorada con salsa de tomate, jamón y queso gratinado, con guarnición del día o fritas.': 'Golden milanesa with tomato sauce, ham and melted cheese, served with the side of the day or fries.',
			'Canelón Mixto': 'Mixed cannelloni',
			'De verdura o pollo, gratinado con queso fundido. Salsa mixta, filetto o salsa blanca.': 'Spinach/vegetable or chicken, gratinéed with melted cheese. Mixed, tomato, or béchamel sauce.',
			'Milanesa de Berenjena': 'Eggplant milanesa',
			'Medallón de Lenteja': 'Lentil medallion',
			'Gratinado de lentejas especiado con muzzarella y queso azul.': 'Spiced lentil gratin with mozzarella and blue cheese.',
			'Papas Crunch': 'Crunchy fries',
			'Papas crocantes con panceta dorada.': 'Crispy fries with golden bacon.',
			'Picada para 2': 'Sharing board for two',
			'Jamón crudo, 3 tipos de quesos, bastones de muzzarella, jamón cocido, maní, aceitunas y tostadas.': 'Prosciutto, 3 cheeses, mozzarella sticks, cooked ham, peanuts, olives and toasts.',
			'Sándwich de Pollo': 'Chicken sandwich',
			'Pollo grillado, tomate, queso danbo, rúcula en pan ciabatta con aceite de oliva.': 'Grilled chicken, tomato, Danbo cheese and arugula on ciabatta with olive oil.',
			'Omelette': 'Omelette',
			'Jamón, queso, tomate y rúcula.': 'Ham, cheese, tomato and arugula.',
			'Omelette Vegetal': 'Veggie omelette',
			'Cebolla, espinaca, champiñones y queso tybo.': 'Onion, spinach, mushrooms and Tybo cheese.',
			'Tarta de Pollo y Puerro': 'Chicken & leek tart',
			'Tarta Cabutia y Muzzarella': 'Kabocha squash & mozzarella tart',
			'Tarta de Panceta y champiñones': 'Bacon & mushroom tart',
			'Tarta de Capresse': 'Caprese tart',

			'Chicken Mushroom': 'Chicken Mushroom',
			'Pollo grillado, palta, rúcula, tomate cherry, espinaca, portobello y queso en hebras.': 'Grilled chicken, avocado, arugula, cherry tomatoes, spinach, portobello and shredded cheese.',
			'Mediterránea': 'Mediterranean',
			'Aceitunas, mix de verdes, tomate cherry, cebolla morada, zucchini, queso danbo, huevo.': 'Olives, mixed greens, cherry tomatoes, red onion, zucchini, Danbo cheese, egg.',
			'Capuccina': 'Capuccina',
			'Lechuga capuccina, queso sardo, huevo mollet, cebolla, vinagreta, miel y aceite de oliva.': 'Capuccina lettuce, Sardo cheese, soft-boiled egg, onion, vinaigrette, honey and olive oil.',
			'Lelita': 'Lelita',
			'Rúcula, jamón crudo, uvas y queso sardo.': 'Arugula, prosciutto, grapes and Sardo cheese.',
			'Atún': 'Tuna',
			'Mix de verdes, atún, choclo, cebolla morada, tomate cherry, zanahoria rallada.': 'Mixed greens, tuna, corn, red onion, cherry tomatoes, grated carrot.',
			'Caesar': 'Caesar',
			'Lechuga francesa, pollo grillado, croûtons dorados, queso parmesano y aderezo Caesar casero.': 'Romaine lettuce, grilled chicken, golden croutons, parmesan and house Caesar dressing.',

			'Agua con o sin gas': 'Water (still or sparkling)',
			'Agua saborizada': 'Flavored water',
			'Sabores: Pera, uva y pomelo.': 'Flavors: pear, grape and grapefruit.',
			'Gaseosa linea coca': 'Soda (Coca-Cola line)',
			'Coca Cola, Sprite o Fanta': 'Coca-Cola, Sprite or Fanta',
			'Licuados': 'Fruit shakes',
			'Elección de una o 2 frutas.': 'Choose one or two fruits.',
			'Exprimido de Naranja': 'Fresh orange juice',
			'Naranja natural exprimida.': 'Freshly squeezed orange juice.',
			'Limonada': 'Lemonade',
			'Limón, menta fresca y jengibre.': 'Lemon, fresh mint and ginger.',
			'Limonada de Frutos Rojos': 'Red berry lemonade',
			'Limón, frutos rojos y miel.': 'Lemon, berries and honey.',
			'Passión': 'Passion',
			'Maracuyá, lima, naranja y jengibre.': 'Passion fruit, lime, orange and ginger.',
			'Pomelada': 'Grapefruitade',
			'Pomelo rosado, agua con gas, hielo y almíbar.': 'Pink grapefruit, sparkling water, ice and syrup.',
			'Smoothie de Ananá': 'Pineapple smoothie',
			'Smoothie de Frutilla': 'Strawberry smoothie',

			'Corona 330ml': 'Corona 330ml',
			'Patagonia 24/7': 'Patagonia 24/7',
			'Fernet branca con Coca Cola': 'Fernet Branca with Coca-Cola',
			'Gin de frutos rojos': 'Berry gin',
			'Gin de hibiscus': 'Hibiscus gin',
			'Gin de lima': 'Lime gin',
			'Aperol': 'Aperol',
			'Vermú': 'Vermouth',
			'Negroni': 'Negroni',
			'Campari': 'Campari',

			'Cheesecake': 'Cheesecake',
			'Con salsa de frutos rojos.': 'With red berry sauce.',
			'Brownie': 'Brownie',
			'Con helado.': 'With ice cream.',
			'Flan Casero': 'Homemade flan',
			'Con dulce de leche y crema.': 'With dulce de leche and cream.',
			'Tiramisú': 'Tiramisù',
			'Clásico italiano.': 'Classic Italian.',

			// Infusiones
			'Nuestras infusiones': 'Our drinks',
			'Calientes o frías, preparadas con granos seleccionados y sabores frescos.': 'Hot or iced, made with selected beans and fresh flavors.',
			'Negro': 'Black',
			'Con Leche': 'With milk',
			'Especiales': 'Specials',
			'Fríos': 'Iced',
			'Adicionales': 'Add-ons',
			'Milkshakes': 'Milkshakes',
			
			// Nombres de bebidas (se mantienen)
			'Aeropress': 'Aeropress',
			'Americano': 'Americano',
			'Berry': 'Berry',
			'Capuccino Italiano': 'Italian cappuccino',
			'Cold Brew': 'Cold brew',
			'Cortado': 'Cortado',
			'Descafeinado': 'Decaf',
			'Doppio': 'Doppio',
			'Espresso Tonic': 'Espresso tonic',
			'Expresso': 'Espresso',
			'Flat White': 'Flat white',
			'Lagrima': 'Milk with a drop of coffee',
			'Latte': 'Latte',
			'Latte Caramel': 'Caramel latte',
			'Latte Vainilla': 'Vanilla latte',
			'Lungo': 'Lungo',
			'Macchiato': 'Macchiato',
			'Magic': 'Magic',
			'Mocca': 'Mocha',
			'Oreo': 'Oreo',
			'Spanish Latte': 'Spanish latte',
			
			'25 a 30ml de extracción.': '25–30 ml extraction.',
			'55 a 60ml de extracción.': '55–60 ml extraction.',
			'Cama de agua y espresso.': 'Water base with espresso.',
			'Doble espresso y cama de agua.': 'Double espresso with water.',
			'Espresso y leche emulsionada.': 'Espresso and steamed milk.',
			'Doble Espresso y leche emulsionada.': 'Double espresso and steamed milk.',
			'Ristretto y espuma de leche.': 'Ristretto with milk foam.',
			'Ristretto y emulsionada.': 'Ristretto and steamed milk.',
			'Espresso, leche emulsionada y syrup de caramelo.': 'Espresso, steamed milk and caramel syrup.',
			'Espresso, leche emulsionada y syrup de vainilla.': 'Espresso, steamed milk and vanilla syrup.',
			'Espresso, leche emulsionada y Chocolate semiamargo.': 'Espresso, steamed milk and dark chocolate.',
			'Espresso, leche emulsionada, cacao y canela.': 'Espresso, steamed milk, cocoa and cinnamon.',
			'Espresso, leche condensada, leche emulsionada y cacao.': 'Espresso, condensed milk, steamed milk and cocoa.',
			'Doble espresso espumoso.': 'Foamy double espresso.',
			'Café molido infusionado en frío durante horas y leche emulsionada.': 'Ground coffee cold-infused for hours with steamed milk.',
			'Espresso, agua tónica y rodaja de naranja.': 'Espresso, tonic water and an orange slice.',
			'Cordial de arándanos, naranja y agua gasificada.': 'Blueberry cordial, orange and sparkling water.',
			'Consultar variedad.': 'Ask for available options.',
			'Té en saquitos / En hebras': 'Tea bags / Loose leaf',
			'Leche con almendras': 'Almond milk',
			'Leche Deslactosada': 'Lactose-free milk',
			'Adicional shot de cafe': 'Extra coffee shot',
			'Adicional de crema': 'Extra cream',
			'Dulce de Leche': 'Dulce de leche',
			'Frutos Rojos': 'Red berries',
			'Base de leche, caramelo, helado dulce de leche y crema.': 'Milk base, caramel, dulce de leche ice cream and cream.',
			'Base de leche, helado, galletita Oreo y syrup de caramelo.': 'Milk base, ice cream, Oreo cookies and caramel syrup.',
			'Base de leche, helado de frutos rojos y syrup de vainilla.': 'Milk base, berry ice cream and vanilla syrup.',

			// Brunch
			'Nuestros brunch de temporada': 'Seasonal brunch',
			'Disfrutá combinaciones frescas y abundantes para acompañar a tu café.': 'Enjoy fresh and hearty combinations to go with your coffee.',
			'Cookies': 'Cookies',
			'Bakery': 'Bakery',
			'Croissant': 'Croissant',
			'Croissants': 'Croissants',
			'Red Velvet': 'Red Velvet',
			
			'Pastelera y Frutillas': 'Pastry cream & strawberries',
			'Nutella y Almendras Tostadas': 'Nutella & toasted almonds',
			'Mediterráneo': 'Mediterranean',
			'Milano': 'Milano',
			'Diplomata': 'Diplomata',
			'Mushroom': 'Mushroom',
			'Relleno con jamón crudo, tomate y rúcula': 'Filled with prosciutto, tomato and arugula.',
			'Relleno de crema mascarpone, aromatizada con café y cerezas en almíbar': 'Mascarpone cream flavored with coffee and cherries in syrup.',
			'Rellena con crema pastelera de frutos rojos, naranjas a vivo, y frutillas frescas.': 'Filled with berry pastry cream, fresh orange segments and fresh strawberries.',
			'Salsa bechamel, espinaca, champiñones salteados y huevo poché.': 'Béchamel, spinach, sautéed mushrooms and poached egg.',
			'Avocado': 'Avocado',
			'Tostón con base de queso crema, palta, cherrys confitados, huevo pochado y brotes de soja.': 'Toast with cream cheese, avocado, confit cherry tomatoes, poached egg and sprouts.',
			'Salmón Gravlax': 'Gravlax salmon',
			'Tostón con queso cremoso cítrico, salmón curado al estilo gravlax, palta laminada y huevo poché.': 'Toast with citrus cream cheese, gravlax-style cured salmon, sliced avocado and poached egg.',
			'Huevo de Campo': 'Farm eggs',
			'Tostón con base de queso crema, huevos revueltos, y panceta ahumada.': 'Toast with cream cheese, scrambled eggs and smoked bacon.',
			'Croque Madame': 'Croque Madame',
			'Torre de brioche dorado con jamón, queso, salsa bechamel y huevo a la plancha.': 'Golden brioche stack with ham, cheese, béchamel sauce and a fried egg.',
			'Baguel Lelita': 'Lelita bagel',
			'Baguel de sésamo, con base de queso crema, palta, huevo revuelto, y panceta ahumada.': 'Sesame bagel with cream cheese, avocado, scrambled egg and smoked bacon.',
			'Tostadas Masa Madre/Integral': 'Sourdough/whole wheat toast',
			'Pan de masa madre, con casuela de queso crema y mermelada de la casa.': 'Sourdough bread with a side of cream cheese and homemade jam.',
			'Tostado Mixto': 'Ham & cheese toastie',
			'Tostado de Jamón y Queso, en pan árabe (Podés pedirlo con la salsa Lelita).': 'Ham and cheese toastie on pita bread (you can ask for Lelita sauce).',
			'Yogurt con Granola': 'Yogurt with granola',
			'Yogurt natural endulzado con variedad de frutas de estación y granola de la casa.': 'Sweetened natural yogurt with seasonal fruit and house granola.',
			'Salmón Baguel': 'Salmon bagel',
			'Baguel con base de queso cremoso cítrico, salmón curado, palta y huevo poché.': 'Bagel with citrus cream cheese, cured salmon, avocado and poached egg.',
			'Costero': 'Coastal',
			'Sándwich en pan brioche con paté de pesca, huevo cocido y tomates cherrys.': 'Brioche sandwich with fish pâté, hard-boiled egg and cherry tomatoes.',
			'Sándwich de pan ciabatta, rociado con oliva relleno con jamón, queso, tomate, rúcula y salsa Lelita.': 'Ciabatta sandwich drizzled with olive oil, filled with ham, cheese, tomato, arugula and Lelita sauce.',
			
			'Vainilla y Nutella': 'Vanilla & Nutella',
			'Chocolate y Dulce de Leche': 'Chocolate & dulce de leche',
			'Pistacho y Chocolate Blanco': 'Pistachio & white chocolate',
			'Alfajor de Maicena': 'Cornstarch alfajor',
			'Alfajor de Pistacho': 'Pistachio alfajor',
			'Alfajor de Almendras': 'Almond alfajor',
			'Alfajor de Chocolate': 'Chocolate alfajor',
			'Relleno con chocolate blanco, pistacho y un corazón de frambuesa.': 'Filled with white chocolate, pistachio and a raspberry heart.',
			'Budín Marmolado': 'Marble loaf cake',
			'Budín de Limón y Arándanos': 'Lemon & blueberry loaf cake',
			'Budín de Banana y Nuez': 'Banana & walnut loaf cake',
			'Pan de Chocolate': 'Chocolate bread',
			'Roll de Manzana/ Canela': 'Apple/Cinnamon roll',
			'Medialuna': 'Medialuna',
			'Scon de Arándanos': 'Blueberry scone',
			'Scon de Parmesano': 'Parmesan scone',
			'Dolci de Pistacho': 'Pistachio dolci',
			'Masa quebrada de cacao amargo, con ganache de pistacho, y frambuesa': 'Dark cocoa shortcrust with pistachio ganache and raspberry.',
			'Chipa': 'Chipa',
			'Albahaca, queso crema, aceituna, alcaparra, tomate cherry confitado y ralladura de limón.': 'Basil, cream cheese, olive, capers, confit cherry tomatoes and lemon zest.',
			'Chipa Relleno': 'Stuffed chipa',
			'Budín Parisino': 'Parisian loaf cake',
			'Brownie con helado': 'Brownie with ice cream',
			'Los sabores de helado son: crema americana, súper dulce de leche y mascarpone.': 'Ice cream flavors: vanilla cream, extra dulce de leche, and mascarpone.',
			'Crumble de manzana c/ crema o helado': 'Apple crumble with cream or ice cream',
			'Servido calentito.': 'Served warm.',
			
			// Tortas
			'Postres y tortas caseras': 'Homemade cakes & desserts',
			'Clásicos irresistibles para acompañar tu café.': 'Irresistible classics to go with your coffee.',
			'Cheesecake de Frutos Rojos': 'Red berry cheesecake',
			'Clásico, suave y cremoso, con mermelada de frutos rojos.': 'Classic, smooth and creamy, with red berry jam.',
			'Cheesecake Pistacho': 'Pistachio cheesecake',
			'Cremoso, con suave sabor a pistacho y mermelada de frutos rojos.': 'Creamy, with a delicate pistachio flavor and red berry jam.',
			'Bizcochuelo húmedo de chocolate con dulce de leche.': 'Moist chocolate cake with dulce de leche.',
			'Bizcochuelo de naranja, nuez y canela con frosting de queso crema.': 'Orange, walnut and cinnamon cake with cream cheese frosting.',
			'Cremoso de lima, base crocante y chantilly.': 'Creamy lime filling, crunchy base and whipped cream.',
			'Clásico argentino: Curd de limón y merengue italiano.': 'Argentinian classic: lemon curd and Italian meringue.',
			'Bizcochuelo húmedo, dulce de leche y frosting de queso crema.': 'Moist cake, dulce de leche and cream cheese frosting.',
			'Postre clásico, brownie de chocolate con dulce de leche y merengue italiano.': 'Classic dessert: chocolate brownie with dulce de leche and Italian meringue.',
			'Bizcochuelo rojo aterciopelado con frosting suave.': 'Velvety red cake with a smooth frosting.',
			'Cremoso de chocolate con avellanas e hilos de nutella.': 'Chocolate cream with hazelnuts and Nutella drizzle.',
		},
		pt: {
			// Navegación / UI
			'Inicio': 'Início',
			'Hacer una reserva': 'Fazer uma reserva',
			'Reservaciones': 'Reservas',
			'Nuestra historia': 'Nossa história',
			'Infusiones': 'Bebidas',
			'Tortas': 'Bolos',
			'Sobre nosotros': 'Sobre nós',
			'Nuestra ubicación': 'Nossa localização',
			'Gracias por elegir Lelita': 'Obrigado por escolher a Lelita',
			'Brunch': 'Brunch',
			'Lelita': 'Lelita',
			'Horarios': 'Horários',
			'Lunes a viernes de 8 a 20 hrs': 'Seg–Sex 8h–20h',
			'Sábados y domingos de 9 a 20 hrs': 'Sáb–Dom 9h–20h',
			'Seguinos también en nuestras redes sociales': 'Siga a gente também nas redes sociais',
			'Instagram de Lelita': 'Lelita no Instagram',
			'TikTok de Lelita': 'Lelita no TikTok',
			'Ver en Google Maps': 'Ver no Google Maps',
			'Ver ubicación de Cafetería Lelita en Google Maps': 'Ver a localização da Cafetería Lelita no Google Maps',
			'Aráoz 1186, Cdad. Autónoma de Buenos Aires, Argentina.': 'Aráoz 1186, Buenos Aires, Argentina.',
			'Tu navegador no soporta video HTML5.': 'Seu navegador não suporta vídeo HTML5.',

			// Opiniones (home)
			'Opiniones en Google': 'Avaliações no Google',
			'Mirá qué dicen quienes ya vinieron a Lelita. Las reseñas se actualizan en Google.': 'Veja o que dizem quem já veio à Lelita. As avaliações são atualizadas no Google.',
			'Deslizá para ver más →': 'Deslize para ver mais →',
			'Ver reseñas': 'Ver avaliações',
			'Opiniones destacadas': 'Avaliações em destaque',
			'Ver reseñas de Cafetería Lelita en Google': 'Ver avaliações da Cafetería Lelita no Google',
			'4,8 estrellas (226 opiniones)': '4,8 estrelas (226 avaliações)',

			// Politica de privacidad
			'Politica de privacidad': 'Politica de privacidade',
			'Titulo de seccion decorado': 'Titulo de secao decorado',
			'Contenido legal': 'Conteudo legal',
			'Compromiso con tu privacidad': 'Compromisso com sua privacidade',
			'Esta politica describe como Cafeteria Lelita recopila y usa datos cuando navegas por esta web.': 'Esta politica descreve como a Cafeteria Lelita coleta e usa dados quando voce navega neste site.',
			'Ultima actualizacion: 14 de febrero de 2026.': 'Ultima atualizacao: 14 de fevereiro de 2026.',
			'1. Responsable del tratamiento': '1. Responsavel pelo tratamento',
			'Responsable:': 'Responsavel:',
			'Cafeteria Lelita.': 'Cafeteria Lelita.',
			'Domicilio:': 'Endereco:',
			'Araoz 1186, Cdad. Autonoma de Buenos Aires, Argentina.': 'Araoz 1186, Buenos Aires, Argentina.',
			'Email de contacto:': 'Email de contato:',
			'Dominio:': 'Dominio:',
			'Razon social y CUIT:': 'Razao social e CUIT:',
			'No informado al momento.': 'Nao informado no momento.',
			'2. Alcance de esta politica': '2. Escopo desta politica',
			'Esta politica aplica al sitio web de Cafeteria Lelita y a las interacciones que se realizan desde aqui, incluyendo el boton flotante de WhatsApp, el correo electronico y los enlaces a mapas o redes sociales.': 'Esta politica se aplica ao site da Cafeteria Lelita e as interacoes feitas por aqui, incluindo o botao flutuante do WhatsApp, o email e os links para mapas ou redes sociais.',
			'3. Datos que recopilamos': '3. Dados que coletamos',
			'Datos de navegacion:': 'Dados de navegacao:',
			'informacion tecnica y estadistica (direccion IP, paginas vistas, tiempo de visita, dispositivo, navegador y pais aproximado).': 'informacao tecnica e estatistica (endereco IP, paginas vistas, tempo de visita, dispositivo, navegador e pais aproximado).',
			'Datos de contacto:': 'Dados de contato:',
			'nombre, email, telefono y el contenido del mensaje que nos envias por email o WhatsApp.': 'nome, email, telefone e o conteudo da mensagem que voce nos envia por email ou WhatsApp.',
			'Datos de consultas o reservas:': 'Dados de consultas ou reservas:',
			'fecha, horario, cantidad de personas u otra informacion que compartas de manera voluntaria por WhatsApp.': 'data, horario, numero de pessoas ou outra informacao que voce compartilha voluntariamente pelo WhatsApp.',
			'4. Como obtenemos los datos': '4. Como obtemos os dados',
			'De forma directa cuando nos escribis por email o WhatsApp.': 'Diretamente quando voce nos escreve por email ou WhatsApp.',
			'De forma automatica por cookies y herramientas de analitica mientras navegas el sitio.': 'De forma automatica por cookies e ferramentas de analitica enquanto voce navega no site.',
			'5. Finalidades del tratamiento': '5. Finalidades do tratamento',
			'Responder consultas, pedidos o reservas.': 'Responder consultas, pedidos ou reservas.',
			'Mostrar informacion de ubicacion del local y facilitar el contacto.': 'Mostrar a localizacao do estabelecimento e facilitar o contato.',
			'Medir el trafico y mejorar la experiencia del sitio.': 'Medir o trafego e melhorar a experiencia do site.',
			'Garantizar la seguridad del sitio y prevenir usos indebidos.': 'Garantir a seguranca do site e prevenir uso indevido.',
			'6. Bases legales': '6. Bases legais',
			'Tratamos los datos en base al consentimiento del usuario, el interes legitimo para mejorar la web y la atencion de consultas, y el cumplimiento de obligaciones legales cuando corresponda.': 'Tratamos os dados com base no consentimento do usuario, no interesse legitimo de melhorar o site e atender consultas, e no cumprimento de obrigacoes legais quando aplicavel.',
			'7. Cookies y tecnologias similares': '7. Cookies e tecnologias semelhantes',
			'Usamos cookies de Google Analytics para medir el trafico del sitio de forma agregada; no las usamos para publicidad. Podes bloquearlas o borrarlas desde la configuracion de tu navegador.': 'Usamos cookies do Google Analytics para medir o trafego do site de forma agregada; nao os usamos para publicidade. Voce pode bloquea-los ou apaga-los nas configuracoes do navegador.',
			'8. Servicios de terceros': '8. Servicos de terceiros',
			'Google Analytics (GA4):': 'Google Analytics (GA4):',
			'nos ayuda a medir el trafico del sitio.': 'nos ajuda a medir o trafego do site.',
			'OpenStreetMap:': 'OpenStreetMap:',
			'muestra el mapa con la ubicacion del local. Los botones "Abrir en Maps" y "Como llegar" abren Google Maps.': 'mostra o mapa com a localizacao do estabelecimento. Os botoes "Abrir en Maps" e "Como llegar" abrem o Google Maps.',
			'WhatsApp:': 'WhatsApp:',
			'al hacer clic en el boton, la conversacion ocurre en la plataforma de WhatsApp.': 'ao clicar no botao, a conversa ocorre na plataforma do WhatsApp.',
			'Redes sociales:': 'Redes sociais:',
			'enlaces a Instagram y TikTok.': 'links para Instagram e TikTok.',
			'Proveedor de hosting:': 'Provedor de hospedagem:',
			'puede registrar logs tecnicos para operar y proteger el sitio.': 'pode registrar logs tecnicos para operar e proteger o site.',
			'Estos servicios pueden recopilar datos segun sus propias politicas de privacidad y, en algunos casos, tratar datos fuera de Argentina.': 'Esses servicos podem coletar dados conforme suas proprias politicas de privacidade e, em alguns casos, tratar dados fora da Argentina.',
			'9. Conservacion': '9. Conservacao',
			'Los datos se conservan el tiempo necesario para cumplir las finalidades indicadas o segun obligaciones legales aplicables. Los mensajes enviados por WhatsApp o email se conservan mientras sean necesarios para la atencion de la consulta.': 'Os dados sao mantidos pelo tempo necessario para cumprir as finalidades indicadas ou conforme obrigacoes legais aplicaveis. As mensagens enviadas por WhatsApp ou email sao mantidas enquanto forem necessarias para atender a consulta.',
			'10. Seguridad': '10. Seguranca',
			'Aplicamos medidas razonables para proteger la informacion frente a accesos no autorizados, perdida o uso indebido.': 'Aplicamos medidas razoaveis para proteger as informacoes contra acessos nao autorizados, perda ou uso indevido.',
			'11. Derechos de las personas usuarias': '11. Direitos das pessoas usuarias',
			'Podes solicitar acceso, rectificacion, actualizacion o eliminacion de tus datos. Para ejercer tus derechos, escribinos a': 'Voce pode solicitar acesso, retificacao, atualizacao ou eliminacao dos seus dados. Para exercer seus direitos, escreva para',
			'En Argentina, la Ley 25.326 protege los datos personales. La autoridad de control es la Agencia de Acceso a la Informacion Publica (AAIP):': 'Na Argentina, a Lei 25.326 protege dados pessoais. A autoridade de controle e a Agencia de Acesso a Informacao Publica (AAIP):',
			'12. Menores de edad': '12. Menores de idade',
			'Este sitio no esta dirigido a menores de 13 anos. Si sos menor, pedimos que consultes con una persona adulta responsable antes de compartir datos personales.': 'Este site nao e direcionado a menores de 13 anos. Se voce for menor, pedimos que consulte uma pessoa adulta responsavel antes de compartilhar dados pessoais.',
			'13. Imagenes y contenido': '13. Imagens e conteudo',
			'Las fotos y contenidos publicados en esta web son propios o cuentan con autorizacion para su uso. Si detectas un contenido que vulnera derechos, contactanos para revisarlo.': 'As fotos e conteudos publicados neste site sao proprios ou autorizados para uso. Se voce identificar algum conteudo que viole direitos, entre em contato para analisarmos.',
			'14. Cambios en esta politica': '14. Mudancas nesta politica',
			'Podemos actualizar esta politica. Si hay cambios relevantes, los publicaremos en esta misma pagina.': 'Podemos atualizar esta politica. Se houver mudancas relevantes, publicaremos nesta mesma pagina.',

			// Menús (home)
			'Nuestros menús': 'Nossos menus',
			'Elegí una sección para ver la carta.': 'Escolha uma seção para ver o cardápio.',
			'Secciones del menú': 'Seções do cardápio',
			'Abrir menú de Brunch': 'Abrir menu de Brunch',
			'Abrir menú de Lunch': 'Abrir menu de Almoço',
			'Abrir menú de Infusiones': 'Abrir menu de Bebidas',
			'Abrir menú de Tortas': 'Abrir menu de Bolos',
			'Infusiones': 'Bebidas',
			'Tortas': 'Bolos',
			'Opciones especiales': 'Opções especiais',
			'En la carta buscá estos símbolos junto al plato:': 'No cardápio procure estes símbolos junto ao prato:',
			'Platos señalados como': 'Pratos sinalizados como',
			'Vegetariano': 'Vegetariano',
			'Sin TACC': 'Sem glúten',
			'y': 'e',
			
			// Lunch
			'Lunch': 'Almoço',
			'Nuestros almuerzos de temporada': 'Nossos almoços da temporada',
			'Platos caseros con guarniciones frescas.': 'Pratos caseiros com acompanhamentos frescos.',
			'Promociones de Menú Ejecutivo': 'Promoções do Menu Executivo',
			'Combos cerrados para el almuerzo.': 'Combos fechados para o almoço.',
			'Promo 1': 'Promo 1',
			'Promo 2': 'Promo 2',
			'Plato principal + gaseosa o copa de vino + postre (budín de pan o brownie con helado) + café': 'Prato principal + refrigerante ou taça de vinho + sobremesa (pudim de pão ou brownie com sorvete) + café',
			'Plato principal + gaseosa o copa de vino + postre (torta a elección) + café': 'Prato principal + refrigerante ou taça de vinho + sobremesa (bolo à escolha) + café',
			'Ensaladas': 'Saladas',
			'Bebidas sin alcohol': 'Bebidas sem álcool',
			'Tragos': 'Coquetéis',
			'Postres': 'Sobremesas',
			'Caesar': 'Caesar',
			
			'Suprema': 'Frango empanado',
			'Pechuga de pollo rebozada y dorada, con guarnición del día o fritas.': 'Peito de frango empanado e dourado, com acompanhamento do dia ou fritas.',
			'Milanesa Napolitana': 'Milanesa napolitana',
			'Milanesa dorada con salsa de tomate, jamón y queso gratinado, con guarnición del día o fritas.': 'Milanesa dourada com molho de tomate, presunto e queijo gratinado, com acompanhamento do dia ou fritas.',
			'Canelón Mixto': 'Canelone misto',
			'De verdura o pollo, gratinado con queso fundido. Salsa mixta, filetto o salsa blanca.': 'De legumes/verdura ou frango, gratinado com queijo. Molho misto, tomate (filetto) ou branco.',
			'Milanesa de Berenjena': 'Milanesa de berinjela',
			'Medallón de Lenteja': 'Medalhão de lentilha',
			'Gratinado de lentejas especiado con muzzarella y queso azul.': 'Gratinado de lentilhas temperadas com muçarela e queijo azul.',
			'Papas Crunch': 'Batatas crocantes',
			'Papas crocantes con panceta dorada.': 'Batatas crocantes com panceta dourada.',
			'Picada para 2': 'Tábua para 2',
			'Jamón crudo, 3 tipos de quesos, bastones de muzzarella, jamón cocido, maní, aceitunas y tostadas.': 'Presunto cru, 3 tipos de queijos, palitos de muçarela, presunto cozido, amendoim, azeitonas e torradas.',
			'Sándwich de Pollo': 'Sanduíche de frango',
			'Pollo grillado, tomate, queso danbo, rúcula en pan ciabatta con aceite de oliva.': 'Frango grelhado, tomate, queijo Danbo e rúcula no pão ciabatta com azeite.',
			'Omelette': 'Omelete',
			'Jamón, queso, tomate y rúcula.': 'Presunto, queijo, tomate e rúcula.',
			'Omelette Vegetal': 'Omelete de legumes',
			'Cebolla, espinaca, champiñones y queso tybo.': 'Cebola, espinafre, cogumelos e queijo Tybo.',
			'Tarta de Pollo y Puerro': 'Torta de frango e alho-poró',
			'Tarta Cabutia y Muzzarella': 'Torta de abóbora cabotiá e muçarela',
			'Tarta de Panceta y champiñones': 'Torta de panceta e cogumelos',
			'Tarta de Capresse': 'Torta caprese',

			'Chicken Mushroom': 'Frango com cogumelos',
			'Pollo grillado, palta, rúcula, tomate cherry, espinaca, portobello y queso en hebras.': 'Frango grelhado, abacate, rúcula, tomate-cereja, espinafre, portobello e queijo em fios.',
			'Mediterránea': 'Mediterrânea',
			'Aceitunas, mix de verdes, tomate cherry, cebolla morada, zucchini, queso danbo, huevo.': 'Azeitonas, mix de folhas, tomate-cereja, cebola roxa, abobrinha, queijo Danbo e ovo.',
			'Lechuga capuccina, queso sardo, huevo mollet, cebolla, vinagreta, miel y aceite de oliva.': 'Alface capuccina, queijo Sardo, ovo mollet, cebola, vinagrete, mel e azeite.',
			'Rúcula, jamón crudo, uvas y queso sardo.': 'Rúcula, presunto cru, uvas e queijo Sardo.',
			'Atún': 'Atum',
			'Mix de verdes, atún, choclo, cebolla morada, tomate cherry, zanahoria rallada.': 'Mix de folhas, atum, milho, cebola roxa, tomate-cereja e cenoura ralada.',
			'Lechuga francesa, pollo grillado, croûtons dorados, queso parmesano y aderezo Caesar casero.': 'Alface romana, frango grelhado, croutons dourados, parmesão e molho Caesar da casa.',

			'Agua con o sin gas': 'Água com ou sem gás',
			'Agua saborizada': 'Água saborizada',
			'Sabores: Pera, uva y pomelo.': 'Sabores: pera, uva e grapefruit.',
			'Gaseosa linea coca': 'Refrigerantes (linha Coca-Cola)',
			'Coca Cola, Sprite o Fanta': 'Coca-Cola, Sprite ou Fanta',
			'Licuados': 'Vitaminas',
			'Elección de una o 2 frutas.': 'Escolha de 1 ou 2 frutas.',
			'Exprimido de Naranja': 'Suco de laranja natural',
			'Naranja natural exprimida.': 'Laranja natural espremida.',
			'Limonada': 'Limonada',
			'Limón, menta fresca y jengibre.': 'Limão, hortelã fresca e gengibre.',
			'Limonada de Frutos Rojos': 'Limonada de frutas vermelhas',
			'Limón, frutos rojos y miel.': 'Limão, frutas vermelhas e mel.',
			'Passión': 'Passion',
			'Maracuyá, lima, naranja y jengibre.': 'Maracujá, limão, laranja e gengibre.',
			'Pomelada': 'Limonada de grapefruit',
			'Pomelo rosado, agua con gas, hielo y almíbar.': 'Grapefruit rosa, água com gás, gelo e xarope.',
			'Smoothie de Ananá': 'Smoothie de abacaxi',
			'Smoothie de Frutilla': 'Smoothie de morango',

			'Fernet branca con Coca Cola': 'Fernet Branca com Coca-Cola',
			'Gin de frutos rojos': 'Gin de frutas vermelhas',
			'Gin de hibiscus': 'Gin de hibisco',
			'Gin de lima': 'Gin de limão',
			'Aperol': 'Aperol',
			'Vermú': 'Vermute',
			'Negroni': 'Negroni',
			'Campari': 'Campari',
			'Corona 330ml': 'Corona 330ml',
			'Patagonia 24/7': 'Patagonia 24/7',
			'Brownie': 'Brownie',
			'Cheesecake': 'Cheesecake',
			'Capuccina': 'Capuccina',

			'Con salsa de frutos rojos.': 'Com calda de frutas vermelhas.',
			'Con helado.': 'Com sorvete.',
			'Flan Casero': 'Pudim caseiro',
			'Con dulce de leche y crema.': 'Com doce de leite e creme.',
			'Tiramisú': 'Tiramisù',
			'Clásico italiano.': 'Clássico italiano.',

			// Infusiones
			'Nuestras infusiones': 'Nossas bebidas',
			'Calientes o frías, preparadas con granos seleccionados y sabores frescos.': 'Quentes ou geladas, com grãos selecionados e sabores frescos.',
			'Negro': 'Preto',
			'Con Leche': 'Com leite',
			'Especiales': 'Especiais',
			'Fríos': 'Gelados',
			'Adicionales': 'Adicionais',
			'Milkshakes': 'Milkshakes',
			
			// Nombres de bebidas (se mantienen)
			'Aeropress': 'Aeropress',
			'Americano': 'Americano',
			'Berry': 'Berry',
			'Capuccino Italiano': 'Capuccino italiano',
			'Cold Brew': 'Cold Brew',
			'Cortado': 'Cortado',
			'Descafeinado': 'Descafeinado',
			'Doppio': 'Doppio',
			'Espresso Tonic': 'Espresso Tonic',
			'Expresso': 'Espresso',
			'Flat White': 'Flat White',
			'Lagrima': 'Leite com uma gota de café',
			'Latte': 'Latte',
			'Latte Caramel': 'Latte caramelo',
			'Latte Vainilla': 'Latte baunilha',
			'Lungo': 'Lungo',
			'Macchiato': 'Macchiato',
			'Magic': 'Magic',
			'Mocca': 'Mocca',
			'Oreo': 'Oreo',
			'Spanish Latte': 'Spanish Latte',
			'Té en saquitos / En hebras': 'Chá em saquinhos / A granel',
			'Leche con almendras': 'Leite de amêndoas',
			'Leche Deslactosada': 'Leite sem lactose',
			'Adicional shot de cafe': 'Shot extra de café',
			'Adicional de crema': 'Creme extra',
			'Dulce de Leche': 'Doce de leite',
			'Frutos Rojos': 'Frutas vermelhas',
			
			'25 a 30ml de extracción.': 'Extração de 25–30 ml.',
			'55 a 60ml de extracción.': 'Extração de 55–60 ml.',
			'Cama de agua y espresso.': 'Base de água com espresso.',
			'Doble espresso y cama de agua.': 'Espresso duplo com água.',
			'Espresso y leche emulsionada.': 'Espresso e leite vaporizado.',
			'Doble Espresso y leche emulsionada.': 'Espresso duplo e leite vaporizado.',
			'Ristretto y espuma de leche.': 'Ristretto com espuma de leite.',
			'Ristretto y emulsionada.': 'Ristretto e leite vaporizado.',
			'Espresso, leche emulsionada y syrup de caramelo.': 'Espresso, leite vaporizado e xarope de caramelo.',
			'Espresso, leche emulsionada y syrup de vainilla.': 'Espresso, leite vaporizado e xarope de baunilha.',
			'Espresso, leche emulsionada y Chocolate semiamargo.': 'Espresso, leite vaporizado e chocolate amargo.',
			'Espresso, leche emulsionada, cacao y canela.': 'Espresso, leite vaporizado, cacau e canela.',
			'Espresso, leche condensada, leche emulsionada y cacao.': 'Espresso, leite condensado, leite vaporizado e cacau.',
			'Doble espresso espumoso.': 'Espresso duplo espumoso.',
			'Café molido infusionado en frío durante horas y leche emulsionada.': 'Café moído infusionado a frio por horas e leite vaporizado.',
			'Espresso, agua tónica y rodaja de naranja.': 'Espresso, água tônica e fatia de laranja.',
			'Cordial de arándanos, naranja y agua gasificada.': 'Cordial de mirtilo, laranja e água gaseificada.',
			'Consultar variedad.': 'Consulte variedades.',
			'Base de leche, caramelo, helado dulce de leche y crema.': 'Base de leite, caramelo, sorvete de doce de leite e creme.',
			'Base de leche, helado, galletita Oreo y syrup de caramelo.': 'Base de leite, sorvete, Oreo e xarope de caramelo.',
			'Base de leche, helado de frutos rojos y syrup de vainilla.': 'Base de leite, sorvete de frutas vermelhas e xarope de baunilha.',

			// Brunch
			'Nuestros brunch de temporada': 'Nosso brunch da temporada',
			'Disfrutá combinaciones frescas y abundantes para acompañar a tu café.': 'Aproveite combinações frescas e fartas para acompanhar seu café.',
			'Cookies': 'Cookies',
			'Bakery': 'Padaria',
			'Croissant': 'Croissant',
			'Croissants': 'Croissants',
			'Milano': 'Milano',
			'Diplomata': 'Diplomata',
			'Mushroom': 'Cogumelos',
			'Chipa': 'Chipa',
			'Medialuna': 'Medialuna',
			'Budín Parisino': 'Bolo parisiense',
			'Red Velvet': 'Red Velvet',
			
			'Pastelera y Frutillas': 'Creme confeiteiro e morangos',
			'Nutella y Almendras Tostadas': 'Nutella e amêndoas tostadas',
			'Mediterráneo': 'Mediterrâneo',
			'Relleno con jamón crudo, tomate y rúcula': 'Recheado com presunto cru, tomate e rúcula.',
			'Relleno de crema mascarpone, aromatizada con café y cerezas en almíbar': 'Creme de mascarpone aromatizado com café e cerejas em calda.',
			'Rellena con crema pastelera de frutos rojos, naranjas a vivo, y frutillas frescas.': 'Recheado com creme de frutas vermelhas, gomos de laranja e morangos frescos.',
			'Salsa bechamel, espinaca, champiñones salteados y huevo poché.': 'Molho béchamel, espinafre, cogumelos salteados e ovo pochê.',
			'Avocado': 'Abacate',
			'Tostón con base de queso crema, palta, cherrys confitados, huevo pochado y brotes de soja.': 'Tostão com cream cheese, abacate, tomates-cereja confitados, ovo pochê e brotos.',
			'Salmón Gravlax': 'Salmão Gravlax',
			'Tostón con queso cremoso cítrico, salmón curado al estilo gravlax, palta laminada y huevo poché.': 'Tostão com cream cheese cítrico, salmão curado estilo gravlax, abacate fatiado e ovo pochê.',
			'Huevo de Campo': 'Ovos caipiras',
			'Tostón con base de queso crema, huevos revueltos, y panceta ahumada.': 'Tostão com cream cheese, ovos mexidos e panceta defumada.',
			'Croque Madame': 'Croque Madame',
			'Torre de brioche dorado con jamón, queso, salsa bechamel y huevo a la plancha.': 'Torre de brioche dourado com presunto, queijo, molho béchamel e ovo na chapa.',
			'Baguel Lelita': 'Bagel Lelita',
			'Baguel de sésamo, con base de queso crema, palta, huevo revuelto, y panceta ahumada.': 'Bagel de gergelim com cream cheese, abacate, ovo mexido e panceta defumada.',
			'Tostadas Masa Madre/Integral': 'Torradas fermentação natural/integral',
			'Pan de masa madre, con casuela de queso crema y mermelada de la casa.': 'Pão de fermentação natural com porção de cream cheese e geleia da casa.',
			'Tostado Mixto': 'Misto quente',
			'Tostado de Jamón y Queso, en pan árabe (Podés pedirlo con la salsa Lelita).': 'Misto quente de presunto e queijo no pão árabe (você pode pedir com o molho Lelita).',
			'Yogurt con Granola': 'Iogurte com granola',
			'Yogurt natural endulzado con variedad de frutas de estación y granola de la casa.': 'Iogurte natural adoçado com frutas da estação e granola da casa.',
			'Salmón Baguel': 'Bagel de salmão',
			'Baguel con base de queso cremoso cítrico, salmón curado, palta y huevo poché.': 'Bagel com cream cheese cítrico, salmão curado, abacate e ovo pochê.',
			'Costero': 'Costeiro',
			'Sándwich de pan ciabatta, rociado con oliva relleno con jamón, queso, tomate, rúcula y salsa Lelita.': 'Sanduíche no pão ciabatta, regado com azeite, recheado com presunto, queijo, tomate, rúcula e molho Lelita.',
			'Sándwich en pan brioche con paté de pesca, huevo cocido y tomates cherrys.': 'Sanduíche no pão brioche com patê de peixe, ovo cozido e tomates-cereja.',
			'Vainilla y Nutella': 'Baunilha e Nutella',
			'Chocolate y Dulce de Leche': 'Chocolate e doce de leite',
			'Pistacho y Chocolate Blanco': 'Pistache e chocolate branco',
			
			'Alfajor de Maicena': 'Alfajor de maisena',
			'Alfajor de Pistacho': 'Alfajor de pistache',
			'Alfajor de Almendras': 'Alfajor de amêndoas',
			'Alfajor de Chocolate': 'Alfajor de chocolate',
			'Relleno con chocolate blanco, pistacho y un corazón de frambuesa.': 'Recheado com chocolate branco, pistache e um coração de framboesa.',
			'Budín Marmolado': 'Bolo mármore',
			'Budín de Limón y Arándanos': 'Bolo de limão e mirtilo',
			'Budín de Banana y Nuez': 'Bolo de banana e nozes',
			'Pan de Chocolate': 'Pão de chocolate',
			'Roll de Manzana/ Canela': 'Roll de maçã/canela',
			'Scon de Arándanos': 'Scone de mirtilo',
			'Scon de Parmesano': 'Scone de parmesão',
			'Dolci de Pistacho': 'Dolci de pistache',
			'Masa quebrada de cacao amargo, con ganache de pistacho, y frambuesa': 'Massa de cacau amargo, ganache de pistache e framboesa.',
			'Albahaca, queso crema, aceituna, alcaparra, tomate cherry confitado y ralladura de limón.': 'Manjericão, cream cheese, azeitona, alcaparra, tomate-cereja confitado e raspas de limão.',
			'Chipa Relleno': 'Chipa recheada',
			'Brownie con helado': 'Brownie com sorvete',
			'Los sabores de helado son: crema americana, súper dulce de leche y mascarpone.': 'Sabores de sorvete: creme, super doce de leite e mascarpone.',
			'Crumble de manzana c/ crema o helado': 'Crumble de maçã com creme ou sorvete',
			'Servido calentito.': 'Servido quentinho.',
			
			// Tortas
			'Postres y tortas caseras': 'Bolos e sobremesas caseiras',
			'Clásicos irresistibles para acompañar tu café.': 'Clássicos irresistíveis para acompanhar seu café.',
			'Carrot Cake': 'Bolo de cenoura',
			'Lemon pie': 'Torta de limão',
			'Key lime pie': 'Key lime pie',
			'Marquise': 'Marquise',
			'Matilda': 'Matilda',
			'Nocciola': 'Nocciola',
			'Red Velvet': 'Red Velvet',
			'Cheesecake de Frutos Rojos': 'Cheesecake de frutas vermelhas',
			'Clásico, suave y cremoso, con mermelada de frutos rojos.': 'Clássico, suave e cremoso, com geleia de frutas vermelhas.',
			'Cheesecake Pistacho': 'Cheesecake de pistache',
			'Cremoso, con suave sabor a pistacho y mermelada de frutos rojos.': 'Cremoso, com sabor delicado de pistache e geleia de frutas vermelhas.',
			'Bizcochuelo húmedo de chocolate con dulce de leche.': 'Bolo de chocolate úmido com doce de leite.',
			'Bizcochuelo de naranja, nuez y canela con frosting de queso crema.': 'Bolo de laranja, nozes e canela com cobertura de cream cheese.',
			'Cremoso de lima, base crocante y chantilly.': 'Creme de limão, base crocante e chantilly.',
			'Clásico argentino: Curd de limón y merengue italiano.': 'Clássico argentino: curd de limão e merengue italiano.',
			'Bizcochuelo húmedo, dulce de leche y frosting de queso crema.': 'Bolo úmido, doce de leite e cobertura de cream cheese.',
			'Postre clásico, brownie de chocolate con dulce de leche y merengue italiano.': 'Sobremesa clássica: brownie de chocolate com doce de leite e merengue italiano.',
			'Bizcochuelo rojo aterciopelado con frosting suave.': 'Bolo red velvet com cobertura suave.',
			'Cremoso de chocolate con avellanas e hilos de nutella.': 'Creme de chocolate com avelãs e fios de Nutella.',
		},
	};

	// ---- Títulos palabra por palabra (referencia: figaronyc.com) ----
	// Se arman DESPUÉS de traducir (la traducción solo toca elementos sin hijos)
	// y se desarman antes de cada cambio de idioma.
	const TITLE_WORDS_SELECTOR = '.video-heading, .about-heading, .menus-heading, .reviews-heading, .location-heading, .title-banner .title, .section-lead-card:not(.lead-card--text-only) .lead-body h2';
	const titleObserver = ('IntersectionObserver' in window)
		? new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;
				entry.target.classList.add('is-in');
				titleObserver.unobserve(entry.target);
			});
		}, { threshold: 0.35 })
		: null;

	const unsplitTitleWords = () => {
		document.querySelectorAll('.tw-title').forEach((el) => {
			el.textContent = el.textContent;
		});
	};

	const splitTitleWords = () => {
		document.querySelectorAll(TITLE_WORDS_SELECTOR).forEach((el) => {
			if (el.children.length) return; // solo títulos de texto plano
			const words = el.textContent.trim().split(/\s+/).filter(Boolean);
			if (!words.length) return;
			el.textContent = '';
			words.forEach((word, i) => {
				if (i) el.append(' ');
				const span = document.createElement('span');
				span.className = 'tw';
				span.style.setProperty('--tw-i', String(i));
				span.textContent = word;
				el.append(span);
			});
			if (el.classList.contains('tw-title')) return; // ya animado: queda visible
			el.classList.add('tw-title');
			if (!titleObserver) { el.classList.add('is-in'); return; }
			// doble rAF: que el estado inicial se pinte antes de animar
			requestAnimationFrame(() => requestAnimationFrame(() => titleObserver.observe(el)));
		});
	};

	const applyTranslations = (lang) => {
		const isSpanish = lang === 'es';
		unsplitTitleWords();
		const table = TEXT_TRANSLATIONS[lang] || null;

		const candidates = document.querySelectorAll(
			'.nav-text, .nav-link, .pill-link, .title, .video-heading, .location-heading, .location-text, .location-link span, .footer-heading, .footer-hours p, .footer-social-title, .footer-meta p, .footer-link, .accordion-toggle, .dish-name, .dish-desc, .lead-body h2, .lead-body p, .legal-content h2, .legal-label, .legal-text, .legal-updated, .reviews-heading, .reviews-text, .reviews-hint, .reviews-link span, .menus-heading, .menus-text, .menu-card-title, .menu-card-cta, .menu-legend__title, .menu-legend__text, .menu-legend__lead, .menu-legend__label, .menu-legend__sep, .promo-lunch__title, .promo-lunch__subtitle, .promo-card__label, .promo-card__desc, .hero-cta__label'
		);

		candidates.forEach((el) => {
			if (el.classList.contains('location-icon')) return;
			// Evitar tocar precios u otros números
			if (el.classList.contains('dish-price')) return;

			const hasChildren = el.children && el.children.length > 0;
			if (hasChildren) {
				if (!el.dataset.i18nOriginalHtml) el.dataset.i18nOriginalHtml = el.innerHTML;
				if (isSpanish) {
					el.innerHTML = el.dataset.i18nOriginalHtml;
					return;
				}
				// Por defecto, no traducimos HTML rico salvo casos especiales
				return;
			}

			if (!el.dataset.i18nOriginalText) el.dataset.i18nOriginalText = el.textContent;
			if (isSpanish) {
				el.textContent = el.dataset.i18nOriginalText;
				return;
			}

			if (!table) return;
			const key = normalize(el.dataset.i18nOriginalText);
			const relaxedKey = key.replace(/[;.]$/, '');
			const translated = table[key] || table[relaxedKey];
			if (translated) el.textContent = translated;
		});

		// ARIA labels marcados (para accesibilidad multilenguaje)
		const ariaLabelCandidates = document.querySelectorAll('[data-i18n-aria-label]');
		ariaLabelCandidates.forEach((el) => {
			const current = el.getAttribute('aria-label') || '';
			if (!el.dataset.i18nOriginalAriaLabel) el.dataset.i18nOriginalAriaLabel = current;
			if (isSpanish) {
				el.setAttribute('aria-label', el.dataset.i18nOriginalAriaLabel);
				return;
			}
			if (!table) return;
			const key = normalize(el.dataset.i18nOriginalAriaLabel);
			const relaxedKey = key.replace(/[;.]$/, '');
			const translated = table[key] || table[relaxedKey];
			if (translated) el.setAttribute('aria-label', translated);
		});

		// Ajuste fino: separador decimal del rating en inglés
		const ratingValue = document.querySelector('.reviews-rating-value');
		if (ratingValue) {
			if (!ratingValue.dataset.i18nOriginalText) ratingValue.dataset.i18nOriginalText = ratingValue.textContent;
			if (lang === 'en') ratingValue.textContent = ratingValue.dataset.i18nOriginalText.replace(',', '.');
			else ratingValue.textContent = ratingValue.dataset.i18nOriginalText;
		}

		// About (index): conservar <strong>
		const aboutParagraphs = document.querySelectorAll('.page-home .section-hero--about .lead-body p');
		if (aboutParagraphs.length >= 2) {
			aboutParagraphs.forEach((p) => {
				if (!p.dataset.i18nOriginalHtml) p.dataset.i18nOriginalHtml = p.innerHTML;
			});

			if (lang === 'en') {
				aboutParagraphs[0].innerHTML = '<strong>LELITA was born in 2023</strong> as the <strong>dream of three siblings and their father</strong>, inspired by the <strong>cooking of their grandmother, Lelita</strong>. We grew up around her recipes, the shared table, and that homemade flavor that always brought everyone together.';
				aboutParagraphs[1].innerHTML = 'Today we turned that memory into a <strong>modern café</strong>, where <strong>great coffee, brunch and lunches</strong> are prepared with the same dedication: <strong>eat well, take your time, and feel at home</strong>.';
			} else if (lang === 'pt') {
				aboutParagraphs[0].innerHTML = '<strong>LELITA nasceu em 2023</strong> como o <strong>sonho de três irmãos e do pai</strong>, inspirado na <strong>cozinha da avó, Lelita</strong>. Crescemos em torno das receitas dela, da mesa compartilhada e daquele sabor caseiro que sempre reunia todo mundo.';
				aboutParagraphs[1].innerHTML = 'Hoje transformamos essa lembrança em uma <strong>cafeteria moderna</strong>, onde <strong>bom café, brunch e almoços</strong> são preparados com a mesma dedicação: <strong>comer bem, sem pressa e como em casa</strong>.';
			} else {
				aboutParagraphs[0].innerHTML = aboutParagraphs[0].dataset.i18nOriginalHtml;
				aboutParagraphs[1].innerHTML = aboutParagraphs[1].dataset.i18nOriginalHtml;
			}
		}

		// Footer credit: mantener el nombre de la marca
		const creditSpan = document.querySelector('.footer-meta .footer-credit');
		const footerMeta = creditSpan && creditSpan.closest('p');
		if (footerMeta) {

			const prefixEs = 'Carta digital hecha por';
			const prefixEn = 'Digital menu by';
			const prefixPt = 'Cardápio digital por';
			const prefix = lang === 'en' ? prefixEn : lang === 'pt' ? prefixPt : prefixEs;
			footerMeta.innerHTML = `${prefix} ${creditSpan.outerHTML}`; // conserva el link a Instagram
		}

		// Title por página
		const file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
		const titleMap = TITLES[file];
		if (titleMap) {
			document.title = titleMap[lang] || titleMap.es;
		}

		splitTitleWords();
	};

	const closeLangMenu = () => {
		if (!langToggle) return;
		langToggle.setAttribute('aria-expanded', 'false');
	};

	const setLanguage = (lang) => {
		const meta = LANG_META[lang] || LANG_META.es;
		try {
			localStorage.setItem(LANG_STORAGE_KEY, lang);
		} catch (e) {
			// ignore
		}

		document.documentElement.lang = lang;
		if (langCode) langCode.textContent = meta.code;

		const flagEl = langToggle?.querySelector('.flag');
		if (flagEl) {
			flagEl.classList.remove('flag--ar', 'flag--us', 'flag--br');
			flagEl.classList.add(meta.flagClass);
		}

		langOptions.forEach((option) => {
			const isSelected = option.dataset.lang === lang;
			option.setAttribute('aria-checked', String(isSelected));
		});

		applyTranslations(lang);
	};

	let navBackdrop = null;
	const ensureNavBackdrop = () => {
		if (navBackdrop) return;
		navBackdrop = document.createElement('div');
		navBackdrop.className = 'nav-backdrop';
		navBackdrop.setAttribute('aria-hidden', 'true');
		navBackdrop.addEventListener('click', () => setNavOpen(false));
		document.body.appendChild(navBackdrop);
	};

	const setNavOpen = (open) => {
		ensureNavBackdrop();
		menuToggle?.setAttribute('aria-expanded', String(open));
		nav?.classList.toggle('nav--open', open);
		body?.classList.toggle('has-nav-open', open);
		root?.classList.toggle('has-nav-open', open);
		navBackdrop?.classList.toggle('nav-backdrop--open', open);
		if (!open) {
			dropdownToggle?.setAttribute('aria-expanded', 'false');
			submenu?.classList.remove('submenu--open');
		}
		if (open) {
			closeLangMenu();
		}
	};

	// Cerrar menú al hacer clic en el overlay
	if (body) {
		body.addEventListener('click', (event) => {
			// Solo cerrar si el menú está abierto y se hace clic fuera del menú y del toggle
			if (body.classList.contains('has-nav-open') && event.target === body) {
				setNavOpen(false);
			}
		});
	}

	// Menú móvil: abrir/cerrar
	if (menuToggle && nav) {
		menuToggle.addEventListener('click', () => {
			const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
			setNavOpen(!expanded);
		});
	}

	// Cerrar menú con Escape
	window.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			setNavOpen(false);
		}
	});

	// Selector de idioma
	if (langToggle && langMenu) {
		langToggle.addEventListener('click', () => {
			const expanded = langToggle.getAttribute('aria-expanded') === 'true';
			const next = !expanded;
			langToggle.setAttribute('aria-expanded', String(next));
			if (next) {
				// Si abre idioma, cerrar nav mobile
				setNavOpen(false);
				const current = langMenu.querySelector('[aria-checked="true"]');
				(current || langMenu.querySelector('[data-lang-option]'))?.focus?.();
			}
		});

		langOptions.forEach((option) => {
			option.addEventListener('click', () => {
				const lang = option.dataset.lang || 'es';
				setLanguage(lang);
				closeLangMenu();
			});
		});
	}

	// Inicializar idioma desde storage (si existe)
	try {
		const stored = localStorage.getItem(LANG_STORAGE_KEY);
		if (stored && LANG_META[stored]) {
			setLanguage(stored);
		}
	} catch (e) {
		// ignore
	}
	splitTitleWords(); // idempotente: si setLanguage ya los armó, no hace nada

	// Dropdown opcional de Carta
	if (dropdownToggle && submenu) {
		dropdownToggle.addEventListener('click', (event) => {
			event.preventDefault();
			const expanded = dropdownToggle.getAttribute('aria-expanded') === 'true';
			const next = !expanded;
			dropdownToggle.setAttribute('aria-expanded', String(next));
			submenu.classList.toggle('submenu--open', next);
		});
	}

	galleries.forEach((gallery) => {
		const track = gallery.querySelector('[data-gallery-track]');
		if (!track) return;
		const viewport = gallery.querySelector('.gallery-viewport') || track.parentElement;
		const folder = (gallery.dataset.galleryFolder || '').replace(/\/$/, '');
		const startFile = (gallery.dataset.galleryStart || '').trim();
		const mode = (gallery.dataset.galleryMode || '').trim().toLowerCase();
		let files = (gallery.dataset.galleryFiles || '')
			.split(',')
			.map((name) => name.trim())
			.filter(Boolean);
		const alts = (gallery.dataset.galleryAlts || '')
			.split(',')
			.map((alt) => alt.trim());

		if (!files.length) {
			gallery.setAttribute('hidden', '');
			return;
		}

		track.innerHTML = '';

		const getImageData = (idx) => {
			const fileName = files[idx];
			const src = folder ? `${folder}/${fileName}` : fileName;
			const alt = (alts[idx] || fileName.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, '')).trim();
			return { src, alt };
		};

		const prevButton = gallery.querySelector('[data-gallery-prev]');
		const nextButton = gallery.querySelector('[data-gallery-next]');

		if (mode === 'scroll' && viewport) {
			const baseCount = files.length;
			const cloneCount = Math.min(2, baseCount);
			const allSlides = [];

			const createSlide = (fileIndex, isClone) => {
				const { src, alt } = getImageData(fileIndex);
				const li = document.createElement('li');
				li.className = 'gallery-slide';
				li.dataset.galleryRealIndex = String(fileIndex);
				if (isClone) li.dataset.galleryClone = 'true';
				const figure = document.createElement('figure');
				figure.className = 'gallery-figure';
				const img = document.createElement('img');
				img.loading = 'lazy';
				img.decoding = 'async';
				img.src = src;
				img.alt = alt;
				const webp = getWebpSrc(src);
				if (webp) {
					const picture = document.createElement('picture');
					const source = document.createElement('source');
					source.type = 'image/webp';
					source.srcset = webp;
					picture.appendChild(source);
					picture.appendChild(img);
					figure.appendChild(picture);
				} else {
					figure.appendChild(img);
				}
				li.appendChild(figure);
				track.appendChild(li);
				return li;
			};

			// Clones (para efecto circular sin salto):
			// [últimas N clones] + [todas] + [primeras N clones]
			if (baseCount > 1 && cloneCount) {
				for (let i = baseCount - cloneCount; i < baseCount; i += 1) {
					allSlides.push(createSlide(i, true));
				}
			}
			for (let i = 0; i < baseCount; i += 1) {
				allSlides.push(createSlide(i, false));
			}
			if (baseCount > 1 && cloneCount) {
				for (let i = 0; i < cloneCount; i += 1) {
					allSlides.push(createSlide(i, true));
				}
			}

			allSlides.forEach((slide, idx) => {
				slide.dataset.galleryIndex = String(idx);
			});

			const normalizeRealIndex = (idx) => {
				const total = baseCount;
				if (!total) return 0;
				return ((idx % total) + total) % total;
			};

			let currentRealIndex = 0;
			if (startFile) {
				const found = files.indexOf(startFile);
				if (found >= 0) currentRealIndex = found;
			}
			let currentSlideIndex = (baseCount > 1 ? cloneCount : 0) + currentRealIndex;

			const setActiveSlideIndex = (slideIndex) => {
				const slide = allSlides[slideIndex];
				if (!slide) return;
				allSlides.forEach((s, i) => {
					s.classList.toggle('is-active', i === slideIndex);
				});
				currentSlideIndex = slideIndex;
				currentRealIndex = Number(slide.dataset.galleryRealIndex || 0);
			};

			const scrollToSlideIndex = (slideIndex, behavior = 'smooth') => {
				const total = allSlides.length;
				if (!total) return;
				// En carrusel infinito, NO conviene hacer wrap por módulo acá:
				// si estás en el último slide y pedís +1, el módulo salta al primero
				// y el browser "repasa" todo el carrusel. Preferimos ir a clones adyacentes
				// (y re-centrar luego) para que el loop se sienta continuo.
				const clampedIndex = Math.max(0, Math.min(slideIndex, total - 1));
				const slide = allSlides[clampedIndex];
				if (!slide) return;
				setActiveSlideIndex(clampedIndex);
				const targetLeft = Math.round(slide.offsetLeft + slide.offsetWidth / 2 - viewport.clientWidth / 2);
				if (behavior === 'auto') {
					const prevBehavior = viewport.style.scrollBehavior;
					const prevSnap = viewport.style.scrollSnapType;
					viewport.style.scrollBehavior = 'auto';
					viewport.style.scrollSnapType = 'none';
					viewport.scrollLeft = targetLeft;
					window.requestAnimationFrame(() => {
						window.requestAnimationFrame(() => {
							viewport.style.scrollBehavior = prevBehavior;
							viewport.style.scrollSnapType = prevSnap;
						});
					});
				} else {
					viewport.scrollTo({ left: targetLeft, behavior: 'smooth' });
				}
			};

			const scrollToRealIndex = (realIndex, behavior = 'smooth') => {
				const idx = normalizeRealIndex(realIndex);
				const slideIndex = (baseCount > 1 ? cloneCount : 0) + idx;
				scrollToSlideIndex(slideIndex, behavior);
			};

			const getNearestSlideIndex = () => {
				if (!allSlides.length) return 0;
				const center = viewport.scrollLeft + viewport.clientWidth / 2;
				let closest = 0;
				let closestDist = Infinity;
				allSlides.forEach((slide, idx) => {
					const x = slide.offsetLeft + slide.offsetWidth / 2;
					const dist = Math.abs(x - center);
					if (dist < closestDist) {
						closestDist = dist;
						closest = idx;
					}
				});
				return closest;
			};

			let isRecentering = false;
			const recenterToSlideIndex = (targetSlideIndex) => {
				const slide = allSlides[targetSlideIndex];
				if (!slide) return;
				isRecentering = true;
				setActiveSlideIndex(targetSlideIndex);
				const targetLeft = Math.round(slide.offsetLeft + slide.offsetWidth / 2 - viewport.clientWidth / 2);
				const prevBehavior = viewport.style.scrollBehavior;
				const prevSnap = viewport.style.scrollSnapType;
				viewport.style.scrollBehavior = 'auto';
				viewport.style.scrollSnapType = 'none';
				viewport.scrollLeft = targetLeft;
				window.requestAnimationFrame(() => {
					window.requestAnimationFrame(() => {
						viewport.style.scrollBehavior = prevBehavior;
						viewport.style.scrollSnapType = prevSnap;
						isRecentering = false;
					});
				});
			};

			const recenterIfNeeded = () => {
				if (baseCount <= 1 || !cloneCount) return;
				const nearest = getNearestSlideIndex();
				// Si quedamos en clones, saltar al slide real equivalente (sin animación)
				if (nearest < cloneCount) {
					recenterToSlideIndex(nearest + baseCount);
				} else if (nearest >= cloneCount + baseCount) {
					recenterToSlideIndex(nearest - baseCount);
				} else {
					setActiveSlideIndex(nearest);
				}
			};

			// Drag suave (mouse/touch) + snap al soltar
			let isPointerDown = false;
			let dragStartX = 0;
			let dragStartScrollLeft = 0;
			let dragMoved = false;
			let suppressClicksUntil = 0;
			let scrollStopTimer = 0;

			const snapToNearest = () => {
				const closest = getNearestSlideIndex();
				scrollToSlideIndex(closest);
				window.setTimeout(() => recenterIfNeeded(), 240);
			};

			viewport.addEventListener('pointerdown', (event) => {
				// Solo botón principal (mouse) o touch
				if (event.pointerType === 'mouse' && event.button !== 0) return;
				isPointerDown = true;
				dragMoved = false;
				dragStartX = event.clientX;
				dragStartScrollLeft = viewport.scrollLeft;
				viewport.classList.add('is-dragging');
				viewport.setPointerCapture?.(event.pointerId);
			});

			viewport.addEventListener('pointermove', (event) => {
				if (!isPointerDown) return;
				const dx = event.clientX - dragStartX;
				if (Math.abs(dx) > 6) dragMoved = true;
				viewport.scrollLeft = dragStartScrollLeft - dx;
			});

			const endDrag = () => {
				if (!isPointerDown) return;
				isPointerDown = false;
				viewport.classList.remove('is-dragging');
				if (dragMoved) {
					suppressClicksUntil = Date.now() + 450;
					window.requestAnimationFrame(() => snapToNearest());
				}
			};

			viewport.addEventListener('pointerup', endDrag);
			viewport.addEventListener('pointercancel', endDrag);
			viewport.addEventListener(
				'click',
				(event) => {
					if (Date.now() < suppressClicksUntil) {
						event.preventDefault();
						event.stopPropagation();
					}
				},
				true
			);

			// Cuando termina el scroll con inercia (sin drag), re-centrar si quedó en clones
			viewport.addEventListener(
				'scroll',
				() => {
					if (isPointerDown || isRecentering) return;
					if (scrollStopTimer) window.clearTimeout(scrollStopTimer);
					scrollStopTimer = window.setTimeout(() => recenterIfNeeded(), 120);
				},
				{ passive: true }
			);

			prevButton?.addEventListener('click', () => {
				recenterIfNeeded();
				scrollToSlideIndex(currentSlideIndex - 1);
			});
			nextButton?.addEventListener('click', () => {
				recenterIfNeeded();
				scrollToSlideIndex(currentSlideIndex + 1);
			});

			gallery.addEventListener('keydown', (event) => {
				if (event.key === 'ArrowLeft') {
					event.preventDefault();
					recenterIfNeeded();
					scrollToSlideIndex(currentSlideIndex - 1);
				} else if (event.key === 'ArrowRight') {
					event.preventDefault();
					recenterIfNeeded();
					scrollToSlideIndex(currentSlideIndex + 1);
				}
			});

			// Posicionar en la foto inicial sin animación
			window.requestAnimationFrame(() => scrollToRealIndex(currentRealIndex, 'auto'));
			return;
		}

		// Modo clásico (3 slides con focus en el centro)
		const slotCount = files.length >= 3 ? 3 : files.length;
		const slots = [];

		const createSlot = () => {
			const li = document.createElement('li');
			li.className = 'gallery-slide';
			const figure = document.createElement('figure');
			figure.className = 'gallery-figure';
			const picture = document.createElement('picture');
			const source = document.createElement('source');
			source.type = 'image/webp';
			const img = document.createElement('img');
			img.loading = 'lazy';
			img.decoding = 'async';
			picture.appendChild(source);
			picture.appendChild(img);
			figure.appendChild(picture);
			li.appendChild(figure);
			track.appendChild(li);
			slots.push({ li, img, source });
		};

		for (let i = 0; i < slotCount; i += 1) {
			createSlot();
		}

		let index = files.length === 1 ? 0 : files.length === 2 ? 0 : 1;
		if (startFile) {
			const found = files.indexOf(startFile);
			if (found >= 0) {
				index = files.length <= 2 ? 0 : found;
			}
		}

		const assignSlot = (slot, fileIndex, role) => {
			const { li, img, source } = slots[slot];
			const { src, alt } = getImageData(fileIndex);
			img.src = src;
			img.alt = alt;
			if (source) {
				const webp = getWebpSrc(src);
				if (webp) {
					source.srcset = webp;
				} else {
					source.removeAttribute('srcset');
				}
			}
			li.classList.remove('is-active', 'is-prev', 'is-next');
			if (role) li.classList.add(role);
		};

		const applyIndex = () => {
			const total = files.length;
			if (total === 1) {
				assignSlot(0, 0, 'is-active');
				return;
			}

			if (total === 2) {
				assignSlot(0, index, 'is-active');
				assignSlot(1, (index + 1) % total, 'is-next');
				return;
			}

			const prevIndex = (index - 1 + total) % total;
			const nextIndex = (index + 1) % total;
			assignSlot(0, prevIndex, 'is-prev');
			assignSlot(1, index, 'is-active');
			assignSlot(2, nextIndex, 'is-next');
		};

		const step = (delta) => {
			if (files.length === 1) return;
			index = (index + delta + files.length) % files.length;
			if (files.length === 2) {
				index = index % files.length;
			}
			applyIndex();
		};

		prevButton?.addEventListener('click', () => step(-1));
		nextButton?.addEventListener('click', () => step(1));

		gallery.addEventListener('keydown', (event) => {
			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				step(-1);
			} else if (event.key === 'ArrowRight') {
				event.preventDefault();
				step(1);
			}
		});

		applyIndex();
	});

	// Inicializar lightbox en imágenes presentes (incluye las de galería creadas por JS)
	initLightboxTargets();

	document.addEventListener('click', (e) => {
		if (!submenu || !dropdownToggle) return;
		const target = e.target;
		const clickedInside = submenu.contains(target) || dropdownToggle.contains(target);
		if (!clickedInside) {
			dropdownToggle.setAttribute('aria-expanded', 'false');
			submenu.classList.remove('submenu--open');
		}
	});

	// Cerrar idioma al click afuera
	document.addEventListener('click', (e) => {
		if (!langMenu || !langToggle) return;
		const target = e.target;
		const clickedInside = langMenu.contains(target) || langToggle.contains(target);
		if (!clickedInside) {
			closeLangMenu();
		}
	});

	// Escape global: cerrar todo
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			if (closeLightbox()) return;
			setNavOpen(false);
			closeLangMenu();
		}
	});

	// Cerrar menú móvil al seleccionar una opción
	if (nav && links.length) {
		links.forEach((a) => {
			a.addEventListener('click', () => {
				// Solo aplica en móvil
				// Nota: en algunos navegadores móviles, cerrar el nav *durante* el click
				// puede cancelar la navegación; por eso se difiere al próximo tick.
				if (window.innerWidth < 768) {
					window.setTimeout(() => setNavOpen(false), 0);
				}
			});
		});
	}

	// Reset al cambiar a desktop
	window.addEventListener('resize', () => {
		if (window.innerWidth >= 768) {
			setNavOpen(false);
		}
		updateHeaderHeight();
	});

	// Acordeones de la carta
	let accordionBusy = false;
	accordionToggles.forEach((toggle) => {
		const panelId = toggle.getAttribute('aria-controls');
		const panel = panelId ? document.getElementById(panelId) : null;
		if (!panel) return;

		const getStickyOffset = () => {
			const switcher = document.querySelector('.section-switcher');
			const headerOffset = header?.offsetHeight || 0;
			const switcherVisible =
				switcher &&
				window.getComputedStyle(switcher).display !== 'none' &&
				window.getComputedStyle(switcher).visibility !== 'hidden';
			const switcherOffset = switcherVisible ? switcher.offsetHeight : 0;
			return headerOffset + switcherOffset + 12;
		};

		const scrollToYAndWait = (y, behavior) => {
			const target = Math.max(0, Math.round(y));
			if (behavior === 'auto') {
				window.scrollTo({ top: target, behavior: 'auto' });
				return Promise.resolve();
			}

			return new Promise((resolve) => {
				let finished = false;
				let endTimer = null;
				const cleanup = () => {
					window.removeEventListener('scroll', onScroll);
					if (endTimer) clearTimeout(endTimer);
				};
				const finish = () => {
					if (finished) return;
					finished = true;
					cleanup();
					resolve();
				};
				const onScroll = () => {
					if (endTimer) clearTimeout(endTimer);
					endTimer = setTimeout(finish, 130);
				};

				window.addEventListener('scroll', onScroll, { passive: true });
				onScroll();
				window.scrollTo({ top: target, behavior: 'smooth' });
				setTimeout(finish, 900);
			});
		};

		const scrollToAccordionStartIfNeeded = () => {
			const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
			const behavior = reduceMotion ? 'auto' : 'smooth';
			const offset = getStickyOffset();
			const rect = toggle.getBoundingClientRect();
			const minTop = offset + 6;

			// Si el botón ya está visible y no queda tapado por el header/switcher, no forzar scroll.
			if (rect.top >= minTop && rect.top <= window.innerHeight * 0.6) return Promise.resolve();

			const y = rect.top + window.scrollY - offset;
			return scrollToYAndWait(y, behavior);
		};

		const closeToggleInstant = (otherToggle) => {
			const otherPanelId = otherToggle.getAttribute('aria-controls');
			const otherPanel = otherPanelId ? document.getElementById(otherPanelId) : null;
			otherToggle.setAttribute('aria-expanded', 'false');
			if (!otherPanel) return;
			// Cierre instantáneo (sin transición) para evitar "saltos" de scroll por cambios de layout.
			otherPanel.style.transition = 'none';
			otherPanel.classList.remove('accordion--open');
			otherPanel.style.maxHeight = '0px';
			otherPanel.offsetHeight; // fuerza reflow
			otherPanel.style.transition = '';
		};

		const setState = (expanded) => {
			toggle.setAttribute('aria-expanded', String(expanded));
			panel.classList.toggle('accordion--open', expanded);
			panel.style.maxHeight = expanded ? `${panel.scrollHeight}px` : '0px';
		};

		// Mantener estado inicial si viene expandido en el HTML
		const initiallyOpen = toggle.getAttribute('aria-expanded') === 'true';
		if (initiallyOpen) {
			setState(true);
		}

		toggle.addEventListener('click', () => {
			const expanded = toggle.getAttribute('aria-expanded') === 'true';
			if (!expanded) {
				if (accordionBusy) return;
				accordionBusy = true;
				Promise.resolve()
					.then(scrollToAccordionStartIfNeeded)
					.then(() => {
						// Mantener el botón "anclado" mientras cerramos otros paneles (evita salto visual).
						const beforeTop = toggle.getBoundingClientRect().top;
						accordionToggles.forEach((other) => {
							if (other !== toggle && other.getAttribute('aria-expanded') === 'true') {
								closeToggleInstant(other);
							}
						});
						const afterTop = toggle.getBoundingClientRect().top;
						const delta = afterTop - beforeTop;
						if (Math.abs(delta) > 0.5) {
							window.scrollBy({ top: delta, behavior: 'auto' });
						}

						setState(true);
					})
					.finally(() => {
						accordionBusy = false;
					});
			} else {
				setState(false);
			}
		});
	});

	// Imagen superior opcional para platos sólidos (usar data-image="...")
	const dishCardsWithImages = document.querySelectorAll('.dish-card[data-image]');
	dishCardsWithImages.forEach((card) => {
		const dishType = (card.dataset.dishType || 'solid').toLowerCase();
		if (dishType === 'liquid') return; // evitar aplicar a bebidas/comidas líquidas

		const imageSrc = (card.dataset.image || '').trim();
		if (!imageSrc) return;

		const nameFallback = card.querySelector('.dish-name')?.textContent?.trim() || 'Plato de la carta';
		const imageAlt = (card.dataset.imageAlt || nameFallback).trim();

		const media = document.createElement('div');
		media.className = 'dish-media';
		const img = document.createElement('img');
		img.loading = 'lazy';
		img.decoding = 'async';
		img.src = imageSrc;
		img.alt = imageAlt;
		const webp = getWebpSrc(imageSrc);
		if (webp) {
			const picture = document.createElement('picture');
			const source = document.createElement('source');
			source.type = 'image/webp';
			source.srcset = webp;
			picture.appendChild(source);
			picture.appendChild(img);
			media.appendChild(picture);
		} else {
			media.appendChild(img);
		}

		card.insertBefore(media, card.firstChild);
		card.classList.add('has-image');
		card.classList.remove('no-image');
	});

	// Las dish-cards con foto generada dinámicamente necesitan registrarse en el lightbox.
	initLightboxTargets();

// Segundo bloque duplicado eliminado: la galería ya se gestiona con slots arriba.
});
