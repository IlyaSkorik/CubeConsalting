const themeToggleBtn = document.getElementById('theme-toggle');
const themeThumb = document.getElementById('theme-thumb');

const htmlElement = document.documentElement;

function animateThumb(position) {
    themeThumb.style.transform = `${position} scale(1.08)`;

    setTimeout(() => {
        themeThumb.style.transform = `${position} scale(1)`;
    }, 180);
}

function updateThemeUI(theme) {
    if (theme === 'dark') {
        animateThumb('translateX(26px)');
    } else {
        animateThumb('translateX(0px)');
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