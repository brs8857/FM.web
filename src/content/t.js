import strings from "./strings/en-GB.json";

// A small ICU-style formatter (decision X3: strings externalised, en-GB only
// for now). Supports {name}, {name, plural, =0 {…} one {…} other {…}} with #
// for the number, and {name, select, a {…} other {…}}; branches may nest.
const plurals = new Intl.PluralRules("en-GB");

function parseBranches(body) {
  const branches = {};
  const re = /(=\d+|\w+)\s*(?=\{)/g;
  let match;
  while ((match = re.exec(body))) {
    const key = match[1];
    let depth = 0, i = re.lastIndex;
    for (; i < body.length; i++) {
      if (body[i] === "{") depth++;
      else if (body[i] === "}") { depth--; if (depth === 0) break; }
    }
    branches[key] = body.slice(re.lastIndex + 1, i);
    re.lastIndex = i + 1;
  }
  return branches;
}

export function format(template, params = {}) {
  let out = "";
  let i = 0;
  while (i < template.length) {
    if (template[i] !== "{") { out += template[i++]; continue; }
    let depth = 0, j = i;
    for (; j < template.length; j++) {
      if (template[j] === "{") depth++;
      else if (template[j] === "}") { depth--; if (depth === 0) break; }
    }
    const inner = template.slice(i + 1, j);
    const comma = inner.indexOf(",");
    if (comma === -1) {
      const value = params[inner.trim()];
      out += value === undefined ? `{${inner}}` : String(value);
    } else {
      const name = inner.slice(0, comma).trim();
      const rest = inner.slice(comma + 1);
      const comma2 = rest.indexOf(",");
      const kind = rest.slice(0, comma2).trim();
      const branches = parseBranches(rest.slice(comma2 + 1));
      const value = params[name];
      let branch;
      if (kind === "plural") {
        const n = Number(value);
        branch = branches[`=${n}`] ?? branches[plurals.select(n)] ?? branches.other ?? "";
        out += format(branch.replaceAll("#", String(n)), params);
      } else {
        branch = branches[String(value)] ?? branches.other ?? "";
        out += format(branch, params);
      }
    }
    i = j + 1;
  }
  return out;
}

export function t(key, params) {
  const template = strings[key];
  return template === undefined ? key : format(template, params);
}
