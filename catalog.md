You are a Principal Software Architect writing documentation for the "AI Initiatives Central Catalog" Confluence Wiki. 

I need you to generate a markdown document that describes my project so I can add it to the catalog. I will provide you with a core file from the project (such as a database schema, seed file, or core configuration). 

Based on the provided context, please extract and infer the business logic, entities, AI capabilities, and technology stack of the system.

Please generate the output strictly using the following two sections:

---

### 1. Featured AI Projects (Table Row)
Generate a single markdown table row matching this format:

| Project | Category | Key Features | Tech Stack | Status | Owner(s) |
|---|---|---|---|---|---|
| [Project Name] | [Productivity / Business Use Case / New Product] | • [Feature 1]<br>• [Feature 2]<br>• [Feature 3] | [Comma separated list of main tech] | [Prototype / Pilot / In Production / Private Beta] | [Owner Name or @mention] |

---

### 2. Project Deep Dives (Project Template)
Generate the detailed project section using this exact template. Replace bracketed content with your inferred details:

## [Project Name]
**Category**: [Productivity | Business Use Case | New Product]  
**Owners**: [Owner Name or @mention]  

**Overview**: [One-paragraph summary of the problem and solution].  

**Key Features**
* **[Feature 1 Name]**: [Short description and user value].  
* **[Feature 2 Name]**: [Short description and user value].  
* **[Feature 3 Name]**: [Short description and user value].  

**Architecture & Stack**
* **Models/Approach**: [LLM(s), fine-tuning, RAG, classifiers, anomaly detection, etc.].  
* **Runtime/Services**: [APIs, queues, schedulers, infra, security guardrails].  
* **Data**: [Sources, privacy controls, retention policy].  

**Adoption & Impact**
* **Status**: [Prototype | Pilot | In Production].  
* **KPIs**: [Cycle time, accuracy, hours saved, CSAT, cost savings].  
* **Stakeholders**: [Teams impacted and point contacts].  

**Links**
* **Design Doc**: [Add link to spec or RFC]  
* **Repo**: [Add code repository link]  

---
Please ensure the output is in clean Markdown format so I can directly copy and paste it into the Wiki.

---

### 3. Confluence Update Rules (Latest)
Use confluence MCP to update https://prioritycommerce.atlassian.net/wiki/spaces/OOC/pages/2546434049/AI+Initiatives+Central+Catalog page considering below mentioned poins strictly
When updating the Confluence page, do **not** replace the entire page content.

Follow this exact behavior:

1. Fetch the current page content first.
2. Locate the `Featured AI Projects` table and `Project Deep Dives` section.
3. In `Featured AI Projects`:
	- If a row for `[Project Name]` exists, update only that row.
	- If it does not exist, append exactly one new row.
4. In `Project Deep Dives`:
	- If a block for `## [Project Name]` exists, replace only that project block.
	- If it does not exist, append a new project block under the section.
5. Preserve all other sections, rows, links, mentions, and formatting as-is.
6. Never delete unrelated projects or rewrite unrelated sections.

Output requirement:
- Always produce the two markdown sections above for content generation.
- For Confluence publishing, apply content as a targeted merge/upsert in those two sections only.

---

### 4. MCP Execution Contract (Strict)
This task must be executed as a **live Confluence MCP update**, not as a local file/script generation task.

Mandatory behavior:
1. Use Confluence MCP tools directly to fetch and update the page.
2. Complete the update in the same run/session where content is generated.
3. Return confirmation with updated page version after MCP update succeeds.

Forbidden behavior:
1. Do **not** create any helper scripts (e.g., `.sh`, `.js`, `.ts`, `.py`) to update Confluence.
2. Do **not** create "update script" files, patch files, or offline migration files for this task.
3. Do **not** instruct manual copy/paste as the primary path when MCP is available.
4. Do **not** use curl/REST call templates as a substitute for MCP execution.

If MCP update fails:
1. Report the exact failure reason.
2. Retry once with corrected payload/format.
3. If still failing, provide a clearly marked fallback section titled `Manual Fallback (MCP Unavailable)`.
4. Even in fallback, still generate the two required markdown sections.
