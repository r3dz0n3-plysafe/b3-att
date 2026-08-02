import { copyFileSync } from 'node:fs';

// GitHub Pages punya no server-side rewrite, jadi route SPA (mis. /login, /admin) yang
// diakses langsung/refresh akan 404. Trik standarnya: salin index.html jadi 404.html —
// GitHub Pages menyajikan 404.html untuk path yang tidak match file, lalu React Router
// mengambil alih dari sana secara client-side.
copyFileSync('dist/index.html', 'dist/404.html');
