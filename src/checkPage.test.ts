import { beforeEach, describe, expect, it } from 'vitest';
import html from '../public/check.html?raw';

function section(re: RegExp): string {
  const m = html.match(re);
  if (!m) throw new Error(`check.html에서 찾지 못함: ${re}`);
  return m[1];
}

const script = section(/<script>([\s\S]*?)<\/script>/);
const body = section(/<body>([\s\S]*?)<script>/);

describe('check.html (기기 진단 페이지)', () => {
  it('인라인 스크립트에 ES5 이후 문법이 없다', () => {
    expect(script).not.toMatch(/=>/);
    expect(script).not.toMatch(/`/);
    expect(script).not.toMatch(/\b(let|const|class)\s/);
    expect(script).not.toMatch(/\.\.\./);
    expect(script).not.toMatch(/\bfor\s*\([^)]*\sof\s/);
  });

  describe('실행', () => {
    beforeEach(() => {
      document.body.innerHTML = body;
      new Function(script)();
    });

    it('기기 정보를 표로 보여준다', () => {
      const text = document.getElementById('rows')?.textContent ?? '';
      expect(text).toContain('Chrome 버전');
      expect(text).toContain('maxTouchPoints');
      expect(text).toContain('devicePixelRatio');
    });

    it('복사용 보고서에 정보가 들어간다', () => {
      const report = document.getElementById('report') as HTMLTextAreaElement;
      expect(report.value).toContain('브라우저: ');
      expect(report.value).toContain('최대 동시 터치: 0');
    });

    it('터치 영역을 누르면 동시 터치 수를 센다', () => {
      const pad = document.getElementById('pad') as HTMLElement;
      pad.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, bubbles: true }));
      expect(document.getElementById('count')?.textContent).toBe('지금 1개 / 최대 1개');
      const report = document.getElementById('report') as HTMLTextAreaElement;
      expect(report.value).toContain('최대 동시 터치: 1');
    });
  });
});
