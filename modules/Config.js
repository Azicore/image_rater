import DataFileLoader from './DataFileLoader.js';

/**
 * 設定ファイルの内容を表すクラス
 */
export default class Config extends DataFileLoader {

	/**
	 * コンストラクタ
	 */
	constructor() {
		super();
		this._load('config/config.json');
	}

}
