/**
 * THEWHY CONSULTING - Seed Database
 * Boutique Management Consulting & Advisory | An affiliate of Wale Kehinde & Co. (Chartered Accountants)
 * Complete dataset covering all 10 practice areas, 6 industry sectors, core team, testimonials,
 * product launch campaign, and site configuration.
 */

module.exports = {
  services: [
    {
      id: "accounting-tax",
      pillar: "01",
      pillarName: "Accounting & Tax Services",
      title: "Accounting, Tax & Cloud Systems",
      slug: "accounting-tax",
      shortDesc: "Onsite and offsite stewardship, wealth protection, and stress-free Nigerian tax authority liaison.",
      fullDesc: "Our onsite and offsite accounting services are geared towards proper stewardship and accountability for maximization of wealth for all stakeholders, business owners, and directors. We handle end-to-end accounting policies, cloud software deployment, reconciliation, asset verification, and representation before state and federal tax authorities.",
      icon: "fa-calculator",
      color: "orange",
      features: [
        "Stocktaking & Asset Verification",
        "Debt Management & Recovery",
        "Excess Bank Charges Recovery",
        "Treasury & Bank Reconciliation",
        "Cloud Accounting Software Setup (QuickBooks, Zoho, Sage)",
        "Stress-Free Tax Authority Liaison (FIRS & LIRS)",
        "Employee & Expatriate Tax Planning",
        "VAT Registration & Monthly Compliance"
      ],
      deliverables: [
        "Audited management accounts & reconciliations",
        "Monthly tax remittance receipts & Tax Clearance Certificates (TCC)",
        "Bank charge excess audit recovery report",
        "Cloud-based operational accounting chart of accounts"
      ]
    },
    {
      id: "corporate-finance",
      pillar: "02",
      pillarName: "Corporate Finance & Advisory",
      title: "Corporate Finance & Capital Structuring",
      slug: "corporate-finance",
      shortDesc: "Accelerating financial impact through targeted capital deployments, M&A, and debt turnaround.",
      fullDesc: "We offer clients holistic advice, targeted capital deployments, and deep relationships with investment banks, commercial banks, private equities, and angel investors. We analyze buy-or-lease decisions, source affordable loans, structure mergers and acquisitions, and revitalize distressed corporate balance sheets.",
      icon: "fa-chart-pie",
      color: "blue",
      features: [
        "Sourcing Affordable Loans & Working Capital",
        "Buy or Lease Financial Decision Analysis",
        "Money & Capital Market Transaction Advisory",
        "Mergers, Acquisitions & Demergers (M&A)",
        "Comprehensive Project Reports for Bank Finances",
        "Private Equity & Long-Term Debt Structuring",
        "Revival of Debt-Ridden Companies",
        "Cash Flow Forecasting & Dynamic Budgeting Models"
      ],
      deliverables: [
        "Bankable project appraisal & investment memorandums",
        "Debt restructuring agreements & concession negotiations",
        "M&A valuation model & due diligence reports",
        "5-Year dynamic financial forecasts & sensitivity models"
      ]
    },
    {
      id: "strategy-solutions",
      pillar: "03",
      pillarName: "Strategy & Business Solutions",
      title: "Strategy, Innovation & AI Solutions",
      slug: "strategy-solutions",
      shortDesc: "Strategic CEO boot camps, AI integration for business breakthrough, and interim enterprise management.",
      fullDesc: "Driving innovation and new ventures to ensure Nigerian businesses survive and dominate across volatile economic cycles. We facilitate CEO strategic boot camps, harness practical AI for enterprise efficiency, support foreign direct investments, and conduct computer forensics and fraud prevention audits.",
      icon: "fa-lightbulb",
      color: "purple",
      features: [
        "Strategic Boot Camps for SME CEOs & Directors",
        "Harnessing AI for Breakthrough Business Innovation",
        "Foreign Direct Investment & Nigeria Market Entry",
        "Interim Business Management & Succession Planning",
        "Computer Forensics & Cyber Security Intelligence",
        "Corporate Fraud Investigation & Anti-Money Laundering",
        "Fixed Asset Certification & Valuation",
        "Joint Ventures & Strategic Partnership Structuring"
      ],
      deliverables: [
        "Corporate strategic roadmap & execution KPI matrix",
        "AI workflow automation blueprint for operations",
        "Forensic audit report & internal control fortification",
        "Corporate governance charter & board packs"
      ]
    },
    {
      id: "hr-services",
      pillar: "04",
      pillarName: "HR Services & Development",
      title: "HR Consulting & CMD-Certified Training",
      slug: "hr-services",
      shortDesc: "Talent acquisition, executive capacity building, CMD-certified training, and statutory certifications.",
      fullDesc: "Comprehensive human resource management from recruitment to training certified by the Centre for Management Development (CMD). We optimize human capital performance, structure competitive compensation packages, perform mystery shopping background checks, and procure statutory certifications including PENCOM, NSITF, and ITF.",
      icon: "fa-users-gear",
      color: "emerald",
      features: [
        "Recruitment, Selection & Executive Headhunting",
        "HR Operations, Policies & Shared Services Setup",
        "Compensation, Benefits & Performance Architecture",
        "Background Checks, Credential Verification & Mystery Shopping",
        "Training Services: Certified by Centre for Management Development (CMD)",
        "PENCOM, NSITF, ITF & BPP Statutory Certificates",
        "Expatriate Quota & Immigration Advisory",
        "Staff Capability Matrix & Succession Planning"
      ],
      deliverables: [
        "Complete Employee Handbook & HR Policy Manual",
        "CMD accredited training certificates & impact assessment",
        "Statutory compliance clearance certificates (PENCOM/ITF/NSITF)",
        "Competitive salary structure & incentive grading scheme"
      ]
    },
    {
      id: "audit-assurance",
      pillar: "05",
      pillarName: "Audit & Assurance",
      title: "Audit, Assurance & Forensic Investigation",
      slug: "audit-assurance",
      shortDesc: "Statutory audits, concurrent reviews, fraud investigations, anti-money laundering, and cyber forensic intelligence.",
      fullDesc: "Independent, rigorous audits providing clear visibility over corporate governance, financial integrity, and risk exposures. In addition to statutory and operational audits, we conduct forensic reviews for embezzlement, diversion of funds, partner disputes, and loss of profit claims.",
      icon: "fa-shield-halved",
      color: "blue",
      features: [
        "Statutory Audit & Tax Audit Liaison",
        "Internal Audit & Concurrent Audit Programs",
        "Management & Operational Audits",
        "Special Investigation Audits & Fraud Security",
        "Anti-Money Laundering (AML) Compliance & Advisory",
        "Cyber Security & Computer Forensic Investigations",
        "Stock Audit, Revenue Audit & Cost Reviews",
        "System & Process Control Technical Reviews"
      ],
      deliverables: [
        "Comprehensive statutory audit opinion & management letter",
        "Forensic fraud investigation & evidence reports",
        "Internal control risk matrix & remediation blueprint",
        "AML compliance audit report & regulatory submission"
      ]
    },
    {
      id: "business-support",
      pillar: "06",
      pillarName: "Business Support & Inception",
      title: "Business Support & Foreign Direct Investment",
      slug: "business-support",
      shortDesc: "Foreign direct investment, corporate entity formations, LLP conversion, and regulatory representations.",
      fullDesc: "Helping local and international entrepreneurs establish and structure thriving legal entities in Nigeria. We streamline CAC private and public registrations, Limited Liability Partnerships, foreign investor equity onboarding, NGO and foundation incorporations, and post-incorporation governance.",
      icon: "fa-building-circle-check",
      color: "gold",
      features: [
        "Foreign Direct Investment (FDI) Advisory & Entity Setup",
        "Company Registration (Private & Public Limited Companies)",
        "Limited Liability Partnership (LLP) Formations & Conversions",
        "Registration of Trusts, NGOs & Business Associations",
        "Post-Incorporation Filings & Corporate Affairs Commission (CAC) Changes",
        "Authorized Representation Before Regulatory Agencies",
        "Setting Up Liaison, Branch & Project Offices in Nigeria",
        "Local Content & Operating Permit Facilitation"
      ],
      deliverables: [
        "CAC Certificate of Incorporation & Status Report",
        "FDI Capital Importation & NIPC Business Registration",
        "Constitution & By-laws for Trusts/Associations",
        "Corporate seal, statutory records & board resolutions"
      ]
    },
    {
      id: "business-advisory",
      pillar: "07",
      pillarName: "Business Advisory",
      title: "Business Advisory & Growth Planning",
      slug: "business-advisory",
      shortDesc: "Growth roadmaps, succession planning, risk & uncertainty management, and turnaround models.",
      fullDesc: "Translating ambiguous market opportunities and threats into structured, decisive commercial moves. We build bespoke cash flow forecast models, craft strategic decision appraisal frameworks, design enterprise succession roadmaps, and assist distressed businesses in executing resilient turnaround strategies.",
      icon: "fa-compass",
      color: "orange",
      features: [
        "Growth Planning & Business Model Innovation",
        "Succession Planning & Executive Continuity",
        "Strategic Decision Appraisal & Implementation Roadmaps",
        "Risk, Uncertainty & Change Management Services",
        "Cash Flow Analysis, Forecasting & Budgeting Models",
        "National & Global Expansion Strategy",
        "Revival of Debt-Ridden Companies & Insolvency Avoidance",
        "Tailored-For-You (TFY) Advisory for High-Growth SMEs"
      ],
      deliverables: [
        "Dynamic 3-Year Strategic Growth Plan & Balanced Scorecard",
        "Enterprise Risk Register & Contingency Playbook",
        "Rolling 12-Month Integrated Cash Flow Forecast",
        "Succession Protocol & Ownership Transition Plan"
      ]
    },
    {
      id: "secretarial-support",
      pillar: "08",
      pillarName: "Secretarial & Corporate Support",
      title: "Secretarial & Corporate Governance Support",
      slug: "secretarial-support",
      shortDesc: "Board meeting coordination, minute distribution, statutory registers, and corporate seal custody.",
      fullDesc: "Ensuring your enterprise maintains impeccable corporate governance and stays in good standing. We manage board meeting schedules, prepare board packs and minutes, maintain statutory registers, file statutory returns, and review Chairman's statements and Directors' reports.",
      icon: "fa-briefcase",
      color: "slate",
      features: [
        "Scheduling & Coordination of Board & Committee Meetings",
        "Preparation & Distribution of Minutes & Board Packs",
        "Custody & Maintenance of Corporate Seal & Statutory Registers",
        "Filing of All Statutory Returns with the CAC",
        "Review of Directors' Report & Chairman's Statement",
        "Shareholder & Board Resolution Drafting",
        "Corporate Governance Audit & Board Evaluation",
        "Advisory on Companies and Allied Matters Act (CAMA) Provisions"
      ],
      deliverables: [
        "Official Board Minutes & Executed Board Packs",
        "Certified Statutory Registers (Members, Directors, Charges)",
        "Annual CAC Compliance Confirmation Certificates",
        "Directors' Annual Report Drafting & Legal Polish"
      ]
    },
    {
      id: "outsourcing-accountants",
      pillar: "09",
      pillarName: "Outsourcing Accountants",
      title: "Outsourced Accounting & Financial Management",
      slug: "outsourcing-accountants",
      shortDesc: "Full-cycle outsourced accounting, payroll processing, management reporting, and audit facilitation.",
      fullDesc: "Affordable, elite-tier finance department capabilities without the prohibitive cost of an in-house accounting department. We handle day-to-day transaction processing, monthly payroll, cash management reporting, IFRS compliance, and serve as your primary liaison throughout statutory audit exercises.",
      icon: "fa-file-invoice-dollar",
      color: "blue",
      features: [
        "End-to-End Payroll Processing & Pay Slip Generation",
        "Annual & Special Purpose Statutory Accounts Preparation",
        "Budgeting, Variance Analysis & Cash Flow Planning",
        "Accounting System Reviews & Internal Controls Setup",
        "Physical Verification of Stocks, Assets & Inventories",
        "Assistance in Assessing Going Concern & Impairment",
        "Cash Management & Working Capital Reporting",
        "Continued Support & Liaison Throughout External Audit Processes"
      ],
      deliverables: [
        "Monthly Financial Management Dashboard & Profit & Loss",
        "Monthly Payroll Tax (PAYE) & Pension Remittance Schedules",
        "Complete Year-End Audit File & Balance Sheet Backups",
        "Quarterly Working Capital & Inventory Reconciliation"
      ]
    },
    {
      id: "statutory-certification",
      pillar: "10",
      pillarName: "Statutory Certification",
      title: "Statutory Certification & Regulatory Approvals",
      slug: "statutory-certification",
      shortDesc: "PENCOM, NSITF, ITF, BPP Federal Contractor clearance, Tax Clearance Certificates (TCC), and Asset Valuation.",
      fullDesc: "Unlocking institutional opportunities and government contracts for our clients. We fast-track and secure all statutory certifications required under Nigerian laws, including PENCOM pension compliance, NSITF employee compensation, Industrial Training Fund (ITF), Bureau of Public Procurement (BPP), and Tax Clearance Certificates.",
      icon: "fa-certificate",
      color: "gold",
      features: [
        "PENCOM National Pension Compliance Certification",
        "NSITF Employees' Compensation Scheme Certificates",
        "ITF (Industrial Training Fund) Compliance Certificates",
        "BPP (Bureau of Public Procurement) Federal Contractor Database",
        "State & Federal Tax Clearance Certificates (TCC)",
        "Fixed Asset Certification for Claiming Capital Deductions",
        "Net Worth Certificates for Bank Guarantees & Tender Financing",
        "Transfer Pricing Arm's Length Determination & Foreign Exchange Filings"
      ],
      deliverables: [
        "Original Verified Statutory Certificates (PENCOM, ITF, NSITF, BPP)",
        "Corporate Tax Clearance Certificate (TCC)",
        "Certified Fixed Asset Valuation Report for Tax Amortization",
        "Bankable Net Worth Certificate for Credit Facilities"
      ]
    }
  ],

  industries: [
    {
      id: "real-estate-infrastructure",
      title: "Real Estate & Infrastructure",
      subtitle: "Construction, Property Development & Consulting Firms",
      icon: "fa-city",
      image: "assets/img/banners/boardroom-strategy.jpg",
      description: "Managing long-term capital intensity, subcontractor withholding taxes, joint venture revenue sharing, and capital allowance claims on physical infrastructural developments.",
      challenges: [
        "Complex project cash flow forecasting across multi-year build phases",
        "Subcontractor WHT reconciliation and state-level property tax exposures",
        "Joint venture profit-sharing disputes and debt capital cost management"
      ],
      solutions: [
        "Project-level accounting and milestone escrow reconciliations",
        "Strategic tax planning for capital deductions and fixed asset certification",
        "Joint venture structuring and bankable project financing memorandums"
      ]
    },
    {
      id: "oil-gas-logistics",
      title: "Oil & Gas, Logistics & Exporting",
      subtitle: "Upstream/Downstream Support, Haulage, Ancillary & Exports",
      icon: "fa-truck-fast",
      image: "assets/img/banners/contract-signing.jpg",
      description: "Navigating heavy regulatory compliance (NUPRC, NCDMB), foreign exchange volatility, high fleet operating costs, and recovering unapproved financial institution debit charges.",
      challenges: [
        "Systemic excess bank charges and unapproved interest markups on trade facilities",
        "High fleet maintenance costs, asset depreciation, and fuel supply credit risks",
        "Export documentation, repatriation guidelines, and statutory levies"
      ],
      solutions: [
        "Algorithmic excess bank charges forensic review and cash recovery",
        "CMD-certified fleet safety and supply chain management training",
        "Local content certification, NCDMB compliance, and export tax incentives"
      ]
    },
    {
      id: "tech-fintech",
      title: "IT & Fintech Companies",
      subtitle: "Payments, SaaS, Tech Startups & Digital Platforms",
      icon: "fa-microchip",
      image: "assets/img/banners/boardroom-strategy.jpg",
      description: "Structuring high-growth technology ventures for institutional Series A/B capital, safeguarding intellectual property, and ensuring CBN and SEC regulatory compliance.",
      challenges: [
        "Navigating complex digital economy VAT and withholding tax regulations",
        "Disorganized historical bookkeeping hindering investor institutional due diligence",
        "Rapid cross-border contractor payroll and expatriate tax requirements"
      ],
      solutions: [
        "Cloud-based operational accounting chart of accounts (QuickBooks/Zoho)",
        "Dynamic 5-year unit economics modeling and investment memorandums",
        "Corporate restructuring, employee share option plans (ESOP), and CAC filings"
      ]
    },
    {
      id: "financial-institutions",
      title: "Banks & Financial Institutions",
      subtitle: "Commercial Banks, Microfinance, Asset Managers & Fintech Lenders",
      icon: "fa-building-columns",
      image: "assets/img/banners/bank-charges.jpg",
      description: "Providing independent loan book reviews, forensic embezzlement investigation, asset verification, and anti-money laundering (AML) advisory.",
      challenges: [
        "Non-performing loan (NPL) recovery and distressed borrower workouts",
        "Regulatory reporting accuracy under tight Central Bank of Nigeria mandates",
        "Fraud detection, computer forensics, and operational control vulnerability"
      ],
      solutions: [
        "Independent business reviews (IBR) for debt-ridden corporate debtors",
        "Forensic investigative audits and cyber intelligence support",
        "Third-party fixed asset physical verification and valuation"
      ]
    },
    {
      id: "social-healthcare-ngos",
      title: "Education, Healthcare & NGOs",
      subtitle: "Hospitals, Private Universities, Foundations & Global Non-Profits",
      icon: "fa-heart-pulse",
      image: "assets/img/banners/contact-desk.jpg",
      description: "Ensuring donor grant transparency, navigating tax exemption statuses, managing large payrolls, and maintaining statutory compliance for tender participation.",
      challenges: [
        "Donor grant accounting, strict project fund segregation, and audit trails",
        "Maintaining statutory tax-exempt status under the Company Income Tax Act",
        "Procuring mandatory PENCOM, ITF, and NSITF clearance for government grants"
      ],
      solutions: [
        "Specialized fund accounting policies and trust retention audits",
        "Full statutory certification procurement (PENCOM, ITF, NSITF, BPP)",
        "CMD-certified administrative capacity building and compensation design"
      ]
    },
    {
      id: "sme-growth",
      title: "SMEs & Fast-Growing Enterprises",
      subtitle: "Family Businesses, Importers, Distributors & Professional Services",
      icon: "fa-seedling",
      image: "assets/img/banners/boardroom-strategy.jpg",
      description: "Turning family-run and owner-managed businesses into enduring conglomerates through mentoring, strategic systems, and sound financial stewardship.",
      challenges: [
        "Over-reliance on the founder and absence of institutionalized governance",
        "Continuous working capital bottlenecks and high commercial borrowing rates",
        "Lack of formal tax planning leading to crippling back-tax audit liabilities"
      ],
      solutions: [
        "Tailored-For-You (TFY) outsourced financial accounting and monthly oversight",
        "Affordable bank credit facilitation and debt restructuring",
        "Stress-free tax liaison with FIRS and State IRS to secure Tax Clearance"
      ]
    }
  ],

  team: [
    {
      id: "kehinde-adewale",
      name: "Mr. Kehinde Adewale",
      credentials: "HND, FCA, ACIT, ACS, MBA Finance",
      role: "Managing Consultant",
      image: "assets/img/team/kehinde-adewale.jpg",
      bio: "A distinguished Fellow of the Institute of Chartered Accountants of Nigeria (FCA), Associate of the Chartered Institute of Taxation of Nigeria (ACIT), and Associate of the Chartered Institute of Stockbrokers (ACS). With over two decades of cutting-edge practice spanning corporate finance, forensic tax advisory, and strategic turnaround management, Mr. Adewale leads THEWHY Consulting with an unwavering commitment to enterprise resilience and wealth preservation.",
      specialties: ["Forensic Tax Advisory", "Excess Bank Charges Recovery", "Corporate Finance & M&A", "Capital Restructuring"]
    },
    {
      id: "dolapo-wale-kehinde",
      name: "Mrs. Dolapo Wale-Kehinde",
      credentials: "B.Tech, MBA (Finance), PHRi",
      role: "Head, Training and HR Consulting",
      image: "assets/img/team/dolapo-wale-kehinde.jpg",
      bio: "A certified Professional in Human Resources - International (PHRi) with an MBA in Finance. She directs THEWHY Consulting's human capital advisory, organizational design, executive capacity building, and CMD-accredited corporate training programs. She brings deep competence in competency framework design, executive headhunting, and statutory human resource compliance across diverse industrial sectors.",
      specialties: ["CMD-Certified Training", "Executive Talent Acquisition", "Compensation & Grading", "Statutory Certifications (PENCOM/ITF)"]
    },
    {
      id: "seun-olaniyi",
      name: "Mr. Seun Olaniyi",
      credentials: "BSc Accounting, ACA",
      role: "Accounting Operations",
      image: "assets/img/team/seun-olaniyi.jpg",
      bio: "A dedicated Associate Chartered Accountant (ACA) who oversees daily accounting operations, outsourced financial management, and statutory audit liaison for THEWHY's diverse SME and corporate client portfolios. Mr. Olaniyi specializes in cloud accounting implementations, payroll architecture, cash flow budgeting, and financial statement integrity.",
      specialties: ["Cloud Accounting Systems", "Statutory Reporting & IFRS", "Outsourced Payroll", "Internal Control Reviews"]
    }
  ],

  testimonials: [
    {
      id: "t-1",
      quote: "Exceptional Service, exceeded our expectation. They restructured our accounting infrastructure and resolved our lingering statutory compliance seamlessly.",
      author: "Chief Executive Officer",
      company: "Premier Logistics & Transport Group",
      sector: "Logistics & Supply Chain",
      rating: 5
    },
    {
      id: "t-2",
      quote: "Responsive team that understands our unique needs. Delivering innovative solutions that drive real results in challenging economic conditions.",
      author: "Managing Director",
      company: "Midwest Infrastructure & Development Co.",
      sector: "Real Estate & Construction",
      rating: 5
    },
    {
      id: "t-3",
      quote: "Trustworthy with a proven track record. Their excess bank charges recovery audit put over ₦80 Million straight back into our company's working capital.",
      author: "Finance Director",
      company: "West Africa Energy & Industrial Supplies",
      sector: "Oil & Gas Ancillary",
      rating: 5
    },
    {
      id: "t-4",
      quote: "A game changer in our business strategy. THEWHY helped us transition from a founder-dependent business into an institutionalized, scalable enterprise.",
      author: "Founder & Chairman",
      company: "Apex Healthcare & Diagnostic Centers",
      sector: "Healthcare & Pharmaceuticals",
      rating: 5
    },
    {
      id: "t-5",
      quote: "Consistently delivering quality with personal touch. Their CMD-accredited executive training transformed our middle management into proactive leaders.",
      author: "Head of People & Operations",
      company: "Fintech Dynamics Africa",
      sector: "Information Technology & Fintech",
      rating: 5
    }
  ],

  launchCampaign: {
    title: "THEWHY Executive Business Acceleration & SME Scaling Bootcamp",
    badge: "CMD-Certified Executive Training Programme",
    headline: "Transform Your SME into an Enduring Conglomerate",
    subtitle: "A practical, high-impact 6-week strategic immersion designed for Founders, Managing Directors, and Finance Leaders to master tax resilience, capital structuring, and operational scalability.",
    startDate: "November 2026",
    format: "Hybrid (In-Person Lagos HQ & Executive Virtual Masterclasses)",
    targetAudience: "SME Founders, Managing Directors, Chief Financial Officers, and Business Owners preparing for institutional scale or investment.",
    status: "Active",
    benefits: [
      "Master the 'Chessboard Turnaround' framework to outmaneuver industry competitors",
      "End-to-end tax shielding and audit-proofing techniques for FIRS & State IRS",
      "How to access bankable credit lines, private equity, and low-interest loans in Nigeria",
      "Hands-on deployment of cloud financial dashboards and AI workflow automation",
      "Official certificate accredited by the Centre for Management Development (CMD)",
      "Exclusive access to THEWHY's network of commercial bank credit executives and angel investors"
    ],
    curriculum: [
      { week: "Module 01", title: "Financial Diagnostics & Cloud Treasury Setup", desc: "Balance sheet stress testing, cash flow leak audit, and cloud software implementation." },
      { week: "Module 02", title: "Tax Optimization & Statutory Clearance (TCC/PENCOM)", desc: "Legal tax shelters, pioneer status, withholding tax reconciliation, and statutory certifications." },
      { week: "Module 03", title: "Corporate Finance & Capital Structuring", desc: "Preparing bankable project reports, equity fundraising, and structuring commercial credit lines." },
      { week: "Module 04", title: "AI-Powered Operational Efficiency", desc: "Harnessing practical AI tools for cost reduction, market intelligence, and automated client onboarding." },
      { week: "Module 05", title: "Corporate Governance & Board Architecture", desc: "Building independent advisory boards, statutory registers, and founder succession protocols." },
      { week: "Module 06", title: "Growth Acceleration & Institutional Scale", desc: "Mergers, joint ventures, new market expansion, and final executive capstone pitch." }
    ],
    faqs: [
      { q: "Who is this programme tailored for?", a: "Business owners, CEOs, Managing Directors, and Finance Controllers of established SMEs operating with annual turnover from ₦25M to ₦2B+ who want to scale into enduring institutions." },
      { q: "Is the training certified by statutory bodies?", a: "Yes. All training is fully certified by the Centre for Management Development (CMD), qualifying participants for mandatory professional development credits and procurement bids." },
      { q: "What is the format and duration?", a: "The programme runs for 6 weeks in a flexible hybrid format: weekend executive workshops at our Lagos training facility and weekly virtual interactive strategy masterclasses." },
      { q: "How do I register or sponsor team members?", a: "Submit the registration form on this page or contact our training desk directly at info@thewhy.ng or +234-8034-99-23-18. Group discounts are available for corporate teams." }
    ]
  },

  siteSettings: {
    announcement: "Now Enrolling: THEWHY SME Executive Strategic Bootcamp (CMD Certified) — Early Bird Intake Open.",
    heroHeadline: "We Help Small & Medium Businesses Evolve Into Resilient Conglomerates",
    heroSubtitle: "Boutique management consulting, accounting & tax advisory, corporate finance, and CMD-certified executive development in Lagos, Nigeria.",
    phone: "+234-8034-99-23-18",
    email: "info@thewhy.ng",
    addressYaba: "1a Hughes Avenue, Alagomeji, Yaba, Lagos, Nigeria",
    addressIkeja: "29, Isaac John Street, GRA Ikeja, Lagos, Nigeria",
    affiliate: "An affiliate of Wale Kehinde & Co. (Chartered Accountants)",
    adminPasscode: "whyng2026"
  }
};
