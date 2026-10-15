# Contributing to AI Virtual Assistant

Thank you for your interest in contributing to the Open-Source AI Virtual Assistant!

## Code of Conduct

Please maintain professional, respectful, and constructive communication at all times.

## Development Workflow

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/your-org/open-source-ai-virtual-assistant.git
   cd open-source-ai-virtual-assistant
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Run tests before submitting changes:
   ```bash
   npm test
   npx tsc --noEmit
   npm run build
   ```

## Design Principles

- **No Fake Capabilities**: Never claim an integration or feature exists if it only generates a placeholder or mock without clear labeling.
- **Strict Server-Side Validation**: All tool arguments must be defined with Zod schemas.
- **Least-Privilege Scoping**: Require explicit human approval for any bulk, irreversible, or consequential operations.
- **Authoritative Verification**: Add verification logic that re-queries the provider state to confirm mutations succeeded.
