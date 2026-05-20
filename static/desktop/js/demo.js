const teamButtons =
    document.querySelectorAll('.team-btn');

const platformButtons =
    document.querySelectorAll('.platform-btn');

const range =
    document.getElementById('hours-range');

const hoursValue =
    document.getElementById('hours-value');

const lostHours =
    document.getElementById('lost-hours');

const lostMoney =
    document.getElementById('lost-money');

const savedHours =
    document.getElementById('saved-hours');

const savedMoney =
    document.getElementById('saved-money');

const lostHoursText =
    document.getElementById('lost-hours-text');

const savedHoursText =
    document.getElementById('saved-hours-text');

let teamSize = 20;
let platformMultiplier = 1;
let platform = 'telegram';

function getHoursWord(hours) {

    const lastTwo = hours % 100;
    const last = hours % 10;

    if (lastTwo >= 11 && lastTwo <= 14) {
        return 'часов';
    }

    if (last === 1) {
        return 'час';
    }

    if (last >= 2 && last <= 4) {
        return 'часа';
    }

    return 'часов';
}

function updateActiveState(
    buttons,
    activeButton
) {

    buttons.forEach(btn => {

        btn.classList.remove(
            'border-primary',
            'bg-primary/10',
            'text-primary'
        );

        btn.classList.add(
            'border-black/5',
            'dark:border-white/10',
            'bg-white/60',
            'dark:bg-white/[0.03]',
            'text-text/60'
        );

    });

    activeButton.classList.add(
        'border-primary',
        'bg-primary/10',
        'text-primary'
    );

    activeButton.classList.remove(
        'border-black/5',
        'dark:border-white/10',
        'bg-white/60',
        'dark:bg-white/[0.03]',
        'text-text/60'
    );
}

function updateURL() {

    const params = new URLSearchParams();

    params.set('team', teamSize);
    params.set('hours', range.value);
    params.set('platform', platform);

    const newUrl =
        `${window.location.pathname}?${params.toString()}`;

    window.history.replaceState(
        {},
        '',
        newUrl
    );
}

function updateCalculator() {

    const hours = Number(range.value);

    hoursValue.textContent =
        `${hours} ${getHoursWord(hours)}`;

    const totalHours = Math.round(
        hours *
        (teamSize / 10) *
        platformMultiplier
    );

    const totalMoney =
        totalHours * 10000;

    const recoveredHours =
        Math.round(totalHours * 0.8);

    const recoveredMoney =
        Math.round(totalMoney * 0.8);

    lostHours.textContent =
        totalHours;

    lostMoney.textContent =
        totalMoney.toLocaleString('ru-RU') + ' ₽';

    savedHours.textContent =
        '~' + recoveredHours;

    savedMoney.textContent =
        '~' +
        recoveredMoney.toLocaleString('ru-RU') +
        ' ₽';

    lostHoursText.textContent =
        `${getHoursWord(totalHours)} в месяц`;

    savedHoursText.textContent =
        `${getHoursWord(recoveredHours)} в месяц`;

    updateURL();
}

function loadFromURL() {

    const params =
        new URLSearchParams(window.location.search);

    const team =
        params.get('team');

    const hours =
        params.get('hours');

    const urlPlatform =
        params.get('platform');

    if (team) {

        teamSize = Number(team);

        teamButtons.forEach(btn => {

            if (
                Number(btn.dataset.team) === teamSize
            ) {
                updateActiveState(
                    teamButtons,
                    btn
                );
            }

        });

    }

    if (hours) {
        range.value = hours;
    }

    if (urlPlatform) {

        platform = urlPlatform;

        platformButtons.forEach(btn => {

            if (
                btn.dataset.platform === platform
            ) {

                platformMultiplier =
                    Number(btn.dataset.multiplier);

                updateActiveState(
                    platformButtons,
                    btn
                );
            }

        });

    }

}

teamButtons.forEach(button => {

    button.addEventListener('click', () => {

        teamSize =
            Number(button.dataset.team);

        updateActiveState(
            teamButtons,
            button
        );

        updateCalculator();

    });

});

platformButtons.forEach(button => {

    button.addEventListener('click', () => {

        platform =
            button.dataset.platform;

        platformMultiplier =
            Number(button.dataset.multiplier);

        updateActiveState(
            platformButtons,
            button
        );

        updateCalculator();

    });

});

range.addEventListener(
    'input',
    updateCalculator
);

loadFromURL();
updateCalculator();