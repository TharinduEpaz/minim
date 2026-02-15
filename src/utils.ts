export function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function addUnsplashScalingParams(url: string) {
  const width = screen.width;
  const height = screen.height;
  return `${url.split("?")[0]}?fit=crop&w=${width}&h=${height}`;
}

export function omit(obj: any, keys: string[]) {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}

export function arrayToSelectOption(array: any[]) {
  return array.map((item) => ({ label: item, value: item }));
}

export function pick(object, keys) {
  return keys.reduce((obj, key) => {
    if (object && object.hasOwnProperty(key)) {
      obj[key] = object[key];
    }
    return obj;
  }, {});
}

export function camelCaseToSentenceCase(str: string) {
  const result = str.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export function getFaviconUrl(url: string, size = 16): string {
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    const base = chrome.runtime.getURL("/_favicon/");
    return `${base}?pageUrl=${encodeURIComponent(url)}&size=${size}`;
  }
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
  } catch {
    return "";
  }
}
