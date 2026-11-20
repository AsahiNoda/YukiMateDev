/**
 * 画面で利用者に伝えたエラー（入力ミス・登録済み・リンク切れ・送信の上限など）の記録。
 *
 * console.error / console.warn を使うと、開発中は赤・黄の画面（LogBox）とコールスタックが出て、
 * 想定どおりの失敗まで「アプリが落ちた」ように見えてしまう。
 * 想定内のものはここで1行だけ（開発中のみ）記録し、想定外のものだけ console.error に残す。
 */
export function logHandled(tag: string, detail?: unknown) {
  if (!__DEV__) return;
  const text =
    detail instanceof Error
      ? detail.message
      : typeof detail === 'object' && detail !== null
        ? JSON.stringify(detail)
        : String(detail ?? '');
  console.log(`[${tag}] ${text}`);
}

export default logHandled;
