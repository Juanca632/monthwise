import { render } from '@testing-library/react-native';
import { createElement } from 'react';
import Svg, { Path } from 'react-native-svg';

describe('test setup', () => {
  it('runs TypeScript tests', () => {
    const cents: number = 1250;
    expect(cents + 50).toBe(1300);
  });

  // 002's charts draw with react-native-svg; this fails first if jest-expo stops rendering it.
  it('renders an SVG path', () => {
    const { toJSON } = render(
      createElement(Svg, { width: 10, height: 10, testID: 'svg' }, createElement(Path, { d: 'M0 0 L10 10' })),
    );
    expect(JSON.stringify(toJSON())).toContain('M0 0 L10 10');
  });
});
