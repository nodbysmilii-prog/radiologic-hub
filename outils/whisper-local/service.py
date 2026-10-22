#!/usr/bin/env python3
"""RadiologicHub — service local de transcription (Whisper, whisper.cpp).

Relie la dictée du site (page Comptes rendus) au moteur Whisper installé sur CE poste.
  • écoute uniquement sur 127.0.0.1 (boucle locale), jamais sur le réseau ;
  • origines du site autorisées une par une (pas de CORS universel) ;
  • appairage : un jeton aléatoire, gardé dans le dossier d'installation (droits 600),
    à coller une fois dans les réglages de la dictée ; chaque requête le présente ;
  • audio reçu : WAV PCM 16 bits, mono, 16 kHz (le navigateur convertit lui-même le micro),
    en-tête vérifié ; taille et durée limitées ;
  • transcription par whisper-cli (français forcé, transcription et non traduction,
    détection de la voix si le modèle Silero est présent) ; fichier temporaire supprimé
    juste après, même en cas d'erreur ; aucun port Whisper ouvert (le whisper-server
    officiel répond « Access-Control-Allow-Origin: * » : il n'est pas utilisé) ;
  • journal sans audio ni texte : seulement durée, taille, temps de calcul, code de retour ;
  • aucun envoi vers l'extérieur.

Usage :  python3 outils/whisper-local/service.py [--modele small|medium] [--port 8737]
         Ctrl+C pour arrêter. Voir outils/whisper-local/README.md.
Python 3.9+ (bibliothèque standard seulement)."""
import argparse, http.server, json, os, platform, re, secrets, shutil, struct, subprocess, sys, tempfile, threading, time

VERSION = 1
ORIGINES_DEFAUT = ['https://nodbysmilii-prog.github.io', 'http://127.0.0.1:8737', 'http://localhost:8737',
                   'http://127.0.0.1:8000', 'http://localhost:8000']
DUREE_MAX_S = 120          # par enregistrement (mode « après l'arrêt ») ; les segments sont bien plus courts
TAILLE_MAX = 44 + DUREE_MAX_S * 16000 * 2
CONTEXTE_MAX = 600         # caractères du contexte initial (prompt)
# Textes que Whisper produit parfois sur du silence ou du bruit (sous-titrage) : écartés seulement
# s'ils constituent TOUTE la transcription.
HALLUCINATIONS = [r"sous-titr\w* (réalisés |fait )?(par|de) .*", r"merci d'avoir regardé.*", r"abonnez-vous.*",
                  r"\[?musique\]?", r"\(?silence\)?", r"\.+", r"amara\.org.*", r"…+"]


def dossier_defaut():
    if os.environ.get('RH_WHISPER_DIR'):
        return os.path.expanduser(os.environ['RH_WHISPER_DIR'])
    if platform.system() == 'Darwin':
        return os.path.expanduser('~/Library/Application Support/RadiologicHub/whisper')
    return os.path.expanduser('~/.local/share/radiologichub/whisper')


def journal(*m):
    print(time.strftime('%H:%M:%S'), *m, flush=True)


def lire_wav(data):
    """Vérifie un WAV PCM 16 bits mono 16 kHz ; renvoie la durée en secondes. Lève ValueError sinon."""
    if len(data) < 44 or data[:4] != b'RIFF' or data[8:12] != b'WAVE':
        raise ValueError('format : WAV attendu')
    i, fmt, n_data = 12, None, None
    while i + 8 <= len(data):
        cid, taille = data[i:i + 4], struct.unpack('<I', data[i + 4:i + 8])[0]
        if cid == b'fmt ':
            fmt = struct.unpack('<HHIIHH', data[i + 8:i + 24])
        elif cid == b'data':
            n_data = min(taille, len(data) - i - 8)
            break
        i += 8 + taille + (taille & 1)
    if not fmt or n_data is None:
        raise ValueError('format : en-tête WAV incomplet')
    codage, canaux, frequence, _, _, bits = fmt
    if (codage, canaux, frequence, bits) != (1, 1, 16000, 16):
        raise ValueError('format : PCM 16 bits mono 16 kHz attendu')
    return n_data / (16000 * 2)


def nettoyer(texte):
    t = re.sub(r'\s+', ' ', texte or '').strip()
    if any(re.fullmatch(h, t, flags=re.I) for h in HALLUCINATIONS):
        return ''
    return t


