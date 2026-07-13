const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src').filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  content = content.replace(/\"..\/data\/countries\"/g, '"../lib/store"');
  content = content.replace(/\"..\/data\/awards\"/g, '"../lib/store"');
  content = content.replace(/\"..\/..\/data\/awards\"/g, '"../store"');
  if (content !== original) {
    fs.writeFileSync(f, content);
    console.log('Updated ' + f);
  }
});
