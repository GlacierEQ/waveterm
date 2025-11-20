# Wave Terminal - Development Guidelines

## Code Quality Standards

### Copyright and Licensing
- **MANDATORY**: Every source file must start with copyright header:
  ```
  // Copyright 2025, Command Line Inc.
  // SPDX-License-Identifier: Apache-2.0
  ```
- Apply to all `.go`, `.ts`, `.tsx`, `.js`, and `.jsx` files
- No exceptions - this is enforced across the entire codebase

### Code Formatting
- **EditorConfig**: Use `.editorconfig` settings for consistent formatting
  - LF line endings for all files
  - UTF-8 encoding for code files
  - 4-space indentation for JS/TS/CSS files
  - Insert final newline (except CNAME files)

### Import Organization
- **TypeScript/React**: Use path aliases extensively
  ```typescript
  import { Workspace } from "@/app/workspace/workspace";
  import { atoms, globalStore } from "@/store/global";
  import * as keyutil from "@/util/keyutil";
  ```
- **Go**: Standard library first, then third-party, then local packages
  ```go
  import (
      "context"
      "encoding/json"
      "fmt"
      
      "github.com/google/uuid"
      "github.com/mitchellh/mapstructure"
      
      "github.com/wavetermdev/waveterm/pkg/waveobj"
  )
  ```

## Structural Conventions

### TypeScript/React Patterns
- **Component Structure**: Use functional components with hooks
  ```typescript
  const ComponentName = memo(({ prop1, prop2 }: ComponentProps) => {
      const [state, setState] = useState(initialValue);
      // component logic
      return <div>...</div>;
  });
  ComponentName.displayName = "ComponentName";
  ```

- **State Management**: Use Jotai atoms for global state
  ```typescript
  const someAtom = atom(initialValue);
  const derivedAtom = atom((get) => {
      const value = get(someAtom);
      return transformValue(value);
  });
  ```

- **Event Handlers**: Prefix with `handle` and use arrow functions
  ```typescript
  const handleClick = (event: React.MouseEvent) => {
      // handle click logic
  };
  ```

### Go Patterns
- **Service Structure**: Use service pattern with method metadata
  ```go
  type ServiceName struct{}
  
  func (s *ServiceName) MethodName_Meta() tsgenmeta.MethodMeta {
      return tsgenmeta.MethodMeta{
          Desc:     "method description",
          ArgNames: []string{"arg1", "arg2"},
      }
  }
  
  func (s *ServiceName) MethodName(ctx context.Context, arg1 string, arg2 int) error {
      // method implementation
  }
  ```

- **Error Handling**: Always wrap errors with context
  ```go
  if err != nil {
      return fmt.Errorf("cannot perform operation: %w", err)
  }
  ```

- **Object Registration**: Use init functions for type registration
  ```go
  func init() {
      waveobj.RegisterType(reflect.TypeOf((*ObjectType)(nil)))
  }
  ```

## Naming Conventions

