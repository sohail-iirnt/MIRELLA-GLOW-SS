(() => {
  const init = () => {
    const footer = document.querySelector('.footer');
    const copyright = document.querySelector('.copyright');
    if (!footer || !copyright || document.getElementById('mirellaFooterTrust')) return;

    const trust = document.createElement('div');
    trust.id = 'mirellaFooterTrust';
    trust.className = 'mirella-footer-trust';
    trust.innerHTML = `
      <span class="mirella-developed-by">
        Developed by
        <a href="https://www.instagram.com/webaura_iii/" target="_blank" rel="noopener noreferrer" aria-label="Webaura by III on Instagram">Webaura by III</a>
      </span>
      <span class="mirella-ssl-badge" aria-label="Secured by SSL">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <rect x="4.5" y="10" width="15" height="11" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/>
          <circle cx="12" cy="15.2" r="1.2" fill="currentColor"/>
          <path d="M12 16.4v2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <span>Secured by SSL</span>
      </span>
      <span class="mirella-copyright">© 2026 Mirella Glow. All rights reserved.</span>`;

    copyright.replaceWith(trust);

    const style = document.createElement('style');
    style.textContent = `
      .mirella-footer-trust{width:100%;max-width:1380px;margin:28px auto 0;padding-top:18px;border-top:1px solid #ffffff16;display:flex;align-items:center;justify-content:center;gap:22px;flex-wrap:nowrap;text-align:center;font-size:10px;color:#a99c96}
      .mirella-developed-by,.mirella-ssl-badge,.mirella-copyright{display:inline-flex;align-items:center;white-space:nowrap}
      .mirella-developed-by{gap:4px}
      .mirella-developed-by a{color:#fff;text-decoration:none;font-weight:600;transition:opacity .2s ease}
      .mirella-developed-by a:hover{opacity:.72;text-decoration:underline;text-underline-offset:3px}
      .mirella-ssl-badge{gap:7px;color:#d7cbc6;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
      .mirella-ssl-badge svg{width:20px;height:20px;flex:0 0 20px}
      .mirella-copyright{color:#a99c96}
      @media(max-width:700px){.mirella-footer-trust{gap:10px;font-size:9px;overflow-x:auto;justify-content:center}.mirella-ssl-badge{font-size:8px}.mirella-ssl-badge svg{width:18px;height:18px;flex-basis:18px}}
    `;
    document.head.appendChild(style);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
