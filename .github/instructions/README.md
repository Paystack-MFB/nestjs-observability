# Cursor AI Coding Rules

This directory contains AI coding rules for Cursor IDE.

## File Types

### Managed Files (\*.managed.mdc)

Files ending with `.managed.mdc` are **centrally managed** by the `@paystackhq/pkg-ai-coding-rules` package.

- ✅ Automatically updated when you upgrade the package
- ❌ Never edit these manually - changes will be overwritten
- 🔄 Synced via `pnpm run rules:sync`

### Local Files (\*.mdc)

Files ending with `.mdc` (without `.managed`) are **local to this repository**.

- ✅ You can edit these freely
- ✅ Add repository-specific rules here
- ✅ Never touched by the CLI

## Rule Hierarchy

Rules are applied in order:

1. **00-company-\*** - Company-wide standards (always applied)
2. **10-competency-\*** - Competency-specific rules (backend, frontend, mobile)
3. **20-framework-\*** - Framework-specific rules (nestjs, react, etc.)
4. **20-shared-\*** - Optional shared modules (observability, security)
5. **90-repo-\*** - Repository-specific overrides (local rules)

## Adding Repository-Specific Rules

Create `.github/instructions/90-repo.instructions.md` for repository-specific rules.

## Commands

- **Sync rules:** `pnpm run rules:sync`
- **Check sync:** `pnpm run rules:check`

## More Information

See `MANAGED_INDEX.md` for a list of all managed files and their sources.
