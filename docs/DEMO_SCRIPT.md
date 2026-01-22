# CSR Training Simulator - Demo Script

## Pre-Demo Setup

1. Start the application: `npm run dev`
2. Clear browser cache and cookies
3. Ensure microphone is working
4. Have the Admin panel open to show personalization

---

## Demo Flow

### Introduction (2 min)

"This is an AI-powered training simulator for customer service representatives. It allows CSRs to practice handling real customer scenarios with voice-based AI customers, then receive instant coaching feedback."

**Key Features:**
- Real-time voice conversations with AI customers
- 8 pre-built scenarios covering common situations
- Company-personalized training content
- AI-powered coaching and scoring
- Custom scenario builder

---

### Part 1: Company Personalization (3 min)

**Navigate to: Setup > Website Scraper**

"Before we start training, let me show you how we personalize this for any company..."

1. Enter company website URL (e.g., https://www.accelpest.com)
2. Click "Scrape Website"
3. Show extracted data:
   - Logo
   - Brand colors
   - Services offered
   - Pricing information
4. Click "Apply Configuration"

"Now all scenarios will reference this company's specific services, pricing, and guarantees."

---

### Part 2: Scenario Selection (2 min)

**Navigate to: Home**

"Here are our pre-built training scenarios, ranging from Easy to Hard..."

**Walk through scenario categories:**
- Sales: Price Shopper, New Customer Inquiry, Upsell Opportunity
- Retention: Cancellation Save
- Complaint Resolution: Furious Callback, Warranty Dispute
- Service Recovery: Missed Appointment
- Emergency: Wildlife Emergency

**Highlight difficulty badges and estimated durations.**

---

### Part 3: Scenario Briefing (2 min)

**Click on "The Cancellation Save" (Hard)**

"Before the call, the CSR gets a full briefing..."

**Walk through sections:**
- Customer Profile: Margaret, retired teacher, 3-year customer
- The Situation: Wants to cancel due to competitor pricing
- Key Points: What the customer will mention
- CSR Objective: Retain the customer
- Success Criteria: What works vs. what doesn't

"The CSR knows exactly what they're walking into and what success looks like."

---

### Part 4: Live Training Call (3-5 min)

**Click "Start Training Call"**

"Now we'll have a real voice conversation with the AI customer..."

**During the call, demonstrate:**
- Natural conversation flow
- AI responding to tone and approach
- Live transcript appearing
- Call timer

**Suggested approach:**
1. Acknowledge the cancellation request
2. Ask why (competitor pricing)
3. Thank for loyalty
4. Explain value differences
5. Offer price match or loyalty discount

**End the call after 2-3 minutes.**

---

### Part 5: Coaching Scorecard (3 min)

**Results page loads automatically**

"Now our AI coach analyzes the conversation..."

**Walk through:**
1. **Overall Score**: Ring visualization
2. **Category Breakdown**:
   - Empathy & Rapport
   - Problem Resolution
   - Product Knowledge
   - Professionalism
   - Scenario-Specific
3. **What You Did Well**: Specific quotes highlighted
4. **Areas to Improve**: With alternative responses
5. **Key Moment**: The pivotal point in the call
6. **Next Steps**: Actionable recommendations

"Notice the feedback references the company specifically - 'mention the 100% satisfaction guarantee' not generic advice."

---

### Part 6: Custom Scenario Builder (2 min)

**Navigate to: Create**

"Teams can also build custom scenarios from their own experiences..."

**Show the form sections:**
- Basic info (name, difficulty, category)
- Customer profile (name, personality, emotional state)
- Situation and key points
- CSR objective and scoring focus
- Behavior triggers

"They can even paste a real conversation transcript and we'll extract intelligence to create scenarios from it."

---

### Part 7: Transcript Intelligence (Optional, 2 min)

**Navigate to: Setup > Transcript Loader**

"If a team has call recordings or transcripts, we can analyze them..."

**Paste a sample transcript and show:**
- Identified pain points
- Suggested training scenarios
- Coaching insights

---

## Key Talking Points

- **Realistic Practice**: AI customers respond naturally to tone, empathy, and approach
- **Company-Specific**: All feedback references actual products, services, and policies
- **Immediate Feedback**: No waiting for manager review - instant coaching
- **Scalable Training**: Train hundreds of CSRs simultaneously
- **Data-Driven**: Track improvement over time with scoring

---

## Handling Questions

**Q: How accurate is the voice recognition?**
A: We use Retell AI's enterprise-grade voice technology, which handles accents, background noise, and natural speech patterns.

**Q: Can we add our own scenarios?**
A: Yes! The scenario builder lets you create custom scenarios, or paste real transcripts to generate them automatically.

**Q: How does it know our company info?**
A: Our scraper extracts information from your website, or you can manually configure services, pricing, and policies.

**Q: Does it work with call recordings?**
A: The transcript loader can analyze text transcripts to extract training insights and generate scenarios.

**Q: What's the scoring based on?**
A: Claude AI analyzes the conversation for empathy, problem resolution, product knowledge, professionalism, and scenario-specific criteria.

---

## Wrap Up

"This platform allows pest control companies to train their CSRs on realistic scenarios, get instant AI coaching, and track improvement - all personalized to their specific business."

"Would you like to try a call yourself?"
