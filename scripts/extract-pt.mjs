import fs from "fs";
const s = fs.readFileSync(
  new URL("../crm-embalagens-react.html", import.meta.url),
  "utf8"
);
// JSX text often appears as children:"Label" or `Label`
const re1 = /children:\"([^\"]{2,80})\"/g;
const re2 = /`([^`]{3,120})`/g;
const set = new Set();
let m;
while ((m = re1.exec(s))) set.add(m[1]);
while ((m = re2.exec(s))) {
  if (/[àáâãéêíóôõúçÀ-ú]/.test(m[1]) || /Cliente|Pedido|CRM|Dashboard|Funil|Anota|Produto|Canal/i.test(m[1]))
    set.add(m[1]);
}
console.log([...set].sort().join("\n"));
