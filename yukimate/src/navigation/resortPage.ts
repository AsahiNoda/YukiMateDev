/**
 * ゲレンデページ（旧 Snowfeed タブ）への遷移の共通処理。
 * 入口は複数あるが、開く画面は同じで最初のタブだけ変える（docs/ui-redesign/README.md「6. Snowfeed」）。
 */

export type ResortPageTab = 'posts' | 'forecast' | 'ratings';

export interface ResortPageOptions {
  /** 最初に開くタブ。ページ内タブはフェーズ6で作るので、今は受け取るだけ */
  initialTab?: ResortPageTab;
}

const TABS: readonly ResortPageTab[] = ['posts', 'forecast', 'ratings'];

export function parseResortPageParams(params: { tab?: string | string[] }): ResortPageOptions {
  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  return {
    initialTab: TABS.includes(tab as ResortPageTab) ? (tab as ResortPageTab) : undefined,
  };
}

/** router.push に渡すリンク。resortId を省くとホームゲレンデのページ */
export function resortPageHref(resortId?: string | null, tab?: ResortPageTab) {
  const params: Record<string, string> = {};
  if (tab) params.tab = tab;
  if (resortId) {
    return { pathname: '/resort/[resortId]' as const, params: { resortId, ...params } };
  }
  return { pathname: '/resort' as const, params };
}
