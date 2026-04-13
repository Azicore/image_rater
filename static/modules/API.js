/**
 * APIからデータを取得するクラス
 */
export default class API {

	/**
	 * 更新系API通信時のローディング表示を切り替える関数
	 * @type {function}
	 */
	static toggleLoading = () => {};

	/**
	 * API通信時のエラーを表示する関数
	 * @type {function}
	 */
	static notifyError = () => {};

	/**
	 * APIからGETでデータを取得する
	 * @param {string} path - APIのパス
	 * @return {object} 取得したJSONデータ
	 */
	static async _get(path) {
		try {
			return await (await fetch(path)).json();
		} catch (e) {
			return { error: true, message: '不明なエラーが発生しました。' };
		}
	}

	/**
	 * APIにPOSTでデータを送信する
	 * @param {string} path - APIのパス
	 * @param {object} data - APIに送信するデータ
	 * @return {object} レスポンスのJSONデータ
	 */
	static async _post(path, data) {
		try {
			return await (await fetch(path, {
				method: 'post',
				headers: { 'Content-type': 'application/json' },
				body: JSON.stringify(data)
			})).json();
		} catch (e) {
			return { error: true, message: '不明なエラーが発生しました。' };
		}
	}

	/**
	 * 親ディレクトリ一覧を返す
	 * @return {object} 親ディレクトリ一覧（ディレクトリIDをキーとするオブジェクト）
	 */
	static async getDirectoryList() {
		const dirs = await this._get('/dirs');
		if (dirs.error) {
			this.notifyError(dirs.message);
			return {};
		}
		return dirs;
	}

	/**
	 * サブディレクトリ一覧を返す
	 * @param {string} dirId - ディレクトリID
	 * @return {object[]} サブディレクトリ情報オブジェクトの配列
	 */
	static async getSubdirectoryList(dirId) {
		const subdirs = await this._get(`/dir/${dirId}`);
		if (subdirs.error) {
			this.notifyError(subdirs.message);
			return [];
		}
		// サブディレクトリIDをキーとするオブジェクトを配列に変換して返す
		return Object.keys(subdirs).map(subdirId => Object.assign({ subdirId }, subdirs[subdirId]));
	}

	/**
	 * ファイル一覧を返す
	 * @param {string} dirId - ディレクトリID
	 * @param {string} subdirId - サブディレクトリID
	 * @return {object[]} ファイル情報オブジェクトの配列
	 */
	static async getFileList(dirId, subdirId) {
		const files = await this._get(`/dir/${dirId}/${subdirId}`);
		if (files.error) {
			this.notifyError(files.message);
			return [];
		}
		// ファイルIDをキーとするオブジェクトを配列に変換して返す
		return Object.keys(files).map(id => Object.assign({ id }, files[id]));
	}

	/**
	 * サムネイルを取得するURLを返す
	 * @param {string} fileId - ファイルID
	 * @return {string} サムネイルを取得するURL
	 */
	static getThumbnailURL(fileId) {
		return `/thumb/${fileId}`;
	}

	/**
	 * ファイル本体を取得するURLを返す
	 * @param {string} dirId - ディレクトリID
	 * @param {string} subdirName - サブディレクトリの名前
	 * @param {string} fileName - ファイル名
	 * @return {string} ファイル本体を取得するURL
	 */
	static getFileURL(dirId, subdirName, fileName) {
		return `/file/${dirId}/${subdirName}/${fileName}`;
	}

	/**
	 * ファイル名を変更する
	 * @param {SubdirectoryInfo} subdir - サブディレクトリ情報オブジェクト
	 * @param {string} fileId - ファイルID
	 * @param {string} newName - 新しい名前
	 * @return {boolean} 成功したかどうか
	 */
	static async rename(subdir, fileId, newName) {
		this.toggleLoading(true);
		const result = await this._post('/rename', {
			dirId: subdir.dirId,
			subdirId: subdir.subdirId,
			fileId: fileId,
			newName: newName
		});
		if (result.error) this.notifyError(result.message);
		this.toggleLoading(false);
		return !result.error;
	}

	/**
	 * ファイルを移動する
	 * @param {SubdirectoryInfo} subdir - サブディレクトリ情報オブジェクト
	 * @param {string[]} fileIds - ファイルIDの配列
	 * @param {string} newSubdirId - 移動先のサブディレクトリID
	 * @return {string[]} fileIdsのうち移動に成功したファイルIDの配列
	 */
	static async move(subdir, fileIds, newSubdirId) {
		this.toggleLoading(true);
		const result = await this._post('/move', {
			dirId: subdir.dirId,
			subdirId: subdir.subdirId,
			fileIds: fileIds,
			newSubdirId: newSubdirId
		});
		const movedFileIds = result.moved || [];
		if (result.error || result.message) this.notifyError(result.message);
		this.toggleLoading(false);
		return movedFileIds;
	}

	/**
	 * レーティングを行ない次の候補を取得する
	 * @param {SubdirectoryInfo} subdir - サブディレクトリ情報オブジェクト
	 * @param {string} winnerFileId - 勝利したファイルのファイルID
	 * @param {string} loserFileId - 敗北したファイルのファイルID
	 * @return {object[]} 次の候補ファイル
	 */
	static async rating(subdir, winnerFileId, loserFileId) {
		this.toggleLoading(true);
		const result = await this._post('/rating', {
			dirId: subdir.dirId,
			subdirId: subdir.subdirId,
			winnerFileId: winnerFileId,
			loserFileId: loserFileId
		});
		const next = result.next || [];
		if (result.error) this.notifyError(result.message);
		this.toggleLoading(false);
		return next;
	}

}
