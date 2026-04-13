/**
 * レーティング操作を行なうためのクラス
 */
export default class RatingManager {

	/**
	 * レーティングの初期値
	 * @type {number}
	 */
	static INITIAL_RATING = 1500;
	/**
	 * 重みの初期値
	 * @type {number}
	 */
	static INITIAL_WEIGHT = 10;

	/**
	 * コンストラクタ
	 * @param {object} files - ファイルの一覧（ファイルIDをキーとするオブジェクト）
	 */
	constructor(files) {
		/**
		 * ファイルの一覧
		 * @type {object}
		 */
		this.files = files;
		/**
		 * レーティング計算のKの値
		 * @type {number}
		 */
		this.PARAM_K = 32;
		/**
		 * 想定される最大のレーティング差
		 * @type {number}
		 */
		this.MAX_DIFF = 400;
		/**
		 * 重み計算の基数
		 * @type {number}
		 */
		this.WEIGHT_BASE = 2;
	}

	/**
	 * レーティングを更新する
	 * @param {string} winnerFileId - 勝利したファイルのファイルID
	 * @param {string} loserFileId - 敗北したファイルのファイルID
	 */
	update(winnerFileId, loserFileId) {
		const winner = this.files[winnerFileId];
		const loser = this.files[loserFileId];
		if (!winner || !loser) throw new Error('不明なファイルが指定されています。');
		const ra = winner.r;
		const rb = loser.r;
		const wk = this.PARAM_K / (10 ** ((ra - rb) / this.MAX_DIFF) + 1);
		winner.r += wk;
		loser.r -= wk;
		if (winner.g > 0) winner.g--;
		if (loser.g > 0) loser.g--;
	}

	/**
	 * 次のレーティング候補ファイルを返す
	 * @return {object[]} 次の候補となる2つのファイルの情報
	 */
	getNext() {
		let file1, file2;
		let weightTotal = 0; // 重みの合計
		const cumulative = []; // 重みの積算
		const fileIds = Object.keys(this.files);
		if (2 > fileIds.length) throw new Error('レーティングを行うには2個以上のファイルが必要です。');
		// 重み配分
		for (let i = 0; fileIds.length > i; i++) {
			weightTotal += this.WEIGHT_BASE ** this.files[fileIds[i]].g;
			cumulative[i] = weightTotal;
		}
		// 1個目の選択（重み付きランダム）
		const val = Math.random() * weightTotal;
		for (let i = 0; fileIds.length > i; i++) {
			if (cumulative[i] > val) {
				file1 = this.files[fileIds[i]];
				file1.id = fileIds[i];
				break;
			}
		}
		// 2個目の選択（1個目以外から均等にランダム）
		const remainings = fileIds.filter(fileId => fileId != file1.id);
		const id = remainings[Math.floor(Math.random() * remainings.length)];
		file2 = this.files[id];
		file2.id = id;
		// レーティングが大きい順に返す
		return file1.r >= file2.r ? [file1, file2] : [file2, file1];
	}

}