class Moteur:
    def __init__(self, dossier, modele, fils):
        self.dossier, self.modele, self.fils = dossier, modele, fils
        self.cli = next((p for p in [os.path.join(dossier, 'whisper.cpp', 'build', 'bin', 'whisper-cli')] if os.path.exists(p)), None)
        self.chemin_modele = os.path.join(dossier, 'modeles', f'ggml-{modele}.bin')
        vad = os.path.join(dossier, 'modeles', 'ggml-silero-v5.1.2.bin')
        self.vad = vad if os.path.exists(vad) else None
        self.verrou = threading.Lock()      # une transcription à la fois (mémoire, ordre des segments)

    def etat(self):
        return {'pret': bool(self.cli) and os.path.exists(self.chemin_modele), 'modele': self.modele,
                'executable': bool(self.cli), 'fichierModele': os.path.exists(self.chemin_modele), 'vad': bool(self.vad)}

    def transcrire(self, wav, contexte=''):
        fd, chemin = tempfile.mkstemp(prefix='rh-dictee-', suffix='.wav')
        try:
            with os.fdopen(fd, 'wb') as f:
                f.write(wav)
            os.chmod(chemin, 0o600)
            cmd = [self.cli, '-m', self.chemin_modele, '-f', chemin, '-l', 'fr', '-t', str(self.fils),
                   '-nt', '-np', '-sns', '-nth', '0.6', '-bs', '5', '-bo', '5']   # français forcé, pas de -tr (traduction)
            if self.vad:
                cmd += ['--vad', '-vm', self.vad, '-vsd', '300', '-vp', '200']
            if contexte:
                cmd += ['--prompt', contexte[:CONTEXTE_MAX]]
            with self.verrou:
                r = subprocess.run(cmd, capture_output=True, timeout=DUREE_MAX_S * 4, text=True)
            if r.returncode != 0:
                raise RuntimeError(f'whisper-cli code {r.returncode}')          # stderr non journalisé (peut contenir du texte)
            return nettoyer(r.stdout)
        finally:
            try:
                os.remove(chemin)
            except OSError:
                pass


def fabrique(moteur, jeton, origines, site):
    class Gestion(http.server.BaseHTTPRequestHandler):
        server_version = 'RadiologicHub-Whisper'
        sys_version = ''

        def log_message(self, *a):          # pas de journal automatique (chemins, en-têtes)
            pass

        def _cors(self):
            o = self.headers.get('Origin')
            if o and o in origines:
                self.send_header('Access-Control-Allow-Origin', o)
                self.send_header('Vary', 'Origin')
                self.send_header('Access-Control-Allow-Headers', 'authorization, content-type, x-rh-contexte')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Max-Age', '600')
                # Chrome : accès d'une page publique (HTTPS) à la boucle locale
                if self.headers.get('Access-Control-Request-Private-Network'):
                    self.send_header('Access-Control-Allow-Private-Network', 'true')

        def _json(self, code, obj):
            corps = json.dumps(obj, ensure_ascii=False).encode()
            self.send_response(code)
            self._cors()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(corps)))
            self.end_headers()
            self.wfile.write(corps)

        def _origine_ok(self):
            o = self.headers.get('Origin')
            return o is None or o in origines   # sans Origin : outil local (curl, tests)

        def _hote_ok(self):                     # parade au « DNS rebinding »
            h = (self.headers.get('Host') or '').split(':')[0]
            return h in ('127.0.0.1', 'localhost')

        def _auth_ok(self):
            a = self.headers.get('Authorization', '')
            return a.startswith('Bearer ') and secrets.compare_digest(a[7:].strip(), jeton)

        def do_OPTIONS(self):
            if not self._hote_ok() or not self._origine_ok():
                return self._json(403, {'erreur': 'origine non autorisée'})
            self.send_response(204)
            self._cors()
            self.end_headers()

        def do_GET(self):
            if not self._hote_ok() or not self._origine_ok():
                return self._json(403, {'erreur': 'origine non autorisée'})
            chemin = self.path.split('?')[0]
            if chemin == '/etat':
                e = {'service': 'radiologichub-whisper', 'version': VERSION, 'appaire': self._auth_ok()}
                if e['appaire']:
                    e.update(moteur.etat())
                return self._json(200, e)
            if site and chemin.startswith('/site/'):
                return self._fichier(chemin[len('/site/'):])
            return self._json(404, {'erreur': 'introuvable'})

        def _fichier(self, rel):
            """Sert le site lui-même sur http://127.0.0.1 (navigateurs qui bloquent l'accès HTTPS → boucle locale)."""
            rel = rel or 'comptes-rendus.html'
            p = os.path.realpath(os.path.join(site, rel))
            if not p.startswith(os.path.realpath(site) + os.sep) or not os.path.isfile(p) or '/.git' in p:
                return self._json(404, {'erreur': 'introuvable'})
            types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
                     '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2'}
            with open(p, 'rb') as f:
                d = f.read()
            self.send_response(200)
            self.send_header('Content-Type', types.get(os.path.splitext(p)[1], 'application/octet-stream'))
            self.send_header('Content-Length', str(len(d)))
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(d)

        def do_POST(self):
            if not self._hote_ok() or not self._origine_ok():
                return self._json(403, {'erreur': 'origine non autorisée'})
            try:
                n = int(self.headers.get('Content-Length') or 0)
            except ValueError:
                n = 0
            # Le corps est toujours lu (ou la connexion fermée) avant de répondre : un refus ne coupe pas la requête.
            if n > 64 * 1024 * 1024:
                self.close_connection = True
                return self._json(413, {'erreur': f'enregistrement trop long (maximum {DUREE_MAX_S} s)'})
            corps, lu = bytearray(), 0
            while lu < n:                           # au-delà de la limite : lu et jeté
                bloc = self.rfile.read(min(65536, n - lu))
                if not bloc:
                    break
                lu += len(bloc)
                if len(corps) <= TAILLE_MAX:
                    corps += bloc
            corps = bytes(corps)
            if self.path.split('?')[0] != '/transcrire':
                return self._json(404, {'erreur': 'introuvable'})
            if not self._auth_ok():
                return self._json(401, {'erreur': 'appairage requis'})
            if not corps or int(self.headers.get('Content-Length') or 0) > TAILLE_MAX:
                return self._json(413, {'erreur': f'enregistrement trop long ou vide (maximum {DUREE_MAX_S} s)'})
            if not moteur.etat()['pret']:
                return self._json(503, {'erreur': 'Whisper non installé : lancez outils/whisper-local/installer.sh', **moteur.etat()})
            wav = corps
            try:
                duree = lire_wav(wav)
            except ValueError as e:
                return self._json(415, {'erreur': str(e)})
            if duree > DUREE_MAX_S:
                return self._json(413, {'erreur': f'enregistrement trop long (maximum {DUREE_MAX_S} s)'})
            contexte = ''
            try:   # contexte initial (termes de l'examen actif), encodé en URI par le navigateur
                from urllib.parse import unquote
                contexte = unquote(self.headers.get('X-RH-Contexte', ''))[:CONTEXTE_MAX]
            except Exception:
                contexte = ''
            t0 = time.time()
            try:
                texte = moteur.transcrire(wav, contexte)
            except subprocess.TimeoutExpired:
                journal(f'transcription : délai dépassé (audio {duree:.1f} s)')
                return self._json(504, {'erreur': 'transcription trop longue'})
            except Exception as e:
                journal(f'transcription : échec ({type(e).__name__})')
                return self._json(500, {'erreur': 'échec de la transcription locale'})
            calcul = time.time() - t0
            journal(f'transcription : audio {duree:.1f} s, calcul {calcul:.2f} s, {len(wav) // 1024} ko, {"texte" if texte else "vide"}')
            return self._json(200, {'texte': texte, 'duree': round(duree, 2), 'calcul': round(calcul, 2), 'modele': moteur.modele})

    return Gestion


