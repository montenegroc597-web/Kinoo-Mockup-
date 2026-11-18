/*!
 * kinoo-dc.js — runtime mínimo para las pantallas del prototipo Kinoo.
 * Compila el <template id="kdc-tpl"> de cada pantalla a vnodes de Preact,
 * resuelve los huecos {{a.b}}, <sc-if> y <sc-for>, y monta la lógica
 * `class Component extends DCLogic` que trae cada pantalla.
 * MIT · Kinoo
 */
(function () {
  'use strict';
  var P = window.preact;
  var h = P.h, Fragment = P.Fragment, Component = P.Component;

  var WHOLE = /^\{\{\s*([^{}]*?)\s*\}\}$/;
  var HOLE = /\{\{\s*([^{}]*?)\s*\}\}/g;

  function lookup(scope, expr) {
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return +expr;
    var parts = expr.split('.');
    var v = scope[parts[0]];
    for (var i = 1; i < parts.length && v != null; i++) v = v[parts[i]];
    return v;
  }
  function str(v) { return v == null || v === false ? '' : String(v); }

  function compileValue(s) {
    var m = s.match(WHOLE);
    if (m) { var e = m[1]; return function (sc) { return lookup(sc, e); }; }
    if (s.indexOf('{{') < 0) return function () { return s; };
    var parts = [], last = 0, r;
    HOLE.lastIndex = 0;
    while ((r = HOLE.exec(s))) {
      parts.push(s.slice(last, r.index));
      parts.push({ e: r[1] });
      last = r.index + r[0].length;
    }
    parts.push(s.slice(last));
    return function (sc) {
      var out = '';
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        out += typeof p === 'string' ? p : str(lookup(sc, p.e));
      }
      return out;
    };
  }

  function compileChildren(node) {
    var out = [];
    for (var c = node.firstChild; c; c = c.nextSibling) {
      var f = compileNode(c);
      if (f) out.push(f);
    }
    return out;
  }
  function run(kids, sc) {
    var a = new Array(kids.length);
    for (var i = 0; i < kids.length; i++) a[i] = kids[i](sc);
    return a;
  }

  function compileNode(n) {
    if (n.nodeType === 3) {
      var t = n.nodeValue;
      if (t.indexOf('{{') < 0) return function () { return t; };
      var m = t.match(WHOLE);
      if (m) {
        var e = m[1];
        return function (sc) {
          var v = lookup(sc, e);
          return v == null || typeof v === 'boolean' ? null : String(v);
        };
      }
      var cv = compileValue(t);
      return function (sc) { return cv(sc); };
    }
    if (n.nodeType !== 1) return null;
    var tag = n.localName;

    if (tag === 'helmet' || tag === 'sc-helmet' || tag === 'script') return null;

    if (tag === 'sc-if') {
      var cond = compileValue(n.getAttribute('value') || '');
      var ik = compileChildren(n);
      return function (sc) { return cond(sc) ? h(Fragment, null, run(ik, sc)) : null; };
    }
    if (tag === 'sc-for') {
      var list = compileValue(n.getAttribute('list') || '');
      var as = n.getAttribute('as') || 'item';
      var fk = compileChildren(n);
      return function (sc) {
        var arr = list(sc);
        if (!Array.isArray(arr)) arr = [];
        return h(Fragment, null, arr.map(function (it, i) {
          var s2 = Object.assign({}, sc);
          s2[as] = it; s2.$index = i;
          return h(Fragment, { key: i }, run(fk, s2));
        }));
      };
    }
    if (tag === 'style') {
      var css = n.textContent;
      return function () { return h('style', { dangerouslySetInnerHTML: { __html: css } }); };
    }

    var attrs = [];
    for (var i = 0; i < n.attributes.length; i++) {
      var a = n.attributes[i];
      if (a.name.indexOf('hint-') === 0) continue;
      attrs.push([a.name, compileValue(a.value), a.name.slice(0, 2) === 'on', a.name === 'ref']);
    }
    var kids = compileChildren(n);
    return function (sc) {
      var props = {};
      for (var j = 0; j < attrs.length; j++) {
        var A = attrs[j], v = A[1](sc);
        if ((A[2] || A[3]) && typeof v !== 'function') continue;
        props[A[0]] = v;
      }
      return h.apply(null, [tag, props].concat(run(kids, sc)));
    };
  }

  /* ---- Lógica ---- */
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (u, cb) {
    var prev = this.state || {};
    var d = typeof u === 'function' ? u(prev) : u;
    this.state = Object.assign({}, prev, d || {});
    if (this.__w) this.__w.forceUpdate(cb);
    else if (cb) setTimeout(cb);
  };
  DCLogic.prototype.forceUpdate = function (cb) { if (this.__w) this.__w.forceUpdate(cb); };
  DCLogic.prototype.renderVals = function () { return {}; };
  DCLogic.prototype.componentDidMount = function () {};
  DCLogic.prototype.componentWillUnmount = function () {};
  window.DCLogic = DCLogic;

  function boot() {
    var tpl = document.getElementById('kdc-tpl');
    if (!tpl) return;
    var kids = compileChildren(tpl.content);
    var Logic = DCLogic;
    var src = document.getElementById('kdc-logic');
    if (src && /class\s+Component/.test(src.textContent)) {
      try {
        Logic = new Function('DCLogic', src.textContent + '\n;return Component;')(DCLogic);
      } catch (e) { console.error('[kinoo-dc] logic', e); }
    }
    function Root() {
      Component.call(this);
      try { this.logic = new Logic({}); } catch (e) { console.error(e); this.logic = new DCLogic({}); }
      this.logic.__w = this;
    }
    Root.prototype = Object.create(Component.prototype);
    Root.prototype.constructor = Root;
    Root.prototype.componentDidMount = function () { try { this.logic.componentDidMount(); } catch (e) { console.error(e); } };
    Root.prototype.componentWillUnmount = function () { try { this.logic.componentWillUnmount(); } catch (e) { console.error(e); } };
    Root.prototype.render = function () {
      var vals = {};
      try { vals = this.logic.renderVals() || {}; } catch (e) { console.error('[kinoo-dc] renderVals', e); }
      return h(Fragment, null, run(kids, vals));
    };
    var mount = document.getElementById('kdc-root');
    P.render(h(Root, null), mount);
    // Al volver con el botón atrás (bfcache) reinicia la pantalla limpia.
    window.addEventListener('pageshow', function (e) { if (e.persisted) location.reload(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
