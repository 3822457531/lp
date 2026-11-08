/* 鍏扮摱缇庝笟 路 绾?JS 浜岀淮鐮佺敓鎴愬櫒锛堥浂渚濊禆銆佹棤澶栫綉锛? * 鐢ㄦ硶锛? *   LPQR.matrix('https://x/y')            -> [[0,1,...],...]  0=鐧?1=榛? *   LPQR.svg('https://x/y', {size:220})   -> '<svg ...></svg>'
 *   LPQR.render(el, 'https://x/y')        -> 鎶?<canvas>/<svg> 濉炶繘瀹瑰櫒
 * 鍙疄鐜?Byte 妯″紡锛孍CC=M锛岀増鏈?1~10锛圲rl 闀垮害 鈮?213 瀛楄妭锛岃冻澶熸牳閿€閾炬帴锛? */
(function (root) {
  'use strict';

  /* ------------- GF(256) ------------- */
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  function genPoly(n) {
    var g = [1];
    for (var i = 0; i < n; i++) {
      var next = new Array(g.length + 1);
      for (var k = 0; k < next.length; k++) next[k] = 0;
      for (var j = 0; j < g.length; j++) {
        next[j] ^= g[j];
        next[j + 1] ^= gmul(g[j], EXP[i]);
      }
      g = next;
    }
    return g;
  }

  function rsEncode(data, ecLen) {
    var g = genPoly(ecLen);
    var res = data.slice();
    for (var i = 0; i < ecLen; i++) res.push(0);
    for (var i2 = 0; i2 < data.length; i2++) {
      var coef = res[i2];
      if (coef !== 0) for (var j = 0; j < g.length; j++) res[i2 + j] ^= gmul(g[j], coef);
    }
    return res.slice(data.length);
  }

  /* ------------- 鐗堟湰琛紙ECC=M锛?-------------
   * [blockCount, totalCodewords, dataCodewords, (blockCount2, total2, data2)?] */
  var RS_M = {
    1: [1, 26, 16], 2: [1, 44, 28], 3: [1, 70, 44], 4: [2, 50, 32], 5: [2, 67, 43],
    6: [4, 43, 27], 7: [4, 49, 31], 8: [2, 60, 38, 2, 61, 39],
    9: [3, 58, 36, 2, 59, 37], 10: [4, 69, 43, 1, 70, 44],
  };
  var ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
  };

  function utf8Bytes(str) {
    if (root.TextEncoder) return Array.prototype.slice.call(new root.TextEncoder().encode(String(str)));
    var out = [], s = unescape(encodeURIComponent(String(str)));
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  function dataCapacity(ver) {
    var t = RS_M[ver];
    return t[2] * t[0] + (t[3] ? t[5] * t[3] : 0);
  }

  /* ------------- 缂栫爜 ------------- */
  function buildCodewords(text, ver) {
    var bytes = utf8Bytes(text);
    var bits = [];
    function push(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    push(4, 4); // byte mode
    push(bytes.length, ver >= 10 ? 16 : 8);
    for (var i = 0; i < bytes.length; i++) push(bytes[i], 8);

    var capBits = dataCapacity(ver) * 8;
    push(0, Math.min(4, capBits - bits.length)); // terminator
    while (bits.length % 8 !== 0) bits.push(0);
    var dc = [];
    for (var b = 0; b < bits.length; b += 8) {
      var v = 0;
      for (var k = 0; k < 8; k++) v = (v << 1) | bits[b + k];
      dc.push(v);
    }
    var pad = [0xec, 0x11], pi = 0;
    while (dc.length < dataCapacity(ver)) dc.push(pad[pi++ % 2]);

    /* 鍒嗗潡 + 绾犻敊 */
    var t = RS_M[ver];
    var blocks = [], p = 0;
    function mkData(count, len) {
      for (var i = 0; i < count; i++) { blocks.push({ data: dc.slice(p, p + len), ec: null }); p += len; }
    }
    mkData(t[0], t[2]);
    if (t[3]) mkData(t[3], t[5]);
    var ecLen = t[1] - t[2];
    blocks.forEach(function (bl) { bl.ec = rsEncode(bl.data, ecLen); });

    var out = [], maxLen = Math.max.apply(null, blocks.map(function (b) { return b.data.length; }));
    for (var i2 = 0; i2 < maxLen; i2++) {
      blocks.forEach(function (b) { if (i2 < b.data.length) out.push(b.data[i2]); });
    }
    for (var i3 = 0; i3 < ecLen; i3++) blocks.forEach(function (b) { out.push(b.ec[i3]); });
    return out;
  }

  /* ------------- 鐭╅樀 ------------- */
  var ECC_FORMAT_BITS = 0; // M = 0b00

  function bch(data, poly, bits) {
    var v = data << bits;
    while (highestBit(v) >= highestBit(poly)) v ^= poly << (highestBit(v) - highestBit(poly));
    return v;
  }
  function highestBit(x) { var n = -1; while (x) { x >>>= 1; n++; } return n; }

  function buildMatrix(ver, codewords) {
    var size = ver * 4 + 17;
    var mod = [], fn = [];
    for (var y = 0; y < size; y++) {
      mod.push(new Array(size).fill(0));
      fn.push(new Array(size).fill(false));
    }
    function set(x, yy, dark) { mod[yy][x] = dark ? 1 : 0; fn[yy][x] = true; }

    /* finder + separator */
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function (c) {
      for (var dy = -4; dy <= 4; dy++) {
        for (var dx = -4; dx <= 4; dx++) {
          var xx = c[0] + dx, y2 = c[1] + dy;
          if (xx < 0 || xx >= size || y2 < 0 || y2 >= size) continue;
          var dist = Math.max(Math.abs(dx), Math.abs(dy));
          set(xx, y2, dist !== 2 && dist !== 4);
        }
      }
    });
    function yy2(v) { return v; }

    /* timing */
    for (var i = 0; i < size; i++) {
      if (!fn[6][i]) set(i, 6, i % 2 === 0);
      if (!fn[i][6]) set(6, i, i % 2 === 0);
    }

    /* alignment：只跳过与三个定位图形重叠的角部中心，其余（含压在时序图案上的）都要画 */
    var ap = ALIGN[ver] || [];
    var last = ap.length ? ap[ap.length - 1] : 0;
    for (var a = 0; a < ap.length; a++) {
      for (var b = 0; b < ap.length; b++) {
        var cx = ap[a], cy = ap[b];
        if ((cx === 6 && cy === 6) || (cx === 6 && cy === last) || (cx === last && cy === 6)) continue;
        for (var dy2 = -2; dy2 <= 2; dy2++) {
          for (var dx2 = -2; dx2 <= 2; dx2++) {
            var d = Math.max(Math.abs(dx2), Math.abs(dy2));
            set(cx + dx2, cy + dy2, d !== 1);
          }
        }
      }
    }

    /* 棰勭暀鏍煎紡淇℃伅鍖猴紙鍏堢疆 false锛岀◢鍚庢寜鎺╂ā鍐欙級 */
    for (var k = 0; k < 9; k++) {
      if (!fn[k][8]) set(8, k, false);
      if (!fn[8][k]) set(k, 8, false);
    }
    for (var k2 = 0; k2 < 8; k2++) {
      set(size - 1 - k2, 8, false);
      set(8, size - 1 - k2, false);
    }
    set(8, size - 8, true); // dark module

    /* 鐗堟湰淇℃伅 v>=7 */
    if (ver >= 7) {
      var vbits = (ver << 12) | bch(ver, 0x1f25, 12);
      for (var i4 = 0; i4 < 18; i4++) {
        var bit = (vbits >>> i4) & 1;
        var px = size - 11 + (i4 % 3), py = Math.floor(i4 / 3);
        set(px, py, bit);
        set(py, px, bit);
      }
    }

    /* 鏁版嵁鏀剧疆 */
    var idx = 0, total = codewords.length * 8;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var j = 0; j < 2; j++) {
          var x = right - j;
          var upward = ((right + 1) & 2) === 0;
          var yy = upward ? size - 1 - vert : vert;
          if (!fn[yy][x] && idx < total) {
            mod[yy][x] = (codewords[idx >>> 3] >>> (7 - (idx & 7))) & 1;
            idx++;
          }
        }
      }
    }

    /* 鎺╂ā + 鏍煎紡淇℃伅锛屽彇缃氬垎鏈€浣?*/
    var best = null, bestScore = Infinity, bestMask = 0;
    for (var mask = 0; mask < 8; mask++) {
      var cand = mod.map(function (r) { return r.slice(); });
      for (var y3 = 0; y3 < size; y3++) {
        for (var x3 = 0; x3 < size; x3++) {
          if (!fn[y3][x3] && maskAt(mask, x3, y3)) cand[y3][x3] ^= 1;
        }
      }
      applyFormat(cand, size, mask);
      var sc = penalty(cand, size);
      if (sc < bestScore) { bestScore = sc; best = cand; bestMask = mask; }
    }
    return { modules: best, mask: bestMask };
  }

  function maskAt(mask, x, y) {
    switch (mask) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
      case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
      case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
      case 7: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    }
    return false;
  }

  function applyFormat(m, size, mask) {
    var data = (ECC_FORMAT_BITS << 3) | mask;
    var bits = ((data << 10) | bch(data, 0x537, 10)) ^ 0x5412;
    function gb(i) { return (bits >>> i) & 1; }
    for (var i = 0; i <= 5; i++) m[i][8] = gb(i);
    m[7][8] = gb(6);
    m[8][8] = gb(7);
    m[8][7] = gb(8);
    for (var j = 9; j < 15; j++) m[8][14 - j] = gb(j);
    for (var k = 0; k < 8; k++) m[8][size - 1 - k] = gb(k);
    for (var l = 8; l < 15; l++) m[size - 15 + l][8] = gb(l);
    m[size - 8][8] = 1;
  }

  function penalty(m, size) {
    var score = 0, x, y, run, color;
    /* 瑙勫垯1锛氳繛缁悓鑹?*/
    for (y = 0; y < size; y++) {
      run = 1; color = m[y][0];
      for (x = 1; x < size; x++) {
        if (m[y][x] === color) { run++; }
        else { if (run >= 5) score += 3 + (run - 5); run = 1; color = m[y][x]; }
      }
      if (run >= 5) score += 3 + (run - 5);
    }
    for (x = 0; x < size; x++) {
      run = 1; color = m[0][x];
      for (y = 1; y < size; y++) {
        if (m[y][x] === color) { run++; }
        else { if (run >= 5) score += 3 + (run - 5); run = 1; color = m[y][x]; }
      }
      if (run >= 5) score += 3 + (run - 5);
    }
    /* 瑙勫垯2锛?x2 鍚岃壊 */
    for (y = 0; y < size - 1; y++) {
      for (x = 0; x < size - 1; x++) {
        var c = m[y][x];
        if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
      }
    }
    /* 瑙勫垯3锛?0111010000 / 00001011101 */
    var p1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    var p2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function match(arr, pat, at) {
      for (var i = 0; i < pat.length; i++) if (arr[at + i] !== pat[i]) return false;
      return true;
    }
    for (y = 0; y < size; y++) {
      var row = m[y];
      for (x = 0; x + 11 <= size; x++) {
        if (match(row, p1, x) || match(row, p2, x)) score += 40;
      }
    }
    for (x = 0; x < size; x++) {
      var col = [];
      for (y = 0; y < size; y++) col.push(m[y][x]);
      for (y = 0; y + 11 <= size; y++) {
        if (match(col, p1, y) || match(col, p2, y)) score += 40;
      }
    }
    /* 瑙勫垯4锛氶粦鐧芥瘮渚?*/
    var dark = 0;
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) dark += m[y][x];
    var pct = dark * 100 / (size * size);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return score;
  }

  /* ------------- 瀵瑰 API ------------- */
  function matrix(text) {
    var bytes = utf8Bytes(text);
    var ver = 0;
    for (var v = 1; v <= 10; v++) {
      var header = v >= 10 ? 3 : 2;
      if (bytes.length <= dataCapacity(v) - header) { ver = v; break; }
    }
    if (!ver) throw new Error('鍐呭杩囬暱锛岃秴杩囦簩缁寸爜瀹归噺');
    var cw = buildCodewords(text, ver);
    var built = buildMatrix(ver, cw);
    return { version: ver, size: ver * 4 + 17, modules: built.modules, mask: built.mask };
  }

  function svg(text, opts) {
    opts = opts || {};
    var m = matrix(text).modules;
    var n = m.length;
    var quiet = opts.quiet === undefined ? 2 : opts.quiet;
    var dim = n + quiet * 2;
    var px = opts.size || 220;
    var paths = [];
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        if (m[y][x]) paths.push('M' + (x + quiet) + ' ' + (y + quiet) + 'h1v1h-1z');
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px + '" viewBox="0 0 ' + dim + ' ' + dim +
      '" shape-rendering="crispEdges"><rect width="' + dim + '" height="' + dim + '" fill="#fff"/>' +
      '<path d="' + paths.join('') + '" fill="#231f1d"/></svg>';
  }

  function render(el, text, opts) {
    el = typeof el === 'string' ? document.querySelector(el) : el;
    if (!el) return null;
    el.innerHTML = svg(text, opts || {});
    var s = el.querySelector('svg');
    if (s) { s.style.width = '100%'; s.style.height = 'auto'; s.style.display = 'block'; }
    return s;
  }

  var LPQR = { matrix: matrix, svg: svg, render: render, _codewords: buildCodewords };
  root.LPQR = LPQR;
  if (typeof module !== 'undefined' && module.exports) module.exports = LPQR;
})(typeof window !== 'undefined' ? window : global);

