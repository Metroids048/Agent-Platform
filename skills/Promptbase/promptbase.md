# PromptBase Commercialization & Upload Skill

## When to Use This Skill
Use this skill whenever the user wants to prepare, optimize, and package a prompt for sale on PromptBase. Triggers include: "help me sell this prompt", "upload to PromptBase", "format for PromptBase", "optimize my prompt", or when the user provides a raw/open-source prompt draft and wants it transformed into a high-value digital product.

---

## Background: The PromptBase Ecosystem

To successfully sell on PromptBase, formatting is not enough. The prompt must be **valuable, stable, and clearly formatted**. 

### 1. Commercial Viability (Value Addition)
Raw, open-source, or overly simple prompts (e.g., "write a blog post") DO NOT sell and result in high refund rates. A prompt must be transformed into a "Fine-Processed Product" via:
- **Workflow-oriented:** Combining multiple steps (e.g., SEO + Outline + Writing + Tags) into one automated flow.
- **Niche Targeting:** Adapting a general prompt into a highly specific industry tool (e.g., translating a "summary prompt" into a "Dental Patient Case File Generator").
- **Output Stability:** Incorporating strict rules to ensure the AI does not hallucinate and always outputs the exact desired format.

### 2. Strict Technical Rules (Zero Tolerance)
PromptBase identifies variables as **anything inside square brackets**. The platform enforces a **maximum of 5 total bracket occurrences** in the entire prompt template.
- Each variable name may appear **at most once** in the full prompt text.
- If `[TOPIC]` appears 3 times, it counts as 3 toward the limit of 5.
- After defining variables in the Input section, all later references MUST use plain English descriptions (no brackets).
- No curly braces `{}` allowed anywhere.

---

## Step-by-Step Process

### Step 1: Commercial Optimization & Refinement (The "Brain" Step)
Analyze the user's raw draft and immediately upgrade it:
- **Deepen the Persona:** Add expert-level context, constraints, and tone of voice.
- **Niche Down:** If the prompt is too broad, suggest/apply a more specific, high-paying niche.
- **Structure as a Workflow:** Turn simple commands into a multi-step logical process (e.g., Step 1: Analyze, Step 2: Draft, Step 3: Format).
- **Define Variables Strategically:** Identify 1-5 core inputs the buyer needs to change. Name them clearly in ALL_CAPS (e.g., `[TARGET_AUDIENCE]`).

### Step 2: Rewrite Template to Pass Technical Validation (The "Format" Step)
Rewrite the upgraded prompt applying ALL strict rules:
- **Rule A:** Define variables ONLY ONCE at the top in an Input block. Never use square brackets again.
- **Rule B:** Replace all curly braces `{}` or JSON schema code with plain English structural descriptions.
- **Rule C:** Replace any generic `[like this]` examples with plain text.
- **Rule D:** Count the total `[...]` occurrences. It MUST be exactly equal to the number of variables (max 5).

### Step 3: Generate Listing Metadata (The "Marketing" Step)
Create the assets needed for the PromptBase listing page:
- **Title:** Catchy, clear, highlighting the specific niche/value.
- **Description:** A compelling sales copy highlighting the pain point, the solution, and what makes this prompt premium.
- **Cover Image / Visual Ideas:** Suggestions for the screenshots or AI-generated cover image to attract clicks.

### Step 4: Write 4 Example Outputs (The "Proof" Step)
For each example:
- Use distinctly different, realistic variable values.
- Generate the full, rich AI output that the optimized prompt would produce.
- Format strictly as required.

---

## Deliverables to Produce

Always produce THREE separate markdown blocks (or documents) in your response:

### Document 1: 🛒 PromptBase Listing Info (`PromptBase_Listing.md`)
- **Optimized Title** (max 50 chars recommended)
- **Value Proposition / Niche Strategy:** Briefly explain *why* you optimized the prompt this way to make it sellable.
- **Sales Description:** Professional description for the platform (Features, Who is this for, Instructions).
- **Visual Asset Suggestions:** 3 ideas for the showcase images.

### Document 2: ⚙️ Prompt Template (`PromptBase_Template.md`)
- Contains the full optimized, rewritten prompt.
- Exactly 1–5 variables, each appearing exactly once in brackets `[]`.
- Must pass the bracket count check. (No JSON braces `{}`).

### Document 3: 📝 Example Outputs (`PromptBase_Examples.md`)
- 4 complete examples showcasing the prompt's power.
Format:
Variable Values:
VARIABLE_1: [value]
VARIABLE_2: [value]
Output:
[full realistic AI response here]
code
Code
---

## Self-Check Before Delivering

Run this checklist mentally:
1. **Commercial Check:** Is this prompt better than a free ChatGPT search? Does it feel like a premium tool/workflow?
2. **Variable Count:** Count all `[...]` in Document 2. Is the total ≤ 5? Does each variable appear only once?
3. **Syntax Check:** Are there any `{...}` anywhere in the template? (If yes, rewrite).
4. **Example Diversity:** Do the 4 examples prove the prompt works across different scenarios?

---

## Quick Template Skeleton (For Document 2)
Role & Context
You are a top-tier [describe expert role in plain text]. Your goal is to...
Input Variables
Field 1: [VARIABLE_ONE]
Field 2: [VARIABLE_TWO]
Workflow & Rules
Analyze the input provided for field one above.
Cross-reference it with the context of field two above.
[Continue with detailed rules, constraints, and steps. NO BRACKETS HERE.]
Output Format
[Describe the exact output structure in plain prose. NO BRACKETS OR BRACES.]
The final output must be formatted as follows:
First, a bolded title.
Second, a bulleted list of 3 key insights.
Third, a markdown table containing...