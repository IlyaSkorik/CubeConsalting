# CubeConsalting

Современный landing page для консалтинговой компании, разработанный на Django + Tailwind CSS v4.

---

# Используемые технологии

- Django
- Tailwind CSS v4
- Кастомная система тем
- Раздельные стили для desktop и mobile
- Локальные шрифты (Geist + Inter)

---

# Структура проекта

```bash
static/
│
├── src/
│   ├── base.css
│   ├── desktop.css
│   └── mobile.css
│
├── desktop/css/
│   └── desktop.css
│
├── mobile/css/
│   └── mobile.css
│
└── fonts/
````

---

# Установка проекта

## 1. Клонирование репозитория

```bash id="2vs6qg"
git clone <repo-url>
cd CubeConsalting
```

---

## 2. Создание виртуального окружения

```bash id="7t7afm"
python -m venv .venv
```

Активация:

### Windows

```bash id="ckp0ig"
.venv\Scripts\activate
```

### Linux / macOS

```bash id="d6ypry"
source .venv/bin/activate
```

---

## 3. Установка Python зависимостей

```bash id="24u61v"
pip install -r requirements.txt
```

---

## 4. Установка Node.js зависимостей

```bash id="4g2m6z"
npm install
```

---

# Разработка Tailwind CSS

## Запуск desktop стилей

```bash id="b41m8q"
npm run dev:desktop
```

Компилирует:

```bash id="7azkql"
static/src/desktop.css
↓
static/desktop/css/desktop.css
```

---

## Запуск mobile стилей

```bash id="gxub2j"
npm run dev:mobile
```

Компилирует:

```bash id="r7mt3n"
static/src/mobile.css
↓
static/mobile/css/mobile.css
```

---

# Production сборка

```bash id="q2uln4"
npm run build
```

---

# Запуск Django сервера

```bash id="k8psnr"
python manage.py runserver
```

---

# Система тем

В проекте реализованы:

* Тёмная тема (по умолчанию)
* Светлая тема

Переключение темы:

```js id="qeuoq8"
document.documentElement.setAttribute("data-theme", "light")
```

Возврат к тёмной теме:

```js id="zwx2ea"
document.documentElement.removeAttribute("data-theme")
```

---

# Шрифты

Используются локальные шрифты:

* Geist — заголовки
* Inter — основной текст

Подключение выполняется через `@font-face`.

---

# Особенности проекта

* Используется Tailwind CSS v4
* Кастомная система design tokens через `@theme`
* Раздельная архитектура desktop/mobile стилей
* Автоматическое сканирование шаблонов через `@source`

---
