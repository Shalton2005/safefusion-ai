# Contributing to SafeFusion AI

First, thank you for taking the time to contribute! SafeFusion AI is an enterprise-grade platform, and we value contributions that improve the reliability, intelligence, and safety of our system. 

This document provides the guidelines and conventions for contributing to the repository.

---

## 1. Repository Structure

SafeFusion AI follows a distributed microservices architecture. Understanding the directory layout is critical before beginning any work:

- **`/backend`**: Contains the core FastAPI application.
  - `/src/api`: REST API routes and endpoint controllers.
  - `/src/services`: Core business logic (Computer Vision, RAG, Risk Engine).
  - `/src/models`: Database schemas (PostgreSQL and Neo4j).
- **`/frontend`**: Contains the React + TypeScript frontend application.
  - `/src/features`: Domain-driven component architecture (e.g., dashboard, copilot).
  - `/src/store`: Global state management using Zustand.
  - `/src/services`: API client layer.
- **`/knowledge`**: Contains datasets and resources for the RAG and Knowledge Graph pipelines.
- **`/presentation`**: Documentation and assets related to project presentation.
- **`docker-compose.yml`**: Primary orchestration file for databases (PostgreSQL, Neo4j) and local AI (Ollama).

---

## 2. Branch Strategy

We follow a structured branching model to maintain stability:

- `main`: The stable branch. This branch must always be deployable and production-ready.
- `development`: The active integration branch for upcoming releases.
- **Feature Branches**: Prefix with `feature/` (e.g., `feature/cctv-grid`).
- **Bugfix Branches**: Prefix with `bugfix/` (e.g., `bugfix/neo4j-connection`).
- **Documentation**: Prefix with `docs/` (e.g., `docs/api-swagger`).

*Rule: Never commit directly to `main`.*

---

## 3. Commit Conventions

We enforce [Conventional Commits](https://www.conventionalcommits.org/) to automatically generate changelogs and maintain a readable history. 

**Format:**
```
<type>(<optional scope>): <description>
```

**Allowed Types:**
- `feat:` A new feature.
- `fix:` A bug fix.
- `docs:` Documentation only changes.
- `style:` Changes that do not affect the meaning of the code (white-space, formatting, etc).
- `refactor:` A code change that neither fixes a bug nor adds a feature.
- `perf:` A code change that improves performance.
- `chore:` Changes to the build process or auxiliary tools.

*Example:* `feat(dashboard): integrate live CCTV grid component`

---

## 4. Coding Style

We expect enterprise-quality code that is highly readable, typed, and linted.

### Frontend (React / TypeScript)
- **Typing:** Strict TypeScript is mandatory. Avoid the use of `any`. Define comprehensive interfaces in `types/`.
- **State Management:** Use Zustand for global state. Keep local state encapsulated within components.
- **Styling:** Use the established UI tokens and Vanilla CSS / defined utility frameworks. Ensure responsive breakpoints and micro-animations are maintained.
- **Linting:** Code must pass standard ESLint and Prettier formatting rules before submission.

### Backend (Python / FastAPI)
- **Typing:** Use Python type hints (`->`, `List[str]`, etc.) for all function signatures. This is critical for Pydantic validation and FastAPI Swagger generation.
- **Formatting:** Adhere to PEP 8. We recommend using `black` for formatting and `ruff` for linting.
- **Concurrency:** Use `async def` for I/O bound operations (database queries, external API calls) to prevent event-loop blocking.

---

## 5. Documentation Style

Clear documentation is as important as the code itself.

- **Markdown:** All top-level documentation (README, CHANGELOG, setup guides) should use Markdown with proper heading hierarchy, code block syntax highlighting, and GitHub alerts (`> [!NOTE]`) where applicable.
- **Python Docstrings:** Use Google-style docstrings for all classes, methods, and complex functions.
- **TypeScript Comments:** Use JSDoc formatting for complex utility functions and state store logic. Avoid commenting obvious code; write self-documenting code instead.

---

## 6. Pull Requests

When you are ready to submit your code:

1. **Rebase:** Ensure your branch is rebased against the latest `main` or `development` branch.
2. **Title:** Title your PR using the Conventional Commit format.
3. **Description:** Clearly describe the problem solved, the approach taken, and how to verify the changes. Include screenshots or videos for any UI changes.
4. **CI/CD:** Ensure all automated checks (linting, tests) pass.
5. **Review:** Request a review from at least one core team member (`Shalton2005` or `lukenoronha`).

---

## 7. Issues

If you find a bug or have a feature request, please open an Issue.

- **Bug Reports:** Provide a clear title, exact reproduction steps, expected behavior, actual behavior, and environment details (OS, Browser, Docker version).
- **Feature Requests:** Explain the "Why" before the "What". Detail the business or technical value the feature adds to the SafeFusion AI ecosystem.

---

## 8. Best Practices

- **Security First:** Never commit `.env` files, API keys, or database credentials. Always use environment variables.
- **Atomic Commits:** Keep commits small and focused on a single logical change. Do not bundle refactoring with new feature additions in the same commit.
- **Performance:** For frontend, avoid unnecessary re-renders (use `useMemo` / `useCallback` appropriately). For backend, optimize database queries and utilize connection pooling.
- **Zero-Harm Principle:** Align your code with the platform's core mission. Ensure that fail-safes are in place for critical alerting modules and that the system gracefully handles camera or sensor downtime.

---

Thank you for helping us build the future of industrial safety intelligence!