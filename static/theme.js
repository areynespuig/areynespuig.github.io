// Aplica el tema claro/oscuro y el tema de la web antes de pintar, para que no parpadeen.
// Va en un archivo aparte (y no dentro del HTML) para que la política de seguridad (CSP) pueda prohibir los scripts en línea.
// El tema de la web lo dice la propia página (<meta name="site-look">): el principal y los que puede elegir el visitante.
try {
	const root = document.documentElement;
	const scheme = localStorage.getItem('theme');
	if (scheme === 'light' || scheme === 'dark') root.dataset.theme = scheme;
	const meta = document.querySelector('meta[name="site-look"]');
	if (meta) {
		const choices = (meta.getAttribute('data-choices') || '').split(' ');
		const pick = localStorage.getItem('look');
		root.dataset.look = pick && choices.includes(pick) ? pick : meta.getAttribute('content');
	}
} catch {}
