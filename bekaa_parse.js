const fs = require('fs');
let text = fs.readFileSync('bekCategory.json', 'utf8');
if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
const posts = JSON.parse(text);
const results = posts.map(p => {
  const match = p.content.rendered.match(/<img[^>]+src="([^"]+)/);
  return {
    title: p.title.rendered,
    img: match ? match[1] : null,
    excerpt: p.content.rendered.replace(/<[^>]+>/g, ' ').slice(0, 140)
  };
});
console.log(JSON.stringify(results, null, 2));
