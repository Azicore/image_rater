/**
 * ファイルを表すクラス
 */
export default class FileInfo {

	/**
	 * コンストラクタ
	 * @param {object} file - ファイル情報オブジェクト
	 * @param {string} file.id - ファイルID
	 * @param {string} file.n - ファイル名
	 * @param {number} file.s - ファイルサイズ（バイト）
	 * @param {number} file.m - 更新日時（Unix time・秒）
	 * @param {number} file.w - 幅
	 * @param {number} file.h - 高さ
	 * @param {number} file.tw - サムネイルの幅
	 * @param {number} file.th - サムネイルの高さ
	 * @param {number} file.r - レーティング
	 * @param {number} file.g - レーティング選択の重み
	 */
	constructor(file) {
		/**
		 * ファイルID
		 * @type {string}
		 */
		this.id = file.id;
		/**
		 * ファイル名
		 * @type {string}
		 */
		this.n = file.n;
		/**
		 * ファイルサイズ（バイト）
		 * @type {number}
		 */
		this.s = file.s;
		/**
		 * 更新日時（Unix time・秒）
		 * @type {number}
		 */
		this.m = file.m;
		/**
		 * 幅
		 * @type {number}
		 */
		this.w = file.w;
		/**
		 * 高さ
		 * @type {number}
		 */
		this.h = file.h;
		/**
		 * サムネイルの幅
		 * @type {number}
		 */
		this.tw = file.tw;
		/**
		 * サムネイルの高さ
		 * @type {number}
		 */
		this.th = file.th;
		/**
		 * 画素数
		 * @type {number}
		 */
		this.d = file.w * file.h;
		/**
		 * レーティング
		 * @type {number}
		 */
		this.r = file.r;
		/**
		 * レーティング選択の重み
		 * @type {number}
		 */
		this.g = file.g;
	}

	/**
	 * 画像ファイルかどうかを返す
	 * @return {boolean} 対応画像ファイルならtrue
	 */
	get isImage() {
		return /\.(?:jpg|jpeg?|png|gif|bmp|svg|webp)$/i.test(this.n);
	}

	/**
	 * 動画ファイルかどうかを返す
	 * @return {boolean} 対応動画ファイルならtrue
	 */
	get isVideo() {
		return /\.mp4$/i.test(this.n);
	}

	/**
	 * ファイルサイズを整形して返す
	 * @return {string} 単位付きのファイルサイズ
	 */
	get fileSize() {
		const units = ['B', 'KB', 'MB', 'GB'];
		let size = this.s;
		let k = 0;
		while (size >= 1000) {
			size /= 1024;
			k++;
		}
		return `${size.toFixed(1)}${units[k]}`;
	}

	/**
	 * 更新日時を整形して返す
	 * @return {string} 「YYYY-MM-DD hh:mm:ss」に整形した日時
	 */
	get date() {
		const d = new Date();
		d.setTime((this.m - d.getTimezoneOffset() * 60) * 1e3);
		return d.toISOString().replace(/T/, ' ').replace(/\..+/, '');
	}

	/**
	 * 画像サイズを整形して返す
	 * @return {string} 「幅×高さ」に整形した文字列
	 */
	get mediaSize() {
		return `${this.w}×${this.h}`;
	}

	/**
	 * レーティングを整形して返す
	 * @return {string} 小数第1位まで表示したレーティング値
	 */
	get rating() {
		return this.r.toFixed(1);
	}

}
