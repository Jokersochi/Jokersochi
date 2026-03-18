# Architect Concept App (Prototype)

This folder contains a React prototype for an AI-assisted architectural concept studio. The component is not wired into the main build pipeline yet – it is stored here as a self-contained experiment so that it can be iterated on separately from the production "Visage Studio" app.

## Key ideas

- Tailwind-inspired utility classes are used directly in JSX to describe the layout and theming for the dashboard-like interface.
- Project data is persisted locally by using `localStorage`, so switching between mock projects, updating parameters, or toggling the dark mode keeps the state for the next browser session.
- Several helper functions generate the building footprint, calculate basic area/volume stats, and prepare prompt suggestions for image generation pipelines.
- Motion and popover interactions rely on `framer-motion`, while all icons come from `react-icons` to keep the prototype compact.

## Usage

To try the component you can import `ArchitectApp` into a React/Vite playground or embed it into an existing application:

```jsx
import ArchitectApp from "./ArchitectApp";

export default function Page() {
  return <ArchitectApp />;
}
```

Because this prototype expects Tailwind-like classes and icon/font dependencies to be available, you will also need to set up the corresponding CSS pipeline (for example Tailwind CSS) and add `framer-motion` plus `react-icons` to your project.