def main():
    ap = argparse.ArgumentParser(description='Service local de transcription Whisper pour RadiologicHub')
    ap.add_argument('--dossier', default=dossier_defaut())
    ap.add_argument('--modele', default=None, help='small (défaut), medium, small-q5_1…')
    ap.add_argument('--port', type=int, default=8737)
    ap.add_argument('--fils', type=int, default=max(2, min(8, (os.cpu_count() or 4))))
    ap.add_argument('--origine', action='append', default=[], help='origine supplémentaire autorisée (ex. http://localhost:5500)')
    ap.add_argument('--site', default=os.path.realpath(os.path.join(os.path.dirname(__file__), '..', '..')),
                    help='dossier du site servi sur /site/ (ou « non »)')
    ap.add_argument('--nouveau-jeton', action='store_true', help='refaire l\'appairage')
    a = ap.parse_args()

    os.makedirs(a.dossier, exist_ok=True)
    cfg_p = os.path.join(a.dossier, 'config.json')
    cfg = json.load(open(cfg_p)) if os.path.exists(cfg_p) else {}
    modele = a.modele or cfg.get('modele', 'small')
    if modele.endswith('.en') or '.en-' in modele:
        sys.exit('Modèle anglais seulement (.en) : choisissez un modèle multilingue (small, medium…).')
    jeton_p = os.path.join(a.dossier, 'jeton')
    if a.nouveau_jeton or not os.path.exists(jeton_p):
        with open(jeton_p, 'w') as f:
            f.write(secrets.token_urlsafe(24))
        os.chmod(jeton_p, 0o600)
    jeton = open(jeton_p).read().strip()
    origines = set(ORIGINES_DEFAUT + a.origine + cfg.get('origines', []))
    site = None if a.site == 'non' else a.site

    moteur = Moteur(a.dossier, modele, a.fils)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', a.port), fabrique(moteur, jeton, origines, site))
    e = moteur.etat()
    print(f'\nRadiologicHub — Whisper local sur http://127.0.0.1:{a.port}  (boucle locale uniquement)')
    print(f'Modèle : {modele} — {"prêt" if e["pret"] else "NON INSTALLÉ (lancez installer.sh)"}'
          f'{" ; détection de la voix (Silero)" if e["vad"] else ""}')
    print(f'Code d\'appairage (à coller une fois dans Dictée › Réglages) :\n\n    {jeton}\n')
    if site:
        print(f'Site servi en local (Safari) : http://127.0.0.1:{a.port}/site/comptes-rendus.html')
    print('Ctrl+C pour arrêter.\n', flush=True)
    with open(os.path.join(a.dossier, 'service.pid'), 'w') as f:
        f.write(str(os.getpid()))
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()
        try:
            os.remove(os.path.join(a.dossier, 'service.pid'))
        except OSError:
            pass
        print('\nService arrêté.')


if __name__ == '__main__':
    main()
