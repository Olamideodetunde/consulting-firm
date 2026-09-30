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
      image: null, // TODO(client-assets): add headshot
      bio: "A distinguished Fellow of the Institute of Chartered Accountants of Nigeria (FCA), Associate of the Chartered Institute of Taxation of Nigeria (ACIT), and Associate of the Chartered Institute of Stockbrokers (ACS). With over two decades of cutting-edge practice spanning corporate finance, forensic tax advisory, and strategic turnaround management, Mr. Adewale leads THEWHY Consulting with an unwavering commitment to enterprise resilience and wealth preservation.",
      specialties: ["Forensic Tax Advisory", "Excess Bank Charges Recovery", "Corporate Finance & M&A", "Capital Restructuring"]
    },
    {
      id: "dolapo-wale-kehinde",
      name: "Mrs. Dolapo Wale-Kehinde",
      credentials: "B.Tech, MBA (Finance), PHRi",
      role: "Head, Training and HR Consulting",
      image: null, // TODO(client-assets): add headshot
      bio: "A certified Professional in Human Resources - International (PHRi) with an MBA in Finance. She directs THEWHY Consulting's human capital advisory, organizational design, executive capacity building, and CMD-accredited corporate training programs. She brings deep competence in competency framework design, executive headhunting, and statutory human resource compliance across diverse industrial sectors.",
      specialties: ["CMD-Certified Training", "Executive Talent Acquisition", "Compensation & Grading", "Statutory Certifications (PENCOM/ITF)"]
    },
    {
      id: "seun-olaniyi",
      name: "Mr. Seun Olaniyi",
      credentials: "BSc Accounting, ACA",
      role: "Accounting Operations",
      image: null, // TODO(client-assets): add headshot
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
    affiliate: "An affiliate of Wale Kehinde & Co. (Chartered Accountants)"
  },

  caseStudies: [
    {
      "id": "cs-1",
      "title": "₦82.4M Recovered in Excess Bank Charges for National Logistics Group",
      "sector": "Logistics & Supply Chain",
      "category": "Accounting & Tax",
      "summary": "A 10-year forensic review of multi-bank loan accounts and trade transactions revealed systemic unapproved excess interest and debit fees.",
      "metrics": [
        {
          "label": "Amount Recovered",
          "value": "₦82.4M"
        },
        {
          "label": "Turnaround Time",
          "value": "4 Months"
        },
        {
          "label": "Annual Savings",
          "value": "₦19.5M"
        }
      ],
      "challenge": "The client was servicing multiple facilities across three commercial banks in Nigeria, experiencing continuous cash flow squeeze despite healthy operational turnover.",
      "strategy": "Our audit team conducted algorithmic transaction verification across 7 years of bank statements, calculating actual vs. contracted tariff rates and representing the company at direct mediation sessions.",
      "result": "All 3 banks issued formal credit reconciliations totaling ₦82.4 million directly back into the client's working capital account with zero litigation friction."
    },
    {
      "id": "cs-2",
      "title": "Series A Restructuring & ₦450M Corporate Finance for Lagos Fintech",
      "sector": "Fintech & Software",
      "category": "Corporate Finance",
      "summary": "Restructured financial model and balance sheet architecture to prepare a fast-scaling payments startup for institutional investment.",
      "metrics": [
        {
          "label": "Capital Raised",
          "value": "₦450M"
        },
        {
          "label": "Valuation Increase",
          "value": "+140%"
        },
        {
          "label": "Due Diligence Time",
          "value": "3 Weeks"
        }
      ],
      "challenge": "The startup had rapid top-line traction but disorganized historical book records, unfiled CAC post-incorporation returns, and no formal unit economic forecasting.",
      "strategy": "THEWHY deployed cloud accounting systems, restructured founder shareholding, cleared statutory filings, and built a dynamic 5-year investment projection model.",
      "result": "The firm passed institutional investor due diligence with zero audit qualifications and closed ₦450M in blended equity and debt growth financing."
    },
    {
      "id": "cs-3",
      "title": "Debt Turnaround & Asset Verification (₦3.2B Assets) for Manufacturing Firm",
      "sector": "Manufacturing",
      "category": "Strategy & Solutions",
      "summary": "Comprehensive fixed asset verification and debt turnaround strategy preventing hostile creditor liquidation during economic volatility.",
      "metrics": [
        {
          "label": "Assets Verified",
          "value": "₦3.2B"
        },
        {
          "label": "Debt Discount Won",
          "value": "35%"
        },
        {
          "label": "Jobs Preserved",
          "value": "120+"
        }
      ],
      "challenge": "Facing currency devaluation and soaring raw material costs, the enterprise defaulted on commercial paper and faced imminent receivership.",
      "strategy": "Using our Chessboard Turnaround framework, we executed an independent business review, tagged and valued physical assets across 3 plants, and negotiated a structured debt-equity swap.",
      "result": "Creditors agreed to a 3-year repayment moratorium and 35% interest haircut, returning the manufacturer to EBITDA positive within 9 months."
    },
    {
      "id": "cs-4",
      "title": "CMD-Certified Workforce Upskilling & Compensation Overhaul",
      "sector": "Healthcare & Pharmaceuticals",
      "category": "HR Services",
      "summary": "Re-engineered organizational design and trained 85 executives and clinical administrators under Centre for Management Development standards.",
      "metrics": [
        {
          "label": "Staff Upskilled",
          "value": "85 Leaders"
        },
        {
          "label": "Retention Rate",
          "value": "96%"
        },
        {
          "label": "Statutory Badges",
          "value": "PENCOM, ITF, NSITF"
        }
      ],
      "challenge": "High attrition of skilled managers, lack of statutory PENCOM/ITF certifications impeding public hospital contract biddings.",
      "strategy": "Conducted total compensation benchmarking, instituted performance-based appraisal metrics, delivered CMD accredited training, and secured all statutory procurement certificates.",
      "result": "Employee retention surged to 96%, and the company qualified for and won 2 landmark federal healthcare supply tenders."
    }
  ],

  faqs: [
    {
      "id": "faq-1",
      "question": "What makes THEWHY Consulting different from traditional consulting firms?",
      "answer": "Unlike typical consulting firms that apply generic cookie-cutter templates, our philosophy is rooted in versatility, practical execution, and our strategic Chessboard Approach. An affiliate of Wale Kehinde & Co. (Chartered Accountants), we don't just advise — we actively move the heavy pieces in your business, from negotiating with commercial banks and tax authorities to setting up cloud accounting and restructuring corporate debts."
    },
    {
      "id": "faq-2",
      "question": "What is your Tailored-For-You (TFY) service offering?",
      "answer": "TFY Services are bespoke, nimble advisory packages designed specifically for Nigerian SMEs and high-growth startups that cannot afford rigid, overpriced corporate bureaucracy. TFY provides flexible retainers, hands-on turnaround guidance, and unconventional tactics to maximize ROI on every Naira deployed."
    },
    {
      "id": "faq-3",
      "question": "Can you assist with statutory compliance certificates like PENCOM, NSITF, and ITF?",
      "answer": "Yes, absolutely. We regularly assist clients in procuring PENCOM Compliance Certificates, NSITF Clearance, Industrial Training Fund (ITF) Compliance, Bureau of Public Procurement (BPP) National Database Registration, and Federal/State Tax Clearance Certificates (TCC) required for corporate tenders and operations."
    },
    {
      "id": "faq-4",
      "question": "How does the initial consultation process work?",
      "answer": "You can book a 45-minute strategic advisory session directly on our website. You can choose whether to meet virtually via Google Meet, over a direct phone call, or in-person at our Lagos Headquarters in Yaba. Once booked, our senior partners review your business profile and come prepared with actionable diagnostics."
    },
    {
      "id": "faq-5",
      "question": "How do you handle excess bank charges recovery?",
      "answer": "Commercial banks in Nigeria frequently apply unapproved tariffs, excessive interest rate spikes, and duplicate ledger maintenance fees. We run algorithmic forensic audits on your multi-year bank statements, establish discrepancies against CBN monetary policy circulars, and negotiate direct refunds credited back to your account."
    },
    {
      "id": "faq-6",
      "question": "Are your management and HR training courses accredited?",
      "answer": "Yes. All our leadership, management, and workforce development training programs are officially certified by the Centre for Management Development (CMD) in Nigeria, ensuring institutional credibility and compliance."
    }
  ],

  // Default Insights articles (seeded into MySQL or the JSON store on first run)
  insights: [
  {
    slug: 'cac-annual-returns-guide-2026',
    title: 'Filing Annual Returns with the CAC: A Practical 2026 Guide',
    excerpt: 'Every business registered in Nigeria under the CAC has a statutory obligation to file annual returns to prevent inactive status and striking off.',
    category: 'Corporate Compliance',
    cover_image: 'assets/img/blog/1.jpg',
    author: 'THEWHY Practice Team',
    content: `Every business registered in Nigeria under the Corporate Affairs Commission (CAC) has a mandatory statutory obligation to file annual returns. Failure to do so can result in serious penalties, classified inactive status on the CAC portal, and potential delisting from the register of companies.

### Why Filing Annual Returns is Critical
Annual returns are not tax filings or company financial statements; rather, they serve as official notification to the CAC that your registered enterprise or limited liability company remains solvent, active, and operationally viable. 

### Key Timelines & Deadlines
- **Business Names (Sole Proprietorships/Enterprises):** Must file not later than 30th June each calendar year.
- **Limited Liability Companies (LTD):** Must file within 42 days following the conclusion of the Annual General Meeting (AGM).
- **Incorporated Trustees (NGOs/Foundations):** Must file between 30th June and 31st December annually.

At THEWHY Consulting, in affiliation with Wale Kehinde & Co. (Chartered Accountants), we oversee the end-to-end statutory compliance calendar for growing SMEs and corporate conglomerates across Nigeria.`
  },
  {
    slug: 'excess-bank-charges-how-to-recover',
    title: 'Excess Bank Charges in Nigeria: How to Identify and Forensically Recover Them',
    excerpt: 'Nigerian commercial businesses routinely lose millions annually to compounding unapproved bank debits, COT excess, and miscalculated interest.',
    category: 'Banking & Finance',
    cover_image: 'assets/img/blog/2.jpg',
    author: 'Kehinde Adewale, FCA',
    content: `Systemic unapproved bank charges represent one of the quietest drains on corporate liquidity in Nigeria. From compounding interest rate miscalculations to unauthorized facility review fees and foreign exchange transaction markups, Nigerian businesses frequently surrender substantial reserves unknowingly.

### The Forensic Recovery Process
1. **Multi-Year Statement Acquisition:** Gathering complete transaction ledgers across all corporate borrowing, overdraft, and operating accounts.
2. **Re-computation According to CBN Guide to Bank Charges:** Running rigorous algorithmic reconciliation against Central Bank of Nigeria statutory caps.
3. **Formal Demand & Institutional Reconciliation:** Presenting substantiated audit findings directly to bank management and credit committees.

THEWHY Consulting has successfully recovered over ₦82.4 Million in unapproved bank charges for logistics, manufacturing, and trading enterprises.`
  },
  {
    slug: 'pencom-clearance-statutory-guide',
    title: 'PENCOM Clearance Certificates: Essential Requirements for Nigerian Contracts',
    excerpt: 'Understanding the compliance steps to obtain a National Pension Commission (PENCOM) clearance certificate for government tenders and regulatory permits.',
    category: 'HR & Compliance',
    cover_image: 'assets/img/blog/3.jpg',
    author: 'Dolapo Wale-Kehinde, PHRi',
    content: `Under the Pension Reform Act 2014, any enterprise employing 15 or more staff (or bidding for federal, state, and parastatal procurement contracts) must hold a current-year PENCOM Compliance Certificate.

### Mandatory Pre-requisites
- Valid Group Life Insurance policy for all employees (minimum 3x annual gross remuneration).
- Up-to-date monthly pension remittances with registered Pension Fund Administrators (PFAs).
- Certified evidence of employee enrollment and contribution schedules.

Our HR Advisory practice facilitates expedited compliance documentation, payroll alignment, and liaison with certified PFAs.`
  },
  {
    slug: 'turnaround-strategy-debt-management',
    title: 'Business Turnaround Strategy: Managing Hostile Debt and Restoring Cashflow',
    excerpt: 'A blueprint for Nigerian managing directors facing aggressive creditor action, receivership threats, and negative working capital.',
    category: 'Turnaround Strategy',
    cover_image: 'assets/img/blog/1.jpg',
    author: 'Kehinde Adewale, FCA',
    content: `When macroeconomic volatility strikes, even profitable enterprises can find their working capital suffocated by bank debt service and interest rate hikes.

### The Turnaround Checklist
- Immediate Cashflow Ringfencing: Identifying non-core assets and renegotiating unsecured vendor balances.
- Independent Fixed Asset Valuation: Establishing true current replacement valuation to counter liquidation fire-sale tactics.
- Moratorium Negotiation: Structuring sustainable 2 to 3-year grace periods with commercial banks based on verifiable projections.

Through aggressive financial engineering, THEWHY Consulting has defended over ₦3.2 Billion in operational machinery and preserved hundreds of jobs.`
  }
  ]
};
