// Carte Home Assistant « configurateur-3d-card » : affiche le configurateur dans une iframe de même origine
// (srcdoc) et lui transmet l'objet hass. Le code de l'application est embarqué (voir ha/build.mjs).
// Usage :
//   type: custom:configurateur-3d-card            # éditeur complet (page de travail)
//   type: custom:configurateur-3d-card            # vue publiée : plan copié par le bouton « Publier »
//   readonly: true
//   plan: { … }
//   height: 85vh                                  # optionnel ; par défaut la vue publiée s'ajuste à la maison (sans dépasser l'écran)
export function defineCard(getHtml) {
  if (customElements.get('configurateur-3d-card')) return;
  class Configurateur3DCard extends HTMLElement {
    setConfig(c) {
      this._c = c || {};
      if (this._f) return;
      const ro = !!this._c.readonly;
      this.style.display = 'block';
      const f = (this._f = document.createElement('iframe'));
      // color-scheme identique à celui du document interne : sinon le navigateur peint un fond opaque derrière l'iframe
      f.style.cssText = `width:100%;height:${this._c.height || (ro ? 'calc(100vh - 56px)' : '85vh')};border:0;display:block;color-scheme:light;` + (ro ? 'background:transparent' : 'border-radius:12px;background:#eef1f4');
      f.setAttribute('allow', 'fullscreen');
      this.append(f);
      getHtml().then((html) => {
        f.srcdoc = html.replace('<body>', '<body><script>window.__CFG=' + JSON.stringify(this._c).replace(/</g, '\\u003c') + ';<\/script>');
        f.addEventListener('load', () => { this._push(); this._fit(); });
      });
      if (ro && !this._c.height && window.ResizeObserver) { this._ro = new ResizeObserver(() => this._fit()); this._ro.observe(this); }
    }
    // hauteur de la vue publiée : proportionnelle à la maison, sans jamais dépasser la fenêtre
    _fit() {
      const f = this._f;
      try {
        if (!this._c.readonly || this._c.height || !f.contentWindow || !f.contentWindow.__aspect) return;
        const w = this.clientWidth || f.clientWidth, h = Math.round(Math.min(w * f.contentWindow.__aspect(), window.innerHeight - 56));
        if (w && h > 120) f.style.height = h + 'px';
      } catch (e) { /* iframe pas prête */ }
    }
    set hass(h) { this._hass = h; this._push(); }
    _push() { try { if (this._hass && this._f && this._f.contentWindow && this._f.contentWindow.__setHass) this._f.contentWindow.__setHass(this._hass); } catch (e) { /* iframe pas prête */ } }
    connectedCallback() { if (this._ro) this._ro.observe(this); this._onWin = this._onWin || (() => this._fit()); window.addEventListener('resize', this._onWin); }
    disconnectedCallback() { if (this._ro) this._ro.disconnect(); window.removeEventListener('resize', this._onWin); }
    getCardSize() { return 12; }
    static getStubConfig() { return {}; }
  }
  customElements.define('configurateur-3d-card', Configurateur3DCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'configurateur-3d-card', name: 'Configurateur 3D', description: 'Éditeur de plan 3D relié à Home Assistant (vue publiée en lecture seule avec readonly: true)' });
}
