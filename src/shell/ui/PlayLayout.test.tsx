import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayLayout } from './PlayLayout';

describe('PlayLayout', () => {
  it('칸마다 머리와 몸통을 그린다', () => {
    render(
      <PlayLayout
        columns={[
          { key: 'a', color: '#E5483B', header: <span>민준</span>, body: <span>퍼즐A</span> },
          { key: 'b', color: '#2F80ED', header: <span>서연</span>, body: <span>퍼즐B</span> },
          { key: 'c', color: '#27AE60', header: <span>아빠</span>, body: <span>퍼즐C</span> },
        ]}
      />,
    );
    const columns = screen.getAllByTestId('player-column');
    expect(columns).toHaveLength(3);
    expect(columns[1]).toHaveTextContent('서연');
    expect(columns[1]).toHaveTextContent('퍼즐B');
  });
});
