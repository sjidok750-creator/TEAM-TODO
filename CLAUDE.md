# CLAUDE.md — AI Assistant Guide for MY-OFFICE-

This file provides guidance for AI assistants (Claude, Copilot, etc.) working in this repository.
Keep it up to date as the project evolves.

---

## Project Overview

**Repository:** `MY-OFFICE-`
**Owner:** sjidok750-creator
**Status:** New / In development

This project is an office management application. Update this section with a proper description
once the project scope is defined.

---

## Repository Structure

> Update this section as directories are created.

```
MY-OFFICE-/
├── CLAUDE.md          # This file — AI assistant guidance
├── README.md          # Project overview for humans (create when ready)
├── .gitignore         # Ignored files
├── src/               # Application source code
├── tests/             # Test files
├── docs/              # Documentation
└── scripts/           # Utility/automation scripts
```

---

## Technology Stack

> Fill in once the stack is chosen. Examples below:

- **Language:** (e.g., TypeScript / Python / Go)
- **Runtime:** (e.g., Node.js 20 / Python 3.12)
- **Framework:** (e.g., Next.js / FastAPI / Django)
- **Database:** (e.g., PostgreSQL / MongoDB / SQLite)
- **Testing:** (e.g., Jest / Pytest / Vitest)
- **CI/CD:** (e.g., GitHub Actions)
- **Package manager:** (e.g., npm / pnpm / pip / uv)

---

## Development Setup

> Update these steps once the project has a setup process.

```bash
# 1. Clone the repository
git clone <repo-url>
cd MY-OFFICE-

# 2. Install dependencies
npm install          # Node.js
# or
pip install -r requirements.txt   # Python

# 3. Configure environment
cp .env.example .env
# Edit .env with your local values

# 4. Start the development server
npm run dev
# or
python manage.py runserver
```

---

## Git Workflow

### Branch Naming

Always work on feature branches. Branch names must follow this pattern:

```
claude/<description>-<session-id>    # AI-assisted branches
feature/<short-description>          # New features
fix/<short-description>              # Bug fixes
chore/<short-description>            # Maintenance / tooling
docs/<short-description>             # Documentation changes
```

### Commit Messages

Use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`

**Examples:**
```
feat(auth): add JWT login endpoint
fix(api): correct pagination offset calculation
docs(readme): add setup instructions
chore(deps): upgrade dependencies to latest
```

### Push Rules

- **Never push directly to `main` or `master`.**
- Always open a Pull Request for review.
- AI-generated branches must follow the `claude/` prefix convention.
- Use `git push -u origin <branch-name>` when pushing a new branch.

---

## Code Conventions

### General

- Prefer clarity over cleverness.
- Keep functions small and single-purpose.
- Avoid deeply nested logic — extract to helper functions.
- Delete dead code rather than commenting it out.
- Never commit secrets, API keys, or credentials.

### Naming

| Construct        | Convention          | Example                    |
|-----------------|---------------------|----------------------------|
| Files (JS/TS)   | `kebab-case`        | `user-profile.ts`          |
| Files (Python)  | `snake_case`        | `user_profile.py`          |
| Components      | `PascalCase`        | `UserProfile`              |
| Functions/vars  | `camelCase` (JS) / `snake_case` (Py) | `getUserById` / `get_user_by_id` |
| Constants       | `UPPER_SNAKE_CASE`  | `MAX_RETRY_COUNT`          |
| Database tables | `snake_case` plural | `user_sessions`            |

### Code Style

- Use a linter and formatter configured in the project (ESLint + Prettier, or Ruff + Black).
- Run the formatter before committing.
- Do not disable lint rules without a comment explaining why.

---

## Testing

### Philosophy

- Write tests alongside new features — don't defer them.
- Unit test pure functions; integration test API routes and DB interactions.
- Aim for meaningful coverage, not 100% coverage for its own sake.

### Running Tests

```bash
# All tests
npm test
# or
pytest

# Watch mode (JS)
npm run test:watch

# Coverage
npm run test:coverage
# or
pytest --cov
```

### Test File Conventions

- Place test files next to source files **or** in a `tests/` mirror directory.
- Name test files: `<module>.test.ts` / `test_<module>.py`.
- Each test file should test one module.

---

## Environment Variables

- Never commit `.env` files.
- Provide a `.env.example` with all required keys and placeholder values.
- Document each variable with a comment in `.env.example`.

```bash
# .env.example
DATABASE_URL=postgres://user:password@localhost:5432/myoffice
SECRET_KEY=change-me-in-production
PORT=3000
```

---

## AI Assistant Guidelines

When Claude or another AI assistant works in this repo, it should:

### Always Do

- Read existing code before modifying it.
- Follow the conventions defined in this file.
- Keep changes minimal and focused on the task.
- Run tests and linters before committing.
- Write clear commit messages following the Conventional Commits format.
- Push to the designated `claude/` branch — never to `main`/`master`.

### Never Do

- Introduce security vulnerabilities (SQL injection, XSS, hardcoded secrets, etc.).
- Commit `.env` files or credentials.
- Delete or overwrite files without understanding what they do.
- Add unnecessary dependencies.
- Over-engineer: don't build abstractions for one-off uses.
- Add unused imports, dead code, or stale comments.
- Bypass git hooks with `--no-verify`.
- Force-push to shared or protected branches.

### When in Doubt

- Ask the user for clarification before making structural changes.
- Prefer the smallest change that correctly solves the problem.
- If blocked, explain the blocker rather than working around it unsafely.

---

## CI / CD

> Update once pipelines are configured.

```
.github/
└── workflows/
    ├── ci.yml        # Lint, test on every PR
    └── deploy.yml    # Deploy on merge to main
```

Standard CI checks:
1. Lint
2. Type-check
3. Unit tests
4. Integration tests
5. Build

---

## Security

- Validate all user input at system boundaries.
- Use parameterized queries — never concatenate SQL strings.
- Store passwords with a strong hashing algorithm (bcrypt / argon2).
- Use HTTPS in all environments except local development.
- Keep dependencies up to date; run `npm audit` / `pip-audit` regularly.
- Follow the principle of least privilege for DB users and service accounts.

---

## Updating This File

This file should be updated whenever:

- A new technology or framework is added.
- Conventions change.
- New workflow steps are introduced.
- The directory structure changes significantly.

Run the following prompt to regenerate a fresh CLAUDE.md:

> "Analyze this repository and create a comprehensive CLAUDE.md file that explains the codebase structure, development workflows, and key conventions for AI assistants to follow. If one already exists, update it with the most recent state."

---

*Last updated: 2026-03-04*
