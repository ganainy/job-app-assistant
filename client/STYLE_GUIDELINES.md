# UI Style Guidelines

This document defines the unified design system for all pages in the Job App Assistant application. **Follow these guidelines when creating or modifying any screen.**

## Quick Reference - Page Template

```tsx
// Standard page structure
const ExamplePage: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Page Title
            </h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Description text
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Action buttons */}
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          {/* Card content */}
        </div>
      </div>
    </div>
  );
};
```

---

## 1. Colors

### Page Backgrounds
| Context | Light | Dark |
|---------|-------|------|
| Main Page | `bg-slate-50` | `dark:bg-slate-950` |
| Card/Panel | `bg-white` | `dark:bg-slate-900` |
| Card Header | `bg-slate-50` | `dark:bg-slate-900/50` |

### Borders
| Context | Light | Dark |
|---------|-------|------|
| Card Border | `border-slate-200` | `dark:border-slate-800` |
| Divider | `border-slate-200` | `dark:border-slate-700` |
| Input Border | `border-slate-300` | `dark:border-slate-600` |

### Primary Action Color
Use **Indigo** consistently:
- Button: `bg-indigo-600 hover:bg-indigo-700 text-white`
- Link: `text-indigo-600 dark:text-indigo-400`
- Focus: `focus:ring-indigo-500`

### Text Colors
| Type | Light | Dark |
|------|-------|------|
| Heading | `text-slate-900` | `dark:text-white` |
| Body | `text-slate-700` | `dark:text-slate-300` |
| Muted | `text-slate-500` | `dark:text-slate-400` |
| Secondary | `text-slate-600` | `dark:text-slate-400` |

---

## 2. Typography

| Element | Classes |
|---------|---------|
| Page Title | `text-2xl font-bold text-slate-900 dark:text-white` |
| Section Title | `text-xl font-semibold text-slate-900 dark:text-white` |
| Card Title | `text-lg font-semibold text-slate-900 dark:text-white` |
| Body | `text-slate-700 dark:text-slate-300` |
| Helper/Small | `text-sm text-slate-500 dark:text-slate-400` |
| Label | `text-sm font-medium text-slate-700 dark:text-slate-300` |

---

## 3. Cards

### Standard Card
```tsx
<div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
  {/* Content */}
</div>
```

### Card with Header
```tsx
<div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
  <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Title</h3>
  </div>
  <div className="p-4 sm:p-6">
    {/* Body */}
  </div>
</div>
```

---

## 4. Buttons

### Primary
```tsx
<button className="px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
```

### Secondary
```tsx
<button className="px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
```

### Ghost
```tsx
<button className="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
```

### Danger
```tsx
<button className="px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">
```

---

## 5. Form Elements

### Input
```tsx
<input
  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
/>
```

### Select
```tsx
<select className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
```

### Label
```tsx
<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
```

---

## 6. Spacing

| Context | Class |
|---------|-------|
| Page sections | `space-y-6` |
| Card content | `space-y-4` |
| Header to content | `mb-6` |
| Form fields | `space-y-4` |
| Grid gaps | `gap-4` or `gap-6` |

---

## 7. Status Colors

| Status | Badge Classes |
|--------|---------------|
| Success | `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300` |
| Error | `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300` |
| Warning | `bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300` |
| Info | `bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300` |

---

## 8. DON'T Use

| ❌ Avoid | ✅ Use Instead |
|----------|----------------|
| `bg-black` | `bg-slate-950` |
| `bg-gray-*` | `bg-slate-*` |
| `dark:bg-zinc-*` | `dark:bg-slate-*` |
| Mixed primary colors | Always use `indigo-600` |
| Gradient page backgrounds | Solid backgrounds |
| `text-gray-*` | `text-slate-*` |

---

## 9. Responsive Patterns

```tsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Responsive flex
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">

// Responsive padding
<div className="p-4 sm:p-6">
```

---

**Last Updated:** December 2025
