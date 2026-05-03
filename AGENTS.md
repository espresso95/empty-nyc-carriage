# Steering

This project should stay clean, simple, and easy to reason about.

## Code Style

- Prefer straightforward code over clever abstractions.
- Keep functions small and focused on one job.
- Use descriptive names for modules, functions, variables, schemas, and tests.
- Avoid hidden side effects. Pass dependencies explicitly where practical.
- Prefer typed interfaces and structured data over loose dictionaries when data crosses module boundaries.
- Keep business rules close to the domain they belong to.
- Make failure modes explicit with clear errors and predictable return shapes.
- Do not add broad framework wrappers until repeated real use proves they are needed.
- Do not add `//` comments. Use clear names and structure first; add short language-appropriate comments only when the code would otherwise be hard to understand.

## Testing

- Add focused tests near the behavior being changed.
- Test contracts at API boundaries.
- Test safety-sensitive behavior directly.
- Add regression questions for RAG behavior as the corpus grows.
- Keep tests deterministic by mocking local model calls unless the test is explicitly marked as an integration check.
