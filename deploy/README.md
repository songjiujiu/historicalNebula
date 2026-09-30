# Flask + MySQL deployment

The frontend only contains UI assets. Vite copies `public/site`, so `public/data` is retained as a reviewed import source but absent from `dist`. Reader fetches go to `/api/v1/data/<corpus path>`; the backend reads the active version from MySQL. The six supported path families are Shiji volumes/search/manifest, dynastic volumes/search, modern chapters/documents/manifest, and Qing volumes/search/manifest. The endpoint is read-only, limits paths, returns ETag and a five-minute cache header. `/api/v1/health` checks the active database release.

On this server other services already own ports 3306 and 8000. The new MySQL service is bound to `127.0.0.1:3307`; Flask uses `127.0.0.1:18763`, behind the existing Nginx site on port 80. The service's `hn_reader` account receives only `SELECT`; the import account has write privileges. Passwords live in root-readable `/etc/historical-nebula/{api,import}.env`, not in Git or website assets.

Build locally with `npm run build`, create a frontend archive from `dist`, and push the `codex/flask-mysql-api` branch. On the server, pull the exact commit into `/srv/historical-nebula/source`, create `/srv/historical-nebula/venv`, install `backend/requirements.txt`, and run `python -m backend.import_corpus --root public/data --release <unique-id>` with the import environment. The importer validates each JSON file before writing, checks row and byte counts, then switches the active database release. Install `historical-nebula-api.service` and `nginx.conf`, switch `current` to the new UI release only after `/api/v1/health` and sample content requests pass. Check old static `/data/` URLs return 404, then remove retired UI releases. The importer keeps the prior database release until it has activated the new one, so an import failure does not change the live content.

For local development, install `backend/requirements-dev.txt`, configure `HISTORY_DB_HOST`, `HISTORY_DB_PORT`, `HISTORY_DB_NAME`, `HISTORY_DB_USER`, `HISTORY_DB_PASSWORD`, run `flask --app 'backend.app:create_app' run`, then `npm run dev`. Vite proxies `/api` to Flask at `127.0.0.1:5000` by default. Source data is not served by Vite.

Background and source metadata remain bundled in the frontend for instant navigation; full book text, search indexes, modern prose, original documents, and Qing chapters are read from MySQL through Flask.

## Jenkins builds

The `historical-nebula-build` Jenkins job reads the committed revision in `/srv/historical-nebula/source` and extracts it into an isolated workspace. It runs the frontend tests, builds the Vite app, runs the Flask backend tests, and archives `historical-nebula-<revision>.tar.gz`. A build does not change the live site or database. To build newer code, update the server source checkout first, then run the job.

Jenkins is bound to `127.0.0.1:8080` on the server. Access it through an SSH tunnel: `ssh -L 8080:127.0.0.1:8080 ubuntu@82.157.197.102`, then visit `http://localhost:8080/`. The administrator password is stored on the server at `/etc/jenkins-admin.secret` with restricted permissions. The job configuration is versioned as `deploy/jenkins-job.xml`; its build commands live in `deploy/jenkins-build.sh`.
