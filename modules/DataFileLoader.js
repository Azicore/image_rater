import fs from 'fs';

/**
 * データファイル読み書きの共通クラス
 */
export default class DataFileLoader {

	/**
	 * コンストラクタ
	 */
	constructor() {
		/**
		 * データファイルのパス
		 * @type {string}
		 */
		this.DATA_FILE = null;
		/**
		 * データファイルの内容
		 * @type {object}
		 */
		 this.data = {};
	}

	/**
	 * データファイルを読み込む
	 * @param {string} dataFilePath - データファイルのパス
	 */
	 _load(dataFilePath) {
		 if (dataFilePath) this.DATA_FILE = dataFilePath;
		 if (!this.DATA_FILE) return;
		try {
			this.data = JSON.parse(fs.readFileSync(this.DATA_FILE));
		} catch (e) { }
	}

	/**
	 * データファイルを保存する
	 */
	_save() {
		if (!this.DATA_FILE) return;
		try {
			fs.writeFileSync(this.DATA_FILE, JSON.stringify(this.data));
		} catch (e) { }
	}

}
