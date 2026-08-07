# Jest Configuration Setup

## 📦 Installation

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev @babel/preset-react @babel/preset-env babel-jest
npm install --save-dev identity-obj-proxy  # Pour CSS modules
```

## 📄 jest.config.js

Créez ce fichier à la racine de `interne/`:

```javascript
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/src/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
    '!src/main.jsx',
    '!src/**/*.d.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
};
```

## 📄 .babelrc

```json
{
  "presets": [
    ["@babel/preset-env", { "targets": { "node": "current" } }],
    ["@babel/preset-react", { "runtime": "automatic" }]
  ]
}
```

## 📄 src/setupTests.js

```javascript
import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock environment
process.env.VITE_API_URL = 'http://localhost:4000';
```

## 📄 package.json scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:coverage:view": "jest --coverage && open coverage/lcov-report/index.html"
  }
}
```

## ✍️ Exemple de test: Hook

Fichier: `src/hooks/__tests__/useFinanceExpenses.test.js`

```javascript
import { renderHook, act, waitFor } from '@testing-library/react';
import useFinanceExpenses from '../useFinanceExpenses';

// Mock the fetch API
global.fetch = jest.fn();

describe('useFinanceExpenses Hook', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorage.clear();
    localStorage.getItem.mockReturnValue('fake-token-123');
  });

  it('should load expenses on mount', async () => {
    const mockExpenses = [
      { id: '1', amount: 100, category: 'fuel' },
      { id: '2', amount: 50, category: 'maintenance' },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockExpenses,
    });

    const { result } = renderHook(() => useFinanceExpenses());

    // Initially loading
    expect(result.current.loading).toBe(true);

    // Wait for async operation
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.expenses).toEqual(mockExpenses);
  });

  it('should create expense', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '3', amount: 75, category: 'insurance' }),
    });

    const { result } = renderHook(() => useFinanceExpenses());

    const newExpense = { amount: 75, category: 'insurance' };

    await act(async () => {
      await result.current.createExpense(newExpense);
    });

    expect(result.current.expenses).toContainEqual(
      expect.objectContaining({ amount: 75 })
    );
  });

  it('should handle API errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
    });

    const { result } = renderHook(() => useFinanceExpenses());

    await act(async () => {
      try {
        await result.current.createExpense({ amount: 100 });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
```

## ✍️ Exemple de test: Composant

Fichier: `src/components/__tests__/UserCard.test.jsx`

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import UserCard from '../UserCard';

describe('UserCard Component', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    firstName: 'Jean',
    role: 'ADMIN',
  };

  it('should render user info', () => {
    render(<UserCard user={mockUser} />);

    expect(screen.getByText('Jean')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('should call onEdit when edit button clicked', () => {
    const mockOnEdit = jest.fn();
    render(<UserCard user={mockUser} onEdit={mockOnEdit} />);

    fireEvent.click(screen.getByText('Éditer'));
    expect(mockOnEdit).toHaveBeenCalledWith(mockUser);
  });
});
```

## 📊 Coverage Goals

Start with simple coverage:
- **Phase 1:** 20% coverage (Most critical paths)
- **Phase 2:** 40% coverage (All services + hooks)
- **Phase 3:** 60%+ coverage (Full app)

## 🚀 Getting started immediately

1. Install packages
2. Create jest.config.js
3. Create src/setupTests.js
4. Write 3-5 tests for critical features
5. Run `npm test`
6. Gradually expand coverage

## 📚 Resources

- Jest docs: https://jestjs.io/
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro/
- Testing recipes: https://testing-library.com/docs/queries/about
