"""
App entry point for ispmanager (Hoster.by).

This file works in two modes:

* **Imported as a WSGI module** (classic Passenger): the host imports this file
  and uses the ``application`` callable.
* **Run as a script** (ispmanager's PM2-based Python apps): PM2 launches
  ``python passenger_wsgi.py`` and passes the listen port in ``$PORT``. In that
  case the ``__main__`` block below execs gunicorn to actually serve the app on
  ``127.0.0.1:$PORT`` — the address nginx proxies to.

The INTERP block forces the project's virtualenv interpreter so the app always
runs with the right Python and installed packages (Django, gunicorn, PyMySQL,
…) regardless of the host's default interpreter.
"""
import os
import sys

# --- Force the virtualenv interpreter ---------------------------------------
INTERP = os.path.join(os.path.dirname(__file__), ".venv", "bin", "python")
if sys.executable != INTERP and os.path.exists(INTERP):
    os.execl(INTERP, INTERP, *sys.argv)

# Ensure the project root is on the import path.
sys.path.insert(0, os.path.dirname(__file__))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.core.wsgi import get_wsgi_application  # noqa: E402

application = get_wsgi_application()


# When launched directly (ispmanager/PM2: `python passenger_wsgi.py`), serve the
# WSGI app with gunicorn on the port the panel assigns via $PORT. Under classic
# Passenger this block never runs — the host imports `application` instead.
if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    bind = "127.0.0.1:" + os.environ.get("PORT", "20003")
    gunicorn = os.path.join(here, ".venv", "bin", "gunicorn")
    os.execl(
        gunicorn,
        gunicorn,
        "config.wsgi:application",
        "--bind",
        bind,
        "--workers",
        "3",
    )
