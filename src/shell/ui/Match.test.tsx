import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameModule, PlayerAreaProps } from '../../games/types';
import { memoryStore } from '../../lib/storage';
import type { MatchConfig } from '../logic/match';
import { loadBestTimes } from '../logic/persistence';
import { PLAYER_COLORS } from './colors';
import { Match } from './Match';

// 셸만 시험하려고 '풀기' 버튼 하나뿐인 가짜 게임을 쓴다
function StubArea({ active, onSolved }: PlayerAreaProps) {
  return (
    <button type="button" disabled={!active} onClick={onSolved}>
      풀기
    </button>
  );
}

const stubGame: GameModule = {
  id: 'stub',
  name: '시험용',
  description: '',
  minPlayers: 1,
  maxPlayers: 4,
  PlayerArea: StubArea,
};

const NAMES = ['민준', '서연', '아빠', '엄마'];

const config = (players: number, rounds = 2, timeLimitSec = 60): MatchConfig => ({
  gameId: 'stub',
  players: NAMES.slice(0, players).map((name) => ({ name, difficulty: 'normal' as const })),
  rounds,
  timeMode: 'round',
  timeLimitSec,
  gameTimeSec: 300,
});

function renderMatch(c: MatchConfig) {
  const onExit = vi.fn();
  const onReplay = vi.fn();
  const store = memoryStore();
  render(<Match game={stubGame} config={c} seed={1} store={store} onExit={onExit} onReplay={onReplay} />);
  return { onExit, onReplay, store };
}

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const solveButtons = () => screen.getAllByRole('button', { name: '풀기' });
const columns = () => screen.getAllByTestId('player-column');

describe('Match', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('3, 2, 1 카운트다운 뒤 라운드가 시작된다', () => {
    renderMatch(config(2));
    expect(screen.getAllByTestId('countdown')[0]).toHaveTextContent('3');
    advance(1000);
    expect(screen.getAllByTestId('countdown')[0]).toHaveTextContent('2');
    advance(2000);
    expect(screen.queryByTestId('countdown')).toBeNull();
    expect(solveButtons()).toHaveLength(2);
    expect(screen.getByText('라운드 1/2')).toBeInTheDocument();
    expect(screen.getByTestId('clock')).toHaveTextContent('1:00');
  });

  it('남은 시간이 줄어든다', () => {
    renderMatch(config(2));
    advance(3000 + 15000);
    expect(screen.getByTestId('clock')).toHaveTextContent('0:45');
  });

  it('모두 풀면 라운드가 끝나고 푼 순서대로 점수를 얻는다', () => {
    renderMatch(config(2));
    advance(3000);
    fireEvent.click(solveButtons()[1]);
    fireEvent.click(solveButtons()[0]);
    expect(screen.getByText('라운드 1 끝!')).toBeInTheDocument();
    expect(columns()[1]).toHaveTextContent('3점 +3');
    expect(columns()[1]).toHaveTextContent('완성! 1등');
    expect(columns()[0]).toHaveTextContent('2점 +2');
  });

  it('시간이 다 되면 못 푼 사람은 0점으로 라운드가 끝난다', () => {
    renderMatch(config(2));
    advance(3000);
    fireEvent.click(solveButtons()[0]);
    advance(60000);
    expect(screen.getByText('라운드 1 끝!')).toBeInTheDocument();
    expect(columns()[1]).toHaveTextContent('0점 +0');
    expect(columns()[1]).toHaveTextContent('시간 끝');
  });

  it('다음 라운드를 거쳐 마지막 라운드 뒤 최종 결과를 보여준다', () => {
    const { onReplay, onExit } = renderMatch(config(2, 2));
    advance(3000);
    fireEvent.click(solveButtons()[1]);
    advance(60000);
    fireEvent.click(screen.getByRole('button', { name: '다음 라운드' }));
    expect(screen.getAllByTestId('countdown')[0]).toHaveTextContent('3');
    advance(3000);
    expect(screen.getByText('라운드 2/2')).toBeInTheDocument();
    fireEvent.click(solveButtons()[1]);
    fireEvent.click(solveButtons()[0]);
    fireEvent.click(screen.getByRole('button', { name: '결과 보기' }));
    expect(screen.getByRole('heading', { name: '서연 우승!' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다시 하기' }));
    expect(onReplay).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '메뉴로' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('그만하기는 한 번 더 눌러야 나가고, 3초 지나면 확인이 풀린다', () => {
    const { onExit } = renderMatch(config(2));
    fireEvent.click(screen.getByRole('button', { name: '그만하기' }));
    expect(onExit).not.toHaveBeenCalled();
    advance(3000);
    expect(screen.getByRole('button', { name: '그만하기' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '그만하기' }));
    fireEvent.click(screen.getByRole('button', { name: '정말 그만?' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('혼자 하면 걸린 시간과 새 기록을 보여주고 저장한다', () => {
    const { store } = renderMatch({ ...config(1), players: [{ name: '민준', difficulty: 'easy' }] });
    advance(3000);
    advance(12300);
    fireEvent.click(screen.getByRole('button', { name: '풀기' }));
    expect(screen.getByText('새 기록!')).toBeInTheDocument();
    expect(columns()[0]).toHaveTextContent('완성! 12.3초');
    expect(loadBestTimes(store)).toEqual({ easy: 12300 });
  });

  it('칸 머리 이름 옆에 플레이어 색 블록이 있다', () => {
    renderMatch(config(2));
    const chips = screen.getAllByTestId('player-chip');
    expect(chips).toHaveLength(2);
    chips.forEach((c, i) => expect(c).toHaveStyle({ backgroundColor: PLAYER_COLORS[i] }));
  });

  it('푼 사람의 상태 글자만 완성 모양으로 바뀐다', () => {
    renderMatch(config(2));
    advance(3000);
    fireEvent.click(solveButtons()[0]);
    expect(within(columns()[0]).getByText(/완성!/).className).toMatch(/statusDone/);
    expect(within(columns()[1]).getByText('푸는 중').className).not.toMatch(/statusDone/);
  });
});
