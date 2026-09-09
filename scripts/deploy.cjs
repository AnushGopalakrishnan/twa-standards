const {execFileSync} = require('node:child_process');
const path = require('node:path');

function verifyProductionCheckout(root) {
  const git = (...args) => execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  git('fetch','origin','main');
  const revision = git('rev-parse','HEAD');
  if (revision !== git('rev-parse','refs/remotes/origin/main')) {
    throw new Error('Production deploy requires the exact origin/main revision. Merge your PR, then deploy from a clean checkout of origin/main.');
  }
  if (git('status','--porcelain','--untracked-files=normal')) {
    throw new Error('Production deploy requires a clean working tree. Commit and merge all changes before deploying.');
  }
  return revision;
}

if (require.main === module) {
  try {
    const root = path.resolve(__dirname,'..');
    const revision = verifyProductionCheckout(root);
    console.log(`Verified production revision: ${revision} (origin/main)`);
    if (!process.argv.includes('--check')) {
      execFileSync('npx',['wrangler','deploy',...process.argv.slice(2)],{cwd:root,stdio:'inherit'});
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = {verifyProductionCheckout};
