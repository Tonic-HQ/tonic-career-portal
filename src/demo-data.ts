export interface Job {
  id: number;
  title: string;
  publishedCategory: { id: number; name: string };
  address: { city: string; state: string; country: string; zip?: string };
  employmentType: string;
  salary: string;
  dateLastPublished: number;
  publicDescription: string;
  benefits: string;
  // Extended fields (REST API / Pro tier)
  salaryLow?: number; // Bullhorn: salary (label: "Salary Low")
  salaryHigh?: number; // Bullhorn: customFloat1 (label: "Salary High")
  payRate?: number; // Bullhorn: payRate (label: "Pay Rate Low")
  payRateMax?: number; // Bullhorn: customFloat2 (label: "Pay Rate Max")
  salaryUnit?: string; // Bullhorn: salaryUnit (label: "Pay Unit")
  yearsRequired?: number; // Bullhorn: yearsRequired (label: "Minimum Experience (Years)")
  onSite?: string; // Bullhorn: onSite (label: "Location Requirements") - "On-Site" | "Remote" | "Hybrid"
  jobType?: string; // Full Time, Part Time
  clientCorporation?: { id: number; name: string; companyDescription?: string };
}

const now = Date.now();
const daysAgo = (d: number) => now - d * 24 * 60 * 60 * 1000;

