// Aplica el tema claro/oscuro y el tema de la web antes de pintar, para que no parpadeen.
// Va en un archivo aparte (y no dentro del HTML) para que la política de seguridad (CSP) pueda prohibir los scripts en línea.
// El tema de la web lo dice la propia página (<meta name="site-look">): el principal y los que puede elegir el visitante.
(function () {
	function stored(key) {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	}
	try {
		const root = document.documentElement;
		const scheme = stored('theme');
		if (scheme === 'light' || scheme === 'dark') root.dataset.theme = scheme;
		const meta = document.querySelector('meta[name="site-look"]');
		if (!meta) return;
		const choices = (meta.getAttribute('data-choices') || '').split(' ');
		const pick = stored('look');
		const look = pick && choices.includes(pick) ? pick : meta.getAttribute('content');
		root.dataset.look = look;
		// Pide ya la letra del tema (alfabeto latino). Las fuentes van con font-display: block, así que
		// el texto espera a su letra en vez de salir con otra y cambiar después.
		const families = (meta.getAttribute('data-fonts-' + look) || '').split(',');
		const latin = /(^|,)\s*U\+0+-0*FF\s*(,|$)/i;
		document.fonts.forEach(function (face) {
			if (families.includes(face.family.replace(/["']/g, '')) && latin.test(face.unicodeRange)) {
				face.load().catch(function () {});
			}
		});
	} catch {}
})();
