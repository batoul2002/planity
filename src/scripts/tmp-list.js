const fs=require("fs");
const cheerio=require("cheerio");
const html=fs.readFileSync("public/venue.html","utf8");
const $=cheerio.load(html);
const names=[];
$('.venue-card').each((i,el)=>{
  const title=$(el).find('h3').first().text().trim();
  names.push(title);
});
console.log(names.join('\n'));
