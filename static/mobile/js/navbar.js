document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('menu-toggle-btn');
    const menu = document.getElementById('mobile-menu');
    const burger = document.getElementById('burger-icon');
    const close = document.getElementById('close-icon');
    const themeBtn = document.getElementById('theme-toggle');
    const html = document.documentElement;

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const isLight = html.getAttribute('data-theme') === 'light';
            if (isLight) {
                html.removeAttribute('data-theme');
                localStorage.setItem('theme', 'dark');
            } else {
                html.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
            }
        });
    }

    if (btn && menu) {
        btn.addEventListener('click', () => {
            const isClosed = menu.classList.contains('translate-x-full');

            if (isClosed) {
                menu.classList.remove('translate-x-full', 'opacity-0', 'pointer-events-none');
                burger.classList.add('opacity-0', 'scale-50', 'rotate-90');
                close.classList.remove('opacity-0', 'scale-50', 'rotate-[-90deg]');
                document.body.style.overflow = 'hidden';
            } else {
                menu.classList.add('translate-x-full', 'opacity-0', 'pointer-events-none');
                burger.classList.remove('opacity-0', 'scale-50', 'rotate-90');
                close.classList.add('opacity-0', 'scale-50', 'rotate-[-90deg]');
                document.body.style.overflow = '';
            }
        });
    }
});