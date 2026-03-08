import xss from "xss";

const xssOptions = {
  whiteList: {},
  stripIgnoreTag: true,
};

export function sanitize(data) {
  if (typeof data === "string") return xss(data.trim(), xssOptions);
  if (Array.isArray(data)) return data.map(sanitize);
  if (data && typeof data === "object") {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = sanitize(value);
    }
    return result;
  }
  return data;
}

export function sanitizeHtml(str) {
  return xss(str);
}