export const DEMO_JOBS: Job[] = [
  {
    id: 1001,
    title: 'Senior Software Engineer',
    publishedCategory: { id: 1, name: 'Technology' },
    address: { city: 'Austin', state: 'TX', country: 'US' },
    employmentType: 'Full-Time',
    salary: '$130,000 - $160,000',
    dateLastPublished: daysAgo(3),
    publicDescription: `<p>We are looking for a Senior Software Engineer to join our growing engineering team in Austin, TX. In this role, you will design, develop, and maintain scalable backend services and APIs that power our core platform. You will collaborate closely with product managers, designers, and fellow engineers to ship high-quality features that delight our users.</p>
<p>The ideal candidate has 5+ years of professional software development experience, strong proficiency in one or more of Python, Go, or Node.js, and a proven track record of building distributed systems at scale. Experience with cloud platforms (AWS, GCP, or Azure), containerization (Docker/Kubernetes), and CI/CD pipelines is essential. You should be comfortable leading technical discussions, conducting code reviews, and mentoring junior engineers.</p>
<p>We offer a collaborative, inclusive environment where great ideas are welcomed from all levels. You'll have the opportunity to shape our technical roadmap and work on challenging problems that impact thousands of users daily. Flexible work arrangements and a comprehensive benefits package are included.</p>`,
    benefits: 'Health, Dental, Vision, 401k, Remote Flexibility, Stock Options',
  },
  {
    id: 1002,
    title: 'Registered Nurse (ICU)',
    publishedCategory: { id: 2, name: 'Healthcare' },
    address: { city: 'Boston', state: 'MA', country: 'US' },
    employmentType: 'Full-Time',
    salary: '$80,000 - $95,000',
    dateLastPublished: daysAgo(5),
    publicDescription: `<p>Our client, a leading academic medical center in Boston, is seeking experienced Registered Nurses for their Intensive Care Unit (ICU). You will provide direct, high-acuity nursing care to critically ill patients, collaborate with multidisciplinary care teams, and serve as an advocate for patients and their families during some of the most challenging moments of their lives.</p>
<p>Qualified candidates must hold a current Massachusetts RN license (or compact license), possess at least 2 years of ICU experience, and hold or be willing to obtain CCRN certification within 12 months of hire. BLS and ACLS certifications are required. Experience with ventilator management, hemodynamic monitoring, and vasoactive medications is expected. ECMO experience is a plus.</p>
<p>Join a team recognized nationally for clinical excellence and nursing innovation. We provide robust orientation programs, ongoing continuing education support, and a shared governance model that empowers nurses to drive change. Sign-on bonuses are available for qualified candidates committing to a minimum two-year service agreement.</p>`,
    benefits: 'Health, Dental, Vision, 401k, Tuition Reimbursement, Sign-On Bonus',
  },
  {
    id: 1003,
    title: 'Financial Analyst',
    publishedCategory: { id: 3, name: 'Finance' },
    address: { city: 'New York', state: 'NY', country: 'US' },
    employmentType: 'Full-Time',
    salary: '$75,000 - $95,000',
    dateLastPublished: daysAgo(7),
    publicDescription: `<p>A top-tier financial services firm in Midtown Manhattan is seeking a Financial Analyst to join their Corporate Finance team. You will be responsible for financial modeling, variance analysis, budgeting and forecasting, and preparation of executive-level presentations. This is an excellent opportunity to gain exposure to complex financial structures and work alongside seasoned finance professionals.</p>
<p>The ideal candidate holds a Bachelor's degree in Finance, Accounting, or Economics and has 2-4 years of relevant experience in investment banking, corporate finance, or FP&A. Advanced proficiency in Excel (including financial modeling best practices) is required. Experience with financial systems such as Hyperion, Adaptive Insights, or Anaplan is a strong plus. CPA or CFA progress is valued.</p>
<p>This role offers a fast-paced, intellectually stimulating environment with significant opportunities for career growth. You will interact directly with senior leadership and gain broad exposure to the company's financial operations. A competitive compensation package includes base salary, annual bonus, and comprehensive benefits.</p>`,
    benefits: 'Health, Dental, Vision, 401k, Annual Bonus, Transit Benefits',
  },
  {
    id: 1004,
    title: 'Marketing Manager',
    publishedCategory: { id: 4, name: 'Marketing' },
    address: { city: 'Chicago', state: 'IL', country: 'US' },
    employmentType: 'Full-Time',
    salary: '$90,000 - $115,000',
    dateLastPublished: daysAgo(10),
    publicDescription: `<p>A fast-growing B2B SaaS company in Chicago's River North neighborhood is looking for a Marketing Manager to lead integrated marketing campaigns across digital and offline channels. You will develop and execute go-to-market strategies, manage the marketing calendar, oversee content production, and work closely with the sales team to drive qualified pipeline. This is a highly visible, strategic role with room to grow into a director-level position.</p>
<p>We're looking for someone with 5+ years of B2B marketing experience, preferably in a technology or professional services environment. You should have demonstrated expertise in content marketing, SEO/SEM, email marketing, and paid social advertising. Proficiency with HubSpot or similar marketing automation platforms and Salesforce CRM is strongly preferred. A data-driven mindset and strong analytical skills are essential.</p>
<p>You'll be joining a passionate, entrepreneurial team that values creativity and experimentation. We move fast, iterate quickly, and celebrate wins together. The role includes a flexible hybrid schedule (3 days in-office), professional development budget, and competitive compensation with performance bonuses.</p>`,
    benefits: 'Health, Dental, Vision, 401k, Performance Bonus, Professional Development Budget',
  },
  {
    id: 1005,
    title: 'DevOps Engineer',
    publishedCategory: { id: 1, name: 'Technology' },
    address: { city: 'Remote', state: 'Remote', country: 'US' },
    employmentType: 'Contract',
    salary: '$85 - $110/hr',
    dateLastPublished: daysAgo(2),
    publicDescription: `<p>We are looking for an experienced DevOps Engineer for a 6-month contract engagement (with potential for extension or conversion to full-time). This is a fully remote position supporting a high-growth e-commerce platform. You will be responsible for designing and maintaining CI/CD pipelines, infrastructure-as-code deployments, Kubernetes cluster management, and monitoring and observability tooling.</p>
<p>Required skills include 4+ years of DevOps/SRE experience, expert-level knowledge of AWS (EKS, RDS, S3, CloudFront, IAM), Terraform for infrastructure provisioning, and Kubernetes administration. Proficiency with GitHub Actions or GitLab CI, Helm charts, and observability stacks (Datadog, Prometheus/Grafana) is expected. Experience with security best practices and SOC 2 compliance is highly desirable.</p>
<p>This engagement offers competitive hourly rates, flexible scheduling within US business hours, and the opportunity to make a significant impact on a platform serving millions of customers. You will work closely with a talented engineering team and have the autonomy to drive architectural improvements. W2 or Corp-to-Corp arrangements are available.</p>`,
    benefits: 'Flexible Hours, Remote Work, Competitive Hourly Rate',
  },
  {
    id: 1006,
    title: 'Warehouse Supervisor',
    publishedCategory: { id: 5, name: 'Operations' },
    address: { city: 'Atlanta', state: 'GA', country: 'US' },
    employmentType: 'Full-Time',
    salary: '$55,000 - $70,000',
    dateLastPublished: daysAgo(14),
    publicDescription: `<p>A regional logistics company headquartered in Atlanta is seeking an experienced Warehouse Supervisor to oversee daily operations at their 200,000 sq ft distribution center. In this role, you will manage a team of 20-30 warehouse associates across receiving, picking, packing, and shipping operations. You will be responsible for maintaining productivity targets, ensuring safety compliance, and driving continuous improvement initiatives.</p>
<p>Qualified candidates must have 3+ years of supervisory experience in a warehouse or distribution environment. Knowledge of WMS (Warehouse Management Systems), forklift certification, and OSHA safety standards are required. Experience with KPI tracking, labor scheduling, and inventory control processes is essential. Familiarity with voice-directed picking or RF scanning technology is a plus.</p>
<p>We offer a stable, team-oriented work environment with opportunities for advancement into operations management. The position includes a comprehensive benefits package, annual merit increases, and a safety bonus program. Hours are Monday through Friday with occasional weekend coverage during peak seasons.</p>`,
    benefits: 'Health, Dental, Vision, 401k, Safety Bonus, Annual Merit Increase',
  },
  {
    id: 1007,
    title: 'Account Executive',
    publishedCategory: { id: 6, name: 'Sales' },
    address: { city: 'Seattle', state: 'WA', country: 'US' },
    employmentType: 'Full-Time',
    salary: '$70,000 + Commission',
    dateLastPublished: daysAgo(6),
    publicDescription: `<p>A growing SaaS company in Seattle's South Lake Union neighborhood is looking for a driven Account Executive to join their mid-market sales team. You will be responsible for managing the full sales cycle from prospecting to close, building relationships with decision-makers at companies with 100-1,000 employees, and consistently exceeding quarterly revenue targets. This is a quota-carrying role with strong commission upside for top performers.</p>
<p>The ideal candidate has 3-5 years of B2B software sales experience with a demonstrable track record of meeting or exceeding quota. You should be proficient with Salesforce, adept at multi-threading complex deals, and comfortable with both self-sourced outbound prospecting and working inbound leads. Experience selling into HR, Operations, or Finance personas is a significant plus.</p>
<p>We have a winning culture that invests heavily in our sales team's success — expect excellent sales training, strong SDR support, proven sales methodology, and a leadership team that sells alongside you. On-target earnings range from $130,000 to $180,000 for first-year representatives hitting 100% of quota, with uncapped commission potential beyond that.</p>`,
    benefits: 'Health, Dental, Vision, 401k, Uncapped Commission, Sales Training',
  },
  {
    id: 1008,
    title: 'UX Designer',
    publishedCategory: { id: 1, name: 'Technology' },
    address: { city: 'Denver', state: 'CO', country: 'US' },
    employmentType: 'Full-Time',
    salary: '$95,000 - $120,000',
    dateLastPublished: daysAgo(8),
    publicDescription: `<p>A product-led fintech startup in Denver is searching for a talented UX Designer to shape the experience of their consumer-facing mobile and web applications. You will lead end-to-end design work including user research, journey mapping, wireframing, prototyping, and high-fidelity UI design. You'll collaborate daily with product managers and engineers in a tight-knit, agile team where design has a prominent seat at the table.</p>
<p>We're looking for a designer with 4+ years of product design experience, a strong portfolio demonstrating user-centered design thinking, and expert proficiency with Figma. Experience conducting usability studies, synthesizing research insights into actionable design decisions, and working within a design system is required. Knowledge of accessibility standards (WCAG 2.1) and basic understanding of frontend implementation constraints is highly valued.</p>
<p>At our company, designers are deeply embedded in product discovery, not just delivery. You will have genuine influence over product direction and the opportunity to grow into a lead design role. We offer a beautiful downtown Denver office with a hybrid schedule (2 days in-office), generous equity, and a culture that prioritizes craft, curiosity, and kindness.</p>`,
    benefits: 'Health, Dental, Vision, 401k, Equity, Hybrid Schedule, Equipment Budget',
  },
  {
    id: 1009,
    title: 'Licensed Practical Nurse',
    publishedCategory: { id: 2, name: 'Healthcare' },
    address: { city: 'Boston', state: 'MA', country: 'US' },
    employmentType: 'Part-Time',
    salary: '$45,000 - $55,000',
    dateLastPublished: daysAgo(20),
    publicDescription: `<p>A busy primary care practice in the Boston metro area is looking for a Licensed Practical Nurse (LPN) to join their team on a part-time basis (24-28 hours per week). You will assist physicians and nurse practitioners with patient care, perform clinical procedures such as vital signs, phlebotomy, and wound care, administer medications, and maintain accurate electronic health records.</p>
<p>Candidates must hold an active Massachusetts LPN license in good standing, have at least 1 year of clinical experience in a outpatient or ambulatory care setting, and be proficient with electronic health record systems (experience with Epic or Athenahealth preferred). Strong patient communication skills, attention to detail, and the ability to work efficiently in a fast-paced environment are essential.</p>
<p>This is an excellent opportunity for an LPN seeking work-life balance while still contributing to meaningful patient care. The practice offers flexible scheduling with consistent shift times, a supportive clinical team, and a pathway to increased hours or full-time status. Pro-rated benefits including paid time off are available for part-time employees working 20+ hours per week.</p>`,
    benefits: 'Pro-Rated PTO, Flexible Scheduling, Supportive Team Environment',
  },
  {
    id: 1010,
    title: 'Data Analyst',
    publishedCategory: { id: 1, name: 'Technology' },
    address: { city: 'New York', state: 'NY', country: 'US' },
    employmentType: 'Full-Time',
    salary: '$85,000 - $100,000',
    dateLastPublished: daysAgo(12),
    publicDescription: `<p>A leading media and entertainment company in New York City is seeking a Data Analyst to support their digital strategy and audience insights team. In this role, you will transform raw data into actionable insights that drive programming decisions, advertising strategy, and product development. You will build dashboards, conduct ad hoc analyses, and present findings to non-technical stakeholders across the organization.</p>
<p>The ideal candidate has 2-4 years of data analysis experience, strong proficiency in SQL, and working knowledge of Python or R for data manipulation and analysis. Experience with BI tools (Tableau, Looker, or Power BI) is required. Familiarity with web analytics platforms (Google Analytics, Adobe Analytics) and digital advertising measurement concepts is a strong advantage. Outstanding communication skills and the ability to translate complex data into clear narratives are essential.</p>
<p>You will join a collaborative analytics team with access to rich, diverse datasets and the opportunity to influence strategy at a storied media brand. We offer a hybrid work model with offices in Midtown Manhattan, a generous benefits package, and a culture that values intellectual curiosity and continuous learning.</p>`,
    benefits: 'Health, Dental, Vision, 401k, Hybrid Work, Learning & Development Stipend',
  },
  {
    id: 1011,
    title: 'HR Generalist',
    publishedCategory: { id: 5, name: 'Operations' },
    address: { city: 'Chicago', state: 'IL', country: 'US' },
    employmentType: 'Full-Time',
    salary: '$60,000 - $75,000',
    dateLastPublished: daysAgo(18),
    publicDescription: `<p>A professional services firm in Chicago's Loop is looking for an HR Generalist to support their growing team of 200+ employees. This is a broad generalist role covering employee relations, benefits administration, onboarding, performance management support, HR compliance, and HRIS management. You will be a trusted partner to both employees and managers, helping to build a high-performing, inclusive workplace culture.</p>
<p>We are looking for someone with 3-5 years of HR generalist experience and a solid understanding of Illinois and federal employment law. SHRM-CP or PHR certification is preferred. Proficiency with HRIS platforms (ADP Workforce Now, Workday, or similar) is required. Strong interpersonal skills, discretion in handling confidential matters, and the ability to manage multiple priorities simultaneously are critical success factors.</p>
<p>This role reports directly to the Director of Human Resources and offers significant visibility and growth potential. You will be part of a small but mighty HR team that punches above its weight. We offer a competitive compensation package, excellent benefits, a convenient downtown Chicago location steps from public transit, and a hybrid work schedule.</p>`,
    benefits: 'Health, Dental, Vision, 401k, Hybrid Schedule, SHRM Membership Support',
  },
  {
    id: 1012,
    title: 'React Frontend Developer',
    publishedCategory: { id: 1, name: 'Technology' },
    address: { city: 'Austin', state: 'TX', country: 'US' },
    employmentType: 'Contract',
    salary: '$90 - $120/hr',
    dateLastPublished: daysAgo(1),
    publicDescription: `<p>We are seeking an experienced React Frontend Developer for a 3-month contract engagement with a high likelihood of extension. You will work on a greenfield product rebuild, translating detailed Figma designs into pixel-perfect, performant React components. Working within a modern stack (React 18, TypeScript, Vite, Tailwind CSS, React Query), you'll deliver features that delight users and meet rigorous quality standards.</p>
<p>Required skills include 4+ years of professional React development, strong TypeScript proficiency, and deep familiarity with modern React patterns (hooks, context, Suspense). Experience with component testing using Jest and React Testing Library is required. Familiarity with Storybook for component documentation, state management libraries (Zustand or Redux Toolkit), and web performance optimization techniques is strongly preferred.</p>
<p>This is a collaborative, async-friendly engagement with a startup team distributed across US time zones. The codebase is modern and well-maintained, and the team is passionate about code quality and developer experience. Flexible weekly hour commitments (32-40 hrs/week) are available. Both Corp-to-Corp and W2 arrangements are welcome.</p>`,
    benefits: 'Flexible Hours, Remote-Friendly, Modern Tech Stack',
  },
  {
    id: 1013,
    title: 'Physical Therapist',
    publishedCategory: { id: 2, name: 'Healthcare' },
    address: { city: 'Seattle', state: 'WA', country: 'US' },
    employmentType: 'Full-Time',
    salary: '$80,000 - $100,000',
    dateLastPublished: daysAgo(25),
    publicDescription: `<p>A well-established outpatient orthopedic physical therapy clinic in Seattle is looking for a passionate Physical Therapist to join their team. You will evaluate and treat patients with musculoskeletal injuries and post-surgical conditions, develop individualized treatment plans, and deliver evidence-based interventions including manual therapy, therapeutic exercise, and patient education. Our clinic serves a diverse patient population with a strong emphasis on sports medicine and post-operative rehabilitation.</p>
<p>Applicants must hold a Doctor of Physical Therapy (DPT) degree, current Washington State PT license, and current CPR/BLS certification. New graduates are welcome to apply. Completed orthopedic residency or fellowship training, manual therapy certifications (COMT, FAAOMPT), or experience in sports rehabilitation are highly valued. Strong communication skills, clinical reasoning, and a patient-centered approach are essential.</p>
<p>We are a therapist-owned practice that prioritizes clinical excellence and work-life balance. You will carry a reasonable caseload (no double-booking), have access to excellent continuing education support, and work alongside a collaborative, experienced team. We offer competitive compensation, full benefits, a student loan repayment assistance program, and a clear path toward mentored clinical specialty certification.</p>`,
    benefits: 'Health, Dental, Vision, 401k, Student Loan Assistance, CE Reimbursement',
  },
  {
    id: 1014,
    title: 'Content Marketing Specialist',
    publishedCategory: { id: 4, name: 'Marketing' },
    address: { city: 'Remote', state: 'Remote', country: 'US' },
    employmentType: 'Full-Time',
    salary: '$65,000 - $80,000',
    dateLastPublished: daysAgo(9),
    publicDescription: `<p>A B2B technology company is hiring a Content Marketing Specialist to join their fully-remote marketing team. In this role, you will create compelling, SEO-optimized content across multiple formats — including blog posts, white papers, case studies, email campaigns, and social media — that supports brand awareness and demand generation goals. You will collaborate with subject matter experts to distill complex technical topics into accessible, engaging content for a business audience.</p>
<p>We are looking for someone with 3+ years of B2B content marketing experience, exceptional writing and editing skills, and a strong understanding of content SEO principles (keyword research, on-page optimization, internal linking strategy). Experience with marketing automation platforms (HubSpot, Marketo) and content management systems (WordPress, Contentful) is required. Familiarity with analytics tools to measure content performance is expected. A portfolio of published B2B content is required with your application.</p>
<p>This is a remote-first role open to candidates anywhere in the continental US. You will have a high degree of autonomy over your work and the opportunity to build out our content program from a strong foundation. We offer a competitive salary, unlimited PTO, a home office stipend, and a culture that values clear writing, intellectual honesty, and creative experimentation.</p>`,
    benefits: 'Health, Dental, Vision, 401k, Unlimited PTO, Home Office Stipend',
  },
  {
    id: 1015,
    title: 'Supply Chain Analyst',
    publishedCategory: { id: 5, name: 'Operations' },
    address: { city: 'Atlanta', state: 'GA', country: 'US' },
    employmentType: 'Full-Time',
    salary: '$65,000 - $80,000',
    dateLastPublished: daysAgo(16),
    publicDescription: `<p>A Fortune 500 consumer goods company with North American headquarters in Atlanta is seeking a Supply Chain Analyst to join their planning and logistics team. In this role, you will analyze supply chain data to identify inefficiencies, support inventory optimization initiatives, coordinate with suppliers and third-party logistics providers, and contribute to the development of supply chain strategy. You will play a key role in ensuring product availability while minimizing total supply chain costs.</p>
<p>The ideal candidate holds a Bachelor's degree in Supply Chain Management, Industrial Engineering, Business Analytics, or a related field. 2-3 years of experience in supply chain, logistics, or operations analysis is preferred; recent graduates with relevant internship experience will be considered. Proficiency in Microsoft Excel (advanced), experience with ERP systems (SAP, Oracle), and the ability to work with large datasets are required. APICS CSCP or CPIM certification is a plus.</p>
<p>This position offers exceptional exposure to end-to-end supply chain operations at scale, with rotational project assignments that broaden your functional expertise. We offer formal mentorship, tuition assistance, and a clearly defined career path into supply chain management. The role is based at our modern Atlanta campus and follows a hybrid work schedule with three days on-site per week.</p>`,
    benefits: 'Health, Dental, Vision, 401k, Tuition Assistance, Hybrid Schedule, Mentorship Program',
  },
];
