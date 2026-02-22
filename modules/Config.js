import fs from 'fs';

/**
 * 設定ファイルの内容を表すクラス
 */
export default class Config {

	/**
	 * コンストラクタ
	 */
	constructor() {
		/**
		 * 設定ファイルのパス
		 * @type {string}
		 */
		this.CONFIG_FILE = 'config/config.json';
	}

	/**
	 * 設定ファイルを読み込む
	 */
	load() {
		const data = JSON.parse(fs.readFileSync(this.CONFIG_FILE));
		/**
		 * 登録済み親ディレクトリ一覧
		 * @type {object}
		 */
		this.directories = data.directories;
		/**
		 * サムネイル情報
		 * @type {object}
		 */
		this.thumbnails = data.thumbnails;
		/**
		 * 設定情報
		 * @type {object}
		 */
		this.settings = data.settings;
	}

}
