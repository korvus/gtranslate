/* global require,exports,console */
'use strict'

const request = require('sdk/request').Request

function translationResult(str, onError) {
  let newstr = '['
  let insideQuote = false
  str = str.replace(/\\(?=[^u])/g, '\\')

  // Fix the Google Translate JSON
  // start at 1, take into acount opening brace
  for (let i = 1, q = 0, len = str.length, prev; i < len; i++) {
    prev = str[i - 1]
    if (str[i] === '"' && prev !== '\\') {
      q++
    }
    insideQuote = q % 2 !== 0
    if (!insideQuote && str[i] === ',' && (prev === ',' || prev === '[' )) {
      newstr += '""'
    }
    newstr += str[i]
  }

  let result = [null, null, null]
  let parseError = false
  try {
    result = JSON.parse(newstr)
  } catch (e) {
    if (onError) {
      onError(newstr)
    }
    parseError = true
  }

  const translation = parseError ? 'Google Translate Service Error' : (
    result[0] && result[0].map(chunk => chunk[0]).join(' ')
  ) || null

  const alternatives = (
    result[1] && result[1].map(chunk => (
      chunk[0] + ':\n ' + chunk[2].map(chunk => (
        chunk[0] + ': ' + Array(
          (10 - chunk[0].length) > 0 ? 10 - chunk[0].length : 0
        ).join(' ') + '\t' + chunk[1].join(', ')
      )).join('\n ')
    )).join('\n\n')
  ) || null

  const dict = (
    result[12] && result[12].map(chunk => (
      chunk[0] + ' \n ' + chunk[1].map(chunky => (
        chunky[0] + ' \n  "' +  chunky[2] + '"'
      )).join(' \n ')
    )).join('\n\n')
  ) || null

  const syno = (
    result[11] && result[11].map(chunk => (
      chunk[0] + ' \n ' + chunk[1].map(chunky => (
        chunky[0].join(', ')
      )).join(' \n ')
    )).join('\n\n')
  ) || null

  return {
    detectedSource: result[2],
    translation: translation ? translation.trim() : null,
    alternatives: alternatives ? alternatives.trim() : null,
    dictionary: dict ? dict.trim() : null,
    synonyms: syno ? syno.trim() : null,
  }
}

// Some sort of token google uses
generateToken = function(a) {
  var b;
  if (null === null) {
    var c = String.fromCharCode(84);
    b = String.fromCharCode(75);
    c = [c, c];
    c[1] = b;
    b = Number(window[c.join(b)]) || 0
  }
  var d = String.fromCharCode(116),
    c = String.fromCharCode(107),
    d = [d, d];
  d[1] = c;
  for (var c = "&" + d.join("") +
      "=", d = [], e = 0, f = 0; f < a.length; f++) {
    var g = a.charCodeAt(f);
    128 > g ? d[e++] = g : (2048 > g ? d[e++] = g >> 6 | 192 : (55296 == (g & 64512) && f + 1 < a.length && 56320 == (a.charCodeAt(f + 1) & 64512) ? (g = 65536 + ((g & 1023) << 10) + (a.charCodeAt(++f) & 1023), d[e++] = g >> 18 | 240, d[e++] = g >> 12 & 63 | 128) : d[e++] = g >> 12 | 224, d[e++] = g >> 6 & 63 | 128), d[e++] = g & 63 | 128)
  }
  a = b || 0;
  for (e = 0; e < d.length; e++) a += d[e], a = tokenhelper(a, "+-a^+6");
  a = tokenhelper(a, "+-3^+b+-f");
  0 > a && (a = (a & 2147483647) + 2147483648);
  a %= 1E6;
  return (a.toString() + "." + (a ^ b))
}

tokenhelper = function(a, b) {
  for (var c = 0; c < b.length - 2; c += 3) {
    var d = b.charAt(c + 2),
      d = d >= "a" ? d.charCodeAt(0) - 87 : Number(d),
      d = b.charAt(c + 1) == "+" ? a >>> d : a << d;
    a = b.charAt(c) == "+" ? a + d & 4294967295 : a ^ d
  }
  return a
}

function apiUrl(from, to, text) {
  const protocol = 'https://'
  const host = 'translate.google.com'
  let path = (
    `/translate_a/single?client=t&ie=UTF-8&oe=UTF-8` +
    `&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&dt=at&tk=` +
    generateToken(text) + `&sl=${from}&tl=${to}&hl=${to}`
  )
  if (typeof text !== 'undefined') {
    path += `&q=${encodeURIComponent(text)}`
  }
  return `${protocol}${host}${path}`
}

function pageUrl(from, to, text) {
  const protocol = 'https://'
  const host = 'translate.google.com'
  return `${protocol}${host}/#${from}/${to}/${encodeURIComponent(text)}`
}

function wholePageUrl(from, to, url) {
  const base = 'https://translate.google.com'
  return `${base}/translate?sl=${from}&hl=${to}&u=${encodeURIComponent(url)}`
}

function translate(from, to, text, cb) {
  const url = apiUrl(from, to, text)

  const onComplete = res => {
    const translation = translationResult(res.text, () => {
      console.log(`[gtranslate] parse error with ${url}`)
    })
    return cb(translation)
  }

  // Far below what google's cutoff is to decide
  // to use get or post, but post works anyway.
  if (text.length < 200 ) {
    request({
      url: apiUrl(from, to, text),
      onComplete,
    }).get()
  } else {
    request({
      url: apiUrl(from, to),
      content: 'q='.concat(encodeURIComponent(text)),
      onComplete,
    }).post()
  }
}

exports.translate = translate
exports.translateUrl = pageUrl
exports.translatePageUrl = wholePageUrl
