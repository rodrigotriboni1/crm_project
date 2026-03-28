import fs from "fs";
const s = fs.readFileSync(
  new URL("../crm-embalagens-react.html", import.meta.url),
  "utf8"
);
const re = /"([^"]{4,100})"/g;
const m = new Map();
let x;
const skip = (t) =>
  /^[a-z][a-zA-Z0-9]*$/.test(t) ||
  t.includes("http") ||
  t.startsWith("#") ||
  t.includes("module") ||
  /^[\d.]+$/.test(t);
while ((x = re.exec(s))) {
  const t = x[1];
  if (/[a-zA-Z]{3}/.test(t) && !skip(t)) m.set(t, (m.get(t) || 0) + 1);
}
console.log(
  [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 200)
    .map(([k, v]) => `${v}\t${k}`)
    .join("\n")
);
