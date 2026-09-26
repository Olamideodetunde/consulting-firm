const express = require('express');
const router = express.Router();

// Pricing matrix
const BASE_RATES = {
  accounting: {
    micro: { base: 250000, name: 'Cloud Accounting & Basic Tax Stewardship' },
    sme: { base: 450000, name: 'Full Onsite/Offsite Accounting & Tax Compliance' },
    midmarket: { base: 850000, name: 'Corporate Multi-Entity Accounting & Treasury Oversight' },
    enterprise: { base: 1500000, name: 'Enterprise Financial Stewardship & Group Tax Architecture' }
  },
  finance: {
    micro: { base: 350000, name: 'SME Loan Packaging & Working Capital Advisory' },
    sme: { base: 650000, name: 'Corporate Finance & Debt Turnaround Retainer' },
    midmarket: { base: 1200000, name: 'Capital Structuring, Bank Negotiations & Due Diligence' },
    enterprise: { base: 2500000, name: 'M&A, Private Equity & Institutional Balance Sheet Restructuring' }
  },
  strategy: {
    micro: { base: 300000, name: 'CEO Strategy Bootcamp & AI Blueprint' },
    sme: { base: 600000, name: 'Enterprise Strategy, AI Workflow Integration & Interim Oversight' },
    midmarket: { base: 1100000, name: 'Corporate Transformation, Governance & Risk Framework' },
    enterprise: { base: 2200000, name: 'Conglomerate Strategic Advisory & Global Market Expansion' }
  },
  hr: {
    micro: { base: 200000, name: 'Core HR Setup, Handbook & Key Talent Search' },
    sme: { base: 400000, name: 'HR Operations, CMD-Certified Staff Training & Compensation' },
    midmarket: { base: 750000, name: 'Complete HR Shared Services & Performance Architecture' },
    enterprise: { base: 1400000, name: 'Enterprise Talent Engine & Executive Succession Planning' }
  },
  tfy_full: {
    micro: { base: 450000, name: 'TFY SME Turnaround Accelerator (All-in-One)' },
    sme: { base: 850000, name: 'TFY Growth Engine (Finance + Tax + Strategy Hybrid)' },
    midmarket: { base: 1600000, name: 'TFY Comprehensive Corporate Transformation Suite' },
    enterprise: { base: 3000000, name: 'TFY Conglomerate Restructuring & Market Dominance' }
  }
};

const ADDON_PRICES = {
  pencom_cert: { fee: 180000, name: 'PENCOM & NSITF Compliance Procurement' },
  itf_cert: { fee: 120000, name: 'Industrial Training Fund (ITF) Clearance' },
  bpp_cert: { fee: 150000, name: 'BPP Federal Tender Contractor Registration' },
  cloud_setup: { fee: 250000, name: 'Cloud ERP Software Migration (QuickBooks / Zoho Books)' },
  bank_audit: { fee: 350000, name: 'Forensic Bank Excess Charges Audit (Up to 5 Years)' },
  cmd_training: { fee: 400000, name: 'CMD-Accredited Executive Leadership Training (10 Staff)' },
  forensic_investigation: { fee: 500000, name: 'Corporate Fraud & Cyber Intelligence Review' }
};

// POST /api/calculator/estimate
router.post('/estimate', (req, res) => {
  try {
    const { tier = 'sme', pillar = 'accounting', frequency = 'monthly_retainer', addons = [] } = req.body;

    const pillarData = BASE_RATES[pillar] || BASE_RATES['accounting'];
    const rateData = pillarData[tier] || pillarData['sme'];
    let basePrice = rateData.base;

    // Apply frequency multiplier or discount
    let frequencyLabel = 'Monthly Retainer';
    let billingMultiplier = 1;
    if (frequency === 'quarterly') {
      frequencyLabel = 'Quarterly Commitment (5% Strategic Rebate)';
      basePrice = Math.round(basePrice * 3 * 0.95);
      billingMultiplier = 3;
    } else if (frequency === 'project_basis') {
      frequencyLabel = 'One-off Strategic Milestone Project';
      basePrice = Math.round(basePrice * 1.4);
    }

    // Calculate addons
    const selectedAddons = [];
    let addonsTotal = 0;
    if (Array.isArray(addons)) {
      addons.forEach(key => {
        if (ADDON_PRICES[key]) {
          selectedAddons.push(ADDON_PRICES[key]);
          addonsTotal += ADDON_PRICES[key].fee;
        }
      });
    }

    const grandTotal = basePrice + addonsTotal;
    const formattedGrandTotal = `₦${grandTotal.toLocaleString()}`;
    const formattedBase = `₦${basePrice.toLocaleString()}`;
    const formattedAddons = `₦${addonsTotal.toLocaleString()}`;

    res.json({
      success: true,
      data: {
        tier,
        pillar,
        packageTitle: rateData.name,
        frequency: frequencyLabel,
        basePrice,
        formattedBase,
        addonsTotal,
        formattedAddons,
        selectedAddons,
        grandTotal,
        formattedGrandTotal,
        turnaround: frequency === 'project_basis' ? '3 to 6 Weeks' : 'Immediate Onboarding (72 Hours)',
        leadPartner: pillar === 'accounting' ? 'Mr. Seun Olaniyi, ACA' :
                     pillar === 'hr' ? 'Mrs. Dolapo Wale-Kehinde, PHRi' :
                     'Mr. Kehinde Adewale, FCA, MBA'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/calculator/config
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      baseRates: BASE_RATES,
      addons: ADDON_PRICES
    }
  });
});

module.exports = router;
