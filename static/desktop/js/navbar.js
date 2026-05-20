const themeToggleBtn = document.getElementById('theme-toggle');
const themeThumb = document.getElementById('theme-thumb');

const sunIcon = document.getElementById('sun-icon');
const moonIcon = document.getElementById('moon-icon');

const htmlElement = document.documentElement;

function animateThumb(position) {
    themeThumb.style.transform = `${position} scale(1.08)`;

    setTimeout(() => {
        themeThumb.style.transform = `${position} scale(1)`;
    }, 180);
}

function updateThemeUI(theme) {

    if (theme === 'dark') {

        animateThumb('translateX(22px)');

        moonIcon.classList.remove('text-secondary', 'opacity-70');
        moonIcon.classList.add(
            'text-primary',
            'opacity-100',
            'drop-shadow-[0_0_8px_var(--primary)]'
        );

        sunIcon.classList.remove(
            'text-primary',
            'opacity-100',
            'drop-shadow-[0_0_8px_var(--primary)]'
        );

        sunIcon.classList.add('text-secondary', 'opacity-70');

    } else {

        animateThumb('translateX(0px)');

        sunIcon.classList.remove('text-secondary', 'opacity-70');
        sunIcon.classList.add(
            'text-primary',
            'opacity-100',
            'drop-shadow-[0_0_8px_var(--primary)]'
        );

        moonIcon.classList.remove(
            'text-primary',
            'opacity-100',
            'drop-shadow-[0_0_8px_var(--primary)]'
        );

        moonIcon.classList.add('text-secondary', 'opacity-70');
    }
}

function initTheme() {

    const savedTheme = localStorage.getItem('theme');

    if (savedTheme) {

        htmlElement.setAttribute('data-theme', savedTheme);
        updateThemeUI(savedTheme);

    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {

        htmlElement.setAttribute('data-theme', 'dark');
        updateThemeUI('dark');

    } else {

        htmlElement.setAttribute('data-theme', 'light');
        updateThemeUI('light');
    }
}

themeToggleBtn.addEventListener('click', () => {

    const currentTheme = htmlElement.getAttribute('data-theme');

    if (currentTheme === 'dark') {

        htmlElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');

        updateThemeUI('light');

    } else {

        htmlElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');

        updateThemeUI('dark');
    }
});

initTheme();