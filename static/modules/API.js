/**
 * APIからデータを取得するクラス
 */
export default class API {

	/**
	 * 親ディレクトリ一覧を返す
	 * @return {object} 親ディレクトリ一覧（ディレクトリIDをキーとするオブジェクト）
	 */
	static async getDirectoryList() {
		return await (await fetch('/dirs')).json();
	}

	/**
	 * サブディレクトリ一覧を返す
	 * @param {string} dirId - ディレクトリID
	 * @return {object} サブディレクトリ一覧（サブディレクトリIDをキーとするオブジェクト）
	 */
	static async getSubdirectoryList(dirId) {
		return await (await fetch(`/dir/${dirId}`)).json();
	}

	/**
	 * ファイル一覧を返す
	 * @param {string} dirId - ディレクトリID
	 * @param {string} subdirId - サブディレクトリID
	 * @return {object[]} ファイル情報オブジェクトの配列
	 */
	static async getFileList(dirId, subdirId) {
		const files = await (await fetch(`/dir/${dirId}/${subdirId}`)).json();
		// ファイルIDをキーとするオブジェクトを配列に変換して返す
		return Object.keys(files).map(id => Object.assign({ id }, files[id]));
	}

}