### TypeScript/React
- **Components**: PascalCase (`EmojiPalette`, `AppBackground`)
- **Functions**: camelCase (`handleSearchChange`, `createBlock`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`, `PLATFORM`)
- **Interfaces**: PascalCase with descriptive names (`EmojiPaletteProps`)
- **Files**: kebab-case for components (`emoji-palette.tsx`)

### Go
- **Types**: PascalCase (`BlockService`, `WaveObj`)
- **Functions**: PascalCase for exported, camelCase for private
- **Constants**: PascalCase (`DefaultTimeout`, `OTypeKeyName`)
- **Packages**: lowercase single word (`waveobj`, `blockservice`)

## Documentation Standards

### TypeScript Comments
- **JSDoc**: Use for public APIs and complex functions
  ```typescript
  /**
   * Open a link in a new window or web widget
   * @param uri The link to open
   * @param forceOpenInternally Force internal opening
   */
  async function openLink(uri: string, forceOpenInternally = false) {
  ```

### Go Comments
- **Package Documentation**: Every package should have package comment
- **Public Functions**: Document all exported functions
  ```go
  // GetOID returns the object ID for the given wave object
  func GetOID(waveObj WaveObj) string {
  ```

## Internal API Usage Patterns

### State Management with Jotai
```typescript
// Creating atoms with proper typing
const typedAtom = atom<SpecificType>(initialValue);

// Derived atoms with dependencies
const derivedAtom = atom((get) => {
    const dependency = get(dependencyAtom);
    return computeValue(dependency);
});

// Using atoms in components
const Component = () => {
    const value = useAtomValue(someAtom);
    const setValue = useSetAtom(someAtom);
    // component logic
};
```

### Wave Object System (Go)
```go
// Implementing WaveObj interface
type MyObject struct {
    OID     string      `json:"oid"`
    Version int         `json:"version"`
    Meta    MetaMapType `json:"meta"`
    // other fields
}

func (obj *MyObject) GetOType() string {
    return "myobject"
}

// Registration in init
func init() {
    waveobj.RegisterType(reflect.TypeOf((*MyObject)(nil)))
}
```

### Service Layer Pattern (Go)
```go
// Service with proper metadata
type MyService struct{}

func (s *MyService) DoSomething_Meta() tsgenmeta.MethodMeta {
    return tsgenmeta.MethodMeta{
        Desc:     "performs some operation",
        ArgNames: []string{"ctx", "param1", "param2"},
    }
}

func (s *MyService) DoSomething(ctx context.Context, param1 string, param2 int) (*Result, error) {
    // implementation with proper error handling
    if err := validateParams(param1, param2); err != nil {
        return nil, fmt.Errorf("invalid parameters: %w", err)
    }
    // business logic
    return result, nil
}
```

## Frequently Used Code Idioms

### React Component Patterns
```typescript
// Memoized component with proper typing
const Component = memo(({ className, ...props }: ComponentProps) => {
    return <div className={clsx("base-class", className)} {...props} />;
});
Component.displayName = "Component";

// Conditional rendering
{condition ? <ComponentA /> : <ComponentB />}
{items.length > 0 ? (
    items.map(item => <Item key={item.id} {...item} />)
) : (
    <div className="no-items">No items found</div>
)}
```

### Go Error Handling
```go
// Standard error wrapping
if err != nil {
    return fmt.Errorf("operation failed: %w", err)
}

// Context-aware operations
func (s *Service) Operation(ctx context.Context) error {
    select {
    case <-ctx.Done():
        return ctx.Err()
    default:
        // continue with operation
    }
}
```

### Async Operations (TypeScript)
```typescript
// Fire and forget pattern
fireAndForget(() => SomeService.AsyncOperation());

// Proper async/await with error handling
try {
    const result = await SomeService.Operation();
    // handle success
} catch (error) {
    console.error("Operation failed:", error);
    pushFlashError({ message: "Operation failed" });
}
```

## Popular Annotations and Metadata

### TypeScript
- `@deprecated` - Mark deprecated functions
- `@internal` - Mark internal-only APIs
- JSDoc tags: `@param`, `@returns`, `@throws`, `@example`

### Go
- Build tags: `//go:build !windows` for platform-specific code
- Generate directives: `//go:generate go run cmd/generatego/main.go`
- JSON tags: `json:"fieldname"` for serialization
- Mapstructure tags: `mapstructure:"fieldname"` for config mapping

## Testing Patterns

### Frontend Testing
```typescript
// Component testing with proper setup
describe('ComponentName', () => {
    it('should render correctly', () => {
        render(<ComponentName {...defaultProps} />);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });
});
```

### Go Testing
```go
func TestFunctionName(t *testing.T) {
    // Setup
    ctx := context.Background()
    
    // Test
    result, err := FunctionName(ctx, testInput)
    
    // Assertions
    assert.NoError(t, err)
    assert.Equal(t, expectedResult, result)
}
```

## Performance Considerations

- **React**: Use `memo()` for expensive components, `useMemo()` for expensive calculations
- **Go**: Use context for cancellation, avoid goroutine leaks with proper cleanup
- **State**: Minimize atom dependencies to reduce unnecessary re-renders
- **Database**: Use transactions for multiple operations, proper indexing for queries