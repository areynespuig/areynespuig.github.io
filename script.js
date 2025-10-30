// Theme + i18n + year
(function () {
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const langButtons = document.querySelectorAll('.lang-switch .chip');
  const yearEl = document.getElementById('year');

  // Year
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Theme
  const storedTheme = localStorage.getItem('theme') || 'dark';
  root.setAttribute('data-theme', storedTheme);
  document.documentElement.setAttribute('data-theme', storedTheme);

  themeToggle?.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', current);
    localStorage.setItem('theme', current);
  });

  // i18n
  const T = {
    es: {
      nav: { about: "Sobre mí", education: "Educación", experience: "Experiencia", projects: "Proyectos", contact: "Contacto" },
      hero: {
        availability: "Disponible para colaboraciones · Cataluña",
        greeting: "¡Hola! Soy",
        subtitle: "Ingeniero Informático especializado en desarrollo web.",
        cta: "Ver proyectos",
        cv: "Descargar currículum"
      },
      about: {
        title: "Sobre mí",
        who_title: "¿Quién soy?",
        who_text: "Soy estudiante de ingeniería informática especializado en desarrollo web. Me gusta crear aplicaciones modernas, accesibles y eficientes cuidando tanto el diseño como la arquitectura del código.",
        skills_title: "Competencias clave",
        skill1: "HTML, CSS, JavaScript (ES6+), React/Vue",
        skill2: "Node.js, Express, MongoDB/MySQL",
        skill3: "Algoritmos y estructuras de datos",
        skill4: "Linux, Docker, entornos de desarrollo",
        skill5: "Git y despliegues (Vercel/Netlify/AWS)",
        skill6: "Buenas prácticas y metodologías ágiles"
      },
      education: {
        title: "Educación",
        item1_title: "Grado en Ingeniería Informática — Universitat de Girona",
        item2_title: "CFGS Desarrollo de Aplicaciones Web — Institut Montilivi",
        item3_title: "CFGM Sistemas Microinformáticos y Redes — Institut Cendrassos"
      },
      experience: {
        title: "Experiencia",
        item1_title: "Técnico IT — Ajuntament de l'Escala (Prácticas)",
        item1_text: "Soporte en mantenimiento de equipos, resolución de incidencias, instalación de software y ayuda en gestión de redes y sistemas.",
        item2_title: "Desarrollador frontend — Accenture (Prácticas)",
        item2_text: "Mantenimiento de aplicaciones web, soporte en diseño de interfaces e implementación de funcionalidades con tecnologías frontend."
      },
      projects: {
        title: "Proyectos",
        p1_desc: "Interfaz moderna con rendimiento optimizado y SEO.",
        p2_desc: "Full‑stack con Node.js, API REST y base de datos.",
        p3_desc: "Dashboard en tiempo real y CI/CD con Docker.",
        view: "Ver"
      },
      contact: {
        title: "Contacto", name: "Nombre", email: "Email", message: "Mensaje", send: "Enviar"
      },
      footer: { made: "Hecho con HTML, CSS y JavaScript." }
    },
    ca: {
      nav: { about: "Sobre mi", education: "Educació", experience: "Experiència", projects: "Projectes", contact: "Contacte" },
      hero: {
        availability: "Disponible per a col·laboracions · Catalunya",
        greeting: "Hola! Sóc l'",
        subtitle: "Enginyer Informàtic especialitzat en desenvolupament web.",
        cta: "Veure projectes",
        cv: "Descarregar currículum"
      },
      about: {
        title: "Sobre mi",
        who_title: "Qui sóc?",
        who_text: "Sóc estudiant d'enginyeria informàtica especialitzat en desenvolupament web. M'agrada crear aplicacions modernes, accessibles i eficients cuidant el disseny i l'arquitectura del codi.",
        skills_title: "Competències clau",
        skill1: "HTML, CSS, JavaScript (ES6+), React/Vue",
        skill2: "Node.js, Express, MongoDB/MySQL",
        skill3: "Algorismes i estructures de dades",
        skill4: "Linux, Docker, entorns de desenvolupament",
        skill5: "Git i desplegaments (Vercel/Netlify/AWS)",
        skill6: "Bones pràctiques i metodologies àgils"
      },
      education: {
        title: "Educació",
        item1_title: "Grau en Enginyeria Informàtica — Universitat de Girona",
        item2_title: "CFGS Desenvolupament d'Aplicacions Web — Institut Montilivi",
        item3_title: "CFGM Sistemes Microinformàtics i Xarxes — Institut Cendrassos"
      },
      experience: {
        title: "Experiència",
        item1_title: "Tècnic IT — Ajuntament de l'Escala (Pràctiques)",
        item1_text: "Suport en manteniment d'equips, resolució d'incidències, instal·lació de programari i ajuda en gestió de xarxes i sistemes.",
        item2_title: "Desenvolupador Frontend — Accenture (Pràctiques)",
        item2_text: "Manteniment d'aplicacions web, suport en disseny d'interfícies i implementació de funcionalitats amb tecnologies frontend."
      },
      projects: {
        title: "Projectes",
        p1_desc: "Salutsegura.cat va ser la web per al concurs WAPPS de la fundació .cat, la qual va obtenir la primera plaça el 2020.",
        view: "Veure"
      },
      contact: {
        title: "Contacte", name: "Nom", email: "Email", message: "Missatge", send: "Enviar"
      },
      footer: { made: "Fet amb HTML, CSS i JavaScript." }
    },
    en: {
      nav: { about: "About", education: "Education", experience: "Experience", projects: "Projects", contact: "Contact" },
      hero: {
        availability: "Available for collaborations · Catalonia",
        greeting: "Hi! I'm",
        subtitle: "Computer Engineering student focused on web development.",
        cta: "View projects",
        cv: "Download résumé"
      },
      about: {
        title: "About",
        who_title: "Who am I?",
        who_text: "I'm a computer engineering student specialized in web development. I enjoy building modern, accessible and efficient apps, caring for both design and code architecture.",
        skills_title: "Key skills",
        skill1: "HTML, CSS, JavaScript (ES6+), React/Vue",
        skill2: "Node.js, Express, MongoDB/MySQL",
        skill3: "Algorithms and data structures",
        skill4: "Linux, Docker, development environments",
        skill5: "Git and deployments (Vercel/Netlify/AWS)",
        skill6: "Best practices and agile methodologies"
      },
      education: {
        title: "Education",
        item1_title: "Bachelor's in Computer Engineering — University of Girona",
        item2_title: "Higher VET in Web App Development — Institut Montilivi",
        item3_title: "Intermediate VET in Microcomputer Systems & Networks — Institut Cendrassos"
      },
      experience: {
        title: "Experience",
        item1_title: "IT Technician — Ajuntament de l'Escala (Internship)",
        item1_text: "Support on equipment maintenance, troubleshooting, software installation and assistance in network & systems management.",
        item2_title: "Frontend Developer — Accenture (Internship)",
        item2_text: "Maintained web apps, supported interface design and implemented features using frontend technologies."
      },
      projects: {
        title: "Projects",
        p1_desc: "Salutsegura.cat was a web made for WAPPS competition of .puntCat foundation, which got the first place in 2020.",
        view: "View"
      },
      contact: {
        title: "Contact", name: "Name", email: "Email", message: "Message", send: "Send"
      },
      footer: { made: "Made with HTML, CSS & JavaScript." }
    }
  };

  function applyLang(lang) {
    const dict = T[lang] || T.es;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const path = el.getAttribute('data-i18n').split('.');
      let text = dict;
      for (const p of path) { text = text?.[p]; }
      if (typeof text === 'string') el.textContent = text;
    });
    localStorage.setItem('lang', lang);
    // Update UI state
    document.querySelectorAll('.lang-switch .chip').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.lang === lang);
    });
  }

  const storedLang = localStorage.getItem('lang') || 'en';
  applyLang(storedLang);

  langButtons.forEach(btn => {
    btn.addEventListener('click', () => applyLang(btn.dataset.lang));
  });
})();