/**
 * パーティー進行のルール。ホスト画面・参加者画面・受付APIの3箇所で
 * 同じ数字を見る必要があるため、ここを唯一の定義とする。
 */

/** 同一の匿名IDが指定時間内にリクエストできる曲数 */
export const REQUESTS_PER_WINDOW = 3;
export const REQUEST_WINDOW_MINUTES = 5;

/** 同時にキューに積める上限 */
export const MAX_QUEUE_LENGTH = 60;

/**
 * 再生中の曲をスキップするのに必要な票数。
 * 参加者数に対する割合にすると「今何人いるか」に依存して分かりにくくなるため、
 * 誰が見ても同じに読める固定値にする。足りないときはホストが手で飛ばせる。
 */
export const SKIP_VOTE_THRESHOLD = 3;
