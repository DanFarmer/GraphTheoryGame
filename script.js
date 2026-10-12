(() => {
  'use strict';

  const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const MIN_N = 3;
  const MAX_N = 15;
  const VIEW = 600;     // SVG viewBox size
  const PAD = 48;       // keep vertices this far from the edge
  const R = 17;         // vertex radius

  const STMT = {
    connected: 'is <em>connected</em>',
    regular: 'is <em>regular</em>',
    complete: 'is <em>complete</em>',
    bipartite: 'is <em>bipartite</em>',
    completeBipartite: 'is <em>complete bipartite</em>',
    tree: 'is a <em>tree</em>',
    eulerian: 'is <em>Eulerian</em>',
    semiEulerian: 'is <em>semi-Eulerian</em>',
    planar: 'is <em>planar</em>',
  };
  const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13.5 L9 19 L21 4.5"/></svg>';
  const CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 L19 19 M19 5 L5 19"/></svg>';

  const PROPS = [
    { id: 'connected', name: 'Connected', def: 'There is a path between every pair of vertices.' },
    { id: 'regular', name: 'Regular', def: 'Every vertex has the same degree.' },
    { id: 'complete', name: 'Complete', def: 'Every pair of distinct vertices is joined by an edge (K<sub>n</sub>).' },
    { id: 'bipartite', name: 'Bipartite', def: 'The vertices split into two sets so that every edge goes between the sets. Equivalently, the graph has no odd cycle.' },
    { id: 'completeBipartite', name: 'Complete bipartite', def: 'Bipartite, and every vertex in one set is joined to every vertex in the other (K<sub>m,n</sub>).' },
    { id: 'tree', name: 'Tree', def: 'Connected with no cycles. A tree on n vertices has exactly n − 1 edges.' },
    { id: 'eulerian', name: 'Eulerian', def: 'Has a closed trail using every edge exactly once. Here: connected, and every vertex has even degree.' },
    { id: 'semiEulerian', name: 'Semi-Eulerian', def: 'Has an open trail using every edge exactly once, but no closed one. Here: connected, with exactly two odd-degree vertices.' },
    { id: 'planar', name: 'Planar', def: 'Can be drawn in the plane with no edges crossing. Crossings in one particular drawing do not prove a graph is non-planar.' },
  ];

  /* small helpers */

  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const V = (i) => `<span class="v">${LABELS[i]}</span>`;
  const vlist = (arr) => arr.map(V).join(', ');
  const setText = (arr) => `{${arr.map(V).join(', ')}}`;

  function makeGraph(n, edgeList) {
    const adj = Array.from({ length: n }, () => new Set());
    for (const [u, v] of edgeList) {
      if (u !== v) { adj[u].add(v); adj[v].add(u); }
    }
    const edges = [];
    for (let u = 0; u < n; u++) for (const v of adj[u]) if (u < v) edges.push([u, v]);
    return { n, adj, edges };
  }

  /*generators*/

  const completeEdges = (n) => {
    const E = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) E.push([i, j]);
    return E;
  };
  const completeBipEdges = (a, b) => {
    const E = [];
    for (let i = 0; i < a; i++) for (let j = a; j < a + b; j++) E.push([i, j]);
    return E;
  };

  const GENERATORS = [
    {
      w: 3, ok: () => true,
      build(n) {
        const p = 0.2 + Math.random() * 0.35;
        const E = [];
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.random() < p) E.push([i, j]);
        if (!E.length) E.push([0, 1]);
        return { E, note: `a random graph: each pair of vertices joined with probability ${p.toFixed(2)}` };
      },
    },
    { w: 1, ok: () => true, build: (n) => ({ E: range(0, n - 1).map((i) => [i, (i + 1) % n]), note: `the cycle C<sub>${n}</sub>` }) },
    { w: 0.8, ok: (n) => n <= 9, build: (n) => ({ E: completeEdges(n), note: `the complete graph K<sub>${n}</sub>` }) },
    {
      w: 1.2, ok: () => true,
      build(n) {
        const a = rand(1, Math.floor(n / 2));
        return { E: completeBipEdges(a, n - a), note: `the complete bipartite graph K<sub>${a},${n - a}</sub>` };
      },
    },
    {
      w: 1.2, ok: () => true,
      build(n) {
        const a = rand(1, n - 1);
        let E = completeBipEdges(a, n - a).filter(() => Math.random() < 0.55);
        if (!E.length) E = [[0, a]];
        return { E, note: 'a random bipartite graph' };
      },
    },
    {
      w: 1.6, ok: () => true,
      build(n) {
        const maxOff = Math.floor((n - 1) / 2);
        const ks = [];
        for (let k = 2; k <= Math.min(n - 1, 6); k++) {
          if ((n * k) % 2) continue;
          if (Math.floor(k / 2) > maxOff) continue;
          ks.push(k);
        }
        const k = ks[rand(0, ks.length - 1)];
        const offs = shuffle(range(1, maxOff)).slice(0, Math.floor(k / 2));
        if (k % 2) offs.push(n / 2);
        const E = [];
        for (let i = 0; i < n; i++) for (const o of offs) E.push([i, (i + o) % n]);
        return { E, note: `a ${k}-regular circulant graph` };
      },
    },
    {
      w: 1.2, ok: () => true,
      build(n) {
        const E = [];
        for (let i = 1; i < n; i++) E.push([i, rand(0, i - 1)]);
        return { E, note: 'a random tree' };
      },
    },
    {
      w: 0.6, ok: (n) => n >= 4,
      build(n) {
        const E = [];
        for (let i = 1; i < n; i++) { E.push([0, i]); E.push([i, i === n - 1 ? 1 : i + 1]); }
        return { E, note: `the wheel W<sub>${n}</sub> (a hub joined to a ${n - 1}-cycle)` };
      },
    },
    {
      w: 1.2, ok: () => true,
      build(n) {
        // Random graph, then flip edges between pairs of odd vertices so every degree is even.
        const p = 0.3 + Math.random() * 0.3;
        const has = new Set();
        const key = (u, v) => (u < v ? `${u}-${v}` : `${v}-${u}`);
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.random() < p) has.add(key(i, j));
        const deg = Array(n).fill(0);
        for (const k of has) { const [u, v] = k.split('-').map(Number); deg[u]++; deg[v]++; }
        const odd = shuffle(range(0, n - 1).filter((i) => deg[i] % 2));
        for (let i = 0; i + 1 < odd.length; i += 2) {
          const k = key(odd[i], odd[i + 1]);
          if (has.has(k)) has.delete(k); else has.add(k);
        }
        const E = [...has].map((k) => k.split('-').map(Number));
        return { E, note: 'a random graph adjusted so every degree is even' };
      },
    },
    {
      w: 1, ok: () => true,
      build(n) {
        if (n >= 4 && Math.random() < 0.5) {
          const a = rand(2, Math.floor(n / 2));
          const E = completeBipEdges(a, n - a);
          E.splice(rand(0, E.length - 1), 1);
          return { E, note: `K<sub>${a},${n - a}</sub> with one edge removed` };
        }
        const E = completeEdges(n);
        E.splice(rand(0, E.length - 1), 1);
        return { E, note: `K<sub>${n}</sub> with one edge removed` };
      },
    },
  ];

  function generate(n) {
    const pool = GENERATORS.filter((g) => g.ok(n));
    const total = pool.reduce((s, g) => s + g.w, 0);
    let r = Math.random() * total;
    let gen = pool[0];
    for (const g of pool) { r -= g.w; if (r <= 0) { gen = g; break; } }
    const { E, note } = gen.build(n);
    // Relabel at random so the structure isn't given away by the circle order.
    const perm = shuffle(range(0, n - 1));
    const g = makeGraph(n, E.map(([u, v]) => [perm[u], perm[v]]));
    g.note = note;
    return g;
  }

  /* ---------- planarity ----------
   * e > 3n − 6 rules a graph out immediately. Otherwise the graph is split into
   * biconnected blocks and each block with 9+ edges (the size of K3,3, the
   * smallest non-planar graph) is tested with the Demoucron–Malgrange–Pertuiset
   * path-embedding algorithm.
   */

  function blocks(n, adj) {
    const disc = Array(n).fill(-1);
    const low = Array(n).fill(0);
    const stack = [];
    const out = [];
    let t = 0;
    function dfs(u, p) {
      disc[u] = low[u] = t++;
      for (const v of adj[u]) {
        if (v === p) continue;
        if (disc[v] === -1) {
          stack.push([u, v]);
          dfs(v, u);
          low[u] = Math.min(low[u], low[v]);
          if (low[v] >= disc[u]) {
            const comp = [];
            let e;
            do { e = stack.pop(); comp.push(e); } while (!(e[0] === u && e[1] === v));
            out.push(comp);
          }
        } else if (disc[v] < disc[u]) {
          stack.push([u, v]);
          low[u] = Math.min(low[u], disc[v]);
        }
      }
    }
    for (let i = 0; i < n; i++) if (disc[i] === -1) dfs(i, -1);
    return out;
  }

  function blockIsPlanar(edges) {
    const adj = new Map();
    const link = (u, v) => { if (!adj.has(u)) adj.set(u, new Set()); adj.get(u).add(v); };
    for (const [u, v] of edges) { link(u, v); link(v, u); }
    const verts = [...adj.keys()];
    const key = (u, v) => (u < v ? `${u}-${v}` : `${v}-${u}`);

    // Initial cycle: an edge a–b plus a second path from a to b.
    const [a, b] = edges[0];
    const prev = new Map([[a, null]]);
    const q = [a];
    while (q.length && !prev.has(b)) {
      const x = q.shift();
      for (const y of adj.get(x)) {
        if (x === a && y === b) continue;
        if (!prev.has(y)) { prev.set(y, x); q.push(y); }
      }
    }
    const cycle = [];
    for (let z = b; z !== null; z = prev.get(z)) cycle.push(z);
    cycle.reverse();

    const inH = new Set(cycle);
    const hEdges = new Set();
    for (let i = 0; i < cycle.length; i++) hEdges.add(key(cycle[i], cycle[(i + 1) % cycle.length]));
    let faces = [cycle.slice(), cycle.slice()];

    while (hEdges.size < edges.length) {
      // Fragments: unembedded edges between embedded vertices, and components of G − H.
      const frags = [];
      for (const [u, v] of edges) {
        if (!hEdges.has(key(u, v)) && inH.has(u) && inH.has(v)) frags.push({ edge: [u, v], contacts: [u, v] });
      }
      const seen = new Set();
      for (const s of verts) {
        if (inH.has(s) || seen.has(s)) continue;
        const comp = new Set([s]);
        const contacts = new Set();
        const st = [s];
        seen.add(s);
        while (st.length) {
          const x = st.pop();
          for (const y of adj.get(x)) {
            if (inH.has(y)) contacts.add(y);
            else if (!seen.has(y)) { seen.add(y); comp.add(y); st.push(y); }
          }
        }
        frags.push({ comp, contacts: [...contacts] });
      }

      let chosen = null;
      let face = null;
      for (const f of frags) {
        const admissible = faces.filter((fc) => f.contacts.every((c) => fc.includes(c)));
        if (!admissible.length) return false;
        if (admissible.length === 1) { chosen = f; face = admissible[0]; break; }
        if (!chosen) { chosen = f; face = admissible[0]; }
      }

      // A path through the fragment between two of its contact vertices.
      let path;
      if (chosen.edge) {
        path = chosen.edge;
      } else {
        const start = chosen.contacts[0];
        const pr = new Map();
        const qq = [];
        for (const y of adj.get(start)) if (chosen.comp.has(y) && !pr.has(y)) { pr.set(y, start); qq.push(y); }
        outer: while (qq.length) {
          const x = qq.shift();
          for (const y of adj.get(x)) {
            if (inH.has(y) && y !== start) {
              path = [y];
              for (let z = x; z !== start; z = pr.get(z)) path.push(z);
              path.push(start);
              path.reverse();
              break outer;
            }
            if (chosen.comp.has(y) && !pr.has(y)) { pr.set(y, x); qq.push(y); }
          }
        }
      }

      // Split the face along the path.
      const A = path[0];
      const B = path[path.length - 1];
      const mid = path.slice(1, -1);
      const i = face.indexOf(A);
      const j = face.indexOf(B);
      const arc = (s, t) => {
        const r = [];
        for (let k = s; ; k = (k + 1) % face.length) { r.push(face[k]); if (k === t) break; }
        return r;
      };
      const f1 = arc(i, j).concat(mid.slice().reverse());
      const f2 = arc(j, i).concat(mid);
      faces.splice(faces.indexOf(face), 1, f1, f2);
      for (const v of path) inH.add(v);
      for (let k = 0; k + 1 < path.length; k++) hEdges.add(key(path[k], path[k + 1]));
    }
    return true;
  }

  function isPlanar(g) {
    const m = g.edges.length;
    if (g.n >= 3 && m > 3 * g.n - 6) return false;
    for (const b of blocks(g.n, g.adj)) if (b.length >= 9 && !blockIsPlanar(b)) return false;
    return true;
  }

  /* ---------- analysis ---------- */

  function analyse(g) {
    const { n, adj, edges } = g;
    const m = edges.length;
    const deg = adj.map((s) => s.size);
    const res = {};

    // Components
    const compOf = Array(n).fill(-1);
    const comps = [];
    for (let s = 0; s < n; s++) {
      if (compOf[s] !== -1) continue;
      const c = [s];
      compOf[s] = comps.length;
      for (let k = 0; k < c.length; k++) {
        for (const y of adj[c[k]]) if (compOf[y] === -1) { compOf[y] = comps.length; c.push(y); }
      }
      comps.push(c.sort((x, y) => x - y));
    }
    const connected = comps.length === 1;
    const compText = () => comps.slice(0, 3).map(setText).join(' and ') + (comps.length > 3 ? ', …' : '');
    res.connected = connected
      ? { value: true, why: `Every vertex can be reached from ${V(0)}.` }
      : { value: false, why: `It falls into ${comps.length} pieces, e.g. ${compText()}.` };

    // Regular
    const minD = Math.min(...deg);
    const maxD = Math.max(...deg);
    res.regular = minD === maxD
      ? { value: true, why: `Every vertex has degree ${minD}, so it is ${minD}-regular.` }
      : { value: false, why: `${V(deg.indexOf(minD))} has degree ${minD} but ${V(deg.indexOf(maxD))} has degree ${maxD}.` };

    // Complete
    const allPairs = (n * (n - 1)) / 2;
    let missing = null;
    for (let i = 0; i < n && !missing; i++) for (let j = i + 1; j < n; j++) if (!adj[i].has(j)) { missing = [i, j]; break; }
    res.complete = missing
      ? { value: false, why: `${V(missing[0])} and ${V(missing[1])} are not adjacent (${m} of ${allPairs} possible edges).` }
      : { value: true, why: `All ${allPairs} possible edges are present: it is K<sub>${n}</sub>.` };

    // Bipartite (BFS 2-colouring; a clash gives an odd cycle)
    const color = Array(n).fill(-1);
    const parent = Array(n).fill(-1);
    const depth = Array(n).fill(0);
    let oddCycle = null;
    for (let s = 0; s < n && !oddCycle; s++) {
      if (color[s] !== -1) continue;
      color[s] = 0;
      const q = [s];
      while (q.length && !oddCycle) {
        const x = q.shift();
        for (const y of adj[x]) {
          if (color[y] === -1) {
            color[y] = 1 - color[x]; parent[y] = x; depth[y] = depth[x] + 1; q.push(y);
          } else if (color[y] === color[x]) {
            let a = x, b = y;
            const pa = [a], pb = [b];
            while (depth[a] > depth[b]) { a = parent[a]; pa.push(a); }
            while (depth[b] > depth[a]) { b = parent[b]; pb.push(b); }
            while (a !== b) { a = parent[a]; pa.push(a); b = parent[b]; pb.push(b); }
            oddCycle = pa.concat(pb.slice(0, -1).reverse());
            break;
          }
        }
      }
    }
    const sideA = range(0, n - 1).filter((i) => color[i] === 0);
    const sideB = range(0, n - 1).filter((i) => color[i] === 1);
    const bipartite = !oddCycle;
    const cycleText = oddCycle ? oddCycle.concat(oddCycle[0]).map(V).join('–') : '';
    res.bipartite = bipartite
      ? { value: true, why: `Split into ${setText(sideA)} and ${setText(sideB)}; every edge crosses between them.` }
      : { value: false, why: `It has an odd cycle of length ${oddCycle.length}: ${cycleText}.` };

    // Complete bipartite
    if (!bipartite) {
      res.completeBipartite = { value: false, why: 'It is not bipartite.' };
    } else if (!connected) {
      res.completeBipartite = { value: false, why: 'It is not connected, and every K<sub>m,n</sub> with m, n ≥ 1 is.' };
    } else {
      const a = sideA.length, b = sideB.length;
      let gap = null;
      for (const u of sideA) { for (const v of sideB) if (!adj[u].has(v)) { gap = [u, v]; break; } if (gap) break; }
      res.completeBipartite = gap
        ? { value: false, why: `The sides have ${a} and ${b} vertices, so K<sub>${a},${b}</sub> needs ${a * b} edges; there are ${m}. ${V(gap[0])} and ${V(gap[1])} are on opposite sides but not adjacent.` }
        : { value: true, why: `It is K<sub>${a},${b}</sub>: all ${a} × ${b} = ${m} edges between ${setText(sideA)} and ${setText(sideB)} are present.` };
    }

    // Tree
    if (!connected) res.tree = { value: false, why: 'A tree must be connected.' };
    else if (m !== n - 1) res.tree = { value: false, why: `It has ${m} edges; a tree on ${n} vertices has exactly ${n - 1}, so there is a cycle.` };
    else res.tree = { value: true, why: `Connected with ${m} = n − 1 edges, so it has no cycles.` };

    // Eulerian / semi-Eulerian
    const odd = range(0, n - 1).filter((i) => deg[i] % 2);
    const oddText = odd.length
      ? `${odd.length} odd-degree ${odd.length === 1 ? 'vertex' : 'vertices'} (${vlist(odd.slice(0, 6))}${odd.length > 6 ? ', …' : ''})`
      : 'no odd-degree vertices';
    if (!connected) {
      res.eulerian = { value: false, why: 'It is not connected, so no single trail can cover every edge.' };
      res.semiEulerian = { value: false, why: 'It is not connected, so no single trail can cover every edge.' };
    } else {
      res.eulerian = odd.length === 0
        ? { value: true, why: 'Connected, and every vertex has even degree.' }
        : { value: false, why: `It has ${oddText}; an Euler circuit needs none.` };
      res.semiEulerian = odd.length === 2
        ? { value: true, why: `Exactly two odd-degree vertices, ${V(odd[0])} and ${V(odd[1])}: an Euler trail runs from one to the other.` }
        : { value: false, why: `It has ${oddText}; an open Euler trail needs exactly two.` };
    }

    // Planar
    const planar = isPlanar(g);
    let pWhy;
    if (planar) pWhy = 'It can be drawn without crossings. Try dragging vertices to find such a drawing.';
    else if (n >= 3 && m > 3 * n - 6) pWhy = `It has m = ${m} edges, but a planar graph on ${n} vertices has at most 3n − 6 = ${3 * n - 6}.`;
    else if (bipartite && m > 2 * n - 4) pWhy = `It is bipartite with m = ${m}, but a planar bipartite graph has at most 2n − 4 = ${2 * n - 4} edges.`;
    else pWhy = 'It contains a subdivision of K<sub>5</sub> or K<sub>3,3</sub>, so by Kuratowski’s theorem it is not planar.';
    res.planar = { value: planar, why: pWhy };

    return { res, deg, color: bipartite ? color : null };
  }

  /* ---------- layout ---------- */

  function circleLayout(n) {
    const c = VIEW / 2;
    const r = VIEW / 2 - PAD;
    return range(0, n - 1).map((i) => {
      const t = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return { x: c + r * Math.cos(t), y: c + r * Math.sin(t) };
    });
  }

  function springLayout(g, start) {
    const n = g.n;
    const P = start.map((p) => ({ x: p.x + (Math.random() - 0.5) * 20, y: p.y + (Math.random() - 0.5) * 20 }));
    const k = 0.8 * Math.sqrt((VIEW * VIEW) / n);
    let temp = VIEW / 8;
    for (let it = 0; it < 500; it++) {
      const d = P.map(() => ({ x: 0, y: 0 }));
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          let dx = P[i].x - P[j].x, dy = P[i].y - P[j].y;
          const dist = Math.max(Math.hypot(dx, dy), 0.01);
          const f = (k * k) / dist;
          dx /= dist; dy /= dist;
          d[i].x += dx * f; d[i].y += dy * f; d[j].x -= dx * f; d[j].y -= dy * f;
        }
      }
      for (const [u, v] of g.edges) {
        let dx = P[u].x - P[v].x, dy = P[u].y - P[v].y;
        const dist = Math.max(Math.hypot(dx, dy), 0.01);
        const f = (dist * dist) / k;
        dx /= dist; dy /= dist;
        d[u].x -= dx * f; d[u].y -= dy * f; d[v].x += dx * f; d[v].y += dy * f;
      }
      for (let i = 0; i < n; i++) {
        d[i].x += (VIEW / 2 - P[i].x) * 0.05 * k / 10;
        d[i].y += (VIEW / 2 - P[i].y) * 0.05 * k / 10;
        const len = Math.max(Math.hypot(d[i].x, d[i].y), 0.01);
        const step = Math.min(len, temp);
        P[i].x += (d[i].x / len) * step;
        P[i].y += (d[i].y / len) * step;
      }
      temp *= 0.985;
    }
    // Fit to the drawing area.
    const xs = P.map((p) => p.x), ys = P.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const span = Math.max(maxX - minX, maxY - minY, 1);
    const s = (VIEW - 2 * PAD) / span;
    const ox = (VIEW - (maxX - minX) * s) / 2, oy = (VIEW - (maxY - minY) * s) / 2;
    return P.map((p) => ({ x: ox + (p.x - minX) * s, y: oy + (p.y - minY) * s }));
  }

  /* ---------- UI ---------- */

  const $ = (id) => document.getElementById(id);
  const svg = $('graph');
  const NS = 'http://www.w3.org/2000/svg';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    graph: null,
    info: null,
    pos: [],
    checked: false,
    round: 0,
    tally: { rounds: 0, right: 0, total: 0, perfect: 0 },
  };

  function buildPropList() {
    const ul = $('propList');
    ul.innerHTML = '';
    for (const p of PROPS) {
      const li = document.createElement('li');
      li.className = 'prop';
      li.id = `row-${p.id}`;
      li.innerHTML = `
        <span class="margin" id="m-${p.id}"></span>
        <label class="prop-label" for="p-${p.id}">
          <input type="checkbox" id="p-${p.id}">
          <span class="box" aria-hidden="true"></span>
          <span class="stmt"><i>G</i> ${STMT[p.id]}.</span>
        </label>
        <p class="verdict" id="v-${p.id}" hidden></p>`;
      ul.appendChild(li);
    }
    $('defList').innerHTML = PROPS.map((p) => `<dt>${p.name}</dt><dd>${p.def}</dd>`).join('');
  }

  function draw() {
    const g = state.graph;
    const P = state.pos;
    const show = state.checked;
    const info = state.info;
    let html = '<g class="edges">';
    for (const [u, v] of g.edges) {
      html += `<line class="edge" x1="${P[u].x.toFixed(1)}" y1="${P[u].y.toFixed(1)}" x2="${P[v].x.toFixed(1)}" y2="${P[v].y.toFixed(1)}"/>`;
    }
    html += '</g><g class="nodes">';
    // Labels sit outside each vertex, pointing away from the centre of the drawing.
    const cx = P.reduce((s, p) => s + p.x, 0) / g.n;
    const cy = P.reduce((s, p) => s + p.y, 0) / g.n;
    for (let i = 0; i < g.n; i++) {
      const { x, y } = P[i];
      let ux = x - cx, uy = y - cy;
      const len = Math.hypot(ux, uy);
      if (len < 1) { ux = 0; uy = -1; } else { ux /= len; uy /= len; }
      let cls = 'node';
      if (show && info.color && info.color[i] === 1) cls += ' hollow';
      html += `<g class="${cls}" data-i="${i}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
        <circle class="hit" r="${R}"/><circle class="dot" r="6.5"/>
        <text class="label" x="${(ux * 21).toFixed(1)}" y="${(uy * 21).toFixed(1)}" dy="0.35em">${LABELS[i]}</text>`;
      if (show) {
        html += `<text class="deg" x="${(ux * 39).toFixed(1)}" y="${(uy * 39).toFixed(1)}" dy="0.35em">${info.deg[i]}</text>`;
      }
      html += '</g>';
    }
    html += '</g>';
    svg.innerHTML = html;
    $('stats').innerHTML = `The graph <i>G</i>, with <i>n</i>&#8201;=&#8201;${g.n} vertices and <i>m</i>&#8201;=&#8201;${g.edges.length} edges.`;
  }

  function animateTo(target) {
    if (reduceMotion) { state.pos = target; draw(); return; }
    const from = state.pos.map((p) => ({ ...p }));
    const t0 = performance.now();
    const dur = 450;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    function frame(now) {
      const t = Math.min((now - t0) / dur, 1);
      const e = ease(t);
      state.pos = from.map((p, i) => ({ x: p.x + (target[i].x - p.x) * e, y: p.y + (target[i].y - p.y) * e }));
      draw();
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function readN() {
    let n = parseInt($('nInput').value, 10);
    if (!Number.isFinite(n)) n = 7;
    n = Math.min(MAX_N, Math.max(MIN_N, n));
    $('nInput').value = n;
    return n;
  }

  function newRound() {
    const n = readN();
    state.graph = generate(n);
    state.info = analyse(state.graph);
    state.pos = circleLayout(n);
    state.checked = false;
    state.round++;
    $('probNo').textContent = state.round;
    for (const p of PROPS) {
      const box = $(`p-${p.id}`);
      box.checked = false;
      box.disabled = false;
      $(`row-${p.id}`).className = 'prop';
      $(`m-${p.id}`).innerHTML = '';
      const v = $(`v-${p.id}`);
      v.hidden = true;
      v.innerHTML = '';
    }
    $('result').hidden = true;
    $('resultMsg').hidden = true;
    $('built').hidden = true;
    $('checkBtn').disabled = false;
    $('newBtn').disabled = true;
    $('gate').hidden = false;
    draw();
  }

  function check() {
    if (state.checked) return;
    state.checked = true;
    let right = 0;
    for (const p of PROPS) {
      const box = $(`p-${p.id}`);
      const said = box.checked;
      const { value, why } = state.info.res[p.id];
      const ok = said === value;
      if (ok) right++;
      box.disabled = true;
      $(`row-${p.id}`).className = `prop ${ok ? 'is-right' : 'is-wrong'}`;
      $(`m-${p.id}`).innerHTML = ok ? TICK : CROSS;
      const v = $(`v-${p.id}`);
      v.innerHTML = `<span class="sr">${ok ? 'Correct.' : 'Wrong.'}</span><b>${value ? 'True' : 'False'}.</b> ${why}`;
      v.hidden = false;
    }
    const t = state.tally;
    t.rounds++; t.right += right; t.total += PROPS.length;
    if (right === PROPS.length) t.perfect++;

    const res = $('result');
    const perfect = right === PROPS.length;
    res.innerHTML = `<svg viewBox="0 0 130 74" aria-hidden="true"><path d="M70 7 C112 6 126 24 121 42 C115 63 76 70 50 67 C20 64 5 52 8 34 C11 15 38 7 76 9"/></svg>
      <span class="score" aria-label="${right} out of ${PROPS.length}">${right}<span class="slash">/</span>${PROPS.length}</span>`;
    res.hidden = false;
    const msg = $('resultMsg');
    msg.textContent = perfect ? 'Full marks.' : `${PROPS.length - right} to review: see the notes in red.`;
    msg.hidden = false;
    $('built').innerHTML = `<i>G</i> was built as ${state.graph.note}. Red numbers are vertex degrees${state.info.color ? '; filled and hollow vertices show the two sides of the bipartition' : ''}.`;
    $('built').hidden = false;
    $('tRounds').textContent = t.rounds;
    $('tAcc').textContent = `${Math.round((100 * t.right) / t.total)}%`;
    $('tPerfect').textContent = t.perfect;
    $('checkBtn').disabled = true;
    $('newBtn').disabled = false;
    $('gate').hidden = true;
    draw();
    $('newBtn').focus({ preventScroll: true });
  }

  /* Dragging vertices */
  let drag = null;
  function svgPoint(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  svg.addEventListener('pointerdown', (e) => {
    const node = e.target.closest('.node');
    if (!node) return;
    const i = Number(node.dataset.i);
    const p = svgPoint(e);
    drag = { i, dx: state.pos[i].x - p.x, dy: state.pos[i].y - p.y };
    svg.setPointerCapture(e.pointerId);
    svg.classList.add('dragging');
    e.preventDefault();
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = svgPoint(e);
    const clamp = (v) => Math.min(VIEW - R - 2, Math.max(R + 2, v));
    state.pos[drag.i] = { x: clamp(p.x + drag.dx), y: clamp(p.y + drag.dy) };
    draw();
  });
  const endDrag = (e) => {
    if (!drag) return;
    drag = null;
    svg.classList.remove('dragging');
    try { svg.releasePointerCapture(e.pointerId); } catch (_) { /* already released */ }
  };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  /* Wiring */
  $('genForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!state.checked) return;
    newRound();
  });
  $('nDec').addEventListener('click', () => { $('nInput').value = readN() - 1; readN(); });
  $('nInc').addEventListener('click', () => { $('nInput').value = readN() + 1; readN(); });
  $('nInput').addEventListener('change', readN);
  $('checkBtn').addEventListener('click', check);
  $('circleBtn').addEventListener('click', () => animateTo(circleLayout(state.graph.n)));
  $('springBtn').addEventListener('click', () => animateTo(springLayout(state.graph, state.pos)));

  buildPropList();
  newRound();

  // Exposed for testing in the console.
  window.GraphSpotter = { analyse, isPlanar, makeGraph, generate };
})();
