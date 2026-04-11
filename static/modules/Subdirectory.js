/**
 * サブディレクトリを表すクラス
 */
export default class Subdirectory {

	/**
	 * コンストラクタ
	 * @param {object} subdir - サブディレクトリの情報
	 * @param {string} subdir.dirId - ディレクトリID
	 * @param {string} subdir.subdirId - サブディレクトリID
	 * @param {string} subdir.subdirName - サブディレクトリ名
	 * @param {number} subdir.subdirNum - ファイル数
	 */
	constructor(subdir) {
		/**
		 * ディレクトリID
		 * @type {string}
		 */
		this.dirId = subdir.dirId;
		/**
		 * サブディレクトリID
		 * @type {string}
		 */
		this.subdirId = subdir.subdirId;
		/**
		 * サブディレクトリ名
		 * @type {string}
		 */
		this.subdirName = subdir.subdirName;
		/**
		 * ファイル数
		 * @type {number}
		 */
		this.subdirNum = subdir.subdirNum;
	}

}
