process.env.TZ = 'UTC';
import '@testing-library/jest-dom';

// Required by React to avoid act() environment warnings in component tests.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
