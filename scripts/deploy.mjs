// Siteyi derleyip gh-pages dalına gönderir: npm run deploy
import { execSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';

const run = (cmd, cwd = '.') => execSync(cmd, { cwd, stdio: 'inherit' });
const remote = execSync('git remote get-url origin').toString().trim();

// Bu depo sudee20g-lgtm hesabına ait; yayın sırasında o hesaba geçilir, sonra eski hesaba dönülür.
const active = execSync('gh api user --jq .login').toString().trim();
const OWNER = 'sudee20g-lgtm';
if (active !== OWNER) run('gh auth switch -h github.com -u ' + OWNER);
try {

run('npx vite build');
writeFileSync('dist/.nojekyll', '');
rmSync('dist/.git', { recursive: true, force: true });
run('git init -q -b gh-pages', 'dist');
run('git config credential.https://github.com.helper ""', 'dist');
run('git config --add credential.https://github.com.helper "!gh auth git-credential"', 'dist');
run('git add -A', 'dist');
run('git -c user.name="Sude Çinay" -c user.email="247631240+sudee20g-lgtm@users.noreply.github.com" commit -q -m "Yayın"', 'dist');
run(`git push -q -f ${remote} gh-pages`, 'dist');
rmSync('dist/.git', { recursive: true, force: true });
} finally {
  if (active !== OWNER) run('gh auth switch -h github.com -u ' + active);
}
console.log('Yayınlandı: https://sudee20g-lgtm.github.io/bag-atelier/');
