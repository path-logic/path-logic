# TypeScript Strict Typing Standards

## Overview

All TypeScript code in this project MUST follow strict explicit typing rules. This is a non-negotiable architectural requirement.

## Rules

### 1. Variable Declarations

**ALL** variable declarations must have explicit types:

```typescript
// ❌ WRONG
const name = 'John';
const count = 42;
const items = [];
const user = getUserData();

// ✅ CORRECT
const name: string = 'John';
const count: number = 42;
const items: Array<string> = [];
const user: IUser = getUserData();
```

### 2. Function Parameters and Return Types

**ALL** function parameters and return types must be explicit:

```typescript
// ❌ WRONG
function add(a, b) {
    return a + b;
}

const multiply = (a, b) => a * b;

// ✅ CORRECT
function add(a: number, b: number): number {
    return a + b;
}

const multiply = (a: number, b: number): number => a * b;
```

### 3. Array Types

Use `Array<T>` syntax instead of `T[]`:

```typescript
// ❌ WRONG
const names: string[] = [];
const users: IUser[] = [];

// ✅ CORRECT
const names: Array<string> = [];
const users: Array<IUser> = [];
```

### 4. Destructuring

Destructured variables must have explicit types:

```typescript
// ❌ WRONG
const [name, value] = cookie.split('=');
const { id, email } = user;

// ✅ CORRECT
const [name, value]: Array<string> = cookie.split('=');
const { id, email }: { id: string; email: string } = user;

// OR with interface
interface IUserData {
    id: string;
    email: string;
}
const { id, email }: IUserData = user;
```

### 5. Async/Await

Async functions must have explicit `Promise<T>` return types:

```typescript
// ❌ WRONG
async function fetchData() {
    return await api.get('/data');
}

// ✅ CORRECT
async function fetchData(): Promise<IData> {
    return await api.get('/data');
}
```

### 6. React Hooks

Hook results must be explicitly typed:

```typescript
// ❌ WRONG
const [count, setCount] = useState(0);
const router = useRouter();

// ✅ CORRECT
const [count, setCount] = useState<number>(0);
const router: AppRouterInstance = useRouter();
```

### 7. Error Handling

Catch blocks must type the error:

```typescript
// ❌ WRONG
try {
    // ...
} catch (error) {
    console.error(error);
}

// ✅ CORRECT
try {
    // ...
} catch (error: unknown) {
    console.error(error);
}
```

### 8. Object Literals

Complex object literals should use interfaces:

```typescript
// ❌ WRONG
const config = {
    timeout: 5000,
    retries: 3,
};

// ✅ CORRECT
interface IConfig {
    timeout: number;
    retries: number;
}

const config: IConfig = {
    timeout: 5000,
    retries: 3,
};
```

## ESLint Configuration

The following ESLint rules enforce these standards:

```javascript
'@typescript-eslint/explicit-function-return-type': 'error',
'@typescript-eslint/explicit-module-boundary-types': 'error',
'@typescript-eslint/no-inferrable-types': 'off',
'@typescript-eslint/typedef': [
    'error',
    {
        arrayDestructuring: true,
        arrowParameter: true,
        memberVariableDeclaration: true,
        objectDestructuring: true,
        parameter: true,
        propertyDeclaration: true,
        variableDeclaration: true,
        variableDeclarationIgnoreFunction: false,
    },
],
```

## Benefits

1. **Better IDE Support**: Full autocomplete and IntelliSense
2. **Catch Errors Early**: Type errors caught at compile time
3. **Self-Documenting**: Code is easier to understand
4. **Refactoring Safety**: Changes are safer with explicit types
5. **Team Consistency**: Everyone follows the same standards

## Enforcement

- All new files MUST follow these rules
- All edits to existing files MUST add explicit types
- Code reviews will reject PRs without explicit typing
- CI/CD will fail on type errors

## Examples

See the following files for reference implementations:
- `apps/web/src/lib/featureFlags/featureFlags.ts`
- `apps/web/src/lib/featureFlags/useFeatureFlag.ts`
- `apps/web/src/components/FeatureFlagToggle.tsx`
