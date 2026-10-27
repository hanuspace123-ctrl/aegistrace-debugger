const fetch = globalThis.fetch;
(async () => {
    try {
        const res = await fetch('https://ecommerce-visual-debugger.vercel.app');
        const text = await res.text();
        console.log('HTTP Status:', res.status);
        console.log('Has hero-action-card:', text.includes('id="hero-action-card"'));
        console.log('Has btn-hero-simulate:', text.includes('id="btn-hero-simulate"'));
        console.log('Has view-mode-bar:', text.includes('id="view-mode-bar"'));
        console.log('Has 4-step stepper:', text.includes('id="hero-stepper-track"'));
        console.log('Has outcome banner:', text.includes('id="hero-outcome-banner"'));
    } catch (e) {
        console.error('Error fetching Vercel:', e);
    }
})();
