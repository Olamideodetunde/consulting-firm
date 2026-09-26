/**
 * THEWHY CONSULTING - Interactive Fee & Retainership Calculator
 * Inspired by transparent advisory pricing on gloriaondah.com
 */

(function () {
  let currentTier = 'sme';
  let currentPillar = 'accounting';
  let currentFrequency = 'monthly_retainer';
  let selectedAddons = new Set();

  function initCalculator() {
    // Tier buttons
    const tierBtns = document.querySelectorAll('.calc-tier-btn');
    tierBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tierBtns.forEach(b => {
          b.classList.remove('active', 'border-brandOrange', 'bg-orange-50', 'text-brandOrangeDark');
          b.classList.add('border-slate-200', 'bg-white', 'text-slate-700');
        });
        btn.classList.add('active', 'border-brandOrange', 'bg-orange-50', 'text-brandOrangeDark');
        btn.classList.remove('border-slate-200', 'bg-white', 'text-slate-700');
        currentTier = btn.getAttribute('data-tier');
        updateEstimate();
      });
    });

    // Pillar buttons
    const pillarBtns = document.querySelectorAll('.calc-pillar-btn');
    pillarBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        pillarBtns.forEach(b => {
          b.classList.remove('active', 'bg-brandDark', 'text-white', 'shadow-md');
          b.classList.add('bg-slate-100', 'text-slate-700');
        });
        btn.classList.add('active', 'bg-brandDark', 'text-white', 'shadow-md');
        btn.classList.remove('bg-slate-100', 'text-slate-700');
        currentPillar = btn.getAttribute('data-pillar');
        updateEstimate();
      });
    });

    // Frequency Radios
    const freqInputs = document.querySelectorAll('input[name="calc-frequency"]');
    freqInputs.forEach(input => {
      input.addEventListener('change', () => {
        currentFrequency = input.value;
        updateEstimate();
      });
    });

    // Addon Checkboxes
    const addonCheckboxes = document.querySelectorAll('.calc-addon-check');
    addonCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          selectedAddons.add(cb.value);
        } else {
          selectedAddons.delete(cb.value);
        }
        updateEstimate();
      });
    });

    // Action button to pre-fill booking modal
    const bookRetainerBtn = document.getElementById('calc-book-btn');
    if (bookRetainerBtn) {
      bookRetainerBtn.addEventListener('click', () => {
        const packageTitle = document.getElementById('calc-package-title')?.innerText || 'Advisory Retainer';
        const feeText = document.getElementById('calc-grand-total')?.innerText || '';
        
        if (window.openBookingModal) {
          window.openBookingModal({
            service: packageTitle,
            estimatedFee: feeText,
            companySize: currentTier === 'micro' ? 'Micro SME (<10 staff)' :
                         currentTier === 'sme' ? 'Small Business (10-50 staff)' :
                         currentTier === 'midmarket' ? 'Medium Enterprise (50-250 staff)' :
                         'Corporate (250+ staff)'
          });
        }
      });
    }

    // Initial calculation
    updateEstimate();
  }

  async function updateEstimate() {
    const payload = {
      tier: currentTier,
      pillar: currentPillar,
      frequency: currentFrequency,
      addons: Array.from(selectedAddons)
    };

    try {
      const res = await fetch('/api/calculator/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        renderEstimate(data.data);
      }
    } catch (err) {
      // Fallback offline calculation
      renderOfflineEstimate(payload);
    }
  }

  function renderEstimate(data) {
    const titleEl = document.getElementById('calc-package-title');
    const baseEl = document.getElementById('calc-base-price');
    const addonsEl = document.getElementById('calc-addons-price');
    const totalEl = document.getElementById('calc-grand-total');
    const turnaroundEl = document.getElementById('calc-turnaround');
    const partnerEl = document.getElementById('calc-lead-partner');
    const freqBadgeEl = document.getElementById('calc-freq-badge');

    if (titleEl) titleEl.innerText = data.packageTitle;
    if (baseEl) baseEl.innerText = data.formattedBase;
    if (addonsEl) addonsEl.innerText = data.formattedAddons;
    if (totalEl) totalEl.innerText = data.formattedGrandTotal;
    if (turnaroundEl) turnaroundEl.innerText = data.turnaround;
    if (partnerEl) partnerEl.innerText = data.leadPartner;
    if (freqBadgeEl) freqBadgeEl.innerText = data.frequency;
  }

  function renderOfflineEstimate(payload) {
    let base = 450000;
    if (payload.tier === 'micro') base = 250000;
    if (payload.tier === 'midmarket') base = 850000;
    if (payload.tier === 'enterprise') base = 1500000;

    let addonsSum = payload.addons.length * 200000;
    let grand = base + addonsSum;

    renderEstimate({
      packageTitle: 'Custom Advisory Package',
      formattedBase: `₦${base.toLocaleString()}`,
      formattedAddons: `₦${addonsSum.toLocaleString()}`,
      formattedGrandTotal: `₦${grand.toLocaleString()}`,
      turnaround: 'Immediate Onboarding (72 Hours)',
      leadPartner: 'Mr. Kehinde Adewale, FCA, MBA',
      frequency: payload.frequency === 'quarterly' ? 'Quarterly Commitment' : 'Monthly Retainer'
    });
  }

  window.addEventListener('DOMContentLoaded', initCalculator);
})();
