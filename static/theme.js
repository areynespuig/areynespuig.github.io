// Aplica el tema elegido antes de pintar, para que no parpadee.
// Va en un archivo aparte (y no dentro del HTML) para que la política de seguridad (CSP) pueda prohibir los scripts en línea.
try {
	const theme = localStorage.getItem('theme');
	if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch {}
