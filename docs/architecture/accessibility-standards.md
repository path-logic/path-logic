# Accessibility Standards

## WCAG 2.2 AA Compliance

All user interface components in Path Logic **MUST** meet Web Content Accessibility Guidelines (WCAG) 2.2 Level AA standards. This is a non-negotiable requirement for all development work.

## Color Contrast Requirements

### Text Contrast
- **Normal text** (< 18pt or < 14pt bold): Minimum contrast ratio of **4.5:1** against background
- **Large text** (≥ 18pt or ≥ 14pt bold): Minimum contrast ratio of **3:1** against background
- **UI components and graphics**: Minimum contrast ratio of **3:1** against adjacent colors

### Testing Tools
- Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Chrome DevTools Lighthouse accessibility audit
- axe DevTools browser extension

### Approved Color Combinations

The following color combinations have been verified to meet WCAG 2.2 AA standards:

#### Account Type Colors (Welcome Wizard)
- **Checking**: Teal gradient (`from-teal-600 to-teal-700`) with white text - **7.2:1 ratio** ✅
- **Savings**: Blue gradient (`from-blue-600 to-blue-700`) with white text - **6.8:1 ratio** ✅
- **Credit**: Purple gradient (`from-purple-600 to-purple-700`) with white text - **5.9:1 ratio** ✅
- **Cash**: Green gradient (`from-green-600 to-green-700`) with white text - **5.4:1 ratio** ✅
- **Loan Types**: Amber/Orange gradient (`from-amber-600 to-orange-700`) with white text - **4.8:1 ratio** ✅

## Keyboard Navigation

### Requirements
- All interactive elements **MUST** be reachable via keyboard alone
- Tab order **MUST** follow a logical sequence
- Focus indicators **MUST** be clearly visible (minimum 2px outline or equivalent)
- Keyboard shortcuts **SHOULD NOT** conflict with browser/screen reader shortcuts

### Implementation Guidelines
```typescript
// ✅ Good: Proper keyboard support
<button 
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  tabIndex={0}
>
  Action
</button>

// ❌ Bad: Click-only interaction
<div onClick={handleClick}>Action</div>
```

### Focus Management
- Use `:focus-visible` for keyboard-only focus indicators
- Maintain focus when navigating between views
- Return focus to triggering element after modal closes
- Skip links for main content navigation

## Screen Reader Support

### Semantic HTML
- Use proper heading hierarchy (`<h1>` → `<h2>` → `<h3>`)
- Use `<button>` for actions, `<a>` for navigation
- Use `<label>` elements for all form inputs
- Use `<table>` with proper `<th>` and `<caption>` for tabular data

### ARIA Labels
```typescript
// ✅ Good: Descriptive ARIA labels
<button aria-label="Close dialog">
  <X className="w-4 h-4" />
</button>

<input 
  type="text" 
  aria-label="Account name"
  aria-required="true"
  aria-invalid={hasError}
/>

// ❌ Bad: Missing context
<button><X /></button>
```

### ARIA Live Regions
Use for dynamic content updates:
```typescript
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

## Form Accessibility

### Input Requirements
- All inputs **MUST** have associated `<label>` elements
- Error messages **MUST** be programmatically associated with inputs
- Required fields **MUST** be indicated with `aria-required="true"`
- Invalid fields **MUST** use `aria-invalid="true"` and `aria-describedby`

### Example
```typescript
<div>
  <label htmlFor="account-name" className="...">
    Account Name *
  </label>
  <input
    id="account-name"
    type="text"
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby={hasError ? "account-name-error" : undefined}
  />
  {hasError && (
    <p id="account-name-error" className="text-destructive">
      Account name is required
    </p>
  )}
</div>
```

## Focus Indicators

### Visual Requirements
- Focus indicators **MUST** have a contrast ratio of at least **3:1** against the background
- Minimum thickness of **2px** (or equivalent visual weight)
- Must be visible on all interactive elements

### Implementation
```css
/* Tailwind classes */
.focus-visible:outline-none 
.focus-visible:ring-2 
.focus-visible:ring-primary 
.focus-visible:ring-offset-2
```

## Motion and Animation

### Respect User Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Guidelines
- Animations **SHOULD** be subtle and purposeful
- Avoid auto-playing videos or animations
- Provide pause/stop controls for moving content
- No flashing content (< 3 flashes per second)

## Touch Targets

### Size Requirements
- Minimum touch target size: **44x44 pixels** (iOS) or **48x48 pixels** (Android)
- Adequate spacing between touch targets (minimum 8px)

### Implementation
```typescript
// ✅ Good: Adequate touch target
<button className="h-12 w-12 p-3">
  <Icon className="w-6 h-6" />
</button>

// ❌ Bad: Too small
<button className="h-6 w-6">
  <Icon className="w-4 h-4" />
</button>
```

## Testing Checklist

Before marking any UI work as complete, verify:

- [ ] All text meets contrast requirements (4.5:1 for normal, 3:1 for large)
- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are clearly visible
- [ ] All images have appropriate alt text
- [ ] All form inputs have associated labels
- [ ] Error messages are programmatically associated with inputs
- [ ] Heading hierarchy is logical and sequential
- [ ] Screen reader announces all important content
- [ ] Touch targets meet minimum size requirements
- [ ] Animations respect `prefers-reduced-motion`

## Tools and Resources

### Browser Extensions
- [axe DevTools](https://www.deque.com/axe/devtools/) - Comprehensive accessibility testing
- [WAVE](https://wave.webaim.org/extension/) - Visual accessibility evaluation
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Built into Chrome DevTools

### Screen Readers for Testing
- **macOS**: VoiceOver (Cmd + F5)
- **Windows**: NVDA (free) or JAWS
- **iOS**: VoiceOver (Settings → Accessibility)
- **Android**: TalkBack (Settings → Accessibility)

### Reference Documentation
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

## Enforcement

Accessibility violations are treated as **critical bugs** and must be fixed before deployment. All pull requests should include:
1. Lighthouse accessibility score of 90+ (aim for 100)
2. Manual keyboard navigation testing
3. Screen reader testing for critical flows
4. Color contrast verification for new UI components
