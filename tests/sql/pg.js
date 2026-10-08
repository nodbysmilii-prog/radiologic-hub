/* =========================================================
   Outils de test : base PostgreSQL temporaire avec simulation de Supabase
   et migrations du dépôt appliquées. Utilisé par tests/sql/rls.js et
   tests/sql/integration.js.
   ========================================================= */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const racine = path.join(__dirname, '..', '..');
const bin = ['/usr/lib/postgresql/17/bin', '/usr/lib/postgresql/16/bin', '/usr/lib/postgresql/15/bin', '/usr/local/bin', '/usr/bin'].find(d => fs.existsSync(path.join(d, 'initdb')));

function demarrer() {
  if (!bin) return null;
  const estRoot = process.getuid && process.getuid() === 0;
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-pg-'));
  const port = String(54000 + Math.floor(Math.random() * 900));
  const enPostgres = (cmd, args) => (estRoot ? execFileSync('runuser', ['-u', 'postgres', '--', path.join(bin, cmd), ...args], { stdio: 'pipe' }) : execFileSync(path.join(bin, cmd), args, { stdio: 'pipe' }));
  if (estRoot) { execFileSync('chown', ['postgres', dossier]); fs.chmodSync(dossier, 0o755); }
  enPostgres('initdb', ['-D', dossier, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C']);
  enPostgres('pg_ctl', ['-D', dossier, '-o', `-k ${dossier} -p ${port} -c listen_addresses=''`, '-w', '-l', path.join(dossier, 'log'), 'start']);

  /* psql(sql, { utilisateur: { id, email }, role }) → { sortie, erreur } */
  function psql(sql, { utilisateur, role = 'postgres' } = {}) {
    let script = sql;
    if (role !== 'postgres') {
      const claims = role === 'anon' ? { role: 'anon' } : role === 'service_role' ? { role: 'service_role' } : { sub: utilisateur.id, email: utilisateur.email, role: 'authenticated' };
      script = `begin;\nset local role ${role};\nset local "request.jwt.claims" = '${JSON.stringify(claims)}';\n${sql};\ncommit;`;
    }
    try {
      return { sortie: execFileSync(path.join(bin, 'psql'), ['-h', dossier, '-p', port, '-U', 'postgres', '-d', 'postgres', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', script], { stdio: 'pipe' }).toString().trim(), erreur: null };
    } catch (e) {
      return { sortie: '', erreur: e.stderr.toString() };
    }
  }
  const admin = sql => { const r = psql(sql); if (r.erreur) throw new Error(r.erreur); return r.sortie; };
  admin(fs.readFileSync(path.join(__dirname, 'supabase-simule.sql'), 'utf8'));
  for (const f of fs.readdirSync(path.join(racine, 'supabase', 'migrations')).sort()) admin(fs.readFileSync(path.join(racine, 'supabase', 'migrations', f), 'utf8'));
  const arreter = () => {
    try { enPostgres('pg_ctl', ['-D', dossier, '-m', 'fast', 'stop']); } catch (e) { /* déjà arrêté */ }
    fs.rmSync(dossier, { recursive: true, force: true });
  };
  return { psql, admin, dossier, port, arreter };
}

module.exports = { demarrer, racine };
