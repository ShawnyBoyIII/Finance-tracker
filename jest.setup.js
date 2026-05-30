import '@testing-library/jest-dom';

// Mock Recharts to avoid issues with measuring DOM elements
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');

  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: '100%', height: '100%' }}>{children}</div>
    ),
  };
});
